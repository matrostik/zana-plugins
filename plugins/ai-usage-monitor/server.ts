import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import {
  normalizeProviderOrderPrefs,
  sanitizeCustomOrder,
  VALID_PROVIDER_SORT_MODES
} from './src/shared/provider-order.ts';
import {
  DEFAULT_SUBSCRIPTION_PROVIDERS_CSV,
  LOCAL_CREDENTIAL_PROBE_ENDPOINTS,
  LOCAL_CREDENTIAL_PROBE_FILES,
  REALTIME_CHANNEL,
  RPC_METHODS,
  type BillingMode,
  type BudgetMetric,
  type BudgetPeriod,
  type BudgetRuleInput,
  type BudgetScopeType,
  type LogEventKind,
  type OpenCodeLocalStatsSnapshot,
  type ProviderOrderPrefs,
  type ProviderSortMode,
  type TimeRangeKey
} from './src/shared/types.ts';
import { createBudgetEvaluator, type BudgetEvaluator } from './src/server/budgets.ts';
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
import { createDashboardService, type DashboardService } from './src/server/dashboard.ts';
import { createUsageStore, type UsageStore } from './src/server/db.ts';
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
const LIFECYCLE_EVENTS = ['thread.created', 'thread.active', 'thread.idle', 'thread.failed'] as const;

type SettingsMap = Record<string, string | number | boolean | undefined>;

interface PluginRuntimeState {
  cachedModeOverrides: Map<string, BillingMode>;
  pricingModesKey: string;
  cachedLocalProbeEnabled: boolean;
  discoveredProviders: DiscoveredProviderModels[];
  cachedOpenCodeLocalStats: OpenCodeLocalStatsSnapshot | null;
  cachedProviderOrder: ProviderOrderPrefs;
  lastSyncedAtMs: number;
  isSyncing: boolean;
  disposed: boolean;
  activeRefresh: Promise<void> | null;
  initialTimer: ReturnType<typeof setTimeout> | null;
  continuationTimer: ReturnType<typeof setTimeout> | null;
}

interface SyncPassOptions {
  timeBudgetMs?: number;
  continueBackfill?: boolean;
}

interface RefreshNowOptions extends SyncPassOptions {
  /**
   * Set when the caller changed state the sync depends on (sync cursors, settings). If a pass is
   * already running it read the old state, so instead of joining it a single follow-up pass is
   * queued to run once it finishes. Without this flag concurrent callers share the in-flight pass.
   */
  requireFreshPass?: boolean;
}

type RefreshNowFn = (opts?: RefreshNowOptions) => Promise<void>;

function parseSubscriptionOverrides(raw: unknown): Map<string, BillingMode> {
  const map = new Map<string, BillingMode>();
  if (typeof raw !== 'string') return map;
  for (const part of raw.split(',')) {
    const id = part.trim().toLowerCase();
    if (id) map.set(id, 'subscription');
  }
  return map;
}

