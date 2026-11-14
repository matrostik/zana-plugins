import { useEffect, useRef, useState } from 'react';
import { useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import { COMPARISON_SETUP_RPC, type ComparisonConnectionStatus } from '../shared/comparison-setup.ts';

function isConnectionStatus(value: unknown): value is ComparisonConnectionStatus {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'configured' in value &&
    'encryptionAvailable' in value
  );
}

function useConnectionSettings() {
  const rpc = useRpc();
  const rpcRef = useRef(rpc);
  rpcRef.current = rpc;
  const mounted = useRef(true);
  const [status, setStatus] = useState<ComparisonConnectionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    void rpcRef.current.call(COMPARISON_SETUP_RPC.status).then((result) => {
      if (mounted.current && isConnectionStatus(result)) setStatus(result);
    }).catch(() => { if (mounted.current) setError('Could not load the Artificial Analysis connection settings.'); });
    return () => { mounted.current = false; };
  }, []);
  const run = async (method: string, key?: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = key === undefined
        ? await rpcRef.current.call(method)
        : await rpcRef.current.call(method, { key });
      if (mounted.current && isConnectionStatus(result)) setStatus(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update the connection.';
      const safe = key && message.includes(key) ? 'Could not connect. Check your key and network connection.' : message;
      if (mounted.current) setError(safe);
    } finally { if (mounted.current) setBusy(false); }
  };
  return { status, busy, error, run };
}

function useCooldown(retryAtMs: number | null | undefined) {
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!retryAtMs || retryAtMs <= clock) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.min(1000, retryAtMs - clock));
    return () => clearTimeout(timer);
  }, [retryAtMs, clock]);
  return Boolean(retryAtMs && retryAtMs > clock);
}

export function ComparisonKeySettings() {
  const { status, busy, error, run } = useConnectionSettings();
  const field = useRef<HTMLInputElement>(null);
  const coolingDown = useCooldown(status?.retryAtMs);
  const save = () => {
    const key = field.current?.value ?? '';
    if (field.current) field.current.value = '';
    void run(COMPARISON_SETUP_RPC.connect, key);
  };
  return (
    <section className="aum-card" aria-label="Artificial Analysis connection">
      <h3 style={{ marginTop: 0 }}>Artificial Analysis</h3>
      <p className="aum-subtext">Bring your own API key to load model benchmarks. The key is encrypted for your Windows account and is never displayed after saving.</p>
      {error && <div className="aum-banner aum-banner-error" role="alert">{error}</div>}
      {!status && !error && <p role="status">Checking encrypted key storage…</p>}
      {status && <>
        <p role="status">{status.configured ? 'Key configured' : 'No key configured'}</p>
        {!status.encryptionAvailable && <p className="aum-subtext">Encrypted key storage is currently supported on Windows. Saving is disabled on this backend.</p>}
        {coolingDown && <p role="status">Refresh paused until {new Date(status.retryAtMs!).toLocaleString()}.</p>}
        <form onSubmit={(event) => { event.preventDefault(); save(); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 6 }}>Artificial Analysis API key
            <input ref={field} type="password" autoComplete="off" spellCheck={false} maxLength={4096} required className="aum-input" disabled={busy || !status.encryptionAvailable} />
          </label>
          <button className="aum-btn aum-btn-primary" type="submit" disabled={busy || !status.encryptionAvailable || coolingDown}>
            {busy ? 'Connecting…' : status.configured ? 'Replace and connect' : 'Save and connect'}
          </button>
          {status.configured && <button className="aum-btn" type="button" disabled={busy} onClick={() => void run(COMPARISON_SETUP_RPC.removeKey)}>Remove key</button>}
        </form>
        {status.connectedAtMs !== null && <p className="aum-subtext">Connected {new Date(status.connectedAtMs).toLocaleString()}.</p>}
      </>}
      <p className="aum-subtext"><a href="https://artificialanalysis.ai/data-api" target="_blank" rel="noopener noreferrer">Get a key from Artificial Analysis</a></p>
    </section>
  );
}
