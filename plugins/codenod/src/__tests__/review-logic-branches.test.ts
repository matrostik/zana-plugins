import { describe, expect, it, vi } from 'vitest';
import type { Store } from '../server/db.ts';
import type { GitHubClient } from '../server/github/client.ts';
import {
  aggregateScores,
  areCommentsSimilar,
  areIssuesSimilar,
  clusterIssues,
  dedupeIssues,
  extractPhraseAnchors,
  extractSalientLiterals,
  jaccardSimilarity,
  type TaggedIssue
} from '../server/review/consensus.ts';
import { annotateDiffWithLineNumbers, commentableLines, isReviewable, prepareDiff } from '../server/review/diff.ts';
import { extractJsonObject, parseAnalysis } from '../server/review/parse.ts';
import {
  getConsensusPrompt,
  getDeepReviewPrompt,
  getRepairPrompt,
  getReviewPrompt,
  getSystemPrompt,
  hasRequirementsContext,
  type DeepReviewPromptInput,
  type ReviewPromptContext
} from '../server/review/prompts.ts';
import { extractLinkedIssues, globMatcher, referencedSpecPaths } from '../server/review/requirements.ts';
import { buildReviewPayload, createPoster, formatFinding, StaleReviewError } from '../server/post.ts';
import { asOptionalNumber, asRecord, asString, asStringArray, errorMessage, mapWithConcurrency, newId, sleep } from '../server/util.ts';
import type { ChangedFile, FindingRow, ParsedIssue, ReviewScores, Severity } from '../server/types.ts';

const PATCH = '@@ -1,3 +1,4 @@\n line1\n-old\n+new\n+added\n line3';

function issue(overrides: Partial<ParsedIssue>): ParsedIssue {
  return { category: 'logic', severity: 'medium', file: 'src/a.ts', line: 10, description: 'User can be null here and the call throws', suggestion: null, ...overrides };
}

function tagged(id: string, model: string, overrides: Partial<ParsedIssue>): TaggedIssue {
  return { ...issue(overrides), id, model };
}

describe('consensus similarity', () => {
  it('scores token sets with Jaccard similarity', () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(1);
    expect(jaccardSimilarity(new Set(['a']), new Set())).toBe(0);
    expect(jaccardSimilarity(new Set(), new Set(['a']))).toBe(0);
    expect(jaccardSimilarity(new Set(['a', 'b', 'c']), new Set(['a']))).toBeCloseTo(1 / 3);
    expect(jaccardSimilarity(new Set(['a']), new Set(['a', 'b', 'c']))).toBeCloseTo(1 / 3);
  });

  it('extracts identifier-like phrase anchors', () => {
    expect([...extractPhraseAnchors('call fetch_data(id) and `retryCount`')].sort()).toEqual(['fetch_data(id)', 'retrycount']);
    expect(extractPhraseAnchors('plain words only').size).toBe(0);
  });

  it('extracts concrete literals and ignores plain backticked words', () => {
    const literals = extractSalientLiterals('Calls https://api.example.com/v1. on localhost:8080 with `/etc/passwd` and `flag` after 30000 ms');
    expect([...literals].sort()).toEqual(['/etc/passwd', '30000', '8080', 'https://api.example.com/v1', 'localhost:8080']);
    expect(extractSalientLiterals('nothing concrete here').size).toBe(0);
  });

  it('rejects comments on different files', () => {
    expect(areCommentsSimilar({ file: 'a.ts', line: 1, text: 'same text' }, { file: 'b.ts', line: 1, text: 'same text' })).toBe(false);
  });

  it('treats near-identical text as similar regardless of distance', () => {
    expect(areCommentsSimilar({ file: 'a.ts', line: 10, text: 'alpha beta gamma' }, { file: 'a.ts', line: 400, text: 'alpha beta gamma' })).toBe(true);
  });

  it('requires moderately similar text to be on nearby lines', () => {
    const a = 'alpha beta gamma';
    const b = 'alpha beta gamma delta epsilon';
    expect(areCommentsSimilar({ file: 'a.ts', line: 10, text: a }, { file: 'a.ts', line: 14, text: b })).toBe(true);
    expect(areCommentsSimilar({ file: 'a.ts', line: 10, text: a }, { file: 'a.ts', line: 30, text: b })).toBe(false);
    expect(areCommentsSimilar({ file: 'a.ts', line: null, text: a }, { file: 'a.ts', line: 30, text: b })).toBe(true);
  });

  it('uses a tighter line window in large files', () => {
    const a = 'alpha beta gamma';
    const b = 'alpha beta gamma delta epsilon';
    expect(areCommentsSimilar({ file: 'a.ts', line: 600, text: a }, { file: 'a.ts', line: 604, text: b })).toBe(false);
  });

  it('lowers the text threshold for findings at the same location', () => {
    const a = 'alpha beta gamma';
    const b = 'alpha beta omega sigma';
    expect(areCommentsSimilar({ file: 'a.ts', line: 10, text: a }, { file: 'a.ts', line: 11, text: b })).toBe(true);
    expect(areCommentsSimilar({ file: 'a.ts', line: 10, text: a }, { file: 'a.ts', line: 14, text: b })).toBe(false);
  });

  it('boosts similarity when both mention the same identifier', () => {
    expect(areCommentsSimilar({ file: 'a.ts', line: 10, text: 'calls getUserName twice' }, { file: 'a.ts', line: 13, text: 'getUserName result unused' })).toBe(true);
    expect(areCommentsSimilar({ file: 'a.ts', line: 10, text: 'calls getusername twice' }, { file: 'a.ts', line: 13, text: 'getusername result unused' })).toBe(false);
  });
});

