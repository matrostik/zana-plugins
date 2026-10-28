import type { ModelChoice } from '../types.ts';
import { errorMessage, sleep } from '../util.ts';
import { extractJsonObject } from './parse.ts';

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

export const USAGE_LIMIT_PATTERNS: readonly RegExp[] = [
  /usage limit (?:has been )?reached/i,
  /(?:you have )?reached your (?:current )?(?:usage |request |token )?limit/i,
  /(?:you have )?reached your (?:current )?quota/i,
  /quota (?:has been )?exceeded/i,
  /exceeded (?:your )?(?:current )?quota/i,
  /insufficient[ _]quota/i,
  /rate limit (?:exceeded|reached)/i,
  /resource(?:_has_been|_is)?_exhausted/i,
  /resource has been exhausted/i,
  /credit balance is too low/i,
  /(?:daily|monthly|current) (?:usage |request |token )?limit reached/i,
  /limit will reset in \d+/i,
  /quota will reset in \d+/i
];

export function looksLikeValidReview(text: string): boolean {
  try {
    const json = extractJsonObject(text);
    if (!json) return false;
    const data = JSON.parse(json) as Record<string, unknown>;
    const hasSummary = typeof data.summary === 'string' && data.summary.trim().length > 0;
    const hasScore = typeof data.riskScore === 'number' || (typeof data.riskScore === 'string' && !Number.isNaN(Number(data.riskScore)));
    return typeof data === 'object' && data !== null && hasSummary && Boolean(hasScore);
  } catch {
    return false;
  }
}

function hasReviewJsonContent(text: string): boolean {
  return /"(?:summary|riskScore|securityIssues|performanceIssues|logicIssues|styleIssues|coverageScore|requirementsScore|simplicityScore|stabilityScore)"/i.test(text);
}

