import type { Store } from './db.ts';
import type { GhPull, GhSearchItem, GitHubClient } from './github/client.ts';
import { repoFromRepositoryUrl } from './github/client.ts';
import { prId, repoId } from './github/refs.ts';
import type { TokenResolver, TokenSource } from './github/auth.ts';
import type { CiState, PrBucket, PrRef, PullRequestRow } from './types.ts';
import { errorMessage, mapWithConcurrency } from './util.ts';

export interface HostStatus {
  host: string;
  authSource: TokenSource | null;
  login: string | null;
  error: string | null;
  pullRequestCount: number;
  syncedAt: number | null;
}

export interface SyncResult {
  hosts: HostStatus[];
  changed: PullRequestRow[];
}

const OPEN_PR_QUERY = 'is:pr is:open archived:false';
const REPOS_PER_QUERY = 5;
const DETAIL_CONCURRENCY = 4;
const DISCOVERY_DAYS = 30;

export function createSyncService(deps: {
  store: Store;
  github: GitHubClient;
  tokens: TokenResolver;
  hosts: () => Promise<string[]>;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  const statuses = new Map<string, HostStatus>();
  const logins = new Map<string, string>();
  let running: Promise<SyncResult> | null = null;

  async function viewerLogin(host: string): Promise<string> {
    const cached = logins.get(host);
    if (cached) return cached;
    const viewer = await deps.github.viewer(host);
    logins.set(host, viewer.login);
    return viewer.login;
  }

  function toRow(host: string, pull: GhPull, ciState: CiState, buckets: PrBucket[]): Omit<PullRequestRow, 'syncedAt'> {
    const [owner, repo] = pull.base.repo.full_name.split('/');
    return {
      id: prId({ host, owner, name: repo, number: pull.number }),
      host,
      owner,
      repo,
      number: pull.number,
      title: pull.title,
      author: pull.user?.login ?? 'unknown',
      url: pull.html_url,
      state: pull.state === 'open' ? 'open' : pull.merged ? 'merged' : 'closed',
      isDraft: Boolean(pull.draft),
      headSha: pull.head.sha,
      headRef: pull.head.ref,
      baseRef: pull.base.ref,
      ciState,
      buckets,
      updatedAt: pull.updated_at
    };
  }

  async function fetchRow(ref: PrRef, buckets: PrBucket[]): Promise<Omit<PullRequestRow, 'syncedAt'>> {
    const pull = await deps.github.getPull(ref);
    const ciState = await deps.github.ciState(ref, pull.head.sha).catch(() => 'none' as CiState);
    return toRow(ref.host, pull, ciState, buckets);
  }

  async function syncHost(host: string): Promise<{ status: HostStatus; changed: PullRequestRow[] }> {
    const token = await deps.tokens.resolve(host);
    const status: HostStatus = {
      host,
      authSource: token?.source ?? null,
      login: null,
      error: null,
      pullRequestCount: 0,
      syncedAt: statuses.get(host)?.syncedAt ?? null
    };
    if (!token) {
      status.error = `Not signed in. Run "gh auth login --hostname ${host}" or paste a token in settings.`;
      return { status, changed: [] };
    }
    try {
      status.login = await viewerLogin(host);
      const found = new Map<string, { item: GhSearchItem; ref: PrRef; buckets: Set<PrBucket> }>();
      const watched = deps.store.listRepos().filter((repo) => repo.host === host);
      const watchedKeys = new Set(watched.map((repo) => `${repo.owner}/${repo.name}`.toLowerCase()));
      const collect = (items: GhSearchItem[], bucket: PrBucket) => {
        for (const item of items) {
          const repo = repoFromRepositoryUrl(item.repository_url);
          if (!repo || !watchedKeys.has(`${repo.owner}/${repo.name}`.toLowerCase())) continue;
          const ref: PrRef = { host, owner: repo.owner, name: repo.name, number: item.number };
          const id = prId(ref);
          const entry = found.get(id) ?? { item, ref, buckets: new Set<PrBucket>() };
          entry.buckets.add(bucket);
          found.set(id, entry);
        }
      };

      const searchWatched = async (extra: string, bucket: PrBucket) => {
        for (let index = 0; index < watched.length; index += REPOS_PER_QUERY) {
          const qualifiers = watched
            .slice(index, index + REPOS_PER_QUERY)
            .map((repo) => `repo:${repo.owner}/${repo.name}`)
            .join(' ');
          const query = extra ? `${OPEN_PR_QUERY} ${extra} ${qualifiers}` : `${OPEN_PR_QUERY} ${qualifiers}`;
          collect(await deps.github.searchPullRequests(host, query), bucket);
        }
      };

      if (watched.length > 0) {
        await searchWatched('review-requested:@me', 'needs-review');
        await searchWatched('author:@me', 'mine');
        await searchWatched('', 'watched');
      }

      const changed: PullRequestRow[] = [];
      await mapWithConcurrency([...found.entries()], DETAIL_CONCURRENCY, async ([id, entry]) => {
        const buckets = [...entry.buckets];
        const existing = deps.store.getPullRequest(id);
        try {
          if (existing && existing.state === 'open' && existing.headSha && existing.updatedAt === entry.item.updated_at) {
            const ciState = await deps.github.ciState(entry.ref, existing.headSha).catch(() => existing.ciState);
            deps.store.upsertPullRequest({ ...existing, buckets, ciState });
            return;
          }
          deps.store.upsertPullRequest(await fetchRow(entry.ref, buckets));
          const updated = deps.store.getPullRequest(id);
          if (updated && (!existing || existing.headSha !== updated.headSha)) changed.push(updated);
        } catch (error) {
          if (!existing) throw error;
          deps.store.upsertPullRequest({ ...existing, buckets });
        }
      });

      deps.store.closeMissingPullRequests(host, new Set(found.keys()));
      status.pullRequestCount = found.size;
      status.syncedAt = now();
      return { status, changed };
    } catch (error) {
      status.error = errorMessage(error);
      return { status, changed: [] };
    }
  }

  async function syncAll(): Promise<SyncResult> {
    if (running) return running;
    running = (async () => {
      const hosts = await deps.hosts();
      const results = await Promise.all(hosts.map((host) => syncHost(host)));
      for (const result of results) statuses.set(result.status.host, result.status);
      return { hosts: results.map((result) => result.status), changed: results.flatMap((result) => result.changed) };
    })();
    try {
      return await running;
    } finally {
      running = null;
    }
  }

  return {
    syncAll,

    isSyncing: () => running !== null,

    async hostStatuses(): Promise<HostStatus[]> {
      const hosts = await deps.hosts();
      return Promise.all(
        hosts.map(async (host) => {
          const known = statuses.get(host);
          if (known) return known;
          const token = await deps.tokens.resolve(host);
          return { host, authSource: token?.source ?? null, login: logins.get(host) ?? null, error: null, pullRequestCount: 0, syncedAt: null };
        })
      );
    },

    /** Fetches one PR from GitHub and stores it, keeping any inbox buckets it already had. */
    async syncPullRequest(ref: PrRef): Promise<PullRequestRow> {
      const id = prId(ref);
      const buckets = deps.store.getPullRequest(id)?.buckets ?? [];
      deps.store.upsertPullRequest(await fetchRow(ref, buckets));
      return deps.store.getPullRequest(id)!;
    },

    viewerLogin,

    /** Repositories with recent PR activity involving the viewer that are not watched yet. */
    async discoverActiveRepos(): Promise<Array<{ id: string; host: string; owner: string; name: string; pullRequests: number }>> {
      const since = new Date(now() - DISCOVERY_DAYS * 86_400_000).toISOString().slice(0, 10);
      const watched = new Set(deps.store.listRepos().map((repo) => repo.id.toLowerCase()));
      const counts = new Map<string, { id: string; host: string; owner: string; name: string; pullRequests: number }>();
      for (const host of await deps.hosts()) {
        if (!(await deps.tokens.resolve(host))) continue;
        const items = await deps.github.searchPullRequests(host, `is:pr involves:@me updated:>=${since}`).catch(() => []);
        for (const item of items) {
          const repo = repoFromRepositoryUrl(item.repository_url);
          if (!repo) continue;
          const id = repoId({ host, ...repo });
          if (watched.has(id.toLowerCase())) continue;
          const entry = counts.get(id) ?? { id, host, owner: repo.owner, name: repo.name, pullRequests: 0 };
          entry.pullRequests++;
          counts.set(id, entry);
        }
      }
      return [...counts.values()].sort((a, b) => b.pullRequests - a.pullRequests);
    }
  };
}

export type SyncService = ReturnType<typeof createSyncService>;