function definePluginSettings(zcc: ZccPluginApi) {
  return zcc.settings.define({
    openaiAdminKey: {
      type: 'string', label: 'OpenAI Admin API Key (Optional)',
      description: 'Secret key (sk-admin-...) for syncing exact OpenAI Organization costs.', secret: true
    },
    anthropicAdminKey: {
      type: 'string', label: 'Anthropic Admin API Key (Optional)',
      description: 'Secret key (sk-ant-admin-...) for syncing Anthropic Console cost reports.', secret: true
    },
    openrouterApiKey: {
      type: 'string', label: 'OpenRouter API Key (Optional)',
      description: 'Secret key to query prepaid credit balance and usage limits.', secret: true
    },
    opencodeApiKey: {
      type: 'string', label: 'OpenCode Console / Go API Key (Optional)',
      description: 'Personal key (oc_sk_...) for OpenCode Go quota windows and Console usage/billing read endpoints.', secret: true
    },
    opencodeWorkspaceId: {
      type: 'string', label: 'OpenCode Workspace / Org ID (Optional)',
      description: 'Optional workspace ID sent via x-opencode-org-id / x-org-id for Go and Console requests.'
    },
    enableOpenCodeLocalStats: {
      type: 'boolean', label: 'Import Local OpenCode CLI Stats',
      description: 'Reads today, 7-day, and all-time local statistics from the installed opencode CLI (kept separate from Zana totals).', default: true
    },
    enableLocalCredentialProbing: {
      type: 'boolean', label: 'Probe Local Codex & Claude OAuth Quotas (Opt-In)',
      description: `Off by default. When enabled, reads OAuth tokens from ${LOCAL_CREDENTIAL_PROBE_FILES.join(', ')} and sends them on refresh to ${LOCAL_CREDENTIAL_PROBE_ENDPOINTS.join(' and ')} to display live subscription quotas.`,
      default: false
    },
    subscriptionProviders: {
      type: 'string', label: 'Subscription Provider IDs',
      description: 'Comma-separated provider IDs treated as flat-rate subscriptions instead of pay-as-you-go API spend.',
      default: DEFAULT_SUBSCRIPTION_PROVIDERS_CSV
    },
    enableBudgetInboxAlerts: {
      type: 'boolean', label: 'Push Budget Alerts to Inbox',
      description: 'Automatically notify ZCC Inbox when an active budget reaches its warning or exceeded threshold.', default: true
    }
  });
}

function getLoopbackUrl(zcc: ZccPluginApi): string | null {
  const serverApi = (zcc as unknown as { server?: { loopbackBaseUrl?: string } }).server;
  try {
    return serverApi?.loopbackBaseUrl ?? null;
  } catch {
    return null;
  }
}

function createCollectors(args: {
  zcc: ZccPluginApi;
  deps: AiUsageMonitorDeps;
  store: UsageStore;
  state: PluginRuntimeState;
  refreshSettingsCache: () => Promise<SettingsMap>;
  getSettingValues: () => Promise<SettingsMap>;
  now: () => number;
}) {
  const { zcc, deps, store, state, refreshSettingsCache, getSettingValues, now } = args;
  const indexer = createTelemetryIndexer({
    store, threads: zcc.sdk.threads as ThreadsApiLike, log: zcc.log,
    getProviderModeOverrides: () => state.cachedModeOverrides, now
  });
  const zccQuotas = createZccQuotaCollector({
    providers: zcc.sdk.providers, store, getObservedRateLimit: (id) => indexer.getObservedRateLimit(id),
    getProviderModeOverrides: () => state.cachedModeOverrides, isLocalCredentialProbingEnabled: () => state.cachedLocalProbeEnabled,
    getLoopbackBaseUrl: () => getLoopbackUrl(zcc), probeSystemUsageLimits: deps.probeSystemUsageLimits,
    homeDir: deps.homeDir, env: deps.env, fetch: deps.fetch, log: zcc.log, now
  });
  const cloudBilling = createCloudBillingCollector({
    store, fetch: deps.fetch, log: zcc.log, now,
    getKeys: async () => {
      const vals = await refreshSettingsCache();
      return {
        openaiAdminKey: typeof vals.openaiAdminKey === 'string' ? vals.openaiAdminKey : '',
        anthropicAdminKey: typeof vals.anthropicAdminKey === 'string' ? vals.anthropicAdminKey : '',
        openrouterApiKey: typeof vals.openrouterApiKey === 'string' ? vals.openrouterApiKey : '',
        opencodeApiKey: typeof vals.opencodeApiKey === 'string' ? vals.opencodeApiKey : '',
        opencodeWorkspaceId: typeof vals.opencodeWorkspaceId === 'string' ? vals.opencodeWorkspaceId : ''
      };
    }
  });
  const budgets = createBudgetEvaluator({
    store, inbox: zcc.sdk.inbox, projects: zcc.sdk.projects, log: zcc.log, now,
    areAlertsEnabled: async () => (await getSettingValues()).enableBudgetInboxAlerts !== false
  });
  const dashboard = createDashboardService({
    store, budgets, projects: zcc.sdk.projects, getDiscoveredProviders: () => state.discoveredProviders,
    getCloudStatuses: () => cloudBilling.getStatuses(), getOpenCodeLocalStats: () => state.cachedOpenCodeLocalStats,
    getProviderOrder: () => state.cachedProviderOrder, getProviderModeOverrides: () => state.cachedModeOverrides,
    getLastSyncedAtMs: () => state.lastSyncedAtMs, getIsSyncing: () => state.isSyncing, log: zcc.log, now
  });
  return { indexer, zccQuotas, cloudBilling, budgets, dashboard };
}

