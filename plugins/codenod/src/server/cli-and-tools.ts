import { parsePrRef, parseRepoRef, repoId } from './github/refs.ts';
import type { HostStatus, SyncResult } from './sync.ts';
import type { ModelChoice, PrBucket, PrRef, RepoRow, ReviewEvent, ReviewRow } from './types.ts';
import { errorMessage } from './util.ts';
import { formatPrDetail, formatPrLine, type PrDetail, type PrListItem } from './views.ts';

export interface CodenodApp {
  defaultHost(): Promise<string>;
  listPullRequests(bucket?: PrBucket): PrListItem[];
  detail(ref: PrRef): Promise<PrDetail>;
  startReview(ref: PrRef, options: { models?: ModelChoice[]; trigger?: 'manual' | 'auto' }): Promise<ReviewRow>;
  waitForReview(reviewId: string, timeoutMs: number): Promise<ReviewRow>;
  post(input: { reviewId: string; findingIds: string[]; event: ReviewEvent; body?: string }): Promise<{ url: string | null; commentCount: number; publishedCount: number }>;
  syncAll(): Promise<SyncResult>;
  hostStatuses(): Promise<HostStatus[]>;
  configuredModels(): Promise<ModelChoice[]>;
  availableModels(): Promise<AvailableProvider[]>;
  listRepos(): RepoRow[];
  addRepo(input: { host: string; owner: string; name: string; autoReview?: boolean; specGlob?: string | null }): RepoRow;
  removeRepo(id: string): boolean;
}

export interface AvailableProvider {
  providerId: string;
  displayName: string;
  error: string | null;
  models: Array<{ id: string; label: string; reasoningLevels: string[] }>;
}

interface ToolRegistrar {
  registerTool(registration: {
    name: string;
    description: string;
    parameters?: unknown;
    execute(input: unknown, ctx: { threadId: string; projectId: string; signal: AbortSignal }): unknown | Promise<unknown>;
  }): void;
}

interface CliRegistrar {
  register(registration: {
    name: string;
    summary: string;
    commands?: Array<{ name: string; summary: string; usage: string }>;
    run(argv: string[], ctx: { cwd?: string }): Promise<{ exitCode: number; stdout?: string; stderr?: string }>;
  }): void;
}

const BUCKETS: PrBucket[] = ['needs-review', 'mine', 'watched'];
const CLI_WAIT_TIMEOUT_MS = 25 * 60_000;

/** `provider:model[@reasoning]`, comma-separated. */
export function parseModelList(raw: string): ModelChoice[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [main, reasoningLevel] = entry.split('@');
      const separator = main.indexOf(':');
      if (separator <= 0 || separator === main.length - 1) throw new Error(`Invalid model "${entry}". Use provider:model, e.g. claude-code:opus.`);
      return { providerId: main.slice(0, separator), model: main.slice(separator + 1), ...(reasoningLevel ? { reasoningLevel } : {}) };
    });
}

interface ParsedArgs {
  positional: string[];
  flags: Map<string, string | true>;
}

const BOOLEAN_FLAGS = new Set(['json', 'wait', 'yes', 'auto']);

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const separator = body.indexOf('=');
    const key = separator === -1 ? body : body.slice(0, separator);
    if (separator !== -1) flags.set(key, body.slice(separator + 1));
    else if (!BOOLEAN_FLAGS.has(key) && argv[index + 1] && !argv[index + 1].startsWith('--')) flags.set(key, argv[++index]);
    else flags.set(key, true);
  }
  return { positional, flags };
}

function flagString(args: ParsedArgs, key: string): string | undefined {
  const value = args.flags.get(key);
  return typeof value === 'string' ? value : undefined;
}

const USAGE = `Usage:
  zcc codenod list [--tab needs-review|mine|watched] [--json]
  zcc codenod sync
  zcc codenod review <pr-url|owner/repo#123> [--models provider:model,...] [--wait] [--json]
  zcc codenod show <pr-url|owner/repo#123> [--json]
  zcc codenod post <pr-url|owner/repo#123> --yes [--findings all|id,id] [--message "..."]
  zcc codenod repos [list | add <owner/repo|host/owner/repo> [--auto] [--spec "docs/**/*.md"] | remove <host/owner/repo>]
  zcc codenod models [--json]
  zcc codenod auth`;

