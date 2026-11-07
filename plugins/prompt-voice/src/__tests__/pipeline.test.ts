import { describe, expect, it, vi } from 'vitest';
import type { AudioInput } from '../server/audio.ts';
import { runDictation, type PipelineLogger } from '../server/pipeline.ts';
import { normalizeSettings, type PromptVoiceSettings } from '../server/settings.ts';
import { PromptVoiceError } from '../server/errors.ts';
import {
  OPENAI_CHAT_URL,
  ANTHROPIC_MESSAGES_URL,
  OpenAiLlmProvider,
  AnthropicLlmProvider,
  GoogleLlmProvider,
  AssistantLlmProvider,
  createLlmProvider,
  resolveLlmModel,
  isFixedTemperatureModel,
  openAiSamplingParams,
  REFINE_MAX_OUTPUT_TOKENS
} from '../server/llm/providers.ts';
import { GeminiSttProvider, SystemSttProvider } from '../server/stt/providers.ts';
import { buildSystemPrompt } from '../server/llm/prompts.ts';
import { DEFAULT_LLM_MODELS } from '../server/models.ts';

const AUDIO: AudioInput = { buffer: Buffer.from('audio'), mimeType: 'audio/webm', fileName: 'audio.webm' };
const OPENAI_STT_URL = 'https://api.openai.com/v1/audio/transcriptions';
const SYSTEM_VOICE_URL = 'http://127.0.0.1:8780/api/v1/system/voice-transcription';

function logger(): PipelineLogger {
  return { warn: vi.fn((_message: string) => undefined), error: vi.fn((_message: string) => undefined) };
}

/** Routes each provider URL to a canned response, so tests never touch the network. */
function routedFetch(routes: Record<string, () => Response>) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const match = Object.keys(routes).find((key) => url.startsWith(key));
    if (!match) throw new Error(`unexpected request to ${url}`);
    return routes[match]();
  });
}

function settings(overrides: Record<string, unknown> = {}): PromptVoiceSettings {
  return normalizeSettings({
    sttProvider: 'openai',
    openaiApiKey: 'sk-test',
    llmProvider: 'none',
    ...overrides
  });
}

