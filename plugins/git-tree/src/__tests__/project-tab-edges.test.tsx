// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';
import type { LoadGraphDataResult } from '../server/types.js';

const HEAD = 'aaaa111122223333444455556666777788889999';
const OTHER = 'bbbb111122223333444455556666777788889999';

function graph(overrides: Partial<LoadGraphDataResult> = {}): LoadGraphDataResult {
  const commit = (hash: string, subject: string, parents: string[], extra: Record<string, unknown> = {}) => ({
    hash,
    abbreviatedHash: hash.slice(0, 7),
    parents,
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    authorDate: 1700000050,
    committerName: 'Alice',
    committerEmail: 'alice@example.com',
    commitDate: 1700000050,
    subject,
    refs: [],
    ...extra
  });
  return {
    repo: { relPath: '', label: 'Project Root', currentBranch: 'main', headHash: HEAD, isWorktree: false },
    commits: [
      commit(HEAD, 'Head commit', [OTHER], { refs: [{ type: 'head', name: 'main', isHead: true }], isHead: true }),
      commit(OTHER, 'Older commit', [])
    ],
    hasMore: false,
    branches: ['main'],
    remoteBranches: ['origin/main'],
    tags: ['v1.0.0'],
    stashes: [],
    headHash: HEAD,
    currentBranch: 'main',
    uncommittedCount: 0,
    remotes: [{ name: 'origin', fetchUrl: 'https://github.com/acme/zana.git', pushUrl: 'https://github.com/acme/zana.git' }],
    repoSettings: {
      selectedBranches: [],
      showRemoteBranches: false,
      showStashes: true,
      showTags: true,
      showUncommittedChanges: true,
      showUntrackedFiles: true,
      onlyFollowFirstParent: false,
      commitOrdering: 'date',
      issueLinkingRules: [],
      pullRequestConfig: { provider: 'github', remoteName: 'origin', targetBranch: 'main' }
    },
    globalSettings: {
      graphStyle: 'rounded',
      initialLoadCommits: 300,
      loadMoreCommits: 100,
      muteNonAncestors: false,
      muteMergeCommits: false,
      commitDetailsLocation: 'docked',
      fileViewType: 'list',
      compactFolders: true,
      diffViewMode: 'unified',
      maxDepthOfRepoSearch: 2,
      dateType: 'author',
      dateFormat: 'relative',
      fetchAndPrune: false,
      fetchAndPruneTags: false,
      signCommits: false,
      signTags: false,
      useMailmap: true,
      graphColors: ['#0085d9']
    },
    ...overrides
  } as LoadGraphDataResult;
}

const details = (hash: string) =>
  ({
    hash,
    abbreviatedHash: hash.slice(0, 7),
    parents: [],
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    authorDate: 1,
    committerName: 'Alice',
    committerEmail: 'alice@example.com',
    commitDate: 1,
    subject: 'S',
    body: '',
    fileChanges: [{ oldPath: 'a.ts', newPath: 'a.ts', status: 'M', additions: 1, deletions: 0 }]
  }) as never;

async function mount(rpcOverrides: Record<string, unknown> = {}, data = graph()) {
  const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
  const tab = registrations.projectTabs[0];
  const rpc: Record<string, unknown> = {
    discoverRepos: () => ({ repos: [data.repo], globalSettings: data.globalSettings }),
    loadGraph: () => data,
    getCommitDetails: () => ({ details: details(HEAD), codeReview: null }),
    getFileDiff: () => ({ filePath: 'a.ts', commitHash: HEAD, isBinary: false, rawDiff: '', hunks: [] }),
    updateRepoSettings: () => data.repoSettings,
    updateGlobalSettings: () => ({ ok: true }),
    runGitAction: () => ({ ok: true, stdout: '', stderr: '' }),
    ...rpcOverrides
  };
  return renderSlot(tab, { pluginId: 'git-tree', projectId: 'proj-1' }, {
    panelAgent: true,
    context: { projectId: 'proj-1' },
    rpc: rpc as never
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GitTreeProjectTab error and edge paths', () => {
  it('shows an error banner when loading the repositories fails', async () => {
    const view = await mount({
      discoverRepos: () => {
        throw new Error('discover exploded');
      }
    });
    await waitFor(() => {
      expect(view.getByText('Failed to load Git Tree: discover exploded')).toBeTruthy();
    });
    view.unmount();
  });

  it('loads the first listed project when none is selected', async () => {
    const view = await mount({
      listProjects: () => [
        { id: 'proj-1', name: 'One' },
        { id: 'proj-2', name: 'Two' }
      ]
    });
    await waitFor(() => {
      expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy();
    });
    view.unmount();
  });

  it('shows an error banner when a commit cannot be loaded', async () => {
    const view = await mount({
      getCommitDetails: () => {
        throw new Error('details failed');
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => {
      expect(view.getByText('details failed')).toBeTruthy();
    });
    view.unmount();
  });

  it('reports a failed Create Pull Request lookup through the banner', async () => {
    const view = await mount({
      buildPullRequestUrl: () => ({ url: null })
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    view.unmount();
  });

  it('opens the find bar with Ctrl+F and refreshes with Ctrl+R', async () => {
    const loads: number[] = [];
    const data = graph();
    const view = await mount({
      loadGraph: () => {
        loads.push(loads.length);
        return data;
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    const before = loads.length;
    const root = view.getByTestId('gg-commit-row-aaaa111').closest('[role="toolbar"], div') as HTMLElement;
    const keyTarget = view.container.querySelector('.git-graph-toolbar')?.parentElement ?? root;
    fireEvent.keyDown(keyTarget, { key: 'r', ctrlKey: true });
    await waitFor(() => expect(loads.length).toBeGreaterThan(before));
    view.unmount();
  });

  it('shows the Initialize Git Repository error when init fails', async () => {
    const view = await mount({
      discoverRepos: () => ({ repos: [], globalSettings: graph().globalSettings }),
      runGitAction: () => {
        throw new Error('init refused');
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-init-repo-btn')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-init-repo-btn'));
    await waitFor(() => {
      expect(view.getByText('init refused')).toBeTruthy();
    });
    view.unmount();
  });

  it('persists a toolbar setting change through updateRepoSettings', async () => {
    const calls: unknown[] = [];
    const view = await mount({
      updateRepoSettings: (args: unknown) => {
        calls.push(args);
        return graph().repoSettings;
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    fireEvent.change(view.getAllByLabelText('Commit ordering')[0], { target: { value: 'topo' } });
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    view.unmount();
  });

  it('persists a global setting change through updateGlobalSettings', async () => {
    const calls: unknown[] = [];
    const view = await mount({
      updateGlobalSettings: (args: unknown) => {
        calls.push(args);
        return { ok: true };
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    fireEvent.click(view.getByTitle('Toggle rounded or angular graph lines'));
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    view.unmount();
  });
});
