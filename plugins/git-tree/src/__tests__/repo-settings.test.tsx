// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { RepoSettingsWidget } from '../app/components/RepoSettingsWidget.js';
import type { GitGraphGlobalSettings, RepoSettings } from '../server/types.js';

afterEach(() => cleanup());

function repoSettings(overrides: Partial<RepoSettings> = {}): RepoSettings {
  return {
    pullRequestConfig: { provider: 'github', remoteName: 'origin', targetBranch: 'main' },
    issueLinkingRules: [{ id: 'r1', pattern: '#(\\d+)', urlTemplate: 'https://x/$1' }],
    ...overrides
  } as RepoSettings;
}

function globalSettings(overrides: Partial<GitGraphGlobalSettings> = {}): GitGraphGlobalSettings {
  return {
    muteNonAncestors: false,
    muteMergeCommits: false,
    dateFormat: 'relative',
    dateType: 'author',
    ...overrides
  } as GitGraphGlobalSettings;
}

function setup(overrides: { open?: boolean; repo?: Partial<RepoSettings>; global?: Partial<GitGraphGlobalSettings> } = {}) {
  const props = {
    open: overrides.open ?? true,
    remotes: [{ name: 'origin', fetchUrl: 'https://h/o/r.git', pushUrl: 'https://h/o/r.git' }],
    repoSettings: repoSettings(overrides.repo),
    globalSettings: globalSettings(overrides.global),
    onClose: vi.fn(),
    onRunGitAction: vi.fn(),
    onUpdateRepoSettings: vi.fn(),
    onUpdateGlobalSettings: vi.fn(),
    onExportRepoConfig: vi.fn()
  };
  const view = render(<RepoSettingsWidget {...props} />);
  return { props, ...view };
}

describe('RepoSettingsWidget', () => {
  it('renders nothing when closed', () => {
    const { container } = setup({ open: false });
    expect(container.innerHTML).toBe('');
  });

  it('updates pull request provider, remote, and target branch', () => {
    const { container, props } = setup();
    const selects = container.querySelectorAll('select.gg-select');
    fireEvent.change(selects[0], { target: { value: 'gitlab' } });
    expect(props.onUpdateRepoSettings).toHaveBeenLastCalledWith({
      pullRequestConfig: expect.objectContaining({ provider: 'gitlab' })
    });

    const remote = container.querySelector('input[placeholder="Remote (origin)"]') as HTMLInputElement;
    fireEvent.change(remote, { target: { value: 'upstream' } });
    expect(props.onUpdateRepoSettings).toHaveBeenLastCalledWith({
      pullRequestConfig: expect.objectContaining({ remoteName: 'upstream' })
    });

    const target = container.querySelector('input[placeholder="Target branch (main)"]') as HTMLInputElement;
    fireEvent.change(target, { target: { value: 'develop' } });
    expect(props.onUpdateRepoSettings).toHaveBeenLastCalledWith({
      pullRequestConfig: expect.objectContaining({ targetBranch: 'develop' })
    });
  });

  it('removes an issue linking rule', () => {
    const { getByText, props } = setup();
    fireEvent.click(getByText('Remove'));
    expect(props.onUpdateRepoSettings).toHaveBeenCalledWith({ issueLinkingRules: [] });
  });

  it('adds an issue linking rule only when both fields are filled', () => {
    const { container, getByText, props } = setup();
    const addButton = getByText('Add Rule') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);

    const pattern = container.querySelector('input.gg-issue-prefix-width') as HTMLInputElement;
    const url = container.querySelector('input.gg-issue-prefix-width + input') as HTMLInputElement;
    fireEvent.change(pattern, { target: { value: ' PROJ-(\\d+) ' } });
    fireEvent.change(url, { target: { value: ' https://j/$1 ' } });
    const enabled = getByText('Add Rule') as HTMLButtonElement;
    expect(enabled.disabled).toBe(false);

    fireEvent.click(enabled);
    const [patch] = props.onUpdateRepoSettings.mock.calls.at(-1) as [{ issueLinkingRules: Array<{ pattern: string; urlTemplate: string }> }];
    expect(patch.issueLinkingRules.at(-1)).toMatchObject({ pattern: 'PROJ-(\\d+)', urlTemplate: 'https://j/$1' });
    expect(pattern.value).toBe('');
    expect(url.value).toBe('');
  });

  it('forwards graph display, date format, and date type changes', () => {
    const { container, props } = setup();
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[0]);
    expect(props.onUpdateGlobalSettings).toHaveBeenLastCalledWith({ muteNonAncestors: true });
    fireEvent.click(checkboxes[1]);
    expect(props.onUpdateGlobalSettings).toHaveBeenLastCalledWith({ muteMergeCommits: true });

    const selects = container.querySelectorAll('select.gg-select');
    fireEvent.change(selects[selects.length - 2], { target: { value: 'iso' } });
    expect(props.onUpdateGlobalSettings).toHaveBeenLastCalledWith({ dateFormat: 'iso' });
    fireEvent.change(selects[selects.length - 1], { target: { value: 'commit' } });
    expect(props.onUpdateGlobalSettings).toHaveBeenLastCalledWith({ dateType: 'commit' });
  });

  it('exports the repo config and closes from the footer', () => {
    const { getByText, props } = setup();
    fireEvent.click(getByText('Export .git-tree.json'));
    expect(props.onExportRepoConfig).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText('Done'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
