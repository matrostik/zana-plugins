import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { BillingMode, LogSeverity, QuotaWindow } from '../shared/types.ts';
import type { ThreadCursorRow, UsageStore } from './db.ts';
import { computeTurnCost, type TokenUsageInput } from './pricing.ts';
import {
  asNumber,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  errorMessage,
  safeJsonParse,
  withTimeout
} from './util.ts';

export type ThreadSummaryLike = NonNullable<Awaited<ReturnType<ZccPluginApi['sdk']['threads']['get']>>> & {
  createdAt?: number;
  parentThreadId?: string | null;
};

export interface ThreadLifecycleEventLike {
  name: string;
  threadId: string;
  projectId?: string;
  providerId?: string;
  model?: string;
  thread?: ThreadSummaryLike;
}

export interface ThreadsApiLike {
  get: ZccPluginApi['sdk']['threads']['get'];
  events: ZccPluginApi['sdk']['threads']['events'];
  defaultExecutionOptions?: ZccPluginApi['sdk']['threads']['defaultExecutionOptions'];
  list?(args?: { includeHidden?: boolean; limit?: number; offset?: number }): Promise<ThreadSummaryLike[]>;
  search?: ZccPluginApi['sdk']['threads']['search'];
}

export interface ObservedRateLimitState {
  providerId: string;
  status: 'allowed' | 'warning' | 'blocked' | 'unknown';
  kind: string;
  windows: QuotaWindow[];
  reachedReason: string | null;
  overageStatus: string | null;
  overageReason: string | null;
  observedAtMs: number;
}

export interface TelemetryIndexerDeps {
  store: UsageStore;
  threads: ThreadsApiLike;
  log: Pick<ZccPluginApi['log'], 'debug' | 'warn'>;
  getProviderModeOverrides: () => ReadonlyMap<string, BillingMode>;
  now?: () => number;
}

export interface SyncThreadsOptions {
  timeBudgetMs?: number;
  concurrency?: number;
  onBatchProgress?: () => void;
}

export interface SyncThreadsResult {
  threadsScanned: number;
  eventsIndexed: number;
  hasMore: boolean;
}

interface TokenTotals {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  hasExplicitTotal?: boolean;
}

type ThreadEventRow = { seq: number; type: string; payload: unknown; createdAt?: number };

const THREAD_LIST_TIMEOUT_MS = 8000;
const THREAD_EVENTS_TIMEOUT_MS = 5000;
const DEFAULT_EXEC_TIMEOUT_MS = 1500;
const DEFAULT_SYNC_TIME_BUDGET_MS = 20_000;
const DEFAULT_CONCURRENCY = 8;
const INITIAL_INCREMENTAL_EVENTS_LIMIT = 200;
const INITIAL_FULL_EVENTS_LIMIT = 500;
const MAX_EVENTS_FETCH_LIMIT = 50_000;

const WATCHED_EVENT_TYPES = [
  'client/turn/requested',
  'thread/tokenUsage/updated',
  'thread/contextWindowUsage/updated',
  'provider/rateLimits/updated',
  'provider/modelFallback',
  'provider/error',
  'provider/warning',
  'turn.failed'
] as const;

function parseBreakdown(obj: Record<string, unknown>): TokenTotals {
  const inputTokens = asNumber(obj, 'inputTokens', 0);
  const cachedInputTokens = asNumber(obj, 'cachedInputTokens', 0);
  const outputTokens = asNumber(obj, 'outputTokens', 0);
  const reasoningOutputTokens = asNumber(obj, 'reasoningOutputTokens', 0);
  const rawTotal = asNumber(obj, 'totalTokens', 0);
  const hasExplicitTotal = rawTotal > 0;
  const totalTokens = hasExplicitTotal ? rawTotal : inputTokens + outputTokens;
  return { inputTokens, cachedInputTokens, outputTokens, reasoningOutputTokens, totalTokens, hasExplicitTotal };
}

function positiveDelta(next: TokenTotals, prev: TokenTotals | null): TokenTotals {
  if (!prev) return next;
  return {
    inputTokens: Math.max(0, next.inputTokens - prev.inputTokens),
    cachedInputTokens: Math.max(0, next.cachedInputTokens - prev.cachedInputTokens),
    outputTokens: Math.max(0, next.outputTokens - prev.outputTokens),
    reasoningOutputTokens: Math.max(0, next.reasoningOutputTokens - prev.reasoningOutputTokens),
    totalTokens: Math.max(0, next.totalTokens - prev.totalTokens),
    hasExplicitTotal: Boolean(next.hasExplicitTotal && prev.hasExplicitTotal)
  };
}

