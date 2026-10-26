import type { ChangedFile } from '../types.ts';

const SKIP_EXTENSIONS = new Set([
  'lock', 'sum', 'map', 'snap', 'min.js', 'min.css',
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'pdf', 'zip', 'tar', 'gz', 'jar', 'exe', 'dll', 'so', 'dylib',
  'pyc', 'class', 'o', 'obj'
]);

const SKIP_PATH_PATTERNS = [/node_modules\//, /vendor\//, /dist\//, /build\//, /\.next\//, /__generated__\//, /\.git\//];

const SKIP_FILENAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock', 'Gemfile.lock',
  'Cargo.lock', 'go.sum', 'poetry.lock', 'Pipfile.lock'
]);

export const MAX_LINES_PER_FILE = 800;
export const MAX_DIFF_CHARS = 150_000;

function extensionOf(path: string): string {
  const base = path.split('/').pop() ?? '';
  if (base.endsWith('.min.js')) return 'min.js';
  if (base.endsWith('.min.css')) return 'min.css';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

export function isReviewable(file: ChangedFile): boolean {
  if (!file.patch) return false;
  if (SKIP_EXTENSIONS.has(extensionOf(file.path))) return false;
  if (SKIP_FILENAMES.has(file.path.split('/').pop() ?? '')) return false;
  return !SKIP_PATH_PATTERNS.some((pattern) => pattern.test(file.path));
}

/** Prefixes each new-side line with `Lnn:` so models can cite exact new-file line numbers. */
export function annotateDiffWithLineNumbers(patch: string): string {
  if (!patch) return '';
  const annotated: string[] = [];
  let newLine = 0;
  for (const raw of patch.split('\n')) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      annotated.push(raw);
    } else if (raw.startsWith('\\')) {
      annotated.push(raw);
    } else if (raw.startsWith('-')) {
      annotated.push(`      ${raw}`);
    } else if (raw.startsWith('+') || raw.startsWith(' ')) {
      annotated.push(`L${newLine}: ${raw}`);
      newLine++;
    } else {
      annotated.push(raw);
    }
  }
  return annotated.join('\n');
}

/** New-file line numbers that GitHub accepts for a RIGHT-side review comment. */
export function commentableLines(patch: string | null): Set<number> {
  const lines = new Set<number>();
  if (!patch) return lines;
  let newLine = 0;
  for (const raw of patch.split('\n')) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith('\\') || raw.startsWith('-')) continue;
    if (raw.startsWith('+') || raw.startsWith(' ')) {
      lines.add(newLine);
      newLine++;
    }
  }
  return lines;
}

function truncateLines(patch: string, maxLines: number): string {
  const lines = patch.split('\n');
  if (lines.length <= maxLines) return patch;
  return `${lines.slice(0, maxLines).join('\n')}\n... (diff truncated, ${lines.length - maxLines} more lines omitted)`;
}

export interface PreparedDiff {
  files: ChangedFile[];
  skipped: string[];
  truncated: string[];
}

/**
 * Drops non-reviewable files and fits the rest into a character budget.
 * Smaller files go first so one huge file cannot crowd out the rest of the PR.
 */
export function prepareDiff(files: readonly ChangedFile[], budget = MAX_DIFF_CHARS): PreparedDiff {
  const skipped: string[] = [];
  const truncated: string[] = [];
  const reviewable = files.filter((file) => {
    if (isReviewable(file)) return true;
    skipped.push(file.path);
    return false;
  });
  const bySize = [...reviewable].sort((a, b) => (a.patch?.length ?? 0) - (b.patch?.length ?? 0));
  const kept = new Set<string>();
  const patched = new Map<string, string>();
  let used = 0;
  for (const file of bySize) {
    const patch = truncateLines(file.patch ?? '', MAX_LINES_PER_FILE);
    if (patch !== file.patch) truncated.push(file.path);
    if (used + patch.length > budget) {
      skipped.push(file.path);
      continue;
    }
    used += patch.length;
    kept.add(file.path);
    patched.set(file.path, patch);
  }
  return {
    files: reviewable.filter((file) => kept.has(file.path)).map((file) => ({ ...file, patch: patched.get(file.path) ?? file.patch })),
    skipped,
    truncated
  };
}
