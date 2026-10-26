import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakePluginHost } from '@zana-ai/zcc-plugin-sdk/testing';
import plugin from './server.js';
import { ensureLaunchSpec, transformLegacyResumeForNative } from './host.js';
import * as nativeRuntime from './src/native-runtime.js';
import * as nativeAuth from './src/native-auth.js';
import {
  checkCompanionFiles,
  computeSha256Hex,
  installNativeAcpRuntime,
  PINNED_NATIVE_ACP_VERSION,
  resolveNativeAcpRuntime,
  rollbackNativeAcpRuntime
} from './src/native-runtime.js';
import {
  extractModelsFromSessionResult,
  prepareSanitizedGeminiHome,
  probeNativeAcpReadiness,
  readConfiguredNativeAuthType,
  writeNativeAcpAuthType
} from './src/native-auth.js';

const tempDirs: string[] = [];
function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});

describe('antigravity provider plugin', () => {
  it('registers the Antigravity Native ACP provider without hardcoded fallback catalog', async () => {
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);

    expect(harness.providers).toHaveLength(1);
    const provider = harness.providers[0]!;
    expect(provider).toMatchObject({
      id: 'antigravity',
      displayName: 'Antigravity',
      icon: './icons/antigravity.svg',
      family: 'acp',
      capabilities: {
        fork: 'none',
        permissionModes: ['accept-edits', 'full'],
        supportsManualCompaction: false
      }
    });
    expect(provider.capabilities.reasoningLevels).toEqual(['low', 'medium', 'high']);
    expect(provider.models?.scope).toBe('host');
    expect(provider.models?.fallback).toBeUndefined();
    expect(harness.settings).toHaveProperty('authMethod');
    expect(harness.settings).toHaveProperty('nativeExecutable');
    await harness.dispose();
  });

  it('derives Native ACP launch options with sanitized GEMINI_HOME and thinking_level reasoning', async () => {
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);

    const result = harness.providers[0]!.deriveProviderOptions!({
      projectId: 'project-1',
      threadId: 'thread-1',
      permissionMode: 'accept-edits',
      settings: {
        authMethod: 'oauth-personal',
        nativeExecutable: 'C:/custom/agy_acp_server.exe'
      }
    }) as any;

    expect(result.acpDialect).toBe('generic');
    expect(result.antigravityAuthMethod).toBe('oauth-personal');
    expect(result.parameterizedModelPicker).toBe(true);
    expect(result.acpLaunchSpec.command).toContain('agy_acp_server.exe');
    expect(result.acpLaunchSpec.env.BROWSER).toBe('echo');
    expect(result.acpLaunchSpec.env.GEMINI_HOME).toBeTruthy();
    expect(result.acpLaunchSpec.env.AGY_ACP_AUTH_METHOD).toBe('oauth-personal');
    expect(result.acpLaunchSpec.nativeReasoning).toEqual({
      configId: 'thinking_level',
      supportedLevels: ['low', 'medium', 'high'],
      defaultLevel: 'medium'
    });
    await harness.dispose();
  });

  it('provides doctor:status RPC method for Native ACP without spawning a live probe by default', async () => {
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);

    const status = (await harness.callRpc('doctor:status')) as any;
    expect(status).toHaveProperty('installed');
    expect(status).toHaveProperty('executable');
    expect(status).toHaveProperty('state');
    expect(status.pinnedVersion).toBe(PINNED_NATIVE_ACP_VERSION);
    expect(typeof status.installed).toBe('boolean');
    await harness.dispose();
  });

  it('handles auth:login when uninstalled and throws appropriate guidance error', async () => {
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: 'C:/nonexistent/agy_acp_server.exe' });

    await expect(harness.callRpc('auth:login')).rejects.toThrow(/Native ACP runtime is not installed/i);
    await harness.dispose();
  });

  it('handles auth:logout and clears cached native auth state', async () => {
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);

    const status = (await harness.callRpc('auth:logout')) as any;
    expect(status).toHaveProperty('installed');
    expect(status.state).toBeDefined();
    await harness.dispose();
  });

  it('handles doctor:status with probeNative and forceRefresh flags when uninstalled', async () => {
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: 'C:/nonexistent/agy_acp_server.exe' });

    const status = (await harness.callRpc('doctor:status', {
      probeNative: true,
      forceRefresh: true
    })) as any;
    expect(status.installed).toBe(false);
    expect(status.state).toBe('runtime_missing');
    await harness.dispose();
  });

  it('invokes runtime:install and runtime:rollback RPC methods', async () => {
    const installSpy = vi
      .spyOn(nativeRuntime, 'installNativeAcpRuntime')
      .mockResolvedValue({ installed: true } as any);
    const rollbackSpy = vi
      .spyOn(nativeRuntime, 'rollbackNativeAcpRuntime')
      .mockReturnValue({ installed: true } as any);

    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);

    const installRes = (await harness.callRpc('runtime:install')) as any;
    expect(installRes).toHaveProperty('installed');

    const rollbackRes = (await harness.callRpc('runtime:rollback')) as any;
    expect(rollbackRes).toHaveProperty('installed');

    installSpy.mockRestore();
    rollbackSpy.mockRestore();
    await harness.dispose();
  });

  it('invokes auth:login RPC, sets auth url, and validates successful session readiness', async () => {
    const signInSpy = vi
      .spyOn(nativeAuth, 'startNativeAcpSignIn')
      .mockImplementation(async (opts: any) => {
        opts.onAuthUrl?.('https://accounts.google.com/o/oauth2/auth?test=1');
        return { state: 'session_ready', models: [{ id: 'gemini-4-argon', name: 'Gemini 4 Argon' }], modes: [] } as any;
      });

    const fakeDir = makeTempDir('fake-auth-exe-');
    const fakeExe = join(fakeDir, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'exe');
    writeFileSync(join(fakeDir, 'localharness_external.exe'), 'harness');

    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: fakeExe });

    const loginRes = (await harness.callRpc('auth:login', { authMethod: 'oauth-personal' })) as any;
    expect(loginRes).toHaveProperty('installed');

    signInSpy.mockRestore();
    await harness.dispose();
  });

  it('derives launch options with GEMINI_API_KEY when gemini-api-key auth method is selected', async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    try {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
      plugin(zcc);

      const result = harness.providers[0]!.deriveProviderOptions!({
        projectId: 'project-1',
        threadId: 'thread-1',
        permissionMode: 'accept-edits',
        settings: { authMethod: 'gemini-api-key' }
      }) as any;

      expect(result.antigravityAuthMethod).toBe('gemini-api-key');
      expect(result.acpLaunchSpec.env.GEMINI_API_KEY).toBe('test-gemini-key');
      await harness.dispose();
    } finally {
      if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prevKey;
    }
  });
});

