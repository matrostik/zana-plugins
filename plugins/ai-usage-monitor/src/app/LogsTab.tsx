import { useState } from 'react';
import { useZccNavigate } from '@zana-ai/zcc-plugin-sdk/app';
import type { LogEventKind, LogsResponse, UsageLogEntry } from '../shared/types.ts';
import { formatTokens, formatUsd } from './format.ts';

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

export function LogsTab({ logs, kindFilter, searchQuery, onKindChange, onSearchChange }: LogsTabProps) {
  const navigate = useZccNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected: UsageLogEntry | null =
    logs.items.find((item) => item.id === selectedId) ?? logs.items[0] ?? null;

  const ctxPct =
    selected?.contextUsedTokens && selected?.contextWindowTokens && selected.contextWindowTokens > 0
      ? Math.min(100, Math.round((selected.contextUsedTokens / selected.contextWindowTokens) * 100))
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="aum-row-between">
        <div className="aum-seg">
          <button type="button" className={kindFilter === 'all' ? 'active' : ''} onClick={() => onKindChange('all')}>
            All ({logs.totalCount})
          </button>
          <button type="button" className={kindFilter === 'turn_usage' ? 'active' : ''} onClick={() => onKindChange('turn_usage')}>
            Turns ({logs.countsByKind.turn_usage})
          </button>
          <button type="button" className={kindFilter === 'rate_limit' ? 'active' : ''} onClick={() => onKindChange('rate_limit')}>
            Rate Limits ({logs.countsByKind.rate_limit})
          </button>
          <button type="button" className={kindFilter === 'fallback' ? 'active' : ''} onClick={() => onKindChange('fallback')}>
            Fallbacks ({logs.countsByKind.fallback})
          </button>
          <button type="button" className={kindFilter === 'error' ? 'active' : ''} onClick={() => onKindChange('error')}>
            Errors ({logs.countsByKind.error})
          </button>
        </div>

        <input
          className="aum-input"
          placeholder="Filter logs by thread, model, or message..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: 260 }}
        />
      </div>

      <div className="aum-logs-split">
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
              {logs.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="aum-muted">
                    No usage or error logs match the current filter.
                  </td>
                </tr>
              ) : (
                logs.items.map((item) => {
                  const badge = kindBadge(item.kind);
                  const isSel = selected?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={isSel ? 'selected' : ''}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="aum-mono aum-subtext" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(item.timestampMs).toLocaleTimeString()}
                      </td>
                      <td>
                        <span className={badge.cls}>{badge.label}</span>
                      </td>
                      <td>
                        <div className="aum-mono" style={{ fontWeight: 500 }}>
                          {item.providerId}
                        </div>
                        <div className="aum-subtext aum-mono">{item.model ?? '—'}</div>
                      </td>
                      <td className="aum-subtext">{item.projectName ?? item.projectId ?? '—'}</td>
                      <td>{item.summary}</td>
                      <td className="aum-mono" style={{ textAlign: 'right' }}>
                        {item.costUsd !== null ? formatUsd(item.costUsd, 4) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="aum-card">
          {!selected ? (
            <div className="aum-muted">Select any event row to inspect tokens, cost formula, and raw provider payload.</div>
          ) : (
            <>
              <div className="aum-row-between">
                <div>
                  <div className="aum-card-label">Event Telemetry Inspector</div>
                  <div className="aum-mono" style={{ fontWeight: 600 }}>
                    {selected.id}
                  </div>
                </div>
                <span className={kindBadge(selected.kind).cls}>{kindBadge(selected.kind).label}</span>
              </div>

              {selected.inputTokens !== null && (
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
              )}

              {selected.costFormula && (
                <div className="aum-window-box">
                  <div className="aum-card-label">Cost Formula</div>
                  <div className="aum-mono" style={{ fontSize: 11, color: '#a5b4fc' }}>
                    {selected.costFormula}
                  </div>
                </div>
              )}

              <div>
                <div className="aum-card-label" style={{ marginBottom: 4 }}>
                  Raw Provider Event JSON
                </div>
                <pre className="aum-pre">{JSON.stringify(selected.payload, null, 2)}</pre>
              </div>

              {selected.threadId && (
                <button
                  type="button"
                  className="aum-btn aum-btn-primary"
                  onClick={() => navigate.toThread?.(selected.threadId!)}
                >
                  Open Thread in Zana →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
