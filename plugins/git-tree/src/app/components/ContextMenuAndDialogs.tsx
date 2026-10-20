import React, { useState } from 'react';
import type {
  GitCommitNode,
  GitRefBadge,
  GitRemoteInfo,
  GitTagDetails
} from '../../server/types.js';
import type { GitMutationAction } from '../../server/git-actions.js';

export type ContextMenuTarget =
  | { kind: 'commit'; commit: GitCommitNode; x: number; y: number }
  | { kind: 'branch'; commit: GitCommitNode; ref: GitRefBadge; x: number; y: number }
  | { kind: 'remote-branch'; commit: GitCommitNode; ref: GitRefBadge; x: number; y: number }
  | { kind: 'tag'; commit: GitCommitNode; ref: GitRefBadge; x: number; y: number }
  | { kind: 'stash'; commit: GitCommitNode; selector: string; x: number; y: number }
  | { kind: 'uncommitted'; commit: GitCommitNode; x: number; y: number };

export type ActiveGitDialog =
  | { kind: 'create-branch'; commit: GitCommitNode }
  | { kind: 'rename-branch'; branchName: string }
  | { kind: 'delete-branch'; branchName: string }
  | { kind: 'merge-branch'; branchName: string }
  | { kind: 'rebase-branch'; ontoBranch: string }
  | { kind: 'push-branch'; branchName: string }
  | { kind: 'pull-branch'; branchName: string }
  | { kind: 'cherry-pick'; commit: GitCommitNode }
  | { kind: 'revert-commit'; commit: GitCommitNode }
  | { kind: 'reset-commit'; commit: GitCommitNode; defaultMode: 'soft' | 'mixed' | 'hard' }
  | { kind: 'drop-commit'; commit: GitCommitNode }
  | { kind: 'add-tag'; commit: GitCommitNode }
  | { kind: 'tag-details'; tagName: string; details: GitTagDetails | null }
  | { kind: 'stash-push' }
  | { kind: 'commit-uncommitted' }
  | { kind: 'stash-branch'; selector: string }
  | { kind: 'clean-untracked' }
  | { kind: 'discard-all' };

export interface ContextMenuOverlayProps {
  target: ContextMenuTarget | null;
  currentBranch: string | null;
  hasCommits?: boolean;
  onClose: () => void;
  onRunAction: (action: GitMutationAction) => void;
  onOpenDialog: (dialog: ActiveGitDialog) => void;
  onOpenPullRequest: (branchName: string) => void;
  onViewTagDetails: (tagName: string) => void;
  onCopyText: (text: string, label: string) => void;
  onAskAgent?: (commitHash: string, filePath?: string) => void;
}

