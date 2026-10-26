import { execFile, execFileSync, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const PINNED_NATIVE_ACP_VERSION = '1.4.3';

export interface NativeBinaryDistribution {
  archive: string;
  cmd: string;
  args: string[];
  sha256: string;
  companionFiles: string[];
}

/**
 * Official Agent Client Protocol registry distribution table for `antigravity-acp` 1.4.3.
 * Source: https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json
 */
export const NATIVE_ACP_DISTRIBUTIONS: Readonly<Record<string, NativeBinaryDistribution>> = {
  'windows-x86_64': {
    archive: 'https://dl.google.com/agy-extensions/releases/windows/agy-acp-server-1.4.3-windows-x86_64.zip',
    cmd: 'agy_acp_server.exe',
    args: [],
    sha256: '54c2e16378d9a4952e1da70e355f3c33c4f284308d6de48ab3e6e34a127bd325',
    companionFiles: ['localharness_external.exe']
  },
  'windows-aarch64': {
    archive: 'https://dl.google.com/agy-extensions/releases/windows/agy-acp-server-1.4.3-windows-arm64.zip',
    cmd: 'agy_acp_server.exe',
    args: [],
    sha256: 'fcd46431ad33d3b510ce0b98fe7b43d095bd8b3f1c363ee2d57faa7ee981c7bb',
    companionFiles: ['localharness_external.exe']
  },
  'darwin-aarch64': {
    archive: 'https://dl.google.com/agy-extensions/releases/macos/agy-acp-server-1.4.3-darwin-arm64.zip',
    cmd: 'agy_acp_server.par',
    args: [],
    sha256: 'c57db0a9b8b712daa9c3c17cdb990a61842ea569f279e8bd79d7aa85a303b20b',
    companionFiles: []
  },
  'darwin-x86_64': {
    archive: 'https://dl.google.com/agy-extensions/releases/macos/agy-acp-server-1.4.3-darwin-x86_64.zip',
    cmd: 'agy_acp_server.par',
    args: [],
    sha256: '9392dbbdad7f0663dbfb5a0bf641297b0cf80d2ee9cd2d49a616bbbc7378731d',
    companionFiles: []
  },
  'linux-x86_64': {
    archive: 'https://dl.google.com/agy-extensions/releases/linux/agy-acp-server-1.4.3-linux-x86_64.zip',
    cmd: 'agy_acp_server.par',
    args: ['--uid='],
    sha256: '0634ce5306ba92c932945455e7a83fda78e2d99c33fa8aa6ee0566206a382714',
    companionFiles: []
  },
  'linux-aarch64': {
    archive: 'https://dl.google.com/agy-extensions/releases/linux/agy-acp-server-1.4.3-linux-arm64.zip',
    cmd: 'agy_acp_server.par',
    args: ['--uid='],
    sha256: '05c153443b0b1175151c760eeddea538950bc9843e317d54786a1f03670182bc',
    companionFiles: []
  }
};

export interface ManagedRuntimePointer {
  version: string;
  previousVersion: string | null;
  installedAt: string;
  sha256: string;
  platformKey: string;
}

export interface ResolvedNativeRuntime {
  installed: boolean;
  executable: string;
  args: string[];
  version: string | null;
  previousVersion: string | null;
  source: 'custom' | 'managed' | 'uninstalled';
  companionFilesPresent: boolean;
  missingCompanionFiles: string[];
  platformKey: string | null;
}

export function resolvePlatformKey(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): string | null {
  const normalizedArch = arch === 'x64' ? 'x86_64' : arch === 'arm64' ? 'aarch64' : arch;
  if (platform === 'win32') return `windows-${normalizedArch}`;
  if (platform === 'darwin') return `darwin-${normalizedArch}`;
  if (platform === 'linux') return `linux-${normalizedArch}`;
  return null;
}

export function getZccDataDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.ZCC_DATA_DIR && env.ZCC_DATA_DIR.trim()) {
    return resolve(env.ZCC_DATA_DIR.trim());
  }
  const home = env.USERPROFILE || env.HOME || homedir();
  return resolve(home, '.zcc');
}

export function getManagedRuntimesRoot(baseDir?: string): string {
  return resolve(baseDir ?? getZccDataDir(), 'runtimes', 'antigravity-acp');
}

