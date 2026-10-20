import { assertSafeGitToken, type GitRunner } from './git-exec.js';
import type { GitRemoteInfo, GitTagDetails, PullRequestConfig } from './types.js';

export type GitMutationAction = {
  kind: string;
  [key: string]: unknown;
};

export interface GitActionOutcome {
  ok: boolean;
  stdout: string;
  stderr: string;
  error?: string;
  notice?: string;
}

async function runGitMutation(cwd: string, git: GitRunner, args: string[], timeoutMs = 45_000): Promise<GitActionOutcome> {
  const res = await git({ cwd, args, timeoutMs });
  if (res.code !== 0) {
    return {
      ok: false,
      stdout: res.stdout,
      stderr: res.stderr,
      error: res.stderr.trim() || res.stdout.trim() || `git ${args[0]} failed (exit ${res.code})`
    };
  }
  return {
    ok: true,
    stdout: res.stdout,
    stderr: res.stderr
  };
}

export async function executeGitAction(args: {
  cwd: string;
  git: GitRunner;
  action: string;
  params: Record<string, unknown>;
  signCommits?: boolean;
  signTags?: boolean;
}): Promise<GitActionOutcome> {
  const { cwd, git, action, params } = args;
  const str = (key: string): string => (typeof params[key] === 'string' ? (params[key] as string).trim() : '');
  const bool = (key: string): boolean => Boolean(params[key]);

  switch (action) {
    // --- Repository Lifecycle ---
    case 'init': {
      const initialBranch = str('initialBranch');
      if (initialBranch) {
        const safeBranch = assertSafeGitToken(initialBranch, 'branch');
        const res = await runGitMutation(cwd, git, ['init', '-b', safeBranch], 30_000);
        if (res.ok) return res;
      }
      return runGitMutation(cwd, git, ['init'], 30_000);
    }

    // --- Fetch / Pull / Push ---
    case 'fetch': {
      const remote = str('remote');
      const branch = str('branch');
      const prune = bool('prune');
      const pruneTags = bool('pruneTags');
      const force = bool('force');
      const cmd: string[] = ['fetch'];
      if (remote) {
        cmd.push(assertSafeGitToken(remote, 'remote'));
        if (branch) {
          const localBranch = str('localBranch');
          if (localBranch) {
            cmd.push(`${assertSafeGitToken(branch, 'branch')}:${assertSafeGitToken(localBranch, 'localBranch')}`);
          } else {
            cmd.push(assertSafeGitToken(branch, 'branch'));
          }
        }
      } else {
        cmd.push('--all');
      }
      if (prune) cmd.push('--prune');
      if (pruneTags) cmd.push('--prune-tags');
      if (force) cmd.push('--force');
      return runGitMutation(cwd, git, cmd, 60_000);
    }

    case 'pull': {
      const remote = assertSafeGitToken(str('remote') || 'origin', 'remote');
      const branch = str('branch');
      const noFastForward = bool('noFastForward');
      const squash = bool('squash');
      const cmd: string[] = ['pull'];
      if (noFastForward) cmd.push('--no-ff');
      if (squash) cmd.push('--squash');
      cmd.push(remote);
      if (branch) cmd.push(assertSafeGitToken(branch, 'branch'));
      return runGitMutation(cwd, git, cmd, 60_000);
    }

    case 'push': {
      const remote = assertSafeGitToken(str('remote') || 'origin', 'remote');
      const branch = assertSafeGitToken(str('branch'), 'branch');
      const setUpstream = bool('setUpstream');
      const forceMode = str('forceMode'); // 'none' | 'force-with-lease' | 'force'
      if (!setUpstream) {
        const remoteRef = `refs/remotes/${remote}/${branch}`;
        const hasRemoteRef = await git({ cwd, args: ['rev-parse', '--verify', '--quiet', remoteRef] });
        if (hasRemoteRef.code === 0) {
          const ahead = await git({ cwd, args: ['rev-list', '--count', `${remoteRef}..refs/heads/${branch}`] });
          if (ahead.code === 0 && Number(ahead.stdout.trim()) === 0) {
            return {
              ok: true,
              stdout: '',
              stderr: '',
              notice: `Nothing to push: ${branch} has no new commits compared with ${remote}/${branch}.`
            };
          }
        }
      }
      const cmd: string[] = ['push'];
      if (setUpstream) cmd.push('--set-upstream');
      if (forceMode === 'force-with-lease') cmd.push('--force-with-lease');
      else if (forceMode === 'force') cmd.push('--force');
      cmd.push(remote, branch);
      return runGitMutation(cwd, git, cmd, 60_000);
    }

    // --- Branch Actions ---
    case 'checkoutBranch': {
      const branch = assertSafeGitToken(str('branch'), 'branch');
      const remoteBranch = str('remoteBranch');
      if (remoteBranch) {
        return runGitMutation(cwd, git, [
          'checkout',
          '-b',
          branch,
          '--track',
          assertSafeGitToken(remoteBranch, 'remoteBranch')
        ]);
      }
      return runGitMutation(cwd, git, ['checkout', branch]);
    }

    case 'createBranch': {
      const branch = assertSafeGitToken(str('branch'), 'branch');
      const target = assertSafeGitToken(str('target') || 'HEAD', 'target commit');
      const checkout = bool('checkout');
      if (checkout) {
        return runGitMutation(cwd, git, ['checkout', '-b', branch, target]);
      }
      return runGitMutation(cwd, git, ['branch', branch, target]);
    }

    case 'renameBranch': {
      const oldName = assertSafeGitToken(str('oldName'), 'old branch name');
      const newName = assertSafeGitToken(str('newName'), 'new branch name');
      return runGitMutation(cwd, git, ['branch', '-m', oldName, newName]);
    }

    case 'deleteBranch': {
      const branch = assertSafeGitToken(str('branch'), 'branch');
      const force = bool('force');
      const deleteRemote = bool('deleteRemote');
      const remote = str('remote') || 'origin';
      const localRes = await runGitMutation(cwd, git, ['branch', force ? '-D' : '-d', branch]);
      if (!localRes.ok || !deleteRemote) return localRes;
      return runGitMutation(
        cwd,
        git,
        ['push', assertSafeGitToken(remote, 'remote'), '--delete', branch],
        60_000
      );
    }

    case 'deleteRemoteBranch': {
      const remote = assertSafeGitToken(str('remote'), 'remote');
      const branch = assertSafeGitToken(str('branch'), 'branch');
      return runGitMutation(cwd, git, ['push', remote, '--delete', branch], 60_000);
    }

    case 'merge': {
      const target = assertSafeGitToken(str('target'), 'merge target');
      const noFastForward = bool('noFastForward');
      const noCommit = bool('noCommit');
      const squash = bool('squash');
      const cmd: string[] = ['merge'];
      if (args.signCommits) cmd.push('-S');
      if (noFastForward) cmd.push('--no-ff');
      if (noCommit) cmd.push('--no-commit');
      if (squash) cmd.push('--squash');
      cmd.push(target);
      return runGitMutation(cwd, git, cmd);
    }

    case 'rebase': {
      const onto = assertSafeGitToken(str('onto'), 'rebase target');
      const cmd: string[] = ['rebase'];
      if (args.signCommits) cmd.push('-S');
      cmd.push(onto);
      return runGitMutation(cwd, git, cmd);
    }

    // --- Commit Actions ---
    case 'checkoutCommit': {
      const commit = assertSafeGitToken(str('commit'), 'commit');
      return runGitMutation(cwd, git, ['checkout', commit]);
    }

    case 'cherryPick': {
      const commit = assertSafeGitToken(str('commit'), 'commit');
      const noCommit = bool('noCommit');
      const recordOrigin = bool('recordOrigin');
      const parentIndex = typeof params.parentIndex === 'number' ? Math.max(1, Math.floor(params.parentIndex)) : 0;
      const cmd: string[] = ['cherry-pick'];
      if (args.signCommits) cmd.push('-S');
      if (noCommit) cmd.push('--no-commit');
      if (recordOrigin) cmd.push('-x');
      if (parentIndex > 0) cmd.push('-m', String(parentIndex));
      cmd.push(commit);
      return runGitMutation(cwd, git, cmd);
    }

    case 'revertCommit': {
      const commit = assertSafeGitToken(str('commit'), 'commit');
      const noCommit = bool('noCommit');
      const parentIndex = typeof params.parentIndex === 'number' ? Math.max(1, Math.floor(params.parentIndex)) : 0;
      const cmd: string[] = ['revert'];
      if (args.signCommits) cmd.push('-S');
      if (noCommit) cmd.push('--no-commit');
      else cmd.push('--no-edit');
      if (parentIndex > 0) cmd.push('-m', String(parentIndex));
      cmd.push(commit);
      return runGitMutation(cwd, git, cmd);
    }

    case 'resetToCommit': {
      const commit = assertSafeGitToken(str('commit'), 'commit');
      const modeRaw = str('mode');
      const mode = modeRaw === 'soft' || modeRaw === 'hard' ? modeRaw : 'mixed';
      return runGitMutation(cwd, git, ['reset', `--${mode}`, commit]);
    }

    case 'dropCommit': {
      const commit = assertSafeGitToken(str('commit'), 'commit');
      const branch = str('branch');
      // Verify the commit has a parent; root commits cannot be dropped via rebase --onto
      const revParseRes = await git({
        cwd,
        args: ['rev-parse', '--verify', '-q', `${commit}^`],
        timeoutMs: 5_000
      });
      if (revParseRes.code !== 0) {
        return {
          ok: false,
          stdout: '',
          stderr: revParseRes.stderr,
          error: `Cannot drop commit ${commit.slice(0, 7)}: root commits have no parent to rebase onto.`
        };
      }
      const rebaseArgs = ['rebase', '--onto', `${commit}^`, commit];
      if (branch) {
        rebaseArgs.push(assertSafeGitToken(branch, 'branch'));
      }
      return runGitMutation(cwd, git, rebaseArgs);
    }

    // --- Tag Actions ---
    case 'addTag': {
      const tag = assertSafeGitToken(str('tag'), 'tag name');
      const commit = assertSafeGitToken(str('commit') || 'HEAD', 'commit');
      const annotated = bool('annotated');
      const message = str('message');
      const force = bool('force');
      const pushToRemote = str('pushToRemote');
      const cmd: string[] = ['tag'];
      if (force) cmd.push('-f');
      if (annotated || args.signTags) {
        cmd.push(args.signTags ? '-s' : '-a', tag, '-m', message || tag, commit);
      } else {
        cmd.push(tag, commit);
      }
      const res = await runGitMutation(cwd, git, cmd);
      if (!res.ok || !pushToRemote) return res;
      return runGitMutation(
        cwd,
        git,
        ['push', assertSafeGitToken(pushToRemote, 'remote'), `refs/tags/${tag}`],
        60_000
      );
    }

    case 'deleteTag': {
      const tag = assertSafeGitToken(str('tag'), 'tag name');
      const deleteFromRemote = str('deleteFromRemote');
      const res = await runGitMutation(cwd, git, ['tag', '-d', tag]);
      if (!res.ok || !deleteFromRemote) return res;
      return runGitMutation(
        cwd,
        git,
        ['push', assertSafeGitToken(deleteFromRemote, 'remote'), '--delete', `refs/tags/${tag}`],
        60_000
      );
    }

    case 'pushTag': {
      const tag = assertSafeGitToken(str('tag'), 'tag name');
      const remote = assertSafeGitToken(str('remote') || 'origin', 'remote');
      return runGitMutation(cwd, git, ['push', remote, `refs/tags/${tag}`], 60_000);
    }

    // --- Stash & Uncommitted Actions ---
    case 'commitUncommitted': {
      const message = str('message');
      if (!message) return { ok: false, stdout: '', stderr: '', error: 'Commit message is required.' };
      const staged = await runGitMutation(cwd, git, ['add', '-A']);
      if (!staged.ok) return staged;
      return runGitMutation(cwd, git, ['commit', '-m', message]);
    }

    case 'stashPush': {
      const message = str('message');
      const includeUntracked = bool('includeUntracked');
      const cmd: string[] = ['stash', 'push'];
      if (includeUntracked) cmd.push('--include-untracked');
      if (message) cmd.push('-m', message);
      const res = await runGitMutation(cwd, git, cmd);
      if (!res.ok && res.error && /you do not have the initial commit yet/i.test(res.error)) {
        return {
          ...res,
          error:
            'Cannot stash: Git requires at least one commit in the repository before stashing. Please create an initial commit first.'
        };
      }
      return res;
    }

    case 'stashPop': {
      const selector = assertSafeGitToken(str('selector') || 'stash@{0}', 'stash selector');
      const reinstateIndex = bool('reinstateIndex');
      const cmd = ['stash', 'pop'];
      if (reinstateIndex) cmd.push('--index');
      cmd.push(selector);
      return runGitMutation(cwd, git, cmd);
    }

    case 'stashApply': {
      const selector = assertSafeGitToken(str('selector') || 'stash@{0}', 'stash selector');
      const reinstateIndex = bool('reinstateIndex');
      const cmd = ['stash', 'apply'];
      if (reinstateIndex) cmd.push('--index');
      cmd.push(selector);
      return runGitMutation(cwd, git, cmd);
    }

    case 'stashDrop': {
      const selector = assertSafeGitToken(str('selector') || 'stash@{0}', 'stash selector');
      return runGitMutation(cwd, git, ['stash', 'drop', selector]);
    }

    case 'stashBranch': {
      const branch = assertSafeGitToken(str('branch'), 'branch name');
      const selector = assertSafeGitToken(str('selector') || 'stash@{0}', 'stash selector');
      return runGitMutation(cwd, git, ['stash', 'branch', branch, selector]);
    }

    case 'resetUncommitted': {
      const mode = str('mode') === 'hard' ? 'hard' : 'mixed';
      return runGitMutation(cwd, git, ['reset', `--${mode}`, 'HEAD']);
    }

    case 'cleanUntracked': {
      const includeDirectories = bool('includeDirectories');
      const cmd = ['clean', '-f'];
      if (includeDirectories) cmd.push('-d');
      return runGitMutation(cwd, git, cmd);
    }

    case 'discardAll': {
      const resetRes = await runGitMutation(cwd, git, ['reset', '--hard', 'HEAD']);
      if (!resetRes.ok) return resetRes;
      return runGitMutation(cwd, git, ['clean', '-f', '-d']);
    }

    // --- Remote Management ---
    case 'addRemote': {
      const name = assertSafeGitToken(str('name'), 'remote name');
      const url = assertSafeGitToken(str('url'), 'remote URL');
      const fetchNow = bool('fetch');
      const cmd = ['remote', 'add'];
      if (fetchNow) cmd.push('-f');
      cmd.push(name, url);
      return runGitMutation(cwd, git, cmd, 60_000);
    }

    case 'editRemote': {
      const oldName = assertSafeGitToken(str('oldName'), 'remote name');
      const newName = assertSafeGitToken(str('newName') || oldName, 'new remote name');
      const url = assertSafeGitToken(str('url'), 'remote URL');
      if (oldName !== newName) {
        const renameRes = await runGitMutation(cwd, git, ['remote', 'rename', oldName, newName]);
        if (!renameRes.ok) return renameRes;
      }
      return runGitMutation(cwd, git, ['remote', 'set-url', newName, url]);
    }

    case 'deleteRemote': {
      const name = assertSafeGitToken(str('name'), 'remote name');
      return runGitMutation(cwd, git, ['remote', 'remove', name]);
    }

    case 'pruneRemote': {
      const name = assertSafeGitToken(str('name'), 'remote name');
      return runGitMutation(cwd, git, ['remote', 'prune', name], 60_000);
    }

    default:
      return {
        ok: false,
        stdout: '',
        stderr: '',
        error: `Unsupported Git action: ${action}`
      };
  }
}

