import { useCallback, useEffect, useState } from 'react';
import { useRealtime, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import type { ModelChoice, PrBucket } from '../server/types.ts';
import { errorText, relativeTime } from './format.ts';
import { PrDetail } from './PrDetail.tsx';
import { PrList } from './PrList.tsx';
import { SettingsView } from './SettingsView.tsx';
import type { ConfigSnapshot, Overview } from './types.ts';

const TAB_KEY = 'codenod.tab';

function initialTab(): PrBucket {
  try {
    const saved = globalThis.localStorage?.getItem(TAB_KEY);
    if (saved === 'needs-review' || saved === 'mine' || saved === 'watched') return saved;
  } catch {
    // Storage may be unavailable; fall back to the default tab.
  }
  return 'needs-review';
}

export function CodenodPanel({ pluginId }: { pluginId: string; subPath?: string }) {
  const rpc = useRpc();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [models, setModels] = useState<ModelChoice[]>([]);
  const [tab, setTab] = useState<PrBucket>(initialTab);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'inbox' | 'settings'>('inbox');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    rpc
      .call('overview')
      .then((value) => {
        setOverview(value as Overview);
        setError(null);
      })
      .catch((cause) => setError(errorText(cause)));
    rpc
      .call('config')
      .then((value) => setModels((value as ConfigSnapshot).models))
      .catch(() => undefined);
  }, [rpc]);

  useEffect(load, [load]);
  useRealtime('codenod:changed', load);

  const changeTab = (next: PrBucket) => {
    setTab(next);
    try {
      globalThis.localStorage?.setItem(TAB_KEY, next);
    } catch {
      // Not critical.
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await rpc.call('refresh');
      load();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setRefreshing(false);
    }
  };

  const hostProblems = overview?.hosts.filter((host) => host.error) ?? [];

  return (
    <div className="cn-root">
      <div className="cn-toolbar">
        <h1>CodeNod</h1>
        {overview?.lastSyncAt ? <span className="cn-muted cn-small">Synced {relativeTime(overview.lastSyncAt)}</span> : null}
        {overview && overview.activeReviews > 0 ? (
          <span className="cn-badge cn-badge-warn" role="status">
            {overview.activeReviews} review{overview.activeReviews === 1 ? '' : 's'} running
          </span>
        ) : null}
        <span className="cn-spacer" />
        {view === 'inbox' ? (
          <button type="button" className="cn-btn" disabled={refreshing || overview?.syncing} onClick={() => void refresh()}>
            {refreshing || overview?.syncing ? 'Syncing…' : 'Refresh'}
          </button>
        ) : null}
        <button type="button" className="cn-btn" aria-pressed={view === 'settings'} onClick={() => setView(view === 'settings' ? 'inbox' : 'settings')}>
          {view === 'settings' ? 'Back to pull requests' : 'Settings'}
        </button>
      </div>
      {error ? <p className="cn-banner cn-banner-error">{error}</p> : null}
      {view === 'inbox' && hostProblems.length > 0 ? (
        <p className="cn-banner cn-banner-error">
          {hostProblems.map((host) => `${host.host}: ${host.error}`).join(' · ')}
        </p>
      ) : null}

      {view === 'settings' ? (
        <div className="cn-settings">
          <SettingsView rpc={rpc} />
        </div>
      ) : (
        <div className="cn-body">
          <PrList
            items={overview?.prs ?? []}
            tab={tab}
            onTabChange={changeTab}
            query={query}
            onQueryChange={setQuery}
            selectedId={selectedId}
            onSelect={setSelectedId}
            hasWatchedRepos={overview?.hasWatchedRepos ?? false}
          />
          {selectedId ? (
            <PrDetail
              rpc={rpc}
              pluginId={pluginId}
              prId={selectedId}
              defaultModels={models}
              hasModels={overview?.hasModels ?? models.length > 0}
              onOpenSettings={() => setView('settings')}
            />
          ) : (
            <div className="cn-detail">
              <p className="cn-empty">
                {overview && !overview.hasModels ? 'Start by choosing review models in Settings.' : 'Select a pull request to see its review.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
