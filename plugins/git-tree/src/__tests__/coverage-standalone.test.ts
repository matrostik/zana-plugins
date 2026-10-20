import { describe, expect, it, vi } from 'vitest';
import { registerGitTreeCliAndTools } from '../server/cli-and-tools.js';
import type { GitRunner } from '../server/git-exec.js';
import type { ProjectFsDeps } from '../server/project-repos.js';
import { GIT_GRAPH_STYLES, GIT_TREE_STYLES } from '../app/styles.js';
import { loadRepositoryGraph } from '../server/git-log-parser.js';
import { copyText, copyViaTextarea } from '../app/clipboard.js';
import { DEFAULT_GLOBAL_SETTINGS } from '../server/storage.js';

type Reply = { code: number; stdout?: string; stderr?: string };

function recorder(replies: Array<[string, Reply]> = []): GitRunner & { calls: string[][] } {
  const calls: string[][] = [];
  const fn = vi.fn(async ({ args }: { args: string[] }) => {
    calls.push(args);
    const key = args.join(' ');
    const hit = replies.find(([prefix]) => key.startsWith(prefix));
    return { code: hit?.[1].code ?? 0, stdout: hit?.[1].stdout ?? '', stderr: hit?.[1].stderr ?? '' };
  });
  return Object.assign(fn as unknown as GitRunner, { calls });
}

const REPO = '/projects/app';
const fakeFs: ProjectFsDeps = {
  exists: () => false,
  realpath: (p) => p,
  readdir: () => [],
  isFile: () => false
};

function buildCli(opts: { projects?: Array<{ id: string; name: string; path: string }>; git?: GitRunner; fs?: ProjectFsDeps } = {}) {
  const projects = opts.projects ?? [{ id: 'p1', name: 'app', path: REPO }];
  const git = opts.git ?? recorder();
  const handlers: { cli?: { run: (argv: string[], ctx: Record<string, unknown>) => Promise<any> } } = {};
  const tools: Array<{ name: string; execute: (input: unknown, ctx: Record<string, unknown>) => Promise<any> }> = [];
  const zcc = {
    cli: {
      register: (def: { run: typeof handlers.cli extends infer T ? any : never }) => {
        handlers.cli = def as any;
      }
    },
    sdk: { projects: { list: async () => projects } },
    agents: { registerTool: (t: any) => tools.push(t) }
  } as any;
  const storage = {
    getRepoSettings: async () => ({
      selectedBranches: [],
      showRemoteBranches: true,
      showTags: true,
      showStashes: true,
      showUncommittedChanges: true,
      showUntrackedFiles: true,
      onlyFollowFirstParent: false,
      commitOrdering: 'date'
    })
  } as any;
  registerGitTreeCliAndTools({
    zcc,
    git,
    fs: opts.fs ?? fakeFs,
    storage,
    readGlobalSettings: async () => ({ ...DEFAULT_GLOBAL_SETTINGS, maxDepthOfRepoSearch: 0, useMailmap: false })
  });
  return { run: (argv: string[], ctx: Record<string, unknown> = {}) => handlers.cli!.run(argv, { projectId: '', ...ctx }), git, tools };
}

