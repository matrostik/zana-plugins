import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRealtime, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import { errorText } from './format.ts';
import { ModelTab } from './ModelTab.tsx';
import { ProfileTab } from './ProfileTab.tsx';
import { ReposTab } from './ReposTab.tsx';
import type { ConfigSnapshot, Rpc } from './types.ts';

type SettingsTab = 'profile' | 'repos' | 'models';

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'repos', label: 'Organizations & Repos' },
  { id: 'models', label: 'AI Model' }
];

/** All panels stay mounted so unsaved edits survive switching tabs. */
const PANELS: Record<SettingsTab, typeof ProfileTab> = { profile: ProfileTab, repos: ReposTab, models: ModelTab };

const tabId = (tab: SettingsTab) => `cn-settings-tab-${tab}`;
const panelId = (tab: SettingsTab) => `cn-settings-panel-${tab}`;

export function SettingsView({ rpc }: { rpc: Rpc }) {
  const [config, setConfig] = useState<ConfigSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>('profile');
  const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());

  const load = useCallback(() => {
    rpc
      .call('config')
      .then((value) => {
        setConfig(value as ConfigSnapshot);
        setError(null);
      })
      .catch((cause) => setError(errorText(cause)));
  }, [rpc]);
  useEffect(load, [load]);
  useRealtime('codewink:changed', load);

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

  if (error && !config) return <p className="cn-banner cn-banner-error">{error}</p>;
  if (!config) return <p className="cn-muted">Loading settings…</p>;

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
      {TABS.map((item) => {
        const Panel = PANELS[item.id];
        return (
          <div key={item.id} role="tabpanel" id={panelId(item.id)} aria-labelledby={tabId(item.id)} className="cn-settings-panel" hidden={tab !== item.id}>
            <Panel rpc={rpc} config={config} onChanged={load} />
          </div>
        );
      })}
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
