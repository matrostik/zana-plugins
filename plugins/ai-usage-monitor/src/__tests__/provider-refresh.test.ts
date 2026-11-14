import { describe, expect, it } from 'vitest';
import createAiUsageMonitorPlugin from '../../server.ts';
import { RPC_METHODS, type DashboardPayload } from '../shared/types.ts';
import { createFakeHost } from './fake-host.ts';

describe('Provider refresh persistence and isolation', () => {
  it('preserves previous Antigravity quota windows in DB on transient probe error', async () => {
    const fixedNow = Date.UTC(2026, 4, 15, 16, 0, 0);
    const host = createFakeHost({ providers: [{ id: 'antigravity', available: true }] });
    Object.assign(host.zcc, { server: { loopbackBaseUrl: 'http://127.0.0.1:1234' } });
    let shouldFail = false;
    const fetch = async (input: string | URL) => {
      if (!String(input).includes('/plugins/provider-antigravity/rpc/usage:status')) {
        return new Response('', { status: 404 });
      }
      if (shouldFail) {
        return new Response('', { status: 503 });
      }
      return new Response(
        JSON.stringify({
          ok: true,
          result: {
            supported: true,
            usage: {
              status: 'ok',
              source: 'native-acp-/usage',
              planLabel: 'Google AI Pro',
              windows: [
                { label: 'Gemini Models — Five Hour', usedPercent: 20, resetsAt: '2026-05-15T21:00:00.000Z' }
              ]
            }
          }
        }),
        { status: 200 }
      );
    };

    await createAiUsageMonitorPlugin(host.zcc, { now: () => fixedNow, skipInitialSync: true, fetch, homeDir: null });
    await host.callRpc(RPC_METHODS.refreshNow);

    shouldFail = true;
    await host.callRpc(RPC_METHODS.refreshNow);

    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    const antigravity = dash.providers.find((p) => p.providerId === 'antigravity');
    expect(antigravity).toMatchObject({
      status: 'ok',
      planLabel: 'Google AI Pro',
      errorMessage: expect.stringContaining('Could not check Antigravity usage')
    });
    expect(antigravity?.windows).toEqual([
      expect.objectContaining({ label: 'Gemini Models — Five Hour', remainingPercent: 80 })
    ]);
    await host.dispose();
  });

  it('preserves previous quota windows for non-Antigravity providers on transient host probe error', async () => {
    const fixedNow = Date.UTC(2026, 4, 15, 16, 0, 0);
    const host = createFakeHost({ providers: [{ id: 'claude-code', available: true, displayName: 'Claude Code' }] });
    let shouldFail = false;

    await createAiUsageMonitorPlugin(host.zcc, {
      now: () => fixedNow,
      skipInitialSync: true,
      homeDir: null,
      probeSystemUsageLimits: async () =>
        shouldFail
          ? { claudeCode: { status: 'error', message: 'Temporary CLI timeout' } }
          : {
              claudeCode: {
                status: 'ok',
                planLabel: 'Claude Max',
                windows: [{ label: '5h Window', usedPercent: 35, resetsAt: '2026-05-15T21:00:00.000Z' }]
              }
            }
    });

    await host.callRpc(RPC_METHODS.refreshNow);
    shouldFail = true;
    await host.callRpc(RPC_METHODS.refreshNow);

    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    const claude = dash.providers.find((p) => p.providerId === 'claude-code');
    expect(claude).toMatchObject({
      status: 'ok',
      errorMessage: 'Temporary CLI timeout'
    });
    expect(claude?.windows).toEqual([
      expect.objectContaining({ label: '5h Window', remainingPercent: 65 })
    ]);
    await host.dispose();
  });

  it('refreshes only the selected provider via refreshProvider RPC without touching unrelated providers', async () => {
    const fixedNow = Date.UTC(2026, 4, 15, 16, 0, 0);
    const host = createFakeHost({
      settings: { openrouterApiKey: 'test-openrouter-key' },
      providers: [
        { id: 'claude-code', available: true, displayName: 'Claude Code' },
        { id: 'codex', available: true, displayName: 'Codex' },
        { id: 'openrouter', available: true, displayName: 'OpenRouter' },
        { id: 'antigravity', available: true, displayName: 'Antigravity' }
      ]
    });
    Object.assign(host.zcc, { server: { loopbackBaseUrl: 'http://127.0.0.1:1234' } });

    let codexUsed = 15;
    let claudeUsed = 20;
    let openrouterUsage = 10;
    let antigravityFetchCount = 0;
    let probeCallCount = 0;

    const fetch = async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/plugins/provider-antigravity/rpc/usage:status')) {
        antigravityFetchCount += 1;
        return new Response(
          JSON.stringify({
            ok: true,
            result: {
              supported: true,
              usage: { status: 'ok', windows: [{ label: 'Five Hour', usedPercent: 10, resetsAt: null }] }
            }
          }),
          { status: 200 }
        );
      }
      if (url.includes('openrouter.ai/api/v1/credits')) {
        return new Response(JSON.stringify({ data: { total_credits: 50, total_usage: openrouterUsage } }), { status: 200 });
      }
      return new Response('', { status: 404 });
    };

    await createAiUsageMonitorPlugin(host.zcc, {
      now: () => fixedNow,
      skipInitialSync: true,
      homeDir: null,
      fetch,
      probeSystemUsageLimits: async () => {
        probeCallCount += 1;
        return {
          claudeCode: {
            status: 'ok',
            windows: [{ label: 'Claude 5h', usedPercent: claudeUsed, resetsAt: null }]
          },
          codex: {
            status: 'ok',
            windows: [{ label: 'Codex 5h', usedPercent: codexUsed, resetsAt: null }]
          }
        };
      }
    });

    await expect(host.callRpc(RPC_METHODS.refreshProvider, { providerId: '' })).rejects.toThrow(/providerId/i);

    await host.callRpc(RPC_METHODS.refreshNow);
    expect(antigravityFetchCount).toBe(1);
    expect(probeCallCount).toBe(1);

    // Mutate all upstream values, then refresh ONLY codex
    codexUsed = 55;
    claudeUsed = 90;
    openrouterUsage = 25;

    await host.callRpc(RPC_METHODS.refreshProvider, { providerId: 'codex' });
    expect(antigravityFetchCount).toBe(1); // antigravity was NOT probed
    const dashAfterCodex = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    expect(dashAfterCodex.providers.find((p) => p.providerId === 'codex')?.windows[0].usedPercent).toBe(55);
    expect(dashAfterCodex.providers.find((p) => p.providerId === 'claude-code')?.windows[0].usedPercent).toBe(20);
    expect(dashAfterCodex.providers.find((p) => p.providerId === 'openrouter')?.creditRemainingUsd).toBe(40);

    // Refresh ONLY openrouter -> does not invoke host probe or antigravity probe
    const probesBeforeOpenRouter = probeCallCount;
    await host.callRpc(RPC_METHODS.refreshProvider, { providerId: 'openrouter' });
    expect(probeCallCount).toBe(probesBeforeOpenRouter);
    expect(antigravityFetchCount).toBe(1);
    const dashAfterOpenRouter = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    expect(dashAfterOpenRouter.providers.find((p) => p.providerId === 'openrouter')?.creditRemainingUsd).toBe(25);
    expect(dashAfterOpenRouter.providers.find((p) => p.providerId === 'claude-code')?.windows[0].usedPercent).toBe(20);

    await host.dispose();
  });

});
