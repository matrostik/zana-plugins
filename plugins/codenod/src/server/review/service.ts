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
import { pickReadOnlyPermissionMode, runModelInThread, type SpawnEnvironment, type ThreadsApi, type ThreadWaiter } from './runner.ts';

export type WorkspaceMode = 'worktree' | 'project' | 'diff-only';

export interface ReviewConfig {
  models: ModelChoice[];
  customInstructions: string | null;
  fallbackProjectId: string | null;
  workspaceMode: WorkspaceMode;
  maxConcurrent: number;
  timeoutMs: number;
  archiveThreads: boolean;
}

export interface ReviewServiceDeps {
  store: Store;
  github: GitHubClient;
  threads: ThreadsApi;
  waiter: ThreadWaiter;
  projects: ProjectMatcher;
  config: () => Promise<ReviewConfig>;
  providerPermissionModes: (providerId: string) => Promise<string[] | undefined>;
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
}

export function createReviewService(deps: ReviewServiceDeps) {
  const queue: QueuedReview[] = [];
  const active = new Map<string, AbortController>();

  const changed = (payload: Record<string, unknown>) => deps.publish(CHANGED_EVENT, payload);

  async function resolveWorkspace(pr: PullRequestRow, config: ReviewConfig): Promise<{ projectId: string; environment?: SpawnEnvironment; hasWorkspace: boolean }> {
    if (config.workspaceMode !== 'diff-only') {
      const project = await deps.projects.projectForRepo({ host: pr.host, owner: pr.owner, name: pr.repo });
      if (project) {
        return config.workspaceMode === 'worktree'
          ? { projectId: project.id, environment: { kind: 'worktree', baseBranch: pr.baseRef, branchSlug: `codenod-review-${pr.number}` }, hasWorkspace: true }
          : { projectId: project.id, environment: { kind: 'unmanaged' }, hasWorkspace: true };
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
    const workspace = await resolveWorkspace(pr, config);
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
          const permissionMode = pickReadOnlyPermissionMode(await deps.providerPermissionModes(model.providerId).catch(() => undefined));
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
      return;
    }
    const succeeded = outcomes.filter((outcome): outcome is { model: ModelChoice; analysis: ParsedAnalysis } => outcome !== null);
    if (succeeded.length === 0) {
      const errors = deps.store.listRuns(review.id).map((run) => run.error).filter(Boolean);
      deps.store.setReviewStatus(review.id, 'failed', errors[0] ?? 'Every model failed');
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

  return {
    /** Refreshes the PR from GitHub, records a queued review for its head commit, and schedules it. */
    async startReview(ref: PrRef, options: { models?: ModelChoice[]; trigger?: 'manual' | 'auto' } = {}): Promise<ReviewRow> {
      const config = await deps.config();
      const models = (options.models && options.models.length > 0 ? options.models : config.models).slice(0, 5);
      if (models.length === 0) throw new Error('No review model is configured. Pick at least one model in CodeNod settings.');
      const pr = await deps.syncPullRequest(ref);
      const running = deps.store.latestReview(pr.id);
      if (running && (running.status === 'queued' || running.status === 'running') && running.headSha === pr.headSha) return running;
      const review = deps.store.createReview({ prId: pr.id, headSha: pr.headSha, trigger: options.trigger ?? 'manual' });
      queue.push({ reviewId: review.id, models });
      changed({ prId: pr.id, reviewId: review.id });
      void pump();
      return review;
    },

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
