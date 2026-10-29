import type { Store } from './db.ts';
import type { FindingRow, LocalScope, LocalTargetRow, PrBucket, PullRequestRow, ReviewRow, ReviewRunRow, SkippedFile } from './types.ts';

export interface PrListItem extends PullRequestRow {
  outdated?: boolean;
  review: Pick<ReviewRow, 'id' | 'status' | 'riskScore' | 'headSha' | 'createdAt'> & { stale: boolean; findingCount: number } | null;
}

export interface PrDetail {
  pr: PullRequestRow;
  review: (ReviewRow & { stale: boolean }) | null;
  /** A newer attempt is separate from the completed results displayed above. */
  latestAttempt?: ReviewRow;
  latestRuns?: ReviewRunRow[];
  runs: ReviewRunRow[];
  findings: FindingRow[];
  posted: Array<{ event: string; url: string | null; commentCount: number; postedAt: number }>;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function sortFindings(findings: FindingRow[]): FindingRow[] {
  return [...findings].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      b.confidence - a.confidence ||
      a.file.localeCompare(b.file) ||
      (a.line ?? 0) - (b.line ?? 0)
  );
}

export function listPullRequests(store: Store, bucket?: PrBucket): PrListItem[] {
  const reviews = store.latestReviewsByPr();
  const completedReviews = store.latestCompletedReviewsByPr?.();
  const pullRequests = store.listPullRequests().filter((pr) => !bucket || pr.buckets.includes(bucket));
  const completedIds = pullRequests.flatMap((pr) => {
    const review = reviews.get(pr.id);
    return review?.status === 'completed' ? [review.id] : [];
  });
  const findingCounts = store.countUndismissedFindings(completedIds);
  return pullRequests.map((pr) => {
    const review = reviews.get(pr.id);
    const completed = review?.status === 'completed' ? review : completedReviews?.get(pr.id) ?? store.latestCompletedReview(pr.id);
    return {
      ...pr,
      outdated: Boolean(completed && completed.headSha !== pr.headSha),
      review: review
        ? {
            id: review.id,
            status: review.status,
            riskScore: review.riskScore,
            headSha: review.headSha,
            createdAt: review.createdAt,
            stale: review.headSha !== pr.headSha,
            findingCount: review.status === 'completed' ? findingCounts.get(review.id) ?? 0 : 0
          }
        : null
    };
  });
}

export function getPrDetail(store: Store, prId: string): PrDetail | null {
  const pr = store.getPullRequest(prId);
  if (!pr) return null;
  const latest = store.latestReview(pr.id);
  const completed = latest && latest.status !== 'completed' ? store.latestCompletedReview(pr.id) : null;
  const review = completed ?? latest;
  return {
    pr,
    ...(completed && latest ? { latestAttempt: latest, latestRuns: store.listRuns(latest.id) } : {}),
    review: review ? { ...review, stale: review.headSha !== pr.headSha } : null,
    runs: review ? store.listRuns(review.id) : [],
    findings: review ? sortFindings(store.listFindings(review.id)) : [],
    posted: review ? store.listPostedReviews(review.id) : []
  };
}

export interface LocalSnapshotView {
  scope: LocalScope;
  baseRef: string | null;
  baseSha: string;
  headSha: string;
  snapshotSha: string;
  treeSha: string;
  intent: string | null;
  source: string;
  files: Array<{ path: string; status: string; additions: number; deletions: number }>;
  skipped: SkippedFile[];
}

export interface LocalHistoryItem {
  id: string;
  status: ReviewRow['status'];
  riskScore: number | null;
  createdAt: number;
  scope: LocalScope | null;
  baseRef: string | null;
  findingCount: number;
}

export interface LocalDetail {
  target: LocalTargetRow;
  review: ReviewRow | null;
  snapshot: LocalSnapshotView | null;
  /** A newer attempt is separate from the completed results displayed above. */
  latestAttempt?: ReviewRow;
  latestRuns?: ReviewRunRow[];
  runs: ReviewRunRow[];
  findings: FindingRow[];
  history: LocalHistoryItem[];
}

