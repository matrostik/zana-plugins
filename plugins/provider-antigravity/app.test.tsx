// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';
import type { DoctorStatusResult } from './server.js';

function makeDoctorStatus(overrides: Partial<DoctorStatusResult> = {}): DoctorStatusResult {
  return {
    installed: true,
    authenticated: true,
    ready: true,
    version: '1.4.3',
    pinnedVersion: '1.4.3',
    previousVersion: null,
    source: 'managed',
    executable: 'agy_acp_server.exe',
    companionFilesPresent: true,
    missingCompanionFiles: [],
    state: 'session_ready',
    authMethod: 'oauth-personal',
    configuredAuthType: 'oauth-personal',
    pendingAuthUrl: null,
    models: [],
    modes: [],
    tierName: null,
    disabledDeadMcpServers: [],
    ...overrides
  };
}

function makeUninstalledStatus(overrides: Partial<DoctorStatusResult> = {}): DoctorStatusResult {
  return makeDoctorStatus({
    installed: false,
    authenticated: false,
    ready: false,
    version: null,
    source: 'uninstalled',
    companionFilesPresent: false,
    state: 'runtime_missing',
    configuredAuthType: null,
    ...overrides
  });
}

async function renderSettingsSlot(rpcHandlers: Record<string, (input: any) => any>) {
  const app = await loadPluginApp(() => import('./app.js'), 'provider-antigravity');
  const slot = renderSlot(
    app.settingsSections[0]!,
    { pluginId: 'provider-antigravity' },
    { rpc: rpcHandlers }
  );
  return { app, slot };
}

describe('antigravity provider app slots', () => {
  it('registers settingsSection slot when Native ACP runtime is missing', async () => {
    const { app, slot } = await renderSettingsSlot({
      'doctor:status': () =>
        makeUninstalledStatus({ missingCompanionFiles: ['localharness_external.exe'] })
    });

    expect(app.settingsSections).toHaveLength(1);
    expect(app.settingsSections[0]!.title).toBe('Antigravity Provider');
    await slot.findByText('Antigravity Native ACP (Runtime Missing)');
    await slot.findByText('Install Native ACP Runtime (v1.4.3)');
    expect(slot.inspection.rpcCalls).toContainEqual({ method: 'doctor:status', input: null });
    slot.lifecycle.unmount();
  });

  it('renders Native ACP session_ready state, tier badge, models, and dead MCP bypass note', async () => {
    const { slot } = await renderSettingsSlot({
      'doctor:status': () =>
        makeDoctorStatus({
          previousVersion: '1.4.0',
          executable: 'C:/runtimes/agy_acp_server.exe',
          models: [
            { id: 'gemini-4-argon', name: 'Gemini 4 Argon' },
            { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }
          ],
          modes: ['default', 'auto_edit', 'yolo'],
          tierName: 'Google AI Pro',
          disabledDeadMcpServers: ['data-agent-kit']
        })
    });

    await slot.findByText('Antigravity Native ACP Connected');
    await slot.findByText('Google AI Pro');
    await slot.findByText('Rollback to v1.4.0');
    await slot.findByText(/Gemini 4 Argon/);
    await slot.findByText(/data-agent-kit/);
    slot.lifecycle.unmount();
  });

  it('triggers runtime:install on button click and transitions to sign_in_required', async () => {
    let installedCalled = false;
    const { slot } = await renderSettingsSlot({
      'doctor:status': () => makeUninstalledStatus(),
      'runtime:install': () => {
        installedCalled = true;
        return makeDoctorStatus({
          authenticated: false,
          ready: false,
          state: 'sign_in_required',
          configuredAuthType: null
        });
      }
    });

    const installBtn = (await slot.findByText('Install Native ACP Runtime (v1.4.3)')) as HTMLElement;
    installBtn.click();

    await slot.findByText('Sign In with Google');
    expect(installedCalled).toBe(true);
    slot.lifecycle.unmount();
  });

  it('triggers rollback, sign-in, and verify session actions', async () => {
    let rollbackCalled = false;
    let loginCalled = false;
    let probeCalled = false;

    const { slot } = await renderSettingsSlot({
      'doctor:status': (args: any) => {
        if (args?.probeNative) probeCalled = true;
        return makeDoctorStatus({ previousVersion: '1.4.0', tierName: 'Ultra' });
      },
      'runtime:rollback': () => {
        rollbackCalled = true;
        return makeDoctorStatus({ version: '1.4.0', previousVersion: '1.4.3' });
      },
      'auth:login': () => {
        loginCalled = true;
        return makeDoctorStatus();
      }
    });

    ((await slot.findByText('Rollback to v1.4.0')) as HTMLElement).click();
    expect(rollbackCalled).toBe(true);

    ((await slot.findByText('Re-authenticate with Google')) as HTMLElement).click();
    expect(loginCalled).toBe(true);

    ((await slot.findByText('Verify Session & Models')) as HTMLElement).click();
    expect(probeCalled).toBe(true);

    slot.lifecycle.unmount();
  });

  it('triggers copy OAuth URL and clear auth selection actions', async () => {
    let logoutCalled = false;
    Object.assign(navigator, {
      clipboard: { writeText: () => Promise.resolve() }
    });

    const { slot } = await renderSettingsSlot({
      'doctor:status': () =>
        makeDoctorStatus({
          pendingAuthUrl: 'https://accounts.google.com/o/oauth2/test'
        }),
      'auth:logout': () => {
        logoutCalled = true;
        return makeDoctorStatus({
          authenticated: false,
          ready: false,
          state: 'sign_in_required',
          configuredAuthType: null
        });
      }
    });

    ((await slot.findByText('Copy URL')) as HTMLElement).click();
    await slot.findByText('Copied!');

    ((await slot.findByText('Clear Auth Selection')) as HTMLElement).click();
    expect(logoutCalled).toBe(true);

    slot.lifecycle.unmount();
  });

  it('renders communication error fallback when doctor:status throws', async () => {
    const { slot } = await renderSettingsSlot({
      'doctor:status': () => {
        throw new Error('Connection refused by host daemon');
      }
    });

    await slot.findByText(/Connection refused by host daemon/);
    slot.lifecycle.unmount();
  });
});
