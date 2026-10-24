// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';

describe('gemini provider app slots', () => {
  it('registers settingsSection slot for setup and doctor', async () => {
    const app = await loadPluginApp(() => import('./app.js'), 'provider-gemini');
    expect(app.settingsSections).toHaveLength(1);
    expect(app.settingsSections[0]!.title).toBe('Gemini Provider');

    const slot = renderSlot(
      app.settingsSections[0]!,
      { pluginId: 'provider-gemini' },
      {
        rpc: {
          'doctor:status': () => ({
            installed: true,
            version: '0.64.0',
            executable: 'gemini'
          })
        }
      }
    );

    await slot.findByText('Gemini CLI Connected');
    await slot.findByText('v0.64.0');
    expect(slot.inspection.rpcCalls).toContainEqual({ method: 'doctor:status', input: undefined });
    slot.lifecycle.unmount();
  });
});
