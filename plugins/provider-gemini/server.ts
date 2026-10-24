import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';

const execFileAsync = promisify(execFile);

const ICON = './icons/gemini.svg';

export interface DoctorStatusResult {
  installed: boolean;
  version: string | null;
  executable: string;
  error?: string;
}

export default function plugin(zcc: ZccPluginApi) {
  // 1. User-configurable executable path / command
  const settings = zcc.settings.define({
    executable: {
      type: 'string',
      label: 'Gemini CLI executable',
      default: 'gemini',
      description: 'Command or absolute path of a Gemini CLI installation (needs ACP mode, gemini --acp).'
    }
  });

  // 2. Register ACP thread provider for Zana
  zcc.agents.experimental_registerProvider({
    id: 'gemini',
    displayName: 'Gemini',
    icon: ICON,
    family: 'acp',
    experimental_visibility: 'installed',
    strings: {
      signInHint: 'Run `gemini` in your terminal to sign in with your Google account, then reload.',
      expiredHint: 'Your Gemini sign-in expired. Run `gemini` in your terminal to sign in again, then reload.',
      installUrl: 'https://github.com/google-gemini/gemini-cli'
    },
    maintenance: {
      health: true,
      usage: false,
      installation: false
    },
    capabilities: {
      supportsServiceTier: false,
      supportsNativeUserQuestion: false,
      fork: 'none',
      supportsManualCompaction: false,
      supportsThreadArchive: false,
      supportsThreadRename: false,
      supportsWorkflows: false,
      permissionModes: ['accept-edits', 'full'],
      reasoningLevels: []
    },
    composerActions: [],
    models: { scope: 'host' },
    env: { passthrough: ['GEMINI_API_KEY'] },
    deriveProviderOptions({ settings: currentSettings }) {
      const value = currentSettings.executable;
      const command = typeof value === 'string' && value.trim() ? value.trim() : 'gemini';
      return {
        acpDialect: 'generic',
        acpLaunchSpec: {
          displayName: 'Gemini',
          command,
          args: ['--acp'],
          env: {}
        }
      };
    }
  });

  // 3. Doctor RPC for Setup UI in Settings
  zcc.rpc.method('doctor:status', async (): Promise<DoctorStatusResult> => {
    const current = await settings.get();
    const executable = typeof current.executable === 'string' && current.executable.trim()
      ? current.executable.trim()
      : 'gemini';

    try {
      const { stdout } = await execFileAsync(executable, ['--version'], {
        timeout: 6000,
        shell: process.platform === 'win32'
      });
      const version = stdout.trim();
      return {
        installed: true,
        version: version || 'unknown',
        executable
      };
    } catch (err: any) {
      zcc.log.debug(`Gemini doctor probe failed for ${executable}: ${err?.message}`);
      return {
        installed: false,
        version: null,
        executable,
        error: err?.code === 'ENOENT'
          ? `Executable "${executable}" was not found in PATH.`
          : (err?.message || 'Failed to execute Gemini CLI.')
      };
    }
  });
}
