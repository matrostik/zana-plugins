import { DEFAULT_SUBSCRIPTION_PROVIDERS, type BillingMode, type ModelPricingRule } from '../shared/types.ts';

export interface TokenUsageInput {
  providerId: string;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens?: number;
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

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .trim()
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
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

  if (billingMode === 'free' && !overrides.some((rule) => matchesPattern(rule.pattern, providerId, model))) {
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

function splitInputAndCached(usage: TokenUsageInput): { uncachedInput: number; safeCached: number; safeOutput: number } {
  const safeInput = Math.max(0, usage.inputTokens);
  const rawCached = Math.max(0, usage.cachedInputTokens);
  const safeOutput = Math.max(0, usage.outputTokens);
  const safeReasoning = Math.max(0, usage.reasoningOutputTokens);
  const total = Math.max(0, usage.totalTokens ?? 0);

  const inclusiveDiff = Math.min(
    Math.abs(safeInput + safeOutput - total),
    Math.abs(safeInput + safeOutput + safeReasoning - total)
  );
  const separateDiff = Math.min(
    Math.abs(safeInput + rawCached + safeOutput - total),
    Math.abs(safeInput + rawCached + safeOutput + safeReasoning - total)
  );
  const separateLooksCloser = total > 0 && rawCached > 0 && separateDiff < inclusiveDiff;

  if (rawCached > safeInput || separateLooksCloser) {
    return { uncachedInput: safeInput, safeCached: rawCached, safeOutput };
  }
  const safeCached = Math.min(safeInput, rawCached);
  return { uncachedInput: Math.max(0, safeInput - safeCached), safeCached, safeOutput };
}

function resolveExtraReasoningTokens(
  usage: TokenUsageInput,
  uncachedInput: number,
  safeCached: number,
  safeOutput: number
): number {
  const safeReasoning = Math.max(0, usage.reasoningOutputTokens);
  if (safeReasoning === 0) return 0;
  if (safeOutput === 0 || safeReasoning > safeOutput) return safeReasoning;

  const total = Math.max(0, usage.totalTokens ?? 0);
  if (total > 0) {
    const baseTotal = uncachedInput + safeCached + safeOutput;
    const withReasoningDiff = Math.abs(baseTotal + safeReasoning - total);
    const withoutReasoningDiff = Math.abs(baseTotal - total);
    if (withReasoningDiff < withoutReasoningDiff) return safeReasoning;
    if (withoutReasoningDiff < withReasoningDiff) return 0;
  }

  return SEPARATE_REASONING_PROVIDERS.has(usage.providerId.toLowerCase()) ? safeReasoning : 0;
}

export function computeTurnCost(
  usage: TokenUsageInput,
  overrides: readonly ModelPricingRule[] = [],
  providerModeOverrides: ReadonlyMap<string, BillingMode> = new Map()
): CostBreakdown {
  const pricing = resolveModelPricing(usage.providerId, usage.model, overrides, providerModeOverrides);
  const { uncachedInput, safeCached, safeOutput } = splitInputAndCached(usage);
  const extraReasoning = resolveExtraReasoningTokens(usage, uncachedInput, safeCached, safeOutput);

  const uncachedUsd = (uncachedInput / 1_000_000) * pricing.inputPer1M;
  const cachedUsd = (safeCached / 1_000_000) * pricing.cachedInputPer1M;
  const outputUsd = (safeOutput / 1_000_000) * pricing.outputPer1M;
  const reasoningUsd = (extraReasoning / 1_000_000) * pricing.reasoningPer1M;
  const estimatedCostUsd = Number((uncachedUsd + cachedUsd + outputUsd + reasoningUsd).toFixed(6));

  const formula =
    pricing.billingMode === 'free'
      ? `Local/free model (${pricing.pattern}): $0.00`
      : `(${fmtTokensK(uncachedInput)} * $${pricing.inputPer1M}/1M) + ` +
        `(${fmtTokensK(safeCached)} * $${pricing.cachedInputPer1M}/1M) + ` +
        `(${fmtTokensK(safeOutput)} * $${pricing.outputPer1M}/1M)` +
        (extraReasoning > 0 ? ` + (${fmtTokensK(extraReasoning)} reason * $${pricing.reasoningPer1M}/1M)` : '') +
        ` = $${estimatedCostUsd.toFixed(4)}`;

  return { estimatedCostUsd, formula, pricing };
}

export function listCombinedPricingRules(overrides: readonly ModelPricingRule[]): ModelPricingRule[] {
  const seen = new Set(overrides.map((rule) => rule.pattern.toLowerCase()));
  const defaults: ModelPricingRule[] = DEFAULT_MODEL_PRICING.filter(
    (rule) => !seen.has(rule.pattern.toLowerCase())
  ).map((rule) => ({ ...rule, isOverride: false }));
  return [...overrides.map((rule) => ({ ...rule, isOverride: true })), ...defaults];
}
