import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore, type Database } from '../server/db.ts';
import type { CommandRunner } from '../server/github/auth.ts';
import type { GhPull, GitHubClient } from '../server/github/client.ts';
import { prId } from '../server/github/refs.ts';
import { createProjectMatcher, type ProjectMatcher, type ZanaProject } from '../server/projects.ts';
import {
  createThreadWaiter,
  DEFAULT_POLL_MS,
  detectUsageLimit,
  looksLikeValidReview,
  pickReviewPermissionMode,
  runModelInThread,
  type RunModelInput,
  type ThreadsApi,
  type ThreadWaiter
} from '../server/review/runner.ts';
import { fetchPullRequestHead } from '../server/review/workspace.ts';
import { CHANGED_EVENT, createReviewService, type ReviewConfig, type ReviewServiceDeps } from '../server/review/service.ts';
import type { ModelChoice, PrRef, PullRequestRow, ReviewScores } from '../server/types.ts';
import { createSqliteDatabase } from './fake-host.ts';

const PATCH = '@@ -1,2 +1,3 @@\n const a = 1;\n+const user = find();\n+user.name.trim();';

async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1_000; attempt++) {
    if (condition()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error('condition was never met');
}

function createFakeThreads(initial: { status?: string; output?: string } = {}) {
  const state = { status: initial.status ?? 'running', output: initial.output ?? '' };
  const threads = {
    spawn: vi.fn<ThreadsApi['spawn']>(async () => ({ id: 'thread-1' })),
    get: vi.fn<ThreadsApi['get']>(async () => ({ status: state.status })),
    output: vi.fn<ThreadsApi['output']>(async () => ({ output: state.output })),
    send: vi.fn<ThreadsApi['send']>(async () => ({ id: 'turn-1' })),
    stop: vi.fn<ThreadsApi['stop']>(async () => ({ ok: true as const })),
    archive: vi.fn<ThreadsApi['archive']>(async ({ threadId }) => ({ id: threadId }))
  };
  return { threads, state };
}

describe('thread waiter', () => {
  const POLL_MS = 100;

  afterEach(() => {
    vi.useRealTimers();
  });

  function useFakeClock() {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  }

  it('resolves with the full thread output when the thread goes idle', async () => {
    useFakeClock();
    const { threads, state } = createFakeThreads();
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const result = waiter.waitForOutput('thread-1');
    state.output = 'full reply';
    await waiter.onEvent({ name: 'thread.idle', threadId: 'thread-1', lastAssistantText: 'full…' });
    await vi.advanceTimersByTimeAsync(POLL_MS);

    await expect(result).resolves.toBe('full reply');
    expect(waiter.pending()).toBe(0);
    expect(threads.get).not.toHaveBeenCalled();
  });

  it('does not deliver an in-flight idle event to a waiter registered later', async () => {
    useFakeClock();
    const { threads } = createFakeThreads();
    let release: (value: { output: string }) => void = () => undefined;
    threads.output.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });
    const first = waiter.waitForOutput('thread-1');
    const event = waiter.onEvent({ name: 'thread.idle', threadId: 'thread-1', lastAssistantText: 'stale event' });
    await Promise.resolve();
    let settled = false;
    const second = waiter.waitForOutput('thread-1', { baseline: 'other' }).finally(() => (settled = true));

    release({ output: '' });
    await event;
    await Promise.resolve();

    expect(settled).toBe(false);
    expect(waiter.pending()).toBe(1);
    void first.catch(() => undefined);
    void second.catch(() => undefined);
  });

  it('returns as soon as the idle event arrives without waiting for the next poll', async () => {
    useFakeClock();
    const { threads, state } = createFakeThreads();
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });
    let settled = false;

    const result = waiter.waitForOutput('thread-1').finally(() => (settled = true));
    state.output = 'full reply';
    await waiter.onEvent({ name: 'thread.idle', threadId: 'thread-1' });
    await until(() => settled);

    await expect(result).resolves.toBe('full reply');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('falls back to the idle event text when the thread output cannot be read', async () => {
    useFakeClock();
    const { threads } = createFakeThreads();
    threads.output.mockRejectedValueOnce(new Error('thread gone'));
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const result = waiter.waitForOutput('thread-1');
    await waiter.onEvent({ name: 'thread.idle', threadId: 'thread-1', lastAssistantText: 'event reply' });
    await vi.advanceTimersByTimeAsync(POLL_MS);

    await expect(result).resolves.toBe('event reply');
  });

  it('ignores idle events without new text and events for other threads', async () => {
    useFakeClock();
    const { threads, state } = createFakeThreads({ output: 'old reply' });
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const result = waiter.waitForOutput('thread-1', { baseline: 'old reply' });
    const assertion = expect(result).rejects.toThrow('Review thread failed: unknown error');
    await waiter.onEvent({ name: 'thread.idle', threadId: 'thread-1', lastAssistantText: 'old reply' });
    state.output = '';
    threads.output.mockResolvedValueOnce({ output: undefined as unknown as string });
    await waiter.onEvent({ name: 'thread.idle', threadId: 'thread-1' });
    await waiter.onEvent({ name: 'thread.started', threadId: 'thread-1' });
    await waiter.onEvent({ name: 'thread.failed', threadId: 'thread-2', error: new Error('not ours') });
    expect(waiter.pending()).toBe(1);
    await waiter.onEvent({ name: 'thread.failed', threadId: 'thread-1' });
    await vi.advanceTimersByTimeAsync(POLL_MS);

    await assertion;
  });

  it('reports the event error when a thread fails', async () => {
    useFakeClock();
    const { threads } = createFakeThreads();
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const result = waiter.waitForOutput('thread-1');
    const assertion = expect(result).rejects.toThrow('Review thread failed: quota exceeded');
    await waiter.onEvent({ name: 'thread.failed', threadId: 'thread-1', error: new Error('quota exceeded') });
    await vi.advanceTimersByTimeAsync(POLL_MS);

    await assertion;
  });

  it('polls a finished thread until its output differs from the baseline', async () => {
    useFakeClock();
    const { threads, state } = createFakeThreads({ status: 'COMPLETED', output: '' });
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const result = waiter.waitForOutput('thread-1', { baseline: 'old reply' });
    await vi.advanceTimersByTimeAsync(POLL_MS);
    state.output = 'old reply';
    await vi.advanceTimersByTimeAsync(POLL_MS);
    state.output = 'new reply';
    await vi.advanceTimersByTimeAsync(POLL_MS);
    await vi.advanceTimersByTimeAsync(POLL_MS);

    await expect(result).resolves.toBe('new reply');
    expect(threads.get).toHaveBeenCalledTimes(3);
  });

  it('keeps polling through unknown statuses and lookup errors until the timeout', async () => {
    useFakeClock();
    const { threads } = createFakeThreads();
    threads.get
      .mockRejectedValueOnce(new Error('host restarting'))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({} as { status: string });
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const result = waiter.waitForOutput('thread-1', { timeoutMs: POLL_MS * 3 + 50 });
    const assertion = expect(result).rejects.toThrow('Review thread timed out');
    await vi.advanceTimersByTimeAsync(POLL_MS * 4);

    await assertion;
    expect(threads.get).toHaveBeenCalledTimes(3);
  });

  it('rejects when the polled status reports a failure', async () => {
    useFakeClock();
    const { threads } = createFakeThreads({ status: 'Errored' });
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const assertion = expect(waiter.waitForOutput('thread-1')).rejects.toThrow('Review thread ended with status "errored"');
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);

    await assertion;
  });

  it('rejects when the polled status shows the thread was stopped', async () => {
    useFakeClock();
    const { threads } = createFakeThreads({ status: 'archived' });
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const assertion = expect(waiter.waitForOutput('thread-1')).rejects.toThrow('Review thread was stopped');
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);

    await assertion;
  });

  it('rejects as cancelled when the signal aborts or was already aborted', async () => {
    useFakeClock();
    const { threads } = createFakeThreads();
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });
    const controller = new AbortController();

    const running = expect(waiter.waitForOutput('thread-1', { signal: controller.signal })).rejects.toThrow('Review cancelled');
    controller.abort();
    await running;

    await expect(waiter.waitForOutput('thread-2', { signal: controller.signal })).rejects.toThrow('Review cancelled');
    expect(threads.get).not.toHaveBeenCalled();
  });

  it('uses the default poll interval when none is configured', async () => {
    useFakeClock();
    const { threads } = createFakeThreads({ status: 'idle', output: 'done' });
    const waiter = createThreadWaiter(threads);

    const result = waiter.waitForOutput('thread-1');
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS - 1);
    expect(threads.get).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS);

    await expect(result).resolves.toBe('done');
  });

  it('stops the thread and rejects with usage limit error when thread.idle event carries quota message', async () => {
    useFakeClock();
    const { threads, state } = createFakeThreads();
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const quotaText = 'Usage Limit Reached\nYou have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.';
    const result = waiter.waitForOutput('thread-1');
    state.output = quotaText;
    await waiter.onEvent({ name: 'thread.idle', threadId: 'thread-1', lastAssistantText: quotaText });

    await expect(result).rejects.toThrow('Review thread stopped: usage limit reached (Usage Limit Reached: You have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.)');
    expect(threads.stop).toHaveBeenCalledWith({ threadId: 'thread-1' });
  });

  it('stops the thread and rejects when polling detects usage limit in finished thread output', async () => {
    useFakeClock();
    const quotaText = 'Usage Limit Reached\nYou have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.';
    const { threads, state } = createFakeThreads({ status: 'completed', output: quotaText });
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    const result = waiter.waitForOutput('thread-1');
    const assertion = expect(result).rejects.toThrow('Review thread stopped: usage limit reached (Usage Limit Reached: You have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.)');
    await vi.advanceTimersByTimeAsync(POLL_MS);
    await assertion;
    expect(threads.stop).toHaveBeenCalledWith({ threadId: 'thread-1' });
  });

  it('does not read thread output or stop thread while status is still running', async () => {
    useFakeClock();
    const { threads, state } = createFakeThreads({ status: 'running', output: 'Rate limit exceeded: quota will reset in 60 seconds' });
    const waiter = createThreadWaiter(threads, { pollMs: POLL_MS });

    let settled = false;
    const result = waiter.waitForOutput('thread-1').finally(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);

    expect(settled).toBe(false);
    expect(threads.output).not.toHaveBeenCalled();
    expect(threads.stop).not.toHaveBeenCalled();
    void result.catch(() => undefined);
  });
});

