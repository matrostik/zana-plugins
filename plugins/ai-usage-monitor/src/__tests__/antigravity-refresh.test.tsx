// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RPC_METHODS, type DashboardPayload, type LogsResponse } from '../shared/types.ts';

const rpcCallMock = vi.hoisted(() => vi.fn());
const peerRpcMock = vi.hoisted(() => vi.fn());

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  definePluginApp: (setup: unknown) => ({ __zccPluginApp: true, setup }),
  useRpc: () => ({ call: rpcCallMock }),
  callPluginRpc: peerRpcMock,
  useRealtime: vi.fn(),
  useSettings: () => ({ values: { subscriptionProviders: 'claude-code,codex,antigravity' }, isLoading: false }),
  useZccNavigate: () => ({ toThread: vi.fn(), toPluginPanel: vi.fn() })
}));

import { UsageMonitorPanel } from '../app/UsageMonitorPanel.tsx';

function makeDashboardWithAntigravity(overrides: Partial<DashboardPayload['providers'][number]> = {}): DashboardPayload {
  return {
    kpis: {
      range: '30d',
      rangeBounds: {
        range: '30d',
        label: 'Last 30 calendar days',
        timezone: 'UTC',
        startMs: Date.UTC(2026, 4, 1),
        endMs: null,
        startIso: '2026-05-01T00:00:00.000Z',
        endIso: null
      },
      totalValueUsd: 0,
      billedSpendUsd: 0,
      subscriptionEquivUsd: 0,
      cloudCreditsRemainingUsd: null,
      cloudCreditsTotalLimitUsd: null,
      totalTokens: 0,
      cachedInputTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningOutputTokens: 0,
      cacheHitPercent: 0,
      turnCount: 0,
      subagentTurnCount: 0,
      tightestQuota: null,
      alertCount: 0,
      logCount: 0
    },
    providers: [
      {
        providerId: 'antigravity',
        displayName: 'Antigravity',
        available: true,
        source: 'native-acp-/usage',
        status: 'ok',
        accountLabel: null,
        planLabel: 'Google AI Pro',
        billingMode: 'subscription',
        windows: [
          {
            key: 'win_0',
            label: 'Gemini Models — Five Hour Limit Remaining',
            usedPercent: 25,
            remainingPercent: 75,
            status: 'allowed',
            resetsAtIso: null
          }
        ],
        creditRemainingUsd: null,
        creditLimitUsd: null,
        creditUsedUsd: null,
        errorMessage: null,
        configuredModels: ['gemini-3-flash'],
        totalTokens: 0,
        cachedTokens: 0,
        turnCount: 0,
        estimatedCostUsd: 0,
        billedCostUsd: null,
        updatedAtMs: Date.now(),
        ...overrides
      }
    ],
    models: [],
    projects: [],
    dailyTrend: [],
    budgets: [],
    pricingRules: [],
    cloudConnectors: [],
    opencodeLocal: null,
    lastSyncedAtMs: Date.now()
  };
}

function makeMultiProviderDashboard(isSyncing = false): DashboardPayload {
  const base = makeDashboardWithAntigravity();
  return {
    ...base,
    isSyncing,
    providers: [
      {
        providerId: 'claude-code',
        displayName: 'Claude Code',
        available: true,
        source: 'zcc-host-usage',
        status: 'ok',
        accountLabel: 'dev@example.com',
        planLabel: 'Claude Max',
        billingMode: 'subscription',
        windows: [
          {
            key: '5h',
            label: 'Claude 5h Window',
            usedPercent: 30,
            remainingPercent: 70,
            status: 'allowed',
            resetsAtIso: null
          }
        ],
        creditRemainingUsd: null,
        creditLimitUsd: null,
        creditUsedUsd: null,
        errorMessage: null,
        configuredModels: ['claude-sonnet-4-5'],
        totalTokens: 500_000,
        cachedTokens: 100_000,
        turnCount: 10,
        estimatedCostUsd: 25,
        billedCostUsd: null,
        updatedAtMs: Date.now()
      },
      {
        providerId: 'codex',
        displayName: 'Codex',
        available: true,
        source: 'zcc-host-usage',
        status: 'ok',
        accountLabel: 'dev@example.com',
        planLabel: 'ChatGPT Pro',
        billingMode: 'subscription',
        windows: [
          {
            key: '5h',
            label: 'Codex 5h Window',
            usedPercent: 15,
            remainingPercent: 85,
            status: 'allowed',
            resetsAtIso: null
          }
        ],
        creditRemainingUsd: null,
        creditLimitUsd: null,
        creditUsedUsd: null,
        errorMessage: null,
        configuredModels: ['gpt-5-codex'],
        totalTokens: 300_000,
        cachedTokens: 50_000,
        turnCount: 6,
        estimatedCostUsd: 12,
        billedCostUsd: null,
        updatedAtMs: Date.now()
      },
      {
        providerId: 'openrouter',
        displayName: 'OpenRouter Credits',
        available: true,
        source: 'openrouter-api',
        status: 'ok',
        accountLabel: 'Prepaid Wallet',
        planLabel: 'Credits',
        billingMode: 'billed_api',
        windows: [],
        creditRemainingUsd: 40,
        creditLimitUsd: 50,
        creditUsedUsd: 10,
        errorMessage: null,
        configuredModels: ['openai/gpt-4.1'],
        totalTokens: 200_000,
        cachedTokens: 0,
        turnCount: 4,
        estimatedCostUsd: 10,
        billedCostUsd: 10,
        updatedAtMs: Date.now()
      },
      ...base.providers
    ],
    cloudConnectors: [
      {
        provider: 'openrouter',
        configured: true,
        status: 'ok',
        lastSyncedAtMs: Date.now(),
        reportedSpendUsd: 10,
        creditRemainingUsd: 40,
        creditLimitUsd: 50,
        errorMessage: null
      }
    ]
  };
}

