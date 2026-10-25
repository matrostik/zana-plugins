import { DatabaseSync } from 'node:sqlite';
import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { Database } from '../server/db.ts';

export function createSqliteDatabase(): Database {
  const sqlite = new DatabaseSync(':memory:');
  const applied = new Set<string>();
  const runStatement = (sql: string) => sqlite.prepare(sql).run();
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return {
        all: (...params: unknown[]) => statement.all(...(params as never[])) as unknown[],
        get: (...params: unknown[]) => statement.get(...(params as never[])) as unknown,
        run: (...params: unknown[]) => ({ changes: Number(statement.run(...(params as never[])).changes) })
      };
    },
    migrate(statements) {
      for (const statement of statements) {
        if (applied.has(statement)) continue;
        runStatement(statement);
        applied.add(statement);
      }
    },
    transaction(fn) {
      runStatement('BEGIN');
      try {
        const result = fn();
        runStatement('COMMIT');
        return result;
      } catch (error) {
        runStatement('ROLLBACK');
        throw error;
      }
    }
  };
}

export interface FakeThread {
  id: string;
  args: Record<string, unknown>;
  status: string;
  output: string;
  sent: string[];
  archived: boolean;
}

export interface FakeHostOptions {
  settings?: Record<string, string | number | boolean>;
  /** Produces the assistant reply for a spawned or follow-up prompt. */
  reply?: (thread: FakeThread, prompt: string) => string;
  projects?: Array<{ id: string; name: string; path?: string }>;
  consumeApproval?: (input: { token: string; binding: unknown }) => Promise<boolean>;
}

/** Mirrors the host, which truncates `lastAssistantText` on lifecycle events. */
const LIFECYCLE_TEXT_MAX_CHARS = 4_096;

