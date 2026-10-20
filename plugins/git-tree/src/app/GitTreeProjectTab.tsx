import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useRpc,
  useRealtime,
  useZccNavigate,
  useZccContext,
  type PluginDetachedTabProps
} from '@zana-ai/zcc-plugin-sdk/app';
import type {
  CodeReviewRecord,
  CommitDetailsLocation,
  CommitOrder,
  DiffViewMode,
  DiscoveredRepo,
  FileViewType,
  GitCommitComparison,
  GitCommitDetails,
  GitCommitNode,
  GitFileChange,
  GitFileContent,
  GitFileDiff,
  GitGraphColumnWidths,
  GitGraphGlobalSettings,
  GitRefBadge,
  GitTagDetails,
  GraphStyle,
  LoadGraphDataResult,
  RepoSettings
} from '../server/types.js';
import type { GitMutationAction } from '../server/git-actions.js';
import {
  buildSegmentSvgPath,
  computeGraphLayout,
  formatCommitTimestamp,
  tokenizeCommitMessage
} from './graph-layout.js';
import { ControlBar } from './components/ControlBar.js';
import { FindWidget } from './components/FindWidget.js';
import { CommitDetailsPane } from './components/CommitDetailsPane.js';
import { copyText } from './clipboard.js';
import {
  ContextMenuOverlay,
  GitActionDialogModal,
  type ActiveGitDialog,
  type ContextMenuTarget
} from './components/ContextMenuAndDialogs.js';
import { RepoSettingsWidget } from './components/RepoSettingsWidget.js';

const DEFAULT_COLUMN_WIDTHS: GitGraphColumnWidths = {
  date: 125,
  author: 130,
  commit: 74
};

const ROW_HEIGHT = 28;
const LANE_WIDTH = 14;
const PAD_X = 14;

export interface GitTreeProjectTabProps {
  pluginId: string;
  projectId?: string;
  headerActions?: React.ReactNode;
}
export type GitGraphProjectTabProps = GitTreeProjectTabProps;

