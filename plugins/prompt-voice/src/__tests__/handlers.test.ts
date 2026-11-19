import { describe, expect, it, vi } from 'vitest';
import {
  createAvailableModelsLoader,
  mergeCatalogModels,
  rephraseHandler,
  statusFromSettings,
  transcribeHandler
} from '../server/handlers.ts';
import type { HistoryStore } from '../server/historyStore.ts';
import { PromptVoiceError } from '../server/errors.ts';

const VALID_REQUEST = { audio: Buffer.from('audio').toString('base64'), mimeType: 'audio/webm' };
const OPENAI_STT_URL = 'https://api.openai.com/v1/audio/transcriptions';

function deps(
  raw: Record<string, unknown>,
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = async () => Response.json({ text: 'hello' })
) {
  return {
    readSettings: async () => ({ llmProvider: 'none', ...raw }),
    fetch: fetchImpl as unknown as typeof fetch,
    log: { warn: vi.fn((_message: string) => undefined), error: vi.fn((_message: string) => undefined) }
  };
}

function stubHistoryStore() {
  const record = vi.fn(() => ({ id: 'entry-1' }));
  const store = {
    record,
    coalesceDictation: vi.fn(() => ({ id: 'entry-1' })),
    coalesceRefinement: vi.fn(() => ({ id: 'entry-1' })),
    list: vi.fn(),
    getById: vi.fn(),
    setStarred: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    prune: vi.fn(),
    listProjectIds: vi.fn(() => [])
  } as unknown as HistoryStore;
  return { store, record };
}

describe('transcribeHandler', () => {
  it('skips automatic cleanup when transcription-only is requested', async () => {
    const assistant = { complete: vi.fn(async () => ({ text: 'rewritten' })) };
    const result = await transcribeHandler(
      { ...VALID_REQUEST, transcriptionOnly: true },
      { ...deps({ llmProvider: 'assistant' }), assistant }
    );
    expect(result).toEqual(expect.objectContaining({ ok: true, text: 'hello', llmProvider: 'none' }));
    expect(assistant.complete).not.toHaveBeenCalled();
  });
  it('returns a success envelope for a valid request using system STT', async () => {
    const result = await transcribeHandler(VALID_REQUEST, deps({}));
    expect(result).toEqual(expect.objectContaining({ ok: true, status: 'ok', text: 'hello' }));
  });

  it('returns a failure envelope for invalid audio without touching providers', async () => {
    const fetchImpl = vi.fn();
    const result = await transcribeHandler({ audio: '', mimeType: 'audio/webm' }, deps({}, fetchImpl));
    expect(result).toEqual({ ok: false, code: 'AUDIO_EMPTY', message: expect.any(String) });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps an explicit missing key on legacy provider to MISSING_KEY', async () => {
    const result = await transcribeHandler(VALID_REQUEST, deps({ sttProvider: 'openai', openaiApiKey: '' }));
    expect(result).toEqual(expect.objectContaining({ ok: false, code: 'MISSING_KEY' }));
  });

  it('uses the language from the request over the saved setting', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => new Response('hallo'));
    await transcribeHandler(
      { ...VALID_REQUEST, language: 'de' },
      deps({ sttProvider: 'openai', openaiApiKey: 'sk', inputLanguage: 'en' }, fetchImpl)
    );
    const body = fetchImpl.mock.calls[0]?.[1]?.body as FormData;
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(OPENAI_STT_URL);
    expect(body.get('language')).toBe('de');
  });

  it('reports provider network errors as STT_FAILED without leaking the message', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('socket hang up with internal token abc123');
    });
    const result = await transcribeHandler(VALID_REQUEST, deps({ sttProvider: 'openai', openaiApiKey: 'sk' }, fetchImpl as never));
    expect(result).toEqual(expect.objectContaining({ ok: false, code: 'STT_FAILED' }));
    expect(JSON.stringify(result)).not.toContain('abc123');
  });

  it('reports unexpected non-PromptVoiceError errors as INTERNAL without leaking the message', async () => {
    const readSettings = async () => {
      throw new Error('database exploded with secret key xyz789');
    };
    const handlerDeps = { ...deps({}), readSettings };
    const result = await transcribeHandler(VALID_REQUEST, handlerDeps);
    expect(result).toEqual({
      ok: false,
      code: 'INTERNAL',
      message: 'Dictation failed unexpectedly. See the Zana log for details.'
    });
    expect(JSON.stringify(result)).not.toContain('xyz789');
    const logged = handlerDeps.log.error.mock.calls.map(([message]) => message).join('\n');
    expect(logged).toContain('kind=unexpected');
    expect(logged).not.toContain('xyz789');
  });

  it('wraps a thrown PromptVoiceError into its envelope', async () => {
    const readSettings = async () => {
      throw new PromptVoiceError('INTERNAL', 'settings unavailable');
    };
    const result = await transcribeHandler(VALID_REQUEST, { ...deps({}), readSettings });
    expect(result).toEqual({ ok: false, code: 'INTERNAL', message: 'settings unavailable' });
  });

  it('skips saving dictation history when historyEnabled is disabled while transcription is pending', async () => {
    let historyEnabled = true;
    const { store, record } = stubHistoryStore();
    let resolveStt!: (res: Response) => void;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveStt = resolve;
        })
    );
    const handlerDeps = {
      ...deps({}, fetchImpl as never),
      readSettings: async () => ({ llmProvider: 'none', historyEnabled }),
      historyStore: store
    };

    const pending = transcribeHandler(VALID_REQUEST, handlerDeps);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    historyEnabled = false;
    resolveStt(Response.json({ text: 'private note' }));

    const result = await pending;
    expect(result).toMatchObject({ ok: true, status: 'ok', text: 'private note' });
    expect('historyEntryId' in result).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });

  it('skips saving dictation history and logs a warning if re-reading settings fails after transcription', async () => {
    let calls = 0;
    const { store, record } = stubHistoryStore();
    const handlerDeps = {
      ...deps({}),
      readSettings: async () => {
        calls++;
        if (calls === 2) throw new Error('settings store locked');
        return { llmProvider: 'none', historyEnabled: true };
      },
      historyStore: store
    };

    const result = await transcribeHandler(VALID_REQUEST, handlerDeps);
    expect(result).toMatchObject({ ok: true, status: 'ok', text: 'hello' });
    expect('historyEntryId' in result).toBe(false);
    expect(record).not.toHaveBeenCalled();
    expect(handlerDeps.log.warn).toHaveBeenCalledWith(expect.stringMatching(/skipping history save/i));
  });
});

