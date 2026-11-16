import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_MIC_DEVICE_ID, type AudioPreferences } from '../shared/audioPreferences.ts';
import {
  SETTINGS_GET_METHOD,
  PROMPT_STUDIO_PANEL_PATH,
  PROMPT_STUDIO_PROJECT_TAB_ID,
  STATUS_METHOD,
  TRANSCRIBE_METHOD,
  type StatusResponse,
  type TranscribeResponse
} from '../shared/protocol.ts';
import { readCachedAudioPreferences, writeCachedAudioPreferences } from './audioPreferencesStorage.ts';
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

const STT_BADGE_LABELS: Record<string, string> = {
  system: 'Zana Voice',
  openai: 'OpenAI Whisper',
  'google-gemini': 'Google Gemini',
  'local-whisper': 'Local Whisper'
};

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
  const rpcRef = useRef(rpc);
  rpcRef.current = rpc;
  const navigate = useSafeZccNavigate();

  const [sttProvider, setSttProvider] = useState<string>('system');
  const [llmProvider, setLlmProvider] = useState<string>('assistant');
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'transcribing'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const sessionRef = useRef<RecordingSession | null>(null);
  const requestIdRef = useRef(0);
  const prefsRef = useRef<AudioPreferences>(readCachedAudioPreferences());

  useEffect(() => {
    mountedRef.current = true;
    const activeRpc = rpcRef.current;
    activeRpc
      .call(STATUS_METHOD)
      .then((res) => {
        if (!mountedRef.current || !res || typeof res !== 'object') return;
        const status = res as StatusResponse;
        if (status.sttProvider) setSttProvider(status.sttProvider);
        if (status.llmProvider) setLlmProvider(status.llmProvider);
      })
      .catch(() => undefined);

    activeRpc
      .call(SETTINGS_GET_METHOD)
      .then((res) => {
        if (!mountedRef.current || !res || typeof res !== 'object') return;
        prefsRef.current = writeCachedAudioPreferences(res as Record<string, unknown>);
      })
      .catch(() => undefined);

    return () => {
      mountedRef.current = false;
      requestIdRef.current++;
      if (sessionRef.current) {
        sessionRef.current.cancel();
        sessionRef.current = null;
      }
    };
  }, []);

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

  const openStudio = useCallback(() => {
    if (projectId && typeof navigate?.toProject === 'function') {
      navigate.toProject(projectId, { tabId: PROMPT_STUDIO_PROJECT_TAB_ID });
      return;
    }
    if (typeof navigate?.toPluginPanel === 'function') {
      navigate.toPluginPanel(PROMPT_STUDIO_PANEL_PATH);
    }
  }, [navigate, projectId]);

  const stopAndTranscribe = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      setPhase('idle');
      return;
    }
    const activeRpc = rpcRef.current;
    const prefs = prefsRef.current;
    const cueOpts = { enabled: prefs.soundCuesEnabled, volume: prefs.soundCuesVolume };
    setPhase('transcribing');

    try {
      const recorded = await session.stop();
      if (!mountedRef.current) return;
      playSoundCue('stop', cueOpts);

      const audio = await prepareAudioForUpload(activeRpc, recorded);
      const response = (await activeRpc.call(TRANSCRIBE_METHOD, {
        audio: audio.base64,
        mimeType: audio.mimeType
      })) as TranscribeResponse;
      if (!mountedRef.current) return;

      if (response.ok && response.status === 'ok') {
        playSoundCue('complete', cueOpts);
        if (typeof navigate?.toCompose === 'function') {
          navigate.toCompose({ initialPrompt: response.text, focusPrompt: true });
          setNotice('Draft opened in new thread composer.');
        } else {
          setNotice(response.text);
        }
      } else if (response.ok && response.status === 'no-speech') {
        setNotice('No speech detected. Try again.');
      } else if (!response.ok) {
        playSoundCue('error', cueOpts);
        setError(response.message);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      playSoundCue('error', cueOpts);
      setError(err instanceof Error ? err.message : 'Quick dictation failed.');
    } finally {
      if (mountedRef.current) setPhase('idle');
    }
  }, [navigate]);

  const startQuickDictation = useCallback(async () => {
    setError(null);
    setNotice(null);
    const prefs = readCachedAudioPreferences();
    prefsRef.current = prefs;
    const cueOpts = { enabled: prefs.soundCuesEnabled, volume: prefs.soundCuesVolume };
    const opId = ++requestIdRef.current;
    setPhase('starting');

    try {
      const cuePromise = playSoundCue('start', cueOpts);
      if (cuePromise) {
        await cuePromise;
        if (!mountedRef.current || requestIdRef.current !== opId) return;
      }

      const session = await (prefs.micDeviceId !== DEFAULT_MIC_DEVICE_ID
        ? startSession({ deviceId: prefs.micDeviceId })
        : startSession());

      if (!mountedRef.current || requestIdRef.current !== opId) {
        session.cancel();
        return;
      }

      session.onError = (err) => {
        sessionRef.current = null;
        if (!mountedRef.current) return;
        playSoundCue('error', cueOpts);
        setError(err.message);
        setPhase('idle');
      };
      session.onAutoStop = () => {
        if (mountedRef.current) void stopAndTranscribe();
      };

      sessionRef.current = session;
      setPhase('recording');
    } catch (err) {
      if (!mountedRef.current) return;
      playSoundCue('error', cueOpts);
      setError(err instanceof Error ? err.message : 'Microphone access denied.');
      setPhase('idle');
    }
  }, [startSession, stopAndTranscribe]);

  const cancelQuickDictation = useCallback(() => {
    requestIdRef.current++;
    if (sessionRef.current) {
      sessionRef.current.cancel();
      sessionRef.current = null;
    }
    setPhase('idle');
  }, []);

  const handleToggleDictate = () => {
    if (phase === 'recording') {
      void stopAndTranscribe();
    } else if (phase === 'idle') {
      void startQuickDictation();
    }
  };

  const formattedTime = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const sttLabel = STT_BADGE_LABELS[sttProvider] ?? sttProvider;
  const cleanupLabel = llmProvider === 'none' ? 'Raw transcript' : 'AI cleanup on';

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

        <div className="ps-home-actions">
          <button
            type="button"
            className={`ps-btn ${phase === 'recording' ? 'ps-btn-danger' : 'ps-btn-primary'}`}
            disabled={phase === 'starting' || phase === 'transcribing'}
            onClick={handleToggleDictate}
          >
            {phase === 'starting'
              ? 'Starting mic…'
              : phase === 'recording'
                ? `Stop & Compose (${formattedTime})`
                : phase === 'transcribing'
                  ? 'Transcribing…'
                  : 'Dictate to New Thread'}
          </button>

          {phase === 'starting' || phase === 'recording' ? (
            <button type="button" className="ps-btn" onClick={cancelQuickDictation}>
              Cancel
            </button>
          ) : (
            <button type="button" className="ps-btn" onClick={openStudio}>
              Open Prompt Studio
            </button>
          )}
        </div>
      </div>

      {notice ? (
        <div role="status" className="ps-home-status">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="ps-home-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}