describe('runDictation', () => {
  it('transcribes and cleans up using Zana native services without API keys', async () => {
    const fetch = routedFetch({
      [SYSTEM_VOICE_URL]: () => Response.json({ text: 'um the test passed' })
    });
    const assistant = {
      complete: vi.fn(async () => ({ text: 'The test passed.' }))
    };
    const outcome = await runDictation(
      AUDIO,
      normalizeSettings({ sttProvider: 'system', llmProvider: 'assistant' }),
      { fetch, log: logger(), assistant, serverUrl: 'http://127.0.0.1:8780' }
    );
    expect(outcome).toEqual(
      expect.objectContaining({
        ok: true,
        status: 'ok',
        rawText: 'um the test passed',
        text: 'The test passed.',
        sttProvider: 'system',
        llmProvider: 'assistant'
      })
    );
    expect(assistant.complete).toHaveBeenCalled();
  });

  it('returns the transcript as-is when cleanup is off', async () => {
    const fetch = routedFetch({ [OPENAI_STT_URL]: () => new Response('  hello world  ') });
    const outcome = await runDictation(AUDIO, settings(), { fetch, log: logger() });
    expect(outcome).toEqual(
      expect.objectContaining({ ok: true, status: 'ok', rawText: 'hello world', text: 'hello world', llmModel: null })
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reports no-speech for a silent recording without calling cleanup', async () => {
    const fetch = routedFetch({ [OPENAI_STT_URL]: () => new Response('[BLANK_AUDIO]') });
    const outcome = await runDictation(AUDIO, settings({ llmProvider: 'openai' }), { fetch, log: logger() });
    expect(outcome).toEqual({ ok: true, status: 'no-speech' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('runs cleanup and returns the refined text', async () => {
    const fetch = routedFetch({
      [OPENAI_STT_URL]: () => new Response('um so the deploy is done'),
      [OPENAI_CHAT_URL]: () =>
        Response.json({ choices: [{ message: { content: 'The deploy is done.' } }] })
    });
    const outcome = await runDictation(AUDIO, settings({ llmProvider: 'openai' }), { fetch, log: logger() });
    expect(outcome).toEqual(
      expect.objectContaining({ status: 'ok', rawText: 'um so the deploy is done', text: 'The deploy is done.', llmModel: 'gpt-5.4-nano' })
    );
    expect(outcome).not.toHaveProperty('refineNotice');
  });

  it('falls back to the raw transcript with a notice when cleanup fails', async () => {
    const log = logger();
    const fetch = routedFetch({
      [OPENAI_STT_URL]: () => new Response('raw words'),
      [ANTHROPIC_MESSAGES_URL]: () => new Response('{"error":"overloaded"}', { status: 529 })
    });
    const outcome = await runDictation(AUDIO, settings({ llmProvider: 'anthropic', anthropicApiKey: 'ak' }), { fetch, log });
    expect(outcome).toEqual(
      expect.objectContaining({
        status: 'ok',
        text: 'raw words',
        refineNotice: expect.objectContaining({ code: 'LLM_FAILED' })
      })
    );
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Cleanup skipped'));
  });

  it('stops before any network call when the STT key is missing on legacy provider', async () => {
    const fetch = routedFetch({});
    await expect(runDictation(AUDIO, settings({ openaiApiKey: '' }), { fetch, log: logger() })).rejects.toMatchObject({
      code: 'MISSING_KEY'
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('turns an STT HTTP failure into a user message without the provider body', async () => {
    const fetch = routedFetch({
      [OPENAI_STT_URL]: () => new Response('{"error":{"message":"secret account detail"}}', { status: 401 })
    });
    const error = await runDictation(AUDIO, settings(), { fetch, log: logger() }).catch((err: unknown) => err);
    expect(error).toMatchObject({ code: 'STT_FAILED' });
    expect((error as { userMessage: string }).userMessage).toContain('Invalid or expired OpenAI API key');
    expect((error as { userMessage: string }).userMessage).not.toContain('secret account detail');
  });

  it('logs only allowlisted error identifiers, never the raw provider body', async () => {
    const body = JSON.stringify({
      error: { message: 'echoed transcript sk-leaked-key', type: 'invalid_request_error', code: 'invalid_api_key' }
    });
    const fetch = routedFetch({
      [OPENAI_STT_URL]: () => new Response(body, { status: 401, headers: { 'x-request-id': 'req_123' } })
    });
    const error = await runDictation(AUDIO, settings(), { fetch, log: logger() }).catch((err: unknown) => err);
    const detail = (error as { detail: string }).detail;
    expect(detail).toContain('HTTP 401');
    expect(detail).toContain('type=invalid_request_error');
    expect(detail).toContain('code=invalid_api_key');
    expect(detail).toContain('request_id=req_123');
    expect(detail).not.toContain('echoed transcript');
    expect(detail).not.toContain('sk-leaked-key');
  });

  it('logs a malformed cleanup response without quoting the response body', async () => {
    const log = logger();
    const fetch = routedFetch({
      [OPENAI_STT_URL]: () => new Response('raw words'),
      [OPENAI_CHAT_URL]: () =>
        new Response('{"choices": secret transcript text', { status: 200, headers: { 'x-request-id': 'req_456' } })
    });
    const outcome = await runDictation(AUDIO, settings({ llmProvider: 'openai' }), { fetch, log });
    expect(outcome).toEqual(expect.objectContaining({ text: 'raw words', refineNotice: expect.objectContaining({ code: 'LLM_FAILED' }) }));
    const logged = vi.mocked(log.warn).mock.calls.map(([message]) => message).join(' | ');
    expect(logged).toContain('malformed JSON');
    expect(logged).toContain('request_id=req_456');
    expect(logged).not.toContain('secret transcript text');
  });

  it('logs only a classification for unexpected transport errors, never the error message', async () => {
    const log = logger();
    const fetch = vi.fn(async (input: string | URL | Request) => {
      if (String(input).startsWith(OPENAI_STT_URL)) return new Response('raw words');
      throw new TypeError('fetch failed: leaked transcript text', { cause: { code: 'ECONNREFUSED' } });
    });
    await runDictation(AUDIO, settings({ llmProvider: 'openai' }), { fetch, log });
    const logged = vi.mocked(log.warn).mock.calls.map(([message]) => message).join(' | ');
    expect(logged).toContain('kind=network');
    expect(logged).toContain('name=TypeError');
    expect(logged).toContain('code=ECONNREFUSED');
    expect(logged).not.toContain('leaked transcript text');
  });
});

describe('SystemSttProvider', () => {
  it('transcribes audio via Zana system voice-transcription endpoint without keys', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe(SYSTEM_VOICE_URL);
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeInstanceOf(FormData);
      return Response.json({ text: 'transcribed from zana host' });
    });
    const provider = new SystemSttProvider('http://127.0.0.1:8780', fetchImpl as never);
    const result = await provider.transcribe(AUDIO, 'auto');
    expect(result).toBe('transcribed from zana host');
  });

  it('reports a malformed host response as an unreadable STT_FAILED', async () => {
    const fetchImpl = vi.fn(async () => new Response('not json', { status: 200 }));
    const provider = new SystemSttProvider('http://127.0.0.1:8780', fetchImpl as never);
    await expect(provider.transcribe(AUDIO, 'auto')).rejects.toMatchObject({
      code: 'STT_FAILED',
      userMessage: 'Zana Voice returned an unreadable response. Try again.'
    });
  });

  it('treats a JSON null body as no speech', async () => {
    const fetchImpl = vi.fn(async () => Response.json(null));
    const provider = new SystemSttProvider('http://127.0.0.1:8780', fetchImpl as never);
    await expect(provider.transcribe(AUDIO, 'auto')).resolves.toBe('');
  });

  it('passes language prompt when specified', async () => {
    let capturedBody: FormData | undefined;
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = init?.body as FormData;
      return Response.json({ text: 'hallo welt' });
    });
    const provider = new SystemSttProvider('http://127.0.0.1:8780', fetchImpl as never);
    await provider.transcribe(AUDIO, 'de');
    expect(capturedBody?.get('prompt')).toContain('de');
  });

  it('throws STT_FAILED on host transcription error', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ error: 'voice_disabled', message: 'Voice input is turned off' }, { status: 403 })
    );
    const provider = new SystemSttProvider('http://127.0.0.1:8780', fetchImpl as never);
    await expect(provider.transcribe(AUDIO, 'en')).rejects.toMatchObject({
      code: 'STT_FAILED'
    });
  });
});