describe('consensus co-location override', () => {
  const security = issue({ category: 'security', severity: 'high', description: 'Hardcoded endpoint http://internal.example.com/api leaks credentials in plain request' });
  const logic = issue({ category: 'logic', severity: 'critical', description: 'Request sent to http://internal.example.com/api without credentials check' });

  it('merges cross-category findings on the same line that share a literal and topic', () => {
    expect(areIssuesSimilar(security, logic)).toBe(false);
    expect(areIssuesSimilar(security, logic, { allowCoLocationOverride: true })).toBe(true);
  });

  it('does not merge when any co-location condition fails', () => {
    const override = { allowCoLocationOverride: true };
    expect(areIssuesSimilar(security, { ...logic, file: 'src/b.ts' }, override)).toBe(false);
    expect(areIssuesSimilar(security, { ...logic, line: null }, override)).toBe(false);
    expect(areIssuesSimilar(security, { ...logic, line: 11 }, override)).toBe(false);
    expect(areIssuesSimilar({ ...security, severity: 'medium' }, logic, override)).toBe(false);
    expect(areIssuesSimilar(security, { ...logic, severity: 'low' }, override)).toBe(false);
    expect(areIssuesSimilar({ ...security, description: 'Token is logged in plain text' }, logic, override)).toBe(false);
    expect(areIssuesSimilar(security, { ...logic, description: 'Request sent to http://other.example.com/api without credentials check' }, override)).toBe(false);
    expect(areIssuesSimilar(security, { ...logic, description: 'Uses http://internal.example.com/api' }, override)).toBe(false);
  });
});

describe('consensus grouping', () => {
  it('keeps the existing duplicate when the new one is less severe', () => {
    const result = dedupeIssues([issue({ severity: 'high' }), issue({ severity: 'low', line: 11 }), issue({ category: 'style', description: 'Unrelated naming problem' })]);
    expect(result.map((item) => item.severity)).toEqual(['high', 'medium']);
  });

  it('ranks unknown severities below every known one when deduping', () => {
    expect(dedupeIssues([issue({ severity: 'urgent' as Severity }), issue({ severity: 'low', line: 11 })])[0].severity).toBe('low');
    expect(dedupeIssues([issue({ severity: 'low' }), issue({ severity: 'urgent' as Severity, line: 11 })])[0].severity).toBe('low');
  });

  it('never clusters two findings from the same model', () => {
    const clusters = clusterIssues([tagged('a1', 'a', {}), tagged('a2', 'a', { line: 11 })], 2);
    expect(clusters).toHaveLength(2);
    expect(clusters.every((cluster) => cluster.confidence === 0.5)).toBe(true);
  });

  it('takes one finding per model and reports the most severe member', () => {
    const clusters = clusterIssues(
      [
        tagged('a1', 'a', { severity: 'medium' }),
        tagged('b1', 'b', { severity: 'high', line: 11, suggestion: 'Guard against null' }),
        tagged('b2', 'b', { severity: 'critical', line: 12 })
      ],
      2
    );
    expect(clusters).toHaveLength(2);
    expect(clusters[0]).toMatchObject({ agreedBy: ['a', 'b'], severity: 'high', line: 11, confidence: 1, suggestion: 'Guard against null' });
    expect(clusters[1]).toMatchObject({ agreedBy: ['b'], severity: 'critical', line: 12 });
  });

  it('keeps the known severity when a cluster member has an unknown one', () => {
    const [cluster] = clusterIssues([tagged('a1', 'a', { severity: 'high' }), tagged('b1', 'b', { severity: 'urgent' as Severity, line: 11 })], 2);
    expect(cluster.severity).toBe('high');
    const [reversed] = clusterIssues([tagged('a1', 'a', { severity: 'urgent' as Severity }), tagged('b1', 'b', { severity: 'medium', line: 11 })], 2);
    expect(reversed.severity).toBe('medium');
  });

  it('merges co-located cross-category findings from different models', () => {
    const clusters = clusterIssues(
      [
        tagged('a1', 'a', { category: 'security', severity: 'high', description: 'Hardcoded endpoint http://internal.example.com/api leaks credentials in plain request' }),
        tagged('b1', 'b', { category: 'logic', severity: 'critical', description: 'Request sent to http://internal.example.com/api without credentials check' })
      ],
      2
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ category: 'security', severity: 'critical', agreedBy: ['a', 'b'] });
  });

  it('orders equal-confidence clusters by severity', () => {
    const clusters = clusterIssues(
      [
        tagged('x', 'a', { severity: 'low', file: 'a.ts' }),
        tagged('y', 'b', { severity: 'urgent' as Severity, file: 'c.ts' }),
        tagged('z', 'b', { severity: 'critical', file: 'b.ts' })
      ],
      2
    );
    expect(clusters.map((cluster) => cluster.severity)).toEqual(['critical', 'low', 'urgent']);
  });

  it('caps confidence at 1 when no model count is known', () => {
    expect(clusterIssues([tagged('a1', 'a', {})], 0)[0].confidence).toBe(1);
    expect(clusterIssues([], 2)).toEqual([]);
  });

  it('returns null scores when there are no runs', () => {
    expect(aggregateScores([])).toEqual({
      riskScore: null,
      coverageScore: null,
      coverageNote: null,
      requirementsScore: null,
      requirementsNote: null,
      simplicityScore: null,
      simplicityNote: null,
      stabilityScore: null,
      stabilityNote: null
    });
  });

  it('ignores missing risk scores and empty notes', () => {
    const base: ReviewScores = {
      riskScore: null,
      coverageScore: null,
      coverageNote: '',
      requirementsScore: 6,
      requirementsNote: null,
      simplicityScore: null,
      simplicityNote: null,
      stabilityScore: 3,
      stabilityNote: null
    };
    expect(aggregateScores([base, { ...base, riskScore: 4, coverageNote: 'Has tests', stabilityScore: 4, stabilityNote: 'Additive' }])).toMatchObject({
      riskScore: 4,
      coverageNote: 'Has tests',
      requirementsScore: 6,
      stabilityScore: 3.5,
      stabilityNote: 'Additive'
    });
  });
});

