import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ZccNavigate } from '@zana-ai/zcc-plugin-sdk/app';
import { DEFAULT_MIC_DEVICE_ID, type AudioPreferences } from '../shared/audioPreferences.ts';
import {
  PROMPT_STUDIO_HISTORY_SUBPATH,
  PROMPT_STUDIO_PANEL_PATH,
  PROMPT_STUDIO_PROJECT_TAB_ID,
  SETTINGS_GET_METHOD,
  STATUS_METHOD,
  TRANSCRIBE_METHOD,
  type StatusResponse,
  type TranscribeResponse
} from '../shared/protocol.ts';
import { readCachedAudioPreferences, writeCachedAudioPreferences } from './audioPreferencesStorage.ts';
import { requestPendingStudioTab } from './historyNavigation.ts';
import { ensureStylesInjected } from './injectStyles.ts';
import { defaultStartSession, type RecordingSession, type StartRecordingOptions } from './recorder.ts';
import { usePromptVoiceRpc, useSafeZccNavigate, useVisibilitySettings } from './safeSdk.ts';
import { playSoundCue } from './soundCues.ts';
import { prepareAudioForUpload } from './wav.ts';

export interface HomeVoiceSectionProps {
  pluginId: string;
  projectId: string | null;
  /** Injectable recorder starter for tests. */
  startSession?: (options?: StartRecordingOptions) => Promise<RecordingSession>;
}

type DictationPhase = 'idle' | 'starting' | 'recording' | 'transcribing';
type RpcClient = ReturnType<typeof usePromptVoiceRpc>;
type StartSessionFn = (options?: StartRecordingOptions) => Promise<RecordingSession>;

const STT_BADGE_LABELS: Record<string, string> = {
  system: 'Zana Voice',
  openai: 'OpenAI Whisper',
  'google-gemini': 'Google Gemini',
  'local-whisper': 'Local Whisper'
};

