export const DEFAULT_MIC_DEVICE_ID = 'default';
export const DEFAULT_SOUND_CUES_ENABLED = true;
export const DEFAULT_SOUND_CUES_VOLUME = 75;
export const MIC_DEVICE_ID_MAX_CHARS = 256;
export const MIC_LABEL_MAX_CHARS = 200;

export interface AudioPreferences {
  micDeviceId: string;
  micLabel: string;
  soundCuesEnabled: boolean;
  soundCuesVolume: number;
}

/** Normalizes a stored microphone device ID, falling back to `default`. */
export function normalizeMicDeviceId(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_MIC_DEVICE_ID;
  const trimmed = value.trim().slice(0, MIC_DEVICE_ID_MAX_CHARS);
  if (!trimmed || trimmed === DEFAULT_MIC_DEVICE_ID) return DEFAULT_MIC_DEVICE_ID;
  return trimmed;
}

/** Normalizes a stored microphone human-readable label. */
export function normalizeMicLabel(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MIC_LABEL_MAX_CHARS);
}

/** Parses sound cue enablement, defaulting to true unless explicitly false. */
export function parseSoundCuesEnabled(value: unknown): boolean {
  if (value === false) return false;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'false') return false;
  return DEFAULT_SOUND_CUES_ENABLED;
}

/** Parses and clamps chime volume to an integer between 0 and 100. */
export function parseSoundCuesVolume(value: unknown): number {
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(num)) return DEFAULT_SOUND_CUES_VOLUME;
  return Math.round(Math.min(100, Math.max(0, num)));
}

/** Extracts normalized audio preferences from raw settings records. */
export function parseAudioPreferences(raw: Record<string, unknown> | null | undefined): AudioPreferences {
  const source = raw ?? {};
  const micDeviceId = normalizeMicDeviceId(source.micDeviceId);
  return {
    micDeviceId,
    micLabel: micDeviceId === DEFAULT_MIC_DEVICE_ID ? '' : normalizeMicLabel(source.micLabel),
    soundCuesEnabled: parseSoundCuesEnabled(source.soundCuesEnabled),
    soundCuesVolume: parseSoundCuesVolume(source.soundCuesVolume)
  };
}
