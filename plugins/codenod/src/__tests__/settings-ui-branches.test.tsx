// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrList } from '../app/PrList.tsx';
import { SettingsView } from '../app/SettingsView.tsx';
import type { AvailableProvider, ConfigSnapshot } from '../app/types.ts';
import type { TokenSource } from '../server/github/auth.ts';
import type { CiState, RepoRow } from '../server/types.ts';
import type { PrListItem } from '../server/views.ts';

afterEach(cleanup);

const cursor: AvailableProvider = {
  providerId: 'cursor',
  displayName: 'Cursor',
  error: null,
  models: [
    { id: 'grok-4.6', label: 'grok-4.6', reasoningLevels: ['medium', 'high'] },
    { id: 'gpt-5.6-sol', label: 'gpt-5.6-sol', reasoningLevels: [] },
    { id: 'composer-2', label: 'Composer 2', reasoningLevels: [] }
  ]
};

function repo(host: string, owner: string, name: string, overrides: Partial<RepoRow> = {}): RepoRow {
  return { id: `${host}/${owner}/${name}`, host, owner, name, autoReview: false, specGlob: null, addedAt: 0, ...overrides };
}

function snapshot(overrides: Partial<ConfigSnapshot> = {}, settings: Partial<ConfigSnapshot['settings']> = {}): ConfigSnapshot {
  return {
    models: [],
    repos: [repo('github.com', 'acme', 'web', { specGlob: 'docs/**/*.md' }), repo('github.com', 'acme', 'api')],
    hosts: [{ host: 'github.com', authSource: 'gh', login: 'me', error: null, pullRequestCount: 0, syncedAt: null }],
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
      ...settings
    },
    defaultInstructions: '- Skip nitpicks.',
    builtInPrompt: 'You are an expert code reviewer.',
    maxInstructionsChars: 500,
    limits: { syncIntervalMinutes: { min: 1, max: 120 }, maxConcurrentReviews: { min: 1, max: 6 }, reviewTimeoutMinutes: { min: 3, max: 90 } },
    workspaceModes: ['worktree', 'project', 'diff-only'],
    projects: [{ id: 'home', name: 'Home' }],
    ...overrides
  };
}

type Handler = (args: unknown) => unknown;

function createRpc(config: ConfigSnapshot, handlers: Record<string, Handler> = {}) {
  const calls: Array<{ method: string; args: unknown }> = [];
  const rpc = {
    async call(method: string, args?: unknown) {
      calls.push({ method, args });
      const handler = handlers[method];
      if (handler) return handler(args);
      if (method === 'config') return config;
      if (method === 'availableModels') return [];
      return {};
    }
  };
  const callsTo = (method: string) => calls.filter((call) => call.method === method).map((call) => call.args);
  return { rpc, callsTo };
}

async function renderView(config = snapshot(), handlers: Record<string, Handler> = {}) {
  const harness = createRpc(config, handlers);
  render(<SettingsView rpc={harness.rpc} />);
  await screen.findByRole('tablist', { name: 'CodeNod settings' });
  return harness;
}

async function openTab(name: string) {
  fireEvent.click(screen.getByRole('tab', { name }));
  await screen.findByRole('tabpanel', { name });
}

