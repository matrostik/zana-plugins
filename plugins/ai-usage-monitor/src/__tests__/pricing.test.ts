import { describe, expect, it } from 'vitest';
import type { ModelPricingRule } from '../shared/types.ts';
import {
  computeTurnCost,
  inferDefaultBillingMode,
  listCombinedPricingRules,
  resolveModelPricing
} from '../server/pricing.ts';

describe('pricing engine', () => {
  it('infers subscription, free local, and billed API billing modes accurately', () => {
    expect(inferDefaultBillingMode('claude-code', 'claude-sonnet-4-5')).toBe('subscription');
    expect(inferDefaultBillingMode('codex', 'gpt-5-codex')).toBe('subscription');
    expect(inferDefaultBillingMode('cursor', 'cursor-small')).toBe('subscription');
    expect(inferDefaultBillingMode('acp-cursor', 'default')).toBe('subscription');
    expect(inferDefaultBillingMode('antigravity', 'gemini-2.5-pro')).toBe('subscription');
    expect(inferDefaultBillingMode('local', 'llama3.3:70b')).toBe('free');
    expect(inferDefaultBillingMode('local-models', 'qwen3')).toBe('free');
    expect(inferDefaultBillingMode('ollama', 'qwen2.5-coder:32b')).toBe('free');
    expect(inferDefaultBillingMode('openrouter', 'anthropic/claude-sonnet-4')).toBe('billed_api');
    expect(inferDefaultBillingMode('openrouter', 'qwen/qwen-2.5-coder-32b')).toBe('billed_api');
    expect(inferDefaultBillingMode('openrouter', 'meta-llama/llama-3.3-70b')).toBe('billed_api');
    expect(inferDefaultBillingMode('openrouter', 'qwen/qwen3-coder:free')).toBe('free');
    expect(inferDefaultBillingMode('openai-api', 'gpt-4.1')).toBe('billed_api');

    const customOverrides = new Map([['custom-sub', 'subscription' as const]]);
    expect(resolveModelPricing('custom-sub', 'gpt-4o', [], customOverrides).billingMode).toBe('subscription');
    expect(resolveModelPricing('acp-opencode', 'opencode/glm-5.3-flash-free', []).billingMode).toBe('free');
  });

  it('retains paid billing and non-zero estimated cost for hosted Qwen and Llama models', () => {
    const hostedQwen = computeTurnCost(
      {
        providerId: 'openrouter',
        model: 'qwen-2.5-coder',
        inputTokens: 1_000_000,
        cachedInputTokens: 0,
        outputTokens: 1_000_000,
        reasoningOutputTokens: 0
      },
      []
    );
    expect(hostedQwen.pricing.billingMode).toBe('billed_api');
    expect(hostedQwen.estimatedCostUsd).toBeGreaterThan(0);

    const hostedLlama = computeTurnCost(
      {
        providerId: 'openrouter',
        model: 'llama-3.3-70b',
        inputTokens: 1_000_000,
        cachedInputTokens: 0,
        outputTokens: 1_000_000,
        reasoningOutputTokens: 0
      },
      []
    );
    expect(hostedLlama.pricing.billingMode).toBe('billed_api');
    expect(hostedLlama.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('matches catalog patterns with wildcards and honors custom overrides first', () => {
    const opus = resolveModelPricing('anthropic-api', 'claude-opus-4-1-20250805', []);
    expect(opus.inputPer1M).toBe(15);
    expect(opus.outputPer1M).toBe(75);
    expect(opus.billingMode).toBe('billed_api');

    const overrides: ModelPricingRule[] = [
      {
        pattern: 'claude-opus-4*',
        inputPer1M: 10,
        cachedInputPer1M: 1,
        outputPer1M: 50,
        reasoningPer1M: 50,
        billingMode: 'billed_api',
        isOverride: true
      }
    ];
    const overridden = resolveModelPricing('anthropic-api', 'claude-opus-4-1-20250805', overrides);
    expect(overridden.inputPer1M).toBe(10);
    expect(overridden.outputPer1M).toBe(50);

    const combined = listCombinedPricingRules(overrides);
    expect(combined[0]).toMatchObject({ pattern: 'claude-opus-4*', isOverride: true });
    expect(combined.some((r) => !r.isOverride)).toBe(true);
  });

  it('computes turn cost subtracting cached tokens from total input tokens and handles separate uncached+cached conventions', () => {
    // Inclusive convention (Codex-style): inputTokens includes cachedInputTokens
    const inclusive = computeTurnCost(
      {
        providerId: 'anthropic-api',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1_000_000,
        cachedInputTokens: 800_000, // 200k uncached = $0.60, 800k cached = $0.24
        outputTokens: 100_000, // $1.50
        reasoningOutputTokens: 0
      },
      []
    );
    expect(inclusive.estimatedCostUsd).toBeCloseTo(2.34, 4);
    expect(inclusive.formula).toContain('200.00k * $3/1M');
    expect(inclusive.formula).toContain('800.00k * $0.3/1M');
    expect(inclusive.formula).toContain('$2.3400');

    // Separate convention (Anthropic/Antigravity/OpenCode-style): cachedInputTokens > inputTokens
    const separate = computeTurnCost(
      {
        providerId: 'antigravity',
        model: 'claude-sonnet-4',
        inputTokens: 100_000,
        cachedInputTokens: 2_000_000,
        outputTokens: 50_000,
        reasoningOutputTokens: 0,
        totalTokens: 2_150_000
      },
      []
    );
    // 100k uncached ($0.30) + 2M cached ($0.60) + 50k out ($0.75) = $1.65
    expect(separate.estimatedCostUsd).toBeCloseTo(1.65, 4);
  });

  it('charges separately reported reasoning tokens even when outputTokens is nonzero without double-charging inclusive reasoning', () => {
    // Separate reasoning verified by explicit totalTokens (antigravity/opencode/anthropic convention)
    const separateWithTotal = computeTurnCost(
      {
        providerId: 'antigravity',
        model: 'claude-sonnet-4',
        inputTokens: 100_000,
        cachedInputTokens: 0,
        outputTokens: 50_000,
        reasoningOutputTokens: 100_000,
        totalTokens: 250_000
      },
      []
    );
    // 100k in ($0.30) + 50k out ($0.75) + 100k reason ($1.50) = $2.55
    expect(separateWithTotal.estimatedCostUsd).toBeCloseTo(2.55, 4);
    expect(separateWithTotal.formula).toContain('reason');

    // Separate reasoning without explicit totalTokens for a separate-reasoning provider
    const separateByProvider = computeTurnCost(
      {
        providerId: 'anthropic-api',
        model: 'claude-sonnet-4',
        inputTokens: 100_000,
        cachedInputTokens: 0,
        outputTokens: 80_000,
        reasoningOutputTokens: 40_000
      },
      []
    );
    // 100k in ($0.30) + 80k out ($1.20) + 40k reason ($0.60) = $2.10
    expect(separateByProvider.estimatedCostUsd).toBeCloseTo(2.1, 4);

    // Inclusive reasoning (OpenAI/Codex style: totalTokens == input + output) must NOT double-charge reasoning
    const inclusiveReasoning = computeTurnCost(
      {
        providerId: 'openai-api',
        model: 'o3',
        inputTokens: 100_000,
        cachedInputTokens: 0,
        outputTokens: 80_000,
        reasoningOutputTokens: 50_000,
        totalTokens: 180_000
      },
      []
    );
    // o3: 100k * $2/1M ($0.20) + 80k * $8/1M ($0.64) = $0.84
    expect(inclusiveReasoning.estimatedCostUsd).toBeCloseTo(0.84, 4);
  });

  it('forces zero USD spend when model or provider resolves to free billing mode', () => {
    const result = computeTurnCost(
      {
        providerId: 'ollama',
        model: 'llama3:latest',
        inputTokens: 50_000,
        cachedInputTokens: 0,
        outputTokens: 10_000,
        reasoningOutputTokens: 0
      },
      []
    );
    expect(result.pricing.billingMode).toBe('free');
    expect(result.estimatedCostUsd).toBe(0);
    expect(result.formula).toContain('$0.00');
  });
});
