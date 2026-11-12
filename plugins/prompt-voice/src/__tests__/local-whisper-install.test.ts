import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeArtifact } from '../server/localWhisper/artifacts.ts';
import { assertSafeEntries, extractArchive, runCommand, systemTar } from '../server/localWhisper/extract.ts';
import { installedRuntime, installRuntime, runtimeDirectory } from '../server/localWhisper/install.ts';

const IS_WINDOWS = process.platform === 'win32';
const HOST_PLATFORM: RuntimeArtifact['platform'] = IS_WINDOWS ? 'win32' : 'linux';
const TAR = systemTar(process.platform, process.env);
const SERVER_NAME = IS_WINDOWS ? 'whisper-server.exe' : 'whisper-server';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pv-install-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** Builds a real .tar.gz from `files` (relative path to content) with the system tar. */
async function makeArchive(files: Record<string, string>, name = 'fixture.tar.gz'): Promise<string> {
  const source = join(dir, `src-${name}`);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(source, path, '..'), { recursive: true });
    await writeFile(join(source, path), content);
  }
  const archive = join(dir, name);
  await runCommand(TAR, ['-czf', archive, '-C', source, ...Object.keys(files).map((path) => path.split('/')[0]).filter((v, i, a) => a.indexOf(v) === i)]);
  return archive;
}

describe('assertSafeEntries', () => {
  it('accepts ordinary relative entries', () => {
    expect(() => assertSafeEntries(['Release/', 'Release/whisper-server.exe', './bin/lib.so'])).not.toThrow();
  });

  it.each(['/etc/passwd', '../evil', 'bin/../../evil', 'bin\\..\\evil', 'C:/Windows/x.dll', 'c:evil'])('rejects %s', (entry) => {
    expect(() => assertSafeEntries(['ok/file', entry])).toThrow(expect.objectContaining({ code: 'DOWNLOAD_INTEGRITY' }));
  });

  it('rejects an empty archive', () => {
    expect(() => assertSafeEntries([])).toThrow(expect.objectContaining({ code: 'DOWNLOAD_INTEGRITY' }));
  });
});

