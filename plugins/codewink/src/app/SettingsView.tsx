import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRealtime, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import type { ModelChoice } from '../server/types.ts';
import { errorText } from './format.ts';
import { ModelTab } from './ModelTab.tsx';
import { ProfileTab } from './ProfileTab.tsx';
import { ReposTab } from './ReposTab.tsx';
import type { AvailableProvider, ConfigSnapshot, Rpc } from './types.ts';

export type SettingsTab = 'profile' | 'repos' | 'models';

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'repos', label: 'Organizations & Repos' },
  { id: 'models', label: 'AI Model' }
];

const tabId = (tab: SettingsTab) => `cn-settings-tab-${tab}`;
const panelId = (tab: SettingsTab) => `cn-settings-panel-${tab}`;

export function SettingsView({ rpc, initialTab = 'profile', initialModels }: { rpc: Rpc; initialTab?: SettingsTab; initialModels?: ModelChoice[] }) {
  const [config, setConfig] = useState<ConfigSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<AvailableProvider[] | null>(null);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [refreshingProviders, setRefreshingProviders] = useState(false);
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());
  const providersSeq = useRef(0);

  const loadConfig = useCallback(() => {
    rpc
      .call('config')
      .then((value) => {
        setConfig(value as ConfigSnapshot);
        setError(null);
      })
      .catch((cause) => setError(errorText(cause)));
  }, [rpc]);

  const loadProviders = useCallback((refresh = false) => {
    const seq = ++providersSeq.current;
    setRefreshingProviders(refresh);
    setProvidersError(null);
    (refresh ? rpc.call('availableModels', { refresh: true }) : rpc.call('availableModels'))
      .then((value) => {
        if (providersSeq.current !== seq) return;
        setProviders(value as AvailableProvider[]);
        setProvidersError(null);
      })
      .catch((cause) => {
        if (providersSeq.current !== seq) return;
        setProvidersError(errorText(cause));
      })
      .finally(() => {
        if (providersSeq.current === seq) setRefreshingProviders(false);
      });
  }, [rpc]);

  useEffect(loadConfig, [loadConfig]);
  useEffect(() => {
    loadProviders(false);
    return () => {
      providersSeq.current++;
    };
  }, [loadProviders]);
  useRealtime('codewink:changed', loadConfig);

  const focusTab = (next: SettingsTab) => {
    setTab(next);
    tabRefs.current.get(next)?.focus();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((item) => item.id === tab);
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    focusTab(TABS[(moves[event.key] + TABS.length) % TABS.length].id);
  };

  const canRenderModelsEarly = initialTab === 'models' && initialModels !== undefined;
  if (error && !config && !canRenderModelsEarly) return <p className="cn-banner cn-banner-error">{error}</p>;
  if (!config && !canRenderModelsEarly) return <p className="cn-muted">Loading settings…</p>;

  return (
    <div>
      <div className="cn-tabs cn-settings-tabs" role="tablist" aria-label="CodeWink settings">
        {TABS.map((item) => (
          <button
            key={item.id}
            ref={(element) => {
              if (element) tabRefs.current.set(item.id, element);
              else tabRefs.current.delete(item.id);
            }}
            type="button"
            role="tab"
            id={tabId(item.id)}
            className="cn-tab"
            aria-selected={tab === item.id}
            aria-controls={panelId(item.id)}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={onTabKeyDown}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error ? <p className="cn-banner cn-banner-error">{error}</p> : null}
      <div role="tabpanel" id={panelId('profile')} aria-labelledby={tabId('profile')} className="cn-settings-panel" hidden={tab !== 'profile'}>
        {config ? <ProfileTab rpc={rpc} config={config} onChanged={loadConfig} /> : <p className="cn-muted">Loading settings…</p>}
      </div>
      <div role="tabpanel" id={panelId('repos')} aria-labelledby={tabId('repos')} className="cn-settings-panel" hidden={tab !== 'repos'}>
        {config ? <ReposTab rpc={rpc} config={config} onChanged={loadConfig} /> : <p className="cn-muted">Loading settings…</p>}
      </div>
      <div role="tabpanel" id={panelId('models')} aria-labelledby={tabId('models')} className="cn-settings-panel" hidden={tab !== 'models'}>
        <ModelTab
          rpc={rpc}
          config={config}
          initialModels={initialModels}
          onChanged={loadConfig}
          providers={providers}
          providersError={providersError}
          refreshingProviders={refreshingProviders}
          onRefreshProviders={() => loadProviders(true)}
        />
      </div>
    </div>
  );
}

export function CodewinkSettingsSection() {
  const rpc = useRpc();
  return (
    <div className="cn-root">
      <div className="cn-settings">
        <SettingsView rpc={rpc} />
      </div>
    </div>
  );
}
