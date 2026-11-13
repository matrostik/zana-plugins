import { useState } from 'react';
import type { CloudConnectorStatus, DashboardPayload, ProviderQuotaSnapshot, QuotaWindowStatus } from '../shared/types.ts';
import { formatCountdown, formatTokens, formatUsd, providerBadgeCode, providerColor } from './format.ts';

interface OverviewTabProps {
  data: DashboardPayload;
  onJumpToTab: (tab: 'overview' | 'models' | 'logs') => void;
}

type ProviderFilter = 'all' | 'limited' | 'api' | 'historical';

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

function ConnectorBadge({ connector }: { connector: CloudConnectorStatus }) {
  const cls =
    connector.status === 'ok'
      ? 'aum-pill aum-pill-emerald'
      : connector.status === 'error'
        ? 'aum-pill aum-pill-rose'
        : 'aum-pill aum-pill-neutral';
  const label =
    connector.status === 'ok'
      ? connector.creditRemainingUsd !== null
        ? `${formatUsd(connector.creditRemainingUsd)} left`
        : `${formatUsd(connector.reportedSpendUsd)} MTD`
      : connector.status === 'error'
        ? 'Error'
        : 'Optional Key';

  return (
    <div className="aum-window-box" style={{ flex: '1 1 220px' }}>
      <div className="aum-row-between">
        <strong style={{ fontSize: 12, textTransform: 'capitalize' }}>{connector.provider}</strong>
        <span className={cls}>{label}</span>
      </div>
      <div className="aum-subtext aum-mono">
        {connector.status === 'error'
          ? connector.errorMessage
          : connector.configured
            ? 'Synced via Plugin Settings API key'
            : 'Add optional secret key in Plugin Settings'}
      </div>
    </div>
  );
}

