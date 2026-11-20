import { definePluginApp } from '@zana-ai/zcc-plugin-sdk/app';
import { HomeVoiceSection } from './src/app/HomeVoiceSection.tsx';
import { requestPendingStudioTab } from './src/app/historyNavigation.ts';
import { MicButton, ensureStylesInjected } from './src/app/MicButton.tsx';
import { DraftStudio, DraftStudioDetachedPlaceholder } from './src/app/DraftStudio.tsx';
import { VisibilitySettingsSection } from './src/app/VisibilitySettingsSection.tsx';

import {
  DRAFT_STUDIO_HISTORY_SUBPATH,
  DRAFT_STUDIO_PANEL_PATH,
  DRAFT_STUDIO_PROJECT_TAB_ID
} from './src/shared/protocol.ts';
export { DRAFT_STUDIO_PANEL_PATH, DRAFT_STUDIO_PROJECT_TAB_ID } from './src/shared/protocol.ts';

interface CommandPaletteContextLike {
  projectId?: string | null;
  navigate?: (path: string) => void;
  toPluginPanel?: (path: string, options?: { subPath?: string; replace?: boolean }) => boolean;
  toProject?: (projectId: string, options?: { tabId?: string }) => boolean;
}

/**
 * Registers Draft Studio's composer mic button, global and per-project studio workspaces,
 * Home quick-dictate section, visibility settings section, and command palette shortcuts.
 */
export default definePluginApp((app) => {
  ensureStylesInjected();

  // Thread Composer mic action (scope-gated via MicButton)
  app.composer.customize({
    id: 'draft-studio-mic',
    actions: [{ id: 'draft-studio-mic', component: MicButton }]
  });

  // Dedicated Draft Studio global navigation screen
  app.slots.navPanel?.({
    id: DRAFT_STUDIO_PANEL_PATH,
    title: 'Draft Studio',
    icon: 'Sparkles',
    path: DRAFT_STUDIO_PANEL_PATH,
    component: DraftStudio
  });

  // Project-level Draft Studio tab (gated dynamically on server via registerProjectTabAvailability)
  app.slots.projectTab?.({
    id: DRAFT_STUDIO_PROJECT_TAB_ID,
    label: 'Draft Studio',
    icon: 'Sparkles',
    order: 50,
    global: false,
    header: 'custom',
    detachable: true,
    component: DraftStudio,
    detachedPlaceholder: DraftStudioDetachedPlaceholder
  });

  // Toggleable main Home screen widget
  app.slots.homepageSection?.({
    id: 'draft-studio-home',
    title: 'Draft Studio',
    component: HomeVoiceSection
  });

  // Surface & visibility controls in Draft Studio plugin settings
  app.slots.settingsSection?.({
    id: 'draft-studio-visibility',
    title: 'Where Draft Studio Appears',
    description: 'Choose whether Draft Studio appears on the main Home screen, inside projects, and in composers.',
    component: VisibilitySettingsSection
  });

  // Command palette: open global Draft Studio canvas
  app.slots.commandPaletteAction?.({
    id: 'open-draft-studio',
    title: 'Draft Studio: Open Canvas',
    isAvailable: () => true,
    run: (ctx: CommandPaletteContextLike) => {
      requestPendingStudioTab('studio');
      if (typeof ctx.toPluginPanel === 'function') {
        ctx.toPluginPanel(DRAFT_STUDIO_PANEL_PATH);
        return;
      }
      ctx.navigate?.(`/${DRAFT_STUDIO_PANEL_PATH}`);
    }
  });

  // Command palette: open Draft Studio History tab
  app.slots.commandPaletteAction?.({
    id: 'open-draft-studio-history',
    title: 'Draft Studio: Open History',
    isAvailable: () => true,
    run: (ctx: CommandPaletteContextLike) => {
      requestPendingStudioTab('history');
      if (typeof ctx.toPluginPanel === 'function') {
        ctx.toPluginPanel(DRAFT_STUDIO_PANEL_PATH, { subPath: DRAFT_STUDIO_HISTORY_SUBPATH });
        return;
      }
      ctx.navigate?.(`/${DRAFT_STUDIO_PANEL_PATH}/${DRAFT_STUDIO_HISTORY_SUBPATH}`);
    }
  });

  // Command palette: open project-scoped Draft Studio tab when inside a project
  app.slots.commandPaletteAction?.({
    id: 'open-draft-studio-project',
    title: 'Draft Studio: Open in This Project',
    isAvailable: (ctx: CommandPaletteContextLike) => Boolean(ctx.projectId),
    run: (ctx: CommandPaletteContextLike) => {
      if (ctx.projectId && typeof ctx.toProject === 'function') {
        ctx.toProject(ctx.projectId, { tabId: DRAFT_STUDIO_PROJECT_TAB_ID });
      }
    }
  });
});
