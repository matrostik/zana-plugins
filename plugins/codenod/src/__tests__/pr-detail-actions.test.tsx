// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});

describe('PrDetail findings and posting', () => {
  it('lists findings, toggles selection, and dismisses', async () => {
    const call = makeRpc(completedWithFindings(), { dismissFinding: () => null });
    renderDetail(call);
    expect(await screen.findByText('Null token crashes login')).toBeTruthy();
    expect(screen.getByText('src/login.ts:12')).toBeTruthy();
    expect(screen.getByText('Posted')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Post 1 selected' })).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Select finding in src/login.ts:12'));
    expect(screen.getByRole('button', { name: 'Post 0 selected' })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Select finding in src/login.ts:12'));
    expect(screen.getByRole('button', { name: 'Post 1 selected' })).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
    await waitFor(() => expect(call).toHaveBeenCalledWith('dismissFinding', { findingId: 'f1', dismissed: true }));
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
    fireEvent.click(await screen.findByRole('button', { name: 'Post 2 selected' }));
    expect(await screen.findByRole('button', { name: 'Post 1 selected' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 selected' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith('post', expect.objectContaining({ findingIds: ['f2'] })));
  });

  it('posts selected findings as a comment with a message', async () => {
    const call = makeRpc(completedWithFindings(), { post: () => ({ url: 'https://x', commentCount: 1 }) });
    renderDetail(call);
    fireEvent.change(await screen.findByLabelText('Message (optional)'), { target: { value: 'Nice work' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 selected' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 selected' }));
    expect(await screen.findByText('Posted to GitHub (2 inline comments).')).toBeTruthy();
    expect(sdk.requestApproval).toHaveBeenCalledWith('codenod', expect.objectContaining({ confirmLabel: 'Approve', tone: 'default' }));
    expect(call).toHaveBeenCalledWith('post', expect.objectContaining({ event: 'APPROVE', approvalToken: 'tok' }));
  });

  it('does not post when signed approval is unavailable or declined', async () => {
    sdk.requestApproval.mockResolvedValueOnce({ approved: false, reason: 'unavailable' }).mockResolvedValueOnce({ approved: false });
    const call = makeRpc(completedWithFindings(), { approvalBinding: () => ({}) });
    renderDetail(call);
    fireEvent.change(await screen.findByLabelText('Post as'), { target: { value: 'REQUEST_CHANGES' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 selected' }));
    expect(await screen.findByText('Signed confirmation is only available in the Zana desktop app.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Post 1 selected' }));
    expect(await screen.findByText('Not posted.')).toBeTruthy();
    expect(call).not.toHaveBeenCalledWith('post', expect.anything());
  });

  it('warns about stale reviews and blocks approving them', async () => {
    const data = completedWithFindings();
    data.review!.stale = true;
    renderDetail(makeRpc(data));
    expect(await screen.findByText('New commits were pushed after this review. Re-review before approving.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Post as'), { target: { value: 'APPROVE' } });
    expect((screen.getByRole('button', { name: 'Post 1 selected' }) as HTMLButtonElement).disabled).toBe(true);
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