describe('git-tree CLI', () => {
  it('prints help', async () => {
    const { run } = buildCli();
    const res = await run(['--help']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/Usage: zcc git-tree/);
  });

  it('requires a project when none is given and none is inferred', async () => {
    const { run } = buildCli({ projects: [] });
    const res = await run(['log'], {});
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toMatch(/Missing --project/);
  });

  it('infers the project from the working directory', async () => {
    const git = recorder([['remote -v', { code: 0, stdout: 'origin\tgit@h:o/r.git (fetch)\n' }]]);
    const { run } = buildCli({ git, fs: { ...fakeFs, realpath: (p) => p } });
    const res = await run(['remotes'], { cwd: `${REPO}/src` });
    expect(res.exitCode).toBe(0);
    expect(JSON.parse(res.stdout).projectId).toBe('p1');
  });

  it('does not infer a project when the cwd is outside every project', async () => {
    const { run } = buildCli({ fs: { ...fakeFs, realpath: (p) => p } });
    const res = await run(['log'], { cwd: '/elsewhere' });
    expect(res.exitCode).toBe(1);
  });

  it('ignores realpath failures while inferring the project', async () => {
    const fs: ProjectFsDeps = {
      ...fakeFs,
      realpath: (p) => {
        if (p === '/broken') throw new Error('ENOENT');
        return p;
      }
    };
    const { run } = buildCli({ projects: [{ id: 'p1', name: 'app', path: '/broken' }], fs });
    const res = await run(['log'], { cwd: REPO });
    expect(res.exitCode).toBe(1);
  });

  it('lists discovered repos as JSON', async () => {
    const fs: ProjectFsDeps = {
      exists: (p) => p === `${REPO}/.git`,
      realpath: (p) => p,
      readdir: () => [],
      isFile: () => false
    };
    const git = recorder([
      ['rev-parse --verify HEAD', { code: 0, stdout: 'h1\n' }],
      ['symbolic-ref', { code: 0, stdout: 'main\n' }]
    ]);
    const { run } = buildCli({ git, fs });
    const res = await run(['repos'], { projectId: 'p1' });
    expect(res.exitCode).toBe(0);
    expect(JSON.parse(res.stdout).repos[0]).toMatchObject({ currentBranch: 'main', headHash: 'h1' });
  });

  it('shows remotes, commit details, and compare output', async () => {
    const git = recorder([
      ['remote -v', { code: 0, stdout: 'origin\thttps://x/y (fetch)\norigin\thttps://x/y (push)\n' }],
      ['show --quiet', { code: 0, stdout: `${'a'.repeat(40)}\x1fa\x1f\x1fA\x1fa@x\x1f1\x1fC\x1fc@x\x1f2\x1fN\x1f\x1f\x1fsubj\x1e` }],
      ['diff-tree', { code: 0, stdout: '' }],
      ['diff -r -z', { code: 0, stdout: '' }]
    ]);
    const { run } = buildCli({ git });
    expect(JSON.parse((await run(['remotes'], { projectId: 'p1' })).stdout).remotes[0].name).toBe('origin');
    expect(JSON.parse((await run(['details', '--commit', 'a'.repeat(40)], { projectId: 'p1' })).stdout).subject).toBe('subj');
    expect(JSON.parse((await run(['details', 'HEAD'], { projectId: 'p1' })).stdout)).toBeTruthy();
    const cmp = await run(['compare', '--from', 'v1', '--to', 'v2'], { projectId: 'p1' });
    expect(cmp.exitCode).toBe(0);
    expect(await run(['compare', 'v1'], { projectId: 'p1' })).toMatchObject({ exitCode: 0 });
  });

  it('validates required flags for compare and diff', async () => {
    const { run } = buildCli();
    expect((await run(['compare'], { projectId: 'p1' })).stderr).toMatch(/Missing --from/);
    expect((await run(['diff', '--commit', 'abc', '--file', ''], { projectId: 'p1' })).exitCode).toBe(1);
  });

  it('shows a file diff and a log with branch filters', async () => {
    const git = recorder([
      ['show --format=', { code: 0, stdout: '' }],
      ['log ', { code: 0, stdout: '' }],
      ['show-ref', { code: 0, stdout: '' }],
      ['remote -v', { code: 0, stdout: '' }]
    ]);
    const { run } = buildCli({ git });
    const diff = await run(['diff', '--commit', 'abc', '--file', 'a.ts'], { projectId: 'p1' });
    expect(diff.exitCode).toBe(0);
    const log = await run(['log', '--max-count', '5', '--branches', 'main,dev'], { projectId: 'p1' });
    expect(log.exitCode).toBe(0);
    expect(git.calls.some((c) => c.includes('main') && c.includes('dev'))).toBe(true);
  });

  it('defaults the diff commit to HEAD when no commit is given', async () => {
    const git = recorder();
    const { run } = buildCli({ git });
    const res = await run(['diff', '--file', 'a.ts', '--from', 'v1'], { projectId: 'p1' });
    expect(res.exitCode).toBe(0);
    expect(git.calls.some((c) => c.includes('HEAD'))).toBe(true);
  });

  it('reports an unknown subcommand and converts thrown errors to exit code 1', async () => {
    const { run } = buildCli();
    expect((await run(['bogus'], { projectId: 'p1' })).stderr).toMatch(/Unknown subcommand: bogus/);
    const throwing = buildCli({ projects: [{ id: 'p1', name: 'app', path: REPO }], fs: { ...fakeFs, realpath: () => { throw new Error('boom'); } } });
    const res = await throwing.run(['log'], { projectId: 'p1' });
    expect(res.exitCode).toBe(1);
  });

  it('registers the git_tree_inspect and git_graph_inspect agent tools', () => {
    const { tools } = buildCli();
    expect(tools.map((t) => t.name).sort()).toEqual(['git_graph_inspect', 'git_tree_inspect']);
  });

  it('agent tool dispatches each action and enforces required inputs', async () => {
    const git = recorder([
      ['show --quiet', { code: 0, stdout: `${'b'.repeat(40)}\x1fb\x1f\x1fA\x1fa@x\x1f1\x1fC\x1fc@x\x1f2\x1fN\x1f\x1f\x1fsubj\x1e` }],
      ['log ', { code: 0, stdout: '' }]
    ]);
    const { tools } = buildCli({ git });
    const tool = tools.find((t) => t.name === 'git_tree_inspect')!;
    const ctx = { threadId: 't', projectId: 'p1', signal: new AbortController().signal };

    expect((await tool.execute({ action: 'details', commit: 'b'.repeat(40) }, ctx)).subject).toBe('subj');
    expect((await tool.execute({ action: 'details' }, ctx)).hash).toBeDefined();
    expect((await tool.execute({ action: 'compare', fromCommit: 'v1' }, ctx)).fromHash).toBe('v1');
    await expect(tool.execute({ action: 'compare' }, ctx)).rejects.toThrow(/fromCommit is required/);
    await expect(tool.execute({ action: 'diff', commit: 'abc' }, ctx)).rejects.toThrow(/filePath is required/);
    expect(await tool.execute({ action: 'diff', commit: 'abc', fromCommit: 'v1', filePath: 'a.ts' }, ctx)).toMatchObject({ filePath: 'a.ts' });
    expect(await tool.execute({ action: 'log', maxCommits: 500 }, ctx)).toHaveProperty('commits');
    expect(await tool.execute({ action: 'log', maxCommits: Number.NaN, subRepoRelPath: '' }, ctx)).toHaveProperty('commits');
    expect(await tool.execute(null, ctx)).toHaveProperty('commits');
  });
});

