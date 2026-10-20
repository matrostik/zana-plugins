// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { copyText, copyViaTextarea } from '../app/clipboard.js';
import { FindWidget, type FindWidgetProps } from '../app/components/FindWidget.js';
import { executeGitAction } from '../server/git-actions.js';
import type { GitRunner } from '../server/git-exec.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function fakeGit(code = 0, stdout = '', stderr = ''): GitRunner & ReturnType<typeof vi.fn> {
  return vi.fn(async () => ({ code, stdout, stderr })) as GitRunner & ReturnType<typeof vi.fn>;
}

describe('clipboard helpers', () => {
  it('copies through a readonly textarea and removes it afterwards', () => {
    const exec = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true, writable: true });
    expect(copyViaTextarea('hello')).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('returns false when execCommand throws', () => {
    Object.defineProperty(document, 'execCommand', {
      value: () => {
        throw new Error('blocked');
      },
      configurable: true,
      writable: true
    });
    expect(copyViaTextarea('x')).toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('prefers navigator.clipboard and falls back when it rejects', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await expect(copyText('a')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('a');

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) },
      configurable: true
    });
    Object.defineProperty(document, 'execCommand', { value: () => true, configurable: true, writable: true });
    await expect(copyText('b')).resolves.toBe(true);
  });
});

describe('FindWidget', () => {
  function renderWidget(overrides: Partial<FindWidgetProps> = {}) {
    const props: FindWidgetProps = {
      query: '',
      onChangeQuery: vi.fn(),
      matchCount: 0,
      activeMatchIndex: 0,
      onPrev: vi.fn(),
      onNext: vi.fn(),
      onClose: vi.fn(),
      ...overrides
    };
    const view = render(<FindWidget {...props} />);
    return { props, ...view };
  }

  it('shows the position of the active match and disables navigation without matches', () => {
    const { getByTestId, rerender } = renderWidget({ query: 'main', matchCount: 3, activeMatchIndex: 1 });
    expect(document.querySelector('.gg-find-count-badge')?.textContent).toBe('2 / 3');
    expect((getByTestId('gg-find-prev') as HTMLButtonElement).disabled).toBe(false);

    rerender(<FindWidget query="zzz" onChangeQuery={vi.fn()} matchCount={0} activeMatchIndex={0} onPrev={vi.fn()} onNext={vi.fn()} onClose={vi.fn()} />);
    expect(document.querySelector('.gg-find-count-badge')?.textContent).toBe('0 / 0');
    expect((getByTestId('gg-find-next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows no badge text for a blank query', () => {
    renderWidget({ query: '   ', matchCount: 5 });
    expect(document.querySelector('.gg-find-count-badge')?.textContent).toBe('');
  });

  it('routes Enter, Shift+Enter, and Escape from the input', () => {
    const { getByTestId, props } = renderWidget({ query: 'x', matchCount: 2 });
    const input = getByTestId('gg-find-input');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onNext).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(props.onPrev).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: 'a' });
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  it('forwards typing and button clicks', () => {
    const { getByTestId, getByLabelText, props } = renderWidget({ query: 'x', matchCount: 2 });
    fireEvent.change(getByTestId('gg-find-input'), { target: { value: 'abc' } });
    expect(props.onChangeQuery).toHaveBeenCalledWith('abc');
    fireEvent.click(getByTestId('gg-find-prev'));
    fireEvent.click(getByTestId('gg-find-next'));
    fireEvent.click(getByLabelText('Close find widget'));
    expect(props.onPrev).toHaveBeenCalledTimes(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('executeGitAction branches', () => {
  it('init with a safe initial branch uses -b and falls back to plain init on failure', async () => {
    const git = vi.fn()
      .mockResolvedValueOnce({ code: 1, stdout: '', stderr: 'unsupported' })
      .mockResolvedValueOnce({ code: 0, stdout: 'ok', stderr: '' });
    const res = await executeGitAction({ cwd: '/r', git: git as unknown as GitRunner, action: 'init', params: { initialBranch: 'trunk' } });
    expect(res.ok).toBe(true);
    expect(git.mock.calls[0][0].args).toEqual(['init', '-b', 'trunk']);
    expect(git.mock.calls[1][0].args).toEqual(['init']);
  });

  it('rejects an unsafe initial branch name', async () => {
    const git = fakeGit();
    await expect(
      executeGitAction({ cwd: '/r', git, action: 'init', params: { initialBranch: '--evil' } })
    ).rejects.toThrow(/cannot start with '-'/);
    expect(git).not.toHaveBeenCalled();
  });

  it('reports the exit code when git prints nothing on failure', async () => {
    const git = fakeGit(128, '', '');
    const res = await executeGitAction({ cwd: '/r', git, action: 'init', params: {} });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('git init failed (exit 128)');
  });

  it('returns a clear error when the commit message is missing', async () => {
    const git = fakeGit();
    const res = await executeGitAction({ cwd: '/r', git, action: 'commitUncommitted', params: {} });
    expect(res).toEqual({ ok: false, stdout: '', stderr: '', error: 'Commit message is required.' });
    expect(git).not.toHaveBeenCalled();
  });

  it('stages and commits uncommitted changes', async () => {
    const git = fakeGit();
    const res = await executeGitAction({ cwd: '/r', git, action: 'commitUncommitted', params: { message: 'wip' } });
    expect(res.ok).toBe(true);
    expect(git.mock.calls.map((c) => (c[0] as { args: string[] }).args)).toEqual([
      ['add', '-A'],
      ['commit', '-m', 'wip']
    ]);
  });

  it('explains the missing initial commit when stashing an empty repository', async () => {
    const git = fakeGit(1, '', 'You do not have the initial commit yet');
    const res = await executeGitAction({ cwd: '/r', git, action: 'stashPush', params: { includeUntracked: true, message: 'm' } });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Cannot stash: Git requires at least one commit/);
    expect(git.mock.calls[0][0].args).toEqual(['stash', 'push', '--include-untracked', '-m', 'm']);
  });

  it('keeps an unrelated stash error unchanged', async () => {
    const git = fakeGit(1, '', 'some other failure');
    const res = await executeGitAction({ cwd: '/r', git, action: 'stashPush', params: {} });
    expect(res.error).toBe('some other failure');
  });
});
