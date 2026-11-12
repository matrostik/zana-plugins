import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { PromptVoiceError } from '../errors.ts';
import type { FetchLike } from '../http.ts';

/** Model load time grows with model size; medium on a slow CPU can take tens of seconds. */
export const READY_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 150;
const PROBE_TIMEOUT_MS = 2_000;
const STOP_TIMEOUT_MS = 5_000;
/** Startup output lines kept for classifying failures. Never logged: lines can contain paths. */
const DIAGNOSTIC_LINES = 20;
const DIAGNOSTIC_LINE_CHARS = 300;
const LOOPBACK = '127.0.0.1';
const IDENTITY_FILE = 'pv-identity.txt';

/** Windows NTSTATUS exit codes for a missing or incompatible DLL. */
const WINDOWS_DLL_EXIT_CODES = new Set([0xc0000135, 0xc0000139, 0xc000007b]);
const MISSING_DEPENDENCY_PATTERN = /GLIBC|GLIBCXX|CXXABI|libgomp|shared object|VCRUNTIME|MSVCP|VCOMP/i;
const MODEL_FAILURE_PATTERN = /failed to initialize whisper context|failed to load model|bad magic|failed to open/i;
const BIND_FAILURE_PATTERN = /bind|address already in use/i;

export type ServerStatus =
  | { state: 'stopped' }
  | { state: 'starting'; modelId: string }
  | { state: 'running'; modelId: string; baseUrl: string }
  | { state: 'crashed'; modelId: string; exitCode: number | null };

export interface StartOptions {
  executable: string;
  modelPath: string;
  modelId: string;
  /** App-private folder served by the runtime; holds only the identity token. */
  runDirectory: string;
  threads: number;
  /** System requirements named in the error if the runtime can't load its libraries. */
  requirements: string[];
}

export type SpawnLike = (command: string, args: string[], options: Parameters<typeof nodeSpawn>[2]) => ChildProcess;

export interface ServerProcessDeps {
  spawn?: SpawnLike;
  fetch?: FetchLike;
  findPort?: () => Promise<number>;
  readyTimeoutMs?: number;
  pollIntervalMs?: number;
  stopTimeoutMs?: number;
}

/** Signals that another process answered on our port, so a new port should be tried. */
class PortConflict extends Error {}

/**
 * Owns one whisper.cpp server process bound to loopback.
 *
 * Readiness requires the server to return a random token from its private folder, which
 * proves the answer came from this process. That matters on Windows, where the runtime can
 * bind a port another server already uses. Only the process started here is ever stopped.
 */
export class WhisperServerProcess {
  private child: ChildProcess | null = null;
  private stopping = false;
  private current: ServerStatus = { state: 'stopped' };
  private readonly listeners = new Set<(status: ServerStatus) => void>();
  private readonly spawn: SpawnLike;
  private readonly fetch: FetchLike;
  private readonly findPort: () => Promise<number>;
  private readonly deps: ServerProcessDeps;

  constructor(deps: ServerProcessDeps = {}) {
    this.deps = deps;
    this.spawn = deps.spawn ?? nodeSpawn;
    this.fetch = deps.fetch ?? fetch;
    this.findPort = deps.findPort ?? findFreeLoopbackPort;
  }

  get status(): ServerStatus {
    return this.current;
  }

