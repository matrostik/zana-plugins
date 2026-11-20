import { STATUS_METHOD, type StatusResponse } from '../shared/protocol.ts';
import { blobToBase64, RecordingError, type RecordedAudio } from './recorder.ts';

/** whisper.cpp expects 16 kHz mono 16-bit PCM. */
export const WHISPER_SAMPLE_RATE = 16_000;
const WAV_HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;

export const CONVERSION_FAILED_MESSAGE = "This recording couldn't be prepared for Local Whisper. Try again.";

/** The decoded audio this module needs: per-channel samples at a known rate. */
export interface DecodedAudio {
  sampleRate: number;
  channels: Float32Array[];
}

/** Decodes compressed audio, resampled to `sampleRate`. Injected in tests. */
export type AudioDecoder = (bytes: ArrayBuffer, sampleRate: number) => Promise<DecodedAudio>;

/**
 * Browser decoder. An OfflineAudioContext at 16 kHz makes decodeAudioData resample as it
 * decodes, and needs no user gesture or audio output device.
 */
export const browserAudioDecoder: AudioDecoder = async (bytes, sampleRate) => {
  const context = new OfflineAudioContext(1, 1, sampleRate);
  const buffer = await context.decodeAudioData(bytes);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  return { sampleRate: buffer.sampleRate, channels };
};

/** Averages channels into one. Returns the single channel unchanged. */
export function downmixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];
  const length = Math.min(...channels.map((channel) => channel.length));
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    let sum = 0;
    for (const channel of channels) sum += channel[i];
    mono[i] = sum / channels.length;
  }
  return mono;
}

/** Encodes mono float samples in [-1, 1] as a 16-bit PCM WAV file. Out-of-range samples are clipped. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const bytes = new Uint8Array(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true); // byte rate
  view.setUint16(32, BYTES_PER_SAMPLE, true); // block align
  view.setUint16(34, 8 * BYTES_PER_SAMPLE, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(WAV_HEADER_BYTES + i * BYTES_PER_SAMPLE, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
  }
  return bytes;
}

function base64ToBytes(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Converts a captured recording (WebM, Ogg, or MP4) to 16 kHz mono WAV. */
export async function convertRecordingToWav(audio: RecordedAudio, decode: AudioDecoder = browserAudioDecoder): Promise<RecordedAudio> {
  let wav: Uint8Array<ArrayBuffer>;
  try {
    const decoded = await decode(base64ToBytes(audio.base64), WHISPER_SAMPLE_RATE);
    if (decoded.sampleRate !== WHISPER_SAMPLE_RATE) throw new Error('decoder ignored the requested sample rate');
    wav = encodeWav(downmixToMono(decoded.channels), WHISPER_SAMPLE_RATE);
  } catch {
    throw new RecordingError('RECORDING_FAILED', CONVERSION_FAILED_MESSAGE);
  }
  return { base64: await blobToBase64(new Blob([wav], { type: 'audio/wav' })), mimeType: 'audio/wav' };
}

type StatusRpc = { call(method: string, input?: unknown): Promise<unknown> };

/**
 * Returns the recording in the format the active speech provider needs. If status can't be
 * read, the recording is sent as captured and the server reports any format problem.
 */
export async function prepareAudioForUpload(
  rpc: StatusRpc,
  audio: RecordedAudio,
  convert: (audio: RecordedAudio) => Promise<RecordedAudio> = convertRecordingToWav
): Promise<RecordedAudio> {
  const status = (await rpc.call(STATUS_METHOD).catch(() => null)) as Partial<StatusResponse> | null;
  return status?.audioFormat === 'wav' ? convert(audio) : audio;
}
