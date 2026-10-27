export function relativeTime(iso: string | number | null | undefined, now = Date.now()): string {
  if (iso === null || iso === undefined || iso === '') return '';
  const time = typeof iso === 'number' ? iso : Date.parse(iso);
  if (!Number.isFinite(time)) return '';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatDuration(startMs: number, endMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ${String(totalSeconds % 60).padStart(2, '0')}s`;
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;
}

const SEVERITY_NAMES: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'ERROR',
  medium: 'WARNING',
  low: 'INFO'
};

const CATEGORY_NAMES: Record<string, string> = {
  security: 'Security',
  performance: 'Performance',
  logic: 'Logic',
  style: 'Style'
};

export const PROMPT_LABELS = {
  headerPrefix: 'Review findings for',
  commitPrefix: 'Reviewed commit:',
  findingPrefix: '--- Finding',
  findingEndPrefix: '--- End Finding',
  issuePrefix: 'Issue:',
  suggestionPrefix: 'Suggestion:',
  flaggedByPrefix: 'Flagged by:'
} as const;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);
}

const ESCAPED_MARKERS = [
  '---',
  '===',
  '\\d+[\\.)]',
  ...Object.values(PROMPT_LABELS).map((label) => escapeRegex(label))
].join('|');
const INJECTION_PATTERN = new RegExp(`^\\s*(?:${ESCAPED_MARKERS})`, 'i');

export function sanitizeSingleLine(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizePromptText(text: string): string {
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (!cleaned) return '(none)';
  return cleaned
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trimEnd();
      if (INJECTION_PATTERN.test(trimmed)) {
        return `  > ${trimmed}`;
      }
      return trimmed;
    })
    .join('\n');
}

export function formatFindingsPrompt(input: {
  owner: string; repo: string; number: number; title: string; headSha: string;
  findings: Array<{ severity: string; category: string; file: string; line: number | null; description: string; suggestion: string | null; agreedBy: string[] }>;
}): string {
  const owner = sanitizeSingleLine(input.owner);
  const repo = sanitizeSingleLine(input.repo);
  const title = sanitizeSingleLine(input.title);
  const headSha = sanitizeSingleLine(input.headSha);
  const header = [`${PROMPT_LABELS.headerPrefix} ${owner}/${repo}#${input.number}: ${title}`, `${PROMPT_LABELS.commitPrefix} ${headSha}`];
  const entries = input.findings.map((finding, index) => {
    const cleanFile = sanitizeSingleLine(finding.file);
    const location = finding.line === null ? cleanFile : `${cleanFile}:${finding.line}`;
    const severityLabel = SEVERITY_NAMES[finding.severity.toLowerCase()] ?? finding.severity.toUpperCase();
    const categoryLabel = CATEGORY_NAMES[finding.category.toLowerCase()] ?? finding.category;
    return [
      `${PROMPT_LABELS.findingPrefix} ${index + 1} ---`,
      `${index + 1}. [${severityLabel}] ${categoryLabel} — ${location}`,
      `${PROMPT_LABELS.issuePrefix} ${sanitizePromptText(finding.description)}`,
      ...(finding.suggestion ? [`${PROMPT_LABELS.suggestionPrefix} ${sanitizePromptText(finding.suggestion)}`] : []),
      `${PROMPT_LABELS.flaggedByPrefix} ${finding.agreedBy.length ? finding.agreedBy.join(', ') : 'Model unavailable'}`,
      `${PROMPT_LABELS.findingEndPrefix} ${index + 1} ---`
    ].join('\n');
  });
  return [...header, '', entries.join('\n\n')].join('\n');
}

function copyWithDocumentCommand(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    return typeof document.execCommand === 'function' && Boolean(document.execCommand('copy'));
  } catch {
    return false;
  } finally {
    textarea?.remove();
  }
}

export async function copyTextToClipboard(text: string): Promise<void> {
  // Try synchronously inside the click gesture before awaiting a permission-gated API.
  if (copyWithDocumentCommand(text)) return;
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable and the built-in copy command failed.');
  try {
    await navigator.clipboard.writeText(text);
  } catch (cause) {
    throw new Error(`Clipboard access was denied and the built-in copy command failed: ${errorText(cause)}`);
  }
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Lower risk is better; quality scores are better when higher. */
export function scoreTone(value: number | null, kind: 'risk' | 'quality'): 'ok' | 'warn' | 'danger' | '' {
  if (value === null) return '';
  if (kind === 'risk') return value >= 7 ? 'danger' : value >= 4 ? 'warn' : 'ok';
  return value >= 7 ? 'ok' : value >= 4 ? 'warn' : 'danger';
}
