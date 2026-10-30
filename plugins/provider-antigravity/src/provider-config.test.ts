import './test-environment.js';
import { describe, expect, it } from 'vitest';
import type { ResolvedNativeRuntime } from './native-runtime.js';
import {
  buildNativeLaunchSpec,
  completeLaunchSpec,
  doctorStatus,
  healthFromReadiness,
  modelListFromReadiness,
  readProviderSettings
} from './provider-config.js';
import { readinessResult, type NativeReadinessResult } from './readiness-store.js';

const runtime: ResolvedNativeRuntime = {
  installed: true, executable: 'agy_acp_server.exe', args: [], version: '1.4.3', previousVersion: null, source: 'managed',
  companionFilesPresent: true, missingCompanionFiles: [], platformKey: 'windows-x86_64'
};
const missingRuntime: ResolvedNativeRuntime = { ...runtime, installed: false, version: null, source: 'uninstalled',
  companionFilesPresent: false, missingCompanionFiles: ['localharness_external.exe'] };
const home = { geminiHome: '/managed/home', disabledDeadMcpServers: [] };
const subject = { authMethod: 'oauth-personal' as const, configuredAuthType: 'oauth-personal' };

function readiness(state: NativeReadinessResult['state'], fields: Partial<NativeReadinessResult> = {}): NativeReadinessResult {
  return readinessResult(state, subject, { agentVersion: '1.4.3', ...fields });
}

