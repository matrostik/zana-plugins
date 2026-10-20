import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertSafeGitToken, type GitRunner } from './git-exec.js';
import { validateRepoRelativeFilePath } from './project-repos.js';
import {
  UNCOMMITTED_COMMIT_HASH,
  type DiffHunk,
  type DiffLine,
  type FileChangeStatus,
  type GitCommitComparison,
  type GitCommitDetails,
  type GitFileChange,
  type GitFileContent,
  type GitFileDiff,
  type GitSignatureInfo
} from './types.js';

const FIELD_SEP = '\x1f';
const HEADER_END = '\x1e';

function normalizeStatusChar(raw: string): FileChangeStatus {
  const first = raw.trim().charAt(0).toUpperCase();
  if (first === 'A' || first === 'M' || first === 'D' || first === 'R' || first === 'C' || first === 'U') {
    return first;
  }
  return 'M';
}

function signatureInfoFromCode(code: string, signer: string, keyId: string): GitSignatureInfo | undefined {
  const status = code.trim().charAt(0) as GitSignatureInfo['status'];
  if (!status || status === 'N') return undefined;
  const labels: Record<string, string> = {
    G: 'Good valid signature',
    B: 'Bad signature',
    U: 'Good signature with unknown validity',
    X: 'Good signature that has expired',
    Y: 'Good signature made by an expired key',
    R: 'Good signature made by a revoked key',
    E: 'Signature cannot be checked (missing key)'
  };
  return {
    status,
    signer: signer.trim() || undefined,
    keyId: keyId.trim() || undefined,
    label: labels[status] ?? 'Signed commit'
  };
}

/**
 * Parses `git diff --numstat -z` and `git diff --name-status -z` into `GitFileChange[]`.
 */
export function parseDiffStatAndStatus(numstatZ: string, nameStatusZ: string): GitFileChange[] {
  const statusByPath = new Map<string, { status: FileChangeStatus; oldPath: string; newPath: string }>();

  const statusTokens = nameStatusZ.split('\0').filter((t) => t.length > 0);
  for (let i = 0; i < statusTokens.length; i++) {
    const statusRaw = statusTokens[i];
    const code = normalizeStatusChar(statusRaw);
    if (code === 'R' || code === 'C') {
      const oldPath = statusTokens[i + 1] ?? '';
      const newPath = statusTokens[i + 2] ?? oldPath;
      i += 2;
      if (newPath) statusByPath.set(`${oldPath}=>${newPath}`, { status: code, oldPath, newPath });
    } else {
      const filePath = statusTokens[i + 1] ?? '';
      i += 1;
      if (filePath) statusByPath.set(filePath, { status: code, oldPath: filePath, newPath: filePath });
    }
  }

  const changes: GitFileChange[] = [];
  const numTokens = numstatZ.split('\0').filter((t) => t.length > 0);
  for (let i = 0; i < numTokens.length; i++) {
    const token = numTokens[i];
    const parts = token.split('\t');
    if (parts.length < 3) continue;
    const addStr = parts[0];
    const delStr = parts[1];
    const restPath = parts.slice(2).join('\t');

    const additions = addStr === '-' ? null : Number.parseInt(addStr, 10) || 0;
    const deletions = delStr === '-' ? null : Number.parseInt(delStr, 10) || 0;

    if (restPath === '') {
      // Rename or copy in numstat -z has empty 3rd column followed by oldPath\0newPath\0
      const oldPath = numTokens[i + 1] ?? '';
      const newPath = numTokens[i + 2] ?? oldPath;
      i += 2;
      const meta = statusByPath.get(`${oldPath}=>${newPath}`);
      changes.push({
        oldPath,
        newPath,
        status: meta?.status ?? 'R',
        additions,
        deletions
      });
    } else {
      const meta = statusByPath.get(restPath);
      changes.push({
        oldPath: meta?.oldPath ?? restPath,
        newPath: meta?.newPath ?? restPath,
        status: meta?.status ?? 'M',
        additions,
        deletions
      });
    }
  }

  // Include any files that appeared in name-status but not numstat (e.g. mode-only or empty files)
  const seenNewPaths = new Set(changes.map((c) => `${c.oldPath}=>${c.newPath}`));
  for (const item of statusByPath.values()) {
    const key = `${item.oldPath}=>${item.newPath}`;
    if (!seenNewPaths.has(key)) {
      changes.push({
        oldPath: item.oldPath,
        newPath: item.newPath,
        status: item.status,
        additions: 0,
        deletions: 0
      });
    }
  }

  return changes;
}

/**
 * Parses `git status --porcelain=v1 -z` into `GitFileChange[]` for the Uncommitted Changes view.
 */
