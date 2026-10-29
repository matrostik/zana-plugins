import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { basename, sep } from 'node:path';
import type { Store } from '../db.ts';
import type { ZanaProject } from '../projects.ts';
import { isReviewable, prepareDiff } from '../review/diff.ts';
import {
  getFullLocalReviewPrompt,
  getLocalDeepReviewPrompt,
  getLocalFixPrompt,
  hasLocalRequirementsContext,
  type SpecFileContext
} from '../review/prompts.ts';
import { globMatcher, MAX_SPEC_FILES } from '../review/requirements.ts';
import { FULL_ACCESS_PERMISSION_MODE, spawnVisibleWithPriorityFallback, type SpawnEnvironment, type ThreadsApi, type ThreadWaiter } from '../review/runner.ts';
import type { ReviewConfig, ReviewService, ReviewTarget } from '../review/service.ts';
import type {
  ChangedFile,
  LocalReviewSource,
  LocalScope,
  LocalSnapshotRow,
  LocalTargetRow,
  ModelChoice,
  ReviewRow,
  SkippedFile
} from '../types.ts';
import { errorMessage, mapWithConcurrency } from '../util.ts';
import {
  changedPathCount,
  commitExists,
  commitMessages,
  commitSnapshot,
  deleteSnapshotRef,
  diffFiles,
  isSecretLike,
  listWorktrees,
  mergeBase,
  readFileAt,
  repoTopLevel,
  resolveBase,
  snapshotTree,
  type GitRunner,
  type WorktreeInfo
} from './git.ts';

export const LOCAL_SCOPES: readonly LocalScope[] = ['uncommitted', 'staged', 'branch'];
export const MAX_REVIEWS_PER_LOCATION = 10;
export const LOCAL_REVIEW_RETENTION_MS = 30 * 24 * 60 * 60_000;
const MAX_INTENT_CHARS = 2_000;
const STATUS_CONCURRENCY = 4;
/** Worktrees CodeNod creates for its own reviewer and Deep Review threads. */
const CODENOD_BRANCH_PATTERN = /^zcc\/codenod-/;

const SCOPE_TITLES: Record<LocalScope, string> = {
  uncommitted: 'Uncommitted changes',
  staged: 'Staged changes',
  branch: 'Branch changes'
};

export interface LocalLocation {
  target: LocalTargetRow;
  project: ZanaProject & { path: string };
  worktree: WorktreeInfo;
}

export interface LocalLocationSummary {
  targetId: string;
  projectId: string;
  projectName: string;
  worktreePath: string;
  branch: string | null;
  isMain: boolean;
  changedFiles: number | null;
  lastScope: LocalScope | null;
  latest: Pick<ReviewRow, 'id' | 'status' | 'riskScore' | 'createdAt'> | null;
}

export interface StartLocalReviewInput {
  projectId: string;
  worktreePath: string;
  scope: LocalScope;
  base?: string | null;
  intent?: string | null;
  models?: ModelChoice[];
  source: LocalReviewSource;
}

export interface LocalReviewStatus {
  reviewId: string;
  stale: boolean;
  /** True when the reviewed location no longer exists. */
  missing: boolean;
  reviewedTree: string;
  currentTree: string | null;
}

export interface LocalReviewDeps {
  store: Store;
  git: GitRunner;
  listProjects: () => Promise<ZanaProject[]>;
  config: () => Promise<ReviewConfig>;
  reviews: () => Pick<ReviewService, 'resolveModels' | 'enqueueReview' | 'isActive'>;
  threads: ThreadsApi;
  waiter: ThreadWaiter;
  /** Spec file pattern of the watched repository that a project checks out, if any. */
  specGlobForProject?: (projectId: string) => Promise<string | null>;
  publish: (event: string, payload: unknown) => void;
  log: { info(message: string): void; warn(message: string): void };
  now?: () => number;
}

export function localTargetId(projectId: string, worktreePath: string): string {
  return `local:${createHash('sha256').update(`${projectId}\0${worktreePath}`).digest('hex').slice(0, 20)}`;
}

