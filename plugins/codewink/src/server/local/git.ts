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

/** Limits on files a snapshot adds relative to its base, whether untracked, staged, or committed on the branch. */
export const MAX_NEW_FILES = 200;
export const MAX_NEW_FILE_BYTES = 256 * 1024;
export const MAX_DIFF_FILES = 300;
export const MAX_FILE_READ_CHARS = 1_000_000;
export const MAX_SELECTED_COMMITS = 50;
export const SNAPSHOT_REF_PREFIX = 'refs/codewink/local/';

/** Identity for snapshot commits, so users without git identity config can still snapshot. */
const SNAPSHOT_IDENTITY = {
  GIT_AUTHOR_NAME: 'CodeWink',
  GIT_AUTHOR_EMAIL: 'codewink@localhost',
  GIT_COMMITTER_NAME: 'CodeWink',
  GIT_COMMITTER_EMAIL: 'codewink@localhost'
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
const CODEWINK_BRANCH_PATTERN = /^zcc\/codewink-/;

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

export interface BranchEntry {
  ref: string;
  kind: 'local' | 'remote';
  isCurrent: boolean;
}

export interface BranchList {
  currentBranch: string | null;
  defaultBase: string | null;
  branches: BranchEntry[];
}

export interface CommitInfo {
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  authoredAt: string;
}

export interface CommitPage {
  commits: CommitInfo[];
  hasMore: boolean;
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
    if (field.startsWith('worktree ')) current.path = resolve(field.slice('worktree '.length));
    else if (field.startsWith('HEAD ')) current.head = field.slice('HEAD '.length);
    else if (field.startsWith('branch ')) current.branch = field.slice('branch '.length).replace(/^refs\/heads\//, '');
    else if (field === 'bare' || field.startsWith('prunable')) current.skip = true;
  }
  flush();
  return worktrees;
}

/** Available local and remote branches for `worktreePath`, excluding CodeWink internal branches and symbolic HEADs. */
export async function listBranches(git: GitRunner, worktreePath: string): Promise<BranchList> {
  const headRes = await git(worktreePath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const headName = headRes.code === 0 ? headRes.stdout.trim() : '';
  const currentBranch = headName && headName !== 'HEAD' ? headName : null;

  const out = await must(git, worktreePath, ['for-each-ref', '--format=%(refname)%09%(symref)', 'refs/heads', 'refs/remotes'], 'for-each-ref');
  const branches: BranchEntry[] = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const [refname = '', symref = ''] = line.split('\t');
    if (!refname || symref.trim()) continue;
    if (refname.startsWith('refs/heads/')) {
      const ref = refname.slice('refs/heads/'.length);
      if (CODEWINK_BRANCH_PATTERN.test(ref)) continue;
      branches.push({ ref, kind: 'local', isCurrent: ref === currentBranch });
    } else if (refname.startsWith('refs/remotes/')) {
      const ref = refname.slice('refs/remotes/'.length);
      if (ref.endsWith('/HEAD')) continue;
      branches.push({ ref, kind: 'remote', isCurrent: false });
    }
  }
  branches.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === 'local' ? -1 : 1;
    return a.ref.localeCompare(b.ref);
  });

  const defaultBase = await resolveBase(git, worktreePath, null).then((found) => found.ref).catch(() => null);
  return { currentBranch, defaultBase, branches };
}

