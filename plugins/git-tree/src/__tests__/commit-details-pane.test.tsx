// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CommitDetailsPane, type CommitDetailsPaneProps } from '../app/components/CommitDetailsPane.js';

const file = (path: string, extra: Record<string, unknown> = {}) =>
  ({
    newPath: path,
    oldPath: path,
    status: 'M',
    additions: 3,
    deletions: 1,
    staged: undefined,
    untracked: false,
    ...extra
  }) as never;

const details = (extra: Record<string, unknown> = {}) =>
  ({
    hash: 'a'.repeat(40),
    abbreviatedHash: 'aaaaaaa',
    parents: ['b'.repeat(40), 'c'.repeat(40)],
    authorName: 'Ann',
    authorEmail: 'ann@x',
    authorDate: 100,
    committerName: 'Cam',
    committerEmail: 'cam@x',
    commitDate: 200,
    subject: 'Fix bug',
    body: 'Details here',
    signature: undefined,
    fileChanges: [file('src/a.ts'), file('src/b.ts', { status: 'A', additions: 0, deletions: null })],
    ...extra
  }) as never;

function props(overrides: Partial<CommitDetailsPaneProps> = {}): CommitDetailsPaneProps {
  return {
    mode: 'single',
    details: details(),
    comparison: null,
    loading: false,
    inline: false,
    fileViewType: 'list',
    compactFolders: true,
    diffViewMode: 'unified',
    dateFormat: 'iso',
    issueRules: [],
    codeReview: null,
    selectedFilePath: null,
    fileDiff: null,
    loadingDiff: false,
    fileContent: null,
    loadingContent: false,
    onSelectFile: vi.fn(),
    onLoadFileContent: vi.fn(),
    onChangeFileViewType: vi.fn(),
    onToggleCompactFolders: vi.fn(),
    onChangeDiffViewMode: vi.fn(),
    onStartCodeReview: vi.fn(),
    onToggleReviewedFile: vi.fn(),
    onEndCodeReview: vi.fn(),
    onSelectParentHash: vi.fn(),
    onAskAgent: vi.fn(),
    onCopyText: vi.fn(),
    onClose: vi.fn(),
    ...overrides
  } as CommitDetailsPaneProps;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

describe('CommitDetailsPane header and metadata', () => {
  it('shows the comparison header and an empty placeholder without details', () => {
    const cmp = render(
      <CommitDetailsPane
        {...props({
          mode: 'comparison',
          details: null,
          comparison: { fromHash: 'a'.repeat(40), toHash: 'b'.repeat(40), fileChanges: [file('x.ts')] } as never
        })}
      />
    );
    expect(cmp.container.textContent).toContain('Comparing');
    cmp.unmount();
    const empty = render(<CommitDetailsPane {...props({ details: null })} />);
    expect(empty.container.textContent).toContain('Commit Details');
  });

  it('shows signature details, root commit text, and uncommitted header', () => {
    const signed = render(
      <CommitDetailsPane
        {...props({
          details: details({
            signature: { label: 'Good', signer: 'Signer', code: 'G' },
            parents: []
          })
        })}
      />
    );
    expect(signed.container.textContent).toContain('🔒 Good');
    expect(signed.container.textContent).toContain('None (root commit)');
    signed.unmount();
    const wip = render(<CommitDetailsPane {...props({ details: details({ hash: '*' }) })} />);
    expect(wip.container.textContent).toContain('Uncommitted Changes');
    expect(wip.container.querySelector('.gg-details-meta')).toBeNull();
  });

  it('copies and navigates to hashes from the metadata grid', () => {
    const p = props();
    const { getByText, container } = render(<CommitDetailsPane {...p} />);
    fireEvent.click(getByText('Copy'));
    expect(p.onCopyText).toHaveBeenCalledWith('a'.repeat(40), 'Commit hash');
    fireEvent.click(container.querySelectorAll('.gg-parent-link')[1]);
    expect(p.onSelectParentHash).toHaveBeenCalledWith('c'.repeat(40));
  });

  it('shows loading state and the header actions', () => {
    const p = props({ loading: true });
    const { getByTestId, getByText } = render(<CommitDetailsPane {...p} />);
    expect(getByText('Loading commit details…')).toBeTruthy();
    fireEvent.click(getByTestId('gg-ask-agent-btn'));
    expect(p.onAskAgent).toHaveBeenCalledWith(undefined);
    fireEvent.click(getByTestId('gg-close-details-btn'));
    expect(p.onClose).toHaveBeenCalled();
  });
});

describe('CommitDetailsPane code review', () => {
  it('starts a review and toggles reviewed files', () => {
    const p = props();
    const { getByTestId } = render(<CommitDetailsPane {...p} />);
    fireEvent.click(getByTestId('gg-start-review-btn'));
    expect(p.onStartCodeReview).toHaveBeenCalled();
  });

  it('shows review progress and marks files reviewed', () => {
    const p = props({
      codeReview: { reviewedFiles: ['src/a.ts'] } as never,
      selectedFilePath: 'src/a.ts'
    });
    const { getByTestId, getByText, container } = render(<CommitDetailsPane {...p} />);
    expect(getByText(/Reviewed 1\/2/)).toBeTruthy();
    expect(getByTestId('gg-end-review-btn').textContent).toContain('(1/2)');
    fireEvent.click(getByTestId('gg-end-review-btn'));
    expect(p.onEndCodeReview).toHaveBeenCalled();
    const box = container.querySelector('.gg-file-row input[type="checkbox"]') as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(container.querySelectorAll('.gg-file-row input[type="checkbox"]')[1]);
    fireEvent.change(container.querySelectorAll('.gg-file-row input[type="checkbox"]')[1], { target: { checked: true } });
    expect(p.onToggleReviewedFile).toHaveBeenCalledWith('src/b.ts', true);
  });
});

describe('CommitDetailsPane file list', () => {
  it('renders a tree with collapsible folders and compact toggle', () => {
    const p = props({
      fileViewType: 'tree',
      details: details({ fileChanges: [file('src/deep/a.ts'), file('src/deep/b.ts')] })
    });
    const { container, getByText } = render(<CommitDetailsPane {...p} />);
    const folder = container.querySelector('.gg-folder-row') as HTMLElement;
    expect(folder).toBeTruthy();
    fireEvent.click(folder);
    expect(container.querySelectorAll('.gg-file-row').length).toBe(0);
    fireEvent.click(folder);
    expect(container.querySelectorAll('.gg-file-row').length).toBe(2);
    fireEvent.click(getByText('Compact'));
    expect(p.onToggleCompactFolders).toHaveBeenCalled();
  });

  it('switches view types and copies file paths', () => {
    const p = props({ fileViewType: 'list' });
    const { getByTestId } = render(<CommitDetailsPane {...p} />);
    fireEvent.click(getByTestId('gg-view-tree-btn'));
    expect(p.onChangeFileViewType).toHaveBeenCalledWith('tree');
    fireEvent.click(getByTestId('gg-view-list-btn'));
    expect(p.onChangeFileViewType).toHaveBeenCalledWith('list');
    fireEvent.click(getByTestId('gg-file-row-src/a.ts').querySelector('[title="Copy File Path"]') as HTMLElement);
    expect(p.onCopyText).toHaveBeenCalledWith('src/a.ts', 'File path');
  });

  it('shows a renamed path, staged badge, and an empty state', () => {
    const renamed = props({
      details: details({
        fileChanges: [file('new.ts', { oldPath: 'old.ts', status: 'R', staged: true })]
      })
    });
    const { container, getByText } = render(<CommitDetailsPane {...renamed} />);
    expect(container.textContent).toContain('old.ts → new.ts');
    expect(getByText('(staged)')).toBeTruthy();
    cleanup();
    const none = render(<CommitDetailsPane {...props({ details: details({ fileChanges: [] }) })} />);
    expect(none.getByText('No file changes in this commit.')).toBeTruthy();
  });

  it('selects a file and loads source when in source view', () => {
    const p = props({ selectedFilePath: null });
    const { getByTestId, container } = render(<CommitDetailsPane {...p} />);
    fireEvent.click(container.querySelector('[data-testid="gg-file-row-src/a.ts"]') as Element);
    expect(p.onSelectFile).toHaveBeenCalledWith(expect.objectContaining({ newPath: 'src/a.ts' }));
    expect(p.onLoadFileContent).not.toHaveBeenCalled();
    cleanup();
    const sel = props({ selectedFilePath: 'src/a.ts', fileDiff: null });
    const again = render(<CommitDetailsPane {...sel} />);
    fireEvent.click(again.getByTestId('gg-view-source-btn'));
    expect(sel.onLoadFileContent).toHaveBeenCalledWith('src/a.ts');
    fireEvent.click(again.container.querySelector('[data-testid="gg-file-row-src/a.ts"]') as Element);
    expect(sel.onLoadFileContent).toHaveBeenCalledTimes(2);
    expect(getByTestId).toBeDefined();
  });
});

describe('CommitDetailsPane diff and source panel', () => {
  const diffFile = {
    rawDiff: 'raw',
    isBinary: false,
    hunks: [
      {
        header: '@@ -1 +1 @@',
        lines: [
          { type: 'del', content: 'old', oldLineNumber: 1, newLineNumber: null },
          { type: 'add', content: 'new', oldLineNumber: null, newLineNumber: 1 },
          { type: 'context', content: 'same', oldLineNumber: 2, newLineNumber: 2 }
        ]
      }
    ]
  } as never;

  it('shows the placeholder when no file is selected', () => {
    const { getByText } = render(<CommitDetailsPane {...props()} />);
    expect(getByText('Select a file from the list to inspect changes.')).toBeTruthy();
  });

  it('renders the unified diff and switches diff modes', () => {
    const p = props({ selectedFilePath: 'src/a.ts', fileDiff: diffFile });
    const { getByTestId, container } = render(<CommitDetailsPane {...p} />);
    expect(getByTestId('gg-diff-unified-table')).toBeTruthy();
    expect(container.querySelector('.gg-diff-line-add')).toBeTruthy();
    expect(container.querySelector('.gg-diff-line-del')).toBeTruthy();
    fireEvent.click(getByTestId('gg-diff-split-btn'));
    expect(p.onChangeDiffViewMode).toHaveBeenCalledWith('split');
    fireEvent.click(getByTestId('gg-diff-unified-btn'));
    expect(p.onChangeDiffViewMode).toHaveBeenCalledWith('unified');
    fireEvent.click(getByTestId('gg-view-diff-btn'));
    fireEvent.click(container.querySelector('.gg-diff-toolbar .gg-btn-icon') as Element);
    expect(p.onCopyText).toHaveBeenCalledWith('raw', 'Diff');
  });

  it('renders the split diff table', () => {
    const p = props({ selectedFilePath: 'src/a.ts', fileDiff: diffFile, diffViewMode: 'split' });
    const { getByTestId } = render(<CommitDetailsPane {...p} />);
    expect(getByTestId('gg-diff-split-table')).toBeTruthy();
  });

  it('shows loading, binary, empty-hunk, and no-diff states', () => {
    const loading = render(<CommitDetailsPane {...props({ selectedFilePath: 'a', loadingDiff: true })} />);
    expect(loading.getByText('Loading diff…')).toBeTruthy();
    loading.unmount();
    const none = render(<CommitDetailsPane {...props({ selectedFilePath: 'a', fileDiff: null })} />);
    expect(none.getByText('Select a file to inspect its diff.')).toBeTruthy();
    none.unmount();
    const bin = render(
      <CommitDetailsPane {...props({ selectedFilePath: 'a', fileDiff: { isBinary: true, hunks: [], rawDiff: '' } as never })} />
    );
    expect(bin.getByText(/Binary file changed/)).toBeTruthy();
    bin.unmount();
    const emptyHunks = render(
      <CommitDetailsPane {...props({ selectedFilePath: 'a', fileDiff: { isBinary: false, hunks: [], rawDiff: '' } as never })} />
    );
    expect(emptyHunks.getByText(/No textual diff hunks/)).toBeTruthy();
  });

  it('shows the source viewer, its loading, missing, and binary states, and copies content', () => {
    const p = props({
      selectedFilePath: 'a.ts',
      fileContent: { isBinary: false, content: 'one\r\ntwo\n\nthree' } as never,
      fileDiff: { rawDiff: 'd', isBinary: false, hunks: [] } as never
    });
    const { getByTestId, container, getByTitle } = render(<CommitDetailsPane {...p} />);
    fireEvent.click(getByTestId('gg-view-source-btn'));
    expect(getByTestId('gg-source-code-table').querySelectorAll('tr').length).toBe(4);
    fireEvent.click(getByTitle('Copy file content'));
    expect(p.onCopyText).toHaveBeenCalledWith('one\r\ntwo\n\nthree', 'Source code');
    expect(container.querySelector('.gg-diff-toolbar')).toBeTruthy();
    cleanup();

    const loadingSrc = render(
      <CommitDetailsPane {...props({ selectedFilePath: 'a.ts', loadingContent: true, fileContent: null })} />
    );
    fireEvent.click(loadingSrc.getByTestId('gg-view-source-btn'));
    expect(loadingSrc.getByText('Loading source code…')).toBeTruthy();
    cleanup();

    const missing = render(<CommitDetailsPane {...props({ selectedFilePath: 'a.ts', fileContent: null })} />);
    fireEvent.click(missing.getByTestId('gg-view-source-btn'));
    expect(missing.getByText('No source code available for this file.')).toBeTruthy();
    cleanup();

    const binary = render(
      <CommitDetailsPane {...props({ selectedFilePath: 'a.ts', fileContent: { isBinary: true, content: '' } as never })} />
    );
    fireEvent.click(binary.getByTestId('gg-view-source-btn'));
    expect(binary.getByText(/Binary file — cannot display/)).toBeTruthy();
    cleanup();

    const copyEmpty = render(
      <CommitDetailsPane {...props({ selectedFilePath: 'a.ts', fileContent: null, fileDiff: null })} />
    );
    fireEvent.click(copyEmpty.getByTitle('Copy diff'));
    expect(copyEmpty.getByTestId('gg-view-diff-btn')).toBeTruthy();
  });
});

describe('CommitDetailsPane layout and resizing', () => {
  it('uses the inline layout and bottom resizer', () => {
    const { getByTestId, queryByTestId } = render(<CommitDetailsPane {...props({ inline: true })} />);
    expect(getByTestId('gg-details-bottom-resizer')).toBeTruthy();
    expect(queryByTestId('gg-details-left-resizer')).toBeNull();
  });

  it('drags the top and bottom height handles and persists the result', () => {
    const { getByTestId, container } = render(<CommitDetailsPane {...props({ inline: true })} />);
    fireEvent.mouseDown(getByTestId('gg-details-top-resizer'), { clientY: 300 });
    fireEvent.mouseMove(window, { clientY: 250 });
    fireEvent.mouseUp(window);
    expect(localStorage.getItem('zcc.gitTree.commitDetailsHeight')).not.toBeNull();
    fireEvent.mouseDown(getByTestId('gg-details-bottom-resizer'), { clientY: 300 });
    fireEvent.mouseMove(window, { clientY: 340 });
    fireEvent.mouseUp(window);
    expect(localStorage.getItem('zcc.gitTree.commitDetailsHeight')).not.toBeNull();
    fireEvent.doubleClick(getByTestId('gg-details-top-resizer'));
    expect(localStorage.getItem('zcc.gitTree.commitDetailsHeight')).toBeNull();
    expect(container.querySelector('.gg-details-pane')).toBeTruthy();
  });

  it('drags the left width handle and resets it on double click', () => {
    const { getByTestId, container } = render(<CommitDetailsPane {...props()} />);
    fireEvent.mouseDown(getByTestId('gg-details-left-resizer'), { clientX: 500 });
    fireEvent.mouseMove(window, { clientX: 400 });
    fireEvent.mouseUp(window);
    expect(localStorage.getItem('zcc.gitTree.commitDetailsWidth')).not.toBeNull();
    fireEvent.doubleClick(getByTestId('gg-details-left-resizer'));
    expect(localStorage.getItem('zcc.gitTree.commitDetailsWidth')).toBeNull();
    expect(container.querySelector('.gg-details-pane')).toBeTruthy();
  });

  it('drags the column divider and auto-fit on double click', () => {
    const { getByTestId } = render(<CommitDetailsPane {...props()} />);
    fireEvent.mouseDown(getByTestId('gg-details-col-resizer'), { clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 350 });
    fireEvent.mouseUp(window);
    expect(localStorage.getItem('zcc.gitTree.commitDetailsFilesWidth')).not.toBeNull();
    fireEvent.doubleClick(getByTestId('gg-details-col-resizer'));
    expect(localStorage.getItem('zcc.gitTree.commitDetailsFilesWidth')).toBeNull();
  });

  it('switches to the stacked layout on narrow columns and drags the row divider', () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500);
    const { getByTestId, container } = render(<CommitDetailsPane {...props()} />);
    expect(container.querySelector('.gg-details-columns.stacked')).toBeTruthy();
    fireEvent.mouseDown(getByTestId('gg-details-row-resizer'), { clientY: 200 });
    fireEvent.mouseMove(window, { clientY: 260 });
    fireEvent.mouseUp(window);
    fireEvent.doubleClick(getByTestId('gg-details-row-resizer'));
    spy.mockRestore();
  });

  it('unmounts cleanly while a drag is still in progress', () => {
    const { getByTestId, unmount } = render(<CommitDetailsPane {...props()} />);
    fireEvent.mouseDown(getByTestId('gg-details-col-resizer'), { clientX: 300 });
    expect(document.body.style.cursor).toBe('col-resize');
    unmount();
    expect(document.body.style.cursor).toBe('');
  });

  it('restores a stored pane size on mount', () => {
    localStorage.setItem('zcc.gitTree.commitDetailsHeight', '400');
    localStorage.setItem('zcc.gitTree.commitDetailsWidth', '600');
    const { getByTestId } = render(<CommitDetailsPane {...props()} />);
    expect(getByTestId('gg-details-pane').style.height).toBe('400px');
    expect(getByTestId('gg-details-pane').style.width).toBe('600px');
  });
});
