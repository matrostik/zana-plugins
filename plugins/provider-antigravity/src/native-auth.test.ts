import './test-environment.js';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogSession, fail, FakeAcpServer, NO_REPLY, QUOTA_TEXT, usageScript } from './fake-acp-server.js';
import { isAuthExplicitlyCleared, prepareSanitizedGeminiHome, readConfiguredNativeAuthType } from './gemini-home.js';
import {
  clearCachedNativeReadiness,
  extractModelsFromSessionResult,
  getFastNativeReadiness,
  getNativeCatalog,
  isNativeCatalogSettled,
  probeNativeAcpReadiness,
  queryNativeUsage,
  startNativeAcpSignIn,
  writeNativeAcpAuthType
} from './native-auth.js';

const tempDirs: string[] = [];
function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** A Gemini home with a fake runtime binary; `dataDir` defaults to the home itself. */
function setup(prefix: string, options: { dataDir?: string; env?: NodeJS.ProcessEnv } = {}) {
  const home = makeTempDir(prefix);
  const command = join(home, 'agy.exe');
  writeFileSync(command, 'exe');
  const env: NodeJS.ProcessEnv = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: options.dataDir ?? home, ...options.env };
  return { home, command, env, sourceToken: join(home, 'antigravity-acp/acp_token.json') };
}

/** An OAuth account signed in with `account` as its refresh token. */
function signedIn(prefix: string, account = 'account-one', options: { dataDir?: string } = {}) {
  const context = setup(prefix, options);
  writeNativeAcpAuthType('oauth-personal', context.env);
  writeFileSync(context.sourceToken, JSON.stringify({ refresh_token: account }));
  const managedToken = join(prepareSanitizedGeminiHome({ env: context.env, authMethod: 'oauth-personal' }).geminiHome,
    'antigravity-acp/acp_token.json');
  return { ...context, managedToken };
}

/** Nothing from the probe was cached: reads fall back to unverified local state. */
function expectNoCachedCatalog(command: string, env: NodeJS.ProcessEnv) {
  const fast = getFastNativeReadiness({ command, args: [], authMethod: 'oauth-personal', env });
  expect(fast.state).not.toBe('session_ready');
  expect(fast.models).toEqual([]);
  expect(fast.error ?? '').not.toContain('Backend unavailable');
}

afterEach(() => {
  while (tempDirs.length > 0) {
    try {
      rmSync(tempDirs.pop()!, { recursive: true, force: true });
    } catch {}
  }
  clearCachedNativeReadiness();
  vi.restoreAllMocks();
});

