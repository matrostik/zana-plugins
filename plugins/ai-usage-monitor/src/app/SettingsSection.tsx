import { useCallback, useEffect, useState } from 'react';
import { useRpc, useSettings, useZccNavigate } from '@zana-ai/zcc-plugin-sdk/app';
import {
  DEFAULT_SUBSCRIPTION_PROVIDERS_CSV,
  LOCAL_CREDENTIAL_PROBE_ENDPOINTS,
  LOCAL_CREDENTIAL_PROBE_FILES,
  RPC_METHODS,
  type CloudConnectorStatus,
  type DashboardPayload
} from '../shared/types.ts';
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

function useSettingsSync() {
  const rpc = useRpc();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const runAction = useCallback(
    async (action: 'refresh' | 'reset', method: string, successText: string) => {
      setBusy(action);
      setMessage(null);
      try {
        await rpc.call(method);
        await loadSnapshot();
        setMessage(successText);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [loadSnapshot, rpc]
  );

  return {
    data,
    busy,
    message,
    error,
    handleRefresh: () =>
      runAction('refresh', RPC_METHODS.refreshNow, 'Synced thread telemetry, provider quotas, and cloud billing connectors.'),
    handleResetSync: () => runAction('reset', RPC_METHODS.resetSync, 'Re-indexed all thread telemetry from scratch.')
  };
}

function LocalProbeNotice({ enabled }: { enabled: boolean }) {
  return (
    <div className="aum-window-box" style={{ gap: 4 }}>
      <div className="aum-row-between">
        <strong style={{ fontSize: 12 }}>Local CLI Credential Probing (Opt-In)</strong>
        <span className={enabled ? 'aum-pill aum-pill-amber' : 'aum-pill aum-pill-neutral'}>
          {enabled ? 'Enabled' : 'Disabled (Default)'}
        </span>
      </div>
      <div className="aum-subtext">
        When enabled in plugin settings, refresh reads{' '}
        <span className="aum-mono">{LOCAL_CREDENTIAL_PROBE_FILES.join(', ')}</span> and sends OAuth access tokens to{' '}
        <span className="aum-mono">{LOCAL_CREDENTIAL_PROBE_ENDPOINTS.join(', ')}</span>.
      </div>
    </div>
  );
}

function ConnectorStatusList({ connectors }: { connectors: CloudConnectorStatus[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {connectors.map((conn) => {
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
  );
}

export function SettingsSection() {
  const settings = useSettings();
  const navigate = useZccNavigate();
  const { data, busy, message, error, handleRefresh, handleResetSync } = useSettingsSync();

  useEffect(() => {
    ensureStylesInjected();
  }, []);

  const subProviders =
    typeof settings.values?.subscriptionProviders === 'string'
      ? settings.values.subscriptionProviders
      : DEFAULT_SUBSCRIPTION_PROVIDERS_CSV;
  const localProbingEnabled = settings.values?.enableLocalCredentialProbing === true;
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
          <button type="button" className="aum-btn aum-btn-primary aum-btn-sm" onClick={() => navigate.toPluginPanel?.('ai-usage-monitor')}>
            Open Dashboard
          </button>
        </div>
      </div>

      {error && <div className="aum-banner aum-banner-error">{error}</div>}
      {message && <div className="aum-banner aum-banner-info">{message}</div>}
      <LocalProbeNotice enabled={localProbingEnabled} />
      {data && <ConnectorStatusList connectors={data.cloudConnectors} />}
    </div>
  );
}
