import type { CommandRunner } from './github/auth.ts';
import { isGitRemoteName, repoFromRemoteUrl, repoId } from './github/refs.ts';
import type { RepoRef } from './types.ts';

export interface ZanaProject {
  id: string;
  name: string;
  path?: string;
}

export interface MatchedProject extends ZanaProject {
  /** Remote whose URL matched the repository, used to fetch that repo's pull requests. */
  remote: string;
}

const CACHE_TTL_MS = 5 * 60_000;

/** Maps Zana projects to the GitHub repositories their git remotes point at. */
export function createProjectMatcher(deps: {
  listProjects: () => Promise<ZanaProject[]>;
  run: CommandRunner;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  let cache: { at: number; byRepo: Map<string, MatchedProject>; projects: ZanaProject[] } | null = null;

  async function load() {
    if (cache && now() - cache.at < CACHE_TTL_MS) return cache;
    const projects = await deps.listProjects().catch(() => [] as ZanaProject[]);
    const byRepo = new Map<string, MatchedProject>();
    for (const project of projects) {
      if (!project.path) continue;
      const remotes = await deps.run('git', ['-C', project.path, 'remote', '-v']);
      if (!remotes) continue;
      for (const line of remotes.split('\n')) {
        const [name, url, direction] = line.trim().split(/\s+/);
        if (!name || !url || direction === '(push)' || !isGitRemoteName(name)) continue;
        const repo = repoFromRemoteUrl(url);
        const key = repo ? repoId(repo).toLowerCase() : '';
        if (repo && !byRepo.has(key)) byRepo.set(key, { ...project, remote: name });
      }
    }
    cache = { at: now(), byRepo, projects };
    return cache;
  }

  return {
    async projectForRepo(repo: RepoRef): Promise<MatchedProject | null> {
      return (await load()).byRepo.get(repoId(repo).toLowerCase()) ?? null;
    },
    async projects(): Promise<ZanaProject[]> {
      return (await load()).projects;
    },
    invalidate() {
      cache = null;
    }
  };
}

export type ProjectMatcher = ReturnType<typeof createProjectMatcher>;