function json(value: unknown) {
  return { exitCode: 0, stdout: JSON.stringify(value, null, 2) };
}

export function registerCli(cli: CliRegistrar, app: CodenodApp): void {
  cli.register({
    name: 'codenod',
    summary: 'AI pull request reviews on Zana providers',
    commands: [
      { name: 'list', summary: 'List pull requests in the CodeNod inbox', usage: 'zcc codenod list [--tab needs-review|mine|watched] [--json]' },
      { name: 'sync', summary: 'Sync pull requests from GitHub now', usage: 'zcc codenod sync' },
      { name: 'review', summary: 'Start an AI review of a pull request', usage: 'zcc codenod review <pr> [--models provider:model,...] [--wait] [--json]' },
      { name: 'show', summary: 'Show the latest review of a pull request', usage: 'zcc codenod show <pr> [--json]' },
      { name: 'post', summary: 'Post review findings to GitHub as comments', usage: 'zcc codenod post <pr> --yes [--findings all|id,id] [--message "..."]' },
      { name: 'repos', summary: 'List, add, or remove watched repositories', usage: 'zcc codenod repos [list|add|remove]' },
      { name: 'models', summary: 'Show configured review models and available provider:model ids', usage: 'zcc codenod models [--json]' },
      { name: 'auth', summary: 'Show GitHub sign-in status per host', usage: 'zcc codenod auth' }
    ],
    async run(argv) {
      const [command, ...rest] = argv;
      const args = parseArgs(rest);
      const asJson = args.flags.has('json');
      try {
        const prArg = async () => {
          const raw = args.positional[0];
          if (!raw) throw new Error('A pull request URL or owner/repo#123 is required');
          return parsePrRef(raw, await app.defaultHost());
        };
        switch (command) {
          case 'list': {
            const tab = flagString(args, 'tab') as PrBucket | undefined;
            if (tab && !BUCKETS.includes(tab)) throw new Error(`--tab must be one of ${BUCKETS.join(', ')}`);
            const items = app.listPullRequests(tab);
            if (asJson) return json(items);
            return { exitCode: 0, stdout: items.length === 0 ? 'No open pull requests. Run "zcc codenod sync" to refresh.' : items.map(formatPrLine).join('\n') };
          }
          case 'sync': {
            const result = await app.syncAll();
            const lines = result.hosts.map((host) => `${host.host}: ${host.error ?? `${host.pullRequestCount} open PR(s) as @${host.login}`}`);
            return { exitCode: result.hosts.some((host) => host.error) ? 1 : 0, stdout: lines.join('\n') };
          }
          case 'review': {
            const ref = await prArg();
            const models = flagString(args, 'models') ? parseModelList(flagString(args, 'models')!) : undefined;
            let review = await app.startReview(ref, { models });
            if (args.flags.has('wait')) review = await app.waitForReview(review.id, CLI_WAIT_TIMEOUT_MS);
            if (asJson && !args.flags.has('wait')) return json(review);
            if (asJson) return { ...json(await app.detail(ref)), exitCode: review.status === 'completed' ? 0 : 1 };
            if (!args.flags.has('wait')) return { exitCode: 0, stdout: `Review ${review.id} ${review.status}. Check it with: zcc codenod show ${repoId(ref)}#${ref.number}` };
            return { exitCode: review.status === 'completed' ? 0 : 1, stdout: formatPrDetail(await app.detail(ref)) };
          }
          case 'show': {
            const detail = await app.detail(await prArg());
            return asJson ? json(detail) : { exitCode: 0, stdout: formatPrDetail(detail) };
          }
          case 'post': {
            if (!args.flags.has('yes')) throw new Error('Posting writes to GitHub. Re-run with --yes to confirm. Approving is only available in the CodeNod panel.');
            const detail = await app.detail(await prArg());
            if (!detail.review || detail.review.status !== 'completed') throw new Error('This pull request has no completed review to post');
            const selection = flagString(args, 'findings') ?? 'all';
            const unposted = detail.findings.filter((finding) => !finding.dismissed && !finding.postedAt);
            const findingIds = selection === 'all'
              ? unposted.map((finding) => finding.id)
              : selection.split(',').map((prefix) => {
                  const match = detail.findings.find((finding) => finding.id.startsWith(prefix.trim()));
                  if (!match) throw new Error(`No finding matches "${prefix}"`);
                  return match.id;
                });
            const result = await app.post({ reviewId: detail.review.id, findingIds, event: 'COMMENT', body: flagString(args, 'message') });
            const skipped = findingIds.length - result.publishedCount;
            return { exitCode: 0, stdout: `Posted ${result.publishedCount} finding(s), ${result.commentCount} inline.${skipped > 0 ? ` ${skipped} selected finding(s) were left unposted (GitHub review body size limit).` : ''}${result.url ? `\n${result.url}` : ''}` };
          }
          case 'repos': {
            const [sub = 'list', target] = args.positional;
            if (sub === 'list') {
              const repos = app.listRepos();
              if (asJson) return json(repos);
              return {
                exitCode: 0,
                stdout: repos.length === 0 ? 'No watched repositories.' : repos.map((repo) => `${repo.id}${repo.autoReview ? '  [auto-review]' : ''}${repo.specGlob ? `  spec: ${repo.specGlob}` : ''}`).join('\n')
              };
            }
            if (!target) throw new Error(`zcc codenod repos ${sub} needs a repository`);
            const ref = parseRepoRef(target, await app.defaultHost());
            if (sub === 'add') {
              const repo = app.addRepo({ ...ref, autoReview: args.flags.has('auto'), specGlob: flagString(args, 'spec') ?? null });
              return { exitCode: 0, stdout: `Watching ${repo.id}${repo.autoReview ? ' with auto-review' : ''}` };
            }
            if (sub === 'remove') return app.removeRepo(repoId(ref)) ? { exitCode: 0, stdout: `Stopped watching ${repoId(ref)}` } : { exitCode: 1, stderr: `${repoId(ref)} is not watched` };
            return { exitCode: 1, stderr: USAGE };
          }
          case 'models': {
            const [configured, available] = await Promise.all([app.configuredModels(), app.availableModels()]);
            if (asJson) return json({ configured, available });
            const lines = [
              `Configured: ${configured.length === 0 ? 'none (pick models in CodeNod settings or pass --models)' : configured.map((model) => `${model.providerId}:${model.model}${model.reasoningLevel ? `@${model.reasoningLevel}` : ''}`).join(', ')}`,
              ...available.flatMap((provider) => [
                `${provider.displayName}${provider.error ? ` — ${provider.error}` : ''}`,
                ...provider.models.map((model) => `  ${provider.providerId}:${model.id}${model.reasoningLevels.length > 0 ? `  (@${model.reasoningLevels.join('|')})` : ''}`)
              ])
            ];
            return { exitCode: 0, stdout: lines.join('\n') };
          }
          case 'auth': {
            const statuses = await app.hostStatuses();
            if (asJson) return json(statuses);
            return {
              exitCode: 0,
              stdout: statuses
                .map((status) => `${status.host}: ${status.authSource ? `signed in via ${status.authSource}${status.login ? ` as @${status.login}` : ''}` : 'not signed in'}${status.error ? ` — ${status.error}` : ''}`)
                .join('\n')
            };
          }
          default:
            return { exitCode: command ? 1 : 0, ...(command ? { stderr: USAGE } : { stdout: USAGE }) };
        }
      } catch (error) {
        return { exitCode: 1, stderr: errorMessage(error) };
      }
    }
  });
}

