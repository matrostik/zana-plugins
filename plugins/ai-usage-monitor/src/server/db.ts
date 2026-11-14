import type { PluginDatabase } from '@zana-ai/zcc-plugin-sdk/server';
import type {
  BillingMode,
  BudgetMetric,
  BudgetPeriod,
  BudgetRule,
  BudgetRuleInput,
  BudgetScopeType,
  DailySpendPoint,
  LogEventKind,
  LogSeverity,
  LogsQuery,
  ModelConsumptionRow,
  ModelPricingRule,
  ProjectConsumptionRow,
  ProviderQuotaStatus,
  QuotaWindow,
  TimeRangeKey,
  UsageLogEntry
} from '../shared/types.ts';
import {
  asRecord,
  computeCacheHitPercent,
  localDateKey,
  resolveTimeRangeBounds,
  safeJsonParse,
  slugId,
  type CachedInputConvention
} from './util.ts';
import {
  computeTurnCost,
  normalizeTokenUsage,
  resolveModelPricing,
  type TokenReasoningConvention
} from './pricing.ts';

export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS usage_turns (
    id TEXT PRIMARY KEY,
    turn_key TEXT NOT NULL UNIQUE,
    thread_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    model TEXT NOT NULL,
    project_id TEXT NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    billing_mode TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    cached_input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    reasoning_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    context_used_tokens INTEGER,
    context_window_tokens INTEGER,
    estimated_cost_usd REAL NOT NULL DEFAULT 0,
    cost_formula TEXT NOT NULL DEFAULT '',
    is_subagent INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_usage_turns_ts ON usage_turns(timestamp_ms)`,
  `CREATE INDEX IF NOT EXISTS idx_usage_turns_prov_model ON usage_turns(provider_id, model)`,
  `CREATE INDEX IF NOT EXISTS idx_usage_turns_proj ON usage_turns(project_id)`,
  `CREATE TABLE IF NOT EXISTS usage_events_log (
    id TEXT PRIMARY KEY,
    event_key TEXT NOT NULL UNIQUE,
    timestamp_ms INTEGER NOT NULL,
    kind TEXT NOT NULL,
    severity TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    model TEXT,
    project_id TEXT,
    thread_id TEXT,
    summary TEXT NOT NULL,
    cost_usd REAL,
    input_tokens INTEGER,
    cached_input_tokens INTEGER,
    output_tokens INTEGER,
    reasoning_output_tokens INTEGER,
    context_used_tokens INTEGER,
    context_window_tokens INTEGER,
    cost_formula TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_usage_events_ts ON usage_events_log(timestamp_ms DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_usage_events_kind ON usage_events_log(kind)`,
  `CREATE TABLE IF NOT EXISTS provider_quota_snapshots (
    provider_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    account_label TEXT,
    plan_label TEXT,
    billing_mode TEXT NOT NULL DEFAULT 'subscription',
    windows_json TEXT NOT NULL DEFAULT '[]',
    credit_remaining_usd REAL,
    credit_limit_usd REAL,
    credit_used_usd REAL,
    billed_cost_usd REAL,
    error_message TEXT,
    updated_at_ms INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scope_type TEXT NOT NULL,
    scope_id TEXT NOT NULL DEFAULT '',
    period TEXT NOT NULL,
    metric TEXT NOT NULL,
    limit_value REAL NOT NULL,
    alert_threshold_pct REAL NOT NULL DEFAULT 80,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at_ms INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS budget_alerts_sent (
    budget_id TEXT NOT NULL,
    period_key TEXT NOT NULL,
    level TEXT NOT NULL,
    sent_at_ms INTEGER NOT NULL,
    PRIMARY KEY (budget_id, period_key, level)
  )`,
  `CREATE TABLE IF NOT EXISTS model_pricing_overrides (
    pattern TEXT PRIMARY KEY,
    input_per_1m REAL NOT NULL,
    cached_input_per_1m REAL NOT NULL,
    output_per_1m REAL NOT NULL,
    reasoning_per_1m REAL NOT NULL DEFAULT 0,
    billing_mode TEXT,
    updated_at_ms INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS thread_sync_cursors (
    thread_id TEXT PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0,
    provider_id TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    project_id TEXT NOT NULL DEFAULT '',
    is_subagent INTEGER NOT NULL DEFAULT 0,
    last_total_json TEXT,
    updated_at_ms INTEGER NOT NULL
  )`,
  `ALTER TABLE thread_sync_cursors ADD COLUMN thread_updated_at_ms INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE usage_turns ADD COLUMN has_explicit_total INTEGER`,
  `ALTER TABLE usage_turns ADD COLUMN cached_input_mode TEXT NOT NULL DEFAULT 'inclusive'`,
  `ALTER TABLE usage_turns ADD COLUMN reasoning_mode TEXT`,
  `UPDATE usage_turns SET input_tokens = input_tokens + cached_input_tokens, cached_input_mode = 'inclusive' WHERE cached_input_tokens > input_tokens`
];

export interface UpsertTurnRecord {
  turnKey: string;
  threadId: string;
  providerId: string;
  model: string;
  projectId: string;
  timestampMs: number;
  billingMode: BillingMode;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  hasExplicitTotal?: boolean;
  cachedInputMode?: CachedInputConvention;
  reasoningMode?: TokenReasoningConvention;
  contextUsedTokens: number | null;
  contextWindowTokens: number | null;
  estimatedCostUsd: number;
  costFormula: string;
  isSubagent: boolean;
  rawJson: string;
}

export interface UpsertLogRecord {
  eventKey: string;
  timestampMs: number;
  kind: LogEventKind;
  severity: LogSeverity;
  providerId: string;
  model: string | null;
  projectId: string | null;
  threadId: string | null;
  summary: string;
  costUsd: number | null;
  inputTokens?: number | null;
  cachedInputTokens?: number | null;
  outputTokens?: number | null;
  reasoningOutputTokens?: number | null;
  contextUsedTokens?: number | null;
  contextWindowTokens?: number | null;
  costFormula?: string | null;
  payloadJson: string;
}

export interface UpsertQuotaRecord {
  providerId: string;
  displayName: string;
  source: string;
  status: ProviderQuotaStatus;
  accountLabel: string | null;
  planLabel: string | null;
  billingMode: BillingMode;
  windows: QuotaWindow[];
  creditRemainingUsd: number | null;
  creditLimitUsd: number | null;
  creditUsedUsd: number | null;
  billedCostUsd: number | null;
  errorMessage: string | null;
  updatedAtMs: number;
}

export interface ThreadCursorRow {
  threadId: string;
  lastSeq: number;
  providerId: string;
  model: string;
  projectId: string;
  isSubagent: boolean;
  lastTotalJson: string | null;
  updatedAtMs: number;
  threadUpdatedAtMs?: number;
}

const REPRICE_BATCH_SIZE = 200;

function buildTimeRangeFilter(
  sinceMs: number,
  untilMs?: number | null,
  column = 'timestamp_ms'
): { sql: string; params: unknown[] } {
  if (untilMs !== null && untilMs !== undefined) {
    return { sql: `${column} >= ? AND ${column} < ?`, params: [sinceMs, untilMs] };
  }
  return { sql: `${column} >= ?`, params: [sinceMs] };
}

function buildMetricFilter(args: {
  sinceMs: number;
  scopeType: BudgetScopeType;
  scopeId: string;
  metric: BudgetMetric;
}): { clauses: string[]; params: unknown[]; col: string } {
  const clauses: string[] = ['timestamp_ms >= ?'];
  const params: unknown[] = [args.sinceMs];
  if (args.scopeType === 'provider' && args.scopeId) {
    clauses.push('provider_id = ?');
    params.push(args.scopeId);
  } else if (args.scopeType === 'model' && args.scopeId) {
    clauses.push('model = ?');
    params.push(args.scopeId);
  } else if (args.scopeType === 'project' && args.scopeId) {
    clauses.push('project_id = ?');
    params.push(args.scopeId);
  }
  if (args.metric === 'billed_usd') {
    clauses.push("billing_mode = 'billed_api'");
  }
  const col = args.metric === 'tokens' ? 'total_tokens' : 'estimated_cost_usd';
  return { clauses, params, col };
}

function hasExplicitTurnTotal(row: Record<string, unknown>): boolean {
  if (row.has_explicit_total !== null && row.has_explicit_total !== undefined) {
    return Number(row.has_explicit_total) === 1;
  }
  const payload = asRecord(safeJsonParse<unknown>(String(row.raw_json), {}));
  if (!payload.tokenUsage) return Number(row.total_tokens) > 0;
  const usage = asRecord(payload.tokenUsage);
  const last = asRecord(usage.last);
  const hasLast = Number(last.totalTokens) > 0 || Number(last.inputTokens) > 0 || Number(last.outputTokens) > 0;
  return Number((hasLast ? last : asRecord(usage.total)).totalTokens) > 0;
}

function buildLogFilterParts(query: LogsQuery): {
  nonKindWhereSql: string;
  nonKindParams: unknown[];
  whereSql: string;
  params: unknown[];
} {
  const nonKindClauses: string[] = [];
  const nonKindParams: unknown[] = [];
  if (query.providerId) {
    nonKindClauses.push('provider_id = ?');
    nonKindParams.push(query.providerId);
  }
  if (query.projectId) {
    nonKindClauses.push('project_id = ?');
    nonKindParams.push(query.projectId);
  }
  if (query.search && query.search.trim()) {
    const term = `%${query.search.trim().toLowerCase()}%`;
    nonKindClauses.push(
      "(LOWER(summary) LIKE ? OR LOWER(COALESCE(model, '')) LIKE ? OR LOWER(COALESCE(thread_id, '')) LIKE ? OR LOWER(COALESCE(provider_id, '')) LIKE ?)"
    );
    nonKindParams.push(term, term, term, term);
  }
  const clauses = [...nonKindClauses];
  const params = [...nonKindParams];
  if (query.kind && query.kind !== 'all') {
    clauses.push('kind = ?');
    params.push(query.kind);
  }
  return {
    nonKindWhereSql: nonKindClauses.length > 0 ? `WHERE ${nonKindClauses.join(' AND ')}` : '',
    nonKindParams,
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

function mapLogRow(row: Record<string, unknown>, projectNames: ReadonlyMap<string, string>): UsageLogEntry {
  const projectId = typeof row.project_id === 'string' ? row.project_id : null;
  return {
    id: String(row.id),
    timestampMs: Number(row.timestamp_ms ?? 0),
    kind: String(row.kind) as LogEventKind,
    severity: String(row.severity) as LogSeverity,
    providerId: String(row.provider_id),
    model: typeof row.model === 'string' ? row.model : null,
    projectId,
    projectName: projectId ? (projectNames.get(projectId) ?? projectId) : null,
    threadId: typeof row.thread_id === 'string' ? row.thread_id : null,
    summary: String(row.summary),
    costUsd: typeof row.cost_usd === 'number' ? row.cost_usd : null,
    inputTokens: typeof row.input_tokens === 'number' ? row.input_tokens : null,
    cachedInputTokens: typeof row.cached_input_tokens === 'number' ? row.cached_input_tokens : null,
    outputTokens: typeof row.output_tokens === 'number' ? row.output_tokens : null,
    reasoningOutputTokens: typeof row.reasoning_output_tokens === 'number' ? row.reasoning_output_tokens : null,
    contextUsedTokens: typeof row.context_used_tokens === 'number' ? row.context_used_tokens : null,
    contextWindowTokens: typeof row.context_window_tokens === 'number' ? row.context_window_tokens : null,
    costFormula: typeof row.cost_formula === 'string' ? row.cost_formula : null,
    payload: safeJsonParse<Record<string, unknown>>(String(row.payload_json ?? '{}'), {})
  };
}

function mapThreadCursor(row: Record<string, unknown>): ThreadCursorRow {
  return {
    threadId: String(row.thread_id),
    lastSeq: Number(row.last_seq ?? 0),
    providerId: String(row.provider_id ?? ''),
    model: String(row.model ?? ''),
    projectId: String(row.project_id ?? ''),
    isSubagent: Number(row.is_subagent ?? 0) === 1,
    lastTotalJson: typeof row.last_total_json === 'string' ? row.last_total_json : null,
    updatedAtMs: Number(row.updated_at_ms ?? 0),
    threadUpdatedAtMs: Number(row.thread_updated_at_ms ?? 0)
  };
}

function mapBudgetRow(row: Record<string, unknown>): BudgetRule {
  return {
    id: String(row.id),
    name: String(row.name),
    scopeType: String(row.scope_type) as BudgetScopeType,
    scopeId: String(row.scope_id ?? ''),
    period: String(row.period) as BudgetPeriod,
    metric: String(row.metric) as BudgetMetric,
    limitValue: Number(row.limit_value ?? 0),
    alertThresholdPct: Number(row.alert_threshold_pct ?? 80),
    enabled: Number(row.enabled ?? 1) === 1,
    createdAtMs: Number(row.created_at_ms ?? 0)
  };
}

function mapQuotaRow(row: Record<string, unknown>): UpsertQuotaRecord {
  return {
    providerId: String(row.provider_id),
    displayName: String(row.display_name),
    source: String(row.source),
    status: String(row.status) as ProviderQuotaStatus,
    accountLabel: typeof row.account_label === 'string' ? row.account_label : null,
    planLabel: typeof row.plan_label === 'string' ? row.plan_label : null,
    billingMode: (String(row.billing_mode) as BillingMode) || 'subscription',
    windows: safeJsonParse<QuotaWindow[]>(String(row.windows_json ?? '[]'), []),
    creditRemainingUsd: typeof row.credit_remaining_usd === 'number' ? row.credit_remaining_usd : null,
    creditLimitUsd: typeof row.credit_limit_usd === 'number' ? row.credit_limit_usd : null,
    creditUsedUsd: typeof row.credit_used_usd === 'number' ? row.credit_used_usd : null,
    billedCostUsd: typeof row.billed_cost_usd === 'number' ? row.billed_cost_usd : null,
    errorMessage: typeof row.error_message === 'string' ? row.error_message : null,
    updatedAtMs: Number(row.updated_at_ms ?? 0)
  };
}

function normalizeTurnForStorage(turn: UpsertTurnRecord): {
  inputTokens: number;
  cachedInputTokens: number;
  cachedInputMode: CachedInputConvention;
  reasoningMode: TokenReasoningConvention | null;
} {
  if (turn.cachedInputMode === 'separate' || turn.cachedInputTokens > turn.inputTokens) {
    const norm = normalizeTokenUsage({
      providerId: turn.providerId,
      model: turn.model,
      inputTokens: turn.inputTokens,
      cachedInputTokens: turn.cachedInputTokens,
      outputTokens: turn.outputTokens,
      reasoningOutputTokens: turn.reasoningOutputTokens,
      totalTokens: turn.hasExplicitTotal ? turn.totalTokens : undefined,
      cachedInputMode: turn.cachedInputMode ?? 'separate',
      reasoningMode: turn.reasoningMode
    });
    return {
      inputTokens: norm.inputTokens,
      cachedInputTokens: norm.cachedInputTokens,
      cachedInputMode: 'inclusive',
      reasoningMode: turn.reasoningMode ?? norm.reasoningMode
    };
  }
  return {
    inputTokens: Math.max(0, turn.inputTokens),
    cachedInputTokens: Math.max(0, turn.cachedInputTokens),
    cachedInputMode: 'inclusive',
    reasoningMode: turn.reasoningMode ?? null
  };
}

const UPSERT_TURN_SQL = `INSERT INTO usage_turns (
  id, turn_key, thread_id, provider_id, model, project_id, timestamp_ms, billing_mode,
  input_tokens, cached_input_tokens, output_tokens, reasoning_output_tokens, total_tokens,
  context_used_tokens, context_window_tokens, estimated_cost_usd, cost_formula, is_subagent,
  raw_json, has_explicit_total, cached_input_mode, reasoning_mode
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(turn_key) DO UPDATE SET
  provider_id = excluded.provider_id,
  model = excluded.model,
  project_id = excluded.project_id,
  timestamp_ms = excluded.timestamp_ms,
  billing_mode = excluded.billing_mode,
  input_tokens = excluded.input_tokens,
  cached_input_tokens = excluded.cached_input_tokens,
  output_tokens = excluded.output_tokens,
  reasoning_output_tokens = excluded.reasoning_output_tokens,
  total_tokens = excluded.total_tokens,
  context_used_tokens = COALESCE(excluded.context_used_tokens, usage_turns.context_used_tokens),
  context_window_tokens = COALESCE(excluded.context_window_tokens, usage_turns.context_window_tokens),
  estimated_cost_usd = excluded.estimated_cost_usd,
  cost_formula = excluded.cost_formula,
  is_subagent = excluded.is_subagent,
  raw_json = excluded.raw_json,
  has_explicit_total = excluded.has_explicit_total,
  cached_input_mode = excluded.cached_input_mode,
  reasoning_mode = excluded.reasoning_mode`;

const UPSERT_LOG_SQL = `INSERT INTO usage_events_log (
  id, event_key, timestamp_ms, kind, severity, provider_id, model, project_id, thread_id,
  summary, cost_usd, input_tokens, cached_input_tokens, output_tokens, reasoning_output_tokens,
  context_used_tokens, context_window_tokens, cost_formula, payload_json
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(event_key) DO UPDATE SET
  timestamp_ms = excluded.timestamp_ms,
  severity = excluded.severity,
  model = COALESCE(excluded.model, usage_events_log.model),
  summary = excluded.summary,
  cost_usd = excluded.cost_usd,
  input_tokens = COALESCE(excluded.input_tokens, usage_events_log.input_tokens),
  cached_input_tokens = COALESCE(excluded.cached_input_tokens, usage_events_log.cached_input_tokens),
  output_tokens = COALESCE(excluded.output_tokens, usage_events_log.output_tokens),
  reasoning_output_tokens = COALESCE(excluded.reasoning_output_tokens, usage_events_log.reasoning_output_tokens),
  context_used_tokens = COALESCE(excluded.context_used_tokens, usage_events_log.context_used_tokens),
  context_window_tokens = COALESCE(excluded.context_window_tokens, usage_events_log.context_window_tokens),
  cost_formula = COALESCE(excluded.cost_formula, usage_events_log.cost_formula),
  payload_json = excluded.payload_json`;

const UPSERT_QUOTA_SQL = `INSERT INTO provider_quota_snapshots (
  provider_id, display_name, source, status, account_label, plan_label, billing_mode,
  windows_json, credit_remaining_usd, credit_limit_usd, credit_used_usd, billed_cost_usd,
  error_message, updated_at_ms
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(provider_id) DO UPDATE SET
  display_name = excluded.display_name,
  source = excluded.source,
  status = excluded.status,
  account_label = COALESCE(excluded.account_label, provider_quota_snapshots.account_label),
  plan_label = COALESCE(excluded.plan_label, provider_quota_snapshots.plan_label),
  billing_mode = excluded.billing_mode,
  windows_json = excluded.windows_json,
  credit_remaining_usd = COALESCE(excluded.credit_remaining_usd, provider_quota_snapshots.credit_remaining_usd),
  credit_limit_usd = COALESCE(excluded.credit_limit_usd, provider_quota_snapshots.credit_limit_usd),
  credit_used_usd = COALESCE(excluded.credit_used_usd, provider_quota_snapshots.credit_used_usd),
  billed_cost_usd = COALESCE(excluded.billed_cost_usd, provider_quota_snapshots.billed_cost_usd),
  error_message = excluded.error_message,
  updated_at_ms = excluded.updated_at_ms`;

function repriceTurnRow(
  row: Record<string, unknown>,
  overrides: readonly ModelPricingRule[],
  providerModeOverrides: ReadonlyMap<string, BillingMode>
) {
  const cachedInputMode =
    row.cached_input_mode === 'separate' || row.cached_input_mode === 'inclusive'
      ? (row.cached_input_mode as CachedInputConvention)
      : undefined;
  const reasoningMode =
    row.reasoning_mode === 'separate' || row.reasoning_mode === 'inclusive'
      ? (row.reasoning_mode as TokenReasoningConvention)
      : undefined;
  return computeTurnCost(
    {
      providerId: String(row.provider_id),
      model: String(row.model),
      inputTokens: Number(row.input_tokens),
      cachedInputTokens: Number(row.cached_input_tokens),
      outputTokens: Number(row.output_tokens),
      reasoningOutputTokens: Number(row.reasoning_output_tokens),
      totalTokens: !reasoningMode && hasExplicitTurnTotal(row) ? Number(row.total_tokens) : undefined,
      cachedInputMode,
      reasoningMode
    },
    overrides,
    providerModeOverrides
  );
}

export function createUsageStore(db: PluginDatabase, now: () => number = Date.now) {
  db.migrate(MIGRATIONS);

  function upsertTurn(turn: UpsertTurnRecord): void {
    const normalized = normalizeTurnForStorage(turn);
    db.prepare(UPSERT_TURN_SQL).run(
      slugId('turn'), turn.turnKey, turn.threadId, turn.providerId, turn.model, turn.projectId,
      turn.timestampMs, turn.billingMode, normalized.inputTokens, normalized.cachedInputTokens,
      turn.outputTokens, turn.reasoningOutputTokens, turn.totalTokens, turn.contextUsedTokens,
      turn.contextWindowTokens, turn.estimatedCostUsd, turn.costFormula, turn.isSubagent ? 1 : 0,
      turn.rawJson, turn.hasExplicitTotal === undefined ? null : turn.hasExplicitTotal ? 1 : 0,
      normalized.cachedInputMode, normalized.reasoningMode
    );
  }

  function updateLatestThreadContext(threadId: string, usedTokens: number | null, windowTokens: number | null): void {
    if (usedTokens === null && windowTokens === null) return;
    const latest = db.prepare('SELECT id FROM usage_turns WHERE thread_id = ? ORDER BY timestamp_ms DESC LIMIT 1').get(threadId) as { id?: string } | undefined;
    if (latest?.id) {
      db.prepare('UPDATE usage_turns SET context_used_tokens = COALESCE(?, context_used_tokens), context_window_tokens = COALESCE(?, context_window_tokens) WHERE id = ?')
        .run(usedTokens, windowTokens, latest.id);
    }
    const latestLog = db.prepare("SELECT id FROM usage_events_log WHERE thread_id = ? AND kind = 'turn_usage' ORDER BY timestamp_ms DESC LIMIT 1").get(threadId) as { id?: string } | undefined;
    if (latestLog?.id) {
      db.prepare('UPDATE usage_events_log SET context_used_tokens = COALESCE(?, context_used_tokens), context_window_tokens = COALESCE(?, context_window_tokens) WHERE id = ?')
        .run(usedTokens, windowTokens, latestLog.id);
    }
  }

  function upsertLogEvent(entry: UpsertLogRecord): void {
    db.prepare(UPSERT_LOG_SQL).run(
      slugId('evt'), entry.eventKey, entry.timestampMs, entry.kind, entry.severity, entry.providerId,
      entry.model, entry.projectId, entry.threadId, entry.summary, entry.costUsd,
      entry.inputTokens ?? null, entry.cachedInputTokens ?? null, entry.outputTokens ?? null,
      entry.reasoningOutputTokens ?? null, entry.contextUsedTokens ?? null, entry.contextWindowTokens ?? null,
      entry.costFormula ?? null, entry.payloadJson
    );
  }

  function getThreadCursor(threadId: string): ThreadCursorRow | null {
    const row = db.prepare('SELECT * FROM thread_sync_cursors WHERE thread_id = ?').get(threadId) as Record<string, unknown> | undefined;
    return row ? mapThreadCursor(row) : null;
  }

  function listThreadCursors(): Map<string, ThreadCursorRow> {
    const rows = db.prepare('SELECT * FROM thread_sync_cursors').all() as Record<string, unknown>[];
    return new Map(rows.map((row) => { const c = mapThreadCursor(row); return [c.threadId, c]; }));
  }

  function saveThreadCursor(cursor: ThreadCursorRow): void {
    db.prepare(
      `INSERT INTO thread_sync_cursors (
        thread_id, last_seq, provider_id, model, project_id, is_subagent, last_total_json, updated_at_ms, thread_updated_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(thread_id) DO UPDATE SET
        last_seq = excluded.last_seq, provider_id = excluded.provider_id, model = excluded.model,
        project_id = excluded.project_id, is_subagent = excluded.is_subagent,
        last_total_json = excluded.last_total_json, updated_at_ms = excluded.updated_at_ms,
        thread_updated_at_ms = excluded.thread_updated_at_ms`
    ).run(cursor.threadId, cursor.lastSeq, cursor.providerId, cursor.model, cursor.projectId,
      cursor.isSubagent ? 1 : 0, cursor.lastTotalJson, cursor.updatedAtMs, cursor.threadUpdatedAtMs ?? 0);
  }

  function resetSyncCursors(): void {
    db.prepare('DELETE FROM thread_sync_cursors').run();
  }

  function upsertQuotaSnapshot(snapshot: UpsertQuotaRecord): void {
    db.prepare(UPSERT_QUOTA_SQL).run(
      snapshot.providerId, snapshot.displayName, snapshot.source, snapshot.status, snapshot.accountLabel,
      snapshot.planLabel, snapshot.billingMode, JSON.stringify(snapshot.windows), snapshot.creditRemainingUsd,
      snapshot.creditLimitUsd, snapshot.creditUsedUsd, snapshot.billedCostUsd, snapshot.errorMessage, snapshot.updatedAtMs
    );
  }

  function listQuotaSnapshots(): UpsertQuotaRecord[] {
    const rows = db.prepare('SELECT * FROM provider_quota_snapshots ORDER BY provider_id ASC').all() as Record<string, unknown>[];
    return rows.map(mapQuotaRow);
  }

  function aggregateSummary(sinceMs: number, untilMs?: number | null) {
    const filter = buildTimeRangeFilter(sinceMs, untilMs);
    const row = db.prepare(
      `SELECT COALESCE(SUM(estimated_cost_usd), 0) AS total_usd,
        COALESCE(SUM(CASE WHEN billing_mode = 'billed_api' THEN estimated_cost_usd ELSE 0 END), 0) AS billed_usd,
        COALESCE(SUM(CASE WHEN billing_mode = 'subscription' THEN estimated_cost_usd ELSE 0 END), 0) AS sub_usd,
        COALESCE(SUM(input_tokens), 0) AS input_tokens, COALESCE(SUM(cached_input_tokens), 0) AS cached_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS output_tokens, COALESCE(SUM(reasoning_output_tokens), 0) AS reasoning_output_tokens,
        COALESCE(SUM(total_tokens), 0) AS total_tokens, COUNT(*) AS turn_count, COALESCE(SUM(is_subagent), 0) AS subagent_count
       FROM usage_turns WHERE ${filter.sql}`
    ).get(...filter.params) as Record<string, unknown>;
    return {
      totalValueUsd: Number(row?.total_usd ?? 0), billedSpendUsd: Number(row?.billed_usd ?? 0),
      subscriptionEquivUsd: Number(row?.sub_usd ?? 0), inputTokens: Number(row?.input_tokens ?? 0),
      cachedInputTokens: Number(row?.cached_input_tokens ?? 0), outputTokens: Number(row?.output_tokens ?? 0),
      reasoningOutputTokens: Number(row?.reasoning_output_tokens ?? 0), totalTokens: Number(row?.total_tokens ?? 0),
      turnCount: Number(row?.turn_count ?? 0), subagentTurnCount: Number(row?.subagent_count ?? 0)
    };
  }

  function aggregateByProvider(sinceMs: number, untilMs?: number | null) {
    const filter = buildTimeRangeFilter(sinceMs, untilMs);
    const rows = db.prepare(
      `SELECT provider_id, COALESCE(SUM(total_tokens), 0) AS total_tokens,
        COALESCE(SUM(cached_input_tokens), 0) AS cached_tokens, COUNT(*) AS turn_count,
        COALESCE(SUM(estimated_cost_usd), 0) AS est_usd,
        COALESCE(SUM(CASE WHEN billing_mode = 'billed_api' THEN estimated_cost_usd ELSE 0 END), 0) AS billed_usd
       FROM usage_turns WHERE ${filter.sql} GROUP BY provider_id`
    ).all(...filter.params) as Record<string, unknown>[];
    return new Map(rows.map((row) => [String(row.provider_id), {
      totalTokens: Number(row.total_tokens ?? 0), cachedTokens: Number(row.cached_tokens ?? 0),
      turnCount: Number(row.turn_count ?? 0), estimatedCostUsd: Number(row.est_usd ?? 0),
      billedCostUsd: Number(row.billed_usd ?? 0)
    }]));
  }

  function listModelBreakdown(
    sinceMs: number,
    overrides: readonly ModelPricingRule[],
    untilMs?: number | null,
    providerModeOverrides: ReadonlyMap<string, BillingMode> = new Map()
  ): ModelConsumptionRow[] {
    const filter = buildTimeRangeFilter(sinceMs, untilMs);
    const rows = db.prepare(
      `SELECT provider_id, model, MAX(billing_mode) AS billing_mode, COUNT(*) AS turn_count,
        COALESCE(SUM(is_subagent), 0) AS subagent_count, COALESCE(SUM(input_tokens), 0) AS input_tokens,
        COALESCE(SUM(cached_input_tokens), 0) AS cached_input_tokens, COALESCE(SUM(output_tokens), 0) AS output_tokens,
        COALESCE(SUM(reasoning_output_tokens), 0) AS reasoning_output_tokens,
        COALESCE(SUM(total_tokens), 0) AS total_tokens, COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd
       FROM usage_turns WHERE ${filter.sql} GROUP BY provider_id, model ORDER BY estimated_cost_usd DESC, total_tokens DESC`
    ).all(...filter.params) as Record<string, unknown>[];

    return rows.map((row) => {
      const providerId = String(row.provider_id);
      const model = String(row.model);
      const inputTokens = Number(row.input_tokens ?? 0);
      const cachedInputTokens = Number(row.cached_input_tokens ?? 0);
      const pricing = resolveModelPricing(providerId, model, overrides, providerModeOverrides);
      return {
        providerId, model, billingMode: (String(row.billing_mode) as BillingMode) || pricing.billingMode,
        turnCount: Number(row.turn_count ?? 0), subagentTurnCount: Number(row.subagent_count ?? 0),
        inputTokens, cachedInputTokens, outputTokens: Number(row.output_tokens ?? 0),
        reasoningOutputTokens: Number(row.reasoning_output_tokens ?? 0), totalTokens: Number(row.total_tokens ?? 0),
        cacheHitPercent: computeCacheHitPercent(inputTokens, cachedInputTokens),
        inputRatePer1M: pricing.inputPer1M, cachedInputRatePer1M: pricing.cachedInputPer1M,
        outputRatePer1M: pricing.outputPer1M, estimatedCostUsd: Number(Number(row.estimated_cost_usd ?? 0).toFixed(4))
      };
    });
  }

  function listProjectBreakdown(
    sinceMs: number,
    projectNames: ReadonlyMap<string, string>,
    untilMs?: number | null
  ): ProjectConsumptionRow[] {
    const filter = buildTimeRangeFilter(sinceMs, untilMs);
    const rows = db.prepare(
      `SELECT project_id, COUNT(*) AS turn_count, COALESCE(SUM(is_subagent), 0) AS subagent_count,
        COALESCE(SUM(input_tokens), 0) AS input_tokens, COALESCE(SUM(cached_input_tokens), 0) AS cached_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS output_tokens, COALESCE(SUM(total_tokens), 0) AS total_tokens,
        COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd,
        COALESCE(SUM(CASE WHEN billing_mode = 'billed_api' THEN estimated_cost_usd ELSE 0 END), 0) AS billed_cost_usd,
        COALESCE(SUM(CASE WHEN billing_mode = 'subscription' THEN estimated_cost_usd ELSE 0 END), 0) AS sub_equiv_usd
       FROM usage_turns WHERE ${filter.sql} GROUP BY project_id ORDER BY estimated_cost_usd DESC, total_tokens DESC`
    ).all(...filter.params) as Record<string, unknown>[];
    const topRows = db.prepare(
      `WITH ranked AS (
        SELECT project_id, provider_id, model,
          ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY SUM(estimated_cost_usd) DESC, SUM(total_tokens) DESC) AS rn
        FROM usage_turns WHERE ${filter.sql} GROUP BY project_id, provider_id, model
      ) SELECT project_id, provider_id, model FROM ranked WHERE rn = 1`
    ).all(...filter.params) as Array<{ project_id?: string; provider_id?: string; model?: string }>;
    const topByProject = new Map(topRows.map((r) => [String(r.project_id ?? ''), { providerId: r.provider_id ?? null, model: r.model ?? null }]));
    return rows.map((row) => {
      const projectId = String(row.project_id);
      const top = topByProject.get(projectId);
      return {
        projectId, projectName: projectNames.get(projectId) ?? (projectId || 'Unassigned'),
        turnCount: Number(row.turn_count ?? 0), subagentTurnCount: Number(row.subagent_count ?? 0),
        inputTokens: Number(row.input_tokens ?? 0), cachedInputTokens: Number(row.cached_input_tokens ?? 0),
        outputTokens: Number(row.output_tokens ?? 0), totalTokens: Number(row.total_tokens ?? 0),
        estimatedCostUsd: Number(Number(row.estimated_cost_usd ?? 0).toFixed(4)),
        billedCostUsd: Number(Number(row.billed_cost_usd ?? 0).toFixed(4)),
        subscriptionEquivUsd: Number(Number(row.sub_equiv_usd ?? 0).toFixed(4)),
        topProviderId: top?.providerId ?? null, topModel: top?.model ?? null
      };
    });
  }

  function listDailyTrend(range: TimeRangeKey): DailySpendPoint[] {
    const effectiveRange: TimeRangeKey = range === 'today' ? '7d' : range;
    const bounds = resolveTimeRangeBounds(effectiveRange, now());
    const filter = buildTimeRangeFilter(bounds.startMs, bounds.endMs);
    const rows = db.prepare(`SELECT timestamp_ms, provider_id, estimated_cost_usd, total_tokens FROM usage_turns WHERE ${filter.sql} ORDER BY timestamp_ms ASC`)
      .all(...filter.params) as Record<string, unknown>[];
    const buckets = new Map<string, DailySpendPoint>();
    for (const row of rows) {
      const date = localDateKey(Number(row.timestamp_ms ?? 0));
      const prov = String(row.provider_id);
      const usd = Number(row.estimated_cost_usd ?? 0);
      const tok = Number(row.total_tokens ?? 0);
      let point = buckets.get(date);
      if (!point) {
        point = { date, byProviderUsd: {}, byProviderTokens: {}, totalUsd: 0, totalTokens: 0 };
        buckets.set(date, point);
      }
      point.byProviderUsd[prov] = Number(((point.byProviderUsd[prov] ?? 0) + usd).toFixed(6));
      point.byProviderTokens[prov] = (point.byProviderTokens[prov] ?? 0) + tok;
      point.totalUsd = Number((point.totalUsd + usd).toFixed(4));
      point.totalTokens += tok;
    }
    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  function computeMetricInWindow(args: { sinceMs: number; scopeType: BudgetScopeType; scopeId: string; metric: BudgetMetric }): number {
    const { clauses, params, col } = buildMetricFilter(args);
    const row = db.prepare(`SELECT COALESCE(SUM(${col}), 0) AS total FROM usage_turns WHERE ${clauses.join(' AND ')}`).get(...params) as { total?: number } | undefined;
    return Number(row?.total ?? 0);
  }

  function findTopProjectInWindow(args: { sinceMs: number; scopeType: BudgetScopeType; scopeId: string; metric: BudgetMetric }): string | null {
    const { clauses, params, col } = buildMetricFilter(args);
    const scopedRow = db.prepare(
      `SELECT project_id FROM usage_turns WHERE ${clauses.join(' AND ')} AND project_id <> ''
       GROUP BY project_id ORDER BY COALESCE(SUM(${col}), 0) DESC, COALESCE(SUM(total_tokens), 0) DESC LIMIT 1`
    ).get(...params) as { project_id?: string } | undefined;
    return scopedRow?.project_id ?? null;
  }

  function listBudgets(): BudgetRule[] {
    return (db.prepare('SELECT * FROM budgets ORDER BY created_at_ms ASC').all() as Record<string, unknown>[]).map(mapBudgetRow);
  }

  function upsertBudget(input: BudgetRuleInput): BudgetRule {
    if (!Number.isFinite(input.limitValue) || input.limitValue <= 0) {
      throw new Error('Budget limitValue must be greater than 0.');
    }
    if (!Number.isFinite(input.alertThresholdPct) || input.alertThresholdPct <= 0 || input.alertThresholdPct > 100) {
      throw new Error('Budget alertThresholdPct must be greater than 0 and at most 100.');
    }
    const scopeId = input.scopeType === 'global' ? '' : (input.scopeId ?? '').trim();
    if (input.scopeType !== 'global' && !scopeId) {
      throw new Error(`Budget scopeId is required when scopeType is "${input.scopeType}".`);
    }
    const id = input.id && input.id.trim() ? input.id.trim() : slugId('budget');
    const createdAtMs = now();
    const name = input.name.trim();
    db.prepare(
      `INSERT INTO budgets (id, name, scope_type, scope_id, period, metric, limit_value, alert_threshold_pct, enabled, created_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, scope_type = excluded.scope_type, scope_id = excluded.scope_id,
        period = excluded.period, metric = excluded.metric, limit_value = excluded.limit_value,
        alert_threshold_pct = excluded.alert_threshold_pct, enabled = excluded.enabled`
    ).run(id, name, input.scopeType, scopeId, input.period, input.metric, input.limitValue, input.alertThresholdPct, input.enabled ? 1 : 0, createdAtMs);
    return listBudgets().find((row) => row.id === id) ?? {
      id, name, scopeType: input.scopeType, scopeId, period: input.period, metric: input.metric,
      limitValue: input.limitValue, alertThresholdPct: input.alertThresholdPct, enabled: input.enabled, createdAtMs
    };
  }

  function deleteBudget(id: string): boolean {
    return db.prepare('DELETE FROM budgets WHERE id = ?').run(id).changes > 0;
  }

  function hasAlertBeenSent(budgetId: string, periodKey: string, level: string): boolean {
    const row = db.prepare('SELECT 1 AS ok FROM budget_alerts_sent WHERE budget_id = ? AND period_key = ? AND level = ?')
      .get(budgetId, periodKey, level) as { ok?: number } | undefined;
    return row?.ok === 1;
  }

  function markAlertSent(budgetId: string, periodKey: string, level: string): void {
    db.prepare('INSERT OR IGNORE INTO budget_alerts_sent (budget_id, period_key, level, sent_at_ms) VALUES (?, ?, ?, ?)')
      .run(budgetId, periodKey, level, now());
  }

  function listPricingOverrides(): ModelPricingRule[] {
    const rows = db.prepare('SELECT * FROM model_pricing_overrides ORDER BY updated_at_ms DESC').all() as Record<string, unknown>[];
    return rows.map((row) => ({
      pattern: String(row.pattern), inputPer1M: Number(row.input_per_1m ?? 0), cachedInputPer1M: Number(row.cached_input_per_1m ?? 0),
      outputPer1M: Number(row.output_per_1m ?? 0), reasoningPer1M: Number(row.reasoning_per_1m ?? 0),
      billingMode: typeof row.billing_mode === 'string' ? (row.billing_mode as BillingMode) : null, isOverride: true
    }));
  }

  function upsertPricingOverride(rule: Omit<ModelPricingRule, 'isOverride'>): ModelPricingRule {
    db.prepare(
      `INSERT INTO model_pricing_overrides (pattern, input_per_1m, cached_input_per_1m, output_per_1m, reasoning_per_1m, billing_mode, updated_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(pattern) DO UPDATE SET input_per_1m = excluded.input_per_1m, cached_input_per_1m = excluded.cached_input_per_1m,
        output_per_1m = excluded.output_per_1m, reasoning_per_1m = excluded.reasoning_per_1m, billing_mode = excluded.billing_mode, updated_at_ms = excluded.updated_at_ms`
    ).run(rule.pattern.trim(), rule.inputPer1M, rule.cachedInputPer1M, rule.outputPer1M, rule.reasoningPer1M, rule.billingMode, now());
    return { ...rule, pattern: rule.pattern.trim(), isOverride: true };
  }

  function deletePricingOverride(pattern: string): boolean {
    return db.prepare('DELETE FROM model_pricing_overrides WHERE pattern = ?').run(pattern).changes > 0;
  }

  function repriceTurns(providerModeOverrides: ReadonlyMap<string, BillingMode>): void {
    const overrides = listPricingOverrides();
    const updateTurn = db.prepare('UPDATE usage_turns SET estimated_cost_usd = ?, cost_formula = ?, billing_mode = ? WHERE id = ?');
    const updateLog = db.prepare('UPDATE usage_events_log SET cost_usd = ?, cost_formula = ? WHERE event_key = ?');
    let afterId = '';
    while (true) {
      const rows = db.prepare('SELECT * FROM usage_turns WHERE id > ? ORDER BY id LIMIT ?').all(afterId, REPRICE_BATCH_SIZE) as Record<string, unknown>[];
      if (rows.length === 0) return;
      db.transaction(() => {
        for (const row of rows) {
          const cost = repriceTurnRow(row, overrides, providerModeOverrides);
          updateTurn.run(cost.estimatedCostUsd, cost.formula, cost.pricing.billingMode, row.id);
          updateLog.run(cost.estimatedCostUsd, cost.formula, `turn_usage:${row.turn_key}`);
        }
      });
      afterId = String(rows[rows.length - 1].id);
    }
  }

  function queryLogs(
    query: LogsQuery,
    projectNames: ReadonlyMap<string, string>
  ): { items: UsageLogEntry[]; totalCount: number; countsByKind: Record<LogEventKind, number> } {
    const { nonKindWhereSql, nonKindParams, whereSql, params } = buildLogFilterParts(query);
    const rawLimit = typeof query.limit === 'number' && Number.isFinite(query.limit) ? Math.floor(query.limit) : 50;
    const rawOffset = typeof query.offset === 'number' && Number.isFinite(query.offset) ? Math.floor(query.offset) : 0;
    const limit = Math.max(1, Math.min(200, rawLimit));
    const offset = Math.max(0, rawOffset);

    const rows = db.prepare(`SELECT * FROM usage_events_log ${whereSql} ORDER BY timestamp_ms DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Record<string, unknown>[];
    const countRow = db.prepare(`SELECT COUNT(*) AS cnt FROM usage_events_log ${whereSql}`).get(...params) as { cnt?: number } | undefined;
    const kindRows = db.prepare(`SELECT kind, COUNT(*) AS cnt FROM usage_events_log ${nonKindWhereSql} GROUP BY kind`)
      .all(...nonKindParams) as Array<{ kind?: string; cnt?: number }>;

    const countsByKind: Record<LogEventKind, number> = { turn_usage: 0, rate_limit: 0, fallback: 0, error: 0 };
    for (const kr of kindRows) {
      if (kr.kind && kr.kind in countsByKind) countsByKind[kr.kind as LogEventKind] = Number(kr.cnt ?? 0);
    }
    const items = rows.map((row) => mapLogRow(row, projectNames));
    return { items, totalCount: Number(countRow?.cnt ?? items.length), countsByKind };
  }

  return {
    upsertTurn, updateLatestThreadContext, upsertLogEvent, getThreadCursor, listThreadCursors, saveThreadCursor,
    resetSyncCursors, upsertQuotaSnapshot, listQuotaSnapshots, aggregateSummary, aggregateByProvider,
    listModelBreakdown, listProjectBreakdown, listDailyTrend, computeMetricInWindow, findTopProjectInWindow,
    listBudgets, upsertBudget, deleteBudget, hasAlertBeenSent, markAlertSent,
    listPricingOverrides, upsertPricingOverride, deletePricingOverride, repriceTurns, queryLogs
  };
}

export type UsageStore = ReturnType<typeof createUsageStore>;
