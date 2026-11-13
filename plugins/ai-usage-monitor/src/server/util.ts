import type { TimeRangeKey } from '../shared/types.ts';

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

export function rangeStartMs(range: TimeRangeKey, nowMs: number): number {
  if (range === 'all') return 0;
  if (range === 'today') {
    const dt = new Date(nowMs);
    dt.setUTCHours(0, 0, 0, 0);
    return dt.getTime();
  }
  const days = range === '7d' ? 7 : 30;
  return nowMs - days * 86_400_000;
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
