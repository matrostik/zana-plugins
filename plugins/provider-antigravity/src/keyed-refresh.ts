/**
 * How a finished refresh counts. `discard` results belong to an account that changed while the
 * refresh ran: they are returned to the waiting callers but never cached or backed off.
 */
export type RefreshOutcome = 'success' | 'failure' | 'discard';

export interface RefreshRun<T> {
  result: T;
  outcome: RefreshOutcome;
  /** The key the result belongs to now, which can differ from the start key after the refresh's own write. */
  key: string;
}

export interface RefreshPolicy {
  /** Successful results are served without refreshing for this long. */
  successTtlMs?: number;
  /** A failed key is not refreshed again for this long. */
  failureBackoffMs?: number;
  /** Remembered keys per kind; the oldest is dropped first. */
  maxKeys?: number;
  now?: () => number;
}

function remember<V>(map: Map<string, V>, key: string, value: V, maxKeys: number): void {
  map.delete(key);
  if (map.size >= maxKeys) map.delete(map.keys().next().value!);
  map.set(key, value);
}

/** Coalesces refreshes per key and applies one caching and backoff policy to their outcomes. */
export class KeyedRefresh<T> {
  private readonly running = new Map<string, Promise<T>>();
  private readonly successes = new Map<string, { result: T; at: number }>();
  private readonly retryAfter = new Map<string, number>();

  constructor(private readonly policy: RefreshPolicy = {}) {}

  private now(): number {
    return this.policy.now ? this.policy.now() : Date.now();
  }

  /** A success cached for `key` within the TTL. */
  cached(key: string): T | undefined {
    const hit = this.successes.get(key);
    return hit && this.policy.successTtlMs !== undefined && this.now() - hit.at < this.policy.successTtlMs
      ? hit.result
      : undefined;
  }

  /**
   * Joins the refresh already running for `key`. Otherwise, if `key` failed within the backoff and
   * `whileBackingOff` is given, answers with it; otherwise starts `task`.
   */
  run(key: string, task: () => Promise<RefreshRun<T>>, options: { whileBackingOff?: () => T } = {}): Promise<T> {
    const running = this.running.get(key);
    if (running) return running;
    const retry = this.retryAfter.get(key);
    if (options.whileBackingOff && retry !== undefined && retry > this.now()) return Promise.resolve(options.whileBackingOff());
    const refresh = task().then(run => {
      this.settle(key, run);
      return run.result;
    }).finally(() => this.running.delete(key));
    this.running.set(key, refresh);
    return refresh;
  }

  private settle(startKey: string, run: RefreshRun<T>): void {
    if (run.outcome === 'discard') return;
    const maxKeys = this.policy.maxKeys ?? 32;
    if (run.key !== startKey) this.retryAfter.delete(startKey);
    if (run.outcome === 'success') {
      this.retryAfter.delete(run.key);
      if (this.policy.successTtlMs !== undefined) remember(this.successes, run.key, { result: run.result, at: this.now() }, maxKeys);
    } else if (this.policy.failureBackoffMs !== undefined) {
      remember(this.retryAfter, run.key, this.now() + this.policy.failureBackoffMs, maxKeys);
    }
  }
}
