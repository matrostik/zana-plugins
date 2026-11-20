// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import appDefinition, { DRAFT_STUDIO_PANEL_PATH, DRAFT_STUDIO_PROJECT_TAB_ID } from '../../app.tsx';
import { HomeVoiceSection } from '../app/HomeVoiceSection.tsx';
import { VisibilitySettingsSection } from '../app/VisibilitySettingsSection.tsx';
import { consumePendingStudioTab } from '../app/historyNavigation.ts';
import type { RecordedAudio, RecordingSession } from '../app/recorder.ts';
import { resetSoundCueContext } from '../app/soundCues.ts';
import { DRAFT_STUDIO_HISTORY_SUBPATH } from '../shared/protocol.ts';

const fakes = vi.hoisted(() => ({
  settingsValues: { showHomeWidget: true, showInProjects: true, micVisibility: 'both' } as Record<string, string | number | boolean> | undefined,
  setPluginSettings: vi.fn(async () => undefined),
  rpcCall: vi.fn(),
  callPluginRpc: vi.fn(),
  toPluginPanel: vi.fn(),
  toProject: vi.fn(),
  toCompose: vi.fn()
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
  useRealtime: vi.fn()
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
    if (method === 'draftStudio.status') return { sttProvider: 'system', llmProvider: 'assistant' };
    if (method === 'draftStudio.settings.get') return {};
    if (method === 'draftStudio.transcribe') return { ok: true, status: 'ok', text: 'Ship the project tab today' };
    return {};
  });
  fakes.callPluginRpc.mockImplementation(async (_pluginId: string, method: string) => {
    if (method === 'draftStudio.status') return { sttProvider: 'system', llmProvider: 'assistant' };
    if (method === 'draftStudio.settings.get') return {};
    if (method === 'draftStudio.transcribe') return { ok: true, status: 'ok', text: 'Ship the project tab today' };
    return {};
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetSoundCueContext();
});

describe('HomeVoiceSection', () => {
  it('hides itself completely when showHomeWidget is false', () => {
    fakes.settingsValues = { showHomeWidget: false, showInProjects: true, micVisibility: 'both' };
    const { container } = render(<HomeVoiceSection pluginId="draft-studio" projectId={null} />);
    expect(container.firstChild).toBeNull();
    expect(fakes.rpcCall).not.toHaveBeenCalled();
  });

  it('opens global Draft Studio on main Home screen and project Draft Studio inside a project', async () => {
    const { rerender } = render(<HomeVoiceSection pluginId="draft-studio" projectId={null} />);
    expect(await screen.findByText('Zana Voice')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /open draft studio/i }));
    expect(fakes.toPluginPanel).toHaveBeenCalledWith('draft-studio');

    rerender(<HomeVoiceSection pluginId="draft-studio" projectId="proj-42" />);
    fireEvent.click(screen.getByRole('button', { name: /open draft studio/i }));
    expect(fakes.toProject).toHaveBeenCalledWith('proj-42', { tabId: 'draft-studio' });
  });

  it('opens History directly from the Home card for global and project scopes', async () => {
    const { rerender } = render(<HomeVoiceSection pluginId="draft-studio" projectId={null} />);
    expect(await screen.findByText('Zana Voice')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^history$/i }));
    expect(fakes.toPluginPanel).toHaveBeenCalledWith('draft-studio', { subPath: DRAFT_STUDIO_HISTORY_SUBPATH });
    expect(consumePendingStudioTab()).toBe('history');

    rerender(<HomeVoiceSection pluginId="draft-studio" projectId="proj-42" />);
    fireEvent.click(screen.getByRole('button', { name: /^history$/i }));
    expect(fakes.toProject).toHaveBeenCalledWith('proj-42', { tabId: 'draft-studio' });
    expect(consumePendingStudioTab()).toBe('history');
  });

  it('quick-dictates audio with home metadata and opens a new thread composer with the transcript', async () => {
    const session = fakeSession();
    render(
      <HomeVoiceSection
        pluginId="draft-studio"
        projectId="proj-home"
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
    expect(fakes.rpcCall).toHaveBeenCalledWith(
      'draftStudio.transcribe',
      expect.objectContaining({
        source: 'home',
        projectId: 'proj-home'
      })
    );
  });

  it('routes RPC calls through callPluginRpc("draft-studio") when host slot supplies a non-plugin id', async () => {
    render(<HomeVoiceSection pluginId="draft-studio-home" projectId={null} />);
    expect(await screen.findByText('Zana Voice')).toBeTruthy();

    expect(fakes.callPluginRpc).toHaveBeenCalledWith('draft-studio', 'draftStudio.status');
    expect(fakes.callPluginRpc).toHaveBeenCalledWith('draft-studio', 'draftStudio.settings.get');
    expect(fakes.rpcCall).not.toHaveBeenCalled();
  });
});