/** Paginated commit log of `ref` (default `HEAD`). */
export async function listCommits(
  git: GitRunner,
  worktreePath: string,
  options: { limit?: number; skip?: number; ref?: string } = {}
): Promise<CommitPage> {
  const rawLimit = typeof options.limit === 'number' && Number.isFinite(options.limit) ? Math.trunc(options.limit) : 10;
  const rawSkip = typeof options.skip === 'number' && Number.isFinite(options.skip) ? Math.trunc(options.skip) : 0;
  const limit = Math.max(1, Math.min(rawLimit, 50));
  const skip = Math.max(0, rawSkip);
  const ref = options.ref ?? 'HEAD';
  if (!isSafeRef(ref)) throw new Error(`Invalid ref: ${ref}`);

  const exists = await git(worktreePath, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  if (exists.code !== 0) return { commits: [], hasMore: false };

  const out = await must(
    git,
    worktreePath,
    ['log', '--no-color', `--skip=${skip}`, `--max-count=${limit + 1}`, '--format=%H%x1f%h%x1f%s%x1f%an%x1f%aI%x1e', ref],
    'log'
  );
  const records = out
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const hasMore = records.length > limit;
  const commits = records.slice(0, limit).map((record) => {
    const [sha = '', shortSha = '', subject = '', author = '', authoredAt = ''] = record.split('\x1f');
    return { sha, shortSha, subject, author, authoredAt };
  });
  return { commits, hasMore };
}

/** Number of changed paths (staged, unstaged, or untracked), or null when git status fails. */
export async function changedPathCount(git: GitRunner, worktreePath: string): Promise<number | null> {
  const result = await git(worktreePath, ['status', '--porcelain=v1', '-z', '--untracked-files=normal']);
  if (result.code !== 0) return null;
  const fields = result.stdout.split('\0').filter(Boolean);
  let count = 0;
  for (let index = 0; index < fields.length; index++) {
    count++;
    // Each record is a two-char XY status followed by the path. A rename or copy in either
    // the index (X) or worktree (Y) column emits the original path as a separate field.
    const status = fields[index].slice(0, 2);
    if (status[0] === 'R' || status[0] === 'C' || status[1] === 'R' || status[1] === 'C') index++;
  }
  return count;
}

export async function repoTopLevel(git: GitRunner, path: string): Promise<string | null> {
  const result = await git(path, ['rev-parse', '--show-toplevel']);
  return result.code === 0 ? result.stdout.trim() || null : null;
}

export async function headCommit(git: GitRunner, worktreePath: string): Promise<string> {
  const result = await git(worktreePath, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}']);
  const sha = result.stdout.trim();
  if (result.code !== 0 || !SHA_PATTERN.test(sha)) throw new Error('This branch has no commits yet. Commit once before reviewing local changes.');
  return sha;
}

export async function resolveBranchRef(git: GitRunner, worktreePath: string, ref: string): Promise<{ ref: string; sha: string }> {
  if (!isSafeRef(ref)) throw new Error(`Invalid branch: ${ref}`);
  const result = await git(worktreePath, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  const sha = result.stdout.trim();
  if (result.code !== 0 || !SHA_PATTERN.test(sha)) throw new Error(`Branch ${ref} does not exist in this repository`);
  return { ref, sha };
}

async function withTempIndex<T>(git: GitRunner, worktreePath: string, work: (env: Record<string, string>) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'codewink-index-'));
  const env = { ...LITERAL_PATHSPECS, GIT_INDEX_FILE: join(dir, 'index') };
  try {
    const gitPath = (await must(git, worktreePath, ['rev-parse', '--git-path', 'index'], 'rev-parse')).trim();
    const source = isAbsolute(gitPath) ? gitPath : resolve(worktreePath, gitPath);
    try {
      await copyFile(source, env.GIT_INDEX_FILE);
      // Git trusts cached stat data only for entries older than the index file; a fresh copy mtime would hide same-size edits.
      const { atime, mtime } = await stat(source);
      await utimes(env.GIT_INDEX_FILE, atime, mtime);
    } catch (error) {
      // Only an absent index (a repo that has never staged anything) is a legitimate empty start.
      // Any other failure must surface rather than silently degrade a staged review to HEAD-vs-HEAD.
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error;
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
    if (info.isSymbolicLink()) {
      skipped.push({ path, reason: 'symlink' });
      continue;
    }
    if (info.size > MAX_NEW_FILE_BYTES) {
      skipped.push({ path, reason: 'too-large' });
      continue;
    }
    if (await looksBinary(absolute).catch(() => true)) {
      skipped.push({ path, reason: 'binary' });
      continue;
    }
    if (include.length >= MAX_NEW_FILES) {
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

export interface CommitsSnapshotTree extends SnapshotTree {
  baseSha: string;
  orderedShas: string[];
}

interface IndexChange {
  path: string;
  baseMode: string;
  baseSha: string;
  mode: string;
  sha: string;
  status: string;
}

const NULL_MODE = '000000';
const GITLINK_MODE = '160000';
const SYMLINK_MODE = '120000';

/** Index entries that differ from `baseSha`, from `git diff-index --raw -z`. */
async function indexChanges(git: GitRunner, worktreePath: string, env: Record<string, string>, baseSha: string): Promise<IndexChange[]> {
  const out = await must(git, worktreePath, ['diff-index', '--cached', '--no-renames', '--no-abbrev', '-z', baseSha], 'diff-index', { env });
  const fields = out.split('\0');
  const changes: IndexChange[] = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    const [baseMode, mode, base, sha, status] = fields[index].replace(/^:/, '').split(' ');
    if (!status) continue;
    changes.push({ path: fields[index + 1], baseMode, baseSha: base, mode, sha, status: status[0] });
  }
  return changes;
}

async function blobSizes(git: GitRunner, worktreePath: string, shas: string[]): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  if (shas.length === 0) return sizes;
  const out = await must(git, worktreePath, ['cat-file', '--batch-check=%(objectname) %(objectsize)'], 'cat-file', { input: `${shas.join('\n')}\n` });
  for (const line of out.split('\n')) {
    const [sha, size] = line.split(' ');
    if (sha && size && /^\d+$/.test(size)) sizes.set(sha, Number(size));
  }
  return sizes;
}

/** Paths among the staged changes that git considers binary, from a single `diff-index --numstat` call. */
async function binaryPaths(git: GitRunner, worktreePath: string, env: Record<string, string>, baseSha: string): Promise<Set<string>> {
  const binary = new Set<string>();
  const out = await must(git, worktreePath, ['diff-index', '--cached', '--no-renames', '--numstat', '-z', baseSha], 'diff-index', { env });
  // With --no-renames each -z record is one NUL-terminated field `<added>\t<deleted>\t<path>`;
  // binary files report `-` for both counts.
  for (const record of out.split('\0').filter(Boolean)) {
    const [added, deleted, ...rest] = record.split('\t');
    if (added === '-' && deleted === '-' && rest.length > 0) binary.add(rest.join('\t'));
  }
  return binary;
}

/**
 * Resets index entries that must not reach a reviewer back to `baseSha`: changed secret-looking files,
 * symlinks (whose targets could point outside the snapshot), and new files over the size or count limits.
 * Covers tracked, staged, and branch-committed changes alike.
 */
async function excludeUnsafeChanges(git: GitRunner, worktreePath: string, env: Record<string, string>, baseSha: string): Promise<SkippedFile[]> {
  const changes = await indexChanges(git, worktreePath, env, baseSha);
  const skipped: SkippedFile[] = [];
  const excluded: IndexChange[] = [];
  const additions: IndexChange[] = [];
  for (const change of changes) {
    if (isSecretLike(change.path)) {
      skipped.push({ path: change.path, reason: 'possible-secret' });
      excluded.push(change);
    } else if (change.mode === SYMLINK_MODE) {
      skipped.push({ path: change.path, reason: 'symlink' });
      excluded.push(change);
    } else if (change.status === 'A') {
      additions.push(change);
    }
  }
  const blobShas = additions.filter((change) => change.mode !== GITLINK_MODE).map((change) => change.sha);
  const sizes = await blobSizes(git, worktreePath, blobShas);
  const binary = await binaryPaths(git, worktreePath, env, baseSha);
  let kept = 0;
  for (const change of additions.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))) {
    if ((sizes.get(change.sha) ?? 0) > MAX_NEW_FILE_BYTES) {
      skipped.push({ path: change.path, reason: 'too-large' });
      excluded.push(change);
    } else if (binary.has(change.path)) {
      skipped.push({ path: change.path, reason: 'binary' });
      excluded.push(change);
    } else if (kept >= MAX_NEW_FILES) {
      skipped.push({ path: change.path, reason: 'too-many-files' });
      excluded.push(change);
    } else {
      kept++;
    }
  }
  if (excluded.length > 0) {
    const entries = excluded.map((change) => (change.baseMode === NULL_MODE ? `0 ${'0'.repeat(change.baseSha.length)}\t${change.path}` : `${change.baseMode} ${change.baseSha}\t${change.path}`));
    await must(git, worktreePath, ['update-index', '-z', '--index-info'], 'update-index', { env, input: `${entries.join('\0')}\0` });
  }
  return skipped;
}

