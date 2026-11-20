import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileAtomically } from './atomic-write.js';

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function makeErrno(code: string, message: string): NodeJS.ErrnoException {
  const err = new Error(message) as NodeJS.ErrnoException;
  err.code = code;
  return err;
}

describe('writeFileAtomically', () => {
  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()!;
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }
  });

  it('writes atomically via temp file + rename and leaves no leftover temp files', () => {
    const dir = makeTempDir('atomic-write-ok-');
    const target = join(dir, 'nested', 'settings.json');

    writeFileAtomically(target, '{"ok":true}\n', { mode: 0o600 });

    expect(readFileSync(target, 'utf8')).toBe('{"ok":true}\n');
    expect(readdirSync(join(dir, 'nested'))).toEqual(['settings.json']);
  });

  it('writes in place when target is a symbolic link instead of replacing it with rename', () => {
    const dir = makeTempDir('atomic-write-symlink-');
    const target = join(dir, 'settings.json');
    const renameFn = vi.fn();

    writeFileAtomically(target, '{"symlink":true}\n', {
      lstatFn: (() => ({ isSymbolicLink: () => true })) as any,
      renameFn: renameFn as any
    });

    expect(renameFn).not.toHaveBeenCalled();
    expect(readFileSync(target, 'utf8')).toBe('{"symlink":true}\n');
  });

  it('retries rename on win32 EPERM/EBUSY and succeeds once lock clears', () => {
    const dir = makeTempDir('atomic-write-retry-');
    const target = join(dir, 'current.json');
    const sleeps: number[] = [];
    let attempts = 0;

    writeFileAtomically(target, '{"retried":true}\n', {
      platform: 'win32',
      sleepFn: (ms) => {
        sleeps.push(ms);
      },
      renameFn: ((src: string, dest: string) => {
        attempts++;
        if (attempts === 1) throw makeErrno('EPERM', 'locked by antivirus');
        if (attempts === 2) throw makeErrno('EBUSY', 'busy');
        writeFileSync(dest, readFileSync(src, 'utf8'), 'utf8');
        rmSync(src, { force: true });
      }) as any
    });

    expect(attempts).toBe(3);
    expect(sleeps).toEqual([15, 30]);
    expect(readFileSync(target, 'utf8')).toBe('{"retried":true}\n');
    expect(readdirSync(dir)).toEqual(['current.json']);
  });

  it('falls back to in-place write when win32 rename remains locked after retries', () => {
    const dir = makeTempDir('atomic-write-fallback-');
    const target = join(dir, 'settings.json');
    writeFileSync(target, '{"old":true}\n', 'utf8');
    const sleeps: number[] = [];

    writeFileAtomically(target, '{"new":true}\n', {
      platform: 'win32',
      sleepFn: (ms) => {
        sleeps.push(ms);
      },
      renameFn: (() => {
        throw makeErrno('EBUSY', 'permanently locked');
      }) as any
    });

    expect(sleeps).toEqual([15, 30, 60]);
    expect(readFileSync(target, 'utf8')).toBe('{"new":true}\n');
    expect(readdirSync(dir)).toEqual(['settings.json']);
  });

  it('falls back to in-place write on EXDEV without win32 retries', () => {
    const dir = makeTempDir('atomic-write-exdev-');
    const target = join(dir, 'settings.json');
    const sleepFn = vi.fn();

    writeFileAtomically(target, '{"exdev":true}\n', {
      platform: 'linux',
      sleepFn,
      renameFn: (() => {
        throw makeErrno('EXDEV', 'cross-device link');
      }) as any
    });

    expect(sleepFn).not.toHaveBeenCalled();
    expect(readFileSync(target, 'utf8')).toBe('{"exdev":true}\n');
    expect(readdirSync(dir)).toEqual(['settings.json']);
  });

  it('rethrows unexpected rename errors and still removes the temp file', () => {
    const dir = makeTempDir('atomic-write-err-');
    const target = join(dir, 'settings.json');

    expect(() =>
      writeFileAtomically(target, '{"fail":true}\n', {
        platform: 'linux',
        renameFn: (() => {
          throw makeErrno('EACCES', 'permission denied');
        }) as any
      })
    ).toThrow(/permission denied/);

    expect(readdirSync(dir)).toEqual([]);
  });
});
