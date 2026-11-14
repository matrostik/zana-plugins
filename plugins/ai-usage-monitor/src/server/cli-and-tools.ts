import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import type { LogEventKind, TimeRangeKey } from '../shared/types.ts';
import type { OpenCodeQualificationProbeEntry } from './collectors/opencode-usage.ts';
import type { DashboardService } from './dashboard.ts';
import type { UsageStore } from './db.ts';

export interface CliAndToolsApp {
  dashboard: DashboardService;
  store: UsageStore;
  refreshNow: () => Promise<void>;
  qualifyOpenCode?: () => Promise<{ ok: boolean; probes: OpenCodeQualificationProbeEntry[]; error?: string }>;
}

type ToolRegistration = Parameters<ZccPluginApi['agents']['registerTool']>[0] & {
  presentation?: {
    label: { pending: string; completed: string };
    icon?: { glyph: string };
  };
};

type CliResult = { exitCode: number; stdout?: string; stderr?: string };

const VALID_RANGES = new Set<TimeRangeKey>(['today', '7d', 'last_week', '30d', 'all']);
const VALID_LOG_KINDS = new Set(['all', 'turn_usage', 'rate_limit', 'fallback', 'error']);

function parseRange(raw: string | undefined): TimeRangeKey {
  if (raw && VALID_RANGES.has(raw as TimeRangeKey)) return raw as TimeRangeKey;
  return '30d';
}

function parseFlag(argv: readonly string[], name: string): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === name && i + 1 < argv.length) return argv[i + 1];
    if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
  }
  return undefined;
}

function clampLogLimit(rawLimit: unknown, fallback: number): number {
  if (typeof rawLimit !== 'number' || !Number.isFinite(rawLimit)) return fallback;
  return Math.min(100, Math.max(1, Math.floor(rawLimit)));
}

async function runSummaryCommand(app: CliAndToolsApp, argv: string[]): Promise<CliResult> {
  const range = parseRange(parseFlag(argv, '--range'));
  const data = await app.dashboard.buildDashboard(range);
  return {
    exitCode: 0,
    stdout:
      JSON.stringify(
        {
          kpis: data.kpis,
          topModels: data.models.slice(0, 15),
          opencodeLocal: data.opencodeLocal ?? null
        },
        null,
        2
      ) + '\n'
  };
}

async function runQuotasCommand(app: CliAndToolsApp): Promise<CliResult> {
  const data = await app.dashboard.buildDashboard('30d');
  return {
    exitCode: 0,
    stdout:
      JSON.stringify(
        {
          providers: data.providers,
          cloudConnectors: data.cloudConnectors,
          opencodeLocal: data.opencodeLocal ?? null
        },
        null,
        2
      ) + '\n'
  };
}

async function runBudgetsCommand(app: CliAndToolsApp): Promise<CliResult> {
  const data = await app.dashboard.buildDashboard('30d');
  return { exitCode: 0, stdout: JSON.stringify({ budgets: data.budgets }, null, 2) + '\n' };
}

async function runLogsCommand(app: CliAndToolsApp, argv: string[]): Promise<CliResult> {
  const kindRaw = parseFlag(argv, '--kind') ?? 'all';
  const limitParsed = Number.parseInt(parseFlag(argv, '--limit') ?? '20', 10);
  const kind = (VALID_LOG_KINDS.has(kindRaw) ? kindRaw : 'all') as LogEventKind | 'all';
  const projectMap = await app.dashboard.projectNamesMap();
  const logs = app.store.queryLogs({ kind, limit: clampLogLimit(limitParsed, 20) }, projectMap);
  return { exitCode: 0, stdout: JSON.stringify(logs, null, 2) + '\n' };
}

async function runQualifyOpenCodeCommand(app: CliAndToolsApp): Promise<CliResult> {
  if (!app.qualifyOpenCode) {
    return { exitCode: 1, stderr: 'OpenCode qualification helper is unavailable.\n' };
  }
  const res = await app.qualifyOpenCode();
  return { exitCode: res.ok ? 0 : 1, stdout: JSON.stringify(res, null, 2) + '\n' };
}

