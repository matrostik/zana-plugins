/**
 * Types shared by the plugin server and the composer UI. Keep this file free of
 * Node and browser imports so both bundles can use it.
 */

/** RPC method names. Shared so the composer and the server agree without importing each other. */
export const TRANSCRIBE_METHOD = 'promptVoice.transcribe';
export const STATUS_METHOD = 'promptVoice.status';
export const REPHRASE_METHOD = 'promptVoice.rephrase';
export const AVAILABLE_MODELS_METHOD = 'promptVoice.availableModels';
export const SETTINGS_GET_METHOD = 'promptVoice.settings.get';
export const SETTINGS_UPDATE_METHOD = 'promptVoice.settings.update';
export const HISTORY_LIST_METHOD = 'promptVoice.history.list';
export const HISTORY_STAR_METHOD = 'promptVoice.history.star';
export const HISTORY_DELETE_METHOD = 'promptVoice.history.delete';
export const HISTORY_CLEAR_METHOD = 'promptVoice.history.clear';
export const HISTORY_PROJECTS_METHOD = 'promptVoice.history.projects';

/** Realtime channel published when host-owned plugin settings change. */
export const SETTINGS_CHANGED_EVENT = 'promptVoice:settingsChanged';
/** Realtime channel published when background provider model discovery updates the catalog. */
export const MODELS_UPDATED_EVENT = 'promptVoice:modelsUpdated';
/** Realtime channel published when activity history or its recording settings change. */
export const HISTORY_CHANGED_EVENT = 'promptVoice:historyChanged';

/** Local Whisper management. Each returns a LocalWhisperResponse. */
export const LOCAL_WHISPER_METHODS = {
  state: 'promptVoice.localWhisper.state',
  installRuntime: 'promptVoice.localWhisper.installRuntime',
  cancelRuntimeInstall: 'promptVoice.localWhisper.cancelRuntimeInstall',
  downloadModel: 'promptVoice.localWhisper.downloadModel',
  cancelModelDownload: 'promptVoice.localWhisper.cancelModelDownload',
  removeModel: 'promptVoice.localWhisper.removeModel',
  selectModel: 'promptVoice.localWhisper.selectModel',
  start: 'promptVoice.localWhisper.start',
  stop: 'promptVoice.localWhisper.stop'
} as const;

export interface LocalWhisperModelView {
  id: string;
  label: string;
  sizeBytes: number;
  memoryEstimate?: string;
  recommended: boolean;
  status: 'available' | 'downloading' | 'installed';
  /** 0..1 while downloading. */
  progress?: number;
}

export interface LocalWhisperStateView {
  platform: { supported: true } | { supported: false; message: string };
  runtime: { status: 'not-installed' | 'installing' | 'installed'; version: string; requirements: string[]; progress?: number };
  server: { state: 'stopped' | 'starting' | 'running' | 'crashed'; modelId?: string; exitCode?: number | null };
  activeModelId: string | null;
  models: LocalWhisperModelView[];
  lastError: { operation: string; code: string; message: string } | null;
}

/** `state` is null only when Local Whisper could not be initialized at all. */
export type LocalWhisperResponse =
  | { ok: true; state: LocalWhisperStateView }
  | { ok: false; code: string; message: string; state: LocalWhisperStateView | null };

export const STT_PROVIDER_IDS = ['system', 'google-gemini', 'openai', 'local-whisper'] as const;
export type SttProviderId = (typeof STT_PROVIDER_IDS)[number] | string;

/**
 * Cleanup engines. Agent-thread providers (Claude Code, Codex, ...) are intentionally excluded:
 * they are full coding agents with tool access, and dictated text must never run as an agent prompt.
 * Listed with 'none' first, then AI providers alphabetically by display name (Anthropic, Google AI, OpenAI, Zana Assistant).
 */
export const LLM_PROVIDER_IDS = ['none', 'anthropic', 'google', 'openai', 'assistant'] as const;
export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number] | string;

export const TONE_IDS = ['standard', 'casual', 'conversational', 'formal', 'technical', 'custom'] as const;
export type ToneId = (typeof TONE_IDS)[number];
export type ImproveToneId = Exclude<ToneId, 'custom'>;

