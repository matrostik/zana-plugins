import { useCallback, useEffect, useState } from 'react';
import { useRealtime, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import type { ModelChoice } from '../server/types.ts';
import { errorText, relativeTime } from './format.ts';
import type { AvailableProvider, ConfigSnapshot, Rpc } from './types.ts';

const AUTH_LABELS: Record<string, string> = { gh: 'gh CLI', 'git-credential': 'git credential helper', setting: 'pasted token' };

function ModelsSection({ rpc, models, onSaved }: { rpc: Rpc; models: ModelChoice[]; onSaved(): void }) {
  const [providers, setProviders] = useState<AvailableProvider[] | null>(null);
  const [draft, setDraft] = useState<ModelChoice[]>(models);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(models), [models]);
  useEffect(() => {
    rpc
      .call('availableModels')
      .then((value) => setProviders(value as AvailableProvider[]))
      .catch((cause) => setError(errorText(cause)));
  }, [rpc]);

  const index = (providerId: string, model: string) => draft.findIndex((item) => item.providerId === providerId && item.model === model);
  const toggle = (providerId: string, model: string) =>
    setDraft((current) => {
      const position = current.findIndex((item) => item.providerId === providerId && item.model === model);
      if (position !== -1) return current.filter((_, itemIndex) => itemIndex !== position);
      return [...current, { providerId, model }].slice(0, 5);
    });
  const setReasoning = (providerId: string, model: string, reasoningLevel: string) =>
    setDraft((current) => current.map((item) => (item.providerId === providerId && item.model === model ? { ...item, ...(reasoningLevel ? { reasoningLevel } : { reasoningLevel: undefined }) } : item)));

  const save = async () => {
    setError(null);
    try {
      await rpc.call('setModels', { models: draft });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (cause) {
      setError(errorText(cause));
    }
  };

  return (
    <section className="cn-section" aria-labelledby="cn-models-heading">
      <h3 id="cn-models-heading">Review models</h3>
      <p className="cn-muted cn-small">
        Each selected model reviews the pull request in its own hidden Zana thread. Pick two or more for multi-model consensus (up to 5).
      </p>
      {error ? <p className="cn-banner cn-banner-error">{error}</p> : null}
      {!providers ? (
        <p className="cn-muted">Loading providers…</p>
      ) : providers.length === 0 ? (
        <p className="cn-muted">No AI provider is available in Zana. Sign in to one under Settings → Providers.</p>
      ) : (
        providers.map((provider) => (
          <fieldset key={provider.providerId} className="cn-section">
            <legend>{provider.displayName}</legend>
            {provider.models.length === 0 ? <span className="cn-muted cn-small">{provider.error ?? 'No models reported'}</span> : null}
            {provider.models.map((model) => {
              const position = index(provider.providerId, model.id);
              return (
                <div key={model.id} className="cn-inline">
                  <label className="cn-check">
                    <input type="checkbox" checked={position !== -1} onChange={() => toggle(provider.providerId, model.id)} />
                    {model.label}
                  </label>
                  {position !== -1 && model.reasoningLevels.length > 0 ? (
                    <select
                      className="cn-select cn-small"
                      aria-label={`Reasoning level for ${model.label}`}
                      value={draft[position].reasoningLevel ?? ''}
                      onChange={(event) => setReasoning(provider.providerId, model.id, event.target.value)}
                    >
                      <option value="">Default reasoning</option>
                      {model.reasoningLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              );
            })}
          </fieldset>
        ))
      )}
      <div className="cn-inline">
        <button type="button" className="cn-btn cn-btn-primary" onClick={() => void save()}>
          Save models ({draft.length})
        </button>
        {saved ? <span className="cn-muted" role="status">Saved</span> : null}
      </div>
    </section>
  );
}

function ReposSection({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  const [repoInput, setRepoInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; pullRequests: number }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (cause) {
      setError(errorText(cause));
    }
  };

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
              {suggestions.slice(0, 12).map((suggestion) => (
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
            {config.repos.map((repo) => (
              <tr key={repo.id}>
                <td className="cn-mono">{repo.id}</td>
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
                  <button type="button" className="cn-btn cn-btn-danger cn-small" onClick={() => void run(() => rpc.call('removeRepo', { id: repo.id }))}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function SettingsView({ rpc }: { rpc: Rpc }) {
  const [config, setConfig] = useState<ConfigSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    rpc
      .call('config')
      .then((value) => setConfig(value as ConfigSnapshot))
      .catch((cause) => setError(errorText(cause)));
  }, [rpc]);
  useEffect(load, [load]);
  useRealtime('codenod:changed', load);

  if (error) return <p className="cn-banner cn-banner-error">{error}</p>;
  if (!config) return <p className="cn-muted">Loading settings…</p>;

  return (
    <div>
      <ModelsSection rpc={rpc} models={config.models} onSaved={load} />
      <section className="cn-section" aria-labelledby="cn-hosts-heading">
        <h3 id="cn-hosts-heading">GitHub sign-in</h3>
        <p className="cn-muted cn-small">
          CodeNod uses <span className="cn-mono">gh auth token</span>, then <span className="cn-mono">git credential fill</span>, then a pasted token from the plugin settings.
          Add GitHub Enterprise hosts in the plugin settings.
        </p>
        <table className="cn-table">
          <thead>
            <tr>
              <th scope="col">Host</th>
              <th scope="col">Signed in</th>
              <th scope="col">Last sync</th>
            </tr>
          </thead>
          <tbody>
            {config.hosts.map((host) => (
              <tr key={host.host}>
                <td className="cn-mono">{host.host}</td>
                <td>
                  {host.authSource ? `${AUTH_LABELS[host.authSource] ?? host.authSource}${host.login ? ` as @${host.login}` : ''}` : 'Not signed in'}
                  {host.error ? <div className="cn-small cn-badge-danger">{host.error}</div> : null}
                </td>
                <td>{host.syncedAt ? relativeTime(host.syncedAt) : 'never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <ReposSection rpc={rpc} config={config} onChanged={load} />
    </div>
  );
}

export function CodenodSettingsSection() {
  const rpc = useRpc();
  return (
    <div className="cn-root">
      <div className="cn-settings">
        <SettingsView rpc={rpc} />
      </div>
    </div>
  );
}
