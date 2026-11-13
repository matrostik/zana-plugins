import { execFile } from 'node:child_process';
import type {
  CloudConnectorQualificationState,
  OpenCodeLocalPeriodStats,
  OpenCodeLocalRangeKey,
  OpenCodeLocalStatsSnapshot,
  OpenCodeModelStat,
  ProviderQuotaStatus,
  QuotaWindow,
  QuotaWindowStatus
} from '../../shared/types.ts';
import { asNumber, asOptionalNumber, asOptionalString, asRecord, errorMessage } from '../util.ts';
import type { FetchLike } from './zcc-quotas.ts';

export type CommandRunner = (
  file: string,
  args: readonly string[],
  opts: { timeoutMs: number }
) => Promise<{ stdout: string; stderr: string }>;

export interface OpenCodeLocalCollectorOpts {
  enabled?: boolean;
  runCommand?: CommandRunner;
  previousSnapshot?: OpenCodeLocalStatsSnapshot | null;
  allTimeMinIntervalMs?: number;
  now?: () => number;
  onWarn?: (msg: string) => void;
}

export interface OpenCodeCloudProbeOpts {
  apiKey: string;
  workspaceId?: string;
  consoleBaseUrl?: string;
  fetch?: FetchLike;
  now?: () => number;
  onWarn?: (msg: string) => void;
}

export interface OpenCodeCloudResult {
  configured: boolean;
  status: 'ok' | 'unconfigured' | 'error';
  providerStatus: ProviderQuotaStatus;
  source: string;
  planLabel: string | null;
  accountLabel: string | null;
  windows: QuotaWindow[];
  reportedSpendUsd: number | null;
  qualificationState: CloudConnectorQualificationState;
  balanceStatusMessage: string | null;
  workspaceId: string | null;
  errorMessage: string | null;
  goSubscribed: boolean;
}

const DEFAULT_CONSOLE_BASE_URL = 'https://opencode.ai/console';
const VERSION_TIMEOUT_MS = 3000;
const SHORT_STATS_TIMEOUT_MS = 8000;
const ALL_STATS_TIMEOUT_MS = 25_000;
const DEFAULT_ALL_TIME_COOLDOWN_MS = 5 * 60_000;
const CLOUD_TIMEOUT_MS = 8000;

export const defaultCommandRunner: CommandRunner = (file, args, opts) =>
  new Promise((resolve, reject) => {
    execFile(
      file,
      [...args],
      { timeout: opts.timeoutMs, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
      }
    );
  });

function emptyPeriod(range: OpenCodeLocalRangeKey, errorMsg: string | null = null): OpenCodeLocalPeriodStats {
  return {
    range,
    available: false,
    fromMs: null,
    toMs: null,
    sessions: 0,
    subagents: 0,
    prompts: 0,
    steps: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    activeDays: 0,
    streak: 0,
    models: [],
    errorMessage: errorMsg
  };
}

function parseModelStat(raw: unknown): OpenCodeModelStat | null {
  const row = asRecord(raw);
  const modelMeta = asRecord(row.model);
  const modelId = asOptionalString(modelMeta, 'id');
  if (!modelId) return null;
  const tokens = asRecord(row.tokens);
  const cache = asRecord(tokens.cache);
  const inputTokens = asNumber(tokens, 'input', 0);
  const outputTokens = asNumber(tokens, 'output', 0);
  const reasoningTokens = asNumber(tokens, 'reasoning', 0);
  const cacheReadTokens = asNumber(cache, 'read', 0);
  const cacheWriteTokens = asNumber(cache, 'write', 0);
  return {
    modelId,
    providerId: asOptionalString(modelMeta, 'providerID') ?? 'opencode',
    variant: asOptionalString(modelMeta, 'variant'),
    steps: asNumber(row, 'steps', 0),
    inputTokens,
    outputTokens,
    reasoningTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens: inputTokens + outputTokens + reasoningTokens + cacheReadTokens + cacheWriteTokens,
    costUsd: Number(asNumber(row, 'cost', 0).toFixed(4))
  };
}

