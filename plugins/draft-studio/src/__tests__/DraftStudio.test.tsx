// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DraftStudio, DraftStudioDetachedPlaceholder, draftStorageKey } from '../app/DraftStudio.tsx';
import type { RecordedAudio, RecordingSession } from '../app/recorder.ts';
import { resetSoundCueContext } from '../app/soundCues.ts';
import { MODELS_UPDATED_EVENT } from '../shared/protocol.ts';

const fakes = vi.hoisted(() => ({
  updateText: vi.fn(),
  focus: vi.fn(),
  composerAvailable: true,
  call: vi.fn(),
  toCompose: vi.fn(),
  toProject: vi.fn(),
  toPluginPanel: vi.fn(),
  setPluginSettings: vi.fn(async () => undefined),
  settingsValues: { showHomeWidget: true, showInProjects: true, micVisibility: 'both' } as Record<string, unknown>,
  composerView: vi.fn((): { providerId?: string; familyId?: string } => ({ providerId: 'assistant', familyId: 'assistant' })),
  realtimeHandlers: new Map<string, (payload: unknown) => void>()
}));

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  useComposer: () => {
    if (!fakes.composerAvailable) {
      throw new Error('useComposer requires an active thread');
    }
    return { updateText: fakes.updateText, focus: fakes.focus };
  },
  useComposerView: () => fakes.composerView(),
  useRpc: () => ({ call: fakes.call }),
  useSettings: () => ({ values: fakes.settingsValues, loading: false }),
  setPluginSettings: fakes.setPluginSettings,
  useRealtime: (channel: string, handler: (payload: unknown) => void) => {
    fakes.realtimeHandlers.set(channel, handler);
  },
  useZccNavigate: () => ({
    toCompose: fakes.toCompose,
    toProject: fakes.toProject,
    toPluginPanel: fakes.toPluginPanel
  })
}));

function fakeSession(): RecordingSession {
  return {
    stop: vi.fn(async (): Promise<RecordedAudio> => ({ base64: 'YWJj', mimeType: 'audio/webm' })),
    cancel: vi.fn(() => undefined),
    getAudioLevel: vi.fn(() => 0.5)
  };
}

const storageMap = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => { storageMap.set(key, val); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); }
};

