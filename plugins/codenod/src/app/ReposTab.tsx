import { useEffect, useState } from 'react';
import type { RepoRow } from '../server/types.ts';
import { NumberSetting } from './SettingFields.tsx';
import { useSettingsAction } from './settings-action.ts';
import type { ConfigSnapshot, Rpc } from './types.ts';

const DEFAULT_HOST = 'github.com';
const MAX_SUGGESTIONS = 12;

function sameHosts(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((host, index) => host === right[index]);
}

function HostsSection({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  const saved = config.settings.githubHosts;
  const [draft, setDraft] = useState<string[]>(saved);
  const [hostInput, setHostInput] = useState('');
  const hostsAction = useSettingsAction(onChanged);

  const savedKey = saved.join(',');
  // Keyed on the joined list so unrelated refreshes don't discard unsaved edits.
  useEffect(() => setDraft(saved), [savedKey]);

  const addHost = () => {
    const host = hostInput.trim().toLowerCase();
    if (!host) return;
    if (host !== DEFAULT_HOST && !draft.includes(host)) setDraft([...draft, host]);
    setHostInput('');
  };

  return (
    <section className="cn-section" aria-labelledby="cn-hosts-heading">
      <h3 id="cn-hosts-heading">GitHub hosts</h3>
      <p className="cn-muted cn-small">
        github.com is always included. The first GitHub Enterprise host is used for the <span className="cn-mono">owner/repo#123</span> shorthand.
      </p>
      {hostsAction.error ? <p className="cn-banner cn-banner-error">{hostsAction.error}</p> : null}
      <ul className="cn-host-list">
        <li className="cn-host-item">
          <span className="cn-mono">{DEFAULT_HOST}</span>
          <span className="cn-badge cn-badge-ok">always on</span>
        </li>
        {draft.map((host) => (
          <li key={host} className="cn-host-item">
            <span className="cn-mono" style={{ flex: 1 }}>{host}</span>
            <button type="button" className="cn-btn cn-btn-danger cn-small" aria-label={`Remove host ${host}`} onClick={() => setDraft(draft.filter((item) => item !== host))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="cn-inline cn-host-form"
        onSubmit={(event) => {
          event.preventDefault();
          addHost();
        }}
      >
        <input className="cn-input" placeholder="git.example.com" aria-label="GitHub Enterprise host" value={hostInput} onChange={(event) => setHostInput(event.target.value)} />
        <button type="submit" className="cn-btn">
          Add host
        </button>
        <button
          type="button"
          className="cn-btn cn-btn-primary"
          disabled={sameHosts(draft, saved)}
          onClick={() => void hostsAction.run(() => rpc.call('setSettings', { githubHosts: draft }))}
        >
          Save hosts
        </button>
        {hostsAction.saved ? (
          <span className="cn-status-saved" role="status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved
          </span>
        ) : null}
      </form>
    </section>
  );
}

/** Groups repositories by `host/owner`, keeping groups and repos in alphabetical order. */
export function groupReposByOrganization(repos: RepoRow[]): Array<{ key: string; repos: RepoRow[] }> {
  const groups = new Map<string, RepoRow[]>();
  for (const repo of repos) {
    const key = `${repo.host}/${repo.owner}`;
    groups.set(key, [...(groups.get(key) ?? []), repo]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, items]) => ({ key, repos: [...items].sort((left, right) => left.name.localeCompare(right.name)) }));
}

function ReposSection({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  const [repoInput, setRepoInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; pullRequests: number }> | null>(null);
  const { error, run } = useSettingsAction(onChanged);

  return (
    <section className="cn-section" aria-labelledby="cn-repos-heading">
      <h3 id="cn-repos-heading">Watched repositories</h3>
      <p className="cn-muted cn-small">
        Needs my review, Mine, and Watched only include pull requests from repositories you add here. Auto-review runs once per new commit when your review is requested, skipping drafts and your own pull requests.
        The spec pattern (for example <span className="cn-mono">docs/specs/**/*.md</span>) adds matching changed or referenced files as requirements.
      </p>
      {error ? <p className="cn-banner cn-banner-error">{error}</p> : null}
      <form
        className="cn-inline cn-repo-form"
        onSubmit={(event) => {
          event.preventDefault();
          const repo = repoInput.trim();
          if (!repo) return;
          void run(async () => {
            await rpc.call('addRepo', { repo });
            setRepoInput('');
          });
        }}
      >
        <input
          className="cn-input"
          style={{ minWidth: 260 }}
          placeholder="owner/repo or host/owner/repo"
          aria-label="Repository to watch"
          value={repoInput}
          onChange={(event) => setRepoInput(event.target.value)}
        />
        <button type="submit" className="cn-btn cn-btn-primary">
          Add
        </button>
        <button type="button" className="cn-btn" onClick={() => void run(async () => setSuggestions((await rpc.call('discoverRepos')) as Array<{ id: string; pullRequests: number }>))}>
          Suggest active repositories
        </button>
      </form>
      {suggestions ? (
        <div className="cn-banner cn-suggestions-banner">
          {suggestions.length === 0 ? (
            <span className="cn-muted">No other repositories with recent activity.</span>
          ) : (
            <div className="cn-inline">
              <span className="cn-muted cn-small" style={{ fontWeight: 600 }}>Suggestions:</span>
              {suggestions.slice(0, MAX_SUGGESTIONS).map((suggestion) => (
                <button key={suggestion.id} type="button" className="cn-btn cn-small cn-suggestion-chip" onClick={() => void run(() => rpc.call('addRepo', { repo: suggestion.id }))}>
                  + {suggestion.id} ({suggestion.pullRequests})
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {config.repos.length === 0 ? (
        <p className="cn-muted" style={{ marginTop: 12 }}>No watched repositories.</p>
      ) : (
        <div className="cn-org-list">
          {groupReposByOrganization(config.repos).map((group) => (
            <details key={group.key} className="cn-org" open>
              <summary>
                <span className="cn-mono">{group.key}</span> <span className="cn-count">{group.repos.length}</span>
              </summary>
              <div className="cn-table-wrap">
                <table className="cn-table">
                  <thead>
                    <tr>
                      <th scope="col">Repository</th>
                      <th scope="col" style={{ width: 110, textAlign: 'center' }}>Auto-review</th>
                      <th scope="col">Spec pattern</th>
                      <th scope="col" style={{ width: 90, textAlign: 'right' }}>
                        <span className="cn-muted">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.repos.map((repo) => (
                      <tr key={repo.id}>
                        <td className="cn-mono" style={{ fontWeight: 500 }}>{repo.name}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            style={{ width: 16, height: 16, accentColor: 'var(--cn-accent)', cursor: 'pointer' }}
                            aria-label={`Auto-review ${repo.id}`}
                            checked={repo.autoReview}
                            onChange={(event) => void run(() => rpc.call('updateRepo', { id: repo.id, autoReview: event.target.checked }))}
                          />
                        </td>
                        <td>
                          <input
                            className="cn-input cn-small"
                            style={{ width: '100%', maxWidth: 280 }}
                            aria-label={`Spec pattern for ${repo.id}`}
                            defaultValue={repo.specGlob ?? ''}
                            placeholder="none"
                            onBlur={(event) => {
                              if ((repo.specGlob ?? '') !== event.target.value.trim()) void run(() => rpc.call('updateRepo', { id: repo.id, specGlob: event.target.value.trim() }));
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="cn-btn cn-btn-danger cn-small" aria-label={`Remove ${repo.id}`} onClick={() => void run(() => rpc.call('removeRepo', { id: repo.id }))}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function SyncSection({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  const toggleAction = useSettingsAction(onChanged);
  const intervalAction = useSettingsAction(onChanged);
  const autoSyncEnabled = config.settings.autoSyncEnabled !== false;

  return (
    <section className="cn-section" aria-labelledby="cn-sync-heading">
      <h3 id="cn-sync-heading">Repository synchronization</h3>
      <p className="cn-muted cn-small">
        Polls GitHub periodically for pull requests and review triggers across watched repositories.
      </p>
      {toggleAction.error ? <p className="cn-banner cn-banner-error">{toggleAction.error}</p> : null}
      {intervalAction.error ? <p className="cn-banner cn-banner-error">{intervalAction.error}</p> : null}
      <div className="cn-fields">
        <div className="cn-inline">
          <label className="cn-check">
            <input
              type="checkbox"
              aria-label="Enable automatic repository sync"
              checked={autoSyncEnabled}
              onChange={(event) => void toggleAction.run(() => rpc.call('setSettings', { autoSyncEnabled: event.target.checked }))}
            />
            <span>Enable automatic sync</span>
          </label>
          {toggleAction.saved ? (
            <span className="cn-status-saved" role="status">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved
            </span>
          ) : null}
        </div>
        <div className="cn-inline">
          <NumberSetting
            id="syncIntervalMinutes"
            label="Sync interval (minutes)"
            value={config.settings.syncIntervalMinutes}
            limits={config.limits.syncIntervalMinutes}
            disabled={!autoSyncEnabled}
            onSave={(value) => void intervalAction.run(() => rpc.call('setSettings', { syncIntervalMinutes: value }))}
          />
          {intervalAction.saved ? (
            <span className="cn-status-saved" role="status">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved
            </span>
          ) : null}
        </div>
        {!autoSyncEnabled ? (
          <p className="cn-muted cn-small" style={{ marginTop: 4 }}>
            Automatic sync is paused. Repositories will only update when you manually click Refresh.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function ReposTab({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  return (
    <>
      <HostsSection rpc={rpc} config={config} onChanged={onChanged} />
      <SyncSection rpc={rpc} config={config} onChanged={onChanged} />
      <ReposSection rpc={rpc} config={config} onChanged={onChanged} />
    </>
  );
}
