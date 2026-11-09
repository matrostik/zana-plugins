export type DiffType = 'unchanged' | 'added' | 'removed';

export interface DiffToken {
  type: DiffType;
  text: string;
}

/**
 * Splits text into tokens: words, whitespace, and punctuation.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  const tokens = text.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]+/gu);
  return tokens || [];
}

/** Maximum number of tokens allowed per input to prevent renderer freezing on massive text. */
export const MAX_DIFF_TOKENS = 1200;

/**
 * Computes a word/token-level diff between original (raw) and modified (refined) text
 * using Longest Common Subsequence (LCS).
 *
 * Contiguous tokens of the same DiffType are merged for clean rendering.
 */
export function computeWordDiff(original: string, modified: string): DiffToken[] {
  if (!original && !modified) return [];
  if (original === modified) return [{ type: 'unchanged', text: original }];
  if (!original) return [{ type: 'added', text: modified }];
  if (!modified) return [{ type: 'removed', text: original }];

  const tokensA = tokenizeWords(original);
  const tokensB = tokenizeWords(modified);

  const n = tokensA.length;
  const m = tokensB.length;

  // Fallback for abnormally large text to avoid quadratic table explosion
  if (n > MAX_DIFF_TOKENS || m > MAX_DIFF_TOKENS) {
    return [
      { type: 'removed', text: original },
      { type: 'added', text: modified }
    ];
  }

  const stride = m + 1;
  const dp = new Uint32Array((n + 1) * stride);

  for (let i = 1; i <= n; i++) {
    const rowOffset = i * stride;
    const prevRowOffset = (i - 1) * stride;
    const tokenA = tokensA[i - 1];

    for (let j = 1; j <= m; j++) {
      if (tokenA === tokensB[j - 1]) {
        dp[rowOffset + j] = dp[prevRowOffset + (j - 1)] + 1;
      } else {
        const left = dp[rowOffset + (j - 1)];
        const up = dp[prevRowOffset + j];
        dp[rowOffset + j] = left > up ? left : up;
      }
    }
  }

  const rawDiff: DiffToken[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    const rowOffset = i * stride;
    const prevRowOffset = (i - 1) * stride;

    if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
      rawDiff.push({ type: 'unchanged', text: tokensA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[rowOffset + (j - 1)] >= dp[prevRowOffset + j])) {
      rawDiff.push({ type: 'added', text: tokensB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[rowOffset + (j - 1)] < dp[prevRowOffset + j])) {
      rawDiff.push({ type: 'removed', text: tokensA[i - 1] });
      i--;
    }
  }

  rawDiff.reverse();

  // Merge contiguous tokens of identical diff type
  const merged: DiffToken[] = [];
  for (const token of rawDiff) {
    if (merged.length > 0 && merged[merged.length - 1].type === token.type) {
      merged[merged.length - 1].text += token.text;
    } else {
      merged.push({ ...token });
    }
  }

  return merged;
}
