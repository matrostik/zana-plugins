import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import './test-environment.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkCompanionFiles,
  computeSha256Hex,
  defaultNativeCommand,
  getManagedRuntimesRoot,
  getZccDataDir,
  installNativeAcpRuntime,
  isWin32Platform,
  killProcessTree,
  NATIVE_ACP_DISTRIBUTIONS,
  PINNED_NATIVE_ACP_VERSION,
  readManagedRuntimePointer,
  resolveNativeAcpRuntime,
  resolvePlatformKey,
  rollbackNativeAcpRuntime
} from './native-runtime.js';

const tempDirs: string[] = [];
const posixPlatforms = [
  ['darwin', 'arm64', 'darwin-aarch64'],
  ['darwin', 'x64', 'darwin-x86_64'],
  ['linux', 'x64', 'linux-x86_64'],
  ['linux', 'arm64', 'linux-aarch64']
] as const;
function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
  vi.restoreAllMocks();
});

describe('native-runtime.ts unit tests', () => {
  it('defaultNativeCommand and isWin32Platform select platform-specific defaults', () => {
    expect(isWin32Platform('win32')).toBe(true);
    expect(isWin32Platform('linux')).toBe(false);
    expect(defaultNativeCommand('win32')).toBe('agy_acp_server.exe');
    expect(defaultNativeCommand('darwin')).toBe('agy_acp_server.par');
    expect(defaultNativeCommand('linux')).toBe('agy_acp_server.par');
  });

  it.each(posixPlatforms)('requires the harness for existing %s/%s installs', (platform, arch, key) => {
    const baseDir = makeTempDir('missing-harness-');
    const versionDir = join(getManagedRuntimesRoot(baseDir), PINNED_NATIVE_ACP_VERSION);
    mkdirSync(versionDir, { recursive: true });
    const executable = join(versionDir, 'agy_acp_server.par');
    writeFileSync(executable, 'server');
    expect(checkCompanionFiles(executable, key)).toEqual({ ok: false, missing: ['localharness_external'] });
    expect(resolveNativeAcpRuntime({ baseDir, platform, arch }).installed).toBe(false);
    expect(resolveNativeAcpRuntime({ baseDir, platform, arch, customExecutable: executable }).installed).toBe(false);
  });

  it.each(posixPlatforms)('retains the harness on install and reinstall for %s/%s', async (platform, arch, key) => {
    const baseDir = makeTempDir('install-harness-');
    const dist = NATIVE_ACP_DISTRIBUTIONS[key]!;
    const bytes = new Uint8Array([1, 2, 3]);
    vi.spyOn(dist, 'sha256', 'get').mockReturnValue(computeSha256Hex(bytes));
    const options = {
      baseDir, platform, arch,
      fetchImpl: (async () => new Response(bytes)) as typeof fetch,
      extractImpl: async (_zip: string, destination: string) => {
        mkdirSync(destination, { recursive: true });
        writeFileSync(join(destination, 'agy_acp_server.par'), 'server');
        writeFileSync(join(destination, 'localharness_external'), 'harness');
      }
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      const runtime = await installNativeAcpRuntime(options);
      expect(runtime.installed).toBe(true);
      const harness = join(getManagedRuntimesRoot(baseDir), PINNED_NATIVE_ACP_VERSION, 'localharness_external');
      expect(readFileSync(harness, 'utf8')).toBe('harness');
      if (process.platform !== 'win32') expect(statSync(harness).mode & 0o777).toBe(0o755);
    }
  });

  it.each(posixPlatforms)('preserves an existing install when %s/%s extraction lacks the harness', async (platform, arch, key) => {
    const baseDir = makeTempDir('reject-missing-harness-');
    const root = getManagedRuntimesRoot(baseDir);
    const versionDir = join(root, PINNED_NATIVE_ACP_VERSION);
    mkdirSync(versionDir, { recursive: true });
    writeFileSync(join(versionDir, 'agy_acp_server.par'), 'old-server');
    writeFileSync(join(versionDir, 'localharness_external'), 'old-harness');
    const pointer = JSON.stringify({ version: PINNED_NATIVE_ACP_VERSION, platformKey: key });
    writeFileSync(join(root, 'current.json'), pointer);
    const bytes = new Uint8Array([1, 2, 3]);
    vi.spyOn(NATIVE_ACP_DISTRIBUTIONS[key]!, 'sha256', 'get').mockReturnValue(computeSha256Hex(bytes));
    await expect(installNativeAcpRuntime({
      baseDir, platform, arch,
      fetchImpl: (async () => new Response(bytes)) as typeof fetch,
      extractImpl: async (_zip, destination) => {
        mkdirSync(destination, { recursive: true });
        writeFileSync(join(destination, 'agy_acp_server.par'), 'new-server');
      }
    })).rejects.toThrow(/missing required companion files: localharness_external/);
    expect(readFileSync(join(versionDir, 'agy_acp_server.par'), 'utf8')).toBe('old-server');
    expect(readFileSync(join(versionDir, 'localharness_external'), 'utf8')).toBe('old-harness');
    expect(readFileSync(join(root, 'current.json'), 'utf8')).toBe(pointer);
  });

  it('resolvePlatformKey handles all supported and unsupported architectures', () => {
    expect(resolvePlatformKey('win32', 'x64')).toBe('windows-x86_64');
    expect(resolvePlatformKey('win32', 'arm64')).toBe('windows-aarch64');
    expect(resolvePlatformKey('darwin', 'x64')).toBe('darwin-x86_64');
    expect(resolvePlatformKey('darwin', 'arm64')).toBe('darwin-aarch64');
    expect(resolvePlatformKey('linux', 'x64')).toBe('linux-x86_64');
    expect(resolvePlatformKey('linux', 'arm64')).toBe('linux-aarch64');
    expect(resolvePlatformKey('freebsd' as any, 'x64')).toBeNull();
    expect(resolvePlatformKey('win32', 'unknown')).toBe('windows-unknown');
  });

  it('getZccDataDir respects process.env.ZCC_DATA_DIR and falls back to home', () => {
    const prev = process.env.ZCC_DATA_DIR;
    try {
      process.env.ZCC_DATA_DIR = 'C:/custom-zcc-dir';
      expect(getZccDataDir()).toContain('custom-zcc-dir');

      delete process.env.ZCC_DATA_DIR;
      expect(getZccDataDir()).toContain('.zcc');
    } finally {
      if (prev === undefined) delete process.env.ZCC_DATA_DIR;
      else process.env.ZCC_DATA_DIR = prev;
    }
  });

  it('readManagedRuntimePointer handles missing and corrupted files', () => {
    const baseDir = makeTempDir('runtime-pointer-');
    expect(readManagedRuntimePointer(baseDir)).toBeNull();

    const root = getManagedRuntimesRoot(baseDir);
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'current.json'), 'INVALID_JSON_HERE');
    expect(readManagedRuntimePointer(baseDir)).toBeNull();
  });

  it('checkCompanionFiles returns ok for platforms without companion requirements', () => {
    expect(checkCompanionFiles('/dummy/path', null)).toEqual({ ok: true, missing: [] });
  });

  it('checkCompanionFiles verifies windows companion files correctly', () => {
    const dir = makeTempDir('companion-test-');
    const exe = join(dir, 'agy_acp_server.exe');
    writeFileSync(exe, 'exe');

    const missing = checkCompanionFiles(exe, 'windows-x86_64');
    expect(missing.ok).toBe(false);
    expect(missing.missing).toContain('localharness_external.exe');

    writeFileSync(join(dir, 'localharness_external.exe'), 'exe');
    const present = checkCompanionFiles(exe, 'windows-x86_64');
    expect(present.ok).toBe(true);
    expect(present.missing).toHaveLength(0);
  });

  it('resolveNativeAcpRuntime handles custom, managed, and uninstalled paths', () => {
    const baseDir = makeTempDir('resolve-runtime-');

    const missingCustom = resolveNativeAcpRuntime({
      baseDir,
      customExecutable: 'C:/fake/path/agy.exe',
      platform: 'linux',
      arch: 'x64'
    });
    expect(missingCustom.installed).toBe(false);
    expect(missingCustom.source).toBe('custom');

    const customDir = makeTempDir('custom-exe-dir-');
    const customExe = join(customDir, 'agy_acp_server.par');
    writeFileSync(customExe, 'dummy-binary');
    writeFileSync(join(customDir, 'localharness_external'), 'dummy-harness');
    const existentCustom = resolveNativeAcpRuntime({
      baseDir,
      customExecutable: customExe,
      platform: 'linux',
      arch: 'x64'
    });
    expect(existentCustom.installed).toBe(true);
    expect(existentCustom.source).toBe('custom');

    const root = getManagedRuntimesRoot(baseDir);
    const versionDir = join(root, PINNED_NATIVE_ACP_VERSION);
    mkdirSync(versionDir, { recursive: true });
    writeFileSync(join(versionDir, 'agy_acp_server.par'), 'dummy-managed');
    writeFileSync(join(versionDir, 'localharness_external'), 'dummy-harness');

    const existentManaged = resolveNativeAcpRuntime({ baseDir, platform: 'linux', arch: 'x64' });
    expect(existentManaged.installed).toBe(true);
    expect(existentManaged.source).toBe('managed');
  });

  it('installNativeAcpRuntime handles unsupported platform and download failure', async () => {
    const baseDir = makeTempDir('install-fail-');
    await expect(
      installNativeAcpRuntime({ baseDir, platform: 'freebsd' as any, arch: 'x64' })
    ).rejects.toThrow(/Unsupported platform\/architecture/i);

    await expect(
      installNativeAcpRuntime({
        baseDir,
        platform: 'linux',
        arch: 'x64',
        fetchImpl: (async () => ({ ok: false, status: 404, statusText: 'Not Found' })) as any
      })
    ).rejects.toThrow(/Failed to download native ACP archive/i);
  });

  it('installNativeAcpRuntime passes a timeout AbortSignal to fetchImpl and leaves no temp pointer files', async () => {
    const baseDir = makeTempDir('install-timeout-signal-');
    const dist = NATIVE_ACP_DISTRIBUTIONS['linux-x86_64']!;
    const fakeData = new Uint8Array([42, 43, 44]);
    vi.spyOn(dist, 'sha256', 'get').mockReturnValue(computeSha256Hex(fakeData));
    let receivedSignal: AbortSignal | undefined;

    const installed = await installNativeAcpRuntime({
      baseDir,
      platform: 'linux',
      arch: 'x64',
      downloadTimeoutMs: 5_000,
      fetchImpl: (async (_url, init) => {
        receivedSignal = init?.signal ?? undefined;
        return new Response(fakeData);
      }) as typeof fetch,
      extractImpl: async (_zip, destDir) => {
        mkdirSync(destDir, { recursive: true });
        writeFileSync(join(destDir, dist.cmd), 'binary');
        writeFileSync(join(destDir, 'localharness_external'), 'harness');
      }
    });

    expect(installed.installed).toBe(true);
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    const rootFiles = readdirSync(getManagedRuntimesRoot(baseDir));
    expect(rootFiles.some(f => f.endsWith('.tmp'))).toBe(false);
  });

  it('installNativeAcpRuntime resets idle timeout on each streamed chunk even if total download exceeds timeout', async () => {
    const baseDir = makeTempDir('install-stream-idle-');
    const dist = NATIVE_ACP_DISTRIBUTIONS['linux-x86_64']!;
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4]), new Uint8Array([5, 6])];
    const combined = new Uint8Array([1, 2, 3, 4, 5, 6]);
    vi.spyOn(dist, 'sha256', 'get').mockReturnValue(computeSha256Hex(combined));

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const chunk of chunks) {
          await new Promise((resolve) => setTimeout(resolve, 35));
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });

    const installed = await installNativeAcpRuntime({
      baseDir,
      platform: 'linux',
      arch: 'x64',
      downloadTimeoutMs: 80,
      fetchImpl: (async () => new Response(stream)) as typeof fetch,
      extractImpl: async (_zip, destDir) => {
        mkdirSync(destDir, { recursive: true });
        writeFileSync(join(destDir, dist.cmd), 'binary');
        writeFileSync(join(destDir, 'localharness_external'), 'harness');
      }
    });

    expect(installed.installed).toBe(true);
  });

  it('installNativeAcpRuntime aborts with a clear timeout error when headers or stream stalls', async () => {
    const baseDir = makeTempDir('install-stall-');
    let headerSignal: AbortSignal | undefined;

    await expect(
      installNativeAcpRuntime({
        baseDir,
        platform: 'linux',
        arch: 'x64',
        downloadTimeoutMs: 30,
        fetchImpl: (async (_url, init) => {
          headerSignal = init?.signal ?? undefined;
          return new Promise(() => {});
        }) as typeof fetch
      })
    ).rejects.toThrow(/Native ACP archive download timed out after 30ms without receiving data/i);
    expect(headerSignal?.aborted).toBe(true);

    let streamSignal: AbortSignal | undefined;
    const stalledStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
      }
    });

    await expect(
      installNativeAcpRuntime({
        baseDir,
        platform: 'linux',
        arch: 'x64',
        downloadTimeoutMs: 30,
        fetchImpl: (async (_url, init) => {
          streamSignal = init?.signal ?? undefined;
          return new Response(stalledStream);
        }) as typeof fetch
      })
    ).rejects.toThrow(/Native ACP archive download timed out after 30ms without receiving data/i);
    expect(streamSignal?.aborted).toBe(true);
  });

  it('installNativeAcpRuntime detects checksum mismatch on downloaded bytes', async () => {
    const baseDir = makeTempDir('install-bad-checksum-');
    const badBytes = new Uint8Array([11, 22, 33]);
    await expect(
      installNativeAcpRuntime({
        baseDir,
        platform: 'linux',
        arch: 'x64',
        fetchImpl: (async () => ({ ok: true, arrayBuffer: async () => badBytes.buffer })) as any
      })
    ).rejects.toThrow(/SHA-256 checksum mismatch/i);
  });

  it('installNativeAcpRuntime rejects when extraction lacks executable or companion file', async () => {
    const baseDir = makeTempDir('install-missing-exe-');
    const dist = NATIVE_ACP_DISTRIBUTIONS['windows-x86_64']!;
    const fakeData = new Uint8Array([1, 2, 3]);
    const origSha = dist.sha256;
    (dist as any).sha256 = computeSha256Hex(fakeData);

    try {
      const fetchImpl = (async () => ({ ok: true, arrayBuffer: async () => fakeData.buffer })) as any;
      await expect(
        installNativeAcpRuntime({
          baseDir,
          platform: 'win32',
          arch: 'x64',
          fetchImpl,
          extractImpl: async (_zip, destDir) => {
            mkdirSync(destDir, { recursive: true });
          }
        })
      ).rejects.toThrow(/did not produce expected executable/i);

      await expect(
        installNativeAcpRuntime({
          baseDir,
          platform: 'win32',
          arch: 'x64',
          fetchImpl,
          extractImpl: async (_zip, destDir) => {
            mkdirSync(destDir, { recursive: true });
            writeFileSync(join(destDir, dist.cmd), 'fake-exe');
          }
        })
      ).rejects.toThrow(/missing required companion files/i);
    } finally {
      (dist as any).sha256 = origSha;
    }
  });

  it('installNativeAcpRuntime successfully unpacks, writes files, sets pointer, and swaps over existing install', async () => {
    const baseDir = makeTempDir('install-success-');
    const dist = NATIVE_ACP_DISTRIBUTIONS['linux-x86_64']!;
    const fakeData = new Uint8Array([99, 88, 77]);
    const origSha = dist.sha256;
    (dist as any).sha256 = computeSha256Hex(fakeData);

    try {
      const runInstall = (content: string) =>
        installNativeAcpRuntime({
          baseDir,
          platform: 'linux',
          arch: 'x64',
          fetchImpl: (async () => ({ ok: true, arrayBuffer: async () => fakeData.buffer })) as any,
          extractImpl: async (_zip, destDir) => {
            mkdirSync(destDir, { recursive: true });
            writeFileSync(join(destDir, dist.cmd), content);
            writeFileSync(join(destDir, 'localharness_external'), 'harness');
          }
        });

      const installed1 = await runInstall('binary-content-1');
      expect(installed1.installed).toBe(true);
      expect(installed1.version).toBe(PINNED_NATIVE_ACP_VERSION);

      const installed2 = await runInstall('binary-content-2');
      expect(installed2.installed).toBe(true);
      expect(readManagedRuntimePointer(baseDir)?.version).toBe(PINNED_NATIVE_ACP_VERSION);
    } finally {
      (dist as any).sha256 = origSha;
    }
  });

  it('rollbackNativeAcpRuntime guards against missing previous versions and missing files', () => {
    const baseDir = makeTempDir('rollback-guard-');
    expect(() => rollbackNativeAcpRuntime({ baseDir })).toThrow(
      /No previous Native ACP runtime version is available/i
    );

    const root = getManagedRuntimesRoot(baseDir);
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'current.json'), JSON.stringify({ version: '1.4.3', previousVersion: null }));
    expect(() => rollbackNativeAcpRuntime({ baseDir })).toThrow(
      /No previous Native ACP runtime version is available/i
    );

    writeFileSync(
      join(root, 'current.json'),
      JSON.stringify({ version: '1.4.3', previousVersion: '1.4.0', platformKey: 'linux-x86_64' })
    );
    expect(() => rollbackNativeAcpRuntime({ baseDir, platform: 'linux', arch: 'x64' })).toThrow(
      /is no longer present on disk/i
    );
  });

  it('rolls back successfully to a valid previous version on disk', () => {
    const baseDir = makeTempDir('rollback-success-');
    const root = getManagedRuntimesRoot(baseDir);
    const prevDir = join(root, '1.4.0');
    mkdirSync(prevDir, { recursive: true });
    writeFileSync(join(prevDir, 'agy_acp_server.par'), 'prev-binary');
    writeFileSync(join(prevDir, 'localharness_external'), 'prev-harness');
    writeFileSync(
      join(root, 'current.json'),
      JSON.stringify({ version: '1.4.3', previousVersion: '1.4.0', platformKey: 'linux-x86_64' })
    );

    const rolledBack = rollbackNativeAcpRuntime({ baseDir, platform: 'linux', arch: 'x64' });
    expect(rolledBack.installed).toBe(true);
    expect(rolledBack.version).toBe('1.4.0');
    expect(readManagedRuntimePointer(baseDir)?.version).toBe('1.4.0');
  });

  it('killProcessTree handles null, closed stdin, and process killing', () => {
    expect(() => killProcessTree(null)).not.toThrow();
    expect(() => killProcessTree(undefined)).not.toThrow();

    const fakeChild: any = { pid: 99999999, stdin: { end: () => {} }, kill: vi.fn() };
    killProcessTree(fakeChild);
  });
});
