import type { IssueCategory, ParsedIssue, ReviewScores, Severity } from '../types.ts';

export interface TaggedIssue extends ParsedIssue {
  id: string;
  model: string;
}

export interface IssueCluster {
  category: IssueCategory;
  file: string;
  line: number | null;
  severity: Severity;
  confidence: number;
  agreedBy: string[];
  description: string;
  suggestion: string | null;
}

export const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'not', 'no', 'this', 'that', 'it', 'its', 'if', 'then', 'than'
]);

export const SIMILARITY_THRESHOLD = 0.45;
export const HIGH_SIMILARITY_THRESHOLD = 0.6;
export const LINE_PROXIMITY_DEFAULT = 5;
export const LINE_PROXIMITY_LARGE_FILE = 3;
export const LARGE_FILE_LINE_THRESHOLD = 500;
export const PHRASE_ANCHOR_BOOST = 0.35;
// Findings on the same file within a tight line band are strong evidence of the
// same defect even when models word them very differently.
export const SAME_LOCATION_THRESHOLD = 0.18;
export const SAME_LOCATION_LINE_BAND = 2;
// Cross-category merge: same exact line, both high+, a shared concrete literal,
// and topical overlap beyond that literal.
export const CO_LOCATION_MIN_SEVERITY_RANK = 3;
export const CO_LOCATION_TOPICAL_FLOOR = 0.05;

const CONCRETE_VALUE_RE = /\d{3,}|:\/\/|[a-z0-9.-]+:\d{2,5}\b|[/.][a-z0-9]/i;

export function tokenize(text: string): Set<string> {
  const unigrams = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  const bigrams: string[] = [];
  for (let index = 0; index < unigrams.length - 1; index++) bigrams.push(`${unigrams[index]}_${unigrams[index + 1]}`);
  return new Set([...unigrams, ...bigrams]);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const token of smaller) if (larger.has(token)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function extractPhraseAnchors(text: string): Set<string> {
  const anchors = new Set<string>();
  text.match(/[a-zA-Z][a-z]+[A-Z][a-zA-Z]+/g)?.forEach((match) => anchors.add(match.toLowerCase()));
  text.match(/[a-z_]{2,}\([^)]*\)/g)?.forEach((match) => anchors.add(match.toLowerCase()));
  text.match(/`([^`]+)`/g)?.forEach((match) => anchors.add(match.replace(/`/g, '').toLowerCase()));
  return anchors;
}

export function extractSalientLiterals(text: string): Set<string> {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  lower.match(/[a-z][a-z0-9+.-]*:\/\/[^\s'"`)]+/g)?.forEach((match) => out.add(match.replace(/[.,;]+$/, '')));
  lower.match(/[a-z0-9.-]+:[0-9]{2,5}\b/g)?.forEach((match) => out.add(match));
  lower.match(/`([^`]+)`/g)?.forEach((match) => {
    const inner = match.replace(/`/g, '');
    if (CONCRETE_VALUE_RE.test(inner)) out.add(inner);
  });
  lower.match(/\b[0-9]{4,}\b/g)?.forEach((match) => out.add(match));
  return out;
}

function sharedSalientLiteral(a: string, b: string): boolean {
  const literalsA = extractSalientLiterals(a);
  if (literalsA.size === 0) return false;
  const literalsB = extractSalientLiterals(b);
  for (const literal of literalsA) if (literalsB.has(literal)) return true;
  return false;
}

function literalStrippedJaccard(a: string, b: string): number {
  const strip = tokenize([...extractSalientLiterals(a), ...extractSalientLiterals(b)].join(' '));
  const tokensA = new Set([...tokenize(a)].filter((token) => !strip.has(token)));
  const tokensB = new Set([...tokenize(b)].filter((token) => !strip.has(token)));
  return jaccardSimilarity(tokensA, tokensB);
}

function issueText(issue: ParsedIssue): string {
  return issue.description;
}

function isCoLocatedSameDefect(a: ParsedIssue, b: ParsedIssue): boolean {
  if (a.file !== b.file || a.line == null || b.line == null || a.line !== b.line) return false;
  if ((SEVERITY_RANK[a.severity] ?? 0) < CO_LOCATION_MIN_SEVERITY_RANK) return false;
  if ((SEVERITY_RANK[b.severity] ?? 0) < CO_LOCATION_MIN_SEVERITY_RANK) return false;
  if (!sharedSalientLiteral(issueText(a), issueText(b))) return false;
  return literalStrippedJaccard(issueText(a), issueText(b)) >= CO_LOCATION_TOPICAL_FLOOR;
}

