import { spawn } from 'node:child_process';
import { copyFile, lstat, mkdtemp, open, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import type { ChangedFile, LocalScope, SkippedFile } from '../types.ts';
import { mapWithConcurrency } from '../util.ts';

export interface GitResult {
  code: number;
  stdout: string;
}

export interface GitOptions {
  env?: Record<string, string>;
  input?: string;
  timeoutMs?: number;
}

/** Runs git in `cwd` and returns the exit code with untrimmed stdout. Never throws. */
export type GitRunner = (cwd: string, args: string[], options?: GitOptions) => Promise<GitResult>;

const GIT_TIMEOUT_MS = 30_000;
const ADD_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const DIFF_CONCURRENCY = 6;
const BINARY_SNIFF_BYTES = 8_000;

export const MAX_UNTRACKED_FILES = 200;
export const MAX_UNTRACKED_BYTES = 256 * 1024;
export const MAX_DIFF_FILES = 300;
export const MAX_FILE_READ_CHARS = 1_000_000;
export const SNAPSHOT_REF_PREFIX = 'refs/codenod/local/';

/** Identity for snapshot commits, so users without git identity config can still snapshot. */
const SNAPSHOT_IDENTITY = {
  GIT_AUTHOR_NAME: 'CodeNod',
  GIT_AUTHOR_EMAIL: 'codenod@localhost',
  GIT_COMMITTER_NAME: 'CodeNod',
  GIT_COMMITTER_EMAIL: 'codenod@localhost'
};

/** Pathspecs are file names, never globs. */
const LITERAL_PATHSPECS = { GIT_LITERAL_PATHSPECS: '1' };

export const runGit: GitRunner = (cwd, args, options = {}) =>
  new Promise((resolvePromise) => {
    let child;
    try {
      child = spawn('git', ['--no-optional-locks', '-C', cwd, ...args], {
        stdio: ['pipe', 'pipe', 'ignore'],
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...options.env }
      });
    } catch {
      resolvePromise({ code: -1, stdout: '' });
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ code, stdout: Buffer.concat(chunks).toString('utf8') });
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(-1);
    }, options.timeoutMs ?? GIT_TIMEOUT_MS);
    child.stdout?.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) {
        child.kill('SIGKILL');
        finish(-1);
        return;
      }
      chunks.push(chunk);
    });
    child.on('error', () => finish(-1));
    child.on('close', (code) => finish(code ?? -1));
    child.stdin?.on('error', () => undefined);
    child.stdin?.end(options.input ?? '');
  });

async function must(git: GitRunner, cwd: string, args: string[], what: string, options?: GitOptions): Promise<string> {
  const result = await git(cwd, args, options);
  if (result.code !== 0) throw new Error(`git ${what} failed in ${cwd}`);
  return result.stdout;
}

const SHA_PATTERN = /^[0-9a-f]{7,64}$/i;
const REF_PATTERN = /^(?!-)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9._/@{}^~+-]{1,200}$/;
const REVIEW_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

export function isSafeRef(ref: string): boolean {
  return REF_PATTERN.test(ref);
}

function assertSha(sha: string): void {
  if (!SHA_PATTERN.test(sha)) throw new Error(`Invalid commit: ${sha}`);
}

function assertRepoPath(path: string): void {
  if (!path || path.includes('\0') || isAbsolute(path) || path.split('/').includes('..')) throw new Error(`Invalid file path: ${path}`);
}

const SECRET_PATTERNS = [
  /^\.env(\..*)?$/i,
  /\.(pem|key|p12|pfx|jks|keystore)$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)/i,
  /credentials/i,
  /secret/i
];

/** File names that commonly hold credentials; they are never sent to review models. */
export function isSecretLike(path: string): boolean {
  const base = path.split('/').pop() ?? '';
  return SECRET_PATTERNS.some((pattern) => pattern.test(base));
}

export interface WorktreeInfo {
  path: string;
  head: string | null;
  branch: string | null;
  isMain: boolean;
}

