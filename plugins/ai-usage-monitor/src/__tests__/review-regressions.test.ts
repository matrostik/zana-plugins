import { describe, expect, it, vi } from 'vitest';
import createPlugin from '../../server.ts';
import { RPC_METHODS, type DashboardPayload } from '../shared/types.ts';
import { createBudgetEvaluator } from '../server/budgets.ts';
import { registerCli, type CliAndToolsApp } from '../server/cli-and-tools.ts';
import { createDashboardService } from '../server/dashboard.ts';
import { createUsageStore } from '../server/db.ts';
import { computeTurnCost } from '../server/pricing.ts';
import { createFakeHost } from './fake-host.ts';

const now = Date.UTC(2026, 10, 14, 12);

function seedTurn(store: ReturnType<typeof createUsageStore>, projectId = 'active') {
  const turn = {
    turnKey: 'thread:turn', threadId: 'thread', projectId, providerId: 'openai-api', model: 'gpt-4.1',
    timestampMs: now, billingMode: 'billed_api' as const, inputTokens: 100_000, cachedInputTokens: 0,
    outputTokens: 0, reasoningOutputTokens: 0, totalTokens: 100_000,
    contextUsedTokens: null, contextWindowTokens: null, estimatedCostUsd: 0.2,
    costFormula: 'original', isSubagent: false, rawJson: '{}'
  };
  store.upsertTurn(turn);
  return turn;
}

function budget(store: ReturnType<typeof createUsageStore>, name = 'cap') {
  return store.upsertBudget({ name, scopeType: 'global', period: 'daily', metric: 'tokens',
    limitValue: 10, alertThresholdPct: 80, enabled: true });
}

