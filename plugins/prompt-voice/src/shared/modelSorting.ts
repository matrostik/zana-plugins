export interface SortableModel {
  id: string;
  label?: string;
}

/**
 * Estimates a relative cost tier for a model based on its identifier and display label
 * so models can be ordered from cheapest/fastest to most expensive/capable.
 *
 * Lower score = cheaper. Unrecognized models receive a neutral mid-score (50) and
 * fall back to alphabetical + numeric tie-breaking.
 */
export function estimateModelCostRank(model: SortableModel): number {
  const raw = `${model.id} ${model.label ?? ''}`.toLowerCase();
  const text = raw.replace(/[_/]+/g, ' ');

  // 1. Free / local models
  if (/(?:^|[:\s-])free(?=$|[\s)\]])/.test(text) || /\bollama\b|\b:local\b/.test(text)) {
    return 0;
  }

  // 2. Ultra-low-cost tiers (nano, flash-lite)
  if (/\bnano\b/.test(text)) return 10;
  if (/\bflash[- ]?lite\b/.test(text)) return 12;

  // 3. Reasoning mini models (costlier than standard mini/flash, cheaper than full reasoning)
  if (/\bo[134][- ]mini\b/.test(text)) return 42;

  // 4. Budget / lightweight tiers
  if (/\bmini\b/.test(text)) return 20;
  if (/\bspark\b/.test(text)) return 22;
  if (/\bflash\b/.test(text)) return 25;
  if (/\b(?:lite|light|micro|tiny|small|instant)\b/.test(text)) return 28;
  if (/\bhaiku\b/.test(text)) return 35;

  // 5. Most expensive flagship tiers (checked before base names so e.g. gpt-5.4-pro / codex-max wins)
  if (/\bopus\b/.test(text)) return 95;
  if (/\b(?:codex[- ]max|ultra|heavy|max)\b/.test(text)) return 85;
  if (/\b(?:gpt|o[134])[a-z0-9.-]*[- ]pro\b/.test(text)) return 85;

  // 6. Standard / mid-tier models
  if (/\bsonnet\b/.test(text)) return 70;
  if (/\b(?:o1|o3|o4)\b/.test(text)) return 75;
  if (/\bpro\b/.test(text)) return 65;
  if (/\bcodex\b/.test(text)) return 62;
  if (/\bgpt[- ]?\d/.test(text)) return 60;

  // 7. Open-weight / lower-cost hosted models when no size/tier keyword matched above
  if (/\bdeepseek[- ]?(?:r1|reasoner)\b/.test(text)) return 42;
  if (/\b(?:deepseek|llama|qwen|gemma|mistral)\b/.test(text)) return 32;

  // 8. Neutral fallback for unrecognized models
  return 50;
}

export function compareModelsCheapestFirst<T extends SortableModel>(a: T, b: T): number {
  const rankDiff = estimateModelCostRank(a) - estimateModelCostRank(b);
  if (rankDiff !== 0) return rankDiff;
  return (a.label || a.id).localeCompare(b.label || b.id, undefined, {
    sensitivity: 'base',
    numeric: true
  });
}

export function sortModelsCheapestFirst<T extends SortableModel>(models: readonly T[]): T[] {
  return [...models].sort(compareModelsCheapestFirst);
}
