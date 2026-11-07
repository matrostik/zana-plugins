import { describe, expect, it, vi } from 'vitest';
import createPromptVoicePlugin from '../../server.ts';
import { STATUS_METHOD, TRANSCRIBE_METHOD } from '../shared/protocol.ts';

function fakeZcc(settingsValues: Record<string, unknown> = { llmProvider: 'none' }) {
  const methods = new Map<string, (input: unknown) => unknown>();
  const zcc = {
    settings: {
      define: vi.fn(() => ({ get: async () => settingsValues, onChange: vi.fn() }))
    },
    rpc: {
      method: vi.fn((name: string, handler: (input: unknown) => unknown) => methods.set(name, handler))
    },
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    sdk: {
      assistant: {
        complete: vi.fn(async ({ prompt }: { prompt: string }) => ({ text: `refined: ${prompt}` }))
      },
      providers: {
        list: vi.fn(async () => [{ id: 'antigravity' }, { id: 'claude-code' }])
      }
    }
  };
  return { zcc, methods };
}

describe('createPromptVoicePlugin', () => {
  it('declares keyless defaults, optional secret API keys, and registers both RPC methods', async () => {
    const { zcc, methods } = fakeZcc();
    await createPromptVoicePlugin(zcc as never);
    expect(zcc.settings.define).toHaveBeenCalledWith(
      expect.objectContaining({
        sttProvider: expect.objectContaining({ default: 'system' }),
        llmProvider: expect.objectContaining({ default: 'assistant' }),
        openaiApiKey: expect.objectContaining({ secret: true }),
        googleApiKey: expect.objectContaining({ secret: true }),
        anthropicApiKey: expect.objectContaining({ secret: true })
      })
    );
    expect([...methods.keys()].sort()).toEqual([STATUS_METHOD, TRANSCRIBE_METHOD].sort());
  });

  it('serves status reporting available providers without requiring keys', async () => {
    const { zcc, methods } = fakeZcc();
    await createPromptVoicePlugin(zcc as never);
    const status = await methods.get(STATUS_METHOD)?.({});
    expect(status).toEqual(
      expect.objectContaining({
        sttProvider: 'system',
        sttKeyConfigured: true,
        availableProviders: ['antigravity', 'claude-code']
      })
    );
  });

  it('logs a provider-list failure and still serves status', async () => {
    const { zcc, methods } = fakeZcc();
    zcc.sdk.providers.list.mockRejectedValueOnce(new Error('host down'));
    await createPromptVoicePlugin(zcc as never);
    const status = await methods.get(STATUS_METHOD)?.({});
    expect(status).toEqual(expect.objectContaining({ availableProviders: [] }));
    expect(zcc.log.warn).toHaveBeenCalledWith(expect.stringContaining('Provider list unavailable'));
  });

  it('fails status with a safe message when settings cannot be read', async () => {
    const { zcc, methods } = fakeZcc();
    zcc.settings.define.mockReturnValueOnce({
      get: async () => {
        throw new Error('settings store secret abc123');
      },
      onChange: vi.fn()
    });
    await createPromptVoicePlugin(zcc as never);
    await expect(methods.get(STATUS_METHOD)?.({})).rejects.toThrow(
      'Prompt Voice status is unavailable. See the Zana log for details.'
    );
    expect(JSON.stringify(zcc.log.error.mock.calls)).not.toContain('abc123');
  });

  it('routes transcribe requests through the injected fetch', async () => {
    const { zcc, methods } = fakeZcc({ llmProvider: 'none' });
    const fetchImpl = vi.fn(async () => Response.json({ text: 'dictated text' }));
    await createPromptVoicePlugin(zcc as never, { fetch: fetchImpl as unknown as typeof fetch });
    const result = await methods.get(TRANSCRIBE_METHOD)?.({
      audio: Buffer.from('audio').toString('base64'),
      mimeType: 'audio/webm'
    });
    expect(result).toEqual(expect.objectContaining({ ok: true, text: 'dictated text' }));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('uses Zana assistant for cleanup when configured', async () => {
    const { zcc, methods } = fakeZcc({ llmProvider: 'assistant' });
    const fetchImpl = vi.fn(async () => Response.json({ text: 'raw words' }));
    await createPromptVoicePlugin(zcc as never, { fetch: fetchImpl as unknown as typeof fetch });
    const result = await methods.get(TRANSCRIBE_METHOD)?.({
      audio: Buffer.from('audio').toString('base64'),
      mimeType: 'audio/webm'
    });
    expect(result).toEqual(expect.objectContaining({ ok: true, text: expect.stringContaining('raw words') }));
    expect(zcc.sdk.assistant.complete).toHaveBeenCalled();
  });
});
