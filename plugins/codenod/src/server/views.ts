import type { Store } from './db.ts';
import type { FindingRow, PrBucket, PullRequestRow, ReviewRow, ReviewRunRow } from './types.ts';

export interface PrListItem extends PullRequestRow {
  review: Pick<ReviewRow, 'id' | 'status' | 'riskScore' | 'headSha' | 'createdAt'> & { stale: boolean; findingCount: number } | null;
}

export interface PrDetail {
  pr: PullRequestRow;
  review: (ReviewRow & { stale: boolean }) | null;
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
  return store
    .listPullRequests()
    .filter((pr) => !bucket || pr.buckets.includes(bucket))
    .map((pr) => {
      const review = reviews.get(pr.id);
      return {
        ...pr,
        review: review
          ? {
              id: review.id,
              status: review.status,
              riskScore: review.riskScore,
              headSha: review.headSha,
              createdAt: review.createdAt,
              stale: review.headSha !== pr.headSha,
              findingCount: review.status === 'completed' ? store.listFindings(review.id).filter((finding) => !finding.dismissed).length : 0
            }
          : null
      };
    });
}

export function getPrDetail(store: Store, prId: string): PrDetail | null {
  const pr = store.getPullRequest(prId);
  if (!pr) return null;
  const review = store.latestReview(pr.id);
  return {
    pr,
    review: review ? { ...review, stale: review.headSha !== pr.headSha } : null,
    runs: review ? store.listRuns(review.id) : [],
    findings: review ? sortFindings(store.listFindings(review.id)) : [],
    posted: review ? store.listPostedReviews(review.id) : []
  };
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
