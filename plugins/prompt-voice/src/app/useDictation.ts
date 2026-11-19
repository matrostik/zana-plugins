import { useComposer, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { DEFAULT_MIC_DEVICE_ID, parseAudioPreferences, type AudioPreferences } from '../shared/audioPreferences.ts';
import { SETTINGS_GET_METHOD, TRANSCRIBE_METHOD, type TranscribeResponse } from '../shared/protocol.ts';
import { appendTranscript } from './appendText.ts';
import {
  readCachedAudioPreferences,
  tryReadCachedAudioPreferences,
  writeCachedAudioPreferences
} from './audioPreferencesStorage.ts';
import { dictationReducer, initialDictationState, type DictationEvent } from './dictationMachine.ts';
import { defaultStartSession, type RecordedAudio, type RecordingSession, type StartRecordingOptions } from './recorder.ts';
import { useSafeComposerView, useSafeZccContext } from './safeSdk.ts';
import { playSoundCue } from './soundCues.ts';
import { prepareAudioForUpload } from './wav.ts';

export const UNEXPECTED_RESPONSE_MESSAGE = 'Prompt Voice returned an unexpected response. Try again.';
export const GENERIC_FAILURE_MESSAGE = 'Dictation failed. Try again.';
export const NOTICE_DISMISS_DELAY_MS = 4000;

function isTranscribeResponse(value: unknown): value is TranscribeResponse {
  return typeof value === 'object' && value !== null && typeof (value as { ok?: unknown }).ok === 'boolean';
}

function isSettingsPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !('ok' in value && 'status' in value);
}

type RpcClient = ReturnType<typeof useRpc>;
type ComposerClient = ReturnType<typeof useComposer>;

interface DictationMetadata {
  projectId?: string;
  threadId?: string;
  audioDurationMs?: number;
}

async function requestTranscription(
  rpc: RpcClient,
  recorded: RecordedAudio,
  meta: DictationMetadata
): Promise<TranscribeResponse> {
  const audio = await prepareAudioForUpload(rpc, recorded);
  const value = await rpc.call(TRANSCRIBE_METHOD, {
    audio: audio.base64,
    mimeType: audio.mimeType,
    source: 'composer',
    ...(meta.projectId ? { projectId: meta.projectId } : {}),
    ...(meta.threadId ? { threadId: meta.threadId } : {}),
    ...(typeof meta.audioDurationMs === 'number' ? { audioDurationMs: meta.audioDurationMs } : {})
  });
  if (!isTranscribeResponse(value)) throw new Error(UNEXPECTED_RESPONSE_MESSAGE);
  return value;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : GENERIC_FAILURE_MESSAGE;
}

function cueOptions(prefs: AudioPreferences) {
  return { enabled: prefs.soundCuesEnabled, volume: prefs.soundCuesVolume };
}

export function applyDictationResult(
  response: TranscribeResponse,
  composer: ComposerClient,
  dispatch: React.Dispatch<DictationEvent>,
  prefs: AudioPreferences = readCachedAudioPreferences()
): void {
  if (!response.ok) {
    playSoundCue('error', cueOptions(prefs));
    dispatch({ type: 'FAILURE', message: response.message });
    return;
  }
  if (response.status === 'no-speech') {
    dispatch({ type: 'NO_SPEECH' });
    return;
  }
  playSoundCue('complete', cueOptions(prefs));
  composer.updateText((draft) => appendTranscript(draft, response.text));
  composer.focus();
  const notice = response.refineNotice
    ? `Inserted the raw transcript. ${response.refineNotice.message}`
    : 'Added to draft.';
  dispatch({ type: 'SUCCESS', notice });
}

function wireSessionCallbacks(
  session: RecordingSession,
  isCurrent: () => boolean,
  onAutoStop: () => void,
  onError: (err: unknown) => void
): RecordingSession | null {
  if (!isCurrent()) {
    session.cancel();
    return null;
  }
  session.onError = (err) => {
    if (!isCurrent()) return;
    onError(err);
  };
  session.onAutoStop = () => {
    if (!isCurrent()) return;
    onAutoStop();
  };
  return session;
}