export function ContextMenuOverlay({
  target,
  currentBranch,
  hasCommits = true,
  onClose,
  onRunAction,
  onOpenDialog,
  onOpenPullRequest,
  onViewTagDetails,
  onCopyText,
  onAskAgent
}: ContextMenuOverlayProps) {
  if (!target) return null;

  const style: React.CSSProperties = {
    left: `${Math.min(target.x, window.innerWidth - 220)}px`,
    top: `${Math.min(target.y, window.innerHeight - 320)}px`
  };

  return (
    <div
      className="gg-context-overlay-fixed"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className="gg-context-menu"
        style={style}
        onClick={(e) => e.stopPropagation()}
        data-testid="gg-context-menu"
      >
        {target.kind === 'branch' && (
          <>
            <div className="gg-context-menu-header">Branch: {target.ref.name}</div>
            {target.ref.name !== currentBranch && (
              <button
                type="button"
                className="gg-context-menu-item"
                onClick={() => {
                  onClose();
                  onRunAction({
                    kind: 'checkout-branch',
                    branchName: target.ref.name
                  });
                }}
              >
                Checkout Branch
              </button>
            )}
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'rename-branch', branchName: target.ref.name });
              }}
            >
              Rename Branch…
            </button>
            {target.ref.name !== currentBranch && (
              <>
                <button
                  type="button"
                  className="gg-context-menu-item"
                  onClick={() => {
                    onClose();
                    onOpenDialog({ kind: 'merge-branch', branchName: target.ref.name });
                  }}
                >
                  Merge into Current Branch…
                </button>
                <button
                  type="button"
                  className="gg-context-menu-item"
                  onClick={() => {
                    onClose();
                    onOpenDialog({ kind: 'rebase-branch', ontoBranch: target.ref.name });
                  }}
                >
                  Rebase Current Branch onto {target.ref.name}…
                </button>
              </>
            )}
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'push-branch', branchName: target.ref.name });
              }}
            >
              Push Branch…
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'pull-branch', branchName: target.ref.name });
              }}
            >
              Pull into Branch…
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenPullRequest(target.ref.name);
              }}
            >
              Create Pull Request…
            </button>
            <div className="gg-context-menu-sep" />
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onCopyText(target.ref.name, 'Branch name');
              }}
            >
              Copy Branch Name
            </button>
            {target.ref.name !== currentBranch && (
              <button
                type="button"
                className="gg-context-menu-item danger"
                onClick={() => {
                  onClose();
                  onOpenDialog({ kind: 'delete-branch', branchName: target.ref.name });
                }}
              >
                Delete Branch…
              </button>
            )}
          </>
        )}

        {target.kind === 'remote-branch' && (
          <>
            <div className="gg-context-menu-header">
              Remote Branch: {target.ref.remote}/{target.ref.name}
            </div>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onRunAction({
                  kind: 'checkout-branch',
                  branchName: target.ref.name,
                  createAndTrackFrom: `${target.ref.remote}/${target.ref.name}`
                });
              }}
            >
              Checkout Branch (Track {target.ref.remote}/{target.ref.name})
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onRunAction({
                  kind: 'fetch-into-local-branch',
                  remote: target.ref.remote || 'origin',
                  remoteBranch: target.ref.name,
                  localBranch: target.ref.name,
                  force: false
                });
              }}
            >
              Fetch into Local Branch ({target.ref.name})
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({
                  kind: 'merge-branch',
                  branchName: `${target.ref.remote}/${target.ref.name}`
                });
              }}
            >
              Merge into Current Branch…
            </button>
            <div className="gg-context-menu-sep" />
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onCopyText(`${target.ref.remote}/${target.ref.name}`, 'Remote branch name');
              }}
            >
              Copy Remote Branch Name
            </button>
            <button
              type="button"
              className="gg-context-menu-item danger"
              onClick={() => {
                onClose();
                onRunAction({
                  kind: 'delete-remote-branch',
                  remote: target.ref.remote || 'origin',
                  branchName: target.ref.name
                });
              }}
            >
              Delete Remote Branch
            </button>
          </>
        )}

        {target.kind === 'tag' && (
          <>
            <div className="gg-context-menu-header">Tag: {target.ref.name}</div>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onViewTagDetails(target.ref.name);
              }}
            >
              View Tag Details
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onRunAction({
                  kind: 'push-tag',
                  tagName: target.ref.name,
                  remote: 'origin'
                });
              }}
            >
              Push Tag to origin
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onCopyText(target.ref.name, 'Tag name');
              }}
            >
              Copy Tag Name
            </button>
            <div className="gg-context-menu-sep" />
            <button
              type="button"
              className="gg-context-menu-item danger"
              onClick={() => {
                onClose();
                onRunAction({
                  kind: 'delete-tag',
                  tagName: target.ref.name,
                  deleteFromRemote: null
                });
              }}
            >
              Delete Tag
            </button>
          </>
        )}

        {target.kind === 'stash' && (
          <>
            <div className="gg-context-menu-header">Stash: {target.selector}</div>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onRunAction({
                  kind: 'stash-apply',
                  selector: target.selector,
                  reinstateIndex: false
                });
              }}
            >
              Apply Stash
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onRunAction({
                  kind: 'stash-pop',
                  selector: target.selector,
                  reinstateIndex: false
                });
              }}
            >
              Pop Stash
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'stash-branch', selector: target.selector });
              }}
            >
              Create Branch from Stash…
            </button>
            <div className="gg-context-menu-sep" />
            <button
              type="button"
              className="gg-context-menu-item danger"
              onClick={() => {
                onClose();
                onRunAction({
                  kind: 'stash-drop',
                  selector: target.selector
                });
              }}
            >
              Drop Stash
            </button>
          </>
        )}

        {target.kind === 'uncommitted' && (
          <>
            <div className="gg-context-menu-header">Uncommitted Changes</div>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'commit-uncommitted' });
              }}
            >
              Commit…
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              disabled={!hasCommits}
              title={
                !hasCommits
                  ? 'Cannot stash: Git requires an initial commit before stashing'
                  : undefined
              }
              onClick={() => {
                if (!hasCommits) return;
                onClose();
                onOpenDialog({ kind: 'stash-push' });
              }}
            >
              Stash Uncommitted Changes…
            </button>
            <button
              type="button"
              className="gg-context-menu-item danger"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'discard-all' });
              }}
            >
              Discard All Changes…
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onAskAgent?.('*');
              }}
            >
              ✨ Ask Agent to Review Working Tree…
            </button>
            <div className="gg-context-menu-sep" />
            <button
              type="button"
              className="gg-context-menu-item danger"
              onClick={() => {
                onClose();
                onRunAction({ kind: 'reset-uncommitted', mode: 'hard' });
              }}
            >
              Reset Working Tree (Hard)
            </button>
            <button
              type="button"
              className="gg-context-menu-item danger"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'clean-untracked' });
              }}
            >
              Clean Untracked Files…
            </button>
          </>
        )}

        {target.kind === 'commit' && (
          <>
            <div className="gg-context-menu-header">
              Commit: {target.commit.abbreviatedHash}
            </div>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'create-branch', commit: target.commit });
              }}
            >
              Create Branch…
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'add-tag', commit: target.commit });
              }}
            >
              Add Tag…
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onRunAction({
                  kind: 'checkout-commit',
                  commitHash: target.commit.hash
                });
              }}
            >
              Checkout Commit (Detached HEAD)
            </button>
            <div className="gg-context-menu-sep" />
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'cherry-pick', commit: target.commit });
              }}
            >
              Cherry-Pick Commit…
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({ kind: 'revert-commit', commit: target.commit });
              }}
            >
              Revert Commit…
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onOpenDialog({
                  kind: 'reset-commit',
                  commit: target.commit,
                  defaultMode: 'mixed'
                });
              }}
            >
              Reset Current Branch to Here…
            </button>
            <button
              type="button"
              className="gg-context-menu-item danger"
              disabled={target.commit.parents.length === 0}
              title={
                target.commit.parents.length === 0
                  ? 'Cannot drop the initial (root) commit'
                  : undefined
              }
              onClick={() => {
                if (target.commit.parents.length === 0) return;
                onClose();
                onOpenDialog({ kind: 'drop-commit', commit: target.commit });
              }}
            >
              Drop Commit…
            </button>
            <div className="gg-context-menu-sep" />
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onAskAgent?.(target.commit.hash);
              }}
            >
              ✨ Ask Agent about Commit…
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onCopyText(target.commit.hash, 'Commit hash');
              }}
            >
              Copy Commit Hash
            </button>
            <button
              type="button"
              className="gg-context-menu-item"
              onClick={() => {
                onClose();
                onCopyText(target.commit.subject, 'Commit subject');
              }}
            >
              Copy Commit Subject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export interface GitActionDialogModalProps {
  dialog: ActiveGitDialog | null;
  remotes: readonly GitRemoteInfo[];
  currentBranch?: string | null;
  onClose: () => void;
  onRunAction: (action: GitMutationAction) => void;
}