  onStatusChange(listener: (status: ServerStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Stops any running server, then starts one with the given model. Retries once on a port conflict. */
  async start(options: StartOptions): Promise<string> {
    await this.stop();
    this.setStatus({ state: 'starting', modelId: options.modelId });
    try {
      return await this.launch(options).catch((error) => {
        if (error instanceof PortConflict) return this.launch(options);
        throw error;
      });
    } catch (error) {
      this.setStatus({ state: 'stopped' });
      if (error instanceof PortConflict) throw startupError('port', null);
      throw error;
    }
  }

  /** Stops the server this instance started. Servers started elsewhere are never touched. */
  async stop(): Promise<void> {
    const child = this.child;
    if (!child) return;
    this.stopping = true;
    try {
      await terminate(child, this.deps.stopTimeoutMs ?? STOP_TIMEOUT_MS);
    } finally {
      this.child = null;
      this.stopping = false;
      this.setStatus({ state: 'stopped' });
    }
  }

  private async launch(options: StartOptions): Promise<string> {
    const port = await this.findPort();
    const token = randomBytes(16).toString('hex');
    await mkdir(options.runDirectory, { recursive: true });
    await writeFile(join(options.runDirectory, IDENTITY_FILE), token);

    const child = this.spawn(options.executable, serverArgs(options, port), {
      cwd: dirname(options.executable),
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const startup = watchStartup(child);
    const baseUrl = `http://${LOOPBACK}:${port}`;
    try {
      await this.waitForReady(baseUrl, token, startup, options);
    } catch (error) {
      startup.stopCollecting();
      await terminate(child, this.deps.stopTimeoutMs ?? STOP_TIMEOUT_MS);
      throw error;
    }
    startup.stopCollecting();
    this.adopt(child, options.modelId);
    this.setStatus({ state: 'running', modelId: options.modelId, baseUrl });
    return baseUrl;
  }

  private async waitForReady(baseUrl: string, token: string, startup: StartupWatch, options: StartOptions): Promise<void> {
    const deadline = Date.now() + (this.deps.readyTimeoutMs ?? READY_TIMEOUT_MS);
    const interval = this.deps.pollIntervalMs ?? POLL_INTERVAL_MS;
    while (Date.now() < deadline) {
      if (startup.exit) throw classifyStartupExit(startup.exit, startup.lines, options.requirements);
      const answer = await this.probeIdentity(baseUrl);
      if (answer === token) return;
      if (answer !== null) throw new PortConflict();
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw startupError('timeout', null);
  }

  /** The served token, or null if nothing usable answered yet. */
  private async probeIdentity(baseUrl: string): Promise<string | null> {
    try {
      const response = await this.fetch(`${baseUrl}/${IDENTITY_FILE}`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS), redirect: 'error' });
      if (response.status === 404) return '';
      return response.ok ? (await response.text()).trim() : null;
    } catch {
      return null;
    }
  }

  private adopt(child: ChildProcess, modelId: string): void {
    this.child = child;
    child.once('exit', (code) => {
      if (this.child !== child || this.stopping) return;
      this.child = null;
      this.setStatus({ state: 'crashed', modelId, exitCode: code });
    });
  }

  private setStatus(status: ServerStatus): void {
    this.current = status;
    for (const listener of this.listeners) listener(status);
  }
}

function serverArgs(options: StartOptions, port: number): string[] {
  return [
    '--host', LOOPBACK,
    '--port', String(port),
    '-m', options.modelPath,
    '-t', String(options.threads),
    // The language is sent per request; this only replaces the English default.
    '-l', 'auto',
    '--public', options.runDirectory
  ];
}

interface StartupWatch {
  lines: string[];
  exit: { code: number | null; spawnError?: string } | null;
  stopCollecting(): void;
}

/**
 * Records exit status and the last few output lines until startup finishes. Output keeps
 * draining afterwards so a full pipe can never block the server.
 */
function watchStartup(child: ChildProcess): StartupWatch {
  const watch: StartupWatch = { lines: [], exit: null, stopCollecting: () => (collecting = false) };
  let collecting = true;
  const collect = (chunk: Buffer) => {
    if (!collecting) return;
    for (const line of chunk.toString('utf8').split(/\r?\n/)) {
      if (!line) continue;
      watch.lines.push(line.slice(0, DIAGNOSTIC_LINE_CHARS));
      if (watch.lines.length > DIAGNOSTIC_LINES) watch.lines.shift();
    }
  };
  child.stdout?.on('data', collect);
  child.stderr?.on('data', collect);
  child.once('exit', (code) => (watch.exit ??= { code }));
  // A permanent listener: an unhandled 'error' event would crash the plugin host.
  child.on('error', (error: NodeJS.ErrnoException) => (watch.exit ??= { code: null, spawnError: error.code ?? 'unknown' }));
  return watch;
}

function classifyStartupExit(exit: NonNullable<StartupWatch['exit']>, lines: string[], requirements: string[]): Error {
  const output = lines.join('\n');
  if (exit.spawnError) return startupError('spawn', exit.code, exit.spawnError);
  // Node may report NTSTATUS codes as signed or unsigned; compare unsigned.
  if ((exit.code !== null && WINDOWS_DLL_EXIT_CODES.has(exit.code >>> 0)) || MISSING_DEPENDENCY_PATTERN.test(output)) {
    return new PromptVoiceError(
      'LOCAL_RUNTIME_FAILED',
      `Local Whisper couldn't start because a system component is missing. Install: ${requirements.join('; ') || 'the runtime requirements'}.`,
      { detail: `Local Whisper startup failed (kind=missing-dependency, code=${exit.code})` }
    );
  }
  if (MODEL_FAILURE_PATTERN.test(output)) return startupError('model', exit.code);
  if (BIND_FAILURE_PATTERN.test(output)) return new PortConflict();
  return startupError('exit', exit.code);
}

type StartupFailure = 'spawn' | 'model' | 'exit' | 'timeout' | 'port';

const STARTUP_MESSAGES: Record<StartupFailure, string> = {
  spawn: "Local Whisper couldn't be launched. Reinstall the runtime and try again.",
  model: "The selected model couldn't be loaded. Remove it and download it again.",
  exit: 'Local Whisper stopped while starting. See the Zana log for details.',
  timeout: 'Local Whisper took too long to start. Try a smaller model.',
  port: "Local Whisper couldn't find a free local port. Try again."
};

function startupError(kind: StartupFailure, code: number | null, spawnCode?: string): PromptVoiceError {
  const fields = [`kind=${kind}`, `code=${code}`, ...(spawnCode ? [`spawn=${spawnCode.slice(0, 32)}`] : [])];
  return new PromptVoiceError('LOCAL_RUNTIME_FAILED', STARTUP_MESSAGES[kind], { detail: `Local Whisper startup failed (${fields.join(', ')})` });
}

/** Asks the process to exit, then forces it after `timeoutMs`. */
async function terminate(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.kill();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });
  const outcome = await Promise.race([exited, timedOut]);
  clearTimeout(timer);
  if (outcome === 'timeout') {
    child.kill('SIGKILL');
    await exited;
  }
}

/** Asks the OS for a free loopback port. The server binds it moments later. */
export function findFreeLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, LOOPBACK, () => {
      const address = server.address();
      server.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('no port'))));
    });
  });
}
