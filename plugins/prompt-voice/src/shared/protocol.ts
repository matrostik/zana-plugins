/**
 * Types shared by the plugin server and the composer UI. Keep this file free of
 * Node and browser imports so both bundles can use it.
 */

/** RPC method names. Shared so the composer and the server agree without importing each other. */
export const TRANSCRIBE_METHOD = 'promptVoice.transcribe';
export const STATUS_METHOD = 'promptVoice.status';
export const REPHRASE_METHOD = 'promptVoice.rephrase';
export const AVAILABLE_MODELS_METHOD = 'promptVoice.availableModels';

export const STT_PROVIDER_IDS = ['system', 'google-gemini', 'openai'] as const;
export type SttProviderId = (typeof STT_PROVIDER_IDS)[number] | string;

/**
 * Cleanup engines. Agent-thread providers (Claude Code, Codex, ...) are intentionally excluded:
 * they are full coding agents with tool access, and dictated text must never run as an agent prompt.
 * Listed with 'none' first, then AI providers alphabetically by display name (Anthropic, Google AI, OpenAI, Zana Assistant).
 */
export const LLM_PROVIDER_IDS = ['none', 'anthropic', 'google', 'openai', 'assistant'] as const;
export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number] | string;

export const TONE_IDS = ['formal', 'casual', 'technical', 'conversational', 'custom'] as const;
export type ToneId = (typeof TONE_IDS)[number];

/** Stable error codes. The UI maps these to messages; `message` is already user-safe. */
export type PromptVoiceErrorCode =
  | 'MISSING_KEY'
  | 'AUDIO_EMPTY'
  | 'AUDIO_TOO_LARGE'
  | 'AUDIO_TYPE_UNSUPPORTED'
  | 'STT_FAILED'
  | 'LLM_FAILED'
  | 'INTERNAL';

export interface TranscribeRequest {
  /** Base64-encoded audio bytes from MediaRecorder. */
  audio: string;
  /** MIME type reported by MediaRecorder, for example `audio/webm;codecs=opus`. */
  mimeType: string;
  /** BCP-47 code or `auto`. Defaults to the plugin setting. */
  language?: string;
  /** Skip automatic cleanup for Studio's editable input draft. */
  transcriptionOnly?: boolean;
}

/** Set when transcription succeeded but LLM cleanup did not; the raw text is still returned. */
export interface RefineNotice {
  code: PromptVoiceErrorCode;
  message: string;
}

export interface TranscribeSuccess {
  ok: true;
  status: 'ok';
  rawText: string;
  text: string;
  sttProvider: SttProviderId;
  llmProvider: LlmProviderId;
  llmModel: string | null;
  refineNotice?: RefineNotice;
}

export interface TranscribeNoSpeech {
  ok: true;
  status: 'no-speech';
}

export interface TranscribeFailure {
  ok: false;
  code: PromptVoiceErrorCode;
  message: string;
}

export type TranscribeResponse = TranscribeSuccess | TranscribeNoSpeech | TranscribeFailure;

export interface StatusResponse {
  sttProvider: SttProviderId;
  sttKeyConfigured: boolean;
  llmProvider: LlmProviderId;
  llmKeyConfigured: boolean;
  availableProviders?: string[];
}

export interface DiscoveredModel {
  id: string;
  label: string;
}

export interface DiscoveredProvider {
  providerId: string;
  displayName: string;
  models: DiscoveredModel[];
  error?: string | null;
}

export type AvailableModelsResponse = DiscoveredProvider[];

export interface RephraseRequest {
  text: string;
  tone?: ToneId | string;
  customPrompt?: string;
  llmProvider?: LlmProviderId;
  llmModel?: string;
}

export interface RephraseSuccess {
  ok: true;
  rawText: string;
  text: string;
  llmProvider: LlmProviderId;
  llmModel: string | null;
  durationMs: number;
}

export interface RephraseFailure {
  ok: false;
  code: PromptVoiceErrorCode;
  message: string;
}

export type RephraseResponse = RephraseSuccess | RephraseFailure;
