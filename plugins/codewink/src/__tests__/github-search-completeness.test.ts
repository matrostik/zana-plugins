import { describe, expect, it, vi } from 'vitest';
import { createTokenResolver } from '../server/github/auth.ts';
import { createGitHubClient, type FetchLike } from '../server/github/client.ts';

function makeClient(handler: (url: URL) => { total_count: number; items: Array<{ number: number }> }) {
  const tokens = createTokenResolver({
    run: async () => 'tok',
    readTokenSetting: async () => 'github.com=tok'
  });
  const fetchImpl: FetchLike = async (rawUrl) => {
    const body = handler(new URL(rawUrl));
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify(body)
    };
  };
  return createGitHubClient(tokens, fetchImpl);
}

describe('searchPullRequests completeness when slicing at maxResults', () => {
  it('marks complete=false when total results exceed maxResults even on the last fetched page', async () => {
    const client = makeClient((url) => {
      const page = Number(url.searchParams.get('page'));
      const offset = (page - 1) * 100;
      const count = page === 1 ? 100 : 80;
      return {
        total_count: 180,
        items: Array.from({ length: count }, (_, idx) => ({ number: offset + idx + 1 }))
      };
    });

    const res = await client.searchPullRequests('github.com', 'is:pr', 150);

    expect(res.items).toHaveLength(150);
    expect(res.complete).toBe(false);
  });

  it('marks complete=true when total_count matches maxResults with no discarded items', async () => {
    const client = makeClient((url) => {
      const page = Number(url.searchParams.get('page'));
      const offset = (page - 1) * 100;
      const count = page === 1 ? 100 : 50;
      return {
        total_count: 150,
        items: Array.from({ length: count }, (_, idx) => ({ number: offset + idx + 1 }))
      };
    });

    const res = await client.searchPullRequests('github.com', 'is:pr', 150);

    expect(res.items).toHaveLength(150);
    expect(res.complete).toBe(true);
  });
});