describe('PrList badges and states', () => {
  function item(overrides: Partial<PrListItem>): PrListItem {
    return {
      id: 'github.com/acme/api#1',
      host: 'github.com',
      owner: 'acme',
      repo: 'api',
      number: 1,
      title: 'Add login',
      author: 'dev',
      url: 'https://github.com/acme/api/pull/1',
      state: 'open',
      isDraft: false,
      headSha: 'sha1',
      headRef: 'feat',
      baseRef: 'main',
      ciState: 'success',
      buckets: ['needs-review'],
      updatedAt: new Date().toISOString(),
      syncedAt: Date.now(),
      review: null,
      ...overrides
    };
  }

  function review(overrides: Partial<NonNullable<PrListItem['review']>>): PrListItem['review'] {
    return { id: 'r', status: 'completed', riskScore: 2, headSha: 'sha1', createdAt: 0, stale: false, findingCount: 0, ...overrides };
  }

  function renderList(items: PrListItem[], overrides: Partial<Parameters<typeof PrList>[0]> = {}) {
    return render(<PrList items={items} tab="needs-review" onTabChange={() => {}} query="" onQueryChange={() => {}} selectedId={null} onSelect={() => {}} hasWatchedRepos {...overrides} />);
  }

  it('shows queued, failed, cancelled, and scored review states', () => {
    renderList([
      item({ id: 'a', number: 1, title: 'Queued', ciState: 'pending', review: review({ status: 'queued' }) }),
      item({ id: 'b', number: 2, title: 'Failed', review: review({ status: 'failed' }) }),
      item({ id: 'c', number: 3, title: 'Cancelled', review: review({ status: 'cancelled' }) }),
      item({ id: 'd', number: 4, title: 'Unscored', review: review({ riskScore: null, findingCount: 1 }) }),
      item({ id: 'e', number: 5, title: 'Low risk', review: review({ riskScore: 2, findingCount: 0 }) })
    ]);
    expect(screen.getByText('Reviewing…')).toBeTruthy();
    expect(screen.getByText('CI running')).toBeTruthy();
    expect(screen.getByText('Review failed')).toBeTruthy();
    expect(screen.getByText('Review cancelled')).toBeTruthy();
    const unscored = screen.getByText('Risk – · 1 finding');
    expect(unscored.className.trim()).toBe('cn-badge');
    expect(unscored.getAttribute('title')).toBeNull();
    expect(screen.getByText('Risk 2 · 0 findings').className).toContain('cn-badge-ok');
  });

  it('omits the CI badge when there is no CI or the state is unrecognized', () => {
    renderList([
      item({ id: 'a', number: 1, title: 'No CI', ciState: 'none' }),
      item({ id: 'b', number: 2, title: 'Odd CI', ciState: 'skipped' as CiState })
    ]);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText(/^CI /)).toBeNull();
  });

  it('says "Nothing here." when other tabs have pull requests but this one does not', () => {
    renderList([item({ buckets: ['mine'] })], { tab: 'watched' });
    expect(screen.getByText('Nothing here.')).toBeTruthy();
  });

  it('filters by author and marks the selected pull request as current', () => {
    renderList([item({ id: 'a', number: 1, author: 'octocat' }), item({ id: 'b', number: 2, author: 'hubot' })], { query: 'HUBOT', selectedId: 'b' });
    const rows = screen.getAllByRole('button', { name: /Add login/ });
    expect(rows).toHaveLength(1);
    expect(rows[0].getAttribute('aria-current')).toBe('true');
  });
});