/** The latest completed local review of a target (or the one requested), with newer attempts and history. */
export function getLocalDetail(store: Store, targetId: string, reviewId?: string): LocalDetail | null {
  const target = store.getLocalTarget(targetId);
  if (!target) return null;
  const entries = store.listLocalReviews(targetId);
  const latest = entries[0]?.review ?? null;
  const requested = reviewId ? entries.find((entry) => entry.review.id === reviewId)?.review ?? null : null;
  if (reviewId && !requested) return null;
  const completed = !requested && latest && latest.status !== 'completed' ? entries.find((entry) => entry.review.status === 'completed')?.review ?? null : null;
  const review = requested ?? completed ?? latest;
  const snapshot = review ? store.getLocalSnapshot(review.id) : null;
  const counts = store.countUndismissedFindings(entries.filter((entry) => entry.review.status === 'completed').map((entry) => entry.review.id));
  return {
    target,
    ...(completed && latest ? { latestAttempt: latest, latestRuns: store.listRuns(latest.id) } : {}),
    review,
    snapshot: snapshot
      ? {
          scope: snapshot.scope,
          baseRef: snapshot.baseRef,
          baseSha: snapshot.baseSha,
          headSha: snapshot.headSha,
          snapshotSha: snapshot.snapshotSha,
          treeSha: snapshot.treeSha,
          intent: snapshot.intent,
          source: snapshot.source,
          files: snapshot.files.map(({ path, status, additions, deletions }) => ({ path, status, additions, deletions })),
          skipped: snapshot.skipped
        }
      : null,
    runs: review ? store.listRuns(review.id) : [],
    findings: review ? sortFindings(store.listFindings(review.id)) : [],
    history: entries.map(({ review: item, snapshot: itemSnapshot }) => ({
      id: item.id,
      status: item.status,
      riskScore: item.riskScore,
      createdAt: item.createdAt,
      scope: itemSnapshot?.scope ?? null,
      baseRef: itemSnapshot?.baseRef ?? null,
      findingCount: counts.get(item.id) ?? 0
    }))
  };
}

const SKIP_REASON_LABELS: Record<SkippedFile['reason'], string> = {
  'possible-secret': 'possible secret',
  'too-large': 'too large',
  binary: 'binary',
  'too-many-files': 'too many new files',
  generated: 'generated or lockfile',
  'over-budget': 'over the diff size budget'
};

export function skipReasonLabel(reason: SkippedFile['reason']): string {
  return SKIP_REASON_LABELS[reason] ?? reason;
}

export function formatLocalDetail(detail: LocalDetail, options: { stale?: boolean } = {}): string {
  const { target, review, snapshot, runs, findings } = detail;
  const lines = [`${target.worktreePath} · ${target.branch ?? 'detached HEAD'}`];
  if (!review || !snapshot) {
    lines.push('Not reviewed yet. Run: zcc codenod review-local');
    return lines.join('\n');
  }
  lines.push(
    `Scope ${snapshot.scope}${snapshot.baseRef ? ` vs ${snapshot.baseRef}` : ''} · snapshot ${snapshot.snapshotSha.slice(0, 12)} · ${snapshot.files.length} file(s) reviewed`,
    '',
    `Review ${review.status}${options.stale ? ' (stale: files changed since this review)' : ''} · ${runs.map((run) => `${run.model}: ${run.status}`).join(', ')}`
  );
  if (detail.latestAttempt) lines.push(`Latest rerun ${detail.latestAttempt.status}${detail.latestAttempt.error ? ': ' + detail.latestAttempt.error : ''}; showing previous completed results.`);
  if (review.error) lines.push(`Error: ${review.error}`);
  if (snapshot.skipped.length > 0) {
    lines.push(`Skipped: ${snapshot.skipped.slice(0, 20).map((file) => `${file.path} (${skipReasonLabel(file.reason)})`).join(', ')}${snapshot.skipped.length > 20 ? ', …' : ''}`);
  }
  if (review.status === 'completed') {
    lines.push(
      `Risk ${score(review.riskScore)} · Coverage ${score(review.coverageScore)} · Requirements ${review.hasRequirements ? score(review.requirementsScore) : 'N/A (no stated requirements)'} · Simplicity ${score(review.simplicityScore)} · Stability ${score(review.stabilityScore)}`,
      '',
      review.consensusSummary ?? review.summary ?? ''
    );
    const visible = findings.filter((finding) => !finding.dismissed);
    lines.push('', `Findings (${visible.length}):`);
    for (const finding of visible) {
      lines.push(`- ${finding.id.slice(0, 8)} [${finding.severity}] ${finding.category} ${finding.file}${finding.line ? `:${finding.line}` : ''}`, `  ${finding.description}`);
      if (finding.suggestion) lines.push(`  Fix: ${finding.suggestion}`);
    }
  }
  return lines.join('\n');
}