export function parseOpenCodeStatsJson(raw: string, range: OpenCodeLocalRangeKey): OpenCodeLocalPeriodStats {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return emptyPeriod(range, `Invalid JSON from opencode stats: ${errorMessage(err)}`);
  }

  const root = asRecord(parsed);
  const rangeObj = asRecord(root.range);
  const tokens = asRecord(root.tokens);
  const cache = asRecord(tokens.cache);
  const inputTokens = asNumber(tokens, 'input', 0);
  const outputTokens = asNumber(tokens, 'output', 0);
  const reasoningTokens = asNumber(tokens, 'reasoning', 0);
  const cacheReadTokens = asNumber(cache, 'read', 0);
  const cacheWriteTokens = asNumber(cache, 'write', 0);
  const rawModels = Array.isArray(root.models) ? root.models : [];
  const models = rawModels.map(parseModelStat).filter((m): m is OpenCodeModelStat => m !== null);

  return {
    range,
    available: true,
    fromMs: asOptionalNumber(rangeObj, 'from'),
    toMs: asOptionalNumber(rangeObj, 'to'),
    sessions: asNumber(root, 'sessions', 0),
    subagents: asNumber(root, 'subagents', 0),
    prompts: asNumber(root, 'prompts', 0),
    steps: asNumber(root, 'steps', 0),
    inputTokens,
    outputTokens,
    reasoningTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens: inputTokens + outputTokens + reasoningTokens + cacheReadTokens + cacheWriteTokens,
    costUsd: Number(asNumber(root, 'cost', 0).toFixed(4)),
    activeDays: asNumber(root, 'activeDays', 0),
    streak: asNumber(root, 'streak', 0),
    models,
    errorMessage: null
  };
}

function isCommandNotFound(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 'ENOENT' || /not recognized|ENOENT/i.test(errorMessage(err));
}

async function fetchStatsPeriod(
  runner: CommandRunner,
  range: OpenCodeLocalRangeKey,
  cliArgs: readonly string[],
  timeoutMs: number,
  onWarn?: (msg: string) => void
): Promise<OpenCodeLocalPeriodStats> {
  try {
    const res = await runner('opencode', cliArgs, { timeoutMs });
    return parseOpenCodeStatsJson(res.stdout, range);
  } catch (err) {
    const msg = errorMessage(err);
    onWarn?.(`ai-usage-monitor: opencode ${cliArgs.join(' ')} failed: ${msg}`);
    return emptyPeriod(range, msg);
  }
}