describe('native runtime management, MCP sanitization, and host bridge helpers', () => {
  it('verifies SHA-256 checksum mismatch and companion files during runtime install', async () => {
    const baseDir = makeTempDir('zcc-native-runtime-');
    const fakeArchiveBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const actualSha = computeSha256Hex(fakeArchiveBytes);

    await expect(
      installNativeAcpRuntime({
        baseDir,
        platform: 'win32',
        arch: 'x64',
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          statusText: 'OK',
          arrayBuffer: async () => fakeArchiveBytes.buffer
        })) as any
      })
    ).rejects.toThrow(/SHA-256 checksum mismatch/i);
    expect(actualSha).toHaveLength(64);

    const incompleteDir = makeTempDir('zcc-incomplete-');
    const exeOnly = join(incompleteDir, 'agy_acp_server.exe');
    writeFileSync(exeOnly, 'exe');
    const companionCheck = checkCompanionFiles(exeOnly, 'windows-x86_64');
    expect(companionCheck.ok).toBe(false);
    expect(companionCheck.missing).toContain('localharness_external.exe');
  });

  it('resolves managed runtime and rolls back between installed versions', () => {
    const baseDir = makeTempDir('zcc-rollback-runtime-');
    const root = join(baseDir, 'runtimes', 'antigravity-acp');
    for (const ver of ['1.4.0', '1.4.3']) {
      const dir = join(root, ver);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'agy_acp_server.exe'), `${ver}-exe`);
      writeFileSync(join(dir, 'localharness_external.exe'), `${ver}-harness`);
    }
    writeFileSync(
      join(root, 'current.json'),
      JSON.stringify({
        version: '1.4.3',
        previousVersion: '1.4.0',
        installedAt: new Date().toISOString(),
        sha256: 'def',
        platformKey: 'windows-x86_64'
      })
    );

    const before = resolveNativeAcpRuntime({ baseDir, platform: 'win32', arch: 'x64' });
    expect(before.installed).toBe(true);
    expect(before.version).toBe('1.4.3');

    const rolledBack = rollbackNativeAcpRuntime({ baseDir, platform: 'win32', arch: 'x64' });
    expect(rolledBack.version).toBe('1.4.0');
    expect(rolledBack.previousVersion).toBe('1.4.3');
  });

  it('writes sanitized MCP config into a separate ZCC home without mutating source GEMINI_HOME', () => {
    const geminiHome = makeTempDir('gemini-home-');
    const configDir = join(geminiHome, 'config');
    const acpDir = join(geminiHome, 'antigravity-acp');
    mkdirSync(configDir, { recursive: true });
    mkdirSync(acpDir, { recursive: true });

    writeFileSync(join(acpDir, 'acp_token.json'), JSON.stringify({ access_token: 'tok', refresh_token: 'ref' }));
    writeFileSync(
      join(configDir, 'mcp_config.json'),
      JSON.stringify({
        mcpServers: {
          'user-server': { command: 'node', args: ['my-mcp.js'] },
          'data-agent-kit': {
            command: 'node',
            args: ['c:\\Users\\user\\mcp_proxy_bundle.js', 'dataAgentKit-antigravityide']
          }
        }
      })
    );

    const env = { ...process.env, GEMINI_HOME: geminiHome };
    const sanitized = prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    expect(sanitized.geminiHome).not.toBe(geminiHome);
    expect(sanitized.disabledDeadMcpServers).toContain('data-agent-kit');

    const originalMcp = JSON.parse(readFileSync(join(configDir, 'mcp_config.json'), 'utf8'));
    expect(originalMcp.mcpServers['data-agent-kit']).toBeDefined();

    const sanitizedMcp = JSON.parse(readFileSync(join(sanitized.geminiHome, 'config', 'mcp_config.json'), 'utf8'));
    expect(sanitizedMcp.mcpServers['data-agent-kit']).toBeUndefined();
    expect(sanitizedMcp.mcpServers['user-server']).toBeDefined();
  });

  it('extracts parameterized models and respects explicit auth clearing', async () => {
    const geminiHome = makeTempDir('gemini-clear-');
    const env = { ...process.env, GEMINI_HOME: geminiHome };

    const extracted = extractModelsFromSessionResult({
      configOptions: [
        {
          id: 'model',
          category: 'model',
          options: [
            { value: 'gemini-4-argon', name: 'Gemini 4 Argon' },
            { value: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }
          ]
        }
      ]
    });
    expect(extracted).toEqual([
      { id: 'gemini-4-argon', name: 'Gemini 4 Argon' },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }
    ]);

    writeNativeAcpAuthType(null, env);
    expect(readConfiguredNativeAuthType(env)).toBeNull();
    prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    expect(readConfiguredNativeAuthType(env)).toBeNull();

    const missingProbe = await probeNativeAcpReadiness({
      command: join(geminiHome, 'nonexistent-agy_acp_server.exe'),
      args: [],
      authMethod: 'oauth-personal',
      env,
      forceRefresh: true
    });
    expect(missingProbe.state).toBe('runtime_missing');
  });

  it('detects legacy agy-* thread resume and supports context-handoff migration', () => {
    const resumeMsg: any = {
      jsonrpc: '2.0',
      id: 10,
      method: 'thread/resume',
      params: {
        threadId: 'bb-1',
        providerThreadId: 'agy-12345-abcde',
        cwd: process.cwd(),
        options: { permissionMode: 'accept-edits' }
      }
    };

    ensureLaunchSpec(resumeMsg.params);
    expect(resumeMsg.params.providerOptions.acpLaunchSpec.nativeReasoning.configId).toBe('thinking_level');

    const handoff = transformLegacyResumeForNative(resumeMsg);
    expect(handoff.migrationRequired).toBe(true);
    expect(handoff.legacyProviderThreadId).toBe('agy-12345-abcde');

    resumeMsg.params.handoffContext = 'Context summary from legacy CLI thread';
    const migrated = transformLegacyResumeForNative(resumeMsg);
    expect(migrated.rewritten).toBe(true);
    expect(migrated.migrationRequired).toBe(false);
    expect(resumeMsg.method).toBe('thread/start');
  });
});
