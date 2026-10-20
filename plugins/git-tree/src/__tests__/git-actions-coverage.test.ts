import { describe, expect, it, vi } from 'vitest';
import { buildPullRequestUrl, executeGitAction, getTagDetails } from '../server/git-actions.js';
import type { GitRunner } from '../server/git-exec.js';

type Reply = { code: number; stdout?: string; stderr?: string };

function recorder(replies: Array<[string, Reply]> = []): GitRunner & { calls: string[][] } {
  const calls: string[][] = [];
  const fn = vi.fn(async ({ args }: { args: string[] }) => {
    calls.push(args);
    const key = args.join(' ');
    const hit = replies.find(([prefix]) => key.startsWith(prefix));
    return {
      code: hit?.[1].code ?? 0,
      stdout: hit?.[1].stdout ?? '',
      stderr: hit?.[1].stderr ?? ''
    };
  });
  return Object.assign(fn as unknown as GitRunner, { calls });
}

const run = (git: GitRunner, action: string, params: Record<string, unknown> = {}, flags: { signCommits?: boolean; signTags?: boolean } = {}) =>
  executeGitAction({ cwd: '/repo', git, action, params, ...flags });

describe('executeGitAction: repository lifecycle and fetch/pull/push', () => {
  it('init with and without an initial branch, falling back when -b fails', async () => {
    const ok = recorder();
    await run(ok, 'init', { initialBranch: 'trunk' });
    expect(ok.calls[0]).toEqual(['init', '-b', 'trunk']);

    const fallback = recorder([['init -b', { code: 1, stderr: 'old git' }]]);
    const res = await run(fallback, 'init', { initialBranch: 'trunk' });
    expect(fallback.calls.map((c) => c.join(' '))).toEqual(['init -b trunk', 'init']);
    expect(res.ok).toBe(true);

    await run(recorder(), 'init');
  });

  it('fetch covers remote, branch, localBranch, prune flags, and --all', async () => {
    const git = recorder();
    await run(git, 'fetch', {
      remote: 'origin',
      branch: 'main',
      localBranch: 'local-main',
      prune: true,
      pruneTags: true,
      force: true
    });
    expect(git.calls[0]).toEqual([
      'fetch',
      'origin',
      'main:local-main',
      '--prune',
      '--prune-tags',
      '--force'
    ]);

    const remoteOnly = recorder();
    await run(remoteOnly, 'fetch', { remote: 'origin', branch: 'dev' });
    expect(remoteOnly.calls[0]).toEqual(['fetch', 'origin', 'dev']);

    const all = recorder();
    await run(all, 'fetch', {});
    expect(all.calls[0]).toEqual(['fetch', '--all']);
  });

  it('pull defaults to origin and honours no-ff and squash', async () => {
    const git = recorder();
    await run(git, 'pull', { noFastForward: true, squash: true, branch: 'main' });
    expect(git.calls[0]).toEqual(['pull', '--no-ff', '--squash', 'origin', 'main']);

    const bare = recorder();
    await run(bare, 'pull', {});
    expect(bare.calls[0]).toEqual(['pull', 'origin']);
  });

  it('push skips when the branch has no commits ahead of its remote', async () => {
    const git = recorder([
      ['rev-parse --verify --quiet', { code: 0 }],
      ['rev-list --count', { code: 0, stdout: '0\n' }]
    ]);
    const res = await run(git, 'push', { remote: 'origin', branch: 'main' });
    expect(res.notice).toMatch(/Nothing to push/);
    expect(git.calls.some((c) => c[0] === 'push')).toBe(false);
  });

  it('push pushes when ahead, with upstream and force modes', async () => {
    const ahead = recorder([
      ['rev-parse --verify --quiet', { code: 0 }],
      ['rev-list --count', { code: 0, stdout: '2\n' }]
    ]);
    await run(ahead, 'push', { branch: 'feat' });
    expect(ahead.calls.at(-1)).toEqual(['push', 'origin', 'feat']);

    const upstream = recorder();
    await run(upstream, 'push', { remote: 'up', branch: 'feat', setUpstream: true, forceMode: 'force-with-lease' });
    expect(upstream.calls[0]).toEqual(['push', '--set-upstream', '--force-with-lease', 'up', 'feat']);

    const force = recorder();
    await run(force, 'push', { branch: 'feat', setUpstream: true, forceMode: 'force' });
    expect(force.calls[0]).toEqual(['push', '--set-upstream', '--force', 'origin', 'feat']);
  });

  it('push proceeds when the remote ref exists but the ahead count is unavailable', async () => {
    const git = recorder([
      ['rev-parse --verify --quiet', { code: 0 }],
      ['rev-list --count', { code: 128 }]
    ]);
    const res = await run(git, 'push', { branch: 'main' });
    expect(res.notice).toBeUndefined();
    expect(git.calls.at(-1)).toEqual(['push', 'origin', 'main']);
  });
});

