import { describe, expect, it, vi } from 'vitest';
import createPromptVoicePlugin from '../../server.ts';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalWhisperManager } from '../server/localWhisper/manager.ts';
import { AVAILABLE_MODELS_METHOD, LOCAL_WHISPER_METHODS, REPHRASE_METHOD, STATUS_METHOD, TRANSCRIBE_METHOD } from '../shared/protocol.ts';

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
        list: vi.fn(async () => [{ id: 'antigravity', displayName: 'Antigravity' }, { id: 'claude-code', displayName: 'Claude Code' }]),
        models: vi.fn(async ({ providerId }: { providerId: string }) => ({
          models: [{ id: `${providerId}-m1`, model: `${providerId}-model-1` }]
        }))
      }
    }
  };
  return { zcc, methods };
}

describe('createPromptVoicePlugin', () => {
  it('declares keyless defaults, optional secret API keys, and registers RPC methods', async () => {
    const { zcc, methods } = fakeZcc();
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    expect(zcc.settings.define).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: expect.objectContaining({ default: 'conversational' }),
        openaiApiKey: expect.objectContaining({ secret: true }),
        googleApiKey: expect.objectContaining({ secret: true }),
        anthropicApiKey: expect.objectContaining({ secret: true })
      })
    );
    expect([...methods.keys()].sort()).toEqual(
      [AVAILABLE_MODELS_METHOD, REPHRASE_METHOD, STATUS_METHOD, TRANSCRIBE_METHOD, ...Object.values(LOCAL_WHISPER_METHODS)].sort()
    );
  });

  it('serves status reporting available providers without requiring keys', async () => {
    const { zcc, methods } = fakeZcc();
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    const status = await methods.get(STATUS_METHOD)?.({});
    expect(status).toEqual(
      expect.objectContaining({
        sttProvider: 'system',
        sttKeyConfigured: true,
        llmProvider: 'none',
        llmKeyConfigured: true,
        availableProviders: ['antigravity', 'claude-code']
      })
    );
  });

  it('serves availableModels querying dynamic providers and models', async () => {
    const { zcc, methods } = fakeZcc();
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    const available = (await methods.get(AVAILABLE_MODELS_METHOD)?.({})) as Array<{
      providerId: string;
      displayName: string;
      models: Array<{ id: string; label: string }>;
    }>;
    expect(available).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerId: 'assistant' }),
        expect.objectContaining({
          providerId: 'antigravity',
          displayName: 'Antigravity',
          models: [expect.objectContaining({ id: 'antigravity-m1' })]
        }),
        expect.objectContaining({
          providerId: 'claude-code',
          displayName: 'Claude Code',
          models: [expect.objectContaining({ id: 'claude-code-m1' })]
        })
      ])
    );
  });

  it('dispatches rephrase RPC', async () => {
    const { zcc, methods } = fakeZcc({ llmProvider: 'none' });
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    const result = (await methods.get(REPHRASE_METHOD)?.({ text: 'sample draft' })) as { ok: boolean; text: string };
    expect(result).toEqual(expect.objectContaining({ ok: true, text: 'sample draft' }));
  });

  it('reports Local Whisper as unavailable, without throwing, when it is disabled', async () => {
    const { zcc, methods } = fakeZcc();
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    await expect(methods.get(LOCAL_WHISPER_METHODS.installRuntime)?.({})).resolves.toMatchObject({ ok: false, code: 'LOCAL_RUNTIME_FAILED', state: null });
  });

  it('serves Local Whisper state and refuses unknown models with a readable error', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pv-server-lw-'));
    try {
      const { zcc, methods } = fakeZcc();
      const manager = new LocalWhisperManager({ root, target: { platform: 'win32', arch: 'x64' }, log: zcc.log });
      await manager.init();
      const onDispose = vi.fn();
      await createPromptVoicePlugin({ ...zcc, onDispose } as never, { localWhisper: manager });
      await expect(methods.get(LOCAL_WHISPER_METHODS.state)?.({})).resolves.toMatchObject({
        ok: true,
        state: { platform: { supported: true }, runtime: { status: 'not-installed' }, activeModelId: null }
      });
      await expect(methods.get(LOCAL_WHISPER_METHODS.selectModel)?.({ modelId: '../../etc' })).resolves.toMatchObject({
        ok: false,
        message: 'Unknown Local Whisper model.'
      });
      expect(onDispose).toHaveBeenCalledTimes(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
