import { DatabaseSync } from 'node:sqlite';
import type { PluginDatabase, ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { ThreadSummaryLike } from '../server/indexer.ts';

export function createSqliteDatabase(): PluginDatabase {
  const sqlite = new DatabaseSync(':memory:');
  const applied = new Set<string>();
  const runScript = (sql: string) => sqlite.exec(sql);
  return {
    runScript,
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        all: (...params: unknown[]) => statement.all(...(params as never[])) as unknown[],
        get: (...params: unknown[]) => statement.get(...(params as never[])) as unknown,
        run: (...params: unknown[]) => ({ changes: Number(statement.run(...(params as never[])).changes) })
      };
    },
    migrate(statements: readonly string[]) {
      for (const statement of statements) {
        if (applied.has(statement)) continue;
        sqlite.prepare(statement).run();
        applied.add(statement);
      }
    },
    transaction<T>(fn: () => T): T {
      sqlite.exec('BEGIN');
      try {
        const result = fn();
        sqlite.exec('COMMIT');
        return result;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    }
  };
}

export interface FakeThreadRecord extends ThreadSummaryLike {
  events: Array<{ seq: number; type: string; payload: unknown; createdAt?: number }>;
  defaultModel?: string;
}

export interface FakeHostOptions {
  settings?: Record<string, string | number | boolean>;
  providers?: Array<{
    id: string;
    available: boolean;
    displayName?: string;
    models?: string[];
  }>;
  projects?: Array<{ id: string; name: string; path?: string }>;
  threads?: FakeThreadRecord[];
  inboxShouldThrow?: boolean;
}

