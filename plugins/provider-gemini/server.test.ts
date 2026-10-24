import { describe, expect, it } from 'vitest';
import { createFakePluginHost } from '@zana-ai/zcc-plugin-sdk/testing';
import plugin from './server.js';
import artifact from './server.mjs';

for (const [name, register] of [['source', plugin], ['artifact', artifact]] as const) {
  describe(`gemini provider plugin (${name})`, () => {
    it('registers the Gemini ACP provider and capabilities', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-gemini' });
      register(zcc);

      expect(harness.providers).toHaveLength(1);
      const provider = harness.providers[0]!;
      expect(provider).toMatchObject({
        id: 'gemini',
        displayName: 'Gemini',
        icon: './icons/gemini.svg',
        family: 'acp',
        capabilities: {
          fork: 'none',
          permissionModes: ['accept-edits', 'full'],
          supportsManualCompaction: false
        }
      });
      expect(provider.capabilities.reasoningLevels).toEqual([]);
      await harness.dispose();
    });

    it('derives ACP launch options using the configured executable', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-gemini' });
      register(zcc);

      const result = harness.providers[0]!.deriveProviderOptions!({
        projectId: 'project-1',
        threadId: 'thread-1',
        permissionMode: 'accept-edits',
        settings: { executable: '  gemini-custom  ' }
      });

      expect(result).toEqual({
        acpDialect: 'generic',
        acpLaunchSpec: {
          displayName: 'Gemini',
          command: 'gemini-custom',
          args: ['--acp'],
          env: {}
        }
      });
      await harness.dispose();
    });

    it('falls back to default gemini command when setting is empty', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-gemini' });
      register(zcc);

      const result = harness.providers[0]!.deriveProviderOptions!({
        projectId: 'project-1',
        threadId: 'thread-1',
        permissionMode: 'full',
        settings: { executable: '   ' }
      });

      expect(result.acpLaunchSpec.command).toBe('gemini');
      await harness.dispose();
    });

    it('provides doctor:status RPC method for UI setup check', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-gemini' });
      register(zcc);

      const status = await harness.callRpc('doctor:status') as any;
      expect(status).toHaveProperty('installed');
      expect(status).toHaveProperty('executable');
      expect(typeof status.installed).toBe('boolean');
      await harness.dispose();
    });
  });
}
