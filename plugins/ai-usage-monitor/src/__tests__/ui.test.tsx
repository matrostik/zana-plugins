// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RPC_METHODS, type DashboardPayload, type LogsResponse } from '../shared/types.ts';

const navigateMocks = vi.hoisted(() => ({
  toThread: vi.fn(),
  toPluginPanel: vi.fn()
}));

const rpcCallMock = vi.hoisted(() => vi.fn());
const peerRpcMock = vi.hoisted(() => vi.fn());

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  definePluginApp: (setup: unknown) => ({ __zccPluginApp: true, setup }),
  useRpc: () => ({ call: rpcCallMock }),
  callPluginRpc: peerRpcMock,
  useRealtime: vi.fn(),
  useSettings: () => ({ values: { subscriptionProviders: 'claude-code,codex' }, isLoading: false }),
  useZccNavigate: () => navigateMocks
}));

import appPlugin from '../../app.tsx';
import { SettingsSection } from '../app/SettingsSection.tsx';
import { UsageMonitorPanel } from '../app/UsageMonitorPanel.tsx';
import { OverviewTab } from '../app/OverviewTab.tsx';

function makeDashboard(): DashboardPayload {
  return {
    kpis: {
      range: '30d',
      rangeBounds: {
        range: '30d',
        label: 'Last 30 calendar days',
        timezone: 'America/New_York',
        startMs: new Date(2026, 3, 16, 0, 0, 0).getTime(),
        endMs: null,
        startIso: new Date(2026, 3, 16, 0, 0, 0).toISOString(),
        endIso: null
      },
      totalValueUsd: 142.5,
      billedSpendUsd: 42.5,
      subscriptionEquivUsd: 100,
      cloudCreditsRemainingUsd: 37.5,
      cloudCreditsTotalLimitUsd: 50,
      totalTokens: 1_500_000,
      cachedInputTokens: 600_000,
      inputTokens: 1_200_000,
      outputTokens: 300_000,
      reasoningOutputTokens: 20_000,
      cacheHitPercent: 50,
      turnCount: 48,
      subagentTurnCount: 9,
      tightestQuota: {
        providerId: 'claude-code',
        displayName: 'Claude Code',
        windowLabel: '5h Window',
        remainingPercent: 18,
        resetsAtIso: new Date(Date.now() + 3_600_000).toISOString()
      },
      alertCount: 1,
      logCount: 3
    },
    providers: [
      {
        providerId: 'claude-code',
        displayName: 'Claude Code',
        available: true,
        source: 'zcc-host-usage',
        status: 'warning',
        accountLabel: 'dev@example.com',
        planLabel: 'Claude Max',
        billingMode: 'subscription',
        windows: [
          {
            key: '5h',
            label: '5h Window',
            usedPercent: 82,
            remainingPercent: 18,
            status: 'warning',
            resetsAtIso: new Date(Date.now() + 3_600_000).toISOString()
          }
        ],
        creditRemainingUsd: null,
        creditLimitUsd: null,
        creditUsedUsd: null,
        errorMessage: null,
        configuredModels: ['claude-sonnet-4-5', 'claude-opus-4-1'],
        totalTokens: 900_000,
        cachedTokens: 400_000,
        turnCount: 30,
        estimatedCostUsd: 100,
        billedCostUsd: null,
        updatedAtMs: Date.now()
      },
      {
        providerId: 'openrouter',
        displayName: 'OpenRouter Credits',
        available: true,
        source: 'openrouter-api',
        status: 'ok',
        accountLabel: 'Wallet',
        planLabel: 'Credits',
        billingMode: 'billed_api',
        windows: [],
        creditRemainingUsd: 37.5,
        creditLimitUsd: 50,
        creditUsedUsd: 12.5,
        errorMessage: null,
        configuredModels: ['openai/gpt-4.1'],
        totalTokens: 600_000,
        cachedTokens: 200_000,
        turnCount: 18,
        estimatedCostUsd: 42.5,
        billedCostUsd: 42.5,
        updatedAtMs: Date.now()
      }
    ],
    models: [
      {
        providerId: 'claude-code',
        model: 'claude-sonnet-4-5',
        billingMode: 'subscription',
        turnCount: 30,
        subagentTurnCount: 5,
        inputTokens: 700_000,
        cachedInputTokens: 400_000,
        outputTokens: 200_000,
        reasoningOutputTokens: 0,
        totalTokens: 900_000,
        cacheHitPercent: 57.1,
        inputRatePer1M: 3,
        cachedInputRatePer1M: 0.3,
        outputRatePer1M: 15,
        estimatedCostUsd: 100
      }
    ],
    projects: [
      {
        projectId: 'proj-1',
        projectName: 'Zana Plugins',
        turnCount: 48,
        subagentTurnCount: 9,
        inputTokens: 1_200_000,
        cachedInputTokens: 600_000,
        outputTokens: 300_000,
        totalTokens: 1_500_000,
        estimatedCostUsd: 142.5,
        billedCostUsd: 42.5,
        subscriptionEquivUsd: 100,
        topProviderId: 'claude-code',
        topModel: 'claude-sonnet-4-5'
      }
    ],
    dailyTrend: [
      {
        date: '2026-05-15',
        byProviderUsd: { 'claude-code': 100, openrouter: 42.5 },
        byProviderTokens: { 'claude-code': 900_000, openrouter: 600_000 },
        totalUsd: 142.5,
        totalTokens: 1_500_000
      }
    ],
    budgets: [
      {
        rule: {
          id: 'b-1',
          name: 'Monthly Spend Cap',
          scopeType: 'global',
          scopeId: '',
          period: 'monthly',
          metric: 'billed_usd',
          limitValue: 100,
          alertThresholdPct: 80,
          enabled: true,
          createdAtMs: Date.now()
        },
        currentValue: 42.5,
        limitValue: 100,
        remainingValue: 57.5,
        percentUsed: 42.5,
        status: 'ok',
        periodKey: 'm:2026-05',
        resetsAtMs: Date.now() + 86_400_000
      }
    ],
    pricingRules: [],
    cloudConnectors: [
      {
        provider: 'openrouter',
        configured: true,
        status: 'ok',
        lastSyncedAtMs: Date.now(),
        reportedSpendUsd: 12.5,
        creditRemainingUsd: 37.5,
        creditLimitUsd: 50,
        errorMessage: null
      },
      {
        provider: 'opencode',
        configured: true,
        status: 'ok',
        lastSyncedAtMs: Date.now(),
        reportedSpendUsd: null,
        creditRemainingUsd: null,
        creditLimitUsd: null,
        errorMessage: null,
        qualificationState: 'unqualified',
        balanceStatusMessage: 'Console prepaid balance pending endpoint qualification'
      }
    ],
    opencodeLocal: {
      installed: true,
      cliVersion: '2.0.29',
      source: 'opencode-cli-stats',
      collectedAtMs: Date.now(),
      errorMessage: null,
      periods: {
        today: {
          range: 'today',
          available: true,
          fromMs: new Date(2026, 4, 15, 0, 0, 0).getTime(),
          toMs: new Date(2026, 4, 15, 16, 0, 0).getTime(),
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
          errorMessage: null
        },
        '7d': {
          range: '7d',
          available: true,
          fromMs: new Date(2026, 4, 9, 0, 0, 0).getTime(),
          toMs: new Date(2026, 4, 15, 16, 0, 0).getTime(),
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
          errorMessage: null
        },
        all: {
          range: 'all',
          available: true,
          fromMs: new Date(2026, 2, 1, 0, 0, 0).getTime(),
          toMs: new Date(2026, 4, 15, 16, 0, 0).getTime(),
          sessions: 188,
          subagents: 27,
          prompts: 321,
          steps: 3465,
          inputTokens: 2_500_000,
          outputTokens: 450_000,
          reasoningTokens: 80_000,
          cacheReadTokens: 1_200_000,
          cacheWriteTokens: 150_000,
          totalTokens: 4_380_000,
          costUsd: 33.91,
          activeDays: 19,
          streak: 4,
          models: [
            {
              modelId: 'anthropic/claude-sonnet-4',
              providerId: 'openrouter',
              variant: null,
              steps: 840,
              inputTokens: 900_000,
              outputTokens: 150_000,
              reasoningTokens: 50_000,
              cacheReadTokens: 400_000,
              cacheWriteTokens: 60_000,
              totalTokens: 1_560_000,
              costUsd: 21.45
            }
          ],
          errorMessage: null
        }
      }
    },
    lastSyncedAtMs: Date.now()
  };
}

