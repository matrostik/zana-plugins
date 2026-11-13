import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import {
  normalizeProviderOrderPrefs,
  sanitizeCustomOrder,
  VALID_PROVIDER_SORT_MODES
} from './src/shared/provider-order.ts';
import {
  REALTIME_CHANNEL,
  RPC_METHODS,
  type BillingMode,
  type BudgetMetric,
  type BudgetPeriod,
  type BudgetScopeType,
  type LogEventKind,
  type OpenCodeLocalStatsSnapshot,
  type ProviderOrderPrefs,
  type ProviderSortMode,
  type TimeRangeKey
} from './src/shared/types.ts';
import { createBudgetEvaluator } from './src/server/budgets.ts';
import { registerAgentTools, registerCli } from './src/server/cli-and-tools.ts';
import { createCloudBillingCollector } from './src/server/collectors/cloud-billing.ts';
import {
  collectOpenCodeLocalStats,
  qualifyOpenCodeConsole,
  type CommandRunner
} from './src/server/collectors/opencode-usage.ts';
import {
  createZccQuotaCollector,
  type DiscoveredProviderModels,
  type FetchLike,
  type HostUsageProbeResult
} from './src/server/collectors/zcc-quotas.ts';
import { createDashboardService } from './src/server/dashboard.ts';
import { createUsageStore } from './src/server/db.ts';
import { createTelemetryIndexer, type ThreadsApiLike } from './src/server/indexer.ts';
import { asNumber, asOptionalString, asRecord, asString, errorMessage } from './src/server/util.ts';

export interface AiUsageMonitorDeps {
  fetch?: FetchLike;
  now?: () => number;
  probeSystemUsageLimits?: () => Promise<HostUsageProbeResult | null>;
  runOpenCodeCommand?: CommandRunner | null;
  homeDir?: string | null;
  env?: NodeJS.ProcessEnv;
  skipInitialSync?: boolean;
  syncTimeBudgetMs?: number;
}

const VALID_RANGES = new Set<TimeRangeKey>(['today', '7d', 'last_week', '30d', 'all']);
const VALID_SCOPES = new Set<BudgetScopeType>(['global', 'provider', 'model', 'project']);
const VALID_PERIODS = new Set<BudgetPeriod>(['5h', 'daily', 'weekly', 'monthly']);
const VALID_METRICS = new Set<BudgetMetric>(['billed_usd', 'total_usd', 'tokens']);
const VALID_MODES = new Set<BillingMode>(['billed_api', 'subscription', 'free']);
const VALID_LOG_KINDS = new Set<LogEventKind>(['turn_usage', 'rate_limit', 'fallback', 'error']);
const LIFECYCLE_EVENTS = [
  'thread.created',
  'thread.active',
  'thread.idle',
  'thread.failed'
] as const;

type SettingsMap = Record<string, string | number | boolean | undefined>;

function parseSubscriptionOverrides(raw: unknown): Map<string, BillingMode> {
  const map = new Map<string, BillingMode>();
  if (typeof raw !== 'string') return map;
  for (const part of raw.split(',')) {
    const id = part.trim().toLowerCase();
    if (id) map.set(id, 'subscription');
  }
  return map;
}

