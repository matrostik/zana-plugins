import { describe, expect, it, vi } from 'vitest';
import { executeGitAction } from '../server/git-actions.js';
import type { GitRunner } from '../server/git-exec.js';

function recorder(code = 0, stdout = '', stderr = '') {
  const calls: string[][] = [];
  const git = vi.fn(async ({ args }: { args: string[] }) => {
    calls.push(args);
    return { code, stdout, stderr };
  }) as unknown as GitRunner;
  return { git, calls };
}

async function run(action: string, params: Record<string, unknown>, extra: { signCommits?: boolean } = {}) {
  const { git, calls } = recorder();
  const res = await executeGitAction({ cwd: '/r', git, action, params, ...extra });
  return { res, argv: calls.at(-1) };
}

describe('git-actions argv', () => {
  it.each([
    ['checkoutBranch', { branch: 'dev' }, ['checkout', 'dev']],
    ['checkoutBranch', { branch: 'dev', remoteBranch: 'origin/dev' }, ['checkout', '-b', 'dev', '--track', 'origin/dev']],
    ['createBranch', { branch: 'x' }, ['branch', 'x', 'HEAD']],
    ['createBranch', { branch: 'x', target: 'abc', checkout: true }, ['checkout', '-b', 'x', 'abc']],
    ['renameBranch', { oldName: 'a', newName: 'b' }, ['branch', '-m', 'a', 'b']],
    ['deleteRemoteBranch', { remote: 'origin', branch: 'old' }, ['push', 'origin', '--delete', 'old']],
    ['merge', { target: 'main' }, ['merge', 'main']],
    ['merge', { target: 'main', noFastForward: true, noCommit: true, squash: true }, ['merge', '--no-ff', '--no-commit', '--squash', 'main']],
    ['rebase', { onto: 'main' }, ['rebase', 'main']]
  ])('%s %j', async (action, params, expected) => {
    const { argv } = await run(action, params as Record<string, unknown>);
    expect(argv).toEqual(expected);
  });

  it('adds -S when signing is enabled for merge and rebase', async () => {
    expect((await run('merge', { target: 'main' }, { signCommits: true })).argv).toEqual(['merge', '-S', 'main']);
    expect((await run('rebase', { onto: 'main' }, { signCommits: true })).argv).toEqual(['rebase', '-S', 'main']);
  });

  it('deletes a local branch with -d or -D and optionally its remote copy', async () => {
    const { git, calls } = recorder();
    await executeGitAction({ cwd: '/r', git, action: 'deleteBranch', params: { branch: 'old' } });
    expect(calls.at(-1)).toEqual(['branch', '-d', 'old']);
    await executeGitAction({ cwd: '/r', git, action: 'deleteBranch', params: { branch: 'old', force: true, deleteRemote: true } });
    expect(calls.slice(-2)).toEqual([
      ['branch', '-D', 'old'],
      ['push', 'origin', '--delete', 'old']
    ]);
  });

  it('stops before the remote delete when the local delete fails', async () => {
    const { git, calls } = recorder(1, '', 'not fully merged');
    const res = await executeGitAction({ cwd: '/r', git, action: 'deleteBranch', params: { branch: 'old', deleteRemote: true } });
    expect(res.ok).toBe(false);
    expect(calls).toEqual([['branch', '-d', 'old']]);
  });

  it('validates required branch names before running git', async () => {
    await expect(run('checkoutBranch', {})).rejects.toThrow('branch is required.');
    await expect(run('merge', {})).rejects.toThrow('merge target is required.');
    await expect(run('rebase', { onto: '-x' })).rejects.toThrow(/cannot start with '-'/);
  });
});
