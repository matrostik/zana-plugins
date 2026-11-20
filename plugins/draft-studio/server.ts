import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import { describeUnexpectedFailure } from './src/server/errors.ts';
import { normalizeSettings, SETTING_DESCRIPTORS } from './src/server/settings.ts';
import { createSettingsStore } from './src/server/settingsStore.ts';
import { createHistoryStore, type HistoryStore } from './src/server/historyStore.ts';
import {
  clearHistoryHandler,
  deleteHistoryHandler,
  listHistoryHandler,
  listHistoryProjectsHandler,
  starHistoryHandler,
  type HistoryChangeEvent
} from './src/server/historyHandlers.ts';
import { createAvailableModelsLoader, rephraseHandler, statusFromSettings, transcribeHandler } from './src/server/handlers.ts';
import type { FetchLike } from './src/server/http.ts';
import type { AssistantApi } from './src/server/llm/providers.ts';
import { resolveServerUrl } from './src/server/stt/providers.ts';
import type { LocalWhisperManager } from './src/server/localWhisper/manager.ts';
import { createLocalWhisperManager, registerLocalWhisperMethods } from './src/server/localWhisper/rpc.ts';
import {
  AVAILABLE_MODELS_METHOD,
  HISTORY_CHANGED_EVENT,
  HISTORY_CLEAR_METHOD,
  HISTORY_DELETE_METHOD,
  HISTORY_LIST_METHOD,
  HISTORY_PROJECTS_METHOD,
  HISTORY_STAR_METHOD,
  MODELS_UPDATED_EVENT,
  DRAFT_STUDIO_PROJECT_TAB_ID,
  REPHRASE_METHOD,
  SETTINGS_CHANGED_EVENT,
  SETTINGS_GET_METHOD,
  SETTINGS_UPDATE_METHOD,
  STATUS_METHOD,
  TRANSCRIBE_METHOD
} from './src/shared/protocol.ts';
import { normalizeVisibilitySettings } from './src/shared/visibility.ts';

export interface DraftStudioDeps {
  /** Injected in tests. Defaults to the runtime's global fetch. */
  fetch?: FetchLike;
  serverUrl?: string;
  assistant?: AssistantApi;
  /** Injected in tests; `null` disables Local Whisper. Defaults to a manager for this machine. */
  localWhisper?: LocalWhisperManager | null;
  /** Injected in tests; `null` disables history persistence. Defaults to `zcc.storage.database()`. */
  historyStore?: HistoryStore | null;
  providers?: {
    list(args?: unknown): Promise<Array<{ id: string; available?: boolean; displayName?: string }>>;
    models(args: { providerId: string }): Promise<unknown>;
  };
}

interface ProjectTabAvailabilityRegistration {
  tabId: string;
  evaluate(ctx: { projectId: string }): { available: boolean; reason?: string } | Promise<{ available: boolean; reason?: string }>;
}

type PluginUiWithProjectTab = ZccPluginApi['ui'] & {
  registerProjectTabAvailability?: (registration: ProjectTabAvailabilityRegistration) => void;
};

const STATUS_UNAVAILABLE_MESSAGE = 'Draft Studio status is unavailable. See the Zana log for details.';
const API_KEY_SETTING_FIELDS = ['openaiApiKey', 'googleApiKey', 'anthropicApiKey'] as const;
const HISTORY_RETENTION_FIELDS = ['historyMaxEntries', 'historyMaxDays'] as const;
export { DRAFT_STUDIO_PROJECT_TAB_ID } from './src/shared/protocol.ts';

function apiKeyPresenceSignature(raw: Record<string, unknown>): string {
  const { keys } = normalizeSettings(raw);
  return `${Boolean(keys.openai)}:${Boolean(keys.google)}:${Boolean(keys.anthropic)}`;
}

function patchTouchesFields(patch: unknown, fields: readonly string[]): boolean {
  if (!patch || typeof patch !== 'object') return false;
  const rec = patch as Record<string, unknown>;
  return fields.some((field) => field in rec);
}

