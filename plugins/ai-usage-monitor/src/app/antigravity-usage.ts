import type { ProviderQuotaSnapshot, QuotaWindow } from '../shared/types.ts';

/** Shape returned by the provider-antigravity plugin's `usage:status` RPC. */
export interface AntigravityUsageEnvelope {
  supported?: boolean;
  refreshError?: string | null;
  usage?: {
    status?: string;
    message?: string;
    planLabel?: string | null;
    windows?: Array<{ label: string; usedPercent: number; resetsAt: string | null }>;
  };
}

const WARNING_USED_PERCENT = 75;
const BLOCKED_USED_PERCENT = 100;

export function hasValidAntigravityWindows(raw: unknown): boolean {
  const result = raw as AntigravityUsageEnvelope | null;
  return Boolean(
    result?.supported &&
    result.usage?.status === 'ok' &&
    Array.isArray(result.usage.windows) &&
    result.usage.windows.length > 0
  );
}

/** Keeps previously known windows visible when a refresh fails; otherwise marks the card as errored. */
function withProbeError(provider: ProviderQuotaSnapshot, message: string): ProviderQuotaSnapshot {
  if (provider.windows.length > 0) return { ...provider, errorMessage: message };
  return { ...provider, status: 'error', windows: [], errorMessage: message };
}

function toQuotaWindows(raw: NonNullable<NonNullable<AntigravityUsageEnvelope['usage']>['windows']>): QuotaWindow[] {
  return raw
    .filter((w) => typeof w.label === 'string' && Number.isFinite(w.usedPercent) && w.usedPercent >= 0 && w.usedPercent <= 100)
    .map((w, i) => ({
      key: `antigravity-${i}`,
      label: w.label,
      usedPercent: w.usedPercent,
      remainingPercent: Math.round((100 - w.usedPercent) * 10) / 10,
      status: w.usedPercent >= BLOCKED_USED_PERCENT ? 'blocked' : w.usedPercent >= WARNING_USED_PERCENT ? 'warning' : 'allowed',
      resetsAtIso: w.resetsAt ?? null
    }));
}

/** Overlays a direct Antigravity `usage:status` probe result onto the server-provided provider card. */
export function applyAntigravityUsage(provider: ProviderQuotaSnapshot, raw: unknown): ProviderQuotaSnapshot {
  const result = raw as AntigravityUsageEnvelope | null;
  const usage = result?.usage;
  if (usage?.status === 'unauthenticated' || usage?.status === 'not_installed') {
    return { ...provider, status: usage.status, windows: [], errorMessage: usage.message ?? null };
  }
  if (!result?.supported || usage?.status !== 'ok' || !Array.isArray(usage.windows)) {
    return withProbeError(provider, usage?.message ?? 'Could not check Antigravity usage.');
  }
  const windows = toQuotaWindows(usage.windows);
  if (!windows.length) return withProbeError(provider, 'Antigravity returned no quota windows.');
  return {
    ...provider,
    status: windows.some((w) => w.status === 'blocked') ? 'blocked' : windows.some((w) => w.status === 'warning') ? 'warning' : 'ok',
    source: 'native-acp-/usage',
    planLabel: usage.planLabel ?? provider.planLabel,
    errorMessage: result.refreshError ?? null,
    windows
  };
}
