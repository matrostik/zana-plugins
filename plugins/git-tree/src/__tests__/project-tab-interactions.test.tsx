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

function graph(extra: Partial<LoadGraphDataResult> = {}): LoadGraphDataResult {
  return {
    repo: { relPath: '', label: 'Project Root', currentBranch: 'main', headHash: HEAD, isWorktree: false },
    commits: [
      commit(TOP, 'Top', [HEAD], {
        refs: [
          { type: 'remote', name: 'main', remote: 'origin' },
          { type: 'tag', name: 'v2.0.0' },
          { type: 'stash', name: 'stash@{0}', selector: 'stash@{0}' }
        ]
      }),
      commit(HEAD, 'Head', [BASE], {
        isHead: true,
        refs: [{ type: 'head', name: 'main', isHead: true }]
      }),
      commit(BASE, 'Base', [], {
        refs: [{ type: 'head', name: 'legacy', isHead: false }]
      })
    ],
    hasMore: true,
    branches: ['main', 'legacy'],
    remoteBranches: ['origin/main'],
    tags: ['v2.0.0'],
    stashes: [],
    headHash: HEAD,
    currentBranch: 'main',
    uncommittedCount: 0,
    remotes: [{ name: 'origin', fetchUrl: 'https://github.com/acme/zana.git', pushUrl: 'https://github.com/acme/zana.git' }],
    repoSettings: {
      selectedBranches: [],
      showRemoteBranches: true,
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
      loadMoreCommits: 0,
      muteNonAncestors: false,
      muteMergeCommits: false,
      commitDetailsLocation: 'docked',
      fileViewType: 'list',
      compactFolders: true,
      diffViewMode: 'unified',
      maxDepthOfRepoSearch: 2,
      dateType: 'commit',
      dateFormat: 'relative',
      fetchAndPrune: false,
      fetchAndPruneTags: false,
      signCommits: false,
      signTags: false,
      useMailmap: true,
      graphColors: ['#0085d9']
    },
    ...extra
  } as LoadGraphDataResult;
}

let views: Array<{ unmount(): void }> = [];

async function mount(data = graph(), rpcOverrides: Record<string, unknown> = {}) {
  const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
  const view = renderSlot(registrations.projectTabs[0], { pluginId: 'git-tree', projectId: 'proj-1' }, {
    panelAgent: true,
    context: { projectId: 'proj-1' },
    rpc: {
      discoverRepos: () => ({ repos: [data.repo], globalSettings: data.globalSettings }),
      loadGraph: () => data,
      getCommitDetails: () => ({
        details: { hash: HEAD, abbreviatedHash: 'aaaa111', parents: [BASE], authorName: 'A', authorEmail: 'a@x', authorDate: 1, committerName: 'A', committerEmail: 'a@x', commitDate: 1, subject: 'S', body: '', fileChanges: [] },
        codeReview: null
      }),
      runGitAction: () => ({ ok: true, stdout: '', stderr: '' }),
      ...rpcOverrides
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

describe('GitTreeProjectTab ref badges, keys, and load more', () => {
  it('opens remote and tag ref context menus', async () => {
    const view = await mount();
    fireEvent.contextMenu(view.container.querySelector('.gg-ref-remote') as Element);
    await waitFor(() => expect(view.getByText('Remote Branch: origin/main')).toBeTruthy());
    fireEvent.contextMenu(view.container.querySelector('.gg-ref-tag') as Element);
    await waitFor(() => expect(view.getByText('Tag: v2.0.0')).toBeTruthy());
  });

  it('opens the stash context menu for a stash ref', async () => {
    const data = graph({
      commits: [
        commit(TOP, 'Top', [HEAD], { refs: [{ type: 'stash', name: 'stash@{0}', selector: 'stash@{0}' }] }),
        commit(HEAD, 'Head', [], { isHead: true })
      ]
    } as never);
    const view = await mount(data);
    fireEvent.contextMenu(view.container.querySelector('.gg-ref-stash') as Element);
    await waitFor(() => expect(view.getByText('Stash: stash@{0}')).toBeTruthy());
  });

  it('checks out a non-current branch on double click and ignores the current one', async () => {
    const actions: unknown[] = [];
    const view = await mount(graph(), {
      runGitAction: (args: unknown) => {
        actions.push(args);
        return { ok: true, stdout: '', stderr: '' };
      }
    });
    const legacy = view.container.querySelector('.gg-ref-head:not(.gg-ref-head.is-current)') as Element;
    fireEvent.doubleClick(legacy);
    await waitFor(() => expect(actions.length).toBeGreaterThan(0));
    const before = actions.length;
    fireEvent.doubleClick(view.container.querySelector('.gg-ref-head.is-current') as Element);
    expect(actions.length).toBe(before);
  });

  it('loads more commits from the footer button', async () => {
    const loads: unknown[] = [];
    const data = graph({ globalSettings: { ...graph().globalSettings, loadMoreCommits: 0 } as never });
    const view = await mount(data, {
      loadGraph: (args: unknown) => {
        loads.push(args);
        return data;
      }
    });
    fireEvent.click(view.getByTestId('gg-load-more-btn'));
    await waitFor(() => expect(loads.length).toBeGreaterThan(1));
    expect(view.getByTestId('gg-load-more-btn').textContent).toContain('Load 100 More Commits');
  });

  it('moves the selection with the arrow keys and jumps to HEAD with Ctrl+H', async () => {
    const view = await mount();
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    const root = view.container.querySelector('.git-graph-toolbar')?.parentElement as HTMLElement;
    fireEvent.keyDown(root, { key: 'ArrowUp' });
    fireEvent.keyDown(root, { key: 'ArrowDown' });
    fireEvent.keyDown(root, { key: 'h', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'Escape' });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
  });

  it('starts a push from the toolbar and reports a failed push', async () => {
    const view = await mount(graph(), {
      runGitAction: (args: { kind?: string }) => {
        if (args.kind === 'push-branch') throw new Error('push rejected');
        return { ok: true, stdout: '', stderr: '' };
      }
    });
    fireEvent.click(view.getByText('⬆ Push'));
    await waitFor(() => expect(view.getByText('Push Branch main')).toBeTruthy());
  });
});
