import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCachedNativeReadiness,
  DEFAULT_NATIVE_MODELS,
  extractModelsFromSessionResult,
  getCachedNativeReadiness,
  getFastNativeReadiness,
  getNativeAcpSettingsPath,
  getNativeAcpTokenPath,
  hasNativeAcpToken,
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
  });

  it('prepareSanitizedGeminiHome sanitizes dead MCP pipes, merges tokens, and auto-populates settings', () => {
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

    // Settings auto-populated because token existed
    expect(readConfiguredNativeAuthType(env)).toBe('oauth-personal');
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

  it('getFastNativeReadiness returns cached, runtime_missing, authenticated, and sign_in_required', () => {
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

    // Binary exists with gemini-api-key env
    const apiKeyEnv = { ...env, GEMINI_API_KEY: 'test-api-key' };
    const authenticated = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'gemini-api-key',
      env: apiKeyEnv
    });
    expect(authenticated.state).toBe('authenticated');

    // Binary exists with agent-platform
    const platformAuth = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'agent-platform',
      env
    });
    expect(platformAuth.state).toBe('authenticated');
  });

  it('probeNativeAcpReadiness runs initialize, authenticate, and session/new with mock spawn', async () => {
    const home = makeTempDir('probe-test-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const child = createMockChild();
    const spawnImpl = vi.fn().mockReturnValue(child);

    // Handle JSON-RPC requests from probe
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

    // Check memory caching
    const cached = getCachedNativeReadiness();
    expect(cached?.state).toBe('session_ready');
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

  it('startNativeAcpSignIn executes interactive login flow and invokes onAuthUrl', async () => {
    const home = makeTempDir('signin-test-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const child = createMockChild();
    child.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      if (msg.method === 'initialize') {
        setTimeout(() => {
          child.stderr.emit(
            'data',
            'Open this URL: https://accounts.google.com/o/oauth2/auth?client_id=123 in your browser\n'
          );
          child.stdout.emit(
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
          child.stdout.emit(
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
          child.stdout.emit(
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
    expect(capturedUrls[0]).toContain('https://accounts.google.com/o/oauth2/auth');
  });

  it('covers headless authentication and error handling in probeNativeAcpReadiness', async () => {
    const home = makeTempDir('probe-headless-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    // 1. Headless authenticate path
    const child = createMockChild();
    let authCalled = false;
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
                authMethods: [{ id: 'gemini-api-key' }]
              }
            }) + '\n'
          );
        }, 5);
      } else if (msg.method === 'authenticate') {
        authCalled = true;
        setTimeout(() => {
          child.stdout.emit(
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
          // Send an incoming server method call to test unsupported method response (line 524)
          child.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: 999,
              method: 'server/ping',
              params: {}
            }) + '\n'
          );
          child.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: { models: { availableModels: [] } }
            }) + '\n'
          );
        }, 10);
      }
    });

    const res = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'gemini-api-key',
      env,
      spawnImpl: () => child,
      forceRefresh: true
    });

    expect(authCalled).toBe(true);
    expect(res.state).toBe('session_ready');

    // 2. ACP error code -32000 triggers sign_in_required catch branch
    const errorChild = createMockChild();
    errorChild.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      if (msg.method === 'initialize') {
        setTimeout(() => {
          errorChild.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              error: { code: -32000, message: 'Authentication required' }
            }) + '\n'
          );
        }, 5);
      }
    });

    const errRes = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => errorChild,
      forceRefresh: true
    });
    expect(errRes.state).toBe('sign_in_required');

    // 3. Generic error triggers runtime_launches catch branch
    const genericChild = createMockChild();
    genericChild.stdin.write.mockImplementation((chunk: string) => {
      const msg = JSON.parse(chunk.trim());
      if (msg.method === 'initialize') {
        setTimeout(() => {
          genericChild.stdout.emit(
            'data',
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              error: { code: -32603, message: 'Internal crash' }
            }) + '\n'
          );
        }, 5);
      }
    });

    const crashRes = await probeNativeAcpReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => genericChild,
      forceRefresh: true
    });
    expect(crashRes.state).toBe('runtime_launches');
    expect(crashRes.error).toContain('Internal crash');
  });

  it('covers startNativeAcpSignIn edge cases: missing binary, unsupported auth, and failure', async () => {
    // 1. Missing binary
    const missing = await startNativeAcpSignIn({
      command: 'C:/nonexistent/binary.exe',
      args: [],
      authMethod: 'oauth-personal'
    });
    expect(missing.state).toBe('runtime_missing');

    const home = makeTempDir('signin-edge-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    // 2. Unsupported auth method
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
              result: { protocolVersion: 1, authMethods: [{ id: 'oauth-business' }] }
            }) + '\n'
          );
        }, 5);
      }
    });

    const unsuppRes = await startNativeAcpSignIn({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => child1
    });
    expect(unsuppRes.state).toBe('sign_in_required');
    expect(unsuppRes.error).toContain('not supported by this native server');

    // 3. Failure during authenticate
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
              error: { code: -32001, message: 'OAuth user cancelled' }
            }) + '\n'
          );
        }, 5);
      }
    });

    const failRes = await startNativeAcpSignIn({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env,
      spawnImpl: () => child2
    });
    expect(failRes.state).toBe('sign_in_required');
    expect(failRes.error).toContain('OAuth user cancelled');
  });

  it('covers in-memory and disk caching branches in getFastNativeReadiness', () => {
    const home = makeTempDir('cache-branch-');
    const env = { ...process.env, GEMINI_HOME: home };
    const fakeExe = join(home, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    // Call once to compute
    const first = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env
    });
    expect(first.state).toBe('sign_in_required');

    // Call second time -> hits cacheKey
    const second = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env
    });
    expect(second.state).toBe('sign_in_required');
  });

  it('covers token sync back when GEMINI_HOME is omitted in options.env', async () => {
    const userHome = makeTempDir('user-home-sync-');
    const fakeExe = join(userHome, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');

    const prevUser = process.env.USERPROFILE;
    const prevGemini = process.env.GEMINI_HOME;
    try {
      process.env.USERPROFILE = userHome;
      delete process.env.GEMINI_HOME;

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
                result: { protocolVersion: 1, authMethods: [{ id: 'oauth-personal' }] }
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
                result: { models: { availableModels: [] } }
              }) + '\n'
            );
          }, 5);
        }
      });

      const res = await probeNativeAcpReadiness({
        command: fakeExe,
        args: [],
        authMethod: 'oauth-personal',
        env: undefined,
        spawnImpl: () => child,
        forceRefresh: true
      });
      expect(res.state).toBe('session_ready');

      // Call probeNativeAcpReadiness with forceRefresh: false to hit cache return (line 754)
      const cachedRes = await probeNativeAcpReadiness({
        command: fakeExe,
        args: [],
        authMethod: 'oauth-personal',
        env: undefined,
        forceRefresh: false
      });
      expect(cachedRes.state).toBe('session_ready');

      // Call startNativeAcpSignIn with env: undefined to hit line 1063-1064
      const childSignIn = createMockChild();
      childSignIn.stdin.write.mockImplementation((chunk: string) => {
        const msg = JSON.parse(chunk.trim());
        if (msg.method === 'initialize') {
          setTimeout(() => {
            childSignIn.stdout.emit(
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
            childSignIn.stdout.emit(
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
            childSignIn.stdout.emit(
              'data',
              JSON.stringify({
                jsonrpc: '2.0',
                id: msg.id,
                result: { models: { availableModels: [] } }
              }) + '\n'
            );
          }, 5);
        }
      });

      const resSignIn = await startNativeAcpSignIn({
        command: fakeExe,
        args: [],
        authMethod: 'oauth-personal',
        env: undefined,
        spawnImpl: () => childSignIn
      });
      expect(resSignIn.state).toBe('session_ready');
    } finally {
      process.env.USERPROFILE = prevUser;
      if (prevGemini !== undefined) {
        process.env.GEMINI_HOME = prevGemini;
      }
    }
  });

  it('covers syncFileNewer and ide named pipe proxy branches', () => {
    // 1. Calling prepareSanitizedGeminiHome without GEMINI_HOME in env exercises syncFileNewer
    const stateHome = makeTempDir('state-sync-');
    const env = { ...process.env, ZCC_DATA_DIR: stateHome };
    delete env.GEMINI_HOME;
    prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });

    // 2. serverConfig disabled or without pipeId
    const mcpHome = makeTempDir('mcp-cases-');
    const mcpConfigDir = join(mcpHome, 'config');
    mkdirSync(mcpConfigDir, { recursive: true });
    writeFileSync(
      join(mcpConfigDir, 'mcp_config.json'),
      JSON.stringify({
        mcpServers: {
          disabledProxy: {
            disabled: true,
            args: ['mcp_proxy_bundle.js', 'test-antigravityide']
          },
          genericProxyOnly: {
            args: ['mcp_proxy_bundle.js']
          },
          regularServer: {
            args: ['regular.js']
          }
        }
      })
    );
    const sanitized = prepareSanitizedGeminiHome({
      env: { ...process.env, GEMINI_HOME: mcpHome },
      authMethod: 'oauth-personal'
    });
    expect(sanitized.disabledDeadMcpServers).toContain('genericProxyOnly');
    expect(sanitized.disabledDeadMcpServers).not.toContain('disabledProxy');
  });
});
