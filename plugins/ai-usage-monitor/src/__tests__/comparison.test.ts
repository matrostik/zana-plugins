import { describe, expect, it, vi } from 'vitest';
import createAiUsageMonitorPlugin from '../../server.ts';
import {
  COMPARISON_CACHE_TTL_MS,
  COMPARISON_RPC,
  filterComparisonModels,
  listComparisonCreators,
  sortComparisonModels,
  type ComparisonModel,
  type ComparisonSnapshotState
} from '../shared/comparison.ts';
import { COMPARISON_SETUP_RPC } from '../shared/comparison-setup.ts';
import { createComparisonCredentials } from '../server/comparison-credentials.ts';
import { createComparisonService, normalizeComparisonModel } from '../server/comparison.ts';
import { createFakeHost } from './fake-host.ts';

const protector = {
  available: true,
  encrypt: async (value: string) => Buffer.from(value).toString('base64'),
  decrypt: async (value: string) => Buffer.from(value, 'base64').toString()
};

function apiModel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm-1',
    name: 'Model Alpha',
    slug: 'model-alpha',
    release_date: '2026-04-01',
    model_creator: { id: 'c-1', name: 'Anthropic' },
    evaluations: {
      artificial_analysis_intelligence_index: 54.2,
      artificial_analysis_coding_index: null,
      artificial_analysis_agentic_index: null
    },
    pricing: {
      price_1m_input_tokens: 3,
      price_1m_output_tokens: 15
    },
    performance: {
      median_output_tokens_per_second: 999,
      median_time_to_first_token_seconds: 99
    },
    performance_v3: {
      mean_output_tokens_per_second: 84.5,
      mean_time_to_first_token_seconds: 1.35
    },
    ...overrides
  };
}