export interface UseDictationOptions {
  /** Starts a recording. Defaults to the browser microphone; tests inject a fake. */
  startSession?: (options?: StartRecordingOptions) => Promise<RecordingSession>;
  /** Duration in milliseconds before completion notice automatically disappears. Defaults to 4000ms. */
  noticeDurationMs?: number;
}

/**
 * Resolves a starting session into the active one. Stale starts are cancelled and resolve to null.
 * Start and recording failures are reported through `dispatch` only while the start is current.
 */
function settleSessionStart(
  starting: Promise<RecordingSession | null>,
  sessionRef: React.MutableRefObject<RecordingSession | null>,
  isCurrent: () => boolean,
  onAutoStop: () => void,
  dispatch: React.Dispatch<DictationEvent>,
  getPrefs: () => AudioPreferences
): Promise<RecordingSession | null> {
  const fail = (err: unknown) => {
    playSoundCue('error', cueOptions(getPrefs()));
    dispatch({ type: 'FAILURE', message: errorMessage(err) });
  };
  return starting.then(
    (session) => {
      if (!session) return null;
      const wired = wireSessionCallbacks(session, isCurrent, onAutoStop, (err) => {
        sessionRef.current = null;
        fail(err);
      });
      if (wired) sessionRef.current = wired;
      return wired;
    },
    (err: unknown) => {
      if (isCurrent()) fail(err);
      return null;
    }
  );
}

/**
 * Owns the recording session lifecycle: starting (with cancellation of stale starts),
 * handing the active session over for stopping, and cancelling on unmount.
 * UI state changes go through `dispatch`; transcription stays in useDictation.
 */
