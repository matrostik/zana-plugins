import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { findFreeLoopbackPort, WhisperServerProcess, type ServerStatus, type StartOptions } from '../server/localWhisper/process.ts';

/** Minimal stand-in for a spawned server. `ignoreTerm` simulates a process that ignores SIGTERM. */
class FakeChild extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  exitCode: number | null = null;
  signalCode: string | null = null;
  kills: string[] = [];
  constructor(private readonly ignoreTerm = false) {
    super();
  }
  kill(signal = 'SIGTERM') {
    this.kills.push(signal);
    if (this.ignoreTerm && signal === 'SIGTERM') return true;
    this.exit(null, signal);
    return true;
  }
  exit(code: number | null, signal: string | null = null) {
    this.exitCode = code;
    this.signalCode = signal;
    queueMicrotask(() => this.emit('exit', code, signal));
  }
}

let runDirectory: string;
let options: StartOptions;
beforeEach(async () => {
  runDirectory = await mkdtemp(join(tmpdir(), 'pv-run-'));
  options = {
    executable: join('opt', 'runtime', 'whisper-server'),
    modelPath: join('opt', 'models', 'ggml-base.bin'),
    modelId: 'base',
    runDirectory,
    threads: 4,
    requirements: ['Microsoft Visual C++ 2015–2022 Redistributable']
  };
});
afterEach(async () => {
  await rm(runDirectory, { recursive: true, force: true });
});

type Responder = (attempt: number) => 'refused' | 'ours' | 'foreign' | 'notfound';

/** Builds a manager whose fake server answers identity probes as `respond` dictates. */
function harness(respond: Responder, opts: { ignoreTerm?: boolean; onSpawn?: (child: FakeChild) => void } = {}) {
  const children: FakeChild[] = [];
  const spawn = vi.fn(() => {
    const child = new FakeChild(opts.ignoreTerm);
    children.push(child);
    opts.onSpawn?.(child);
    return child as unknown as ChildProcess;
  });
  let attempt = 0;
  const fetchImpl = vi.fn(async () => {
    const answer = respond(attempt++);
    if (answer === 'refused') throw new TypeError('fetch failed');
    if (answer === 'notfound') return new Response('File Not Found', { status: 404 });
    const token = answer === 'ours' ? await readFile(join(runDirectory, 'pv-identity.txt'), 'utf8') : 'someone-else';
    return new Response(token);
  });
  let port = 40000;
  const findPort = vi.fn(async () => ++port);
  const manager = new WhisperServerProcess({ spawn, fetch: fetchImpl as typeof fetch, findPort, pollIntervalMs: 1, readyTimeoutMs: 500, stopTimeoutMs: 20 });
  const statuses: ServerStatus[] = [];
  manager.onStatusChange((status) => statuses.push(status));
  return { manager, spawn, children, findPort, statuses };
}

