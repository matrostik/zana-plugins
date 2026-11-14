// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COMPARISON_RPC,
  type ComparisonModel,
  type ComparisonSnapshotState
} from '../shared/comparison.ts';
import { RPC_METHODS } from '../shared/types.ts';

const rpcCallMock = vi.hoisted(() => vi.fn());
const realtimeRef = vi.hoisted(() => ({ current: null as ((payload: unknown) => void) | null }));

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  definePluginApp: (setup: unknown) => ({ __zccPluginApp: true, setup }),
  useRpc: () => ({ call: rpcCallMock }),
  callPluginRpc: vi.fn(),
  useRealtime: (_channel: string, handler: (payload: unknown) => void) => {
    realtimeRef.current = handler;
  },
  useSettings: () => ({ values: {}, isLoading: false }),
  useZccNavigate: () => ({ toThread: vi.fn(), toPluginPanel: vi.fn() })
}));

import { ModelComparisonTab } from '../app/ModelComparisonTab.tsx';
import { UsageMonitorPanel } from '../app/UsageMonitorPanel.tsx';

function makeModels(): ComparisonModel[] {
  return [
    {
      id: 'm-1',
      name: 'Flagship Alpha',
      slug: 'flagship-alpha',
      creatorId: 'c-1',
      creatorName: 'Anthropic',
      releaseDate: '2026-03-01',
      intelligenceIndex: 55,
      codingIndex: null,
      agenticIndex: null,
      inputPricePer1M: 3,
      outputPricePer1M: 15,
      outputTokensPerSecond: 82,
      timeToFirstTokenSeconds: 1.8
    },
    {
      id: 'm-2',
      name: 'Fast Flash',
      slug: 'fast-flash',
      creatorId: 'c-2',
      creatorName: 'Google',
      releaseDate: '2026-04-01',
      intelligenceIndex: 38,
      codingIndex: null,
      agenticIndex: null,
      inputPricePer1M: 0.075,
      outputPricePer1M: 2.5,
      outputTokensPerSecond: 210,
      timeToFirstTokenSeconds: 0.5
    },
    {
      id: 'm-3',
      name: 'Open Weights',
      slug: 'open-weights',
      creatorId: 'c-3',
      creatorName: 'Example Lab',
      releaseDate: null,
      intelligenceIndex: null,
      codingIndex: null,
      agenticIndex: null,
      inputPricePer1M: null,
      outputPricePer1M: null,
      outputTokensPerSecond: null,
      timeToFirstTokenSeconds: null
    }
  ];
}

function makeState(overrides: Partial<ComparisonSnapshotState> = {}): ComparisonSnapshotState {
  return {
    configured: true,
    encryptionAvailable: true,
    snapshot: {
      schemaVersion: 1,
      fetchedAtMs: Date.now() - 60_000,
      intelligenceIndexVersion: 5,
      tier: 'free',
      models: makeModels()
    },
    stale: false,
    refreshing: false,
    retryAtMs: null,
    authInvalid: false,
    lastError: null,
    ...overrides
  };
}

afterEach(() => {
  cleanup();
  realtimeRef.current = null;
  vi.clearAllMocks();
});

