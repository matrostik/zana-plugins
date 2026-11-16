import { describe, expect, it, vi } from 'vitest';
import createPromptVoicePlugin, { PROMPT_STUDIO_PROJECT_TAB_ID } from '../../server.ts';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalWhisperManager } from '../server/localWhisper/manager.ts';
import {
  AVAILABLE_MODELS_METHOD,
  LOCAL_WHISPER_METHODS,
  MODELS_UPDATED_EVENT,
  REPHRASE_METHOD,
  SETTINGS_CHANGED_EVENT,
  SETTINGS_GET_METHOD,
  SETTINGS_UPDATE_METHOD,
  STATUS_METHOD,
  TRANSCRIBE_METHOD
} from '../shared/protocol.ts';

function fakeZcc(settingsValues: Record<string, unknown> = { llmProvider: 'none' }, withKvStorage = false) {
  const methods = new Map<string, (input: unknown) => unknown>();
  const projectTabRegistrations: Array<{
    tabId: string;
    evaluate(ctx: { projectId: string }): Promise<{ available: boolean; reason?: string }>;
  }> = [];
  let onChangeHandler: ((next: Record<string, unknown>) => void) | undefined;
  let currentSettings = settingsValues;
  const kvStore = new Map<string, unknown>();
  const zcc = {
    settings: {
      define: vi.fn(() => ({
        get: vi.fn(async () => currentSettings),
        onChange: vi.fn((cb: (next: Record<string, unknown>) => void) => {
          onChangeHandler = cb;
          return () => undefined;
        })
      }))
    },
    ...(withKvStorage
      ? {
          storage: {
            kv: {
              get: vi.fn(async (k: string) => kvStore.get(k)),
              set: vi.fn(async (k: string, v: unknown) => {
                kvStore.set(k, v);
              }),
              delete: vi.fn(async (k: string) => {
                kvStore.delete(k);
              })
            }
          }
        }
      : {}),
    rpc: {
      method: vi.fn((name: string, handler: (input: unknown) => unknown) => methods.set(name, handler))
    },
    ui: {
      registerProjectTabAvailability: vi.fn((reg: typeof projectTabRegistrations[number]) => {
        projectTabRegistrations.push(reg);
      })
    },
    realtime: {
      publish: vi.fn()
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
  return {
    zcc,
    methods,
    projectTabRegistrations,
    setSettings: (next: Record<string, unknown>) => { currentSettings = next; },
    triggerSettingsChange: (next: Record<string, unknown>) => { onChangeHandler?.(next); }
  };
}

describe('createPromptVoicePlugin', () => {
  it('declares keyless defaults, visibility settings, optional secret API keys, and registers RPC methods', async () => {
    const { zcc, methods } = fakeZcc();
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    expect(zcc.settings.define).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: expect.objectContaining({ default: 'conversational' }),
        showHomeWidget: expect.objectContaining({ default: true }),
        showInProjects: expect.objectContaining({ default: true }),
        micVisibility: expect.objectContaining({ default: 'both' }),
        openaiApiKey: expect.objectContaining({ secret: true }),
        googleApiKey: expect.objectContaining({ secret: true }),
        anthropicApiKey: expect.objectContaining({ secret: true })
      })
    );
    expect([...methods.keys()].sort()).toEqual(
      [AVAILABLE_MODELS_METHOD, REPHRASE_METHOD, STATUS_METHOD, TRANSCRIBE_METHOD, ...Object.values(LOCAL_WHISPER_METHODS)].sort()
    );
  });

  it('registers project tab availability gated by showInProjects and fails open on error', async () => {
    const { zcc, projectTabRegistrations, setSettings } = fakeZcc({ showInProjects: true });
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    expect(projectTabRegistrations).toHaveLength(1);
    const registration = projectTabRegistrations[0]!;
    expect(registration.tabId).toBe(PROMPT_STUDIO_PROJECT_TAB_ID);

    await expect(registration.evaluate({ projectId: 'proj-1' })).resolves.toEqual({ available: true });

    setSettings({ showInProjects: false });
    await expect(registration.evaluate({ projectId: 'proj-1' })).resolves.toEqual({
      available: false,
      reason: 'Hidden in Prompt Voice plugin settings.'
    });

    setSettings({ showInProjects: 'false' });
    await expect(registration.evaluate({ projectId: 'proj-1' })).resolves.toEqual({
      available: false,
      reason: 'Hidden in Prompt Voice plugin settings.'
    });

    const settingsInstance = zcc.settings.define.mock.results[0]?.value as { get: ReturnType<typeof vi.fn> };
    settingsInstance.get.mockRejectedValueOnce(new Error('storage offline'));
    await expect(registration.evaluate({ projectId: 'proj-1' })).resolves.toEqual({ available: true });
    expect(zcc.log.warn).toHaveBeenCalled();
  });

  it('publishes normalized visibility updates on settings.onChange', async () => {
    const { zcc, triggerSettingsChange } = fakeZcc();
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });

    triggerSettingsChange({
      showHomeWidget: false,
      showInProjects: 'true',
      micVisibility: 'projects'
    });

    expect(zcc.realtime.publish).toHaveBeenCalledWith(SETTINGS_CHANGED_EVENT, {
      showHomeWidget: false,
      showInProjects: true,
      micVisibility: 'projects'
    });
  });

  it('preserves cached host providers on non-key settings changes and updates direct models when API keys change', async () => {
    const { zcc, methods, setSettings, triggerSettingsChange } = fakeZcc({ llmProvider: 'none' }, true);
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    expect([...methods.keys()]).toEqual(expect.arrayContaining([SETTINGS_GET_METHOD, SETTINGS_UPDATE_METHOD]));

    // Initial load warms host providers once
    await methods.get(AVAILABLE_MODELS_METHOD)?.({});
    expect(zcc.sdk.providers.list).toHaveBeenCalledTimes(1);

    // Updating tone / visibility / sound cues via RPC or settings.onChange does NOT re-probe host providers
    await methods.get(SETTINGS_UPDATE_METHOD)?.({ tone: 'formal', soundCuesEnabled: false });
    triggerSettingsChange({ showHomeWidget: false, tone: 'formal' });
    await methods.get(AVAILABLE_MODELS_METHOD)?.({});
    expect(zcc.sdk.providers.list).toHaveBeenCalledTimes(1);

    // Adding an API key in host settings refreshes direct models & publishes realtime without re-probing host providers
    const withKey = { llmProvider: 'none', openaiApiKey: 'sk-new' };
    setSettings(withKey);
    triggerSettingsChange(withKey);

    await vi.waitFor(() =>
      expect(zcc.realtime.publish).toHaveBeenCalledWith(
        MODELS_UPDATED_EVENT,
        expect.arrayContaining([expect.objectContaining({ providerId: 'openai' })])
      )
    );
    expect(zcc.sdk.providers.list).toHaveBeenCalledTimes(1);
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

  it('warms availableModels at startup and supports refresh', async () => {
    const { zcc, methods } = fakeZcc();
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    // Startup warmup should already have initiated discovery before the first RPC call
    expect(zcc.sdk.providers.list).toHaveBeenCalledTimes(1);

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

    expect(zcc.sdk.providers.list).toHaveBeenCalledTimes(1);
    await methods.get(AVAILABLE_MODELS_METHOD)?.({});
    expect(zcc.sdk.providers.list).toHaveBeenCalledTimes(1);
    await methods.get(AVAILABLE_MODELS_METHOD)?.({ refresh: true });
    expect(zcc.sdk.providers.list).toHaveBeenCalledTimes(2);
  });

  it('publishes MODELS_UPDATED_EVENT when background warmup finishes a slow provider after soft wait', async () => {
    vi.useFakeTimers();
    try {
      const { zcc, methods } = fakeZcc();
      let resolveSlow!: (catalog: { models: Array<{ id: string; model: string }> }) => void;
      zcc.sdk.providers.list.mockResolvedValue([
        { id: 'antigravity', displayName: 'Antigravity' },
        { id: 'slow-acp', displayName: 'Slow ACP' }
      ]);
      zcc.sdk.providers.models.mockImplementation(({ providerId }: { providerId: string }) => {
        if (providerId === 'slow-acp') {
          return new Promise<{ models: Array<{ id: string; model: string }> }>((resolve) => {
            resolveSlow = resolve;
          });
        }
        return Promise.resolve({ models: [{ id: 'ag-1', model: 'Gemini' }] });
      });

      await createPromptVoicePlugin(zcc as never, { localWhisper: null });
      await vi.advanceTimersByTimeAsync(1500);

      const initial = (await methods.get(AVAILABLE_MODELS_METHOD)?.({})) as Array<{ providerId: string }>;
      expect(initial.map((p) => p.providerId)).toEqual(['antigravity', 'assistant']);

      resolveSlow({ models: [{ id: 'slow-1', model: 'Slow Model' }] });
      await vi.waitFor(() =>
        expect(zcc.realtime.publish).toHaveBeenCalledWith(
          MODELS_UPDATED_EVENT,
          expect.arrayContaining([expect.objectContaining({ providerId: 'slow-acp' })])
        )
      );
    } finally {
      vi.useRealTimers();
    }
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
