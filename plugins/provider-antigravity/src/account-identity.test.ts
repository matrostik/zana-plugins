import './test-environment.js';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { captureAccount, currentCredentialId, invalidateAccounts, type NativeTarget } from './account-identity.js';
import { isAuthExplicitlyCleared, readConfiguredNativeAuthType, writeAuthTypeSettings } from './gemini-home.js';

const tempDirs: string[] = [];
function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

function oauthTarget(): { target: NativeTarget; sourceToken: string } {
  const home = makeTempDir('identity-oauth-');
  const env = { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: makeTempDir('identity-data-') };
  mkdirSync(join(home, 'antigravity-acp'), { recursive: true });
  const sourceToken = join(home, 'antigravity-acp', 'acp_token.json');
  writeFileSync(sourceToken, '{"refresh_token":"account-one","access_token":"a"}');
  writeAuthTypeSettings('oauth-personal', env);
  return { target: { command: 'agy', args: [], authMethod: 'oauth-personal', env }, sourceToken };
}

function headlessTarget(authMethod: 'gemini-api-key' | 'agent-platform'): NativeTarget {
  const home = makeTempDir('identity-headless-');
  return { command: 'agy', args: [], authMethod,
    env: { ...process.env, GEMINI_HOME: home, ZCC_DATA_DIR: home, GEMINI_API_KEY: 'account-one', GOOGLE_CLOUD_PROJECT: 'project-one' } };
}

describe('account identity', () => {
  it('stays current across an access-token refresh but not an account switch', () => {
    const { target } = oauthTarget();
    const account = captureAccount(target);
    const managedToken = join(account.home.geminiHome, 'antigravity-acp', 'acp_token.json');
    writeFileSync(managedToken, '{"refresh_token":"account-one","access_token":"refreshed"}');
    expect(account.isCurrent()).toBe(true);
    writeFileSync(managedToken, '{"refresh_token":"account-two"}');
    expect(account.isCurrent()).toBe(false);
  });

  it('notices a sign-out or switch in the source home', () => {
    const { target, sourceToken } = oauthTarget();
    const switched = captureAccount(target);
    writeFileSync(sourceToken, '{"refresh_token":"account-two"}');
    expect(switched.isCurrent()).toBe(false);

    const signedOut = captureAccount(target);
    writeAuthTypeSettings(null, target.env);
    expect(signedOut.isCurrent()).toBe(false);
  });

  it('distinguishes equal-length API keys and cloud credentials rewritten at the same path', () => {
    const target = headlessTarget('gemini-api-key');
    const key = captureAccount(target);
    target.env!.GEMINI_API_KEY = 'account-two';
    expect(key.isCurrent()).toBe(false);

    const credentials = join(makeTempDir('identity-gac-'), 'credentials.json');
    writeFileSync(credentials, '{"account":"one"}');
    const cloud = captureAccount({ ...headlessTarget('agent-platform'), env: { ...target.env, GOOGLE_APPLICATION_CREDENTIALS: credentials } });
    writeFileSync(credentials, '{"account":"two"}');
    expect(cloud.isCurrent()).toBe(false);
  });

  it('stops every snapshot on explicit invalidation', () => {
    const account = captureAccount(oauthTarget().target);
    invalidateAccounts();
    expect(account.isCurrent()).toBe(false);
    expect(captureAccount(account.target).isCurrent()).toBe(true);
  });

  it('keys and credential ids follow the account without exposing secrets', () => {
    const target = headlessTarget('gemini-api-key');
    const one = captureAccount(target);
    const two = captureAccount({ ...target, env: { ...target.env, GEMINI_API_KEY: 'account-two' } });
    expect(one.refreshKey).not.toBe(two.refreshKey);
    expect(one.credentialId).not.toBe(two.credentialId);
    expect(one.credentialId).toBe(currentCredentialId(target.authMethod, target.env));
    expect(one.refreshKey + one.fingerprint).not.toContain('account-one');
  });

  it('adopts its own headless auth-type write, also for concurrent snapshots of the same account', () => {
    const target = headlessTarget('gemini-api-key');
    const first = captureAccount(target);
    const second = captureAccount(target);
    const before = first.readinessKey;
    first.commitHeadlessAuthType();
    expect(readConfiguredNativeAuthType(first.effectiveEnv)).toBe('gemini-api-key');
    expect(first.isCurrent()).toBe(true);
    expect(first.readinessKey).not.toBe(before);
    expect(second.isCurrent()).toBe(true);
    expect(second.refreshKey).toBe(first.refreshKey);
    expect(captureAccount(target).refreshKey).toBe(first.refreshKey);
  });

  it('refuses to commit a headless auth type after a sign-out or account switch', () => {
    const target = headlessTarget('agent-platform');
    const signedOut = captureAccount(target);
    writeAuthTypeSettings(null, target.env);
    expect(() => signedOut.commitHeadlessAuthType()).toThrow('sign-in changed');
    expect(isAuthExplicitlyCleared(target.env)).toBe(true);

    const committed = captureAccount(target);
    const stale = captureAccount(target);
    committed.commitHeadlessAuthType();
    target.env!.GOOGLE_CLOUD_PROJECT = 'project-two';
    expect(stale.isCurrent()).toBe(false);
  });
});
