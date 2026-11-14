export const COMPARISON_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const COMPARISON_SCHEMA_VERSION = 1;

export const COMPARISON_RPC = {
  getData: 'comparison:data',
  refresh: 'comparison:refresh'
} as const;

export interface ComparisonModel {
  id: string;
  name: string;
  slug: string;
  creatorId: string | null;
  creatorName: string;
  releaseDate: string | null;
  intelligenceIndex: number | null;
  codingIndex: number | null;
  agenticIndex: number | null;
  inputPricePer1M: number | null;
  outputPricePer1M: number | null;
  outputTokensPerSecond: number | null;
  timeToFirstTokenSeconds: number | null;
}

export interface ComparisonSnapshot {
  schemaVersion: typeof COMPARISON_SCHEMA_VERSION;
  fetchedAtMs: number;
  intelligenceIndexVersion: number | string | null;
  tier: string | null;
  models: ComparisonModel[];
}

export interface ComparisonSnapshotState {
  configured: boolean;
  encryptionAvailable: boolean;
  snapshot: ComparisonSnapshot | null;
  stale: boolean;
  refreshing: boolean;
  retryAtMs: number | null;
  authInvalid: boolean;
  lastError: string | null;
}

export type ComparisonSortKey =
  | 'name'
  | 'intelligence'
  | 'input'
  | 'output'
  | 'speed'
  | 'ttft';

export interface ComparisonFilterOptions {
  search: string;
  creator: string;
  maxInputPer1M: number | null;
  maxOutputPer1M: number | null;
}

export function listComparisonCreators(models: readonly ComparisonModel[]): string[] {
  const seen = new Set<string>();
  for (const model of models) {
    if (model.creatorName) seen.add(model.creatorName);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export function filterComparisonModels(
  models: readonly ComparisonModel[],
  filters: ComparisonFilterOptions
): ComparisonModel[] {
  const query = filters.search.trim().toLowerCase();
  const creator = filters.creator.trim();
  const { maxInputPer1M, maxOutputPer1M } = filters;

  return models.filter((model) => {
    if (query) {
      const hay = `${model.name} ${model.creatorName} ${model.slug}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    if (creator && model.creatorName !== creator) return false;
    if (maxInputPer1M !== null) {
      if (model.inputPricePer1M === null || model.inputPricePer1M > maxInputPer1M) return false;
    }
    if (maxOutputPer1M !== null) {
      if (model.outputPricePer1M === null || model.outputPricePer1M > maxOutputPer1M) return false;
    }
    return true;
  });
}

function sortValue(model: ComparisonModel, key: ComparisonSortKey): number | string | null {
  switch (key) {
    case 'name': return model.name;
    case 'intelligence': return model.intelligenceIndex;
    case 'input': return model.inputPricePer1M;
    case 'output': return model.outputPricePer1M;
    case 'speed': return model.outputTokensPerSecond;
    case 'ttft': return model.timeToFirstTokenSeconds;
  }
}

export function sortComparisonModels(
  models: readonly ComparisonModel[],
  key: ComparisonSortKey,
  direction: 'asc' | 'desc'
): ComparisonModel[] {
  const dir = direction === 'asc' ? 1 : -1;
  return [...models].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left === null && right === null) return a.name.localeCompare(b.name);
    if (left === null) return 1;
    if (right === null) return -1;
    if (typeof left === 'string' && typeof right === 'string') {
      const cmp = left.localeCompare(right);
      return cmp !== 0 ? dir * cmp : a.id.localeCompare(b.id);
    }
    const diff = (left as number) - (right as number);
    return diff !== 0 ? dir * diff : a.name.localeCompare(b.name);
  });
}