describe('styles', () => {
  it('exposes the stylesheet and its legacy alias', () => {
    expect(GIT_GRAPH_STYLES).toContain('.gg-');
    expect(GIT_TREE_STYLES).toBe(GIT_GRAPH_STYLES);
  });
});

describe('loadRepositoryGraph', () => {
  const showRef = [
    'aaaaaaaa refs/heads/main',
    'aaaaaaaa HEAD',
    'bbbbbbbb refs/remotes/origin/main',
    'cccccccc refs/tags/v1',
    'cccccccc refs/tags/v1^{}',
    'dddddddd refs/remotes/origin/HEAD'
  ].join('\n');
  const logLine = (hash: string, subject: string) =>
    [hash, hash.slice(0, 7), '', 'p', 'p@x', '1', 'c', 'c@x', '2', subject].join('\x1f') + '\x1e';
  const base = {
    cwd: REPO,
    maxCommits: 25,
    selectedBranches: [] as string[],
    showRemoteBranches: true,
    showTags: true,
    showStashes: true,
    showUncommittedChanges: true,
    showUntrackedFiles: true,
    onlyFollowFirstParent: false,
    commitOrdering: 'date' as const,
    useMailmap: true
  };

  it('builds branches, tags, remotes and HEAD info', async () => {
    const git = recorder([
      ['symbolic-ref', { code: 0, stdout: 'main\n' }],
      ['show-ref', { code: 0, stdout: showRef }],
      ['remote -v', { code: 0, stdout: 'origin\thttps://x/y (fetch)\n' }],
      ['log ', { code: 0, stdout: logLine('aaaaaaaa11', 'first') }],
      ['stash list', { code: 0, stdout: '' }],
      ['status', { code: 0, stdout: '' }]
    ]);
    const graph = await loadRepositoryGraph({ ...base, git });
    expect(graph.currentBranch).toBe('main');
    expect(graph.headHash).toBe('aaaaaaaa');
    expect(graph.branches).toEqual(['main']);
    expect(graph.remoteBranches).toEqual(['origin/main']);
    expect(graph.tags).toEqual(['v1']);
    expect(graph.remotes[0].name).toBe('origin');
    expect(graph.commits[0].subject).toBe('first');
    expect(graph.hasMore).toBe(false);
  });

  it('uses explicit branch filters and reports hasMore when over the limit', async () => {
    const git = recorder([
      ['log ', { code: 0, stdout: logLine('a1', 'one') + logLine('a2', 'two') }],
      ['symbolic-ref', { code: 1 }],
      ['show-ref', { code: 1 }],
      ['remote -v', { code: 1 }],
      ['stash list', { code: 1 }],
      ['status', { code: 1 }]
    ]);
    const graph = await loadRepositoryGraph({ ...base, git, maxCommits: 1, selectedBranches: ['feat'], showStashes: false, showUncommittedChanges: false });
    expect(graph.hasMore).toBe(true);
    expect(graph.commits).toHaveLength(1);
    expect(git.calls.find((c) => c[0] === 'log')).toContain('feat');
    expect(git.calls.find((c) => c[0] === 'log')).not.toContain('--branches');
  });

  it('inserts stash nodes at their base commit and shows uncommitted changes', async () => {
    const stashLine = ['stash@{0}', 'eeeeeeee', 'eeeeeee', 'aaaaaaaa', 'p', 'p@x', '5', 'WIP on main'].join('\x1f') + '\x1e';
    const git = recorder([
      ['symbolic-ref', { code: 0, stdout: 'main\n' }],
      ['show-ref', { code: 0, stdout: 'aaaaaaaa HEAD\naaaaaaaa refs/heads/main' }],
      ['remote -v', { code: 0, stdout: '' }],
      ['log ', { code: 0, stdout: logLine('aaaaaaaa11', 'base') }],
      ['stash list', { code: 0, stdout: stashLine }],
      ['status', { code: 0, stdout: ' M a.ts\0?? b.ts\0' }]
    ]);
    const graph = await loadRepositoryGraph({ ...base, git });
    expect(graph.stashes).toEqual([{ selector: 'stash@{0}', hash: 'eeeeeeee', subject: 'WIP on main', baseHash: 'aaaaaaaa' }]);
    expect(graph.commits.map((c) => c.hash)).toEqual(['*', 'eeeeeeee', 'aaaaaaaa11']);
    expect(graph.uncommittedCount).toBe(2);
  });

  it('places an orphan stash at the top and omits hidden remote and tag refs', async () => {
    const stashLine = ['stash@{0}', 'eeeeeeee', 'eeeeeee', 'zzzzzzzz', 'p', 'p@x', '5', 'orphan'].join('\x1f') + '\x1e';
    const git = recorder([
      ['symbolic-ref', { code: 0, stdout: 'main\n' }],
      ['show-ref', { code: 0, stdout: showRef }],
      ['remote -v', { code: 0, stdout: '' }],
      ['log ', { code: 0, stdout: logLine('aaaaaaaa11', 'base') }],
      ['stash list', { code: 0, stdout: stashLine }],
      ['status', { code: 1 }]
    ]);
    const graph = await loadRepositoryGraph({ ...base, git, showRemoteBranches: false, showTags: false });
    expect(graph.commits[0].hash).toBe('eeeeeeee');
    expect(graph.commits[0].isStash).toBe(true);
    expect(graph.uncommittedCount).toBe(0);
  });

  it('applies ordering and first-parent/mailmap flags to git log', async () => {
    const git = recorder([['log ', { code: 0, stdout: '' }]]);
    await loadRepositoryGraph({ ...base, git, commitOrdering: 'topo', onlyFollowFirstParent: true, useMailmap: true, showStashes: false, showUncommittedChanges: false });
    const log = git.calls.find((c) => c[0] === 'log')!;
    expect(log).toEqual(expect.arrayContaining(['--topo-order', '--first-parent', '--use-mailmap']));
    const authorGit = recorder([['log ', { code: 0, stdout: '' }]]);
    await loadRepositoryGraph({ ...base, git: authorGit, commitOrdering: 'author-date', showStashes: false, showUncommittedChanges: false });
    expect(authorGit.calls.find((c) => c[0] === 'log')).toContain('--author-date-order');
  });
});