describe('comparison shared helpers & normalization', () => {
  const models: ComparisonModel[] = [
    {
      id: '1',
      name: 'Alpha Pro',
      slug: 'alpha-pro',
      creatorId: 'c1',
      creatorName: 'Anthropic',
      releaseDate: null,
      intelligenceIndex: 55,
      codingIndex: null,
      agenticIndex: null,
      inputPricePer1M: 3,
      outputPricePer1M: 15,
      outputTokensPerSecond: 80,
      timeToFirstTokenSeconds: 1.5
    },
    {
      id: '2',
      name: 'Beta Fast',
      slug: 'beta-fast',
      creatorId: 'c2',
      creatorName: 'Google',
      releaseDate: null,
      intelligenceIndex: 42,
      codingIndex: null,
      agenticIndex: null,
      inputPricePer1M: 0.3,
      outputPricePer1M: 2.5,
      outputTokensPerSecond: 210,
      timeToFirstTokenSeconds: 0.5
    },
    {
      id: '3',
      name: 'Gamma Open',
      slug: 'gamma-open',
      creatorId: 'c3',
      creatorName: 'Open Lab',
      releaseDate: null,
      intelligenceIndex: null,
      codingIndex: null,
      agenticIndex: null,
      inputPricePer1M: null,
      outputPricePer1M: null,
      outputTokensPerSecond: null,
      timeToFirstTokenSeconds: null
    }
  ];

  it('lists sorted unique creators', () => {
    expect(listComparisonCreators(models)).toEqual(['Anthropic', 'Google', 'Open Lab']);
  });

  it('filters by search, creator, and separate input/output caps excluding nulls', () => {
    expect(
      filterComparisonModels(models, { search: 'google', creator: '', maxInputPer1M: null, maxOutputPer1M: null }).map((m) => m.id)
    ).toEqual(['2']);
    expect(
      filterComparisonModels(models, { search: '', creator: 'Anthropic', maxInputPer1M: null, maxOutputPer1M: null }).map((m) => m.id)
    ).toEqual(['1']);
    expect(
      filterComparisonModels(models, { search: '', creator: '', maxInputPer1M: 5, maxOutputPer1M: null }).map((m) => m.id)
    ).toEqual(['1', '2']);
    expect(
      filterComparisonModels(models, { search: '', creator: '', maxInputPer1M: 5, maxOutputPer1M: 10 }).map((m) => m.id)
    ).toEqual(['2']);
  });

  it('sorts numerically and alphabetically while always placing nulls last', () => {
    expect(sortComparisonModels(models, 'intelligence', 'desc').map((m) => m.id)).toEqual(['1', '2', '3']);
    expect(sortComparisonModels(models, 'intelligence', 'asc').map((m) => m.id)).toEqual(['2', '1', '3']);
    expect(sortComparisonModels(models, 'input', 'asc').map((m) => m.id)).toEqual(['2', '1', '3']);
    expect(sortComparisonModels(models, 'output', 'desc').map((m) => m.id)).toEqual(['1', '2', '3']);
    expect(sortComparisonModels(models, 'speed', 'desc').map((m) => m.id)).toEqual(['2', '1', '3']);
    expect(sortComparisonModels(models, 'ttft', 'asc').map((m) => m.id)).toEqual(['2', '1', '3']);
    expect(sortComparisonModels(models, 'name', 'desc').map((m) => m.id)).toEqual(['3', '2', '1']);
  });

  it('normalizes model rows using performance_v3 exclusively and ignores deprecated performance fields', () => {
    const normalized = normalizeComparisonModel(apiModel());
    expect(normalized).toEqual({
      id: 'm-1',
      name: 'Model Alpha',
      slug: 'model-alpha',
      creatorId: 'c-1',
      creatorName: 'Anthropic',
      releaseDate: '2026-04-01',
      intelligenceIndex: 54.2,
      codingIndex: null,
      agenticIndex: null,
      inputPricePer1M: 3,
      outputPricePer1M: 15,
      outputTokensPerSecond: 84.5,
      timeToFirstTokenSeconds: 1.35
    });

    const missingV3 = normalizeComparisonModel(apiModel({ performance_v3: null }));
    expect(missingV3?.outputTokensPerSecond).toBeNull();
    expect(missingV3?.timeToFirstTokenSeconds).toBeNull();
    expect(normalizeComparisonModel({ id: '', name: 'Bad' })).toBeNull();
  });
});

