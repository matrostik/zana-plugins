// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PromptStudio } from '../app/PromptStudio.tsx';
import type { RecordedAudio, RecordingSession } from '../app/recorder.ts';

const fakes = vi.hoisted(() => ({
  updateText: vi.fn(),
  focus: vi.fn(),
  call: vi.fn()
}));

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  useComposer: () => ({ updateText: fakes.updateText, focus: fakes.focus }),
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
  it('renders vertical canvas and allows typing raw input', () => {
    render(<PromptStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    expect(textarea).toBeTruthy();

    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });
    expect(screen.getAllByText(/4 words/i).length).toBeGreaterThan(0);
  });

  it('runs a preset refinement and displays output in bottom pane', async () => {
    fakes.call.mockResolvedValueOnce({
      ok: true,
      rawText: 'Fix bug in auth',
      text: 'Resolve defect in authentication service.',
      llmProvider: 'assistant',
      llmModel: 'assistant',
      durationMs: 120
    });

    render(<PromptStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });

    const polishPill = screen.getByRole('button', { name: /polish clarity/i });
    fireEvent.click(polishPill);

    expect(await screen.findByText('Resolve defect in authentication service.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /view diff/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /copy output/i })).toBeTruthy();
  });

  it('allows toggling diff view in output pane', async () => {
    fakes.call.mockResolvedValueOnce({
      ok: true,
      rawText: 'Fix bug in auth',
      text: 'Resolve defect in authentication service.',
      llmProvider: 'assistant',
      llmModel: 'assistant',
      durationMs: 120
    });

    render(<PromptStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Fix bug in auth' } });

    fireEvent.click(screen.getByRole('button', { name: /polish clarity/i }));
    const diffBtn = await screen.findByRole('button', { name: /view diff/i });
    fireEvent.click(diffBtn);

    expect(screen.getByRole('button', { name: /view clean/i })).toBeTruthy();
  });

  it('inserts into composer when button is clicked', () => {
    render(<PromptStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Ready prompt' } });

    const insertBtn = screen.getByRole('button', { name: /insert output into composer/i });
    fireEvent.click(insertBtn);

    expect(fakes.updateText).toHaveBeenCalled();
    expect(fakes.focus).toHaveBeenCalled();
  });

  it('supports voice dictation into the top input', async () => {
    const session = fakeSession();
    fakes.call.mockResolvedValueOnce({
      ok: true,
      status: 'ok',
      text: 'spoken voice ideas',
      rawText: 'spoken voice ideas'
    });

    render(<PromptStudio startSession={async () => session} />);
    const micBtn = screen.getByRole('button', { name: /dictate into top input/i });

    // Start recording
    await act(async () => {
      fireEvent.click(micBtn);
    });
    expect(screen.getByRole('button', { name: /listening/i })).toBeTruthy();

    // Stop recording
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /listening/i }));
    });

    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('spoken voice ideas');
  });

  it('replaces input with output when Replace Input is clicked', async () => {
    fakes.call.mockResolvedValueOnce({
      ok: true,
      rawText: 'Raw notes',
      text: 'Polished spec',
      llmProvider: 'assistant',
      llmModel: 'assistant',
      durationMs: 100
    });

    render(<PromptStudio />);
    const textarea = screen.getByPlaceholderText(/type your raw thoughts/i);
    fireEvent.change(textarea, { target: { value: 'Raw notes' } });

    fireEvent.click(screen.getByRole('button', { name: /polish clarity/i }));
    await screen.findByText('Polished spec');

    const replaceBtn = screen.getByRole('button', { name: /replace input/i });
    fireEvent.click(replaceBtn);

    expect((textarea as HTMLTextAreaElement).value).toBe('Polished spec');
  });
});
