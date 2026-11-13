import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import { DEFAULT_PROVIDER_ORDER, sortProviders } from '../shared/provider-order.ts';
import type {
  BillingMode,
  CloudConnectorStatus,
  DashboardKpis,
  DashboardPayload,
  OpenCodeLocalStatsSnapshot,
  ProviderOrderPrefs,
  ProviderQuotaSnapshot,
  QuotaWindow,
  TimeRangeKey
} from '../shared/types.ts';
import type { BudgetEvaluator } from './budgets.ts';
import { expireStaleQuotaWindows } from './collectors/local-provider-usage.ts';
import type { DiscoveredProviderModels } from './collectors/zcc-quotas.ts';
import type { UsageStore } from './db.ts';
import { listCombinedPricingRules } from './pricing.ts';
import { computeCacheHitPercent, resolveTimeRangeBounds, withTimeout } from './util.ts';

export interface DashboardServiceDeps {
  store: UsageStore;
  budgets: BudgetEvaluator;
  projects: Pick<ZccPluginApi['sdk']['projects'], 'list'>;
  getDiscoveredProviders: () => DiscoveredProviderModels[];
  getCloudStatuses: () => CloudConnectorStatus[];
  getOpenCodeLocalStats?: () => OpenCodeLocalStatsSnapshot | null;
  getProviderOrder?: () => ProviderOrderPrefs;
  getLastSyncedAtMs: () => number;
  getIsSyncing?: () => boolean;
  now?: () => number;
}

function findTightestWindow(providers: readonly ProviderQuotaSnapshot[]): DashboardKpis['tightestQuota'] {
  let tightest: {
    providerId: string;
    displayName: string;
    window: QuotaWindow;
  } | null = null;

  for (const prov of providers) {
    for (const win of prov.windows) {
      if (win.remainingPercent === null) continue;
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

export function createDashboardService(deps: DashboardServiceDeps) {
  const now = deps.now ?? Date.now;

  async function projectNamesMap(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    try {
      const list = await withTimeout(deps.projects.list(), 3000, 'projects.list');
      for (const proj of list) {
        map.set(proj.id, proj.name);
      }
    } catch {
      // Non-fatal: falls back to projectId strings.
    }
    return map;
  }

  async function buildDashboard(range: TimeRangeKey = '30d'): Promise<DashboardPayload> {
    const currentNowMs = now();
    const bounds = resolveTimeRangeBounds(range, currentNowMs);
    const projectMap = await projectNamesMap();
    const summary = deps.store.aggregateSummary(bounds.startMs, bounds.endMs);
    const providerUsage = deps.store.aggregateByProvider(bounds.startMs, bounds.endMs);
    const overrides = deps.store.listPricingOverrides();
    const discovered = deps.getDiscoveredProviders();
    const discoveredMap = new Map(discovered.map((d) => [d.providerId, d]));
    const snapshots = deps.store.listQuotaSnapshots();
    const snapMap = new Map(snapshots.map((s) => [s.providerId, s]));

    const allProviderIds = new Set<string>([
      ...snapshots.map((s) => s.providerId),
      ...discovered.map((d) => d.providerId),
      ...providerUsage.keys()
    ]);

    const providers: ProviderQuotaSnapshot[] = [...allProviderIds].map((providerId) => {
      const snap = snapMap.get(providerId);
      const disc = discoveredMap.get(providerId);
      const agg = providerUsage.get(providerId);
      const billingMode: BillingMode = snap?.billingMode ?? 'subscription';
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
    });

    const providerOrder = deps.getProviderOrder?.() ?? DEFAULT_PROVIDER_ORDER;
    const sortedProviders = sortProviders(providers, providerOrder);

    const cloudStatuses = deps.getCloudStatuses();
    let creditsRemaining = 0;
    let creditsLimit = 0;
    let hasCredits = false;
    for (const prov of sortedProviders) {
      if (prov.creditRemainingUsd !== null) {
        creditsRemaining += prov.creditRemainingUsd;
        creditsLimit += prov.creditLimitUsd ?? prov.creditRemainingUsd;
        hasCredits = true;
      }
    }

    const budgets = deps.budgets.evaluateAll();
    const logsMeta = deps.store.queryLogs({ limit: 1 }, projectMap);
    const budgetAlerts = budgets.filter((b) => b.rule.enabled && b.status !== 'ok').length;
    const providerAlerts = sortedProviders.filter((p) => p.status === 'warning' || p.status === 'blocked' || p.status === 'error').length;

    const kpis: DashboardKpis = {
      range,
      rangeBounds: bounds,
      totalValueUsd: Number(summary.totalValueUsd.toFixed(2)),
      billedSpendUsd: Number(summary.billedSpendUsd.toFixed(2)),
      subscriptionEquivUsd: Number(summary.subscriptionEquivUsd.toFixed(2)),
      cloudCreditsRemainingUsd: hasCredits ? Number(creditsRemaining.toFixed(2)) : null,
      cloudCreditsTotalLimitUsd: hasCredits ? Number(creditsLimit.toFixed(2)) : null,
      totalTokens: summary.totalTokens,
      cachedInputTokens: summary.cachedInputTokens,
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
      reasoningOutputTokens: summary.reasoningOutputTokens,
      cacheHitPercent: computeCacheHitPercent(summary.inputTokens, summary.cachedInputTokens),
      turnCount: summary.turnCount,
      subagentTurnCount: summary.subagentTurnCount,
      tightestQuota: findTightestWindow(sortedProviders),
      alertCount: budgetAlerts + providerAlerts,
      logCount: logsMeta.totalCount
    };

    return {
      kpis,
      providers: sortedProviders,
      providerOrder,
      models: deps.store.listModelBreakdown(bounds.startMs, overrides, bounds.endMs),
      projects: deps.store.listProjectBreakdown(bounds.startMs, projectMap, bounds.endMs),
      dailyTrend: deps.store.listDailyTrend(range),
      budgets,
      pricingRules: listCombinedPricingRules(overrides),
      cloudConnectors: cloudStatuses,
      opencodeLocal: deps.getOpenCodeLocalStats?.() ?? null,
      lastSyncedAtMs: deps.getLastSyncedAtMs(),
      isSyncing: deps.getIsSyncing?.() ?? false
    };
  }

  return { buildDashboard, projectNamesMap };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