export async function collectOpenCodeLocalStats(
  opts: OpenCodeLocalCollectorOpts = {}
): Promise<OpenCodeLocalStatsSnapshot> {
  const now = opts.now ?? Date.now;
  const ts = now();
  const baseEmpty = {
    today: emptyPeriod('today'),
    '7d': emptyPeriod('7d'),
    all: emptyPeriod('all')
  };

  if (opts.enabled === false) {
    return {
      installed: false,
      cliVersion: null,
      source: 'opencode-cli-stats',
      collectedAtMs: ts,
      periods: baseEmpty,
      errorMessage: 'Local OpenCode CLI stats import disabled in settings.'
    };
  }

  const runner = opts.runCommand ?? defaultCommandRunner;
  let cliVersion: string | null = null;
  try {
    const ver = await runner('opencode', ['--version'], { timeoutMs: VERSION_TIMEOUT_MS });
    cliVersion = ver.stdout.trim().split(/\r?\n/)[0] || null;
  } catch (err) {
    if (isCommandNotFound(err)) {
      return {
        installed: false,
        cliVersion: null,
        source: 'opencode-cli-stats',
        collectedAtMs: ts,
        periods: baseEmpty,
        errorMessage: null
      };
    }
    return {
      installed: false,
      cliVersion: null,
      source: 'opencode-cli-stats',
      collectedAtMs: ts,
      periods: baseEmpty,
      errorMessage: errorMessage(err)
    };
  }

  const today = await fetchStatsPeriod(runner, 'today', ['stats', '--days', '0', '--json'], SHORT_STATS_TIMEOUT_MS, opts.onWarn);
  const sevenDay = await fetchStatsPeriod(runner, '7d', ['stats', '--days', '7', '--json'], SHORT_STATS_TIMEOUT_MS, opts.onWarn);

  const prevAll = opts.previousSnapshot?.periods?.all;
  const cooldown = opts.allTimeMinIntervalMs ?? DEFAULT_ALL_TIME_COOLDOWN_MS;
  const reuseAll = Boolean(
    prevAll?.available &&
      opts.previousSnapshot &&
      ts - opts.previousSnapshot.collectedAtMs < cooldown
  );
  const all = reuseAll && prevAll
    ? prevAll
    : await fetchStatsPeriod(runner, 'all', ['stats', '--all', '--json'], ALL_STATS_TIMEOUT_MS, opts.onWarn);

  return {
    installed: true,
    cliVersion,
    source: 'opencode-cli-stats',
    collectedAtMs: ts,
    periods: { today, '7d': sevenDay, all },
    errorMessage: null
  };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function normalizeGoMeter(raw: unknown, key: string, label: string): QuotaWindow | null {
  const meter = asRecord(raw);
  const percent = asOptionalNumber(meter, 'percent');
  if (percent === null) return null;
  const usedPercent = clampPercent(percent);
  const remainingPercent = clampPercent(100 - usedPercent);
  const rawStatus = asOptionalString(meter, 'status');
  const status: QuotaWindowStatus =
    rawStatus === 'rate-limited' || usedPercent >= 100
      ? 'blocked'
      : usedPercent >= 75
        ? 'warning'
        : 'allowed';
  const resetStr = asOptionalString(meter, 'resetsAt');
  const resetMs = resetStr ? Date.parse(resetStr) : Number.NaN;
  return {
    key,
    label,
    usedPercent,
    remainingPercent,
    status,
    resetsAtIso: Number.isFinite(resetMs) ? new Date(resetMs).toISOString() : null
  };
}

export function parseOpenCodeGoUsagePayload(payload: unknown): QuotaWindow[] {
  const root = asRecord(payload);
  const usage = asRecord(root.usage);
  return [
    normalizeGoMeter(usage.rolling, 'opencode_go_rolling', 'Go Rolling limit'),
    normalizeGoMeter(usage.weekly, 'opencode_go_weekly', 'Go Weekly limit'),
    normalizeGoMeter(usage.monthly, 'opencode_go_monthly', 'Go Monthly limit')
  ].filter((w): w is QuotaWindow => w !== null);
}

export function sumOpenCodeBudgetsSpend(payload: unknown): {
  count: number;
  maxSpentUsd: number | null;
  pickedLimitUsd: number | null;
} {
  if (!Array.isArray(payload)) return { count: 0, maxSpentUsd: null, pickedLimitUsd: null };
  let count = 0;
  let maxSpentUsd: number | null = null;
  let pickedLimitUsd: number | null = null;
  for (const item of payload) {
    const rec = asRecord(item);
    const spent = asOptionalNumber(rec, 'spentDollars');
    const limit = asOptionalNumber(rec, 'limitDollars');
    if (spent === null && limit === null) continue;
    count += 1;
    if (spent !== null && (maxSpentUsd === null || spent > maxSpentUsd)) {
      maxSpentUsd = Number(spent.toFixed(4));
    }
    if (rec.picked === true && limit !== null) {
      pickedLimitUsd = Number(limit.toFixed(2));
    }
  }
  return { count, maxSpentUsd, pickedLimitUsd };
}

function resolveConsoleBase(raw?: string): string {
  const base = (raw?.trim() || DEFAULT_CONSOLE_BASE_URL).replace(/\/+$/, '');
  return base.replace(/^https:\/\/console\.opencode\.ai(?=\/|$)/, DEFAULT_CONSOLE_BASE_URL);
}

export async function probeOpenCodeCloud(opts: OpenCodeCloudProbeOpts): Promise<OpenCodeCloudResult> {
  const apiKey = opts.apiKey.trim();
  const workspaceId = opts.workspaceId?.trim() || null;
  if (!apiKey) {
    return {
      configured: false,
      status: 'unconfigured',
      providerStatus: 'unauthenticated',
      source: 'opencode-console-api',
      planLabel: null,
      accountLabel: null,
      windows: [],
      reportedSpendUsd: null,
      qualificationState: 'unconfigured',
      balanceStatusMessage: 'Set a personal Console / Go key in Plugin Settings',
      workspaceId,
      errorMessage: null,
      goSubscribed: false
    };
  }

  const fetchFn: FetchLike = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const consoleBase = resolveConsoleBase(opts.consoleBaseUrl);
  const origin = new URL(consoleBase).origin;
  const goHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json'
  };
  if (workspaceId) goHeaders['x-opencode-org-id'] = workspaceId;

  const consoleHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json'
  };
  if (workspaceId) consoleHeaders['x-org-id'] = workspaceId;

  let goStatus = 0;
  let goWindows: QuotaWindow[] = [];
  let goError: string | null = null;
  let budgetsStatus = 0;
  let budgetsSpend: number | null = null;
  let budgetsError: string | null = null;

  const [goRes, budgetsRes] = await Promise.allSettled([
    fetchFn(`${origin}/zen/go/v1/usage`, { headers: goHeaders, signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS) }),
    fetchFn(`${consoleBase}/api/policies/current-budgets`, { headers: consoleHeaders, signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS) })
  ]);

  if (goRes.status === 'fulfilled') {
    goStatus = goRes.value.status;
    if (goRes.value.ok) {
      goWindows = parseOpenCodeGoUsagePayload(await goRes.value.json().catch(() => ({})));
    } else if (goStatus === 401) {
      goError = 'HTTP 401: OpenCode API key expired or invalid';
    } else if (goStatus !== 403) {
      goError = `HTTP ${goStatus} from OpenCode Go usage endpoint`;
    }
  } else {
    goError = errorMessage(goRes.reason);
    opts.onWarn?.(`ai-usage-monitor: OpenCode Go probe failed: ${goError}`);
  }

  if (budgetsRes.status === 'fulfilled') {
    budgetsStatus = budgetsRes.value.status;
    if (budgetsRes.value.ok) {
      const parsed = sumOpenCodeBudgetsSpend(await budgetsRes.value.json().catch(() => []));
      budgetsSpend = parsed.maxSpentUsd;
    } else if (budgetsStatus === 401) {
      budgetsError = 'HTTP 401: OpenCode Console key expired or invalid';
    } else if (budgetsStatus !== 403) {
      budgetsError = `HTTP ${budgetsStatus} from OpenCode Console budgets endpoint`;
    }
  } else {
    budgetsError = errorMessage(budgetsRes.reason);
    opts.onWarn?.(`ai-usage-monitor: OpenCode Console budgets probe failed: ${budgetsError}`);
  }

  if (goStatus === 401 || budgetsStatus === 401) {
    const errMsg = goError ?? budgetsError ?? 'HTTP 401: OpenCode credentials expired or invalid';
    return {
      configured: true,
      status: 'error',
      providerStatus: 'expired',
      source: 'opencode-console-api',
      planLabel: null,
      accountLabel: workspaceId,
      windows: [],
      reportedSpendUsd: null,
      qualificationState: 'error',
      balanceStatusMessage: errMsg,
      workspaceId,
      errorMessage: errMsg,
      goSubscribed: false
    };
  }

  if (goStatus === 403 && budgetsStatus === 403) {
    const msg = 'HTTP 403: Key lacks Go subscription or Console budget read access (service keys cannot read member budgets)';
    return {
      configured: true,
      status: 'error',
      providerStatus: 'error',
      source: 'opencode-console-api',
      planLabel: null,
      accountLabel: workspaceId,
      windows: [],
      reportedSpendUsd: null,
      qualificationState: 'permission_required',
      balanceStatusMessage: msg,
      workspaceId,
      errorMessage: msg,
      goSubscribed: false
    };
  }

  if (goWindows.length === 0 && budgetsStatus !== 200 && (goError || budgetsError)) {
    const msg = goError ?? budgetsError ?? 'OpenCode cloud probe failed';
    return {
      configured: true,
      status: 'error',
      providerStatus: 'error',
      source: 'opencode-console-api',
      planLabel: null,
      accountLabel: workspaceId,
      windows: [],
      reportedSpendUsd: null,
      qualificationState: 'error',
      balanceStatusMessage: msg,
      workspaceId,
      errorMessage: msg,
      goSubscribed: false
    };
  }

  const goSubscribed = goWindows.length > 0;
  const hasBlocked = goWindows.some((w) => w.status === 'blocked');
  const hasWarning = goWindows.some((w) => w.status === 'warning');
  const providerStatus: ProviderQuotaStatus = hasBlocked ? 'blocked' : hasWarning ? 'warning' : 'ok';

  return {
    configured: true,
    status: 'ok',
    providerStatus,
    source: goSubscribed ? 'opencode-go-usage' : 'opencode-console-api',
    planLabel: goSubscribed ? 'OpenCode Go · Balance Pending' : 'Console · Balance Pending',
    accountLabel: workspaceId,
    windows: goWindows,
    reportedSpendUsd: budgetsSpend,
    qualificationState: 'unqualified',
    balanceStatusMessage:
      'Console prepaid balance pending endpoint qualification (Billing Read key validation)',
    workspaceId,
    errorMessage: null,
    goSubscribed
  };
}

