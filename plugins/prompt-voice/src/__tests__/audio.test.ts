import { describe, expect, it } from 'vitest';
import { decodeAudioRequest, MAX_AUDIO_BYTES } from '../server/audio.ts';

const SAMPLE = Buffer.from('fake-audio-bytes').toString('base64');

describe('decodeAudioRequest', () => {
  it('decodes base64 audio and names the file from the MIME type', () => {
    const result = decodeAudioRequest({ audio: SAMPLE, mimeType: 'audio/webm;codecs=opus' });
    expect(result.buffer.toString()).toBe('fake-audio-bytes');
    expect(result.mimeType).toBe('audio/webm');
    expect(result.fileName).toBe('audio.webm');
  });

  it('rejects a missing or empty payload with AUDIO_EMPTY', () => {
    expect(() => decodeAudioRequest({ audio: '', mimeType: 'audio/webm' })).toThrow(expect.objectContaining({ code: 'AUDIO_EMPTY' }));
    expect(() => decodeAudioRequest({ mimeType: 'audio/webm' })).toThrow(expect.objectContaining({ code: 'AUDIO_EMPTY' }));
  });

  it('rejects padding-only, whitespace, or non-base64 payloads before decoding', () => {
    for (const audio of ['==', ' ', '\n\t', 'abc$def', `${SAMPLE} `]) {
      expect(() => decodeAudioRequest({ audio, mimeType: 'audio/webm' })).toThrow(expect.objectContaining({ code: 'AUDIO_EMPTY' }));
    }
  });

  it('rejects an unsupported MIME type', () => {
    expect(() => decodeAudioRequest({ audio: SAMPLE, mimeType: 'audio/wav' })).toThrow(
      expect.objectContaining({ code: 'AUDIO_TYPE_UNSUPPORTED' })
    );
  });

  it('rejects payloads whose decoded size exceeds the cap, before decoding', () => {
    const oversized = 'A'.repeat(Math.ceil((MAX_AUDIO_BYTES * 4) / 3) + 8);
    expect(() => decodeAudioRequest({ audio: oversized, mimeType: 'audio/webm' })).toThrow(
      expect.objectContaining({ code: 'AUDIO_TOO_LARGE' })
    );
  });

  it('accepts a payload exactly at the size boundary', () => {
    const atLimit = 'A'.repeat(Math.floor((MAX_AUDIO_BYTES * 4) / 3));
    expect(() => decodeAudioRequest({ audio: atLimit, mimeType: 'audio/webm' })).not.toThrow();
  });
});
