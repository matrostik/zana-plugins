import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { GitRunner } from './git-exec.js';
import { compareCommits, loadCommitDetails, loadFileDiff } from './git-details-diff.js';
import { loadRepositoryGraph, parseGitRemotesOutput } from './git-log-parser.js';
import { discoverProjectRepos, isPathConfinedToRoot, resolveConfinedRepoPath, type ProjectFsDeps } from './project-repos.js';
import type { GitGraphStorage } from './storage.js';
import type { GitGraphGlobalSettings } from './types.js';

function readFlag(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

export function registerGitTreeCliAndTools(args: {
  zcc: ZccPluginApi;
  git: GitRunner;
  fs: ProjectFsDeps;
  storage: GitGraphStorage;
  readGlobalSettings: () => Promise<GitGraphGlobalSettings>;
}): void {
  const { zcc, git, fs, storage, readGlobalSettings } = args;

  zcc.cli.register({
    name: 'git-tree',
    summary: 'Inspect project Git Tree commits, branches, comparisons, diffs, and remotes',
    commands: [
      {
        name: 'repos',
        summary: 'List discovered Git repositories in a project',
        usage: 'zcc git-tree repos [--project <id>]'
      },
      {
        name: 'log',
        summary: 'Show commit graph log',
        usage: 'zcc git-tree log [--project <id>] [--max-count 30] [--branches a,b]'
      },
      {
        name: 'details',
        summary: 'Show commit details and changed files',
        usage: 'zcc git-tree details [--project <id>] --commit <sha>'
      },
      {
        name: 'compare',
        summary: 'Compare two commits',
        usage: 'zcc git-tree compare [--project <id>] --from <sha> --to <sha>'
      },
      {
        name: 'diff',
        summary: 'Show file diff',
        usage: 'zcc git-tree diff [--project <id>] --commit <sha> --file <path>'
      },
      {
        name: 'remotes',
        summary: 'List repository remotes',
        usage: 'zcc git-tree remotes [--project <id>]'
      }
    ],
    async run(argv, ctx) {
      const sub = argv[0] ?? 'log';
      if (sub === '--help' || sub === '-h' || sub === 'help') {
        return {
          exitCode: 0,
          stdout:
            'Usage: zcc git-tree <repos|log|details|compare|diff|remotes> [--project <id>]\n'
        };
      }
      let projectId = readFlag(argv, '--project') ?? ctx.projectId ?? '';
      const subRepoRelPath = readFlag(argv, '--repo') ?? '';

      if (!projectId && ctx.cwd) {
        try {
          const allProjects = await zcc.sdk.projects.list();
          const canonicalCwd = fs.realpath(ctx.cwd);
          const matched = allProjects.find((p) => {
            try {
              if (!p.path) return false;
              const canonicalProj = fs.realpath(p.path);
              return isPathConfinedToRoot(canonicalProj, canonicalCwd);
            } catch {
              return false;
            }
          });
          if (matched) {
            projectId = matched.id;
          }
        } catch {
          // Ignore and fall through to missing projectId check
        }
      }

      if (!projectId) {
        return {
          exitCode: 1,
          stderr: 'Missing --project <projectId>. Pass --project <id> or run inside a project directory.\n'
        };
      }

      try {
        const globalSettings = await readGlobalSettings();
        const confined = await resolveConfinedRepoPath({
          projectId,
          subRepoRelPath,
          listProjects: () => zcc.sdk.projects.list(),
          fs
        });

        if (sub === 'repos') {
          const repos = await discoverProjectRepos({
            canonicalProjectRoot: confined.canonicalProjectRoot,
            maxDepth: globalSettings.maxDepthOfRepoSearch,
            git,
            fs
          });
          return {
            exitCode: 0,
            stdout: `${JSON.stringify({ projectId, repos }, null, 2)}\n`
          };
        }

        if (sub === 'remotes') {
          const res = await git({ cwd: confined.canonicalRepoRoot, args: ['remote', '-v'], timeoutMs: 8_000 });
          const remotes = parseGitRemotesOutput(res.stdout);
          return {
            exitCode: 0,
            stdout: `${JSON.stringify({ projectId, remotes }, null, 2)}\n`
          };
        }

        if (sub === 'details') {
          const commitHash =
            readFlag(argv, '--commit') ??
            (argv[1] && !argv[1].startsWith('-') ? argv[1] : 'HEAD');
          const details = await loadCommitDetails({
            cwd: confined.canonicalRepoRoot,
            git,
            commitHash
          });
          return {
            exitCode: 0,
            stdout: `${JSON.stringify(details, null, 2)}\n`
          };
        }

        if (sub === 'compare') {
          const fromHash =
            readFlag(argv, '--from') ??
            (argv[1] && !argv[1].startsWith('-') ? argv[1] : '');
          const toHash =
            readFlag(argv, '--to') ??
            (argv[2] && !argv[2].startsWith('-') ? argv[2] : 'HEAD');
          if (!fromHash) {
            return { exitCode: 1, stderr: 'Missing --from <commitHash> for compare.\n' };
          }
          const comparison = await compareCommits({
            cwd: confined.canonicalRepoRoot,
            git,
            fromHash,
            toHash
          });
          return {
            exitCode: 0,
            stdout: `${JSON.stringify(comparison, null, 2)}\n`
          };
        }

        if (sub === 'diff') {
          const commitHash =
            readFlag(argv, '--commit') ??
            (argv[1] && !argv[1].startsWith('-') ? argv[1] : 'HEAD');
          const fromHash = readFlag(argv, '--from');
          const filePath =
            readFlag(argv, '--file') ??
            (argv[2] && !argv[2].startsWith('-') ? argv[2] : '');
          if (!filePath) {
            return { exitCode: 1, stderr: 'Missing --file <relativePath> for diff.\n' };
          }
          const diff = await loadFileDiff({
            cwd: confined.canonicalRepoRoot,
            git,
            commitHash,
            fromHash,
            filePath
          });
          return {
            exitCode: 0,
            stdout: `${JSON.stringify(diff, null, 2)}\n`
          };
        }

        if (sub === 'log') {
          const maxCount = Number.parseInt(readFlag(argv, '--max-count') ?? '25', 10) || 25;
          const branchesCsv = readFlag(argv, '--branches');
          const repoSettings = await storage.getRepoSettings(projectId, confined.subRepoRelPath);
          const graph = await loadRepositoryGraph({
            cwd: confined.canonicalRepoRoot,
            git,
            maxCommits: maxCount,
            selectedBranches: branchesCsv
              ? branchesCsv.split(',').map((s) => s.trim()).filter(Boolean)
              : repoSettings.selectedBranches,
            showRemoteBranches: repoSettings.showRemoteBranches,
            showTags: repoSettings.showTags,
            showStashes: repoSettings.showStashes,
            showUncommittedChanges: repoSettings.showUncommittedChanges,
            showUntrackedFiles: repoSettings.showUntrackedFiles,
            onlyFollowFirstParent: repoSettings.onlyFollowFirstParent,
            commitOrdering: repoSettings.commitOrdering,
            useMailmap: globalSettings.useMailmap
          });
          return {
            exitCode: 0,
            stdout: `${JSON.stringify(graph, null, 2)}\n`
          };
        }

        return {
          exitCode: 1,
          stderr: `Unknown subcommand: ${sub}. Expected repos, log, details, compare, diff, or remotes.\n`
        };
      } catch (err) {
        return {
          exitCode: 1,
          stderr: `${err instanceof Error ? err.message : String(err)}\n`
        };
      }
    }
  });

  const toolDef = {
    name: 'git_tree_inspect',
    description:
      'Inspect the Git commit tree/graph, commit details, two-commit comparisons, or file diffs for a registered Zana project.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['log', 'details', 'compare', 'diff'],
          description: 'Inspection action to perform'
        },
        projectId: {
          type: 'string',
          description: 'Optional projectId (defaults to the current thread projectId)'
        },
        subRepoRelPath: {
          type: 'string',
          description: 'Optional sub-repository relative path inside the project'
        },
        maxCommits: {
          type: 'number',
          description: 'Maximum commits to load for action="log" (default 30)'
        },
        commit: {
          type: 'string',
          description: 'Commit SHA or "*" for uncommitted changes (used by details and diff)'
        },
        fromCommit: {
          type: 'string',
          description: 'Base commit SHA for compare or diff'
        },
        toCommit: {
          type: 'string',
          description: 'Target commit SHA for compare'
        },
        filePath: {
          type: 'string',
          description: 'Repository-relative file path for action="diff"'
        }
      },
      required: ['action']
    },
    async execute(
      rawInput: unknown,
      ctx: { threadId: string; projectId: string; signal: AbortSignal }
    ) {
      const input = (rawInput && typeof rawInput === 'object' ? rawInput : {}) as Record<string, unknown>;
      const action = typeof input.action === 'string' ? input.action : 'log';
      const projectId =
        (typeof input.projectId === 'string' && input.projectId.trim()) || ctx.projectId || '';
      const subRepoRelPath =
        typeof input.subRepoRelPath === 'string' ? input.subRepoRelPath.trim() : '';

      const confined = await resolveConfinedRepoPath({
        projectId,
        subRepoRelPath,
        listProjects: () => zcc.sdk.projects.list(),
        fs
      });
      const globalSettings = await readGlobalSettings();
      const repoSettings = await storage.getRepoSettings(projectId, confined.subRepoRelPath);

      if (action === 'details') {
        const commitHash = typeof input.commit === 'string' && input.commit.trim() ? input.commit.trim() : 'HEAD';
        return loadCommitDetails({
          cwd: confined.canonicalRepoRoot,
          git,
          commitHash
        });
      }

      if (action === 'compare') {
        const fromHash = typeof input.fromCommit === 'string' ? input.fromCommit.trim() : '';
        const toHash = typeof input.toCommit === 'string' && input.toCommit.trim() ? input.toCommit.trim() : 'HEAD';
        if (!fromHash) throw new Error('fromCommit is required for action="compare".');
        return compareCommits({
          cwd: confined.canonicalRepoRoot,
          git,
          fromHash,
          toHash
        });
      }

      if (action === 'diff') {
        const commitHash = typeof input.commit === 'string' && input.commit.trim() ? input.commit.trim() : 'HEAD';
        const fromHash = typeof input.fromCommit === 'string' && input.fromCommit.trim() ? input.fromCommit.trim() : undefined;
        const filePath = typeof input.filePath === 'string' ? input.filePath.trim() : '';
        if (!filePath) throw new Error('filePath is required for action="diff".');
        return loadFileDiff({
          cwd: confined.canonicalRepoRoot,
          git,
          commitHash,
          fromHash,
          filePath
        });
      }

      const maxCommits =
        typeof input.maxCommits === 'number' && Number.isFinite(input.maxCommits)
          ? Math.max(1, Math.min(200, Math.floor(input.maxCommits)))
          : 30;

      return loadRepositoryGraph({
        cwd: confined.canonicalRepoRoot,
        git,
        maxCommits,
        selectedBranches: repoSettings.selectedBranches,
        showRemoteBranches: repoSettings.showRemoteBranches,
        showTags: repoSettings.showTags,
        showStashes: repoSettings.showStashes,
        showUncommittedChanges: repoSettings.showUncommittedChanges,
        showUntrackedFiles: repoSettings.showUntrackedFiles,
        onlyFollowFirstParent: repoSettings.onlyFollowFirstParent,
        commitOrdering: repoSettings.commitOrdering,
        useMailmap: globalSettings.useMailmap
      });
    }
  };

  zcc.agents.registerTool(toolDef);
  zcc.agents.registerTool({ ...toolDef, name: 'git_graph_inspect' });
}
