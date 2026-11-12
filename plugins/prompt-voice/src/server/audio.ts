import { PromptVoiceError } from './errors.ts';

/** Upper bound on decoded audio. About two minutes of Opus at typical MediaRecorder bitrates. */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/** Base MIME type to upload file extension. Codec parameters are stripped before lookup. */
const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  // 16 kHz PCM produced in the app for Local Whisper, so the runtime needs no FFmpeg.
  'audio/wav': 'wav'
};

export interface AudioInput {
  buffer: Buffer;
  /** Base MIME type with codec parameters removed, for example `audio/webm`. */
  mimeType: string;
  /** File name sent with the upload; some providers infer the format from it. */
  fileName: string;
}

/**
 * Strict standard base64 with at least one data character. Data-URL readers never emit
 * whitespace, so anything Buffer.from would silently skip is rejected up front.
 */
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/** Base64 length to decoded byte count, ignoring padding. Assumes BASE64_PATTERN already matched. */
function estimateDecodedBytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function normalizeMimeType(mimeType: unknown): string {
  return typeof mimeType === 'string' ? mimeType.split(';')[0].trim().toLowerCase() : '';
}

/**
 * Validates an RPC audio payload and decodes it. Size is checked before decoding so an
 * oversized request never allocates the full buffer.
 */
export function decodeAudioRequest(request: { audio?: unknown; mimeType?: unknown }): AudioInput {
  const audio = typeof request.audio === 'string' ? request.audio : '';
  if (!audio || !BASE64_PATTERN.test(audio)) {
    throw new PromptVoiceError('AUDIO_EMPTY', 'No audio was recorded. Try again.');
  }
  if (estimateDecodedBytes(audio) > MAX_AUDIO_BYTES) {
    throw new PromptVoiceError('AUDIO_TOO_LARGE', 'That recording is too long. Keep dictation under two minutes.');
  }

  const mimeType = normalizeMimeType(request.mimeType);
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new PromptVoiceError('AUDIO_TYPE_UNSUPPORTED', `Recording format ${mimeType || 'unknown'} is not supported.`);
  }

  const buffer = Buffer.from(audio, 'base64');
  if (buffer.length === 0) {
    throw new PromptVoiceError('AUDIO_EMPTY', 'No audio was recorded. Try again.');
  }
  return { buffer, mimeType, fileName: `audio.${extension}` };
}
