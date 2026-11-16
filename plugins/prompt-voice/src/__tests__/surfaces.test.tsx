// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import appDefinition, { PROMPT_STUDIO_PANEL_PATH, PROMPT_STUDIO_PROJECT_TAB_ID } from '../../app.tsx';
import { HomeVoiceSection } from '../app/HomeVoiceSection.tsx';
import { VisibilitySettingsSection } from '../app/VisibilitySettingsSection.tsx';
import type { RecordedAudio, RecordingSession } from '../app/recorder.ts';
import { resetSoundCueContext } from '../app/soundCues.ts';
import { useVisibilitySettings } from '../app/safeSdk.ts';

const fakes = vi.hoisted(() => ({
  settingsValues: { showHomeWidget: true, showInProjects: true, micVisibility: 'both' } as Record<string, string | number | boolean> | undefined,
  setPluginSettings: vi.fn(async () => undefined),
  rpcCall: vi.fn(),
  callPluginRpc: vi.fn(),
  toPluginPanel: vi.fn(),
  toProject: vi.fn(),
  toCompose: vi.fn()
  ,realtimeHandler: undefined as ((payload: unknown) => void) | undefined
}));

vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  definePluginApp: (setup: unknown) => ({ __zccPluginApp: true, setup }),
  useSettings: () => ({ values: fakes.settingsValues, isLoading: false }),
  setPluginSettings: fakes.setPluginSettings,
  useRpc: () => ({ call: fakes.rpcCall }),
  callPluginRpc: fakes.callPluginRpc,
  useZccNavigate: () => ({
    toThread: vi.fn(),
    toPluginPanel: fakes.toPluginPanel,
    toProject: fakes.toProject,
    toCompose: fakes.toCompose,
    openPanelAgent: vi.fn(() => false)
  }),
  useRealtime: (_channel: string, handler: (payload: unknown) => void) => { fakes.realtimeHandler = handler; }
}));

function fakeSession(): RecordingSession {
  return {
    stop: vi.fn(async (): Promise<RecordedAudio> => ({ base64: 'YWJj', mimeType: 'audio/webm' })),
    cancel: vi.fn(() => undefined)
  };
}

beforeEach(() => {
  fakes.settingsValues = { showHomeWidget: true, showInProjects: true, micVisibility: 'both' };
  fakes.setPluginSettings.mockResolvedValue(undefined);
  fakes.rpcCall.mockImplementation(async (method: string) => {
    if (method === 'promptVoice.status') return { sttProvider: 'system', llmProvider: 'assistant' };
    if (method === 'promptVoice.settings.get') return {};
    if (method === 'promptVoice.transcribe') return { ok: true, status: 'ok', text: 'Ship the project tab today' };
    return {};
  });
  fakes.callPluginRpc.mockImplementation(async (_pluginId: string, method: string) => {
    if (method === 'promptVoice.status') return { sttProvider: 'system', llmProvider: 'assistant' };
    if (method === 'promptVoice.settings.get') return {};
    if (method === 'promptVoice.transcribe') return { ok: true, status: 'ok', text: 'Ship the project tab today' };
    return {};
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetSoundCueContext();
});

describe('HomeVoiceSection', () => {
  it('keeps realtime visibility when the host returns a new equivalent settings object', () => {
    const view = renderHook(() => useVisibilitySettings());
    act(() => fakes.realtimeHandler?.({ showHomeWidget: false, showInProjects: true, micVisibility: 'both' }));
    expect(view.result.current.showHomeWidget).toBe(false);
    fakes.settingsValues = { ...fakes.settingsValues };
    view.rerender();
    expect(view.result.current.showHomeWidget).toBe(false);
  });
  it('hides itself completely when showHomeWidget is false', () => {
    fakes.settingsValues = { showHomeWidget: false, showInProjects: true, micVisibility: 'both' };
    const { container } = render(<HomeVoiceSection pluginId="prompt-voice" projectId={null} />);
    expect(container.firstChild).toBeNull();
    expect(fakes.rpcCall).not.toHaveBeenCalled();
  });

  it('opens global Prompt Studio on main Home screen and project Prompt Studio inside a project', async () => {
    const { rerender } = render(<HomeVoiceSection pluginId="prompt-voice" projectId={null} />);
    expect(await screen.findByText('Zana Voice')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /open prompt studio/i }));
    expect(fakes.toPluginPanel).toHaveBeenCalledWith('prompt-studio');

    rerender(<HomeVoiceSection pluginId="prompt-voice" projectId="proj-42" />);
    fireEvent.click(screen.getByRole('button', { name: /open prompt studio/i }));
    expect(fakes.toProject).toHaveBeenCalledWith('proj-42', { tabId: 'prompt-studio' });
  });

  it('quick-dictates audio and opens a new thread composer with the transcript', async () => {
    const session = fakeSession();
    render(
      <HomeVoiceSection
        pluginId="prompt-voice"
        projectId={null}
        startSession={async () => session}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /dictate to new thread/i }));
    const stopBtn = await screen.findByRole('button', { name: /stop & compose/i });
    fireEvent.click(stopBtn);

    await waitFor(() =>
      expect(fakes.toCompose).toHaveBeenCalledWith({
        initialPrompt: 'Ship the project tab today',
        focusPrompt: true
      })
    );
  });

  it('routes RPC calls through callPluginRpc("prompt-voice") when host slot supplies a non-plugin id', async () => {
    render(<HomeVoiceSection pluginId="prompt-voice-home" projectId={null} />);
    expect(await screen.findByText('Zana Voice')).toBeTruthy();

    expect(fakes.callPluginRpc).toHaveBeenCalledWith('prompt-voice', 'promptVoice.status');
    expect(fakes.callPluginRpc).toHaveBeenCalledWith('prompt-voice', 'promptVoice.settings.get');
    expect(fakes.rpcCall).not.toHaveBeenCalled();
  });
});

