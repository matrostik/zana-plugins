import {
  LLM_PROVIDER_IDS,
  STT_PROVIDER_IDS,
  TONE_IDS,
  type LlmProviderId,
  type SttProviderId,
  type ToneId
} from '../shared/protocol.ts';
import {
  DICTIONARY_MAX_TERM_LENGTH,
  DICTIONARY_MAX_TERMS,
  parseDictionary
} from '../shared/dictionary.ts';
import { parseAudioPreferences } from '../shared/audioPreferences.ts';
import {
  DEFAULT_MIC_VISIBILITY,
  DEFAULT_SHOW_HOME_WIDGET,
  DEFAULT_SHOW_IN_PROJECTS,
  MIC_VISIBILITY_OPTIONS,
  normalizeVisibilitySettings,
  type MicVisibility
} from '../shared/visibility.ts';

export { DICTIONARY_MAX_TERM_LENGTH, DICTIONARY_MAX_TERMS, parseDictionary };
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
  micDeviceId: string;
  micLabel: string;
  soundCuesEnabled: boolean;
  soundCuesVolume: number;
  showHomeWidget: boolean;
  showInProjects: boolean;
  micVisibility: MicVisibility;
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
  showHomeWidget: {
    type: 'boolean' as const,
    label: 'Show on main Home screen',
    description: 'Show a Prompt Voice quick card on Zana’s main Home screen.',
    default: DEFAULT_SHOW_HOME_WIDGET
  },
  showInProjects: {
    type: 'boolean' as const,
    label: 'Show Prompt Studio tab in projects',
    description: 'Display a Prompt Studio tab inside each project.',
    default: DEFAULT_SHOW_IN_PROJECTS
  },
  micVisibility: {
    type: 'select' as const,
    label: 'Composer mic button placement',
    description: 'Choose where the voice dictation mic appears in composers (both, main, projects, or off).',
    options: [...MIC_VISIBILITY_OPTIONS],
    default: DEFAULT_MIC_VISIBILITY
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
    multiline: true as const
  },
  dictionary: {
    type: 'string' as const,
    label: 'Personal dictionary',
    description: 'Names, acronyms, and jargon to spell correctly. One per line or comma-separated.',
    multiline: true as const
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
  const audio = parseAudioPreferences(raw);
  const visibility = normalizeVisibilitySettings(raw);
  return {
    sttProvider: pickOption(raw.sttProvider, STT_PROVIDER_IDS, 'system'),
    sttModel: asTrimmedString(raw.sttModel, 120),
    llmProvider: pickOption(raw.llmProvider, LLM_PROVIDER_IDS, 'assistant'),
    llmModel: asTrimmedString(raw.llmModel, 120),
    tone: pickOption(raw.tone, TONE_IDS, 'conversational'),
    customPrompt: asTrimmedString(raw.customPrompt, CUSTOM_PROMPT_MAX_CHARS),
    dictionary: parseDictionary(raw.dictionary),
    inputLanguage: normalizeLanguage(raw.inputLanguage),
    micDeviceId: audio.micDeviceId,
    micLabel: audio.micLabel,
    soundCuesEnabled: audio.soundCuesEnabled,
    soundCuesVolume: audio.soundCuesVolume,
    showHomeWidget: visibility.showHomeWidget,
    showInProjects: visibility.showInProjects,
    micVisibility: visibility.micVisibility,
    keys: {
      openai: asTrimmedString(raw.openaiApiKey, 300),
      google: asTrimmedString(raw.googleApiKey, 300),
      anthropic: asTrimmedString(raw.anthropicApiKey, 300)
    }
  };
}