/**
 * Hashes the reviewable state of a worktree into a git tree.
 * Safety invariant: the user's real index and working tree are never mutated. All staging happens against a
 * throwaway index via GIT_INDEX_FILE in a temp dir (see withTempIndex), so write-tree observes only that copy.
 * The tree hash doubles as a content fingerprint for staleness checks.
 * `baseSha` is the commit the review diffs against (HEAD unless given); unsafe changes relative to it are left out.
 */
export async function snapshotTree(git: GitRunner, worktreePath: string, scope: LocalScope, options: { baseSha?: string } = {}): Promise<SnapshotTree> {
  const headSha = await headCommit(git, worktreePath);
  const baseSha = options.baseSha ?? headSha;
  assertSha(baseSha);
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
    skipped = [...skipped, ...(await excludeUnsafeChanges(git, worktreePath, env, baseSha))];
    const treeSha = (await must(git, worktreePath, ['write-tree'], 'write-tree', { env })).trim();
    return { headSha, treeSha, skipped };
  });
}

/** Snapshots the committed tree of `headSha` (a non-checked-out branch tip) relative to `baseSha`, without touching the worktree. */
export async function snapshotBranchTree(git: GitRunner, worktreePath: string, headSha: string, baseSha: string): Promise<SnapshotTree> {
  assertSha(headSha);
  assertSha(baseSha);
  return withTempIndex(git, worktreePath, async (env) => {
    await must(git, worktreePath, ['read-tree', headSha], 'read-tree', { env });
    const skipped = await excludeUnsafeChanges(git, worktreePath, env, baseSha);
    const treeSha = (await must(git, worktreePath, ['write-tree'], 'write-tree', { env })).trim();
    return { headSha, treeSha, skipped };
  });
}

