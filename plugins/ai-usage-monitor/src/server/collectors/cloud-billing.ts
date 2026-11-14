import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { CloudConnectorStatus } from '../../shared/types.ts';
import type { UpsertQuotaRecord, UsageStore } from '../db.ts';
import { asNumber, asOptionalNumber, asRecord, errorMessage } from '../util.ts';
import { probeOpenCodeCloud, type OpenCodeCloudResult } from './opencode-usage.ts';
import type { FetchLike } from './zcc-quotas.ts';

export interface CloudBillingKeys {
  openaiAdminKey?: string;
  anthropicAdminKey?: string;
  openrouterApiKey?: string;
  opencodeApiKey?: string;
  opencodeWorkspaceId?: string;
}

export interface CloudBillingCollectorDeps {
  store: UsageStore;
  getKeys: () => Promise<CloudBillingKeys>;
  fetch?: FetchLike;
  log: Pick<ZccPluginApi['log'], 'debug' | 'warn'>;
  now?: () => number;
}

type CloudProvider = CloudConnectorStatus['provider'];

/** Shared dependencies for the module-level provider sync functions. */
interface CloudSyncContext {
  store: UsageStore;
  fetch: FetchLike;
  log: Pick<ZccPluginApi['log'], 'debug' | 'warn'>;
  now: () => number;
}

const CLOUD_API_TIMEOUT_MS = 8000;
const OPENROUTER_WARNING_USED_PCT = 80;
/** Snapshot sources the OpenCode console/Go probe writes for the `opencode` provider id. */
const OPENCODE_SNAPSHOT_SOURCES = ['opencode-console-api', 'opencode-go-usage'] as const;

function monthStartUnixSeconds(nowMs: number): number {
  const dt = new Date(nowMs);
  return Math.floor(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1, 0, 0, 0) / 1000);
}

function sumOpenAiCosts(payload: unknown): number {
  const rec = asRecord(payload);
  const buckets = Array.isArray(rec.data) ? rec.data : [];
  let total = 0;
  for (const bucket of buckets) {
    const b = asRecord(bucket);
    const results = Array.isArray(b.results) ? b.results : [];
    for (const item of results) {
      const amount = asRecord(asRecord(item).amount);
      total += asNumber(amount, 'value', 0);
    }
  }
  return Number(total.toFixed(4));
}

function sumAnthropicCosts(payload: unknown): number {
  const rec = asRecord(payload);
  const buckets = Array.isArray(rec.data) ? rec.data : [];
  let totalCents = 0;
  for (const bucket of buckets) {
    const b = asRecord(bucket);
    const results = Array.isArray(b.results) ? b.results : Array.isArray(b.costs) ? b.costs : [];
    for (const item of results) {
      const row = asRecord(item);
      const amount = asOptionalNumber(row, 'amount_cents');
      if (amount !== null) {
        totalCents += amount;
      } else {
        const strAmount = row.amount;
        if (typeof strAmount === 'string') totalCents += Number.parseFloat(strAmount) || 0;
      }
    }
  }
  return Number((totalCents / 100).toFixed(4));
}

function connectorStatus(provider: CloudProvider, overrides: Partial<CloudConnectorStatus> = {}): CloudConnectorStatus {
  return {
    provider, configured: false, status: 'unconfigured', lastSyncedAtMs: null, reportedSpendUsd: null,
    creditRemainingUsd: null, creditLimitUsd: null, errorMessage: null, ...overrides
  };
}

function initialStatuses(): CloudConnectorStatus[] {
  return [
    connectorStatus('openai'),
    connectorStatus('anthropic'),
    connectorStatus('openrouter'),
    connectorStatus('opencode', {
      qualificationState: 'unconfigured',
      balanceStatusMessage: 'Console prepaid balance requires key qualification'
    })
  ];
}