describe('executeGitAction: branches', () => {
  it('checkoutBranch with and without remote tracking', async () => {
    const plain = recorder();
    await run(plain, 'checkoutBranch', { branch: 'dev' });
    expect(plain.calls[0]).toEqual(['checkout', 'dev']);

    const tracking = recorder();
    await run(tracking, 'checkoutBranch', { branch: 'dev', remoteBranch: 'origin/dev' });
    expect(tracking.calls[0]).toEqual(['checkout', '-b', 'dev', '--track', 'origin/dev']);
  });

  it('createBranch with and without checkout', async () => {
    const plain = recorder();
    await run(plain, 'createBranch', { branch: 'b1', target: 'abc123' });
    expect(plain.calls[0]).toEqual(['branch', 'b1', 'abc123']);

    const checkout = recorder();
    await run(checkout, 'createBranch', { branch: 'b2', checkout: true });
    expect(checkout.calls[0]).toEqual(['checkout', '-b', 'b2', 'HEAD']);
  });

  it('renameBranch, deleteBranch, deleteRemoteBranch', async () => {
    const rename = recorder();
    await run(rename, 'renameBranch', { oldName: 'a', newName: 'b' });
    expect(rename.calls[0]).toEqual(['branch', '-m', 'a', 'b']);

    const del = recorder();
    await run(del, 'deleteBranch', { branch: 'a', force: true });
    expect(del.calls[0]).toEqual(['branch', '-D', 'a']);

    const delRemote = recorder();
    await run(delRemote, 'deleteBranch', { branch: 'a', deleteRemote: true, remote: 'upstream' });
    expect(delRemote.calls.map((c) => c.join(' '))).toEqual(['branch -d a', 'push upstream --delete a']);

    const failedLocal = recorder([['branch -d', { code: 1, stderr: 'not merged' }]]);
    const failRes = await run(failedLocal, 'deleteBranch', { branch: 'a', deleteRemote: true });
    expect(failRes.ok).toBe(false);
    expect(failedLocal.calls).toHaveLength(1);

    const remoteOnly = recorder();
    await run(remoteOnly, 'deleteRemoteBranch', { remote: 'origin', branch: 'a' });
    expect(remoteOnly.calls[0]).toEqual(['push', 'origin', '--delete', 'a']);
  });

  it('merge and rebase honour signing and merge flags', async () => {
    const merge = recorder();
    await run(merge, 'merge', { target: 'feat', noFastForward: true, noCommit: true, squash: true }, { signCommits: true });
    expect(merge.calls[0]).toEqual(['merge', '-S', '--no-ff', '--no-commit', '--squash', 'feat']);

    const rebase = recorder();
    await run(rebase, 'rebase', { onto: 'main' }, { signCommits: true });
    expect(rebase.calls[0]).toEqual(['rebase', '-S', 'main']);
  });
});

describe('executeGitAction: commits', () => {
  it('checkoutCommit, cherryPick, revertCommit with options', async () => {
    const checkout = recorder();
    await run(checkout, 'checkoutCommit', { commit: 'abc' });
    expect(checkout.calls[0]).toEqual(['checkout', 'abc']);

    const pick = recorder();
    await run(pick, 'cherryPick', { commit: 'abc', noCommit: true, recordOrigin: true, parentIndex: 2 }, { signCommits: true });
    expect(pick.calls[0]).toEqual(['cherry-pick', '-S', '--no-commit', '-x', '-m', '2', 'abc']);

    const revertNoCommit = recorder();
    await run(revertNoCommit, 'revertCommit', { commit: 'abc', noCommit: true, parentIndex: 1 });
    expect(revertNoCommit.calls[0]).toEqual(['revert', '--no-commit', '-m', '1', 'abc']);

    const revert = recorder();
    await run(revert, 'revertCommit', { commit: 'abc' }, { signCommits: true });
    expect(revert.calls[0]).toEqual(['revert', '-S', '--no-edit', 'abc']);
  });

  it('resetToCommit normalizes mode and defaults to mixed', async () => {
    const hard = recorder();
    await run(hard, 'resetToCommit', { commit: 'abc', mode: 'hard' });
    expect(hard.calls[0]).toEqual(['reset', '--hard', 'abc']);
    const bogus = recorder();
    await run(bogus, 'resetToCommit', { commit: 'abc', mode: 'nope' });
    expect(bogus.calls[0]).toEqual(['reset', '--mixed', 'abc']);
  });

  it('dropCommit rejects root commits and rebases otherwise', async () => {
    const root = recorder([['rev-parse --verify -q', { code: 128, stderr: 'no parent' }]]);
    const rootRes = await run(root, 'dropCommit', { commit: 'abcdef1234' });
    expect(rootRes.ok).toBe(false);
    expect(rootRes.error).toMatch(/root commits/);

    const normal = recorder();
    await run(normal, 'dropCommit', { commit: 'abc', branch: 'main' });
    expect(normal.calls.at(-1)).toEqual(['rebase', '--onto', 'abc^', 'abc', 'main']);

    const noBranch = recorder();
    await run(noBranch, 'dropCommit', { commit: 'abc' });
    expect(noBranch.calls.at(-1)).toEqual(['rebase', '--onto', 'abc^', 'abc']);
  });
});

