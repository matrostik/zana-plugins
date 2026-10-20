import { assertSafeGitToken, type GitRunner } from './git-exec.js';
import {
  UNCOMMITTED_COMMIT_HASH,
  type CommitOrder,
  type GitCommitNode,
  type GitRefBadge,
  type GitRemoteInfo
} from './types.js';

const FIELD_SEP = '\x1f';
const RECORD_SEP = '\x1e';

// Format: %H | %h | %P | %an | %ae | %at | %cn | %ce | %ct | %s
const GIT_LOG_FORMAT = [
  '%H',
  '%h',
  '%P',
  '%an',
  '%ae',
  '%at',
  '%cn',
  '%ce',
  '%ct',
  '%s'
].join(FIELD_SEP) + RECORD_SEP;

export interface ParsedRefsResult {
  headHash: string | null;
  currentBranch: string | null;
  branches: string[];
  remoteBranches: string[];
  tags: string[];
  refsByHash: Map<string, GitRefBadge[]>;
}

/**
 * Parses `git show-ref --head --dereference` output alongside symbolic HEAD branch name.
 */
export function parseShowRefOutput(stdout: string, currentBranch: string | null): ParsedRefsResult {
  let headHash: string | null = null;
  const branches: string[] = [];
  const remoteBranches: string[] = [];
  const tags: string[] = [];
  const refsByHash = new Map<string, GitRefBadge[]>();
  const annotatedTagTarget = new Map<string, string>();
  const rawTags: Array<{ name: string; hash: string }> = [];

  const pushBadge = (hash: string, badge: GitRefBadge) => {
    const list = refsByHash.get(hash) ?? [];
    list.push(badge);
    refsByHash.set(hash, list);
  };

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const spaceIdx = line.indexOf(' ');
    if (spaceIdx <= 0) continue;
    const hash = line.slice(0, spaceIdx).trim();
    const refName = line.slice(spaceIdx + 1).trim();

    if (refName === 'HEAD') {
      headHash = hash;
      continue;
    }

    if (refName.startsWith('refs/heads/')) {
      const name = refName.slice('refs/heads/'.length);
      branches.push(name);
      pushBadge(hash, {
        type: 'head',
        name,
        isHead: currentBranch === name
      });
      continue;
    }

    if (refName.startsWith('refs/remotes/')) {
      const rest = refName.slice('refs/remotes/'.length);
      if (rest.endsWith('/HEAD')) continue;
      const slashIdx = rest.indexOf('/');
      const remote = slashIdx > 0 ? rest.slice(0, slashIdx) : undefined;
      remoteBranches.push(rest);
      pushBadge(hash, {
        type: 'remote',
        name: rest,
        remote
      });
      continue;
    }

    if (refName.startsWith('refs/tags/')) {
      const tagRest = refName.slice('refs/tags/'.length);
      if (tagRest.endsWith('^{}')) {
        const cleanTag = tagRest.slice(0, -3);
        annotatedTagTarget.set(cleanTag, hash);
      } else {
        rawTags.push({ name: tagRest, hash });
      }
    }
  }

  for (const tag of rawTags) {
    tags.push(tag.name);
    const targetHash = annotatedTagTarget.get(tag.name) ?? tag.hash;
    pushBadge(targetHash, {
      type: 'tag',
      name: tag.name
    });
  }

  branches.sort((a, b) => a.localeCompare(b));
  remoteBranches.sort((a, b) => a.localeCompare(b));
  tags.sort((a, b) => a.localeCompare(b));

  return {
    headHash,
    currentBranch,
    branches,
    remoteBranches,
    tags,
    refsByHash
  };
}

/**
 * Parses `git log` formatted with `GIT_LOG_FORMAT`.
 */
export function parseGitLogOutput(
  stdout: string,
  refsByHash: Map<string, GitRefBadge[]>,
  headHash: string | null
): GitCommitNode[] {
  const nodes: GitCommitNode[] = [];
  const records = stdout.split(RECORD_SEP);

  for (const rawRecord of records) {
    const record = rawRecord.replace(/^[\r\n]+|[\r\n]+$/g, '');
    if (!record) continue;
    const fields = record.split(FIELD_SEP);
    if (fields.length < 10) continue;

    const [
      hash,
      abbreviatedHash,
      parentsStr,
      authorName,
      authorEmail,
      authorDateStr,
      committerName,
      committerEmail,
      commitDateStr,
      ...subjectParts
    ] = fields;

    const cleanHash = hash.trim();
    if (!cleanHash) continue;

    const parents = parentsStr
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const refs = (refsByHash.get(cleanHash) ?? []).map((r) => ({ ...r }));
    const authorDate = Number.parseInt(authorDateStr, 10) || 0;
    const commitDate = Number.parseInt(commitDateStr, 10) || 0;

    nodes.push({
      hash: cleanHash,
      abbreviatedHash: abbreviatedHash.trim() || cleanHash.slice(0, 7),
      parents,
      authorName: authorName.trim(),
      authorEmail: authorEmail.trim(),
      authorDate,
      committerName: committerName.trim(),
      committerEmail: committerEmail.trim(),
      commitDate,
      subject: subjectParts.join(FIELD_SEP).trim(),
      refs,
      isHead: headHash === cleanHash
    });
  }

  return nodes;
}

