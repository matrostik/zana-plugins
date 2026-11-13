import type {
  CloudConnectorStatus,
  DashboardKpis,
  DashboardPayload,
  ProviderQuotaSnapshot,
  ProviderQuotaStatus,
  QuotaWindow
} from '../shared/types.ts';
import {
  formatCountdown,
  formatRelativeTime,
  formatTokens,
  formatUsd,
  providerBadgeCode,
  providerColor
} from './format.ts';

export interface OverviewSummaryProps {
  data: DashboardPayload;
  providers: ProviderQuotaSnapshot[];
  onJumpToTab: (tab: 'overview' | 'models' | 'logs') => void;
  onFocusIssueProviders?: () => void;
  onRefreshProvider?: (providerId: string) => void | Promise<void>;
}

const RANGE_LABELS = {
  today: 'Today',
  '7d': 'Last 7 days',
  last_week: 'Last week',
  '30d': 'Last 30 days',
  all: 'All recorded history'
} as const;

export const LOW_QUOTA_REMAINING_PERCENT = 25;

export const PROVIDER_ISSUE_STATUSES = new Set<ProviderQuotaStatus>([
  'warning',
  'blocked',
  'error',
  'expired',
  'unauthenticated'
]);

export function isProviderIssueStatus(status: ProviderQuotaStatus): boolean {
  return PROVIDER_ISSUE_STATUSES.has(status);
}

function UsageValue({ kpis }: { kpis: DashboardKpis }) {
  const billedPct =
    kpis.totalValueUsd > 0 ? Math.min(100, Math.round((kpis.billedSpendUsd / kpis.totalValueUsd) * 100)) : 0;
  const subPct = kpis.totalValueUsd > 0 ? Math.max(0, 100 - billedPct) : 0;

  return (
    <article className="aum-card" aria-label="Estimated usage value">
      <div className="aum-row-between">
        <h3>Estimated usage value</h3>
        <span className="aum-pill aum-pill-indigo">Equiv + Billed</span>
      </div>
      <div className="aum-kpi-val">{formatUsd(kpis.totalValueUsd)}</div>
      <p className="aum-muted">API-price equivalent of recorded usage</p>
      {kpis.totalValueUsd > 0 && (
        <div className="aum-bar-track" aria-hidden="true">
          <div className="aum-bar-fill" style={{ width: `${subPct}%`, background: 'var(--aum-emerald)' }} />
          <div className="aum-bar-fill" style={{ width: `${billedPct}%`, background: 'var(--aum-accent)' }} />
        </div>
      )}
      <div className="aum-row-between">
        <span>Subscription usage estimate</span>
        <strong className="aum-mono">{formatUsd(kpis.subscriptionEquivUsd)}</strong>
      </div>
      <div className="aum-row-between">
        <span>API usage estimate</span>
        <strong className="aum-mono">{formatUsd(kpis.billedSpendUsd)}</strong>
      </div>
      <details className="aum-explanation">
        <summary>What does this amount mean?</summary>
        <p>
          Token-price estimates for recorded subscription and API usage. This is not an invoice or an additional
          subscription charge. Subscription fees are not included; actual charges may differ.
        </p>
      </details>
    </article>
  );
}

function RecordedActivity({ kpis }: { kpis: DashboardKpis }) {
  return (
    <article className="aum-card" aria-label="Recorded activity">
      <div className="aum-row-between">
        <h3>Recorded activity</h3>
        {kpis.subagentTurnCount > 0 && (
          <span className="aum-pill aum-pill-neutral">{kpis.subagentTurnCount} subagent</span>
        )}
      </div>
      <div className="aum-kpi-val">
        {kpis.turnCount} <span className="aum-muted">turns</span>
      </div>
      <div className="aum-row-between">
        <span>Total tokens</span>
        <strong className="aum-mono">{formatTokens(kpis.totalTokens)}</strong>
      </div>
      <div className="aum-row-between aum-subtext aum-mono">
        <span>In: {formatTokens(kpis.inputTokens)}</span>
        <span>Out: {formatTokens(kpis.outputTokens)}</span>
      </div>
      <p className="aum-muted">
        {kpis.inputTokens > 0
          ? `${kpis.cacheHitPercent}% of input tokens served from cache`
          : 'No input tokens recorded'}
      </p>
      <details className="aum-explanation">
        <summary>How are these counted?</summary>
        <p>
          Counts cover usage captured during the selected period. Cached tokens are already included in input tokens.
          Cache percentage is based on input tokens, not total tokens.
        </p>
      </details>
    </article>
  );
}