function makeLogs(): LogsResponse {
  return {
    totalCount: 2,
    countsByKind: { turn_usage: 1, rate_limit: 0, fallback: 0, error: 1 },
    items: [
      {
        id: 'log-1',
        timestampMs: Date.now(),
        kind: 'turn_usage',
        severity: 'info',
        providerId: 'claude-code',
        model: 'claude-sonnet-4-5',
        projectId: 'proj-1',
        projectName: 'Zana Plugins',
        threadId: 'th-100',
        summary: 'claude-sonnet-4-5 turn',
        costUsd: 0.1234,
        inputTokens: 10_000,
        cachedInputTokens: 5_000,
        outputTokens: 1_000,
        reasoningOutputTokens: 0,
        contextUsedTokens: 40_000,
        contextWindowTokens: 200_000,
        costFormula: '($0.0150 in + $0.0015 cached + $0.0150 out)',
        payload: { seq: 2 }
      },
      {
        id: 'log-2',
        timestampMs: Date.now() - 5000,
        kind: 'error',
        severity: 'error',
        providerId: 'openrouter',
        model: 'openai/gpt-4.1',
        projectId: 'proj-1',
        projectName: 'Zana Plugins',
        threadId: 'th-101',
        summary: 'HTTP 429 rate limit exceeded',
        costUsd: null,
        inputTokens: null,
        cachedInputTokens: null,
        outputTokens: null,
        reasoningOutputTokens: null,
        contextUsedTokens: null,
        contextWindowTokens: null,
        costFormula: null,
        payload: { message: 'HTTP 429' }
      }
    ]
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AI Usage Monitor UI & app slot registration', () => {
  it('shows only Gemini model chips on the Antigravity card', () => {
    const dash = makeDashboard();
    dash.providers.push({ ...dash.providers[0], providerId: 'antigravity', displayName: 'Antigravity', configuredModels: ['claude-opus-4', 'gemini-4-argon', 'google/gemini-3-flash', 'gpt-5', 'gemini-4-hydrogen'] });
    render(<OverviewTab data={dash} onJumpToTab={vi.fn()} />);
    expect(screen.getByText('gemini-4-argon')).toBeTruthy();
    expect(screen.getByText('google/gemini-3-flash')).toBeTruthy();
    expect(screen.queryByText('claude-opus-4')).toBeNull();
    expect(screen.queryByText('gpt-5')).toBeNull();
    expect(screen.queryByText('+1 more')).toBeNull();
  });
  it('shows Google and shared Antigravity quota windows without Claude or GPT windows', () => {
    const dash = makeDashboard();
    const window = dash.providers[0].windows[0];
    dash.providers.push({ ...dash.providers[0], providerId: 'antigravity', displayName: 'Antigravity', windows: [
      { ...window, key: 'general', label: 'Five Hour Limit Remaining' },
      { ...window, key: 'gemini', label: 'Gemini Models — Weekly Limit Remaining' },
      { ...window, key: 'claude', label: 'Claude — Weekly Limit Remaining' },
      { ...window, key: 'gpt', label: 'GPT Models — Weekly Limit Remaining' }
    ] });
    render(<OverviewTab data={dash} onJumpToTab={vi.fn()} />);
    expect(screen.getByText('Five Hour Limit Remaining')).toBeTruthy();
    expect(screen.getByText('Gemini Models — Weekly Limit Remaining')).toBeTruthy();
    expect(screen.queryByText('Claude — Weekly Limit Remaining')).toBeNull();
    expect(screen.queryByText('GPT Models — Weekly Limit Remaining')).toBeNull();
  });
  it('shows Antigravity quota windows returned by the provider plugin', async () => {
    const dash = makeDashboard();
    dash.providers.push({ ...dash.providers[0], providerId: 'antigravity', displayName: 'Antigravity', windows: [], status: 'error' });
    rpcCallMock.mockImplementation(async (method: string) => method === RPC_METHODS.dashboard ? dash : makeLogs());
    peerRpcMock.mockResolvedValue({ supported: true, usage: { status: 'ok', windows: [
      { label: 'Five Hour', usedPercent: 20, resetsAt: null }, { label: 'Weekly', usedPercent: 60, resetsAt: null }
    ] } });
    render(<UsageMonitorPanel pluginId="ai-usage-monitor" subPath="" />);
    expect(await screen.findByText(/20% used • 80% left/)).toBeTruthy();
    expect(screen.getByText(/60% used • 40% left/)).toBeTruthy();
    expect(peerRpcMock).toHaveBeenCalledWith('provider-antigravity', 'usage:status');
  });
  it('defaults to installed providers and exposes historical usage on request', () => {
    const dash = makeDashboard();
    dash.providers.push({ ...dash.providers[0], providerId: 'old', displayName: 'Old Provider', available: false, status: 'not_installed' });
    dash.providers.push({ ...dash.providers[0], providerId: 'unused', displayName: 'Unused Provider', available: false, status: 'not_installed', turnCount: 0, totalTokens: 0 });
    render(<OverviewTab data={dash} onJumpToTab={vi.fn()} />);

    expect(screen.queryByText('Old Provider')).toBeNull();
    expect(screen.queryByText('Unused Provider')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Historical/i }));
    expect(screen.getByText('Old Provider')).toBeTruthy();
    expect(screen.queryByText('Unused Provider')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Near Limit/i }));
    expect(screen.queryByText('Old Provider')).toBeNull();
  });

  it('orders providers by usage by default, supports Tightest Quota and Custom Reorder mode, and persists via RPC', async () => {
    const dash = makeDashboard();
    dash.providers.push({
      ...dash.providers[0],
      providerId: 'codex',
      displayName: 'Codex',
      status: 'ok',
      totalTokens: 2_000_000,
      turnCount: 60,
      windows: [{ key: '5h', label: '5h Window', usedPercent: 25, remainingPercent: 75, status: 'allowed', resetsAtIso: null }]
    });
    dash.providerOrder = { sortMode: 'usage', customOrder: [] };

    rpcCallMock.mockImplementation(async (method: string, args?: unknown) => {
      if (method === RPC_METHODS.dashboard) return dash;
      if (method === RPC_METHODS.logs) return makeLogs();
      if (method === RPC_METHODS.setProviderOrder) return args;
      return null;
    });

    const { container } = render(<UsageMonitorPanel pluginId="ai-usage-monitor" subPath="" />);
    await screen.findByText('Codex');

    const getCardOrder = () =>
      Array.from(container.querySelectorAll('[data-provider-id]')).map((el) => el.getAttribute('data-provider-id'));

    // Default "By Usage" sorts by totalTokens desc: codex (2M) > claude-code (900k) > openrouter (600k)
    expect(getCardOrder()).toEqual(['codex', 'claude-code', 'openrouter']);

    // Switch to Tightest Quota: claude-code (82%) > codex (25%) > openrouter (no windows)
    fireEvent.click(screen.getByRole('button', { name: 'Tightest Quota' }));
    await waitFor(() =>
      expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.setProviderOrder, { sortMode: 'quota', customOrder: [] })
    );
    expect(getCardOrder()).toEqual(['claude-code', 'codex', 'openrouter']);

    // Filter to Near Limit, then click Reorder: should switch filter back to All and seed customOrder
    fireEvent.click(screen.getByRole('button', { name: /Near Limit/i }));
    expect(getCardOrder()).toEqual(['claude-code']);

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    await waitFor(() =>
      expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.setProviderOrder, {
        sortMode: 'custom',
        customOrder: ['claude-code', 'codex', 'openrouter']
      })
    );
    expect(getCardOrder()).toEqual(['claude-code', 'codex', 'openrouter']);

    // Move OpenRouter earlier via button
    fireEvent.click(screen.getByRole('button', { name: 'Move OpenRouter Credits earlier' }));
    await waitFor(() =>
      expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.setProviderOrder, {
        sortMode: 'custom',
        customOrder: ['claude-code', 'openrouter', 'codex']
      })
    );
    expect(getCardOrder()).toEqual(['claude-code', 'openrouter', 'codex']);

    // Drag Codex onto Claude Code
    const codexCard = container.querySelector('[data-provider-id="codex"]')!;
    const claudeCard = container.querySelector('[data-provider-id="claude-code"]')!;
    fireEvent.dragStart(codexCard);
    fireEvent.dragOver(claudeCard);
    fireEvent.drop(claudeCard);
    expect(getCardOrder()).toEqual(['codex', 'claude-code', 'openrouter']);

    // Done exits reorder mode while keeping custom order
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('button', { name: 'Reset to Usage' })).toBeNull();
    expect(getCardOrder()).toEqual(['codex', 'claude-code', 'openrouter']);

    // Re-enter Reorder and click Reset to Usage
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Usage' }));
    await waitFor(() =>
      expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.setProviderOrder, {
        sortMode: 'usage',
        customOrder: []
      })
    );
    expect(getCardOrder()).toEqual(['codex', 'claude-code', 'openrouter']);
  });

  it('registers navPanel, settingsSection, and commandPaletteAction slots', () => {
    const slots = {
      navPanel: vi.fn(),
      settingsSection: vi.fn(),
      commandPaletteAction: vi.fn()
    };
    (appPlugin as { setup: (app: { slots: typeof slots }) => void }).setup({ slots });

    expect(slots.navPanel).toHaveBeenCalledWith(expect.objectContaining({ id: 'ai-usage-monitor', path: 'ai-usage-monitor' }));
    expect(slots.settingsSection).toHaveBeenCalledWith(expect.objectContaining({ id: 'ai-usage-monitor-settings' }));
    expect(slots.commandPaletteAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'open-ai-usage-monitor' }));

    const paletteReg = slots.commandPaletteAction.mock.calls[0][0] as { run: (ctx: { toPluginPanel: (p: string) => void }) => void };
    const toPluginPanel = vi.fn();
    paletteReg.run({ toPluginPanel });
    expect(toPluginPanel).toHaveBeenCalledWith('ai-usage-monitor');
  });

  it('renders Overview, Models & Budgets, and Logs tabs and triggers RPCs cleanly', async () => {
    const dash = makeDashboard();
    const logs = makeLogs();
    rpcCallMock.mockImplementation(async (method: string) => {
      if (method === RPC_METHODS.dashboard) return dash;
      if (method === RPC_METHODS.logs) return logs;
      if (method === RPC_METHODS.refreshNow) return { ok: true };
      if (method === RPC_METHODS.setBudget) return dash.budgets[0].rule;
      if (method === RPC_METHODS.deleteBudget) return { deleted: true };
      if (method === RPC_METHODS.setPricingOverride) return {};
      return null;
    });

    render(<UsageMonitorPanel pluginId="ai-usage-monitor" subPath="" />);

    expect(await screen.findByText('$142.50')).toBeTruthy();
    expect(screen.getByText('$37.50')).toBeTruthy();
    expect(screen.getAllByText('Claude Code').length).toBeGreaterThan(0);
    expect(screen.getByText('OpenRouter Credits')).toBeTruthy();

    // Filter provider cards to "Near Limit"
    fireEvent.click(screen.getByRole('button', { name: /Near Limit/i }));
    expect(screen.queryByText('OpenRouter Credits')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /All \(2\)/i }));

    // Refresh Quotas button triggers refreshNow RPC
    fireEvent.click(screen.getByRole('button', { name: /Refresh Quotas/i }));
    await waitFor(() => expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.refreshNow));

    // Switch to Models, Spend & Budgets tab
    fireEvent.click(screen.getByRole('tab', { name: /Models, Spend & Budgets/i }));
    expect(await screen.findByText('Monthly Spend Cap')).toBeTruthy();
    expect(screen.getByText('claude-sonnet-4-5')).toBeTruthy();

    // Switch chart unit to Tokens and ledger grouping to By Project
    fireEvent.click(screen.getByRole('button', { name: 'Tokens' }));
    fireEvent.click(screen.getByRole('button', { name: /By Project/i }));
    expect(screen.getByText('Zana Plugins')).toBeTruthy();

    // Delete budget rule
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.deleteBudget, { id: 'b-1' }));

    // Switch to Usage & Error Logs tab and inspect row + thread jump
    fireEvent.click(screen.getByRole('tab', { name: /Usage & Error Logs/i }));
    expect(await screen.findByText('HTTP 429 rate limit exceeded')).toBeTruthy();
    fireEvent.click(screen.getByText('Open Thread in Zana →'));
    expect(navigateMocks.toThread).toHaveBeenCalledWith('th-100');
  });

  it('supports Last Week calendar range, local-timezone boundary chip, OpenCode local card, and Balance Pending connector', async () => {
    const dash = makeDashboard();
    rpcCallMock.mockImplementation(async (method: string, args?: { range?: string }) => {
      if (method === RPC_METHODS.dashboard) {
        if (args?.range === 'last_week') {
          return {
            ...dash,
            kpis: {
              ...dash.kpis,
              range: 'last_week',
              rangeBounds: {
                range: 'last_week',
                label: 'Last calendar week (Mon–Sun)',
                timezone: 'America/New_York',
                startMs: new Date(2026, 4, 4, 0, 0, 0).getTime(),
                endMs: new Date(2026, 4, 11, 0, 0, 0).getTime(),
                startIso: new Date(2026, 4, 4, 0, 0, 0).toISOString(),
                endIso: new Date(2026, 4, 11, 0, 0, 0).toISOString()
              }
            }
          };
        }
        return dash;
      }
      return makeLogs();
    });

    render(<UsageMonitorPanel pluginId="ai-usage-monitor" subPath="" />);

    expect(await screen.findByText('Local OpenCode CLI Stats')).toBeTruthy();
    expect(screen.getByText('Separate Local Scope')).toBeTruthy();
    expect(screen.getByText('Balance Pending')).toBeTruthy();
    expect(screen.getByText('anthropic/claude-sonnet-4')).toBeTruthy();
    expect(screen.getByText('$33.91')).toBeTruthy();

    // Switch local OpenCode range to Today (0 sessions)
    fireEvent.click(screen.getByRole('button', { name: /Today \(--days 0\)/i }));
    expect(screen.getByText(/Zero locally does not mean zero account usage/i)).toBeTruthy();

    // Switch top-bar calendar range to Last Week
    fireEvent.click(screen.getByRole('button', { name: 'Last Week' }));
    await waitFor(() =>
      expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.dashboard, { range: 'last_week' })
    );
    expect(await screen.findByText(/America\/New_York/)).toBeTruthy();
  });

  it('renders SettingsSection sync controls, OpenCode Balance Pending, and 403 Scope Error cleanly', async () => {
    const dash = makeDashboard();
    dash.cloudConnectors.push({
      provider: 'openai',
      configured: true,
      status: 'error',
      lastSyncedAtMs: Date.now(),
      reportedSpendUsd: null,
      creditRemainingUsd: null,
      creditLimitUsd: null,
      errorMessage: 'HTTP 403: insufficient scope',
      qualificationState: 'permission_required'
    });
    rpcCallMock.mockImplementation(async (method: string) => {
      if (method === RPC_METHODS.dashboard) return dash;
      if (method === RPC_METHODS.resetSync) return { ok: true };
      return null;
    });

    render(<SettingsSection />);
    expect(await screen.findByText('AI Usage Monitor Status & Sync Controls')).toBeTruthy();
    expect(screen.getByText('Balance Pending')).toBeTruthy();
    expect(screen.queryByText(/Reported MTD: —/)).toBeNull();
    expect(screen.getByText('403 Scope Error')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Re-index All Threads' }));
    await waitFor(() => expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.resetSync));

    fireEvent.click(screen.getByRole('button', { name: 'Open Dashboard' }));
    expect(navigateMocks.toPluginPanel).toHaveBeenCalledWith('ai-usage-monitor');
  });
});
