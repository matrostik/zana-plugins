import { DEFAULT_SUBSCRIPTION_PROVIDERS, type BillingMode, type ModelPricingRule } from '../shared/types.ts';
import type { CachedInputConvention } from './util.ts';

export type TokenReasoningConvention = 'inclusive' | 'separate';

export interface TokenUsageInput {
  providerId: string;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens?: number;
  cachedInputMode?: CachedInputConvention;
  reasoningMode?: TokenReasoningConvention;
}

export interface NormalizedTokenUsage {
  inputTokens: number;
  uncachedInputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  extraReasoningTokens: number;
  totalTokens: number;
  cachedInputMode: CachedInputConvention;
  reasoningMode: TokenReasoningConvention;
}

export interface PricingResolution {
  pattern: string;
  inputPer1M: number;
  cachedInputPer1M: number;
  outputPer1M: number;
  reasoningPer1M: number;
  billingMode: BillingMode;
}

export interface CostBreakdown {
  estimatedCostUsd: number;
  formula: string;
  pricing: PricingResolution;
  normalized: NormalizedTokenUsage;
}

const SUBSCRIPTION_PROVIDERS = new Set<string>(DEFAULT_SUBSCRIPTION_PROVIDERS);
const FREE_LOCAL_PROVIDERS = new Set(['local', 'local-models', 'ollama', 'lmstudio', 'lm-studio']);
const SEPARATE_REASONING_PROVIDERS = new Set([
  'antigravity',
  'opencode',
  'acp-opencode',
  'google',
  'gemini',
  'anthropic',
  'anthropic-api',
  'claude-code'
]);