function context(overrides: Partial<ReviewPromptContext> = {}): ReviewPromptContext {
  return {
    repository: 'github.com/acme/api',
    prNumber: 4,
    prTitle: 'Add login',
    prDescription: null,
    author: 'dev',
    headRef: 'feat',
    baseRef: 'main',
    files: [{ path: 'src/a.ts', status: 'modified', additions: 2, deletions: 1, patch: PATCH }],
    skippedFiles: [],
    linkedIssues: [],
    specFiles: [],
    priorComments: [],
    customInstructions: null,
    hasWorkspace: false,
    ...overrides
  };
}

describe('review prompt', () => {
  it('uses the given year and workspace guidance in the system prompt', () => {
    const prompt = getSystemPrompt(true, 2030);
    expect(prompt).toContain('The current year is 2030.');
    expect(prompt).toContain('checkout of this repository');
  });

  it('treats a blank description as no requirements and a real one as requirements', () => {
    expect(hasRequirementsContext(context({ prDescription: '   ' }))).toBe(false);
    expect(getReviewPrompt(context({ prDescription: '   ' }))).toContain('No requirements are stated');
    expect(hasRequirementsContext(context({ prDescription: 'Users can log in' }))).toBe(true);
    expect(getReviewPrompt(context({ prDescription: '  Users can log in  ' }))).toContain('PR Description:\nUsers can log in');
  });

  it('omits empty issue labels and bodies and truncates long requirement sources', () => {
    const prompt = getReviewPrompt(
      context({
        linkedIssues: [
          { reference: 'acme/api#1', title: 'Bare issue', body: '   ', labels: [] },
          { reference: 'acme/api#2', title: 'Long issue', body: 'b'.repeat(2_001), labels: [] }
        ],
        specFiles: [{ path: 'docs/big.md', content: 's'.repeat(4_001) }]
      })
    );
    expect(prompt).toContain('Linked issue acme/api#1:\n- Title: Bare issue\n\n');
    expect(prompt).not.toContain('- Labels:');
    expect(prompt).toContain(`- Description: ${'b'.repeat(2_000)}\n…(truncated)`);
    expect(prompt).toContain(`${'s'.repeat(4_000)}\n…(truncated)`);
  });

  it('keeps only the latest prior comments and labels their location', () => {
    const many = Array.from({ length: 45 }, (_, index) => ({ author: `author-${index}-x`, file: null, line: null, body: 'Note', isBot: false }));
    const prompt = getReviewPrompt(context({ priorComments: [...many, { author: 'rev', file: 'src/b.ts', line: null, body: 'Check this', isBot: false }] }));
    expect(prompt).not.toContain('author-5-x');
    expect(prompt).toContain('author-6-x on (general)');
    expect(prompt).toContain('[human] rev on src/b.ts — ');
  });

  it('includes trimmed custom instructions and truncates long ones', () => {
    expect(getReviewPrompt(context({ customInstructions: '  Prefer early returns  ' }))).toContain('Follow these in addition to the standard review criteria:\nPrefer early returns\n');
    expect(getReviewPrompt(context({ customInstructions: '   ' }))).not.toContain('Custom Review Instructions');
    expect(getReviewPrompt(context({ customInstructions: 'x'.repeat(4_001) }))).toContain(`${'x'.repeat(4_000)}\n…(truncated)`);
  });

  it('lists skipped files and elides beyond fifty', () => {
    expect(getReviewPrompt(context({ skippedFiles: ['a.png', 'b.lock'] }))).toContain('over the size budget): a.png, b.lock\n');
    const many = Array.from({ length: 51 }, (_, index) => `f${index}.png`);
    const prompt = getReviewPrompt(context({ skippedFiles: many }));
    expect(prompt).toContain('f49.png, …');
    expect(prompt).not.toContain('f50.png');
  });

  it('renders an empty diff for files without a patch', () => {
    expect(getReviewPrompt(context({ files: [{ path: 'bin.dat', status: 'added', additions: 0, deletions: 0, patch: null }] }))).toContain('Diff:\n```diff\n\n```');
  });

  it('asks for a JSON-only retry with the stated problem', () => {
    expect(getRepairPrompt('the reply was empty')).toContain('Your previous reply could not be used: the reply was empty');
  });
});

