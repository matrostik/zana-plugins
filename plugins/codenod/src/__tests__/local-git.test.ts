import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  changedPathCount,
  commitMessages,
  commitSnapshot,
  deleteSnapshotRef,
  diffFiles,
  isSafeRef,
  isSecretLike,
  listWorktrees,
  MAX_UNTRACKED_BYTES,
  mergeBase,
  readFileAt,
  resolveBase,
  runGit,
  snapshotTree,
  SNAPSHOT_REF_PREFIX
} from '../server/local/git.ts';

const IDENTITY = { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
const REVIEW_ID = '11111111-2222-3333-4444-555555555555';
const dirs: string[] = [];

function sh(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, env: { ...process.env, ...IDENTITY }, encoding: 'utf8' });
}

/** A repo with one commit on main containing `a.ts`. */
function createRepo(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'codenod-git-')));
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
    writeFileSync(join(repo, 'big.txt'), 'x'.repeat(MAX_UNTRACKED_BYTES + 1));
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

  it('falls back to main as the default base and rejects unsafe or missing bases', async () => {
    const repo = createRepo();

    expect((await resolveBase(runGit, repo, null)).ref).toBe('main');
    await expect(resolveBase(runGit, repo, '--upload-pack=x')).rejects.toThrow('Invalid base branch');
    await expect(resolveBase(runGit, repo, 'nope')).rejects.toThrow('does not exist');
  });

  it('lists worktrees with their branches and counts changed paths', async () => {
    const repo = createRepo();
    const linked = join(realpathSync(mkdtempSync(join(tmpdir(), 'codenod-wt-'))), 'wt');
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

  it('refuses to snapshot a branch without commits and deletes snapshot refs', async () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'codenod-empty-')));
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
