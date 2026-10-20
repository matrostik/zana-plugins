// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function graph(location: 'inline' | 'docked'): LoadGraphDataResult {
  return {
    repo: { relPath: '', label: 'Project Root', currentBranch: 'main', headHash: HEAD, isWorktree: false },
    commits: [
      commit(TOP, 'Needle top', [HEAD]),
      commit(HEAD, 'Head', [BASE], { isHead: true }),
      commit(BASE, 'Needle base', [])
    ],
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
      commitDetailsLocation: location,
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

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  constructor(public cb: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

let views: Array<{ unmount(): void }> = [];

async function mount(location: 'inline' | 'docked', rpcOverrides: Record<string, unknown> = {}) {
  const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
  const data = graph(location);
  const view = renderSlot(registrations.projectTabs[0], { pluginId: 'git-tree', projectId: 'proj-1' }, {
    panelAgent: true,
    context: { projectId: 'proj-1' },
    rpc: {
      discoverRepos: () => ({ repos: [data.repo], globalSettings: data.globalSettings }),
      loadGraph: () => data,
      getCommitDetails: (args: { commitHash?: string }) => ({
        details: { hash: args?.commitHash ?? HEAD, abbreviatedHash: 'x', parents: [BASE], authorName: 'A', authorEmail: 'a@x', authorDate: 1, committerName: 'A', committerEmail: 'a@x', commitDate: 1, subject: 'S', body: '', fileChanges: [] },
        codeReview: null
      }),
      ...rpcOverrides
    } as never
  });
  views.push(view);
  await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
  return view;
}

beforeEach(() => {
  FakeResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterEach(() => {
  views.forEach((v) => v.unmount());
  views = [];
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GitTreeProjectTab inline details layout', () => {
  it('renders the inline details wrapper under the selected row and tracks its size', async () => {
    const view = await mount('inline');
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.container.querySelector('.gg-inline-details-wrapper')).toBeTruthy());
    expect(FakeResizeObserver.instances.length).toBeGreaterThan(0);
    FakeResizeObserver.instances.forEach((ro) => ro.cb());
    expect(view.container.querySelector('.gg-inline-details-wrapper')).toBeTruthy();
  });

  it('shows the inline details for a Ctrl-compared row', async () => {
    const view = await mount('inline', {
      compareCommits: (args: { fromHash: string; toHash: string }) => ({
        comparison: { fromHash: args.fromHash, toHash: args.toHash, fileChanges: [] },
        codeReview: null
      })
    });
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.container.querySelector('.gg-inline-details-wrapper')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-bbbb111'), { ctrlKey: true });
    await waitFor(() => expect(view.container.textContent).toContain('Comparing'));
  });

  it('keeps the docked layout when inline details are not selected', async () => {
    const view = await mount('docked');
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    expect(view.container.querySelector('.gg-inline-details-wrapper')).toBeNull();
  });
});

describe('GitTreeProjectTab find navigation', () => {
  it('moves between matches with the find widget next and previous buttons', async () => {
    const view = await mount('docked');
    fireEvent.keyDown(view.getByTestId('gg-project-tab'), { key: 'f', ctrlKey: true });
    const input = await waitFor(() => view.getByTestId('gg-find-input'));
    fireEvent.change(input, { target: { value: 'Needle' } });
    fireEvent.click(view.getByTestId('gg-find-next'));
    fireEvent.click(view.getByTestId('gg-find-next'));
    fireEvent.click(view.getByTestId('gg-find-prev'));
    await waitFor(() => expect(view.getByTestId('gg-find-widget')).toBeTruthy());
  });

  it('does nothing on next or previous when a query matches no commit', async () => {
    const view = await mount('docked');
    fireEvent.keyDown(view.getByTestId('gg-project-tab'), { key: 'f', ctrlKey: true });
    const input = await waitFor(() => view.getByTestId('gg-find-input'));
    fireEvent.change(input, { target: { value: 'zzz-no-match' } });
    fireEvent.click(view.getByTestId('gg-find-next'));
    fireEvent.click(view.getByTestId('gg-find-prev'));
    await waitFor(() => expect(view.getByTestId('gg-find-widget')).toBeTruthy());
  });
});

describe('GitTreeProjectTab graph node states', () => {
  it('highlights the selected node and mutes non-ancestors when enabled', async () => {
    const data = graph('docked');
    const muted = { ...data, globalSettings: { ...data.globalSettings, muteNonAncestors: true } } as LoadGraphDataResult;
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const view = renderSlot(registrations.projectTabs[0], { pluginId: 'git-tree', projectId: 'proj-1' }, {
      panelAgent: true,
      context: { projectId: 'proj-1' },
      rpc: {
        discoverRepos: () => ({ repos: [muted.repo], globalSettings: muted.globalSettings }),
        loadGraph: () => muted,
        getCommitDetails: () => ({
          details: { hash: HEAD, abbreviatedHash: 'x', parents: [BASE], authorName: 'A', authorEmail: 'a@x', authorDate: 1, committerName: 'A', committerEmail: 'a@x', commitDate: 1, subject: 'S', body: '', fileChanges: [] },
          codeReview: null
        })
      } as never
    });
    views.push(view);
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    expect(view.getByTestId('gg-commit-row-aaaa111').className).toContain('selected');
  });

  it('keeps the table header in step when the graph is scrolled horizontally', async () => {
    const view = await mount('docked');
    const scroller = view.container.querySelector('.gg-table-scroll') as HTMLElement;
    Object.defineProperty(scroller, 'scrollLeft', { configurable: true, value: 40, writable: true });
    fireEvent.scroll(scroller);
    await waitFor(() => expect(scroller.scrollLeft).toBe(40));
    fireEvent.scroll(scroller);
  });
});
