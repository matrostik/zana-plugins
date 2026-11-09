// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { appendTranscript } from '../app/appendText.ts';
import { dictationReducer, initialDictationState, NO_SPEECH_NOTICE } from '../app/dictationMachine.ts';
import { pickRecorderMimeType, startRecording, type RecorderLike } from '../app/recorder.ts';

describe('dictationReducer', () => {
  it('moves idle → starting → recording → processing → idle on a successful dictation', () => {
    let state = dictationReducer(initialDictationState, { type: 'START' });
    expect(state.phase).toBe('starting');
    state = dictationReducer(state, { type: 'STARTED' });
    expect(state.phase).toBe('recording');
    state = dictationReducer(state, { type: 'STOP' });
    expect(state.phase).toBe('processing');
    state = dictationReducer(state, { type: 'SUCCESS', notice: null });
    expect(state).toEqual({ phase: 'idle', notice: null, error: null });
  });

  it('shows the no-speech notice rather than an error', () => {
    const state = dictationReducer(dictationReducer(initialDictationState, { type: 'START' }), { type: 'STOP' });
    expect(dictationReducer(state, { type: 'NO_SPEECH' })).toEqual({ phase: 'idle', notice: NO_SPEECH_NOTICE, error: null });
  });

  it('clears an active notice on CLEAR_NOTICE', () => {
    const withNotice = { phase: 'idle' as const, notice: 'Added to draft.', error: null };
    expect(dictationReducer(withNotice, { type: 'CLEAR_NOTICE' })).toEqual({ phase: 'idle', notice: null, error: null });
  });

  it('moves to error with the message and recovers on the next START', () => {
    const failed = dictationReducer(initialDictationState, { type: 'FAILURE', message: 'Mic denied' });
    expect(failed).toEqual({ phase: 'error', notice: null, error: 'Mic denied' });
    expect(dictationReducer(failed, { type: 'START' })).toEqual({ phase: 'starting', notice: null, error: null });
  });

  it('resets to idle when CANCEL is received during recording', () => {
    let state = dictationReducer(initialDictationState, { type: 'START' });
    state = dictationReducer(state, { type: 'STARTED' });
    expect(state.phase).toBe('recording');
    state = dictationReducer(state, { type: 'CANCEL' });
    expect(state).toEqual({ phase: 'idle', notice: null, error: null });
  });

  it('ignores events that do not apply to the current phase', () => {
    expect(dictationReducer(initialDictationState, { type: 'STOP' })).toBe(initialDictationState);
    expect(dictationReducer(initialDictationState, { type: 'SUCCESS', notice: null })).toBe(initialDictationState);
    expect(dictationReducer(initialDictationState, { type: 'CANCEL' })).toBe(initialDictationState);
  });
});

describe('appendTranscript', () => {
  it('adds one space between the draft and the transcript', () => {
    expect(appendTranscript('Draft so far', 'next part')).toBe('Draft so far next part');
  });

  it('does not double the space when the draft already ends with whitespace', () => {
    expect(appendTranscript('Draft so far ', 'next part')).toBe('Draft so far next part');
  });

  it('returns the transcript alone for an empty draft and the draft for an empty transcript', () => {
    expect(appendTranscript('', ' hello ')).toBe('hello');
    expect(appendTranscript('keep me', '   ')).toBe('keep me');
  });
});

describe('recorder', () => {
  it('reports a microphone that disconnects during recording', async () => {
    const track = new EventTarget() as EventTarget & { stop: () => void };
    track.stop = vi.fn();
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const session = await startRecording({ getUserMedia: async () => stream, createRecorder: () => fakeRecorder(), isTypeSupported: () => true });
    const onError = vi.fn();
    session.onError = onError;
    track.dispatchEvent(new Event('ended'));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'MIC_UNAVAILABLE' }));
    expect(track.stop).toHaveBeenCalled();
  });

  it('samples the existing microphone stream and releases the audio meter on cancel', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const analyser = { fftSize: 0, getByteTimeDomainData: (samples: Uint8Array) => samples.fill(160) };
    const close = vi.fn(async () => undefined);
    const createMediaStreamSource = vi.fn(() => source);
    vi.stubGlobal('AudioContext', class {
      createMediaStreamSource = createMediaStreamSource;
      createAnalyser = () => analyser;
      close = close;
    });
    try {
      const session = await startRecording({ getUserMedia: async () => stream, createRecorder: () => fakeRecorder(), isTypeSupported: () => true });
      expect(createMediaStreamSource).toHaveBeenCalledWith(stream);
      expect(session.getAudioLevel?.()).toBeGreaterThan(0);
      session.cancel();
      session.cancel();
      expect(close).toHaveBeenCalledTimes(1);
      expect(source.disconnect).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('picks the first MIME type the browser supports', () => {
    expect(pickRecorderMimeType((type) => type === 'audio/webm')).toBe('audio/webm');
    expect(pickRecorderMimeType(() => false)).toBeNull();
  });
});

function fakeRecorder(): RecorderLike {
  return {
    state: 'inactive',
    mimeType: 'audio/webm',
    ondataavailable: null,
    onstop: null,
    onerror: null,
    start: () => undefined,
    stop: () => undefined
  };
}
