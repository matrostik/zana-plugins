import type { Store } from '../db.ts';
import type { GitHubClient } from '../github/client.ts';
import { parsePrId } from '../github/refs.ts';
import type { ProjectMatcher } from '../projects.ts';
import type { ModelChoice, ParsedAnalysis, PrRef, PullRequestRow, ReviewRow } from '../types.ts';
import { errorMessage } from '../util.ts';
import { aggregateScores, clusterIssues, dedupeIssues, type TaggedIssue } from './consensus.ts';
import { gatherReviewContext } from './context.ts';
import { parseAnalysis } from './parse.ts';
import { getConsensusPrompt, getFullReviewPrompt, getRepairPrompt, hasRequirementsContext } from './prompts.ts';
import { FULL_ACCESS_PERMISSION_MODE, pickReviewPermissionMode, runModelInThread, type SpawnEnvironment, type ThreadsApi, type ThreadWaiter } from './runner.ts';

export type WorkspaceMode = 'worktree' | 'project' | 'diff-only';

export interface ReviewConfig {
  models: ModelChoice[];
  customInstructions: string | null;
  fallbackProjectId: string | null;
  workspaceMode: WorkspaceMode;
  maxConcurrent: number;
  timeoutMs: number;
  archiveThreads: boolean;
  showReviewsOnAgentsBoard: boolean;
}

export interface ReviewServiceDeps {
  store: Store;
  github: GitHubClient;
  threads: ThreadsApi;
  waiter: ThreadWaiter;
  projects: ProjectMatcher;
  config: () => Promise<ReviewConfig>;
  providerPermissionModes: (providerId: string) => Promise<string[] | undefined>;
  /** Fetches the PR head from the matched remote and returns that commit when it matches `headSha`. */
  fetchPullRequestHead?: (projectPath: string, remote: string, prNumber: number, headSha: string) => Promise<string>;
  complete?: (args: { instructions: string; prompt: string }) => Promise<{ text: string }>;
  notify?: (args: { projectId: string; text: string }) => Promise<void>;
  syncPullRequest: (ref: PrRef) => Promise<PullRequestRow>;
  publish: (event: string, payload: unknown) => void;
  log: { info(message: string): void; warn(message: string): void };
}

export const CHANGED_EVENT = 'codenod:changed';

export function modelLabel(model: ModelChoice): string {
  return `${model.providerId}/${model.model}`;
}

interface QueuedReview {
  reviewId: string;
  models: ModelChoice[];
  trigger: 'manual' | 'auto';
}

