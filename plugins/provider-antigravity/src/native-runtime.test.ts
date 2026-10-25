import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkCompanionFiles,
  computeSha256Hex,
  getManagedRuntimesRoot,
  getZccDataDir,
  installNativeAcpRuntime,
  killProcessTree,
  NATIVE_ACP_DISTRIBUTIONS,
  PINNED_NATIVE_ACP_VERSION,
  readManagedRuntimePointer,
  resolveNativeAcpRuntime,
  resolvePlatformKey,
  rollbackNativeAcpRuntime
} from './native-runtime.js';

const tempDirs: string[] = [];
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
      if (prev === undefined) {
        delete process.env.ZCC_DATA_DIR;
      } else {
        process.env.ZCC_DATA_DIR = prev;
      }
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
    expect(checkCompanionFiles('/dummy/path', 'darwin-aarch64')).toEqual({
      ok: true,
      missing: []
    });
    expect(checkCompanionFiles('/dummy/path', null)).toEqual({
      ok: true,
      missing: []
    });
  });

  it('resolveNativeAcpRuntime handles custom, managed, and uninstalled paths', () => {
    const baseDir = makeTempDir('resolve-runtime-');

    // Custom non-existent
    const missingCustom = resolveNativeAcpRuntime({
      baseDir,
      customExecutable: 'C:/fake/path/agy.exe',
      platform: 'linux',
      arch: 'x64'
    });
    expect(missingCustom.installed).toBe(false);
    expect(missingCustom.source).toBe('custom');

    // Custom existent
    const customDir = makeTempDir('custom-exe-');
    const customExe = join(customDir, 'agy_acp_server.par');
    writeFileSync(customExe, 'code');
    const foundCustom = resolveNativeAcpRuntime({
      baseDir,
      customExecutable: customExe,
      platform: 'linux',
      arch: 'x64'
    });
    expect(foundCustom.installed).toBe(true);
    expect(foundCustom.source).toBe('custom');
    expect(foundCustom.version).toBe(PINNED_NATIVE_ACP_VERSION);

    // Managed existent
    const root = getManagedRuntimesRoot(baseDir);
    const managedDir = join(root, PINNED_NATIVE_ACP_VERSION);
    mkdirSync(managedDir, { recursive: true });
    writeFileSync(join(managedDir, 'agy_acp_server.par'), 'managed-code');
    const managed = resolveNativeAcpRuntime({
      baseDir,
      platform: 'linux',
      arch: 'x64'
    });
    expect(managed.installed).toBe(true);
    expect(managed.source).toBe('managed');

    // Managed uninstalled fallback (line 227)
    const uninstalledBase = makeTempDir('uninstalled-base-');
    const uninstalled = resolveNativeAcpRuntime({
      baseDir: uninstalledBase,
      platform: 'linux',
      arch: 'x64'
    });
    expect(uninstalled.installed).toBe(false);
    expect(uninstalled.source).toBe('uninstalled');
  });

  it('installNativeAcpRuntime rejects unsupported platform/arch', async () => {
    await expect(
      installNativeAcpRuntime({ platform: 'freebsd' as any, arch: 'x64' })
    ).rejects.toThrow(/Unsupported platform\/architecture/i);
  });

  it('installNativeAcpRuntime rejects on HTTP error', async () => {
    const baseDir = makeTempDir('install-fail-');
    await expect(
      installNativeAcpRuntime({
        baseDir,
        platform: 'linux',
        arch: 'x64',
        fetchImpl: (async () => ({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })) as any
      })
    ).rejects.toThrow(/Failed to download native ACP archive/i);
  });

  it('installNativeAcpRuntime rejects when extraction lacks executable or companion file', async () => {
    const baseDir = makeTempDir('install-missing-exe-');
    const dist = NATIVE_ACP_DISTRIBUTIONS['windows-x86_64']!;
    const fakeData = new Uint8Array([5, 6, 7]);
    const computedSha = computeSha256Hex(fakeData);
    const origSha = dist.sha256;
    (dist as any).sha256 = computedSha;

    try {
      // 1. Missing executable
      await expect(
        installNativeAcpRuntime({
          baseDir,
          platform: 'win32',
          arch: 'x64',
          fetchImpl: (async () => ({
            ok: true,
            arrayBuffer: async () => fakeData.buffer
          })) as any,
          extractImpl: async (_zip, destDir) => {
            mkdirSync(destDir, { recursive: true });
          }
        })
      ).rejects.toThrow(/did not produce expected executable/i);

      // 2. Missing companion files (exe present, but localharness_external missing)
      await expect(
        installNativeAcpRuntime({
          baseDir,
          platform: 'win32',
          arch: 'x64',
          fetchImpl: (async () => ({
            ok: true,
            arrayBuffer: async () => fakeData.buffer
          })) as any,
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

  it('installNativeAcpRuntime successfully unpacks, writes files, sets pointer, and handles non-win32 permissions', async () => {
    const baseDir = makeTempDir('install-success-');
    const dist = NATIVE_ACP_DISTRIBUTIONS['linux-x86_64']!;
    const fakeData = new Uint8Array([99, 88, 77]);
    const computedSha = computeSha256Hex(fakeData);

    // Mock dist sha to match fakeData
    const origSha = dist.sha256;
    (dist as any).sha256 = computedSha;

    try {
      const installed = await installNativeAcpRuntime({
        baseDir,
        platform: 'linux',
        arch: 'x64',
        fetchImpl: (async () => ({
          ok: true,
          arrayBuffer: async () => fakeData.buffer
        })) as any,
        extractImpl: async (_zip, destDir) => {
          mkdirSync(destDir, { recursive: true });
          writeFileSync(join(destDir, dist.cmd), 'binary-content');
        }
      });

      expect(installed.installed).toBe(true);
      expect(installed.version).toBe(PINNED_NATIVE_ACP_VERSION);
      const pointer = readManagedRuntimePointer(baseDir);
      expect(pointer?.version).toBe(PINNED_NATIVE_ACP_VERSION);
    } finally {
      (dist as any).sha256 = origSha;
    }
  });

  it('rollbackNativeAcpRuntime guards against missing previous versions and missing files', () => {
    const baseDir = makeTempDir('rollback-guard-');
    // No pointer
    expect(() => rollbackNativeAcpRuntime({ baseDir })).toThrow(
      /No previous Native ACP runtime version is available/i
    );

    // Pointer without previousVersion
    const root = getManagedRuntimesRoot(baseDir);
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, 'current.json'),
      JSON.stringify({ version: '1.4.3', previousVersion: null })
    );
    expect(() => rollbackNativeAcpRuntime({ baseDir })).toThrow(
      /No previous Native ACP runtime version is available/i
    );

    // Pointer with previousVersion but file not on disk
    writeFileSync(
      join(root, 'current.json'),
      JSON.stringify({
        version: '1.4.3',
        previousVersion: '1.4.0',
        platformKey: 'linux-x86_64'
      })
    );
    expect(() =>
      rollbackNativeAcpRuntime({ baseDir, platform: 'linux', arch: 'x64' })
    ).toThrow(/is no longer present on disk/i);
  });

  it('killProcessTree handles null, closed stdin, and process killing', () => {
    expect(() => killProcessTree(null)).not.toThrow();
    expect(() => killProcessTree(undefined)).not.toThrow();

    const fakeChild: any = {
      pid: 99999999,
      stdin: {
        end: () => {}
      },
      kill: vi.fn()
    };
    killProcessTree(fakeChild);
  });
});