describe('SettingsView loading and errors', () => {
  it('shows a loading message until the configuration arrives', () => {
    const { rpc } = createRpc(snapshot(), { config: () => new Promise(() => {}) });
    render(<SettingsView rpc={rpc} />);
    expect(screen.getByText('Loading settings…')).toBeTruthy();
  });

  it('shows only the error when the configuration cannot be loaded', async () => {
    const { rpc } = createRpc(snapshot(), {
      config: () => {
        throw new Error('Plugin backend offline');
      }
    });
    render(<SettingsView rpc={rpc} />);
    expect(await screen.findByText('Plugin backend offline')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('keeps the tabs and shows an error when a reload after saving fails', async () => {
    const config = snapshot();
    const loadConfig = vi.fn<Handler>().mockReturnValueOnce(config).mockImplementation(() => {
      throw new Error('Reload failed');
    });
    await renderView(config, { config: loadConfig });
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom review instructions' }), { target: { value: 'New text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save instructions' }));
    expect(await screen.findByText('Reload failed')).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'CodeNod settings' })).toBeTruthy();
  });

  it('wraps ArrowLeft to the last tab, jumps Home, and ignores other keys', async () => {
    await renderView();
    const profile = screen.getByRole('tab', { name: 'Profile' });
    fireEvent.keyDown(profile, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'AI Model' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(profile.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(profile, { key: 'Enter' });
    expect(profile.getAttribute('aria-selected')).toBe('true');
  });
});

describe('Profile tab accounts and saving', () => {
  it('shows avatar, login fallback name, email, auth source, and last sync time', async () => {
    await renderView(
      snapshot({
        hosts: [
          { host: 'github.com', authSource: 'setting', login: 'me', error: null, pullRequestCount: 0, syncedAt: Date.now() },
          { host: 'ghe.example.com', authSource: 'sso' as TokenSource, login: 'me', error: null, pullRequestCount: 0, syncedAt: null }
        ],
        profiles: [{ host: 'github.com', login: 'me', name: null, email: 'me@example.com', avatarUrl: 'https://avatars.example.com/me.png' }]
      })
    );
    expect(screen.getByText('@me')).toBeTruthy();
    expect(screen.getByText('@me · me@example.com')).toBeTruthy();
    expect(document.querySelector('img.cn-avatar')?.getAttribute('src')).toBe('https://avatars.example.com/me.png');
    expect(screen.getByText(/via pasted token · last sync just now/)).toBeTruthy();
    expect(screen.getByText(/via sso · last sync never/)).toBeTruthy();
    expect(screen.getByText('Not signed in')).toBeTruthy();
  });

  it('shows the error when saving instructions fails', async () => {
    await renderView(snapshot(), {
      setSettings: () => {
        throw new Error('Settings are read-only');
      }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom review instructions' }), { target: { value: 'New text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save instructions' }));
    expect(await screen.findByText('Settings are read-only')).toBeTruthy();
  });
});

describe('Organizations & Repos tab hosts', () => {
  it('ignores blank, github.com, and duplicate hosts', async () => {
    await renderView();
    await openTab('Organizations & Repos');
    const input = screen.getByLabelText('GitHub Enterprise host') as HTMLInputElement;
    const add = screen.getByRole('button', { name: 'Add host' });

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(add);
    fireEvent.change(input, { target: { value: 'GitHub.com' } });
    fireEvent.click(add);
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: 'ghe.example.com' } });
    fireEvent.click(add);

    expect(screen.getAllByRole('button', { name: /^Remove host / })).toHaveLength(1);
    expect((screen.getByRole('button', { name: 'Save hosts' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('confirms a successful host save', async () => {
    const { callsTo } = await renderView();
    await openTab('Organizations & Repos');
    fireEvent.change(screen.getByLabelText('GitHub Enterprise host'), { target: { value: 'git.corp.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add host' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save hosts' }));
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(callsTo('setSettings')).toEqual([{ githubHosts: ['ghe.example.com', 'git.corp.com'] }]);
  });

  it('shows the error when saving hosts fails', async () => {
    await renderView(snapshot(), {
      setSettings: () => {
        throw new Error('Host is unreachable');
      }
    });
    await openTab('Organizations & Repos');
    fireEvent.click(screen.getByRole('button', { name: 'Remove host ghe.example.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save hosts' }));
    expect(await screen.findByText('Host is unreachable')).toBeTruthy();
  });

  it('confirms or reports sync interval saves', async () => {
    let shouldFail = false;
    await renderView(snapshot(), {
      setSettings: () => {
        if (shouldFail) throw new Error('Interval rejected');
        return {};
      }
    });
    await openTab('Organizations & Repos');
    const field = screen.getByLabelText('Sync interval (minutes)');
    fireEvent.change(field, { target: { value: '10' } });
    fireEvent.blur(field);
    expect(await screen.findByRole('status')).toBeTruthy();

    shouldFail = true;
    fireEvent.change(screen.getByLabelText('Sync interval (minutes)'), { target: { value: '30' } });
    fireEvent.blur(screen.getByLabelText('Sync interval (minutes)'));
    expect(await screen.findByText('Interval rejected')).toBeTruthy();
  });
});

describe('Organizations & Repos tab repositories', () => {
  it('adds a typed repository, clears the field, and skips blank input', async () => {
    const { callsTo } = await renderView();
    await openTab('Organizations & Repos');
    const input = screen.getByLabelText('Repository to watch') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(callsTo('addRepo')).toEqual([]);

    fireEvent.change(input, { target: { value: ' acme/new ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(input.value).toBe(''));
    expect(callsTo('addRepo')).toEqual([{ repo: 'acme/new' }]);
  });

  it('keeps the typed repository and shows the error when adding fails', async () => {
    await renderView(snapshot(), {
      addRepo: () => {
        throw new Error('Repository not found');
      }
    });
    await openTab('Organizations & Repos');
    const input = screen.getByLabelText('Repository to watch') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'acme/missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Repository not found')).toBeTruthy();
    expect(input.value).toBe('acme/missing');
  });

  it('suggests at most twelve active repositories and adds the chosen one', async () => {
    const suggestions = Array.from({ length: 13 }, (_, index) => ({ id: `acme/r${index}`, pullRequests: index }));
    const { callsTo } = await renderView(snapshot(), { discoverRepos: () => suggestions });
    await openTab('Organizations & Repos');
    fireEvent.click(screen.getByRole('button', { name: 'Suggest active repositories' }));
    expect(await screen.findByRole('button', { name: '+ acme/r0 (0)' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^\+ / })).toHaveLength(12);
    expect(screen.queryByRole('button', { name: '+ acme/r12 (12)' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '+ acme/r3 (3)' }));
    await waitFor(() => expect(callsTo('addRepo')).toEqual([{ repo: 'acme/r3' }]));
  });

  it('says so when there are no repositories to suggest or watch', async () => {
    await renderView(snapshot({ repos: [] }), { discoverRepos: () => [] });
    await openTab('Organizations & Repos');
    expect(screen.getByText('No watched repositories.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Suggest active repositories' }));
    expect(await screen.findByText('No other repositories with recent activity.')).toBeTruthy();
  });

  it('toggles auto-review, saves changed spec patterns on blur, and removes a repository', async () => {
    const { callsTo } = await renderView();
    await openTab('Organizations & Repos');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-review github.com/acme/api' }));

    const webSpec = screen.getByRole('textbox', { name: 'Spec pattern for github.com/acme/web' }) as HTMLInputElement;
    expect(webSpec.value).toBe('docs/**/*.md');
    fireEvent.blur(webSpec);
    const apiSpec = screen.getByRole('textbox', { name: 'Spec pattern for github.com/acme/api' });
    fireEvent.blur(apiSpec);
    fireEvent.change(apiSpec, { target: { value: ' specs/*.md ' } });
    fireEvent.blur(apiSpec);

    fireEvent.click(screen.getByRole('button', { name: 'Remove github.com/acme/web' }));
    await waitFor(() =>
      expect(callsTo('updateRepo')).toEqual([
        { id: 'github.com/acme/api', autoReview: true },
        { id: 'github.com/acme/api', specGlob: 'specs/*.md' }
      ])
    );
    await waitFor(() => expect(callsTo('removeRepo')).toEqual([{ id: 'github.com/acme/web' }]));
  });
});

describe('AI Model tab', () => {
  async function choosePriorityModel(providerName: string, modelId: string) {
    fireEvent.change(await screen.findByRole('combobox', { name: 'Provider for priority 1' }), { target: { value: providerName.toLowerCase() } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Model for priority 1' }), { target: { value: modelId } });
  }

  it('shows a loading message while providers are fetched', async () => {
    await renderView(snapshot(), { availableModels: () => new Promise(() => {}) });
    await openTab('AI Model');
    expect(screen.getByText('Loading providers…')).toBeTruthy();
  });

  it('shows the provider error when the model list cannot be fetched', async () => {
    await renderView(snapshot(), {
      availableModels: () => {
        throw new Error('Providers unavailable');
      }
    });
    await openTab('AI Model');
    expect(await screen.findByText('Providers unavailable')).toBeTruthy();
  });

  it('asks the user to sign in when no provider is available', async () => {
    await renderView();
    await openTab('AI Model');
    expect(await screen.findByText(/No AI provider is available in Zana/)).toBeTruthy();
  });

  it('saves the picked models and confirms', async () => {
    const { callsTo } = await renderView(snapshot(), { availableModels: () => [cursor] });
    await openTab('AI Model');
    await choosePriorityModel('Cursor', 'grok-4.6');
    fireEvent.click(screen.getByRole('button', { name: 'Save models (1)' }));
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(callsTo('setModels')).toEqual([{ models: [{ providerId: 'cursor', model: 'grok-4.6' }] }]);
  });

  it('keeps unsaved model picks when another setting is saved', async () => {
    const { callsTo } = await renderView(snapshot(), { config: () => snapshot(), availableModels: () => [cursor] });
    await openTab('AI Model');
    await choosePriorityModel('Cursor', 'grok-4.6');
    fireEvent.change(screen.getByLabelText('Review workspace'), { target: { value: 'project' } });
    await waitFor(() => expect(callsTo('config').length).toBeGreaterThan(1));
    expect(screen.getByRole('button', { name: 'Save models (1)' })).toBeTruthy();
  });

  it('shows the error when saving models fails', async () => {
    await renderView(snapshot(), {
      availableModels: () => [cursor],
      setModels: () => {
        throw new Error('Model is not allowed');
      }
    });
    await openTab('AI Model');
    await screen.findByRole('combobox', { name: 'Provider for priority 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Save models (0)' }));
    expect(await screen.findByText('Model is not allowed')).toBeTruthy();
  });

  it('labels unknown workspace modes by id and clears the fallback project', async () => {
    const config = snapshot({ workspaceModes: ['worktree', 'sandbox' as ConfigSnapshot['workspaceModes'][number]] }, { fallbackProjectId: 'home' });
    const { callsTo } = await renderView(config);
    await openTab('AI Model');
    expect(screen.getByRole('option', { name: 'sandbox' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Unknown project' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Fallback project for review threads'), { target: { value: '' } });
    await waitFor(() => expect(callsTo('setSettings')).toEqual([{ fallbackProjectId: null }]));
    expect(await screen.findByRole('status')).toBeTruthy();
  });

  it('shows the error when an execution setting cannot be saved', async () => {
    await renderView(snapshot(), {
      setSettings: () => {
        throw new Error('Timeout out of range');
      }
    });
    await openTab('AI Model');
    const field = screen.getByLabelText('Review timeout per model (minutes)');
    fireEvent.change(field, { target: { value: '45' } });
    fireEvent.blur(field);
    expect(await screen.findByText('Timeout out of range')).toBeTruthy();
  });
});
