import type {
  DiffHunk,
  GitCommitNode,
  GitFileChange,
  GraphStyle,
  IssueLinkingRule
} from '../server/types.js';

export interface GraphSegment {
  fromRow: number;
  fromLane: number;
  toRow: number;
  toLane: number;
  color: string;
  isUncommitted?: boolean;
}

export interface PositionedCommit {
  commit: GitCommitNode;
  row: number;
  lane: number;
  color: string;
  isAncestorOfHead: boolean;
  isMerge: boolean;
}

export interface ComputedGraphLayout {
  nodes: PositionedCommit[];
  segments: GraphSegment[];
  maxLane: number;
}

const DEFAULT_PALETTE = [
  '#0085d9',
  '#d9008f',
  '#00d90a',
  '#d98500',
  '#a300d9',
  '#ff0000',
  '#00d9cc',
  '#e138e8',
  '#85d900',
  '#dc5b23',
  '#6f24d6',
  '#ffcc00'
];

/**
 * Computes deterministic branch lane assignments, connecting segments, and HEAD ancestry
 * for a list of commits ordered from newest (row 0) to oldest.
 */
export function computeGraphLayout(
  commits: readonly GitCommitNode[],
  headHash: string | null,
  colors: readonly string[] = DEFAULT_PALETTE
): ComputedGraphLayout {
  const palette = colors.length > 0 ? colors : DEFAULT_PALETTE;
  const rowByHash = new Map<string, number>();
  commits.forEach((c, idx) => rowByHash.set(c.hash, idx));

  // Compute HEAD ancestors for optional non-ancestor muting
  const headAncestors = new Set<string>();
  if (headHash && rowByHash.has(headHash)) {
    const queue: string[] = [headHash];
    headAncestors.add(headHash);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const idx = rowByHash.get(current);
      if (idx === undefined) continue;
      for (const parent of commits[idx].parents) {
        if (!headAncestors.has(parent)) {
          headAncestors.add(parent);
          if (rowByHash.has(parent)) queue.push(parent);
        }
      }
    }
  }

  interface ActiveSlot {
    targetHash: string;
    color: string;
    fromRow: number;
    fromLane: number;
    isUncommitted?: boolean;
  }

  const activeSlots: Array<ActiveSlot | null> = [];
  const nodes: PositionedCommit[] = [];
  const segments: GraphSegment[] = [];
  let colorCursor = 0;
  let maxLane = 0;

  const nextColor = (): string => {
    const c = palette[colorCursor % palette.length];
    colorCursor += 1;
    return c;
  };

  const allocateEmptyLane = (slot: ActiveSlot): number => {
    const emptyIdx = activeSlots.findIndex((s) => s === null);
    if (emptyIdx >= 0) {
      activeSlots[emptyIdx] = slot;
      if (emptyIdx > maxLane) maxLane = emptyIdx;
      return emptyIdx;
    }
    const newLane = activeSlots.length;
    activeSlots.push(slot);
    if (newLane > maxLane) maxLane = newLane;
    return newLane;
  };

  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row];
    const matchingLanes: number[] = [];
    for (let l = 0; l < activeSlots.length; l++) {
      if (activeSlots[l]?.targetHash === commit.hash) {
        matchingLanes.push(l);
      }
    }

    let commitLane: number;
    let commitColor: string;

    if (matchingLanes.length > 0) {
      commitLane = matchingLanes[0];
      commitColor = commit.isUncommitted
        ? '#8a94a6'
        : activeSlots[commitLane]!.color;

      // Connect all incoming lanes targeting this commit
      for (const l of matchingLanes) {
        const incoming = activeSlots[l]!;
        segments.push({
          fromRow: incoming.fromRow,
          fromLane: incoming.fromLane,
          toRow: row,
          toLane: commitLane,
          color: incoming.color,
          isUncommitted: incoming.isUncommitted
        });
        activeSlots[l] = null;
      }
    } else {
      commitColor = commit.isUncommitted ? '#8a94a6' : nextColor();
      commitLane = allocateEmptyLane({
        targetHash: commit.hash,
        color: commitColor,
        fromRow: row,
        fromLane: 0,
        isUncommitted: commit.isUncommitted
      });
      activeSlots[commitLane] = null;
    }

    nodes.push({
      commit,
      row,
      lane: commitLane,
      color: commitColor,
      isAncestorOfHead: commit.isUncommitted || (headHash ? headAncestors.has(commit.hash) : true),
      isMerge: commit.parents.length > 1
    });

    // Assign parents to lanes
    const visibleParents = commit.parents.filter((p) => rowByHash.has(p));
    visibleParents.forEach((parentHash, pIdx) => {
      if (pIdx === 0) {
        // First parent continues this commit's primary lane if not already occupied
        activeSlots[commitLane] = {
          targetHash: parentHash,
          color: commit.isUncommitted ? nextColor() : commitColor,
          fromRow: row,
          fromLane: commitLane,
          isUncommitted: commit.isUncommitted
        };
      } else {
        // Secondary merge parent: if another lane already targets it, connect directly or allocate a branch lane
        const existingLane = activeSlots.findIndex((s) => s?.targetHash === parentHash);
        const branchColor =
          existingLane >= 0 ? activeSlots[existingLane]!.color : nextColor();
        allocateEmptyLane({
          targetHash: parentHash,
          color: branchColor,
          fromRow: row,
          fromLane: commitLane
        });
      }
    });
  }

  return {
    nodes,
    segments,
    maxLane
  };
}

