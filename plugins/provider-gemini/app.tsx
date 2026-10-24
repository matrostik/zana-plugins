import { definePluginApp, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import React, { useState, useEffect, useCallback } from 'react';
import type { DoctorStatusResult } from './server.js';
import styles from './styles.css';

const STYLESHEET_ID = 'provider-gemini-styles';

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLESHEET_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLESHEET_ID;
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

export function GeminiSettingsSection() {
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
        executable: 'gemini',
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
    <div className="gemini-settings-panel">
      <div className="gemini-status-card">
        <div className="gemini-status-header">
          <div className="gemini-status-title-row">
            <span
              className={`gemini-status-indicator ${
                loading ? 'checking' : isInstalled ? 'ready' : 'warning'
              }`}
            />
            <span className="gemini-status-label">
              {loading
                ? 'Checking Gemini CLI...'
                : isInstalled
                ? 'Gemini CLI Connected'
                : 'Gemini CLI Not Detected'}
            </span>
            {isInstalled && status?.version && (
              <span className="gemini-version-tag">v{status.version}</span>
            )}
          </div>

          <button
            type="button"
            className="gemini-btn"
            onClick={checkHealth}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Run Doctor Check'}
          </button>
        </div>

        <p className="gemini-desc">
          Zana runs threads with your Google AI / Gemini Advanced subscription
          using the Gemini CLI over the Agent Client Protocol (ACP). Authentication
          is managed directly by your Google sign-in.
        </p>

        {status?.error && (
          <p className="gemini-desc" style={{ color: '#f87171' }}>
            {status.error}
          </p>
        )}

        {isInstalled ? (
          <div>
            <p className="gemini-desc" style={{ marginBottom: '0.5rem' }}>
              To sign in or switch your active Google subscription account, run in your terminal:
            </p>
            <div className="gemini-command-box">
              <span className="gemini-command-text">gemini</span>
              <button
                type="button"
                className="gemini-btn"
                onClick={() => copyToClipboard('gemini', 'login')}
              >
                {copiedKey === 'login' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="gemini-desc" style={{ marginBottom: '0.5rem' }}>
              Install the Gemini CLI globally via npm to enable this provider:
            </p>
            <div className="gemini-command-box">
              <span className="gemini-command-text">npm install -g @google/gemini-cli</span>
              <button
                type="button"
                className="gemini-btn"
                onClick={() => copyToClipboard('npm install -g @google/gemini-cli', 'install')}
              >
                {copiedKey === 'install' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="gemini-steps-card">
        <h4 className="gemini-steps-title">Quick Setup Guide</h4>
        <ol className="gemini-steps-list">
          <li>Install the official Gemini CLI (`npm install -g @google/gemini-cli`).</li>
          <li>Run `gemini` in your terminal to complete your Google account sign-in.</li>
          <li>Click &quot;Run Doctor Check&quot; above to verify connectivity.</li>
          <li>Start a new thread in Zana and select &quot;Gemini&quot; from the AI model picker.</li>
        </ol>
      </div>
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.settingsSection({
    id: 'gemini-provider',
    title: 'Gemini Provider',
    description: 'Configure and verify Google AI subscription access via Gemini CLI',
    component: GeminiSettingsSection
  });
});
