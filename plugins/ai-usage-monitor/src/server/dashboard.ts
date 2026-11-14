import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import { DEFAULT_PROVIDER_ORDER, sortProviders } from '../shared/provider-order.ts';
import type {
  BillingMode,
  BudgetEvaluation,
  CloudConnectorStatus,
  DashboardKpis,
  DashboardPayload,
  OpenCodeLocalStatsSnapshot,
  ProviderOrderPrefs,
  ProviderQuotaSnapshot,
  QuotaWindow,
  TimeRangeBounds,
  TimeRangeKey
} from '../shared/types.ts';
import type { BudgetEvaluator } from './budgets.ts';
import { expireStaleQuotaWindows } from './collectors/local-provider-usage.ts';
import type { DiscoveredProviderModels } from './collectors/zcc-quotas.ts';
import type { UpsertQuotaRecord, UsageStore } from './db.ts';
import { inferDefaultBillingMode, listCombinedPricingRules } from './pricing.ts';
import { computeCacheHitPercent, errorMessage, resolveTimeRangeBounds, withTimeout } from './util.ts';

export interface DashboardServiceDeps {
  store: UsageStore;
  budgets: BudgetEvaluator;
  projects: Pick<ZccPluginApi['sdk']['projects'], 'list'>;
  getDiscoveredProviders: () => DiscoveredProviderModels[];
  getCloudStatuses: () => CloudConnectorStatus[];
  getOpenCodeLocalStats?: () => OpenCodeLocalStatsSnapshot | null;
  getProviderOrder?: () => ProviderOrderPrefs;
  getProviderModeOverrides?: () => ReadonlyMap<string, BillingMode>;
  getLastSyncedAtMs: () => number;
  getIsSyncing?: () => boolean;
  log?: Pick<ZccPluginApi['log'], 'warn'>;
  now?: () => number;
}

interface ProviderUsageAggregate {
  totalTokens: number;
  cachedTokens: number;
  turnCount: number;
  estimatedCostUsd: number;
  billedCostUsd: number;
}

function findTightestWindow(providers: readonly ProviderQuotaSnapshot[]): DashboardKpis['tightestQuota'] {
  let tightest: { providerId: string; displayName: string; window: QuotaWindow } | null = null;
  for (const prov of providers) {
    if (!prov.available || prov.billingMode !== 'subscription' || prov.status === 'not_installed') continue;
    for (const win of prov.windows) {
      if (win.remainingPercent === null || win.status === 'unknown') continue;
      if (!tightest || win.remainingPercent < (tightest.window.remainingPercent ?? 100)) {
        tightest = { providerId: prov.providerId, displayName: prov.displayName, window: win };
      }
    }
  }
  if (!tightest || tightest.window.remainingPercent === null) return null;
  return {
    providerId: tightest.providerId,
    displayName: tightest.displayName,
    windowLabel: tightest.window.label,
    remainingPercent: tightest.window.remainingPercent,
    resetsAtIso: tightest.window.resetsAtIso
  };
}

function buildProviderSnapshot(args: {
  providerId: string;
  snap: UpsertQuotaRecord | undefined;
  disc: DiscoveredProviderModels | undefined;
  agg: ProviderUsageAggregate | undefined;
  modeOverrides: ReadonlyMap<string, BillingMode> | undefined;
  currentNowMs: number;
}): ProviderQuotaSnapshot {
  const { providerId, snap, disc, agg, modeOverrides, currentNowMs } = args;
  const billingMode: BillingMode =
    snap?.billingMode ?? modeOverrides?.get(providerId.toLowerCase()) ?? inferDefaultBillingMode(providerId, '');
  const normalized =
    snap && snap.source === 'thread-events'
      ? expireStaleQuotaWindows(snap.windows, snap.status, snap.errorMessage, currentNowMs)
      : null;
  const isCloudConfiguredOpenCode =
    snap?.source === 'opencode-go-usage' || snap?.source === 'opencode-console-api';
  return {
    providerId,
    displayName: snap?.displayName ?? disc?.displayName ?? providerId,
    available: disc?.available ?? isCloudConfiguredOpenCode,
    source: snap?.source ?? 'telemetry',
    status: normalized?.status ?? snap?.status ?? 'ok',
    accountLabel: snap?.accountLabel ?? null,
    planLabel: snap?.planLabel ?? null,
    billingMode,
    windows: normalized?.windows ?? snap?.windows ?? [],
    creditRemainingUsd: snap?.creditRemainingUsd ?? null,
    creditLimitUsd: snap?.creditLimitUsd ?? null,
    creditUsedUsd: snap?.creditUsedUsd ?? null,
    errorMessage: normalized ? normalized.errorMessage : (snap?.errorMessage ?? null),
    configuredModels: disc?.models ?? [],
    totalTokens: agg?.totalTokens ?? 0,
    cachedTokens: agg?.cachedTokens ?? 0,
    turnCount: agg?.turnCount ?? 0,
    estimatedCostUsd: Number((agg?.estimatedCostUsd ?? 0).toFixed(4)),
    billedCostUsd: snap?.billedCostUsd ?? (agg && billingMode === 'billed_api' ? Number(agg.billedCostUsd.toFixed(4)) : null),
    updatedAtMs: snap?.updatedAtMs ?? 0
  };
}

function sumCloudCredits(providers: readonly ProviderQuotaSnapshot[]): { remaining: number | null; limit: number | null } {
  let remaining = 0;
  let limit = 0;
  let hasCredits = false;
  for (const prov of providers) {
    if (prov.creditRemainingUsd !== null) {
      remaining += prov.creditRemainingUsd;
      limit += prov.creditLimitUsd ?? prov.creditRemainingUsd;
      hasCredits = true;
    }
  }
  return {
    remaining: hasCredits ? Number(remaining.toFixed(2)) : null,
    limit: hasCredits ? Number(limit.toFixed(2)) : null
  };
}

