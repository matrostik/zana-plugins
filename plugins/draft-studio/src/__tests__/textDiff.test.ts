import { describe, expect, it } from 'vitest';
import { computeWordDiff, tokenizeWords } from '../app/textDiff.ts';

describe('tokenizeWords', () => {
  it('tokenizes words, whitespace, and punctuation', () => {
    const tokens = tokenizeWords('Hello, world! 123');
    expect(tokens).toEqual(['Hello', ',', ' ', 'world', '!', ' ', '123']);
  });

  it('handles empty string', () => {
    expect(tokenizeWords('')).toEqual([]);
  });
});

describe('computeWordDiff', () => {
  it('returns unchanged token when original and modified are identical', () => {
    const diff = computeWordDiff('Hello world', 'Hello world');
    expect(diff).toEqual([{ type: 'unchanged', text: 'Hello world' }]);
  });

  it('detects added words', () => {
    const diff = computeWordDiff('Hello', 'Hello beautiful world');
    expect(diff).toEqual([
      { type: 'unchanged', text: 'Hello' },
      { type: 'added', text: ' beautiful world' }
    ]);
  });

  it('detects removed words', () => {
    const diff = computeWordDiff('Hello beautiful world', 'Hello world');
    expect(diff).toEqual([
      { type: 'unchanged', text: 'Hello' },
      { type: 'removed', text: ' beautiful' },
      { type: 'unchanged', text: ' world' }
    ]);
  });

  it('detects replaced words token by token with whitespace preserved', () => {
    const diff = computeWordDiff('fix bugs', 'resolve defects');
    expect(diff).toEqual([
      { type: 'removed', text: 'fix' },
      { type: 'added', text: 'resolve' },
      { type: 'unchanged', text: ' ' },
      { type: 'removed', text: 'bugs' },
      { type: 'added', text: 'defects' }
    ]);
  });
});
