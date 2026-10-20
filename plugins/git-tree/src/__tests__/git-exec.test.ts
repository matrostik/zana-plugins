import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertSafeGitToken, createTempFileGitRunner } from '../server/git-exec.js';

describe('assertSafeGitToken', () => {
  it('rejects empty, option-like, and control-character values', () => {
    expect(() => assertSafeGitToken('   ', 'branch')).toThrow('branch is required.');
    expect(() => assertSafeGitToken('-x')).toThrow("Invalid git reference: cannot start with '-'.");
    expect(() => assertSafeGitToken('a\nb')).toThrow('contains control characters');
    expect(assertSafeGitToken('  main  ')).toBe('main');
  });
});

describe('createTempFileGitRunner', () => {
  let repo: string;
  let runner: ReturnType<typeof createTempFileGitRunner>;

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'git-tree-exec-'));
    runner = createTempFileGitRunner();
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  it('captures stdout and exit code from a real git command', async () => {
    const res = await runner({ cwd: repo, args: ['init', '-q'] });
    expect(res.code).toBe(0);
    const version = await runner({ cwd: repo, args: ['--version'] });
    expect(version.stdout).toMatch(/git version/);
  });

  it('reports a non-zero exit with stderr', async () => {
    const res = await runner({ cwd: repo, args: ['rev-parse', '--verify', 'nope-ref'] });
    expect(res.code).not.toBe(0);
    expect(res.stderr.length).toBeGreaterThan(0);
  });

  it('truncates stdout to maxBytes', async () => {
    const res = await runner({ cwd: repo, args: ['--version'], maxBytes: 4 });
    expect(res.stdout.length).toBeLessThanOrEqual(4);
  });

  it('kills a command that exceeds its timeout and reports exit 124', async () => {
    const res = await runner({ cwd: repo, args: ['-c', 'alias.sleepy=!sleep 5', 'sleepy'], timeoutMs: 50 });
    expect(res.code).toBe(124);
    expect(res.stderr).toMatch(/timed out after 50ms/);
  });

  it('runs several commands concurrently under the limiter', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => runner({ cwd: repo, args: ['--version'] }))
    );
    expect(results.every((r) => r.code === 0)).toBe(true);
  });

  it('reports a missing working directory as a failure, not a throw', async () => {
    const res = await runner({ cwd: join(repo, 'does-not-exist'), args: ['--version'] });
    expect(res.code).not.toBe(0);
  });
});
