import React, { useState, type ReactNode } from 'react';
import type {
  CommitOrder,
  DiscoveredRepo,
  GitGraphGlobalSettings,
  RepoSettings
} from '../../server/types.js';

export interface ControlBarProps {
  repos: DiscoveredRepo[];
  selectedRepoRelPath: string;
  onSelectRepo: (relPath: string) => void;
  branches: string[];
  remoteBranches: string[];
  repoSettings: RepoSettings;
  globalSettings: GitGraphGlobalSettings;
  onUpdateRepoSettings: (patch: Partial<RepoSettings>) => void;
  onUpdateGlobalSettings: (patch: Partial<GitGraphGlobalSettings>) => void;
  onFetch: () => void;
  onPush: () => void;
  canPush: boolean;
  onScrollToHead: () => void;
  onToggleFind: () => void;
  findOpen: boolean;
  onOpenRepoSettings: () => void;
  onRefresh: () => void;
  projects?: Array<{ id: string; name: string }>;
  selectedProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  loading: boolean;
  headerActions?: ReactNode;
}

export function ControlBar(props: ControlBarProps) {
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [branchFilterQuery, setBranchFilterQuery] = useState('');

  const {
    repos,
    selectedRepoRelPath,
    onSelectRepo,
    branches,
    remoteBranches,
    repoSettings,
    globalSettings,
    onUpdateRepoSettings,
    onUpdateGlobalSettings,
    onFetch,
    onPush,
    canPush,
    onScrollToHead,
    onToggleFind,
    findOpen,
    onOpenRepoSettings,
    onRefresh,
    projects,
    selectedProjectId,
    onSelectProject,
    loading,
    headerActions
  } = props;

  const selectedBranches = repoSettings.selectedBranches;
  const allBranchesOption = selectedBranches.length === 0;
  const combinedBranches = [
    ...branches,
    ...(repoSettings.showRemoteBranches ? remoteBranches.map((r) => `remotes/${r}`) : [])
  ].filter((b) => !branchFilterQuery.trim() || b.toLowerCase().includes(branchFilterQuery.trim().toLowerCase()));

  const toggleBranch = (branchName: string) => {
    const set = new Set(selectedBranches);
    if (set.has(branchName)) {
      set.delete(branchName);
    } else {
      set.add(branchName);
    }
    onUpdateRepoSettings({ selectedBranches: [...set] });
  };

  return (
    <header className="gg-control-bar git-graph-toolbar" role="toolbar" aria-label="Git Tree controls">
      <div className="git-graph-toolbar-left">
        <span className="git-graph-title">⑂ Git Tree</span>

        {projects && projects.length > 1 && (
          <label className="gg-control-project-label">
            <span className="gg-control-muted-label">Project:</span>
            <select
              aria-label="Select project"
              className="gg-select git-graph-select"
              value={selectedProjectId}
              onChange={(e) => onSelectProject?.(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {repos.length > 1 && (
          <label className="gg-control-project-label">
            <span className="gg-control-muted-label">Repo:</span>
            <select
              aria-label="Select repository"
              className="gg-select git-graph-select"
              value={selectedRepoRelPath}
              onChange={(e) => onSelectRepo(e.target.value)}
            >
              {repos.map((r) => (
                <option key={r.relPath || 'root'} value={r.relPath}>
                  {r.label} {r.currentBranch ? `(${r.currentBranch})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div style={{ position: 'relative', zIndex: branchMenuOpen ? 100 : 1 }}>
          <button
            type="button"
            className={`gg-btn git-graph-btn ${!allBranchesOption ? 'git-graph-btn--active' : ''}`}
            aria-label="Filter branches"
            aria-expanded={branchMenuOpen}
            onClick={() => setBranchMenuOpen((v) => !v)}
            data-testid="gg-branches-filter-btn"
          >
            <span>
              ⑂ Branches:{' '}
              {allBranchesOption
                ? 'Show All'
                : selectedBranches.length === 1
                  ? selectedBranches[0]
                  : `${selectedBranches.length} selected`} ▾
            </span>
          </button>

          {branchMenuOpen && (
            <>
              <div
                className="gg-context-overlay-fixed"
                onClick={() => setBranchMenuOpen(false)}
              />
              <div
                className="gg-popover git-graph-popover"
                role="dialog"
                aria-label="Branch filter"
                data-testid="gg-branches-popover"
              >
                <div className="gg-branch-filter-header">
                  <strong className="gg-font-12">Filter Branches</strong>
                  <button
                    type="button"
                    className="gg-btn git-graph-btn"
                    onClick={() => setBranchMenuOpen(false)}
                  >
                    Close
                  </button>
                </div>
              <input
                type="search"
                className="git-graph-input"
                placeholder="Filter branch list..."
                value={branchFilterQuery}
                onChange={(e) => setBranchFilterQuery(e.target.value)}
              />
              <label className="git-graph-checkbox-row">
                <input
                  type="checkbox"
                  checked={allBranchesOption}
                  onChange={() => onUpdateRepoSettings({ selectedBranches: [] })}
                />
                <span>Show All Branches</span>
              </label>
              <label className="git-graph-checkbox-row">
                <input
                  type="checkbox"
                  checked={repoSettings.showRemoteBranches}
                  onChange={(e) => onUpdateRepoSettings({ showRemoteBranches: e.target.checked })}
                />
                <span>Show Remote Branches</span>
              </label>
              <label className="git-graph-checkbox-row">
                <input
                  type="checkbox"
                  checked={repoSettings.showTags}
                  onChange={(e) => onUpdateRepoSettings({ showTags: e.target.checked })}
                />
                <span>Show Tags</span>
              </label>
              <label className="git-graph-checkbox-row">
                <input
                  type="checkbox"
                  checked={repoSettings.showStashes}
                  onChange={(e) => onUpdateRepoSettings({ showStashes: e.target.checked })}
                />
                <span>Show Stashes</span>
              </label>
              <label className="git-graph-checkbox-row">
                <input
                  type="checkbox"
                  checked={repoSettings.onlyFollowFirstParent}
                  onChange={(e) => onUpdateRepoSettings({ onlyFollowFirstParent: e.target.checked })}
                />
                <span>Only Follow First Parent</span>
              </label>
              <div className="git-graph-context-sep" />
              <div className="gg-branch-scroll-list">
                {combinedBranches.map((branchName) => (
                  <label key={branchName} className="git-graph-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(branchName)}
                      onChange={() => toggleBranch(branchName)}
                    />
                    <span className="gg-ellipsis">
                      {branchName}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

        <select
          aria-label="Commit ordering"
          className="gg-select git-graph-select"
          value={repoSettings.commitOrdering}
          onChange={(e) =>
            onUpdateRepoSettings({ commitOrdering: e.target.value as CommitOrder })
          }
          title="Commit order"
        >
          <option value="date">Order: Commit Date</option>
          <option value="author-date">Order: Author Date</option>
          <option value="topo">Order: Topological</option>
        </select>

        <button
          type="button"
          className="gg-btn git-graph-btn"
          title="Toggle rounded or angular graph lines"
          onClick={() =>
            onUpdateGlobalSettings({
              graphStyle: globalSettings.graphStyle === 'rounded' ? 'angular' : 'rounded'
            })
          }
        >
          Style: {globalSettings.graphStyle === 'rounded' ? 'Rounded' : 'Angular'}
        </button>

        <button
          type="button"
          className="gg-btn git-graph-btn"
          title="Toggle Commit Details location (Docked split vs Inline row)"
          onClick={() =>
            onUpdateGlobalSettings({
              commitDetailsLocation:
                globalSettings.commitDetailsLocation === 'docked' ? 'inline' : 'docked'
            })
          }
        >
          Details: {globalSettings.commitDetailsLocation === 'docked' ? 'Docked' : 'Inline'}
        </button>
      </div>

      <div className="git-graph-toolbar-right">
        <button
          type="button"
          className="gg-btn git-graph-btn"
          onClick={onFetch}
          disabled={loading}
          title="Fetch from Remote(s)"
        >
          ⬇ Fetch
        </button>
        <button
          type="button"
          className="gg-btn git-graph-btn"
          onClick={onPush}
          disabled={loading || !canPush}
          title="Push current branch to remote"
        >
          ⬆ Push
        </button>
        <button
          type="button"
          className="gg-btn git-graph-btn"
          onClick={onScrollToHead}
          title="Scroll to HEAD (Ctrl/Cmd+H)"
        >
          ⌖ HEAD
        </button>
        <button
          type="button"
          className={`gg-btn git-graph-btn ${findOpen ? 'git-graph-btn--active active' : ''}`}
          onClick={onToggleFind}
          title="Find commits, branches, or tags (Ctrl/Cmd+F)"
          data-testid="gg-find-btn"
        >
          🔍 Find
        </button>
        <button
          type="button"
          className="gg-btn git-graph-btn"
          onClick={onOpenRepoSettings}
          title="Repository Settings (Remotes, Issue Linking, Pull Requests)"
          data-testid="gg-repo-settings-btn"
        >
          ⚙ Settings
        </button>
        <button
          type="button"
          className="gg-btn git-graph-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Git Tree (Ctrl/Cmd+R)"
        >
          ↻ {loading ? 'Loading…' : 'Refresh'}
        </button>
        {headerActions}
      </div>
    </header>
  );
}
