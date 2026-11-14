import { describe, expect, it, vi } from 'vitest';
import createPlugin from '../../server.ts';
import { RPC_METHODS, type DashboardPayload, type LogsResponse } from '../shared/types.ts';
import { createBudgetEvaluator } from '../server/budgets.ts';
import { registerCli, type CliAndToolsApp } from '../server/cli-and-tools.ts';
import { createDashboardService } from '../server/dashboard.ts';
import { createUsageStore } from '../server/db.ts';
import { computeTurnCost, normalizeTokenUsage } from '../server/pricing.ts';
import { computeCacheHitPercent, resolveTimeRangeBounds } from '../server/util.ts';
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
    expect(result.normalized).toMatchObject({ inputTokens: 120, uncachedInputTokens: 100, cachedInputTokens: 20,
      cachedInputMode: 'separate', reasoningMode: 'separate' });
  });

  it('supports explicit cachedInputMode and reasoningMode overrides and normalizes cache hit across providers', async () => {
    const explicit = normalizeTokenUsage({ providerId: 'openai-api', model: 'gpt-4.1',
      inputTokens: 100, cachedInputTokens: 20, outputTokens: 50, reasoningOutputTokens: 20,
      cachedInputMode: 'separate', reasoningMode: 'inclusive' });
    expect(explicit).toMatchObject({ inputTokens: 120, uncachedInputTokens: 100, cachedInputTokens: 20,
      extraReasoningTokens: 0, cachedInputMode: 'separate', reasoningMode: 'inclusive' });
    expect(computeCacheHitPercent(100, 20, 'separate')).toBe(16.7);
    expect(computeCacheHitPercent(120, 20, 'inclusive')).toBe(16.7);

    const host = createFakeHost({
      providers: [{ id: 'antigravity', available: true }, { id: 'openai-api', available: true }],
      threads: [
        {
          id: 'th-sep', projectId: 'p1', hostId: 'h1', environmentId: null, providerId: 'antigravity',
          status: 'idle', updatedAt: now - 1000, defaultModel: 'claude-sonnet-4',
          events: [{ seq: 1, type: 'thread/tokenUsage/updated', payload: {
            createdAt: now - 1000,
            tokenUsage: {
              total: { inputTokens: 100_000, cachedInputTokens: 200_000, outputTokens: 50_000, reasoningOutputTokens: 20_000, totalTokens: 370_000 },
              last: { inputTokens: 100_000, cachedInputTokens: 200_000, outputTokens: 50_000, reasoningOutputTokens: 20_000, totalTokens: 370_000 }
            }
          } }]
        },
        {
          id: 'th-inc', projectId: 'p1', hostId: 'h1', environmentId: null, providerId: 'openai-api',
          status: 'idle', updatedAt: now - 500, defaultModel: 'gpt-4.1',
          events: [{ seq: 1, type: 'thread/tokenUsage/updated', payload: {
            createdAt: now - 500,
            tokenUsage: {
              total: { inputTokens: 100_000, cachedInputTokens: 50_000, outputTokens: 10_000, totalTokens: 110_000 },
              last: { inputTokens: 100_000, cachedInputTokens: 50_000, outputTokens: 10_000, totalTokens: 110_000 }
            }
          } }]
        }
      ]
    });
    await createPlugin(host.zcc, { now: () => now, skipInitialSync: true, homeDir: null });
    await host.callRpc(RPC_METHODS.refreshNow);
    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
    // Separate antigravity turn is normalized to 300k inclusive input (100k uncached + 200k cached -> 66.7% hit)
    const antigravityModel = dash.models.find((m) => m.providerId === 'antigravity');
    expect(antigravityModel).toMatchObject({ inputTokens: 300_000, cachedInputTokens: 200_000, cacheHitPercent: 66.7 });
    // Overall cache hit across 300k + 100k = 400k input, 250k cached = 62.5% (never >100%)
    expect(dash.kpis.inputTokens).toBe(400_000);
    expect(dash.kpis.cacheHitPercent).toBe(62.5);
    await host.dispose();
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

  it('skips unrelated projects and batches project lookup across alerts, including empty project_id on scoped turns', async () => {
    const host = createFakeHost({ projects: [{ id: 'unrelated', name: 'unrelated' }] });
    const store = createUsageStore(host.db, () => now);
    const base = seedTurn(store, 'deleted');
    // Unrelated project has turns under a different provider, while scoped openai-api turn has projectId=''
    store.upsertTurn({ ...base, projectId: 'unrelated', turnKey: 'other:1', providerId: 'anthropic-api' });
    store.upsertTurn({ ...base, projectId: '', turnKey: 'unassigned:1', providerId: 'openai-api' });
    expect(store.findTopProjectInWindow({ sinceMs: 0, scopeType: 'provider', scopeId: 'openai-api', metric: 'tokens' })).toBe('deleted');
    store.upsertBudget({ name: 'Scoped Cap', scopeType: 'provider', scopeId: 'openai-api', period: 'daily',
      metric: 'tokens', limitValue: 10, alertThresholdPct: 80, enabled: true });
    budget(store, 'one');
    budget(store, 'two');
    const list = vi.fn(host.zcc.sdk.projects.list);
    const evaluator = createBudgetEvaluator({ store, projects: { list }, inbox: host.zcc.sdk.inbox,
      areAlertsEnabled: async () => true, log: host.zcc.log, now: () => now });
    await evaluator.checkAndNotify();
    expect(host.inbox).toEqual([]);
    expect(list).toHaveBeenCalledTimes(1);
    expect(host.logs.some(l => l.message.includes('no target project'))).toBe(true);

    // Pure unassigned turns on scoped provider must NOT fall back to unrelated project
    const host2 = createFakeHost({ projects: [{ id: 'unrelated', name: 'unrelated' }] });
    const store2 = createUsageStore(host2.db, () => now);
    store2.upsertTurn({ ...base, projectId: 'unrelated', turnKey: 'other:1', providerId: 'anthropic-api' });
    store2.upsertTurn({ ...base, projectId: '', turnKey: 'unassigned:1', providerId: 'openai-api' });
    expect(store2.findTopProjectInWindow({ sinceMs: 0, scopeType: 'provider', scopeId: 'openai-api', metric: 'tokens' })).toBeNull();
  });

  it('rejects invalid budget limits, warning thresholds, and missing non-global scopeId at store and RPC boundaries', async () => {
    const host = createFakeHost();
    await createPlugin(host.zcc, { now: () => now, skipInitialSync: true, homeDir: null });
    const store = createUsageStore(host.db);
    const input = { name: 'invalid', scopeType: 'global' as const, period: 'daily' as const,
      metric: 'tokens' as const, limitValue: 1, alertThresholdPct: 80, enabled: true };
    for (const limitValue of [0, -1, NaN, Infinity]) {
      expect(() => store.upsertBudget({ ...input, limitValue })).toThrow(/limitValue/);
    }
    for (const alertThresholdPct of [0, -1, NaN, Infinity, 101]) {
      expect(() => store.upsertBudget({ ...input, alertThresholdPct })).toThrow(/alertThresholdPct/);
    }
    for (const scopeType of ['provider', 'model', 'project'] as const) {
      expect(() => store.upsertBudget({ ...input, scopeType, scopeId: '   ' })).toThrow(/scopeId/);
      await expect(host.callRpc(RPC_METHODS.setBudget, { ...input, scopeType, scopeId: '' })).rejects.toThrow(/scopeId/);
    }
    await host.dispose();
  });

  it('uses clean en-dash without replacement char in last_week range label', () => {
    const bounds = resolveTimeRangeBounds('last_week', now, 'UTC');
    expect(bounds.label).toBe('Last calendar week (Mon\u2013Sun)');
    expect(bounds.label).not.toContain('\uFFFD');
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

  it('indexes all middle events across >500 initial and >200 incremental thread events and calls providers.list once', async () => {
    const events = Array.from({ length: 650 }, (_, idx) => ({
      seq: idx + 1,
      type: 'thread/tokenUsage/updated',
      payload: {
        scope: { turnId: `turn-${idx + 1}` },
        createdAt: now - 10_000 + idx,
        tokenUsage: {
          last: { inputTokens: 1000, cachedInputTokens: 0, outputTokens: 100, totalTokens: 1100 }
        }
      }
    }));
    const host = createFakeHost({
      providers: [{ id: 'openai-api', available: true }],
      threads: [{
        id: 'th-large', projectId: 'p1', hostId: 'h1', environmentId: null,
        providerId: 'openai-api', status: 'idle', updatedAt: now - 100, defaultModel: 'gpt-4.1', events
      }]
    });
    const listProvidersSpy = vi.spyOn(host.zcc.sdk.providers, 'list');
    await createPlugin(host.zcc, { now: () => now, skipInitialSync: true, homeDir: null });
    await host.callRpc(RPC_METHODS.refreshNow);

    // Initial sync must hit ZCC quotas/providers once (no duplicate pre-sync pass)
    expect(listProvidersSpy).toHaveBeenCalledTimes(1);
    const firstDash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
    expect(firstDash.kpis.turnCount).toBe(650);

    // Append 260 more events (> INITIAL_INCREMENTAL_EVENTS_LIMIT of 200) and verify none in the middle are skipped
    const thread = host.threads.get('th-large')!;
    for (let seq = 651; seq <= 910; seq++) {
      thread.events.push({
        seq,
        type: 'thread/tokenUsage/updated',
        payload: {
          scope: { turnId: `turn-${seq}` },
          createdAt: now + seq,
          tokenUsage: {
            last: { inputTokens: 1000, cachedInputTokens: 0, outputTokens: 100, totalTokens: 1100 }
          }
        }
      });
    }
    thread.updatedAt = now + 1000;
    await host.callRpc(RPC_METHODS.refreshNow);

    const secondDash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
    expect(secondDash.kpis.turnCount).toBe(910);
    await host.dispose();
  });

  it('scopes countsByKind in queryLogs to search, providerId, and projectId filters', async () => {
    const host = createFakeHost();
    const store = createUsageStore(host.db, () => now);
    store.upsertLogEvent({ eventKey: 'tu:1', timestampMs: now, kind: 'turn_usage', severity: 'info',
      providerId: 'claude-code', model: 'claude-sonnet-4', projectId: 'p1', threadId: 't1',
      summary: 'claude turn', costUsd: 0.1, payloadJson: '{}' });
    store.upsertLogEvent({ eventKey: 'err:1', timestampMs: now, kind: 'error', severity: 'error',
      providerId: 'claude-code', model: 'claude-sonnet-4', projectId: 'p1', threadId: 't1',
      summary: 'claude error', costUsd: null, payloadJson: '{}' });
    store.upsertLogEvent({ eventKey: 'rl:1', timestampMs: now, kind: 'rate_limit', severity: 'warning',
      providerId: 'openrouter', model: 'gpt-4.1', projectId: 'p2', threadId: 't2',
      summary: 'openrouter throttle', costUsd: null, payloadJson: '{}' });

    const filtered = store.queryLogs({ kind: 'error', search: 'claude' }, new Map());
    expect(filtered.totalCount).toBe(1);
    expect(filtered.countsByKind).toEqual({ turn_usage: 1, rate_limit: 0, fallback: 0, error: 1 });

    const projFiltered = store.queryLogs({ kind: 'all', providerId: 'openrouter', projectId: 'p2' }, new Map());
    expect(projFiltered.countsByKind).toEqual({ turn_usage: 0, rate_limit: 1, fallback: 0, error: 0 });
  });
});
