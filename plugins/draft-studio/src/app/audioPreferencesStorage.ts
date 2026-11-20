import {
  DEFAULT_MIC_DEVICE_ID,
  parseAudioPreferences,
  type AudioPreferences
} from '../shared/audioPreferences.ts';

export const AUDIO_PREFERENCES_STORAGE_KEY = 'zcc:draft-studio:audio-prefs:v1';

/**
 * Reads cached audio preferences if localStorage is available and contains a valid entry.
 * Returns null when storage is missing, disabled, empty, or corrupt so callers can distinguish
 * a cache miss from explicit default preferences.
 */
export function tryReadCachedAudioPreferences(): AudioPreferences | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(AUDIO_PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parseAudioPreferences(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Reads cached audio preferences synchronously for immediate dictation startup. */
export function readCachedAudioPreferences(): AudioPreferences {
  return tryReadCachedAudioPreferences() ?? parseAudioPreferences({});
}

/** Caches audio preferences in localStorage so Composer MicButton and Studio stay in sync. */
export function writeCachedAudioPreferences(raw: Record<string, unknown> | AudioPreferences): AudioPreferences {
  const normalized = parseAudioPreferences(raw as Record<string, unknown>);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        AUDIO_PREFERENCES_STORAGE_KEY,
        JSON.stringify({
          micDeviceId: normalized.micDeviceId,
          micLabel: normalized.micDeviceId === DEFAULT_MIC_DEVICE_ID ? '' : normalized.micLabel,
          soundCuesEnabled: String(normalized.soundCuesEnabled),
          soundCuesVolume: String(normalized.soundCuesVolume)
        })
      );
    }
  } catch {
    // Ignore storage quota or sandbox errors
  }
  return normalized;
}