export const DEFAULT_MODEL_PRICING: readonly Omit<ModelPricingRule, 'isOverride'>[] = [
  { pattern: '*-free', inputPer1M: 0, cachedInputPer1M: 0, outputPer1M: 0, reasoningPer1M: 0, billingMode: 'free' },
  { pattern: '*:free', inputPer1M: 0, cachedInputPer1M: 0, outputPer1M: 0, reasoningPer1M: 0, billingMode: 'free' },
  { pattern: 'claude-opus-4*', inputPer1M: 15, cachedInputPer1M: 1.5, outputPer1M: 75, reasoningPer1M: 75, billingMode: null },
  { pattern: 'claude-sonnet-4*', inputPer1M: 3, cachedInputPer1M: 0.3, outputPer1M: 15, reasoningPer1M: 15, billingMode: null },
  { pattern: 'claude-3-7-sonnet*', inputPer1M: 3, cachedInputPer1M: 0.3, outputPer1M: 15, reasoningPer1M: 15, billingMode: null },
  { pattern: 'claude-3-5-sonnet*', inputPer1M: 3, cachedInputPer1M: 0.3, outputPer1M: 15, reasoningPer1M: 15, billingMode: null },
  { pattern: 'claude-3-5-haiku*', inputPer1M: 0.8, cachedInputPer1M: 0.08, outputPer1M: 4, reasoningPer1M: 4, billingMode: null },
  { pattern: 'claude-haiku-4*', inputPer1M: 1, cachedInputPer1M: 0.1, outputPer1M: 5, reasoningPer1M: 5, billingMode: null },
  { pattern: 'gpt-5*', inputPer1M: 1.25, cachedInputPer1M: 0.125, outputPer1M: 10, reasoningPer1M: 10, billingMode: null },
  { pattern: 'gpt-4.1-mini*', inputPer1M: 0.4, cachedInputPer1M: 0.1, outputPer1M: 1.6, reasoningPer1M: 1.6, billingMode: null },
  { pattern: 'gpt-4.1-nano*', inputPer1M: 0.1, cachedInputPer1M: 0.025, outputPer1M: 0.4, reasoningPer1M: 0.4, billingMode: null },
  { pattern: 'gpt-4.1*', inputPer1M: 2, cachedInputPer1M: 0.5, outputPer1M: 8, reasoningPer1M: 8, billingMode: null },
  { pattern: 'gpt-4o-mini*', inputPer1M: 0.15, cachedInputPer1M: 0.075, outputPer1M: 0.6, reasoningPer1M: 0.6, billingMode: null },
  { pattern: 'gpt-4o*', inputPer1M: 2.5, cachedInputPer1M: 1.25, outputPer1M: 10, reasoningPer1M: 10, billingMode: null },
  { pattern: 'o4-mini*', inputPer1M: 1.1, cachedInputPer1M: 0.275, outputPer1M: 4.4, reasoningPer1M: 4.4, billingMode: null },
  { pattern: 'o3-mini*', inputPer1M: 1.1, cachedInputPer1M: 0.275, outputPer1M: 4.4, reasoningPer1M: 4.4, billingMode: null },
  { pattern: 'o3*', inputPer1M: 2, cachedInputPer1M: 0.5, outputPer1M: 8, reasoningPer1M: 8, billingMode: null },
  { pattern: 'codex*', inputPer1M: 1.5, cachedInputPer1M: 0.375, outputPer1M: 6, reasoningPer1M: 6, billingMode: null },
  { pattern: 'gemini-2.5-pro*', inputPer1M: 1.25, cachedInputPer1M: 0.3125, outputPer1M: 10, reasoningPer1M: 10, billingMode: null },
  { pattern: 'gemini-2.5-flash*', inputPer1M: 0.3, cachedInputPer1M: 0.075, outputPer1M: 2.5, reasoningPer1M: 2.5, billingMode: null },
  { pattern: 'gemini-2.0-flash*', inputPer1M: 0.1, cachedInputPer1M: 0.025, outputPer1M: 0.4, reasoningPer1M: 0.4, billingMode: null },
  { pattern: 'deepseek-r1*', inputPer1M: 0.55, cachedInputPer1M: 0.14, outputPer1M: 2.19, reasoningPer1M: 2.19, billingMode: null },
  { pattern: 'deepseek-v3*', inputPer1M: 0.27, cachedInputPer1M: 0.07, outputPer1M: 1.1, reasoningPer1M: 1.1, billingMode: null },
  { pattern: 'deepseek*', inputPer1M: 0.3, cachedInputPer1M: 0.08, outputPer1M: 1.2, reasoningPer1M: 1.2, billingMode: null },
  { pattern: 'kimi*', inputPer1M: 0.6, cachedInputPer1M: 0.15, outputPer1M: 2.5, reasoningPer1M: 2.5, billingMode: null },
  { pattern: 'qwen*', inputPer1M: 0.4, cachedInputPer1M: 0.1, outputPer1M: 1.2, reasoningPer1M: 1.2, billingMode: null },
  { pattern: 'llama*', inputPer1M: 0.2, cachedInputPer1M: 0.05, outputPer1M: 0.8, reasoningPer1M: 0.8, billingMode: null }
];

const FALLBACK_PRICING: Omit<ModelPricingRule, 'isOverride'> = {
  pattern: '*',
  inputPer1M: 2,
  cachedInputPer1M: 0.5,
  outputPer1M: 8,
  reasoningPer1M: 8,
  billingMode: null
};

export function inferDefaultBillingMode(providerId: string, model: string): BillingMode {
  const normProvider = providerId.toLowerCase();
  const normModel = model.trim().toLowerCase();
  if (
    FREE_LOCAL_PROVIDERS.has(normProvider) ||
    normModel.includes('ollama') ||
    normModel.includes(':local') ||
    normModel.endsWith(':free') ||
    normModel.endsWith('-free')
  ) {
    return 'free';
  }
  if (SUBSCRIPTION_PROVIDERS.has(normProvider)) {
    return 'subscription';
  }
  return 'billed_api';
}

const PATTERN_CACHE_LIMIT = 256;
const patternCache = new Map<string, RegExp>();

