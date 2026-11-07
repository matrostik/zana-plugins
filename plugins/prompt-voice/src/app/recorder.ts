/** Preferred recording formats in order. The first one MediaRecorder supports is used. */
export const RECORDER_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

/** Upper bound on recording duration (2 minutes) to prevent runaway memory usage and RPC rejection. */
export const MAX_RECORDING_DURATION_MS = 120_000;

/** Server limit on decoded audio bytes (10 MB). */
export const SERVER_MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/** Reserved headroom (1 MB) below server limit so final chunks and flush fit safely within the server cap. */
export const CLIENT_RECORDING_HEADROOM_BYTES = 1024 * 1024;

/** Soft limit on accumulated audio bytes (9 MB). Recording auto-stops here; the server cap is enforced per chunk. */
export const MAX_RECORDING_BYTES = SERVER_MAX_AUDIO_BYTES - CLIENT_RECORDING_HEADROOM_BYTES;

/** Periodic chunk interval so data is collected incrementally and byte limits can be detected early. */
export const CHUNK_INTERVAL_MS = 1000;

export interface RecordedAudio {
  /** Base64 of the recorded bytes, without a data-URL prefix. */
  base64: string;
  mimeType: string;
}

export interface RecordingSession {
  /** Stops recording and resolves with the audio. */
  stop(): Promise<RecordedAudio>;
  /** Stops recording and discards audio. Safe to call more than once. */
  cancel(): void;
  /** Optional callback invoked if an error occurs during active recording. */
  onError?: (error: RecordingError) => void;
  /** Optional callback invoked if recording reaches the duration or byte limit and stops automatically. */
  onAutoStop?: () => void;
}

export type RecordingErrorCode = 'MIC_DENIED' | 'MIC_UNAVAILABLE' | 'RECORDING_FAILED';

export class RecordingError extends Error {
  readonly code: RecordingErrorCode;

  constructor(code: RecordingErrorCode, message: string) {
    super(message);
    this.name = 'RecordingError';
    this.code = code;
  }
}

/** Browser APIs the recorder needs. Injected so tests can run without a microphone. */
export interface RecorderDeps {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createRecorder: (stream: MediaStream, mimeType: string) => RecorderLike;
  isTypeSupported: (mimeType: string) => boolean;
}

/** The subset of MediaRecorder this module uses. Derived from the DOM type so the real recorder fits. */
export type RecorderLike = Pick<
  MediaRecorder,
  'state' | 'mimeType' | 'ondataavailable' | 'onstop' | 'onerror' | 'start' | 'stop'
>;

/** First candidate the browser supports, or null when none is. */
export function pickRecorderMimeType(isSupported: (mimeType: string) => boolean): string | null {
  return RECORDER_MIME_CANDIDATES.find((candidate) => isSupported(candidate)) ?? null;
}

const FALLBACK_MIME_TYPE = 'audio/webm';

export function browserRecorderDeps(): RecorderDeps {
  return {
    getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
    createRecorder: (stream, mimeType) => new MediaRecorder(stream, mimeType ? { mimeType } : undefined),
    isTypeSupported: (mimeType) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)
  };
}

/** Maps getUserMedia failures to codes the UI can explain. */
async function requestMicrophone(deps: RecorderDeps): Promise<MediaStream> {
  try {
    return await deps.getUserMedia({ audio: true });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new RecordingError('MIC_DENIED', 'Microphone access was denied. Allow it for Zana in system settings, then try again.');
    }
    throw new RecordingError('MIC_UNAVAILABLE', 'No microphone is available. Connect one and try again.');
  }
}