function score(value: number | null, max = 10): string {
  return value === null ? 'N/A' : `${value}/${max}`;
}

export function formatPrLine(item: PrListItem): string {
  const review = item.review
    ? item.review.status === 'completed'
      ? `risk ${score(item.review.riskScore)}, ${item.review.findingCount} finding(s)${item.review.stale ? ', stale' : ''}`
      : item.review.status
    : 'not reviewed';
  const draft = item.isDraft ? ' [draft]' : '';
  return `${item.owner}/${item.repo}#${item.number}${draft}  ${item.title}  (@${item.author}, CI ${item.ciState}, ${review})\n  ${item.url}`;
}

export function formatPrDetail(detail: PrDetail): string {
  const { pr, review, runs, findings } = detail;
  const lines = [`${pr.owner}/${pr.repo}#${pr.number}: ${pr.title}`, `@${pr.author} · ${pr.headRef} → ${pr.baseRef} · CI ${pr.ciState}`, pr.url, ''];
  if (!review) {
    lines.push('Not reviewed yet. Run: zcc codenod review ' + pr.url);
    return lines.join('\n');
  }
  lines.push(`Review ${review.status}${review.stale ? ' (stale: new commits since review)' : ''} · ${runs.map((run) => `${run.model}: ${run.status}`).join(', ')}`);
  if (detail.latestAttempt) lines.push(`Latest rerun ${detail.latestAttempt.status} at ${detail.latestAttempt.headSha}${detail.latestAttempt.error ? ': ' + detail.latestAttempt.error : ''}; showing previous completed results.`);
  if (review.error) lines.push(`Error: ${review.error}`);
  if (review.status === 'completed') {
    lines.push(
      `Risk ${score(review.riskScore)} · Coverage ${score(review.coverageScore)} · Requirements ${review.hasRequirements ? score(review.requirementsScore) : 'N/A (no stated requirements)'} · Simplicity ${score(review.simplicityScore)} · Stability ${score(review.stabilityScore)}`,
      '',
      review.consensusSummary ?? review.summary ?? ''
    );
    const visible = findings.filter((finding) => !finding.dismissed);
    lines.push('', `Findings (${visible.length}):`);
    for (const finding of visible) {
      const agreement = runs.length > 1 ? ` [${finding.agreedBy.length}/${runs.filter((run) => run.status === 'completed').length}]` : '';
      lines.push(
        `- ${finding.id.slice(0, 8)} [${finding.severity}] ${finding.category}${agreement} ${finding.file}${finding.line ? `:${finding.line}` : ''}${finding.postedAt ? ' (posted)' : ''}`,
        `  ${finding.description}`
      );
      if (finding.suggestion) lines.push(`  Fix: ${finding.suggestion}`);
    }
  }
  return lines.join('\n');
}