const RUN_MODEL: ModelChoice = { providerId: 'claude-code', model: 'opus', reasoningLevel: 'high' };

function createScriptedWaiter(replies: Array<string | Error>) {
  const waitForOutput = vi.fn<ThreadWaiter['waitForOutput']>(async () => {
    const next = replies.shift();
    if (next instanceof Error) throw next;
    return next ?? '';
  });
  const waiter: ThreadWaiter = { onEvent: async () => undefined, waitForOutput, pending: () => 0 };
  return { waiter, waitForOutput };
}

function runInput(overrides: Partial<RunModelInput> = {}): RunModelInput {
  return {
    projectId: 'home',
    model: RUN_MODEL,
    title: 'CodeNod review',
    prompt: 'Review this change',
    validate: (text) => (text.startsWith('{') ? { ok: true } : { ok: false, problem: 'no JSON' }),
    repairPrompt: (problem) => `Fix it: ${problem}`,
    ...overrides
  };
}

describe('runModelInThread', () => {
  it('spawns a hidden thread, reports its id, and archives it after a valid reply', async () => {
    const { threads } = createFakeThreads();
    const { waiter, waitForOutput } = createScriptedWaiter(['{"ok":1}']);
    const onThread = vi.fn();

    const result = await runModelInThread(threads, waiter, runInput({ permissionMode: 'plan', timeoutMs: 50, onThread, environment: { kind: 'unmanaged' } }));

    expect(result).toEqual({ threadId: 'thread-1', text: '{"ok":1}' });
    expect(threads.spawn).toHaveBeenCalledWith({
      projectId: 'home',
      prompt: 'Review this change',
      providerId: 'claude-code',
      model: 'opus',
      reasoningLevel: 'high',
      permissionMode: 'plan',
      title: 'CodeNod review',
      visibility: 'hidden',
      environment: { kind: 'unmanaged' }
    });
    expect(onThread).toHaveBeenCalledWith('thread-1');
    expect(waitForOutput).toHaveBeenCalledWith('thread-1', { timeoutMs: 50, signal: undefined });
    expect(threads.send).not.toHaveBeenCalled();
    expect(threads.archive).toHaveBeenCalledWith({ threadId: 'thread-1' });
  });

  it('asks once for a repair and keeps the thread when archiving is disabled', async () => {
    const { threads } = createFakeThreads();
    const { waiter, waitForOutput } = createScriptedWaiter(['Looks fine to me', '{"ok":2}']);

    const result = await runModelInThread(threads, waiter, runInput({ archiveWhenDone: false }));

    expect(result.text).toBe('{"ok":2}');
    expect(threads.send).toHaveBeenCalledWith({ threadId: 'thread-1', prompt: 'Fix it: no JSON' });
    expect(waitForOutput).toHaveBeenLastCalledWith('thread-1', { baseline: 'Looks fine to me', timeoutMs: undefined, signal: undefined });
    expect(threads.archive).not.toHaveBeenCalled();
  });

  it('stops and archives the thread when waiting fails, ignoring cleanup errors', async () => {
    const { threads } = createFakeThreads();
    threads.stop.mockRejectedValue(new Error('already stopped'));
    threads.archive.mockRejectedValue(new Error('already archived'));
    const { waiter } = createScriptedWaiter([new Error('Review thread timed out')]);

    await expect(runModelInThread(threads, waiter, runInput())).rejects.toThrow('Review thread timed out');

    expect(threads.stop).toHaveBeenCalledWith({ threadId: 'thread-1' });
    expect(threads.archive).toHaveBeenCalledWith({ threadId: 'thread-1' });
  });

  it('stops the thread as soon as the run is aborted', async () => {
    const { threads } = createFakeThreads();
    threads.stop.mockRejectedValue(new Error('already stopped'));
    const waitForOutput = vi.fn<ThreadWaiter['waitForOutput']>(
      (_threadId, args) => new Promise<string>((_resolve, reject) => args?.signal?.addEventListener('abort', () => reject(new Error('Review cancelled'))))
    );
    const waiter: ThreadWaiter = { onEvent: async () => undefined, waitForOutput, pending: () => 0 };
    const controller = new AbortController();

    const running = runModelInThread(threads, waiter, runInput({ signal: controller.signal }));
    const assertion = expect(running).rejects.toThrow('Review cancelled');
    await until(() => waitForOutput.mock.calls.length === 1);
    controller.abort();

    await assertion;
    expect(threads.stop).toHaveBeenCalledTimes(2);
    expect(threads.archive).toHaveBeenCalledWith({ threadId: 'thread-1' });
  });

  it('stops the thread immediately and throws without attempting repair when usage limit is reached', async () => {
    const { threads } = createFakeThreads();
    const quotaMsg = 'Usage Limit Reached\nYou have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.';
    const { waiter } = createScriptedWaiter([quotaMsg]);

    await expect(runModelInThread(threads, waiter, runInput())).rejects.toThrow(
      'Review thread stopped: usage limit reached (Usage Limit Reached: You have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.)'
    );

    expect(threads.stop).toHaveBeenCalledWith({ threadId: 'thread-1' });
    expect(threads.send).not.toHaveBeenCalled();
    expect(threads.archive).toHaveBeenCalledWith({ threadId: 'thread-1' });
  });

  it('stops the thread immediately if a repair attempt encounters a usage limit', async () => {
    const { threads } = createFakeThreads();
    const quotaMsg = 'Usage Limit Reached\nYou have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.';
    const { waiter } = createScriptedWaiter(['malformed output', quotaMsg]);

    await expect(runModelInThread(threads, waiter, runInput())).rejects.toThrow(
      'Review thread stopped: usage limit reached (Usage Limit Reached: You have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.)'
    );

    expect(threads.send).toHaveBeenCalledTimes(1);
    expect(threads.stop).toHaveBeenCalledWith({ threadId: 'thread-1' });
    expect(threads.archive).toHaveBeenCalledWith({ threadId: 'thread-1' });
  });

  it('attempts repair instead of failing immediately when malformed review output mentions quota', async () => {
    const { threads } = createFakeThreads();
    const malformedWithQuota = '{"summary": "rate limit handling", "riskScore": 3, "logicIssues": [';
    const validRepair = '{"ok": 1}';
    const { waiter } = createScriptedWaiter([malformedWithQuota, validRepair]);

    const result = await runModelInThread(threads, waiter, runInput({ validate: (t) => (t.endsWith('}') ? { ok: true } : { ok: false, problem: 'incomplete JSON' }), archiveWhenDone: false }));
    expect(result.text).toBe(validRepair);
    expect(threads.send).toHaveBeenCalledTimes(1);
    expect(threads.stop).not.toHaveBeenCalled();
  });
});

