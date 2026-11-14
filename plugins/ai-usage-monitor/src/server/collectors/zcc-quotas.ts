import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { BillingMode, ProviderQuotaStatus, QuotaWindow, QuotaWindowStatus } from '../../shared/types.ts';
import type { ObservedRateLimitState } from '../indexer.ts';
import type { UpsertQuotaRecord, UsageStore } from '../db.ts';
import { inferDefaultBillingMode } from '../pricing.ts';
import { asOptionalNumber, asOptionalString, asRecord, errorMessage, withTimeout } from '../util.ts';
import { expireStaleQuotaWindows, probeLocalProviderUsage } from './local-provider-usage.ts';

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface HostUsageProbeResult {
  codex?: unknown;
  claudeCode?: unknown;
  cursor?: unknown;
  [key: string]: unknown;
}

export interface ZccQuotaCollectorDeps {
  providers: Pick<ZccPluginApi['sdk']['providers'], 'list' | 'models'>;
  store: UsageStore;
  getObservedRateLimit: (providerId: string) => ObservedRateLimitState | undefined;
  getProviderModeOverrides: () => ReadonlyMap<string, BillingMode>;
  isLocalCredentialProbingEnabled?: () => boolean;
  getLoopbackBaseUrl?: () => string | null;
  probeSystemUsageLimits?: () => Promise<HostUsageProbeResult | null>;
  homeDir?: string | null;
  env?: NodeJS.ProcessEnv;
  fetch?: FetchLike;
  log: Pick<ZccPluginApi['log'], 'debug' | 'warn'>;
  now?: () => number;
}

export interface DiscoveredProviderModels {
  providerId: string;
  displayName: string;
  available: boolean;
  models: string[];
}

interface ParsedUsageEntry {
  status: ProviderQuotaStatus;
  source: string;
  accountLabel: string | null;
  planLabel: string | null;
  windows: QuotaWindow[];
  creditRemainingUsd: number | null;
  creditLimitUsd: number | null;
  creditUsedUsd: number | null;
  errorMessage: string | null;
}

interface PersistSnapshotArgs {
  providerId: string;
  displayName: string;
  available: boolean;
  billingMode: BillingMode;
  hostUsage: HostUsageProbeResult | null;
  existingSnapshot: UpsertQuotaRecord | undefined;
  ts: number;
}

const PROVIDER_RPC_TIMEOUT_MS = 4000;
const ANTIGRAVITY_USAGE_TIMEOUT_MS = 30000;
const PRESERVED_CLOUD_SOURCES = new Set([
  'openrouter-api',
  'openai-admin-api',
  'anthropic-admin-api',
  'opencode-go-usage',
  'opencode-console-api'
]);
const CLOUD_BILLING_PROVIDER_IDS = new Set(['openrouter', 'openai-api', 'anthropic-api', 'opencode']);

function mapProviderUsageKey(providerId: string): string {
  const norm = providerId.toLowerCase();
  if (norm === 'claude-code' || norm === 'claude') return 'claudeCode';
  if (norm === 'codex' || norm === 'openai-codex') return 'codex';
  if (norm === 'cursor' || norm === 'acp-cursor') return 'cursor';
  return norm;
}

function windowStatusFromPercent(usedPercent: number | null): QuotaWindowStatus {
  if (usedPercent === null) return 'unknown';
  if (usedPercent >= 100) return 'blocked';
  if (usedPercent >= 75) return 'warning';
  return 'allowed';
}

function parseUsageWindow(item: unknown, idx: number): {
  window: QuotaWindow;
  creditRemainingUsd: number | null;
  creditLimitUsd: number | null;
  creditUsedUsd: number | null;
} {
  const w = asRecord(item);
  const usedPercent = asOptionalNumber(w, 'usedPercent');
  const remainingPercent = usedPercent !== null ? Math.max(0, Math.round((100 - usedPercent) * 10) / 10) : null;
  const cost = asRecord(w.cost);
  const usedUsdCents = asOptionalNumber(cost, 'usedUsdCents');
  const limitUsdCents = asOptionalNumber(cost, 'limitUsdCents');
  let creditRemainingUsd: number | null = null;
  let creditLimitUsd: number | null = null;
  let creditUsedUsd: number | null = null;
  if (usedUsdCents !== null && limitUsdCents !== null && limitUsdCents > 0) {
    creditUsedUsd = Number((usedUsdCents / 100).toFixed(2));
    creditLimitUsd = Number((limitUsdCents / 100).toFixed(2));
    creditRemainingUsd = Number(Math.max(0, creditLimitUsd - creditUsedUsd).toFixed(2));
  }
  return {
    window: {
      key: `win_${idx}`,
      label: asOptionalString(w, 'label') ?? `Window ${idx + 1}`,
      usedPercent, remainingPercent, status: windowStatusFromPercent(usedPercent),
      resetsAtIso: asOptionalString(w, 'resetsAt'), usedUsdCents, limitUsdCents
    },
    creditRemainingUsd, creditLimitUsd, creditUsedUsd
  };
}

