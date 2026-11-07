import type { ToneId } from '../../shared/protocol.ts';

export interface PromptContext {
  tone: ToneId;
  customPrompt: string;
  dictionary: string[];
}

const TONE_INSTRUCTIONS: Record<Exclude<ToneId, 'custom'>, string> = {
  formal: 'Use formal, professional language. Avoid contractions and slang.',
  casual: 'Use natural, conversational language with a friendly tone.',
  technical: 'Use precise, technical language suitable for software or engineering documentation.',
  conversational: 'Write as if speaking naturally in a conversation. Keep it warm and direct.'
};

const CUSTOM_LANGUAGE_CONSTRAINT =
  'Mandatory language constraint: Preserve the original language or languages exactly. Never translate the text.';

function toneLine(ctx: PromptContext): string {
  if (ctx.tone === 'custom') return ctx.customPrompt || 'Keep the speaker’s natural tone.';
  return TONE_INSTRUCTIONS[ctx.tone];
}

function dictionarySection(terms: string[]): string {
  if (terms.length === 0) return '';
  return `\n\nSpecial terms to always spell correctly:\n${terms.map((term) => `- ${term}`).join('\n')}`;
}

/**
 * System prompt for the cleanup step. A custom prompt replaces the built-in rules, but the
 * language constraint is always kept. Ported from prompt-voice `buildSystemPrompt`.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  if (ctx.tone === 'custom' && ctx.customPrompt) {
    return `${ctx.customPrompt}\n\n${CUSTOM_LANGUAGE_CONSTRAINT}`;
  }

  return `You are a voice dictation assistant. The user has spoken text that was transcribed by speech-to-text software. Your job is to clean and refine the raw transcription.

Rules:
- Remove filler words (um, uh, like, you know, etc.)
- Fix false starts and repetitions
- Correct obvious transcription errors
- Add appropriate punctuation and capitalization
- ${toneLine(ctx)}
- Preserve the original language or languages exactly. Never translate the text.
- Preserve the user's intended meaning exactly — do not add or remove content
- Output ONLY the refined text, with no explanations or commentary${dictionarySection(ctx.dictionary)}`;
}

/** User message carrying the raw transcript to refine. */
export function buildUserMessage(rawText: string): string {
  return `Raw transcription:\n${rawText}`;
}
