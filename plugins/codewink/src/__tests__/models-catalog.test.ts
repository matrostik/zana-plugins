import { describe, expect, it, vi } from 'vitest';
import { createProviderCatalogLoader } from '../server/models-catalog.ts';

describe('createProviderCatalogLoader', () => {
  it('caches complete provider catalogs, dedupes concurrent calls, and supports force refresh', async () => {
    let time = 1_000;
    let modelCalls = 0;
    const loader = createProviderCatalogLoader({
      listProviders: async () => [
        { id: 'codex', available: true, displayName: 'Codex', capabilities: { permissionModes: ['read-only', 'full'] } },
        { id: 'disabled', available: false, displayName: 'Disabled' }
      ],
      loadProviderModels: async () => {
        modelCalls++;
        return {
          models: [{ id: 'gpt-5', model: 'GPT-5', supportedReasoningEfforts: [{ reasoningEffort: 'high' }] }],
          selectedOnlyModels: [{ id: 'gpt-5-mini', model: 'GPT-5 Mini', supportedReasoningEfforts: [] }],
          modelLoadError: null
        };
      },
      ttlMs: 60_000,
      now: () => time
    });

    const [a, b] = await Promise.all([loader.load(), loader.load()]);
    expect(modelCalls).toBe(1);
    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
    expect(a[0].models.map((m) => m.id)).toEqual(['gpt-5', 'gpt-5-mini']);

    // Cache hit within TTL
    const c = await loader.load();
    expect(modelCalls).toBe(1);
    expect(c).toEqual(a);

    // Explicit refresh bypasses cache
    await loader.load({ refresh: true });
    expect(modelCalls).toBe(2);

    // Expired cache reloads
    time += 61_000;
    await loader.load();
    expect(modelCalls).toBe(3);

    // Invalidate drops cache
    loader.invalidate();
    await loader.load();
    expect(modelCalls).toBe(4);
    loader.dispose();
  });

  it('prevents a slower in-flight fetch from overwriting a newer refresh in cache', async () => {
    let releaseFirst!: () => void;
    let call = 0;
    const loader = createProviderCatalogLoader({
      listProviders: async () => [{ id: 'codex', available: true, displayName: 'Codex' }],
      loadProviderModels: async () => {
        call++;
        if (call === 1) {
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          });
          return { models: [{ id: 'stale-model', model: 'Stale', supportedReasoningEfforts: [] }] };
        }
        return { models: [{ id: 'fresh-model', model: 'Fresh', supportedReasoningEfforts: [] }] };
      }
    });

    const firstPromise = loader.load();
    await Promise.resolve();
    const refreshed = await loader.load({ refresh: true });
    expect(refreshed[0].models.map((m) => m.id)).toEqual(['fresh-model']);

    releaseFirst();
    await firstPromise;

    const cached = await loader.load();
    expect(cached[0].models.map((m) => m.id)).toEqual(['fresh-model']);
    loader.dispose();
  });

  it('caches rejected provider loads or modelLoadError responses only for the short error TTL', async () => {
    let mode: 'reject' | 'load-error' | 'ok' = 'reject';
    let clock = 1_000;
    const loadProviderModels = vi.fn(async () => {
      if (mode === 'reject') throw new Error('network error');
      if (mode === 'load-error') return { models: [], modelLoadError: { code: 'AUTH', detail: 'Token expired' } };
      return { models: [{ id: 'm1', model: 'M1', supportedReasoningEfforts: [] }], modelLoadError: null };
    });
    const loader = createProviderCatalogLoader({
      listProviders: async () => [{ id: 'codex', available: true, displayName: 'Codex' }],
      loadProviderModels,
      ttlMs: 60_000,
      errorTtlMs: 5_000,
      now: () => clock
    });

    const first = await loader.load();
    expect(first[0]).toMatchObject({ error: 'network error', models: [], timedOut: false });

    // Within the error TTL the failed result is reused instead of reloading every provider.
    mode = 'load-error';
    expect(await loader.load()).toBe(first);
    expect(loadProviderModels).toHaveBeenCalledTimes(1);

    clock += 5_000;
    const second = await loader.load();
    expect(loadProviderModels).toHaveBeenCalledTimes(2);
    expect(second[0]).toMatchObject({ error: 'Token expired', models: [], timedOut: false });

    mode = 'ok';
    clock += 5_000;
    const third = await loader.load();
    expect(loadProviderModels).toHaveBeenCalledTimes(3);
    expect(third[0]).toMatchObject({ error: null, models: [{ id: 'm1', label: 'M1', reasoningLevels: [] }] });

    // Once complete, subsequent calls hit the cache for the full TTL
    clock += 30_000;
    await loader.load();
    expect(loadProviderModels).toHaveBeenCalledTimes(3);
    loader.dispose();
  });

  it('times out slow providers without caching incomplete results', async () => {
    vi.useFakeTimers();
    try {
      let slow = true;
      const loadProviderModels = vi.fn(async (providerId: string) => {
        if (providerId === 'slow' && slow) return await new Promise<never>(() => {});
        return { models: [{ id: 'm1', model: 'M1', supportedReasoningEfforts: [] }] };
      });
      const loader = createProviderCatalogLoader({
        listProviders: async () => [
          { id: 'fast', available: true, displayName: 'Fast' },
          { id: 'slow', available: true, displayName: 'Slow' }
        ],
        loadProviderModels,
        providerTimeoutMs: 100,
        errorTtlMs: 0
      });

      const firstPromise = loader.load();
      await vi.advanceTimersByTimeAsync(110);
      const first = await firstPromise;

      expect(first.find((p) => p.providerId === 'fast')?.models).toHaveLength(1);
      expect(first.find((p) => p.providerId === 'slow')).toMatchObject({ timedOut: true, error: expect.stringMatching(/Timed out/) });

      // With no error TTL, incomplete results are retried on the next load
      slow = false;
      const second = await loader.load();
      expect(second.find((p) => p.providerId === 'slow')).toMatchObject({ timedOut: false, error: null, models: [{ id: 'm1', label: 'M1', reasoningLevels: [] }] });
      loader.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
