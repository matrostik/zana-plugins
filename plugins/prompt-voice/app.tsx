import { definePluginApp } from '@zana-ai/zcc-plugin-sdk/app';
import { HomeVoiceSection } from './src/app/HomeVoiceSection.tsx';
import { MicButton, ensureStylesInjected } from './src/app/MicButton.tsx';
import { PromptStudio, PromptStudioDetachedPlaceholder } from './src/app/PromptStudio.tsx';
import { VisibilitySettingsSection } from './src/app/VisibilitySettingsSection.tsx';

import { PROMPT_STUDIO_PANEL_PATH, PROMPT_STUDIO_PROJECT_TAB_ID } from './src/shared/protocol.ts';
export { PROMPT_STUDIO_PANEL_PATH, PROMPT_STUDIO_PROJECT_TAB_ID } from './src/shared/protocol.ts';

interface CommandPaletteContextLike {
  projectId?: string | null;
  navigate?: (path: string) => void;
  toPluginPanel?: (path: string) => boolean;
  toProject?: (projectId: string, options?: { tabId?: string }) => boolean;
}

/**
 * Registers Prompt Voice's composer mic button, Prompt Studio screens (global & per-project),
 * Home quick-voice section, visibility settings section, and command palette shortcuts.
 */
export default definePluginApp((app) => {
  ensureStylesInjected();

  // Thread Composer mic action (scope-gated via MicButton)
  app.composer.customize({
    id: 'prompt-voice-mic',
    actions: [{ id: 'prompt-voice-mic', component: MicButton }]
  });

  // Dedicated Prompt Studio global navigation screen
  app.slots.navPanel?.({
    id: PROMPT_STUDIO_PANEL_PATH,
    title: 'Prompt Studio',
    icon: 'Sparkles',
    path: PROMPT_STUDIO_PANEL_PATH,
    component: PromptStudio
  });

  // Project-level Prompt Studio tab (gated dynamically on server via registerProjectTabAvailability)
  app.slots.projectTab?.({
    id: PROMPT_STUDIO_PROJECT_TAB_ID,
    label: 'Prompt Studio',
    icon: 'Sparkles',
    order: 50,
    global: false,
    header: 'custom',
    detachable: true,
    component: PromptStudio,
    detachedPlaceholder: PromptStudioDetachedPlaceholder
  });

  // Toggleable main Home screen widget
  app.slots.homepageSection?.({
    id: 'prompt-voice-home',
    title: 'Prompt Voice',
    component: HomeVoiceSection
  });

  // Surface & visibility controls in Prompt Voice plugin settings
  app.slots.settingsSection?.({
    id: 'prompt-voice-visibility',
    title: 'Where Prompt Voice Appears',
    description: 'Choose whether Prompt Voice appears on the main Home screen, inside projects, and in composers.',
    component: VisibilitySettingsSection
  });

  // Command palette: open global Prompt Studio canvas
  app.slots.commandPaletteAction?.({
    id: 'open-prompt-studio',
    title: 'Prompt Studio: Open Canvas',
    isAvailable: () => true,
    run: (ctx: CommandPaletteContextLike) => {
      if (typeof ctx.toPluginPanel === 'function') {
        ctx.toPluginPanel(PROMPT_STUDIO_PANEL_PATH);
        return;
      }
      ctx.navigate?.(`/${PROMPT_STUDIO_PANEL_PATH}`);
    }
  });

  // Command palette: open project-scoped Prompt Studio tab when inside a project
  app.slots.commandPaletteAction?.({
    id: 'open-prompt-studio-project',
    title: 'Prompt Studio: Open in This Project',
    isAvailable: (ctx: CommandPaletteContextLike) => Boolean(ctx.projectId),
    run: (ctx: CommandPaletteContextLike) => {
      if (ctx.projectId && typeof ctx.toProject === 'function') {
        ctx.toProject(ctx.projectId, { tabId: PROMPT_STUDIO_PROJECT_TAB_ID });
      }
    }
  });
});