function buildDashboardKpis(args: {
  range: TimeRangeKey;
  bounds: TimeRangeBounds;
  summary: ReturnType<UsageStore['aggregateSummary']>;
  providers: readonly ProviderQuotaSnapshot[];
  budgets: readonly BudgetEvaluation[];
  logCount: number;
}): DashboardKpis {
  const credits = sumCloudCredits(args.providers);
  const budgetAlerts = args.budgets.filter((b) => b.rule.enabled && b.status !== 'ok').length;
  const providerAlerts = args.providers.filter(
    (p) => ['warning', 'blocked', 'error', 'unauthenticated', 'expired'].includes(p.status)
  ).length;
  return {
    range: args.range,
    rangeBounds: args.bounds,
    totalValueUsd: Number(args.summary.totalValueUsd.toFixed(2)),
    billedSpendUsd: Number(args.summary.billedSpendUsd.toFixed(2)),
    subscriptionEquivUsd: Number(args.summary.subscriptionEquivUsd.toFixed(2)),
    cloudCreditsRemainingUsd: credits.remaining,
    cloudCreditsTotalLimitUsd: credits.limit,
    totalTokens: args.summary.totalTokens,
    cachedInputTokens: args.summary.cachedInputTokens,
    inputTokens: args.summary.inputTokens,
    outputTokens: args.summary.outputTokens,
    reasoningOutputTokens: args.summary.reasoningOutputTokens,
    cacheHitPercent: computeCacheHitPercent(args.summary.inputTokens, args.summary.cachedInputTokens),
    turnCount: args.summary.turnCount,
    subagentTurnCount: args.summary.subagentTurnCount,
    tightestQuota: findTightestWindow(args.providers),
    alertCount: budgetAlerts + providerAlerts,
    logCount: args.logCount
  };
}

function reconcileProviders(
  deps: DashboardServiceDeps,
  bounds: TimeRangeBounds,
  currentNowMs: number,
  modeOverrides: ReadonlyMap<string, BillingMode> | undefined
): ProviderQuotaSnapshot[] {
  const providerUsage = deps.store.aggregateByProvider(bounds.startMs, bounds.endMs);
  const discovered = deps.getDiscoveredProviders();
  const discoveredMap = new Map(discovered.map((d) => [d.providerId, d]));
  const snapshots = deps.store.listQuotaSnapshots();
  const snapMap = new Map(snapshots.map((s) => [s.providerId, s]));
  const allProviderIds = new Set<string>([
    ...snapshots.map((s) => s.providerId),
    ...discovered.map((d) => d.providerId),
    ...providerUsage.keys()
  ]);
  return [...allProviderIds].map((providerId) =>
    buildProviderSnapshot({
      providerId,
      snap: snapMap.get(providerId),
      disc: discoveredMap.get(providerId),
      agg: providerUsage.get(providerId),
      modeOverrides,
      currentNowMs
    })
  );
}

async function loadProjectNamesMap(deps: DashboardServiceDeps): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const list = await withTimeout(deps.projects.list(), 3000, 'projects.list');
    for (const proj of list) map.set(proj.id, proj.name);
  } catch (err) {
    deps.log?.warn(`ai-usage-monitor: failed loading project names: ${errorMessage(err)}`);
  }
  return map;
}

function assembleDashboardPayload(
  deps: DashboardServiceDeps,
  range: TimeRangeKey,
  currentNowMs: number,
  projectMap: ReadonlyMap<string, string>
): DashboardPayload {
  const bounds = resolveTimeRangeBounds(range, currentNowMs);
  const summary = deps.store.aggregateSummary(bounds.startMs, bounds.endMs);
  const overrides = deps.store.listPricingOverrides();
  const modeOverrides = deps.getProviderModeOverrides?.();
  const providerOrder = deps.getProviderOrder?.() ?? DEFAULT_PROVIDER_ORDER;
  const sortedProviders = sortProviders(reconcileProviders(deps, bounds, currentNowMs, modeOverrides), providerOrder);
  const budgets = deps.budgets.evaluateAll();
  const logsMeta = deps.store.queryLogs({ limit: 1 }, projectMap);
  return {
    kpis: buildDashboardKpis({ range, bounds, summary, providers: sortedProviders, budgets, logCount: logsMeta.totalCount }),
    providers: sortedProviders,
    providerOrder,
    models: deps.store.listModelBreakdown(bounds.startMs, overrides, bounds.endMs, modeOverrides),
    projects: deps.store.listProjectBreakdown(bounds.startMs, projectMap, bounds.endMs),
    dailyTrend: deps.store.listDailyTrend(range),
    budgets,
    pricingRules: listCombinedPricingRules(overrides),
    cloudConnectors: deps.getCloudStatuses(),
    opencodeLocal: deps.getOpenCodeLocalStats?.() ?? null,
    lastSyncedAtMs: deps.getLastSyncedAtMs(),
    isSyncing: deps.getIsSyncing?.() ?? false
  };
}

export function createDashboardService(deps: DashboardServiceDeps) {
  const now = deps.now ?? Date.now;
  const projectNamesMap = () => loadProjectNamesMap(deps);
  async function buildDashboard(range: TimeRangeKey = '30d'): Promise<DashboardPayload> {
    const projectMap = await projectNamesMap();
    return assembleDashboardPayload(deps, range, now(), projectMap);
  }
  return { buildDashboard, projectNamesMap };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
