import { useEffect, useState, type ReactNode } from 'react';
import { useRealtime, type PluginNavPanelProps } from '@zana-ai/zcc-plugin-sdk/app';
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
import { applyAntigravityUsage } from './antigravity-usage.ts';
import { formatRangeBoundarySummary, formatRelativeTime } from './format.ts';
import { LogsTab } from './LogsTab.tsx';
import { ModelsSpendTab } from './ModelsSpendTab.tsx';
import { OverviewTab, ReloadSpinner } from './OverviewTab.tsx';
import {
  useAntigravityUsage,
  useDashboardData,
  useMountedRef,
  usePanelActions,
  useRpcRef,
  type PanelActions
} from './panel-hooks.ts';
import { ensureStylesInjected } from './styles.ts';

type ActiveTab = 'overview' | 'models' | 'logs';

const RANGE_OPTIONS: readonly TimeRangeKey[] = ['today', '7d', 'last_week', '30d', 'all'];

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

/** Provider cards that should spin: explicit per-card refreshes plus every live provider during a global sync. */
function collectRefreshingProviderIds(args: {
  dashboard: DashboardPayload | null;
  perProvider: ReadonlySet<string>;
  isGlobalRefreshing: boolean;
  antigravityRefreshing: boolean;
}): Set<string> {
  const ids = new Set<string>(args.perProvider);
  if (!args.dashboard) return ids;
  if (args.isGlobalRefreshing) {
    for (const provider of args.dashboard.providers) {
      if (provider.available && provider.status !== 'not_installed') ids.add(provider.providerId);
    }
  }
  if (args.antigravityRefreshing) ids.add('antigravity');
  return ids;
}

function PanelTopBar({ range, onRangeChange, isGlobalRefreshing, lastSyncedAtMs, refreshing, onRefreshNow }: {
  range: TimeRangeKey;
  onRangeChange: (range: TimeRangeKey) => void;
  isGlobalRefreshing: boolean;
  lastSyncedAtMs: number | null | undefined;
  refreshing: boolean;
  onRefreshNow: () => void;
}) {
  return (
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
          {RANGE_OPTIONS.map((r) => (
            <button key={r} type="button" className={range === r ? 'active' : ''} onClick={() => onRangeChange(r)}>
              {rangeLabel(r)}
            </button>
          ))}
        </div>
        <span className="aum-subtext aum-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {isGlobalRefreshing && <ReloadSpinner />}
          <span>{isGlobalRefreshing ? 'Syncing telemetry...' : `Synced ${formatRelativeTime(lastSyncedAtMs)}`}</span>
        </span>
        <button type="button" className="aum-btn aum-btn-primary" disabled={refreshing} onClick={onRefreshNow}>
          {refreshing && <ReloadSpinner />}
          <span>{refreshing ? 'Refreshing...' : 'Refresh Quotas'}</span>
        </button>
      </div>
    </header>
  );
}

function TabButton({ id, active, onSelect, children }: {
  id: ActiveTab;
  active: ActiveTab;
  onSelect: (tab: ActiveTab) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active === id}
      className={active === id ? 'aum-tab active' : 'aum-tab'}
      onClick={() => onSelect(id)}
    >
      {children}
    </button>
  );
}

function PanelSubtabs({ tab, onTabChange, logCount, boundarySummary }: {
  tab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  logCount: number;
  boundarySummary: string | null;
}) {
  return (
    <nav className="aum-subtabs" aria-label="Dashboard sections">
      <div className="aum-tablist" role="tablist">
        <TabButton id="overview" active={tab} onSelect={onTabChange}>Overview &amp; Quotas</TabButton>
        <TabButton id="models" active={tab} onSelect={onTabChange}>Models, Spend &amp; Budgets</TabButton>
        <TabButton id="logs" active={tab} onSelect={onTabChange}>
          Usage &amp; Error Logs
          <span className="aum-pill aum-pill-neutral">{logCount}</span>
        </TabButton>
      </div>
      {boundarySummary && <span className="aum-chip">{boundarySummary}</span>}
    </nav>
  );
}

interface LogFilters {
  kind: LogEventKind | 'all';
  search: string;
  onKindChange: (kind: LogEventKind | 'all') => void;
  onSearchChange: (search: string) => void;
}

