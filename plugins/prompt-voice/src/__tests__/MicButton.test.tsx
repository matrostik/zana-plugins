// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MicButton } from '../app/MicButton.tsx';
import { useDictation } from '../app/useDictation.ts';
import { RecordingError, type RecordedAudio, type RecordingSession } from "../app/recorder.ts";
import { resetSoundCueContext } from "../app/soundCues.ts";

const fakes = vi.hoisted(() => ({
  updateText: vi.fn(),
  focus: vi.fn(),
  call: vi.fn(),
  settingsValues: { showHomeWidget: true, showInProjects: true, micVisibility: 'both' } as Record<string, unknown>,
  composerView: null as { scope?: { kind?: string; projectId?: string | null } } | null,
  zccContext: { projectId: null as string | null }
}));

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  useComposer: () => ({ updateText: fakes.updateText, focus: fakes.focus }),
  useRpc: () => ({ call: fakes.call }),
  useSettings: () => ({ values: fakes.settingsValues, loading: false }),
  useComposerView: () => fakes.composerView,
  useZccContext: () => fakes.zccContext,
  useRealtime: () => undefined
}));

const BUTTON_NAME = 'Dictation';
const TRANSCRIBE = 'promptVoice.transcribe';

function fakeSession(): RecordingSession {
  return {
    stop: vi.fn(async (): Promise<RecordedAudio> => ({ base64: "YWJj", mimeType: "audio/webm" })),
    cancel: vi.fn(() => undefined)
  };
}

beforeEach(() => {
  fakes.settingsValues = { showHomeWidget: true, showInProjects: true, micVisibility: 'both' };
  fakes.composerView = null;
  fakes.zccContext = { projectId: null };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetSoundCueContext();
});

