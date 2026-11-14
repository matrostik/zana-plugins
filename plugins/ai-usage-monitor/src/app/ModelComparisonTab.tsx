import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtime } from '@zana-ai/zcc-plugin-sdk/app';
import {
  COMPARISON_RPC,
  filterComparisonModels,
  listComparisonCreators,
  sortComparisonModels,
  type ComparisonSnapshotState,
  type ComparisonSortKey
} from '../shared/comparison.ts';
import { REALTIME_CHANNEL } from '../shared/types.ts';
import { formatRelativeTime, formatShortLocalDateTime } from './format.ts';
import { ReloadSpinner } from './OverviewTab.tsx';
import { errorText, useMountedRef, useRpcRef } from './panel-hooks.ts';

interface SortColumnDef {
  key: ComparisonSortKey;
  label: string;
  defaultDir: 'asc' | 'desc';
}

const SORT_COLUMNS: readonly SortColumnDef[] = [
  { key: 'name', label: 'Model', defaultDir: 'asc' },
  { key: 'intelligence', label: 'Intelligence', defaultDir: 'desc' },
  { key: 'input', label: 'Input $ / 1M', defaultDir: 'asc' },
  { key: 'output', label: 'Output $ / 1M', defaultDir: 'asc' },
  { key: 'speed', label: 'Output tok/s', defaultDir: 'desc' },
  { key: 'ttft', label: 'First token · s', defaultDir: 'asc' }
];

function parseCap(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function formatComparisonPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  if (value > 0 && Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
    return `$${Number(value.toFixed(4))}`;
  }
  return `$${value.toFixed(2)}`;
}

function formatComparisonMetric(value: number | null, maxDigits: number): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  return String(Number(value.toFixed(maxDigits)));
}

function ComparisonNotice({
  state,
  rpcError,
  isCoolingDown
}: {
  state: ComparisonSnapshotState | null;
  rpcError: string | null;
  isCoolingDown: boolean;
}) {
  if (rpcError) {
    return <div className="aum-banner aum-banner-error" role="alert">{rpcError}</div>;
  }
  if (!state) return null;
  if (!state.encryptionAvailable) {
    return (
      <div className="aum-banner aum-banner-error" role="status">
        OS credential encryption is unavailable, so an Artificial Analysis API key cannot be stored.
      </div>
    );
  }
  if (!state.configured && !state.snapshot) {
    return (
      <div className="aum-banner aum-banner-info" role="status">
        Add your Artificial Analysis API key in Zana Settings → Usage Telemetry &amp; Connectors → Artificial Analysis to load model data. Saved keys are never displayed.
      </div>
    );
  }
  if (state.lastError) {
    const retryText =
      isCoolingDown && state.retryAtMs
        ? ` Retry available after ${formatShortLocalDateTime(state.retryAtMs)}.`
        : '';
    const cachedText = state.snapshot ? ' Showing the last saved snapshot.' : '';
    return (
      <div
        className={state.authInvalid ? 'aum-banner aum-banner-error' : 'aum-banner aum-banner-warn'}
        role="status"
      >
        <span>{state.lastError}{retryText}{cachedText}</span>
      </div>
    );
  }
  if (isCoolingDown && state.retryAtMs) {
    return (
      <div className="aum-banner aum-banner-warn" role="status">
        Refresh paused until {formatShortLocalDateTime(state.retryAtMs)}.{state.snapshot ? ' Showing the last saved snapshot.' : ''}
      </div>
    );
  }
  if (state.stale && state.snapshot) {
    return (
      <div className="aum-banner aum-banner-warn" role="status">
        Showing saved snapshot from {formatRelativeTime(state.snapshot.fetchedAtMs)}. Data is older than 24 hours.
      </div>
    );
  }
  return null;
}