async function syncOpenCodeLocalStats(args: {
  zcc: ZccPluginApi;
  deps: AiUsageMonitorDeps;
  state: PluginRuntimeState;
  vals: SettingsMap;
  now: () => number;
}): Promise<void> {
  const { zcc, deps, state, vals, now } = args;
  if (deps.runOpenCodeCommand === null) return;
  if (Boolean(process.env.VITEST) && deps.runOpenCodeCommand === undefined) return;
  const snapshot = await collectOpenCodeLocalStats({
    enabled: vals.enableOpenCodeLocalStats !== false,
    runCommand: deps.runOpenCodeCommand,
    previousSnapshot: state.cachedOpenCodeLocalStats,
    now,
    onWarn: (msg) => zcc.log.warn(msg)
  });
  state.cachedOpenCodeLocalStats = snapshot;
  await zcc.storage.kv.set('opencodeLocalStats', snapshot).catch(() => undefined);
}

interface SyncCoordinatorDeps {
  zcc: ZccPluginApi;
  deps: AiUsageMonitorDeps;
  state: PluginRuntimeState;
  defaultBudgetMs: number;
  refreshSettingsCache: () => Promise<SettingsMap>;
  collectors: ReturnType<typeof createCollectors>;
  now: () => number;
}

interface ProviderRefreshOptions {
  /** The panel already probed Antigravity's usage:status itself; skip the server's loopback probe. */
  skipAntigravityProbe?: boolean;
}

async function executeProviderRefresh(ctx: SyncCoordinatorDeps, providerId: string, opts: ProviderRefreshOptions): Promise<void> {
  const { zcc, deps, state, refreshSettingsCache, collectors, now } = ctx;
  const key = providerId.toLowerCase();
  const vals = await refreshSettingsCache();
  const [discovered] = await Promise.all([
    collectors.zccQuotas.collectOne(providerId, { skipAntigravityProbe: opts.skipAntigravityProbe === true }),
    collectors.cloudBilling.collectOne(providerId),
    key === 'opencode'
      ? syncOpenCodeLocalStats({ zcc, deps, state, vals, now }).catch((err) => {
          zcc.log.warn(`ai-usage-monitor: OpenCode local stats sync failed: ${errorMessage(err)}`);
        })
      : Promise.resolve()
  ]);
  if (discovered) {
    const idx = state.discoveredProviders.findIndex((p) => p.providerId === discovered.providerId);
    state.discoveredProviders = idx >= 0
      ? state.discoveredProviders.map((p, i) => (i === idx ? discovered : p))
      : [...state.discoveredProviders, discovered];
  }
  await collectors.budgets.checkAndNotify();
  zcc.realtime.publish(REALTIME_CHANNEL, { providerId, lastSyncedAtMs: now() });
}