describe('MicButton', () => {
  it('shows startup, recording activity, and processing feedback', async () => {
    let resolveStart!: (value: RecordingSession) => void;
    let resolveRpc!: (value: unknown) => void;
    fakes.call.mockReturnValue(new Promise((resolve) => { resolveRpc = resolve; }));
    const session = fakeSession();
    render(<MicButton startSession={() => new Promise((resolve) => { resolveStart = resolve; })} />);
    fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
    expect(screen.getByText(/requesting microphone/i)).toBeTruthy();
    await act(async () => resolveStart(session));
    expect(screen.getByText(/recording/i)).toBeTruthy();
    expect(screen.getByText(/audio meter unavailable/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
    expect(await screen.findByText(/transcribing and refining/i)).toBeTruthy();
    await act(async () => resolveRpc({ ok: true, status: 'ok', text: 'hello' }));
    expect(await screen.findByText(/added to draft/i)).toBeTruthy();
  });

  it('dismisses notice on click and automatically after delay', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const session = fakeSession();
      fakes.call.mockResolvedValue({ ok: true, status: 'ok', text: 'testing' });
      render(<MicButton startSession={async () => session} />);
      const button = screen.getByRole('button', { name: BUTTON_NAME });
      fireEvent.click(button);
      await act(async () => undefined);
      fireEvent.click(button);
      await act(async () => undefined);
      const noticeEl = screen.getByText(/added to draft/i);
      expect(noticeEl).toBeTruthy();

      // Click to dismiss immediately
      fireEvent.click(noticeEl);
      expect(screen.queryByText(/added to draft/i)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('allows a recording to be cancelled without transcribing', async () => {
    const session = fakeSession();
    render(<MicButton startSession={async () => session} />);
    fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
    await screen.findByText(/recording/i);
    fireEvent.click(screen.getByRole('button', { name: /cancel recording/i }));
    expect(session.cancel).toHaveBeenCalled();
    expect(fakes.call).not.toHaveBeenCalledWith(TRANSCRIBE, expect.anything());
  });
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
    expect(fakes.call).not.toHaveBeenCalledWith(TRANSCRIBE, expect.anything());
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

  it('explains an automatic stop while the transcript is processing', async () => {
    const session = fakeSession();
    fakes.call.mockReturnValue(new Promise(() => undefined));
    render(<MicButton startSession={async () => session} />);
    fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
    await screen.findByText(/recording/i);
    act(() => session.onAutoStop?.());
    expect(await screen.findByText(/recording limit reached/i)).toBeTruthy();
  });

  it('cancels pending startup and cancels session if it resolves after cancel()', async () => {
    const session = fakeSession();
    let resolveStart: (value: RecordingSession) => void = () => undefined;
    const startSession = vi.fn(() => new Promise<RecordingSession>((resolve) => (resolveStart = resolve)));
    const { result } = renderHook(() => useDictation({ startSession }));

    act(() => {
      void result.current.beginDictation();
    });
    expect(result.current.phase).toBe('starting');

    act(() => {
      result.current.cancel();
    });
    expect(result.current.phase).toBe('idle');

    await act(async () => {
      resolveStart(session);
    });
    expect(session.cancel).toHaveBeenCalled();
  });

  it('uses cached micDeviceId and sound cue preferences for composer dictation', async () => {
    const map = new Map<string, string>();
    map.set(
      'zcc:prompt-voice:audio-prefs:v1',
      JSON.stringify({ micDeviceId: 'airpods-pro', soundCuesEnabled: 'true', soundCuesVolume: '60' })
    );
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
      removeItem: (k: string) => { map.delete(k); },
      clear: () => { map.clear(); }
    });
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
      const order: string[] = [];
      const session = fakeSession();
      const startSession = vi.fn(async () => {
        order.push('startSession');
        return session;
      });
      fakes.call.mockResolvedValue({
        ok: true, status: 'ok', rawText: 'hi', text: 'mic test', sttProvider: 'system', llmProvider: 'none', llmModel: null
      });

      render(<MicButton startSession={startSession} />);
      fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
      await waitFor(() => expect(startSession).toHaveBeenCalledWith({ deviceId: 'airpods-pro' }));
      expect(startOsc).toHaveBeenCalled();
      expect(order).toEqual(['startSession']);
      expect(startOsc.mock.invocationCallOrder[0]).toBeLessThan(startSession.mock.invocationCallOrder[0]);

      fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
      await waitFor(() => expect(fakes.updateText).toHaveBeenCalledTimes(1));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fetches saved mic preferences from server on mount when localStorage cache is empty', async () => {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
      removeItem: (k: string) => { map.delete(k); },
      clear: () => { map.clear(); }
    });

    try {
      const session = fakeSession();
      const startSession = vi.fn(async () => session);
      fakes.call.mockImplementation(async (method: string) => {
        if (method === 'promptVoice.settings.get') {
          return { micDeviceId: 'cold-usb-mic', soundCuesEnabled: 'false', soundCuesVolume: '30' };
        }
        return { ok: true, status: 'ok', text: 'cold start' };
      });

      render(<MicButton startSession={startSession} />);
      await waitFor(() => expect(fakes.call).toHaveBeenCalledWith('promptVoice.settings.get'));
      await waitFor(() => expect(map.get('zcc:prompt-voice:audio-prefs:v1')).toContain('cold-usb-mic'));

      fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
      await waitFor(() => expect(startSession).toHaveBeenCalledWith({ deviceId: 'cold-usb-mic' }));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('plays the stop cue only after session.stop resolves', async () => {
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
      const events: string[] = [];
      let resolveStop!: (audio: RecordedAudio) => void;
      const session: RecordingSession = {
        stop: vi.fn(() => new Promise<RecordedAudio>((resolve) => {
          resolveStop = (audio) => { events.push('stopResolved'); resolve(audio); };
        })),
        cancel: vi.fn()
      };
      fakes.call.mockResolvedValue({ ok: true, status: 'ok', text: 'clean tail' });
      render(<MicButton startSession={async () => session} />);

      fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
      await waitFor(() => expect(screen.getByRole('button', { name: BUTTON_NAME }).getAttribute('aria-pressed')).toBe('true'));
      const callsBeforeStop = startOsc.mock.calls.length;

      fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
      await waitFor(() => expect(session.stop).toHaveBeenCalledTimes(1));
      expect(startOsc.mock.calls.length).toBe(callsBeforeStop);

      resolveStop({ base64: 'YWJj', mimeType: 'audio/webm' });
      await waitFor(() => expect(fakes.updateText).toHaveBeenCalledTimes(1));
      expect(events).toEqual(['stopResolved']);
      expect(startOsc.mock.calls.length).toBeGreaterThan(callsBeforeStop);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('preserves server-loaded preferences when localStorage throws and avoids clobbering mid-session snapshot', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('SecurityError'); }
    });
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
      let resolveSettings!: (v: unknown) => void;
      const session = fakeSession();
      const startSession = vi.fn(async () => session);
      fakes.call.mockImplementation((method: string) => {
        if (method === 'promptVoice.settings.get') {
          return new Promise((resolve) => { resolveSettings = resolve; });
        }
        return Promise.resolve({ ok: true, status: 'ok', text: 'first' });
      });

      render(<MicButton startSession={startSession} />);
      // Start first dictation before settings.get resolves
      fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
      await waitFor(() => expect(startSession).toHaveBeenCalledTimes(1));

      // Resolve settings.get mid-session with soundCuesEnabled=false
      await act(async () => {
        resolveSettings({ micDeviceId: 'studio-usb', soundCuesEnabled: 'false', soundCuesVolume: '20' });
      });
      const callsDuringStart = startOsc.mock.calls.length;
      // Stopping first session still uses the session-start snapshot (enabled=true)
      fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
      await waitFor(() => expect(fakes.updateText).toHaveBeenCalledTimes(1));
      expect(startOsc.mock.calls.length).toBeGreaterThan(callsDuringStart);

      // Dismiss completion notice, then start second dictation (falls back to serverPrefsRef)
      fireEvent.click(screen.getByText(/added to draft/i));
      const callsBeforeSecond = startOsc.mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: BUTTON_NAME }));
      await waitFor(() => expect(startSession).toHaveBeenLastCalledWith({ deviceId: 'studio-usb' }));
      expect(startOsc.mock.calls.length).toBe(callsBeforeSecond);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('hides composer mic when micVisibility is off without firing settings RPC', () => {
    fakes.settingsValues = { micVisibility: 'off' };
    fakes.composerView = { scope: { kind: 'project', projectId: 'proj-1' } };

    render(<MicButton />);
    expect(screen.queryByRole('button', { name: BUTTON_NAME })).toBeNull();
    expect(fakes.call).not.toHaveBeenCalled();
  });

  it('renders composer mic only in project scope when micVisibility is projects', () => {
    fakes.settingsValues = { micVisibility: 'projects' };
    fakes.composerView = { scope: { kind: 'global', projectId: null } };
    fakes.zccContext = { projectId: 'proj-1' };

    const view = render(<MicButton />);
    expect(screen.queryByRole('button', { name: BUTTON_NAME })).toBeNull();
    expect(fakes.call).not.toHaveBeenCalled();

    fakes.composerView = { scope: { kind: 'project', projectId: 'proj-1' } };
    view.rerender(<MicButton />);
    expect(screen.getByRole('button', { name: BUTTON_NAME })).toBeTruthy();
  });

  it('renders composer mic only on main screen when micVisibility is main', () => {
    fakes.settingsValues = { micVisibility: 'main' };
    fakes.composerView = { scope: { kind: 'project', projectId: 'proj-1' } };

    const view = render(<MicButton />);
    expect(screen.queryByRole('button', { name: BUTTON_NAME })).toBeNull();
    expect(fakes.call).not.toHaveBeenCalled();

    fakes.composerView = { scope: { kind: 'global', projectId: null } };
    view.rerender(<MicButton />);
    expect(screen.getByRole('button', { name: BUTTON_NAME })).toBeTruthy();
  });
});
