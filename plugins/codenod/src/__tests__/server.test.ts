import { describe, expect, it } from 'vitest';
import createCodenodPlugin from '../../server.ts';
import type { CommandRunner } from '../server/github/auth.ts';
import type { FetchLike } from '../server/github/client.ts';
import type { PrDetail, PrListItem } from '../server/views.ts';
import { createFakeFetch, createFakeHost, respond, type FakeThread } from './fake-host.ts';

const PATCH = '@@ -1,2 +1,3 @@\n const a = 1;\n+const user = find();\n+user.name.trim();';

const ANALYSIS = (risk: number, description: string) =>
  JSON.stringify({
    summary: `Review by risk ${risk}`,
    riskScore: risk,
    securityIssues: [],
    performanceIssues: [],
    logicIssues: [{ severity: 'high', file: 'src/a.ts', line: 3, description, suggestion: 'Guard against a null user' }],
    styleIssues: [],
    changeTypes: [],
    coverageScore: 2,
    coverageNote: 'No tests',
    requirementsScore: 8,
    requirementsNote: 'Matches the issue',
    simplicityScore: 9,
    simplicityNote: 'Simple',
    stabilityScore: 8,
    stabilityNote: 'Additive'
  });

function githubFixture(state: { headSha: string }) {
  const pull = () => ({
    number: 4,
    title: 'Trim user names',
    body: 'Fixes #12',
    html_url: 'https://github.com/acme/api/pull/4',
    state: 'open',
    draft: false,
    user: { login: 'teammate' },
    head: { sha: state.headSha, ref: 'feat/trim', repo: { full_name: 'acme/api' } },
    base: { ref: 'main', repo: { full_name: 'acme/api' } },
    updated_at: `2026-10-25T10:00:00Z-${state.headSha}`
  });
  const searchItem = () => ({
    number: 4,
    title: 'Trim user names',
    html_url: 'https://github.com/acme/api/pull/4',
    repository_url: 'https://api.github.com/repos/acme/api',
    updated_at: `2026-10-25T10:00:00Z-${state.headSha}`,
    user: { login: 'teammate' }
  });
  return createFakeFetch({
    'GET /user': () => ({ login: 'me' }),
    'GET /search/issues': (url) => {
      const query = url.searchParams.get('q') ?? '';
      if (query.includes('author:@me')) return { items: [] };
      if (query.includes('review-requested:@me') || query.includes('repo:acme/api')) return { items: [searchItem()] };
      return { items: [] };
    },
    'GET /repos/acme/api/pulls/4': () => pull(),
    'GET /repos/acme/api/pulls/4/files': () => [{ filename: 'src/a.ts', status: 'modified', additions: 2, deletions: 0, patch: PATCH }],
    'GET /repos/acme/api/pulls/4/comments': () => [],
    'GET /repos/acme/api/issues/4/comments': () => [{ id: 1, user: { login: 'ci[bot]' }, body: 'Coverage dropped', created_at: '2026-10-25T09:00:00Z' }],
    'GET /repos/acme/api/issues/12': () => ({ number: 12, title: 'Names must be trimmed', body: 'Trim whitespace', labels: [{ name: 'bug' }] }),
    [`GET /repos/acme/api/commits/sha1/check-runs`]: () => ({ total_count: 1, check_runs: [{ status: 'completed', conclusion: 'success' }] }),
    [`GET /repos/acme/api/commits/sha1/status`]: () => ({ state: 'pending', total_count: 0 }),
    [`GET /repos/acme/api/commits/sha2/check-runs`]: () => ({ total_count: 0, check_runs: [] }),
    [`GET /repos/acme/api/commits/sha2/status`]: () => ({ state: 'pending', total_count: 0 }),
    'POST /repos/acme/api/pulls/4/reviews': () => ({ id: 99, html_url: 'https://github.com/acme/api/pull/4#pullrequestreview-99' }),
    'GET /repos/other/x/pulls/1': () => respond(404, { message: 'Not Found' })
  });
}

