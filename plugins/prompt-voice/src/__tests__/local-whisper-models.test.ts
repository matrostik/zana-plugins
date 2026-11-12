import { mkdir, mkdtemp, readdir, rm, stat, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findModel, type ModelArtifact } from '../server/localWhisper/artifacts.ts';
import { cleanupInterruptedDownloads, listInstalledModels, modelPath, modelsDirectory, removeModel } from '../server/localWhisper/models.ts';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pv-models-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const base = findModel('base') as ModelArtifact;
const tiny = findModel('tiny') as ModelArtifact;

/** Creates a sparse file of the given size without writing its bytes. */
async function placeFile(path: string, size: number) {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, '');
  await truncate(path, size);
}

describe('listInstalledModels', () => {
  it('is empty before anything is installed', async () => {
    expect(await listInstalledModels(root)).toEqual([]);
  });

  it('lists catalog models with the pinned size and ignores truncated or unknown files', async () => {
    await placeFile(modelPath(root, base), base.size);
    await placeFile(modelPath(root, tiny), tiny.size - 1);
    await placeFile(join(modelsDirectory(root), 'ggml-custom.bin'), 10);
    expect(await listInstalledModels(root)).toEqual(['base']);
  });
});

describe('removeModel', () => {
  it('deletes an inactive model and tolerates one that is already gone', async () => {
    await placeFile(modelPath(root, tiny), 1);
    await removeModel(root, tiny, 'base');
    await expect(stat(modelPath(root, tiny))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(removeModel(root, tiny, 'base')).resolves.toBeUndefined();
  });

  it('refuses to delete the active model', async () => {
    await placeFile(modelPath(root, base), 1);
    await expect(removeModel(root, base, 'base')).rejects.toMatchObject({ code: 'LOCAL_RUNTIME_FAILED' });
    expect((await stat(modelPath(root, base))).isFile()).toBe(true);
  });
});

describe('cleanupInterruptedDownloads', () => {
  it('removes partial files in the models and downloads folders only', async () => {
    await placeFile(join(modelsDirectory(root), '.ggml-small.bin.abc.partial'), 1);
    await placeFile(join(root, 'downloads', '.whisper-bin-x64.zip.def.partial'), 1);
    await placeFile(modelPath(root, base), 1);
    expect(await cleanupInterruptedDownloads(root)).toBe(2);
    expect(await readdir(modelsDirectory(root))).toEqual([base.fileName]);
    expect(await readdir(join(root, 'downloads'))).toEqual([]);
  });

  it('handles a fresh install root', async () => {
    expect(await cleanupInterruptedDownloads(root)).toBe(0);
  });
});
