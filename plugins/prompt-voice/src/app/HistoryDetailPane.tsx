import React, { useMemo } from 'react';
import type { HistoryEntry } from '../shared/protocol.ts';
import {
  PROVIDER_LABELS,
  SOURCE_LABELS,
  formatDuration,
  formatEntryKindLabel,
  formatFullTimestamp,
  wordCharSummary
} from './historyFormatters.ts';
import { computeWordDiff } from './textDiff.ts';

export interface HistoryDetailPaneProps {
  entry: HistoryEntry;
  projectName: string | null;
  showDiff: boolean;
  onToggleDiff: () => void;
  onCopyText: (text: string, target: 'output' | 'raw') => void;
  onLoadIntoStudio: (entry: HistoryEntry) => void;
  onInsertIntoComposer: (text: string) => void;
  onToggleStar: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
  onOpenThread?: (threadId: string) => void;
  copiedTarget: 'output' | 'raw' | null;
}

function HistoryDetailHeader({
  entry,
  projectName,
  onOpenThread
}: {
  entry: HistoryEntry;
  projectName: string | null;
  onOpenThread?: (threadId: string) => void;
}) {
  const audioDur = formatDuration(entry.audioDurationMs);
  const procDur = formatDuration(entry.processingDurationMs);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div className="ps-history-meta-row">
          <span className={`ps-kind-badge ps-kind-${entry.kind}`}>{formatEntryKindLabel(entry)}</span>
          <span className="ps-source-badge">{SOURCE_LABELS[entry.source] ?? entry.source}</span>
          {projectName ? <span className="ps-badge ps-badge-project">{projectName}</span> : null}
          <span>{formatFullTimestamp(entry.createdAt)}</span>
        </div>
        {entry.threadId && onOpenThread ? (
          <button
            type="button"
            className="ps-btn"
            style={{ padding: '4px 9px', fontSize: 11 }}
            onClick={() => onOpenThread(entry.threadId!)}
          >
            Open thread
          </button>
        ) : null}
      </div>

      <div className="ps-history-meta-row">
        {entry.sttProvider ? (
          <span className="ps-pill">
            STT: {PROVIDER_LABELS[entry.sttProvider] ?? entry.sttProvider}
            {entry.sttModel ? ` (${entry.sttModel})` : ''}
          </span>
        ) : null}
        {entry.llmProvider ? (
          <span className="ps-pill">
            LLM: {PROVIDER_LABELS[entry.llmProvider] ?? entry.llmProvider}
            {entry.llmModel ? ` (${entry.llmModel})` : ''}
          </span>
        ) : null}
        {audioDur ? <span className="ps-pill">Recorded: {audioDur}</span> : null}
        {procDur ? <span className="ps-pill">Processed: {procDur}</span> : null}
      </div>
    </>
  );
}

function HistoryDetailActions({
  entry,
  primaryText,
  hasDistinctOutput,
  showDiff,
  copiedTarget,
  onToggleDiff,
  onCopyText,
  onLoadIntoStudio,
  onInsertIntoComposer,
  onToggleStar,
  onDelete
}: {
  entry: HistoryEntry;
  primaryText: string;
  hasDistinctOutput: boolean;
  showDiff: boolean;
  copiedTarget: 'output' | 'raw' | null;
  onToggleDiff: () => void;
  onCopyText: (text: string, target: 'output' | 'raw') => void;
  onLoadIntoStudio: (entry: HistoryEntry) => void;
  onInsertIntoComposer: (text: string) => void;
  onToggleStar: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}) {
  return (
    <div className="ps-history-actions-bar">
      <button type="button" className="ps-btn ps-btn-primary" onClick={() => onLoadIntoStudio(entry)}>
        Load into Studio
      </button>
      <button type="button" className="ps-btn" onClick={() => onInsertIntoComposer(primaryText)}>
        Insert into Composer
      </button>
      <button type="button" className="ps-btn" onClick={() => onCopyText(primaryText, 'output')}>
        {copiedTarget === 'output' ? 'Copied' : hasDistinctOutput ? 'Copy Output' : 'Copy'}
      </button>
      {hasDistinctOutput ? (
        <>
          <button type="button" className="ps-btn" onClick={() => onCopyText(entry.rawText, 'raw')}>
            {copiedTarget === 'raw' ? 'Copied Raw' : 'Copy Raw'}
          </button>
          <button type="button" className="ps-btn" aria-pressed={showDiff} onClick={onToggleDiff}>
            {showDiff ? 'View Clean' : 'View Diff'}
          </button>
        </>
      ) : null}
      <button type="button" className="ps-btn" aria-pressed={entry.starred} onClick={() => onToggleStar(entry)}>
        <span className={entry.starred ? 'ps-star-active' : undefined}>{entry.starred ? '★' : '☆'}</span>
        <span>{entry.starred ? 'Starred' : 'Star'}</span>
      </button>
      <button type="button" className="ps-btn ps-btn-danger" style={{ marginLeft: 'auto' }} onClick={() => onDelete(entry)}>
        Delete
      </button>
    </div>
  );
}

