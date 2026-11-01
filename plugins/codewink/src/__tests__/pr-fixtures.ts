import type { FindingRow, ReviewScores, ReviewStatus } from '../server/types.ts';
import type { PrDetail as PrDetailData } from '../server/views.ts';

export const NOW = 1_800_000_000_000;

export const EMPTY_SCORES: ReviewScores = {
  riskScore: null,
  coverageScore: null,
  coverageNote: null,
  requirementsScore: null,
  requirementsNote: null,
  simplicityScore: null,
  simplicityNote: null,
  stabilityScore: null,
  stabilityNote: null
};

export function finding(overrides: Partial<FindingRow> = {}): FindingRow {
  return {
    id: 'f1',
    reviewId: 'rev',
    category: 'logic',
    severity: 'high',
    file: 'src/login.ts',
    line: 12,
    description: 'Null token crashes login',
    suggestion: 'Guard the token',
    agreedBy: ['cursor/a', 'cursor/b'],
    confidence: 0.9,
    postedAt: null,
    dismissed: false,
    ...overrides
  };
}

export function detail(status: ReviewStatus, timing: { createdAt: number; completedAt: number | null } = { createdAt: NOW, completedAt: null }): PrDetailData {
  const completed = status === 'completed';
  return {
    pr: {
      id: 'github.com/acme/api#1',
      host: 'github.com',
      owner: 'acme',
      repo: 'api',
      number: 1,
      title: 'Add login',
      author: 'dev',
      url: 'https://github.com/acme/api/pull/1',
      state: 'open',
      isDraft: false,
      headSha: 'sha1',
      headRef: 'feat',
      baseRef: 'main',
      ciState: 'success',
      buckets: ['needs-review'],
      updatedAt: new Date(NOW).toISOString(),
      syncedAt: 0
    },
    review: {
      ...EMPTY_SCORES,
      ...(completed ? { riskScore: 2, coverageScore: 8, simplicityScore: 8, stabilityScore: 8 } : {}),
      id: 'rev',
      prId: 'github.com/acme/api#1',
      headSha: 'sha1',
      status,
      summary: completed ? 'Looks fine' : null,
      consensusSummary: null,
      hasRequirements: false,
      error: status === 'failed' ? 'boom' : null,
      trigger: 'manual',
      targetKind: 'pr',
      createdAt: timing.createdAt,
      completedAt: timing.completedAt,
      stale: false
    },
    runs: ['a', 'b', 'c'].map((model, index) => {
      const runStatus: ReviewStatus = completed || index === 0 ? 'completed' : index === 1 ? 'running' : 'queued';
      return {
        ...EMPTY_SCORES,
        id: `run-${model}`,
        reviewId: 'rev',
        providerId: 'cursor',
        model,
        reasoningLevel: null,
        threadId: null,
        status: runStatus,
        summary: null,
        error: null,
        issueCount: 0,
        startedAt: NOW - 84_000,
        completedAt: runStatus === 'completed' ? NOW - 19_000 : null
      };
    }),
    findings: [],
    posted: []
  };
}
