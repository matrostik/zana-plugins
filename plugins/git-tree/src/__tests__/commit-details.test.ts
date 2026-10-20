import { describe, expect, it, vi } from 'vitest';
import {
  compareCommits,
  loadCommitDetails,
  loadFileDiff
} from '../server/git-details-diff.js';
import type { GitRunner } from '../server/git-exec.js';

type Reply = { code: number; stdout?: string; stderr?: string };

function scripted(replies: Array<[string, Reply]>): GitRunner & { calls: string[][] } {
  const calls: string[][] = [];
  const fn = vi.fn(async ({ args }: { args: string[] }) => {
    calls.push(args);
    const key = args.join(' ');
    const hit = replies.find(([prefix]) => key.startsWith(prefix));
    return { code: hit?.[1].code ?? 0, stdout: hit?.[1].stdout ?? '', stderr: hit?.[1].stderr ?? '' };
  });
  return Object.assign(fn as unknown as GitRunner, { calls });
}

const HASH = 'a'.repeat(40);
const FS = '\x1f';
const HEADER_END = '\x1e';
const meta = (sig: string, subject: string, body: string) =>
  [HASH, 'aaaaaaa', `${'b'.repeat(40)} ${'c'.repeat(40)}`, 'Ann', 'ann@x', '100', 'Cam', 'cam@x', '200', sig, 'Signer', 'KEY', subject, body].join(FS) + HEADER_END;

describe('loadCommitDetails for uncommitted changes', () => {
  it('builds the working tree entry with stats and untracked files', async () => {
    const git = scripted([
      ['rev-parse --verify HEAD', { code: 0, stdout: 'h1\n' }],
      ['status --porcelain=v1 -z -uall', { code: 0, stdout: ' M a.ts\0?? new.ts\0' }],
      ['diff HEAD --numstat -z', { code: 0, stdout: '5\t2\ta.ts\0' }]
    ]);
    const details = await loadCommitDetails({ cwd: '/r', git, commitHash: '*' });
    expect(details.parents).toEqual(['h1']);
    expect(details.subject).toBe('Uncommitted Changes (2)');
    const a = details.fileChanges.find((c) => c.newPath === 'a.ts');
    expect(a).toMatchObject({ additions: 5, deletions: 2 });
    expect(details.fileChanges.find((c) => c.newPath === 'new.ts')).toMatchObject({ untracked: true });
  });

  it('omits untracked files and parents when there is no HEAD', async () => {
    const git = scripted([
      ['rev-parse --verify HEAD', { code: 128 }],
      ['status --porcelain=v1 -z -uno', { code: 0, stdout: 'M  staged.ts\0' }],
      ['diff HEAD --numstat -z', { code: 0, stdout: '' }]
    ]);
    const details = await loadCommitDetails({ cwd: '/r', git, commitHash: '*', showUntrackedFiles: false });
    expect(details.parents).toEqual([]);
    expect(details.fileChanges.every((c) => !c.untracked)).toBe(true);
  });
});

describe('loadCommitDetails for a commit', () => {
  it('reads metadata, signature, and file changes', async () => {
    const git = scripted([
      ['show --quiet', { code: 0, stdout: meta('G', 'Fix bug', 'Body line') }],
      ['diff-tree', { code: 0, stdout: '1\t0\tsrc/x.ts\0' }]
    ]);
    const details = await loadCommitDetails({ cwd: '/r', git, commitHash: HASH });
    expect(details).toMatchObject({ hash: HASH, subject: 'Fix bug', body: 'Body line', authorDate: 100, commitDate: 200 });
    expect(details.signature).toBeDefined();
  });

  it('falls back to the requested hash when the header is empty', async () => {
    const git = scripted([
      ['show --quiet', { code: 0, stdout: HEADER_END }],
      ['diff-tree', { code: 1, stderr: 'boom' }]
    ]);
    const details = await loadCommitDetails({ cwd: '/r', git, commitHash: HASH });
    expect(details.hash).toBe('');
    expect(details.fileChanges).toEqual([]);
  });

  it('throws the git error when the commit cannot be read', async () => {
    const git = scripted([['show --quiet', { code: 128, stderr: 'bad object\n' }]]);
    await expect(loadCommitDetails({ cwd: '/r', git, commitHash: HASH })).rejects.toThrow('bad object');
  });

  it('throws a not-found message when git prints nothing', async () => {
    const git = scripted([['show --quiet', { code: 1 }]]);
    await expect(loadCommitDetails({ cwd: '/r', git, commitHash: HASH })).rejects.toThrow(`Commit not found: ${HASH}`);
  });
});

