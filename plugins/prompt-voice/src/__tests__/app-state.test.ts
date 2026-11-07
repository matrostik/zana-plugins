// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { appendTranscript } from '../app/appendText.ts';
import { dictationReducer, initialDictationState, NO_SPEECH_NOTICE } from '../app/dictationMachine.ts';
import { pickRecorderMimeType, RecordingError, startRecording, type RecorderLike } from '../app/recorder.ts';

describe('dictationReducer', () => {
  it('moves idle → recording → processing → idle on a successful dictation', () => {
    let state = dictationReducer(initialDictationState, { type: 'START' });
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

  it('moves to error with the message and recovers on the next START', () => {
    const failed = dictationReducer(initialDictationState, { type: 'FAILURE', message: 'Mic denied' });
    expect(failed).toEqual({ phase: 'error', notice: null, error: 'Mic denied' });
    expect(dictationReducer(failed, { type: 'START' })).toEqual({ phase: 'recording', notice: null, error: null });
  });

  it('resets to idle when CANCEL is received during recording', () => {
    let state = dictationReducer(initialDictationState, { type: 'START' });
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
  it('picks the first MIME type the browser supports', () => {
    expect(pickRecorderMimeType((type) => type === 'audio/webm')).toBe('audio/webm');
    expect(pickRecorderMimeType(() => false)).toBeNull();
  });

  it('maps a denied microphone to MIC_DENIED', async () => {
    const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    const deps = {
      getUserMedia: vi.fn(async () => {
        throw denied;
      }),
      createRecorder: vi.fn(),
      isTypeSupported: () => true
    };
    await expect(startRecording(deps)).rejects.toMatchObject({ code: 'MIC_DENIED' });
    await expect(startRecording(deps)).rejects.toBeInstanceOf(RecordingError);
  });

  it('releases stream tracks if recorder initialization throws', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const deps = {
      getUserMedia: vi.fn(async () => stream),
      createRecorder: vi.fn(() => {
        throw new Error('MediaRecorder unsupported');
      }),
      isTypeSupported: () => true
    };
    await expect(startRecording(deps)).rejects.toMatchObject({
      code: 'RECORDING_FAILED'
    });
    expect(track.stop).toHaveBeenCalled();
  });

  it('releases stream tracks if recorder.start throws', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const recorder = fakeRecorder();
    recorder.start = () => {
      throw new Error('start failed');
    };
    const deps = {
      getUserMedia: vi.fn(async () => stream),
      createRecorder: () => recorder,
      isTypeSupported: () => true
    };
    await expect(startRecording(deps)).rejects.toMatchObject({
      code: 'RECORDING_FAILED'
    });
    expect(track.stop).toHaveBeenCalled();
  });

  it('releases microphone and notifies onError when MediaRecorder encounters an error', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const recorder = fakeRecorder();
    const onError = vi.fn();
    await startRecording(
      {
        getUserMedia: async () => stream,
        createRecorder: () => recorder,
        isTypeSupported: () => true
      },
      { onError }
    );
    recorder.triggerError();
    expect(track.stop).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'RECORDING_FAILED' })
    );
  });

  it('clears auto-stop timer on error so it does not fire later', async () => {
    vi.useFakeTimers();
    try {
      const track = { stop: vi.fn() };
      const stream = { getTracks: () => [track] } as unknown as MediaStream;
      const recorder = fakeRecorder();
      const onError = vi.fn();
      const onAutoStop = vi.fn();
      await startRecording(
        {
          getUserMedia: async () => stream,
          createRecorder: () => recorder,
          isTypeSupported: () => true
        },
        { maxDurationMs: 5000, onError, onAutoStop }
      );
      recorder.triggerError();
      vi.advanceTimersByTime(6000);
      expect(onAutoStop).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops automatically when byte limit is reached', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const recorder = fakeRecorder();
    const onAutoStop = vi.fn();
    const stopSpy = vi.spyOn(recorder, 'stop');
    await startRecording(
      {
        getUserMedia: async () => stream,
        createRecorder: () => recorder,
        isTypeSupported: () => true
      },
      { maxBytes: 100, onAutoStop }
    );
    recorder.emit(new Blob([new Uint8Array(150)]));
    expect(stopSpy).toHaveBeenCalled();
    expect(onAutoStop).toHaveBeenCalled();
  });

  it('keeps final flush chunks after the soft limit while they fit under the hard limit', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const recorder = fakeRecorder();
    const onAutoStop = vi.fn();
    const session = await startRecording(
      {
        getUserMedia: async () => stream,
        createRecorder: () => recorder,
        isTypeSupported: () => true
      },
      { maxBytes: 100, hardMaxBytes: 200, onAutoStop }
    );
    recorder.emit(new Blob([new Uint8Array(100)]));
    recorder.emit(new Blob([new Uint8Array(50)]));
    const pending = session.stop();
    recorder.finish();
    const audio = await pending;
    expect(atob(audio.base64).length).toBe(150);
    expect(onAutoStop).toHaveBeenCalledTimes(1);
  });

  it('fails when final flush chunks after the soft limit exceed the hard limit', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const recorder = fakeRecorder();
    const session = await startRecording(
      {
        getUserMedia: async () => stream,
        createRecorder: () => recorder,
        isTypeSupported: () => true
      },
      { maxBytes: 100, hardMaxBytes: 120 }
    );
    recorder.emit(new Blob([new Uint8Array(100)]));
    recorder.emit(new Blob([new Uint8Array(50)]));
    const pending = session.stop();
    recorder.finish();
    await expect(pending).rejects.toMatchObject({ code: 'RECORDING_FAILED' });
  });

  it('fails instead of uploading when a single chunk would exceed the hard limit', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const recorder = fakeRecorder();
    const onAutoStop = vi.fn();
    const session = await startRecording(
      {
        getUserMedia: async () => stream,
        createRecorder: () => recorder,
        isTypeSupported: () => true
      },
      { maxBytes: 100, hardMaxBytes: 120, onAutoStop }
    );
    recorder.emit(new Blob([new Uint8Array(60)]));
    recorder.emit(new Blob([new Uint8Array(80)]));
    expect(onAutoStop).toHaveBeenCalled();
    const pending = session.stop();
    recorder.finish();
    await expect(pending).rejects.toMatchObject({ code: 'RECORDING_FAILED' });
    expect(track.stop).toHaveBeenCalled();
  });

  it('stops automatically when duration limit is reached', async () => {
    vi.useFakeTimers();
    try {
      const track = { stop: vi.fn() };
      const stream = { getTracks: () => [track] } as unknown as MediaStream;
      const recorder = fakeRecorder();
      const onAutoStop = vi.fn();
      const stopSpy = vi.spyOn(recorder, 'stop');
      await startRecording(
        {
          getUserMedia: async () => stream,
          createRecorder: () => recorder,
          isTypeSupported: () => true
        },
        { maxDurationMs: 5000, onAutoStop }
      );
      vi.advanceTimersByTime(5000);
      expect(stopSpy).toHaveBeenCalled();
      expect(onAutoStop).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('records, stops, releases the microphone, and returns base64 audio', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const recorder = fakeRecorder();
    const session = await startRecording({
      getUserMedia: async () => stream,
      createRecorder: () => recorder,
      isTypeSupported: (type) => type === 'audio/webm;codecs=opus'
    });
    recorder.emit(new Blob(['abc']));
    const pending = session.stop();
    recorder.finish();
    const audio = await pending;
    expect(audio.mimeType).toBe('audio/webm;codecs=opus');
    expect(atob(audio.base64)).toBe('abc');
    expect(track.stop).toHaveBeenCalled();
  });
});

/** Minimal MediaRecorder double. Test code calls `emit` and `finish` to drive the recorder events. */
function fakeRecorder() {
  const handlers: { data?: (event: { data: Blob }) => void; stop?: () => void; error?: (event: unknown) => void } = {};
  const recorder = {
    state: 'recording',
    mimeType: 'audio/webm;codecs=opus',
    set ondataavailable(fn: (event: { data: Blob }) => void) {
      handlers.data = fn;
    },
    set onstop(fn: () => void) {
      handlers.stop = fn;
    },
    set onerror(fn: (event: unknown) => void) {
      handlers.error = fn;
    },
    start: () => undefined,
    stop: vi.fn(() => {
      recorder.state = 'inactive';
    }),
    emit: (blob: Blob) => handlers.data?.({ data: blob }),
    finish: () => handlers.stop?.(),
    triggerError: () => handlers.error?.(new Error('crash'))
  };
  return recorder as unknown as RecorderLike & {
    emit(blob: Blob): void;
    finish(): void;
    triggerError(): void;
  };
}
