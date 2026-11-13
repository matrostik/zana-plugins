import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ProviderQuotaStatus, QuotaWindow, QuotaWindowStatus } from '../../shared/types.ts';
import { asOptionalNumber, asOptionalString, asRecord, errorMessage } from '../util.ts';
import type { FetchLike, HostUsageProbeResult } from './zcc-quotas.ts';

const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';
const CLAUDE_USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const CHATGPT_AUTH_CLAIM = 'https://api.openai.com/auth';
const CHATGPT_PROFILE_CLAIM = 'https://api.openai.com/profile';
const LOCAL_USAGE_TIMEOUT_MS = 5000;

const CODEX_PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  go: 'Go',
  plus: 'Plus',
  pro: 'Pro',
  team: 'Team',
  business: 'Business',
  education: 'Education',
  edu: 'Education',
  enterprise: 'Enterprise'
};

export interface LocalProbeContext {
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
  fetch: FetchLike;
  now: () => number;
  providerIds?: readonly string[];
  onDebug?: (message: string) => void;
}

export interface ExpiredQuotaResult {
  status: ProviderQuotaStatus;
  windows: QuotaWindow[];
  errorMessage: string | null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const raw = Buffer.from(parts[1], 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function extractCodexEmail(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const profile = asRecord(payload[CHATGPT_PROFILE_CLAIM]);
  return asOptionalString(payload, 'email') ?? asOptionalString(profile, 'email');
}

function parseCodexAuth(raw: string, nowMs: number): {
  mode: 'chatgpt' | 'apikey' | 'unusable';
  accessToken?: string;
  accountId?: string;
  accountEmail?: string | null;
  expired?: boolean;
  isFedramp?: boolean;
} {
  let root: Record<string, unknown>;
  try {
    root = asRecord(JSON.parse(raw));
  } catch {
    return { mode: 'unusable' };
  }

  const authMode = asOptionalString(root, 'auth_mode');
  const apiKey = asOptionalString(root, 'OPENAI_API_KEY');
  if (authMode === 'apikey' || authMode === 'apiKey' || (!authMode && apiKey)) {
    return apiKey ? { mode: 'apikey' } : { mode: 'unusable' };
  }

  const tokens = asRecord(root.tokens);
  const accessToken = asOptionalString(tokens, 'access_token');
  if (!accessToken) return { mode: 'unusable' };

  const accessPayload = decodeJwtPayload(accessToken);
  const claims = asRecord(accessPayload?.[CHATGPT_AUTH_CLAIM]);
  const idToken = asOptionalString(tokens, 'id_token');
  const idPayload = idToken ? decodeJwtPayload(idToken) : null;
  const idClaims = asRecord(idPayload?.[CHATGPT_AUTH_CLAIM]);

  const accountId =
    asOptionalString(tokens, 'account_id') ??
    asOptionalString(claims, 'chatgpt_account_id') ??
    asOptionalString(idClaims, 'chatgpt_account_id');
  if (!accountId) return { mode: 'unusable' };

  const exp = accessPayload ? asOptionalNumber(accessPayload, 'exp') : null;
  return {
    mode: 'chatgpt',
    accessToken,
    accountId,
    accountEmail: extractCodexEmail(accessPayload) ?? extractCodexEmail(idPayload),
    expired: exp !== null && nowMs >= exp * 1000,
    isFedramp:
      claims.chatgpt_account_is_fedramp === true || idClaims.chatgpt_account_is_fedramp === true
  };
}

function formatCodexPlanLabel(plan: string | null): string | null {
  if (!plan) return null;
  const lower = plan.toLowerCase();
  return CODEX_PLAN_LABELS[lower] ?? plan.charAt(0).toUpperCase() + plan.slice(1);
}

function normalizeCodexWindow(raw: unknown, fallbackLabel: string): Record<string, unknown> | null {
  const win = asRecord(raw);
  const usedPercent = asOptionalNumber(win, 'used_percent');
  if (usedPercent === null) return null;
  const limitSeconds = asOptionalNumber(win, 'limit_window_seconds');
  const resetAt = asOptionalNumber(win, 'reset_at');
  return {
    label: limitSeconds === 604800 ? 'Weekly limit' : fallbackLabel,
    usedPercent: clampPercent(usedPercent),
    resetsAt: resetAt !== null ? new Date(resetAt * 1000).toISOString() : null
  };
}

export async function probeCodexLocalUsage(ctx: LocalProbeContext): Promise<Record<string, unknown> | null> {
  const homeDir = ctx.homeDir ?? os.homedir();
  const env = ctx.env ?? process.env;
  const codexHome = env.CODEX_HOME?.trim() || path.join(homeDir, '.codex');
  const authPath = path.join(codexHome, 'auth.json');

  let raw: string;
  try {
    raw = await fs.readFile(authPath, 'utf8');
  } catch {
    return null;
  }

  const parsedAuth = parseCodexAuth(raw, ctx.now());
  if (parsedAuth.mode !== 'chatgpt' || !parsedAuth.accessToken || !parsedAuth.accountId) {
    return null;
  }
  if (parsedAuth.expired) {
    return {
      status: 'expired',
      source: 'codex-wham-usage',
      accountEmail: parsedAuth.accountEmail ?? null,
      planLabel: null
    };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${parsedAuth.accessToken}`,
      'chatgpt-account-id': parsedAuth.accountId,
      originator: 'zcc',
      'User-Agent': 'zcc-provider-codex',
      Accept: 'application/json'
    };
    if (parsedAuth.isFedramp) headers['X-OpenAI-Fedramp'] = 'true';

    const res = await ctx.fetch(CODEX_USAGE_URL, {
      headers,
      signal: AbortSignal.timeout(LOCAL_USAGE_TIMEOUT_MS)
    });
    if (res.status === 401) {
      return { status: 'expired', source: 'codex-wham-usage', accountEmail: parsedAuth.accountEmail ?? null };
    }
    if (!res.ok) {
      return {
        status: 'error',
        source: 'codex-wham-usage',
        accountEmail: parsedAuth.accountEmail ?? null,
        message: `Codex usage request failed (HTTP ${res.status}).`
      };
    }

    const body = asRecord(await res.json());
    const rateLimit = asRecord(body.rate_limit);
    const windows = [
      normalizeCodexWindow(rateLimit.primary_window, 'Current session'),
      normalizeCodexWindow(rateLimit.secondary_window, 'Weekly limit')
    ].filter((item): item is Record<string, unknown> => item !== null);

    return {
      status: 'ok',
      source: 'codex-wham-usage',
      accountEmail: parsedAuth.accountEmail ?? null,
      planLabel: formatCodexPlanLabel(asOptionalString(body, 'plan_type')),
      windows
    };
  } catch (err) {
    ctx.onDebug?.(`codex local usage probe failed: ${errorMessage(err)}`);
    return {
      status: 'error',
      source: 'codex-wham-usage',
      accountEmail: parsedAuth.accountEmail ?? null,
      message: errorMessage(err)
    };
  }
}

function parseClaudeCredentials(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const candidates = [trimmed];
  if (/^(?:[0-9a-f]{2})+$/iu.test(trimmed)) {
    candidates.push(Buffer.from(trimmed, 'hex').toString('utf8'));
  }
  for (const candidate of candidates) {
    try {
      const root = asRecord(JSON.parse(candidate));
      const oauth = asRecord(root.claudeAiOauth);
      if (asOptionalString(oauth, 'accessToken')) return oauth;
    } catch {
      // Ignore malformed candidate
    }
  }
  return null;
}

function formatClaudePlanLabel(creds: Record<string, unknown>): string | null {
  const tier = asOptionalString(creds, 'rateLimitTier') ?? '';
  const maxMatch = tier.match(/max_(\d+)x/u);
  if (maxMatch) return `Max (${maxMatch[1]}x)`;
  const sub = asOptionalString(creds, 'subscriptionType');
  return sub ? sub.charAt(0).toUpperCase() + sub.slice(1) : null;
}

function normalizeClaudeWindow(raw: unknown, label: string): Record<string, unknown> | null {
  const rec = asRecord(raw);
  const util = asOptionalNumber(rec, 'utilization');
  if (util === null) return null;
  const resetStr = asOptionalString(rec, 'resets_at');
  const resetMs = resetStr ? Date.parse(resetStr) : Number.NaN;
  return {
    label,
    usedPercent: clampPercent(util),
    resetsAt: Number.isFinite(resetMs) ? new Date(resetMs).toISOString() : null
  };
}

function collectClaudeScopedWindows(rawLimits: unknown): Record<string, unknown>[] {
  if (!Array.isArray(rawLimits)) return [];
  const out: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const entry of rawLimits) {
    const rec = asRecord(entry);
    if (asOptionalString(rec, 'kind') !== 'weekly_scoped') continue;
    const scope = asRecord(rec.scope);
    const model = asRecord(scope.model);
    const label = asOptionalString(model, 'display_name');
    const percent = asOptionalNumber(rec, 'percent');
    if (!label || percent === null || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    const resetStr = asOptionalString(rec, 'resets_at');
    const resetMs = resetStr ? Date.parse(resetStr) : Number.NaN;
    out.push({
      label,
      usedPercent: clampPercent(percent),
      resetsAt: Number.isFinite(resetMs) ? new Date(resetMs).toISOString() : null
    });
  }
  return out;
}

async function readClaudeEmail(homeDir: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(homeDir, '.claude.json'), 'utf8');
    const oauthAccount = asRecord(asRecord(JSON.parse(raw)).oauthAccount);
    return asOptionalString(oauthAccount, 'emailAddress');
  } catch {
    return null;
  }
}

export async function probeClaudeLocalUsage(ctx: LocalProbeContext): Promise<Record<string, unknown> | null> {
  const homeDir = ctx.homeDir ?? os.homedir();
  let rawCreds: string;
  try {
    rawCreds = await fs.readFile(path.join(homeDir, '.claude', '.credentials.json'), 'utf8');
  } catch {
    return null;
  }

  const creds = parseClaudeCredentials(rawCreds);
  const accessToken = creds ? asOptionalString(creds, 'accessToken') : null;
  if (!creds || !accessToken) return null;

  const accountEmail = await readClaudeEmail(homeDir);
  const planLabel = formatClaudePlanLabel(creds);
  const expiresAt = asOptionalNumber(creds, 'expiresAt');
  if (expiresAt !== null && ctx.now() >= expiresAt) {
    return { status: 'expired', source: 'claude-oauth-usage', accountEmail, planLabel };
  }

  try {
    const res = await ctx.fetch(CLAUDE_USAGE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'claude-code/2.1.0'
      },
      signal: AbortSignal.timeout(LOCAL_USAGE_TIMEOUT_MS)
    });
    if (res.status === 401) {
      return { status: 'expired', source: 'claude-oauth-usage', accountEmail, planLabel };
    }
    if (!res.ok) {
      return {
        status: 'error',
        source: 'claude-oauth-usage',
        accountEmail,
        planLabel,
        message:
          res.status === 429
            ? 'Anthropic temporarily throttled this usage check (HTTP 429).'
            : `Claude usage request failed (HTTP ${res.status}).`
      };
    }

    const body = asRecord(await res.json());
    const windows = [
      normalizeClaudeWindow(body.five_hour, 'Current session'),
      normalizeClaudeWindow(body.seven_day, 'Weekly limit'),
      ...collectClaudeScopedWindows(body.limits)
    ].filter((w): w is Record<string, unknown> => w !== null);

    return {
      status: 'ok',
      source: 'claude-oauth-usage',
      accountEmail,
      planLabel,
      windows
    };
  } catch (err) {
    ctx.onDebug?.(`claude local usage probe failed: ${errorMessage(err)}`);
    return {
      status: 'error',
      source: 'claude-oauth-usage',
      accountEmail,
      planLabel,
      message: errorMessage(err)
    };
  }
}

export async function probeLocalProviderUsage(ctx: LocalProbeContext): Promise<HostUsageProbeResult> {
  const ids = new Set((ctx.providerIds ?? []).map((id) => id.toLowerCase()));
  const checkCodex = ids.size === 0 || ids.has('codex') || ids.has('openai-codex');
  const checkClaude = ids.size === 0 || ids.has('claude-code') || ids.has('claude');

  const [codex, claudeCode] = await Promise.all([
    checkCodex ? probeCodexLocalUsage(ctx) : Promise.resolve(null),
    checkClaude ? probeClaudeLocalUsage(ctx) : Promise.resolve(null)
  ]);

  const result: HostUsageProbeResult = {};
  if (codex) result.codex = codex;
  if (claudeCode) result.claudeCode = claudeCode;
  return result;
}

export function expireStaleQuotaWindows(
  windows: readonly QuotaWindow[],
  currentStatus: ProviderQuotaStatus,
  errorMessage: string | null,
  nowMs: number
): ExpiredQuotaResult {
  if (windows.length === 0) {
    return { status: currentStatus, windows: [], errorMessage };
  }

  let expiredAny = false;
  const nextWindows: QuotaWindow[] = windows.map((win) => {
    if (!win.resetsAtIso) return win;
    const resetMs = Date.parse(win.resetsAtIso);
    if (!Number.isFinite(resetMs) || resetMs > nowMs) return win;

    expiredAny = true;
    const clearedStatus: QuotaWindowStatus = 'allowed';
    return {
      ...win,
      status: clearedStatus,
      usedPercent: null,
      remainingPercent: null,
      resetsAtIso: null
    };
  });

  if (!expiredAny) {
    return { status: currentStatus, windows: [...windows], errorMessage };
  }

  const hasBlocked = nextWindows.some((w) => w.status === 'blocked');
  const hasWarning = nextWindows.some((w) => w.status === 'warning');
  const nextStatus: ProviderQuotaStatus = hasBlocked ? 'blocked' : hasWarning ? 'warning' : 'ok';
  const nextError = nextStatus === 'blocked' || nextStatus === 'warning' ? errorMessage : null;
  return { status: nextStatus, windows: nextWindows, errorMessage: nextError };
}
