import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import { describeUnexpectedFailure } from './src/server/errors.ts';
import { SETTING_DESCRIPTORS } from './src/server/settings.ts';
import { statusFromSettings, transcribeHandler } from './src/server/handlers.ts';
import type { FetchLike } from './src/server/http.ts';
import type { AssistantApi } from './src/server/llm/providers.ts';
import { resolveServerUrl } from './src/server/stt/providers.ts';
import { STATUS_METHOD, TRANSCRIBE_METHOD } from './src/shared/protocol.ts';

export interface PromptVoiceDeps {
  /** Injected in tests. Defaults to the runtime's global fetch. */
  fetch?: FetchLike;
  serverUrl?: string;
  assistant?: AssistantApi;
  providers?: {
    list(args?: unknown): Promise<Array<{ id: string }>>;
    models(args: { providerId: string }): Promise<unknown>;
  };
}

const STATUS_UNAVAILABLE_MESSAGE = 'Prompt Voice status is unavailable. See the Zana log for details.';

/**
 * Registers Prompt Voice's settings and RPC methods. Speech and cleanup run here on the
 * server, by default through Zana host voice transcription and the Zana assistant.
 */
export default async function createPromptVoicePlugin(zcc: ZccPluginApi, deps: PromptVoiceDeps = {}): Promise<void> {
  const settings = zcc.settings.define(SETTING_DESCRIPTORS);
  const fetchImpl: FetchLike = deps.fetch ?? fetch;
  const readSettings = () => settings.get() as Promise<Record<string, unknown>>;
  const serverUrl = deps.serverUrl ?? resolveServerUrl();
  const assistant = deps.assistant ?? zcc.sdk?.assistant;
  const providers = deps.providers ?? zcc.sdk?.providers;

  zcc.rpc.method(TRANSCRIBE_METHOD, (request) =>
    transcribeHandler(request, {
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
}