const run: CommandRunner = async (command, args) => (command === 'gh' && args.includes('github.com') ? 'gho_test' : null);

function reply(thread: FakeThread, prompt: string): string {
  if (thread.args.model === 'sonnet' && thread.sent.length === 0) return 'Sure! I reviewed it and it looks mostly fine.';
  if (prompt.startsWith('Your previous reply')) return ANALYSIS(4, 'Calling trim on user.name throws when the user is null');
  return ANALYSIS(7, 'user.name.trim() throws when the user is null');
}

async function setup(options: { consumeApproval?: (input: { token: string; binding: unknown }) => Promise<boolean>; reply?: typeof reply } = {}) {
  const state = { headSha: 'sha1' };
  const github = githubFixture(state);
  const host = createFakeHost({ reply: options.reply ?? reply, consumeApproval: options.consumeApproval });
  await createCodenodPlugin(host.zcc, { run, fetch: github.fetch as unknown as FetchLike, pollMs: 10 });
  return { host, github, state };
}

async function waitFor<T>(fn: () => Promise<T>, done: (value: T) => boolean, timeoutMs = 3_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`timed out; last value: ${JSON.stringify(value).slice(0, 400)}`);
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

const PR_ID = 'github.com/acme/api#4';
const MODELS = [
  { providerId: 'claude-code', model: 'opus' },
  { providerId: 'claude-code', model: 'sonnet', reasoningLevel: 'high' }
];

async function reviewToCompletion(host: Awaited<ReturnType<typeof setup>>['host']) {
  await host.callRpc('setModels', { models: MODELS });
  await host.callRpc('refresh');
  await host.callRpc('startReview', { prId: PR_ID });
  return waitFor(() => host.callRpc('detail', { prId: PR_ID }) as Promise<PrDetail>, (detail) => detail.review?.status === 'completed');
}

