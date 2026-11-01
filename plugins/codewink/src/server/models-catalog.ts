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