export function createFakeHost(options: FakeHostOptions = {}) {
  const db = createSqliteDatabase();
  const kv = new Map<string, unknown>();
  const rpc = new Map<string, (args: unknown) => unknown>();
  const eventHandlers = new Map<string, Array<(event: unknown) => unknown>>();
  const schedules: Array<() => unknown> = [];
  const published: Array<{ event: string; payload: unknown }> = [];
  const inbox: Array<{ projectId: string; comments: string }> = [];
  const tools: Array<{ name: string; description: string; execute(input: unknown, ctx: unknown): unknown }> = [];
  const disposers: Array<() => unknown> = [];
  const logs: Array<{ level: string; message: string }> = [];
  const settingValues: Record<string, string | number | boolean | undefined> = { ...(options.settings ?? {}) };
  const settingListeners: Array<(next: Record<string, string | number | boolean | undefined>) => void> = [];
  const providers = [...(options.providers ?? [])];
  const projects = [...(options.projects ?? [])];
  const threads = new Map((options.threads ?? []).map((t) => [t.id, t]));
  let cli: {
    name: string;
    summary: string;
    run(argv: string[], ctx: unknown): Promise<{ exitCode: number; stdout?: string; stderr?: string }>;
  } | null = null;

  const zcc = {
    pluginId: 'ai-usage-monitor',
    log: {
      debug: (message: string) => void logs.push({ level: 'debug', message }),
      info: (message: string) => void logs.push({ level: 'info', message }),
      warn: (message: string) => void logs.push({ level: 'warn', message }),
      error: (message: string) => void logs.push({ level: 'error', message })
    },
    settings: {
      define(descriptors: Record<string, { default?: string | number | boolean }>) {
        for (const [k, d] of Object.entries(descriptors)) {
          if (settingValues[k] === undefined && d.default !== undefined) settingValues[k] = d.default;
        }
        return {
          get: async () => ({ ...settingValues }),
          onChange: (cb: (next: Record<string, string | number | boolean | undefined>) => void) => {
            settingListeners.push(cb);
          }
        };
      }
    },
    http: { route() {} },
    storage: {
      kv: {
        get: async <T>(key: string) => kv.get(key) as T | undefined,
        set: async (key: string, value: unknown) => void kv.set(key, value),
        delete: async (key: string) => void kv.delete(key),
        list: async (prefix = '') => [...kv.keys()].filter((k) => k.startsWith(prefix))
      },
      database: () => db,
      backupDatabase: async () => {
        throw new Error('not implemented in fake');
      }
    },
    rpc: {
      method: (name: string, handler: (args: unknown) => unknown) => void rpc.set(name, handler)
    },
    realtime: {
      publish: (event: string, payload: unknown) => void published.push({ event, payload })
    },
    background: {
      service() {},
      schedule: (_cron: string, job: () => unknown) => void schedules.push(job)
    },
    remoteEnvironment: { provide() {}, refresh() {} },
    cli: {
      register: (registration: NonNullable<typeof cli>) => {
        cli = registration;
      }
    },
    agents: {
      contributeInstructions() {},
      contributeSkills() {},
      registerTool: (tool: (typeof tools)[number]) => void tools.push(tool),
      experimental_registerProvider() {
        return { id: 'x', unregister() {} };
      },
      experimental_registerPtyHarness() {
        return { id: 'x', unregister() {} };
      },
      configure() {}
    },
    events: {
      on: (name: string, handler: (event: unknown) => unknown) => {
        eventHandlers.set(name, [...(eventHandlers.get(name) ?? []), handler]);
      }
    },
    ui: { requestInput: async () => null, registerMentionProvider() {} },
    status: { needsConfiguration() {}, configured() {} },
    sdk: {
      system: { defaultHost: async () => ({ id: 'host-1' }) },
      threads: {
        search: async ({ limit = 200 }: { query: string; archived?: boolean; limit?: number }) =>
          [...threads.values()].slice(0, limit),
        list: async () => [...threads.values()],
        get: async ({ threadId }: { threadId: string }) => threads.get(threadId) ?? null,
        events: {
          list: async ({
            threadId,
            types
          }: {
            threadId: string;
            limit?: number;
            types?: readonly string[];
            order?: 'asc' | 'desc';
          }) => {
            const t = threads.get(threadId);
            if (!t) return [];
            const typeSet = types ? new Set(types) : null;
            return t.events
              .filter((ev) => !typeSet || typeSet.has(ev.type))
              .sort((a, b) => a.seq - b.seq);
          }
        },
        defaultExecutionOptions: async ({ threadId }: { threadId: string }) => {
          const t = threads.get(threadId);
          return {
            model: t?.defaultModel ?? '',
            reasoningLevel: 'medium',
            permissionMode: 'auto'
          };
        }
      },
      environments: {
        pullRequest: async () => ({ pullRequest: null }),
        get: async () => ({ id: 'env-1', projectId: 'proj-1', hostId: 'host-1', path: null })
      },
      files: {
        read: async () => ({ content: '', contentEncoding: 'utf8' as const, sizeBytes: 0 }),
        write: async () => undefined
      },
      providers: {
        list: async () => providers,
        models: async ({ providerId }: { providerId: string }) => {
          const found = providers.find((p) => p.id === providerId);
          return {
            models: (found?.models ?? []).map((m) => ({ id: m, model: m, supportedReasoningEfforts: [] })),
            selectedOnlyModels: [],
            modelLoadError: null
          };
        }
      },
      assistant: { complete: async () => ({ text: '' }) },
      inbox: {
        search: async () => ({ entries: [], hasMore: false }),
        read: async () => {
          throw new Error('not implemented');
        },
        push: async (entry: { projectId: string; comments: string }) => {
          if (options.inboxShouldThrow) throw new Error('Inbox unavailable');
          inbox.push(entry);
          return { id: `inbox_${inbox.length}` };
        }
      },
      projects: {
        list: async () => projects,
        setIcon: async () => undefined
      }
    },
    host: { experimental_call: async () => null },
    services: {
      provide() {},
      use: () => ({}) as never,
      has: () => false
    },
    onDispose: (hook: () => unknown) => void disposers.push(hook)
  } as unknown as ZccPluginApi;

  return {
    zcc,
    db,
    inbox,
    published,
    logs,
    threads,
    tools,
    async callRpc<T = unknown>(method: string, args?: unknown): Promise<T> {
      const fn = rpc.get(method);
      if (!fn) throw new Error(`RPC method not registered: ${method}`);
      return (await fn(args)) as T;
    },
    async runCli(argv: string[]) {
      if (!cli) throw new Error('CLI not registered');
      return cli.run(argv, { pluginId: 'ai-usage-monitor', argv });
    },
    async callTool(name: string, input: unknown) {
      const tool = tools.find((t) => t.name === name);
      if (!tool) throw new Error(`Tool not registered: ${name}`);
      return tool.execute(input, { threadId: 't-1', projectId: 'p-1', signal: new AbortController().signal });
    },
    async emitThreadEvent(name: string, event: unknown) {
      for (const h of eventHandlers.get(name) ?? []) {
        await h(event);
      }
    },
    async runSchedules() {
      for (const s of schedules) await s();
    },
    updateSettings(patch: Record<string, string | number | boolean | undefined>) {
      Object.assign(settingValues, patch);
      for (const l of settingListeners) l({ ...settingValues });
    },
    async dispose() {
      for (const d of disposers) await d();
    }
  };
}
