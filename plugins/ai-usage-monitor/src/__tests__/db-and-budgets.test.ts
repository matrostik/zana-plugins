import { describe, expect, it } from 'vitest';
import { createBudgetEvaluator, resolveBudgetWindow } from '../server/budgets.ts';
import { createUsageStore } from '../server/db.ts';
import { resolveTimeRangeBounds } from '../server/util.ts';
import { createFakeHost, createSqliteDatabase } from './fake-host.ts';

describe('UsageStore SQLite persistence & aggregations', () => {
  it('applies migrations idempotently with SQLite tracking, upserts turns & logs, and computes summaries without N+1', () => {
    const nowMs = new Date(2026, 4, 10, 14, 0, 0).getTime();
    const db = createSqliteDatabase();
    const store = createUsageStore(db, () => nowMs);
    // Second instantiation on the same DB verifies SQLite-backed idempotent migrations
    const store2 = createUsageStore(db, () => nowMs);
    const appliedRows = db.prepare('SELECT statement FROM _migrations').all() as Array<{ statement: string }>;
    expect(appliedRows.length).toBeGreaterThan(0);

    store.upsertTurn({
      turnKey: 'th-1:t1',
      threadId: 'th-1',
      providerId: 'openai-api',
      model: 'gpt-4.1',
      projectId: 'proj-a',
      timestampMs: nowMs - 3_600_000,
      billingMode: 'billed_api',
      inputTokens: 100_000,
      cachedInputTokens: 20_000,
      outputTokens: 10_000,
      reasoningOutputTokens: 0,
      totalTokens: 110_000,
      contextUsedTokens: null,
      contextWindowTokens: 128_000,
      estimatedCostUsd: 0.5,
      costFormula: 'test formula',
      isSubagent: false,
      rawJson: '{"turn":1}'
    });
    // Upserting the same turnKey must overwrite rather than double-count
    store.upsertTurn({
      turnKey: 'th-1:t1',
      threadId: 'th-1',
      providerId: 'openai-api',
      model: 'gpt-4.1',
      projectId: 'proj-a',
      timestampMs: nowMs - 3_600_000,
      billingMode: 'billed_api',
      inputTokens: 120_000,
      cachedInputTokens: 20_000,
      outputTokens: 15_000,
      reasoningOutputTokens: 5_000,
      totalTokens: 135_000,
      contextUsedTokens: null,
      contextWindowTokens: 128_000,
      estimatedCostUsd: 0.75,
      costFormula: 'updated formula',
      isSubagent: true,
      rawJson: '{"turn":1}'
    });

    store.upsertTurn({
      turnKey: 'th-2:t1',
      threadId: 'th-2',
      providerId: 'claude-code',
      model: 'claude-sonnet-4',
      projectId: 'proj-b',
      timestampMs: nowMs - 1_800_000,
      billingMode: 'subscription',
      inputTokens: 50_000,
      cachedInputTokens: 25_000,
      outputTokens: 5_000,
      reasoningOutputTokens: 0,
      totalTokens: 55_000,
      contextUsedTokens: 45_000,
      contextWindowTokens: 200_000,
      estimatedCostUsd: 0.2,
      costFormula: 'sub formula',
      isSubagent: false,
      rawJson: '{}'
    });

    store.upsertLogEvent({
      eventKey: 'turn_usage:th-1:t1',
      timestampMs: nowMs - 3_600_000,
      kind: 'turn_usage',
      severity: 'info',
      providerId: 'openai-api',
      model: 'gpt-4.1',
      projectId: 'proj-a',
      threadId: 'th-1',
      summary: 'Turn 1 used gpt-4.1',
      costUsd: 0.75,
      inputTokens: 120_000,
      cachedInputTokens: 20_000,
      outputTokens: 15_000,
      reasoningOutputTokens: 5_000,
      contextUsedTokens: null,
      contextWindowTokens: 128_000,
      costFormula: 'updated formula',
      payloadJson: '{"seq":1}'
    });

    store.updateLatestThreadContext('th-1', 64_000, 128_000);

    const summary = store2.aggregateSummary(0);
    expect(summary.turnCount).toBe(2);
    expect(summary.subagentTurnCount).toBe(1);
    expect(summary.billedSpendUsd).toBeCloseTo(0.75, 4);
    expect(summary.subscriptionEquivUsd).toBeCloseTo(0.2, 4);
    expect(summary.totalValueUsd).toBeCloseTo(0.95, 4);

    const projects = new Map([
      ['proj-a', 'Alpha App'],
      ['proj-b', 'Beta Service']
    ]);
    const modelRows = store2.listModelBreakdown(0, []);
    expect(modelRows).toHaveLength(2);
    expect(modelRows[0].model).toBe('gpt-4.1');

    const projRows = store2.listProjectBreakdown(0, projects);
    expect(projRows).toHaveLength(2);
    expect(projRows[0]).toMatchObject({
      projectName: 'Alpha App',
      billedCostUsd: 0.75,
      topProviderId: 'openai-api',
      topModel: 'gpt-4.1'
    });
    expect(projRows[1]).toMatchObject({
      projectName: 'Beta Service',
      topProviderId: 'claude-code',
      topModel: 'claude-sonnet-4'
    });

    const trend = store2.listDailyTrend('7d');
    expect(trend).toHaveLength(1);
    expect(trend[0].totalUsd).toBeCloseTo(0.95, 4);

    const logs = store2.queryLogs({ kind: 'turn_usage', search: 'gpt-4.1' }, projects);
    expect(logs.totalCount).toBe(1);
    expect(logs.items[0].contextUsedTokens).toBe(64_000);
    expect(logs.items[0].projectName).toBe('Alpha App');
  });

  it('evaluates 5h/daily/weekly/monthly local-calendar budgets and targets top-usage project for Inbox alerts', async () => {
    const nowMs = new Date(2026, 4, 10, 14, 0, 0).getTime();
    const host = createFakeHost({
      projects: [
        { id: 'proj-1', name: 'Unused First Project' },
        { id: 'proj-2', name: 'Active Spend Project' }
      ]
    });
    const store = createUsageStore(host.db, () => nowMs);
    const evaluator = createBudgetEvaluator({
      store,
      inbox: host.zcc.sdk.inbox,
      projects: host.zcc.sdk.projects,
      areAlertsEnabled: async () => true,
      log: host.zcc.log,
      now: () => nowMs
    });

    expect(resolveBudgetWindow('5h', nowMs).periodKey).toContain('5h:');
    expect(resolveBudgetWindow('daily', nowMs).sinceMs).toBe(resolveTimeRangeBounds('today', nowMs).startMs);
    expect(resolveBudgetWindow('daily', nowMs).periodKey).toBe('d:2026-05-10');
    expect(resolveBudgetWindow('weekly', nowMs).periodKey).toMatch(/^w:2026-05-/);
    expect(resolveBudgetWindow('monthly', nowMs).periodKey).toBe('m:2026-05');

    store.upsertTurn({
      turnKey: 't1',
      threadId: 'th-1',
      providerId: 'openai-api',
      model: 'gpt-4.1',
      projectId: 'proj-2',
      timestampMs: nowMs - 60_000,
      billingMode: 'billed_api',
      inputTokens: 1000,
      cachedInputTokens: 0,
      outputTokens: 500,
      reasoningOutputTokens: 0,
      totalTokens: 1500,
      contextUsedTokens: null,
      contextWindowTokens: null,
      estimatedCostUsd: 8.5,
      costFormula: '',
      isSubagent: false,
      rawJson: '{}'
    });

    const rule = store.upsertBudget({
      name: 'Daily OpenAI Spend',
      scopeType: 'provider',
      scopeId: 'openai-api',
      period: 'daily',
      metric: 'billed_usd',
      limitValue: 10,
      alertThresholdPct: 80,
      enabled: true
    });

    const first = await evaluator.checkAndNotify();
    expect(first[0].status).toBe('warning');
    expect(first[0].remainingValue).toBeCloseTo(1.5, 4);
    expect(host.inbox).toHaveLength(1);
    expect(host.inbox[0].projectId).toBe('proj-2');
    expect(host.inbox[0].comments).toContain('Budget Warning');

    // Repeating check in the same period and level must NOT duplicate Inbox notifications
    await evaluator.checkAndNotify();
    expect(host.inbox).toHaveLength(1);

    // Pushing spend past 100% triggers a single 'exceeded' notification
    store.upsertTurn({
      turnKey: 't2',
      threadId: 'th-1',
      providerId: 'openai-api',
      model: 'gpt-4.1',
      projectId: 'proj-2',
      timestampMs: nowMs - 10_000,
      billingMode: 'billed_api',
      inputTokens: 500,
      cachedInputTokens: 0,
      outputTokens: 500,
      reasoningOutputTokens: 0,
      totalTokens: 1000,
      contextUsedTokens: null,
      contextWindowTokens: null,
      estimatedCostUsd: 3.0,
      costFormula: '',
      isSubagent: false,
      rawJson: '{}'
    });
    const second = await evaluator.checkAndNotify();
    expect(second[0].status).toBe('exceeded');
    expect(host.inbox).toHaveLength(2);
    expect(host.inbox[1].comments).toContain('Budget Exceeded');

    expect(store.deleteBudget(rule.id)).toBe(true);
    expect(store.listBudgets()).toHaveLength(0);
  });

  it('logs warnings when Inbox push fails, projects.list fails, or no target project exists', async () => {
    const nowMs = new Date(2026, 4, 10, 14, 0, 0).getTime();
    const host = createFakeHost({
      projects: [{ id: 'proj-1', name: 'Main Project' }],
      inboxShouldThrow: true
    });
    const store = createUsageStore(host.db, () => nowMs);
    store.upsertBudget({
      name: 'Token Cap',
      scopeType: 'global',
      period: 'monthly',
      metric: 'tokens',
      limitValue: 100,
      alertThresholdPct: 50,
      enabled: true
    });
    store.upsertTurn({
      turnKey: 'tok-1',
      threadId: 'th-9',
      providerId: 'codex',
      model: 'gpt-5-codex',
      projectId: 'proj-1',
      timestampMs: nowMs - 1000,
      billingMode: 'subscription',
      inputTokens: 80,
      cachedInputTokens: 0,
      outputTokens: 10,
      reasoningOutputTokens: 0,
      totalTokens: 90,
      contextUsedTokens: null,
      contextWindowTokens: null,
      estimatedCostUsd: 0.01,
      costFormula: '',
      isSubagent: false,
      rawJson: '{}'
    });

    const evaluator = createBudgetEvaluator({
      store,
      inbox: host.zcc.sdk.inbox,
      projects: host.zcc.sdk.projects,
      areAlertsEnabled: async () => true,
      log: host.zcc.log,
      now: () => nowMs
    });

    const res = await evaluator.checkAndNotify();
    expect(res[0].status).toBe('warning');
    expect(host.logs.some((l) => l.level === 'warn' && l.message.includes('Inbox unavailable'))).toBe(true);

    // When projects.list fails and no project exists on matching turns, logs both warnings cleanly
    const emptyHost = createFakeHost();
    const emptyStore = createUsageStore(emptyHost.db, () => nowMs);
    emptyStore.upsertBudget({
      name: 'Empty Cap',
      scopeType: 'provider',
      scopeId: 'missing-provider',
      period: 'daily',
      metric: 'tokens',
      limitValue: 1,
      alertThresholdPct: 0,
      enabled: true
    });
    const failingEvaluator = createBudgetEvaluator({
      store: emptyStore,
      inbox: emptyHost.zcc.sdk.inbox,
      projects: {
        list: async () => {
          throw new Error('projects RPC timeout');
        }
      },
      areAlertsEnabled: async () => true,
      log: emptyHost.zcc.log,
      now: () => nowMs
    });
    await failingEvaluator.checkAndNotify();
    expect(emptyHost.logs.some((l) => l.level === 'warn' && l.message.includes('projects RPC timeout'))).toBe(true);
    expect(emptyHost.logs.some((l) => l.level === 'warn' && l.message.includes('no target project'))).toBe(true);
  });
});
