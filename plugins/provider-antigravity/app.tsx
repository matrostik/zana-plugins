import { definePluginApp, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DoctorStatusResult } from './server.js';
import type { NativeSetupState } from './src/native-auth.js';
import type { NativeUsageResult } from './src/native-usage.js';

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
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
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

  const checkHealth = useCallback(async (probeNative = false) => {
    setLoading(true);
    setActionError(null);
    try {
      const res = (await rpc.call(
        'doctor:status',
        probeNative ? { probeNative: true, forceRefresh: true } : null
      )) as DoctorStatusResult;
      setStatus(res);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to communicate with plugin server.');
    } finally {
      setLoading(false);
    }
  }, [rpc]);

  useEffect(() => { checkHealth(false); }, [checkHealth]);

  return { loading, actionError, setActionError, status, setStatus, checkHealth };
}

function copyToClipboard(text: string, key: string, setCopiedKey: (k: string | null) => void) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }
}

function useAntigravityActions(rpc: ReturnType<typeof useRpc>) {
  const [actionBusy, setActionBusy] = useState<'install' | 'rollback' | 'login' | 'logout' | 'probe' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { loading, actionError, setActionError, status, setStatus, checkHealth } = useHealthCheck(rpc);

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

  const copy = (text: string, key: string) => copyToClipboard(text, key, setCopiedKey);

  return {
    loading, actionBusy, actionError, status, copiedKey,
    handleInstallRuntime, handleRollbackRuntime, handleSignIn,
    handleSignOut, handleProbeNative, copyToClipboard: copy
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
  const pinnedVersion = status?.pinnedVersion ?? '1.4.3';
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
        <span className="agy-version-tag">{isInstalled ? `v${status?.version ?? pinnedVersion}` : `Pinned v${pinnedVersion}`}</span>
        {status?.tierName && <span className="agy-backend-badge">{status.tierName}</span>}
        <span className={`agy-state-pill state-${nativeState}`}>{NATIVE_STATE_LABELS[nativeState]}</span>
      </div>
      <div className="agy-actions-row">
        <button type="button" className="agy-btn" onClick={onInstall} disabled={loading || actionBusy !== null}>
          {actionBusy === 'install' ? 'Installing...' : isInstalled ? `Reinstall Runtime (v${pinnedVersion})` : `Install Native ACP Runtime (v${pinnedVersion})`}
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
  useEffect(() => {
    requestVersion.current++;
    setResult(null); setError(null); setBusy(false);
    return () => { requestVersion.current++; };
  }, [status?.authMethod, status?.configuredAuthType, status?.executable, status?.authenticated, status?.credentialId]);
  const checkUsage = async () => {
    const version = ++requestVersion.current;
    setBusy(true);
    setError(null);
    try {
      const next = await rpc.call('usage:status') as NativeUsageResult;
      if (version === requestVersion.current) setResult(next);
    }
    catch (err: any) { if (version === requestVersion.current) setError(err?.message || 'Could not check subscription usage.'); }
    finally { if (version === requestVersion.current) setBusy(false); }
  };
  return (
    <div className="agy-usage-card">
      <h4>Subscription usage</h4>
      <p className="agy-desc">Plan: {status?.tierName || 'not yet verified'}</p>
      <button type="button" className="agy-btn" onClick={checkUsage} disabled={busy || !status?.authenticated}>
        {busy ? 'Checking usage...' : 'Check subscription usage'}
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
      if (pollTimer.current) clearInterval(pollTimer.current);
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
    {(error || status?.error) && <p className="agy-desc agy-desc-error" role="alert">{error || status?.error}</p>}
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
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .agy-account-panel { display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 0; overflow: auto; }
    .agy-account-panel h2 { font-size: 16px; margin: 0; }
    .agy-account-panel .agy-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .agy-settings-panel { display: flex; flex-direction: column; gap: 16px; max-width: 680px; }
    .agy-status-card { display: flex; flex-direction: column; gap: 12px; padding: 14px 16px; border-radius: 8px; border: 1px solid var(--border-default, #2a2a2a); background: var(--bg-surface, #141414); }
    .agy-status-header { display: flex; flex-direction: column; gap: 10px; }
    .agy-status-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .agy-status-indicator { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .agy-status-indicator.ready { background: var(--success, #22c55e); }
    .agy-status-indicator.warning { background: var(--warning, #eab308); }
    .agy-status-indicator.checking { background: var(--accent, #3b82f6); animation: agy-pulse 1s infinite alternate; }
    .agy-status-label { font-weight: 600; font-size: 14px; }
    .agy-version-tag { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: var(--bg-subtle, #222); color: var(--fg-muted, #888); }
    .agy-backend-badge { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: #60a5fa; font-weight: 500; }
    .agy-state-pill { font-size: 11px; padding: 1px 7px; border-radius: 4px; font-weight: 500; }
    .agy-state-pill.state-session_ready { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
    .agy-state-pill.state-authenticated { background: rgba(234, 179, 8, 0.15); color: #facc15; }
    .agy-state-pill.state-sign_in_required { background: rgba(234, 179, 8, 0.15); color: #facc15; }
    .agy-state-pill.state-runtime_launches { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .agy-state-pill.state-runtime_missing { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .agy-actions-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
    .agy-btn { font-size: 12px; padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border-default, #333); background: var(--bg-subtle, #1f1f1f); color: var(--fg-default, #eee); cursor: pointer; }
    .agy-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .agy-btn-primary { background: var(--accent, #2563eb); border-color: var(--accent, #2563eb); color: #fff; }
    .agy-readiness-steps { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0; }
    .agy-readiness-step { font-size: 10px; padding: 2px 6px; border-radius: 3px; background: var(--bg-subtle, #1a1a1a); color: var(--fg-muted, #666); border: 1px solid transparent; }
    .agy-readiness-step.passed { color: var(--fg-muted, #888); border-color: var(--border-subtle, #2a2a2a); }
    .agy-readiness-step.active { color: #fff; background: var(--border-default, #333); font-weight: 600; border-color: var(--accent, #3b82f6); }
    .agy-desc { font-size: 12px; color: var(--fg-muted, #999); margin: 0; line-height: 1.5; }
    .agy-desc-error { color: var(--error, #f87171); }
    .agy-desc-note { color: var(--accent, #60a5fa); font-size: 11px; }
    .agy-command-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; border-radius: 6px; background: var(--bg-input, #0d0d0d); border: 1px solid var(--border-subtle, #222); font-family: monospace; font-size: 11px; margin-top: 6px; }
    .agy-command-text { word-break: break-all; }
    .agy-models-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .agy-usage-card { padding: 12px; border: 1px solid var(--border-subtle, #333); border-radius: 6px; margin: 12px 0; }
    .agy-usage-card h4 { margin: 0 0 8px; }
    .agy-usage-list { padding-left: 20px; font-size: 12px; line-height: 1.7; }
    .agy-steps-card { padding: 14px 16px; border-radius: 8px; border: 1px solid var(--border-subtle, #222); background: var(--bg-card, #111); }
    .agy-steps-title { font-size: 13px; font-weight: 600; margin: 0 0 8px 0; color: var(--fg-default, #ddd); }
    .agy-steps-list { margin: 0; padding-left: 18px; font-size: 12px; color: var(--fg-muted, #888); line-height: 1.6; }
    @keyframes agy-pulse { 0% { opacity: 0.4; } 100% { opacity: 1; } }
  `;
  document.head.appendChild(style);
}
