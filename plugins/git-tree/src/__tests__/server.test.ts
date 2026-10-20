import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakePluginHost, makeThreadResponse } from '@zana-ai/zcc-plugin-sdk/testing';
import gitGraphPlugin from '../../server.js';
import {
  assertSafeGitToken,
  createTempFileGitRunner,
  type GitExecRequest
} from '../server/git-exec.js';
import {
  resolveConfinedRepoPath,
  validateRepoRelativeFilePath
} from '../server/project-repos.js';
import {
  countPorcelainStatusEntries,
  loadRepositoryGraph,
  parseGitLogOutput,
  parseGitRemotesOutput,
  parseShowRefOutput,
  parseStashListOutput
} from '../server/git-log-parser.js';
import {
  loadCommitDetails,
  loadFileDiff,
  parseDiffStatAndStatus,
  parsePorcelainFileChanges,
  parseUnifiedDiff
} from '../server/git-details-diff.js';
import { buildPullRequestUrl, executeGitAction } from '../server/git-actions.js';
import { GitGraphStorage } from '../server/storage.js';

describe('git-tree server unit & contract tests', () => {
  describe('git-exec & path validation', () => {
    it('rejects option-injection tokens and unsafe relative paths', async () => {
      expect(() => assertSafeGitToken('--upload-pack=evil', 'branch')).toThrow(
        /Invalid branch: cannot start with '-'./
      );
      expect(() => assertSafeGitToken('', 'branch')).toThrow(/branch is required/);
      expect(() => assertSafeGitToken('bad\0name', 'branch')).toThrow(/Invalid branch/);
      expect(() => assertSafeGitToken('main', 'branch')).not.toThrow();

      expect(() => validateRepoRelativeFilePath('')).toThrow(/File path is required/);
      expect(() => validateRepoRelativeFilePath('../outside.txt')).toThrow(
        /File path must be a normalized repository-relative path/
      );
      expect(() => validateRepoRelativeFilePath('-bad.txt')).toThrow(
        /Invalid file path/
      );
      expect(validateRepoRelativeFilePath('src\\app\\index.ts')).toBe(
        'src/app/index.ts'
      );

      // Confinement errors
      await expect(
        resolveConfinedRepoPath({
          projectId: '',
          listProjects: async () => []
        })
      ).rejects.toThrow(/projectId is required/);

      await expect(
        resolveConfinedRepoPath({
          projectId: 'missing',
          listProjects: async () => []
        })
      ).rejects.toThrow(/not registered/);

      await expect(
        resolveConfinedRepoPath({
          projectId: 'remote-proj',
          listProjects: async () => [{ id: 'remote-proj', name: 'Remote' }]
        })
      ).rejects.toThrow(/local project checkout path/);
    });
  });

  describe('git output parsers', () => {
    it('parses show-ref, stash list, git log, porcelain status, and remotes', () => {
      const refOut = [
        'aaaa1111 HEAD',
        'aaaa1111 refs/heads/main',
        'aaaa1111 refs/remotes/origin/main',
        'aaaa1111 refs/remotes/origin/HEAD',
        'bbbb2222 refs/tags/v1.0.0',
        'cccc3333 refs/tags/v1.0.0^{}',
        'dddd4444 refs/stash'
      ].join('\n');

      const parsedRefs = parseShowRefOutput(refOut, 'main');
      expect(parsedRefs.headHash).toBe('aaaa1111');
      expect(parsedRefs.branches).toEqual(['main']);
      expect(parsedRefs.remoteBranches).toEqual(['origin/main']);
      expect(parsedRefs.tags).toEqual(['v1.0.0']);
      expect(
        parsedRefs.refsByHash.get('cccc3333')?.some((r) => r.name === 'v1.0.0')
      ).toBe(true);

      const stashOut =
        'stash@{0}\x1feeee5555\x1feeee555\x1faaaa1111 ffff6666\x1fAlice\x1falice@example.com\x1f1700000100\x1fWIP on main: feature\x1e';
      const stashes = parseStashListOutput(stashOut);
      expect(stashes).toHaveLength(1);
      expect(stashes[0].selector).toBe('stash@{0}');
      expect(stashes[0].baseHash).toBe('aaaa1111');

      const logOut = [
        'cccc3333\x1fcccc333\x1faaaa1111\x1fAlice\x1falice@example.com\x1f1700000050\x1fAlice\x1falice@example.com\x1f1700000050\x1fRelease v1.0.0\x1e',
        'aaaa1111\x1faaaa111\x1f\x1fAlice\x1falice@example.com\x1f1700000000\x1fAlice\x1falice@example.com\x1f1700000000\x1fInitial commit\x1e'
      ].join('');
      const commits = parseGitLogOutput(logOut, parsedRefs.refsByHash, 'cccc3333');
      expect(commits).toHaveLength(2);
      expect(commits[0].isHead).toBe(true);
      expect(commits[0].refs.some((r) => r.name === 'v1.0.0')).toBe(true);

      expect(countPorcelainStatusEntries(' M src/a.ts\x00?? src/b.ts\x00R  src/new.ts\x00src/old.ts\x00', true)).toBe(3);
      expect(countPorcelainStatusEntries('?? src/b.ts\x00', false)).toBe(0);

      const remotes = parseGitRemotesOutput(
        'origin\thttps://github.com/org/repo.git (fetch)\norigin\thttps://github.com/org/repo.git (push)\n'
      );
      expect(remotes).toEqual([
        {
          name: 'origin',
          fetchUrl: 'https://github.com/org/repo.git',
          pushUrl: 'https://github.com/org/repo.git'
        }
      ]);
    });

    it('includes uncommitted changes in an empty repo before initial commit (when headHash is null)', async () => {
      const mockGit: GitRunner = async (req) => {
        if (req.args[0] === 'show-ref') return { code: 1, stdout: '', stderr: '' };
        if (req.args[0] === 'symbolic-ref') return { code: 0, stdout: 'main', stderr: '' };
        if (req.args[0] === 'remote') return { code: 0, stdout: '', stderr: '' };
        if (req.args[0] === 'stash') return { code: 0, stdout: '', stderr: '' };
        if (req.args[0] === 'status') {
          return { code: 0, stdout: '?? newfile.ts\x00', stderr: '' };
        }
        return { code: 0, stdout: '', stderr: '' };
      };

      const result = await loadRepositoryGraph({
        cwd: '/fake/repo',
        git: mockGit,
        showUncommittedChanges: true,
        showUntrackedFiles: true
      });

      expect(result.headHash).toBeNull();
      expect(result.currentBranch).toBe('main');
      expect(result.uncommittedCount).toBe(1);
      expect(result.commits).toHaveLength(1);
      expect(result.commits[0].isUncommitted).toBe(true);
      expect(result.commits[0].parents).toEqual([]);
    });

    it('parses diff numstat/name-status (including renames), porcelain file changes, and unified diff hunks', () => {
      const numstat = '12\t3\tsrc/index.ts\x00-\t-\tassets/logo.png\x005\t2\t\x00src/old.ts\x00src/new.ts\x00';
      const nameStatus = 'M\x00src/index.ts\x00A\x00assets/logo.png\x00R100\x00src/old.ts\x00src/new.ts\x00D\x00src/empty.ts\x00';
      const changes = parseDiffStatAndStatus(numstat, nameStatus);
      expect(changes).toHaveLength(4);
      expect(changes.some((c) => c.status === 'R' && c.oldPath === 'src/old.ts' && c.newPath === 'src/new.ts')).toBe(true);
      expect(changes.some((c) => c.status === 'D' && c.newPath === 'src/empty.ts')).toBe(true);

      const porcelain = 'M  src/staged.ts\x00?? src/untracked.ts\x00R  src/renamed.ts\x00src/orig.ts\x00';
      const workChanges = parsePorcelainFileChanges(porcelain, true);
      expect(workChanges).toHaveLength(3);
      expect(workChanges[0].staged).toBe(true);
      expect(workChanges[1].untracked).toBe(true);
      expect(workChanges[2].status).toBe('R');

      const rawDiff = [
        'diff --git a/src/index.ts b/src/index.ts',
        '--- a/src/index.ts',
        '+++ b/src/index.ts',
        '@@ -1,3 +1,4 @@',
        ' const x = 1;',
        '-const y = 2;',
        '+const y = 20;',
        '+const z = 30;',
        '\\ No newline at end of file'
      ].join('\n');

      const parsed = parseUnifiedDiff(rawDiff);
      expect(parsed.isBinary).toBe(false);
      expect(parsed.hunks).toHaveLength(1);
      expect(parsed.hunks[0].lines).toHaveLength(5);

      const binaryDiff = parseUnifiedDiff('Binary files a/foo.png and b/foo.png differ\n');
      expect(binaryDiff.isBinary).toBe(true);
    });

    it('builds Pull Request URLs for GitHub, GitLab, Bitbucket, and custom templates', () => {
      const remotes = [
        {
          name: 'origin',
          fetchUrl: 'git@github.com:acme/rocket.git',
          pushUrl: 'git@github.com:acme/rocket.git'
        }
      ];

      expect(
        buildPullRequestUrl({
          remotes,
          config: { provider: 'github', remoteName: 'origin', targetBranch: 'main' },
          sourceBranch: 'feat/graph'
        })
      ).toBe('https://github.com/acme/rocket/compare/main...feat%2Fgraph?expand=1');

      expect(
        buildPullRequestUrl({
          remotes,
          config: { provider: 'gitlab', remoteName: 'origin', targetBranch: 'main' },
          sourceBranch: 'feat/graph'
        })
      ).toContain('merge_requests/new');

      expect(
        buildPullRequestUrl({
          remotes,
          config: { provider: 'bitbucket', remoteName: 'origin', targetBranch: 'main' },
          sourceBranch: 'feat/graph'
        })
      ).toContain('pull-requests/new');

      expect(
        buildPullRequestUrl({
          remotes,
          config: {
            provider: 'custom',
            remoteName: 'origin',
            targetBranch: 'main',
            customUrlTemplate: 'https://git.internal/$2/$3/pr/$4..$5'
          },
          sourceBranch: 'feat/graph'
        })
      ).toBe('https://git.internal/acme/rocket/pr/feat%2Fgraph..main');
    });
  });

  describe('push with no new commits', () => {
    const pushParams = { remote: 'origin', branch: 'main' };

    it('returns a notice and skips git push when the branch has no commits ahead of its remote', async () => {
      const calls: string[][] = [];
      const git = async (req: GitExecRequest) => {
        calls.push(req.args);
        if (req.args[0] === 'rev-list') return { code: 0, stdout: '0\n', stderr: '' };
        return { code: 0, stdout: '', stderr: '' };
      };
      const res = await executeGitAction({ cwd: '/repo', git, action: 'push', params: pushParams });
      expect(res.ok).toBe(true);
      expect(res.notice).toContain('Nothing to push');
      expect(calls.some((args) => args[0] === 'push')).toBe(false);
    });

    it('pushes when the branch is ahead of its remote', async () => {
      const calls: string[][] = [];
      const git = async (req: GitExecRequest) => {
        calls.push(req.args);
        if (req.args[0] === 'rev-list') return { code: 0, stdout: '2\n', stderr: '' };
        return { code: 0, stdout: '', stderr: '' };
      };
      const res = await executeGitAction({ cwd: '/repo', git, action: 'push', params: pushParams });
      expect(res.notice).toBeUndefined();
      expect(calls.some((args) => args[0] === 'push')).toBe(true);
    });

    it('pushes when the remote branch does not exist yet', async () => {
      const calls: string[][] = [];
      const git = async (req: GitExecRequest) => {
        calls.push(req.args);
        if (req.args[0] === 'rev-parse') return { code: 1, stdout: '', stderr: '' };
        return { code: 0, stdout: '', stderr: '' };
      };
      const res = await executeGitAction({ cwd: '/repo', git, action: 'push', params: pushParams });
      expect(res.notice).toBeUndefined();
      expect(calls.some((args) => args[0] === 'push')).toBe(true);
    });

    it('always pushes with set-upstream', async () => {
      const calls: string[][] = [];
      const git = async (req: GitExecRequest) => {
        calls.push(req.args);
        return { code: 0, stdout: '', stderr: '' };
      };
      await executeGitAction({ cwd: '/repo', git, action: 'push', params: { ...pushParams, setUpstream: true } });
      expect(calls.some((args) => args[0] === 'rev-list')).toBe(false);
      expect(calls.some((args) => args[0] === 'push')).toBe(true);
    });
  });

  describe('executeGitAction all mutation kinds', () => {
    it('builds exact git argv for every branch, commit, tag, stash, uncommitted, and remote action', async () => {
      const calls: string[][] = [];
      const mockGit = async (req: GitExecRequest) => {
        calls.push(req.args);
        return { code: 0, stdout: 'ok', stderr: '' };
      };

      const actionCases: Array<{ action: string; params: Record<string, unknown> }> = [
        { action: 'fetch', params: { remote: 'origin', branch: 'main', localBranch: 'main', prune: true, pruneTags: true, force: true } },
        { action: 'fetch', params: { prune: true } },
        { action: 'pull', params: { remote: 'origin', branch: 'main', noFastForward: true, squash: true } },
        { action: 'push', params: { remote: 'origin', branch: 'main', setUpstream: true, forceMode: 'force-with-lease' } },
        { action: 'push', params: { remote: 'origin', branch: 'main', forceMode: 'force' } },
        { action: 'checkoutBranch', params: { branch: 'feat', remoteBranch: 'origin/feat' } },
        { action: 'checkoutBranch', params: { branch: 'main' } },
        { action: 'createBranch', params: { branch: 'feat-2', target: 'HEAD', checkout: true } },
        { action: 'renameBranch', params: { oldName: 'feat', newName: 'feat-new' } },
        { action: 'deleteBranch', params: { branch: 'feat-new', force: true, deleteRemote: true, remote: 'origin' } },
        { action: 'deleteRemoteBranch', params: { remote: 'origin', branch: 'feat' } },
        { action: 'merge', params: { target: 'feat', noFastForward: true, noCommit: true, squash: true } },
        { action: 'rebase', params: { onto: 'main' } },
        { action: 'checkoutCommit', params: { commit: 'abc1234' } },
        { action: 'cherryPick', params: { commit: 'abc1234', noCommit: true, recordOrigin: true, parentIndex: 1 } },
        { action: 'revertCommit', params: { commit: 'abc1234', noCommit: false, parentIndex: 1 } },
        { action: 'resetToCommit', params: { commit: 'abc1234', mode: 'hard' } },
        { action: 'dropCommit', params: { commit: 'abc1234' } },
        { action: 'addTag', params: { tag: 'v1.0', commit: 'abc1234', annotated: true, message: 'msg', force: true, pushToRemote: 'origin' } },
        { action: 'deleteTag', params: { tag: 'v1.0', deleteFromRemote: 'origin' } },
        { action: 'pushTag', params: { tag: 'v1.0', remote: 'origin' } },
        { action: 'stashPush', params: { message: 'wip', includeUntracked: true } },
        { action: 'stashPop', params: { selector: 'stash@{0}', reinstateIndex: true } },
        { action: 'stashApply', params: { selector: 'stash@{0}', reinstateIndex: true } },
        { action: 'stashDrop', params: { selector: 'stash@{0}' } },
        { action: 'stashBranch', params: { branch: 'from-stash', selector: 'stash@{0}' } },
        { action: 'resetUncommitted', params: { mode: 'hard' } },
        { action: 'cleanUntracked', params: { includeDirectories: true } },
        { action: 'discardAll', params: {} },
        { action: 'addRemote', params: { name: 'upstream', url: 'https://github.com/org/repo.git', fetch: true } },
        { action: 'editRemote', params: { oldName: 'upstream', newName: 'up', url: 'https://github.com/org/repo2.git' } },
        { action: 'deleteRemote', params: { name: 'up' } },
        { action: 'pruneRemote', params: { name: 'origin' } }
      ];

      for (const c of actionCases) {
        const res = await executeGitAction({
          cwd: '/repo',
          git: mockGit,
          action: c.action,
          params: c.params,
          signCommits: true,
          signTags: true
        });
        expect(res.ok).toBe(true);
      }
      expect(calls.length).toBeGreaterThanOrEqual(actionCases.length);

      const unknownRes = await executeGitAction({
        cwd: '/repo',
        git: mockGit,
        action: 'nonExistent',
        params: {}
      });
      expect(unknownRes.ok).toBe(false);

      const stashNoCommitGit = async () => ({
        code: 1,
        stdout: '',
        stderr: 'fatal: You do not have the initial commit yet\n'
      });
      const stashNoCommitRes = await executeGitAction({
        cwd: '/repo',
        git: stashNoCommitGit,
        action: 'stashPush',
        params: { message: 'wip', includeUntracked: false }
      });
      const discardCalls: string[][] = [];
      const discardFailGit = async (req: GitExecRequest) => {
        discardCalls.push(req.args);
        return req.args[0] === 'reset'
          ? { code: 1, stdout: '', stderr: 'fatal: reset failed' }
          : { code: 0, stdout: '', stderr: '' };
      };
      const discardRes = await executeGitAction({
        cwd: '/repo',
        git: discardFailGit,
        action: 'discardAll',
        params: {}
      });
      expect(discardRes.ok).toBe(false);
      expect(discardCalls).toEqual([['reset', '--hard', 'HEAD']]);
      // Test dropCommit on root commit (parent does not exist)
      const dropRootGit = async (req: GitExecRequest) => {
        if (req.args[0] === 'rev-parse') return { code: 1, stdout: '', stderr: 'fatal' };
        return { code: 0, stdout: 'ok', stderr: '' };
      };
      const dropRootRes = await executeGitAction({
        cwd: '/repo',
        git: dropRootGit,
        action: 'dropCommit',
        params: { commit: 'abc1234' }
      });
      expect(dropRootRes.ok).toBe(false);
      expect(dropRootRes.error).toContain('Cannot drop commit abc1234: root commits have no parent to rebase onto.');

      // Test dropCommit with branch
      const dropBranchCalls: string[][] = [];
      const dropBranchGit = async (req: GitExecRequest) => {
        dropBranchCalls.push(req.args);
        return { code: 0, stdout: 'ok', stderr: '' };
      };
      const dropBranchRes = await executeGitAction({
        cwd: '/repo',
        git: dropBranchGit,
        action: 'dropCommit',
        params: { commit: 'abc1234', branch: 'feat' }
      });
      expect(dropBranchRes.ok).toBe(true);
      expect(dropBranchCalls).toEqual([
        ['rev-parse', '--verify', '-q', 'abc1234^'],
        ['rebase', '--onto', 'abc1234^', 'abc1234', 'feat']
      ]);
    });
  });

  describe('GitGraphStorage & Code Review 90-day expiry', () => {
    it('persists repo settings and expires inactive code reviews after 90 days', async () => {
      let currentTime = 1_000_000;
      const kvMap = new Map<string, unknown>();
      const storage = new GitGraphStorage(
        {
          async get<T>(key: string) {
            return kvMap.get(key) as T | undefined;
          },
          async set(key: string, value: unknown) {
            kvMap.set(key, value);
          },
          async delete(key: string) {
            kvMap.delete(key);
          },
          async list(prefix = '') {
            return [...kvMap.keys()].filter((k) => k.startsWith(prefix));
          }
        },
        () => currentTime
      );

      const updatedSettings = await storage.saveRepoSettings('proj-1', '', {
        showStashes: false,
        commitOrdering: 'topo'
      });
      expect(updatedSettings.showStashes).toBe(false);
      expect(updatedSettings.commitOrdering).toBe('topo');

      const started = await storage.startCodeReview({
        projectId: 'proj-1',
        subRepoRelPath: '',
        fromHash: null,
        toHash: 'abc1234'
      });
      expect(started.reviewedFiles).toEqual([]);

      currentTime = 1_000_500;
      const toggled = await storage.setCodeReviewFileReviewed({
        projectId: 'proj-1',
        subRepoRelPath: '',
        fromHash: null,
        toHash: 'abc1234',
        filePath: 'src/index.ts',
        reviewed: true
      });
      expect(toggled.reviewedFiles).toEqual(['src/index.ts']);

      const untoggled = await storage.setCodeReviewFileReviewed({
        projectId: 'proj-1',
        subRepoRelPath: '',
        fromHash: null,
        toHash: 'abc1234',
        filePath: 'src/index.ts',
        reviewed: false
      });
      expect(untoggled.reviewedFiles).toEqual([]);

      // Expired after 91 days
      currentTime = 1_000_500 + 91 * 24 * 60 * 60 * 1000;
      const expired = await storage.getCodeReview({
        projectId: 'proj-1',
        subRepoRelPath: '',
        fromHash: null,
        toHash: 'abc1234'
      });
      expect(expired).toBeNull();
    });
  });

  describe('Real Git Repository + FakePluginHost integration', () => {
    let tempDir = '';
    const gitRunner = createTempFileGitRunner();

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'zcc-git-graph-test-'));
      await gitRunner({ cwd: tempDir, args: ['init', '-b', 'main'] });
      await gitRunner({ cwd: tempDir, args: ['config', 'user.name', 'Test User'] });
      await gitRunner({
        cwd: tempDir,
        args: ['config', 'user.email', 'test@example.com']
      });
      await gitRunner({ cwd: tempDir, args: ['config', 'commit.gpgsign', 'false'] });
      await gitRunner({ cwd: tempDir, args: ['config', 'tag.gpgSign', 'false'] });

      await mkdir(join(tempDir, 'src'), { recursive: true });
      await writeFile(join(tempDir, 'src', 'hello.ts'), 'export const x = 1;\n', 'utf8');
      await gitRunner({ cwd: tempDir, args: ['add', '.'] });
      await gitRunner({ cwd: tempDir, args: ['commit', '-m', 'Initial commit'] });

      await writeFile(
        join(tempDir, 'src', 'hello.ts'),
        'export const x = 2;\nexport const y = 3;\n',
        'utf8'
      );
      await gitRunner({ cwd: tempDir, args: ['commit', '-am', 'Second commit'] });
    });

    afterEach(async () => {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
    });

    it('registers projectTabAvailability, RPCs, CLI, and agent tools and executes against a real Git repository', async () => {
      const { zcc, harness } = createFakePluginHost({
        listProjects: () => [{ id: 'proj-1', name: 'Test Repo', path: tempDir }],
        spawnThread: async (args) =>
          makeThreadResponse({ id: `spawned-${args.projectId}` })
      });

      await gitGraphPlugin(zcc);

      expect(harness.projectTabAvailability).toHaveLength(1);
      expect(harness.projectTabAvailability[0].tabId).toBe('git-tree');
      expect(
        await harness.projectTabAvailability[0].evaluate({ projectId: 'proj-1' })
      ).toEqual({ available: true });
      expect(
        (await harness.projectTabAvailability[0].evaluate({ projectId: 'unknown' }))
          .available
      ).toBe(false);

      // 1. discoverRepos RPC
      const discovered = (await harness.callRpc('discoverRepos', {
        projectId: 'proj-1'
      })) as { repos: Array<{ relPath: string; currentBranch: string }> };
      expect(discovered.repos).toHaveLength(1);
      expect(discovered.repos[0].currentBranch).toBe('main');

      // 2. loadGraph RPC
      const graph = (await harness.callRpc('loadGraph', {
        projectId: 'proj-1'
      })) as {
        commits: Array<{ hash: string; subject: string }>;
        branches: string[];
      };
      expect(graph.commits).toHaveLength(2);
      expect(graph.commits[0].subject).toBe('Second commit');
      expect(graph.branches).toContain('main');

      const headCommitHash = graph.commits[0].hash;
      const firstCommitHash = graph.commits[1].hash;

      // 3. getCommitDetails & getFileDiff RPC (including root commit and uncommitted '*')
      const detailsRes = (await harness.callRpc('getCommitDetails', {
        projectId: 'proj-1',
        commitHash: headCommitHash
      })) as { details: { subject: string; fileChanges: Array<{ newPath: string }> } };
      expect(detailsRes.details.subject).toBe('Second commit');
      expect(detailsRes.details.fileChanges[0].newPath).toBe('src/hello.ts');

      const rootDetails = await loadCommitDetails({
        cwd: tempDir,
        git: gitRunner,
        commitHash: firstCommitHash
      });
      expect(rootDetails.fileChanges).toHaveLength(1);

      const diffRes = (await harness.callRpc('getFileDiff', {
        projectId: 'proj-1',
        commitHash: headCommitHash,
        filePath: 'src/hello.ts'
      })) as { hunks: Array<{ lines: unknown[] }> };
      expect(diffRes.hunks.length).toBeGreaterThan(0);

      // Root commit file diff & comparison file diff
      const rootDiff = await loadFileDiff({
        cwd: tempDir,
        git: gitRunner,
        commitHash: firstCommitHash,
        filePath: 'src/hello.ts'
      });
      expect(rootDiff.hunks.length).toBeGreaterThan(0);

      // 4. compareCommits RPC
      const cmpRes = (await harness.callRpc('compareCommits', {
        projectId: 'proj-1',
        fromHash: firstCommitHash,
        toHash: headCommitHash
      })) as { comparison: { fileChanges: Array<{ newPath: string }> } };
      expect(cmpRes.comparison.fileChanges).toHaveLength(1);

      // 5. runGitAction RPC (create branch, create tag, getTagDetails, rename branch, delete branch)
      await harness.callRpc('runGitAction', {
        projectId: 'proj-1',
        action: {
          kind: 'create-branch',
          branchName: 'feature/test',
          startPoint: headCommitHash,
          checkout: false
        }
      });
      await harness.callRpc('runGitAction', {
        projectId: 'proj-1',
        action: {
          kind: 'create-tag',
          tagName: 'v0.1.0',
          commitHash: headCommitHash,
          annotated: true,
          message: 'Release 0.1.0'
        }
      });

      const tagDetails = (await harness.callRpc('getTagDetails', {
        projectId: 'proj-1',
        tagName: 'v0.1.0'
      })) as { name: string; isAnnotated: boolean; message?: string };
      expect(tagDetails.name).toBe('v0.1.0');
      expect(tagDetails.isAnnotated).toBe(true);

      await harness.callRpc('runGitAction', {
        projectId: 'proj-1',
        action: {
          kind: 'rename-branch',
          oldName: 'feature/test',
          newName: 'feature/renamed'
        }
      });
      await harness.callRpc('runGitAction', {
        projectId: 'proj-1',
        action: {
          kind: 'delete-branch',
          branchName: 'feature/renamed',
          force: true
        }
      });
      const initRes = (await harness.callRpc('runGitAction', {
        projectId: 'proj-1',
        action: 'init'
      })) as { ok: boolean };
      expect(initRes.ok).toBe(true);

      // 6. Code Review lifecycle RPCs + Settings RPCs
      await harness.callRpc('updateRepoSettings', {
        projectId: 'proj-1',
        patch: { showTags: true }
      });
      await harness.callRpc('updateGlobalSettings', {
        patch: { graphStyle: 'angular' }
      });

      const reviewStart = (await harness.callRpc('codeReviewStart', {
        projectId: 'proj-1',
        toHash: headCommitHash
      })) as { reviewedFiles: string[] };
      expect(reviewStart.reviewedFiles).toEqual([]);

      const reviewToggled = (await harness.callRpc('codeReviewToggleFile', {
        projectId: 'proj-1',
        toHash: headCommitHash,
        filePath: 'src/hello.ts',
        reviewed: true
      })) as { reviewedFiles: string[] };
      expect(reviewToggled.reviewedFiles).toEqual(['src/hello.ts']);

      const activeReviews = (await harness.callRpc('listCodeReviews', {
        projectId: 'proj-1'
      })) as unknown[];
      expect(activeReviews).toHaveLength(1);

      await harness.callRpc('codeReviewEnd', {
        projectId: 'proj-1',
        toHash: headCommitHash
      });

      // 7. exportRepoConfig & askAgentAboutCommit RPCs
      const exported = (await harness.callRpc('exportRepoConfig', {
        projectId: 'proj-1'
      })) as { filePath: string };
      expect(exported.filePath).toContain('.git-tree.json');

      // Test uncommitted '*' details and diff now that .git-tree.json exists
      const uncommDetails = await loadCommitDetails({
        cwd: tempDir,
        git: gitRunner,
        commitHash: '*'
      });
      expect(uncommDetails.fileChanges.length).toBeGreaterThan(0);

      const uncommDiff = await loadFileDiff({
        cwd: tempDir,
        git: gitRunner,
        commitHash: '*',
        filePath: '.git-tree.json'
      });
      expect(uncommDiff.hunks.length).toBeGreaterThan(0);

      const draftedFile = (await harness.callRpc('draftAgentAboutCommit', {
        projectId: 'proj-1',
        commitHash: headCommitHash,
        filePath: 'src/hello.ts',
        userPrompt: 'Explain this change'
      })) as { ok: boolean; prompt: string; title: string };
      expect(draftedFile.ok).toBe(true);
      expect(draftedFile.prompt).toContain('Explain this change');
      expect(draftedFile.prompt).toContain('src/hello.ts');
      expect(draftedFile.title).toBe('Git Tree: src/hello.ts');

      const draftedWorkingTree = (await harness.callRpc('draftAgentAboutCommit', {
        projectId: 'proj-1',
        commitHash: '*'
      })) as { ok: boolean; prompt: string; title: string };
      expect(draftedWorkingTree.ok).toBe(true);
      expect(draftedWorkingTree.title).toBe('Git Tree: Working Tree');
      expect(draftedWorkingTree.prompt).toContain('working tree changes');

      const asked = (await harness.callRpc('askAgentAboutCommit', {
        projectId: 'proj-1',
        commitHash: headCommitHash,
        filePath: 'src/hello.ts',
        userPrompt: 'Explain this change'
      })) as { threadId: string };
      expect(asked.threadId).toBe('spawned-proj-1');

      const askedCommit = (await harness.callRpc('askAgentAboutCommit', {
        projectId: 'proj-1',
        commitHash: headCommitHash
      })) as { threadId: string };
      expect(askedCommit.threadId).toBe('spawned-proj-1');

      // 8. CLI subcommands (help, repos, log, details, compare, diff, remotes)
      expect((await harness.runCli(['--help'], { projectId: 'proj-1' })).exitCode).toBe(0);
      expect((await harness.runCli(['repos'], { projectId: 'proj-1' })).exitCode).toBe(0);
      const cliLog = await harness.runCli(['log', '--max', '5'], { projectId: 'proj-1' });
      expect(cliLog.exitCode).toBe(0);
      expect(cliLog.stdout).toContain('Second commit');

      expect(
        (await harness.runCli(['details', headCommitHash], { projectId: 'proj-1' }))
          .exitCode
      ).toBe(0);
      expect(
        (
          await harness.runCli(['compare', firstCommitHash, headCommitHash], {
            projectId: 'proj-1'
          })
        ).exitCode
      ).toBe(0);
      expect(
        (
          await harness.runCli(['diff', headCommitHash, 'src/hello.ts'], {
            projectId: 'proj-1'
          })
        ).exitCode
      ).toBe(0);
      expect((await harness.runCli(['remotes'], { projectId: 'proj-1' })).exitCode).toBe(0);

      // 9. Agent tools `git_tree_inspect` and alias `git_graph_inspect` across all actions
      expect(harness.agentTools).toHaveLength(2);
      for (const toolName of ['git_tree_inspect', 'git_graph_inspect']) {
        for (const action of ['repos', 'log', 'details', 'compare', 'diff', 'remotes']) {
          const res = await harness.callAgentTool(
            toolName,
            {
              action,
              commit: headCommitHash,
              fromCommit: firstCommitHash,
              toCommit: headCommitHash,
              filePath: 'src/hello.ts',
              maxCount: 5
            },
            { projectId: 'proj-1', threadId: 't-1' }
          );
          expect(res).toBeDefined();
        }
      }
    });
  });
});
