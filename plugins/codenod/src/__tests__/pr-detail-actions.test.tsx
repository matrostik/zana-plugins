// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrDetail } from '../app/PrDetail.tsx';
import type { PrDetail as PrDetailData } from '../server/views.ts';
import { detail, finding, NOW } from './pr-fixtures.ts';

const sdk = vi.hoisted(() => ({
  toThread: undefined as undefined | ((threadId: string) => void),
  requestApproval: vi.fn()
}));

vi.mock('@zana-ai/zcc-plugin-sdk/app', async (importActual) => ({
  ...(await importActual<Record<string, unknown>>()),
  useZccNavigate: () => (sdk.toThread ? { toThread: sdk.toThread } : {}),
  experimental_requestApproval: sdk.requestApproval
}));

type Handler = (args: Record<string, unknown>) => unknown;

function makeRpc(data: PrDetailData | Error, handlers: Record<string, Handler> = {}) {
  return vi.fn(async (method: string, args?: unknown) => {
    if (method === 'detail') {
      if (data instanceof Error) throw data;
      return data;
    }
    if (method === 'refreshPullRequest' && !handlers[method]) return null;
    const handler = handlers[method];
    if (!handler) throw new Error(`unexpected rpc ${method}`);
    return handler((args ?? {}) as Record<string, unknown>);
  });
}

function renderDetail(call: ReturnType<typeof makeRpc>, options: { hasModels?: boolean; onOpenSettings?: () => void } = {}) {
  return render(
    <PrDetail
      rpc={{ call }}
      pluginId="codenod"
      prId="github.com/acme/api#1"
      defaultModels={[{ providerId: 'cursor', model: 'a' }]}
      hasModels={options.hasModels ?? true}
      onOpenSettings={options.onOpenSettings ?? (() => {})}
    />
  );
}

