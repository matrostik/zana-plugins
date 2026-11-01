import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useRealtime, useZccNavigate } from '@zana-ai/zcc-plugin-sdk/app';
import type { LocalLocationSummary, LocalReviewStatus } from '../server/local/service.ts';
import type { ChangedFile, FixAgentChoice, LocalScope, ModelChoice, ReviewRow, ReviewRunRow } from '../server/types.ts';
import { FixAgentPicker } from './FixAgentPicker.tsx';
import type { LocalDetail as LocalDetailData, LocalHistoryItem, LocalSnapshotView } from '../server/views.ts';
import { copyTextToClipboard, errorText, formatDuration, formatLocalFindingsPrompt, relativeTime, scoreTone, skipReasonText } from './format.ts';
import { FindingsView, type FindingFilters } from './FindingsView.tsx';
import { DiffFiles, isActive, ModelPicker, ScoreChip, useNow } from './PrDetail.tsx';
import { Segmented, type SegmentedOption } from './Segmented.tsx';
import { PromptSelector, useReviewPrompts } from './PromptSelector.tsx';
import type { Rpc } from './types.ts';

type DetailTab = 'findings' | 'models' | 'files';
type SpawnResult = { threadId: string; priority: number; model: ModelChoice; usedFallback: boolean };
type FixResult = { needsConfirmation: true; reason: string } | { needsConfirmation: false; threadId: string };

const STATUS_CHECK_THROTTLE_MS = 60_000;
const SAVED_PILL_MS = 3_000;
const MAX_INTENT_CHARS = 2_000;

export const SCOPE_OPTIONS: Array<SegmentedOption<LocalScope>> = [
  { id: 'uncommitted', label: 'Uncommitted' },
  { id: 'staged', label: 'Staged' },
  { id: 'branch', label: 'Branch vs base' }
];

const SCOPE_HINTS: Record<LocalScope, string> = {
  uncommitted: 'Every change since the last commit, including new files that are not ignored.',
  staged: 'Only the changes staged with git add.',
  branch: 'Everything since this branch left the base branch, including uncommitted work.'
};

function scopeLabel(scope: LocalScope | null): string {
  return SCOPE_OPTIONS.find((option) => option.id === scope)?.label ?? '–';
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LocalFiles({ rpc, reviewId }: { rpc: Rpc; reviewId: string }) {
  const [files, setFiles] = useState<ChangedFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setFiles(null);
    setError(null);
    rpc
      .call('localDiff', { reviewId })
      .then((value) => !cancelled && setFiles(value as ChangedFile[]))
      .catch((cause) => !cancelled && setError(errorText(cause)));
    return () => {
      cancelled = true;
    };
  }, [rpc, reviewId]);
  if (error) return <p className="cn-banner cn-banner-error">{error}</p>;
  if (!files) return <p className="cn-muted">Loading reviewed files…</p>;
  return <DiffFiles files={files} />;
}

type NavLike = ReturnType<typeof useZccNavigate>;

