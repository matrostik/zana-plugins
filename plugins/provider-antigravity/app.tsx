import { definePluginApp, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DoctorStatusResult } from './server.js';
import type { NativeSetupState } from './src/native-auth.js';
import type { NativeUsageResult } from './src/native-usage.js';
import PROVIDER_ANTIGRAVITY_STYLES from './styles.css';

const NATIVE_STATE_LABELS: Record<NativeSetupState, string> = {
  runtime_missing: 'Runtime Missing',
  runtime_launches: 'Runtime Installed',
  sign_in_required: 'Sign-in Required',
  authenticated: 'Unverified Credentials',
  session_ready: 'Session Ready'
};

const NATIVE_STEPS: NativeSetupState[] = [
  'runtime_missing',
  'runtime_launches',
  'sign_in_required',
  'authenticated',
  'session_ready'
];

export function AntigravityProviderIcon({
  className,
  size = 14
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <title>Antigravity</title>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.5a.8.8 0 0 1 .72.47c.83 2.27 1.99 4.24 3.62 5.87s3.6 2.79 5.87 3.62a.8.8 0 0 1 0 1.44c-2.27.83-4.24 1.99-5.87 3.62s-2.79 3.6-3.62 5.87a.8.8 0 0 1-1.44 0c-.83-2.27-1.99-4.24-3.62-5.87s-3.6-2.79-5.87-3.62a.8.8 0 0 1 0-1.44c2.27-.83 4.24-1.99 5.87-3.62s2.79-3.6 3.62-5.87A.8.8 0 0 1 12 1.5Z"
      />
    </svg>
  );
}

