// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';
import type { LoadGraphDataResult } from '../server/types.js';

const HEAD = 'aaaa111122223333444455556666777788889999';
const MERGE = 'cccc111122223333444455556666777788889999';
const SIDE = 'dddd111122223333444455556666777788889999';
const BASE = 'bbbb111122223333444455556666777788889999';

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

function graph(commits: unknown[], extra: Partial<LoadGraphDataResult> = {}): LoadGraphDataResult {
  return {
    repo: { relPath: '', label: 'Project Root', currentBranch: 'main', headHash: HEAD, isWorktree: false },
    commits,
    hasMore: false,
    branches: ['main', 'feature'],
    remoteBranches: [],
    tags: [],
    stashes: [],
    headHash: HEAD,
    currentBranch: 'main',
    uncommittedCount: 0,
    remotes: [],
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
      graphStyle: 'angular',
      initialLoadCommits: 300,
      loadMoreCommits: 100,
      muteNonAncestors: true,
      muteMergeCommits: false,
      commitDetailsLocation: 'inline',
      fileViewType: 'tree',
      compactFolders: false,
      diffViewMode: 'split',
      maxDepthOfRepoSearch: 2,
      dateType: 'committer',
      dateFormat: 'iso',
      fetchAndPrune: false,
      fetchAndPruneTags: false,
      signCommits: false,
      signTags: false,
      useMailmap: false,
      graphColors: ['#0085d9', '#d9008f']
    },
    ...extra
  } as LoadGraphDataResult;
}

let views: Array<{ unmount(): void }> = [];

async function mount(data: LoadGraphDataResult, rpcOverrides: Record<string, unknown> = {}) {
  const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
  const view = renderSlot(registrations.projectTabs[0], { pluginId: 'git-tree', projectId: 'proj-1' }, {
    panelAgent: true,
    context: { projectId: 'proj-1' },
    rpc: {
      discoverRepos: () => ({ repos: [data.repo], globalSettings: data.globalSettings }),
      loadGraph: () => data,
      getCommitDetails: (args: { commitHash?: string }) => ({
        details: {
          hash: args?.commitHash ?? HEAD,
          abbreviatedHash: 'x',
          parents: [],
          authorName: 'A',
          authorEmail: 'a@x',
          authorDate: 1,
          committerName: 'A',
          committerEmail: 'a@x',
          commitDate: 1,
          subject: 'S',
          body: '',
          fileChanges: []
        },
        codeReview: null
      }),
      ...rpcOverrides
    } as never
  });
  views.push(view);
  return view;
}

afterEach(() => {
  views.forEach((v) => v.unmount());
  views = [];
  cleanup();
  vi.restoreAllMocks();
});

describe('GitTreeProjectTab graph shapes and empty states', () => {
  it('draws merge, branch, and uncommitted nodes with the angular style and inline details', async () => {
    const data = graph([
      commit('*', 'Uncommitted Changes (1)', [HEAD], { isUncommitted: true }),
      commit(MERGE, 'Merge feature', [HEAD, SIDE], { refs: [{ type: 'head', name: 'main', isHead: false }] }),
      commit(HEAD, 'Head', [BASE], { isHead: true }),
      commit(SIDE, 'Side', [BASE], { refs: [{ type: 'head', name: 'feature', isHead: false }] }),
      commit(BASE, 'Base', [])
    ]);
    const view = await mount(data);
    await waitFor(() => expect(view.getByTestId('gg-commit-row-cccc111')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-cccc111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-*'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-dddd111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    expect(view.getByTestId('gg-svg-dag')).toBeTruthy();
  });

  it('shows the initialized-but-empty message when a repo has no HEAD yet', async () => {
    const view = await mount(graph([], { headHash: null as never }));
    await waitFor(() => {
      expect(view.getByText('Repository initialized with no commits or uncommitted changes yet.')).toBeTruthy();
    });
  });

  it('shows the filter message when a repo has a HEAD but no visible commits', async () => {
    const view = await mount(graph([], { headHash: HEAD }));
    await waitFor(() => {
      expect(view.getByText('No commits match the current branch filters.')).toBeTruthy();
    });
  });

  it('keeps the tab usable when a commit cannot be loaded for a graph row', async () => {
    const data = graph([commit(HEAD, 'Head', [], { isHead: true })]);
    const view = await mount(data, {
      getCommitDetails: () => {
        throw new Error('row load failed');
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByText('row load failed')).toBeTruthy());
  });
});
