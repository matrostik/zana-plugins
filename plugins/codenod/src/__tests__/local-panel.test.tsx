// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodenodPanel } from '../app/CodenodPanel.tsx';
import { LocalDetail } from '../app/LocalDetail.tsx';
import { CODENOD_STYLES } from '../app/styles.ts';
import type { LocalOverview } from '../app/types.ts';
import type { LocalLocationSummary, LocalReviewStatus } from '../server/local/service.ts';
import type { LocalDetail as LocalDetailData } from '../server/views.ts';
import { detail, finding, NOW } from './pr-fixtures.ts';

const sdk = vi.hoisted(() => {
  const call = vi.fn();
  return { call, rpc: { call }, toThread: undefined as undefined | ((threadId: string) => void) };
});

vi.mock('@zana-ai/zcc-plugin-sdk/app', async (importActual) => ({
  ...(await importActual<Record<string, unknown>>()),
  useRpc: () => sdk.rpc,
  useZccNavigate: () => (sdk.toThread ? { toThread: sdk.toThread } : {})
}));

vi.mock('../app/SettingsView.tsx', () => ({ SettingsView: () => <p>Settings stub</p> }));

const TARGET_ID = 'local:abc';

function location(overrides: Partial<LocalLocationSummary> = {}): LocalLocationSummary {
  return {
    targetId: TARGET_ID,
    projectId: 'app',
    projectName: 'App',
    worktreePath: '/work/app',
    branch: 'feat/login',
    isMain: true,
    changedFiles: 3,
    lastScope: null,
    latest: null,
    ...overrides
  };
}

function localDetail(overrides: Partial<LocalDetailData> = {}): LocalDetailData {
  const completed = detail('completed', { createdAt: NOW - 60_000, completedAt: NOW });
  return {
    target: { id: TARGET_ID, projectId: 'app', worktreePath: '/work/app', branch: 'feat/login', lastScope: 'uncommitted', lastSeenAt: NOW, createdAt: NOW },
    review: { ...completed.review!, id: 'rev-2', prId: TARGET_ID, targetKind: 'local', headSha: 'a'.repeat(40) },
    snapshot: {
      scope: 'branch',
      baseRef: 'origin/main',
      baseSha: 'b'.repeat(40),
      headSha: 'a'.repeat(40),
      snapshotSha: 'c'.repeat(40),
      treeSha: 'd'.repeat(40),
      intent: 'Add login',
      source: 'ui',
      files: [{ path: 'src/login.ts', status: 'modified', additions: 3, deletions: 1 }],
      skipped: [
        { path: '.env.local', reason: 'possible-secret' },
        { path: 'logo.png', reason: 'binary' }
      ]
    },
    runs: completed.runs,
    findings: [finding({ reviewId: 'rev-2' })],
    history: [
      { id: 'rev-2', status: 'completed', riskScore: 2, createdAt: NOW - 60_000, scope: 'branch', baseRef: 'origin/main', findingCount: 1 },
      { id: 'rev-1', status: 'completed', riskScore: 8, createdAt: NOW - 3_600_000, scope: 'uncommitted', baseRef: null, findingCount: 4 }
    ],
    ...overrides
  };
}

function fresh(stale = false): LocalReviewStatus {
  return { reviewId: 'rev-2', stale, missing: false, reviewedTree: 'd'.repeat(40), currentTree: stale ? 'e'.repeat(40) : 'd'.repeat(40) };
}

const LOGIN_PATCH = '@@ -10,3 +10,4 @@\n const a = 1;\n const b = 2;\n+  const token = getToken();\n const c = 3;';
const LOGIN_DIFF = [{ path: 'src/login.ts', status: 'modified', additions: 1, deletions: 0, patch: LOGIN_PATCH }];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function answer(responses: Record<string, unknown | ((args: Record<string, unknown>) => unknown)>) {
  sdk.call.mockImplementation(async (method: string, args?: unknown) => {
    const response = responses[method];
    if (response === undefined) throw new Error(`unexpected rpc ${method}`);
    if (response instanceof Error) throw response;
    return typeof response === 'function' ? (response as (args: Record<string, unknown>) => unknown)((args ?? {}) as Record<string, unknown>) : response;
  });
}