export function OverviewTab({ data, onJumpToTab }: OverviewTabProps) {
  const [filter, setFilter] = useState<ProviderFilter>('all');
  const { kpis } = data;
  const billedPct = kpis.totalValueUsd > 0 ? Math.min(100, (kpis.billedSpendUsd / kpis.totalValueUsd) * 100) : 0;
  const subPct = kpis.totalValueUsd > 0 ? Math.max(0, 100 - billedPct) : 0;

  const installedProviders = data.providers.filter((p) => p.available && p.status !== 'not_installed');
  const historicalProviders = data.providers.filter((p) => p.turnCount > 0 || p.totalTokens > 0);
  const filteredProviders = (filter === 'historical' ? historicalProviders : installedProviders).filter((p) => {
    if (filter === 'limited') return p.status === 'warning' || p.status === 'blocked' || p.status === 'error';
    if (filter === 'api') return p.billingMode === 'billed_api' || p.creditRemainingUsd !== null;
    return true;
  });

  const activeBudgets = data.budgets.filter((b) => b.rule.enabled);
  const topBudget = activeBudgets[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="aum-kpi-grid">
        <div className="aum-card">
          <div className="aum-card-label">
            <span>Total Value ({kpis.range})</span>
            <span className="aum-pill aum-pill-indigo">{kpis.turnCount} turns</span>
          </div>
          <div className="aum-kpi-val">{formatUsd(kpis.totalValueUsd)}</div>
          <div className="aum-bar-track">
            <div className="aum-bar-fill" style={{ width: `${billedPct}%`, background: '#6366f1' }} />
            <div className="aum-bar-fill" style={{ width: `${subPct}%`, background: '#10b981' }} />
          </div>
          <div className="aum-row-between aum-subtext aum-mono">
            <span>{formatUsd(kpis.billedSpendUsd)} Billed</span>
            <span>{formatUsd(kpis.subscriptionEquivUsd)} Sub Equiv</span>
          </div>
        </div>

        <div className="aum-card">
          <div className="aum-card-label">
            <span>Credits &amp; Prepaid Left</span>
            <span className="aum-pill aum-pill-cyan">Balances</span>
          </div>
          <div className="aum-kpi-val" style={{ color: kpis.cloudCreditsRemainingUsd !== null ? '#34d399' : undefined }}>
            {kpis.cloudCreditsRemainingUsd !== null ? formatUsd(kpis.cloudCreditsRemainingUsd) : '—'}
          </div>
          <div className="aum-bar-track">
            <div
              className="aum-bar-fill"
              style={{
                width:
                  kpis.cloudCreditsRemainingUsd !== null && kpis.cloudCreditsTotalLimitUsd
                    ? `${Math.min(100, (kpis.cloudCreditsRemainingUsd / kpis.cloudCreditsTotalLimitUsd) * 100)}%`
                    : '0%',
                background: '#10b981'
              }}
            />
          </div>
          <div className="aum-subtext aum-mono">
            {kpis.cloudCreditsRemainingUsd !== null
              ? `of ${formatUsd(kpis.cloudCreditsTotalLimitUsd)} total limit`
              : `${formatTokens(kpis.totalTokens)} tok (${kpis.cacheHitPercent}% cached)`}
          </div>
        </div>

        <div className={kpis.tightestQuota && kpis.tightestQuota.remainingPercent <= 25 ? 'aum-card aum-card-amber' : 'aum-card'}>
          <div className="aum-card-label">
            <span>Tightest Subscription Window</span>
            <span className="aum-mono">{kpis.tightestQuota?.displayName ?? 'None'}</span>
          </div>
          <div className="aum-row-between">
            <div className="aum-kpi-val" style={{ color: kpis.tightestQuota && kpis.tightestQuota.remainingPercent <= 25 ? '#fbbf24' : '#34d399' }}>
              {kpis.tightestQuota ? `${kpis.tightestQuota.remainingPercent}% Left` : 'Unbounded'}
            </div>
            {kpis.tightestQuota && (
              <span className="aum-pill aum-pill-amber">{formatCountdown(kpis.tightestQuota.resetsAtIso)}</span>
            )}
          </div>
          <div className="aum-bar-track">
            <div
              className="aum-bar-fill"
              style={{
                width: kpis.tightestQuota ? `${Math.max(0, 100 - kpis.tightestQuota.remainingPercent)}%` : '0%',
                background: kpis.tightestQuota && kpis.tightestQuota.remainingPercent <= 25 ? '#f59e0b' : '#10b981'
              }}
            />
          </div>
          <div className="aum-subtext aum-mono">{kpis.tightestQuota?.windowLabel ?? 'Live quota windows populate on probe'}</div>
        </div>

        <div className={kpis.alertCount > 0 ? 'aum-card aum-card-amber' : 'aum-card'}>
          <div className="aum-card-label">
            <span>Budgets &amp; Telemetry</span>
            <button className="aum-btn aum-btn-sm" type="button" onClick={() => onJumpToTab('models')}>
              Rules ({activeBudgets.length})
            </button>
          </div>
          <div className="aum-row-between">
            <div className="aum-kpi-val">{kpis.alertCount > 0 ? `${kpis.alertCount} Alert${kpis.alertCount === 1 ? '' : 's'}` : 'On Track'}</div>
            <span className={kpis.alertCount > 0 ? 'aum-pill aum-pill-amber' : 'aum-pill aum-pill-emerald'}>
              {kpis.logCount} logs
            </span>
          </div>
          <div className="aum-bar-track">
            <div
              className="aum-bar-fill"
              style={{
                width: topBudget ? `${Math.min(100, topBudget.percentUsed)}%` : '0%',
                background: topBudget?.status === 'exceeded' ? '#f43f5e' : '#6366f1'
              }}
            />
          </div>
          <div className="aum-subtext aum-mono">
            {topBudget ? `${topBudget.rule.name}: ${topBudget.percentUsed}% used` : 'Add a budget cap in Models & Budgets'}
          </div>
        </div>
      </div>

      <div className="aum-row-between">
        <div>
          <strong style={{ fontSize: 14 }}>Configured Providers &amp; Live Subscription Quotas</strong>
          <div className="aum-subtext">
            Discovered from ZCC provider registry, thread telemetry events, host quota probes &amp; cloud billing APIs
          </div>
        </div>
        <div className="aum-seg">
          <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            All ({installedProviders.length})
          </button>
          <button type="button" className={filter === 'limited' ? 'active' : ''} onClick={() => setFilter('limited')}>
            Near Limit ({installedProviders.filter((p) => p.status === 'warning' || p.status === 'blocked' || p.status === 'error').length})
          </button>
          <button type="button" className={filter === 'api' ? 'active' : ''} onClick={() => setFilter('api')}>
            Paid API / Credits ({installedProviders.filter((p) => p.billingMode === 'billed_api' || p.creditRemainingUsd !== null).length})
          </button>
          <button type="button" className={filter === 'historical' ? 'active' : ''} onClick={() => setFilter('historical')}>
            Historical ({historicalProviders.length})
          </button>
        </div>
      </div>

      {filteredProviders.length === 0 ? (
        <div className="aum-card">
          <div className="aum-muted">No providers match the selected filter yet. Click Refresh Quotas or start a thread in Zana.</div>
        </div>
      ) : (
        <div className="aum-prov-grid">
          {filteredProviders.map((prov) => {
            const color = providerColor(prov.providerId);
            const cardCls =
              prov.status === 'blocked' || prov.status === 'error'
                ? 'aum-card aum-card-rose'
                : prov.status === 'warning'
                  ? 'aum-card aum-card-amber'
                  : 'aum-card';
            return (
              <div key={prov.providerId} className={cardCls}>
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
                  <span className={pillClassForQuota(prov.status)}>{renderStatusLabel(prov)}</span>
                </div>

                {prov.windows.length > 0 ? (
                  prov.windows.map((win) => (
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
                  ))
                ) : (
                  <div className="aum-window-box">
                    <div className="aum-row-between aum-mono" style={{ fontSize: 11 }}>
                      <span>Telemetry Tracking</span>
                      <span>{prov.available ? 'Active' : 'Unavailable'}</span>
                    </div>
                    <div className="aum-subtext aum-mono">
                      {prov.errorMessage
                        ? prov.errorMessage
                        : prov.creditRemainingUsd !== null
                          ? `Credits left: ${formatUsd(prov.creditRemainingUsd)}`
                          : 'Tracks tokens, context, fallbacks & errors from threads'}
                    </div>
                  </div>
                )}

                {prov.configuredModels.length > 0 && (
                  <div className="aum-chip-row">
                    {prov.configuredModels.slice(0, 4).map((m) => (
                      <span key={m} className="aum-chip">
                        {m}
                      </span>
                    ))}
                    {prov.configuredModels.length > 4 && (
                      <span className="aum-chip">+{prov.configuredModels.length - 4} more</span>
                    )}
                  </div>
                )}

                <div className="aum-card-footer aum-mono">
                  <span>
                    {formatTokens(prov.totalTokens)} tok • {prov.turnCount} turns
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
          })}
        </div>
      )}

      <div className="aum-card">
        <div className="aum-row-between">
          <div>
            <strong style={{ fontSize: 13 }}>Cloud Billing &amp; Credits Connectors</strong>
            <div className="aum-subtext">Optional secret-stored keys in ZCC Plugin Settings for exact API billing &amp; prepaid wallets</div>
          </div>
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
