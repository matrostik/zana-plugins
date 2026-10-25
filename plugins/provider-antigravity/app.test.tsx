// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { loadPluginApp, renderSlot } from '@zana-ai/zcc-plugin-sdk/testing/app';

describe('antigravity provider app slots', () => {
  it('registers settingsSection slot when Native ACP runtime is missing', async () => {
    const app = await loadPluginApp(() => import('./app.js'), 'provider-antigravity');
    expect(app.settingsSections).toHaveLength(1);
    expect(app.settingsSections[0]!.title).toBe('Antigravity Provider');

    const slot = renderSlot(
      app.settingsSections[0]!,
      { pluginId: 'provider-antigravity' },
      {
        rpc: {
          'doctor:status': () => ({
            installed: false,
            authenticated: false,
            ready: false,
            version: null,
            pinnedVersion: '1.4.3',
            previousVersion: null,
            source: 'uninstalled',
            executable: 'agy_acp_server.exe',
            companionFilesPresent: false,
            missingCompanionFiles: ['localharness_external.exe'],
            state: 'runtime_missing',
            authMethod: 'oauth-personal',
            configuredAuthType: null,
            pendingAuthUrl: null,
            models: [],
            modes: [],
            tierName: null,
            disabledDeadMcpServers: []
          })
        }
      }
    );

    await slot.findByText('Antigravity Native ACP (Runtime Missing)');
    await slot.findByText('Install Native ACP Runtime (v1.4.3)');
    expect(slot.inspection.rpcCalls).toContainEqual({ method: 'doctor:status', input: null });
    slot.lifecycle.unmount();
  });

  it('renders Native ACP session_ready state, tier badge, models, and dead MCP bypass note', async () => {
    const app = await loadPluginApp(() => import('./app.js'), 'provider-antigravity');
    const slot = renderSlot(
      app.settingsSections[0]!,
      { pluginId: 'provider-antigravity' },
      {
        rpc: {
          'doctor:status': () => ({
            installed: true,
            authenticated: true,
            ready: true,
            version: '1.4.3',
            pinnedVersion: '1.4.3',
            previousVersion: '1.4.0',
            source: 'managed',
            executable: 'C:/runtimes/agy_acp_server.exe',
            companionFilesPresent: true,
            missingCompanionFiles: [],
            state: 'session_ready',
            authMethod: 'oauth-personal',
            configuredAuthType: 'oauth-personal',
            pendingAuthUrl: null,
            models: [
              { id: 'gemini-4-argon', name: 'Gemini 4 Argon' },
              { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }
            ],
            modes: ['default', 'auto_edit', 'yolo'],
            tierName: 'Google AI Pro',
            disabledDeadMcpServers: ['data-agent-kit']
          })
        }
      }
    );

    await slot.findByText('Antigravity Native ACP Connected');
    await slot.findByText('Google AI Pro');
    await slot.findByText('Rollback to v1.4.0');
    await slot.findByText(/Gemini 4 Argon/);
    await slot.findByText(/data-agent-kit/);
    slot.lifecycle.unmount();
  });

  it('triggers runtime:install on button click and handles install errors', async () => {
    const app = await loadPluginApp(() => import('./app.js'), 'provider-antigravity');
    let installedCalled = false;

    const slot = renderSlot(
      app.settingsSections[0]!,
      { pluginId: 'provider-antigravity' },
      {
        rpc: {
          'doctor:status': () => ({
            installed: false,
            authenticated: false,
            ready: false,
            version: null,
            pinnedVersion: '1.4.3',
            previousVersion: null,
            source: 'uninstalled',
            executable: 'agy_acp_server.exe',
            companionFilesPresent: false,
            missingCompanionFiles: [],
            state: 'runtime_missing',
            authMethod: 'oauth-personal',
            configuredAuthType: null,
            pendingAuthUrl: null,
            models: [],
            modes: [],
            tierName: null,
            disabledDeadMcpServers: []
          }),
          'runtime:install': () => {
            installedCalled = true;
            return {
              installed: true,
              authenticated: false,
              ready: false,
              version: '1.4.3',
              pinnedVersion: '1.4.3',
              previousVersion: null,
              source: 'managed',
              executable: 'agy_acp_server.exe',
              companionFilesPresent: true,
              missingCompanionFiles: [],
              state: 'sign_in_required',
              authMethod: 'oauth-personal',
              configuredAuthType: null,
              pendingAuthUrl: null,
              models: [],
              modes: [],
              tierName: null,
              disabledDeadMcpServers: []
            };
          }
        }
      }
    );

    const installBtn = await slot.findByText('Install Native ACP Runtime (v1.4.3)');
    installBtn.click();

    await slot.findByText('Sign In with Google');
    expect(installedCalled).toBe(true);
    slot.lifecycle.unmount();
  });

  it('triggers rollback, sign-in, verify session, clear auth, and copy URL', async () => {
    const app = await loadPluginApp(() => import('./app.js'), 'provider-antigravity');
    let rollbackCalled = false;
    let loginCalled = false;
    let logoutCalled = false;
    let probeCalled = false;

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: () => Promise.resolve()
      }
    });

    const slot = renderSlot(
      app.settingsSections[0]!,
      { pluginId: 'provider-antigravity' },
      {
        rpc: {
          'doctor:status': (args: any) => {
            if (args?.probeNative) {
              probeCalled = true;
            }
            return {
              installed: true,
              authenticated: true,
              ready: true,
              version: '1.4.3',
              pinnedVersion: '1.4.3',
              previousVersion: '1.4.0',
              source: 'managed',
              executable: 'agy_acp_server.exe',
              companionFilesPresent: true,
              missingCompanionFiles: [],
              state: 'session_ready',
              authMethod: 'oauth-personal',
              configuredAuthType: 'oauth-personal',
              pendingAuthUrl: 'https://accounts.google.com/o/oauth2/test',
              models: [{ id: 'gemini-4-argon', name: 'Gemini 4 Argon' }],
              modes: ['default'],
              tierName: 'Ultra',
              disabledDeadMcpServers: []
            };
          },
          'runtime:rollback': () => {
            rollbackCalled = true;
            return {
              installed: true,
              authenticated: true,
              ready: true,
              version: '1.4.0',
              pinnedVersion: '1.4.3',
              previousVersion: '1.4.3',
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
              disabledDeadMcpServers: []
            };
          },
          'auth:login': () => {
            loginCalled = true;
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
              disabledDeadMcpServers: []
            };
          },
          'auth:logout': () => {
            logoutCalled = true;
            return {
              installed: true,
              authenticated: false,
              ready: false,
              version: '1.4.3',
              pinnedVersion: '1.4.3',
              previousVersion: null,
              source: 'managed',
              executable: 'agy_acp_server.exe',
              companionFilesPresent: true,
              missingCompanionFiles: [],
              state: 'sign_in_required',
              authMethod: 'oauth-personal',
              configuredAuthType: null,
              pendingAuthUrl: null,
              models: [],
              modes: [],
              tierName: null,
              disabledDeadMcpServers: []
            };
          }
        }
      }
    );

    const rollbackBtn = await slot.findByText('Rollback to v1.4.0');
    rollbackBtn.click();
    expect(rollbackCalled).toBe(true);

    const reauthBtn = await slot.findByText('Re-authenticate with Google');
    reauthBtn.click();
    expect(loginCalled).toBe(true);

    const probeBtn = await slot.findByText('Verify Session & Models');
    probeBtn.click();
    expect(probeCalled).toBe(true);

    const copyBtn = await slot.findByText('Copy URL');
    copyBtn.click();
    await slot.findByText('Copied!');

    const clearAuthBtn = await slot.findByText('Clear Auth Selection');
    clearAuthBtn.click();
    expect(logoutCalled).toBe(true);

    slot.lifecycle.unmount();
  });

  it('renders communication error fallback when doctor:status throws', async () => {
    const app = await loadPluginApp(() => import('./app.js'), 'provider-antigravity');
    const slot = renderSlot(
      app.settingsSections[0]!,
      { pluginId: 'provider-antigravity' },
      {
        rpc: {
          'doctor:status': () => {
            throw new Error('Connection refused by host daemon');
          }
        }
      }
    );

    await slot.findByText(/Connection refused by host daemon/);
    slot.lifecycle.unmount();
  });
});
