import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import {
  HISTORY_CHANGED_EVENT,
  HISTORY_CLEAR_METHOD,
  HISTORY_DELETE_METHOD,
  HISTORY_LIST_METHOD,
  HISTORY_PROJECTS_METHOD,
  HISTORY_STAR_METHOD,
  type ActivitySource,
  type HistoryClearResponse,
  type HistoryDeleteResponse,
  type HistoryEntry,
  type HistoryListResponse,
  type HistoryProjectOption,
  type HistoryProjectsResponse,
  type HistoryStarResponse,
  type HistoryTypeFilter
} from '../shared/protocol.ts';
import { useSafeRealtime } from './safeSdk.ts';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 180;

export type HistoryRpcClient = { call<T = unknown>(method: string, input?: unknown): Promise<T> };

interface RealtimeHistoryPayload {
  action?: 'recorded' | 'starred' | 'deleted' | 'cleared' | 'pruned' | 'settingsChanged';
  id?: string;
  starred?: boolean;
}

function useHistoryFilters(projectId?: string) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<ActivitySource | 'all'>('all');
  const [starredOnly, setStarredOnly] = useState(false);
  const [scopeMode, setScopeMode] = useState<'project' | 'all'>(projectId ? 'project' : 'all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');

  useEffect(() => {
    setScopeMode(projectId ? 'project' : 'all');
    setSelectedProjectFilter('');
  }, [projectId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const effectiveProjectId = projectId
    ? scopeMode === 'project'
      ? projectId
      : null
    : selectedProjectFilter || null;

  const hasActiveFilters = Boolean(
    debouncedQuery || typeFilter !== 'all' || sourceFilter !== 'all' || starredOnly || selectedProjectFilter
  );

  const resetFilters = useCallback(() => {
    setSearchInput('');
    setDebouncedQuery('');
    setTypeFilter('all');
    setSourceFilter('all');
    setStarredOnly(false);
    setSelectedProjectFilter('');
  }, []);

  return {
    searchInput, setSearchInput, debouncedQuery,
    typeFilter, setTypeFilter, sourceFilter, setSourceFilter,
    starredOnly, setStarredOnly, scopeMode, setScopeMode,
    selectedProjectFilter, setSelectedProjectFilter,
    effectiveProjectId, hasActiveFilters, resetFilters
  };
}

function useHistoryProjects(rpcRef: MutableRefObject<HistoryRpcClient>) {
  const [projects, setProjects] = useState<HistoryProjectOption[]>([]);

  const loadProjects = useCallback(() => {
    rpcRef.current
      .call<HistoryProjectsResponse>(HISTORY_PROJECTS_METHOD)
      .then((res) => {
        if (res && Array.isArray(res.projects)) setProjects(res.projects);
      })
      .catch(() => undefined);
  }, [rpcRef]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const projectNameById = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects]
  );

  return { projects, projectNameById, loadProjects };
}