function eventTimestampMs(row: ThreadEventRow, payload: Record<string, unknown>, fallbackMs: number): number {
  if (typeof row.createdAt === 'number' && Number.isFinite(row.createdAt) && row.createdAt > 0) return row.createdAt;
  const pTs = payload.createdAt ?? payload.timestamp ?? payload.ts;
  if (typeof pTs === 'number' && Number.isFinite(pTs) && pTs > 0) return pTs;
  return fallbackMs;
}

function extractTurnId(payload: Record<string, unknown>): string | null {
  const scope = asRecord(payload.scope);
  return asOptionalString(scope, 'turnId') ?? asOptionalString(payload, 'turnId');
}

function extractRequestedModel(payload: Record<string, unknown>): string | null {
  const execution = asRecord(payload.execution);
  const reqParams = asRecord(asRecord(payload.request).params);
  return (
    asOptionalString(execution, 'model') ??
    asOptionalString(payload, 'model') ??
    asOptionalString(reqParams, 'model')
  );
}

function threadUpdatedMs(thread: ThreadSummaryLike): number {
  return typeof thread.updatedAt === 'number' && Number.isFinite(thread.updatedAt) && thread.updatedAt > 0
    ? thread.updatedAt
    : 0;
}

function parseRateLimitWindows(rawWindows: unknown, fallbackStatus: string): QuotaWindow[] {
  const items = Array.isArray(rawWindows) ? rawWindows : [];
  return items.map((w, idx) => {
    const rec = asRecord(w);
    const resetsAtMs = asOptionalNumber(rec, 'resetsAtMs');
    const winStatus = (asOptionalString(rec, 'status') ?? fallbackStatus) as QuotaWindow['status'];
    return {
      key: asOptionalString(rec, 'providerKey') ?? `window_${idx}`,
      label: asOptionalString(rec, 'label') ?? asOptionalString(rec, 'providerKey') ?? 'Quota Window',
      usedPercent: winStatus === 'blocked' ? 100 : null,
      remainingPercent: winStatus === 'blocked' ? 0 : null,
      status: winStatus,
      resetsAtIso: resetsAtMs ? new Date(resetsAtMs).toISOString() : null
    };
  });
}

function persistFallbackOrErrorEvent(args: {
  store: UsageStore;
  threadId: string;
  seq: number;
  timestampMs: number;
  providerId: string;
  model: string;
  projectId: string;
  type: string;
  payload: Record<string, unknown>;
}): string | null {
  if (args.type === 'provider/modelFallback') {
    const orig = asOptionalString(args.payload, 'originalModel') ?? args.model;
    const fallbackModel = asOptionalString(args.payload, 'fallbackModel') ?? args.model;
    const summary = asOptionalString(args.payload, 'message') ?? `Model switched ${orig} -> ${fallbackModel}`;
    args.store.upsertLogEvent({
      eventKey: `fallback:${args.threadId}:${args.seq}`, timestampMs: args.timestampMs, kind: 'fallback', severity: 'warning',
      providerId: args.providerId, model: fallbackModel, projectId: args.projectId, threadId: args.threadId,
      summary, costUsd: null, payloadJson: JSON.stringify(args.payload)
    });
    return fallbackModel;
  }
  const isWarning = args.type === 'provider/warning';
  const detail = asOptionalString(args.payload, 'detail');
  const baseMsg = isWarning
    ? (asOptionalString(args.payload, 'summary') ?? asOptionalString(args.payload, 'message') ?? 'Provider warning')
    : (asOptionalString(args.payload, 'message') ?? (args.type === 'turn.failed' ? 'Turn failed' : 'Provider error'));
  const msg = !isWarning && detail && detail !== baseMsg ? `${baseMsg}: ${detail}` : baseMsg;
  const willRetry = !isWarning && args.payload.willRetry === true;
  args.store.upsertLogEvent({
    eventKey: `${isWarning ? 'warning' : 'error'}:${args.threadId}:${args.seq}`, timestampMs: args.timestampMs,
    kind: 'error', severity: isWarning || willRetry ? 'warning' : 'error', providerId: args.providerId,
    model: args.model, projectId: args.projectId, threadId: args.threadId,
    summary: willRetry ? `${msg} (retrying)` : msg, costUsd: null, payloadJson: JSON.stringify(args.payload)
  });
  return null;
}

