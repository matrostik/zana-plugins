// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  CONVERSION_FAILED_MESSAGE,
  convertRecordingToWav,
  downmixToMono,
  encodeWav,
  prepareAudioForUpload,
  WHISPER_SAMPLE_RATE,
  type AudioDecoder
} from '../app/wav.ts';

const RECORDED = { base64: Buffer.from('webm-bytes').toString('base64'), mimeType: 'audio/webm;codecs=opus' };

describe('encodeWav', () => {
  it('writes a 16-bit mono PCM header for the given rate', () => {
    const wav = encodeWav(new Float32Array(3), 16000);
    const view = new DataView(wav.buffer);
    const text = (offset: number, length: number) => String.fromCharCode(...wav.subarray(offset, offset + length));
    expect(wav.length).toBe(44 + 6);
    expect(text(0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(36 + 6);
    expect(text(8, 8)).toBe('WAVEfmt ');
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(28, true)).toBe(32000);
    expect(view.getUint16(32, true)).toBe(2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(text(36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(6);
  });

  it('scales samples to int16 and clips out-of-range values', () => {
    const wav = encodeWav(Float32Array.from([0, 1, -1, 2, -2, 0.5]), 16000);
    const view = new DataView(wav.buffer);
    const samples = Array.from({ length: 6 }, (_, i) => view.getInt16(44 + i * 2, true));
    expect(samples).toEqual([0, 32767, -32768, 32767, -32768, 16383]);
  });

  it('produces a header-only file for empty input', () => {
    expect(encodeWav(new Float32Array(0), 16000).length).toBe(44);
  });
});

describe('downmixToMono', () => {
  it('averages channels and stops at the shortest one', () => {
    expect(Array.from(downmixToMono([Float32Array.from([1, 0.5, 9]), Float32Array.from([0, 0.5])]))).toEqual([0.5, 0.5]);
  });

  it('returns a single channel unchanged and handles no channels', () => {
    const only = Float32Array.from([0.25]);
    expect(downmixToMono([only])).toBe(only);
    expect(downmixToMono([]).length).toBe(0);
  });
});

describe('convertRecordingToWav', () => {
  it('decodes the original bytes at 16 kHz and returns base64 WAV', async () => {
    const decode = vi.fn<AudioDecoder>(async () => ({ sampleRate: WHISPER_SAMPLE_RATE, channels: [Float32Array.from([0, 0.5]), Float32Array.from([0, 0.5])] }));
    const result = await convertRecordingToWav(RECORDED, decode);
    const [bytes, rate] = decode.mock.calls[0];
    expect(Buffer.from(bytes).toString()).toBe('webm-bytes');
    expect(rate).toBe(16000);
    expect(result.mimeType).toBe('audio/wav');
    const wav = Buffer.from(result.base64, 'base64');
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.length).toBe(44 + 4);
    expect(wav.readInt16LE(46)).toBe(16383);
  });

  it('fails with a clear recording error when decoding fails', async () => {
    const decode = vi.fn<AudioDecoder>(async () => {
      throw new DOMException('Unable to decode audio data', 'EncodingError');
    });
    await expect(convertRecordingToWav(RECORDED, decode)).rejects.toMatchObject({ code: 'RECORDING_FAILED', message: CONVERSION_FAILED_MESSAGE });
  });

  it('refuses audio that was not resampled to 16 kHz', async () => {
    const decode = vi.fn<AudioDecoder>(async () => ({ sampleRate: 48000, channels: [new Float32Array(4)] }));
    await expect(convertRecordingToWav(RECORDED, decode)).rejects.toMatchObject({ code: 'RECORDING_FAILED' });
  });
});

describe('prepareAudioForUpload', () => {
  const converted = { base64: 'UklGRg==', mimeType: 'audio/wav' };

  it('converts when the server asks for WAV', async () => {
    const convert = vi.fn(async () => converted);
    const rpc = { call: vi.fn(async () => ({ audioFormat: 'wav' })) };
    await expect(prepareAudioForUpload(rpc, RECORDED, convert)).resolves.toBe(converted);
    expect(rpc.call).toHaveBeenCalledWith('promptVoice.status');
  });

  it.each([
    ['the recorded format', async () => ({ audioFormat: 'recorded' })],
    ['an older server without audioFormat', async () => ({ sttProvider: 'system' })],
    ['an unreadable status', async () => Promise.reject(new Error('rpc down'))]
  ])('sends the recording as captured for %s', async (_label, call) => {
    const convert = vi.fn();
    await expect(prepareAudioForUpload({ call }, RECORDED, convert)).resolves.toBe(RECORDED);
    expect(convert).not.toHaveBeenCalled();
  });
});
