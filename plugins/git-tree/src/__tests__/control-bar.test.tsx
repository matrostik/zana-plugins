// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ControlBar, type ControlBarProps } from '../app/components/ControlBar.js';
import { DEFAULT_GLOBAL_SETTINGS } from '../server/storage.js';

afterEach(() => cleanup());

function props(overrides: Partial<ControlBarProps> = {}): ControlBarProps & Record<string, ReturnType<typeof vi.fn>> {
  return {
    repos: [{ relPath: '', label: 'app', currentBranch: 'main', headHash: 'h', isWorktree: false }],
    selectedRepoRelPath: '',
    onSelectRepo: vi.fn(),
    branches: ['main', 'dev'],
    remoteBranches: ['origin/main'],
    repoSettings: {
      selectedBranches: [],
      showRemoteBranches: false,
      showTags: true,
      showStashes: true,
      onlyFollowFirstParent: false,
      commitOrdering: 'date',
      issueLinkingRules: [],
      pullRequestConfig: { provider: 'github', remoteName: 'origin', targetBranch: 'main' }
    } as never,
    globalSettings: { ...DEFAULT_GLOBAL_SETTINGS } as never,
    onUpdateRepoSettings: vi.fn(),
    onUpdateGlobalSettings: vi.fn(),
    onFetch: vi.fn(),
    onPush: vi.fn(),
    canPush: true,
    onScrollToHead: vi.fn(),
    onToggleFind: vi.fn(),
    findOpen: false,
    onOpenRepoSettings: vi.fn(),
    onRefresh: vi.fn(),
    loading: false,
    ...overrides
  } as never;
}

function openMenu(getByTestId: (id: string) => HTMLElement) {
  fireEvent.click(getByTestId('gg-branches-filter-btn'));
}

describe('ControlBar selectors', () => {
  it('shows project and repository pickers only when there is more than one', () => {
    const single = render(<ControlBar {...props({ projects: [{ id: 'p1', name: 'One' }] })} />);
    expect(single.queryByLabelText('Select project')).toBeNull();
    expect(single.queryByLabelText('Select repository')).toBeNull();
    single.unmount();

    const multi = props({
      projects: [{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }],
      selectedProjectId: 'p1',
      repos: [
        { relPath: '', label: 'app', currentBranch: 'main', headHash: 'h', isWorktree: false },
        { relPath: 'pkg', label: 'pkg', currentBranch: null, headHash: null, isWorktree: true }
      ]
    });
    const { getByLabelText } = render(<ControlBar {...multi} />);
    fireEvent.change(getByLabelText('Select project'), { target: { value: 'p2' } });
    expect(multi.onSelectProject).toBeUndefined();
    fireEvent.change(getByLabelText('Select repository'), { target: { value: 'pkg' } });
    expect(multi.onSelectRepo).toHaveBeenCalledWith('pkg');
  });
});

describe('ControlBar branch filter', () => {
  it('shows the active filter label for none, one, and several selected branches', () => {
    const { getByTestId, rerender } = render(<ControlBar {...props()} />);
    expect(getByTestId('gg-branches-filter-btn').textContent).toContain('Show All');
    rerender(<ControlBar {...props({ repoSettings: { ...props().repoSettings, selectedBranches: ['dev'] } as never })} />);
    expect(getByTestId('gg-branches-filter-btn').textContent).toContain('dev');
    rerender(<ControlBar {...props({ repoSettings: { ...props().repoSettings, selectedBranches: ['dev', 'main'] } as never })} />);
    expect(getByTestId('gg-branches-filter-btn').textContent).toContain('2 selected');
  });

  it('toggles the menu, filters branch names, and closes via Close and overlay', () => {
    const p = props({ repoSettings: { ...props().repoSettings, showRemoteBranches: true } as never });
    const { getByTestId, getByPlaceholderText, getByText, container } = render(<ControlBar {...p} />);
    openMenu(getByTestId);
    expect(getByTestId('gg-branches-popover')).toBeTruthy();
    fireEvent.change(getByPlaceholderText('Filter branch list...'), { target: { value: 'DEV' } });
    expect(container.textContent).toContain('dev');
    expect(container.textContent).not.toContain('origin/main');
    fireEvent.change(getByPlaceholderText('Filter branch list...'), { target: { value: '   ' } });
    fireEvent.click(getByText('Close'));
    expect(getByTestId('gg-branches-filter-btn').getAttribute('aria-expanded')).toBe('false');
    openMenu(getByTestId);
    fireEvent.click(container.querySelector('.gg-context-overlay-fixed') as Element);
    expect(container.querySelector('.gg-context-overlay-fixed')).toBeNull();
  });

  it('toggles individual branches on and off and clears them with Show All', () => {
    const p = props();
    const { getByTestId, container } = render(<ControlBar {...p} />);
    openMenu(getByTestId);
    const box = (name: string) =>
      Array.from(container.querySelectorAll('.gg-branch-scroll-list label')).find((l) => l.textContent === name)?.querySelector('input') as HTMLInputElement;
    fireEvent.click(box('dev'));
    expect(p.onUpdateRepoSettings).toHaveBeenLastCalledWith({ selectedBranches: ['dev'] });
    const current = props({ repoSettings: { ...p.repoSettings, selectedBranches: ['dev'] } as never });
    cleanup();
    const again = render(<ControlBar {...current} />);
    openMenu(again.getByTestId);
    const box2 = Array.from(again.container.querySelectorAll('.gg-branch-scroll-list label')).find((l) => l.textContent === 'dev')?.querySelector('input') as HTMLInputElement;
    fireEvent.click(box2);
    expect(current.onUpdateRepoSettings).toHaveBeenLastCalledWith({ selectedBranches: [] });
    const allBox = again.container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(allBox);
    expect(current.onUpdateRepoSettings).toHaveBeenLastCalledWith({ selectedBranches: [] });
  });

  it('forwards the remote, tag, stash, and first-parent checkboxes', () => {
    const p = props();
    const { getByTestId, getByText } = render(<ControlBar {...p} />);
    openMenu(getByTestId);
    fireEvent.click(getByText('Show Remote Branches').previousElementSibling as Element);
    expect(p.onUpdateRepoSettings).toHaveBeenLastCalledWith({ showRemoteBranches: true });
    fireEvent.click(getByText('Show Tags').previousElementSibling as Element);
    expect(p.onUpdateRepoSettings).toHaveBeenLastCalledWith({ showTags: false });
    fireEvent.click(getByText('Show Stashes').previousElementSibling as Element);
    expect(p.onUpdateRepoSettings).toHaveBeenLastCalledWith({ showStashes: false });
    fireEvent.click(getByText('Only Follow First Parent').previousElementSibling as Element);
    expect(p.onUpdateRepoSettings).toHaveBeenLastCalledWith({ onlyFollowFirstParent: true });
  });

  it('lists remote branches only when they are enabled', () => {
    const enabled = render(<ControlBar {...props({ repoSettings: { ...props().repoSettings, showRemoteBranches: true } as never })} />);
    openMenu(enabled.getByTestId);
    expect(enabled.container.textContent).toContain('remotes/origin/main');
    enabled.unmount();
    const disabled = render(<ControlBar {...props()} />);
    openMenu(disabled.getByTestId);
    expect(disabled.container.textContent).not.toContain('remotes/origin/main');
  });
});