export function createFakeHost(options: FakeHostOptions = {}) {
  const kv = new Map<string, unknown>();
  const rpc = new Map<string, (args: unknown) => unknown>();
  const events = new Map<string, Array<(event: unknown) => unknown>>();
  const schedules: Array<() => unknown> = [];
  const published: Array<{ event: string; payload: unknown }> = [];
  const inbox: Array<{ projectId: string; comments: string }> = [];
  const tools: Array<{ name: string; execute(input: unknown, ctx: unknown): unknown }> = [];
  const threads = new Map<string, FakeThread>();
  const disposers: Array<() => unknown> = [];
  const settingValues: Record<string, string | number | boolean | undefined> = { ...(options.settings ?? {}) };
  let cli: { run(argv: string[], ctx: unknown): Promise<{ exitCode: number; stdout?: string; stderr?: string }> } | null = null;
  let threadCount = 0;
  const db = createSqliteDatabase();

  const emit = async (name: string, event: unknown) => {
    for (const handler of events.get(name) ?? []) await handler(event);
  };

  const finishTurn = (thread: FakeThread, prompt: string) => {
    setTimeout(() => {
      thread.output = options.reply ? options.reply(thread, prompt) : '{}';
      thread.status = 'idle';
      const lastAssistantText = thread.output.length <= LIFECYCLE_TEXT_MAX_CHARS ? thread.output : `${thread.output.slice(0, LIFECYCLE_TEXT_MAX_CHARS)}…`;
      void emit('thread.idle', { name: 'thread.idle', threadId: thread.id, lastAssistantText });
    }, 5);
  };

  const zcc = {
    pluginId: 'codenod',
    log: { debug() {}, info() {}, warn() {}, error() {} },
    settings: {
      define(descriptors: Record<string, { default?: string | number | boolean }>) {
        for (const [key, descriptor] of Object.entries(descriptors)) {
          if (settingValues[key] === undefined && descriptor.default !== undefined) settingValues[key] = descriptor.default;
        }
        return { get: async () => ({ ...settingValues }), onChange() {} };
      }
    },
    storage: {
      kv: {
        get: async (key: string) => kv.get(key),
        set: async (key: string, value: unknown) => void kv.set(key, value),
        delete: async (key: string) => void kv.delete(key),
        list: async (prefix = '') => [...kv.keys()].filter((key) => key.startsWith(prefix))
      },
      database: () => db
    },
    rpc: { method: (name: string, handler: (args: unknown) => unknown) => void rpc.set(name, handler) },
    realtime: { publish: (event: string, payload: unknown) => void published.push({ event, payload }) },
    background: { service() {}, schedule: (_cron: string, job: () => unknown) => void schedules.push(job) },
    cli: { register: (registration: typeof cli) => void (cli = registration) },
    agents: { registerTool: (tool: (typeof tools)[number]) => void tools.push(tool) },
    events: {
      on: (name: string, handler: (event: unknown) => unknown) => void events.set(name, [...(events.get(name) ?? []), handler])
    },
    ui: options.consumeApproval ? { experimental_consumeApproval: options.consumeApproval } : {},
    status: { needsConfiguration() {} },
    sdk: {
      threads: {
        async spawn(args: Record<string, unknown>) {
          const thread: FakeThread = { id: `thread-${++threadCount}`, args, status: 'running', output: '', sent: [], archived: false };
          threads.set(thread.id, thread);
          finishTurn(thread, String(args.prompt));
          return { id: thread.id };
        },
        async get({ threadId }: { threadId: string }) {
          const thread = threads.get(threadId);
          return thread ? { id: thread.id, status: thread.status } : null;
        },
        async output({ threadId }: { threadId: string }) {
          return { output: threads.get(threadId)?.output ?? '' };
        },
        async send({ threadId, prompt }: { threadId: string; prompt: string }) {
          const thread = threads.get(threadId)!;
          thread.sent.push(prompt);
          thread.status = 'running';
          finishTurn(thread, prompt);
          return { id: `${threadId}-turn` };
        },
        async stop({ threadId }: { threadId: string }) {
          const thread = threads.get(threadId);
          if (thread) thread.status = 'stopped';
          return { ok: true as const };
        },
        async archive({ threadId }: { threadId: string }) {
          const thread = threads.get(threadId);
          if (thread) thread.archived = true;
          return { id: threadId };
        }
      },
      providers: {
        list: async () => [{ id: 'claude-code', available: true, displayName: 'Claude Code', capabilities: { permissionModes: ['default', 'plan', 'bypass'] } }],
        models: async () => ({
          models: [{ id: 'opus', model: 'Opus', supportedReasoningEfforts: [{ reasoningEffort: 'high' }] }],
          selectedOnlyModels: [],
          modelLoadError: null
        })
      },
      assistant: { complete: async () => ({ text: 'Both models agree on the null dereference.' }) },
      inbox: { push: async (entry: { projectId: string; comments: string }) => (inbox.push(entry), { id: `inbox-${inbox.length}` }) },
      projects: { list: async () => options.projects ?? [{ id: 'home', name: 'Home' }] }
    },
    onDispose: (hook: () => unknown) => void disposers.push(hook)
  };

  return {
    zcc: zcc as unknown as ZccPluginApi,
    kv,
    threads,
    published,
    inbox,
    tools,
    settingValues,
    async callRpc(name: string, args?: unknown) {
      const handler = rpc.get(name);
      if (!handler) throw new Error(`no rpc ${name}`);
      return handler(args);
    },
    async runCli(argv: string[]) {
      if (!cli) throw new Error('no cli');
      return cli.run(argv, {});
    },
    async tick() {
      for (const job of schedules) await job();
    },
    async dispose() {
      for (const hook of disposers) await hook();
    }
  };
}

export interface FakeResponse {
  status: number;
  body: unknown;
}

export function respond(status: number, body: unknown): FakeResponse {
  return { status, body };
}

/** Routes GitHub REST calls to handlers keyed by `METHOD path` (query string excluded). */
export function createFakeFetch(routes: Record<string, (url: URL, body: unknown) => unknown>) {
  const calls: Array<{ method: string; url: string; body: unknown }> = [];
  const fetch = async (url: string, init: { method: string; body?: string }) => {
    const parsed = new URL(url);
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method, url, body });
    const path = parsed.pathname.replace(/^\/api\/v3/, '');
    const handler = routes[`${init.method} ${path}`];
    const result = handler ? handler(parsed, body) : respond(404, { message: 'Not Found' });
    const response = result instanceof Object && 'status' in result && 'body' in result && Object.keys(result).length === 2
      ? (result as FakeResponse)
      : { status: 200, body: result };
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      headers: { get: () => null },
      text: async () => JSON.stringify(response.body)
    };
  };
  return { fetch, calls };
}