describe('VisibilitySettingsSection', () => {
  it('applies presets, toggles home and project visibility, and updates mic placement', async () => {
    render(<VisibilitySettingsSection pluginId="draft-studio" />);

    const projectsPreset = screen.getByRole('button', { name: /projects only/i });
    fireEvent.click(projectsPreset);
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('draft-studio', {
        showHomeWidget: false,
        showInProjects: true,
        micVisibility: 'projects'
      })
    );
    expect(screen.getByText('Saved')).toBeTruthy();

    fireEvent.click(screen.getByRole('switch', { name: /main home screen widget/i }));
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('draft-studio', { showHomeWidget: false })
    );

    fireEvent.click(screen.getByRole('switch', { name: /draft studio tab in projects/i }));
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('draft-studio', { showInProjects: false })
    );

    fireEvent.change(screen.getByLabelText(/composer mic button placement/i), {
      target: { value: 'main' }
    });
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('draft-studio', { micVisibility: 'main' })
    );
  });

  it('normalizes slot-supplied pluginId to "draft-studio" when writing settings', async () => {
    render(<VisibilitySettingsSection pluginId="draft-studio-home" />);

    fireEvent.click(screen.getByRole('switch', { name: /main home screen widget/i }));
    await waitFor(() =>
      expect(fakes.setPluginSettings).toHaveBeenCalledWith('draft-studio', { showHomeWidget: false })
    );
  });

  it('shows an error alert if saving visibility settings fails', async () => {
    fakes.setPluginSettings.mockRejectedValueOnce(new Error('Permission denied'));
    render(<VisibilitySettingsSection pluginId="draft-studio" />);

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
    expect(navPanels).toEqual([expect.objectContaining({ id: 'draft-studio', path: DRAFT_STUDIO_PANEL_PATH })]);
    expect(projectTabs).toEqual([
      expect.objectContaining({
        id: DRAFT_STUDIO_PROJECT_TAB_ID,
        label: 'Draft Studio',
        global: false,
        header: 'custom',
        detachable: true
      })
    ]);
    expect(homepageSections).toEqual([expect.objectContaining({ id: 'draft-studio-home', title: 'Draft Studio' })]);
    expect(settingsSections).toEqual([expect.objectContaining({ id: 'draft-studio-visibility' })]);

    const openGlobal = commandPaletteActions.find((a) => a.id === 'open-draft-studio');
    const openProject = commandPaletteActions.find((a) => a.id === 'open-draft-studio-project');
    const openHistory = commandPaletteActions.find((a) => a.id === 'open-draft-studio-history');
    expect(openGlobal).toBeTruthy();
    expect(openProject).toBeTruthy();
    expect(openHistory).toBeTruthy();

    const toPluginPanel = vi.fn(() => true);
    const toProject = vi.fn(() => true);
    openGlobal!.run({ toPluginPanel });
    expect(toPluginPanel).toHaveBeenCalledWith(DRAFT_STUDIO_PANEL_PATH);

    openHistory!.run({ toPluginPanel });
    expect(toPluginPanel).toHaveBeenCalledWith(DRAFT_STUDIO_PANEL_PATH, { subPath: DRAFT_STUDIO_HISTORY_SUBPATH });
    expect(consumePendingStudioTab()).toBe('history');

    expect(openProject!.isAvailable?.({ projectId: null })).toBe(false);
    expect(openProject!.isAvailable?.({ projectId: 'proj-9' })).toBe(true);
    openProject!.run({ projectId: 'proj-9', toProject });
    expect(toProject).toHaveBeenCalledWith('proj-9', { tabId: DRAFT_STUDIO_PROJECT_TAB_ID });
  });
});
