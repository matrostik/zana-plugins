import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { lstat, mkdir, readdir, readlink, rename, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { PromptVoiceError } from '../errors.ts';

/** Generous bound for unpacking a ~10 MB archive, so a hung tar can't block installs forever. */
const EXTRACT_TIMEOUT_MS = 120_000;

/** Used only if neither SystemRoot nor windir is set, which Windows always sets. */
const DEFAULT_WINDOWS_ROOT = 'C:\\Windows';

/** Runs a program with an argument array (never through a shell) and returns stdout. */
export type RunCommand = (file: string, args: string[]) => Promise<string>;

export const runCommand: RunCommand = (file, args) =>
  new Promise((resolvePromise, reject) => {
    execFile(file, args, { windowsHide: true, timeout: EXTRACT_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
      else resolvePromise(stdout);
    });
  });

/**
 * The system tar. Windows 10 1803+ ships bsdtar, which also reads zip. The absolute path
 * avoids picking up a GNU tar from Git or MSYS on PATH, which cannot read zip.
 */
export function systemTar(platform: string, env: Record<string, string | undefined>): string {
  if (platform === 'win32') return join(env.SystemRoot || env.windir || DEFAULT_WINDOWS_ROOT, 'System32', 'tar.exe');
  return 'tar';
}

export interface ExtractOptions {
  archivePath: string;
  /** Final directory. It is replaced only after extraction and validation succeed. */
  destination: string;
  tar: string;
  run?: RunCommand;
}

/**
 * Unpacks an archive without letting any entry escape `destination`.
 *
 * Entry names are listed and checked before extraction. Files land in a staging folder whose
 * symlinks are then checked to resolve inside it, and the folder is moved into place last.
 * The archives are already hash-verified, so these checks are defense in depth.
 */
export async function extractArchive(options: ExtractOptions): Promise<void> {
  const { archivePath, destination, tar } = options;
  const run = options.run ?? runCommand;

  const listing = await run(tar, ['-tf', archivePath]).catch((error) => {
    throw extractFailure('list', error);
  });
  assertSafeEntries(listing.split(/\r?\n/).filter(Boolean));

  const staging = `${destination}.staging-${randomBytes(4).toString('hex')}`;
  try {
    await rm(staging, { recursive: true, force: true });
    await mkdir(staging, { recursive: true });
    await run(tar, ['-xf', archivePath, '-C', staging]).catch((error) => {
      throw extractFailure('extract', error);
    });
    await assertLinksStayInside(staging);
    await replaceDirectory(staging, destination);
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

/** Rejects absolute paths, drive letters, and any `..` segment. */
export function assertSafeEntries(entries: string[]): void {
  if (entries.length === 0) throw unsafeArchive('archive is empty');
  for (const entry of entries) {
    const normalized = entry.replace(/\\/g, '/');
    if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.split('/').includes('..')) {
      throw unsafeArchive('entry path escapes the install folder');
    }
  }
}

async function assertLinksStayInside(root: string): Promise<void> {
  const base = resolve(root);
  for (const name of await readdir(base, { recursive: true })) {
    const path = join(base, name);
    const stats = await lstat(path);
    if (!stats.isSymbolicLink()) continue;
    const target = await readlink(path);
    const resolved = resolve(dirname(path), target);
    const inside = relative(base, resolved);
    if (isAbsolute(target) || inside.startsWith('..') || isAbsolute(inside)) {
      throw unsafeArchive('symlink points outside the install folder');
    }
  }
}

/** Swaps `staging` into `destination`, keeping the old copy until the swap succeeds. */
async function replaceDirectory(staging: string, destination: string): Promise<void> {
  const previous = `${destination}.previous-${randomBytes(4).toString('hex')}`;
  const hadPrevious = await rename(destination, previous).then(
    () => true,
    (error: { code?: string }) => {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  );
  try {
    await rename(staging, destination);
  } catch (error) {
    if (hadPrevious) await rename(previous, destination).catch(() => undefined);
    throw error;
  }
  if (hadPrevious) await rm(previous, { recursive: true, force: true }).catch(() => undefined);
}

function unsafeArchive(detail: string): PromptVoiceError {
  return new PromptVoiceError('DOWNLOAD_INTEGRITY', 'The runtime package looks damaged and was not installed. Try again.', {
    detail: `Local Whisper archive rejected: ${detail}`
  });
}

function extractFailure(step: 'list' | 'extract', error: unknown): PromptVoiceError {
  const code = (error as { code?: unknown } | null)?.code;
  const safeCode = typeof code === 'string' || typeof code === 'number' ? String(code).slice(0, 32) : 'unknown';
  return new PromptVoiceError('DOWNLOAD_FAILED', "Couldn't unpack the Local Whisper runtime. Try again.", {
    detail: `Local Whisper archive ${step} failed (code=${safeCode})`
  });
}
