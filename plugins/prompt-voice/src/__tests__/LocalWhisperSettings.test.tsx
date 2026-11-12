// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUSY_POLL_MS, describePrivacy, describeRuntime, formatSize, LocalWhisperSettings } from '../app/LocalWhisperSettings.tsx';
import { LOCAL_WHISPER_METHODS, type LocalWhisperStateView } from '../shared/protocol.ts';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const MODELS: LocalWhisperStateView['models'] = [
  { id: 'tiny', label: 'Tiny', sizeBytes: 77_691_713, memoryEstimate: '~273 MB', recommended: false, status: 'available' },
  { id: 'base', label: 'Base', sizeBytes: 147_951_465, memoryEstimate: '~388 MB', recommended: true, status: 'available' }
];

function makeState(overrides: Partial<LocalWhisperStateView> = {}): LocalWhisperStateView {
  return {
    platform: { supported: true },
    runtime: { status: 'not-installed', version: 'v1.9.5', requirements: ['Microsoft Visual C++ 2015–2022 Redistributable'] },
    server: { state: 'stopped' },
    activeModelId: null,
    models: MODELS,
    lastError: null,
    ...overrides
  };
}

function setup(state: LocalWhisperStateView, props: { sttProvider?: string; llmProvider?: string } = {}) {
  const call = vi.fn(async (_method: string, _input?: unknown) => ({ ok: true, state }));
  const onApplyPreset = vi.fn();
  render(<LocalWhisperSettings rpc={{ call }} onApplyPreset={onApplyPreset} {...props} />);
  return { call, onApplyPreset };
}

describe('describeRuntime', () => {
  it.each([
    [makeState(), 'Runtime not installed', 'Install runtime'],
    [makeState({ runtime: { status: 'installing', version: 'v1.9.5', requirements: [], progress: 0.42 } }), 'Installing runtime… 42%', 'Cancel'],
    [makeState({ runtime: { status: 'installed', version: 'v1.9.5', requirements: [] } }), 'Runtime installed', undefined],
    [makeState({ runtime: { status: 'installed', version: 'v1.9.5', requirements: [] }, activeModelId: 'base' }), 'Stopped', 'Start'],
    [makeState({ runtime: { status: 'installed', version: 'v1.9.5', requirements: [] }, activeModelId: 'base', server: { state: 'starting', modelId: 'base' } }), 'Starting…', undefined],
    [makeState({ runtime: { status: 'installed', version: 'v1.9.5', requirements: [] }, activeModelId: 'base', server: { state: 'running', modelId: 'base' } }), 'Running', 'Stop'],
    [makeState({ runtime: { status: 'installed', version: 'v1.9.5', requirements: [] }, activeModelId: 'base', server: { state: 'crashed', modelId: 'base', exitCode: 134 } }), 'Stopped unexpectedly', 'Restart']
  ])('describes %#', (state, title, action) => {
    const view = describeRuntime(state);
    expect(view.title).toBe(title);
    expect(view.action?.label).toBe(action);
  });

  it('names the system requirements before install', () => {
    expect(describeRuntime(makeState()).detail).toContain('Visual C++');
  });
});

describe('describePrivacy', () => {
  it('is fully offline only with Local Whisper and cleanup off', () => {
    expect(describePrivacy('local-whisper', 'none').offline).toBe(true);
    expect(describePrivacy('local-whisper', 'assistant')).toMatchObject({ offline: false, text: expect.stringContaining('Audio stays on this device') });
    expect(describePrivacy('system', 'none')).toMatchObject({ offline: false, text: expect.stringContaining('leaves this device') });
    expect(describePrivacy(undefined, undefined).offline).toBe(false);
  });
});

describe('formatSize', () => {
  it('uses decimal MB and GB like download sizes elsewhere', () => {
    expect(formatSize(147_951_465)).toBe('148 MB');
    expect(formatSize(1_533_763_059)).toBe('1.5 GB');
  });
});

