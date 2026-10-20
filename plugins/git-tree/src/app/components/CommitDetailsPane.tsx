import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import type {
  CodeReviewRecord,
  DiffViewMode,
  FileViewType,
  GitCommitComparison,
  GitCommitDetails,
  GitFileChange,
  GitFileContent,
  GitFileDiff,
  IssueLinkingRule
} from '../../server/types.js';
import {
  buildFileTree,
  buildSplitDiffRows,
  formatCommitTimestamp,
  tokenizeCommitMessage,
  type FileTreeNode
} from '../graph-layout.js';

const STORAGE_FILES_WIDTH_KEY = 'zcc.gitTree.commitDetailsFilesWidth';
const STORAGE_FILES_HEIGHT_KEY = 'zcc.gitTree.commitDetailsFilesHeight';
const STORAGE_PANE_HEIGHT_KEY = 'zcc.gitTree.commitDetailsHeight';
const STORAGE_PANE_WIDTH_KEY = 'zcc.gitTree.commitDetailsWidth';
const MIN_FILES_WIDTH = 200;
const MIN_FILES_HEIGHT = 100;
const MIN_PANE_HEIGHT = 260;
const MIN_PANE_WIDTH = 320;

function loadStoredNumber(key: string): number | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const val = Number(localStorage.getItem(key));
    return Number.isFinite(val) && val > 0 ? val : null;
  } catch {
    return null;
  }
}

function saveStoredNumber(key: string, val: number | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (val === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, String(val));
    }
  } catch {
    // best-effort
  }
}

function computeDefaultFilesWidth(
  fileChanges: GitFileChange[],
  fileViewType: FileViewType
): number {
  if (!fileChanges.length) return 290;
  let maxLen = 0;
  for (const c of fileChanges) {
    const text =
      fileViewType === 'list'
        ? (c.oldPath !== c.newPath ? `${c.oldPath} → ${c.newPath}` : c.newPath)
        : (c.newPath.split('/').pop() || c.newPath);
    if (text.length > maxLen) maxLen = text.length;
  }
  return Math.max(260, Math.min(650, Math.round(maxLen * 7.8 + 120)));
}

export interface CommitDetailsPaneProps {
  mode: 'single' | 'comparison';
  details: GitCommitDetails | null;
  comparison: GitCommitComparison | null;
  loading: boolean;
  inline: boolean;
  fileViewType: FileViewType;
  compactFolders: boolean;
  diffViewMode: DiffViewMode;
  dateFormat: 'relative' | 'iso' | 'datetime';
  issueRules: readonly IssueLinkingRule[];
  codeReview: CodeReviewRecord | null;
  selectedFilePath: string | null;
  fileDiff: GitFileDiff | null;
  loadingDiff: boolean;
  fileContent?: GitFileContent | null;
  loadingContent?: boolean;
  onSelectFile: (file: GitFileChange) => void;
  onLoadFileContent?: (filePath: string) => void;
  onChangeFileViewType: (viewType: FileViewType) => void;
  onToggleCompactFolders: () => void;
  onChangeDiffViewMode: (mode: DiffViewMode) => void;
  onStartCodeReview: () => void;
  onToggleReviewedFile: (filePath: string, reviewed: boolean) => void;
  onEndCodeReview: () => void;
  onSelectParentHash: (hash: string) => void;
  onAskAgent: (filePath?: string) => void;
  onCopyText: (text: string, label: string) => void;
  onClose: () => void;
}

