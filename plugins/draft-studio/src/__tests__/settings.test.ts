import { describe, expect, it } from 'vitest';
import {
  DICTIONARY_MAX_TERMS,
  DICTIONARY_MAX_TERM_LENGTH,
  normalizeSettings,
  parseDictionary
} from '../server/settings.ts';
import { migrateModelName } from '../server/models.ts';

describe('normalizeSettings', () => {
  it('applies defaults for an empty configuration', () => {
    const settings = normalizeSettings({});
    expect(settings.sttProvider).toBe('system');
    expect(settings.llmProvider).toBe('assistant');
    expect(settings.tone).toBe('standard');
    expect(settings.inputLanguage).toBe('auto');
    expect(settings.keys).toEqual({ openai: '', google: '', anthropic: '' });
    expect(settings.showHomeWidget).toBe(true);
    expect(settings.showInProjects).toBe(true);
    expect(settings.micVisibility).toBe('both');
  });

  it('falls back to defaults for unknown select values', () => {
    const settings = normalizeSettings({
      sttProvider: 'unknown-engine',
      llmProvider: 'unknown-llm',
      tone: 'pirate',
      micVisibility: 'sidebar'
    });
    expect(settings.sttProvider).toBe('system');
    expect(settings.llmProvider).toBe('assistant');
    expect(settings.tone).toBe('standard');
    expect(settings.micVisibility).toBe('both');
  });

  it('normalizes surface visibility settings from booleans and strings', () => {
    const disabled = normalizeSettings({
      showHomeWidget: false,
      showInProjects: 'false',
      micVisibility: 'projects'
    });
    expect(disabled.showHomeWidget).toBe(false);
    expect(disabled.showInProjects).toBe(false);
    expect(disabled.micVisibility).toBe('projects');

    const mainOnly = normalizeSettings({
      showHomeWidget: 'true',
      showInProjects: false,
      micVisibility: 'main'
    });
    expect(mainOnly.showHomeWidget).toBe(true);
    expect(mainOnly.showInProjects).toBe(false);
    expect(mainOnly.micVisibility).toBe('main');

    expect(normalizeSettings({ micVisibility: 'off' }).micVisibility).toBe('off');
  });

  it('normalizes mic selection, sound cue toggle, and chime volume with defaults', () => {
    const defaults = normalizeSettings({});
    expect(defaults.micDeviceId).toBe('default');
    expect(defaults.soundCuesEnabled).toBe(true);
    expect(defaults.soundCuesVolume).toBe(75);

    const custom = normalizeSettings({
      micDeviceId: 'usb-yeti',
      micLabel: 'Blue Yeti',
      soundCuesEnabled: 'false',
      soundCuesVolume: '125'
    });
    expect(custom.micDeviceId).toBe('usb-yeti');
    expect(custom.micLabel).toBe('Blue Yeti');
    expect(custom.soundCuesEnabled).toBe(false);
    expect(custom.soundCuesVolume).toBe(100);
  });

  it.each(['standard', 'casual', 'conversational', 'formal', 'technical', 'custom'])('preserves valid tone %s', (tone) => {
    expect(normalizeSettings({ tone }).tone).toBe(tone);
  });

  it('trims keys and model names', () => {
    const settings = normalizeSettings({ openaiApiKey: '  sk-test  ', llmModel: ' gpt-5.4-nano ' });
    expect(settings.keys.openai).toBe('sk-test');
    expect(settings.llmModel).toBe('gpt-5.4-nano');
  });

  it('resets malformed language codes to auto and keeps valid BCP-47 tags', () => {
    expect(normalizeSettings({ inputLanguage: 'de-DE' }).inputLanguage).toBe('de-DE');
    expect(normalizeSettings({ inputLanguage: 'en; drop table' }).inputLanguage).toBe('auto');
    expect(normalizeSettings({ inputLanguage: 42 }).inputLanguage).toBe('auto');
  });

  it('maps any casing of auto to the exact auto sentinel', () => {
    expect(normalizeSettings({ inputLanguage: 'AUTO' }).inputLanguage).toBe('auto');
    expect(normalizeSettings({ inputLanguage: 'Auto' }).inputLanguage).toBe('auto');
  });

  it.each(['zh-Hant-TW', 'sr-Latn-RS', 'sl-rozaj-biske', 'en-US-u-ca-gregory', 'de-DE-x-personal'])('preserves the complete language tag %s', (inputLanguage) => {
    expect(normalizeSettings({ inputLanguage }).inputLanguage).toBe(inputLanguage);
  });

  it('trims whitespace without changing language tag casing', () => {
    expect(normalizeSettings({ inputLanguage: '  ZH-hant-tw  ' }).inputLanguage).toBe('ZH-hant-tw');
  });

  it.each([null, undefined, '', 'en_US', 'en--US', 'en-US-', 'en-u', 'en-abcdefghi', 'en-US-US'])('falls back to auto for malformed language input %s', (inputLanguage) => {
    expect(normalizeSettings({ inputLanguage }).inputLanguage).toBe('auto');
  });
});

describe('parseDictionary', () => {
  it('splits on commas and newlines, trims, and removes duplicates', () => {
    expect(parseDictionary('Zana, Kubernetes\nZana,  pull request ')).toEqual(['Zana', 'Kubernetes', 'pull request']);
  });

  it('returns an empty list for non-string or blank input', () => {
    expect(parseDictionary(undefined)).toEqual([]);
    expect(parseDictionary(' , \n ')).toEqual([]);
  });

  it('caps the number of terms and the length of each term', () => {
    const many = Array.from({ length: DICTIONARY_MAX_TERMS + 50 }, (_, i) => `term${i}`).join(',');
    expect(parseDictionary(many)).toHaveLength(DICTIONARY_MAX_TERMS);
    const long = 'x'.repeat(DICTIONARY_MAX_TERM_LENGTH + 20);
    expect(parseDictionary(long)[0]).toHaveLength(DICTIONARY_MAX_TERM_LENGTH);
  });
});

describe('migrateModelName', () => {
  it('rewrites retired claude-3-opus models to current sonnet', () => {
    expect(migrateModelName('claude-3-opus-20240229', 'anthropic')).toBe('claude-sonnet-5-20260201');
  });

  it('preserves modern claude-opus models without downgrading', () => {
    expect(migrateModelName('claude-opus-5-5', 'anthropic')).toBe('claude-opus-5-5');
    expect(migrateModelName('claude-opus-4-1', 'anthropic')).toBe('claude-opus-4-1');
  });

  it('rewrites legacy openai and google models', () => {
    expect(migrateModelName('gpt-4o-mini', 'openai')).toBe('gpt-5.4-nano');
    expect(migrateModelName('gemini-1.5-pro', 'google')).toBe('gemini-3.8-flash');
  });
});