function makeEmptyLogs(): LogsResponse {
  return {
    items: [],
    totalCount: 0,
    countsByKind: { turn_usage: 0, rate_limit: 0, fallback: 0, error: 0 }
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Quota & provider refresh behavior', () => {
  it('keeps previous quota windows visible with a spinning reload badge while refreshing and updates when resolved', async () => {
    const dash = makeDashboardWithAntigravity();
    let resolveProbe!: (value: unknown) => void;
    peerRpcMock.mockImplementation(() => new Promise((resolve) => { resolveProbe = resolve; }));
    rpcCallMock.mockImplementation(async (method: string) => {
      if (method === RPC_METHODS.dashboard) return dash;
      if (method === RPC_METHODS.logs) return makeEmptyLogs();
      if (method === RPC_METHODS.refreshNow) return { ok: true };
      return null;
    });

    const { container } = render(<UsageMonitorPanel pluginId="ai-usage-monitor" subPath="" />);

    // Previous data stays visible while initial background refresh is in flight
    expect(await screen.findByText(/25% used • 75% left/)).toBeTruthy();
    const badge = await screen.findByRole('status', { name: 'Refreshing Antigravity quota' });
    expect(badge.querySelector('.aum-spinner')).toBeTruthy();

    // Resolve first probe with updated values -> spinner disappears and card updates
    resolveProbe({
      supported: true,
      usage: {
        status: 'ok',
        windows: [{ label: 'Gemini Models — Five Hour Limit Remaining', usedPercent: 40, resetsAt: null }]
      }
    });
    expect(await screen.findByText(/40% used • 60% left/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Refreshing Antigravity quota' })).toBeNull();
    });

    // Trigger Refresh Quotas where the next probe fails transiently -> previous 40%/60% data remains visible
    peerRpcMock.mockImplementationOnce(() => new Promise((resolve) => { resolveProbe = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: /Refresh Quotas/i }));
    await waitFor(() => {
      expect(peerRpcMock).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('status', { name: 'Refreshing Antigravity quota' })).toBeTruthy();
    });
    expect(screen.getByText(/40% used • 60% left/)).toBeTruthy();

    resolveProbe({
      supported: true,
      usage: { status: 'error', message: 'Temporary ACP timeout' }
    });
    expect(await screen.findByText('Temporary ACP timeout')).toBeTruthy();
    expect(screen.getByText(/40% used • 60% left/)).toBeTruthy();
    expect(container.querySelector('.aum-spinner')).toBeNull();
  });

  it('shows spinning refresh visual indicators on all active providers during Refresh Quotas and background sync', async () => {
    let currentDash = makeMultiProviderDashboard(true);
    let resolveRefresh!: () => void;

    peerRpcMock.mockResolvedValue({
      supported: true,
      usage: {
        status: 'ok',
        windows: [{ label: 'Gemini Models — Five Hour Limit Remaining', usedPercent: 25, resetsAt: null }]
      }
    });

    rpcCallMock.mockImplementation(async (method: string) => {
      if (method === RPC_METHODS.dashboard) return currentDash;
      if (method === RPC_METHODS.logs) return makeEmptyLogs();
      if (method === RPC_METHODS.refreshNow) {
        return new Promise((resolve) => {
          resolveRefresh = () => resolve({ ok: true });
        });
      }
      return null;
    });

    const { container } = render(<UsageMonitorPanel pluginId="ai-usage-monitor" subPath="" />);

    // During initial background sync (isSyncing: true), ALL active providers + connectors show spinning indicators
    expect(await screen.findByText('Syncing telemetry...')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Refreshing Claude Code quota' })).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Refreshing Codex quota' })).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Refreshing OpenRouter Credits quota' })).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Refreshing Antigravity quota' })).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Refreshing cloud billing connectors' })).toBeTruthy();
    expect(screen.getByText(/30% used • 70% left/)).toBeTruthy();
    expect(screen.getByText(/15% used • 85% left/)).toBeTruthy();

    // When idle, none of the refresh badges remain visible
    currentDash = makeMultiProviderDashboard(false);
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Refreshing Claude Code quota' })).toBeNull();
      expect(screen.queryByRole('status', { name: 'Refreshing Codex quota' })).toBeNull();
      expect(screen.queryByRole('status', { name: 'Refreshing OpenRouter Credits quota' })).toBeNull();
      expect(screen.queryByRole('status', { name: 'Refreshing Antigravity quota' })).toBeNull();
    });

    // Clicking Refresh Quotas immediately shows spinning indicators on ALL active providers while preserving previous data
    fireEvent.click(screen.getByRole('button', { name: /Refresh Quotas/i }));
    await waitFor(() => {
      expect(screen.getByRole('status', { name: 'Refreshing Claude Code quota' })).toBeTruthy();
      expect(screen.getByRole('status', { name: 'Refreshing Codex quota' })).toBeTruthy();
      expect(screen.getByRole('status', { name: 'Refreshing OpenRouter Credits quota' })).toBeTruthy();
      expect(screen.getByRole('status', { name: 'Refreshing Antigravity quota' })).toBeTruthy();
      expect(screen.getByRole('status', { name: 'Refreshing cloud billing connectors' })).toBeTruthy();
    });
    expect(screen.getByText(/30% used • 70% left/)).toBeTruthy();
    expect(screen.getByText(/15% used • 85% left/)).toBeTruthy();
    expect(container.querySelectorAll('.aum-spinner').length).toBeGreaterThanOrEqual(5);

    // Resolve Refresh Quotas with updated data -> spinners clear and updated quota renders
    currentDash = {
      ...makeMultiProviderDashboard(false),
      providers: makeMultiProviderDashboard(false).providers.map((p) =>
        p.providerId === 'claude-code'
          ? {
              ...p,
              windows: [
                {
                  key: '5h',
                  label: 'Claude 5h Window',
                  usedPercent: 45,
                  remainingPercent: 55,
                  status: 'allowed',
                  resetsAtIso: null
                }
              ]
            }
          : p
      )
    };
    resolveRefresh();
    expect(await screen.findByText(/45% used • 55% left/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Refreshing Claude Code quota' })).toBeNull();
      expect(screen.queryByRole('status', { name: 'Refreshing Codex quota' })).toBeNull();
      expect(screen.queryByRole('status', { name: 'Refreshing OpenRouter Credits quota' })).toBeNull();
      expect(screen.queryByRole('status', { name: 'Refreshing Antigravity quota' })).toBeNull();
      expect(container.querySelector('.aum-spinner')).toBeNull();
    });
  });

  it('allows refreshing a single selected provider card independently without spinning other providers', async () => {
    let currentDash = makeMultiProviderDashboard(false);
    let resolveProviderRefresh!: () => void;

    peerRpcMock.mockResolvedValue({
      supported: true,
      usage: {
        status: 'ok',
        windows: [{ label: 'Gemini Models — Five Hour Limit Remaining', usedPercent: 25, resetsAt: null }]
      }
    });

    rpcCallMock.mockImplementation(async (method: string) => {
      if (method === RPC_METHODS.dashboard) return currentDash;
      if (method === RPC_METHODS.logs) return makeEmptyLogs();
      if (method === RPC_METHODS.refreshProvider) {
        return new Promise((resolve) => {
          resolveProviderRefresh = () => resolve({ ok: true });
        });
      }
      return null;
    });

    render(<UsageMonitorPanel pluginId="ai-usage-monitor" subPath="" />);

    const codexRefreshBtn = await screen.findByRole('button', { name: 'Refresh Codex' });
    expect(screen.getByRole('button', { name: 'Refresh Claude Code' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh OpenRouter Credits' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Refresh Antigravity' })).toBeTruthy();
    });

    // Click Refresh Codex -> ONLY Codex spins; others stay idle
    fireEvent.click(codexRefreshBtn);
    await waitFor(() => {
      expect(rpcCallMock).toHaveBeenCalledWith(RPC_METHODS.refreshProvider, { providerId: 'codex' });
      expect(screen.getByRole('status', { name: 'Refreshing Codex quota' })).toBeTruthy();
    });
    expect(screen.queryByRole('status', { name: 'Refreshing Claude Code quota' })).toBeNull();
    expect(screen.queryByRole('status', { name: 'Refreshing OpenRouter Credits quota' })).toBeNull();
    expect(screen.queryByRole('status', { name: 'Refreshing Antigravity quota' })).toBeNull();
    expect(screen.getByText(/15% used • 85% left/)).toBeTruthy();

    // Resolve Codex refresh -> spinner clears and updated Codex quota appears
    currentDash = {
      ...makeMultiProviderDashboard(false),
      providers: makeMultiProviderDashboard(false).providers.map((p) =>
        p.providerId === 'codex'
          ? {
              ...p,
              windows: [
                {
                  key: '5h',
                  label: 'Codex 5h Window',
                  usedPercent: 48,
                  remainingPercent: 52,
                  status: 'allowed',
                  resetsAtIso: null
                }
              ]
            }
          : p
      )
    };
    resolveProviderRefresh();

    expect(await screen.findByText(/48% used • 52% left/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Refreshing Codex quota' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Refresh Codex' })).toBeTruthy();
    });
  });
});
