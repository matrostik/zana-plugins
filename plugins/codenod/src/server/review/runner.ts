import type { ModelChoice } from '../types.ts';
import { errorMessage, sleep } from '../util.ts';

export type SpawnEnvironment =
  | { kind: 'unmanaged' | 'personal' }
  | { kind: 'worktree'; branchSlug?: string; baseBranch?: string };

export interface ThreadsApi {
  spawn(args: {
    projectId: string;
    prompt: string;
    providerId?: string;
    title?: string;
    model?: string;
    reasoningLevel?: string;
    permissionMode?: string;
    visibility?: 'visible' | 'hidden';
    environment?: SpawnEnvironment;
  }): Promise<{ id: string }>;
  get(args: { threadId: string }): Promise<{ status: string } | null>;
  output(args: { threadId: string }): Promise<{ output: string }>;
  send(args: { threadId: string; prompt: string }): Promise<{ id: string }>;
  stop(args: { threadId: string }): Promise<{ ok: true }>;
  archive(args: { threadId: string }): Promise<{ id: string }>;
}

export interface ThreadEvent {
  name: string;
  threadId: string;
  lastAssistantText?: string;
  error?: unknown;
}

const DONE_STATUSES = new Set(['idle', 'completed', 'done', 'finished']);
const FAILED_STATUSES = new Set(['failed', 'error', 'errored', 'crashed']);
const STOPPED_STATUSES = new Set(['stopped', 'cancelled', 'canceled', 'archived', 'deleted']);

export const DEFAULT_POLL_MS = 10_000;
export const DEFAULT_TIMEOUT_MS = 20 * 60_000;

interface Waiter {
  baseline: string;
  resolve(text: string): void;
  reject(error: Error): void;
}

/**
 * Tracks hidden worker threads. Completion comes from `thread.idle` /
 * `thread.failed` events when available, with status polling as a fallback.
 */
export function createThreadWaiter(threads: ThreadsApi, options: { pollMs?: number } = {}) {
  const waiters = new Map<string, Waiter>();
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;

  async function currentOutput(threadId: string): Promise<string> {
    try {
      return (await threads.output({ threadId })).output ?? '';
    } catch {
      return '';
    }
  }

  function settle(threadId: string, outcome: { text: string } | { error: Error }): void {
    const waiter = waiters.get(threadId);
    if (!waiter) return;
    waiters.delete(threadId);
    if ('error' in outcome) waiter.reject(outcome.error);
    else waiter.resolve(outcome.text);
  }

  async function onEvent(event: ThreadEvent): Promise<void> {
    const waiter = waiters.get(event.threadId);
    if (!waiter) return;
    if (event.name === 'thread.failed') {
      settle(event.threadId, { error: new Error(`Review thread failed: ${errorMessage(event.error ?? 'unknown error')}`) });
      return;
    }
    if (event.name === 'thread.idle') {
      // The host truncates lifecycle `lastAssistantText` (4096 chars), so prefer the full thread output.
      const output = await currentOutput(event.threadId);
      const text = output.trim() ? output : event.lastAssistantText ?? '';
      if (text.trim() && text !== waiter.baseline) settle(event.threadId, { text });
    }
  }

  /** Resolves with the thread's next new final output; rejects on failure, stop, timeout, or abort. */
  async function waitForOutput(threadId: string, args: { baseline?: string; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<string> {
    const baseline = args.baseline ?? '';
    const deadline = Date.now() + (args.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const done = new Promise<string>((resolve, reject) => waiters.set(threadId, { baseline, resolve, reject }));
    let finished = false;
    void done.then(
      () => (finished = true),
      () => (finished = true)
    );

    const poll = (async () => {
      while (!finished) {
        try {
          await sleep(pollMs, args.signal);
        } catch {
          settle(threadId, { error: new Error('Review cancelled') });
          return;
        }
        if (finished) return;
        if (Date.now() > deadline) {
          settle(threadId, { error: new Error('Review thread timed out') });
          return;
        }
        const thread = await threads.get({ threadId }).catch(() => null);
        const status = thread?.status?.toLowerCase() ?? '';
        if (FAILED_STATUSES.has(status)) {
          settle(threadId, { error: new Error(`Review thread ended with status "${status}"`) });
        } else if (STOPPED_STATUSES.has(status)) {
          settle(threadId, { error: new Error('Review thread was stopped') });
        } else if (DONE_STATUSES.has(status)) {
          const text = await currentOutput(threadId);
          if (text.trim() && text !== baseline) settle(threadId, { text });
        }
      }
    })();

    try {
      return await done;
    } finally {
      finished = true;
      await poll.catch(() => undefined);
    }
  }

  return { onEvent, waitForOutput, pending: () => waiters.size };
}

export type ThreadWaiter = ReturnType<typeof createThreadWaiter>;

export interface RunModelInput {
  projectId: string;
  environment?: SpawnEnvironment;
  model: ModelChoice;
  permissionMode?: string;
  title: string;
  prompt: string;
  validate(text: string): { ok: true } | { ok: false; problem: string };
  repairPrompt(problem: string): string;
  timeoutMs?: number;
  signal?: AbortSignal;
  onThread?(threadId: string): void;
  archiveWhenDone?: boolean;
}

/** Spawns one hidden worker thread, waits for its answer, and asks once for a repair if it is unusable. */
export async function runModelInThread(threads: ThreadsApi, waiter: ThreadWaiter, input: RunModelInput): Promise<{ threadId: string; text: string }> {
  const spawned = await threads.spawn({
    projectId: input.projectId,
    prompt: input.prompt,
    providerId: input.model.providerId,
    model: input.model.model,
    reasoningLevel: input.model.reasoningLevel,
    permissionMode: input.permissionMode,
    title: input.title,
    visibility: 'hidden',
    environment: input.environment
  });
  const threadId = spawned.id;
  input.onThread?.(threadId);
  const onAbort = () => void threads.stop({ threadId }).catch(() => undefined);
  input.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    let text = await waiter.waitForOutput(threadId, { timeoutMs: input.timeoutMs, signal: input.signal });
    const first = input.validate(text);
    if (!first.ok) {
      await threads.send({ threadId, prompt: input.repairPrompt(first.problem) });
      text = await waiter.waitForOutput(threadId, { baseline: text, timeoutMs: input.timeoutMs, signal: input.signal });
    }
    return { threadId, text };
  } catch (error) {
    await threads.stop({ threadId }).catch(() => undefined);
    throw error;
  } finally {
    input.signal?.removeEventListener('abort', onAbort);
    if (input.archiveWhenDone !== false) await threads.archive({ threadId }).catch(() => undefined);
  }
}

const READ_ONLY_PERMISSION_PREFERENCE = ['read-only', 'readonly', 'readOnly', 'plan', 'default', 'ask', 'auto'];

/** Picks the most restrictive permission mode a provider advertises, or undefined to use its default. */
export function pickReadOnlyPermissionMode(modes: readonly string[] | undefined): string | undefined {
  if (!modes || modes.length === 0) return undefined;
  for (const preferred of READ_ONLY_PERMISSION_PREFERENCE) {
    const match = modes.find((mode) => mode.toLowerCase() === preferred.toLowerCase());
    if (match) return match;
  }
  return undefined;
}
