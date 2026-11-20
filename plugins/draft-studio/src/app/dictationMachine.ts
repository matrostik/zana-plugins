/** Shown when the server finds no speech. Not an error, so it is a notice rather than a failure. */
export const NO_SPEECH_NOTICE = 'No speech detected.';

export type DictationPhase = 'idle' | 'starting' | 'recording' | 'processing' | 'error';

export interface DictationState {
  phase: DictationPhase;
  /** Non-error information shown after a dictation, for example a cleanup warning. */
  notice: string | null;
  /** User-facing error text. Set only while phase is `error`. */
  error: string | null;
}

export type DictationEvent =
  | { type: 'START' }
  | { type: 'STARTED' }
  | { type: 'STOP' }
  | { type: 'CANCEL' }
  | { type: 'SUCCESS'; notice: string | null }
  | { type: 'NO_SPEECH' }
  | { type: 'CLEAR_NOTICE' }
  | { type: 'FAILURE'; message: string };

export const initialDictationState: DictationState = { phase: 'idle', notice: null, error: null };

/**
 * Pure state machine for the mic button: idle → recording → processing → idle | error.
 * Events that do not apply to the current phase return the same state object.
 */
export function dictationReducer(state: DictationState, event: DictationEvent): DictationState {
  switch (event.type) {
    case 'START':
      return state.phase === 'idle' || state.phase === 'error'
        ? { phase: 'starting', notice: null, error: null }
        : state;
    case 'STARTED':
      return state.phase === 'starting' ? { ...state, phase: 'recording' } : state;
    case 'STOP':
      return state.phase === 'recording' || state.phase === 'starting' ? { phase: 'processing', notice: null, error: null } : state;
    case 'CANCEL':
      return state.phase === 'recording' || state.phase === 'starting' ? { ...initialDictationState } : state;
    case 'SUCCESS':
    case 'NO_SPEECH':
      if (state.phase !== 'processing') return state;
      return {
        phase: 'idle',
        notice: event.type === 'NO_SPEECH' ? NO_SPEECH_NOTICE : event.notice,
        error: null
      };
    case 'CLEAR_NOTICE':
      return state.notice ? { ...state, notice: null } : state;
    case 'FAILURE':
      return { phase: 'error', notice: null, error: event.message };
  }
}