/**
 * Loads annotated or lightweight tag details (`git show-ref` + `git cat-file`).
 */
export async function getTagDetails(args: {
  cwd: string;
  git: GitRunner;
  tagName: string;
}): Promise<GitTagDetails> {
  const safeTag = assertSafeGitToken(args.tagName, 'tag name');
  const typeRes = await args.git({
    cwd: args.cwd,
    args: ['cat-file', '-t', `refs/tags/${safeTag}`],
    timeoutMs: 5_000
  });
  const isAnnotated = typeRes.code === 0 && typeRes.stdout.trim() === 'tag';

  if (!isAnnotated) {
    const revRes = await args.git({
      cwd: args.cwd,
      args: ['rev-parse', `refs/tags/${safeTag}`],
      timeoutMs: 5_000
    });
    return {
      name: safeTag,
      hash: revRes.stdout.trim(),
      isAnnotated: false
    };
  }

  const format = '%(*objectname)\x1f%(taggername)\x1f%(taggeremail)\x1f%(taggerdate:unix)\x1f%(contents)';
  const refRes = await args.git({
    cwd: args.cwd,
    args: ['for-each-ref', `--format=${format}`, `refs/tags/${safeTag}`],
    timeoutMs: 5_000
  });
  const [hash = '', taggerName = '', taggerEmail = '', dateStr = '0', ...msgParts] = refRes.stdout.split('\x1f');
  return {
    name: safeTag,
    hash: hash.trim(),
    isAnnotated: true,
    taggerName: taggerName.trim() || undefined,
    taggerEmail: taggerEmail.trim().replace(/^<|>$/g, '') || undefined,
    taggerDate: Number.parseInt(dateStr.trim(), 10) || undefined,
    message: msgParts.join('\x1f').trim() || undefined
  };
}

