import { useState } from 'react';
import { useZccNavigate } from '@zana-ai/zcc-plugin-sdk/app';
import type { LogEventKind, LogsResponse, UsageLogEntry } from '../shared/types.ts';
import { formatShortLocalDateTime, formatTokens, formatUsd } from './format.ts';

interface LogsTabProps {
  logs: LogsResponse;
  kindFilter: LogEventKind | 'all';
  searchQuery: string;
  onKindChange: (kind: LogEventKind | 'all') => void;
  onSearchChange: (search: string) => void;
}

function kindBadge(kind: LogEventKind): { cls: string; label: string } {
  if (kind === 'rate_limit') return { cls: 'aum-pill aum-pill-amber', label: 'RATE_LIMIT' };
  if (kind === 'fallback') return { cls: 'aum-pill aum-pill-indigo', label: 'FALLBACK' };
  if (kind === 'error') return { cls: 'aum-pill aum-pill-rose', label: 'ERROR' };
  return { cls: 'aum-pill aum-pill-emerald', label: 'TURN_USAGE' };
}

function LogFiltersBar({ logs, kindFilter, searchQuery, onKindChange, onSearchChange }: LogsTabProps) {
  const allFilteredCount = Object.values(logs.countsByKind).reduce((sum, count) => sum + count, 0);
  const filters: Array<{ kind: LogEventKind | 'all'; label: string }> = [
    { kind: 'all', label: `All (${allFilteredCount})` },
    { kind: 'turn_usage', label: `Turns (${logs.countsByKind.turn_usage})` },
    { kind: 'rate_limit', label: `Rate Limits (${logs.countsByKind.rate_limit})` },
    { kind: 'fallback', label: `Fallbacks (${logs.countsByKind.fallback})` },
    { kind: 'error', label: `Errors (${logs.countsByKind.error})` }
  ];

  return (
    <div className="aum-row-between">
      <div className="aum-seg">
        {filters.map((f) => (
          <button key={f.kind} type="button" className={kindFilter === f.kind ? 'active' : ''} onClick={() => onKindChange(f.kind)}>
            {f.label}
          </button>
        ))}
      </div>
      <input
        className="aum-input"
        placeholder="Filter logs by thread, model, or message..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 260 }}
      />
    </div>
  );
}

function LogEventRow({
  item,
  selected,
  onSelect
}: {
  item: UsageLogEntry;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const badge = kindBadge(item.kind);
  return (
    <tr className={selected ? 'selected' : ''} onClick={() => onSelect(item.id)}>
      <td className="aum-mono aum-subtext" style={{ whiteSpace: 'nowrap' }}>
        {formatShortLocalDateTime(item.timestampMs)}
      </td>
      <td><span className={badge.cls}>{badge.label}</span></td>
      <td>
        <div className="aum-mono" style={{ fontWeight: 500 }}>{item.providerId}</div>
        <div className="aum-subtext aum-mono">{item.model ?? '—'}</div>
      </td>
      <td className="aum-subtext">{item.projectName ?? item.projectId ?? '—'}</td>
      <td>{item.summary}</td>
      <td className="aum-mono" style={{ textAlign: 'right' }}>
        {item.costUsd !== null ? formatUsd(item.costUsd, 4) : '—'}
      </td>
    </tr>
  );
}

function LogsTable({ items, selectedId, onSelect }: {
  items: UsageLogEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="aum-table-wrap">
      <table className="aum-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Type</th>
            <th>Provider / Model</th>
            <th>Project</th>
            <th>Summary</th>
            <th style={{ textAlign: 'right' }}>Cost</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="aum-muted">No usage or error logs match the current filter.</td>
            </tr>
          ) : (
            items.map((item) => (
              <LogEventRow key={item.id} item={item} selected={selectedId === item.id} onSelect={onSelect} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function LogContextDetails({ selected }: { selected: UsageLogEntry }) {
  if (selected.inputTokens === null) return null;
  const ctxPct =
    selected.contextUsedTokens && selected.contextWindowTokens && selected.contextWindowTokens > 0
      ? Math.min(100, Math.round((selected.contextUsedTokens / selected.contextWindowTokens) * 100))
      : null;
  return (
    <div className="aum-window-box">
      <div className="aum-row-between aum-mono" style={{ fontSize: 11 }}>
        <span>Context Window Fill</span>
        <span>
          {selected.contextUsedTokens ? formatTokens(selected.contextUsedTokens) : '—'} /{' '}
          {selected.contextWindowTokens ? formatTokens(selected.contextWindowTokens) : '—'}
          {ctxPct !== null ? ` (${ctxPct}%)` : ''}
        </span>
      </div>
      <div className="aum-bar-track">
        <div className="aum-bar-fill" style={{ width: `${ctxPct ?? 0}%`, background: '#6366f1' }} />
      </div>
      <div className="aum-subtext aum-mono">
        In: {formatTokens(selected.inputTokens)} ({formatTokens(selected.cachedInputTokens ?? 0)} cached) • Out:{' '}
        {formatTokens(selected.outputTokens ?? 0)} • Reasoning: {formatTokens(selected.reasoningOutputTokens ?? 0)}
      </div>
    </div>
  );
}

function LogCostFormulaBox({ costFormula }: { costFormula: string | null }) {
  if (!costFormula) return null;
  return (
    <div className="aum-window-box">
      <div className="aum-card-label">Cost Formula</div>
      <div className="aum-mono" style={{ fontSize: 11, color: '#a5b4fc' }}>{costFormula}</div>
    </div>
  );
}

function LogEventInspector({ selected, onOpenThread }: {
  selected: UsageLogEntry | null;
  onOpenThread?: (threadId: string) => void;
}) {
  if (!selected) {
    return (
      <div className="aum-card">
        <div className="aum-muted">Select any event row to inspect tokens, cost formula, and raw provider payload.</div>
      </div>
    );
  }
  const badge = kindBadge(selected.kind);
  return (
    <div className="aum-card">
      <div className="aum-row-between">
        <div>
          <div className="aum-card-label">Event Telemetry Inspector</div>
          <div className="aum-mono" style={{ fontWeight: 600 }}>{selected.id}</div>
        </div>
        <span className={badge.cls}>{badge.label}</span>
      </div>
      <LogContextDetails selected={selected} />
      <LogCostFormulaBox costFormula={selected.costFormula} />
      <div>
        <div className="aum-card-label" style={{ marginBottom: 4 }}>Raw Provider Event JSON</div>
        <pre className="aum-pre">{JSON.stringify(selected.payload, null, 2)}</pre>
      </div>
      {selected.threadId && (
        <button type="button" className="aum-btn aum-btn-primary" onClick={() => onOpenThread?.(selected.threadId!)}>
          Open Thread in Zana →
        </button>
      )}
    </div>
  );
}

export function LogsTab(props: LogsTabProps) {
  const navigate = useZccNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = props.logs.items.find((item) => item.id === selectedId) ?? props.logs.items[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <LogFiltersBar {...props} />
      <div className="aum-logs-split">
        <LogsTable items={props.logs.items} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        <LogEventInspector selected={selected} onOpenThread={navigate.toThread} />
      </div>
    </div>
  );
}
