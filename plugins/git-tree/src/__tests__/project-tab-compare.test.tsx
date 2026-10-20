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

const details = (hash: string, parents: string[]) =>
  ({
    hash,
    abbreviatedHash: hash.slice(0, 7),
    parents,
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
        details: details(args?.commitHash ?? HEAD, [BASE]),
        codeReview: null
      }),
      compareCommits: (args: { fromHash: string; toHash: string }) => ({
        comparison: {
          fromHash: args.fromHash,
          toHash: args.toHash,
          fileChanges: [{ oldPath: 'a.ts', newPath: 'a.ts', status: 'M', additions: 2, deletions: 1 }]
        },
        codeReview: null
      }),
      getFileDiff: () => ({ filePath: 'a.ts', commitHash: HEAD, isBinary: false, rawDiff: '', hunks: [] }),
      draftAgentAboutCommit: () => ({ ok: true, prompt: 'p', title: 't' }),
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

describe('GitTreeProjectTab comparison and navigation', () => {
  it('compares two commits with a Ctrl-click and clears the comparison on a plain click', async () => {
    const compares: unknown[] = [];
    const view = await mount({
      compareCommits: (args: { fromHash: string; toHash: string }) => {
        compares.push(args);
        return {
          comparison: { fromHash: args.fromHash, toHash: args.toHash, fileChanges: [] },
          codeReview: null
        };
      }
    });
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-commit-row-bbbb111'), { ctrlKey: true });
    await waitFor(() => expect(compares.length).toBeGreaterThan(0));
    expect(view.container.textContent).toContain('Comparing');
    fireEvent.click(view.getByTestId('gg-commit-row-bbbb111'));
    await waitFor(() => expect(view.container.textContent).not.toContain('Comparing'));
  });

  it('jumps to a parent commit from the metadata link', async () => {
    const view = await mount({
      getCommitDetails: (args: { commitHash?: string }) => ({
        details: details(args?.commitHash ?? HEAD, [BASE]),
        codeReview: null
      })
    });
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-details-pane')).toBeTruthy());
    const link = view.container.querySelector('.gg-parent-link') as HTMLElement;
    fireEvent.click(link);
    await waitFor(() => expect(view.container.querySelector('.gg-details-pane')).toBeTruthy());
  });

  it('asks the agent about a single changed file from the diff pane', async () => {
    const drafts: unknown[] = [];
    const view = await mount({
      draftAgentAboutCommit: (args: unknown) => {
        drafts.push(args);
        return { ok: true, prompt: 'p', title: 't' };
      }
    });
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-file-row-a.ts')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-file-row-a.ts'));
    await waitFor(() => expect(view.getByTestId('gg-diff-viewer')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-ask-agent-btn'));
    await waitFor(() => expect(drafts.length).toBeGreaterThan(0));
    expect(drafts[0]).toMatchObject({ commitHash: HEAD, filePath: 'a.ts' });
  });
});
