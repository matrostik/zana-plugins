// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrDetail } from '../app/PrDetail.tsx';
import type { PrDetail as PrDetailData } from '../server/views.ts';
import { detail, NOW } from './pr-fixtures.ts';

function renderDetail(data: PrDetailData) {
  return render(
    <PrDetail rpc={{ call: async () => data }} pluginId="codewink" prId={data.pr.id} defaultModels={[]} hasModels onOpenSettings={() => {}} />
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PrDetail review progress', () => {
  it('shows a loading ring and elapsed time while the review is running', async () => {
    renderDetail(detail('running', { createdAt: NOW - 84_000, completedAt: null }));
    const banner = await screen.findByRole('status');
    expect(banner.textContent).toContain('Review running · 1/3 model(s) done · 1m 24s');
    expect(banner.getAttribute('aria-busy')).toBe('true');
    expect(banner.querySelector('.cn-spinner')).toBeTruthy();
  });

  it('keeps the elapsed time ticking while the review runs', async () => {
    renderDetail(detail('running', { createdAt: NOW - 84_000, completedAt: null }));
    await screen.findByRole('status');
    vi.setSystemTime(NOW + 5_000);
    expect(await screen.findByText(/1m 29s/, undefined, { timeout: 2_500 })).toBeTruthy();
  });

  it('hides the loading ring and shows the total time after the review completes', async () => {
    const { container } = renderDetail(detail('completed', { createdAt: NOW - 130_000, completedAt: NOW }));
    expect(await screen.findByText('Looks fine')).toBeTruthy();
    expect(screen.getByText('Reviewed in 2m 10s')).toBeTruthy();
    expect(container.querySelector('.cn-spinner')).toBeNull();
  });

  it('shows how long a failed review ran', async () => {
    renderDetail(detail('failed', { createdAt: NOW - 72_000, completedAt: NOW }));
    expect(await screen.findByText('Review failed after 1m 12s: boom')).toBeTruthy();
  });
});

describe('PrDetail model timings', () => {
  it('shows each model run time in its own column', async () => {
    renderDetail(detail('running', { createdAt: NOW - 84_000, completedAt: null }));
    fireEvent.click(await screen.findByRole('tab', { name: /Models/ }));
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Time' })).toBeTruthy();
    const [, completedRow, runningRow, queuedRow] = within(table).getAllByRole('row');
    expect(within(completedRow).getByText('1m 05s')).toBeTruthy();
    expect(within(runningRow).getByText('1m 24s')).toBeTruthy();
    expect(within(queuedRow).getAllByText('–').length).toBeGreaterThan(0);
  });
});