async function fetchIncrementalEvents(eventsApi: ThreadsApiLike['events'], threadId: string, lastSeq: number): Promise<ThreadEventRow[]> {
  let limit = INITIAL_INCREMENTAL_EVENTS_LIMIT;
  let prevCount = -1;
  let rows: ThreadEventRow[] = [];
  while (true) {
    rows = await withTimeout(
      eventsApi.list({ threadId, types: WATCHED_EVENT_TYPES, limit, order: 'desc' }),
      THREAD_EVENTS_TIMEOUT_MS,
      `events.list(${threadId})`
    );
    if (rows.length < limit || rows.length <= prevCount || limit >= MAX_EVENTS_FETCH_LIMIT) break;
    const minSeq = rows.reduce((min, ev) => (ev.seq < min ? ev.seq : min), Infinity);
    if (minSeq <= lastSeq) break;
    prevCount = rows.length;
    limit = Math.min(MAX_EVENTS_FETCH_LIMIT, limit * 5);
  }
  return rows.filter((ev) => ev.seq > lastSeq).sort((a, b) => a.seq - b.seq);
}

async function fetchInitialEvents(eventsApi: ThreadsApiLike['events'], threadId: string): Promise<ThreadEventRow[]> {
  let limit = INITIAL_FULL_EVENTS_LIMIT;
  let prevCount = -1;
  let rows: ThreadEventRow[] = [];
  while (true) {
    rows = await withTimeout(
      eventsApi.list({ threadId, types: WATCHED_EVENT_TYPES, limit, order: 'asc' }),
      THREAD_EVENTS_TIMEOUT_MS,
      `events.list(${threadId})`
    );
    if (rows.length < limit || rows.length <= prevCount || limit >= MAX_EVENTS_FETCH_LIMIT) break;
    prevCount = rows.length;
    limit = Math.min(MAX_EVENTS_FETCH_LIMIT, limit * 4);
  }
  return [...rows].sort((a, b) => a.seq - b.seq);
}

