import { describe, expect, it } from 'vitest';
import './test-environment.js';
import { parseNativeQuotaWindows } from './native-usage.js';

describe('native quota windows', () => {
  it('reads remaining percentages and reset times separately for each quota pool', () => {
    const windows = parseNativeQuotaWindows('### Session Usage\n- **Session total:** 200 tokens\n\n### Quota Limits\n- **Gemini Models**\n  - **Weekly Limit Remaining:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)\n  - **Five Hour Limit Remaining:** 99% remaining (resets Oct 30, 2026, 11:03 UTC)\n- **Gemini 4 Argon**\n  - **Gemini 4 Argon Weekly Limit:** 1% remaining (resets Oct 31, 2026, 14:19 UTC)');
    expect(windows).toEqual([
      { label: 'Gemini Models — Weekly Limit Remaining', usedPercent: 86, resetsAt: '2026-10-31T06:11:00.000Z' },
      { label: 'Gemini Models — Five Hour Limit Remaining', usedPercent: 1, resetsAt: '2026-10-30T11:03:00.000Z' },
      { label: 'Gemini 4 Argon — Gemini 4 Argon Weekly Limit', usedPercent: 99, resetsAt: '2026-10-31T14:19:00.000Z' }
    ]);
  });

  it('does not invent balances from session tokens, malformed quotas or percentages outside the valid range', () => {
    expect(parseNativeQuotaWindows('### Session Usage\n- **Tokens:** 100% remaining (resets Oct 31, 2026, 06:11 UTC)')).toEqual([]);
    expect(parseNativeQuotaWindows('### Quota Limits\n- **Gemini**\n  - **Weekly:** 101% remaining (resets nonsense)')).toEqual([]);
    expect(parseNativeQuotaWindows('### Quota Limits\n- **Gemini**\n  - **Weekly:** 25% remaining (resets unknown)'))
      .toEqual([{ label: 'Gemini — Weekly', usedPercent: 75, resetsAt: null }]);
  });
});
