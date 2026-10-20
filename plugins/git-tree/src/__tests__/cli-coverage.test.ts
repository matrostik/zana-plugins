import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakePluginHost } from '@zana-ai/zcc-plugin-sdk/testing';
import gitGraphPlugin from '../../server.js';
import { createTempFileGitRunner } from '../server/git-exec.js';

describe('git-tree CLI branches', () => {
  let repo = '';
  let outside = '';
  const git = createTempFileGitRunner();

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'zcc-git-cli-'));
    outside = await mkdtemp(join(tmpdir(), 'zcc-git-cli-outside-'));
    await git({ cwd: repo, args: ['init', '-b', 'main'] });
    await git({ cwd: repo, args: ['config', 'user.name', 'T'] });
    await git({ cwd: repo, args: ['config', 'user.email', 't@example.com'] });
    await git({ cwd: repo, args: ['config', 'commit.gpgsign', 'false'] });
    await mkdir(join(repo, 'src'), { recursive: true });
    await writeFile(join(repo, 'src', 'a.ts'), 'a\n', 'utf8');
    await git({ cwd: repo, args: ['add', '.'] });
    await git({ cwd: repo, args: ['commit', '-m', 'first'] });
    await writeFile(join(repo, 'src', 'a.ts'), 'a\nb\n', 'utf8');
    await git({ cwd: repo, args: ['commit', '-am', 'second'] });
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true }).catch(() => undefined);
    await rm(outside, { recursive: true, force: true }).catch(() => undefined);
  });

  async function host() {
    const made = createFakePluginHost({ listProjects: () => [{ id: 'p1', name: 'Repo', path: repo }] });
    await gitGraphPlugin(made.zcc);
    return made.harness;
  }

  it('prints help and rejects unknown subcommands', async () => {
    const h = await host();
    expect((await h.runCli(['help'], { projectId: 'p1' })).stdout).toMatch(/Usage: zcc git-tree/);
    const unknown = await h.runCli(['bogus'], { projectId: 'p1' });
    expect(unknown.exitCode).toBe(1);
    expect(unknown.stderr).toMatch(/Unknown subcommand: bogus/);
  });

  it('asks for a project when none is given and none matches the working directory', async () => {
    const h = await host();
    const res = await h.runCli(['repos'], { cwd: outside });
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toMatch(/Missing --project/);
  });

  it('infers the project from a working directory inside a registered path', async () => {
    const h = await host();
    const res = await h.runCli(['repos'], { cwd: join(repo, 'src') });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('"projectId": "p1"');
  });

  it('reports a missing compare --from and a missing diff --file', async () => {
    const h = await host();
    const noFrom = await h.runCli(['compare'], { projectId: 'p1' });
    expect(noFrom.exitCode).toBe(1);
    expect(noFrom.stderr).toMatch(/Missing --from/);
    const noFile = await h.runCli(['diff'], { projectId: 'p1' });
    expect(noFile.exitCode).toBe(1);
    expect(noFile.stderr).toMatch(/Missing --file/);
  });

  it('accepts positional and flag forms for details, compare, and diff', async () => {
    const h = await host();
    const head = (await git({ cwd: repo, args: ['rev-parse', 'HEAD'] })).stdout.trim();
    const parent = (await git({ cwd: repo, args: ['rev-parse', 'HEAD~1'] })).stdout.trim();

    expect((await h.runCli(['details', '--commit', head], { projectId: 'p1' })).exitCode).toBe(0);
    expect((await h.runCli(['details'], { projectId: 'p1' })).exitCode).toBe(0);
    expect((await h.runCli(['compare', '--from', parent, '--to', head], { projectId: 'p1' })).exitCode).toBe(0);
    expect((await h.runCli(['compare', parent], { projectId: 'p1' })).exitCode).toBe(0);
    expect((await h.runCli(['diff', '--commit', head, '--file', 'src/a.ts'], { projectId: 'p1' })).exitCode).toBe(0);
    expect((await h.runCli(['diff', head, 'src/a.ts'], { projectId: 'p1' })).exitCode).toBe(0);
  });

  it('applies --max-count and --branches to the log', async () => {
    const h = await host();
    const res = await h.runCli(['log', '--max-count', '1', '--branches', 'main, ,'], { projectId: 'p1' });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('second');
    expect(res.stdout).not.toContain('"first"');
    const fallback = await h.runCli(['log', '--max-count', 'nope'], { projectId: 'p1' });
    expect(fallback.exitCode).toBe(0);
  });

  it('lists remotes and reports a clean error for an unknown project', async () => {
    const h = await host();
    const remotes = await h.runCli(['remotes'], { projectId: 'p1' });
    expect(remotes.exitCode).toBe(0);
    expect(remotes.stdout).toContain('"remotes"');
    const missing = await h.runCli(['repos'], { projectId: 'nope' });
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toMatch(/not registered/);
  });
});