async function executeSyncPass(
  ctx: SyncCoordinatorDeps,
  opts: SyncPassOptions,
  onMore: () => void
): Promise<void> {
  const { zcc, deps, state, defaultBudgetMs, refreshSettingsCache, collectors, now } = ctx;
  state.isSyncing = true;
  zcc.realtime.publish(REALTIME_CHANNEL, { syncing: true, lastSyncedAtMs: state.lastSyncedAtMs });
  try {
    const vals = await refreshSettingsCache();
    const localPromise = syncOpenCodeLocalStats({ zcc, deps, state, vals, now }).catch((err) => {
      zcc.log.warn(`ai-usage-monitor: OpenCode local stats sync failed: ${errorMessage(err)}`);
    });
    const syncRes = await collectors.indexer.syncAllThreads({
      timeBudgetMs: opts.timeBudgetMs ?? defaultBudgetMs,
      onBatchProgress: () => zcc.realtime.publish(REALTIME_CHANNEL, { syncing: true, lastSyncedAtMs: state.lastSyncedAtMs })
    });
    state.discoveredProviders = await collectors.zccQuotas.collectAll();
    await collectors.cloudBilling.collectAll();
    await localPromise;
    await collectors.budgets.checkAndNotify();
    state.lastSyncedAtMs = now();
    await zcc.storage.kv.set('lastSyncedAtMs', state.lastSyncedAtMs).catch(() => undefined);
    if (syncRes.hasMore && opts.continueBackfill !== false && !state.disposed) onMore();
  } finally {
    state.isSyncing = false;
    state.activeRefresh = null;
    zcc.realtime.publish(REALTIME_CHANNEL, { syncing: false, lastSyncedAtMs: state.lastSyncedAtMs });
  }
}

function createSyncCoordinator(ctx: SyncCoordinatorDeps) {
  const activeProviderRefreshes = new Map<string, Promise<void>>();
  function scheduleContinuation(): void {
    if (ctx.state.disposed || ctx.state.continuationTimer) return;
    ctx.state.continuationTimer = setTimeout(() => {
      ctx.state.continuationTimer = null;
      if (ctx.state.disposed) return;
      void refreshNow({ timeBudgetMs: ctx.defaultBudgetMs, continueBackfill: true }).catch((err) => {
        ctx.zcc.log.warn(`ai-usage-monitor: backfill continuation failed: ${errorMessage(err)}`);
      });
    }, 150);
  }
  function refreshProvider(providerId: string, opts: ProviderRefreshOptions = {}): Promise<void> {
    const key = providerId.toLowerCase();
    const existing = activeProviderRefreshes.get(key);
    if (existing) return existing;
    const run = executeProviderRefresh(ctx, providerId, opts).finally(() => activeProviderRefreshes.delete(key));
    activeProviderRefreshes.set(key, run);
    return run;
  }

  let queuedFreshPass: Promise<void> | null = null;
  function startSyncPass(opts: SyncPassOptions): Promise<void> {
    ctx.state.activeRefresh = executeSyncPass(ctx, opts, scheduleContinuation);
    return ctx.state.activeRefresh;
  }
  function refreshNow(opts: RefreshNowOptions = {}): Promise<void> {
    const { requireFreshPass, ...passOpts } = opts;
    const active = ctx.state.activeRefresh;
    if (!active) return startSyncPass(passOpts);
    if (!requireFreshPass) return active;
    // The in-flight pass started with the old cursors/settings: queue one follow-up pass (shared by
    // every caller that arrives meanwhile) instead of reporting the stale pass as the result.
    queuedFreshPass ??= active
      .catch(() => undefined)
      .then(() => {
        queuedFreshPass = null;
        if (ctx.state.disposed) return undefined;
        // Any pass started after the in-flight one finished already sees the new state.
        return ctx.state.activeRefresh ?? startSyncPass(passOpts);
      });
    return queuedFreshPass;
  }
  return { refreshNow, refreshProvider };
}

function parseBudgetRpcInput(args: unknown): BudgetRuleInput {
  const rec = asRecord(args);
  const name = asString(rec, 'name').trim();
  if (!name) throw new Error('Budget name is required.');
  const scopeType = asString(rec, 'scopeType') as BudgetScopeType;
  if (!VALID_SCOPES.has(scopeType)) throw new Error(`Invalid budget scopeType: ${scopeType}`);
  const rawScopeId = asOptionalString(rec, 'scopeId')?.trim() ?? '';
  if (scopeType !== 'global' && !rawScopeId) {
    throw new Error(`Budget scopeId is required when scopeType is "${scopeType}".`);
  }
  const period = asString(rec, 'period') as BudgetPeriod;
  if (!VALID_PERIODS.has(period)) throw new Error(`Invalid budget period: ${period}`);
  const metric = asString(rec, 'metric') as BudgetMetric;
  if (!VALID_METRICS.has(metric)) throw new Error(`Invalid budget metric: ${metric}`);
  const limitValue = asNumber(rec, 'limitValue', 0);
  if (limitValue <= 0) throw new Error('Budget limitValue must be greater than 0.');
  const alertThresholdPct = Math.min(100, Math.max(1, asNumber(rec, 'alertThresholdPct', 80)));
  return {
    id: asOptionalString(rec, 'id') ?? undefined, name, scopeType,
    scopeId: scopeType === 'global' ? '' : rawScopeId,
    period, metric, limitValue, alertThresholdPct, enabled: rec.enabled !== false
  };
}