describe('extractArchive', () => {
  it('unpacks a real archive and leaves no staging folder', async () => {
    const archive = await makeArchive({ 'pkg/bin/tool': 'binary', 'pkg/LICENSE': 'MIT' });
    const destination = join(dir, 'out', 'runtime');
    await extractArchive({ archivePath: archive, destination, tar: TAR });
    expect(await readFile(join(destination, 'pkg', 'bin', 'tool'), 'utf8')).toBe('binary');
    expect(await readdir(join(dir, 'out'))).toEqual(['runtime']);
  });

  it('replaces a previous install completely', async () => {
    const destination = join(dir, 'runtime');
    await mkdir(destination, { recursive: true });
    await writeFile(join(destination, 'stale.dll'), 'old');
    await extractArchive({ archivePath: await makeArchive({ 'pkg/new': 'new' }), destination, tar: TAR });
    expect(await readdir(destination)).toEqual(['pkg']);
  });

  it('refuses unsafe entries before extracting anything', async () => {
    const run = vi.fn(async (_file: string, args: string[]) => (args[0] === '-tf' ? 'pkg/ok\n../escape\n' : ''));
    const destination = join(dir, 'runtime');
    await expect(extractArchive({ archivePath: 'unused', destination, tar: 'tar', run })).rejects.toMatchObject({ code: 'DOWNLOAD_INTEGRITY' });
    expect(run).toHaveBeenCalledTimes(1);
    await expect(stat(destination)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps the existing install and removes staging when tar fails', async () => {
    const destination = join(dir, 'runtime');
    await mkdir(destination, { recursive: true });
    await writeFile(join(destination, 'keep'), 'old');
    const run = vi.fn(async (_file: string, args: string[]) => {
      if (args[0] === '-tf') return 'pkg/file\n';
      throw Object.assign(new Error('tar: /secret/path corrupt'), { code: 2 });
    });
    const error = await extractArchive({ archivePath: 'x', destination, tar: 'tar', run }).catch((e) => e);
    expect(error).toMatchObject({ code: 'DOWNLOAD_FAILED', detail: expect.stringContaining('code=2') });
    expect(error.detail).not.toContain('/secret/path');
    expect(await readdir(dir)).toEqual(['runtime']);
    expect(await readFile(join(destination, 'keep'), 'utf8')).toBe('old');
  });

  it.skipIf(IS_WINDOWS)('rejects symlinks that point outside the install folder', async () => {
    const source = join(dir, 'src-link');
    await mkdir(join(source, 'pkg'), { recursive: true });
    await symlink('../../../outside', join(source, 'pkg', 'escape'));
    const archive = join(dir, 'link.tar.gz');
    await runCommand(TAR, ['-czf', archive, '-C', source, 'pkg']);
    const destination = join(dir, 'runtime');
    await expect(extractArchive({ archivePath: archive, destination, tar: TAR })).rejects.toMatchObject({ code: 'DOWNLOAD_INTEGRITY' });
    await expect(stat(destination)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.skipIf(IS_WINDOWS)('accepts relative symlinks that stay inside, like the Linux runtime libraries', async () => {
    const source = join(dir, 'src-lib');
    await mkdir(join(source, 'pkg'), { recursive: true });
    await writeFile(join(source, 'pkg', 'libwhisper.so.1.9.5'), 'lib');
    await symlink('libwhisper.so.1.9.5', join(source, 'pkg', 'libwhisper.so.1'));
    const archive = join(dir, 'lib.tar.gz');
    await runCommand(TAR, ['-czf', archive, '-C', source, 'pkg']);
    const destination = join(dir, 'runtime');
    await extractArchive({ archivePath: archive, destination, tar: TAR });
    expect(await readFile(join(destination, 'pkg', 'libwhisper.so.1'), 'utf8')).toBe('lib');
  });
});

describe('installRuntime', () => {
  async function fixtureArtifact(files: Record<string, string>) {
    const archive = await makeArchive(files, 'runtime.tar.gz');
    const bytes = await readFile(archive);
    const artifact: RuntimeArtifact = {
      platform: HOST_PLATFORM,
      arch: 'x64',
      url: 'https://example.test/releases/whisper-bin.tar.gz',
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      archive: 'tar.gz',
      serverEntry: `pkg/${SERVER_NAME}`,
      requirements: [],
      verified: true
    };
    const fetchSpy = vi.fn(async () => new Response(bytes));
    return { artifact, fetchSpy };
  }

  const root = () => join(dir, 'root');
  const freeSpace = { freeBytes: async () => Number.MAX_SAFE_INTEGER };

  it('installs once, writes a marker, deletes the archive, and reuses the install', async () => {
    const { artifact, fetchSpy } = await fixtureArtifact({ [`pkg/${SERVER_NAME}`]: 'server' });
    const executable = await installRuntime({ artifact, root: root(), fetch: fetchSpy, ...freeSpace });
    expect(await readFile(executable, 'utf8')).toBe('server');
    if (!IS_WINDOWS) expect((await stat(executable)).mode & 0o111).not.toBe(0);
    expect(await readdir(join(root(), 'downloads'))).toEqual([]);
    expect(JSON.parse(await readFile(join(runtimeDirectory(root(), artifact), 'installed.json'), 'utf8'))).toMatchObject({ sha256: artifact.sha256 });

    expect(await installRuntime({ artifact, root: root(), fetch: fetchSpy })).toBe(executable);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('reinstalls when the pinned hash changes', async () => {
    const { artifact, fetchSpy } = await fixtureArtifact({ [`pkg/${SERVER_NAME}`]: 'server' });
    await installRuntime({ artifact, root: root(), fetch: fetchSpy, ...freeSpace });
    expect(await installedRuntime(root(), { ...artifact, sha256: 'f'.repeat(64) })).toBeNull();
  });

  it('rejects a package without the server program and removes it', async () => {
    const { artifact, fetchSpy } = await fixtureArtifact({ 'pkg/README': 'no server here' });
    await expect(installRuntime({ artifact, root: root(), fetch: fetchSpy, ...freeSpace })).rejects.toMatchObject({ code: 'DOWNLOAD_INTEGRITY' });
    await expect(stat(runtimeDirectory(root(), artifact))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await installedRuntime(root(), artifact)).toBeNull();
  });

  it('removes the downloaded archive when verification fails', async () => {
    const { artifact } = await fixtureArtifact({ [`pkg/${SERVER_NAME}`]: 'server' });
    const wrong = vi.fn(async () => new Response(Buffer.alloc(artifact.size, 1)));
    await expect(installRuntime({ artifact, root: root(), fetch: wrong, ...freeSpace })).rejects.toMatchObject({ code: 'DOWNLOAD_INTEGRITY' });
    expect(await readdir(join(root(), 'downloads'))).toEqual([]);
  });
});