export function parsePorcelainFileChanges(stdout: string, includeUntracked: boolean): GitFileChange[] {
  const changes: GitFileChange[] = [];
  if (!stdout) return changes;
  const tokens = stdout.split('\0');
  for (let i = 0; i < tokens.length; i++) {
    const entry = tokens[i];
    if (!entry || entry.length < 4) continue;
    const x = entry.charAt(0);
    const y = entry.charAt(1);
    const pathPart = entry.slice(3);

    if (x === '?' && y === '?') {
      if (!includeUntracked) continue;
      changes.push({
        oldPath: pathPart,
        newPath: pathPart,
        status: 'U',
        additions: null,
        deletions: null,
        staged: false,
        untracked: true
      });
      continue;
    }

    if (x === 'R' || y === 'R' || x === 'C' || y === 'C') {
      const origPath = tokens[i + 1] ?? pathPart;
      i += 1;
      changes.push({
        oldPath: origPath,
        newPath: pathPart,
        status: x === 'C' || y === 'C' ? 'C' : 'R',
        additions: null,
        deletions: null,
        staged: x !== ' ' && x !== '?'
      });
      continue;
    }

    const effective = x !== ' ' && x !== '?' ? x : y;
    changes.push({
      oldPath: pathPart,
      newPath: pathPart,
      status: normalizeStatusChar(effective),
      additions: null,
      deletions: null,
      staged: x !== ' ' && x !== '?'
    });
  }
  return changes;
}

/**
 * Loads full `GitCommitDetails` for a commit hash or synthetic `UNCOMMITTED_COMMIT_HASH`.
 */
export async function loadCommitDetails(args: {
  cwd: string;
  git: GitRunner;
  commitHash: string;
  showUntrackedFiles?: boolean;
}): Promise<GitCommitDetails> {
  const { cwd, git } = args;
  const commitHash = args.commitHash.trim();

  if (commitHash === UNCOMMITTED_COMMIT_HASH) {
    const includeUntracked = args.showUntrackedFiles ?? true;
    const [headRes, statusRes, numstatRes] = await Promise.all([
      git({ cwd, args: ['rev-parse', '--verify', 'HEAD'], timeoutMs: 5_000 }),
      git({
        cwd,
        args: ['status', '--porcelain=v1', '-z', includeUntracked ? '-uall' : '-uno'],
        timeoutMs: 10_000
      }),
      git({ cwd, args: ['diff', 'HEAD', '--numstat', '-z'], timeoutMs: 10_000 })
    ]);

    const headHash = headRes.code === 0 ? headRes.stdout.trim() : '';
    const fileChanges = parsePorcelainFileChanges(statusRes.stdout, includeUntracked);
    const statChanges = parseDiffStatAndStatus(numstatRes.stdout, '');
    const statMap = new Map(statChanges.map((c) => [c.newPath, c]));
    for (const change of fileChanges) {
      const stat = statMap.get(change.newPath);
      if (stat) {
        change.additions = stat.additions;
        change.deletions = stat.deletions;
      }
    }

    const nowSec = Math.floor(Date.now() / 1000);
    return {
      hash: UNCOMMITTED_COMMIT_HASH,
      abbreviatedHash: '*',
      parents: headHash ? [headHash] : [],
      authorName: 'Working Tree',
      authorEmail: '',
      authorDate: nowSec,
      committerName: 'Working Tree',
      committerEmail: '',
      commitDate: nowSec,
      subject: `Uncommitted Changes (${fileChanges.length})`,
      body: 'Working tree and index modifications not yet committed.',
      fileChanges
    };
  }

  const safeHash = assertSafeGitToken(commitHash, 'commit hash');
  const format = [
    '%H',
    '%h',
    '%P',
    '%an',
    '%ae',
    '%at',
    '%cn',
    '%ce',
    '%ct',
    '%G?',
    '%GS',
    '%GK',
    '%s',
    '%b'
  ].join(FIELD_SEP) + HEADER_END;

  const [metaRes, numstatRes, nameStatusRes] = await Promise.all([
    git({ cwd, args: ['show', '--quiet', `--format=${format}`, safeHash, '--'], timeoutMs: 10_000 }),
    git({
      cwd,
      args: ['diff-tree', '--root', '--no-commit-id', '-m', '--first-parent', '--numstat', '-r', '-z', safeHash, '--'],
      timeoutMs: 15_000
    }),
    git({
      cwd,
      args: ['diff-tree', '--root', '--no-commit-id', '-m', '--first-parent', '--name-status', '-r', '-z', safeHash, '--'],
      timeoutMs: 15_000
    })
  ]);

  if (metaRes.code !== 0) {
    throw new Error(metaRes.stderr.trim() || `Commit not found: ${safeHash}`);
  }

  const headerEndIdx = metaRes.stdout.indexOf(HEADER_END);
  const rawHeader = headerEndIdx >= 0 ? metaRes.stdout.slice(0, headerEndIdx) : metaRes.stdout;
  const fields = rawHeader.split(FIELD_SEP);

  const [
    hash = safeHash,
    abbreviatedHash = safeHash.slice(0, 7),
    parentsStr = '',
    authorName = '',
    authorEmail = '',
    authorDateStr = '0',
    committerName = '',
    committerEmail = '',
    commitDateStr = '0',
    sigCode = 'N',
    sigSigner = '',
    sigKey = '',
    subject = '',
    ...bodyParts
  ] = fields;

  const fileChanges = parseDiffStatAndStatus(
    numstatRes.code === 0 ? numstatRes.stdout : '',
    nameStatusRes.code === 0 ? nameStatusRes.stdout : ''
  );

  return {
    hash: hash.trim(),
    abbreviatedHash: abbreviatedHash.trim(),
    parents: parentsStr.trim().split(/\s+/).filter(Boolean),
    authorName: authorName.trim(),
    authorEmail: authorEmail.trim(),
    authorDate: Number.parseInt(authorDateStr, 10) || 0,
    committerName: committerName.trim(),
    committerEmail: committerEmail.trim(),
    commitDate: Number.parseInt(commitDateStr, 10) || 0,
    subject: subject.trim(),
    body: bodyParts.join(FIELD_SEP).trim(),
    signature: signatureInfoFromCode(sigCode, sigSigner, sigKey),
    fileChanges
  };
}

