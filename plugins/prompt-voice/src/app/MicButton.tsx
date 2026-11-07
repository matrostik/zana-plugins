import { defaultStartSession, type RecordingSession } from './recorder.ts';
import { useDictation } from './useDictation.ts';
import type { DictationPhase } from './dictationMachine.ts';

export interface MicButtonProps {
  /** Starts a recording. Defaults to the browser microphone; tests inject a fake. */
  startSession?: () => Promise<RecordingSession>;
}

const BUTTON_LABEL = 'Dictation';

const PHASE_TITLES: Record<DictationPhase, string> = {
  idle: 'Start dictation',
  recording: 'Stop dictation',
  processing: 'Transcribing',
  error: 'Start dictation'
};

/**
 * Composer action: click to record, click again to transcribe. The transcript is appended
 * to the draft for review; nothing is sent.
 */
export function MicButton({ startSession = defaultStartSession }: MicButtonProps) {
  const { phase, error, notice, onClick } = useDictation({ startSession });

  return (
    <div className="pv-mic">
      <button
        type="button"
        className={`pv-mic-button pv-mic-${phase}`}
        aria-label={BUTTON_LABEL}
        aria-pressed={phase === 'recording'}
        title={PHASE_TITLES[phase]}
        disabled={phase === 'processing'}
        onClick={onClick}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5Zm6 9h2v-3h-2v3Z" fill="currentColor" />
        </svg>
      </button>
      {phase === 'error' && error ? (
        <span role="alert" className="pv-mic-message pv-mic-error">{error}</span>
      ) : null}
      {phase === 'idle' && notice ? (
        <span role="status" className="pv-mic-message">{notice}</span>
      ) : null}
    </div>
  );
}