/**
 * Builds a Pull Request creation URL for GitHub, GitLab, Bitbucket, or custom provider template.
 */
export function buildPullRequestUrl(args: {
  sourceBranch: string;
  config: PullRequestConfig;
  remotes: GitRemoteInfo[];
}): string | null {
  const { sourceBranch, config, remotes } = args;
  const remote =
    remotes.find((r) => r.name === config.remoteName) ??
    remotes.find((r) => r.name === 'origin') ??
    remotes[0];
  if (!remote) return null;

  // Parse host and owner/repo from SSH or HTTPS remote URL
  const rawUrl = remote.pushUrl || remote.fetchUrl;
  let host = '';
  let owner = '';
  let repo = '';

  const sshMatch = /^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/.exec(rawUrl);
  const httpsMatch = /^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/.exec(rawUrl);
  const sshUrlMatch = /^ssh:\/\/(?:[^@]+@)?([^/:]+)(?::\d+)?\/([^/]+)\/(.+?)(?:\.git)?$/.exec(rawUrl);

  const match = sshMatch ?? httpsMatch ?? sshUrlMatch;
  if (match) {
    host = match[1];
    owner = match[2];
    repo = match[3].replace(/\.git$/i, '');
  }

  const target = config.targetBranch || 'main';
  const encSource = encodeURIComponent(sourceBranch);
  const encTarget = encodeURIComponent(target);

  if (config.provider === 'custom' && config.customUrlTemplate) {
    return config.customUrlTemplate
      .replace(/\$1/g, host)
      .replace(/\$2/g, owner)
      .replace(/\$3/g, repo)
      .replace(/\$4/g, encSource)
      .replace(/\$5/g, encTarget);
  }

  if (!host || !owner || !repo) return null;
  const baseUrl = `https://${host}/${owner}/${repo}`;

  if (config.provider === 'gitlab' || host.includes('gitlab')) {
    return `${baseUrl}/-/merge_requests/new?merge_request[source_branch]=${encSource}&merge_request[target_branch]=${encTarget}`;
  }
  if (config.provider === 'bitbucket' || host.includes('bitbucket')) {
    return `${baseUrl}/pull-requests/new?source=${encSource}&dest=${encTarget}&t=1`;
  }
  return `${baseUrl}/compare/${encTarget}...${encSource}?expand=1`;
}
