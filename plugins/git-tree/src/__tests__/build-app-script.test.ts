import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildPlugin = vi.fn(async () => undefined);
const readFileSync = vi.fn();
vi.mock('../../../../packages/plugin-build/src/build-plugin.ts', () => ({ buildPlugin }));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, readFileSync: (...args: unknown[]) => readFileSync(...args) };
});

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(here, '..', '..');

describe('git-tree build entry point', () => {
  beforeEach(() => {
    buildPlugin.mockClear();
    readFileSync.mockReset();
  });

  it('builds the plugin root with the repository version', async () => {
    readFileSync.mockReturnValue(JSON.stringify({ version: '2.3.6' }));
    vi.resetModules();
    await import('../../scripts/build-app.mjs');
    expect(buildPlugin).toHaveBeenCalledWith(pluginRoot, '2.3.6');
  });

  it('falls back to 0.0.0 when the repository has no version', async () => {
    readFileSync.mockReturnValue(JSON.stringify({}));
    vi.resetModules();
    await import('../../scripts/build-app.mjs');
    expect(buildPlugin).toHaveBeenCalledWith(pluginRoot, '0.0.0');
  });
});
