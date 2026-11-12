import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LOCAL_WHISPER_METHODS, type LocalWhisperModelView, type LocalWhisperResponse, type LocalWhisperStateView } from '../shared/protocol.ts';

type Rpc = { call(method: string, input?: unknown): Promise<unknown> };

/** Poll fast while something is changing, slowly otherwise to notice a crashed server. */
export const BUSY_POLL_MS = 500;
export const IDLE_POLL_MS = 5000;

export function formatSize(bytes: number): string {
  if (bytes >= 1000 ** 3) return `${(bytes / 1000 ** 3).toFixed(1)} GB`;
  return `${Math.round(bytes / 1000 ** 2)} MB`;
}

function isBusy(state: LocalWhisperStateView): boolean {
  return state.runtime.status === 'installing' || state.server.state === 'starting' || state.models.some((m) => m.status === 'downloading');
}

function isResponse(value: unknown): value is LocalWhisperResponse {
  return typeof value === 'object' && value !== null && typeof (value as { ok?: unknown }).ok === 'boolean';
}

/** Loads Local Whisper state, polls while it changes, and runs actions. */
function useLocalWhisper(rpc: Rpc) {
  const [state, setState] = useState<LocalWhisperStateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const mounted = useRef(true);

  const apply = useCallback((value: unknown) => {
    if (!mounted.current) return;
    if (!isResponse(value)) {
      setError('Local Whisper returned an unexpected response.');
      return;
    }
    if (value.state) setState(value.state);
    setError(value.ok ? null : value.message);
  }, []);

  const refresh = useCallback(
    () => rpc.call(LOCAL_WHISPER_METHODS.state).then(apply, () => mounted.current && setError('Could not load Local Whisper status.')),
    [rpc, apply]
  );

  const run = useCallback(
    async (key: string, method: string, input?: unknown) => {
      setPending(key);
      try {
        apply(await rpc.call(method, input));
      } catch {
        if (mounted.current) setError('Local Whisper request failed. Try again.');
      } finally {
        if (mounted.current) setPending(null);
      }
    },
    [rpc, apply]
  );

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const busy = state ? isBusy(state) : false;
  useEffect(() => {
    const timer = setInterval(() => void refresh(), busy ? BUSY_POLL_MS : IDLE_POLL_MS);
    return () => clearInterval(timer);
  }, [busy, refresh]);

  return { state, error, pending, run };
}

