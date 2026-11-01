import { describe, expect, it } from 'vitest';
import { createStore } from '../server/db.ts';
import { createOutdatedNotifier } from '../server/outdated.ts';
import { createSqliteDatabase } from './fake-host.ts';
import { detail, EMPTY_SCORES } from './pr-fixtures.ts';

function setup() {
  const db = createSqliteDatabase();
  const store = createStore(db, () => 100);
  const pr = detail('completed').pr;
  store.upsertPullRequest(pr);
  const messages: string[] = [];
  const notify = createOutdatedNotifier({
    store,
    projectForPr: async () => 'project',
    push: async ({ comments }) => { messages.push(comments); return { id: String(messages.length) }; },
    warn: () => {}
  });
  const complete = (headSha: string) => {
    const review = store.createReview({ prId: pr.id, headSha, trigger: 'manual' });
    store.completeReview(review.id, { summary: 'Done', consensusSummary: null, hasRequirements: false, scores: EMPTY_SCORES });
    return review;
  };
  return { db, store, pr, messages, notify, complete };
}

describe('outdated notifications', () => {
  it('does not notify for unreviewed PRs or metadata-only updates', async () => {
    const { store, pr, messages, notify, complete } = setup();
    await notify();
    complete(pr.headSha);
    store.upsertPullRequest({ ...pr, title: 'New title', updatedAt: 'later', ciState: 'failure' });
    await notify();
    expect(messages).toEqual([]);
  });

  it('does not notify for closed PRs or failed reviews', async () => {
    const { store, pr, messages, notify, complete } = setup();
    const failed = store.createReview({ prId: pr.id, headSha: 'old', trigger: 'manual' });
    store.setReviewStatus(failed.id, 'failed');
    await notify();
    expect(messages).toEqual([]);
    complete('old');
    store.upsertPullRequest({ ...pr, state: 'closed' });
    await notify([pr.id]);
    expect(messages).toEqual([]);
  });

  it('compares full SHAs and serializes overlapping deliveries', async () => {
    const { store, pr, messages, notify, complete } = setup();
    complete('abcdefg111111');
    store.upsertPullRequest({ ...pr, headSha: 'abcdefg222222' });
    await Promise.all([notify(), notify([pr.id]), notify()]);
    expect(messages).toHaveLength(1);
  });

  it('handles force pushes back to a reviewed head and clears outdated state after rerun', async () => {
    const { store, pr, messages, notify, complete } = setup();
    complete('original');
    store.upsertPullRequest({ ...pr, headSha: 'next' });
    await notify();
    store.upsertPullRequest({ ...pr, headSha: 'original' });
    await notify();
    expect(messages).toHaveLength(1);
    store.upsertPullRequest({ ...pr, headSha: 'next' });
    await notify();
    expect(messages).toHaveLength(1);
    complete('next');
    await notify();
    expect(messages).toHaveLength(1);
  });

  it('uses the latest inserted review when timestamps are equal in both list and detail', () => {
    const { store, pr, complete } = setup();
    complete('original');
    const latest = complete('next');
    expect(store.latestReview(pr.id)?.id).toBe(latest.id);
    expect(store.latestReviewsByPr().get(pr.id)?.id).toBe(latest.id);
  });
});
