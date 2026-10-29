import { definePluginApp } from '@zana-ai/zcc-plugin-sdk/app';
import { CodenodPanel } from './src/app/CodenodPanel.tsx';
import { CodenodSettingsSection } from './src/app/SettingsView.tsx';
import { ensureStylesInjected } from './src/app/styles.ts';

/** A single URL segment; the host rejects slashes. */
const PANEL_PATH = 'codenod';
const PROJECT_TAB_ID = 'codenod';

export default definePluginApp((app) => {
  ensureStylesInjected();

  app.slots.navPanel({
    id: 'main',
    title: 'CodeNod',
    icon: 'GitPullRequest',
    path: PANEL_PATH,
    component: CodenodPanel
  });

  // The same panel inside each project, limited to that project's repositories and checkouts.
  app.slots.projectTab({
    id: PROJECT_TAB_ID,
    label: 'CodeNod',
    icon: 'GitPullRequest',
    order: 45,
    global: false,
    header: 'custom',
    component: CodenodPanel
  });

  app.slots.settingsSection({
    id: 'codenod-settings',
    title: 'CodeNod',
    description: 'Review models, GitHub sign-in, and watched repositories.',
    component: CodenodSettingsSection
  });

  app.slots.commandPaletteAction({
    id: 'open-codenod',
    title: 'CodeNod: Open pull request reviews',
    isAvailable: () => true,
    run: (ctx: { toPluginPanel?: (path: string) => void }) => ctx.toPluginPanel?.(PANEL_PATH)
  });

  app.slots.commandPaletteAction({
    id: 'open-codenod-project',
    title: 'CodeNod: Review this project',
    isAvailable: (ctx: { projectId?: string }) => Boolean(ctx.projectId),
    run: (ctx: { projectId?: string; toProject: (projectId: string, options?: { tabId?: string }) => void }) => {
      if (ctx.projectId) ctx.toProject(ctx.projectId, { tabId: PROJECT_TAB_ID });
    }
  });
});
