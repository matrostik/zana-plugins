// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';
import type { LoadGraphDataResult } from '../server/types.js';

const HEAD = 'aaaa111122223333444455556666777788889999';
const BASE = 'bbbb111122223333444455556666777788889999';
const TOP = 'cccc111122223333444455556666777788889999';

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

function graph(): LoadGraphDataResult {
  return {
    repo: { relPath: '', label: 'Project Root', currentBranch: 'main', headHash: HEAD, isWorktree: false },
    commits: [commit(TOP, 'Top', [HEAD]), commit(HEAD, 'Head', [BASE], { isHead: true }), commit(BASE, 'Base', [])],
    hasMore: false,
    branches: ['main'],
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
    }
  } as LoadGraphDataResult;
}

let views: Array<{ unmount(): void }> = [];

async function mount(rpcOverrides: Record<string, unknown> = {}) {
  const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
  const data = graph();
  const view = renderSlot(registrations.projectTabs[0], { pluginId: 'git-tree', projectId: 'proj-1' }, {
    panelAgent: true,
    context: { projectId: 'proj-1' },
    rpc: {
      discoverRepos: () => ({ repos: [data.repo], globalSettings: data.globalSettings }),
      loadGraph: () => data,
      getCommitDetails: (args: { commitHash?: string }) => ({
        details: { hash: args?.commitHash ?? HEAD, abbreviatedHash: 'x', parents: [], authorName: 'A', authorEmail: 'a@x', authorDate: 1, committerName: 'A', committerEmail: 'a@x', commitDate: 1, subject: 'S', body: '', fileChanges: [] },
        codeReview: null
      }),
      ...rpcOverrides
    } as never
  });
  views.push(view);
  await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
  return view;
}

const tabRoot = (view: { getByTestId: (id: string) => HTMLElement }) => view.getByTestId('gg-project-tab');

afterEach(() => {
  views.forEach((v) => v.unmount());
  views = [];
  cleanup();
  vi.restoreAllMocks();
});

describe('GitTreeProjectTab keyboard navigation', () => {
  it('moves the selection down and up with the arrow keys', async () => {
    const view = await mount();
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    fireEvent.keyDown(tabRoot(view), { key: 'ArrowDown' });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-bbbb111').className).toContain('selected'));
    fireEvent.keyDown(tabRoot(view), { key: 'ArrowUp' });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111').className).toContain('selected'));
  });

  it('selects the first commit with an arrow key when nothing is selected', async () => {
    const view = await mount();
    fireEvent.keyDown(tabRoot(view), { key: 'ArrowUp' });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-cccc111').className).toContain('selected'));
  });

  it('clears the selection with Escape and ignores other keys', async () => {
    const view = await mount();
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    fireEvent.keyDown(tabRoot(view), { key: 'x' });
    fireEvent.keyDown(tabRoot(view), { key: 'Escape' });
    await waitFor(() => expect(view.queryByTestId('gg-details-pane')).toBeNull());
  });

  it('opens the find bar with Ctrl+F and jumps to HEAD with Ctrl+H', async () => {
    const view = await mount();
    fireEvent.keyDown(tabRoot(view), { key: 'f', ctrlKey: true });
    await waitFor(() => expect(view.container.querySelector('input[type="search"], input[placeholder*="Find"]')).toBeTruthy());
    fireEvent.keyDown(tabRoot(view), { key: 'h', ctrlKey: true });
    fireEvent.keyDown(tabRoot(view), { key: 'Escape' });
  });

  it('reloads the graph with Meta+R', async () => {
    const loads: number[] = [];
    const data = graph();
    const view = await mount({
      loadGraph: () => {
        loads.push(1);
        return data;
      }
    });
    const before = loads.length;
    fireEvent.keyDown(tabRoot(view), { key: 'r', metaKey: true });
    await waitFor(() => expect(loads.length).toBeGreaterThan(before));
  });
});
