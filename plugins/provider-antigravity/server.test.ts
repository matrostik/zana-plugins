import './src/test-environment.js';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakePluginHost } from '@zana-ai/zcc-plugin-sdk/testing';
import plugin from './server.js';
import * as nativeRuntime from './src/native-runtime.js';
import * as nativeAuth from './src/native-auth.js';
import { isAuthExplicitlyCleared } from './src/gemini-home.js';
import { PINNED_NATIVE_ACP_VERSION } from './src/native-runtime.js';

const tempDirs: string[] = [];
function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** A custom runtime executable with its Windows companion file, so it resolves as installed. */
function fakeRuntime(): string {
  const dir = makeTempDir('fake-agy-');
  const executable = join(dir, 'agy_acp_server.exe');
  writeFileSync(executable, 'exe');
  writeFileSync(join(dir, 'localharness_external.exe'), 'harness');
  return executable;
}

const missingRuntime = 'C:/nonexistent/agy_acp_server.exe';

afterEach(() => {
  while (tempDirs.length > 0) {
    try {
      rmSync(tempDirs.pop()!, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
  vi.restoreAllMocks();
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
    expect(provider.composerActions).toContain('plan');
    expect(provider.maintenance?.usage).toBe(true);
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
        nativeExecutable: '  C:/custom/agy_acp_server.exe  '
      }
    }) as any;

    expect(result.acpDialect).toBe('generic');
    expect(result.antigravityAuthMethod).toBe('oauth-personal');
    expect(result.parameterizedModelPicker).toBe(true);
    expect(result.acpLaunchSpec.command).toContain('agy_acp_server.exe');
    expect(result.acpLaunchSpec.command).not.toMatch(/^\s|\s$/);
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

  it('derives launch options with GEMINI_API_KEY when gemini-api-key auth method is selected', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
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
      vi.unstubAllEnvs();
    }
  });

  it('reports doctor:status from cached readiness without spawning a live probe by default', async () => {
    const probe = vi.spyOn(nativeAuth, 'probeNativeAcpReadiness');
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: fakeRuntime() });

    const status = (await harness.callRpc('doctor:status')) as any;
    expect(status).toMatchObject({ installed: true, state: 'sign_in_required', authMethod: 'oauth-personal',
      pinnedVersion: PINNED_NATIVE_ACP_VERSION, pendingAuthUrl: null });
    expect(typeof status.credentialId).toBe('string');
    expect(probe).not.toHaveBeenCalled();
    await harness.dispose();
  });

  it('reports a missing runtime for doctor:status, even when a live probe is requested', async () => {
    const probe = vi.spyOn(nativeAuth, 'probeNativeAcpReadiness');
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: missingRuntime });

    const status = (await harness.callRpc('doctor:status', { probeNative: true, forceRefresh: true })) as any;
    expect(status).toMatchObject({ installed: false, state: 'runtime_missing', models: [] });
    expect(status.error).toMatch(/not installed|archive is incomplete/);
    expect(probe).not.toHaveBeenCalled();
    await harness.dispose();
  });

  it('runs a live probe for doctor:status when requested', async () => {
    const probe = vi.spyOn(nativeAuth, 'probeNativeAcpReadiness').mockResolvedValue({
      state: 'session_ready', agentVersion: '1.4.3', protocolVersion: 1, advertisedAuthMethods: [], selectedAuthMethod: 'oauth-personal',
      configuredAuthType: 'oauth-personal', models: [{ id: 'gemini', name: 'Gemini' }], modes: [], tierName: 'Pro', checkedAt: 1
    });
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: fakeRuntime() });

    const status = (await harness.callRpc('doctor:status', { probeNative: true, forceRefresh: true })) as any;
    expect(status).toMatchObject({ ready: true, models: [{ id: 'gemini' }], tierName: 'Pro' });
    expect(probe).toHaveBeenCalledWith(expect.objectContaining({ forceRefresh: true }));
    await harness.dispose();
  });

  it('handles auth:login when uninstalled and throws appropriate guidance error', async () => {
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: missingRuntime });

    await expect(harness.callRpc('auth:login')).rejects.toThrow(/Native ACP runtime is not installed/i);
    await harness.dispose();
  });

  it('exposes the OAuth URL only while sign-in is pending', async () => {
    let finishSignIn!: () => void;
    vi.spyOn(nativeAuth, 'startNativeAcpSignIn').mockImplementation(async (options: any) => {
      options.onAuthUrl?.('https://accounts.google.com/o/oauth2/auth?test=1');
      await new Promise<void>(resolve => { finishSignIn = resolve; });
      return { state: 'session_ready', models: [], modes: [] } as any;
    });
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: fakeRuntime() });

    const login = harness.callRpc('auth:login', { authMethod: 'oauth-personal' });
    await vi.waitFor(() => expect(finishSignIn).toBeDefined());
    expect(((await harness.callRpc('doctor:status')) as any).pendingAuthUrl).toBe('https://accounts.google.com/o/oauth2/auth?test=1');
    finishSignIn();
    expect(((await login) as any).pendingAuthUrl).toBeNull();
    expect(((await harness.callRpc('doctor:status')) as any).pendingAuthUrl).toBeNull();
    await harness.dispose();
  });

  it('surfaces a failed sign-in and clears the pending OAuth URL', async () => {
    vi.spyOn(nativeAuth, 'startNativeAcpSignIn').mockImplementation(async (options: any) => {
      options.onAuthUrl?.('https://accounts.google.com/o/oauth2/auth?test=2');
      return { state: 'sign_in_required', error: 'Sign-in cancelled', models: [], modes: [] } as any;
    });
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: fakeRuntime() });

    await expect(harness.callRpc('auth:login')).rejects.toThrow('Sign-in cancelled');
    expect(((await harness.callRpc('doctor:status')) as any).pendingAuthUrl).toBeNull();
    await harness.dispose();
  });

  it('signs out by clearing the configured auth type', async () => {
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ nativeExecutable: fakeRuntime() });

    const status = (await harness.callRpc('auth:logout')) as any;
    expect(status).toMatchObject({ installed: true, authenticated: false, state: 'sign_in_required' });
    expect(isAuthExplicitlyCleared()).toBe(true);
    await harness.dispose();
  });

  it('invalidates cached readiness after runtime:install and runtime:rollback', async () => {
    vi.spyOn(nativeRuntime, 'installNativeAcpRuntime').mockResolvedValue({ installed: true } as any);
    vi.spyOn(nativeRuntime, 'rollbackNativeAcpRuntime').mockReturnValue({ installed: true } as any);
    const clear = vi.spyOn(nativeAuth, 'clearCachedNativeReadiness');
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);

    expect(await harness.callRpc('runtime:install')).toHaveProperty('state');
    expect(await harness.callRpc('runtime:rollback')).toHaveProperty('state');
    expect(clear).toHaveBeenCalledTimes(2);
    await harness.dispose();
  });

  it('checks usage against the configured runtime and trims its override', async () => {
    const query = vi.spyOn(nativeAuth, 'queryNativeUsage').mockResolvedValue({ supported: true, usage: {
      status: 'ok', planLabel: 'Pro', accountEmail: null, checkedAt: 1, source: 'native-acp-/usage', windows: []
    } });
    const executable = fakeRuntime();
    const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
    plugin(zcc);
    harness.setSettings({ authMethod: 'agent-platform', nativeExecutable: `  ${executable}  ` });

    expect(((await harness.callRpc('usage:status')) as any).usage.planLabel).toBe('Pro');
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ command: executable, authMethod: 'agent-platform' }));
    await harness.dispose();
  });
});
