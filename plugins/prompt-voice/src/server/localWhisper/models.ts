import { rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PromptVoiceError } from '../errors.ts';
import type { FetchLike } from '../http.ts';
import { MODEL_CATALOG, type ModelArtifact } from './artifacts.ts';
import { downloadVerified, removeStalePartials, type DownloadProgress } from './download.ts';

export function modelsDirectory(root: string): string {
  return join(root, 'models');
}

export function modelPath(root: string, model: ModelArtifact): string {
  return join(modelsDirectory(root), model.fileName);
}

/**
 * IDs of catalog models present on disk with the pinned size. Hashes are checked when a
 * model is downloaded; re-hashing gigabytes on every listing would be too slow.
 */
export async function listInstalledModels(root: string): Promise<string[]> {
  const present = await Promise.all(
    MODEL_CATALOG.map(async (model) => {
      const stats = await stat(modelPath(root, model)).catch(() => null);
      return stats?.isFile() && stats.size === model.size ? model.id : null;
    })
  );
  return present.filter((id): id is string => id !== null);
}

export interface ModelInstallOptions {
  model: ModelArtifact;
  root: string;
  fetch?: FetchLike;
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
  freeBytes?: (directory: string) => Promise<number>;
}

/** Downloads and verifies a model. Different models may download at the same time. */
export async function installModel(options: ModelInstallOptions): Promise<string> {
  const destination = modelPath(options.root, options.model);
  await downloadVerified({
    file: options.model,
    destination,
    fetch: options.fetch,
    signal: options.signal,
    onProgress: options.onProgress,
    freeBytes: options.freeBytes
  });
  return destination;
}

/** Deletes a model unless it is the one the running server has loaded. */
export async function removeModel(root: string, model: ModelArtifact, activeModelId: string | null): Promise<void> {
  if (model.id === activeModelId) {
    throw new PromptVoiceError('LOCAL_RUNTIME_FAILED', 'Choose another active model before removing this one.');
  }
  await rm(modelPath(root, model), { force: true });
}

/**
 * Removes partial files left by downloads interrupted by a crash or restart. Call once at
 * startup, before any download begins, so it can't delete an in-progress download.
 */
export async function cleanupInterruptedDownloads(root: string): Promise<number> {
  const counts = await Promise.all([removeStalePartials(modelsDirectory(root)), removeStalePartials(join(root, 'downloads'))]);
  return counts[0] + counts[1];
}