describe('AssistantLlmProvider', () => {
  it('refines text through Zana assistant inference', async () => {
    const assistant = {
      complete: vi.fn(async ({ instructions, prompt }: { instructions: string; prompt: string }) => {
        expect(instructions).toContain('conversational');
        expect(prompt).toContain('raw text');
        return { text: 'Refined assistant text.' };
      })
    };
    const provider = new AssistantLlmProvider(assistant);
    const result = await provider.refine('conversational instructions', 'raw text');
    expect(result).toBe('Refined assistant text.');
    expect(provider.id).toBe('assistant');
  });

  it('throws LLM_FAILED if assistant returns empty text', async () => {
    const assistant = {
      complete: vi.fn(async () => ({ text: '   ' }))
    };
    const provider = new AssistantLlmProvider(assistant);
    await expect(provider.refine('inst', 'text')).rejects.toMatchObject({
      code: 'LLM_FAILED'
    });
  });

  it('does not expose the original exception message to the user', async () => {
    const assistant = {
      complete: vi.fn(async () => {
        throw new Error('token sk-secret leaked with transcript text');
      })
    };
    const provider = new AssistantLlmProvider(assistant);
    const error = (await provider.refine('inst', 'text').catch((err: unknown) => err)) as PromptVoiceError;
    expect(error).toBeInstanceOf(PromptVoiceError);
    expect(error.code).toBe('LLM_FAILED');
    expect(error.userMessage).not.toContain('sk-secret');
    expect(error.detail).not.toContain('sk-secret');
  });

  it('times out a call that never settles and aborts its signal', async () => {
    let received: AbortSignal | undefined;
    const assistant = {
      complete: vi.fn(({ signal }: { signal?: AbortSignal }) => {
        received = signal;
        return new Promise<{ text: string }>(() => {});
      })
    };
    const provider = new AssistantLlmProvider(assistant, 10);
    await expect(provider.refine('inst', 'text')).rejects.toMatchObject({
      code: 'LLM_FAILED',
      userMessage: expect.stringContaining('timed out')
    });
    expect(received?.aborted).toBe(true);
  });

  it('always reports the assistant label as its model', () => {
    const provider = new AssistantLlmProvider({ complete: vi.fn() });
    expect(provider.model).toBe('assistant');
  });
});

