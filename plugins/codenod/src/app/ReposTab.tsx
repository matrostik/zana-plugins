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
  const syncAction = useSettingsAction(onChanged);

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
        <li className="cn-inline">
          <span className="cn-mono">{DEFAULT_HOST}</span>
          <span className="cn-muted cn-small">always on</span>
        </li>
        {draft.map((host) => (
          <li key={host} className="cn-inline">
            <span className="cn-mono">{host}</span>
            <button type="button" className="cn-btn cn-btn-danger cn-small" aria-label={`Remove host ${host}`} onClick={() => setDraft(draft.filter((item) => item !== host))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="cn-inline"
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
        {hostsAction.saved ? <span className="cn-muted" role="status">Saved</span> : null}
      </form>
      {syncAction.error ? <p className="cn-banner cn-banner-error">{syncAction.error}</p> : null}
      <div className="cn-inline">
        <NumberSetting
          id="syncIntervalMinutes"
          label="Sync interval (minutes)"
          value={config.settings.syncIntervalMinutes}
          limits={config.limits.syncIntervalMinutes}
          onSave={(value) => void syncAction.run(() => rpc.call('setSettings', { syncIntervalMinutes: value }))}
        />
        {syncAction.saved ? <span className="cn-muted" role="status">Saved</span> : null}
      </div>
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
        className="cn-inline"
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
          placeholder="owner/repo or host/owner/repo"
          aria-label="Repository to watch"
          value={repoInput}
          onChange={(event) => setRepoInput(event.target.value)}
        />
        <button type="submit" className="cn-btn">
          Add
        </button>
        <button type="button" className="cn-btn" onClick={() => void run(async () => setSuggestions((await rpc.call('discoverRepos')) as Array<{ id: string; pullRequests: number }>))}>
          Suggest active repositories
        </button>
      </form>
      {suggestions ? (
        <div className="cn-banner">
          {suggestions.length === 0 ? (
            <span className="cn-muted">No other repositories with recent activity.</span>
          ) : (
            <div className="cn-inline">
              {suggestions.slice(0, MAX_SUGGESTIONS).map((suggestion) => (
                <button key={suggestion.id} type="button" className="cn-btn cn-small" onClick={() => void run(() => rpc.call('addRepo', { repo: suggestion.id }))}>
                  + {suggestion.id} ({suggestion.pullRequests})
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {config.repos.length === 0 ? (
        <p className="cn-muted">No watched repositories.</p>
      ) : (
        groupReposByOrganization(config.repos).map((group) => (
          <details key={group.key} className="cn-org" open>
            <summary>
              <span className="cn-mono">{group.key}</span> <span className="cn-count">{group.repos.length}</span>
            </summary>
            <table className="cn-table">
              <thead>
                <tr>
                  <th scope="col">Repository</th>
                  <th scope="col">Auto-review</th>
                  <th scope="col">Spec pattern</th>
                  <th scope="col">
                    <span className="cn-muted">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.repos.map((repo) => (
                  <tr key={repo.id}>
                    <td className="cn-mono">{repo.name}</td>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Auto-review ${repo.id}`}
                        checked={repo.autoReview}
                        onChange={(event) => void run(() => rpc.call('updateRepo', { id: repo.id, autoReview: event.target.checked }))}
                      />
                    </td>
                    <td>
                      <input
                        className="cn-input cn-small"
                        aria-label={`Spec pattern for ${repo.id}`}
                        defaultValue={repo.specGlob ?? ''}
                        placeholder="none"
                        onBlur={(event) => {
                          if ((repo.specGlob ?? '') !== event.target.value.trim()) void run(() => rpc.call('updateRepo', { id: repo.id, specGlob: event.target.value.trim() }));
                        }}
                      />
                    </td>
                    <td>
                      <button type="button" className="cn-btn cn-btn-danger cn-small" aria-label={`Remove ${repo.id}`} onClick={() => void run(() => rpc.call('removeRepo', { id: repo.id }))}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))
      )}
    </section>
  );
}

export function ReposTab({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  return (
    <>
      <HostsSection rpc={rpc} config={config} onChanged={onChanged} />
      <ReposSection rpc={rpc} config={config} onChanged={onChanged} />
    </>
  );
}
