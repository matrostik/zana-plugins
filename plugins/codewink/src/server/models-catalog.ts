import { errorMessage } from './util.ts';

export interface CatalogModel {
  id: string;
  model: string;
  supportedReasoningEfforts: Array<{ reasoningEffort: string }>;
}

export interface CatalogModelView {
  id: string;
  label: string;
  reasoningLevels: string[];
}

export interface ProviderSummary {
  id: string;
  available: boolean;
  displayName?: string;
  capabilities?: { permissionModes?: string[] };
}

export interface CachedProviderCatalog {
  providerId: string;
  displayName: string;
  permissionModes: string[];
  models: CatalogModelView[];
  error: string | null;
  timedOut: boolean;
}

export interface ProviderCatalogLoaderDeps {
  listProviders: () => Promise<ProviderSummary[]>;
  loadProviderModels: (providerId: string) => Promise<{
    models?: CatalogModel[];
    selectedOnlyModels?: CatalogModel[];
    modelLoadError?: { code?: string | null; detail?: string | null } | null;
  }>;
  ttlMs?: number;
  /** How long a result with at least one failed or timed-out provider is reused before retrying. */
  errorTtlMs?: number;
  providerTimeoutMs?: number;
  now?: () => number;
}

const DEFAULT_CATALOG_TTL_MS = 5 * 60_000;
const DEFAULT_INCOMPLETE_CATALOG_TTL_MS = 30_000;
const DEFAULT_PROVIDER_TIMEOUT_MS = 15_000;

function reasoningLevelsOf(item: CatalogModel): string[] {
  if (!Array.isArray(item.supportedReasoningEfforts)) return [];
  return item.supportedReasoningEfforts.map((effort) => effort.reasoningEffort).filter((level): level is string => typeof level === 'string' && level.length > 0);
}

function appendModel(seen: Map<string, CatalogModelView>, item: CatalogModel | undefined): void {
  if (!item || typeof item.id !== 'string' || item.id.length === 0) return;
  const reasoningLevels = reasoningLevelsOf(item);
  const existing = seen.get(item.id);
  if (!existing) {
    seen.set(item.id, { id: item.id, label: item.model || item.id, reasoningLevels });
    return;
  }
  if (existing.label === existing.id && item.model) existing.label = item.model;
  if (existing.reasoningLevels.length === 0 && reasoningLevels.length > 0) existing.reasoningLevels = reasoningLevels;
}

/** Union of the provider catalog and selected-only entries, keyed by model id. */
export function mergeCatalogModels(catalog: { models?: CatalogModel[]; selectedOnlyModels?: CatalogModel[] }): CatalogModelView[] {
  const seen = new Map<string, CatalogModelView>();
  for (const item of catalog.models ?? []) appendModel(seen, item);
  for (const item of catalog.selectedOnlyModels ?? []) appendModel(seen, item);
  return [...seen.values()];
}

export function createProviderCatalogLoader(deps: ProviderCatalogLoaderDeps) {
  const ttlMs = deps.ttlMs ?? DEFAULT_CATALOG_TTL_MS;
  const errorTtlMs = deps.errorTtlMs ?? DEFAULT_INCOMPLETE_CATALOG_TTL_MS;
  const providerTimeoutMs = deps.providerTimeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
  const now = deps.now ?? Date.now;
  let cache: { entries: CachedProviderCatalog[]; at: number; complete: boolean } | null = null;
  let inFlight: Promise<CachedProviderCatalog[]> | null = null;
  let generation = 0;
  let disposed = false;
  const activeTimers = new Set<ReturnType<typeof setTimeout>>();

  async function fetchOne(provider: ProviderSummary): Promise<CachedProviderCatalog> {
    const displayName = provider.displayName ?? provider.id;
    const base = {
      providerId: provider.id,
      displayName,
      permissionModes: provider.capabilities?.permissionModes ?? []
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const outcome = await Promise.race([
        deps.loadProviderModels(provider.id).then(
          (catalog) => ({ kind: 'ok' as const, catalog }),
          (error: unknown) => ({ kind: 'error' as const, error })
        ),
        new Promise<{ kind: 'timeout' }>((resolve) => {
          timer = setTimeout(() => resolve({ kind: 'timeout' }), providerTimeoutMs);
          activeTimers.add(timer);
        })
      ]);
      if (outcome.kind === 'timeout') {
        return { ...base, models: [], error: `Timed out loading models for ${displayName}`, timedOut: true };
      }
      if (outcome.kind === 'error') {
        return { ...base, models: [], error: errorMessage(outcome.error) || `Failed to load models for ${displayName}`, timedOut: false };
      }
      const catalog = outcome.catalog;
      const loadError = catalog.modelLoadError;
      return {
        ...base,
        models: mergeCatalogModels(catalog),
        error: loadError ? (loadError.detail || loadError.code || `Failed to load models for ${displayName}`) : null,
        timedOut: false
      };
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
        activeTimers.delete(timer);
      }
    }
  }

  async function fetchAll(fetchGeneration: number): Promise<CachedProviderCatalog[]> {
    const providers = (await deps.listProviders()).filter((provider) => provider.available);
    const entries = await Promise.all(providers.map(fetchOne));
    if (!disposed && fetchGeneration === generation) {
      // Incomplete results are cached too (with a short TTL) so one failing provider does not force every call to reload all providers.
      const complete = entries.every((entry) => !entry.timedOut && entry.error === null);
      cache = { entries, at: now(), complete };
    }
    return entries;
  }

  async function load(options: { refresh?: boolean } = {}): Promise<CachedProviderCatalog[]> {
    if (!options.refresh && cache && now() - cache.at < (cache.complete ? ttlMs : errorTtlMs)) {
      return cache.entries;
    }
    if (!options.refresh && inFlight) {
      return inFlight;
    }
    const fetchGeneration = ++generation;
    const promise = fetchAll(fetchGeneration).finally(() => {
      if (inFlight === promise) inFlight = null;
    });
    inFlight = promise;
    return promise;
  }

  return {
    load,
    warm() {
      return load().catch(() => [] as CachedProviderCatalog[]);
    },
    invalidate() {
      generation++;
      cache = null;
      inFlight = null;
    },
    dispose() {
      disposed = true;
      generation++;
      cache = null;
      inFlight = null;
      for (const timer of activeTimers) clearTimeout(timer);
      activeTimers.clear();
    }
  };
}
