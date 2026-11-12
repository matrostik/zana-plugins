import { mkdir, mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findModel, selectRuntimeArtifact, type ModelArtifact, type RuntimeArtifact } from '../server/localWhisper/artifacts.ts';
import { runtimeDirectory, serverExecutable } from '../server/localWhisper/install.ts';
import { LocalWhisperManager } from '../server/localWhisper/manager.ts';
import { modelPath } from '../server/localWhisper/models.ts';
import type { ServerStatus, StartOptions, WhisperServerProcess } from '../server/localWhisper/process.ts';
import { PromptVoiceError } from '../server/errors.ts';

const TARGET = { platform: 'win32', arch: 'x64' };
const ARTIFACT = (selectRuntimeArtifact(TARGET) as { ok: true; artifact: RuntimeArtifact }).artifact;
const base = findModel('base') as ModelArtifact;
const tiny = findModel('tiny') as ModelArtifact;

/** Stands in for WhisperServerProcess. `failModels` fail to load. */
class FakeProcess {
  status: ServerStatus = { state: 'stopped' };
  starts: string[] = [];
  failModels = new Set<string>();
  delayMs = 0;
  async start(options: StartOptions): Promise<string> {
    this.starts.push(options.modelId);
    this.status = { state: 'starting', modelId: options.modelId };
    if (this.delayMs) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (this.failModels.has(options.modelId)) {
      this.status = { state: 'stopped' };
      throw new PromptVoiceError('LOCAL_RUNTIME_FAILED', "The selected model couldn't be loaded.", { detail: 'kind=model' });
    }
    const baseUrl = `http://127.0.0.1:4${this.starts.length.toString().padStart(4, '0')}`;
    this.status = { state: 'running', modelId: options.modelId, baseUrl };
    return baseUrl;
  }
  stop = vi.fn(async () => {
    this.status = { state: 'stopped' };
  });
}

let root: string;
let fake: FakeProcess;
let kvValues: Map<string, unknown>;
const log = { warn: vi.fn(), error: vi.fn() };
const kv = {
  get: async <T,>(key: string) => kvValues.get(key) as T | undefined,
  set: async (key: string, value: unknown) => void kvValues.set(key, value)
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pv-manager-'));
  fake = new FakeProcess();
  kvValues = new Map();
  log.warn.mockClear();
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function placeRuntime() {
  const executable = serverExecutable(root, ARTIFACT);
  await mkdir(dirname(executable), { recursive: true });
  await writeFile(executable, 'server');
  await writeFile(join(runtimeDirectory(root, ARTIFACT), 'installed.json'), JSON.stringify({ sha256: ARTIFACT.sha256 }));
}

async function placeModel(model: ModelArtifact) {
  const path = modelPath(root, model);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, '');
  await truncate(path, model.size);
}

async function manager(target = TARGET, fetchImpl?: typeof fetch) {
  const instance = new LocalWhisperManager({ root, target, process: fake as unknown as WhisperServerProcess, kv, log, fetch: fetchImpl });
  await instance.init();
  return instance;
}

const until = async (check: () => boolean) => {
  for (let i = 0; i < 200 && !check(); i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
};

describe('LocalWhisperManager state', () => {
  it('starts empty on a fresh machine', async () => {
    const state = (await manager()).getState();
    expect(state).toMatchObject({ platform: { supported: true }, runtime: { status: 'not-installed', version: 'v1.9.5' }, server: { state: 'stopped' }, activeModelId: null, lastError: null });
    expect(state.models.find((m) => m.id === 'base')).toMatchObject({ status: 'available', recommended: true, sizeBytes: base.size });
  });

  it('restores the installed runtime, models, and saved active model', async () => {
    await placeRuntime();
    await placeModel(base);
    kvValues.set('localWhisper.activeModel', 'base');
    const state = (await manager()).getState();
    expect(state.runtime.status).toBe('installed');
    expect(state.activeModelId).toBe('base');
    expect(state.models.find((m) => m.id === 'base')?.status).toBe('installed');
  });

  it('ignores a saved active model that is no longer installed', async () => {
    kvValues.set('localWhisper.activeModel', 'small');
    expect((await manager()).getState().activeModelId).toBeNull();
  });

  it('reports unsupported platforms and refuses to install there', async () => {
    const instance = await manager({ platform: 'darwin', arch: 'arm64' });
    expect(instance.getState().platform).toEqual({ supported: false, message: expect.stringContaining('macOS arm64') });
    expect(() => instance.installRuntime()).toThrow(expect.objectContaining({ code: 'LOCAL_RUNTIME_FAILED' }));
    expect(() => instance.downloadModel('base')).toThrow(expect.objectContaining({ code: 'LOCAL_RUNTIME_FAILED' }));
  });
});

describe('LocalWhisperManager downloads', () => {
  it('shows a failed model download as an error and returns the model to available', async () => {
    const wrongBytes = vi.fn(async () => new Response('not the model'));
    const instance = await manager(TARGET, wrongBytes as unknown as typeof fetch);
    expect(instance.downloadModel('tiny').models.find((m) => m.id === 'tiny')?.status).toBe('downloading');
    await until(() => instance.getState().lastError !== null);
    expect(instance.getState().lastError).toMatchObject({ operation: 'download-model', code: 'DOWNLOAD_INTEGRITY' });
    expect(instance.getState().models.find((m) => m.id === 'tiny')?.status).toBe('available');
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('download-model failed'));
  });

  it('cancels a download without reporting an error', async () => {
    const hanging = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
    );
    const instance = await manager(TARGET, hanging as unknown as typeof fetch);
    instance.downloadModel('tiny');
    await until(() => hanging.mock.calls.length > 0);
    instance.cancelModelDownload('tiny');
    await until(() => instance.getState().models.find((m) => m.id === 'tiny')?.status === 'available');
    expect(instance.getState().lastError).toBeNull();
  });

  it('does not start a second download of the same model', async () => {
    const hanging = vi.fn(() => new Promise<Response>(() => undefined));
    const instance = await manager(TARGET, hanging as unknown as typeof fetch);
    instance.downloadModel('tiny');
    instance.downloadModel('tiny');
    await until(() => hanging.mock.calls.length > 0);
    expect(hanging).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown model ids', async () => {
    const instance = await manager();
    expect(() => instance.downloadModel('../../etc/passwd')).toThrow('Unknown Local Whisper model.');
  });
});

