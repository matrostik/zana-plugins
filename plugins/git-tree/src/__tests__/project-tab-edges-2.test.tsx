// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';
import type { LoadGraphDataResult } from '../server/types.js';

const HEAD = 'aaaa111122223333444455556666777788889999';
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

function graph(): LoadGraphDataResult {
  return {
    repo: { relPath: '', label: 'Project Root', currentBranch: 'main', headHash: HEAD, isWorktree: false },
    commits: [commit(HEAD, 'Head', [BASE], { isHead: true }), commit(BASE, 'Base', [])],
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

async function mount() {
  const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
  const data = graph();
  const view = renderSlot(registrations.projectTabs[0], { pluginId: 'git-tree', projectId: 'proj-1' }, {
    panelAgent: true,
    context: { projectId: 'proj-1' },
    rpc: {
      discoverRepos: () => ({ repos: [data.repo], globalSettings: data.globalSettings }),
      loadGraph: () => data,
      getCommitDetails: () => ({
        details: { hash: HEAD, abbreviatedHash: 'x', parents: [BASE], authorName: 'A', authorEmail: 'a@x', authorDate: 1, committerName: 'A', committerEmail: 'a@x', commitDate: 1, subject: 'S', body: '', fileChanges: [] },
        codeReview: null
      })
    } as never
  });
  views.push(view);
  await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
  return view;
}

afterEach(() => {
  views.forEach((v) => v.unmount());
  views = [];
  cleanup();
  vi.restoreAllMocks();
});

describe('GitTreeProjectTab keyboard edges', () => {
  it('keeps the first commit selected when ArrowUp is pressed at the top', async () => {
    const view = await mount();
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    const root = view.getByTestId('gg-project-tab');
    fireEvent.keyDown(root, { key: 'ArrowUp' });
    fireEvent.keyDown(root, { key: 'ArrowUp' });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111').className).toContain('selected'));
  });

  it('keeps the last commit selected when ArrowDown is pressed at the bottom', async () => {
    const view = await mount();
    fireEvent.click(view.getByTestId('gg-commit-row-bbbb111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    const root = view.getByTestId('gg-project-tab');
    fireEvent.keyDown(root, { key: 'ArrowDown' });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-bbbb111').className).toContain('selected'));
  });

  it('closes an open context menu first when Escape is pressed', async () => {
    const view = await mount();
    fireEvent.contextMenu(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByText('Copy Commit Hash')).toBeTruthy());
    fireEvent.keyDown(view.getByTestId('gg-project-tab'), { key: 'Escape' });
    await waitFor(() => expect(view.queryByText('Copy Commit Hash')).toBeNull());
  });
});

describe('GitTreeProjectTab dialog escape', () => {
  it('closes an open git action dialog when Escape is pressed', async () => {
    const view = await mount();
    fireEvent.click(view.getByText('⬆ Push'));
    await waitFor(() => expect(view.getByText('Push Branch main')).toBeTruthy());
    fireEvent.keyDown(view.getByTestId('gg-project-tab'), { key: 'Escape' });
    await waitFor(() => expect(view.queryByText('Push Branch main')).toBeNull());
  });
});

describe('GitTreeProjectTab find escape', () => {
  it('closes the find bar when Escape is pressed', async () => {
    const view = await mount();
    fireEvent.keyDown(view.getByTestId('gg-project-tab'), { key: 'f', ctrlKey: true });
    await waitFor(() => expect(view.getByTestId('gg-find-widget')).toBeTruthy());
    fireEvent.keyDown(view.getByTestId('gg-project-tab'), { key: 'Escape' });
    await waitFor(() => expect(view.queryByTestId('gg-find-widget')).toBeNull());
  });
});

describe('GitTreeProjectTab scroll to HEAD', () => {
  it('ignores Ctrl+H when HEAD is not among the loaded commits', async () => {
    const data = graph();
    const headless = { ...data, headHash: 'ffff111122223333444455556666777788889999' } as LoadGraphDataResult;
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const view = renderSlot(registrations.projectTabs[0], { pluginId: 'git-tree', projectId: 'proj-1' }, {
      panelAgent: true,
      context: { projectId: 'proj-1' },
      rpc: {
        discoverRepos: () => ({ repos: [headless.repo], globalSettings: headless.globalSettings }),
        loadGraph: () => headless,
        getCommitDetails: () => ({
          details: { hash: HEAD, abbreviatedHash: 'x', parents: [BASE], authorName: 'A', authorEmail: 'a@x', authorDate: 1, committerName: 'A', committerEmail: 'a@x', commitDate: 1, subject: 'S', body: '', fileChanges: [] },
          codeReview: null
        })
      } as never
    });
    views.push(view);
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    fireEvent.keyDown(view.getByTestId('gg-project-tab'), { key: 'h', ctrlKey: true });
    expect(view.queryByTestId('gg-details-pane')).toBeNull();
  });
});
