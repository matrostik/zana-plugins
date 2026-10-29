import { describe, expect, it } from 'vitest';
import { findingsAtOrAbove, parseArgs, parseModelList, registerCli, registerTools, type AvailableProvider, type CodenodApp, type LocalApp } from '../server/cli-and-tools.ts';
import type { Store } from '../server/db.ts';
import type { HostStatus } from '../server/sync.ts';
import type { ModelChoice, PrRef, PullRequestRow, RepoRow, ReviewRow, ReviewRunRow } from '../server/types.ts';
import { formatLocalDetail, formatPrDetail, formatPrLine, getPrDetail, listPullRequests, sortFindings, type LocalDetail, type PrDetail, type PrListItem } from '../server/views.ts';
import { EMPTY_SCORES, detail as detailFixture, finding } from './pr-fixtures.ts';

type CliResult = { exitCode: number; stdout?: string; stderr?: string };
type ToolExecute = (input: unknown, ctx: { threadId: string; projectId: string; signal: AbortSignal }) => unknown;

function pullRequest(overrides: Partial<PullRequestRow> = {}): PullRequestRow {
  return { ...detailFixture('completed').pr, ...overrides };
}

function review(overrides: Partial<ReviewRow> = {}): ReviewRow {
  const { stale: _stale, ...base } = detailFixture('completed').review!;
  return { ...base, ...overrides };
}

function run(overrides: Partial<ReviewRunRow> = {}): ReviewRunRow {
  return { ...detailFixture('completed').runs[0], ...overrides };
}

function listItem(overrides: Partial<PrListItem> = {}): PrListItem {
  return { ...pullRequest(), review: null, ...overrides };
}

function repo(overrides: Partial<RepoRow> = {}): RepoRow {
  return { id: 'github.com/acme/api', host: 'github.com', owner: 'acme', name: 'api', autoReview: false, specGlob: null, addedAt: 0, ...overrides };
}

function hostStatus(overrides: Partial<HostStatus> = {}): HostStatus {
  return { host: 'github.com', authSource: null, login: null, error: null, pullRequestCount: 0, syncedAt: null, ...overrides };
}

function createApp(overrides: Partial<CodenodApp> = {}) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const record = (method: string, args: unknown[]) => void calls.push({ method, args });
  const app: CodenodApp = {
    defaultHost: async () => 'github.com',
    listPullRequests: (...args) => (record('listPullRequests', args), []),
    detail: async (...args) => (record('detail', args), detailFixture('completed')),
    startReview: async (...args) => (record('startReview', args), review({ id: 'rev-new', status: 'queued' })),
    waitForReview: async (...args) => (record('waitForReview', args), review({ id: 'rev-new', status: 'completed' })),
    post: async (...args) => (record('post', args), { url: null, commentCount: 0, publishedCount: 0 }),
    syncAll: async () => ({ hosts: [], changed: [] }),
    hostStatuses: async () => [],
    configuredModels: async () => [],
    availableModels: async () => [],
    listRepos: () => [],
    addRepo: (...args) => (record('addRepo', args), repo({ id: `${args[0].host}/${args[0].owner}/${args[0].name}`, autoReview: Boolean(args[0].autoReview) })),
    removeRepo: (...args) => (record('removeRepo', args), false),
    ...overrides
  };
  return { app, calls };
}

function createCli(overrides: Partial<CodenodApp> = {}) {
  const { app, calls } = createApp(overrides);
  let runCli: ((argv: string[], ctx: { cwd?: string }) => Promise<CliResult>) | null = null;
  registerCli({ register: (registration) => void (runCli = registration.run) }, app);
  return { cli: (argv: string[], ctx: { cwd?: string } = {}) => runCli!(argv, ctx), calls };
}

function createTools(overrides: Partial<CodenodApp> = {}) {
  const { app, calls } = createApp(overrides);
  const tools = new Map<string, ToolExecute>();
  registerTools({ registerTool: (registration) => void tools.set(registration.name, registration.execute) }, app);
  const ctx = (aborted = false) => {
    const controller = new AbortController();
    if (aborted) controller.abort();
    return { threadId: 't', projectId: 'p', signal: controller.signal };
  };
  return { tool: (name: string) => tools.get(name)!, ctx, calls };
}

describe('parseModelList', () => {
  it('parses provider:model entries with optional reasoning levels and skips blanks', () => {
    expect(parseModelList(' claude-code:opus , ,codex:gpt-5@high,')).toEqual([
      { providerId: 'claude-code', model: 'opus' },
      { providerId: 'codex', model: 'gpt-5', reasoningLevel: 'high' }
    ]);
  });

  it('rejects entries without a provider or a model', () => {
    expect(() => parseModelList('opus')).toThrow('Invalid model "opus"');
    expect(() => parseModelList(':opus')).toThrow('Invalid model ":opus"');
    expect(() => parseModelList('claude-code:')).toThrow('Invalid model "claude-code:"');
  });
});

describe('parseArgs', () => {
  it('separates positionals from inline, spaced, and boolean flags', () => {
    const parsed = parseArgs(['acme/api#4', '--tab=mine', '--models', 'a:b', '--wait', '--json']);
    expect(parsed.positional).toEqual(['acme/api#4']);
    expect([...parsed.flags]).toEqual([['tab', 'mine'], ['models', 'a:b'], ['wait', true], ['json', true]]);
  });

  it('never lets a switch swallow the next argument', () => {
    const parsed = parseArgs(['--yes', 'acme/api#4', '--wait', 'x', '--json', 'y', '--auto', 'z']);
    expect(parsed.positional).toEqual(['acme/api#4', 'x', 'y', 'z']);
    expect([...parsed.flags.values()]).toEqual([true, true, true, true]);
  });

  it('keeps everything after the first equals sign in an inline value', () => {
    expect(parseArgs(['--message=a=b=c']).flags.get('message')).toBe('a=b=c');
  });
});