describe('detectUsageLimit and looksLikeValidReview', () => {
  it('detects antigravity usage limit error with reset duration', () => {
    const text = 'Usage Limit Reached\nYou have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.';
    expect(detectUsageLimit(text)).toBe(
      'Usage Limit Reached: You have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.'
    );
  });

  it('detects provider quota and rate limit errors across various styles', () => {
    expect(detectUsageLimit('You have exceeded your current quota, please check your plan and billing details.')).toContain('exceeded your current quota');
    expect(detectUsageLimit('Your credit balance is too low to access the Claude API.')).toContain('credit balance is too low');
    expect(detectUsageLimit('RESOURCE_EXHAUSTED: quota exceeded for model')).toContain('RESOURCE_EXHAUSTED');
    expect(detectUsageLimit('Rate limit exceeded: quota will reset in 60 seconds')).toContain('Rate limit exceeded');
    expect(detectUsageLimit('{"error": {"code": "insufficient_quota", "message": "quota limit reached"}}')).toContain('insufficient_quota');
  });

  it('ignores normal responses without usage limits', () => {
    expect(detectUsageLimit('The code changes look good and all tests pass.')).toBeNull();
    expect(detectUsageLimit('')).toBeNull();
  });

  it('recognizes valid review analysis and distinguishes it from usage limit errors', () => {
    const valid = JSON.stringify({
      summary: 'Fix rate limit handling in API client',
      riskScore: 2,
      logicIssues: [{ file: 'api.ts', description: 'Handle rate limit exceeded response' }]
    });
    expect(looksLikeValidReview(valid)).toBe(true);
    expect(looksLikeValidReview('Usage Limit Reached\nYou have reached your current quota.')).toBe(false);
  });

  it('does not treat malformed reviews containing review JSON keys as usage limit', () => {
    const malformed = '{"summary": "Review for rate limiting", "riskScore": 4, "logicIssues": [{"description": "quota exceeded in check"';
    expect(detectUsageLimit(malformed)).toBeNull();
  });

  it('ignores usage limit patterns in long text', () => {
    const longText = 'A'.repeat(400) + ' usage limit reached';
    expect(detectUsageLimit(longText)).toBeNull();
  });
});

describe('pickReviewPermissionMode', () => {
  it('picks the full-access mode and refuses anything that could prompt for approval', () => {
    expect(pickReviewPermissionMode(undefined)).toBeUndefined();
    expect(pickReviewPermissionMode([])).toBeUndefined();
    expect(pickReviewPermissionMode(['read-only', 'accept-edits', 'auto'])).toBeUndefined();
    expect(pickReviewPermissionMode(['read-only', 'accept-edits', 'full'])).toBe('full');
    expect(pickReviewPermissionMode(['accept-edits', 'Full'])).toBe('Full');
  });
});

describe('fetchPullRequestHead', () => {
  const head = '0123456789abcdef';

  it('returns the head only when the fetched ref matches it', async () => {
    const commands: string[][] = [];
    const run: CommandRunner = async (_command, args) => {
      commands.push(args);
      return args.includes('rev-parse') ? `${head}\n` : '';
    };

    await expect(fetchPullRequestHead(run, '/repo', 'upstream', 4, head)).resolves.toBe(head);
    expect(commands[0]).toEqual(['-C', '/repo', 'fetch', 'upstream', 'pull/4/head:refs/codenod/pr-4']);
  });

  it('rejects a fetch failure or a different commit', async () => {
    const fail: CommandRunner = async () => null;
    await expect(fetchPullRequestHead(fail, '/repo', 'origin', 4, head)).rejects.toThrow(/Could not fetch/);
    const mismatch: CommandRunner = async (_command, args) => (args.includes('rev-parse') ? 'aaaaaaaaaaaaaaa' : '');
    await expect(fetchPullRequestHead(mismatch, '/repo', 'origin', 4, head)).rejects.toThrow(/does not match/);
    await expect(fetchPullRequestHead(async () => '', '/repo', 'origin', 4, 'sha1')).rejects.toThrow(/Invalid pull request head/);
    await expect(fetchPullRequestHead(async () => '', '/repo', 'origin;rm', 4, head)).rejects.toThrow(/Invalid git remote/);
  });
});

const SERVICE_MODELS: ModelChoice[] = [
  { providerId: 'claude-code', model: 'opus' },
  { providerId: 'codex', model: 'gpt' }
];

function analysis(risk: number, description: string): string {
  return JSON.stringify({
    summary: `Review by risk ${risk}`,
    riskScore: risk,
    securityIssues: [],
    performanceIssues: [],
    logicIssues: [{ severity: 'high', file: 'src/a.ts', line: 3, description, suggestion: 'Guard against a null user' }],
    styleIssues: [],
    changeTypes: [],
    coverageScore: 2,
    coverageNote: 'No tests',
    simplicityScore: 9,
    simplicityNote: 'Simple',
    stabilityScore: 8,
    stabilityNote: 'Additive'
  });
}

const VALID_REPLY = analysis(7, 'user.name.trim() throws when the user is null');

type Responder = (call: { model: string; attempt: number; signal?: AbortSignal }) => string | Promise<string>;

