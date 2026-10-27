// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodenodPanel } from '../app/CodenodPanel.tsx';
import type { Overview } from '../app/types.ts';
import { detail } from './pr-fixtures.ts';

const sdk = vi.hoisted(() => {
  const call = vi.fn();
  return { call, rpc: { call } };
});

vi.mock('@zana-ai/zcc-plugin-sdk/app', async (importActual) => ({
  ...(await importActual<Record<string, unknown>>()),
  useRpc: () => sdk.rpc
}));

vi.mock('../app/SettingsView.tsx', () => ({ SettingsView: () => <p>Settings stub</p> }));

const PR = detail('completed').pr;

function overview(overrides: Partial<Overview> = {}): Overview {
  return {
    prs: [{ ...PR, review: null }],
    hosts: [{ host: 'github.com', authSource: null, login: 'dev', error: null, pullRequestCount: 1, syncedAt: 1 }],
    syncing: false,
    lastSyncAt: Date.now(),
    activeReviews: 0,
    hasModels: true,
    hasWatchedRepos: true,
    ...overrides
  };
}

function answer(responses: Record<string, unknown>) {
  sdk.call.mockImplementation(async (method: string) => {
    const response = responses[method];
    if (response instanceof Error) throw response;
    return response;
  });
}

beforeEach(() => {
  sdk.call.mockReset();
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
    clear: () => stored.clear()
  });
  localStorage.clear();
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('CodenodPanel', () => {
  it('syncs when the app regains focus and throttles repeated focus events', async () => {
    answer({ overview: overview(), config: { models: [] }, refresh: null });
    render(<CodenodPanel pluginId="codenod" />);
    await screen.findByText('Select a pull request to see its review.');
    fireEvent.focus(window);
    await waitFor(() => expect(sdk.call).toHaveBeenCalledWith('refresh'));
    fireEvent.focus(window);
    expect(sdk.call.mock.calls.filter(([method]) => method === 'refresh')).toHaveLength(1);
  });

  it('shows sync status, running reviews, and host problems', async () => {
    answer({
      overview: overview({ activeReviews: 2, hosts: [{ host: 'ghe.acme.com', authSource: null, login: null, error: 'bad token', pullRequestCount: 0, syncedAt: null }] }),
      config: { models: [] }
    });
    render(<CodenodPanel pluginId="codenod" />);
    expect(await screen.findByText('2 reviews running')).toBeTruthy();
    expect(screen.getByText('Synced just now')).toBeTruthy();
    expect(screen.getByText('ghe.acme.com: bad token')).toBeTruthy();
  });

  it('prompts for models before anything is selected', async () => {
    answer({ overview: overview({ hasModels: false, activeReviews: 1 }), config: { models: [] } });
    render(<CodenodPanel pluginId="codenod" />);
    expect(await screen.findByText('Start by choosing review models in Settings.')).toBeTruthy();
    expect(screen.getByText('1 review running')).toBeTruthy();
  });

  it('opens a pull request review when one is selected', async () => {
    answer({ overview: overview(), config: { models: [{ providerId: 'cursor', model: 'a' }] }, detail: detail('completed') });
    render(<CodenodPanel pluginId="codenod" />);
    expect(await screen.findByText('Select a pull request to see its review.')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Add login/ }));
    expect(await screen.findByText('Looks fine')).toBeTruthy();
  });

  it('refreshes and reports refresh failures', async () => {
    answer({ overview: overview(), config: { models: [] }, refresh: null });
    render(<CodenodPanel pluginId="codenod" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(sdk.call.mock.calls.filter(([method]) => method === 'overview')).toHaveLength(2));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Refresh' }) as HTMLButtonElement).disabled).toBe(false));

    answer({ overview: overview(), config: { models: [] }, refresh: new Error('rate limited') });
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('rate limited')).toBeTruthy();
  });

  it('shows Syncing while the server is syncing', async () => {
    answer({ overview: overview({ syncing: true }), config: { models: [] } });
    render(<CodenodPanel pluginId="codenod" />);
    expect(((await screen.findByRole('button', { name: 'Syncing…' })) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the overview load error', async () => {
    answer({ overview: new Error('server offline'), config: new Error('ignored') });
    render(<CodenodPanel pluginId="codenod" />);
    expect(await screen.findByText('server offline')).toBeTruthy();
  });

  it('toggles between the inbox and settings', async () => {
    answer({ overview: overview(), config: { models: [] } });
    render(<CodenodPanel pluginId="codenod" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
    expect(screen.getByText('Settings stub')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to pull requests' }));
    expect(screen.queryByText('Settings stub')).toBeNull();
  });

  it('remembers the chosen tab across visits', async () => {
    answer({ overview: overview(), config: { models: [] } });
    const { unmount } = render(<CodenodPanel pluginId="codenod" />);
    fireEvent.click(await screen.findByRole('tab', { name: /Mine/ }));
    expect(localStorage.getItem('codenod.tab')).toBe('mine');
    unmount();
    render(<CodenodPanel pluginId="codenod" />);
    expect((await screen.findByRole('tab', { name: /Mine/ })).getAttribute('aria-selected')).toBe('true');
  });
});