/** Reads a Blob as base64 without the data-URL prefix. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new RecordingError('RECORDING_FAILED', 'The recording could not be read.'));
    reader.readAsDataURL(blob);
  });
}

async function assembleAudio(chunks: Blob[], mimeType: string): Promise<RecordedAudio> {
  const blob = new Blob(chunks, { type: mimeType });
  return { base64: await blobToBase64(blob), mimeType: blob.type || mimeType };
}

function setupAutoStopTimer(ms: number, onAutoStop: () => void): () => void {
  if (!(ms > 0 && Number.isFinite(ms))) return () => undefined;
  const timer = setTimeout(onAutoStop, ms);
  return () => clearTimeout(timer);
}

export interface StartRecordingOptions {
  maxDurationMs?: number;
  /** Soft limit: recording stops automatically once this many bytes are collected. */
  maxBytes?: number;
  /** Hard limit: a chunk that would push the recording past this fails the recording. */
  hardMaxBytes?: number;
  onError?: (error: RecordingError) => void;
  onAutoStop?: () => void;
}

export const RECORDING_TOO_LARGE_MESSAGE = 'That recording is too large to transcribe. Keep dictation shorter and try again.';

type ChunkResult = 'accepted' | 'limit-reached' | 'ignored' | 'overflow';

interface ChunkCollector {
  readonly chunks: Blob[];
  readonly overflowed: boolean;
  add(chunk: Blob): ChunkResult;
}

/**
 * Collects recorder chunks under two limits. Reaching the soft limit requests a stop, but later
 * chunks (including the final flush from MediaRecorder.stop()) are still kept so the recording
 * tail and container finalization data are not lost. A chunk that would cross the hard (server)
 * limit is never accepted. The recording is marked as overflowed so it is neither uploaded
 * oversized nor silently truncated.
 */
function createChunkCollector(softMaxBytes: number, requestedHardMaxBytes: number): ChunkCollector {
  // The hard cap can never sit below the soft cap, or every chunk near the soft cap would overflow.
  const hardMaxBytes = Math.max(requestedHardMaxBytes, softMaxBytes);
  const chunks: Blob[] = [];
  let totalBytes = 0;
  let overflowed = false;

  return {
    chunks,
    get overflowed() {
      return overflowed;
    },
    add(chunk) {
      if (chunk.size === 0 || overflowed) return 'ignored';
      if (totalBytes + chunk.size > hardMaxBytes) {
        overflowed = true;
        return 'overflow';
      }
      chunks.push(chunk);
      totalBytes += chunk.size;
      return totalBytes >= softMaxBytes ? 'limit-reached' : 'accepted';
    }
  };
}

/** Resolves when the recorder stops. On a recorder error, runs onFailure and then rejects. */
function watchRecorderStop(recorder: RecorderLike, onFailure: (error: RecordingError) => void): Promise<void> {
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => {
      const error = new RecordingError('RECORDING_FAILED', 'Recording stopped unexpectedly. Try again.');
      onFailure(error);
      reject(error);
    };
  });
  stopped.catch(() => undefined);
  return stopped;
}

/**
 * Wires chunk collection and stop/error events, then starts the recorder.
 * onLimit runs when a byte limit is hit. Returns the promise from watchRecorderStop.
 */
function attachRecorderHandlers(
  recorder: RecorderLike,
  collector: ChunkCollector,
  onLimit: () => void,
  onFailure: (error: RecordingError) => void
): Promise<void> {
  const stopped = watchRecorderStop(recorder, onFailure);
  recorder.ondataavailable = (event) => {
    const result = collector.add(event.data);
    if (result === 'limit-reached' || result === 'overflow') onLimit();
  };
  recorder.start(CHUNK_INTERVAL_MS);
  return stopped;
}

/** Waits for the recorder to stop, releases the mic, and returns the audio unless it overflowed. */
async function readRecording(
  stopped: Promise<void>,
  releaseMicrophone: () => void,
  collector: ChunkCollector,
  mimeType: string
): Promise<RecordedAudio> {
  try {
    await stopped;
  } finally {
    releaseMicrophone();
  }
  if (collector.overflowed) throw new RecordingError('RECORDING_FAILED', RECORDING_TOO_LARGE_MESSAGE);
  return assembleAudio(collector.chunks, mimeType);
}

interface RecorderShutdown {
  /** Clears the duration timer and stops the recorder if it is still running. Idempotent. */
  stopRecorder(): void;
  /** Starts the duration timer, which calls onAutoStop when it fires. */
  armTimer(maxDurationMs: number, onAutoStop: () => void): void;
}