function useRecordingLifecycle(
  startSession: (options?: StartRecordingOptions) => Promise<RecordingSession>,
  dispatch: React.Dispatch<DictationEvent>,
  getPrefs: () => AudioPreferences
) {
  const sessionRef = useRef<RecordingSession | null>(null);
  const pendingStartRef = useRef<Promise<RecordingSession | null> | null>(null);
  const startIdRef = useRef(0);
  const mountedRef = useRef(true);

  const cancel = useCallback(() => {
    startIdRef.current++;
    pendingStartRef.current = null;
    if (sessionRef.current) {
      sessionRef.current.cancel();
      sessionRef.current = null;
    }
    dispatch({ type: 'CANCEL' });
  }, [dispatch]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  /** Waits for an in-flight start, then detaches and returns the session to stop. */
  const takeSession = useCallback(async (): Promise<RecordingSession | null> => {
    const session = pendingStartRef.current ? await pendingStartRef.current : sessionRef.current;
    sessionRef.current = null;
    return session;
  }, []);

  const start = useCallback(async (onAutoStop: () => void, prefs: AudioPreferences) => {
    const startId = ++startIdRef.current;
    const isCurrent = () => mountedRef.current && startIdRef.current === startId;
    // Play start chime before opening capture so speaker playback never enters the recording.
    const cuePromise = playSoundCue('start', cueOptions(prefs));
    const launch = async (): Promise<RecordingSession | null> => {
      if (cuePromise) {
        await cuePromise;
        if (!isCurrent()) return null;
      }
      return await (prefs.micDeviceId !== DEFAULT_MIC_DEVICE_ID
        ? startSession({ deviceId: prefs.micDeviceId })
        : startSession());
    };
    const pending = settleSessionStart(launch(), sessionRef, isCurrent, onAutoStop, dispatch, getPrefs);
    pendingStartRef.current = pending;
    const session = await pending;
    if (session && isCurrent()) dispatch({ type: 'STARTED' });
    if (pendingStartRef.current === pending) pendingStartRef.current = null;
  }, [dispatch, getPrefs, startSession]);

  const isMounted = useCallback(() => mountedRef.current, []);

  const getAudioLevel = useCallback(() => sessionRef.current?.getAudioLevel?.() ?? null, []);
  return { start, takeSession, cancel, isMounted, getAudioLevel };
}

export function useDictation({
  startSession = defaultStartSession,
  noticeDurationMs = NOTICE_DISMISS_DELAY_MS
}: UseDictationOptions = {}) {
  const composer = useComposer();
  const composerView = useSafeComposerView();
  const zccContext = useSafeZccContext();
  const rpc = useRpc();
  const rpcRef = useRef(rpc);
  rpcRef.current = rpc;
  const [state, dispatch] = useReducer(dictationReducer, initialDictationState);
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;
  const serverPrefsRef = useRef<AudioPreferences | null>(null);
  const activePrefsRef = useRef<AudioPreferences>(readCachedAudioPreferences());
  const recordingStartedAtRef = useRef<number | null>(null);
  const getPrefs = useCallback(() => activePrefsRef.current, []);
  const { start, takeSession, cancel, isMounted, getAudioLevel } = useRecordingLifecycle(startSession, dispatch, getPrefs);
  const [level, setLevel] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [autoStopped, setAutoStopped] = useState(false);

  const scope = composerView?.scope;
  const scopeProjectId = scope && typeof scope === 'object' ? scope.projectId : undefined;
  const scopeThreadId = scope && typeof scope === 'object' ? scope.threadId : undefined;
  const contextRef = useRef<{ projectId?: string; threadId?: string }>({});
  contextRef.current = {
    projectId: scopeProjectId || zccContext?.projectId || undefined,
    threadId: scopeThreadId || zccContext?.threadId || undefined
  };

  // Sync saved audio preferences from server once on mount so cold webviews honor saved mic/cues.
  useEffect(() => {
    let active = true;
    rpcRef.current
      .call(SETTINGS_GET_METHOD)
      .then((res) => {
        if (!active || !isSettingsPayload(res)) return;
        const synced = writeCachedAudioPreferences(res);
        serverPrefsRef.current = synced;
        // Never overwrite an active dictation session's mid-session preferences snapshot.
        if (phaseRef.current === 'idle' || phaseRef.current === 'error') {
          activePrefsRef.current = synced;
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (state.phase !== 'recording') {
      setLevel(null);
      setSeconds(0);
      return;
    }
    const startedAt = Date.now();
    recordingStartedAtRef.current = startedAt;
    const update = () => {
      setLevel(getAudioLevel());
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    update();
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [getAudioLevel, state.phase]);

  // Automatically dismiss notice after noticeDurationMs
  useEffect(() => {
    if (!state.notice) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'CLEAR_NOTICE' });
    }, noticeDurationMs);
    return () => clearTimeout(timer);
  }, [noticeDurationMs, state.notice]);

  const clearNotice = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTICE' });
  }, []);

  const finishDictation = useCallback(async () => {
    const prefs = activePrefsRef.current;
    const startedAt = recordingStartedAtRef.current;
    recordingStartedAtRef.current = null;
    const audioDurationMs = startedAt !== null ? Math.max(0, Date.now() - startedAt) : undefined;
    dispatch({ type: 'STOP' });
    const session = await takeSession();
    if (!isMounted() || !session) return;

    try {
      const audio = await session.stop();
      if (!isMounted()) return;

      // Play stop chime only after capture has stopped so it cannot bleed into the recording.
      playSoundCue('stop', cueOptions(prefs));
      const response = await requestTranscription(rpc, audio, {
        ...contextRef.current,
        audioDurationMs
      });
      if (!isMounted()) return;

      applyDictationResult(response, composer, dispatch, prefs);
    } catch (err) {
      if (!isMounted()) return;
      playSoundCue('error', cueOptions(prefs));
      dispatch({ type: 'FAILURE', message: errorMessage(err) });
    }
  }, [composer, isMounted, rpc, takeSession]);

  const beginDictation = useCallback(async () => {
    const prefs = tryReadCachedAudioPreferences() ?? serverPrefsRef.current ?? parseAudioPreferences({});
    activePrefsRef.current = prefs;
    setAutoStopped(false);
    dispatch({ type: 'START' });
    await start(() => {
      setAutoStopped(true);
      void finishDictation();
    }, prefs);
  }, [finishDictation, start]);

  const onClick = useCallback(() => {
    if (state.phase === 'recording' || state.phase === 'starting') void finishDictation();
    else if (state.phase !== 'processing') void beginDictation();
  }, [beginDictation, finishDictation, state.phase]);

  return {
    phase: state.phase,
    error: state.error,
    notice: state.notice,
    level,
    seconds,
    autoStopped,
    onClick,
    cancel,
    clearNotice,
    beginDictation,
    finishDictation
  };
}
