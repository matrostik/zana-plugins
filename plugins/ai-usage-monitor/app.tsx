import { definePluginApp } from '@zana-ai/zcc-plugin-sdk/app';
import { SettingsSection } from './src/app/SettingsSection.tsx';
import { UsageMonitorPanel } from './src/app/UsageMonitorPanel.tsx';

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: 'ai-usage-monitor',
    title: 'AI Usage Monitor',
    icon: 'Activity',
    path: 'ai-usage-monitor',
    placement: 'sidebar',
    component: UsageMonitorPanel
  });

  app.slots.settingsSection({
    id: 'ai-usage-monitor-settings',
    title: 'Usage Telemetry & Connectors',
    description: 'View live connector health, trigger manual quota syncs, or re-index local threads.',
    component: SettingsSection
  });

  app.slots.commandPaletteAction({
    id: 'open-ai-usage-monitor',
    title: 'Open AI Usage Monitor',
    run: (ctx: { toPluginPanel?: (path: string) => void }) => {
      ctx.toPluginPanel?.('ai-usage-monitor');
    }
  });
});
