import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listAudioInputDevices,
  subscribeAudioDeviceChanges,
  type AudioInputDevice
} from './audioDevices.ts';

export interface AudioDevicesState {
  devices: AudioInputDevice[];
  defaultDeviceLabel: string | null;
  labelsAvailable: boolean;
  permissionDenied: boolean;
  error: string | null;
  isRefreshing: boolean;
  refresh: (requestPermissionIfUnlabeled?: boolean) => Promise<void>;
}

/** Enumerates audio input microphones and subscribes to hardware device changes safely. */
export function useAudioDevices(): AudioDevicesState {
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [defaultDeviceLabel, setDefaultDeviceLabel] = useState<string | null>(null);
  const [labelsAvailable, setLabelsAvailable] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async (requestPermissionIfUnlabeled = false) => {
    const requestId = ++requestIdRef.current;
    if (mountedRef.current) setIsRefreshing(true);
    try {
      const result = await listAudioInputDevices({ requestPermissionIfUnlabeled });
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      setDevices(result.devices);
      setDefaultDeviceLabel(result.defaultDeviceLabel);
      setLabelsAvailable(result.labelsAvailable);
      setPermissionDenied(result.permissionDenied);
      setError(result.error);
    } catch (err) {
      console.warn('Prompt Voice audio device lookup failed', err);
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      setDevices([]);
      setError('Could not list microphones. Using System default.');
    } finally {
      if (mountedRef.current && requestIdRef.current === requestId) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh(false);
    const unsubscribe = subscribeAudioDeviceChanges(() => {
      void refresh(false);
    });
    return () => {
      mountedRef.current = false;
      requestIdRef.current++;
      unsubscribe();
    };
  }, [refresh]);

  return { devices, defaultDeviceLabel, labelsAvailable, permissionDenied, error, isRefreshing, refresh };
}
