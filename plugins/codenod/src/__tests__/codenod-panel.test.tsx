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
    autoSyncEnabled: true,
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
  it('shows Auto-sync off badge when automatic repository sync is disabled', async () => {
    answer({
      overview: overview({ autoSyncEnabled: false }),
      config: { models: [] }
    });
    render(<CodenodPanel pluginId="codenod" />);
    expect(await screen.findByText('Auto-sync off')).toBeTruthy();
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

describe('CodenodPanel in a project tab', () => {
  const repo = (owner: string, watched: boolean) => ({ id: `github.com/${owner}/api`, host: 'github.com', owner, name: 'api', watched });

  it('asks for the project overview and offers to watch each unwatched repository', async () => {
    answer({ overview: overview({ prs: [], hasWatchedRepos: false, projectRepos: [repo('acme', false), repo('me', true)] }), config: { models: [] }, addRepo: null, refresh: null });
    render(<CodenodPanel pluginId="codenod" projectId="p1" />);
    expect(await screen.findByText("Watch this project's repository to see its pull requests.")).toBeTruthy();
    expect(sdk.call).toHaveBeenCalledWith('overview', { projectId: 'p1' });
    const buttons = screen.getAllByRole('button', { name: 'Watch repository' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(sdk.call).toHaveBeenCalledWith('addRepo', { repo: 'github.com/acme/api' }));
    await waitFor(() => expect(sdk.call).toHaveBeenCalledWith('refresh'));
    await waitFor(() => expect(sdk.call.mock.calls.filter(([method]) => method === 'overview')).toHaveLength(2));
  });

  it('opens local changes for a project without a GitHub remote', async () => {
    answer({ overview: overview({ prs: [], projectRepos: [] }), config: { models: [] }, localTargets: { locations: [], scopes: [], hasModels: true } });
    render(<CodenodPanel pluginId="codenod" projectId="p1" />);
    expect(await screen.findByText('This project has no local checkouts.')).toBeTruthy();
    expect(sdk.call).toHaveBeenCalledWith('localTargets', { projectId: 'p1' });
    expect(screen.getByText(/This project has no .*GitHub remote/)).toBeTruthy();
  });

  it('restores the new project mode and bucket and clears the previous PR selection', async () => {
    localStorage.setItem('codenod.mode:p2', 'local');
    localStorage.setItem('codenod.tab:p2', 'watched');
    answer({ overview: overview({ projectRepos: [repo('acme', true)] }), config: { models: [] }, detail: detail('completed'), localTargets: { locations: [], scopes: [], hasModels: true } });
    const { rerender } = render(<CodenodPanel pluginId="codenod" projectId="p1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Add login/ }));
    expect(await screen.findByText('Looks fine')).toBeTruthy();
    rerender(<CodenodPanel pluginId="codenod" projectId="p2" />);
    expect(await screen.findByText('This project has no local checkouts.')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Pull requests' }));
    expect(screen.getByRole('tab', { name: /Watched/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByText('Looks fine')).toBeNull();
    expect(localStorage.getItem('codenod.mode:p1')).toBeNull();
  });

  it('reloads watched state after add succeeds even when sync fails', async () => {
    const responses = { overview: overview({ projectRepos: [repo('acme', false)] }), config: { models: [] }, addRepo: null, refresh: new Error('sync failed') };
    answer(responses);
    render(<CodenodPanel pluginId="codenod" projectId="p1" />);
    const button = await screen.findByRole('button', { name: 'Watch repository' });
    responses.overview = overview({ projectRepos: [repo('acme', true)] });
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByText("isn't watched, so its pull requests aren't synced.", { exact: false })).toBeNull());
    expect(screen.getByText('sync failed')).toBeTruthy();
  });

  it('shows watching progress only for the repository being added', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    answer({ overview: overview({ projectRepos: [repo('acme', false), repo('me', false)] }), config: { models: [] }, addRepo: pending, refresh: null });
    render(<CodenodPanel pluginId="codenod" projectId="p1" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Watch repository' }))[0]);
    expect(screen.getAllByRole('button', { name: 'Watching…' })).toHaveLength(1);
    expect((screen.getByRole('button', { name: 'Watch repository' }) as HTMLButtonElement).disabled).toBe(false);
    finish();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Watching…' })).toBeNull());
  });

  it('remembers its mode separately from the global panel', async () => {
    answer({ overview: overview({ projectRepos: [repo('acme', true)] }), config: { models: [] }, localTargets: { locations: [], scopes: [], hasModels: true } });
    render(<CodenodPanel pluginId="codenod" projectId="p1" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Local changes' }));
    expect(localStorage.getItem('codenod.mode:p1')).toBe('local');
    expect(localStorage.getItem('codenod.mode')).toBeNull();
  });
});
