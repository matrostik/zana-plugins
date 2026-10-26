import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCachedNativeReadiness,
  computeCredentialFingerprint,
  extractModelsFromSessionResult,
  getCachedNativeReadiness,
  getFastNativeReadiness,
  getNativeAcpSettingsPath,
  getNativeAcpTokenPath,
  hasNativeAcpToken,
  isAuthExplicitlyCleared,
  isValidGoogleAuthMethod,
  prepareSanitizedGeminiHome,
  probeNativeAcpReadiness,
  readConfiguredNativeAuthType,
  readNativeAcpSettings,
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

  it('prepareSanitizedGeminiHome sanitizes dead MCP pipes and auto-populates settings when uninitialized', () => {
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
    expect(res.disabledDeadMcpServers).toContain('deadProxy');
    expect(readConfiguredNativeAuthType(env)).toBe('oauth-personal');
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
    expect(computeCredentialFingerprint({ ...env, GEMINI_API_KEY: 'secret-key' }, 'gemini-api-key')).toContain('key:10');
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

    const stateDir = join(home, 'state');
    mkdirSync(stateDir, { recursive: true });
    const persistPath = join(stateDir, 'antigravity-native-readiness.json');
    const configuredAuthType = readConfiguredNativeAuthType(env);
    const key = JSON.stringify({ command: fakeExe, args: [], authMethod: 'oauth-personal', configuredAuthType });
    const fingerprint = computeCredentialFingerprint(env, 'oauth-personal');
    const writeCache = (checkedAt: number) =>
      writeFileSync(
        persistPath,
        JSON.stringify({
          key,
          fingerprint,
          result: { state: 'session_ready', checkedAt, models: [], modes: [], advertisedAuthMethods: [] }
        })
      );

    clearCachedNativeReadiness();
    writeCache(Date.now());
    expect(getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env }).state).toBe(
      'session_ready'
    );

    clearCachedNativeReadiness();
    writeCache(Date.now() - 20 * 60 * 1000);
    expect(getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env }).state).toBe(
      'authenticated'
    );
  });
});