function HistoryDetailDiffCard({ rawText, outputText }: { rawText: string; outputText: string }) {
  const diffTokens = useMemo(() => computeWordDiff(rawText, outputText), [outputText, rawText]);
  return (
    <div className="ps-history-text-card">
      <div className="ps-pane-header">
        <span className="ps-pane-title">Word Diff (Raw → Refined)</span>
      </div>
      <div className="ps-history-text-body" data-testid="history-diff-view">
        {diffTokens.map((token, idx) => (
          <span
            key={idx}
            className={
              token.type === 'added'
                ? 'ps-diff-added'
                : token.type === 'removed'
                  ? 'ps-diff-removed'
                  : 'ps-diff-unchanged'
            }
          >
            {token.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function HistoryDetailTextCards({ entry, hasDistinctOutput }: { entry: HistoryEntry; hasDistinctOutput: boolean }) {
  const rawTitle = entry.kind === 'refinement' ? 'Original Input' : hasDistinctOutput ? 'Raw Transcript' : 'Transcript';
  return (
    <>
      {hasDistinctOutput ? (
        <div className="ps-history-text-card">
          <div className="ps-pane-header">
            <span className="ps-pane-title">Refined Output</span>
            <span style={{ fontSize: 11, color: 'var(--ps-text-subtle)' }}>{wordCharSummary(entry.outputText)}</span>
          </div>
          <div className="ps-history-text-body">{entry.outputText}</div>
        </div>
      ) : null}
      <div className="ps-history-text-card">
        <div className="ps-pane-header">
          <span className="ps-pane-title">{rawTitle}</span>
          <span style={{ fontSize: 11, color: 'var(--ps-text-subtle)' }}>{wordCharSummary(entry.rawText)}</span>
        </div>
        <div className="ps-history-text-body">{entry.rawText}</div>
      </div>
    </>
  );
}

export function HistoryDetailPane({
  entry,
  projectName,
  showDiff,
  onToggleDiff,
  onCopyText,
  onLoadIntoStudio,
  onInsertIntoComposer,
  onToggleStar,
  onDelete,
  onOpenThread,
  copiedTarget
}: HistoryDetailPaneProps): React.ReactElement {
  const hasDistinctOutput = entry.rawText !== entry.outputText;
  const primaryText = entry.outputText || entry.rawText;

  return (
    <section className="ps-history-detail-pane" aria-label="Activity details">
      <div className="ps-history-detail-header">
        <HistoryDetailHeader entry={entry} projectName={projectName} onOpenThread={onOpenThread} />
        <HistoryDetailActions
          entry={entry}
          primaryText={primaryText}
          hasDistinctOutput={hasDistinctOutput}
          showDiff={showDiff}
          copiedTarget={copiedTarget}
          onToggleDiff={onToggleDiff}
          onCopyText={onCopyText}
          onLoadIntoStudio={onLoadIntoStudio}
          onInsertIntoComposer={onInsertIntoComposer}
          onToggleStar={onToggleStar}
          onDelete={onDelete}
        />
      </div>

      {entry.refineNotice ? (
        <div
          role="status"
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            color: '#fde047',
            fontSize: 12
          }}
        >
          Cleanup fallback: {entry.refineNotice.message}
        </div>
      ) : null}

      {entry.customPrompt ? (
        <div className="ps-history-text-card">
          <div className="ps-pane-header">
            <span className="ps-pane-title">Custom Instructions</span>
          </div>
          <div className="ps-history-text-body" style={{ fontSize: 12, color: 'var(--ps-text-muted)' }}>
            {entry.customPrompt}
          </div>
        </div>
      ) : null}

      {showDiff && hasDistinctOutput ? (
        <HistoryDetailDiffCard rawText={entry.rawText} outputText={entry.outputText} />
      ) : (
        <HistoryDetailTextCards entry={entry} hasDistinctOutput={hasDistinctOutput} />
      )}
    </section>
  );
}
