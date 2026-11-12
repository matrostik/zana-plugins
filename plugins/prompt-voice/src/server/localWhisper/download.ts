import { createHash, randomBytes } from 'node:crypto';
import { mkdir, open, readdir, rename, rm, statfs } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { PromptVoiceError } from '../errors.ts';
import type { FetchLike } from '../http.ts';
import type { PinnedFile } from './artifacts.ts';

/** Free space kept beyond the file itself so a download never fills the disk completely. */
export const DISK_SPACE_MARGIN_BYTES = 256 * 1024 * 1024;

/** Minimum gap between progress callbacks, so large downloads don't flood the UI. */
const PROGRESS_INTERVAL_MS = 250;

const PARTIAL_SUFFIX = '.partial';

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number;
}

export interface DownloadOptions {
  file: PinnedFile;
  /** Final path. It appears only after the size and hash have been verified. */
  destination: string;
  fetch?: FetchLike;
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
  /** Free bytes available at a directory. Injected in tests. */
  freeBytes?: (directory: string) => Promise<number>;
  now?: () => number;
}

/**
 * Downloads a pinned file and moves it into place atomically.
 *
 * Bytes stream to a uniquely named partial file beside the destination while being hashed.
 * The partial file is renamed only if the byte count and SHA-256 match the pin exactly, and is
 * deleted on any failure or cancellation. A half-written or tampered file is never left
 * at `destination`.
 */
export async function downloadVerified(options: DownloadOptions): Promise<void> {
  const { file, destination, signal } = options;
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const label = basename(destination);

  assertHttps(file.url);
  throwIfCancelled(signal);
  const directory = dirname(destination);
  await mkdir(directory, { recursive: true });
  await ensureFreeSpace(directory, file.size, options.freeBytes ?? freeBytesAt);

  const partial = join(directory, `.${label}.${randomBytes(6).toString('hex')}${PARTIAL_SUFFIX}`);
  try {
    await streamToFile({ fetchImpl, file, partial, signal, label, now, onProgress: options.onProgress });
    await rename(partial, destination);
  } catch (error) {
    await rm(partial, { force: true }).catch(() => undefined);
    throw classifyDownloadError(error, label, signal);
  }
}

async function streamToFile(args: {
  fetchImpl: FetchLike;
  file: PinnedFile;
  partial: string;
  signal?: AbortSignal;
  label: string;
  now: () => number;
  onProgress?: (progress: DownloadProgress) => void;
}): Promise<void> {
  const { fetchImpl, file, partial, signal, label, now, onProgress } = args;
  const response = await fetchImpl(file.url, { signal, redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new PromptVoiceError('DOWNLOAD_FAILED', `Couldn't download ${label}. Check your connection and try again.`, {
      status: response.status,
      detail: `Local Whisper download HTTP ${response.status} for ${label}`
    });
  }

  const hash = createHash('sha256');
  const handle = await open(partial, 'wx');
  let received = 0;
  let lastReport = 0;
  try {
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      // Checked per chunk so cancellation works even if the body stream ignores the signal.
      throwIfCancelled(signal);
      received += chunk.byteLength;
      // Stop early instead of writing an unbounded body to disk.
      if (received > file.size) throw integrityError(label, `received more than ${file.size} bytes`);
      hash.update(chunk);
      await handle.write(chunk);
      if (onProgress && now() - lastReport >= PROGRESS_INTERVAL_MS) {
        lastReport = now();
        onProgress({ receivedBytes: received, totalBytes: file.size });
      }
    }
    await handle.sync();
  } finally {
    await handle.close();
  }

  if (received !== file.size) throw integrityError(label, `expected ${file.size} bytes, received ${received}`);
  const digest = hash.digest('hex');
  if (digest !== file.sha256) throw integrityError(label, 'SHA-256 mismatch');
  onProgress?.({ receivedBytes: received, totalBytes: file.size });
}

function integrityError(label: string, detail: string): PromptVoiceError {
  return new PromptVoiceError(
    'DOWNLOAD_INTEGRITY',
    `${label} didn't match its expected checksum, so it was discarded. Try again, or check your network or proxy.`,
    { detail: `Local Whisper integrity check failed for ${label}: ${detail}` }
  );
}

async function ensureFreeSpace(directory: string, size: number, freeBytes: (directory: string) => Promise<number>): Promise<void> {
  let available: number;
  try {
    available = await freeBytes(directory);
  } catch {
    // Some filesystems can't report free space; the write itself will still fail cleanly.
    return;
  }
  if (available < size + DISK_SPACE_MARGIN_BYTES) {
    throw new PromptVoiceError(
      'DOWNLOAD_NO_SPACE',
      `Not enough disk space. This download needs about ${formatBytes(size + DISK_SPACE_MARGIN_BYTES)} free.`,
      { detail: `Local Whisper download needs ${size} bytes plus margin; ${available} available` }
    );
  }
}

async function freeBytesAt(directory: string): Promise<number> {
  const stats = await statfs(directory);
  return stats.bavail * stats.bsize;
}

function assertHttps(url: string): void {
  if (new URL(url).protocol !== 'https:') {
    throw new PromptVoiceError('DOWNLOAD_FAILED', 'Download source is not secure.', { detail: 'Local Whisper pinned URL is not https' });
  }
}

function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw cancelledError();
}

function cancelledError(): PromptVoiceError {
  return new PromptVoiceError('DOWNLOAD_CANCELLED', 'Download cancelled.');
}

/**
 * Keeps known errors, reports aborts as cancellation, and gives transport and filesystem
 * failures a generic message. Only error codes are logged, never messages, which may contain paths.
 */
function classifyDownloadError(error: unknown, label: string, signal: AbortSignal | undefined): PromptVoiceError {
  if (signal?.aborted) return cancelledError();
  if (error instanceof PromptVoiceError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 'ENOSPC') {
    return new PromptVoiceError('DOWNLOAD_NO_SPACE', 'The disk filled up during the download. Free some space and try again.', {
      detail: `Local Whisper download ENOSPC for ${label}`
    });
  }
  const safeCode = typeof code === 'string' && /^[A-Z0-9_]{1,32}$/.test(code) ? code : 'unknown';
  return new PromptVoiceError('DOWNLOAD_FAILED', `Couldn't download ${label}. Check your connection and try again.`, {
    detail: `Local Whisper download failed for ${label} (code=${safeCode})`
  });
}

/**
 * Deletes partial files left by a download that was interrupted by a crash or restart.
 * Call once at startup, before any download begins in `directory`. Returns how many were removed.
 */
export async function removeStalePartials(directory: string): Promise<number> {
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if ((error as { code?: unknown }).code === 'ENOENT') return 0;
    throw error;
  }
  const stale = names.filter((name) => name.startsWith('.') && name.endsWith(PARTIAL_SUFFIX));
  await Promise.all(stale.map((name) => rm(join(directory, name), { force: true })));
  return stale.length;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.ceil(bytes / 1024 ** 2)} MB`;
}
