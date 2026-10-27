import { useMemo } from 'react';
import type { PrBucket } from '../server/types.ts';
import type { PrListItem } from '../server/views.ts';
import { relativeTime, scoreTone } from './format.ts';

export const TABS: Array<{ id: PrBucket; label: string }> = [
  { id: 'needs-review', label: 'Needs my review' },
  { id: 'mine', label: 'Mine' },
  { id: 'watched', label: 'Watched' }
];

const CI_LABELS: Record<string, { text: string; tone: string }> = {
  success: { text: 'CI passing', tone: 'cn-badge-ok' },
  failure: { text: 'CI failing', tone: 'cn-badge-danger' },
  pending: { text: 'CI running', tone: 'cn-badge-warn' },
  none: { text: '', tone: '' }
};

function ReviewBadge({ review }: { review: PrListItem['review'] }) {
  if (!review) return <span className="cn-badge">Not reviewed</span>;
  if (review.status === 'queued' || review.status === 'running') {
    return (
      <span className="cn-badge cn-badge-warn">
        <span className="cn-spinner" aria-hidden="true" />
        Reviewing…
      </span>
    );
  }
  if (review.status === 'failed') return <span className="cn-badge cn-badge-danger">Review failed</span>;
  if (review.status === 'cancelled') return <span className="cn-badge">Review cancelled</span>;
  const tone = scoreTone(review.riskScore, 'risk');
  return (
    <span className={`cn-badge ${tone ? `cn-badge-${tone}` : ''}`} title={review.stale ? 'New commits since this review' : undefined}>
      Risk {review.riskScore ?? '–'} · {review.findingCount} finding{review.findingCount === 1 ? '' : 's'}
      {review.stale ? ' · stale' : ''}
    </span>
  );
}

export function PrList(props: {
  items: PrListItem[];
  tab: PrBucket;
  onTabChange(tab: PrBucket): void;
  query: string;
  onQueryChange(query: string): void;
  selectedId: string | null;
  onSelect(id: string): void;
  hasWatchedRepos: boolean;
}) {
  const counts = useMemo(() => {
    const result: Record<PrBucket, number> = { 'needs-review': 0, mine: 0, watched: 0 };
    for (const item of props.items) for (const bucket of item.buckets) result[bucket]++;
    return result;
  }, [props.items]);

  const visible = useMemo(() => {
    const query = props.query.trim().toLowerCase();
    return props.items
      .filter((item) => item.buckets.includes(props.tab))
      .filter((item) => !query || `${item.owner}/${item.repo}#${item.number} ${item.title} ${item.author}`.toLowerCase().includes(query));
  }, [props.items, props.tab, props.query]);

  return (
    <nav className="cn-list" aria-label="Pull requests">
      <div className="cn-tabs" role="tablist" aria-label="Pull request lists">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className="cn-tab"
            aria-selected={props.tab === tab.id}
            onClick={() => props.onTabChange(tab.id)}
          >
            {tab.label}
            <span className="cn-count">{counts[tab.id]}</span>
          </button>
        ))}
      </div>
      <div className="cn-search">
        <input
          className="cn-input"
          type="search"
          placeholder="Filter by title, repo, or author"
          aria-label="Filter pull requests"
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
        />
      </div>
      {visible.length === 0 ? (
        <p className="cn-empty">
          {!props.hasWatchedRepos
            ? 'Watch a repository in Settings to see its pull requests.'
            : props.items.length === 0
              ? 'No open pull requests yet. Press Refresh to sync from GitHub.'
              : 'Nothing here.'}
        </p>
      ) : (
        <ul className="cn-rows">
          {visible.map((item) => {
            const ci = CI_LABELS[item.ciState] ?? CI_LABELS.none;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="cn-row"
                  aria-current={props.selectedId === item.id}
                  onClick={() => props.onSelect(item.id)}
                >
                  <div className="cn-row-title" title={item.title}>
                    {item.isDraft ? <span className="cn-badge cn-draft">Draft</span> : null}
                    {item.title}
                  </div>
                  <div className="cn-row-meta">
                    <span>
                      {item.owner}/{item.repo}#{item.number}
                    </span>
                    <span>@{item.author}</span>
                    <span>{relativeTime(item.updatedAt)}</span>
                    {ci.text ? <span className={`cn-badge ${ci.tone}`}>{ci.text}</span> : null}
                    {(item.outdated ?? item.review?.stale) ? <span className="cn-badge cn-badge-warn" title="New commits since the completed review">Outdated</span> : null}
                    <ReviewBadge review={item.review} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
