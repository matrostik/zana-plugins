import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import { registerCli, registerTools, type AvailableProvider, type CodenodApp } from './src/server/cli-and-tools.ts';
import { createStore, type Database } from './src/server/db.ts';
import { createTokenResolver, runCommand, type CommandRunner } from './src/server/github/auth.ts';
import { createGitHubClient, type FetchLike } from './src/server/github/client.ts';
import { normalizeHost, parseHostList, parsePrId, parsePrRef, parseRepoRef, prId, repoId } from './src/server/github/refs.ts';
import { createPoster, StaleReviewError } from './src/server/post.ts';
import { createProjectMatcher } from './src/server/projects.ts';
import { getDeepReviewPrompt } from './src/server/review/prompts.ts';
import { createThreadWaiter, type ThreadsApi } from './src/server/review/runner.ts';
import { CHANGED_EVENT, createReviewService, type ReviewConfig, type WorkspaceMode } from './src/server/review/service.ts';
import { createSyncService } from './src/server/sync.ts';
import type { ModelChoice, PrBucket, ReviewEvent, ReviewRow } from './src/server/types.ts';
import { mergeCatalogModels } from './src/server/models-catalog.ts';
import { asRecord, asString, asStringArray, errorMessage, sleep } from './src/server/util.ts';
import { getPrDetail, listPullRequests } from './src/server/views.ts';

export interface CodenodPluginDeps {
  run?: CommandRunner;
  fetch?: FetchLike;
  now?: () => number;
  pollMs?: number;
}

const MODELS_KEY = 'reviewModels';
const SYNC_TICK_CRON = '* * * * *';
const WORKSPACE_MODES: WorkspaceMode[] = ['worktree', 'project', 'diff-only'];
const REVIEW_EVENTS: ReviewEvent[] = ['COMMENT', 'APPROVE', 'REQUEST_CHANGES'];
const BUCKETS: PrBucket[] = ['needs-review', 'mine', 'watched'];
const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

type ApprovalBinding = { action: string; target: string; targetLabel: string; subject: string; revision?: string };

function sanitizeModels(value: unknown): ModelChoice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asRecord(item))
    .filter((item) => asString(item, 'providerId') && asString(item, 'model'))
    .map((item) => ({
      providerId: asString(item, 'providerId'),
      model: asString(item, 'model'),
      ...(asString(item, 'reasoningLevel') ? { reasoningLevel: asString(item, 'reasoningLevel') } : {})
    }))
    .slice(0, 5);
}