/**
 * Compares any two commits (or a commit and `UNCOMMITTED_COMMIT_HASH`).
 */
export async function compareCommits(args: {
  cwd: string;
  git: GitRunner;
  fromHash: string;
  toHash: string;
}): Promise<GitCommitComparison> {
  const { cwd, git } = args;
  const fromHash = args.fromHash.trim();
  const toHash = args.toHash.trim();

  if (fromHash === UNCOMMITTED_COMMIT_HASH && toHash === UNCOMMITTED_COMMIT_HASH) {
    return { fromHash, toHash, fileChanges: [] };
  }

  const diffArgsBase: string[] = ['diff', '-r', '-z'];
  if (toHash === UNCOMMITTED_COMMIT_HASH) {
    diffArgsBase.push(assertSafeGitToken(fromHash, 'fromHash'));
  } else if (fromHash === UNCOMMITTED_COMMIT_HASH) {
    diffArgsBase.push('-R', assertSafeGitToken(toHash, 'toHash'));
  } else {
    diffArgsBase.push(
      assertSafeGitToken(fromHash, 'fromHash'),
      assertSafeGitToken(toHash, 'toHash')
    );
  }

  const [numstatRes, nameStatusRes] = await Promise.all([
    git({ cwd, args: [...diffArgsBase, '--numstat', '--'], timeoutMs: 15_000 }),
    git({ cwd, args: [...diffArgsBase, '--name-status', '--'], timeoutMs: 15_000 })
  ]);

  if (numstatRes.code !== 0 && nameStatusRes.code !== 0) {
    throw new Error(numstatRes.stderr.trim() || 'Could not compare commits.');
  }

  return {
    fromHash,
    toHash,
    fileChanges: parseDiffStatAndStatus(numstatRes.stdout, nameStatusRes.stdout)
  };
}

/**
 * Parses unified diff output into structured `DiffHunk[]` with line numbers for unified and split views.
 */
export function parseUnifiedDiff(rawDiff: string): { isBinary: boolean; hunks: DiffHunk[] } {
  if (/Binary files .* differ/i.test(rawDiff) || /GIT binary patch/i.test(rawDiff)) {
    return { isBinary: true, hunks: [] };
  }

  const hunks: DiffHunk[] = [];
  const lines = rawDiff.split(/\r?\n/);
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  const hunkHeaderRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

  for (const line of lines) {
    const match = hunkHeaderRegex.exec(line);
    if (match) {
      const oldStart = Number.parseInt(match[1], 10) || 0;
      const oldLines = match[2] !== undefined ? Number.parseInt(match[2], 10) : 1;
      const newStart = Number.parseInt(match[3], 10) || 0;
      const newLines = match[4] !== undefined ? Number.parseInt(match[4], 10) : 1;

      currentHunk = {
        header: line,
        oldStart,
        oldLines,
        newStart,
        newLines,
        lines: []
      };
      hunks.push(currentHunk);
      oldLine = oldStart;
      newLine = newStart;
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'add',
        oldLineNumber: null,
        newLineNumber: newLine++,
        content: line.slice(1)
      });
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'del',
        oldLineNumber: oldLine++,
        newLineNumber: null,
        content: line.slice(1)
      });
    } else if (line.startsWith(' ')) {
      currentHunk.lines.push({
        type: 'context',
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
        content: line.slice(1)
      });
    } else if (line.startsWith('\\')) {
      currentHunk.lines.push({
        type: 'meta',
        oldLineNumber: null,
        newLineNumber: null,
        content: line
      });
    }
  }

  return { isBinary: false, hunks };
}

