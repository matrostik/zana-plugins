import { useEffect, useId, useState } from 'react';
import type { ChangedFile, FindingRow, IssueCategory, PullRequestRow, Severity } from '../server/types.ts';
import { errorText } from './format.ts';
import type { Rpc } from './types.ts';

export type FindingFilters = { severity: Severity | 'all'; category: IssueCategory | 'all' };
export const SEVERITIES: Record<Severity, string> = { critical: 'Critical', high: 'Error', medium: 'Warning', low: 'Info' };
const CATEGORIES: Record<IssueCategory, string> = { security: 'Security', performance: 'Performance', logic: 'Logic', style: 'Style' };
const DEFAULT_EXPANDED_FILES = 3;
const CONTEXT_LINES_BEFORE = 3;
const CONTEXT_LINES_AFTER = 3;

function githubBlobUrl(host: string, owner: string, repo: string, sha: string, file: string): string | null {
  if (!/^[a-z0-9.-]+(?::\d{1,5})?$/.test(host)) return null;
  try {
    const url = new URL(`https://${host}`);
    if (url.host !== host || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    url.pathname = `/${[owner, repo, 'blob', sha, ...file.split('/')].map(encodeURIComponent).join('/')}`;
    return url.href;
  } catch {
    return null;
  }
}

export function matchesFinding(finding: FindingRow, filters: FindingFilters): boolean {
  return (filters.severity === 'all' || finding.severity === filters.severity) && (filters.category === 'all' || finding.category === filters.category);
}

type IconName = 'edit' | 'dismiss' | 'bulb' | 'chevron' | 'file' | 'undo';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    edit: 'm16 3 5 5M4 15 15 4a2 2 0 0 1 5 5L9 20l-6 1 1-6Z',
    dismiss: 'm6 6 12 12M6 18 18 6',
    bulb: 'M9 18h6m-5 3h4M9 15c0-3-4-3-4-7a7 7 0 0 1 14 0c0 4-4 4-4 7H9Z',
    chevron: 'm9 5 7 7-7 7',
    file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5',
    undo: 'M3 10h10a6 6 0 0 1 0 12H9M3 10l5-5M3 10l5 5'
  };
  return (
    <svg
      className="cn-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

/** Keep code in review prose readable without interpreting HTML from model output. */
function IssueText({ text }: { text: string }) {
  return (
    <p className="cn-finding-description">
      {text.split(/(`[^`\n]+`)/g).map((part, i) => (part.startsWith('`') && part.endsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part))}
    </p>
  );
}

type SnippetLine = { text: string; oldLine: number | null; newLine: number | null; kind: 'add' | 'del' | 'context'; hunk: number };
function snippetLines(patch: string | null | undefined, target: number): SnippetLine[] {
  if (!patch) return [];
  const lines: SnippetLine[] = [];
  let oldLine = 0;
  let newLine = 0;
  let hunk = 0;
  for (const raw of patch.split('\n')) {
    const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (match) {
      oldLine = Number(match[1]);
      newLine = Number(match[2]);
      hunk++;
      continue;
    }
    if (!hunk || !/^[ +\-]/.test(raw)) continue;
    const kind = raw[0] === '+' ? 'add' : raw[0] === '-' ? 'del' : 'context';
    lines.push({ text: raw.slice(1), oldLine: kind === 'add' ? null : oldLine++, newLine: kind === 'del' ? null : newLine++, kind, hunk });
  }
  const index = lines.findIndex((line) => line.newLine === target);
  if (index < 0) return [];
  return lines.slice(Math.max(0, index - CONTEXT_LINES_BEFORE), index + CONTEXT_LINES_AFTER + 1).filter((line) => line.hunk === lines[index].hunk);
}

function CodeContext({ finding, patch, loading }: { finding: FindingRow; patch?: string | null; loading: boolean }) {
  if (finding.line === null) return null;
  const lines = snippetLines(patch, finding.line);
  if (!lines.length)
    return <p className="cn-context-unavailable cn-small cn-muted">{loading ? 'Loading code context…' : 'Code context unavailable for this finding.'}</p>;
  return (
    <div className="cn-snippet" role="region" aria-label={`Code context for ${finding.file}:${finding.line}`} tabIndex={0}>
      {lines.map((line, index) => (
        <div key={index} className={`cn-snippet-line cn-diff-${line.kind}`} data-target={line.newLine === finding.line}>
          <span className="cn-line-number">{line.newLine ?? line.oldLine}</span>
          <span className="cn-line-sign">{line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}</span>
          <code>{line.text || ' '}</code>
        </div>
      ))}
    </div>
  );
}

function FindingCard(props: {
  finding: FindingRow;
  patch?: string | null;
  loading: boolean;
  fileUrl: string | null;
  editing: boolean;
  disabled: boolean;
  onEdit(): void;
  onCancel(): void;
  onSave(description: string, suggestion: string): Promise<void>;
  onDismiss(): void;
  selected: boolean;
  onToggleSelected(): void;
}) {
  const { finding, editing } = props;
  const id = useId();
  const [description, setDescription] = useState(finding.description);
  const [suggestion, setSuggestion] = useState(finding.suggestion ?? '');
  const [error, setError] = useState<string | null>(null);
  const location = finding.line === null ? finding.file : `${finding.file}:${finding.line}`;
  const canEdit = finding.postedAt === null;
  const startEdit = () => {
    setDescription(finding.description);
    setSuggestion(finding.suggestion ?? '');
    setError(null);
    props.onEdit();
  };
  const save = async () => {
    setError(null);
    try {
      await props.onSave(description, suggestion);
    } catch (cause) {
      setError(errorText(cause));
    }
  };
  return (
    <article className={`cn-finding cn-finding-${finding.severity}`} aria-label={`Finding in ${location}`}>
      <div className="cn-finding-head">
        {!finding.dismissed ? (
          <label className="cn-finding-select">
            <input type="checkbox" checked={props.selected} disabled={props.disabled || editing} onChange={props.onToggleSelected} aria-label={`Select finding in ${location}`} />
            Select
          </label>
        ) : null}
        <span className="cn-severity-dot" />
        <strong className="cn-severity-label">{SEVERITIES[finding.severity]}</strong>
        <span className="cn-category">{finding.category}</span>
        <span className="cn-badge cn-model-agreement" title={finding.agreedBy.join(', ')}>
          Flagged by: {finding.agreedBy.length ? finding.agreedBy.join(', ') : 'Model unavailable'}
        </span>
        {finding.postedAt !== null ? <span className="cn-badge cn-badge-ok">Posted</span> : null}
        <span className="cn-spacer" />
        {finding.line !== null ? (
          props.fileUrl ? (
            <a className="cn-finding-location" href={`${props.fileUrl}#L${finding.line}`} target="_blank" rel="noreferrer noopener" title={location}>
              Line {finding.line}
            </a>
          ) : <span className="cn-finding-location" title={location}>Line {finding.line}</span>
        ) : null}
        {!editing && canEdit ? (
          <button
            className="cn-icon-btn"
            type="button"
            disabled={props.disabled}
            onClick={startEdit}
            aria-label={`Edit finding in ${location}`}
            title="Edit finding"
          >
            <Icon name="edit" />
          </button>
        ) : null}
        {!editing && finding.postedAt === null ? (
          <button
            className="cn-icon-btn"
            type="button"
            disabled={props.disabled}
            onClick={props.onDismiss}
            aria-label={`Dismiss finding in ${location}`}
            title="Dismiss finding"
          >
            <Icon name="dismiss" />
          </button>
        ) : null}
      </div>
      <CodeContext finding={finding} patch={props.patch} loading={props.loading} />
      {editing ? (
        <div className="cn-finding-editor">
          <label htmlFor={`${id}-issue`}>Issue</label>
          <textarea
            id={`${id}-issue`}
            className="cn-textarea"
            rows={4}
            value={description}
            disabled={props.disabled}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
          <label htmlFor={`${id}-suggestion`}>Suggestion (optional)</label>
          <textarea
            id={`${id}-suggestion`}
            className="cn-textarea cn-mono"
            rows={3}
            value={suggestion}
            disabled={props.disabled}
            onChange={(e) => setSuggestion(e.target.value)}
          />
          {error ? <p role="alert">{error}</p> : null}
          <div className="cn-inline">
            <button className="cn-btn cn-btn-primary" type="button" disabled={props.disabled || !description.trim()} onClick={() => void save()}>
              Save
            </button>
            <button className="cn-btn" type="button" disabled={props.disabled} onClick={props.onCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <IssueText text={finding.description} />
          {finding.suggestion ? (
            <div className="cn-suggested-fix">
              <div className="cn-suggested-fix-header">
                <Icon name="bulb" />
                <strong>Suggested fix</strong>
              </div>
              <pre>{finding.suggestion}</pre>
            </div>
          ) : null}
          <div className="cn-finding-footer">
            {canEdit ? (
              <button type="button" disabled={props.disabled} className="cn-text-btn" onClick={startEdit}>
                <Icon name="edit" />
                Edit
              </button>
            ) : null}
            {canEdit ? (
              <button type="button" disabled={props.disabled} className="cn-text-btn" onClick={props.onDismiss}>
                <Icon name="dismiss" />
                Dismiss
              </button>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}

export function FindingsView(props: {
  rpc: Rpc;
  pr: PullRequestRow;
  reviewId: string;
  headSha: string;
  stale: boolean;
  findings: FindingRow[];
  filters: FindingFilters;
  onFiltersChange(filters: FindingFilters): void;
  onFindingsChange(findings: FindingRow[]): void;
  onEditingChange(editing: boolean): void;
  disabled: boolean;
  selectedIds: Set<string>;
  onSelectionChange(ids: Set<string>): void;
  onCopyPrompt(): void;
}) {
  const { findings, filters, rpc } = props;
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoIds, setUndoIds] = useState<string[]>([]);
  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [loading, setLoading] = useState(!props.stale);
  const [contextError, setContextError] = useState<string | null>(null);
  const needsContext = findings.some((finding) => !finding.dismissed && finding.line !== null);
  useEffect(() => {
    props.onEditingChange(editingId !== null || busy);
  }, [editingId, busy, props.onEditingChange]);
  useEffect(() => () => props.onEditingChange(false), [props.onEditingChange]);
  useEffect(() => {
    let cancelled = false;
    setFiles([]);
    setContextError(null);
    setLoading(!props.stale && needsContext);
    if (!props.stale && needsContext)
      void rpc
        .call('diff', { prId: props.pr.id, headSha: props.headSha })
        .then((value) => {
          if (!cancelled) setFiles(Array.isArray(value) ? (value as ChangedFile[]) : []);
        })
        .catch((cause) => {
          if (!cancelled) setContextError(errorText(cause));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    return () => {
      cancelled = true;
    };
  }, [rpc, props.pr.id, props.headSha, props.stale, needsContext]);

  const active = findings.filter((finding) => !finding.dismissed);
  const visible = active.filter((finding) => matchesFinding(finding, filters));
  const dismissibleVisible = visible.filter((finding) => finding.postedAt === null);
  const selectedFindings = findings.filter((finding) => props.selectedIds.has(finding.id) && !finding.dismissed);
  const allSelected = active.length > 0 && active.every((finding) => props.selectedIds.has(finding.id));
  const allVisibleSelected = visible.length > 0 && visible.every((finding) => props.selectedIds.has(finding.id));
  const dismissed = findings.filter((finding) => finding.dismissed && finding.postedAt === null && matchesFinding(finding, filters));
  const groups = new Map<string, FindingRow[]>();
  for (const finding of visible) groups.set(finding.file, [...(groups.get(finding.file) ?? []), finding]);
  const defaultExpanded = new Set([...new Set(active.map((finding) => finding.file))].slice(0, DEFAULT_EXPANDED_FILES));
  const open = expanded ?? defaultExpanded;
  const allExpanded = [...groups.keys()].every((file) => open.has(file));
  const disabled = props.disabled || busy;
  const controlsDisabled = disabled || editingId !== null;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };
  const dismiss = (ids: string[], value: boolean, single = false) =>
    run(async () => {
      if (single) await rpc.call('dismissFinding', { findingId: ids[0], dismissed: value });
      else await rpc.call('setFindingsDismissed', { reviewId: props.reviewId, findingIds: ids, dismissed: value });
      props.onFindingsChange(findings.map((finding) => (ids.includes(finding.id) ? { ...finding, dismissed: value } : finding)));
      setUndoIds(value ? ids : []);
    });
  const save = async (finding: FindingRow, description: string, suggestion: string) => {
    setBusy(true);
    try {
      await rpc.call('editFinding', { reviewId: props.reviewId, findingId: finding.id, description, suggestion: suggestion.trim() ? suggestion : null });
      props.onFindingsChange(
        findings.map((row) => (row.id === finding.id ? { ...row, description: description.trim(), suggestion: suggestion.trim() ? suggestion : null } : row))
      );
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cn-findings">
      <div className="cn-finding-filters">
        <div className="cn-filter-row" role="group" aria-label="Filter by severity">
          <button
            type="button"
            className="cn-filter"
            aria-pressed={filters.severity === 'all'}
            disabled={controlsDisabled}
            onClick={() => props.onFiltersChange({ ...filters, severity: 'all' })}
          >
            All severities ({active.filter((f) => matchesFinding(f, { ...filters, severity: 'all' })).length})
          </button>
          {(Object.keys(SEVERITIES) as Severity[]).map((severity) => {
            const count = active.filter((f) => f.severity === severity && matchesFinding(f, { ...filters, severity: 'all' })).length;
            return count || filters.severity === severity ? (
              <button
                key={severity}
                type="button"
                className={`cn-filter cn-filter-${severity}`}
                aria-pressed={filters.severity === severity}
                disabled={controlsDisabled}
                onClick={() => props.onFiltersChange({ ...filters, severity })}
              >
                <span className="cn-severity-dot" />
                {SEVERITIES[severity]} ({count})
              </button>
            ) : null;
          })}
        </div>
        <div className="cn-filter-row" role="group" aria-label="Filter by category">
          <button
            type="button"
            className="cn-filter"
            aria-pressed={filters.category === 'all'}
            disabled={controlsDisabled}
            onClick={() => props.onFiltersChange({ ...filters, category: 'all' })}
          >
            All categories ({active.filter((f) => matchesFinding(f, { ...filters, category: 'all' })).length})
          </button>
          {(Object.keys(CATEGORIES) as IssueCategory[]).map((category) => {
            const count = active.filter((f) => f.category === category && matchesFinding(f, { ...filters, category: 'all' })).length;
            return count || filters.category === category ? (
              <button
                key={category}
                type="button"
                className="cn-filter"
                aria-pressed={filters.category === category}
                disabled={controlsDisabled}
                onClick={() => props.onFiltersChange({ ...filters, category })}
              >
                {CATEGORIES[category]} ({count})
              </button>
            ) : null;
          })}
        </div>
        <div className="cn-finding-tools">
          <button type="button" className="cn-btn cn-small" disabled={controlsDisabled || !active.length || allSelected} onClick={() => {
            const next = new Set(props.selectedIds);
            for (const finding of active) next.add(finding.id);
            props.onSelectionChange(next);
          }}>Select all issues</button>
          <button type="button" className="cn-btn cn-small" disabled={controlsDisabled || !visible.length || allVisibleSelected} onClick={() => {
            const next = new Set(props.selectedIds);
            for (const finding of visible) next.add(finding.id);
            props.onSelectionChange(next);
          }}>Select visible</button>
          <button type="button" className="cn-btn cn-small" disabled={controlsDisabled || !props.selectedIds.size} onClick={() => props.onSelectionChange(new Set())}>Clear selection</button>
          <button type="button" className="cn-btn cn-small" disabled={controlsDisabled || !selectedFindings.length} onClick={props.onCopyPrompt}>Copy {selectedFindings.length} selected as prompt</button>
          {groups.size ? (
            <button
              type="button"
              className="cn-btn cn-small"
              disabled={controlsDisabled}
              onClick={() => setExpanded(allExpanded ? new Set() : new Set(groups.keys()))}
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          ) : null}
          <button
            type="button"
            className="cn-btn cn-small"
            disabled={controlsDisabled || !dismissibleVisible.length}
            onClick={() =>
              void dismiss(
                dismissibleVisible.map((f) => f.id),
                true
              )
            }
          >
            Dismiss {dismissibleVisible.length} filtered finding{dismissibleVisible.length === 1 ? '' : 's'}
          </button>
          {dismissed.length ? (
            <button
              type="button"
              className="cn-btn cn-small"
              disabled={controlsDisabled}
              onClick={() =>
                void dismiss(
                  dismissed.map((f) => f.id),
                  false
                )
              }
            >
              <Icon name="undo" /> Restore {dismissed.length} dismissed
            </button>
          ) : null}
          <span className="cn-spacer" />
          <span className="cn-small cn-muted">
            {visible.filter((f) => f.postedAt !== null).length} posted · {visible.filter((f) => f.postedAt === null).length} unposted
          </span>
        </div>
      </div>
      {undoIds.length ? (
        <div className="cn-undo" role="status">
          {undoIds.length} finding{undoIds.length === 1 ? '' : 's'} dismissed
          <button type="button" className="cn-text-btn" disabled={controlsDisabled} onClick={() => void dismiss(undoIds, false)}>
            <Icon name="undo" />
            Undo
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="cn-banner cn-banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {contextError ? <p className="cn-small cn-muted">Could not load code context: {contextError}</p> : null}
      {props.stale && active.length ? <p className="cn-small cn-muted">Re-run the outdated review to see current code context.</p> : null}
      {!visible.length ? (
        <p className="cn-empty">
          {!findings.length ? 'No issues found.' : !active.length ? 'All findings dismissed.' : 'No findings match the selected filters.'}
        </p>
      ) : null}
      {[...groups].map(([file, rows]) => {
        const fileUrl = githubBlobUrl(props.pr.host, props.pr.owner, props.pr.repo, props.headSha, file);
        return (
          <section className="cn-file-group" key={file} aria-label={`Findings in ${file}`}>
            <div className="cn-file-header">
              <button
                type="button"
                className="cn-file-toggle"
                disabled={controlsDisabled}
                aria-expanded={open.has(file)}
                aria-label={`${open.has(file) ? 'Collapse' : 'Expand'} ${file}`}
                onClick={() =>
                  setExpanded((current) => {
                    const next = new Set(current ?? defaultExpanded);
                    if (next.has(file)) next.delete(file);
                    else next.add(file);
                    return next;
                  })
                }
              >
                <span className="cn-file-chevron">
                  <Icon name="chevron" />
                </span>
                <Icon name="file" />
                <span className="cn-file-name">{file}</span>
                <span className="cn-count">{rows.length}</span>
              </button>
              {fileUrl ? <a className="cn-file-link" href={fileUrl} target="_blank" rel="noreferrer noopener" aria-label={`Open ${file} on GitHub`}>↗</a> : null}
            </div>
            {open.has(file) ? (
              <div className="cn-file-findings">
                {rows.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    fileUrl={fileUrl}
                    patch={files.find((f) => f.path === file)?.patch}
                    loading={loading}
                    editing={editingId === finding.id}
                    disabled={disabled || (editingId !== null && editingId !== finding.id)}
                    selected={props.selectedIds.has(finding.id)}
                    onToggleSelected={() => {
                      const next = new Set(props.selectedIds);
                      if (next.has(finding.id)) next.delete(finding.id);
                      else next.add(finding.id);
                      props.onSelectionChange(next);
                    }}
                    onEdit={() => setEditingId(finding.id)}
                    onCancel={() => setEditingId(null)}
                    onSave={(description, suggestion) => save(finding, description, suggestion)}
                    onDismiss={() => void dismiss([finding.id], true, true)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
