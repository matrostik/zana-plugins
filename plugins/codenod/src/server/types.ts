export type PrBucket = 'needs-review' | 'mine' | 'watched';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type IssueCategory = 'security' | 'performance' | 'logic' | 'style';

export type CiState = 'success' | 'failure' | 'pending' | 'none';

export type ReviewStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ReviewEvent = 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';

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
