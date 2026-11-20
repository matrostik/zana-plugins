import { describe, expect, it } from 'vitest';
import { cleanTranscription, isMeaningfulSpeech } from '../server/stt/clean.ts';
import { DEFAULT_LLM_MODELS, migrateModelName } from '../server/models.ts';

describe('cleanTranscription', () => {
  it('removes Whisper timestamps and bracketed non-speech tokens', () => {
    expect(cleanTranscription('[00:00:00.000 --> 00:00:02.500] Hello [BLANK_AUDIO] there (music)')).toBe('Hello there');
  });

  it('collapses whitespace and trims', () => {
    expect(cleanTranscription('  one \n\n two\t three  ')).toBe('one two three');
  });

  it('returns an empty string for empty input', () => {
    expect(cleanTranscription('')).toBe('');
  });
});

describe('isMeaningfulSpeech', () => {
  it('accepts text containing letters or digits in any script', () => {
    expect(isMeaningfulSpeech('Привіт світ')).toBe(true);
    expect(isMeaningfulSpeech('call 911')).toBe(true);
  });

  it('rejects blank, punctuation-only, and token-only transcripts', () => {
    expect(isMeaningfulSpeech('')).toBe(false);
    expect(isMeaningfulSpeech('... !!!')).toBe(false);
    expect(isMeaningfulSpeech('[silence]')).toBe(false);
  });
});

describe('migrateModelName', () => {
  it('maps retired OpenAI and Anthropic models to current ones', () => {
    expect(migrateModelName('gpt-4o-mini', 'openai')).toBe('gpt-5.4-nano');
    expect(migrateModelName('claude-3-5-haiku-20241022', 'anthropic')).toBe('claude-haiku-4-5-20251001');
  });

  it('keeps current model names unchanged', () => {
    expect(migrateModelName('gemini-3.8-flash', 'google')).toBe('gemini-3.8-flash');
  });

  it('uses the provider default when no model is set', () => {
    expect(migrateModelName(undefined, 'google')).toBe(DEFAULT_LLM_MODELS.google);
    expect(migrateModelName('', 'none')).toBe('');
  });
});
