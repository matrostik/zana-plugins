import type { LlmProviderId } from '../shared/protocol.ts';
import { DEFAULT_GEMINI_MODEL } from './gemini.ts';

/** Defaults used when the model setting is empty. */
export const DEFAULT_LLM_MODELS: Record<string, string> = {
  assistant: 'assistant',
  openai: 'gpt-5.4-nano',
  anthropic: 'claude-haiku-4-5-20251001',
  google: DEFAULT_GEMINI_MODEL
};

/**
 * Maps retired model names saved in older settings to current identifiers.
 * Ported from prompt-voice `src/main/llm/modelMigration.ts`.
 */
export function migrateModelName(model: string | undefined, provider: LlmProviderId): string {
  if (!model) {
    return provider === 'none' ? '' : (DEFAULT_LLM_MODELS[provider] ?? '');
  }

  if (provider === 'openai') {
    if (model === 'gpt-4o-mini' || model === 'gpt-3.5-turbo' || model === 'gpt-4-turbo') return 'gpt-5.4-nano';
    if (model === 'gpt-4o') return 'gpt-5.6-luna';
  }

  if (provider === 'anthropic') {
    if (model.startsWith('claude-3-opus') || model.startsWith('claude-3-5-sonnet') || model.startsWith('claude-3-sonnet')) {
      return 'claude-sonnet-5-20260201';
    }
    if (model === 'claude-3-5-haiku-20241022' || model === 'claude-3-haiku-20240307') {
      return 'claude-haiku-4-5-20251001';
    }
  }

  if (provider === 'google' && (model.startsWith('gemini-1.') || model.startsWith('gemini-2.'))) {
    return DEFAULT_GEMINI_MODEL;
  }

  return model;
}
