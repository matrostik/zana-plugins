import type { AudioInput } from './audio.ts';
import { describeProviderError, describeUnexpectedFailure, PromptVoiceError } from './errors.ts';
import type { FetchLike } from './http.ts';
import { createLlmProvider, resolveLlmModel, type AssistantApi } from './llm/providers.ts';
import { buildSystemPrompt, buildUserMessage } from './llm/prompts.ts';
import type { PromptVoiceSettings } from './settings.ts';
import { cleanTranscription, isMeaningfulSpeech } from './stt/clean.ts';
import { createSttProvider, type SttProvider } from './stt/providers.ts';
import type { RefineNotice, TranscribeNoSpeech, TranscribeSuccess } from '../shared/protocol.ts';

export interface PipelineLogger {
  warn(message: string): void;
  error(message: string): void;
}

export interface PipelineDeps {
  fetch: FetchLike;
  log: PipelineLogger;
  serverUrl?: string;
  assistant?: AssistantApi;
}

export type PipelineOutcome = TranscribeSuccess | TranscribeNoSpeech;

const STT_LABELS: Record<string, string> = {
  system: 'Zana Voice',
  openai: 'OpenAI',
  'google-gemini': 'Google Gemini'
};

const LLM_LABELS: Record<string, string> = {
  none: '',
  assistant: 'Zana Assistant',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini'
};

interface RefineResult {
  text: string;
  model: string | null;
  notice?: RefineNotice;
}

function toPromptVoiceError(
  err: unknown,
  code: 'STT_FAILED' | 'LLM_FAILED',
  label: string,
  model?: string
): PromptVoiceError {
  if (err instanceof PromptVoiceError) return err;
  // Never copy err.message into detail: it is logged and may quote provider response content.
  const detail = describeUnexpectedFailure(err, label, model);
  return new PromptVoiceError(code, describeProviderError(err, label, model), { detail });
}

async function transcribeAudio(stt: SttProvider, audio: AudioInput, language: string): Promise<string> {
  try {
    return await stt.transcribe(audio, language);
  } catch (err) {
    throw toPromptVoiceError(err, 'STT_FAILED', STT_LABELS[stt.id] ?? stt.id, stt.model);
  }
}

/**
 * Cleanup failures never lose the dictation. The raw transcript is returned with a notice,
 * so the user sees what happened instead of a silent fallback.
 */
async function refineText(rawText: string, settings: PromptVoiceSettings, deps: PipelineDeps): Promise<RefineResult> {
  if (settings.llmProvider === 'none') return { text: rawText, model: null };

  const model = resolveLlmModel(settings);
  try {
    const provider = createLlmProvider(settings, deps.fetch, model, { assistant: deps.assistant });
    // Null only when cleanup is off; unavailable providers throw and produce a notice below.
    if (!provider) return { text: rawText, model: null };

    const systemPrompt = buildSystemPrompt({
      tone: settings.tone,
      customPrompt: settings.customPrompt,
      dictionary: settings.dictionary
    });
    const text = await provider.refine(systemPrompt, buildUserMessage(rawText));
    return { text, model: provider.model };
  } catch (err) {
    const error = toPromptVoiceError(err, 'LLM_FAILED', LLM_LABELS[settings.llmProvider] ?? settings.llmProvider, model);
    deps.log.warn(`Cleanup skipped, inserting raw transcript: ${error.detail ?? error.message}`);
    return { text: rawText, model, notice: { code: error.code, message: error.userMessage } };
  }
}

/**
 * Transcribes recorded audio, then cleans and refines it.
 * Uses Zana host voice transcription and existing AI models without needing API keys.
 */
export async function runDictation(
  audio: AudioInput,
  settings: PromptVoiceSettings,
  deps: PipelineDeps
): Promise<PipelineOutcome> {
  const stt = createSttProvider(settings, deps.fetch, { serverUrl: deps.serverUrl });
  const spoken = await transcribeAudio(stt, audio, settings.inputLanguage);
  const rawText = cleanTranscription(spoken);
  if (!isMeaningfulSpeech(rawText)) {
    return { ok: true, status: 'no-speech' };
  }

  const refined = await refineText(rawText, settings, deps);
  return {
    ok: true,
    status: 'ok',
    rawText,
    text: refined.text,
    sttProvider: settings.sttProvider,
    llmProvider: settings.llmProvider,
    llmModel: refined.model,
    ...(refined.notice ? { refineNotice: refined.notice } : {})
  };
}
