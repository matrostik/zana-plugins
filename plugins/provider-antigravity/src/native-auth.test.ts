import { EventEmitter } from 'node:events';
import './test-environment.js';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCachedNativeReadiness,
  computeCredentialFingerprint,
  extractModelsFromSessionResult,
  getCachedNativeReadiness,
  getFastNativeReadiness,
  getNativeCatalog,
  getNativeAcpSettingsPath,
  getNativeAcpTokenPath,
  hasNativeAcpToken,
  isAuthExplicitlyCleared,
  isNativeCatalogSettled,
  isValidGoogleAuthMethod,
  prepareSanitizedGeminiHome,
  probeNativeAcpReadiness,
  readConfiguredNativeAuthType,
  readNativeAcpSettings,
  queryNativeUsage,
  resolveGeminiHome,
  startNativeAcpSignIn,
  writeNativeAcpAuthType
} from './native-auth.js';

const tempDirs: string[] = [];
function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createMockChild() {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const stdin = { write: vi.fn(), end: vi.fn() };
  const child = new EventEmitter() as any;
  child.stdout = stdout;
  child.stderr = stderr;
  child.stdin = stdin;
  child.pid = 98765;
  child.kill = vi.fn();
  return child;
}

let savedGeminiHome: string | undefined;

beforeEach(() => {
  savedGeminiHome = process.env.GEMINI_HOME;
});

afterEach(() => {
  if (savedGeminiHome === undefined) delete process.env.GEMINI_HOME;
  else process.env.GEMINI_HOME = savedGeminiHome;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
  clearCachedNativeReadiness();
  vi.restoreAllMocks();
});

