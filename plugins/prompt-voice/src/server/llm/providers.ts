import { describeProviderError, describeUnexpectedFailure, missingKeyError, PromptVoiceError } from '../errors.ts';
import { GEMINI_FINISH_OK, geminiGenerateContentUrl } from '../gemini.ts';
import { postJson, PROVIDER_TIMEOUT_MS, type FetchLike, type ProviderCall } from '../http.ts';
import { migrateModelName } from '../models.ts';
import { API_KEY_LABELS, LLM_PROVIDER_KEYS, type PromptVoiceSettings } from '../settings.ts';
import type { LlmProviderId } from '../../shared/protocol.ts';

export const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
export const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

/** Output cap for one refinement, applied to every provider. Dictation cleanup is short; this bounds cost on runaway output. */
export const REFINE_MAX_OUTPUT_TOKENS = 1024;
/**
 * Reasoning models count hidden reasoning tokens against the output cap, so they get
 * extra headroom on top of the visible-output cap. Low reasoning effort keeps that spend small.
 */
export const REASONING_TOKEN_HEADROOM = 3072;
export const REFINE_REASONING_EFFORT = 'low';
const REFINE_TEMPERATURE = 0.3;

export interface LlmProvider {
  readonly id: Exclude<LlmProviderId, 'none'>;
  readonly model: string;
  /** Returns refined text for the given system prompt and user message. */
  refine(systemPrompt: string, userMessage: string): Promise<string>;
}

/** OpenAI o-series reasoning models: "o" followed by a digit (o1, o3-mini, o4-mini, ...). */
const O_SERIES_MODEL_PATTERN = /^o[0-9]/;

/**
 * Reasoning models reject a custom temperature.
 * Includes luna, OpenAI o-series reasoning families (o1, o3, o4, ...), and gpt-5 reasoning families
 * (e.g. gpt-5.4-nano), which reject custom temperatures and require fixed defaults.
 */
export function isFixedTemperatureModel(model: string): boolean {
  return model.includes('luna') || O_SERIES_MODEL_PATTERN.test(model) || model.includes('gpt-5');
}

/**
 * Temperature and token budget for an OpenAI cleanup request. Reasoning models get low
 * effort and extra headroom so hidden reasoning does not use up the visible-output budget.
 */
export function openAiSamplingParams(model: string): Record<string, string | number> {
  if (isFixedTemperatureModel(model)) {
    return {
      reasoning_effort: REFINE_REASONING_EFFORT,
      max_completion_tokens: REFINE_MAX_OUTPUT_TOKENS + REASONING_TOKEN_HEADROOM
    };
  }
  return { temperature: REFINE_TEMPERATURE, max_completion_tokens: REFINE_MAX_OUTPUT_TOKENS };
}

interface OpenAiChatResponse {
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: string | null };
  }>;
}

/** Minimal view of `zcc.sdk.assistant`: bounded text-only inference with no agent tools or project access. */
export interface AssistantApi {
  complete(args: { instructions: string; prompt: string; signal?: AbortSignal }): Promise<{ text: string }>;
}

/**
 * The assistant API takes no model parameter, so the Cleanup model setting cannot apply to it.
 * The response reports this label instead of the unused setting.
 */
export const ASSISTANT_MODEL_LABEL = 'assistant';
const ASSISTANT_LABEL = 'Zana Assistant';

/**
 * Uses Zana's built-in assistant inference (`zcc.sdk.assistant.complete`).
 * Bounded text-only call using the host's existing login; requires no API key.
 */
export class AssistantLlmProvider implements LlmProvider {
  readonly id = 'assistant' as const;
  readonly model = ASSISTANT_MODEL_LABEL;

  constructor(
    private readonly assistant: AssistantApi,
    private readonly timeoutMs = PROVIDER_TIMEOUT_MS
  ) {}

  async refine(systemPrompt: string, userMessage: string): Promise<string> {
    let response: { text: string };
    try {
      response = await withDeadline(
        (signal) => this.assistant.complete({ instructions: systemPrompt, prompt: userMessage, signal }),
        this.timeoutMs
      );
    } catch (err) {
      // Never surface err.message: it may quote credentials, transcript text, or host internals.
      throw new PromptVoiceError('LLM_FAILED', describeProviderError(err, ASSISTANT_LABEL), {
        detail: describeUnexpectedFailure(err, ASSISTANT_LABEL)
      });
    }
    return requireText(response?.text, ASSISTANT_LABEL);
  }
}

/**
 * Runs `task` with an abort signal and rejects with a TimeoutError after `timeoutMs`, even if the
 * task ignores the signal. A stuck call still reaches the pipeline's raw-transcript fallback.
 */
