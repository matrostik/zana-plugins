import { PromptVoiceError } from '../errors.ts';
import { parseJsonResponse, sendRequest, type FetchLike, type ProviderCall } from '../http.ts';
import type { AudioInput } from '../audio.ts';
import type { SttProvider } from './providers.ts';

/**
 * Upper bound for one local transcription. A two-minute clip on a slow CPU with a large
 * model can take well over the 30-second cloud timeout. Tune after benchmarks.
 */
export const LOCAL_WHISPER_TIMEOUT_MS = 120_000;

/** Requests allowed in flight or waiting. The runtime transcribes one at a time. */
export const LOCAL_WHISPER_MAX_PENDING = 3;

const LABEL = 'Local Whisper';
const NETWORK_ERROR_PATTERN = /econnrefused|econnreset|fetch failed/i;

/** Where transcriptions are sent. Implemented by the runtime manager or an external server setting. */
export interface LocalWhisperEndpoint {
  /** Base URL of a ready server. May start the managed runtime. Throws PromptVoiceError when unavailable. */
  resolveBaseUrl(): Promise<string>;
  /** Model name for logs, for example `base`, or `external` for a user-run server. */
  modelLabel(): string;
  /** Shared across requests; the pipeline builds a new provider for each one. */
  queue: TranscriptionQueue;
}

/**
 * Runs transcriptions one at a time and rejects new work once `maxPending` requests are
 * in flight or waiting, so a burst of dictations can't pile up behind a slow model.
 */
export class TranscriptionQueue {
  private pending = 0;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly maxPending: number = LOCAL_WHISPER_MAX_PENDING) {}

  get size(): number {
    return this.pending;
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    if (this.pending >= this.maxPending) {
      return Promise.reject(
        new PromptVoiceError('STT_FAILED', 'Local Whisper is still working on earlier recordings. Try again in a moment.', {
          detail: `Local Whisper queue full (${this.pending} pending)`
        })
      );
    }
    this.pending += 1;
    // Decrement inside the promise the caller awaits, so the slot is free by the time they see the result.
    const result = this.tail.then(task).finally(() => {
      this.pending -= 1;
    });
    // The chain continues whether or not this task fails.
    this.tail = result.catch(() => undefined);
    return result;
  }
}

/**
 * Transcribes with a whisper.cpp server on this machine. Expects 16 kHz WAV, which the app
 * produces, so the managed runtime never needs FFmpeg. Never falls back to a cloud provider.
 */
export class LocalWhisperSttProvider implements SttProvider {
  readonly id = 'local-whisper' as const;
  readonly model: string;

  constructor(
    private readonly endpoint: LocalWhisperEndpoint,
    private readonly fetchImpl: FetchLike
  ) {
    this.model = endpoint.modelLabel();
  }

  async transcribe(audio: AudioInput, language: string): Promise<string> {
    if (audio.mimeType !== 'audio/wav') {
      throw new PromptVoiceError('AUDIO_TYPE_UNSUPPORTED', 'Local Whisper needs a WAV recording. Reload Prompt Voice and try again.', {
        detail: `Local Whisper received ${audio.mimeType}`
      });
    }
    return this.endpoint.queue.run(() => this.send(audio, language));
  }

  private async send(audio: AudioInput, language: string): Promise<string> {
    const baseUrl = await this.endpoint.resolveBaseUrl();
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audio.buffer)], { type: audio.mimeType }), audio.fileName);
    form.append('response_format', 'json');
    form.append('translate', 'false');
    // whisper.cpp takes ISO-639-1 codes or `auto`.
    form.append('language', language && language !== 'auto' ? language.split('-')[0] : 'auto');

    const call: ProviderCall = { label: LABEL, code: 'STT_FAILED', model: this.model };
    let response: Response;
    try {
      response = await sendRequest(
        this.fetchImpl,
        `${baseUrl}/inference`,
        { method: 'POST', body: form, redirect: 'error' },
        call,
        { timeoutMs: LOCAL_WHISPER_TIMEOUT_MS }
      );
    } catch (error) {
      throw describeLocalFailure(error, this.model);
    }
    const body = await parseJsonResponse<{ text?: unknown } | null>(response, call);
    if (typeof body?.text !== 'string') {
      throw new PromptVoiceError('STT_FAILED', 'Local Whisper returned an unreadable response. Try again.', {
        detail: `Local Whisper response had no text field for model ${this.model}`
      });
    }
    return body.text.trim();
  }
}

/** Replaces cloud-oriented messages (API keys, internet) with ones that fit a local runtime. */
function describeLocalFailure(error: unknown, model: string): unknown {
  if (error instanceof PromptVoiceError) {
    if (error.status === 400) return withMessage(error, "Local Whisper couldn't read this recording. Try again.");
    if (error.status !== undefined) return withMessage(error, 'Local Whisper failed to transcribe this recording. Try again.');
    return error;
  }
  const name = error instanceof Error ? error.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') {
    // The request is abandoned here, but the runtime may still finish the work; the queue absorbs that.
    return new PromptVoiceError('STT_FAILED', 'Local Whisper took too long. Try a shorter recording or a smaller model.', {
      detail: `Local Whisper request timed out after ${LOCAL_WHISPER_TIMEOUT_MS} ms for model ${model}`
    });
  }
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  const message = error instanceof Error ? error.message : '';
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || NETWORK_ERROR_PATTERN.test(message)) {
    return new PromptVoiceError('STT_FAILED', "Local Whisper isn't running. Start it in Prompt Voice settings.", {
      detail: `Local Whisper connection failed for model ${model} (code=${typeof code === 'string' ? code : 'unknown'})`
    });
  }
  return error;
}

function withMessage(error: PromptVoiceError, userMessage: string): PromptVoiceError {
  return new PromptVoiceError(error.code, userMessage, { status: error.status, detail: error.detail });
}