export interface OpenCodeQualificationProbeEntry {
  route: string;
  httpStatus: number | null;
  ok: boolean;
  topLevelKeys: string[];
  note: string;
}

export async function qualifyOpenCodeConsole(opts: {
  apiKey: string;
  workspaceId?: string;
  consoleBaseUrl?: string;
  fetch?: FetchLike;
}): Promise<{ ok: boolean; probes: OpenCodeQualificationProbeEntry[]; error?: string }> {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) {
    return { ok: false, probes: [], error: 'opencodeApiKey is required to run Console qualification.' };
  }
  const fetchFn: FetchLike = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const consoleBase = resolveConsoleBase(opts.consoleBaseUrl);
  const origin = new URL(consoleBase).origin;
  const workspaceId = opts.workspaceId?.trim() || null;

  const targets = [
    { url: `${origin}/zen/go/v1/usage`, label: 'GET /zen/go/v1/usage', orgHeader: 'x-opencode-org-id' },
    { url: `${consoleBase}/api/policies/current-budgets`, label: 'GET /console/api/policies/current-budgets', orgHeader: 'x-org-id' },
    { url: `${origin}/console/api/billing/status`, label: 'GET /console/api/billing/status', orgHeader: 'x-org-id' },
    { url: `${origin}/console/api/usage/summary`, label: 'GET /console/api/usage/summary', orgHeader: 'x-org-id' }
  ];

  const probes: OpenCodeQualificationProbeEntry[] = [];
  for (const target of targets) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    };
    if (workspaceId) headers[target.orgHeader] = workspaceId;

    try {
      const res = await fetchFn(target.url, { headers, signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS) });
      const text = await res.text();
      let topLevelKeys: string[] = [];
      let note = `HTTP ${res.status}`;
      try {
        const parsed: unknown = JSON.parse(text);
        if (Array.isArray(parsed)) {
          topLevelKeys = [`[array length=${parsed.length}]`];
        } else if (parsed && typeof parsed === 'object') {
          topLevelKeys = Object.keys(parsed as Record<string, unknown>).slice(0, 20);
        }
      } catch {
        note = `HTTP ${res.status} (non-JSON body)`;
      }
      probes.push({ route: target.label, httpStatus: res.status, ok: res.ok, topLevelKeys, note });
    } catch (err) {
      probes.push({ route: target.label, httpStatus: null, ok: false, topLevelKeys: [], note: errorMessage(err) });
    }
  }

  return { ok: true, probes };
}
