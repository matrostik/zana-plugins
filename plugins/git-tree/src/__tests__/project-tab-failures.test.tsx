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

async function mount(rpcOverrides: Record<string, unknown> = {}) {
  const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
  const data = graph();
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

describe('GitTreeProjectTab failure paths', () => {
  it('shows a retry state when the graph itself fails to load', async () => {
    const view = await mount({
      loadGraph: () => {
        throw new Error('graph exploded');
      }
    });
    await waitFor(() => expect(view.getByText('Failed to load Git Tree: graph exploded')).toBeTruthy());
    fireEvent.click(view.getByText('Retry'));
    await waitFor(() => expect(view.getByText('Failed to load Git Tree: graph exploded')).toBeTruthy());
  });

  it('shows a banner when a two-commit comparison fails', async () => {
    const view = await mount({
      compareCommits: () => {
        throw new Error('compare failed');
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-bbbb111'), { ctrlKey: true });
    await waitFor(() => expect(view.getByText('compare failed')).toBeTruthy());
  });

  it('reloads the graph when a git-tree change event is published', async () => {
    const loads: number[] = [];
    const view = await mount({
      loadGraph: () => {
        loads.push(1);
        return graph();
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    const before = loads.length;
    await view.emitRealtime('git-tree:changed', { projectId: 'proj-1' });
    await waitFor(() => expect(loads.length).toBeGreaterThan(before));
  });

  it('shows the empty-state message when discovery returns no repositories', async () => {
    const view = await mount({
      discoverRepos: () => ({ repos: [], globalSettings: graph().globalSettings })
    });
    await waitFor(() => expect(view.getByText('No Git repositories found in this project.')).toBeTruthy());
  });
});

describe('GitTreeProjectTab saved column widths', () => {
  it('double-clicking a date resizer persists the default width for that column', async () => {
    const saves: Array<{ columnWidths?: Record<string, unknown> }> = [];
    const data = graph();
    const saved = {
      ...data,
      globalSettings: { ...data.globalSettings, columnWidths: { description: 300, date: 120, author: 140, commit: 90 } }
    } as LoadGraphDataResult;
    const view = await mount({
      loadGraph: () => saved,
      discoverRepos: () => ({ repos: [saved.repo], globalSettings: saved.globalSettings }),
      updateGlobalSettings: (args: { patch: { columnWidths: Record<string, unknown> } }) => {
        saves.push(args.patch);
        return { ok: true };
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    fireEvent.doubleClick(view.getByTestId('gg-col-resizer-date'));
    await waitFor(() => expect(saves.length).toBe(1));
    expect(saves[0].columnWidths).toMatchObject({ date: 125 });
    expect(saves[0].columnWidths).toHaveProperty('author');
    expect(saves[0].columnWidths).toHaveProperty('commit');
  });

  it('double-clicking the description resizer removes its saved width', async () => {
    const saves: Array<{ columnWidths?: Record<string, unknown> }> = [];
    const data = graph();
    const saved = {
      ...data,
      globalSettings: { ...data.globalSettings, columnWidths: { description: 300, date: 120, author: 140, commit: 90 } }
    } as LoadGraphDataResult;
    const view = await mount({
      loadGraph: () => saved,
      discoverRepos: () => ({ repos: [saved.repo], globalSettings: saved.globalSettings }),
      updateGlobalSettings: (args: { patch: { columnWidths: Record<string, unknown> } }) => {
        saves.push(args.patch);
        return { ok: true };
      }
    });
    await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
    fireEvent.doubleClick(view.getByTestId('gg-col-resizer-description'));
    await waitFor(() => expect(saves.length).toBe(1));
    expect(saves[0].columnWidths).not.toHaveProperty('description');
    expect(saves[0].columnWidths).toHaveProperty('date');
  });
});
