// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor, render } from '@testing-library/react';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';
import { CommitDetailsPane } from '../app/components/CommitDetailsPane.js';
import type {
  GitCommitComparison,
  GitCommitDetails,
  GitFileChange,
  GitFileDiff,
  LoadGraphDataResult
} from '../server/types.js';

function makeSampleGraphData(): LoadGraphDataResult {
  return {
    repo: {
      relPath: '',
      label: 'Project Root',
      currentBranch: 'main',
      headHash: 'aaaa111122223333444455556666777788889999',
      isWorktree: false
    },
    commits: [
      {
        hash: '*',
        abbreviatedHash: '*',
        parents: ['aaaa111122223333444455556666777788889999'],
        authorName: '*',
        authorEmail: '',
        authorDate: 1700000100,
        committerName: '*',
        committerEmail: '',
        commitDate: 1700000100,
        subject: 'Uncommitted Changes (1)',
        refs: [],
        isUncommitted: true
      },
      {
        hash: 'ssss111122223333444455556666777788889999',
        abbreviatedHash: 'ssss111',
        parents: ['aaaa111122223333444455556666777788889999'],
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        authorDate: 1700000080,
        committerName: 'Alice',
        committerEmail: 'alice@example.com',
        commitDate: 1700000080,
        subject: 'WIP on main',
        refs: [{ type: 'stash', name: 'stash@{0}', selector: 'stash@{0}' }],
        isStash: true,
        stashSelector: 'stash@{0}'
      },
      {
        hash: 'aaaa111122223333444455556666777788889999',
        abbreviatedHash: 'aaaa111',
        parents: ['bbbb111122223333444455556666777788889999'],
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        authorDate: 1700000050,
        committerName: 'Alice',
        committerEmail: 'alice@example.com',
        commitDate: 1700000050,
        subject: ':sparkles: Add `GitGraph` feature #12',
        refs: [
          { type: 'head', name: 'main', isHead: true },
          { type: 'remote', name: 'main', remote: 'origin' },
          { type: 'tag', name: 'v1.0.0' }
        ],
        isHead: true
      },
      {
        hash: 'bbbb111122223333444455556666777788889999',
        abbreviatedHash: 'bbbb111',
        parents: [],
        authorName: 'Bob',
        authorEmail: 'bob@example.com',
        authorDate: 1700000000,
        committerName: 'Bob',
        committerEmail: 'bob@example.com',
        commitDate: 1700000000,
        subject: 'Initial commit',
        refs: [{ type: 'head', name: 'legacy', isHead: false }]
      }
    ],
    hasMore: true,
    branches: ['main', 'legacy'],
    remoteBranches: ['origin/main'],
    tags: ['v1.0.0'],
    stashes: [
      {
        selector: 'stash@{0}',
        hash: 'ssss111122223333444455556666777788889999',
        subject: 'WIP on main',
        baseHash: 'aaaa111122223333444455556666777788889999'
      }
    ],
    headHash: 'aaaa111122223333444455556666777788889999',
    currentBranch: 'main',
    uncommittedCount: 1,
    remotes: [
      {
        name: 'origin',
        fetchUrl: 'https://github.com/acme/zana.git',
        pushUrl: 'https://github.com/acme/zana.git'
      }
    ],
    repoSettings: {
      selectedBranches: [],
      showRemoteBranches: true,
      showStashes: true,
      showTags: true,
      showUncommittedChanges: true,
      showUntrackedFiles: true,
      onlyFollowFirstParent: false,
      commitOrdering: 'date',
      issueLinkingRules: [
        {
          id: 'gh',
          pattern: '#(\\d+)',
          urlTemplate: 'https://github.com/acme/zana/issues/$1'
        }
      ],
      pullRequestConfig: {
        provider: 'github',
        remoteName: 'origin',
        targetBranch: 'main'
      }
    },
    globalSettings: {
      graphStyle: 'rounded',
      initialLoadCommits: 300,
      loadMoreCommits: 100,
      muteNonAncestors: false,
      muteMergeCommits: false,
      commitDetailsLocation: 'docked',
      fileViewType: 'tree',
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
      graphColors: ['#0085d9', '#d9008f']
    }
  };
}

function makeSampleDetails(): GitCommitDetails {
  return {
    hash: 'aaaa111122223333444455556666777788889999',
    abbreviatedHash: 'aaaa111',
    parents: ['bbbb111122223333444455556666777788889999'],
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    authorDate: 1700000050,
    committerName: 'Alice',
    committerEmail: 'alice@example.com',
    commitDate: 1700000050,
    subject: ':sparkles: Add `GitGraph` feature #12',
    body: 'Detailed description of the commit.',
    signature: {
      status: 'G',
      signer: 'Alice <alice@example.com>',
      label: 'Verified Signature'
    },
    fileChanges: [
      {
        oldPath: 'src/app/Graph.tsx',
        newPath: 'src/app/Graph.tsx',
        status: 'M',
        additions: 15,
        deletions: 3
      }
    ]
  };
}

function makeSampleDiff(): GitFileDiff {
  return {
    filePath: 'src/app/Graph.tsx',
    commitHash: 'aaaa111122223333444455556666777788889999',
    isBinary: false,
    rawDiff: '@@ -1,2 +1,2 @@\n-old\n+new\n',
    hunks: [
      {
        header: '@@ -1,2 +1,2 @@',
        oldStart: 1,
        oldLines: 2,
        newStart: 1,
        newLines: 2,
        lines: [
          { type: 'del', oldLineNumber: 1, newLineNumber: null, content: 'const oldVal = 1;' },
          { type: 'add', oldLineNumber: null, newLineNumber: 1, content: 'const newVal = 2;' }
        ]
      }
    ]
  };
}