describe('codenod cli', () => {
  it('prints usage with exit code 0 when no command is given', async () => {
    const { cli } = createCli();
    const result = await cli([]);
    expect(result).toMatchObject({ exitCode: 0, stdout: expect.stringContaining('Usage:') });
  });

  it('prints usage to stderr with exit code 1 for an unknown command', async () => {
    const { cli } = createCli();
    const result = await cli(['frobnicate']);
    expect(result).toMatchObject({ exitCode: 1, stderr: expect.stringContaining('zcc codenod list') });
  });

  describe('list', () => {
    it('tells the user to sync when the inbox is empty', async () => {
      const { cli, calls } = createCli();
      const result = await cli(['list']);
      expect(result).toEqual({ exitCode: 0, stdout: 'No open pull requests. Run "zcc codenod sync" to refresh.' });
      expect(calls).toEqual([{ method: 'listPullRequests', args: [undefined] }]);
    });

    it('rejects an unknown tab', async () => {
      const { cli } = createCli();
      const result = await cli(['list', '--tab', 'all']);
      expect(result).toEqual({ exitCode: 1, stderr: '--tab must be one of needs-review, mine, watched' });
    });

    it('filters by tab and prints one entry per pull request', async () => {
      const items = [listItem({ number: 1 }), listItem({ number: 2 })];
      const { cli, calls } = createCli({ listPullRequests: (bucket) => (calls.push({ method: 'listPullRequests', args: [bucket] }), items) });
      const result = await cli(['list', '--tab', 'mine']);
      expect(result.stdout).toBe(items.map(formatPrLine).join('\n'));
      expect(calls[0].args).toEqual(['mine']);
    });

    it('returns the items as JSON', async () => {
      const items = [listItem()];
      const { cli } = createCli({ listPullRequests: () => items });
      const result = await cli(['list', '--json']);
      expect(JSON.parse(result.stdout!)).toEqual(items);
    });
  });

  describe('sync', () => {
    it('reports each host and succeeds when no host failed', async () => {
      const { cli } = createCli({ syncAll: async () => ({ hosts: [hostStatus({ login: 'me', pullRequestCount: 3 })], changed: [] }) });
      const result = await cli(['sync']);
      expect(result).toEqual({ exitCode: 0, stdout: 'github.com: 3 open PR(s) as @me' });
    });

    it('exits with 1 and shows the error when any host failed', async () => {
      const { cli } = createCli({
        syncAll: async () => ({ hosts: [hostStatus({ login: 'me', pullRequestCount: 1 }), hostStatus({ host: 'ghe.example.com', error: 'Not signed in' })], changed: [] })
      });
      const result = await cli(['sync']);
      expect(result).toEqual({ exitCode: 1, stdout: 'github.com: 1 open PR(s) as @me\nghe.example.com: Not signed in' });
    });

    it('turns a thrown sync error into stderr', async () => {
      const { cli } = createCli({ syncAll: async () => Promise.reject(new Error('network down')) });
      const result = await cli(['sync']);
      expect(result).toEqual({ exitCode: 1, stderr: 'network down' });
    });
  });

  describe('review', () => {
    it('requires a pull request reference', async () => {
      const { cli } = createCli();
      const result = await cli(['review']);
      expect(result).toEqual({ exitCode: 1, stderr: 'A pull request URL or owner/repo#123 is required' });
    });

    it('starts a review with configured models and explains how to check it', async () => {
      const { cli, calls } = createCli();
      const result = await cli(['review', 'acme/api#4']);
      expect(result).toEqual({ exitCode: 0, stdout: 'Review rev-new queued. Check it with: zcc codenod show github.com/acme/api#4' });
      expect(calls).toEqual([{ method: 'startReview', args: [{ host: 'github.com', owner: 'acme', name: 'api', number: 4 }, { models: undefined }] }]);
    });

    it('passes parsed --models to the review', async () => {
      const { cli, calls } = createCli();
      await cli(['review', 'acme/api#4', '--models', 'claude-code:opus@high']);
      expect(calls[0].args[1]).toEqual({ models: [{ providerId: 'claude-code', model: 'opus', reasoningLevel: 'high' }] });
    });

    it('returns the started review as JSON without waiting', async () => {
      const { cli, calls } = createCli();
      const result = await cli(['review', 'acme/api#4', '--json']);
      expect(JSON.parse(result.stdout!)).toMatchObject({ id: 'rev-new', status: 'queued' });
      expect(calls.map((call) => call.method)).toEqual(['startReview']);
    });

    it('waits and returns the detail as JSON', async () => {
      const { cli, calls } = createCli();
      const result = await cli(['review', 'acme/api#4', '--wait', '--json']);
      expect(JSON.parse(result.stdout!)).toEqual(detailFixture('completed'));
      expect(calls.map((call) => call.method)).toEqual(['startReview', 'waitForReview', 'detail']);
      expect(calls[1].args).toEqual(['rev-new', 25 * 60_000]);
    });

    it('waits and prints the formatted detail with exit code 0 when completed', async () => {
      const { cli } = createCli();
      const result = await cli(['review', 'acme/api#4', '--wait']);
      expect(result).toEqual({ exitCode: 0, stdout: formatPrDetail(detailFixture('completed')) });
    });

    it('starts a review when --wait comes before the pull request', async () => {
      const { cli, calls } = createCli();
      const result = await cli(['review', '--wait', 'acme/api#4']);
      expect(result.exitCode).toBe(0);
      expect(calls.map((call) => call.method)).toEqual(['startReview', 'waitForReview', 'detail']);
    });

    it('exits with 1 when a waited JSON review did not complete', async () => {
      const { cli } = createCli({ waitForReview: async () => review({ status: 'failed' }), detail: async () => detailFixture('failed') });
      const result = await cli(['review', 'acme/api#4', '--wait', '--json']);
      expect(result.exitCode).toBe(1);
      expect(JSON.parse(result.stdout!)).toEqual(detailFixture('failed'));
    });

    it('exits with 1 after waiting when the review did not complete', async () => {
      const { cli } = createCli({ waitForReview: async () => review({ status: 'failed' }), detail: async () => detailFixture('failed') });
      const result = await cli(['review', 'acme/api#4', '--wait']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('Error: boom');
    });
  });

  describe('show', () => {
    it('prints the formatted detail', async () => {
      const { cli } = createCli();
      const result = await cli(['show', 'https://github.com/acme/api/pull/1']);
      expect(result).toEqual({ exitCode: 0, stdout: formatPrDetail(detailFixture('completed')) });
    });

    it('returns the detail as JSON', async () => {
      const { cli } = createCli();
      const result = await cli(['show', 'acme/api#1', '--json']);
      expect(JSON.parse(result.stdout!)).toEqual(detailFixture('completed'));
    });

    it('reports an unparseable reference', async () => {
      const { cli } = createCli();
      const result = await cli(['show', 'not-a-pr']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Cannot parse pull request reference "not-a-pr"');
    });
  });

  describe('post', () => {
    const withFindings = (): PrDetail => ({
      ...detailFixture('completed'),
      findings: [
        finding({ id: 'aaaa1111' }),
        finding({ id: 'bbbb2222', dismissed: true }),
        finding({ id: 'cccc3333', postedAt: 1 }),
        finding({ id: 'dddd4444' })
      ]
    });

    it('refuses to post without --yes', async () => {
      const { cli, calls } = createCli();
      const result = await cli(['post', 'acme/api#1']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Re-run with --yes');
      expect(calls).toEqual([]);
    });

    it('refuses when the pull request has no review', async () => {
      const { cli } = createCli({ detail: async () => ({ ...detailFixture('completed'), review: null }) });
      const result = await cli(['post', 'acme/api#1', '--yes']);
      expect(result).toEqual({ exitCode: 1, stderr: 'This pull request has no completed review to post' });
    });

    it('refuses when the latest review is not completed', async () => {
      const { cli } = createCli({ detail: async () => detailFixture('running') });
      const result = await cli(['post', 'acme/api#1', '--yes']);
      expect(result.stderr).toBe('This pull request has no completed review to post');
    });

    it('posts every unposted, undismissed finding by default', async () => {
      const { cli, calls } = createCli({ detail: async () => withFindings(), post: async (input) => (calls.push({ method: 'post', args: [input] }), { url: null, commentCount: 2, publishedCount: 2 }) });
      const result = await cli(['post', 'acme/api#1', '--yes']);
      expect(result).toEqual({ exitCode: 0, stdout: 'Posted 2 finding(s), 2 inline.' });
      expect(calls[0].args[0]).toEqual({ reviewId: 'rev', findingIds: ['aaaa1111', 'dddd4444'], event: 'COMMENT', body: undefined });
    });

    it('posts findings selected by id prefix with a message and prints the review URL', async () => {
      const { cli, calls } = createCli({
        detail: async () => withFindings(),
        post: async (input) => (calls.push({ method: 'post', args: [input] }), { url: 'https://github.com/acme/api/pull/1#review', commentCount: 1, publishedCount: 2 })
      });
      const result = await cli(['post', 'acme/api#1', '--yes', '--findings', 'dddd, aaaa', '--message', 'Please fix']);
      expect(result).toEqual({ exitCode: 0, stdout: 'Posted 2 finding(s), 1 inline.\nhttps://github.com/acme/api/pull/1#review' });
      expect(calls[0].args[0]).toMatchObject({ findingIds: ['dddd4444', 'aaaa1111'], body: 'Please fix' });
    });

    it('posts when --yes comes before the pull request', async () => {
      const { cli } = createCli({ detail: async () => withFindings(), post: async () => ({ url: null, commentCount: 2, publishedCount: 2 }) });
      const result = await cli(['post', '--yes', 'acme/api#1']);
      expect(result).toEqual({ exitCode: 0, stdout: 'Posted 2 finding(s), 2 inline.' });
    });

    it('rejects a prefix that matches no finding', async () => {
      const { cli } = createCli({ detail: async () => withFindings() });
      const result = await cli(['post', 'acme/api#1', '--yes', '--findings', 'zzzz']);
      expect(result).toEqual({ exitCode: 1, stderr: 'No finding matches "zzzz"' });
    });
  });

  describe('repos', () => {
    it('lists repositories by default and says when none are watched', async () => {
      const { cli } = createCli();
      const result = await cli(['repos']);
      expect(result).toEqual({ exitCode: 0, stdout: 'No watched repositories.' });
    });

    it('lists repositories with auto-review and spec markers', async () => {
      const { cli } = createCli({ listRepos: () => [repo(), repo({ id: 'github.com/acme/web', autoReview: true, specGlob: 'docs/*.md' })] });
      const result = await cli(['repos', 'list']);
      expect(result.stdout).toBe('github.com/acme/api\ngithub.com/acme/web  [auto-review]  spec: docs/*.md');
    });

    it('lists repositories as JSON', async () => {
      const repos = [repo()];
      const { cli } = createCli({ listRepos: () => repos });
      const result = await cli(['repos', 'list', '--json']);
      expect(JSON.parse(result.stdout!)).toEqual(repos);
    });

    it('requires a repository for add and remove', async () => {
      const { cli } = createCli();
      expect(await cli(['repos', 'add'])).toEqual({ exitCode: 1, stderr: 'zcc codenod repos add needs a repository' });
      expect(await cli(['repos', 'remove'])).toEqual({ exitCode: 1, stderr: 'zcc codenod repos remove needs a repository' });
    });

    it('adds a repository without auto-review or a spec glob', async () => {
      const { cli, calls } = createCli();
      const result = await cli(['repos', 'add', 'acme/web']);
      expect(result).toEqual({ exitCode: 0, stdout: 'Watching github.com/acme/web' });
      expect(calls[0].args[0]).toEqual({ host: 'github.com', owner: 'acme', name: 'web', autoReview: false, specGlob: null });
    });

    it('stops watching a repository', async () => {
      const { cli, calls } = createCli({ removeRepo: (id) => (calls.push({ method: 'removeRepo', args: [id] }), true) });
      const result = await cli(['repos', 'remove', 'ghe.example.com/acme/api']);
      expect(result).toEqual({ exitCode: 0, stdout: 'Stopped watching ghe.example.com/acme/api' });
      expect(calls[0].args).toEqual(['ghe.example.com/acme/api']);
    });

    it('reports removing a repository that is not watched', async () => {
      const { cli } = createCli();
      const result = await cli(['repos', 'remove', 'acme/api']);
      expect(result).toEqual({ exitCode: 1, stderr: 'github.com/acme/api is not watched' });
    });

    it('prints usage for an unknown subcommand', async () => {
      const { cli } = createCli();
      const result = await cli(['repos', 'rename', 'acme/api']);
      expect(result).toMatchObject({ exitCode: 1, stderr: expect.stringContaining('Usage:') });
    });

    it('reports an invalid repository reference', async () => {
      const { cli } = createCli();
      const result = await cli(['repos', 'add', 'just-a-name']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Cannot parse repository "just-a-name"');
    });
  });

  describe('models', () => {
    it('explains how to pick models when none are configured', async () => {
      const { cli } = createCli();
      const result = await cli(['models']);
      expect(result).toEqual({ exitCode: 0, stdout: 'Configured: none (pick models in CodeNod settings or pass --models)' });
    });

    it('lists configured models and each provider with its errors and reasoning levels', async () => {
      const configured: ModelChoice[] = [{ providerId: 'claude-code', model: 'opus', reasoningLevel: 'high' }, { providerId: 'codex', model: 'gpt-5' }];
      const available: AvailableProvider[] = [
        { providerId: 'claude-code', displayName: 'Claude Code', error: null, models: [{ id: 'opus', label: 'Opus', reasoningLevels: ['low', 'high'] }, { id: 'haiku', label: 'Haiku', reasoningLevels: [] }] },
        { providerId: 'codex', displayName: 'Codex', error: 'Not installed', models: [] }
      ];
      const { cli } = createCli({ configuredModels: async () => configured, availableModels: async () => available });
      const result = await cli(['models']);
      expect(result.stdout).toBe(
        ['Configured: claude-code:opus@high, codex:gpt-5', 'Claude Code', '  claude-code:opus  (@low|high)', '  claude-code:haiku', 'Codex — Not installed'].join('\n')
      );
    });

    it('returns configured and available models as JSON', async () => {
      const configured: ModelChoice[] = [{ providerId: 'claude-code', model: 'opus' }];
      const { cli } = createCli({ configuredModels: async () => configured });
      const result = await cli(['models', '--json']);
      expect(JSON.parse(result.stdout!)).toEqual({ configured, available: [] });
    });
  });

  describe('auth', () => {
    it('describes each host sign-in state', async () => {
      const { cli } = createCli({
        hostStatuses: async () => [
          hostStatus({ authSource: 'gh', login: 'me' }),
          hostStatus({ host: 'ghe.example.com', authSource: 'env' as HostStatus['authSource'] }),
          hostStatus({ host: 'other.example.com', error: 'No token' })
        ]
      });
      const result = await cli(['auth']);
      expect(result).toEqual({
        exitCode: 0,
        stdout: ['github.com: signed in via gh as @me', 'ghe.example.com: signed in via env', 'other.example.com: not signed in — No token'].join('\n')
      });
    });

    it('returns host statuses as JSON', async () => {
      const statuses = [hostStatus()];
      const { cli } = createCli({ hostStatuses: async () => statuses });
      const result = await cli(['auth', '--json']);
      expect(JSON.parse(result.stdout!)).toEqual(statuses);
    });
  });
});

describe('codenod agent tools', () => {
  describe('codenod_list_prs', () => {
    it('summarizes each pull request and passes a valid tab through', async () => {
      const item = listItem({ isDraft: true, buckets: ['mine'] });
      const { tool, ctx, calls } = createTools({ listPullRequests: (bucket) => (calls.push({ method: 'listPullRequests', args: [bucket] }), [item]) });
      const result = await tool('codenod_list_prs')({ tab: 'mine' }, ctx());
      expect(result).toEqual([
        { pr: 'github.com/acme/api#1', title: 'Add login', author: 'dev', url: 'https://github.com/acme/api/pull/1', draft: true, ci: 'success', buckets: ['mine'], review: null }
      ]);
      expect(calls[0].args).toEqual(['mine']);
    });

    it('ignores an unknown tab and tolerates missing input', async () => {
      const { tool, ctx, calls } = createTools();
      await tool('codenod_list_prs')({ tab: 'everything' }, ctx());
      await tool('codenod_list_prs')(undefined, ctx());
      expect(calls.map((call) => call.args)).toEqual([[undefined], [undefined]]);
    });
  });

  describe('codenod_get_review', () => {
    it('returns the detail for a pull request reference', async () => {
      const { tool, ctx, calls } = createTools();
      const result = await tool('codenod_get_review')({ pr: 'acme/api#1' }, ctx());
      expect(result).toEqual(detailFixture('completed'));
      expect(calls[0].args).toEqual([{ host: 'github.com', owner: 'acme', name: 'api', number: 1 }]);
    });

    it('rejects a missing pull request reference', async () => {
      const { tool, ctx } = createTools();
      await expect(tool('codenod_get_review')(undefined, ctx())).rejects.toThrow('Cannot parse pull request reference ""');
    });
  });

  describe('codenod_review_pr', () => {
    it('starts a review with configured models and returns its id and status', async () => {
      const { tool, ctx, calls } = createTools();
      const result = await tool('codenod_review_pr')({ pr: 'acme/api#4' }, ctx());
      expect(result).toEqual({ reviewId: 'rev-new', status: 'queued' });
      expect(calls).toEqual([{ method: 'startReview', args: [{ host: 'github.com', owner: 'acme', name: 'api', number: 4 }, { models: undefined }] }]);
    });

    it('keeps only well-formed model entries', async () => {
      const { tool, ctx, calls } = createTools();
      await tool('codenod_review_pr')(
        { pr: 'acme/api#4', models: [{ providerId: 'claude-code', model: 'opus', reasoningLevel: 'high' }, { providerId: 'codex', model: 'gpt-5' }, null, 'opus', { providerId: 'x' }, { providerId: 7, model: 'opus' }, { providerId: 'codex', model: '  ' }] },
        ctx()
      );
      expect(calls[0].args[1]).toEqual({ models: [{ providerId: 'claude-code', model: 'opus', reasoningLevel: 'high' }, { providerId: 'codex', model: 'gpt-5' }] });
    });

    it('does not wait when the call is already aborted', async () => {
      const { tool, ctx, calls } = createTools();
      const result = await tool('codenod_review_pr')({ pr: 'acme/api#4', wait: true }, ctx(true));
      expect(result).toEqual({ reviewId: 'rev-new', status: 'queued' });
      expect(calls.map((call) => call.method)).toEqual(['startReview']);
    });

    it('waits and returns the detail when the review completes', async () => {
      const { tool, ctx, calls } = createTools();
      const result = await tool('codenod_review_pr')({ pr: 'acme/api#4', wait: true }, ctx());
      expect(result).toEqual(detailFixture('completed'));
      expect(calls.map((call) => call.method)).toEqual(['startReview', 'waitForReview', 'detail']);
    });

    it('waits and returns the failure when the review does not complete', async () => {
      const { tool, ctx } = createTools({ waitForReview: async () => review({ id: 'rev-new', status: 'failed', error: 'model crashed' }) });
      const result = await tool('codenod_review_pr')({ pr: 'acme/api#4', wait: true }, ctx());
      expect(result).toEqual({ reviewId: 'rev-new', status: 'failed', error: 'model crashed' });
    });

    it('rejects missing input', async () => {
      const { tool, ctx } = createTools();
      await expect(tool('codenod_review_pr')(null, ctx())).rejects.toThrow('Cannot parse pull request reference ""');
    });
  });
});

const LOCATION = { targetId: 'local:abc', projectId: 'p', worktreePath: '/work/app' };

function localDetail(overrides: Partial<LocalDetail> = {}): LocalDetail {
  const completed = detailFixture('completed');
  return {
    target: { id: LOCATION.targetId, projectId: 'p', worktreePath: '/work/app', branch: 'feat/x', lastScope: 'uncommitted', lastSeenAt: 0, createdAt: 0 },
    review: review({ id: 'rev-local', prId: LOCATION.targetId, targetKind: 'local' }),
    snapshot: {
      scope: 'uncommitted',
      baseRef: null,
      baseSha: 'a'.repeat(40),
      headSha: 'a'.repeat(40),
      snapshotSha: 'b'.repeat(40),
      treeSha: 'c'.repeat(40),
      intent: null,
      source: 'cli',
      files: [{ path: 'src/a.ts', status: 'modified', additions: 1, deletions: 0 }],
      skipped: [{ path: '.env', reason: 'possible-secret' }]
    },
    runs: completed.runs,
    findings: [finding({ severity: 'high' })],
    history: [],
    ...overrides
  };
}

function createLocal(overrides: Partial<LocalApp> = {}) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const record = (method: string, args: unknown[]) => void calls.push({ method, args });
  const local: LocalApp = {
    locationForPath: async (...args) => (record('locationForPath', args), LOCATION),
    resolveLocation: async (...args) => (record('resolveLocation', args), LOCATION),
    start: async (...args) => (record('start', args), review({ id: 'rev-local', status: 'queued', targetKind: 'local' })),
    detail: (...args) => (record('detail', args), localDetail()),
    status: async (reviewId) => ({ reviewId, stale: false, missing: false, reviewedTree: 'c', currentTree: 'c' }),
    threadWorkspacePath: async (...args) => (record('threadWorkspacePath', args), '/work/app/src'),
    ...overrides
  };
  return { local, calls };
}

describe('local review cli', () => {
  it('starts a review of the working directory without waiting', async () => {
    const { local, calls } = createLocal();
    const { cli } = createCli({ local });

    const result = await cli(['review-local', '--intent', 'Trim names'], { cwd: '/work/app/src' });

    expect(result).toEqual({ exitCode: 0, stdout: 'Local review rev-local queued. Check it with: zcc codenod show-local' });
    expect(calls).toEqual([
      { method: 'locationForPath', args: ['/work/app/src'] },
      { method: 'start', args: [{ projectId: 'p', worktreePath: '/work/app', scope: 'uncommitted', base: null, intent: 'Trim names', models: undefined, source: 'cli' }] }
    ]);
  });

  it('exits 1 when --fail-on finds active findings at or above the threshold', async () => {
    const { local } = createLocal();
    const { cli } = createCli({ local });

    const blocked = await cli(['review-local', '--path', '/work/app', '--scope', 'branch', '--base', 'origin/main', '--wait', '--fail-on', 'high']);
    const passed = await cli(['review-local', '--path', '/work/app', '--wait', '--fail-on', 'critical']);

    expect(blocked).toMatchObject({ exitCode: 1, stdout: expect.stringContaining('1 active finding(s) at or above high.') });
    expect(blocked.stdout).toContain('Skipped: .env (possible secret)');
    expect(passed).toMatchObject({ exitCode: 0, stdout: expect.stringContaining('0 active finding(s) at or above critical.') });
  });

  it('exits 1 when the review does not complete and reports staleness in JSON', async () => {
    const failing = createCli({ local: createLocal().local, waitForReview: async () => review({ id: 'rev-local', status: 'failed', error: 'crashed' }) });
    const stale = createCli({ local: createLocal({ status: async (reviewId) => ({ reviewId, stale: true, missing: false, reviewedTree: 'c', currentTree: 'd' }) }).local });

    const failed = await failing.cli(['review-local', '--wait'], { cwd: '/work/app' });
    const json = await stale.cli(['review-local', '--wait', '--json', '--fail-on', 'low'], { cwd: '/work/app' });

    expect(failed.exitCode).toBe(1);
    expect(json.exitCode).toBe(1);
    expect(JSON.parse(json.stdout!)).toMatchObject({ stale: true, blockingCount: 1 });
  });

  it('fails a --fail-on gate on a stale review even without blocking findings', async () => {
    const stale = createCli({ local: createLocal({ status: async (reviewId) => ({ reviewId, stale: true, missing: false, reviewedTree: 'c', currentTree: 'd' }) }).local });

    const gated = await stale.cli(['review-local', '--wait', '--fail-on', 'critical'], { cwd: '/work/app' });
    const ungated = await stale.cli(['review-local', '--wait'], { cwd: '/work/app' });

    expect(gated).toMatchObject({ exitCode: 1, stdout: expect.stringContaining('the result is stale; re-run the review.') });
    expect(gated.stdout).toContain('0 active finding(s) at or above critical.');
    expect(ungated.exitCode).toBe(0);
  });

  it('validates scope, --fail-on, and the working directory', async () => {
    const { cli } = createCli({ local: createLocal().local });

    await expect(cli(['review-local'])).resolves.toMatchObject({ exitCode: 1, stderr: expect.stringContaining('pass --path') });
    await expect(cli(['review-local', '--scope', 'all'], { cwd: '/w' })).resolves.toMatchObject({ stderr: expect.stringContaining('--scope must be one of') });
    await expect(cli(['review-local', '--fail-on', 'nit'], { cwd: '/w' })).resolves.toMatchObject({ stderr: expect.stringContaining('--fail-on must be one of') });
    await expect(cli(['review-local', '--fail-on', 'high'], { cwd: '/w' })).resolves.toMatchObject({ stderr: expect.stringContaining('--fail-on needs --wait') });
    await expect(createCli().cli(['show-local'], { cwd: '/w' })).resolves.toMatchObject({ stderr: expect.stringContaining('not available') });
  });

  it('shows the latest local review of the working directory', async () => {
    const { local } = createLocal();
    const { cli } = createCli({ local });

    const result = await cli(['show-local'], { cwd: '/work/app' });
    const missing = await createCli({ local: createLocal({ detail: () => null }).local }).cli(['show-local'], { cwd: '/work/app' });

    expect(result).toMatchObject({ exitCode: 0, stdout: expect.stringContaining('/work/app · feat/x') });
    expect(missing).toMatchObject({ exitCode: 1, stderr: expect.stringContaining('No local reviews for /work/app') });
  });
});

describe('codenod_review_local', () => {
  function createLocalTools(localOverrides: Partial<LocalApp> = {}, appOverrides: Partial<CodenodApp> = {}) {
    const { local, calls } = createLocal(localOverrides);
    const tools = createTools({ local, ...appOverrides });
    return { ...tools, calls };
  }

  it("reviews the calling thread's checkout quietly without waiting", async () => {
    const { tool, ctx, calls } = createLocalTools();

    const result = await tool('codenod_review_local')({}, ctx());

    expect(result).toEqual({ reviewId: 'rev-local', status: 'queued' });
    expect(calls).toEqual([
      { method: 'threadWorkspacePath', args: ['t'] },
      { method: 'locationForPath', args: ['/work/app/src', 'p'] },
      { method: 'start', args: [{ projectId: 'p', worktreePath: '/work/app', scope: 'uncommitted', base: null, intent: null, models: undefined, source: 'agent' }] }
    ]);
  });

  it('validates an explicit worktree path against the project', async () => {
    const { tool, ctx, calls } = createLocalTools();

    await tool('codenod_review_local')({ worktreePath: ' /work/other ', scope: 'staged' }, ctx());

    expect(calls[0]).toEqual({ method: 'resolveLocation', args: ['p', '/work/other'] });
    await expect(tool('codenod_review_local')({ scope: 'everything' }, ctx())).rejects.toThrow('scope must be one of');
  });

  it("fails clearly when the thread's checkout is unknown", async () => {
    const { tool, ctx } = createLocalTools({ threadWorkspacePath: async () => null });
    await expect(tool('codenod_review_local')({}, ctx())).rejects.toThrow("Could not find this thread's checkout");
  });

  it('returns stale instead of results when files changed during the review', async () => {
    const { tool, ctx } = createLocalTools({ status: async (reviewId) => ({ reviewId, stale: true, missing: false, reviewedTree: 'c', currentTree: 'd' }) });

    const result = await tool('codenod_review_local')({ wait: true }, ctx());

    expect(result).toMatchObject({ reviewId: 'rev-new', status: 'stale' });
  });

  it('returns blocking findings with the remediation gate and failures as status', async () => {
    const gated = createLocalTools();
    const failed = createLocalTools({}, { waitForReview: async () => review({ id: 'rev-local', status: 'failed', error: 'crashed' }) });

    const result = (await gated.tool('codenod_review_local')({ wait: true, remediationGate: true }, gated.ctx())) as { blockingCount: number };
    const failure = await failed.tool('codenod_review_local')({ wait: true }, failed.ctx());

    expect(result.blockingCount).toBe(1);
    expect(failure).toEqual({ reviewId: 'rev-local', status: 'failed', error: 'crashed' });
  });
});

describe('local views', () => {
  it('filters findings by severity threshold and skips dismissed ones', () => {
    const findings = [finding({ severity: 'critical' }), finding({ severity: 'medium' }), finding({ severity: 'high', dismissed: true })];
    expect(findingsAtOrAbove(findings, 'high').map((f) => f.severity)).toEqual(['critical']);
    expect(findingsAtOrAbove(findings, 'low').map((f) => f.severity)).toEqual(['critical', 'medium']);
  });

  it('formats an unreviewed location, a stale review, and a newer failed attempt', () => {
    const text = formatLocalDetail(localDetail({ latestAttempt: review({ status: 'failed', error: 'crashed' }) }), { stale: true });

    expect(formatLocalDetail(localDetail({ review: null, snapshot: null }))).toContain('Not reviewed yet');
    expect(text).toContain('(stale: files changed since this review)');
    expect(text).toContain('Latest rerun failed: crashed; showing previous completed results.');
  });
});

describe('views', () => {
  function createStore(data: {
    pullRequests?: PullRequestRow[];
    reviews?: ReviewRow[];
    runs?: ReviewRunRow[];
    findings?: ReturnType<typeof finding>[];
    posted?: PrDetail['posted'];
  }): Store {
    const reviews = data.reviews ?? [];
    return {
      listPullRequests: () => data.pullRequests ?? [],
      getPullRequest: (id: string) => (data.pullRequests ?? []).find((pr) => pr.id === id) ?? null,
      latestReview: (prId: string) => reviews.find((row) => row.prId === prId) ?? null,
      latestCompletedReview: (prId: string) => reviews.find((row) => row.prId === prId && row.status === 'completed') ?? null,
      latestReviewsByPr: () => new Map(reviews.map((row) => [row.prId, row])),
      listRuns: (reviewId: string) => (data.runs ?? []).filter((row) => row.reviewId === reviewId),
      listFindings: (reviewId: string) => (data.findings ?? []).filter((row) => row.reviewId === reviewId),
      countUndismissedFindings: (reviewIds: readonly string[]) => {
        const counts = new Map<string, number>();
        for (const reviewId of reviewIds) {
          const count = (data.findings ?? []).filter((row) => row.reviewId === reviewId && !row.dismissed).length;
          if (count > 0) counts.set(reviewId, count);
        }
        return counts;
      },
      listPostedReviews: () => data.posted ?? []
    } as unknown as Store;
  }

  describe('sortFindings', () => {
    it('orders by severity, then confidence, then file, then line, with unknown severities and lines last', () => {
      const findings = [
        finding({ id: 'unknown', severity: 'trivial' as never }),
        finding({ id: 'low', severity: 'low' }),
        finding({ id: 'b-file', file: 'b.ts', line: 1 }),
        finding({ id: 'a-line-5', file: 'a.ts', line: 5 }),
        finding({ id: 'a-no-line', file: 'a.ts', line: null }),
        finding({ id: 'confident', confidence: 1 }),
        finding({ id: 'critical', severity: 'critical', confidence: 0.1 })
      ];
      expect(sortFindings(findings).map((row) => row.id)).toEqual(['critical', 'confident', 'a-no-line', 'a-line-5', 'b-file', 'low', 'unknown']);
    });

    it('does not mutate its input', () => {
      const findings = [finding({ id: 'low', severity: 'low' }), finding({ id: 'high' })];
      sortFindings(findings);
      expect(findings.map((row) => row.id)).toEqual(['low', 'high']);
    });
  });

  describe('listPullRequests', () => {
    const fresh = pullRequest({ id: 'pr-1', headSha: 'sha1', buckets: ['mine'] });
    const moved = pullRequest({ id: 'pr-2', headSha: 'sha2', buckets: ['watched'] });
    const unreviewed = pullRequest({ id: 'pr-3', buckets: ['watched'] });
    const store = createStore({
      pullRequests: [fresh, moved, unreviewed],
      reviews: [review({ id: 'r1', prId: 'pr-1', headSha: 'sha1', status: 'completed' }), review({ id: 'r2', prId: 'pr-2', headSha: 'sha1', status: 'running' })],
      findings: [finding({ reviewId: 'r1' }), finding({ id: 'f2', reviewId: 'r1', dismissed: true }), finding({ id: 'f3', reviewId: 'r2' })]
    });

    it('attaches review summaries with stale state and undismissed finding counts', () => {
      const items = listPullRequests(store);
      expect(items.map((item) => item.review)).toEqual([
        { id: 'r1', status: 'completed', riskScore: 2, headSha: 'sha1', createdAt: expect.any(Number), stale: false, findingCount: 1 },
        { id: 'r2', status: 'running', riskScore: 2, headSha: 'sha1', createdAt: expect.any(Number), stale: true, findingCount: 0 },
        null
      ]);
    });

    it('filters by bucket', () => {
      expect(listPullRequests(store, 'watched').map((item) => item.id)).toEqual(['pr-2', 'pr-3']);
    });
  });

  describe('getPrDetail', () => {
    it('returns null for an unknown pull request', () => {
      expect(getPrDetail(createStore({}), 'missing')).toBeNull();
    });

    it('returns empty collections when the pull request has no review', () => {
      const pr = pullRequest();
      expect(getPrDetail(createStore({ pullRequests: [pr] }), pr.id)).toEqual({ pr, review: null, runs: [], findings: [], posted: [] });
    });

    it('returns the latest review with sorted findings, runs, and posted reviews', () => {
      const pr = pullRequest({ headSha: 'sha2' });
      const posted = [{ event: 'COMMENT', url: null, commentCount: 1, postedAt: 5 }];
      const store = createStore({
        pullRequests: [pr],
        reviews: [review({ id: 'rev', prId: pr.id, headSha: 'sha1' })],
        runs: [run()],
        findings: [finding({ id: 'low', severity: 'low' }), finding({ id: 'crit', severity: 'critical' })],
        posted
      });
      const result = getPrDetail(store, pr.id)!;
      expect(result.review).toMatchObject({ id: 'rev', stale: true });
      expect(result.runs).toEqual([run()]);
      expect(result.findings.map((row) => row.id)).toEqual(['crit', 'low']);
      expect(result.posted).toEqual(posted);
    });
  });

  describe('formatPrLine', () => {
    const summary = (overrides: Partial<NonNullable<PrListItem['review']>> = {}): PrListItem['review'] => ({
      id: 'r', status: 'completed', riskScore: 3, headSha: 'sha1', createdAt: 0, stale: false, findingCount: 2, ...overrides
    });

    it('marks unreviewed pull requests', () => {
      expect(formatPrLine(listItem())).toBe('acme/api#1  Add login  (@dev, CI success, not reviewed)\n  https://github.com/acme/api/pull/1');
    });

    it('shows risk and findings for a completed review, and flags drafts and stale reviews', () => {
      expect(formatPrLine(listItem({ isDraft: true, review: summary({ stale: true }) }))).toContain('acme/api#1 [draft]  Add login  (@dev, CI success, risk 3/10, 2 finding(s), stale)');
    });

    it('shows N/A when the risk score is missing', () => {
      expect(formatPrLine(listItem({ review: summary({ riskScore: null }) }))).toContain('risk N/A, 2 finding(s))');
    });

    it('shows the status for a review that is not completed', () => {
      expect(formatPrLine(listItem({ review: summary({ status: 'running' }) }))).toContain('(@dev, CI success, running)');
    });
  });

  describe('formatPrDetail', () => {
    it('suggests a review command when the pull request is not reviewed', () => {
      const output = formatPrDetail({ ...detailFixture('completed'), review: null });
      expect(output.split('\n').at(-1)).toBe('Not reviewed yet. Run: zcc codenod review https://github.com/acme/api/pull/1');
    });

    it('shows status, stale marker, and error for a failed review without scores', () => {
      const base = detailFixture('failed');
      const output = formatPrDetail({ ...base, review: { ...base.review!, stale: true } });
      expect(output).toContain('Review failed (stale: new commits since review) · a: completed, b: running, c: queued');
      expect(output).toContain('Error: boom');
      expect(output).not.toContain('Risk');
    });

    it('shows scores, consensus summary, and visible findings with agreement for multi-model reviews', () => {
      const base = detailFixture('completed');
      const output = formatPrDetail({
        ...base,
        review: { ...base.review!, hasRequirements: true, requirementsScore: 7, consensusSummary: 'All agree' },
        runs: [base.runs[0], { ...base.runs[1], status: 'failed' }],
        findings: [
          finding({ id: '0123456789', postedAt: 1 }),
          finding({ id: 'nolinefinding', line: null, suggestion: null, agreedBy: ['cursor/a'] }),
          finding({ id: 'dismissed', dismissed: true })
        ]
      });
      expect(output).toContain('Risk 2/10 · Coverage 8/10 · Requirements 7/10 · Simplicity 8/10 · Stability 8/10');
      expect(output).toContain('\nAll agree\n');
      expect(output).toContain('Findings (2):');
      expect(output).toContain('- 01234567 [high] logic [2/1] src/login.ts:12 (posted)\n  Null token crashes login\n  Fix: Guard the token');
      expect(output).toContain('- nolinefi [high] logic [1/1] src/login.ts\n  Null token crashes login');
      expect(output).not.toContain('dismissed');
    });

    it('falls back to the summary, marks missing requirements, and omits agreement for a single run', () => {
      const base = detailFixture('completed');
      const output = formatPrDetail({ ...base, runs: [base.runs[0]], findings: [finding()] });
      expect(output).toContain('Requirements N/A (no stated requirements)');
      expect(output).toContain('\nLooks fine\n');
      expect(output).toContain('- f1 [high] logic src/login.ts:12');
    });

    it('prints an empty summary line when the review has no summary at all', () => {
      const base = detailFixture('completed');
      const output = formatPrDetail({ ...base, review: { ...base.review!, summary: null, ...EMPTY_SCORES } });
      expect(output).toContain('Risk N/A · Coverage N/A');
      expect(output.endsWith('Stability N/A\n\n\n\nFindings (0):')).toBe(true);
    });
  });
});