describe('createLlmProvider', () => {
  const fetchImpl = vi.fn() as never;

  it('returns null only when cleanup is off', () => {
    expect(createLlmProvider(normalizeSettings({ llmProvider: 'none' }), fetchImpl)).toBeNull();
  });

  it('throws LLM_FAILED when the assistant is not available', () => {
    expect(() => createLlmProvider(normalizeSettings({ llmProvider: 'assistant' }), fetchImpl)).toThrow(
      expect.objectContaining({ code: 'LLM_FAILED' })
    );
  });

  it('throws MISSING_KEY for a direct provider without a key instead of switching engines', () => {
    const assistant = { complete: vi.fn() };
    expect(() =>
      createLlmProvider(normalizeSettings({ llmProvider: 'anthropic' }), fetchImpl, undefined, { assistant })
    ).toThrow(expect.objectContaining({ code: 'MISSING_KEY' }));
    expect(assistant.complete).not.toHaveBeenCalled();
  });

  it('ignores a Cleanup model setting for the assistant', () => {
    const settings = normalizeSettings({ llmProvider: 'assistant', llmModel: 'some-model' });
    expect(resolveLlmModel(settings)).toBe('assistant');
  });
});

describe('GeminiSttProvider', () => {
  it('transcribes audio via generateContent inline data', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.contents[0].parts[0].inline_data.data).toBe(AUDIO.buffer.toString('base64'));
      return Response.json({
        candidates: [{ content: { parts: [{ text: 'transcribed speech from gemini' }] } }]
      });
    });
    const provider = new GeminiSttProvider('test-key', 'gemini-3.8-flash', fetchImpl as never);
    const result = await provider.transcribe(AUDIO, 'en');
    expect(result).toBe('transcribed speech from gemini');
  });

  it('fails with STT_FAILED instead of inserting a transcript cut off at MAX_TOKENS', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'partial' }] } }] })
    );
    const provider = new GeminiSttProvider('test-key', 'gemini-3.8-flash', fetchImpl as never);
    await expect(provider.transcribe(AUDIO, 'en')).rejects.toMatchObject({ code: 'STT_FAILED' });
  });

  it('fails with STT_FAILED when the prompt is blocked rather than reporting no speech', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ promptFeedback: { blockReason: 'SAFETY' } }));
    const provider = new GeminiSttProvider('test-key', 'gemini-3.8-flash', fetchImpl as never);
    await expect(provider.transcribe(AUDIO, 'en')).rejects.toMatchObject({ code: 'STT_FAILED' });
  });

  it('fails with STT_FAILED when the candidate stopped for safety', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ candidates: [{ finishReason: 'SAFETY' }] }));
    const provider = new GeminiSttProvider('test-key', 'gemini-3.8-flash', fetchImpl as never);
    await expect(provider.transcribe(AUDIO, 'en')).rejects.toMatchObject({ code: 'STT_FAILED' });
  });

  it('still returns an empty transcript for a normal STOP with no text', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [] } }] }));
    const provider = new GeminiSttProvider('test-key', 'gemini-3.8-flash', fetchImpl as never);
    await expect(provider.transcribe(AUDIO, 'en')).resolves.toBe('');
  });
});

describe('GoogleLlmProvider', () => {
  it('refines text successfully on 200 OK', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers['x-goog-api-key']).toBe('gemini-key');
      expect(JSON.parse(String(init?.body)).generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(REFINE_MAX_OUTPUT_TOKENS);
      return Response.json({
        candidates: [{ content: { parts: [{ text: 'Refined Google text.' }] } }]
      });
    });
    const provider = new GoogleLlmProvider('gemini-key', 'gemini-3.8-flash', fetchImpl as never);
    const result = await provider.refine('sys prompt', 'raw text');
    expect(result).toBe('Refined Google text.');
  });

  it('throws LLM_FAILED when output limit is reached', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Truncated' }] } }]
      })
    );
    const provider = new GoogleLlmProvider('gemini-key', 'gemini-3.8-flash', fetchImpl as never);
    await expect(provider.refine('sys prompt', 'raw text')).rejects.toMatchObject({
      code: 'LLM_FAILED'
    });
  });

  it.each(['SAFETY', 'RECITATION'])('rejects partial text when finishReason is %s', async (finishReason) => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ candidates: [{ finishReason, content: { parts: [{ text: 'Partial' }] } }] })
    );
    const provider = new GoogleLlmProvider('gemini-key', 'gemini-3.8-flash', fetchImpl as never);
    await expect(provider.refine('sys prompt', 'raw text')).rejects.toMatchObject({
      code: 'LLM_FAILED',
      detail: `Google Gemini cleanup stopped: finishReason is ${finishReason}`
    });
  });
});