describe('rephraseHandler', () => {
  it('skips saving refinement history when historyEnabled is disabled while rephrase is pending', async () => {
    let historyEnabled = true;
    const { store, record } = stubHistoryStore();
    let resolveComplete!: (res: { text: string }) => void;
    const assistant = {
      complete: vi.fn(
        () =>
          new Promise<{ text: string }>((resolve) => {
            resolveComplete = resolve;
          })
      )
    };
    const handlerDeps = {
      ...deps({}),
      readSettings: async () => ({ llmProvider: 'assistant', historyEnabled }),
      assistant,
      historyStore: store
    };

    const pending = rephraseHandler({ text: 'raw draft', llmProvider: 'assistant' }, handlerDeps);
    await vi.waitFor(() => expect(assistant.complete).toHaveBeenCalledTimes(1));
    historyEnabled = false;
    resolveComplete({ text: 'refined draft' });

    const result = await pending;
    expect(result).toMatchObject({ ok: true, text: 'refined draft' });
    expect('historyEntryId' in result).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });
});

describe('statusFromSettings', () => {
  it('reports active providers without requiring external keys', () => {
    const status = statusFromSettings({ sttProvider: 'system', llmProvider: 'assistant' }, ['antigravity', 'claude-code']);
    expect(status).toEqual({
      sttProvider: 'system',
      sttKeyConfigured: true,
      llmProvider: 'assistant',
      llmKeyConfigured: true,
      audioFormat: 'recorded',
      availableProviders: ['antigravity', 'claude-code']
    });
  });

  it('asks the app for WAV only when Local Whisper is the speech provider', () => {
    expect(statusFromSettings({ sttProvider: 'local-whisper', llmProvider: 'none' })).toMatchObject({ audioFormat: 'wav', sttKeyConfigured: true });
    for (const sttProvider of ['system', 'openai', 'google-gemini']) {
      expect(statusFromSettings({ sttProvider }).audioFormat).toBe('recorded');
    }
  });

  it('reports missing keys for key-based providers', () => {
    const status = statusFromSettings({ sttProvider: 'openai', llmProvider: 'anthropic' });
    expect(status).toMatchObject({ sttKeyConfigured: false, llmKeyConfigured: false });
  });

  it('reports configured keys for key-based providers', () => {
    const status = statusFromSettings({
      sttProvider: 'google-gemini',
      llmProvider: 'openai',
      googleApiKey: 'g-key',
      openaiApiKey: 'sk-key'
    });
    expect(status).toMatchObject({ sttKeyConfigured: true, llmKeyConfigured: true });
  });
});

