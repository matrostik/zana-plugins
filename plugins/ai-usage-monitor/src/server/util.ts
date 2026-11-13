import type { TimeRangeBounds, TimeRangeKey } from '../shared/types.ts';

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

export function asOptionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function asNumber(record: Record<string, unknown>, key: string, fallback = 0): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asOptionalNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function localMidnightMs(ms: number, dayOffset = 0): number {
  const dt = new Date(ms);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + dayOffset, 0, 0, 0, 0).getTime();
}

export function resolveLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  } catch {
    return 'Local';
  }
}

export function resolveTimeRangeBounds(
  range: TimeRangeKey,
  nowMs: number,
  timezone: string = resolveLocalTimezone()
): TimeRangeBounds {
  if (range === 'all') {
    return {
      range,
      label: 'All time',
      timezone,
      startMs: 0,
      endMs: null,
      startIso: new Date(0).toISOString(),
      endIso: null
    };
  }

  if (range === 'today') {
    const startMs = localMidnightMs(nowMs, 0);
    return {
      range,
      label: 'Today (local midnight)',
      timezone,
      startMs,
      endMs: null,
      startIso: new Date(startMs).toISOString(),
      endIso: null
    };
  }

  if (range === '7d') {
    const startMs = localMidnightMs(nowMs, -6);
    return {
      range,
      label: 'Last 7 calendar days',
      timezone,
      startMs,
      endMs: null,
      startIso: new Date(startMs).toISOString(),
      endIso: null
    };
  }

  if (range === 'last_week') {
    const dt = new Date(nowMs);
    const daysSinceMonday = (dt.getDay() + 6) % 7;
    const thisMondayMs = localMidnightMs(nowMs, -daysSinceMonday);
    const lastMondayMs = localMidnightMs(nowMs, -daysSinceMonday - 7);
    return {
      range,
      label: 'Last calendar week (Mon–Sun)',
      timezone,
      startMs: lastMondayMs,
      endMs: thisMondayMs,
      startIso: new Date(lastMondayMs).toISOString(),
      endIso: new Date(thisMondayMs).toISOString()
    };
  }

  const startMs = localMidnightMs(nowMs, -29);
  return {
    range: '30d',
    label: 'Last 30 calendar days',
    timezone,
    startMs,
    endMs: null,
    startIso: new Date(startMs).toISOString(),
    endIso: null
  };
}

export function rangeStartMs(range: TimeRangeKey, nowMs: number): number {
  return resolveTimeRangeBounds(range, nowMs).startMs;
}

export function localDateKey(ms: number): string {
  const dt = new Date(ms);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function utcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function slugId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (timeoutMs <= 0) return promise;
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function computeCacheHitPercent(inputTokens: number, cachedInputTokens: number): number {
  if (cachedInputTokens <= 0) return 0;
  const denominator = cachedInputTokens > inputTokens ? inputTokens + cachedInputTokens : inputTokens;
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((cachedInputTokens / denominator) * 1000) / 10);
}
