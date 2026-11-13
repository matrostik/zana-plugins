import { useEffect, useState } from 'react';
import { isProviderIssueStatus, OverviewSummary } from './OverviewSummary.tsx';
import {
  DEFAULT_PROVIDER_ORDER,
  mergeCustomOrder,
  moveProviderWithinVisible,
  reorderProviderToTarget,
  sortProviders
} from '../shared/provider-order.ts';
import type {
  CloudConnectorStatus,
  DashboardPayload,
  OpenCodeLocalRangeKey,
  OpenCodeLocalStatsSnapshot,
  ProviderOrderPrefs,
  ProviderQuotaSnapshot,
  ProviderSortMode,
  QuotaWindowStatus,
  TimeRangeKey
} from '../shared/types.ts';
import {
  formatCountdown,
  formatShortLocalDateTime,
  formatTokens,
  formatUsd,
  providerBadgeCode,
  providerColor
} from './format.ts';

interface OverviewTabProps {
  data: DashboardPayload;
  onJumpToTab: (tab: 'overview' | 'models' | 'logs') => void;
  onUpdateProviderOrder?: (prefs: ProviderOrderPrefs) => void | Promise<void>;
  onRefreshProvider?: (providerId: string) => void | Promise<void>;
  refreshingProviderIds?: ReadonlySet<string>;
  isRefreshing?: boolean;
}

type ProviderFilter = 'all' | 'limited' | 'api' | 'historical';

type ResolvedProviderSnapshot = ProviderQuotaSnapshot & { visibleModels: string[] };

const SHORT_RANGE_PREFIX: Record<TimeRangeKey, string> = {
  today: 'Today',
  '7d': '7d',
  last_week: 'Last wk',
  '30d': '30d',
  all: 'All-time'
};

export function ReloadSpinner({ label, spinning = true }: { label?: string; spinning?: boolean }) {
  return (
    <svg
      className={spinning ? 'aum-spinner' : undefined}
      width="12"
      height="12"
      style={{ width: 12, height: 12, flexShrink: 0, display: 'inline-block' }}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M13.5 2.5v2.75H10.75" />
    </svg>
  );
}

function pillClassForQuota(status: ProviderQuotaSnapshot['status'] | QuotaWindowStatus): string {
  if (status === 'blocked' || status === 'error' || status === 'expired') return 'aum-pill aum-pill-rose';
  if (status === 'warning' || status === 'unauthenticated') return 'aum-pill aum-pill-amber';
  if (status === 'ok' || status === 'allowed') return 'aum-pill aum-pill-emerald';
  return 'aum-pill aum-pill-neutral';
}

function barColorForPercent(usedPercent: number | null, status: QuotaWindowStatus): string {
  if (status === 'blocked' || (usedPercent !== null && usedPercent >= 95)) return '#f43f5e';
  if (status === 'warning' || (usedPercent !== null && usedPercent >= 75)) return '#f59e0b';
  return '#10b981';
}

function renderStatusLabel(prov: ProviderQuotaSnapshot): string {
  if (prov.status === 'blocked') return 'Blocked / Limit';
  if (prov.status === 'warning') {
    const minLeft = prov.windows.reduce<number | null>(
      (acc, w) => (w.remainingPercent !== null && (acc === null || w.remainingPercent < acc) ? w.remainingPercent : acc),
      null
    );
    return minLeft !== null ? `${minLeft}% Left` : 'Warning';
  }
  if (prov.status === 'unauthenticated') return 'Sign-in Needed';
  if (prov.status === 'not_installed') return 'Not Installed';
  if (prov.status === 'expired') return 'Expired';
  if (prov.status === 'error') return 'Probe Error';
  return prov.billingMode === 'billed_api' ? 'Pay-As-You-Go' : prov.billingMode === 'free' ? 'Free / Local' : 'Healthy';
}