/** Checked-out locations of the repository containing `repoPath`; the first entry is the main checkout. */
export async function listWorktrees(git: GitRunner, repoPath: string): Promise<WorktreeInfo[]> {
  const out = await must(git, repoPath, ['worktree', 'list', '--porcelain', '-z'], 'worktree list');
  const worktrees: WorktreeInfo[] = [];
  let current: { path?: string; head?: string; branch?: string; skip?: boolean } = {};
  const flush = () => {
    if (current.path && !current.skip) {
      worktrees.push({ path: current.path, head: current.head ?? null, branch: current.branch ?? null, isMain: worktrees.length === 0 });
    }
    current = {};
  };
  for (const field of out.split('\0')) {
    if (field === '') {
      flush();
      continue;
    }
    if (field.startsWith('worktree ')) current.path = field.slice('worktree '.length);
    else if (field.startsWith('HEAD ')) current.head = field.slice('HEAD '.length);
    else if (field.startsWith('branch ')) current.branch = field.slice('branch '.length).replace(/^refs\/heads\//, '');
    else if (field === 'bare' || field.startsWith('prunable')) current.skip = true;
  }
  flush();
  return worktrees;
}

/** Number of changed paths (staged, unstaged, or untracked), or null when git status fails. */
export async function changedPathCount(git: GitRunner, worktreePath: string): Promise<number | null> {
  const result = await git(worktreePath, ['status', '--porcelain=v1', '-z', '--untracked-files=normal']);
  if (result.code !== 0) return null;
  const fields = result.stdout.split('\0').filter(Boolean);
  let count = 0;
  for (let index = 0; index < fields.length; index++) {
    count++;
    if (/^[RC]/.test(fields[index]) || /^.[RC]/.test(fields[index])) index++;
  }
  return count;
}

export async function repoTopLevel(git: GitRunner, path: string): Promise<string | null> {
  const result = await git(path, ['rev-parse', '--show-toplevel']);
  return result.code === 0 ? result.stdout.trim() || null : null;
}

async function headCommit(git: GitRunner, worktreePath: string): Promise<string> {
  const result = await git(worktreePath, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}']);
  const sha = result.stdout.trim();
  if (result.code !== 0 || !SHA_PATTERN.test(sha)) throw new Error('This branch has no commits yet. Commit once before reviewing local changes.');
  return sha;
}

async function withTempIndex<T>(git: GitRunner, worktreePath: string, work: (env: Record<string, string>) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'codenod-index-'));
  const env = { ...LITERAL_PATHSPECS, GIT_INDEX_FILE: join(dir, 'index') };
  try {
    const gitPath = (await must(git, worktreePath, ['rev-parse', '--git-path', 'index'], 'rev-parse')).trim();
    try {
      const source = isAbsolute(gitPath) ? gitPath : resolve(worktreePath, gitPath);
      await copyFile(source, env.GIT_INDEX_FILE);
      // Git trusts cached stat data only for entries older than the index file; a fresh copy mtime would hide same-size edits.
      const { atime, mtime } = await stat(source);
      await utimes(env.GIT_INDEX_FILE, atime, mtime);
    } catch {
      await must(git, worktreePath, ['read-tree', 'HEAD'], 'read-tree', { env });
    }
    return await work(env);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function looksBinary(absolutePath: string): Promise<boolean> {
  const handle = await open(absolutePath, 'r');
  try {
    const buffer = Buffer.alloc(BINARY_SNIFF_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, BINARY_SNIFF_BYTES, 0);
    return buffer.subarray(0, bytesRead).includes(0);
  } finally {
    await handle.close();
  }
}

/** Untracked, non-ignored files split into those safe to snapshot and those skipped with a reason. */
async function selectUntracked(git: GitRunner, worktreePath: string, env: Record<string, string>): Promise<{ include: string[]; skipped: SkippedFile[] }> {
  const out = await must(git, worktreePath, ['ls-files', '--others', '--exclude-standard', '-z'], 'ls-files', { env });
  const include: string[] = [];
  const skipped: SkippedFile[] = [];
  for (const path of out.split('\0').filter(Boolean).sort()) {
    if (isSecretLike(path)) {
      skipped.push({ path, reason: 'possible-secret' });
      continue;
    }
    const absolute = resolve(worktreePath, path);
    const info = await lstat(absolute).catch(() => null);
    if (!info) continue;
    if (!info.isSymbolicLink()) {
      if (info.size > MAX_UNTRACKED_BYTES) {
        skipped.push({ path, reason: 'too-large' });
        continue;
      }
      if (await looksBinary(absolute).catch(() => true)) {
        skipped.push({ path, reason: 'binary' });
        continue;
      }
    }
    if (include.length >= MAX_UNTRACKED_FILES) {
      skipped.push({ path, reason: 'too-many-files' });
      continue;
    }
    include.push(path);
  }
  return { include, skipped };
}

export interface SnapshotTree {
  headSha: string;
  treeSha: string;
  skipped: SkippedFile[];
}

/**
 * Hashes the reviewable state of a worktree into a git tree without touching its index or files.
 * The tree hash doubles as a content fingerprint for staleness checks.
 */
export async function snapshotTree(git: GitRunner, worktreePath: string, scope: LocalScope): Promise<SnapshotTree> {
  const headSha = await headCommit(git, worktreePath);
  return withTempIndex(git, worktreePath, async (env) => {
    let skipped: SkippedFile[] = [];
    if (scope !== 'staged') {
      await must(git, worktreePath, ['add', '--update', '--', '.'], 'add', { env, timeoutMs: ADD_TIMEOUT_MS });
      const untracked = await selectUntracked(git, worktreePath, env);
      skipped = untracked.skipped;
      if (untracked.include.length > 0) {
        await must(git, worktreePath, ['add', '--pathspec-from-file=-', '--pathspec-file-nul'], 'add', {
          env,
          input: untracked.include.join('\0'),
          timeoutMs: ADD_TIMEOUT_MS
        });
      }
    }
    const treeSha = (await must(git, worktreePath, ['write-tree'], 'write-tree', { env })).trim();
    return { headSha, treeSha, skipped };
  });
}

/** Records `tree` as a commit on top of HEAD and pins it under `refs/codenod/local/<reviewId>`. */
export async function commitSnapshot(git: GitRunner, worktreePath: string, tree: SnapshotTree, scope: LocalScope, reviewId: string): Promise<string> {
  if (!REVIEW_ID_PATTERN.test(reviewId)) throw new Error(`Invalid review id: ${reviewId}`);
  const snapshotSha = (
    await must(git, worktreePath, ['commit-tree', '--no-gpg-sign', tree.treeSha, '-p', tree.headSha, '-m', `CodeNod local review snapshot (${scope})`], 'commit-tree', {
      env: SNAPSHOT_IDENTITY
    })
  ).trim();
  assertSha(snapshotSha);
  await must(git, worktreePath, ['update-ref', `${SNAPSHOT_REF_PREFIX}${reviewId}`, snapshotSha], 'update-ref');
  return snapshotSha;
}

export async function deleteSnapshotRef(git: GitRunner, repoPath: string, reviewId: string): Promise<void> {
  if (!REVIEW_ID_PATTERN.test(reviewId)) return;
  await git(repoPath, ['update-ref', '-d', `${SNAPSHOT_REF_PREFIX}${reviewId}`]);
}

async function defaultBaseCandidates(git: GitRunner, worktreePath: string): Promise<string[]> {
  const remoteHead = await git(worktreePath, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']);
  const candidates = remoteHead.code === 0 && remoteHead.stdout.trim() ? [remoteHead.stdout.trim()] : [];
  return [...candidates, 'origin/main', 'origin/master', 'main', 'master'];
}

/** Resolves the base of a branch review: the given ref, or the remote's default branch. */
export async function resolveBase(git: GitRunner, worktreePath: string, base: string | null): Promise<{ ref: string; sha: string }> {
  if (base !== null && !isSafeRef(base)) throw new Error(`Invalid base branch: ${base}`);
  const candidates = base !== null ? [base] : await defaultBaseCandidates(git, worktreePath);
  for (const ref of candidates) {
    if (!isSafeRef(ref)) continue;
    const result = await git(worktreePath, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
    const sha = result.stdout.trim();
    if (result.code === 0 && SHA_PATTERN.test(sha)) return { ref, sha };
  }
  throw new Error(base !== null ? `Base branch ${base} does not exist in this repository` : 'Could not find a default base branch. Pass a base such as origin/main.');
}

export async function mergeBase(git: GitRunner, worktreePath: string, left: string, right: string): Promise<string> {
  assertSha(left);
  assertSha(right);
  const sha = (await must(git, worktreePath, ['merge-base', left, right], 'merge-base')).trim();
  assertSha(sha);
  return sha;
}

const STATUS_NAMES: Record<string, string> = { A: 'added', M: 'modified', D: 'removed', R: 'renamed', C: 'copied', T: 'changed' };

/** Keeps the hunks only, matching the `patch` shape GitHub returns for pull request files. */
function hunksOnly(diff: string): string | null {
  const start = diff.search(/^@@ /m);
  if (start === -1) return null;
  return diff.slice(start).replace(/\n$/, '');
}

function countLines(patch: string | null): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of patch?.split('\n') ?? []) {
    if (line.startsWith('+')) additions++;
    else if (line.startsWith('-')) deletions++;
  }
  return { additions, deletions };
}

/** Changed files between two commits with per-file patches; files past MAX_DIFF_FILES carry no patch. */
export async function diffFiles(git: GitRunner, worktreePath: string, from: string, to: string): Promise<ChangedFile[]> {
  assertSha(from);
  assertSha(to);
  const out = await must(git, worktreePath, ['diff', '--no-color', '--no-ext-diff', '-M', '--name-status', '-z', from, to], 'diff');
  const fields = out.split('\0').filter(Boolean);
  const entries: Array<{ status: string; paths: string[] }> = [];
  for (let index = 0; index < fields.length; index++) {
    const code = fields[index][0];
    const paths = code === 'R' || code === 'C' ? [fields[++index], fields[++index]] : [fields[++index]];
    if (paths.some((path) => path === undefined)) break;
    entries.push({ status: STATUS_NAMES[code] ?? 'modified', paths });
  }
  return mapWithConcurrency(entries, DIFF_CONCURRENCY, async (entry, index) => {
    const path = entry.paths[entry.paths.length - 1];
    if (index >= MAX_DIFF_FILES) return { path, status: entry.status, additions: 0, deletions: 0, patch: null };
    const result = await git(worktreePath, ['diff', '--no-color', '--no-ext-diff', '-M', '-U3', from, to, '--', ...entry.paths], { env: LITERAL_PATHSPECS });
    const patch = result.code === 0 ? hunksOnly(result.stdout) : null;
    return { path, status: entry.status, ...countLines(patch), patch };
  });
}

/** File text at `sha`, or null when it does not exist there. */
export async function readFileAt(git: GitRunner, worktreePath: string, sha: string, path: string): Promise<string | null> {
  assertSha(sha);
  assertRepoPath(path);
  const result = await git(worktreePath, ['cat-file', 'blob', `${sha}:${path}`]);
  if (result.code !== 0) return null;
  return result.stdout.length > MAX_FILE_READ_CHARS ? result.stdout.slice(0, MAX_FILE_READ_CHARS) : result.stdout;
}

/** Subjects and bodies of the commits in `from..to`, newest first. */
export async function commitMessages(git: GitRunner, worktreePath: string, from: string, to: string, max = 20): Promise<string[]> {
  assertSha(from);
  assertSha(to);
  const result = await git(worktreePath, ['log', '--no-color', `--max-count=${max}`, '--format=%s%n%b%x1e', `${from}..${to}`]);
  if (result.code !== 0) return [];
  return result.stdout.split('\x1e').map((message) => message.trim()).filter(Boolean);
}

export async function commitExists(git: GitRunner, worktreePath: string, sha: string): Promise<boolean> {
  if (!SHA_PATTERN.test(sha)) return false;
  return (await git(worktreePath, ['cat-file', '-e', `${sha}^{commit}`])).code === 0;
}
