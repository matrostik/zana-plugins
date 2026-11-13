import { useCallback, useEffect, useRef, useState } from 'react';
import { callPluginRpc, useRealtime, useRpc, type PluginNavPanelProps } from '@zana-ai/zcc-plugin-sdk/app';
import {
  REALTIME_CHANNEL,
  RPC_METHODS,
  type BudgetRuleInput,
  type DashboardPayload,
  type LogEventKind,
  type LogsResponse,
  type ModelPricingRule,
  type ProviderOrderPrefs,
  type ProviderQuotaSnapshot,
  type TimeRangeKey
} from '../shared/types.ts';
import { formatRangeBoundarySummary, formatRelativeTime } from './format.ts';
import { LogsTab } from './LogsTab.tsx';
import { ModelsSpendTab } from './ModelsSpendTab.tsx';
import { OverviewTab, ReloadSpinner } from './OverviewTab.tsx';
import { ensureStylesInjected } from './styles.ts';

type ActiveTab = 'overview' | 'models' | 'logs';

interface AntigravityUsageEnvelope {
  supported?: boolean;
  refreshError?: string | null;
  usage?: {
    status?: string;
    message?: string;
    planLabel?: string | null;
    windows?: Array<{ label: string; usedPercent: number; resetsAt: string | null }>;
  };
}

function hasValidAntigravityWindows(raw: unknown): boolean {
  const result = raw as AntigravityUsageEnvelope | null;
  return Boolean(
    result?.supported &&
    result.usage?.status === 'ok' &&
    Array.isArray(result.usage.windows) &&
    result.usage.windows.length > 0
  );
}

function applyAntigravityUsage(provider: ProviderQuotaSnapshot, raw: unknown): ProviderQuotaSnapshot {
  const result = raw as AntigravityUsageEnvelope | null;
  const usage = result?.usage;
  if (usage?.status === 'unauthenticated' || usage?.status === 'not_installed') {
    return {
      ...provider,
      status: usage.status,
      windows: [],
      errorMessage: usage.message ?? null
    };
  }
  if (!result?.supported || usage?.status !== 'ok' || !Array.isArray(usage.windows)) {
    const message = usage?.message ?? 'Could not check Antigravity usage.';
    if (provider.windows.length > 0) {
      return { ...provider, errorMessage: message };
    }
    return { ...provider, status: 'error', windows: [], errorMessage: message };
  }
  const windows = usage.windows
    .filter((w) => typeof w.label === 'string' && Number.isFinite(w.usedPercent) && w.usedPercent >= 0 && w.usedPercent <= 100)
    .map((w, i) => ({
      key: `antigravity-${i}`,
      label: w.label,
      usedPercent: w.usedPercent,
      remainingPercent: Math.round((100 - w.usedPercent) * 10) / 10,
      status: (w.usedPercent >= 100 ? 'blocked' : w.usedPercent >= 75 ? 'warning' : 'allowed') as 'blocked' | 'warning' | 'allowed',
      resetsAtIso: w.resetsAt ?? null
    }));
  if (!windows.length) {
    const message = 'Antigravity returned no quota windows.';
    if (provider.windows.length > 0) {
      return { ...provider, errorMessage: message };
    }
    return { ...provider, status: 'error', windows: [], errorMessage: message };
  }
  return {
    ...provider,
    status: windows.some((w) => w.status === 'blocked') ? 'blocked' : windows.some((w) => w.status === 'warning') ? 'warning' : 'ok',
    source: 'native-acp-/usage',
    planLabel: usage.planLabel ?? provider.planLabel,
    errorMessage: result.refreshError ?? null,
    windows
  };
}

const EMPTY_LOGS: LogsResponse = {
  items: [],
  totalCount: 0,
  countsByKind: {
    turn_usage: 0,
    rate_limit: 0,
    fallback: 0,
    error: 0
  }
};

function initialTabFromSubPath(subPath: string | undefined): ActiveTab {
  const clean = (subPath ?? '').replace(/^\/+/, '').toLowerCase();
  if (clean.startsWith('models')) return 'models';
  if (clean.startsWith('logs')) return 'logs';
  return 'overview';
}

function rangeLabel(range: TimeRangeKey): string {
  if (range === 'today') return 'Today';
  if (range === 'last_week') return 'Last Week';
  if (range === 'all') return 'All';
  return range.toUpperCase();
}

