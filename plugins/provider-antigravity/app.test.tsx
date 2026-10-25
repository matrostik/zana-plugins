// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';

describe('antigravity provider app slots', () => {
  it('registers settingsSection slot for setup and doctor', async () => {
    const app = await loadPluginApp(() => import('./app.js'), 'provider-antigravity');
    expect(app.settingsSections).toHaveLength(1);
    expect(app.settingsSections[0]!.title).toBe('Antigravity Provider');

    const slot = renderSlot(
      app.settingsSections[0]!,
      { pluginId: 'provider-antigravity' },
      {
        rpc: {
          'doctor:status': () => ({
            installed: true,
            version: '1.4.0',
            executable: 'agy'
          })
        }
      }
    );

    await slot.findByText('Antigravity CLI Connected');
    await slot.findByText('v1.4.0');
    expect(slot.inspection.rpcCalls).toContainEqual({ method: 'doctor:status', input: null });
    slot.lifecycle.unmount();
  });
});
