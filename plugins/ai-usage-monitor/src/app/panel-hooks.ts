import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { callPluginRpc, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import {
  RPC_METHODS,
  type DashboardPayload,
  type LogEventKind,
  type LogsResponse,
  type ProviderOrderPrefs,
  type TimeRangeKey
} from '../shared/types.ts';
import { hasValidAntigravityWindows, type AntigravityUsageEnvelope } from './antigravity-usage.ts';

type RpcClient = ReturnType<typeof useRpc>;
type RpcRef = MutableRefObject<RpcClient>;
type MountedRef = MutableRefObject<boolean>;

const LOGS_PAGE_SIZE = 80;
const ANTIGRAVITY_REFRESH_FAILED = 'Could not refresh Antigravity usage.';

const EMPTY_LOGS: LogsResponse = {
  items: [],
  totalCount: 0,
  countsByKind: { turn_usage: 0, rate_limit: 0, fallback: 0, error: 0 }
};

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Tracks whether the component is still mounted so async callbacks can skip state updates. */
export function useMountedRef(): MountedRef {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
}

/** Keeps a stable ref to the latest RPC client so callbacks do not need it as a dependency. */
export function useRpcRef(): RpcRef {
  const rpc = useRpc();
  const rpcRef = useRef(rpc);
  rpcRef.current = rpc;
  return rpcRef;
}

export interface DashboardDataState {
  dashboard: DashboardPayload | null;
  setDashboard: Dispatch<SetStateAction<DashboardPayload | null>>;
  logs: LogsResponse;
  loading: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  loadAll: () => Promise<void>;
}

/** Loads the dashboard payload and the filtered log page, reloading whenever the filters change. */
export function useDashboardData(args: {
  rpcRef: RpcRef;
  mountedRef: MountedRef;
  range: TimeRangeKey;
  logKind: LogEventKind | 'all';
  logSearch: string;
}): DashboardDataState {
  const { rpcRef, mountedRef, range, logKind, logSearch } = args;
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [logs, setLogs] = useState<LogsResponse>(EMPTY_LOGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      // Each payload is applied as soon as it arrives so one failing request does not hide the other.
      await Promise.all([
        rpcRef.current.call(RPC_METHODS.dashboard, { range }).then((payload) => {
          if (mountedRef.current) setDashboard(payload as DashboardPayload);
        }),
        rpcRef.current.call(RPC_METHODS.logs, {
          kind: logKind, search: logSearch.trim() || undefined, limit: LOGS_PAGE_SIZE, offset: 0
        }).then((payload) => {
          if (mountedRef.current) setLogs(payload as LogsResponse);
        })
      ]);
      if (mountedRef.current) setError(null);
    } catch (err) {
      if (mountedRef.current) setError(errorText(err));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [rpcRef, mountedRef, range, logKind, logSearch]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return { dashboard, setDashboard, logs, loading, error, setError, loadAll };
}

export interface AntigravityUsageState {
  usage: unknown;
  refreshing: boolean;
  /** Probes the Antigravity plugin directly from the panel. */
  probe: () => Promise<void>;
  /** Schedules a probe on the next render (no-op when Antigravity is unavailable). */
  requestRefresh: () => void;
}

/**
 * Probes the Antigravity provider plugin directly from the panel. A sequence number discards
 * responses from superseded probes, and a failed refresh keeps the last good quota windows
 * visible with a `refreshError` instead of clearing them.
 */
export function useAntigravityUsage(hasAntigravity: boolean, mountedRef: MountedRef): AntigravityUsageState {
  const [usage, setUsage] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const seqRef = useRef(0);

  const probe = useCallback(async () => {
    const seq = ++seqRef.current;
    const isCurrent = () => mountedRef.current && seq === seqRef.current;
    setRefreshing(true);
    try {
      const next = (await callPluginRpc('provider-antigravity', 'usage:status')) as AntigravityUsageEnvelope | null;
      if (!isCurrent()) return;
      const status = next?.usage?.status;
      if (hasValidAntigravityWindows(next) || status === 'unauthenticated' || status === 'not_installed') {
        setUsage(next);
        return;
      }
      setUsage((prev: unknown) => keepPreviousWindows(prev, next?.usage?.message ?? ANTIGRAVITY_REFRESH_FAILED, next));
    } catch {
      if (!isCurrent()) return;
      setUsage((prev: unknown) => keepPreviousWindows(prev, ANTIGRAVITY_REFRESH_FAILED, { supported: false }));
    } finally {
      if (isCurrent()) setRefreshing(false);
    }
  }, [mountedRef]);

  useEffect(() => {
    if (!hasAntigravity) {
      seqRef.current += 1;
      setUsage(null);
      setRefreshing(false);
      return;
    }
    void probe();
  }, [hasAntigravity, probe, refreshTick]);

  const requestRefresh = useCallback(() => setRefreshTick((value) => value + 1), []);
  return { usage, refreshing, probe, requestRefresh };
}

function keepPreviousWindows(prev: unknown, refreshError: string, fallback: AntigravityUsageEnvelope | null): unknown {
  return hasValidAntigravityWindows(prev) ? { ...(prev as AntigravityUsageEnvelope), refreshError } : fallback;
}

export interface PanelActions {
  refreshing: boolean;
  refreshingProviders: ReadonlySet<string>;
  refreshNow: () => Promise<void>;
  refreshProvider: (providerId: string) => Promise<void>;
  /** Runs a mutating RPC and reloads data. Resolves `false` (after showing the error) on failure. */
  runMutation: (method: string, args: unknown) => Promise<boolean>;
  updateProviderOrder: (prefs: ProviderOrderPrefs) => Promise<void>;
}

/** User-triggered refresh and mutation handlers for the panel. */
export function usePanelActions(args: {
  rpcRef: RpcRef;
  mountedRef: MountedRef;
  data: DashboardDataState;
  antigravity: AntigravityUsageState;
}): PanelActions {
  const { rpcRef, mountedRef, data, antigravity } = args;
  const { loadAll, setError, setDashboard } = data;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingProviders, setRefreshingProviders] = useState<ReadonlySet<string>>(() => new Set());

  const reportError = (err: unknown) => {
    if (mountedRef.current) setError(errorText(err));
  };
  const toggleProviderRefreshing = (providerId: string, active: boolean) => {
    setRefreshingProviders((prev) => {
      const next = new Set(prev);
      if (active) next.add(providerId);
      else next.delete(providerId);
      return next;
    });
  };

  async function refreshNow() {
    setRefreshing(true);
    try {
      await rpcRef.current.call(RPC_METHODS.refreshNow);
      antigravity.requestRefresh();
      await loadAll();
    } catch (err) {
      reportError(err);
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }

  async function refreshProvider(providerId: string) {
    toggleProviderRefreshing(providerId, true);
    try {
      // The panel probes Antigravity directly (its result overlays the dashboard card), so ask the
      // server to skip its own loopback usage:status probe to avoid two concurrent probes.
      const isAntigravity = providerId === 'antigravity';
      await Promise.all([
        rpcRef.current.call(RPC_METHODS.refreshProvider, isAntigravity ? { providerId, skipAntigravityProbe: true } : { providerId }),
        isAntigravity ? antigravity.probe() : Promise.resolve()
      ]);
      await loadAll();
    } catch (err) {
      reportError(err);
    } finally {
      if (mountedRef.current) toggleProviderRefreshing(providerId, false);
    }
  }

  async function runMutation(method: string, mutationArgs: unknown): Promise<boolean> {
    try {
      await rpcRef.current.call(method, mutationArgs);
    } catch (err) {
      reportError(err);
      return false;
    }
    if (mountedRef.current) setError(null);
    await loadAll();
    return true;
  }

  async function updateProviderOrder(prefs: ProviderOrderPrefs) {
    setDashboard((prev) => (prev ? { ...prev, providerOrder: prefs } : prev));
    try {
      const saved = (await rpcRef.current.call(RPC_METHODS.setProviderOrder, prefs)) as ProviderOrderPrefs | undefined;
      if (mountedRef.current && saved) setDashboard((prev) => (prev ? { ...prev, providerOrder: saved } : prev));
    } catch (err) {
      reportError(err);
    }
  }

  return { refreshing, refreshingProviders, refreshNow, refreshProvider, runMutation, updateProviderOrder };
}