export interface StashEntry {
  selector: string;
  hash: string;
  abbreviatedHash: string;
  baseHash: string;
  authorName: string;
  authorEmail: string;
  authorDate: number;
  subject: string;
}

/**
 * Parses `git stash list --format=...` output.
 */
export function parseStashListOutput(stdout: string): StashEntry[] {
  const stashes: StashEntry[] = [];
  for (const rawRecord of stdout.split(RECORD_SEP)) {
    const record = rawRecord.replace(/^[\r\n]+|[\r\n]+$/g, '');
    if (!record) continue;
    const fields = record.split(FIELD_SEP);
    if (fields.length < 7) continue;
    const [selector, hash, abbreviatedHash, parentsStr, authorName, authorEmail, dateStr, ...subjectParts] = fields;
    const parents = parentsStr.trim().split(/\s+/).filter(Boolean);
    if (!hash.trim() || parents.length === 0) continue;
    stashes.push({
      selector: selector.trim(),
      hash: hash.trim(),
      abbreviatedHash: abbreviatedHash.trim() || hash.trim().slice(0, 7),
      baseHash: parents[0],
      authorName: authorName.trim(),
      authorEmail: authorEmail.trim(),
      authorDate: Number.parseInt(dateStr, 10) || 0,
      subject: subjectParts.join(FIELD_SEP).trim()
    });
  }
  return stashes;
}

/**
 * Parses `git status --porcelain=v1 -z` to count modified/staged/untracked files.
 */
export function countPorcelainStatusEntries(stdout: string, includeUntracked: boolean): number {
  if (!stdout) return 0;
  const tokens = stdout.split('\0');
  let count = 0;
  for (let i = 0; i < tokens.length; i++) {
    const entry = tokens[i];
    if (!entry || entry.length < 3) continue;
    const xy = entry.slice(0, 2);
    if (xy === '??' && !includeUntracked) continue;
    count += 1;
    // Renames / copies in -z format consume an extra path token
    if (xy.includes('R') || xy.includes('C')) {
      i += 1;
    }
  }
  return count;
}

/**
 * Parses `git remote -v` output into `GitRemoteInfo[]`.
 */