describe('AnthropicLlmProvider', () => {
  it('refines text successfully on 200 OK', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers['x-api-key']).toBe('anthropic-key');
      return Response.json({
        content: [{ type: 'text', text: 'Refined Anthropic text.' }]
      });
    });
    const provider = new AnthropicLlmProvider('anthropic-key', DEFAULT_LLM_MODELS.anthropic, fetchImpl as never);
    const result = await provider.refine('sys prompt', 'raw text');
    expect(result).toBe('Refined Anthropic text.');
  });

  it('throws LLM_FAILED when output token limit is reached (stop_reason max_tokens)', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        stop_reason: 'max_tokens',
        content: [{ type: 'text', text: 'Cut off text' }]
      })
    );
    const provider = new AnthropicLlmProvider('anthropic-key', DEFAULT_LLM_MODELS.anthropic, fetchImpl as never);
    await expect(provider.refine('sys prompt', 'raw text')).rejects.toMatchObject({
      code: 'LLM_FAILED'
    });
  });
});

describe('OpenAiLlmProvider', () => {
  it('throws LLM_FAILED when finish_reason is length', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [{ finish_reason: 'length', message: { content: 'Truncated text' } }]
      })
    );
    const provider = new OpenAiLlmProvider('sk-test', 'gpt-5.4-nano', fetchImpl as never);
    await expect(provider.refine('sys prompt', 'raw text')).rejects.toMatchObject({
      code: 'LLM_FAILED'
    });
  });

  it('omits temperature for fixed-temperature models such as gpt-5.4-nano', async () => {
    let capturedBody: any;
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return Response.json({
        choices: [{ message: { content: 'Clean text.' } }]
      });
    });
    const provider = new OpenAiLlmProvider('sk-test', 'gpt-5.4-nano', fetchImpl as never);
    await provider.refine('sys prompt', 'raw text');
    expect(capturedBody).not.toHaveProperty('temperature');
  });

  it('gives reasoning models low effort and headroom beyond the visible-output cap', () => {
    const reasoning = openAiSamplingParams('gpt-5.4-nano');
    expect(reasoning.reasoning_effort).toBe('low');
    expect(reasoning.max_completion_tokens).toBeGreaterThan(REFINE_MAX_OUTPUT_TOKENS);
    expect(openAiSamplingParams('gpt-4.1-mini')).toEqual({ temperature: 0.3, max_completion_tokens: REFINE_MAX_OUTPUT_TOKENS });
  });
});

describe('isFixedTemperatureModel', () => {
  it('matches luna, o-series (o1, o3, o4), and gpt-5 reasoning families', () => {
    expect(isFixedTemperatureModel('gpt-5.4-nano')).toBe(true);
    expect(isFixedTemperatureModel('gpt-5.6-luna')).toBe(true);
    expect(isFixedTemperatureModel('o1-mini')).toBe(true);
    expect(isFixedTemperatureModel('o3-mini')).toBe(true);
    expect(isFixedTemperatureModel('o4-mini')).toBe(true);
    expect(isFixedTemperatureModel('omni-moderation-latest')).toBe(false);
    expect(isFixedTemperatureModel('gpt-4o')).toBe(false);
  });
});

describe('buildSystemPrompt', () => {
  it('formats custom tone with customPrompt and language constraint', () => {
    const prompt = buildSystemPrompt({
      tone: 'custom',
      customPrompt: 'Fix punctuation only.',
      dictionary: []
    });
    expect(prompt).toContain('Fix punctuation only.');
    expect(prompt).toContain('Never translate the text.');
  });

  it('formats dictionary terms correctly', () => {
    const prompt = buildSystemPrompt({
      tone: 'technical',
      customPrompt: '',
      dictionary: ['Zana', 'TypeScript']
    });
    expect(prompt).toContain('Special terms to always spell correctly:');
    expect(prompt).toContain('- Zana');
    expect(prompt).toContain('- TypeScript');
  });
});
