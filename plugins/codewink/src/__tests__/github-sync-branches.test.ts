import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore, type Store } from '../server/db.ts';
import {
  createTokenResolver,
  parseTokenSetting,
  runCommand,
  tokenFromGh,
  tokenFromGitCredential,
  type CommandRunner,
  type TokenResolver,
  type TokenSource
} from '../server/github/auth.ts';
import {
  combineCiState,
  createGitHubClient,
  repoFromRepositoryUrl,
  type FetchLike,
  type GhComment,
  type GhIssue,
  type GhPull,
  type GhSearchItem,
  type GitHubClient
} from '../server/github/client.ts';
import { gatherReviewContext } from '../server/review/context.ts';
import { createSyncService } from '../server/sync.ts';
import type { ChangedFile, PrRef, PullRequestRow } from '../server/types.ts';
import { createSqliteDatabase } from './fake-host.ts';

const REF: PrRef = { host: 'github.com', owner: 'acme', name: 'api', number: 7 };

function fakeResponse(status: number, text: string, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    text: async () => text
  };
}

function jsonResponse(body: unknown, status = 200) {
  return fakeResponse(status, JSON.stringify(body));
}

function staticTokens(token: string | null) {
  const invalidate = vi.fn();
  const resolver = {
    resolve: vi.fn(async () => (token ? { token, source: 'setting' as const } : null)),
    invalidate
  } as unknown as TokenResolver;
  return { resolver, invalidate };
}

function routeFetch(handler: (url: URL, init: Parameters<FetchLike>[1]) => ReturnType<typeof fakeResponse>) {
  const calls: Array<{ method: string; url: string; headers: Record<string, string>; body?: string }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ method: init.method, url, headers: init.headers, body: init.body });
    return handler(new URL(url), init);
  };
  return { fetchImpl, calls };
}