const waitUntilAborted: Responder = ({ signal }) =>
  new Promise<string>((_resolve, reject) => {
    const cancel = () => reject(new Error('Review cancelled'));
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
  });

function createGate() {
  const releases: Array<() => void> = [];
  const respond: Responder = () => new Promise<string>((resolve) => releases.push(() => resolve(VALID_REPLY)));
  return { respond, release: () => releases.shift()?.(), waiting: () => releases.length };
}

function prRef(number = 4): PrRef {
  return { host: 'github.com', owner: 'acme', name: 'api', number };
}

function fakePull(ref: PrRef, headSha: string): GhPull {
  return {
    number: ref.number,
    title: 'Trim user names',
    body: null,
    html_url: `https://github.com/acme/api/pull/${ref.number}`,
    state: 'open',
    user: { login: 'teammate' },
    head: { sha: headSha, ref: 'feat/trim', repo: { full_name: 'acme/api' } },
    base: { ref: 'main', repo: { full_name: 'acme/api' } },
    updated_at: '2026-10-25T10:00:00Z'
  };
}

interface HarnessOptions {
  config?: Partial<ReviewConfig>;
  respond?: Responder;
  repoProject?: ZanaProject;
  projects?: ZanaProject[];
  permissionModes?: ReviewServiceDeps['providerPermissionModes'];
  fetchPullRequestHead?: ReviewServiceDeps['fetchPullRequestHead'];
  headShaForPull?: (number: number, read: number) => string;
  complete?: ReviewServiceDeps['complete'];
  notify?: ReviewServiceDeps['notify'];
}

function createServiceHarness(options: HarnessOptions = {}) {
  const db = createSqliteDatabase();
  let clock = 1_000;
  const store = createStore(db, () => ++clock);
  const heads = new Map<number, string>();
  const headFor = (number: number) => heads.get(number) ?? 'sha1';
  const headShaForPull = options.headShaForPull ?? ((number: number) => headFor(number));
  let pullReads = 0;
  const getFileText = vi.fn(async (_repo: PrRef, _path: string, _gitRef: string): Promise<string | null> => null);
  const github = {
    getPull: async (ref: PrRef) => fakePull(ref, headShaForPull(ref.number, ++pullReads)),
    listFiles: async () => [{ path: 'src/a.ts', status: 'modified', additions: 2, deletions: 0, patch: PATCH }],
    listReviewComments: async () => [],
    listIssueComments: async () => [],
    getFileText
  } as unknown as GitHubClient;

  const spawned: Array<{ id: string; args: Parameters<ThreadsApi['spawn']>[0] }> = [];
  const threads = {
    spawn: vi.fn<ThreadsApi['spawn']>(async (args) => {
      const id = `thread-${spawned.length + 1}`;
      spawned.push({ id, args });
      return { id };
    }),
    get: vi.fn<ThreadsApi['get']>(async () => null),
    output: vi.fn<ThreadsApi['output']>(async () => ({ output: '' })),
    send: vi.fn<ThreadsApi['send']>(async () => ({ id: 'turn' })),
    stop: vi.fn<ThreadsApi['stop']>(async () => ({ ok: true as const })),
    archive: vi.fn<ThreadsApi['archive']>(async ({ threadId }) => ({ id: threadId }))
  };
  const respond = options.respond ?? (() => VALID_REPLY);
  const waiter: ThreadWaiter = {
    onEvent: async () => undefined,
    pending: () => 0,
    waitForOutput: async (threadId, args = {}) => {
      const thread = spawned.find((entry) => entry.id === threadId)!;
      return respond({ model: String(thread.args.model), attempt: args.baseline === undefined ? 0 : 1, signal: args.signal });
    }
  };
  const projects: ProjectMatcher = {
    projectForRepo: async () => (options.repoProject ? { remote: 'origin', ...options.repoProject } : null),
    projects: async () => options.projects ?? [{ id: 'home', name: 'Home' }],
    invalidate() {}
  };
  const config: ReviewConfig = {
    models: [SERVICE_MODELS[0]],
    customInstructions: null,
    fallbackProjectId: null,
    workspaceMode: 'diff-only',
    maxConcurrent: 2,
    timeoutMs: 60_000,
    archiveThreads: true,
    showReviewsOnAgentsBoard: false,
    ...options.config
  };
  const published: Array<{ event: string; payload: unknown }> = [];
  const log = { info: vi.fn(), warn: vi.fn() };

  const service = createReviewService({
    store,
    github,
    threads,
    waiter,
    projects,
    config: async () => config,
    providerPermissionModes: options.permissionModes ?? (async () => ['read-only', 'accept-edits', 'auto', 'full']),
    fetchPullRequestHead: options.fetchPullRequestHead,
    complete: options.complete,
    notify: options.notify,
    syncPullRequest: async (ref) => {
      const pull = await github.getPull(ref);
      const id = prId(ref);
      store.upsertPullRequest({
        id,
        host: ref.host,
        owner: ref.owner,
        repo: ref.name,
        number: ref.number,
        title: pull.title,
        author: pull.user?.login ?? 'unknown',
        url: pull.html_url,
        state: 'open',
        isDraft: false,
        headSha: pull.head.sha,
        headRef: pull.head.ref,
        baseRef: pull.base.ref,
        ciState: 'none',
        buckets: ['needs-review'],
        updatedAt: pull.updated_at
      });
      return store.getPullRequest(id)!;
    },
    publish: (event, payload) => void published.push({ event, payload }),
    log
  });

  return { db, store, service, threads, spawned, published, log, heads, getFileText, settled: () => until(() => service.activeCount() === 0) };
}

