import { describe, expect, it } from 'vitest';
import createAiUsageMonitorPlugin from '../../server.ts';
import { createCloudBillingCollector, type CloudBillingKeys } from '../server/collectors/cloud-billing.ts';
import { createUsageStore } from '../server/db.ts';
import { RPC_METHODS, type DashboardPayload } from '../shared/types.ts';
import { createFakeHost, createSqliteDatabase, type FakeThreadRecord } from './fake-host.ts';

const fixedNow = Date.UTC(2026, 10, 14, 12);
const silentLog = { debug: () => undefined, warn: () => undefined };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** A promise plus its resolver, for holding a request open until the test releases it. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

function tokenUsageEvent(seq: number, createdAt: number, inputTokens: number) {
  const usage = { inputTokens, cachedInputTokens: 0, outputTokens: 10, totalTokens: inputTokens + 10 };
  return { seq, type: 'thread/tokenUsage/updated', payload: { createdAt, turnId: `turn-${seq}`, tokenUsage: { total: usage, last: usage } } };
}

describe('sync coordinator freshness', () => {
  it('runs one follow-up pass when resetSync or a settings change lands during an in-flight pass', async () => {
    const host = createFakeHost({ settings: { openrouterApiKey: 'or-key' } });
    let creditsFetches = 0;
    let gate = deferred();
    let firstFetchSeen = deferred();
    const fetch = async (input: string | URL) => {
      if (!String(input).includes('openrouter.ai/api/v1/credits')) return new Response('', { status: 404 });
      creditsFetches += 1;
      firstFetchSeen.resolve();
      await gate.promise;
      return jsonResponse({ data: { total_credits: 10, total_usage: 1 } });
    };
    await createAiUsageMonitorPlugin(host.zcc, { now: () => fixedNow, skipInitialSync: true, homeDir: null, fetch });

    const firstPass = host.callRpc(RPC_METHODS.refreshNow);
    await firstFetchSeen.promise;
    // A plain refresh joins the in-flight pass; resetSync and settings changes need a fresh one.
    const joined = host.callRpc(RPC_METHODS.refreshNow);
    const reset = host.callRpc(RPC_METHODS.resetSync);
    host.updateSettings({ openrouterApiKey: 'or-key-2' });
    gate.resolve();
    await Promise.all([firstPass, joined, reset]);

    // Exactly one follow-up pass is shared by every caller that required fresh state.
    expect(creditsFetches).toBe(2);

    // With nothing in flight, resetSync just starts a single pass.
    gate = deferred();
    firstFetchSeen = deferred();
    gate.resolve();
    await host.callRpc(RPC_METHODS.resetSync);
    expect(creditsFetches).toBe(3);
  });
});

describe('cloud billing snapshot lifecycle', () => {
  function setup() {
    const store = createUsageStore(createSqliteDatabase(), () => fixedNow);
    const keys: CloudBillingKeys = { openrouterApiKey: 'or-key', openaiAdminKey: 'oa-key' };
    let failing = false;
    const fetch = async (input: string | URL) => {
      const url = String(input);
      if (failing) return new Response('', { status: 503 });
      if (url.includes('openrouter.ai')) return jsonResponse({ data: { total_credits: 20, total_usage: 5 } });
      if (url.includes('api.openai.com')) return jsonResponse({ data: [{ results: [{ amount: { value: 3.5 } }] }] });
      return new Response('', { status: 404 });
    };
    const collector = createCloudBillingCollector({ store, getKeys: async () => ({ ...keys }), fetch, log: silentLog, now: () => fixedNow });
    return { store, keys, collector, setFailing: (value: boolean) => { failing = value; } };
  }
  const snapshot = (store: ReturnType<typeof createUsageStore>, providerId: string) =>
    store.listQuotaSnapshots().find((s) => s.providerId === providerId);

  it('flags the stored snapshot as errored when a probe fails instead of keeping a healthy status', async () => {
    const { store, collector, setFailing } = setup();
    await collector.collectAll();
    expect(snapshot(store, 'openrouter')).toMatchObject({ status: 'ok', creditRemainingUsd: 15, errorMessage: null });
    expect(snapshot(store, 'openai-api')).toMatchObject({ status: 'ok', billedCostUsd: 3.5 });

    setFailing(true);
    const statuses = await collector.collectAll();
    expect(statuses.find((s) => s.provider === 'openrouter')).toMatchObject({ status: 'error', errorMessage: expect.stringContaining('503') });
    expect(snapshot(store, 'openrouter')).toMatchObject({ status: 'error', errorMessage: expect.stringContaining('503') });
    expect(snapshot(store, 'openai-api')).toMatchObject({ status: 'error', errorMessage: expect.stringContaining('503') });
  });

  it('removes the cloud snapshot when its key is cleared, but never a snapshot another collector owns', async () => {
    const { store, keys, collector } = setup();
    await collector.collectAll();
    store.upsertQuotaSnapshot({
      providerId: 'anthropic-api', displayName: 'Anthropic', source: 'zcc-provider-registry', status: 'unknown',
      accountLabel: null, planLabel: null, billingMode: 'billed_api', windows: [], creditRemainingUsd: null,
      creditLimitUsd: null, creditUsedUsd: null, billedCostUsd: null, errorMessage: null, updatedAtMs: fixedNow
    });

    keys.openrouterApiKey = '  ';
    keys.openaiAdminKey = '';
    const statuses = await collector.collectAll();
    expect(statuses.find((s) => s.provider === 'openrouter')).toMatchObject({ configured: false, status: 'unconfigured' });
    expect(snapshot(store, 'openrouter')).toBeUndefined();
    expect(snapshot(store, 'openai-api')).toBeUndefined();
    expect(snapshot(store, 'anthropic-api')?.source).toBe('zcc-provider-registry');
  });

  it('applies the same snapshot cleanup for single-provider refreshes', async () => {
    const { store, keys, collector } = setup();
    await collector.collectOne('openrouter');
    expect(snapshot(store, 'openrouter')?.status).toBe('ok');
    keys.openrouterApiKey = '';
    await collector.collectOne('openrouter');
    expect(snapshot(store, 'openrouter')).toBeUndefined();
    expect(collector.getStatuses().find((s) => s.provider === 'openrouter')?.status).toBe('unconfigured');
  });
});

