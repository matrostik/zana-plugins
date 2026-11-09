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
    return await runDictation(audio, settings, {
      fetch: deps.fetch,
      log: deps.log,
      serverUrl: deps.serverUrl,
      assistant: deps.assistant
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
    ...(availableProviders ? { availableProviders } : {})
  };
}
