import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../server/db.ts';
import type { GitHubClient } from '../server/github/client.ts';
import { runGit, SNAPSHOT_REF_PREFIX } from '../server/local/git.ts';
import { createLocalReviews, LOCAL_REVIEW_RETENTION_MS, localTargetId, MAX_REVIEWS_PER_LOCATION, prepareLocalFiles } from '../server/local/service.ts';
import { createPoster } from '../server/post.ts';
import type { ZanaProject } from '../server/projects.ts';
import type { ThreadsApi, ThreadWaiter } from '../server/review/runner.ts';
import { createReviewService, type ReviewConfig, type ReviewService, type ReviewServiceDeps } from '../server/review/service.ts';
import type { LocalReviewSource, LocalScope } from '../server/types.ts';
import { getLocalDetail } from '../server/views.ts';
import { createSqliteDatabase } from './fake-host.ts';

const IDENTITY = { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
const REPLY = JSON.stringify({
  summary: 'Local review',
  riskScore: 6,
  securityIssues: [],
  performanceIssues: [],
  logicIssues: [{ severity: 'high', file: 'a.ts', line: 1, description: 'a is never read', suggestion: 'Export it' }],
  styleIssues: [],
  changeTypes: [],
  coverageScore: 3,
  coverageNote: 'No tests',
  simplicityScore: 9,
  simplicityNote: 'Simple',
  stabilityScore: 8,
  stabilityNote: 'Additive'
});
const dirs: string[] = [];

function sh(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, env: { ...process.env, ...IDENTITY }, encoding: 'utf8' });
}

function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'codenod-local-')));
  dirs.push(dir);
  return dir;
}