function wildcardToRegex(pattern: string): RegExp {
  const cached = patternCache.get(pattern);
  if (cached) return cached;
  const escaped = pattern
    .trim()
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${escaped}$`);
  if (patternCache.size >= PATTERN_CACHE_LIMIT) patternCache.clear();
  patternCache.set(pattern, regex);
  return regex;
}

function matchesPattern(pattern: string, providerId: string, model: string): boolean {
  const normPattern = pattern.trim().toLowerCase();
  const normModel = model.toLowerCase();
  const strippedModel = normModel.includes('/') ? normModel.slice(normModel.lastIndexOf('/') + 1) : normModel;
  const scoped = `${providerId.toLowerCase()}:${normModel}`;
  const regex = wildcardToRegex(normPattern);
  return regex.test(normModel) || regex.test(strippedModel) || regex.test(scoped);
}

export function resolveModelPricing(
  providerId: string,
  model: string,
  overrides: readonly ModelPricingRule[] = [],
  providerModeOverrides: ReadonlyMap<string, BillingMode> = new Map()
): PricingResolution {
  const orderedRules: readonly Omit<ModelPricingRule, 'isOverride'>[] = [...overrides, ...DEFAULT_MODEL_PRICING];
  const matched = orderedRules.find((rule) => matchesPattern(rule.pattern, providerId, model)) ?? FALLBACK_PRICING;
  const billingMode =
    matched.billingMode ?? providerModeOverrides.get(providerId.toLowerCase()) ?? inferDefaultBillingMode(providerId, model);

  if (billingMode === 'free') {
    return {
      pattern: matched.pattern,
      inputPer1M: 0,
      cachedInputPer1M: 0,
      outputPer1M: 0,
      reasoningPer1M: 0,
      billingMode
    };
  }

  return {
    pattern: matched.pattern,
    inputPer1M: matched.inputPer1M,
    cachedInputPer1M: matched.cachedInputPer1M,
    outputPer1M: matched.outputPer1M,
    reasoningPer1M: matched.reasoningPer1M,
    billingMode
  };
}

function fmtTokensK(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(2)}k`;
  return String(tokens);
}

function inferConventions(usage: TokenUsageInput): {
  cachedInputMode: CachedInputConvention;
  reasoningMode: TokenReasoningConvention;
} {
  const safeInput = Math.max(0, usage.inputTokens);
  const rawCached = Math.max(0, usage.cachedInputTokens);
  const safeOutput = Math.max(0, usage.outputTokens);
  const safeReasoning = Math.max(0, usage.reasoningOutputTokens);
  const total = Math.max(0, usage.totalTokens ?? 0);
  const defaultReasoning: TokenReasoningConvention =
    safeReasoning > 0 && (safeOutput === 0 || safeReasoning > safeOutput || SEPARATE_REASONING_PROVIDERS.has(usage.providerId.toLowerCase()))
      ? 'separate'
      : 'inclusive';

  if (usage.cachedInputMode && usage.reasoningMode) {
    return { cachedInputMode: usage.cachedInputMode, reasoningMode: usage.reasoningMode };
  }
  const fixedCached = usage.cachedInputMode ?? (rawCached > safeInput ? 'separate' : rawCached === 0 ? 'inclusive' : null);
  const fixedReasoning = usage.reasoningMode ?? (safeReasoning === 0 ? 'inclusive' : safeOutput === 0 || safeReasoning > safeOutput ? 'separate' : null);
  if ((fixedCached && fixedReasoning) || total <= 0) {
    return { cachedInputMode: fixedCached ?? 'inclusive', reasoningMode: fixedReasoning ?? defaultReasoning };
  }

  const cachedOpts: CachedInputConvention[] = fixedCached ? [fixedCached] : ['inclusive', 'separate'];
  const reasoningOpts: TokenReasoningConvention[] = fixedReasoning ? [fixedReasoning] : ['inclusive', 'separate'];
  let best = { cachedInputMode: cachedOpts[0], reasoningMode: reasoningOpts[0], diff: Infinity, penalty: Infinity };
  for (const cMode of cachedOpts) {
    for (const rMode of reasoningOpts) {
      const totalIn = cMode === 'separate' ? safeInput + rawCached : safeInput;
      const extraR = rMode === 'separate' ? safeReasoning : 0;
      const diff = Math.abs(totalIn + safeOutput + extraR - total);
      const penalty = (cMode === 'inclusive' ? 0 : 1) + (rMode === defaultReasoning ? 0 : 1);
      if (diff < best.diff || (diff === best.diff && penalty < best.penalty)) {
        best = { cachedInputMode: cMode, reasoningMode: rMode, diff, penalty };
      }
    }
  }
  return { cachedInputMode: best.cachedInputMode, reasoningMode: best.reasoningMode };
}