describe('VisibilitySettingsSection', () => {
  it('applies presets, toggles home and project visibility, and updates mic placement', async () => {
    render(<VisibilitySettingsSection pluginId="prompt-voice" />);

    const projectsPreset = screen.getByRole('button', { name: /projects only/i });
    fireEvent.click(projectsPreset);
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('prompt-voice', {
        showHomeWidget: false,
        showInProjects: true,
        micVisibility: 'projects'
      })
    );
    expect(screen.getByText('Saved')).toBeTruthy();

    fireEvent.click(screen.getByRole('switch', { name: /main home screen widget/i }));
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('prompt-voice', { showHomeWidget: false })
    );

    fireEvent.click(screen.getByRole('switch', { name: /prompt studio tab in projects/i }));
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('prompt-voice', { showInProjects: false })
    );

    fireEvent.change(screen.getByLabelText(/composer mic button placement/i), {
      target: { value: 'main' }
    });
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('prompt-voice', { micVisibility: 'main' })
    );
  });

  it('shows an error alert if saving visibility settings fails', async () => {
    fakes.setPluginSettings.mockRejectedValueOnce(new Error('Permission denied'));
    render(<VisibilitySettingsSection pluginId="prompt-voice" />);

    fireEvent.click(screen.getByRole('switch', { name: /main home screen widget/i }));
    expect((await screen.findByRole('alert')).textContent).toContain('Permission denied');
  });
});

describe('app.tsx slot registrations', () => {
  it('registers composer action, navPanel, projectTab, homepageSection, settingsSection, and command palette shortcuts', () => {
    const composerCustomizations: Array<Record<string, unknown>> = [];
    const navPanels: Array<Record<string, unknown>> = [];
    const projectTabs: Array<Record<string, unknown>> = [];
    const homepageSections: Array<Record<string, unknown>> = [];
    const settingsSections: Array<Record<string, unknown>> = [];
    const commandPaletteActions: Array<{
      id: string;
      title: string;
      isAvailable?: (ctx: Record<string, unknown>) => boolean;
      run: (ctx: Record<string, unknown>) => void;
    }> = [];

    const app = {
      composer: {
        customize: (reg: Record<string, unknown>) => composerCustomizations.push(reg)
      },
      slots: {
        navPanel: (reg: Record<string, unknown>) => navPanels.push(reg),
        projectTab: (reg: Record<string, unknown>) => projectTabs.push(reg),
        homepageSection: (reg: Record<string, unknown>) => homepageSections.push(reg),
        settingsSection: (reg: Record<string, unknown>) => settingsSections.push(reg),
        commandPaletteAction: (reg: (typeof commandPaletteActions)[number]) => commandPaletteActions.push(reg)
      }
    };

    const def = appDefinition as { setup: (appApi: typeof app) => void };
    def.setup(app);

    expect(composerCustomizations).toHaveLength(1);
    expect(navPanels).toEqual([expect.objectContaining({ id: 'prompt-studio', path: PROMPT_STUDIO_PANEL_PATH })]);
    expect(projectTabs).toEqual([
      expect.objectContaining({
        id: PROMPT_STUDIO_PROJECT_TAB_ID,
        label: 'Prompt Studio',
        global: false,
        header: 'custom',
        detachable: true
      })
    ]);
    expect(homepageSections).toEqual([expect.objectContaining({ id: 'prompt-voice-home', title: 'Prompt Voice' })]);
    expect(settingsSections).toEqual([expect.objectContaining({ id: 'prompt-voice-visibility' })]);

    const openGlobal = commandPaletteActions.find((a) => a.id === 'open-prompt-studio');
    const openProject = commandPaletteActions.find((a) => a.id === 'open-prompt-studio-project');
    expect(openGlobal).toBeTruthy();
    expect(openProject).toBeTruthy();

    const toPluginPanel = vi.fn(() => true);
    const toProject = vi.fn(() => true);
    openGlobal!.run({ toPluginPanel });
    expect(toPluginPanel).toHaveBeenCalledWith(PROMPT_STUDIO_PANEL_PATH);

    expect(openProject!.isAvailable?.({ projectId: null })).toBe(false);
    expect(openProject!.isAvailable?.({ projectId: 'proj-9' })).toBe(true);
    openProject!.run({ projectId: 'proj-9', toProject });
    expect(toProject).toHaveBeenCalledWith('proj-9', { tabId: PROMPT_STUDIO_PROJECT_TAB_ID });
  });
});