describe('executeGitAction: tags', () => {
  it('addTag variants: lightweight, annotated, signed, forced, pushed', async () => {
    const light = recorder();
    await run(light, 'addTag', { tag: 'v1' });
    expect(light.calls[0]).toEqual(['tag', 'v1', 'HEAD']);

    const annotated = recorder();
    await run(annotated, 'addTag', { tag: 'v2', commit: 'abc', annotated: true, message: 'rel', force: true });
    expect(annotated.calls[0]).toEqual(['tag', '-f', '-a', 'v2', '-m', 'rel', 'abc']);

    const signed = recorder();
    await run(signed, 'addTag', { tag: 'v3', commit: 'abc' }, { signTags: true });
    expect(signed.calls[0]).toEqual(['tag', '-s', 'v3', '-m', 'v3', 'abc']);

    const pushed = recorder();
    await run(pushed, 'addTag', { tag: 'v4', pushToRemote: 'origin' });
    expect(pushed.calls.at(-1)).toEqual(['push', 'origin', 'refs/tags/v4']);

    const failed = recorder([['tag v5', { code: 1, stderr: 'exists' }]]);
    const failRes = await run(failed, 'addTag', { tag: 'v5', pushToRemote: 'origin' });
    expect(failRes.ok).toBe(false);
    expect(failed.calls).toHaveLength(1);
  });

  it('deleteTag, optionally from a remote; pushTag', async () => {
    const del = recorder();
    await run(del, 'deleteTag', { tag: 'v1', deleteFromRemote: 'origin' });
    expect(del.calls.map((c) => c.join(' '))).toEqual(['tag -d v1', 'push origin --delete refs/tags/v1']);

    const localOnly = recorder();
    await run(localOnly, 'deleteTag', { tag: 'v1' });
    expect(localOnly.calls).toEqual([['tag', '-d', 'v1']]);

    const failedDel = recorder([['tag -d', { code: 1 }]]);
    const failRes = await run(failedDel, 'deleteTag', { tag: 'v1', deleteFromRemote: 'origin' });
    expect(failRes.ok).toBe(false);

    const push = recorder();
    await run(push, 'pushTag', { tag: 'v1' });
    expect(push.calls[0]).toEqual(['push', 'origin', 'refs/tags/v1']);
  });
});