describe('PR review regressions', () => {
  it('never charges a free override with nonzero rates', () => {
    const result = computeTurnCost({ providerId: 'openai-api', model: 'gpt-4.1', inputTokens: 1_000_000,
      cachedInputTokens: 0, outputTokens: 100, reasoningOutputTokens: 0 },
    [{ pattern: '*', inputPer1M: 3, cachedInputPer1M: 1, outputPer1M: 4, reasoningPer1M: 4,
      billingMode: 'free', isOverride: true }]);
    expect(result.estimatedCostUsd).toBe(0);
    expect(result.pricing.inputPer1M).toBe(0);
  });

  it('does not let separate reasoning hide separately reported cached input', () => {
    const result = computeTurnCost({ providerId: 'antigravity', model: 'claude-sonnet-4',
      inputTokens: 100, cachedInputTokens: 20, outputTokens: 50, reasoningOutputTokens: 20, totalTokens: 190 });
    expect(result.formula).toContain('(100 * $3/1M)');
    expect(result.estimatedCostUsd).toBe(0.001356);
  });

  it('counts authentication failures and only selects known installed subscription quotas', async () => {
    const host = createFakeHost();
    const store = createUsageStore(host.db, () => now);
    const configs = [
      { id: 'auth', status: 'unauthenticated', mode: 'subscription', available: true, remaining: 50, windowStatus: 'allowed' },
      { id: 'expired', status: 'expired', mode: 'subscription', available: true, remaining: 60, windowStatus: 'allowed' },
      { id: 'missing', status: 'not_installed', mode: 'subscription', available: false, remaining: 1, windowStatus: 'allowed' },
      { id: 'credits', status: 'ok', mode: 'billed_api', available: true, remaining: 2, windowStatus: 'allowed' },
      { id: 'unknown', status: 'ok', mode: 'subscription', available: true, remaining: 3, windowStatus: 'unknown' }
    ] as const;
    for (const p of configs) store.upsertQuotaSnapshot({ providerId: p.id, displayName: p.id, status: p.status,
      accountLabel: null, planLabel: null, creditRemainingUsd: null, creditLimitUsd: null,
      creditUsedUsd: null, billedCostUsd: null, errorMessage: null,
      source: 'test', billingMode: p.mode, windows: [{ key: '5h', label: '5h', usedPercent: 100 - p.remaining,
        remainingPercent: p.remaining, status: p.windowStatus, resetsAtIso: null }], updatedAtMs: now });
    const service = createDashboardService({ store, budgets: { evaluateAll: () => [], checkAndNotify: async () => [] },
      projects: host.zcc.sdk.projects, getDiscoveredProviders: () => configs.map(p => ({ providerId: p.id,
        displayName: p.id, available: p.available, models: [] })), getCloudStatuses: () => [],
      getLastSyncedAtMs: () => now, now: () => now });
    const result = await service.buildDashboard();
    expect(result.kpis.alertCount).toBe(2);
    expect(result.kpis.tightestQuota?.providerId).toBe('auth');
  });

  it('skips unrelated projects and batches project lookup across alerts', async () => {
    const host = createFakeHost({ projects: [{ id: 'unrelated', name: 'unrelated' }] });
    const store = createUsageStore(host.db, () => now);
    seedTurn(store, 'deleted');
    budget(store, 'one');
    budget(store, 'two');
    const list = vi.fn(host.zcc.sdk.projects.list);
    const evaluator = createBudgetEvaluator({ store, projects: { list }, inbox: host.zcc.sdk.inbox,
      areAlertsEnabled: async () => true, log: host.zcc.log, now: () => now });
    await evaluator.checkAndNotify();
    expect(host.inbox).toEqual([]);
    expect(list).toHaveBeenCalledTimes(1);
    expect(host.logs.some(l => l.message.includes('no target project'))).toBe(true);
  });

  it('rejects invalid budget limits and warning thresholds at the store boundary', () => {
    const host = createFakeHost();
    const store = createUsageStore(host.db);
    const input = { name: 'invalid', scopeType: 'global' as const, period: 'daily' as const,
      metric: 'tokens' as const, limitValue: 1, alertThresholdPct: 80, enabled: true };
    for (const limitValue of [0, -1, NaN, Infinity]) {
      expect(() => store.upsertBudget({ ...input, limitValue })).toThrow(/limitValue/);
    }
    for (const alertThresholdPct of [0, -1, NaN, Infinity, 101]) {
      expect(() => store.upsertBudget({ ...input, alertThresholdPct })).toThrow(/alertThresholdPct/);
    }
  });

  it('updates historical spend immediately when pricing overrides are saved and deleted', async () => {
    const host = createFakeHost();
    await createPlugin(host.zcc, { now: () => now, skipInitialSync: true, homeDir: null });
    const store = createUsageStore(host.db, () => now);
    seedTurn(store);
    await host.callRpc(RPC_METHODS.setPricingOverride, { pattern: 'gpt-4.1', inputPer1M: 10,
      cachedInputPer1M: 0, outputPer1M: 0, reasoningPer1M: 0, billingMode: 'subscription' });
    const changed = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
    expect(changed.models[0]).toMatchObject({ estimatedCostUsd: 1, billingMode: 'subscription', inputRatePer1M: 10 });
    expect(changed.kpis.subscriptionEquivUsd).toBe(1);
    await host.callRpc(RPC_METHODS.deletePricingOverride, { pattern: 'gpt-4.1' });
    const restored = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
    expect(restored.models[0]).toMatchObject({ estimatedCostUsd: 0.2, billingMode: 'billed_api', inputRatePer1M: 2 });
    await host.dispose();
  });

  it('supports flag-only summary commands and returns CLI errors for async failures', async () => {
    const host = createFakeHost();
    const buildDashboard = vi.fn().mockResolvedValue({ kpis: {}, models: [] });
    const refreshNow = vi.fn().mockResolvedValue(undefined);
    const app = { dashboard: { buildDashboard }, refreshNow } as unknown as CliAndToolsApp;
    registerCli(host.zcc.cli, app);
    expect((await host.runCli(['--range', '7d', '--refresh'])).exitCode).toBe(0);
    expect(buildDashboard).toHaveBeenCalledWith('7d');
    refreshNow.mockRejectedValueOnce(new Error('refresh unavailable'));
    await expect(host.runCli(['--refresh'])).resolves.toMatchObject({ exitCode: 1, stderr: expect.stringContaining('refresh unavailable') });
    buildDashboard.mockRejectedValueOnce(new Error('dashboard unavailable'));
    await expect(host.runCli(['summary'])).resolves.toMatchObject({ exitCode: 1, stderr: expect.stringContaining('dashboard unavailable') });
  });

  it('reprices stored rows when subscription provider settings change without reindexing', async () => {
    const host = createFakeHost();
    await createPlugin(host.zcc, { now: () => now, skipInitialSync: true, homeDir: null });
    const store = createUsageStore(host.db, () => now);
    seedTurn(store);
    host.updateSettings({ subscriptionProviders: 'openai-api' });
    await vi.waitFor(async () => {
      const result = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
      expect(result.kpis.subscriptionEquivUsd).toBe(0.2);
      expect(result.models[0].billingMode).toBe('subscription');
    });
    await host.dispose();
  });

  it('bounds project lookup time and leaves skipped alerts retryable', async () => {
    vi.useFakeTimers();
    try {
      const host = createFakeHost();
      const store = createUsageStore(host.db, () => now);
      seedTurn(store);
      const rule = budget(store);
      const evaluator = createBudgetEvaluator({ store, projects: { list: () => new Promise(() => {}) },
        inbox: host.zcc.sdk.inbox, areAlertsEnabled: async () => true, log: host.zcc.log, now: () => now });
      const pending = evaluator.checkAndNotify();
      await vi.advanceTimersByTimeAsync(3001);
      await pending;
      expect(host.logs.some(l => l.message.includes('timed out'))).toBe(true);
      expect(store.hasAlertBeenSent(rule.id, 'd:2026-11-14', 'exceeded')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reprices every page and keeps turn logs in sync with stored costs', () => {
    const host = createFakeHost();
    const store = createUsageStore(host.db, () => now);
    const turn = seedTurn(store);
    for (let i = 0; i < 205; i++) store.upsertTurn({ ...turn, turnKey: `batch:${i}` });
    store.upsertLogEvent({ eventKey: 'turn_usage:thread:turn', timestampMs: now, kind: 'turn_usage', severity: 'info',
      providerId: turn.providerId, model: turn.model, projectId: turn.projectId, threadId: turn.threadId,
      summary: 'usage', costUsd: 0.2, costFormula: 'original', payloadJson: '{}' });
    store.upsertPricingOverride({ pattern: 'gpt-4.1', inputPer1M: 10, cachedInputPer1M: 0,
      outputPer1M: 0, reasoningPer1M: 0, billingMode: null });
    store.repriceTurns(new Map([['openai-api', 'subscription']]));
    expect(store.aggregateSummary(0)).toMatchObject({ turnCount: 206, subscriptionEquivUsd: 206, billedSpendUsd: 0 });
    expect(store.listModelBreakdown(0, store.listPricingOverrides(), null, new Map([['openai-api', 'subscription']]))[0])
      .toMatchObject({ estimatedCostUsd: 206, inputRatePer1M: 10, billingMode: 'subscription' });
    expect(store.queryLogs({}, new Map()).items[0]).toMatchObject({ costUsd: 1, costFormula: expect.stringContaining('$1.0000') });
  });

  it('preserves whether the indexed turn had an explicit total when repricing', () => {
    const host = createFakeHost();
    const store = createUsageStore(host.db, () => now);
    const base = seedTurn(store);
    const usage = { providerId: 'antigravity', model: 'claude-sonnet-4', inputTokens: 100_000,
      cachedInputTokens: 20_000, outputTokens: 50_000, reasoningOutputTokens: 20_000 };
    const original = computeTurnCost(usage);
    const turn = { ...base, ...usage, turnKey: 'synthetic:total', totalTokens: 150_000,
      hasExplicitTotal: false, estimatedCostUsd: original.estimatedCostUsd, costFormula: original.formula,
      rawJson: JSON.stringify({ tokenUsage: { last: usage, total: { totalTokens: 1_000_000 } } }) };
    store.upsertTurn(turn);
    store.repriceTurns(new Map());
    expect(store.listModelBreakdown(0, []).find(row => row.model === usage.model)?.estimatedCostUsd)
      .toBeCloseTo(original.estimatedCostUsd, 4);
  });
});
