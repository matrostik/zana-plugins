import type { ProviderOrderPrefs, ProviderQuotaSnapshot, ProviderSortMode } from './types.ts';

export const VALID_PROVIDER_SORT_MODES = new Set<ProviderSortMode>(['usage', 'quota', 'custom']);

export const DEFAULT_PROVIDER_ORDER: ProviderOrderPrefs = {
  sortMode: 'usage',
  customOrder: []
};

export function sanitizeCustomOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    clean.push(id);
  }
  return clean;
}

export function normalizeProviderOrderPrefs(raw: unknown): ProviderOrderPrefs {
  if (!raw || typeof raw !== 'object') {
    return { sortMode: 'usage', customOrder: [] };
  }
  const rec = raw as Record<string, unknown>;
  const sortMode =
    typeof rec.sortMode === 'string' && VALID_PROVIDER_SORT_MODES.has(rec.sortMode as ProviderSortMode)
      ? (rec.sortMode as ProviderSortMode)
      : 'usage';
  return {
    sortMode,
    customOrder: sanitizeCustomOrder(rec.customOrder)
  };
}

export function compareProvidersByUsage(a: ProviderQuotaSnapshot, b: ProviderQuotaSnapshot): number {
  if (b.totalTokens !== a.totalTokens) return b.totalTokens - a.totalTokens;
  if (b.turnCount !== a.turnCount) return b.turnCount - a.turnCount;
  const nameCmp = (a.displayName || a.providerId).localeCompare(b.displayName || b.providerId);
  if (nameCmp !== 0) return nameCmp;
  return a.providerId.localeCompare(b.providerId);
}

function maxUsedPercent(prov: ProviderQuotaSnapshot): number {
  let max = -1;
  for (const win of prov.windows) {
    if (win.usedPercent !== null && Number.isFinite(win.usedPercent) && win.usedPercent > max) {
      max = win.usedPercent;
    }
  }
  return max;
}

function statusSeverityRank(status: ProviderQuotaSnapshot['status']): number {
  if (status === 'blocked') return 4;
  if (status === 'warning') return 3;
  if (status === 'error') return 2;
  if (status === 'expired' || status === 'unauthenticated') return 1;
  return 0;
}

export function compareProvidersByQuota(a: ProviderQuotaSnapshot, b: ProviderQuotaSnapshot): number {
  const usedA = maxUsedPercent(a);
  const usedB = maxUsedPercent(b);
  if (usedB !== usedA) return usedB - usedA;
  const sevDiff = statusSeverityRank(b.status) - statusSeverityRank(a.status);
  if (sevDiff !== 0) return sevDiff;
  return compareProvidersByUsage(a, b);
}

export function sortProviders<T extends ProviderQuotaSnapshot>(
  providers: readonly T[],
  prefs?: ProviderOrderPrefs | null
): T[] {
  const mode = prefs?.sortMode ?? 'usage';
  if (mode === 'quota') {
    return [...providers].sort(compareProvidersByQuota);
  }
  if (mode === 'custom' && prefs && prefs.customOrder.length > 0) {
    const customIndex = new Map(prefs.customOrder.map((id, idx) => [id, idx]));
    const usageFallback = new Map(
      [...providers].sort(compareProvidersByUsage).map((p, idx) => [p.providerId, idx])
    );
    return [...providers].sort((a, b) => {
      const idxA = customIndex.get(a.providerId);
      const idxB = customIndex.get(b.providerId);
      if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
      if (idxA !== undefined) return -1;
      if (idxB !== undefined) return 1;
      return (usageFallback.get(a.providerId) ?? 0) - (usageFallback.get(b.providerId) ?? 0);
    });
  }
  return [...providers].sort(compareProvidersByUsage);
}

export function mergeCustomOrder(visibleIds: readonly string[], existingOrder: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of visibleIds) {
    const clean = id.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    result.push(clean);
  }
  for (const id of existingOrder) {
    const clean = id.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    result.push(clean);
  }
  return result;
}

export function moveProviderWithinVisible(
  customOrder: readonly string[],
  visibleIds: readonly string[],
  providerId: string,
  delta: -1 | 1
): string[] {
  const merged = mergeCustomOrder(customOrder, visibleIds);
  const visibleOrdered = merged.filter((id) => visibleIds.includes(id));
  const visIdx = visibleOrdered.indexOf(providerId);
  const targetVisIdx = visIdx + delta;
  if (visIdx < 0 || targetVisIdx < 0 || targetVisIdx >= visibleOrdered.length) {
    return merged;
  }
  const neighborId = visibleOrdered[targetVisIdx];
  const fullA = merged.indexOf(providerId);
  const fullB = merged.indexOf(neighborId);
  if (fullA < 0 || fullB < 0) return merged;
  const next = [...merged];
  next[fullA] = neighborId;
  next[fullB] = providerId;
  return next;
}

export function reorderProviderToTarget(
  customOrder: readonly string[],
  visibleIds: readonly string[],
  draggedId: string,
  targetId: string
): string[] {
  if (draggedId === targetId) return mergeCustomOrder(customOrder, visibleIds);
  const merged = mergeCustomOrder(customOrder, visibleIds);
  const from = merged.indexOf(draggedId);
  const to = merged.indexOf(targetId);
  if (from < 0 || to < 0) return merged;
  const next = [...merged];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
