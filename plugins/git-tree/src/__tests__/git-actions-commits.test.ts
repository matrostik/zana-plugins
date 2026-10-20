import { describe, expect, it, vi } from 'vitest';
import { executeGitAction } from '../server/git-actions.js';
import type { GitRunner } from '../server/git-exec.js';

function recorder(respond: (args: string[]) => { code: number; stdout?: string; stderr?: string } = () => ({ code: 0 })) {
  const calls: string[][] = [];
  const git = vi.fn(async ({ args }: { args: string[] }) => {
    calls.push(args);
    const r = respond(args);
    return { code: r.code, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  }) as unknown as GitRunner;
  return { git, calls };
}

async function run(action: string, params: Record<string, unknown>, extra: { signCommits?: boolean; signTags?: boolean } = {}, respond?: Parameters<typeof recorder>[0]) {
  const { git, calls } = recorder(respond);
  const res = await executeGitAction({ cwd: '/r', git, action, params, ...extra });
  return { res, calls };
}

describe('git-actions commit, tag, and stash argv', () => {
  it.each([
    ['checkoutCommit', { commit: 'abc' }, ['checkout', 'abc']],
    ['cherryPick', { commit: 'abc' }, ['cherry-pick', 'abc']],
    ['cherryPick', { commit: 'abc', noCommit: true, recordOrigin: true, parentIndex: 2.7 }, ['cherry-pick', '--no-commit', '-x', '-m', '2', 'abc']],
    ['revertCommit', { commit: 'abc' }, ['revert', '--no-edit', 'abc']],
    ['revertCommit', { commit: 'abc', noCommit: true, parentIndex: 1 }, ['revert', '--no-commit', '-m', '1', 'abc']],
    ['resetToCommit', { commit: 'abc', mode: 'hard' }, ['reset', '--hard', 'abc']],
    ['resetToCommit', { commit: 'abc', mode: 'bogus' }, ['reset', '--mixed', 'abc']],
    ['addTag', { tag: 'v1' }, ['tag', 'v1', 'HEAD']],
    ['addTag', { tag: 'v1', commit: 'abc', annotated: true, message: 'rel', force: true }, ['tag', '-f', '-a', 'v1', '-m', 'rel', 'abc']],
    ['deleteTag', { tag: 'v1' }, ['tag', '-d', 'v1']],
    ['pushTag', { tag: 'v1' }, ['push', 'origin', 'refs/tags/v1']],
    ['commitUncommitted', { message: 'wip' }, ['commit', '-m', 'wip']],
    ['stashPop', {}, ['stash', 'pop', 'stash@{0}']],
    ['stashPop', { selector: 'stash@{2}', reinstateIndex: true }, ['stash', 'pop', '--index', 'stash@{2}']],
    ['stashApply', {}, ['stash', 'apply', 'stash@{0}']],
    ['stashApply', { reinstateIndex: true }, ['stash', 'apply', '--index', 'stash@{0}']],
    ['stashDrop', {}, ['stash', 'drop', 'stash@{0}']],
    ['stashBranch', { branch: 'b' }, ['stash', 'branch', 'b', 'stash@{0}']]
  ])('%s %j', async (action, params, expected) => {
    const { calls } = await run(action, params as Record<string, unknown>);
    expect(calls.at(-1)).toEqual(expected);
  });

  it('signs commits and tags when the repository asks for it', async () => {
    expect((await run('cherryPick', { commit: 'abc' }, { signCommits: true })).calls.at(-1)).toEqual(['cherry-pick', '-S', 'abc']);
    expect((await run('revertCommit', { commit: 'abc' }, { signCommits: true })).calls.at(-1)).toEqual(['revert', '-S', '--no-edit', 'abc']);
    expect((await run('addTag', { tag: 'v2', message: 'm' }, { signTags: true })).calls.at(-1)).toEqual(['tag', '-s', 'v2', '-m', 'm', 'HEAD']);
  });

  it('pushes a new tag to a remote only when the tag was created', async () => {
    const ok = await run('addTag', { tag: 'v1', pushToRemote: 'origin' });
    expect(ok.calls).toEqual([['tag', 'v1', 'HEAD'], ['push', 'origin', 'refs/tags/v1']]);
    const failed = await run('addTag', { tag: 'v1', pushToRemote: 'origin' }, {}, () => ({ code: 1, stderr: 'exists' }));
    expect(failed.calls).toEqual([['tag', 'v1', 'HEAD']]);
  });

  it('deletes a tag locally and optionally from the remote', async () => {
    const both = await run('deleteTag', { tag: 'v1', deleteFromRemote: 'origin' });
    expect(both.calls).toEqual([['tag', '-d', 'v1'], ['push', 'origin', '--delete', 'refs/tags/v1']]);
  });

  it('drops a commit by rebasing onto its parent and rejects root commits', async () => {
    const ok = await run('dropCommit', { commit: 'abc', branch: 'main' });
    expect(ok.calls).toEqual([
      ['rev-parse', '--verify', '-q', 'abc^'],
      ['rebase', '--onto', 'abc^', 'abc', 'main']
    ]);
    const root = await run('dropCommit', { commit: 'abcdef123' }, {}, (args) =>
      args[0] === 'rev-parse' ? { code: 128, stderr: 'no parent' } : { code: 0 }
    );
    expect(root.res.ok).toBe(false);
    expect(root.res.error).toMatch(/root commits have no parent/);
    expect(root.calls).toHaveLength(1);
  });
});