describe('executeGitAction: stash and uncommitted', () => {
  it('commitUncommitted requires a message and stages everything', async () => {
    const missing = recorder();
    const res = await run(missing, 'commitUncommitted', {});
    expect(res.error).toMatch(/message is required/);
    expect(missing.calls).toHaveLength(0);

    const git = recorder();
    await run(git, 'commitUncommitted', { message: 'wip' });
    expect(git.calls).toEqual([['add', '-A'], ['commit', '-m', 'wip']]);

    const addFails = recorder([['add -A', { code: 1, stderr: 'locked' }]]);
    const addRes = await run(addFails, 'commitUncommitted', { message: 'x' });
    expect(addRes.ok).toBe(false);
    expect(addFails.calls).toHaveLength(1);
  });

  it('stashPush with options and the no-initial-commit message rewrite', async () => {
    const full = recorder();
    await run(full, 'stashPush', { message: 'save', includeUntracked: true });
    expect(full.calls[0]).toEqual(['stash', 'push', '--include-untracked', '-m', 'save']);

    const noCommit = recorder([
      ['stash push', { code: 1, stderr: 'You do not have the initial commit yet' }]
    ]);
    const res = await run(noCommit, 'stashPush', {});
    expect(res.error).toMatch(/at least one commit/);
  });

  it('stashPop, stashApply, stashDrop, stashBranch use the selector and index flag', async () => {
    const pop = recorder();
    await run(pop, 'stashPop', { selector: 'stash@{1}', reinstateIndex: true });
    expect(pop.calls[0]).toEqual(['stash', 'pop', '--index', 'stash@{1}']);

    const apply = recorder();
    await run(apply, 'stashApply', { reinstateIndex: true });
    expect(apply.calls[0]).toEqual(['stash', 'apply', '--index', 'stash@{0}']);

    const drop = recorder();
    await run(drop, 'stashDrop', {});
    expect(drop.calls[0]).toEqual(['stash', 'drop', 'stash@{0}']);

    const branch = recorder();
    await run(branch, 'stashBranch', { branch: 'from-stash' });
    expect(branch.calls[0]).toEqual(['stash', 'branch', 'from-stash', 'stash@{0}']);
  });

  it('resetUncommitted, cleanUntracked, discardAll', async () => {
    const hard = recorder();
    await run(hard, 'resetUncommitted', { mode: 'hard' });
    expect(hard.calls[0]).toEqual(['reset', '--hard', 'HEAD']);

    const soft = recorder();
    await run(soft, 'resetUncommitted', { mode: 'soft' });
    expect(soft.calls[0]).toEqual(['reset', '--mixed', 'HEAD']);

    const clean = recorder();
    await run(clean, 'cleanUntracked', { includeDirectories: true });
    expect(clean.calls[0]).toEqual(['clean', '-f', '-d']);

    const discard = recorder();
    await run(discard, 'discardAll', {});
    expect(discard.calls).toEqual([['reset', '--hard', 'HEAD'], ['clean', '-f', '-d']]);

    const discardFail = recorder([['reset --hard', { code: 1 }]]);
    const failRes = await run(discardFail, 'discardAll', {});
    expect(failRes.ok).toBe(false);
    expect(discardFail.calls).toHaveLength(1);
  });
});

describe('executeGitAction: remotes and unsupported actions', () => {
  it('addRemote, editRemote (rename and url-only), deleteRemote, pruneRemote', async () => {
    const add = recorder();
    await run(add, 'addRemote', { name: 'fork', url: 'https://x/y.git', fetch: true });
    expect(add.calls[0]).toEqual(['remote', 'add', '-f', 'fork', 'https://x/y.git']);

    const rename = recorder();
    await run(rename, 'editRemote', { oldName: 'origin', newName: 'upstream', url: 'https://u' });
    expect(rename.calls.map((c) => c.join(' '))).toEqual([
      'remote rename origin upstream',
      'remote set-url upstream https://u'
    ]);

    const sameName = recorder();
    await run(sameName, 'editRemote', { oldName: 'origin', url: 'https://o' });
    expect(sameName.calls).toEqual([['remote', 'set-url', 'origin', 'https://o']]);

    const renameFail = recorder([['remote rename', { code: 1, stderr: 'exists' }]]);
    const renameRes = await run(renameFail, 'editRemote', { oldName: 'a', newName: 'b', url: 'u' });
    expect(renameRes.ok).toBe(false);

    const del = recorder();
    await run(del, 'deleteRemote', { name: 'fork' });
    expect(del.calls[0]).toEqual(['remote', 'remove', 'fork']);

    const prune = recorder();
    await run(prune, 'pruneRemote', { name: 'origin' });
    expect(prune.calls[0]).toEqual(['remote', 'prune', 'origin']);
  });

  it('returns an error for an unknown action', async () => {
    const res = await run(recorder(), 'explode');
    expect(res).toMatchObject({ ok: false, error: 'Unsupported Git action: explode' });
  });

  it('surfaces stdout as the error when stderr is empty', async () => {
    const failing = recorder([['commit', { code: 1, stdout: 'nothing to commit', stderr: '' }]]);
    const res = await run(failing, 'commitUncommitted', { message: 'm' });
    expect(res.error).toBe('nothing to commit');
  });

  it('falls back to a generic message when there is no output at all', async () => {
    const silent = recorder([['commit', { code: 3 }]]);
    const res = await run(silent, 'commitUncommitted', { message: 'm' });
    expect(res.error).toBe('git commit failed (exit 3)');
  });
});

