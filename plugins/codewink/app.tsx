import { definePluginApp } from '@zana-ai/zcc-plugin-sdk/app';
import { CodewinkPanel } from './src/app/CodewinkPanel.tsx';
import { CodewinkSettingsSection } from './src/app/SettingsView.tsx';
import { ensureStylesInjected } from './src/app/styles.ts';

/** A single URL segment; the host rejects slashes. */
const PANEL_PATH = 'codewink';
const PROJECT_TAB_ID = 'codewink';

export default definePluginApp((app) => {
  ensureStylesInjected();

  app.slots.navPanel({
    id: 'main',
    title: 'CodeWink',
    icon: 'GitPullRequest',
    path: PANEL_PATH,
    component: CodewinkPanel
  });

  // The same panel inside each project, limited to that project's repositories and checkouts.
  app.slots.projectTab({
    id: PROJECT_TAB_ID,
    label: 'CodeWink',
    icon: 'GitPullRequest',
    order: 45,
    global: false,
    header: 'custom',
    component: CodewinkPanel
  });

  app.slots.settingsSection({
    id: 'codewink-settings',
    title: 'CodeWink',
    description: 'Review models, GitHub sign-in, and watched repositories.',
    component: CodewinkSettingsSection
  });

  app.slots.commandPaletteAction({
    id: 'open-codewink',
    title: 'CodeWink: Open pull request reviews',
    isAvailable: () => true,
    run: (ctx: { toPluginPanel?: (path: string) => void }) => ctx.toPluginPanel?.(PANEL_PATH)
  });

  app.slots.commandPaletteAction({
    id: 'open-codewink-project',
    title: 'CodeWink: Review this project',
    isAvailable: (ctx: { projectId?: string }) => Boolean(ctx.projectId),
    run: (ctx: { projectId?: string; toProject: (projectId: string, options?: { tabId?: string }) => void }) => {
      if (ctx.projectId) ctx.toProject(ctx.projectId, { tabId: PROJECT_TAB_ID });
    }
  });
});
