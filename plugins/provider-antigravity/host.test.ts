import { EventEmitter } from 'node:events';
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
import * as nativeRuntime from './src/native-runtime.js';

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
      options: {
        providerOptions: {
          antigravityAuthMethod: 'gemini-api-key'
        }
      },
      providerOptions: {
        antigravityAuthMethod: 'gemini-api-key'
      }
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
          acpLaunchSpec: {
            command: 'custom.exe',
            args: ['--test'],
            env: { CUSTOM_VAR: 'value' }
          }
        }
      },
      providerOptions: {
        acpDialect: 'generic',
        acpLaunchSpec: {
          command: 'custom.exe',
          args: ['--test']
        }
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
      transformLegacyResumeForNative({
        method: 'thread/resume',
        params: { providerThreadId: 12345 }
      }).migrationRequired
    ).toBe(false);
    expect(
      transformLegacyResumeForNative({
        method: 'thread/resume',
        params: { providerThreadId: 'claude-12345' }
      }).migrationRequired
    ).toBe(false);
    expect(isLegacyAgyThreadResume(null)).toBeNull();
    expect(isLegacyAgyThreadResume({ method: 'thread/resume', params: { providerThreadId: 'agy-123' } })).toBe('agy-123');
  });

  it('transformLegacyResumeForNative flags agy-* resume as requiring migration without silent rewrite', () => {
    const msg = {
      method: 'thread/resume',
      params: { providerThreadId: 'agy-session-999', cwd: '/work' }
    };
    const res = transformLegacyResumeForNative(msg);
    expect(res.rewritten).toBe(false);
    expect(res.migrationRequired).toBe(true);
    expect(res.legacyProviderThreadId).toBe('agy-session-999');
    expect(msg.method).toBe('thread/resume');
  });

  it('handles provider/health when runtime is not installed', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue({
      installed: false,
      executable: 'agy_acp_server.exe',
      args: [],
      version: null,
      previousVersion: null,
      source: 'uninstalled',
      companionFilesPresent: false,
      missingCompanionFiles: [],
      platformKey: 'windows-x86_64'
    });

    experimental_providerBridge.handleLine(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'provider/health',
        params: { providerOptions: {} }
      })
    );

    const output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
    expect(output.result.health.status).toBe('not_installed');
    expect(output.result.health.statusMessage).toContain('not installed');

    stdoutSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('handles provider/health when sign_in_required vs ready', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue({
      installed: true,
      executable: 'agy_acp_server.exe',
      args: [],
      version: '1.4.3',
      previousVersion: null,
      source: 'managed',
      companionFilesPresent: true,
      missingCompanionFiles: [],
      platformKey: 'windows-x86_64'
    });

    // 1. Sign in required
    vi.spyOn(nativeAuth, 'getFastNativeReadiness').mockReturnValue({
      state: 'sign_in_required',
      agentVersion: null,
      protocolVersion: 1,
      advertisedAuthMethods: ['oauth-personal'],
      selectedAuthMethod: 'oauth-personal',
      configuredAuthType: null,
      models: [],
      modes: [],
      error: 'Please sign in',
      checkedAt: Date.now()
    });

    experimental_providerBridge.handleLine(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'provider/health',
        params: { providerOptions: {} }
      })
    );

    let output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
    expect(output.result.health.status).toBe('unauthenticated');
    expect(output.result.health.statusMessage).toContain('Sign in required');

    // 2. Ready
    stdoutSpy.mockClear();
    vi.spyOn(nativeAuth, 'getFastNativeReadiness').mockReturnValue({
      state: 'session_ready',
      agentVersion: '1.4.3',
      protocolVersion: 1,
      advertisedAuthMethods: ['oauth-personal'],
      selectedAuthMethod: 'oauth-personal',
      configuredAuthType: 'oauth-personal',
      models: [],
      modes: [],
      tierName: 'Google Ultra Tier',
      checkedAt: Date.now()
    });

    experimental_providerBridge.handleLine(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'provider/health',
        params: { providerOptions: { antigravityAuthMethod: 'oauth-personal' } }
      })
    );

    output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
    expect(output.result.health.status).toBe('ready');
    expect(output.result.health.planLabel).toBe('Google Ultra Tier');

    stdoutSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('handles model/list for uninstalled, unauthenticated, and ready states', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    // Uninstalled
    experimental_providerBridge.handleLine(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'model/list',
        params: {
          options: {
            providerOptions: {
              acpLaunchSpec: { command: 'C:/nonexistent/agy_acp_server.exe' }
            }
          }
        }
      })
    );
    let output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
    expect(output.error.code).toBe(-32000);
    expect(output.error.message).toContain('not installed');

    // Sign in required
    stdoutSpy.mockClear();
    vi.spyOn(nativeRuntime, 'resolveNativeAcpRuntime').mockReturnValue({
      installed: true,
      executable: 'agy_acp_server.exe',
      args: [],
      version: '1.4.3',
      previousVersion: null,
      source: 'managed',
      companionFilesPresent: true,
      missingCompanionFiles: [],
      platformKey: 'windows-x86_64'
    });
    vi.spyOn(nativeAuth, 'getFastNativeReadiness').mockReturnValue({
      state: 'sign_in_required',
      agentVersion: null,
      protocolVersion: 1,
      advertisedAuthMethods: ['oauth-personal'],
      selectedAuthMethod: 'oauth-personal',
      configuredAuthType: null,
      models: [],
      modes: [],
      error: 'Expired token',
      checkedAt: Date.now()
    });

    experimental_providerBridge.handleLine(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'model/list',
        params: { providerOptions: {} }
      })
    );
    output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
    expect(output.error.data.recovery.kind).toBe('authRequired');

    // Success with custom and default models
    stdoutSpy.mockClear();
    vi.spyOn(nativeAuth, 'getFastNativeReadiness').mockReturnValue({
      state: 'session_ready',
      agentVersion: '1.4.3',
      protocolVersion: 1,
      advertisedAuthMethods: ['oauth-personal'],
      selectedAuthMethod: 'oauth-personal',
      configuredAuthType: 'oauth-personal',
      models: [
        { id: 'gemini-custom', name: 'Gemini Custom', description: 'desc' },
        { id: 'gpt-oss-120b-custom', name: 'GPT OSS 120B' }
      ],
      modes: [],
      checkedAt: Date.now()
    });

    experimental_providerBridge.handleLine(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'model/list',
        params: { providerOptions: {} }
      })
    );
    output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
    expect(output.result.models).toHaveLength(2);
    expect(output.result.models[0].supportedReasoningEfforts).toHaveLength(3);
    expect(output.result.models[1].supportedReasoningEfforts).toHaveLength(1);

    stdoutSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('covers remaining branches in ensureLaunchSpec and providerBridge message forwarding', () => {
    // line 38 / 43 branch
    const params1: any = { options: { providerOptions: { acpLaunchSpec: { command: 'test.exe' } } } };
    ensureLaunchSpec(params1);

    const params2: any = { options: { providerOptions: { acpDialect: 'generic' } } };
    ensureLaunchSpec(params2);

    // line 55 branch: spec.env without GEMINI_HOME
    const params3: any = { providerOptions: { acpLaunchSpec: { command: 'test.exe', env: {} } } };
    ensureLaunchSpec(params3);

    // lines 329-337: thread/resume handoff and modified launch forwarding
    const resumeLine = JSON.stringify({
      jsonrpc: '2.0',
      id: 99,
      method: 'thread/resume',
      params: {
        providerThreadId: 'agy-session-123',
        options: { providerOptions: {} }
      }
    });
    expect(() => experimental_providerBridge.handleLine(resumeLine)).not.toThrow();

    const otherLine = JSON.stringify({
      jsonrpc: '2.0',
      id: 100,
      method: 'thread/status',
      params: { options: {} }
    });
    expect(() => experimental_providerBridge.handleLine(otherLine)).not.toThrow();
  });

  it('handles invalid lines and lifecycle methods on bridge', () => {
    const origClose = realAcpBridge.onClose;
    (realAcpBridge as any).onClose = () => {};

    // Non-JSON line falls through cleanly
    expect(() => experimental_providerBridge.handleLine('INVALID-JSON-LINE')).not.toThrow();

    // Lifecycle delegates
    expect(() => experimental_providerBridge.start?.({} as any)).not.toThrow();
    expect(() => experimental_providerBridge.onClose?.()).not.toThrow();
    expect(() => experimental_providerBridge.onSigterm?.()).not.toThrow();
    expect(() => experimental_providerBridge.onSigint?.()).not.toThrow();

    (realAcpBridge as any).onClose = origClose;
  });
});
