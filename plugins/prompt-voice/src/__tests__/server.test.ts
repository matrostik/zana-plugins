import { describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import type { PluginDatabase } from '@zana-ai/zcc-plugin-sdk/server';
import createPromptVoicePlugin, { PROMPT_STUDIO_PROJECT_TAB_ID } from '../../server.ts';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { HistoryStore } from '../server/historyStore.ts';
import { LocalWhisperManager } from '../server/localWhisper/manager.ts';
import {
  AVAILABLE_MODELS_METHOD,
  HISTORY_CHANGED_EVENT,
  HISTORY_CLEAR_METHOD,
  HISTORY_DELETE_METHOD,
  HISTORY_LIST_METHOD,
  HISTORY_PROJECTS_METHOD,
  HISTORY_STAR_METHOD,
  LOCAL_WHISPER_METHODS,
  MODELS_UPDATED_EVENT,
  REPHRASE_METHOD,
  SETTINGS_CHANGED_EVENT,
  SETTINGS_GET_METHOD,
  SETTINGS_UPDATE_METHOD,
  STATUS_METHOD,
  TRANSCRIBE_METHOD,
  type HistoryListResponse
} from '../shared/protocol.ts';

function createInMemoryPluginDb(): PluginDatabase {
  const sqlite = new DatabaseSync(':memory:');
  return {
    runScript(sql: string) {
      sqlite.exec(sql);
    },
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      return {
        all(...params: unknown[]) {
          return stmt.all(...(params as never[])) as unknown[];
        },
        get(...params: unknown[]) {
          return stmt.get(...(params as never[])) as unknown;
        },
        run(...params: unknown[]) {
          const res = stmt.run(...(params as never[]));
          return { changes: Number(res.changes ?? 0) };
        }
      };
    },
    migrate(statements: readonly string[]) {
      for (const sql of statements) sqlite.exec(sql);
    },
    transaction<T>(fn: () => T): T {
      sqlite.exec('BEGIN');
      try {
        const result = fn();
        sqlite.exec('COMMIT');
        return result;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    }
  };
}

function fakeZcc(
  settingsValues: Record<string, unknown> = { llmProvider: 'none' },
  withKvStorage = false,
  options: { withDb?: boolean; db?: PluginDatabase } = {}
) {
  const methods = new Map<string, (input: unknown) => unknown>();
  const projectTabRegistrations: Array<{
    tabId: string;
    evaluate(ctx: { projectId: string }): Promise<{ available: boolean; reason?: string }>;
  }> = [];
  let onChangeHandler: ((next: Record<string, unknown>) => void) | undefined;
  let currentSettings = settingsValues;
  const kvStore = new Map<string, unknown>();
  const pluginDb = options.db ?? (options.withDb ? createInMemoryPluginDb() : undefined);
  const storageObj: Record<string, unknown> = {};
  if (withKvStorage) {
    storageObj.kv = {
      get: vi.fn(async (k: string) => kvStore.get(k)),
      set: vi.fn(async (k: string, v: unknown) => {
        kvStore.set(k, v);
      }),
      delete: vi.fn(async (k: string) => {
        kvStore.delete(k);
      })
    };
  }
  if (pluginDb) {
    storageObj.database = vi.fn(() => pluginDb);
  }
  const hasStorage = Object.keys(storageObj).length > 0;

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
    ...(hasStorage ? { storage: storageObj } : {}),
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
      projects: {
        list: vi.fn(async () => [
          { id: 'proj-alpha', name: 'Alpha Workspace' },
          { id: 'proj-beta', name: 'Beta App' }
        ])
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
        tone: expect.objectContaining({ default: 'standard' }),
        showHomeWidget: expect.objectContaining({ default: true }),
        showInProjects: expect.objectContaining({ default: true }),
        micVisibility: expect.objectContaining({ default: 'both' }),
        openaiApiKey: expect.objectContaining({ secret: true }),
        googleApiKey: expect.objectContaining({ secret: true }),
        anthropicApiKey: expect.objectContaining({ secret: true })
      })
    );
    expect([...methods.keys()].sort()).toEqual(
      [
        AVAILABLE_MODELS_METHOD,
        HISTORY_CLEAR_METHOD,
        HISTORY_DELETE_METHOD,
        HISTORY_LIST_METHOD,
        HISTORY_PROJECTS_METHOD,
        HISTORY_STAR_METHOD,
        REPHRASE_METHOD,
        STATUS_METHOD,
        TRANSCRIBE_METHOD,
        ...Object.values(LOCAL_WHISPER_METHODS)
      ].sort()
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

  it('records successful dictations and refinements in SQLite history, skips no-speech/errors, and resolves projects', async () => {
    const transcripts = ['um ship the history view', 'um ship the history view', '   '];
    const fetchStub = vi.fn(async () => {
      const next = transcripts.shift() ?? '';
      return {
        ok: true,
        status: 200,
        json: async () => ({ text: next }),
        text: async () => next
      };
    });
    vi.stubGlobal('fetch', fetchStub);
    try {
      const { zcc, methods } = fakeZcc(
        { sttProvider: 'openai', openaiApiKey: 'sk-test', llmProvider: 'assistant' },
        true,
        { withDb: true }
      );
      zcc.sdk.assistant.complete.mockResolvedValue({ text: 'Ship the history view.' });
      await createPromptVoicePlugin(zcc as never, { localWhisper: null });

      // 1. Composer dictation with cleanup
      const dictationRes = await methods.get(TRANSCRIBE_METHOD)?.({
        audio: Buffer.from('fake-audio').toString('base64'),
        mimeType: 'audio/webm',
        source: 'composer',
        projectId: 'proj-alpha',
        threadId: 'thread-77',
        audioDurationMs: 2400
      });
      expect(dictationRes).toMatchObject({ ok: true, status: 'ok', text: 'Ship the history view.' });

      // 2. Cleanup fallback notice is still recorded
      zcc.sdk.assistant.complete.mockRejectedValueOnce(new Error('assistant temporarily unavailable'));
      const fallbackRes = await methods.get(TRANSCRIBE_METHOD)?.({
        audio: Buffer.from('fake-audio-2').toString('base64'),
        mimeType: 'audio/webm',
        source: 'home',
        projectId: 'proj-beta'
      });
      expect(fallbackRes).toMatchObject({
        ok: true,
        status: 'ok',
        text: 'um ship the history view',
        refineNotice: expect.objectContaining({ code: 'LLM_FAILED' })
      });

      // 3. No-speech transcript is skipped
      const noSpeechRes = await methods.get(TRANSCRIBE_METHOD)?.({
        audio: Buffer.from('silence').toString('base64'),
        mimeType: 'audio/webm',
        source: 'studio'
      });
      expect(noSpeechRes).toMatchObject({ ok: true, status: 'no-speech' });

      // 4. Studio refinement recorded with preset/tone/language/customPrompt
      zcc.sdk.assistant.complete.mockResolvedValueOnce({ text: 'Envía la vista de historial.' });
      const refineRes = await methods.get(REPHRASE_METHOD)?.({
        text: 'Ship the history view.',
        source: 'studio',
        projectId: 'proj-alpha',
        threadId: 'thread-88',
        presetId: 'translate',
        tone: 'standard',
        targetLanguage: 'es',
        customPrompt: 'Keep concise',
        llmProvider: 'assistant'
      });
      expect(refineRes).toMatchObject({ ok: true, text: 'Envía la vista de historial.' });

      // 5. Hard error on rephrase (empty text) is skipped
      await methods.get(REPHRASE_METHOD)?.({ text: '   ', source: 'studio' });

      const list = (await methods.get(HISTORY_LIST_METHOD)?.({})) as HistoryListResponse;
      expect(list.storageAvailable).toBe(true);
      expect(list.historyEnabled).toBe(true);
      expect(list.total).toBe(3);
      expect(list.entries[0]).toMatchObject({
        kind: 'refinement',
        source: 'studio',
        projectId: 'proj-alpha',
        threadId: 'thread-88',
        presetId: 'translate',
        targetLanguage: 'es',
        customPrompt: 'Keep concise',
        outputText: 'Envía la vista de historial.'
      });
      expect(list.entries[1]).toMatchObject({
        kind: 'dictation',
        source: 'home',
        projectId: 'proj-beta',
        refineNotice: expect.objectContaining({ code: 'LLM_FAILED' })
      });
      expect(list.entries[2]).toMatchObject({
        kind: 'dictation_cleanup',
        source: 'composer',
        projectId: 'proj-alpha',
        threadId: 'thread-77',
        audioDurationMs: 2400,
        rawText: 'um ship the history view',
        outputText: 'Ship the history view.'
      });

      // Projects RPC resolves display names from zcc.sdk.projects.list()
      const projects = await methods.get(HISTORY_PROJECTS_METHOD)?.({});
      expect(projects).toEqual({
        projects: [
          { id: 'proj-alpha', name: 'Alpha Workspace' },
          { id: 'proj-beta', name: 'Beta App' }
        ]
      });

      // Star, delete, and scoped clear with starred protection
      const newestId = list.entries[0]!.id;
      const composerId = list.entries[2]!.id;
      expect(await methods.get(HISTORY_STAR_METHOD)?.({ id: newestId, starred: true })).toMatchObject({
        ok: true,
        entry: { id: newestId, starred: true }
      });
      expect(await methods.get(HISTORY_CLEAR_METHOD)?.({ projectId: 'proj-alpha', includeStarred: false })).toEqual({
        ok: true,
        deletedCount: 1
      });
      const afterScopedClear = (await methods.get(HISTORY_LIST_METHOD)?.({})) as HistoryListResponse;
      expect(afterScopedClear.entries.map((e) => e.id)).not.toContain(composerId);
      expect(afterScopedClear.entries.map((e) => e.id)).toContain(newestId);

      expect(await methods.get(HISTORY_DELETE_METHOD)?.({ id: newestId })).toEqual({
        ok: true,
        deleted: true
      });
      expect(zcc.realtime.publish).toHaveBeenCalledWith(HISTORY_CHANGED_EVENT, expect.objectContaining({ action: 'recorded' }));
      expect(zcc.realtime.publish).toHaveBeenCalledWith(HISTORY_CHANGED_EVENT, expect.objectContaining({ action: 'starred' }));
      expect(zcc.realtime.publish).toHaveBeenCalledWith(HISTORY_CHANGED_EVENT, expect.objectContaining({ action: 'cleared' }));
      expect(zcc.realtime.publish).toHaveBeenCalledWith(HISTORY_CHANGED_EVENT, expect.objectContaining({ action: 'deleted' }));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('coalesces Studio Dictate + Refine + Re-refine RPC calls sharing historyEntryId into a single row', async () => {
    const fetchStub = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ text: 'um coalesce studio activity' }),
      text: async () => 'um coalesce studio activity'
    }));
    vi.stubGlobal('fetch', fetchStub);
    try {
      const { zcc, methods } = fakeZcc(
        { sttProvider: 'openai', openaiApiKey: 'sk-test', llmProvider: 'assistant' },
        true,
        { withDb: true }
      );
      zcc.sdk.assistant.complete
        .mockResolvedValueOnce({ text: 'Coalesce studio activity.' })
        .mockResolvedValueOnce({ text: '- Coalesce studio activity' });
      await createPromptVoicePlugin(zcc as never, { localWhisper: null });

      const dictRes = (await methods.get(TRANSCRIBE_METHOD)?.({
        audio: Buffer.from('studio-audio').toString('base64'),
        mimeType: 'audio/webm',
        transcriptionOnly: true,
        source: 'studio',
        projectId: 'proj-alpha',
        audioDurationMs: 1800
      })) as { ok: boolean; historyEntryId?: string };
      expect(dictRes.ok).toBe(true);
      expect(typeof dictRes.historyEntryId).toBe('string');

      const refine1 = (await methods.get(REPHRASE_METHOD)?.({
        text: 'um coalesce studio activity',
        source: 'studio',
        projectId: 'proj-alpha',
        presetId: 'improve',
        tone: 'standard',
        llmProvider: 'assistant',
        historyEntryId: dictRes.historyEntryId
      })) as { ok: boolean; historyEntryId?: string };
      expect(refine1.historyEntryId).toBe(dictRes.historyEntryId);

      const refine2 = (await methods.get(REPHRASE_METHOD)?.({
        text: 'Coalesce studio activity.',
        source: 'studio',
        projectId: 'proj-alpha',
        presetId: 'executive',
        tone: 'formal',
        llmProvider: 'assistant',
        historyEntryId: refine1.historyEntryId
      })) as { ok: boolean; historyEntryId?: string };
      expect(refine2.historyEntryId).toBe(dictRes.historyEntryId);

      const list = (await methods.get(HISTORY_LIST_METHOD)?.({})) as HistoryListResponse;
      expect(list.total).toBe(1);
      expect(list.entries[0]).toMatchObject({
        id: dictRes.historyEntryId,
        kind: 'dictation_cleanup',
        source: 'studio',
        rawText: 'um coalesce studio activity',
        outputText: '- Coalesce studio activity',
        sttProvider: 'openai',
        llmProvider: 'assistant',
        presetId: 'executive',
        tone: 'formal',
        audioDurationMs: 1800
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('respects historyEnabled=false and prunes non-starred entries when retention settings tighten', async () => {
    const { zcc, methods } = fakeZcc({ llmProvider: 'none' }, true, { withDb: true });
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });

    await methods.get(REPHRASE_METHOD)?.({ text: 'entry one', source: 'studio' });
    await methods.get(REPHRASE_METHOD)?.({ text: 'entry two', source: 'studio' });
    await methods.get(REPHRASE_METHOD)?.({ text: 'entry three', source: 'studio' });

    const before = (await methods.get(HISTORY_LIST_METHOD)?.({})) as HistoryListResponse;
    expect(before.total).toBe(3);

    // Pause recording -> emits settingsChanged (not pruned)
    zcc.realtime.publish.mockClear();
    await methods.get(SETTINGS_UPDATE_METHOD)?.({ historyEnabled: false });
    expect(zcc.realtime.publish).toHaveBeenCalledWith(HISTORY_CHANGED_EVENT, { action: 'settingsChanged' });
    expect(zcc.realtime.publish).not.toHaveBeenCalledWith(HISTORY_CHANGED_EVENT, { action: 'pruned' });

    await methods.get(REPHRASE_METHOD)?.({ text: 'should not be recorded', source: 'studio' });
    const whilePaused = (await methods.get(HISTORY_LIST_METHOD)?.({})) as HistoryListResponse;
    expect(whilePaused.historyEnabled).toBe(false);
    expect(whilePaused.total).toBe(3);

    // Star the oldest entry and tighten maxEntries to 1
    const oldest = whilePaused.entries[2]!;
    await methods.get(HISTORY_STAR_METHOD)?.({ id: oldest.id, starred: true });
    await methods.get(SETTINGS_UPDATE_METHOD)?.({ historyMaxEntries: '1' });
    expect(zcc.realtime.publish).toHaveBeenCalledWith(HISTORY_CHANGED_EVENT, { action: 'pruned' });

    const afterPrune = (await methods.get(HISTORY_LIST_METHOD)?.({})) as HistoryListResponse;
    expect(afterPrune.total).toBe(2);
    expect(afterPrune.entries.map((e) => e.id)).toContain(oldest.id);
  });

  it('returns safe fallback responses and logs warnings when historyStore throws on RPC operations', async () => {
    const failingStore: HistoryStore = {
      record: vi.fn(() => { throw new Error('SQLITE_BUSY: database is locked'); }),
      coalesceDictation: vi.fn(() => { throw new Error('SQLITE_BUSY: database is locked'); }),
      coalesceRefinement: vi.fn(() => { throw new Error('SQLITE_BUSY: database is locked'); }),
      list: vi.fn(() => { throw new Error('SQLITE_CORRUPT: malformed db'); }),
      getById: vi.fn(() => null),
      setStarred: vi.fn(() => { throw new Error('SQLITE_FULL: disk full'); }),
      delete: vi.fn(() => { throw new Error('SQLITE_BUSY: database is locked'); }),
      clear: vi.fn(() => { throw new Error('SQLITE_IOERR: disk I/O error'); }),
      prune: vi.fn(() => 0),
      listProjectIds: vi.fn(() => { throw new Error('SQLITE_BUSY: database is locked'); })
    };

    const { zcc, methods } = fakeZcc({ llmProvider: 'none' }, true);
    await createPromptVoicePlugin(zcc as never, { localWhisper: null, historyStore: failingStore });

    await expect(methods.get(HISTORY_LIST_METHOD)?.({})).resolves.toEqual({
      entries: [],
      total: 0,
      hasMore: false,
      historyEnabled: true,
      storageAvailable: false
    });
    expect(methods.get(HISTORY_STAR_METHOD)?.({ id: 'entry-1', starred: true })).toEqual({ ok: false });
    expect(methods.get(HISTORY_DELETE_METHOD)?.({ id: 'entry-1' })).toEqual({ ok: false, deleted: false });
    expect(methods.get(HISTORY_CLEAR_METHOD)?.({})).toEqual({ ok: false, deletedCount: 0 });
    await expect(methods.get(HISTORY_PROJECTS_METHOD)?.({})).resolves.toEqual({
      projects: [
        { id: 'proj-alpha', name: 'Alpha Workspace' },
        { id: 'proj-beta', name: 'Beta App' }
      ]
    });
    expect(zcc.log.warn).toHaveBeenCalledWith(expect.stringMatching(/could not list activity history/i));
    expect(zcc.log.warn).toHaveBeenCalledWith(expect.stringMatching(/could not update starred state/i));
    expect(zcc.log.warn).toHaveBeenCalledWith(expect.stringMatching(/could not delete activity history/i));
    expect(zcc.log.warn).toHaveBeenCalledWith(expect.stringMatching(/could not clear activity history/i));
    expect(zcc.log.warn).toHaveBeenCalledWith(expect.stringMatching(/could not list project ids/i));
  });

  it('logs a warning when readSettings fails during history.list', async () => {
    const { zcc, methods } = fakeZcc({ llmProvider: 'none' }, false, { withDb: true });
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });
    const settingsInstance = zcc.settings.define.mock.results[0]?.value as { get: ReturnType<typeof vi.fn> };
    settingsInstance.get.mockRejectedValueOnce(new Error('settings unavailable'));

    const res = (await methods.get(HISTORY_LIST_METHOD)?.({})) as HistoryListResponse;
    expect(res).toMatchObject({ entries: [], total: 0, historyEnabled: true, storageAvailable: true });
    expect(zcc.log.warn).toHaveBeenCalledWith(expect.stringMatching(/could not read settings for activity history/i));
  });

  it('never fails dictation or refinement if history persistence throws', async () => {
    const brokenDb = createInMemoryPluginDb();
    const originalTx = brokenDb.transaction.bind(brokenDb);
    let failWrites = false;
    brokenDb.transaction = <T,>(fn: () => T): T => {
      if (failWrites) throw new Error('disk full');
      return originalTx(fn);
    };

    const { zcc, methods } = fakeZcc({ llmProvider: 'none' }, true, { db: brokenDb });
    await createPromptVoicePlugin(zcc as never, { localWhisper: null });

    failWrites = true;
    const res = await methods.get(REPHRASE_METHOD)?.({ text: 'still succeeds', source: 'studio' });
    expect(res).toMatchObject({ ok: true, text: 'still succeeds' });
    expect(zcc.log.warn).toHaveBeenCalledWith(expect.stringMatching(/could not save refinement history/i));
  });
});