/** Parent commit of `sha`, or an empty tree SHA when `sha` is a root commit. */
export async function parentCommit(git: GitRunner, worktreePath: string, sha: string): Promise<{ sha: string; isEmptyTree: boolean }> {
  assertSha(sha);
  const parent = await git(worktreePath, ['rev-parse', '--verify', '--quiet', `${sha}^1^{commit}`]);
  const trimmed = parent.stdout.trim();
  if (parent.code === 0 && SHA_PATTERN.test(trimmed)) return { sha: trimmed, isEmptyTree: false };
  if (!(await commitExists(git, worktreePath, sha))) throw new Error(`Commit ${sha} does not exist in this repository`);
  const emptyTree = (await must(git, worktreePath, ['mktree'], 'mktree', { input: '' })).trim();
  assertSha(emptyTree);
  return { sha: emptyTree, isEmptyTree: true };
}

/** Above this many selected commits, pairwise ancestry checks are refused rather than spawning O(n²) git processes. */
const MAX_PAIRWISE_ORDER_CANDIDATES = 25;
/** Number of `git merge-base` processes run at once while ordering commits pairwise. */
const PAIRWISE_ORDER_CONCURRENCY = 8;

async function isAncestor(git: GitRunner, worktreePath: string, ancestor: string, descendant: string): Promise<boolean> {
  const res = await git(worktreePath, ['merge-base', '--is-ancestor', ancestor, descendant]);
  if (res.code === 0) return true;
  if (res.code === 1) return false;
  throw new Error(`git merge-base failed in ${worktreePath}`);
}