function BudgetStatus({ data, onJumpToTab }: Pick<OverviewSummaryProps, 'data' | 'onJumpToTab'>) {
  const active = data.budgets.filter((b) => b.rule.enabled);
  const alerts = active.filter((b) => b.status !== 'ok');
  const severity = { exceeded: 2, warning: 1, ok: 0 };
  const top = [...active].sort((a, b) => severity[b.status] - severity[a.status] || b.percentUsed - a.percentUsed)[0];
  const label = !active.length
    ? 'No budget configured'
    : alerts.length
      ? `${alerts.length} budget alert${alerts.length === 1 ? '' : 's'}`
      : 'Within configured thresholds';

  return (
    <article className={alerts.length ? 'aum-card aum-card-amber' : 'aum-card'} aria-label="Budget alerts">
      <div className="aum-row-between">
        <h3>Budget alerts</h3>
        <span className={alerts.length ? 'aum-pill aum-pill-amber' : 'aum-pill aum-pill-neutral'}>
          {active.length} active
        </span>
      </div>
      <div className="aum-summary-status">{label}</div>
      <p className="aum-muted">
        {active.length
          ? `${active.length} active rule${active.length === 1 ? '' : 's'} · Each rule uses its own period.`
          : 'Set a threshold for spending estimates or token usage.'}
      </p>
      {top && (
        <>
          <div
            className="aum-bar-track"
            role="progressbar"
            aria-label="Budget threshold used"
            aria-valuenow={Math.min(100, Math.max(0, top.percentUsed))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${top.percentUsed}% used`}
          >
            <div
              className="aum-bar-fill"
              style={{
                width: `${Math.min(100, Math.max(0, top.percentUsed))}%`,
                background: alerts.length ? 'var(--aum-amber)' : 'var(--aum-accent)'
              }}
            />
          </div>
          <p className="aum-muted">
            {top.rule.name}: {top.percentUsed}% used
          </p>
          <p className="aum-subtext">{formatCountdown(top.resetsAtMs)}</p>
        </>
      )}
      <button className="aum-btn" type="button" onClick={() => onJumpToTab('models')}>
        {active.length ? 'Manage budgets' : 'Set a budget'}
      </button>
      <p className="aum-subtext">Alerts do not stop provider spending.</p>
    </article>
  );
}

interface SubscriptionWindowCandidate {
  provider: ProviderQuotaSnapshot;
  window: QuotaWindow;
}

function listSubscriptionWindows(providers: ProviderQuotaSnapshot[]): SubscriptionWindowCandidate[] {
  // Use the visible snapshots so direct provider refreshes and model filtering also update the summary.
  return providers
    .filter((p) => p.available && p.billingMode === 'subscription' && p.status !== 'not_installed')
    .flatMap((provider) => provider.windows.map((window) => ({ provider, window })))
    .filter(
      ({ window }) =>
        window.remainingPercent !== null && Number.isFinite(window.remainingPercent) && window.status !== 'unknown'
    )
    .sort((a, b) => a.window.remainingPercent! - b.window.remainingPercent!);
}

function SubscriptionLimit({
  providers,
  onRefreshProvider
}: Pick<OverviewSummaryProps, 'providers' | 'onRefreshProvider'>) {
  const candidates = listSubscriptionWindows(providers);
  const closest = candidates[0];
  const secondary = candidates.slice(1, 3);
  const unavailableSubIssues = providers.filter(
    (p) =>
      p.available &&
      p.billingMode === 'subscription' &&
      p.windows.length === 0 &&
      isProviderIssueStatus(p.status)
  );
  const remaining = closest ? Math.max(0, Math.min(100, closest.window.remainingPercent!)) : null;
  const used = remaining === null ? null : Number((100 - remaining).toFixed(2));
  const low = remaining !== null && remaining <= LOW_QUOTA_REMAINING_PERCENT;
  const color = closest ? providerColor(closest.provider.providerId) : '#6366f1';

  return (
    <article
      className={`aum-card aum-summary-quota${low || (!closest && unavailableSubIssues.length > 0) ? ' aum-card-amber' : ''}`}
      aria-label="Closest subscription limit"
    >
      <div className="aum-row-between">
        <h3>Closest subscription limit</h3>
        {closest && onRefreshProvider && (
          <button
            type="button"
            className="aum-btn aum-btn-sm"
            onClick={() => void onRefreshProvider(closest.provider.providerId)}
          >
            Check limit now
          </button>
        )}
      </div>

      {closest ? (
        <>
          <div className="aum-summary-provider">
            <div
              className="aum-prov-avatar"
              style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
            >
              {providerBadgeCode(closest.provider.providerId)}
            </div>
            <div>
              <strong>
                {closest.provider.displayName} · {closest.window.label}
              </strong>
              <div className="aum-subtext aum-mono">
                {closest.provider.planLabel ?? closest.provider.source}
                {closest.provider.accountLabel ? ` · ${closest.provider.accountLabel}` : ''}
              </div>
            </div>
          </div>

          <div className="aum-row-between">
            <strong>{used}% used</strong>
            <strong className={low ? 'aum-summary-warning' : 'aum-summary-remaining'}>{remaining}% remaining</strong>
          </div>
          <div
            className="aum-bar-track"
            role="progressbar"
            aria-label="Subscription quota used"
            aria-valuenow={used!}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="aum-bar-fill"
              style={{ width: `${used}%`, background: low ? 'var(--aum-amber)' : 'var(--aum-emerald)' }}
            />
          </div>
          <p>{formatCountdown(closest.window.resetsAtIso)}</p>

          {secondary.length > 0 && (
            <div className="aum-summary-other-windows">
              {secondary.map(({ provider, window }) => (
                <span key={`${provider.providerId}:${window.key}`} className="aum-chip">
                  {provider.displayName} · {window.label}: {window.remainingPercent}% left
                </span>
              ))}
            </div>
          )}

          <p className="aum-subtext">
            {closest.provider.updatedAtMs
              ? `Updated ${formatRelativeTime(closest.provider.updatedAtMs)}`
              : 'Update time unavailable'}{' '}
            · Source: {closest.provider.source}
          </p>
          {closest.provider.errorMessage && (
            <p className="aum-summary-warning">Latest refresh has an issue. Showing the last reported quota.</p>
          )}
        </>
      ) : (
        <>
          <div className="aum-summary-status">Quota unavailable</div>
          <p className="aum-muted">No usable subscription quota was reported. Remaining capacity is unknown.</p>
          {unavailableSubIssues.length > 0 && (
            <p className="aum-summary-warning">
              {unavailableSubIssues
                .map((p) => `${p.displayName} (${p.status === 'unauthenticated' ? 'sign-in needed' : p.status})`)
                .join(', ')}{' '}
              could not report a quota window.
            </p>
          )}
        </>
      )}

      <details className="aum-explanation">
        <summary>Why is this limit shown?</summary>
        <p>
          The available subscription window with the least reported capacity remaining. The bar shows the percentage
          used. Provider reset windows are independent of the selected usage period.
        </p>
      </details>
    </article>
  );
}

function balanceSourceStatus(connector: CloudConnectorStatus): string {
  if (connector.status === 'error') return 'Balance refresh failed';
  if (!connector.configured || connector.status === 'unconfigured') return 'Connection not configured';
  if (connector.creditRemainingUsd !== null) return `${formatUsd(connector.creditRemainingUsd)} remaining`;
  return connector.balanceStatusMessage || 'No balance reported by this source';
}

function CreditBalance({ data }: Pick<OverviewSummaryProps, 'data'>) {
  const balance = data.kpis.cloudCreditsRemainingUsd;
  const limit = data.kpis.cloudCreditsTotalLimitUsd;
  const failures = data.cloudConnectors.filter((c) => c.status === 'error').length;
  const sources = data.providers.filter((p) => p.creditRemainingUsd !== null);

  return (
    <article className={failures > 0 ? 'aum-card aum-card-amber' : 'aum-card'} aria-label="Credits & prepaid balance">
      <div className="aum-row-between">
        <h3>Credits &amp; prepaid balance</h3>
        {sources.length > 0 && (
          <span className="aum-pill aum-pill-cyan">
            {sources.length} {sources.length === 1 ? 'wallet' : 'wallets'}
          </span>
        )}
      </div>
      <div className={balance === null ? 'aum-summary-status' : 'aum-kpi-val'}>
        {balance === null ? 'Balance unavailable' : formatUsd(balance)}
      </div>
      {balance !== null && limit !== null && limit > 0 && (
        <div className="aum-subtext aum-mono">of {formatUsd(limit)} reported credit limit</div>
      )}
      <p className="aum-muted">
        {balance === null
          ? 'No remaining credit balance was reported. This does not mean your balance is zero.'
          : 'Sum of reported balances. Providers without a balance are not included.'}
      </p>
      {failures > 0 && (
        <p className="aum-summary-warning">
          {failures} balance source{failures === 1 ? ' needs' : 's need'} attention.
        </p>
      )}
      {data.isSyncing && (
        <p className="aum-muted" role="status">
          Refreshing balance sources…
        </p>
      )}
      <details className="aum-explanation">
        <summary>View balance sources</summary>
        {sources.map((p) => (
          <p key={p.providerId}>
            {p.displayName}: {formatUsd(p.creditRemainingUsd)} ·{' '}
            {p.updatedAtMs ? `Updated ${formatRelativeTime(p.updatedAtMs)}` : 'Update time unavailable'}
          </p>
        ))}
        {data.cloudConnectors.map((c) => (
          <div key={c.provider} className="aum-summary-source">
            <strong>{c.provider}</strong>
            <p>{balanceSourceStatus(c)}</p>
            <p className="aum-subtext">
              {c.lastSyncedAtMs ? `Last synced ${formatRelativeTime(c.lastSyncedAtMs)}` : 'Not synced yet'}
            </p>
          </div>
        ))}
        {!sources.length && !data.cloudConnectors.length && (
          <p>No balance sources are available. Configure a supported billing connection in Plugin Settings.</p>
        )}
      </details>
    </article>
  );
}

function DiagnosticsStatus({ data, providers, onJumpToTab, onFocusIssueProviders }: OverviewSummaryProps) {
  const issues = providers.filter((p) => p.available && isProviderIssueStatus(p.status));
  return (
    <div className="aum-summary-diagnostics aum-row-between">
      <div>
        <strong>
          {issues.length
            ? `${issues.length} provider${issues.length === 1 ? ' needs' : 's need'} attention`
            : 'No provider alerts reported'}
        </strong>
        <p className="aum-subtext">
          {issues.length
            ? issues.map((p) => p.displayName).join(', ')
            : 'Provider issues are separate from budget alerts. Missing readings may still need checking.'}
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {issues.length > 0 && onFocusIssueProviders && (
          <button className="aum-btn" type="button" onClick={onFocusIssueProviders}>
            Show affected providers ({issues.length})
          </button>
        )}
        <button className="aum-btn" type="button" onClick={() => onJumpToTab('logs')}>
          Activity &amp; diagnostics · {data.kpis.logCount} events · All recorded history
        </button>
      </div>
    </div>
  );
}

export function OverviewSummary(props: OverviewSummaryProps) {
  const { data } = props;
  return (
    <div className="aum-summary">
      <section aria-label="Recorded usage">
        <div className="aum-row-between">
          <h2>Recorded usage</h2>
          <span className="aum-chip">{data.kpis.rangeBounds?.label ?? RANGE_LABELS[data.kpis.range]}</span>
        </div>
        <p className="aum-muted">Based on usage captured by the monitor. Subscription fees are not included.</p>
        <div className="aum-summary-grid">
          <UsageValue kpis={data.kpis} />
          <RecordedActivity kpis={data.kpis} />
          <BudgetStatus data={data} onJumpToTab={props.onJumpToTab} />
        </div>
      </section>
      <section aria-label="Balances & subscription limits">
        <div className="aum-row-between">
          <h2>Balances &amp; subscription limits</h2>
          <span className="aum-chip">Latest reported</span>
        </div>
        <p className="aum-muted">Provider balances and reset windows are independent of the selected usage period.</p>
        <div className="aum-summary-grid">
          <SubscriptionLimit providers={props.providers} onRefreshProvider={props.onRefreshProvider} />
          <CreditBalance data={data} />
        </div>
      </section>
      <DiagnosticsStatus {...props} />
    </div>
  );
}