export function isLocalScope(value: unknown): value is LocalScope {
  return LOCAL_SCOPES.includes(value as LocalScope);
}

export function localLabel(target: Pick<LocalTargetRow, 'worktreePath' | 'branch'>, scope?: LocalScope): string {
  return `${basename(target.worktreePath)} · ${target.branch ?? 'detached HEAD'}${scope ? ` (${scope})` : ''}`;
}

/** Splits changed files into reviewable ones and skipped ones with a reason. */
export function prepareLocalFiles(files: ChangedFile[], untrackedSkipped: SkippedFile[]): { files: ChangedFile[]; skipped: SkippedFile[] } {
  const skipped: SkippedFile[] = [...untrackedSkipped];
  const candidates = files.filter((file) => {
    if (!isSecretLike(file.path)) return true;
    skipped.push({ path: file.path, reason: 'possible-secret' });
    return false;
  });
  const prepared = prepareDiff(candidates);
  const byPath = new Map(candidates.map((file) => [file.path, file]));
  for (const path of prepared.skipped) {
    const file = byPath.get(path);
    const reason = !file?.patch ? 'binary' : isReviewable(file) ? 'over-budget' : 'generated';
    skipped.push({ path, reason });
  }
  return { files: prepared.files, skipped };
}

async function canonicalPath(path: string): Promise<string> {
  return realpath(path).catch(() => path);
}

function isWithin(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent.endsWith(sep) ? parent : `${parent}${sep}`);
}

