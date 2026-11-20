import { randomUUID } from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
  type WriteFileOptions
} from 'node:fs';
import { dirname } from 'node:path';

const WIN32_RENAME_RETRY_DELAYS_MS = [15, 30, 60] as const;

export interface AtomicWriteOptions {
  mode?: number;
  platform?: NodeJS.Platform;
  lstatFn?: typeof lstatSync;
  writeFileFn?: typeof writeFileSync;
  renameFn?: typeof renameSync;
  rmFn?: typeof rmSync;
  sleepFn?: (ms: number) => void;
}

function defaultSleepSync(ms: number): void {
  if (ms <= 0 || typeof SharedArrayBuffer === 'undefined' || typeof Atomics?.wait !== 'function') {
    return;
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function getErrnoCode(err: unknown): string | undefined {
  return err && typeof err === 'object' && 'code' in err ? String((err as NodeJS.ErrnoException).code) : undefined;
}

function isWin32LockError(err: unknown): boolean {
  const code = getErrnoCode(err);
  return code === 'EPERM' || code === 'EBUSY';
}

function isTargetSymlink(filePath: string, lstatFn: typeof lstatSync): boolean {
  try {
    return lstatFn(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Writes a UTF-8 file atomically via temp-file + rename, while preserving existing
 * symlinks and retrying/falling back to an in-place write when Windows locks block rename.
 */
export function writeFileAtomically(
  filePath: string,
  content: string,
  options: AtomicWriteOptions = {}
): void {
  const platform = options.platform ?? process.platform;
  const lstatFn = options.lstatFn ?? lstatSync;
  const writeFileFn = options.writeFileFn ?? writeFileSync;
  const renameFn = options.renameFn ?? renameSync;
  const rmFn = options.rmFn ?? rmSync;
  const sleepFn = options.sleepFn ?? defaultSleepSync;

  const writeOpts: WriteFileOptions =
    options.mode !== undefined ? { encoding: 'utf8', mode: options.mode } : 'utf8';

  mkdirSync(dirname(filePath), { recursive: true });

  if (isTargetSymlink(filePath, lstatFn)) {
    writeFileFn(filePath, content, writeOpts);
    return;
  }

  const tmpPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    writeFileFn(tmpPath, content, writeOpts);
    try {
      renameFn(tmpPath, filePath);
      return;
    } catch (initialErr) {
      let lastErr: unknown = initialErr;
      if (platform === 'win32' && isWin32LockError(lastErr)) {
        for (const delayMs of WIN32_RENAME_RETRY_DELAYS_MS) {
          sleepFn(delayMs);
          try {
            renameFn(tmpPath, filePath);
            return;
          } catch (retryErr) {
            lastErr = retryErr;
            if (!isWin32LockError(lastErr)) break;
          }
        }
      }

      if ((platform === 'win32' && isWin32LockError(lastErr)) || getErrnoCode(lastErr) === 'EXDEV') {
        writeFileFn(filePath, content, writeOpts);
        return;
      }
      throw lastErr;
    }
  } finally {
    rmFn(tmpPath, { force: true });
  }
}