describe('compareCommits', () => {
  it('returns no changes when both sides are the working tree', async () => {
    const git = scripted([]);
    const res = await compareCommits({ cwd: '/r', git, fromHash: '*', toHash: '*' });
    expect(res.fileChanges).toEqual([]);
    expect(git.calls).toEqual([]);
  });

  it('diffs a commit against the working tree and in reverse', async () => {
    const git = scripted([['diff -r -z', { code: 0, stdout: '1\t1\tf.ts\0', }]]);
    await compareCommits({ cwd: '/r', git, fromHash: HASH, toHash: '*' });
    expect(git.calls[0]).toEqual(['diff', '-r', '-z', HASH, '--numstat', '--']);
    await compareCommits({ cwd: '/r', git, fromHash: '*', toHash: HASH });
    expect(git.calls.at(-1)).toEqual(['diff', '-r', '-z', '-R', HASH, '--name-status', '--']);
  });

  it('throws when both comparison diffs fail', async () => {
    const git = scripted([['diff -r -z', { code: 128, stderr: 'no repo' }]]);
    await expect(compareCommits({ cwd: '/r', git, fromHash: HASH, toHash: 'b'.repeat(40) })).rejects.toThrow('no repo');
  });

  it('falls back to a generic message when the diff fails silently', async () => {
    const git = scripted([['diff -r -z', { code: 1 }]]);
    await expect(compareCommits({ cwd: '/r', git, fromHash: HASH, toHash: 'b'.repeat(40) })).rejects.toThrow('Could not compare commits.');
  });
});

describe('loadFileDiff branches', () => {
  it('diffs a file between a commit and the working tree', async () => {
    const git = scripted([['diff --unified=3', { code: 0, stdout: '@@ -1 +1 @@\n-a\n+b\n' }]]);
    const res = await loadFileDiff({ cwd: '/r', git, commitHash: '*', fromHash: HASH, filePath: 'f.ts' });
    expect(git.calls[0]).toEqual(['diff', '--unified=3', HASH, '--', 'f.ts']);
    expect(res.hunks).toHaveLength(1);
  });

  it('diffs a file from the working tree back to a commit', async () => {
    const git = scripted([['diff --unified=3 -R', { code: 0, stdout: '' }]]);
    await loadFileDiff({ cwd: '/r', git, commitHash: HASH, fromHash: '*', filePath: 'f.ts' });
    expect(git.calls[0]).toEqual(['diff', '--unified=3', '-R', HASH, '--', 'f.ts']);
  });

  it('diffs a file between two commits, including a rename pair', async () => {
    const git = scripted([['diff --unified=3', { code: 0, stdout: '' }]]);
    await loadFileDiff({ cwd: '/r', git, commitHash: 'b'.repeat(40), fromHash: HASH, filePath: 'new.ts', oldPath: 'old.ts' });
    expect(git.calls[0]).toEqual(['diff', '--unified=3', HASH, 'b'.repeat(40), '--', 'old.ts', 'new.ts']);
  });

  it('reads an untracked file via --no-index when the tracked diff is empty', async () => {
    const git = scripted([
      ['diff --unified=3 HEAD', { code: 0, stdout: '' }],
      ['diff --no-index', { code: 1, stdout: '+new line\n' }]
    ]);
    const res = await loadFileDiff({ cwd: '/r', git, commitHash: '*', filePath: 'new.ts' });
    expect(git.calls.at(-1)).toEqual(['diff', '--no-index', '--unified=3', '--', '/dev/null', 'new.ts']);
    expect(res.rawDiff).toContain('+new line');
  });

  it('shows a commit diff for a single file', async () => {
    const git = scripted([['show --format=', { code: 0, stdout: '' }]]);
    const res = await loadFileDiff({ cwd: '/r', git, commitHash: HASH, filePath: 'f.ts' });
    expect(git.calls[0]).toEqual(['show', '--format=', '--first-parent', '--unified=3', HASH, '--', 'f.ts']);
    expect(res.isBinary).toBe(false);
  });
});