describe('ControlBar toolbar', () => {
  it('changes commit ordering and toggles the graph style and details location', () => {
    const p = props();
    const { getByLabelText, getByTitle, getByText } = render(<ControlBar {...p} />);
    fireEvent.change(getByLabelText('Commit ordering'), { target: { value: 'topo' } });
    expect(p.onUpdateRepoSettings).toHaveBeenLastCalledWith({ commitOrdering: 'topo' });
    fireEvent.click(getByTitle('Toggle rounded or angular graph lines'));
    expect(p.onUpdateGlobalSettings).toHaveBeenLastCalledWith({ graphStyle: 'angular' });
    fireEvent.click(getByTitle('Toggle Commit Details location (Docked split vs Inline row)'));
    expect(p.onUpdateGlobalSettings).toHaveBeenLastCalledWith({ commitDetailsLocation: 'inline' });
    expect(getByText('Style: Rounded')).toBeTruthy();
    expect(getByText('Details: Docked')).toBeTruthy();
  });

  it('shows the angular and inline labels and inverts the toggles from them', () => {
    const p = props({ globalSettings: { ...DEFAULT_GLOBAL_SETTINGS, graphStyle: 'angular', commitDetailsLocation: 'inline' } as never });
    const { getByTitle, getByText } = render(<ControlBar {...p} />);
    expect(getByText('Style: Angular')).toBeTruthy();
    expect(getByText('Details: Inline')).toBeTruthy();
    fireEvent.click(getByTitle('Toggle rounded or angular graph lines'));
    expect(p.onUpdateGlobalSettings).toHaveBeenLastCalledWith({ graphStyle: 'rounded' });
    fireEvent.click(getByTitle('Toggle Commit Details location (Docked split vs Inline row)'));
    expect(p.onUpdateGlobalSettings).toHaveBeenLastCalledWith({ commitDetailsLocation: 'docked' });
  });

  it('wires fetch, push, HEAD, find, settings, and refresh and disables them while loading', () => {
    const p = props();
    const { getByText, getByTitle, getByTestId } = render(<ControlBar {...p} />);
    fireEvent.click(getByText('⬇ Fetch'));
    fireEvent.click(getByText('⬆ Push'));
    fireEvent.click(getByText('⌖ HEAD'));
    fireEvent.click(getByTestId('gg-find-btn'));
    fireEvent.click(getByTestId('gg-repo-settings-btn'));
    fireEvent.click(getByTitle('Refresh Git Tree (Ctrl/Cmd+R)'));
    expect(p.onFetch).toHaveBeenCalled();
    expect(p.onPush).toHaveBeenCalled();
    expect(p.onScrollToHead).toHaveBeenCalled();
    expect(p.onToggleFind).toHaveBeenCalled();
    expect(p.onOpenRepoSettings).toHaveBeenCalled();
    expect(p.onRefresh).toHaveBeenCalled();
  });

  it('marks find as active, disables push without a push target, and shows loading', () => {
    const p = props({ findOpen: true, canPush: false, loading: true, headerActions: <span>extra</span> });
    const { getByTestId, getByText, getByTitle } = render(<ControlBar {...p} />);
    expect(getByTestId('gg-find-btn').className).toContain('git-graph-btn--active');
    expect((getByText('⬆ Push') as HTMLButtonElement).disabled).toBe(true);
    expect((getByText('⬇ Fetch') as HTMLButtonElement).disabled).toBe(true);
    expect(getByTitle('Refresh Git Tree (Ctrl/Cmd+R)').textContent).toContain('Loading');
    expect(getByText('extra')).toBeTruthy();
  });
});
