import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  changedPathCount,
  commitMessages,
  commitSnapshot,
  deleteSnapshotRef,
  diffFiles,
  isSafeRef,
  isSecretLike,
  listBranches,
  listCommits,
  listTreeFiles,
  listWorktrees,
  MAX_NEW_FILE_BYTES,
  MAX_NEW_FILES,
  MAX_SELECTED_COMMITS,
  mergeBase,
  orderCommits,
  readFileAt,
  resolveBase,
  resolveBranchRef,
  runGit,
  snapshotBranchTree,
  snapshotCommitsTree,
  snapshotTree,
  SNAPSHOT_REF_PREFIX,
  type GitRunner
} from '../server/local/git.ts';

const IDENTITY = { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
const REVIEW_ID = '11111111-2222-3333-4444-555555555555';
const dirs: string[] = [];

function sh(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, env: { ...process.env, ...IDENTITY }, encoding: 'utf8' });
}

/** A repo with one commit on main containing `a.ts`. */
function createRepo(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'codewink-git-')));
  dirs.push(dir);
  sh(dir, 'init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'a.ts'), 'const a = 1;\n');
  writeFileSync(join(dir, '.gitignore'), 'ignored.log\n');
  sh(dir, 'add', '.');
  sh(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('local git snapshot', () => {
  it('captures modified and untracked files without touching the real index', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, 'a.ts'), 'const a = 2;\n');
    writeFileSync(join(repo, 'b.ts'), 'export const b = 1;\n');
    writeFileSync(join(repo, 'ignored.log'), 'noise\n');
    const indexBefore = readFileSync(join(repo, '.git', 'index'));

    const tree = await snapshotTree(runGit, repo, 'uncommitted');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'uncommitted', REVIEW_ID);
    const files = await diffFiles(runGit, repo, tree.headSha, snapshotSha);

    expect(readFileSync(join(repo, '.git', 'index'))).toEqual(indexBefore);
    expect(sh(repo, 'status', '--porcelain')).toContain('?? b.ts');
    expect(files.map((file) => [file.path, file.status, file.additions, file.deletions])).toEqual([
      ['a.ts', 'modified', 1, 1],
      ['b.ts', 'added', 1, 0]
    ]);
    expect(files[0].patch).toMatch(/^@@ -1 \+1 @@\n-const a = 1;\n\+const a = 2;$/);
    expect(sh(repo, 'rev-parse', `${SNAPSHOT_REF_PREFIX}${REVIEW_ID}`).trim()).toBe(snapshotSha);
    expect(await readFileAt(runGit, repo, snapshotSha, 'b.ts')).toBe('export const b = 1;\n');
    expect(await readFileAt(runGit, repo, snapshotSha, 'ignored.log')).toBeNull();
  });

  it('skips secrets, large files, and binaries from the snapshot and reports why', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, '.env.local'), 'TOKEN=abc\n');
    writeFileSync(join(repo, 'big.txt'), 'x'.repeat(MAX_NEW_FILE_BYTES + 1));
    writeFileSync(join(repo, 'blob.dat'), Buffer.from([1, 0, 2, 3]));
    writeFileSync(join(repo, 'ok.ts'), 'ok\n');

    const tree = await snapshotTree(runGit, repo, 'uncommitted');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'uncommitted', REVIEW_ID);

    expect(tree.skipped).toEqual([
      { path: '.env.local', reason: 'possible-secret' },
      { path: 'big.txt', reason: 'too-large' },
      { path: 'blob.dat', reason: 'binary' }
    ]);
    expect((await diffFiles(runGit, repo, tree.headSha, snapshotSha)).map((file) => file.path)).toEqual(['ok.ts']);
  });

  it('skips untracked symlinks so their targets never reach the snapshot', async () => {
    const repo = createRepo();
    symlinkSync('/etc/passwd', join(repo, 'link'));
    writeFileSync(join(repo, 'ok.ts'), 'ok\n');

    const tree = await snapshotTree(runGit, repo, 'uncommitted');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'uncommitted', REVIEW_ID);

    expect(tree.skipped).toEqual([{ path: 'link', reason: 'symlink' }]);
    expect((await diffFiles(runGit, repo, tree.headSha, snapshotSha)).map((file) => file.path)).toEqual(['ok.ts']);
    expect(await readFileAt(runGit, repo, snapshotSha, 'link')).toBeNull();
  });

  it('skips staged symlinks so their targets never reach the snapshot', async () => {
    const repo = createRepo();
    symlinkSync('/etc/passwd', join(repo, 'link'));
    writeFileSync(join(repo, 'ok.ts'), 'ok\n');
    sh(repo, 'add', 'link', 'ok.ts');

    const tree = await snapshotTree(runGit, repo, 'staged');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'staged', REVIEW_ID);

    expect(tree.skipped).toEqual([{ path: 'link', reason: 'symlink' }]);
    expect((await diffFiles(runGit, repo, tree.headSha, snapshotSha)).map((file) => file.path)).toEqual(['ok.ts']);
    expect(await readFileAt(runGit, repo, snapshotSha, 'link')).toBeNull();
  });

  it('keeps changed tracked and staged secrets at their base version in every scope', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, 'secret.json'), '{"v":1}\n');
    sh(repo, 'add', 'secret.json');
    sh(repo, 'commit', '-q', '-m', 'add secret');
    writeFileSync(join(repo, 'secret.json'), '{"v":2}\n');
    writeFileSync(join(repo, '.env'), 'TOKEN=staged\n');
    writeFileSync(join(repo, 'a.ts'), 'const a = 6;\n');
    sh(repo, 'add', 'secret.json', '.env', 'a.ts');

    for (const scope of ['uncommitted', 'staged'] as const) {
      const tree = await snapshotTree(runGit, repo, scope);
      const snapshotSha = await commitSnapshot(runGit, repo, tree, scope, REVIEW_ID);

      expect(tree.skipped).toEqual([
        { path: '.env', reason: 'possible-secret' },
        { path: 'secret.json', reason: 'possible-secret' }
      ]);
      expect((await diffFiles(runGit, repo, tree.headSha, snapshotSha)).map((file) => file.path)).toEqual(['a.ts']);
      expect(await readFileAt(runGit, repo, snapshotSha, 'secret.json')).toBe('{"v":1}\n');
      expect(await readFileAt(runGit, repo, snapshotSha, '.env')).toBeNull();
    }
    expect(sh(repo, 'diff', '--cached', '--name-only')).toBe('.env\na.ts\nsecret.json\n');
  });

  it('leaves out secrets committed on the branch when diffing against the merge base', async () => {
    const repo = createRepo();
    sh(repo, 'switch', '-q', '-c', 'feature');
    writeFileSync(join(repo, 'id_rsa'), 'PRIVATE\n');
    writeFileSync(join(repo, 'c.ts'), 'c\n');
    sh(repo, 'add', 'id_rsa', 'c.ts');
    sh(repo, 'commit', '-q', '-m', 'Add c');
    const base = await resolveBase(runGit, repo, 'main');
    const baseSha = await mergeBase(runGit, repo, base.sha, sh(repo, 'rev-parse', 'HEAD').trim());

    const tree = await snapshotTree(runGit, repo, 'branch', { baseSha });
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'branch', REVIEW_ID);

    expect(tree.skipped).toEqual([{ path: 'id_rsa', reason: 'possible-secret' }]);
    expect((await diffFiles(runGit, repo, baseSha, snapshotSha)).map((file) => file.path)).toEqual(['c.ts']);
  });

  it('applies the new-file size limit to staged additions', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, 'big.txt'), 'x'.repeat(MAX_NEW_FILE_BYTES + 1));
    writeFileSync(join(repo, 'ok.ts'), 'ok\n');
    sh(repo, 'add', 'big.txt', 'ok.ts');

    const tree = await snapshotTree(runGit, repo, 'staged');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'staged', REVIEW_ID);

    expect(tree.skipped).toEqual([{ path: 'big.txt', reason: 'too-large' }]);
    expect((await diffFiles(runGit, repo, tree.headSha, snapshotSha)).map((file) => file.path)).toEqual(['ok.ts']);
  });

  it('skips a staged binary addition with a non-secret name', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, 'blob.dat'), Buffer.from([1, 0, 2, 3]));
    writeFileSync(join(repo, 'ok.ts'), 'ok\n');
    sh(repo, 'add', 'blob.dat', 'ok.ts');

    const tree = await snapshotTree(runGit, repo, 'staged');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'staged', REVIEW_ID);

    expect(tree.skipped).toEqual([{ path: 'blob.dat', reason: 'binary' }]);
    expect((await diffFiles(runGit, repo, tree.headSha, snapshotSha)).map((file) => file.path)).toEqual(['ok.ts']);
    expect(await readFileAt(runGit, repo, snapshotSha, 'blob.dat')).toBeNull();
  });

  it('caps the number of new staged files and reports the overflow', async () => {
    const repo = createRepo();
    const total = MAX_NEW_FILES + 3;
    for (let index = 0; index < total; index++) writeFileSync(join(repo, `n${String(index).padStart(4, '0')}.ts`), `const n = ${index};\n`);
    sh(repo, 'add', '.');

    const tree = await snapshotTree(runGit, repo, 'staged');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'staged', REVIEW_ID);

    expect(tree.skipped.filter((file) => file.reason === 'too-many-files')).toHaveLength(3);
    expect((await diffFiles(runGit, repo, tree.headSha, snapshotSha)).length).toBe(MAX_NEW_FILES);
  }, 30_000);

  it('attributes a renamed file patch to the destination only when the source path is recreated', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, 'src.ts'), 'original line one\noriginal line two\n');
    sh(repo, 'add', 'src.ts');
    sh(repo, 'commit', '-q', '-m', 'add src');
    sh(repo, 'mv', 'src.ts', 'dst.ts');
    writeFileSync(join(repo, 'src.ts'), 'BRAND NEW UNRELATED CONTENT\n');
    sh(repo, 'add', 'src.ts', 'dst.ts');

    const tree = await snapshotTree(runGit, repo, 'staged');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'staged', REVIEW_ID);
    const files = await diffFiles(runGit, repo, tree.headSha, snapshotSha);

    const dst = files.find((file) => file.path === 'dst.ts')!;
    expect(dst.patch ?? '').not.toContain('BRAND NEW UNRELATED CONTENT');
  });

  it('lists every file in the snapshot tree, including unchanged ones', async () => {
    const repo = createRepo();
    // An unchanged spec committed earlier must still be discoverable alongside a new working change.
    mkdirSync(join(repo, 'docs'), { recursive: true });
    writeFileSync(join(repo, 'docs', 'spec.md'), '# Spec\n');
    sh(repo, 'add', 'docs/spec.md');
    sh(repo, 'commit', '-q', '-m', 'add spec');
    writeFileSync(join(repo, 'a.ts'), 'const a = 9;\n');

    const tree = await snapshotTree(runGit, repo, 'uncommitted');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'uncommitted', REVIEW_ID);

    expect(await listTreeFiles(runGit, repo, snapshotSha)).toEqual(expect.arrayContaining(['a.ts', 'docs/spec.md']));
  });

  it('reviews only the staged changes in staged scope', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, 'a.ts'), 'const a = 3;\n');
    sh(repo, 'add', 'a.ts');
    writeFileSync(join(repo, 'unstaged.ts'), 'later\n');

    const tree = await snapshotTree(runGit, repo, 'staged');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'staged', REVIEW_ID);

    expect((await diffFiles(runGit, repo, tree.headSha, snapshotSha)).map((file) => file.path)).toEqual(['a.ts']);
    expect(tree.skipped).toEqual([]);
  });

  it('produces the same tree hash until the working tree changes', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, 'a.ts'), 'const a = 4;\n');
    const first = await snapshotTree(runGit, repo, 'uncommitted');
    const again = await snapshotTree(runGit, repo, 'uncommitted');
    writeFileSync(join(repo, 'a.ts'), 'const a = 5;\n');
    const changed = await snapshotTree(runGit, repo, 'uncommitted');

    expect(again.treeSha).toBe(first.treeSha);
    expect(changed.treeSha).not.toBe(first.treeSha);
  });

  it('diffs a branch against its merge base and lists its commit messages', async () => {
    const repo = createRepo();
    sh(repo, 'switch', '-q', '-c', 'feature');
    writeFileSync(join(repo, 'c.ts'), 'c\n');
    sh(repo, 'add', 'c.ts');
    sh(repo, 'commit', '-q', '-m', 'Add c', '-m', 'Needed for W-123.');
    writeFileSync(join(repo, 'd.ts'), 'd\n');

    const base = await resolveBase(runGit, repo, 'main');
    const tree = await snapshotTree(runGit, repo, 'branch');
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'branch', REVIEW_ID);
    const from = await mergeBase(runGit, repo, base.sha, snapshotSha);

    expect((await diffFiles(runGit, repo, from, snapshotSha)).map((file) => file.path)).toEqual(['c.ts', 'd.ts']);
    expect(await commitMessages(runGit, repo, from, tree.headSha)).toEqual(['Add c\nNeeded for W-123.']);
  });

  it('lists local and remote branches while excluding internal codewink branches', async () => {
    const repo = createRepo();
    sh(repo, 'branch', 'feat/beta');
    sh(repo, 'branch', 'feat/alpha');
    sh(repo, 'branch', 'zcc/codewink-internal');
    sh(repo, 'update-ref', 'refs/remotes/origin/main', sh(repo, 'rev-parse', 'HEAD').trim());
    sh(repo, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main');

    const result = await listBranches(runGit, repo);

    expect(result.currentBranch).toBe('main');
    expect(result.defaultBase).toBe('origin/main');
    expect(result.branches).toEqual([
      { ref: 'main', kind: 'local', isCurrent: true },
      { ref: 'feat/alpha', kind: 'local', isCurrent: false },
      { ref: 'feat/beta', kind: 'local', isCurrent: false },
      { ref: 'origin/main', kind: 'remote', isCurrent: false }
    ]);
  });

  it('snapshots a non-checked-out branch relative to its base without altering HEAD', async () => {
    const repo = createRepo();
    sh(repo, 'switch', '-q', '-c', 'other');
    writeFileSync(join(repo, 'branch-file.ts'), 'export const x = 1;\n');
    sh(repo, 'add', 'branch-file.ts');
    sh(repo, 'commit', '-q', '-m', 'Add branch file');
    sh(repo, 'switch', '-q', 'main');

    const head = await resolveBranchRef(runGit, repo, 'other');
    const base = await resolveBase(runGit, repo, 'main');
    const from = await mergeBase(runGit, repo, base.sha, head.sha);
    const tree = await snapshotBranchTree(runGit, repo, head.sha, from);
    const snapshotSha = await commitSnapshot(runGit, repo, tree, 'branch', REVIEW_ID);

    expect(sh(repo, 'rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe('main');
    expect((await diffFiles(runGit, repo, from, snapshotSha)).map((file) => file.path)).toEqual(['branch-file.ts']);
  });

  it('paginates commit logs with hasMore and ignores non-finite limit/skip', async () => {
    const repo = createRepo();
    for (let i = 2; i <= 6; i++) {
      writeFileSync(join(repo, 'a.ts'), `const a = ${i};\n`);
      sh(repo, 'commit', '-q', '-am', `Commit ${i}`);
    }

    const page1 = await listCommits(runGit, repo, { limit: 4, skip: 0 });
    expect(page1.commits).toHaveLength(4);
    expect(page1.hasMore).toBe(true);
    expect(page1.commits[0].subject).toBe('Commit 6');

    const page2 = await listCommits(runGit, repo, { limit: 4, skip: 4 });
    expect(page2.commits).toHaveLength(2);
    expect(page2.hasMore).toBe(false);
    expect(page2.commits.at(-1)?.subject).toBe('init');

    const fallback = await listCommits(runGit, repo, { limit: Number.NaN, skip: Number.POSITIVE_INFINITY });
    expect(fallback.commits).toHaveLength(6);
    expect(fallback.hasMore).toBe(false);
  }, 30_000);

  it('orders commits topologically with bounded rev-list walks even with skewed dates or root commits', async () => {
    const repo = createRepo();
    const rootSha = sh(repo, 'rev-parse', 'HEAD').trim();
    const commitWithDate = (file: string, content: string, message: string, date: string) => {
      writeFileSync(join(repo, file), content);
      sh(repo, 'add', file);
      execFileSync('git', ['commit', '-q', '-m', message], {
        cwd: repo,
        env: { ...process.env, ...IDENTITY, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
        encoding: 'utf8'
      });
      return sh(repo, 'rev-parse', 'HEAD').trim();
    };

    // Out-of-order committer timestamps: c1 (2030) -> c2 (2020) -> c3 (2025)
    const c1 = commitWithDate('c1.ts', '1\n', 'c1', '2030-01-01T00:00:00Z');
    const c2 = commitWithDate('c2.ts', '2\n', 'c2', '2020-01-01T00:00:00Z');
    const c3 = commitWithDate('c3.ts', '3\n', 'c3', '2025-01-01T00:00:00Z');

    const revListCalls: string[][] = [];
    const spyGit: GitRunner = async (cwd, args, options) => {
      if (args[0] === 'rev-list') revListCalls.push(args);
      return runGit(cwd, args, options);
    };

    expect(await orderCommits(spyGit, repo, [c3, c1, c2])).toEqual([c1, c2, c3]);
    expect(await orderCommits(spyGit, repo, [c3, rootSha])).toEqual([rootSha, c3]);

    // Bounded range check even when root commit is included in non-contiguous snapshot
    await snapshotCommitsTree(spyGit, repo, [rootSha, c3]);
    for (const args of revListCalls) {
      const bounded =
        args.includes('--no-walk=sorted') ||
        args.includes('-n') ||
        args.some((arg) => arg.startsWith('--max-count=')) ||
        args.some((arg) => arg.startsWith('^'));
      expect(bounded).toBe(true);
    }
  }, 30_000);

  it('orders commits from unrelated histories without a full history walk', async () => {
    const repo = createRepo();
    const rootSha = sh(repo, 'rev-parse', 'HEAD').trim();
    sh(repo, 'checkout', '-q', '--orphan', 'other');
    sh(repo, 'rm', '-rq', '--cached', '.');
    writeFileSync(join(repo, 'o1.ts'), '1\n');
    sh(repo, 'add', 'o1.ts');
    sh(repo, 'commit', '-q', '-m', 'o1');
    const o1 = sh(repo, 'rev-parse', 'HEAD').trim();
    writeFileSync(join(repo, 'o2.ts'), '2\n');
    sh(repo, 'add', 'o2.ts');
    sh(repo, 'commit', '-q', '-m', 'o2');
    const o2 = sh(repo, 'rev-parse', 'HEAD').trim();

    const revListCalls: string[][] = [];
    const spyGit: GitRunner = async (cwd, args, options) => {
      if (args[0] === 'rev-list') revListCalls.push(args);
      return runGit(cwd, args, options);
    };
    const ordered = await orderCommits(spyGit, repo, [o2, rootSha, o1]);
    expect([...ordered].sort()).toEqual([rootSha, o1, o2].sort());
    expect(ordered.indexOf(o1)).toBeLessThan(ordered.indexOf(o2));
    expect(revListCalls.every((args) => args.includes('--no-walk=sorted'))).toBe(true);
  }, 30_000);

  it('orders two unrelated commits deterministically regardless of selection order', async () => {
    const repo = createRepo();
    const commitDated = (file: string, content: string, message: string, date: string) => {
      writeFileSync(join(repo, file), content);
      sh(repo, 'add', file);
      execFileSync('git', ['commit', '-q', '-m', message], {
        cwd: repo,
        env: { ...process.env, ...IDENTITY, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
        encoding: 'utf8'
      });
      return sh(repo, 'rev-parse', 'HEAD').trim();
    };

    const earlier = commitDated('earlier.ts', '1\n', 'earlier', '2024-01-01T00:00:00Z');
    sh(repo, 'checkout', '-q', '--orphan', 'side');
    sh(repo, 'rm', '-rq', '--cached', '.');
    const later = commitDated('later.ts', '2\n', 'later', '2025-01-01T00:00:00Z');

    expect(await orderCommits(runGit, repo, [earlier, later])).toEqual([earlier, later]);
    expect(await orderCommits(runGit, repo, [later, earlier])).toEqual([earlier, later]);

    sh(repo, 'checkout', '-q', '--orphan', 'same-ts');
    sh(repo, 'rm', '-rq', '--cached', '.');
    const tied = commitDated('tied.ts', '3\n', 'tied', '2025-01-01T00:00:00Z');
    const forward = await orderCommits(runGit, repo, [later, tied]);
    const reversed = await orderCommits(runGit, repo, [tied, later]);
    expect(reversed).toEqual(forward);
  }, 30_000);

  it(`rejects selecting more than ${MAX_SELECTED_COMMITS} commits before running git`, async () => {
    const spyGit = vi.fn<GitRunner>(async () => ({ code: 0, stdout: '' }));
    const tooMany = Array.from({ length: MAX_SELECTED_COMMITS + 1 }, (_, index) => index.toString(16).padStart(7, '0'));

    await expect(orderCommits(spyGit, '/repo', tooMany)).rejects.toThrow(`Select at most ${MAX_SELECTED_COMMITS} commits`);
    expect(spyGit).not.toHaveBeenCalled();
  });

  it('snapshots root, single, contiguous, and non-contiguous commits and errors on conflicts or merge commits', async () => {
    const repo = createRepo();
    const rootSha = sh(repo, 'rev-parse', 'HEAD').trim();
    writeFileSync(join(repo, 'b.ts'), 'export const b = 1;\n');
    sh(repo, 'add', 'b.ts');
    sh(repo, 'commit', '-q', '-m', 'Add b');
    const secondSha = sh(repo, 'rev-parse', 'HEAD').trim();

    writeFileSync(join(repo, 'c.ts'), 'export const c = 1;\n');
    sh(repo, 'add', 'c.ts');
    sh(repo, 'commit', '-q', '-m', 'Add c');
    const thirdSha = sh(repo, 'rev-parse', 'HEAD').trim();

    writeFileSync(join(repo, 'd.ts'), 'export const d = 1;\n');
    sh(repo, 'add', 'd.ts');
    sh(repo, 'commit', '-q', '-m', 'Add d');
    const fourthSha = sh(repo, 'rev-parse', 'HEAD').trim();

    // Root commit
    const rootTree = await snapshotCommitsTree(runGit, repo, [rootSha]);
    const rootSnapshot = await commitSnapshot(runGit, repo, rootTree, 'commits', REVIEW_ID);
    expect((await diffFiles(runGit, repo, rootTree.baseSha, rootSnapshot)).map((f) => f.path).sort()).toEqual(['.gitignore', 'a.ts']);

    // Contiguous commits (passed out of order -> ordered oldest-to-newest)
    const contiguous = await snapshotCommitsTree(runGit, repo, [thirdSha, secondSha]);
    expect(contiguous.orderedShas).toEqual([secondSha, thirdSha]);
    const contiguousSnapshot = await commitSnapshot(runGit, repo, contiguous, 'commits', REVIEW_ID);
    expect((await diffFiles(runGit, repo, contiguous.baseSha, contiguousSnapshot)).map((f) => f.path).sort()).toEqual(['b.ts', 'c.ts']);

    // Non-contiguous commits touching independent files (with an empty commit skipped cleanly)
    sh(repo, 'commit', '--allow-empty', '-q', '-m', 'Empty checkpoint');
    const emptySha = sh(repo, 'rev-parse', 'HEAD').trim();
    const sparse = await snapshotCommitsTree(runGit, repo, [secondSha, fourthSha, emptySha]);
    expect(sparse.orderedShas).toEqual([secondSha, fourthSha, emptySha]);
    const sparseSnapshot = await commitSnapshot(runGit, repo, sparse, 'commits', REVIEW_ID);
    expect((await diffFiles(runGit, repo, sparse.baseSha, sparseSnapshot)).map((f) => f.path).sort()).toEqual(['b.ts', 'd.ts']);

    // Non-contiguous selection including a merge commit is rejected
    sh(repo, 'switch', '-q', '-c', 'side', secondSha);
    writeFileSync(join(repo, 'side.ts'), 'export const s = 1;\n');
    sh(repo, 'add', 'side.ts');
    sh(repo, 'commit', '-q', '-m', 'Side commit');
    sh(repo, 'switch', '-q', 'main');
    sh(repo, 'merge', '--no-ff', '-q', '-m', 'Merge side', 'side');
    const mergeSha = sh(repo, 'rev-parse', 'HEAD').trim();
    await expect(snapshotCommitsTree(runGit, repo, [secondSha, mergeSha])).rejects.toThrow(/merge commit/i);

    // Non-contiguous conflict on same line of a.ts
    writeFileSync(join(repo, 'a.ts'), 'line 1 changed\n');
    sh(repo, 'commit', '-q', '-am', 'Edit a once');
    writeFileSync(join(repo, 'a.ts'), 'line 1 changed twice\n');
    sh(repo, 'commit', '-q', '-am', 'Edit a twice');
    const conflictSha = sh(repo, 'rev-parse', 'HEAD').trim();
    await expect(snapshotCommitsTree(runGit, repo, [rootSha, conflictSha])).rejects.toThrow(/conflicts with skipped intermediate changes/);
  }, 30_000);

  it('falls back to main as the default base and rejects unsafe or missing bases', async () => {
    const repo = createRepo();

    expect((await resolveBase(runGit, repo, null)).ref).toBe('main');
    await expect(resolveBase(runGit, repo, '--upload-pack=x')).rejects.toThrow('Invalid base branch');
    await expect(resolveBase(runGit, repo, 'nope')).rejects.toThrow('does not exist');
  });

  it('lists worktrees with their branches and counts changed paths', async () => {
    const repo = createRepo();
    const linked = join(realpathSync(mkdtempSync(join(tmpdir(), 'codewink-wt-'))), 'wt');
    dirs.push(linked);
    sh(repo, 'worktree', 'add', '-q', '-b', 'topic', linked);
    writeFileSync(join(linked, 'new.ts'), 'n\n');
    writeFileSync(join(linked, 'a.ts'), 'changed\n');

    const worktrees = await listWorktrees(runGit, repo);

    expect(worktrees.map((worktree) => [worktree.path, worktree.branch, worktree.isMain])).toEqual([
      [repo, 'main', true],
      [linked, 'topic', false]
    ]);
    expect(await changedPathCount(runGit, linked)).toBe(2);
    expect(await changedPathCount(runGit, repo)).toBe(0);
  });

  it('counts a staged rename as a single changed path', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, 'orig.ts'), 'const orig = 1;\n');
    sh(repo, 'add', 'orig.ts');
    sh(repo, 'commit', '-q', '-m', 'add orig');
    sh(repo, 'mv', 'orig.ts', 'renamed.ts');

    expect(await changedPathCount(runGit, repo)).toBe(1);
  });

  it('refuses to snapshot a branch without commits and deletes snapshot refs', async () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'codewink-empty-')));
    dirs.push(dir);
    sh(dir, 'init', '-q');
    await expect(snapshotTree(runGit, dir, 'uncommitted')).rejects.toThrow('no commits yet');

    const repo = createRepo();
    const tree = await snapshotTree(runGit, repo, 'uncommitted');
    await commitSnapshot(runGit, repo, tree, 'uncommitted', REVIEW_ID);
    await deleteSnapshotRef(runGit, repo, REVIEW_ID);
    expect((await runGit(repo, ['rev-parse', '--verify', '--quiet', `${SNAPSHOT_REF_PREFIX}${REVIEW_ID}`])).code).not.toBe(0);
  });

  it('rejects unsafe paths, refs, and commits', async () => {
    const repo = createRepo();

    await expect(readFileAt(runGit, repo, 'HEAD', 'a.ts')).rejects.toThrow('Invalid commit');
    await expect(readFileAt(runGit, repo, 'a'.repeat(40), '../x')).rejects.toThrow('Invalid file path');
    expect(isSafeRef('origin/main')).toBe(true);
    expect(isSafeRef('a..b')).toBe(false);
    expect(isSafeRef('-x')).toBe(false);
    expect(isSecretLike('config/id_rsa')).toBe(true);
    expect(isSecretLike('src/app/credentials-form.tsx')).toBe(true);
    expect(isSecretLike('src/a.ts')).toBe(false);
  });
});
