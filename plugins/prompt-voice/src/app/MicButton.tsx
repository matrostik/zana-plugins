import { defaultStartSession, type RecordingSession } from './recorder.ts';
import { useDictation } from './useDictation.ts';
import type { DictationPhase } from './dictationMachine.ts';
import styles from '../../styles.css';

export interface MicButtonProps {
  /** Starts a recording. Defaults to the browser microphone; tests inject a fake. */
  startSession?: () => Promise<RecordingSession>;
}

const BUTTON_LABEL = 'Dictation';
const STYLE_ELEMENT_ID = 'zcc-ext-prompt-voice-styles';

export function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }
  if (styleEl.textContent !== styles) {
    styleEl.textContent = styles;
  }
}

const PHASE_TITLES: Record<DictationPhase, string> = {
  idle: 'Start dictation',
  starting: 'Stop dictation',
  recording: 'Stop dictation',
  processing: 'Transcribing',
  error: 'Start dictation'
};

const SR_ONLY_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0
};

/**
 * Composer action: oval capsule pill with red border and centered mic icon in idle.
 * Fluidly expands into the active listening pill with waveform, timer, stop, and cancel buttons.
 */
export function MicButton({ startSession = defaultStartSession }: MicButtonProps) {
  ensureStylesInjected();
  const { phase, error, notice, onClick, cancel, clearNotice, level, seconds, autoStopped } = useDictation({ startSession });

  const isActive = phase === 'starting' || phase === 'recording' || phase === 'processing';
  const isNotice = phase === 'idle' && Boolean(notice);
  const formattedTime = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div
      className={`pv-mic pv-dictation-pill pv-phase-${phase} ${isNotice ? 'pv-has-notice' : ''}`}
      onClick={isNotice ? clearNotice : undefined}
      title={isNotice ? 'Click to dismiss' : undefined}
    >
      {/* 
        Primary action button (Icon button in idle/error, Stop in starting/recording, Spinner in processing).
        In idle, strictly ONLY the icon centered inside the oval border.
      */}
      <button
        type="button"
        className={`pv-mic-button pv-mic-${phase} ${isActive ? 'pv-pill-btn-stop' : 'pv-idle-icon'}`}
        aria-label={BUTTON_LABEL}
        aria-pressed={phase === 'recording' || phase === 'starting'}
        title={PHASE_TITLES[phase]}
        disabled={phase === 'processing'}
        onClick={onClick}
        style={isNotice ? { display: 'none' } : undefined}
      >
        {phase === 'idle' || phase === 'error' ? (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z" fill="currentColor" />
          </svg>
        ) : phase === 'processing' ? (
          <span className="pv-mic-spinner" aria-hidden="true" />
        ) : (
          /* Clear, unambiguous Stop Square icon */
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
            <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Notice displayed inside the same oval pill control */}
      {isNotice ? (
        <span role="status" className="pv-notice-content">
          <span className="pv-notice-check">✓</span>
          <span className="pv-pill-status">{notice}</span>
        </span>
      ) : null}

      {/* Starting Phase Details */}
      {phase === 'starting' ? (
        <>
          <div className="pv-pill-timer-badge">
            <div className="pv-pill-dot pv-pill-dot-starting" />
            <span className="pv-pill-timer-text">0:00</span>
          </div>
          <div className="pv-pill-center" role="status">
            <span className="pv-mic-spinner" aria-hidden="true" />
            <span className="pv-pill-status">Requesting microphone…</span>
          </div>
        </>
      ) : null}

      {/* Recording Phase Details */}
      {phase === 'recording' ? (
        <>
          <div className="pv-pill-timer-badge">
            <div className="pv-pill-dot" />
            <span className="pv-pill-timer-text">
              <span className="pv-sr-only" style={SR_ONLY_STYLE}>Recording </span>
              {formattedTime}
            </span>
          </div>
          <div className="pv-pill-center" role="status">
            {level === null ? <span className="pv-sr-only" style={SR_ONLY_STYLE}>Audio meter unavailable</span> : null}
            <span
              className={`pv-pill-waveform ${level === null ? 'animated' : ''}`}
              aria-label="Microphone audio activity"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((level ?? 0.3) * 100)}
            >
              {[0.4, 0.7, 1, 0.7, 0.4].map((scale, index) => (
                <span
                  key={index}
                  className="pv-pill-waveform-bar"
                  style={level !== null ? { height: `${Math.max(3, level * scale * 20)}px` } : undefined}
                />
              ))}
            </span>
            <span className="pv-pill-status">Listening...</span>
            {level !== null && level < 0.015 && seconds >= 5 ? (
              <span className="pv-mic-quiet-warning">No audio detected — check your microphone.</span>
            ) : null}
          </div>
        </>
      ) : null}

      {/* Processing Phase Details */}
      {phase === 'processing' ? (
        <>
          <div className="pv-pill-timer-badge">
            <span className="pv-pill-timer-text">{formattedTime}</span>
          </div>
          <div className="pv-pill-center" role="status">
            <span className="pv-pill-status">
              <span className="pv-mic-spinner" aria-hidden="true" /> {autoStopped ? 'Recording limit reached. ' : ''}Transcribing and refining…
            </span>
          </div>
        </>
      ) : null}

      {/* Cancel Action */}
      {phase === 'starting' || phase === 'recording' ? (
        <button
          type="button"
          className="pv-mic-cancel pv-pill-btn-cancel"
          onClick={cancel}
          aria-label="Cancel recording"
          title="Cancel recording"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
            <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}

      {/* Error Banner */}
      {phase === 'error' && error ? (
        <span role="alert" className="pv-pill-status pv-mic-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