function createRepo(): string {
  const dir = tempDir();
  sh(dir, 'init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'a.ts'), 'const a = 1;\n');
  sh(dir, 'add', '.');
  sh(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50_000; attempt++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('condition was never met');
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

interface HarnessOptions {
  config?: Partial<ReviewConfig>;
  respond?: (signal?: AbortSignal) => string | Promise<string>;
  notify?: ReviewServiceDeps['notify'];
}

function createHarness(options: HarnessOptions = {}) {
  const repo = createRepo();
  const project: ZanaProject = { id: 'app', name: 'App', path: repo };
  let clock = 1_000;
  const store = createStore(createSqliteDatabase(), () => ++clock);
  const spawned: Array<{ id: string; args: Parameters<ThreadsApi['spawn']>[0] }> = [];
  const threads = {
    spawn: vi.fn<ThreadsApi['spawn']>(async (args) => {
      const id = `thread-${spawned.length + 1}`;
      spawned.push({ id, args });
      return { id };
    }),
    get: vi.fn<ThreadsApi['get']>(async () => ({ status: 'idle' })),
    output: vi.fn<ThreadsApi['output']>(async () => ({ output: '' })),
    send: vi.fn<ThreadsApi['send']>(async () => ({ id: 'turn' })),
    stop: vi.fn<ThreadsApi['stop']>(async () => ({ ok: true as const })),
    archive: vi.fn<ThreadsApi['archive']>(async ({ threadId }) => ({ id: threadId }))
  };
  const waiter: ThreadWaiter = {
    onEvent: async () => undefined,
    pending: () => 0,
    waitForStart: async () => 'started',
    waitForOutput: async (_threadId, args = {}) => (options.respond ?? (() => REPLY))(args.signal)
  };
  const config: ReviewConfig = {
    models: [{ providerId: 'claude-code', model: 'opus' }],
    customInstructions: null,
    fallbackProjectId: null,
    workspaceMode: 'worktree',
    maxConcurrent: 2,
    timeoutMs: 60_000,
    archiveThreads: true,
    showReviewsOnAgentsBoard: false,
    ...options.config
  };
  const published: Array<{ event: string; payload: unknown }> = [];
  const log = { info: vi.fn(), warn: vi.fn() };
  const publish = (event: string, payload: unknown) => void published.push({ event, payload });
  let reviews: ReviewService;
  const local = createLocalReviews({
    store,
    git: runGit,
    listProjects: async () => [project],
    config: async () => config,
    reviews: () => reviews,
    threads,
    waiter,
    specGlobForProject: async () => 'docs/*.md',
    publish,
    log,
    now: () => clock
  });
  reviews = createReviewService({
    store,
    github: {} as GitHubClient,
    threads,
    waiter,
    projects: { projectForRepo: async () => null, projects: async () => [project], invalidate() {} },
    config: async () => config,
    providerPermissionModes: async () => ['read-only', 'full'],
    notify: options.notify,
    localReviewTarget: (review) => local.reviewTarget(review),
    syncPullRequest: async () => {
      throw new Error('Local reviews never sync pull requests');
    },
    publish,
    coordinatorRetryDelayMs: 0,
    log
  });
  const start = (scope: LocalScope = 'uncommitted', extra: { source?: LocalReviewSource; intent?: string; base?: string; worktreePath?: string } = {}) =>
    local.startLocalReview({ projectId: project.id, worktreePath: extra.worktreePath ?? repo, scope, source: extra.source ?? 'ui', intent: extra.intent, base: extra.base });
  return {
    repo,
    project,
    store,
    local,
    reviews: () => reviews,
    spawned,
    threads,
    published,
    log,
    start,
    targetId: localTargetId(project.id, repo),
    advance: (ms: number) => void (clock += ms),
    settled: () => until(() => reviews.activeCount() === 0)
  };
}

function snapshotRefs(repo: string): string[] {
  return sh(repo, 'for-each-ref', '--format=%(refname)', SNAPSHOT_REF_PREFIX).split('\n').filter(Boolean);
}

describe('local reviews', () => {
  it('reviews uncommitted changes in a worktree of the immutable snapshot without touching the checkout', async () => {
    const harness = createHarness();
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');
    writeFileSync(join(harness.repo, 'b.ts'), 'export const b = 1;\n');
    writeFileSync(join(harness.repo, '.env'), 'TOKEN=abc\n');
    const statusBefore = sh(harness.repo, 'status', '--porcelain');

    const review = await harness.start('uncommitted', { intent: 'Bump a' });
    await harness.settled();

    const snapshot = harness.store.getLocalSnapshot(review.id)!;
    expect(harness.store.getReview(review.id)).toMatchObject({ status: 'completed', targetKind: 'local', prId: harness.targetId, riskScore: 6, hasRequirements: true });
    expect(snapshot.files.map((file) => file.path).sort()).toEqual(['a.ts', 'b.ts']);
    expect(snapshot.skipped).toEqual([{ path: '.env', reason: 'possible-secret' }]);
    expect(harness.spawned[0].args).toMatchObject({ projectId: 'app', environment: { kind: 'worktree', baseBranch: snapshot.snapshotSha } });
    const prompt = String(harness.spawned[0].args.prompt);
    expect(prompt).toContain('Bump a');
    expect(prompt).toContain('+const a = 2;');
    expect(prompt).not.toContain('TOKEN=abc');
    expect(snapshotRefs(harness.repo)).toEqual([`${SNAPSHOT_REF_PREFIX}${review.id}`]);
    expect(sh(harness.repo, 'status', '--porcelain')).toBe(statusBefore);
    expect(harness.store.getLocalTarget(harness.targetId)).toMatchObject({ lastScope: 'uncommitted', branch: 'main' });
    expect(harness.published).toContainEqual({ event: 'codenod:changed', payload: { local: true, targetId: harness.targetId, reviewId: review.id } });
  });

  it('returns the in-flight review for unchanged files and starts a new one after an edit', async () => {
    const releases: Array<() => void> = [];
    const harness = createHarness({ respond: () => new Promise((resolve) => releases.push(() => resolve(REPLY))) });
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');

    const [first, simultaneous] = await Promise.all([harness.start(), harness.start()]);
    const again = await harness.start();
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 3;\n');
    const edited = await harness.start();
    const staged = await harness.start('staged').catch((error: Error) => error.message);
    await until(() => releases.length === 2);
    releases.splice(0).forEach((release) => release());
    await harness.settled();

    expect(simultaneous.id).toBe(first.id);
    expect(again.id).toBe(first.id);
    expect(edited.id).not.toBe(first.id);
    expect(staged).toBe('No staged changes to review.');
    expect(harness.store.listLocalReviews(harness.targetId).map(({ review }) => review.status)).toEqual(['completed', 'completed']);
  });

  it('refuses an empty change and leaves no review or snapshot behind', async () => {
    const harness = createHarness();

    await expect(harness.start()).rejects.toThrow('No uncommitted changes to review.');

    expect(harness.store.listLocalReviews(harness.targetId)).toEqual([]);
    expect(snapshotRefs(harness.repo)).toEqual([]);
  });

  it('reviews the branch against its merge base with commit messages as context', async () => {
    const harness = createHarness();
    sh(harness.repo, 'checkout', '-q', '-b', 'feat/x');
    writeFileSync(join(harness.repo, 'c.ts'), 'export const c = 1;\n');
    sh(harness.repo, 'add', '.');
    sh(harness.repo, 'commit', '-q', '-m', 'Add c', '-m', 'Needed for the c feature');

    const review = await harness.start('branch', { base: 'main' });
    await harness.settled();

    expect(harness.store.getLocalSnapshot(review.id)).toMatchObject({ scope: 'branch', baseRef: 'main', files: [expect.objectContaining({ path: 'c.ts', status: 'added' })] });
    expect(String(harness.spawned[0].args.prompt)).toContain('Needed for the c feature');
    await expect(harness.start('branch', { base: 'main;rm -rf' })).rejects.toThrow();
  });

  it('reviews the snapshot rather than the live checkout in project mode and uses no workspace in diff-only mode', async () => {
    const project = createHarness({ config: { workspaceMode: 'project' } });
    const diffOnly = createHarness({ config: { workspaceMode: 'diff-only' } });
    for (const harness of [project, diffOnly]) writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');

    const projectReview = await project.start();
    await diffOnly.start();
    await project.settled();
    await diffOnly.settled();

    expect(project.spawned[0].args.environment).toMatchObject({ kind: 'worktree', baseBranch: project.store.getLocalSnapshot(projectReview.id)!.snapshotSha });
    expect(diffOnly.spawned[0].args.environment).toBeUndefined();
    expect(String(diffOnly.spawned[0].args.prompt)).toContain('There is no checkout');
  });

  it('reviews a separate worktree from its own snapshot even in project mode', async () => {
    const harness = createHarness({ config: { workspaceMode: 'project' } });
    const other = join(tempDir(), 'feature');
    sh(harness.repo, 'worktree', 'add', '-q', '-b', 'feature', other);
    writeFileSync(join(other, 'a.ts'), 'const a = 5;\n');

    const review = await harness.start('uncommitted', { worktreePath: other });
    await harness.settled();

    expect(harness.spawned[0].args.environment).toMatchObject({ kind: 'worktree', baseBranch: harness.store.getLocalSnapshot(review.id)!.snapshotSha });
  });

  it('lists checked-out locations, hides CodeNod worktrees, and refuses arbitrary paths', async () => {
    const harness = createHarness();
    const feature = join(tempDir(), 'feature');
    const reviewer = join(tempDir(), 'reviewer');
    sh(harness.repo, 'worktree', 'add', '-q', '-b', 'feature', feature);
    sh(harness.repo, 'worktree', 'add', '-q', '-b', 'zcc/codenod-local-1234', reviewer);
    writeFileSync(join(feature, 'new.ts'), 'export {};\n');

    const locations = await harness.local.listLocations();

    expect(locations.map((location) => [location.worktreePath, location.branch, location.isMain, location.changedFiles])).toEqual([
      [harness.repo, 'main', true, 0],
      [feature, 'feature', false, 1]
    ]);
    await expect(harness.local.resolveLocation('app', tempDir())).rejects.toThrow(/is not a checked-out location/);
    await expect(harness.local.locationForPath(join(feature))).resolves.toMatchObject({ worktree: { path: feature } });
    await expect(harness.local.resolveLocation('missing', harness.repo)).rejects.toThrow(/no local checkout/);
  });

  it('keeps agent-started reviews off the agents board and out of the inbox', async () => {
    const notify = vi.fn<NonNullable<ReviewServiceDeps['notify']>>(async () => undefined);
    const harness = createHarness({ config: { showReviewsOnAgentsBoard: true }, notify });
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');

    const quiet = await harness.start('uncommitted', { source: 'agent' });
    await harness.settled();
    const quietSpawns = harness.spawned.length;
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 3;\n');
    const visible = await harness.start('uncommitted', { source: 'cli' });
    await harness.settled();

    expect(harness.store.getReview(quiet.id)?.coordinatorThreadId).toBeNull();
    expect(quietSpawns).toBe(1);
    expect(harness.store.getReview(visible.id)?.coordinatorThreadId).toEqual(expect.any(String));
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('reports staleness, reads reviewed files from the snapshot, and refuses posting', async () => {
    const harness = createHarness();
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');
    const review = await harness.start();
    await harness.settled();

    const fresh = await harness.local.status(review.id);
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 9;\n');
    const stale = await harness.local.status(review.id);

    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');
    sh(harness.repo, 'commit', '-q', '-am', 'Commit the reviewed change');
    const committed = await harness.local.status(review.id);

    expect(fresh).toMatchObject({ stale: false, missing: false });
    expect(stale).toMatchObject({ stale: true, missing: false });
    expect(committed).toMatchObject({ stale: true, missing: false, currentTree: fresh.currentTree });
    await expect(harness.local.fileAt(review.id, 'a.ts')).resolves.toBe('const a = 2;\n');
    await expect(harness.local.fileAt(review.id, '../etc/passwd')).rejects.toThrow(/not part of this review/);
    await expect(createPoster({ store: harness.store, github: {} as GitHubClient }).post({ reviewId: review.id, findingIds: [], event: 'COMMENT' })).rejects.toThrow(
      /cannot be posted/
    );
  });

  it('asks before fixing findings in a changed checkout and fixes with normal permissions', async () => {
    const harness = createHarness();
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');
    const review = await harness.start();
    await harness.settled();
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 3;\n');
    const spawnsBefore = harness.spawned.length;

    const confirm = await harness.local.fix(review.id, []);
    const fixed = await harness.local.fix(review.id, [], true);

    expect(confirm).toEqual({ needsConfirmation: true, reason: 'Files changed since this review.' });
    expect(fixed).toMatchObject({ needsConfirmation: false, threadId: `thread-${spawnsBefore + 1}` });
    const args = harness.spawned.at(-1)!.args;
    expect(args).toMatchObject({ projectId: 'app', visibility: 'visible', environment: { kind: 'unmanaged' } });
    expect(args.permissionMode).toBeUndefined();
    expect(String(args.prompt)).toContain('Do NOT commit');
  });

  it('starts Deep Review with full access in a worktree of the snapshot', async () => {
    const harness = createHarness();
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');
    const review = await harness.start();
    await harness.settled();
    const snapshot = harness.store.getLocalSnapshot(review.id)!;

    await harness.local.deepReview(review.id);

    expect(harness.spawned.at(-1)!.args).toMatchObject({ permissionMode: 'full', environment: { kind: 'worktree', baseBranch: snapshot.snapshotSha } });
    await expect(harness.local.deepReview(review.id, ['missing'])).rejects.toThrow(/No active findings/);
  });

  it('cancels a running local review and refuses to delete it until it stops', async () => {
    const harness = createHarness({
      respond: (signal) =>
        new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(new Error('Review cancelled')), { once: true }))
    });
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');
    const review = await harness.start();
    await until(() => harness.spawned.length === 1);

    await expect(harness.local.deleteReview(review.id)).rejects.toThrow(/Cancel the running review/);
    expect(harness.reviews().cancelReview(review.id)).toBe(true);
    await harness.settled();
    await harness.local.deleteReview(review.id);

    expect(harness.store.getReview(review.id)).toBeNull();
    expect(snapshotRefs(harness.repo)).toEqual([]);
  });

  it(`keeps ${MAX_REVIEWS_PER_LOCATION} reviews per location and expires old ones except the latest`, async () => {
    const harness = createHarness();
    for (let index = 0; index < MAX_REVIEWS_PER_LOCATION + 2; index++) {
      writeFileSync(join(harness.repo, 'a.ts'), `const a = ${index + 10};\n`);
      await harness.start();
      await harness.settled();
    }

    expect(harness.store.listLocalReviews(harness.targetId)).toHaveLength(MAX_REVIEWS_PER_LOCATION);
    expect(snapshotRefs(harness.repo)).toHaveLength(MAX_REVIEWS_PER_LOCATION);

    harness.advance(LOCAL_REVIEW_RETENTION_MS + 1);
    const swept = await harness.local.sweep();

    expect(swept).toEqual({ deletedReviews: MAX_REVIEWS_PER_LOCATION - 1, deletedTargets: 0 });
    expect(harness.store.listLocalReviews(harness.targetId)).toHaveLength(1);
    expect(snapshotRefs(harness.repo)).toHaveLength(1);
  }, 30_000);

  it('forgets locations whose worktree was removed', async () => {
    const harness = createHarness();
    const feature = join(tempDir(), 'feature');
    sh(harness.repo, 'worktree', 'add', '-q', '-b', 'feature', feature);
    writeFileSync(join(feature, 'a.ts'), 'const a = 2;\n');
    await harness.start('uncommitted', { worktreePath: feature });
    await harness.settled();
    sh(harness.repo, 'worktree', 'remove', '--force', feature);

    const swept = await harness.local.sweep();

    expect(swept).toEqual({ deletedReviews: 1, deletedTargets: 1 });
    expect(harness.store.getLocalTarget(localTargetId('app', feature))).toBeNull();
    expect(snapshotRefs(harness.repo)).toEqual([]);
  });

  it('builds the detail view with history and the latest completed results', async () => {
    const harness = createHarness({ respond: () => REPLY });
    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 2;\n');
    const first = await harness.start();
    await harness.settled();

    const detail = getLocalDetail(harness.store, harness.targetId)!;

    expect(detail.review?.id).toBe(first.id);
    expect(detail.snapshot).toMatchObject({ scope: 'uncommitted', files: [{ path: 'a.ts', status: 'modified', additions: 1, deletions: 1 }] });
    expect(detail.findings).toHaveLength(1);
    expect(detail.history).toEqual([expect.objectContaining({ id: first.id, status: 'completed', scope: 'uncommitted', findingCount: 1 })]);
    expect(getLocalDetail(harness.store, harness.targetId, 'missing')).toBeNull();
    expect(getLocalDetail(harness.store, 'local:missing')).toBeNull();

    writeFileSync(join(harness.repo, 'a.ts'), 'const a = 3;\n');
    const second = await harness.start();
    await harness.settled();

    const olderDetail = getLocalDetail(harness.store, harness.targetId, first.id)!;
    expect(olderDetail.review?.id).toBe(first.id);
    expect(olderDetail.latestAttempt).toBeUndefined();

    harness.store.setReviewStatus(second.id, 'running');
    const runningDetail = getLocalDetail(harness.store, harness.targetId, first.id)!;
    expect(runningDetail.review?.id).toBe(first.id);
    expect(runningDetail.latestAttempt?.id).toBe(second.id);
  });
});

describe('prepareLocalFiles', () => {
  it('skips secret-looking tracked files, binaries, and generated files with a reason', () => {
    const prepared = prepareLocalFiles(
      [
        { path: 'src/a.ts', status: 'modified', additions: 1, deletions: 0, patch: '@@ -1 +1 @@\n+a' },
        { path: 'config/secrets.yml', status: 'modified', additions: 1, deletions: 0, patch: '@@ -1 +1 @@\n+k' },
        { path: 'logo.png', status: 'added', additions: 0, deletions: 0, patch: null },
        { path: 'package-lock.json', status: 'modified', additions: 1, deletions: 0, patch: '@@ -1 +1 @@\n+x' }
      ],
      [{ path: 'big.log', reason: 'too-large' }]
    );

    expect(prepared.files.map((file) => file.path)).toEqual(['src/a.ts']);
    expect(prepared.skipped).toEqual([
      { path: 'big.log', reason: 'too-large' },
      { path: 'config/secrets.yml', reason: 'possible-secret' },
      { path: 'logo.png', reason: 'binary' },
      { path: 'package-lock.json', reason: 'generated' }
    ]);
  });
});
