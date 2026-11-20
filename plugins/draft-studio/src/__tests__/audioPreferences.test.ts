// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MIC_DEVICE_ID,
  DEFAULT_SOUND_CUES_ENABLED,
  DEFAULT_SOUND_CUES_VOLUME,
  parseAudioPreferences
} from '../shared/audioPreferences.ts';
import {
  AUDIO_PREFERENCES_STORAGE_KEY,
  readCachedAudioPreferences,
  tryReadCachedAudioPreferences,
  writeCachedAudioPreferences
} from '../app/audioPreferencesStorage.ts';
import { listAudioInputDevices } from '../app/audioDevices.ts';
import { playSoundCue, resetSoundCueContext } from '../app/soundCues.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetSoundCueContext();
});

describe('parseAudioPreferences', () => {
  it('applies defaults for empty or missing input', () => {
    expect(parseAudioPreferences({})).toEqual({
      micDeviceId: DEFAULT_MIC_DEVICE_ID,
      micLabel: '',
      soundCuesEnabled: DEFAULT_SOUND_CUES_ENABLED,
      soundCuesVolume: DEFAULT_SOUND_CUES_VOLUME
    });
    expect(parseAudioPreferences(null)).toEqual({
      micDeviceId: DEFAULT_MIC_DEVICE_ID,
      micLabel: '',
      soundCuesEnabled: true,
      soundCuesVolume: 75
    });
  });

  it('normalizes device id, label, boolean strings, and clamped volume', () => {
    expect(
      parseAudioPreferences({
        micDeviceId: '  usb-yeti  ',
        micLabel: '  Blue Yeti  ',
        soundCuesEnabled: 'false',
        soundCuesVolume: '140'
      })
    ).toEqual({
      micDeviceId: 'usb-yeti',
      micLabel: 'Blue Yeti',
      soundCuesEnabled: false,
      soundCuesVolume: 100
    });

    expect(
      parseAudioPreferences({
        micDeviceId: 'default',
        micLabel: 'Should Clear',
        soundCuesEnabled: false,
        soundCuesVolume: -20
      })
    ).toEqual({
      micDeviceId: 'default',
      micLabel: '',
      soundCuesEnabled: false,
      soundCuesVolume: 0
    });
  });
});

describe('audioPreferencesStorage', () => {
  it('round-trips preferences through localStorage and handles corrupt or unavailable storage', () => {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
      removeItem: (k: string) => { map.delete(k); },
      clear: () => { map.clear(); }
    });

    expect(tryReadCachedAudioPreferences()).toBeNull();

    writeCachedAudioPreferences({
      micDeviceId: 'mic-42',
      micLabel: 'Desk Mic',
      soundCuesEnabled: false,
      soundCuesVolume: 35
    });

    expect(tryReadCachedAudioPreferences()).toEqual({
      micDeviceId: 'mic-42',
      micLabel: 'Desk Mic',
      soundCuesEnabled: false,
      soundCuesVolume: 35
    });

    map.set(AUDIO_PREFERENCES_STORAGE_KEY, '{not-json');
    expect(tryReadCachedAudioPreferences()).toBeNull();
    expect(readCachedAudioPreferences()).toEqual({
      micDeviceId: 'default',
      micLabel: '',
      soundCuesEnabled: true,
      soundCuesVolume: 75
    });

    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('SecurityError'); }
    });
    expect(tryReadCachedAudioPreferences()).toBeNull();
  });
});