describe('consensus prompt', () => {
  it('groups clusters by agreement level', () => {
    const prompt = getConsensusPrompt(
      [
        { category: 'logic', filePath: 'src/a.ts', lineNumber: 3, severity: 'high', confidence: 1, agreedByModels: ['a', 'b'], description: 'Null deref' },
        { category: 'security', filePath: 'src/b.ts', lineNumber: null, severity: 'low', confidence: 0.67, agreedByModels: ['a'], description: 'Weak hash' },
        { category: 'style', filePath: 'src/c.ts', lineNumber: 9, severity: 'medium', confidence: 0.5, agreedByModels: ['b'], description: 'Dup code' }
      ],
      ['a', 'b']
    );
    expect(prompt).toContain('2 AI models (a, b)');
    expect(prompt).toContain('Issues ALL models agree on (1):\n- [HIGH] logic | src/a.ts:3 | "Null deref" (found by: a, b)');
    expect(prompt).toContain('Issues found by a majority of models (1):\n- [LOW] security | src/b.ts | "Weak hash"');
    expect(prompt).toContain('Issues found by only one model (1):\n- [MEDIUM] style | src/c.ts:9');
    expect(prompt).not.toContain('No model reported any issues.');
  });

  it('says when no model reported anything', () => {
    const prompt = getConsensusPrompt([], ['a']);
    expect(prompt).toContain('No model reported any issues.');
    expect(prompt).not.toContain('Issues ALL models agree on');
  });
});