export const ACTIVITY_KINDS = ['dictation', 'dictation_cleanup', 'refinement'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_SOURCES = ['composer', 'home', 'studio'] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

/** Stable error codes. The UI maps these to messages; `message` is already user-safe. */
export type PromptVoiceErrorCode =
  | 'MISSING_KEY'
  | 'AUDIO_EMPTY'
  | 'AUDIO_TOO_LARGE'
  | 'AUDIO_TYPE_UNSUPPORTED'
  | 'INVALID_REQUEST'
  | 'STT_FAILED'
  | 'LLM_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'DOWNLOAD_INTEGRITY'
  | 'DOWNLOAD_NO_SPACE'
  | 'DOWNLOAD_CANCELLED'
  | 'LOCAL_RUNTIME_FAILED'
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
  /** Surface that initiated the dictation (for activity history). */
  source?: ActivitySource;
  /** Active Zana project id when available. */
  projectId?: string | null;
  /** Active Zana thread id when dictated in a thread composer. */
  threadId?: string | null;
  /** Recording duration in milliseconds when measured by the client. */
  audioDurationMs?: number;
  /** Existing history entry id to update when appending dictation to an active Studio draft. */
  historyEntryId?: string | null;
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
  /** History entry id created or updated for this dictation, when history is enabled. */
  historyEntryId?: string | null;
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
  /**
   * Upload format the active speech provider needs. `wav` means the app must convert the
   * recording to 16 kHz mono PCM before transcribing; `recorded` sends it as captured.
   */
  audioFormat: AudioUploadFormat;
  availableProviders?: string[];
}

export type AudioUploadFormat = 'wav' | 'recorded';

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

export interface AvailableModelsRequest {
  refresh?: boolean;
}

export type AvailableModelsResponse = DiscoveredProvider[];

export interface RephraseRequest {
  text: string;
  tone?: ToneId | string;
  /** Preset transformation instruction (e.g. Summarize or Technical Spec), separate from customPrompt. */
  instruction?: string;
  /** Target language code or name when translating text in Prompt Studio. */
  targetLanguage?: string;
  customPrompt?: string;
  llmProvider?: LlmProviderId;
  llmModel?: string;
  /** Surface that initiated the refinement (defaults to `studio`). */
  source?: ActivitySource;
  /** Active Zana project id when available. */
  projectId?: string | null;
  /** Studio preset identifier (improve, executive, spec, custom, translate). */
  presetId?: string;
  /** Existing history entry id to coalesce into when refining an active Studio draft. */
  historyEntryId?: string | null;
}

export interface RephraseSuccess {
  ok: true;
  rawText: string;
  text: string;
  llmProvider: LlmProviderId;
  llmModel: string | null;
  durationMs: number;
  /** History entry id created or updated for this refinement, when history is enabled. */
  historyEntryId?: string | null;
}

export interface RephraseFailure {
  ok: false;
  code: PromptVoiceErrorCode;
  message: string;
}

export type RephraseResponse = RephraseSuccess | RephraseFailure;

export interface HistoryEntry {
  id: string;
  kind: ActivityKind;
  source: ActivitySource;
  createdAt: number;
  projectId: string | null;
  threadId: string | null;
  rawText: string;
  outputText: string;
  sttProvider: string | null;
  sttModel: string | null;
  llmProvider: string | null;
  llmModel: string | null;
  presetId: string | null;
  tone: string | null;
  targetLanguage: string | null;
  customPrompt: string | null;
  audioDurationMs: number | null;
  processingDurationMs: number | null;
  refineNotice: RefineNotice | null;
  starred: boolean;
}

export type HistoryTypeFilter = 'all' | 'dictation' | 'refinement';

export interface HistoryListRequest {
  query?: string;
  type?: HistoryTypeFilter;
  source?: ActivitySource | 'all';
  projectId?: string | null;
  starredOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface HistoryListResponse {
  entries: HistoryEntry[];
  total: number;
  hasMore: boolean;
  historyEnabled: boolean;
  storageAvailable: boolean;
}

export interface HistoryStarRequest {
  id: string;
  starred: boolean;
}

export interface HistoryStarResponse {
  ok: boolean;
  entry?: HistoryEntry;
}

export interface HistoryDeleteRequest {
  id: string;
}

export interface HistoryDeleteResponse {
  ok: boolean;
  deleted: boolean;
}

export interface HistoryClearRequest {
  projectId?: string | null;
  includeStarred?: boolean;
}

export interface HistoryClearResponse {
  ok: boolean;
  deletedCount: number;
}

export interface HistoryProjectOption {
  id: string;
  name: string;
}

export interface HistoryProjectsResponse {
  projects: HistoryProjectOption[];
}

export const PROMPT_STUDIO_PANEL_PATH = 'prompt-studio';
export const PROMPT_STUDIO_PROJECT_TAB_ID = 'prompt-studio';
export const PROMPT_STUDIO_HISTORY_SUBPATH = 'history';
