import './test-environment.js';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readinessResult, ReadinessStore, runtimeMissingResult, type NativeReadinessResult } from './readiness-store.js';

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

const TTL = 1000;
const slot = { key: 'runtime-a', fingerprint: 'account-one' };
const subject = { authMethod: 'oauth-personal' as const, configuredAuthType: 'oauth-personal' };

function setup() {
  const dataDir = mkdtempSync(join(tmpdir(), 'readiness-store-'));
  tempDirs.push(dataDir);
  let now = 10_000;
  const clock = { now: () => now, advance: (ms: number) => { now += ms; } };
  /** Each store stands for one process sharing the data directory. */
  const open = () => new ReadinessStore({ now: clock.now, ttlMs: TTL });
  return { env: { ZCC_DATA_DIR: dataDir }, dataDir, clock, open };
}

function ready(checkedAt: number, models = ['gemini']): NativeReadinessResult {
  return readinessResult('session_ready', subject, { checkedAt, models: models.map(id => ({ id, name: id })) });
}

describe('ReadinessStore', () => {
  it('shares a fresh result with other processes and expires it after the TTL', () => {
    const { env, clock, open } = setup();
    const settings = open();
    settings.put(slot, ready(clock.now()), env);
    const host = open();
    expect(host.lookup(slot, env)?.state).toBe('session_ready');
    clock.advance(TTL);
    expect(host.lookup(slot, env)).toBeNull();
  });

  it('serves an expired catalog as stale only for the same runtime and account', () => {
    const { env, clock, open } = setup();
    const store = open();
    store.put(slot, ready(clock.now()), env);
    clock.advance(TTL * 2);
    expect(store.lookup(slot, env, { allowStale: true })).toMatchObject({ state: 'authenticated', catalogStale: true,
      models: [{ id: 'gemini' }] });
    expect(store.lookup({ ...slot, fingerprint: 'account-two' }, env, { allowStale: true })).toBeNull();
    expect(store.lookup({ ...slot, key: 'runtime-b' }, env, { allowStale: true })).toBeNull();
  });

  it('keeps transient failures in-process and lets the last good catalog outlive them', () => {
    const { env, clock, open } = setup();
    const store = open();
    store.put(slot, ready(clock.now()), env);
    clock.advance(TTL * 2);
    store.put(slot, readinessResult('runtime_launches', subject, { checkedAt: clock.now(), error: 'Backend unavailable' }), env);
    expect(store.lookup(slot, env, { allowStale: true })).toMatchObject({ state: 'authenticated', catalogStale: true,
      error: 'Backend unavailable' });
    expect(store.lookup(slot, env)?.state).toBe('runtime_launches');
    expect(open().lookup(slot, env)).toBeNull();
  });

  it('prefers the newer of memory and disk', () => {
    const { env, clock, open } = setup();
    const host = open();
    host.put(slot, ready(clock.now(), ['old']), env);
    clock.advance(10);
    open().put(slot, ready(clock.now(), ['new']), env);
    expect(host.lookup(slot, env)?.models.map(model => model.id)).toEqual(['new']);
  });

  it('forgets memory and disk on invalidation', () => {
    const { env, clock, open } = setup();
    const store = open();
    store.put(slot, ready(clock.now()), env);
    store.invalidate(env);
    expect(store.lookup(slot, env, { allowStale: true })).toBeNull();
    expect(open().lookup(slot, env, { allowStale: true })).toBeNull();
  });

  it('ignores corrupted or malformed persisted results', () => {
    const { env, dataDir, open } = setup();
    const file = join(dataDir, 'state', 'antigravity-native-readiness.json');
    mkdirSync(join(dataDir, 'state'), { recursive: true });
    writeFileSync(file, '{not json');
    expect(open().lookup(slot, env, { allowStale: true })).toBeNull();
    writeFileSync(file, JSON.stringify({ ...slot, result: { state: 'session_ready', checkedAt: 1, models: [{ id: 1 }], modes: [], advertisedAuthMethods: [] } }));
    expect(open().lookup(slot, env, { allowStale: true })).toBeNull();
  });

  it('builds results with unverified-runtime defaults', () => {
    expect(runtimeMissingResult('/missing/agy', { ...subject, disabledDeadMcpServers: ['dead'] })).toMatchObject({
      state: 'runtime_missing', protocolVersion: null, advertisedAuthMethods: [], disabledDeadMcpServers: ['dead'],
      error: 'Native ACP binary not found at "/missing/agy".'
    });
    expect(readinessResult('authenticated', subject)).toMatchObject({ agentVersion: null, protocolVersion: 1, models: [], modes: [] });
  });
});