describe('review service', () => {
  it('completes with the models that succeeded when another model fails', async () => {
    const notify = vi.fn<NonNullable<ReviewServiceDeps['notify']>>(async () => undefined);
    const { store, service, spawned, log, settled } = createServiceHarness({
      config: { models: SERVICE_MODELS },
      respond: ({ model }) => {
        if (model === 'gpt') throw new Error('provider crashed');
        return VALID_REPLY;
      },
      permissionModes: async (providerId) => (providerId === 'codex' ? ['read-only', 'accept-edits'] : ['read-only', 'full']),
      notify
    });

    const review = await service.startReview(prRef());
    await settled();

    expect(store.getReview(review.id)).toMatchObject({ status: 'completed', summary: 'Review by risk 7', consensusSummary: null, riskScore: 7 });
    expect(store.listRuns(review.id).map((run) => [run.model, run.status, run.error])).toEqual([
      ['opus', 'completed', null],
      ['gpt', 'failed', 'Provider codex has no full-access permission mode for automated reviews']
    ]);
    expect(spawned.map((thread) => thread.args.permissionMode)).toEqual(['full']);
    expect(log.warn).toHaveBeenCalledWith(
      'codenod: codex/gpt failed on github.com/acme/api#4: Provider codex has no full-access permission mode for automated reviews'
    );
    expect(notify).toHaveBeenCalledWith({ projectId: 'home', text: expect.stringContaining('1 finding(s), 1 high or critical · 1/2 model(s) succeeded') });
  });

  it('fails the review with the first model error when every model fails', async () => {
    const { store, service, settled } = createServiceHarness({
      respond: () => {
        throw new Error('rate limited');
      }
    });

    const review = await service.startReview(prRef());
    await settled();

    expect(store.getReview(review.id)).toMatchObject({ status: 'failed', error: 'rate limited' });
  });

  it('falls back to a generic error when the failed runs carry no message', async () => {
    const { store, service, settled } = createServiceHarness({
      respond: () => {
        throw new Error('');
      }
    });

    const review = await service.startReview(prRef());
    await settled();

    expect(store.getReview(review.id)).toMatchObject({ status: 'failed', error: 'Every model failed' });
  });

  it('fails a model whose reply is still unparsable after one repair request', async () => {
    const { store, service, threads, spawned, settled } = createServiceHarness({ respond: () => 'Sure! It looks mostly fine.' });

    const review = await service.startReview(prRef());
    await settled();

    expect(threads.send).toHaveBeenCalledTimes(1);
    expect(threads.send.mock.calls[0][0].prompt).toContain('could not be used');
    expect(store.getReview(review.id)).toMatchObject({ status: 'failed', error: 'Model reply was not usable: the reply did not contain a valid JSON object' });
    expect(spawned[0].args.permissionMode).toBe('full');
  });

  it('stops a model that hits usage limit without sending repair prompts and completes review with successful models', async () => {
    const quotaMsg = 'Usage Limit Reached\nYou have reached your current quota for this period. Your limit will reset in 3 days, 17 hours.';
    const { store, service, threads, settled } = createServiceHarness({
      config: { models: SERVICE_MODELS },
      respond: ({ model }) => {
        if (model === 'gpt') return quotaMsg;
        return VALID_REPLY;
      }
    });

    const review = await service.startReview(prRef());
    await settled();

    expect(store.getReview(review.id)).toMatchObject({ status: 'completed' });
    const runs = store.listRuns(review.id);
    const gptRun = runs.find((r) => r.model === 'gpt')!;
    expect(gptRun.status).toBe('failed');
    expect(gptRun.error).toContain('usage limit reached');
    expect(threads.send).not.toHaveBeenCalled();
    expect(threads.stop).toHaveBeenCalled();
  });

  it('summarizes agreement when several models succeed', async () => {
    const complete = vi.fn<NonNullable<ReviewServiceDeps['complete']>>(async () => ({ text: '  Both models flag the null user.  ' }));
    const { store, service, settled } = createServiceHarness({ config: { models: SERVICE_MODELS }, complete });

    const review = await service.startReview(prRef());
    await settled();

    expect(complete).toHaveBeenCalledTimes(1);
    expect(store.getReview(review.id)).toMatchObject({ status: 'completed', consensusSummary: 'Both models flag the null user.', hasRequirements: false });
    expect(store.listFindings(review.id)).toEqual([expect.objectContaining({ severity: 'high', confidence: 1, agreedBy: ['claude-code/opus', 'codex/gpt'] })]);
  });

  it('stores no consensus summary when the summarizer returns blank text or fails', async () => {
    const blank = createServiceHarness({ config: { models: SERVICE_MODELS }, complete: async () => ({ text: '   ' }) });
    const failing = createServiceHarness({
      config: { models: SERVICE_MODELS },
      complete: async () => {
        throw new Error('model busy');
      }
    });

    const blankReview = await blank.service.startReview(prRef());
    const failingReview = await failing.service.startReview(prRef());
    await blank.settled();
    await failing.settled();

    expect(blank.store.getReview(blankReview.id)).toMatchObject({ status: 'completed', consensusSummary: null });
    expect(failing.store.getReview(failingReview.id)).toMatchObject({ status: 'completed', consensusSummary: null });
    expect(failing.log.warn).toHaveBeenCalledWith('codenod: consensus summary failed: model busy');
  });

  it('skips the consensus summary when no summarizer is available', async () => {
    const { store, service, settled } = createServiceHarness({ config: { models: SERVICE_MODELS } });

    const review = await service.startReview(prRef());
    await settled();

    expect(store.getReview(review.id)).toMatchObject({ status: 'completed', consensusSummary: null });
  });

  it('keeps the completed review when the inbox push fails', async () => {
    const { store, service, log, settled } = createServiceHarness({
      notify: async () => {
        throw new Error('inbox offline');
      }
    });

    const review = await service.startReview(prRef());
    await settled();

    expect(store.getReview(review.id)?.status).toBe('completed');
    expect(log.warn).toHaveBeenCalledWith('codenod: inbox push failed: inbox offline');
  });

  it('reviews each model in its own worktree when a project matches the repository', async () => {
    const fetchHead = vi.fn(async () => 'sha1');
    const { store, service, spawned, getFileText, settled } = createServiceHarness({
      config: { models: SERVICE_MODELS, workspaceMode: 'worktree' },
      repoProject: { id: 'api-project', name: 'API', path: '/repos/api' },
      fetchPullRequestHead: fetchHead
    });
    store.upsertRepo({ id: 'github.com/acme/api', host: 'github.com', owner: 'acme', name: 'api', specGlob: 'src/**/*.ts' });

    const review = await service.startReview(prRef());
    await settled();

    const runIds = store.listRuns(review.id).map((run) => run.id);
    expect(spawned.map((thread) => thread.args.projectId)).toEqual(['api-project', 'api-project']);
    expect(spawned.map((thread) => thread.args.environment)).toEqual(
      expect.arrayContaining(
        runIds.map((runId, index) => ({ kind: 'worktree', baseBranch: 'sha1', branchSlug: `codenod-review-4-${runId.slice(0, 6)}-${index}` }))
      )
    );
    expect(String(spawned[0].args.prompt)).toContain('checkout of this repository');
    expect(getFileText).toHaveBeenCalledWith(expect.objectContaining({ owner: 'acme', number: 4 }), 'src/a.ts', 'sha1');
    expect(fetchHead).toHaveBeenCalledWith('/repos/api', 'origin', 4, 'sha1');
  });

  it('fails a worktree review when the pull request head cannot be fetched', async () => {
    const { store, service, settled } = createServiceHarness({
      config: { workspaceMode: 'worktree' },
      repoProject: { id: 'api-project', name: 'API', path: '/repos/api' }
    });

    const review = await service.startReview(prRef());
    await settled();

    expect(store.getReview(review.id)).toMatchObject({ status: 'failed', error: expect.stringContaining('no checkout to fetch') });
  });

  it('cancels a queued review whose head moved and reviews the new commit', async () => {
    const { store, service, spawned, settled } = createServiceHarness({
      headShaForPull: (_number, read) => (read === 1 ? 'sha1' : 'sha2')
    });

    await service.startReview(prRef());
    await settled();

    expect(store.latestReview(prId(prRef()))).toMatchObject({ status: 'completed', headSha: 'sha2' });
    expect(spawned).toHaveLength(1);
    expect(spawned[0].args.permissionMode).toBe('full');
  });

  it('uses the matched project checkout directly in project mode', async () => {
    const { service, spawned, settled } = createServiceHarness({ config: { workspaceMode: 'project' }, repoProject: { id: 'api-project', name: 'API' } });

    await service.startReview(prRef());
    await settled();

    expect(spawned[0].args).toMatchObject({ projectId: 'api-project', environment: { kind: 'unmanaged' } });
  });

  it('falls back to the configured project when no project matches the repository', async () => {
    const { service, spawned, settled } = createServiceHarness({ config: { workspaceMode: 'worktree', fallbackProjectId: 'scratch' } });

    await service.startReview(prRef());
    await settled();

    expect(spawned[0].args).toMatchObject({ projectId: 'scratch', environment: undefined });
    expect(String(spawned[0].args.prompt)).toContain('There is no checkout');
  });

  it('fails the review when no project is available to run threads', async () => {
    const { store, service, spawned, log, settled } = createServiceHarness({ projects: [] });

    const review = await service.startReview(prRef());
    await settled();

    expect(spawned).toEqual([]);
    expect(store.getReview(review.id)).toMatchObject({ status: 'failed', error: expect.stringContaining('No Zana project is available') });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining(`review ${review.id} failed`));
  });

  it('refuses to start without a configured model', async () => {
    const { service } = createServiceHarness({ config: { models: [] } });

    await expect(service.startReview(prRef())).rejects.toThrow(/No review model/);
    await expect(service.startReview(prRef(), { models: [] })).rejects.toThrow(/No review model/);
  });

  it('returns the in-flight review for the same head and queues a new one for a new head', async () => {
    const gate = createGate();
    const { service, store, heads, settled } = createServiceHarness({ respond: gate.respond });

    const first = await service.startReview(prRef());
    const again = await service.startReview(prRef(), { models: [SERVICE_MODELS[1]] });
    await until(() => gate.waiting() === 1);
    heads.set(4, 'sha2');
    const next = await service.startReview(prRef(), { trigger: 'auto' });
    await until(() => gate.waiting() === 2);
    gate.release();
    gate.release();
    await settled();
    const afterCompletion = await service.startReview(prRef());
    await until(() => gate.waiting() === 1);
    gate.release();
    await settled();

    expect(again.id).toBe(first.id);
    expect(next).toMatchObject({ headSha: 'sha2', trigger: 'auto', status: 'queued' });
    expect(next.id).not.toBe(first.id);
    expect(afterCompletion.id).not.toBe(next.id);
    expect(store.getReview(afterCompletion.id)).toMatchObject({ status: 'completed', trigger: 'manual' });
  });

  it('runs no more reviews at once than the concurrency limit allows', async () => {
    const gate = createGate();
    const { service, store, spawned, settled } = createServiceHarness({ config: { maxConcurrent: 1 }, respond: gate.respond });

    const first = await service.startReview(prRef(4));
    const second = await service.startReview(prRef(5));
    await until(() => gate.waiting() === 1);

    expect(service.activeCount()).toBe(2);
    expect(spawned).toHaveLength(1);
    expect(store.getReview(second.id)?.status).toBe('queued');

    gate.release();
    await until(() => gate.waiting() === 1);
    expect(store.getReview(first.id)?.status).toBe('completed');
    expect(spawned).toHaveLength(2);

    gate.release();
    await settled();
    expect(store.getReview(second.id)?.status).toBe('completed');
  });

  it('still runs reviews when the concurrency limit is configured as zero', async () => {
    const { service, store, settled } = createServiceHarness({ config: { maxConcurrent: 0 } });

    const review = await service.startReview(prRef());
    await settled();

    expect(store.getReview(review.id)?.status).toBe('completed');
  });

  it('cancels a queued review before it starts', async () => {
    const gate = createGate();
    const { service, store, spawned, published, settled } = createServiceHarness({ config: { maxConcurrent: 1 }, respond: gate.respond });

    await service.startReview(prRef(4));
    const queued = await service.startReview(prRef(5));
    await until(() => gate.waiting() === 1);
    const cancelled = service.cancelReview(queued.id);
    const lastEvent = published.at(-1);
    gate.release();
    await settled();

    expect(cancelled).toBe(true);
    expect(lastEvent).toEqual({ event: CHANGED_EVENT, payload: { reviewId: queued.id } });
    expect(store.getReview(queued.id)).toMatchObject({ status: 'cancelled', error: 'Cancelled' });
    expect(service.cancelReview('missing-review')).toBe(false);
    expect(spawned).toHaveLength(1);
  });

  it('cancels a running review and stops its worker threads', async () => {
    const { service, store, threads, settled } = createServiceHarness({ config: { models: SERVICE_MODELS }, respond: waitUntilAborted });

    const review = await service.startReview(prRef());
    await until(() => threads.spawn.mock.calls.length === 2);
    const cancelled = service.cancelReview(review.id);
    await settled();

    expect(cancelled).toBe(true);
    expect(store.getReview(review.id)).toMatchObject({ status: 'cancelled', error: 'Cancelled' });
    expect(store.listRuns(review.id).map((run) => [run.status, run.error])).toEqual([
      ['cancelled', 'Review cancelled'],
      ['cancelled', 'Review cancelled']
    ]);
    expect(threads.stop).toHaveBeenCalledWith({ threadId: 'thread-1' });
    expect(threads.stop).toHaveBeenCalledWith({ threadId: 'thread-2' });
  });

  it('skips queued reviews whose review or pull request rows disappeared', async () => {
    const gate = createGate();
    const { db, service, store, spawned, published, settled } = createServiceHarness({ config: { maxConcurrent: 1 }, respond: gate.respond });

    await service.startReview(prRef(4));
    const orphanReview = await service.startReview(prRef(5));
    const orphanPr = await service.startReview(prRef(6));
    await until(() => gate.waiting() === 1);
    db.prepare('DELETE FROM reviews WHERE id = ?').run(orphanReview.id);
    db.prepare('DELETE FROM pull_requests WHERE id = ?').run('github.com/acme/api#6');
    gate.release();
    await settled();

    expect(spawned).toHaveLength(1);
    expect(store.getReview(orphanPr.id)).toMatchObject({ status: 'failed', error: 'Pull request github.com/acme/api#6 is not in the CodeNod database' });
    expect(published).toContainEqual({ event: CHANGED_EVENT, payload: { prId: undefined, reviewId: orphanReview.id, status: undefined } });
  });

  it('aborts running reviews and drops queued ones on dispose', async () => {
    const { service, store, spawned, settled } = createServiceHarness({ config: { maxConcurrent: 1 }, respond: waitUntilAborted });

    const running = await service.startReview(prRef(4));
    const queued = await service.startReview(prRef(5));
    await until(() => spawned.length === 1);
    await service.dispose();
    await settled();

    expect(store.getReview(running.id)?.status).toBe('cancelled');
    expect(store.getReview(queued.id)?.status).toBe('queued');
    expect(spawned).toHaveLength(1);
  });
});