describe('codenod server', () => {
  it('syncs the inbox from GitHub search', async () => {
    const { host } = await setup();
    await host.callRpc('addRepo', { repo: 'acme/api' });
    await host.callRpc('refresh');
    const overview = (await host.callRpc('overview')) as { prs: PrListItem[]; hosts: Array<{ host: string; login: string; authSource: string }>; hasWatchedRepos: boolean };
    expect(overview.hasWatchedRepos).toBe(true);
    expect(overview.prs).toHaveLength(1);
    expect(overview.prs[0]).toMatchObject({ id: PR_ID, buckets: expect.arrayContaining(['needs-review', 'watched']), ciState: 'success', headSha: 'sha1', author: 'teammate' });
    expect(overview.hosts[0]).toMatchObject({ host: 'github.com', login: 'me', authSource: 'gh' });
    const listed = await host.runCli(['list']);
    expect(listed.stdout).toContain('acme/api#4');
  });

  it('does not list pull requests until a repository is watched', async () => {
    const { host, github } = await setup();
    await host.callRpc('refresh');
    const overview = (await host.callRpc('overview')) as { prs: PrListItem[]; hasWatchedRepos: boolean };
    expect(overview.hasWatchedRepos).toBe(false);
    expect(overview.prs).toEqual([]);
    expect(github.calls.some((call) => call.url.includes('/search/issues'))).toBe(false);
  });

  it('drops unwatched pull requests from the inbox on the next sync', async () => {
    const { host } = await setup();
    await host.callRpc('addRepo', { repo: 'acme/api' });
    await host.callRpc('refresh');
    expect(((await host.callRpc('overview')) as { prs: PrListItem[] }).prs).toHaveLength(1);
    await host.callRpc('removeRepo', { id: 'github.com/acme/api' });
    await host.callRpc('refresh');
    const overview = (await host.callRpc('overview')) as { prs: PrListItem[]; hasWatchedRepos: boolean };
    expect(overview.hasWatchedRepos).toBe(false);
    expect(overview.prs).toEqual([]);
    const detail = (await host.callRpc('detail', { prId: PR_ID })) as PrDetail;
    expect(detail.pr.state).toBe('closed');
  });

  it('runs a multi-model review in hidden threads with consensus', async () => {
    const { host } = await setup();
    const detail = await reviewToCompletion(host);

    expect(detail.runs.map((runRow) => runRow.status)).toEqual(['completed', 'completed']);
    expect(detail.review).toMatchObject({ riskScore: 7, coverageScore: 2, requirementsScore: 8, hasRequirements: true, consensusSummary: expect.stringContaining('agree') });
    expect(detail.findings).toHaveLength(1);
    expect(detail.findings[0]).toMatchObject({ severity: 'high', confidence: 1, agreedBy: ['claude-code/opus', 'claude-code/sonnet'] });

    const threads = [...host.threads.values()];
    expect(threads).toHaveLength(2);
    expect(threads.every((thread) => thread.args.visibility === 'hidden' && thread.args.permissionMode === 'plan' && thread.archived)).toBe(true);
    expect(threads[1].args.reasoningLevel).toBe('high');
    expect(threads[1].sent[0]).toContain('could not be used');
    const prompt = String(threads[0].args.prompt);
    expect(prompt).toContain('Linked issue acme/api#12');
    expect(prompt).toContain('Coverage dropped');
    expect(prompt).toContain('There is no checkout');
    expect(host.inbox[0]).toMatchObject({ projectId: 'home' });
    expect(host.inbox[0].comments).toContain('acme/api#4');
  });

  it('reads long replies from the thread output instead of the truncated idle event text', async () => {
    const longDescription = `user.name.trim() throws when the user is null. ${'Callers pass unvalidated records here. '.repeat(120)}`;
    const { host } = await setup({ reply: () => ANALYSIS(6, longDescription) });
    await host.callRpc('setModels', { models: [MODELS[0]] });
    await host.callRpc('refresh');
    await host.callRpc('startReview', { prId: PR_ID });
    const detail = await waitFor(() => host.callRpc('detail', { prId: PR_ID }) as Promise<PrDetail>, (value) => value.review?.status === 'completed');

    expect(ANALYSIS(6, longDescription).length).toBeGreaterThan(4_096);
    expect(detail.runs[0]).toMatchObject({ status: 'completed', summary: 'Review by risk 6' });
    expect([...host.threads.values()][0].sent).toEqual([]);
  });

  it('posts selected findings as inline comments', async () => {
    const { host, github } = await setup();
    const detail = await reviewToCompletion(host);
    const result = (await host.callRpc('post', { reviewId: detail.review!.id, findingIds: [detail.findings[0].id], event: 'COMMENT' })) as { commentCount: number };
    expect(result.commentCount).toBe(1);
    const posted = github.calls.find((call) => call.method === 'POST')!;
    expect(posted.body).toMatchObject({ commit_id: 'sha1', event: 'COMMENT', comments: [{ path: 'src/a.ts', line: 3, side: 'RIGHT' }] });
    const after = (await host.callRpc('detail', { prId: PR_ID })) as PrDetail;
    expect(after.findings[0].postedAt).not.toBeNull();
    expect(after.posted[0]).toMatchObject({ event: 'COMMENT', commentCount: 1 });
  });

  it('requires a host-signed approval bound to the current head to approve', async () => {
    const seen: unknown[] = [];
    let approve = false;
    const { host, github, state } = await setup({
      consumeApproval: async (input) => {
        seen.push(input);
        return approve;
      }
    });
    const detail = await reviewToCompletion(host);
    const reviewId = detail.review!.id;

    await expect(host.callRpc('post', { reviewId, findingIds: [], event: 'APPROVE' })).rejects.toThrow(/Approval required/);
    await expect(host.callRpc('post', { reviewId, findingIds: [], event: 'APPROVE', approvalToken: 'tok' })).rejects.toThrow(/Approval required/);
    expect(seen[0]).toMatchObject({ token: 'tok', binding: { action: 'codenod.github.approve', target: PR_ID, revision: 'sha1' } });

    const binding = await host.callRpc('approvalBinding', { reviewId, event: 'APPROVE' });
    expect(binding).toMatchObject({ targetLabel: 'acme/api#4', revision: 'sha1' });

    approve = true;
    await host.callRpc('post', { reviewId, findingIds: [], event: 'APPROVE', approvalToken: 'tok' });
    expect(github.calls.filter((call) => call.method === 'POST')).toHaveLength(1);

    state.headSha = 'sha2';
    await expect(host.callRpc('approvalBinding', { reviewId, event: 'APPROVE' })).rejects.toThrow(/new commits/);
    await expect(host.callRpc('post', { reviewId, findingIds: [], event: 'REQUEST_CHANGES', approvalToken: 'tok' })).rejects.toThrow(/new commits/);
  });

  it('fails closed when the host cannot verify approvals', async () => {
    const { host } = await setup();
    const detail = await reviewToCompletion(host);
    await expect(host.callRpc('post', { reviewId: detail.review!.id, findingIds: [], event: 'APPROVE', approvalToken: 'x' })).rejects.toThrow(/unavailable/);
  });

  it('auto-reviews new commits on opted-in repositories once per head', async () => {
    const { host, state } = await setup();
    await host.callRpc('setModels', { models: [MODELS[0]] });
    await host.callRpc('addRepo', { repo: 'acme/api', autoReview: true });
    await host.tick();
    const first = await waitFor(() => host.callRpc('detail', { prId: PR_ID }) as Promise<PrDetail>, (detail) => detail.review?.status === 'completed');
    expect(first.review?.trigger).toBe('auto');
    expect(first.pr.buckets.sort()).toEqual(['needs-review', 'watched']);

    await host.callRpc('refresh');
    expect(host.threads.size).toBe(1);

    state.headSha = 'sha2';
    await host.callRpc('refresh');
    const second = await waitFor(() => host.callRpc('detail', { prId: PR_ID }) as Promise<PrDetail>, (detail) => detail.review?.headSha === 'sha2' && detail.review.status === 'completed');
    expect(second.review?.trigger).toBe('auto');
    expect(host.threads.size).toBe(2);
  });

  it('exposes CLI commands and read-only agent tools', async () => {
    const { host } = await setup();
    await reviewToCompletion(host);
    const shown = await host.runCli(['show', 'acme/api#4']);
    expect(shown.exitCode).toBe(0);
    expect(shown.stdout).toContain('Risk 7/10');
    expect(shown.stdout).toContain('Requirements 8/10');

    const refused = await host.runCli(['post', 'acme/api#4']);
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toContain('--yes');

    const posted = await host.runCli(['post', 'acme/api#4', '--yes']);
    expect(posted.stdout).toContain('Posted 1 finding');

    const bad = await host.runCli(['review', 'acme/api#4', '--models', 'nope']);
    expect(bad.exitCode).toBe(1);

    const models = await host.runCli(['models']);
    expect(models.stdout).toContain('Configured: claude-code:opus, claude-code:sonnet@high');
    expect(models.stdout).toContain('  claude-code:opus');

    expect(host.tools.map((tool) => tool.name).sort()).toEqual(['codenod_get_review', 'codenod_list_prs', 'codenod_review_pr']);
    const listed = (await host.tools.find((tool) => tool.name === 'codenod_list_prs')!.execute({}, {})) as Array<{ pr: string }>;
    expect(listed[0].pr).toBe(PR_ID);

    const repos = await host.runCli(['repos', 'add', 'acme/web', '--auto', '--spec', 'docs/**/*.md']);
    expect(repos.stdout).toContain('Watching github.com/acme/web with auto-review');
  });

  it('refuses to review without a configured model', async () => {
    const { host } = await setup();
    await host.callRpc('refresh');
    await expect(host.callRpc('startReview', { prId: PR_ID })).rejects.toThrow(/No review model/);
  });
});

