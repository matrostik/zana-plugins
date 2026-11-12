import { homedir } from 'node:os';
import { describeUnexpectedFailure, PromptVoiceError } from '../errors.ts';
import type { FetchLike } from '../http.ts';
import { LOCAL_WHISPER_METHODS, type LocalWhisperResponse } from '../../shared/protocol.ts';
import { defaultInstallRoot } from './artifacts.ts';
import { LocalWhisperManager } from './manager.ts';

interface Host {
  rpc: { method(name: string, handler: (args: unknown) => unknown | Promise<unknown>): void };
  log: { warn(message: string): void; error(message: string): void };
  storage?: { kv?: { get<T>(key: string): Promise<T | undefined>; set(key: string, value: unknown): Promise<void> } };
}

/**
 * Creates and initializes the manager for this machine. Returns null if initialization fails,
 * so a broken install can't stop the rest of Prompt Voice from loading.
 */
export async function createLocalWhisperManager(host: Host, fetchImpl: FetchLike): Promise<LocalWhisperManager | null> {
  const manager = new LocalWhisperManager({
    root: defaultInstallRoot({ platform: process.platform, env: process.env, homeDir: homedir() }),
    target: { platform: process.platform, arch: process.arch },
    fetch: fetchImpl,
    kv: host.storage?.kv,
    log: host.log
  });
  try {
    await manager.init();
    return manager;
  } catch (error) {
    host.log.error(`Local Whisper unavailable: ${describeUnexpectedFailure(error, 'Local Whisper init')}`);
    return null;
  }
}

/** Registers the settings-page methods. Every method returns a LocalWhisperResponse, never throws. */
export function registerLocalWhisperMethods(host: Host, manager: LocalWhisperManager | null): void {
  const handle = (name: string, action: (manager: LocalWhisperManager, args: Record<string, unknown>) => unknown) => {
    host.rpc.method(name, async (args) => respond(host, manager, () => action(manager as LocalWhisperManager, asRecord(args))));
  };
  handle(LOCAL_WHISPER_METHODS.state, (m) => m.getState());
  handle(LOCAL_WHISPER_METHODS.installRuntime, (m) => m.installRuntime());
  handle(LOCAL_WHISPER_METHODS.cancelRuntimeInstall, (m) => m.cancelRuntimeInstall());
  handle(LOCAL_WHISPER_METHODS.downloadModel, (m, args) => m.downloadModel(args.modelId));
  handle(LOCAL_WHISPER_METHODS.cancelModelDownload, (m, args) => m.cancelModelDownload(args.modelId));
  handle(LOCAL_WHISPER_METHODS.removeModel, (m, args) => m.removeModel(args.modelId));
  handle(LOCAL_WHISPER_METHODS.selectModel, (m, args) => m.selectModel(args.modelId));
  handle(LOCAL_WHISPER_METHODS.start, (m) => m.startServer());
  handle(LOCAL_WHISPER_METHODS.stop, (m) => m.stopServer());
}

async function respond(host: Host, manager: LocalWhisperManager | null, action: () => unknown): Promise<LocalWhisperResponse> {
  if (!manager) {
    return { ok: false, code: 'LOCAL_RUNTIME_FAILED', message: 'Local Whisper is unavailable. See the Zana log for details.', state: null };
  }
  try {
    await action();
    return { ok: true, state: manager.getState() };
  } catch (error) {
    if (error instanceof PromptVoiceError) {
      return { ok: false, code: error.code, message: error.userMessage, state: manager.getState() };
    }
    host.log.error(`Local Whisper request failed: ${describeUnexpectedFailure(error, 'Local Whisper')}`);
    return { ok: false, code: 'INTERNAL', message: 'Something went wrong. See the Zana log for details.', state: manager.getState() };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
