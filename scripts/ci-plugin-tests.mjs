#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve('.');
const pluginsDir = join(root, 'plugins');
const zanaSdkDir = join(root, '.zana-sdk', 'packages', 'plugin-sdk');

function getChangedFiles() {
  const base = process.env.CI_BASE_REF ? `origin/${process.env.CI_BASE_REF}` : 'origin/master';
  const head = process.env.CI_HEAD_SHA || 'HEAD';

  try {
    const diff = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
      encoding: 'utf8'
    });
    return diff.split('\n').map(s => s.trim()).filter(Boolean);
  } catch (err) {
    console.warn(`[WARN] Could not determine git diff against ${base}; will verify all plugins.`);
    return null;
  }
}

const changedFiles = getChangedFiles();
const allPlugins = readdirSync(pluginsDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(pluginsDir, d.name, 'package.json')))
  .map(d => d.name);

const targetPlugins = changedFiles
  ? allPlugins.filter(id => changedFiles.some(f => f.startsWith(`plugins/${id}/`)))
  : allPlugins;

console.log(`\n======================================================`);
console.log(`       Zana Plugins Test & Coverage Pipeline`);
console.log(`======================================================`);
if (changedFiles) {
  console.log(`Changed files in PR: ${changedFiles.length}`);
  console.log(`Affected plugins: ${targetPlugins.length ? targetPlugins.join(', ') : 'None'}`);
}

if (targetPlugins.length === 0) {
  console.log('No plugin files were touched in this PR. Skipping plugin tests.');
  process.exit(0);
}

let hasFailures = false;

for (const id of targetPlugins) {
  const pDir = join(pluginsDir, id);
  const pkgPath = join(pDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  console.log(`\n------------------------------------------------------`);
  console.log(`  Verifying Plugin: ${id}`);
  console.log(`------------------------------------------------------`);

  // 1. Link Zana SDK if available
  if (existsSync(zanaSdkDir)) {
    const atZana = join(pDir, 'node_modules', '@zana-ai');
    mkdirSync(atZana, { recursive: true });
    const sdkTarget = join(atZana, 'zcc-plugin-sdk');
    if (!existsSync(sdkTarget)) {
      try {
        symlinkSync(zanaSdkDir, sdkTarget, 'junction');
        console.log(`[SDK] Linked @zana-ai/zcc-plugin-sdk to ${id}`);
      } catch (e) {
        console.warn(`[SDK] Could not link SDK: ${e.message}`);
      }
    }
  }

  // 2. Install dependencies if package-lock.json exists and node_modules is empty
  if (existsSync(join(pDir, 'package-lock.json')) && !existsSync(join(pDir, 'node_modules', 'vitest'))) {
    console.log(`[DEPS] Installing dependencies for ${id}...`);
    try {
      execFileSync('npm', ['ci', '--ignore-scripts'], { cwd: pDir, stdio: 'inherit', shell: true });
    } catch (e) {
      console.warn(`[DEPS] npm ci failed; continuing with global test tools.`);
    }
  }

  // 3. Typecheck (if tsconfig.json exists)
  if (existsSync(join(pDir, 'tsconfig.json'))) {
    console.log(`[TYPECHECK] Running TypeScript compiler in ${id}...`);
    try {
      execFileSync('npx', ['tsc', '--noEmit'], { cwd: pDir, stdio: 'inherit', shell: true });
      console.log(`[TYPECHECK:PASS] ${id} passed typecheck.`);
    } catch (err) {
      console.error(`[TYPECHECK:FAIL] ${id} failed typecheck!`);
      hasFailures = true;
    }
  }

  // 4. Run Tests & Enforce Coverage Floor (if vitest.config.ts exists)
  const vitestConfig = join(pDir, 'vitest.config.ts');
  if (existsSync(vitestConfig)) {
    console.log(`[TEST] Running Vitest with Coverage for ${id}...`);
    try {
      execFileSync('vitest', ['run', '--coverage'], {
        cwd: pDir,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, CI: 'true' }
      });
      console.log(`[TEST:PASS] ${id} tests and coverage thresholds passed!`);
    } catch (err) {
      console.error(`[TEST:FAIL] ${id} tests failed or coverage floor not met!`);
      hasFailures = true;
    }
  } else {
    console.log(`[TEST:SKIP] No vitest.config.ts configured in ${id}.`);
  }

  // 5. Check Bundle Drift (Source vs Committed Bundles)
  if (pkg.scripts?.build && !pkg.scripts.build.includes('zcc plugin build')) {
    console.log(`[BUILD] Checking bundle drift for ${id}...`);
    try {
      execFileSync('npm', ['run', 'build'], { cwd: pDir, stdio: 'inherit', shell: true });
      const diff = execFileSync('git', ['diff', '--ignore-space-at-eol', '--stat', pDir], {
        encoding: 'utf8'
      }).trim();

      if (diff) {
        console.error(`[DRIFT:FAIL] Bundle drift detected in ${id}!`);
        console.error(`Committed bundles do not match source code:`);
        console.error(diff);
        console.error(`Fix: Run 'npm run build' inside plugins/${id} and commit the built files.`);
        hasFailures = true;
      } else {
        console.log(`[DRIFT:PASS] ${id} committed bundles match source code.`);
      }
    } catch (err) {
      console.error(`[BUILD:FAIL] Build command failed in ${id}`);
      hasFailures = true;
    }
  }
}

if (hasFailures) {
  console.error(`\n[FAILED] One or more plugin verification checks failed.`);
  process.exit(1);
}

console.log(`\n[SUCCESS] All plugin checks passed successfully.`);