describe('deep review prompt', () => {
  const input = (overrides: Partial<DeepReviewPromptInput> = {}): DeepReviewPromptInput => ({
    url: 'https://github.com/acme/api/pull/4',
    repository: 'acme/api',
    prNumber: 4,
    prTitle: 'Add login',
    author: 'dev',
    headRef: 'feat',
    baseRef: 'main',
    headSha: '0123456789abcdef0123456789abcdef01234567',
    remote: null,
    hasWorkspace: false,
    reviewSummary: null,
    findings: [],
    ...overrides
  });

  it('tells a workspace agent to check out the PR head', () => {
    const prompt = getDeepReviewPrompt(input({ hasWorkspace: true, remote: 'upstream' }));
    expect(prompt).toContain('git fetch upstream pull/4/head:codenod/pr-4 && git checkout codenod/pr-4');
    expect(prompt).toContain('Confirm HEAD is 0123456789ab.');
  });

  it('points a checkout-less agent at gh and omits empty sections', () => {
    const prompt = getDeepReviewPrompt(input());
    expect(prompt).toContain('gh pr diff https://github.com/acme/api/pull/4');
    expect(prompt).not.toContain('Automated review summary');
    expect(prompt).not.toContain('already reported these findings');
  });

  it('lists up to forty prior findings and the summary', () => {
    const findings = Array.from({ length: 45 }, (_, index) => ({ severity: 'high', category: 'logic', file: 'src/a.ts', line: index === 0 ? null : index, description: `Problem ${index}` }));
    const prompt = getDeepReviewPrompt(input({ findings, reviewSummary: 'Risky `change`' }));
    expect(prompt.match(/^- \[/gm)).toHaveLength(40);
    expect(prompt).toContain('- [high] logic src/a.ts — Problem 0');
    expect(prompt).toContain('- [high] logic src/a.ts:1 — Problem 1');
    expect(prompt).not.toContain('Problem 40');
    expect(prompt).toContain("Automated review summary: Risky 'change'");
  });
});

describe('diff filtering', () => {
  const file = (path: string, patch: string | null = '+x'): ChangedFile => ({ path, status: 'modified', additions: 1, deletions: 0, patch });

  it('skips empty patches, generated paths, lockfiles, minified and binary files', () => {
    expect(isReviewable(file('src/a.ts', ''))).toBe(false);
    expect(isReviewable(file('dist/app.js'))).toBe(false);
    expect(isReviewable(file('web/node_modules/x/index.js'))).toBe(false);
    expect(isReviewable(file('apps/web/pnpm-lock.yaml'))).toBe(false);
    expect(isReviewable(file('public/app.min.js'))).toBe(false);
    expect(isReviewable(file('styles/site.min.css'))).toBe(false);
    expect(isReviewable(file('assets/LOGO.PNG'))).toBe(false);
  });

  it('reviews source files, dotfiles and extensionless files', () => {
    expect(isReviewable(file('src/a.ts'))).toBe(true);
    expect(isReviewable(file('.env'))).toBe(true);
    expect(isReviewable(file('Makefile'))).toBe(true);
  });

  it('truncates very long patches and records them', () => {
    const patch = Array.from({ length: 900 }, () => '+x').join('\n');
    const prepared = prepareDiff([file('src/long.ts', patch)]);
    expect(prepared.truncated).toEqual(['src/long.ts']);
    expect(prepared.files[0].patch).toContain('... (diff truncated, 100 more lines omitted)');
    expect(prepared.files[0].patch?.split('\n')).toHaveLength(801);
  });

  it('fits smaller files first but keeps the original order', () => {
    const prepared = prepareDiff([file('src/big.ts', `+${'x'.repeat(8)}`), file('src/a.ts', '+a'), file('src/b.ts', '+b')], 11);
    expect(prepared.files.map((item) => item.path)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(prepared.skipped).toEqual(['src/big.ts']);
    expect(prepared.truncated).toEqual([]);
  });
});

describe('diff line numbers', () => {
  const patch = '@@ -1 +1 @@\n-old\n+new\n\\ No newline at end of file\n\nbare';

  it('returns an empty annotation for an empty patch', () => {
    expect(annotateDiffWithLineNumbers('')).toBe('');
  });

  it('handles hunks without counts, no-newline markers, blank and unprefixed lines', () => {
    expect(annotateDiffWithLineNumbers(patch).split('\n')).toEqual(['@@ -1 +1 @@', '      -old', 'L1: +new', '\\ No newline at end of file', '', 'bare']);
  });

  it('only counts added and context lines as commentable', () => {
    expect([...commentableLines(patch)]).toEqual([1]);
    expect(commentableLines('').size).toBe(0);
  });
});

describe('parse JSON extraction', () => {
  it('ignores braces inside strings with escaped quotes', () => {
    const json = JSON.stringify({ a: 'say "}" now' });
    expect(extractJsonObject(`x ${json} y`)).toBe(json);
  });

  it('skips a balanced but invalid object and finds the next one', () => {
    expect(extractJsonObject('{not json} then {"a": 1}')).toBe('{"a": 1}');
  });

  it('returns null for an unclosed object', () => {
    expect(extractJsonObject('{"a": 1')).toBeNull();
  });
});

describe('parse analysis', () => {
  const reply = (data: Record<string, unknown>) => JSON.stringify({ summary: 'Adds login.', riskScore: 5, ...data });

  it('accepts a complete analysis that follows an unclosed brace in prose', () => {
    const result = parseAnalysis(`Wrap it in { braces. ${reply({})}`, { hasRequirements: false });
    expect(result).toMatchObject({ ok: true, analysis: { summary: 'Adds login.', riskScore: 5 } });
  });

  it('reports prose with no JSON object', () => {
    expect(parseAnalysis('just prose', { hasRequirements: false })).toEqual({ ok: false, problem: 'the reply did not contain a valid JSON object' });
  });

  it('rejects a non-string summary and a non-numeric risk score', () => {
    expect(parseAnalysis(reply({ summary: 5 }), { hasRequirements: false })).toMatchObject({ ok: false, problem: expect.stringContaining('summary') });
    expect(parseAnalysis(reply({ riskScore: ' ' }), { hasRequirements: false })).toMatchObject({ ok: false, problem: expect.stringContaining('riskScore') });
    expect(parseAnalysis(reply({ riskScore: 'abc' }), { hasRequirements: false })).toMatchObject({ ok: false, problem: expect.stringContaining('riskScore') });
  });

  it('clamps and rounds the risk score', () => {
    const risk = (value: unknown) => {
      const parsed = parseAnalysis(reply({ riskScore: value }), { hasRequirements: false });
      return parsed.ok ? parsed.analysis.riskScore : undefined;
    };
    expect(risk(0)).toBe(1);
    expect(risk(15)).toBe(10);
    expect(risk('4.26')).toBe(4);
  });

  it('parses summaries containing escaped quotes and backslashes', () => {
    const parsed = parseAnalysis(reply({ summary: 'Says "hi" \\ there' }), { hasRequirements: false });
    expect(parsed.ok && parsed.analysis.summary).toBe('Says "hi" \\ there');
  });

  it('normalizes field aliases, severities, paths and line numbers', () => {
    const parsed = parseAnalysis(
      reply({
        securityIssues: [
          null,
          'text',
          { description: '   ', file: 'src/a.ts' },
          { description: 'No file given' },
          { comment: 'Uses comment field', path: '/src/b.ts', severity: ' CRITICAL ', line: 2.5, suggestion: 42 },
          { message: 'Uses message field', file: 'src/c.ts', severity: 'blocker', line: 0 },
          { description: 'Retracted', file: 'src/d.ts', line: 4, suggestion: 'False positive, ignore' },
          { description: 'Unknown severity', file: 'src/e.ts', severity: 'urgent', line: '3' },
          { description: 'Numeric severity', file: 'src/f.ts', severity: 7, line: 5 }
        ],
        performanceIssues: 'not an array'
      }),
      { hasRequirements: false }
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.analysis.issues).toEqual([
      { category: 'security', severity: 'critical', file: 'src/b.ts', line: null, description: 'Uses comment field', suggestion: null },
      { category: 'security', severity: 'critical', file: 'src/c.ts', line: null, description: 'Uses message field', suggestion: null },
      { category: 'security', severity: 'medium', file: 'src/e.ts', line: null, description: 'Unknown severity', suggestion: null },
      { category: 'security', severity: 'medium', file: 'src/f.ts', line: 5, description: 'Numeric severity', suggestion: null }
    ]);
  });

  it('caps the number of issues', () => {
    const logicIssues = Array.from({ length: 120 }, (_, index) => ({ description: `Problem ${index}`, file: 'src/a.ts', line: index + 1 }));
    const parsed = parseAnalysis(reply({ logicIssues }), { hasRequirements: false });
    expect(parsed.ok && parsed.analysis.issues).toHaveLength(100);
  });

  it('keeps requirements when present and filters change types and notes', () => {
    const parsed = parseAnalysis(
      reply({ changeTypes: ['api_change', 3, null], requirementsScore: 8, requirementsNote: 'Covered', coverageNote: '  ', stabilityNote: ' Stable ' }),
      { hasRequirements: true }
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.analysis).toMatchObject({ changeTypes: ['api_change'], requirementsScore: 8, requirementsNote: 'Covered', coverageNote: null, stabilityNote: 'Stable' });
    const bare = parseAnalysis(reply({}), { hasRequirements: true });
    expect(bare.ok && bare.analysis.changeTypes).toEqual([]);
  });
});

describe('requirements links', () => {
  const repo = { host: 'github.com', owner: 'acme', name: 'api' };
  const numbers = (body: string, prNumber = 99) => extractLinkedIssues(body, repo, prNumber).map((link) => link.number);

  it('caps linked issues at three', () => {
    expect(numbers('Fixes #1, #2, #3, #4 and #5')).toEqual([1, 2, 3]);
  });

  it('never links the pull request to itself, whatever the letter case', () => {
    expect(numbers('Fixes ACME/Api#40 and #41', 40)).toEqual([41]);
  });

  it('dedupes references case-insensitively', () => {
    const links = extractLinkedIssues('Acme/API#5 and acme/api#5', repo, 1);
    expect(links).toEqual([{ host: 'github.com', owner: 'Acme', name: 'API', number: 5 }]);
  });

  it('recognizes closing keywords with a colon', () => {
    expect(numbers('See #3. Closes: #7. resolved other/lib#8')).toEqual([7, 8, 3]);
  });

  it('excludes the PR itself when linked by URL', () => {
    expect(numbers('See https://github.com/acme/api/issues/40', 40)).toEqual([]);
  });

  it('matches issue URLs only on the exact host', () => {
    const enterprise = { host: 'git.example.com', owner: 'acme', name: 'api' };
    expect(extractLinkedIssues('https://gitXexample.com/acme/api/issues/2', enterprise, 1)).toEqual([]);
    expect(extractLinkedIssues('https://git.example.com/acme/api/issues/2', enterprise, 1)).toEqual([{ host: 'git.example.com', owner: 'acme', name: 'api', number: 2 }]);
  });
});

describe('requirements globs', () => {
  it('matches single characters with a question mark', () => {
    const matches = globMatcher('spec?.md');
    expect(matches('spec1.md')).toBe(true);
    expect(matches('spec12.md')).toBe(false);
  });

  it('matches any depth with a trailing double star', () => {
    const matches = globMatcher('docs/**');
    expect(matches('docs/a/b.md')).toBe(true);
    expect(matches('other/a.md')).toBe(false);
  });

  it('keeps a single star within one directory', () => {
    expect(globMatcher('*.md')('docs/a.md')).toBe(false);
    expect(globMatcher('*.md')('a.md')).toBe(true);
  });

  it('escapes regex characters in literal parts', () => {
    const matches = globMatcher('notes+v1.md');
    expect(matches('notes+v1.md')).toBe(true);
    expect(matches('notesv1.md')).toBe(false);
  });

  it('matches nothing for missing or blank patterns', () => {
    expect(globMatcher(null)('a.md')).toBe(false);
    expect(globMatcher(undefined)('a.md')).toBe(false);
    expect(globMatcher(' , ')('a.md')).toBe(false);
  });

  it('dedupes referenced paths and handles bodies without paths', () => {
    const matches = globMatcher('docs/**/*.md');
    expect(referencedSpecPaths(null, matches)).toEqual([]);
    expect(referencedSpecPaths('no paths here', matches)).toEqual([]);
    expect(referencedSpecPaths('docs/a.md and ./docs/a.md', matches)).toEqual(['docs/a.md']);
  });
});

function finding(id: string, overrides: Partial<FindingRow> = {}): FindingRow {
  return {
    id,
    reviewId: 'r',
    category: 'logic',
    severity: 'high',
    file: 'src/a.ts',
    line: 2,
    description: 'Broken',
    suggestion: null,
    agreedBy: ['a'],
    confidence: 1,
    postedAt: null,
    dismissed: false,
    ...overrides
  };
}

describe('post formatting', () => {
  const files: ChangedFile[] = [{ path: 'src/a.ts', status: 'modified', additions: 1, deletions: 1, patch: PATCH }];

  it('formats a single-model finding without a suggestion', () => {
    const text = formatFinding(finding('f'), 1);
    expect(text).toBe('**[HIGH] logic** — Broken\n\n<sub>CodeNod</sub>');
  });

  it('caps inline comments at fifty and moves the rest to the body', () => {
    const findings = Array.from({ length: 51 }, (_, index) => finding(`f${index}`));
    const payload = buildReviewPayload({ findings, files, modelCount: 1, summary: null });
    expect(payload.comments).toHaveLength(50);
    expect(payload.bodyIds).toEqual(['f50']);
  });

  it('puts findings on files outside the diff in the body and neutralizes backticks', () => {
    const payload = buildReviewPayload({
      findings: [finding('other', { file: 'src/other.ts' }), finding('tick', { file: 'src/`x`.ts', line: null })],
      files,
      modelCount: 1,
      summary: null,
      extraBody: '  Please check  '
    });
    expect(payload.bodyIds).toEqual(['other', 'tick']);
    expect(payload.body.startsWith('Please check\n\n**Findings outside the diff:**')).toBe(true);
    expect(payload.body).toContain("`src/'x'.ts`");
    expect(payload.body).not.toContain('CodeNod summary');
  });

  it('returns an empty body when there is nothing to say', () => {
    expect(buildReviewPayload({ findings: [], files, modelCount: 1, summary: null, extraBody: '   ' }).body).toBe('');
  });

  it('limits the body length', () => {
    expect(buildReviewPayload({ findings: [], files, modelCount: 1, summary: 'x'.repeat(70_000) }).body).toHaveLength(60_000);
  });

  it('marks only body findings that fit in the review body', () => {
    const payload = buildReviewPayload({
      findings: [finding('small', { file: 'src/other.ts', description: 'kept' }), finding('huge', { file: 'src/other.ts', description: 'x'.repeat(60_000) })],
      files,
      modelCount: 1,
      summary: null
    });
    expect(payload.bodyIds).toEqual(['small']);
    expect(payload.body).toContain('kept');
    expect(payload.body).not.toContain('x'.repeat(100));
  });

  it('names the stale review error and both commits', () => {
    const error = new StaleReviewError('aaaaaaa111', 'bbbbbbb222');
    expect(error.name).toBe('StaleReviewError');
    expect(error.message).toContain('(bbbbbbb)');
    expect(error.message).toContain('(aaaaaaa)');
  });
});

function posterHarness(
  overrides: { review?: Record<string, unknown> | null; headSha?: string; findings?: FindingRow[]; created?: { id?: unknown; html_url?: string } | null } = {}
) {
  const review =
    overrides.review === null
      ? null
      : { id: 'r', prId: 'github.com/acme/api#4', headSha: 'abc1234567', status: 'completed', summary: 'Plain summary', consensusSummary: null, ...overrides.review };
  const store = {
    getReview: vi.fn(() => review),
    listFindings: vi.fn(() => overrides.findings ?? []),
    listRuns: vi.fn(() => [{ status: 'completed' }, { status: 'failed' }]),
    markFindingsPosted: vi.fn(),
    recordPostedReview: vi.fn()
  };
  const github = {
    getPull: vi.fn(async () => ({ head: { sha: overrides.headSha ?? 'abc1234567' } })),
    listFiles: vi.fn(async (): Promise<ChangedFile[]> => [{ path: 'src/a.ts', status: 'modified', additions: 1, deletions: 1, patch: PATCH }]),
    createReview: vi.fn(async () => (overrides.created === undefined ? { id: 7, html_url: 'https://github.com/acme/api/pull/4#r7' } : overrides.created))
  };
  const poster = createPoster({ store: store as unknown as Store, github: github as unknown as GitHubClient });
  return { poster, store, github };
}

describe('poster', () => {
  it('does not double-post findings when two submissions overlap', async () => {
    const posted = new Set<string>();
    const findings = [finding('in')];
    const store = {
      getReview: vi.fn(() => ({ id: 'r', prId: 'github.com/acme/api#4', headSha: 'abc1234567', status: 'completed', summary: 'S', consensusSummary: null })),
      listFindings: vi.fn(() => findings.map((item) => ({ ...item, postedAt: posted.has(item.id) ? 1 : null }))),
      listRuns: vi.fn(() => [{ status: 'completed' }]),
      markFindingsPosted: vi.fn((ids: string[]) => ids.forEach((id) => posted.add(id))),
      recordPostedReview: vi.fn()
    };
    const github = {
      getPull: vi.fn(async () => ({ head: { sha: 'abc1234567' } })),
      listFiles: vi.fn(async (): Promise<ChangedFile[]> => [{ path: 'src/a.ts', status: 'modified', additions: 1, deletions: 1, patch: PATCH }]),
      createReview: vi.fn(async (_ref: unknown, _input: { comments: unknown[] }) => {
        return { id: 1, html_url: 'https://github.com/acme/api/pull/4#r1' };
      })
    };
    const poster = createPoster({ store: store as unknown as Store, github: github as unknown as GitHubClient });
    const [first, second] = await Promise.all([
      poster.post({ reviewId: 'r', findingIds: ['in'], event: 'COMMENT' }),
      poster.post({ reviewId: 'r', findingIds: ['in'], event: 'COMMENT', body: 'follow-up' })
    ]);
    expect(first.publishedCount).toBe(1);
    expect(second.publishedCount).toBe(0);
    expect(second.commentCount).toBe(0);
    expect(github.createReview).toHaveBeenCalledTimes(2);
    expect(github.createReview.mock.calls[1]?.[1]).toMatchObject({ comments: [] });
  });

  it('reads the current head commit', async () => {
    const { poster, github } = posterHarness({ headSha: 'fff0000' });
    await expect(poster.currentHeadSha('github.com/acme/api#4')).resolves.toBe('fff0000');
    expect(github.getPull).toHaveBeenCalledWith({ host: 'github.com', owner: 'acme', name: 'api', number: 4 });
  });

  it('refuses missing and unfinished reviews', async () => {
    await expect(posterHarness({ review: null }).poster.post({ reviewId: 'r', findingIds: [], event: 'COMMENT' })).rejects.toThrow('Review r not found');
    await expect(posterHarness({ review: { status: 'running' } }).poster.post({ reviewId: 'r', findingIds: [], event: 'COMMENT' })).rejects.toThrow(
      'Only completed reviews can be posted'
    );
  });

  it('refuses to approve when the pull request has new commits', async () => {
    const { poster, github } = posterHarness({ headSha: 'def4567890' });
    await expect(poster.post({ reviewId: 'r', findingIds: [], event: 'APPROVE' })).rejects.toBeInstanceOf(StaleReviewError);
    expect(github.createReview).not.toHaveBeenCalled();
  });

  it('requires a finding or a message for a plain comment', async () => {
    const { poster } = posterHarness();
    await expect(poster.post({ reviewId: 'r', findingIds: [], event: 'COMMENT', body: '  ' })).rejects.toThrow('Select at least one finding or write a message to post');
  });

  it('posts stale comments without inline positions', async () => {
    const { poster, github } = posterHarness({ headSha: 'def4567890', findings: [finding('in')] });
    const result = await poster.post({ reviewId: 'r', findingIds: ['in'], event: 'COMMENT' });
    expect(result).toEqual({ url: 'https://github.com/acme/api/pull/4#r7', commentCount: 0, bodyFindingCount: 1, publishedCount: 1 });
    expect(github.createReview).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ commitId: 'abc1234567', comments: [] }));
  });

  it('does not post findings that were already published', async () => {
    const { poster, store, github } = posterHarness({
      findings: [finding('in'), finding('done', { postedAt: 5 })]
    });
    const result = await poster.post({ reviewId: 'r', findingIds: ['in', 'done'], event: 'COMMENT' });
    expect(result.commentCount).toBe(1);
    expect(store.markFindingsPosted).toHaveBeenCalledWith(['in']);
    expect(github.createReview).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ comments: [expect.objectContaining({ path: 'src/a.ts' })] }));
  });

  it('posts selected, undismissed findings inline and records the review', async () => {
    const { poster, store, github } = posterHarness({
      review: { consensusSummary: 'Consensus view' },
      findings: [finding('in'), finding('gone', { dismissed: true }), finding('unselected')]
    });
    const result = await poster.post({ reviewId: 'r', findingIds: ['in', 'gone'], event: 'APPROVE' });
    expect(result).toEqual({ url: 'https://github.com/acme/api/pull/4#r7', commentCount: 1, bodyFindingCount: 0, publishedCount: 1 });
    expect(github.createReview).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ event: 'APPROVE', body: '**CodeNod summary:** Consensus view' }));
    expect(store.markFindingsPosted).toHaveBeenCalledWith(['in']);
    expect(store.recordPostedReview).toHaveBeenCalledWith({ reviewId: 'r', event: 'APPROVE', githubReviewId: 7, url: 'https://github.com/acme/api/pull/4#r7', commentCount: 1 });
  });

  it('falls back to the plain summary when there is no consensus summary', async () => {
    const { poster, github } = posterHarness({ findings: [finding('in')] });
    await poster.post({ reviewId: 'r', findingIds: ['in'], event: 'COMMENT' });
    expect(github.createReview).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ body: '**CodeNod summary:** Plain summary' }));
  });

  it('uses a default approval body and tolerates an empty GitHub response', async () => {
    const { poster, store, github } = posterHarness({ created: null });
    const result = await poster.post({ reviewId: 'r', findingIds: [], event: 'APPROVE' });
    expect(github.createReview).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ body: 'Approved after CodeNod review.' }));
    expect(result.url).toBeNull();
    expect(store.recordPostedReview).toHaveBeenCalledWith(expect.objectContaining({ githubReviewId: null, url: null }));
  });

  it('uses a generic body for change requests and ignores a non-numeric review id', async () => {
    const { poster, store, github } = posterHarness({ created: { id: 'x' } });
    await poster.post({ reviewId: 'r', findingIds: [], event: 'REQUEST_CHANGES' });
    expect(github.createReview).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ body: 'CodeNod review' }));
    expect(store.recordPostedReview).toHaveBeenCalledWith(expect.objectContaining({ githubReviewId: null, url: null }));
  });
});

