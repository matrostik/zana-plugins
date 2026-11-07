// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MicButton } from '../app/MicButton.tsx';
import { useDictation } from '../app/useDictation.ts';
import { RecordingError, type RecordedAudio, type RecordingSession } from "../app/recorder.ts";

const fakes = vi.hoisted(() => ({
  updateText: vi.fn(),
  focus: vi.fn(),
  call: vi.fn()
}));

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  useComposer: () => ({ updateText: fakes.updateText, focus: fakes.focus }),
  useRpc: () => ({ call: fakes.call })
}));

const BUTTON_NAME = 'Dictation';
const TRANSCRIBE = 'promptVoice.transcribe';

function fakeSession(): RecordingSession {
  return {
    stop: vi.fn(async (): Promise<RecordedAudio> => ({ base64: "YWJj", mimeType: "audio/webm" })),
    cancel: vi.fn(() => undefined)
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MicButton', () => {
  it('records on the first click, transcribes on the second, and appends to the draft', async () => {
    const session = fakeSession();
    const startSession = vi.fn(async () => session);
    fakes.call.mockResolvedValue({
      ok: true, status: 'ok', rawText: 'hi', text: 'hello there', sttProvider: 'openai', llmProvider: 'none', llmModel: null
    });
    render(<MicButton startSession={startSession} />);
    const button = screen.getByRole('button', { name: BUTTON_NAME });

    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute("aria-pressed")).toBe("true"));
    fireEvent.click(button);

    await waitFor(() => expect(fakes.updateText).toHaveBeenCalledTimes(1));
    expect(fakes.call).toHaveBeenCalledWith(TRANSCRIBE, { audio: 'YWJj', mimeType: 'audio/webm' });
    const applyUpdate = fakes.updateText.mock.calls[0]?.[0] as (draft: string) => string;
    expect(applyUpdate('Draft')).toBe('Draft hello there');
    expect(fakes.focus).toHaveBeenCalled();
  });

  it('shows the microphone error when recording cannot start', async () => {
    const startSession = vi.fn(async () => {
      throw new Error('Microphone access was denied. Allow it for Zana in system settings, then try again.');
    });
    render(<MicButton startSession={startSession} />);

    fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));

    expect((await screen.findByRole("alert")).textContent).toContain("Microphone access was denied");
    expect(fakes.call).not.toHaveBeenCalled();
  });

  it('waits for a pending start instead of leaving the microphone open', async () => {
    const session = fakeSession();
    let resolveStart: (value: RecordingSession) => void = () => undefined;
    const startSession = vi.fn(() => new Promise<RecordingSession>((resolve) => (resolveStart = resolve)));
    fakes.call.mockResolvedValue({
      ok: true, status: 'ok', rawText: 'hi', text: 'late words', sttProvider: 'openai', llmProvider: 'none', llmModel: null
    });
    render(<MicButton startSession={startSession} />);
    const button = screen.getByRole('button', { name: BUTTON_NAME });

    fireEvent.click(button);
    fireEvent.click(button);
    resolveStart(session);

    await waitFor(() => expect(session.stop).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fakes.updateText).toHaveBeenCalledTimes(1));
    expect(session.cancel).not.toHaveBeenCalled();
  });

  it('releases the microphone when unmounted mid-recording', async () => {
    const session = fakeSession();
    const startSession = vi.fn(async () => session);
    const view = render(<MicButton startSession={startSession} />);

    fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
    await waitFor(() => expect(startSession).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: BUTTON_NAME }).getAttribute("aria-pressed")).toBe("true"));
    view.unmount();

    expect(session.cancel).toHaveBeenCalled();
  });

  it('does not apply transcription to composer if unmounted while RPC is pending', async () => {
    let resolveRpc: (value: unknown) => void = () => undefined;
    fakes.call.mockReturnValue(new Promise((resolve) => { resolveRpc = resolve; }));
    const session = fakeSession();
    const startSession = vi.fn(async () => session);
    const view = render(<MicButton startSession={startSession} />);
    const button = screen.getByRole('button', { name: BUTTON_NAME });

    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute("aria-pressed")).toBe("true"));
    fireEvent.click(button);
    await waitFor(() => expect(session.stop).toHaveBeenCalledTimes(1));

    view.unmount();
    resolveRpc({ ok: true, status: 'ok', rawText: 'hi', text: 'stale text', sttProvider: 'openai', llmProvider: 'none', llmModel: null });

    await new Promise((r) => setTimeout(r, 20));
    expect(fakes.updateText).not.toHaveBeenCalled();
    expect(fakes.focus).not.toHaveBeenCalled();
  });

  it('dispatches failure when session triggers onError during recording', async () => {
    const session = fakeSession();
    const startSession = vi.fn(async () => session);
    render(<MicButton startSession={startSession} />);
    const button = screen.getByRole('button', { name: BUTTON_NAME });

    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute("aria-pressed")).toBe("true"));

    session.onError?.(new RecordingError('RECORDING_FAILED', 'Device disconnected unexpectedly'));
    expect((await screen.findByRole("alert")).textContent).toContain("Device disconnected unexpectedly");
  });

  it('automatically finishes dictation when session triggers onAutoStop', async () => {
    const session = fakeSession();
    const startSession = vi.fn(async () => session);
    fakes.call.mockResolvedValue({
      ok: true, status: 'ok', rawText: 'hi', text: 'autostop text', sttProvider: 'openai', llmProvider: 'none', llmModel: null
    });
    render(<MicButton startSession={startSession} />);
    const button = screen.getByRole('button', { name: BUTTON_NAME });

    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute("aria-pressed")).toBe("true"));

    session.onAutoStop?.();
    await waitFor(() => expect(session.stop).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fakes.updateText).toHaveBeenCalledTimes(1));
  });

  it('cancels pending startup and cancels session if it resolves after cancel()', async () => {
    const session = fakeSession();
    let resolveStart: (value: RecordingSession) => void = () => undefined;
    const startSession = vi.fn(() => new Promise<RecordingSession>((resolve) => (resolveStart = resolve)));
    const { result } = renderHook(() => useDictation({ startSession }));

    act(() => {
      void result.current.beginDictation();
    });
    expect(result.current.phase).toBe('recording');

    act(() => {
      result.current.cancel();
    });
    expect(result.current.phase).toBe('idle');

    await act(async () => {
      resolveStart(session);
    });

    expect(session.cancel).toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
  });
});
