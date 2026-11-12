import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { PromptVoiceError } from '../errors.ts';
import type { FetchLike } from '../http.ts';
import { TranscriptionQueue, type LocalWhisperEndpoint } from '../stt/localWhisper.ts';
import { findModel, MODEL_CATALOG, selectRuntimeArtifact, WHISPER_CPP_VERSION, type RuntimeArtifact } from './artifacts.ts';
import type { DownloadProgress } from './download.ts';
import { installedRuntime, installRuntime } from './install.ts';
import { cleanupInterruptedDownloads, installModel, listInstalledModels, modelPath, removeModel } from './models.ts';
import { WhisperServerProcess } from './process.ts';
import type { LocalWhisperModelView, LocalWhisperStateView } from '../../shared/protocol.ts';

const ACTIVE_MODEL_KEY = 'localWhisper.activeModel';
/** whisper.cpp's own default; more threads rarely help small models and starve the UI. */
const MAX_THREADS = 4;

/** Shared with the app so the settings page and server agree on the shape. */
export type ModelView = LocalWhisperModelView;
export type LocalWhisperState = LocalWhisperStateView;

export interface ManagerDeps {
  root: string;
  target: { platform: string; arch: string };
  fetch?: FetchLike;
  process?: WhisperServerProcess;
  kv?: { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): Promise<void> };
  log: { warn(message: string): void; error(message: string): void };
  allowUnverified?: boolean;
}

interface Download {
  controller: AbortController;
  progress: number;
}

/**
 * Owns Local Whisper on this machine: runtime install, model downloads, and the server
 * process. Long operations run in the background and are reported through `getState()`, so
 * RPC calls return immediately and the settings page polls for progress.
 */
export class LocalWhisperManager implements LocalWhisperEndpoint {
  readonly queue = new TranscriptionQueue();
  private readonly artifact: RuntimeArtifact | null;
  private readonly unsupportedMessage: string | null;
  private readonly process: WhisperServerProcess;
  private executable: string | null = null;
  private runtimeDownload: Download | null = null;
  private readonly modelDownloads = new Map<string, Download>();
  private installedModels = new Set<string>();
  private activeModelId: string | null = null;
  private starting: { modelId: string; promise: Promise<string> } | null = null;
  private lastError: LocalWhisperState['lastError'] = null;

  constructor(private readonly deps: ManagerDeps) {
    const selection = selectRuntimeArtifact(deps.target, { allowUnverified: deps.allowUnverified });
    this.artifact = selection.ok ? selection.artifact : null;
    this.unsupportedMessage = selection.ok ? null : selection.message;
    this.process = deps.process ?? new WhisperServerProcess({ fetch: deps.fetch });
  }

  /** Reads what is already installed. Call once at startup, before any other method. */
  async init(): Promise<void> {
    await cleanupInterruptedDownloads(this.deps.root).catch((error) => this.logFailure('cleanup', error));
    if (this.artifact) this.executable = await installedRuntime(this.deps.root, this.artifact);
    this.installedModels = new Set(await listInstalledModels(this.deps.root));
    const saved = await this.deps.kv?.get<string>(ACTIVE_MODEL_KEY).catch(() => undefined);
    this.activeModelId = typeof saved === 'string' && this.installedModels.has(saved) ? saved : null;
  }

  getState(): LocalWhisperState {
    const status = this.process.status;
    return {
      platform: this.unsupportedMessage ? { supported: false, message: this.unsupportedMessage } : { supported: true },
      runtime: {
        status: this.executable ? 'installed' : this.runtimeDownload ? 'installing' : 'not-installed',
        version: WHISPER_CPP_VERSION,
        requirements: this.artifact?.requirements ?? [],
        ...(this.runtimeDownload ? { progress: this.runtimeDownload.progress } : {})
      },
      server: {
        state: status.state,
        ...('modelId' in status ? { modelId: status.modelId } : {}),
        ...(status.state === 'crashed' ? { exitCode: status.exitCode } : {})
      },
      activeModelId: this.activeModelId,
      models: MODEL_CATALOG.map((model) => this.modelView(model.id)),
      lastError: this.lastError
    };
  }

  /** Starts the runtime download in the background. */
  installRuntime(): LocalWhisperState {
    const artifact = this.requireArtifact();
    if (this.executable || this.runtimeDownload) return this.getState();
    const download = this.beginDownload();
    this.runtimeDownload = download;
    void installRuntime({ artifact, root: this.deps.root, fetch: this.deps.fetch, signal: download.controller.signal, onProgress: track(download) })
      .then((executable) => (this.executable = executable))
      .catch((error) => this.recordFailure('install-runtime', error))
      .finally(() => (this.runtimeDownload = null));
    return this.getState();
  }

  cancelRuntimeInstall(): LocalWhisperState {
    this.runtimeDownload?.controller.abort();
    return this.getState();
  }

  /** Starts a model download in the background. Different models may download at once. */
  downloadModel(id: unknown): LocalWhisperState {
    this.requireArtifact();
    const model = requireModel(id);
    if (this.installedModels.has(model.id) || this.modelDownloads.has(model.id)) return this.getState();
    const download = this.beginDownload();
    this.modelDownloads.set(model.id, download);
    void installModel({ model, root: this.deps.root, fetch: this.deps.fetch, signal: download.controller.signal, onProgress: track(download) })
      .then(() => this.installedModels.add(model.id))
      .catch((error) => this.recordFailure('download-model', error))
      .finally(() => this.modelDownloads.delete(model.id));
    return this.getState();
  }

