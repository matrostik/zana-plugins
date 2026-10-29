export type PrBucket = 'needs-review' | 'mine' | 'watched';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type IssueCategory = 'security' | 'performance' | 'logic' | 'style';

export type CiState = 'success' | 'failure' | 'pending' | 'none';

export type ReviewStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ReviewEvent = 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';

export type ReviewTargetKind = 'pr' | 'local';

/** Which local changes a local review covers. */
export type LocalScope = 'uncommitted' | 'staged' | 'branch';

/** Who started a local review; agent-started reviews stay off the Agents board and Inbox. */
export type LocalReviewSource = 'ui' | 'cli' | 'agent';

export interface RepoRef {
  host: string;
  owner: string;
  name: string;
}

export interface PrRef extends RepoRef {
  number: number;
}

export interface ModelChoice {
  providerId: string;
  model: string;
  reasoningLevel?: string;
}

export interface PullRequestRow {
  id: string;
  host: string;
  owner: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  url: string;
  state: string;
  isDraft: boolean;
  headSha: string;
  headRef: string;
  baseRef: string;
  ciState: CiState;
  buckets: PrBucket[];
  updatedAt: string;
  syncedAt: number;
}

export interface ReviewScores {
  riskScore: number | null;
  coverageScore: number | null;
  coverageNote: string | null;
  requirementsScore: number | null;
  requirementsNote: string | null;
  simplicityScore: number | null;
  simplicityNote: string | null;
  stabilityScore: number | null;
  stabilityNote: string | null;
}

export interface ParsedIssue {
  category: IssueCategory;
  severity: Severity;
  file: string;
  line: number | null;
  description: string;
  suggestion: string | null;
}

export interface ParsedAnalysis extends ReviewScores {
  summary: string;
  issues: ParsedIssue[];
  changeTypes: string[];
}

export interface ReviewRow extends ReviewScores {
  id: string;
  prId: string;
  headSha: string;
  status: ReviewStatus;
  summary: string | null;
  consensusSummary: string | null;
  hasRequirements: boolean;
  error: string | null;
  trigger: 'manual' | 'auto';
  targetKind: ReviewTargetKind;
  createdAt: number;
  completedAt: number | null;
  coordinatorThreadId?: string | null;
}

export interface ReviewRunRow extends ReviewScores {
  id: string;
  reviewId: string;
  providerId: string;
  model: string;
  reasoningLevel: string | null;
  threadId: string | null;
  status: ReviewStatus;
  summary: string | null;
  error: string | null;
  issueCount: number;
  startedAt: number;
  completedAt: number | null;
}

export interface FindingRow {
  id: string;
  reviewId: string;
  category: IssueCategory;
  severity: Severity;
  file: string;
  line: number | null;
  description: string;
  suggestion: string | null;
  agreedBy: string[];
  confidence: number;
  postedAt: number | null;
  dismissed: boolean;
}

export interface PrThreadRow {
  prId: string;
  threadId: string;
  kind: 'coordinator' | 'deep';
  createdAt: number;
}

export interface RepoRow {
  id: string;
  host: string;
  owner: string;
  name: string;
  autoReview: boolean;
  specGlob: string | null;
  addedAt: number;
}

export interface ChangedFile {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

/** A checked-out branch location (main checkout or git worktree) inside a Zana project. */
export interface LocalTargetRow {
  id: string;
  projectId: string;
  worktreePath: string;
  branch: string | null;
  lastScope: LocalScope | null;
  lastSeenAt: number;
  createdAt: number;
}

export type SkipReason = 'possible-secret' | 'too-large' | 'binary' | 'too-many-files' | 'generated' | 'over-budget';

export interface SkippedFile {
  path: string;
  reason: SkipReason;
}

export interface LocalSnapshotRow {
  reviewId: string;
  targetId: string;
  scope: LocalScope;
  baseRef: string | null;
  baseSha: string;
  headSha: string;
  snapshotSha: string;
  treeSha: string;
  intent: string | null;
  source: LocalReviewSource;
  files: ChangedFile[];
  skipped: SkippedFile[];
  createdAt: number;
}
