// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';
import type { LoadGraphDataResult } from '../server/types.js';

const HEAD = 'aaaa111122223333444455556666777788889999';
const OTHER = 'bbbb111122223333444455556666777788889999';

function graph(): LoadGraphDataResult {
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
      commit(HEAD, 'Head commit', [OTHER], {
        refs: [
          { type: 'head', name: 'main', isHead: true },
          { type: 'tag', name: 'v1.0.0' }
        ],
        isHead: true
      }),
      commit(OTHER, 'Older commit', [])
    ],
    hasMore: false,
    branches: ['main'],
    remoteBranches: [],
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
    }
  } as LoadGraphDataResult;
}

const details = (hash: string) =>
  ({
    hash,
    abbreviatedHash: hash.slice(0, 7),
    parents: [OTHER],
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    authorDate: 1,
    committerName: 'Alice',
    committerEmail: 'alice@example.com',
    commitDate: 1,
    subject: 'Head commit',
    body: '',
    fileChanges: [{ oldPath: 'a.ts', newPath: 'a.ts', status: 'M', additions: 1, deletions: 0 }]
  }) as never;

async function mount(rpcOverrides: Record<string, unknown> = {}) {
  const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
  const data = graph();
  const rpc: Record<string, unknown> = {
    discoverRepos: () => ({ repos: [data.repo], globalSettings: data.globalSettings }),
    loadGraph: () => data,
    getCommitDetails: (args: { commitHash?: string }) => ({
      details: details(args?.commitHash ?? HEAD),
      codeReview: null
    }),
    getFileDiff: () => ({ filePath: 'a.ts', commitHash: HEAD, isBinary: false, rawDiff: 'd', hunks: [] }),
    ...rpcOverrides
  };
  const view = renderSlot(registrations.projectTabs[0], { pluginId: 'git-tree', projectId: 'proj-1' }, {
    panelAgent: true,
    context: { projectId: 'proj-1' },
    rpc: rpc as never
  });
  await waitFor(() => expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy());
  views.push(view);
  return view;
}

function clickMenu(view: Awaited<ReturnType<typeof mount>>, row: string, label: RegExp | string) {
  fireEvent.contextMenu(view.getByTestId(row));
  fireEvent.click(view.getByText(label));
}

let views: Array<{ unmount(): void }> = [];

afterEach(() => {
  views.forEach((v) => v.unmount());
  views = [];
  cleanup();
  vi.restoreAllMocks();
});

