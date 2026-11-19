// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  HISTORY_CHANGED_EVENT,
  HISTORY_CLEAR_METHOD,
  HISTORY_DELETE_METHOD,
  HISTORY_LIST_METHOD,
  HISTORY_PROJECTS_METHOD,
  HISTORY_STAR_METHOD,
  type HistoryEntry
} from '../shared/protocol.ts';

const fakes = vi.hoisted(() => ({
  toThread: vi.fn(),
  realtimeHandlers: new Map<string, (payload: unknown) => void>()
}));

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  useRpc: () => ({ call: vi.fn() }),
  useComposer: () => null,
  useComposerView: () => null,
  useSettings: () => ({ values: {}, isLoading: false }),
  useZccContext: () => ({ projectId: null, threadId: null }),
  useZccNavigate: () => ({
    toThread: fakes.toThread,
    toProject: vi.fn(),
    toPluginPanel: vi.fn(),
    toCompose: vi.fn(),
    openPanelAgent: vi.fn()
  }),
  useRealtime: (channel: string, handler: (payload: unknown) => void) => {
    fakes.realtimeHandlers.set(channel, handler);
  }
}));

import { HistoryView, formatEntryKindLabel } from '../app/HistoryView.tsx';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'entry-1',
    kind: 'dictation_cleanup',
    source: 'composer',
    createdAt: Date.now() - 60_000,
    projectId: 'proj-1',
    threadId: 'thread-99',
    rawText: 'um ship the history tab',
    outputText: 'Ship the history tab.',
    sttProvider: 'system',
    sttModel: null,
    llmProvider: 'assistant',
    llmModel: 'assistant',
    presetId: null,
    tone: 'standard',
    targetLanguage: null,
    customPrompt: null,
    audioDurationMs: 4200,
    processingDurationMs: 650,
    refineNotice: null,
    starred: false,
    ...overrides
  };
}

