import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import createAiUsageMonitorPlugin from '../../server.ts';
import {
  expireStaleQuotaWindows,
  probeClaudeLocalUsage,
  probeCodexLocalUsage
} from '../server/collectors/local-provider-usage.ts';
import { RPC_METHODS, type DashboardPayload } from '../shared/types.ts';
import { createFakeHost } from './fake-host.ts';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

const tempDirs: string[] = [];

async function makeTempHome(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aum-local-usage-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

describe('local provider live usage probes & stale quota expiration', () => {
  it('probes Codex wham/usage with ChatGPT OAuth credentials and handles 401/expired/apikey cleanly', async () => {
    const homeDir = await makeTempHome();
    const fixedNow = Date.UTC(2026, 10, 13, 6, 30, 0);
    const codexDir = path.join(homeDir, '.codex');
    await fs.mkdir(codexDir, { recursive: true });

    const jwt = makeJwt({
      exp: Math.floor((fixedNow + 3_600_000) / 1000),
      email: 'codex-user@example.com',
      'https://api.openai.com/auth': { chatgpt_account_id: 'acct_123' }
    });
    await fs.writeFile(
      path.join(codexDir, 'auth.json'),
      JSON.stringify({
        auth_mode: 'chatgpt',
        tokens: { access_token: jwt, account_id: 'acct_123' }
      }),
      'utf8'
    );

    let capturedHeaders: Record<string, string> = {};
    const okRes = await probeCodexLocalUsage({
      homeDir,
      env: {},
      now: () => fixedNow,
      fetch: async (_url, init) => {
        const headers = new Headers(init?.headers);
        capturedHeaders = Object.fromEntries(headers.entries());
        return new Response(
          JSON.stringify({
            plan_type: 'plus',
            rate_limit: {
              primary_window: { used_percent: 0, limit_window_seconds: 18000, reset_at: Math.floor((fixedNow + 18_000_000) / 1000) },
              secondary_window: { used_percent: 21, limit_window_seconds: 604800, reset_at: Math.floor((fixedNow + 432_000_000) / 1000) }
            }
          }),
          { status: 200 }
        );
      }
    });

    expect(capturedHeaders['chatgpt-account-id']).toBe('acct_123');
    expect(capturedHeaders.originator).toBe('zcc');
    expect(okRes).toMatchObject({
      status: 'ok',
      source: 'codex-wham-usage',
      accountEmail: 'codex-user@example.com',
      planLabel: 'Plus',
      windows: [
        { label: 'Current session', usedPercent: 0 },
        { label: 'Weekly limit', usedPercent: 21 }
      ]
    });

    // HTTP 401 -> expired
    const unauthorizedRes = await probeCodexLocalUsage({
      homeDir,
      env: {},
      now: () => fixedNow,
      fetch: async () => new Response('unauthorized', { status: 401 })
    });
    expect(unauthorizedRes).toMatchObject({ status: 'expired', accountEmail: 'codex-user@example.com' });

    // Expired JWT timestamp -> expired without network call
    const expiredJwt = makeJwt({
      exp: Math.floor((fixedNow - 60_000) / 1000),
      'https://api.openai.com/auth': { chatgpt_account_id: 'acct_123' }
    });
    await fs.writeFile(
      path.join(codexDir, 'auth.json'),
      JSON.stringify({ tokens: { access_token: expiredJwt, account_id: 'acct_123' } }),
      'utf8'
    );
    const expiredRes = await probeCodexLocalUsage({
      homeDir,
      env: {},
      now: () => fixedNow,
      fetch: async () => {
        throw new Error('Should not call fetch for locally expired JWT');
      }
    });
    expect(expiredRes).toMatchObject({ status: 'expired' });

    // API key mode -> returns null so Codex stays non-blocking
    await fs.writeFile(
      path.join(codexDir, 'auth.json'),
      JSON.stringify({ auth_mode: 'apikey', OPENAI_API_KEY: 'sk-test' }),
      'utf8'
    );
    const apiKeyRes = await probeCodexLocalUsage({
      homeDir,
      env: {},
      now: () => fixedNow,
      fetch: async () => new Response('{}', { status: 200 })
    });
    expect(apiKeyRes).toBeNull();
  });

  it('probes Claude Code OAuth usage including scoped model limits and rate limit tier formatting', async () => {
    const homeDir = await makeTempHome();
    const fixedNow = Date.UTC(2026, 10, 13, 6, 30, 0);
    const claudeDir = path.join(homeDir, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });

    const credsHex = Buffer.from(
      JSON.stringify({
        claudeAiOauth: {
          accessToken: 'claude-tok-1',
          expiresAt: fixedNow + 3_600_000,
          subscriptionType: 'max',
          rateLimitTier: 'default_claude_max_5x'
        }
      }),
      'utf8'
    ).toString('hex');
    await fs.writeFile(path.join(claudeDir, '.credentials.json'), credsHex, 'utf8');
    await fs.writeFile(
      path.join(homeDir, '.claude.json'),
      JSON.stringify({ oauthAccount: { emailAddress: 'claude@example.com' } }),
      'utf8'
    );

    const res = await probeClaudeLocalUsage({
      homeDir,
      now: () => fixedNow,
      fetch: async () =>
        new Response(
          JSON.stringify({
            five_hour: { utilization: 24.5, resets_at: new Date(fixedNow + 7_200_000).toISOString() },
            seven_day: { utilization: 60, resets_at: new Date(fixedNow + 300_000_000).toISOString() },
            limits: [
              {
                kind: 'weekly_scoped',
                scope: { model: { display_name: 'Sonnet 4.5' } },
                percent: 12,
                resets_at: new Date(fixedNow + 300_000_000).toISOString()
              }
            ]
          }),
          { status: 200 }
        )
    });

    expect(res).toMatchObject({
      status: 'ok',
      source: 'claude-oauth-usage',
      accountEmail: 'claude@example.com',
      planLabel: 'Max (5x)',
      windows: [
        { label: 'Current session', usedPercent: 24.5 },
        { label: 'Weekly limit', usedPercent: 60 },
        { label: 'Sonnet 4.5', usedPercent: 12 }
      ]
    });

    const throttled = await probeClaudeLocalUsage({
      homeDir,
      now: () => fixedNow,
      fetch: async () => new Response('slow down', { status: 429 })
    });
    expect(throttled).toMatchObject({ status: 'error' });
    expect(String(throttled?.message)).toContain('429');
  });

  it('expires stale blocked thread-events windows and prefers live Codex wham/usage over old thread events', async () => {
    const fixedNow = Date.UTC(2026, 10, 13, 6, 30, 0);
    const homeDir = await makeTempHome();
    const codexDir = path.join(homeDir, '.codex');
    await fs.mkdir(codexDir, { recursive: true });
    await fs.writeFile(
      path.join(codexDir, 'auth.json'),
      JSON.stringify({
        auth_mode: 'chatgpt',
        tokens: {
          access_token: makeJwt({ exp: Math.floor((fixedNow + 3_600_000) / 1000) }),
          account_id: 'acct_live'
        }
      }),
      'utf8'
    );

    const host = createFakeHost({
      providers: [
        { id: 'codex', available: true, displayName: 'Codex', models: ['gpt-5-codex'] },
        { id: 'cursor', available: true, displayName: 'Cursor', models: ['cursor-fast'] }
      ],
      threads: [
        {
          id: 'th-codex-old',
          projectId: 'p1',
          hostId: 'h1',
          environmentId: null,
          providerId: 'codex',
          status: 'idle',
          updatedAt: fixedNow - 21_600_000,
          events: [
            {
              seq: 1,
              type: 'provider/rateLimits/updated',
              payload: {
                createdAt: fixedNow - 21_600_000,
                rateLimits: {
                  providerId: 'codex',
                  status: 'blocked',
                  kind: 'subscription-window',
                  reachedReason: '5h window exhausted hours ago',
                  windows: [
                    { providerKey: 'primary', label: 'Current session', status: 'blocked', resetsAtMs: fixedNow - 18_000_000 },
                    { providerKey: 'secondary', label: 'Weekly limit', status: 'allowed', resetsAtMs: fixedNow + 432_000_000 }
                  ]
                }
              }
            }
          ]
        },
        {
          id: 'th-cursor-stale',
          projectId: 'p1',
          hostId: 'h1',
          environmentId: null,
          providerId: 'cursor',
          status: 'idle',
          updatedAt: fixedNow - 10_000_000,
          events: [
            {
              seq: 1,
              type: 'provider/rateLimits/updated',
              payload: {
                createdAt: fixedNow - 10_000_000,
                rateLimits: {
                  providerId: 'cursor',
                  status: 'blocked',
                  kind: 'subscription-window',
                  reachedReason: 'Expired 5h window',
                  windows: [
                    { providerKey: '5h', label: 'Current session', status: 'blocked', resetsAtMs: fixedNow - 3_600_000 },
                    { providerKey: '7d', label: 'Weekly limit', status: 'allowed', resetsAtMs: fixedNow + 432_000_000 }
                  ]
                }
              }
            }
          ]
        }
      ]
    });

    await createAiUsageMonitorPlugin(host.zcc, {
      homeDir,
      env: {},
      now: () => fixedNow,
      skipInitialSync: true,
      fetch: async (input) => {
        if (String(input).includes('wham/usage')) {
          return new Response(
            JSON.stringify({
              plan_type: 'plus',
              rate_limit: {
                primary_window: { used_percent: 0, limit_window_seconds: 18000, reset_at: Math.floor((fixedNow + 18_000_000) / 1000) },
                secondary_window: { used_percent: 21, limit_window_seconds: 604800, reset_at: Math.floor((fixedNow + 432_000_000) / 1000) }
              }
            }),
            { status: 200 }
          );
        }
        return new Response('not found', { status: 404 });
      }
    });

    await host.callRpc(RPC_METHODS.refreshNow);
    const dash = await host.callRpc<DashboardPayload>(RPC_METHODS.dashboard, { range: '30d' });

    const codex = dash.providers.find((p) => p.providerId === 'codex');
    expect(codex?.source).toBe('codex-wham-usage');
    expect(codex?.status).toBe('ok');
    expect(codex?.planLabel).toBe('Plus');
    expect(codex?.windows[0]).toMatchObject({ label: 'Current session', usedPercent: 0, remainingPercent: 100, status: 'allowed' });
    expect(codex?.windows[1]).toMatchObject({ label: 'Weekly limit', usedPercent: 21, remainingPercent: 79, status: 'allowed' });

    // Cursor had no live probe, so its expired blocked 5h thread-event window must clear instead of saying 100% used!
    const cursor = dash.providers.find((p) => p.providerId === 'cursor');
    expect(cursor?.status).toBe('ok');
    expect(cursor?.errorMessage).toBeNull();
    expect(cursor?.windows[0]).toMatchObject({ label: 'Current session', usedPercent: null, status: 'allowed', resetsAtIso: null });

    await host.dispose();
  });

  it('expireStaleQuotaWindows resets expired windows and keeps active warning/blocked windows intact', () => {
    const nowMs = Date.UTC(2026, 10, 13, 6, 30, 0);
    const result = expireStaleQuotaWindows(
      [
        { key: '5h', label: 'Current session', usedPercent: 100, remainingPercent: 0, status: 'blocked', resetsAtIso: new Date(nowMs - 1000).toISOString() },
        { key: '7d', label: 'Weekly limit', usedPercent: 80, remainingPercent: 20, status: 'warning', resetsAtIso: new Date(nowMs + 86_400_000).toISOString() }
      ],
      'blocked',
      '5h limit hit',
      nowMs
    );
    expect(result.status).toBe('warning');
    expect(result.windows[0]).toMatchObject({ status: 'allowed', usedPercent: null, remainingPercent: null, resetsAtIso: null });
    expect(result.windows[1]).toMatchObject({ status: 'warning', usedPercent: 80 });
  });
});
