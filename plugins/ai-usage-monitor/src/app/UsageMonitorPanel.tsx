import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtime, useRpc, type PluginNavPanelProps } from '@zana-ai/zcc-plugin-sdk/app';
import {
  REALTIME_CHANNEL,
  RPC_METHODS,
  type BudgetRuleInput,
  type DashboardPayload,
  type LogEventKind,
  type LogsResponse,
  type ModelPricingRule,
  type TimeRangeKey
} from '../shared/types.ts';
import { formatRelativeTime } from './format.ts';
import { LogsTab } from './LogsTab.tsx';
import { ModelsSpendTab } from './ModelsSpendTab.tsx';
import { OverviewTab } from './OverviewTab.tsx';
import { ensureStylesInjected } from './styles.ts';

type ActiveTab = 'overview' | 'models' | 'logs';

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

export function UsageMonitorPanel({ subPath }: Partial<PluginNavPanelProps>) {
  const rpc = useRpc();
  const [tab, setTab] = useState<ActiveTab>(() => initialTabFromSubPath(subPath));
  const [range, setRange] = useState<TimeRangeKey>('30d');
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [logs, setLogs] = useState<LogsResponse>(EMPTY_LOGS);
  const [logKind, setLogKind] = useState<LogEventKind | 'all'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    ensureStylesInjected();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchDashboard = useCallback(
    async (targetRange: TimeRangeKey) => {
      const payload = (await rpc.call(RPC_METHODS.dashboard, { range: targetRange })) as DashboardPayload;
      if (mountedRef.current) setDashboard(payload);
    },
    [rpc]
  );

  const fetchLogs = useCallback(
    async (kind: LogEventKind | 'all', search: string) => {
      const payload = (await rpc.call(RPC_METHODS.logs, {
        kind,
        search: search.trim() || undefined,
        limit: 80,
        offset: 0
      })) as LogsResponse;
      if (mountedRef.current) setLogs(payload);
    },
    [rpc]
  );

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

  useRealtime(REALTIME_CHANNEL, () => {
    void loadAll();
  });

  async function handleRefreshNow() {
    setRefreshing(true);
    try {
      await rpc.call(RPC_METHODS.refreshNow);
      await loadAll();
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }

  async function handleSaveBudget(input: BudgetRuleInput) {
    await rpc.call(RPC_METHODS.setBudget, input);
    await loadAll();
  }

  async function handleDeleteBudget(id: string) {
    await rpc.call(RPC_METHODS.deleteBudget, { id });
    await loadAll();
  }

  async function handleSavePricing(rule: Omit<ModelPricingRule, 'isOverride'>) {
    await rpc.call(RPC_METHODS.setPricingOverride, rule);
    await loadAll();
  }

  async function handleDeletePricing(pattern: string) {
    await rpc.call(RPC_METHODS.deletePricingOverride, { pattern });
    await loadAll();
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
            {(['today', '7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={range === r ? 'active' : ''}
                onClick={() => setRange(r)}
              >
                {r === 'today' ? 'Today' : r === 'all' ? 'All' : r.toUpperCase()}
              </button>
            ))}
          </div>

          <span className="aum-subtext aum-mono">
            {dashboard?.isSyncing ? 'Syncing telemetry...' : `Synced ${formatRelativeTime(dashboard?.lastSyncedAtMs)}`}
          </span>

          <button
            type="button"
            className="aum-btn aum-btn-primary"
            disabled={refreshing}
            onClick={() => void handleRefreshNow()}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Quotas'}
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
      </nav>

      <main className="aum-scroll">
        {error && <div className="aum-banner aum-banner-error">{error}</div>}

        {loading && !dashboard ? (
          <div className="aum-card">
            <div className="aum-muted">Indexing Zana thread telemetry and probing provider quotas...</div>
          </div>
        ) : dashboard ? (
          <>
            {tab === 'overview' && <OverviewTab data={dashboard} onJumpToTab={setTab} />}
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
