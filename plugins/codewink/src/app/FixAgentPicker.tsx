import { useEffect, useRef, useState, type RefObject } from 'react';
import type { FixAgentChoice, FixProvider, ModelChoice } from '../server/types.ts';
import { FIX_PERMISSION_MODES } from '../server/types.ts';
import { errorText } from './format.ts';
import type { Rpc } from './types.ts';

const PREFERENCE_KEY = 'codewink.fixAgent';
const [EDIT_MODE, ACCEPT_EDITS_MODE] = FIX_PERMISSION_MODES;
const PERMISSION_MODE_LABELS: Record<(typeof FIX_PERMISSION_MODES)[number], string> = {
  edit: 'Edit',
  'accept-edits': 'Accept edits',
  full: 'Full'
};

function readPreference(defaults: ModelChoice[]): FixAgentChoice | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCE_KEY) ?? 'null') as FixAgentChoice | null;
    if (saved && typeof saved.providerId === 'string' && typeof saved.model === 'string' && typeof saved.permissionMode === 'string') return { providerId: saved.providerId, model: saved.model, permissionMode: saved.permissionMode };
  } catch { /* Missing or invalid browser storage leaves the initial defaults intact. */ }
  return defaults[0] ? { providerId: defaults[0].providerId, model: defaults[0].model, permissionMode: EDIT_MODE } : null;
}

function useFixCatalog(rpc: Rpc, container: RefObject<HTMLDivElement | null>) {
  const [providers, setProviders] = useState<FixProvider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const previousFocus = document.activeElement;
    container.current?.focus();
    rpc.call('availableFixModels').then((value) => { if (!cancelled) setProviders(value as FixProvider[]); })
      .catch((cause) => { if (!cancelled) setError(errorText(cause)); });
    return () => { cancelled = true; if (previousFocus instanceof HTMLElement) previousFocus.focus(); };
  }, [rpc, container]);
  return { providers, error };
}

function resolveChoice(providers: FixProvider[], choice: FixAgentChoice | null) {
  const compatible = providers.filter((provider) => provider.models.length && provider.permissionModes.length);
  const provider = compatible.find((item) => item.providerId === choice?.providerId);
  const model = provider?.models.find((item) => item.id === choice?.model);
  const modes = provider?.permissionModes ?? [];
  const permissionMode = choice?.permissionMode === EDIT_MODE && !modes.includes(EDIT_MODE) && modes.includes(ACCEPT_EDITS_MODE) ? ACCEPT_EDITS_MODE : choice?.permissionMode ?? '';
  return { compatible, provider, model, modes, permissionMode, valid: Boolean(provider && model && modes.includes(permissionMode)) };
}

function useFixLaunch(onRun: (agent: FixAgentChoice) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async (agent: FixAgentChoice) => {
    setBusy(true);
    setError(null);
    try {
      try { localStorage.setItem(PREFERENCE_KEY, JSON.stringify(agent)); } catch { /* Launch still works when browser storage is disabled. */ }
      await onRun(agent);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  return { busy, error, start };
}

/** Chooses one explicit launch configuration; failed launches stay open for correction. */
export function FixAgentPicker(props: { rpc: Rpc; defaults: ModelChoice[]; onRun(agent: FixAgentChoice): Promise<void>; onClose(): void }) {
  const container = useRef<HTMLDivElement>(null);
  const { providers, error: catalogError } = useFixCatalog(props.rpc, container);
  const [choice, setChoice] = useState(() => readPreference(props.defaults));
  const { busy, error: launchError, start } = useFixLaunch(props.onRun);
  const { valid, permissionMode } = resolveChoice(providers ?? [], choice);
  const error = launchError ?? catalogError;

  return (
    <div className="cn-banner cn-fix-picker" role="dialog" aria-label="Fix with agent" tabIndex={-1} ref={container} onKeyDown={(event) => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); props.onClose(); } }}>
      <h3>Fix with agent</h3>
      <p className="cn-muted cn-small">Choose the agent that will edit this checkout. Your choices are remembered for next time.</p>
      {error ? <p className="cn-banner cn-banner-error" role="alert">{error}</p> : null}
      {!providers && !error ? <p className="cn-muted">Loading models…</p> : null}
      {providers ? <FixAgentFields providers={providers} choice={choice} busy={busy} onChange={setChoice} /> : null}
      <div className="cn-inline">
        <button type="button" className="cn-btn cn-btn-primary" disabled={busy || !valid} onClick={() => { if (choice && valid) void start({ ...choice, permissionMode }); }}>{busy ? 'Starting…' : 'Start fix'}</button>
        <button type="button" className="cn-btn" disabled={busy} onClick={props.onClose}>Cancel</button>
      </div>
    </div>
  );
}

function FixAgentFields({ providers, choice, busy, onChange }: { providers: FixProvider[]; choice: FixAgentChoice | null; busy: boolean; onChange(choice: FixAgentChoice): void }) {
  const { compatible, provider, model, modes, permissionMode } = resolveChoice(providers, choice);
  const setChoice = (change: (old: FixAgentChoice | null) => FixAgentChoice | null) => { const next = change(choice); if (next) onChange(next); };
  const chooseProvider = (id: string) => {
    const next = compatible.find((item) => item.providerId === id);
    if (!next) return;
    onChange({ providerId: id, model: next.models[0].id, permissionMode: next.permissionModes.includes(EDIT_MODE) ? EDIT_MODE : next.permissionModes.includes(ACCEPT_EDITS_MODE) ? ACCEPT_EDITS_MODE : '' });
  };
  return <div className="cn-fields">
        <label className="cn-field"><span>Provider</span><select className="cn-select" aria-label="Provider" value={choice?.providerId ?? ''} disabled={busy} onChange={(event) => chooseProvider(event.target.value)}>
          <option value="" disabled>Choose provider</option>
          {choice && !provider ? <option value={choice.providerId} disabled>{choice.providerId} (unavailable)</option> : null}
          {compatible.map((item) => <option key={item.providerId} value={item.providerId}>{item.displayName}</option>)}
        </select></label>
        <label className="cn-field"><span>Model</span><select className="cn-select" aria-label="Model" value={choice?.model ?? ''} disabled={busy || !provider} onChange={(event) => setChoice((old) => old ? { providerId: old.providerId, model: event.target.value, permissionMode: old.permissionMode } : old)}>
          <option value="" disabled>Choose model</option>
          {choice && !model ? <option value={choice.model} disabled>{choice.model} (unavailable)</option> : null}
          {provider?.models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <label className="cn-field"><span>Mode</span><select className="cn-select" aria-label="Mode" value={permissionMode} disabled={busy || !provider} onChange={(event) => setChoice((old) => old ? { ...old, permissionMode: event.target.value } : old)}>
          <option value="" disabled>Choose mode</option>
          {!modes.includes(permissionMode) && permissionMode ? <option value={permissionMode} disabled>{permissionMode} (unavailable)</option> : null}
          {modes.map((mode) => <option key={mode} value={mode}>{PERMISSION_MODE_LABELS[mode as keyof typeof PERMISSION_MODE_LABELS] ?? mode}</option>)}
        </select></label>
        {providers.length > 0 && !compatible.length ? <p className="cn-muted">No providers currently offer models with Edit or Full mode.</p> : null}
        {providers.length === 0 ? <p className="cn-muted">No providers available. Configure a provider in Zana settings.</p> : null}
      </div>;
}