function ModelRunsTable({ runs, now, navigate }: { runs: ReviewRunRow[]; now: number; navigate: NavLike }) {
  return (
    <table className="cn-table">
      <thead>
        <tr>
          <th scope="col">Model</th>
          <th scope="col">Status</th>
          <th scope="col">Time</th>
          <th scope="col">Risk</th>
          <th scope="col">Issues</th>
          <th scope="col">Notes</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id}>
            <td className="cn-mono">
              {run.providerId}/{run.model}
            </td>
            <td>{run.status}</td>
            <td className="cn-mono">{run.status === 'queued' ? '–' : formatDuration(run.startedAt, run.completedAt ?? now)}</td>
            <td>{run.riskScore ?? '–'}</td>
            <td>{run.status === 'completed' ? run.issueCount : '–'}</td>
            <td>
              {run.error ?? run.summary ?? ''}
              {run.threadId && navigate?.toThread ? (
                <>
                  {' '}
                  <button type="button" className="cn-btn cn-small" onClick={() => navigate?.toThread?.(run.threadId!)}>
                    Open thread
                  </button>
                </>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SkippedFiles({ skipped }: { skipped: LocalSnapshotView['skipped'] }) {
  const secretSkipped = skipped.some((file) => file.reason === 'possible-secret');
  return (
    <details className="cn-prompt">
      <summary>
        {skipped.length} file{skipped.length === 1 ? '' : 's'} not reviewed
        {secretSkipped ? <span className="cn-badge cn-badge-danger cn-local-summary-badge">Possible secret skipped</span> : null}
      </summary>
      <ul className="cn-skipped-list">
        {skipped.map((file) => (
          <li key={file.path} className="cn-skipped-item">
            <span className="cn-mono">{file.path}</span>
            <span className={`cn-badge ${file.reason === 'possible-secret' ? 'cn-badge-danger' : 'cn-badge-muted'}`}>{skipReasonText(file.reason)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function LocalHistory({ history, currentId, onView }: { history: LocalHistoryItem[]; currentId: string | null; onView(id: string): void }) {
  return (
    <details className="cn-prompt">
      <summary>History ({history.length})</summary>
      <div className="cn-table-wrap cn-local-history">
        <table className="cn-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Scope</th>
              <th scope="col">Risk</th>
              <th scope="col">Findings</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="cn-visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => {
              const tone = scoreTone(item.riskScore, 'risk');
              return (
                <tr key={item.id} aria-current={item.id === currentId ? 'true' : undefined}>
                  <td>{relativeTime(item.createdAt)}</td>
                  <td>
                    {scopeLabel(item.scope)}
                    {item.baseRef ? <span className="cn-muted cn-small"> vs {item.baseRef}</span> : null}
                  </td>
                  <td>{item.riskScore === null ? '–' : <span className={`cn-badge ${tone ? `cn-badge-${tone}` : ''}`}>{item.riskScore}/10</span>}</td>
                  <td>{item.status === 'completed' ? item.findingCount : '–'}</td>
                  <td>{item.status}</td>
                  <td>
                    {item.id === currentId ? (
                      <span className="cn-muted cn-small">Showing</span>
                    ) : (
                      <button type="button" className="cn-btn cn-small" onClick={() => onView(item.id)}>
                        View
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function LocalDetail(props: { rpc: Rpc; location: LocalLocationSummary; defaultModels: ModelChoice[]; hasModels: boolean; onOpenSettings(): void; reloadToken?: number }) {
  const { prompts, error: promptsError, promptId, setPromptId } = useReviewPrompts(props.rpc);
  const { rpc, location } = props;
  const formId = useId();
  const [detail, setDetail] = useState<LocalDetailData | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [status, setStatus] = useState<LocalReviewStatus | null>(null);
  const [scope, setScope] = useState<LocalScope>(location.lastScope ?? 'uncommitted');
  const [base, setBase] = useState('');
  const [intent, setIntent] = useState('');
  const [tab, setTab] = useState<DetailTab>('findings');
  const [filters, setFilters] = useState<FindingFilters>({ severity: 'all', category: 'all' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingFinding, setEditingFinding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [fixSelection, setFixSelection] = useState<string[] | null>(null);
  const [confirmFix, setConfirmFix] = useState<{ findingIds: string[]; reason: string; agent: FixAgentChoice } | null>(null);
  const [fixThreadId, setFixThreadId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const initializedReviewId = useRef<string | null>(null);

  const navigate: ReturnType<typeof useZccNavigate> | undefined = useZccNavigate() ?? undefined;

  const requestSeq = useRef(0);
  const load = useCallback((requestedReviewId: string | null = viewingId) => {
    const requestId = ++requestSeq.current;
    rpc
      .call('localDetail', { targetId: location.targetId, ...(requestedReviewId ? { reviewId: requestedReviewId } : {}) })
      .then((value) => {
        if (requestSeq.current !== requestId) return;
        const next = value as LocalDetailData;
        setDetail(next);
        const nextReviewId = next.review?.status === 'completed' ? next.review.id : null;
        if (nextReviewId && initializedReviewId.current !== nextReviewId) {
          initializedReviewId.current = nextReviewId;
          setSelectedIds(new Set(next.findings.filter((finding) => !finding.dismissed).map((finding) => finding.id)));
        } else if (!nextReviewId) {
          initializedReviewId.current = null;
          setSelectedIds(new Set());
        }
      })
      .catch((cause) => {
        if (requestSeq.current !== requestId) return;
        setNotice({ kind: 'error', text: errorText(cause) });
      });
  }, [rpc, location.targetId, viewingId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime('codewink:changed', (payload) => {
    const record = (payload ?? {}) as { prId?: unknown; targetId?: unknown; finding?: unknown; swept?: unknown };
    if (record.prId === location.targetId || record.targetId === location.targetId || record.finding || record.swept) load();
  });

  const reviewId = detail?.review?.id ?? null;
  const reviewCompleted = detail?.review?.status === 'completed';
  const lastStatusCheck = useRef(0);
  const statusSeq = useRef(0);
  const checkStatus = useCallback(
    (force = false) => {
      if (!reviewId || !reviewCompleted) return;
      if (!force && Date.now() - lastStatusCheck.current < STATUS_CHECK_THROTTLE_MS) return;
      lastStatusCheck.current = Date.now();
      const requestId = ++statusSeq.current;
      rpc
        .call('localStatus', { reviewId })
        .then((value) => {
          if (statusSeq.current === requestId) setStatus(value as LocalReviewStatus);
        })
        .catch((cause) => {
          // Keep the last known freshness so a transient failure does not hide an "outdated" warning.
          if (statusSeq.current === requestId) setNotice({ kind: 'error', text: `Could not check checkout status: ${errorText(cause)}` });
        });
    },
    [rpc, reviewId, reviewCompleted]
  );
  useEffect(() => {
    setStatus(null);
    checkStatus(true);
  }, [checkStatus]);
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== 'hidden') checkStatus();
    };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [checkStatus]);

  const reloadToken = props.reloadToken;
  const initialToken = useRef(reloadToken);
  useEffect(() => {
    if (reloadToken === initialToken.current) return;
    load();
    checkStatus(true);
  }, [reloadToken, load, checkStatus]);

  // Reset review-scoped actions before the new results can receive user input.
  useLayoutEffect(() => {
    setFilters({ severity: 'all', category: 'all' });
    setEditingFinding(false);
    setConfirmFix(null);
    setFixSelection(null);
    setConfirmDelete(false);
  }, [reviewId]);

  useEffect(() => {
    if (!snapshotTaken) return;
    const timer = setTimeout(() => setSnapshotTaken(false), SAVED_PILL_MS);
    return () => clearTimeout(timer);
  }, [snapshotTaken]);

  const attempt = detail?.latestAttempt ?? detail?.review ?? null;
  const attemptRuns = detail?.latestRuns ?? detail?.runs ?? [];
  const reviewing = isActive(attempt?.status);
  const now = useNow(reviewing || (detail?.runs.some((run) => isActive(run.status)) ?? false));

  const act = async (label: string, fn: () => Promise<void>, options: { rethrow?: boolean } = {}) => {
    setBusy(label);
    setNotice(null);
    try {
      await fn();
    } catch (cause) {
      if (options.rethrow) throw cause;
      setNotice({ kind: 'error', text: errorText(cause) });
    } finally {
      setBusy(null);
    }
  };

  const spawnedNotice = (result: SpawnResult | { threadId: string }, what: string) => {
    if (navigate?.toThread) navigate.toThread(result.threadId);
    if ('usedFallback' in result && result.usedFallback) {
      const failed = result.priority === 2 ? 'Priority 1 could not start' : `Priorities 1–${result.priority - 1} could not start`;
      setNotice({ kind: 'info', text: `${failed}. ${what} is using priority ${result.priority} (${result.model.providerId}/${result.model.model}).` });
    } else if (!navigate?.toThread) {
      setNotice({ kind: 'info', text: `${what} thread started. Find it in your thread list.` });
    }
  };

  const startReview = (models?: ModelChoice[], override?: { scope: LocalScope; base: string | null; intent: string | null }) =>
    act('review', async () => {
      setPickerOpen(false);
      setFixThreadId(null);
      const accepted = await rpc.call('startLocalReview', {
        projectId: location.projectId,
        worktreePath: location.worktreePath,
        scope: override?.scope ?? scope,
        base: override ? override.base : scope === 'branch' ? base.trim() || null : null,
        intent: override ? override.intent : intent.trim() || null,
        ...(override && detail?.review?.promptSnapshot ? { rerunReviewId: detail.review.id } : promptId !== undefined ? { promptId } : {}),
        ...(models ? { models } : {})
      }) as ReviewRow;
      ++requestSeq.current;
      setDetail((current) => current && accepted?.id ? { ...current, review: accepted, snapshot: null, runs: [], findings: [], latestAttempt: undefined, latestRuns: undefined } : current);
      setSelectedIds(new Set());
      initializedReviewId.current = null;
      setTab('findings');
      setViewingId(null);
      setSnapshotTaken(true);
      load(null);
    });

  const snapshot = detail?.snapshot ?? null;
  const rerun = () =>
    snapshot ? startReview(undefined, { scope: snapshot.scope, base: snapshot.baseRef, intent: snapshot.intent }) : startReview();

  if (!detail) {
    return (
      <div className="cn-detail">
        {notice ? <p className="cn-banner cn-banner-error">{notice.text}</p> : <p className="cn-empty">Loading…</p>}
      </div>
    );
  }

  const { review, runs, findings } = detail;
  const activeFindings = findings.filter((finding) => !finding.dismissed);
  const selectedFindings = activeFindings.filter((finding) => selectedIds.has(finding.id));
  const allSelected = selectedFindings.length === activeFindings.length;
  const targetedIds = !allSelected && selectedFindings.length > 0 ? selectedFindings.map((finding) => finding.id) : [];
  const nothingSelected = activeFindings.length > 0 && selectedFindings.length === 0;
  const stale = Boolean(status?.stale) && reviewCompleted;
  const attemptElapsed = attempt ? formatDuration(attempt.createdAt, attempt.completedAt ?? now) : '';
  const viewingOlder = viewingId !== null && detail.history[0]?.id !== viewingId;
  const label = `${location.projectName} · ${location.branch ?? 'detached HEAD'}`;

  const deepReview = () =>
    act('deep', async () => {
      if (!review) return;
      spawnedNotice((await rpc.call('localDeepReview', { reviewId: review.id, findingIds: targetedIds })) as SpawnResult, 'Deep Review');
    });

  const fix = async (findingIds: string[], force: boolean, agent: FixAgentChoice) => {
    if (!review) throw new Error('No review is available to fix. Run a review first.');
    const result = (await rpc.call('localFix', { reviewId: review.id, findingIds, force, agent })) as FixResult;
    setFixSelection(null);
    if (result.needsConfirmation) {
      setConfirmFix({ findingIds, reason: result.reason, agent });
      return;
    }
    setConfirmFix(null);
    setFixThreadId(result.threadId);
    spawnedNotice(result, 'Fix');
  };

  const remove = () =>
    act('delete', async () => {
      if (!review) return;
      await rpc.call('deleteLocalReview', { reviewId: review.id });
      setConfirmDelete(false);
      setViewingId(null);
      initializedReviewId.current = null;
      load();
    });

  const copyPrompt = async () => {
    if (!snapshot || !selectedFindings.length) return;
    try {
      await copyTextToClipboard(formatLocalFindingsPrompt({ label: `${label} (${location.worktreePath})`, snapshotSha: snapshot.snapshotSha, findings: selectedFindings }));
      setNotice({ kind: 'info', text: `Copied ${selectedFindings.length} finding${selectedFindings.length === 1 ? '' : 's'} as a prompt.` });
    } catch (cause) {
      setNotice({ kind: 'error', text: `Could not copy findings: ${errorText(cause)}` });
    }
  };

  return (
    <section className="cn-detail" aria-label={`Local changes in ${label}`}>
      <div className="cn-detail-scroll">
        <header className="cn-header">
          <h2>{location.branch ?? 'Detached HEAD'}</h2>
          <div className="cn-inline cn-muted cn-small">
            <span>{location.projectName}</span>
            <span className="cn-mono" title={location.worktreePath}>
              {location.worktreePath}
            </span>
            {location.isMain ? <span>main checkout</span> : <span>worktree</span>}
          </div>
        </header>

        {notice ? (
          <p className={`cn-banner ${notice.kind === 'error' ? 'cn-banner-error' : ''}`} role="status">
            {notice.text}
          </p>
        ) : null}
        {!props.hasModels ? (
          <p className="cn-banner">
            No review model is selected yet.{' '}
            <button type="button" className="cn-btn" onClick={props.onOpenSettings}>
              Choose models
            </button>
          </p>
        ) : null}

        <section className="cn-section cn-local-form" aria-labelledby={`${formId}-title`}>
          <h3 id={`${formId}-title`}>Review local changes</h3>
          <p className="cn-muted">CodeWink reviews a snapshot of this checkout. Your files, staging area, and branch are not changed.</p>
          <div className="cn-fields">
            <div className="cn-field">
              <span>Scope</span>
              <Segmented<LocalScope> label="Changes to review" role="radio" options={SCOPE_OPTIONS} value={scope} onChange={setScope} disabled={busy !== null} />
              <span className="cn-small cn-muted">{SCOPE_HINTS[scope]}</span>
            </div>
            {scope === 'branch' ? (
              <div className="cn-field">
                <label htmlFor={`${formId}-base`}>Base branch</label>
                <input
                  id={`${formId}-base`}
                  className="cn-input"
                  value={base}
                  placeholder="Remote default branch"
                  spellCheck={false}
                  onChange={(event) => setBase(event.target.value)}
                />
              </div>
            ) : null}
            <div className="cn-field cn-field-wide">
              <label htmlFor={`${formId}-intent`}>Intent (optional)</label>
              <textarea
                id={`${formId}-intent`}
                className="cn-textarea"
                value={intent}
                maxLength={MAX_INTENT_CHARS}
                placeholder="What should this change do? Used to score requirements."
                onChange={(event) => setIntent(event.target.value)}
              />
            </div>
          </div>
          <PromptSelector prompts={prompts} error={promptsError} value={promptId} onChange={setPromptId} />
          {review?.promptSnapshot ? <details><summary>Review prompt: {review.promptSnapshot.name}</summary><pre className="cn-prompt-text">{review.promptSnapshot.instructions || 'Built-in prompt only'}</pre></details> : null}
          <div className="cn-inline">
            <button type="button" className="cn-btn cn-btn-primary" disabled={busy !== null || !props.hasModels || reviewing || status?.missing === true} onClick={() => void startReview()}>
              {busy === 'review' ? (
                <span className="cn-inline">
                  <span className="cn-spinner" aria-hidden="true" />
                  Taking snapshot…
                </span>
              ) : (
                'Review changes'
              )}
            </button>
            <button type="button" className="cn-btn" disabled={busy !== null || reviewing || status?.missing === true} aria-expanded={pickerOpen} onClick={() => setPickerOpen((open) => !open)}>
              Models…
            </button>
            {snapshotTaken ? (
              <span className="cn-status-saved" role="status">
                <CheckIcon />
                Snapshot taken
              </span>
            ) : null}
          </div>
          {pickerOpen ? <ModelPicker rpc={rpc} defaults={props.defaultModels} onRun={(models) => void startReview(models)} onClose={() => setPickerOpen(false)} /> : null}
        </section>

        {fixSelection ? <FixAgentPicker rpc={rpc} defaults={props.defaultModels} onRun={(agent) => act('fix', () => fix(fixSelection, false, agent), { rethrow: true })} onClose={() => setFixSelection(null)} /> : null}

        {!review ? (
          <p className="cn-empty">Not reviewed yet.</p>
        ) : (
          <>
            {viewingOlder ? (
              <p className="cn-banner cn-inline" role="status">
                Showing an earlier review from {relativeTime(review.createdAt)}.
                <button type="button" className="cn-btn cn-small" onClick={() => setViewingId(null)}>
                  Show latest
                </button>
              </p>
            ) : null}
            {stale && status ? (
              <div className="cn-banner cn-banner-warn" role="status" aria-label="Review outdated">
                <strong>Working tree changed since this review</strong>
                <p>
                  This review saw tree <code title={status.reviewedTree}>{status.reviewedTree.slice(0, 7)}</code>
                  {status.currentTree ? (
                    <>
                      , but the {scopeLabel(snapshot?.scope ?? null).toLowerCase()} changes are now <code title={status.currentTree}>{status.currentTree.slice(0, 7)}</code>
                    </>
                  ) : null}
                  . Rerun the review to get findings for the current files.
                </p>
              </div>
            ) : null}
            {status?.missing ? <p className="cn-banner cn-banner-error">This checkout can no longer be read. It may have been removed.</p> : null}
            {reviewing ? (
              <p className="cn-banner cn-inline" role="status" aria-busy="true">
                <span className="cn-spinner" aria-hidden="true" />
                Review {attempt!.status} · {attemptRuns.filter((run) => run.status === 'completed').length}/{attemptRuns.length} model(s) done · {attemptElapsed}
              </p>
            ) : null}
            {attempt?.status === 'failed' && (!viewingOlder || review.status === 'failed') ? (
              <p className="cn-banner cn-banner-error">
                Review failed after {attemptElapsed}: {attempt.error}
              </p>
            ) : null}
            {review.status === 'cancelled' ? <p className="cn-banner">Review cancelled.</p> : null}
            {confirmFix ? (
              <div className="cn-banner cn-banner-warn" role="group" aria-label="Confirm fix">
                <strong>{confirmFix.reason}</strong>
                <p>The fix agent will work on your current files, which differ from what was reviewed. Fix anyway?</p>
                <div className="cn-inline">
                  <button type="button" className="cn-btn cn-btn-primary" disabled={busy !== null} onClick={() => void act('fix', () => fix(confirmFix.findingIds, true, confirmFix.agent))}>
                    Fix anyway
                  </button>
                  <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => setConfirmFix(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {fixThreadId ? (
              <p className="cn-banner cn-inline" role="status">
                A fix agent is editing this checkout. Re-review when it finishes.
                {navigate?.toThread ? (
                  <button type="button" className="cn-btn cn-small" onClick={() => navigate?.toThread?.(fixThreadId)}>
                    Open fix thread
                  </button>
                ) : null}
                <button type="button" className="cn-btn cn-small" disabled={busy !== null || reviewing || status?.missing === true} onClick={() => void rerun()}>
                  Re-review
                </button>
              </p>
            ) : null}

            {review.status === 'completed' ? (
              <>
                <div className="cn-scores">
                  <ScoreChip label="Risk" value={review.riskScore} kind="risk" />
                  <ScoreChip label="Coverage" value={review.coverageScore} kind="quality" note={review.coverageNote} />
                  <ScoreChip
                    label="Requirements"
                    value={review.hasRequirements ? review.requirementsScore : null}
                    kind="quality"
                    note={review.hasRequirements ? review.requirementsNote : 'No stated intent, spec files, or commit messages'}
                  />
                  <ScoreChip label="Simplicity" value={review.simplicityScore} kind="quality" note={review.simplicityNote} />
                  <ScoreChip label="Stability" value={review.stabilityScore} kind="quality" note={review.stabilityNote} />
                </div>
                <p className="cn-summary">{review.consensusSummary ?? review.summary}</p>
                <p className="cn-muted cn-small">
                  {scopeLabel(snapshot?.scope ?? null)}
                  {snapshot?.baseRef ? ` vs ${snapshot.baseRef}` : ''} · {snapshot?.files.length ?? 0} file(s) reviewed · {relativeTime(review.createdAt)}
                  {snapshot?.intent ? ` · Intent: ${snapshot.intent}` : ''}
                </p>
              </>
            ) : null}

            <div className="cn-tabs" role="tablist" aria-label="Review details">
              {(['findings', 'models', 'files'] as DetailTab[]).map((id) => (
                <button key={id} type="button" role="tab" className="cn-tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                  {id === 'findings' ? `Findings (${activeFindings.length})` : id === 'models' ? `Models (${runs.length})` : `Files (${snapshot?.files.length ?? 0})`}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="cn-section">
              {tab === 'findings' ? (
                findings.length === 0 && review.status !== 'completed' ? (
                  <p className="cn-empty">Findings appear when the review completes.</p>
                ) : (
                  <FindingsView
                    key={review.id}
                    rpc={rpc}
                    contextSource={{ kind: 'local', reviewId: review.id }}
                    reviewId={review.id}
                    stale={false}
                    findings={findings}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onEditingChange={setEditingFinding}
                    disabled={busy !== null}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onCopyPrompt={() => void copyPrompt()}
                    onFindingsChange={(next) => {
                      setDetail((current) => (current?.review?.id === review.id ? { ...current, findings: next } : current));
                      const eligible = new Set(next.filter((finding) => !finding.dismissed).map((finding) => finding.id));
                      setSelectedIds((selected) => new Set([...selected].filter((id) => eligible.has(id))));
                    }}
                  />
                )
              ) : null}
              {tab === 'models' ? <ModelRunsTable runs={runs} now={now} navigate={navigate} /> : null}
              {tab === 'files' ? <LocalFiles rpc={rpc} reviewId={review.id} /> : null}
            </div>

            {snapshot && snapshot.skipped.length > 0 ? <SkippedFiles skipped={snapshot.skipped} /> : null}
          </>
        )}

        {detail.history.length > 0 ? <LocalHistory history={detail.history} currentId={review?.id ?? null} onView={setViewingId} /> : null}
      </div>

      <div className="cn-actions">
        {reviewing && attempt ? (
          <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => void act('cancel', async () => void (await rpc.call('cancelReview', { reviewId: attempt.id })))}>
            Cancel review
          </button>
        ) : review ? (
          <button type="button" className={`cn-btn ${stale ? 'cn-btn-warn' : ''}`} disabled={busy !== null || !props.hasModels || status?.missing === true} onClick={() => void rerun()}>
            {stale ? 'Review outdated — Rerun' : 'Rerun'}
          </button>
        ) : null}
        {review?.status === 'completed' ? (
          <>
            <button type="button" className="cn-btn" disabled={busy !== null || editingFinding || nothingSelected} onClick={() => void deepReview()}>
              {targetedIds.length > 0 ? `Deep Review (${targetedIds.length} selected)` : 'Deep Review in thread'}
            </button>
            <button
              type="button"
              className="cn-btn"
              disabled={busy !== null || fixSelection !== null || reviewing || editingFinding || activeFindings.length === 0 || nothingSelected || status?.missing === true}
              onClick={() => { setNotice(null); setConfirmFix(null); setFixSelection(targetedIds); }}
            >
              {targetedIds.length > 0 ? `Fix ${targetedIds.length} with agent` : 'Fix with agent'}
            </button>
          </>
        ) : null}
        {review?.coordinatorThreadId && navigate?.toThread ? (
          <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => navigate?.toThread?.(review.coordinatorThreadId!)}>
            Review thread
          </button>
        ) : null}
        <span className="cn-spacer" />
        {review && !reviewing ? (
          confirmDelete ? (
            <>
              <span className="cn-small cn-muted">Delete this review and its snapshot?</span>
              <button type="button" className="cn-btn cn-btn-danger" disabled={busy !== null} onClick={() => void remove()}>
                Delete
              </button>
              <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </>
          ) : (
            <button type="button" className="cn-btn cn-btn-danger" disabled={busy !== null} onClick={() => setConfirmDelete(true)}>
              Delete review
            </button>
          )
        ) : null}
      </div>
    </section>
  );
}
