// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PrDetail } from '../app/PrDetail.tsx';
import type { ReviewScores, ReviewStatus } from '../server/types.ts';
import type { PrDetail as PrDetailData } from '../server/views.ts';

const EMPTY_SCORES: ReviewScores = {
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

function detail(status: ReviewStatus): PrDetailData {
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
      updatedAt: new Date().toISOString(),
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
      error: null,
      trigger: 'manual',
      createdAt: 0,
      completedAt: completed ? 1 : null,
      stale: false
    },
    runs: ['a', 'b', 'c'].map((model, index) => ({
      ...EMPTY_SCORES,
      id: `run-${model}`,
      reviewId: 'rev',
      providerId: 'cursor',
      model,
      reasoningLevel: null,
      threadId: null,
      status: completed || index === 0 ? 'completed' : 'running',
      summary: null,
      error: null,
      issueCount: 0,
      startedAt: 0,
      completedAt: null
    })),
    findings: [],
    posted: []
  };
}

function renderDetail(data: PrDetailData) {
  return render(
    <PrDetail rpc={{ call: async () => data }} pluginId="codenod" prId={data.pr.id} defaultModels={[]} hasModels onOpenSettings={() => {}} />
  );
}

afterEach(cleanup);

describe('PrDetail review progress', () => {
  it('shows a loading ring while the review is running', async () => {
    renderDetail(detail('running'));
    const banner = await screen.findByRole('status');
    expect(banner.textContent).toContain('Review running · 1/3 model(s) done');
    expect(banner.getAttribute('aria-busy')).toBe('true');
    expect(banner.querySelector('.cn-spinner')).toBeTruthy();
  });

  it('hides the loading ring after the review completes', async () => {
    const { container } = renderDetail(detail('completed'));
    expect(await screen.findByText('Looks fine')).toBeTruthy();
    expect(container.querySelector('.cn-spinner')).toBeNull();
  });
});