function useStarHistoryEntry(
  rpcRef: MutableRefObject<HistoryRpcClient>,
  starredOnly: boolean,
  setEntries: Dispatch<SetStateAction<HistoryEntry[]>>,
  setTotal: Dispatch<SetStateAction<number>>,
  onStatusNotice?: (message: string) => void
) {
  return useCallback(async (entry: HistoryEntry) => {
    try {
      const res = await rpcRef.current.call<HistoryStarResponse>(HISTORY_STAR_METHOD, {
        id: entry.id,
        starred: !entry.starred
      });
      if (!res?.ok || !res.entry) {
        onStatusNotice?.('Could not update star status.');
        return;
      }
      if (starredOnly && !res.entry.starred) {
        setEntries((prev) => prev.filter((item) => item.id !== entry.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setEntries((prev) => prev.map((item) => (item.id === entry.id ? res.entry! : item)));
      }
    } catch {
      onStatusNotice?.('Could not update star status.');
    }
  }, [onStatusNotice, rpcRef, setEntries, setTotal, starredOnly]);
}

function useDeleteHistoryEntry(
  rpcRef: MutableRefObject<HistoryRpcClient>,
  setEntries: Dispatch<SetStateAction<HistoryEntry[]>>,
  setTotal: Dispatch<SetStateAction<number>>,
  onStatusNotice?: (message: string) => void
) {
  return useCallback(async (entry: HistoryEntry) => {
    try {
      const res = await rpcRef.current.call<HistoryDeleteResponse>(HISTORY_DELETE_METHOD, { id: entry.id });
      if (!res?.ok || !res.deleted) {
        onStatusNotice?.('Could not delete history entry.');
        return;
      }
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
      setTotal((t) => Math.max(0, t - 1));
      onStatusNotice?.('History entry deleted.');
    } catch {
      onStatusNotice?.('Could not delete history entry.');
    }
  }, [onStatusNotice, rpcRef, setEntries, setTotal]);
}

function useClearHistory(
  rpcRef: MutableRefObject<HistoryRpcClient>,
  effectiveProjectId: string | null,
  refresh: () => Promise<void>,
  onStatusNotice?: (message: string) => void
) {
  const [clearing, setClearing] = useState(false);

  const clearHistory = useCallback(async (includeStarred: boolean) => {
    setClearing(true);
    try {
      const res = await rpcRef.current.call<HistoryClearResponse>(HISTORY_CLEAR_METHOD, {
        projectId: effectiveProjectId,
        includeStarred
      });
      if (!res?.ok) {
        onStatusNotice?.('Could not clear history.');
        return;
      }
      onStatusNotice?.(
        res.deletedCount === 0
          ? 'No matching entries were cleared.'
          : `Cleared ${res.deletedCount} history ${res.deletedCount === 1 ? 'entry' : 'entries'}.`
      );
      await refresh();
    } catch {
      onStatusNotice?.('Could not clear history.');
    } finally {
      setClearing(false);
    }
  }, [effectiveProjectId, onStatusNotice, refresh, rpcRef]);

  return { clearing, clearHistory };
}

function useHistoryListLoader(
  rpcRef: MutableRefObject<HistoryRpcClient>,
  queryParams: {
    query: string;
    type: HistoryTypeFilter;
    source: ActivitySource | 'all';
    projectId: string | null;
    starredOnly: boolean;
  }
) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchEntries = useCallback(
    async (opts: { offset?: number; limit?: number; append?: boolean } = {}) => {
      const requestId = ++requestIdRef.current;
      const append = opts.append === true;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await rpcRef.current.call<HistoryListResponse>(HISTORY_LIST_METHOD, {
          query: queryParams.query || undefined,
          type: queryParams.type,
          source: queryParams.source,
          projectId: queryParams.projectId,
          starredOnly: queryParams.starredOnly,
          limit: opts.limit ?? PAGE_SIZE,
          offset: opts.offset ?? 0
        });
        if (requestIdRef.current !== requestId) return;
        const nextEntries = Array.isArray(res?.entries) ? res.entries : [];
        setEntries((prev) => (append ? [...prev, ...nextEntries] : nextEntries));
        setTotal(typeof res?.total === 'number' ? res.total : nextEntries.length);
        setHasMore(Boolean(res?.hasMore));
        setHistoryEnabled(res?.historyEnabled !== false);
        setStorageAvailable(res?.storageAvailable !== false);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : 'Could not load activity history.');
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [queryParams.projectId, queryParams.query, queryParams.source, queryParams.starredOnly, queryParams.type, rpcRef]
  );

  return {
    entries, setEntries, total, setTotal, hasMore, historyEnabled,
    storageAvailable, loading, loadingMore, error, fetchEntries
  };
}

function useHistoryRealtimeSync({
  entriesRef,
  starredOnly,
  setEntries,
  setTotal,
  fetchEntries,
  loadProjects
}: {
  entriesRef: MutableRefObject<HistoryEntry[]>;
  starredOnly: boolean;
  setEntries: Dispatch<SetStateAction<HistoryEntry[]>>;
  setTotal: Dispatch<SetStateAction<number>>;
  fetchEntries: (opts?: { offset?: number; limit?: number; append?: boolean }) => Promise<void>;
  loadProjects: () => void;
}) {
  useSafeRealtime(HISTORY_CHANGED_EVENT, (raw) => {
    const event = (raw && typeof raw === 'object' ? raw : {}) as RealtimeHistoryPayload;
    const loadedLimit = Math.max(PAGE_SIZE, entriesRef.current.length);

    if (event.action === 'deleted' && typeof event.id === 'string') {
      if (!entriesRef.current.some((item) => item.id === event.id)) return;
      setEntries((prev) => prev.filter((item) => item.id !== event.id));
      setTotal((t) => Math.max(0, t - 1));
      return;
    }
    if (event.action === 'starred' && typeof event.id === 'string' && typeof event.starred === 'boolean') {
      const exists = entriesRef.current.some((item) => item.id === event.id);
      if (starredOnly && event.starred && !exists) {
        void fetchEntries({ offset: 0, limit: loadedLimit, append: false });
      } else if (exists && starredOnly && !event.starred) {
        setEntries((prev) => prev.filter((item) => item.id !== event.id));
        setTotal((t) => Math.max(0, t - 1));
      } else if (exists) {
        setEntries((prev) => prev.map((item) => (item.id === event.id ? { ...item, starred: event.starred! } : item)));
      }
      return;
    }
    if (event.action === 'settingsChanged') {
      void fetchEntries({ offset: 0, limit: loadedLimit, append: false });
      return;
    }
    void fetchEntries({ offset: 0, limit: loadedLimit, append: false });
    if (!event.action || event.action === 'recorded' || event.action === 'cleared' || event.action === 'pruned') {
      loadProjects();
    }
  });
}

/** Manages activity history fetching, filter state, project names, realtime refreshes, and mutations. */
export function useHistoryEntries({
  rpc,
  projectId,
  onStatusNotice
}: {
  rpc: HistoryRpcClient;
  projectId?: string;
  onStatusNotice?: (message: string) => void;
}) {
  const rpcRef = useRef(rpc);
  rpcRef.current = rpc;
  const filters = useHistoryFilters(projectId);
  const { projects, projectNameById, loadProjects } = useHistoryProjects(rpcRef);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useHistoryListLoader(rpcRef, {
    query: filters.debouncedQuery,
    type: filters.typeFilter,
    source: filters.sourceFilter,
    projectId: filters.effectiveProjectId,
    starredOnly: filters.starredOnly
  });
  const entriesRef = useRef(list.entries);
  entriesRef.current = list.entries;

  const refresh = useCallback(() => list.fetchEntries({ offset: 0, append: false }), [list.fetchEntries]);
  useEffect(() => { void refresh(); }, [refresh]);

  useHistoryRealtimeSync({
    entriesRef,
    starredOnly: filters.starredOnly,
    setEntries: list.setEntries,
    setTotal: list.setTotal,
    fetchEntries: list.fetchEntries,
    loadProjects
  });

  const toggleStar = useStarHistoryEntry(rpcRef, filters.starredOnly, list.setEntries, list.setTotal, onStatusNotice);
  const deleteEntry = useDeleteHistoryEntry(rpcRef, list.setEntries, list.setTotal, onStatusNotice);
  const { clearing, clearHistory } = useClearHistory(rpcRef, filters.effectiveProjectId, refresh, onStatusNotice);

  const selectedEntry = useMemo(
    () => (list.entries.length === 0 ? null : list.entries.find((e) => e.id === selectedId) ?? list.entries[0]),
    [list.entries, selectedId]
  );

  return {
    ...filters, ...list,
    clearing, toggleStar, deleteEntry, clearHistory,
    projects, projectNameById, selectedEntry, setSelectedId
  };
}