function clientFor(handler: Parameters<typeof routeFetch>[0], token: string | null = 'tok') {
  const { resolver, invalidate } = staticTokens(token);
  const { fetchImpl, calls } = routeFetch(handler);
  return { client: createGitHubClient(resolver, fetchImpl), calls, invalidate };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('GitHub client requests', () => {
  it('fails with 401 before calling GitHub when no token resolves', async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const client = createGitHubClient(staticTokens(null).resolver, fetchImpl);

    const result = client.viewer('git.example.com');

    await expect(result).rejects.toMatchObject({
      name: 'GitHubError',
      status: 401,
      message: expect.stringContaining('gh auth login --hostname git.example.com')
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends auth headers and adds a JSON body only for writes', async () => {
    const { client, calls } = clientFor((url) => (url.pathname === '/user' ? jsonResponse({ login: 'me' }) : jsonResponse({ id: 5 })));

    await client.viewer('github.com');
    const review = await client.createReview(REF, {
      commitId: 'sha1',
      event: 'COMMENT',
      body: 'Looks good',
      comments: [{ path: 'src/a.ts', line: 3, body: 'Nit' }]
    });

    expect(calls[0].url).toBe('https://api.github.com/user');
    expect(calls[0].headers.Authorization).toBe('Bearer tok');
    expect(calls[0].headers['Content-Type']).toBeUndefined();
    expect(calls[0].body).toBeUndefined();
    expect(calls[1]).toMatchObject({ method: 'POST', url: 'https://api.github.com/repos/acme/api/pulls/7/reviews' });
    expect(calls[1].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(calls[1].body ?? '')).toEqual({
      commit_id: 'sha1',
      event: 'COMMENT',
      body: 'Looks good',
      comments: [{ path: 'src/a.ts', line: 3, side: 'RIGHT', body: 'Nit' }]
    });
    expect(review).toEqual({ id: 5 });
  });

  it('invalidates the token on 401 and surfaces the GitHub message', async () => {
    const { client, invalidate } = clientFor(() => jsonResponse({ message: 'Bad credentials' }, 401));

    const result = client.viewer('github.com');

    await expect(result).rejects.toMatchObject({ status: 401, message: 'GitHub GET /user failed (401): Bad credentials' });
    expect(invalidate).toHaveBeenCalledWith('github.com');
  });

  it('reports rate limiting on a 403 with no remaining requests', async () => {
    const { client, invalidate } = clientFor(() =>
      fakeResponse(403, JSON.stringify({ message: 'API rate limit exceeded' }), { 'x-ratelimit-remaining': '0' })
    );

    const result = client.getPull(REF);

    await expect(result).rejects.toMatchObject({
      status: 403,
      message: 'GitHub GET /repos/acme/api/pulls/7 failed (403): GitHub rate limit reached on github.com. Try again later.'
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('keeps the GitHub message on a 403 that is not rate limited', async () => {
    const { client } = clientFor(() =>
      fakeResponse(403, JSON.stringify({ message: 'Resource not accessible' }), { 'x-ratelimit-remaining': '42' })
    );

    await expect(client.getPull(REF)).rejects.toMatchObject({ status: 403, message: expect.stringContaining('Resource not accessible') });
  });

  it('falls back to a truncated raw body for non-JSON or message-less errors', async () => {
    const bodies = new Map<string, ReturnType<typeof fakeResponse>>([
      ['/repos/acme/api/issues/1', fakeResponse(502, '<html>Bad gateway</html>')],
      ['/repos/acme/api/issues/2', fakeResponse(500, '{"error":"boom"}')],
      ['/repos/acme/api/issues/3', fakeResponse(503, 'x'.repeat(400))]
    ]);
    const { client } = clientFor((url) => bodies.get(url.pathname) ?? jsonResponse({}, 404));

    const nonJson = client.getIssue(REF, 1);
    const messageless = client.getIssue(REF, 2);
    const long = client.getIssue(REF, 3).catch((error: Error) => error);

    await expect(nonJson).rejects.toMatchObject({ status: 502, message: expect.stringMatching(/\(502\): <html>Bad gateway<\/html>$/) });
    await expect(messageless).rejects.toMatchObject({ status: 500, message: expect.stringMatching(/\(500\): \{"error":"boom"\}$/) });
    const longError = (await long) as Error;
    expect(longError.message.endsWith(`(503): ${'x'.repeat(300)}`)).toBe(true);
    expect(longError.message).not.toContain('x'.repeat(301));
  });

  it('wraps network failures with status 0', async () => {
    const errors: unknown[] = [new Error('ECONNRESET'), 'offline'];
    const client = createGitHubClient(staticTokens('tok').resolver, async () => {
      throw errors.shift();
    });

    await expect(client.viewer('github.com')).rejects.toMatchObject({ status: 0, message: 'GitHub request to github.com failed: ECONNRESET' });
    await expect(client.viewer('github.com')).rejects.toMatchObject({ status: 0, message: 'GitHub request to github.com failed: offline' });
  });

  it('times out slow requests with status 408', async () => {
    vi.useFakeTimers();
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const client = createGitHubClient(staticTokens('tok').resolver, fetchImpl);

    const assertion = expect(client.viewer('github.com')).rejects.toMatchObject({ status: 408, message: 'GitHub request to github.com timed out' });
    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
  });

  it('returns null for an empty successful body', async () => {
    const { client } = clientFor(() => fakeResponse(204, ''));

    await expect(client.getPull(REF)).resolves.toBeNull();
  });
});

describe('GitHub client pagination and endpoints', () => {
  it('follows file pages until a short page and defaults missing patches to null', async () => {
    const file = (index: number) => ({ filename: `f${index}.ts`, status: 'added', additions: 1, deletions: 0, patch: '@@' });
    const { client, calls } = clientFor((url) => {
      const page = Number(url.searchParams.get('page'));
      if (page === 1) return jsonResponse(Array.from({ length: 100 }, (_, index) => file(index)));
      return jsonResponse([{ filename: 'bin.png', status: 'modified', additions: 0, deletions: 0 }]);
    });

    const files = await client.listFiles(REF);

    expect(files).toHaveLength(101);
    expect(files[100]).toEqual({ path: 'bin.png', status: 'modified', additions: 0, deletions: 0, patch: null });
    expect(calls.map((call) => call.url)).toEqual([
      'https://api.github.com/repos/acme/api/pulls/7/files?per_page=100&page=1',
      'https://api.github.com/repos/acme/api/pulls/7/files?per_page=100&page=2'
    ]);
  });

  it('stops comment pagination at three full pages', async () => {
    const comment = { id: 1, user: null, body: 'hi', created_at: '2026-10-25T00:00:00Z' };
    const { client, calls } = clientFor(() => jsonResponse(Array.from({ length: 100 }, () => comment)));

    const reviewComments = await client.listReviewComments(REF);
    const issueComments = await client.listIssueComments(REF);

    expect(reviewComments).toHaveLength(300);
    expect(issueComments).toHaveLength(300);
    expect(calls).toHaveLength(6);
    expect(calls[2].url).toBe('https://api.github.com/repos/acme/api/pulls/7/comments?sort=created&direction=desc&per_page=100&page=3');
    expect(calls[5].url).toBe('https://api.github.com/repos/acme/api/issues/7/comments?sort=created&direction=desc&per_page=100&page=3');
  });

  it('caps search page size and tolerates a missing items field', async () => {
    const { client, calls } = clientFor((url) =>
      url.searchParams.get('per_page') === '20' ? jsonResponse({ total_count: 0 }) : jsonResponse({ items: [{ number: 1 }] })
    );

    const capped = await client.searchPullRequests('github.com', 'is:pr author:@me', 20);
    const defaulted = await client.searchPullRequests('github.com', 'is:pr', 500);

    expect(capped).toEqual({ items: [], complete: true });
    expect(defaulted).toEqual({ items: [{ number: 1 }], complete: true });
    expect(new URL(calls[0].url).searchParams.get('q')).toBe('is:pr author:@me');
    expect(new URL(calls[1].url).searchParams.get('per_page')).toBe('100');
  });

  it('decodes base64 file contents and encodes the path and ref', async () => {
    const { client, calls } = clientFor(() => jsonResponse({ content: Buffer.from('# Spec').toString('base64'), encoding: 'base64' }));

    const text = await client.getFileText(REF, 'docs/my spec.md', 'feat/x');

    expect(text).toBe('# Spec');
    expect(calls[0].url).toBe('https://api.github.com/repos/acme/api/contents/docs/my%20spec.md?ref=feat%2Fx');
  });

  it('returns null for missing, non-base64, empty, or not-found file contents', async () => {
    const responses = new Map<string, ReturnType<typeof fakeResponse>>([
      ['dir', jsonResponse({ size: 0 })],
      ['raw.md', jsonResponse({ content: 'plain', encoding: 'utf-8' })],
      ['empty.md', fakeResponse(200, '')],
      ['gone.md', jsonResponse({ message: 'Not Found' }, 404)]
    ]);
    const { client } = clientFor((url) => responses.get(url.pathname.split('/').pop() ?? '') ?? jsonResponse({}, 500));

    const results = await Promise.all(['dir', 'raw.md', 'empty.md', 'gone.md'].map((path) => client.getFileText(REF, path, 'main')));

    expect(results).toEqual([null, null, null, null]);
  });

  it('rethrows file errors other than 404', async () => {
    const { client } = clientFor(() => jsonResponse({ message: 'Server Error' }, 500));

    await expect(client.getFileText(REF, 'docs/spec.md', 'main')).rejects.toMatchObject({ status: 500 });
  });

  it('propagates CI request failures and treats missing check runs as empty', async () => {
    const failing = clientFor(() => jsonResponse({ message: 'nope' }, 500));
    const partial = clientFor((url) =>
      url.pathname.endsWith('/status') ? jsonResponse({ state: 'success', total_count: 1 }) : jsonResponse({ total_count: 0, check_runs: [] })
    );

    await expect(failing.client.ciState(REF, 'sha1')).rejects.toMatchObject({ status: 500 });
    await expect(partial.client.ciState(REF, 'sha1')).resolves.toBe('success');
  });

  it('pages check runs and does not report success when a later page cannot be read', async () => {
    const { client, calls } = clientFor((url) => {
      if (url.pathname.endsWith('/status')) return jsonResponse({ state: 'success', total_count: 0 });
      const page = Number(url.searchParams.get('page'));
      if (page < 10) return jsonResponse({ total_count: 1001, check_runs: Array.from({ length: 100 }, () => ({ status: 'completed', conclusion: 'success' })) });
      return jsonResponse({ message: 'nope' }, 500);
    });

    await expect(client.ciState(REF, 'sha1')).rejects.toMatchObject({ status: 500 });
    expect(calls.filter((call) => call.url.includes('/check-runs'))).toHaveLength(10);
  });

  it('reads the next check-run page when total_count is omitted', async () => {
    const { client } = clientFor((url) => {
      if (url.pathname.endsWith('/status')) return jsonResponse({ state: 'success', total_count: 0 });
      const page = Number(url.searchParams.get('page'));
      if (page === 1) return jsonResponse({ check_runs: Array.from({ length: 100 }, () => ({ status: 'completed', conclusion: 'success' })) });
      return jsonResponse({ check_runs: [{ status: 'completed', conclusion: 'failure' }] });
    });

    await expect(client.ciState(REF, 'sha1')).resolves.toBe('failure');
  });

  it('builds enterprise API URLs for issues', async () => {
    const issue: GhIssue = { number: 3, title: 'Bug', body: null, labels: [] };
    const { client, calls } = clientFor(() => jsonResponse(issue));

    const result = await client.getIssue({ host: 'git.example.com', owner: 'acme', name: 'api' }, 3);

    expect(result).toEqual(issue);
    expect(calls[0].url).toBe('https://git.example.com/api/v3/repos/acme/api/issues/3');
  });
});

describe('combineCiState', () => {
  const none = { state: 'pending', total_count: 0 };

  it('combines check runs and commit statuses', () => {
    expect(combineCiState([], none)).toBe('none');
    expect(combineCiState([{ status: 'completed', conclusion: 'timed_out' }], none)).toBe('failure');
    expect(combineCiState([{ status: 'completed', conclusion: 'success' }], { state: 'error', total_count: 1 })).toBe('failure');
    expect(combineCiState([], { state: 'failure', total_count: 2 })).toBe('failure');
    expect(combineCiState([{ status: 'in_progress', conclusion: null }], none)).toBe('pending');
    expect(combineCiState([], { state: 'pending', total_count: 1 })).toBe('pending');
    expect(combineCiState([{ status: 'completed', conclusion: 'neutral' }], { state: 'success', total_count: 1 })).toBe('success');
    expect(combineCiState([{ status: 'completed', conclusion: 'success' }], { state: 'failure', total_count: 0 })).toBe('success');
  });
});

describe('repoFromRepositoryUrl', () => {
  it('extracts and decodes owner and name, or returns null', () => {
    expect(repoFromRepositoryUrl('https://git.example.com/api/v3/repos/my%20org/api')).toEqual({ owner: 'my org', name: 'api' });
    expect(repoFromRepositoryUrl('https://api.github.com/users/acme')).toBeNull();
  });
});

describe('command runner', () => {
  it('returns trimmed stdout for a successful command', async () => {
    await expect(runCommand(process.execPath, ['-e', 'process.stdout.write("  out  ")'])).resolves.toBe('out');
  });

  it('pipes input to stdin', async () => {
    await expect(runCommand(process.execPath, ['-e', 'process.stdin.pipe(process.stdout)'], { input: 'hello' })).resolves.toBe('hello');
  });

  it('returns null for a non-zero exit, a missing command, or an invalid command', async () => {
    await expect(runCommand(process.execPath, ['-e', 'process.exit(3)'])).resolves.toBeNull();
    await expect(runCommand('codewink-missing-command-for-tests', [])).resolves.toBeNull();
    await expect(runCommand('bad\0command', [])).resolves.toBeNull();
  });

  it('returns null when the command exceeds its timeout', async () => {
    await expect(runCommand(process.execPath, ['-e', 'setTimeout(() => {}, 10000)'], { timeoutMs: 50 })).resolves.toBeNull();
  });
});

describe('token sources', () => {
  it('ignores empty settings and entries missing a host or token', () => {
    expect(parseTokenSetting(undefined).size).toBe(0);
    expect(parseTokenSetting('ghe.corp=, =tok, ,ghe.corp=real').get('ghe.corp')).toBe('real');
    expect(parseTokenSetting('ghe.corp=, =tok').size).toBe(0);
  });

  it('rejects gh output containing whitespace', async () => {
    const run: CommandRunner = async () => 'You are not logged in';

    await expect(tokenFromGh('github.com', run)).resolves.toBeNull();
  });

  it('returns null when git credential has no usable password', async () => {
    const outputs = ['protocol=https\nhost=github.com\nusername=me\n', 'protocol=https\npassword=   \n', null];
    const run: CommandRunner = async () => outputs.shift() ?? null;

    await expect(tokenFromGitCredential('github.com', run)).resolves.toBeNull();
    await expect(tokenFromGitCredential('github.com', run)).resolves.toBeNull();
    await expect(tokenFromGitCredential('github.com', run)).resolves.toBeNull();
  });

  it('caches results, including misses, until the TTL elapses', async () => {
    let clock = 0;
    let setting = '';
    const run = vi.fn<CommandRunner>(async () => null);
    const resolver = createTokenResolver({ run, readTokenSetting: async () => setting, cacheTtlMs: 100, now: () => clock });

    await expect(resolver.resolve('github.com')).resolves.toBeNull();
    setting = 'ghp_pasted';
    clock = 99;
    await expect(resolver.resolve('github.com')).resolves.toBeNull();
    clock = 100;
    await expect(resolver.resolve('github.com')).resolves.toEqual({ token: 'ghp_pasted', source: 'setting' });
    expect(run).toHaveBeenCalledTimes(4);
  });

  it('retries a missing token after fifteen seconds so a new sign-in is picked up', async () => {
    let clock = 0;
    let signedIn = false;
    const run = vi.fn<CommandRunner>(async (command) => (command === 'gh' && signedIn ? 'gho_new' : null));
    const resolver = createTokenResolver({ run, readTokenSetting: async () => '', now: () => clock });

    await expect(resolver.resolve('github.com')).resolves.toBeNull();
    signedIn = true;
    clock = 14_999;
    await expect(resolver.resolve('github.com')).resolves.toBeNull();
    clock = 15_000;
    await expect(resolver.resolve('github.com')).resolves.toEqual({ token: 'gho_new', source: 'gh' });
  });

  it('uses a ten minute default TTL', async () => {
    let clock = 0;
    const run = vi.fn<CommandRunner>(async () => 'gho_token');
    const resolver = createTokenResolver({ run, readTokenSetting: async () => '', now: () => clock });

    await resolver.resolve('github.com');
    clock = 10 * 60_000 - 1;
    await resolver.resolve('github.com');
    clock = 10 * 60_000;
    await resolver.resolve('github.com');

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('clears every host when invalidated without a host', async () => {
    const run = vi.fn<CommandRunner>(async () => 'gho_token');
    const resolver = createTokenResolver({ run, readTokenSetting: async () => '' });
    await resolver.resolve('github.com');
    await resolver.resolve('ghe.corp');

    resolver.invalidate();
    await resolver.resolve('github.com');
    await resolver.resolve('ghe.corp');

    expect(run).toHaveBeenCalledTimes(4);
  });
});

function ghPull(overrides: Partial<GhPull> = {}): GhPull {
  return {
    number: 1,
    title: 'Add feature',
    body: null,
    html_url: 'https://github.com/acme/api/pull/1',
    state: 'open',
    draft: true,
    user: { login: 'teammate' },
    head: { sha: 'sha1', ref: 'feat', repo: { full_name: 'acme/api' } },
    base: { ref: 'main', repo: { full_name: 'acme/api' } },
    updated_at: 't1',
    ...overrides
  };
}

function searchItem(number: number, repo = 'acme/api', updatedAt = 't1'): GhSearchItem {
  return {
    number,
    title: `PR ${number}`,
    html_url: `https://github.com/${repo}/pull/${number}`,
    repository_url: `https://api.github.com/repos/${repo}`,
    updated_at: updatedAt,
    user: null
  };
}

function storedPull(overrides: Partial<Omit<PullRequestRow, 'syncedAt'>> = {}): Omit<PullRequestRow, 'syncedAt'> {
  return {
    id: 'github.com/acme/api#1',
    host: 'github.com',
    owner: 'acme',
    repo: 'api',
    number: 1,
    title: 'Add feature',
    author: 'teammate',
    url: 'https://github.com/acme/api/pull/1',
    state: 'open',
    isDraft: false,
    headSha: 'sha1',
    headRef: 'feat',
    baseRef: 'main',
    ciState: 'pending',
    buckets: ['watched'],
    updatedAt: 't0',
    ...overrides
  };
}

function tokensFor(sources: Record<string, TokenSource | null>): TokenResolver {
  return {
    resolve: vi.fn(async (host: string) => {
      const source = sources[host];
      return source ? { token: 'tok', source } : null;
    }),
    invalidate: vi.fn()
  } as unknown as TokenResolver;
}

function githubStub(overrides: Record<string, unknown> = {}) {
  return {
    viewer: vi.fn(async () => ({ login: 'me' })),
    searchPullRequests: vi.fn(async (): Promise<GhSearchItem[]> => []),
    getPull: vi.fn(async (ref: PrRef) => ghPull({ number: ref.number })),
    ciState: vi.fn(async () => 'success'),
    ...overrides
  };
}

function syncFixture(options: { github?: Record<string, unknown>; hosts?: string[]; sources?: Record<string, TokenSource | null>; repos?: string[] } = {}) {
  const store: Store = createStore(createSqliteDatabase(), () => 1_000);
  for (const name of options.repos ?? ['api']) store.upsertRepo({ id: `github.com/acme/${name}`, host: 'github.com', owner: 'acme', name });
  const github = githubStub(options.github);
  const hosts = vi.fn(async () => options.hosts ?? ['github.com']);
  const sync = createSyncService({
    store,
    github: github as unknown as GitHubClient,
    tokens: tokensFor(options.sources ?? { 'github.com': 'gh' }),
    hosts,
    now: () => Date.UTC(2026, 9, 25)
  });
  return { store, github, hosts, sync };
}

describe('sync service', () => {
  it('ignores results outside watched repositories and merges buckets for one PR', async () => {
    const { store, github, sync } = syncFixture({
      github: {
        searchPullRequests: vi.fn(async (_host: string, query: string) => {
          if (query.includes('review-requested:@me')) {
            return [searchItem(1), searchItem(2, 'other/repo'), { ...searchItem(3), repository_url: 'https://example.com/bad' }];
          }
          return [searchItem(1)];
        })
      }
    });

    const result = await sync.syncAll();

    expect(result.hosts[0]).toMatchObject({ host: 'github.com', authSource: 'gh', login: 'me', error: null, pullRequestCount: 1 });
    expect(result.changed.map((row) => row.id)).toEqual(['github.com/acme/api#1']);
    expect(store.getPullRequest('github.com/acme/api#1')).toMatchObject({
      buckets: ['needs-review', 'mine', 'watched'],
      isDraft: true,
      ciState: 'success'
    });
    expect(github.getPull).toHaveBeenCalledTimes(1);
  });

  it('refreshes only CI for unchanged PRs and keeps the stored CI state when that fails', async () => {
    const { store, github, sync } = syncFixture({
      github: {
        searchPullRequests: vi.fn(async () => [searchItem(1, 'acme/api', 't0')]),
        ciState: vi.fn(async () => {
          throw new Error('ci down');
        })
      }
    });
    store.upsertPullRequest(storedPull());

    const first = await sync.syncAll();
    const second = await sync.syncAll();

    expect(github.getPull).not.toHaveBeenCalled();
    expect(first.changed).toEqual([]);
    expect(store.getPullRequest('github.com/acme/api#1')).toMatchObject({ ciState: 'pending', buckets: ['needs-review', 'mine', 'watched'] });
    expect(github.viewer).toHaveBeenCalledTimes(2);
    expect(second.hosts[0].syncedAt).toBe(Date.UTC(2026, 9, 25));
  });

  it('does not report a change when an updated PR keeps its head commit', async () => {
    const { store, sync } = syncFixture({ github: { searchPullRequests: vi.fn(async () => [searchItem(1)]) } });
    store.upsertPullRequest(storedPull());

    const result = await sync.syncAll();

    expect(result.changed).toEqual([]);
    expect(store.getPullRequest('github.com/acme/api#1')?.updatedAt).toBe('t1');
  });

  it('keeps the stored row with new buckets when refreshing a known PR fails', async () => {
    const { store, sync } = syncFixture({
      github: {
        searchPullRequests: vi.fn(async (_host: string, query: string) => (query.includes('author:@me') ? [searchItem(1)] : [])),
        getPull: vi.fn(async () => {
          throw new Error('boom');
        })
      }
    });
    store.upsertPullRequest(storedPull());

    const result = await sync.syncAll();

    expect(result.hosts[0].error).toBeNull();
    expect(store.getPullRequest('github.com/acme/api#1')).toMatchObject({ buckets: ['mine'], updatedAt: 't0' });
  });

  it('reports an error when a new PR cannot be fetched', async () => {
    const { sync } = syncFixture({
      github: {
        searchPullRequests: vi.fn(async () => [searchItem(1)]),
        getPull: vi.fn(async () => {
          throw new Error('boom');
        })
      }
    });

    const result = await sync.syncAll();

    expect(result.hosts[0]).toMatchObject({ error: 'boom', pullRequestCount: 0, syncedAt: null });
    expect(result.changed).toEqual([]);
  });

  it('keeps each search query within 256 characters and continues after a failed query', async () => {
    const longName = 'n'.repeat(210);
    const { github, store, sync } = syncFixture({
      repos: ['short', longName],
      github: {
        searchPullRequests: vi.fn(async (_host: string, query: string) => {
          if (query.includes('review-requested:@me')) throw new Error('query failed');
          if (query.includes('author:@me') && query.includes('repo:acme/short')) return [searchItem(1, 'acme/short')];
          return [];
        }),
        getPull: vi.fn(async (ref: PrRef) =>
          ghPull({
            number: ref.number,
            head: { sha: 'sha1', ref: 'feat', repo: { full_name: `${ref.owner}/${ref.name}` } },
            base: { ref: 'main', repo: { full_name: `${ref.owner}/${ref.name}` } }
          })
        )
      }
    });
    store.upsertPullRequest(storedPull({ id: 'github.com/acme/other#9', owner: 'acme', repo: 'other', number: 9 }));

    const result = await sync.syncAll();

    const queries = github.searchPullRequests.mock.calls.map((call) => String((call as unknown[])[1]));
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.every((query) => query.length <= 256)).toBe(true);
    expect(queries.some((query) => query.includes('review-requested:@me') && query.includes(`repo:acme/${longName}`))).toBe(false);
    expect(queries.some((query) => !query.includes('review-requested:@me') && !query.includes('author:@me') && query.includes(`repo:acme/${longName}`))).toBe(true);
    expect(queries.some((query) => query.includes('repo:acme/short') && query.includes(`repo:acme/${longName}`))).toBe(false);
    expect(result.hosts[0].error).toBeNull();
    expect(store.getPullRequest('github.com/acme/short#1')).toMatchObject({ buckets: ['mine'] });
    expect(store.getPullRequest('github.com/acme/other#9')?.state).toBe('open');
  });

  it('does not close pull requests when a repository cannot fit in a search query', async () => {
    const { github, store, sync } = syncFixture({ repos: ['n'.repeat(240)] });
    store.upsertPullRequest(storedPull());

    const result = await sync.syncAll();

    expect(github.searchPullRequests).not.toHaveBeenCalled();
    expect(result.hosts[0].error).toBeNull();
    expect(store.getPullRequest('github.com/acme/api#1')?.state).toBe('open');
  });

  it('does not close open pull requests when the search inventory is incomplete', async () => {
    const { store, sync } = syncFixture({ github: { searchPullRequests: vi.fn(async () => ({ items: [], complete: false })) } });
    store.upsertPullRequest(storedPull());

    await sync.syncAll();

    expect(store.getPullRequest('github.com/acme/api#1')?.state).toBe('open');
  });

  it('closes stored PRs without searching when nothing is watched', async () => {
    const { store, github, sync } = syncFixture({ repos: [] });
    store.upsertPullRequest(storedPull());

    const result = await sync.syncAll();

    expect(github.searchPullRequests).not.toHaveBeenCalled();
    expect(result.hosts[0].pullRequestCount).toBe(0);
    expect(store.getPullRequest('github.com/acme/api#1')?.state).toBe('closed');
  });

  it('reports hosts without a token and hosts whose viewer lookup fails', async () => {
    const { sync } = syncFixture({
      hosts: ['github.com', 'ghe.corp'],
      sources: { 'github.com': 'setting', 'ghe.corp': null },
      github: {
        viewer: vi.fn(async () => {
          throw new Error('Bad credentials');
        })
      }
    });

    const result = await sync.syncAll();

    expect(result.hosts).toEqual([
      expect.objectContaining({ host: 'github.com', authSource: 'setting', login: null, error: 'Bad credentials' }),
      expect.objectContaining({ host: 'ghe.corp', authSource: null, error: expect.stringContaining('gh auth login --hostname ghe.corp') })
    ]);
  });

  it('shares one run between concurrent sync calls', async () => {
    const { hosts, sync } = syncFixture();

    const first = sync.syncAll();
    const second = sync.syncAll();
    const syncing = sync.isSyncing();

    expect(await second).toBe(await first);
    expect(syncing).toBe(true);
    expect(sync.isSyncing()).toBe(false);
    expect(hosts).toHaveBeenCalledTimes(1);
  });

  it('maps merged, closed, and authorless pulls and falls back to no CI', async () => {
    const pulls = [ghPull({ state: 'closed', merged: true, user: null, draft: undefined }), ghPull({ state: 'closed', merged: false })];
    const { store, sync } = syncFixture({
      github: {
        getPull: vi.fn(async () => pulls.shift()),
        ciState: vi.fn(async () => {
          throw new Error('ci down');
        })
      }
    });

    const merged = await sync.syncPullRequest({ host: 'github.com', owner: 'acme', name: 'api', number: 1 });
    store.upsertPullRequest({ ...storedPull(), buckets: ['mine'] });
    const closed = await sync.syncPullRequest({ host: 'github.com', owner: 'acme', name: 'api', number: 1 });

    expect(merged).toMatchObject({ state: 'merged', author: 'unknown', isDraft: false, ciState: 'none', buckets: [] });
    expect(closed).toMatchObject({ state: 'closed', author: 'teammate', buckets: ['mine'] });
  });

  it('describes host status before and after a sync', async () => {
    const { sync } = syncFixture({ hosts: ['github.com', 'ghe.corp'], sources: { 'github.com': 'gh', 'ghe.corp': null } });

    const initial = await sync.hostStatuses();
    await sync.viewerProfiles();
    const afterProfiles = await sync.hostStatuses();
    await sync.syncAll();
    const afterSync = await sync.hostStatuses();

    expect(initial).toEqual([
      { host: 'github.com', authSource: 'gh', login: null, error: null, pullRequestCount: 0, syncedAt: null },
      { host: 'ghe.corp', authSource: null, login: null, error: null, pullRequestCount: 0, syncedAt: null }
    ]);
    expect(afterProfiles[0].login).toBe('me');
    expect(afterSync[0].syncedAt).toBe(Date.UTC(2026, 9, 25));
    expect(afterSync[1].error).toContain('Not signed in');
  });

  it('lists viewer profiles for signed-in hosts and skips failing lookups', async () => {
    const { sync } = syncFixture({
      hosts: ['github.com', 'ghe.corp', 'broken.host', 'quiet.host'],
      sources: { 'github.com': 'gh', 'ghe.corp': null, 'broken.host': 'gh', 'quiet.host': 'setting' },
      github: {
        viewer: vi.fn(async (host: string) => {
          if (host === 'broken.host') throw new Error('down');
          if (host === 'quiet.host') return { login: 'q', name: '', email: null };
          return { login: 'me', name: 'Mona', email: 'mona@example.com', avatar_url: 'https://avatars.example/me' };
        })
      }
    });

    const profiles = await sync.viewerProfiles();

    expect(profiles).toEqual([
      { host: 'github.com', login: 'me', name: 'Mona', email: 'mona@example.com', avatarUrl: 'https://avatars.example/me' },
      { host: 'quiet.host', login: 'q', name: null, email: null, avatarUrl: null }
    ]);
    await expect(sync.viewerLogin('github.com')).resolves.toBe('me');
  });

  it('refreshes the viewer on each sync and after the token is invalidated', async () => {
    let login = 'old';
    const tokens = tokensFor({ 'github.com': 'gh' });
    const github = githubStub({ viewer: vi.fn(async () => ({ login })) });
    const store = createStore(createSqliteDatabase(), () => 1_000);
    store.upsertRepo({ id: 'github.com/acme/api', host: 'github.com', owner: 'acme', name: 'api' });
    const sync = createSyncService({
      store,
      github: github as unknown as GitHubClient,
      tokens,
      hosts: async () => ['github.com'],
      now: () => Date.UTC(2026, 9, 25)
    });

    await sync.syncAll();
    login = 'new';
    await sync.syncAll();
    expect((await sync.hostStatuses())[0].login).toBe('new');

    login = 'newer';
    tokens.invalidate('github.com');
    expect((await sync.viewerProfiles())[0].login).toBe('newer');
  });

  it('discovers active unwatched repositories ranked by PR count', async () => {
    const { github, sync } = syncFixture({
      hosts: ['github.com', 'ghe.corp', 'flaky.host'],
      sources: { 'github.com': 'gh', 'ghe.corp': null, 'flaky.host': 'gh' },
      github: {
        searchPullRequests: vi.fn(async (host: string) => {
          if (host === 'flaky.host') throw new Error('search down');
          return [
            searchItem(1, 'acme/api'),
            searchItem(2, 'acme/cli'),
            searchItem(3, 'acme/web'),
            searchItem(4, 'acme/web'),
            { ...searchItem(5), repository_url: 'not-a-repo' }
          ];
        })
      }
    });

    const repos = await sync.discoverActiveRepos();

    expect(repos).toEqual([
      { id: 'github.com/acme/web', host: 'github.com', owner: 'acme', name: 'web', pullRequests: 2 },
      { id: 'github.com/acme/cli', host: 'github.com', owner: 'acme', name: 'cli', pullRequests: 1 }
    ]);
    expect(github.searchPullRequests).toHaveBeenCalledTimes(2);
    expect(github.searchPullRequests).toHaveBeenCalledWith('github.com', 'is:pr involves:@me updated:>=2026-09-25');
  });
});

function contextGithub(overrides: Record<string, unknown> = {}) {
  return {
    getPull: vi.fn(async () => ghPull()),
    listFiles: vi.fn(async (): Promise<ChangedFile[]> => []),
    listReviewComments: vi.fn(async (): Promise<GhComment[]> => []),
    listIssueComments: vi.fn(async (): Promise<GhComment[]> => []),
    getIssue: vi.fn(async (): Promise<GhIssue> => ({ number: 1, title: 'Issue', body: null, labels: [] })),
    getFileText: vi.fn(async (): Promise<string | null> => null),
    ...overrides
  };
}

function comment(overrides: Partial<GhComment>): GhComment {
  return { id: 1, user: { login: 'human' }, body: 'Looks fine', created_at: '2026-10-25T00:00:00Z', ...overrides };
}

describe('review context', () => {
  it('uses fallbacks for a pull without author or description', async () => {
    const github = contextGithub({ getPull: vi.fn(async () => ghPull({ user: null, body: null })) });

    const context = await gatherReviewContext(github as unknown as GitHubClient, REF, { specGlob: null });

    expect(context.prompt).toMatchObject({
      repository: 'github.com/acme/api',
      prNumber: 7,
      prTitle: 'Add feature',
      prDescription: null,
      author: 'unknown',
      headRef: 'feat',
      baseRef: 'main',
      linkedIssues: [],
      specFiles: [],
      priorComments: []
    });
    expect(github.getIssue).not.toHaveBeenCalled();
    expect(github.getFileText).not.toHaveBeenCalled();
  });

  it('collects linked issues, skipping pull requests and inaccessible issues', async () => {
    const github = contextGithub({
      getPull: vi.fn(async () => ghPull({ body: 'Fixes #12, closes #13, see #14' })),
      getIssue: vi.fn(async (_repo: unknown, number: number): Promise<GhIssue> => {
        if (number === 13) return { number, title: 'A PR', body: null, labels: [], pull_request: {} };
        if (number === 14) throw new Error('Not Found');
        return { number, title: 'Names must be trimmed', body: 'Trim it', labels: ['bug', { name: 'ui' }, { name: '' }] };
      })
    });

    const context = await gatherReviewContext(github as unknown as GitHubClient, REF, { specGlob: null });

    expect(context.prompt.linkedIssues).toEqual([{ reference: 'acme/api#12', title: 'Names must be trimmed', body: 'Trim it', labels: ['bug', 'ui'] }]);
    expect(github.getIssue).toHaveBeenCalledTimes(3);
  });

  it('loads changed and referenced spec files, skipping removed, blank, and unreadable ones', async () => {
    const files: ChangedFile[] = [
      { path: 'docs/a.md', status: 'modified', additions: 1, deletions: 0, patch: '@@ -1 +1 @@\n-old\n+new' },
      { path: 'docs/gone.md', status: 'removed', additions: 0, deletions: 1, patch: null },
      { path: 'src/x.ts', status: 'added', additions: 1, deletions: 0, patch: '@@ -0,0 +1 @@\n+x' }
    ];
    const github = contextGithub({
      getPull: vi.fn(async () => ghPull({ body: 'See docs/b.md and docs/c.md' })),
      listFiles: vi.fn(async () => files),
      getFileText: vi.fn(async (_repo: unknown, path: string) => {
        if (path === 'docs/a.md') return 'Spec A';
        if (path === 'docs/b.md') return '   ';
        throw new Error('forbidden');
      })
    });

    const context = await gatherReviewContext(github as unknown as GitHubClient, REF, { specGlob: 'docs/**/*.md' });

    expect(context.prompt.specFiles).toEqual([{ path: 'docs/a.md', content: 'Spec A' }]);
    expect(github.getFileText.mock.calls.map((call) => (call as unknown[]).slice(1))).toEqual([
      ['docs/a.md', 'sha1'],
      ['docs/b.md', 'sha1'],
      ['docs/c.md', 'sha1']
    ]);
    expect(context.files).toBe(files);
  });

  it('skips spec lookup for a blank glob', async () => {
    const github = contextGithub({
      listFiles: vi.fn(async (): Promise<ChangedFile[]> => [{ path: 'docs/a.md', status: 'added', additions: 1, deletions: 0, patch: '@@' }])
    });

    const context = await gatherReviewContext(github as unknown as GitHubClient, REF, { specGlob: '   ' });

    expect(context.prompt.specFiles).toEqual([]);
    expect(github.getFileText).not.toHaveBeenCalled();
  });

  it('retries until the pull request and its diff describe the same commit', async () => {
    const heads = ['aaaaaaa11111', 'bbbbbbb22222', 'bbbbbbb22222', 'bbbbbbb22222'];
    const github = contextGithub({
      getPull: vi.fn(async () => ghPull({ head: { sha: heads.shift() ?? 'bbbbbbb22222', ref: 'feat', repo: { full_name: 'acme/api' } } }))
    });

    const context = await gatherReviewContext(github as unknown as GitHubClient, REF, { specGlob: null });

    expect(context.pull.head.sha).toBe('bbbbbbb22222');
    expect(github.getPull).toHaveBeenCalledTimes(4);
  });

  it('stops when the head commit keeps changing', async () => {
    let reads = 0;
    const github = contextGithub({
      getPull: vi.fn(async () => ghPull({ head: { sha: `sha${reads++}abcdef`, ref: 'feat', repo: { full_name: 'acme/api' } } }))
    });

    await expect(gatherReviewContext(github as unknown as GitHubClient, REF, { specGlob: null })).rejects.toThrow(/head changed while reading the diff/);
    expect(github.getPull).toHaveBeenCalledTimes(6);
  });

  it('orders prior comments, flags bots, and drops blank ones', async () => {
    const github = contextGithub({
      listReviewComments: vi.fn(async () => [
        comment({ user: null, body: 'Rename this', path: 'src/a.ts', line: 4, created_at: '2026-10-25T03:00:00Z' }),
        comment({ body: 'Outdated', path: 'src/b.ts', line: null, created_at: '2026-10-25T01:00:00Z' })
      ]),
      listIssueComments: vi.fn(async () => [
        comment({ user: { login: 'ci[bot]' }, body: 'Coverage dropped', created_at: '2026-10-25T02:00:00Z' }),
        comment({ user: { login: 'deploy-bot' }, body: 'Deployed', created_at: '2026-10-25T04:00:00Z' }),
        comment({ user: { login: 'helper' }, body: 'Automated', performed_via_github_app: { id: 1 }, created_at: '2026-10-25T05:00:00Z' }),
        comment({ body: '   ', created_at: '2026-10-25T00:00:00Z' })
      ])
    });

    const context = await gatherReviewContext(github as unknown as GitHubClient, REF, { specGlob: null });

    expect(context.prompt.priorComments).toEqual([
      { author: 'human', file: 'src/b.ts', line: null, body: 'Outdated', isBot: false },
      { author: 'ci[bot]', file: null, line: null, body: 'Coverage dropped', isBot: true },
      { author: 'unknown', file: 'src/a.ts', line: 4, body: 'Rename this', isBot: false },
      { author: 'deploy-bot', file: null, line: null, body: 'Deployed', isBot: true },
      { author: 'helper', file: null, line: null, body: 'Automated', isBot: true }
    ]);
  });

  it('continues without prior comments when comment requests fail', async () => {
    const github = contextGithub({
      listReviewComments: vi.fn(async () => {
        throw new Error('forbidden');
      }),
      listIssueComments: vi.fn(async () => {
        throw new Error('forbidden');
      })
    });

    const context = await gatherReviewContext(github as unknown as GitHubClient, REF, { specGlob: null });

    expect(context.prompt.priorComments).toEqual([]);
  });
});