function resolveVisibleProvider(prov: ProviderQuotaSnapshot): ResolvedProviderSnapshot {
  const visibleModels =
    prov.providerId === 'antigravity'
      ? prov.configuredModels.filter((model) => /^(?:google\/)?gemini(?:[-/]|$)/i.test(model))
      : prov.configuredModels;
  const visibleWindows =
    prov.providerId === 'antigravity'
      ? prov.windows.filter((window) => {
          const group = window.label.split(' — ')[0].trim();
          return (
            /^(?:google|gemini)\b/i.test(group) ||
            (!window.label.includes(' — ') && /^(?:five.hour|5.hour|weekly|week)\b/i.test(group))
          );
        })
      : prov.windows;
  const visibleStatus =
    prov.providerId === 'antigravity' &&
    visibleWindows.length !== prov.windows.length &&
    (prov.status === 'ok' || prov.status === 'warning' || prov.status === 'blocked')
      ? visibleWindows.some((window) => window.status === 'blocked')
        ? 'blocked'
        : visibleWindows.some((window) => window.status === 'warning')
          ? 'warning'
          : 'ok'
      : prov.status;
  return { ...prov, windows: visibleWindows, status: visibleStatus, visibleModels };
}

function ConnectorBadge({ connector }: { connector: CloudConnectorStatus }) {
  const isUnqualifiedOpenCode =
    connector.provider === 'opencode' &&
    connector.status === 'ok' &&
    connector.qualificationState === 'unqualified' &&
    connector.creditRemainingUsd === null;

  const cls =
    connector.status === 'ok'
      ? isUnqualifiedOpenCode
        ? 'aum-pill aum-pill-amber'
        : 'aum-pill aum-pill-emerald'
      : connector.status === 'error'
        ? 'aum-pill aum-pill-rose'
        : 'aum-pill aum-pill-neutral';

  const label =
    connector.status === 'ok'
      ? isUnqualifiedOpenCode
        ? 'Balance Pending'
        : connector.creditRemainingUsd !== null
          ? `${formatUsd(connector.creditRemainingUsd)} left`
          : `${formatUsd(connector.reportedSpendUsd)} MTD`
      : connector.status === 'error'
        ? connector.qualificationState === 'permission_required'
          ? '403 Scope Error'
          : 'Error'
        : 'Optional Key';

  const detail =
    connector.status === 'error'
      ? connector.errorMessage
      : isUnqualifiedOpenCode
        ? (connector.balanceStatusMessage ?? 'Go/budgets synced; prepaid balance endpoint awaiting qualification')
        : connector.configured
          ? 'Synced via Plugin Settings API key'
          : (connector.balanceStatusMessage ?? 'Add optional secret key in Plugin Settings');

  return (
    <div className="aum-window-box" style={{ flex: '1 1 220px' }}>
      <div className="aum-row-between">
        <strong style={{ fontSize: 12, textTransform: 'capitalize' }}>{connector.provider}</strong>
        <span className={cls}>{label}</span>
      </div>
      <div className="aum-subtext aum-mono">{detail}</div>
    </div>
  );
}

function defaultOpenCodeRange(snapshot: OpenCodeLocalStatsSnapshot): OpenCodeLocalRangeKey {
  if (snapshot.periods.today.sessions > 0) return 'today';
  if (snapshot.periods['7d'].sessions > 0) return '7d';
  if (snapshot.periods.all.sessions > 0) return 'all';
  return 'today';
}

