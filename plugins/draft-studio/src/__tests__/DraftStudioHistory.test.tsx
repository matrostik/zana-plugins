// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DraftStudio } from '../app/DraftStudio.tsx';
import { requestPendingStudioTab } from '../app/historyNavigation.ts';
import type { RecordedAudio, RecordingSession } from '../app/recorder.ts';
import { resetSoundCueContext } from '../app/soundCues.ts';
import {
  HISTORY_LIST_METHOD,
  HISTORY_PROJECTS_METHOD,
  REPHRASE_METHOD,
  TRANSCRIBE_METHOD,
  type HistoryEntry
} from '../shared/protocol.ts';

const fakes = vi.hoisted(() => ({
  updateText: vi.fn(),
  focus: vi.fn(),
  composerAvailable: true,
  call: vi.fn(),
  toCompose: vi.fn(),
  toProject: vi.fn(),
  toPluginPanel: vi.fn(),
  toThread: vi.fn(),
  setPluginSettings: vi.fn(async () => undefined),
  settingsValues: { showHomeWidget: true, showInProjects: true, micVisibility: 'both' } as Record<string, unknown>
}));

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  useComposer: () => {
    if (!fakes.composerAvailable) {
      throw new Error('useComposer requires an active thread');
    }
    return { updateText: fakes.updateText, focus: fakes.focus };
  },
  useComposerView: () => ({ providerId: 'assistant', familyId: 'assistant' }),
  useRpc: () => ({ call: fakes.call }),
  useSettings: () => ({ values: fakes.settingsValues, loading: false }),
  setPluginSettings: fakes.setPluginSettings,
  useRealtime: vi.fn(),
  useZccNavigate: () => ({
    toCompose: fakes.toCompose,
    toProject: fakes.toProject,
    toPluginPanel: fakes.toPluginPanel,
    toThread: fakes.toThread
  })
}));

function fakeSession(): RecordingSession {
  return {
    stop: vi.fn(async (): Promise<RecordedAudio> => ({ base64: 'YWJj', mimeType: 'audio/webm' })),
    cancel: vi.fn(() => undefined),
    getAudioLevel: vi.fn(() => 0.4)
  };
}

const storageMap = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => { storageMap.set(key, val); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); }
};

function makeRefinementEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'hist-1',
    kind: 'refinement',
    source: 'studio',
    createdAt: Date.now() - 30_000,
    projectId: 'proj-1',
    threadId: null,
    rawText: 'old raw draft from history',
    outputText: 'Polished historical output.',
    sttProvider: null,
    sttModel: null,
    llmProvider: 'openai',
    llmModel: 'gpt-5.4-nano',
    presetId: 'custom',
    tone: 'custom',
    targetLanguage: null,
    customPrompt: 'Make it punchy',
    audioDurationMs: null,
    processingDurationMs: 420,
    refineNotice: null,
    starred: false,
    ...overrides
  };
}

function setupDefaultRpc(entries: HistoryEntry[] = [makeRefinementEntry()]) {
  fakes.call.mockImplementation(async (method: string) => {
    if (method === 'draftStudio.status') {
      return { llmProvider: 'antigravity', llmModel: 'gemini-2.5-pro', sttProvider: 'system' };
    }
    if (method === 'draftStudio.availableModels') {
      return [
        {
          providerId: 'antigravity',
          displayName: 'Antigravity',
          models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }]
        },
        {
          providerId: 'openai',
          displayName: 'OpenAI',
          models: [{ id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' }]
        }
      ];
    }
    if (method === HISTORY_LIST_METHOD) {
      return {
        entries,
        total: entries.length,
        hasMore: false,
        historyEnabled: true,
        storageAvailable: true
      };
    }
    if (method === HISTORY_PROJECTS_METHOD) {
      return { projects: [{ id: 'proj-1', name: 'Workspace One' }] };
    }
    return {};
  });
}