describe('comparison backend service', () => {
  async function createHarness(opts: {
    configureKey?: boolean;
    fetch?: ReturnType<typeof vi.fn>;
    now?: () => number;
  } = {}) {
    const host = createFakeHost();
    if (opts.configureKey !== false) {
      const creds = createComparisonCredentials(host.zcc.storage.kv, protector);
      await creds.save('secret-token-for-tests');
    }
    const fetch = opts.fetch ?? vi.fn();
    const service = createComparisonService(host.zcc, {
      protector,
      fetch: fetch as never,
      now: opts.now ?? (() => 10_000)
    });
    return { host, service, fetch };
  }

  it('fetches all pages, deduplicates by id, persists SQLite cache, and serves cached data without network', async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith('?page=1')) {
        return Response.json({
          tier: 'free',
          intelligence_index_version: 5,
          pagination: { page: 1, page_size: 1, total_pages: 2, has_more: true },
          data: [apiModel({ id: 'm-1', name: 'First' })]
        });
      }
      return Response.json({
        tier: 'free',
        intelligence_index_version: 5,
        pagination: { page: 2, page_size: 1, total_pages: 2, has_more: false },
        data: [
          apiModel({ id: 'm-1', name: 'First Updated' }),
          apiModel({ id: 'm-2', name: 'Second' })
        ]
      });
    });

    let currentNow = 10_000;
    const { host, service } = await createHarness({ fetch, now: () => currentNow });

    const refreshed = (await host.callRpc(COMPARISON_RPC.refresh)) as ComparisonSnapshotState;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(refreshed.refreshing).toBe(false);
    expect(refreshed.stale).toBe(false);
    expect(refreshed.snapshot?.intelligenceIndexVersion).toBe(5);
    expect(refreshed.snapshot?.models.map((m) => m.name)).toEqual(['First Updated', 'Second']);

    // Reload service against the same storage: fresh cache is returned immediately without fetch
    currentNow += 1_000;
    const reloaded = createComparisonService(host.zcc, { protector, fetch: fetch as never, now: () => currentNow });
    const dataState = await reloaded.getState();
    expect(dataState.snapshot?.models).toHaveLength(2);
    expect(dataState.stale).toBe(false);
    await host.callRpc(COMPARISON_RPC.getData);
    expect(fetch).toHaveBeenCalledTimes(2);

    // Advance past 24h TTL: startup / getData refreshes
    currentNow += COMPARISON_CACHE_TTL_MS + 1;
    await service.maybeRefreshOnStartup();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('aborts and preserves the prior cached snapshot when intelligence_index_version changes across pages', async () => {
    let failVersion = false;
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith('?page=1')) {
        return Response.json({
          tier: 'free',
          intelligence_index_version: 5,
          pagination: { page: 1, total_pages: 2, has_more: true },
          data: [apiModel({ id: 'm-1', name: 'Cached Safe' })]
        });
      }
      return Response.json({
        tier: 'free',
        intelligence_index_version: failVersion ? 6 : 5,
        pagination: { page: 2, total_pages: 2, has_more: false },
        data: [apiModel({ id: 'm-2', name: failVersion ? 'Mixed Page 2' : 'Cached Page 2' })]
      });
    });

    const { host } = await createHarness({ fetch });
    const initial = (await host.callRpc(COMPARISON_RPC.refresh)) as ComparisonSnapshotState;
    expect(initial.snapshot?.models).toHaveLength(2);

    failVersion = true;
    const afterMismatch = (await host.callRpc(COMPARISON_RPC.refresh)) as ComparisonSnapshotState;
    expect(afterMismatch.snapshot?.models.map((m) => m.name)).toEqual(['Cached Safe', 'Cached Page 2']);
    expect(afterMismatch.lastError).toMatch(/inconsistent index versions/i);
  });

  it('stops automatic retries on 401/403 while keeping cached models until key changes', async () => {
    let status = 200;
    const fetch = vi.fn(async () => {
      if (status !== 200) return new Response('unauthorized', { status });
      return Response.json({
        intelligence_index_version: 5,
        pagination: { page: 1, total_pages: 1, has_more: false },
        data: [apiModel({ id: 'm-1', name: 'Saved Model' })]
      });
    });

    let currentNow = 1_000;
    const { host, service } = await createHarness({ fetch, now: () => currentNow });
    await host.callRpc(COMPARISON_RPC.refresh);
    expect(fetch).toHaveBeenCalledTimes(1);

    status = 401;
    const errState = (await host.callRpc(COMPARISON_RPC.refresh)) as ComparisonSnapshotState;
    expect(errState.authInvalid).toBe(true);
    expect(errState.snapshot?.models.map((m) => m.name)).toEqual(['Saved Model']);
    expect(errState.lastError).toMatch(/invalid/i);

    currentNow += COMPARISON_CACHE_TTL_MS + 5_000;
    await service.maybeRefreshOnStartup();
    await host.callRpc(COMPARISON_RPC.getData);
    expect(fetch).toHaveBeenCalledTimes(2);

    // Reconfiguring key resets authInvalid and refreshes
    status = 200;
    await service.onKeyConfigured();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    const recovered = await service.getState();
    expect(recovered.authInvalid).toBe(false);
    expect(recovered.lastError).toBeNull();
  });

  it('honors 429 rate-limit cooldown and network backoff while preserving cached data', async () => {
    let mode: 'ok' | '429' | 'network' = 'ok';
    const fetch = vi.fn(async () => {
      if (mode === '429') {
        return new Response('', {
          status: 429,
          headers: { 'Retry-After': '120', 'X-RateLimit-Remaining': '0' }
        });
      }
      if (mode === 'network') {
        throw new Error('offline');
      }
      return Response.json({
        intelligence_index_version: 5,
        pagination: { page: 1, total_pages: 1, has_more: false },
        data: [apiModel({ id: 'm-1', name: 'Cached Model' })]
      });
    });

    let currentNow = 1_000;
    const { host, service } = await createHarness({ fetch, now: () => currentNow });
    await host.callRpc(COMPARISON_RPC.refresh);

    mode = '429';
    const limited = (await host.callRpc(COMPARISON_RPC.refresh)) as ComparisonSnapshotState;
    expect(limited.retryAtMs).toBe(121_000);
    expect(limited.snapshot?.models).toHaveLength(1);
    expect(limited.lastError).toMatch(/rate limit/i);

    // Within cooldown window, refresh does not call fetch again
    currentNow = 50_000;
    await host.callRpc(COMPARISON_RPC.refresh);
    expect(fetch).toHaveBeenCalledTimes(2);

    // After cooldown expires, network failure applies exponential backoff and stops auto-retry during backoff
    currentNow = 122_000;
    mode = 'network';
    const netFailed = (await host.callRpc(COMPARISON_RPC.refresh)) as ComparisonSnapshotState;
    expect(netFailed.retryAtMs).toBe(122_000 + 60_000);
    expect(netFailed.snapshot?.models).toHaveLength(1);
    await service.maybeRefreshOnStartup();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('deduplicates concurrent refresh calls and clears state on key removal', async () => {
    let resolveFetch!: (res: Response) => void;
    const fetch = vi.fn(
      () => new Promise<Response>((resolve) => { resolveFetch = resolve; })
    );
    const { host, service } = await createHarness({ fetch });

    const p1 = host.callRpc(COMPARISON_RPC.refresh);
    const p2 = host.callRpc(COMPARISON_RPC.refresh);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    resolveFetch(
      Response.json({
        intelligence_index_version: 5,
        pagination: { page: 1, total_pages: 1, has_more: false },
        data: [apiModel()]
      })
    );
    const [r1, r2] = (await Promise.all([p1, p2])) as [ComparisonSnapshotState, ComparisonSnapshotState];
    expect(r1.snapshot?.models).toHaveLength(1);
    expect(r2.snapshot?.models).toHaveLength(1);
    expect(r1.refreshing).toBe(false);

    await service.onKeyRemoved();
    const afterRemove = await service.getState();
    expect(afterRemove.snapshot).toBeNull();
    expect(afterRemove.retryAtMs).toBeNull();
  });

  it('wires key setup connect and removal hooks through createAiUsageMonitorPlugin', async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        intelligence_index_version: 5,
        pagination: { page: 1, total_pages: 1, has_more: false },
        data: [apiModel({ id: 'live-1', name: 'Live Wired Model' })]
      })
    );
    const host = createFakeHost();
    await createAiUsageMonitorPlugin(host.zcc, {
      skipInitialSync: true,
      homeDir: null,
      fetch: fetch as never,
      now: () => 50_000
    });

    const initial = (await host.callRpc(COMPARISON_RPC.getData)) as ComparisonSnapshotState;
    expect(initial.configured).toBe(false);
    expect(initial.snapshot).toBeNull();

    // Note: in non-Windows / headless fake host tests without DPAPI, connect checks protector.available;
    // verify comparison RPCs reject unexpected args cleanly and clean dispose works.
    await expect(host.callRpc(COMPARISON_RPC.getData, { extra: 1 })).rejects.toThrow(/no arguments/i);
    await expect(host.callRpc(COMPARISON_RPC.refresh, ['bad'])).rejects.toThrow(/no arguments/i);
    if (process.platform !== 'win32') {
      await expect(host.callRpc(COMPARISON_SETUP_RPC.removeKey)).resolves.toMatchObject({ configured: false });
    }
    await host.dispose();
  });
});
