// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrList } from '../app/PrList.tsx';
import type { PrListItem } from '../server/views.ts';

function item(overrides: Partial<PrListItem>): PrListItem {
  return {
    id: 'github.com/acme/api#1',
    host: 'github.com',
    owner: 'acme',
    repo: 'api',
    number: 1,
    title: 'Add login',
    author: 'dev',
    url: 'https://github.com/acme/api/pull/1',
    state: 'open',
    isDraft: false,
    headSha: 'sha1',
    headRef: 'feat',
    baseRef: 'main',
    ciState: 'success',
    buckets: ['needs-review'],
    updatedAt: new Date().toISOString(),
    syncedAt: Date.now(),
    review: null,
    ...overrides
  };
}

const ITEMS = [
  item({}),
  item({ id: 'github.com/acme/web#2', repo: 'web', number: 2, title: 'Fix nav', isDraft: true, ciState: 'failure', buckets: ['needs-review', 'watched'], review: { id: 'r', status: 'completed', riskScore: 8, headSha: 'old', createdAt: 0, stale: true, findingCount: 3 } }),
  item({ id: 'github.com/acme/api#3', number: 3, title: 'My change', buckets: ['mine'] })
];

afterEach(cleanup);

describe('PrList', () => {
  it('shows counts, badges, and filters within the active tab', () => {
    const onQueryChange = vi.fn();
    const onSelect = vi.fn();
    const { rerender } = render(
      <PrList items={ITEMS} tab="needs-review" onTabChange={() => {}} query="" onQueryChange={onQueryChange} selectedId={null} onSelect={onSelect} hasWatchedRepos />
    );
    expect(screen.getByRole('tab', { name: /Needs my review/ }).textContent).toContain('2');
    expect(screen.getByRole('tab', { name: /Mine/ }).textContent).toContain('1');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(screen.getByText('CI failing')).toBeTruthy();
    expect(screen.getByText(/Risk 8 · 3 findings · stale/)).toBeTruthy();
    expect(screen.getByText('Not reviewed')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Filter pull requests'), { target: { value: 'nav' } });
    expect(onQueryChange).toHaveBeenCalledWith('nav');
    rerender(<PrList items={ITEMS} tab="needs-review" onTabChange={() => {}} query="nav" onQueryChange={onQueryChange} selectedId={null} onSelect={onSelect} hasWatchedRepos />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Fix nav/ }));
    expect(onSelect).toHaveBeenCalledWith('github.com/acme/web#2');
  });

  it('shows an amber outdated badge while the newer head is being reviewed', () => {
    const pr = item({
      outdated: true,
      review: { id: 'next', status: 'running', riskScore: null, headSha: 'sha1', createdAt: 0, stale: false, findingCount: 0 }
    });
    render(<PrList items={[pr]} tab="needs-review" onTabChange={() => {}} query="" onQueryChange={() => {}} selectedId={null} onSelect={() => {}} hasWatchedRepos />);
    expect(screen.getByText('Outdated').className).toContain('cn-badge-warn');
    expect(screen.getByText('Reviewing…')).toBeTruthy();
  });

  it('switches tabs and shows an empty state', () => {
    const onTabChange = vi.fn();
    render(<PrList items={[]} tab="watched" onTabChange={onTabChange} query="" onQueryChange={() => {}} selectedId={null} onSelect={() => {}} hasWatchedRepos />);
    expect(screen.getByText(/Press Refresh/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Mine/ }));
    expect(onTabChange).toHaveBeenCalledWith('mine');
  });

  it('shows a loading ring while a review is running', () => {
    const running = item({
      id: 'github.com/acme/api#9',
      number: 9,
      title: 'In progress',
      review: { id: 'r9', status: 'running', riskScore: null, headSha: 'sha1', createdAt: 0, stale: false, findingCount: 0 }
    });
    render(<PrList items={[running, ITEMS[1]]} tab="needs-review" onTabChange={() => {}} query="" onQueryChange={() => {}} selectedId={null} onSelect={() => {}} hasWatchedRepos />);
    expect(screen.getByText('Reviewing…').querySelector('.cn-spinner')).toBeTruthy();
    expect(screen.getByText(/Risk 8/).querySelector('.cn-spinner')).toBeNull();
  });

  it('asks the user to watch a repository when none are configured', () => {
    render(<PrList items={[]} tab="needs-review" onTabChange={() => {}} query="" onQueryChange={() => {}} selectedId={null} onSelect={() => {}} hasWatchedRepos={false} />);
    expect(screen.getByText('Watch a repository in Settings to see its pull requests.')).toBeTruthy();
  });
});