export function registerCli(cli: ZccPluginApi['cli'], app: CliAndToolsApp): void {
  cli.register({
    name: 'ai-usage',
    summary: 'Inspect cross-provider AI consumption, spend, quotas, budgets, and logs.',
    commands: [
      { name: 'summary', summary: 'Show spend and token KPIs + top models', usage: 'zcc ai-usage summary [--range today|7d|last_week|30d|all] [--refresh]' },
      { name: 'quotas', summary: 'Show configured providers, subscription windows, and remaining credits', usage: 'zcc ai-usage quotas [--refresh]' },
      { name: 'budgets', summary: 'Show budget rules and remaining allowance', usage: 'zcc ai-usage budgets' },
      { name: 'logs', summary: 'Show recent usage, rate-limit, fallback, and error logs', usage: 'zcc ai-usage logs [--kind all|turn_usage|rate_limit|fallback|error] [--limit 20]' },
      { name: 'qualify-opencode', summary: 'Probe OpenCode Console billing/usage endpoints with configured key (read-only, sanitized)', usage: 'zcc ai-usage qualify-opencode' }
    ],
    async run(argv: string[]) {
      const sub = argv[0] ?? 'summary';
      if (argv.includes('--refresh')) await app.refreshNow();
      if (sub === 'summary') return runSummaryCommand(app, argv);
      if (sub === 'quotas') return runQuotasCommand(app);
      if (sub === 'budgets') return runBudgetsCommand(app);
      if (sub === 'logs') return runLogsCommand(app, argv);
      if (sub === 'qualify-opencode') return runQualifyOpenCodeCommand(app);
      return { exitCode: 1, stderr: `Unknown subcommand "${sub}". Try: summary, quotas, budgets, logs, qualify-opencode.\n` };
    }
  });
}

function createSummaryTool(app: CliAndToolsApp): ToolRegistration {
  return {
    name: 'ai_usage_summary',
    description: 'Read cross-provider AI token usage, estimated/billed USD spend, subscription quota windows, remaining credits, and budget status.',
    presentation: {
      label: { pending: 'Reading AI usage metrics', completed: 'Read AI usage metrics' },
      icon: { glyph: 'Activity' }
    },
    parameters: {
      type: 'object',
      properties: {
        range: { type: 'string', enum: ['today', '7d', 'last_week', '30d', 'all'] },
        refresh: { type: 'boolean' }
      }
    },
    async execute(raw: unknown) {
      const input = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
      if (input.refresh === true) await app.refreshNow();
      const range = parseRange(typeof input.range === 'string' ? input.range : undefined);
      const data = await app.dashboard.buildDashboard(range);
      return JSON.stringify(
        {
          kpis: data.kpis,
          providers: data.providers,
          budgets: data.budgets,
          topModels: data.models.slice(0, 12),
          topProjects: data.projects.slice(0, 10),
          opencodeLocal: data.opencodeLocal ?? null
        },
        null,
        2
      );
    }
  };
}

function createLogsTool(app: CliAndToolsApp): ToolRegistration {
  return {
    name: 'ai_usage_logs',
    description: 'Query AI usage turns, rate-limit events, model fallbacks, and provider billing errors recorded in Zana.',
    presentation: {
      label: { pending: 'Querying AI usage logs', completed: 'Queried AI usage logs' },
      icon: { glyph: 'List' }
    },
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['all', 'turn_usage', 'rate_limit', 'fallback', 'error'] },
        providerId: { type: 'string' },
        search: { type: 'string' },
        limit: { type: 'number' }
      }
    },
    async execute(raw: unknown) {
      const input = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
      const kind =
        typeof input.kind === 'string' && VALID_LOG_KINDS.has(input.kind)
          ? (input.kind as LogEventKind | 'all')
          : 'all';
      const projectMap = await app.dashboard.projectNamesMap();
      const result = app.store.queryLogs(
        {
          kind,
          providerId: typeof input.providerId === 'string' ? input.providerId : undefined,
          search: typeof input.search === 'string' ? input.search : undefined,
          limit: clampLogLimit(input.limit, 25)
        },
        projectMap
      );
      return JSON.stringify(result, null, 2);
    }
  };
}

export function registerAgentTools(agents: ZccPluginApi['agents'], app: CliAndToolsApp): void {
  agents.registerTool(createSummaryTool(app));
  agents.registerTool(createLogsTool(app));
}