/** Returns -1 when `a` is an ancestor of `b`, 1 when `b` is an ancestor of `a`, 0 when unrelated — using one git process. */
async function ancestryRelation(git: GitRunner, worktreePath: string, a: string, b: string): Promise<-1 | 0 | 1> {
  const res = await git(worktreePath, ['merge-base', a, b]);
  if (res.code === 1) return 0; // No common ancestor.
  if (res.code !== 0) throw new Error(`git merge-base failed in ${worktreePath}`);
  const base = res.stdout.trim();
  if (base === a) return -1;
  if (base === b) return 1;
  return 0;
}

/** Topologically sorts a small set of commits that share no common merge-base, via bounded-concurrency pairwise checks. */
async function topoSortByAncestry(git: GitRunner, worktreePath: string, candidates: readonly string[]): Promise<string[]> {
  const n = candidates.length;
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  const relations = await mapWithConcurrency(pairs, PAIRWISE_ORDER_CONCURRENCY, ([i, j]) => ancestryRelation(git, worktreePath, candidates[i], candidates[j]));
  const edges: number[][] = Array.from({ length: n }, () => []);
  const inDegree = new Array<number>(n).fill(0);
  pairs.forEach(([i, j], index) => {
    const relation = relations[index];
    if (relation === 0) return;
    const [from, to] = relation === -1 ? [i, j] : [j, i];
    edges[from].push(to);
    inDegree[to]++;
  });
  const ordered: string[] = [];
  const used = new Array<boolean>(n).fill(false);
  while (ordered.length < n) {
    const next = inDegree.findIndex((deg, idx) => !used[idx] && deg === 0);
    if (next === -1) throw new Error('Could not order selected commits.');
    used[next] = true;
    ordered.push(candidates[next]);
    for (const target of edges[next]) inDegree[target]--;
  }
  return ordered;
}

