import { describe, expect, it, vi } from 'vitest';
import { KeyedRefresh, type RefreshRun } from './keyed-refresh.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

function clock(start = 1_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => { now += ms; } };
}

describe('KeyedRefresh', () => {
  it('joins concurrent refreshes of the same key', async () => {
    const refresh = new KeyedRefresh<string>();
    const pending = deferred<RefreshRun<string>>();
    const task = vi.fn(() => pending.promise);
    const both = Promise.all([refresh.run('a', task), refresh.run('a', task)]);
    pending.resolve({ result: 'done', outcome: 'success', key: 'a' });
    expect(await both).toEqual(['done', 'done']);
    expect(task).toHaveBeenCalledTimes(1);
    await refresh.run('a', async () => ({ result: 'again', outcome: 'success', key: 'a' }));
  });

  it('caches successes for the TTL under the key the run settled on', async () => {
    const time = clock();
    const refresh = new KeyedRefresh<string>({ successTtlMs: 100, now: time.now });
    await refresh.run('before-write', async () => ({ result: 'ok', outcome: 'success', key: 'after-write' }));
    expect(refresh.cached('before-write')).toBeUndefined();
    expect(refresh.cached('after-write')).toBe('ok');
    time.advance(100);
    expect(refresh.cached('after-write')).toBeUndefined();
  });

  it('backs off failures, also under a re-keyed key, until the backoff elapses', async () => {
    const time = clock();
    const refresh = new KeyedRefresh<string>({ failureBackoffMs: 50, now: time.now });
    await refresh.run('a', async () => ({ result: 'failed', outcome: 'failure', key: 'b' }));
    const task = vi.fn(async (): Promise<RefreshRun<string>> => ({ result: 'fresh', outcome: 'success', key: 'b' }));
    expect(await refresh.run('b', task, { whileBackingOff: () => 'previous' })).toBe('previous');
    expect(await refresh.run('a', task, { whileBackingOff: () => 'previous' })).toBe('fresh');
    time.advance(50);
    expect(await refresh.run('b', task, { whileBackingOff: () => 'previous' })).toBe('fresh');
    expect(await refresh.run('b', task, { whileBackingOff: () => 'previous' })).toBe('fresh');
  });

  it('never caches or backs off a discarded result', async () => {
    const refresh = new KeyedRefresh<string>({ successTtlMs: 100, failureBackoffMs: 100 });
    expect(await refresh.run('a', async () => ({ result: 'changed', outcome: 'discard', key: 'a' }))).toBe('changed');
    expect(refresh.cached('a')).toBeUndefined();
    const task = vi.fn(async (): Promise<RefreshRun<string>> => ({ result: 'retried', outcome: 'success', key: 'a' }));
    expect(await refresh.run('a', task, { whileBackingOff: () => 'previous' })).toBe('retried');
  });

  it('bounds remembered keys, dropping the oldest', async () => {
    const refresh = new KeyedRefresh<string>({ successTtlMs: 1_000, maxKeys: 2 });
    for (const key of ['a', 'b', 'c']) await refresh.run(key, async () => ({ result: key, outcome: 'success', key }));
    expect([refresh.cached('a'), refresh.cached('b'), refresh.cached('c')]).toEqual([undefined, 'b', 'c']);
  });

  it('releases the key when a refresh rejects', async () => {
    const refresh = new KeyedRefresh<string>();
    await expect(refresh.run('a', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(await refresh.run('a', async () => ({ result: 'recovered', outcome: 'success', key: 'a' }))).toBe('recovered');
  });
});
