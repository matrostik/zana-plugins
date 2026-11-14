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
  OpenCodeLocalPeriodStats,
  OpenCodeLocalRangeKey,
  OpenCodeLocalStatsSnapshot,
  OpenCodeModelStat,
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
      width="12" height="12" style={{ width: 12, height: 12, flexShrink: 0, display: 'inline-block' }}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
      aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}
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
      (acc, w) => (w.remainingPercent !== null && (acc === null || w.remainingPercent < acc) ? w.remainingPercent : acc), null
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
  const visibleModels = prov.providerId === 'antigravity'
    ? prov.configuredModels.filter((model) => /^(?:google\/)?gemini(?:[-/]|$)/i.test(model))
    : prov.configuredModels;
  const visibleWindows = prov.providerId === 'antigravity'
    ? prov.windows.filter((window) => {
        const group = window.label.split(' — ')[0].trim();
        return /^(?:google|gemini)\b/i.test(group) || (!window.label.includes(' — ') && /^(?:five.hour|5.hour|weekly|week)\b/i.test(group));
      })
    : prov.windows;
  const shouldDerive = prov.providerId === 'antigravity' && visibleWindows.length !== prov.windows.length &&
    (prov.status === 'ok' || prov.status === 'warning' || prov.status === 'blocked');
  const visibleStatus = shouldDerive
    ? visibleWindows.some((w) => w.status === 'blocked') ? 'blocked' : visibleWindows.some((w) => w.status === 'warning') ? 'warning' : 'ok'
    : prov.status;
  return { ...prov, windows: visibleWindows, status: visibleStatus, visibleModels };
}

function ConnectorBadge({ connector }: { connector: CloudConnectorStatus }) {
  const isUnqualifiedOpenCode = connector.provider === 'opencode' && connector.status === 'ok' &&
    connector.qualificationState === 'unqualified' && connector.creditRemainingUsd === null;
  const cls = connector.status === 'ok'
    ? isUnqualifiedOpenCode ? 'aum-pill aum-pill-amber' : 'aum-pill aum-pill-emerald'
    : connector.status === 'error' ? 'aum-pill aum-pill-rose' : 'aum-pill aum-pill-neutral';
  const label = connector.status === 'ok'
    ? isUnqualifiedOpenCode ? 'Balance Pending'
      : connector.creditRemainingUsd !== null ? `${formatUsd(connector.creditRemainingUsd)} left` : `${formatUsd(connector.reportedSpendUsd)} MTD`
    : connector.status === 'error' ? (connector.qualificationState === 'permission_required' ? '403 Scope Error' : 'Error') : 'Optional Key';
  const detail = connector.status === 'error'
    ? connector.errorMessage
    : isUnqualifiedOpenCode
      ? (connector.balanceStatusMessage ?? 'Go/budgets synced; prepaid balance endpoint awaiting qualification')
      : connector.configured ? 'Synced via Plugin Settings API key' : (connector.balanceStatusMessage ?? 'Add optional secret key in Plugin Settings');

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

function OpenCodeStatsHeader({
  snapshot,
  isRefreshing,
  localRange,
  onRangeChange
}: {
  snapshot: OpenCodeLocalStatsSnapshot;
  isRefreshing: boolean;
  localRange: OpenCodeLocalRangeKey;
  onRangeChange: (next: OpenCodeLocalRangeKey) => void;
}) {
  return (
    <div className="aum-row-between">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13 }}>Local OpenCode CLI Stats</strong>
          <span className="aum-pill aum-pill-cyan">Separate Local Scope</span>
          {snapshot.cliVersion && <span className="aum-chip">{snapshot.cliVersion}</span>}
          {isRefreshing && snapshot.installed && (
            <span className="aum-refresh-badge" role="status" aria-label="Refreshing OpenCode local stats" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ReloadSpinner /><span>Refreshing</span>
            </span>
          )}
        </div>
        <div className="aum-subtext">
          Imported from <span className="aum-mono">opencode stats --json</span>. Kept separate from Zana thread totals and Cloud Billing so overlapping turns are never double-counted.
        </div>
      </div>
      {snapshot.installed && (
        <div className="aum-seg" role="group" aria-label="OpenCode local stats range">
          <button type="button" className={localRange === 'today' ? 'active' : ''} onClick={() => onRangeChange('today')}>Today (--days 0)</button>
          <button type="button" className={localRange === '7d' ? 'active' : ''} onClick={() => onRangeChange('7d')}>Last 7 Days (--days 7)</button>
          <button type="button" className={localRange === 'all' ? 'active' : ''} onClick={() => onRangeChange('all')}>All Time (--all)</button>
        </div>
      )}
    </div>
  );
}

