import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ADAPTER_SCRIPT = resolve(__dirname, 'agy-acp.mjs');

function resolveNodeExecutable(): string {
  if (basename(process.execPath).toLowerCase().startsWith('node')) {
    return process.execPath;
  }
  const standardPaths = [
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe'
  ];
  for (const p of standardPaths) {
    if (existsSync(p)) return p;
  }
  return 'node';
}

const ICON = './icons/antigravity.svg';

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
      label: 'Antigravity CLI executable',
      default: 'agy',
      description: 'Command or absolute path of your Antigravity CLI installation (agy).'
    }
  });

  // 2. Register ACP thread provider for Zana
  zcc.agents.experimental_registerProvider({
    id: 'antigravity',
    displayName: 'Antigravity',
    icon: ICON,
    family: 'acp',
    experimental_visibility: 'installed',
    experimental_bridgeOptions: {
      acpDialect: 'generic',
      acpLaunchSpec: {
        displayName: 'Antigravity',
        command: resolveNodeExecutable(),
        args: [ADAPTER_SCRIPT, 'agy'],
        env: {
          AGY_EXECUTABLE: 'agy'
        }
      }
    },
    strings: {
      signInHint: 'Run `agy` in your terminal to sign in with your Google account, then reload.',
      expiredHint: 'Your Antigravity sign-in expired. Run `agy` in your terminal to sign in again, then reload.',
      installUrl: 'https://antigravity.google'
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
      reasoningLevels: ['low', 'medium', 'high']
    },
    reasoningLevels: [
      { id: 'low', label: 'Low Effort' },
      { id: 'medium', label: 'Medium Effort' },
      { id: 'high', label: 'High Effort' }
    ],
    composerActions: [],
    models: {
      scope: 'host',
      fallback: [
        {
          id: 'gemini-4-argon',
          displayName: 'Gemini 4 Argon',
          description: 'Google Gemini 4 Argon flagship model with deep reasoning',
          supportedReasoningEfforts: [
            { reasoningEffort: 'low', description: 'Low reasoning effort' },
            { reasoningEffort: 'medium', description: 'Medium reasoning effort' },
            { reasoningEffort: 'high', description: 'High reasoning effort' }
          ],
          defaultReasoningEffort: 'medium',
          isDefault: true
        },
        {
          id: 'gemini-3.8-flash',
          displayName: 'Gemini 3.8 Flash',
          description: 'Google Gemini 3.8 Flash high-efficiency multimodal model',
          supportedReasoningEfforts: [
            { reasoningEffort: 'low', description: 'Low reasoning effort' },
            { reasoningEffort: 'medium', description: 'Medium reasoning effort' },
            { reasoningEffort: 'high', description: 'High reasoning effort' }
          ],
          defaultReasoningEffort: 'medium',
          isDefault: false
        },
        {
          id: 'claude-opus-5-5',
          displayName: 'Claude Opus 5.5',
          description: 'Anthropic Claude Opus 5.5 deep architecture & reasoning',
          supportedReasoningEfforts: [
            { reasoningEffort: 'low', description: 'Low reasoning effort' },
            { reasoningEffort: 'medium', description: 'Medium reasoning effort' },
            { reasoningEffort: 'high', description: 'High reasoning effort' }
          ],
          defaultReasoningEffort: 'medium',
          isDefault: false
        },
        {
          id: 'claude-sonnet-5-5',
          displayName: 'Claude Sonnet 5.5',
          description: 'Anthropic Claude Sonnet 5.5 balanced reasoning & coding',
          supportedReasoningEfforts: [
            { reasoningEffort: 'low', description: 'Low reasoning effort' },
            { reasoningEffort: 'medium', description: 'Medium reasoning effort' },
            { reasoningEffort: 'high', description: 'High reasoning effort' }
          ],
          defaultReasoningEffort: 'medium',
          isDefault: false
        },
        {
          id: 'gpt-oss-120b',
          displayName: 'GPT-OSS 120B',
          description: 'Open source 120B weights model',
          supportedReasoningEfforts: [
            { reasoningEffort: 'medium', description: 'Default effort' }
          ],
          defaultReasoningEffort: 'medium',
          isDefault: false
        }
      ]
    },
    env: { passthrough: ['GEMINI_API_KEY'] },
    deriveProviderOptions({ settings: currentSettings }) {
      const value = currentSettings.executable;
      const agyCommand = typeof value === 'string' && value.trim() ? value.trim() : 'agy';
      return {
        acpDialect: 'generic',
        acpLaunchSpec: {
          displayName: 'Antigravity',
          command: resolveNodeExecutable(),
          args: [ADAPTER_SCRIPT, agyCommand],
          env: {
            AGY_EXECUTABLE: agyCommand
          }
        }
      };
    }
  });

  // 3. Doctor RPC for Setup UI in Settings
  zcc.rpc.method('doctor:status', async (): Promise<DoctorStatusResult> => {
    const current = await settings.get();
    const executable = typeof current.executable === 'string' && current.executable.trim()
      ? current.executable.trim()
      : 'agy';

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
      zcc.log.debug(`Antigravity doctor probe failed for ${executable}: ${err?.message}`);
      return {
        installed: false,
        version: null,
        executable,
        error: err?.code === 'ENOENT'
          ? `Executable "${executable}" was not found in PATH.`
          : (err?.message || 'Failed to execute Antigravity CLI (agy).')
      };
    }
  });
}
