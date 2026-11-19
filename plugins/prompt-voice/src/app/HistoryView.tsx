import React, { useEffect, useMemo, useState } from 'react';
import type {
  ActivitySource,
  HistoryEntry,
  HistoryProjectOption,
  HistoryTypeFilter
} from '../shared/protocol.ts';
import { copyToClipboard } from './clipboard.ts';
import { HistoryDetailPane } from './HistoryDetailPane.tsx';
import {
  SOURCE_LABELS,
  formatDuration,
  formatEntryKindLabel,
  formatRelativeTime,
  groupEntriesByDate
} from './historyFormatters.ts';
import { useSafeZccNavigate } from './safeSdk.ts';
import { useHistoryEntries, type HistoryRpcClient } from './useHistoryEntries.ts';

export { formatDuration, formatEntryKindLabel, formatRelativeTime, groupEntriesByDate };

export interface HistoryViewProps {
  rpc: HistoryRpcClient;
  projectId?: string;
  onLoadIntoStudio: (entry: HistoryEntry) => void;
  onInsertIntoComposer: (text: string) => void;
  onOpenSettings: () => void;
  onStatusNotice?: (message: string) => void;
}

export const HISTORY_VIEW_STYLES = `
  .ps-history-shell {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ps-history-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 16px;
    background: rgba(234, 179, 8, 0.1);
    border-bottom: 1px solid rgba(234, 179, 8, 0.25);
    color: #fde047;
    font-size: 12px;
    flex-shrink: 0;
  }

  .ps-history-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    flex-shrink: 0;
  }

  .ps-history-search-wrap {
    position: relative;
    flex: 1 1 200px;
    min-width: 160px;
    max-width: 340px;
    display: flex;
    align-items: center;
  }

  .ps-history-search {
    width: 100%;
    padding: 6px 26px 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--ps-border);
    background: var(--ps-input-bg);
    color: var(--text-primary, #e2e8f0);
    font-size: 12px;
    outline: none;
  }
  .ps-history-search:focus {
    border-color: var(--ps-accent);
    box-shadow: 0 0 0 1px var(--ps-accent);
  }

  .ps-history-search-clear {
    position: absolute;
    right: 6px;
    border: none;
    background: transparent;
    color: var(--ps-text-muted);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 2px 4px;
  }
  .ps-history-search-clear:hover {
    color: var(--text-primary, #e2e8f0);
  }

  .ps-segmented {
    display: inline-flex;
    align-items: center;
    background: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .ps-segmented-btn {
    border: none;
    background: transparent;
    color: var(--ps-text-muted);
    font-size: 11.5px;
    font-weight: 500;
    padding: 4px 9px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s;
  }
  .ps-segmented-btn:hover {
    color: var(--text-primary, #e2e8f0);
  }
  .ps-segmented-btn.active {
    background: rgba(59, 130, 246, 0.2);
    color: var(--text-primary, #e2e8f0);
  }

  .ps-history-confirm-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 16px;
    background: rgba(239, 68, 68, 0.1);
    border-bottom: 1px solid rgba(239, 68, 68, 0.35);
    font-size: 12px;
    flex-shrink: 0;
  }

  .ps-history-split {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ps-history-list-pane {
    width: 340px;
    border-right: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .ps-history-group-header {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 12px;
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ps-text-subtle);
    background: var(--ps-panel-bg);
    border-bottom: 1px solid var(--ps-border);
  }

  .ps-history-row {
    width: 100%;
    text-align: left;
    border: none;
    border-bottom: 1px solid var(--ps-border);
    background: transparent;
    color: var(--text-primary, #e2e8f0);
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 5px;
    transition: background 0.12s;
  }
  .ps-history-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .ps-history-row.selected {
    background: rgba(59, 130, 246, 0.14);
    box-shadow: inset 3px 0 0 var(--ps-accent);
  }

  .ps-history-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .ps-history-row-badges {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .ps-history-snippet {
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--text-primary, #e2e8f0);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  .ps-history-row-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 10.5px;
    color: var(--ps-text-subtle);
  }

  .ps-history-detail-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 16px;
    gap: 14px;
    background: var(--bg-base, #121417);
  }

  .ps-history-detail-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--ps-border);
  }

  .ps-history-meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ps-text-muted);
  }

  .ps-history-actions-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .ps-history-text-card {
    border: 1px solid var(--ps-border);
    border-radius: 8px;
    background: var(--ps-panel-bg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .ps-history-text-body {
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-primary, #e2e8f0);
    user-select: text;
    background: var(--ps-input-bg);
  }

  .ps-kind-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .ps-kind-dictation {
    background: rgba(59, 130, 246, 0.16);
    color: #93c5fd;
  }
  .ps-kind-dictation_cleanup {
    background: rgba(168, 85, 247, 0.16);
    color: #d8b4fe;
  }
  .ps-kind-refinement {
    background: rgba(34, 197, 94, 0.16);
    color: #86efac;
  }

  .ps-source-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.07);
    color: var(--ps-text-muted);
    white-space: nowrap;
  }

  .ps-star-active {
    color: #facc15;
  }

  @media (max-width: 780px) {
    .ps-history-split {
      flex-direction: column;
    }
    .ps-history-list-pane {
      width: 100%;
      max-height: 40%;
      border-right: none;
      border-bottom: 1px solid var(--ps-border);
    }
  }
`;

