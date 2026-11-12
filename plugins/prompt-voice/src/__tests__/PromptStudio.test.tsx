// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PromptStudio } from '../app/PromptStudio.tsx';
import type { RecordedAudio, RecordingSession } from '../app/recorder.ts';

const fakes = vi.hoisted(() => ({
  updateText: vi.fn(),
  focus: vi.fn(),
  call: vi.fn(),
  composerView: vi.fn(() => ({ providerId: 'assistant', familyId: 'assistant' }))
}));

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  useComposer: () => ({ updateText: fakes.updateText, focus: fakes.focus }),
  useComposerView: () => fakes.composerView(),
  useRpc: () => ({ call: fakes.call }),
  useZccNavigate: () => vi.fn()
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
  Object.defineProperty(window, 'localStorage', { value: fakeLocalStorage, writable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: fakeLocalStorage, writable: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storageMap.clear();
});

describe('PromptStudio Component', () => {
  it('returns from settings without losing the draft', async () => {
    fakes.call.mockResolvedValue({});
    render(<PromptStudio />);
    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    expect(screen.getByRole('heading', { name: /settings/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Voice & transcription' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Prompt Voice' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Connections' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Local Whisper' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Local Whisper (on this device)' })).toBeTruthy();
    expect(screen.queryByLabelText(/OpenAI API key/)).toBeNull();
    expect(screen.queryByLabelText(/Google AI API key/)).toBeNull();
    expect(screen.queryByLabelText(/Anthropic API key/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /back to studio/i }));
    expect(screen.getByDisplayValue('Keep this draft')).toBeTruthy();
  });
  it('selects a refinement style without running it until requested', async () => {
    fakes.call.mockImplementation(async (method: string) => method === 'promptVoice.rephrase'
      ? { ok: true, text: 'A summary' } : []);
    render(<PromptStudio />);
    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), { target: { value: 'A draft' } });
    fireEvent.click(screen.getByRole('radio', { name: /summarize/i }));
    expect(fakes.call.mock.calls.filter(([method]) => method === 'promptVoice.rephrase')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /refine text/i }));
    expect(await screen.findByDisplayValue('A summary')).toBeTruthy();
    expect(fakes.call).toHaveBeenCalledWith('promptVoice.rephrase', expect.objectContaining({ tone: 'formal' }));
  });

  it('requires custom instructions and does not apply them to a preset', async () => {
    fakes.call.mockImplementation(async (method: string) => method === 'promptVoice.rephrase'
      ? { ok: true, text: 'Done' } : []);
    render(<PromptStudio />);
    fireEvent.change(screen.getByPlaceholderText(/type your raw thoughts/i), { target: { value: 'A draft' } });
    fireEvent.click(screen.getByRole('radio', { name: /custom instructions/i }));
    const refine = screen.getByRole('button', { name: /refine text/i }) as HTMLButtonElement;
    expect(refine.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: /custom instructions/i }), { target: { value: 'Make a poem' } });
    fireEvent.click(screen.getByRole('radio', { name: /summarize/i }));
    fireEvent.click(refine);
    expect(await screen.findByDisplayValue('Done')).toBeTruthy();
    expect(fakes.call).toHaveBeenCalledWith('promptVoice.rephrase', expect.objectContaining({
      tone: 'formal', customPrompt: expect.not.stringContaining('Make a poem')
    }));
  });

  it('renders vertical canvas and allows typing raw input', () => {
    fakes.call.mockResolvedValue({ llmProvider: 'assistant' });
    render(<PromptStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    expect(textarea).toBeTruthy();

    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });
    expect(screen.getAllByText(/4 words/i).length).toBeGreaterThan(0);
  });

  it('allows selecting an LLM refinement model and passes it to the server', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') {
        return { llmProvider: 'assistant', sttProvider: 'system' };
      }
      if (method === 'promptVoice.availableModels') {
        return [];
      }
      if (method === 'promptVoice.rephrase') {
        return {
          ok: true,
          rawText: 'Fix bug in auth',
          text: 'Resolve defect in authentication service using GPT-5.6.',
          llmProvider: 'openai',
          llmModel: 'gpt-5.6-luna',
          durationMs: 140
        };
      }
      return {};
    });

    render(<PromptStudio />);
    const providerSelect = screen.getByRole('combobox', { name: /refinement provider/i });
    expect(providerSelect).toBeTruthy();
    fireEvent.change(providerSelect, { target: { value: 'openai' } });

    const modelSelect = screen.getByRole('combobox', { name: /refinement model/i });
    expect(modelSelect).toBeTruthy();
    fireEvent.change(modelSelect, { target: { value: 'openai-smart' } });

    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });

    const refineBtn = screen.getByRole('button', { name: /refine text/i });
    fireEvent.click(refineBtn);

    expect(await screen.findByText('Resolve defect in authentication service using GPT-5.6.')).toBeTruthy();
    expect(fakes.call).toHaveBeenCalledWith(
      'promptVoice.rephrase',
      expect.objectContaining({
        llmProvider: 'openai',
        llmModel: 'gpt-5.6-luna'
      })
    );
  });

  it('dynamically loads host provider models and syncs with composer', async () => {
    fakes.composerView.mockReturnValue({ providerId: 'antigravity', familyId: 'gemini' });
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.availableModels') {
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
      if (method === 'promptVoice.status') return { llmProvider: 'assistant' };
      if (method === 'promptVoice.rephrase') {
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

    render(<PromptStudio />);
    // Should show composer match badge
    expect(await screen.findByText(/synced to composer/i)).toBeTruthy();

    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Write a quick spec' } });

    const refineBtn = screen.getByRole('button', { name: /refine text/i });
    fireEvent.click(refineBtn);

    expect(await screen.findByText('Refined spec by Antigravity')).toBeTruthy();
    expect(fakes.call).toHaveBeenCalledWith(
      'promptVoice.rephrase',
      expect.objectContaining({
        llmProvider: 'antigravity',
        llmModel: 'gemini-2.5-pro'
      })
    );
  });

  it('runs a preset refinement and displays output in bottom pane', async () => {
    fakes.composerView.mockReturnValue({ providerId: 'assistant', familyId: 'assistant' });
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'assistant' };
      if (method === 'promptVoice.availableModels') return [];
      if (method === 'promptVoice.rephrase') {
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

    render(<PromptStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });

    fireEvent.click(screen.getByRole('button', { name: /refine text/i }));

    expect(await screen.findByText('Resolve defect in authentication service.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /view diff/i })).toBeTruthy();
    expect(screen.getByTitle('Copy refined text to clipboard')).toBeTruthy();
  });

  it('allows toggling diff view in output pane', async () => {
    fakes.composerView.mockReturnValue({ providerId: 'assistant', familyId: 'assistant' });
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'assistant' };
      if (method === 'promptVoice.availableModels') return [];
      if (method === 'promptVoice.rephrase') {
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

    render(<PromptStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });

    fireEvent.click(screen.getByRole('button', { name: /refine text/i }));
    const diffBtn = await screen.findByRole('button', { name: /view diff/i });
    fireEvent.click(diffBtn);

    expect(screen.getByRole('button', { name: /view clean/i })).toBeTruthy();
  });

  it('inserts into composer when button is clicked', () => {
    fakes.composerView.mockReturnValue({ providerId: 'assistant', familyId: 'assistant' });
    render(<PromptStudio />);
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
      if (method === 'promptVoice.status') return { llmProvider: 'assistant' };
      if (method === 'promptVoice.availableModels') return [];
      if (method === 'promptVoice.transcribe') {
        return {
          ok: true,
          status: 'ok',
          text: 'spoken voice ideas',
          rawText: 'spoken voice ideas'
        };
      }
      return {};
    });

    render(<PromptStudio startSession={async () => session} />);
    const dictateBtn = screen.getByRole('button', { name: /start dictation/i });
    fireEvent.click(dictateBtn);

    expect(await screen.findByRole('button', { name: /stop dictation/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /stop dictation/i }));
    expect(await screen.findByDisplayValue('spoken voice ideas')).toBeTruthy();
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

    render(<PromptStudio />);
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

    render(<PromptStudio />);
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
      if (method === 'promptVoice.status') return { llmProvider: 'assistant' };
      if (method === 'promptVoice.availableModels') return [];
      if (method === 'promptVoice.transcribe') {
        return new Promise((resolve) => {
          resolveTranscribe = resolve;
        });
      }
      return {};
    });

    render(<PromptStudio startSession={async () => session} />);
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

    render(<PromptStudio />);
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

    render(<PromptStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fallback text' } });

    const copyBtn = screen.getByRole('button', { name: /copy raw input/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(execCommandSpy).toHaveBeenCalledWith('copy');
    expect((await screen.findAllByText(/copied/i)).length).toBeGreaterThanOrEqual(1);
  });

  it('orders providers and models alphabetically by ABC in selector dropdowns', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'assistant' };
      if (method === 'promptVoice.availableModels') {
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
            providerId: 'antigravity',
            displayName: 'Antigravity ACP',
            models: [
              { id: 'ag2', label: 'Pro Model' },
              { id: 'ag1', label: 'Flash Model' }
            ]
          }
        ];
      }
      return {};
    });

    render(<PromptStudio />);
    const providerSelect = (await screen.findByRole('combobox', { name: /refinement provider/i })) as HTMLSelectElement;
    const providerOptionTexts = Array.from(providerSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(providerOptionTexts).toEqual(['Antigravity ACP', 'Zed AI']);

    // Check models for Antigravity ACP (first provider)
    const modelSelect = screen.getByRole('combobox', { name: /refinement model/i }) as HTMLSelectElement;
    const modelOptionTexts = Array.from(modelSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(modelOptionTexts).toEqual(['Flash Model', 'Pro Model']);

    // Switch to Zed AI
    fireEvent.change(providerSelect, { target: { value: 'zed' } });
    const zedModelOptions = Array.from(modelSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(zedModelOptions).toEqual(['Zed Model A', 'Zed Model B']);
  });

  it('orders fallback providers and models alphabetically by ABC when host models are empty', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'assistant' };
      if (method === 'promptVoice.availableModels') return [];
      return {};
    });

    render(<PromptStudio />);
    const providerSelect = (await screen.findByRole('combobox', { name: /refinement provider/i })) as HTMLSelectElement;
    const providerOptionTexts = Array.from(providerSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(providerOptionTexts).toEqual(['Anthropic', 'Google Gemini', 'OpenAI', 'Zana Assistant']);

    // Check models for Anthropic
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } });
    const modelSelect = screen.getByRole('combobox', { name: /refinement model/i }) as HTMLSelectElement;
    const anthropicModelTexts = Array.from(modelSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(anthropicModelTexts).toEqual(['Claude 4.5 Haiku', 'Claude 5 Sonnet']);

    // Check models for OpenAI
    fireEvent.change(providerSelect, { target: { value: 'openai' } });
    const openaiModelTexts = Array.from(modelSelect.options).map((o) => o.textContent?.trim().replace(/ ★.*$/, ''));
    expect(openaiModelTexts).toEqual(['GPT-5.4 Nano (Fast)', 'GPT-5.6 Luna (Smart)']);
  });

  it('controls dictation auto-cleanup setting directly from Prompt Studio', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'assistant' };
      if (method === 'promptVoice.availableModels') return [];
      if (method === 'promptVoice.settings.update') return {};
      return {};
    });

    render(<PromptStudio />);
    const cleanupToggle = (await screen.findByRole('checkbox', { name: /auto-cleanup mic dictations/i })) as HTMLInputElement;
    expect(cleanupToggle.checked).toBe(true);

    // Toggle off
    fireEvent.click(cleanupToggle);
    expect(cleanupToggle.checked).toBe(false);
    expect(fakes.call).toHaveBeenCalledWith('promptVoice.settings.update', {
      llmProvider: 'none',
      llmModel: ''
    });

    // Toggle back on
    fireEvent.click(cleanupToggle);
    expect(cleanupToggle.checked).toBe(true);
    expect(fakes.call).toHaveBeenCalledWith('promptVoice.settings.update', expect.objectContaining({
      llmProvider: expect.any(String)
    }));

    // Changing provider while auto-cleanup is enabled updates settings
    const providerSelect = screen.getByRole('combobox', { name: /refinement provider/i });
    fireEvent.change(providerSelect, { target: { value: 'openai' } });
    expect(fakes.call).toHaveBeenCalledWith('promptVoice.settings.update', expect.objectContaining({
      llmProvider: 'openai'
    }));
  });

  it('initializes auto-cleanup toggle as unchecked when server status is none', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'none' };
      if (method === 'promptVoice.availableModels') return [];
      return {};
    });

    render(<PromptStudio />);
    const cleanupToggle = (await screen.findByRole('checkbox', { name: /auto-cleanup mic dictations/i })) as HTMLInputElement;
    expect(cleanupToggle.checked).toBe(false);
  });

  it('configures speech-to-text provider directly from Prompt Studio', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'assistant', sttProvider: 'system' };
      if (method === 'promptVoice.availableModels') return [];
      if (method === 'promptVoice.settings.update') return {};
      return {};
    });

    render(<PromptStudio />);
    const sttSelect = (await screen.findByRole('combobox', { name: /speech-to-text provider/i })) as HTMLSelectElement;
    expect(sttSelect).toBeTruthy();

    const options = Array.from(sttSelect.options).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Google Gemini', 'Local Whisper (on this device)', 'OpenAI (Whisper)', 'System (Zana Voice)']);
    expect(sttSelect.value).toBe('system');

    // Change speech provider to openai
    fireEvent.change(sttSelect, { target: { value: 'openai' } });
    expect(sttSelect.value).toBe('openai');
    expect(fakes.call).toHaveBeenCalledWith('promptVoice.settings.update', {
      sttProvider: 'openai'
    });

    // Model input appears when non-system
    const modelInput = screen.getByRole('textbox', { name: /speech-to-text model/i }) as HTMLInputElement;
    expect(modelInput).toBeTruthy();
    fireEvent.change(modelInput, { target: { value: 'whisper-1' } });
    expect(fakes.call).toHaveBeenCalledWith('promptVoice.settings.update', {
      sttModel: 'whisper-1'
    });
  });

  it('initializes speech provider from status response', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'assistant', sttProvider: 'google-gemini' };
      if (method === 'promptVoice.availableModels') return [];
      return {};
    });

    render(<PromptStudio />);
    const sttSelect = (await screen.findByRole('combobox', { name: /speech-to-text provider/i })) as HTMLSelectElement;
    expect(sttSelect.value).toBe('google-gemini');
  });

  it('offers a one-click button to switch to System STT when a direct STT key is unconfigured', async () => {
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'assistant', sttProvider: 'openai', sttKeyConfigured: false };
      if (method === 'promptVoice.availableModels') return [];
      if (method === 'promptVoice.settings.update') return {};
      return {};
    });

    render(<PromptStudio />);
    const switchBtn = await screen.findByRole('button', { name: /switch to system \(zana voice\)/i });
    expect(switchBtn).toBeTruthy();

    fireEvent.click(switchBtn);
    expect(fakes.call).toHaveBeenCalledWith('promptVoice.settings.update', {
      sttProvider: 'system'
    });
  });

  it('shows quick-action switch to System STT when dictation returns MISSING_KEY', async () => {
    const session = fakeSession();
    fakes.call.mockImplementation(async (method: string) => {
      if (method === 'promptVoice.status') return { llmProvider: 'assistant', sttProvider: 'google-gemini', sttKeyConfigured: true };
      if (method === 'promptVoice.availableModels') return [];
      if (method === 'promptVoice.transcribe') {
        return {
          ok: false,
          code: 'MISSING_KEY',
          message: 'Add your Google AI API key in Prompt Voice settings.'
        };
      }
      if (method === 'promptVoice.settings.update') return {};
      return {};
    });

    render(<PromptStudio startSession={async () => session} />);
    fireEvent.click(screen.getByRole('button', { name: /start dictation/i }));
    fireEvent.click(await screen.findByRole('button', { name: /stop dictation/i }));

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.textContent).toContain('Add your Google AI API key');

    const switchBtn = screen.getByRole('button', { name: /switch to system \(zana voice\)/i });
    fireEvent.click(switchBtn);
    expect(fakes.call).toHaveBeenCalledWith('promptVoice.settings.update', {
      sttProvider: 'system'
    });
  });
});

