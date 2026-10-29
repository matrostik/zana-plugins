import { useCallback, useEffect, useRef, useState } from 'react';
import { experimental_requestApproval, useRealtime, useZccNavigate } from '@zana-ai/zcc-plugin-sdk/app';
import type { ChangedFile, ModelChoice, ReviewEvent } from '../server/types.ts';
import type { PrDetail as PrDetailData } from '../server/views.ts';
import { copyTextToClipboard, errorText, formatDuration, formatFindingsPrompt, relativeTime, scoreTone } from './format.ts';
import { FindingsView, matchesFinding, type FindingFilters } from './FindingsView.tsx';
import { ModelPriorityPicker } from './ModelSearchPicker.tsx';
import type { AvailableProvider, Rpc } from './types.ts';

type DetailTab = 'findings' | 'models' | 'diff';

const TICK_MS = 1000;

export function isActive(status: string | undefined): boolean {
  return status === 'queued' || status === 'running';
}

export function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [ticking]);
  return now;
}

const EVENT_LABELS: Record<ReviewEvent, string> = {
  COMMENT: 'Comment',
  APPROVE: 'Approve',
  REQUEST_CHANGES: 'Request changes'
};

export function ScoreChip({ label, value, kind, note }: { label: string; value: number | null; kind: 'risk' | 'quality'; note?: string | null }) {
  const tone = scoreTone(value, kind);
  return (
    <div className="cn-score" title={note ?? undefined}>
      <div className="cn-score-label">{label}</div>
      <div className={`cn-score-value ${tone ? `cn-badge-${tone}` : ''}`}>{value === null ? 'N/A' : `${value}/10`}</div>
    </div>
  );
}

function DiffView({ rpc, prId }: { rpc: Rpc; prId: string }) {
  const [files, setFiles] = useState<ChangedFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setFiles(null);
    rpc
      .call('diff', { prId })
      .then((value) => !cancelled && setFiles(value as ChangedFile[]))
      .catch((cause) => !cancelled && setError(errorText(cause)));
    return () => {
      cancelled = true;
    };
  }, [rpc, prId]);
  if (error) return <p className="cn-banner cn-banner-error">{error}</p>;
  if (!files) return <p className="cn-muted">Loading diff…</p>;
  return <DiffFiles files={files} />;
}

export function DiffFiles({ files }: { files: ChangedFile[] }) {
  return (
    <div>
      {files.map((file) => (
        <section key={file.path} aria-label={file.path}>
          <div className="cn-inline cn-small">
            <strong className="cn-mono">{file.path}</strong>
            <span className="cn-muted">
              {file.status} · +{file.additions} −{file.deletions}
            </span>
          </div>
          {file.patch ? (
            <div className="cn-diff" role="region" aria-label={`Diff of ${file.path}`} tabIndex={0}>
              {file.patch.split('\n').map((line, index) => (
                <div
                  key={index}
                  className={`cn-diff-line ${line.startsWith('@@') ? 'cn-diff-hunk' : line.startsWith('+') ? 'cn-diff-add' : line.startsWith('-') ? 'cn-diff-del' : ''}`}
                >
                  {line || ' '}
                </div>
              ))}
            </div>
          ) : (
            <p className="cn-muted cn-small">No textual diff (binary or too large).</p>
          )}
        </section>
      ))}
    </div>
  );
}