async function fetchJson(ctx: CloudSyncContext, url: string, headers: Record<string, string>, apiName: string): Promise<unknown> {
  const res = await ctx.fetch(url, { headers, signal: AbortSignal.timeout(CLOUD_API_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${apiName}`);
  return res.json();
}

/** Result of a successful admin/API key billing probe. */
interface ApiKeyProbeResult {
  snapshot: Omit<UpsertQuotaRecord, 'providerId' | 'source' | 'updatedAtMs' | 'errorMessage'>;
  status: Pick<CloudConnectorStatus, 'reportedSpendUsd' | 'creditRemainingUsd' | 'creditLimitUsd'>;
}

/** A cloud connector authenticated by a single API key that owns one quota snapshot row. */
interface ApiKeyConnector {
  provider: CloudProvider;
  /** Row in provider_quota_snapshots this connector owns. */
  snapshotProviderId: string;
  /** Snapshot source; must be listed in zcc-quotas PRESERVED_CLOUD_SOURCES. */
  source: string;
  logLabel: string;
  probe: (ctx: CloudSyncContext, apiKey: string, ts: number) => Promise<ApiKeyProbeResult>;
}

function billedApiSnapshot(displayName: string, spend: number): ApiKeyProbeResult {
  return {
    snapshot: {
      displayName, status: 'ok', accountLabel: 'Org Billing', planLabel: 'Pay-As-You-Go', billingMode: 'billed_api',
      windows: [], creditRemainingUsd: null, creditLimitUsd: null, creditUsedUsd: spend, billedCostUsd: spend
    },
    status: { reportedSpendUsd: spend, creditRemainingUsd: null, creditLimitUsd: null }
  };
}

async function probeOpenAiCosts(ctx: CloudSyncContext, apiKey: string, ts: number): Promise<ApiKeyProbeResult> {
  const url = `https://api.openai.com/v1/organization/costs?start_time=${monthStartUnixSeconds(ts)}&limit=31`;
  const data = await fetchJson(ctx, url, { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }, 'OpenAI Costs API');
  return billedApiSnapshot('OpenAI Platform API', sumOpenAiCosts(data));
}

async function probeAnthropicCosts(ctx: CloudSyncContext, apiKey: string, ts: number): Promise<ApiKeyProbeResult> {
  const startIso = new Date(monthStartUnixSeconds(ts) * 1000).toISOString();
  const url = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(startIso)}`;
  const headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', Accept: 'application/json' };
  const data = await fetchJson(ctx, url, headers, 'Anthropic Cost Report API');
  return billedApiSnapshot('Anthropic Console API', sumAnthropicCosts(data));
}

async function probeOpenRouterCredits(ctx: CloudSyncContext, apiKey: string): Promise<ApiKeyProbeResult> {
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
  const json = asRecord(await fetchJson(ctx, 'https://openrouter.ai/api/v1/credits', headers, 'OpenRouter Credits API'));
  const data = asRecord(json.data);
  const totalCredits = asNumber(data, 'total_credits', 0);
  const totalUsage = asNumber(data, 'total_usage', 0);
  const remaining = Number(Math.max(0, totalCredits - totalUsage).toFixed(4));
  const usedPct = totalCredits > 0 ? Math.min(100, Math.round((totalUsage / totalCredits) * 1000) / 10) : 0;
  const exhausted = remaining <= 0 && totalCredits > 0;
  const nearLimit = usedPct >= OPENROUTER_WARNING_USED_PCT;
  return {
    snapshot: {
      displayName: 'OpenRouter Credits', status: exhausted ? 'blocked' : nearLimit ? 'warning' : 'ok',
      accountLabel: 'Prepaid Wallet', planLabel: 'Credits', billingMode: 'billed_api',
      windows: [{
        key: 'openrouter_credits', label: 'Prepaid Credit Balance', usedPercent: usedPct,
        remainingPercent: Math.max(0, Math.round((100 - usedPct) * 10) / 10),
        status: exhausted ? 'blocked' : nearLimit ? 'warning' : 'allowed', resetsAtIso: null,
        usedUsdCents: Math.round(totalUsage * 100), limitUsdCents: Math.round(totalCredits * 100)
      }],
      creditRemainingUsd: remaining, creditLimitUsd: totalCredits, creditUsedUsd: totalUsage, billedCostUsd: totalUsage
    },
    status: { reportedSpendUsd: totalUsage, creditRemainingUsd: remaining, creditLimitUsd: totalCredits }
  };
}

const OPENAI_CONNECTOR: ApiKeyConnector = {
  provider: 'openai', snapshotProviderId: 'openai-api', source: 'openai-admin-api',
  logLabel: 'OpenAI billing', probe: probeOpenAiCosts
};
const ANTHROPIC_CONNECTOR: ApiKeyConnector = {
  provider: 'anthropic', snapshotProviderId: 'anthropic-api', source: 'anthropic-admin-api',
  logLabel: 'Anthropic billing', probe: probeAnthropicCosts
};
const OPENROUTER_CONNECTOR: ApiKeyConnector = {
  provider: 'openrouter', snapshotProviderId: 'openrouter', source: 'openrouter-api',
  logLabel: 'OpenRouter credits', probe: (ctx, apiKey) => probeOpenRouterCredits(ctx, apiKey)
};

/** Marks the connector's last good snapshot as errored so the dashboard stops reporting it as healthy. */
function markSnapshotFailed(ctx: CloudSyncContext, connector: ApiKeyConnector, message: string, ts: number): void {
  const existing = ctx.store.listQuotaSnapshots()
    .find((s) => s.providerId === connector.snapshotProviderId && s.source === connector.source);
  if (!existing) return;
  ctx.store.upsertQuotaSnapshot({ ...existing, status: 'error', errorMessage: message, updatedAtMs: ts });
}

/**
 * Syncs one API-key connector. Snapshots from these sources are preserved by the ZCC quota
 * collector, so this connector is the only writer: it must delete the row when the key is cleared
 * and flag it as errored when the probe fails, or stale balances stay on the dashboard forever.
 */
async function syncApiKeyConnector(
  ctx: CloudSyncContext, connector: ApiKeyConnector, rawKey: string, ts: number
): Promise<CloudConnectorStatus> {
  const apiKey = rawKey.trim();
  if (!apiKey) {
    ctx.store.deleteQuotaSnapshot(connector.snapshotProviderId, [connector.source]);
    return connectorStatus(connector.provider);
  }
  try {
    const result = await connector.probe(ctx, apiKey, ts);
    ctx.store.upsertQuotaSnapshot({
      ...result.snapshot, providerId: connector.snapshotProviderId, source: connector.source, errorMessage: null, updatedAtMs: ts
    });
    return connectorStatus(connector.provider, { configured: true, status: 'ok', lastSyncedAtMs: ts, ...result.status });
  } catch (err) {
    const msg = errorMessage(err);
    ctx.log.warn(`ai-usage-monitor: ${connector.logLabel} sync failed: ${msg}`);
    markSnapshotFailed(ctx, connector, msg, ts);
    return connectorStatus(connector.provider, { configured: true, status: 'error', lastSyncedAtMs: ts, errorMessage: msg });
  }
}

/** Persists the OpenCode probe result, keeping last good windows on transient provider errors. */
function persistOpenCodeSnapshot(ctx: CloudSyncContext, res: OpenCodeCloudResult, ts: number): void {
  const existing = ctx.store.listQuotaSnapshots().find((s) => s.providerId === 'opencode');
  const preserveExisting =
    res.status === 'error' &&
    res.providerStatus === 'error' &&
    res.qualificationState !== 'permission_required' &&
    existing !== undefined &&
    existing.windows.length > 0 &&
    (existing.status === 'ok' || existing.status === 'warning' || existing.status === 'blocked');
  if (preserveExisting && existing) {
    ctx.store.upsertQuotaSnapshot({ ...existing, errorMessage: res.errorMessage, updatedAtMs: ts });
    return;
  }
  ctx.store.upsertQuotaSnapshot({
    providerId: 'opencode', displayName: 'OpenCode', source: res.source, status: res.providerStatus,
    accountLabel: res.accountLabel, planLabel: res.planLabel, billingMode: res.goSubscribed ? 'subscription' : 'billed_api',
    windows: res.windows, creditRemainingUsd: null, creditLimitUsd: null, creditUsedUsd: null,
    billedCostUsd: res.reportedSpendUsd, errorMessage: res.errorMessage, updatedAtMs: ts
  });
}

async function syncOpenCode(ctx: CloudSyncContext, apiKey: string, workspaceId: string, ts: number): Promise<CloudConnectorStatus> {
  const res = await probeOpenCodeCloud({
    apiKey, workspaceId, fetch: ctx.fetch, now: ctx.now, onWarn: (msg) => ctx.log.warn(msg)
  });
  if (res.configured) {
    persistOpenCodeSnapshot(ctx, res, ts);
  } else {
    // Key cleared: drop the console/Go snapshot so its balance and status do not linger.
    ctx.store.deleteQuotaSnapshot('opencode', OPENCODE_SNAPSHOT_SOURCES);
  }
  return connectorStatus('opencode', {
    configured: res.configured, status: res.status, lastSyncedAtMs: res.configured ? ts : null,
    reportedSpendUsd: res.reportedSpendUsd, errorMessage: res.errorMessage, qualificationState: res.qualificationState,
    balanceStatusMessage: res.balanceStatusMessage, workspaceId: res.workspaceId
  });
}

type ProviderSync = (ctx: CloudSyncContext, keys: CloudBillingKeys, ts: number) => Promise<CloudConnectorStatus>;

/** Ordered like `initialStatuses()`; the index is the slot in the collector's status list. */
const PROVIDER_SYNCS: ReadonlyArray<{ ids: readonly string[]; sync: ProviderSync }> = [
  { ids: ['openai', 'openai-api'], sync: (ctx, keys, ts) => syncApiKeyConnector(ctx, OPENAI_CONNECTOR, keys.openaiAdminKey ?? '', ts) },
  { ids: ['anthropic', 'anthropic-api'], sync: (ctx, keys, ts) => syncApiKeyConnector(ctx, ANTHROPIC_CONNECTOR, keys.anthropicAdminKey ?? '', ts) },
  { ids: ['openrouter'], sync: (ctx, keys, ts) => syncApiKeyConnector(ctx, OPENROUTER_CONNECTOR, keys.openrouterApiKey ?? '', ts) },
  { ids: ['opencode'], sync: (ctx, keys, ts) => syncOpenCode(ctx, keys.opencodeApiKey ?? '', keys.opencodeWorkspaceId ?? '', ts) }
];

export function createCloudBillingCollector(deps: CloudBillingCollectorDeps) {
  const ctx: CloudSyncContext = {
    store: deps.store,
    fetch: deps.fetch ?? ((input, init) => globalThis.fetch(input, init)),
    log: deps.log,
    now: deps.now ?? Date.now
  };
  const latestStatuses = initialStatuses();

  async function collectAll(): Promise<CloudConnectorStatus[]> {
    const keys = await deps.getKeys();
    const ts = ctx.now();
    const results = await Promise.all(PROVIDER_SYNCS.map((entry) => entry.sync(ctx, keys, ts)));
    latestStatuses.splice(0, latestStatuses.length, ...results);
    return results;
  }

  async function collectOne(providerId: string): Promise<CloudConnectorStatus | null> {
    const norm = providerId.trim().toLowerCase();
    const slotIndex = PROVIDER_SYNCS.findIndex((entry) => entry.ids.includes(norm));
    if (slotIndex < 0) return null;
    const keys = await deps.getKeys();
    const result = await PROVIDER_SYNCS[slotIndex].sync(ctx, keys, ctx.now());
    latestStatuses[slotIndex] = result;
    return result;
  }

  function getStatuses(): CloudConnectorStatus[] {
    return [...latestStatuses];
  }

  return { collectAll, collectOne, getStatuses };
}