beforeEach(() => {
  storageMap.clear();
  fakes.composerAvailable = true;
  fakes.settingsValues = { showHomeWidget: true, showInProjects: true, micVisibility: 'both' };
  Object.defineProperty(window, 'localStorage', { value: fakeLocalStorage, writable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: fakeLocalStorage, writable: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storageMap.clear();
  resetSoundCueContext();
});

describe('DraftStudio History tab integration', () => {
  it('switches between Studio and History tabs without losing the Studio draft', async () => {
    setupDefaultRpc();
    render(<DraftStudio />);

    const draftInput = screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement;
    fireEvent.change(draftInput, { target: { value: 'Draft kept across tabs' } });

    fireEvent.click(screen.getByRole('tab', { name: 'History' }));
    expect(await screen.findByTestId('ds-history-view')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Studio' }));
    expect((screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement).value).toBe('Draft kept across tabs');
  });

  it('opens directly to History via subPath="history" and responds to cross-surface tab requests', async () => {
    setupDefaultRpc();
    render(<DraftStudio subPath="history" />);
    expect(await screen.findByTestId('ds-history-view')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Studio' }));
    expect(screen.queryByTestId('ds-history-view')).toBeNull();

    act(() => {
      requestPendingStudioTab('history');
    });
    expect(await screen.findByTestId('ds-history-view')).toBeTruthy();
  });

  it('loads a refinement or coalesced dictation_cleanup entry into Studio with preset controls while preserving active provider/model', async () => {
    const coalescedEntry = makeRefinementEntry({
      kind: 'dictation_cleanup',
      sttProvider: 'system',
      audioDurationMs: 2500
    });
    setupDefaultRpc([coalescedEntry]);
    render(<DraftStudio />);

    // Wait for active provider/model to settle on Antigravity / gemini-2.5-pro
    const providerSelect = (await screen.findByRole('combobox', { name: /refinement provider/i })) as HTMLSelectElement;
    await waitFor(() => expect(providerSelect.value).toBe('antigravity'));

    fireEvent.click(screen.getByRole('tab', { name: 'History' }));
    const loadBtn = await screen.findByRole('button', { name: 'Load into Studio' });
    fireEvent.click(loadBtn);

    // Switches back to Studio with restored text & refinement controls
    expect((await screen.findByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement).value).toBe('old raw draft from history');
    expect(screen.getByDisplayValue('Polished historical output.')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: /custom instructions/i }) as HTMLTextAreaElement).value).toBe('Make it punchy');

    // Active provider/model must NOT have been overwritten by entry's historical openai/gpt-5.4-nano
    const providerAfter = screen.getByRole('combobox', { name: /refinement provider/i }) as HTMLSelectElement;
    expect(providerAfter.value).toBe('antigravity');
  });

  it('threads historyEntryId across Studio Dictate -> Refine -> Replace Input -> Refine and resets on Clear', async () => {
    let seq = 0;
    fakes.call.mockImplementation(async (method: string, args?: Record<string, unknown>) => {
      if (method === 'draftStudio.status') {
        return { llmProvider: 'assistant', llmModel: 'assistant', sttProvider: 'system', sttKeyConfigured: true };
      }
      if (method === 'draftStudio.availableModels') {
        return [{ providerId: 'assistant', displayName: 'Zana Assistant', models: [{ id: 'assistant', label: 'Default' }] }];
      }
      if (method === TRANSCRIBE_METHOD) {
        const entryId = (args?.historyEntryId as string | undefined) ?? `entry-${++seq}`;
        return {
          ok: true,
          status: 'ok',
          rawText: 'um dictated thoughts',
          text: 'um dictated thoughts',
          sttProvider: 'system',
          llmProvider: 'none',
          llmModel: null,
          historyEntryId: entryId
        };
      }
      if (method === REPHRASE_METHOD) {
        const entryId = (args?.historyEntryId as string | undefined) ?? `entry-${++seq}`;
        return {
          ok: true,
          rawText: String(args?.text ?? ''),
          text: args?.presetId === 'executive' ? '- Summarized thoughts' : 'Improved thoughts.',
          llmProvider: 'assistant',
          llmModel: 'assistant',
          durationMs: 120,
          historyEntryId: entryId
        };
      }
      return {};
    });

    render(<DraftStudio startSession={async () => fakeSession()} />);

    // 1. Dictate in Studio (creates entry-1)
    fireEvent.click(screen.getByRole('button', { name: /start dictation/i }));
    await screen.findByRole('button', { name: /stop dictation/i });
    fireEvent.click(screen.getByRole('button', { name: /stop dictation/i }));
    await waitFor(() =>
      expect((screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement).value).toBe('um dictated thoughts')
    );

    const transcribeCall = fakes.call.mock.calls.find(([m]) => m === TRANSCRIBE_METHOD)?.[1] as Record<string, unknown>;
    expect(transcribeCall.historyEntryId).toBeUndefined();

    // 2. Refine dictated draft -> passes historyEntryId: 'entry-1'
    fireEvent.click(screen.getByRole('button', { name: /improve text/i }));
    expect(await screen.findByDisplayValue('Improved thoughts.')).toBeTruthy();

    const refineCall1 = fakes.call.mock.calls.find(([m]) => m === REPHRASE_METHOD)?.[1] as Record<string, unknown>;
    expect(refineCall1.historyEntryId).toBe('entry-1');

    // 3. Move output to input & re-refine with Summarize -> STILL passes historyEntryId: 'entry-1'
    fireEvent.click(screen.getByRole('button', { name: /replace input/i }));
    fireEvent.click(screen.getByRole('radio', { name: /summarize/i }));
    fireEvent.click(screen.getByRole('button', { name: /summarize/i }));
    expect(await screen.findByDisplayValue('- Summarized thoughts')).toBeTruthy();

    const rephraseCalls = fakes.call.mock.calls.filter(([m]) => m === REPHRASE_METHOD);
    expect((rephraseCalls[1]?.[1] as Record<string, unknown>).historyEntryId).toBe('entry-1');

    // 4. Clear Studio -> starts a fresh activity (historyEntryId omitted on next Refine)
    fireEvent.click(screen.getByTitle('Clear current input and output'));
    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), { target: { value: 'brand new topic' } });
    fireEvent.click(screen.getByRole('button', { name: /improve text/i }));
    await waitFor(() => expect(fakes.call.mock.calls.filter(([m]) => m === REPHRASE_METHOD)).toHaveLength(3));

    const refineCall3 = fakes.call.mock.calls.filter(([m]) => m === REPHRASE_METHOD)[2]?.[1] as Record<string, unknown>;
    expect(refineCall3.historyEntryId).toBeUndefined();
  });

  it('asks for overwrite confirmation when loading from History into a non-empty Studio draft', async () => {
    setupDefaultRpc([makeRefinementEntry()]);
    render(<DraftStudio />);

    const draftInput = screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement;
    fireEvent.change(draftInput, { target: { value: 'Unsaved work in progress' } });

    fireEvent.click(screen.getByRole('tab', { name: 'History' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load into Studio' }));

    // Confirmation dialog appears
    expect(await screen.findByText(/replace your current studio draft/i)).toBeTruthy();

    // Cancel keeps us in History and preserves Studio draft
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText(/replace your current studio draft/i)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Studio' }));
    expect((screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement).value).toBe('Unsaved work in progress');

    // Confirm replaces draft and switches to Studio
    fireEvent.click(screen.getByRole('tab', { name: 'History' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load into Studio' }));
    fireEvent.click(await screen.findByRole('button', { name: /replace draft/i }));

    expect((await screen.findByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement).value).toBe('old raw draft from history');
    expect(screen.getByDisplayValue('Polished historical output.')).toBeTruthy();
  });

  it('inserts historical entry output into Composer (or opens Compose when no active thread)', async () => {
    fakes.composerAvailable = false;
    setupDefaultRpc([makeRefinementEntry()]);
    render(<DraftStudio subPath="history" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Insert into Composer' }));
    expect(fakes.toCompose).toHaveBeenCalledWith({
      initialPrompt: 'Polished historical output.',
      focusPrompt: true
    });
  });
});