function OpenCodeStatsMetrics({ period }: { period: OpenCodeLocalPeriodStats }) {
  return (
    <div className="aum-kpi-grid">
      <div className="aum-window-box">
        <div className="aum-card-label">Sessions / Subagents</div>
        <div className="aum-mono" style={{ fontSize: 16, fontWeight: 700 }}>{period.sessions} <span className="aum-subtext">({period.subagents} sub)</span></div>
      </div>
      <div className="aum-window-box">
        <div className="aum-card-label">Prompts / Steps</div>
        <div className="aum-mono" style={{ fontSize: 16, fontWeight: 700 }}>{period.prompts} <span className="aum-subtext">/ {period.steps}</span></div>
      </div>
      <div className="aum-window-box">
        <div className="aum-card-label">Tokens (Cache Read)</div>
        <div className="aum-mono" style={{ fontSize: 16, fontWeight: 700 }}>{formatTokens(period.totalTokens)} <span className="aum-subtext">({formatTokens(period.cacheReadTokens)} read)</span></div>
      </div>
      <div className="aum-window-box">
        <div className="aum-card-label">Local Est. Cost</div>
        <div className="aum-mono" style={{ fontSize: 16, fontWeight: 700 }}>{formatUsd(period.costUsd)} <span className="aum-subtext">{period.activeDays}d active</span></div>
      </div>
    </div>
  );
}

