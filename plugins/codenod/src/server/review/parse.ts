import type { IssueCategory, ParsedAnalysis, ParsedIssue, Severity } from '../types.ts';

const CATEGORY_KEYS: Array<[string, IssueCategory]> = [
  ['securityIssues', 'security'],
  ['performanceIssues', 'performance'],
  ['logicIssues', 'logic'],
  ['styleIssues', 'style']
];

const SEVERITIES = new Set<Severity>(['critical', 'high', 'medium', 'low']);
const SEVERITY_ALIASES: Record<string, Severity> = { error: 'high', warning: 'medium', info: 'low', minor: 'low', major: 'high', blocker: 'critical' };
const MAX_ISSUES = 100;

export type ParseResult = { ok: true; analysis: ParsedAnalysis } | { ok: false; problem: string };

/** Returns the first balanced top-level JSON object in `text`, ignoring braces inside strings. */
export function extractJsonObject(text: string): string | null {
  let start = text.indexOf('{');
  while (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index++) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, index + 1);
          try {
            JSON.parse(candidate);
            return candidate;
          } catch {
            break;
          }
        }
      }
    }
    start = text.indexOf('{', start + 1);
  }
  return null;
}

/** True when the first `{` in `text` is never closed, i.e. the reply was truncated mid-object. */
function startsWithUnclosedObject(text: string): boolean {
  const start = text.indexOf('{');
  if (start === -1) return false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return false;
  }
  return true;
}

function boundedScore(value: unknown, min: number, max: number): number | null {
  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return null;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function note(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeSeverity(value: unknown): Severity {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (SEVERITIES.has(raw as Severity)) return raw as Severity;
  return SEVERITY_ALIASES[raw] ?? 'medium';
}

const RETRACTION = /\b(no (action|change)s? (needed|required)|not an issue|this is fine|false positive)\b/i;

function normalizeIssue(raw: unknown, category: IssueCategory): ParsedIssue | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const description = note(record.description) ?? note(record.comment) ?? note(record.message);
  const file = note(record.file) ?? note(record.path);
  if (!description || !file) return null;
  const suggestion = note(record.suggestion);
  if (RETRACTION.test(description) || (suggestion && RETRACTION.test(suggestion))) return null;
  const line = typeof record.line === 'number' && Number.isInteger(record.line) && record.line > 0 ? record.line : null;
  return {
    category,
    severity: normalizeSeverity(record.severity),
    file: file.replace(/^\.?\//, ''),
    line,
    description,
    suggestion
  };
}

export function parseAnalysis(text: string, options: { hasRequirements: boolean }): ParseResult {
  if (!text.trim()) return { ok: false, problem: 'the reply was empty' };
  const json = extractJsonObject(text);
  if (!json) return { ok: false, problem: 'the reply did not contain a valid JSON object' };
  const data = JSON.parse(json) as Record<string, unknown>;
  const summary = note(data.summary);
  if (!summary && startsWithUnclosedObject(text)) return { ok: false, problem: 'the reply was cut off before the JSON object was complete' };
  if (!summary) return { ok: false, problem: 'the JSON object has no "summary" string' };
  const riskScore = boundedScore(data.riskScore, 1, 10);
  if (riskScore === null) return { ok: false, problem: 'the JSON object has no numeric "riskScore"' };

  const issues: ParsedIssue[] = [];
  for (const [key, category] of CATEGORY_KEYS) {
    const list = data[key];
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const issue = normalizeIssue(raw, category);
      if (issue && issues.length < MAX_ISSUES) issues.push(issue);
    }
  }

  return {
    ok: true,
    analysis: {
      summary,
      riskScore,
      issues,
      changeTypes: Array.isArray(data.changeTypes) ? data.changeTypes.filter((item): item is string => typeof item === 'string') : [],
      coverageScore: boundedScore(data.coverageScore, 0, 10),
      coverageNote: note(data.coverageNote),
      requirementsScore: options.hasRequirements ? boundedScore(data.requirementsScore, 0, 10) : null,
      requirementsNote: options.hasRequirements ? note(data.requirementsNote) : null,
      simplicityScore: boundedScore(data.simplicityScore, 0, 10),
      simplicityNote: note(data.simplicityNote),
      stabilityScore: boundedScore(data.stabilityScore, 0, 10),
      stabilityNote: note(data.stabilityNote)
    }
  };
}