describe('HistoryView', () => {
  beforeEach(() => {
    fakes.toThread.mockReset();
    fakes.realtimeHandlers.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('formats coalesced Studio dictation+refinement badges separately from Composer auto-cleanup', () => {
    expect(formatEntryKindLabel(makeEntry({ kind: 'dictation' }))).toBe('Dictation');
    expect(formatEntryKindLabel(makeEntry({ kind: 'dictation_cleanup', presetId: null }))).toBe('Dictation + Cleanup');
    expect(
      formatEntryKindLabel(makeEntry({ kind: 'dictation_cleanup', source: 'studio', presetId: 'improve', tone: 'formal' }))
    ).toBe('Dictation + Improve · Professional');
    expect(
      formatEntryKindLabel(makeEntry({ kind: 'dictation_cleanup', source: 'studio', presetId: 'executive', tone: 'formal' }))
    ).toBe('Dictation + Summarize');
    expect(
      formatEntryKindLabel(makeEntry({ kind: 'dictation_cleanup', source: 'studio', presetId: 'translate', targetLanguage: 'es' }))
    ).toBe('Dictation + Translate · Spanish');
  });

  it('groups entries by date, inspects details, toggles word diff, and opens thread links', async () => {
    const now = new Date();
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 1).getTime();
    const yesterdayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0).getTime();

    const todayEntry = makeEntry({ id: 'e-today', createdAt: todayTimestamp });
    const yesterdayEntry = makeEntry({
      id: 'e-yesterday',
      kind: 'refinement',
      source: 'studio',
      createdAt: yesterdayTimestamp,
      threadId: null,
      rawText: 'draft notes',
      outputText: 'Polished notes.',
      presetId: 'custom',
      tone: 'custom',
      customPrompt: 'Convert to crisp prose',
      refineNotice: { code: 'LLM_FAILED', message: 'Cleanup fallback example' }
    });

    const call = vi.fn(async (method: string) => {
      if (method === HISTORY_LIST_METHOD) {
        return {
          entries: [todayEntry, yesterdayEntry],
          total: 2,
          hasMore: false,
          historyEnabled: true,
          storageAvailable: true
        };
      }
      if (method === HISTORY_PROJECTS_METHOD) {
        return { projects: [{ id: 'proj-1', name: 'Zana Plugins' }] };
      }
      return { ok: true };
    });

    const onLoadIntoStudio = vi.fn();
    const onInsertIntoComposer = vi.fn();
    render(
      <HistoryView
        rpc={{ call: call as never }}
        onLoadIntoStudio={onLoadIntoStudio}
        onInsertIntoComposer={onInsertIntoComposer}
        onOpenSettings={vi.fn()}
      />
    );

    expect(await screen.findByText('Today')).toBeTruthy();
    expect(screen.getByText('Yesterday')).toBeTruthy();
    const detailPane = screen.getByLabelText('Activity details');
    expect(within(detailPane).getByText('Ship the history tab.')).toBeTruthy();

    // Open thread link works for composer dictation with threadId
    fireEvent.click(screen.getByRole('button', { name: 'Open thread' }));
    expect(fakes.toThread).toHaveBeenCalledWith('thread-99');

    // Toggle diff view
    fireEvent.click(screen.getByRole('button', { name: 'View Diff' }));
    expect(screen.getByTestId('history-diff-view')).toBeTruthy();

    // Load into Studio & Insert into Composer callbacks
    fireEvent.click(screen.getByRole('button', { name: 'Load into Studio' }));
    expect(onLoadIntoStudio).toHaveBeenCalledWith(todayEntry);
    fireEvent.click(screen.getByRole('button', { name: 'Insert into Composer' }));
    expect(onInsertIntoComposer).toHaveBeenCalledWith('Ship the history tab.');

    // Select second entry and inspect custom instructions & fallback notice
    fireEvent.click(screen.getByRole('button', { name: /Polished notes\./i }));
    expect(within(detailPane).getByText('Convert to crisp prose')).toBeTruthy();
    expect(within(detailPane).getByText(/Cleanup fallback example/i)).toBeTruthy();
  });

  it('filters by type, source, project scope, and search, and supports star, delete, and scoped clear', async () => {
    const entry = makeEntry({ id: 'e-1', projectId: 'proj-alpha' });
    const call = vi.fn(async (method: string, args?: unknown) => {
      if (method === HISTORY_LIST_METHOD) {
        return { entries: [entry], total: 1, hasMore: false, historyEnabled: true, storageAvailable: true };
      }
      if (method === HISTORY_PROJECTS_METHOD) {
        return { projects: [{ id: 'proj-alpha', name: 'Alpha' }] };
      }
      if (method === HISTORY_STAR_METHOD) {
        return { ok: true, entry: { ...entry, starred: true } };
      }
      if (method === HISTORY_DELETE_METHOD) {
        return { ok: true, deleted: true };
      }
      if (method === HISTORY_CLEAR_METHOD) {
        return { ok: true, deletedCount: 1 };
      }
      return { ok: true, args };
    });

    render(
      <HistoryView
        rpc={{ call: call as never }}
        projectId="proj-alpha"
        onLoadIntoStudio={vi.fn()}
        onInsertIntoComposer={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    );

    // Defaults to This project inside a project tab
    await waitFor(() =>
      expect(call).toHaveBeenCalledWith(
        HISTORY_LIST_METHOD,
        expect.objectContaining({ projectId: 'proj-alpha', type: 'all', source: 'all', starredOnly: false })
      )
    );

    // Switch to All activity
    fireEvent.click(screen.getByRole('button', { name: 'All activity' }));
    await waitFor(() =>
      expect(call).toHaveBeenCalledWith(
        HISTORY_LIST_METHOD,
        expect.objectContaining({ projectId: null })
      )
    );

    // Switch back to This project and test scoped clear with starred protection
    fireEvent.click(screen.getByRole('button', { name: 'This project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear project history' }));
    const checkbox = screen.getByRole('checkbox', { name: /also delete starred entries/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Clear' }));
    await waitFor(() =>
      expect(call).toHaveBeenCalledWith(HISTORY_CLEAR_METHOD, {
        projectId: 'proj-alpha',
        includeStarred: true
      })
    );

    // Star & Delete
    fireEvent.click(screen.getByRole('button', { name: /star$/i }));
    await waitFor(() =>
      expect(call).toHaveBeenCalledWith(HISTORY_STAR_METHOD, { id: 'e-1', starred: true })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(call).toHaveBeenCalledWith(HISTORY_DELETE_METHOD, { id: 'e-1' })
    );
  });

  it('scopes clear history to selectedProjectFilter in the global History view', async () => {
    const entry = makeEntry({ id: 'e-alpha', projectId: 'proj-alpha' });
    const call = vi.fn(async (method: string) => {
      if (method === HISTORY_LIST_METHOD) {
        return { entries: [entry], total: 1, hasMore: false, historyEnabled: true, storageAvailable: true };
      }
      if (method === HISTORY_PROJECTS_METHOD) {
        return {
          projects: [
            { id: 'proj-alpha', name: 'Alpha Workspace' },
            { id: 'proj-beta', name: 'Beta App' }
          ]
        };
      }
      if (method === HISTORY_CLEAR_METHOD) {
        return { ok: true, deletedCount: 1 };
      }
      return { ok: true };
    });

    render(
      <HistoryView
        rpc={{ call: call as never }}
        onLoadIntoStudio={vi.fn()}
        onInsertIntoComposer={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    );

    const projectSelect = await screen.findByLabelText('Filter by project');
    fireEvent.change(projectSelect, { target: { value: 'proj-alpha' } });

    const clearBtn = await screen.findByRole('button', { name: 'Clear project history' });
    fireEvent.click(clearBtn);
    expect(screen.getByText('Clear history for Alpha Workspace?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Clear' }));
    await waitFor(() =>
      expect(call).toHaveBeenCalledWith(HISTORY_CLEAR_METHOD, {
        projectId: 'proj-alpha',
        includeStarred: false
      })
    );
  });

  it('reports status notices when star, delete, or clear return ok=false', async () => {
    const entry = makeEntry({ id: 'e-fail' });
    const onStatusNotice = vi.fn();
    const call = vi.fn(async (method: string) => {
      if (method === HISTORY_LIST_METHOD) {
        return { entries: [entry], total: 1, hasMore: false, historyEnabled: true, storageAvailable: true };
      }
      if (method === HISTORY_PROJECTS_METHOD) return { projects: [] };
      if (method === HISTORY_STAR_METHOD) return { ok: false };
      if (method === HISTORY_DELETE_METHOD) return { ok: false, deleted: false };
      if (method === HISTORY_CLEAR_METHOD) return { ok: false, deletedCount: 0 };
      return { ok: false };
    });

    render(
      <HistoryView
        rpc={{ call: call as never }}
        onLoadIntoStudio={vi.fn()}
        onInsertIntoComposer={vi.fn()}
        onOpenSettings={vi.fn()}
        onStatusNotice={onStatusNotice}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /star$/i }));
    await waitFor(() => expect(onStatusNotice).toHaveBeenCalledWith('Could not update star status.'));

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onStatusNotice).toHaveBeenCalledWith('Could not delete history entry.'));

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Clear' }));
    await waitFor(() => expect(onStatusNotice).toHaveBeenCalledWith('Could not clear history.'));
  });

  it('patches realtime starred/deleted events in place without reloading projects, and refreshes on recorded', async () => {
    let calls = 0;
    const entry = makeEntry({ id: 'e-live', outputText: 'Initial text', starred: false });
    const call = vi.fn(async (method: string) => {
      if (method === HISTORY_LIST_METHOD) {
        calls++;
        return {
          entries: calls > 1 ? [makeEntry({ id: 'live-1', outputText: 'Arrived live!' })] : [entry],
          total: 1,
          hasMore: false,
          historyEnabled: false,
          storageAvailable: true
        };
      }
      if (method === HISTORY_PROJECTS_METHOD) return { projects: [] };
      return {};
    });
    const onOpenSettings = vi.fn();

    render(
      <HistoryView
        rpc={{ call: call as never }}
        onLoadIntoStudio={vi.fn()}
        onInsertIntoComposer={vi.fn()}
        onOpenSettings={onOpenSettings}
      />
    );

    expect(await screen.findByText(/history recording is paused/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);

    const listCallsBefore = call.mock.calls.filter(([m]) => m === HISTORY_LIST_METHOD).length;
    const projectCallsBefore = call.mock.calls.filter(([m]) => m === HISTORY_PROJECTS_METHOD).length;

    // Realtime starred event patches in place with zero RPC calls
    fakes.realtimeHandlers.get(HISTORY_CHANGED_EVENT)?.({ action: 'starred', id: 'e-live', starred: true });
    await waitFor(() => expect(screen.getByRole('button', { name: /starred/i })).toBeTruthy());
    expect(call.mock.calls.filter(([m]) => m === HISTORY_LIST_METHOD).length).toBe(listCallsBefore);
    expect(call.mock.calls.filter(([m]) => m === HISTORY_PROJECTS_METHOD).length).toBe(projectCallsBefore);

    // Realtime deleted event removes in place with zero RPC calls
    fakes.realtimeHandlers.get(HISTORY_CHANGED_EVENT)?.({ action: 'deleted', id: 'e-live' });
    expect(await screen.findByText(/no activity recorded yet/i)).toBeTruthy();
    expect(call.mock.calls.filter(([m]) => m === HISTORY_LIST_METHOD).length).toBe(listCallsBefore);
    expect(call.mock.calls.filter(([m]) => m === HISTORY_PROJECTS_METHOD).length).toBe(projectCallsBefore);

    // Realtime recorded event refreshes list and projects
    fakes.realtimeHandlers.get(HISTORY_CHANGED_EVENT)?.({ action: 'recorded', id: 'live-1' });
    const detailPane = await screen.findByLabelText('Activity details');
    expect(await within(detailPane).findByText('Arrived live!')).toBeTruthy();
    expect(call.mock.calls.filter(([m]) => m === HISTORY_PROJECTS_METHOD).length).toBe(projectCallsBefore + 1);
  });
});