function parseUsageEntry(raw: unknown): ParsedUsageEntry | null {
  const rec = asRecord(raw);
  const status = asOptionalString(rec, 'status');
  if (!status) return null;
  const source = asOptionalString(rec, 'source') ?? 'zcc-host-usage';
  const accountLabel = asOptionalString(rec, 'accountEmail');
  const planLabel = asOptionalString(rec, 'planLabel');
  if (status === 'not_installed' || status === 'unauthenticated' || status === 'expired' || status === 'error') {
    return {
      status, source, accountLabel, planLabel, windows: [],
      creditRemainingUsd: null, creditLimitUsd: null, creditUsedUsd: null,
      errorMessage: status === 'error' ? (asOptionalString(rec, 'message') ?? 'Usage probe failed') : null
    };
  }
  const rawWindows = Array.isArray(rec.windows) ? rec.windows : [];
  const parsed = rawWindows.map(parseUsageWindow);
  const windows = parsed.map((p) => p.window);
  const lastCredit = [...parsed].reverse().find((p) => p.creditLimitUsd !== null);
  const resolvedStatus: ProviderQuotaStatus = windows.some((w) => w.status === 'blocked')
    ? 'blocked'
    : windows.some((w) => w.status === 'warning') ? 'warning' : 'ok';
  return {
    status: resolvedStatus, source, accountLabel, planLabel, windows,
    creditRemainingUsd: lastCredit?.creditRemainingUsd ?? null,
    creditLimitUsd: lastCredit?.creditLimitUsd ?? null,
    creditUsedUsd: lastCredit?.creditUsedUsd ?? null,
    errorMessage: null
  };
}

function persistHostUsageSnapshot(store: UsageStore, args: PersistSnapshotArgs, parsedHost: ParsedUsageEntry): void {
  const prev = args.existingSnapshot;
  const preserveExistingWindows =
    parsedHost.status === 'error' && prev !== undefined && prev.windows.length > 0 &&
    (prev.status === 'ok' || prev.status === 'warning' || prev.status === 'blocked');
  if (preserveExistingWindows && prev) {
    const normalized = expireStaleQuotaWindows(prev.windows, prev.status, parsedHost.errorMessage ?? prev.errorMessage, args.ts);
    store.upsertQuotaSnapshot({
      ...prev, displayName: args.displayName, billingMode: args.billingMode, status: normalized.status,
      windows: normalized.windows, errorMessage: parsedHost.errorMessage ?? normalized.errorMessage, updatedAtMs: args.ts
    });
    return;
  }
  store.upsertQuotaSnapshot({
    providerId: args.providerId, displayName: args.displayName, source: parsedHost.source, status: parsedHost.status,
    accountLabel: parsedHost.accountLabel, planLabel: parsedHost.planLabel, billingMode: args.billingMode,
    windows: parsedHost.windows, creditRemainingUsd: parsedHost.creditRemainingUsd,
    creditLimitUsd: parsedHost.creditLimitUsd, creditUsedUsd: parsedHost.creditUsedUsd,
    billedCostUsd: null, errorMessage: parsedHost.errorMessage, updatedAtMs: args.ts
  });
}

function persistObservedSnapshot(store: UsageStore, args: PersistSnapshotArgs, observed: ObservedRateLimitState): void {
  const mappedStatus: ProviderQuotaStatus =
    observed.status === 'blocked' ? 'blocked'
      : observed.status === 'warning' ? 'warning'
      : observed.status === 'allowed' ? 'ok' : 'unknown';
  const normalized = expireStaleQuotaWindows(observed.windows, mappedStatus, observed.reachedReason ?? observed.overageReason, args.ts);
  store.upsertQuotaSnapshot({
    providerId: args.providerId, displayName: args.displayName, source: 'thread-events', status: normalized.status,
    accountLabel: null, planLabel: observed.kind === 'subscription-window' ? 'Subscription' : null,
    billingMode: args.billingMode, windows: normalized.windows, creditRemainingUsd: null, creditLimitUsd: null,
    creditUsedUsd: null, billedCostUsd: null, errorMessage: normalized.errorMessage, updatedAtMs: args.ts
  });
}

