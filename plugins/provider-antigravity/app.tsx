import { definePluginApp, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import React, { useState, useEffect, useCallback } from 'react';
import type { DoctorStatusResult } from './server.js';
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

export function AntigravitySettingsSection() {
  const rpc = useRpc();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DoctorStatusResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    ensureStyles();
  }, []);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rpc.call('doctor:status') as DoctorStatusResult;
      setStatus(res);
    } catch (err: any) {
      setStatus({
        installed: false,
        version: null,
        executable: 'agy',
        error: err?.message || 'Failed to communicate with plugin server.'
      });
    } finally {
      setLoading(false);
    }
  }, [rpc]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const isInstalled = status?.installed === true;

  return (
    <div className="agy-settings-panel">
      <div className="agy-status-card">
        <div className="agy-status-header">
          <div className="agy-status-title-row">
            <span
              className={`agy-status-indicator ${
                loading ? 'checking' : isInstalled ? 'ready' : 'warning'
              }`}
            />
            <span className="agy-status-label">
              {loading
                ? 'Checking Antigravity CLI...'
                : isInstalled
                ? 'Antigravity CLI Connected'
                : 'Antigravity CLI Not Detected'}
            </span>
            {isInstalled && status?.version && (
              <span className="agy-version-tag">v{status.version}</span>
            )}
          </div>

          <button
            type="button"
            className="agy-btn"
            onClick={checkHealth}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Run Doctor Check'}
          </button>
        </div>

        <p className="agy-desc">
          Zana runs threads using your Google Antigravity account via the Antigravity CLI (<code>agy</code>).
          Access Gemini 4 Argon, Gemini 3.8 Flash, Claude Opus 5.5, and more directly in your workspace.
        </p>

        {status?.error && (
          <p className="agy-desc agy-desc-error">
            {status.error}
          </p>
        )}

        {isInstalled ? (
          <div>
            <p className="agy-desc">
              To check active models and subscription quota from your terminal, run:
            </p>
            <div className="agy-command-box">
              <span className="agy-command-text">agy models</span>
              <button
                type="button"
                className="agy-btn"
                onClick={() => copyToClipboard('agy models', 'models')}
              >
                {copiedKey === 'models' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="agy-desc">
              Make sure Antigravity CLI (<code>agy</code>) is installed and available in your PATH:
            </p>
            <div className="agy-command-box">
              <span className="agy-command-text">agy --version</span>
              <button
                type="button"
                className="agy-btn"
                onClick={() => copyToClipboard('agy --version', 'version')}
              >
                {copiedKey === 'version' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="agy-steps-card">
        <h4 className="agy-steps-title">Quick Setup Guide</h4>
        <ol className="agy-steps-list">
          <li>Ensure the official Antigravity CLI (<code>agy</code>) is installed on your machine.</li>
          <li>Run <code>agy</code> in your terminal once to authenticate with your Google account.</li>
          <li>Click &quot;Run Doctor Check&quot; above to verify your local connectivity.</li>
          <li>In Zana, select <strong>Antigravity</strong> from the AI model picker to start a thread.</li>
        </ol>
      </div>
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.settingsSection({
    id: 'antigravity-provider',
    title: 'Antigravity Provider',
    description: 'Configure and verify Google Antigravity access via Antigravity CLI (agy)',
    component: AntigravitySettingsSection
  });
});