const EMPTY_SCORES: ReviewScores = {
  riskScore: null,
  coverageScore: null,
  coverageNote: null,
  requirementsScore: null,
  requirementsNote: null,
  simplicityScore: null,
  simplicityNote: null,
  stabilityScore: null,
  stabilityNote: null
};

const STORE_PR_ID = 'github.com/acme/api#1';

function pullRequest(number: number, overrides: Partial<PullRequestRow> = {}): Omit<PullRequestRow, 'syncedAt'> {
  return {
    id: `github.com/acme/api#${number}`,
    host: 'github.com',
    owner: 'acme',
    repo: 'api',
    number,
    title: `PR ${number}`,
    author: 'teammate',
    url: `https://github.com/acme/api/pull/${number}`,
    state: 'open',
    isDraft: false,
    headSha: 'sha1',
    headRef: 'feat',
    baseRef: 'main',
    ciState: 'none',
    buckets: ['needs-review'],
    updatedAt: `2026-10-2${number}T00:00:00Z`,
    ...overrides
  };
}

function createTestStore() {
  let clock = 1_000;
  const db = createSqliteDatabase();
  return createStore(db, () => ++clock);
}

function createRowDatabase(row: Record<string, unknown>): Database {
  return {
    prepare: () => ({ all: () => [row], get: () => row, run: () => ({ changes: 0 }) }),
    migrate() {},
    transaction<T>(fn: () => T): T {
      return fn();
    }
  };
}