describe('Model Comparison tab UI', () => {
  it('opens directly from subPath="comparison" without waiting for usage dashboard telemetry', async () => {
    const state = makeState();
    rpcCallMock.mockImplementation(async (method: string) => {
      if (method === COMPARISON_RPC.getData) return state;
      if (method === RPC_METHODS.dashboard) return new Promise(() => undefined);
      return { items: [], totalCount: 0, countsByKind: { turn_usage: 0, rate_limit: 0, fallback: 0, error: 0 } };
    });

    render(<UsageMonitorPanel pluginId="ai-usage-monitor" subPath="comparison" />);
    expect(screen.getByRole('tab', { name: 'Model Comparison' }).getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByText('Flagship Alpha')).toBeTruthy();
    expect(screen.getByText('Intelligence Index v5', { exact: false })).toBeTruthy();
  });

  it('shows setup notice without table or key input when no key is configured', async () => {
    rpcCallMock.mockResolvedValue(
      makeState({ configured: false, snapshot: null })
    );

    render(<ModelComparisonTab />);
    expect(await screen.findByText(/Add your Artificial Analysis API key in Zana Settings/i)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByPlaceholderText(/key/i)).toBeNull();
    expect((screen.getByRole('button', { name: /Refresh models/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('filters by search, creator, separate max input/output price caps (excluding nulls), and sorts with nulls last', async () => {
    const state = makeState();
    rpcCallMock.mockResolvedValue(state);

    render(<ModelComparisonTab />);
    await screen.findByText('Flagship Alpha');

    const getBodyNames = () =>
      within(screen.getByRole('table'))
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.querySelector('td strong, td div')?.textContent ?? '');

    // Default sort: Intelligence desc -> Flagship Alpha (55), Fast Flash (38), Open Weights (n/a)
    expect(getBodyNames()).toEqual(['Flagship Alpha', 'Fast Flash', 'Open Weights']);
    expect(screen.getAllByText('n/a').length).toBeGreaterThan(0);
    expect(screen.getByText('$0.075')).toBeTruthy();
    expect(screen.getByText('Showing 3 of 3 models')).toBeTruthy();

    // Sort by Input $ / 1M asc -> Fast Flash ($0.075), Flagship Alpha ($3.00), Open Weights (n/a)
    fireEvent.click(screen.getByRole('button', { name: /Input \$ \/ 1M/i }));
    expect(getBodyNames()).toEqual(['Fast Flash', 'Flagship Alpha', 'Open Weights']);

    // Toggle Input $ / 1M desc -> Flagship Alpha, Fast Flash, Open Weights (still last!)
    fireEvent.click(screen.getByRole('button', { name: /Input \$ \/ 1M/i }));
    expect(getBodyNames()).toEqual(['Flagship Alpha', 'Fast Flash', 'Open Weights']);

    // Max output price cap excludes null and Flagship Alpha ($15)
    fireEvent.change(screen.getByLabelText(/Max output/i), { target: { value: '5' } });
    expect(getBodyNames()).toEqual(['Fast Flash']);
    expect(screen.getByText('Showing 1 of 3 models')).toBeTruthy();

    // Clear filters restores all 3 models
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Showing 3 of 3 models')).toBeTruthy();

    // Search + creator filter
    fireEvent.change(screen.getByLabelText(/Creator/i), { target: { value: 'Anthropic' } });
    expect(getBodyNames()).toEqual(['Flagship Alpha']);
    fireEvent.change(screen.getByLabelText(/Creator/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: 'nonexistent-model' } });
    expect(screen.getByText('No models match these filters.')).toBeTruthy();
  });

  it('retains cached rows during error/cooldown banners and runs manual refresh & realtime reload', async () => {
    const initial = makeState({
      stale: true,
      retryAtMs: Date.now() + 300_000,
      lastError: 'Artificial Analysis rate limit reached. Wait until the displayed retry time.'
    });
    const refreshed = makeState({
      stale: false,
      retryAtMs: null,
      lastError: null
    });

    rpcCallMock
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(refreshed);

    render(<ModelComparisonTab />);
    expect(await screen.findByText(/rate limit reached/i)).toBeTruthy();
    expect(screen.getByText(/Showing the last saved snapshot/i)).toBeTruthy();
    expect(screen.getByText('Flagship Alpha')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Refresh models/i }) as HTMLButtonElement).disabled).toBe(true);

    // Realtime comparisonUpdated reloads without cooldown error
    realtimeRef.current?.({ comparisonUpdated: true });
    await waitFor(() => expect(rpcCallMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect((screen.getByRole('button', { name: /Refresh models/i }) as HTMLButtonElement).disabled).toBe(false)
    );

    rpcCallMock.mockResolvedValueOnce(refreshed);
    fireEvent.click(screen.getByRole('button', { name: /Refresh models/i }));
    await waitFor(() => expect(rpcCallMock).toHaveBeenCalledWith(COMPARISON_RPC.refresh));
  });
});
