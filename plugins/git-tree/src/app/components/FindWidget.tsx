import React from 'react';

export interface FindWidgetProps {
  query: string;
  onChangeQuery: (query: string) => void;
  matchCount: number;
  activeMatchIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function FindWidget(props: FindWidgetProps) {
  const {
    query,
    onChangeQuery,
    matchCount,
    activeMatchIndex,
    onPrev,
    onNext,
    onClose
  } = props;

  return (
    <div className="git-graph-find-bar" role="search" aria-label="Find in Git Tree" data-testid="gg-find-widget">
      <input
        type="search"
        className="git-graph-input gg-find-input-width"
        aria-label="Find commits"
        placeholder="Find commit, hash, author, branch, tag..."
        value={query}
        autoFocus
        onChange={(e) => onChangeQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
        data-testid="gg-find-input"
      />
      <span className="gg-find-count-badge">
        {query.trim()
          ? matchCount > 0
            ? `${activeMatchIndex + 1} / ${matchCount}`
            : '0 / 0'
          : ''}
      </span>
      <button
        type="button"
        className="git-graph-btn"
        disabled={matchCount === 0}
        onClick={onPrev}
        title="Previous match (Shift+Enter)"
        data-testid="gg-find-prev"
      >
        ↑
      </button>
      <button
        type="button"
        className="git-graph-btn"
        disabled={matchCount === 0}
        onClick={onNext}
        title="Next match (Enter)"
        data-testid="gg-find-next"
      >
        ↓
      </button>
      <button
        type="button"
        className="git-graph-btn"
        onClick={onClose}
        aria-label="Close find widget"
      >
        ✕
      </button>
    </div>
  );
}
