import { useCallback, useEffect, useState } from 'react';
import { useRealtime, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import type { ModelChoice, PrBucket } from '../server/types.ts';
import { errorText, relativeTime } from './format.ts';
import { LocalReviewsView } from './LocalReviewsView.tsx';
import { PrDetail } from './PrDetail.tsx';
import { PrList } from './PrList.tsx';
import { ProjectRepoBanners } from './ProjectRepoBanners.tsx';
import { Segmented, type SegmentedOption } from './Segmented.tsx';
import { SettingsView, type SettingsTab } from './SettingsView.tsx';
import { storageKey } from './storage.ts';
import type { ConfigSnapshot, Overview } from './types.ts';

const TAB_KEY = 'codewink.tab';
const MODE_KEY = 'codewink.mode';
const FOCUS_SYNC_THROTTLE_MS = 60_000;

type Mode = 'pr' | 'local';
const MODES: Array<SegmentedOption<Mode>> = [
  { id: 'pr', label: 'Pull requests' },
  { id: 'local', label: 'Local changes' }
];

/** The saved mode, or null when none was saved so a project without a GitHub remote can default to local changes. */
function savedMode(projectId?: string): Mode | null {
  try {
    const saved = globalThis.localStorage?.getItem(storageKey(MODE_KEY, projectId));
    return saved === 'local' || saved === 'pr' ? saved : null;
  } catch {
    return null;
  }
}

function initialTab(projectId?: string): PrBucket {
  try {
    const saved = globalThis.localStorage?.getItem(storageKey(TAB_KEY, projectId));
    if (saved === 'needs-review' || saved === 'mine' || saved === 'watched') return saved;
  } catch {
    // Storage may be unavailable; fall back to the default tab.
  }
  return 'needs-review';
}

type PanelProps = { pluginId: string; subPath?: string; projectId?: string };

export function CodewinkPanel(props: PanelProps) {
  return <CodewinkPanelContent key={props.projectId ?? ''} {...props} />;
}

function CodewinkPanelContent({ pluginId, projectId }: PanelProps) {
  const rpc = useRpc();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [models, setModels] = useState<ModelChoice[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [tab, setTab] = useState<PrBucket>(() => initialTab(projectId));
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'inbox' | 'settings'>('inbox');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [chosenMode, setMode] = useState<Mode | null>(() => savedMode(projectId));
  const [localReloadToken, setLocalReloadToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noRemote = overview?.projectRepos?.length === 0;
  const mode: Mode = chosenMode ?? (noRemote ? 'local' : 'pr');

  const load = useCallback(() => {
    // Models come from `config` when the overview omits them or fails; a config failure is shown unless an overview error already is.
    const loadConfigModels = () =>
      rpc
        .call('config')
        .then((configValue) => {
          setModels((configValue as ConfigSnapshot).models);
          setModelsLoaded(true);
        })
        .catch((cause) => setError((current) => current ?? errorText(cause)));
    (projectId ? rpc.call('overview', { projectId }) : rpc.call('overview'))
      .then((value) => {
        const nextOverview = value as Overview;
        setOverview(nextOverview);
        setError(null);
        if (Array.isArray(nextOverview.models)) {
          setModels(nextOverview.models);
          setModelsLoaded(true);
        } else {
          void loadConfigModels();
        }
      })
      .catch((cause) => {
        setError(errorText(cause));
        void loadConfigModels();
      });
  }, [rpc, projectId]);

  useEffect(load, [load]);
  useRealtime('codewink:changed', load);

  useEffect(() => {
    let lastCheckedAt = 0;
    let inFlight = false;
    const resume = () => {
      if (document.visibilityState === 'hidden' || inFlight || Date.now() - lastCheckedAt < FOCUS_SYNC_THROTTLE_MS) return;
      lastCheckedAt = Date.now();
      inFlight = true;
      void rpc.call('refresh').then(load).catch((cause) => setError(errorText(cause))).finally(() => { inFlight = false; });
    };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [rpc, load]);

  const changeTab = (next: PrBucket) => {
    setTab(next);
    try {
      globalThis.localStorage?.setItem(storageKey(TAB_KEY, projectId), next);
    } catch {
      // Not critical.
    }
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    try {
      globalThis.localStorage?.setItem(storageKey(MODE_KEY, projectId), next);
    } catch {
      // Not critical.
    }
  };

  const openModelsSettings = () => {
    setSettingsTab('models');
    setView('settings');
  };

  const refresh = async () => {
    if (mode === 'local') {
      setLocalReloadToken((token) => token + 1);
      return;
    }
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
  const activeFixes = overview?.activeFixes ?? 0;

  return (
    <div className="cn-root">
      <div className="cn-toolbar">
        <h1>CodeWink</h1>
        {view === 'inbox' ? <Segmented label="Review source" options={MODES} value={mode} onChange={changeMode} className="cn-mode-switch" /> : null}
        {mode === 'pr' && overview?.lastSyncAt ? <span className="cn-muted cn-small">Synced {relativeTime(overview.lastSyncAt)}</span> : null}
        {overview && overview.autoSyncEnabled === false ? (
          <span className="cn-badge cn-badge-muted" title="Automatic repository sync is disabled">
            Auto-sync off
          </span>
        ) : null}
        {overview && overview.activeReviews > 0 ? (
          <span className="cn-badge cn-badge-warn" role="status">
            {overview.activeReviews} review{overview.activeReviews === 1 ? '' : 's'} running
          </span>
        ) : null}
        {activeFixes > 0 ? (
          <span className="cn-badge cn-badge-warn" role="status">
            {activeFixes} fix{activeFixes === 1 ? '' : 'es'} running
          </span>
        ) : null}
        <span className="cn-spacer" />
        {view === 'inbox' ? (
          <button type="button" className="cn-btn" disabled={mode === 'pr' && (refreshing || overview?.syncing)} onClick={() => void refresh()}>
            {mode === 'pr' && (refreshing || overview?.syncing) ? 'Syncing…' : 'Refresh'}
          </button>
        ) : null}
        <button
          type="button"
          className="cn-btn"
          aria-pressed={view === 'settings'}
          onClick={() => {
            if (view === 'settings') {
              setView('inbox');
            } else {
              setSettingsTab('profile');
              setView('settings');
            }
          }}
        >
          {view === 'settings' ? (mode === 'local' ? 'Back to local changes' : 'Back to pull requests') : 'Settings'}
        </button>
      </div>
      {error ? <p className="cn-banner cn-banner-error">{error}</p> : null}
      {view === 'inbox' && mode === 'pr' && hostProblems.length > 0 ? (
        <p className="cn-banner cn-banner-error">
          {hostProblems.map((host) => `${host.host}: ${host.error}`).join(' · ')}
        </p>
      ) : null}
      {view === 'inbox' ? <ProjectRepoBanners repos={overview?.projectRepos} showWatch={mode === 'pr'} rpc={rpc} onChange={load} /> : null}

      {view === 'settings' ? (
        <div className="cn-settings">
          <SettingsView rpc={rpc} initialTab={settingsTab} initialModels={modelsLoaded ? models : undefined} />
        </div>
      ) : mode === 'local' ? (
        <LocalReviewsView
          rpc={rpc}
          defaultModels={models}
          hasModels={overview?.hasModels ?? models.length > 0}
          onOpenSettings={openModelsSettings}
          reloadToken={localReloadToken}
          projectId={projectId}
        />
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
            unwatchedText={projectId ? "Watch this project's repository to see its pull requests." : undefined}
          />
          {selectedId ? (
            <PrDetail
              rpc={rpc}
              pluginId={pluginId}
              prId={selectedId}
              defaultModels={models}
              hasModels={overview?.hasModels ?? models.length > 0}
              onOpenSettings={openModelsSettings}
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