describe('native-auth.ts unit tests', () => {
  it('extractModelsFromSessionResult extracts models and reasoning configuration metadata', () => {
    expect(extractModelsFromSessionResult(null)).toEqual([]);
    expect(extractModelsFromSessionResult({})).toEqual([]);

    const res = extractModelsFromSessionResult({
      configOptions: [
        {
          id: 'thinking_level',
          options: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }],
          currentValue: 'medium'
        }
      ],
      models: {
        availableModels: [
          { id: 'custom-model-1', name: 'Custom Model 1', description: 'Desc 1' },
          { modelId: 'custom-model-2', name: 'Custom Model 2', supportedReasoningEfforts: ['medium'] }
        ]
      }
    });
    expect(res).toEqual([
      {
        id: 'custom-model-1',
        name: 'Custom Model 1',
        description: 'Desc 1',
        supportedReasoningEfforts: ['low', 'medium', 'high'],
        defaultReasoningEffort: 'medium'
      },
      {
        id: 'custom-model-2',
        name: 'Custom Model 2',
        supportedReasoningEfforts: ['medium'],
        defaultReasoningEffort: 'medium'
      }
    ]);
  });

  it('discovers grouped model options without merging a conflicting legacy catalog', () => {
    expect(extractModelsFromSessionResult({
      configOptions: [{ id: 'model', options: [{ group: 'google', name: 'Google', options: [
        { value: 'gemini', name: 'Gemini' }, { value: 'gemini', name: 'Duplicate' }
      ] }] }],
      models: { availableModels: [{ id: 'unavailable-legacy-model' }] }
    }).map(model => model.id)).toEqual(['gemini']);
  });

  it('does not resurrect removed legacy models when the authoritative config catalog is empty', () => {
    expect(extractModelsFromSessionResult({ configOptions: [{ id: 'model', options: [] }],
      models: { availableModels: [{ id: 'removed', name: 'Removed' }] } })).toEqual([]);
  });

  it('preserves generic server errors instead of reporting them as expired authentication', async () => {
    const { command, env } = setup('probe-network-');
    const server = new FakeAcpServer({ initialize: () => fail('Backend temporarily unavailable') });
    const result = await probeNativeAcpReadiness({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(result.state).toBe('runtime_launches');
    expect(result.error).toContain('Backend temporarily unavailable');
  });

  it('shares concurrent catalog refresh and keeps a stale catalog after a transient failure', async () => {
    const { command, env } = signedIn('catalog-refresh-');
    let failing = false;
    let empty = false;
    const server = new FakeAcpServer({
      initialize: () => failing ? fail('Backend unavailable') : { protocolVersion: 1, authMethods: [] },
      'session/new': () => empty ? catalogSession() : catalogSession('gemini')
    });
    const options = { command, args: [], authMethod: 'oauth-personal' as const, env, spawnImpl: server.spawnImpl };
    const results = await Promise.all([getNativeCatalog(options), getNativeCatalog(options)]);
    expect(server.spawnCount).toBe(1);
    expect(results[0].models[0].id).toBe('gemini');
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 11 * 60 * 1000);
    failing = true;
    const stale = await getNativeCatalog(options);
    expect(stale.models[0].id).toBe('gemini');
    expect(stale.catalogStale).toBe(true);
    expect(stale.error).toContain('Backend unavailable');
    const backedOff = await getNativeCatalog(options);
    expect(server.spawnCount).toBe(2);
    expect(backedOff.models[0].id).toBe('gemini');
    expect(backedOff.catalogStale).toBe(true);
    expect(getFastNativeReadiness(options).models[0].id).toBe('gemini');
    failing = false; empty = true;
    const removed = await getNativeCatalog({ ...options, forceRefresh: true });
    expect(removed.models).toEqual([]);
  });

  it('queries the advertised native usage command and accumulates fragmented quota text', async () => {
    const { command, env } = setup('usage-query-');
    const server = new FakeAcpServer({
      initialize: () => ({ protocolVersion: 1, authMethods: [], agentInfo: { name: 'antigravity-acp', version: '1.4.3' } }),
      'session/new': (_params, context) => {
        context.after(5, () => context.update({ sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] },
          'usage-session'));
        return { sessionId: 'usage-session', _meta: { antigravity: { tier: { name: 'Test Pro' } } } };
      },
      'session/prompt': (params, context) => {
        expect(params.prompt).toEqual([{ type: 'text', text: '/usage' }]);
        for (const text of ['### Quota Limits\n- **Gemini**\n', '  - **Weekly:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)']) {
          context.update({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } }, 'usage-session');
        }
        return { stopReason: 'end_turn' };
      }
    });
    const options = { command, args: [], authMethod: 'oauth-personal' as const, env, spawnImpl: server.spawnImpl };
    const [result] = await Promise.all([queryNativeUsage(options), queryNativeUsage(options)]);
    expect(result.usage.status).toBe('ok');
    expect(result.usage.windows[0].usedPercent).toBe(86);
    expect(result.usage.planLabel).toBe('Test Pro');
    expect(server.endedCount).toBe(1);
    await queryNativeUsage(options);
    expect(server.spawnCount).toBe(1);
  });

  it('does not send usage to a model when the native command is not advertised', async () => {
    const { command, env } = setup('usage-unsupported-');
    const server = new FakeAcpServer();
    const result = await queryNativeUsage({ command, args: [], authMethod: 'oauth-personal', env, spawnImpl: server.spawnImpl });
    expect(result.usage.status).toBe('error');
    expect(result.usage.message).toContain('does not advertise /usage');
    expect(server.methods()).not.toContain('session/prompt');
  });

  it('reports a bounded usage timeout and closes the diagnostic process', async () => {
    const { command, env } = setup('usage-timeout-');
    const server = new FakeAcpServer({ initialize: () => NO_REPLY });
    const result = await queryNativeUsage({ command, args: [], authMethod: 'oauth-personal', timeoutMs: 10, env,
      spawnImpl: server.spawnImpl });
    expect(result.usage.status).toBe('error');
    expect(result.usage.message).toContain('timed out after 10ms');
    expect(server.endedCount).toBe(1);
  });

  it('uses a session catalog update received before session/new resolves', async () => {
    const { command, env } = setup('catalog-update-');
    const server = new FakeAcpServer({
      'session/new': (_params, context) => {
        context.update({ sessionUpdate: 'config_option_update', configOptions: [{ id: 'model', options: [{ value: 'updated', name: 'Updated' }] }] });
        return { sessionId: 's1' };
      }
    });
    const result = await probeNativeAcpReadiness({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(result.models.map(model => model.id)).toEqual(['updated']);
  });

  it('waits briefly for a catalog update delivered after the session/new response', async () => {
    const { command, env } = setup('catalog-late-update-');
    const server = new FakeAcpServer({
      'session/new': (_params, context) => {
        context.after(20, () => context.update({ sessionUpdate: 'config_option_update',
          configOptions: [{ id: 'model', options: [{ value: 'late', name: 'Late' }] }] }));
        return { sessionId: 's1' };
      }
    });
    const result = await probeNativeAcpReadiness({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(result.models.map(model => model.id)).toEqual(['late']);
  });

  it('discards a catalog whose account signed out while discovery was running', async () => {
    const { command, env } = signedIn('catalog-signout-');
    const server = new FakeAcpServer({
      'session/new': () => {
        writeNativeAcpAuthType(null, env);
        return catalogSession('gemini');
      }
    });
    const result = await probeNativeAcpReadiness({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(result.state).not.toBe('session_ready');
    expect(result.models).toEqual([]);
    expect(result.error).toContain('sign-in changed');
    expectNoCachedCatalog(command, env);
  });

  it('does not fall back to the previous account catalog when credentials change mid-refresh', async () => {
    const { command, env, managedToken } = signedIn('catalog-account-switch-');
    let switchAccount = false;
    const server = new FakeAcpServer({
      'session/new': () => {
        if (!switchAccount) return catalogSession('gemini');
        // Another process switches accounts without touching this process's in-memory generation.
        writeFileSync(managedToken, '{"refresh_token":"account-two"}');
        return fail('Backend unavailable');
      }
    });
    const options = { command, args: [], authMethod: 'oauth-personal' as const, env, spawnImpl: server.spawnImpl };
    expect((await getNativeCatalog(options)).models[0].id).toBe('gemini');
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000);
    switchAccount = true;
    const afterSwitch = await getNativeCatalog(options);
    expect(afterSwitch.models).toEqual([]);
    expect(afterSwitch.catalogStale).toBeUndefined();
  });

  it('keeps an empty session_ready catalog unsettled so a missed late update is retried', () => {
    const empty = { state: 'session_ready', models: [] } as unknown as Parameters<typeof isNativeCatalogSettled>[0];
    const ready = { state: 'session_ready', models: [{ id: 'gemini' }] } as unknown as Parameters<typeof isNativeCatalogSettled>[0];
    expect(isNativeCatalogSettled(empty)).toBe(false);
    expect(isNativeCatalogSettled(ready)).toBe(true);
    expect(isNativeCatalogSettled(ready, true)).toBe(false);
  });

  it('backs off a failed catalog probe that wrote its own headless auth type', async () => {
    const { command, env } = setup('catalog-headless-backoff-', { env: { GEMINI_API_KEY: 'test-key' } });
    const server = new FakeAcpServer({
      initialize: () => ({ protocolVersion: 1, authMethods: [{ id: 'gemini-api-key' }] }),
      'session/new': () => fail('Backend unavailable')
    });
    const options = { command, args: [], authMethod: 'gemini-api-key' as const, env, spawnImpl: server.spawnImpl };
    expect((await getNativeCatalog(options)).error).toContain('Backend unavailable');
    expect(readConfiguredNativeAuthType({ ...env, GEMINI_HOME: prepareSanitizedGeminiHome({ env }).geminiHome })).toBe('gemini-api-key');
    await getNativeCatalog(options);
    expect(server.spawnCount).toBe(1);
  });

  it('does not cache a probe failure whose account changed while discovery was running', async () => {
    const { command, env, managedToken } = signedIn('catalog-failure-switch-');
    const server = new FakeAcpServer({
      'session/new': () => {
        writeFileSync(managedToken, '{"refresh_token":"account-two"}');
        return fail('Backend unavailable');
      }
    });
    const result = await probeNativeAcpReadiness({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(result.error).toContain('sign-in changed');
    expectNoCachedCatalog(command, env);
  });

  it('re-queries usage when the source account changes within the usage cache TTL', async () => {
    const { command, env, sourceToken } = signedIn('usage-account-switch-', 'account-one',
      { dataDir: makeTempDir('usage-account-switch-data-') });
    const server = new FakeAcpServer(usageScript());
    const options = { command, args: [], authMethod: 'oauth-personal' as const, env, spawnImpl: server.spawnImpl };
    expect((await queryNativeUsage(options)).usage.status).toBe('ok');
    writeFileSync(sourceToken, '{"refresh_token":"account-two"}');
    const future = new Date(Date.now() + 60_000);
    utimesSync(sourceToken, future, future);
    await queryNativeUsage(options);
    expect(server.spawnCount).toBe(2);
  });

  it.each(['sign-out', 'managed account switch', 'source account switch', 'failed source account switch'])
  ('discards usage after a %s during the query', async (change) => {
    const { command, env, sourceToken, managedToken } = signedIn('usage-pending-account-', 'account-one',
      { dataDir: makeTempDir('usage-pending-data-') });
    let changeAccount = true;
    const server = new FakeAcpServer(usageScript(QUOTA_TEXT, {
      'session/new': (_params, context) => {
        context.update({ sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] });
        return { sessionId: 's1', _meta: { antigravity: { tier: { name: 'Old account tier' } } } };
      },
      'session/prompt': (_params, context) => {
        if (changeAccount) {
          if (change === 'sign-out') writeNativeAcpAuthType(null, env);
          else writeFileSync(change === 'managed account switch' ? managedToken : sourceToken, '{"refresh_token":"account-two"}');
          if (change === 'failed source account switch') return fail('Old account backend detail');
        }
        context.update({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: QUOTA_TEXT } });
        return { stopReason: 'end_turn' };
      }
    }));
    const options = { command, args: [], authMethod: 'oauth-personal' as const, env, spawnImpl: server.spawnImpl };
    const [first, concurrent] = await Promise.all([queryNativeUsage(options), queryNativeUsage(options)]);
    for (const result of [first, concurrent]) {
      expect(result.usage.status).toBe('error');
      expect(result.usage.windows).toEqual([]);
      expect(result.usage.planLabel).toBeNull();
      expect(result.usage.message).toContain('sign-in changed');
    }
    // Returning to the original credentials must not expose an obsolete cached success.
    changeAccount = false;
    writeNativeAcpAuthType('oauth-personal', env);
    writeFileSync(sourceToken, '{"refresh_token":"account-one"}');
    writeFileSync(managedToken, '{"refresh_token":"account-one"}');
    expect((await queryNativeUsage(options)).usage.status).toBe('ok');
    expect(server.spawnCount).toBe(2);
  });

  it('discards a catalog when only the source account changes during discovery', async () => {
    const { command, env, sourceToken } = signedIn('catalog-source-switch-', 'account-one',
      { dataDir: makeTempDir('catalog-source-data-') });
    const server = new FakeAcpServer({
      'session/new': () => {
        writeFileSync(sourceToken, '{"refresh_token":"account-two"}');
        return catalogSession('old');
      }
    });
    const result = await getNativeCatalog({ command, args: [], authMethod: 'oauth-personal', env, spawnImpl: server.spawnImpl });
    expect(result.models).toEqual([]);
    expect(result.error).toContain('sign-in changed');
    expectNoCachedCatalog(command, env);
  });

  it.each(['catalog', 'usage'])('discards %s when credentials change during headless authentication', async (probe) => {
    const { command, env } = setup('headless-account-switch-', { env: { GEMINI_API_KEY: 'original-key' } });
    const server = new FakeAcpServer(usageScript(QUOTA_TEXT, {
      initialize: () => ({ protocolVersion: 1, authMethods: [{ id: 'gemini-api-key' }] }),
      authenticate: () => {
        env.GEMINI_API_KEY = 'replacement-key';
        return {};
      },
      'session/new': (_params, context) => {
        context.update({ sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] });
        return catalogSession('old');
      }
    }));
    const options = { command, args: [], authMethod: 'gemini-api-key' as const, env, spawnImpl: server.spawnImpl, forceRefresh: true };
    if (probe === 'catalog') {
      const result = await probeNativeAcpReadiness(options);
      expect(result.models).toEqual([]);
      expect(result.error).toContain('sign-in changed');
    } else {
      const result = await queryNativeUsage(options);
      expect(result.usage.status).toBe('error');
      expect(result.usage.windows).toEqual([]);
      expect(result.usage.message).toContain('sign-in changed');
    }
  });

  it.each((['gemini-api-key', 'agent-platform'] as const).flatMap(authMethod =>
    ['catalog first', 'usage first', 'sign-out', 'account switch'].map(completion => ({ authMethod, completion }))))
  ('coordinates concurrent headless catalog and usage authentication: $authMethod, $completion', async ({ authMethod, completion }) => {
    const { command, env } = setup('headless-concurrent-', { env: { GEMINI_API_KEY: 'same-account', GOOGLE_CLOUD_PROJECT: 'same-project' } });
    const pendingAuth: Array<() => void> = [];
    const server = new FakeAcpServer(usageScript(QUOTA_TEXT, {
      initialize: () => ({ protocolVersion: 1, authMethods: [{ id: authMethod }] }),
      authenticate: () => new Promise(resolve => pendingAuth.push(() => resolve({}))),
      'session/new': (_params, context) => {
        context.update({ sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] });
        return catalogSession('gemini');
      }
    }));
    const options = { command, args: [], authMethod, env, spawnImpl: server.spawnImpl };
    const catalog = getNativeCatalog(options);
    const usage = queryNativeUsage(options);
    await vi.waitFor(() => expect(pendingAuth).toHaveLength(2));
    const first = completion === 'usage first' ? 1 : 0;
    pendingAuth[first]();
    // Let the first diagnostic finish its own settings write before the other authenticates.
    if (first === 0) expect((await catalog).state).toBe('session_ready');
    else expect((await usage).usage.status).toBe('ok');
    if (completion === 'sign-out') writeNativeAcpAuthType(null, env);
    if (completion === 'account switch') {
      if (authMethod === 'gemini-api-key') env.GEMINI_API_KEY = 'different-account';
      else env.GOOGLE_CLOUD_PROJECT = 'different-project';
    }
    pendingAuth[1 - first]();
    if (completion === 'sign-out' || completion === 'account switch') {
      const result = await usage;
      expect(result.usage.status).toBe('error');
      expect(result.usage.message).toContain('sign-in changed');
      expect(result.usage.windows).toEqual([]);
      if (completion === 'sign-out') expect(isAuthExplicitlyCleared(env)).toBe(true);
    } else {
      expect((await catalog).models.map(model => model.id)).toEqual(['gemini']);
      expect((await usage).usage.status).toBe('ok');
      // Both caches must survive the other diagnostic's completion.
      expect((await getNativeCatalog(options)).state).toBe('session_ready');
      expect((await queryNativeUsage(options)).usage.status).toBe('ok');
      expect(server.spawnCount).toBe(2);
    }
  });

  it.each(['oauth-personal', 'gemini-api-key'] as const)
  ('accepts usage with %s after token refresh or its own auth settings write', async (authMethod) => {
    const { command, env } = setup('usage-auth-stable-', { env: { GEMINI_API_KEY: 'stable-key' } });
    if (authMethod === 'oauth-personal') writeNativeAcpAuthType(authMethod, env);
    const tokenPath = join(prepareSanitizedGeminiHome({ env, authMethod }).geminiHome, 'antigravity-acp/acp_token.json');
    writeFileSync(tokenPath, '{"refresh_token":"same-account","access_token":"old"}');
    const server = new FakeAcpServer(usageScript(QUOTA_TEXT, {
      initialize: () => ({ protocolVersion: 1, authMethods: [{ id: authMethod }] }),
      'session/new': (_params, context) => {
        writeFileSync(tokenPath, '{"refresh_token":"same-account","access_token":"refreshed"}');
        context.update({ sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] });
        return { sessionId: 's1' };
      }
    }));
    const options = { command, args: [], authMethod, env, spawnImpl: server.spawnImpl };
    expect((await queryNativeUsage(options)).usage.status).toBe('ok');
    expect((await queryNativeUsage(options)).usage.status).toBe('ok');
    expect(server.spawnCount).toBe(1);
  });

  it('keeps waiting for /usage when an earlier command update omits it', async () => {
    const { command, env } = setup('usage-late-command-');
    const commands = (names: string[]) => ({ sessionUpdate: 'available_commands_update', availableCommands: names.map(name => ({ name })) });
    const server = new FakeAcpServer(usageScript(QUOTA_TEXT, {
      'session/new': (_params, context) => {
        context.after(5, () => context.update(commands(['plan'])));
        context.after(15, () => context.update(commands(['plan', 'usage'])));
        return { sessionId: 's1' };
      }
    }));
    const result = await queryNativeUsage({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(result.usage.status).toBe('ok');
  });

  it('reports oversized usage output instead of a generic probe close', async () => {
    const { command, env } = setup('usage-oversized-');
    const server = new FakeAcpServer(usageScript('x'.repeat(40_000), {
      'session/prompt': (_params, context) => {
        context.update({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'x'.repeat(40_000) } });
        return NO_REPLY;
      }
    }));
    const result = await queryNativeUsage({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(result.usage.status).toBe('error');
    expect(result.usage.message).toContain('exceeded');
  });

  it('stops usage that unexpectedly requests a tool', async () => {
    const { command, env } = setup('usage-tool-call-');
    const server = new FakeAcpServer(usageScript(QUOTA_TEXT, {
      'session/prompt': (_params, context) => {
        context.update({ sessionUpdate: 'tool_call', toolCallId: 't1' });
        return NO_REPLY;
      }
    }));
    const result = await queryNativeUsage({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(result.usage.status).toBe('error');
    expect(result.usage.message).toBe('Native usage unexpectedly requested tools; the diagnostic session was stopped.');
  });

  it('getFastNativeReadiness validates local oauth and api-key credentials', () => {
    const home = makeTempDir('readiness-test-');
    const env = { ...process.env, GEMINI_HOME: home };

    expect(
      getFastNativeReadiness({ command: 'C:/missing/agy_acp_server.exe', args: [], authMethod: 'oauth-personal', env })
        .state
    ).toBe('runtime_missing');

    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');
    expect(getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env }).state).toBe(
      'sign_in_required'
    );

    const acpDir = join(home, 'antigravity-acp');
    mkdirSync(acpDir, { recursive: true });
    writeFileSync(join(acpDir, 'acp_token.json'), JSON.stringify({ token: '123456789012' }));
    writeNativeAcpAuthType('oauth-personal', env);
    expect(getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env }).state).toBe(
      'authenticated'
    );

    writeNativeAcpAuthType(null, env);
    expect(getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env }).state).toBe(
      'sign_in_required'
    );

    expect(
      getFastNativeReadiness({
        command: fakeExe,
        args: [],
        authMethod: 'gemini-api-key',
        env: { ...env, GEMINI_API_KEY: 'test-api-key' }
      }).state
    ).toBe('authenticated');
  });

  it('getFastNativeReadiness validates agent-platform credentials', () => {
    const home = makeTempDir('readiness-platform-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    expect(getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'agent-platform', env }).state).toBe(
      'sign_in_required'
    );
    expect(
      getFastNativeReadiness({
        command: fakeExe,
        args: [],
        authMethod: 'agent-platform',
        env: { ...env, GOOGLE_APPLICATION_CREDENTIALS: 'creds.json' }
      }).state
    ).toBe('authenticated');
    expect(
      getFastNativeReadiness({
        command: fakeExe,
        args: [],
        authMethod: 'agent-platform',
        env: { ...env, CLOUD_ML_PROJECT_ID: 'proj-1' }
      }).state
    ).toBe('authenticated');
  });

  it('probeNativeAcpReadiness runs initialize and session/new', async () => {
    const { command, env } = setup('probe-test-');
    const server = new FakeAcpServer({
      initialize: () => ({ protocolVersion: 1, agentInfo: { version: '1.4.3' }, authMethods: [{ id: 'oauth-personal' }] }),
      'session/new': () => ({
        modes: { availableModes: [{ id: 'default' }, { id: 'auto_edit' }] },
        configOptions: [{ id: 'model', options: [{ value: 'gemini-4-argon', name: 'Gemini 4 Argon' }] }],
        _meta: { antigravity: { tier: { name: 'Google One AI Premium' } } }
      })
    });
    const res = await probeNativeAcpReadiness({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });

    expect(res.state).toBe('session_ready');
    expect(res.agentVersion).toBe('1.4.3');
    expect(res.tierName).toBe('Google One AI Premium');
    expect(res.modes).toEqual(['default', 'auto_edit']);
    expect(getFastNativeReadiness({ command, args: [], authMethod: 'oauth-personal', env }).state).toBe('session_ready');
  });

  it('probeNativeAcpReadiness handles missing binary and error rejections', async () => {
    const missing = await probeNativeAcpReadiness({
      command: 'C:/missing/agy_acp.exe',
      args: [],
      authMethod: 'oauth-personal'
    });
    expect(missing.state).toBe('runtime_missing');

    const { command } = setup('probe-err-');
    const server = new FakeAcpServer({ initialize: () => fail('Authentication required') });
    const res = await probeNativeAcpReadiness({ command, args: [], authMethod: 'oauth-personal',
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(res.state).toBe('sign_in_required');
  });

  it('probeNativeAcpReadiness detects unsupported protocolVersion and unadvertised auth', async () => {
    const { command, env } = setup('probe-unsupported-');
    const probe = (initialize: Record<string, unknown>) => probeNativeAcpReadiness({ command, args: [],
      authMethod: 'oauth-personal', env, spawnImpl: new FakeAcpServer({ initialize: () => initialize }).spawnImpl, forceRefresh: true });

    const res1 = await probe({ protocolVersion: 99 });
    expect(res1.state).toBe('runtime_launches');
    expect(res1.error).toContain('Unsupported ACP protocolVersion');

    const res2 = await probe({ protocolVersion: 1, authMethods: [{ id: 'oauth-business' }] });
    expect(res2.state).toBe('runtime_launches');
    expect(res2.error).toContain('Selected auth method "oauth-personal" is not advertised');
  });

  it('probeNativeAcpReadiness catches interactive sign in required from stderr', async () => {
    const { command, env } = setup('probe-stderr-');
    const server = new FakeAcpServer({
      'session/new': (_params, context) => {
        context.after(5, () => context.stderr('Credentials missing or invalid. Please sign in.'));
        return NO_REPLY;
      }
    });
    const res = await probeNativeAcpReadiness({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(res.state).toBe('sign_in_required');
    expect(res.error).toContain('Google OAuth credentials are missing or expired');
  });

  it('startNativeAcpSignIn handles missing binary and unsupported auth method', async () => {
    const missing = await startNativeAcpSignIn({
      command: 'C:/missing/agy.exe',
      args: [],
      authMethod: 'oauth-personal'
    });
    expect(missing.state).toBe('runtime_missing');

    const { command } = setup('signin-unsupported-');
    const server = new FakeAcpServer({ initialize: () => ({ protocolVersion: 1, authMethods: [{ id: 'gemini-api-key' }] }) });
    const res = await startNativeAcpSignIn({ command, args: [], authMethod: 'oauth-personal', spawnImpl: server.spawnImpl });
    expect(res.state).toBe('sign_in_required');
    expect(server.methods()).not.toContain('authenticate');
  });

  it('startNativeAcpSignIn completes interactive login flow and captures OAuth URL', async () => {
    const { command, env } = setup('signin-success-');
    const server = new FakeAcpServer({
      initialize: (_params, context) => {
        context.stderr('Open the following link to authenticate: https://accounts.google.com/o/oauth2/auth?client_id=123 in browser');
        return { protocolVersion: 1, authMethods: [{ id: 'oauth-personal' }] };
      },
      'session/new': () => ({ sessionId: 's1', models: { availableModels: [{ id: 'gemini-4-argon', name: 'Gemini 4 Argon' }] } })
    });
    const capturedUrls: string[] = [];
    const res = await startNativeAcpSignIn({ command, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: server.spawnImpl, onAuthUrl: (url) => capturedUrls.push(url) });
    expect(res.state).toBe('session_ready');
    expect(res.models.map(model => model.id)).toEqual(['gemini-4-argon']);
    expect(capturedUrls).toHaveLength(1);
  });

  it('startNativeAcpSignIn adopts a catalog update that arrives after session/new', async () => {
    const { command, env } = setup('signin-late-catalog-');
    const server = new FakeAcpServer({
      'session/new': (_params, context) => {
        context.after(20, () => context.update({ sessionUpdate: 'config_option_update',
          configOptions: [{ id: 'model', options: [{ value: 'late', name: 'Late' }] }] }));
        return { sessionId: 's1' };
      }
    });
    const res = await startNativeAcpSignIn({ command, args: [], authMethod: 'oauth-personal', env, spawnImpl: server.spawnImpl });
    expect(res.state).toBe('session_ready');
    expect(res.models.map(model => model.id)).toEqual(['late']);
    expect(getFastNativeReadiness({ command, args: [], authMethod: 'oauth-personal', env }).models.map(model => model.id)).toEqual(['late']);
  });

  it('serves a verified catalog until it expires, then as stale for the same account only', async () => {
    const { command, env, managedToken } = signedIn('cache-expiry-');
    const server = new FakeAcpServer({ 'session/new': () => catalogSession('gemini') });
    const options = { command, args: [], authMethod: 'oauth-personal' as const, env };
    await probeNativeAcpReadiness({ ...options, spawnImpl: server.spawnImpl, forceRefresh: true });
    expect(getFastNativeReadiness(options).state).toBe('session_ready');

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 20 * 60 * 1000);
    const stale = getFastNativeReadiness(options);
    expect(stale.state).toBe('authenticated');
    expect(stale.models.map(model => model.id)).toEqual(['gemini']);
    expect(stale.catalogStale).toBe(true);

    writeFileSync(managedToken, '{"refresh_token":"other-account"}');
    expect(getFastNativeReadiness(options).models).toEqual([]);
  });
});
