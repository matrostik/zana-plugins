import './src/test-environment.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureLaunchSpec,
  experimental_providerBridge,
  isLegacyAgyThreadResume,
  realAcpBridge,
  transformLegacyResumeForNative
} from './host.js';
import * as nativeAuth from './src/native-auth.js';
import type { NativeReadinessResult } from './src/native-auth.js';
import * as nativeRuntime from './src/native-runtime.js';
import type { ResolvedNativeRuntime } from './src/native-runtime.js';

function makeRuntimeFixture(overrides: Partial<ResolvedNativeRuntime> = {}): ResolvedNativeRuntime {
  return {
    installed: true,
    executable: 'agy_acp_server.exe',
    args: [],
    version: '1.4.3',
    previousVersion: null,
    source: 'managed',
    companionFilesPresent: true,
    missingCompanionFiles: [],
    platformKey: 'windows-x86_64',
    ...overrides
  };
}

function makeReadinessFixture(overrides: Partial<NativeReadinessResult> = {}): NativeReadinessResult {
  return {
    state: 'session_ready',
    agentVersion: '1.4.3',
    protocolVersion: 1,
    advertisedAuthMethods: ['oauth-personal'],
    selectedAuthMethod: 'oauth-personal',
    configuredAuthType: 'oauth-personal',
    models: [],
    modes: [],
    checkedAt: Date.now(),
    ...overrides
  };
}

function invokeBridgeRpc(request: Record<string, unknown>): any {
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  try {
    experimental_providerBridge.handleLine(JSON.stringify(request));
    expect(stdoutSpy).toHaveBeenCalled();
    return JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
  } finally {
    stdoutSpy.mockRestore();
  }
}

