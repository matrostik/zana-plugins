import { describe, expect, it } from 'vitest';
import {
  buildFileTree,
  buildSegmentSvgPath,
  buildSplitDiffRows,
  computeGraphLayout,
  formatCommitTimestamp,
  replaceGitmojiShortcodes,
  tokenizeCommitMessage
} from '../app/graph-layout.js';
import type { DiffHunk, GitCommitNode, GitFileChange } from '../server/types.js';

function makeCommit(
  hash: string,
  parents: string[],
  over: Partial<GitCommitNode> = {}
): GitCommitNode {
  return {
    hash,
    abbreviatedHash: hash.slice(0, 7),
    parents,
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    authorDate: 1700000000,
    committerName: 'Alice',
    committerEmail: 'alice@example.com',
    commitDate: 1700000000,
    subject: `Commit ${hash}`,
    refs: [],
    ...over
  };
}

describe('graph-layout', () => {
  it('computes lanes, segments, merge status, and HEAD ancestry for a branching DAG', () => {
    const commits: GitCommitNode[] = [
      makeCommit('*', ['c3'], { isUncommitted: true }),
      makeCommit('c4', ['c2'], { refs: [{ type: 'head', name: 'feature' }] }),
      makeCommit('c3', ['c2', 'c1'], { isHead: true }),
      makeCommit('c2', ['c1']),
      makeCommit('c1', [])
    ];

    const layout = computeGraphLayout(commits, 'c3');
    expect(layout.nodes).toHaveLength(5);
    expect(layout.nodes[0].commit.isUncommitted).toBe(true);
    expect(layout.nodes[0].isAncestorOfHead).toBe(true);
    // c4 is on a side branch not reachable from HEAD (c3)
    expect(layout.nodes[1].commit.hash).toBe('c4');
    expect(layout.nodes[1].isAncestorOfHead).toBe(false);
    // c3 is HEAD and a merge commit
    expect(layout.nodes[2].commit.hash).toBe('c3');
    expect(layout.nodes[2].isMerge).toBe(true);
    expect(layout.nodes[2].isAncestorOfHead).toBe(true);
    // c2 and c1 are ancestors of c3
    expect(layout.nodes[3].isAncestorOfHead).toBe(true);
    expect(layout.nodes[4].isAncestorOfHead).toBe(true);
    expect(layout.segments.length).toBeGreaterThanOrEqual(4);
    expect(layout.maxLane).toBeGreaterThanOrEqual(1);
  });

  it('builds SVG paths for vertical, angular, and rounded multi-row segments', () => {
    const vertical = buildSegmentSvgPath({
      segment: { fromRow: 0, fromLane: 0, toRow: 2, toLane: 0, color: '#0085d9' },
      rowHeight: 28,
      laneWidth: 14,
      padX: 14,
      style: 'rounded'
    });
    expect(vertical).toBe('M 14 14 L 14 70');

    const angular = buildSegmentSvgPath({
      segment: { fromRow: 0, fromLane: 0, toRow: 2, toLane: 1, color: '#0085d9' },
      rowHeight: 28,
      laneWidth: 14,
      padX: 14,
      style: 'angular'
    });
    expect(angular).toContain('L 28 70');

    const roundedSingleRow = buildSegmentSvgPath({
      segment: { fromRow: 0, fromLane: 0, toRow: 1, toLane: 1, color: '#0085d9' },
      rowHeight: 28,
      laneWidth: 14,
      padX: 14,
      style: 'rounded'
    });
    expect(roundedSingleRow).toContain('C ');

    const roundedMultiRowRight = buildSegmentSvgPath({
      segment: { fromRow: 0, fromLane: 0, toRow: 3, toLane: 2, color: '#0085d9' },
      rowHeight: 28,
      laneWidth: 14,
      padX: 14,
      style: 'rounded'
    });
    expect(roundedMultiRowRight).toContain('C ');
    expect(roundedMultiRowRight).toContain('L 42 98');

    const roundedMultiRowLeft = buildSegmentSvgPath({
      segment: { fromRow: 0, fromLane: 2, toRow: 3, toLane: 0, color: '#0085d9' },
      rowHeight: 28,
      laneWidth: 14,
      padX: 14,
      style: 'rounded'
    });
    expect(roundedMultiRowLeft).toContain('C ');

    const inlineShifted = buildSegmentSvgPath({
      segment: { fromRow: 0, fromLane: 0, toRow: 2, toLane: 0, color: '#0085d9' },
      rowHeight: 28,
      laneWidth: 14,
      padX: 14,
      style: 'rounded',
      expandedRow: 0,
      detailsHeight: 100
    });
    expect(inlineShifted).toBe('M 14 14 L 14 170');
  });

  it('replaces gitmoji shortcodes and tokenizes inline code, URLs, and issue rules', () => {
    expect(replaceGitmojiShortcodes(':sparkles: Add :bug: fix :unknown:')).toBe(
      '✨ Add 🐛 fix :unknown:'
    );

    const tokens = tokenizeCommitMessage(
      ':rocket: Fix `auth.ts` for PROJ-42 see https://example.com/pr/1',
      [
        {
          id: 'jira',
          pattern: 'PROJ-(\\d+)',
          urlTemplate: 'https://jira.example.com/browse/PROJ-$1'
        }
      ]
    );

    expect(tokens.some((t) => t.kind === 'code' && t.text === 'auth.ts')).toBe(true);
    expect(
      tokens.some(
        (t) =>
          t.kind === 'link' &&
          t.text === 'PROJ-42' &&
          t.href === 'https://jira.example.com/browse/PROJ-42'
      )
    ).toBe(true);
    expect(
      tokens.some((t) => t.kind === 'link' && t.href === 'https://example.com/pr/1')
    ).toBe(true);
  });

  it('builds a hierarchical file tree with and without folder compaction', () => {
    const files: GitFileChange[] = [
      {
        oldPath: 'src/app/components/Button.tsx',
        newPath: 'src/app/components/Button.tsx',
        status: 'M',
        additions: 10,
        deletions: 2
      },
      {
        oldPath: 'src/app/components/Input.tsx',
        newPath: 'src/app/components/Input.tsx',
        status: 'A',
        additions: 25,
        deletions: 0
      },
      {
        oldPath: 'README.md',
        newPath: 'README.md',
        status: 'M',
        additions: 1,
        deletions: 1
      }
    ];

    const compacted = buildFileTree(files, true);
    expect(compacted).toHaveLength(2);
    expect(compacted[0].kind).toBe('folder');
    expect(compacted[0].name).toBe('src/app/components');
    expect(compacted[0].children).toHaveLength(2);
    expect(compacted[1].kind).toBe('file');
    expect(compacted[1].name).toBe('README.md');

    const uncompacted = buildFileTree(files, false);
    expect(uncompacted[0].name).toBe('src');
    expect(uncompacted[0].children[0].name).toBe('app');
  });

  it('aligns deletions and additions side-by-side in buildSplitDiffRows', () => {
    const hunk: DiffHunk = {
      header: '@@ -1,3 +1,4 @@',
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 4,
      lines: [
        { type: 'context', oldLineNumber: 1, newLineNumber: 1, content: 'const a = 1;' },
        { type: 'del', oldLineNumber: 2, newLineNumber: null, content: 'const b = 2;' },
        { type: 'add', oldLineNumber: null, newLineNumber: 2, content: 'const b = 20;' },
        { type: 'add', oldLineNumber: null, newLineNumber: 3, content: 'const c = 30;' },
        { type: 'meta', oldLineNumber: null, newLineNumber: null, content: 'No newline' }
      ]
    };

    const rows = buildSplitDiffRows(hunk);
    expect(rows).toHaveLength(4);
    expect(rows[0].leftType).toBe('context');
    expect(rows[1].leftType).toBe('del');
    expect(rows[1].rightType).toBe('add');
    expect(rows[2].leftType).toBe('empty');
    expect(rows[2].rightType).toBe('add');
    expect(rows[3].leftType).toBe('meta');
  });

  it('formats commit timestamps in relative, iso, and datetime modes', () => {
    const nowMs = 1700003600 * 1000;
    expect(formatCommitTimestamp(0, 'relative', nowMs)).toBe('');
    expect(formatCommitTimestamp(1700003590, 'relative', nowMs)).toBe('just now');
    expect(formatCommitTimestamp(1700003000, 'relative', nowMs)).toBe('10m ago');
    expect(formatCommitTimestamp(1700000000, 'relative', nowMs)).toBe('1h ago');
    expect(formatCommitTimestamp(1700000000, 'iso', nowMs)).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(formatCommitTimestamp(1700000000, 'datetime', nowMs).length).toBeGreaterThan(0);
  });
});