export function CommitDetailsPane({
  mode,
  details,
  comparison,
  loading,
  inline,
  fileViewType,
  compactFolders,
  diffViewMode,
  dateFormat,
  issueRules,
  codeReview,
  selectedFilePath,
  fileDiff,
  loadingDiff,
  fileContent,
  loadingContent,
  onSelectFile,
  onLoadFileContent,
  onChangeFileViewType,
  onToggleCompactFolders,
  onChangeDiffViewMode,
  onStartCodeReview,
  onToggleReviewedFile,
  onEndCodeReview,
  onSelectParentHash,
  onAskAgent,
  onCopyText,
  onClose
}: CommitDetailsPaneProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'diff' | 'source'>('diff');
  const diffViewerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const columnsRef = useRef<HTMLDivElement | null>(null);
  const fileListRef = useRef<HTMLDivElement | null>(null);

  const fileChanges: GitFileChange[] = useMemo(() => {
    if (mode === 'comparison') return comparison?.fileChanges ?? [];
    return details?.fileChanges ?? [];
  }, [mode, details, comparison]);

  const commitKey =
    mode === 'comparison'
      ? `${comparison?.fromHash ?? ''}..${comparison?.toHash ?? ''}`
      : (details?.hash ?? '');

  const [paneHeight, setPaneHeight] = useState<number | null>(() => {
    return loadStoredNumber(STORAGE_PANE_HEIGHT_KEY);
  });

  const [paneWidth, setPaneWidth] = useState<number | null>(() => {
    return loadStoredNumber(STORAGE_PANE_WIDTH_KEY);
  });

  const [isStacked, setIsStacked] = useState<boolean>(false);
  const [isManualWidth, setIsManualWidth] = useState<boolean>(false);

  const [filesWidth, setFilesWidth] = useState<number>(() => {
    return computeDefaultFilesWidth(fileChanges, fileViewType);
  });

  const [isManualHeight, setIsManualHeight] = useState<boolean>(false);

  const [filesHeight, setFilesHeight] = useState<number>(() => {
    const est = fileChanges.length * 28 + 48;
    return Math.min(260, Math.max(MIN_FILES_HEIGHT, est));
  });

  const prevCommitKeyRef = useRef(commitKey);
  useEffect(() => {
    if (prevCommitKeyRef.current !== commitKey) {
      prevCommitKeyRef.current = commitKey;
      setIsManualWidth(false);
      setIsManualHeight(false);
    }
  }, [commitKey]);

  const colDragCleanupRef = useRef<(() => void) | null>(null);
  const rowDragCleanupRef = useRef<(() => void) | null>(null);
  const heightDragCleanupRef = useRef<(() => void) | null>(null);
  const widthDragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      colDragCleanupRef.current?.();
      rowDragCleanupRef.current?.();
      heightDragCleanupRef.current?.();
      widthDragCleanupRef.current?.();
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  useEffect(() => {
    const colEl = columnsRef.current;
    if (!colEl) return;
    const checkStacked = () => {
      if (colEl && colEl.clientWidth > 0) {
        setIsStacked(colEl.clientWidth <= 640);
      }
    };
    checkStacked();
    window.addEventListener('resize', checkStacked);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(checkStacked);
      ro.observe(colEl);
      return () => {
        window.removeEventListener('resize', checkStacked);
        ro.disconnect();
      };
    }
    return () => window.removeEventListener('resize', checkStacked);
  }, []);

  useLayoutEffect(() => {
    if (fileChanges.length === 0) return;

    const measure = () => {
      const listEl = fileListRef.current;
      const colEl = columnsRef.current;
      if (!listEl || !colEl) return;

      if (isStacked) {
        if (isManualHeight) return;
        const totalHeight = colEl.clientHeight > 0 ? colEl.clientHeight : 500;
        const halfHeight = Math.floor(totalHeight * 0.5);

        let actualItemsHeight = 0;
        const items = listEl.querySelectorAll<HTMLElement>('.gg-file-row, .gg-folder-row');
        if (items.length > 0) {
          items.forEach((it) => {
            actualItemsHeight += (it.offsetHeight || 26) + 2;
          });
          actualItemsHeight += 8;
        } else {
          actualItemsHeight = fileChanges.length * 26 + 8;
        }

        const neededHeight = Math.max(listEl.scrollHeight + 48, actualItemsHeight + 48);
        const targetHeight =
          neededHeight > halfHeight
            ? halfHeight
            : Math.max(MIN_FILES_HEIGHT, neededHeight);
        const clamped = Math.max(
          MIN_FILES_HEIGHT,
          Math.min(Math.floor(totalHeight * 0.8), targetHeight)
        );
        setFilesHeight(clamped);
      } else {
        if (isManualWidth) return;
        let maxRowNeeded = 0;
        const rows = listEl.querySelectorAll<HTMLElement>('.gg-file-row, .gg-folder-row');
        rows.forEach((row) => {
          const pathEl = row.querySelector<HTMLElement>('.gg-file-path');
          if (pathEl) {
            const pathDiff = Math.max(0, pathEl.scrollWidth - pathEl.clientWidth);
            const needed = row.offsetWidth + pathDiff;
            if (needed > maxRowNeeded) maxRowNeeded = needed;
          } else {
            if (row.scrollWidth > maxRowNeeded) maxRowNeeded = row.scrollWidth;
          }
        });

        let calculated = maxRowNeeded > 0 ? maxRowNeeded + 24 : 0;
        if (calculated <= 0) {
          calculated = computeDefaultFilesWidth(fileChanges, fileViewType);
        }

        const maxAllowed = colEl.clientWidth > 0 ? Math.floor(colEl.clientWidth * 0.6) : 650;
        const target = Math.max(
          MIN_FILES_WIDTH,
          Math.min(Math.max(MIN_FILES_WIDTH, maxAllowed), calculated)
        );
        setFilesWidth(target);
      }
    };

    measure();
    const rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [fileChanges, fileViewType, compactFolders, isManualWidth, isManualHeight, isStacked]);

  const handleRowResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    const startY = e.clientY;
    const startHeight = filesHeight;
    let latestHeight = startHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - startY;
      const colEl = columnsRef.current;
      const totalH = colEl && colEl.clientHeight > 0 ? colEl.clientHeight : 600;
      const maxAllowed = Math.floor(totalH * 0.8);
      latestHeight = Math.max(MIN_FILES_HEIGHT, Math.min(maxAllowed, Math.round(startHeight + deltaY)));
      setFilesHeight(latestHeight);
      setIsManualHeight(true);
    };

    const cleanup = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      rowDragCleanupRef.current = null;
    };

    const onMouseUp = () => {
      cleanup();
      saveStoredNumber(STORAGE_FILES_HEIGHT_KEY, latestHeight);
    };

    rowDragCleanupRef.current = cleanup;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleRowResizeDoubleClick = () => {
    setIsManualHeight(false);
    saveStoredNumber(STORAGE_FILES_HEIGHT_KEY, null);
  };

  const handleColResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const startX = e.clientX;
    const startWidth = filesWidth;
    let latestWidth = startWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX;
      const colEl = columnsRef.current;
      const maxAllowed = colEl && colEl.clientWidth > 0 ? Math.floor(colEl.clientWidth * 0.75) : 800;
      latestWidth = Math.max(MIN_FILES_WIDTH, Math.min(maxAllowed, Math.round(startWidth + deltaX)));
      setFilesWidth(latestWidth);
      setIsManualWidth(true);
    };

    const cleanup = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      colDragCleanupRef.current = null;
    };

    const onMouseUp = () => {
      cleanup();
      saveStoredNumber(STORAGE_FILES_WIDTH_KEY, latestWidth);
    };

    colDragCleanupRef.current = cleanup;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleColResizeDoubleClick = () => {
    setIsManualWidth(false);
    saveStoredNumber(STORAGE_FILES_WIDTH_KEY, null);
  };

  const handleTopResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    const startY = e.clientY;
    const currentHeight = containerRef.current?.offsetHeight ?? (paneHeight || 480);
    let latestHeight = currentHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaY = startY - ev.clientY;
      const maxHeight = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.88) : 900;
      latestHeight = Math.max(MIN_PANE_HEIGHT, Math.min(maxHeight, Math.round(currentHeight + deltaY)));
      setPaneHeight(latestHeight);
    };

    const cleanup = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      heightDragCleanupRef.current = null;
    };

    const onMouseUp = () => {
      cleanup();
      saveStoredNumber(STORAGE_PANE_HEIGHT_KEY, latestHeight);
    };

    heightDragCleanupRef.current = cleanup;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleBottomResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    const startY = e.clientY;
    const currentHeight = containerRef.current?.offsetHeight ?? (paneHeight || 480);
    let latestHeight = currentHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - startY;
      const maxHeight = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.88) : 900;
      latestHeight = Math.max(MIN_PANE_HEIGHT, Math.min(maxHeight, Math.round(currentHeight + deltaY)));
      setPaneHeight(latestHeight);
    };

    const cleanup = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      heightDragCleanupRef.current = null;
    };

    const onMouseUp = () => {
      cleanup();
      saveStoredNumber(STORAGE_PANE_HEIGHT_KEY, latestHeight);
    };

    heightDragCleanupRef.current = cleanup;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleHeightResizeDoubleClick = () => {
    setPaneHeight(null);
    saveStoredNumber(STORAGE_PANE_HEIGHT_KEY, null);
  };

  const handleLeftResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const startX = e.clientX;
    const currentWidth = containerRef.current?.offsetWidth ?? (paneWidth || 500);
    let latestWidth = currentWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaX = startX - ev.clientX;
      const maxWidth = typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.8) : 1000;
      latestWidth = Math.max(MIN_PANE_WIDTH, Math.min(maxWidth, Math.round(currentWidth + deltaX)));
      setPaneWidth(latestWidth);
    };

    const cleanup = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      widthDragCleanupRef.current = null;
    };

    const onMouseUp = () => {
      cleanup();
      saveStoredNumber(STORAGE_PANE_WIDTH_KEY, latestWidth);
    };

    widthDragCleanupRef.current = cleanup;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleLeftResizeDoubleClick = () => {
    setPaneWidth(null);
    saveStoredNumber(STORAGE_PANE_WIDTH_KEY, null);
  };

  const containerStyle = useMemo<React.CSSProperties | undefined>(() => {
    const style: React.CSSProperties = {};
    if (paneHeight) {
      style.height = `${paneHeight}px`;
      style.maxHeight = '88vh';
    }
    if (!inline && paneWidth) {
      style.width = `${paneWidth}px`;
      style.maxWidth = '80%';
    }
    return Object.keys(style).length > 0 ? style : undefined;
  }, [inline, paneHeight, paneWidth]);

  useEffect(() => {
    if (selectedFilePath && diffViewerRef.current) {
      diffViewerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedFilePath]);

  const fileTree = useMemo(
    () => buildFileTree(fileChanges, compactFolders),
    [fileChanges, compactFolders]
  );

  const reviewedSet = useMemo(
    () => new Set(codeReview?.reviewedFiles ?? []),
    [codeReview]
  );

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const renderTokens = (text: string) => {
    const tokens = tokenizeCommitMessage(text, issueRules);
    return tokens.map((tok, idx) => {
      if (tok.kind === 'code') {
        return <code key={idx}>{tok.text}</code>;
      }
      if (tok.kind === 'link' && tok.href) {
        return (
          <a key={idx} href={tok.href} target="_blank" rel="noreferrer">
            {tok.text}
          </a>
        );
      }
      return <React.Fragment key={idx}>{tok.text}</React.Fragment>;
    });
  };

  const renderFileItem = (change: GitFileChange, label: string, depth = 0) => {
    const isSelected = selectedFilePath === change.newPath;
    const isReviewed = reviewedSet.has(change.newPath);

    return (
      <div
        key={`${change.newPath}:${change.staged ? 'staged' : 'work'}`}
        className={`gg-file-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onClick={() => {
          onSelectFile(change);
          if (viewMode === 'source') {
            onLoadFileContent?.(change.newPath);
          }
        }}
        data-testid={`gg-file-row-${change.newPath}`}
      >
        {codeReview && (
          <input
            type="checkbox"
            checked={isReviewed}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onToggleReviewedFile(change.newPath, e.target.checked)}
            title="Mark file as reviewed"
          />
        )}
        <span className={`gg-file-status gg-file-status-${change.status}`}>
          {change.status}
        </span>
        <span
          className="gg-file-path"
          style={{
            textDecoration: isReviewed ? 'line-through' : undefined,
            opacity: isReviewed ? 0.65 : 1
          }}
          title={
            change.oldPath !== change.newPath
              ? `${change.oldPath} → ${change.newPath}`
              : change.newPath
          }
        >
          {label}
          {change.staged !== undefined && (
            <span className="gg-file-badge">
              ({change.staged ? 'staged' : 'unstaged'})
            </span>
          )}
        </span>
        <span className="gg-file-stat">
          {change.additions !== null && change.additions > 0 && (
            <span className="gg-stat-add">+{change.additions}</span>
          )}
          {change.deletions !== null && change.deletions > 0 && (
            <span className="gg-stat-del">-{change.deletions}</span>
          )}
        </span>
        <button
          type="button"
          className="gg-btn gg-btn-icon gg-btn-compact-10"
          title="Copy File Path"
          onClick={(e) => {
            e.stopPropagation();
            onCopyText(change.newPath, 'File path');
          }}
        >
          📋
        </button>
      </div>
    );
  };

  const renderTreeNodes = (nodes: FileTreeNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      if (node.kind === 'file' && node.fileChange) {
        return renderFileItem(node.fileChange, node.name, depth);
      }
      const isCollapsed = Boolean(collapsedFolders[node.path]);
      return (
        <React.Fragment key={`folder:${node.path}`}>
          <div
            className="gg-folder-row"
            style={{ paddingLeft: `${12 + depth * 14}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            <span>{isCollapsed ? '▸' : '▾'}</span>
            <span>📁 {node.name}</span>
          </div>
          {!isCollapsed && renderTreeNodes(node.children, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className={`gg-details-pane ${inline ? 'gg-details-inline inline' : ''}`}
      style={containerStyle}
      data-testid="gg-details-pane"
    >
      <div
        className="gg-details-top-resizer"
        onMouseDown={handleTopResizeMouseDown}
        onDoubleClick={handleHeightResizeDoubleClick}
        title="Drag to resize height · Double-click to reset"
        data-testid="gg-details-top-resizer"
      />
      {inline && (
        <div
          className="gg-details-bottom-resizer"
          onMouseDown={handleBottomResizeMouseDown}
          onDoubleClick={handleHeightResizeDoubleClick}
          title="Drag to resize height · Double-click to reset"
          data-testid="gg-details-bottom-resizer"
        />
      )}
      {!inline && (
        <div
          className="gg-details-left-resizer"
          onMouseDown={handleLeftResizeMouseDown}
          onDoubleClick={handleLeftResizeDoubleClick}
          title="Drag to resize pane width · Double-click to reset"
          data-testid="gg-details-left-resizer"
        />
      )}
      <div className="gg-details-header">
        <div className="gg-details-header-title">
          {mode === 'comparison' && comparison ? (
            <>
              <span>Comparing</span>
              <span className="gg-commit-hash gg-commit-hash-auto">
                {comparison.fromHash.slice(0, 7)}
              </span>
              <span>↔</span>
              <span className="gg-commit-hash gg-commit-hash-auto">
                {comparison.toHash.slice(0, 7)}
              </span>
            </>
          ) : details ? (
            <>
              <span>
                {details.hash === '*' ? 'Uncommitted Changes' : `Commit ${details.abbreviatedHash}`}
              </span>
              {details.signature && (
                <span
                  className="gg-ref-badge gg-ref-tag"
                  title={details.signature.signer || details.signature.label}
                >
                  🔒 {details.signature.label}
                </span>
              )}
            </>
          ) : (
            <span>Commit Details</span>
          )}
        </div>
        <div className="gg-flex-row gg-gap-4 gg-flex-shrink-0">
          <button
            type="button"
            className="gg-btn gg-btn-primary"
            onClick={() => onAskAgent(selectedFilePath ?? undefined)}
            title="Spawn a Zana Agent thread with this commit and diff context"
            data-testid="gg-ask-agent-btn"
          >
            ✨ Ask Agent
          </button>
          {codeReview ? (
            <button
              type="button"
              className="gg-btn"
              onClick={onEndCodeReview}
              title="End Code Review"
              data-testid="gg-end-review-btn"
            >
              ✓ End Review ({reviewedSet.size}/{fileChanges.length})
            </button>
          ) : (
            <button
              type="button"
              className="gg-btn"
              onClick={onStartCodeReview}
              title="Start Persistent Code Review"
              data-testid="gg-start-review-btn"
            >
              👁 Code Review
            </button>
          )}
          <button
            type="button"
            className="gg-btn gg-btn-icon"
            onClick={onClose}
            title="Close Details (Esc)"
            data-testid="gg-close-details-btn"
          >
            ✕
          </button>
        </div>
      </div>

      {loading ? (
        <div className="gg-empty">Loading commit details…</div>
      ) : (
        <div className="gg-details-body">
          {mode === 'single' && details && details.hash !== '*' && (
            <div className="gg-details-meta">
              <div className="gg-details-meta-grid">
                <span className="gg-details-meta-label">Commit:</span>
                <span>
                  <code>{details.hash}</code>{' '}
                  <button
                    type="button"
                    className="gg-btn gg-btn-icon gg-btn-compact-10"
                    onClick={() => onCopyText(details.hash, 'Commit hash')}
                  >
                    Copy
                  </button>
                </span>
                <span className="gg-details-meta-label">Parents:</span>
                <span>
                  {details.parents.length === 0
                    ? 'None (root commit)'
                    : details.parents.map((p, idx) => (
                        <React.Fragment key={p}>
                          {idx > 0 && ', '}
                          <span
                            className="gg-parent-link"
                            onClick={() => onSelectParentHash(p)}
                          >
                            {p.slice(0, 8)}
                          </span>
                        </React.Fragment>
                      ))}
                </span>
                <span className="gg-details-meta-label">Author:</span>
                <span>
                  {details.authorName} &lt;{details.authorEmail}&gt; (
                  {formatCommitTimestamp(details.authorDate, dateFormat)})
                </span>
                <span className="gg-details-meta-label">Committer:</span>
                <span>
                  {details.committerName} &lt;{details.committerEmail}&gt; (
                  {formatCommitTimestamp(details.commitDate, dateFormat)})
                </span>
              </div>
              <div className="gg-details-message">
                <strong>{renderTokens(details.subject)}</strong>
                {details.body ? `\n\n${details.body}` : ''}
              </div>
            </div>
          )}

          <div
            ref={columnsRef}
            className={`gg-details-columns ${isStacked ? 'stacked' : 'side-by-side'}`}
            data-testid="gg-details-columns"
          >
            <div
              className="gg-details-col-files"
              style={
                isStacked
                  ? {
                      height: `${filesHeight}px`,
                      flexBasis: `${filesHeight}px`,
                      width: '100%'
                    }
                  : {
                      width: `${filesWidth}px`,
                      flexBasis: `${filesWidth}px`
                    }
              }
            >
              <div className="gg-files-toolbar">
                <span>
                  Changed Files ({fileChanges.length})
                  {codeReview
                    ? ` • Reviewed ${reviewedSet.size}/${fileChanges.length}`
                    : ''}
                </span>
                <div className="gg-flex-row gg-gap-4">
                  <button
                    type="button"
                    className={`gg-btn gg-btn-compact-11 ${fileViewType === 'tree' ? 'gg-btn-active' : ''}`}
                    onClick={() => onChangeFileViewType('tree')}
                    data-testid="gg-view-tree-btn"
                  >
                    Tree
                  </button>
                  <button
                    type="button"
                    className={`gg-btn gg-btn-compact-11 ${fileViewType === 'list' ? 'gg-btn-active' : ''}`}
                    onClick={() => onChangeFileViewType('list')}
                    data-testid="gg-view-list-btn"
                  >
                    List
                  </button>
                  {fileViewType === 'tree' && (
                    <button
                      type="button"
                      className={`gg-btn gg-btn-compact-11 ${compactFolders ? 'gg-btn-active' : ''}`}
                      onClick={onToggleCompactFolders}
                      title="Compact single-child folders"
                    >
                      Compact
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={fileListRef}
                className="gg-file-list"
                data-testid="gg-file-list"
              >
                {fileChanges.length === 0 ? (
                  <div className="gg-empty gg-pad-12">
                    No file changes in this commit.
                  </div>
                ) : fileViewType === 'tree' ? (
                  renderTreeNodes(fileTree)
                ) : (
                  fileChanges.map((change) =>
                    renderFileItem(
                      change,
                      change.oldPath !== change.newPath
                        ? `${change.oldPath} → ${change.newPath}`
                        : change.newPath,
                      0
                    )
                  )
                )}
              </div>
            </div>

            {isStacked ? (
              <div
                className="gg-details-row-resizer"
                onMouseDown={handleRowResizeMouseDown}
                onDoubleClick={handleRowResizeDoubleClick}
                title="Drag to resize · Double-click to auto-split"
                data-testid="gg-details-row-resizer"
              />
            ) : (
              <div
                className="gg-details-col-resizer"
                onMouseDown={handleColResizeMouseDown}
                onDoubleClick={handleColResizeDoubleClick}
                title="Drag to resize column · Double-click to auto-fit"
                data-testid="gg-details-col-resizer"
              />
            )}

            <div className="gg-details-col-diff">
              {selectedFilePath ? (
                <div className="gg-diff-viewer" data-testid="gg-diff-viewer" ref={diffViewerRef}>
                  <div className="gg-diff-toolbar">
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 600
                      }}
                      title={selectedFilePath}
                    >
                      {selectedFilePath}
                    </span>
                    <div className="gg-flex-row gg-gap-4">
                      <button
                        type="button"
                        className={`gg-btn gg-btn-pad-8 ${viewMode === 'diff' ? 'gg-btn-active' : ''}`}
                        onClick={() => setViewMode('diff')}
                        data-testid="gg-view-diff-btn"
                        title="View diff changes"
                      >
                        Diff
                      </button>
                      <button
                        type="button"
                        className={`gg-btn gg-btn-pad-8 ${viewMode === 'source' ? 'gg-btn-active' : ''}`}
                        onClick={() => {
                          setViewMode('source');
                          if (selectedFilePath && !fileContent) {
                            onLoadFileContent?.(selectedFilePath);
                          }
                        }}
                        data-testid="gg-view-source-btn"
                        title="View full source code"
                      >
                        Source Code
                      </button>

                      {viewMode === 'diff' && (
                        <>
                          <button
                            type="button"
                            className={`gg-btn gg-btn-compact-11 ${diffViewMode === 'unified' ? 'gg-btn-active' : ''}`}
                            onClick={() => onChangeDiffViewMode('unified')}
                            data-testid="gg-diff-unified-btn"
                          >
                            Unified
                          </button>
                          <button
                            type="button"
                            className={`gg-btn gg-btn-compact-11 ${diffViewMode === 'split' ? 'gg-btn-active' : ''}`}
                            onClick={() => onChangeDiffViewMode('split')}
                            data-testid="gg-diff-split-btn"
                          >
                            Split
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="gg-btn gg-btn-icon gg-btn-compact-11"
                        title={viewMode === 'source' ? 'Copy file content' : 'Copy diff'}
                        onClick={() =>
                          onCopyText(
                            viewMode === 'source'
                              ? (fileContent?.content ?? '')
                              : (fileDiff?.rawDiff ?? ''),
                            viewMode === 'source' ? 'Source code' : 'Diff'
                          )
                        }
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <div className="gg-diff-content-scroll">
                    {viewMode === 'source' ? (
                      loadingContent ? (
                        <div className="gg-empty gg-pad-16">
                          Loading source code…
                        </div>
                      ) : !fileContent ? (
                        <div className="gg-empty gg-pad-16">
                          No source code available for this file.
                        </div>
                      ) : fileContent.isBinary ? (
                        <div className="gg-empty gg-pad-16">
                          Binary file — cannot display text content.
                        </div>
                      ) : (
                        <table className="gg-source-table" data-testid="gg-source-code-table">
                          <tbody>
                            {fileContent.content.split(/\r?\n/).map((line, idx) => (
                              <tr key={idx} className="gg-source-line">
                                <td className="gg-diff-gutter">{idx + 1}</td>
                                <td className="gg-diff-code">{line || ' '}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    ) : loadingDiff ? (
                      <div className="gg-empty gg-pad-16">
                        Loading diff…
                      </div>
                    ) : !fileDiff ? (
                      <div className="gg-empty gg-pad-16">
                        Select a file to inspect its diff.
                      </div>
                    ) : fileDiff.isBinary ? (
                      <div className="gg-empty gg-pad-16">
                        Binary file changed — inline text diff not available.
                      </div>
                    ) : fileDiff.hunks.length === 0 ? (
                      <div className="gg-empty gg-pad-16">
                        No textual diff hunks (empty file or mode-only change).
                      </div>
                    ) : diffViewMode === 'unified' ? (
                      <table className="gg-diff-table" data-testid="gg-diff-unified-table">
                        <tbody>
                          {fileDiff.hunks.map((hunk, hIdx) => (
                            <React.Fragment key={hIdx}>
                              <tr className="gg-diff-hunk-header">
                                <td colSpan={3} className="gg-diff-code">
                                  {hunk.header}
                                </td>
                              </tr>
                              {hunk.lines.map((line, lIdx) => (
                                <tr
                                  key={`${hIdx}-${lIdx}`}
                                  className={
                                    line.type === 'add'
                                      ? 'gg-diff-line-add'
                                      : line.type === 'del'
                                        ? 'gg-diff-line-del'
                                        : ''
                                  }
                                >
                                  <td className="gg-diff-gutter">
                                    {line.oldLineNumber ?? ''}
                                  </td>
                                  <td className="gg-diff-gutter">
                                    {line.newLineNumber ?? ''}
                                  </td>
                                  <td className="gg-diff-code">
                                    {line.type === 'add'
                                      ? `+${line.content}`
                                      : line.type === 'del'
                                        ? `-${line.content}`
                                        : ` ${line.content}`}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="gg-diff-table" data-testid="gg-diff-split-table">
                        <tbody>
                          {fileDiff.hunks.map((hunk, hIdx) => {
                            const splitRows = buildSplitDiffRows(hunk);
                            return (
                              <React.Fragment key={hIdx}>
                                <tr className="gg-diff-hunk-header">
                                  <td colSpan={4} className="gg-diff-code">
                                    {hunk.header}
                                  </td>
                                </tr>
                                {splitRows.map((row, rIdx) => (
                                  <tr key={`${hIdx}-${rIdx}`}>
                                    <td
                                      className={`gg-diff-gutter ${
                                        row.leftType === 'del' ? 'gg-diff-line-del' : ''
                                      }`}
                                    >
                                      {row.leftLineNumber ?? ''}
                                    </td>
                                    <td
                                      className={`gg-diff-code gg-diff-half-width ${
                                        row.leftType === 'del' ? 'gg-diff-line-del' : ''
                                      }`}
                                    >
                                      {row.leftContent}
                                    </td>
                                    <td
                                      className={`gg-diff-gutter ${
                                        row.rightType === 'add' ? 'gg-diff-line-add' : ''
                                      }`}
                                    >
                                      {row.rightLineNumber ?? ''}
                                    </td>
                                    <td
                                      className={`gg-diff-code gg-diff-half-width ${
                                        row.rightType === 'add' ? 'gg-diff-line-add' : ''
                                      }`}
                                    >
                                      {row.rightContent}
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="gg-empty"
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px'
                  }}
                >
                  Select a file from the list to inspect changes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
