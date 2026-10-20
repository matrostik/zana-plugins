import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { PluginSdkProject } from '@zana-ai/zcc-plugin-sdk/server';
import type { DiscoveredRepo } from './types.js';
import type { GitRunner } from './git-exec.js';

export interface ProjectFsDeps {
  exists(path: string): boolean;
  realpath(path: string): string;
  readdir(path: string): Array<{ name: string; isDirectory: boolean }>;
  isFile(path: string): boolean;
}

export function createNodeFsDeps(): ProjectFsDeps {
  return {
    exists: (p) => existsSync(p),
    realpath: (p) => realpathSync(p),
    readdir: (p) =>
      readdirSync(p, { withFileTypes: true }).map((ent) => ({
        name: ent.name,
        isDirectory: ent.isDirectory()
      })),
    isFile: (p) => {
      try {
        return statSync(p).isFile();
      } catch {
        return false;
      }
    }
  };
}

export class ProjectConfinementError extends Error {
  constructor(
    message: string,
    readonly code: 'project_not_found' | 'project_unavailable' | 'path_escape' | 'not_git_repo' = 'project_unavailable'
  ) {
    super(message);
  }
}

const IGNORED_SEARCH_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'out',
  'out-dev',
  'build',
  'target',
  'vendor',
  '.venv',
  'venv'
]);

function normalizeRelPath(relPath: string): string {
  return relPath.split(sep).join('/').replace(/^\/+|\/+$/g, '');
}

export function isPathConfinedToRoot(canonicalRoot: string, candidateCanonical: string): boolean {
  const rel = relative(canonicalRoot, candidateCanonical);
  if (rel === '') return true;
  return !rel.startsWith('..') && !isAbsolute(rel);
}

/**
 * Confines `projectId` against registered ZCC projects and optional `subRepoRelPath`
 * within that project's canonical root (Engineering Rules 1 & 2).
 */
export async function resolveConfinedRepoPath(args: {
  projectId: string;
  subRepoRelPath?: string;
  listProjects: () => Promise<PluginSdkProject[]>;
  fs?: ProjectFsDeps;
}): Promise<{
  project: PluginSdkProject;
  canonicalProjectRoot: string;
  canonicalRepoRoot: string;
  subRepoRelPath: string;
}> {
  const fs = args.fs ?? createNodeFsDeps();
  const projectId = (args.projectId ?? '').trim();
  if (!projectId) {
    throw new ProjectConfinementError('projectId is required.', 'project_not_found');
  }

  const projects = await args.listProjects();
  const project = projects.find((row) => row.id === projectId);
  if (!project) {
    throw new ProjectConfinementError('Project is not registered in Zana.', 'project_not_found');
  }
  if (!project.path || !project.path.trim()) {
    throw new ProjectConfinementError(
      'Git Tree requires a local project checkout path.',
      'project_unavailable'
    );
  }

  let canonicalProjectRoot: string;
  try {
    canonicalProjectRoot = fs.realpath(project.path);
  } catch {
    throw new ProjectConfinementError(
      'The project directory is unavailable on this machine.',
      'project_unavailable'
    );
  }

  const rawRel = normalizeRelPath(args.subRepoRelPath ?? '');
  if (rawRel.split('/').includes('..')) {
    throw new ProjectConfinementError('Repository relative path cannot traverse outside the project.', 'path_escape');
  }

  const candidatePath = rawRel ? resolve(canonicalProjectRoot, rawRel) : canonicalProjectRoot;
  let canonicalRepoRoot: string;
  try {
    canonicalRepoRoot = fs.realpath(candidatePath);
  } catch {
    throw new ProjectConfinementError('The requested sub-repository does not exist.', 'project_unavailable');
  }

  if (!isPathConfinedToRoot(canonicalProjectRoot, canonicalRepoRoot)) {
    throw new ProjectConfinementError('Repository path escaped the registered project root.', 'path_escape');
  }

  const normalizedRel = normalizeRelPath(relative(canonicalProjectRoot, canonicalRepoRoot));
  return {
    project,
    canonicalProjectRoot,
    canonicalRepoRoot,
    subRepoRelPath: normalizedRel
  };
}

