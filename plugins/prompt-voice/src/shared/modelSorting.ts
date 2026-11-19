export interface SortableModel {
  id: string;
  label?: string;
}

export const MODEL_COST_RANK = {
  FREE_OR_LOCAL: 0,
  NANO: 10,
  FLASH_LITE: 12,
  MINI: 20,
  SPARK: 22,
  FLASH: 25,
  LIGHTWEIGHT: 28,
  OPEN_WEIGHT: 32,
  HAIKU: 35,
  REASONING_MINI: 42,
  NEUTRAL_DEFAULT: 50,
  STANDARD_GPT: 60,
  CODEX: 62,
  PRO: 65,
  SONNET: 70,
  REASONING_FULL: 75,
  FLAGSHIP_PRO: 85,
  OPUS: 95
} as const;

interface ModelCostRule {
  readonly pattern: RegExp;
  readonly rank: number;
}

/**
 * Ordered from most specific overrides (e.g. `o3-mini`, `gpt-5.4-pro`, `flash-lite`)
 * to broader family fallbacks so more specific tiers always win.
 */
const MODEL_COST_RULES: readonly ModelCostRule[] = [
  { pattern: /(?:^|[:\s-])free(?=$|[\s)\]])|\bollama\b|\b:local\b/, rank: MODEL_COST_RANK.FREE_OR_LOCAL },
  { pattern: /\bnano\b/, rank: MODEL_COST_RANK.NANO },
  { pattern: /\bflash[- ]?lite\b/, rank: MODEL_COST_RANK.FLASH_LITE },
  { pattern: /\bo[134][- ]mini\b/, rank: MODEL_COST_RANK.REASONING_MINI },
  { pattern: /\bmini\b/, rank: MODEL_COST_RANK.MINI },
  { pattern: /\bspark\b/, rank: MODEL_COST_RANK.SPARK },
  { pattern: /\bflash\b/, rank: MODEL_COST_RANK.FLASH },
  { pattern: /\b(?:lite|light|micro|tiny|small|instant)\b/, rank: MODEL_COST_RANK.LIGHTWEIGHT },
  { pattern: /\bhaiku\b/, rank: MODEL_COST_RANK.HAIKU },
  { pattern: /\bopus\b/, rank: MODEL_COST_RANK.OPUS },
  { pattern: /\b(?:codex[- ]max|ultra|heavy|max)\b/, rank: MODEL_COST_RANK.FLAGSHIP_PRO },
  { pattern: /\b(?:gpt|o[134])[a-z0-9.-]*[- ]pro\b/, rank: MODEL_COST_RANK.FLAGSHIP_PRO },
  { pattern: /\bsonnet\b/, rank: MODEL_COST_RANK.SONNET },
  { pattern: /\b(?:o1|o3|o4)\b/, rank: MODEL_COST_RANK.REASONING_FULL },
  { pattern: /\bpro\b/, rank: MODEL_COST_RANK.PRO },
  { pattern: /\bcodex\b/, rank: MODEL_COST_RANK.CODEX },
  { pattern: /\bgpt[- ]?\d/, rank: MODEL_COST_RANK.STANDARD_GPT },
  { pattern: /\bdeepseek[- ]?(?:r1|reasoner)\b/, rank: MODEL_COST_RANK.REASONING_MINI },
  { pattern: /\b(?:deepseek|llama|qwen|gemma|mistral)\b/, rank: MODEL_COST_RANK.OPEN_WEIGHT }
];

/**
 * Estimates a relative cost tier for a model based on its identifier and display label
 * so models can be ordered from cheapest/fastest to most expensive/capable.
 *
 * Lower score = cheaper. Unrecognized models receive a neutral mid-score and
 * fall back to alphabetical + numeric tie-breaking.
 */
export function estimateModelCostRank(model: SortableModel): number {
  const raw = `${model.id} ${model.label ?? ''}`.toLowerCase();
  const text = raw.replace(/[_/]+/g, ' ');
  for (const rule of MODEL_COST_RULES) {
    if (rule.pattern.test(text)) return rule.rank;
  }
  return MODEL_COST_RANK.NEUTRAL_DEFAULT;
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
