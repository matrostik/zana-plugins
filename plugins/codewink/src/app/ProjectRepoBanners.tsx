import { useState } from 'react';
import { errorText } from './format.ts';
import type { ProjectRepoStatus, Rpc } from './types.ts';

/** Repository availability and watching belong to the current project panel. */
export function ProjectRepoBanners({ repos, showWatch, rpc, onChange }: {
  repos?: ProjectRepoStatus[];
  showWatch: boolean;
  rpc: Rpc;
  onChange(): void;
}) {
  const [watching, setWatching] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const watch = async (repo: ProjectRepoStatus) => {
    setWatching((current) => new Set(current).add(repo.id));
    setError(null);
    try {
      await rpc.call('addRepo', { repo: repo.id });
      await rpc.call('refresh');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      onChange();
      setWatching((current) => { const next = new Set(current); next.delete(repo.id); return next; });
    }
  };
  return <>
    {error ? <p className="cn-banner cn-banner-error">{error}</p> : null}
    {repos?.length === 0 ? (
      <p className="cn-banner">This project has no configured GitHub remote, so there are no pull requests to show. Local changes can still be reviewed.</p>
    ) : null}
    {showWatch ? repos?.filter((repo) => !repo.watched).map((repo) => (
      <div key={repo.id} className="cn-banner cn-banner-watch">
        <span><code>{repo.owner}/{repo.name}</code> isn't watched, so its pull requests aren't synced.</span>
        <button type="button" className="cn-btn cn-btn-primary" disabled={watching.has(repo.id)} onClick={() => void watch(repo)}>
          {watching.has(repo.id) ? 'Watching…' : 'Watch repository'}
        </button>
      </div>
    )) : null}
  </>;
}
