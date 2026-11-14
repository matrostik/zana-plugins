import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import { COMPARISON_SETUP_RPC, type ComparisonConnectionStatus } from '../shared/comparison-setup.ts';
import { createComparisonCredentials, createDpapiProtector, type SecretProtector } from './comparison-credentials.ts';

const FREE_MODELS_URL = 'https://artificialanalysis.ai/api/v2/language/models/free';
const QUOTA_KV_ENTRY = 'comparison.quota.v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface QuotaState {
  limit: number | null;
  remaining: number | null;
  retryAtMs: number | null;
}

function nonnegative(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function responseQuota(response: Response, now: number): QuotaState {
  const reset = nonnegative(response.headers.get('X-RateLimit-Reset'));
  const retry = response.headers.get('Retry-After');
  const seconds = nonnegative(retry);
  const date = retry && seconds === null ? Date.parse(retry) : NaN;
  const remaining = nonnegative(response.headers.get('X-RateLimit-Remaining'));
  const resetMs = reset === null ? 0 : reset * 1000;
  const retryMs = seconds !== null ? now + seconds * 1000 : Number.isFinite(date) ? date : 0;
  const limited = response.status === 429 || remaining === 0;
  return {
    limit: nonnegative(response.headers.get('X-RateLimit-Limit')), remaining,
    retryAtMs: limited ? Math.max(resetMs, retryMs, now + (resetMs || retryMs ? 0 : DAY_MS)) : retryMs || null
  };
}

function apiError(status: number): string {
  if (status === 401) return 'The Artificial Analysis API key is invalid. Check it and try again.';
  if (status === 403) return 'This key does not have access to the Free models endpoint.';
  if (status === 429) return 'Artificial Analysis rate limit reached. Wait until the displayed retry time.';
  return 'Artificial Analysis is unavailable. Try again later; your saved data was preserved.';
}

async function readOpaqueJson(response: Response, key: string): Promise<unknown> {
  try {
    if (!response.body) throw new Error('Missing body');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.length;
      if (length > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('Body too large'); }
      chunks.push(result.value);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    if (text.includes(key)) throw new Error('unsafe');
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof Error && error.message === 'unsafe') throw new Error('Artificial Analysis returned an unsafe response. Nothing was saved.');
    throw new Error('Artificial Analysis returned an unrecognized response. Your saved data was preserved.');
  }
}

function rawSampleStore(zcc: ZccPluginApi) {
  const db = zcc.storage.database();
  db.runScript('CREATE TABLE IF NOT EXISTS comparison_source_sample (id INTEGER PRIMARY KEY CHECK (id = 1), fetched_at_ms INTEGER NOT NULL, body_json TEXT NOT NULL)');
  return {
    read(): { fetchedAtMs: number; body: unknown } | null {
      const row = db.prepare('SELECT fetched_at_ms, body_json FROM comparison_source_sample WHERE id = 1').get() as { fetched_at_ms: number; body_json: string } | undefined;
      if (!row) return null;
      try { return { fetchedAtMs: row.fetched_at_ms, body: JSON.parse(row.body_json) as unknown }; }
      catch { zcc.log.warn('ai-usage-monitor: could not read the comparison source snapshot'); return null; }
    },
    save(body: unknown, now: number) {
      db.prepare('INSERT OR REPLACE INTO comparison_source_sample (id, fetched_at_ms, body_json) VALUES (1, ?, ?)').run(now, JSON.stringify(body));
    },
    remove() { db.prepare('DELETE FROM comparison_source_sample WHERE id = 1').run(); }
  };
}

function keyFromArgs(args: unknown): string {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Enter an API key.');
  const record = args as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.key !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(record.key)) {
    throw new Error('Enter a nonempty API key without whitespace (maximum 4096 characters).');
  }
  return record.key;
}

function validateEmptyArgs(args: unknown) {
  if (args !== undefined && args !== null && (typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length > 0)) {
    throw new Error('This action takes no arguments.');
  }
}

async function requestSample(zcc: ZccPluginApi, fetchImpl: FetchLike, key: string, now: () => number) {
  const quota = await zcc.storage.kv.get<QuotaState>(QUOTA_KV_ENTRY);
  if (quota?.retryAtMs && quota.retryAtMs > now()) throw new Error('Model refresh is paused until the rate-limit cooldown expires.');
  let response: Response;
  try {
    response = await fetchImpl(FREE_MODELS_URL, {
      headers: { 'x-api-key': key }, redirect: 'error', signal: AbortSignal.timeout(20_000)
    });
  } catch { throw new Error('Could not reach Artificial Analysis. Check your connection and try again.'); }
  await zcc.storage.kv.set(QUOTA_KV_ENTRY, responseQuota(response, now()));
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(apiError(response.status));
  }
  return readOpaqueJson(response, key);
}

/** First authenticated capture stays opaque until its actual JSON has been inspected. */
export function createComparisonSetup(zcc: ZccPluginApi, deps: {
  protector?: SecretProtector;
  fetch?: FetchLike;
  now?: () => number;
} = {}) {
  const now = deps.now ?? Date.now;
  const protector = deps.protector ?? createDpapiProtector();
  const credentials = createComparisonCredentials(zcc.storage.kv, protector);
  const sample = rawSampleStore(zcc);
  let busy = false;
  const status = async (): Promise<ComparisonConnectionStatus> => ({
    ...await credentials.status(), connectedAtMs: sample.read()?.fetchedAtMs ?? null,
    retryAtMs: (await zcc.storage.kv.get<QuotaState>(QUOTA_KV_ENTRY))?.retryAtMs ?? null
  });
  zcc.rpc.method(COMPARISON_SETUP_RPC.status, (args) => { validateEmptyArgs(args); return status(); });
  zcc.rpc.method(COMPARISON_SETUP_RPC.connect, async (args) => {
    const key = keyFromArgs(args);
    if (busy) throw new Error('A connection attempt is already running.');
    if (!protector.available) throw new Error('OS encryption is unavailable. No key was saved.');
    busy = true;
    try {
      const body = await requestSample(zcc, deps.fetch ?? fetch, key, now);
      await credentials.save(key);
      sample.save(body, now());
      return await status();
    } catch (error) {
      zcc.log.warn('ai-usage-monitor: Artificial Analysis connection failed');
      throw error;
    } finally { busy = false; }
  });
  zcc.rpc.method(COMPARISON_SETUP_RPC.removeKey, async (args) => {
    validateEmptyArgs(args);
    if (busy) throw new Error('A connection attempt is already running.');
    busy = true;
    try { await credentials.remove(); sample.remove(); return await status(); }
    finally { busy = false; }
  });
  return { readSample: sample.read };
}
