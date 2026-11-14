import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import {
  COMPARISON_CACHE_TTL_MS,
  COMPARISON_RPC,
  COMPARISON_SCHEMA_VERSION,
  type ComparisonModel,
  type ComparisonSnapshot,
  type ComparisonSnapshotState
} from '../shared/comparison.ts';
import { REALTIME_CHANNEL } from '../shared/types.ts';
import { createComparisonCredentials, createDpapiProtector, type SecretProtector } from './comparison-credentials.ts';
import {
  comparisonApiError,
  extractComparisonQuota,
  FREE_MODELS_URL,
  QUOTA_KV_ENTRY,
  readComparisonOpaqueJson,
  validateEmptyComparisonArgs,
  type ComparisonFetchLike,
  type ComparisonQuotaState
} from './comparison-setup.ts';

const SYNC_META_KV_ENTRY = 'comparison.sync_meta.v1';
const MAX_PAGES = 50;
const BASE_BACKOFF_MS = 60_000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

interface ComparisonSyncMeta {
  authInvalid: boolean;
  consecutiveFailures: number;
  backoffUntilMs: number | null;
  lastError: string | null;
}

const DEFAULT_SYNC_META: ComparisonSyncMeta = {
  authInvalid: false,
  consecutiveFailures: 0,
  backoffUntilMs: null,
  lastError: null
};

class ComparisonHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