export function ModelPicker(props: { rpc: Rpc; defaults: ModelChoice[]; onRun(models: ModelChoice[]): void; onClose(): void }) {
  const [providers, setProviders] = useState<AvailableProvider[] | null>(null);
  const [chosen, setChosen] = useState<ModelChoice[]>(props.defaults);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    props.rpc
      .call('availableModels')
      .then((value) => setProviders(value as AvailableProvider[]))
      .catch((cause) => setError(errorText(cause)));
  }, [props.rpc]);
  return (
    <div className="cn-banner" role="dialog" aria-label="Choose review models">
      {error ? <p className="cn-banner-error">{error}</p> : null}
      {!providers ? (
        <p className="cn-muted">Loading models…</p>
      ) : (
        <ModelPriorityPicker value={chosen} providers={providers} onChange={setChosen} />
      )}
      <div className="cn-inline">
        <button type="button" className="cn-btn cn-btn-primary" disabled={chosen.length === 0} onClick={() => props.onRun(chosen)}>
          Review with {chosen.length} model{chosen.length === 1 ? '' : 's'}
        </button>
        <button type="button" className="cn-btn" onClick={props.onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function PrDetail(props: { rpc: Rpc; pluginId: string; prId: string; defaultModels: ModelChoice[]; hasModels: boolean; onOpenSettings(): void }) {
  const { rpc, prId } = props;
  const [detail, setDetail] = useState<PrDetailData | null>(null);
  const [tab, setTab] = useState<DetailTab>('findings');
  const [filters, setFilters] = useState<FindingFilters>({ severity: 'all', category: 'all' });
  const [editingFinding, setEditingFinding] = useState(false);
  const [event, setEvent] = useState<ReviewEvent>('COMMENT');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFindingIds, setSelectedFindingIds] = useState<Set<string>>(new Set());
  const [findingSelectionCustomized, setFindingSelectionCustomized] = useState(false);
  const initializedReviewId = useRef<string | null>(null);
  const prevFindingsPosted = useRef<Map<string, number | null>>(new Map());

  const navigate: ReturnType<typeof useZccNavigate> | undefined = useZccNavigate() ?? undefined;

  const requestSeq = useRef(0);
  const load = useCallback(() => {
    const requestId = ++requestSeq.current;
    rpc
      .call('detail', { prId })
      .then((value) => {
        if (requestSeq.current !== requestId) return;
        const next = value as PrDetailData;
        setDetail(next);
        const nextReviewId = next.review?.id ?? null;
        const reviewCompleted = next.review?.status === 'completed';
        const eligible = next.findings.filter((finding) => !finding.dismissed && finding.postedAt === null);
        const isNewReview = reviewCompleted && initializedReviewId.current !== nextReviewId;
        if (reviewCompleted) {
          initializedReviewId.current = nextReviewId;
        }
        const prevPosted = prevFindingsPosted.current;
        const newlyPostedIds = new Set(
          next.findings
            .filter((finding) => finding.postedAt !== null && prevPosted.has(finding.id) && prevPosted.get(finding.id) !== finding.postedAt)
            .map((finding) => finding.id)
        );
        prevFindingsPosted.current = new Map(next.findings.map((finding) => [finding.id, finding.postedAt]));
        setSelectedFindingIds((selected) => isNewReview
          ? new Set(eligible.map((finding) => finding.id))
          : new Set(next.findings.filter((finding) => !finding.dismissed && !newlyPostedIds.has(finding.id) && selected.has(finding.id)).map((finding) => finding.id)));
      })
      .catch((cause) => {
        if (requestSeq.current !== requestId) return;
        setNotice({ kind: 'error', text: errorText(cause) });
      });
  }, [rpc, prId]);

  useEffect(() => {
    setDetail(null);
    setNotice(null);
    setPickerOpen(false);
    initializedReviewId.current = null;
    prevFindingsPosted.current = new Map();
    load();
  }, [load]);
  useEffect(() => {
    let cancelled = false;
    void rpc.call('refreshPullRequest', { prId })
      .then(() => { if (!cancelled) load(); })
      .catch((cause) => { if (!cancelled) setNotice({ kind: 'error', text: `Could not check for new commits: ${errorText(cause)}` }); });
    return () => { cancelled = true; };
  }, [rpc, prId, load]);
  useRealtime('codenod:changed', load);

  const reviewId = detail?.review?.id ?? null;
  useEffect(() => {
    setFilters({ severity: 'all', category: 'all' });
    setEditingFinding(false);
    setFindingSelectionCustomized(false);
  }, [prId, reviewId]);
  const postableFindings = detail?.findings.filter((finding) => selectedFindingIds.has(finding.id) && !finding.dismissed && matchesFinding(finding, filters)) ?? [];
  const selectedFindings = detail?.findings.filter((finding) => selectedFindingIds.has(finding.id) && !finding.dismissed) ?? [];

  const now = useNow(isActive(detail?.latestAttempt?.status) || isActive(detail?.review?.status) || (detail?.runs.some((run) => isActive(run.status)) ?? false));

  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setNotice(null);
    try {
      await fn();
    } catch (cause) {
      setNotice({ kind: 'error', text: errorText(cause) });
    } finally {
      setBusy(null);
    }
  };

  if (!detail) return <div className="cn-detail">{notice ? <p className="cn-banner cn-banner-error">{notice.text}</p> : <p className="cn-empty">Loading…</p>}</div>;

  const { pr, review, runs, findings } = detail;
  const attempt = detail.latestAttempt ?? review;
  const attemptRuns = detail.latestRuns ?? runs;
  const reviewing = isActive(attempt?.status);
  const attemptElapsed = attempt ? formatDuration(attempt.createdAt, attempt.completedAt ?? now) : '';
  const reviewElapsed = review ? formatDuration(review.createdAt, review.completedAt ?? now) : '';
  const canPost = review?.status === 'completed' && (postableFindings.length > 0 || message.trim().length > 0 || event === 'APPROVE');

  const activeFindings = findings.filter((f) => !f.dismissed);
  const isAllActive =
    activeFindings.length > 0 &&
    selectedFindingIds.size >= activeFindings.length &&
    activeFindings.every((f) => selectedFindingIds.has(f.id));
  const targetedFindingIds =
    findingSelectionCustomized && !isAllActive && selectedFindings.length > 0 && selectedFindings.length < activeFindings.length
      ? selectedFindings.map((f) => f.id)
      : undefined;

  const startReview = (models?: ModelChoice[]) =>
    act('review', async () => {
      setPickerOpen(false);
      await rpc.call('startReview', { prId: pr.id, ...(models ? { models } : {}) });
      load();
    });

  const post = () =>
    act('post', async () => {
      if (!review) return;
      let approvalToken: string | undefined;
      if (event !== 'COMMENT') {
        const binding = (await rpc.call('approvalBinding', { reviewId: review.id, event })) as Parameters<typeof experimental_requestApproval>[1]['binding'];
        if (typeof experimental_requestApproval !== 'function') throw new Error('Signed confirmation is not available in this Zana build.');
        const result = await experimental_requestApproval(props.pluginId, {
          binding,
          title: `${EVENT_LABELS[event]} ${pr.owner}/${pr.repo}#${pr.number}`,
          details: [pr.title, `Commit ${review.headSha.slice(0, 12)}`, `${postableFindings.length} finding(s) included`],
          confirmLabel: EVENT_LABELS[event],
          tone: event === 'REQUEST_CHANGES' ? 'danger' : 'default'
        });
        if (!result.approved || !result.token) {
          setNotice({ kind: 'info', text: result.reason === 'unavailable' ? 'Signed confirmation is only available in the Zana desktop app.' : 'Not posted.' });
          return;
        }
        approvalToken = result.token;
      }
      const result = (await rpc.call('post', { reviewId: review.id, findingIds: postableFindings.map((finding) => finding.id), event, body: message, approvalToken })) as {
        url: string | null;
        commentCount: number;
      };
      setMessage('');
      setNotice({ kind: 'info', text: `Posted to GitHub (${result.commentCount} inline comment${result.commentCount === 1 ? '' : 's'}).` });
      load();
    });

  const copyPrompt = async () => {
    if (!detail || !selectedFindings.length) return;
    try {
      await copyTextToClipboard(formatFindingsPrompt({
        owner: detail.pr.owner, repo: detail.pr.repo, number: detail.pr.number, title: detail.pr.title,
        headSha: detail.review?.headSha ?? detail.pr.headSha,
        findings: selectedFindings
      }));
      setNotice({ kind: 'info', text: `Copied ${selectedFindings.length} finding${selectedFindings.length === 1 ? '' : 's'} as a prompt.` });
    } catch (cause) {
      setNotice({ kind: 'error', text: `Could not copy findings: ${errorText(cause)}` });
    }
  };

  const deepReview = () =>
    act('deep', async () => {
      const result = (await rpc.call('deepReview', { prId: pr.id, findingIds: targetedFindingIds })) as { threadId: string; priority: number; model: ModelChoice; usedFallback: boolean };
      if (navigate?.toThread) navigate.toThread(result.threadId);
      if (result.usedFallback) {
        const failedPriorities = result.priority === 2 ? 'Priority 1 could not start' : `Priorities 1–${result.priority - 1} could not start`;
        setNotice({ kind: 'info', text: `${failedPriorities}. Deep Review is using priority ${result.priority} (${result.model.providerId}/${result.model.model}).` });
      } else if (!navigate?.toThread) {
        setNotice({ kind: 'info', text: 'Deep Review thread started. Find it in your thread list.' });
      }
    });

  return (
    <section className="cn-detail" aria-label={`Pull request ${pr.owner}/${pr.repo}#${pr.number}`}>
      <div className="cn-detail-scroll">
        <header className="cn-header">
          <h2>{pr.title}</h2>
          <div className="cn-inline cn-muted cn-small">
            <span>
              {pr.owner}/{pr.repo}#{pr.number}
            </span>
            <span>@{pr.author}</span>
            <span className="cn-mono">
              {pr.headRef} → {pr.baseRef}
            </span>
            <span>CI {pr.ciState}</span>
            <span>updated {relativeTime(pr.updatedAt)}</span>
          </div>
        </header>

        {notice ? <p className={`cn-banner ${notice.kind === 'error' ? 'cn-banner-error' : ''}`} role="status">{notice.text}</p> : null}
        {!props.hasModels ? (
          <p className="cn-banner">
            No review model is selected yet.{' '}
            <button type="button" className="cn-btn" onClick={props.onOpenSettings}>
              Choose models
            </button>
          </p>
        ) : null}
        {pickerOpen ? <ModelPicker rpc={rpc} defaults={props.defaultModels} onRun={(models) => void startReview(models)} onClose={() => setPickerOpen(false)} /> : null}

        {!review ? (
          <p className="cn-empty">Not reviewed yet.</p>
        ) : (
          <>
            {review.stale ? (
              <div className="cn-banner cn-banner-warn" role="status" aria-label="Review outdated">
                <strong>Review is outdated</strong>
                <p>This review ran against commit <code title={review.headSha}>{review.headSha.slice(0, 7)}</code>, but the PR is now at <code title={pr.headSha}>{pr.headSha.slice(0, 7)}</code>. Re-run the review to get up-to-date findings.</p>
              </div>
            ) : null}
            {reviewing ? (
              <p className="cn-banner cn-inline" role="status" aria-busy="true">
                <span className="cn-spinner" aria-hidden="true" />
                Review {attempt!.status} · {attemptRuns.filter((run) => run.status === 'completed').length}/{attemptRuns.length} model(s) done · {attemptElapsed}
              </p>
            ) : null}
            {attempt?.status === 'failed' ? (
              <p className="cn-banner cn-banner-error">
                Review failed after {attemptElapsed}: {attempt.error}
              </p>
            ) : null}
            {detail.latestAttempt?.status === 'cancelled' ? <p className="cn-banner">Rerun cancelled. Showing the previous completed review.</p> : null}
            {review.status === 'completed' ? (
              <>
                <div className="cn-scores">
                  <ScoreChip label="Risk" value={review.riskScore} kind="risk" />
                  <ScoreChip label="Coverage" value={review.coverageScore} kind="quality" note={review.coverageNote} />
                  <ScoreChip
                    label="Requirements"
                    value={review.hasRequirements ? review.requirementsScore : null}
                    kind="quality"
                    note={review.hasRequirements ? review.requirementsNote : 'No stated requirements'}
                  />
                  <ScoreChip label="Simplicity" value={review.simplicityScore} kind="quality" note={review.simplicityNote} />
                  <ScoreChip label="Stability" value={review.stabilityScore} kind="quality" note={review.stabilityNote} />
                </div>
                <p className="cn-summary">{review.consensusSummary ?? review.summary}</p>
                <p className="cn-muted cn-small">Reviewed in {reviewElapsed}</p>
              </>
            ) : null}

            <div className="cn-tabs" role="tablist" aria-label="Review details">
              {(['findings', 'models', 'diff'] as DetailTab[]).map((id) => (
                <button key={id} type="button" role="tab" className="cn-tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                  {id === 'findings' ? `Findings (${findings.filter((finding) => !finding.dismissed).length})` : id === 'models' ? `Models (${attemptRuns.length})` : 'Diff'}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="cn-section">
              {tab === 'findings' ? (
                findings.length === 0 && review.status !== 'completed' ? <p className="cn-empty">Findings appear when the review completes.</p> :
                <FindingsView key={review.id} rpc={rpc} contextSource={{ kind: 'pr', pr, headSha: review.headSha }} reviewId={review.id} stale={review.stale}
                  findings={findings} filters={filters} onFiltersChange={setFilters}
                  onEditingChange={setEditingFinding} disabled={busy !== null}
                  selectedIds={selectedFindingIds} onSelectionChange={(next) => { setFindingSelectionCustomized(true); setSelectedFindingIds(next); }} onCopyPrompt={() => void copyPrompt()}
                  onFindingsChange={(next) => {
                    setDetail((current) => current?.review?.id === review.id ? { ...current, findings: next } : current);
                    const eligibleIds = new Set(next.filter((finding) => !finding.dismissed).map((finding) => finding.id));
                    setSelectedFindingIds((selected) => new Set([...selected].filter((id) => eligibleIds.has(id))));
                  }} />
              ) : null}
              {tab === 'models' ? (
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
                    {attemptRuns.map((run) => (
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
              ) : null}
              {tab === 'diff' ? <DiffView rpc={rpc} prId={pr.id} /> : null}
            </div>

            {review.status === 'completed' ? (
              <div className="cn-section">
                <label className="cn-small cn-muted" htmlFor="cn-post-message">
                  Message (optional)
                </label>
                <textarea id="cn-post-message" className="cn-textarea" value={message} onChange={(changeEvent) => setMessage(changeEvent.target.value)} />
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="cn-actions">
        {reviewing ? (
          <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => void act('cancel', async () => void (await rpc.call('cancelReview', { reviewId: attempt!.id })))}>
            Cancel review
          </button>
        ) : (
          <>
            <button type="button" className={`cn-btn ${review?.stale ? 'cn-btn-warn' : 'cn-btn-primary'}`} disabled={busy !== null || !props.hasModels} onClick={() => void startReview()}>
              {review?.stale ? 'Review outdated — Rerun' : review ? 'Re-review' : 'Review'}
            </button>
            <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => setPickerOpen((open) => !open)} aria-expanded={pickerOpen}>
              Models…
            </button>
          </>
        )}
        <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => void deepReview()}>
          {targetedFindingIds && targetedFindingIds.length > 0
            ? `Deep Review (${targetedFindingIds.length} selected)`
            : 'Deep Review in thread'}
        </button>
        {review?.coordinatorThreadId ? (
          <button
            type="button"
            className="cn-btn"
            disabled={busy !== null}
            onClick={() => {
              if (navigate?.toThread) navigate.toThread(review.coordinatorThreadId!);
              else setNotice({ kind: 'info', text: `Review thread ID: ${review.coordinatorThreadId}` });
            }}
          >
            Review thread
          </button>
        ) : null}
        <a className="cn-btn" href={pr.url} target="_blank" rel="noreferrer noopener">
          Open on GitHub
        </a>
        <span className="cn-spacer" />
        {review?.status === 'completed' ? (
          <>
            <label className="cn-small cn-muted" htmlFor="cn-post-event">
              Post as
            </label>
            <select id="cn-post-event" className="cn-select" value={event} onChange={(changeEvent) => setEvent(changeEvent.target.value as ReviewEvent)}>
              {(Object.keys(EVENT_LABELS) as ReviewEvent[]).map((key) => (
                <option key={key} value={key}>
                  {EVENT_LABELS[key]}
                </option>
              ))}
            </select>
            <button type="button" className="cn-btn cn-btn-primary" disabled={busy !== null || editingFinding || !canPost || (event !== 'COMMENT' && review.stale)} onClick={() => void post()}>
              {busy === 'post' ? 'Posting…' : `Post ${postableFindings.length} finding${postableFindings.length === 1 ? '' : 's'} to GitHub`}
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