function OpenCodeModelsTable({ models }: { models: readonly OpenCodeModelStat[] }) {
  return (
    <div className="aum-table-wrap">
      <table className="aum-table">
        <thead>
          <tr><th>Model</th><th>Upstream ProviderID</th><th>Steps</th><th>Tokens</th><th style={{ textAlign: 'right' }}>Local Cost</th></tr>
        </thead>
        <tbody>
          {models.slice(0, 12).map((m, idx) => (
            <tr key={`${m.providerId}:${m.modelId}:${m.variant ?? idx}`}>
              <td className="aum-mono" style={{ fontWeight: 600 }}>{m.modelId}{m.variant ? <span className="aum-subtext"> ({m.variant})</span> : null}</td>
              <td className="aum-mono aum-subtext">{m.providerId}</td>
              <td className="aum-mono">{m.steps}</td>
              <td className="aum-mono">{formatTokens(m.totalTokens)}</td>
              <td className="aum-mono" style={{ textAlign: 'right' }}>{formatUsd(m.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpenCodeLocalStatsCard({ snapshot, isRefreshing }: { snapshot: OpenCodeLocalStatsSnapshot; isRefreshing: boolean }) {
  const [localRange, setLocalRange] = useState<OpenCodeLocalRangeKey>(() => defaultOpenCodeRange(snapshot));
  const [showModels, setShowModels] = useState(true);
  const period = snapshot.periods[localRange];
  const rangeText = period.fromMs !== null && period.toMs !== null
    ? `${formatShortLocalDateTime(period.fromMs)} → ${formatShortLocalDateTime(period.toMs)}`
    : 'Local CLI session archive';

  return (
    <div className={isRefreshing && snapshot.installed ? 'aum-card aum-card-refreshing' : 'aum-card'}>
      <OpenCodeStatsHeader snapshot={snapshot} isRefreshing={isRefreshing} localRange={localRange} onRangeChange={setLocalRange} />
      {!snapshot.installed ? (
        <div className="aum-window-box aum-muted">{snapshot.errorMessage || 'OpenCode CLI not detected on PATH. Install opencode to view local CLI statistics.'}</div>
      ) : period.errorMessage ? (
        <div className="aum-banner aum-banner-error">{period.errorMessage}</div>
      ) : (
        <>
          <div className="aum-banner aum-banner-info">
            <span className="aum-mono" style={{ fontSize: 11 }}>Report range: {rangeText} • Local data only (not cloud billing)</span>
            {period.models.length > 0 && (
              <button type="button" className="aum-btn aum-btn-sm" onClick={() => setShowModels((v) => !v)}>
                {showModels ? 'Hide Models' : `Show Models (${period.models.length})`}
              </button>
            )}
          </div>
          <OpenCodeStatsMetrics period={period} />
          {period.sessions === 0 ? (
            <div className="aum-window-box aum-muted">No local OpenCode sessions recorded in this window. Zero locally does not mean zero account usage across other machines or Console workspaces.</div>
          ) : showModels && period.models.length > 0 ? <OpenCodeModelsTable models={period.models} /> : null}
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

function ProviderReorderBar({ index, totalCount, displayName, providerId, onMoveProvider }: {
  index: number; totalCount: number; displayName: string; providerId: string;
  onMoveProvider: (providerId: string, delta: -1 | 1) => void;
}) {
  return (
    <div className="aum-reorder-bar">
      <span className="aum-subtext aum-mono">#{index + 1} • Drag</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button type="button" className="aum-btn aum-btn-sm" aria-label={`Move ${displayName} earlier`} disabled={index === 0} onClick={() => onMoveProvider(providerId, -1)}>←</button>
        <button type="button" className="aum-btn aum-btn-sm" aria-label={`Move ${displayName} later`} disabled={index === totalCount - 1} onClick={() => onMoveProvider(providerId, 1)}>→</button>
      </div>
    </div>
  );
}

function ProviderCardHeader({ prov, isCardRefreshing, onRefreshProvider }: {
  prov: ResolvedProviderSnapshot; isCardRefreshing: boolean; onRefreshProvider?: (providerId: string) => void | Promise<void>;
}) {
  const color = providerColor(prov.providerId);
  return (
    <div className="aum-prov-head">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <div className="aum-prov-avatar" style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>{providerBadgeCode(prov.providerId)}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prov.displayName}</div>
          <div className="aum-subtext aum-mono">{prov.planLabel ?? prov.source}{prov.accountLabel ? ` • ${prov.accountLabel}` : ''}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {isCardRefreshing && (
          <span className="aum-refresh-badge" role="status" aria-label={`Refreshing ${prov.displayName} quota`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ReloadSpinner /><span>Refreshing</span>
          </span>
        )}
        <span className={pillClassForQuota(prov.status)}>{renderStatusLabel(prov)}</span>
        {onRefreshProvider && !isCardRefreshing && (
          <button type="button" className="aum-icon-btn" aria-label={`Refresh ${prov.displayName}`} title={`Refresh ${prov.displayName} quota`} onClick={() => void onRefreshProvider(prov.providerId)}>
            <ReloadSpinner spinning={false} />
          </button>
        )}
      </div>
    </div>
  );
}

function ProviderWindowsBody({ prov }: { prov: ResolvedProviderSnapshot }) {
  if (prov.windows.length === 0) {
    return (
      <div className="aum-window-box">
        <div className="aum-row-between aum-mono" style={{ fontSize: 11 }}>
          <span>{prov.creditRemainingUsd !== null ? 'Prepaid Wallet' : 'Telemetry Tracking'}</span>
          <span>{prov.available ? 'Active' : 'Historical'}</span>
        </div>
        <div className="aum-subtext aum-mono">
          {prov.errorMessage ?? (prov.creditRemainingUsd !== null
            ? `Credits left: ${formatUsd(prov.creditRemainingUsd)}${prov.creditLimitUsd ? ` of ${formatUsd(prov.creditLimitUsd)}` : ''}`
            : 'Tracks tokens, context, fallbacks & errors from threads')}
        </div>
      </div>
    );
  }
  return (
    <>
      {prov.windows.map((win) => (
        <div key={win.key} className="aum-window-box">
          <div className="aum-row-between aum-mono" style={{ fontSize: 11 }}>
            <span>{win.label}</span>
            <span style={{ color: barColorForPercent(win.usedPercent, win.status) }}>
              {win.usedPercent !== null ? `${win.usedPercent}% used • ${win.remainingPercent}% left` : win.status}
            </span>
          </div>
          {win.usedPercent !== null && (
            <div className="aum-bar-track">
              <div className="aum-bar-fill" style={{ width: `${Math.min(100, Math.max(0, win.usedPercent))}%`, background: barColorForPercent(win.usedPercent, win.status) }} />
            </div>
          )}
          <div className="aum-subtext aum-mono">
            {win.limitUsdCents ? `${formatUsd((win.usedUsdCents ?? 0) / 100)} / ${formatUsd(win.limitUsdCents / 100)} • ` : ''}{formatCountdown(win.resetsAtIso)}
          </div>
        </div>
      ))}
      {prov.errorMessage && <div className="aum-subtext aum-mono aum-stale-warn">{prov.errorMessage}</div>}
    </>
  );
}

function ProviderCard(props: ProviderCardProps) {
  const { prov, range, reordering, isCardRefreshing, isDragged, isDragOver } = props;
  const baseCls = prov.status === 'blocked' || prov.status === 'error' || prov.status === 'expired'
    ? 'aum-card aum-card-rose'
    : prov.status === 'warning' || prov.status === 'unauthenticated' ? 'aum-card aum-card-amber' : 'aum-card';
  const cardCls = [
    baseCls, isCardRefreshing && !isProviderIssueStatus(prov.status) ? 'aum-card-refreshing' : '',
    reordering ? 'aum-card-reordering' : '', isDragged ? 'aum-card-dragging' : '', isDragOver ? 'aum-card-drag-over' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      data-provider-id={prov.providerId} className={cardCls} draggable={reordering}
      onDragStart={reordering ? props.onDragStart : undefined} onDragEnd={reordering ? props.onDragEnd : undefined}
      onDragOver={reordering ? props.onDragOver : undefined} onDragLeave={reordering ? props.onDragLeave : undefined}
      onDrop={reordering ? props.onDrop : undefined}
    >
      {reordering && <ProviderReorderBar index={props.index} totalCount={props.totalCount} displayName={prov.displayName} providerId={prov.providerId} onMoveProvider={props.onMoveProvider} />}
      <ProviderCardHeader prov={prov} isCardRefreshing={isCardRefreshing} onRefreshProvider={props.onRefreshProvider} />
      <ProviderWindowsBody prov={prov} />
      {prov.visibleModels.length > 0 && (
        <div className="aum-chip-row">
          {prov.visibleModels.slice(0, 4).map((m) => <span key={m} className="aum-chip">{m}</span>)}
          {prov.visibleModels.length > 4 && <span className="aum-chip">+{prov.visibleModels.length - 4} more</span>}
        </div>
      )}
      <div className="aum-card-footer aum-mono">
        <span>{SHORT_RANGE_PREFIX[range]}: {formatTokens(prov.totalTokens)} tok • {prov.turnCount} turns</span>
        <strong style={{ color: '#e2e8f0' }}>
          {prov.billedCostUsd !== null ? `${formatUsd(prov.billedCostUsd)} billed` : prov.billingMode === 'free' ? '$0.00 local' : `~${formatUsd(prov.estimatedCostUsd)} equiv`}
        </strong>
      </div>
    </div>
  );
}

function ProvidersToolbar(args: {
  filter: ProviderFilter;
  orderPrefs: ProviderOrderPrefs;
  reordering: boolean;
  counts: { all: number; limited: number; api: number; historical: number };
  onSelectFilter: (f: ProviderFilter) => void;
  onSelectSortMode: (m: ProviderSortMode) => void;
  onEnterReorder: () => void;
  onResetToUsage: () => void;
  onExitReorder: () => void;
}) {
  return (
    <div className="aum-row-between">
      <div>
        <strong style={{ fontSize: 14 }}>Configured Providers &amp; Live Subscription Quotas</strong>
        <div className="aum-subtext">Discovered from ZCC provider registry, thread telemetry events, host quota probes &amp; cloud billing APIs</div>
      </div>
      <div className="aum-prov-controls">
        <div className="aum-seg" role="group" aria-label="Filter providers">
          <button type="button" className={args.filter === 'all' ? 'active' : ''} onClick={() => args.onSelectFilter('all')}>All ({args.counts.all})</button>
          <button type="button" className={args.filter === 'limited' ? 'active' : ''} onClick={() => args.onSelectFilter('limited')}>Near Limit ({args.counts.limited})</button>
          <button type="button" className={args.filter === 'api' ? 'active' : ''} onClick={() => args.onSelectFilter('api')}>Paid API / Credits ({args.counts.api})</button>
          <button type="button" className={args.filter === 'historical' ? 'active' : ''} onClick={() => args.onSelectFilter('historical')}>Historical ({args.counts.historical})</button>
        </div>
        <div className="aum-seg" role="group" aria-label="Sort providers">
          <button type="button" className={args.orderPrefs.sortMode === 'usage' ? 'active' : ''} onClick={() => args.onSelectSortMode('usage')}>By Usage</button>
          <button type="button" className={args.orderPrefs.sortMode === 'quota' ? 'active' : ''} onClick={() => args.onSelectSortMode('quota')}>Tightest Quota</button>
          <button type="button" className={args.orderPrefs.sortMode === 'custom' ? 'active' : ''} onClick={() => args.onSelectSortMode('custom')}>Custom</button>
        </div>
        {!args.reordering ? (
          <button type="button" className="aum-btn aum-btn-sm" disabled={args.counts.all < 2} onClick={args.onEnterReorder}>Reorder</button>
        ) : (
          <>
            <button type="button" className="aum-btn aum-btn-sm" onClick={args.onResetToUsage}>Reset to Usage</button>
            <button type="button" className="aum-btn aum-btn-primary aum-btn-sm" onClick={args.onExitReorder}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}

function CloudConnectorsCard({ connectors, globalRefreshing }: { connectors: CloudConnectorStatus[]; globalRefreshing: boolean }) {
  const hasConfigured = connectors.some((c) => c.configured);
  return (
    <div className={globalRefreshing && hasConfigured ? 'aum-card aum-card-refreshing' : 'aum-card'}>
      <div className="aum-row-between">
        <div>
          <strong style={{ fontSize: 13 }}>Cloud Billing &amp; Credits Connectors</strong>
          <div className="aum-subtext">Optional secret-stored keys in ZCC Plugin Settings for exact API billing &amp; prepaid wallets</div>
        </div>
        {globalRefreshing && hasConfigured && (
          <span className="aum-refresh-badge" role="status" aria-label="Refreshing cloud billing connectors" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ReloadSpinner /><span>Refreshing</span>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {connectors.map((c) => <ConnectorBadge key={c.provider} connector={c} />)}
      </div>
    </div>
  );
}

function useOverviewOrdering(installedProviders: ResolvedProviderSnapshot[], orderPrefs: ProviderOrderPrefs, setOrderPrefs: (n: ProviderOrderPrefs) => void, onUpdate?: (p: ProviderOrderPrefs) => void | Promise<void>) {
  const [filter, setFilter] = useState<ProviderFilter>('all');
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const commitOrder = (next: ProviderOrderPrefs) => { setOrderPrefs(next); void onUpdate?.(next); };
  const clearDrag = () => { setDraggedId(null); setDragOverId(null); };
  const selectFilter = (next: ProviderFilter) => { setFilter(next); setReordering(false); clearDrag(); };
  const selectSortMode = (mode: ProviderSortMode) => {
    if (mode !== 'custom') { setReordering(false); clearDrag(); commitOrder({ ...orderPrefs, sortMode: mode }); return; }
    const customOrder = orderPrefs.customOrder.length > 0 ? orderPrefs.customOrder : sortProviders(installedProviders, orderPrefs).map((p) => p.providerId);
    commitOrder({ sortMode: 'custom', customOrder });
  };
  const enterReorder = () => {
    const displayed = sortProviders(installedProviders, orderPrefs).map((p) => p.providerId);
    const seeded = orderPrefs.sortMode === 'custom' && orderPrefs.customOrder.length > 0 ? mergeCustomOrder(orderPrefs.customOrder, displayed) : mergeCustomOrder(displayed, orderPrefs.customOrder);
    setFilter('all'); setReordering(true); commitOrder({ sortMode: 'custom', customOrder: seeded });
  };
  return { filter, reordering, setReordering, draggedId, setDraggedId, dragOverId, setDragOverId, selectFilter, selectSortMode, enterReorder, resetToUsage: () => { setReordering(false); clearDrag(); commitOrder({ sortMode: 'usage', customOrder: [] }); }, commitOrder, clearDrag };
}

function ProviderGridSection(args: {
  sortedProviders: ResolvedProviderSnapshot[];
  range: TimeRangeKey;
  orderPrefs: ProviderOrderPrefs;
  refreshingProviderIds?: ReadonlySet<string>;
  globalRefreshing: boolean;
  onRefreshProvider?: (providerId: string) => void | Promise<void>;
  state: ReturnType<typeof useOverviewOrdering>;
}) {
  const { sortedProviders, range, orderPrefs, refreshingProviderIds, globalRefreshing, onRefreshProvider, state } = args;
  if (sortedProviders.length === 0) {
    return <div className="aum-card"><div className="aum-muted">No providers match the selected filter yet. Click Refresh Quotas or start a thread in Zana.</div></div>;
  }
  const visibleIds = sortedProviders.map((p) => p.providerId);
  return (
    <div className="aum-prov-grid">
      {sortedProviders.map((prov, index) => (
        <ProviderCard
          key={prov.providerId} prov={prov} index={index} totalCount={sortedProviders.length} range={range}
          reordering={state.reordering}
          isCardRefreshing={(refreshingProviderIds?.has(prov.providerId) ?? false) || (globalRefreshing && prov.available && prov.status !== 'not_installed')}
          isDragged={state.draggedId === prov.providerId} isDragOver={state.dragOverId === prov.providerId && state.draggedId !== prov.providerId}
          onRefreshProvider={onRefreshProvider}
          onMoveProvider={(id, d) => state.commitOrder({ sortMode: 'custom', customOrder: moveProviderWithinVisible(orderPrefs.customOrder, visibleIds, id, d) })}
          onDragStart={() => state.setDraggedId(prov.providerId)} onDragEnd={state.clearDrag}
          onDragOver={(e) => { e.preventDefault(); if (state.dragOverId !== prov.providerId) state.setDragOverId(prov.providerId); }}
          onDragLeave={() => { if (state.dragOverId === prov.providerId) state.setDragOverId(null); }}
          onDrop={(e) => { e.preventDefault(); if (state.draggedId && state.draggedId !== prov.providerId) { const next = reorderProviderToTarget(orderPrefs.customOrder, visibleIds, state.draggedId, prov.providerId); state.clearDrag(); state.commitOrder({ sortMode: 'custom', customOrder: next }); } }}
        />
      ))}
    </div>
  );
}

export function OverviewTab({ data, onJumpToTab, onUpdateProviderOrder, onRefreshProvider, refreshingProviderIds, isRefreshing }: OverviewTabProps) {
  const [orderPrefs, setOrderPrefs] = useState<ProviderOrderPrefs>(() => data.providerOrder ?? DEFAULT_PROVIDER_ORDER);
  useEffect(() => { if (data.providerOrder) setOrderPrefs(data.providerOrder); }, [data.providerOrder]);
  const resolvedProviders = data.providers.map(resolveVisibleProvider);
  const installedProviders = resolvedProviders.filter((p) => p.available && p.status !== 'not_installed');
  const issueCount = installedProviders.filter((p) => isProviderIssueStatus(p.status)).length;
  const apiCount = installedProviders.filter((p) => p.billingMode === 'billed_api' || p.creditRemainingUsd !== null).length;
  const historicalProviders = resolvedProviders.filter((p) => p.turnCount > 0 || p.totalTokens > 0);
  const state = useOverviewOrdering(installedProviders, orderPrefs, setOrderPrefs, onUpdateProviderOrder);
  const filtered = (state.filter === 'historical' ? historicalProviders : installedProviders).filter((p) =>
    state.filter === 'limited' ? isProviderIssueStatus(p.status) : state.filter === 'api' ? (p.billingMode === 'billed_api' || p.creditRemainingUsd !== null) : true);
  const sortedProviders = sortProviders(filtered, orderPrefs);
  const globalRefreshing = Boolean(isRefreshing || data.isSyncing);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <OverviewSummary data={data} providers={resolvedProviders} onJumpToTab={onJumpToTab} onFocusIssueProviders={() => state.selectFilter('limited')} onRefreshProvider={onRefreshProvider} />
      <ProvidersToolbar
        filter={state.filter} orderPrefs={orderPrefs} reordering={state.reordering}
        counts={{ all: installedProviders.length, limited: issueCount, api: apiCount, historical: historicalProviders.length }}
        onSelectFilter={state.selectFilter} onSelectSortMode={state.selectSortMode} onEnterReorder={state.enterReorder}
        onResetToUsage={state.resetToUsage} onExitReorder={() => state.setReordering(false)}
      />
      {state.reordering && (
        <div className="aum-banner aum-banner-info"><span><strong>Reorder mode:</strong> Drag provider cards or use <span className="aum-mono">← / →</span> to set priority. Changes save automatically; newly discovered providers append by usage.</span></div>
      )}
      <ProviderGridSection
        sortedProviders={sortedProviders} range={data.kpis.range} orderPrefs={orderPrefs}
        refreshingProviderIds={refreshingProviderIds} globalRefreshing={globalRefreshing}
        onRefreshProvider={onRefreshProvider} state={state}
      />
      {data.opencodeLocal && (data.opencodeLocal.installed || data.opencodeLocal.errorMessage) && (
        <OpenCodeLocalStatsCard snapshot={data.opencodeLocal} isRefreshing={globalRefreshing} />
      )}
      <CloudConnectorsCard connectors={data.cloudConnectors} globalRefreshing={globalRefreshing} />
    </div>
  );
}
