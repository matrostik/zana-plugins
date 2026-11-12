import { describe, expect, it, vi } from 'vitest';
import type { AudioInput } from '../server/audio.ts';
import { PromptVoiceError } from '../server/errors.ts';
import { runDictation } from '../server/pipeline.ts';
import { normalizeSettings } from '../server/settings.ts';
import { LocalWhisperSttProvider, TranscriptionQueue, type LocalWhisperEndpoint } from '../server/stt/localWhisper.ts';
import { createSttProvider } from '../server/stt/providers.ts';

const WAV: AudioInput = { buffer: Buffer.from('RIFF....WAVE'), mimeType: 'audio/wav', fileName: 'audio.wav' };

function endpoint(overrides: Partial<LocalWhisperEndpoint> = {}): LocalWhisperEndpoint {
  return { resolveBaseUrl: async () => 'http://127.0.0.1:41234', modelLabel: () => 'base', queue: new TranscriptionQueue(), ...overrides };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('LocalWhisperSttProvider', () => {
  it('posts WAV to the local inference endpoint and returns the trimmed text', async () => {
    const fetchImpl = vi.fn(async () => json({ text: ' Hello there.\n' }));
    const text = await new LocalWhisperSttProvider(endpoint(), fetchImpl).transcribe(WAV, 'he-IL');
    expect(text).toBe('Hello there.');

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:41234/inference');
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' });
    const form = init.body as FormData;
    expect(form.get('response_format')).toBe('json');
    expect(form.get('translate')).toBe('false');
    expect(form.get('language')).toBe('he');
    expect((form.get('file') as File).name).toBe('audio.wav');
  });

  it('asks the runtime to detect the language when set to auto', async () => {
    const fetchImpl = vi.fn(async () => json({ text: 'x' }));
    await new LocalWhisperSttProvider(endpoint(), fetchImpl).transcribe(WAV, 'auto');
    expect(((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData).get('language')).toBe('auto');
  });

  it('rejects compressed audio before contacting the runtime', async () => {
    const resolveBaseUrl = vi.fn(async () => 'http://127.0.0.1:1');
    const fetchImpl = vi.fn();
    await expect(
      new LocalWhisperSttProvider(endpoint({ resolveBaseUrl }), fetchImpl).transcribe({ ...WAV, mimeType: 'audio/webm' }, 'auto')
    ).rejects.toMatchObject({ code: 'AUDIO_TYPE_UNSUPPORTED' });
    expect(resolveBaseUrl).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [400, "couldn't read this recording"],
    [500, 'failed to transcribe']
  ])('gives a local message for HTTP %i without echoing the body', async (status, message) => {
    const fetchImpl = vi.fn(async () => json({ error: 'secret transcript text' }, status));
    const error = await new LocalWhisperSttProvider(endpoint(), fetchImpl).transcribe(WAV, 'auto').catch((e) => e);
    expect(error).toMatchObject({ code: 'STT_FAILED', status, userMessage: expect.stringContaining(message) });
    expect(`${error.userMessage} ${error.detail}`).not.toContain('secret transcript');
    expect(error.userMessage).not.toMatch(/API key/i);
  });

  it('says the runtime is not running when the connection is refused', async () => {
    const refused = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    const fetchImpl = vi.fn(async () => {
      throw refused;
    });
    const error = await new LocalWhisperSttProvider(endpoint(), fetchImpl).transcribe(WAV, 'auto').catch((e) => e);
    expect(error).toMatchObject({ code: 'STT_FAILED', userMessage: expect.stringContaining("isn't running") });
    expect(error.userMessage).not.toMatch(/internet/i);
  });

  it('reports a timeout as taking too long', async () => {
    const fetchImpl = vi.fn(async () => {
      throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    });
    await expect(new LocalWhisperSttProvider(endpoint(), fetchImpl).transcribe(WAV, 'auto')).rejects.toMatchObject({
      userMessage: expect.stringContaining('took too long')
    });
  });

  it.each([
    ['a body without text', () => json({ result: 'x' })],
    ['a JSON null body', () => json(null)],
    ['malformed JSON', () => new Response('not json', { status: 200 })]
  ])('treats %s as unreadable, not as silence', async (_label, respond) => {
    await expect(new LocalWhisperSttProvider(endpoint(), vi.fn(async () => respond())).transcribe(WAV, 'auto')).rejects.toMatchObject({
      code: 'STT_FAILED',
      userMessage: expect.stringContaining('unreadable')
    });
  });

  it('passes through errors from resolving the endpoint', async () => {
    const notReady = new PromptVoiceError('LOCAL_RUNTIME_FAILED', 'The selected model could not be loaded.');
    const fetchImpl = vi.fn();
    await expect(
      new LocalWhisperSttProvider(endpoint({ resolveBaseUrl: async () => Promise.reject(notReady) }), fetchImpl).transcribe(WAV, 'auto')
    ).rejects.toBe(notReady);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('TranscriptionQueue', () => {
  it('runs tasks one at a time in order', async () => {
    const queue = new TranscriptionQueue(3);
    const events: string[] = [];
    let release!: () => void;
    const first = queue.run(async () => {
      events.push('first:start');
      await new Promise<void>((resolve) => (release = resolve));
      events.push('first:end');
    });
    const second = queue.run(async () => {
      events.push('second');
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(events).toEqual(['first:start']);
    release();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second']);
    expect(queue.size).toBe(0);
  });

  it('rejects work beyond the limit and accepts it again once there is room', async () => {
    const queue = new TranscriptionQueue(1);
    let release!: () => void;
    const busy = queue.run(() => new Promise<void>((resolve) => (release = resolve)));
    await expect(queue.run(async () => 'x')).rejects.toMatchObject({ code: 'STT_FAILED', userMessage: expect.stringContaining('earlier recordings') });
    release();
    await busy;
    await expect(queue.run(async () => 'ok')).resolves.toBe('ok');
  });

  it('keeps going after a task fails', async () => {
    const queue = new TranscriptionQueue(3);
    const failing = queue.run(async () => {
      throw new Error('boom');
    });
    const next = queue.run(async () => 'next');
    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('next');
  });
});

describe('createSttProvider with local-whisper', () => {
  const settings = normalizeSettings({ sttProvider: 'local-whisper' });

  it('keeps local-whisper through settings normalization', () => {
    expect(settings.sttProvider).toBe('local-whisper');
  });

  it('never falls back to another provider when Local Whisper is unavailable', () => {
    expect(() => createSttProvider(settings, vi.fn(), { serverUrl: 'http://127.0.0.1:8780' })).toThrow(
      expect.objectContaining({ code: 'STT_FAILED', userMessage: expect.stringContaining('set up') })
    );
  });

  it('builds the local provider when an endpoint is available', () => {
    expect(createSttProvider(settings, vi.fn(), { localWhisper: endpoint() }).id).toBe('local-whisper');
  });
});

describe('runDictation with Local Whisper', () => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const settings = normalizeSettings({ sttProvider: 'local-whisper', llmProvider: 'none' });

  it('treats the runtime silence token as no speech, not as text', async () => {
    const fetchImpl = vi.fn(async () => json({ text: ' [BLANK_AUDIO]\n' }));
    await expect(runDictation(WAV, settings, { fetch: fetchImpl, log, localWhisper: endpoint() })).resolves.toEqual({ ok: true, status: 'no-speech' });
  });

  it('returns the local transcript with cleanup off, making no other requests', async () => {
    const fetchImpl = vi.fn(async () => json({ text: 'Please refactor the settings store.' }));
    const outcome = await runDictation(WAV, settings, { fetch: fetchImpl, log, localWhisper: endpoint() });
    expect(outcome).toMatchObject({ ok: true, status: 'ok', text: 'Please refactor the settings store.', sttProvider: 'local-whisper' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toMatch(/^http:\/\/127\.0\.0\.1:/);
  });
});
