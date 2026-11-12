import { describe, expect, it, vi } from 'vitest';
import { availableModelsHandler, mergeCatalogModels, statusFromSettings, transcribeHandler } from '../server/handlers.ts';
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
});

describe('statusFromSettings', () => {
  it('reports active providers without requiring external keys', () => {
    const status = statusFromSettings({ sttProvider: 'system', llmProvider: 'assistant' }, ['antigravity', 'claude-code']);
    expect(status).toEqual({
      sttProvider: 'system',
      sttKeyConfigured: true,
      llmProvider: 'assistant',
      llmKeyConfigured: true,
      availableProviders: ['antigravity', 'claude-code']
    });
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

describe('availableModelsHandler', () => {
  it('returns assistant and discovered models from host providers', async () => {
    const res = await availableModelsHandler({
      readSettings: async () => ({}),
      providers: {
        list: async () => [{ id: 'antigravity', displayName: 'Antigravity ACP' }],
        models: async () => ({
          models: [{ id: 'gemini-2.5-flash', model: 'Gemini 2.5 Flash' }]
        })
      }
    });

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

  it('orders providers and their models alphabetically by ABC', async () => {
    const res = await availableModelsHandler({
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
              { id: 'ag-2', model: 'Gemini 2.5 Pro' },
              { id: 'ag-1', model: 'Gemini 2.5 Flash' }
            ]
          };
        }
      }
    });

    const displayNames = res.map((p) => p.displayName);
    const sortedDisplayNames = [...displayNames].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
    expect(displayNames).toEqual(sortedDisplayNames);

    for (const prov of res) {
      const labels = prov.models.map((m) => m.label);
      const sortedLabels = [...labels].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
      );
      expect(labels).toEqual(sortedLabels);
    }
  });
});
