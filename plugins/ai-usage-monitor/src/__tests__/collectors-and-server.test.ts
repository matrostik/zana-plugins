import { describe, expect, it } from 'vitest';
import createAiUsageMonitorPlugin from '../../server.ts';
import {
  RPC_METHODS,
  type DashboardPayload,
  type LogsResponse
} from '../shared/types.ts';
import { createFakeHost } from './fake-host.ts';

describe('collectors, indexer, RPCs, CLI, and agent tools', () => {
  it('indexes thread telemetry, probes ZCC quotas & cloud APIs, and serves RPC/CLI/tools', async () => {
    const fixedNow = Date.UTC(2026, 4, 15, 16, 0, 0);
    const host = createFakeHost({
      settings: {
        openaiAdminKey: 'test-openai-admin-key',
        anthropicAdminKey: 'test-anthropic-admin-key',
        openrouterApiKey: 'test-openrouter-key',
        subscriptionProviders: 'claude-code,codex,cursor,acp-cursor,antigravity',
        enableBudgetInboxAlerts: true
      },
      projects: [{ id: 'proj-1', name: 'Zana Plugins' }],
      providers: [
        { id: 'claude-code', available: true, displayName: 'Claude Code', models: ['claude-sonnet-4-5'] },
        { id: 'codex', available: true, displayName: 'Codex', models: ['gpt-5-codex'] },
        { id: 'openrouter', available: true, displayName: 'OpenRouter', models: ['anthropic/claude-sonnet-4'] },
        { id: 'local', available: false, displayName: 'Local Ollama', models: ['llama3'] }
      ],
      threads: [
        {
          id: 'th-1',
          projectId: 'proj-1',
          hostId: 'h1',
          environmentId: null,
          providerId: 'claude-code',
          status: 'idle',
          updatedAt: fixedNow - 30_000,
          events: [
            { seq: 1, type: 'client/turn/requested', payload: { execution: { model: 'claude-sonnet-4-5' }, createdAt: fixedNow - 29_000 } },
            {
              seq: 2,
              type: 'thread/tokenUsage/updated',
              payload: {
                scope: { turnId: 'turn-a' },
                createdAt: fixedNow - 25_000,
                tokenUsage: {
                  modelContextWindow: 200_000,
                  total: { inputTokens: 100_000, cachedInputTokens: 60_000, outputTokens: 10_000, reasoningOutputTokens: 0, totalTokens: 110_000 },
                  last: { inputTokens: 100_000, cachedInputTokens: 60_000, outputTokens: 10_000, reasoningOutputTokens: 0, totalTokens: 110_000 }
                }
              }
            },
            {
              seq: 3,
              type: 'thread/contextWindowUsage/updated',
              payload: { contextWindowUsage: { usedTokens: 92_000, modelContextWindow: 200_000 } }
            },
            {
              seq: 4,
              type: 'provider/rateLimits/updated',
              payload: {
                createdAt: fixedNow - 15_000,
                rateLimits: {
                  providerId: 'claude-code',
                  status: 'warning',
                  kind: 'subscription-window',
                  reachedReason: '5h session window at 82%',
                  windows: [{ providerKey: '5h', label: '5-Hour Session', status: 'warning', resetsAtMs: fixedNow + 7_200_000 }]
                }
              }
            },
            {
              seq: 5,
              type: 'provider/modelFallback',
              payload: { originalModel: 'claude-opus-4', fallbackModel: 'claude-sonnet-4-5', message: 'Fell back due to capacity', createdAt: fixedNow - 10_000 }
            }
          ]
        },
        {
          id: 'th-2',
          projectId: 'proj-1',
          hostId: 'h1',
          environmentId: null,
          providerId: 'openrouter',
          parentThreadId: 'th-1',
          status: 'failed',
          updatedAt: fixedNow - 5_000,
          defaultModel: 'anthropic/claude-sonnet-4',
          events: [
            {
              seq: 1,
              type: 'thread/tokenUsage/updated',
              payload: {
                createdAt: fixedNow - 4_000,
                tokenUsage: {
                  total: { inputTokens: 50_000, cachedInputTokens: 0, outputTokens: 5_000, totalTokens: 55_000 },
                  last: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
                }
              }
            },
            {
              seq: 2,
              type: 'provider/error',
              payload: { message: 'HTTP 429 rate limit exceeded', willRetry: true, createdAt: fixedNow - 2_000 }
            }
          ]
        }
      ]
    });

    const mockFetch = async (input: string | URL) => {
      const url = String(input);
      if (url.includes('api.openai.com/v1/organization/costs')) {
        return new Response(JSON.stringify({ data: [{ results: [{ amount: { value: 18.42 } }] }] }), { status: 200 });
      }
      if (url.includes('api.anthropic.com/v1/organizations/cost_report')) {
        return new Response('unauthorized', { status: 401 });
      }
      if (url.includes('openrouter.ai/api/v1/credits')) {
        return new Response(JSON.stringify({ data: { total_credits: 50, total_usage: 12.5 } }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    };

    await createAiUsageMonitorPlugin(host.zcc, {
      fetch: mockFetch,
      now: () => fixedNow,
      skipInitialSync: true,
      probeSystemUsageLimits: async () => ({
        claudeCode: {
          status: 'ok',
          accountEmail: 'dev@example.com',
          planLabel: 'Claude Max',
          windows: [
            { label: '5h Window', usedPercent: 82, resetsAt: new Date(fixedNow + 3_600_000).toISOString() },
            { label: 'Weekly Quota', usedPercent: 31, resetsAt: new Date(fixedNow + 86_400_000).toISOString() }
          ]
        },
        codex: {
          status: 'ok',
          accountEmail: 'dev@example.com',
          planLabel: 'ChatGPT Pro',
          windows: [
            { label: 'Daily Cost Limit', usedPercent: 40, cost: { usedUsdCents: 400, limitUsdCents: 1000 } }
          ]
        }
      })
    });

    await host.callRpc(RPC_METHODS.refreshNow);
    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    expect(dash.kpis.turnCount).toBe(2);
    expect(dash.kpis.subagentTurnCount).toBe(1);
    expect(dash.kpis.cloudCreditsRemainingUsd).toBeCloseTo(43.5, 2); // OpenRouter $37.50 + Codex $6.00
    expect(dash.kpis.tightestQuota).toMatchObject({ providerId: 'claude-code', remainingPercent: 18 });
    expect(dash.models.some((m) => m.model === 'claude-sonnet-4-5')).toBe(true);

    // Cloud connectors reflect mixed success (OpenAI, OpenRouter) + HTTP 401 error (Anthropic)
    const anthropicConn = dash.cloudConnectors.find((c) => c.provider === 'anthropic');
    expect(anthropicConn?.status).toBe('error');
    expect(anthropicConn?.errorMessage).toContain('401');
    const openaiConn = dash.cloudConnectors.find((c) => c.provider === 'openai');
    expect(openaiConn?.reportedSpendUsd).toBeCloseTo(18.42, 2);

    // Logs query covers all 4 kinds: turn_usage, rate_limit, fallback, error
    const allLogs = await host.callRpc<LogsResponse>(RPC_METHODS.logs, { kind: 'all' });
    expect(allLogs.countsByKind).toEqual({ turn_usage: 2, rate_limit: 1, fallback: 1, error: 1 });
    expect(allLogs.items.some((i) => i.summary.includes('retrying'))).toBe(true);

    // Budget + pricing override RPCs + validation failures
    await expect(host.callRpc(RPC_METHODS.setBudget, { name: '' })).rejects.toThrow(/required/i);
    await expect(host.callRpc(RPC_METHODS.setBudget, { name: 'Bad', scopeType: 'nope', period: 'daily', metric: 'billed_usd', limitValue: 5 })).rejects.toThrow(/scopeType/);
    await expect(host.callRpc(RPC_METHODS.setPricingOverride, { pattern: 'x*', billingMode: 'bogus' })).rejects.toThrow(/billingMode/);

    const budget = await host.callRpc<{ id: string }>(RPC_METHODS.setBudget, {
      name: 'Monthly Cap',
      scopeType: 'global',
      period: 'monthly',
      metric: 'billed_usd',
      limitValue: 100,
      alertThresholdPct: 80
    });
    await host.callRpc(RPC_METHODS.setPricingOverride, {
      pattern: 'gpt-5*',
      inputPer1M: 2,
      cachedInputPer1M: 0.2,
      outputPer1M: 8,
      reasoningPer1M: 8,
      billingMode: 'subscription'
    });

    // CLI + Agent Tools
    const cliSummary = await host.runCli(['summary', '--range=today']);
    expect(cliSummary.exitCode).toBe(0);
    expect(JSON.parse(cliSummary.stdout ?? '{}').kpis.turnCount).toBe(2);

    expect((await host.runCli(['quotas'])).exitCode).toBe(0);
    expect((await host.runCli(['budgets'])).exitCode).toBe(0);
    expect((await host.runCli(['logs', '--kind=error', '--limit=5'])).exitCode).toBe(0);
    expect((await host.runCli(['bogus'])).exitCode).toBe(1);

    const toolSummary = JSON.parse(String(await host.callTool('ai_usage_summary', { range: 'all', refresh: true })));
    expect(toolSummary.kpis.turnCount).toBe(2); // no double-counting after refresh!
    const toolLogs = JSON.parse(String(await host.callTool('ai_usage_logs', { kind: 'fallback', limit: 10 })));
    expect(toolLogs.items).toHaveLength(1);

    // Live thread lifecycle event updates incremental cursor
    const th1 = host.threads.get('th-1')!;
    th1.events.push({
      seq: 6,
      type: 'thread/tokenUsage/updated',
      payload: {
        scope: { turnId: 'turn-b' },
        createdAt: fixedNow + 1000,
        tokenUsage: {
          total: { inputTokens: 120_000, cachedInputTokens: 60_000, outputTokens: 12_000, totalTokens: 132_000 },
          last: { inputTokens: 20_000, cachedInputTokens: 0, outputTokens: 2_000, totalTokens: 22_000 }
        }
      }
    });
    await host.emitThreadEvent('thread.idle', { name: 'thread.idle', threadId: 'th-1' });
    const afterIdle = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    expect(afterIdle.kpis.turnCount).toBe(3);

    // Cleanup mutations + resetSync + schedule + dispose
    await host.callRpc(RPC_METHODS.deleteBudget, { id: budget.id });
    await host.callRpc(RPC_METHODS.deletePricingOverride, { pattern: 'gpt-5*' });
    await host.callRpc(RPC_METHODS.resetSync);
    await host.runSchedules();
    await host.dispose();
  });

  it('handles Anthropic success, OpenAI/OpenRouter HTTP errors, loopback usage probe, and unauthenticated hosts', async () => {
    const fixedNow = Date.UTC(2026, 4, 15, 19, 0, 0);
    const host = createFakeHost({
      settings: {
        openaiAdminKey: 'test-openai-err',
        anthropicAdminKey: 'test-anthropic-ok',
        openrouterApiKey: 'test-openrouter-err'
      },
      providers: [
        { id: 'claude-code', available: true, displayName: 'Claude Code', models: ['claude-sonnet-4'] },
        { id: 'codex', available: true, displayName: 'Codex', models: ['gpt-5-codex'] },
        { id: 'cursor', available: true, displayName: 'Cursor', models: ['cursor-small'] }
      ]
    });
    (host.zcc as unknown as { server: { loopbackBaseUrl: string } }).server = {
      loopbackBaseUrl: 'http://127.0.0.1:4199'
    };

    const mockFetch = async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/system/usage-limits')) {
        return new Response(
          JSON.stringify({
            claudeCode: { status: 'unauthenticated', accountEmail: null, planLabel: 'Claude' },
            codex: { status: 'error', message: 'Codex binary timed out' },
            cursor: { status: 'expired', accountEmail: 'u@example.com' }
          }),
          { status: 200 }
        );
      }
      if (url.includes('api.anthropic.com/v1/organizations/cost_report')) {
        return new Response(JSON.stringify({ data: [{ results: [{ amount_cents: 1234 }] }] }), { status: 200 });
      }
      throw new Error('Network unreachable');
    };

    await createAiUsageMonitorPlugin(host.zcc, {
      fetch: mockFetch,
      now: () => fixedNow,
      skipInitialSync: true
    });

    await host.callRpc(RPC_METHODS.refreshNow);
    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    expect(dash.cloudConnectors.find((c) => c.provider === 'anthropic')?.reportedSpendUsd).toBeCloseTo(12.34, 2);
    expect(dash.cloudConnectors.find((c) => c.provider === 'openai')?.status).toBe('error');
    expect(dash.cloudConnectors.find((c) => c.provider === 'openrouter')?.status).toBe('error');
    expect(dash.providers.find((p) => p.providerId === 'claude-code')?.status).toBe('unauthenticated');
    expect(dash.providers.find((p) => p.providerId === 'codex')?.status).toBe('error');
    expect(dash.providers.find((p) => p.providerId === 'cursor')?.status).toBe('expired');
  });

  it('falls back to observed rate-limit events and search() when threads.list and host probe are absent', async () => {
    const fixedNow = Date.UTC(2026, 4, 15, 18, 0, 0);
    const host = createFakeHost({
      providers: [{ id: 'cursor', available: true, displayName: 'Cursor', models: ['cursor-fast'] }],
      threads: [
        {
          id: 'th-c',
          projectId: 'proj-x',
          hostId: 'h1',
          environmentId: null,
          providerId: 'cursor',
          status: 'idle',
          events: [
            {
              seq: 1,
              type: 'provider/rateLimits/updated',
              payload: {
                rateLimits: {
                  providerId: 'cursor',
                  status: 'blocked',
                  kind: 'subscription-window',
                  reachedReason: 'Cursor monthly fast requests exhausted',
                  windows: [{ providerKey: 'monthly', label: 'Fast Requests', status: 'blocked', resetsAtMs: fixedNow + 86_400_000 }]
                }
              }
            },
            {
              seq: 2,
              type: 'turn.failed',
              payload: { message: 'Provider error', detail: 'HTTP 400 Bad Request', createdAt: fixedNow - 1000 }
            },
            {
              seq: 3,
              type: 'provider/warning',
              payload: { summary: 'Insufficient account funds', createdAt: fixedNow - 500 }
            }
          ]
        }
      ]
    });
    // Simulate older ZCC host without threads.list
    delete (host.zcc.sdk.threads as { list?: unknown }).list;

    await createAiUsageMonitorPlugin(host.zcc, {
      now: () => fixedNow,
      skipInitialSync: true,
      probeSystemUsageLimits: async () => null
    });

    await host.callRpc(RPC_METHODS.refreshNow);
    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
    const cursorProv = dash.providers.find((p) => p.providerId === 'cursor');
    expect(cursorProv?.status).toBe('blocked');
    expect(cursorProv?.source).toBe('thread-events');
    expect(cursorProv?.windows[0].remainingPercent).toBe(0);

    const errLogs = await host.callRpc<LogsResponse>(RPC_METHODS.logs, { kind: 'error' });
    expect(errLogs.items.some((i) => i.summary.includes('HTTP 400'))).toBe(true);
    expect(errLogs.items.some((i) => i.summary.includes('Insufficient account funds'))).toBe(true);
  });

  it('returns dashboard immediately without blocking on slow sync, skips defaultExecutionOptions and unchanged threads', async () => {
    const fixedNow = Date.UTC(2026, 4, 15, 20, 0, 0);
    const host = createFakeHost({
      providers: [{ id: 'codex', available: true, displayName: 'Codex', models: ['gpt-5'] }],
      threads: [
        {
          id: 'th-fast',
          projectId: 'proj-1',
          hostId: 'h1',
          environmentId: null,
          providerId: 'codex',
          status: 'idle',
          updatedAt: fixedNow - 5_000,
          events: [
            { seq: 1, type: 'client/turn/requested', payload: { execution: { model: 'gpt-5' }, createdAt: fixedNow - 4_000 } },
            {
              seq: 2,
              type: 'thread/tokenUsage/updated',
              payload: {
                createdAt: fixedNow - 3_000,
                tokenUsage: {
                  total: { inputTokens: 1000, cachedInputTokens: 0, outputTokens: 200, totalTokens: 1200 },
                  last: { inputTokens: 1000, cachedInputTokens: 0, outputTokens: 200, totalTokens: 1200 }
                }
              }
            }
          ]
        }
      ]
    });

    let execOptionsCalls = 0;
    let eventsListCalls = 0;
    let releaseSlowEvents!: () => void;
    const slowGate = new Promise<void>((resolve) => {
      releaseSlowEvents = resolve;
    });

    const origEventsList = host.zcc.sdk.threads.events.list;
    host.zcc.sdk.threads.defaultExecutionOptions = async () => {
      execOptionsCalls += 1;
      return new Promise(() => {}); // would hang if called during bulk sync
    };
    host.zcc.sdk.threads.events.list = async (args) => {
      eventsListCalls += 1;
      await slowGate;
      return origEventsList(args);
    };

    await createAiUsageMonitorPlugin(host.zcc, {
      now: () => fixedNow,
      probeSystemUsageLimits: async () => null
    });

    // dashboard RPC must resolve immediately even while initial sync is blocked on slowGate
    const firstDash = await Promise.race([
      host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('dashboard blocked on sync')), 500))
    ]);
    expect(firstDash.kpis.turnCount).toBe(0);

    // Unblock slow thread sync and trigger refreshNow
    releaseSlowEvents();
    await host.callRpc(RPC_METHODS.refreshNow);

    expect(execOptionsCalls).toBe(0);
    expect(eventsListCalls).toBe(1);

    const secondDash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    expect(secondDash.kpis.turnCount).toBe(1);
    expect(secondDash.isSyncing).toBe(false);

    // Second refresh should skip unchanged thread (updatedAt <= cursor.threadUpdatedAtMs)
    await host.callRpc(RPC_METHODS.refreshNow);
    expect(eventsListCalls).toBe(1);

    await host.dispose();
  });
});
