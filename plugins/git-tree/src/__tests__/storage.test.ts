import { describe, expect, it } from 'vitest';
import { GitGraphStorage, NINETY_DAYS_MS } from '../server/storage.js';

function memoryKv() {
  const data = new Map<string, unknown>();
  return {
    data,
    kv: {
      get: async <T>(key: string) => data.get(key) as T | undefined,
      set: async (key: string, value: unknown) => {
        data.set(key, value);
      },
      delete: async (key: string) => {
        data.delete(key);
      },
      list: async (prefix: string) => [...data.keys()].filter((k) => k.startsWith(prefix))
    }
  };
}

const base = { projectId: 'p1', subRepoRelPath: '', fromHash: null, toHash: 'abc' };

describe('GitGraphStorage repo settings', () => {
  it('returns defaults when nothing is stored or the value is not an object', async () => {
    const { kv, data } = memoryKv();
    const storage = new GitGraphStorage(kv as never);
    const defaults = await storage.getRepoSettings('p1');
    expect(defaults.pullRequestConfig).toBeDefined();
    data.set([...data.keys()][0] ?? 'x', 'not-an-object');
    const again = await storage.getRepoSettings('p1');
    expect(again.issueLinkingRules).toEqual([]);
  });

  it('replaces malformed list fields with empty arrays and merges pull request config', async () => {
    const { kv, data } = memoryKv();
    const storage = new GitGraphStorage(kv as never);
    await storage.saveRepoSettings('p1', '', {});
    const key = [...data.keys()][0];
    data.set(key, { selectedBranches: 'nope', issueLinkingRules: null, pullRequestConfig: { remoteName: 'up' } });
    const settings = await storage.getRepoSettings('p1');
    expect(settings.selectedBranches).toEqual([]);
    expect(settings.issueLinkingRules).toEqual([]);
    expect(settings.pullRequestConfig).toMatchObject({ remoteName: 'up' });
    expect(settings.pullRequestConfig.provider).toBeDefined();
  });

  it('saves a patch on top of the current settings', async () => {
    const { kv } = memoryKv();
    const storage = new GitGraphStorage(kv as never);
    const saved = await storage.saveRepoSettings('p1', 'pkg', { selectedBranches: ['main'] });
    expect(saved.selectedBranches).toEqual(['main']);
    expect((await storage.getRepoSettings('p1', 'pkg')).selectedBranches).toEqual(['main']);
  });
});

describe('GitGraphStorage code reviews', () => {
  it('starts a review once and returns the existing record on repeat calls', async () => {
    const { kv } = memoryKv();
    let clock = 1_000;
    const storage = new GitGraphStorage(kv as never, () => clock);
    const first = await storage.startCodeReview(base);
    clock = 2_000;
    const second = await storage.startCodeReview(base);
    expect(second).toEqual(first);
    expect(first.startedAt).toBe(1_000);
  });

  it('marks a file reviewed and then un-marks it', async () => {
    const { kv } = memoryKv();
    const storage = new GitGraphStorage(kv as never, () => 5);
    const reviewed = await storage.setCodeReviewFileReviewed({ ...base, filePath: 'a.ts', reviewed: true });
    expect(reviewed.reviewedFiles).toEqual(['a.ts']);
    const cleared = await storage.setCodeReviewFileReviewed({ ...base, filePath: 'a.ts', reviewed: false });
    expect(cleared.reviewedFiles).toEqual([]);
  });

  it('ends a review by deleting its record', async () => {
    const { kv, data } = memoryKv();
    const storage = new GitGraphStorage(kv as never);
    await storage.startCodeReview(base);
    expect(data.size).toBe(1);
    await storage.endCodeReview(base);
    expect(data.size).toBe(0);
  });

  it('lists the reviews of a project newest first and drops ones idle for over 90 days', async () => {
    const { kv, data } = memoryKv();
    const now = 100 * NINETY_DAYS_MS;
    const storage = new GitGraphStorage(kv as never, () => now);
    const fresh = { key: 'code-review:p1:fresh', lastActiveAt: now - 10 };
    const newer = { key: 'code-review:p1:newer', lastActiveAt: now - 5 };
    const stale = { key: 'code-review:p1:stale', lastActiveAt: now - NINETY_DAYS_MS - 1 };
    data.set(fresh.key, fresh);
    data.set(newer.key, newer);
    data.set(stale.key, stale);
    data.set('code-review:p1:missing', undefined);
    const listed = await storage.listProjectCodeReviews('p1');
    expect(listed.map((r) => r.key)).toEqual(['code-review:p1:newer', 'code-review:p1:fresh']);
    expect(data.has(stale.key)).toBe(false);
  });
});
