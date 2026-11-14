import { describe, expect, it } from 'vitest';
import createAiUsageMonitorPlugin from '../../server.ts';
import {
  collectOpenCodeLocalStats,
  parseOpenCodeGoUsagePayload,
  parseOpenCodeStatsJson,
  probeOpenCodeCloud,
  qualifyOpenCodeConsole,
  type CommandRunner
} from '../server/collectors/opencode-usage.ts';
import { localMidnightMs, resolveTimeRangeBounds } from '../server/util.ts';
import { RPC_METHODS, type DashboardPayload } from '../shared/types.ts';
import { createFakeHost } from './fake-host.ts';

const SAMPLE_ZERO_STATS = JSON.stringify({
  range: { from: 1778803200000, to: 1778860800000 },
  sessions: 0,
  subagents: 0,
  prompts: 0,
  steps: 0,
  tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  cost: 0,
  activeDays: 0,
  streak: 0,
  models: []
});

const SAMPLE_ALL_STATS = JSON.stringify({
  range: { from: 1770000000000, to: 1778860800000 },
  sessions: 188,
  subagents: 27,
  prompts: 321,
  steps: 3465,
  tokens: {
    input: 2_500_000,
    output: 450_000,
    reasoning: 80_000,
    cache: { read: 1_200_000, write: 150_000 }
  },
  cost: 33.91,
  activeDays: 19,
  streak: 4,
  models: [
    {
      model: { id: 'qwen3-coder', providerID: 'opencode', variant: 'free' },
      steps: 1200,
      tokens: { input: 1_000_000, output: 200_000, reasoning: 0, cache: { read: 500_000, write: 50_000 } },
      cost: 0
    },
    {
      model: { id: 'anthropic/claude-sonnet-4', providerID: 'openrouter' },
      steps: 840,
      tokens: { input: 900_000, output: 150_000, reasoning: 50_000, cache: { read: 400_000, write: 60_000 } },
      cost: 21.45
    }
  ]
});

