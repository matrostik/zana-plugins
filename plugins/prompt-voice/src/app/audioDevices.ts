import { DEFAULT_MIC_DEVICE_ID } from '../shared/audioPreferences.ts';

export interface AudioInputDevice {
  deviceId: string;
  label: string;
  isDefault: boolean;
}

export interface AudioDeviceListResult {
  devices: AudioInputDevice[];
  defaultDeviceLabel: string | null;
  labelsAvailable: boolean;
  permissionDenied: boolean;
  supported: boolean;
  error: string | null;
}

export interface MediaDevicesLike {
  enumerateDevices?: () => Promise<MediaDeviceInfo[]>;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
}

function getDefaultMediaDevices(): MediaDevicesLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.mediaDevices as MediaDevicesLike | undefined;
}

function stripDefaultPrefix(label: string): string {
  return label.replace(/^default\s*[-–:]\s*/i, '').trim();
}

function isPermissionError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : '';
  return name === 'NotAllowedError' || name === 'SecurityError';
}

function formatAudioDevices(rawDevices: MediaDeviceInfo[]): {
  devices: AudioInputDevice[];
  defaultDeviceLabel: string | null;
  labelsAvailable: boolean;
} {
  const audioInputs = rawDevices.filter((d) => d.kind === 'audioinput');
  const labelsAvailable = audioInputs.some((d) => Boolean(d.label?.trim()));
  let defaultDeviceLabel: string | null = null;
  const devices: AudioInputDevice[] = [];
  const seenIds = new Set<string>();
  let fallbackIndex = 1;

  for (const input of audioInputs) {
    const rawLabel = input.label?.trim() ?? '';
    if (input.deviceId === DEFAULT_MIC_DEVICE_ID) {
      if (rawLabel) defaultDeviceLabel = stripDefaultPrefix(rawLabel) || rawLabel;
      continue;
    }
    if (!input.deviceId || seenIds.has(input.deviceId)) continue;
    seenIds.add(input.deviceId);
    devices.push({
      deviceId: input.deviceId,
      label: rawLabel || `Microphone ${fallbackIndex}`,
      isDefault: false
    });
    fallbackIndex++;
  }

  return { devices, defaultDeviceLabel, labelsAvailable };
}

type PermissionRefreshResult =
  | { ok: true; rawDevices: MediaDeviceInfo[] }
  | { ok: false; permissionDenied: boolean };

async function refreshDevicesWithPermission(mediaDevices: MediaDevicesLike): Promise<PermissionRefreshResult> {
  if (!mediaDevices.getUserMedia || !mediaDevices.enumerateDevices) {
    return { ok: false, permissionDenied: false };
  }
  try {
    const stream = await mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true, rawDevices: await mediaDevices.enumerateDevices() };
  } catch (err) {
    if (isPermissionError(err)) return { ok: false, permissionDenied: true };
    console.warn('Prompt Voice failed to refresh audio input devices', err);
    return { ok: false, permissionDenied: false };
  }
}

/**
 * Enumerates available audio input microphones, separating any synthetic `default`
 * device entry so Settings always shows a single System default option at the top.
 */
export async function listAudioInputDevices(
  options: { requestPermissionIfUnlabeled?: boolean; mediaDevices?: MediaDevicesLike } = {}
): Promise<AudioDeviceListResult> {
  const mediaDevices = options.mediaDevices ?? getDefaultMediaDevices();
  if (!mediaDevices?.enumerateDevices) {
    return { devices: [], defaultDeviceLabel: null, labelsAvailable: false, permissionDenied: false, supported: false, error: null };
  }

  let rawDevices: MediaDeviceInfo[];
  try {
    rawDevices = await mediaDevices.enumerateDevices();
  } catch (err) {
    console.warn('Prompt Voice failed to enumerate audio input devices', err);
    return {
      devices: [],
      defaultDeviceLabel: null,
      labelsAvailable: false,
      permissionDenied: isPermissionError(err),
      supported: true,
      error: 'Could not list microphones. Using System default.'
    };
  }

  let formatted = formatAudioDevices(rawDevices);
  let permissionDenied = false;

  if (options.requestPermissionIfUnlabeled && !formatted.labelsAvailable) {
    const refreshed = await refreshDevicesWithPermission(mediaDevices);
    if (refreshed.ok) {
      formatted = formatAudioDevices(refreshed.rawDevices);
    } else {
      permissionDenied = refreshed.permissionDenied;
    }
  }

  return { ...formatted, permissionDenied, supported: true, error: null };
}

/** Subscribes to hardware microphone connect/disconnect events. */
export function subscribeAudioDeviceChanges(
  onChange: () => void,
  mediaDevices: MediaDevicesLike | undefined = getDefaultMediaDevices()
): () => void {
  if (!mediaDevices?.addEventListener || !mediaDevices?.removeEventListener) {
    return () => undefined;
  }
  const handler = () => onChange();
  mediaDevices.addEventListener('devicechange', handler);
  return () => mediaDevices.removeEventListener?.('devicechange', handler);
}
