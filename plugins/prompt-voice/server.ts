import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import { describeUnexpectedFailure } from './src/server/errors.ts';
import { normalizeSettings, SETTING_DESCRIPTORS } from './src/server/settings.ts';
import { createSettingsStore } from './src/server/settingsStore.ts';
import { createAvailableModelsLoader, rephraseHandler, statusFromSettings, transcribeHandler } from './src/server/handlers.ts';
import type { FetchLike } from './src/server/http.ts';
import type { AssistantApi } from './src/server/llm/providers.ts';
import { resolveServerUrl } from './src/server/stt/providers.ts';
import type { LocalWhisperManager } from './src/server/localWhisper/manager.ts';
import { createLocalWhisperManager, registerLocalWhisperMethods } from './src/server/localWhisper/rpc.ts';
import {
  AVAILABLE_MODELS_METHOD,
  MODELS_UPDATED_EVENT,
  PROMPT_STUDIO_PROJECT_TAB_ID,
  REPHRASE_METHOD,
  SETTINGS_CHANGED_EVENT,
  SETTINGS_GET_METHOD,
  SETTINGS_UPDATE_METHOD,
  STATUS_METHOD,
  TRANSCRIBE_METHOD
} from './src/shared/protocol.ts';
import { normalizeVisibilitySettings } from './src/shared/visibility.ts';

export interface PromptVoiceDeps {
  /** Injected in tests. Defaults to the runtime's global fetch. */
  fetch?: FetchLike;
  serverUrl?: string;
  assistant?: AssistantApi;
  /** Injected in tests; `null` disables Local Whisper. Defaults to a manager for this machine. */
  localWhisper?: LocalWhisperManager | null;
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

const STATUS_UNAVAILABLE_MESSAGE = 'Prompt Voice status is unavailable. See the Zana log for details.';
export { PROMPT_STUDIO_PROJECT_TAB_ID } from './src/shared/protocol.ts';

/**
 * Registers Prompt Voice's settings, project tab availability, and RPC methods.
 * Speech and cleanup run here on the server, by default through Zana host voice transcription and the Zana assistant.
 */
export default async function createPromptVoicePlugin(zcc: ZccPluginApi, deps: PromptVoiceDeps = {}): Promise<void> {
  const settings = zcc.settings.define(SETTING_DESCRIPTORS);
  const fetchImpl: FetchLike = deps.fetch ?? fetch;
  const store = zcc.storage?.kv ? createSettingsStore(zcc.storage.kv, () => settings.get()) : null;
  const readSettings = () => store ? store.readEffective() : settings.get() as Promise<Record<string, unknown>>;
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
  if (store) {
    zcc.rpc.method(SETTINGS_UPDATE_METHOD, async (patch) => {
      const updated = await store.update(patch);
      modelsLoader.invalidate();
      return updated;
    });
  }
  const localWhisper = deps.localWhisper !== undefined ? deps.localWhisper : await createLocalWhisperManager(zcc, fetchImpl);
  registerLocalWhisperMethods(zcc, localWhisper);
  // Stops the server this plugin started; a user-run server is never touched.
  if (localWhisper) zcc.onDispose?.(() => localWhisper.dispose());

  // Gate the Prompt Studio project tab based on the host plugin setting.
  const ui = zcc.ui as PluginUiWithProjectTab | undefined;
  ui?.registerProjectTabAvailability?.({
    tabId: PROMPT_STUDIO_PROJECT_TAB_ID,
    async evaluate() {
      try {
        const current = normalizeSettings(await settings.get());
        if (!current.showInProjects) {
          return {
            available: false,
            reason: 'Hidden in Prompt Voice plugin settings.'
          };
        }
        return { available: true };
      } catch (err) {
        zcc.log.warn(`Project tab availability check failed: ${describeUnexpectedFailure(err, 'Prompt Voice settings')}`);
        return { available: true };
      }
    }
  });

  settings.onChange?.((next) => {
    modelsLoader.invalidate();
    zcc.realtime?.publish?.(SETTINGS_CHANGED_EVENT, normalizeVisibilitySettings(next));
  });

  zcc.rpc.method(TRANSCRIBE_METHOD, (request) =>
    transcribeHandler(request, {
      readSettings,
      fetch: fetchImpl,
      log: zcc.log,
      serverUrl,
      assistant,
      localWhisper: localWhisper ?? undefined
    })
  );

  zcc.rpc.method(REPHRASE_METHOD, (request) =>
    rephraseHandler(request, {
      readSettings,
      fetch: fetchImpl,
      log: zcc.log,
      serverUrl,
      assistant
    })
  );

  zcc.rpc.method(STATUS_METHOD, async () => {
    let raw: Record<string, unknown>;
    try {
      raw = await readSettings();
    } catch (err) {
      zcc.log.error(`Status unavailable: ${describeUnexpectedFailure(err, 'Prompt Voice settings')}`);
      throw new Error(STATUS_UNAVAILABLE_MESSAGE);
    }
    const available = providers
      ? await providers.list().catch((err: unknown) => {
          // Status still works without the list; the UI just shows no host providers.
          zcc.log.warn(`Provider list unavailable: ${describeUnexpectedFailure(err, 'Zana providers')}`);
          return [];
        })
      : [];
    return statusFromSettings(raw, available.map((p) => p.id));
  });

  zcc.rpc.method(AVAILABLE_MODELS_METHOD, (args) => {
    const refresh = Boolean(args && typeof args === 'object' && (args as { refresh?: unknown }).refresh === true);
    return modelsLoader.load({ refresh });
  });

  // Warm the model catalog asynchronously on startup so Prompt Studio opens without cold-start delay.
  if (providers) {
    void modelsLoader.load().catch((err: unknown) => {
      zcc.log.warn(`Initial model catalog warmup failed: ${describeUnexpectedFailure(err, 'Zana providers')}`);
    });
  }
}
