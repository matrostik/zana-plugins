export interface NativeQuotaWindow {
  label: string;
  usedPercent: number;
  resetsAt: string | null;
}

export interface NativeUsageResult {
  supported: true;
  usage: {
    status: 'ok' | 'error' | 'unauthenticated' | 'not_installed';
    planLabel: string | null;
    accountEmail: null;
    windows: NativeQuotaWindow[];
    checkedAt: number;
    source: 'native-acp-/usage';
    message?: string;
  };
}

/** Parse the native command's quota section; session token totals are not subscription balances. */
export function parseNativeQuotaWindows(text: string): NativeQuotaWindow[] {
  const windows: NativeQuotaWindow[] = [];
  let inQuotas = false;
  let group = '';
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('### ')) {
      inQuotas = line.trim() === '### Quota Limits';
      continue;
    }
    if (!inQuotas) continue;
    const heading = /^- \*\*([^*]+)\*\*$/.exec(line);
    if (heading) { group = heading[1]; continue; }
    const match = /^\s+- \*\*([^*]+):\*\* (\d+(?:\.\d+)?)% remaining \(resets ([^)]+)\)\s*$/.exec(line);
    if (!group || !match) continue;
    const remaining = Number(match[2]);
    if (remaining < 0 || remaining > 100) continue;
    const resetTime = Date.parse(match[3]);
    windows.push({ label: `${group} — ${match[1]}`, usedPercent: 100 - remaining,
      resetsAt: Number.isFinite(resetTime) ? new Date(resetTime).toISOString() : null });
  }
  return windows;
}
