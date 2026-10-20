import { describe, expect, it } from 'vitest';
import {
  countPorcelainStatusEntries,
  parseGitLogOutput,
  parseGitRemotesOutput,
  parseShowRefOutput,
  parseStashListOutput
} from '../server/git-log-parser.js';
import {
  parseDiffStatAndStatus,
  parsePorcelainFileChanges,
  parseUnifiedDiff
} from '../server/git-details-diff.js';

const FS = '\x1f';
const RS = '\x1e';
const H1 = 'a'.repeat(40);
const H2 = 'b'.repeat(40);

describe('parseShowRefOutput', () => {
  it('collects heads, remotes, tags, and annotated tag targets', () => {
    const stdout = [
      `${H1} HEAD`,
      `${H1} refs/heads/main`,
      `${H2} refs/heads/feature`,
      `${H2} refs/remotes/origin/main`,
      `${H2} refs/remotes/origin/HEAD`,
      `${H1} refs/remotes/nonamespace`,
      `${H1} refs/tags/v1`,
      `${H2} refs/tags/v1^{}`,
      `${H2} refs/tags/light`,
      `   `,
      `nospace`,
      ` ${H1} refs/heads/leading-space-trimmed`
    ].join('\n');
    const parsed = parseShowRefOutput(stdout, 'main');
    expect(parsed.headHash).toBe(H1);
    expect(parsed.currentBranch).toBe('main');
    expect(parsed.branches).toEqual(['feature', 'leading-space-trimmed', 'main']);
    expect(parsed.remoteBranches).toEqual(['nonamespace', 'origin/main']);
    expect(parsed.tags).toEqual(['light', 'v1']);
    expect(parsed.refsByHash.get(H1)?.find((b) => b.name === 'main')?.isHead).toBe(true);
    expect(parsed.refsByHash.get(H2)?.find((b) => b.name === 'v1')).toMatchObject({ type: 'tag' });
    expect(parsed.refsByHash.get(H2)?.find((b) => b.name === 'light')).toMatchObject({ type: 'tag' });
    expect(parsed.refsByHash.get(H2)?.find((b) => b.name === 'origin/main')).toMatchObject({ type: 'remote', remote: 'origin' });
  });

  it('marks no branch as HEAD when the current branch is detached', () => {
    const parsed = parseShowRefOutput(`${H1} refs/heads/main`, null);
    expect(parsed.refsByHash.get(H1)?.[0].isHead).toBe(false);
  });
});

describe('parseGitLogOutput', () => {
  const header = ['%H', '%h', '%P', '%an', '%ae', '%at', '%cn', '%ce', '%ct', '%s'];
  void header;

  it('parses records, attaches refs, and flags HEAD', () => {
    const record = [H1, 'aaaaaaa', `${H2} ${'c'.repeat(40)}`, 'Ann', 'ann@x', '100', 'Cam', 'cam@x', '200', 'subject', 'with sep'].join(FS) + RS;
    const short = [H2, '', '', 'Bo', 'bo@x', 'nope', 'Bo', 'bo@x', '', ' trailing '].join(FS) + RS;
    const bad = ['short', 'fields'].join(FS) + RS;
    const blankHash = ['   ', 'x', '', 'a', 'a', '1', 'a', 'a', '1', 's'].join(FS) + RS;
    const refs = new Map([[H1, [{ type: 'head' as const, name: 'main', isHead: true }]]]);
    const nodes = parseGitLogOutput(`\n${record}${short}${bad}${blankHash}\n`, refs, H1);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({
      hash: H1,
      abbreviatedHash: 'aaaaaaa',
      parents: [H2, 'c'.repeat(40)],
      authorName: 'Ann',
      authorDate: 100,
      commitDate: 200,
      subject: `subject${FS}with sep`,
      isHead: true
    });
    expect(nodes[0].refs).toEqual([{ type: 'head', name: 'main', isHead: true }]);
    expect(nodes[1]).toMatchObject({
      hash: H2,
      abbreviatedHash: H2.slice(0, 7),
      parents: [],
      authorDate: 0,
      commitDate: 0,
      subject: 'trailing',
      isHead: false
    });
  });
});