describe('util', () => {
  it('coerces values to records', () => {
    expect(asRecord(null)).toEqual({});
    expect(asRecord([1])).toEqual({});
    expect(asRecord('text')).toEqual({});
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it('reads trimmed strings and string arrays', () => {
    expect(asString({ a: '  hi  ' }, 'a')).toBe('hi');
    expect(asString({ a: 3 }, 'a')).toBe('');
    expect(asStringArray({ a: ['x', 1, 'y'] }, 'a')).toEqual(['x', 'y']);
    expect(asStringArray({ a: 'x' }, 'a')).toEqual([]);
  });

  it('reads finite numbers from numbers and numeric strings', () => {
    expect(asOptionalNumber({ a: 4 }, 'a')).toBe(4);
    expect(asOptionalNumber({ a: Number.NaN }, 'a')).toBeUndefined();
    expect(asOptionalNumber({ a: ' 12 ' }, 'a')).toBe(12);
    expect(asOptionalNumber({ a: '  ' }, 'a')).toBeUndefined();
    expect(asOptionalNumber({ a: 'abc' }, 'a')).toBeUndefined();
    expect(asOptionalNumber({ a: true }, 'a')).toBeUndefined();
  });

  it('creates unique UUIDs', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(newId()).not.toBe(newId());
  });

  it('describes errors and non-error values', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage(42)).toBe('42');
  });

  it('sleeps with and without an abort signal', async () => {
    await expect(sleep(1)).resolves.toBeUndefined();
    await expect(sleep(1, new AbortController().signal)).resolves.toBeUndefined();
  });

  it('rejects when aborted before or during the sleep', async () => {
    await expect(sleep(1_000, AbortSignal.abort())).rejects.toThrow('aborted');
    const controller = new AbortController();
    const pending = sleep(1_000, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow('aborted');
  });

  it('maps with bounded concurrency and keeps result order', async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapWithConcurrency([3, 1, 2, 1], 2, async (delay, index) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await sleep(delay);
      inFlight--;
      return `${index}:${delay}`;
    });
    expect(results).toEqual(['0:3', '1:1', '2:2', '3:1']);
    expect(peak).toBe(2);
  });

  it('handles empty input and a zero limit', async () => {
    await expect(mapWithConcurrency<number, number>([], 4, async (item) => item)).resolves.toEqual([]);
    await expect(mapWithConcurrency([1, 2], 0, async (item) => item * 2)).resolves.toEqual([2, 4]);
  });
});