export function createReviewService(deps: ReviewServiceDeps) {
  const queue: QueuedReview[] = [];
  const active = new Map<string, AbortController>();

  const changed = (payload: Record<string, unknown>) => deps.publish(CHANGED_EVENT, payload);

  async function resolveWorkspace(
    pr: PullRequestRow,
    headSha: string,
    config: ReviewConfig
  ): Promise<{ projectId: string; environment?: SpawnEnvironment; hasWorkspace: boolean }> {
    if (config.workspaceMode !== 'diff-only') {
      const project = await deps.projects.projectForRepo({ host: pr.host, owner: pr.owner, name: pr.repo });
      if (project) {
        if (config.workspaceMode !== 'worktree') return { projectId: project.id, environment: { kind: 'unmanaged' }, hasWorkspace: true };
        if (!project.path || !project.remote || !deps.fetchPullRequestHead) {
          throw new Error(`Cannot review ${pr.owner}/${pr.repo}#${pr.number} in a worktree: the matched project has no checkout to fetch.`);
        }
        const baseBranch = await deps.fetchPullRequestHead(project.path, project.remote, pr.number, headSha);
        return { projectId: project.id, environment: { kind: 'worktree', baseBranch, branchSlug: `codenod-review-${pr.number}` }, hasWorkspace: true };
      }
    }
    const fallback = config.fallbackProjectId || (await deps.projects.projects())[0]?.id;
    if (!fallback) throw new Error('No Zana project is available to run review threads. Choose a fallback project in CodeNod settings.');
    return { projectId: fallback, environment: undefined, hasWorkspace: false };
  }

  async function runReview(item: QueuedReview, signal: AbortSignal): Promise<void> {
    const review = deps.store.getReview(item.reviewId);
    if (!review) return;
    const pr = deps.store.getPullRequest(review.prId);
    if (!pr) throw new Error(`Pull request ${review.prId} is not in the CodeNod database`);
    deps.store.setReviewStatus(review.id, 'running');
    changed({ prId: pr.id, reviewId: review.id });

    const config = await deps.config();
    const repo = deps.store.getRepo(`${pr.host}/${pr.owner}/${pr.repo}`);
    const gathered = await gatherReviewContext(deps.github, parsePrId(pr.id), { specGlob: repo?.specGlob ?? null });
    if (signal.aborted) {
      deps.store.setReviewStatus(review.id, 'cancelled', 'Cancelled');
      return;
    }
    if (gathered.pull.head.sha !== review.headSha) {
      deps.store.setReviewStatus(review.id, 'cancelled', `Pull request moved to ${gathered.pull.head.sha.slice(0, 12)} before this review started`);
      changed({ prId: pr.id, reviewId: review.id });
      const current = await deps.syncPullRequest(parsePrId(pr.id));
      if (!signal.aborted && current.headSha !== review.headSha) await startReview(parsePrId(pr.id), { models: item.models, trigger: item.trigger });
      return;
    }
    const workspace = await resolveWorkspace(pr, review.headSha, config);

    let coordinatorThreadId: string | null = null;
    if (config.showReviewsOnAgentsBoard) {
      const existingThreads = deps.store.listPrThreads(pr.id).filter((t) => t.kind === 'coordinator');
      for (const t of existingThreads) {
        await deps.threads.archive({ threadId: t.threadId }).catch(() => undefined);
        deps.store.removePrThread(pr.id, t.threadId);
      }
      try {
        const spawnedCoord = await deps.threads.spawn({
          projectId: workspace.projectId,
          title: `CodeNod Review: ${pr.owner}/${pr.repo}#${pr.number}`,
          prompt: `Automated multi-model code review in progress for ${pr.owner}/${pr.repo}#${pr.number}: "${pr.title}" at commit ${review.headSha.slice(0, 10)}.\n\nEvaluating with ${item.models.length} model(s): ${item.models.map(modelLabel).join(', ')}. Findings will appear here once evaluation completes.`,
          permissionMode: FULL_ACCESS_PERMISSION_MODE,
          visibility: 'visible',
          environment: workspace.environment
        });
        coordinatorThreadId = spawnedCoord.id;
        deps.store.setReviewCoordinatorThreadId(review.id, coordinatorThreadId);
        deps.store.recordPrThread(pr.id, coordinatorThreadId, 'coordinator');
        changed({ prId: pr.id, reviewId: review.id, coordinatorThreadId });
      } catch (error) {
        deps.log.warn(`codenod: could not spawn coordinator thread: ${errorMessage(error)}`);
      }
    }

    const promptContext = { ...gathered.prompt, customInstructions: config.customInstructions, hasWorkspace: workspace.hasWorkspace };
    const hasRequirements = hasRequirementsContext(promptContext);
    const prompt = getFullReviewPrompt(promptContext);

    const runs = item.models.map((model) => ({ model, run: deps.store.createRun({ reviewId: review.id, ...model }) }));
    changed({ prId: pr.id, reviewId: review.id });

    const outcomes = await Promise.all(
      runs.map(async ({ model, run }, index): Promise<{ model: ModelChoice; analysis: ParsedAnalysis } | null> => {
        deps.store.updateRun(run.id, { status: 'running' });
        const environment: SpawnEnvironment | undefined = workspace.environment?.kind === 'worktree'
          ? { ...workspace.environment, branchSlug: `${workspace.environment.branchSlug}-${run.id.slice(0, 6)}-${index}` }
          : workspace.environment;
        try {
          const permissionMode = pickReviewPermissionMode(await deps.providerPermissionModes(model.providerId).catch(() => undefined));
          if (!permissionMode) throw new Error(`Provider ${model.providerId} has no full-access permission mode for automated reviews`);
          const result = await runModelInThread(deps.threads, deps.waiter, {
            projectId: workspace.projectId,
            environment,
            model,
            permissionMode,
            title: `CodeNod review: ${pr.owner}/${pr.repo}#${pr.number} (${model.model})`,
            prompt,
            validate: (text) => {
              const parsed = parseAnalysis(text, { hasRequirements });
              return parsed.ok ? { ok: true } : { ok: false, problem: parsed.problem };
            },
            repairPrompt: getRepairPrompt,
            timeoutMs: config.timeoutMs,
            signal,
            archiveWhenDone: config.archiveThreads,
            onThread: (threadId) => deps.store.updateRun(run.id, { threadId })
          });
          const parsed = parseAnalysis(result.text, { hasRequirements });
          if (!parsed.ok) throw new Error(`Model reply was not usable: ${parsed.problem}`);
          const analysis = { ...parsed.analysis, issues: dedupeIssues(parsed.analysis.issues) };
          deps.store.completeRun(run.id, { summary: analysis.summary, issueCount: analysis.issues.length, scores: analysis });
          return { model, analysis };
        } catch (error) {
          deps.store.updateRun(run.id, { status: signal.aborted ? 'cancelled' : 'failed', error: errorMessage(error) });
          deps.log.warn(`codenod: ${modelLabel(model)} failed on ${pr.id}: ${errorMessage(error)}`);
          return null;
        } finally {
          changed({ prId: pr.id, reviewId: review.id });
        }
      })
    );

    if (signal.aborted) {
      deps.store.setReviewStatus(review.id, 'cancelled', 'Cancelled');
      if (coordinatorThreadId) {
        await deps.threads.send({ threadId: coordinatorThreadId, prompt: 'Review was cancelled.' }).catch(() => undefined);
      }
      return;
    }
    const succeeded = outcomes.filter((outcome): outcome is { model: ModelChoice; analysis: ParsedAnalysis } => outcome !== null);
    if (succeeded.length === 0) {
      const errors = deps.store.listRuns(review.id).map((run) => run.error).filter(Boolean);
      deps.store.setReviewStatus(review.id, 'failed', errors[0] ?? 'Every model failed');
      if (coordinatorThreadId) {
        await deps.threads.send({
          threadId: coordinatorThreadId,
          prompt: `Code review failed. Errors:\n${errors.join('\n')}`
        }).catch(() => undefined);
      }
      return;
    }

    const tagged: TaggedIssue[] = succeeded.flatMap(({ model, analysis }) =>
      analysis.issues.map((issue, index) => ({ ...issue, id: `${modelLabel(model)}:${index}`, model: modelLabel(model) }))
    );
    const clusters = clusterIssues(tagged, succeeded.length);
    deps.store.replaceFindings(
      review.id,
      clusters.map((cluster) => ({
        category: cluster.category,
        severity: cluster.severity,
        file: cluster.file,
        line: cluster.line,
        description: cluster.description,
        suggestion: cluster.suggestion,
        agreedBy: cluster.agreedBy,
        confidence: cluster.confidence
      }))
    );

    let consensusSummary: string | null = null;
    if (succeeded.length > 1 && deps.complete) {
      try {
        const models = succeeded.map(({ model }) => modelLabel(model));
        const result = await deps.complete({
          instructions: 'You summarize multi-model code review results for a busy reviewer.',
          prompt: getConsensusPrompt(
            clusters.map((cluster) => ({ ...cluster, filePath: cluster.file, lineNumber: cluster.line, agreedByModels: cluster.agreedBy })),
            models
          )
        });
        consensusSummary = result.text.trim() || null;
      } catch (error) {
        deps.log.warn(`codenod: consensus summary failed: ${errorMessage(error)}`);
      }
    }

    deps.store.completeReview(review.id, {
      summary: succeeded[0].analysis.summary,
      consensusSummary,
      hasRequirements,
      scores: aggregateScores(succeeded.map(({ analysis }) => analysis))
    });

    if (coordinatorThreadId) {
      const done = deps.store.getReview(review.id)!;
      const blocking = clusters.filter((c) => c.severity === 'critical' || c.severity === 'high').length;
      const reviewText = [
        `# Review Completed: ${pr.owner}/${pr.repo}#${pr.number}`,
        `**Risk Score**: ${done.riskScore ?? '–'}/10`,
        `**Findings**: ${clusters.length} total (${blocking} high or critical)`,
        `**Evaluated by**: ${succeeded.map(({ model }) => modelLabel(model)).join(', ')}`,
        '',
        `### Summary`,
        done.consensusSummary ?? done.summary ?? 'No summary available.',
        '',
        clusters.length > 0
          ? `### Top Issues\n` +
            clusters
              .slice(0, 10)
              .map(
                (c) =>
                  `- [${c.severity.toUpperCase()}] **${c.file}${c.line ? `:${c.line}` : ''}**: ${c.description} *(Agreed by: ${c.agreedBy.join(', ')})*`
              )
              .join('\n')
          : 'No issues found.'
      ].join('\n');
      await deps.threads.send({ threadId: coordinatorThreadId, prompt: reviewText }).catch(() => undefined);
    }

    // A commit may have arrived while the models were working.
    await deps.syncPullRequest(parsePrId(pr.id)).catch((error) => deps.log.warn(`codenod: post-review refresh failed: ${errorMessage(error)}`));

    if (deps.notify) {
      const done = deps.store.getReview(review.id)!;
      const blocking = clusters.filter((cluster) => cluster.severity === 'critical' || cluster.severity === 'high').length;
      const text = [
        `CodeNod reviewed ${pr.owner}/${pr.repo}#${pr.number}: ${pr.title}`,
        `Risk ${done.riskScore ?? '–'}/10 · ${clusters.length} finding(s), ${blocking} high or critical · ${succeeded.length}/${item.models.length} model(s) succeeded`,
        pr.url
      ].join('\n');
      await deps.notify({ projectId: workspace.projectId, text }).catch((error) => deps.log.warn(`codenod: inbox push failed: ${errorMessage(error)}`));
    }
  }

  async function pump(): Promise<void> {
    const { maxConcurrent } = await deps.config();
    while (active.size < Math.max(1, maxConcurrent) && queue.length > 0) {
      const item = queue.shift()!;
      const controller = new AbortController();
      active.set(item.reviewId, controller);
      void runReview(item, controller.signal)
        .catch((error) => {
          deps.store.setReviewStatus(item.reviewId, 'failed', errorMessage(error));
          deps.log.warn(`codenod: review ${item.reviewId} failed: ${errorMessage(error)}`);
        })
        .finally(() => {
          active.delete(item.reviewId);
          const review = deps.store.getReview(item.reviewId);
          changed({ prId: review?.prId, reviewId: item.reviewId, status: review?.status });
          void pump();
        });
    }
  }

  /** Refreshes the PR from GitHub, records a queued review for its head commit, and schedules it. */
  async function startReview(ref: PrRef, options: { models?: ModelChoice[]; trigger?: 'manual' | 'auto' } = {}): Promise<ReviewRow> {
    const config = await deps.config();
    const models = (options.models && options.models.length > 0 ? options.models : config.models).slice(0, 5);
    if (models.length === 0) throw new Error('No review model is configured. Pick at least one model in CodeNod settings.');
    const pr = await deps.syncPullRequest(ref);
    const running = deps.store.latestReview(pr.id);
    if (running && (running.status === 'queued' || running.status === 'running') && running.headSha === pr.headSha) return running;
    const trigger = options.trigger ?? 'manual';
    const review = deps.store.createReview({ prId: pr.id, headSha: pr.headSha, trigger });
    queue.push({ reviewId: review.id, models, trigger });
    changed({ prId: pr.id, reviewId: review.id });
    void pump();
    return review;
  }

  return {
    startReview,

    cancelReview(reviewId: string): boolean {
      const queuedIndex = queue.findIndex((item) => item.reviewId === reviewId);
      if (queuedIndex !== -1) {
        queue.splice(queuedIndex, 1);
        deps.store.setReviewStatus(reviewId, 'cancelled', 'Cancelled');
        changed({ reviewId });
        return true;
      }
      const controller = active.get(reviewId);
      if (!controller) return false;
      controller.abort();
      return true;
    },

    activeCount: () => active.size + queue.length,

    async dispose(): Promise<void> {
      for (const controller of active.values()) controller.abort();
      queue.length = 0;
    }
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