describe('WhisperServerProcess.start', () => {
  it('starts on loopback with safe arguments and becomes running once its own token answers', async () => {
    const { manager, spawn, statuses } = harness((n) => (n < 2 ? 'refused' : 'ours'));
    const baseUrl = await manager.start(options);
    expect(baseUrl).toBe('http://127.0.0.1:40001');
    expect(manager.status).toEqual({ state: 'running', modelId: 'base', baseUrl });
    expect(statuses.map((s) => s.state)).toEqual(['starting', 'running']);

    const [command, args, spawnOptions] = spawn.mock.calls[0] as unknown as [string, string[], Record<string, unknown>];
    expect(command).toBe(options.executable);
    expect(args).toEqual(['--host', '127.0.0.1', '--port', '40001', '-m', options.modelPath, '-t', '4', '-l', 'auto', '--public', runDirectory]);
    expect(spawnOptions).toMatchObject({ windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    expect(await readFile(join(runDirectory, 'pv-identity.txt'), 'utf8')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('retries on a new port when another server answers, and stops the first child', async () => {
    const { manager, children, findPort } = harness((n) => (n === 0 ? 'foreign' : 'ours'));
    await expect(manager.start(options)).resolves.toBe('http://127.0.0.1:40002');
    expect(findPort).toHaveBeenCalledTimes(2);
    expect(children[0].kills).toEqual(['SIGTERM']);
    expect(children[1].kills).toEqual([]);
  });

  it('treats a 404 for the token as another server, and gives up after one retry', async () => {
    const { manager, children } = harness(() => 'notfound');
    await expect(manager.start(options)).rejects.toMatchObject({ code: 'LOCAL_RUNTIME_FAILED', detail: expect.stringContaining('kind=port') });
    expect(children).toHaveLength(2);
    expect(children.every((child) => child.kills.length > 0)).toBe(true);
    expect(manager.status).toEqual({ state: 'stopped' });
  });

  it('reports a model that fails to load', async () => {
    const { manager } = harness(() => 'refused', {
      onSpawn: (child) =>
        setTimeout(() => {
          child.stderr.write('whisper_model_load: invalid model data (bad magic)\nerror: failed to initialize whisper context\n');
          child.exit(3);
        }, 5)
    });
    const error = await manager.start(options).catch((e) => e);
    expect(error).toMatchObject({ code: 'LOCAL_RUNTIME_FAILED', userMessage: expect.stringContaining('download it again') });
    expect(error.detail).not.toContain('bad magic');
    expect(manager.status).toEqual({ state: 'stopped' });
  });

  it.each([
    ['a Windows missing-DLL exit code', 3221225781, ''],
    ['a signed Windows missing-DLL exit code', -1073741515, ''],
    ['a glibc error', 1, "./whisper-server: version `GLIBCXX_3.4.30' not found"],
    ['a missing libgomp', 127, 'error while loading shared libraries: libgomp.so.1: cannot open shared object file']
  ])('names the system requirements for %s', async (_label, code, line) => {
    const { manager } = harness(() => 'refused', {
      onSpawn: (child) => setTimeout(() => (child.stderr.write(`${line}\n`), child.exit(code)), 5)
    });
    await expect(manager.start(options)).rejects.toMatchObject({
      code: 'LOCAL_RUNTIME_FAILED',
      userMessage: expect.stringContaining('Visual C++'),
      detail: expect.stringContaining('missing-dependency')
    });
  });

  it('reports a launch failure such as a missing executable', async () => {
    const { manager } = harness(() => 'refused', {
      onSpawn: (child) => setTimeout(() => child.emit('error', Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' })), 5)
    });
    await expect(manager.start(options)).rejects.toMatchObject({ code: 'LOCAL_RUNTIME_FAILED', detail: expect.stringContaining('spawn=ENOENT') });
  });

  it('times out a server that never becomes ready and stops it', async () => {
    const { manager, children } = harness(() => 'refused');
    await expect(manager.start(options)).rejects.toMatchObject({ detail: expect.stringContaining('kind=timeout') });
    expect(children[0].kills).toEqual(['SIGTERM']);
  });

  it('stops the previous server before starting with another model', async () => {
    const { manager, children } = harness(() => 'ours');
    await manager.start(options);
    await manager.start({ ...options, modelId: 'small' });
    expect(children[0].kills).toEqual(['SIGTERM']);
    expect(manager.status).toMatchObject({ state: 'running', modelId: 'small' });
  });
});

describe('WhisperServerProcess lifecycle', () => {
  it('reports a crash after startup with the exit code', async () => {
    const { manager, children, statuses } = harness(() => 'ours');
    await manager.start(options);
    children[0].exit(134);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(manager.status).toEqual({ state: 'crashed', modelId: 'base', exitCode: 134 });
    expect(statuses.at(-1)?.state).toBe('crashed');
  });

  it('stops its own server without reporting a crash', async () => {
    const { manager, children, statuses } = harness(() => 'ours');
    await manager.start(options);
    await manager.stop();
    expect(children[0].kills).toEqual(['SIGTERM']);
    expect(manager.status).toEqual({ state: 'stopped' });
    expect(statuses.map((s) => s.state)).toEqual(['starting', 'running', 'stopped']);
  });

  it('forces a server that ignores the stop request', async () => {
    const { manager, children } = harness(() => 'ours', { ignoreTerm: true });
    await manager.start(options);
    await manager.stop();
    expect(children[0].kills).toEqual(['SIGTERM', 'SIGKILL']);
  });

  it('does nothing when asked to stop with no server running', async () => {
    const { manager, statuses } = harness(() => 'ours');
    await manager.stop();
    expect(statuses).toEqual([]);
  });

  it('survives an error event after startup', async () => {
    const { manager, children } = harness(() => 'ours');
    await manager.start(options);
    expect(() => children[0].emit('error', new Error('late failure'))).not.toThrow();
  });
});

describe('findFreeLoopbackPort', () => {
  it('returns a usable port number', async () => {
    const port = await findFreeLoopbackPort();
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThan(65536);
  });
});
