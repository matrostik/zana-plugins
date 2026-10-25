import type { CommandRunner } from './github/auth.ts';
import { repoFromRemoteUrl, repoId } from './github/refs.ts';
import type { RepoRef } from './types.ts';

export interface ZanaProject {
  id: string;
  name: string;
  path?: string;
}

const CACHE_TTL_MS = 5 * 60_000;

/** Maps Zana projects to the GitHub repositories their git remotes point at. */
export function createProjectMatcher(deps: {
  listProjects: () => Promise<ZanaProject[]>;
  run: CommandRunner;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  let cache: { at: number; byRepo: Map<string, ZanaProject>; projects: ZanaProject[] } | null = null;

  async function load() {
    if (cache && now() - cache.at < CACHE_TTL_MS) return cache;
    const projects = await deps.listProjects().catch(() => [] as ZanaProject[]);
    const byRepo = new Map<string, ZanaProject>();
    for (const project of projects) {
      if (!project.path) continue;
      const remotes = await deps.run('git', ['-C', project.path, 'remote', '-v']);
      if (!remotes) continue;
      for (const line of remotes.split('\n')) {
        const url = line.split(/\s+/)[1];
        const repo = url ? repoFromRemoteUrl(url) : null;
        if (repo && !byRepo.has(repoId(repo).toLowerCase())) byRepo.set(repoId(repo).toLowerCase(), project);
      }
    }
    cache = { at: now(), byRepo, projects };
    return cache;
  }

  return {
    async projectForRepo(repo: RepoRef): Promise<ZanaProject | null> {
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
