// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { groupReposByOrganization } from '../app/ReposTab.tsx';
import { SettingsView } from '../app/SettingsView.tsx';
import { PromptSelector } from '../app/PromptSelector.tsx';
import type { ConfigSnapshot } from '../app/types.ts';
import type { RepoRow } from '../server/types.ts';

afterEach(cleanup);

it('offers prompt overrides without changing the default', () => {
  let selected: string | null | undefined;
  render(<PromptSelector prompts={[{ id: 'security', name: 'Security', instructions: 'Check security' }]} value={undefined} onChange={(value) => { selected = value; }} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Review prompt' }), { target: { value: 'security' } });
  expect(selected).toBe('security');
});

const DEFAULT_INSTRUCTIONS = '- Skip nitpicks.';

function repo(host: string, owner: string, name: string): RepoRow {
  return { id: `${host}/${owner}/${name}`, host, owner, name, autoReview: false, specGlob: null, addedAt: 0 };
}

function snapshot(overrides: Partial<ConfigSnapshot['settings']> = {}): ConfigSnapshot {
  return {
    models: [],
    repos: [repo('github.com', 'acme', 'web'), repo('ghe.example.com', 'team', 'app'), repo('github.com', 'acme', 'api')],
    hosts: [
      { host: 'github.com', authSource: 'gh', login: 'me', error: null, pullRequestCount: 0, syncedAt: null },
      { host: 'ghe.example.com', authSource: null, login: null, error: 'Not signed in.', pullRequestCount: 0, syncedAt: null }
    ],
    profiles: [{ host: 'github.com', login: 'me', name: 'Mona Lisa', email: null, avatarUrl: null }],
    settings: {
      customInstructions: 'Be strict',
      prompts: [{ id: 'legacy', name: 'My review instructions', instructions: 'Be strict' }],
      defaultPromptId: 'legacy',
      githubHosts: ['ghe.example.com'],
      syncIntervalMinutes: 5,
      maxConcurrentReviews: 2,
      reviewTimeoutMinutes: 20,
      workspaceMode: 'worktree',
      fallbackProjectId: null,
      archiveReviewThreads: true,
      showReviewsOnAgentsBoard: true,
      autoSyncEnabled: true,
      ...overrides
    },
    defaultInstructions: DEFAULT_INSTRUCTIONS,
    builtInPrompt: 'You are an expert code reviewer.',
    maxInstructionsChars: 50,
    limits: { syncIntervalMinutes: { min: 1, max: 120 }, maxConcurrentReviews: { min: 1, max: 6 }, reviewTimeoutMinutes: { min: 3, max: 90 } },
    workspaceModes: ['worktree', 'project', 'diff-only'],
    projects: [{ id: 'home', name: 'Home' }]
  };
}

function createRpc(config = snapshot()) {
  const calls: Array<{ method: string; args: unknown }> = [];
  const rpc = {
    async call(method: string, args?: unknown) {
      calls.push({ method, args });
      if (method === 'config') return config;
      if (method === 'availableModels') return [];
      return {};
    }
  };
  const settingsCalls = () => calls.filter((call) => call.method === 'setSettings').map((call) => call.args);
  return { rpc, calls, settingsCalls };
}

async function renderView(config?: ConfigSnapshot) {
  const harness = createRpc(config);
  render(<SettingsView rpc={harness.rpc} />);
  await screen.findByRole('tablist', { name: 'CodeNod settings' });
  return harness;
}

describe('SettingsView tabs', () => {
  it('opens on Profile and moves between tabs with the keyboard', async () => {
    await renderView();
    const profile = screen.getByRole('tab', { name: 'Profile' });
    expect(profile.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Profile' })).toBeTruthy();

    fireEvent.keyDown(profile, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Organizations & Repos' }).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Organizations & Repos' }));

    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'AI Model' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(profile.getAttribute('aria-selected')).toBe('true');
  });

  it('keeps unsaved edits when switching tabs', async () => {
    await renderView();
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom review instructions' }), { target: { value: 'Draft text' } });
    fireEvent.click(screen.getByRole('tab', { name: 'AI Model' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));
    expect((screen.getByRole('textbox', { name: 'Custom review instructions' }) as HTMLTextAreaElement).value).toBe('Draft text');
  });
});

describe('Profile tab', () => {
  it('restores a non-default prompt after cancelling creation', async () => {
    await renderView(snapshot({ prompts: [{ id: 'legacy', name: 'Default', instructions: 'Default text' }, { id: 'security', name: 'Security', instructions: 'Check security' }] }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Prompt' }), { target: { value: 'security' } });
    fireEvent.click(screen.getByRole('button', { name: 'New prompt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect((screen.getByRole('combobox', { name: 'Prompt' }) as HTMLSelectElement).value).toBe('security');
    expect((screen.getByRole('textbox', { name: 'Custom review instructions' }) as HTMLTextAreaElement).value).toBe('Check security');
  });
  it('creates a named prompt without replacing the existing prompt', async () => {
    const { settingsCalls } = await renderView();
    fireEvent.click(screen.getByRole('button', { name: 'New prompt' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Prompt name' }), { target: { value: 'Security' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom review instructions' }), { target: { value: 'Find vulnerabilities' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save instructions' }));
    await waitFor(() => expect(settingsCalls()).toContainEqual(expect.objectContaining({ prompts: expect.arrayContaining([
      expect.objectContaining({ name: 'My review instructions', instructions: 'Be strict' }),
      expect.objectContaining({ name: 'Security', instructions: 'Find vulnerabilities' })
    ]) })));
  });
  it('restores the selected prompt when creation is cancelled', async () => {
    await renderView();
    fireEvent.click(screen.getByRole('button', { name: 'New prompt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect((screen.getByRole('textbox', { name: 'Prompt name' }) as HTMLInputElement).value).toBe('My review instructions');
    expect((screen.getByRole('textbox', { name: 'Custom review instructions' }) as HTMLTextAreaElement).value).toBe('Be strict');
    expect((screen.getByRole('button', { name: 'New prompt' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('shows GitHub identity per host', async () => {
    await renderView();
    expect(screen.getByText('Mona Lisa')).toBeTruthy();
    expect(screen.getByText(/@me · email private/)).toBeTruthy();
    expect(screen.getByText('Not signed in.')).toBeTruthy();
  });

  it('saves edited instructions, resets to the default, and blocks text over the limit', async () => {
    const { settingsCalls } = await renderView();
    const save = screen.getByRole('button', { name: 'Save instructions' }) as HTMLButtonElement;
    const box = screen.getByRole('textbox', { name: 'Custom review instructions' }) as HTMLTextAreaElement;
    expect(save.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(box.value).toBe(DEFAULT_INSTRUCTIONS);
    fireEvent.click(save);
    await waitFor(() => expect(settingsCalls()).toEqual([{ prompts: [{ id: 'legacy', name: 'My review instructions', instructions: DEFAULT_INSTRUCTIONS }] }]));
    expect(await screen.findByRole('status')).toBeTruthy();

    fireEvent.change(box, { target: { value: 'x'.repeat(51) } });
    expect(save.disabled).toBe(true);
    expect(screen.getByText('51 / 50')).toBeTruthy();
  });

  it('shows the built-in prompt read-only', async () => {
    await renderView();
    expect(screen.getByText('View built-in prompt')).toBeTruthy();
    expect(screen.getByText('You are an expert code reviewer.').tagName).toBe('PRE');
  });
});

describe('Organizations & Repos tab', () => {
  it('groups repositories by host and owner', () => {
    const groups = groupReposByOrganization(snapshot().repos);
    expect(groups.map((group) => group.key)).toEqual(['ghe.example.com/team', 'github.com/acme']);
    expect(groups[1].repos.map((item) => item.name)).toEqual(['api', 'web']);
  });

  it('edits hosts as a draft and saves them explicitly', async () => {
    const { settingsCalls } = await renderView();
    fireEvent.click(screen.getByRole('tab', { name: 'Organizations & Repos' }));
    const saveHosts = screen.getByRole('button', { name: 'Save hosts' }) as HTMLButtonElement;
    expect(saveHosts.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('GitHub Enterprise host'), { target: { value: 'Git.Corp.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add host' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove host ghe.example.com' }));
    expect(settingsCalls()).toEqual([]);

    fireEvent.click(saveHosts);
    await waitFor(() => expect(settingsCalls()).toEqual([{ githubHosts: ['git.corp.com'] }]));
  });

  it('saves the sync interval on blur only when it changed', async () => {
    const { settingsCalls } = await renderView();
    const field = screen.getByLabelText('Sync interval (minutes)');
    fireEvent.blur(field);
    fireEvent.change(field, { target: { value: '15' } });
    fireEvent.blur(field);
    await waitFor(() => expect(settingsCalls()).toEqual([{ syncIntervalMinutes: 15 }]));
  });
  it('toggles automatic repository sync and disables the interval field when off', async () => {
    const { settingsCalls } = await renderView();
    fireEvent.click(screen.getByRole('tab', { name: 'Organizations & Repos' }));
    const checkbox = screen.getByLabelText('Enable automatic repository sync') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    const intervalField = screen.getByLabelText('Sync interval (minutes)') as HTMLInputElement;
    expect(intervalField.disabled).toBe(false);

    fireEvent.click(checkbox);
    await waitFor(() => expect(settingsCalls()).toEqual([{ autoSyncEnabled: false }]));
  });

  it('renders disabled sync interval when autoSyncEnabled is false in config', async () => {
    await renderView(snapshot({ autoSyncEnabled: false }));
    fireEvent.click(screen.getByRole('tab', { name: 'Organizations & Repos' }));
    const checkbox = screen.getByLabelText('Enable automatic repository sync') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    const intervalField = screen.getByLabelText('Sync interval (minutes)') as HTMLInputElement;
    expect(intervalField.disabled).toBe(true);
    expect(screen.getByText(/Automatic sync is paused/)).toBeTruthy();
  });


  it('clamps an out-of-range sync interval before saving', async () => {
    const { settingsCalls } = await renderView();
    const field = screen.getByLabelText('Sync interval (minutes)') as HTMLInputElement;
    fireEvent.change(field, { target: { value: '999' } });
    fireEvent.blur(field);
    expect(field.value).toBe('120');
    await waitFor(() => expect(settingsCalls()).toEqual([{ syncIntervalMinutes: 120 }]));
  });
});

describe('AI Model tab', () => {
  it('saves execution settings immediately', async () => {
    const { settingsCalls } = await renderView(snapshot({ fallbackProjectId: 'gone' }));
    fireEvent.click(screen.getByRole('tab', { name: 'AI Model' }));
    expect(screen.getByRole('option', { name: 'Unknown project' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Review workspace'), { target: { value: 'diff-only' } });
    fireEvent.change(screen.getByLabelText('Fallback project for review threads'), { target: { value: 'home' } });
    fireEvent.click(screen.getByLabelText('Archive hidden review threads when done'));
    await waitFor(() =>
      expect(settingsCalls()).toEqual([{ workspaceMode: 'diff-only' }, { fallbackProjectId: 'home' }, { archiveReviewThreads: false }])
    );
  });
});