/**
 * Loads the file diff for a file in a single commit, uncommitted working tree, or between two commits.
 */
export async function loadFileDiff(args: {
  cwd: string;
  git: GitRunner;
  commitHash: string;
  fromHash?: string;
  filePath: string;
  oldPath?: string;
}): Promise<GitFileDiff> {
  const { cwd, git } = args;
  const filePath = validateRepoRelativeFilePath(args.filePath);
  const oldPath = args.oldPath ? validateRepoRelativeFilePath(args.oldPath) : undefined;
  const pathSpecs = oldPath && oldPath !== filePath ? [oldPath, filePath] : [filePath];
  const commitHash = args.commitHash.trim();
  const fromHash = args.fromHash?.trim();

  let rawDiff = '';

  if (fromHash && fromHash !== commitHash) {
    if (commitHash === UNCOMMITTED_COMMIT_HASH) {
      const res = await git({
        cwd,
        args: ['diff', '--unified=3', assertSafeGitToken(fromHash, 'fromHash'), '--', ...pathSpecs],
        timeoutMs: 15_000
      });
      rawDiff = res.stdout;
    } else if (fromHash === UNCOMMITTED_COMMIT_HASH) {
      const res = await git({
        cwd,
        args: ['diff', '--unified=3', '-R', assertSafeGitToken(commitHash, 'commitHash'), '--', ...pathSpecs],
        timeoutMs: 15_000
      });
      rawDiff = res.stdout;
    } else {
      const res = await git({
        cwd,
        args: [
          'diff',
          '--unified=3',
          assertSafeGitToken(fromHash, 'fromHash'),
          assertSafeGitToken(commitHash, 'commitHash'),
          '--',
          ...pathSpecs
        ],
        timeoutMs: 15_000
      });
      rawDiff = res.stdout;
    }
  } else if (commitHash === UNCOMMITTED_COMMIT_HASH) {
    const res = await git({
      cwd,
      args: ['diff', '--unified=3', 'HEAD', '--', ...pathSpecs],
      timeoutMs: 15_000
    });
    rawDiff = res.stdout;
    if (!rawDiff.trim()) {
      // May be an untracked file — generate diff against /dev/null via --no-index
      const untrackedRes = await git({
        cwd,
        args: ['diff', '--no-index', '--unified=3', '--', '/dev/null', filePath],
        timeoutMs: 10_000
      });
      rawDiff = untrackedRes.stdout;
    }
  } else {
    const safeHash = assertSafeGitToken(commitHash, 'commitHash');
    const res = await git({
      cwd,
      args: ['show', '--format=', '--first-parent', '--unified=3', safeHash, '--', ...pathSpecs],
      timeoutMs: 15_000
    });
    rawDiff = res.stdout;
  }

  const parsed = parseUnifiedDiff(rawDiff);
  return {
    filePath,
    oldPath,
    commitHash,
    fromHash,
    isBinary: parsed.isBinary,
    rawDiff,
    hunks: parsed.hunks
  };
}

/**
 * Loads the full file content at a specific revision or from working tree.
 */
export async function loadFileContent(args: {
  cwd: string;
  git: GitRunner;
  commitHash: string;
  filePath: string;
}): Promise<GitFileContent> {
  const { cwd, git } = args;
  const filePath = validateRepoRelativeFilePath(args.filePath);
  const commitHash = args.commitHash.trim();

  if (commitHash === UNCOMMITTED_COMMIT_HASH) {
    try {
      const fullPath = join(cwd, filePath);
      if (!existsSync(fullPath)) {
        return { filePath, commitHash, content: '', isBinary: false };
      }
      const buf = readFileSync(fullPath);
      const isBinary = buf.subarray(0, 8000).includes(0);
      return {
        filePath,
        commitHash,
        content: isBinary ? '' : buf.toString('utf8'),
        isBinary
      };
    } catch {
      return { filePath, commitHash, content: '', isBinary: false };
    }
  }

  const safeHash = assertSafeGitToken(commitHash, 'commitHash');
  const res = await git({
    cwd,
    args: ['show', `${safeHash}:${filePath}`],
    timeoutMs: 15_000,
    maxBytes: 8 * 1024 * 1024
  });

  if (res.code !== 0) {
    return { filePath, commitHash, content: '', isBinary: false };
  }

  const isBinary = res.stdout.slice(0, 8000).includes('\0');
  return {
    filePath,
    commitHash,
    content: isBinary ? '' : res.stdout,
    isBinary
  };
}