export function GitActionDialogModal({
  dialog,
  remotes,
  currentBranch,
  onClose,
  onRunAction
}: GitActionDialogModalProps) {
  const defaultRemote = remotes[0]?.name ?? 'origin';
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [flagA, setFlagA] = useState(true);
  const [flagB, setFlagB] = useState(false);
  const [flagC, setFlagC] = useState(false);
  const [resetMode, setResetMode] = useState<'soft' | 'mixed' | 'hard'>('mixed');

  if (!dialog) return null;

  return (
    <div className="gg-modal-backdrop" onClick={onClose}>
      <div
        className="gg-modal"
        onClick={(e) => e.stopPropagation()}
        data-testid={`gg-dialog-${dialog.kind}`}
      >
        {dialog.kind === 'create-branch' && (
          <>
            <div className="gg-modal-header">
              <span>Create Branch at {dialog.commit.abbreviatedHash}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <div className="gg-field">
                <label className="gg-field-label">Branch Name</label>
                <input
                  type="text"
                  className="gg-input"
                  placeholder="feature/my-branch"
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                  autoFocus
                />
              </div>
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagA}
                  onChange={(e) => setFlagA(e.target.checked)}
                />
                <span>Check out branch after creation</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                disabled={!textA.trim()}
                onClick={() => {
                  onRunAction({
                    kind: 'create-branch',
                    branchName: textA.trim(),
                    startPoint: dialog.commit.hash,
                    checkout: flagA
                  });
                  onClose();
                }}
              >
                Create Branch
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'rename-branch' && (
          <>
            <div className="gg-modal-header">
              <span>Rename Branch {dialog.branchName}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <div className="gg-field">
                <label className="gg-field-label">New Branch Name</label>
                <input
                  type="text"
                  className="gg-input"
                  value={textA}
                  placeholder={dialog.branchName}
                  onChange={(e) => setTextA(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                disabled={!textA.trim()}
                onClick={() => {
                  onRunAction({
                    kind: 'rename-branch',
                    oldName: dialog.branchName,
                    newName: textA.trim()
                  });
                  onClose();
                }}
              >
                Rename
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'delete-branch' && (
          <>
            <div className="gg-modal-header">
              <span>Delete Branch {dialog.branchName}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagB}
                  onChange={(e) => setFlagB(e.target.checked)}
                />
                <span>Force delete (-D) even if unmerged</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'delete-branch',
                    branchName: dialog.branchName,
                    force: flagB
                  });
                  onClose();
                }}
              >
                Delete Branch
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'merge-branch' && (
          <>
            <div className="gg-modal-header">
              <span>Merge {dialog.branchName} into Current Branch</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagB}
                  onChange={(e) => setFlagB(e.target.checked)}
                />
                <span>Create a new commit even if fast-forward is possible (--no-ff)</span>
              </label>
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagC}
                  onChange={(e) => setFlagC(e.target.checked)}
                />
                <span>Squash commits (--squash)</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'merge',
                    target: dialog.branchName,
                    noFastForward: flagB,
                    squash: flagC,
                    noCommit: false
                  });
                  onClose();
                }}
              >
                Merge
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'rebase-branch' && (
          <>
            <div className="gg-modal-header">
              <span>Rebase Current Branch onto {dialog.ontoBranch}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagA}
                  onChange={(e) => setFlagA(e.target.checked)}
                />
                <span>Auto-stash uncommitted changes before rebase (--autostash)</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'rebase',
                    onto: dialog.ontoBranch,
                    autostash: flagA
                  });
                  onClose();
                }}
              >
                Rebase
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'push-branch' && (
          <>
            <div className="gg-modal-header">
              <span>Push Branch {dialog.branchName}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <div className="gg-field">
                <label className="gg-field-label">Remote</label>
                <input
                  type="text"
                  className="gg-input"
                  value={textA || defaultRemote}
                  onChange={(e) => setTextA(e.target.value)}
                />
              </div>
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagA}
                  onChange={(e) => setFlagA(e.target.checked)}
                />
                <span>Set upstream (-u)</span>
              </label>
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagB}
                  onChange={(e) => setFlagB(e.target.checked)}
                />
                <span>Force with lease (--force-with-lease)</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'push-branch',
                    branchName: dialog.branchName,
                    remote: (textA || defaultRemote).trim(),
                    setUpstream: flagA,
                    forceMode: flagB ? 'force-with-lease' : 'none'
                  });
                  onClose();
                }}
              >
                Push
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'pull-branch' && (
          <>
            <div className="gg-modal-header">
              <span>Pull Branch {dialog.branchName}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <div className="gg-field">
                <label className="gg-field-label">Remote</label>
                <input
                  type="text"
                  className="gg-input"
                  value={textA || defaultRemote}
                  onChange={(e) => setTextA(e.target.value)}
                />
              </div>
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagB}
                  onChange={(e) => setFlagB(e.target.checked)}
                />
                <span>Rebase instead of merge (--rebase)</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'pull-branch',
                    remote: (textA || defaultRemote).trim(),
                    branchName: dialog.branchName,
                    noFastForward: false,
                    squash: false,
                    rebase: flagB
                  });
                  onClose();
                }}
              >
                Pull
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'cherry-pick' && (
          <>
            <div className="gg-modal-header">
              <span>Cherry-Pick Commit {dialog.commit.abbreviatedHash}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagA}
                  onChange={(e) => setFlagA(e.target.checked)}
                />
                <span>Record origin commit hash in message (-x)</span>
              </label>
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagB}
                  onChange={(e) => setFlagB(e.target.checked)}
                />
                <span>Stage changes without committing (--no-commit)</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'cherry-pick',
                    commitHash: dialog.commit.hash,
                    parentIndex: dialog.commit.parents.length > 1 ? 1 : undefined,
                    recordOrigin: flagA,
                    noCommit: flagB
                  });
                  onClose();
                }}
              >
                Cherry-Pick
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'revert-commit' && (
          <>
            <div className="gg-modal-header">
              <span>Revert Commit {dialog.commit.abbreviatedHash}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagB}
                  onChange={(e) => setFlagB(e.target.checked)}
                />
                <span>Stage revert changes without committing (--no-commit)</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'revert-commit',
                    commitHash: dialog.commit.hash,
                    parentIndex: dialog.commit.parents.length > 1 ? 1 : undefined,
                    noCommit: flagB
                  });
                  onClose();
                }}
              >
                Revert
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'reset-commit' && (
          <>
            <div className="gg-modal-header">
              <span>Reset Current Branch to {dialog.commit.abbreviatedHash}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <div className="gg-field">
                <label className="gg-field-label">Reset Mode</label>
                <select
                  className="gg-select"
                  value={resetMode}
                  onChange={(e) => setResetMode(e.target.value as 'soft' | 'mixed' | 'hard')}
                >
                  <option value="soft">Soft — Keep all changes staged</option>
                  <option value="mixed">Mixed — Keep working tree, unstage index</option>
                  <option value="hard">Hard — Discard all uncommitted changes</option>
                </select>
              </div>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'reset-to-commit',
                    commitHash: dialog.commit.hash,
                    mode: resetMode
                  });
                  onClose();
                }}
              >
                Reset ({resetMode})
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'drop-commit' && (
          <>
            <div className="gg-modal-header">
              <span>Drop Commit {dialog.commit.abbreviatedHash}?</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <p className="gg-margin-0 gg-font-12">
                This will rebase <code>HEAD</code> onto the parent of{' '}
                <code>{dialog.commit.abbreviatedHash}</code>, removing this commit from the
                current branch history.
              </p>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'drop-commit',
                    commitHash: dialog.commit.hash,
                    branch: currentBranch ?? undefined
                  });
                  onClose();
                }}
              >
                Drop Commit
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'add-tag' && (
          <>
            <div className="gg-modal-header">
              <span>Add Tag at {dialog.commit.abbreviatedHash}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <div className="gg-field">
                <label className="gg-field-label">Tag Name</label>
                <input
                  type="text"
                  className="gg-input"
                  placeholder="v1.0.0"
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                  autoFocus
                />
              </div>
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagA}
                  onChange={(e) => setFlagA(e.target.checked)}
                />
                <span>Annotated Tag (-a)</span>
              </label>
              {flagA && (
                <div className="gg-field">
                  <label className="gg-field-label">Tag Message</label>
                  <input
                    type="text"
                    className="gg-input"
                    placeholder="Release v1.0.0"
                    value={textB}
                    onChange={(e) => setTextB(e.target.value)}
                  />
                </div>
              )}
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagB}
                  onChange={(e) => setFlagB(e.target.checked)}
                />
                <span>Push tag to {defaultRemote} immediately</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                disabled={!textA.trim()}
                onClick={() => {
                  onRunAction({
                    kind: 'create-tag',
                    tagName: textA.trim(),
                    commitHash: dialog.commit.hash,
                    annotated: flagA,
                    message: textB.trim() || textA.trim(),
                    pushToRemote: flagB ? defaultRemote : null
                  });
                  onClose();
                }}
              >
                Create Tag
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'tag-details' && (
          <>
            <div className="gg-modal-header">
              <span>Tag Details: {dialog.tagName}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              {!dialog.details ? (
                <div>Loading tag details…</div>
              ) : (
                <div className="gg-details-meta-grid">
                  <span className="gg-details-meta-label">Name:</span>
                  <span>{dialog.details.name}</span>
                  <span className="gg-details-meta-label">Type:</span>
                  <span>{dialog.details.isAnnotated ? 'Annotated' : 'Lightweight'}</span>
                  <span className="gg-details-meta-label">Target:</span>
                  <code>{dialog.details.hash}</code>
                  {dialog.details.taggerName && (
                    <>
                      <span className="gg-details-meta-label">Tagger:</span>
                      <span>
                        {dialog.details.taggerName} &lt;{dialog.details.taggerEmail}&gt;
                      </span>
                    </>
                  )}
                  {dialog.details.message && (
                    <>
                      <span className="gg-details-meta-label">Message:</span>
                      <span>{dialog.details.message}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'commit-uncommitted' && (
          <>
            <div className="gg-modal-header">
              <span>Commit Uncommitted Changes</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <div className="gg-field">
                <label className="gg-field-label">Commit Message</label>
                <input
                  type="text"
                  className="gg-input"
                  placeholder="Describe your changes"
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                disabled={!textA.trim()}
                onClick={() => {
                  onRunAction({ kind: 'commit-uncommitted', message: textA.trim() });
                  onClose();
                }}
              >
                Commit
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'stash-push' && (
          <>
            <div className="gg-modal-header">
              <span>Stash Uncommitted Changes</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <div className="gg-field">
                <label className="gg-field-label">Stash Message (optional)</label>
                <input
                  type="text"
                  className="gg-input"
                  placeholder="WIP: feature changes"
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                  autoFocus
                />
              </div>
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagA}
                  onChange={(e) => setFlagA(e.target.checked)}
                />
                <span>Include untracked files (-u)</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'stash-push',
                    message: textA.trim() || undefined,
                    includeUntracked: flagA
                  });
                  onClose();
                }}
              >
                Stash Changes
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'stash-branch' && (
          <>
            <div className="gg-modal-header">
              <span>Create Branch from {dialog.selector}</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <div className="gg-field">
                <label className="gg-field-label">Branch Name</label>
                <input
                  type="text"
                  className="gg-input"
                  placeholder="stash-recovery"
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                disabled={!textA.trim()}
                onClick={() => {
                  onRunAction({
                    kind: 'stash-branch',
                    selector: dialog.selector,
                    branchName: textA.trim()
                  });
                  onClose();
                }}
              >
                Create Branch
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'clean-untracked' && (
          <>
            <div className="gg-modal-header">
              <span>Clean Untracked Files</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <label className="gg-checkbox-row">
                <input
                  type="checkbox"
                  checked={flagA}
                  onChange={(e) => setFlagA(e.target.checked)}
                />
                <span>Include untracked directories (-d)</span>
              </label>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-primary"
                onClick={() => {
                  onRunAction({
                    kind: 'clean-untracked',
                    includeDirectories: flagA
                  });
                  onClose();
                }}
              >
                Clean Files
              </button>
            </div>
          </>
        )}

        {dialog.kind === 'discard-all' && (
          <>
            <div className="gg-modal-header">
              <span>Discard All Changes</span>
              <button type="button" className="gg-btn gg-btn-icon" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="gg-modal-body">
              <p>
                This resets all tracked files to HEAD and deletes all untracked files and
                directories. This cannot be undone.
              </p>
            </div>
            <div className="gg-modal-footer">
              <button type="button" className="gg-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="gg-btn gg-btn-danger"
                onClick={() => {
                  onRunAction({ kind: 'discard-all' });
                  onClose();
                }}
              >
                Discard All
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
