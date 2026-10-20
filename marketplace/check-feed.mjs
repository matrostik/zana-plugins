#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const feed = JSON.parse(readFileSync(join(root, 'marketplace', 'marketplace.json'), 'utf8'));
const pluginsDir = join(root, 'plugins');
const pluginIds = readdirSync(pluginsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(pluginsDir, d.name, 'package.json')))
  .map((d) => d.name);

const errors = [];
const seen = new Set();
for (const entry of feed) {
  if (seen.has(entry.id)) errors.push(`duplicate id: ${entry.id}`);
  seen.add(entry.id);
  if (!/^[a-z0-9-]+$/.test(entry.id)) errors.push(`invalid id: ${entry.id}`);
  if (!entry.description) errors.push(`missing description: ${entry.id}`);
  if (entry.source?.git?.subdir !== `plugins/${entry.id}`) {
    errors.push(`subdir must be plugins/${entry.id}: ${entry.id}`);
  }
}
for (const id of pluginIds) {
  if (!seen.has(id)) errors.push(`plugin missing from marketplace feed: ${id}`);
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log(`marketplace feed OK: ${feed.length} entries, ${pluginIds.length} plugins`);