function HistoryScopeFilter({
  projectId,
  scopeMode,
  onScopeModeChange,
  selectedProjectFilter,
  onSelectedProjectFilterChange,
  projects
}: {
  projectId?: string;
  scopeMode: 'project' | 'all';
  onScopeModeChange: (value: 'project' | 'all') => void;
  selectedProjectFilter: string;
  onSelectedProjectFilterChange: (value: string) => void;
  projects: HistoryProjectOption[];
}) {
  if (projectId) {
    return (
      <div className="ps-segmented" role="group" aria-label="Project scope">
        <button
          type="button"
          className={`ps-segmented-btn ${scopeMode === 'project' ? 'active' : ''}`}
          aria-pressed={scopeMode === 'project'}
          onClick={() => onScopeModeChange('project')}
        >
          This project
        </button>
        <button
          type="button"
          className={`ps-segmented-btn ${scopeMode === 'all' ? 'active' : ''}`}
          aria-pressed={scopeMode === 'all'}
          onClick={() => onScopeModeChange('all')}
        >
          All activity
        </button>
      </div>
    );
  }
  if (projects.length === 0) return null;
  return (
    <select
      className="ps-select"
      style={{ width: 'auto', minWidth: 130 }}
      aria-label="Filter by project"
      value={selectedProjectFilter}
      onChange={(e) => onSelectedProjectFilterChange(e.target.value)}
    >
      <option value="">All projects</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

function HistoryToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sourceFilter,
  onSourceFilterChange,
  starredOnly,
  onStarredToggle,
  projectId,
  scopeMode,
  onScopeModeChange,
  selectedProjectFilter,
  onSelectedProjectFilterChange,
  projects,
  total,
  onRequestClear
}: {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: HistoryTypeFilter;
  onTypeFilterChange: (value: HistoryTypeFilter) => void;
  sourceFilter: ActivitySource | 'all';
  onSourceFilterChange: (value: ActivitySource | 'all') => void;
  starredOnly: boolean;
  onStarredToggle: () => void;
  projectId?: string;
  scopeMode: 'project' | 'all';
  onScopeModeChange: (value: 'project' | 'all') => void;
  selectedProjectFilter: string;
  onSelectedProjectFilterChange: (value: string) => void;
  projects: HistoryProjectOption[];
  total: number;
  onRequestClear: () => void;
}) {
  const clearLabel = projectId && scopeMode === 'project' ? 'Clear project history' : 'Clear all';

  return (
    <div className="ps-history-toolbar">
      <div className="ps-history-search-wrap">
        <input
          type="search"
          className="ps-history-search"
          aria-label="Search history"
          placeholder="Search dictations & refinements…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search ? (
          <button type="button" className="ps-history-search-clear" aria-label="Clear search" onClick={() => onSearchChange('')}>
            ×
          </button>
        ) : null}
      </div>

      <div className="ps-segmented" role="group" aria-label="Activity type filter">
        {([
          { id: 'all', label: 'All' },
          { id: 'dictation', label: 'Dictations' },
          { id: 'refinement', label: 'Refinements' }
        ] as const).map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`ps-segmented-btn ${typeFilter === opt.id ? 'active' : ''}`}
            aria-pressed={typeFilter === opt.id}
            onClick={() => onTypeFilterChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <select
        className="ps-select"
        style={{ width: 'auto', minWidth: 120 }}
        aria-label="Filter by source"
        value={sourceFilter}
        onChange={(e) => onSourceFilterChange(e.target.value as ActivitySource | 'all')}
      >
        <option value="all">All sources</option>
        <option value="composer">Composer</option>
        <option value="home">Home</option>
        <option value="studio">Prompt Studio</option>
      </select>

      <HistoryScopeFilter
        projectId={projectId}
        scopeMode={scopeMode}
        onScopeModeChange={onScopeModeChange}
        selectedProjectFilter={selectedProjectFilter}
        onSelectedProjectFilterChange={onSelectedProjectFilterChange}
        projects={projects}
      />

      <button type="button" className={`ps-btn ${starredOnly ? 'ps-btn-primary' : ''}`} aria-pressed={starredOnly} onClick={onStarredToggle}>
        <span>{starredOnly ? '★' : '☆'}</span>
        <span>Starred</span>
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ps-text-subtle)' }}>
          {total === 1 ? '1 entry' : `${total} entries`}
        </span>
        <button type="button" className="ps-btn ps-btn-danger" disabled={total === 0} onClick={onRequestClear}>
          {clearLabel}
        </button>
      </div>
    </div>
  );
}

function HistoryPausedBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="ps-history-banner" role="status">
      <span>History recording is paused. New dictations and refinements will not be saved.</span>
      <button type="button" className="ps-btn" style={{ padding: '3px 9px', fontSize: 11 }} onClick={onOpenSettings}>
        Open Settings
      </button>
    </div>
  );
}

function HistoryClearConfirmBar({
  projectScoped,
  includeStarred,
  clearing,
  onIncludeStarredChange,
  onCancel,
  onConfirm
}: {
  projectScoped: boolean;
  includeStarred: boolean;
  clearing: boolean;
  onIncludeStarredChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="ps-history-confirm-bar" role="alertdialog" aria-label="Confirm clear history">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <strong>{projectScoped ? 'Clear history for this project?' : 'Clear all activity history?'}</strong>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, cursor: 'pointer' }}>
          <input type="checkbox" checked={includeStarred} onChange={(e) => onIncludeStarredChange(e.target.checked)} />
          <span>Also delete starred entries</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="ps-btn" disabled={clearing} onClick={onCancel}>Cancel</button>
        <button type="button" className="ps-btn ps-btn-danger" disabled={clearing} onClick={onConfirm}>
          {clearing ? 'Clearing…' : 'Confirm Clear'}
        </button>
      </div>
    </div>
  );
}