export function createLocalReviews(deps: LocalReviewDeps) {
  const now = deps.now ?? Date.now;
  const changed = (payload: Record<string, unknown>) => deps.publish('codenod:changed', { local: true, ...payload });

  async function projectsWithPath(): Promise<Array<ZanaProject & { path: string }>> {
    return (await deps.listProjects()).filter((project): project is ZanaProject & { path: string } => Boolean(project.path));
  }

  /** Checked-out locations per project; a project whose git listing fails maps to null. */
  async function worktreesByProject(projects: Array<ZanaProject & { path: string }>): Promise<Map<string, WorktreeInfo[] | null>> {
    const result = new Map<string, WorktreeInfo[] | null>();
    for (const project of projects) {
      result.set(project.id, await listWorktrees(deps.git, project.path).catch(() => null));
    }
    return result;
  }

  function toLocation(project: ZanaProject & { path: string }, worktree: WorktreeInfo): LocalLocation {
    const target = deps.store.upsertLocalTarget({
      id: localTargetId(project.id, worktree.path),
      projectId: project.id,
      worktreePath: worktree.path,
      branch: worktree.branch
    });
    return { target, project, worktree };
  }

  async function listLocations(): Promise<LocalLocationSummary[]> {
    const projects = await projectsWithPath();
    const byProject = await worktreesByProject(projects);
    const seen = new Set<string>();
    const locations: LocalLocation[] = [];
    for (const project of projects) {
      for (const worktree of byProject.get(project.id) ?? []) {
        if (seen.has(worktree.path) || (worktree.branch && CODENOD_BRANCH_PATTERN.test(worktree.branch))) continue;
        seen.add(worktree.path);
        locations.push(toLocation(project, worktree));
      }
    }
    const counts = await mapWithConcurrency(locations, STATUS_CONCURRENCY, (location) => changedPathCount(deps.git, location.worktree.path));
    return locations.map((location, index) => {
      const latest = deps.store.listLocalReviews(location.target.id)[0]?.review ?? null;
      return {
        targetId: location.target.id,
        projectId: location.project.id,
        projectName: location.project.name,
        worktreePath: location.worktree.path,
        branch: location.worktree.branch,
        isMain: location.worktree.isMain,
        changedFiles: counts[index],
        lastScope: location.target.lastScope,
        latest: latest ? { id: latest.id, status: latest.status, riskScore: latest.riskScore, createdAt: latest.createdAt } : null
      };
    });
  }

  /** Validates that `worktreePath` is a checked-out location of the project; arbitrary paths are refused. */
  async function resolveLocation(projectId: string, worktreePath: string): Promise<LocalLocation> {
    const project = (await projectsWithPath()).find((candidate) => candidate.id === projectId);
    if (!project) throw new Error(`Project ${projectId} has no local checkout`);
    const wanted = await canonicalPath(worktreePath);
    const worktrees = await listWorktrees(deps.git, project.path);
    for (const worktree of worktrees) {
      if ((await canonicalPath(worktree.path)) === wanted) return toLocation(project, worktree);
    }
    throw new Error(`${worktreePath} is not a checked-out location of project ${project.name}`);
  }

  /** Finds the project location that contains `path`, for example a terminal's working directory. */
  async function locationForPath(path: string, projectId?: string): Promise<LocalLocation> {
    const top = await repoTopLevel(deps.git, path);
    if (!top) throw new Error(`${path} is not inside a git checkout`);
    const wanted = await canonicalPath(top);
    const projects = (await projectsWithPath()).filter((project) => !projectId || project.id === projectId);
    for (const project of projects) {
      const worktrees = await listWorktrees(deps.git, project.path).catch(() => [] as WorktreeInfo[]);
      for (const worktree of worktrees) {
        if ((await canonicalPath(worktree.path)) === wanted) return toLocation(project, worktree);
      }
    }
    throw new Error(`${top} does not belong to a Zana project${projectId ? ` (${projectId})` : ''}. Register it as a project first.`);
  }

  function activeReviewFor(targetId: string, scope: LocalScope, baseRef: string | null, treeSha: string): ReviewRow | null {
    for (const { review, snapshot } of deps.store.listLocalReviews(targetId)) {
      if (review.status !== 'queued' && review.status !== 'running') continue;
      if (snapshot && snapshot.scope === scope && snapshot.baseRef === baseRef && snapshot.treeSha === treeSha) return review;
    }
    return null;
  }

  async function startLocalReview(input: StartLocalReviewInput): Promise<ReviewRow> {
    if (!isLocalScope(input.scope)) throw new Error(`Unknown scope ${String(input.scope)}. Use uncommitted, staged, or branch.`);
    const intent = input.intent?.trim() ? input.intent.trim().slice(0, MAX_INTENT_CHARS) : null;
    const location = await resolveLocation(input.projectId, input.worktreePath);
    const models = await deps.reviews().resolveModels(input.models);
    const path = location.worktree.path;
    const base = input.scope === 'branch' ? await resolveBase(deps.git, path, input.base?.trim() || null) : null;
    const tree = await snapshotTree(deps.git, path, input.scope);
    const existing = activeReviewFor(location.target.id, input.scope, base?.ref ?? null, tree.treeSha);
    if (existing) return existing;

    const review = deps.store.createReview({ prId: location.target.id, headSha: tree.headSha, trigger: 'manual', targetKind: 'local' });
    try {
      const snapshotSha = await commitSnapshot(deps.git, path, tree, input.scope, review.id);
      const baseSha = base ? await mergeBase(deps.git, path, base.sha, snapshotSha) : tree.headSha;
      const prepared = prepareLocalFiles(await diffFiles(deps.git, path, baseSha, snapshotSha), tree.skipped);
      if (prepared.files.length === 0) {
        throw new Error(
          prepared.skipped.length > 0
            ? `No reviewable ${input.scope} changes: ${prepared.skipped.length} file(s) were skipped (${[...new Set(prepared.skipped.map((file) => file.reason))].join(', ')}).`
            : `No ${input.scope} changes to review.`
        );
      }
      deps.store.recordLocalSnapshot({
        reviewId: review.id,
        targetId: location.target.id,
        scope: input.scope,
        baseRef: base?.ref ?? null,
        baseSha,
        headSha: tree.headSha,
        snapshotSha,
        treeSha: tree.treeSha,
        intent,
        source: input.source,
        files: prepared.files,
        skipped: prepared.skipped
      });
    } catch (error) {
      deps.store.deleteReview(review.id);
      await deleteSnapshotRef(deps.git, path, review.id);
      throw error;
    }
    deps.store.setLocalTargetScope(location.target.id, input.scope);
    deps.reviews().enqueueReview(review, models);
    await pruneTarget(location.target, path).catch((error) => deps.log.warn(`codenod: local review cleanup failed: ${errorMessage(error)}`));
    return deps.store.getReview(review.id) ?? review;
  }

  function snapshotFor(reviewId: string): { review: ReviewRow; snapshot: LocalSnapshotRow; target: LocalTargetRow } {
    const review = deps.store.getReview(reviewId);
    if (!review || review.targetKind !== 'local') throw new Error(`Local review ${reviewId} not found`);
    const snapshot = deps.store.getLocalSnapshot(reviewId);
    const target = deps.store.getLocalTarget(review.prId);
    if (!snapshot || !target) throw new Error(`Local review ${reviewId} has no snapshot`);
    return { review, snapshot, target };
  }

  async function projectFor(target: LocalTargetRow): Promise<ZanaProject & { path: string }> {
    const project = (await projectsWithPath()).find((candidate) => candidate.id === target.projectId);
    if (!project) throw new Error(`Project ${target.projectId} is no longer available`);
    return project;
  }

  async function specFiles(projectId: string, snapshot: LocalSnapshotRow, path: string): Promise<SpecFileContext[]> {
    const glob = (await deps.specGlobForProject?.(projectId).catch(() => null)) ?? null;
    if (!glob?.trim()) return [];
    const matches = globMatcher(glob);
    const paths = snapshot.files.filter((file) => file.status !== 'removed' && matches(file.path)).map((file) => file.path).slice(0, MAX_SPEC_FILES);
    const specs = await Promise.all(
      paths.map(async (specPath) => {
        const content = await readFileAt(deps.git, path, snapshot.snapshotSha, specPath).catch(() => null);
        return content?.trim() ? { path: specPath, content } : null;
      })
    );
    return specs.filter((spec): spec is SpecFileContext => spec !== null);
  }

  function reviewTarget(review: ReviewRow): ReviewTarget {
    const { snapshot, target } = snapshotFor(review.id);
    return {
      subject: { id: target.id, label: localLabel(target, snapshot.scope), title: SCOPE_TITLES[snapshot.scope], url: null },
      quiet: snapshot.source === 'agent',
      async prepare(current, config, signal) {
        const project = await projectFor(target);
        if (!(await commitExists(deps.git, target.worktreePath, snapshot.snapshotSha))) {
          throw new Error('The snapshot of this local review is missing from the repository');
        }
        // An unmanaged thread runs in the project folder, so it only sees the reviewed files when that folder is the reviewed checkout.
        const liveCheckout = config.workspaceMode === 'project' && isWithin(await canonicalPath(project.path), await canonicalPath(target.worktreePath));
        const workspace: { projectId: string; environment?: SpawnEnvironment; hasWorkspace: boolean } =
          config.workspaceMode === 'diff-only'
            ? { projectId: project.id, hasWorkspace: false }
            : liveCheckout
              ? { projectId: project.id, environment: { kind: 'unmanaged' }, hasWorkspace: true }
              : { projectId: project.id, environment: { kind: 'worktree', baseBranch: snapshot.snapshotSha, branchSlug: `codenod-local-${current.id.slice(0, 8)}` }, hasWorkspace: true };
        const context = {
          projectName: project.name,
          branch: target.branch,
          scope: snapshot.scope,
          baseRef: snapshot.baseRef,
          intent: snapshot.intent,
          commitMessages: snapshot.scope === 'branch' ? await commitMessages(deps.git, target.worktreePath, snapshot.baseSha, snapshot.headSha) : [],
          files: snapshot.files,
          skippedFiles: snapshot.skipped.map((file) => file.path),
          specFiles: await specFiles(project.id, snapshot, target.worktreePath),
          customInstructions: config.customInstructions,
          hasWorkspace: workspace.hasWorkspace
        };
        if (signal.aborted) {
          deps.store.setReviewStatus(current.id, 'cancelled', 'Cancelled');
          return null;
        }
        return { workspace, prompt: getFullLocalReviewPrompt(context), hasRequirements: hasLocalRequirementsContext(context) };
      },
      async afterComplete() {
        changed({ targetId: target.id, reviewId: review.id });
      }
    };
  }

  async function status(reviewId: string): Promise<LocalReviewStatus> {
    const { snapshot, target } = snapshotFor(reviewId);
    const current = await snapshotTree(deps.git, target.worktreePath, snapshot.scope).catch(() => null);
    return {
      reviewId,
      stale: current?.treeSha !== snapshot.treeSha,
      missing: current === null,
      reviewedTree: snapshot.treeSha,
      currentTree: current?.treeSha ?? null
    };
  }

  /** Reviewed text of a changed file, read from the immutable snapshot. */
  async function fileAt(reviewId: string, path: string): Promise<string | null> {
    const { snapshot, target } = snapshotFor(reviewId);
    if (!snapshot.files.some((file) => file.path === path)) throw new Error(`${path} is not part of this review`);
    return readFileAt(deps.git, target.worktreePath, snapshot.snapshotSha, path);
  }

  async function removeReview(reviewId: string, repoPath: string): Promise<void> {
    deps.store.deleteReview(reviewId);
    await deleteSnapshotRef(deps.git, repoPath, reviewId);
  }

  async function deleteReview(reviewId: string): Promise<void> {
    const { target } = snapshotFor(reviewId);
    if (deps.reviews().isActive(reviewId)) throw new Error('Cancel the running review before deleting it');
    await removeReview(reviewId, target.worktreePath);
    changed({ targetId: target.id, reviewId, deleted: true });
  }

  /** Keeps the newest reviews of a location and drops expired ones; running reviews are never removed. */
  async function pruneTarget(target: LocalTargetRow, repoPath: string): Promise<number> {
    const cutoff = now() - LOCAL_REVIEW_RETENTION_MS;
    let removed = 0;
    for (const [index, { review }] of deps.store.listLocalReviews(target.id).entries()) {
      if (index === 0 || deps.reviews().isActive(review.id)) continue;
      if (index >= MAX_REVIEWS_PER_LOCATION || review.createdAt < cutoff) {
        await removeReview(review.id, repoPath);
        removed++;
      }
    }
    return removed;
  }

  /** Applies retention and forgets locations that no longer exist. Skips projects whose git listing fails. */
  async function sweep(): Promise<{ deletedReviews: number; deletedTargets: number }> {
    const projects = await projectsWithPath();
    const byProject = await worktreesByProject(projects);
    let deletedReviews = 0;
    let deletedTargets = 0;
    for (const target of deps.store.listLocalTargets()) {
      const worktrees = byProject.get(target.projectId);
      if (worktrees === null) continue;
      const exists = worktrees?.some((worktree) => worktree.path === target.worktreePath) ?? false;
      if (exists) {
        deletedReviews += await pruneTarget(target, target.worktreePath);
        continue;
      }
      const reviews = deps.store.listLocalReviews(target.id);
      if (reviews.some(({ review }) => deps.reviews().isActive(review.id))) continue;
      const project = projects.find((candidate) => candidate.id === target.projectId);
      for (const { review } of reviews) {
        if (project) await removeReview(review.id, project.path);
        else deps.store.deleteReview(review.id);
        deletedReviews++;
      }
      deps.store.deleteLocalTarget(target.id);
      deletedTargets++;
    }
    if (deletedReviews > 0 || deletedTargets > 0) changed({ swept: true });
    return { deletedReviews, deletedTargets };
  }

  function selectedFindings(reviewId: string, findingIds: string[]) {
    const active = deps.store.listFindings(reviewId).filter((finding) => !finding.dismissed);
    const selected = findingIds.length > 0 ? active.filter((finding) => findingIds.includes(finding.id)) : active;
    if (findingIds.length > 0 && selected.length === 0) throw new Error('No active findings match the selection (selected findings may have been dismissed)');
    return selected;
  }

  async function deepReview(reviewId: string, findingIds: string[] = []) {
    const { review, snapshot, target } = snapshotFor(reviewId);
    const findings = selectedFindings(reviewId, findingIds);
    const config = await deps.config();
    if (config.models.length === 0) throw new Error('Choose a priority 1 review model in CodeNod Settings → Models before starting Deep Review.');
    const project = await projectFor(target);
    const hasWorkspace = config.workspaceMode !== 'diff-only';
    const focusOnFindings = findingIds.length > 0;
    const spawned = await spawnVisibleWithPriorityFallback(deps.threads, deps.waiter, config.models, {
      projectId: project.id,
      title: `Deep Review: ${localLabel(target, snapshot.scope)}${focusOnFindings ? ` (${findings.length} issue${findings.length === 1 ? '' : 's'})` : ''}`,
      prompt: getLocalDeepReviewPrompt({
        label: localLabel(target, snapshot.scope),
        scope: snapshot.scope,
        baseSha: snapshot.baseSha,
        snapshotSha: snapshot.snapshotSha,
        hasWorkspace,
        reviewSummary: review.consensusSummary ?? review.summary,
        findings,
        focusOnFindings
      }),
      permissionMode: FULL_ACCESS_PERMISSION_MODE,
      visibility: 'visible',
      ...(hasWorkspace ? { environment: { kind: 'worktree' as const, baseBranch: snapshot.snapshotSha, branchSlug: `codenod-deep-local-${review.id.slice(0, 8)}` } } : {})
    });
    return { threadId: spawned.id, projectId: project.id, priority: spawned.priority, model: spawned.model, usedFallback: spawned.usedFallback };
  }

  /**
   * Starts a visible thread that edits the reviewed checkout to fix findings, with the provider's normal permission prompts.
   * Returns `needsConfirmation` instead when files changed since the review and `force` is not set.
   */
  async function fix(reviewId: string, findingIds: string[], force = false) {
    const { snapshot, target } = snapshotFor(reviewId);
    const findings = selectedFindings(reviewId, findingIds);
    if (findings.length === 0) throw new Error('This review has no active findings to fix');
    const current = await status(reviewId);
    if (current.missing) throw new Error(`${target.worktreePath} no longer exists`);
    if (current.stale && !force) return { needsConfirmation: true as const, reason: 'Files changed since this review.' };
    const config = await deps.config();
    if (config.models.length === 0) throw new Error('Choose a priority 1 review model in CodeNod Settings → Models before fixing findings.');
    const project = await projectFor(target);
    const separateWorktree = !isWithin(await canonicalPath(project.path), await canonicalPath(target.worktreePath));
    const spawned = await spawnVisibleWithPriorityFallback(deps.threads, deps.waiter, config.models, {
      projectId: project.id,
      title: `Fix: ${localLabel(target)} (${findings.length} issue${findings.length === 1 ? '' : 's'})`,
      prompt: getLocalFixPrompt({
        label: localLabel(target, snapshot.scope),
        worktreePath: target.worktreePath,
        separateWorktree,
        snapshotSha: snapshot.snapshotSha,
        changedSinceReview: current.stale,
        findings
      }),
      visibility: 'visible',
      environment: { kind: 'unmanaged' }
    });
    return { needsConfirmation: false as const, threadId: spawned.id, projectId: project.id, priority: spawned.priority, model: spawned.model, usedFallback: spawned.usedFallback };
  }

  return {
    listLocations,
    resolveLocation,
    locationForPath,
    startLocalReview,
    reviewTarget,
    status,
    fileAt,
    deleteReview,
    deepReview,
    fix,
    sweep
  };
}

export type LocalReviews = ReturnType<typeof createLocalReviews>;
