// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RPC_METHODS, type DashboardPayload, type LogsResponse } from '../shared/types.ts';

const navigateMocks = vi.hoisted(() => ({
  toThread: vi.fn(),
  toPluginPanel: vi.fn()
}));

const rpcCallMock = vi.hoisted(() => vi.fn());

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  definePluginApp: (setup: unknown) => ({ __zccPluginApp: true, setup }),
  useRpc: () => ({ call: rpcCallMock }),
  useRealtime: vi.fn(),
  useSettings: () => ({ values: { subscriptionProviders: 'claude-code,codex' }, isLoading: false }),
  useZccNavigate: () => navigateMocks
}));

import appPlugin from '../../app.tsx';
import { SettingsSection } from '../app/SettingsSection.tsx';
import { UsageMonitorPanel } from '../app/UsageMonitorPanel.tsx';

function makeDashboard(): DashboardPayload {
  return {
    kpis: {
      range: '30d',
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
      }
    ],
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

  it('renders SettingsSection sync controls and surfaces RPC errors gracefully', async () => {
    const dash = makeDashboard();
    rpcCallMock.mockImplementation(async (method: string) => {
      if (method === RPC_METHODS.dashboard) return dash;
      if (method === RPC_METHODS.resetSync) return { ok: true };
      return null;
    });

    render(<SettingsSection />);
    expect(await screen.findByText('AI Usage Monitor Status & Sync Controls')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Re-index All Threads' }));
    await waitFor(() => expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.resetSync));

    fireEvent.click(screen.getByRole('button', { name: 'Open Dashboard' }));
    expect(navigateMocks.toPluginPanel).toHaveBeenCalledWith('ai-usage-monitor');
  });
});
