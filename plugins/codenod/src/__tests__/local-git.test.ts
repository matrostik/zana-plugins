import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
  listTreeFiles,
  listWorktrees,
  MAX_NEW_FILE_BYTES,
  MAX_NEW_FILES,
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

  it('counts a staged rename as a single changed path', async () => {
    const repo = createRepo();
    writeFileSync(join(repo, 'orig.ts'), 'const orig = 1;\n');
    sh(repo, 'add', 'orig.ts');
    sh(repo, 'commit', '-q', '-m', 'add orig');
    sh(repo, 'mv', 'orig.ts', 'renamed.ts');

    expect(await changedPathCount(runGit, repo)).toBe(1);
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