function HistoryEmptyOrErrorState({
  storageAvailable,
  error,
  loading,
  hasActiveFilters,
  onRetry,
  onResetFilters
}: {
  storageAvailable: boolean;
  error: string | null;
  loading: boolean;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
}) {
  if (!storageAvailable) {
    return (
      <div className="ps-empty-state">
        <div className="ps-empty-card">
          <div style={{ fontSize: 14, fontWeight: 600 }}>History storage is unavailable</div>
          <div style={{ fontSize: 12, color: 'var(--ps-text-muted)' }}>
            Prompt Voice needs host database storage to save and browse dictation history.
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="ps-empty-state">
        <div className="ps-empty-card" role="alert">
          <div style={{ fontSize: 14, fontWeight: 600 }}>Could not load history</div>
          <div style={{ fontSize: 12, color: 'var(--ps-text-muted)' }}>{error}</div>
          <button type="button" className="ps-btn ps-btn-primary" onClick={onRetry}>Retry</button>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="ps-empty-state">
        <span style={{ fontSize: 12, color: 'var(--ps-text-muted)' }}>Loading activity history…</span>
      </div>
    );
  }
  return (
    <div className="ps-empty-state">
      <div className="ps-empty-card">
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {hasActiveFilters ? 'No matching history entries' : 'No activity recorded yet'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ps-text-muted)', lineHeight: 1.45 }}>
          {hasActiveFilters
            ? 'Try clearing your search or adjusting filters to see more entries.'
            : 'Dictate from any composer, the Home card, or Prompt Studio — or refine text in Studio — and it will appear here automatically.'}
        </div>
        {hasActiveFilters ? (
          <button type="button" className="ps-btn" onClick={onResetFilters}>Reset filters</button>
        ) : null}
      </div>
    </div>
  );
}

function HistoryListRow({
  entry,
  isSelected,
  projectName,
  onSelect
}: {
  entry: HistoryEntry;
  isSelected: boolean;
  projectName: string | null;
  onSelect: () => void;
}) {
  const snippet = (entry.outputText || entry.rawText).trim();
  return (
    <button
      type="button"
      className={`ps-history-row ${isSelected ? 'selected' : ''}`}
      aria-current={isSelected ? 'true' : undefined}
      onClick={onSelect}
    >
      <div className="ps-history-row-top">
        <div className="ps-history-row-badges">
          <span className={`ps-kind-badge ps-kind-${entry.kind}`}>{formatEntryKindLabel(entry)}</span>
          <span className="ps-source-badge">{SOURCE_LABELS[entry.source] ?? entry.source}</span>
        </div>
        {entry.starred ? <span className="ps-star-active" aria-label="Starred">★</span> : null}
      </div>
      <div className="ps-history-snippet">{snippet}</div>
      <div className="ps-history-row-meta">
        <span>{formatRelativeTime(entry.createdAt)}</span>
        {projectName ? <span>{projectName}</span> : null}
      </div>
    </button>
  );
}