/**
 * Confines a relative file path inside a repository root (rejects `..` or absolute paths).
 */
export function validateRepoRelativeFilePath(filePath: string): string {
  const trimmed = filePath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!trimmed) {
    throw new Error('File path is required.');
  }
  if (trimmed.startsWith('-') || /[\0\r\n]/.test(trimmed)) {
    throw new Error('Invalid file path.');
  }
  const segments = trimmed.split('/');
  if (segments.includes('..') || segments.includes('.')) {
    throw new Error('File path must be a normalized repository-relative path.');
  }
  return trimmed;
}

function hasGitMarker(dirPath: string, fs: ProjectFsDeps): { exists: boolean; isWorktree: boolean } {
  const dotGit = join(dirPath, '.git');
  if (!fs.exists(dotGit)) return { exists: false, isWorktree: false };
  return { exists: true, isWorktree: fs.isFile(dotGit) };
}

/**
 * Discovers the project root repository and any nested sub-repositories or worktrees
 * up to `maxDepth` (matching `git-graph.maxDepthOfRepoSearch`).
 */
export async function discoverProjectRepos(args: {
  canonicalProjectRoot: string;
  maxDepth: number;
  git: GitRunner;
  fs?: ProjectFsDeps;
}): Promise<DiscoveredRepo[]> {
  const fs = args.fs ?? createNodeFsDeps();
  const maxDepth = Math.max(0, Math.min(5, Math.floor(args.maxDepth)));
  const found: Array<{ absPath: string; relPath: string; isWorktree: boolean }> = [];

  function walk(currentDir: string, depth: number): void {
    let realCurrent: string;
    try {
      realCurrent = fs.realpath(currentDir);
    } catch {
      return;
    }
    if (!isPathConfinedToRoot(args.canonicalProjectRoot, realCurrent)) return;

    const marker = hasGitMarker(realCurrent, fs);
    if (marker.exists) {
      const rel = normalizeRelPath(relative(args.canonicalProjectRoot, realCurrent));
      found.push({ absPath: realCurrent, relPath: rel, isWorktree: marker.isWorktree });
    }

    if (depth >= maxDepth) return;

    let entries: Array<{ name: string; isDirectory: boolean }> = [];
    try {
      entries = fs.readdir(realCurrent);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory) continue;
      if (IGNORED_SEARCH_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.worktrees') continue;
      walk(join(realCurrent, entry.name), depth + 1);
    }
  }

  walk(args.canonicalProjectRoot, 0);

  // If project root itself wasn't a direct `.git` holder, check if it's inside a parent git worktree
  if (found.length === 0) {
    const probe = await args.git({
      cwd: args.canonicalProjectRoot,
      args: ['rev-parse', '--is-inside-work-tree'],
      timeoutMs: 5_000
    });
    if (probe.code === 0 && probe.stdout.trim() === 'true') {
      found.push({ absPath: args.canonicalProjectRoot, relPath: '', isWorktree: false });
    }
  }

  const repos: DiscoveredRepo[] = [];
  for (const item of found) {
    const headRes = await args.git({
      cwd: item.absPath,
      args: ['rev-parse', '--verify', 'HEAD'],
      timeoutMs: 5_000
    });
    const branchRes = await args.git({
      cwd: item.absPath,
      args: ['symbolic-ref', '--quiet', '--short', 'HEAD'],
      timeoutMs: 5_000
    });
    const headHash = headRes.code === 0 ? headRes.stdout.trim() || null : null;
    const currentBranch = branchRes.code === 0 ? branchRes.stdout.trim() || null : null;
    const rootName = basename(args.canonicalProjectRoot) || 'root';
    repos.push({
      relPath: item.relPath,
      label: item.relPath ? `${rootName} / ${item.relPath}` : rootName,
      currentBranch,
      headHash,
      isWorktree: item.isWorktree
    });
  }

  return repos;
}