describe('native-auth.ts unit tests', () => {
  it('validates google auth methods', () => {
    expect(isValidGoogleAuthMethod('oauth-personal')).toBe(true);
    expect(isValidGoogleAuthMethod('oauth-business')).toBe(true);
    expect(isValidGoogleAuthMethod('gemini-api-key')).toBe(true);
    expect(isValidGoogleAuthMethod('agent-platform')).toBe(true);
    expect(isValidGoogleAuthMethod('invalid-auth')).toBe(false);
    expect(isValidGoogleAuthMethod(null)).toBe(false);
    expect(isValidGoogleAuthMethod(123)).toBe(false);
  });

  it('resolves gemini home and settings/token paths', () => {
    process.env.GEMINI_HOME = 'C:/CustomGeminiHome';
    expect(resolveGeminiHome()).toContain('CustomGeminiHome');
    expect(getNativeAcpSettingsPath()).toContain('settings.json');
    expect(getNativeAcpTokenPath()).toContain('acp_token.json');

    delete process.env.GEMINI_HOME;
    expect(resolveGeminiHome()).toContain('.gemini');
  });

  it('reads and checks token and settings under various conditions', () => {
    const home = makeTempDir('gemini-auth-test-');
    const env = { ...process.env, GEMINI_HOME: home };
    const acpDir = join(home, 'antigravity-acp');
    mkdirSync(acpDir, { recursive: true });

    expect(hasNativeAcpToken(env)).toBe(false);
    writeFileSync(join(acpDir, 'acp_token.json'), '{}');
    expect(hasNativeAcpToken(env)).toBe(false);

    writeFileSync(join(acpDir, 'acp_token.json'), JSON.stringify({ access_token: '1234567890', refresh_token: 'abcdef' }));
    expect(hasNativeAcpToken(env)).toBe(true);
    expect(readNativeAcpSettings(env)).toBeNull();

    writeFileSync(join(acpDir, 'settings.json'), 'INVALID_JSON');
    expect(readNativeAcpSettings(env)).toBeNull();

    writeNativeAcpAuthType('oauth-business', env);
    expect(readConfiguredNativeAuthType(env)).toBe('oauth-business');

    writeNativeAcpAuthType(null, env);
    expect(readConfiguredNativeAuthType(env)).toBeNull();
    expect(isAuthExplicitlyCleared(env)).toBe(true);
  });

  it('prepareSanitizedGeminiHome sanitizes dead MCP pipes in a separate ZCC home without modifying source', () => {
    const home = makeTempDir('gemini-mcp-test-');
    const stateHome = makeTempDir('gemini-state-');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: stateHome };

    const acpDir = join(home, 'antigravity-acp');
    mkdirSync(acpDir, { recursive: true });
    writeFileSync(join(acpDir, 'acp_token.json'), JSON.stringify({ token: 'abc-token-1234567' }));

    const configDir = join(home, 'config');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'mcp_config.json'),
      JSON.stringify({
        mcpServers: {
          activeServer: { command: 'node', args: ['server.js'] },
          deadProxy: { command: 'node', args: ['some/path/mcp_proxy_bundle.js', 'tool-antigravityide'] }
        }
      })
    );

    const res = prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    expect(res.geminiHome).not.toBe(home);
    expect(res.disabledDeadMcpServers).toContain('deadProxy');
    expect(readConfiguredNativeAuthType({ ...env, GEMINI_HOME: res.geminiHome })).toBe('oauth-personal');

    const sourceMcp = JSON.parse(readFileSync(join(configDir, 'mcp_config.json'), 'utf8'));
    expect(sourceMcp.mcpServers.deadProxy).toBeDefined();
  });

  it('prepareSanitizedGeminiHome syncs between managed home and user home', () => {
    const userHome = makeTempDir('user-home-');
    const stateHome = makeTempDir('state-home-');
    const env: NodeJS.ProcessEnv = { USERPROFILE: userHome, HOME: userHome, ZCC_DATA_DIR: stateHome };
    delete env.GEMINI_HOME;

    const userAcp = join(userHome, '.gemini', 'antigravity-acp');
    mkdirSync(userAcp, { recursive: true });
    writeFileSync(join(userAcp, 'acp_token.json'), JSON.stringify({ token: 'user-token-12345' }));

    const res = prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    expect(res.geminiHome).toContain(stateHome);

    const syncedToken = join(stateHome, 'state', 'antigravity-gemini-home', 'antigravity-acp', 'acp_token.json');
    expect(readFileSync(syncedToken, 'utf8')).toContain('user-token-12345');
  });

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

  it('invalidates cloud credentials when their contents change at the same path', () => {
    const home = makeTempDir('cloud-identity-');
    const credentialsPath = join(home, 'credentials.json');
    const env = { GEMINI_HOME: home, GOOGLE_APPLICATION_CREDENTIALS: credentialsPath };
    writeFileSync(credentialsPath, '{"account":"one"}');
    const first = computeCredentialFingerprint(env, 'agent-platform');
    writeFileSync(credentialsPath, '{"account":"two"}');
    expect(computeCredentialFingerprint(env, 'agent-platform')).not.toBe(first);
  });

  it('preserves generic server errors instead of reporting them as expired authentication', async () => {
    const home = makeTempDir('probe-network-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => child.stdout.emit('data', JSON.stringify({ jsonrpc: '2.0', id: msg.id,
        error: { code: -32000, message: 'Backend temporarily unavailable' } }) + '\n'));
    });
    const result = await probeNativeAcpReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal',
      env: { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home }, spawnImpl: () => child, forceRefresh: true });
    expect(result.state).toBe('runtime_launches');
    expect(result.error).toContain('Backend temporarily unavailable');
  });

  it('invalidates equal-length API keys when the account changes', () => {
    const home = makeTempDir('key-identity-');
    const env = { GEMINI_HOME: home, GEMINI_API_KEY: 'account-one' };
    expect(computeCredentialFingerprint(env, 'gemini-api-key')).not.toBe(
      computeCredentialFingerprint({ ...env, GEMINI_API_KEY: 'account-two' }, 'gemini-api-key')
    );
  });

  it('shares concurrent catalog refresh and keeps a stale catalog after a transient failure', async () => {
    const home = makeTempDir('catalog-refresh-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home };
    writeNativeAcpAuthType('oauth-personal', env);
    writeFileSync(join(home, 'antigravity-acp/acp_token.json'), '{"refresh_token":"account-one"}');
    const child = createMockChild();
    let fail = false;
    let empty = false;
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => child.stdout.emit('data', JSON.stringify({ jsonrpc: '2.0', id: msg.id,
        ...(fail ? { error: { code: -32000, message: 'Backend unavailable' } } : { result: msg.method === 'initialize'
          ? { protocolVersion: 1, authMethods: [] }
          : { sessionId: 's1', configOptions: [{ id: 'model', options: empty ? [] : [{ value: 'gemini', name: 'Gemini' }] }] } })
      }) + '\n'));
    });
    const spawnImpl = vi.fn(() => child);
    const options = { command: fakeExe, args: [], authMethod: 'oauth-personal' as const, env, spawnImpl };
    const results = await Promise.all([getNativeCatalog(options), getNativeCatalog(options)]);
    expect(spawnImpl).toHaveBeenCalledTimes(1);
    expect(results[0].models[0].id).toBe('gemini');
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 11 * 60 * 1000);
    fail = true;
    const stale = await getNativeCatalog(options);
    expect(stale.models[0].id).toBe('gemini');
    expect(stale.catalogStale).toBe(true);
    expect(stale.error).toContain('Backend unavailable');
    const backedOff = await getNativeCatalog(options);
    expect(spawnImpl).toHaveBeenCalledTimes(2);
    expect(backedOff.models[0].id).toBe('gemini');
    expect(backedOff.catalogStale).toBe(true);
    expect(getFastNativeReadiness(options).models[0].id).toBe('gemini');
    fail = false; empty = true;
    const removed = await getNativeCatalog({ ...options, forceRefresh: true });
    expect(removed.models).toEqual([]);
  });

  it('queries the advertised native usage command and accumulates fragmented quota text', async () => {
    const home = makeTempDir('usage-query-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const child = createMockChild();
    const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify(message) + '\n');
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => {
        if (msg.method === 'initialize') emit({ id: msg.id, result: { protocolVersion: 1, authMethods: [], agentInfo: { name: 'antigravity-acp', version: '1.4.3' } } });
        if (msg.method === 'session/new') {
          emit({ id: msg.id, result: { sessionId: 'usage-session', _meta: { antigravity: { tier: { name: 'Test Pro' } } } } });
          setTimeout(() => emit({ method: 'session/update', params: { sessionId: 'usage-session', update: {
            sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] } } }), 5);
        }
        if (msg.method === 'session/prompt') {
          expect(msg.params.prompt).toEqual([{ type: 'text', text: '/usage' }]);
          for (const text of ['### Quota Limits\n- **Gemini**\n', '  - **Weekly:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)']) {
            emit({ method: 'session/update', params: { sessionId: 'usage-session', update: {
              sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } } } });
          }
          emit({ id: msg.id, result: { stopReason: 'end_turn' } });
        }
      });
    });
    const spawnImpl = vi.fn(() => child);
    const options = { command: fakeExe, args: [], authMethod: 'oauth-personal' as const,
      env: { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home }, spawnImpl };
    const [result] = await Promise.all([queryNativeUsage(options), queryNativeUsage(options)]);
    expect(result.usage.status).toBe('ok');
    expect(result.usage.windows[0].usedPercent).toBe(86);
    expect(result.usage.planLabel).toBe('Test Pro');
    expect(child.stdin.end).toHaveBeenCalled();
    await queryNativeUsage(options);
    expect(spawnImpl).toHaveBeenCalledTimes(1);
  });

  it('does not send usage to a model when the native command is not advertised', async () => {
    const home = makeTempDir('usage-unsupported-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const child = createMockChild();
    const methods: string[] = [];
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk); methods.push(msg.method);
      queueMicrotask(() => child.stdout.emit('data', JSON.stringify({ id: msg.id,
        result: msg.method === 'initialize' ? { protocolVersion: 1, authMethods: [] } : { sessionId: 's1' } }) + '\n'));
    });
    const result = await queryNativeUsage({ command: fakeExe, args: [], authMethod: 'oauth-personal',
      env: { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home }, spawnImpl: () => child });
    expect(result.usage.status).toBe('error');
    expect(result.usage.message).toContain('does not advertise /usage');
    expect(methods).not.toContain('session/prompt');
  });

  it('reports a bounded usage timeout and closes the diagnostic process', async () => {
    const home = makeTempDir('usage-timeout-');
    const command = join(home, 'agy.exe');
    writeFileSync(command, 'exe');
    const child = createMockChild();
    const result = await queryNativeUsage({ command, args: [], authMethod: 'oauth-personal', timeoutMs: 10,
      env: { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home }, spawnImpl: () => child });
    expect(result.usage.status).toBe('error');
    expect(result.usage.message).toContain('timed out after 10ms');
    expect(child.stdin.end).toHaveBeenCalled();
  });

  it('uses a session catalog update received before session/new resolves', async () => {
    const home = makeTempDir('catalog-update-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => {
        if (msg.method === 'session/new') {
          child.stdout.emit('data', JSON.stringify({ method: 'session/update', params: { sessionId: 's1', update: {
            sessionUpdate: 'config_option_update', configOptions: [{ id: 'model', options: [{ value: 'updated', name: 'Updated' }] }]
          } } }) + '\n');
        }
        child.stdout.emit('data', JSON.stringify({ id: msg.id,
          result: msg.method === 'initialize' ? { protocolVersion: 1, authMethods: [] } : { sessionId: 's1' } }) + '\n');
      });
    });
    const result = await probeNativeAcpReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal',
      env: { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home }, spawnImpl: () => child, forceRefresh: true });
    expect(result.models.map(model => model.id)).toEqual(['updated']);
  });

  it('waits briefly for a catalog update delivered after the session/new response', async () => {
    const home = makeTempDir('catalog-late-update-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const child = createMockChild();
    const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify(message) + '\n');
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => {
        emit({ id: msg.id, result: msg.method === 'initialize' ? { protocolVersion: 1, authMethods: [] } : { sessionId: 's1' } });
        if (msg.method === 'session/new') {
          setTimeout(() => emit({ method: 'session/update', params: { sessionId: 's1', update: {
            sessionUpdate: 'config_option_update', configOptions: [{ id: 'model', options: [{ value: 'late', name: 'Late' }] }]
          } } }), 20);
        }
      });
    });
    const result = await probeNativeAcpReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal',
      env: { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home }, spawnImpl: () => child, forceRefresh: true });
    expect(result.models.map(model => model.id)).toEqual(['late']);
  });

  it('discards a catalog whose account signed out while discovery was running', async () => {
    const home = makeTempDir('catalog-signout-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home };
    writeNativeAcpAuthType('oauth-personal', env);
    writeFileSync(join(home, 'antigravity-acp/acp_token.json'), '{"refresh_token":"account-one"}');
    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      if (msg.method === 'session/new') writeNativeAcpAuthType(null, env);
      queueMicrotask(() => child.stdout.emit('data', JSON.stringify({ id: msg.id, result: msg.method === 'initialize'
        ? { protocolVersion: 1, authMethods: [] }
        : { sessionId: 's1', configOptions: [{ id: 'model', options: [{ value: 'gemini', name: 'Gemini' }] }] } }) + '\n'));
    });
    const result = await probeNativeAcpReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: () => child, forceRefresh: true });
    expect(result.state).not.toBe('session_ready');
    expect(result.models).toEqual([]);
    expect(result.error).toContain('sign-in changed');
    expect(getCachedNativeReadiness()).toBeNull();
  });

  it('does not fall back to the previous account catalog when credentials change mid-refresh', async () => {
    const home = makeTempDir('catalog-account-switch-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home };
    writeNativeAcpAuthType('oauth-personal', env);
    writeFileSync(join(home, 'antigravity-acp/acp_token.json'), '{"refresh_token":"account-one"}');
    const managedToken = join(prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' }).geminiHome, 'antigravity-acp/acp_token.json');
    const child = createMockChild();
    let switchAccount = false;
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      // Another process switches accounts without touching this process's in-memory generation.
      if (msg.method === 'session/new' && switchAccount) writeFileSync(managedToken, '{"refresh_token":"account-two"}');
      queueMicrotask(() => child.stdout.emit('data', JSON.stringify({ id: msg.id, ...(switchAccount && msg.method === 'session/new'
        ? { error: { code: -32000, message: 'Backend unavailable' } }
        : { result: msg.method === 'initialize'
          ? { protocolVersion: 1, authMethods: [] }
          : { sessionId: 's1', configOptions: [{ id: 'model', options: [{ value: 'gemini', name: 'Gemini' }] }] } })
      }) + '\n'));
    });
    const options = { command: fakeExe, args: [], authMethod: 'oauth-personal' as const, env, spawnImpl: vi.fn(() => child) };
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
    const home = makeTempDir('catalog-headless-backoff-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home, GEMINI_API_KEY: 'test-key' };
    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => child.stdout.emit('data', JSON.stringify({ id: msg.id, ...(msg.method === 'session/new'
        ? { error: { code: -32000, message: 'Backend unavailable' } }
        : { result: msg.method === 'initialize' ? { protocolVersion: 1, authMethods: [{ id: 'gemini-api-key' }] } : {} }) }) + '\n'));
    });
    const spawnImpl = vi.fn(() => child);
    const options = { command: fakeExe, args: [], authMethod: 'gemini-api-key' as const, env, spawnImpl };
    expect((await getNativeCatalog(options)).error).toContain('Backend unavailable');
    expect(readConfiguredNativeAuthType({ ...env, GEMINI_HOME: prepareSanitizedGeminiHome({ env }).geminiHome })).toBe('gemini-api-key');
    await getNativeCatalog(options);
    expect(spawnImpl).toHaveBeenCalledTimes(1);
  });

  it('does not cache a probe failure whose account changed while discovery was running', async () => {
    const home = makeTempDir('catalog-failure-switch-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home };
    writeNativeAcpAuthType('oauth-personal', env);
    writeFileSync(join(home, 'antigravity-acp/acp_token.json'), '{"refresh_token":"account-one"}');
    const managedToken = join(prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' }).geminiHome, 'antigravity-acp/acp_token.json');
    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      if (msg.method === 'session/new') writeFileSync(managedToken, '{"refresh_token":"account-two"}');
      queueMicrotask(() => child.stdout.emit('data', JSON.stringify({ id: msg.id, ...(msg.method === 'session/new'
        ? { error: { code: -32000, message: 'Backend unavailable' } }
        : { result: { protocolVersion: 1, authMethods: [] } }) }) + '\n'));
    });
    const result = await probeNativeAcpReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env,
      spawnImpl: () => child, forceRefresh: true });
    expect(result.error).toContain('sign-in changed');
    expect(getCachedNativeReadiness()).toBeNull();
  });

  it('re-queries usage when the source account changes within the usage cache TTL', async () => {
    const home = makeTempDir('usage-account-switch-');
    const dataDir = makeTempDir('usage-account-switch-data-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: dataDir };
    writeNativeAcpAuthType('oauth-personal', env);
    const sourceToken = join(home, 'antigravity-acp/acp_token.json');
    writeFileSync(sourceToken, '{"refresh_token":"account-one"}');
    const child = createMockChild();
    const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify(message) + '\n');
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => {
        if (msg.method === 'initialize') emit({ id: msg.id, result: { protocolVersion: 1, authMethods: [] } });
        if (msg.method === 'session/new') {
          emit({ id: msg.id, result: { sessionId: 's1' } });
          emit({ method: 'session/update', params: { sessionId: 's1', update: {
            sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] } } });
        }
        if (msg.method === 'session/prompt') {
          emit({ method: 'session/update', params: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: '### Quota Limits\n- **Gemini**\n  - **Weekly:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)' } } } });
          emit({ id: msg.id, result: { stopReason: 'end_turn' } });
        }
      });
    });
    const spawnImpl = vi.fn(() => child);
    const options = { command: fakeExe, args: [], authMethod: 'oauth-personal' as const, env, spawnImpl };
    // Start from a synced managed home so the cached usage is keyed on account one.
    prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    expect((await queryNativeUsage(options)).usage.status).toBe('ok');
    writeFileSync(sourceToken, '{"refresh_token":"account-two"}');
    const future = new Date(Date.now() + 60_000);
    utimesSync(sourceToken, future, future);
    await queryNativeUsage(options);
    expect(spawnImpl).toHaveBeenCalledTimes(2);
  });

  it.each(['sign-out', 'managed account switch', 'source account switch', 'failed source account switch'])
  ('discards usage after a %s during the query', async (change) => {
    const home = makeTempDir('usage-pending-account-');
    const dataDir = makeTempDir('usage-pending-data-');
    const command = join(home, 'agy.exe');
    writeFileSync(command, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: dataDir };
    writeNativeAcpAuthType('oauth-personal', env);
    const sourceToken = join(home, 'antigravity-acp/acp_token.json');
    writeFileSync(sourceToken, '{"refresh_token":"account-one"}');
    const managedToken = join(prepareSanitizedGeminiHome({ env }).geminiHome, 'antigravity-acp/acp_token.json');
    let changeAccount = true;
    const spawnImpl = vi.fn(() => {
      const child = createMockChild();
      const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify(message) + '\n');
      child.stdin.write.mockImplementation((chunk: string) => {
        const msg = JSON.parse(chunk);
        queueMicrotask(() => {
          if (msg.method === 'initialize') emit({ id: msg.id, result: { protocolVersion: 1, authMethods: [] } });
          if (msg.method === 'session/new') {
            emit({ id: msg.id, result: { sessionId: 's1', _meta: { antigravity: { tier: { name: 'Old account tier' } } } } });
            emit({ method: 'session/update', params: { sessionId: 's1', update: {
              sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] } } });
          }
          if (msg.method === 'session/prompt') {
            if (changeAccount) {
              if (change === 'sign-out') writeNativeAcpAuthType(null, env);
              else writeFileSync(change === 'managed account switch' ? managedToken : sourceToken,
                '{"refresh_token":"account-two"}');
            }
            if (changeAccount && change === 'failed source account switch') {
              emit({ id: msg.id, error: { code: -32000, message: 'Old account backend detail' } });
            } else {
              emit({ method: 'session/update', params: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: '### Quota Limits\n- **Gemini**\n  - **Weekly:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)' } } } });
              emit({ id: msg.id, result: { stopReason: 'end_turn' } });
            }
          }
        });
      });
      return child;
    });
    const options = { command, args: [], authMethod: 'oauth-personal' as const, env, spawnImpl };
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
    expect(spawnImpl).toHaveBeenCalledTimes(2);
  });

  it('discards a catalog when only the source account changes during discovery', async () => {
    const home = makeTempDir('catalog-source-switch-');
    const command = join(home, 'agy.exe');
    writeFileSync(command, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: makeTempDir('catalog-source-data-') };
    writeNativeAcpAuthType('oauth-personal', env);
    const sourceToken = join(home, 'antigravity-acp/acp_token.json');
    writeFileSync(sourceToken, '{"refresh_token":"account-one"}');
    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      if (msg.method === 'session/new') writeFileSync(sourceToken, '{"refresh_token":"account-two"}');
      queueMicrotask(() => child.stdout.emit('data', JSON.stringify({ id: msg.id, result: msg.method === 'initialize'
        ? { protocolVersion: 1, authMethods: [] }
        : { sessionId: 's1', configOptions: [{ id: 'model', options: [{ value: 'old', name: 'Old' }] }] } }) + '\n'));
    });
    const result = await getNativeCatalog({ command, args: [], authMethod: 'oauth-personal', env, spawnImpl: () => child });
    expect(result.models).toEqual([]);
    expect(result.error).toContain('sign-in changed');
    expect(getCachedNativeReadiness()).toBeNull();
  });

  it.each(['catalog', 'usage'])('discards %s when credentials change during headless authentication', async (probe) => {
    const home = makeTempDir('headless-account-switch-');
    const command = join(home, 'agy.exe');
    writeFileSync(command, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home, GEMINI_API_KEY: 'original-key' };
    const child = createMockChild();
    const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify(message) + '\n');
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => {
        if (msg.method === 'authenticate') env.GEMINI_API_KEY = 'replacement-key';
        emit({ id: msg.id, result: msg.method === 'initialize'
          ? { protocolVersion: 1, authMethods: [{ id: 'gemini-api-key' }] }
          : { sessionId: 's1', stopReason: 'end_turn', configOptions: [{ id: 'model', options: [{ value: 'old', name: 'Old' }] }] } });
        if (msg.method === 'session/new') emit({ method: 'session/update', params: { sessionId: 's1', update: {
          sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] } } });
        if (msg.method === 'session/prompt') emit({ method: 'session/update', params: { sessionId: 's1', update: {
          sessionUpdate: 'agent_message_chunk', content: { type: 'text',
            text: '### Quota Limits\n- **Gemini**\n  - **Weekly:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)' } } } });
      });
    });
    const options = { command, args: [], authMethod: 'gemini-api-key' as const, env, spawnImpl: () => child, forceRefresh: true };
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
    const home = makeTempDir('headless-concurrent-');
    const command = join(home, 'agy.exe');
    writeFileSync(command, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home, GEMINI_API_KEY: 'same-account', GOOGLE_CLOUD_PROJECT: 'same-project' };
    const pendingAuth: Array<() => void> = [];
    const spawnImpl = vi.fn(() => {
      const child = createMockChild();
      const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify(message) + '\n');
      child.stdin.write.mockImplementation((chunk: string) => {
        const msg = JSON.parse(chunk);
        if (msg.method === 'authenticate') {
          pendingAuth.push(() => emit({ id: msg.id, result: {} }));
          return;
        }
        queueMicrotask(() => {
          if (msg.method === 'initialize') emit({ id: msg.id, result: { protocolVersion: 1, authMethods: [{ id: authMethod }] } });
          if (msg.method === 'session/new') {
            emit({ id: msg.id, result: { sessionId: 's1', configOptions: [{ id: 'model', options: [{ value: 'gemini', name: 'Gemini' }] }] } });
            emit({ method: 'session/update', params: { sessionId: 's1', update: {
              sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] } } });
          }
          if (msg.method === 'session/prompt') {
            emit({ method: 'session/update', params: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: {
              type: 'text', text: '### Quota Limits\n- **Gemini**\n  - **Weekly:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)' } } } });
            emit({ id: msg.id, result: { stopReason: 'end_turn' } });
          }
        });
      });
      return child;
    });
    const options = { command, args: [], authMethod, env, spawnImpl };
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
      expect(spawnImpl).toHaveBeenCalledTimes(2);
    }
  });

  it.each(['oauth-personal', 'gemini-api-key'] as const)
  ('accepts usage with %s after token refresh or its own auth settings write', async (authMethod) => {
    const home = makeTempDir('usage-auth-stable-');
    const command = join(home, 'agy.exe');
    writeFileSync(command, 'exe');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home, GEMINI_API_KEY: 'stable-key' };
    if (authMethod === 'oauth-personal') writeNativeAcpAuthType(authMethod, env);
    const managedHome = prepareSanitizedGeminiHome({ env, authMethod }).geminiHome;
    const tokenPath = join(managedHome, 'antigravity-acp/acp_token.json');
    writeFileSync(tokenPath, '{"refresh_token":"same-account","access_token":"old"}');
    const spawnImpl = vi.fn(() => {
      const child = createMockChild();
      const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify(message) + '\n');
      child.stdin.write.mockImplementation((chunk: string) => {
        const msg = JSON.parse(chunk);
        queueMicrotask(() => {
          if (msg.method === 'initialize') emit({ id: msg.id, result: { protocolVersion: 1, authMethods: [{ id: authMethod }] } });
          if (msg.method === 'authenticate') emit({ id: msg.id, result: {} });
          if (msg.method === 'session/new') {
            writeFileSync(tokenPath, '{"refresh_token":"same-account","access_token":"refreshed"}');
            emit({ id: msg.id, result: { sessionId: 's1' } });
            emit({ method: 'session/update', params: { sessionId: 's1', update: {
              sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] } } });
          }
          if (msg.method === 'session/prompt') {
            emit({ method: 'session/update', params: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: {
              type: 'text', text: '### Quota Limits\n- **Gemini**\n  - **Weekly:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)' } } } });
            emit({ id: msg.id, result: { stopReason: 'end_turn' } });
          }
        });
      });
      return child;
    });
    const options = { command, args: [], authMethod, env, spawnImpl };
    expect((await queryNativeUsage(options)).usage.status).toBe('ok');
    expect((await queryNativeUsage(options)).usage.status).toBe('ok');
    expect(spawnImpl).toHaveBeenCalledTimes(1);
  });

  it('keeps waiting for /usage when an earlier command update omits it', async () => {
    const home = makeTempDir('usage-late-command-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const child = createMockChild();
    const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify(message) + '\n');
    const commands = (names: string[]) => ({ method: 'session/update', params: { sessionId: 's1', update: {
      sessionUpdate: 'available_commands_update', availableCommands: names.map(name => ({ name })) } } });
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => {
        if (msg.method === 'initialize') emit({ id: msg.id, result: { protocolVersion: 1, authMethods: [] } });
        if (msg.method === 'session/new') {
          emit({ id: msg.id, result: { sessionId: 's1' } });
          setTimeout(() => emit(commands(['plan'])), 5);
          setTimeout(() => emit(commands(['plan', 'usage'])), 15);
        }
        if (msg.method === 'session/prompt') {
          emit({ method: 'session/update', params: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: '### Quota Limits\n- **Gemini**\n  - **Weekly:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)' } } } });
          emit({ id: msg.id, result: { stopReason: 'end_turn' } });
        }
      });
    });
    const result = await queryNativeUsage({ command: fakeExe, args: [], authMethod: 'oauth-personal',
      env: { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home }, spawnImpl: () => child, forceRefresh: true });
    expect(result.usage.status).toBe('ok');
  });

  it('reports oversized usage output instead of a generic probe close', async () => {
    const home = makeTempDir('usage-oversized-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');
    const child = createMockChild();
    const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify(message) + '\n');
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk);
      queueMicrotask(() => {
        if (msg.method === 'initialize') emit({ id: msg.id, result: { protocolVersion: 1, authMethods: [] } });
        if (msg.method === 'session/new') {
          emit({ id: msg.id, result: { sessionId: 's1' } });
          emit({ method: 'session/update', params: { sessionId: 's1', update: {
            sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] } } });
        }
        if (msg.method === 'session/prompt') {
          emit({ method: 'session/update', params: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'x'.repeat(40_000) } } } });
        }
      });
    });
    const result = await queryNativeUsage({ command: fakeExe, args: [], authMethod: 'oauth-personal',
      env: { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home }, spawnImpl: () => child, forceRefresh: true });
    expect(result.usage.status).toBe('error');
    expect(result.usage.message).toContain('exceeded');
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

  it('probeNativeAcpReadiness runs initialize and session/new with mock spawn', async () => {
    const home = makeTempDir('probe-test-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      const result =
        msg.method === 'initialize'
          ? { protocolVersion: 1, agentInfo: { version: '1.4.3' }, authMethods: [{ id: 'oauth-personal' }] }
          : {
              modes: { availableModes: [{ id: 'default' }, { id: 'auto_edit' }] },
              configOptions: [{ id: 'model', options: [{ value: 'gemini-4-argon', name: 'Gemini 4 Argon' }] }],
              _meta: { antigravity: { tier: { name: 'Google One AI Premium' } } }
            };
      setTimeout(() => {
        child.stdout.emit('data', JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
      }, 5);
    });

    const res = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => child,
      forceRefresh: true
    });

    expect(res.state).toBe('session_ready');
    expect(res.agentVersion).toBe('1.4.3');
    expect(res.tierName).toBe('Google One AI Premium');
    expect(getCachedNativeReadiness()?.state).toBe('session_ready');
  });

  it('probeNativeAcpReadiness handles missing binary and error rejections', async () => {
    const missing = await probeNativeAcpReadiness({
      command: 'C:/missing/agy_acp.exe',
      args: [],
      authMethod: 'oauth-personal'
    });
    expect(missing.state).toBe('runtime_missing');

    const home = makeTempDir('probe-err-');
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');

    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      setTimeout(() => {
        child.stdout.emit(
          'data',
          JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'Authentication required' } }) +
            '\n'
        );
      }, 5);
    });

    const res = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      spawnImpl: () => child,
      forceRefresh: true
    });
    expect(res.state).toBe('sign_in_required');
  });

  it('probeNativeAcpReadiness detects unsupported protocolVersion and unadvertised auth', async () => {
    const home = makeTempDir('probe-unsupported-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const makeInitChild = (initResult: Record<string, unknown>) => {
      const child = createMockChild();
      child.stdin.write.mockImplementation((chunk: string) => {
        const msg = JSON.parse(chunk.trim());
        setTimeout(() => {
          child.stdout.emit('data', JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: initResult }) + '\n');
        }, 5);
      });
      return child;
    };

    const res1 = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => makeInitChild({ protocolVersion: 99 }),
      forceRefresh: true
    });
    expect(res1.state).toBe('runtime_launches');
    expect(res1.error).toContain('Unsupported ACP protocolVersion');

    const res2 = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => makeInitChild({ protocolVersion: 1, authMethods: [{ id: 'oauth-business' }] }),
      forceRefresh: true
    });
    expect(res2.state).toBe('runtime_launches');
    expect(res2.error).toContain('Selected auth method "oauth-personal" is not advertised');
  });

  it('probeNativeAcpReadiness catches interactive sign in required from stderr', async () => {
    const home = makeTempDir('probe-stderr-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      if (msg.method === 'initialize') {
        setTimeout(() => {
          child.stdout.emit(
            'data',
            JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: 1, authMethods: [] } }) + '\n'
          );
        }, 5);
      } else if (msg.method === 'session/new') {
        setTimeout(() => {
          child.stderr.emit('data', 'Credentials missing or invalid. Please sign in.\n');
        }, 5);
      }
    });

    const res = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => child,
      forceRefresh: true
    });
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

    const home = makeTempDir('signin-unsupported-');
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      setTimeout(() => {
        child.stdout.emit(
          'data',
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: { protocolVersion: 1, authMethods: [{ id: 'gemini-api-key' }] }
          }) + '\n'
        );
      }, 5);
    });
    const res = await startNativeAcpSignIn({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      spawnImpl: () => child
    });
    expect(res.state).toBe('sign_in_required');
  });

  it('startNativeAcpSignIn completes interactive login flow and captures OAuth URL', async () => {
    const home = makeTempDir('signin-success-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      setTimeout(() => {
        if (msg.method === 'initialize') {
          child.stderr.emit('data', 'Open: https://accounts.google.com/o/oauth2/auth?client_id=123 in browser\n');
          child.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { protocolVersion: 1, authMethods: [{ id: 'oauth-personal' }] }
            }) + '\n'
          );
        } else {
          const result =
            msg.method === 'authenticate'
              ? { success: true }
              : { models: { availableModels: [{ id: 'gemini-4-argon', name: 'Gemini 4 Argon' }] } };
          child.stdout.emit('data', JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
        }
      }, 5);
    });

    const capturedUrls: string[] = [];
    const res = await startNativeAcpSignIn({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => child,
      onAuthUrl: (url) => capturedUrls.push(url)
    });
    expect(res.state).toBe('session_ready');
    expect(capturedUrls).toHaveLength(1);
  });

  it('handles corrupted settings JSON and computes credential fingerprints', () => {
    const home = makeTempDir('corrupt-settings-');
    const env: NodeJS.ProcessEnv = { ...process.env, GEMINI_HOME: home };
    const acpDir = join(home, 'antigravity-acp');
    mkdirSync(acpDir, { recursive: true });

    writeFileSync(join(acpDir, 'settings.json'), '[1, 2, 3]');
    expect(readNativeAcpSettings(env)).toBeNull();
    writeFileSync(join(acpDir, 'settings.json'), '42');
    expect(readNativeAcpSettings(env)).toBeNull();

    const fp1 = computeCredentialFingerprint(env, 'oauth-personal');
    expect(fp1).toContain('no-token');
    writeFileSync(join(acpDir, 'acp_token.json'), '{"token":"1234567890123"}');
    expect(computeCredentialFingerprint(env, 'oauth-personal')).not.toEqual(fp1);
    expect(computeCredentialFingerprint({ ...env, GEMINI_API_KEY: 'secret-key' }, 'gemini-api-key')).toContain('key:');
    expect(computeCredentialFingerprint({ ...env, GEMINI_API_KEY: 'secret-key' }, 'gemini-api-key')).not.toContain('secret-key');
    expect(
      computeCredentialFingerprint({ ...env, GOOGLE_APPLICATION_CREDENTIALS: 'creds.json' }, 'agent-platform')
    ).toContain('gac');
  });

  it('handles readiness cache TTL expiry and persisted disk cache hits', () => {
    const home = makeTempDir('cache-test-');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home };
    const fakeExe = join(home, 'agy.exe');
    writeFileSync(fakeExe, 'exe');

    writeNativeAcpAuthType('oauth-personal', env);
    const acpDir = join(home, 'antigravity-acp');
    mkdirSync(acpDir, { recursive: true });
    writeFileSync(join(acpDir, 'acp_token.json'), '{"token":"valid-test-token"}');

    const sanitized = prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    const effectiveEnv = { ...env, GEMINI_HOME: sanitized.geminiHome };
    const persistPath = join(home, 'state', 'antigravity-native-readiness.json');
    const configuredAuthType = readConfiguredNativeAuthType(effectiveEnv);
    const key = JSON.stringify({ command: fakeExe, args: [], authMethod: 'oauth-personal', configuredAuthType });
    const fingerprint = computeCredentialFingerprint(effectiveEnv, 'oauth-personal');
    const writeCache = (checkedAt: number) =>
      writeFileSync(
        persistPath,
        JSON.stringify({
          key,
          fingerprint,
          result: { state: 'session_ready', checkedAt, models: [{ id: 'gemini', name: 'Gemini' }], modes: [], advertisedAuthMethods: [] }
        })
      );

    clearCachedNativeReadiness();
    writeCache(Date.now());
    expect(getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env }).state).toBe(
      'session_ready'
    );

    clearCachedNativeReadiness();
    writeCache(Date.now() - 20 * 60 * 1000);
    const stale = getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env });
    expect(stale.state).toBe('authenticated');
    expect(stale.models.map(model => model.id)).toEqual(['gemini']);
    expect(stale.catalogStale).toBe(true);
    writeFileSync(join(sanitized.geminiHome, 'antigravity-acp/acp_token.json'), '{"token":"other-account-token"}');
    expect(getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env }).models).toEqual([]);
  });
});