export default async function createCodenodPlugin(zcc: ZccPluginApi, deps: CodenodPluginDeps = {}): Promise<void> {
  const now = deps.now ?? Date.now;
  const run = deps.run ?? runCommand;

  const settings = zcc.settings.define({
    githubHosts: {
      type: 'string',
      label: 'GitHub Enterprise hosts',
      description: 'Comma-separated hosts in addition to github.com, e.g. git.example.com. The first one is used for owner/repo#123 shorthand.',
      default: ''
    },
    githubTokens: {
      type: 'string',
      label: 'GitHub tokens (fallback)',
      description: 'Only needed when neither `gh auth token` nor `git credential fill` works. One `host=token` per line.',
      secret: true,
      multiline: true
    },
    syncIntervalMinutes: { type: 'number', label: 'Sync interval (minutes)', default: 5, min: 1, max: 120 },
    maxConcurrentReviews: { type: 'number', label: 'Reviews running at once', default: 2, min: 1, max: 6 },
    reviewTimeoutMinutes: { type: 'number', label: 'Review timeout per model (minutes)', default: 20, min: 3, max: 90 },
    workspaceMode: {
      type: 'select',
      label: 'Review workspace',
      description: 'worktree: a fresh worktree of the matching Zana project; project: the project folder itself; diff-only: never read local code.',
      options: WORKSPACE_MODES,
      default: 'worktree'
    },
    fallbackProject: {
      type: 'project',
      label: 'Fallback project for review threads',
      description: 'Used when no Zana project matches the pull request repository.'
    },
    archiveReviewThreads: { type: 'boolean', label: 'Archive hidden review threads when done', default: true },
    customInstructions: {
      type: 'string',
      label: 'Custom review instructions',
      description: 'Extra guidance added to every review prompt.',
      multiline: true,
      default: ''
    }
  });

  const readSettings = () => settings.get();
  const db = zcc.storage.database() as unknown as Database;
  const store = createStore(db, now);
  const interrupted = store.failInterruptedReviews();
  if (interrupted > 0) zcc.log.warn(`codenod: marked ${interrupted} interrupted review(s) as failed`);

  const tokens = createTokenResolver({ run, readTokenSetting: async () => String((await readSettings()).githubTokens ?? ''), now });
  const github = createGitHubClient(tokens, deps.fetch);
  const configuredHosts = async () => {
    const values = await readSettings();
    const hosts = parseHostList(String(values.githubHosts ?? ''));
    for (const repo of store.listRepos()) if (!hosts.includes(repo.host)) hosts.push(repo.host);
    return hosts;
  };
  const defaultHost = async () => {
    const extra = String((await readSettings()).githubHosts ?? '').split(/[\s,]+/).find(Boolean);
    return extra ? normalizeHost(extra) : 'github.com';
  };

  const projects = createProjectMatcher({ listProjects: () => zcc.sdk.projects.list(), run, now });
  const threads = zcc.sdk.threads as unknown as ThreadsApi;
  const waiter = createThreadWaiter(threads, { pollMs: deps.pollMs });
  zcc.events.on('thread.idle', (event) => waiter.onEvent(event as Parameters<typeof waiter.onEvent>[0]));
  zcc.events.on('thread.failed', (event) => waiter.onEvent(event as Parameters<typeof waiter.onEvent>[0]));

  const publish = (event: string, payload: unknown) => zcc.realtime.publish(event, payload);
  const sync = createSyncService({ store, github, tokens, hosts: configuredHosts, now });
  const poster = createPoster({ store, github });

  const reviewConfig = async (): Promise<ReviewConfig> => {
    const values = await readSettings();
    const mode = String(values.workspaceMode ?? 'worktree') as WorkspaceMode;
    return {
      models: sanitizeModels(await zcc.storage.kv.get(MODELS_KEY)),
      customInstructions: String(values.customInstructions ?? '') || null,
      fallbackProjectId: String(values.fallbackProject ?? '') || null,
      workspaceMode: WORKSPACE_MODES.includes(mode) ? mode : 'worktree',
      maxConcurrent: Number(values.maxConcurrentReviews ?? 2),
      timeoutMs: Number(values.reviewTimeoutMinutes ?? 20) * 60_000,
      archiveThreads: values.archiveReviewThreads !== false
    };
  };

  const reviews = createReviewService({
    store,
    github,
    threads,
    waiter,
    projects,
    config: reviewConfig,
    providerPermissionModes: async (providerId) =>
      (await zcc.sdk.providers.list()).find((provider) => provider.id === providerId)?.capabilities?.permissionModes,
    complete: zcc.sdk.assistant ? (args) => zcc.sdk.assistant.complete(args) : undefined,
    notify: async ({ projectId, text }) => {
      await zcc.sdk.inbox.push({ projectId, comments: text });
    },
    syncPullRequest: (ref) => sync.syncPullRequest(ref),
    publish,
    log: zcc.log
  });

  async function runSync() {
    const result = await sync.syncAll();
    for (const pr of result.changed) {
      const repo = store.getRepo(`${pr.host}/${pr.owner}/${pr.repo}`);
      const login = result.hosts.find((host) => host.host === pr.host)?.login;
      if (!repo?.autoReview || pr.isDraft || !pr.buckets.includes('needs-review') || pr.author === login) continue;
      if (store.hasReviewForHead(pr.id, pr.headSha)) continue;
      await reviews.startReview(parsePrId(pr.id), { trigger: 'auto' }).catch((error) => zcc.log.warn(`codenod: auto-review of ${pr.id} failed: ${errorMessage(error)}`));
    }
    await zcc.storage.kv.set('lastSyncAt', now());
    publish(CHANGED_EVENT, { sync: true });
    return result;
  }

  let lastSyncAt = (await zcc.storage.kv.get<number>('lastSyncAt')) ?? 0;
  zcc.background.schedule(SYNC_TICK_CRON, async () => {
    const minutes = Number((await readSettings()).syncIntervalMinutes ?? 5);
    if (sync.isSyncing() || now() - lastSyncAt < minutes * 60_000) return;
    lastSyncAt = now();
    await runSync().catch((error) => zcc.log.warn(`codenod: sync failed: ${errorMessage(error)}`));
  });

  async function waitForReview(reviewId: string, timeoutMs: number): Promise<ReviewRow> {
    const deadline = now() + timeoutMs;
    for (;;) {
      const review = store.getReview(reviewId);
      if (!review) throw new Error(`Review ${reviewId} not found`);
      if (TERMINAL.has(review.status) || now() > deadline) return review;
      await sleep(2_000);
    }
  }

  async function ensureDetail(ref: ReturnType<typeof parsePrRef>) {
    const id = prId(ref);
    if (!store.getPullRequest(id)) await sync.syncPullRequest(ref);
    const detail = getPrDetail(store, id);
    if (!detail) throw new Error(`Pull request ${id} not found`);
    return detail;
  }

  const app: CodenodApp = {
    defaultHost,
    listPullRequests: (bucket) => listPullRequests(store, bucket),
    detail: ensureDetail,
    startReview: (ref, options) => reviews.startReview(ref, options),
    waitForReview,
    post: (input) => poster.post(input),
    syncAll: runSync,
    hostStatuses: () => sync.hostStatuses(),
    configuredModels: async () => sanitizeModels(await zcc.storage.kv.get(MODELS_KEY)),
    availableModels: () => availableModels(),
    listRepos: () => store.listRepos(),
    addRepo: (input) => {
      const repo = store.upsertRepo({ id: repoId({ host: input.host, owner: input.owner, name: input.name }), ...input });
      publish(CHANGED_EVENT, { repos: true });
      return repo;
    },
    removeRepo: (id) => {
      const removed = store.removeRepo(id);
      publish(CHANGED_EVENT, { repos: true });
      return removed;
    }
  };

  function approvalBinding(reviewId: string, event: ReviewEvent, headSha: string): ApprovalBinding {
    const review = store.getReview(reviewId);
    const pr = review ? store.getPullRequest(review.prId) : null;
    if (!review || !pr) throw new Error('Review not found');
    return {
      action: event === 'APPROVE' ? 'codenod.github.approve' : 'codenod.github.request-changes',
      target: pr.id,
      targetLabel: `${pr.owner}/${pr.repo}#${pr.number}`,
      subject: pr.title.slice(0, 200),
      revision: headSha
    };
  }

  // ── RPC for the panel ────────────────────────────────────────────────
  zcc.rpc.method('overview', async () => ({
    prs: listPullRequests(store),
    hosts: await sync.hostStatuses(),
    syncing: sync.isSyncing(),
    lastSyncAt: (await zcc.storage.kv.get<number>('lastSyncAt')) ?? null,
    activeReviews: reviews.activeCount(),
    hasModels: sanitizeModels(await zcc.storage.kv.get(MODELS_KEY)).length > 0,
    hasWatchedRepos: store.listRepos().length > 0
  }));

  zcc.rpc.method('detail', (args) => {
    const id = asString(asRecord(args), 'prId');
    const detail = getPrDetail(store, id);
    if (!detail) throw new Error(`Pull request ${id} not found`);
    return detail;
  });

  zcc.rpc.method('refresh', async () => {
    lastSyncAt = now();
    return runSync();
  });

  zcc.rpc.method('startReview', async (args) => {
    const record = asRecord(args);
    const models = sanitizeModels(record.models);
    return reviews.startReview(parsePrId(asString(record, 'prId')), { models: models.length > 0 ? models : undefined });
  });

  zcc.rpc.method('cancelReview', (args) => ({ cancelled: reviews.cancelReview(asString(asRecord(args), 'reviewId')) }));

  zcc.rpc.method('diff', async (args) => {
    const pr = store.getPullRequest(asString(asRecord(args), 'prId'));
    if (!pr) throw new Error('Pull request not found');
    return github.listFiles(parsePrId(pr.id));
  });

  zcc.rpc.method('dismissFinding', (args) => {
    const record = asRecord(args);
    store.setFindingDismissed(asString(record, 'findingId'), record.dismissed !== false);
    publish(CHANGED_EVENT, { finding: true });
    return { ok: true };
  });

  zcc.rpc.method('approvalBinding', async (args) => {
    const record = asRecord(args);
    const reviewId = asString(record, 'reviewId');
    const event = asString(record, 'event') as ReviewEvent;
    if (event !== 'APPROVE' && event !== 'REQUEST_CHANGES') throw new Error('Only APPROVE and REQUEST_CHANGES need approval');
    const review = store.getReview(reviewId);
    if (!review) throw new Error('Review not found');
    const headSha = await poster.currentHeadSha(review.prId);
    if (headSha !== review.headSha) throw new StaleReviewError(review.headSha, headSha);
    return approvalBinding(reviewId, event, headSha);
  });

  zcc.rpc.method('post', async (args) => {
    const record = asRecord(args);
    const reviewId = asString(record, 'reviewId');
    const event = (asString(record, 'event') || 'COMMENT') as ReviewEvent;
    if (!REVIEW_EVENTS.includes(event)) throw new Error(`Unknown review event ${event}`);
    if (event !== 'COMMENT') {
      const consume = (zcc.ui as unknown as {
        experimental_consumeApproval?: (input: { token: string; binding: ApprovalBinding }) => Promise<boolean>;
      }).experimental_consumeApproval;
      if (!consume) throw new Error('Approving and requesting changes need the Zana desktop app’s signed confirmation, which is unavailable here.');
      const review = store.getReview(reviewId);
      if (!review) throw new Error('Review not found');
      const headSha = await poster.currentHeadSha(review.prId);
      const token = asString(record, 'approvalToken');
      if (!token || !(await consume({ token, binding: approvalBinding(reviewId, event, headSha) }))) {
        throw new Error('Approval required: confirm in the Zana dialog, and re-review if the pull request changed.');
      }
    }
    const result = await poster.post({ reviewId, findingIds: asStringArray(record, 'findingIds'), event, body: asString(record, 'body') || undefined });
    publish(CHANGED_EVENT, { posted: reviewId });
    return result;
  });

  zcc.rpc.method('deepReview', async (args) => {
    const detail = getPrDetail(store, asString(asRecord(args), 'prId'));
    if (!detail) throw new Error('Pull request not found');
    const { pr, review, findings } = detail;
    const config = await reviewConfig();
    const project = await projects.projectForRepo({ host: pr.host, owner: pr.owner, name: pr.repo });
    const projectId = project?.id ?? config.fallbackProjectId ?? (await projects.projects())[0]?.id;
    if (!projectId) throw new Error('No Zana project is available for the Deep Review thread');
    const hasWorkspace = Boolean(project) && config.workspaceMode !== 'diff-only';
    const spawned = await zcc.sdk.threads.spawn({
      projectId,
      title: `Deep Review: ${pr.owner}/${pr.repo}#${pr.number}`,
      prompt: getDeepReviewPrompt({
        url: pr.url,
        repository: `${pr.owner}/${pr.repo}`,
        prNumber: pr.number,
        prTitle: pr.title,
        author: pr.author,
        headRef: pr.headRef,
        baseRef: pr.baseRef,
        headSha: pr.headSha,
        hasWorkspace,
        reviewSummary: review?.consensusSummary ?? review?.summary ?? null,
        findings: findings.filter((finding) => !finding.dismissed)
      }),
      visibility: 'visible',
      ...(hasWorkspace ? { environment: { kind: 'worktree' as const, branchSlug: `codenod-deep-${pr.number}` } } : {})
    });
    return { threadId: spawned.id, projectId };
  });

  zcc.rpc.method('config', async () => ({
    models: sanitizeModels(await zcc.storage.kv.get(MODELS_KEY)),
    repos: store.listRepos(),
    hosts: await sync.hostStatuses()
  }));

  zcc.rpc.method('availableModels', availableModels);

  async function availableModels(): Promise<AvailableProvider[]> {
    const providers = (await zcc.sdk.providers.list()).filter((provider) => provider.available);
    return Promise.all(
      providers.map(async (provider) => {
        const catalog = await zcc.sdk.providers.models({ providerId: provider.id }).catch((error) => ({
          models: [],
          selectedOnlyModels: [],
          modelLoadError: { providerId: provider.id, code: 'error', detail: errorMessage(error) }
        }));
        return {
          providerId: provider.id,
          displayName: provider.displayName ?? provider.id,
          error: catalog.modelLoadError?.detail ?? catalog.modelLoadError?.code ?? null,
          models: mergeCatalogModels(catalog)
        };
      })
    );
  }

  zcc.rpc.method('setModels', async (args) => {
    const models = sanitizeModels(asRecord(args).models);
    await zcc.storage.kv.set(MODELS_KEY, models);
    publish(CHANGED_EVENT, { models: true });
    return models;
  });

  zcc.rpc.method('addRepo', async (args) => {
    const record = asRecord(args);
    const ref = parseRepoRef(asString(record, 'repo'), await defaultHost());
    return app.addRepo({ ...ref, autoReview: record.autoReview === true, specGlob: asString(record, 'specGlob') || null });
  });

  zcc.rpc.method('updateRepo', (args) => {
    const record = asRecord(args);
    const existing = store.getRepo(asString(record, 'id'));
    if (!existing) throw new Error('Repository not found');
    const repo = store.upsertRepo({
      ...existing,
      autoReview: typeof record.autoReview === 'boolean' ? record.autoReview : existing.autoReview,
      specGlob: 'specGlob' in record ? asString(record, 'specGlob') || null : existing.specGlob
    });
    publish(CHANGED_EVENT, { repos: true });
    return repo;
  });

  zcc.rpc.method('removeRepo', (args) => ({ removed: app.removeRepo(asString(asRecord(args), 'id')) }));

  zcc.rpc.method('discoverRepos', () => sync.discoverActiveRepos());

  zcc.rpc.method('listBuckets', () => BUCKETS);

  registerCli(zcc.cli as unknown as Parameters<typeof registerCli>[0], app);
  registerTools(zcc.agents as unknown as Parameters<typeof registerTools>[0], app);

  zcc.onDispose(() => reviews.dispose());
  zcc.log.info('codenod plugin initialized');
}