describe('lifecycle-event indexing cursor', () => {
  it('stores the host thread timestamp so later full syncs still index new events', async () => {
    const thread: FakeThreadRecord = {
      id: 'th-1', projectId: 'p1', hostId: 'h1', environmentId: null, providerId: 'openai-api', status: 'active',
      updatedAt: fixedNow - 10_000, defaultModel: 'gpt-4.1', events: [tokenUsageEvent(1, fixedNow - 10_000, 1_000)]
    };
    const host = createFakeHost({ providers: [{ id: 'openai-api', available: true }], threads: [thread] });
    // The local clock runs ahead of every host timestamp in this scenario.
    await createAiUsageMonitorPlugin(host.zcc, { now: () => fixedNow, skipInitialSync: true, homeDir: null, fetch: async () => new Response('', { status: 404 }) });

    await host.emitThreadEvent('thread.active', { threadId: thread.id, thread: { ...thread } });
    const afterEvent = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
    expect(afterEvent.kpis.turnCount).toBe(1);

    thread.events.push(tokenUsageEvent(2, fixedNow - 5_000, 3_000));
    thread.updatedAt = fixedNow - 5_000;
    await host.callRpc(RPC_METHODS.refreshNow);
    const afterSync = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
    expect(afterSync.kpis.turnCount).toBe(2);
  });

  it('indexes events from a lifecycle event even when the host timestamp has not advanced', async () => {
    const thread: FakeThreadRecord = {
      id: 'th-2', projectId: 'p1', hostId: 'h1', environmentId: null, providerId: 'openai-api', status: 'active',
      updatedAt: fixedNow - 10_000, defaultModel: 'gpt-4.1', events: [tokenUsageEvent(1, fixedNow - 10_000, 1_000)]
    };
    const host = createFakeHost({ providers: [{ id: 'openai-api', available: true }], threads: [thread] });
    await createAiUsageMonitorPlugin(host.zcc, { now: () => fixedNow, skipInitialSync: true, homeDir: null, fetch: async () => new Response('', { status: 404 }) });
    await host.callRpc(RPC_METHODS.refreshNow);

    thread.events.push(tokenUsageEvent(2, fixedNow - 9_000, 3_000));
    await host.emitThreadEvent('thread.idle', { threadId: thread.id, thread: { ...thread } });
    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: 'all' });
    expect(dash.kpis.turnCount).toBe(2);
  });
});

describe('provider refresh Antigravity probe', () => {
  it('skips the loopback usage probe and keeps the stored windows when the panel already probed', async () => {
    const host = createFakeHost({ providers: [{ id: 'antigravity', available: true, displayName: 'Antigravity' }] });
    Object.assign(host.zcc, { server: { loopbackBaseUrl: 'http://127.0.0.1:1234' } });
    let probes = 0;
    const fetch = async (input: string | URL) => {
      if (!String(input).includes('/plugins/provider-antigravity/rpc/usage:status')) return new Response('', { status: 404 });
      probes += 1;
      return jsonResponse({ ok: true, result: { supported: true, usage: { status: 'ok', windows: [{ label: 'Five Hour', usedPercent: 10, resetsAt: null }] } } });
    };
    await createAiUsageMonitorPlugin(host.zcc, { now: () => fixedNow, skipInitialSync: true, homeDir: null, fetch });

    await host.callRpc(RPC_METHODS.refreshProvider, { providerId: 'antigravity' });
    expect(probes).toBe(1);
    await host.callRpc(RPC_METHODS.refreshProvider, { providerId: 'antigravity', skipAntigravityProbe: true });
    expect(probes).toBe(1);

    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });
    expect(dash.providers.find((p) => p.providerId === 'antigravity')?.windows[0]?.usedPercent).toBe(10);
  });
});
