import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const runner = new URL('./ci-plugin-tests.mjs', import.meta.url);

test('the repository lockfile contains no extraneous platform binaries', () => {
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  for (const [name, pkg] of Object.entries(lock.packages)) {
    assert.ok(!pkg.extraneous, `${name} is extraneous; regenerate the lockfile with CI's npm version`);
  }
});

test('the committed host source map normalizes checkout line endings', () => {
  const map = JSON.parse(readFileSync(new URL('../plugins/provider-antigravity/dist/host.js.map', import.meta.url), 'utf8'));
  for (const [index, source] of map.sourcesContent.entries()) {
    if (typeof source === 'string') assert.ok(!source.includes('\r\n'), `${map.sources[index]} contains checkout-specific CRLF`);
  }
});

for (const localVitest of [false, true]) test(`a plugin without a lockfile uses ${localVitest ? 'plugin' : 'repository'} tools`, () => {
  const root = mkdtempSync(join(tmpdir(), 'plugin-ci-tools-'));
  try {
    const plugin = join(root, 'plugins', 'fixture');
    mkdirSync(plugin, { recursive: true });
    writeFileSync(join(plugin, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
    writeFileSync(join(plugin, 'vitest.config.ts'), 'export default {};');
    writeFileSync(join(plugin, 'tsconfig.json'), '{}');
    spawnSync('git', ['init', '--quiet', root]);
    const typescript = join(root, 'node_modules', 'typescript', 'bin');
    mkdirSync(typescript, { recursive: true });
    writeFileSync(join(typescript, 'tsc'), `
      const assert = require('node:assert/strict');
      assert.deepEqual(process.argv.slice(2), ['--noEmit']);
      console.log('repository TypeScript ran');
    `);
    const vitest = join(root, 'node_modules', 'vitest');
    mkdirSync(vitest, { recursive: true });
    writeFileSync(join(vitest, 'vitest.mjs'), `
      import assert from 'node:assert/strict';
      assert.deepEqual(process.argv.slice(2), ['run', '--coverage']);
      assert.equal(process.env.CI, 'true');
      console.log('repository Vitest ran');
    `);
    if (localVitest) {
      const local = join(plugin, 'node_modules', 'vitest');
      mkdirSync(local, { recursive: true });
      writeFileSync(join(local, 'vitest.mjs'), "console.log('plugin Vitest ran');");
    }
    const result = spawnSync(process.execPath, [fileURLToPath(runner)], {
      cwd: root, encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /repository TypeScript ran/);
    assert.match(result.stdout, localVitest ? /plugin Vitest ran/ : /repository Vitest ran/);
    if (localVitest) assert.doesNotMatch(result.stdout, /repository Vitest ran/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