describe('store', () => {
  it('inserts repos with defaults and updates only the fields that are given', () => {
    const store = createTestStore();
    const repo = { id: 'github.com/acme/api', host: 'github.com', owner: 'acme', name: 'api' };

    const inserted = store.upsertRepo(repo);
    const enabled = store.upsertRepo({ ...repo, autoReview: true, specGlob: 'docs/**/*.md' });
    const untouched = store.upsertRepo(repo);
    const cleared = store.upsertRepo({ ...repo, autoReview: false, specGlob: null });
    store.upsertRepo({ id: 'github.com/acme/web', host: 'github.com', owner: 'acme', name: 'web', autoReview: true, specGlob: 'specs/*.md' });

    expect(inserted).toMatchObject({ autoReview: false, specGlob: null, addedAt: 1_001 });
    expect(enabled).toMatchObject({ autoReview: true, specGlob: 'docs/**/*.md', addedAt: 1_001 });
    expect(untouched).toMatchObject({ autoReview: true, specGlob: 'docs/**/*.md' });
    expect(cleared).toMatchObject({ autoReview: false, specGlob: null });
    expect(store.listRepos().map((row) => [row.id, row.autoReview, row.specGlob])).toEqual([
      ['github.com/acme/api', false, null],
      ['github.com/acme/web', true, 'specs/*.md']
    ]);
    expect(store.removeRepo('github.com/acme/web')).toBe(true);
    expect(store.removeRepo('github.com/acme/web')).toBe(false);
    expect(store.getRepo('github.com/acme/web')).toBeNull();
  });

  it('closes open pull requests that a sync no longer returns', () => {
    const store = createTestStore();
    store.upsertPullRequest(pullRequest(1, { isDraft: true }));
    store.upsertPullRequest(pullRequest(2));
    store.upsertPullRequest(pullRequest(3, { id: 'ghe.example.com/acme/api#3', host: 'ghe.example.com' }));
    store.upsertPullRequest(pullRequest(1, { isDraft: true, title: 'Renamed' }));

    const closed = store.closeMissingPullRequests('github.com', new Set([STORE_PR_ID]));

    expect(closed).toBe(1);
    expect(store.listPullRequests().map((pr) => pr.id).sort()).toEqual(['ghe.example.com/acme/api#3', STORE_PR_ID]);
    expect(store.getPullRequest(STORE_PR_ID)).toMatchObject({ title: 'Renamed', isDraft: true, buckets: ['needs-review'] });
    expect(store.getPullRequest('github.com/acme/api#2')).toMatchObject({ state: 'closed', buckets: [] });
    expect(store.getPullRequest('github.com/acme/api#404')).toBeNull();
  });

  it('tracks review status, latest reviews per pull request, and interrupted work', () => {
    const store = createTestStore();
    const otherPrId = 'github.com/acme/api#2';

    const first = store.createReview({ prId: STORE_PR_ID, headSha: 'sha1', trigger: 'auto' });
    store.setReviewStatus(first.id, 'running');
    const running = store.getReview(first.id);
    store.setReviewStatus(first.id, 'cancelled', 'Cancelled');
    const second = store.createReview({ prId: STORE_PR_ID, headSha: 'sha2', trigger: 'manual' });
    const other = store.createReview({ prId: otherPrId, headSha: 'sha9', trigger: 'manual' });
    const run = store.createRun({ reviewId: second.id, providerId: 'claude-code', model: 'opus' });
    store.setReviewStatus(other.id, 'completed');
    const latest = store.latestReviewsByPr();

    expect(first).toMatchObject({ status: 'queued', trigger: 'auto', summary: null, completedAt: null, riskScore: null, hasRequirements: false });
    expect(running).toMatchObject({ status: 'running', error: null, completedAt: null });
    expect(store.getReview(first.id)).toMatchObject({ status: 'cancelled', error: 'Cancelled', completedAt: expect.any(Number) });
    expect(store.hasReviewForHead(STORE_PR_ID, 'sha1')).toBe(false);
    expect(store.hasReviewForHead(STORE_PR_ID, 'sha2')).toBe(true);
    expect(store.latestReview(STORE_PR_ID)?.id).toBe(second.id);
    expect(store.latestReview('github.com/acme/api#404')).toBeNull();
    expect(store.getReview('missing-review')).toBeNull();
    expect(latest.get(STORE_PR_ID)?.id).toBe(second.id);
    expect(latest.get(otherPrId)?.id).toBe(other.id);
    expect(run.reasoningLevel).toBeNull();

    expect(store.failInterruptedReviews()).toBe(1);
    expect(store.getReview(second.id)).toMatchObject({ status: 'failed', error: expect.stringContaining('Interrupted') });
    expect(store.getRun(run.id)).toMatchObject({ status: 'failed', error: expect.stringContaining('Interrupted') });
    expect(store.getReview(other.id)?.status).toBe('completed');
  });

  it('updates runs without losing the fields a patch leaves out', () => {
    const store = createTestStore();
    const review = store.createReview({ prId: STORE_PR_ID, headSha: 'sha1', trigger: 'manual' });
    const run = store.createRun({ reviewId: review.id, providerId: 'claude-code', model: 'sonnet', reasoningLevel: 'high' });

    store.updateRun(run.id, { status: 'running', threadId: 'thread-1' });
    store.updateRun(run.id, { error: 'slow' });
    const midway = store.getRun(run.id);
    store.updateRun(run.id, { status: 'failed', error: null });
    const failed = store.getRun(run.id);
    store.updateRun('missing-run', { status: 'completed' });
    store.completeRun(run.id, { summary: 'Fine', issueCount: 2, scores: { ...EMPTY_SCORES, riskScore: 3, coverageNote: 'Thin' } });
    store.completeReview(review.id, { summary: 'Done', consensusSummary: null, hasRequirements: true, scores: { ...EMPTY_SCORES, riskScore: 5, requirementsScore: 8, requirementsNote: 'Met' } });

    expect(run).toMatchObject({ reasoningLevel: 'high', threadId: null, status: 'queued', issueCount: 0, completedAt: null });
    expect(midway).toMatchObject({ status: 'running', threadId: 'thread-1', error: 'slow', completedAt: null });
    expect(failed).toMatchObject({ status: 'failed', threadId: 'thread-1', error: null, completedAt: expect.any(Number) });
    expect(store.getRun('missing-run')).toBeNull();
    expect(store.listRuns(review.id)).toEqual([
      expect.objectContaining({ status: 'completed', summary: 'Fine', issueCount: 2, riskScore: 3, coverageNote: 'Thin', simplicityScore: null, error: null })
    ]);
    expect(store.getReview(review.id)).toMatchObject({ status: 'completed', summary: 'Done', hasRequirements: true, riskScore: 5, requirementsScore: 8, requirementsNote: 'Met', consensusSummary: null });
  });

  it('replaces findings and records dismissals, posts, and posted reviews', () => {
    const store = createTestStore();
    const review = store.createReview({ prId: STORE_PR_ID, headSha: 'sha1', trigger: 'manual' });
    store.replaceFindings(review.id, [
      { category: 'logic', severity: 'high', file: 'src/a.ts', line: 3, description: 'Null user', suggestion: 'Guard it', agreedBy: ['a', 'b'], confidence: 1 },
      { category: 'style', severity: 'low', file: 'src/b.ts', line: null, description: 'Naming', suggestion: null, agreedBy: ['a'], confidence: 0.5 }
    ]);
    const byDescription = (description: string) => store.listFindings(review.id).find((finding) => finding.description === description)!;
    const nullUser = byDescription('Null user');
    const naming = byDescription('Naming');

    store.setFindingDismissed(naming.id, true);
    store.markFindingsPosted([nullUser.id]);
    const dismissed = byDescription('Naming');
    const posted = byDescription('Null user');
    store.setFindingDismissed(naming.id, false);
    const restored = byDescription('Naming');
    store.recordPostedReview({ reviewId: review.id, event: 'COMMENT', githubReviewId: 99, url: 'https://github.com/acme/api/pull/1#review-99', commentCount: 1 });
    store.recordPostedReview({ reviewId: review.id, event: 'APPROVE', githubReviewId: null, url: null, commentCount: 0 });
    store.replaceFindings(review.id, []);

    expect(nullUser).toMatchObject({ line: 3, suggestion: 'Guard it', agreedBy: ['a', 'b'], confidence: 1, postedAt: null, dismissed: false });
    expect(naming).toMatchObject({ line: null, suggestion: null, agreedBy: ['a'], confidence: 0.5 });
    expect(dismissed).toMatchObject({ dismissed: true, postedAt: null });
    expect(posted).toMatchObject({ dismissed: false, postedAt: expect.any(Number) });
    expect(restored.dismissed).toBe(false);
    expect(store.listFindings(review.id)).toEqual([]);
    expect(store.listPostedReviews(review.id)).toEqual([
      { event: 'COMMENT', url: 'https://github.com/acme/api/pull/1#review-99', commentCount: 1, postedAt: expect.any(Number) },
      { event: 'APPROVE', url: null, commentCount: 0, postedAt: expect.any(Number) }
    ]);
  });

  it('maps malformed stored values to safe defaults', () => {
    const row = {
      id: 'row-1',
      review_id: 'review-1',
      pr_id: 'pr-1',
      head_sha: 'sha1',
      status: 'failed',
      trigger: 'scheduled',
      provider_id: 'claude-code',
      model: 'opus',
      reasoning_level: 7,
      thread_id: null,
      summary: 42,
      issue_count: null,
      started_at: 5,
      completed_at: Number.NaN,
      risk_score: '7',
      coverage_score: Number.POSITIVE_INFINITY,
      category: 'logic',
      severity: 'low',
      file: 'src/a.ts',
      line: 'twelve',
      description: 'Broken',
      suggestion: null,
      agreed_by: '["a", 2, null]',
      confidence: null,
      posted_at: null,
      dismissed: 0,
      host: 'github.com',
      owner: 'acme',
      repo: 'api',
      number: '4',
      buckets: 'not json',
      synced_at: 9
    };
    const store = createStore(createRowDatabase(row));

    expect(store.getRun('row-1')).toMatchObject({ reasoningLevel: null, threadId: null, summary: null, issueCount: 0, completedAt: null, riskScore: null, coverageScore: null });
    expect(store.getReview('row-1')).toMatchObject({ trigger: 'manual', summary: null, completedAt: null });
    expect(store.listFindings('review-1')[0]).toMatchObject({ line: null, agreedBy: ['a'], confidence: 1, postedAt: null, dismissed: false });
    expect(store.getPullRequest('row-1')).toMatchObject({ number: 4, buckets: [] });
    for (const buckets of ['{"needs-review":true}', 7]) {
      expect(createStore(createRowDatabase({ ...row, buckets })).getPullRequest('row-1')?.buckets).toEqual([]);
    }
  });

  it('stamps rows with the system clock by default', () => {
    const before = Date.now();
    const store = createStore(createSqliteDatabase());

    const review = store.createReview({ prId: STORE_PR_ID, headSha: 'sha1', trigger: 'manual' });

    expect(review.createdAt).toBeGreaterThanOrEqual(before);
  });
});

