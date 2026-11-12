import { decodeAudioRequest, type AudioInput } from './audio.ts';
import { describeUnexpectedFailure, PromptVoiceError } from './errors.ts';
import {
  LLM_PROVIDER_KEYS,
  normalizeSettings,
  STT_PROVIDER_KEYS,
  type ApiKeyName,
  type PromptVoiceSettings
} from './settings.ts';
import { runDictation, runRephrase, type PipelineDeps, type PipelineLogger } from './pipeline.ts';
import type {
  AvailableModelsResponse,
  DiscoveredModel,
  DiscoveredProvider,
  RephraseFailure,
  RephraseRequest,
  RephraseResponse,
  StatusResponse,
  TranscribeFailure,
  TranscribeRequest,
  TranscribeResponse
} from '../shared/protocol.ts';

export interface HandlerDeps extends PipelineDeps {
  readSettings: () => Promise<Record<string, unknown>>;
}

export interface AvailableModelsDeps {
  readSettings: () => Promise<Record<string, unknown>>;
  providers?: {
    list(args?: unknown): Promise<Array<{ id: string; available?: boolean; displayName?: string }>>;
    models(args: { providerId: string }): Promise<unknown>;
  };
  log?: PipelineLogger;
}

const INTERNAL_ERROR_MESSAGE = 'Dictation failed unexpectedly. See the Zana log for details.';

function asRequest(value: unknown): Partial<TranscribeRequest> & { audio?: unknown; mimeType?: unknown } {
  return value && typeof value === 'object' ? (value as Partial<TranscribeRequest>) : {};
}

/** Maps a thrown error to the RPC failure envelope. Logs the detail; the UI gets only the user message. */
export function failureResponse(err: unknown, log: PipelineLogger): TranscribeFailure {
  if (err instanceof PromptVoiceError) {
    log.warn(`${err.code}: ${err.detail ?? err.message}`);
    return { ok: false, code: err.code, message: err.userMessage };
  }
  // Raw messages can quote provider bodies (transcript text, credentials), so log only the classification.
  log.error(`Unexpected dictation error: ${describeUnexpectedFailure(err, 'Prompt Voice')}`);
  return { ok: false, code: 'INTERNAL', message: INTERNAL_ERROR_MESSAGE };
}

/** Settings for one request. An explicit language in the request overrides the saved setting. */
function settingsForRequest(raw: Record<string, unknown>, request: { language?: unknown }): PromptVoiceSettings {
  const language = typeof request.language === 'string' ? request.language : raw.inputLanguage;
  return normalizeSettings({ ...raw, inputLanguage: language });
}

/** RPC `promptVoice.transcribe`. Validates audio, runs the pipeline, and maps every outcome to the envelope. */
export async function transcribeHandler(request: unknown, deps: HandlerDeps): Promise<TranscribeResponse> {
  const requestRecord = asRequest(request);
  let audio: AudioInput;
  try {
    audio = decodeAudioRequest(requestRecord);
  } catch (err) {
    return failureResponse(err, deps.log);
  }

  try {
    const settings = settingsForRequest(await deps.readSettings(), requestRecord);
    if (requestRecord.transcriptionOnly === true) settings.llmProvider = 'none';
    return await runDictation(audio, settings, {
      fetch: deps.fetch,
      log: deps.log,
      serverUrl: deps.serverUrl,
      assistant: deps.assistant,
      localWhisper: deps.localWhisper
    });
  } catch (err) {
    return failureResponse(err, deps.log);
  }
}

/** RPC `promptVoice.rephrase`. Directly rephrases or transforms text using LLMs. */
export async function rephraseHandler(request: unknown, deps: HandlerDeps): Promise<RephraseResponse> {
  const req = (request && typeof request === 'object' ? request : {}) as RephraseRequest;
  try {
    const settings = normalizeSettings(await deps.readSettings());
    return await runRephrase(req, settings, {
      fetch: deps.fetch,
      log: deps.log,
      serverUrl: deps.serverUrl,
      assistant: deps.assistant
    });
  } catch (err) {
    const failure = failureResponse(err, deps.log);
    return { ok: false, code: failure.code, message: failure.message };
  }
}

function hasRequiredKey(
  providerId: string,
  keyMap: Readonly<Record<string, ApiKeyName>>,
  keys: PromptVoiceSettings['keys']
): boolean {
  const keyName = keyMap[providerId];
  return keyName === undefined || keys[keyName].length > 0;
}

/** RPC `promptVoice.status`. Reports active providers and whether any key they need is configured. */
export function statusFromSettings(raw: Record<string, unknown>, availableProviders?: string[]): StatusResponse {
  const settings = normalizeSettings(raw);
  return {
    sttProvider: settings.sttProvider,
    sttKeyConfigured: hasRequiredKey(settings.sttProvider, STT_PROVIDER_KEYS, settings.keys),
    llmProvider: settings.llmProvider,
    llmKeyConfigured: hasRequiredKey(settings.llmProvider, LLM_PROVIDER_KEYS, settings.keys),
    audioFormat: settings.sttProvider === 'local-whisper' ? 'wav' : 'recorded',
    ...(availableProviders ? { availableProviders } : {})
  };
}