function registerReadAndSyncRpcs(args: {
  zcc: ZccPluginApi;
  deps: AiUsageMonitorDeps;
  state: PluginRuntimeState;
  defaultBudgetMs: number;
  store: UsageStore;
  dashboard: DashboardService;
  refreshNow: RefreshNowFn;
  refreshProvider: (providerId: string, opts?: ProviderRefreshOptions) => Promise<void>;
}) {
  const { zcc, deps, state, defaultBudgetMs, store, dashboard, refreshNow, refreshProvider } = args;
  zcc.rpc.method(RPC_METHODS.dashboard, async (rawArgs) => {
    const rawRange = asString(asRecord(rawArgs), 'range') as TimeRangeKey;
    const range: TimeRangeKey = VALID_RANGES.has(rawRange) ? rawRange : '30d';
    if (state.lastSyncedAtMs === 0 && !state.activeRefresh && !deps.skipInitialSync) {
      void refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true }).catch((err) => {
        zcc.log.warn(`ai-usage-monitor: on-demand initial sync failed: ${errorMessage(err)}`);
      });
    }
    return dashboard.buildDashboard(range);
  });
  zcc.rpc.method(RPC_METHODS.logs, async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const rawKind = asString(rec, 'kind');
    const kind = rawKind === 'all' || !rawKind ? 'all' : VALID_LOG_KINDS.has(rawKind as LogEventKind) ? (rawKind as LogEventKind) : 'all';
    const projectMap = await dashboard.projectNamesMap();
    return store.queryLogs({
      kind, providerId: asOptionalString(rec, 'providerId') ?? undefined,
      projectId: asOptionalString(rec, 'projectId') ?? undefined, search: asOptionalString(rec, 'search') ?? undefined,
      limit: asNumber(rec, 'limit', 60), offset: asNumber(rec, 'offset', 0)
    }, projectMap);
  });
  zcc.rpc.method(RPC_METHODS.refreshNow, async () => {
    await refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true });
    return { ok: true, lastSyncedAtMs: state.lastSyncedAtMs, isSyncing: state.isSyncing };
  });
  zcc.rpc.method(RPC_METHODS.refreshProvider, async (rawArgs) => {
    const providerId = asString(asRecord(rawArgs), 'providerId').trim();
    if (!providerId) throw new Error('providerId is required.');
    await refreshProvider(providerId, { skipAntigravityProbe: asRecord(rawArgs).skipAntigravityProbe === true });
    return { ok: true, providerId, lastSyncedAtMs: state.lastSyncedAtMs };
  });
  zcc.rpc.method(RPC_METHODS.resetSync, async () => {
    store.resetSyncCursors();
    await refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true, requireFreshPass: true });
    return { ok: true, lastSyncedAtMs: state.lastSyncedAtMs, isSyncing: state.isSyncing };
  });
}

function registerBudgetRpcs(zcc: ZccPluginApi, store: UsageStore, budgets: BudgetEvaluator) {
  zcc.rpc.method(RPC_METHODS.setBudget, async (rawArgs) => {
    const saved = store.upsertBudget(parseBudgetRpcInput(rawArgs));
    await budgets.checkAndNotify();
    zcc.realtime.publish(REALTIME_CHANNEL, { budgetId: saved.id });
    return saved;
  });
  zcc.rpc.method(RPC_METHODS.deleteBudget, (rawArgs) => {
    const id = asString(asRecord(rawArgs), 'id').trim();
    if (!id) throw new Error('Budget id is required.');
    const deleted = store.deleteBudget(id);
    zcc.realtime.publish(REALTIME_CHANNEL, { budgetDeleted: id });
    return { deleted };
  });
}