export function normalizeTokenUsage(usage: TokenUsageInput): NormalizedTokenUsage {
  const safeInput = Math.max(0, usage.inputTokens);
  const rawCached = Math.max(0, usage.cachedInputTokens);
  const safeOutput = Math.max(0, usage.outputTokens);
  const safeReasoning = Math.max(0, usage.reasoningOutputTokens);
  const { cachedInputMode, reasoningMode } = inferConventions(usage);

  const cachedInputTokens = cachedInputMode === 'separate' ? rawCached : Math.min(safeInput, rawCached);
  const uncachedInputTokens = cachedInputMode === 'separate' ? safeInput : Math.max(0, safeInput - cachedInputTokens);
  const totalInputTokens = uncachedInputTokens + cachedInputTokens;
  const extraReasoningTokens = reasoningMode === 'separate' ? safeReasoning : 0;
  const totalTokens =
    typeof usage.totalTokens === 'number' && Number.isFinite(usage.totalTokens) && usage.totalTokens > 0
      ? usage.totalTokens
      : totalInputTokens + safeOutput + extraReasoningTokens;

  return {
    inputTokens: totalInputTokens,
    uncachedInputTokens,
    cachedInputTokens,
    outputTokens: safeOutput,
    reasoningOutputTokens: safeReasoning,
    extraReasoningTokens,
    totalTokens,
    cachedInputMode,
    reasoningMode
  };
}

export function computeTurnCost(
  usage: TokenUsageInput,
  overrides: readonly ModelPricingRule[] = [],
  providerModeOverrides: ReadonlyMap<string, BillingMode> = new Map()
): CostBreakdown {
  const pricing = resolveModelPricing(usage.providerId, usage.model, overrides, providerModeOverrides);
  const normalized = normalizeTokenUsage(usage);

  const uncachedUsd = (normalized.uncachedInputTokens / 1_000_000) * pricing.inputPer1M;
  const cachedUsd = (normalized.cachedInputTokens / 1_000_000) * pricing.cachedInputPer1M;
  const outputUsd = (normalized.outputTokens / 1_000_000) * pricing.outputPer1M;
  const reasoningUsd = (normalized.extraReasoningTokens / 1_000_000) * pricing.reasoningPer1M;
  const estimatedCostUsd = Number((uncachedUsd + cachedUsd + outputUsd + reasoningUsd).toFixed(6));

  const formula =
    pricing.billingMode === 'free'
      ? `Local/free model (${pricing.pattern}): $0.00`
      : `(${fmtTokensK(normalized.uncachedInputTokens)} * $${pricing.inputPer1M}/1M) + ` +
        `(${fmtTokensK(normalized.cachedInputTokens)} * $${pricing.cachedInputPer1M}/1M) + ` +
        `(${fmtTokensK(normalized.outputTokens)} * $${pricing.outputPer1M}/1M)` +
        (normalized.extraReasoningTokens > 0
          ? ` + (${fmtTokensK(normalized.extraReasoningTokens)} reason * $${pricing.reasoningPer1M}/1M)`
          : '') +
        ` = $${estimatedCostUsd.toFixed(4)}`;

  return { estimatedCostUsd, formula, pricing, normalized };
}

export function listCombinedPricingRules(overrides: readonly ModelPricingRule[]): ModelPricingRule[] {
  const seen = new Set(overrides.map((rule) => rule.pattern.toLowerCase()));
  const defaults: ModelPricingRule[] = DEFAULT_MODEL_PRICING.filter(
    (rule) => !seen.has(rule.pattern.toLowerCase())
  ).map((rule) => ({ ...rule, isOverride: false }));
  return [...overrides.map((rule) => ({ ...rule, isOverride: true })), ...defaults];
}
