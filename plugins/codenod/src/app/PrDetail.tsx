import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { experimental_requestApproval, useRealtime, useZccNavigate } from '@zana-ai/zcc-plugin-sdk/app';
import type { ChangedFile, FindingRow, ModelChoice, ReviewEvent } from '../server/types.ts';
import type { PrDetail as PrDetailData } from '../server/views.ts';
import { errorText, formatDuration, relativeTime, scoreTone } from './format.ts';
import { ProviderModelPicker } from './ModelSearchPicker.tsx';
import type { AvailableProvider, Rpc } from './types.ts';

type DetailTab = 'findings' | 'models' | 'diff';

const TICK_MS = 1000;

function isActive(status: string | undefined): boolean {
  return status === 'queued' || status === 'running';
}

function useNow(ticking: boolean): number {
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

function ScoreChip({ label, value, kind, note }: { label: string; value: number | null; kind: 'risk' | 'quality'; note?: string | null }) {
  const tone = scoreTone(value, kind);
  return (
    <div className="cn-score" title={note ?? undefined}>
      <div className="cn-score-label">{label}</div>
      <div className={`cn-score-value ${tone ? `cn-badge-${tone}` : ''}`}>{value === null ? 'N/A' : `${value}/10`}</div>
    </div>
  );
}

function FindingCard(props: {
  finding: FindingRow;
  modelCount: number;
  selected: boolean;
  onToggle(): void;
  onDismiss(): void;
}) {
  const { finding } = props;
  const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
  return (
    <article className="cn-finding" data-dismissed={finding.dismissed}>
      <div className="cn-finding-head">
        <label className="cn-check">
          <input type="checkbox" checked={props.selected} disabled={finding.dismissed || finding.postedAt !== null} onChange={props.onToggle} aria-label={`Select finding in ${location}`} />
          <span className={`cn-sev-${finding.severity}`}>{finding.severity.toUpperCase()}</span>
        </label>
        <span className="cn-badge">{finding.category}</span>
        {props.modelCount > 1 ? (
          <span className={`cn-badge ${finding.agreedBy.length === props.modelCount ? 'cn-badge-ok' : ''}`} title={finding.agreedBy.join(', ')}>
            {finding.agreedBy.length}/{props.modelCount} models
          </span>
        ) : null}
        <span className="cn-mono cn-small">{location}</span>
        {finding.postedAt ? <span className="cn-badge cn-badge-ok">Posted</span> : null}
        <span className="cn-spacer" />
        <button type="button" className="cn-btn cn-small" onClick={props.onDismiss}>
          {finding.dismissed ? 'Restore' : 'Dismiss'}
        </button>
      </div>
      <p>{finding.description}</p>
      {finding.suggestion ? (
        <p className="cn-muted">
          <strong>Fix:</strong> {finding.suggestion}
        </p>
      ) : null}
    </article>
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

function ModelPicker(props: { rpc: Rpc; defaults: ModelChoice[]; onRun(models: ModelChoice[]): void; onClose(): void }) {
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
        providers.map((provider) => <ProviderModelPicker key={provider.providerId} provider={provider} value={chosen} onChange={setChosen} />)
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [event, setEvent] = useState<ReviewEvent>('COMMENT');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  let navigate: ReturnType<typeof useZccNavigate> | null = null;
  try {
    navigate = useZccNavigate();
  } catch {
    navigate = null;
  }

  const requestSeq = useRef(0);
  const load = useCallback(() => {
    const requestId = ++requestSeq.current;
    rpc
      .call('detail', { prId })
      .then((value) => {
        if (requestSeq.current !== requestId) return;
        setDetail(value as PrDetailData);
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
    load();
  }, [load]);
  useRealtime('codenod:changed', load);

  const reviewId = detail?.review?.id ?? null;
  const findingIds = detail?.findings.map((finding) => finding.id).join('\0') ?? '';
  const postableKey = detail?.findings
    .filter((finding) => !finding.dismissed && finding.postedAt === null)
    .map((finding) => finding.id)
    .join('\0') ?? '';
  const selectionReview = useRef<string | null>(null);
  const selectionFindings = useRef('');
  useEffect(() => {
    if (!detail || !reviewId) {
      selectionReview.current = null;
      selectionFindings.current = '';
      return;
    }
    const postableIds = postableKey ? postableKey.split('\0') : [];
    const reviewChanged = selectionReview.current !== reviewId;
    const findingsChanged = selectionFindings.current !== findingIds;
    selectionReview.current = reviewId;
    selectionFindings.current = findingIds;
    if (reviewChanged || findingsChanged) {
      setSelected(new Set(postableIds));
      return;
    }
    const allowed = new Set(postableIds);
    setSelected((current) => {
      const next = new Set([...current].filter((id) => allowed.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [detail, reviewId, findingIds, postableKey]);

  const modelCount = useMemo(() => detail?.runs.filter((run) => run.status === 'completed').length ?? 0, [detail]);
  const now = useNow(isActive(detail?.review?.status) || (detail?.runs.some((run) => isActive(run.status)) ?? false));

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
  const reviewing = isActive(review?.status);
  const reviewElapsed = review ? formatDuration(review.createdAt, review.completedAt ?? now) : '';
  const canPost = review?.status === 'completed' && (selected.size > 0 || message.trim().length > 0 || event === 'APPROVE');

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
          details: [pr.title, `Commit ${review.headSha.slice(0, 12)}`, `${selected.size} finding(s) included`],
          confirmLabel: EVENT_LABELS[event],
          tone: event === 'REQUEST_CHANGES' ? 'danger' : 'default'
        });
        if (!result.approved || !result.token) {
          setNotice({ kind: 'info', text: result.reason === 'unavailable' ? 'Signed confirmation is only available in the Zana desktop app.' : 'Not posted.' });
          return;
        }
        approvalToken = result.token;
      }
      const result = (await rpc.call('post', { reviewId: review.id, findingIds: [...selected], event, body: message, approvalToken })) as {
        url: string | null;
        commentCount: number;
      };
      setMessage('');
      setNotice({ kind: 'info', text: `Posted to GitHub (${result.commentCount} inline comment${result.commentCount === 1 ? '' : 's'}).` });
      load();
    });

  const deepReview = () =>
    act('deep', async () => {
      const result = (await rpc.call('deepReview', { prId: pr.id })) as { threadId: string };
      if (navigate?.toThread) navigate.toThread(result.threadId);
      else setNotice({ kind: 'info', text: 'Deep Review thread started. Find it in your thread list.' });
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
            {review.stale ? <p className="cn-banner">New commits were pushed after this review. Re-review before approving.</p> : null}
            {reviewing ? (
              <p className="cn-banner cn-inline" role="status" aria-busy="true">
                <span className="cn-spinner" aria-hidden="true" />
                Review {review.status} · {runs.filter((run) => run.status === 'completed').length}/{runs.length} model(s) done · {reviewElapsed}
              </p>
            ) : null}
            {review.status === 'failed' ? (
              <p className="cn-banner cn-banner-error">
                Review failed after {reviewElapsed}: {review.error}
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
                  {id === 'findings' ? `Findings (${findings.filter((finding) => !finding.dismissed).length})` : id === 'models' ? `Models (${runs.length})` : 'Diff'}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="cn-section">
              {tab === 'findings' ? (
                findings.length === 0 ? (
                  <p className="cn-empty">{review.status === 'completed' ? 'No issues found.' : 'Findings appear when the review completes.'}</p>
                ) : (
                  findings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      modelCount={modelCount}
                      selected={selected.has(finding.id)}
                      onToggle={() =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (next.has(finding.id)) next.delete(finding.id);
                          else next.add(finding.id);
                          return next;
                        })
                      }
                      onDismiss={() => void rpc.call('dismissFinding', { findingId: finding.id, dismissed: !finding.dismissed }).then(load)}
                    />
                  ))
                )
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
          <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => void act('cancel', async () => void (await rpc.call('cancelReview', { reviewId: review!.id })))}>
            Cancel review
          </button>
        ) : (
          <>
            <button type="button" className="cn-btn cn-btn-primary" disabled={busy !== null || !props.hasModels} onClick={() => void startReview()}>
              {review ? 'Re-review' : 'Review'}
            </button>
            <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => setPickerOpen((open) => !open)} aria-expanded={pickerOpen}>
              Models…
            </button>
          </>
        )}
        <button type="button" className="cn-btn" disabled={busy !== null} onClick={() => void deepReview()}>
          Deep Review in thread
        </button>
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
            <button type="button" className="cn-btn cn-btn-primary" disabled={busy !== null || !canPost || (event !== 'COMMENT' && review.stale)} onClick={() => void post()}>
              {busy === 'post' ? 'Posting…' : `Post ${selected.size} selected`}
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
