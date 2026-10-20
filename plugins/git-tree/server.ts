import { existsSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import { registerGitTreeCliAndTools } from './src/server/cli-and-tools.js';
import { buildPullRequestUrl, executeGitAction, getTagDetails } from './src/server/git-actions.js';
import { compareCommits, loadCommitDetails, loadFileContent, loadFileDiff } from './src/server/git-details-diff.js';
import { createTempFileGitRunner, type GitRunner } from './src/server/git-exec.js';
import { loadRepositoryGraph, parseGitRemotesOutput } from './src/server/git-log-parser.js';
import {
  createNodeFsDeps,
  discoverProjectRepos,
  resolveConfinedRepoPath,
  type ProjectFsDeps
} from './src/server/project-repos.js';
import { DEFAULT_GLOBAL_SETTINGS, GitGraphStorage } from './src/server/storage.js';
import type {
  CommitDetailsLocation,
  DiffViewMode,
  FileViewType,
  GitGraphGlobalSettings,
  GraphStyle,
  LoadGraphDataResult,
  RepoSettings
} from './src/server/types.js';

export interface GitTreePluginDeps {
  git?: GitRunner;
  fs?: ProjectFsDeps;
  now?: () => number;
}
export type GitGraphPluginDeps = GitTreePluginDeps;

export const GIT_TREE_CHANGED_CHANNEL = 'git-tree:changed';
export const GIT_GRAPH_CHANGED_CHANNEL = 'git-graph:changed';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(record: Record<string, unknown>, key: string): string {
  const val = record[key];
  return typeof val === 'string' ? val.trim() : '';
}

export default async function createGitTreePlugin(
  zcc: ZccPluginApi,
  deps: GitTreePluginDeps = {}
): Promise<void> {
  const git = deps.git ?? createTempFileGitRunner();
  const fs = deps.fs ?? createNodeFsDeps();
  const storage = new GitGraphStorage(zcc.storage.kv, deps.now);

  const settingsHandle = zcc.settings.define({
    graphStyle: {
      type: 'select',
      label: 'Graph style',
      description: 'Render branch and merge lines with rounded curves or angular segments.',
      options: ['rounded', 'angular'],
      default: DEFAULT_GLOBAL_SETTINGS.graphStyle
    },
    initialLoadCommits: {
      type: 'number',
      label: 'Initial commits to load',
      description: 'Number of commits loaded initially when opening Git Graph.',
      default: DEFAULT_GLOBAL_SETTINGS.initialLoadCommits,
      min: 25,
      max: 2000
    },
    loadMoreCommits: {
      type: 'number',
      label: 'Load more batch size',
      description: 'Additional commits loaded when clicking Load More Commits.',
      default: DEFAULT_GLOBAL_SETTINGS.loadMoreCommits,
      min: 25,
      max: 1000
    },
    commitDetailsLocation: {
      type: 'select',
      label: 'Commit Details view location',
      description: 'Render Commit Details in a docked split inspector or inline below the selected commit row.',
      options: ['docked', 'inline'],
      default: DEFAULT_GLOBAL_SETTINGS.commitDetailsLocation
    },
    fileViewType: {
      type: 'select',
      label: 'Default File View type',
      description: 'Display changed files as a hierarchical File Tree or flat File List.',
      options: ['tree', 'list'],
      default: DEFAULT_GLOBAL_SETTINGS.fileViewType
    },
    compactFolders: {
      type: 'boolean',
      label: 'Compact folders in File Tree',
      description: 'Compress single-child folders into a single combined folder path.',
      default: DEFAULT_GLOBAL_SETTINGS.compactFolders
    },
    diffViewMode: {
      type: 'select',
      label: 'Default Diff viewer layout',
      description: 'Show file diffs in unified or side-by-side split mode.',
      options: ['unified', 'split'],
      default: DEFAULT_GLOBAL_SETTINGS.diffViewMode
    },
    muteNonAncestors: {
      type: 'boolean',
      label: 'Mute commits that are not ancestors of HEAD',
      description: 'Render commits outside the checked-out branch ancestry with muted text.',
      default: DEFAULT_GLOBAL_SETTINGS.muteNonAncestors
    },
    muteMergeCommits: {
      type: 'boolean',
      label: 'Mute merge commits',
      description: 'Display merge commits with a slightly muted text color.',
      default: DEFAULT_GLOBAL_SETTINGS.muteMergeCommits
    },
    dateType: {
      type: 'select',
      label: 'Date column type',
      description: 'Display either author date or commit date in the Date column.',
      options: ['author', 'commit'],
      default: DEFAULT_GLOBAL_SETTINGS.dateType
    },
    dateFormat: {
      type: 'select',
      label: 'Date column format',
      description: 'Format timestamps as relative age, ISO date, or full date & time.',
      options: ['relative', 'iso', 'datetime'],
      default: DEFAULT_GLOBAL_SETTINGS.dateFormat
    },
    maxDepthOfRepoSearch: {
      type: 'number',
      label: 'Max depth of repository search',
      description: 'Maximum depth of subfolders to scan when discovering nested repositories in a project.',
      default: DEFAULT_GLOBAL_SETTINGS.maxDepthOfRepoSearch,
      min: 0,
      max: 5
    },
    fetchAndPrune: {
      type: 'boolean',
      label: 'Fetch and prune remotes by default',
      description: 'Automatically pass --prune when fetching from remotes.',
      default: DEFAULT_GLOBAL_SETTINGS.fetchAndPrune
    },
    fetchAndPruneTags: {
      type: 'boolean',
      label: 'Fetch and prune tags by default',
      description: 'Automatically pass --prune-tags when fetching from remotes.',
      default: DEFAULT_GLOBAL_SETTINGS.fetchAndPruneTags
    },
    signCommits: {
      type: 'boolean',
      label: 'Sign commits (GPG / X.509)',
      description: 'Pass -S when creating merge, cherry-pick, or revert commits.',
      default: DEFAULT_GLOBAL_SETTINGS.signCommits
    },
    signTags: {
      type: 'boolean',
      label: 'Sign tags (GPG / X.509)',
      description: 'Pass -s when creating tags.',
      default: DEFAULT_GLOBAL_SETTINGS.signTags
    },
    useMailmap: {
      type: 'boolean',
      label: 'Respect .mailmap',
      description: 'Use .mailmap when resolving author and committer names and emails.',
      default: DEFAULT_GLOBAL_SETTINGS.useMailmap
    }
  });

  async function readGlobalSettings(): Promise<GitGraphGlobalSettings> {
    const raw = await settingsHandle.get();
    const customOverride = await zcc.storage.kv.get<Partial<GitGraphGlobalSettings>>('global-settings-override');
    const merged = { ...raw, ...(customOverride ?? {}) };
    return {
      graphStyle: merged.graphStyle === 'angular' ? 'angular' : ('rounded' as GraphStyle),
      initialLoadCommits:
        typeof merged.initialLoadCommits === 'number'
          ? Math.max(25, Math.min(2000, merged.initialLoadCommits))
          : DEFAULT_GLOBAL_SETTINGS.initialLoadCommits,
      loadMoreCommits:
        typeof merged.loadMoreCommits === 'number'
          ? Math.max(25, Math.min(1000, merged.loadMoreCommits))
          : DEFAULT_GLOBAL_SETTINGS.loadMoreCommits,
      muteNonAncestors:
        typeof merged.muteNonAncestors === 'boolean'
          ? merged.muteNonAncestors
          : DEFAULT_GLOBAL_SETTINGS.muteNonAncestors,
      muteMergeCommits:
        typeof merged.muteMergeCommits === 'boolean'
          ? merged.muteMergeCommits
          : DEFAULT_GLOBAL_SETTINGS.muteMergeCommits,
      commitDetailsLocation:
        merged.commitDetailsLocation === 'inline' ? 'inline' : ('docked' as CommitDetailsLocation),
      fileViewType: merged.fileViewType === 'list' ? 'list' : ('tree' as FileViewType),
      compactFolders:
        typeof merged.compactFolders === 'boolean'
          ? merged.compactFolders
          : DEFAULT_GLOBAL_SETTINGS.compactFolders,
      diffViewMode: merged.diffViewMode === 'split' ? 'split' : ('unified' as DiffViewMode),
      maxDepthOfRepoSearch:
        typeof merged.maxDepthOfRepoSearch === 'number'
          ? Math.max(0, Math.min(5, merged.maxDepthOfRepoSearch))
          : DEFAULT_GLOBAL_SETTINGS.maxDepthOfRepoSearch,
      dateType: merged.dateType === 'commit' ? 'commit' : 'author',
      dateFormat:
        merged.dateFormat === 'iso' || merged.dateFormat === 'datetime'
          ? merged.dateFormat
          : 'relative',
      fetchAndPrune:
        typeof merged.fetchAndPrune === 'boolean'
          ? merged.fetchAndPrune
          : DEFAULT_GLOBAL_SETTINGS.fetchAndPrune,
      fetchAndPruneTags:
        typeof merged.fetchAndPruneTags === 'boolean'
          ? merged.fetchAndPruneTags
          : DEFAULT_GLOBAL_SETTINGS.fetchAndPruneTags,
      signCommits:
        typeof merged.signCommits === 'boolean'
          ? merged.signCommits
          : DEFAULT_GLOBAL_SETTINGS.signCommits,
      signTags:
        typeof merged.signTags === 'boolean' ? merged.signTags : DEFAULT_GLOBAL_SETTINGS.signTags,
      useMailmap:
        typeof merged.useMailmap === 'boolean'
          ? merged.useMailmap
          : DEFAULT_GLOBAL_SETTINGS.useMailmap,
      graphColors: Array.isArray(merged.graphColors) && merged.graphColors.length > 0
        ? merged.graphColors
        : DEFAULT_GLOBAL_SETTINGS.graphColors
    };
  }

  // Register Project Tab availability check
  zcc.ui.registerProjectTabAvailability({
    tabId: 'git-tree',
    async evaluate({ projectId }) {
      try {
        await resolveConfinedRepoPath({
          projectId,
          listProjects: () => zcc.sdk.projects.list(),
          fs
        });
        return { available: true };
      } catch (err) {
        return {
          available: false,
          reason: err instanceof Error ? err.message : 'Project folder is unavailable'
        };
      }
    }
  });

  async function resolveRepoContext(rec: Record<string, unknown>) {
    const projectId = asString(rec, 'projectId');
    const subRepoRelPath = asString(rec, 'subRepoRelPath');
    const confined = await resolveConfinedRepoPath({
      projectId,
      subRepoRelPath,
      listProjects: () => zcc.sdk.projects.list(),
      fs
    });
    return { projectId, subRepoRelPath, confined };
  }

  // --- RPC Methods ---
  zcc.rpc.method('listProjects', async () => {
    const list = await zcc.sdk.projects.list();
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      path: p.path
    }));
  });

  zcc.rpc.method('discoverRepos', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const globalSettings = await readGlobalSettings();
    const { confined } = await resolveRepoContext(rec);
    const repos = await discoverProjectRepos({
      canonicalProjectRoot: confined.canonicalProjectRoot,
      maxDepth: globalSettings.maxDepthOfRepoSearch,
      git,
      fs
    });
    return { repos, globalSettings };
  });

  zcc.rpc.method('loadGraph', async (rawArgs): Promise<LoadGraphDataResult> => {
    const rec = asRecord(rawArgs);
    const globalSettings = await readGlobalSettings();
    const { projectId, confined } = await resolveRepoContext(rec);

    const repoSettings = await storage.getRepoSettings(projectId, confined.subRepoRelPath);
    const maxCommits =
      typeof rec.maxCommits === 'number' && Number.isFinite(rec.maxCommits)
        ? Math.max(25, Math.min(2000, Math.floor(rec.maxCommits)))
        : globalSettings.initialLoadCommits;

    const graph = await loadRepositoryGraph({
      cwd: confined.canonicalRepoRoot,
      git,
      maxCommits,
      selectedBranches: Array.isArray(rec.selectedBranches)
        ? (rec.selectedBranches as string[])
        : repoSettings.selectedBranches,
      showRemoteBranches:
        typeof rec.showRemoteBranches === 'boolean'
          ? rec.showRemoteBranches
          : repoSettings.showRemoteBranches,
      showTags: typeof rec.showTags === 'boolean' ? rec.showTags : repoSettings.showTags,
      showStashes:
        typeof rec.showStashes === 'boolean' ? rec.showStashes : repoSettings.showStashes,
      showUncommittedChanges:
        typeof rec.showUncommittedChanges === 'boolean'
          ? rec.showUncommittedChanges
          : repoSettings.showUncommittedChanges,
      showUntrackedFiles:
        typeof rec.showUntrackedFiles === 'boolean'
          ? rec.showUntrackedFiles
          : repoSettings.showUntrackedFiles,
      onlyFollowFirstParent:
        typeof rec.onlyFollowFirstParent === 'boolean'
          ? rec.onlyFollowFirstParent
          : repoSettings.onlyFollowFirstParent,
      commitOrdering:
        rec.commitOrdering === 'topo' || rec.commitOrdering === 'author-date' || rec.commitOrdering === 'date'
          ? rec.commitOrdering
          : repoSettings.commitOrdering,
      useMailmap: globalSettings.useMailmap
    });

    return {
      repo: {
        relPath: confined.subRepoRelPath,
        label: confined.subRepoRelPath
          ? `${confined.project.name} / ${confined.subRepoRelPath}`
          : confined.project.name,
        currentBranch: graph.currentBranch,
        headHash: graph.headHash,
        isWorktree: false
      },
      ...graph,
      repoSettings,
      globalSettings
    };
  });

  zcc.rpc.method('getCommitDetails', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const commitHash = asString(rec, 'commitHash');
    const { projectId, confined } = await resolveRepoContext(rec);
    const repoSettings = await storage.getRepoSettings(projectId, confined.subRepoRelPath);
    const details = await loadCommitDetails({
      cwd: confined.canonicalRepoRoot,
      git,
      commitHash,
      showUntrackedFiles: repoSettings.showUntrackedFiles
    });
    const codeReview = await storage.getCodeReview({
      projectId,
      subRepoRelPath: confined.subRepoRelPath,
      fromHash: null,
      toHash: commitHash
    });
    return { details, codeReview };
  });

  zcc.rpc.method('compareCommits', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const fromHash = asString(rec, 'fromHash');
    const toHash = asString(rec, 'toHash');
    const { projectId, confined } = await resolveRepoContext(rec);
    const comparison = await compareCommits({
      cwd: confined.canonicalRepoRoot,
      git,
      fromHash,
      toHash
    });
    const codeReview = await storage.getCodeReview({
      projectId,
      subRepoRelPath: confined.subRepoRelPath,
      fromHash,
      toHash
    });
    return { comparison, codeReview };
  });

  zcc.rpc.method('getFileDiff', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const commitHash = asString(rec, 'commitHash');
    const fromHash = asString(rec, 'fromHash') || undefined;
    const filePath = asString(rec, 'filePath');
    const oldPath = asString(rec, 'oldPath') || undefined;
    const { confined } = await resolveRepoContext(rec);
    return loadFileDiff({
      cwd: confined.canonicalRepoRoot,
      git,
      commitHash,
      fromHash,
      filePath,
      oldPath
    });
  });

  zcc.rpc.method('getFileContent', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const commitHash = asString(rec, 'commitHash');
    const filePath = asString(rec, 'filePath');
    const { confined } = await resolveRepoContext(rec);
    return loadFileContent({
      cwd: confined.canonicalRepoRoot,
      git,
      commitHash,
      filePath
    });
  });

  zcc.rpc.method('runGitAction', async (rawArgs) => {
    const rec = asRecord(rawArgs);

    let action = '';
    let params: Record<string, unknown> = {};
    if (typeof rec.action === 'string') {
      action = rec.action.trim();
      params = asRecord(rec.params);
    } else if (rec.action && typeof rec.action === 'object') {
      const actionObj = asRecord(rec.action);
      const rawKind = asString(actionObj, 'kind');
      const kindMap: Record<string, string> = {
        init: 'init',
        'init-repo': 'init',
        'checkout-branch': 'checkoutBranch',
        'create-branch': 'createBranch',
        'rename-branch': 'renameBranch',
        'delete-branch': 'deleteBranch',
        'delete-remote-branch': 'deleteRemoteBranch',
        'push-branch': 'push',
        'pull-branch': 'pull',
        'fetch-into-local-branch': 'fetch',
        'checkout-commit': 'checkoutCommit',
        'cherry-pick': 'cherryPick',
        'revert-commit': 'revertCommit',
        'reset-to-commit': 'resetToCommit',
        'drop-commit': 'dropCommit',
        'create-tag': 'addTag',
        'delete-tag': 'deleteTag',
        'push-tag': 'pushTag',
        'commit-uncommitted': 'commitUncommitted',
        'stash-push': 'stashPush',
        'stash-pop': 'stashPop',
        'stash-apply': 'stashApply',
        'stash-drop': 'stashDrop',
        'stash-branch': 'stashBranch',
        'reset-uncommitted': 'resetUncommitted',
        'clean-untracked': 'cleanUntracked',
        'discard-all': 'discardAll',
        'remote-add': 'addRemote',
        'remote-edit': 'editRemote',
        'remote-delete': 'deleteRemote',
        'remote-prune': 'pruneRemote'
      };
      action = kindMap[rawKind] ?? rawKind;
      params = {
        ...actionObj,
        branch: actionObj.branch ?? actionObj.branchName,
        remoteBranch: actionObj.remoteBranch ?? actionObj.createAndTrackFrom,
        target: actionObj.target ?? actionObj.startPoint,
        commit: actionObj.commit ?? actionObj.commitHash,
        tag: actionObj.tag ?? actionObj.tagName
      };
    }

    const { projectId, confined } = await resolveRepoContext(rec);
    const globalSettings = await readGlobalSettings();
    const outcome = await executeGitAction({
      cwd: confined.canonicalRepoRoot,
      git,
      action,
      params,
      signCommits: globalSettings.signCommits,
      signTags: globalSettings.signTags
    });
    if (outcome.ok) {
      const payload = {
        projectId,
        subRepoRelPath: confined.subRepoRelPath,
        action
      };
      zcc.realtime.publish(GIT_TREE_CHANGED_CHANNEL, payload);
      zcc.realtime.publish(GIT_GRAPH_CHANGED_CHANNEL, payload);
    } else if (outcome.error) {
      throw new Error(outcome.error);
    }
    return outcome;
  });

  zcc.rpc.method('getTagDetails', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const tagName = asString(rec, 'tagName');
    const { confined } = await resolveRepoContext(rec);
    return getTagDetails({
      cwd: confined.canonicalRepoRoot,
      git,
      tagName
    });
  });

  zcc.rpc.method('buildPullRequestUrl', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const sourceBranch = asString(rec, 'sourceBranch');
    const { projectId, confined } = await resolveRepoContext(rec);
    const repoSettings = await storage.getRepoSettings(projectId, confined.subRepoRelPath);
    const remotesRes = await git({
      cwd: confined.canonicalRepoRoot,
      args: ['remote', '-v'],
      timeoutMs: 8_000
    });
    const remotes = parseGitRemotesOutput(remotesRes.stdout);
    const url = buildPullRequestUrl({
      sourceBranch,
      config: repoSettings.pullRequestConfig,
      remotes
    });
    return { url };
  });

  // --- Code Review RPCs ---
  zcc.rpc.method('codeReviewStart', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const projectId = asString(rec, 'projectId');
    const subRepoRelPath = asString(rec, 'subRepoRelPath');
    const fromHash = asString(rec, 'fromHash') || null;
    const toHash = asString(rec, 'toHash');
    return storage.startCodeReview({ projectId, subRepoRelPath, fromHash, toHash });
  });

  zcc.rpc.method('codeReviewToggleFile', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const projectId = asString(rec, 'projectId');
    const subRepoRelPath = asString(rec, 'subRepoRelPath');
    const fromHash = asString(rec, 'fromHash') || null;
    const toHash = asString(rec, 'toHash');
    const filePath = asString(rec, 'filePath');
    const reviewed = Boolean(rec.reviewed);
    return storage.setCodeReviewFileReviewed({
      projectId,
      subRepoRelPath,
      fromHash,
      toHash,
      filePath,
      reviewed
    });
  });

  zcc.rpc.method('codeReviewEnd', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const projectId = asString(rec, 'projectId');
    const subRepoRelPath = asString(rec, 'subRepoRelPath');
    const fromHash = asString(rec, 'fromHash') || null;
    const toHash = asString(rec, 'toHash');
    await storage.endCodeReview({ projectId, subRepoRelPath, fromHash, toHash });
    return { ok: true };
  });

  zcc.rpc.method('listCodeReviews', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const projectId = asString(rec, 'projectId');
    return storage.listProjectCodeReviews(projectId);
  });

  // --- Settings & Export RPCs ---
  zcc.rpc.method('updateRepoSettings', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const patch = asRecord(rec.settings ?? rec.patch) as Partial<RepoSettings>;
    const { projectId, confined } = await resolveRepoContext(rec);
    const updated = await storage.saveRepoSettings(projectId, confined.subRepoRelPath, patch);
    const repoPayload = {
      projectId,
      subRepoRelPath: confined.subRepoRelPath,
      action: 'updateRepoSettings'
    };
    zcc.realtime.publish(GIT_TREE_CHANGED_CHANNEL, repoPayload);
    zcc.realtime.publish(GIT_GRAPH_CHANGED_CHANNEL, repoPayload);
    return updated;
  });

  zcc.rpc.method('updateGlobalSettings', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const patch = asRecord(rec.settings ?? rec.patch) as Partial<GitGraphGlobalSettings>;
    const current = (await zcc.storage.kv.get<Partial<GitGraphGlobalSettings>>('global-settings-override')) ?? {};
    await zcc.storage.kv.set('global-settings-override', { ...current, ...patch });
    const next = await readGlobalSettings();
    zcc.realtime.publish(GIT_TREE_CHANGED_CHANNEL, { action: 'updateGlobalSettings' });
    zcc.realtime.publish(GIT_GRAPH_CHANGED_CHANNEL, { action: 'updateGlobalSettings' });
    return next;
  });

  zcc.rpc.method('exportRepoConfig', async (rawArgs) => {
    const rec = asRecord(rawArgs);
    const { projectId, confined } = await resolveRepoContext(rec);
    const repoSettings = await storage.getRepoSettings(projectId, confined.subRepoRelPath);
    const targetFile = join(confined.canonicalRepoRoot, '.git-tree.json');
    const tmp = `${targetFile}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      writeFileSync(tmp, `${JSON.stringify(repoSettings, null, 2)}\n`, 'utf8');
      renameSync(tmp, targetFile);
    } catch (err) {
      try {
        if (existsSync(tmp)) unlinkSync(tmp);
      } catch {}
      throw err;
    }
    return { ok: true, path: '.git-tree.json', filePath: targetFile };
  });

  // --- Ask Agent Bridge ---
  async function buildCommitAgentPromptContext(rawArgs: unknown) {
    const rec = asRecord(rawArgs);
    const commitHash = asString(rec, 'commitHash') || 'HEAD';
    const fromHash = asString(rec, 'fromHash');
    const filePath = asString(rec, 'filePath');
    const userPrompt =
      asString(rec, 'prompt') ||
      asString(rec, 'userPrompt') ||
      (commitHash === '*'
        ? 'Review the working tree changes and highlight any potential regressions or issues.'
        : fromHash
          ? `Compare the changes between ${fromHash.slice(0, 8)} and ${commitHash.slice(0, 8)} and highlight any potential regressions or issues.`
          : filePath
            ? `Review the changes in ${filePath} and explain potential regressions or issues.`
            : `Explain commit ${commitHash.slice(0, 8)} and highlight any potential issues.`);

    const { projectId, confined } = await resolveRepoContext(rec);

    let contextSummary = '';
    if (filePath) {
      const diff = await loadFileDiff({
        cwd: confined.canonicalRepoRoot,
        git,
        commitHash,
        fromHash: fromHash || undefined,
        filePath
      });
      contextSummary = [
        `Repository: ${confined.subRepoRelPath || '.'}`,
        fromHash ? `Comparison: ${fromHash} .. ${commitHash}` : `Commit: ${commitHash}`,
        `File: ${filePath}`,
        '```diff',
        diff.rawDiff.slice(0, 12_000),
        '```'
      ].join('\n');
    } else if (fromHash) {
      const comp = await compareCommits({
        cwd: confined.canonicalRepoRoot,
        git,
        fromHash,
        toHash: commitHash
      });
      contextSummary = [
        `Repository: ${confined.subRepoRelPath || '.'}`,
        `Comparison: ${fromHash} .. ${commitHash}`,
        `Changed files (${comp.fileChanges.length}):`,
        ...comp.fileChanges.slice(0, 60).map((f) => `- [${f.status}] ${f.newPath} (+${f.additions ?? 0}/-${f.deletions ?? 0})`)
      ].join('\n');
    } else {
      const details = await loadCommitDetails({
        cwd: confined.canonicalRepoRoot,
        git,
        commitHash
      });
      contextSummary = [
        `Repository: ${confined.subRepoRelPath || '.'}`,
        `Commit: ${details.hash} (${details.subject})`,
        `Author: ${details.authorName} <${details.authorEmail}>`,
        details.body ? `\n${details.body}\n` : '',
        `Changed files (${details.fileChanges.length}):`,
        ...details.fileChanges.slice(0, 60).map((f) => `- [${f.status}] ${f.newPath} (+${f.additions ?? 0}/-${f.deletions ?? 0})`)
      ].join('\n');
    }

    const fullPrompt = `${userPrompt}\n\n---\n${contextSummary}`;
    const title = `Git Tree: ${filePath ? filePath : commitHash === '*' ? 'Working Tree' : commitHash.slice(0, 8)}`;

    return { projectId, prompt: fullPrompt, title };
  }

  zcc.rpc.method('draftAgentAboutCommit', async (rawArgs) => {
    const { projectId, prompt, title } = await buildCommitAgentPromptContext(rawArgs);
    return { ok: true, prompt, title, projectId };
  });

  zcc.rpc.method('askAgentAboutCommit', async (rawArgs) => {
    const { projectId, prompt, title } = await buildCommitAgentPromptContext(rawArgs);

    const spawned = await zcc.sdk.threads.spawn({
      projectId,
      title,
      prompt
    });

    return { ok: true, threadId: spawned.id, title };
  });

  registerGitTreeCliAndTools({
    zcc,
    git,
    fs,
    storage,
    readGlobalSettings
  });

  zcc.log.info('git-tree plugin initialized');
}
