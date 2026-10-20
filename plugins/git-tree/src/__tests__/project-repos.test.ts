import { describe, expect, it, vi } from 'vitest';
import {
  ProjectConfinementError,
  discoverProjectRepos,
  isPathConfinedToRoot,
  resolveConfinedRepoPath,
  validateRepoRelativeFilePath,
  type ProjectFsDeps
} from '../server/project-repos.js';
import type { GitRunner } from '../server/git-exec.js';

const ROOT = '/work/app';

function fakeFs(tree: Record<string, 'dir' | 'file'>, links: Record<string, string> = {}): ProjectFsDeps {
  const real = (p: string) => links[p] ?? p;
  const children = (dir: string) =>
    Object.keys(tree)
      .filter((p) => p.startsWith(`${dir}/`) && !p.slice(dir.length + 1).includes('/'))
      .map((p) => ({ name: p.slice(dir.length + 1), isDirectory: tree[p] === 'dir' }));
  return {
    exists: (p) => p in tree,
    realpath: (p) => {
      if (!(p in tree) && !(p in links)) throw new Error('ENOENT');
      return real(p);
    },
    readdir: (p) => {
      if (tree[p] !== 'dir') throw new Error('ENOTDIR');
      return children(p);
    },
    isFile: (p) => tree[p] === 'file'
  };
}

function gitStub(responses: Record<string, { code: number; stdout: string }> = {}): GitRunner {
  return vi.fn(async ({ args }) => {
    const key = args.join(' ');
    return { code: responses[key]?.code ?? 0, stdout: responses[key]?.stdout ?? '', stderr: '' };
  }) as unknown as GitRunner;
}

describe('isPathConfinedToRoot', () => {
  it('accepts the root and descendants, rejects siblings and parents', () => {
    expect(isPathConfinedToRoot(ROOT, ROOT)).toBe(true);
    expect(isPathConfinedToRoot(ROOT, `${ROOT}/src`)).toBe(true);
    expect(isPathConfinedToRoot(ROOT, '/work/other')).toBe(false);
    expect(isPathConfinedToRoot(ROOT, '/work')).toBe(false);
  });
});

describe('validateRepoRelativeFilePath', () => {
  it('normalizes separators and rejects unsafe paths', () => {
    expect(validateRepoRelativeFilePath('/src\\a.ts')).toBe('src/a.ts');
    expect(() => validateRepoRelativeFilePath('   ')).toThrow('File path is required.');
    expect(() => validateRepoRelativeFilePath('-rf')).toThrow('Invalid file path.');
    expect(() => validateRepoRelativeFilePath('a\0b')).toThrow('Invalid file path.');
    expect(() => validateRepoRelativeFilePath('a/../b')).toThrow(/normalized repository-relative/);
    expect(() => validateRepoRelativeFilePath('./a')).toThrow(/normalized repository-relative/);
  });
});

describe('resolveConfinedRepoPath', () => {
  const project = { id: 'p1', name: 'App', path: ROOT } as never;
  const listProjects = async () => [project];
  const fs = fakeFs({ [ROOT]: 'dir', [`${ROOT}/pkg`]: 'dir' }, {});

  it('requires a project id and a registered project', async () => {
    await expect(resolveConfinedRepoPath({ projectId: ' ', listProjects })).rejects.toMatchObject({ code: 'project_not_found' });
    await expect(resolveConfinedRepoPath({ projectId: 'missing', listProjects })).rejects.toBeInstanceOf(ProjectConfinementError);
  });

  it('rejects projects without a local checkout path', async () => {
    const noPath = async () => [{ id: 'p1', name: 'x', path: '  ' } as never];
    await expect(resolveConfinedRepoPath({ projectId: 'p1', listProjects: noPath, fs })).rejects.toMatchObject({ code: 'project_unavailable' });
  });

  it('reports an unavailable project directory', async () => {
    await expect(resolveConfinedRepoPath({ projectId: 'p1', listProjects, fs: fakeFs({}) })).rejects.toMatchObject({ code: 'project_unavailable' });
  });

  it('rejects traversal in the sub-repository path', async () => {
    await expect(
      resolveConfinedRepoPath({ projectId: 'p1', subRepoRelPath: 'a/../b', listProjects, fs })
    ).rejects.toMatchObject({ code: 'path_escape' });
  });

  it('reports a missing sub-repository', async () => {
    await expect(
      resolveConfinedRepoPath({ projectId: 'p1', subRepoRelPath: 'nope', listProjects, fs })
    ).rejects.toMatchObject({ code: 'project_unavailable' });
  });

  it('rejects a sub-repository that resolves outside the project root', async () => {
    const escapingFs = fakeFs(
      { [ROOT]: 'dir', [`${ROOT}/link`]: 'dir' },
      { [`${ROOT}/link`]: '/elsewhere' }
    );
    await expect(
      resolveConfinedRepoPath({ projectId: 'p1', subRepoRelPath: 'link', listProjects, fs: escapingFs })
    ).rejects.toMatchObject({ code: 'path_escape' });
  });

  it('resolves the project root and a nested sub-repository', async () => {
    const root = await resolveConfinedRepoPath({ projectId: 'p1', listProjects, fs });
    expect(root).toMatchObject({ canonicalRepoRoot: ROOT, subRepoRelPath: '' });
    const nested = await resolveConfinedRepoPath({ projectId: 'p1', subRepoRelPath: 'pkg/', listProjects, fs });
    expect(nested).toMatchObject({ canonicalRepoRoot: `${ROOT}/pkg`, subRepoRelPath: 'pkg' });
  });
});