describe('host.ts provider bridge and launch helpers', () => {
  let tempGemini: string;

  beforeEach(() => {
    tempGemini = mkdtempSync(join(tmpdir(), 'agy-host-test-'));
    process.env.GEMINI_HOME = tempGemini;
  });

  afterEach(() => {
    delete process.env.GEMINI_HOME;
    try {
      rmSync(tempGemini, { recursive: true, force: true });
    } catch {}
    vi.restoreAllMocks();
  });

  it('ensureLaunchSpec handles null, undefined, and non-object inputs', () => {
    expect(ensureLaunchSpec(null)).toBe(false);
    expect(ensureLaunchSpec(undefined)).toBe(false);
    expect(ensureLaunchSpec('string')).toBe(false);
    expect(ensureLaunchSpec(123)).toBe(false);
  });

  it('ensureLaunchSpec initializes missing providerOptions in options and root', () => {
    const params: any = { options: {} };
    const modified = ensureLaunchSpec(params);
    expect(modified).toBe(true);
    expect(params.options.providerOptions).toBeDefined();
    expect(params.options.providerOptions.acpDialect).toBe('generic');
    expect(params.options.providerOptions.acpLaunchSpec.displayName).toBe('Antigravity');
    expect(params.providerOptions).toBeDefined();
    expect(params.providerOptions.acpLaunchSpec.nativeReasoning.configId).toBe('thinking_level');
  });

  it('ensureLaunchSpec populates acpLaunchSpec when providerOptions exists without it', () => {
    const params: any = {
      options: { providerOptions: { antigravityAuthMethod: 'gemini-api-key' } },
      providerOptions: { antigravityAuthMethod: 'gemini-api-key' }
    };
    const modified = ensureLaunchSpec(params);
    expect(modified).toBe(true);
    expect(params.options.providerOptions.acpLaunchSpec.env.AGY_ACP_AUTH_METHOD).toBe('gemini-api-key');
    expect(params.providerOptions.acpLaunchSpec.env.AGY_ACP_AUTH_METHOD).toBe('gemini-api-key');
  });

  it('ensureLaunchSpec handles params with only root providerOptions', () => {
    const params: any = {
      providerOptions: {
        antigravityAuthMethod: 'gemini-api-key',
        acpLaunchSpec: {
          env: { GEMINI_HOME: '' },
          nativeReasoning: { configId: 'custom' }
        }
      }
    };
    const modified = ensureLaunchSpec(params);
    expect(modified).toBe(true);
    expect(params.providerOptions.acpLaunchSpec.env.GEMINI_HOME).toBeTruthy();
    expect(params.providerOptions.acpLaunchSpec.nativeReasoning.configId).toBe('custom');
  });

  it('ensureLaunchSpec enriches existing acpLaunchSpec env and reasoning', () => {
    const params: any = {
      options: {
        providerOptions: {
          acpDialect: 'generic',
          acpLaunchSpec: { command: 'custom.exe', args: ['--test'], env: { CUSTOM_VAR: 'value' } }
        }
      },
      providerOptions: {
        acpDialect: 'generic',
        acpLaunchSpec: { command: 'custom.exe', args: ['--test'] }
      }
    };
    const modified = ensureLaunchSpec(params);
    expect(modified).toBe(true);
    expect(params.options.providerOptions.acpLaunchSpec.env.CUSTOM_VAR).toBe('value');
    expect(params.options.providerOptions.acpLaunchSpec.env.BROWSER).toBe('echo');
    expect(params.options.providerOptions.acpLaunchSpec.nativeReasoning.defaultLevel).toBe('medium');
    expect(params.providerOptions.acpLaunchSpec.nativeReasoning.defaultLevel).toBe('medium');
  });

  it('transformLegacyResumeForNative and isLegacyAgyThreadResume guard against invalid messages', () => {
    expect(transformLegacyResumeForNative(null).migrationRequired).toBe(false);
    expect(transformLegacyResumeForNative({}).migrationRequired).toBe(false);
    expect(transformLegacyResumeForNative({ method: 'thread/start', params: {} }).migrationRequired).toBe(false);
    expect(
      transformLegacyResumeForNative({ method: 'thread/resume', params: { providerThreadId: 12345 } })
        .migrationRequired
    ).toBe(false);
    expect(
      transformLegacyResumeForNative({ method: 'thread/resume', params: { providerThreadId: 'claude-12345' } })
        .migrationRequired
    ).toBe(false);
    expect(isLegacyAgyThreadResume(null)).toBeNull();
    expect(isLegacyAgyThreadResume({ method: 'thread/resume', params: { providerThreadId: 'agy-123' } })).toBe(
      'agy-123'
    );
  });

  it('transformLegacyResumeForNative requires handoff or rewrites when handoffContext is provided', () => {
    const unmigrated = {
      method: 'thread/resume',
      params: { providerThreadId: 'agy-session-999', cwd: '/work' }
    };
    const res1 = transformLegacyResumeForNative(unmigrated);
    expect(res1.rewritten).toBe(false);
    expect(res1.migrationRequired).toBe(true);
    expect(res1.legacyProviderThreadId).toBe('agy-session-999');
    expect(unmigrated.method).toBe('thread/resume');

    const withHandoff: any = {
      method: 'thread/resume',
      params: { providerThreadId: 'agy-session-999', cwd: '/work', handoffContext: 'Prior thread summary' }
    };
    const res2 = transformLegacyResumeForNative(withHandoff);
    expect(res2.rewritten).toBe(true);
    expect(res2.migrationRequired).toBe(false);
    expect(res2.handoffContext).toBe('Prior thread summary');
    expect(withHandoff.method).toBe('thread/start');
    expect(withHandoff.params.migratedFromProviderThreadId).toBe('agy-session-999');
    expect(withHandoff.params.providerThreadId).toBeUndefined();
  });

  it('handles provider/health when runtime is not installed', () => {
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue(
      makeRuntimeFixture({
        installed: false,
        version: null,
        source: 'uninstalled',
        companionFilesPresent: false
      })
    );

    const output = invokeBridgeRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'provider/health',
      params: { providerOptions: {} }
    });
    expect(output.result.health.status).toBe('not_installed');
    expect(output.result.health.statusMessage).toContain('not installed');
  });

  it('handles parameterless provider/health and maps non-session_ready states to non-ready', () => {
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue(makeRuntimeFixture());
    vi.spyOn(nativeAuth, 'getFastNativeReadiness').mockReturnValue(
      makeReadinessFixture({ state: 'authenticated', agentVersion: null })
    );

    const authOutput = invokeBridgeRpc({ jsonrpc: '2.0', id: 2, method: 'provider/health' });
    expect(authOutput.result.health.status).toBe('unknown');
    expect(authOutput.result.health.statusMessage).toContain('not verified');

    vi.spyOn(nativeAuth, 'getFastNativeReadiness').mockReturnValue(
      makeReadinessFixture({ state: 'runtime_launches', error: 'Handshake incomplete' })
    );
    const launchOutput = invokeBridgeRpc({ jsonrpc: '2.0', id: 3, method: 'provider/health' });
    expect(launchOutput.result.health.status).toBe('unknown');
    expect(launchOutput.result.health.statusMessage).toBe('Handshake incomplete');
  });

  it('handles provider/health when sign_in_required vs session_ready', () => {
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue(makeRuntimeFixture());
    vi.spyOn(nativeAuth, 'getFastNativeReadiness').mockReturnValue(
      makeReadinessFixture({ state: 'sign_in_required', configuredAuthType: null })
    );

    const unauth = invokeBridgeRpc({
      jsonrpc: '2.0',
      id: 4,
      method: 'provider/health',
      params: { providerOptions: {} }
    });
    expect(unauth.result.health.status).toBe('unauthenticated');
    expect(unauth.result.health.statusMessage).toContain('Sign in required');

    vi.spyOn(nativeAuth, 'getFastNativeReadiness').mockReturnValue(
      makeReadinessFixture({ state: 'session_ready', tierName: 'Google Ultra Tier' })
    );
    const ready = invokeBridgeRpc({
      jsonrpc: '2.0',
      id: 5,
      method: 'provider/health',
      params: { providerOptions: { antigravityAuthMethod: 'oauth-personal' } }
    });
    expect(ready.result.health.status).toBe('ready');
    expect(ready.result.health.planLabel).toBe('Google Ultra Tier');
  });

  it('handles model/list errors when runtime is uninstalled or sign_in_required', () => {
    const uninstalled = invokeBridgeRpc({
      jsonrpc: '2.0',
      id: 6,
      method: 'model/list',
      params: {
        options: {
          providerOptions: { acpLaunchSpec: { command: 'C:/nonexistent/agy_acp_server.exe' } }
        }
      }
    });
    expect(uninstalled.error.code).toBe(-32000);
    expect(uninstalled.error.message).toContain('not installed');

    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue(makeRuntimeFixture());
    vi.spyOn(nativeAuth, 'resolveNativeCatalog').mockReturnValue(
      makeReadinessFixture({ state: 'sign_in_required', configuredAuthType: null, error: 'Expired token' })
    );
    const signIn = invokeBridgeRpc({ jsonrpc: '2.0', id: 7, method: 'model/list' });
    expect(signIn.error.data.recovery.kind).toBe('authRequired');
  });

  it('refreshes a cold catalog and returns models rather than requiring a Settings visit', async () => {
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue(makeRuntimeFixture());
    vi.spyOn(nativeAuth, 'resolveNativeCatalog').mockResolvedValue(makeReadinessFixture({
      models: [{ id: 'gemini', name: 'Gemini' }]
    }));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    experimental_providerBridge.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 71, method: 'model/list', params: { forceRefresh: true } }));
    await vi.waitFor(() => expect(write).toHaveBeenCalled());
    const response = JSON.parse(String(write.mock.calls[0][0]));
    expect(response.result.models[0].id).toBe('gemini');
    expect(nativeAuth.resolveNativeCatalog).toHaveBeenCalledTimes(1);
    expect(nativeAuth.resolveNativeCatalog).toHaveBeenCalledWith(expect.objectContaining({ forceRefresh: true }));
  });

  it('returns observed quota windows through provider/usage', async () => {
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue(makeRuntimeFixture());
    vi.spyOn(nativeAuth, 'queryNativeUsage').mockResolvedValue({ supported: true, usage: {
      status: 'ok', planLabel: 'Pro', accountEmail: null, checkedAt: 123, source: 'native-acp-/usage',
      windows: [{ label: 'Gemini — Weekly', usedPercent: 86, resetsAt: null }]
    } });
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    experimental_providerBridge.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 72, method: 'provider/usage' }));
    await vi.waitFor(() => expect(write).toHaveBeenCalled());
    expect(JSON.parse(String(write.mock.calls[0][0])).result.usage.windows[0].usedPercent).toBe(86);
  });

  it('answers provider/usage and model/list with an error when synchronous setup throws', () => {
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue(makeRuntimeFixture());
    vi.spyOn(nativeAuth, 'queryNativeUsage').mockImplementation(() => { throw new Error('EACCES: usage home'); });
    vi.spyOn(nativeAuth, 'resolveNativeCatalog').mockImplementation(() => { throw new Error('EACCES: catalog home'); });
    const forwarded = vi.spyOn(realAcpBridge, 'handleLine').mockImplementation(() => undefined);
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    experimental_providerBridge.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 74, method: 'provider/usage' }));
    experimental_providerBridge.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 75, method: 'model/list' }));
    const responses = write.mock.calls.map(call => JSON.parse(String(call[0])));
    expect(responses).toEqual([
      expect.objectContaining({ id: 74, error: expect.objectContaining({ message: 'EACCES: usage home' }) }),
      expect.objectContaining({ id: 75, error: expect.objectContaining({ message: 'EACCES: catalog home' }) })
    ]);
    expect(forwarded).not.toHaveBeenCalled();
  });

  it('labels a stale catalog visibly while preserving the selectable model identity', async () => {
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue(makeRuntimeFixture());
    const stale = makeReadinessFixture({ state: 'authenticated', catalogStale: true,
      models: [{ id: 'gemini', name: 'Gemini' }], error: 'Backend unavailable' });
    vi.spyOn(nativeAuth, 'resolveNativeCatalog').mockResolvedValue(stale);
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    experimental_providerBridge.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 73, method: 'model/list' }));
    await vi.waitFor(() => expect(write).toHaveBeenCalled());
    const response = JSON.parse(String(write.mock.calls[0][0]));
    expect(response.result.models[0]).toMatchObject({ id: 'gemini', model: 'gemini', displayName: 'Gemini (cached)' });
    expect(response.result._meta.stale).toBe(true);
  });

  it('reports a failed catalog refresh as a model/list error', async () => {
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue(makeRuntimeFixture());
    vi.spyOn(nativeAuth, 'resolveNativeCatalog').mockRejectedValue(new Error('probe crashed'));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    experimental_providerBridge.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 76, method: 'model/list' }));
    await vi.waitFor(() => expect(write).toHaveBeenCalled());
    expect(JSON.parse(String(write.mock.calls[0][0]))).toMatchObject({ id: 76, error: { code: -32000, message: 'probe crashed' } });
  });

  it('forwards a message unchanged when its launch spec is already complete', () => {
    const params: any = { providerOptions: {}, options: {} };
    ensureLaunchSpec(params);
    expect(ensureLaunchSpec(params)).toBe(false);
    const forwarded = vi.spyOn(realAcpBridge, 'handleLine').mockImplementation(() => undefined);
    const line = JSON.stringify({ jsonrpc: '2.0', id: 77, method: 'turn/start', params });
    experimental_providerBridge.handleLine(line);
    expect(forwarded).toHaveBeenCalledWith(line);
  });

  it('covers remaining branches in ensureLaunchSpec and providerBridge message forwarding', () => {
    ensureLaunchSpec({ options: { providerOptions: { acpLaunchSpec: { command: 'test.exe' } } } });
    ensureLaunchSpec({ options: { providerOptions: { acpDialect: 'generic' } } });
    ensureLaunchSpec({ providerOptions: { acpLaunchSpec: { command: 'test.exe', env: {} } } });

    const resumeError = invokeBridgeRpc({
      jsonrpc: '2.0',
      id: 99,
      method: 'thread/resume',
      params: { providerThreadId: 'agy-session-123', options: { providerOptions: {} } }
    });
    expect(resumeError.error.data.recovery.action).toBe('resumeWithHandoffContext');

    const bridgeSpy = vi.spyOn(realAcpBridge, 'handleLine').mockImplementation(() => {});
    experimental_providerBridge.handleLine(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 101,
        method: 'thread/resume',
        params: { providerThreadId: 'agy-session-123', handoffContext: 'Summary', options: {} }
      })
    );
    expect(bridgeSpy).toHaveBeenCalledWith(expect.stringContaining('"method":"thread/start"'));
  });

  it('handles invalid lines and lifecycle methods on bridge', () => {
    vi.spyOn(realAcpBridge, 'handleLine').mockImplementation(() => {});
    for (const key of ['start', 'onClose', 'onSigterm', 'onSigint'] as const) {
      if (realAcpBridge[key]) vi.spyOn(realAcpBridge, key).mockImplementation(() => {});
    }

    expect(() => experimental_providerBridge.handleLine('INVALID-JSON-LINE')).not.toThrow();
    expect(() => experimental_providerBridge.start?.({} as any)).not.toThrow();
    expect(() => experimental_providerBridge.onClose?.()).not.toThrow();
    expect(() => experimental_providerBridge.onSigterm?.()).not.toThrow();
    expect(() => experimental_providerBridge.onSigint?.()).not.toThrow();

  });
});