function calls(method: string): Array<Record<string, unknown>> {
  return sdk.call.mock.calls.filter(([name]) => name === method).map(([, args]) => (args ?? {}) as Record<string, unknown>);
}

function renderDetail(overrides: Partial<LocalLocationSummary> = {}) {
  return render(<LocalDetail rpc={sdk.rpc} location={location(overrides)} defaultModels={[{ providerId: 'cursor', model: 'a' }]} hasModels onOpenSettings={() => {}} />);
}

beforeEach(() => {
  sdk.call.mockReset();
  sdk.toThread = undefined;
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      stored.set(key, value);
    },
    clear: () => stored.clear()
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('segmented styles', () => {
  it('keeps the settings tabs on the shared segmented pill style', () => {
    expect(CODENOD_STYLES).toContain('.cn-segmented, .cn-settings-tabs {');
    expect(CODENOD_STYLES).toContain('.cn-segmented .cn-tab[aria-checked="true"]');
  });
});

describe('Pull requests | Local changes switch', () => {
  const overview = { prs: [], hosts: [], syncing: false, lastSyncAt: null, autoSyncEnabled: true, activeReviews: 0, hasModels: true, hasWatchedRepos: true };
  const locals: LocalOverview = {
    locations: [
      location(),
      location({ targetId: 'local:clean', worktreePath: '/work/app-clean', branch: 'main', isMain: false, changedFiles: 0 }),
      location({ targetId: 'local:web', projectId: 'web', projectName: 'Web', worktreePath: '/work/web', branch: 'fix/nav', changedFiles: 1, latest: { id: 'r', status: 'completed', riskScore: 8, createdAt: NOW } })
    ],
    scopes: ['uncommitted', 'staged', 'branch'],
    hasModels: true
  };

  it('restores the saved checkout when switching projects on the mounted panel', async () => {
    localStorage.setItem('codenod.mode:app', 'local');
    localStorage.setItem('codenod.mode:web', 'local');
    localStorage.setItem('codenod.localTarget:web', 'local:web');
    answer({ overview, config: { models: [] }, localTargets: (args: Record<string, unknown>) => ({ ...locals, locations: locals.locations.filter((item) => item.projectId === args.projectId) }), localDetail: localDetail(), localStatus: fresh() });
    const { rerender } = render(<CodenodPanel pluginId="codenod" projectId="app" />);
    fireEvent.click(await screen.findByRole('button', { name: /feat\/login/ }));
    expect(localStorage.getItem('codenod.localTarget:app')).toBe(TARGET_ID);
    rerender(<CodenodPanel pluginId="codenod" projectId="web" />);
    const selected = await screen.findByRole('button', { name: /fix\/nav/ });
    expect(selected.getAttribute('aria-current')).toBe('true');
    expect(screen.queryByRole('button', { name: /feat\/login/ })).toBeNull();
  });

  it('switches modes with the keyboard, remembers the choice, and groups checkouts by project', async () => {
    answer({ overview, config: { models: [] }, localTargets: locals });
    const { unmount } = render(<CodenodPanel pluginId="codenod" />);

    const switcher = await screen.findByRole('tablist', { name: 'Review source' });
    const prTab = within(switcher).getByRole('tab', { name: 'Pull requests' });
    expect(prTab.getAttribute('aria-selected')).toBe('true');
    expect(within(switcher).getByRole('tab', { name: 'Local changes' }).tabIndex).toBe(-1);
    fireEvent.keyDown(prTab, { key: 'ArrowRight' });

    expect(within(switcher).getByRole('tab', { name: 'Local changes' }).getAttribute('aria-selected')).toBe('true');
    expect(localStorage.getItem('codenod.mode')).toBe('local');
    const list = await screen.findByRole('navigation', { name: 'Local checkouts' });
    expect(within(list).getByRole('heading', { name: 'App' })).toBeTruthy();
    expect(within(list).getByRole('heading', { name: 'Web' })).toBeTruthy();
    expect(within(list).getByText('3 changed')).toBeTruthy();
    expect(within(list).getByText('Risk 8/10').className).toContain('cn-badge-danger');
    expect(within(list).queryByText('main')).toBeNull();

    fireEvent.click(within(list).getByRole('checkbox', { name: /Show clean \(1 hidden\)/ }));
    expect(within(list).getByText('Clean')).toBeTruthy();

    unmount();
    render(<CodenodPanel pluginId="codenod" />);
    expect((await screen.findByRole('tab', { name: 'Local changes' })).getAttribute('aria-selected')).toBe('true');
  });

  it('opens the selected checkout and reloads the list and its status on Refresh', async () => {
    answer({ overview, config: { models: [] }, localTargets: locals, localDetail: localDetail(), localStatus: fresh() });
    localStorage.setItem('codenod.mode', 'local');
    render(<CodenodPanel pluginId="codenod" />);

    fireEvent.click(await screen.findByRole('button', { name: /fix\/nav/ }));
    expect(await screen.findByRole('region', { name: /Local changes in Web · fix\/nav/ })).toBeTruthy();
    expect(localStorage.getItem('codenod.localTarget')).toBe('local:web');
    await waitFor(() => expect(calls('localDetail')).toHaveLength(1));
    await waitFor(() => expect(calls('localStatus')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(calls('localTargets')).toHaveLength(2));
    // Refresh re-checks the open checkout's detail and freshness, not just the list.
    await waitFor(() => expect(calls('localDetail')).toHaveLength(2));
    await waitFor(() => expect(calls('localStatus')).toHaveLength(2));
    expect(calls('refresh')).toHaveLength(0);
  });
});

describe('LocalDetail', () => {
  it('starts a review for the chosen scope, base, and intent', async () => {
    answer({ localDetail: localDetail({ review: null, snapshot: null, runs: [], findings: [], history: [] }), startLocalReview: { id: 'rev-3' } });
    renderDetail();

    const scopes = await screen.findByRole('radiogroup', { name: 'Changes to review' });
    const uncommitted = within(scopes).getByRole('radio', { name: 'Uncommitted' });
    expect(uncommitted.getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(uncommitted, { key: 'End' });
    expect(within(scopes).getByRole('radio', { name: 'Branch vs base' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.change(screen.getByLabelText('Base branch'), { target: { value: ' origin/develop ' } });
    fireEvent.change(screen.getByLabelText('Intent (optional)'), { target: { value: 'Add login' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));

    expect(await screen.findByText('Snapshot taken')).toBeTruthy();
    expect(calls('startLocalReview')).toEqual([{ projectId: 'app', worktreePath: '/work/app', scope: 'branch', base: 'origin/develop', intent: 'Add login' }]);
    expect(screen.getByText('Not reviewed yet.')).toBeTruthy();
  });

  it('remembers the last scope and hides the base field outside branch scope', async () => {
    answer({ localDetail: localDetail({ review: null, snapshot: null, history: [] }) });
    renderDetail({ lastScope: 'staged' });

    expect((await screen.findByRole('radio', { name: 'Staged' })).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByLabelText('Base branch')).toBeNull();
  });

  it('shows results with snapshot code context, reviewed files, no GitHub controls, skipped files and history', async () => {
    answer({
      localDetail: (args: Record<string, unknown>) => localDetail(args.reviewId === 'rev-1' ? { review: { ...localDetail().review!, id: 'rev-1' } } : {}),
      localStatus: fresh(),
      localDiff: LOGIN_DIFF
    });
    renderDetail();

    expect(await screen.findByText('Looks fine')).toBeTruthy();
    expect(screen.getByText(/Branch vs base vs origin\/main · 1 file\(s\) reviewed/)).toBeTruthy();
    expect(screen.queryByText(/to GitHub/)).toBeNull();
    expect(screen.queryByText(/unposted/)).toBeNull();
    expect(screen.queryByRole('link', { name: /GitHub/ })).toBeNull();

    // The finding renders code context pulled from the reviewed snapshot (localDiff RPC).
    const snippet = await screen.findByRole('region', { name: 'Code context for src/login.ts:12' });
    expect(within(snippet).getByText('const token = getToken();')).toBeTruthy();
    expect(screen.queryByText('Code context unavailable for this finding.')).toBeNull();
    expect(calls('localDiff').at(-1)).toEqual({ reviewId: 'rev-2' });

    // The Files tab reads the same reviewed snapshot.
    fireEvent.click(screen.getByRole('tab', { name: 'Files (1)' }));
    const fileSection = await screen.findByRole('region', { name: 'Diff of src/login.ts' });
    expect(within(fileSection).getByText(/const token = getToken\(\);/)).toBeTruthy();

    expect(screen.getByText('2 files not reviewed')).toBeTruthy();
    expect(screen.getByText('Possible secret skipped')).toBeTruthy();
    expect(screen.getByText('Possible secret').className).toContain('cn-badge-danger');
    expect(screen.getByText('Binary')).toBeTruthy();

    const history = screen.getByText('History (2)').closest('details')!;
    expect(within(history).getAllByRole('row')).toHaveLength(3);
    fireEvent.click(within(history).getByRole('button', { name: 'View' }));
    await waitFor(() => expect(calls('localDetail').at(-1)).toEqual({ targetId: TARGET_ID, reviewId: 'rev-1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Show latest' }));
    await waitFor(() => expect(calls('localDetail').at(-1)).toEqual({ targetId: TARGET_ID }));
  });

  it('surfaces a context error when the snapshot diff fails and recovers on the next review', async () => {
    answer({ localDetail: localDetail(), localStatus: fresh(), localDiff: new Error('snapshot unreadable') });
    renderDetail();

    expect(await screen.findByText('Looks fine')).toBeTruthy();
    expect(await screen.findByText(/Could not load code context: snapshot unreadable/)).toBeTruthy();

    // The Files tab reports its own error without crashing the panel.
    fireEvent.click(screen.getByRole('tab', { name: 'Files (1)' }));
    expect(await screen.findByText('snapshot unreadable')).toBeTruthy();
  });

  it('ignores a stale localStatus response that resolves after switching reviews', async () => {
    const rev2Status = deferred<LocalReviewStatus>();
    const rev1Status = deferred<LocalReviewStatus>();
    const statusByReview: Record<string, Promise<LocalReviewStatus>> = { 'rev-2': rev2Status.promise, 'rev-1': rev1Status.promise };
    answer({
      localDetail: (args: Record<string, unknown>) => localDetail(args.reviewId === 'rev-1' ? { review: { ...localDetail().review!, id: 'rev-1' } } : {}),
      localStatus: (args: Record<string, unknown>) => statusByReview[args.reviewId as string] ?? fresh(),
      localDiff: []
    });
    renderDetail();

    await screen.findByText('Looks fine');
    const history = screen.getByText('History (2)').closest('details')!;
    fireEvent.click(within(history).getByRole('button', { name: 'View' }));
    // Now viewing the older rev-1, whose status is stale.
    await waitFor(() => expect(calls('localDetail').at(-1)).toEqual({ targetId: TARGET_ID, reviewId: 'rev-1' }));
    await waitFor(() => expect(calls('localStatus').some((args) => args.reviewId === 'rev-1')).toBe(true));

    // The current review (rev-1) resolves first as stale; the previous request for rev-2 resolves later as fresh.
    rev1Status.resolve({ reviewId: 'rev-1', stale: true, missing: false, reviewedTree: 'd'.repeat(40), currentTree: 'f'.repeat(40) });
    expect(await screen.findByRole('status', { name: 'Review outdated' })).toBeTruthy();
    rev2Status.resolve(fresh(false));

    // The late rev-2 response must not clear the stale banner for the review on screen.
    await waitFor(() => expect(calls('localDetail').at(-1)).toEqual({ targetId: TARGET_ID, reviewId: 'rev-1' }));
    expect(screen.getByRole('status', { name: 'Review outdated' })).toBeTruthy();
  });

  it('keeps the outdated banner when a later localStatus request fails', async () => {
    let statusCalls = 0;
    answer({
      localDetail: localDetail(),
      localStatus: () => {
        statusCalls += 1;
        if (statusCalls === 1) return fresh(true);
        throw new Error('rpc unavailable');
      },
      localDiff: []
    });
    renderDetail();

    expect(await screen.findByRole('status', { name: 'Review outdated' })).toBeTruthy();
    // Step past the status-check throttle so the focus event issues a second request.
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 61_000);
    fireEvent.focus(window);
    expect(await screen.findByText(/Could not check checkout status: rpc unavailable/)).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Review outdated' })).toBeTruthy();
  });

  it('warns when the working tree changed and reruns with the reviewed scope', async () => {
    answer({ localDetail: localDetail(), localStatus: fresh(true), localDiff: [], startLocalReview: { id: 'rev-3' } });
    renderDetail();

    const banner = await screen.findByRole('status', { name: 'Review outdated' });
    expect(within(banner).getByText('Working tree changed since this review')).toBeTruthy();
    expect(within(banner).getByText('ddddddd')).toBeTruthy();
    expect(within(banner).getByText('eeeeeee')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Review outdated — Rerun' }));

    await waitFor(() => expect(calls('startLocalReview')).toEqual([{ projectId: 'app', worktreePath: '/work/app', scope: 'branch', base: 'origin/main', intent: 'Add login' }]));
  });

  it('asks before fixing a changed checkout, then offers a re-review', async () => {
    const toThread = vi.fn();
    sdk.toThread = toThread;
    answer({
      localDetail: localDetail(),
      localStatus: fresh(true),
      localDiff: [],
      localFix: (args: Record<string, unknown>) =>
        args.force ? { needsConfirmation: false, threadId: 'fix-1', priority: 1, model: { providerId: 'cursor', model: 'a' }, usedFallback: false } : { needsConfirmation: true, reason: 'Files changed since this review.' },
      startLocalReview: { id: 'rev-3' }
    });
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Fix with agent' }));
    const confirm = await screen.findByRole('group', { name: 'Confirm fix' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Fix anyway' }));

    expect(await screen.findByText(/A fix agent is editing this checkout/)).toBeTruthy();
    expect(calls('localFix')).toEqual([
      { reviewId: 'rev-2', findingIds: [], force: false },
      { reviewId: 'rev-2', findingIds: [], force: true }
    ]);
    expect(toThread).toHaveBeenCalledWith('fix-1');
    fireEvent.click(screen.getByRole('button', { name: 'Re-review' }));
    await waitFor(() => expect(calls('startLocalReview')).toHaveLength(1));
  });

  it('starts Deep Review for the selected findings and deletes a review after confirming', async () => {
    const data = localDetail({ findings: [finding({ reviewId: 'rev-2' }), finding({ id: 'f2', reviewId: 'rev-2', line: 20, description: 'Second' })] });
    answer({
      localDetail: data,
      localStatus: fresh(),
      localDiff: [],
      localDeepReview: { threadId: 'deep-1', priority: 1, model: { providerId: 'cursor', model: 'a' }, usedFallback: false },
      deleteLocalReview: { ok: true }
    });
    renderDetail();

    fireEvent.click((await screen.findAllByRole('checkbox', { name: /Select finding/ }))[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Deep Review (1 selected)' }));
    await waitFor(() => expect(calls('localDeepReview')).toEqual([{ reviewId: 'rev-2', findingIds: ['f2'] }]));
    expect(await screen.findByText('Deep Review thread started. Find it in your thread list.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete review' }));
    expect(screen.getByText('Delete this review and its snapshot?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls('deleteLocalReview')).toEqual([{ reviewId: 'rev-2' }]));
  });

  it('does not send an empty selection as "fix everything" when every finding is deselected', async () => {
    answer({ localDetail: localDetail(), localStatus: fresh(), localDiff: [] });
    renderDetail();

    const boxes = await screen.findAllByRole('checkbox', { name: /Select finding/ });
    fireEvent.click(boxes[0]);
    expect((screen.getByRole('button', { name: 'Fix with agent' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Deep Review in thread' }) as HTMLButtonElement).disabled).toBe(true);
    expect(calls('localFix')).toHaveLength(0);
  });

  it('keeps showing an in-flight review while an older one is selected', async () => {
    const running = detail('running');
    const runningReview = { ...running.review!, id: 'rev-3', prId: TARGET_ID, targetKind: 'local' as const };
    const completedOld = localDetail({ review: { ...localDetail().review!, id: 'rev-1' } });
    answer({
      localDetail: (args: Record<string, unknown>) =>
        args.reviewId === 'rev-1'
          ? { ...completedOld, review: { ...completedOld.review!, id: 'rev-1' }, latestAttempt: runningReview, latestRuns: running.runs }
          : { ...localDetail(), latestAttempt: runningReview, latestRuns: running.runs },
      localStatus: fresh(),
      localDiff: []
    });
    renderDetail();

    const history = await screen.findByText('History (2)').then((el) => el.closest('details')!);
    fireEvent.click(within(history).getByRole('button', { name: 'View' }));
    await waitFor(() => expect(calls('localDetail').at(-1)).toEqual({ targetId: TARGET_ID, reviewId: 'rev-1' }));

    expect(await screen.findByText(/Review running · 1\/3 model\(s\) done/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel review' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Review changes' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows progress with a cancel action while a review runs', async () => {
    const running = detail('running');
    answer({ localDetail: localDetail({ review: { ...running.review!, id: 'rev-2', prId: TARGET_ID, targetKind: 'local' }, runs: running.runs, findings: [] }), cancelReview: { cancelled: true } });
    renderDetail();

    expect(await screen.findByText(/Review running · 1\/3 model\(s\) done/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Review changes' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel review' }));
    await waitFor(() => expect(calls('cancelReview')).toEqual([{ reviewId: 'rev-2' }]));
    expect(calls('localStatus')).toHaveLength(0);
  });

  it('shows the displayed review runs in the Models tab and avoids showing latest attempt errors', async () => {
    const rev2 = localDetail();
    const rev1Runs = [
      { id: 'run-1', reviewId: 'rev-1', providerId: 'claude', model: 'opus', status: 'completed' as const, startedAt: NOW - 3600000, completedAt: NOW - 3590000, riskScore: 8, coverageScore: null, coverageNote: null, requirementsScore: null, requirementsNote: null, simplicityScore: null, simplicityNote: null, stabilityScore: null, stabilityNote: null, issueCount: 4, summary: 'Older run', error: null, threadId: null },
      { id: 'run-2', reviewId: 'rev-1', providerId: 'openai', model: 'gpt-4', status: 'completed' as const, startedAt: NOW - 3600000, completedAt: NOW - 3590000, riskScore: 8, coverageScore: null, coverageNote: null, requirementsScore: null, requirementsNote: null, simplicityScore: null, simplicityNote: null, stabilityScore: null, stabilityNote: null, issueCount: 4, summary: 'Older run 2', error: null, threadId: null }
    ];
    answer({
      localDetail: (args: Record<string, unknown>) =>
        args.reviewId === 'rev-1'
          ? { ...rev2, review: { ...rev2.review!, id: 'rev-1', status: 'completed' as const }, runs: rev1Runs, latestAttempt: { ...rev2.review!, id: 'rev-2', status: 'failed' as const, error: 'boom' }, latestRuns: rev2.runs }
          : rev2,
      localStatus: fresh(),
      localDiff: []
    });
    renderDetail();

    const history = await screen.findByText('History (2)').then((el) => el.closest('details')!);
    fireEvent.click(within(history).getByRole('button', { name: 'View' }));
    await waitFor(() => expect(calls('localDetail').at(-1)).toEqual({ targetId: TARGET_ID, reviewId: 'rev-1' }));

    const modelsTab = await screen.findByRole('tab', { name: 'Models (2)' });
    expect(modelsTab).toBeTruthy();
    fireEvent.click(modelsTab);
    expect(await screen.findByText('claude/opus')).toBeTruthy();
    expect(screen.getByText('openai/gpt-4')).toBeTruthy();
    expect(screen.queryByText(/Review failed after/)).toBeNull();
  });

  it('disables rerun and review actions when the checkout is missing', async () => {
    answer({
      localDetail: localDetail(),
      localStatus: { reviewId: 'rev-2', stale: true, missing: true, reviewedTree: 'd'.repeat(40), currentTree: null },
      localDiff: []
    });
    renderDetail();

    expect(await screen.findByText(/This checkout can no longer be read/)).toBeTruthy();
    const rerunButton = screen.getByRole('button', { name: 'Review outdated — Rerun' }) as HTMLButtonElement;
    expect(rerunButton.disabled).toBe(true);
    const reviewChanges = screen.getByRole('button', { name: 'Review changes' }) as HTMLButtonElement;
    expect(reviewChanges.disabled).toBe(true);
  });
});
