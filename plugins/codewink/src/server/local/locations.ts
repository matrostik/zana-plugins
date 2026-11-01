import { realpath } from 'node:fs/promises';
import type { Store } from '../db.ts';
import type { ZanaProject } from '../projects.ts';
import type { LocalScope, LocalTargetRow, ReviewRow } from '../types.ts';
import { mapWithConcurrency } from '../util.ts';
import { changedPathCount, listWorktrees, repoTopLevel, type GitRunner, type WorktreeInfo } from './git.ts';
import { localTargetId } from './target.ts';

const STATUS_CONCURRENCY = 4;
/** Worktrees CodeWink creates for its own reviewer and Deep Review threads. */
const CODEWINK_BRANCH_PATTERN = /^zcc\/codewink-/;

export interface LocalLocation {
  target: LocalTargetRow;
  project: ZanaProject & { path: string };
  worktree: WorktreeInfo;
}

export interface LocalLocationSummary {
  targetId: string;
  projectId: string;
  projectName: string;
  worktreePath: string;
  branch: string | null;
  isMain: boolean;
  changedFiles: number | null;
  lastScope: LocalScope | null;
  latest: Pick<ReviewRow, 'id' | 'status' | 'riskScore' | 'createdAt'> | null;
}

export interface LocationResolverDeps {
  store: Store;
  git: GitRunner;
  listProjects: () => Promise<ZanaProject[]>;
}

async function canonicalPath(path: string): Promise<string> {
  return realpath(path).catch(() => path);
}

/** Location discovery and validation: maps projects and their worktrees to reviewable local targets. */
export function createLocationResolver(deps: LocationResolverDeps) {
  async function projectsWithPath(): Promise<Array<ZanaProject & { path: string }>> {
    return (await deps.listProjects()).filter((project): project is ZanaProject & { path: string } => Boolean(project.path));
  }

  /** Checked-out locations per project; a project whose git listing fails maps to null. */
  async function worktreesByProject(projects: Array<ZanaProject & { path: string }>): Promise<Map<string, WorktreeInfo[] | null>> {
    const result = new Map<string, WorktreeInfo[] | null>();
    for (const project of projects) {
      result.set(project.id, await listWorktrees(deps.git, project.path).catch(() => null));
    }
    return result;
  }

  function toLocation(project: ZanaProject & { path: string }, worktree: WorktreeInfo): LocalLocation {
    const target = deps.store.upsertLocalTarget({
      id: localTargetId(project.id, worktree.path),
      projectId: project.id,
      worktreePath: worktree.path,
      branch: worktree.branch
    });
    return { target, project, worktree };
  }

  async function listLocations(projectId?: string): Promise<LocalLocationSummary[]> {
    const projects = (await projectsWithPath()).filter((project) => !projectId || project.id === projectId);
    const byProject = await worktreesByProject(projects);
    const seen = new Set<string>();
    const locations: LocalLocation[] = [];
    for (const project of projects) {
      for (const worktree of byProject.get(project.id) ?? []) {
        if (seen.has(worktree.path) || (worktree.branch && CODEWINK_BRANCH_PATTERN.test(worktree.branch))) continue;
        seen.add(worktree.path);
        locations.push(toLocation(project, worktree));
      }
    }
    const counts = await mapWithConcurrency(locations, STATUS_CONCURRENCY, (location) => changedPathCount(deps.git, location.worktree.path));
    return locations.map((location, index) => {
      const latest = deps.store.listLocalReviews(location.target.id)[0]?.review ?? null;
      return {
        targetId: location.target.id,
        projectId: location.project.id,
        projectName: location.project.name,
        worktreePath: location.worktree.path,
        branch: location.worktree.branch,
        isMain: location.worktree.isMain,
        changedFiles: counts[index],
        lastScope: location.target.lastScope,
        latest: latest ? { id: latest.id, status: latest.status, riskScore: latest.riskScore, createdAt: latest.createdAt } : null
      };
    });
  }

  /** Validates that `worktreePath` is a checked-out location of the project; arbitrary paths are refused. */
  async function resolveLocation(projectId: string, worktreePath: string): Promise<LocalLocation> {
    const project = (await projectsWithPath()).find((candidate) => candidate.id === projectId);
    if (!project) throw new Error(`Project ${projectId} has no local checkout`);
    const wanted = await canonicalPath(worktreePath);
    const worktrees = await listWorktrees(deps.git, project.path);
    for (const worktree of worktrees) {
      if ((await canonicalPath(worktree.path)) === wanted) return toLocation(project, worktree);
    }
    throw new Error(`${worktreePath} is not a checked-out location of project ${project.name}`);
  }

  /** Finds the project location that contains `path`, for example a terminal's working directory. */
  async function locationForPath(path: string, projectId?: string): Promise<LocalLocation> {
    const top = await repoTopLevel(deps.git, path);
    if (!top) throw new Error(`${path} is not inside a git checkout`);
    const wanted = await canonicalPath(top);
    const projects = (await projectsWithPath()).filter((project) => !projectId || project.id === projectId);
    for (const project of projects) {
      const worktrees = await listWorktrees(deps.git, project.path).catch(() => [] as WorktreeInfo[]);
      for (const worktree of worktrees) {
        if ((await canonicalPath(worktree.path)) === wanted) return toLocation(project, worktree);
      }
    }
    throw new Error(`${top} does not belong to a Zana project${projectId ? ` (${projectId})` : ''}. Register it as a project first.`);
  }

  async function projectFor(target: Pick<LocalTargetRow, 'projectId'>): Promise<ZanaProject & { path: string }> {
    const project = (await projectsWithPath()).find((candidate) => candidate.id === target.projectId);
    if (!project) throw new Error(`Project ${target.projectId} is no longer available`);
    return project;
  }

  return { canonicalPath, projectsWithPath, worktreesByProject, listLocations, resolveLocation, locationForPath, projectFor };
}

export type LocationResolver = ReturnType<typeof createLocationResolver>;