export function GitTreeDetachedPlaceholder({
  focusWindow,
  bringBack
}: PluginDetachedTabProps) {
  return (
    <div className="gg-root" data-testid="gg-detached-placeholder">
      <div className="gg-empty" style={{ gap: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>
          Git Tree is open in its own window
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="gg-btn gg-btn-primary" onClick={focusWindow}>
            Focus Window
          </button>
          <button type="button" className="gg-btn" onClick={bringBack}>
            Bring Back Here
          </button>
        </div>
      </div>
    </div>
  );
}
export const GitGraphDetachedPlaceholder = GitTreeDetachedPlaceholder;

export function GitTreeProjectTab({
  projectId: propProjectId,
  headerActions
}: GitTreeProjectTabProps) {
  const rpc = useRpc();
  let zccCtx: { projectId: string | null } = { projectId: null };
  try {
    zccCtx = useZccContext();
  } catch {
    // fallback
  }

  const [projectList, setProjectList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    propProjectId || zccCtx.projectId || ''
  );

  const projectId = propProjectId || selectedProjectId || zccCtx.projectId || '';

  let navigate: ReturnType<typeof useZccNavigate> | null = null;
  try {
    navigate = useZccNavigate();
  } catch {
    navigate = null;
  }

  useEffect(() => {
    if (!propProjectId && !selectedProjectId) {
      void rpc
        .call('listProjects')
        .then((raw) => {
          const list = Array.isArray(raw) ? (raw as Array<{ id: string; name: string }>) : [];
          setProjectList(list);
          if (list.length > 0 && !selectedProjectId) {
            setSelectedProjectId(list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [propProjectId, selectedProjectId, rpc]);

  const [repos, setRepos] = useState<DiscoveredRepo[]>([]);
  const [selectedRepoRelPath, setSelectedRepoRelPath] = useState<string>('');
  const [graphData, setGraphData] = useState<LoadGraphDataResult | null>(null);
  const [maxCommits, setMaxCommits] = useState<number>(300);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: 'error' | 'info'; text: string } | null>(
    null
  );

  // Selection & Comparison state
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [compareWithHash, setCompareWithHash] = useState<string | null>(null);
  const [commitDetails, setCommitDetails] = useState<GitCommitDetails | null>(null);
  const [comparison, setComparison] = useState<GitCommitComparison | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [codeReview, setCodeReview] = useState<CodeReviewRecord | null>(null);

  // Selected file, Diff & Source Code state
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<GitFileDiff | null>(null);
  const [loadingDiff, setLoadingDiff] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<GitFileContent | null>(null);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);

  // Find widget state
  const [findOpen, setFindOpen] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [activeMatchIdx, setActiveMatchIdx] = useState<number>(0);

  // Context Menu & Dialogs state
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveGitDialog | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [initializingRepo, setInitializingRepo] = useState<boolean>(false);

  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);

  const loadReposAndGraph = useCallback(
    async (repoRelPathOverride?: string, maxCountOverride?: number, projectIdOverride?: string) => {
      const activePid = projectIdOverride ?? projectId;
      if (!activePid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const rawDiscovered = (await rpc.call('discoverRepos', {
          projectId: activePid
        })) as DiscoveredRepo[] | { repos?: DiscoveredRepo[] };
        const discovered = Array.isArray(rawDiscovered)
          ? rawDiscovered
          : (rawDiscovered?.repos ?? []);
        setRepos(discovered);
        if (discovered.length === 0) {
          setGraphData(null);
          setLoading(false);
          return;
        }
        const effectiveRelPath =
          repoRelPathOverride !== undefined
            ? repoRelPathOverride
            : discovered.some((r) => r.relPath === selectedRepoRelPath)
              ? selectedRepoRelPath
              : discovered[0].relPath;

        if (effectiveRelPath !== selectedRepoRelPath) {
          setSelectedRepoRelPath(effectiveRelPath);
        }

        const data = (await rpc.call('loadGraph', {
          projectId: activePid,
          subRepoRelPath: effectiveRelPath,
          maxCommits: maxCountOverride ?? maxCommits
        })) as LoadGraphDataResult;
        setGraphData(data);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [projectId, rpc, selectedRepoRelPath, maxCommits]
  );

  useEffect(() => {
    void loadReposAndGraph();
  }, [projectId]);

  const onDataChanged = (payload: unknown) => {
    const evt = payload as { projectId?: string; subRepoRelPath?: string } | null;
    if (!evt?.projectId || evt.projectId === projectId) {
      void loadReposAndGraph(selectedRepoRelPath, maxCommits);
    }
  };
  useRealtime('git-tree:changed', onDataChanged);
  useRealtime('git-graph:changed', onDataChanged);

  // Load commit details or 2-commit comparison when selection changes
  useEffect(() => {
    if (!projectId || !selectedHash) {
      setCommitDetails(null);
      setComparison(null);
      setCodeReview(null);
      setSelectedFilePath(null);
      setFileDiff(null);
      setFileContent(null);
      return;
    }

    let cancelled = false;
    setLoadingDetails(true);
    setSelectedFilePath(null);
    setFileDiff(null);
    setFileContent(null);

    const fetchDetails = async () => {
      try {
        if (compareWithHash && compareWithHash !== selectedHash) {
          const res = (await rpc.call('compareCommits', {
            projectId,
            subRepoRelPath: selectedRepoRelPath,
            fromHash: selectedHash,
            toHash: compareWithHash
          })) as {
            comparison: GitCommitComparison;
            codeReview: CodeReviewRecord | null;
          };
          if (cancelled) return;
          setComparison(res.comparison);
          setCommitDetails(null);
          setCodeReview(res.codeReview);
          if (res.comparison.fileChanges.length > 0) {
            void handleSelectFile(
              res.comparison.fileChanges[0],
              compareWithHash,
              selectedHash
            );
          }
        } else {
          const res = (await rpc.call('getCommitDetails', {
            projectId,
            subRepoRelPath: selectedRepoRelPath,
            commitHash: selectedHash
          })) as {
            details: GitCommitDetails;
            codeReview: CodeReviewRecord | null;
          };
          if (cancelled) return;
          setCommitDetails(res.details);
          setComparison(null);
          setCodeReview(res.codeReview);
          if (res.details.fileChanges.length > 0) {
            void handleSelectFile(res.details.fileChanges[0], selectedHash, undefined);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setBanner({
            kind: 'error',
            text: err instanceof Error ? err.message : String(err)
          });
        }
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    };

    void fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [projectId, selectedRepoRelPath, selectedHash, compareWithHash]);

  const handleLoadFileContent = useCallback(
    async (filePath: string, commitHashOverride?: string) => {
      const targetCommit = commitHashOverride ?? compareWithHash ?? selectedHash;
      if (!targetCommit) return;
      setLoadingContent(true);
      try {
        const res = (await rpc.call('getFileContent', {
          projectId,
          subRepoRelPath: selectedRepoRelPath,
          commitHash: targetCommit,
          filePath
        })) as GitFileContent;
        setFileContent(res);
      } catch (err) {
        setBanner({
          kind: 'error',
          text: err instanceof Error ? err.message : String(err)
        });
      } finally {
        setLoadingContent(false);
      }
    },
    [projectId, rpc, selectedRepoRelPath, selectedHash, compareWithHash]
  );

  const handleSelectFile = useCallback(
    async (file: GitFileChange, commitHashOverride?: string, fromHashOverride?: string) => {
      const targetCommit = commitHashOverride ?? compareWithHash ?? selectedHash;
      if (!targetCommit) return;
      const effectiveFrom =
        fromHashOverride !== undefined
          ? fromHashOverride
          : compareWithHash
            ? selectedHash ?? undefined
            : undefined;

      setSelectedFilePath(file.newPath);
      setLoadingDiff(true);
      setFileContent(null);
      void handleLoadFileContent(file.newPath, targetCommit);
      try {
        const diff = (await rpc.call('getFileDiff', {
          projectId,
          subRepoRelPath: selectedRepoRelPath,
          commitHash: targetCommit,
          fromHash: effectiveFrom,
          filePath: file.newPath,
          oldPath: file.oldPath !== file.newPath ? file.oldPath : undefined,
          staged: file.staged,
          untracked: file.untracked
        })) as GitFileDiff;
        setFileDiff(diff);
      } catch (err) {
        setBanner({
          kind: 'error',
          text: err instanceof Error ? err.message : String(err)
        });
      } finally {
        setLoadingDiff(false);
      }
    },
    [projectId, rpc, selectedRepoRelPath, selectedHash, compareWithHash, handleLoadFileContent]
  );

  const commits = graphData?.commits ?? [];
  const headHash = graphData?.headHash ?? null;
  const globalSettings: GitGraphGlobalSettings = graphData?.globalSettings ?? {
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
    graphColors: [],
    columnWidths: DEFAULT_COLUMN_WIDTHS
  };
  const repoSettings: RepoSettings = graphData?.repoSettings ?? {
    selectedBranches: [],
    showRemoteBranches: true,
    showStashes: true,
    showTags: true,
    showUncommittedChanges: true,
    showUntrackedFiles: true,
    onlyFollowFirstParent: false,
    commitOrdering: 'date',
    issueLinkingRules: [],
    pullRequestConfig: {
      provider: 'github',
      remoteName: 'origin',
      targetBranch: 'main'
    }
  };

  const layout = useMemo(
    () => computeGraphLayout(commits, headHash, globalSettings.graphColors),
    [commits, headHash, globalSettings.graphColors]
  );

  const graphColumnWidth = useMemo(
    () => Math.max(48, PAD_X * 2 + (layout.maxLane + 1) * LANE_WIDTH),
    [layout.maxLane]
  );

  // Find matches across commit subject, hash, author, or refs
  const matchingCommitIndices = useMemo(() => {
    const q = findQuery.trim().toLowerCase();
    if (!q) return [];
    const indices: number[] = [];
    commits.forEach((c, idx) => {
      const hay = [
        c.hash,
        c.abbreviatedHash,
        c.subject,
        c.authorName,
        c.authorEmail,
        ...c.refs.map((r) => (r.remote ? `${r.remote}/${r.name}` : r.name))
      ]
        .join(' ')
        .toLowerCase();
      if (hay.includes(q)) indices.push(idx);
    });
    return indices;
  }, [commits, findQuery]);

  const scrollToRow = useCallback((rowIdx: number) => {
    const container = tableScrollRef.current;
    if (!container) return;
    const targetTop = Math.max(0, rowIdx * ROW_HEIGHT - container.clientHeight / 3);
    container.scrollTo?.({ top: targetTop, behavior: 'smooth' });
  }, []);

  const handleScrollToHead = useCallback(() => {
    if (!headHash) return;
    const idx = commits.findIndex((c) => c.hash === headHash);
    if (idx >= 0) {
      setSelectedHash(headHash);
      setCompareWithHash(null);
      scrollToRow(idx);
    }
  }, [commits, headHash, scrollToRow]);

  const handleRunGitAction = useCallback(
    async (action: GitMutationAction) => {
      try {
        setBanner(null);
        const outcome = (await rpc.call('runGitAction', {
          projectId,
          subRepoRelPath: selectedRepoRelPath,
          action
        })) as { notice?: string } | undefined;
        await loadReposAndGraph(selectedRepoRelPath, maxCommits);
        if (outcome?.notice) setBanner({ kind: 'info', text: outcome.notice });
      } catch (err) {
        setBanner({
          kind: 'error',
          text: err instanceof Error ? err.message : String(err)
        });
      }
    },
    [projectId, rpc, selectedRepoRelPath, loadReposAndGraph, maxCommits]
  );

  const handleInitRepo = useCallback(async () => {
    if (!projectId || initializingRepo) return;
    setInitializingRepo(true);
    setBanner(null);
    try {
      await rpc.call('runGitAction', {
        projectId,
        subRepoRelPath: '',
        action: 'init'
      });
      await loadReposAndGraph();
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setInitializingRepo(false);
    }
  }, [projectId, initializingRepo, rpc, loadReposAndGraph]);

  const handleUpdateRepoSettings = useCallback(
    async (patch: Partial<RepoSettings>) => {
      try {
        await rpc.call('updateRepoSettings', {
          projectId,
          subRepoRelPath: selectedRepoRelPath,
          patch
        });
        await loadReposAndGraph(selectedRepoRelPath, maxCommits);
      } catch (err) {
        setBanner({
          kind: 'error',
          text: err instanceof Error ? err.message : String(err)
        });
      }
    },
    [projectId, rpc, selectedRepoRelPath, loadReposAndGraph, maxCommits]
  );

  const handleUpdateGlobalSettings = useCallback(
    async (patch: Partial<GitGraphGlobalSettings>) => {
      try {
        await rpc.call('updateGlobalSettings', { patch });
        setGraphData((prev) =>
          prev
            ? {
                ...prev,
                globalSettings: { ...prev.globalSettings, ...patch }
              }
            : prev
        );
      } catch (err) {
        setBanner({
          kind: 'error',
          text: err instanceof Error ? err.message : String(err)
        });
      }
    },
    [rpc]
  );

  const [colWidths, setColWidths] = useState<GitGraphColumnWidths>(() => ({
    description: globalSettings.columnWidths?.description,
    date: globalSettings.columnWidths?.date ?? DEFAULT_COLUMN_WIDTHS.date,
    author: globalSettings.columnWidths?.author ?? DEFAULT_COLUMN_WIDTHS.author,
    commit: globalSettings.columnWidths?.commit ?? DEFAULT_COLUMN_WIDTHS.commit
  }));
  const [activeResizeCol, setActiveResizeCol] = useState<'description' | 'date' | 'author' | 'commit' | null>(null);
  const colWidthsRef = useRef(colWidths);
  colWidthsRef.current = colWidths;
  const isResizingRef = useRef(false);
  const descHeaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isResizingRef.current && globalSettings.columnWidths) {
      setColWidths({
        description: globalSettings.columnWidths.description,
        date: globalSettings.columnWidths.date ?? DEFAULT_COLUMN_WIDTHS.date,
        author: globalSettings.columnWidths.author ?? DEFAULT_COLUMN_WIDTHS.author,
        commit: globalSettings.columnWidths.commit ?? DEFAULT_COLUMN_WIDTHS.commit
      });
    }
  }, [globalSettings.columnWidths]);

  const startResize = useCallback(
    (e: React.MouseEvent, column: 'description' | 'date' | 'author' | 'commit') => {
      e.preventDefault();
      e.stopPropagation();
      isResizingRef.current = true;
      setActiveResizeCol(column);
      const startX = e.clientX;
      const startWidth =
        column === 'description'
          ? (colWidthsRef.current.description ?? descHeaderRef.current?.getBoundingClientRect().width ?? 260)
          : colWidthsRef.current[column];
      let latestWidth = startWidth;

      const prevUserSelect = document.body.style.userSelect;
      const prevCursor = document.body.style.cursor;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const minWidth = column === 'commit' ? 50 : column === 'description' ? 150 : 60;
      const maxWidth = column === 'description' ? 1200 : 500;

      const onPointerMove = (moveEvt: MouseEvent) => {
        const deltaX = moveEvt.clientX - startX;
        // Resizer is on the right edge of the column: dragging right expands column, dragging left shrinks column
        const nextWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(startWidth + deltaX)));
        latestWidth = nextWidth;
        setColWidths((prev) => ({
          ...prev,
          [column]: nextWidth
        }));
      };

      const onPointerUp = () => {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        document.body.style.userSelect = prevUserSelect;
        document.body.style.cursor = prevCursor;
        isResizingRef.current = false;
        setActiveResizeCol(null);
        const nextAll = {
          ...colWidthsRef.current,
          [column]: latestWidth
        };
        void handleUpdateGlobalSettings({
          columnWidths: nextAll
        });
      };

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
    },
    [handleUpdateGlobalSettings]
  );

  const resetColumnWidth = useCallback(
    (column: 'description' | 'date' | 'author' | 'commit') => {
      if (column === 'description') {
        const nextAll = { ...colWidthsRef.current };
        delete nextAll.description;
        setColWidths(nextAll);
        void handleUpdateGlobalSettings({
          columnWidths: nextAll
        });
        return;
      }
      const nextWidth = DEFAULT_COLUMN_WIDTHS[column];
      const nextAll = {
        ...colWidthsRef.current,
        [column]: nextWidth
      };
      setColWidths(nextAll);
      void handleUpdateGlobalSettings({
        columnWidths: nextAll
      });
    },
    [handleUpdateGlobalSettings]
  );

  const handleCopyText = useCallback(async (text: string, label: string) => {
    if (!text) {
      setBanner({ kind: 'info', text: `Nothing to copy: ${label} is empty.` });
      return;
    }
    if (await copyText(text)) {
      setBanner({ kind: 'info', text: `${label} copied to clipboard.` });
    } else {
      setBanner({ kind: 'error', text: `Could not copy ${label.toLowerCase()}.` });
    }
  }, []);

  const handleViewTagDetails = useCallback(
    async (tagName: string) => {
      setActiveDialog({ kind: 'tag-details', tagName, details: null });
      try {
        const details = (await rpc.call('getTagDetails', {
          projectId,
          subRepoRelPath: selectedRepoRelPath,
          tagName
        })) as GitTagDetails;
        setActiveDialog({ kind: 'tag-details', tagName, details });
      } catch (err) {
        setBanner({
          kind: 'error',
          text: err instanceof Error ? err.message : String(err)
        });
      }
    },
    [projectId, rpc, selectedRepoRelPath]
  );

  const handleOpenPullRequest = useCallback(
    async (branchName: string) => {
      try {
        const res = (await rpc.call('buildPullRequestUrl', {
          projectId,
          subRepoRelPath: selectedRepoRelPath,
          sourceBranch: branchName
        })) as { url: string | null };
        if (res.url) {
          window.open(res.url, '_blank', 'noopener,noreferrer');
        } else {
          setBanner({
            kind: 'error',
            text: 'Could not derive a Pull Request URL from the configured remote.'
          });
        }
      } catch (err) {
        setBanner({
          kind: 'error',
          text: err instanceof Error ? err.message : String(err)
        });
      }
    },
    [projectId, rpc, selectedRepoRelPath]
  );

  const handleAskAgent = useCallback(
    async (target: { commitHash: string; fromHash?: string; filePath?: string }) => {
      const { commitHash, fromHash, filePath } = target;
      try {
        setBanner({
          kind: 'info',
          text: 'Preparing agent draft…'
        });
        const res = (await rpc.call('draftAgentAboutCommit', {
          projectId,
          subRepoRelPath: selectedRepoRelPath,
          commitHash,
          fromHash,
          filePath
        })) as { ok: boolean; prompt: string; title: string };

        const targetTitle = res.title;
        const targetView = filePath ? `${commitHash}:${filePath}` : commitHash;

        if (navigate?.openPanelAgent) {
          const opened = navigate.openPanelAgent({
            draft: {
              prompt: res.prompt,
              view: targetView,
              ...(projectId ? { projectId } : {})
            },
            title: targetTitle
          });
          if (opened) {
            setBanner({
              kind: 'info',
              text: `Draft opened in side panel: ${targetTitle}`
            });
            return;
          }
        }

        const fallback = (await rpc.call('askAgentAboutCommit', {
          projectId,
          subRepoRelPath: selectedRepoRelPath,
          commitHash,
          fromHash,
          filePath
        })) as { threadId: string; title: string };

        setBanner({
          kind: 'info',
          text: `Spawned Agent thread: ${fallback.title}`
        });
        navigate?.toThread?.(fallback.threadId);
      } catch (err) {
        setBanner({
          kind: 'error',
          text: err instanceof Error ? err.message : String(err)
        });
      }
    },
    [projectId, rpc, selectedRepoRelPath, navigate]
  );

  const handleStartCodeReview = useCallback(async () => {
    if (!selectedHash) return;
    const fromHash = compareWithHash ? selectedHash : null;
    const toHash = compareWithHash ?? selectedHash;
    try {
      const review = (await rpc.call('codeReviewStart', {
        projectId,
        subRepoRelPath: selectedRepoRelPath,
        fromHash,
        toHash
      })) as CodeReviewRecord;
      setCodeReview(review);
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err)
      });
    }
  }, [projectId, rpc, selectedRepoRelPath, selectedHash, compareWithHash]);

  const handleToggleReviewedFile = useCallback(
    async (filePath: string, reviewed: boolean) => {
      if (!selectedHash) return;
      const fromHash = compareWithHash ? selectedHash : null;
      const toHash = compareWithHash ?? selectedHash;
      try {
        const review = (await rpc.call('codeReviewToggleFile', {
          projectId,
          subRepoRelPath: selectedRepoRelPath,
          fromHash,
          toHash,
          filePath,
          reviewed
        })) as CodeReviewRecord;
        setCodeReview(review);
      } catch (err) {
        setBanner({
          kind: 'error',
          text: err instanceof Error ? err.message : String(err)
        });
      }
    },
    [projectId, rpc, selectedRepoRelPath, selectedHash, compareWithHash]
  );

  const handleEndCodeReview = useCallback(async () => {
    if (!selectedHash) return;
    const fromHash = compareWithHash ? selectedHash : null;
    const toHash = compareWithHash ?? selectedHash;
    try {
      await rpc.call('codeReviewEnd', {
        projectId,
        subRepoRelPath: selectedRepoRelPath,
        fromHash,
        toHash
      });
      setCodeReview(null);
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err)
      });
    }
  }, [projectId, rpc, selectedRepoRelPath, selectedHash, compareWithHash]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindOpen(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleScrollToHead();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        void loadReposAndGraph(selectedRepoRelPath, maxCommits);
        return;
      }
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
        } else if (activeDialog) {
          setActiveDialog(null);
        } else if (findOpen) {
          setFindOpen(false);
        } else if (selectedHash) {
          setSelectedHash(null);
          setCompareWithHash(null);
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (commits.length === 0) return;
        const currentIdx = selectedHash
          ? commits.findIndex((c) => c.hash === selectedHash)
          : -1;
        const nextIdx =
          e.key === 'ArrowDown'
            ? Math.min(commits.length - 1, currentIdx + 1)
            : Math.max(0, currentIdx <= 0 ? 0 : currentIdx - 1);
        const nextCommit = commits[nextIdx];
        if (nextCommit) {
          e.preventDefault();
          setSelectedHash(nextCommit.hash);
          setCompareWithHash(null);
        }
      }
    },
    [
      commits,
      selectedHash,
      contextMenu,
      activeDialog,
      findOpen,
      handleScrollToHead,
      loadReposAndGraph,
      selectedRepoRelPath,
      maxCommits
    ]
  );

  const renderRefBadge = (commit: GitCommitNode, ref: GitRefBadge, idx: number) => {
    const className =
      ref.type === 'head'
        ? `gg-ref-badge gg-ref-head ${ref.isHead ? 'is-current' : ''}`
        : ref.type === 'remote'
          ? 'gg-ref-badge gg-ref-remote'
          : ref.type === 'tag'
            ? 'gg-ref-badge gg-ref-tag'
            : 'gg-ref-badge gg-ref-stash';

    const icon =
      ref.type === 'remote'
        ? '☁'
        : ref.type === 'tag'
          ? '🏷'
          : ref.type === 'stash'
            ? '📦'
            : ref.isHead
              ? '●'
              : '⑂';

    const displayName =
      ref.type === 'remote' && ref.remote
        ? `${ref.remote}/${ref.name}`
        : ref.name;

    return (
      <span
        key={`${ref.type}:${ref.remote ?? ''}:${ref.name}:${idx}`}
        className={className}
        title={
          ref.type === 'head'
            ? ref.isHead
              ? `Current branch: ${ref.name}`
              : `Branch: ${ref.name} (Double-click to checkout)`
            : ref.type === 'remote'
              ? `Remote branch: ${displayName}`
              : ref.type === 'tag'
                ? `Tag: ${ref.name}`
                : `Stash: ${ref.name}`
        }
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (ref.type === 'head') {
            setContextMenu({
              kind: 'branch',
              commit,
              ref,
              x: e.clientX,
              y: e.clientY
            });
          } else if (ref.type === 'remote') {
            setContextMenu({
              kind: 'remote-branch',
              commit,
              ref,
              x: e.clientX,
              y: e.clientY
            });
          } else if (ref.type === 'tag') {
            setContextMenu({
              kind: 'tag',
              commit,
              ref,
              x: e.clientX,
              y: e.clientY
            });
          } else if (ref.type === 'stash') {
            setContextMenu({
              kind: 'stash',
              commit,
              selector: ref.selector || ref.name,
              x: e.clientX,
              y: e.clientY
            });
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (ref.type === 'head' && !ref.isHead) {
            void handleRunGitAction({
              kind: 'checkout-branch',
              branchName: ref.name
            });
          }
        }}
      >
        <span className="gg-ref-icon">{icon}</span>
        <span className="gg-ref-name">{displayName}</span>
      </span>
    );
  };

  const renderCommitSubject = (subject: string) => {
    const tokens = tokenizeCommitMessage(subject, repoSettings.issueLinkingRules);
    return tokens.map((tok, idx) => {
      if (tok.kind === 'code') {
        return (
          <code
            key={idx}
            style={{
              background: 'rgba(255,255,255,0.08)',
              padding: '0 4px',
              borderRadius: '3px',
              fontSize: '11px'
            }}
          >
            {tok.text}
          </code>
        );
      }
      if (tok.kind === 'link' && tok.href) {
        return (
          <a
            key={idx}
            href={tok.href}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: 'var(--accent-color, #4da3ff)' }}
          >
            {tok.text}
          </a>
        );
      }
      return <React.Fragment key={idx}>{tok.text}</React.Fragment>;
    });
  };

  const detailsOpen = Boolean(selectedHash);
  const isInlineDetails = globalSettings.commitDetailsLocation === 'inline';

  const [inlineDetailsHeight, setInlineDetailsHeight] = useState<number>(340);
  const [visibleWidth, setVisibleWidth] = useState<number>(0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const inlineDetailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el) {
        setVisibleWidth(el.clientWidth);
        setScrollLeft(el.scrollLeft);
      }
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [graphData, loading, commits.length]);

  const inlineMarginLeft = Math.max(graphColumnWidth + 8, scrollLeft + 8);
  const inlineWidth =
    visibleWidth > 0
      ? Math.max(280, scrollLeft + visibleWidth - inlineMarginLeft - 16)
      : undefined;

  const expandedRow = useMemo(() => {
    if (!detailsOpen || !isInlineDetails) return -1;
    const targetHash = compareWithHash ?? selectedHash;
    if (!targetHash) return -1;
    return commits.findIndex((c) => c.hash === targetHash);
  }, [detailsOpen, isInlineDetails, compareWithHash, selectedHash, commits]);

  useEffect(() => {
    const el = inlineDetailsRef.current;
    if (!el) return;
    const update = () => {
      if (el) {
        const h = el.offsetHeight;
        if (h > 0) setInlineDetailsHeight(h);
      }
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [
    isInlineDetails,
    detailsOpen,
    selectedHash,
    compareWithHash,
    commitDetails,
    comparison,
    fileDiff,
    loadingDetails,
    loadingDiff
  ]);

  const svgHeight = useMemo(() => {
    const base = commits.length * ROW_HEIGHT;
    if (isInlineDetails && detailsOpen && expandedRow >= 0) {
      return base + inlineDetailsHeight + 12;
    }
    return base;
  }, [commits.length, isInlineDetails, detailsOpen, expandedRow, inlineDetailsHeight]);

  const getNodeY = useCallback(
    (row: number) => {
      if (isInlineDetails && detailsOpen && expandedRow >= 0 && row > expandedRow) {
        return row * ROW_HEIGHT + inlineDetailsHeight + 12 + ROW_HEIGHT / 2;
      }
      return row * ROW_HEIGHT + ROW_HEIGHT / 2;
    },
    [isInlineDetails, detailsOpen, expandedRow, inlineDetailsHeight]
  );

  return (
    <div
      className="gg-root"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid="gg-project-tab"
    >
      <ControlBar
        projects={projectList}
        selectedProjectId={projectId}
        onSelectProject={(pId) => {
          setSelectedProjectId(pId);
          setSelectedHash(null);
          setCompareWithHash(null);
          void loadReposAndGraph(undefined, undefined, pId);
        }}
        repos={repos}
        selectedRepoRelPath={selectedRepoRelPath}
        onSelectRepo={(relPath) => {
          setSelectedHash(null);
          setCompareWithHash(null);
          setSelectedRepoRelPath(relPath);
          void loadReposAndGraph(relPath, maxCommits);
        }}
        branches={graphData?.branches ?? []}
        remoteBranches={graphData?.remoteBranches ?? []}
        repoSettings={repoSettings}
        globalSettings={globalSettings}
        loading={loading}
        findOpen={findOpen}
        headerActions={headerActions}
        onUpdateRepoSettings={(patch) => void handleUpdateRepoSettings(patch)}
        onUpdateGlobalSettings={(patch) => void handleUpdateGlobalSettings(patch)}
        onFetch={() =>
          void handleRunGitAction({
            kind: 'fetch',
            all: true,
            prune: globalSettings.fetchAndPrune,
            pruneTags: globalSettings.fetchAndPruneTags
          })
        }
        onPush={() => {
          const branch = graphData?.currentBranch;
          if (branch) setActiveDialog({ kind: 'push-branch', branchName: branch });
        }}
        canPush={Boolean(graphData?.currentBranch)}
        onScrollToHead={handleScrollToHead}
        onToggleFind={() => setFindOpen((prev) => !prev)}
        onOpenRepoSettings={() => setSettingsOpen(true)}
        onRefresh={() => void loadReposAndGraph(selectedRepoRelPath, maxCommits)}
      />

      {banner && (
        <div
          className={`gg-banner ${banner.kind === 'error' ? 'gg-banner-error' : 'gg-banner-info'}`}
          data-testid="gg-banner"
        >
          <span>{banner.text}</span>
          <button
            type="button"
            className="gg-btn gg-btn-icon"
            onClick={() => setBanner(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="gg-workspace">
        {findOpen && (
          <FindWidget
            query={findQuery}
            matchCount={matchingCommitIndices.length}
            activeMatchIndex={activeMatchIdx}
            onChangeQuery={(q) => {
              setFindQuery(q);
              setActiveMatchIdx(0);
            }}
            onNext={() => {
              if (matchingCommitIndices.length === 0) return;
              const next = (activeMatchIdx + 1) % matchingCommitIndices.length;
              setActiveMatchIdx(next);
              const rowIdx = matchingCommitIndices[next];
              setSelectedHash(commits[rowIdx].hash);
              scrollToRow(rowIdx);
            }}
            onPrev={() => {
              if (matchingCommitIndices.length === 0) return;
              const prev =
                (activeMatchIdx - 1 + matchingCommitIndices.length) %
                matchingCommitIndices.length;
              setActiveMatchIdx(prev);
              const rowIdx = matchingCommitIndices[prev];
              setSelectedHash(commits[rowIdx].hash);
              scrollToRow(rowIdx);
            }}
            onClose={() => setFindOpen(false)}
          />
        )}

        <div className="gg-table-container">
          <div className="gg-table-header-scroll" ref={headerScrollRef}>
            <div className="gg-table-header">
              <div
                style={{
                  width: `${graphColumnWidth}px`,
                  minWidth: `${graphColumnWidth}px`,
                  maxWidth: `${graphColumnWidth}px`,
                  flex: `0 0 ${graphColumnWidth}px`,
                  paddingLeft: '8px',
                  boxSizing: 'border-box'
                }}
              >
                Graph
              </div>
              <div
                ref={descHeaderRef}
                style={{
                  ...(colWidths.description !== undefined
                    ? {
                        width: `${colWidths.description}px`,
                        minWidth: `${colWidths.description}px`,
                        maxWidth: `${colWidths.description}px`,
                        flex: `0 0 ${colWidths.description}px`
                      }
                    : {
                        flex: '1 1 0px',
                        minWidth: '150px'
                      }),
                  padding: '0 8px',
                  boxSizing: 'border-box'
                }}
              >
                Description
              </div>
              <div
                className={`gg-col-resizer ${activeResizeCol === 'description' ? 'active' : ''}`}
                title="Resize Description · Double-click to auto-fit"
                data-testid="gg-col-resizer-description"
                onMouseDown={(e) => startResize(e, 'description')}
                onDoubleClick={() => resetColumnWidth('description')}
              />
              <div
                style={{
                  width: `${colWidths.date}px`,
                  minWidth: `${colWidths.date}px`,
                  maxWidth: `${colWidths.date}px`,
                  flex: `0 0 ${colWidths.date}px`,
                  padding: '0 6px',
                  boxSizing: 'border-box'
                }}
              >
                Date
              </div>
              <div
                className={`gg-col-resizer ${activeResizeCol === 'date' ? 'active' : ''}`}
                title="Resize Date · Double-click to reset"
                data-testid="gg-col-resizer-date"
                onMouseDown={(e) => startResize(e, 'date')}
                onDoubleClick={() => resetColumnWidth('date')}
              />
              <div
                style={{
                  width: `${colWidths.author}px`,
                  minWidth: `${colWidths.author}px`,
                  maxWidth: `${colWidths.author}px`,
                  flex: `0 0 ${colWidths.author}px`,
                  padding: '0 6px',
                  boxSizing: 'border-box'
                }}
              >
                Author
              </div>
              <div
                className={`gg-col-resizer ${activeResizeCol === 'author' ? 'active' : ''}`}
                title="Resize Author · Double-click to reset"
                data-testid="gg-col-resizer-author"
                onMouseDown={(e) => startResize(e, 'author')}
                onDoubleClick={() => resetColumnWidth('author')}
              />
              <div
                style={{
                  width: `${colWidths.commit}px`,
                  minWidth: `${colWidths.commit}px`,
                  maxWidth: `${colWidths.commit}px`,
                  flex: `0 0 ${colWidths.commit}px`,
                  textAlign: 'right',
                  padding: '0 6px',
                  boxSizing: 'border-box'
                }}
              >
                Commit
              </div>
              <div
                className={`gg-col-resizer ${activeResizeCol === 'commit' ? 'active' : ''}`}
                title="Resize Commit · Double-click to reset"
                data-testid="gg-col-resizer-commit"
                onMouseDown={(e) => startResize(e, 'commit')}
                onDoubleClick={() => resetColumnWidth('commit')}
              />
            </div>
          </div>

          {loading && !graphData ? (
            <div className="gg-empty">Loading Git Tree…</div>
          ) : errorMessage ? (
            <div className="gg-empty">
              <div>Failed to load Git Tree: {errorMessage}</div>
              <button
                type="button"
                className="gg-btn"
                style={{ marginTop: '8px' }}
                onClick={() => void loadReposAndGraph(selectedRepoRelPath, maxCommits)}
              >
                Retry
              </button>
            </div>
          ) : repos.length === 0 ? (
            <div className="gg-empty" style={{ gap: '12px' }}>
              <div>No Git repositories found in this project.</div>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                data-testid="gg-init-repo-btn"
                disabled={initializingRepo}
                onClick={() => void handleInitRepo()}
              >
                {initializingRepo ? 'Initializing…' : 'Initialize Git Repository'}
              </button>
            </div>
          ) : commits.length === 0 ? (
            <div className="gg-empty">
              {headHash
                ? 'No commits match the current branch filters.'
                : 'Repository initialized with no commits or uncommitted changes yet.'}
            </div>
          ) : (
            <div
              className="gg-table-scroll"
              ref={tableScrollRef}
              onScroll={(e) => {
                const sl = e.currentTarget.scrollLeft;
                if (sl !== scrollLeft) {
                  setScrollLeft(sl);
                }
                if (headerScrollRef.current) {
                  headerScrollRef.current.scrollLeft = sl;
                }
              }}
            >
              <div className="gg-rows-wrapper">
                {/* SVG Graph Overlay (always rendered, dynamically expanding when inline details are open) */}
                <svg
                  className="gg-svg-overlay"
                  width={graphColumnWidth}
                  height={svgHeight}
                  data-testid="gg-svg-dag"
                >
                  {layout.segments.map((seg, idx) => (
                    <path
                      key={idx}
                      d={buildSegmentSvgPath({
                        segment: seg,
                        rowHeight: ROW_HEIGHT,
                        laneWidth: LANE_WIDTH,
                        padX: PAD_X,
                        style: globalSettings.graphStyle,
                        expandedRow: isInlineDetails && detailsOpen ? expandedRow : -1,
                        detailsHeight:
                          isInlineDetails && detailsOpen ? inlineDetailsHeight + 12 : 0
                      })}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={2}
                      strokeDasharray={seg.isUncommitted ? '3 3' : undefined}
                    />
                  ))}
                  {layout.nodes.map((node) => {
                    const cx = PAD_X + node.lane * LANE_WIDTH;
                    const cy = getNodeY(node.row);
                    const isSelected = selectedHash === node.commit.hash;
                    if (node.commit.isUncommitted) {
                      return (
                        <circle
                          key={node.commit.hash}
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 5.5 : 4.5}
                          fill="var(--bg-primary, #12151a)"
                          stroke={node.color}
                          strokeWidth={isSelected ? 2.5 : 2}
                          strokeDasharray="2 2"
                        />
                      );
                    }
                    if (node.commit.isStash) {
                      return (
                        <rect
                          key={node.commit.hash}
                          x={cx - (isSelected ? 5 : 4)}
                          y={cy - (isSelected ? 5 : 4)}
                          width={isSelected ? 10 : 8}
                          height={isSelected ? 10 : 8}
                          rx={2}
                          fill="var(--bg-primary, #12151a)"
                          stroke={node.color}
                          strokeWidth={isSelected ? 2.5 : 2}
                        />
                      );
                    }
                    if (node.isMerge) {
                      return (
                        <g key={node.commit.hash}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isSelected ? 5.5 : 4.5}
                            fill="var(--bg-primary, #12151a)"
                            stroke={isSelected ? '#ffffff' : node.color}
                            strokeWidth={isSelected ? 2.5 : 2}
                          />
                          <circle cx={cx} cy={cy} r={2} fill={node.color} />
                        </g>
                      );
                    }
                    return (
                      <circle
                        key={node.commit.hash}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 5.5 : node.commit.isHead ? 5 : 4}
                        fill={node.color}
                        stroke={
                          isSelected || node.commit.isHead
                            ? '#ffffff'
                            : 'var(--bg-primary, #12151a)'
                        }
                        strokeWidth={isSelected ? 2 : node.commit.isHead ? 1.5 : 1}
                      />
                    );
                  })}
                </svg>

                {layout.nodes.map((node) => {
                  const { commit } = node;
                  const isSelected = selectedHash === commit.hash;
                  const isCompared = compareWithHash === commit.hash;
                  const isMatch =
                    findQuery.trim().length > 0 &&
                    matchingCommitIndices.includes(node.row);
                  const isMuted =
                    (globalSettings.muteNonAncestors && !node.isAncestorOfHead) ||
                    (globalSettings.muteMergeCommits && node.isMerge);

                  const displayDate =
                    globalSettings.dateType === 'commit'
                      ? commit.commitDate
                      : commit.authorDate;

                  return (
                    <React.Fragment key={commit.hash}>
                      <div
                        className={[
                          'gg-commit-row',
                          isSelected ? 'selected' : '',
                          isCompared ? 'compared' : '',
                          isMuted ? 'muted' : '',
                          isMatch ? 'search-match' : '',
                          commit.isUncommitted ? 'uncommitted' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={(e) => {
                          if ((e.ctrlKey || e.metaKey) && selectedHash && selectedHash !== commit.hash) {
                            setCompareWithHash(commit.hash);
                          } else {
                            setSelectedHash((prev) =>
                              prev === commit.hash && !compareWithHash ? null : commit.hash
                            );
                            setCompareWithHash(null);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (commit.isUncommitted) {
                            setContextMenu({
                              kind: 'uncommitted',
                              commit,
                              x: e.clientX,
                              y: e.clientY
                            });
                          } else if (commit.isStash && commit.stashSelector) {
                            setContextMenu({
                              kind: 'stash',
                              commit,
                              selector: commit.stashSelector,
                              x: e.clientX,
                              y: e.clientY
                            });
                          } else {
                            setContextMenu({
                              kind: 'commit',
                              commit,
                              x: e.clientX,
                              y: e.clientY
                            });
                          }
                        }}
                        data-testid={`gg-commit-row-${commit.abbreviatedHash}`}
                      >
                        <div
                          className="gg-graph-spacer"
                          style={{
                            width: `${graphColumnWidth}px`,
                            minWidth: `${graphColumnWidth}px`,
                            maxWidth: `${graphColumnWidth}px`,
                            flex: `0 0 ${graphColumnWidth}px`,
                            boxSizing: 'border-box'
                          }}
                        />
                        <div
                          className="gg-commit-desc"
                          style={{
                            ...(colWidths.description !== undefined
                              ? {
                                  width: `${colWidths.description}px`,
                                  minWidth: `${colWidths.description}px`,
                                  maxWidth: `${colWidths.description}px`,
                                  flex: `0 0 ${colWidths.description}px`
                                }
                              : {
                                  flex: '1 1 0px',
                                  minWidth: '150px'
                                }),
                            padding: '0 8px',
                            boxSizing: 'border-box'
                          }}
                        >
                          {commit.refs.map((ref, rIdx) => renderRefBadge(commit, ref, rIdx))}
                          <span className="gg-commit-subject">
                            {renderCommitSubject(commit.subject)}
                          </span>
                        </div>
                        <div
                          className="gg-commit-date"
                          style={{
                            width: `${colWidths.date}px`,
                            minWidth: `${colWidths.date}px`,
                            maxWidth: `${colWidths.date}px`,
                            flex: `0 0 ${colWidths.date}px`,
                            padding: '0 6px',
                            boxSizing: 'border-box'
                          }}
                        >
                          {commit.isUncommitted
                            ? 'Working Tree'
                            : formatCommitTimestamp(displayDate, globalSettings.dateFormat)}
                        </div>
                        <div
                          className="gg-commit-author"
                          style={{
                            width: `${colWidths.author}px`,
                            minWidth: `${colWidths.author}px`,
                            maxWidth: `${colWidths.author}px`,
                            flex: `0 0 ${colWidths.author}px`,
                            padding: '0 6px',
                            boxSizing: 'border-box'
                          }}
                          title={commit.authorEmail}
                        >
                          {commit.authorName}
                        </div>
                        <div
                          className="gg-commit-hash"
                          style={{
                            width: `${colWidths.commit}px`,
                            minWidth: `${colWidths.commit}px`,
                            maxWidth: `${colWidths.commit}px`,
                            flex: `0 0 ${colWidths.commit}px`,
                            textAlign: 'right',
                            padding: '0 6px',
                            boxSizing: 'border-box'
                          }}
                        >
                          {commit.abbreviatedHash}
                        </div>
                      </div>

                      {isInlineDetails &&
                        detailsOpen &&
                        ((!compareWithHash && isSelected) ||
                          (compareWithHash && isCompared)) && (
                          <div
                            ref={inlineDetailsRef}
                            className="gg-inline-details-wrapper"
                            style={{
                              marginLeft: `${inlineMarginLeft}px`,
                              width: inlineWidth !== undefined ? `${inlineWidth}px` : undefined,
                              maxWidth: inlineWidth !== undefined ? `${inlineWidth}px` : '100%',
                              marginBottom: '8px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <CommitDetailsPane
                              mode={compareWithHash ? 'comparison' : 'single'}
                              details={commitDetails}
                              comparison={comparison}
                              loading={loadingDetails}
                              inline={true}
                              fileViewType={globalSettings.fileViewType}
                              compactFolders={globalSettings.compactFolders}
                              diffViewMode={globalSettings.diffViewMode}
                              dateFormat={globalSettings.dateFormat}
                              issueRules={repoSettings.issueLinkingRules}
                              codeReview={codeReview}
                              selectedFilePath={selectedFilePath}
                              fileDiff={fileDiff}
                              loadingDiff={loadingDiff}
                              fileContent={fileContent}
                              loadingContent={loadingContent}
                              onSelectFile={(f) => void handleSelectFile(f)}
                              onLoadFileContent={(fp) => void handleLoadFileContent(fp)}
                              onChangeFileViewType={(vt: FileViewType) =>
                                void handleUpdateGlobalSettings({ fileViewType: vt })
                              }
                              onToggleCompactFolders={() =>
                                void handleUpdateGlobalSettings({
                                  compactFolders: !globalSettings.compactFolders
                                })
                              }
                              onChangeDiffViewMode={(dm: DiffViewMode) =>
                                void handleUpdateGlobalSettings({ diffViewMode: dm })
                              }
                              onStartCodeReview={() => void handleStartCodeReview()}
                              onToggleReviewedFile={(fp, rev) =>
                                void handleToggleReviewedFile(fp, rev)
                              }
                              onEndCodeReview={() => void handleEndCodeReview()}
                              onSelectParentHash={(hash) => {
                                setSelectedHash(hash);
                                setCompareWithHash(null);
                                const idx = commits.findIndex((c) => c.hash === hash);
                                if (idx >= 0) scrollToRow(idx);
                              }}
                              onAskAgent={(fp) => {
                                const fromHash = compareWithHash ? selectedHash : null;
                                const toHash = compareWithHash ?? selectedHash ?? '*';
                                void handleAskAgent({
                                  commitHash: toHash,
                                  fromHash: fromHash ?? undefined,
                                  filePath: fp
                                });
                              }}
                              onCopyText={handleCopyText}
                              onClose={() => {
                                setSelectedHash(null);
                                setCompareWithHash(null);
                              }}
                            />
                          </div>
                        )}
                    </React.Fragment>
                  );
                })}
              </div>

              {graphData?.hasMore && (
                <div className="gg-load-more-row">
                  <button
                    type="button"
                    className="gg-btn"
                    onClick={() => {
                      const nextMax = maxCommits + (globalSettings.loadMoreCommits || 100);
                      setMaxCommits(nextMax);
                      void loadReposAndGraph(selectedRepoRelPath, nextMax);
                    }}
                    data-testid="gg-load-more-btn"
                  >
                    Load {globalSettings.loadMoreCommits || 100} More Commits
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Docked Details & Diff Inspector */}
        {!isInlineDetails && detailsOpen && (
          <CommitDetailsPane
            mode={compareWithHash ? 'comparison' : 'single'}
            details={commitDetails}
            comparison={comparison}
            loading={loadingDetails}
            inline={false}
            fileViewType={globalSettings.fileViewType}
            compactFolders={globalSettings.compactFolders}
            diffViewMode={globalSettings.diffViewMode}
            dateFormat={globalSettings.dateFormat}
            issueRules={repoSettings.issueLinkingRules}
            codeReview={codeReview}
            selectedFilePath={selectedFilePath}
            fileDiff={fileDiff}
            loadingDiff={loadingDiff}
            fileContent={fileContent}
            loadingContent={loadingContent}
            onSelectFile={(f) => void handleSelectFile(f)}
            onLoadFileContent={(fp) => void handleLoadFileContent(fp)}
            onChangeFileViewType={(vt: FileViewType) =>
              void handleUpdateGlobalSettings({ fileViewType: vt })
            }
            onToggleCompactFolders={() =>
              void handleUpdateGlobalSettings({
                compactFolders: !globalSettings.compactFolders
              })
            }
            onChangeDiffViewMode={(dm: DiffViewMode) =>
              void handleUpdateGlobalSettings({ diffViewMode: dm })
            }
            onStartCodeReview={() => void handleStartCodeReview()}
            onToggleReviewedFile={(fp, rev) => void handleToggleReviewedFile(fp, rev)}
            onEndCodeReview={() => void handleEndCodeReview()}
            onSelectParentHash={(hash) => {
              setSelectedHash(hash);
              setCompareWithHash(null);
              const idx = commits.findIndex((c) => c.hash === hash);
              if (idx >= 0) scrollToRow(idx);
            }}
            onAskAgent={(fp) => {
              const fromHash = compareWithHash ? selectedHash : null;
              const toHash = compareWithHash ?? selectedHash ?? '*';
              void handleAskAgent({
                commitHash: toHash,
                fromHash: fromHash ?? undefined,
                filePath: fp
              });
            }}
            onCopyText={handleCopyText}
            onClose={() => {
              setSelectedHash(null);
              setCompareWithHash(null);
            }}
          />
        )}
      </div>

      <ContextMenuOverlay
        target={contextMenu}
        currentBranch={graphData?.currentBranch ?? null}
        hasCommits={commits.some((c) => !c.isUncommitted)}
        onClose={() => setContextMenu(null)}
        onRunAction={(action) => void handleRunGitAction(action)}
        onOpenDialog={(dialog) => setActiveDialog(dialog)}
        onOpenPullRequest={(branch) => void handleOpenPullRequest(branch)}
        onViewTagDetails={(tag) => void handleViewTagDetails(tag)}
        onCopyText={handleCopyText}
        onAskAgent={(commitHash, filePath) => {
          void handleAskAgent({ commitHash, filePath });
        }}
      />

      <GitActionDialogModal
        dialog={activeDialog}
        remotes={graphData?.remotes ?? []}
        currentBranch={graphData?.currentBranch ?? null}
        onClose={() => setActiveDialog(null)}
        onRunAction={(action) => void handleRunGitAction(action)}
      />

      <RepoSettingsWidget
        open={settingsOpen}
        remotes={graphData?.remotes ?? []}
        repoSettings={repoSettings}
        globalSettings={globalSettings}
        onClose={() => setSettingsOpen(false)}
        onRunGitAction={(action) => void handleRunGitAction(action)}
        onUpdateRepoSettings={(patch) => void handleUpdateRepoSettings(patch)}
        onUpdateGlobalSettings={(patch) => void handleUpdateGlobalSettings(patch)}
        onExportRepoConfig={async () => {
          try {
            const res = (await rpc.call('exportRepoConfig', {
              projectId,
              subRepoRelPath: selectedRepoRelPath
            })) as { filePath: string };
            setBanner({
              kind: 'info',
              text: `Exported repository config to ${res.filePath}`
            });
          } catch (err) {
            setBanner({
              kind: 'error',
              text: err instanceof Error ? err.message : String(err)
            });
          }
        }}
      />
    </div>
  );
}

export const GitGraphProjectTab = GitTreeProjectTab;