describe('listAudioInputDevices', () => {
  it('separates synthetic default device and filters non-audioinput entries', async () => {
    const enumerateDevices = vi.fn(async () => [
      { deviceId: 'default', kind: 'audioinput', label: 'Default - Built-in Mic', groupId: '1' },
      { deviceId: 'usb-1', kind: 'audioinput', label: 'Blue Yeti', groupId: '2' },
      { deviceId: 'spk-1', kind: 'audiooutput', label: 'Speakers', groupId: '3' }
    ] as MediaDeviceInfo[]);

    const result = await listAudioInputDevices({ mediaDevices: { enumerateDevices } });
    expect(result.supported).toBe(true);
    expect(result.defaultDeviceLabel).toBe('Built-in Mic');
    expect(result.labelsAvailable).toBe(true);
    expect(result.devices).toEqual([
      { deviceId: 'usb-1', label: 'Blue Yeti', isDefault: false }
    ]);
  });

  it('requests permission on refresh when labels are hidden and stops temporary tracks', async () => {
    let granted = false;
    const stopTrack = vi.fn();
    const enumerateDevices = vi.fn(async () => [
      { deviceId: 'mic-a', kind: 'audioinput', label: granted ? 'Studio Mic' : '', groupId: '1' }
    ] as MediaDeviceInfo[]);
    const getUserMedia = vi.fn(async () => {
      granted = true;
      return { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
    });

    const initial = await listAudioInputDevices({ mediaDevices: { enumerateDevices, getUserMedia } });
    expect(initial.labelsAvailable).toBe(false);
    expect(initial.devices[0]?.label).toBe('Microphone 1');
    expect(getUserMedia).not.toHaveBeenCalled();

    const refreshed = await listAudioInputDevices({
      requestPermissionIfUnlabeled: true,
      mediaDevices: { enumerateDevices, getUserMedia }
    });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(refreshed.labelsAvailable).toBe(true);
    expect(refreshed.devices[0]?.label).toBe('Studio Mic');
  });

  it('reports permissionDenied when getUserMedia rejects with NotAllowedError', async () => {
    const err = new Error('Denied');
    err.name = 'NotAllowedError';
    const result = await listAudioInputDevices({
      requestPermissionIfUnlabeled: true,
      mediaDevices: {
        enumerateDevices: async () => [{ deviceId: 'mic-a', kind: 'audioinput', label: '', groupId: '1' } as MediaDeviceInfo],
        getUserMedia: async () => { throw err; }
      }
    });
    expect(result.permissionDenied).toBe(true);
  });

  it('catches enumerateDevices rejections and returns a user-facing error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = await listAudioInputDevices({
      mediaDevices: {
        enumerateDevices: async () => { throw new Error('Hardware bus error'); }
      }
    });
    expect(warn).toHaveBeenCalled();
    expect(result.devices).toEqual([]);
    expect(result.error).toBe('Could not list microphones. Using System default.');
    expect(result.permissionDenied).toBe(false);
  });
});

describe('playSoundCue', () => {
  it('synthesizes tones scaled by volume when enabled and skips when disabled or zero', () => {
    const startOsc = vi.fn();
    const stopOsc = vi.fn();
    const setFreq = vi.fn();
    const ramp = vi.fn();

    vi.stubGlobal('AudioContext', class {
      state = 'running';
      currentTime = 1;
      destination = {};
      resume = vi.fn(async () => undefined);
      createOscillator = () => ({
        type: 'sine',
        frequency: { setValueAtTime: setFreq },
        connect: vi.fn(),
        start: startOsc,
        stop: stopOsc
      });
      createGain = () => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: ramp
        },
        connect: vi.fn()
      });
    });

    expect(playSoundCue('start', { enabled: false, volume: 80 })).toBeNull();
    expect(startOsc).not.toHaveBeenCalled();

    playSoundCue('start', { enabled: true, volume: 0 });
    expect(startOsc).not.toHaveBeenCalled();

    const cue = playSoundCue('start', { enabled: true, volume: 50 });
    expect(cue).toBeInstanceOf(Promise);
    expect(startOsc).toHaveBeenCalledTimes(2);
    expect(stopOsc).toHaveBeenCalledTimes(2);
    expect(setFreq).toHaveBeenCalledWith(523.25, 1);

    playSoundCue('stop', { enabled: true, volume: 50 });
    playSoundCue('complete', { enabled: true, volume: 50 });
    playSoundCue('error', { enabled: true, volume: 50 });
    expect(startOsc).toHaveBeenCalledTimes(7);
  });

  it('awaits suspended context resume before scheduling and resolves on oscillator ended', async () => {
    const startOsc = vi.fn();
    const listeners: Array<() => void> = [];
    let resolveResume!: () => void;

    vi.stubGlobal('AudioContext', class {
      state: AudioContextState = 'suspended';
      currentTime = 0;
      destination = {};
      resume = vi.fn(() => new Promise<void>((resolve) => {
        resolveResume = () => {
          this.state = 'running';
          this.currentTime = 0.5;
          resolve();
        };
      }));
      createOscillator = () => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: startOsc,
        stop: vi.fn(),
        addEventListener: (_type: string, cb: () => void) => { listeners.push(cb); },
        removeEventListener: vi.fn()
      });
      createGain = () => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      });
    });

    let settled = false;
    const cue = playSoundCue('stop', { enabled: true, volume: 75 })!.then(() => { settled = true; });
    expect(startOsc).not.toHaveBeenCalled();

    resolveResume();
    await vi.waitFor(() => expect(startOsc).toHaveBeenCalledWith(0.5));
    expect(settled).toBe(false);

    // Firing the final oscillator ended event resolves playback immediately
    listeners.at(-1)?.();
    await cue;
    expect(settled).toBe(true);
  });

  it('resolves safely without starting oscillators when resume fails', async () => {
    const startOsc = vi.fn();
    vi.stubGlobal('AudioContext', class {
      state: AudioContextState = 'suspended';
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => { throw new Error('AudioContext blocked'); });
      createOscillator = () => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: startOsc,
        stop: vi.fn()
      });
      createGain = () => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      });
    });

    await expect(playSoundCue('start', { enabled: true, volume: 75 })).resolves.toBeUndefined();
    expect(startOsc).not.toHaveBeenCalled();
  });
});
