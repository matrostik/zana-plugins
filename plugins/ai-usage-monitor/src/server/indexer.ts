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
}

type ThreadEventRow = { seq: number; type: string; payload: unknown; createdAt?: number };

const THREAD_LIST_TIMEOUT_MS = 8000;
const THREAD_EVENTS_TIMEOUT_MS = 5000;
const DEFAULT_EXEC_TIMEOUT_MS = 1500;
const DEFAULT_SYNC_TIME_BUDGET_MS = 20_000;
const DEFAULT_CONCURRENCY = 8;

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
  const totalTokens = rawTotal > 0 ? rawTotal : inputTokens + outputTokens;
  return { inputTokens, cachedInputTokens, outputTokens, reasoningOutputTokens, totalTokens };
}

function positiveDelta(next: TokenTotals, prev: TokenTotals | null): TokenTotals {
  if (!prev) return next;
  const inputTokens = Math.max(0, next.inputTokens - prev.inputTokens);
  const cachedInputTokens = Math.max(0, next.cachedInputTokens - prev.cachedInputTokens);
  const outputTokens = Math.max(0, next.outputTokens - prev.outputTokens);
  const reasoningOutputTokens = Math.max(0, next.reasoningOutputTokens - prev.reasoningOutputTokens);
  const totalTokens = Math.max(0, next.totalTokens - prev.totalTokens);
  return { inputTokens, cachedInputTokens, outputTokens, reasoningOutputTokens, totalTokens };
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
        const exec = await withTimeout(
          deps.threads.defaultExecutionOptions({ threadId: thread.id }),
          DEFAULT_EXEC_TIMEOUT_MS,
          `defaultExecutionOptions(${thread.id})`
        );
        if (exec?.model) model = exec.model;
      } catch {
        // Thread may not have resolved default execution options yet; resolved from events below.
      }
    }

    return { providerId, model: model || `${providerId}-default`, projectId, isSubagent };
  }

  function processTokenUsageEvent(args: {
    threadId: string;
    seq: number;
    timestampMs: number;
    providerId: string;
    model: string;
    projectId: string;
    isSubagent: boolean;
    payload: Record<string, unknown>;
    prevTotals: TokenTotals | null;
  }): TokenTotals | null {
    const tokenUsage = asRecord(args.payload.tokenUsage);
    const total = parseBreakdown(asRecord(tokenUsage.total));
    const last = parseBreakdown(asRecord(tokenUsage.last));
    const hasLast = last.totalTokens > 0 || last.inputTokens > 0 || last.outputTokens > 0;
    const turnCounts = hasLast ? last : positiveDelta(total, args.prevTotals);

    if (
      turnCounts.inputTokens === 0 &&
      turnCounts.outputTokens === 0 &&
      turnCounts.totalTokens === 0 &&
      turnCounts.reasoningOutputTokens === 0
    ) {
      return total.totalTokens > 0 ? total : args.prevTotals;
    }

    const overrides = deps.store.listPricingOverrides();
    const usageInput: TokenUsageInput = {
      providerId: args.providerId,
      model: args.model,
      ...turnCounts
    };
    const breakdown = computeTurnCost(usageInput, overrides, deps.getProviderModeOverrides());
    const turnId = extractTurnId(args.payload);
    const turnKey = turnId ? `${args.threadId}:${turnId}` : `${args.threadId}:seq:${args.seq}`;
    const windowTokens = asOptionalNumber(tokenUsage, 'modelContextWindow');

    deps.store.upsertTurn({
      turnKey,
      threadId: args.threadId,
      providerId: args.providerId,
      model: args.model,
      projectId: args.projectId,
      timestampMs: args.timestampMs,
      billingMode: breakdown.pricing.billingMode,
      inputTokens: turnCounts.inputTokens,
      cachedInputTokens: turnCounts.cachedInputTokens,
      outputTokens: turnCounts.outputTokens,
      reasoningOutputTokens: turnCounts.reasoningOutputTokens,
      totalTokens: turnCounts.totalTokens,
      contextUsedTokens: null,
      contextWindowTokens: windowTokens,
      estimatedCostUsd: breakdown.estimatedCostUsd,
      costFormula: breakdown.formula,
      isSubagent: args.isSubagent,
      rawJson: JSON.stringify(args.payload)
    });

    deps.store.upsertLogEvent({
      eventKey: `turn_usage:${turnKey}`,
      timestampMs: args.timestampMs,
      kind: 'turn_usage',
      severity: 'info',
      providerId: args.providerId,
      model: args.model,
      projectId: args.projectId,
      threadId: args.threadId,
      summary: `${args.model}: ${turnCounts.inputTokens.toLocaleString()} in (${turnCounts.cachedInputTokens.toLocaleString()} cached) / ${turnCounts.outputTokens.toLocaleString()} out`,
      costUsd: breakdown.estimatedCostUsd,
      inputTokens: turnCounts.inputTokens,
      cachedInputTokens: turnCounts.cachedInputTokens,
      outputTokens: turnCounts.outputTokens,
      reasoningOutputTokens: turnCounts.reasoningOutputTokens,
      contextUsedTokens: null,
      contextWindowTokens: windowTokens,
      costFormula: breakdown.formula,
      payloadJson: JSON.stringify(args.payload)
    });

    return total.totalTokens > 0 ? total : args.prevTotals;
  }

  function processRateLimitEvent(args: {
    threadId: string;
    seq: number;
    timestampMs: number;
    providerId: string;
    model: string;
    projectId: string;
    payload: Record<string, unknown>;
  }): void {
    const rl = asRecord(args.payload.rateLimits);
    const providerId = asOptionalString(rl, 'providerId') ?? args.providerId;
    const status = (asOptionalString(rl, 'status') ?? 'unknown') as ObservedRateLimitState['status'];
    const kind = asOptionalString(rl, 'kind') ?? 'unknown';
    const reachedReason = asOptionalString(rl, 'reachedReason');
    const overageStatus = asOptionalString(rl, 'overageStatus');
    const overageReason = asOptionalString(rl, 'overageReason');

    const rawWindows = Array.isArray(rl.windows) ? rl.windows : [];
    const windows: QuotaWindow[] = rawWindows.map((w, idx) => {
      const rec = asRecord(w);
      const resetsAtMs = asOptionalNumber(rec, 'resetsAtMs');
      const winStatus = (asOptionalString(rec, 'status') ?? status) as QuotaWindow['status'];
      return {
        key: asOptionalString(rec, 'providerKey') ?? `window_${idx}`,
        label: asOptionalString(rec, 'label') ?? asOptionalString(rec, 'providerKey') ?? 'Quota Window',
        usedPercent: winStatus === 'blocked' ? 100 : null,
        remainingPercent: winStatus === 'blocked' ? 0 : null,
        status: winStatus,
        resetsAtIso: resetsAtMs ? new Date(resetsAtMs).toISOString() : null
      };
    });

    const prev = observedRateLimits.get(providerId);
    if (!prev || args.timestampMs >= prev.observedAtMs) {
      observedRateLimits.set(providerId, {
        providerId,
        status,
        kind,
        windows,
        reachedReason,
        overageStatus,
        overageReason,
        observedAtMs: args.timestampMs
      });
    }

    const severity: LogSeverity = status === 'blocked' ? 'error' : status === 'warning' ? 'warning' : 'info';
    if (status === 'allowed' && !reachedReason && (!overageStatus || overageStatus === 'allowed')) {
      return;
    }

    const summary = reachedReason ?? overageReason ?? `${providerId} rate limit ${status} (${kind})`;
    deps.store.upsertLogEvent({
      eventKey: `rate_limit:${args.threadId}:${args.seq}`,
      timestampMs: args.timestampMs,
      kind: 'rate_limit',
      severity,
      providerId,
      model: args.model,
      projectId: args.projectId,
      threadId: args.threadId,
      summary,
      costUsd: null,
      payloadJson: JSON.stringify(args.payload)
    });
  }

  function processFallbackOrError(args: {
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
      const originalModel = asOptionalString(args.payload, 'originalModel') ?? args.model;
      const fallbackModel = asOptionalString(args.payload, 'fallbackModel') ?? args.model;
      const msg = asOptionalString(args.payload, 'message') ?? `Model switched ${originalModel} -> ${fallbackModel}`;
      deps.store.upsertLogEvent({
        eventKey: `fallback:${args.threadId}:${args.seq}`,
        timestampMs: args.timestampMs,
        kind: 'fallback',
        severity: 'warning',
        providerId: args.providerId,
        model: fallbackModel,
        projectId: args.projectId,
        threadId: args.threadId,
        summary: msg,
        costUsd: null,
        payloadJson: JSON.stringify(args.payload)
      });
      return fallbackModel;
    }

    if (args.type === 'provider/warning') {
      const msg = asOptionalString(args.payload, 'summary') ?? asOptionalString(args.payload, 'message') ?? 'Provider warning';
      deps.store.upsertLogEvent({
        eventKey: `warning:${args.threadId}:${args.seq}`,
        timestampMs: args.timestampMs,
        kind: 'error',
        severity: 'warning',
        providerId: args.providerId,
        model: args.model,
        projectId: args.projectId,
        threadId: args.threadId,
        summary: msg,
        costUsd: null,
        payloadJson: JSON.stringify(args.payload)
      });
      return null;
    }

    const detail = asOptionalString(args.payload, 'detail');
    const baseMsg = asOptionalString(args.payload, 'message') ?? (args.type === 'turn.failed' ? 'Turn failed' : 'Provider error');
    const msg = detail && detail !== baseMsg ? `${baseMsg}: ${detail}` : baseMsg;
    const willRetry = args.payload.willRetry === true;
    deps.store.upsertLogEvent({
      eventKey: `error:${args.threadId}:${args.seq}`,
      timestampMs: args.timestampMs,
      kind: 'error',
      severity: willRetry ? 'warning' : 'error',
      providerId: args.providerId,
      model: args.model,
      projectId: args.projectId,
      threadId: args.threadId,
      summary: willRetry ? `${msg} (retrying)` : msg,
      costUsd: null,
      payloadJson: JSON.stringify(args.payload)
    });
    return null;
  }

  async function fetchThreadEvents(threadId: string, lastSeq: number): Promise<ThreadEventRow[]> {
    if (lastSeq > 0) {
      const tail = await withTimeout(
        deps.threads.events.list({
          threadId,
          types: WATCHED_EVENT_TYPES,
          limit: 200,
          order: 'desc'
        }),
        THREAD_EVENTS_TIMEOUT_MS,
        `events.list(${threadId})`
      );
      return tail.filter((ev) => ev.seq > lastSeq).sort((a, b) => a.seq - b.seq);
    }

    const head = await withTimeout(
      deps.threads.events.list({
        threadId,
        types: WATCHED_EVENT_TYPES,
        limit: 500,
        order: 'asc'
      }),
      THREAD_EVENTS_TIMEOUT_MS,
      `events.list(${threadId})`
    );
    if (head.length < 500) return head;

    const tail = await withTimeout(
      deps.threads.events.list({
        threadId,
        types: WATCHED_EVENT_TYPES,
        limit: 500,
        order: 'desc'
      }),
      THREAD_EVENTS_TIMEOUT_MS,
      `events.list.tail(${threadId})`
    );
    const bySeq = new Map<number, ThreadEventRow>();
    for (const ev of [...head, ...tail]) bySeq.set(ev.seq, ev);
    return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
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
    let currentModel = meta.model;
    let lastSeq = existing?.lastSeq ?? 0;
    let prevTotals = existing?.lastTotalJson ? safeJsonParse<TokenTotals | null>(existing.lastTotalJson, null) : null;

    const events = await fetchThreadEvents(thread.id, lastSeq);
    const newEvents = events.filter((ev) => ev.seq > lastSeq);

    let processed = 0;
    const fallbackTs = thread.updatedAt ?? thread.createdAt ?? now();

    for (const row of newEvents) {
      const payload = asRecord(row.payload);
      const ts = eventTimestampMs(row, payload, fallbackTs);

      if (row.type === 'client/turn/requested') {
        const reqModel = extractRequestedModel(payload);
        if (reqModel) currentModel = reqModel;
      } else if (row.type === 'thread/tokenUsage/updated') {
        prevTotals = processTokenUsageEvent({
          threadId: thread.id,
          seq: row.seq,
          timestampMs: ts,
          providerId: meta.providerId,
          model: currentModel,
          projectId: meta.projectId,
          isSubagent: meta.isSubagent,
          payload,
          prevTotals
        });
        processed += 1;
      } else if (row.type === 'thread/contextWindowUsage/updated') {
        const ctx = asRecord(payload.contextWindowUsage);
        deps.store.updateLatestThreadContext(
          thread.id,
          asOptionalNumber(ctx, 'usedTokens'),
          asOptionalNumber(ctx, 'modelContextWindow')
        );
      } else if (row.type === 'provider/rateLimits/updated') {
        processRateLimitEvent({
          threadId: thread.id,
          seq: row.seq,
          timestampMs: ts,
          providerId: meta.providerId,
          model: currentModel,
          projectId: meta.projectId,
          payload
        });
        processed += 1;
      } else if (
        row.type === 'provider/modelFallback' ||
        row.type === 'provider/error' ||
        row.type === 'provider/warning' ||
        row.type === 'turn.failed'
      ) {
        const nextModel = processFallbackOrError({
          threadId: thread.id,
          seq: row.seq,
          timestampMs: ts,
          providerId: meta.providerId,
          model: currentModel,
          projectId: meta.projectId,
          type: row.type,
          payload
        });
        if (nextModel) currentModel = nextModel;
        processed += 1;
      }

      if (row.seq > lastSeq) lastSeq = row.seq;
    }

    deps.store.saveThreadCursor({
      threadId: thread.id,
      lastSeq,
      providerId: meta.providerId,
      model: currentModel,
      projectId: meta.projectId,
      isSubagent: meta.isSubagent,
      lastTotalJson: prevTotals ? JSON.stringify(prevTotals) : null,
      updatedAtMs: now(),
      threadUpdatedAtMs: tUpdated
    });

    return processed;
  }

  async function processThreadBatch(
    batch: readonly ThreadSummaryLike[],
    cursors: ReadonlyMap<string, ThreadCursorRow>,
    concurrency: number,
    deadlineMs: number
  ): Promise<{ scanned: number; indexed: number; timedOut: boolean }> {
    let scanned = 0;
    let indexed = 0;

    for (let i = 0; i < batch.length; i += concurrency) {
      if (Date.now() >= deadlineMs) {
        return { scanned, indexed, timedOut: true };
      }
      const chunk = batch.slice(i, i + concurrency);
      const counts = await Promise.all(
        chunk.map(async (thread) => {
          scanned += 1;
          try {
            return await indexThread(thread, {
              existingCursor: cursors.get(thread.id) ?? null,
              allowHostOptionsLookup: false
            });
          } catch (err) {
            deps.log.warn(`ai-usage-monitor: failed indexing thread ${thread.id}: ${errorMessage(err)}`);
            return 0;
          }
        })
      );
      for (const count of counts) indexed += count;
    }

    return { scanned, indexed, timedOut: false };
  }

  async function collectCandidateThreads(deadlineMs: number): Promise<{ threads: ThreadSummaryLike[]; truncated: boolean }> {
    if (typeof deps.threads.list === 'function') {
      const all: ThreadSummaryLike[] = [];
      let offset = 0;
      const limit = 100;
      for (let page = 0; page < 20; page++) {
        if (Date.now() >= deadlineMs) return { threads: all, truncated: true };
        const batch = await withTimeout(
          deps.threads.list({ includeHidden: true, limit, offset }),
          THREAD_LIST_TIMEOUT_MS,
          `threads.list(offset=${offset})`
        );
        if (!batch || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < limit) break;
        offset += batch.length;
      }
      return { threads: all, truncated: false };
    }

    if (typeof deps.threads.search === 'function') {
      const seen = new Set<string>();
      const all: ThreadSummaryLike[] = [];
      for (const archived of [false, true]) {
        if (Date.now() >= deadlineMs) return { threads: all, truncated: true };
        const batch = await withTimeout(
          deps.threads.search({ query: '', archived, limit: 500 }),
          THREAD_LIST_TIMEOUT_MS,
          `threads.search(archived=${archived})`
        );
        for (const thread of batch) {
          if (seen.has(thread.id)) continue;
          seen.add(thread.id);
          all.push(thread);
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

    const dirtyThreads = threads.filter((thread) => {
      const cursor = cursors.get(thread.id);
      if (!cursor) return true;
      const tUpdated = threadUpdatedMs(thread);
      return tUpdated === 0 || (cursor.threadUpdatedAtMs ?? 0) === 0 || tUpdated > (cursor.threadUpdatedAtMs ?? 0);
    });

    const pageSize = 40;
    let threadsScanned = threads.length - dirtyThreads.length;
    let eventsIndexed = 0;
    let timedOut = truncated;

    for (let i = 0; i < dirtyThreads.length; i += pageSize) {
      const slice = dirtyThreads.slice(i, i + pageSize);
      const res = await processThreadBatch(slice, cursors, concurrency, deadlineMs);
      threadsScanned += res.scanned;
      eventsIndexed += res.indexed;
      if (res.indexed > 0) opts.onBatchProgress?.();
      if (res.timedOut) {
        timedOut = true;
        break;
      }
    }

    return { threadsScanned, eventsIndexed, hasMore: timedOut };
  }

  async function onThreadLifecycleEvent(event: ThreadLifecycleEventLike): Promise<number> {
    try {
      const summary =
        event.thread ??
        (event.threadId
          ? await withTimeout(deps.threads.get({ threadId: event.threadId }), THREAD_EVENTS_TIMEOUT_MS, 'threads.get').catch(() => null)
          : null);
      if (!summary) return 0;
      const merged: ThreadSummaryLike = {
        ...summary,
        providerId: event.providerId || summary.providerId,
        projectId: event.projectId || summary.projectId,
        updatedAt: now()
      };
      if (event.model && !deps.store.getThreadCursor(merged.id)?.model) {
        const existing = deps.store.getThreadCursor(merged.id);
        deps.store.saveThreadCursor({
          threadId: merged.id,
          lastSeq: existing?.lastSeq ?? 0,
          providerId: merged.providerId,
          model: event.model,
          projectId: merged.projectId,
          isSubagent: Boolean(merged.parentThreadId),
          lastTotalJson: existing?.lastTotalJson ?? null,
          updatedAtMs: now(),
          threadUpdatedAtMs: existing?.threadUpdatedAtMs ?? 0
        });
      }
      return await indexThread(merged, { allowHostOptionsLookup: true });
    } catch (err) {
      deps.log.warn(`ai-usage-monitor: lifecycle index failed for ${event.threadId}: ${errorMessage(err)}`);
      return 0;
    }
  }

  function getObservedRateLimit(providerId: string): ObservedRateLimitState | undefined {
    return observedRateLimits.get(providerId);
  }

  return {
    syncAllThreads,
    onThreadLifecycleEvent,
    getObservedRateLimit
  };
}