describe('provider config', () => {
  it('normalizes settings once for every entry point', () => {
    expect(readProviderSettings({ authMethod: 'nope', nativeExecutable: '  /opt/agy  ' }))
      .toEqual({ authMethod: 'oauth-personal', customExecutable: '/opt/agy' });
    expect(readProviderSettings({ authMethod: 'agent-platform', nativeExecutable: '   ' }))
      .toEqual({ authMethod: 'agent-platform', customExecutable: undefined });
    expect(readProviderSettings(undefined).authMethod).toBe('oauth-personal');
  });

  it('builds a launch spec against the managed home and passes an API key only for gemini-api-key', () => {
    const env = { ...process.env, GEMINI_API_KEY: 'secret' };
    const apiKey = buildNativeLaunchSpec({ authMethod: 'gemini-api-key', env, home });
    expect(apiKey.env).toEqual({ BROWSER: 'echo', GEMINI_HOME: '/managed/home', AGY_ACP_AUTH_METHOD: 'gemini-api-key', GEMINI_API_KEY: 'secret' });
    expect(apiKey.nativeReasoning).toEqual({ configId: 'thinking_level', supportedLevels: ['low', 'medium', 'high'], defaultLevel: 'medium' });
    expect(buildNativeLaunchSpec({ authMethod: 'oauth-personal', env, home }).env.GEMINI_API_KEY).toBeUndefined();
  });

  it('completes a caller launch spec in place and reports whether anything was missing', () => {
    const spec: Record<string, any> = { command: 'custom.exe', env: { CUSTOM_VAR: 'value', GEMINI_HOME: '' } };
    expect(completeLaunchSpec(spec, 'oauth-personal', home)).toBe(true);
    expect(spec.env).toEqual({ CUSTOM_VAR: 'value', BROWSER: 'echo', GEMINI_HOME: '/managed/home', AGY_ACP_AUTH_METHOD: 'oauth-personal' });
    expect(spec.nativeReasoning.configId).toBe('thinking_level');
    expect(completeLaunchSpec(spec, 'oauth-personal', home)).toBe(false);
    const custom = { env: { ...spec.env }, nativeReasoning: { configId: 'custom' } };
    expect(completeLaunchSpec(custom, 'oauth-personal', home)).toBe(false);
    expect(custom.nativeReasoning.configId).toBe('custom');
  });

  it('maps runtime and readiness to thread health', () => {
    expect(healthFromReadiness(missingRuntime)).toMatchObject({ status: 'not_installed',
      statusMessage: 'Missing companion file(s): localharness_external.exe' });
    expect(healthFromReadiness({ ...missingRuntime, missingCompanionFiles: [] }).statusMessage).toContain('is not installed');
    expect(healthFromReadiness(runtime, readiness('runtime_missing', { error: 'gone' }))).toMatchObject({ status: 'not_installed', statusMessage: 'gone' });
    expect(healthFromReadiness(runtime, readiness('session_ready', { tierName: 'Google AI Pro' })))
      .toEqual({ status: 'ready', statusMessage: null, planLabel: 'Google AI Pro', installedVersion: '1.4.3' });
    expect(healthFromReadiness(runtime, readiness('sign_in_required'))).toMatchObject({ status: 'unauthenticated',
      statusMessage: expect.stringContaining('Sign in required') });
    expect(healthFromReadiness(runtime, readiness('authenticated', { agentVersion: null }))).toMatchObject({ status: 'unknown',
      statusMessage: expect.stringContaining('not verified'), installedVersion: '1.4.3' });
    expect(healthFromReadiness(runtime, readiness('runtime_launches')).statusMessage).toContain('runtime launched');
    expect(healthFromReadiness(runtime, readiness('runtime_launches', { error: 'Handshake incomplete' })).statusMessage).toBe('Handshake incomplete');
  });

  it('maps a catalog to model/list, labelling stale models and reasoning efforts', () => {
    const outcome = modelListFromReadiness(readiness('authenticated', { catalogStale: true, error: 'Backend unavailable', models: [
      { id: 'gemini-custom', name: 'Gemini Custom', description: 'desc', supportedReasoningEfforts: ['low', 'medium', 'high'], defaultReasoningEffort: 'medium' },
      { id: 'plain', name: 'Plain', supportedReasoningEfforts: ['low'], defaultReasoningEffort: 'max' },
      { id: 'bare', name: 'Bare' }
    ] }));
    if (!('result' in outcome)) throw new Error('expected models');
    const { models, _meta } = outcome.result as any;
    expect(models[0]).toMatchObject({ id: 'gemini-custom', model: 'gemini-custom', displayName: 'Gemini Custom (cached)',
      description: 'desc', defaultReasoningEffort: 'medium', isDefault: true });
    expect(models[0].supportedReasoningEfforts).toEqual([
      { reasoningEffort: 'low', description: 'Low reasoning effort' },
      { reasoningEffort: 'medium', description: 'Medium reasoning effort' },
      { reasoningEffort: 'high', description: 'High reasoning effort' }
    ]);
    expect(models[1].defaultReasoningEffort).toBe('low');
    expect(models[2]).toMatchObject({ supportedReasoningEfforts: [], description: 'Google Antigravity Native ACP model (bare)', isDefault: false });
    expect(models[2].defaultReasoningEffort).toBeUndefined();
    expect(_meta).toMatchObject({ stale: true, warning: 'Backend unavailable' });
  });

  it('maps an unusable catalog to a model/list error with recovery guidance', () => {
    expect(modelListFromReadiness(readiness('sign_in_required', { error: 'Expired token' }))).toEqual({ error: { code: -32000,
      message: 'Expired token', data: { recovery: { kind: 'authRequired', message: 'Expired token', retryable: false } } } });
    expect(modelListFromReadiness(readiness('session_ready'))).toMatchObject({ error: { message: expect.stringContaining('No models discovered') } });
  });

  it('maps runtime and readiness to the Settings doctor status', () => {
    const uninstalled = doctorStatus(missingRuntime, { authMethod: 'oauth-personal', pendingAuthUrl: null, disabledDeadMcpServers: ['dead'] });
    expect(uninstalled).toMatchObject({ installed: false, ready: false, state: 'runtime_missing', disabledDeadMcpServers: ['dead'],
      error: expect.stringContaining('missing companion file(s) localharness_external.exe') });
    expect(uninstalled.credentialId).toBeUndefined();

    const ready = doctorStatus(runtime, { authMethod: 'oauth-personal', pendingAuthUrl: 'https://accounts.google.com/x',
      credentialId: 'abc', readiness: readiness('session_ready', { models: [{ id: 'gemini', name: 'Gemini' }], tierName: 'Pro' }) });
    expect(ready).toMatchObject({ installed: true, authenticated: true, ready: true, version: '1.4.3', tierName: 'Pro',
      pendingAuthUrl: 'https://accounts.google.com/x', credentialId: 'abc', catalogStale: false });
    expect(doctorStatus(runtime, { authMethod: 'oauth-personal', pendingAuthUrl: null,
      readiness: readiness('sign_in_required', { error: 'Sign in' }) })).toMatchObject({ authenticated: false, error: 'Sign in' });
  });
});
