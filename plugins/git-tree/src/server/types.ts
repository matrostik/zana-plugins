export const UNCOMMITTED_COMMIT_HASH = '*';

export type GitRefType = 'head' | 'remote' | 'tag' | 'stash';

export interface GitRefBadge {
  type: GitRefType;
  name: string;
  remote?: string;
  isHead?: boolean;
  /** For stashes, e.g. stash@{0} */
  selector?: string;
}

export interface GitCommitNode {
  hash: string;
  abbreviatedHash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  authorDate: number;
  committerName: string;
  committerEmail: string;
  commitDate: number;
  subject: string;
  refs: GitRefBadge[];
  isHead?: boolean;
  isStash?: boolean;
  isUncommitted?: boolean;
  stashSelector?: string;
}

export type FileChangeStatus = 'A' | 'M' | 'D' | 'R' | 'C' | 'U';

export interface GitFileChange {
  oldPath: string;
  newPath: string;
  status: FileChangeStatus;
  additions: number | null;
  deletions: number | null;
  staged?: boolean;
  untracked?: boolean;
}

export interface GitSignatureInfo {
  status: 'G' | 'B' | 'U' | 'X' | 'Y' | 'R' | 'E' | 'N';
  signer?: string;
  keyId?: string;
  label: string;
}

export interface GitCommitDetails {
  hash: string;
  abbreviatedHash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  authorDate: number;
  committerName: string;
  committerEmail: string;
  commitDate: number;
  subject: string;
  body: string;
  signature?: GitSignatureInfo;
  fileChanges: GitFileChange[];
}

export interface GitCommitComparison {
  fromHash: string;
  toHash: string;
  fileChanges: GitFileChange[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'del' | 'meta';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface GitFileDiff {
  filePath: string;
  oldPath?: string;
  commitHash: string;
  fromHash?: string;
  isBinary: boolean;
  rawDiff: string;
  hunks: DiffHunk[];
}

export interface GitFileContent {
  filePath: string;
  commitHash: string;
  content: string;
  isBinary: boolean;
}

export interface DiscoveredRepo {
  /** Relative path from project root ('' for project root itself) */
  relPath: string;
  label: string;
  currentBranch: string | null;
  headHash: string | null;
  isWorktree: boolean;
}

export interface GitRemoteInfo {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitTagDetails {
  name: string;
  hash: string;
  isAnnotated: boolean;
  taggerName?: string;
  taggerEmail?: string;
  taggerDate?: number;
  message?: string;
}

export type CommitOrder = 'date' | 'author-date' | 'topo';
export type GraphStyle = 'rounded' | 'angular';
export type CommitDetailsLocation = 'docked' | 'inline';
export type FileViewType = 'tree' | 'list';
export type DiffViewMode = 'unified' | 'split';

export interface IssueLinkingRule {
  id: string;
  pattern: string;
  urlTemplate: string;
}

export type PullRequestProviderKind = 'github' | 'gitlab' | 'bitbucket' | 'custom';

export interface PullRequestConfig {
  provider: PullRequestProviderKind;
  remoteName: string;
  targetBranch: string;
  customUrlTemplate?: string;
}

export interface RepoSettings {
  selectedBranches: string[];
  showRemoteBranches: boolean;
  showStashes: boolean;
  showTags: boolean;
  showUncommittedChanges: boolean;
  showUntrackedFiles: boolean;
  onlyFollowFirstParent: boolean;
  commitOrdering: CommitOrder;
  issueLinkingRules: IssueLinkingRule[];
  pullRequestConfig: PullRequestConfig;
}

export interface GitGraphGlobalSettings {
  graphStyle: GraphStyle;
  initialLoadCommits: number;
  loadMoreCommits: number;
  muteNonAncestors: boolean;
  muteMergeCommits: boolean;
  commitDetailsLocation: CommitDetailsLocation;
  fileViewType: FileViewType;
  compactFolders: boolean;
  diffViewMode: DiffViewMode;
  maxDepthOfRepoSearch: number;
  dateType: 'author' | 'commit';
  dateFormat: 'relative' | 'iso' | 'datetime';
  fetchAndPrune: boolean;
  fetchAndPruneTags: boolean;
  signCommits: boolean;
  signTags: boolean;
  useMailmap: boolean;
  graphColors: string[];
  columnWidths?: GitGraphColumnWidths;
}

export interface GitGraphColumnWidths {
  description?: number;
  date: number;
  author: number;
  commit: number;
}

export interface CodeReviewRecord {
  key: string;
  projectId: string;
  subRepoRelPath: string;
  fromHash: string | null;
  toHash: string;
  reviewedFiles: string[];
  startedAt: number;
  lastActiveAt: number;
}

export interface LoadGraphDataResult {
  repo: DiscoveredRepo;
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
  repoSettings: RepoSettings;
  globalSettings: GitGraphGlobalSettings;
}
