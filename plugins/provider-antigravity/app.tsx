import { definePluginApp, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import React, { useState, useEffect, useCallback } from 'react';
import type { DoctorStatusResult } from './server.js';
import type { NativeSetupState } from './src/native-auth.js';
import styles from './styles.css';

const STYLESHEET_ID = 'provider-antigravity-styles';

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLESHEET_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLESHEET_ID;
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

const NATIVE_STATE_LABELS: Record<NativeSetupState, string> = {
  runtime_missing: 'Runtime Missing',
  runtime_launches: 'Runtime Launches',
  sign_in_required: 'Sign-In Required',
  authenticated: 'Authenticated',
  session_ready: 'Session Ready'
};

const NATIVE_STEPS: NativeSetupState[] = [
  'runtime_missing',
  'runtime_launches',
  'sign_in_required',
  'authenticated',
  'session_ready'
];

export function AntigravitySettingsSection() {
  const rpc = useRpc();
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<
    'install' | 'rollback' | 'login' | 'logout' | 'probe' | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState<DoctorStatusResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    ensureStyles();
  }, []);

  const checkHealth = useCallback(
    async (probeNative = false) => {
      setLoading(true);
      setActionError(null);
      try {
        const res = (await rpc.call(
          'doctor:status',
          probeNative ? { probeNative: true, forceRefresh: true } : null
        )) as DoctorStatusResult;
        setStatus(res);
      } catch (err: any) {
        setStatus({
          installed: false,
          authenticated: false,
          ready: false,
          version: null,
          pinnedVersion: '1.4.3',
          previousVersion: null,
          source: 'uninstalled',
          executable: 'agy_acp_server',
          companionFilesPresent: false,
          missingCompanionFiles: [],
          state: 'runtime_missing',
          authMethod: 'oauth-personal',
          configuredAuthType: null,
          pendingAuthUrl: null,
          models: [],
          modes: [],
          tierName: null,
          disabledDeadMcpServers: [],
          error: err?.message || 'Failed to communicate with plugin server.'
        });
      } finally {
        setLoading(false);
      }
    },
    [rpc]
  );

  useEffect(() => {
    checkHealth(false);
  }, [checkHealth]);

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

  const handleSignIn = async () => {
    setActionBusy('login');
    setActionError(null);
    try {
      const res = (await rpc.call('auth:login')) as DoctorStatusResult;
      setStatus(res);
    } catch (err: any) {
      setActionError(err?.message || 'Interactive Google sign-in failed.');
    } finally {
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

  const handleProbeNative = async () => {
    setActionBusy('probe');
    await checkHealth(true);
    setActionBusy(null);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const nativeState: NativeSetupState = status?.state ?? 'runtime_missing';
  const isInstalled = status?.installed === true;
  const isReady = nativeState === 'session_ready' || nativeState === 'authenticated';
  const pinnedVersion = status?.pinnedVersion ?? '1.4.3';

  const primaryLabel = loading
    ? 'Checking Antigravity Native ACP...'
    : isReady
    ? 'Antigravity Native ACP Connected'
    : `Antigravity Native ACP (${NATIVE_STATE_LABELS[nativeState]})`;

  return (
    <div className="agy-settings-panel">
      {/* 1. Native Antigravity ACP Runtime & Authentication Card */}
      <div className="agy-status-card">
        <div className="agy-status-header">
          <div className="agy-status-title-row">
            <span
              className={`agy-status-indicator ${
                loading || actionBusy
                  ? 'checking'
                  : isReady
                  ? 'ready'
                  : 'warning'
              }`}
            />
            <span className="agy-status-label">{primaryLabel}</span>
            <span className="agy-version-tag">
              {isInstalled
                ? `v${status?.version ?? pinnedVersion}`
                : `Pinned v${pinnedVersion}`}
            </span>
            {status?.tierName && (
              <span className="agy-backend-badge">{status.tierName}</span>
            )}
            <span className={`agy-state-pill state-${nativeState}`}>
              {NATIVE_STATE_LABELS[nativeState]}
            </span>
          </div>

          <div className="agy-actions-row">
            <button
              type="button"
              className="agy-btn"
              onClick={handleInstallRuntime}
              disabled={loading || actionBusy !== null}
            >
              {actionBusy === 'install'
                ? 'Installing...'
                : isInstalled
                ? `Reinstall Runtime (v${pinnedVersion})`
                : `Install Native ACP Runtime (v${pinnedVersion})`}
            </button>

            {status?.previousVersion && (
              <button
                type="button"
                className="agy-btn"
                onClick={handleRollbackRuntime}
                disabled={loading || actionBusy !== null}
              >
                {actionBusy === 'rollback'
                  ? 'Rolling back...'
                  : `Rollback to v${status.previousVersion}`}
              </button>
            )}
          </div>
        </div>

        {/* 5-Stage Setup Readiness Progress */}
        <div className="agy-readiness-steps">
          {NATIVE_STEPS.map((step) => {
            const currentIdx = NATIVE_STEPS.indexOf(nativeState);
            const stepIdx = NATIVE_STEPS.indexOf(step);
            const active = step === nativeState;
            const passed = stepIdx < currentIdx && nativeState !== 'runtime_missing';
            return (
              <span
                key={step}
                className={`agy-readiness-step ${
                  active ? 'active' : passed ? 'passed' : ''
                }`}
              >
                {NATIVE_STATE_LABELS[step]}
              </span>
            );
          })}
        </div>

        <p className="agy-desc">
          Runs Zana threads directly over Google&apos;s official Native ACP server (
          <code>agy_acp_server</code> + <code>localharness_external</code>). Auth method:{' '}
          <code>{status?.authMethod ?? 'oauth-personal'}</code>
          {status?.configuredAuthType
            ? ` (configured: ${status.configuredAuthType})`
            : ' (not yet configured)'}
        </p>

        {(status?.error || actionError) && (
          <p className="agy-desc agy-desc-error">
            {actionError || status?.error}
          </p>
        )}

        {isInstalled && (
          <div className="agy-actions-row">
            <button
              type="button"
              className="agy-btn agy-btn-primary"
              onClick={handleSignIn}
              disabled={loading || actionBusy !== null}
            >
              {actionBusy === 'login'
                ? 'Waiting for Google Sign-In in Browser...'
                : isReady
                ? 'Re-authenticate with Google'
                : 'Sign In with Google'}
            </button>

            <button
              type="button"
              className="agy-btn"
              onClick={handleProbeNative}
              disabled={loading || actionBusy !== null}
            >
              {actionBusy === 'probe' ? 'Verifying Session...' : 'Verify Session & Models'}
            </button>

            {status?.configuredAuthType && (
              <button
                type="button"
                className="agy-btn"
                onClick={handleSignOut}
                disabled={loading || actionBusy !== null}
              >
                Clear Auth Selection
              </button>
            )}
          </div>
        )}

        {status?.pendingAuthUrl && (
          <div>
            <p className="agy-desc">
              If your browser did not open automatically, copy this OAuth link:
            </p>
            <div className="agy-command-box">
              <span className="agy-command-text">{status.pendingAuthUrl}</span>
              <button
                type="button"
                className="agy-btn"
                onClick={() => copyToClipboard(status.pendingAuthUrl!, 'oauth')}
              >
                {copiedKey === 'oauth' ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>
        )}

        {status && status.models.length > 0 && (
          <div>
            <p className="agy-desc">
              Available Native ACP models ({status.models.length}):
            </p>
            <div className="agy-models-list">
              {status.models.map((m) => (
                <span key={m.id} className="agy-version-tag">
                  {m.name} ({m.id})
                </span>
              ))}
            </div>
          </div>
        )}

        {status && status.disabledDeadMcpServers.length > 0 && (
          <p className="agy-desc agy-desc-note">
            Automatically bypassed unreachable IDE named-pipe MCP proxies (
            <code>{status.disabledDeadMcpServers.join(', ')}</code>) to prevent 38s prompt stalls.
          </p>
        )}
      </div>

      {/* 2. Quick Setup Guide */}
      <div className="agy-steps-card">
        <h4 className="agy-steps-title">Quick Setup Guide</h4>
        <ol className="agy-steps-list">
          <li>
            Click <strong>Install Native ACP Runtime</strong> above to download
            and verify Google&apos;s official SHA-256 ACP archive (<code>agy_acp_server</code> +{' '}
            <code>localharness_external</code>).
          </li>
          <li>
            Select your <strong>Google ACP authentication method</strong> above (default:{' '}
            <code>oauth-personal</code>) and click <strong>Sign In with Google</strong>.
          </li>
          <li>
            Start a new thread in Zana and select <strong>Antigravity</strong> as the provider.
          </li>
        </ol>
      </div>
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.settingsSection({
    id: 'antigravity-provider',
    title: 'Antigravity Provider',
    description:
      'Configure Google Antigravity via Google Native ACP server (agy_acp_server)',
    component: AntigravitySettingsSection
  });
});
