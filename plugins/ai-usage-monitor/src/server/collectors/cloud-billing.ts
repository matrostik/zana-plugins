import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { CloudConnectorStatus } from '../../shared/types.ts';
import type { UsageStore } from '../db.ts';
import { asNumber, asOptionalNumber, asRecord, errorMessage } from '../util.ts';
import { probeOpenCodeCloud } from './opencode-usage.ts';
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

export function createCloudBillingCollector(deps: CloudBillingCollectorDeps) {
  const now = deps.now ?? Date.now;
  const fetchFn: FetchLike = deps.fetch ?? ((input, init) => globalThis.fetch(input, init));

  const latestStatuses: CloudConnectorStatus[] = [
    { provider: 'openai', configured: false, status: 'unconfigured', lastSyncedAtMs: null, reportedSpendUsd: null, creditRemainingUsd: null, creditLimitUsd: null, errorMessage: null },
    { provider: 'anthropic', configured: false, status: 'unconfigured', lastSyncedAtMs: null, reportedSpendUsd: null, creditRemainingUsd: null, creditLimitUsd: null, errorMessage: null },
    { provider: 'openrouter', configured: false, status: 'unconfigured', lastSyncedAtMs: null, reportedSpendUsd: null, creditRemainingUsd: null, creditLimitUsd: null, errorMessage: null },
    {
      provider: 'opencode',
      configured: false,
      status: 'unconfigured',
      lastSyncedAtMs: null,
      reportedSpendUsd: null,
      creditRemainingUsd: null,
      creditLimitUsd: null,
      errorMessage: null,
      qualificationState: 'unconfigured',
      balanceStatusMessage: 'Console prepaid balance requires key qualification'
    }
  ];

  async function syncOpenAi(apiKey: string, ts: number): Promise<CloudConnectorStatus> {
    if (!apiKey.trim()) {
      return { provider: 'openai', configured: false, status: 'unconfigured', lastSyncedAtMs: null, reportedSpendUsd: null, creditRemainingUsd: null, creditLimitUsd: null, errorMessage: null };
    }
    try {
      const startTime = monthStartUnixSeconds(ts);
      const url = `https://api.openai.com/v1/organization/costs?start_time=${startTime}&limit=31`;
      const res = await fetchFn(url, {
        headers: { Authorization: `Bearer ${apiKey.trim()}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from OpenAI Costs API`);
      }
      const data = await res.json();
      const spend = sumOpenAiCosts(data);
      deps.store.upsertQuotaSnapshot({
        providerId: 'openai-api',
        displayName: 'OpenAI Platform API',
        source: 'openai-admin-api',
        status: 'ok',
        accountLabel: 'Org Billing',
        planLabel: 'Pay-As-You-Go',
        billingMode: 'billed_api',
        windows: [],
        creditRemainingUsd: null,
        creditLimitUsd: null,
        creditUsedUsd: spend,
        billedCostUsd: spend,
        errorMessage: null,
        updatedAtMs: ts
      });
      return {
        provider: 'openai',
        configured: true,
        status: 'ok',
        lastSyncedAtMs: ts,
        reportedSpendUsd: spend,
        creditRemainingUsd: null,
        creditLimitUsd: null,
        errorMessage: null
      };
    } catch (err) {
      const msg = errorMessage(err);
      deps.log.warn(`ai-usage-monitor: OpenAI billing sync failed: ${msg}`);
      return {
        provider: 'openai',
        configured: true,
        status: 'error',
        lastSyncedAtMs: ts,
        reportedSpendUsd: null,
        creditRemainingUsd: null,
        creditLimitUsd: null,
        errorMessage: msg
      };
    }
  }

  async function syncAnthropic(apiKey: string, ts: number): Promise<CloudConnectorStatus> {
    if (!apiKey.trim()) {
      return { provider: 'anthropic', configured: false, status: 'unconfigured', lastSyncedAtMs: null, reportedSpendUsd: null, creditRemainingUsd: null, creditLimitUsd: null, errorMessage: null };
    }
    try {
      const startIso = new Date(monthStartUnixSeconds(ts) * 1000).toISOString();
      const url = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(startIso)}`;
      const res = await fetchFn(url, {
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from Anthropic Cost Report API`);
      }
      const data = await res.json();
      const spend = sumAnthropicCosts(data);
      deps.store.upsertQuotaSnapshot({
        providerId: 'anthropic-api',
        displayName: 'Anthropic Console API',
        source: 'anthropic-admin-api',
        status: 'ok',
        accountLabel: 'Org Billing',
        planLabel: 'Pay-As-You-Go',
        billingMode: 'billed_api',
        windows: [],
        creditRemainingUsd: null,
        creditLimitUsd: null,
        creditUsedUsd: spend,
        billedCostUsd: spend,
        errorMessage: null,
        updatedAtMs: ts
      });
      return {
        provider: 'anthropic',
        configured: true,
        status: 'ok',
        lastSyncedAtMs: ts,
        reportedSpendUsd: spend,
        creditRemainingUsd: null,
        creditLimitUsd: null,
        errorMessage: null
      };
    } catch (err) {
      const msg = errorMessage(err);
      deps.log.warn(`ai-usage-monitor: Anthropic billing sync failed: ${msg}`);
      return {
        provider: 'anthropic',
        configured: true,
        status: 'error',
        lastSyncedAtMs: ts,
        reportedSpendUsd: null,
        creditRemainingUsd: null,
        creditLimitUsd: null,
        errorMessage: msg
      };
    }
  }

  async function syncOpenRouter(apiKey: string, ts: number): Promise<CloudConnectorStatus> {
    if (!apiKey.trim()) {
      return { provider: 'openrouter', configured: false, status: 'unconfigured', lastSyncedAtMs: null, reportedSpendUsd: null, creditRemainingUsd: null, creditLimitUsd: null, errorMessage: null };
    }
    try {
      const creditsRes = await fetchFn('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${apiKey.trim()}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      if (!creditsRes.ok) {
        throw new Error(`HTTP ${creditsRes.status} from OpenRouter Credits API`);
      }
      const creditsJson = asRecord(await creditsRes.json());
      const data = asRecord(creditsJson.data);
      const totalCredits = asNumber(data, 'total_credits', 0);
      const totalUsage = asNumber(data, 'total_usage', 0);
      const remaining = Number(Math.max(0, totalCredits - totalUsage).toFixed(4));
      const usedPct = totalCredits > 0 ? Math.min(100, Math.round((totalUsage / totalCredits) * 1000) / 10) : 0;

      deps.store.upsertQuotaSnapshot({
        providerId: 'openrouter',
        displayName: 'OpenRouter Credits',
        source: 'openrouter-api',
        status: remaining <= 0 && totalCredits > 0 ? 'blocked' : usedPct >= 80 ? 'warning' : 'ok',
        accountLabel: 'Prepaid Wallet',
        planLabel: 'Credits',
        billingMode: 'billed_api',
        windows: [
          {
            key: 'openrouter_credits',
            label: 'Prepaid Credit Balance',
            usedPercent: usedPct,
            remainingPercent: Math.max(0, Math.round((100 - usedPct) * 10) / 10),
            status: remaining <= 0 && totalCredits > 0 ? 'blocked' : usedPct >= 80 ? 'warning' : 'allowed',
            resetsAtIso: null,
            usedUsdCents: Math.round(totalUsage * 100),
            limitUsdCents: Math.round(totalCredits * 100)
          }
        ],
        creditRemainingUsd: remaining,
        creditLimitUsd: totalCredits,
        creditUsedUsd: totalUsage,
        billedCostUsd: totalUsage,
        errorMessage: null,
        updatedAtMs: ts
      });

      return {
        provider: 'openrouter',
        configured: true,
        status: 'ok',
        lastSyncedAtMs: ts,
        reportedSpendUsd: totalUsage,
        creditRemainingUsd: remaining,
        creditLimitUsd: totalCredits,
        errorMessage: null
      };
    } catch (err) {
      const msg = errorMessage(err);
      deps.log.warn(`ai-usage-monitor: OpenRouter credits sync failed: ${msg}`);
      return {
        provider: 'openrouter',
        configured: true,
        status: 'error',
        lastSyncedAtMs: ts,
        reportedSpendUsd: null,
        creditRemainingUsd: null,
        creditLimitUsd: null,
        errorMessage: msg
      };
    }
  }

  async function syncOpenCode(apiKey: string, workspaceId: string, ts: number): Promise<CloudConnectorStatus> {
    const res = await probeOpenCodeCloud({
      apiKey,
      workspaceId,
      fetch: fetchFn,
      now,
      onWarn: (msg) => deps.log.warn(msg)
    });

    if (res.configured) {
      deps.store.upsertQuotaSnapshot({
        providerId: 'opencode',
        displayName: 'OpenCode',
        source: res.source,
        status: res.providerStatus,
        accountLabel: res.accountLabel,
        planLabel: res.planLabel,
        billingMode: res.goSubscribed ? 'subscription' : 'billed_api',
        windows: res.windows,
        creditRemainingUsd: null,
        creditLimitUsd: null,
        creditUsedUsd: null,
        billedCostUsd: res.reportedSpendUsd,
        errorMessage: res.errorMessage,
        updatedAtMs: ts
      });
    }

    return {
      provider: 'opencode',
      configured: res.configured,
      status: res.status,
      lastSyncedAtMs: res.configured ? ts : null,
      reportedSpendUsd: res.reportedSpendUsd,
      creditRemainingUsd: null,
      creditLimitUsd: null,
      errorMessage: res.errorMessage,
      qualificationState: res.qualificationState,
      balanceStatusMessage: res.balanceStatusMessage,
      workspaceId: res.workspaceId
    };
  }

  async function collectAll(): Promise<CloudConnectorStatus[]> {
    const keys = await deps.getKeys();
    const ts = now();
    const results = await Promise.all([
      syncOpenAi(keys.openaiAdminKey ?? '', ts),
      syncAnthropic(keys.anthropicAdminKey ?? '', ts),
      syncOpenRouter(keys.openrouterApiKey ?? '', ts),
      syncOpenCode(keys.opencodeApiKey ?? '', keys.opencodeWorkspaceId ?? '', ts)
    ]);
    latestStatuses.splice(0, latestStatuses.length, ...results);
    return results;
  }

  function getStatuses(): CloudConnectorStatus[] {
    return [...latestStatuses];
  }

  return { collectAll, getStatuses };
}
