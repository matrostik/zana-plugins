import type { ImproveToneId, ToneId } from '../../shared/protocol.ts';

export interface PromptContext {
  tone: ToneId;
  customPrompt: string;
  /** Optional transformation instruction for non-custom Studio presets (e.g. Summarize, Spec). */
  instruction?: string;
  /** Target language label when translating text instead of preserving the original language. */
  targetLanguage?: string;
  dictionary: string[];
}

const TONE_INSTRUCTIONS: Record<ImproveToneId, string> = {
  standard: 'Fix grammar, spelling, punctuation, and awkward phrasing into clear, natural, well-written text while preserving the speaker’s natural register.',
  casual: 'Use relaxed, everyday casual language while keeping the writing clean and natural.',
  conversational: 'Write as if speaking naturally in a conversation. Keep it warm, clear, and direct.',
  formal: 'Use polished, professional language suitable for workplace communication. Avoid slang.',
  technical: 'Use precise, clear technical language suitable for software or engineering communication.'
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
 * System prompt for the cleanup and text-improvement step.
 * - Custom prompts (`tone === 'custom'`) apply the user's instructions directly.
 * - Preset transformations (`instruction`) apply the preset format + selected tone.
 * - Standard improvement/cleanup fixes grammar, phrasing, and transcription errors without extending length.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  const dict = dictionarySection(ctx.dictionary);

  if (ctx.tone === 'custom' && ctx.customPrompt) {
    return `${ctx.customPrompt}\n\n${CUSTOM_LANGUAGE_CONSTRAINT}${dict}`;
  }

  const trimmedTargetLanguage = ctx.targetLanguage?.trim();
  if (trimmedTargetLanguage) {
    return `You are a translation assistant. Translate the user’s text naturally and accurately into ${trimmedTargetLanguage}.

Rules:
- Clean up filler words (um, uh, like, you know, etc.), false starts, and obvious typos or transcription errors while translating
- Keep roughly the same length and level of detail; do not expand, pad, or add new ideas
- Preserve code blocks, inline code identifiers, URLs, Markdown formatting, and special terms from the dictionary
- If parts or all of the text are already in ${trimmedTargetLanguage}, keep them in ${trimmedTargetLanguage} and fix grammar and clarity
- Output ONLY the translated text, with no explanations or commentary${dict}`;
  }

  const trimmedInstruction = ctx.instruction?.trim();
  if (trimmedInstruction) {
    return `You are a writing assistant. Transform the user's text according to the instruction below.

Instruction:
- ${trimmedInstruction}

Rules:
- ${toneLine(ctx)}
- Preserve the original language or languages exactly. Never translate the text.
- Preserve the user's intended meaning without inventing facts
- Output ONLY the transformed text, with no explanations or commentary${dict}`;
  }

  return `You are a writing and voice dictation assistant. Your job is to improve the user's text into clean, natural, proper text.

Rules:
- Fix grammar, spelling, punctuation, awkward phrasing, and obvious transcription errors
- Remove filler words (um, uh, like, you know, etc.), false starts, and repetitions
- ${toneLine(ctx)}
- Keep roughly the same length as the input; do not expand, pad, or add new ideas or content
- Preserve the original language or languages exactly. Never translate the text.
- Preserve the user's intended meaning exactly
- Output ONLY the improved text, with no explanations or commentary${dict}`;
}

/** User message carrying the raw transcript or draft text to improve. */
export function buildUserMessage(rawText: string): string {
  return `Raw text:\n${rawText}`;
}