function useHomeVoiceMetadata(rpc: RpcClient, prefsRef: React.MutableRefObject<AudioPreferences>) {
  const [sttProvider, setSttProvider] = useState<string>('system');
  const [llmProvider, setLlmProvider] = useState<string>('assistant');

  useEffect(() => {
    let active = true;
    rpc
      .call(STATUS_METHOD)
      .then((res) => {
        if (!active || !res || typeof res !== 'object') return;
        const status = res as StatusResponse;
        if (status.sttProvider) setSttProvider(status.sttProvider);
        if (status.llmProvider) setLlmProvider(status.llmProvider);
      })
      .catch(() => undefined);

    rpc
      .call(SETTINGS_GET_METHOD)
      .then((res) => {
        if (!active || !res || typeof res !== 'object') return;
        prefsRef.current = writeCachedAudioPreferences(res as Record<string, unknown>);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [prefsRef, rpc]);

  return { sttProvider, llmProvider };
}

function useRecordingElapsedSeconds(phase: DictationPhase): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (phase !== 'recording') {
      setSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);
  return seconds;
}

async function runHomeStopAndTranscribe(
  session: RecordingSession,
  rpc: RpcClient,
  prefs: AudioPreferences,
  navigate: ZccNavigate | null,
  mountedRef: React.MutableRefObject<boolean>,
  meta: { projectId: string | null; audioDurationMs?: number },
  callbacks: { setNotice: (v: string | null) => void; setError: (v: string | null) => void }
): Promise<void> {
  const cueOpts = { enabled: prefs.soundCuesEnabled, volume: prefs.soundCuesVolume };
  const recorded = await session.stop();
  if (!mountedRef.current) return;
  playSoundCue('stop', cueOpts);

  const audio = await prepareAudioForUpload(rpc, recorded);
  const response = (await rpc.call(TRANSCRIBE_METHOD, {
    audio: audio.base64,
    mimeType: audio.mimeType,
    source: 'home',
    ...(meta.projectId ? { projectId: meta.projectId } : {}),
    ...(typeof meta.audioDurationMs === 'number' ? { audioDurationMs: meta.audioDurationMs } : {})
  })) as TranscribeResponse;
  if (!mountedRef.current) return;

  if (response.ok && response.status === 'ok') {
    playSoundCue('complete', cueOpts);
    if (typeof navigate?.toCompose === 'function') {
      navigate.toCompose({ initialPrompt: response.text, focusPrompt: true });
      callbacks.setNotice('Draft opened in new thread composer.');
    } else {
      callbacks.setNotice(response.text);
    }
    return;
  }
  if (response.ok && response.status === 'no-speech') {
    callbacks.setNotice('No speech detected. Try again.');
    return;
  }
  if (!response.ok) {
    playSoundCue('error', cueOpts);
    callbacks.setError(response.message);
  }
}

async function openHomeRecordingSession(
  prefs: AudioPreferences,
  startSession: StartSessionFn,
  isCurrent: () => boolean
): Promise<RecordingSession | null> {
  const cueOpts = { enabled: prefs.soundCuesEnabled, volume: prefs.soundCuesVolume };
  const cuePromise = playSoundCue('start', cueOpts);
  if (cuePromise) {
    await cuePromise;
    if (!isCurrent()) return null;
  }
  const session = await (prefs.micDeviceId !== DEFAULT_MIC_DEVICE_ID
    ? startSession({ deviceId: prefs.micDeviceId })
    : startSession());
  if (!isCurrent()) {
    session.cancel();
    return null;
  }
  return session;
}

function useHomeQuickDictation(
  rpc: RpcClient,
  navigate: ZccNavigate | null,
  startSession: StartSessionFn,
  projectId: string | null
) {
  const [phase, setPhase] = useState<DictationPhase>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const sessionRef = useRef<RecordingSession | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const prefsRef = useRef<AudioPreferences>(readCachedAudioPreferences());
  const { sttProvider, llmProvider } = useHomeVoiceMetadata(rpc, prefsRef);
  const seconds = useRecordingElapsedSeconds(phase);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current++;
      sessionRef.current?.cancel();
      sessionRef.current = null;
    };
  }, []);

  const stopAndTranscribe = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    const startedAt = recordingStartedAtRef.current;
    recordingStartedAtRef.current = null;
    const audioDurationMs = startedAt !== null ? Math.max(0, Date.now() - startedAt) : undefined;
    if (!session) {
      setPhase('idle');
      return;
    }
    const prefs = prefsRef.current;
    setPhase('transcribing');
    try {
      await runHomeStopAndTranscribe(
        session,
        rpc,
        prefs,
        navigate,
        mountedRef,
        { projectId, audioDurationMs },
        { setNotice, setError }
      );
    } catch (err) {
      if (!mountedRef.current) return;
      playSoundCue('error', { enabled: prefs.soundCuesEnabled, volume: prefs.soundCuesVolume });
      setError(err instanceof Error ? err.message : 'Quick dictation failed.');
    } finally {
      if (mountedRef.current) setPhase('idle');
    }
  }, [navigate, projectId, rpc]);

  const start = useCallback(async () => {
    setError(null);
    setNotice(null);
    const prefs = readCachedAudioPreferences();
    prefsRef.current = prefs;
    const cueOpts = { enabled: prefs.soundCuesEnabled, volume: prefs.soundCuesVolume };
    const opId = ++requestIdRef.current;
    setPhase('starting');
    try {
      const session = await openHomeRecordingSession(
        prefs,
        startSession,
        () => mountedRef.current && requestIdRef.current === opId
      );
      if (!session) return;
      session.onError = (err) => {
        sessionRef.current = null;
        recordingStartedAtRef.current = null;
        if (!mountedRef.current) return;
        playSoundCue('error', cueOpts);
        setError(err.message);
        setPhase('idle');
      };
      session.onAutoStop = () => {
        if (mountedRef.current) void stopAndTranscribe();
      };
      sessionRef.current = session;
      recordingStartedAtRef.current = Date.now();
      setPhase('recording');
    } catch (err) {
      if (!mountedRef.current) return;
      playSoundCue('error', cueOpts);
      setError(err instanceof Error ? err.message : 'Microphone access denied.');
      setPhase('idle');
    }
  }, [startSession, stopAndTranscribe]);

  const cancel = useCallback(() => {
    requestIdRef.current++;
    recordingStartedAtRef.current = null;
    sessionRef.current?.cancel();
    sessionRef.current = null;
    setPhase('idle');
  }, []);

  return { sttProvider, llmProvider, phase, seconds, notice, error, start, stopAndTranscribe, cancel };
}

