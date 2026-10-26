import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCachedNativeReadiness,
  computeCredentialFingerprint,
  DEFAULT_NATIVE_MODELS,
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
  READINESS_CACHE_TTL_MS,
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
  const stdin = {
    write: vi.fn(),
    end: vi.fn()
  };
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
  if (savedGeminiHome === undefined) {
    delete process.env.GEMINI_HOME;
  } else {
    process.env.GEMINI_HOME = savedGeminiHome;
  }
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
    const customHome = 'C:/CustomGeminiHome';
    process.env.GEMINI_HOME = customHome;
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

    // No token
    expect(hasNativeAcpToken(env)).toBe(false);

    // Empty token file (< 10 bytes)
    writeFileSync(join(acpDir, 'acp_token.json'), '{}');
    expect(hasNativeAcpToken(env)).toBe(false);

    // Valid token file (> 10 bytes)
    writeFileSync(
      join(acpDir, 'acp_token.json'),
      JSON.stringify({ access_token: '1234567890', refresh_token: 'abcdef' })
    );
    expect(hasNativeAcpToken(env)).toBe(true);

    // No settings
    expect(readNativeAcpSettings(env)).toBeNull();
    expect(readConfiguredNativeAuthType(env)).toBeNull();

    // Corrupted settings
    writeFileSync(join(acpDir, 'settings.json'), 'INVALID_JSON');
    expect(readNativeAcpSettings(env)).toBeNull();

    // Valid settings with auth type
    writeNativeAcpAuthType('oauth-business', env);
    expect(readConfiguredNativeAuthType(env)).toBe('oauth-business');

    // Clear auth type
    writeNativeAcpAuthType(null, env);
    expect(readConfiguredNativeAuthType(env)).toBeNull();
    expect(isAuthExplicitlyCleared(env)).toBe(true);
  });

  it('prepareSanitizedGeminiHome sanitizes dead MCP pipes, merges tokens, and auto-populates settings only when uninitialized', () => {
    const home = makeTempDir('gemini-mcp-test-');
    const stateHome = makeTempDir('gemini-state-');
    const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: stateHome };

    const acpDir = join(home, 'antigravity-acp');
    mkdirSync(acpDir, { recursive: true });
    writeFileSync(
      join(acpDir, 'acp_token.json'),
      JSON.stringify({ token: 'abc-token-1234567' })
    );

    const configDir = join(home, 'config');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'mcp_config.json'),
      JSON.stringify({
        mcpServers: {
          activeServer: { command: 'node', args: ['server.js'] },
          deadProxy: {
            command: 'node',
            args: ['some/path/mcp_proxy_bundle.js', 'tool-antigravityide']
          }
        }
      })
    );

    const res = prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    expect(res.disabledDeadMcpServers).toContain('deadProxy');

    // Settings auto-populated because token existed and settings.json was uninitialized
    expect(readConfiguredNativeAuthType(env)).toBe('oauth-personal');
  });

  it('prepareSanitizedGeminiHome syncs between managed home and user home', () => {
    const userHome = makeTempDir('user-home-');
    const stateHome = makeTempDir('state-home-');
    const env: NodeJS.ProcessEnv = {
      USERPROFILE: userHome,
      HOME: userHome,
      ZCC_DATA_DIR: stateHome
    };
    delete env.GEMINI_HOME;

    // Prepare token in user home
    const userAcp = join(userHome, '.gemini', 'antigravity-acp');
    mkdirSync(userAcp, { recursive: true });
    writeFileSync(join(userAcp, 'acp_token.json'), JSON.stringify({ token: 'user-token-12345' }));

    const res = prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    expect(res.geminiHome).toContain(stateHome);

    const syncedToken = join(stateHome, 'state', 'antigravity-gemini-home', 'antigravity-acp', 'acp_token.json');
    expect(readFileSync(syncedToken, 'utf8')).toContain('user-token-12345');
  });

  it('extractModelsFromSessionResult handles model categories, options, and fallbacks', () => {
    expect(extractModelsFromSessionResult(null)).toEqual([]);
    expect(extractModelsFromSessionResult({})).toEqual([]);

    // Available models fallback
    const res = extractModelsFromSessionResult({
      models: {
        availableModels: [
          { id: 'custom-model-1', name: 'Custom Model 1', description: 'Desc 1' },
          { modelId: 'custom-model-2', name: 'Custom Model 2' }
        ]
      }
    });
    expect(res).toEqual([
      { id: 'custom-model-1', name: 'Custom Model 1', description: 'Desc 1' },
      { id: 'custom-model-2', name: 'Custom Model 2' }
    ]);
  });

  it('getFastNativeReadiness validates credentials and invalidates on changes or expiration', () => {
    const home = makeTempDir('readiness-test-');
    const env = { ...process.env, GEMINI_HOME: home };

    // Missing binary
    const missing = getFastNativeReadiness({
      command: 'C:/missing/agy_acp_server.exe',
      args: [],
      authMethod: 'oauth-personal',
      env
    });
    expect(missing.state).toBe('runtime_missing');

    // Binary exists, but no token / auth
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const signIn = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env
    });
    expect(signIn.state).toBe('sign_in_required');

    // Binary exists with token and configured auth type
    const acpDir = join(home, 'antigravity-acp');
    mkdirSync(acpDir, { recursive: true });
    writeFileSync(join(acpDir, 'acp_token.json'), JSON.stringify({ token: '123456789012' }));
    writeNativeAcpAuthType('oauth-personal', env);

    const tokenReady = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env
    });
    expect(tokenReady.state).toBe('authenticated');

    // Cleared auth overrides token
    writeNativeAcpAuthType(null, env);
    const clearedReady = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env
    });
    expect(clearedReady.state).toBe('sign_in_required');

    // Binary exists with gemini-api-key env
    const apiKeyEnv = { ...env, GEMINI_API_KEY: 'test-api-key' };
    const authenticated = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'gemini-api-key',
      env: apiKeyEnv
    });
    expect(authenticated.state).toBe('authenticated');

    // agent-platform requires platform credentials (GOOGLE_APPLICATION_CREDENTIALS / CLOUD_ML_PROJECT_ID / GOOGLE_CLOUD_PROJECT)
    const noCredsPlatform = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'agent-platform',
      env
    });
    expect(noCredsPlatform.state).toBe('sign_in_required');

    const withCredsPlatform = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'agent-platform',
      env: { ...env, GOOGLE_APPLICATION_CREDENTIALS: 'creds.json' }
    });
    expect(withCredsPlatform.state).toBe('authenticated');

    const withCloudProject = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'agent-platform',
      env: { ...env, CLOUD_ML_PROJECT_ID: 'proj-1' }
    });
    expect(withCloudProject.state).toBe('authenticated');
  });

  it('probeNativeAcpReadiness runs initialize, authenticate, and session/new with mock spawn', async () => {
    const home = makeTempDir('probe-test-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const child = createMockChild();
    const spawnImpl = vi.fn().mockReturnValue(child);

    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      if (msg.method === 'initialize') {
        setTimeout(() => {
          child.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: {
                protocolVersion: 1,
                agentInfo: { version: '1.4.3' },
                authMethods: [{ id: 'oauth-personal' }]
              }
            }) + '\n'
          );
        }, 5);
      } else if (msg.method === 'session/new') {
        setTimeout(() => {
          child.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: {
                modes: { availableModes: [{ id: 'default' }, { id: 'auto_edit' }] },
                configOptions: [
                  {
                    id: 'model',
                    options: [
                      { value: 'gemini-4-argon', name: 'Gemini 4 Argon' }
                    ]
                  }
                ],
                _meta: { antigravity: { tier: { name: 'Google One AI Premium' } } }
              }
            }) + '\n'
          );
        }, 5);
      }
    });

    const res = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl,
      forceRefresh: true
    });

    expect(res.state).toBe('session_ready');
    expect(res.agentVersion).toBe('1.4.3');
    expect(res.tierName).toBe('Google One AI Premium');
    expect(res.modes).toEqual(['default', 'auto_edit']);

    const cached = getCachedNativeReadiness();
    expect(cached?.state).toBe('session_ready');
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
        child.stdout.emit('data', JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: -32000, message: 'Authentication required' }
        }) + '\n');
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

    // 1. Protocol mismatch
    const child1 = createMockChild();
    child1.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      if (msg.method === 'initialize') {
        setTimeout(() => {
          child1.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { protocolVersion: 99 }
            }) + '\n'
          );
        }, 5);
      }
    });

    const res1 = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => child1,
      forceRefresh: true
    });
    expect(res1.state).toBe('runtime_launches');
    expect(res1.error).toContain('Unsupported ACP protocolVersion');

    // 2. Unadvertised auth method
    const child2 = createMockChild();
    child2.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      if (msg.method === 'initialize') {
        setTimeout(() => {
          child2.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: {
                protocolVersion: 1,
                authMethods: [{ id: 'oauth-business' }]
              }
            }) + '\n'
          );
        }, 5);
      }
    });

    const res2 = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => child2,
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
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { protocolVersion: 1, authMethods: [] }
            }) + '\n'
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

  it('startNativeAcpSignIn handles missing binary, unsupported auth, and login flow', async () => {
    const missing = await startNativeAcpSignIn({
      command: 'C:/missing/agy.exe',
      args: [],
      authMethod: 'oauth-personal'
    });
    expect(missing.state).toBe('runtime_missing');

    const home = makeTempDir('signin-test-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    // Unsupported auth
    const child1 = createMockChild();
    child1.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      if (msg.method === 'initialize') {
        setTimeout(() => {
          child1.stdout.emit('data', JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: { protocolVersion: 1, authMethods: [{ id: 'gemini-api-key' }] }
          }) + '\n');
        }, 5);
      }
    });
    const res1 = await startNativeAcpSignIn({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      spawnImpl: () => child1
    });
    expect(res1.state).toBe('sign_in_required');

    // Successful flow
    const child2 = createMockChild();
    child2.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      if (msg.method === 'initialize') {
        setTimeout(() => {
          child2.stderr.emit(
            'data',
            'Open this URL: https://accounts.google.com/o/oauth2/auth?client_id=123 in your browser\n'
          );
          child2.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { protocolVersion: 1, authMethods: [{ id: 'oauth-personal' }] }
            }) + '\n'
          );
        }, 5);
      } else if (msg.method === 'authenticate') {
        setTimeout(() => {
          child2.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { success: true }
            }) + '\n'
          );
        }, 5);
      } else if (msg.method === 'session/new') {
        setTimeout(() => {
          child2.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: {
                models: {
                  availableModels: [{ id: 'gemini-4-argon', name: 'Gemini 4 Argon' }]
                }
              }
            }) + '\n'
          );
        }, 5);
      }
    });

    const capturedUrls: string[] = [];
    const res2 = await startNativeAcpSignIn({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => child2,
      onAuthUrl: (url) => capturedUrls.push(url)
    });

    expect(res2.state).toBe('session_ready');
    expect(capturedUrls).toHaveLength(1);
  });

  it('handles corrupted settings JSON, arrays, and primitive values', () => {
    const home = makeTempDir('corrupt-settings-');
    const env = { ...process.env, GEMINI_HOME: home };
    const acpDir = join(home, 'antigravity-acp');
    mkdirSync(acpDir, { recursive: true });

    writeFileSync(join(acpDir, 'settings.json'), '[1, 2, 3]');
    expect(readNativeAcpSettings(env)).toBeNull();

    writeFileSync(join(acpDir, 'settings.json'), '42');
    expect(readNativeAcpSettings(env)).toBeNull();
  });

  it('computes credential fingerprint across environment and token variations', () => {
    const home = makeTempDir('fingerprint-test-');
    const env: NodeJS.ProcessEnv = { ...process.env, GEMINI_HOME: home };
    const acpDir = join(home, 'antigravity-acp');
    mkdirSync(acpDir, { recursive: true });

    const fp1 = computeCredentialFingerprint(env, 'oauth-personal');
    expect(fp1).toContain('no-token');
    expect(fp1).toContain('no-key');

    writeFileSync(join(acpDir, 'acp_token.json'), '{"token":"1234567890123"}');
    const fp2 = computeCredentialFingerprint(env, 'oauth-personal');
    expect(fp2).not.toEqual(fp1);

    const fpKey = computeCredentialFingerprint({ ...env, GEMINI_API_KEY: 'secret-key' }, 'gemini-api-key');
    expect(fpKey).toContain('key:10');

    const fpGac = computeCredentialFingerprint({ ...env, GOOGLE_APPLICATION_CREDENTIALS: 'creds.json' }, 'agent-platform');
    expect(fpGac).toContain('gac');
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

    const res1 = getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env });
    expect(res1.state).toBe('authenticated');

    const res2 = getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env });
    expect(res2.state).toBe('authenticated');

    const stateDir = join(home, 'state');
    mkdirSync(stateDir, { recursive: true });
    const persistPath = join(stateDir, 'antigravity-native-readiness.json');

    writeFileSync(persistPath, 'INVALID_JSON');
    clearCachedNativeReadiness();
    const res3 = getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env });
    expect(res3.state).toBe('authenticated');

    clearCachedNativeReadiness();
    const configuredAuthType = readConfiguredNativeAuthType(env);
    const cacheKey = JSON.stringify({ command: fakeExe, args: [], authMethod: 'oauth-personal', configuredAuthType });
    const fingerprint = computeCredentialFingerprint(env, 'oauth-personal');
    writeFileSync(persistPath, JSON.stringify({
      key: cacheKey,
      fingerprint,
      result: { state: 'session_ready', checkedAt: Date.now(), models: [], modes: [], advertisedAuthMethods: [] }
    }));

    const res4 = getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env });
    expect(res4.state).toBe('session_ready');

    writeFileSync(persistPath, JSON.stringify({
      key: cacheKey,
      fingerprint,
      result: { state: 'session_ready', checkedAt: Date.now() - 20 * 60 * 1000, models: [], modes: [], advertisedAuthMethods: [] }
    }));
    clearCachedNativeReadiness();
    const res5 = getFastNativeReadiness({ command: fakeExe, args: [], authMethod: 'oauth-personal', env });
    expect(res5.state).toBe('authenticated');
  });
});
