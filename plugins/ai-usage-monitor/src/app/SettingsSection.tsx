import { useCallback, useEffect, useState } from 'react';
import { useRpc, useSettings, useZccNavigate } from '@zana-ai/zcc-plugin-sdk/app';
import { RPC_METHODS, type CloudConnectorStatus, type DashboardPayload } from '../shared/types.ts';
import { formatRelativeTime, formatUsd } from './format.ts';
import { ReloadSpinner } from './OverviewTab.tsx';
import { ensureStylesInjected } from './styles.ts';

function connectorBadgeState(conn: CloudConnectorStatus): { cls: string; label: string; detail: string } {
  const isUnqualifiedOpenCode =
    conn.provider === 'opencode' &&
    conn.status === 'ok' &&
    conn.qualificationState === 'unqualified' &&
    conn.creditRemainingUsd === null;

  if (conn.status === 'ok') {
    if (isUnqualifiedOpenCode) {
      const spendPrefix = conn.reportedSpendUsd !== null ? `Budget spend: ${formatUsd(conn.reportedSpendUsd)} • ` : '';
      return {
        cls: 'aum-pill aum-pill-amber',
        label: 'Balance Pending',
        detail: `${spendPrefix}${conn.balanceStatusMessage ?? 'Prepaid balance awaiting key qualification'}`
      };
    }
    return {
      cls: 'aum-pill aum-pill-emerald',
      label: 'Connected',
      detail:
        conn.creditRemainingUsd !== null
          ? `Credits left: ${formatUsd(conn.creditRemainingUsd)}`
          : `Reported MTD: ${formatUsd(conn.reportedSpendUsd)}`
    };
  }

  if (conn.status === 'error') {
    return {
      cls: 'aum-pill aum-pill-rose',
      label: conn.qualificationState === 'permission_required' ? '403 Scope Error' : 'Error',
      detail: conn.errorMessage ?? 'Connector probe failed'
    };
  }

  return {
    cls: 'aum-pill aum-pill-neutral',
    label: 'Not Configured',
    detail: conn.balanceStatusMessage ?? 'Set key above to enable exact billing sync'
  };
}

export function SettingsSection() {
  const rpc = useRpc();
  const settings = useSettings();
  const navigate = useZccNavigate();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureStylesInjected();
  }, []);

  const loadSnapshot = useCallback(async () => {
    try {
      const res = (await rpc.call(RPC_METHODS.dashboard, { range: '30d' })) as DashboardPayload;
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [rpc]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  async function handleRefresh() {
    setBusy('refresh');
    setMessage(null);
    try {
      await rpc.call(RPC_METHODS.refreshNow);
      await loadSnapshot();
      setMessage('Synced thread telemetry, provider quotas, and cloud billing connectors.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleResetSync() {
    setBusy('reset');
    setMessage(null);
    try {
      await rpc.call(RPC_METHODS.resetSync);
      await loadSnapshot();
      setMessage('Re-indexed all thread telemetry from scratch.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const subProviders =
    typeof settings.values?.subscriptionProviders === 'string'
      ? settings.values.subscriptionProviders
      : 'claude-code,codex,cursor,antigravity';

  const isRefreshing = busy !== null || Boolean(data?.isSyncing);

  return (
    <div className="aum-root" style={{ height: 'auto', borderRadius: 8, border: '1px solid var(--aum-border)', padding: 14, gap: 12 }}>
      <div className="aum-row-between">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13 }}>AI Usage Monitor Status &amp; Sync Controls</strong>
            {isRefreshing && (
              <span
                className="aum-refresh-badge"
                role="status"
                aria-label="Syncing AI usage telemetry"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <ReloadSpinner />
                <span>Refreshing</span>
              </span>
            )}
          </div>
          <div className="aum-subtext">
            Last synced {formatRelativeTime(data?.lastSyncedAtMs)} • Subscription providers: <span className="aum-mono">{subProviders}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="aum-btn aum-btn-sm" disabled={busy !== null} onClick={() => void handleRefresh()}>
            {busy === 'refresh' && <ReloadSpinner />}
            <span>{busy === 'refresh' ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          <button type="button" className="aum-btn aum-btn-sm" disabled={busy !== null} onClick={() => void handleResetSync()}>
            {busy === 'reset' && <ReloadSpinner />}
            <span>{busy === 'reset' ? 'Re-indexing...' : 'Re-index All Threads'}</span>
          </button>
          <button
            type="button"
            className="aum-btn aum-btn-primary aum-btn-sm"
            onClick={() => navigate.toPluginPanel?.('ai-usage-monitor')}
          >
            Open Dashboard
          </button>
        </div>
      </div>

      {error && <div className="aum-banner aum-banner-error">{error}</div>}
      {message && <div className="aum-banner aum-banner-info">{message}</div>}

      {data && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {data.cloudConnectors.map((conn) => {
            const badge = connectorBadgeState(conn);
            return (
              <div key={conn.provider} className="aum-window-box" style={{ flex: '1 1 180px' }}>
                <div className="aum-row-between">
                  <strong style={{ fontSize: 12, textTransform: 'capitalize' }}>{conn.provider}</strong>
                  <span className={badge.cls}>{badge.label}</span>
                </div>
                <div className="aum-subtext aum-mono">{badge.detail}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