export function readManagedRuntimePointer(baseDir?: string): ManagedRuntimePointer | null {
  const pointerPath = join(getManagedRuntimesRoot(baseDir), 'current.json');
  if (!existsSync(pointerPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(pointerPath, 'utf8'));
    if (parsed && typeof parsed.version === 'string') {
      return {
        version: parsed.version,
        previousVersion: typeof parsed.previousVersion === 'string' ? parsed.previousVersion : null,
        installedAt: typeof parsed.installedAt === 'string' ? parsed.installedAt : '',
        sha256: typeof parsed.sha256 === 'string' ? parsed.sha256 : '',
        platformKey: typeof parsed.platformKey === 'string' ? parsed.platformKey : ''
      };
    }
  } catch {
    // Ignore corrupted pointer file
  }
  return null;
}

function writeManagedRuntimePointer(pointer: ManagedRuntimePointer, baseDir?: string): void {
  const root = getManagedRuntimesRoot(baseDir);
  mkdirSync(root, { recursive: true });
  const pointerPath = join(root, 'current.json');
  const tmpPath = `${pointerPath}.tmp-${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(pointer, null, 2) + '\n', 'utf8');
  writeFileSync(pointerPath, readFileSync(tmpPath));
  try {
    rmSync(tmpPath, { force: true });
  } catch {
    // Ignore temp cleanup failure
  }
}

export function checkCompanionFiles(
  executablePath: string,
  platformKey: string | null = resolvePlatformKey()
): { ok: boolean; missing: string[] } {
  const dist = platformKey ? NATIVE_ACP_DISTRIBUTIONS[platformKey] : undefined;
  if (!dist || dist.companionFiles.length === 0) {
    return { ok: true, missing: [] };
  }
  const dir = dirname(executablePath);
  const missing = dist.companionFiles.filter((file) => !existsSync(join(dir, file)));
  return { ok: missing.length === 0, missing };
}

function resolveCustomRuntime(
  custom: string,
  defaultArgs: string[],
  platformKey: string | null,
  dist?: NativeBinaryDistribution,
  pointer?: ManagedRuntimePointer | null
): ResolvedNativeRuntime {
  const resolvedCustom = resolve(custom);
  const exists = existsSync(resolvedCustom);
  const companions = exists
    ? checkCompanionFiles(resolvedCustom, platformKey)
    : { ok: false, missing: dist?.companionFiles ?? [] };
  return {
    installed: exists && companions.ok,
    executable: exists ? resolvedCustom : custom,
    args: defaultArgs,
    version: exists ? pointer?.version ?? PINNED_NATIVE_ACP_VERSION : null,
    previousVersion: pointer?.previousVersion ?? null,
    source: 'custom',
    companionFilesPresent: companions.ok,
    missingCompanionFiles: companions.missing,
    platformKey
  };
}

export function resolveNativeAcpRuntime(options?: {
  customExecutable?: string | undefined;
  baseDir?: string | undefined;
  platform?: NodeJS.Platform;
  arch?: string;
}): ResolvedNativeRuntime {
  const platformKey = resolvePlatformKey(options?.platform, options?.arch);
  const dist = platformKey ? NATIVE_ACP_DISTRIBUTIONS[platformKey] : undefined;
  const defaultArgs = dist ? [...dist.args] : [];
  const defaultCmd = dist?.cmd ?? (process.platform === 'win32' ? 'agy_acp_server.exe' : 'agy_acp_server.par');
  const pointer = readManagedRuntimePointer(options?.baseDir);

  const custom = options?.customExecutable?.trim();
  if (custom) {
    return resolveCustomRuntime(custom, defaultArgs, platformKey, dist, pointer);
  }

  const root = getManagedRuntimesRoot(options?.baseDir);
  const activeVersion = pointer?.version ?? PINNED_NATIVE_ACP_VERSION;
  const candidateExe = join(root, activeVersion, defaultCmd);
  if (existsSync(candidateExe)) {
    const companions = checkCompanionFiles(candidateExe, platformKey);
    return {
      installed: companions.ok,
      executable: candidateExe,
      args: defaultArgs,
      version: activeVersion,
      previousVersion: pointer?.previousVersion ?? null,
      source: 'managed',
      companionFilesPresent: companions.ok,
      missingCompanionFiles: companions.missing,
      platformKey
    };
  }

  return {
    installed: false,
    executable: candidateExe,
    args: defaultArgs,
    version: null,
    previousVersion: pointer?.previousVersion ?? null,
    source: 'uninstalled',
    companionFilesPresent: false,
    missingCompanionFiles: dist?.companionFiles ?? [],
    platformKey
  };
}

export function computeSha256Hex(buffer: Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex');
}

async function extractZipArchive(zipPath: string, destinationDir: string): Promise<void> {
  mkdirSync(destinationDir, { recursive: true });
  if (process.platform === 'win32') {
    try {
      await execFileAsync('tar.exe', ['-xf', zipPath, '-C', destinationDir], {
        timeout: 60_000,
        windowsHide: true
      });
      return;
    } catch {
      await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`
        ],
        { timeout: 120_000, windowsHide: true }
      );
      return;
    }
  }
  await execFileAsync('unzip', ['-o', '-q', zipPath, '-d', destinationDir], {
    timeout: 60_000
  });
}