export function areCommentsSimilar(
  a: { file: string; line: number | null; text: string },
  b: { file: string; line: number | null; text: string },
  lineThreshold = LINE_PROXIMITY_DEFAULT,
  textThreshold = SIMILARITY_THRESHOLD
): boolean {
  if (a.file !== b.file) return false;
  let score = jaccardSimilarity(tokenize(a.text), tokenize(b.text));
  const anchorsA = extractPhraseAnchors(a.text);
  const anchorsB = extractPhraseAnchors(b.text);
  if ([...anchorsA].some((anchor) => anchorsB.has(anchor))) score += PHRASE_ANCHOR_BOOST;

  const sameLocation = a.line != null && b.line != null && Math.abs(a.line - b.line) <= SAME_LOCATION_LINE_BAND;
  const threshold = sameLocation ? Math.min(textThreshold, SAME_LOCATION_THRESHOLD) : textThreshold;
  if (score < threshold) return false;
  if (score >= HIGH_SIMILARITY_THRESHOLD) return true;
  if (a.line != null && b.line != null) {
    const lineLimit = a.line > LARGE_FILE_LINE_THRESHOLD || b.line > LARGE_FILE_LINE_THRESHOLD
      ? Math.min(lineThreshold, LINE_PROXIMITY_LARGE_FILE)
      : lineThreshold;
    if (Math.abs(a.line - b.line) > lineLimit) return false;
  }
  return true;
}

export function areIssuesSimilar(a: ParsedIssue, b: ParsedIssue, options: { allowCoLocationOverride?: boolean } = {}): boolean {
  if (options.allowCoLocationOverride && isCoLocatedSameDefect(a, b)) return true;
  if (a.category !== b.category) return false;
  return areCommentsSimilar({ file: a.file, line: a.line, text: issueText(a) }, { file: b.file, line: b.line, text: issueText(b) });
}

/** Collapses duplicate findings inside one model's output. */
export function dedupeIssues(issues: ParsedIssue[]): ParsedIssue[] {
  const kept: ParsedIssue[] = [];
  for (const issue of issues) {
    const duplicate = kept.findIndex((existing) => areIssuesSimilar(existing, issue));
    if (duplicate === -1) kept.push(issue);
    else if ((SEVERITY_RANK[issue.severity] ?? 0) > (SEVERITY_RANK[kept[duplicate].severity] ?? 0)) kept[duplicate] = issue;
  }
  return kept;
}

/** Groups findings from different models that describe the same defect. */
export function clusterIssues(issues: TaggedIssue[], modelCount: number): IssueCluster[] {
  const assigned = new Set<number>();
  const clusters: IssueCluster[] = [];
  for (let i = 0; i < issues.length; i++) {
    if (assigned.has(i)) continue;
    const group = [issues[i]];
    assigned.add(i);
    for (let j = i + 1; j < issues.length; j++) {
      if (assigned.has(j) || issues[i].model === issues[j].model) continue;
      if (group.some((member) => member.model === issues[j].model)) continue;
      if (group.some((member) => areIssuesSimilar(member, issues[j], { allowCoLocationOverride: true }))) {
        group.push(issues[j]);
        assigned.add(j);
      }
    }
    const best = group.reduce((top, current) => ((SEVERITY_RANK[current.severity] ?? 0) > (SEVERITY_RANK[top.severity] ?? 0) ? current : top), group[0]);
    clusters.push({
      category: group[0].category,
      file: group[0].file,
      line: best.line,
      severity: best.severity,
      confidence: Math.min(1, group.length / Math.max(1, modelCount)),
      agreedBy: [...new Set(group.map((member) => member.model))],
      description: best.description,
      suggestion: group.find((member) => member.suggestion != null)?.suggestion ?? null
    });
  }
  return clusters.sort(
    (a, b) => b.confidence - a.confidence || (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
  );
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 10) / 10;
}

function firstNote(notes: Array<string | null>): string | null {
  return notes.find((value): value is string => Boolean(value)) ?? null;
}

/**
 * Combines per-model scores. Risk takes the maximum so one model spotting a
 * serious problem is not averaged away; quality scores are averaged.
 */
export function aggregateScores(runs: ReviewScores[]): ReviewScores {
  const risks = runs.map((run) => run.riskScore).filter((value): value is number => value !== null);
  return {
    riskScore: risks.length > 0 ? Math.max(...risks) : null,
    coverageScore: average(runs.map((run) => run.coverageScore)),
    coverageNote: firstNote(runs.map((run) => run.coverageNote)),
    requirementsScore: average(runs.map((run) => run.requirementsScore)),
    requirementsNote: firstNote(runs.map((run) => run.requirementsNote)),
    simplicityScore: average(runs.map((run) => run.simplicityScore)),
    simplicityNote: firstNote(runs.map((run) => run.simplicityNote)),
    stabilityScore: average(runs.map((run) => run.stabilityScore)),
    stabilityNote: firstNote(runs.map((run) => run.stabilityNote))
  };
}