describe('GitTreeProjectTab context menu actions', () => {
  it('copies the commit hash and subject through the clipboard', async () => {
    const writes: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (t: string) => void writes.push(t) }
    });
    const view = await mount();
    clickMenu(view, 'gg-commit-row-aaaa111', 'Copy Commit Hash');
    await waitFor(() => expect(view.getByText('Commit hash copied to clipboard.')).toBeTruthy());
    clickMenu(view, 'gg-commit-row-aaaa111', 'Copy Commit Subject');
    await waitFor(() => expect(view.getByText('Commit subject copied to clipboard.')).toBeTruthy());
    expect(writes).toContain(HEAD);
  });

  it('reports a failed clipboard write for an empty value', async () => {
    const view = await mount();
    clickMenu(view, 'gg-commit-row-aaaa111', 'Copy Commit Subject');
    await waitFor(() => expect(view.container.textContent).toMatch(/copied|Nothing to copy|Could not copy/));
    view.unmount();
  });

  it('shows tag details from the tag context menu', async () => {
    const tagCalls: unknown[] = [];
    const view = await mount({
      getTagDetails: (args: unknown) => {
        tagCalls.push(args);
        return {
          name: 'v1.0.0',
          hash: HEAD,
          isAnnotated: true,
          taggerName: 'Alice',
          taggerEmail: 'alice@example.com',
          message: 'Release 1.0'
        };
      }
    });
    fireEvent.contextMenu(view.container.querySelector('.gg-ref-tag') as Element);
    fireEvent.click(view.getByText(/View Tag Details/));
    await waitFor(() => expect(tagCalls.length).toBeGreaterThan(0));
  });

  it('surfaces a tag-details failure in the banner', async () => {
    const view = await mount({
      getTagDetails: () => {
        throw new Error('tag lookup failed');
      }
    });
    fireEvent.contextMenu(view.container.querySelector('.gg-ref-tag') as Element);
    fireEvent.click(view.getByText(/View Tag Details/));
    await waitFor(() => expect(view.getByText('tag lookup failed')).toBeTruthy());
    view.unmount();
  });

  it('starts, toggles, and ends a code review for the selected commit', async () => {
    const seen: string[] = [];
    const review = (reviewedFiles: string[]) => ({
      key: 'proj-1::single:aaaa111',
      projectId: 'proj-1',
      subRepoRelPath: '',
      fromHash: null,
      toHash: HEAD,
      reviewedFiles,
      startedAt: 1,
      lastActiveAt: 2
    });
    const view = await mount({
      getCommitDetails: () => ({ details: details(HEAD), codeReview: null }),
      codeReviewStart: () => {
        seen.push('start');
        return review([]);
      },
      codeReviewToggleFile: (args: { reviewed: boolean }) => {
        seen.push(`toggle:${args.reviewed}`);
        return review(args.reviewed ? ['a.ts'] : []);
      },
      codeReviewEnd: () => {
        seen.push('end');
        return { ok: true };
      }
    });
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-start-review-btn')).toBeTruthy());
    fireEvent.click(view.getByTestId('gg-start-review-btn'));
    await waitFor(() => expect(view.getByTestId('gg-end-review-btn')).toBeTruthy());
    const box = view.container.querySelector('.gg-file-row input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(box);
    await waitFor(() => expect(seen).toContain('toggle:true'));
    fireEvent.click(view.getByTestId('gg-end-review-btn'));
    await waitFor(() => expect(seen).toContain('end'));
    expect(seen[0]).toBe('start');
  });

  it('reports a failed review toggle through the banner', async () => {
    const view = await mount({
      getCommitDetails: () => ({
        details: details(HEAD),
        codeReview: {
          key: 'k',
          projectId: 'proj-1',
          subRepoRelPath: '',
          fromHash: null,
          toHash: HEAD,
          reviewedFiles: [],
          startedAt: 1,
          lastActiveAt: 1
        }
      }),
      codeReviewToggleFile: () => {
        throw new Error('toggle failed');
      }
    });
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => expect(view.getByTestId('gg-end-review-btn')).toBeTruthy());
    const box = view.container.querySelector('.gg-file-row input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(box);
    await waitFor(() => expect(view.getByText('toggle failed')).toBeTruthy());
  });

  it('opens a pull request for the current branch in a new window', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const view = await mount({
      buildPullRequestUrl: () => ({ url: 'https://github.com/acme/zana/compare/main...feature' })
    });
    fireEvent.contextMenu(view.container.querySelector('.gg-ref-head') as Element);
    fireEvent.click(view.getByText(/Create Pull Request/));
    await waitFor(() => expect(open).toHaveBeenCalled());
  });

  it('explains when no pull request URL can be derived', async () => {
    const view = await mount({
      buildPullRequestUrl: () => ({ url: null })
    });
    fireEvent.contextMenu(view.container.querySelector('.gg-ref-head') as Element);
    fireEvent.click(view.getByText(/Create Pull Request/));
    await waitFor(() =>
      expect(view.getByText('Could not derive a Pull Request URL from the configured remote.')).toBeTruthy()
    );
    view.unmount();
  });
});

describe('GitTreeProjectTab settings and agent flows', () => {
  it('shows an error when a global settings update is rejected', async () => {
    const view = await mount({
      updateGlobalSettings: () => {
        throw new Error('settings rejected');
      }
    });
    fireEvent.click(view.getByTitle('Toggle rounded or angular graph lines'));
    await waitFor(() => expect(view.getByText('settings rejected')).toBeTruthy());
  });

  it('shows an error when a repo settings update is rejected', async () => {
    const view = await mount({
      updateRepoSettings: () => {
        throw new Error('repo settings rejected');
      }
    });
    fireEvent.change(view.getAllByLabelText('Commit ordering')[0], { target: { value: 'topo' } });
    await waitFor(() => expect(view.getByText('repo settings rejected')).toBeTruthy());
  });

  it('opens an agent draft from the commit menu and reports the side-panel result', async () => {
    const drafts: unknown[] = [];
    const view = await mount({
      draftAgentAboutCommit: (args: unknown) => {
        drafts.push(args);
        return { ok: true, prompt: 'Explain', title: 'Git Tree: aaaa111' };
      }
    });
    clickMenu(view, 'gg-commit-row-aaaa111', /Ask Agent about Commit/);
    await waitFor(() => expect(drafts.length).toBe(1));
    expect(view.container.textContent).toMatch(/Draft opened in side panel|Preparing agent draft/);
  });

  it('reports an error when the agent draft cannot be prepared', async () => {
    const view = await mount({
      draftAgentAboutCommit: () => {
        throw new Error('draft unavailable');
      }
    });
    clickMenu(view, 'gg-commit-row-aaaa111', /Ask Agent about Commit/);
    await waitFor(() => expect(view.getByText('draft unavailable')).toBeTruthy());
  });
});