function HistoryListPane({
  entries,
  selectedId,
  projectNameById,
  scopeMode,
  hasMore,
  loadingMore,
  onSelect,
  onLoadMore
}: {
  entries: HistoryEntry[];
  selectedId: string | null;
  projectNameById: Map<string, string>;
  scopeMode: 'project' | 'all';
  hasMore: boolean;
  loadingMore: boolean;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
}) {
  const groupedEntries = useMemo(() => groupEntriesByDate(entries), [entries]);
  return (
    <aside className="ps-history-list-pane" aria-label="Activity history list">
      {groupedEntries.map((group) => (
        <div key={group.label}>
          <div className="ps-history-group-header">{group.label}</div>
          {group.entries.map((entry) => {
            const entryProjectName =
              scopeMode === 'all' && entry.projectId
                ? projectNameById.get(entry.projectId) ?? entry.projectId
                : null;
            return (
              <HistoryListRow
                key={entry.id}
                entry={entry}
                isSelected={selectedId === entry.id}
                projectName={entryProjectName}
                onSelect={() => onSelect(entry.id)}
              />
            );
          })}
        </div>
      ))}
      {hasMore ? (
        <div style={{ padding: 12, textAlign: 'center' }}>
          <button type="button" className="ps-btn" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </aside>
  );
}

/**
 * Full-width Activity History view inside Prompt Studio.
 * Displays dictations from Composer/Home/Studio and Studio refinements in a master–detail split view.
 */
export function HistoryView({
  rpc,
  projectId,
  onLoadIntoStudio,
  onInsertIntoComposer,
  onOpenSettings,
  onStatusNotice
}: HistoryViewProps): React.ReactElement {
  const navigate = useSafeZccNavigate();
  const history = useHistoryEntries({ rpc, projectId, onStatusNotice });
  const [showDiff, setShowDiff] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<'output' | 'raw' | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearIncludeStarred, setClearIncludeStarred] = useState(false);

  useEffect(() => {
    setShowDiff(false);
    setCopiedTarget(null);
  }, [history.selectedEntry?.id]);

  const handleCopyText = async (text: string, target: 'output' | 'raw') => {
    const ok = await copyToClipboard(text);
    if (!ok) {
      onStatusNotice?.('Failed to copy to clipboard.');
      return;
    }
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget((curr) => (curr === target ? null : curr)), 2000);
    onStatusNotice?.(target === 'raw' ? 'Raw text copied to clipboard.' : 'Text copied to clipboard.');
  };

  const handleConfirmClear = async () => {
    const includeStarred = clearIncludeStarred;
    setClearConfirmOpen(false);
    setClearIncludeStarred(false);
    await history.clearHistory(includeStarred);
  };

  const showEmptyOrError = !history.storageAvailable || Boolean(history.error) || history.loading || history.entries.length === 0;
  const selectedProjectName = history.selectedEntry?.projectId
    ? history.projectNameById.get(history.selectedEntry.projectId) ?? history.selectedEntry.projectId
    : null;

  return (
    <div className="ps-history-shell" data-testid="ps-history-view">
      <style>{HISTORY_VIEW_STYLES}</style>
      {!history.historyEnabled ? <HistoryPausedBanner onOpenSettings={onOpenSettings} /> : null}
      <HistoryToolbar
        search={history.searchInput}
        onSearchChange={history.setSearchInput}
        typeFilter={history.typeFilter}
        onTypeFilterChange={history.setTypeFilter}
        sourceFilter={history.sourceFilter}
        onSourceFilterChange={history.setSourceFilter}
        starredOnly={history.starredOnly}
        onStarredToggle={() => history.setStarredOnly((v) => !v)}
        projectId={projectId}
        scopeMode={history.scopeMode}
        onScopeModeChange={history.setScopeMode}
        selectedProjectFilter={history.selectedProjectFilter}
        onSelectedProjectFilterChange={history.setSelectedProjectFilter}
        projects={history.projects}
        total={history.total}
        onRequestClear={() => { setClearIncludeStarred(false); setClearConfirmOpen(true); }}
      />
      {clearConfirmOpen ? (
        <HistoryClearConfirmBar
          projectScoped={Boolean(projectId && history.scopeMode === 'project')}
          includeStarred={clearIncludeStarred}
          clearing={history.clearing}
          onIncludeStarredChange={setClearIncludeStarred}
          onCancel={() => setClearConfirmOpen(false)}
          onConfirm={() => void handleConfirmClear()}
        />
      ) : null}
      {showEmptyOrError ? (
        <HistoryEmptyOrErrorState
          storageAvailable={history.storageAvailable}
          error={history.error}
          loading={history.loading}
          hasActiveFilters={history.hasActiveFilters}
          onRetry={() => void history.fetchEntries()}
          onResetFilters={history.resetFilters}
        />
      ) : (
        <div className="ps-history-split">
          <HistoryListPane
            entries={history.entries}
            selectedId={history.selectedEntry?.id ?? null}
            projectNameById={history.projectNameById}
            scopeMode={history.scopeMode}
            hasMore={history.hasMore}
            loadingMore={history.loadingMore}
            onSelect={history.setSelectedId}
            onLoadMore={() => void history.fetchEntries({ offset: history.entries.length, append: true })}
          />
          {history.selectedEntry ? (
            <HistoryDetailPane
              entry={history.selectedEntry}
              projectName={selectedProjectName}
              showDiff={showDiff}
              onToggleDiff={() => setShowDiff((v) => !v)}
              onCopyText={(text, target) => void handleCopyText(text, target)}
              onLoadIntoStudio={onLoadIntoStudio}
              onInsertIntoComposer={onInsertIntoComposer}
              onToggleStar={(entry) => void history.toggleStar(entry)}
              onDelete={(entry) => void history.deleteEntry(entry)}
              onOpenThread={typeof navigate?.toThread === 'function' ? (id) => navigate.toThread(id) : undefined}
              copiedTarget={copiedTarget}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