export function detectStructuredProviderError(text: string): string | null {
  try {
    const json = extractJsonObject(text);
    if (!json) return null;
    const data = JSON.parse(json) as Record<string, unknown>;
    if (!data || typeof data !== 'object') return null;

    const errorObj = data.error && typeof data.error === 'object'
      ? (data.error as Record<string, unknown>)
      : data;

    const code = String(errorObj.code ?? data.code ?? '');
    const type = String(errorObj.type ?? data.type ?? '');
    const status = String(errorObj.status ?? data.status ?? '');
    const message = String(errorObj.message ?? data.message ?? '');

    const combined = `${code} ${type} ${status} ${message}`.trim();
    if (!combined) return null;

    for (const pattern of USAGE_LIMIT_PATTERNS) {
      if (pattern.test(combined)) {
        if (message && code && code !== message) {
          return `${message} (${code})`;
        }
        return message || code || type || status || 'Usage limit reached';
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

export function detectUsageLimit(text: string, lastAssistantText?: string): string | null {
  if (!text && !lastAssistantText) return null;
  if (looksLikeValidReview(text) || (lastAssistantText && looksLikeValidReview(lastAssistantText))) {
    return null;
  }

  const structured = (lastAssistantText ? detectStructuredProviderError(lastAssistantText) : null) ?? (text ? detectStructuredProviderError(text) : null);
  if (structured) return structured;

  const candidate = (lastAssistantText && lastAssistantText.trim().length > 0 ? lastAssistantText : (text.length > 2000 ? text.slice(-2000) : text)).trim();
  if (!candidate || hasReviewJsonContent(candidate)) return null;

  for (const pattern of USAGE_LIMIT_PATTERNS) {
    if (pattern.test(candidate)) {
      const lines = candidate
        .split('\n')
        .map((line) => line.trim().replace(/^[*#_`-]+/, '').replace(/[*#_`-]+$/, '').trim())
        .filter(Boolean);

      if (lines.length <= 4) {
        return lines.reduce((acc, curr) => {
          if (!acc) return curr;
          if (acc.endsWith(':') || acc.endsWith('.')) return `${acc} ${curr}`;
          return `${acc}: ${curr}`;
        }, '');
      }

      const matchIndex = lines.findIndex((l) => pattern.test(l));
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 1);
        const end = Math.min(lines.length, matchIndex + 2);
        return lines.slice(start, end).join(' — ');
      }
      return lines[0];
    }
  }
  return null;
}

export function usageLimitErrorMessage(usage: string): string {
  return `Review thread stopped: usage limit reached (${usage})`;
}

export async function stopForUsageLimit(
  threads: Pick<ThreadsApi, 'stop'>,
  threadId: string,
  text: string,
  lastAssistantText?: string
): Promise<Error | null> {
  const usage = detectUsageLimit(text, lastAssistantText);
  if (!usage) return null;
  await threads.stop({ threadId }).catch(() => undefined);
  return new Error(usageLimitErrorMessage(usage));
}

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
    if (event.name !== 'thread.idle') return;
    // The host truncates lifecycle `lastAssistantText` (4096 chars), so prefer the full thread output.
    // A repair turn can register a new waiter for this thread while the output read is in flight.
    const output = await currentOutput(event.threadId);
    if (waiters.get(event.threadId) !== waiter) return;
    const text = output.trim() ? output : event.lastAssistantText ?? '';
    if (text.trim() && text !== waiter.baseline) {
      if (!looksLikeValidReview(text)) {
        const usageError = await stopForUsageLimit(threads, event.threadId, text, event.lastAssistantText);
        if (usageError) {
          settle(event.threadId, { error: usageError });
          return;
        }
      }
      settle(event.threadId, { text });
    }
  }

  /** Reads the thread status once and settles the waiter when the thread has failed, stopped, or finished. */
  async function checkThread(threadId: string, baseline: string, isFinished: () => boolean): Promise<void> {
    const thread = await threads.get({ threadId }).catch(() => null);
    const status = thread?.status?.toLowerCase() ?? '';
    if (FAILED_STATUSES.has(status)) {
      settle(threadId, { error: new Error(`Review thread ended with status "${status}"`) });
    } else if (STOPPED_STATUSES.has(status)) {
      settle(threadId, { error: new Error('Review thread was stopped') });
    } else if (DONE_STATUSES.has(status)) {
      const waiter = waiters.get(threadId);
      const text = await currentOutput(threadId);
      if (isFinished() || waiters.get(threadId) !== waiter) return;
      if (text.trim() && text !== baseline) {
        if (!looksLikeValidReview(text)) {
          const usageError = await stopForUsageLimit(threads, threadId, text);
          if (usageError) {
            settle(threadId, { error: usageError });
            return;
          }
        }
        settle(threadId, { text });
      }
    }
  }

  /** Resolves with the thread's next new final output; rejects on failure, stop, timeout, or abort. */
  async function waitForOutput(threadId: string, args: { baseline?: string; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<string> {
    const baseline = args.baseline ?? '';
    const deadline = Date.now() + (args.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    let finished = false;
    const done = new Promise<string>((resolve, reject) => {
      waiters.set(threadId, {
        baseline,
        resolve: (text) => {
          finished = true;
          resolve(text);
        },
        reject: (error) => {
          finished = true;
          reject(error);
        }
      });
    });
    const stopPolling = new AbortController();
    const forwardAbort = () => stopPolling.abort();
    if (args.signal?.aborted) stopPolling.abort();
    else args.signal?.addEventListener('abort', forwardAbort, { once: true });

    const poll = (async () => {
      while (!finished) {
        try {
          await sleep(pollMs, stopPolling.signal);
        } catch {
          if (args.signal?.aborted) settle(threadId, { error: new Error('Review cancelled') });
          return;
        }
        if (finished) return;
        if (Date.now() > deadline) {
          settle(threadId, { error: new Error('Review thread timed out') });
          return;
        }
        await checkThread(threadId, baseline, () => finished);
      }
    })();

    try {
      return await done;
    } finally {
      finished = true;
      args.signal?.removeEventListener('abort', forwardAbort);
      stopPolling.abort();
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
    if (!input.validate(text).ok) {
      const usageError = await stopForUsageLimit(threads, threadId, text);
      if (usageError) throw usageError;
    }
    const first = input.validate(text);
    if (!first.ok) {
      await threads.send({ threadId, prompt: input.repairPrompt(first.problem) });
      text = await waiter.waitForOutput(threadId, { baseline: text, timeoutMs: input.timeoutMs, signal: input.signal });
      if (!input.validate(text).ok) {
        const repairUsageError = await stopForUsageLimit(threads, threadId, text);
        if (repairUsageError) throw repairUsageError;
      }
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

export const FULL_ACCESS_PERMISSION_MODE = 'full';

/**
 * Returns the provider's full-access permission mode so automated reviews never stop on an approval prompt.
 * Undefined means the provider cannot run unattended; callers must not fall back to a default.
 */
export function pickReviewPermissionMode(modes: readonly string[] | undefined): string | undefined {
  return modes?.find((mode) => mode.toLowerCase() === FULL_ACCESS_PERMISSION_MODE);
}