describe('LocalWhisperManager models and server', () => {
  it('activates a model only after it loads, and saves the choice', async () => {
    await placeRuntime();
    await placeModel(base);
    const instance = await manager();
    const state = await instance.selectModel('base');
    expect(state).toMatchObject({ activeModelId: 'base', server: { state: 'running', modelId: 'base' } });
    expect(kvValues.get('localWhisper.activeModel')).toBe('base');
  });

  it('keeps the previous model when the new one fails to load, and restarts it', async () => {
    await placeRuntime();
    await placeModel(base);
    await placeModel(tiny);
    const instance = await manager();
    await instance.selectModel('base');
    fake.failModels.add('tiny');
    await expect(instance.selectModel('tiny')).rejects.toMatchObject({ code: 'LOCAL_RUNTIME_FAILED' });
    expect(instance.getState()).toMatchObject({ activeModelId: 'base', server: { state: 'running', modelId: 'base' }, lastError: { operation: 'select-model' } });
    expect(fake.starts).toEqual(['base', 'tiny', 'base']);
    expect(kvValues.get('localWhisper.activeModel')).toBe('base');
  });

  it('refuses to select a model that is not downloaded', async () => {
    await placeRuntime();
    const instance = await manager();
    await expect(instance.selectModel('small')).rejects.toMatchObject({ userMessage: 'Download Small before using it.' });
    expect(fake.starts).toEqual([]);
  });

  it('refuses to remove the active model but removes others', async () => {
    await placeRuntime();
    await placeModel(base);
    await placeModel(tiny);
    const instance = await manager();
    await instance.selectModel('base');
    await expect(instance.removeModel('base')).rejects.toMatchObject({ code: 'LOCAL_RUNTIME_FAILED' });
    const state = await instance.removeModel('tiny');
    expect(state.models.find((m) => m.id === 'tiny')?.status).toBe('available');
  });

  it('starts the server on demand for transcription, once for concurrent requests', async () => {
    await placeRuntime();
    await placeModel(base);
    kvValues.set('localWhisper.activeModel', 'base');
    const instance = await manager();
    fake.delayMs = 20;
    const urls = await Promise.all([instance.resolveBaseUrl(), instance.resolveBaseUrl(), instance.resolveBaseUrl()]);
    expect(new Set(urls).size).toBe(1);
    expect(fake.starts).toEqual(['base']);
    await expect(instance.resolveBaseUrl()).resolves.toBe(urls[0]);
    expect(fake.starts).toEqual(['base']);
    expect(instance.modelLabel()).toBe('base');
  });

  it('restarts after a crash when transcription needs it', async () => {
    await placeRuntime();
    await placeModel(base);
    kvValues.set('localWhisper.activeModel', 'base');
    const instance = await manager();
    await instance.resolveBaseUrl();
    fake.status = { state: 'crashed', modelId: 'base', exitCode: 134 };
    expect(instance.getState().server).toEqual({ state: 'crashed', modelId: 'base', exitCode: 134 });
    await instance.resolveBaseUrl();
    expect(fake.starts).toEqual(['base', 'base']);
  });

  it('explains that setup is unfinished when nothing is installed', async () => {
    const instance = await manager();
    await expect(instance.resolveBaseUrl()).rejects.toMatchObject({ code: 'STT_FAILED', userMessage: expect.stringContaining('Finish setup') });
  });

  it('stops its server on dispose', async () => {
    await placeRuntime();
    await placeModel(base);
    const instance = await manager();
    await instance.selectModel('base');
    await instance.dispose();
    expect(fake.stop).toHaveBeenCalled();
    expect(instance.getState().server.state).toBe('stopped');
  });
});