describe('git-tree app UI tests', () => {
  afterEach(() => {
    cleanup();
  });

  it('registers projectTab and commandPaletteAction slots on app.tsx load', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    expect(registrations.navPanels).toHaveLength(0);

    expect(registrations.projectTabs).toHaveLength(1);
    const tab = registrations.projectTabs[0];
    expect(tab.id).toBe('git-tree');
    expect(tab.label).toBe('Git Tree');
    expect(tab.icon).toBe('GitBranch');
    expect(tab.global).toBe(false);
    expect(tab.header).toBe('custom');
    expect(tab.detachable).toBe(true);
    expect(tab.detachedPlaceholder).toBeDefined();

    expect(registrations.commandPaletteActions).toHaveLength(1);
    const cmd = registrations.commandPaletteActions[0];
    expect(cmd.id).toBe('open-git-tree');
    expect(cmd.isAvailable?.({ projectId: 'proj-1', threadId: null, openPanel: () => false, toPluginPanel: () => false, toProject: () => false })).toBe(true);
    expect(cmd.isAvailable?.({ projectId: null, threadId: null, openPanel: () => false, toPluginPanel: () => false, toProject: () => false })).toBe(false);
  });

  it('renders commit DAG, opens Commit Details & Split Diff, runs Code Review, Find, Context Menus, and Dialogs', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const tab = registrations.projectTabs[0];
    const graphData = makeSampleGraphData();

    const comparisonData: GitCommitComparison = {
      fromHash: 'aaaa111122223333444455556666777788889999',
      toHash: 'bbbb111122223333444455556666777788889999',
      fileChanges: [
        {
          oldPath: 'src/app/Graph.tsx',
          newPath: 'src/app/Graph.tsx',
          status: 'M',
          additions: 15,
          deletions: 3
        }
      ]
    };

    const view = renderSlot(
      tab,
      { pluginId: 'git-tree', projectId: 'proj-1' },
      {
        panelAgent: true,
        context: { projectId: 'proj-1' },
        rpc: {
          discoverRepos: () => ({ repos: [graphData.repo], globalSettings: graphData.globalSettings }),
          loadGraph: () => graphData,
          getCommitDetails: () => ({
            details: makeSampleDetails(),
            codeReview: null
          }),
          compareCommits: () => ({
            comparison: comparisonData,
            codeReview: null
          }),
          getFileDiff: () => makeSampleDiff(),
          getFileContent: () => ({
            filePath: 'src/app/Graph.tsx',
            commitHash: 'aaaa111',
            content: 'export const Graph = () => <div />;\n',
            isBinary: false
          }),
          getTagDetails: () => ({
            name: 'v1.0.0',
            hash: 'aaaa111',
            isAnnotated: true,
            taggerName: 'Alice',
            taggerEmail: 'alice@example.com',
            message: 'Release 1.0'
          }),
          codeReviewStart: () => ({
            key: 'proj-1::single:aaaa111',
            projectId: 'proj-1',
            subRepoRelPath: '',
            fromHash: null,
            toHash: 'aaaa111122223333444455556666777788889999',
            reviewedFiles: [],
            startedAt: 1000,
            lastActiveAt: 1000
          }),
          codeReviewToggleFile: () => ({
            key: 'proj-1::single:aaaa111',
            projectId: 'proj-1',
            subRepoRelPath: '',
            fromHash: null,
            toHash: 'aaaa111122223333444455556666777788889999',
            reviewedFiles: ['src/app/Graph.tsx'],
            startedAt: 1000,
            lastActiveAt: 2000
          }),
          codeReviewEnd: () => ({ ok: true }),
          updateGlobalSettings: () => ({ ok: true }),
          updateRepoSettings: () => graphData.repoSettings,
          runGitAction: () => ({ ok: true, stdout: '', stderr: '' }),
          exportRepoConfig: () => ({ ok: true, filePath: '.git-tree.json' }),
          draftAgentAboutCommit: (args: any) => ({
            ok: true,
            prompt: 'Explain these Git changes and highlight any potential issues.\n\n---\nCommit: aaaa111',
            title: `Git Tree: ${args?.commitHash ? String(args.commitHash).slice(0, 8) : 'HEAD'}`
          }),
          askAgentAboutCommit: () => ({ threadId: 'thr-99', title: 'Commit aaaa111' })
        }
      }
    );

    // Wait for graph rows to render
    await waitFor(() => {
      expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy();
    });

    expect(view.getByTestId('gg-svg-dag')).toBeTruthy();
    expect(view.getByTestId('gg-commit-row-*')).toBeTruthy();

    // Click commit row to open CommitDetailsPane
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => {
      expect(view.getByTestId('gg-details-pane')).toBeTruthy();
      expect(view.getByTestId('gg-details-columns')).toBeTruthy();
      expect(view.getByTestId('gg-file-list')).toBeTruthy();
      expect(view.getByTestId('gg-diff-viewer')).toBeTruthy();
    });

    // Click file item directly to trigger file diff selection
    fireEvent.click(view.getByTestId('gg-file-row-src/app/Graph.tsx'));
    expect(view.getByTestId('gg-diff-viewer')).toBeTruthy();

    // Switch to Source Code view and assert table rendered
    fireEvent.click(view.getByTestId('gg-view-source-btn'));
    await waitFor(() => {
      expect(view.getByTestId('gg-source-code-table')).toBeTruthy();
    });

    // Switch back to Diff view
    fireEvent.click(view.getByTestId('gg-view-diff-btn'));

    // Switch Diff view to Split mode and File view to List mode
    fireEvent.click(view.getByTestId('gg-diff-split-btn'));
    fireEvent.click(view.getByTestId('gg-view-list-btn'));

    // Start Code Review & End Code Review
    fireEvent.click(view.getByTestId('gg-start-review-btn'));
    await waitFor(() => {
      expect(view.getByTestId('gg-end-review-btn')).toBeTruthy();
    });
    fireEvent.click(view.getByTestId('gg-end-review-btn'));

    // Ask Agent from CommitDetailsPane opens draft in side panel
    fireEvent.click(view.getByTestId('gg-ask-agent-btn'));
    await waitFor(() => {
      expect(
        view.inspection.navigateCalls.some(
          (c) =>
            c.method === 'openPanelAgent' &&
            'draft' in (c.options as any) &&
            (c.options as any).draft.prompt.includes('Explain these Git changes')
        )
      ).toBe(true);
    });

    // Ctrl+Click second commit for 2-commit comparison
    fireEvent.click(view.getByTestId('gg-commit-row-bbbb111'), { ctrlKey: true });
    await waitFor(() => {
      expect(
        view.inspection.rpcCalls.some((c) => c.method === 'compareCommits')
      ).toBe(true);
    });

    // Toggle Inline details mode
    fireEvent.click(view.getByText(/Details:/));

    // Open Find widget and search
    fireEvent.click(view.getByTestId('gg-find-btn'));
    const findInput = view.getByTestId('gg-find-input');
    fireEvent.change(findInput, { target: { value: 'Initial' } });
    fireEvent.click(view.getByTestId('gg-find-next'));
    fireEvent.click(view.getByTestId('gg-find-prev'));

    // Open Branches popover and close it
    fireEvent.click(view.getByTestId('gg-branches-filter-btn'));
    expect(view.getByTestId('gg-branches-popover')).toBeTruthy();
    fireEvent.click(view.getByText('Close'));

    // Right-click a commit row to open context menu and trigger Create Branch dialog
    fireEvent.contextMenu(view.getByTestId('gg-commit-row-aaaa111'));
    expect(view.getByTestId('gg-context-menu')).toBeTruthy();
    fireEvent.click(view.getByText('Create Branch…'));
    expect(view.getByTestId('gg-dialog-create-branch')).toBeTruthy();
    fireEvent.click(view.getByText('Cancel'));

    // Right-click uncommitted row
    fireEvent.contextMenu(view.getByTestId('gg-commit-row-*'));
    expect(view.getByTestId('gg-context-menu')).toBeTruthy();
    fireEvent.click(view.getByText('Stash Uncommitted Changes…'));
    expect(view.getByTestId('gg-dialog-stash-push')).toBeTruthy();
    fireEvent.click(view.getByText('Cancel'));

    // Right-click stash row
    fireEvent.contextMenu(view.getByTestId('gg-commit-row-ssss111'));
    expect(view.getByTestId('gg-context-menu')).toBeTruthy();
    fireEvent.click(view.getByText('Apply Stash'));

    // Right-click branch pill, remote pill, tag pill
    const legacyBadges = view.getAllByText(/legacy/);
    fireEvent.contextMenu(legacyBadges[legacyBadges.length - 1]);
    expect(view.getByText('Merge into Current Branch…')).toBeTruthy();
    fireEvent.click(view.getByText('Merge into Current Branch…'));
    expect(view.getByTestId('gg-dialog-merge-branch')).toBeTruthy();
    fireEvent.click(view.getByText('Merge'));

    fireEvent.contextMenu(view.getByText(/v1\.0\.0/));
    fireEvent.click(view.getByText('View Tag Details'));
    await waitFor(() => {
      expect(view.getByTestId('gg-dialog-tag-details')).toBeTruthy();
    });
    fireEvent.click(view.getByText('Close'));

    // Open Repo Settings modal and interact with it
    fireEvent.click(view.getByTestId('gg-repo-settings-btn'));
    expect(view.getByTestId('gg-repo-settings-modal')).toBeTruthy();
    fireEvent.click(view.getByText('Export .git-tree.json'));
    fireEvent.click(view.getByText('Done'));

    // Load more commits button
    fireEvent.click(view.getByTestId('gg-load-more-btn'));

    // Keyboard shortcuts on root
    const rootEl = view.getByTestId('gg-project-tab');
    fireEvent.keyDown(rootEl, { key: 'ArrowDown' });
    fireEvent.keyDown(rootEl, { key: 'ArrowUp' });
    fireEvent.keyDown(rootEl, { key: 'h', ctrlKey: true });
    fireEvent.keyDown(rootEl, { key: 'Escape' });

    // Test Detached Placeholder component
    const focusSpy = vi.fn();
    const bringBackSpy = vi.fn();
    if (tab.detachedPlaceholder) {
      const detached = renderSlot(
        { component: tab.detachedPlaceholder },
        {
          pluginId: 'git-tree',
          projectId: 'proj-1',
          focusWindow: focusSpy,
          bringBack: bringBackSpy
        }
      );
      expect(detached.getByTestId('gg-detached-placeholder')).toBeTruthy();
      fireEvent.click(detached.getByText('Focus Window'));
      expect(focusSpy).toHaveBeenCalledTimes(1);
      detached.unmount();
    }
    view.unmount();
  });

  it('exercises all GitActionDialogModal dialogs, ContextMenuOverlay actions, and RepoSettingsWidget controls', async () => {
    const React = await import('react');
    const { render } = await import('@testing-library/react');
    const {
      ContextMenuOverlay,
      GitActionDialogModal
    } = await import('../app/components/ContextMenuAndDialogs.js');
    const { RepoSettingsWidget } = await import('../app/components/RepoSettingsWidget.js');

    const sampleCommit = makeSampleGraphData().commits[2];
    const actionsRun: unknown[] = [];

    // Exercise every dialog kind in GitActionDialogModal
    const dialogKinds = [
      { kind: 'create-branch' as const, commit: sampleCommit },
      { kind: 'rename-branch' as const, branchName: 'legacy' },
      { kind: 'delete-branch' as const, branchName: 'legacy' },
      { kind: 'merge-branch' as const, branchName: 'legacy' },
      { kind: 'rebase-branch' as const, ontoBranch: 'main' },
      { kind: 'push-branch' as const, branchName: 'legacy' },
      { kind: 'pull-branch' as const, branchName: 'legacy' },
      { kind: 'cherry-pick' as const, commit: sampleCommit },
      { kind: 'revert-commit' as const, commit: sampleCommit },
      { kind: 'reset-commit' as const, commit: sampleCommit, defaultMode: 'mixed' as const },
      { kind: 'drop-commit' as const, commit: sampleCommit },
      { kind: 'add-tag' as const, commit: sampleCommit },
      { kind: 'stash-push' as const },
      { kind: 'stash-branch' as const, selector: 'stash@{0}' },
      { kind: 'clean-untracked' as const },
      { kind: 'discard-all' as const }
    ];

    for (const dlg of dialogKinds) {
      const modal = render(
        React.createElement(GitActionDialogModal, {
          dialog: dlg,
          remotes: [{ name: 'origin', fetchUrl: 'https://github.com/a/b.git', pushUrl: 'https://github.com/a/b.git' }],
          onClose: () => undefined,
          onRunAction: (act) => actionsRun.push(act),
          onAskAgentSubmit: () => undefined
        })
      );
      const inputs = modal.container.querySelectorAll('input[type="text"]');
      inputs.forEach((inp) => fireEvent.change(inp, { target: { value: 'test-val' } }));
      const checkboxes = modal.container.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((cb) => fireEvent.click(cb));
      const primaryBtn = modal.container.querySelector('.gg-btn-primary, .gg-btn-danger') as HTMLButtonElement | null;
      if (primaryBtn) fireEvent.click(primaryBtn);
      modal.unmount();
    }
    expect(actionsRun.length).toBe(dialogKinds.length);

    // Exercise ContextMenuOverlay for remote-branch, branch, tag, stash, uncommitted, commit
    const targets = [
      {
        kind: 'branch' as const,
        commit: sampleCommit,
        ref: { type: 'head' as const, name: 'legacy', isHead: false },
        x: 10,
        y: 10
      },
      {
        kind: 'remote-branch' as const,
        commit: sampleCommit,
        ref: { type: 'remote' as const, name: 'main', remote: 'origin' },
        x: 10,
        y: 10
      },
      {
        kind: 'tag' as const,
        commit: sampleCommit,
        ref: { type: 'tag' as const, name: 'v1.0.0' },
        x: 10,
        y: 10
      },
      {
        kind: 'stash' as const,
        commit: sampleCommit,
        selector: 'stash@{0}',
        x: 10,
        y: 10
      },
      {
        kind: 'uncommitted' as const,
        commit: sampleCommit,
        x: 10,
        y: 10
      },
      {
        kind: 'commit' as const,
        commit: sampleCommit,
        x: 10,
        y: 10
      }
    ];

    for (const target of targets) {
      const menu = render(
        React.createElement(ContextMenuOverlay, {
          target,
          currentBranch: 'main',
          onClose: () => undefined,
          onRunAction: (a) => actionsRun.push(a),
          onOpenDialog: () => undefined,
          onOpenPullRequest: () => undefined,
          onViewTagDetails: () => undefined,
          onCopyText: () => undefined
        })
      );
      const buttons = menu.container.querySelectorAll('.gg-context-menu-item');
      buttons.forEach((btn) => fireEvent.click(btn));
      menu.unmount();
    }

    // Verify hasCommits={false} disables Stash Uncommitted Changes
    const uncommittedTarget: ContextMenuTarget = {
      kind: 'uncommitted',
      commit: {
        hash: '*',
        abbreviatedHash: '*',
        parents: [],
        authorName: '*',
        authorEmail: '',
        authorDate: 0,
        committerName: '*',
        committerEmail: '',
        commitDate: 0,
        subject: 'Uncommitted Changes',
        refs: [],
        isUncommitted: true
      },
      x: 10,
      y: 10
    };
    const disabledMenu = render(
      React.createElement(ContextMenuOverlay, {
        target: uncommittedTarget,
        currentBranch: 'main',
        hasCommits: false,
        onClose: () => undefined,
        onRunAction: () => undefined,
        onOpenDialog: () => undefined,
        onOpenPullRequest: () => undefined,
        onViewTagDetails: () => undefined,
        onCopyText: () => undefined
      })
    );
    const stashBtn = Array.from(
      disabledMenu.container.querySelectorAll<HTMLButtonElement>('.gg-context-menu-item')
    ).find((b) => b.textContent?.includes('Stash Uncommitted Changes'));
    expect(stashBtn).toBeDefined();
    expect(stashBtn?.disabled).toBe(true);
    disabledMenu.unmount();

    // Exercise RepoSettingsWidget add remote, prune, delete, add/remove issue rule, PR config, global toggles
    const sampleData = makeSampleGraphData();
    const settingsModal = render(
      React.createElement(RepoSettingsWidget, {
        open: true,
        remotes: sampleData.remotes,
        repoSettings: sampleData.repoSettings,
        globalSettings: sampleData.globalSettings,
        onClose: () => undefined,
        onRunGitAction: (a) => actionsRun.push(a),
        onUpdateRepoSettings: () => undefined,
        onUpdateGlobalSettings: () => undefined,
        onExportRepoConfig: () => undefined
      })
    );
    fireEvent.click(settingsModal.getByText('Prune'));
    fireEvent.click(settingsModal.getByText('Delete'));
    fireEvent.click(settingsModal.getByText('Remove'));
    fireEvent.change(settingsModal.getByPlaceholderText('upstream'), {
      target: { value: 'upstream' }
    });
    fireEvent.change(
      settingsModal.getByPlaceholderText('https://github.com/org/repo.git'),
      { target: { value: 'https://github.com/org/repo.git' } }
    );
    fireEvent.click(settingsModal.getByText('Add Remote'));
    fireEvent.change(settingsModal.getByPlaceholderText('#(\\d+)'), {
      target: { value: 'JIRA-(\\d+)' }
    });
    fireEvent.change(
      settingsModal.getByPlaceholderText('https://github.com/org/repo/issues/$1'),
      { target: { value: 'https://jira.example.com/$1' } }
    );
    fireEvent.click(settingsModal.getByText('Add Rule'));
    settingsModal.unmount();
  });

  it('keeps the SVG DAG visible and correctly positioned when clicking commits in inline details mode', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const tab = registrations.projectTabs[0];
    const graphData = makeSampleGraphData();
    graphData.globalSettings.commitDetailsLocation = 'inline';

    const view = renderSlot(
      tab,
      { pluginId: 'git-tree', projectId: 'proj-1' },
      {
        context: { projectId: 'proj-1' },
        rpc: {
          discoverRepos: () => ({ repos: [graphData.repo], globalSettings: graphData.globalSettings }),
          loadGraph: () => graphData,
          getCommitDetails: () => ({
            details: makeSampleDetails(),
            codeReview: null
          }),
          compareCommits: () => ({
            comparison: { fromHash: 'aaaa111', toHash: 'bbbb111', fileChanges: [] },
            codeReview: null
          }),
          getFileDiff: () => makeSampleDiff()
        }
      }
    );

    // Initial render has SVG DAG visible
    await waitFor(() => {
      expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy();
    });
    expect(view.getByTestId('gg-svg-dag')).toBeTruthy();

    // Click on commit row — SVG DAG must NOT disappear!
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => {
      expect(view.getByTestId('gg-details-pane')).toBeTruthy();
    });

    // Verify SVG DAG is still in the DOM and visible
    const svgEl = view.getByTestId('gg-svg-dag');
    expect(svgEl).toBeTruthy();
    expect(svgEl.getAttribute('height')).not.toBe('0');

    // Deselect commit — SVG DAG still visible
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    expect(view.getByTestId('gg-svg-dag')).toBeTruthy();
    view.unmount();
  });

  it('bounds the inline commit details pane within the visible viewport width', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const tab = registrations.projectTabs[0];
    const graphData = makeSampleGraphData();
    graphData.globalSettings.commitDetailsLocation = 'inline';

    const view = renderSlot(
      tab,
      { pluginId: 'git-tree', projectId: 'proj-1' },
      {
        context: { projectId: 'proj-1' },
        rpc: {
          discoverRepos: () => ({ repos: [graphData.repo], globalSettings: graphData.globalSettings }),
          loadGraph: () => graphData,
          getCommitDetails: () => ({
            details: makeSampleDetails(),
            codeReview: null
          })
        }
      }
    );

    await waitFor(() => {
      expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy();
    });

    // Open inline commit details
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => {
      expect(view.getByTestId('gg-details-pane')).toBeTruthy();
    });

    // The inline details pane must be wrapped in gg-inline-details-wrapper
    const detailsPane = view.getByTestId('gg-details-pane');
    const wrapper = detailsPane.closest('.gg-inline-details-wrapper') as HTMLElement | null;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.style.boxSizing).toBe('border-box');
    expect(wrapper?.style.maxWidth).toBe('100%');

    // Action buttons (Ask Agent, Close) must be rendered inside the pane
    expect(view.getByTestId('gg-ask-agent-btn')).toBeTruthy();
    expect(view.getByTestId('gg-close-details-btn')).toBeTruthy();
    view.unmount();
  });

  it('renders "Initialize Git Repository" button when no repo found and calls runGitAction with init', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const tab = registrations.projectTabs[0];
    const graphData = makeSampleGraphData();

    let repoDiscovered = false;
    let initActionCalled = false;

    const view = renderSlot(
      tab,
      { pluginId: 'git-tree', projectId: 'proj-1' },
      {
        context: { projectId: 'proj-1' },
        rpc: {
          discoverRepos: () =>
            repoDiscovered
              ? { repos: [graphData.repo], globalSettings: graphData.globalSettings }
              : { repos: [], globalSettings: graphData.globalSettings },
          loadGraph: () => graphData,
          runGitAction: (args: unknown) => {
            const act = args as { action: string; projectId: string };
            if (act.action === 'init') {
              initActionCalled = true;
              repoDiscovered = true;
            }
            return { ok: true, stdout: '', stderr: '' };
          }
        }
      }
    );

    // Initial render shows "No Git repositories found in this project." and Init button
    await waitFor(() => {
      expect(view.getByText('No Git repositories found in this project.')).toBeTruthy();
      expect(view.getByTestId('gg-init-repo-btn')).toBeTruthy();
    });

    // Click "Initialize Git Repository"
    fireEvent.click(view.getByTestId('gg-init-repo-btn'));

    // Should have called init and refreshed the graph
    await waitFor(() => {
      expect(initActionCalled).toBe(true);
      expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy();
    });

    view.unmount();
  });

  it('supports resizing the file list column and pane height with auto-sizing and persistence', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const tab = registrations.projectTabs[0];
    const graphData = makeSampleGraphData();

    const view = renderSlot(
      tab,
      { pluginId: 'git-tree', projectId: 'proj-1' },
      {
        context: { projectId: 'proj-1' },
        rpc: {
          discoverRepos: () => ({ repos: [graphData.repo], globalSettings: graphData.globalSettings }),
          loadGraph: () => graphData,
          getCommitDetails: () => ({
            details: makeSampleDetails(),
            codeReview: null
          }),
          getFileDiff: () => makeSampleDiff(),
          getFileContent: () => ({
            filePath: 'src/app/Graph.tsx',
            commitHash: 'aaaa111',
            content: 'export const Graph = () => <div />;\n',
            isBinary: false
          })
        }
      }
    );

    // Open commit details
    await waitFor(() => {
      expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy();
    });
    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));

    await waitFor(() => {
      expect(view.getByTestId('gg-details-pane')).toBeTruthy();
      expect(view.getByTestId('gg-details-col-resizer')).toBeTruthy();
      expect(view.getByTestId('gg-details-top-resizer')).toBeTruthy();
    });

    const colResizer = view.getByTestId('gg-details-col-resizer');
    const topResizer = view.getByTestId('gg-details-top-resizer');
    const filesCol = view.getByTestId('gg-file-list').parentElement!;

    // Initial width was auto-fitted
    const initialWidth = filesCol.style.width;
    expect(initialWidth).toBeTruthy();

    // Drag column resizer to resize width
    const startWidthNum = parseInt(initialWidth, 10);
    fireEvent.mouseDown(colResizer, { clientX: 200 });
    fireEvent.mouseMove(window, { clientX: 300 });
    fireEvent.mouseUp(window);

    expect(parseInt(filesCol.style.width, 10)).toBe(startWidthNum + 100);

    // Double-click column resizer to reset to auto-fit
    fireEvent.doubleClick(colResizer);
    await waitFor(() => {
      expect(filesCol.style.width).toBe(initialWidth);
    });

    // Drag top resizer to resize height
    const detailsPane = view.getByTestId('gg-details-pane');
    fireEvent.mouseDown(topResizer, { clientY: 500 });
    fireEvent.mouseMove(window, { clientY: 400 }); // moving up increases height
    fireEvent.mouseUp(window);

    expect(detailsPane.style.height).toBeTruthy();

    // Double-click top resizer to reset height
    fireEvent.doubleClick(topResizer);
    expect(detailsPane.style.height).toBe('');

    view.unmount();
  });

  it('supports stacked vertical view auto-split (50/50 for large list, shrink for small) and row resizer', async () => {
    const details = makeSampleDetails();
    const manyChanges: GitFileChange[] = Array.from({ length: 40 }, (_, i) => ({
      oldPath: `file-${i}.txt`,
      newPath: `file-${i}.txt`,
      status: 'M' as const,
      additions: 1,
      deletions: 0
    }));

    const view = render(
      <CommitDetailsPane
        mode="single"
        details={{ ...details, fileChanges: manyChanges }}
        comparison={null}
        loading={false}
        inline={false}
        fileViewType="list"
        compactFolders={true}
        diffViewMode="unified"
        dateFormat="relative"
        issueRules={[]}
        codeReview={null}
        selectedFilePath="file-0.txt"
        fileDiff={makeSampleDiff()}
        loadingDiff={false}
        onSelectFile={() => {}}
        onChangeFileViewType={() => {}}
        onToggleCompactFolders={() => {}}
        onChangeDiffViewMode={() => {}}
        onStartCodeReview={() => {}}
        onToggleReviewedFile={() => {}}
        onEndCodeReview={() => {}}
        onSelectParentHash={() => {}}
        onAskAgent={() => {}}
        onCopyText={() => {}}
        onClose={() => {}}
      />
    );

    const columnsEl = view.getByTestId('gg-details-columns');
    Object.defineProperty(columnsEl, 'clientWidth', { value: 500, configurable: true });
    Object.defineProperty(columnsEl, 'clientHeight', { value: 600, configurable: true });

    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      expect(view.getByTestId('gg-details-row-resizer')).toBeTruthy();
    });

    const rowResizer = view.getByTestId('gg-details-row-resizer');
    const filesCol = view.getByTestId('gg-file-list').parentElement!;

    // For 40 files, needed height > 300 (halfHeight), so it caps at 300px (50/50 split)
    await waitFor(() => {
      expect(filesCol.style.height).toBe('300px');
    });

    // Drag row resizer down by 60px
    fireEvent.mouseDown(rowResizer, { clientY: 300 });
    fireEvent.mouseMove(window, { clientY: 360 });
    fireEvent.mouseUp(window);

    expect(filesCol.style.height).toBe('360px');

    // Double-click row resizer to reset back to auto-split (300px)
    fireEvent.doubleClick(rowResizer);
    await waitFor(() => {
      expect(filesCol.style.height).toBe('300px');
    });

    view.unmount();
  });

  it('resets auto-sizing when switching to a different commit', async () => {
    const details1 = makeSampleDetails();
    const manyChanges: GitFileChange[] = Array.from({ length: 40 }, (_, i) => ({
      oldPath: `file-${i}.txt`,
      newPath: `file-${i}.txt`,
      status: 'M' as const,
      additions: 1,
      deletions: 0
    }));

    const view = render(
      <CommitDetailsPane
        mode="single"
        details={{ ...details1, hash: 'commit-111', fileChanges: manyChanges }}
        comparison={null}
        loading={false}
        inline={false}
        fileViewType="list"
        compactFolders={true}
        diffViewMode="unified"
        dateFormat="relative"
        issueRules={[]}
        codeReview={null}
        selectedFilePath="file-0.txt"
        fileDiff={makeSampleDiff()}
        loadingDiff={false}
        onSelectFile={() => {}}
        onChangeFileViewType={() => {}}
        onToggleCompactFolders={() => {}}
        onChangeDiffViewMode={() => {}}
        onStartCodeReview={() => {}}
        onToggleReviewedFile={() => {}}
        onEndCodeReview={() => {}}
        onSelectParentHash={() => {}}
        onAskAgent={() => {}}
        onCopyText={() => {}}
        onClose={() => {}}
      />
    );

    const columnsEl = view.getByTestId('gg-details-columns');
    Object.defineProperty(columnsEl, 'clientWidth', { value: 500, configurable: true });
    Object.defineProperty(columnsEl, 'clientHeight', { value: 600, configurable: true });
    fireEvent(window, new Event('resize'));

    const filesCol = view.getByTestId('gg-file-list').parentElement!;
    await waitFor(() => {
      expect(filesCol.style.height).toBe('300px');
    });

    // Manually resize to 400px
    const rowResizer = view.getByTestId('gg-details-row-resizer');
    fireEvent.mouseDown(rowResizer, { clientY: 300 });
    fireEvent.mouseMove(window, { clientY: 400 });
    fireEvent.mouseUp(window);
    expect(filesCol.style.height).toBe('400px');

    // Switch commit to a small commit (2 files)
    const smallChanges: GitFileChange[] = [
      { oldPath: 'a.txt', newPath: 'a.txt', status: 'M', additions: 1, deletions: 0 },
      { oldPath: 'b.txt', newPath: 'b.txt', status: 'M', additions: 2, deletions: 0 }
    ];

    view.rerender(
      <CommitDetailsPane
        mode="single"
        details={{ ...details1, hash: 'commit-222', fileChanges: smallChanges }}
        comparison={null}
        loading={false}
        inline={false}
        fileViewType="list"
        compactFolders={true}
        diffViewMode="unified"
        dateFormat="relative"
        issueRules={[]}
        codeReview={null}
        selectedFilePath="a.txt"
        fileDiff={makeSampleDiff()}
        loadingDiff={false}
        onSelectFile={() => {}}
        onChangeFileViewType={() => {}}
        onToggleCompactFolders={() => {}}
        onChangeDiffViewMode={() => {}}
        onStartCodeReview={() => {}}
        onToggleReviewedFile={() => {}}
        onEndCodeReview={() => {}}
        onSelectParentHash={() => {}}
        onAskAgent={() => {}}
        onCopyText={() => {}}
        onClose={() => {}}
      />
    );

    // Should automatically reset manual height and auto-size to small commit height
    await waitFor(() => {
      const h = parseInt(filesCol.style.height, 10);
      expect(h).toBeLessThan(300);
      expect(h).toBeGreaterThanOrEqual(100);
    });

    view.unmount();
  });

  it('supports resizing table columns (description, date, author, commit) with persistence and double-click reset', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const tab = registrations.projectTabs[0];
    const graphData = makeSampleGraphData();
    const updateSettingsSpy = vi.fn(() => ({ ok: true }));

    const view = renderSlot(
      tab,
      { pluginId: 'git-tree', projectId: 'proj-1' },
      {
        context: { projectId: 'proj-1' },
        rpc: {
          discoverRepos: () => ({ repos: [graphData.repo], globalSettings: graphData.globalSettings }),
          loadGraph: () => graphData,
          updateGlobalSettings: updateSettingsSpy
        }
      }
    );

    await waitFor(() => {
      expect(view.getByTestId('gg-col-resizer-description')).toBeTruthy();
      expect(view.getByTestId('gg-col-resizer-date')).toBeTruthy();
      expect(view.getByTestId('gg-col-resizer-author')).toBeTruthy();
      expect(view.getByTestId('gg-col-resizer-commit')).toBeTruthy();
    });

    const descResizer = view.getByTestId('gg-col-resizer-description');
    const dateResizer = view.getByTestId('gg-col-resizer-date');
    const authorResizer = view.getByTestId('gg-col-resizer-author');
    const commitResizer = view.getByTestId('gg-col-resizer-commit');

    // Drag Date resizer to the right by 40px (increases width from 125 to 165)
    fireEvent.mouseDown(dateResizer, { clientX: 500 });
    fireEvent.mouseMove(window, { clientX: 540 });
    fireEvent.mouseUp(window);

    expect(updateSettingsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          columnWidths: expect.objectContaining({ date: 165 })
        })
      })
    );

    const firstRow = view.getByTestId('gg-commit-row-aaaa111');
    const dateCell = firstRow.querySelector('.gg-commit-date') as HTMLElement;
    const authorCell = firstRow.querySelector('.gg-commit-author') as HTMLElement;
    const commitCell = firstRow.querySelector('.gg-commit-hash') as HTMLElement;
    const descCell = firstRow.querySelector('.gg-commit-desc') as HTMLElement;

    // Drag Date resizer to the left by 30px (decreases width from 165 to 135)
    fireEvent.mouseDown(dateResizer, { clientX: 500 });
    fireEvent.mouseMove(window, { clientX: 470 });
    fireEvent.mouseUp(window);

    expect(updateSettingsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          columnWidths: expect.objectContaining({ date: 135 })
        })
      })
    );
    expect(dateCell.style.width).toBe('135px');

    // Double-click Date resizer to reset back to default 125px
    fireEvent.doubleClick(dateResizer);
    expect(updateSettingsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          columnWidths: expect.objectContaining({ date: 125 })
        })
      })
    );
    expect(dateCell.style.width).toBe('125px');

    // Drag Author resizer to the left by 40px (decreases width from 130 to 90)
    fireEvent.mouseDown(authorResizer, { clientX: 500 });
    fireEvent.mouseMove(window, { clientX: 460 });
    fireEvent.mouseUp(window);

    expect(updateSettingsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          columnWidths: expect.objectContaining({ author: 90 })
        })
      })
    );
    expect(authorCell.style.width).toBe('90px');

    // Drag Commit resizer to the left beyond min width (should clamp to min 50px)
    fireEvent.mouseDown(commitResizer, { clientX: 500 });
    fireEvent.mouseMove(window, { clientX: 300 });
    fireEvent.mouseUp(window);

    expect(updateSettingsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          columnWidths: expect.objectContaining({ commit: 50 })
        })
      })
    );
    expect(commitCell.style.width).toBe('50px');

    // Drag Description resizer to the right by 50px
    fireEvent.mouseDown(descResizer, { clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 350 });
    fireEvent.mouseUp(window);

    expect(updateSettingsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          columnWidths: expect.objectContaining({ description: expect.any(Number) })
        })
      })
    );
    expect(descCell.style.width).toBeTruthy();

    // Double-click Description resizer to reset back to auto-fit
    fireEvent.doubleClick(descResizer);
    expect(updateSettingsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          columnWidths: expect.not.objectContaining({ description: expect.anything() })
        })
      })
    );
    expect(descCell.style.flex).toBe('1 1 0px');

    view.unmount();
  });

  it('opens draft panel from commit context menu and uncommitted context menu', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const tab = registrations.projectTabs[0];
    const graphData = makeSampleGraphData();

    const view = renderSlot(
      tab,
      { pluginId: 'git-tree', projectId: 'proj-1' },
      {
        panelAgent: true,
        context: { projectId: 'proj-1' },
        rpc: {
          discoverRepos: () => ({ repos: [graphData.repo], globalSettings: graphData.globalSettings }),
          loadGraph: () => graphData,
          draftAgentAboutCommit: (args: any) => ({
            ok: true,
            prompt: `Draft for ${args.commitHash}`,
            title: `Git Tree: ${args.commitHash}`
          })
        }
      }
    );

    await waitFor(() => {
      expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy();
    });

    // Right-click commit row to open context menu
    fireEvent.contextMenu(view.getByTestId('gg-commit-row-aaaa111'));
    const askCommitBtn = view.getByText(/Ask Agent about Commit/);
    fireEvent.click(askCommitBtn);

    await waitFor(() => {
      expect(
        view.inspection.navigateCalls.some(
          (c) =>
            c.method === 'openPanelAgent' &&
            'draft' in (c.options as any) &&
            (c.options as any).draft.prompt === 'Draft for aaaa111122223333444455556666777788889999'
        )
      ).toBe(true);
    });

    // Right-click uncommitted row
    fireEvent.contextMenu(view.getByTestId('gg-commit-row-*'));
    const askUncommittedBtn = view.getByText(/Ask Agent to Review Working Tree/);
    fireEvent.click(askUncommittedBtn);

    await waitFor(() => {
      expect(
        view.inspection.navigateCalls.some(
          (c) =>
            c.method === 'openPanelAgent' &&
            'draft' in (c.options as any) &&
            (c.options as any).draft.prompt === 'Draft for *'
        )
      ).toBe(true);
    });

    view.unmount();
  });

  it('falls back to askAgentAboutCommit and toThread when panelAgent is false', async () => {
    const registrations = await loadPluginApp(() => import('../../app.tsx'), 'git-tree');
    const tab = registrations.projectTabs[0];
    const graphData = makeSampleGraphData();

    const view = renderSlot(
      tab,
      { pluginId: 'git-tree', projectId: 'proj-1' },
      {
        panelAgent: false,
        context: { projectId: 'proj-1' },
        rpc: {
          discoverRepos: () => ({ repos: [graphData.repo], globalSettings: graphData.globalSettings }),
          loadGraph: () => graphData,
          getCommitDetails: () => ({
            details: makeSampleDetails(),
            codeReview: null
          }),
          getFileDiff: () => makeSampleDiff(),
          draftAgentAboutCommit: () => ({
            ok: true,
            prompt: 'Draft prompt',
            title: 'Git Tree: aaaa111'
          }),
          askAgentAboutCommit: () => ({
            ok: true,
            threadId: 'thr-fallback-123',
            title: 'Git Tree: aaaa111'
          })
        }
      }
    );

    await waitFor(() => {
      expect(view.getByTestId('gg-commit-row-aaaa111')).toBeTruthy();
    });

    fireEvent.click(view.getByTestId('gg-commit-row-aaaa111'));
    await waitFor(() => {
      expect(view.getByTestId('gg-ask-agent-btn')).toBeTruthy();
    });

    fireEvent.click(view.getByTestId('gg-ask-agent-btn'));

    await waitFor(() => {
      expect(
        view.inspection.navigateCalls.some(
          (c) => c.method === 'toThread' && (c as any).threadId === 'thr-fallback-123'
        )
      ).toBe(true);
    });

    view.unmount();
  });
});
