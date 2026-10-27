import { describe, expect, it } from 'vitest';
import { errorText, formatDuration, formatFindingsPrompt, relativeTime, scoreTone } from '../app/format.ts';

describe('formatFindingsPrompt', () => {
  it('formats selected findings as a prompt with provenance and suggestions', () => {
    expect(formatFindingsPrompt({
      owner: 'acme', repo: 'api', number: 7, title: 'Fix login', headSha: 'abcdef123456',
      findings: [{ severity: 'high', category: 'security', file: 'src/auth.ts', line: 12, description: 'Unsafe redirect', suggestion: 'Validate URL', agreedBy: ['codex/gpt-6', 'cursor/a'] }]
    })).toBe('Review findings for acme/api#7: Fix login\nReviewed commit: abcdef123456\n\n1. [HIGH] security — src/auth.ts:12\nIssue: Unsafe redirect\nSuggestion: Validate URL\nFlagged by: codex/gpt-6, cursor/a');
  });
});

describe('relativeTime', () => {
  const now = Date.UTC(2026, 9, 25, 12);

  it('returns empty text for missing or invalid input', () => {
    expect(relativeTime(null, now)).toBe('');
    expect(relativeTime(undefined, now)).toBe('');
    expect(relativeTime('', now)).toBe('');
    expect(relativeTime('not a date', now)).toBe('');
  });

  it('buckets elapsed time into minutes, hours, and days', () => {
    expect(relativeTime(now - 30_000, now)).toBe('just now');
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5m ago');
    expect(relativeTime(new Date(now - 3 * 3_600_000).toISOString(), now)).toBe('3h ago');
    expect(relativeTime(now - 3 * 86_400_000, now)).toBe('3d ago');
  });
});

describe('scoreTone', () => {
  it('treats low risk and high quality as good', () => {
    expect(scoreTone(null, 'risk')).toBe('');
    expect([scoreTone(8, 'risk'), scoreTone(5, 'risk'), scoreTone(2, 'risk')]).toEqual(['danger', 'warn', 'ok']);
    expect([scoreTone(8, 'quality'), scoreTone(5, 'quality'), scoreTone(2, 'quality')]).toEqual(['ok', 'warn', 'danger']);
  });
});

describe('errorText', () => {
  it('reads messages from errors and stringifies anything else', () => {
    expect(errorText(new Error('boom'))).toBe('boom');
    expect(errorText(42)).toBe('42');
  });
});

describe('formatDuration', () => {
  it('shows seconds under a minute', () => {
    expect(formatDuration(0, 0)).toBe('0s');
    expect(formatDuration(0, 42_900)).toBe('42s');
  });

  it('shows minutes and padded seconds under an hour', () => {
    expect(formatDuration(0, 65_000)).toBe('1m 05s');
    expect(formatDuration(0, 59 * 60_000 + 59_000)).toBe('59m 59s');
  });

  it('shows hours and padded minutes from an hour', () => {
    expect(formatDuration(0, 3_600_000)).toBe('1h 00m');
    expect(formatDuration(0, 3_720_000)).toBe('1h 02m');
  });

  it('never goes negative when clocks disagree', () => {
    expect(formatDuration(5_000, 0)).toBe('0s');
  });
});
