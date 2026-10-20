import { spawn } from 'node:child_process';
import { closeSync, openSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface GitExecRequest {
  cwd: string;
  args: string[];
  timeoutMs?: number;
  maxBytes?: number;
}

export interface GitExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type GitRunner = (request: GitExecRequest) => Promise<GitExecResult>;

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 16 * 1024 * 1024; // 16 MiB cap
const MAX_CONCURRENT_GIT_PROCS = 6;

/**
 * Validates that a user-supplied ref, branch, tag, remote, or revision token
 * cannot be interpreted as a CLI flag (starts with `-`) or contain NUL/newlines.
 */
export function assertSafeGitToken(value: string, label = 'git reference'): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  if (trimmed.startsWith('-')) {
    throw new Error(`Invalid ${label}: cannot start with '-'.`);
  }
  if (/[\0\r\n]/.test(trimmed)) {
    throw new Error(`Invalid ${label}: contains control characters.`);
  }
  return trimmed;
}

/**
 * Concurrency semaphore so parallel UI requests never flood the host with git processes.
 */
class ConcurrencyLimiter {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxConcurrency: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

function readBoundedFile(filePath: string, maxBytes: number): string {
  try {
    const stat = statSync(filePath);
    if (stat.size === 0) return '';
    const buf = readFileSync(filePath);
    if (buf.byteLength > maxBytes) {
      return buf.subarray(0, maxBytes).toString('utf8');
    }
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

function safeClose(fd: number | null): void {
  if (fd === null) return;
  try {
    closeSync(fd);
  } catch {
    // Ignore already-closed descriptor
  }
}

function safeRemove(filePath: string): void {
  try {
    rmSync(filePath, { force: true });
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Production Git runner capturing stdout and stderr to uniquely named `0600`
 * temp files with a size cap, timeout, concurrency bound, and cleanup on every path.
 * Avoids Electron main's 8192-byte piped stdout truncation bug.
 */
export function createTempFileGitRunner(): GitRunner {
  const limiter = new ConcurrencyLimiter(MAX_CONCURRENT_GIT_PROCS);

  return (request: GitExecRequest) =>
    limiter.run(
      () =>
        new Promise<GitExecResult>((resolve) => {
          const id = randomUUID();
          const stdoutPath = join(tmpdir(), `zcc-git-graph-out-${id}.tmp`);
          const stderrPath = join(tmpdir(), `zcc-git-graph-err-${id}.tmp`);
          const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
          const maxBytes = request.maxBytes ?? DEFAULT_MAX_BYTES;

          let outFd: number | null = null;
          let errFd: number | null = null;
          let settled = false;
          let timer: ReturnType<typeof setTimeout> | null = null;

          const finish = (code: number, fallbackErr?: string) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            safeClose(outFd);
            safeClose(errFd);
            outFd = null;
            errFd = null;

            const stdout = readBoundedFile(stdoutPath, maxBytes);
            const stderrFile = readBoundedFile(stderrPath, maxBytes);
            safeRemove(stdoutPath);
            safeRemove(stderrPath);

            resolve({
              code,
              stdout,
              stderr: fallbackErr ? `${stderrFile}\n${fallbackErr}`.trim() : stderrFile
            });
          };

          try {
            outFd = openSync(stdoutPath, 'w', 0o600);
            errFd = openSync(stderrPath, 'w', 0o600);
          } catch (err) {
            safeClose(outFd);
            safeClose(errFd);
            safeRemove(stdoutPath);
            safeRemove(stderrPath);
            resolve({
              code: 1,
              stdout: '',
              stderr: err instanceof Error ? err.message : String(err)
            });
            return;
          }

          const fullArgs = ['--no-pager', '-c', 'core.fsmonitor=false', ...request.args];
          const child = spawn('git', fullArgs, {
            cwd: request.cwd,
            windowsHide: true,
            stdio: ['ignore', outFd, errFd],
            env: {
              ...process.env,
              GIT_TERMINAL_PROMPT: '0',
              GCM_INTERACTIVE: 'never',
              LC_ALL: 'C'
            }
          });

          timer = setTimeout(() => {
            try {
              child.kill('SIGKILL');
            } catch {
              // Ignore kill error
            }
            finish(124, `git command timed out after ${timeoutMs}ms`);
          }, timeoutMs);

          child.once('error', (err) => {
            const errno = (err as NodeJS.ErrnoException).code;
            finish(errno === 'ENOENT' ? 127 : 1, err.message);
          });

          child.once('exit', (code) => {
            finish(typeof code === 'number' ? code : 1);
          });

          child.once('close', (code) => {
            finish(typeof code === 'number' ? code : 1);
          });
        })
    );
}
