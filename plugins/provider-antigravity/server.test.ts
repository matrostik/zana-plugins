import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakePluginHost } from '@zana-ai/zcc-plugin-sdk/testing';
import plugin from './server.js';
import artifact from './server.mjs';
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
  getFastNativeReadiness,
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

for (const [name, register] of [
  ['source', plugin],
  ['artifact', artifact]
] as const) {
  describe(`antigravity provider plugin (${name})`, () => {
    it('registers the Antigravity Native ACP provider, settings, and capabilities', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
      register(zcc);

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
      expect(provider.experimental_bridgeOptions).toMatchObject({
        acpDialect: 'generic',
        parameterizedModelPicker: true,
        acpLaunchSpec: {
          displayName: 'Antigravity',
          nativeReasoning: {
            configId: 'thinking_level',
            supportedLevels: ['low', 'medium', 'high'],
            defaultLevel: 'medium'
          }
        }
      });
      expect(provider.models?.fallback).toBeDefined();
      expect(provider.models?.fallback?.length).toBeGreaterThanOrEqual(2);
      expect(harness.settings).toHaveProperty('authMethod');
      expect(harness.settings).toHaveProperty('nativeExecutable');
      expect(harness.settings).not.toHaveProperty('backend');
      expect(harness.settings).not.toHaveProperty('executable');
      await harness.dispose();
    });

    it('derives Native ACP launch options with sanitized GEMINI_HOME and thinking_level reasoning', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
      register(zcc);

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
      register(zcc);

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
      register(zcc);
      harness.setSettings({ nativeExecutable: 'C:/nonexistent/agy_acp_server.exe' });

      await expect(harness.callRpc('auth:login')).rejects.toThrow(/Native ACP runtime is not installed/i);
      await harness.dispose();
    });

    it('handles auth:logout and clears cached native auth state', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
      register(zcc);

      const status = (await harness.callRpc('auth:logout')) as any;
      expect(status).toHaveProperty('installed');
      expect(status.state).toBeDefined();
      await harness.dispose();
    });

    it('handles doctor:status with probeNative and forceRefresh flags when uninstalled', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
      register(zcc);
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

    it('invokes auth:login RPC and receives auth url', async () => {
      const signInSpy = vi
        .spyOn(nativeAuth, 'startNativeAcpSignIn')
        .mockImplementation(async (opts: any) => {
          opts.onAuthUrl?.('https://accounts.google.com/o/oauth2/auth?test=1');
          return { state: 'session_ready' } as any;
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
        register(zcc);

        const result = harness.providers[0]!.deriveProviderOptions!({
          projectId: 'project-1',
          threadId: 'thread-1',
          permissionMode: 'accept-edits',
          settings: {
            authMethod: 'gemini-api-key'
          }
        }) as any;

        expect(result.antigravityAuthMethod).toBe('gemini-api-key');
        expect(result.acpLaunchSpec.env.GEMINI_API_KEY).toBe('test-gemini-key');
        await harness.dispose();
      } finally {
        if (prevKey === undefined) {
          delete process.env.GEMINI_API_KEY;
        } else {
          process.env.GEMINI_API_KEY = prevKey;
        }
      }
    });
  });
}

