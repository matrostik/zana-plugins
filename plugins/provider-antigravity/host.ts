import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_acpProviderBridge } from '@zana-ai/zcc-plugin-sdk/provider-bridge/acp';
import { experimental_defineProviderBridge } from '@zana-ai/zcc-plugin-sdk/provider-bridge';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function resolveAdapterScript(): string {
  const local = resolve(__dirname, 'agy-acp.mjs');
  if (existsSync(local)) return local;

  try {
    const installedPath = resolve(process.env.USERPROFILE || process.env.HOME || '', '.zcc/plugins/installed.json');
    if (existsSync(installedPath)) {
      const data = JSON.parse(readFileSync(installedPath, 'utf8'));
      const p = (data.plugins || []).find((x: any) => x.id === 'provider-antigravity');
      if (p && p.rootDir) {
        const candidate = resolve(p.rootDir, 'agy-acp.mjs');
        if (existsSync(candidate)) return candidate;
      }
    }
  } catch {
    // Ignore and fallback
  }

  const devPath = 'D:\\Dev\\code\\zana-plugins\\plugins\\provider-antigravity\\agy-acp.mjs';
  if (existsSync(devPath)) return devPath;

  return local;
}

const ADAPTER_SCRIPT = resolveAdapterScript();

const DEFAULT_ACP_LAUNCH_SPEC = {
  displayName: 'Antigravity',
  command: resolveNodeExecutable(),
  args: [ADAPTER_SCRIPT, 'agy'],
  env: {
    AGY_EXECUTABLE: 'agy'
  }
};

function ensureLaunchSpec(params: any): boolean {
  if (!params || typeof params !== 'object') return false;
  let modified = false;

  if (params.options) {
    if (!params.options.providerOptions) {
      params.options.providerOptions = {
        acpDialect: 'generic',
        acpLaunchSpec: DEFAULT_ACP_LAUNCH_SPEC
      };
      modified = true;
    } else if (!params.options.providerOptions.acpLaunchSpec) {
      params.options.providerOptions.acpDialect = params.options.providerOptions.acpDialect || 'generic';
      params.options.providerOptions.acpLaunchSpec = DEFAULT_ACP_LAUNCH_SPEC;
      modified = true;
    }
  }

  if (!params.providerOptions) {
    params.providerOptions = {
      acpDialect: 'generic',
      acpLaunchSpec: DEFAULT_ACP_LAUNCH_SPEC
    };
    modified = true;
  } else if (!params.providerOptions.acpLaunchSpec) {
    params.providerOptions.acpDialect = params.providerOptions.acpDialect || 'generic';
    params.providerOptions.acpLaunchSpec = DEFAULT_ACP_LAUNCH_SPEC;
    modified = true;
  }

  return modified;
}

export const experimental_providerBridge = experimental_defineProviderBridge({
  handleLine: (line: string) => {
    try {
      const msg = JSON.parse(line);
      if (msg && msg.params && ensureLaunchSpec(msg.params)) {
        return experimental_acpProviderBridge.handleLine(JSON.stringify(msg));
      }
    } catch {
      // Fall through on JSON parse error
    }
    return experimental_acpProviderBridge.handleLine(line);
  },
  start: (ctx) => experimental_acpProviderBridge.start?.(ctx),
  onClose: () => experimental_acpProviderBridge.onClose?.(),
  onSigterm: () => experimental_acpProviderBridge.onSigterm?.(),
  onSigint: () => experimental_acpProviderBridge.onSigint?.()
});