function registerPricingAndOrderRpcs(zcc: ZccPluginApi, state: PluginRuntimeState, store: UsageStore) {
  zcc.rpc.method(RPC_METHODS.setPricingOverride, (rawArgs) => {
    const rec = asRecord(rawArgs);
    const pattern = asString(rec, 'pattern').trim();
    if (!pattern) throw new Error('Model pricing pattern is required.');
    const rawMode = asOptionalString(rec, 'billingMode') as BillingMode | null;
    if (rawMode && !VALID_MODES.has(rawMode)) throw new Error(`Invalid billingMode: ${rawMode}`);
    const saved = store.upsertPricingOverride({
      pattern, inputPer1M: Math.max(0, asNumber(rec, 'inputPer1M', 0)),
      cachedInputPer1M: Math.max(0, asNumber(rec, 'cachedInputPer1M', 0)),
      outputPer1M: Math.max(0, asNumber(rec, 'outputPer1M', 0)),
      reasoningPer1M: Math.max(0, asNumber(rec, 'reasoningPer1M', 0)), billingMode: rawMode
    });
    store.repriceTurns(state.cachedModeOverrides);
    zcc.realtime.publish(REALTIME_CHANNEL, { pricingPattern: pattern });
    return saved;
  });
  zcc.rpc.method(RPC_METHODS.deletePricingOverride, (rawArgs) => {
    const pattern = asString(asRecord(rawArgs), 'pattern').trim();
    if (!pattern) throw new Error('Pricing pattern is required.');
    const deleted = store.deletePricingOverride(pattern);
    if (deleted) store.repriceTurns(state.cachedModeOverrides);
    zcc.realtime.publish(REALTIME_CHANNEL, { pricingDeleted: pattern });
    return { deleted };
  });
  zcc.rpc.method(RPC_METHODS.setProviderOrder, async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const rawSortMode = asOptionalString(rec, 'sortMode');
    let sortMode: ProviderSortMode = state.cachedProviderOrder.sortMode;
    if (rawSortMode !== null) {
      if (!VALID_PROVIDER_SORT_MODES.has(rawSortMode as ProviderSortMode)) throw new Error(`Invalid sortMode: ${rawSortMode}`);
      sortMode = rawSortMode as ProviderSortMode;
    }
    const customOrder = rec.customOrder !== undefined ? sanitizeCustomOrder(rec.customOrder) : state.cachedProviderOrder.customOrder;
    const nextPrefs: ProviderOrderPrefs = { sortMode, customOrder };
    state.cachedProviderOrder = nextPrefs;
    await zcc.storage.kv.set('providerOrder', nextPrefs);
    zcc.realtime.publish(REALTIME_CHANNEL, { providerOrder: nextPrefs });
    return nextPrefs;
  });
}

function attachRuntimeHooks(args: {
  zcc: ZccPluginApi;
  deps: AiUsageMonitorDeps;
  state: PluginRuntimeState;
  defaultBudgetMs: number;
  settings: ReturnType<typeof definePluginSettings>;
  collectors: ReturnType<typeof createCollectors>;
  refreshNow: RefreshNowFn;
  now: () => number;
}) {
  const { zcc, deps, state, defaultBudgetMs, settings, collectors, refreshNow, now } = args;
  for (const eventName of LIFECYCLE_EVENTS) {
    zcc.events.on(eventName, async (event) => {
      const count = await collectors.indexer.onThreadLifecycleEvent(event);
      if (count > 0 || eventName === 'thread.failed') {
        await collectors.budgets.checkAndNotify();
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
    void refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true, requireFreshPass: true }).catch((err) => {
      zcc.log.warn(`ai-usage-monitor: settings-triggered sync failed: ${errorMessage(err)}`);
    });
  });
  if (!deps.skipInitialSync) {
    state.initialTimer = setTimeout(() => {
      state.initialTimer = null;
      void refreshNow({ timeBudgetMs: defaultBudgetMs, continueBackfill: true }).catch((err) => {
        zcc.log.warn(`ai-usage-monitor: initial background sync failed: ${errorMessage(err)}`);
      });
    }, 50);
  }
  zcc.onDispose(() => {
    state.disposed = true;
    if (state.initialTimer) clearTimeout(state.initialTimer);
    if (state.continuationTimer) clearTimeout(state.continuationTimer);
  });
}