async function withDeadline<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const timeout = new Error(`Timed out after ${timeoutMs} ms`);
      timeout.name = 'TimeoutError';
      controller.abort(timeout);
      reject(timeout);
    }, timeoutMs);
  });
  try {
    return await Promise.race([task(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export class OpenAiLlmProvider implements LlmProvider {
  readonly id = 'openai' as const;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly fetchImpl: FetchLike
  ) {}

  async refine(systemPrompt: string, userMessage: string): Promise<string> {
    const data = await postJson<OpenAiChatResponse>(
      this.fetchImpl,
      OPENAI_CHAT_URL,
      { Authorization: `Bearer ${this.apiKey}` },
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        ...openAiSamplingParams(this.model)
      },
      this.callInfo()
    );
    const choice = data.choices?.[0];
    if (choice?.finish_reason === 'length') {
      throw new PromptVoiceError('LLM_FAILED', 'OpenAI response reached the token limit. Raw transcript inserted.', {
        detail: 'OpenAI output cut off: finish_reason is length'
      });
    }
    return requireText(choice?.message?.content, 'OpenAI');
  }

  private callInfo(): ProviderCall {
    return { label: 'OpenAI', code: 'LLM_FAILED', model: this.model };
  }
}

interface AnthropicMessageResponse {
  stop_reason?: string | null;
  content?: Array<{ type?: string; text?: string }>;
}

export class AnthropicLlmProvider implements LlmProvider {
  readonly id = 'anthropic' as const;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly fetchImpl: FetchLike
  ) {}

  async refine(systemPrompt: string, userMessage: string): Promise<string> {
    const data = await postJson<AnthropicMessageResponse>(
      this.fetchImpl,
      ANTHROPIC_MESSAGES_URL,
      { 'x-api-key': this.apiKey, 'anthropic-version': ANTHROPIC_API_VERSION },
      {
        model: this.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: REFINE_MAX_OUTPUT_TOKENS
      },
      { label: 'Anthropic', code: 'LLM_FAILED', model: this.model }
    );
    if (data.stop_reason === 'max_tokens') {
      throw new PromptVoiceError('LLM_FAILED', 'Anthropic response reached the token limit. Raw transcript inserted.', {
        detail: 'Anthropic output cut off: stop_reason is max_tokens'
      });
    }
    const block = data.content?.[0];
    return requireText(block?.type === 'text' ? block.text : undefined, 'Anthropic');
  }
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    finishReason?: string | null;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export class GoogleLlmProvider implements LlmProvider {
  readonly id = 'google' as const;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly fetchImpl: FetchLike
  ) {}

  async refine(systemPrompt: string, userMessage: string): Promise<string> {
    const data = await postJson<GeminiGenerateResponse>(
      this.fetchImpl,
      geminiGenerateContentUrl(this.model),
      { 'x-goog-api-key': this.apiKey },
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        // Gemini thinking models count thoughts against maxOutputTokens, so reuse the reasoning headroom.
        generationConfig: { maxOutputTokens: REFINE_MAX_OUTPUT_TOKENS + REASONING_TOKEN_HEADROOM }
      },
      { label: 'Google Gemini', code: 'LLM_FAILED', model: this.model }
    );
    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    if (finishReason === 'MAX_TOKENS') {
      throw new PromptVoiceError('LLM_FAILED', 'Google Gemini response reached the token limit. Raw transcript inserted.', {
        detail: 'Google Gemini output cut off: finishReason is MAX_TOKENS'
      });
    }
    // SAFETY, RECITATION and similar stops can carry partial text; never insert it as a finished refinement.
    if (finishReason && finishReason !== GEMINI_FINISH_OK) {
      throw new PromptVoiceError('LLM_FAILED', 'Google Gemini could not clean up this transcript. Raw transcript inserted.', {
        detail: `Google Gemini cleanup stopped: finishReason is ${finishReason}`
      });
    }
    const text = (candidate?.content?.parts ?? []).map((part) => part.text ?? '').join('');
    return requireText(text, 'Google Gemini');
  }
}

function requireText(text: string | null | undefined, label: string): string {
  const trimmed = text?.trim();
  if (!trimmed) {
    throw new PromptVoiceError('LLM_FAILED', `${label} returned an empty response. Try again.`, {
      detail: `${label} returned no text content`
    });
  }
  return trimmed;
}

/**
 * Resolves the effective LLM model name from settings, migrating retired aliases.
 * The assistant always reports its fixed label because it does not accept a model.
 */
export function resolveLlmModel(settings: Pick<PromptVoiceSettings, 'llmModel' | 'llmProvider'>): string {
  if (settings.llmProvider === 'assistant') return ASSISTANT_MODEL_LABEL;
  return migrateModelName(settings.llmModel || undefined, settings.llmProvider);
}

export interface LlmFactoryDeps {
  assistant?: AssistantApi;
}

/**
 * Builds the cleanup provider for the configured engine. Returns null only when cleanup is off.
 * A selected provider that cannot be built throws, so the pipeline tells the user why cleanup was skipped.
 */
export function createLlmProvider(
  settings: PromptVoiceSettings,
  fetchImpl: FetchLike,
  resolvedModel?: string,
  deps: LlmFactoryDeps = {}
): LlmProvider | null {
  if (settings.llmProvider === 'none') return null;
  if (settings.llmProvider === 'assistant') return createAssistantProvider(deps.assistant);
  const direct = createDirectProvider(settings, resolvedModel ?? resolveLlmModel(settings), fetchImpl);
  if (direct) return direct;
  throw new PromptVoiceError(
    'LLM_FAILED',
    `Cleanup provider "${settings.llmProvider}" is not supported. Choose another in Prompt Voice settings.`
  );
}

function createAssistantProvider(assistant: AssistantApi | undefined): LlmProvider {
  if (!assistant) throw new PromptVoiceError('LLM_FAILED', 'Zana assistant inference is not available.');
  return new AssistantLlmProvider(assistant);
}

/**
 * Direct API providers. Each one needs its own key and throws MISSING_KEY without it, like the
 * STT factory. Returns null for a provider id that is not a direct API provider.
 */
function createDirectProvider(settings: PromptVoiceSettings, model: string, fetchImpl: FetchLike): LlmProvider | null {
  const keyName = LLM_PROVIDER_KEYS[settings.llmProvider];
  if (!keyName) return null;
  const apiKey = settings.keys[keyName];
  if (!apiKey) throw missingKeyError(API_KEY_LABELS[keyName]);
  switch (settings.llmProvider) {
    case 'openai':
      return new OpenAiLlmProvider(apiKey, model, fetchImpl);
    case 'anthropic':
      return new AnthropicLlmProvider(apiKey, model, fetchImpl);
    case 'google':
      return new GoogleLlmProvider(apiKey, model, fetchImpl);
    default:
      return null;
  }
}
