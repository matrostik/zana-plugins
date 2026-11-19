import { describe, expect, it } from 'vitest';
import { estimateModelCostRank, sortModelsCheapestFirst } from '../shared/modelSorting.ts';

describe('modelSorting', () => {
  it('orders OpenAI/Codex models from cheapest to most expensive', () => {
    const models = [
      { id: 'gpt-5.4-pro', label: 'GPT-5.4 Pro' },
      { id: 'gpt-5.4', label: 'GPT-5.4' },
      { id: 'gpt-5.1-codex-max', label: 'GPT-5.1 Codex Max' },
      { id: 'gpt-5.3-codex', label: 'GPT-5.3 Codex' },
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
      { id: 'gpt-5.3-codex-spark', label: 'GPT-5.3 Codex Spark' },
      { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' }
    ];

    expect(sortModelsCheapestFirst(models).map((m) => m.id)).toEqual([
      'gpt-5.4-nano',
      'gpt-5.4-mini',
      'gpt-5.3-codex-spark',
      'gpt-5.4',
      'gpt-5.3-codex',
      'gpt-5.1-codex-max',
      'gpt-5.4-pro'
    ]);
  });

  it('orders Anthropic Claude models Haiku -> Sonnet -> Opus', () => {
    const models = [
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' }
    ];

    expect(sortModelsCheapestFirst(models).map((m) => m.id)).toEqual([
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-6',
      'claude-opus-4-6'
    ]);
  });

  it('orders Google Gemini models Flash Lite -> Flash -> Pro', () => {
    const models = [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' }
    ];

    expect(sortModelsCheapestFirst(models).map((m) => m.id)).toEqual([
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro'
    ]);
  });

  it('places free and local models before paid tiers and breaks ties alphabetically', () => {
    const models = [
      { id: 'z-custom', label: 'Zed Model B' },
      { id: 'a-custom', label: 'Zed Model A' },
      { id: 'meta-llama/llama-3.3-70b:free', label: 'Llama 3.3 70B (free)' },
      { id: 'o3', label: 'o3' },
      { id: 'o3-mini', label: 'o3-mini' }
    ];

    expect(sortModelsCheapestFirst(models).map((m) => m.id)).toEqual([
      'meta-llama/llama-3.3-70b:free',
      'o3-mini',
      'a-custom',
      'z-custom',
      'o3'
    ]);
    expect(estimateModelCostRank({ id: 'gpt-4o-mini' })).toBeLessThan(estimateModelCostRank({ id: 'gpt-4o' }));
  });
});
