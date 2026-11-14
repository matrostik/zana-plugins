import { describe, expect, it } from 'vitest';
import { formatTokens, formatUsd } from '../shared/format.ts';

describe('shared metric formatting', () => {
  it('formats token boundaries identically for dashboards and budget alerts', () => {
    expect([null, undefined, NaN, Infinity].map(formatTokens)).toEqual(['0', '0', '0', '0']);
    expect([0, 999, 1_000, 1_000_000, 1_000_000_000].map(formatTokens))
      .toEqual(['0', '999', '1.0k', '1.0M', '1.00B']);
  });
  it('promotes values that round up to a unit boundary instead of printing a 1000.x mantissa', () => {
    expect([999.4, 999.6, 999_949, 999_950, 999_949_999, 999_950_000].map(formatTokens))
      .toEqual(['999', '1.0k', '999.9k', '1.0M', '999.9M', '1.00B']);
  });
  it('keeps values that do not reach a boundary in the lower unit', () => {
    expect([950_000, 1_500, 2_500_000_000_000].map(formatTokens)).toEqual(['950.0k', '1.5k', '2500.00B']);
  });
  it('formats USD with configurable precision and missing values', () => {
    for (const value of [null, undefined, NaN, Infinity]) expect(formatUsd(value)).toBe('—');
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(1.23456, 4)).toBe('$1.2346');
  });
});