function isLocalWhisperReady(localWhisper: LocalWhisperManager | null): boolean {
  if (!localWhisper || typeof localWhisper.getState !== 'function') return false;
  const state = localWhisper.getState();
  return state.platform.supported && state.runtime.status === 'installed' && state.activeModelId !== null;
}

function initHistoryStore(zcc: ZccPluginApi, injected: HistoryStore | null | undefined): HistoryStore | null {
  if (injected !== undefined) return injected;
  if (typeof zcc.storage?.database !== 'function') return null;
  try {
    return createHistoryStore(zcc.storage.database());
  } catch (err) {
    zcc.log.warn(`Activity history unavailable: ${describeUnexpectedFailure(err, 'Draft Studio history')}`);
    return null;
  }
}

/**
 * Registers Draft Studio's settings, project tab availability, activity history, and RPC methods.
 * Speech and cleanup run here on the server, by default through Zana host voice transcription and the Zana assistant.
 */
export default async function createDraftStudioPlugin(zcc: ZccPluginApi, deps: DraftStudioDeps = {}): Promise<void> {
  const settings = zcc.settings.define(SETTING_DESCRIPTORS);
  const fetchImpl: FetchLike = deps.fetch ?? fetch;
  const store = zcc.storage?.kv ? createSettingsStore(zcc.storage.kv, () => settings.get()) : null;
  const readSettings = () => store ? store.readEffective() : settings.get() as Promise<Record<string, unknown>>;
  const historyStore = initHistoryStore(zcc, deps.historyStore);
  const onHistoryChanged = (event: HistoryChangeEvent) => {
    zcc.realtime?.publish?.(HISTORY_CHANGED_EVENT, event);
  };

  if (store) {
    zcc.rpc.method(SETTINGS_GET_METHOD, () => store.readPublic());
  }
  const serverUrl = deps.serverUrl ?? resolveServerUrl();
  const assistant = deps.assistant ?? zcc.sdk?.assistant;
  const providers = deps.providers ?? zcc.sdk?.providers;
  const modelsLoader = createAvailableModelsLoader({
    readSettings,
    providers,
    log: zcc.log,
    onModelsUpdated: (entries) => {
      zcc.realtime?.publish?.(MODELS_UPDATED_EVENT, entries);
    }
  });
  let lastApiKeySignature = await readSettings()
    .then(apiKeyPresenceSignature)
    .catch(() => 'false:false:false');

  if (store) {
    zcc.rpc.method(SETTINGS_UPDATE_METHOD, async (patch) => {
      const updated = await store.update(patch);
      if (patchTouchesFields(patch, API_KEY_SETTING_FIELDS)) {
        lastApiKeySignature = apiKeyPresenceSignature(updated);
        void modelsLoader.refreshDirectEntries();
      }
      if (historyStore && patchTouchesFields(patch, HISTORY_RETENTION_FIELDS)) {
        try {
          const normalized = normalizeSettings(updated);
          const removed = historyStore.prune({
            maxEntries: normalized.historyMaxEntries,
            maxDays: normalized.historyMaxDays
          });
          if (removed > 0) onHistoryChanged({ action: 'pruned' });
        } catch (err) {
          zcc.log.warn(`Could not prune activity history: ${describeUnexpectedFailure(err, 'Draft Studio history')}`);
        }
      }
      if (patchTouchesFields(patch, ['historyEnabled'])) {
        onHistoryChanged({ action: 'settingsChanged' });
      }
      return updated;
    });
  }
  const localWhisper = deps.localWhisper !== undefined ? deps.localWhisper : await createLocalWhisperManager(zcc, fetchImpl);
  registerLocalWhisperMethods(zcc, localWhisper);
  // Stops the server this plugin started; a user-run server is never touched.
  if (localWhisper) zcc.onDispose?.(() => localWhisper.dispose());

  // Gate the Draft Studio project tab based on the host plugin setting.
  const ui = zcc.ui as PluginUiWithProjectTab | undefined;
  ui?.registerProjectTabAvailability?.({
    tabId: DRAFT_STUDIO_PROJECT_TAB_ID,
    async evaluate() {
      try {
        const current = normalizeSettings(await settings.get());
        if (!current.showInProjects) {
          return {
            available: false,
            reason: 'Hidden in Draft Studio plugin settings.'
          };
        }
        return { available: true };
      } catch (err) {
        zcc.log.warn(`Project tab availability check failed: ${describeUnexpectedFailure(err, 'Draft Studio settings')}`);
        return { available: true };
      }
    }
  });

  settings.onChange?.((next) => {
    const nextSignature = apiKeyPresenceSignature(next);
    if (nextSignature !== lastApiKeySignature) {
      lastApiKeySignature = nextSignature;
      void modelsLoader.refreshDirectEntries();
    }
    zcc.realtime?.publish?.(SETTINGS_CHANGED_EVENT, normalizeVisibilitySettings(next));
  });

  zcc.rpc.method(TRANSCRIBE_METHOD, (request) =>
    transcribeHandler(request, {
      readSettings,
      fetch: fetchImpl,
      log: zcc.log,
      serverUrl,
      assistant,
      localWhisper: localWhisper ?? undefined,
      historyStore,
      onHistoryChanged
    })
  );

  zcc.rpc.method(REPHRASE_METHOD, (request) =>
    rephraseHandler(request, {
      readSettings,
      fetch: fetchImpl,
      log: zcc.log,
      serverUrl,
      assistant,
      historyStore,
      onHistoryChanged
    })
  );

  const historyRpcDeps = {
    historyStore,
    readSettings,
    listProjects: zcc.sdk?.projects?.list ? () => zcc.sdk.projects.list() : undefined,
    onHistoryChanged,
    log: zcc.log
  };
  zcc.rpc.method(HISTORY_LIST_METHOD, (args) => listHistoryHandler(args, historyRpcDeps));
  zcc.rpc.method(HISTORY_STAR_METHOD, (args) => starHistoryHandler(args, historyRpcDeps));
  zcc.rpc.method(HISTORY_DELETE_METHOD, (args) => deleteHistoryHandler(args, historyRpcDeps));
  zcc.rpc.method(HISTORY_CLEAR_METHOD, (args) => clearHistoryHandler(args, historyRpcDeps));
  zcc.rpc.method(HISTORY_PROJECTS_METHOD, () => listHistoryProjectsHandler(historyRpcDeps));

  zcc.rpc.method(STATUS_METHOD, async () => {
    let raw: Record<string, unknown>;
    try {
      raw = await readSettings();
    } catch (err) {
      zcc.log.error(`Status unavailable: ${describeUnexpectedFailure(err, 'Draft Studio settings')}`);
      throw new Error(STATUS_UNAVAILABLE_MESSAGE);
    }
    const available = providers
      ? await providers.list().catch((err: unknown) => {
          // Status still works without the list; the UI just shows no host providers.
          zcc.log.warn(`Provider list unavailable: ${describeUnexpectedFailure(err, 'Zana providers')}`);
          return [];
        })
      : [];
    return statusFromSettings(
      raw,
      available.map((p) => p.id),
      { localWhisperReady: isLocalWhisperReady(localWhisper) }
    );
  });

  zcc.rpc.method(AVAILABLE_MODELS_METHOD, (args) => {
    const refresh = Boolean(args && typeof args === 'object' && (args as { refresh?: unknown }).refresh === true);
    return modelsLoader.load({ refresh });
  });

  // Warm the model catalog asynchronously on startup so Draft Studio opens without cold-start delay.
  if (providers) {
    void modelsLoader.load().catch((err: unknown) => {
      zcc.log.warn(`Initial model catalog warmup failed: ${describeUnexpectedFailure(err, 'Zana providers')}`);
    });
  }
}