/** Union of catalog models and selected-only entries, keyed by model id and sorted alphabetically. */
export function mergeCatalogModels(catalog: unknown): DiscoveredModel[] {
  if (!catalog || typeof catalog !== 'object') return [];
  const rec = catalog as {
    models?: Array<{ id?: string; model?: string; label?: string }>;
    selectedOnlyModels?: Array<{ id?: string; model?: string; label?: string }>;
  };
  const seen = new Map<string, DiscoveredModel>();
  const add = (item?: { id?: string; model?: string; label?: string }) => {
    if (!item || !item.id || typeof item.id !== 'string') return;
    const label = item.label || item.model || item.id;
    if (!seen.has(item.id)) {
      seen.set(item.id, { id: item.id, label });
    }
  };
  for (const m of rec.models ?? []) add(m);
  for (const m of rec.selectedOnlyModels ?? []) add(m);
  return Array.from(seen.values()).sort((a, b) =>
    (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: 'base', numeric: true })
  );
}

/** RPC `promptVoice.availableModels`. Discovers available providers and models from Zana host, ordered alphabetically. */
export async function availableModelsHandler(deps: AvailableModelsDeps): Promise<AvailableModelsResponse> {
  const result: AvailableModelsResponse = [
    {
      providerId: 'assistant',
      displayName: 'Zana Assistant',
      models: [{ id: 'assistant', label: 'Default Assistant (Host Agent)' }]
    }
  ];

  let rawSettings: Record<string, unknown> = {};
  try {
    rawSettings = await deps.readSettings();
  } catch {
    // Non-fatal
  }
  const settings = normalizeSettings(rawSettings);
  const seenProviderIds = new Set<string>(['assistant']);

  if (deps.providers) {
    try {
      const rawList = await deps.providers.list();
      const availableList = Array.isArray(rawList)
        ? rawList.filter((p) => p && typeof p.id === 'string' && p.available !== false)
        : [];

      for (const provider of availableList) {
        if (seenProviderIds.has(provider.id)) continue;
        seenProviderIds.add(provider.id);

        let models: DiscoveredModel[] = [];
        let errorDetail: string | null = null;
        try {
          const catalog = await deps.providers.models({ providerId: provider.id });
          models = mergeCatalogModels(catalog);
          if (catalog && typeof catalog === 'object' && 'modelLoadError' in catalog) {
            const err = (catalog as { modelLoadError?: { detail?: string; code?: string } }).modelLoadError;
            if (err) errorDetail = err.detail ?? err.code ?? null;
          }
        } catch (err) {
          errorDetail = describeUnexpectedFailure(err, provider.id);
        }

        result.push({
          providerId: provider.id,
          displayName: provider.displayName ?? provider.id,
          models,
          error: errorDetail
        });
      }
    } catch (err) {
      deps.log?.warn?.(`Provider list unavailable: ${describeUnexpectedFailure(err, 'Zana providers')}`);
    }
  }

  // Fallback direct providers configured in Prompt Voice settings (Anthropic / Google / OpenAI)
  const directFallbacks: Array<{
    providerId: string;
    displayName: string;
    keyName: ApiKeyName;
    models: DiscoveredModel[];
  }> = [
    {
      providerId: 'anthropic',
      displayName: 'Anthropic',
      keyName: 'anthropic',
      models: [
        { id: 'claude-haiku-4-5-20251001', label: 'Claude 4.5 Haiku' },
        { id: 'claude-sonnet-5-20260201', label: 'Claude 5 Sonnet' }
      ]
    },
    {
      providerId: 'google',
      displayName: 'Google Gemini',
      keyName: 'google',
      models: [{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }]
    },
    {
      providerId: 'openai',
      displayName: 'OpenAI',
      keyName: 'openai',
      models: [
        { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano (Fast)' },
        { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (Smart)' }
      ]
    }
  ];

  for (const direct of directFallbacks) {
    if (!seenProviderIds.has(direct.providerId)) {
      const hasKey = Boolean(settings.keys[direct.keyName]);
      if (hasKey || result.length === 1) {
        seenProviderIds.add(direct.providerId);
        result.push({
          providerId: direct.providerId,
          displayName: direct.displayName,
          models: direct.models,
          error: hasKey ? null : 'API key not configured in Prompt Voice settings.'
        });
      }
    }
  }

  // Sort models in each provider alphabetically (A-Z) by label
  for (const prov of result) {
    prov.models.sort((a, b) =>
      (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: 'base', numeric: true })
    );
  }

  // Sort providers alphabetically (A-Z) by displayName
  result.sort((a, b) =>
    (a.displayName || a.providerId).localeCompare(b.displayName || b.providerId, undefined, { sensitivity: 'base', numeric: true })
  );

  return result;
}
