import {
  LLM_PROVIDER_IDS,
  STT_PROVIDER_IDS,
  TONE_IDS,
  type LlmProviderId,
  type SttProviderId,
  type ToneId
} from '../shared/protocol.ts';

export const DICTIONARY_MAX_TERMS = 200;
export const DICTIONARY_MAX_TERM_LENGTH = 80;
export const CUSTOM_PROMPT_MAX_CHARS = 2000;
export const DEFAULT_INPUT_LANGUAGE = 'auto';

/** Settings as the rest of the server consumes them. Keys are kept out of logs and out of the UI. */
export interface PromptVoiceSettings {
  sttProvider: SttProviderId;
  /** Empty string means "use the provider default". */
  sttModel: string;
  llmProvider: LlmProviderId;
  /** Empty string means "use the provider default". */
  llmModel: string;
  tone: ToneId;
  customPrompt: string;
  dictionary: string[];
  inputLanguage: string;
  keys: {
    openai: string;
    google: string;
    anthropic: string;
  };
}

export type ApiKeyName = keyof PromptVoiceSettings['keys'];

/**
 * API key each key-based provider needs. This is the single source for the provider factories and
 * the status RPC. Providers not listed (system, assistant, none) need no key.
 */
export const STT_PROVIDER_KEYS: Readonly<Record<string, ApiKeyName>> = {
  openai: 'openai',
  'google-gemini': 'google'
};
export const LLM_PROVIDER_KEYS: Readonly<Record<string, ApiKeyName>> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google'
};

/** Provider name shown in "add your API key" messages. */
export const API_KEY_LABELS: Readonly<Record<ApiKeyName, string>> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI'
};

/**
 * Settings are declared here so Zana renders the settings UI.
 * The defaults use Zana host voice transcription and the Zana assistant, so no API key is needed;
 * keys are only required for the optional direct-API providers.
 */
export const SETTING_DESCRIPTORS = {
  sttProvider: {
    type: 'select' as const,
    label: 'Speech-to-text provider',
    description: 'Uses Zana host voice transcription by default without needing an API key.',
    options: [...STT_PROVIDER_IDS],
    default: 'system'
  },
  sttModel: {
    type: 'string' as const,
    label: 'Speech-to-text model',
    description: 'Applies to OpenAI and Google Gemini only; leave empty for the provider default. System transcription always uses the host-configured model.'
  },
  llmProvider: {
    type: 'select' as const,
    label: 'Cleanup (LLM) provider',
    description: 'Refines the transcript using an existing Zana AI provider or assistant. Choose None to insert the raw transcript.',
    options: [...LLM_PROVIDER_IDS],
    default: 'assistant'
  },
  llmModel: {
    type: 'string' as const,
    label: 'Cleanup model',
    description: 'Applies to OpenAI, Anthropic, and Google only; leave empty for the provider default. The Zana assistant always uses its own model.'
  },
  tone: {
    type: 'select' as const,
    label: 'Tone',
    options: [...TONE_IDS],
    default: 'conversational'
  },
  customPrompt: {
    type: 'string' as const,
    label: 'Custom instructions',
    description: 'Used when Tone is Custom prompt.',
    multiline: true as const,
  },
  dictionary: {
    type: 'string' as const,
    label: 'Personal dictionary',
    description: 'Names, acronyms, and jargon to spell correctly. One per line or comma-separated.',
    multiline: true as const,
  },
  inputLanguage: {
    type: 'string' as const,
    label: 'Input language',
    description: 'BCP-47 code such as en or de-DE, or auto.',
    default: DEFAULT_INPUT_LANGUAGE
  },
  // Optional keys, needed only by the direct-API providers. The defaults (system, assistant) need none.
  openaiApiKey: {
    type: 'string' as const,
    label: 'OpenAI API key',
    description: 'Only needed for OpenAI speech-to-text or OpenAI cleanup.',
    secret: true as const
  },
  googleApiKey: {
    type: 'string' as const,
    label: 'Google AI API key',
    description: 'Only needed for Google Gemini speech-to-text or Google cleanup.',
    secret: true as const
  },
  anthropicApiKey: {
    type: 'string' as const,
    label: 'Anthropic API key',
    description: 'Only needed for Anthropic cleanup.',
    secret: true as const
  }
};

function asTrimmedString(value: unknown, maxChars: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxChars) : '';
}

function pickOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Splits on commas and newlines, drops empties and duplicates, and enforces the size limits. */
export function parseDictionary(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const seen = new Set<string>();
  const delimiters = /[,\n]/;
  for (const raw of value.split(delimiters)) {
    const term = raw.trim().slice(0, DICTIONARY_MAX_TERM_LENGTH);
    if (term) seen.add(term);
    if (seen.size >= DICTIONARY_MAX_TERMS) break;
  }
  return [...seen];
}

function normalizeLanguage(value: unknown): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  // Providers compare against the exact `auto` sentinel, so `AUTO`/`Auto` must map to it.
  if (!trimmed || trimmed.toLowerCase() === DEFAULT_INPUT_LANGUAGE) return DEFAULT_INPUT_LANGUAGE;
  try {
    // Validate the entire tag, including script, region, variant, and extension subtags.
    // Keep the configured spelling rather than applying locale canonicalization.
    Intl.getCanonicalLocales(trimmed);
    return trimmed;
  } catch {
    // Invalid settings fall back to automatic language detection.
    return DEFAULT_INPUT_LANGUAGE;
  }
}

/** Normalizes raw plugin settings once so the rest of the server never handles raw values. */
export function normalizeSettings(raw: Record<string, unknown>): PromptVoiceSettings {
  return {
    sttProvider: pickOption(raw.sttProvider, STT_PROVIDER_IDS, 'system'),
    sttModel: asTrimmedString(raw.sttModel, 120),
    llmProvider: pickOption(raw.llmProvider, LLM_PROVIDER_IDS, 'assistant'),
    llmModel: asTrimmedString(raw.llmModel, 120),
    tone: pickOption(raw.tone, TONE_IDS, 'conversational'),
    customPrompt: asTrimmedString(raw.customPrompt, CUSTOM_PROMPT_MAX_CHARS),
    dictionary: parseDictionary(raw.dictionary),
    inputLanguage: normalizeLanguage(raw.inputLanguage),
    keys: {
      openai: asTrimmedString(raw.openaiApiKey, 300),
      google: asTrimmedString(raw.googleApiKey, 300),
      anthropic: asTrimmedString(raw.anthropicApiKey, 300)
    }
  };
}
