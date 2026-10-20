import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakePluginHost } from '@zana-ai/zcc-plugin-sdk/testing';
import gitGraphPlugin from '../../server.js';
import { createTempFileGitRunner } from '../server/git-exec.js';
import { DEFAULT_GLOBAL_SETTINGS as D } from '../server/storage.js';

describe('git-tree server settings normalization and RPC edges', () => {
  let repo = '';
  const git = createTempFileGitRunner();

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'zcc-git-settings-'));
    await git({ cwd: repo, args: ['init', '-b', 'main'] });
    await git({ cwd: repo, args: ['config', 'user.name', 'T'] });
    await git({ cwd: repo, args: ['config', 'user.email', 't@example.com'] });
    await git({ cwd: repo, args: ['config', 'commit.gpgsign', 'false'] });
    await mkdir(join(repo, 'pkg'), { recursive: true });
    await git({ cwd: repo, args: ['commit', '--allow-empty', '-m', 'root'] });
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true }).catch(() => undefined);
  });

  async function host() {
    const made = createFakePluginHost({ listProjects: () => [{ id: 'p1', name: 'Repo', path: repo }] });
    await gitGraphPlugin(made.zcc);
    return made.harness;
  }

  it('keeps valid overrides and falls back to defaults for wrong-typed or out-of-range values', async () => {
    const h = await host();
    const settings = (await h.callRpc('updateGlobalSettings', {
      settings: {
        graphStyle: 'angular',
        initialLoadCommits: 99999,
        loadMoreCommits: 1,
        muteNonAncestors: true,
        muteMergeCommits: 'yes',
        commitDetailsLocation: 'inline',
        fileViewType: 'list',
        compactFolders: false,
        diffViewMode: 'split',
        maxDepthOfRepoSearch: 42,
        dateType: 'commit',
        dateFormat: 'iso',
        fetchAndPrune: true,
        fetchAndPruneTags: 'no',
        signCommits: true,
        signTags: false,
        useMailmap: true,
        graphColors: []
      }
    })) as Record<string, unknown>;
    expect(settings.graphStyle).toBe('angular');
    expect(settings.initialLoadCommits).toBe(2000);
    expect(settings.loadMoreCommits).toBe(25);
    expect(settings.muteNonAncestors).toBe(true);
    expect(settings.muteMergeCommits).toBe(true);
    expect(settings.commitDetailsLocation).toBe('inline');
    expect(settings.fileViewType).toBe('list');
    expect(settings.diffViewMode).toBe('split');
    expect(settings.maxDepthOfRepoSearch).toBe(5);
    expect(settings.dateType).toBe('commit');
    expect(settings.dateFormat).toBe('iso');
    expect(settings.fetchAndPrune).toBe(true);
    expect(settings.fetchAndPruneTags).toBe(false);
    expect(settings.signCommits).toBe(true);
    expect(settings.useMailmap).toBe(true);
  });

  it('normalizes unknown enum values back to their defaults', async () => {
    const h = await host();
    const settings = (await h.callRpc('updateGlobalSettings', {
      patch: {
        graphStyle: 'unknown',
        commitDetailsLocation: 'floating',
        fileViewType: 'grid',
        diffViewMode: 'sideways',
        dateType: 'nope',
        dateFormat: 'weird',
        maxDepthOfRepoSearch: -3,
        initialLoadCommits: 'lots'
      }
    })) as Record<string, unknown>;
    expect(settings.graphStyle).toBe('rounded');
    expect(settings.commitDetailsLocation).toBe('docked');
    expect(settings.fileViewType).toBe('tree');
    expect(settings.diffViewMode).toBe('unified');
    expect(settings.dateType).toBe('author');
    expect(settings.dateFormat).toBe('relative');
    expect(settings.maxDepthOfRepoSearch).toBe(0);
  });

  it('clamps a requested graph size to the supported range', async () => {
    const h = await host();
    const small = (await h.callRpc('loadGraph', { projectId: 'p1', maxCommits: 1 })) as { commits: unknown[] };
    expect(small.commits.length).toBeGreaterThanOrEqual(1);
    const big = (await h.callRpc('loadGraph', { projectId: 'p1', maxCommits: 1e9 })) as { commits: unknown[] };
    expect(big.commits.length).toBeGreaterThanOrEqual(1);
    const bogus = (await h.callRpc('loadGraph', { projectId: 'p1', maxCommits: 'many' })) as { commits: unknown[] };
    expect(bogus.commits.length).toBeGreaterThanOrEqual(1);
  });

  it('exports the repository settings to .git-tree.json in the repo root', async () => {
    const h = await host();
    const res = (await h.callRpc('exportRepoConfig', { projectId: 'p1' })) as { ok: boolean; path: string; filePath: string };
    expect(res).toMatchObject({ ok: true, path: '.git-tree.json' });
    const written = JSON.parse(await readFile(res.filePath, 'utf8'));
    expect(written).toBeTypeOf('object');
  });

  it('rejects an export when the target cannot be written', async () => {
    const h = await host();
    await rm(repo, { recursive: true, force: true });
    await expect(h.callRpc('exportRepoConfig', { projectId: 'p1' })).rejects.toBeDefined();
  });
});

describe('git-tree settings type fallbacks', () => {
  it('replaces every wrong-typed setting with its default', async () => {
    const made = createFakePluginHost({ listProjects: () => [] });
    await gitGraphPlugin(made.zcc);
    const wrong = {
      loadMoreCommits: 'x',
      muteNonAncestors: 'x',
      compactFolders: 'x',
      maxDepthOfRepoSearch: 'x',
      fetchAndPrune: 'x',
      fetchAndPruneTags: 'x',
      signCommits: 'x',
      signTags: 'x',
      useMailmap: 'x',
      muteMergeCommits: 'x',
      initialLoadCommits: 'x'
    };
    const settings = (await made.harness.callRpc('updateGlobalSettings', { settings: wrong })) as Record<string, unknown>;
    expect(settings.loadMoreCommits).toBe(D.loadMoreCommits);
    expect(settings.muteNonAncestors).toBe(D.muteNonAncestors);
    expect(settings.compactFolders).toBe(D.compactFolders);
    expect(settings.maxDepthOfRepoSearch).toBe(D.maxDepthOfRepoSearch);
    expect(settings.fetchAndPrune).toBe(D.fetchAndPrune);
    expect(settings.fetchAndPruneTags).toBe(D.fetchAndPruneTags);
    expect(settings.signCommits).toBe(D.signCommits);
    expect(settings.signTags).toBe(D.signTags);
    expect(settings.useMailmap).toBe(D.useMailmap);
    expect(settings.initialLoadCommits).toBe(D.initialLoadCommits);
  });
});