function persistFallbackSnapshot(store: UsageStore, args: PersistSnapshotArgs): void {
  if (args.existingSnapshot?.source === 'thread-events') {
    const normalized = expireStaleQuotaWindows(args.existingSnapshot.windows, args.existingSnapshot.status, args.existingSnapshot.errorMessage, args.ts);
    store.upsertQuotaSnapshot({
      ...args.existingSnapshot, displayName: args.displayName, billingMode: args.billingMode,
      status: normalized.status, windows: normalized.windows, errorMessage: normalized.errorMessage, updatedAtMs: args.ts
    });
    return;
  }
  const planLabel = args.billingMode === 'free' ? 'Local Runtime' : args.billingMode === 'subscription' ? 'ZCC Provider' : 'API Provider';
  store.upsertQuotaSnapshot({
    providerId: args.providerId, displayName: args.displayName, source: 'zcc-registry',
    status: args.available ? 'ok' : 'not_installed', accountLabel: null, planLabel,
    billingMode: args.billingMode, windows: [], creditRemainingUsd: null, creditLimitUsd: null,
    creditUsedUsd: null, billedCostUsd: null, errorMessage: null, updatedAtMs: args.ts
  });
}

export function createZccQuotaCollector(deps: ZccQuotaCollectorDeps) {
  const now = deps.now ?? Date.now;
  const fetchFn: FetchLike = deps.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const cachedModelsByProvider = new Map<string, string[]>();

  async function probeAntigravityUsage(): Promise<unknown> {
    const baseUrl = deps.getLoopbackBaseUrl?.();
    if (!baseUrl) return null;
    try {
      const url = new URL('/api/v1/plugins/provider-antigravity/rpc/usage:status', baseUrl);
      const res = await fetchFn(url, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
        signal: AbortSignal.timeout(ANTIGRAVITY_USAGE_TIMEOUT_MS)
      });
      if (!res.ok) throw new Error(`Usage service returned HTTP ${res.status}`);
      const envelope = asRecord(await res.json());
      const result = asRecord(envelope.result);
      if (envelope.ok !== true || result.supported !== true || !asOptionalString(asRecord(result.usage), 'status')) {
        throw new Error('Usage service returned an invalid response');
      }
      return result.usage;
    } catch (err) {
      deps.log.warn(`ai-usage-monitor: Antigravity usage check failed: ${errorMessage(err)}`);
      return { status: 'error', source: 'antigravity-plugin', message: 'Could not check Antigravity usage. Try refreshing quotas.' };
    }
  }

  async function probeHostUsage(providerIds: readonly string[]): Promise<HostUsageProbeResult | null> {
    let hostResult: HostUsageProbeResult | null = null;
    if (deps.probeSystemUsageLimits) {
      try {
        hostResult = await withTimeout(deps.probeSystemUsageLimits(), PROVIDER_RPC_TIMEOUT_MS, 'probeSystemUsageLimits');
      } catch (err) {
        deps.log.debug(`ai-usage-monitor: custom usageLimits probe failed: ${errorMessage(err)}`);
      }
    } else {
      const baseUrl = deps.getLoopbackBaseUrl?.() ?? null;
      if (baseUrl) {
        try {
          const res = await fetchFn(new URL('/api/v1/system/usage-limits', baseUrl), {
            headers: { accept: 'application/json' }, signal: AbortSignal.timeout(3500)
          });
          if (res.ok) hostResult = (await res.json()) as HostUsageProbeResult;
        } catch {
          // Host endpoint is absent on current ZCC builds; fall back to local credential probes if opted in.
        }
      }
    }
    const shouldProbeLocal = deps.isLocalCredentialProbingEnabled?.() === true && deps.homeDir !== null &&
      (!deps.probeSystemUsageLimits || deps.homeDir !== undefined);
    if (!shouldProbeLocal) return hostResult;
    const localResult = await probeLocalProviderUsage({
      homeDir: deps.homeDir ?? undefined, env: deps.env, fetch: fetchFn, now, providerIds,
      onDebug: (msg) => deps.log.debug(`ai-usage-monitor: ${msg}`)
    }).catch(() => ({}));
    return Object.keys(localResult).length === 0 ? hostResult : { ...localResult, ...(hostResult ?? {}) };
  }

  async function fetchProviderModels(providerId: string): Promise<string[]> {
    try {
      const catalog = await withTimeout(deps.providers.models({ providerId }), PROVIDER_RPC_TIMEOUT_MS, `providers.models(${providerId})`);
      const all = [...(catalog.models ?? []), ...(catalog.selectedOnlyModels ?? [])];
      const models = [...new Set(all.map((m) => m.model || m.id).filter(Boolean))];
      cachedModelsByProvider.set(providerId, models);
      return models;
    } catch (err) {
      deps.log.debug(`ai-usage-monitor: providers.models(${providerId}) failed: ${errorMessage(err)}`);
      return cachedModelsByProvider.get(providerId) ?? [];
    }
  }

  function persistProviderSnapshot(args: PersistSnapshotArgs): void {
    const hostKey = mapProviderUsageKey(args.providerId);
    const parsedHost = args.hostUsage ? parseUsageEntry(args.hostUsage[hostKey] ?? args.hostUsage[args.providerId]) : null;
    if (parsedHost) { persistHostUsageSnapshot(deps.store, args, parsedHost); return; }
    if (args.existingSnapshot && PRESERVED_CLOUD_SOURCES.has(args.existingSnapshot.source)) return;
    const observed = deps.getObservedRateLimit(args.providerId);
    if (observed) { persistObservedSnapshot(deps.store, args, observed); return; }
    persistFallbackSnapshot(deps.store, args);
  }

  async function collectAll(): Promise<DiscoveredProviderModels[]> {
    const providerList = await withTimeout(deps.providers.list(), PROVIDER_RPC_TIMEOUT_MS, 'providers.list')
      .catch((err: unknown) => { deps.log.warn(`ai-usage-monitor: providers.list failed: ${errorMessage(err)}`); return []; });
    const [hostUsage, modelsList, antigravityUsage] = await Promise.all([
      probeHostUsage(providerList.map((p) => p.id)),
      Promise.all(providerList.map((p) => fetchProviderModels(p.id))),
      providerList.some((p) => p.id === 'antigravity' && p.available) ? probeAntigravityUsage() : Promise.resolve(null)
    ]);
    const existingSnapshots = new Map(deps.store.listQuotaSnapshots().map((s) => [s.providerId, s]));
    const modeOverrides = deps.getProviderModeOverrides();
    const ts = now();
    return providerList.map((provider, idx) => {
      const displayName = provider.displayName ?? provider.id;
      const billingMode = modeOverrides.get(provider.id.toLowerCase()) ?? inferDefaultBillingMode(provider.id, '');
      persistProviderSnapshot({
        providerId: provider.id, displayName, available: provider.available, billingMode,
        hostUsage: antigravityUsage ? { ...hostUsage, antigravity: antigravityUsage } : hostUsage,
        existingSnapshot: existingSnapshots.get(provider.id), ts
      });
      return { providerId: provider.id, displayName, available: provider.available, models: modelsList[idx] ?? [] };
    });
  }

  /**
   * Refreshes one provider's models and quota snapshot. With `skipAntigravityProbe` the caller has
   * already probed Antigravity's usage:status itself, so the loopback probe is skipped and the
   * stored Antigravity snapshot is left untouched (persisting without a probe result would replace
   * its live windows with observed/fallback data). The next full sync refreshes it.
   */
  async function collectOne(
    providerId: string,
    opts: { skipAntigravityProbe?: boolean } = {}
  ): Promise<DiscoveredProviderModels | null> {
    const providerList = await withTimeout(deps.providers.list(), PROVIDER_RPC_TIMEOUT_MS, 'providers.list')
      .catch((err: unknown) => { deps.log.warn(`ai-usage-monitor: providers.list failed: ${errorMessage(err)}`); return []; });
    const provider = providerList.find((p) => p.id === providerId) ??
      providerList.find((p) => p.id.toLowerCase() === providerId.toLowerCase());
    if (!provider) return null;
    const existingSnapshot = deps.store.listQuotaSnapshots().find((s) => s.providerId === provider.id);
    const normId = provider.id.toLowerCase();
    const isAntigravity = normId === 'antigravity';
    const isCloudOnly = CLOUD_BILLING_PROVIDER_IDS.has(normId) ||
      (existingSnapshot !== undefined && PRESERVED_CLOUD_SOURCES.has(existingSnapshot.source));
    const displayName = provider.displayName ?? provider.id;
    if (isAntigravity && opts.skipAntigravityProbe === true) {
      const models = await fetchProviderModels(provider.id);
      return { providerId: provider.id, displayName, available: provider.available, models };
    }
    const [hostUsage, models, antigravityUsage] = await Promise.all([
      isAntigravity || isCloudOnly ? Promise.resolve(null) : probeHostUsage([provider.id]),
      fetchProviderModels(provider.id),
      isAntigravity && provider.available ? probeAntigravityUsage() : Promise.resolve(null)
    ]);
    const billingMode = deps.getProviderModeOverrides().get(normId) ?? inferDefaultBillingMode(provider.id, '');
    persistProviderSnapshot({
      providerId: provider.id, displayName, available: provider.available, billingMode,
      hostUsage: antigravityUsage ? { antigravity: antigravityUsage } : hostUsage, existingSnapshot, ts: now()
    });
    return { providerId: provider.id, displayName, available: provider.available, models };
  }

  return { collectAll, collectOne };
}