export function registerTools(agents: ToolRegistrar, app: CodenodApp): void {
  const prParameter = { type: 'string', description: 'Pull request URL, host/owner/repo#123, or owner/repo#123' };

  agents.registerTool({
    name: 'codenod_list_prs',
    description: 'List open pull requests in the CodeNod inbox with CI state and latest AI review status.',
    parameters: {
      type: 'object',
      properties: { tab: { type: 'string', enum: BUCKETS, description: 'needs-review (review requested from me), mine (I authored), or watched' } }
    },
    execute: (input) => {
      const tab = (input as { tab?: PrBucket })?.tab;
      return app.listPullRequests(tab && BUCKETS.includes(tab) ? tab : undefined).map((item) => ({
        pr: `${item.host}/${item.owner}/${item.repo}#${item.number}`,
        title: item.title,
        author: item.author,
        url: item.url,
        draft: item.isDraft,
        ci: item.ciState,
        buckets: item.buckets,
        review: item.review
      }));
    }
  });

  agents.registerTool({
    name: 'codenod_get_review',
    description: 'Get the latest CodeNod AI review of a pull request: scores (risk, coverage, requirements, simplicity, stability), summary, per-model runs, and findings.',
    parameters: { type: 'object', properties: { pr: prParameter }, required: ['pr'] },
    execute: async (input) => {
      const raw = String((input as { pr?: unknown })?.pr ?? '');
      return app.detail(parsePrRef(raw, await app.defaultHost()));
    }
  });

  agents.registerTool({
    name: 'codenod_review_pr',
    description:
      'Start a CodeNod AI review of a pull request using the configured (or given) Zana models. This tool never posts to GitHub. Returns the review id and status; use codenod_get_review to read results.',
    parameters: {
      type: 'object',
      properties: {
        pr: prParameter,
        models: {
          type: 'array',
          description: 'Optional models to use instead of the configured defaults',
          items: {
            type: 'object',
            properties: { providerId: { type: 'string' }, model: { type: 'string' }, reasoningLevel: { type: 'string' } },
            required: ['providerId', 'model']
          }
        },
        wait: { type: 'boolean', description: 'Wait for the review to finish (can take several minutes)' },
        remediationGate: { type: 'boolean', description: 'Include structured blockingCount and blockingFindings in the response' }
      },
      required: ['pr']
    },
    execute: async (input, ctx) => {
      const record = (input ?? {}) as { pr?: unknown; models?: unknown; wait?: unknown; remediationGate?: unknown };
      const ref = parsePrRef(String(record.pr ?? ''), await app.defaultHost());
      const models = Array.isArray(record.models)
        ? record.models
            .filter((model): model is ModelChoice => Boolean(model && typeof model === 'object' && 'providerId' in model && 'model' in model))
            .map((model) => ({ providerId: String(model.providerId), model: String(model.model), ...(model.reasoningLevel ? { reasoningLevel: String(model.reasoningLevel) } : {}) }))
        : undefined;
      const review = await app.startReview(ref, { models });
      if (record.wait !== true || ctx.signal.aborted) {
        return { reviewId: review.id, status: review.status, ...(review.coordinatorThreadId ? { coordinatorThreadId: review.coordinatorThreadId } : {}) };
      }
      const finished = await app.waitForReview(review.id, CLI_WAIT_TIMEOUT_MS);
      if (finished.status !== 'completed') {
        return { reviewId: finished.id, status: finished.status, error: finished.error, ...(finished.coordinatorThreadId ? { coordinatorThreadId: finished.coordinatorThreadId } : {}) };
      }
      const detail = await app.detail(ref);
      if (record.remediationGate === true) {
        const blocking = detail.findings.filter((f) => !f.dismissed && (f.severity === 'critical' || f.severity === 'high'));
        return {
          ...detail,
          blockingCount: blocking.length,
          blockingFindings: blocking.map((f) => ({
            id: f.id,
            severity: f.severity,
            category: f.category,
            file: f.file,
            line: f.line,
            description: f.description,
            suggestion: f.suggestion,
            agreedBy: f.agreedBy
          })),
          coordinatorThreadId: detail.review?.coordinatorThreadId ?? null
        };
      }
      return detail;
    }
  });
}
