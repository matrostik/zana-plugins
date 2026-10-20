import { describe, expect, it } from 'vitest';
import { parseDiffStatAndStatus, parsePorcelainFileChanges, parseUnifiedDiff } from '../server/git-details-diff.js';

describe('parseDiffStatAndStatus rename and copy handling', () => {
  it('pairs a rename from name-status with its numstat counts', () => {
    const numstat = '4\t2\t\0old.ts\0new.ts\0';
    const nameStatus = 'R087\0old.ts\0new.ts\0';
    const [change] = parseDiffStatAndStatus(numstat, nameStatus);
    expect(change).toMatchObject({ oldPath: 'old.ts', newPath: 'new.ts', status: 'R', additions: 4, deletions: 2 });
  });

  it('defaults a rename with no name-status entry to R and keeps the old path as new when missing', () => {
    const [change] = parseDiffStatAndStatus('1\t1\t\0a.ts\0', '');
    expect(change).toMatchObject({ oldPath: 'a.ts', newPath: 'a.ts', status: 'R' });
  });

  it('treats a copy as a copy and maps a truncated rename status gracefully', () => {
    const numstat = '0\t0\t\0src.ts\0dst.ts\0';
    const copy = parseDiffStatAndStatus(numstat, 'C100\0src.ts\0dst.ts\0');
    expect(copy[0]).toMatchObject({ status: 'C', newPath: 'dst.ts' });
    const truncated = parseDiffStatAndStatus('0\t0\t\0a\0b\0', 'R');
    expect(truncated[0]).toMatchObject({ newPath: 'b' });
  });

  it('keeps status-only files that have no numstat line, with zero counts', () => {
    const changes = parseDiffStatAndStatus('', 'A\0mode-only.sh\0');
    expect(changes).toEqual([
      { oldPath: 'mode-only.sh', newPath: 'mode-only.sh', status: 'A', additions: 0, deletions: 0 }
    ]);
  });

  it('skips malformed numstat lines and reads unknown-status text as modified', () => {
    const changes = parseDiffStatAndStatus('not-a-line\0', 'X\0file.ts\0');
    expect(changes.every((c) => c.newPath === 'file.ts')).toBe(true);
  });
});

describe('parsePorcelainFileChanges edge cases', () => {
  it('reads staged renames across two NUL-separated paths and skips empty entries', () => {
    const stdout = ['R  new.ts', 'old.ts', '', 'A  added.ts', ''].join('\0');
    const changes = parsePorcelainFileChanges(stdout, false);
    expect(changes.find((c) => c.newPath === 'new.ts')).toMatchObject({ status: 'R', oldPath: 'old.ts' });
    expect(changes.find((c) => c.newPath === 'added.ts')).toBeDefined();
  });

  it('returns nothing for empty output', () => {
    expect(parsePorcelainFileChanges('', true)).toEqual([]);
  });
});

describe('parseUnifiedDiff edge cases', () => {
  it('ignores header lines and reads hunk ranges with and without counts', () => {
    const raw = [
      'diff --git a/x b/x',
      'index 1..2 100644',
      '--- a/x',
      '+++ b/x',
      '@@ -3 +3 @@',
      '-old',
      '+new',
      '@@ -10,0 +11,2 @@',
      '+one',
      '+two'
    ].join('\n');
    const parsed = parseUnifiedDiff(raw);
    expect(parsed.isBinary).toBe(false);
    expect(parsed.hunks).toHaveLength(2);
    expect(parsed.hunks[1].lines.filter((l) => l.type === 'add')).toHaveLength(2);
  });

  it('returns no hunks for an empty diff', () => {
    expect(parseUnifiedDiff('')).toEqual({ isBinary: false, hunks: [] });
  });
});