/**
 * Generates an SVG path string (`d` attribute) for a graph segment in `rounded` or `angular` style.
 */
export function buildSegmentSvgPath(args: {
  segment: GraphSegment;
  rowHeight: number;
  laneWidth: number;
  padX: number;
  style: GraphStyle;
  expandedRow?: number;
  detailsHeight?: number;
}): string {
  const { segment, rowHeight, laneWidth, padX, style, expandedRow = -1, detailsHeight = 0 } = args;

  const getY = (row: number): number => {
    if (expandedRow >= 0 && detailsHeight > 0 && row > expandedRow) {
      return row * rowHeight + detailsHeight + rowHeight / 2;
    }
    return row * rowHeight + rowHeight / 2;
  };

  const x1 = padX + segment.fromLane * laneWidth;
  const y1 = getY(segment.fromRow);
  const x2 = padX + segment.toLane * laneWidth;
  const y2 = getY(segment.toRow);

  if (x1 === x2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  if (style === 'angular') {
    const midY = y1 + rowHeight * 0.5;
    if (midY >= y2) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${y2}`;
  }

  // Rounded curve
  const deltaRows = segment.toRow - segment.fromRow;
  if (deltaRows <= 1) {
    if (expandedRow >= 0 && detailsHeight > 0 && segment.fromRow <= expandedRow && segment.toRow > expandedRow) {
      const turnY = y1 + rowHeight;
      const cy1 = y1 + rowHeight * 0.45;
      const cy2 = turnY - rowHeight * 0.45;
      return `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${turnY} L ${x2} ${y2}`;
    }
    const cy1 = y1 + rowHeight * 0.5;
    const cy2 = y2 - rowHeight * 0.5;
    return `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
  }

  // Multi-row branch/merge: curve into target/source lane within 1 row, then vertical line
  if (segment.toLane > segment.fromLane) {
    const turnY = y1 + rowHeight;
    const cy1 = y1 + rowHeight * 0.45;
    const cy2 = turnY - rowHeight * 0.45;
    return `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${turnY} L ${x2} ${y2}`;
  } else {
    const turnY = y2 - rowHeight;
    const cy1 = turnY + rowHeight * 0.45;
    const cy2 = y2 - rowHeight * 0.45;
    return `M ${x1} ${y1} L ${x1} ${turnY} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
  }
}

const GITMOJI_MAP: Record<string, string> = {
  ':art:': '🎨',
  ':zap:': '⚡',
  ':fire:': '🔥',
  ':bug:': '🐛',
  ':ambulance:': '🚑️',
  ':sparkles:': '✨',
  ':memo:': '📝',
  ':rocket:': '🚀',
  ':lipstick:': '💄',
  ':tada:': '🎉',
  ':white_check_mark:': '✅',
  ':lock:': '🔒️',
  ':bookmark:': '🔖',
  ':rotating_light:': '🚨',
  ':construction:': '🚧',
  ':green_heart:': '💚',
  ':arrow_down:': '⬇️',
  ':arrow_up:': '⬆️',
  ':pushpin:': '📌',
  ':construction_worker:': '👷',
  ':chart_with_upwards_trend:': '📈',
  ':recycle:': '♻️',
  ':heavy_plus_sign:': '➕',
  ':heavy_minus_sign:': '➖',
  ':wrench:': '🔧',
  ':hammer:': '🔨',
  ':globe_with_meridians:': '🌐',
  ':pencil2:': '✏️',
  ':rewind:': '⏪️',
  ':twisted_rightwards_arrows:': '🔀',
  ':package:': '📦️',
  ':alien:': '👽️',
  ':truck:': '🚚',
  ':page_facing_up:': '📄',
  ':boom:': '💥',
  ':bento:': '🍱',
  ':wheelchair:': '♿️',
  ':bulb:': '💡',
  ':speech_balloon:': '💬',
  ':card_file_box:': '🗃️',
  ':loud_sound:': '🔊',
  ':mute:': '🔇',
  ':Coffin:': '⚰️',
  ':test_tube:': '🧪',
  ':necktie:': '👔',
  ':stethoscope:': '🩺',
  ':bricks:': '🧱'
};

/**
 * Replaces common gitmoji shortcodes (`:sparkles:`, `:bug:`, etc.) with emoji characters.
 */
export function replaceGitmojiShortcodes(text: string): string {
  return text.replace(/:[a-z0-9_+-]+:/gi, (shortcode) => {
    const lower = shortcode.toLowerCase();
    return GITMOJI_MAP[lower] ?? shortcode;
  });
}

export interface FormattedTextToken {
  kind: 'text' | 'code' | 'link';
  text: string;
  href?: string;
}

/**
 * Tokenizes commit messages for inline code (`...`), URLs, and configured Issue Linking rules.
 */
export function tokenizeCommitMessage(
  rawText: string,
  issueRules: readonly IssueLinkingRule[] = []
): FormattedTextToken[] {
  const withEmoji = replaceGitmojiShortcodes(rawText);
  const tokens: FormattedTextToken[] = [];

  // First split by inline code (`...`) or http(s) URLs
  const baseRegex = /(`[^`]+`|https?:\/\/[^\s)]+)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  const pushPlainWithIssues = (segment: string) => {
    if (!segment) return;
    if (issueRules.length === 0) {
      tokens.push({ kind: 'text', text: segment });
      return;
    }

    for (const rule of issueRules) {
      try {
        const rx = new RegExp(rule.pattern, 'g');
        let subLast = 0;
        let m: RegExpExecArray | null;
        const subTokens: FormattedTextToken[] = [];
        while ((m = rx.exec(segment)) !== null) {
          if (m.index > subLast) {
            subTokens.push({ kind: 'text', text: segment.slice(subLast, m.index) });
          }
          let url = rule.urlTemplate;
          m.forEach((group, idx) => {
            if (group !== undefined) {
              url = url.replace(new RegExp(`\\$${idx}`, 'g'), group);
            }
          });
          subTokens.push({ kind: 'link', text: m[0], href: url });
          subLast = m.index + m[0].length;
          if (m[0].length === 0) break;
        }
        if (subTokens.length > 0) {
          if (subLast < segment.length) {
            subTokens.push({ kind: 'text', text: segment.slice(subLast) });
          }
          tokens.push(...subTokens);
          return;
        }
      } catch {
        // Ignore invalid user regex
      }
    }

    tokens.push({ kind: 'text', text: segment });
  };

  while ((match = baseRegex.exec(withEmoji)) !== null) {
    if (match.index > lastIdx) {
      pushPlainWithIssues(withEmoji.slice(lastIdx, match.index));
    }
    const tokenStr = match[0];
    if (tokenStr.startsWith('`') && tokenStr.endsWith('`')) {
      tokens.push({ kind: 'code', text: tokenStr.slice(1, -1) });
    } else {
      tokens.push({ kind: 'link', text: tokenStr, href: tokenStr });
    }
    lastIdx = match.index + tokenStr.length;
  }

  if (lastIdx < withEmoji.length) {
    pushPlainWithIssues(withEmoji.slice(lastIdx));
  }

  return tokens.length > 0 ? tokens : [{ kind: 'text', text: withEmoji }];
}

export interface FileTreeNode {
  name: string;
  path: string;
  kind: 'folder' | 'file';
  children: FileTreeNode[];
  fileChange?: GitFileChange;
}

/**
 * Builds a hierarchical File Tree from flat `GitFileChange[]`, optionally compacting
 * single-child folders (matching `git-graph.commitDetailsView.fileView.fileTree.compactFolders`).
 */
export function buildFileTree(
  files: readonly GitFileChange[],
  compactFolders: boolean
): FileTreeNode[] {
  const root: FileTreeNode = { name: '', path: '', kind: 'folder', children: [] };

  for (const change of files) {
    const parts = change.newPath.split('/').filter(Boolean);
    let current = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.children.push({
          name: part,
          path: change.newPath,
          kind: 'file',
          children: [],
          fileChange: change
        });
      } else {
        let folder = current.children.find((c) => c.kind === 'folder' && c.name === part);
        if (!folder) {
          folder = { name: part, path: currentPath, kind: 'folder', children: [] };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  function sortAndCompact(nodes: FileTreeNode[]): FileTreeNode[] {
    const processed = nodes.map((node) => {
      if (node.kind === 'file') return node;
      let current = { ...node, children: sortAndCompact(node.children) };
      while (
        compactFolders &&
        current.children.length === 1 &&
        current.children[0].kind === 'folder'
      ) {
        const onlyChild = current.children[0];
        current = {
          name: `${current.name}/${onlyChild.name}`,
          path: onlyChild.path,
          kind: 'folder',
          children: onlyChild.children
        };
      }
      return current;
    });

    return processed.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  return sortAndCompact(root.children);
}

export interface SplitDiffRow {
  leftLineNumber: number | null;
  leftContent: string;
  leftType: 'context' | 'del' | 'empty' | 'meta';
  rightLineNumber: number | null;
  rightContent: string;
  rightType: 'context' | 'add' | 'empty' | 'meta';
}

/**
 * Converts a `DiffHunk` into aligned side-by-side `SplitDiffRow[]` for split diff rendering.
 */
export function buildSplitDiffRows(hunk: DiffHunk): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  let i = 0;
  const lines = hunk.lines;

  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'context') {
      rows.push({
        leftLineNumber: line.oldLineNumber,
        leftContent: line.content,
        leftType: 'context',
        rightLineNumber: line.newLineNumber,
        rightContent: line.content,
        rightType: 'context'
      });
      i += 1;
      continue;
    }

    if (line.type === 'meta') {
      rows.push({
        leftLineNumber: null,
        leftContent: line.content,
        leftType: 'meta',
        rightLineNumber: null,
        rightContent: line.content,
        rightType: 'meta'
      });
      i += 1;
      continue;
    }

    // Group contiguous deletions and additions
    const dels: typeof lines = [];
    const adds: typeof lines = [];
    while (i < lines.length && lines[i].type === 'del') {
      dels.push(lines[i]);
      i += 1;
    }
    while (i < lines.length && lines[i].type === 'add') {
      adds.push(lines[i]);
      i += 1;
    }

    const maxLen = Math.max(dels.length, adds.length);
    for (let k = 0; k < maxLen; k++) {
      const d = dels[k];
      const a = adds[k];
      rows.push({
        leftLineNumber: d ? d.oldLineNumber : null,
        leftContent: d ? d.content : '',
        leftType: d ? 'del' : 'empty',
        rightLineNumber: a ? a.newLineNumber : null,
        rightContent: a ? a.content : '',
        rightType: a ? 'add' : 'empty'
      });
    }
  }

  return rows;
}

export function formatCommitTimestamp(
  unixSeconds: number,
  format: 'relative' | 'iso' | 'datetime',
  nowMs = Date.now()
): string {
  if (!unixSeconds) return '';
  const date = new Date(unixSeconds * 1000);
  if (format === 'iso') {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
  if (format === 'datetime') {
    return date.toLocaleString();
  }
  const diffSec = Math.max(0, Math.floor((nowMs - unixSeconds * 1000) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