function HomeVoiceActionBar({
  phase,
  formattedTime,
  onToggleDictate,
  onCancel,
  onOpenStudio,
  onOpenHistory
}: {
  phase: DictationPhase;
  formattedTime: string;
  onToggleDictate: () => void;
  onCancel: () => void;
  onOpenStudio: () => void;
  onOpenHistory: () => void;
}): React.ReactElement {
  const buttonLabel =
    phase === 'starting'
      ? 'Starting mic…'
      : phase === 'recording'
        ? `Stop & Compose (${formattedTime})`
        : phase === 'transcribing'
          ? 'Transcribing…'
          : 'Dictate to New Thread';

  return (
    <div className="ps-home-actions">
      <button
        type="button"
        className={`ps-btn ${phase === 'recording' ? 'ps-btn-danger' : 'ps-btn-primary'}`}
        disabled={phase === 'starting' || phase === 'transcribing'}
        onClick={onToggleDictate}
      >
        {buttonLabel}
      </button>
      {phase === 'starting' || phase === 'recording' ? (
        <button type="button" className="ps-btn" onClick={onCancel}>
          Cancel
        </button>
      ) : (
        <>
          <button type="button" className="ps-btn" onClick={onOpenStudio}>
            Open Prompt Studio
          </button>
          <button type="button" className="ps-btn" onClick={onOpenHistory}>
            History
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Home screen quick-dictation and Prompt Studio launcher card (`homepageSection` slot).
 * Hidden dynamically when `showHomeWidget` is disabled in Prompt Voice plugin settings.
 */
export function HomeVoiceSection(props: HomeVoiceSectionProps): React.ReactElement | null {
  const visibility = useVisibilitySettings();
  if (!visibility.showHomeWidget) {
    return null;
  }
  return <HomeVoiceSectionInner {...props} />;
}

function HomeVoiceSectionInner({
  pluginId,
  projectId,
  startSession = defaultStartSession
}: HomeVoiceSectionProps): React.ReactElement {
  ensureStylesInjected();
  const rpc = usePromptVoiceRpc(pluginId);
  const navigate = useSafeZccNavigate();
  const state = useHomeQuickDictation(rpc, navigate, startSession, projectId);

  const openStudio = useCallback(() => {
    requestPendingStudioTab('studio');
    if (projectId && typeof navigate?.toProject === 'function') {
      navigate.toProject(projectId, { tabId: PROMPT_STUDIO_PROJECT_TAB_ID });
      return;
    }
    navigate?.toPluginPanel?.(PROMPT_STUDIO_PANEL_PATH);
  }, [navigate, projectId]);

  const openHistory = useCallback(() => {
    requestPendingStudioTab('history');
    if (projectId && typeof navigate?.toProject === 'function') {
      navigate.toProject(projectId, { tabId: PROMPT_STUDIO_PROJECT_TAB_ID });
      return;
    }
    navigate?.toPluginPanel?.(PROMPT_STUDIO_PANEL_PATH, { subPath: PROMPT_STUDIO_HISTORY_SUBPATH });
  }, [navigate, projectId]);

  const handleToggleDictate = () => {
    if (state.phase === 'recording') void state.stopAndTranscribe();
    else if (state.phase === 'idle') void state.start();
  };

  const formattedTime = `${Math.floor(state.seconds / 60)}:${String(state.seconds % 60).padStart(2, '0')}`;
  const sttLabel = STT_BADGE_LABELS[state.sttProvider] ?? state.sttProvider;
  const cleanupLabel = state.llmProvider === 'none' ? 'Raw transcript' : 'AI cleanup on';

  return (
    <div className="ps-home-card" data-testid="pv-home-widget">
      <div className="ps-home-card-top">
        <div className="ps-home-copy">
          <div className="ps-home-heading">
            <span aria-hidden="true">🎙️</span>
            <span>Dictate a new thread or refine in Prompt Studio</span>
          </div>
          <div className="ps-home-meta">
            <span>{sttLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{cleanupLabel}</span>
          </div>
        </div>
        <HomeVoiceActionBar
          phase={state.phase}
          formattedTime={formattedTime}
          onToggleDictate={handleToggleDictate}
          onCancel={state.cancel}
          onOpenStudio={openStudio}
          onOpenHistory={openHistory}
        />
      </div>
      {state.notice ? <div role="status" className="ps-home-status">{state.notice}</div> : null}
      {state.error ? <div role="alert" className="ps-home-error">{state.error}</div> : null}
    </div>
  );
}