export default async function createAiUsageMonitorPlugin(
  zcc: ZccPluginApi,
  deps: AiUsageMonitorDeps = {}
): Promise<void> {
  const now = deps.now ?? Date.now;
  const defaultBudgetMs = deps.syncTimeBudgetMs ?? 15_000;
  const settings = definePluginSettings(zcc);
  const store = createUsageStore(zcc.storage.database(), now);
  const state: PluginRuntimeState = {
    cachedModeOverrides: parseSubscriptionOverrides(DEFAULT_SUBSCRIPTION_PROVIDERS_CSV),
    pricingModesKey: '', cachedLocalProbeEnabled: false, discoveredProviders: [],
    cachedOpenCodeLocalStats: (await zcc.storage.kv.get<OpenCodeLocalStatsSnapshot>('opencodeLocalStats').catch(() => undefined)) ?? null,
    cachedProviderOrder: normalizeProviderOrderPrefs(await zcc.storage.kv.get<ProviderOrderPrefs>('providerOrder').catch(() => undefined)),
    lastSyncedAtMs: (await zcc.storage.kv.get<number>('lastSyncedAtMs').catch(() => undefined)) ?? 0,
    isSyncing: false, disposed: false, activeRefresh: null, initialTimer: null, continuationTimer: null
  };

  const getSettingValues = () => settings.get().catch((): SettingsMap => ({}));
  const refreshSettingsCache = async (): Promise<SettingsMap> => {
    const vals = await getSettingValues();
    state.cachedModeOverrides = parseSubscriptionOverrides(vals.subscriptionProviders);
    const nextModesKey = JSON.stringify([...state.cachedModeOverrides].sort());
    if (nextModesKey !== state.pricingModesKey) {
      store.repriceTurns(state.cachedModeOverrides);
      state.pricingModesKey = nextModesKey;
    }
    state.cachedLocalProbeEnabled = vals.enableLocalCredentialProbing === true;
    return vals;
  };
  await refreshSettingsCache();

  const collectors = createCollectors({ zcc, deps, store, state, refreshSettingsCache, getSettingValues, now });
  const { refreshNow, refreshProvider } = createSyncCoordinator({ zcc, deps, state, defaultBudgetMs, refreshSettingsCache, collectors, now });
  attachRuntimeHooks({ zcc, deps, state, defaultBudgetMs, settings, collectors, refreshNow, now });
  registerReadAndSyncRpcs({ zcc, deps, state, defaultBudgetMs, store, dashboard: collectors.dashboard, refreshNow, refreshProvider });
  registerBudgetRpcs(zcc, store, collectors.budgets);
  registerPricingAndOrderRpcs(zcc, state, store);
  registerCli(zcc.cli, {
    dashboard: collectors.dashboard, store, refreshNow,
    qualifyOpenCode: async () => {
      const vals = await refreshSettingsCache();
      return qualifyOpenCodeConsole({
        apiKey: typeof vals.opencodeApiKey === 'string' ? vals.opencodeApiKey : '',
        workspaceId: typeof vals.opencodeWorkspaceId === 'string' ? vals.opencodeWorkspaceId : '',
        fetch: deps.fetch
      });
    }
  });
  registerAgentTools(zcc.agents, { dashboard: collectors.dashboard, store, refreshNow });
  zcc.log.info('ai-usage-monitor plugin initialized');
}