function PanelTabContent(props: {
  tab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  dashboard: DashboardPayload;
  logs: LogsResponse;
  logFilters: LogFilters;
  actions: PanelActions;
  antigravityUsage: unknown;
  refreshingProviderIds: ReadonlySet<string>;
  isGlobalRefreshing: boolean;
}) {
  const { tab, dashboard, actions, logFilters } = props;
  const { runMutation } = actions;
  if (tab === 'models') {
    return (
      <ModelsSpendTab
        data={dashboard}
        onSaveBudget={(input: BudgetRuleInput) => runMutation(RPC_METHODS.setBudget, input)}
        onDeleteBudget={(id: string) => runMutation(RPC_METHODS.deleteBudget, { id })}
        onSavePricing={(rule: Omit<ModelPricingRule, 'isOverride'>) => runMutation(RPC_METHODS.setPricingOverride, rule)}
        onDeletePricing={(pattern: string) => runMutation(RPC_METHODS.deletePricingOverride, { pattern })}
      />
    );
  }
  if (tab === 'logs') {
    return (
      <LogsTab
        logs={props.logs}
        kindFilter={logFilters.kind}
        searchQuery={logFilters.search}
        onKindChange={logFilters.onKindChange}
        onSearchChange={logFilters.onSearchChange}
      />
    );
  }
  const overviewData = props.antigravityUsage
    ? {
        ...dashboard,
        providers: dashboard.providers.map((p) =>
          p.providerId === 'antigravity' ? applyAntigravityUsage(p, props.antigravityUsage) : p
        )
      }
    : dashboard;
  return (
    <OverviewTab
      data={overviewData}
      onJumpToTab={props.onTabChange}
      onUpdateProviderOrder={actions.updateProviderOrder}
      onRefreshProvider={actions.refreshProvider}
      refreshingProviderIds={props.refreshingProviderIds}
      isRefreshing={props.isGlobalRefreshing}
    />
  );
}

/** Wires the panel's view state, data loading, Antigravity overlay, and actions together. */
function useUsageMonitorState(subPath: string | undefined) {
  const rpcRef = useRpcRef();
  const mountedRef = useMountedRef();
  const [tab, setTab] = useState<ActiveTab>(() => initialTabFromSubPath(subPath));
  const [range, setRange] = useState<TimeRangeKey>('30d');
  const [logKind, setLogKind] = useState<LogEventKind | 'all'>('all');
  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
    ensureStylesInjected();
  }, []);

  const data = useDashboardData({ rpcRef, mountedRef, range, logKind, logSearch });
  const { dashboard, loadAll } = data;
  const hasAntigravity = dashboard?.providers.some((p) => p.providerId === 'antigravity' && p.available) ?? false;
  const antigravity = useAntigravityUsage(hasAntigravity, mountedRef);
  const actions = usePanelActions({ rpcRef, mountedRef, data, antigravity });

  useRealtime(REALTIME_CHANNEL, () => {
    void loadAll();
  });

  const isGlobalRefreshing = actions.refreshing || Boolean(dashboard?.isSyncing);
  const refreshingProviderIds = collectRefreshingProviderIds({
    dashboard, perProvider: actions.refreshingProviders, isGlobalRefreshing,
    antigravityRefreshing: hasAntigravity && antigravity.refreshing
  });
  const logFilters: LogFilters = { kind: logKind, search: logSearch, onKindChange: setLogKind, onSearchChange: setLogSearch };
  return { tab, setTab, range, setRange, logFilters, data, antigravity, actions, isGlobalRefreshing, refreshingProviderIds };
}

export function UsageMonitorPanel({ subPath }: Partial<PluginNavPanelProps>) {
  const { tab, setTab, range, setRange, logFilters, data, antigravity, actions, isGlobalRefreshing, refreshingProviderIds } =
    useUsageMonitorState(subPath);
  const { dashboard, loading, error } = data;

  return (
    <div className="aum-root">
      <PanelTopBar
        range={range}
        onRangeChange={setRange}
        isGlobalRefreshing={isGlobalRefreshing}
        lastSyncedAtMs={dashboard?.lastSyncedAtMs}
        refreshing={actions.refreshing}
        onRefreshNow={() => void actions.refreshNow()}
      />
      <PanelSubtabs
        tab={tab}
        onTabChange={setTab}
        logCount={dashboard?.kpis.logCount ?? 0}
        boundarySummary={formatRangeBoundarySummary(dashboard?.kpis.rangeBounds)}
      />
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
          <PanelTabContent
            tab={tab}
            onTabChange={setTab}
            dashboard={dashboard}
            logs={data.logs}
            logFilters={logFilters}
            actions={actions}
            antigravityUsage={antigravity.usage}
            refreshingProviderIds={refreshingProviderIds}
            isGlobalRefreshing={isGlobalRefreshing}
          />
        ) : null}
      </main>
    </div>
  );
}