describe('project matcher', () => {
  it('maps git remotes to projects case-insensitively and skips unusable entries', async () => {
    const run = vi.fn<CommandRunner>(async (_command, args) => {
      if (args[1] === '/work/api') return 'origin\thttps://github.com/Acme/API.git (fetch)\norigin\thttps://github.com/Acme/API.git (push)\n\nupstream\tnot-a-remote (fetch)';
      if (args[1] === '/work/fork') return 'origin\tgit@github.com:acme/api.git (fetch)\nmirror\tgit@ghe.example.com:team/web.git (fetch)';
      return null;
    });
    const listProjects = async (): Promise<ZanaProject[]> => [
      { id: 'scratch', name: 'Scratch' },
      { id: 'empty', name: 'Empty', path: '/work/empty' },
      { id: 'api', name: 'API', path: '/work/api' },
      { id: 'fork', name: 'Fork', path: '/work/fork' }
    ];
    const matcher = createProjectMatcher({ listProjects, run });

    const api = await matcher.projectForRepo({ host: 'github.com', owner: 'acme', name: 'api' });
    const web = await matcher.projectForRepo({ host: 'ghe.example.com', owner: 'team', name: 'web' });
    const missing = await matcher.projectForRepo({ host: 'github.com', owner: 'acme', name: 'missing' });
    const projects = await matcher.projects();

    expect(api).toMatchObject({ id: 'api', remote: 'origin' });
    expect(web).toMatchObject({ id: 'fork', remote: 'mirror' });
    expect(missing).toBeNull();
    expect(projects.map((project) => project.id)).toEqual(['scratch', 'empty', 'api', 'fork']);
    expect(run).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenCalledWith('git', ['-C', '/work/api', 'remote', '-v']);
  });

  it('uses the remote that points at the reviewed repository', async () => {
    const matcher = createProjectMatcher({
      listProjects: async () => [{ id: 'fork', name: 'Fork', path: '/work/fork' }],
      run: async () => 'origin\tgit@github.com:me/api.git (fetch)\nupstream\tgit@github.com:acme/api.git (fetch)\nupstream\tgit@github.com:acme/api.git (push)'
    });

    await expect(matcher.projectForRepo({ host: 'github.com', owner: 'acme', name: 'api' })).resolves.toMatchObject({ id: 'fork', remote: 'upstream' });
    await expect(matcher.projectForRepo({ host: 'github.com', owner: 'me', name: 'api' })).resolves.toMatchObject({ remote: 'origin' });
  });

  it('caches projects for five minutes and reloads after expiry or invalidation', async () => {
    let clock = 0;
    const listProjects = vi.fn(async (): Promise<ZanaProject[]> => [{ id: 'home', name: 'Home' }]);
    const matcher = createProjectMatcher({ listProjects, run: async () => null, now: () => clock });

    await matcher.projects();
    clock = 5 * 60_000 - 1;
    await matcher.projects();
    const callsWithinTtl = listProjects.mock.calls.length;
    clock = 5 * 60_000 + 1;
    await matcher.projects();
    const callsAfterExpiry = listProjects.mock.calls.length;
    matcher.invalidate();
    await matcher.projects();

    expect(callsWithinTtl).toBe(1);
    expect(callsAfterExpiry).toBe(2);
    expect(listProjects).toHaveBeenCalledTimes(3);
  });

  it('treats a failing project listing as having no projects', async () => {
    const matcher = createProjectMatcher({
      listProjects: async () => {
        throw new Error('host unavailable');
      },
      run: async () => null
    });

    expect(await matcher.projects()).toEqual([]);
    expect(await matcher.projectForRepo({ host: 'github.com', owner: 'acme', name: 'api' })).toBeNull();
  });
});
