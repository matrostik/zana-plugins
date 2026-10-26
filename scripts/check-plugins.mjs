#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginsDir = join(root, 'plugins');

if (!existsSync(pluginsDir)) {
  console.error(`[ERROR] Plugins directory not found at: ${pluginsDir}`);
  process.exit(1);
}

const pluginDirs = readdirSync(pluginsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(pluginsDir, d.name, 'package.json')))
  .map((d) => d.name);

const errors = [];

for (const id of pluginDirs) {
  const pDir = join(pluginsDir, id);
  const pkgPath = join(pDir, 'package.json');

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    errors.push(`${id}: malformed package.json (${err.message})`);
    continue;
  }

  // Basic package.json metadata
  if (!pkg.name) errors.push(`${id}: package.json missing "name"`);
  if (!pkg.version) errors.push(`${id}: package.json missing "version"`);
  if (!pkg.description) errors.push(`${id}: package.json missing "description"`);

  // Zana manifest verification
  const zcc = pkg.zcc;
  if (!zcc || typeof zcc !== 'object') {
    errors.push(`${id}: package.json missing "zcc" manifest object`);
    continue;
  }

  if (!zcc.name) errors.push(`${id}: zcc section missing "name"`);
  if (!zcc.description) errors.push(`${id}: zcc section missing "description"`);

  // Verify entry point bundles exist on disk (required for direct distribution)
  const entries = ['server', 'app', 'host'];
  for (const entry of entries) {
    if (zcc[entry]) {
      const targetPath = join(pDir, zcc[entry]);
      if (!existsSync(targetPath)) {
        errors.push(`${id}: declared zcc.${entry} bundle "${zcc[entry]}" does not exist`);
      }
    }
  }

  // Verify icon if declared as a relative file path
  const icon = zcc.branding?.icon;
  if (typeof icon === 'string' && (icon.startsWith('./') || icon.startsWith('../'))) {
    const iconPath = join(pDir, icon);
    if (!existsSync(iconPath)) {
      errors.push(`${id}: declared icon file "${icon}" does not exist`);
    }
  }

  // Verify skills directories if declared
  if (Array.isArray(zcc.skills)) {
    for (const skillRel of zcc.skills) {
      const skillPath = join(pDir, skillRel);
      if (!existsSync(skillPath)) {
        errors.push(`${id}: declared skills directory "${skillRel}" does not exist`);
      }
    }
  }

  // Verify *.meta.json files if present
  for (const metaFile of ['server.meta.json', 'app.meta.json']) {
    const metaPath = join(pDir, metaFile);
    if (existsSync(metaPath)) {
      try {
        JSON.parse(readFileSync(metaPath, 'utf8'));
      } catch (err) {
        errors.push(`${id}: malformed ${metaFile} (${err.message})`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('[ERROR] Plugin manifest verification failed:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`Plugin manifest check OK: ${pluginDirs.length} plugins verified`);
