export function formatUsd(amount: number | null | undefined, digits = 2): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  return `$${amount.toFixed(digits)}`;
}

const UNIT_STEP = 1_000;
/** Token units from smallest to largest; the last unit has no upper bound. */
const TOKEN_UNITS = [
  { divisor: 1, digits: 0, suffix: '' },
  { divisor: 1_000, digits: 1, suffix: 'k' },
  { divisor: 1_000_000, digits: 1, suffix: 'M' },
  { divisor: 1_000_000_000, digits: 2, suffix: 'B' }
] as const;

/**
 * Formats a token count with a k/M/B suffix. The unit is chosen from the value *after* rounding
 * to display precision, so values just below a boundary move up a unit (999_950 -> "1.0M")
 * instead of printing an inflated mantissa ("1000.0k").
 */
export function formatTokens(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined || !Number.isFinite(tokens)) return '0';
  const unit = TOKEN_UNITS.find((u, i) =>
    i === TOKEN_UNITS.length - 1 || Math.abs(Number((tokens / u.divisor).toFixed(u.digits))) < UNIT_STEP
  ) ?? TOKEN_UNITS[TOKEN_UNITS.length - 1];
  return `${(tokens / unit.divisor).toFixed(unit.digits)}${unit.suffix}`;
}
