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

export function formatFindingsPrompt(input: {
  owner: string; repo: string; number: number; title: string; headSha: string;
  findings: Array<{ severity: string; category: string; file: string; line: number | null; description: string; suggestion: string | null; agreedBy: string[] }>;
}): string {
  const header = [`Review findings for ${input.owner}/${input.repo}#${input.number}: ${input.title}`, `Reviewed commit: ${input.headSha}`];
  const entries = input.findings.map((finding, index) => {
    const location = finding.line === null ? finding.file : `${finding.file}:${finding.line}`;
    return [
      `${index + 1}. [${finding.severity.toUpperCase()}] ${finding.category} — ${location}`,
      `Issue: ${finding.description}`,
      ...(finding.suggestion ? [`Suggestion: ${finding.suggestion}`] : []),
      `Flagged by: ${finding.agreedBy.length ? finding.agreedBy.join(', ') : 'Model unavailable'}`
    ].join('\n');
  });
  return [...header, '', entries.join('\n\n')].join('\n');
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
