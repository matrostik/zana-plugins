import { missingKeyError, PromptVoiceError } from '../errors.ts';
import { DEFAULT_GEMINI_MODEL, GEMINI_FINISH_OK, geminiGenerateContentUrl } from '../gemini.ts';
import { sendRequest, parseJsonResponse, postJson, type FetchLike, type ProviderCall } from '../http.ts';
import type { AudioInput } from '../audio.ts';
import { API_KEY_LABELS, STT_PROVIDER_KEYS, type PromptVoiceSettings } from '../settings.ts';
import type { SttProviderId } from '../../shared/protocol.ts';

export const STT_DEFAULT_MODELS: Record<string, string> = {
  system: 'default',
  openai: 'gpt-transcribe',
  'google-gemini': DEFAULT_GEMINI_MODEL
};

const OPENAI_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';

/** Transcript-only contract. Language detection metadata is not used in v1. */
export interface SttProvider {
  readonly id: SttProviderId;
  readonly model: string;
  /** Returns raw provider text. Cleanup happens in the pipeline. */
  transcribe(audio: AudioInput, language: string): Promise<string>;
}

/**
 * Zana host-native voice transcription using the running server's speech-to-text service.
 * Needs no external API keys; uses the host's configured voice model (whisper-1 / gpt-transcribe).
 */
export class SystemSttProvider implements SttProvider {
  readonly id = 'system' as const;
  /** The host endpoint takes no model field and always uses its own configured model. */
  readonly model = STT_DEFAULT_MODELS.system;

  constructor(
    private readonly serverUrl: string,
    private readonly fetchImpl: FetchLike
  ) {}

  async transcribe(audio: AudioInput, language: string): Promise<string> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audio.buffer)], { type: audio.mimeType }), audio.fileName);
    if (language && language !== 'auto') {
      form.append('prompt', `The spoken language is ${language}.`);
    }

    const url = `${this.serverUrl.replace(/\/+$/, '')}/api/v1/system/voice-transcription`;
    const call = this.callInfo();
    const response = await sendRequest(this.fetchImpl, url, { method: 'POST', body: form }, call);

    // A JSON `null` body parses fine, so guard it before reading `.text`.
    const body = await parseJsonResponse<{ text?: unknown } | null>(response, call);
    return typeof body?.text === 'string' ? body.text.trim() : '';
  }

  private callInfo(): ProviderCall {
    return { label: 'Zana Voice', code: 'STT_FAILED', model: this.model };
  }
}

/** OpenAI GPT-transcribe via the audio transcriptions endpoint. Ported from prompt-voice `whisperApi.ts`. */
export class OpenAiSttProvider implements SttProvider {
  readonly id = 'openai' as const;
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model: string,
    private readonly fetchImpl: FetchLike
  ) {
    this.model = model;
  }

  async transcribe(audio: AudioInput, language: string): Promise<string> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audio.buffer)], { type: audio.mimeType }), audio.fileName);
    form.append('model', this.model);
    form.append('response_format', 'text');
    // OpenAI expects ISO-639-1 (`de`), not BCP-47 (`de-DE`), so send only the primary subtag.
    if (language !== 'auto') form.append('language', language.split('-')[0]);

    const response = await sendRequest(
      this.fetchImpl,
      OPENAI_TRANSCRIPTIONS_URL,
      { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}` }, body: form },
      this.callInfo()
    );
    return response.text();
  }

  private callInfo(): ProviderCall {
    return { label: 'OpenAI', code: 'STT_FAILED', model: this.model };
  }
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    finishReason?: string | null;
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string | null };
}

/** Instruction for transcription-only output with no commentary. */
function buildGeminiTranscriptionPrompt(language: string): string {
  const languageHint = language !== 'auto' ? ` The speaker is using ${language}.` : '';
  return `Transcribe the spoken audio verbatim. Do not include any explanations, commentary, timestamps, or markdown formatting.${languageHint}`;
}

/**
 * Gemini speech-to-text through `generateContent` with inline audio. Ported from prompt-voice
 * `geminiStt.ts`, keeping only this path. The Files API and Interactions path are not ported.
 */
export class GeminiSttProvider implements SttProvider {
  readonly id = 'google-gemini' as const;
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model: string,
    private readonly fetchImpl: FetchLike
  ) {
    this.model = model;
  }

  async transcribe(audio: AudioInput, language: string): Promise<string> {
    const data = await postJson<GeminiGenerateResponse>(
      this.fetchImpl,
      geminiGenerateContentUrl(this.model),
      { 'x-goog-api-key': this.apiKey },
      {
        contents: [
          {
            parts: [
              { inline_data: { mime_type: audio.mimeType, data: audio.buffer.toString('base64') } },
              { text: buildGeminiTranscriptionPrompt(language) }
            ]
          }
        ],
        generationConfig: { temperature: 0 }
      },
      { label: 'Google Gemini', code: 'STT_FAILED', model: this.model }
    );
    return extractGeminiText(data);
  }
}

/**
 * Returns the transcript, or throws STT_FAILED when Gemini blocked the request or stopped
 * early. Otherwise a cut-off transcript would be inserted as complete, or a blocked request
 * would look like silence. A finished response with no text is still treated as no speech.
 */
function extractGeminiText(data: GeminiGenerateResponse): string {
  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new PromptVoiceError('STT_FAILED', 'Google Gemini declined to transcribe this recording. Try again.', {
      detail: `Google Gemini blocked the request: blockReason is ${blockReason}`
    });
  }
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new PromptVoiceError('STT_FAILED', 'Google Gemini transcript was cut off. Try a shorter recording.', {
      detail: 'Google Gemini transcript cut off: finishReason is MAX_TOKENS'
    });
  }
  if (finishReason && finishReason !== GEMINI_FINISH_OK) {
    throw new PromptVoiceError('STT_FAILED', 'Google Gemini could not transcribe this recording. Try again.', {
      detail: `Google Gemini transcription stopped: finishReason is ${finishReason}`
    });
  }
  const parts = candidate?.content?.parts ?? [];
  return parts.map((part) => part.text ?? '').join('').trim();
}

export interface SttOptions {
  serverUrl?: string;
}

/**
 * Builds the STT provider for the configured engine.
 * Defaults to the Zana host system voice transcription, requiring no API key.
 */
export function createSttProvider(
  settings: PromptVoiceSettings,
  fetchImpl: FetchLike,
  options: SttOptions = {}
): SttProvider {
  const model = settings.sttModel || STT_DEFAULT_MODELS[settings.sttProvider] || STT_DEFAULT_MODELS.system;
  const keyName = STT_PROVIDER_KEYS[settings.sttProvider];
  const apiKey = keyName ? settings.keys[keyName] : '';
  if (keyName && !apiKey) throw missingKeyError(API_KEY_LABELS[keyName]);
  if (settings.sttProvider === 'openai') return new OpenAiSttProvider(apiKey, model, fetchImpl);
  if (settings.sttProvider === 'google-gemini') return new GeminiSttProvider(apiKey, model, fetchImpl);
  return new SystemSttProvider(options.serverUrl || resolveServerUrl(), fetchImpl);
}

/** Local Zana server used when ZCC_SERVER_URL is not set. */
export const DEFAULT_SERVER_URL = 'http://127.0.0.1:8780';

/** The single place the host server URL is resolved from the environment. */
export function resolveServerUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.ZCC_SERVER_URL || DEFAULT_SERVER_URL;
}