beforeEach(() => {
  storageMap.clear();
  fakes.realtimeHandlers.clear();
  fakes.composerAvailable = true;
  fakes.composerView.mockReturnValue({ providerId: 'assistant', familyId: 'assistant' });
  fakes.settingsValues = { showHomeWidget: true, showInProjects: true, micVisibility: 'both' };
  fakes.setPluginSettings.mockResolvedValue(undefined);
  Object.defineProperty(window, 'localStorage', { value: fakeLocalStorage, writable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: fakeLocalStorage, writable: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storageMap.clear();
  fakes.realtimeHandlers.clear();
  resetSoundCueContext();
});

describe('DraftStudio Component', () => {
  it('returns from settings without losing the draft', async () => {
    fakes.call.mockResolvedValue({});
    render(<DraftStudio />);
    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    expect(screen.getByRole('heading', { name: /settings/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Voice & transcription' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Draft Studio' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Connections' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Local Whisper' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Zana voice' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'OpenAI' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Google Gemini' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Local Whisper (on this device)' })).toBeNull();
    expect(screen.queryByLabelText(/OpenAI API key/)).toBeNull();
    expect(screen.queryByLabelText(/Google AI API key/)).toBeNull();
    expect(screen.queryByLabelText(/Anthropic API key/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /back to studio/i }));
    expect(screen.getByDisplayValue('Keep this draft')).toBeTruthy();
  });
  it('selects a refinement style without running it until requested', async () => {
    fakes.call.mockImplementation(async (method: string) => method === 'draftStudio.rephrase'
      ? { ok: true, text: 'A summary' } : []);
    render(<DraftStudio />);
    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), { target: { value: 'A draft' } });
    fireEvent.click(screen.getByRole('radio', { name: /summarize/i }));
    expect(fakes.call.mock.calls.filter(([method]) => method === 'draftStudio.rephrase')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /summarize/i }));
    expect(await screen.findByDisplayValue('A summary')).toBeTruthy();
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.rephrase', expect.objectContaining({ tone: 'formal' }));
  });

  it('requires custom instructions and does not apply them to a preset', async () => {
    fakes.call.mockImplementation(async (method: string) => method === 'draftStudio.rephrase'
      ? { ok: true, text: 'Done' } : []);
    render(<DraftStudio />);
    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), { target: { value: 'A draft' } });
    fireEvent.click(screen.getByRole('radio', { name: /custom instructions/i }));
    const customBtn = screen.getByRole('button', { name: /run instructions/i }) as HTMLButtonElement;
    expect(customBtn.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: /custom instructions/i }), { target: { value: 'Make a poem' } });
    fireEvent.click(screen.getByRole('radio', { name: /summarize/i }));
    fireEvent.click(screen.getByRole('button', { name: /summarize/i }));
    expect(await screen.findByDisplayValue('Done')).toBeTruthy();
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.rephrase', expect.objectContaining({
      tone: 'formal',
      instruction: expect.stringContaining('Summarize')
    }));
    const payload = fakes.call.mock.calls.find(([m]) => m === 'draftStudio.rephrase')?.[1] as Record<string, unknown>;
    expect(payload.customPrompt).toBeUndefined();
  });

  it('defaults to Improve writing with Standard tone and switches among Casual, Conversational, Professional, and Technical tones via dropdown', async () => {
    fakes.call.mockImplementation(async (method: string) => method === 'draftStudio.rephrase'
      ? { ok: true, text: 'Clean English text.' } : []);
    render(<DraftStudio />);

    const improveRadio = screen.getByRole('radio', { name: /improve writing/i }) as HTMLInputElement;
    expect(improveRadio.checked).toBe(true);
    const toneSelect = screen.getByRole('combobox', { name: /improvement tone/i }) as HTMLSelectElement;
    expect(toneSelect.value).toBe('standard');

    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), { target: { value: 'helo world' } });
    fireEvent.click(screen.getByRole('button', { name: /improve text/i }));
    expect(await screen.findByDisplayValue('Clean English text.')).toBeTruthy();
    expect(fakes.call).toHaveBeenLastCalledWith('draftStudio.rephrase', expect.objectContaining({
      tone: 'standard'
    }));

    const tonePairs: Array<[string, string]> = [
      ['Casual', 'casual'],
      ['Conversational', 'conversational'],
      ['Professional', 'formal'],
      ['Technical', 'technical']
    ];
    for (const [label, expectedTone] of tonePairs) {
      expect(screen.getByRole('option', { name: label })).toBeTruthy();
      fireEvent.change(toneSelect, { target: { value: expectedTone } });
      expect(toneSelect.value).toBe(expectedTone);
      fireEvent.click(screen.getByRole('button', { name: /improve text/i }));
      await waitFor(() =>
        expect(fakes.call).toHaveBeenLastCalledWith('draftStudio.rephrase', expect.objectContaining({
          tone: expectedTone
        }))
      );
    }

    // Switching to Summarize hides the tone dropdown; switching back restores it
    fireEvent.click(screen.getByRole('radio', { name: /summarize/i }));
    expect(screen.queryByRole('combobox', { name: /improvement tone/i })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /improve writing/i }));
    const restoredToneSelect = screen.getByRole('combobox', { name: /improvement tone/i }) as HTMLSelectElement;
    expect(restoredToneSelect.value).toBe('technical');
  });

  it('migrates legacy polish and chat presets from saved drafts', () => {
    fakes.call.mockResolvedValue({});
    storageMap.set(draftStorageKey(), JSON.stringify({ selectedPresetId: 'chat' }));
    render(<DraftStudio />);
    expect((screen.getByRole('radio', { name: /improve writing/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('combobox', { name: /improvement tone/i }) as HTMLSelectElement).value).toBe('conversational');
  });

  it('places Translate as the last option with a language dropdown and sends targetLanguage', async () => {
    fakes.call.mockImplementation(async (method: string) => method === 'draftStudio.rephrase'
      ? { ok: true, text: 'Hola mundo' } : []);
    render(<DraftStudio />);

    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios[radios.length - 1]?.value).toBe('translate');
    expect(screen.queryByRole('combobox', { name: /target language/i })).toBeNull();

    fireEvent.click(radios[radios.length - 1]!);
    const langSelect = screen.getByRole('combobox', { name: /target language/i }) as HTMLSelectElement;
    expect(langSelect.value).toBe('en');
    expect(screen.queryByRole('option', { name: /detect automatically/i })).toBeNull();

    fireEvent.change(langSelect, { target: { value: 'es' } });
    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), { target: { value: 'Hello world' } });
    fireEvent.click(screen.getByRole('button', { name: /translate/i }));

    expect(await screen.findByDisplayValue('Hola mundo')).toBeTruthy();
    expect(fakes.call).toHaveBeenLastCalledWith('draftStudio.rephrase', expect.objectContaining({
      targetLanguage: 'es',
      tone: 'standard'
    }));
  });

  it('updates the primary action button label dynamically per selected mode', () => {
    fakes.call.mockResolvedValue({});
    render(<DraftStudio />);

    expect(screen.getByRole('button', { name: /improve text/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /summarize/i }));
    expect(screen.getByRole('button', { name: /summarize/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /create a technical spec/i }));
    expect(screen.getByRole('button', { name: /create spec/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /custom instructions/i }));
    expect(screen.getByRole('button', { name: /run instructions/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /translate/i }));
    expect(screen.getByRole('button', { name: /translate/i })).toBeTruthy();
  });

  it('renders vertical canvas and allows typing raw input', () => {
    fakes.call.mockResolvedValue({ llmProvider: 'assistant' });
    render(<DraftStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    expect(textarea).toBeTruthy();

    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });
    expect(screen.getAllByText(/4 words/i).length).toBeGreaterThan(0);
  });

  it('allows selecting a discovered Composer model and passes it to the server', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') {
        return { llmProvider: 'assistant', sttProvider: 'system' };
      }
      if (method === 'draftStudio.availableModels') {
        return [
          {
            providerId: 'assistant',
            displayName: 'Zana Assistant',
            models: [{ id: 'assistant', label: 'Default Assistant (Host Agent)' }]
          },
          {
            providerId: 'claude-code',
            displayName: 'Claude Code',
            models: [
              { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
              { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' }
            ]
          }
        ];
      }
      if (method === 'draftStudio.rephrase') {
        return {
          ok: true,
          rawText: 'Fix bug in auth',
          text: 'Resolve defect in authentication service using Claude Opus.',
          llmProvider: 'claude-code',
          llmModel: 'claude-opus-4-6',
          durationMs: 140
        };
      }
      return {};
    });

    render(<DraftStudio />);
    await screen.findByRole('option', { name: 'Claude Code' });

    const providerSelect = screen.getByRole('combobox', { name: /refinement provider/i });
    fireEvent.change(providerSelect, { target: { value: 'claude-code' } });

    const modelSelect = screen.getByRole('combobox', { name: /refinement model/i });
    fireEvent.change(modelSelect, { target: { value: 'claude-opus-4-6' } });

    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });

    const refineBtn = screen.getByRole('button', { name: /improve text/i });
    fireEvent.click(refineBtn);

    expect(await screen.findByText('Resolve defect in authentication service using Claude Opus.')).toBeTruthy();
    expect(fakes.call).toHaveBeenCalledWith(
      'draftStudio.rephrase',
      expect.objectContaining({
        llmProvider: 'claude-code',
        llmModel: 'claude-opus-4-6'
      })
    );
  });

  it('dynamically loads host provider models and syncs with composer even when auto-saved default exists', async () => {
    storageMap.set(
      'zcc:draft-studio:studio-draft:v1',
      JSON.stringify({ selectedProviderId: 'assistant', selectedModelId: 'assistant', userManuallySelected: false })
    );
    fakes.composerView.mockReturnValue({ providerId: 'antigravity', familyId: 'gemini' });
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.availableModels') {
        return [
          {
            providerId: 'assistant',
            displayName: 'Zana Assistant',
            models: [{ id: 'assistant', label: 'Default Assistant' }]
          },
          {
            providerId: 'antigravity',
            displayName: 'Antigravity ACP',
            models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }]
          }
        ];
      }
      if (method === 'draftStudio.status') return { llmProvider: 'assistant' };
      if (method === 'draftStudio.rephrase') {
        return {
          ok: true,
          rawText: 'Write a quick spec',
          text: 'Refined spec by Antigravity',
          llmProvider: 'antigravity',
          llmModel: 'gemini-2.5-pro',
          durationMs: 150
        };
      }
      return {};
    });

    render(<DraftStudio />);
    // Should show composer match badge
    expect(await screen.findByText(/synced to composer/i)).toBeTruthy();

    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Write a quick spec' } });

    const refineBtn = screen.getByRole('button', { name: /improve text/i });
    fireEvent.click(refineBtn);

    expect(await screen.findByText('Refined spec by Antigravity')).toBeTruthy();
    expect(fakes.call).toHaveBeenCalledWith(
      'draftStudio.rephrase',
      expect.objectContaining({
        llmProvider: 'antigravity',
        llmModel: 'gemini-2.5-pro'
      })
    );
  });

  it('updates available Refinement providers/models immediately when draftStudio:modelsUpdated realtime event arrives', async () => {
    fakes.composerView.mockReturnValue({ providerId: 'assistant', familyId: 'assistant' });
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant', sttProvider: 'system' };
      if (method === 'draftStudio.availableModels') {
        return [
          {
            providerId: 'assistant',
            displayName: 'Zana Assistant',
            models: [{ id: 'assistant', label: 'Default Assistant' }]
          }
        ];
      }
      return {};
    });

    render(<DraftStudio />);
    await waitFor(() => {
      const refreshBtn = screen.getByRole('button', { name: /refresh models/i }) as HTMLButtonElement;
      expect(refreshBtn.disabled).toBe(false);
    });
    expect(screen.getByRole('option', { name: /Zana Assistant/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Hermes ACP' })).toBeNull();

    const handler = fakes.realtimeHandlers.get(MODELS_UPDATED_EVENT);
    expect(handler).toBeTypeOf('function');

    await act(async () => {
      handler!([
        {
          providerId: 'assistant',
          displayName: 'Zana Assistant',
          models: [{ id: 'assistant', label: 'Default Assistant' }]
        },
        {
          providerId: 'hermes',
          displayName: 'Hermes ACP',
          models: [{ id: 'hermes-3', label: 'Hermes 3' }]
        }
      ]);
    });

    expect(await screen.findByRole('option', { name: 'Hermes ACP' })).toBeTruthy();
  });

  it('restores saved llmProvider and llmModel on main screen when no composer provider is active', async () => {
    fakes.composerView.mockReturnValue({});
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'antigravity', sttProvider: 'system' };
      if (method === 'draftStudio.settings.get') {
        return { llmProvider: 'antigravity', llmModel: 'gemini-3.8-flash' };
      }
      if (method === 'draftStudio.availableModels') {
        return [
          {
            providerId: 'assistant',
            displayName: 'Zana Assistant',
            models: [{ id: 'assistant', label: 'Default Assistant' }]
          },
          {
            providerId: 'antigravity',
            displayName: 'Antigravity ACP',
            models: [
              { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
              { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' }
            ]
          }
        ];
      }
      return {};
    });

    render(<DraftStudio />);
    const providerSelect = (await screen.findByRole('combobox', { name: /refinement provider/i })) as HTMLSelectElement;
    const modelSelect = screen.getByRole('combobox', { name: /refinement model/i }) as HTMLSelectElement;

    await waitFor(() => {
      expect(providerSelect.value).toBe('antigravity');
      expect(modelSelect.value).toBe('gemini-3.8-flash');
    });
  });

  it('runs a preset refinement and displays output in bottom pane', async () => {
    fakes.composerView.mockReturnValue({ providerId: 'assistant', familyId: 'assistant' });
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant' };
      if (method === 'draftStudio.availableModels') return [];
      if (method === 'draftStudio.rephrase') {
        return {
          ok: true,
          rawText: 'Fix bug in auth',
          text: 'Resolve defect in authentication service.',
          llmProvider: 'assistant',
          llmModel: 'assistant',
          durationMs: 120
        };
      }
      return {};
    });

    render(<DraftStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });

    fireEvent.click(screen.getByRole('button', { name: /improve text/i }));

    expect(await screen.findByText('Resolve defect in authentication service.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /view diff/i })).toBeTruthy();
    expect(screen.getByTitle('Copy refined text to clipboard')).toBeTruthy();
  });

  it('allows toggling diff view in output pane', async () => {
    fakes.composerView.mockReturnValue({ providerId: 'assistant', familyId: 'assistant' });
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant' };
      if (method === 'draftStudio.availableModels') return [];
      if (method === 'draftStudio.rephrase') {
        return {
          ok: true,
          rawText: 'Fix bug in auth',
          text: 'Resolve defect in authentication service.',
          llmProvider: 'assistant',
          llmModel: 'assistant',
          durationMs: 120
        };
      }
      return {};
    });

    render(<DraftStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });

    fireEvent.click(screen.getByRole('button', { name: /improve text/i }));
    const diffBtn = await screen.findByRole('button', { name: /view diff/i });
    fireEvent.click(diffBtn);

    expect(screen.getByRole('button', { name: /view clean/i })).toBeTruthy();
  });

  it('inserts into composer when button is clicked', () => {
    fakes.composerView.mockReturnValue({ providerId: 'assistant', familyId: 'assistant' });
    render(<DraftStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Ready prompt' } });

    const insertBtn = screen.getByRole('button', { name: /insert into composer/i });
    fireEvent.click(insertBtn);

    expect(fakes.updateText).toHaveBeenCalled();
    expect(fakes.focus).toHaveBeenCalled();
  });

  it('supports voice dictation into the top input', async () => {
    const session = fakeSession();
    fakes.composerView.mockReturnValue({ providerId: 'assistant', familyId: 'assistant' });
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant' };
      if (method === 'draftStudio.availableModels') return [];
      if (method === 'draftStudio.transcribe') {
        return {
          ok: true,
          status: 'ok',
          text: 'spoken voice ideas',
          rawText: 'spoken voice ideas'
        };
      }
      return {};
    });

    render(<DraftStudio startSession={async () => session} />);
    const dictateBtn = screen.getByRole('button', { name: /start dictation/i });
    fireEvent.click(dictateBtn);

    expect(await screen.findByRole('button', { name: /stop dictation/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /stop dictation/i }));
    expect(await screen.findByDisplayValue('spoken voice ideas')).toBeTruthy();
  });

  it('transcribes automatically when the recording limit is reached', async () => {
    const session = fakeSession();
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.transcribe') return { ok: true, status: 'ok', text: 'limited recording', rawText: 'limited recording' };
      return {};
    });
    render(<DraftStudio startSession={async () => session} />);
    fireEvent.click(screen.getByRole('button', { name: /start dictation/i }));
    await screen.findByRole('button', { name: /stop dictation/i });
    expect(session.onAutoStop).toBeDefined();
    await act(async () => { session.onAutoStop?.(); });
    expect(await screen.findByDisplayValue('limited recording')).toBeTruthy();
  });

  it('pastes from clipboard into the input draft', async () => {
    const mockClipboard = {
      readText: vi.fn().mockResolvedValue('Pasted instructions from clipboard'),
      writeText: vi.fn().mockResolvedValue(undefined)
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });

    render(<DraftStudio />);
    const pasteBtn = screen.getByRole('button', { name: /paste into input draft/i });
    expect(pasteBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(pasteBtn);
    });

    expect(mockClipboard.readText).toHaveBeenCalled();
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Pasted instructions from clipboard');
  });

  it('appends clipboard text to existing input draft', async () => {
    const mockClipboard = {
      readText: vi.fn().mockResolvedValue('additional points'),
      writeText: vi.fn().mockResolvedValue(undefined)
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });

    render(<DraftStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'First draft' } });

    const pasteBtn = screen.getByRole('button', { name: /paste into input draft/i });
    await act(async () => {
      fireEvent.click(pasteBtn);
    });

    expect(textarea.value).toBe('First draft additional points');
  });

  it('displays processing feedback while transcription is running', async () => {
    const session = fakeSession();
    let resolveTranscribe: (val: any) => void;
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant' };
      if (method === 'draftStudio.availableModels') return [];
      if (method === 'draftStudio.transcribe') {
        return new Promise((resolve) => {
          resolveTranscribe = resolve;
        });
      }
      return {};
    });

    render(<DraftStudio startSession={async () => session} />);
    fireEvent.click(screen.getByRole('button', { name: /start dictation/i }));
    expect(await screen.findByRole('button', { name: /stop dictation/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /stop dictation/i }));

    const transcribingBtn = await screen.findByRole('button', { name: /transcribing audio/i });
    expect(transcribingBtn).toBeTruthy();
    expect(transcribingBtn.textContent).toContain('Transcribing...');

    await act(async () => {
      resolveTranscribe({
        ok: true,
        status: 'ok',
        text: 'transcribed speech result'
      });
    });

    expect(await screen.findByDisplayValue('transcribed speech result')).toBeTruthy();
  });

  it('copies input draft to clipboard with visual feedback', async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue('')
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });

    render(<DraftStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Text to copy' } });

    const copyBtn = screen.getByRole('button', { name: /copy raw input/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(mockClipboard.writeText).toHaveBeenCalledWith('Text to copy');
    expect((await screen.findAllByText(/copied/i)).length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to execCommand when navigator.clipboard.writeText fails', async () => {
    const mockClipboard = {
      writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      readText: vi.fn().mockResolvedValue('')
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });

    const execCommandSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: execCommandSpy,
      writable: true,
      configurable: true
    });

    render(<DraftStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fallback text' } });

    const copyBtn = screen.getByRole('button', { name: /copy raw input/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(execCommandSpy).toHaveBeenCalledWith('copy');
    expect((await screen.findAllByText(/copied/i)).length).toBeGreaterThanOrEqual(1);
  });

  it('orders providers alphabetically and models from cheapest to most expensive, defaulting to cheapest', async () => {
    storageMap.set(
      'zcc:draft-studio:studio-draft:v1',
      JSON.stringify({ selectedProviderId: 'codex', selectedModelId: 'gpt-5.4-pro', userManuallySelected: false })
    );
    fakes.composerView.mockReturnValue({ providerId: 'codex', familyId: 'openai' });
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant' };
      if (method === 'draftStudio.availableModels') {
        return [
          {
            providerId: 'zed',
            displayName: 'Zed AI',
            models: [
              { id: 'z2', label: 'Zed Model B' },
              { id: 'z1', label: 'Zed Model A' }
            ]
          },
          {
            providerId: 'codex',
            displayName: 'Codex',
            models: [
              { id: 'gpt-5.4-pro', label: 'GPT-5.4 Pro' },
              { id: 'gpt-5.4', label: 'GPT-5.4' },
              { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
              { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' }
            ]
          },
          {
            providerId: 'antigravity',
            displayName: 'Antigravity ACP',
            models: [
              { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
              { id: 'ag2', label: 'Pro Model' },
              { id: 'ag1', label: 'Flash Model' }
            ]
          }
        ];
      }
      return {};
    });

    render(<DraftStudio />);
    const providerSelect = (await screen.findByRole('combobox', { name: /refinement provider/i })) as HTMLSelectElement;
    const providerOptionTexts = Array.from(providerSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(providerOptionTexts).toEqual(['Antigravity ACP', 'Codex', 'Zed AI']);

    // Synced to Codex and auto-defaults to cheapest model (GPT-5.4 Nano), overriding non-manual expensive draft
    const modelSelect = screen.getByRole('combobox', { name: /refinement model/i }) as HTMLSelectElement;
    await waitFor(() => {
      expect(providerSelect.value).toBe('codex');
      expect(modelSelect.value).toBe('gpt-5.4-nano');
    });
    const codexModelOptions = Array.from(modelSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(codexModelOptions).toEqual(['GPT-5.4 Nano', 'GPT-5.4 Mini', 'GPT-5.4', 'GPT-5.4 Pro']);

    // Switch to Antigravity ACP -> orders cheapest to most expensive and selects Flash Model
    fireEvent.change(providerSelect, { target: { value: 'antigravity' } });
    const agModelOptions = Array.from(modelSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(agModelOptions).toEqual(['Flash Model', 'Pro Model', 'Claude Opus 4.6']);
    expect(modelSelect.value).toBe('ag1');

    // Switch to Zed AI -> equal-tier models fall back to alphabetical order
    fireEvent.change(providerSelect, { target: { value: 'zed' } });
    const zedModelOptions = Array.from(modelSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(zedModelOptions).toEqual(['Zed Model A', 'Zed Model B']);
  });

  it('falls back only to Zana Assistant without hardcoded Anthropic/Google/OpenAI providers when host models are empty or fail', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant' };
      if (method === 'draftStudio.availableModels') return [];
      return {};
    });

    render(<DraftStudio />);
    const providerSelect = (await screen.findByRole('combobox', { name: /refinement provider/i })) as HTMLSelectElement;
    await waitFor(() => {
      const refreshBtn = screen.getByRole('button', { name: /refresh models/i }) as HTMLButtonElement;
      expect(refreshBtn.disabled).toBe(false);
    });
    const providerOptionTexts = Array.from(providerSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(providerOptionTexts).toEqual(['Zana Assistant']);
  });

  it('hides providers with no models and reveals them on manual refresh once models load', async () => {
    let callCount = 0;
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant' };
      if (method === 'draftStudio.availableModels') {
        callCount++;
        if (callCount === 1) {
          return [
            {
              providerId: 'assistant',
              displayName: 'Zana Assistant',
              models: [{ id: 'assistant', label: 'Default Assistant (Host Agent)' }]
            },
            {
              providerId: 'codex',
              displayName: 'Codex',
              models: [],
              error: 'Timed out loading models for Codex.'
            },
            {
              providerId: 'empty-cli',
              displayName: 'Empty CLI',
              models: []
            }
          ];
        }
        return [
          {
            providerId: 'assistant',
            displayName: 'Zana Assistant',
            models: [{ id: 'assistant', label: 'Default Assistant (Host Agent)' }]
          },
          {
            providerId: 'codex',
            displayName: 'Codex',
            models: [{ id: 'gpt-5-codex', label: 'GPT-5 Codex' }],
            error: null
          }
        ];
      }
      return {};
    });

    render(<DraftStudio />);
    await waitFor(() => {
      const refreshBtn = screen.getByRole('button', { name: /refresh models/i }) as HTMLButtonElement;
      expect(refreshBtn.disabled).toBe(false);
    });

    const providerSelect = screen.getByRole('combobox', { name: /refinement provider/i }) as HTMLSelectElement;
    expect(Array.from(providerSelect.options).map((o) => o.value)).toEqual(['assistant']);
    expect(screen.queryByRole('option', { name: /codex/i })).toBeNull();
    expect(screen.queryByRole('option', { name: /empty cli/i })).toBeNull();

    const refreshBtn = screen.getByRole('button', { name: /refresh models/i });
    fireEvent.click(refreshBtn);

    const codexOption = await screen.findByRole('option', { name: 'Codex' });
    expect(codexOption).toBeTruthy();
    fireEvent.change(providerSelect, { target: { value: 'codex' } });
    expect(await screen.findByRole('option', { name: 'GPT-5 Codex' })).toBeTruthy();
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.availableModels', { refresh: true });
  });

  it('controls dictation auto-cleanup setting directly from Draft Studio', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant' };
      if (method === 'draftStudio.availableModels') {
        return [
          {
            providerId: 'assistant',
            displayName: 'Zana Assistant',
            models: [{ id: 'assistant', label: 'Default Assistant' }]
          },
          {
            providerId: 'antigravity',
            displayName: 'Antigravity',
            models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }]
          }
        ];
      }
      if (method === 'draftStudio.settings.update') return {};
      return {};
    });

    render(<DraftStudio />);
    const cleanupToggle = (await screen.findByRole('checkbox', { name: /auto-cleanup mic dictations/i })) as HTMLInputElement;
    expect(cleanupToggle.checked).toBe(true);
    await screen.findByRole('option', { name: 'Antigravity' });

    // Toggle off
    fireEvent.click(cleanupToggle);
    expect(cleanupToggle.checked).toBe(false);
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.settings.update', {
      llmProvider: 'none',
      llmModel: ''
    });

    // Toggle back on
    fireEvent.click(cleanupToggle);
    expect(cleanupToggle.checked).toBe(true);
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.settings.update', expect.objectContaining({
      llmProvider: expect.any(String)
    }));

    // Changing provider while auto-cleanup is enabled updates settings
    const providerSelect = screen.getByRole('combobox', { name: /refinement provider/i });
    fireEvent.change(providerSelect, { target: { value: 'antigravity' } });
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.settings.update', expect.objectContaining({
      llmProvider: 'antigravity',
      llmModel: 'gemini-2.5-pro'
    }));
  });

  it('initializes auto-cleanup toggle as unchecked when server status is none', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'none' };
      if (method === 'draftStudio.availableModels') return [];
      return {};
    });

    render(<DraftStudio />);
    const cleanupToggle = (await screen.findByRole('checkbox', { name: /auto-cleanup mic dictations/i })) as HTMLInputElement;
    expect(cleanupToggle.checked).toBe(false);
  });

  it('omits unconfigured speech-to-text providers from the Speech Provider dropdown', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') {
        return {
          llmProvider: 'assistant',
          sttProvider: 'system',
          sttKeyConfigured: true,
          availableSttProviders: ['system']
        };
      }
      if (method === 'draftStudio.availableModels') return [];
      return {};
    });

    render(<DraftStudio />);
    const sttSelect = (await screen.findByRole('combobox', { name: /speech-to-text provider/i })) as HTMLSelectElement;
    await waitFor(() => expect(fakes.call).toHaveBeenCalledWith('draftStudio.status'));

    const options = Array.from(sttSelect.options).map((o) => o.textContent?.trim());
    expect(options).toEqual(['System (Zana Voice)']);
    expect(sttSelect.value).toBe('system');
    expect(screen.queryByRole('option', { name: 'OpenAI (Whisper)' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Google Gemini' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Local Whisper (on this device)' })).toBeNull();
  });

  it('configures speech-to-text provider directly from Draft Studio when providers are configured', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') {
        return {
          llmProvider: 'assistant',
          sttProvider: 'system',
          sttKeyConfigured: true,
          availableSttProviders: ['system', 'google-gemini', 'openai', 'local-whisper']
        };
      }
      if (method === 'draftStudio.availableModels') return [];
      if (method === 'draftStudio.settings.update') return {};
      return {};
    });

    render(<DraftStudio />);
    const sttSelect = (await screen.findByRole('combobox', { name: /speech-to-text provider/i })) as HTMLSelectElement;
    await screen.findByRole('option', { name: 'OpenAI (Whisper)' });

    const options = Array.from(sttSelect.options).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Google Gemini', 'Local Whisper (on this device)', 'OpenAI (Whisper)', 'System (Zana Voice)']);
    expect(sttSelect.value).toBe('system');

    // Change speech provider to openai
    fireEvent.change(sttSelect, { target: { value: 'openai' } });
    expect(sttSelect.value).toBe('openai');
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.settings.update', {
      sttProvider: 'openai'
    });

    // Model input appears when a configured API-key provider is active
    const modelInput = screen.getByRole('textbox', { name: /speech-to-text model/i }) as HTMLInputElement;
    expect(modelInput).toBeTruthy();
    fireEvent.change(modelInput, { target: { value: 'whisper-1' } });
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.settings.update', {
      sttModel: 'whisper-1'
    });
  });

  it('updates available speech providers when API keys change via modelsUpdated realtime event', async () => {
    let availableSttProviders: string[] = ['system'];
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') {
        return { llmProvider: 'assistant', sttProvider: 'system', sttKeyConfigured: true, availableSttProviders };
      }
      if (method === 'draftStudio.availableModels') return [];
      return {};
    });

    render(<DraftStudio />);
    await waitFor(() => expect(fakes.call).toHaveBeenCalledWith('draftStudio.status'));
    expect(screen.queryByRole('option', { name: 'OpenAI (Whisper)' })).toBeNull();

    availableSttProviders = ['system', 'openai'];
    const handler = fakes.realtimeHandlers.get(MODELS_UPDATED_EVENT);
    await act(async () => {
      handler?.([]);
    });

    expect(await screen.findByRole('option', { name: 'OpenAI (Whisper)' })).toBeTruthy();
  });

  it('initializes speech provider from status response', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') {
        return {
          llmProvider: 'assistant',
          sttProvider: 'google-gemini',
          sttKeyConfigured: true,
          availableSttProviders: ['system', 'google-gemini']
        };
      }
      if (method === 'draftStudio.availableModels') return [];
      return {};
    });

    render(<DraftStudio />);
    const sttSelect = (await screen.findByRole('combobox', { name: /speech-to-text provider/i })) as HTMLSelectElement;
    await waitFor(() => expect(sttSelect.value).toBe('google-gemini'));
  });

  it('offers a one-click button to switch to System STT and omits unconfigured OpenAI from options when key is missing', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') {
        return {
          llmProvider: 'assistant',
          sttProvider: 'openai',
          sttKeyConfigured: false,
          availableSttProviders: ['system']
        };
      }
      if (method === 'draftStudio.availableModels') return [];
      if (method === 'draftStudio.settings.update') return {};
      return {};
    });

    render(<DraftStudio />);
    const switchBtn = await screen.findByRole('button', { name: /switch to system \(zana voice\)/i });
    expect(switchBtn).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'OpenAI (Whisper)' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: /speech-to-text model/i })).toBeNull();

    fireEvent.click(switchBtn);
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.settings.update', {
      sttProvider: 'system'
    });
  });

  it('shows quick-action switch to System STT when dictation returns MISSING_KEY', async () => {
    const session = fakeSession();
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.status') return { llmProvider: 'assistant', sttProvider: 'google-gemini', sttKeyConfigured: true };
      if (method === 'draftStudio.availableModels') return [];
      if (method === 'draftStudio.transcribe') {
        return {
          ok: false,
          code: 'MISSING_KEY',
          message: 'Add your Google AI API key in Draft Studio settings.'
        };
      }
      if (method === 'draftStudio.settings.update') return {};
      return {};
    });

    render(<DraftStudio startSession={async () => session} />);
    fireEvent.click(screen.getByRole('button', { name: /start dictation/i }));
    fireEvent.click(await screen.findByRole('button', { name: /stop dictation/i }));

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.textContent).toContain('Add your Google AI API key');

    const switchBtn = screen.getByRole('button', { name: /switch to system \(zana voice\)/i });
    fireEvent.click(switchBtn);
    expect(fakes.call).toHaveBeenCalledWith('draftStudio.settings.update', {
      sttProvider: 'system'
    });
  });

  it('leaves only one Clear button at the bottom of the canvas (with Insert into Composer) and hides them in Settings', async () => {
    fakes.call.mockResolvedValue({});
    const { container } = render(<DraftStudio />);

    const header = container.querySelector('header.ds-header');
    expect(header).toBeTruthy();
    const clearAllBtn = screen.getByTitle('Clear current input and output');
    const insertBtn = screen.getByRole('button', { name: /insert into composer/i });

    expect(screen.queryByTitle('Clear input')).toBeNull();
    expect(screen.getAllByRole('button', { name: /clear/i })).toHaveLength(1);

    // Buttons live in the bottom action bar inside <main>, not in the header
    expect(header!.contains(clearAllBtn)).toBe(false);
    expect(header!.contains(insertBtn)).toBe(false);
    const main = container.querySelector('main.ds-editor-canvas');
    expect(main!.contains(clearAllBtn)).toBe(true);
    expect(main!.contains(insertBtn)).toBe(true);

    const resultSection = screen.getByText('Result').closest('section');
    expect(resultSection).toBeTruthy();
    expect(
      resultSection!.compareDocumentPosition(clearAllBtn) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // Opening settings hides both buttons
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    expect(screen.getByRole('heading', { name: /settings/i })).toBeTruthy();
    expect(screen.queryByTitle('Clear current input and output')).toBeNull();
    expect(screen.queryByRole('button', { name: /insert into composer/i })).toBeNull();
  });

  it('places Voice Dictation above Refinement Engine in the sidebar', () => {
    fakes.call.mockResolvedValue({});
    render(<DraftStudio />);

    const dictateBtn = screen.getByRole('button', { name: /start dictation/i });
    const refinementHeading = screen.getByText('Refinement Engine');
    const providerSelect = screen.getByRole('combobox', { name: /refinement provider/i });

    expect(
      dictateBtn.compareDocumentPosition(refinementHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      dictateBtn.compareDocumentPosition(providerSelect) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('passes saved mic deviceId to startSession and plays sound cues during dictation', async () => {
    const startOsc = vi.fn();
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => undefined);
      createOscillator = () => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: startOsc,
        stop: vi.fn()
      });
      createGain = () => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      });
    });

    try {
      const session = fakeSession();
      const startSession = vi.fn(async () => session);
      fakes.call.mockImplementation(async (method: string) => {
        if (method === 'draftStudio.settings.get') {
          return { micDeviceId: 'usb-yeti', soundCuesEnabled: 'true', soundCuesVolume: '80' };
        }
        if (method === 'draftStudio.status') return { llmProvider: 'assistant', sttProvider: 'system' };
        if (method === 'draftStudio.availableModels') return [];
        if (method === 'draftStudio.transcribe') return { ok: true, status: 'ok', text: 'hello' };
        return {};
      });

      render(<DraftStudio startSession={startSession} />);
      await waitFor(() =>
        expect(fakes.call).toHaveBeenCalledWith('draftStudio.settings.get')
      );

      fireEvent.click(screen.getByRole('button', { name: /start dictation/i }));
      await waitFor(() => expect(startSession).toHaveBeenCalledWith({ deviceId: 'usb-yeti' }));
      expect(startOsc).toHaveBeenCalled();
      expect(startOsc.mock.invocationCallOrder[0]).toBeLessThan(startSession.mock.invocationCallOrder[0]);

      fireEvent.click(await screen.findByRole('button', { name: /stop dictation/i }));
      expect(await screen.findByDisplayValue('hello')).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('plays Draft Studio stop chime only after session.stop resolves', async () => {
    const startOsc = vi.fn();
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => undefined);
      createOscillator = () => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: startOsc,
        stop: vi.fn()
      });
      createGain = () => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      });
    });
    try {
      let resolveStop!: (audio: RecordedAudio) => void;
      const session: RecordingSession = {
        stop: vi.fn(() => new Promise<RecordedAudio>((resolve) => { resolveStop = resolve; })),
        cancel: vi.fn(),
        getAudioLevel: vi.fn(() => 0.4)
      };
      fakes.call.mockImplementation(async (method: string) => {
        if (method === 'draftStudio.status') return { llmProvider: 'assistant', sttProvider: 'system' };
        if (method === 'draftStudio.availableModels') return [];
        if (method === 'draftStudio.transcribe') return { ok: true, status: 'ok', text: 'after stop' };
        return {};
      });
      render(<DraftStudio startSession={async () => session} />);
      fireEvent.click(screen.getByRole('button', { name: /start dictation/i }));
      const stopBtn = await screen.findByRole('button', { name: /stop dictation/i });
      const callsBeforeStop = startOsc.mock.calls.length;

      fireEvent.click(stopBtn);
      await waitFor(() => expect(session.stop).toHaveBeenCalledTimes(1));
      expect(startOsc.mock.calls.length).toBe(callsBeforeStop);

      resolveStop({ base64: 'YWJj', mimeType: 'audio/webm' });
      expect(await screen.findByDisplayValue('after stop')).toBeTruthy();
      expect(startOsc.mock.calls.length).toBeGreaterThan(callsBeforeStop);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renders Project badge and host headerActions when hosted inside a project', () => {
    fakes.call.mockResolvedValue({});
    render(
      <DraftStudio
        pluginId="draft-studio"
        projectId="proj-1"
        headerActions={<button type="button">Pop out</button>}
      />
    );

    expect(screen.getByText('Project')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pop out' })).toBeTruthy();
  });

  it('isolates localStorage drafts per projectId without overwriting existing drafts', () => {
    fakes.call.mockResolvedValue({});
    storageMap.set(draftStorageKey('proj-a'), JSON.stringify({ inputText: 'Alpha project prompt', outputText: '' }));
    storageMap.set(draftStorageKey('proj-b'), JSON.stringify({ inputText: 'Beta project prompt', outputText: '' }));

    const view = render(<DraftStudio projectId="proj-a" />);
    expect((screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement).value).toBe('Alpha project prompt');

    const writes = vi.spyOn(localStorage, 'setItem');
    view.rerender(<DraftStudio projectId="proj-b" />);
    expect((screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement).value).toBe('Beta project prompt');
    expect(writes.mock.calls.filter(([key, value]) => key === draftStorageKey('proj-b') && JSON.parse(value).inputText === 'Alpha project prompt')).toHaveLength(0);
    writes.mockRestore();

    // Switching back verifies proj-a draft was not overwritten by proj-b during switch
    view.rerender(<DraftStudio projectId="proj-a" />);
    expect((screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement).value).toBe('Alpha project prompt');
  });

  it('shows hidden-in-projects notice when showInProjects is false and re-enables via plugin settings', async () => {
    fakes.settingsValues = { showHomeWidget: true, showInProjects: false, micVisibility: 'both' };
    fakes.call.mockResolvedValue({});

    render(<DraftStudio pluginId="draft-studio" projectId="proj-1" />);
    expect(screen.getByTestId('ds-project-hidden-notice')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /enable draft studio in projects/i }));
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('draft-studio', { showInProjects: true })
    );
  });

  it('falls back to navigate.toCompose when inserting without an active thread composer', () => {
    fakes.composerAvailable = false;
    fakes.call.mockResolvedValue({});

    render(<DraftStudio projectId="proj-1" />);
    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), {
      target: { value: 'New thread from project studio' }
    });
    fireEvent.click(screen.getByRole('button', { name: /insert into composer/i }));

    expect(fakes.toCompose).toHaveBeenCalledWith({
      initialPrompt: 'New thread from project studio',
      focusPrompt: true
    });
  });

  it('renders surface visibility controls in StudioSettings when pluginId is supplied', () => {
    fakes.call.mockResolvedValue({});
    render(<DraftStudio pluginId="draft-studio" />);

    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    expect(screen.getByRole('heading', { name: 'Where Draft Studio Appears' })).toBeTruthy();
  });

  it('renders DraftStudioDetachedPlaceholder with Focus Window and Bring Back actions', () => {
    const focusWindow = vi.fn();
    const bringBack = vi.fn();

    render(
      <DraftStudioDetachedPlaceholder
        pluginId="draft-studio"
        projectId="proj-1"
        focusWindow={focusWindow}
        bringBack={bringBack}
      />
    );
    expect(screen.getByTestId('ds-detached-placeholder')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Focus Window' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bring Back' }));
    expect(focusWindow).toHaveBeenCalledTimes(1);
    expect(bringBack).toHaveBeenCalledTimes(1);
  });

  it('reloads available models when returning from StudioSettings', async () => {
    let modelsCall = 0;
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'draftStudio.availableModels') {
        modelsCall++;
        if (modelsCall === 1) {
          return [{ providerId: 'assistant', displayName: 'Zana Assistant', models: [{ id: 'assistant', label: 'Default' }] }];
        }
        return [
          { providerId: 'assistant', displayName: 'Zana Assistant', models: [{ id: 'assistant', label: 'Default' }] },
          { providerId: 'openai', displayName: 'OpenAI', models: [{ id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' }] }
        ];
      }
      return {};
    });
    render(<DraftStudio pluginId="draft-studio" />);
    await waitFor(() => expect(modelsCall).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to studio/i }));
    expect(await screen.findByRole('option', { name: 'OpenAI' })).toBeTruthy();
  });
});
