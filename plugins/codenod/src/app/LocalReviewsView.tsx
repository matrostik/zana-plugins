import { useCallback, useEffect, useState } from 'react';
import { useRealtime } from '@zana-ai/zcc-plugin-sdk/app';
import type { LocalLocationSummary } from '../server/local/service.ts';
import type { ModelChoice } from '../server/types.ts';
import { errorText, relativeTime, scoreTone } from './format.ts';
import { LocalDetail } from './LocalDetail.tsx';
import type { LocalOverview, Rpc } from './types.ts';

const SELECTED_KEY = 'codenod.localTarget';
const FOCUS_RELOAD_THROTTLE_MS = 60_000;

function savedSelection(): string | null {
  try {
    return globalThis.localStorage?.getItem(SELECTED_KEY) ?? null;
  } catch {
    return null;
  }
}

function isLocalChange(payload: unknown): boolean {
  const record = (payload ?? {}) as { local?: unknown; prId?: unknown };
  return record.local === true || (typeof record.prId === 'string' && record.prId.startsWith('local:'));
}

function LocationRow({ location, selected, onSelect }: { location: LocalLocationSummary; selected: boolean; onSelect(): void }) {
  const latest = location.latest;
  const tone = scoreTone(latest?.riskScore ?? null, 'risk');
  const folder = location.worktreePath.split(/[\\/]/).filter(Boolean).pop() ?? location.worktreePath;
  return (
    <li>
      <button type="button" className="cn-row" aria-current={selected} onClick={onSelect}>
        <div className="cn-row-title">{location.branch ?? 'Detached HEAD'}</div>
        <div className="cn-row-meta">
          <span className="cn-mono" title={location.worktreePath}>
            {folder}
          </span>
          {location.isMain ? <span>main checkout</span> : null}
          {location.changedFiles === null ? (
            <span className="cn-badge cn-badge-muted">Status unavailable</span>
          ) : (
            <span className="cn-badge cn-badge-muted">{location.changedFiles === 0 ? 'Clean' : `${location.changedFiles} changed`}</span>
          )}
          {latest && (latest.status === 'queued' || latest.status === 'running') ? <span className="cn-badge cn-badge-warn">Reviewing…</span> : null}
          {latest?.status === 'completed' && latest.riskScore !== null ? <span className={`cn-badge cn-badge-${tone}`}>Risk {latest.riskScore}/10</span> : null}
          {latest?.status === 'failed' ? <span className="cn-badge cn-badge-danger">Review failed</span> : null}
          {latest ? <span>{relativeTime(latest.createdAt)}</span> : null}
        </div>
      </button>
    </li>
  );
}

export function LocalReviewsView(props: { rpc: Rpc; defaultModels: ModelChoice[]; hasModels: boolean; onOpenSettings(): void; reloadToken: number }) {
  const { rpc } = props;
  const [overview, setOverview] = useState<LocalOverview | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(savedSelection);
  const [showClean, setShowClean] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    rpc
      .call('localTargets')
      .then((value) => {
        setOverview(value as LocalOverview);
        setError(null);
      })
      .catch((cause) => setError(errorText(cause)));
  }, [rpc]);

  useEffect(load, [load, props.reloadToken]);
  useRealtime('codenod:changed', (payload) => {
    if (isLocalChange(payload)) load();
  });
  useEffect(() => {
    let lastLoadedAt = Date.now();
    const resume = () => {
      if (document.visibilityState === 'hidden' || Date.now() - lastLoadedAt < FOCUS_RELOAD_THROTTLE_MS) return;
      lastLoadedAt = Date.now();
      load();
    };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [load]);

  const select = (targetId: string) => {
    setSelectedId(targetId);
    try {
      globalThis.localStorage?.setItem(SELECTED_KEY, targetId);
    } catch {
      // Not critical.
    }
  };

  const locations = overview?.locations ?? [];
  const visible = locations.filter((location) => showClean || location.changedFiles !== 0 || location.targetId === selectedId);
  const hiddenClean = locations.length - visible.length;
  const groups = new Map<string, LocalLocationSummary[]>();
  for (const location of visible) groups.set(location.projectName, [...(groups.get(location.projectName) ?? []), location]);
  const selected = locations.find((location) => location.targetId === selectedId) ?? null;

  return (
    <div className="cn-body">
      <nav className="cn-list" aria-label="Local checkouts">
        <div className="cn-list-tools">
          <label className="cn-check cn-small">
            <input type="checkbox" checked={showClean} onChange={(event) => setShowClean(event.target.checked)} />
            Show clean{hiddenClean > 0 ? ` (${hiddenClean} hidden)` : ''}
          </label>
        </div>
        {error ? <p className="cn-banner cn-banner-error">{error}</p> : null}
        {!overview && !error ? <p className="cn-empty">Looking for checkouts…</p> : null}
        {overview && locations.length === 0 ? <p className="cn-empty">No checkouts found. Add a project with a local folder in Zana to review its changes.</p> : null}
        {overview && locations.length > 0 && visible.length === 0 ? <p className="cn-empty">Every checkout is clean. Turn on Show clean to see them.</p> : null}
        <div className="cn-rows">
          {[...groups].map(([projectName, rows]) => (
            <section key={projectName} aria-label={projectName}>
              <h3 className="cn-local-group">{projectName}</h3>
              <ul className="cn-local-rows">
                {rows.map((location) => (
                  <LocationRow key={location.targetId} location={location} selected={location.targetId === selectedId} onSelect={() => select(location.targetId)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </nav>
      {selected ? (
        <LocalDetail
          key={selected.targetId}
          rpc={rpc}
          location={selected}
          defaultModels={props.defaultModels}
          hasModels={overview?.hasModels ?? props.hasModels}
          onOpenSettings={props.onOpenSettings}
          reloadToken={props.reloadToken}
        />
      ) : (
        <div className="cn-detail">
          <p className="cn-empty">{props.hasModels ? 'Select a checkout to review its local changes.' : 'Start by choosing review models in Settings.'}</p>
        </div>
      )}
    </div>
  );
}