describe('discoverProjectRepos', () => {
  it('finds nested repos and worktrees while skipping ignored folders', async () => {
    const fs = fakeFs({
      [ROOT]: 'dir',
      [`${ROOT}/.git`]: 'dir',
      [`${ROOT}/packages`]: 'dir',
      [`${ROOT}/packages/ui`]: 'dir',
      [`${ROOT}/packages/ui/.git`]: 'file',
      [`${ROOT}/node_modules`]: 'dir',
      [`${ROOT}/node_modules/dep`]: 'dir',
      [`${ROOT}/node_modules/dep/.git`]: 'dir',
      [`${ROOT}/.hidden`]: 'dir',
      [`${ROOT}/.hidden/.git`]: 'dir',
      [`${ROOT}/.worktrees`]: 'dir',
      [`${ROOT}/.worktrees/wt`]: 'dir',
      [`${ROOT}/.worktrees/wt/.git`]: 'file'
    });
    const repos = await discoverProjectRepos({
      canonicalProjectRoot: ROOT,
      maxDepth: 3,
      git: gitStub({
        'rev-parse --verify HEAD': { code: 0, stdout: 'abc\n' },
        'symbolic-ref --quiet --short HEAD': { code: 0, stdout: 'main\n' }
      }),
      fs
    });
    const rels = repos.map((r) => r.relPath).sort();
    expect(rels).toEqual(['', '.worktrees/wt', 'packages/ui'].sort());
    const ui = repos.find((r) => r.relPath === 'packages/ui');
    expect(ui).toMatchObject({ isWorktree: true, label: 'app / packages/ui', currentBranch: 'main', headHash: 'abc' });
  });

  it('falls back to a parent worktree probe when no .git marker exists', async () => {
    const fs = fakeFs({ [ROOT]: 'dir' });
    const git = gitStub({ 'rev-parse --is-inside-work-tree': { code: 0, stdout: 'true\n' } });
    const repos = await discoverProjectRepos({ canonicalProjectRoot: ROOT, maxDepth: 0, git, fs });
    expect(repos).toEqual([
      { relPath: '', label: 'app', currentBranch: null, headHash: null, isWorktree: false }
    ]);
  });

  it('returns no repos when the probe says the folder is not inside a worktree', async () => {
    const fs = fakeFs({ [ROOT]: 'dir' });
    const git = gitStub({ 'rev-parse --is-inside-work-tree': { code: 128, stdout: '' } });
    expect(await discoverProjectRepos({ canonicalProjectRoot: ROOT, maxDepth: 2, git, fs })).toEqual([]);
  });

  it('clamps the search depth and tolerates unreadable directories', async () => {
    const fs: ProjectFsDeps = {
      exists: () => false,
      realpath: (p) => p,
      readdir: () => {
        throw new Error('EACCES');
      },
      isFile: () => false
    };
    const repos = await discoverProjectRepos({ canonicalProjectRoot: ROOT, maxDepth: 99, git: gitStub(), fs });
    expect(repos).toEqual([]);
  });
});
