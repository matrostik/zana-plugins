import { describe, expect, it } from 'vitest';
import { createFakePluginHost } from '@zana-ai/zcc-plugin-sdk/testing';
import plugin from './server.js';
import artifact from './server.mjs';

for (const [name, register] of [['source', plugin], ['artifact', artifact]] as const) {
  describe(`antigravity provider plugin (${name})`, () => {
    it('registers the Antigravity ACP provider and capabilities', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
      register(zcc);

      expect(harness.providers).toHaveLength(1);
      const provider = harness.providers[0]!;
      expect(provider).toMatchObject({
        id: 'antigravity',
        displayName: 'Antigravity',
        icon: './icons/antigravity.svg',
        family: 'acp',
        capabilities: {
          fork: 'none',
          permissionModes: ['accept-edits', 'full'],
          supportsManualCompaction: false
        }
      });
      expect(provider.capabilities.reasoningLevels).toEqual(['low', 'medium', 'high']);
      expect(provider.experimental_bridgeOptions).toMatchObject({
        acpDialect: 'generic',
        acpLaunchSpec: {
          displayName: 'Antigravity',
          command: process.execPath,
          env: {
            AGY_EXECUTABLE: 'agy'
          }
        }
      });
      expect(provider.models?.fallback).toBeDefined();
      expect(provider.models?.fallback?.length).toBeGreaterThanOrEqual(4);
      await harness.dispose();
    });

    it('derives ACP launch options using the configured executable', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
      register(zcc);

      const result = harness.providers[0]!.deriveProviderOptions!({
        projectId: 'project-1',
        threadId: 'thread-1',
        permissionMode: 'accept-edits',
        settings: { executable: '  agy-custom  ' }
      }) as any;

      expect(result.acpDialect).toBe('generic');
      expect(result.acpLaunchSpec.displayName).toBe('Antigravity');
      expect(result.acpLaunchSpec.command).toBe(process.execPath);
      expect(result.acpLaunchSpec.args[1]).toBe('agy-custom');
      expect(result.acpLaunchSpec.env.AGY_EXECUTABLE).toBe('agy-custom');
      await harness.dispose();
    });

    it('falls back to default agy command when setting is empty', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
      register(zcc);

      const result = harness.providers[0]!.deriveProviderOptions!({
        projectId: 'project-1',
        threadId: 'thread-1',
        permissionMode: 'full',
        settings: { executable: '   ' }
      }) as any;

      expect(result.acpLaunchSpec.args[1]).toBe('agy');
      expect(result.acpLaunchSpec.env.AGY_EXECUTABLE).toBe('agy');
      await harness.dispose();
    });

    it('provides doctor:status RPC method for UI setup check', async () => {
      const { zcc, harness } = createFakePluginHost({ pluginId: 'provider-antigravity' });
      register(zcc);

      const status = await harness.callRpc('doctor:status') as any;
      expect(status).toHaveProperty('installed');
      expect(status).toHaveProperty('executable');
      expect(typeof status.installed).toBe('boolean');
      await harness.dispose();
    });
  });
}