export interface InstallNativeRuntimeOptions {
  baseDir?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  fetchImpl?: typeof fetch;
  extractImpl?: (zipPath: string, destinationDir: string) => Promise<void>;
}

async function downloadAndVerifyArchive(
  dist: NativeBinaryDistribution,
  stagingDir: string,
  fetchFn: typeof fetch
): Promise<{ archivePath: string; actualSha256: string }> {
  const archivePath = join(stagingDir, `agy-acp-server-${PINNED_NATIVE_ACP_VERSION}.zip`);
  const response = await fetchFn(dist.archive);
  if (!response.ok) {
    throw new Error(`Failed to download native ACP archive (${response.status} ${response.statusText})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actualSha256 = computeSha256Hex(bytes);
  if (actualSha256.toLowerCase() !== dist.sha256.toLowerCase()) {
    throw new Error(
      `SHA-256 checksum mismatch for native ACP archive: expected ${dist.sha256}, got ${actualSha256}`
    );
  }
  writeFileSync(archivePath, bytes);
  return { archivePath, actualSha256 };
}

function stageRuntimeFiles(
  extractDir: string,
  stagingVersionDir: string,
  dist: NativeBinaryDistribution,
  platformKey: string,
  isWin32: boolean
): void {
  mkdirSync(stagingVersionDir, { recursive: true });
  for (const file of [dist.cmd, ...dist.companionFiles]) {
    const srcFile = join(extractDir, file);
    const destFile = join(stagingVersionDir, file);
    writeFileSync(destFile, readFileSync(srcFile));
    if (!isWin32) {
      try {
        chmodSync(destFile, 0o755);
      } catch {
        // Ignore chmod error on non-POSIX filesystems
      }
    }
  }
}

function swapVersionDirectory(stagingVersionDir: string, versionDir: string, root: string): void {
  mkdirSync(dirname(versionDir), { recursive: true });
  const backupDir = join(root, `.backup-${PINNED_NATIVE_ACP_VERSION}-${Date.now()}`);
  const hasExisting = existsSync(versionDir);

  if (hasExisting) {
    renameSync(versionDir, backupDir);
  }

  try {
    renameSync(stagingVersionDir, versionDir);
    if (hasExisting) {
      rmSync(backupDir, { recursive: true, force: true });
    }
  } catch (swapErr) {
    if (hasExisting && existsSync(backupDir)) {
      try {
        renameSync(backupDir, versionDir);
      } catch {
        // Ignore fallback restore errors
      }
    }
    throw swapErr;
  }
}

function verifyExtractedArchive(
  extractDir: string,
  dist: NativeBinaryDistribution,
  platformKey: string
): void {
  const extractedExe = join(extractDir, dist.cmd);
  if (!existsSync(extractedExe)) {
    throw new Error(`Archive extraction did not produce expected executable "${dist.cmd}"`);
  }
  const companions = checkCompanionFiles(extractedExe, platformKey);
  if (!companions.ok) {
    throw new Error(
      `Archive extraction is missing required companion files: ${companions.missing.join(', ')}`
    );
  }
}

function updatePointerAfterInstall(
  baseDir: string | undefined,
  version: string,
  actualSha256: string,
  platformKey: string
): void {
  const existingPointer = readManagedRuntimePointer(baseDir);
  const previousVersion =
    existingPointer && existingPointer.version !== version
      ? existingPointer.version
      : existingPointer?.previousVersion ?? null;

  writeManagedRuntimePointer(
    {
      version,
      previousVersion,
      installedAt: new Date().toISOString(),
      sha256: actualSha256,
      platformKey
    },
    baseDir
  );
}

export async function installNativeAcpRuntime(
  options?: InstallNativeRuntimeOptions
): Promise<ResolvedNativeRuntime> {
  const platformKey = resolvePlatformKey(options?.platform, options?.arch);
  if (!platformKey || !NATIVE_ACP_DISTRIBUTIONS[platformKey]) {
    throw new Error(
      `Unsupported platform/architecture for Google Native ACP runtime: ${options?.platform ?? process.platform}/${options?.arch ?? process.arch}`
    );
  }

  const dist = NATIVE_ACP_DISTRIBUTIONS[platformKey]!;
  const version = PINNED_NATIVE_ACP_VERSION;
  const root = getManagedRuntimesRoot(options?.baseDir);
  const versionDir = join(root, version);
  const stagingDir = join(root, `.staging-${version}-${Date.now()}`);
  mkdirSync(stagingDir, { recursive: true });

  try {
    const fetchFn = options?.fetchImpl ?? globalThis.fetch;
    const { archivePath, actualSha256 } = await downloadAndVerifyArchive(dist, stagingDir, fetchFn);

    const extractDir = join(stagingDir, 'unpacked');
    const extractFn = options?.extractImpl ?? extractZipArchive;
    await extractFn(archivePath, extractDir);

    verifyExtractedArchive(extractDir, dist, platformKey);

    const stagingVersionDir = join(stagingDir, 'staged-version');
    const isWin32 = (options?.platform ?? process.platform) === 'win32';
    stageRuntimeFiles(extractDir, stagingVersionDir, dist, platformKey, isWin32);
    swapVersionDirectory(stagingVersionDir, versionDir, root);

    updatePointerAfterInstall(options?.baseDir, version, actualSha256, platformKey);

    return resolveNativeAcpRuntime({
      baseDir: options?.baseDir,
      platform: options?.platform,
      arch: options?.arch
    });
  } finally {
    try {
      rmSync(stagingDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

export function rollbackNativeAcpRuntime(options?: {
  baseDir?: string;
  platform?: NodeJS.Platform;
  arch?: string;
}): ResolvedNativeRuntime {
  const pointer = readManagedRuntimePointer(options?.baseDir);
  if (!pointer || !pointer.previousVersion) {
    throw new Error('No previous Native ACP runtime version is available for rollback.');
  }
  const platformKey = resolvePlatformKey(options?.platform, options?.arch);
  const dist = platformKey ? NATIVE_ACP_DISTRIBUTIONS[platformKey] : undefined;
  const cmd = dist?.cmd ?? (process.platform === 'win32' ? 'agy_acp_server.exe' : 'agy_acp_server.par');
  const root = getManagedRuntimesRoot(options?.baseDir);
  const prevExe = join(root, pointer.previousVersion, cmd);
  if (!existsSync(prevExe)) {
    throw new Error(`Previous version "${pointer.previousVersion}" is no longer present on disk.`);
  }

  writeManagedRuntimePointer(
    {
      version: pointer.previousVersion,
      previousVersion: pointer.version,
      installedAt: new Date().toISOString(),
      sha256: '',
      platformKey: pointer.platformKey
    },
    options?.baseDir
  );

  return resolveNativeAcpRuntime(options);
}

/**
 * Terminates a child process and its descendants.
 * On Windows, `agy_acp_server.exe` unpacks/spawns child processes (including `localharness_external.exe`)
 * that can retain inherited stdio handles unless terminated as a process tree.
 */
export function killProcessTree(child: ChildProcess | null | undefined): void {
  if (!child) return;
  try {
    child.stdin?.end();
  } catch {
    // Ignore closed stdin
  }
  const pid = child.pid;
  if (process.platform === 'win32' && typeof pid === 'number' && pid > 0) {
    try {
      execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      });
      return;
    } catch {
      // Best-effort process tree kill
    }
  }
  try {
    child.kill('SIGTERM');
  } catch {
    // Best effort
  }
}