export function createTelemetryIndexer(deps: TelemetryIndexerDeps) {
  const now = deps.now ?? Date.now;
  const observedRateLimits = new Map<string, ObservedRateLimitState>();

  async function resolveThreadMeta(
    thread: ThreadSummaryLike,
    existing: ThreadCursorRow | null,
    allowHostOptionsLookup: boolean
  ): Promise<{ providerId: string; model: string; projectId: string; isSubagent: boolean }> {
    const providerId = thread.providerId || existing?.providerId || 'unknown';
    let model = existing?.model || '';
    const projectId = thread.projectId || existing?.projectId || '';
    const isSubagent = Boolean(thread.parentThreadId) || Boolean(existing?.isSubagent);
    if (!model && allowHostOptionsLookup && deps.threads.defaultExecutionOptions) {
      try {
        const exec = await withTimeout(deps.threads.defaultExecutionOptions({ threadId: thread.id }),
          DEFAULT_EXEC_TIMEOUT_MS, `defaultExecutionOptions(${thread.id})`);
        if (exec?.model) model = exec.model;
      } catch {
        // Resolved from subsequent turn events when available.
      }
    }
    return { providerId, model: model || `${providerId}-default`, projectId, isSubagent };
  }

  function processTokenUsageEvent(args: {
    threadId: string; seq: number; timestampMs: number; providerId: string; model: string;
    projectId: string; isSubagent: boolean; payload: Record<string, unknown>; prevTotals: TokenTotals | null;
  }): TokenTotals | null {
    const tokenUsage = asRecord(args.payload.tokenUsage);
    const total = parseBreakdown(asRecord(tokenUsage.total));
    const last = parseBreakdown(asRecord(tokenUsage.last));
    const hasLast = last.totalTokens > 0 || last.inputTokens > 0 || last.outputTokens > 0;
    const turnCounts = hasLast ? last : positiveDelta(total, args.prevTotals);
    if (turnCounts.inputTokens === 0 && turnCounts.outputTokens === 0 &&
      turnCounts.totalTokens === 0 && turnCounts.reasoningOutputTokens === 0) {
      return total.totalTokens > 0 ? total : args.prevTotals;
    }

    const usageInput: TokenUsageInput = {
      providerId: args.providerId, model: args.model, inputTokens: turnCounts.inputTokens,
      cachedInputTokens: turnCounts.cachedInputTokens, outputTokens: turnCounts.outputTokens,
      reasoningOutputTokens: turnCounts.reasoningOutputTokens,
      totalTokens: turnCounts.hasExplicitTotal ? turnCounts.totalTokens : undefined
    };
    const breakdown = computeTurnCost(usageInput, deps.store.listPricingOverrides(), deps.getProviderModeOverrides());
    const norm = breakdown.normalized;
    const turnId = extractTurnId(args.payload);
    const turnKey = turnId ? `${args.threadId}:${turnId}` : `${args.threadId}:seq:${args.seq}`;
    const windowTokens = asOptionalNumber(tokenUsage, 'modelContextWindow');

    deps.store.upsertTurn({
      turnKey, threadId: args.threadId, providerId: args.providerId, model: args.model, projectId: args.projectId,
      timestampMs: args.timestampMs, billingMode: breakdown.pricing.billingMode, inputTokens: norm.inputTokens,
      cachedInputTokens: norm.cachedInputTokens, outputTokens: norm.outputTokens,
      reasoningOutputTokens: norm.reasoningOutputTokens, totalTokens: norm.totalTokens,
      hasExplicitTotal: Boolean(turnCounts.hasExplicitTotal), cachedInputMode: 'inclusive',
      reasoningMode: norm.reasoningMode, contextUsedTokens: null, contextWindowTokens: windowTokens,
      estimatedCostUsd: breakdown.estimatedCostUsd, costFormula: breakdown.formula,
      isSubagent: args.isSubagent, rawJson: JSON.stringify(args.payload)
    });
    deps.store.upsertLogEvent({
      eventKey: `turn_usage:${turnKey}`, timestampMs: args.timestampMs, kind: 'turn_usage', severity: 'info',
      providerId: args.providerId, model: args.model, projectId: args.projectId, threadId: args.threadId,
      summary: `${args.model}: ${norm.inputTokens.toLocaleString()} in (${norm.cachedInputTokens.toLocaleString()} cached) / ${norm.outputTokens.toLocaleString()} out`,
      costUsd: breakdown.estimatedCostUsd, inputTokens: norm.inputTokens, cachedInputTokens: norm.cachedInputTokens,
      outputTokens: norm.outputTokens, reasoningOutputTokens: norm.reasoningOutputTokens, contextUsedTokens: null,
      contextWindowTokens: windowTokens, costFormula: breakdown.formula, payloadJson: JSON.stringify(args.payload)
    });
    return total.totalTokens > 0 ? total : args.prevTotals;
  }

  function processRateLimitEvent(args: {
    threadId: string; seq: number; timestampMs: number; providerId: string;
    model: string; projectId: string; payload: Record<string, unknown>;
  }): void {
    const rl = asRecord(args.payload.rateLimits);
    const providerId = asOptionalString(rl, 'providerId') ?? args.providerId;
    const status = (asOptionalString(rl, 'status') ?? 'unknown') as ObservedRateLimitState['status'];
    const kind = asOptionalString(rl, 'kind') ?? 'unknown';
    const reachedReason = asOptionalString(rl, 'reachedReason');
    const overageStatus = asOptionalString(rl, 'overageStatus');
    const overageReason = asOptionalString(rl, 'overageReason');
    const windows = parseRateLimitWindows(rl.windows, status);

    const prev = observedRateLimits.get(providerId);
    if (!prev || args.timestampMs >= prev.observedAtMs) {
      observedRateLimits.set(providerId, {
        providerId, status, kind, windows, reachedReason, overageStatus, overageReason, observedAtMs: args.timestampMs
      });
    }
    if (status === 'allowed' && !reachedReason && (!overageStatus || overageStatus === 'allowed')) return;
    const severity: LogSeverity = status === 'blocked' ? 'error' : status === 'warning' ? 'warning' : 'info';
    deps.store.upsertLogEvent({
      eventKey: `rate_limit:${args.threadId}:${args.seq}`, timestampMs: args.timestampMs, kind: 'rate_limit', severity,
      providerId, model: args.model, projectId: args.projectId, threadId: args.threadId,
      summary: reachedReason ?? overageReason ?? `${providerId} rate limit ${status} (${kind})`,
      costUsd: null, payloadJson: JSON.stringify(args.payload)
    });
  }

  function applyThreadEventRow(
    row: ThreadEventRow,
    ctx: { threadId: string; fallbackTs: number; providerId: string; projectId: string; isSubagent: boolean },
    state: { model: string; prevTotals: TokenTotals | null }
  ): number {
    const payload = asRecord(row.payload);
    const ts = eventTimestampMs(row, payload, ctx.fallbackTs);
    if (row.type === 'client/turn/requested') {
      const reqModel = extractRequestedModel(payload);
      if (reqModel) state.model = reqModel;
      return 0;
    }
    if (row.type === 'thread/tokenUsage/updated') {
      state.prevTotals = processTokenUsageEvent({ ...ctx, seq: row.seq, timestampMs: ts, model: state.model, payload, prevTotals: state.prevTotals });
      return 1;
    }
    if (row.type === 'thread/contextWindowUsage/updated') {
      const c = asRecord(payload.contextWindowUsage);
      deps.store.updateLatestThreadContext(ctx.threadId, asOptionalNumber(c, 'usedTokens'), asOptionalNumber(c, 'modelContextWindow'));
      return 0;
    }
    if (row.type === 'provider/rateLimits/updated') {
      processRateLimitEvent({ ...ctx, seq: row.seq, timestampMs: ts, model: state.model, payload });
      return 1;
    }
    if (['provider/modelFallback', 'provider/error', 'provider/warning', 'turn.failed'].includes(row.type)) {
      const nextModel = persistFallbackOrErrorEvent({
        store: deps.store, threadId: ctx.threadId, seq: row.seq, timestampMs: ts,
        providerId: ctx.providerId, model: state.model, projectId: ctx.projectId, type: row.type, payload
      });
      if (nextModel) state.model = nextModel;
      return 1;
    }
    return 0;
  }

  async function indexThread(
    thread: ThreadSummaryLike,
    options: { existingCursor?: ThreadCursorRow | null; allowHostOptionsLookup?: boolean } = {}
  ): Promise<number> {
    const existing = options.existingCursor !== undefined ? options.existingCursor : deps.store.getThreadCursor(thread.id);
    const tUpdated = threadUpdatedMs(thread);
    if (existing && tUpdated > 0 && (existing.threadUpdatedAtMs ?? 0) > 0 && tUpdated <= (existing.threadUpdatedAtMs ?? 0)) {
      return 0;
    }
    const meta = await resolveThreadMeta(thread, existing, options.allowHostOptionsLookup === true);
    let lastSeq = existing?.lastSeq ?? 0;
    const state = {
      model: meta.model,
      prevTotals: existing?.lastTotalJson ? safeJsonParse<TokenTotals | null>(existing.lastTotalJson, null) : null
    };
    const rawEvents = lastSeq > 0
      ? await fetchIncrementalEvents(deps.threads.events, thread.id, lastSeq)
      : await fetchInitialEvents(deps.threads.events, thread.id);
    const newEvents = rawEvents.filter((ev) => ev.seq > lastSeq);
    const fallbackTs = thread.updatedAt ?? thread.createdAt ?? now();
    let processed = 0;
    for (const row of newEvents) {
      processed += applyThreadEventRow(row, { threadId: thread.id, fallbackTs, providerId: meta.providerId, projectId: meta.projectId, isSubagent: meta.isSubagent }, state);
      if (row.seq > lastSeq) lastSeq = row.seq;
    }
    deps.store.saveThreadCursor({
      threadId: thread.id, lastSeq, providerId: meta.providerId, model: state.model, projectId: meta.projectId,
      isSubagent: meta.isSubagent, lastTotalJson: state.prevTotals ? JSON.stringify(state.prevTotals) : null,
      updatedAtMs: now(), threadUpdatedAtMs: tUpdated
    });
    return processed;
  }

  async function processThreadBatch(
    batch: readonly ThreadSummaryLike[], cursors: ReadonlyMap<string, ThreadCursorRow>, concurrency: number, deadlineMs: number
  ): Promise<{ scanned: number; indexed: number; timedOut: boolean }> {
    let scanned = 0;
    let indexed = 0;
    for (let i = 0; i < batch.length; i += concurrency) {
      if (Date.now() >= deadlineMs) return { scanned, indexed, timedOut: true };
      const chunk = batch.slice(i, i + concurrency);
      const counts = await Promise.all(chunk.map(async (thread) => {
        scanned += 1;
        try {
          return await indexThread(thread, { existingCursor: cursors.get(thread.id) ?? null, allowHostOptionsLookup: false });
        } catch (err) {
          deps.log.warn(`ai-usage-monitor: failed indexing thread ${thread.id}: ${errorMessage(err)}`);
          return 0;
        }
      }));
      for (const count of counts) indexed += count;
    }
    return { scanned, indexed, timedOut: false };
  }

  async function collectCandidateThreads(deadlineMs: number): Promise<{ threads: ThreadSummaryLike[]; truncated: boolean }> {
    if (typeof deps.threads.list === 'function') {
      const all: ThreadSummaryLike[] = [];
      for (let page = 0, offset = 0; page < 20; page++) {
        if (Date.now() >= deadlineMs) return { threads: all, truncated: true };
        const batch = await withTimeout(deps.threads.list({ includeHidden: true, limit: 100, offset }), THREAD_LIST_TIMEOUT_MS, `threads.list(offset=${offset})`);
        if (!batch || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < 100) break;
        offset += batch.length;
      }
      return { threads: all, truncated: false };
    }
    if (typeof deps.threads.search === 'function') {
      const seen = new Set<string>();
      const all: ThreadSummaryLike[] = [];
      for (const archived of [false, true]) {
        if (Date.now() >= deadlineMs) return { threads: all, truncated: true };
        const batch = await withTimeout(deps.threads.search({ query: '', archived, limit: 500 }), THREAD_LIST_TIMEOUT_MS, `threads.search(archived=${archived})`);
        for (const thread of batch) {
          if (!seen.has(thread.id)) { seen.add(thread.id); all.push(thread); }
        }
      }
      return { threads: all, truncated: false };
    }
    return { threads: [], truncated: false };
  }

  async function syncAllThreads(opts: SyncThreadsOptions = {}): Promise<SyncThreadsResult> {
    const budgetMs = opts.timeBudgetMs ?? DEFAULT_SYNC_TIME_BUDGET_MS;
    const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);
    const deadlineMs = Date.now() + budgetMs;
    const cursors = deps.store.listThreadCursors();
    const { threads, truncated } = await collectCandidateThreads(deadlineMs);
    threads.sort((a, b) => threadUpdatedMs(b) - threadUpdatedMs(a));
    const dirtyThreads = threads.filter((t) => {
      const c = cursors.get(t.id);
      const tUpdated = threadUpdatedMs(t);
      return !c || tUpdated === 0 || (c.threadUpdatedAtMs ?? 0) === 0 || tUpdated > (c.threadUpdatedAtMs ?? 0);
    });
    let threadsScanned = threads.length - dirtyThreads.length;
    let eventsIndexed = 0;
    let timedOut = truncated;
    for (let i = 0; i < dirtyThreads.length; i += 40) {
      const res = await processThreadBatch(dirtyThreads.slice(i, i + 40), cursors, concurrency, deadlineMs);
      threadsScanned += res.scanned;
      eventsIndexed += res.indexed;
      if (res.indexed > 0) opts.onBatchProgress?.();
      if (res.timedOut) { timedOut = true; break; }
    }
    return { threadsScanned, eventsIndexed, hasMore: timedOut };
  }

  async function onThreadLifecycleEvent(event: ThreadLifecycleEventLike): Promise<number> {
    try {
      const summary = event.thread ?? (event.threadId
        ? await withTimeout(deps.threads.get({ threadId: event.threadId }), THREAD_EVENTS_TIMEOUT_MS, 'threads.get').catch(() => null)
        : null);
      if (!summary) return 0;
      const merged: ThreadSummaryLike = {
        ...summary, providerId: event.providerId || summary.providerId,
        projectId: event.projectId || summary.projectId, updatedAt: now()
      };
      if (event.model && !deps.store.getThreadCursor(merged.id)?.model) {
        const existing = deps.store.getThreadCursor(merged.id);
        deps.store.saveThreadCursor({
          threadId: merged.id, lastSeq: existing?.lastSeq ?? 0, providerId: merged.providerId,
          model: event.model, projectId: merged.projectId, isSubagent: Boolean(merged.parentThreadId),
          lastTotalJson: existing?.lastTotalJson ?? null, updatedAtMs: now(), threadUpdatedAtMs: existing?.threadUpdatedAtMs ?? 0
        });
      }
      return await indexThread(merged, { allowHostOptionsLookup: true });
    } catch (err) {
      deps.log.warn(`ai-usage-monitor: lifecycle index failed for ${event.threadId}: ${errorMessage(err)}`);
      return 0;
    }
  }

  return {
    syncAllThreads,
    onThreadLifecycleEvent,
    getObservedRateLimit: (providerId: string) => observedRateLimits.get(providerId)
  };
}
