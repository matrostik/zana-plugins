import { describe, expect, it, vi } from 'vitest';
import createAiUsageMonitorPlugin from '../../server.ts';
import { createComparisonSetup } from '../server/comparison-setup.ts';
import { createFakeHost } from './fake-host.ts';
import { COMPARISON_SETUP_RPC } from '../shared/comparison-setup.ts';

const protector = {
  available: true,
  encrypt: async (value: string) => Buffer.from(value).toString('base64'),
  decrypt: async (value: string) => Buffer.from(value, 'base64').toString()
};

function setup(fetch = vi.fn().mockResolvedValue(Response.json({ actual: ['sample'] }))) {
  const host = createFakeHost();
  const service = createComparisonSetup(host.zcc, { protector, fetch, now: () => 1000 });
  return { host, service, fetch };
}

describe('comparison setup RPC', () => {
  it('captures a real-shaped opaque response without assuming API field names or returning a key', async () => {
    const { host, service, fetch } = setup();
    const status = await host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'private-api-key' });
    expect(fetch).toHaveBeenCalledWith('https://artificialanalysis.ai/api/v2/language/models/free', expect.objectContaining({
      headers: { 'x-api-key': 'private-api-key' }, redirect: 'error'
    }));
    expect(status).toMatchObject({ configured: true, connectedAtMs: 1000 });
    expect(JSON.stringify(status)).not.toContain('private-api-key');
    expect(service.readSample()).toEqual({ fetchedAtMs: 1000, body: { actual: ['sample'] } });
  });

  it.each([401, 403, 429, 500])('shows an actionable sanitized error for HTTP %s', async (code) => {
    const { host, service } = setup(vi.fn().mockResolvedValue(new Response('private-api-key', { status: code })));
    await expect(host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'private-api-key' })).rejects.toThrow(
      code === 401 ? /invalid/i : code === 403 ? /access/i : code === 429 ? /rate limit/i : /unavailable/i
    );
    expect(service.readSample()).toBeNull();
    expect(await host.callRpc(COMPARISON_SETUP_RPC.status)).toMatchObject({ configured: false });
  });

  it('honors Retry-After and persists the cooldown across plugin reloads', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 429, headers: {
      'Retry-After': '60', 'X-RateLimit-Reset': '120', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Limit': '100'
    } }));
    const { host } = setup(fetch);
    await expect(host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'key' })).rejects.toThrow(/rate limit/i);
    createComparisonSetup(host.zcc, { protector, fetch, now: () => 1000 });
    await expect(host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'key' })).rejects.toThrow(/paused/i);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await host.callRpc(COMPARISON_SETUP_RPC.status)).toMatchObject({ retryAtMs: 120000 });
  });

  it('never saves a response which echoes the key', async () => {
    const { host, service } = setup(vi.fn().mockResolvedValue(Response.json({ echoed: 'private-api-key' })));
    await expect(host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'private-api-key' })).rejects.toThrow(/unsafe/i);
    expect(service.readSample()).toBeNull();
  });

  it('validates IPC shape and rejects overlapping connection attempts', async () => {
    let finish!: (response: Response) => void;
    const fetch = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    const { host } = setup(fetch);
    await expect(host.callRpc(COMPARISON_SETUP_RPC.connect, null)).rejects.toThrow(/API key/i);
    const first = host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'valid-key' });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await expect(host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'valid-key' })).rejects.toThrow(/already/i);
    finish(Response.json({ example: true }));
    await first;
  });

  it('removes the encrypted key and saved data without returning either', async () => {
    const { host, service } = setup();
    await host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'private-api-key' });
    expect(await host.callRpc(COMPARISON_SETUP_RPC.removeKey)).toMatchObject({ configured: false, connectedAtMs: null });
    expect(service.readSample()).toBeNull();
  });

  it('handles offline and invalid JSON responses without propagating sensitive diagnostics', async () => {
    const offline = setup(vi.fn().mockRejectedValue(new Error('private-api-key')));
    await expect(offline.host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'private-api-key' })).rejects.toThrow('Could not reach Artificial Analysis');
    const malformed = setup(vi.fn().mockResolvedValue(new Response('<html>failure</html>')));
    await expect(malformed.host.callRpc(COMPARISON_SETUP_RPC.connect, { key: 'private-api-key' })).rejects.toThrow('unrecognized response');
  });

  it('wires comparison RPCs and comparison-sample CLI through createAiUsageMonitorPlugin', async () => {
    const host = createFakeHost();
    await createAiUsageMonitorPlugin(host.zcc, { skipInitialSync: true, homeDir: null, now: () => 5000 });
    expect(await host.callRpc(COMPARISON_SETUP_RPC.status)).toMatchObject({ configured: false, connectedAtMs: null });
    expect((await host.runCli(['comparison-sample'])).exitCode).toBe(1);
    host.db
      .prepare('INSERT OR REPLACE INTO comparison_source_sample (id, fetched_at_ms, body_json) VALUES (1, ?, ?)')
      .run(5000, JSON.stringify({ status: 200, data: [{ id: 'm1', name: 'Model 1' }, { id: 'm2', name: 'Model 2' }, { id: 'm3', name: 'Model 3' }] }));
    const shapeRes = await host.runCli(['comparison-sample']);
    expect(shapeRes.exitCode).toBe(0);
    expect(JSON.parse(shapeRes.stdout ?? '{}')).toMatchObject({
      fetchedAtMs: 5000,
      shape: { status: 200, data: { kind: 'array', length: 3 } }
    });
    const rawRes = await host.runCli(['comparison-sample', '--raw']);
    expect(rawRes.exitCode).toBe(0);
    expect(JSON.parse(rawRes.stdout ?? '{}')).toMatchObject({
      fetchedAtMs: 5000,
      body: { status: 200, data: [{ id: 'm1', name: 'Model 1' }, { id: 'm2', name: 'Model 2' }, { id: 'm3', name: 'Model 3' }] }
    });
    await host.dispose();
  });
});
