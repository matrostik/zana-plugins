import { useComposer, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { TRANSCRIBE_METHOD, type TranscribeResponse } from '../shared/protocol.ts';
import { appendTranscript } from './appendText.ts';
import { dictationReducer, initialDictationState, type DictationEvent } from './dictationMachine.ts';
import { defaultStartSession, type RecordedAudio, type RecordingSession } from './recorder.ts';

export const UNEXPECTED_RESPONSE_MESSAGE = 'Prompt Voice returned an unexpected response. Try again.';
export const GENERIC_FAILURE_MESSAGE = 'Dictation failed. Try again.';

function isTranscribeResponse(value: unknown): value is TranscribeResponse {
  return typeof value === 'object' && value !== null && typeof (value as { ok?: unknown }).ok === 'boolean';
}

type RpcClient = ReturnType<typeof useRpc>;
type ComposerClient = ReturnType<typeof useComposer>;

async function requestTranscription(rpc: RpcClient, audio: RecordedAudio): Promise<TranscribeResponse> {
  const value = await rpc.call(TRANSCRIBE_METHOD, { audio: audio.base64, mimeType: audio.mimeType });
  if (!isTranscribeResponse(value)) throw new Error(UNEXPECTED_RESPONSE_MESSAGE);
  return value;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : GENERIC_FAILURE_MESSAGE;
}

export function applyDictationResult(
  response: TranscribeResponse,
  composer: ComposerClient,
  dispatch: React.Dispatch<DictationEvent>
): void {
  if (!response.ok) {
    dispatch({ type: 'FAILURE', message: response.message });
    return;
  }
  if (response.status === 'no-speech') {
    dispatch({ type: 'NO_SPEECH' });
    return;
  }
  composer.updateText((draft) => appendTranscript(draft, response.text));
  composer.focus();
  const notice = response.refineNotice
    ? `Inserted the raw transcript. ${response.refineNotice.message}`
    : null;
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
  startSession?: () => Promise<RecordingSession>;
}

/**
 * Resolves a starting session into the active one. Stale starts are cancelled and resolve to null.
 * Start and recording failures are reported through `dispatch` only while the start is current.
 */
function settleSessionStart(
  starting: Promise<RecordingSession>,
  sessionRef: React.MutableRefObject<RecordingSession | null>,
  isCurrent: () => boolean,
  onAutoStop: () => void,
  dispatch: React.Dispatch<DictationEvent>
): Promise<RecordingSession | null> {
  const fail = (err: unknown) => dispatch({ type: 'FAILURE', message: errorMessage(err) });
  return starting.then(
    (session) => {
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
  startSession: () => Promise<RecordingSession>,
  dispatch: React.Dispatch<DictationEvent>
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

  const start = useCallback(async (onAutoStop: () => void) => {
    const startId = ++startIdRef.current;
    const isCurrent = () => mountedRef.current && startIdRef.current === startId;
    const pending = settleSessionStart(startSession(), sessionRef, isCurrent, onAutoStop, dispatch);
    pendingStartRef.current = pending;
    await pending;
    if (pendingStartRef.current === pending) pendingStartRef.current = null;
  }, [dispatch, startSession]);

  const isMounted = useCallback(() => mountedRef.current, []);

  return { start, takeSession, cancel, isMounted };
}

export function useDictation({ startSession = defaultStartSession }: UseDictationOptions = {}) {
  const composer = useComposer();
  const rpc = useRpc();
  const [state, dispatch] = useReducer(dictationReducer, initialDictationState);
  const { start, takeSession, cancel, isMounted } = useRecordingLifecycle(startSession, dispatch);

  const finishDictation = useCallback(async () => {
    dispatch({ type: 'STOP' });
    const session = await takeSession();
    if (!isMounted() || !session) return;

    try {
      const audio = await session.stop();
      if (!isMounted()) return;

      const response = await requestTranscription(rpc, audio);
      if (!isMounted()) return;

      applyDictationResult(response, composer, dispatch);
    } catch (err) {
      if (!isMounted()) return;
      dispatch({ type: 'FAILURE', message: errorMessage(err) });
    }
  }, [composer, isMounted, rpc, takeSession]);

  const beginDictation = useCallback(async () => {
    dispatch({ type: 'START' });
    await start(() => void finishDictation());
  }, [finishDictation, start]);

  const onClick = useCallback(() => {
    if (state.phase === 'recording') void finishDictation();
    else if (state.phase !== 'processing') void beginDictation();
  }, [beginDictation, finishDictation, state.phase]);

  return {
    phase: state.phase,
    error: state.error,
    notice: state.notice,
    onClick,
    cancel,
    beginDictation,
    finishDictation
  };
}