describe('clipboard', () => {
  it('copies through the textarea fallback in a DOM-like environment', () => {
    const ta: any = { style: {}, setAttribute: vi.fn(), select: vi.fn() };
    ta.value = '';
    const body = { appendChild: vi.fn(), removeChild: vi.fn() };
    vi.stubGlobal('document', {
      createElement: () => ta,
      body,
      execCommand: vi.fn(() => true)
    });
    expect(copyViaTextarea('hello')).toBe(true);
    expect(ta.value).toBe('hello');
    expect(body.removeChild).toHaveBeenCalledWith(ta);
    vi.unstubAllGlobals();
  });

  it('returns false when execCommand throws', () => {
    const ta: any = { style: {}, setAttribute: vi.fn(), select: vi.fn() };
    const body = { appendChild: vi.fn(), removeChild: vi.fn() };
    vi.stubGlobal('document', {
      createElement: () => ta,
      body,
      execCommand: () => {
        throw new Error('denied');
      }
    });
    expect(copyViaTextarea('x')).toBe(false);
    expect(body.removeChild).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('uses navigator.clipboard when available and falls back when it rejects', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyText('ok')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('ok');

    vi.stubGlobal('navigator', { clipboard: { writeText: async () => { throw new Error('denied'); } } });
    vi.stubGlobal('document', { createElement: () => ({ style: {}, setAttribute() {}, select() {} }), body: { appendChild() {}, removeChild() {} }, execCommand: () => true });
    await expect(copyText('ok')).resolves.toBe(true);
    vi.unstubAllGlobals();
  });
});