  cancelModelDownload(id: unknown): LocalWhisperState {
    this.modelDownloads.get(requireModel(id).id)?.controller.abort();
    return this.getState();
  }

  async removeModel(id: unknown): Promise<LocalWhisperState> {
    const model = requireModel(id);
    await removeModel(this.deps.root, model, this.activeModelId);
    this.installedModels.delete(model.id);
    return this.getState();
  }

  /**
   * Loads `id` and makes it active only once the server is running with it. If it fails to
   * load, the previous model is restarted so dictation keeps working.
   */
  async selectModel(id: unknown): Promise<LocalWhisperState> {
    const model = requireModel(id);
    if (!this.installedModels.has(model.id)) {
      throw new PromptVoiceError('LOCAL_RUNTIME_FAILED', `Download ${model.label} before using it.`);
    }
    const previous = this.activeModelId;
    try {
      await this.startWith(model.id);
    } catch (error) {
      this.recordFailure('select-model', error);
      if (previous && previous !== model.id) await this.startWith(previous).catch((restartError) => this.logFailure('restart-previous', restartError));
      throw error;
    }
    this.activeModelId = model.id;
    this.lastError = null;
    await this.deps.kv?.set(ACTIVE_MODEL_KEY, model.id).catch((error) => this.logFailure('save-active-model', error));
    return this.getState();
  }

  async startServer(): Promise<LocalWhisperState> {
    await this.resolveBaseUrl();
    this.lastError = null;
    return this.getState();
  }

  async stopServer(): Promise<LocalWhisperState> {
    await this.process.stop();
    return this.getState();
  }

  /** Endpoint for transcription: starts the server with the active model if it isn't running. */
  async resolveBaseUrl(): Promise<string> {
    const status = this.process.status;
    if (status.state === 'running' && status.modelId === this.activeModelId) return status.baseUrl;
    if (!this.executable || !this.activeModelId) {
      throw new PromptVoiceError('STT_FAILED', "Local Whisper isn't set up yet. Finish setup in Prompt Voice settings.");
    }
    return this.startWith(this.activeModelId);
  }

  modelLabel(): string {
    return this.activeModelId ?? 'none';
  }

  /** Stops the owned server and cancels downloads. Called when the plugin unloads. */
  async dispose(): Promise<void> {
    this.runtimeDownload?.controller.abort();
    for (const download of this.modelDownloads.values()) download.controller.abort();
    await this.process.stop();
  }

  /**
   * Concurrent callers for the same model share one start, so a burst of dictations launches
   * one server. A different model waits for the current start to settle, then starts.
   */
  private startWith(modelId: string): Promise<string> {
    if (this.starting?.modelId === modelId) return this.starting.promise;
    if (this.starting) return this.starting.promise.catch(() => undefined).then(() => this.startWith(modelId));
    const artifact = this.requireArtifact();
    const model = requireModel(modelId);
    const executable = this.executable;
    if (!executable) return Promise.reject(new PromptVoiceError('LOCAL_RUNTIME_FAILED', 'Install the Local Whisper runtime first.'));
    const promise = this.process
      .start({
        executable,
        modelPath: modelPath(this.deps.root, model),
        modelId,
        runDirectory: join(this.deps.root, 'run'),
        threads: Math.max(1, Math.min(MAX_THREADS, availableParallelism())),
        requirements: artifact.requirements
      })
      .finally(() => {
        if (this.starting?.promise === promise) this.starting = null;
      });
    this.starting = { modelId, promise };
    return promise;
  }

  private modelView(id: string): ModelView {
    const model = requireModel(id);
    const download = this.modelDownloads.get(id);
    return {
      id,
      label: model.label,
      sizeBytes: model.size,
      ...(model.memoryEstimate ? { memoryEstimate: model.memoryEstimate } : {}),
      recommended: model.recommended === true,
      status: this.installedModels.has(id) ? 'installed' : download ? 'downloading' : 'available',
      ...(download ? { progress: download.progress } : {})
    };
  }

  private beginDownload(): Download {
    this.lastError = null;
    return { controller: new AbortController(), progress: 0 };
  }

  private requireArtifact(): RuntimeArtifact {
    if (!this.artifact) throw new PromptVoiceError('LOCAL_RUNTIME_FAILED', this.unsupportedMessage ?? 'Local Whisper is not available here.');
    return this.artifact;
  }

  /** Cancellation is a user choice, not an error, so it isn't shown. */
  private recordFailure(operation: string, error: unknown): void {
    this.logFailure(operation, error);
    if (error instanceof PromptVoiceError && error.code === 'DOWNLOAD_CANCELLED') return;
    const known = error instanceof PromptVoiceError;
    this.lastError = {
      operation,
      code: known ? error.code : 'INTERNAL',
      message: known ? error.userMessage : 'Something went wrong. See the Zana log for details.'
    };
  }

  /** Logs only codes and log-safe details, never raw error messages. */
  private logFailure(operation: string, error: unknown): void {
    const detail = error instanceof PromptVoiceError ? error.detail ?? error.code : `unexpected ${error instanceof Error ? error.name : typeof error}`;
    this.deps.log.warn(`Local Whisper ${operation} failed: ${detail}`);
  }
}

function track(download: Download): (progress: DownloadProgress) => void {
  return ({ receivedBytes, totalBytes }) => {
    download.progress = totalBytes > 0 ? receivedBytes / totalBytes : 0;
  };
}

function requireModel(id: unknown) {
  const model = findModel(id);
  if (!model) throw new PromptVoiceError('LOCAL_RUNTIME_FAILED', 'Unknown Local Whisper model.');
  return model;
}