class InconsistentSnapshotError extends Error {
  constructor() {
    super('Artificial Analysis returned inconsistent index versions across pages. Your saved snapshot was preserved.');
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nonNegativeNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function indexVersionOrNull(value: unknown): number | string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

export function normalizeComparisonModel(raw: unknown): ComparisonModel | null {
  const rec = asObject(raw);
  if (!rec) return null;
  const id = optionalString(rec.id);
  const name = optionalString(rec.name);
  if (!id || !name) return null;
  const slug = optionalString(rec.slug) ?? id;
  const creator = asObject(rec.model_creator);
  const evals = asObject(rec.evaluations);
  const pricing = asObject(rec.pricing);
  // Use performance_v3 exclusively for methodology consistency (performance is deprecated).
  const perfV3 = asObject(rec.performance_v3);

  return {
    id,
    name,
    slug,
    creatorId: optionalString(creator?.id),
    creatorName: optionalString(creator?.name) ?? 'Unknown',
    releaseDate: optionalString(rec.release_date),
    intelligenceIndex: finiteNumberOrNull(evals?.artificial_analysis_intelligence_index),
    codingIndex: finiteNumberOrNull(evals?.artificial_analysis_coding_index),
    agenticIndex: finiteNumberOrNull(evals?.artificial_analysis_agentic_index),
    inputPricePer1M: nonNegativeNumberOrNull(pricing?.price_1m_input_tokens),
    outputPricePer1M: nonNegativeNumberOrNull(pricing?.price_1m_output_tokens),
    outputTokensPerSecond: nonNegativeNumberOrNull(perfV3?.mean_output_tokens_per_second),
    timeToFirstTokenSeconds: nonNegativeNumberOrNull(perfV3?.mean_time_to_first_token_seconds)
  };
}

function createSnapshotCacheStore(zcc: ZccPluginApi) {
  const db = zcc.storage.database();
  db.runScript(
    'CREATE TABLE IF NOT EXISTS comparison_snapshot_cache (id INTEGER PRIMARY KEY CHECK (id = 1), schema_version INTEGER NOT NULL, fetched_at_ms INTEGER NOT NULL, payload_json TEXT NOT NULL)'
  );
  return {
    read(): ComparisonSnapshot | null {
      const row = db
        .prepare('SELECT schema_version, fetched_at_ms, payload_json FROM comparison_snapshot_cache WHERE id = 1')
        .get() as { schema_version: number; fetched_at_ms: number; payload_json: string } | undefined;
      if (!row || row.schema_version !== COMPARISON_SCHEMA_VERSION) return null;
      try {
        const parsed = asObject(JSON.parse(row.payload_json));
        if (!parsed || !Array.isArray(parsed.models)) return null;
        return {
          schemaVersion: COMPARISON_SCHEMA_VERSION,
          fetchedAtMs: typeof parsed.fetchedAtMs === 'number' ? parsed.fetchedAtMs : row.fetched_at_ms,
          intelligenceIndexVersion: indexVersionOrNull(parsed.intelligenceIndexVersion),
          tier: optionalString(parsed.tier),
          models: parsed.models as ComparisonModel[]
        };
      } catch {
        zcc.log.warn('ai-usage-monitor: failed to parse cached model comparison snapshot');
        return null;
      }
    },
    save(snapshot: ComparisonSnapshot) {
      db.prepare(
        'INSERT OR REPLACE INTO comparison_snapshot_cache (id, schema_version, fetched_at_ms, payload_json) VALUES (1, ?, ?, ?)'
      ).run(snapshot.schemaVersion, snapshot.fetchedAtMs, JSON.stringify(snapshot));
    },
    clear() {
      db.prepare('DELETE FROM comparison_snapshot_cache WHERE id = 1').run();
    }
  };
}

function computeRetryAtMs(
  quota: ComparisonQuotaState | undefined,
  meta: ComparisonSyncMeta,
  nowMs: number
): number | null {
  const next = Math.max(quota?.retryAtMs ?? 0, meta.backoffUntilMs ?? 0);
  return next > nowMs ? next : null;
}

function nextBackoffDelayMs(failures: number): number {
  const exponent = Math.max(0, Math.min(failures - 1, 10));
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** exponent);
}

export interface ComparisonServiceDeps {
  protector?: SecretProtector;
  fetch?: ComparisonFetchLike;
  now?: () => number;
}

export function createComparisonService(zcc: ZccPluginApi, deps: ComparisonServiceDeps = {}) {
  const now = deps.now ?? Date.now;
  const protector = deps.protector ?? createDpapiProtector();
  const credentials = createComparisonCredentials(zcc.storage.kv, protector);
  const cache = createSnapshotCacheStore(zcc);
  let inFlightRefresh: Promise<ComparisonSnapshotState> | null = null;
  let disposed = false;

  const publishUpdate = () => {
    if (!disposed) {
      zcc.realtime.publish(REALTIME_CHANNEL, { comparisonUpdated: true });
    }
  };

  async function readMeta(): Promise<ComparisonSyncMeta> {
    const raw = await zcc.storage.kv.get<Partial<ComparisonSyncMeta>>(SYNC_META_KV_ENTRY);
    return {
      authInvalid: raw?.authInvalid === true,
      consecutiveFailures: typeof raw?.consecutiveFailures === 'number' ? raw.consecutiveFailures : 0,
      backoffUntilMs: typeof raw?.backoffUntilMs === 'number' ? raw.backoffUntilMs : null,
      lastError: typeof raw?.lastError === 'string' ? raw.lastError : null
    };
  }

  async function getState(): Promise<ComparisonSnapshotState> {
    const [credStatus, quota, meta] = await Promise.all([
      credentials.status(),
      zcc.storage.kv.get<ComparisonQuotaState>(QUOTA_KV_ENTRY),
      readMeta()
    ]);
    const snapshot = cache.read();
    const currentNow = now();
    const stale = snapshot ? currentNow - snapshot.fetchedAtMs >= COMPARISON_CACHE_TTL_MS : false;
    return {
      configured: credStatus.configured,
      encryptionAvailable: credStatus.encryptionAvailable,
      snapshot,
      stale,
      refreshing: inFlightRefresh !== null,
      retryAtMs: computeRetryAtMs(quota, meta, currentNow),
      authInvalid: meta.authInvalid,
      lastError: meta.lastError
    };
  }

  async function fetchPage(fetchImpl: ComparisonFetchLike, key: string, page: number): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetchImpl(`${FREE_MODELS_URL}?page=${page}`, {
        headers: { 'x-api-key': key },
        redirect: 'error',
        signal: AbortSignal.timeout(20_000)
      });
    } catch {
      throw new Error('Could not reach Artificial Analysis. Check your connection and try again.');
    }
    await zcc.storage.kv.set(QUOTA_KV_ENTRY, extractComparisonQuota(response, now()));
    if (!response.ok) {
      await response.body?.cancel();
      throw new ComparisonHttpError(response.status, comparisonApiError(response.status));
    }
    const parsed = asObject(await readComparisonOpaqueJson(response, key));
    if (!parsed || !Array.isArray(parsed.data)) {
      throw new Error('Artificial Analysis returned an unrecognized response. Your saved data was preserved.');
    }
    return parsed;
  }

  async function fetchAllPages(key: string): Promise<ComparisonSnapshot> {
    const fetchImpl = deps.fetch ?? fetch;
    const byId = new Map<string, ComparisonModel>();
    let expectedVersion: number | string | null | undefined;
    let tier: string | null = null;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const body = await fetchPage(fetchImpl, key, page);
      const pageVersion = indexVersionOrNull(body.intelligence_index_version);
      if (expectedVersion === undefined) {
        expectedVersion = pageVersion;
      } else if (pageVersion !== expectedVersion) {
        throw new InconsistentSnapshotError();
      }
      tier ??= optionalString(body.tier);

      const rawItems = body.data as unknown[];
      for (const rawItem of rawItems) {
        const model = normalizeComparisonModel(rawItem);
        if (model) byId.set(model.id, model);
      }

      const pagination = asObject(body.pagination);
      const totalPages = typeof pagination?.total_pages === 'number' ? pagination.total_pages : null;
      const hasMore = pagination?.has_more === true || (totalPages !== null && page < totalPages);
      if (!hasMore || rawItems.length === 0) break;
    }

    return {
      schemaVersion: COMPARISON_SCHEMA_VERSION,
      fetchedAtMs: now(),
      intelligenceIndexVersion: expectedVersion ?? null,
      tier,
      models: [...byId.values()]
    };
  }

  async function runRefresh(opts: { manual: boolean }): Promise<void> {
    const [credStatus, quota, meta] = await Promise.all([
      credentials.status(),
      zcc.storage.kv.get<ComparisonQuotaState>(QUOTA_KV_ENTRY),
      readMeta()
    ]);

    if (!credStatus.configured || !credStatus.encryptionAvailable) {
      return;
    }
    if (!opts.manual && meta.authInvalid) {
      return;
    }
    if (quota?.retryAtMs && quota.retryAtMs > now()) {
      await zcc.storage.kv.set(SYNC_META_KV_ENTRY, {
        ...meta,
        lastError: comparisonApiError(429)
      });
      return;
    }
    if (!opts.manual && meta.backoffUntilMs && meta.backoffUntilMs > now()) {
      return;
    }

    let key: string | null;
    try {
      key = await credentials.read();
    } catch (err) {
      await zcc.storage.kv.set(SYNC_META_KV_ENTRY, {
        authInvalid: true,
        consecutiveFailures: 0,
        backoffUntilMs: null,
        lastError: err instanceof Error ? err.message : 'Could not unlock the saved API key.'
      } satisfies ComparisonSyncMeta);
      return;
    }

    if (!key) return;

    try {
      const snapshot = await fetchAllPages(key);
      if (!disposed) {
        cache.save(snapshot);
        await zcc.storage.kv.set(SYNC_META_KV_ENTRY, DEFAULT_SYNC_META);
      }
    } catch (err) {
      const currentMeta = await readMeta();
      if (err instanceof ComparisonHttpError && (err.status === 401 || err.status === 403)) {
        await zcc.storage.kv.set(SYNC_META_KV_ENTRY, {
          authInvalid: true,
          consecutiveFailures: 0,
          backoffUntilMs: null,
          lastError: err.message
        } satisfies ComparisonSyncMeta);
      } else if (err instanceof ComparisonHttpError && err.status === 429) {
        await zcc.storage.kv.set(SYNC_META_KV_ENTRY, {
          authInvalid: false,
          consecutiveFailures: currentMeta.consecutiveFailures,
          backoffUntilMs: null,
          lastError: err.message
        } satisfies ComparisonSyncMeta);
      } else {
        const failures = currentMeta.consecutiveFailures + 1;
        await zcc.storage.kv.set(SYNC_META_KV_ENTRY, {
          authInvalid: false,
          consecutiveFailures: failures,
          backoffUntilMs: now() + nextBackoffDelayMs(failures),
          lastError: err instanceof Error ? err.message : 'Model comparison refresh failed.'
        } satisfies ComparisonSyncMeta);
      }
      zcc.log.warn('ai-usage-monitor: Artificial Analysis model refresh failed');
    }
  }

  function refresh(opts: { manual?: boolean } = {}): Promise<ComparisonSnapshotState> {
    if (inFlightRefresh) return inFlightRefresh;
    const promise = runRefresh({ manual: opts.manual === true }).then(
      () => {
        if (inFlightRefresh === promise) inFlightRefresh = null;
        publishUpdate();
        return getState();
      },
      (err) => {
        if (inFlightRefresh === promise) inFlightRefresh = null;
        publishUpdate();
        throw err;
      }
    );
    inFlightRefresh = promise;
    publishUpdate();
    return promise;
  }

  async function maybeRefreshOnStartup(): Promise<void> {
    const state = await getState();
    if (!state.configured || !state.encryptionAvailable || state.authInvalid) return;
    if (state.snapshot && !state.stale) return;
    if (state.retryAtMs && state.retryAtMs > now()) return;
    await refresh({ manual: false });
  }

  async function onKeyConfigured(): Promise<void> {
    await zcc.storage.kv.set(SYNC_META_KV_ENTRY, DEFAULT_SYNC_META);
    void refresh({ manual: true });
  }

  async function onKeyRemoved(): Promise<void> {
    cache.clear();
    await Promise.all([
      zcc.storage.kv.delete(SYNC_META_KV_ENTRY),
      zcc.storage.kv.delete(QUOTA_KV_ENTRY)
    ]);
    publishUpdate();
  }

  zcc.rpc.method(COMPARISON_RPC.getData, async (args) => {
    validateEmptyComparisonArgs(args);
    const state = await getState();
    if (
      state.configured &&
      state.encryptionAvailable &&
      !state.authInvalid &&
      !inFlightRefresh &&
      (!state.snapshot || state.stale) &&
      (!state.retryAtMs || state.retryAtMs <= now())
    ) {
      void refresh({ manual: false });
      return getState();
    }
    return state;
  });

  zcc.rpc.method(COMPARISON_RPC.refresh, async (args) => {
    validateEmptyComparisonArgs(args);
    return refresh({ manual: true });
  });

  return {
    getState,
    refresh,
    maybeRefreshOnStartup,
    onKeyConfigured,
    onKeyRemoved,
    dispose: () => { disposed = true; }
  };
}
