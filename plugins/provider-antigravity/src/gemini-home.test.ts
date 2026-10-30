import './test-environment.js';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getNativeAcpSettingsPath,
  getNativeAcpTokenPath,
  hasNativeAcpToken,
  isAuthExplicitlyCleared,
  isValidGoogleAuthMethod,
  prepareSanitizedGeminiHome,
  readConfiguredNativeAuthType,
  readNativeAcpSettings,
  resolveGeminiHome,
  syncTokenToSource,
  writeAuthTypeSettings
} from './gemini-home.js';

const tempDirs: string[] = [];
function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe('gemini-home', () => {
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

  it('reads token and settings, including corrupted settings', () => {
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

    for (const corrupted of ['INVALID_JSON', '[1, 2, 3]', '42']) {
      writeFileSync(join(acpDir, 'settings.json'), corrupted);
      expect(readNativeAcpSettings(env)).toBeNull();
    }

    writeAuthTypeSettings('oauth-business', env);
    expect(readConfiguredNativeAuthType(env)).toBe('oauth-business');

    writeAuthTypeSettings(null, env);
    expect(readConfiguredNativeAuthType(env)).toBeNull();
    expect(isAuthExplicitlyCleared(env)).toBe(true);
  });

  it('sanitizes dead MCP pipes in a separate ZCC home without modifying source', () => {
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

  it('syncs the token into the managed home and a refreshed token back to the user home', () => {
    const userHome = makeTempDir('user-home-');
    const stateHome = makeTempDir('state-home-');
    const env: NodeJS.ProcessEnv = { USERPROFILE: userHome, HOME: userHome, ZCC_DATA_DIR: stateHome };

    const userToken = join(userHome, '.gemini', 'antigravity-acp', 'acp_token.json');
    mkdirSync(join(userHome, '.gemini', 'antigravity-acp'), { recursive: true });
    writeFileSync(userToken, JSON.stringify({ token: 'user-token-12345' }));

    const res = prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    expect(res.geminiHome).toContain(stateHome);
    const managedToken = join(res.geminiHome, 'antigravity-acp', 'acp_token.json');
    expect(readFileSync(managedToken, 'utf8')).toContain('user-token-12345');

    writeFileSync(managedToken, JSON.stringify({ token: 'refreshed-token-67890' }));
    const future = new Date(Date.now() + 60_000);
    // A newer managed token flows back; an explicit GEMINI_HOME opts out.
    syncTokenToSource(res, { ...env, GEMINI_HOME: join(userHome, '.gemini') });
    expect(readFileSync(userToken, 'utf8')).toContain('user-token-12345');
    utimesSync(managedToken, future, future);
    syncTokenToSource(res, env);
    expect(readFileSync(userToken, 'utf8')).toContain('refreshed-token-67890');
  });
});