describe('getTagDetails', () => {
  it('returns lightweight tag info without annotation fields', async () => {
    const git = recorder([
      ['cat-file -t', { code: 0, stdout: 'commit\n' }],
      ['rev-parse', { code: 0, stdout: 'deadbeef\n' }]
    ]);
    await expect(getTagDetails({ cwd: '/r', git, tagName: 'v1' })).resolves.toEqual({
      name: 'v1',
      hash: 'deadbeef',
      isAnnotated: false
    });
  });

  it('parses annotated tag metadata, including a message containing the separator', async () => {
    const fs = '\x1f';
    const git = recorder([
      ['cat-file -t', { code: 0, stdout: 'tag\n' }],
      [
        'for-each-ref',
        {
          code: 0,
          stdout: ['cafe', 'Ann', '<ann@x>', '1700000000', 'line one', 'line two'].join(fs)
        }
      ]
    ]);
    const details = await getTagDetails({ cwd: '/r', git, tagName: 'v2' });
    expect(details).toMatchObject({
      isAnnotated: true,
      hash: 'cafe',
      taggerName: 'Ann',
      taggerEmail: 'ann@x',
      taggerDate: 1700000000,
      message: 'line one\x1fline two'
    });
  });

  it('leaves optional fields undefined when the annotated output is empty', async () => {
    const git = recorder([
      ['cat-file -t', { code: 0, stdout: 'tag' }],
      ['for-each-ref', { code: 0, stdout: '' }]
    ]);
    const details = await getTagDetails({ cwd: '/r', git, tagName: 'v3' });
    expect(details).toMatchObject({ isAnnotated: true, hash: '' });
    expect(details.taggerName).toBeUndefined();
    expect(details.message).toBeUndefined();
  });
});

describe('buildPullRequestUrl', () => {
  const remotes = [
    { name: 'origin', fetchUrl: 'git@github.com:acme/widgets.git', pushUrl: 'git@github.com:acme/widgets.git' }
  ];
  const base = { remoteName: 'origin', provider: 'github' as const, targetBranch: 'main' };

  it('builds a GitHub compare URL from an SSH remote', () => {
    expect(buildPullRequestUrl({ sourceBranch: 'feat/x', config: base as never, remotes })).toBe(
      'https://github.com/acme/widgets/compare/main...feat%2Fx?expand=1'
    );
  });

  it('builds GitLab and Bitbucket URLs', () => {
    const gl = [{ name: 'origin', fetchUrl: 'https://gitlab.com/g/p.git', pushUrl: 'https://gitlab.com/g/p.git' }];
    expect(buildPullRequestUrl({ sourceBranch: 'b', config: { ...base, provider: 'gitlab' } as never, remotes: gl })).toContain(
      '/-/merge_requests/new?'
    );
    const bb = [{ name: 'origin', fetchUrl: 'ssh://git@bitbucket.org/t/r', pushUrl: 'ssh://git@bitbucket.org/t/r' }];
    expect(buildPullRequestUrl({ sourceBranch: 'b', config: { ...base, provider: 'bitbucket' } as never, remotes: bb })).toBe(
      'https://bitbucket.org/t/r/pull-requests/new?source=b&dest=main&t=1'
    );
  });

  it('applies a custom template with all placeholders', () => {
    const url = buildPullRequestUrl({
      sourceBranch: 'f',
      config: { ...base, provider: 'custom', customUrlTemplate: 'https://$1/$2/$3?s=$4&t=$5' } as never,
      remotes
    });
    expect(url).toBe('https://github.com/acme/widgets?s=f&t=main');
  });

  it('returns null without a usable remote or parseable URL', () => {
    expect(buildPullRequestUrl({ sourceBranch: 'b', config: base as never, remotes: [] })).toBeNull();
    const weird = [{ name: 'origin', fetchUrl: 'file:///tmp/repo', pushUrl: 'file:///tmp/repo' }];
    expect(buildPullRequestUrl({ sourceBranch: 'b', config: base as never, remotes: weird })).toBeNull();
  });

  it('falls back to the first remote and the main target branch', () => {
    const other = [{ name: 'fork', fetchUrl: 'https://github.com/me/w.git', pushUrl: '' }];
    const url = buildPullRequestUrl({
      sourceBranch: 'b',
      config: { remoteName: 'missing', provider: 'github', targetBranch: '' } as never,
      remotes: other
    });
    expect(url).toBe('https://github.com/me/w/compare/main...b?expand=1');
  });
});