describe('native runtime management, MCP sanitization, and host bridge helpers', () => {
  it('installs, verifies SHA-256 checksum, checks companion files, and supports rollback', async () => {
    const baseDir = makeTempDir('zcc-native-runtime-');
    const fakeArchiveBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const actualSha = computeSha256Hex(fakeArchiveBytes);

    // Rejects on SHA-256 mismatch
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

    // Pre-populate a previous version (1.4.0) to verify rollback
    const root = join(baseDir, 'runtimes', 'antigravity-acp');
    const prevDir = join(root, '1.4.0');
    mkdirSync(prevDir, { recursive: true });
    writeFileSync(join(prevDir, 'agy_acp_server.exe'), 'old-exe');
    writeFileSync(join(prevDir, 'localharness_external.exe'), 'old-harness');
    writeFileSync(
      join(root, 'current.json'),
      JSON.stringify({
        version: '1.4.0',
        previousVersion: null,
        installedAt: new Date().toISOString(),
        sha256: 'abc',
        platformKey: 'windows-x86_64'
      })
    );

    const before = resolveNativeAcpRuntime({ baseDir, platform: 'win32', arch: 'x64' });
    expect(before.installed).toBe(true);
    expect(before.version).toBe('1.4.0');
    expect(before.companionFilesPresent).toBe(true);

    // Check companion detection when localharness_external.exe is missing
    const incompleteDir = makeTempDir('zcc-incomplete-');
    const exeOnly = join(incompleteDir, 'agy_acp_server.exe');
    writeFileSync(exeOnly, 'exe');
    const companionCheck = checkCompanionFiles(exeOnly, 'windows-x86_64');
    expect(companionCheck.ok).toBe(false);
    expect(companionCheck.missing).toContain('localharness_external.exe');

    // Rollback when previousVersion is set
    const nextDir = join(root, '1.4.3');
    mkdirSync(nextDir, { recursive: true });
    writeFileSync(join(nextDir, 'agy_acp_server.exe'), 'new-exe');
    writeFileSync(join(nextDir, 'localharness_external.exe'), 'new-harness');
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

    const rolledBack = rollbackNativeAcpRuntime({ baseDir, platform: 'win32', arch: 'x64' });
    expect(rolledBack.version).toBe('1.4.0');
    expect(rolledBack.previousVersion).toBe('1.4.3');
  });

  it('disables unreachable IDE named-pipe MCP proxies in prepareSanitizedGeminiHome and extracts parameterized models', async () => {
    const geminiHome = makeTempDir('gemini-home-');
    const configDir = join(geminiHome, 'config');
    const acpDir = join(geminiHome, 'antigravity-acp');
    mkdirSync(configDir, { recursive: true });
    mkdirSync(acpDir, { recursive: true });

    writeFileSync(
      join(acpDir, 'acp_token.json'),
      JSON.stringify({ access_token: 'tok', refresh_token: 'ref' })
    );
    writeFileSync(
      join(configDir, 'mcp_config.json'),
      JSON.stringify({
        mcpServers: {
          'user-server': {
            command: 'node',
            args: ['my-mcp.js']
          },
          'data-agent-kit': {
            command: 'node',
            args: [
              'c:\\Users\\user\\.antigravity-ide\\extensions\\googlecloudtools.datacloud\\mcp_proxy_bundle.js',
              'dataAgentKit-antigravityide'
            ]
          }
        }
      })
    );

    const env = { ...process.env, GEMINI_HOME: geminiHome };
    const sanitized = prepareSanitizedGeminiHome({ env, authMethod: 'oauth-personal' });
    expect(sanitized.disabledDeadMcpServers).toContain('data-agent-kit');

    const sanitizedMcp = JSON.parse(readFileSync(join(configDir, 'mcp_config.json'), 'utf8'));
    expect(sanitizedMcp.mcpServers['data-agent-kit']).toBeUndefined();
    expect(sanitizedMcp.mcpServers['user-server']).toBeDefined();

    // Auto-populated settings.json because acp_token.json was present
    expect(readConfiguredNativeAuthType(env)).toBe('oauth-personal');

    // Fast readiness check returns session_ready in < 5ms when binary + token exist
    const fakeExe = join(geminiHome, 'agy_acp_server.exe');
    writeFileSync(fakeExe, 'binary');
    const fast = getFastNativeReadiness({
      command: fakeExe,
      args: [],
      authMethod: 'oauth-personal',
      env
    });
    expect(fast.state).toBe('session_ready');
    expect(fast.models.map((m) => m.id)).toEqual([
      'gemini-4-argon',
      'gemini-3.8-flash',
      'claude-opus-5-5',
      'claude-sonnet-5-5',
      'gpt-oss-120b-medium'
    ]);

    // Extract parameterized models from session/new response
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
      ],
      models: {
        availableModels: [
          { modelId: 'gemini-4-argon-high', name: 'Gemini 4 Argon (High)' }
        ]
      }
    });
    expect(extracted).toEqual([
      { id: 'gemini-4-argon', name: 'Gemini 4 Argon' },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }
    ]);

    writeNativeAcpAuthType(null, env);
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

  it('transparently rewrites legacy agy-* thread resume into fresh native thread/start', () => {
    const resumeMsg: any = {
      jsonrpc: '2.0',
      id: 10,
      method: 'thread/resume',
      params: {
        threadId: 'bb-1',
        providerThreadId: 'agy-12345-abcde',
        cwd: process.cwd(),
        options: {
          permissionMode: 'accept-edits'
        }
      }
    };

    ensureLaunchSpec(resumeMsg.params);
    expect(resumeMsg.params.providerOptions.acpLaunchSpec.nativeReasoning.configId).toBe(
      'thinking_level'
    );

    const handoff = transformLegacyResumeForNative(resumeMsg);
    expect(handoff.rewritten).toBe(true);
    expect(resumeMsg.method).toBe('thread/start');
    expect(resumeMsg.params.providerThreadId).toBeUndefined();
  });
});
