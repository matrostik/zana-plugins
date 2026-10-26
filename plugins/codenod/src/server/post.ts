import type { Store } from './db.ts';
import type { GitHubClient, ReviewCommentInput } from './github/client.ts';
import { parsePrId } from './github/refs.ts';
import { commentableLines } from './review/diff.ts';
import type { ChangedFile, FindingRow, ReviewEvent } from './types.ts';

const MAX_INLINE_COMMENTS = 50;
const MAX_BODY_CHARS = 60_000;

export function formatFinding(finding: FindingRow, modelCount: number): string {
  const lines = [`**[${finding.severity.toUpperCase()}] ${finding.category}** — ${finding.description}`];
  if (finding.suggestion) lines.push('', `**Suggestion:** ${finding.suggestion}`);
  if (modelCount > 1) lines.push('', `<sub>CodeNod · flagged by ${finding.agreedBy.length}/${modelCount} models</sub>`);
  else lines.push('', '<sub>CodeNod</sub>');
  return lines.join('\n');
}

export interface ReviewPayload {
  comments: ReviewCommentInput[];
  body: string;
  inlineIds: string[];
  bodyIds: string[];
}

/** Splits findings into inline comments (lines present in the diff) and a body list for the rest. */
export function buildReviewPayload(input: {
  findings: FindingRow[];
  files: ChangedFile[];
  modelCount: number;
  summary: string | null;
  extraBody?: string;
}): ReviewPayload {
  const linesByFile = new Map(input.files.map((file) => [file.path, commentableLines(file.patch)]));
  const comments: ReviewCommentInput[] = [];
  const inlineIds: string[] = [];
  const bodyIds: string[] = [];
  const bodyEntries: string[] = [];
  for (const finding of input.findings) {
    const lines = linesByFile.get(finding.file);
    if (finding.line != null && lines?.has(finding.line) && comments.length < MAX_INLINE_COMMENTS) {
      comments.push({ path: finding.file, line: finding.line, body: formatFinding(finding, input.modelCount) });
      inlineIds.push(finding.id);
    } else {
      const location = finding.line != null ? `${finding.file}:${finding.line}` : finding.file;
      bodyEntries.push(`- \`${location.replace(/`/g, "'")}\` ${formatFinding(finding, input.modelCount).replace(/\n+/g, ' ')}`);
      bodyIds.push(finding.id);
    }
  }
  const prefixParts: string[] = [];
  if (input.extraBody?.trim()) prefixParts.push(input.extraBody.trim());
  if (input.summary) prefixParts.push(`**CodeNod summary:** ${input.summary}`);
  const prefix = prefixParts.join('\n\n');
  if (prefix.length > MAX_BODY_CHARS) return { comments, body: prefix.slice(0, MAX_BODY_CHARS), inlineIds, bodyIds: [] };
  const includedLines: string[] = [];
  const includedIds: string[] = [];
  for (let index = 0; index < bodyEntries.length; index++) {
    const findingsBlock = `**Findings outside the diff:**\n${[...includedLines, bodyEntries[index]].join('\n')}`;
    const candidate = prefix ? `${prefix}\n\n${findingsBlock}` : findingsBlock;
    if (candidate.length > MAX_BODY_CHARS) break;
    includedLines.push(bodyEntries[index]);
    includedIds.push(bodyIds[index]);
  }
  const body = includedLines.length === 0 ? prefix : prefix ? `${prefix}\n\n**Findings outside the diff:**\n${includedLines.join('\n')}` : `**Findings outside the diff:**\n${includedLines.join('\n')}`;
  return { comments, body, inlineIds, bodyIds: includedIds };
}

export class StaleReviewError extends Error {
  constructor(readonly reviewedSha: string, readonly currentSha: string) {
    super(`The pull request has new commits (${currentSha.slice(0, 7)}) since this review (${reviewedSha.slice(0, 7)}). Re-review before approving or requesting changes.`);
    this.name = 'StaleReviewError';
  }
}

export function createPoster(deps: { store: Store; github: GitHubClient }) {
  return {
    async currentHeadSha(prId: string): Promise<string> {
      return (await deps.github.getPull(parsePrId(prId))).head.sha;
    },

    async post(input: { reviewId: string; findingIds: string[]; event: ReviewEvent; body?: string }): Promise<{ url: string | null; commentCount: number; bodyFindingCount: number }> {
      const review = deps.store.getReview(input.reviewId);
      if (!review) throw new Error(`Review ${input.reviewId} not found`);
      if (review.status !== 'completed') throw new Error('Only completed reviews can be posted');
      const ref = parsePrId(review.prId);
      const pull = await deps.github.getPull(ref);
      if (input.event !== 'COMMENT' && pull.head.sha !== review.headSha) throw new StaleReviewError(review.headSha, pull.head.sha);

      const wanted = new Set(input.findingIds);
      const findings = deps.store.listFindings(review.id).filter((finding) => wanted.has(finding.id) && !finding.dismissed && !finding.postedAt);
      if (findings.length === 0 && input.event === 'COMMENT' && !input.body?.trim()) throw new Error('Select at least one finding or write a message to post');

      const files = await deps.github.listFiles(ref);
      const modelCount = deps.store.listRuns(review.id).filter((run) => run.status === 'completed').length;
      const payload = buildReviewPayload({
        findings,
        files: pull.head.sha === review.headSha ? files : [],
        modelCount,
        summary: findings.length > 0 ? review.consensusSummary ?? review.summary : null,
        extraBody: input.body
      });
      const created = await deps.github.createReview(ref, {
        commitId: review.headSha,
        event: input.event,
        body: payload.body || (input.event === 'APPROVE' ? 'Approved after CodeNod review.' : 'CodeNod review'),
        comments: payload.comments
      });
      deps.store.markFindingsPosted([...payload.inlineIds, ...payload.bodyIds]);
      deps.store.recordPostedReview({
        reviewId: review.id,
        event: input.event,
        githubReviewId: typeof created?.id === 'number' ? created.id : null,
        url: created?.html_url ?? null,
        commentCount: payload.comments.length
      });
      return { url: created?.html_url ?? null, commentCount: payload.comments.length, bodyFindingCount: payload.bodyIds.length };
    }
  };
}

export type Poster = ReturnType<typeof createPoster>;
