import { definePluginApp } from '@zana-ai/zcc-plugin-sdk/app';
import { CodenodPanel } from './src/app/CodenodPanel.tsx';
import { CodenodSettingsSection } from './src/app/SettingsView.tsx';
import { ensureStylesInjected } from './src/app/styles.ts';

/** A single URL segment; the host rejects slashes. */
const PANEL_PATH = 'codenod';

export default definePluginApp((app) => {
  ensureStylesInjected();

  app.slots.navPanel({
    id: 'main',
    title: 'CodeNod',
    icon: 'GitPullRequest',
    path: PANEL_PATH,
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
});