/** Validates each selected SHA and resolves it to a unique full commit SHA, preserving selection order. */
async function resolveCommitShas(git: GitRunner, worktreePath: string, shas: readonly string[]): Promise<string[]> {
  const unique = [...new Set(shas.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) throw new Error('Select at least one commit to review.');
  if (unique.length > MAX_SELECTED_COMMITS) {
    throw new Error(`Select at most ${MAX_SELECTED_COMMITS} commits to review.`);
  }
  const resolved: string[] = [];
  for (const candidate of unique) {
    assertSha(candidate);
    const res = await git(worktreePath, ['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`]);
    const full = res.stdout.trim();
    if (res.code !== 0 || !SHA_PATTERN.test(full)) throw new Error(`Commit ${candidate} does not exist in this repository`);
    if (!resolved.includes(full)) resolved.push(full);
  }
  return resolved;
}

/** Sorts commits oldest-to-newest by commit date; sorting SHAs first keeps identical timestamps independent of selection order. */
async function sortByDateDeterministic(git: GitRunner, worktreePath: string, resolved: readonly string[]): Promise<string[]> {
  const stableInput = [...resolved].sort();
  const out = await git(worktreePath, ['rev-list', '--no-walk=sorted', '--reverse', ...stableInput]);
  const sorted = out.code === 0 ? out.stdout.split('\n').map((line) => line.trim()).filter(Boolean) : [];
  return sorted.length === stableInput.length ? sorted : stableInput;
}

/** Sorts by commit date and returns the result only when it forms an ancestor chain — no history walk for linear selections. */
async function orderByDateChain(git: GitRunner, worktreePath: string, resolved: readonly string[]): Promise<{ candidates: string[]; chain: boolean }> {
  const candidates = await sortByDateDeterministic(git, worktreePath, resolved);
  const chainChecks = await Promise.all(
    candidates.slice(0, -1).map((sha, index) => isAncestor(git, worktreePath, sha, candidates[index + 1]))
  );
  return { candidates, chain: chainChecks.every(Boolean) };
}

/**
 * Orders commits that share a common merge-base by walking only the ancestry path between that
 * merge-base and the selected tips. Returns null when the selection has no common merge-base.
 */
async function orderFromMergeBase(git: GitRunner, worktreePath: string, resolved: readonly string[]): Promise<string[] | null> {
  const mb = await git(worktreePath, ['merge-base', '--octopus', ...resolved]);
  const mbSha = mb.code === 0 ? mb.stdout.trim().split('\n')[0]?.trim() : '';
  if (!mbSha || !SHA_PATTERN.test(mbSha)) return null;
  const wanted = new Set(resolved);
  // Excluding the merge-base itself keeps the walk bounded even when it is a root commit; it is re-added as the oldest entry.
  const out = await must(git, worktreePath, ['rev-list', '--topo-order', '--reverse', '--ancestry-path', ...resolved, `^${mbSha}`], 'rev-list');
  const walked = out.split('\n').map((line) => line.trim()).filter((sha) => wanted.has(sha));
  const ordered = wanted.has(mbSha) ? [mbSha, ...walked] : walked;
  if (ordered.length !== resolved.length) throw new Error('Could not order selected commits.');
  return ordered;
}

/** Orders commit SHAs oldest-to-newest topologically and validates that all exist. */
export async function orderCommits(git: GitRunner, worktreePath: string, shas: readonly string[]): Promise<string[]> {
  const resolved = await resolveCommitShas(git, worktreePath, shas);
  if (resolved.length === 1) return resolved;
  if (resolved.length === 2) {
    const relation = await ancestryRelation(git, worktreePath, resolved[0], resolved[1]);
    if (relation === -1) return resolved;
    if (relation === 1) return [resolved[1], resolved[0]];
    return sortByDateDeterministic(git, worktreePath, resolved);
  }
  const { candidates, chain } = await orderByDateChain(git, worktreePath, resolved);
  if (chain) return candidates;
  const fromMergeBase = await orderFromMergeBase(git, worktreePath, resolved);
  if (fromMergeBase) return fromMergeBase;
  if (candidates.length > MAX_PAIRWISE_ORDER_CANDIDATES) {
    throw new Error(`Selected commits do not share a common history. Select at most ${MAX_PAIRWISE_ORDER_CANDIDATES} commits from unrelated histories.`);
  }
  return topoSortByAncestry(git, worktreePath, candidates);
}

/** Replays non-contiguous single-parent commits sequentially onto `baseSha` in a throwaway index. */
async function replayCommitsOntoIndex(
  git: GitRunner,
  worktreePath: string,
  env: Record<string, string>,
  baseSha: string,
  ordered: readonly string[]
): Promise<void> {
  await must(git, worktreePath, ['read-tree', baseSha], 'read-tree', { env });
  for (const sha of ordered) {
    const secondParent = await git(worktreePath, ['rev-parse', '--verify', '--quiet', `${sha}^2^{commit}`]);
    if (secondParent.code === 0) {
      throw new Error(`Cannot combine non-contiguous commits that include merge commit ${sha.slice(0, 7)}. Select a contiguous range instead.`);
    }
    const parent = await parentCommit(git, worktreePath, sha);
    const changed = await git(worktreePath, ['diff', '--quiet', parent.sha, sha]);
    if (changed.code === 0) continue;
    if (changed.code !== 1) throw new Error(`git diff failed for ${sha.slice(0, 7)} in ${worktreePath}`);
    const patch = await must(git, worktreePath, ['diff', '--binary', '--full-index', parent.sha, sha], 'diff');
    if (patch.trim().length === 0) {
      throw new Error(`Cannot replay non-text changes in ${sha.slice(0, 7)} across skipped commits. Select a contiguous range instead.`);
    }
    const applied = await git(worktreePath, ['apply', '--cached'], { env, input: patch });
    if (applied.code !== 0) {
      throw new Error(`Cannot combine the selected commits because ${sha.slice(0, 7)} conflicts with skipped intermediate changes. Select a contiguous range or fewer commits.`);
    }
  }
}

/**
 * Snapshots one or more selected commits into a git tree relative to the oldest commit's parent.
 * Contiguous commit ranges use the exact tree of the newest commit; non-contiguous selections
 * reject merge commits and replay each commit's patch onto the base tree inside a temporary index.
 */
export async function snapshotCommitsTree(git: GitRunner, worktreePath: string, shas: readonly string[]): Promise<CommitsSnapshotTree> {
  const ordered = await orderCommits(git, worktreePath, shas);
  const oldest = ordered[0];
  const newest = ordered[ordered.length - 1];
  const baseParent = await parentCommit(git, worktreePath, oldest);
  const baseSha = baseParent.sha;

  if (ordered.length === 1) {
    const tree = await snapshotBranchTree(git, worktreePath, newest, baseSha);
    return { ...tree, baseSha, orderedShas: ordered };
  }

  const maxCountArg = `--max-count=${ordered.length + 1}`;
  const rangeArgs = baseParent.isEmptyTree ? ['rev-list', maxCountArg, newest] : ['rev-list', maxCountArg, `${baseSha}..${newest}`];
  const rangeOut = await must(git, worktreePath, rangeArgs, 'rev-list');
  const rangeSet = new Set(rangeOut.split('\n').map((line) => line.trim()).filter(Boolean));
  const contiguous = rangeSet.size === ordered.length && ordered.every((sha) => rangeSet.has(sha));
  if (contiguous) {
    const tree = await snapshotBranchTree(git, worktreePath, newest, baseSha);
    return { ...tree, baseSha, orderedShas: ordered };
  }

  return withTempIndex(git, worktreePath, async (env) => {
    await replayCommitsOntoIndex(git, worktreePath, env, baseSha, ordered);
    const skipped = await excludeUnsafeChanges(git, worktreePath, env, baseSha);
    const treeSha = (await must(git, worktreePath, ['write-tree'], 'write-tree', { env })).trim();
    return { headSha: newest, treeSha, skipped, baseSha, orderedShas: ordered };
  });
}

/** Records `tree` as a commit on top of HEAD and pins it under `refs/codewink/local/<reviewId>`. */
export async function commitSnapshot(git: GitRunner, worktreePath: string, tree: SnapshotTree, scope: LocalScope, reviewId: string): Promise<string> {
  if (!REVIEW_ID_PATTERN.test(reviewId)) throw new Error(`Invalid review id: ${reviewId}`);
  const snapshotSha = (
    await must(git, worktreePath, ['commit-tree', '--no-gpg-sign', tree.treeSha, '-p', tree.headSha, '-m', `CodeWink local review snapshot (${scope})`], 'commit-tree', {
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

/** Changed files between two commits (or trees) with per-file patches; files past MAX_DIFF_FILES carry no patch. */
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
    // Scope to the destination path only. Rename detection runs before pathspec filtering, so the rename's own
    // hunks are kept while an unrelated file recreated at the source path cannot leak into this patch.
    const result = await git(worktreePath, ['diff', '--no-color', '--no-ext-diff', '-M', '-U3', from, to, '--', path], { env: LITERAL_PATHSPECS });
    const patch = result.code === 0 ? hunksOnly(result.stdout) : null;
    return { path, status: entry.status, ...countLines(patch), patch };
  });
}

/** All file paths in the tree of commit `sha`, so unchanged files are discoverable too. */
export async function listTreeFiles(git: GitRunner, worktreePath: string, sha: string): Promise<string[]> {
  assertSha(sha);
  const result = await git(worktreePath, ['ls-tree', '-r', '--name-only', '-z', sha]);
  if (result.code !== 0) return [];
  return result.stdout.split('\0').filter(Boolean);
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

/** Subjects and bodies of specific commits, newest first. */
export async function commitMessagesForShas(git: GitRunner, worktreePath: string, shas: readonly string[], max = 20): Promise<string[]> {
  if (shas.length === 0) return [];
  const selected = shas.slice(-max);
  for (const sha of selected) assertSha(sha);
  const result = await git(worktreePath, ['log', '--no-color', '--no-walk', '--format=%s%n%b%x1e', ...selected]);
  if (result.code !== 0) return [];
  return result.stdout.split('\x1e').map((message) => message.trim()).filter(Boolean);
}

export async function commitExists(git: GitRunner, worktreePath: string, sha: string): Promise<boolean> {
  if (!SHA_PATTERN.test(sha)) return false;
  return (await git(worktreePath, ['cat-file', '-e', `${sha}^{commit}`])).code === 0;
}