describe('local-timezone calendar ranges & OpenCode integrations', () => {
  it('computes local-timezone bounds for today, 7d, last_week, 30d, and all', () => {
    // Wednesday May 13, 2026 15:30:00 local time
    const wedNow = new Date(2026, 4, 13, 15, 30, 0, 0).getTime();

    const today = resolveTimeRangeBounds('today', wedNow, 'America/Test');
    expect(today.startMs).toBe(localMidnightMs(wedNow, 0));
    expect(today.endMs).toBeNull();
    expect(today.timezone).toBe('America/Test');

    const sevenDay = resolveTimeRangeBounds('7d', wedNow, 'America/Test');
    expect(sevenDay.startMs).toBe(localMidnightMs(wedNow, -6));
    expect(sevenDay.endMs).toBeNull();

    const lastWeek = resolveTimeRangeBounds('last_week', wedNow, 'America/Test');
    // Previous Monday May 4, 2026 00:00 local -> This Monday May 11, 2026 00:00 local
    expect(lastWeek.startMs).toBe(new Date(2026, 4, 4, 0, 0, 0, 0).getTime());
    expect(lastWeek.endMs).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).getTime());

    const thirtyDay = resolveTimeRangeBounds('30d', wedNow, 'America/Test');
    expect(thirtyDay.startMs).toBe(localMidnightMs(wedNow, -29));
    expect(thirtyDay.endMs).toBeNull();

    const all = resolveTimeRangeBounds('all', wedNow, 'America/Test');
    expect(all.startMs).toBe(0);
    expect(all.endMs).toBeNull();
  });

  it('filters dashboard telemetry strictly inside [startMs, endMs) for last_week', async () => {
    const wedNow = new Date(2026, 4, 13, 15, 30, 0, 0).getTime();
    const beforeLastWeek = new Date(2026, 4, 3, 23, 59, 0, 0).getTime();
    const insideLastWeek = new Date(2026, 4, 7, 12, 0, 0, 0).getTime();
    const thisWeek = new Date(2026, 4, 12, 10, 0, 0, 0).getTime();

    const host = createFakeHost({
      providers: [{ id: 'openrouter', available: true, displayName: 'OpenRouter' }],
      threads: [
        {
          id: 'th-old',
          projectId: 'p1',
          hostId: 'h1',
          environmentId: null,
          providerId: 'openrouter',
          status: 'idle',
          updatedAt: beforeLastWeek,
          defaultModel: 'openai/gpt-4.1',
          events: [
            {
              seq: 1,
              type: 'thread/tokenUsage/updated',
              payload: {
                createdAt: beforeLastWeek,
                tokenUsage: {
                  total: { inputTokens: 1000, outputTokens: 200, totalTokens: 1200 },
                  last: { inputTokens: 1000, outputTokens: 200, totalTokens: 1200 }
                }
              }
            }
          ]
        },
        {
          id: 'th-last-week',
          projectId: 'p1',
          hostId: 'h1',
          environmentId: null,
          providerId: 'openrouter',
          status: 'idle',
          updatedAt: insideLastWeek,
          defaultModel: 'openai/gpt-4.1',
          events: [
            {
              seq: 1,
              type: 'thread/tokenUsage/updated',
              payload: {
                createdAt: insideLastWeek,
                tokenUsage: {
                  total: { inputTokens: 5000, outputTokens: 1000, totalTokens: 6000 },
                  last: { inputTokens: 5000, outputTokens: 1000, totalTokens: 6000 }
                }
              }
            }
          ]
        },
        {
          id: 'th-this-week',
          projectId: 'p1',
          hostId: 'h1',
          environmentId: null,
          providerId: 'openrouter',
          status: 'idle',
          updatedAt: thisWeek,
          defaultModel: 'openai/gpt-4.1',
          events: [
            {
              seq: 1,
              type: 'thread/tokenUsage/updated',
              payload: {
                createdAt: thisWeek,
                tokenUsage: {
                  total: { inputTokens: 9000, outputTokens: 1000, totalTokens: 10000 },
                  last: { inputTokens: 9000, outputTokens: 1000, totalTokens: 10000 }
                }
              }
            }
          ]
        }
      ]
    });

    await createAiUsageMonitorPlugin(host.zcc, { now: () => wedNow, skipInitialSync: true });
    await host.callRpc(RPC_METHODS.refreshNow);

    const lastWeekDash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'last_week' });
    expect(lastWeekDash.kpis.turnCount).toBe(1);
    expect(lastWeekDash.kpis.totalTokens).toBe(6000);
    expect(lastWeekDash.kpis.rangeBounds?.endMs).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).getTime());

    const todayDash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'today' });
    expect(todayDash.kpis.turnCount).toBe(0);

    const sevenDayDash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '7d' });
    expect(sevenDayDash.kpis.turnCount).toBe(2); // May 7 + May 12 are within 7 calendar days of May 13
    await host.dispose();
  });

  it('collects local OpenCode CLI stats, handles ENOENT/invalid JSON/timeouts, and caches --all', async () => {
    const enoentErr = Object.assign(new Error('spawn opencode ENOENT'), { code: 'ENOENT' });
    const missing = await collectOpenCodeLocalStats({
      runCommand: async () => {
        throw enoentErr;
      }
    });
    expect(missing.installed).toBe(false);
    expect(missing.errorMessage).toBeNull();

    const disabled = await collectOpenCodeLocalStats({
      enabled: false,
      runCommand: async () => {
        throw new Error('should not run');
      }
    });
    expect(disabled.installed).toBe(false);
    expect(disabled.errorMessage).toContain('disabled');

    let allCalls = 0;
    let fakeNow = 1_000_000;
    const runner: CommandRunner = async (_file, args) => {
      if (args[0] === '--version') return { stdout: '2.0.29\n', stderr: '' };
      if (args.includes('--days') && args.includes('0')) return { stdout: SAMPLE_ZERO_STATS, stderr: '' };
      if (args.includes('--days') && args.includes('7')) return { stdout: '{not-valid-json', stderr: '' };
      if (args.includes('--all')) {
        allCalls += 1;
        return { stdout: SAMPLE_ALL_STATS, stderr: '' };
      }
      return { stdout: '{}', stderr: '' };
    };

    const first = await collectOpenCodeLocalStats({
      runCommand: runner,
      now: () => fakeNow,
      allTimeMinIntervalMs: 300_000
    });
    expect(first.installed).toBe(true);
    expect(first.cliVersion).toBe('2.0.29');
    expect(first.periods.today.sessions).toBe(0);
    expect(first.periods['7d'].available).toBe(false);
    expect(first.periods['7d'].errorMessage).toContain('Invalid JSON');
    expect(first.periods.all.sessions).toBe(188);
    expect(first.periods.all.costUsd).toBe(33.91);
    expect(first.periods.all.models).toHaveLength(2);
    expect(first.periods.all.models[1].providerId).toBe('openrouter');
    expect(allCalls).toBe(1);

    // Within cooldown: --all should be reused from previousSnapshot
    fakeNow += 60_000;
    const second = await collectOpenCodeLocalStats({
      runCommand: runner,
      previousSnapshot: first,
      now: () => fakeNow,
      allTimeMinIntervalMs: 300_000
    });
    expect(second.periods.all.sessions).toBe(188);
    expect(allCalls).toBe(1);

    // Past cooldown: --all should re-run
    fakeNow += 300_000;
    await collectOpenCodeLocalStats({
      runCommand: runner,
      previousSnapshot: second,
      now: () => fakeNow,
      allTimeMinIntervalMs: 300_000
    });
    expect(allCalls).toBe(2);

    const parsedEmpty = parseOpenCodeStatsJson('{"sessions": 1}', 'today');
    expect(parsedEmpty.available).toBe(true);
    expect(parsedEmpty.models).toEqual([]);
  });

  it('probes OpenCode Go quotas and Console budgets safely without fabricating $0 balance', async () => {
    const parsedGo = parseOpenCodeGoUsagePayload({
      usage: {
        rolling: { status: 'ok', percent: 78, resetsAt: '2026-05-15T18:00:00Z' },
        weekly: { status: 'rate-limited', percent: 100, resetsAt: '2026-05-20T00:00:00Z' },
        monthly: { status: 'ok', percent: 25, resetsAt: '2026-06-01T00:00:00Z' }
      }
    });
    expect(parsedGo.map((w) => [w.key, w.status, w.remainingPercent])).toEqual([
      ['opencode_go_rolling', 'warning', 22],
      ['opencode_go_weekly', 'blocked', 0],
      ['opencode_go_monthly', 'allowed', 75]
    ]);

    const seenHeaders: Array<{ url: string; headers: Record<string, string> }> = [];
    const okResult = await probeOpenCodeCloud({
      apiKey: 'oc_sk_test_123',
      workspaceId: 'ws_abc',
      fetch: async (input, init) => {
        const url = String(input);
        seenHeaders.push({ url, headers: (init?.headers as Record<string, string>) ?? {} });
        if (url.endsWith('/zen/go/v1/usage')) {
          return new Response(
            JSON.stringify({
              usage: {
                rolling: { status: 'ok', percent: 80, resetsAt: '2026-05-15T18:00:00Z' },
                weekly: { status: 'ok', percent: 30, resetsAt: '2026-05-20T00:00:00Z' }
              }
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify([{ spentDollars: 14.25, limitDollars: 50, picked: true }]),
          { status: 200 }
        );
      }
    });

    expect(okResult.status).toBe('ok');
    expect(okResult.providerStatus).toBe('warning');
    expect(okResult.goSubscribed).toBe(true);
    expect(okResult.reportedSpendUsd).toBe(14.25);
    expect(okResult.qualificationState).toBe('unqualified');
    expect(seenHeaders.find((h) => h.url.includes('/zen/go/v1/usage'))?.headers['x-opencode-org-id']).toBe('ws_abc');
    expect(seenHeaders.find((h) => h.url.includes('current-budgets'))?.headers['x-org-id']).toBe('ws_abc');

    // 401 unauthorized
    const unauthorized = await probeOpenCodeCloud({
      apiKey: 'oc_sk_bad',
      fetch: async () => new Response('unauthorized', { status: 401 })
    });
    expect(unauthorized.status).toBe('error');
    expect(unauthorized.providerStatus).toBe('expired');

    // 403 on both Go and Console
    const forbidden = await probeOpenCodeCloud({
      apiKey: 'oc_sk_svc',
      fetch: async () => new Response('forbidden', { status: 403 })
    });
    expect(forbidden.status).toBe('error');
    expect(forbidden.qualificationState).toBe('permission_required');
    expect(forbidden.errorMessage).toContain('403');

    // qualifyOpenCodeConsole returns sanitized keys without leaking apiKey
    const qual = await qualifyOpenCodeConsole({
      apiKey: 'oc_sk_secret_value',
      workspaceId: 'ws_1',
      fetch: async () => new Response(JSON.stringify({ balanceCents: 1200, currency: 'usd' }), { status: 200 })
    });
    expect(qual.ok).toBe(true);
    expect(qual.probes).toHaveLength(4);
    expect(qual.probes[0].topLevelKeys).toEqual(['balanceCents', 'currency']);
    expect(JSON.stringify(qual)).not.toContain('oc_sk_secret_value');
  });

  it('integrates OpenCode Go windows and Local CLI stats cleanly without clobbering or double-counting', async () => {
    const fixedNow = new Date(2026, 4, 15, 16, 0, 0, 0).getTime();
    const host = createFakeHost({
      settings: {
        opencodeApiKey: 'oc_sk_live',
        opencodeWorkspaceId: 'org-1',
        enableOpenCodeLocalStats: true
      },
      providers: [
        { id: 'opencode', available: true, displayName: 'OpenCode', models: ['big-pickle'] }
      ],
      threads: [
        {
          id: 'th-zana-1',
          projectId: 'p1',
          hostId: 'h1',
          environmentId: null,
          providerId: 'opencode',
          status: 'idle',
          updatedAt: fixedNow - 1000,
          defaultModel: 'big-pickle',
          events: [
            {
              seq: 1,
              type: 'thread/tokenUsage/updated',
              payload: {
                createdAt: fixedNow - 1000,
                tokenUsage: {
                  total: { inputTokens: 1000, outputTokens: 200, totalTokens: 1200 },
                  last: { inputTokens: 1000, outputTokens: 200, totalTokens: 1200 }
                }
              }
            }
          ]
        }
      ]
    });

    await createAiUsageMonitorPlugin(host.zcc, {
      now: () => fixedNow,
      skipInitialSync: true,
      fetch: async (input) => {
        const url = String(input);
        if (url.includes('/zen/go/v1/usage')) {
          return new Response(
            JSON.stringify({
              usage: {
                rolling: { status: 'ok', percent: 45, resetsAt: new Date(fixedNow + 3_600_000).toISOString() },
                weekly: { status: 'ok', percent: 15, resetsAt: new Date(fixedNow + 86_400_000).toISOString() }
              }
            }),
            { status: 200 }
          );
        }
        return new Response('forbidden', { status: 403 });
      },
      runOpenCodeCommand: async (_file, args) => {
        if (args[0] === '--version') return { stdout: '2.0.29\n', stderr: '' };
        if (args.includes('--days') && args.includes('0')) return { stdout: SAMPLE_ZERO_STATS, stderr: '' };
        if (args.includes('--days') && args.includes('7')) return { stdout: SAMPLE_ZERO_STATS, stderr: '' };
        return { stdout: SAMPLE_ALL_STATS, stderr: '' };
      }
    });

    await host.callRpc(RPC_METHODS.refreshNow);
    // Run a second refresh to ensure zcc-quotas registry collector does NOT clobber opencode-go-usage
    await host.callRpc(RPC_METHODS.refreshNow);

    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    const opencodeProv = dash.providers.find((p) => p.providerId === 'opencode');
    expect(opencodeProv?.source).toBe('opencode-go-usage');
    expect(opencodeProv?.windows).toHaveLength(2);
    expect(opencodeProv?.windows[0].remainingPercent).toBe(55);

    const opencodeConn = dash.cloudConnectors.find((c) => c.provider === 'opencode');
    expect(opencodeConn?.status).toBe('ok');
    expect(opencodeConn?.qualificationState).toBe('unqualified');
    expect(opencodeConn?.creditRemainingUsd).toBeNull();

    // Zana KPI totals stay strictly scoped to Zana threads (not inflated by $33.91 local CLI archive)
    expect(dash.kpis.turnCount).toBe(1);
    expect(dash.kpis.totalTokens).toBe(1200);
    expect(dash.kpis.totalValueUsd).toBeLessThan(1);
    expect(dash.opencodeLocal?.periods.all.costUsd).toBe(33.91);

    const qualCli = await host.runCli(['qualify-opencode']);
    expect(qualCli.exitCode).toBe(0);
    expect(JSON.parse(qualCli.stdout ?? '{}').ok).toBe(true);

    await host.dispose();
  });
});