function ReloadSpinner({ label, spinning = true }: { label?: string; spinning?: boolean }) {
  return (
    <svg
      className={spinning ? 'agy-spinner' : undefined}
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

function useRuntimeActions(
  rpc: ReturnType<typeof useRpc>,
  setStatus: (s: DoctorStatusResult) => void,
  setActionBusy: (b: 'install' | 'rollback' | null) => void,
  setActionError: (e: string | null) => void
) {
  const handleInstallRuntime = async () => {
    setActionBusy('install');
    setActionError(null);
    try {
      const res = (await rpc.call('runtime:install')) as DoctorStatusResult;
      setStatus(res);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to install Google Native ACP runtime.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleRollbackRuntime = async () => {
    setActionBusy('rollback');
    setActionError(null);
    try {
      const res = (await rpc.call('runtime:rollback')) as DoctorStatusResult;
      setStatus(res);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to roll back Native ACP runtime.');
    } finally {
      setActionBusy(null);
    }
  };

  return { handleInstallRuntime, handleRollbackRuntime };
}

function clearIntervalRef(timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

function useAuthActions(
  rpc: ReturnType<typeof useRpc>,
  setStatus: (s: DoctorStatusResult) => void,
  setActionBusy: (b: 'login' | 'logout' | null) => void,
  setActionError: (e: string | null) => void,
  pollTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>
) {
  const handleSignIn = async () => {
    setActionBusy('login');
    setActionError(null);
    clearIntervalRef(pollTimerRef);
    pollTimerRef.current = setInterval(async () => {
      try {
        const polled = (await rpc.call('doctor:status')) as DoctorStatusResult;
        if (polled.pendingAuthUrl) setStatus(polled);
      } catch {}
    }, 1200);

    try {
      const res = (await rpc.call('auth:login')) as DoctorStatusResult;
      setStatus(res);
    } catch (err: any) {
      setActionError(err?.message || 'Interactive Google sign-in failed.');
    } finally {
      clearIntervalRef(pollTimerRef);
      setActionBusy(null);
    }
  };

  const handleSignOut = async () => {
    setActionBusy('logout');
    setActionError(null);
    try {
      const res = (await rpc.call('auth:logout')) as DoctorStatusResult;
      setStatus(res);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to clear native ACP authentication.');
    } finally {
      setActionBusy(null);
    }
  };

  return { handleSignIn, handleSignOut };
}

function useHealthCheck(rpc: ReturnType<typeof useRpc>) {
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState<DoctorStatusResult | null>(null);
  const requestVersion = useRef(0);

  const checkHealth = useCallback(async (probeNative = false) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setActionError(null);
    try {
      const res = (await rpc.call(
        'doctor:status',
        probeNative ? { probeNative: true, forceRefresh: true } : null
      )) as DoctorStatusResult;
      if (requestVersion.current === version) setStatus(res);
    } catch (err: any) {
      if (requestVersion.current === version) {
        setActionError(err?.message || 'Failed to communicate with plugin server.');
      }
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, [rpc]);

  useEffect(() => {
    void checkHealth(false);
    return () => { requestVersion.current++; };
  }, [checkHealth]);

  return { loading, actionError, setActionError, status, setStatus, checkHealth };
}

function useAntigravityActions(rpc: ReturnType<typeof useRpc>) {
  const [actionBusy, setActionBusy] = useState<'install' | 'rollback' | 'login' | 'logout' | 'probe' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { loading, actionError, setActionError, status, setStatus, checkHealth } = useHealthCheck(rpc);

  useEffect(() => () => {
    clearIntervalRef(pollTimerRef);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  const { handleInstallRuntime, handleRollbackRuntime } = useRuntimeActions(
    rpc, setStatus, setActionBusy, setActionError
  );
  const { handleSignIn, handleSignOut } = useAuthActions(
    rpc, setStatus, setActionBusy, setActionError, pollTimerRef
  );

  const handleProbeNative = async () => {
    setActionBusy('probe');
    await checkHealth(true);
    setActionBusy(null);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    void Promise.resolve(navigator.clipboard.writeText(text)).then(() => {
      setCopiedKey(key);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        copyTimerRef.current = null;
        setCopiedKey(null);
      }, 2000);
    }).catch(() => {});
  };

  return {
    loading, actionBusy, actionError, status, copiedKey,
    handleInstallRuntime, handleRollbackRuntime, handleSignIn,
    handleSignOut, handleProbeNative, copyToClipboard
  };
}

function StatusHeader({
  status, loading, actionBusy, onInstall, onRollback
}: {
  status: DoctorStatusResult | null;
  loading: boolean;
  actionBusy: string | null;
  onInstall: () => void;
  onRollback: () => void;
}) {
  const nativeState = status?.state ?? 'runtime_missing';
  const isInstalled = status?.installed === true;
  const isReady = nativeState === 'session_ready';
  const pinnedVersion = status?.pinnedVersion;
  const versionSuffix = pinnedVersion ? ` (v${pinnedVersion})` : '';
  const installedVersionLabel = status?.version ?? pinnedVersion;
  const primaryLabel = loading
    ? 'Checking Antigravity Native ACP...'
    : isReady
    ? 'Antigravity Native ACP Connected'
    : nativeState === 'authenticated'
    ? 'Antigravity Native ACP (Unverified Session — Verify Session & Models)'
    : `Antigravity Native ACP (${NATIVE_STATE_LABELS[nativeState]})`;

  return (
    <div className="agy-status-header">
      <div className="agy-status-title-row">
        <span className={`agy-status-indicator ${loading || actionBusy ? 'checking' : isReady ? 'ready' : 'warning'}`} />
        <span className="agy-status-label">{primaryLabel}</span>
        {installedVersionLabel && (
          <span className="agy-version-tag">
            {isInstalled ? `v${installedVersionLabel}` : `Pinned v${installedVersionLabel}`}
          </span>
        )}
        {status?.tierName && <span className="agy-backend-badge">{status.tierName}</span>}
        <span className={`agy-state-pill state-${nativeState}`}>{NATIVE_STATE_LABELS[nativeState]}</span>
      </div>
      <div className="agy-actions-row">
        <button type="button" className="agy-btn" onClick={onInstall} disabled={loading || actionBusy !== null}>
          {actionBusy === 'install'
            ? 'Installing...'
            : isInstalled
            ? `Reinstall Runtime${versionSuffix}`
            : `Install Native ACP Runtime${versionSuffix}`}
        </button>
        {status?.previousVersion && (
          <button type="button" className="agy-btn" onClick={onRollback} disabled={loading || actionBusy !== null}>
            {actionBusy === 'rollback' ? 'Rolling back...' : `Rollback to v${status.previousVersion}`}
          </button>
        )}
      </div>
    </div>
  );
}

function ReadinessSteps({ nativeState }: { nativeState: NativeSetupState }) {
  const currentIdx = NATIVE_STEPS.indexOf(nativeState);
  return (
    <div className="agy-readiness-steps">
      {NATIVE_STEPS.map((step, idx) => {
        const active = step === nativeState;
        const passed = idx < currentIdx && nativeState !== 'runtime_missing';
        return (
          <span key={step} className={`agy-readiness-step ${active ? 'active' : passed ? 'passed' : ''}`}>
            {NATIVE_STATE_LABELS[step]}
          </span>
        );
      })}
    </div>
  );
}

function AuthControls({
  status, actionBusy, loading, copiedKey, onSignIn, onProbe, onSignOut, onCopy
}: {
  status: DoctorStatusResult | null;
  actionBusy: string | null;
  loading: boolean;
  copiedKey: string | null;
  onSignIn: () => void;
  onProbe: () => void;
  onSignOut: () => void;
  onCopy: (text: string, key: string) => void;
}) {
  if (!status?.installed) return null;
  const hasCredentials = status.state === 'session_ready' || status.state === 'authenticated';
  return (
    <>
      <div className="agy-actions-row">
        <button type="button" className="agy-btn agy-btn-primary" onClick={onSignIn} disabled={loading || actionBusy !== null}>
          {actionBusy === 'login' ? 'Waiting for Google Sign-In in Browser...' : hasCredentials ? 'Re-authenticate with Google' : 'Sign In with Google'}
        </button>
        <button type="button" className="agy-btn" onClick={onProbe} disabled={loading || actionBusy !== null}>
          {actionBusy === 'probe' ? 'Verifying Session...' : 'Verify Session & Models'}
        </button>
        {status.configuredAuthType && (
          <button type="button" className="agy-btn" onClick={onSignOut} disabled={loading || actionBusy !== null}>
            Clear Auth Selection
          </button>
        )}
      </div>
      {status.pendingAuthUrl && (
        <div>
          <p className="agy-desc">If your browser did not open automatically, copy this OAuth link:</p>
          <div className="agy-command-box">
            <span className="agy-command-text">{status.pendingAuthUrl}</span>
            <button type="button" className="agy-btn" onClick={() => onCopy(status.pendingAuthUrl!, 'oauth')}>
              {copiedKey === 'oauth' ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function DiscoveredModelsList({ status }: { status: DoctorStatusResult | null }) {
  if (!status || status.models.length === 0) return null;
  return (
    <div>
      <p className="agy-desc">Available Native ACP models ({status.models.length}):</p>
      <div className="agy-models-list">
        {status.models.map((m) => (
          <span key={m.id} className="agy-version-tag">{m.name} ({m.id})</span>
        ))}
      </div>
    </div>
  );
}

function SubscriptionUsage({ status }: { status: DoctorStatusResult | null }) {
  const rpc = useRpc();
  const [result, setResult] = useState<NativeUsageResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const lastOkRef = useRef<NativeUsageResult | null>(null);
  useEffect(() => {
    requestVersion.current++;
    lastOkRef.current = null;
    setResult(null); setError(null); setBusy(false);
    return () => { requestVersion.current++; };
  }, [status?.authMethod, status?.configuredAuthType, status?.executable, status?.authenticated, status?.credentialId]);
  const checkUsage = async () => {
    const version = ++requestVersion.current;
    const isRefresh = lastOkRef.current !== null;
    setBusy(true);
    setError(null);
    try {
      const next = await rpc.call('usage:status', isRefresh ? { forceRefresh: true } : undefined) as NativeUsageResult;
      if (version !== requestVersion.current) return;
      if (next.usage.status === 'ok') {
        lastOkRef.current = next;
        setResult(next);
        setError(null);
      } else if (next.usage.status === 'unauthenticated' || next.usage.status === 'not_installed') {
        lastOkRef.current = null;
        setResult(next);
        setError(null);
      } else if (lastOkRef.current) {
        setResult(lastOkRef.current);
        setError(next.usage.message || 'Usage is unavailable. Verify your Google sign-in and try again.');
      } else {
        setResult(next);
      }
    }
    catch (err: any) { if (version === requestVersion.current) setError(err?.message || 'Could not check subscription usage.'); }
    finally { if (version === requestVersion.current) setBusy(false); }
  };
  return (
    <div className="agy-usage-card">
      <div className="agy-usage-header">
        <h4>Subscription usage</h4>
        {busy && (
          <span
            className="agy-refresh-badge"
            role="status"
            aria-label="Refreshing subscription usage"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <ReloadSpinner />
            <span>Refreshing...</span>
          </span>
        )}
      </div>
      <p className="agy-desc">Plan: {status?.tierName || 'not yet verified'}</p>
      <button type="button" className="agy-btn agy-btn-with-icon" onClick={checkUsage} disabled={busy || !status?.authenticated}>
        {busy && <ReloadSpinner />}
        <span>{busy ? 'Checking usage...' : result?.usage.status === 'ok' ? 'Refresh subscription usage' : 'Check subscription usage'}</span>
      </button>
      {error && <p role="status" className="agy-desc agy-desc-error">{error}</p>}
      {result?.usage.status === 'ok' && <>
        <p className="agy-desc">Checked {new Date(result.usage.checkedAt).toISOString()} · Google Antigravity /usage</p>
        <ul className="agy-usage-list">{result.usage.windows.map(quota => (
          <li key={quota.label}>
            <strong>{quota.label.replace(/ Remaining$/, '')}</strong>: {Math.round((100 - quota.usedPercent) * 100) / 100}% remaining
            {quota.resetsAt && <span> · Resets {quota.resetsAt}</span>}
          </li>
        ))}</ul>
      </>}
      {result && result.usage.status !== 'ok' && <p role="status" className="agy-desc agy-desc-error">
        {result.usage.message || 'Usage is unavailable. Verify your Google sign-in and try again.'}
      </p>}
      <p className="agy-desc">Baseline quota is separate from AI credits. You can also check usage in Google Antigravity Settings or run <code>/usage</code> in an Antigravity thread.</p>
    </div>
  );
}

function SetupGuide() {
  return (
    <div className="agy-steps-card">
      <h4 className="agy-steps-title">Quick Setup Guide</h4>
      <ol className="agy-steps-list">
        <li>Click <strong>Install Native ACP Runtime</strong> above to download and verify Google&apos;s official SHA-256 ACP archive.</li>
        <li>Select your <strong>Google ACP authentication method</strong> and click <strong>Sign In with Google</strong>.</li>
        <li>Run the session verification check above to confirm readiness and load the native model catalog.</li>
        <li>Start a new thread in Zana and select <strong>Antigravity</strong> as the provider (legacy <code>agy-*</code> CLI threads migrate via context handoff).</li>
      </ol>
    </div>
  );
}

export function AntigravitySettingsSection() {
  const rpc = useRpc();
  const act = useAntigravityActions(rpc);
  useEffect(() => { ensureStyles(); }, []);

  const nativeState = act.status?.state ?? 'runtime_missing';
  return (
    <div className="agy-settings-panel">
      <div className="agy-status-card">
        <StatusHeader
          status={act.status}
          loading={act.loading}
          actionBusy={act.actionBusy}
          onInstall={act.handleInstallRuntime}
          onRollback={act.handleRollbackRuntime}
        />
        <ReadinessSteps nativeState={nativeState} />
        <p className="agy-desc">
          Runs Zana threads directly over Google&apos;s official Native ACP server (<code>agy_acp_server</code>). Auth method: <code>{act.status?.authMethod ?? 'oauth-personal'}</code>
          {act.status?.configuredAuthType ? ` (configured: ${act.status.configuredAuthType})` : ' (not yet configured)'}
        </p>
        {nativeState === 'authenticated' && (
          <p className="agy-desc agy-desc-note">
            Local credentials detected, but the Native ACP session has not been verified yet. Run the session verification probe below to confirm readiness.
          </p>
        )}
        {(act.status?.error || act.actionError) && (
          <p className="agy-desc agy-desc-error">{act.actionError || act.status?.error}</p>
        )}
        <AuthControls
          status={act.status}
          actionBusy={act.actionBusy}
          loading={act.loading}
          copiedKey={act.copiedKey}
          onSignIn={act.handleSignIn}
          onProbe={act.handleProbeNative}
          onSignOut={act.handleSignOut}
          onCopy={act.copyToClipboard}
        />
        <DiscoveredModelsList status={act.status} />
        {act.status?.checkedAt && <p className="agy-desc">
          {act.status.catalogStale ? 'Catalog refresh needed — last verified ' : 'Session last checked '}
          {new Date(act.status.checkedAt).toISOString()}
        </p>}
        {act.status && act.status.disabledDeadMcpServers.length > 0 && (
          <p className="agy-desc agy-desc-note">
            Automatically bypassed unreachable IDE named-pipe MCP proxies (<code>{act.status.disabledDeadMcpServers.join(', ')}</code>) to prevent prompt stalls.
          </p>
        )}
      </div>
      <SubscriptionUsage status={act.status} />
      <SetupGuide />
    </div>
  );
}

export function formatAccountPanelError(message: string | null | undefined): string | null {
  if (!message) return null;
  const stripped = message
    .replace(/\s*Open the thread side panel → Antigravity account and click "[^"]+"\./g, '')
    .trim();
  return stripped || message;
}

export function AntigravityAccountPanel() {
  const rpc = useRpc();
  const [status, setStatus] = useState<DoctorStatusResult | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [busy, setBusy] = useState<'login' | 'logout' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestVersion = useRef(0);
  const { handleSignIn } = useAuthActions(rpc, setStatus, setBusy, setError, pollTimer);
  const recover = useCallback(async (forceRefresh = false) => {
    const version = ++requestVersion.current;
    setRecovering(true);
    setError(null);
    try {
      const result = await rpc.call('auth:recover', { forceRefresh }) as DoctorStatusResult;
      if (requestVersion.current === version) setStatus(result);
    } catch (err: any) {
      if (requestVersion.current === version) setError(err?.message || 'Could not reconnect Antigravity.');
    } finally {
      if (requestVersion.current === version) setRecovering(false);
    }
  }, [rpc]);
  useEffect(() => {
    ensureStyles();
    void recover();
    return () => {
      requestVersion.current++;
      clearIntervalRef(pollTimer);
    };
  }, [recover]);
  return <div className="agy-account-panel">
    <h2>Antigravity account</h2>
    <p className="agy-desc">Checks the account on this computer. Saved credentials are renewed automatically when possible.</p>
    <p role="status" aria-live="polite">{recovering ? 'Checking saved credentials…'
      : busy === 'login' ? 'Complete Google sign-in in your browser…'
      : status?.ready ? 'Connected'
      : status?.state === 'sign_in_required' ? 'Google sign-in is required. Reconnect here to continue.'
      : 'Antigravity could not connect.'}</p>
    {(error || status?.error) && <p className="agy-desc agy-desc-error" role="alert">{formatAccountPanelError(error || status?.error)}</p>}
    <div className="agy-actions">
      <button className="agy-btn" disabled={recovering || busy !== null} onClick={() => void recover(true)}>Check again</button>
      <button className="agy-btn" disabled={recovering || busy !== null || status?.installed === false} onClick={handleSignIn}>Reconnect Antigravity</button>
    </div>
    {status?.pendingAuthUrl && <a href={status.pendingAuthUrl} target="_blank" rel="noreferrer">Open Google sign-in</a>}
    <DiscoveredModelsList status={status} />
    {status?.ready && <p className="agy-desc">If the model picker still shows an earlier error, use its refresh button to reload these models.</p>}
  </div>;
}

export default definePluginApp((app) => {
  app.slots.experimental_providerIcon?.({
    providerId: 'antigravity',
    icon: AntigravityProviderIcon
  });
  app.slots.threadPanelAction({
    id: 'antigravity-account',
    title: 'Antigravity account',
    icon: 'KeyRound',
    component: AntigravityAccountPanel
  });
  app.slots.settingsSection({
    id: 'antigravity-provider',
    title: 'Antigravity Provider',
    description: 'Configure Google Antigravity via Google Native ACP server (agy_acp_server)',
    component: AntigravitySettingsSection
  });
});

function ensureStyles() {
  if (typeof document === 'undefined') return;
  const id = 'antigravity-provider-styles';
  const existing = document.getElementById(id);
  if (existing) {
    if (existing.textContent !== PROVIDER_ANTIGRAVITY_STYLES) {
      existing.textContent = PROVIDER_ANTIGRAVITY_STYLES;
    }
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = PROVIDER_ANTIGRAVITY_STYLES;
  document.head.appendChild(style);
}
