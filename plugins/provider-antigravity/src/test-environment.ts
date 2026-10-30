import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';

const keys = ['USERPROFILE', 'HOME', 'GEMINI_HOME', 'ZCC_DATA_DIR'] as const;
let directory: string;
let saved: Array<string | undefined>;

beforeEach(() => {
  saved = keys.map(key => process.env[key]);
  directory = mkdtempSync(join(tmpdir(), 'antigravity-test-'));
  process.env.USERPROFILE = directory;
  process.env.HOME = directory;
  process.env.GEMINI_HOME = join(directory, '.gemini');
  process.env.ZCC_DATA_DIR = join(directory, '.zcc');
  mkdirSync(process.env.GEMINI_HOME, { recursive: true });
});

afterEach(() => {
  for (const [index, key] of keys.entries()) {
    if (saved[index] === undefined) delete process.env[key];
    else process.env[key] = saved[index];
  }
  // This directory is created directly by mkdtemp inside the OS temp directory.
  rmSync(directory, { recursive: true, force: true });
});
