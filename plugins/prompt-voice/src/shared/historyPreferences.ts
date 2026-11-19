export const DEFAULT_HISTORY_ENABLED = true;
export const DEFAULT_HISTORY_MAX_ENTRIES = 500;
export const DEFAULT_HISTORY_MAX_DAYS = 90;

export const HISTORY_MAX_ENTRIES_LIMIT = 50_000;
export const HISTORY_MAX_DAYS_LIMIT = 3_650;

export const HISTORY_MAX_ENTRIES_OPTIONS = [100, 500, 2000, 0] as const;
export const HISTORY_MAX_DAYS_OPTIONS = [30, 90, 365, 0] as const;

export interface HistoryPreferences {
  historyEnabled: boolean;
  /** Maximum non-starred entries to keep; 0 means unlimited. */
  historyMaxEntries: number;
  /** Maximum age in days for non-starred entries; 0 means forever. */
  historyMaxDays: number;
}

/** Parses history recording enablement, defaulting to true unless explicitly false. */
export function parseHistoryEnabled(value: unknown): boolean {
  if (value === false) return false;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'false') return false;
  return DEFAULT_HISTORY_ENABLED;
}

/** Parses a non-negative integer setting where 0 means unlimited/forever. */
function parseNonNegativeInt(value: unknown, fallback: number, max: number): number {
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(num) || num < 0) return fallback;
  const rounded = Math.round(num);
  return Math.min(max, rounded);
}

export function parseHistoryMaxEntries(value: unknown): number {
  return parseNonNegativeInt(value, DEFAULT_HISTORY_MAX_ENTRIES, HISTORY_MAX_ENTRIES_LIMIT);
}

export function parseHistoryMaxDays(value: unknown): number {
  return parseNonNegativeInt(value, DEFAULT_HISTORY_MAX_DAYS, HISTORY_MAX_DAYS_LIMIT);
}

/** Extracts normalized history preferences from raw settings records. */
export function parseHistoryPreferences(raw: Record<string, unknown> | null | undefined): HistoryPreferences {
  const source = raw ?? {};
  return {
    historyEnabled: parseHistoryEnabled(source.historyEnabled),
    historyMaxEntries: parseHistoryMaxEntries(source.historyMaxEntries),
    historyMaxDays: parseHistoryMaxDays(source.historyMaxDays)
  };
}