describe('mergeCatalogModels', () => {
  it('merges models and selectedOnlyModels into unique list sorted alphabetically', () => {
    const models = mergeCatalogModels({
      models: [{ id: 'm2', model: 'Zebra Model' }, { id: 'm1', model: 'Alpha Model' }],
      selectedOnlyModels: [{ id: 'm1', model: 'Alpha Model Dup' }, { id: 'm3', model: 'Beta Model' }]
    });
    expect(models).toEqual([
      { id: 'm1', label: 'Alpha Model' },
      { id: 'm3', label: 'Beta Model' },
      { id: 'm2', label: 'Zebra Model' }
    ]);
  });

  it('handles empty or malformed catalog objects gracefully', () => {
    expect(mergeCatalogModels(null)).toEqual([]);
    expect(mergeCatalogModels({})).toEqual([]);
    expect(mergeCatalogModels({ models: [{ id: '' }] })).toEqual([]);
  });
});

describe('createAvailableModelsLoader', () => {
  it('returns assistant and discovered models from host providers', async () => {
    const loader = createAvailableModelsLoader({
      readSettings: async () => ({}),
      providers: {
        list: async () => [{ id: 'antigravity', displayName: 'Antigravity ACP' }],
        models: async () => ({
          models: [{ id: 'gemini-2.5-flash', model: 'Gemini 2.5 Flash' }]
        })
      }
    });
    const res = await loader.load();

    expect(res).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerId: 'assistant' }),
        expect.objectContaining({
          providerId: 'antigravity',
          displayName: 'Antigravity ACP',
          models: [{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }]
        })
      ])
    );
  });

  it('omits unconfigured direct providers when no API keys are present', async () => {
    const loader = createAvailableModelsLoader({
      readSettings: async () => ({}),
      providers: {
        list: async () => [],
        models: async () => ({ models: [] })
      }
    });
    const res = await loader.load();

    expect(res).toEqual([
      {
        providerId: 'assistant',
        displayName: 'Zana Assistant',
        models: [{ id: 'assistant', label: 'Default Assistant (Host Agent)' }]
      }
    ]);
  });

  it('loads host providers concurrently and excludes a timed-out provider from visible entries', async () => {
    let releaseHung!: () => void;
    const hungPromise = new Promise((resolve) => {
      releaseHung = () => resolve({ models: [] });
    });

    try {
      const loader = createAvailableModelsLoader({
        providerTimeoutMs: 20,
        providers: {
          list: async () => [
            { id: 'slow-prov', displayName: 'Slow Provider' },
            { id: 'fast-prov', displayName: 'Fast Provider' }
          ],
          models: async ({ providerId }) => {
            if (providerId === 'slow-prov') return hungPromise;
            return { models: [{ id: 'fast-1', model: 'Fast Model' }] };
          }
        }
      });
      const res = await loader.load();

      expect(res.map((p) => p.providerId)).toEqual(['fast-prov', 'assistant']);
    } finally {
      releaseHung();
    }
  });

  it('orders providers alphabetically and models from cheapest to most expensive', async () => {
    const loader = createAvailableModelsLoader({
      readSettings: async () => ({
        openaiApiKey: 'sk-test',
        anthropicApiKey: 'ak-test'
      }),
      providers: {
        list: async () => [
          { id: 'zed-ai', displayName: 'Zed AI' },
          { id: 'antigravity', displayName: 'Antigravity ACP' }
        ],
        models: async ({ providerId }: { providerId: string }) => {
          if (providerId === 'zed-ai') {
            return {
              models: [
                { id: 'z-model-2', model: 'Zed Beta' },
                { id: 'z-model-1', model: 'Zed Alpha' }
              ]
            };
          }
          return {
            models: [
              { id: 'claude-opus-4-6', model: 'Claude Opus 4.6' },
              { id: 'gemini-2.5-pro', model: 'Gemini 2.5 Pro' },
              { id: 'gemini-2.5-flash', model: 'Gemini 2.5 Flash' },
              { id: 'gemini-2.5-flash-lite', model: 'Gemini 2.5 Flash Lite' }
            ]
          };
        }
      }
    });
    const res = await loader.load();

    const displayNames = res.map((p) => p.displayName);
    const sortedDisplayNames = [...displayNames].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
    expect(displayNames).toEqual(sortedDisplayNames);

    const antigravity = res.find((p) => p.providerId === 'antigravity');
    expect(antigravity?.models.map((m) => m.label)).toEqual([
      'Gemini 2.5 Flash Lite',
      'Gemini 2.5 Flash',
      'Gemini 2.5 Pro',
      'Claude Opus 4.6'
    ]);

    const zed = res.find((p) => p.providerId === 'zed-ai');
    expect(zed?.models.map((m) => m.label)).toEqual(['Zed Alpha', 'Zed Beta']);
  });

  it('lists only configured direct providers even without host providers', async () => {
    const loader = createAvailableModelsLoader({ readSettings: async () => ({ openaiApiKey: 'key' }) });
    const result = await loader.load();
    expect(result.map((entry) => entry.providerId)).toContain('openai');
    expect(result.map((entry) => entry.providerId)).not.toContain('anthropic');
  });

  it('reuses a slow provider request across ordinary loads', async () => {
    let resolve!: (value: unknown) => void;
    const models = vi.fn(() => new Promise((done) => { resolve = done; }));
    const loader = createAvailableModelsLoader(
      { providers: { list: async () => [{ id: 'slow' }], models }, providerTimeoutMs: 1000 },
      { softWaitMs: 10 }
    );
    await loader.load();
    await loader.load();
    expect(models).toHaveBeenCalledTimes(1);
    resolve({ models: [{ id: 'model', model: 'Model' }] });
    await vi.waitFor(async () => expect((await loader.load()).some((p) => p.providerId === 'slow')).toBe(true));
  });

  it('publishes a recovered background provider', async () => {
    let clock = 0;
    let recovered = false;
    const onModelsUpdated = vi.fn();
    const models = vi.fn(({ providerId }: { providerId: string }) => {
      if (providerId === 'slow' && !recovered) return new Promise(() => undefined);
      return Promise.resolve({ models: [{ id: 'model', model: 'Model' }] });
    });
    const loader = createAvailableModelsLoader(
      { providers: { list: async () => [{ id: 'fast' }, { id: 'slow' }], models }, providerTimeoutMs: 20, onModelsUpdated },
      { softWaitMs: 5, incompleteTtlMs: 10, timeoutCooldownMs: 30, now: () => clock }
    );
    await loader.load();
    await new Promise((resolve) => setTimeout(resolve, 30));
    recovered = true;
    clock = 100;
    await loader.load();
    await vi.waitFor(() => expect(onModelsUpdated).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ providerId: 'slow' })])));
  });

  it('caches complete host catalogs and bypasses cache on refresh', async () => {
    const list = vi.fn(async () => [{ id: 'codex', displayName: 'Codex' }]);
    const models = vi.fn(async () => ({ models: [{ id: 'gpt-5', model: 'GPT-5' }] }));
    let clock = 1000;
    const loader = createAvailableModelsLoader({ providers: { list, models } }, { now: () => clock });

    await loader.load();
    await loader.load();
    expect(list).toHaveBeenCalledTimes(1);

    await loader.load({ refresh: true });
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('does not cache empty host provider list so retries discover newly ready providers', async () => {
    let ready = false;
    const list = vi.fn(async () => (ready ? [{ id: 'claude-code', displayName: 'Claude Code' }] : []));
    const models = vi.fn(async () => ({ models: [{ id: 'claude-sonnet', model: 'Claude Sonnet' }] }));
    const loader = createAvailableModelsLoader({ providers: { list, models } });

    const first = await loader.load();
    expect(first.map((p) => p.providerId)).toEqual(['assistant']);

    ready = true;
    const second = await loader.load();
    expect(second.map((p) => p.providerId)).toEqual(['claude-code', 'assistant']);
  });

  it('omits providers that have no models and uses short incomplete TTL so they can appear once ready', async () => {
    let codexReady = false;
    const list = vi.fn(async () => [
      { id: 'antigravity', displayName: 'Antigravity' },
      { id: 'codex', displayName: 'Codex' }
    ]);
    const models = vi.fn(async ({ providerId }: { providerId: string }) => {
      if (providerId === 'codex') {
        return codexReady ? { models: [{ id: 'gpt-5-codex', model: 'GPT-5 Codex' }] } : { models: [] };
      }
      return { models: [{ id: 'gemini-2.5-pro', model: 'Gemini 2.5 Pro' }] };
    });
    let clock = 1000;
    const loader = createAvailableModelsLoader(
      { providers: { list, models } },
      { now: () => clock, incompleteTtlMs: 5000, ttlMs: 300_000 }
    );

    const first = await loader.load();
    expect(first.map((p) => p.providerId)).toEqual(['antigravity', 'assistant']);

    codexReady = true;
    clock += 6000;
    const second = await loader.load();
    expect(second.map((p) => p.providerId)).toEqual(['antigravity', 'codex', 'assistant']);
  });

  it('returns ready providers at softWaitMs without blocking on a slow provider and publishes late arrivals via onModelsUpdated', async () => {
    let resolveSlow!: (catalog: unknown) => void;
    const onModelsUpdated = vi.fn();
    const list = vi.fn(async () => [
      { id: 'fast-prov', displayName: 'Fast Provider' },
      { id: 'slow-prov', displayName: 'Slow Provider' }
    ]);
    const models = vi.fn(({ providerId }: { providerId: string }) => {
      if (providerId === 'slow-prov') {
        return new Promise((resolve) => {
          resolveSlow = resolve;
        });
      }
      return Promise.resolve({ models: [{ id: 'fast-m1', model: 'Fast Model' }] });
    });

    const loader = createAvailableModelsLoader(
      { providers: { list, models }, providerTimeoutMs: 5000, onModelsUpdated },
      { softWaitMs: 25 }
    );

    const initial = await loader.load();
    expect(initial.map((p) => p.providerId)).toEqual(['fast-prov', 'assistant']);
    expect(onModelsUpdated).not.toHaveBeenCalled();

    resolveSlow({ models: [{ id: 'slow-m1', model: 'Slow Model' }] });
    await vi.waitFor(() => expect(onModelsUpdated).toHaveBeenCalledTimes(1));

    const updated = onModelsUpdated.mock.calls[0]?.[0] as Array<{ providerId: string }>;
    expect(updated.map((p) => p.providerId)).toEqual(['fast-prov', 'slow-prov', 'assistant']);

    const cached = await loader.load();
    expect(cached.map((p) => p.providerId)).toEqual(['fast-prov', 'slow-prov', 'assistant']);
  });

  it('places a timed-out provider in cooldown so subsequent loads return healthy cached providers immediately', async () => {
    let clock = 1000;
    const log = { warn: vi.fn(), error: vi.fn() };
    const list = vi.fn(async () => [
      { id: 'antigravity', displayName: 'Antigravity' },
      { id: 'hermes', displayName: 'Hermes Agent' }
    ]);
    const models = vi.fn(({ providerId }: { providerId: string }) => {
      if (providerId === 'hermes') {
        return new Promise(() => undefined);
      }
      return Promise.resolve({ models: [{ id: 'gemini-3', model: 'Gemini 3' }] });
    });

    const loader = createAvailableModelsLoader(
      { providers: { list, models }, providerTimeoutMs: 30, log },
      { softWaitMs: 15, incompleteTtlMs: 5000, timeoutCooldownMs: 60_000, now: () => clock }
    );

    const first = await loader.load();
    expect(first.map((p) => p.providerId)).toEqual(['antigravity', 'assistant']);

    // Wait for hermes timeout to settle in background
    await vi.waitFor(() => expect(log.warn).toHaveBeenCalledTimes(1));

    // Even well past incompleteTtlMs, cached antigravity is served without re-probing timed-out hermes
    clock += 20_000;
    const callsBefore = list.mock.calls.length;
    const second = await loader.load();
    expect(second.map((p) => p.providerId)).toEqual(['antigravity', 'assistant']);
    expect(list.mock.calls.length).toBe(callsBefore);
  });

  it('does not block on an unresolved providers.list() past softWaitMs and publishes when list finishes', async () => {
    let resolveList!: (list: Array<{ id: string; displayName?: string }>) => void;
    const onModelsUpdated = vi.fn();
    const list = vi.fn(
      () =>
        new Promise<Array<{ id: string; displayName?: string }>>((resolve) => {
          resolveList = resolve;
        })
    );
    const models = vi.fn(async () => ({ models: [{ id: 'ag-1', model: 'Gemini' }] }));

    const loader = createAvailableModelsLoader(
      {
        readSettings: async () => ({ openaiApiKey: 'sk-1' }),
        providers: { list, models },
        providerTimeoutMs: 5000,
        onModelsUpdated
      },
      { softWaitMs: 15 }
    );

    // First load returns assistant + configured direct provider after softWaitMs even while list() is pending
    const first = await loader.load();
    expect(first.map((p) => p.providerId)).toEqual(['openai', 'assistant']);

    // Second load reuses pending list fetch without stalling or duplicating providers.list()
    const second = await loader.load();
    expect(second.map((p) => p.providerId)).toEqual(['openai', 'assistant']);
    expect(list).toHaveBeenCalledTimes(1);

    // When list() settles in background, host provider models are fetched and published
    resolveList([{ id: 'antigravity', displayName: 'Antigravity' }]);
    await vi.waitFor(() => expect(onModelsUpdated).toHaveBeenCalledTimes(1));
    expect((onModelsUpdated.mock.calls[0]?.[0] as Array<{ providerId: string }>).map((p) => p.providerId)).toEqual([
      'antigravity',
      'openai',
      'assistant'
    ]);
  });

  it('preserves healthy cached host providers when a subsequent providers.list() fails', async () => {
    let clock = 1000;
    let shouldFail = false;
    const log = { warn: vi.fn(), error: vi.fn() };
    const list = vi.fn(async () => {
      if (shouldFail) throw new Error('daemon restarting');
      return [{ id: 'antigravity', displayName: 'Antigravity' }];
    });
    const models = vi.fn(async () => ({ models: [{ id: 'ag-1', model: 'Gemini' }] }));

    const loader = createAvailableModelsLoader(
      { providers: { list, models }, log },
      { ttlMs: 1000, now: () => clock }
    );

    const initial = await loader.load();
    expect(initial.map((p) => p.providerId)).toEqual(['antigravity', 'assistant']);

    // Expire cache and simulate transient providers.list() failure
    clock += 5000;
    shouldFail = true;
    const afterFailure = await loader.load();
    expect(afterFailure.map((p) => p.providerId)).toEqual(['antigravity', 'assistant']);
    expect(log.warn).toHaveBeenCalled();
  });

  it('refreshDirectEntries updates direct providers and publishes without clearing cached host providers', async () => {
    let apiKey = '';
    const onModelsUpdated = vi.fn();
    const list = vi.fn(async () => [{ id: 'antigravity', displayName: 'Antigravity' }]);
    const models = vi.fn(async () => ({ models: [{ id: 'ag-1', model: 'Gemini' }] }));

    const loader = createAvailableModelsLoader({
      readSettings: async () => (apiKey ? { openaiApiKey: apiKey } : {}),
      providers: { list, models },
      onModelsUpdated
    });

    const initial = await loader.load();
    expect(initial.map((p) => p.providerId)).toEqual(['antigravity', 'assistant']);

    apiKey = 'sk-added';
    await loader.refreshDirectEntries();

    expect(onModelsUpdated).toHaveBeenCalledTimes(1);
    expect((onModelsUpdated.mock.calls[0]?.[0] as Array<{ providerId: string }>).map((p) => p.providerId)).toEqual([
      'antigravity',
      'openai',
      'assistant'
    ]);
    // Host list was never re-queried
    expect(list).toHaveBeenCalledTimes(1);
  });
});