function StatusDot({ tone }: { tone: 'ok' | 'warn' | 'err' | 'busy' | 'idle' }) {
  const colors = { ok: 'var(--ps-success)', warn: 'var(--ps-warn)', err: 'var(--ps-danger)', busy: 'var(--ps-accent)', idle: 'var(--ps-text-muted)' };
  return <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', marginTop: 4, flex: 'none', background: colors[tone] }} />;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(value * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} style={{ height: 5, minWidth: 80, background: 'var(--ps-bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${percent}%`, height: '100%', background: 'var(--ps-accent)' }} />
    </div>
  );
}

const rowStyle: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--ps-border)' };
const mutedSmall: React.CSSProperties = { color: 'var(--ps-text-muted)', fontSize: 11 };

interface RuntimeView {
  tone: 'ok' | 'warn' | 'err' | 'busy' | 'idle';
  title: string;
  detail: string;
  action?: { label: string; method: string; primary?: boolean };
}

/** Describes the runtime and server row. Pure, so each state is easy to test. */
export function describeRuntime(state: LocalWhisperStateView): RuntimeView {
  const { runtime, server, activeModelId } = state;
  if (runtime.status === 'not-installed') {
    return { tone: 'idle', title: 'Runtime not installed', detail: `whisper.cpp ${runtime.version} · requires ${runtime.requirements.join(', ') || 'no extra components'}`, action: { label: 'Install runtime', method: LOCAL_WHISPER_METHODS.installRuntime, primary: true } };
  }
  if (runtime.status === 'installing') {
    return { tone: 'busy', title: `Installing runtime… ${Math.round((runtime.progress ?? 0) * 100)}%`, detail: 'Verifying the download as it arrives.', action: { label: 'Cancel', method: LOCAL_WHISPER_METHODS.cancelRuntimeInstall } };
  }
  if (server.state === 'running') {
    return { tone: 'ok', title: 'Running', detail: `Model ${server.modelId} · on this device (127.0.0.1) · managed by Prompt Voice`, action: { label: 'Stop', method: LOCAL_WHISPER_METHODS.stop } };
  }
  if (server.state === 'starting') return { tone: 'busy', title: 'Starting…', detail: `Loading model ${server.modelId}.` };
  if (server.state === 'crashed') {
    return { tone: 'err', title: 'Stopped unexpectedly', detail: `Exit code ${server.exitCode ?? 'unknown'}. Logs contain no audio or transcripts.`, action: { label: 'Restart', method: LOCAL_WHISPER_METHODS.start, primary: true } };
  }
  if (!activeModelId) return { tone: 'warn', title: 'Runtime installed', detail: 'Download a model below and choose Use to start.' };
  return { tone: 'warn', title: 'Stopped', detail: 'Starts automatically when you dictate.', action: { label: 'Start', method: LOCAL_WHISPER_METHODS.start } };
}

function ModelRow({ model, state, pending, onRun }: { model: LocalWhisperModelView; state: LocalWhisperStateView; pending: string | null; onRun: (key: string, method: string, input?: unknown) => void }) {
  const active = state.activeModelId === model.id;
  const canUse = state.runtime.status === 'installed' && !active;
  const busyKey = (action: string) => `${action}:${model.id}`;
  const input = { modelId: model.id };
  let status: React.ReactNode = null;
  let actions: React.ReactNode;
  if (model.status === 'downloading') {
    status = <><ProgressBar value={model.progress ?? 0} label={`Downloading ${model.label}`} /><span style={mutedSmall}>{Math.round((model.progress ?? 0) * 100)}% of {formatSize(model.sizeBytes)}</span></>;
    actions = <button type="button" className="ps-btn" onClick={() => onRun(busyKey('cancel'), LOCAL_WHISPER_METHODS.cancelModelDownload, input)}>Cancel</button>;
  } else if (model.status === 'available') {
    actions = <button type="button" className="ps-btn" disabled={pending === busyKey('download')} onClick={() => onRun(busyKey('download'), LOCAL_WHISPER_METHODS.downloadModel, input)}>Download {formatSize(model.sizeBytes)}</button>;
  } else {
    status = active ? <span className="ps-tag">Active</span> : pending === busyKey('use') ? <span className="ps-tag">Loading…</span> : <span className="ps-tag">Installed</span>;
    actions = (
      <>
        {canUse && <button type="button" className="ps-btn" disabled={pending !== null} onClick={() => onRun(busyKey('use'), LOCAL_WHISPER_METHODS.selectModel, input)}>Use</button>}
        <button type="button" className="ps-btn ps-btn-danger" disabled={active || pending !== null} title={active ? 'Choose another model before removing this one' : undefined} aria-label={`Remove ${model.label}`} onClick={() => onRun(busyKey('remove'), LOCAL_WHISPER_METHODS.removeModel, input)}>Remove</button>
      </>
    );
  }
  return (
    <tr style={active ? { background: 'color-mix(in srgb, var(--ps-accent) 10%, transparent)' } : undefined}>
      <td style={{ padding: '8px 6px' }}>
        <strong>{model.label}</strong> {model.recommended && <span className="ps-tag">Recommended</span>}
      </td>
      <td style={{ padding: '8px 6px', ...mutedSmall }}>{formatSize(model.sizeBytes)} disk{model.memoryEstimate ? <><br />{model.memoryEstimate} RAM</> : null}</td>
      <td style={{ padding: '8px 6px' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{status}</div></td>
      <td style={{ padding: '8px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}><div style={{ display: 'inline-flex', gap: 6 }}>{actions}</div></td>
    </tr>
  );
}

/** Whether audio and text stay on this device with the current speech and cleanup choices. */
export function describePrivacy(sttProvider: string | undefined, llmProvider: string | undefined): { offline: boolean; text: string } {
  const local = sttProvider === 'local-whisper';
  const cleanupOff = llmProvider === 'none';
  if (local && cleanupOff) return { offline: true, text: 'Audio and text stay on this device.' };
  if (local) return { offline: false, text: 'Audio stays on this device. Cleanup sends the transcript to your selected cleanup model.' };
  return { offline: false, text: 'Audio leaves this device for transcription.' };
}

export interface LocalWhisperSettingsProps {
  rpc: Rpc;
  sttProvider?: string;
  llmProvider?: string;
  /** Saves a settings patch through the page's settings store. */
  onApplyPreset: (patch: Record<string, string>) => void;
}

/** Settings → Local Whisper: runtime status, model catalog, and the offline preset. */
export function LocalWhisperSettings({ rpc, sttProvider, llmProvider, onApplyPreset }: LocalWhisperSettingsProps) {
  const { state, error, pending, run } = useLocalWhisper(rpc);
  const privacy = describePrivacy(sttProvider, llmProvider);
  const ready = state?.runtime.status === 'installed' && state.activeModelId !== null;
  return (
    <section className="ps-pane" style={{ flex: 'none' }} aria-labelledby="ps-lw-title">
      <div className="ps-pane-header">
        <h2 id="ps-lw-title" className="ps-pane-title" style={{ margin: 0 }}>Local Whisper</h2>
        <span className="ps-tag">{!state ? 'Loading…' : !state.platform.supported ? 'Unavailable' : ready ? 'Ready' : 'Not set up'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
        <p style={{ ...mutedSmall, margin: 0 }}>Transcribe on this device. Audio is never sent anywhere when Local Whisper is the speech provider.</p>
        {(error || state?.lastError) && <div role="alert" style={{ ...rowStyle, borderColor: 'var(--ps-danger)', color: 'var(--ps-danger)', fontSize: 12 }}>{error ?? state?.lastError?.message}</div>}
        {state && !state.platform.supported && <div style={rowStyle}><StatusDot tone="err" /><div><strong>Not available on this computer</strong><div style={mutedSmall}>{state.platform.message}</div></div></div>}
        {state?.platform.supported && <RuntimeRow state={state} pending={pending} onRun={run} />}
        {state?.platform.supported && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="ps-field-label">Models · multilingual</span>
              <span style={mutedSmall}>Stored in this computer's app data</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['Model', 'Size', 'Status', ''].map((h) => <th key={h} style={{ textAlign: 'left', ...mutedSmall, fontWeight: 600, padding: '4px 6px' }}>{h}</th>)}</tr></thead>
              <tbody>{state.models.map((model) => <ModelRow key={model.id} model={model} state={state} pending={pending} onRun={run} />)}</tbody>
            </table>
          </div>
        )}
        <div style={rowStyle}>
          <StatusDot tone={privacy.offline ? 'ok' : 'warn'} />
          <div style={{ flex: 1 }}><strong>{privacy.offline ? 'Fully offline' : 'Not fully offline'}</strong><div style={mutedSmall}>{privacy.text}</div></div>
          {!privacy.offline && <button type="button" className="ps-btn" onClick={() => onApplyPreset({ sttProvider: 'local-whisper', llmProvider: 'none' })}>Use offline preset</button>}
        </div>
      </div>
    </section>
  );
}

function RuntimeRow({ state, pending, onRun }: { state: LocalWhisperStateView; pending: string | null; onRun: (key: string, method: string, input?: unknown) => void }) {
  const view = describeRuntime(state);
  return (
    <div style={rowStyle} aria-live="polite">
      <StatusDot tone={view.tone} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{view.title}</strong>
        <div style={mutedSmall}>{view.detail}</div>
        {state.runtime.status === 'installing' && <div style={{ marginTop: 6 }}><ProgressBar value={state.runtime.progress ?? 0} label="Installing runtime" /></div>}
      </div>
      {view.action && (
        <button type="button" className={view.action.primary ? 'ps-btn ps-btn-primary' : 'ps-btn'} disabled={pending === 'runtime'} onClick={() => onRun('runtime', view.action!.method)}>
          {view.action.label}
        </button>
      )}
    </div>
  );
}