function completedWithFindings(): PrDetailData {
  const data = detail('completed', { createdAt: NOW - 60_000, completedAt: NOW });
  data.findings = [finding(), finding({ id: 'f2', severity: 'low', line: null, description: 'Unused import', suggestion: null, agreedBy: ['cursor/a'], postedAt: 1 })];
  return data;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  sdk.toThread = undefined;
  sdk.requestApproval.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PrDetail loading and setup', () => {
  it('shows the load error instead of the page', async () => {
    renderDetail(makeRpc(new Error('network down')));
    expect(await screen.findByText('network down')).toBeTruthy();
  });

  it('asks to choose models when none are configured', async () => {
    const onOpenSettings = vi.fn();
    const data = detail('completed');
    data.review = null;
    renderDetail(makeRpc(data), { hasModels: false, onOpenSettings });
    expect(await screen.findByText('Not reviewed yet.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Review' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Choose models' }));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('ignores a detail response for a pull request that is no longer selected', async () => {
    let resolveFirst: (value: PrDetailData) => void = () => undefined;
    const first = new Promise<PrDetailData>((resolve) => (resolveFirst = resolve));
    const second = detail('completed');
    second.pr = { ...second.pr, id: 'github.com/acme/api#2', number: 2, title: 'Second change' };
    const call = vi.fn(async (method: string, args?: unknown) => {
      if (method !== 'detail') throw new Error(`unexpected rpc ${method}`);
      return String((args as { prId?: string }).prId).endsWith('#1') ? first : second;
    });
    const view = render(
      <PrDetail rpc={{ call }} pluginId="codenod" prId="github.com/acme/api#1" defaultModels={[]} hasModels onOpenSettings={() => undefined} />
    );
    view.rerender(
      <PrDetail rpc={{ call }} pluginId="codenod" prId="github.com/acme/api#2" defaultModels={[]} hasModels onOpenSettings={() => undefined} />
    );

    expect(await screen.findByRole('heading', { name: 'Second change' })).toBeTruthy();
    const stale = detail('completed');
    stale.pr = { ...stale.pr, title: 'First wins' };
    resolveFirst(stale);
    await Promise.resolve();

    expect(screen.queryByRole('heading', { name: 'First wins' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Second change' })).toBeTruthy();
  });
});

describe('PrDetail review actions', () => {
  it('clears accepted review results immediately and ignores an older refresh response', async () => {
    const old = Object.assign(completedWithFindings(), { latestAttempt: { ...detail('failed').review!, id: 'failed-rerun' } });
    const next = detail('running');
    next.review!.id = 'next';
    next.findings = [];
    let releaseOld!: (value: PrDetailData) => void;
    let releaseNext!: (value: PrDetailData) => void;
    const delayedOld = new Promise<PrDetailData>((resolve) => { releaseOld = resolve; });
    const delayedNext = new Promise<PrDetailData>((resolve) => { releaseNext = resolve; });
    let loads = 0;
    const call = vi.fn(async (method: string) => {
      if (method === 'listPrompts') return { prompts: [], defaultPromptId: null };
      if (method === 'refreshPullRequest') return null;
      if (method === 'startReview') return next.review;
      if (method === 'detail') { loads++; return loads === 1 ? old : loads === 2 ? delayedOld : delayedNext; }
      throw new Error(`Unexpected ${method}`);
    });
    renderDetail(call);
    await screen.findByText('Null token crashes login');
    expect(screen.getByText(/Latest rerun failed/)).toBeTruthy();
    await waitFor(() => expect(loads).toBe(2));
    fireEvent.click(screen.getByRole('button', { name: 'Re-review' }));
    await screen.findByRole('button', { name: 'Cancel review' });
    expect(screen.queryByText(/Latest rerun failed/)).toBeNull();
    expect(screen.queryByText('Null token crashes login')).toBeNull();
    expect(screen.queryByText('Looks fine')).toBeNull();
    await act(async () => { releaseOld(old); });
    expect(screen.queryByText('Null token crashes login')).toBeNull();
    await act(async () => { releaseNext(next); });
    expect(screen.getByText(/Review running/)).toBeTruthy();
  });
  it('replaces the model results with the latest runs when starting a re-review', async () => {
    const data = completedWithFindings();
    data.runs[0].summary = 'Previous model result';
    const call = makeRpc(data, {
      startReview: () => {
        data.review = { ...detail('running').review!, id: 'rerun' };
        data.runs = detail('running').runs.slice(1).map((run) => ({ ...run, id: `rerun-${run.id}`, reviewId: 'rerun' }));
        data.findings = [];
        return data.review;
      }
    });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('tab', { name: 'Models (3)' }));
    expect(screen.getByText('Previous model result')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Re-review' }));
    await screen.findByRole('button', { name: 'Cancel review' });
    expect(screen.getByRole('tab', { name: 'Models (2)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Models (2)' }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('running')).toBeTruthy();
    expect(within(table).getByText('queued')).toBeTruthy();
    expect(within(table).queryByText('completed')).toBeNull();
    expect(within(table).queryByText('Previous model result')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Findings/ }));
    expect(screen.queryByText('Null token crashes login')).toBeNull();
  });

  it('checks the selected PR for new commits once on opening', async () => {
    const call = makeRpc(detail('completed'), { refreshPullRequest: () => null });
    renderDetail(call);
    await screen.findByText('Looks fine');
    await waitFor(() => expect(call).toHaveBeenCalledWith('refreshPullRequest', { prId: 'github.com/acme/api#1' }));
    expect(call.mock.calls.filter(([method]) => method === 'refreshPullRequest')).toHaveLength(1);
  });

  it('shows one cancellation notice without previous completed findings', async () => {
    const data = detail('cancelled');
    data.findings = [];
    renderDetail(makeRpc(data));
    expect(await screen.findByText('Review cancelled.')).toBeTruthy();
    expect(screen.queryByText('Null token crashes login')).toBeNull();
  });

  it.each(['failed', 'cancelled'] as const)('shows a %s rerun notice with completed findings on the same commit', async (status) => {
    const data = Object.assign(completedWithFindings(), {
      latestAttempt: { ...detail(status, { createdAt: NOW - 20_000, completedAt: NOW }).review!, id: 'rerun' }
    });
    renderDetail(makeRpc(data));
    const message = status === 'failed' ? 'Latest rerun failed after 20s: boom. Showing the previous completed review.' : 'Latest rerun cancelled. Showing the previous completed review.';
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText('Looks fine')).toBeTruthy();
    expect(screen.getByText('Null token crashes login')).toBeTruthy();
    expect(screen.queryByRole('status', { name: 'Review outdated' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Post 1 finding to GitHub' })).toBeTruthy();
  });

  it('cancels the active rerun', async () => {
    const data = detail('running');
    data.review!.id = 'rerun';
    const call = makeRpc(data, { cancelReview: () => null });
    renderDetail(call);
    expect(await screen.findByText(/Review running/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel review' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('cancelReview', { reviewId: 'rerun' }));
  });

  it('shows both commits and reruns an outdated review', async () => {
    const data = completedWithFindings();
    data.pr.headSha = '8e87eeb123456';
    data.review!.headSha = '7fd6f06123456';
    data.review!.stale = true;
    const call = makeRpc(data, { startReview: () => null });
    renderDetail(call);
    const banner = await screen.findByRole('status', { name: 'Review outdated' });
    expect(banner.textContent).toContain('7fd6f06');
    expect(banner.textContent).toContain('8e87eeb');
    fireEvent.click(screen.getByRole('button', { name: 'Review outdated — Rerun' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('startReview', { prId: data.pr.id }));

  });

  it('starts a review with the default models', async () => {
    const data = detail('completed');
    data.review = null;
    const call = makeRpc(data, { startReview: () => null });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('startReview', { prId: 'github.com/acme/api#1' }));
  });

  it('starts a review with models chosen in the picker', async () => {
    const call = makeRpc(detail('completed'), {
      availableModels: () => [{ providerId: 'cursor', displayName: 'Cursor', error: null, models: [{ id: 'a', label: 'a', reasoningLevels: [] }] }],
      startReview: () => null
    });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('button', { name: 'Models…' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review with 1 model' }));
    await waitFor(() =>
      expect(call).toHaveBeenCalledWith('startReview', { prId: 'github.com/acme/api#1', models: [{ providerId: 'cursor', model: 'a' }] })
    );
  });

  it('closes the picker on cancel and reports picker load errors', async () => {
    renderDetail(makeRpc(detail('completed'), { availableModels: () => Promise.reject(new Error('no providers')) }));
    fireEvent.click(await screen.findByRole('button', { name: 'Models…' }));
    expect(await screen.findByText('no providers')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows an error when starting a review fails', async () => {
    renderDetail(makeRpc(detail('completed'), { startReview: () => Promise.reject(new Error('quota exceeded')) }));
    fireEvent.click(await screen.findByRole('button', { name: 'Re-review' }));
    expect(await screen.findByText('quota exceeded')).toBeTruthy();
  });

  it('cancels a running review', async () => {
    const call = makeRpc(detail('running'), { cancelReview: () => null });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel review' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('cancelReview', { reviewId: 'rev' }));
  });

  it('opens Deep Review in a thread when navigation is available', async () => {
    sdk.toThread = vi.fn();
    renderDetail(makeRpc(detail('completed'), { deepReview: () => ({ threadId: 't1' }) }));
    fireEvent.click(await screen.findByRole('button', { name: 'Deep Review in thread' }));
    await waitFor(() => expect(sdk.toThread).toHaveBeenCalledWith('t1'));
  });

  it('tells the user where Deep Review went without navigation', async () => {
    renderDetail(makeRpc(detail('completed'), { deepReview: () => ({ threadId: 't1' }) }));
    fireEvent.click(await screen.findByRole('button', { name: 'Deep Review in thread' }));
    expect(await screen.findByText('Deep Review thread started. Find it in your thread list.')).toBeTruthy();
  });

  it('keeps Deep Review untargeted for default post selection, but targets custom subset', async () => {
    const data = completedWithFindings();
    data.findings.push(finding({ id: 'f3', file: 'src/other.ts', line: null, description: 'Other issue', agreedBy: ['cursor/a'] }));
    const call = makeRpc(data, { deepReview: () => ({ threadId: 't1' }) });
    renderDetail(call);

    // Default post selection is [f1, f3], so Deep Review is untargeted
    const deepReviewBtn = await screen.findByRole('button', { name: 'Deep Review in thread' });
    expect(deepReviewBtn).toBeTruthy();

    // Now clear selection and select only f1
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select finding in src/login.ts:12' }));

    // Now selection is [f1], which is a custom subset -> targeted button
    expect(await screen.findByRole('button', { name: 'Deep Review (1 selected)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Deep Review (1 selected)' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('deepReview', { prId: 'github.com/acme/api#1', findingIds: ['f1'] }));
  });

  it('targets the explicitly selected remaining findings even when they match the default post selection', async () => {
    const call = makeRpc(completedWithFindings(), { deepReview: () => ({ threadId: 't1' }) });
    renderDetail(call);

    fireEvent.click(await screen.findByRole('button', { name: 'Clear selection' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select finding in src/login.ts:12' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Deep Review (1 selected)' }));

    await waitFor(() => expect(call).toHaveBeenCalledWith('deepReview', { prId: 'github.com/acme/api#1', findingIds: ['f1'] }));
  });
});

describe('PrDetail findings and posting', () => {
  it('shows model attribution, selects eligible findings, and dismisses', async () => {
    const call = makeRpc(completedWithFindings(), { dismissFinding: () => null });
    renderDetail(call);
    expect(await screen.findByText('Null token crashes login')).toBeTruthy();
    expect(screen.getByText('Line 12')).toBeTruthy();
    expect(screen.getByText('Posted')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Post 1 finding to GitHub' })).toBeTruthy();
    expect(screen.getByText('Flagged by: cursor/a, cursor/b')).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    const card = screen.getByRole('article', { name: 'Finding in src/login.ts:12' });
    expect(card.querySelector('.cn-finding-head')?.firstElementChild?.className).toContain('cn-finding-select');
    expect((screen.getByRole('checkbox', { name: 'Select finding in src/login.ts' }) as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Select all issues' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Clear selection' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'Deselect all issues' })).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
    await waitFor(() => expect(call).toHaveBeenCalledWith('dismissFinding', { findingId: 'f1', dismissed: true }));
  });

  it('posts only explicitly selected findings', async () => {
    const data = completedWithFindings();
    data.findings.push(finding({ id: 'f3', file: 'src/other.ts', description: 'Other issue', agreedBy: ['cursor/a'] }));
    const call = makeRpc(data, { post: () => ({ url: null, commentCount: 1 }) });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select finding in src/login.ts:12' }));
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 finding to GitHub' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('post', expect.objectContaining({ findingIds: ['f3'] })));
  });

  it('posts selected findings even when they were already posted', async () => {
    const data = completedWithFindings();
    data.findings.push(finding({ id: 'f3', file: 'src/other.ts', description: 'Other issue' }));
    const call = makeRpc(data, { post: () => ({ url: null, commentCount: 3 }) });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('button', { name: 'Select all issues' }));
    fireEvent.click(screen.getByRole('button', { name: 'Post 3 findings to GitHub' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('post', expect.objectContaining({ findingIds: ['f1', 'f2', 'f3'] })));
  });

  it('enables the post button and updates the count when manually selecting a previously posted finding', async () => {
    const data = completedWithFindings();
    data.findings[0] = { ...data.findings[0], postedAt: 100 };
    const call = makeRpc(data, { post: () => ({ url: null, commentCount: 1 }) });
    renderDetail(call);
    const postBtn = await screen.findByRole('button', { name: 'Post 0 findings to GitHub' });
    expect((postBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select finding in src/login.ts' }));

    const enabledBtn = screen.getByRole('button', { name: 'Post 1 finding to GitHub' });
    expect((enabledBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(enabledBtn);
    await waitFor(() => expect(call).toHaveBeenCalledWith('post', expect.objectContaining({ findingIds: ['f2'] })));
  });

  it('preserves selected posted findings across background detail reloads', async () => {
    let resolveRefresh!: () => void;
    const refreshPromise = new Promise<void>((resolve) => { resolveRefresh = resolve; });
    const data = completedWithFindings();
    data.findings[0] = { ...data.findings[0], postedAt: 100 };
    const call = vi.fn(async (method: string) => {
      if (method === 'detail') return data;
      if (method === 'refreshPullRequest') {
        await refreshPromise;
        return null;
      }
      throw new Error(`Unhandled RPC: ${method}`);
    });
    renderDetail(call);
    const checkbox = await screen.findByRole('checkbox', { name: 'Select finding in src/login.ts' });
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    resolveRefresh();
    await waitFor(() => expect(call.mock.calls.filter(([m]) => m === 'detail')).toHaveLength(2));
    expect((screen.getByRole('checkbox', { name: 'Select finding in src/login.ts' }) as HTMLInputElement).checked).toBe(true);
  });

  it('auto-selects findings when a review opened while running completes', async () => {
    let resolveRefresh!: () => void;
    const refreshPromise = new Promise<void>((resolve) => { resolveRefresh = resolve; });
    const runningData = detail('running');
    const completedData = completedWithFindings();
    let isCompleted = false;

    const call = vi.fn(async (method: string) => {
      if (method === 'detail') return isCompleted ? completedData : runningData;
      if (method === 'refreshPullRequest') {
        await refreshPromise;
        isCompleted = true;
        return null;
      }
      throw new Error(`Unhandled RPC: ${method}`);
    });

    renderDetail(call);
    expect(await screen.findByText('Findings appear when the review completes.')).toBeTruthy();

    resolveRefresh();
    await waitFor(() => expect(call.mock.calls.filter(([m]) => m === 'detail')).toHaveLength(2));
    const checkbox = await screen.findByRole('checkbox', { name: 'Select finding in src/login.ts:12' });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('button', { name: 'Post 1 finding to GitHub' })).toBeTruthy();
  });

  it('deselects already-posted findings after re-posting them', async () => {
    const data = completedWithFindings();
    data.findings[0] = { ...data.findings[0], postedAt: 100 };
    let posted = false;
    const call = vi.fn(async (method: string, args?: unknown) => {
      if (method === 'detail') {
        if (!posted) return data;
        return {
          ...data,
          findings: data.findings.map((item) => (item.id === 'f2' ? { ...item, postedAt: 200 } : item))
        };
      }
      if (method === 'post') {
        posted = true;
        return { url: null, commentCount: 1 };
      }
      if (method === 'refreshPullRequest') return null;
      throw new Error(`Unhandled RPC: ${method}`);
    });

    renderDetail(call);
    const checkbox = await screen.findByRole('checkbox', { name: 'Select finding in src/login.ts' });
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    const postBtn = screen.getByRole('button', { name: 'Post 1 finding to GitHub' });
    fireEvent.click(postBtn);

    await waitFor(() => expect(call).toHaveBeenCalledWith('post', expect.objectContaining({ findingIds: ['f2'] })));
    await waitFor(() => {
      const updatedCheckbox = screen.getByRole('checkbox', { name: 'Select finding in src/login.ts' });
      expect((updatedCheckbox as HTMLInputElement).checked).toBe(false);
    });
    expect(screen.getByRole('button', { name: 'Post 0 findings to GitHub' })).toBeTruthy();
  });

  it('copies selected findings as a prompt', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderDetail(makeRpc(completedWithFindings()));
    fireEvent.click(await screen.findByRole('button', { name: 'Copy 1 selected as prompt' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Review findings for acme/api#1: Add login')));
    expect(await screen.findByText('Copied 1 finding as a prompt.')).toBeTruthy();
  });

  it('uses the synchronous document copy command before the async Clipboard API', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    const execCommand = vi.fn(() => {
      expect(document.activeElement?.tagName).toBe('TEXTAREA');
      return true;
    });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    renderDetail(makeRpc(completedWithFindings()));
    fireEvent.click(await screen.findByRole('button', { name: 'Copy 1 selected as prompt' }));
    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'));
    expect(writeText).not.toHaveBeenCalled();
    expect(await screen.findByText('Copied 1 finding as a prompt.')).toBeTruthy();
  });

  it('falls back to the Clipboard API when the synchronous document copy command throws', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const execCommand = vi.fn(() => {
      throw new Error('execCommand copy failed');
    });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    renderDetail(makeRpc(completedWithFindings()));
    fireEvent.click(await screen.findByRole('button', { name: 'Copy 1 selected as prompt' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(await screen.findByText('Copied 1 finding as a prompt.')).toBeTruthy();
  });

  it('selects and deselects all active findings regardless of filters', async () => {
    const data = completedWithFindings();
    data.findings.push(finding({ id: 'f3', file: 'src/other.ts', description: 'Other issue' }));
    renderDetail(makeRpc(data));
    const boxes = await screen.findAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(boxes.every((box) => !(box as HTMLInputElement).checked)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Select all issues' }));
    expect(boxes.every((box) => (box as HTMLInputElement).checked)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(boxes.every((box) => !(box as HTMLInputElement).checked)).toBe(true);
  });

  it('disables select visible and select all issues when all matching findings are selected', async () => {
    const data = completedWithFindings();
    data.findings.push(finding({ id: 'f3', file: 'src/other.ts', description: 'Other issue' }));
    renderDetail(makeRpc(data));
    const selectAllBtn = await screen.findByRole('button', { name: 'Select all issues' });
    const selectVisibleBtn = screen.getByRole('button', { name: 'Select visible' });
    expect((selectAllBtn as HTMLButtonElement).disabled).toBe(false);
    expect((selectVisibleBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(selectAllBtn);
    expect((selectAllBtn as HTMLButtonElement).disabled).toBe(true);
    expect((selectVisibleBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect((selectVisibleBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(selectVisibleBtn);
    expect((selectVisibleBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('posts only unposted findings matching both filters, even inside collapsed files', async () => {
    const data = completedWithFindings();
    data.findings.push(finding({ id: 'f3', severity: 'medium', category: 'security', file: 'src/auth.ts', description: 'Unsafe redirect' }));
    const call = makeRpc(data, { post: () => ({ url: null, commentCount: 1 }) });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('button', { name: 'Warning (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Security (1)' }));
    expect(screen.queryByText('Null token crashes login')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 finding to GitHub' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('post', expect.objectContaining({ findingIds: ['f3'] })));
  });

  it('dismisses only filtered findings and offers undo for the same IDs', async () => {
    const data = completedWithFindings();
    data.findings.push(finding({ id: 'f3', severity: 'medium', description: 'Warning finding' }));
    const call = makeRpc(data, { setFindingsDismissed: () => null });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('button', { name: 'Warning (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss 1 filtered finding' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('setFindingsDismissed', { reviewId: 'rev', findingIds: ['f3'], dismissed: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('setFindingsDismissed', { reviewId: 'rev', findingIds: ['f3'], dismissed: false }));
  });

  it('saves issue and suggestion edits, keeps errors visible, and leaves posted findings read-only', async () => {
    const data = completedWithFindings();
    const call = makeRpc(data, { editFinding: () => { throw new Error('Save failed'); } });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit finding in src/login.ts:12' }));
    fireEvent.change(screen.getByLabelText('Issue'), { target: { value: 'Revised issue' } });
    fireEvent.change(screen.getByLabelText('Suggestion (optional)'), { target: { value: 'Revised fix' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Save failed')).toBeTruthy();
    expect(call).toHaveBeenCalledWith('editFinding', { reviewId: 'rev', findingId: 'f1', description: 'Revised issue', suggestion: 'Revised fix' });
    expect(screen.getByLabelText('Issue')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: 'Edit finding in src/login.ts' })).toBeNull();
  });

  it('expands the first three files and shows numbered context with the target highlighted', async () => {
    const data = detail('completed');
    data.findings = [0, 1, 2, 3].map((i) => finding({ id: `f${i}`, file: `src/${i}.ts`, line: 12, description: `Issue ${i}` }));
    renderDetail(makeRpc(data, { diff: () => [{ path: 'src/0.ts', patch: '@@ -10,3 +10,3 @@\n before\n-old\n+new\n after' }] }));
    expect(await screen.findByText('Issue 0')).toBeTruthy();
    expect(screen.getByText('Issue 2')).toBeTruthy();
    expect(screen.queryByText('Issue 3')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Expand src\/3.ts/ }));
    expect(screen.getByText('Issue 3')).toBeTruthy();
    const target = await screen.findByText('after');
    expect(target.closest('[data-target="true"]')?.textContent).toContain('12');
  });

  it('shows the empty findings message for a clean review', async () => {
    renderDetail(makeRpc(detail('completed')));
    expect(await screen.findByText('No issues found.')).toBeTruthy();
  });

  it('drops findings that were posted and keeps findings the payload left out', async () => {
    const data = detail('completed', { createdAt: NOW - 60_000, completedAt: NOW });
    data.findings = [finding({ id: 'f1' }), finding({ id: 'f2', line: null, description: 'Still open' })];
    let posted = false;
    const call = vi.fn(async (method: string, args?: unknown) => {
      if (method === 'detail') {
        if (!posted) return data;
        return { ...data, findings: data.findings.map((item) => (item.id === 'f1' ? { ...item, postedAt: 5 } : item)) };
      }
      if (method === 'post') {
        posted = true;
        return { url: 'https://x', commentCount: 1 };
      }
      throw new Error(`unexpected rpc ${method} ${JSON.stringify(args)}`);
    });
    renderDetail(call);
    fireEvent.click(await screen.findByRole('button', { name: 'Post 2 findings to GitHub' }));
    expect(await screen.findByRole('button', { name: 'Post 1 finding to GitHub' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 finding to GitHub' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('post', expect.objectContaining({ findingIds: ['f2'] })));
  });

  it('posts selected findings as a comment with a message', async () => {
    const call = makeRpc(completedWithFindings(), { post: () => ({ url: 'https://x', commentCount: 1 }) });
    renderDetail(call);
    fireEvent.change(await screen.findByLabelText('Message (optional)'), { target: { value: 'Nice work' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 finding to GitHub' }));
    expect(await screen.findByText('Posted to GitHub (1 inline comment).')).toBeTruthy();
    expect(call).toHaveBeenCalledWith('post', { reviewId: 'rev', findingIds: ['f1'], event: 'COMMENT', body: 'Nice work', approvalToken: undefined });
  });

  it('requires signed approval before approving', async () => {
    sdk.requestApproval.mockResolvedValue({ approved: true, token: 'tok' });
    const call = makeRpc(completedWithFindings(), {
      approvalBinding: () => ({ binding: true }),
      post: () => ({ url: null, commentCount: 2 })
    });
    renderDetail(call);
    fireEvent.change(await screen.findByLabelText('Post as'), { target: { value: 'APPROVE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 finding to GitHub' }));
    expect(await screen.findByText('Posted to GitHub (2 inline comments).')).toBeTruthy();
    expect(sdk.requestApproval).toHaveBeenCalledWith('codenod', expect.objectContaining({ confirmLabel: 'Approve', tone: 'default' }));
    expect(call).toHaveBeenCalledWith('post', expect.objectContaining({ event: 'APPROVE', approvalToken: 'tok' }));
  });

  it('does not post when signed approval is unavailable or declined', async () => {
    sdk.requestApproval.mockResolvedValueOnce({ approved: false, reason: 'unavailable' }).mockResolvedValueOnce({ approved: false });
    const call = makeRpc(completedWithFindings(), { approvalBinding: () => ({}) });
    renderDetail(call);
    fireEvent.change(await screen.findByLabelText('Post as'), { target: { value: 'REQUEST_CHANGES' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 finding to GitHub' }));
    expect(await screen.findByText('Signed confirmation is only available in the Zana desktop app.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 finding to GitHub' }));
    expect(await screen.findByText('Not posted.')).toBeTruthy();
    expect(call).not.toHaveBeenCalledWith('post', expect.anything());
  });

  it('warns about stale reviews and blocks approving them', async () => {
    const data = completedWithFindings();
    data.review!.stale = true;
    renderDetail(makeRpc(data));
    expect(await screen.findByRole('status', { name: 'Review outdated' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Post as'), { target: { value: 'APPROVE' } });
    expect((screen.getByRole('button', { name: 'Post 1 finding to GitHub' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('PrDetail models and diff tabs', () => {
  it('shows run notes and opens a model thread', async () => {
    sdk.toThread = vi.fn();
    const data = detail('completed', { createdAt: NOW - 60_000, completedAt: NOW });
    data.runs[0] = { ...data.runs[0], threadId: 'run-thread', summary: 'All good' };
    data.runs[1] = { ...data.runs[1], status: 'failed', error: 'timed out' };
    renderDetail(makeRpc(data));
    fireEvent.click(await screen.findByRole('tab', { name: /Models/ }));
    expect(screen.getByText('All good')).toBeTruthy();
    expect(screen.getByText('timed out')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open thread' }));
    expect(sdk.toThread).toHaveBeenCalledWith('run-thread');
  });

  it('renders the diff with added, removed, and binary files', async () => {
    renderDetail(
      makeRpc(detail('completed'), {
        diff: () => [
          { path: 'src/login.ts', status: 'modified', additions: 1, deletions: 1, patch: '@@ -1 +1 @@\n-old\n+new\n same' },
          { path: 'logo.png', status: 'added', additions: 0, deletions: 0, patch: null }
        ]
      })
    );
    fireEvent.click(await screen.findByRole('tab', { name: 'Diff' }));
    const region = await screen.findByRole('region', { name: 'Diff of src/login.ts' });
    expect(region.querySelector('.cn-diff-add')?.textContent).toBe('+new');
    expect(region.querySelector('.cn-diff-del')?.textContent).toBe('-old');
    expect(region.querySelector('.cn-diff-hunk')).toBeTruthy();
    expect(screen.getByText('No textual diff (binary or too large).')).toBeTruthy();
  });

  it('reports diff load errors', async () => {
    renderDetail(makeRpc(detail('completed'), { diff: () => Promise.reject(new Error('diff unavailable')) }));
    fireEvent.click(await screen.findByRole('tab', { name: 'Diff' }));
    expect(await screen.findByText('diff unavailable')).toBeTruthy();
  });
});
