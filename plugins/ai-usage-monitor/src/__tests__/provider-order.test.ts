import { describe, expect, it } from 'vitest';
import {
  mergeCustomOrder,
  moveProviderWithinVisible,
  normalizeProviderOrderPrefs,
  reorderProviderToTarget,
  sortProviders
} from '../shared/provider-order.ts';
import type { ProviderQuotaSnapshot } from '../shared/types.ts';

function makeProvider(overrides: Partial<ProviderQuotaSnapshot> & { providerId: string }): ProviderQuotaSnapshot {
  return {
    displayName: overrides.providerId,
    available: true,
    source: 'telemetry',
    status: 'ok',
    accountLabel: null,
    planLabel: null,
    billingMode: 'subscription',
    windows: [],
    creditRemainingUsd: null,
    creditLimitUsd: null,
    creditUsedUsd: null,
    errorMessage: null,
    configuredModels: [],
    totalTokens: 0,
    cachedTokens: 0,
    turnCount: 0,
    estimatedCostUsd: 0,
    billedCostUsd: null,
    updatedAtMs: 0,
    ...overrides
  };
}

describe('provider ordering helpers', () => {
  it('sorts by usage (totalTokens desc, turnCount desc, displayName asc)', () => {
    const providers = [
      makeProvider({ providerId: 'antigravity', displayName: 'Antigravity', totalTokens: 0, turnCount: 0 }),
      makeProvider({ providerId: 'zeta', displayName: 'Zeta', totalTokens: 50_000, turnCount: 2 }),
      makeProvider({ providerId: 'alpha', displayName: 'Alpha', totalTokens: 50_000, turnCount: 5 }),
      makeProvider({ providerId: 'codex', displayName: 'Codex', totalTokens: 200_000, turnCount: 10 }),
      makeProvider({ providerId: 'beta', displayName: 'Beta', totalTokens: 0, turnCount: 0 })
    ];

    const sorted = sortProviders(providers, { sortMode: 'usage', customOrder: [] });
    expect(sorted.map((p) => p.providerId)).toEqual(['codex', 'alpha', 'zeta', 'antigravity', 'beta']);
  });

  it('sorts by tightest quota (highest usedPercent, then severity, then usage)', () => {
    const providers = [
      makeProvider({
        providerId: 'codex',
        displayName: 'Codex',
        totalTokens: 300_000,
        windows: [{ key: '5h', label: '5h', usedPercent: 25, remainingPercent: 75, status: 'allowed', resetsAtIso: null }]
      }),
      makeProvider({
        providerId: 'claude',
        displayName: 'Claude',
        totalTokens: 100_000,
        status: 'warning',
        windows: [{ key: '5h', label: '5h', usedPercent: 85, remainingPercent: 15, status: 'warning', resetsAtIso: null }]
      }),
      makeProvider({
        providerId: 'openrouter',
        displayName: 'OpenRouter',
        totalTokens: 500_000,
        windows: []
      }),
      makeProvider({
        providerId: 'cursor',
        displayName: 'Cursor',
        totalTokens: 10_000,
        status: 'blocked',
        windows: [{ key: 'm', label: 'Monthly', usedPercent: 100, remainingPercent: 0, status: 'blocked', resetsAtIso: null }]
      })
    ];

    const sorted = sortProviders(providers, { sortMode: 'quota', customOrder: [] });
    expect(sorted.map((p) => p.providerId)).toEqual(['cursor', 'claude', 'codex', 'openrouter']);
  });

  it('applies custom order and appends unseen providers sorted by usage', () => {
    const providers = [
      makeProvider({ providerId: 'a', displayName: 'A', totalTokens: 10 }),
      makeProvider({ providerId: 'b', displayName: 'B', totalTokens: 500 }),
      makeProvider({ providerId: 'c', displayName: 'C', totalTokens: 1_000 }),
      makeProvider({ providerId: 'd', displayName: 'D', totalTokens: 200 })
    ];

    const sorted = sortProviders(providers, { sortMode: 'custom', customOrder: ['a', 'd'] });
    expect(sorted.map((p) => p.providerId)).toEqual(['a', 'd', 'c', 'b']);
  });

  it('moves providers within visible slots and preserves hidden IDs', () => {
    const custom = ['hidden-1', 'codex', 'hidden-2', 'claude', 'openrouter'];
    const moved = moveProviderWithinVisible(custom, ['codex', 'claude', 'openrouter'], 'codex', 1);
    expect(moved).toEqual(['hidden-1', 'claude', 'hidden-2', 'codex', 'openrouter']);

    const dragged = reorderProviderToTarget(moved, ['codex', 'claude', 'openrouter'], 'openrouter', 'claude');
    expect(dragged).toEqual(['hidden-1', 'openrouter', 'claude', 'hidden-2', 'codex']);
  });

  it('normalizes invalid preferences safely and merges custom orders without duplicates', () => {
    expect(normalizeProviderOrderPrefs(null)).toEqual({ sortMode: 'usage', customOrder: [] });
    expect(normalizeProviderOrderPrefs({ sortMode: 'bogus', customOrder: [' a ', '', 'a', 42, 'b'] })).toEqual({
      sortMode: 'usage',
      customOrder: ['a', 'b']
    });
    expect(mergeCustomOrder(['c', 'a'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b']);
  });
});
