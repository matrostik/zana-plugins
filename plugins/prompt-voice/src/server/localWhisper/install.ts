import { chmod, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { PromptVoiceError } from '../errors.ts';
import type { FetchLike } from '../http.ts';
import { WHISPER_CPP_VERSION, type RuntimeArtifact } from './artifacts.ts';
import { downloadVerified, removeStalePartials, type DownloadProgress } from './download.ts';
import { extractArchive, systemTar, type RunCommand } from './extract.ts';

/** Written last, so its presence means the runtime folder is complete. */
const INSTALL_MARKER = 'installed.json';

export interface RuntimeInstallOptions {
  artifact: RuntimeArtifact;
  /** App-private root from `defaultInstallRoot`. */
  root: string;
  fetch?: FetchLike;
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
  run?: RunCommand;
  env?: Record<string, string | undefined>;
  /** Free-space probe passed to the download. Injected in tests. */
  freeBytes?: (directory: string) => Promise<number>;
}

export function runtimeDirectory(root: string, artifact: RuntimeArtifact): string {
  return join(root, 'runtime', `${WHISPER_CPP_VERSION}-${artifact.platform}-${artifact.arch}`);
}

export function serverExecutable(root: string, artifact: RuntimeArtifact): string {
  return join(runtimeDirectory(root, artifact), ...artifact.serverEntry.split('/'));
}

/**
 * Returns the server path if this exact artifact is fully installed. The marker must
 * name the same SHA-256, so a changed pin triggers a reinstall.
 */
export async function installedRuntime(root: string, artifact: RuntimeArtifact): Promise<string | null> {
  try {
    const marker = JSON.parse(await readFile(join(runtimeDirectory(root, artifact), INSTALL_MARKER), 'utf8'));
    if (marker?.sha256 !== artifact.sha256) return null;
    const executable = serverExecutable(root, artifact);
    return (await stat(executable)).isFile() ? executable : null;
  } catch {
    return null;
  }
}

/**
 * Downloads, verifies, and unpacks the runtime, returning the server executable path.
 * Already-installed runtimes are reused. The downloaded archive is deleted after a
 * successful install.
 */
export async function installRuntime(options: RuntimeInstallOptions): Promise<string> {
  const { artifact, root } = options;
  const existing = await installedRuntime(root, artifact);
  if (existing) return existing;

  const downloads = join(root, 'downloads');
  await removeStalePartials(downloads);
  const archivePath = join(downloads, basename(new URL(artifact.url).pathname));
  try {
    await downloadVerified({ file: artifact, destination: archivePath, fetch: options.fetch, signal: options.signal, onProgress: options.onProgress, freeBytes: options.freeBytes });
    const directory = runtimeDirectory(root, artifact);
    const tar = systemTar(artifact.platform, options.env ?? process.env);
    await extractArchive({ archivePath, destination: directory, tar, run: options.run });

    const executable = serverExecutable(root, artifact);
    if (!(await stat(executable).then((s) => s.isFile(), () => false))) {
      await rm(directory, { recursive: true, force: true });
      throw new PromptVoiceError('DOWNLOAD_INTEGRITY', 'The runtime package is missing its server program.', {
        detail: `Local Whisper archive has no ${artifact.serverEntry}`
      });
    }
    if (artifact.platform !== 'win32') await chmod(executable, 0o755);
    const marker = { version: WHISPER_CPP_VERSION, sha256: artifact.sha256, installedAt: new Date().toISOString() };
    await writeFile(join(directory, INSTALL_MARKER), JSON.stringify(marker, null, 2));
    return executable;
  } finally {
    await rm(archivePath, { force: true }).catch(() => undefined);
  }
}
