import type { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

/** Returned by a handler that should leave the request unanswered. */
export const NO_REPLY = Symbol('no reply');

export class AcpFailure {
  constructor(readonly message: string, readonly code = -32000, readonly data?: unknown) {}
}

/** A JSON-RPC error reply. */
export function fail(message: string, code?: number, data?: unknown): AcpFailure {
  return new AcpFailure(message, code, data);
}

export interface FakeContext {
  /** Sends a `session/update` notification. */
  update(update: Record<string, unknown>, sessionId?: string): void;
  notify(method: string, params?: unknown): void;
  stderr(line: string): void;
  after(ms: number, run: () => void): void;
  /** Index of the spawned process, starting at 0. */
  readonly spawn: number;
}

type Handler = (params: any, context: FakeContext) => unknown;
export type FakeScript = Record<string, Handler>;

export const QUOTA_TEXT = '### Quota Limits\n- **Gemini**\n  - **Weekly:** 14% remaining (resets Oct 31, 2026, 06:11 UTC)';

/** A runtime that advertises /usage on session/new and answers it with `text`. */
export function usageScript(text: string = QUOTA_TEXT, overrides: FakeScript = {}): FakeScript {
  return {
    'session/new': (_params, context) => {
      context.update({ sessionUpdate: 'available_commands_update', availableCommands: [{ name: 'usage' }] });
      return { sessionId: 's1' };
    },
    'session/prompt': (_params, context) => {
      context.update({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } });
      return { stopReason: 'end_turn' };
    },
    ...overrides
  };
}

/** A session/new reply carrying a model catalog. */
export function catalogSession(...ids: string[]): Record<string, unknown> {
  return { sessionId: 's1', configOptions: [{ id: 'model', options: ids.map(id => ({ value: id, name: id[0].toUpperCase() + id.slice(1) })) }] };
}

const DEFAULTS: FakeScript = {
  initialize: () => ({ protocolVersion: 1, authMethods: [] }),
  authenticate: () => ({}),
  'session/new': () => ({ sessionId: 's1' }),
  'session/prompt': () => ({ stopReason: 'end_turn' })
};

/**
 * Scripted stand-in for `agy_acp_server` at the spawn seam. Each spawn gets its own fake process
 * that answers requests through `script` handlers, falling back to minimal successful replies.
 */
export class FakeAcpServer {
  readonly requests: Array<{ method: string; params: any; spawn: number }> = [];
  /** Replies the client sent to server-initiated requests. */
  readonly clientReplies: any[] = [];
  spawnCount = 0;
  /** Processes whose stdin the client closed. */
  endedCount = 0;
  readonly processes: EventEmitter[] = [];

  constructor(private readonly script: FakeScript = {}) {}

  readonly spawnImpl = ((_command: string, _args: readonly string[], _options: unknown) => this.spawnProcess()) as unknown as typeof spawn;

  methods(): string[] {
    return this.requests.map(request => request.method);
  }

  private spawnProcess() {
    const index = this.spawnCount++;
    const child = new EventEmitter() as any;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => true;
    const emit = (message: unknown) => child.stdout.emit('data', JSON.stringify({ jsonrpc: '2.0', ...(message as object) }) + '\n');
    const context: FakeContext = {
      update: (update, sessionId = 's1') => emit({ method: 'session/update', params: { sessionId, update } }),
      notify: (method, params) => emit({ method, params }),
      stderr: line => child.stderr.emit('data', line + '\n'),
      after: (ms, run) => { setTimeout(run, ms); },
      spawn: index
    };
    child.stdin = {
      on: () => child.stdin,
      end: () => { this.endedCount++; },
      write: (chunk: string) => {
        for (const line of String(chunk).split('\n').filter(Boolean)) {
          const message = JSON.parse(line);
          if (typeof message.method !== 'string') { this.clientReplies.push(message); continue; }
          this.requests.push({ method: message.method, params: message.params, spawn: index });
          const handler = this.script[message.method] ?? DEFAULTS[message.method];
          queueMicrotask(async () => {
            const reply = handler ? await handler(message.params, context) : NO_REPLY;
            if (reply === NO_REPLY) return;
            if (reply instanceof AcpFailure) {
              emit({ id: message.id, error: { code: reply.code, message: reply.message, ...(reply.data ? { data: reply.data } : {}) } });
            } else {
              emit({ id: message.id, result: reply });
            }
          });
        }
        return true;
      }
    };
    this.processes.push(child);
    return child;
  }
}