export function ModelComparisonTab() {
  const rpcRef = useRpcRef();
  const mountedRef = useMountedRef();

  const [state, setState] = useState<ComparisonSnapshotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [creator, setCreator] = useState('');
  const [maxInput, setMaxInput] = useState('');
  const [maxOutput, setMaxOutput] = useState('');
  const [sortKey, setSortKey] = useState<ComparisonSortKey>('intelligence');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadComparison = useCallback(async () => {
    try {
      const next = (await rpcRef.current.call(COMPARISON_RPC.getData)) as ComparisonSnapshotState;
      if (mountedRef.current) {
        setState(next);
        setRpcError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setRpcError(errorText(err));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [rpcRef, mountedRef]);

  useEffect(() => {
    void loadComparison();
  }, [loadComparison]);

  useRealtime(REALTIME_CHANNEL, (payload) => {
    const rec = payload && typeof payload === 'object' ? (payload as { comparisonUpdated?: boolean }) : null;
    if (!rec || rec.comparisonUpdated) {
      void loadComparison();
    }
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = (await rpcRef.current.call(COMPARISON_RPC.refresh)) as ComparisonSnapshotState;
      if (mountedRef.current) {
        setState(next);
        setRpcError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setRpcError(errorText(err));
      }
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [rpcRef, mountedRef]);

  const snapshot = state?.snapshot ?? null;
  const isCoolingDown = Boolean(state?.retryAtMs && state.retryAtMs > Date.now());
  const isBusy = refreshing || Boolean(state?.refreshing);
  const refreshDisabled =
    loading ||
    isBusy ||
    isCoolingDown ||
    !state?.configured ||
    !state?.encryptionAvailable;

  const creators = useMemo(
    () => (snapshot ? listComparisonCreators(snapshot.models) : []),
    [snapshot]
  );

  const visibleModels = useMemo(() => {
    if (!snapshot) return [];
    const filtered = filterComparisonModels(snapshot.models, {
      search,
      creator,
      maxInputPer1M: parseCap(maxInput),
      maxOutputPer1M: parseCap(maxOutput)
    });
    return sortComparisonModels(filtered, sortKey, sortDir);
  }, [snapshot, search, creator, maxInput, maxOutput, sortKey, sortDir]);

  const handleSort = (col: SortColumnDef) => {
    if (sortKey === col.key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(col.key);
    setSortDir(col.defaultDir);
  };

  const clearFilters = () => {
    setSearch('');
    setCreator('');
    setMaxInput('');
    setMaxOutput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="aum-row-between">
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Model Comparison</h2>
          <div className="aum-subtext">
            Compare intelligence, token prices and response speed across all models.
          </div>
        </div>
        <button
          type="button"
          className="aum-btn aum-btn-primary"
          disabled={refreshDisabled}
          onClick={() => void handleRefresh()}
        >
          {isBusy && <ReloadSpinner />}
          <span>{isBusy ? 'Refreshing...' : 'Refresh models'}</span>
        </button>
      </div>

      <ComparisonNotice state={state} rpcError={rpcError} isCoolingDown={isCoolingDown} />

      {loading && !state ? (
        <div className="aum-card">
          <div className="aum-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ReloadSpinner />
            <span>Loading Artificial Analysis model catalog...</span>
          </div>
        </div>
      ) : snapshot ? (
        <>
          <div className="aum-card">
            <div className="aum-comp-filters">
              <label className="aum-comp-field" style={{ flex: '1 1 210px', maxWidth: 280 }}>
                <span>Search models</span>
                <input
                  className="aum-input"
                  type="search"
                  placeholder="Model or creator name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className="aum-comp-field" style={{ minWidth: 160 }}>
                <span>Creator</span>
                <select
                  className="aum-select"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                >
                  <option value="">All creators</option>
                  {creators.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="aum-comp-field" style={{ width: 150 }}>
                <span>Max input · $ / 1M</span>
                <input
                  className="aum-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                />
              </label>
              <label className="aum-comp-field" style={{ width: 150 }}>
                <span>Max output · $ / 1M</span>
                <input
                  className="aum-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  value={maxOutput}
                  onChange={(e) => setMaxOutput(e.target.value)}
                />
              </label>
              <button type="button" className="aum-btn" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
            <div className="aum-subtext" aria-live="polite">
              Showing {visibleModels.length} of {snapshot.models.length} models
            </div>
          </div>

          <div className="aum-table-wrap">
            <table className="aum-table">
              <thead>
                <tr>
                  {SORT_COLUMNS.map((col) => {
                    const active = sortKey === col.key;
                    const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
                    return (
                      <th
                        key={col.key}
                        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          className="aum-comp-sort-btn"
                          onClick={() => handleSort(col)}
                        >
                          {col.label}{arrow}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleModels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="aum-muted" style={{ textAlign: 'center', padding: 24 }}>
                      No models match these filters.
                    </td>
                  </tr>
                ) : (
                  visibleModels.map((model) => (
                    <tr key={model.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{model.name}</div>
                        <div className="aum-subtext">{model.creatorName}</div>
                      </td>
                      <td className="aum-mono">
                        {model.intelligenceIndex !== null ? (
                          <span className="aum-comp-score">
                            {formatComparisonMetric(model.intelligenceIndex, 1)}
                          </span>
                        ) : (
                          <span className="aum-muted">n/a</span>
                        )}
                      </td>
                      <td className="aum-mono">{formatComparisonPrice(model.inputPricePer1M)}</td>
                      <td className="aum-mono">{formatComparisonPrice(model.outputPricePer1M)}</td>
                      <td className="aum-mono">{formatComparisonMetric(model.outputTokensPerSecond, 1)}</td>
                      <td className="aum-mono">{formatComparisonMetric(model.timeToFirstTokenSeconds, 2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="aum-comp-footer">
            <div>
              Last updated: {formatShortLocalDateTime(snapshot.fetchedAtMs)} ({formatRelativeTime(snapshot.fetchedAtMs)})
              {snapshot.intelligenceIndexVersion !== null
                ? ` · Intelligence Index v${snapshot.intelligenceIndexVersion}`
                : ''}
            </div>
            <div>
              Scores from different Intelligence Index versions may not be comparable. Missing measurements are shown as n/a.
            </div>
            <div>
              Data source:{' '}
              <a href="https://artificialanalysis.ai/" target="_blank" rel="noopener noreferrer">
                Artificial Analysis
              </a>
              {' '}· Refresh interval: 24 hours
            </div>
          </footer>
        </>
      ) : state?.configured && state.encryptionAvailable ? (
        <div className="aum-card">
          <div className="aum-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isBusy ? (
              <>
                <ReloadSpinner />
                <span>Fetching Artificial Analysis models...</span>
              </>
            ) : (
              <span>No cached model snapshot yet. Click Refresh models to load the catalog.</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