/** Coordinates the auto-stop timer with recorder shutdown so both always stop together. */
function createRecorderShutdown(recorder: RecorderLike): RecorderShutdown {
  let clearTimer = () => {};
  return {
    stopRecorder() {
      clearTimer();
      if (recorder.state !== 'inactive') recorder.stop();
    },
    armTimer(maxDurationMs, onAutoStop) {
      clearTimer = setupAutoStopTimer(maxDurationMs, onAutoStop);
    }
  };
}

interface SessionCallbacks {
  /** Points recorder events at the live session. */
  attach(session: RecordingSession): void;
  /** Disconnects the session so no further user callbacks fire. */
  detach(): void;
  /** Stops the recorder and fires the session's onAutoStop at most once, even if called repeatedly. */
  autoStop(): void;
  /** Stops the recorder, releases the mic, and fires the session's onError, then detaches. */
  fail(error: RecordingError): void;
}

/** Routes recorder events (timer, byte limits, recorder errors) to the user callbacks of the live session. */
function createSessionCallbacks(stopRecorder: () => void, releaseMicrophone: () => void): SessionCallbacks {
  let current: RecordingSession | null = null;
  return {
    attach(session) {
      current = session;
    },
    detach() {
      current = null;
    },
    autoStop() {
      stopRecorder();
      const cb = current?.onAutoStop;
      if (current) current.onAutoStop = undefined;
      cb?.();
    },
    fail(error) {
      stopRecorder();
      releaseMicrophone();
      const cb = current?.onError;
      current = null;
      cb?.(error);
    }
  };
}

function createRecordingSession(
  recorder: RecorderLike,
  releaseMicrophone: () => void,
  mimeType: string,
  options: StartRecordingOptions
): RecordingSession {
  const collector = createChunkCollector(
    options.maxBytes ?? MAX_RECORDING_BYTES,
    options.hardMaxBytes ?? SERVER_MAX_AUDIO_BYTES
  );
  const { stopRecorder, armTimer } = createRecorderShutdown(recorder);
  const callbacks = createSessionCallbacks(stopRecorder, releaseMicrophone);

  armTimer(options.maxDurationMs ?? MAX_RECORDING_DURATION_MS, callbacks.autoStop);
  const stopped = attachRecorderHandlers(recorder, collector, callbacks.autoStop, callbacks.fail);

  const session: RecordingSession = {
    onError: options.onError,
    onAutoStop: options.onAutoStop,
    async stop() {
      stopRecorder();
      try {
        return await readRecording(stopped, releaseMicrophone, collector, recorder.mimeType || mimeType);
      } finally {
        callbacks.detach();
      }
    },
    cancel() {
      stopRecorder();
      releaseMicrophone();
      callbacks.detach();
    }
  };

  callbacks.attach(session);
  return session;
}

/**
 * Starts a browser microphone recording with default options. Module-level so components can use
 * it as a stable default prop without breaking hook memoization.
 */
export const defaultStartSession = (): Promise<RecordingSession> => startRecording();

/** Starts a microphone recording. Throws RecordingError when the mic is denied or missing. */
export async function startRecording(
  deps: RecorderDeps = browserRecorderDeps(),
  options: StartRecordingOptions = {}
): Promise<RecordingSession> {
  const stream = await requestMicrophone(deps);
  const releaseMicrophone = () => stream.getTracks().forEach((track) => track.stop());

  try {
    const mimeType = pickRecorderMimeType(deps.isTypeSupported) ?? FALLBACK_MIME_TYPE;
    const recorder = deps.createRecorder(stream, mimeType);
    return createRecordingSession(recorder, releaseMicrophone, mimeType, options);
  } catch (err) {
    releaseMicrophone();
    if (err instanceof RecordingError) throw err;
    throw new RecordingError(
      'RECORDING_FAILED',
      err instanceof Error ? err.message : 'The recording could not be started.'
    );
  }
}