describe('LocalWhisperSettings', () => {
  it('offers runtime install and model downloads on a fresh machine', async () => {
    const { call } = setup(makeState());
    fireEvent.click(await screen.findByRole('button', { name: 'Install runtime' }));
    expect(call).toHaveBeenCalledWith(LOCAL_WHISPER_METHODS.installRuntime, undefined);
    expect(screen.getByText('Not set up')).toBeTruthy();
    expect(screen.getByText('Recommended')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Download 148 MB' }));
    expect(call).toHaveBeenCalledWith(LOCAL_WHISPER_METHODS.downloadModel, { modelId: 'base' });
  });

  it('shows download progress with a cancel action', async () => {
    const { call } = setup(makeState({ models: [{ ...MODELS[1], status: 'downloading', progress: 0.5 }] }));
    const bar = await screen.findByRole('progressbar', { name: 'Downloading Base' });
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(call).toHaveBeenCalledWith(LOCAL_WHISPER_METHODS.cancelModelDownload, { modelId: 'base' });
  });

  it('lets an installed model be used, and protects the active one from removal', async () => {
    const state = makeState({
      runtime: { status: 'installed', version: 'v1.9.5', requirements: [] },
      activeModelId: 'base',
      server: { state: 'running', modelId: 'base' },
      models: MODELS.map((model) => ({ ...model, status: 'installed' as const }))
    });
    const { call } = setup(state);
    await screen.findByText('Ready');
    const [tinyRow, baseRow] = screen.getAllByRole('row').slice(1);
    expect(within(baseRow).getByText('Active')).toBeTruthy();
    expect((within(baseRow).getByRole('button', { name: 'Remove Base' }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(baseRow).queryByRole('button', { name: 'Use' })).toBeNull();
    fireEvent.click(within(tinyRow).getByRole('button', { name: 'Use' }));
    expect(call).toHaveBeenCalledWith(LOCAL_WHISPER_METHODS.selectModel, { modelId: 'tiny' });
  });

  it('explains an unsupported computer without offering install', async () => {
    setup(makeState({ platform: { supported: false, message: "Local Whisper isn't available for macOS arm64 yet." } }));
    expect(await screen.findByText(/macOS arm64/)).toBeTruthy();
    expect(screen.getByText('Unavailable')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Install runtime' })).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the last error from the server', async () => {
    setup(makeState({ lastError: { operation: 'download-model', code: 'DOWNLOAD_INTEGRITY', message: "Base didn't match its expected checksum." } }));
    expect((await screen.findByRole('alert')).textContent).toContain('checksum');
  });

  it('shows a failed action message', async () => {
    const call = vi.fn(async (method: string) =>
      method === LOCAL_WHISPER_METHODS.state ? { ok: true, state: makeState() } : { ok: false, code: 'LOCAL_RUNTIME_FAILED', message: 'Not enough disk space.', state: makeState() }
    );
    render(<LocalWhisperSettings rpc={{ call }} onApplyPreset={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Install runtime' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Not enough disk space.');
  });

  it('applies the offline preset, and hides it once offline', async () => {
    const { onApplyPreset } = setup(makeState(), { sttProvider: 'system', llmProvider: 'assistant' });
    expect(await screen.findByText('Not fully offline')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use offline preset' }));
    expect(onApplyPreset).toHaveBeenCalledWith({ sttProvider: 'local-whisper', llmProvider: 'none' });
    cleanup();
    setup(makeState(), { sttProvider: 'local-whisper', llmProvider: 'none' });
    expect(await screen.findByText('Fully offline')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Use offline preset' })).toBeNull();
  });

  it('polls quickly while a download is in progress', async () => {
    vi.useFakeTimers();
    const { call } = setup(makeState({ models: [{ ...MODELS[1], status: 'downloading', progress: 0.1 }] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const before = call.mock.calls.filter(([method]) => method === LOCAL_WHISPER_METHODS.state).length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(BUSY_POLL_MS * 2 + 10);
    });
    const after = call.mock.calls.filter(([method]) => method === LOCAL_WHISPER_METHODS.state).length;
    expect(after - before).toBeGreaterThanOrEqual(2);
  });
});