describe('parseStashListOutput', () => {
  it('keeps valid stashes and falls back to a short hash', () => {
    const ok = ['stash@{0}', H1, '', H2, 'Ann', 'ann@x', '42', 'WIP', 'more'].join(FS) + RS;
    const noParents = ['stash@{1}', H2, '', '', 'Ann', 'ann@x', '1', 'x'].join(FS) + RS;
    const tooShort = ['a', 'b'].join(FS) + RS;
    const noHash = ['stash@{2}', '', '', H1, 'a', 'a', '1', 's'].join(FS) + RS;
    const stashes = parseStashListOutput(`${ok}${noParents}${tooShort}${noHash}`);
    expect(stashes).toHaveLength(1);
    expect(stashes[0]).toMatchObject({
      selector: 'stash@{0}',
      hash: H1,
      abbreviatedHash: H1.slice(0, 7),
      baseHash: H2,
      authorDate: 42,
      subject: `WIP${FS}more`
    });
  });
});

describe('countPorcelainStatusEntries', () => {
  it('counts entries and optionally skips untracked files', () => {
    expect(countPorcelainStatusEntries('', true)).toBe(0);
    const stdout = ' M a.ts\0?? new.ts\0R  old\0renamed.ts\0A  added.ts\0';
    expect(countPorcelainStatusEntries(stdout, true)).toBe(4);
    expect(countPorcelainStatusEntries(stdout, false)).toBe(3);
  });
});

describe('parseGitRemotesOutput', () => {
  it('reads fetch and push URLs per remote and ignores unknown lines', () => {
    const stdout = [
      'origin\thttps://h/o/r.git (fetch)',
      'origin\thttps://h/o/r.git (push)',
      'upstream\tgit@h:u/r.git (fetch)',
      'weird line'
    ].join('\n');
    const remotes = parseGitRemotesOutput(stdout);
    expect(remotes.map((r) => r.name)).toEqual(['origin', 'upstream']);
    expect(remotes[0]).toMatchObject({ name: 'origin', fetchUrl: 'https://h/o/r.git' });
  });
});

describe('parseDiffStatAndStatus', () => {
  it('pairs numstat with name-status, including binary and renamed files', () => {
    const numstat = ['3\t1\tsrc/a.ts', '-\t-\tbin.png', '2\t0\tnew name.ts', ''].join('\0');
    const nameStatus = ['M', 'src/a.ts', 'A', 'bin.png', 'R100', 'old.ts', 'new name.ts', ''].join('\0');
    const changes = parseDiffStatAndStatus(numstat, nameStatus);
    expect(changes.find((c) => c.newPath === 'src/a.ts')).toMatchObject({ status: 'M', additions: 3, deletions: 1 });
    expect(changes.find((c) => c.newPath === 'bin.png')).toMatchObject({ additions: null, deletions: null });
  });
});

describe('parsePorcelainFileChanges', () => {
  it('maps status codes for staged, unstaged, untracked, and renamed entries', () => {
    const stdout = ['M  staged.ts', ' M unstaged.ts', '?? new.ts', 'R  new-name.ts', 'orig.ts', ''].join('\0');
    const untracked = parsePorcelainFileChanges(stdout, true);
    const tracked = parsePorcelainFileChanges(stdout, false);
    expect(untracked.find((c) => c.newPath === 'new.ts')).toMatchObject({ status: 'U', untracked: true });
    expect(tracked.find((c) => c.newPath === 'staged.ts')).toMatchObject({ staged: true });
    expect(untracked.length).toBeGreaterThan(tracked.length);
  });
});

describe('parseUnifiedDiff', () => {
  it('flags binary diffs and parses hunks with line numbers', () => {
    expect(parseUnifiedDiff('Binary files a/x and b/x differ').isBinary).toBe(true);
    const raw = [
      'diff --git a/f b/f',
      '--- a/f',
      '+++ b/f',
      '@@ -1,2 +1,2 @@',
      ' keep',
      '-old',
      '+new',
      '\\ No newline at end of file'
    ].join('\n');
    const parsed = parseUnifiedDiff(raw);
    expect(parsed.isBinary).toBe(false);
    expect(parsed.hunks).toHaveLength(1);
    expect(parsed.hunks[0].lines.some((l) => l.type === 'del')).toBe(true);
    expect(parsed.hunks[0].lines.some((l) => l.type === 'add')).toBe(true);
  });
});