export function UsageMonitorPanel({ subPath }: Partial<PluginNavPanelProps>) {
  const rpc = useRpc();
  const rpcRef = useRef(rpc);
  rpcRef.current = rpc;
  const [tab, setTab] = useState<ActiveTab>(() => initialTabFromSubPath(subPath));
  const [range, setRange] = useState<TimeRangeKey>('30d');
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [logs, setLogs] = useState<LogsResponse>(EMPTY_LOGS);
  const [logKind, setLogKind] = useState<LogEventKind | 'all'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingProviders, setRefreshingProviders] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [antigravityUsage, setAntigravityUsage] = useState<unknown>(null);
  const [antigravityRefreshing, setAntigravityRefreshing] = useState(false);
  const [quotaRefresh, setQuotaRefresh] = useState(0);
  const mountedRef = useRef(true);
  const antigravitySeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    ensureStylesInjected();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchDashboard = useCallback(async (targetRange: TimeRangeKey) => {
    const payload = (await rpcRef.current.call(RPC_METHODS.dashboard, { range: targetRange })) as DashboardPayload;
    if (mountedRef.current) setDashboard(payload);
  }, []);

  const fetchLogs = useCallback(async (kind: LogEventKind | 'all', search: string) => {
    const payload = (await rpcRef.current.call(RPC_METHODS.logs, {
      kind,
      search: search.trim() || undefined,
      limit: 80,
      offset: 0
    })) as LogsResponse;
    if (mountedRef.current) setLogs(payload);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([fetchDashboard(range), fetchLogs(logKind, logSearch)]);
      if (mountedRef.current) {
        setError(null);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }
  }, [fetchDashboard, fetchLogs, logKind, logSearch, range]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const probeAntigravityDirect = useCallback(async () => {
    const seq = ++antigravitySeqRef.current;
    setAntigravityRefreshing(true);
    try {
      const result = await callPluginRpc('provider-antigravity', 'usage:status');
      if (!mountedRef.current || seq !== antigravitySeqRef.current) return;
      const next = result as AntigravityUsageEnvelope | null;
      if (hasValidAntigravityWindows(next) || next?.usage?.status === 'unauthenticated' || next?.usage?.status === 'not_installed') {
        setAntigravityUsage(next);
        return;
      }
      setAntigravityUsage((prev: unknown) =>
        hasValidAntigravityWindows(prev)
          ? { ...(prev as AntigravityUsageEnvelope), refreshError: next?.usage?.message ?? 'Could not refresh Antigravity usage.' }
          : next
      );
    } catch {
      if (!mountedRef.current || seq !== antigravitySeqRef.current) return;
      setAntigravityUsage((prev: unknown) =>
        hasValidAntigravityWindows(prev)
          ? { ...(prev as AntigravityUsageEnvelope), refreshError: 'Could not refresh Antigravity usage.' }
          : { supported: false }
      );
    } finally {
      if (mountedRef.current && seq === antigravitySeqRef.current) {
        setAntigravityRefreshing(false);
      }
    }
  }, []);

  const hasAntigravity = dashboard?.providers.some((provider) => provider.providerId === 'antigravity' && provider.available) ?? false;
  useEffect(() => {
    if (!hasAntigravity) {
      antigravitySeqRef.current += 1;
      setAntigravityUsage(null);
      setAntigravityRefreshing(false);
      return;
    }
    void probeAntigravityDirect();
  }, [hasAntigravity, probeAntigravityDirect, quotaRefresh]);

  useRealtime(REALTIME_CHANNEL, () => {
    void loadAll();
  });

  async function handleRefreshNow() {
    setRefreshing(true);
    try {
      await rpcRef.current.call(RPC_METHODS.refreshNow);
      setQuotaRefresh((value) => value + 1);
      await loadAll();
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }

  async function handleRefreshProvider(providerId: string) {
    setRefreshingProviders((prev) => {
      const next = new Set(prev);
      next.add(providerId);
      return next;
    });
    try {
      await Promise.all([
        rpcRef.current.call(RPC_METHODS.refreshProvider, { providerId }),
        providerId === 'antigravity' ? probeAntigravityDirect() : Promise.resolve()
      ]);
      await loadAll();
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mountedRef.current) {
        setRefreshingProviders((prev) => {
          const next = new Set(prev);
          next.delete(providerId);
          return next;
        });
      }
    }
  }

  async function handleSaveBudget(input: BudgetRuleInput) {
    await rpcRef.current.call(RPC_METHODS.setBudget, input);
    await loadAll();
  }

  async function handleDeleteBudget(id: string) {
    await rpcRef.current.call(RPC_METHODS.deleteBudget, { id });
    await loadAll();
  }

  async function handleSavePricing(rule: Omit<ModelPricingRule, 'isOverride'>) {
    await rpcRef.current.call(RPC_METHODS.setPricingOverride, rule);
    await loadAll();
  }

  async function handleDeletePricing(pattern: string) {
    await rpcRef.current.call(RPC_METHODS.deletePricingOverride, { pattern });
    await loadAll();
  }

  async function handleUpdateProviderOrder(prefs: ProviderOrderPrefs) {
    setDashboard((prev) => (prev ? { ...prev, providerOrder: prefs } : prev));
    try {
      const saved = (await rpcRef.current.call(RPC_METHODS.setProviderOrder, prefs)) as ProviderOrderPrefs | undefined;
      if (mountedRef.current && saved) {
        setDashboard((prev) => (prev ? { ...prev, providerOrder: saved } : prev));
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  const boundarySummary = formatRangeBoundarySummary(dashboard?.kpis.rangeBounds);
  const isGlobalRefreshing = refreshing || Boolean(dashboard?.isSyncing);
  const refreshingProviderIds = new Set<string>(refreshingProviders);
  if (dashboard) {
    if (isGlobalRefreshing) {
      for (const provider of dashboard.providers) {
        if (provider.available && provider.status !== 'not_installed') {
          refreshingProviderIds.add(provider.providerId);
        }
      }
    }
    if (hasAntigravity && antigravityRefreshing) {
      refreshingProviderIds.add('antigravity');
    }
  }

  return (
    <div className="aum-root">
      <header className="aum-topbar">
        <div className="aum-title-wrap">
          <div className="aum-badge-icon">AI</div>
          <div>
            <h1 className="aum-title">AI Usage Monitor</h1>
            <div className="aum-subtext">Cross-provider quotas, spend, credits &amp; telemetry</div>
          </div>
        </div>

        <div className="aum-controls">
          <div className="aum-seg" role="group" aria-label="Time range">
            {(['today', '7d', 'last_week', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={range === r ? 'active' : ''}
                onClick={() => setRange(r)}
              >
                {rangeLabel(r)}
              </button>
            ))}
          </div>

          <span
            className="aum-subtext aum-mono"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            {isGlobalRefreshing && <ReloadSpinner />}
            <span>
              {isGlobalRefreshing ? 'Syncing telemetry...' : `Synced ${formatRelativeTime(dashboard?.lastSyncedAtMs)}`}
            </span>
          </span>

          <button
            type="button"
            className="aum-btn aum-btn-primary"
            disabled={refreshing}
            onClick={() => void handleRefreshNow()}
          >
            {refreshing && <ReloadSpinner />}
            <span>{refreshing ? 'Refreshing...' : 'Refresh Quotas'}</span>
          </button>
        </div>
      </header>

      <nav className="aum-subtabs" aria-label="Dashboard sections">
        <div className="aum-tablist" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'overview'}
            className={tab === 'overview' ? 'aum-tab active' : 'aum-tab'}
            onClick={() => setTab('overview')}
          >
            Overview &amp; Quotas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'models'}
            className={tab === 'models' ? 'aum-tab active' : 'aum-tab'}
            onClick={() => setTab('models')}
          >
            Models, Spend &amp; Budgets
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'logs'}
            className={tab === 'logs' ? 'aum-tab active' : 'aum-tab'}
            onClick={() => setTab('logs')}
          >
            Usage &amp; Error Logs
            <span className="aum-pill aum-pill-neutral">{logs.totalCount}</span>
          </button>
        </div>
        {boundarySummary && <span className="aum-chip">{boundarySummary}</span>}
      </nav>

      <main className="aum-scroll">
        {error && <div className="aum-banner aum-banner-error">{error}</div>}

        {loading && !dashboard ? (
          <div className="aum-card">
            <div className="aum-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ReloadSpinner />
              <span>Indexing Zana thread telemetry and probing provider quotas...</span>
            </div>
          </div>
        ) : dashboard ? (
          <>
            {tab === 'overview' && (
              <OverviewTab
                data={
                  antigravityUsage
                    ? {
                        ...dashboard,
                        providers: dashboard.providers.map((p) =>
                          p.providerId === 'antigravity' ? applyAntigravityUsage(p, antigravityUsage) : p
                        )
                      }
                    : dashboard
                }
                onJumpToTab={setTab}
                onUpdateProviderOrder={handleUpdateProviderOrder}
                onRefreshProvider={handleRefreshProvider}
                refreshingProviderIds={refreshingProviderIds}
                isRefreshing={isGlobalRefreshing}
              />
            )}
            {tab === 'models' && (
              <ModelsSpendTab
                data={dashboard}
                onSaveBudget={handleSaveBudget}
                onDeleteBudget={handleDeleteBudget}
                onSavePricing={handleSavePricing}
                onDeletePricing={handleDeletePricing}
              />
            )}
            {tab === 'logs' && (
              <LogsTab
                logs={logs}
                kindFilter={logKind}
                searchQuery={logSearch}
                onKindChange={setLogKind}
                onSearchChange={setLogSearch}
              />
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