function OpenCodeLocalStatsCard({
  snapshot,
  isRefreshing
}: {
  snapshot: OpenCodeLocalStatsSnapshot;
  isRefreshing: boolean;
}) {
  const [localRange, setLocalRange] = useState<OpenCodeLocalRangeKey>(() => defaultOpenCodeRange(snapshot));
  const [showModels, setShowModels] = useState(true);
  const period = snapshot.periods[localRange];
  const rangeText =
    period.fromMs !== null && period.toMs !== null
      ? `${formatShortLocalDateTime(period.fromMs)} → ${formatShortLocalDateTime(period.toMs)}`
      : 'Local CLI session archive';

  return (
    <div className={isRefreshing && snapshot.installed ? 'aum-card aum-card-refreshing' : 'aum-card'}>
      <div className="aum-row-between">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13 }}>Local OpenCode CLI Stats</strong>
            <span className="aum-pill aum-pill-cyan">Separate Local Scope</span>
            {snapshot.cliVersion && <span className="aum-chip">{snapshot.cliVersion}</span>}
            {isRefreshing && snapshot.installed && (
              <span
                className="aum-refresh-badge"
                role="status"
                aria-label="Refreshing OpenCode local stats"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <ReloadSpinner />
                <span>Refreshing</span>
              </span>
            )}
          </div>
          <div className="aum-subtext">
            Imported from <span className="aum-mono">opencode stats --json</span>. Kept separate from Zana thread totals and Cloud Billing so overlapping turns are never double-counted.
          </div>
        </div>
        {snapshot.installed && (
          <div className="aum-seg" role="group" aria-label="OpenCode local stats range">
            <button type="button" className={localRange === 'today' ? 'active' : ''} onClick={() => setLocalRange('today')}>
              Today (--days 0)
            </button>
            <button type="button" className={localRange === '7d' ? 'active' : ''} onClick={() => setLocalRange('7d')}>
              Last 7 Days (--days 7)
            </button>
            <button type="button" className={localRange === 'all' ? 'active' : ''} onClick={() => setLocalRange('all')}>
              All Time (--all)
            </button>
          </div>
        )}
      </div>

      {!snapshot.installed ? (
        <div className="aum-window-box aum-muted">
          {snapshot.errorMessage || 'OpenCode CLI not detected on PATH. Install opencode to view local CLI statistics.'}
        </div>
      ) : period.errorMessage ? (
        <div className="aum-banner aum-banner-error">{period.errorMessage}</div>
      ) : (
        <>
          <div className="aum-banner aum-banner-info">
            <span className="aum-mono" style={{ fontSize: 11 }}>
              Report range: {rangeText} • Local data only (not cloud billing)
            </span>
            {period.models.length > 0 && (
              <button type="button" className="aum-btn aum-btn-sm" onClick={() => setShowModels((v) => !v)}>
                {showModels ? 'Hide Models' : `Show Models (${period.models.length})`}
              </button>
            )}
          </div>

          <div className="aum-kpi-grid">
            <div className="aum-window-box">
              <div className="aum-card-label">Sessions / Subagents</div>
              <div className="aum-mono" style={{ fontSize: 16, fontWeight: 700 }}>
                {period.sessions} <span className="aum-subtext">({period.subagents} sub)</span>
              </div>
            </div>
            <div className="aum-window-box">
              <div className="aum-card-label">Prompts / Steps</div>
              <div className="aum-mono" style={{ fontSize: 16, fontWeight: 700 }}>
                {period.prompts} <span className="aum-subtext">/ {period.steps}</span>
              </div>
            </div>
            <div className="aum-window-box">
              <div className="aum-card-label">Tokens (Cache Read)</div>
              <div className="aum-mono" style={{ fontSize: 16, fontWeight: 700 }}>
                {formatTokens(period.totalTokens)} <span className="aum-subtext">({formatTokens(period.cacheReadTokens)} read)</span>
              </div>
            </div>
            <div className="aum-window-box">
              <div className="aum-card-label">Local Est. Cost</div>
              <div className="aum-mono" style={{ fontSize: 16, fontWeight: 700 }}>
                {formatUsd(period.costUsd)} <span className="aum-subtext">{period.activeDays}d active</span>
              </div>
            </div>
          </div>

          {period.sessions === 0 ? (
            <div className="aum-window-box aum-muted">
              No local OpenCode sessions recorded in this window. Zero locally does not mean zero account usage across other machines or Console workspaces.
            </div>
          ) : showModels && period.models.length > 0 ? (
            <div className="aum-table-wrap">
              <table className="aum-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Upstream ProviderID</th>
                    <th>Steps</th>
                    <th>Tokens</th>
                    <th style={{ textAlign: 'right' }}>Local Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {period.models.slice(0, 12).map((m, idx) => (
                    <tr key={`${m.providerId}:${m.modelId}:${m.variant ?? idx}`}>
                      <td className="aum-mono" style={{ fontWeight: 600 }}>
                        {m.modelId}
                        {m.variant ? <span className="aum-subtext"> ({m.variant})</span> : null}
                      </td>
                      <td className="aum-mono aum-subtext">{m.providerId}</td>
                      <td className="aum-mono">{m.steps}</td>
                      <td className="aum-mono">{formatTokens(m.totalTokens)}</td>
                      <td className="aum-mono" style={{ textAlign: 'right' }}>{formatUsd(m.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

interface ProviderCardProps {
  prov: ResolvedProviderSnapshot;
  index: number;
  totalCount: number;
  range: TimeRangeKey;
  reordering: boolean;
  isCardRefreshing: boolean;
  isDragged: boolean;
  isDragOver: boolean;
  onRefreshProvider?: (providerId: string) => void | Promise<void>;
  onMoveProvider: (providerId: string, delta: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

function ProviderCard({
  prov,
  index,
  totalCount,
  range,
  reordering,
  isCardRefreshing,
  isDragged,
  isDragOver,
  onRefreshProvider,
  onMoveProvider,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop
}: ProviderCardProps) {
  const color = providerColor(prov.providerId);
  const { visibleModels, windows: visibleWindows, status: visibleStatus } = prov;
  const baseCls =
    visibleStatus === 'blocked' || visibleStatus === 'error' || visibleStatus === 'expired'
      ? 'aum-card aum-card-rose'
      : visibleStatus === 'warning' || visibleStatus === 'unauthenticated'
        ? 'aum-card aum-card-amber'
        : 'aum-card';
  const cardCls = [
    baseCls,
    isCardRefreshing && !isProviderIssueStatus(visibleStatus) ? 'aum-card-refreshing' : '',
    reordering ? 'aum-card-reordering' : '',
    isDragged ? 'aum-card-dragging' : '',
    isDragOver ? 'aum-card-drag-over' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      data-provider-id={prov.providerId}
      className={cardCls}
      draggable={reordering}
      onDragStart={reordering ? onDragStart : undefined}
      onDragEnd={reordering ? onDragEnd : undefined}
      onDragOver={reordering ? onDragOver : undefined}
      onDragLeave={reordering ? onDragLeave : undefined}
      onDrop={reordering ? onDrop : undefined}
    >
      {reordering && (
        <div className="aum-reorder-bar">
          <span className="aum-subtext aum-mono">#{index + 1} • Drag</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              className="aum-btn aum-btn-sm"
              aria-label={`Move ${prov.displayName} earlier`}
              disabled={index === 0}
              onClick={() => onMoveProvider(prov.providerId, -1)}
            >
              ←
            </button>
            <button
              type="button"
              className="aum-btn aum-btn-sm"
              aria-label={`Move ${prov.displayName} later`}
              disabled={index === totalCount - 1}
              onClick={() => onMoveProvider(prov.providerId, 1)}
            >
              →
            </button>
          </div>
        </div>
      )}

      <div className="aum-prov-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <div
            className="aum-prov-avatar"
            style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
          >
            {providerBadgeCode(prov.providerId)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {prov.displayName}
            </div>
            <div className="aum-subtext aum-mono">
              {prov.planLabel ?? prov.source}
              {prov.accountLabel ? ` • ${prov.accountLabel}` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {isCardRefreshing && (
            <span
              className="aum-refresh-badge"
              role="status"
              aria-label={`Refreshing ${prov.displayName} quota`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <ReloadSpinner />
              <span>Refreshing</span>
            </span>
          )}
          <span className={pillClassForQuota(visibleStatus)}>{renderStatusLabel(prov)}</span>
          {onRefreshProvider && !isCardRefreshing && (
            <button
              type="button"
              className="aum-icon-btn"
              aria-label={`Refresh ${prov.displayName}`}
              title={`Refresh ${prov.displayName} quota`}
              onClick={() => void onRefreshProvider(prov.providerId)}
            >
              <ReloadSpinner spinning={false} />
            </button>
          )}
        </div>
      </div>

      {visibleWindows.length > 0 ? (
        <>
          {visibleWindows.map((win) => (
            <div key={win.key} className="aum-window-box">
              <div className="aum-row-between aum-mono" style={{ fontSize: 11 }}>
                <span>{win.label}</span>
                <span style={{ color: barColorForPercent(win.usedPercent, win.status) }}>
                  {win.usedPercent !== null
                    ? `${win.usedPercent}% used • ${win.remainingPercent}% left`
                    : win.status}
                </span>
              </div>
              {win.usedPercent !== null && (
                <div className="aum-bar-track">
                  <div
                    className="aum-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, win.usedPercent))}%`,
                      background: barColorForPercent(win.usedPercent, win.status)
                    }}
                  />
                </div>
              )}
              <div className="aum-subtext aum-mono">
                {win.limitUsdCents
                  ? `${formatUsd((win.usedUsdCents ?? 0) / 100)} / ${formatUsd(win.limitUsdCents / 100)} • `
                  : ''}
                {formatCountdown(win.resetsAtIso)}
              </div>
            </div>
          ))}
          {prov.errorMessage && <div className="aum-subtext aum-mono aum-stale-warn">{prov.errorMessage}</div>}
        </>
      ) : (
        <div className="aum-window-box">
          <div className="aum-row-between aum-mono" style={{ fontSize: 11 }}>
            <span>{prov.creditRemainingUsd !== null ? 'Prepaid Wallet' : 'Telemetry Tracking'}</span>
            <span>{prov.available ? 'Active' : 'Historical'}</span>
          </div>
          <div className="aum-subtext aum-mono">
            {prov.errorMessage
              ? prov.errorMessage
              : prov.creditRemainingUsd !== null
                ? `Credits left: ${formatUsd(prov.creditRemainingUsd)}${prov.creditLimitUsd ? ` of ${formatUsd(prov.creditLimitUsd)}` : ''}`
                : 'Tracks tokens, context, fallbacks & errors from threads'}
          </div>
        </div>
      )}

      {visibleModels.length > 0 && (
        <div className="aum-chip-row">
          {visibleModels.slice(0, 4).map((m) => (
            <span key={m} className="aum-chip">
              {m}
            </span>
          ))}
          {visibleModels.length > 4 && <span className="aum-chip">+{visibleModels.length - 4} more</span>}
        </div>
      )}

      <div className="aum-card-footer aum-mono">
        <span>
          {SHORT_RANGE_PREFIX[range]}: {formatTokens(prov.totalTokens)} tok • {prov.turnCount} turns
        </span>
        <strong style={{ color: '#e2e8f0' }}>
          {prov.billedCostUsd !== null
            ? `${formatUsd(prov.billedCostUsd)} billed`
            : prov.billingMode === 'free'
              ? '$0.00 local'
              : `~${formatUsd(prov.estimatedCostUsd)} equiv`}
        </strong>
      </div>
    </div>
  );
}

export function OverviewTab({
  data,
  onJumpToTab,
  onUpdateProviderOrder,
  onRefreshProvider,
  refreshingProviderIds,
  isRefreshing
}: OverviewTabProps) {
  const [filter, setFilter] = useState<ProviderFilter>('all');
  const [orderPrefs, setOrderPrefs] = useState<ProviderOrderPrefs>(() => data.providerOrder ?? DEFAULT_PROVIDER_ORDER);
  const [reordering, setReordering] = useState(false);
  const [draggedProviderId, setDraggedProviderId] = useState<string | null>(null);
  const [dragOverProviderId, setDragOverProviderId] = useState<string | null>(null);

  useEffect(() => {
    if (data.providerOrder) {
      setOrderPrefs(data.providerOrder);
    }
  }, [data.providerOrder]);

  const globalRefreshing = Boolean(isRefreshing || data.isSyncing);
  const hasConfiguredConnectors = data.cloudConnectors.some((c) => c.configured);

  const resolvedProviders = data.providers.map(resolveVisibleProvider);
  const installedProviders = resolvedProviders.filter((p) => p.available && p.status !== 'not_installed');
  const issueCount = installedProviders.filter((p) => isProviderIssueStatus(p.status)).length;
  const apiCount = installedProviders.filter((p) => p.billingMode === 'billed_api' || p.creditRemainingUsd !== null).length;
  const historicalProviders = resolvedProviders.filter((p) => p.turnCount > 0 || p.totalTokens > 0);
  const filteredProviders = (filter === 'historical' ? historicalProviders : installedProviders).filter((p) => {
    if (filter === 'limited') return isProviderIssueStatus(p.status);
    if (filter === 'api') return p.billingMode === 'billed_api' || p.creditRemainingUsd !== null;
    return true;
  });

  const sortedProviders = sortProviders(filteredProviders, orderPrefs);
  const visibleIds = sortedProviders.map((p) => p.providerId);

  function commitOrder(next: ProviderOrderPrefs) {
    setOrderPrefs(next);
    void onUpdateProviderOrder?.(next);
  }

  function handleSelectFilter(nextFilter: ProviderFilter) {
    setFilter(nextFilter);
    setReordering(false);
    setDraggedProviderId(null);
    setDragOverProviderId(null);
  }

  function handleSelectSortMode(mode: ProviderSortMode) {
    if (mode !== 'custom') {
      setReordering(false);
      setDraggedProviderId(null);
      setDragOverProviderId(null);
      commitOrder({ ...orderPrefs, sortMode: mode });
      return;
    }
    const nextCustomOrder =
      orderPrefs.customOrder.length > 0
        ? orderPrefs.customOrder
        : sortProviders(installedProviders, orderPrefs).map((p) => p.providerId);
    commitOrder({ sortMode: 'custom', customOrder: nextCustomOrder });
  }

  function handleEnterReorder() {
    const displayed = sortProviders(installedProviders, orderPrefs).map((p) => p.providerId);
    const seeded =
      orderPrefs.sortMode === 'custom' && orderPrefs.customOrder.length > 0
        ? mergeCustomOrder(orderPrefs.customOrder, displayed)
        : mergeCustomOrder(displayed, orderPrefs.customOrder);
    setFilter('all');
    setReordering(true);
    commitOrder({ sortMode: 'custom', customOrder: seeded });
  }

  function handleResetToUsage() {
    setReordering(false);
    setDraggedProviderId(null);
    setDragOverProviderId(null);
    commitOrder({ sortMode: 'usage', customOrder: [] });
  }

  function handleMoveProvider(providerId: string, delta: -1 | 1) {
    const nextCustom = moveProviderWithinVisible(orderPrefs.customOrder, visibleIds, providerId, delta);
    commitOrder({ sortMode: 'custom', customOrder: nextCustom });
  }

  function handleDropProvider(targetId: string) {
    if (!draggedProviderId || draggedProviderId === targetId) return;
    const nextCustom = reorderProviderToTarget(orderPrefs.customOrder, visibleIds, draggedProviderId, targetId);
    setDraggedProviderId(null);
    setDragOverProviderId(null);
    commitOrder({ sortMode: 'custom', customOrder: nextCustom });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <OverviewSummary
        data={data}
        providers={resolvedProviders}
        onJumpToTab={onJumpToTab}
        onFocusIssueProviders={() => handleSelectFilter('limited')}
        onRefreshProvider={onRefreshProvider}
      />

      <div className="aum-row-between">
        <div>
          <strong style={{ fontSize: 14 }}>Configured Providers &amp; Live Subscription Quotas</strong>
          <div className="aum-subtext">
            Discovered from ZCC provider registry, thread telemetry events, host quota probes &amp; cloud billing APIs
          </div>
        </div>
        <div className="aum-prov-controls">
          <div className="aum-seg" role="group" aria-label="Filter providers">
            <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => handleSelectFilter('all')}>
              All ({installedProviders.length})
            </button>
            <button type="button" className={filter === 'limited' ? 'active' : ''} onClick={() => handleSelectFilter('limited')}>
              Near Limit ({issueCount})
            </button>
            <button type="button" className={filter === 'api' ? 'active' : ''} onClick={() => handleSelectFilter('api')}>
              Paid API / Credits ({apiCount})
            </button>
            <button type="button" className={filter === 'historical' ? 'active' : ''} onClick={() => handleSelectFilter('historical')}>
              Historical ({historicalProviders.length})
            </button>
          </div>

          <div className="aum-seg" role="group" aria-label="Sort providers">
            <button
              type="button"
              className={orderPrefs.sortMode === 'usage' ? 'active' : ''}
              onClick={() => handleSelectSortMode('usage')}
            >
              By Usage
            </button>
            <button
              type="button"
              className={orderPrefs.sortMode === 'quota' ? 'active' : ''}
              onClick={() => handleSelectSortMode('quota')}
            >
              Tightest Quota
            </button>
            <button
              type="button"
              className={orderPrefs.sortMode === 'custom' ? 'active' : ''}
              onClick={() => handleSelectSortMode('custom')}
            >
              Custom
            </button>
          </div>

          {!reordering ? (
            <button
              type="button"
              className="aum-btn aum-btn-sm"
              disabled={installedProviders.length < 2}
              onClick={handleEnterReorder}
            >
              Reorder
            </button>
          ) : (
            <>
              <button type="button" className="aum-btn aum-btn-sm" onClick={handleResetToUsage}>
                Reset to Usage
              </button>
              <button type="button" className="aum-btn aum-btn-primary aum-btn-sm" onClick={() => setReordering(false)}>
                Done
              </button>
            </>
          )}
        </div>
      </div>

      {reordering && (
        <div className="aum-banner aum-banner-info">
          <span>
            <strong>Reorder mode:</strong> Drag provider cards or use <span className="aum-mono">← / →</span> to set priority. Changes save automatically; newly discovered providers append by usage.
          </span>
        </div>
      )}

      {sortedProviders.length === 0 ? (
        <div className="aum-card">
          <div className="aum-muted">No providers match the selected filter yet. Click Refresh Quotas or start a thread in Zana.</div>
        </div>
      ) : (
        <div className="aum-prov-grid">
          {sortedProviders.map((prov, index) => {
            const isCardRefreshing =
              (refreshingProviderIds?.has(prov.providerId) ?? false) ||
              (globalRefreshing && prov.available && prov.status !== 'not_installed');
            return (
              <ProviderCard
                key={prov.providerId}
                prov={prov}
                index={index}
                totalCount={sortedProviders.length}
                range={data.kpis.range}
                reordering={reordering}
                isCardRefreshing={isCardRefreshing}
                isDragged={draggedProviderId === prov.providerId}
                isDragOver={dragOverProviderId === prov.providerId && draggedProviderId !== prov.providerId}
                onRefreshProvider={onRefreshProvider}
                onMoveProvider={handleMoveProvider}
                onDragStart={() => setDraggedProviderId(prov.providerId)}
                onDragEnd={() => {
                  setDraggedProviderId(null);
                  setDragOverProviderId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverProviderId !== prov.providerId) {
                    setDragOverProviderId(prov.providerId);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverProviderId === prov.providerId) {
                    setDragOverProviderId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropProvider(prov.providerId);
                }}
              />
            );
          })}
        </div>
      )}

      {data.opencodeLocal && (data.opencodeLocal.installed || data.opencodeLocal.errorMessage) && (
        <OpenCodeLocalStatsCard snapshot={data.opencodeLocal} isRefreshing={globalRefreshing} />
      )}

      <div className={globalRefreshing && hasConfiguredConnectors ? 'aum-card aum-card-refreshing' : 'aum-card'}>
        <div className="aum-row-between">
          <div>
            <strong style={{ fontSize: 13 }}>Cloud Billing &amp; Credits Connectors</strong>
            <div className="aum-subtext">Optional secret-stored keys in ZCC Plugin Settings for exact API billing &amp; prepaid wallets</div>
          </div>
          {globalRefreshing && hasConfiguredConnectors && (
            <span
              className="aum-refresh-badge"
              role="status"
              aria-label="Refreshing cloud billing connectors"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <ReloadSpinner />
              <span>Refreshing</span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {data.cloudConnectors.map((c) => (
            <ConnectorBadge key={c.provider} connector={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