export default async function createAiUsageMonitorPlugin(
  zcc: ZccPluginApi,
  deps: AiUsageMonitorDeps = {}
): Promise<void> {
  const now = deps.now ?? Date.now;
  const defaultBudgetMs = deps.syncTimeBudgetMs ?? 15_000;
  const settings = zcc.settings.define({
    openaiAdminKey: {
      type: 'string',
      label: 'OpenAI Admin API Key (Optional)',
      description: 'Secret key (sk-admin-...) for syncing exact OpenAI Organization costs.',
      secret: true
    },
    anthropicAdminKey: {
      type: 'string',
      label: 'Anthropic Admin API Key (Optional)',
      description: 'Secret key (sk-ant-admin-...) for syncing Anthropic Console cost reports.',
      secret: true
    },
    openrouterApiKey: {
      type: 'string',
      label: 'OpenRouter API Key (Optional)',
      description: 'Secret key to query prepaid credit balance and usage limits.',
      secret: true
    },
    opencodeApiKey: {
      type: 'string',
      label: 'OpenCode Console / Go API Key (Optional)',
      description: 'Personal key (oc_sk_...) for OpenCode Go quota windows and Console usage/billing read endpoints.',
      secret: true
    },
    opencodeWorkspaceId: {
      type: 'string',
      label: 'OpenCode Workspace / Org ID (Optional)',
      description: 'Optional workspace ID sent via x-opencode-org-id / x-org-id for Go and Console requests.'
    },
    enableOpenCodeLocalStats: {
      type: 'boolean',
      label: 'Import Local OpenCode CLI Stats',
      description: 'Reads today, 7-day, and all-time local statistics from the installed opencode CLI (kept separate from Zana totals).',
      default: true
    },
    subscriptionProviders: {
      type: 'string',
      label: 'Subscription Provider IDs',
      description: 'Comma-separated provider IDs treated as flat-rate subscriptions instead of pay-as-you-go API spend.',
      default: 'claude-code,codex,cursor,acp-cursor,antigravity'
    },
    enableBudgetInboxAlerts: {
      type: 'boolean',
      label: 'Push Budget Alerts to Inbox',
      description: 'Automatically notify ZCC Inbox when an active budget reaches its warning or exceeded threshold.',
      default: true
    }
  });

  let cachedModeOverrides = parseSubscriptionOverrides('claude-code,codex,cursor,acp-cursor,antigravity');
  const refreshSettingsCache = async (): Promise<SettingsMap> => {
    const vals = await settings.get().catch((): SettingsMap => ({}));
    cachedModeOverrides = parseSubscriptionOverrides(vals.subscriptionProviders);
    return vals;
  };
  await refreshSettingsCache();

  const db = zcc.storage.database();
  const store = createUsageStore(db, now);
  let discoveredProviders: DiscoveredProviderModels[] = [];
  let cachedOpenCodeLocalStats: OpenCodeLocalStatsSnapshot | null =
    (await zcc.storage.kv.get<OpenCodeLocalStatsSnapshot>('opencodeLocalStats').catch(() => undefined)) ?? null;
  let cachedProviderOrder: ProviderOrderPrefs = normalizeProviderOrderPrefs(
    await zcc.storage.kv.get<ProviderOrderPrefs>('providerOrder').catch(() => undefined)
  );
  let lastSyncedAtMs = (await zcc.storage.kv.get<number>('lastSyncedAtMs').catch(() => undefined)) ?? 0;
  let isSyncing = false;
  let disposed = false;
  let initialTimer: ReturnType<typeof setTimeout> | null = null;
  let continuationTimer: ReturnType<typeof setTimeout> | null = null;

  const indexer = createTelemetryIndexer({
    store,
    threads: zcc.sdk.threads as ThreadsApiLike,
    log: zcc.log,
    getProviderModeOverrides: () => cachedModeOverrides,
    now
  });

  const zccQuotas = createZccQuotaCollector({
    providers: zcc.sdk.providers,
    store,
    getObservedRateLimit: (id) => indexer.getObservedRateLimit(id),
    getProviderModeOverrides: () => cachedModeOverrides,
    getLoopbackBaseUrl: () => {
      const serverApi = (zcc as unknown as { server?: { loopbackBaseUrl?: string } }).server;
      try {
        return serverApi?.loopbackBaseUrl ?? null;
      } catch {
        return null;
      }
    },
    probeSystemUsageLimits: deps.probeSystemUsageLimits,
    homeDir: deps.homeDir,
    env: deps.env,
    fetch: deps.fetch,
    log: zcc.log,
    now
  });

  const cloudBilling = createCloudBillingCollector({
    store,
    getKeys: async () => {
      const vals = await refreshSettingsCache();
      return {
        openaiAdminKey: typeof vals.openaiAdminKey === 'string' ? vals.openaiAdminKey : '',
        anthropicAdminKey: typeof vals.anthropicAdminKey === 'string' ? vals.anthropicAdminKey : '',
        openrouterApiKey: typeof vals.openrouterApiKey === 'string' ? vals.openrouterApiKey : '',
        opencodeApiKey: typeof vals.opencodeApiKey === 'string' ? vals.opencodeApiKey : '',
        opencodeWorkspaceId: typeof vals.opencodeWorkspaceId === 'string' ? vals.opencodeWorkspaceId : ''
      };
    },
    fetch: deps.fetch,
    log: zcc.log,
    now
  });

  const budgets = createBudgetEvaluator({
    store,
    inbox: zcc.sdk.inbox,
    projects: zcc.sdk.projects,
    areAlertsEnabled: async () => {
      const vals = await settings.get().catch((): SettingsMap => ({}));
      return vals.enableBudgetInboxAlerts !== false;
    },
    log: zcc.log,
    now
  });

  const dashboard = createDashboardService({
    store,
    budgets,
    projects: zcc.sdk.projects,
    getDiscoveredProviders: () => discoveredProviders,
    getCloudStatuses: () => cloudBilling.getStatuses(),
    getOpenCodeLocalStats: () => cachedOpenCodeLocalStats,
    getProviderOrder: () => cachedProviderOrder,
    getLastSyncedAtMs: () => lastSyncedAtMs,
    getIsSyncing: () => isSyncing,
    now
  });

  async function refreshOpenCodeLocalStats(vals: SettingsMap): Promise<void> {
    if (deps.runOpenCodeCommand === null) return;
    const isTestEnv = Boolean(process.env.VITEST);
    if (isTestEnv && deps.runOpenCodeCommand === undefined) return;

    const enabled = vals.enableOpenCodeLocalStats !== false;
    const snapshot = await collectOpenCodeLocalStats({
      enabled,
      runCommand: deps.runOpenCodeCommand,
      previousSnapshot: cachedOpenCodeLocalStats,
      now,
      onWarn: (msg) => zcc.log.warn(msg)
    });
    cachedOpenCodeLocalStats = snapshot;
    await zcc.storage.kv.set('opencodeLocalStats', snapshot).catch(() => undefined);
  }

  let activeRefresh: Promise<void> | null = null;
  function scheduleContinuation(): void {
    if (disposed || continuationTimer) return;
    continuationTimer = setTimeout(() => {
      continuationTimer = null;
      if (disposed) return;
      void refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true }).catch((err) => {
        zcc.log.warn(`ai-usage-monitor: backfill continuation failed: ${errorMessage(err)}`);
      });
    }, 150);
  }

  async function syncQuotasAndCloud(): Promise<void> {
    discoveredProviders = await zccQuotas.collectAll();
    await cloudBilling.collectAll();
  }

  async function refreshNow(opts: { timeBudgetMs?: number; continueBackfill?: boolean } = {}): Promise<void> {
    if (activeRefresh) return activeRefresh;
    activeRefresh = (async () => {
      isSyncing = true;
      try {
        const vals = await refreshSettingsCache();
        const localPromise = refreshOpenCodeLocalStats(vals).catch((err) => {
          zcc.log.warn(`ai-usage-monitor: OpenCode local stats sync failed: ${errorMessage(err)}`);
        });

        if (lastSyncedAtMs === 0) {
          await syncQuotasAndCloud();
          zcc.realtime.publish(REALTIME_CHANNEL, { syncing: true, lastSyncedAtMs });
        }

        const syncRes = await indexer.syncAllThreads({
          timeBudgetMs: opts.timeBudgetMs ?? defaultBudgetMs,
          onBatchProgress: () => zcc.realtime.publish(REALTIME_CHANNEL, { syncing: true, lastSyncedAtMs })
        });

        if (lastSyncedAtMs > 0) {
          await syncQuotasAndCloud();
        } else if (syncRes.eventsIndexed > 0) {
          await syncQuotasAndCloud();
        }

        await localPromise;
        await budgets.checkAndNotify();
        lastSyncedAtMs = now();
        await zcc.storage.kv.set('lastSyncedAtMs', lastSyncedAtMs).catch(() => undefined);

        if (syncRes.hasMore && opts.continueBackfill !== false && !disposed) {
          scheduleContinuation();
        }
      } finally {
        isSyncing = false;
        activeRefresh = null;
        zcc.realtime.publish(REALTIME_CHANNEL, { syncing: false, lastSyncedAtMs });
      }
    })();
    return activeRefresh;
  }

  for (const eventName of LIFECYCLE_EVENTS) {
    zcc.events.on(eventName, async (event) => {
      const count = await indexer.onThreadLifecycleEvent(event);
      if (count > 0 || eventName === 'thread.failed') {
        await budgets.checkAndNotify();
        zcc.realtime.publish(REALTIME_CHANNEL, { threadId: event.threadId, lastSyncedAtMs: now() });
      }
    });
  }

  zcc.background.schedule('*/5 * * * *', async () => {
    await refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true }).catch((err) => {
      zcc.log.warn(`ai-usage-monitor: scheduled sync failed: ${errorMessage(err)}`);
    });
  });

  settings.onChange(() => {
    void refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true }).catch((err) => {
      zcc.log.warn(`ai-usage-monitor: settings-triggered sync failed: ${errorMessage(err)}`);
    });
  });

  zcc.rpc.method(RPC_METHODS.dashboard, async (args) => {
    const rec = asRecord(args);
    const rawRange = asString(rec, 'range') as TimeRangeKey;
    const range: TimeRangeKey = VALID_RANGES.has(rawRange) ? rawRange : '30d';
    if (lastSyncedAtMs === 0 && !activeRefresh && !deps.skipInitialSync) {
      void refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true }).catch((err) => {
        zcc.log.warn(`ai-usage-monitor: on-demand initial sync failed: ${errorMessage(err)}`);
      });
    }
    return dashboard.buildDashboard(range);
  });

  zcc.rpc.method(RPC_METHODS.logs, async (args) => {
    const rec = asRecord(args);
    const rawKind = asString(rec, 'kind');
    const kind = rawKind === 'all' || !rawKind ? 'all' : VALID_LOG_KINDS.has(rawKind as LogEventKind) ? (rawKind as LogEventKind) : 'all';
    const projectMap = await dashboard.projectNamesMap();
    return store.queryLogs(
      {
        kind,
        providerId: asOptionalString(rec, 'providerId') ?? undefined,
        projectId: asOptionalString(rec, 'projectId') ?? undefined,
        search: asOptionalString(rec, 'search') ?? undefined,
        limit: asNumber(rec, 'limit', 60),
        offset: asNumber(rec, 'offset', 0)
      },
      projectMap
    );
  });

  zcc.rpc.method(RPC_METHODS.refreshNow, async () => {
    await refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true });
    return { ok: true, lastSyncedAtMs, isSyncing };
  });

  zcc.rpc.method(RPC_METHODS.setBudget, async (args) => {
    const rec = asRecord(args);
    const name = asString(rec, 'name').trim();
    if (!name) throw new Error('Budget name is required.');
    const scopeType = asString(rec, 'scopeType') as BudgetScopeType;
    if (!VALID_SCOPES.has(scopeType)) throw new Error(`Invalid budget scopeType: ${scopeType}`);
    const period = asString(rec, 'period') as BudgetPeriod;
    if (!VALID_PERIODS.has(period)) throw new Error(`Invalid budget period: ${period}`);
    const metric = asString(rec, 'metric') as BudgetMetric;
    if (!VALID_METRICS.has(metric)) throw new Error(`Invalid budget metric: ${metric}`);
    const limitValue = asNumber(rec, 'limitValue', 0);
    if (limitValue <= 0) throw new Error('Budget limitValue must be greater than 0.');
    const alertThresholdPct = Math.min(100, Math.max(1, asNumber(rec, 'alertThresholdPct', 80)));

    const saved = store.upsertBudget({
      id: asOptionalString(rec, 'id') ?? undefined,
      name,
      scopeType,
      scopeId: asOptionalString(rec, 'scopeId') ?? '',
      period,
      metric,
      limitValue,
      alertThresholdPct,
      enabled: rec.enabled !== false
    });
    await budgets.checkAndNotify();
    zcc.realtime.publish(REALTIME_CHANNEL, { budgetId: saved.id });
    return saved;
  });

  zcc.rpc.method(RPC_METHODS.deleteBudget, (args) => {
    const id = asString(asRecord(args), 'id').trim();
    if (!id) throw new Error('Budget id is required.');
    const deleted = store.deleteBudget(id);
    zcc.realtime.publish(REALTIME_CHANNEL, { budgetDeleted: id });
    return { deleted };
  });

  zcc.rpc.method(RPC_METHODS.setPricingOverride, (args) => {
    const rec = asRecord(args);
    const pattern = asString(rec, 'pattern').trim();
    if (!pattern) throw new Error('Model pricing pattern is required.');
    const rawMode = asOptionalString(rec, 'billingMode') as BillingMode | null;
    if (rawMode && !VALID_MODES.has(rawMode)) throw new Error(`Invalid billingMode: ${rawMode}`);
    const saved = store.upsertPricingOverride({
      pattern,
      inputPer1M: Math.max(0, asNumber(rec, 'inputPer1M', 0)),
      cachedInputPer1M: Math.max(0, asNumber(rec, 'cachedInputPer1M', 0)),
      outputPer1M: Math.max(0, asNumber(rec, 'outputPer1M', 0)),
      reasoningPer1M: Math.max(0, asNumber(rec, 'reasoningPer1M', 0)),
      billingMode: rawMode
    });
    zcc.realtime.publish(REALTIME_CHANNEL, { pricingPattern: pattern });
    return saved;
  });

  zcc.rpc.method(RPC_METHODS.deletePricingOverride, (args) => {
    const pattern = asString(asRecord(args), 'pattern').trim();
    if (!pattern) throw new Error('Pricing pattern is required.');
    const deleted = store.deletePricingOverride(pattern);
    zcc.realtime.publish(REALTIME_CHANNEL, { pricingDeleted: pattern });
    return { deleted };
  });

  zcc.rpc.method(RPC_METHODS.setProviderOrder, async (args) => {
    const rec = asRecord(args);
    const rawSortMode = asOptionalString(rec, 'sortMode');
    let sortMode: ProviderSortMode = cachedProviderOrder.sortMode;
    if (rawSortMode !== null) {
      if (!VALID_PROVIDER_SORT_MODES.has(rawSortMode as ProviderSortMode)) {
        throw new Error(`Invalid sortMode: ${rawSortMode}`);
      }
      sortMode = rawSortMode as ProviderSortMode;
    }
    const customOrder =
      rec.customOrder !== undefined ? sanitizeCustomOrder(rec.customOrder) : cachedProviderOrder.customOrder;
    const nextPrefs: ProviderOrderPrefs = { sortMode, customOrder };
    cachedProviderOrder = nextPrefs;
    await zcc.storage.kv.set('providerOrder', nextPrefs);
    zcc.realtime.publish(REALTIME_CHANNEL, { providerOrder: nextPrefs });
    return nextPrefs;
  });

  zcc.rpc.method(RPC_METHODS.resetSync, async () => {
    store.resetSyncCursors();
    await refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true });
    return { ok: true, lastSyncedAtMs, isSyncing };
  });

  registerCli(zcc.cli, {
    dashboard,
    store,
    refreshNow,
    qualifyOpenCode: async () => {
      const vals = await refreshSettingsCache();
      return qualifyOpenCodeConsole({
        apiKey: typeof vals.opencodeApiKey === 'string' ? vals.opencodeApiKey : '',
        workspaceId: typeof vals.opencodeWorkspaceId === 'string' ? vals.opencodeWorkspaceId : '',
        fetch: deps.fetch
      });
    }
  });
  registerAgentTools(zcc.agents, { dashboard, store, refreshNow });

  if (!deps.skipInitialSync) {
    initialTimer = setTimeout(() => {
      initialTimer = null;
      void refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true }).catch((err) => {
        zcc.log.warn(`ai-usage-monitor: initial background sync failed: ${errorMessage(err)}`);
      });
    }, 50);
  }

  zcc.onDispose(() => {
    disposed = true;
    if (initialTimer) clearTimeout(initialTimer);
    if (continuationTimer) clearTimeout(continuationTimer);
  });

  zcc.log.info('ai-usage-monitor plugin initialized');
}
