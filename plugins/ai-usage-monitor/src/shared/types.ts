export type TimeRangeKey = 'today' | '7d' | '30d' | 'all';

export type BillingMode = 'billed_api' | 'subscription' | 'free';

export type QuotaWindowStatus = 'allowed' | 'warning' | 'blocked' | 'unknown';

export type ProviderQuotaStatus =
  | 'ok'
  | 'warning'
  | 'blocked'
  | 'unauthenticated'
  | 'expired'
  | 'not_installed'
  | 'unknown'
  | 'error';

export interface QuotaWindow {
  key: string;
  label: string;
  usedPercent: number | null;
  remainingPercent: number | null;
  status: QuotaWindowStatus;
  resetsAtIso: string | null;
  usedUsdCents?: number | null;
  limitUsdCents?: number | null;
}

export interface ProviderQuotaSnapshot {
  providerId: string;
  displayName: string;
  available: boolean;
  source: string;
  status: ProviderQuotaStatus;
  accountLabel: string | null;
  planLabel: string | null;
  billingMode: BillingMode;
  windows: QuotaWindow[];
  creditRemainingUsd: number | null;
  creditLimitUsd: number | null;
  creditUsedUsd: number | null;
  errorMessage: string | null;
  configuredModels: string[];
  totalTokens: number;
  cachedTokens: number;
  turnCount: number;
  estimatedCostUsd: number;
  billedCostUsd: number | null;
  updatedAtMs: number;
}

export interface ModelConsumptionRow {
  providerId: string;
  model: string;
  billingMode: BillingMode;
  turnCount: number;
  subagentTurnCount: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  cacheHitPercent: number;
  inputRatePer1M: number;
  cachedInputRatePer1M: number;
  outputRatePer1M: number;
  estimatedCostUsd: number;
}

export interface ProjectConsumptionRow {
  projectId: string;
  projectName: string;
  turnCount: number;
  subagentTurnCount: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  billedCostUsd: number;
  subscriptionEquivUsd: number;
  topProviderId: string | null;
  topModel: string | null;
}

export interface DailySpendPoint {
  date: string;
  byProviderUsd: Record<string, number>;
  byProviderTokens: Record<string, number>;
  totalUsd: number;
  totalTokens: number;
}

export type BudgetScopeType = 'global' | 'provider' | 'model' | 'project';
export type BudgetPeriod = '5h' | 'daily' | 'weekly' | 'monthly';
export type BudgetMetric = 'billed_usd' | 'total_usd' | 'tokens';

export interface BudgetRuleInput {
  id?: string;
  name: string;
  scopeType: BudgetScopeType;
  scopeId?: string | null;
  period: BudgetPeriod;
  metric: BudgetMetric;
  limitValue: number;
  alertThresholdPct: number;
  enabled: boolean;
}

export interface BudgetRule extends BudgetRuleInput {
  id: string;
  scopeId: string;
  createdAtMs: number;
}

export interface BudgetEvaluation {
  rule: BudgetRule;
  currentValue: number;
  limitValue: number;
  remainingValue: number;
  percentUsed: number;
  status: 'ok' | 'warning' | 'exceeded';
  periodKey: string;
  resetsAtMs: number | null;
}

export type LogEventKind = 'turn_usage' | 'rate_limit' | 'fallback' | 'error';
export type LogSeverity = 'info' | 'warning' | 'error';

export interface UsageLogEntry {
  id: string;
  timestampMs: number;
  kind: LogEventKind;
  severity: LogSeverity;
  providerId: string;
  model: string | null;
  projectId: string | null;
  projectName: string | null;
  threadId: string | null;
  summary: string;
  costUsd: number | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningOutputTokens: number | null;
  contextUsedTokens: number | null;
  contextWindowTokens: number | null;
  costFormula: string | null;
  payload: Record<string, unknown>;
}

export interface ModelPricingRule {
  pattern: string;
  inputPer1M: number;
  cachedInputPer1M: number;
  outputPer1M: number;
  reasoningPer1M: number;
  billingMode: BillingMode | null;
  isOverride: boolean;
}

export interface DashboardKpis {
  range: TimeRangeKey;
  totalValueUsd: number;
  billedSpendUsd: number;
  subscriptionEquivUsd: number;
  cloudCreditsRemainingUsd: number | null;
  cloudCreditsTotalLimitUsd: number | null;
  totalTokens: number;
  cachedInputTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  cacheHitPercent: number;
  turnCount: number;
  subagentTurnCount: number;
  tightestQuota: {
    providerId: string;
    displayName: string;
    windowLabel: string;
    remainingPercent: number;
    resetsAtIso: string | null;
  } | null;
  alertCount: number;
  logCount: number;
}

export interface CloudConnectorStatus {
  provider: 'openai' | 'anthropic' | 'openrouter';
  configured: boolean;
  status: 'ok' | 'unconfigured' | 'error';
  lastSyncedAtMs: number | null;
  reportedSpendUsd: number | null;
  creditRemainingUsd: number | null;
  creditLimitUsd: number | null;
  errorMessage: string | null;
}

export interface DashboardPayload {
  kpis: DashboardKpis;
  providers: ProviderQuotaSnapshot[];
  models: ModelConsumptionRow[];
  projects: ProjectConsumptionRow[];
  dailyTrend: DailySpendPoint[];
  budgets: BudgetEvaluation[];
  pricingRules: ModelPricingRule[];
  cloudConnectors: CloudConnectorStatus[];
  lastSyncedAtMs: number;
  isSyncing?: boolean;
}

export interface LogsQuery {
  kind?: LogEventKind | 'all';
  providerId?: string;
  projectId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LogsResponse {
  items: UsageLogEntry[];
  totalCount: number;
  countsByKind: Record<LogEventKind, number>;
}

export const REALTIME_CHANNEL = 'usage.updated';

export const RPC_METHODS = {
  dashboard: 'dashboard',
  logs: 'logs',
  refreshNow: 'refreshNow',
  setBudget: 'setBudget',
  deleteBudget: 'deleteBudget',
  setPricingOverride: 'setPricingOverride',
  deletePricingOverride: 'deletePricingOverride',
  resetSync: 'resetSync'
} as const;