export function parseGitRemotesOutput(stdout: string): GitRemoteInfo[] {
  const map = new Map<string, GitRemoteInfo>();
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^([^\s]+)\s+([^\s]+)\s+\((fetch|push)\)$/.exec(line);
    if (!match) continue;
    const [, name, url, kind] = match;
    const current = map.get(name) ?? { name, fetchUrl: url, pushUrl: url };
    if (kind === 'fetch') current.fetchUrl = url;
    if (kind === 'push') current.pushUrl = url;
    map.set(name, current);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadRepositoryGraph(args: {
  cwd: string;
  git: GitRunner;
  maxCommits: number;
  selectedBranches: string[];
  showRemoteBranches: boolean;
  showTags: boolean;
  showStashes: boolean;
  showUncommittedChanges: boolean;
  showUntrackedFiles: boolean;
  onlyFollowFirstParent: boolean;
  commitOrdering: CommitOrder;
  useMailmap: boolean;
}): Promise<{
  commits: GitCommitNode[];
  hasMore: boolean;
  branches: string[];
  remoteBranches: string[];
  tags: string[];
  stashes: Array<{ selector: string; hash: string; subject: string; baseHash: string }>;
  headHash: string | null;
  currentBranch: string | null;
  uncommittedCount: number;
  remotes: GitRemoteInfo[];
}> {
  const { cwd, git } = args;
  const maxCommits = Math.max(1, Math.min(2000, Math.floor(args.maxCommits)));

  const [branchRes, showRefRes, remotesRes] = await Promise.all([
    git({ cwd, args: ['symbolic-ref', '--quiet', '--short', 'HEAD'], timeoutMs: 8_000 }),
    git({ cwd, args: ['show-ref', '--head', '--dereference'], timeoutMs: 10_000 }),
    git({ cwd, args: ['remote', '-v'], timeoutMs: 8_000 })
  ]);

  const currentBranch = branchRes.code === 0 ? branchRes.stdout.trim() || null : null;
  const parsedRefs = parseShowRefOutput(showRefRes.code === 0 ? showRefRes.stdout : '', currentBranch);
  const remotes = parseGitRemotesOutput(remotesRes.code === 0 ? remotesRes.stdout : '');

  // Filter refs on commit nodes according to visibility settings
  for (const [hash, badges] of parsedRefs.refsByHash.entries()) {
    const filtered = badges.filter((badge) => {
      if (badge.type === 'remote' && !args.showRemoteBranches) return false;
      if (badge.type === 'tag' && !args.showTags) return false;
      return true;
    });
    parsedRefs.refsByHash.set(hash, filtered);
  }

  // Build `git log` arguments
  const logArgs: string[] = ['log', `--max-count=${maxCommits + 1}`, `--format=${GIT_LOG_FORMAT}`];
  if (args.commitOrdering === 'topo') {
    logArgs.push('--topo-order');
  } else if (args.commitOrdering === 'author-date') {
    logArgs.push('--author-date-order');
  } else {
    logArgs.push('--date-order');
  }

  if (args.onlyFollowFirstParent) {
    logArgs.push('--first-parent');
  }
  if (args.useMailmap) {
    logArgs.push('--use-mailmap');
  }

  const validSelected = (args.selectedBranches ?? [])
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !b.startsWith('-'));

  if (validSelected.length > 0) {
    for (const branch of validSelected) {
      logArgs.push(assertSafeGitToken(branch, 'branch filter'));
    }
  } else {
    logArgs.push('--branches');
    if (args.showTags) logArgs.push('--tags');
    if (args.showRemoteBranches) logArgs.push('--remotes');
    if (parsedRefs.headHash) logArgs.push('HEAD');
  }
  logArgs.push('--');

  const logRes = await git({ cwd, args: logArgs, timeoutMs: 20_000 });
  const rawNodes = logRes.code === 0 ? parseGitLogOutput(logRes.stdout, parsedRefs.refsByHash, parsedRefs.headHash) : [];
  const hasMore = rawNodes.length > maxCommits;
  const commits = hasMore ? rawNodes.slice(0, maxCommits) : rawNodes;

  // Load stashes if enabled
  const stashes: Array<{ selector: string; hash: string; subject: string; baseHash: string }> = [];
  if (args.showStashes) {
    const stashFormat = ['%gd', '%H', '%h', '%P', '%an', '%ae', '%at', '%gs'].join(FIELD_SEP) + RECORD_SEP;
    const stashRes = await git({
      cwd,
      args: ['stash', 'list', `--format=${stashFormat}`],
      timeoutMs: 8_000
    });
    if (stashRes.code === 0 && stashRes.stdout.trim()) {
      const parsedStashes = parseStashListOutput(stashRes.stdout);
      const existingHashes = new Set(commits.map((c) => c.hash));
      for (const stash of parsedStashes) {
        stashes.push({
          selector: stash.selector,
          hash: stash.hash,
          subject: stash.subject,
          baseHash: stash.baseHash
        });
        if (!existingHashes.has(stash.hash)) {
          const baseIdx = commits.findIndex((c) => c.hash === stash.baseHash);
          const stashNode: GitCommitNode = {
            hash: stash.hash,
            abbreviatedHash: stash.abbreviatedHash,
            parents: [stash.baseHash],
            authorName: stash.authorName,
            authorEmail: stash.authorEmail,
            authorDate: stash.authorDate,
            committerName: stash.authorName,
            committerEmail: stash.authorEmail,
            commitDate: stash.authorDate,
            subject: stash.subject,
            refs: [{ type: 'stash', name: stash.selector, selector: stash.selector }],
            isStash: true,
            stashSelector: stash.selector
          };
          if (baseIdx >= 0) {
            commits.splice(baseIdx, 0, stashNode);
          } else {
            commits.unshift(stashNode);
          }
        }
      }
    }
  }

  // Check uncommitted changes if enabled
  let uncommittedCount = 0;
  if (args.showUncommittedChanges) {
    const statusArgs = ['status', '--porcelain=v1', '-z', ...(args.showUntrackedFiles ? ['-uall'] : ['-uno'])];
    const statusRes = await git({ cwd, args: statusArgs, timeoutMs: 10_000 });
    if (statusRes.code === 0) {
      uncommittedCount = countPorcelainStatusEntries(statusRes.stdout, args.showUntrackedFiles);
      if (uncommittedCount > 0) {
        const nowSec = Math.floor(Date.now() / 1000);
        commits.unshift({
          hash: UNCOMMITTED_COMMIT_HASH,
          abbreviatedHash: '*',
          parents: parsedRefs.headHash ? [parsedRefs.headHash] : [],
          authorName: '*',
          authorEmail: '',
          authorDate: nowSec,
          committerName: '*',
          committerEmail: '',
          commitDate: nowSec,
          subject: `Uncommitted Changes (${uncommittedCount})`,
          refs: [],
          isUncommitted: true
        });
      }
    }
  }

  return {
    commits,
    hasMore,
    branches: parsedRefs.branches,
    remoteBranches: parsedRefs.remoteBranches,
    tags: parsedRefs.tags,
    stashes,
    headHash: parsedRefs.headHash,
    currentBranch,
    uncommittedCount,
    remotes
  };
}
