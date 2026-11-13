export function formatUsd(amount: number | null | undefined, digits = 2): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  return `$${amount.toFixed(digits)}`;
}

export function formatTokens(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined || !Number.isFinite(tokens)) return '0';
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(2)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(Math.round(tokens));
}

export function formatRelativeTime(timestampMs: number | null | undefined, nowMs: number = Date.now()): string {
  if (!timestampMs) return 'never';
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function formatCountdown(isoOrMs: string | number | null | undefined, nowMs: number = Date.now()): string {
  if (!isoOrMs) return 'No reset time reported';
  const targetMs = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs);
  if (!Number.isFinite(targetMs)) return String(isoOrMs);
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return 'Resetting shortly';
  const mins = Math.floor(diffMs / 60_000);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    return `Resets in ${days}d ${hrs % 24}h`;
  }
  if (hrs > 0) return `Resets in ${hrs}h ${remMins}m`;
  return `Resets in ${Math.max(1, remMins)}m`;
}

export function providerBadgeCode(providerId: string): string {
  const clean = providerId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (providerId.toLowerCase().includes('claude')) return 'CC';
  if (providerId.toLowerCase().includes('codex') || providerId.toLowerCase().includes('openai')) return 'OX';
  if (providerId.toLowerCase().includes('cursor')) return 'CU';
  if (providerId.toLowerCase().includes('antigravity') || providerId.toLowerCase().includes('gemini')) return 'AG';
  if (providerId.toLowerCase().includes('openrouter') || providerId.toLowerCase().includes('opencode')) return 'OR';
  return (clean.slice(0, 2) || 'AI').padEnd(2, '·');
}

const PROVIDER_COLOR_MAP: Record<string, string> = {
  'claude-code': '#6366f1',
  'anthropic-api': '#6366f1',
  codex: '#10b981',
  'openai-api': '#10b981',
  cursor: '#06b6d4',
  antigravity: '#8b5cf6',
  openrouter: '#f59e0b',
  opencode: '#f59e0b',
  local: '#64748b'
};

export function providerColor(providerId: string): string {
  const key = providerId.toLowerCase();
  if (PROVIDER_COLOR_MAP[key]) return PROVIDER_COLOR_MAP[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const palette = ['#6366f1', '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899'];
  return palette[Math.abs(hash) % palette.length];
}
