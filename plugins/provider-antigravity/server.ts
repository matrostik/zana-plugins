import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import {
  clearCachedNativeReadiness,
  getFastNativeReadiness,
  getNativeCatalog,
  getNativeCredentialId,
  GOOGLE_ACP_AUTH_METHODS,
  prepareSanitizedGeminiHome,
  probeNativeAcpReadiness,
  queryNativeUsage,
  startNativeAcpSignIn,
  writeNativeAcpAuthType
} from './src/native-auth.js';
import {
  installNativeAcpRuntime,
  PINNED_NATIVE_ACP_VERSION,
  rollbackNativeAcpRuntime
} from './src/native-runtime.js';
import {
  buildNativeLaunchSpec,
  doctorStatus,
  normalizeAuthMethod,
  readProviderSettings,
  resolveRuntime,
  type DoctorStatusResult
} from './src/provider-config.js';

export type { DoctorStatusResult } from './src/provider-config.js';

const ICON = './icons/antigravity.svg';

const ANTIGRAVITY_CAPABILITIES = {
  supportsServiceTier: false,
  supportsNativeUserQuestion: false,
  fork: 'none' as const,
  supportsManualCompaction: false,
  supportsThreadArchive: false,
  supportsThreadRename: false,
  supportsWorkflows: false,
  permissionModes: ['accept-edits', 'full'],
  reasoningLevels: ['low', 'medium', 'high']
};

function getProviderRegistrationConfig(initialLaunchSpec: ReturnType<typeof buildNativeLaunchSpec>) {
  return {
    id: 'antigravity',
    displayName: 'Antigravity',
    icon: ICON,
    family: 'acp',
    experimental_visibility: 'installed' as const,
    experimental_bridgeOptions: {
      acpDialect: 'generic',
      parameterizedModelPicker: true,
      acpLaunchSpec: initialLaunchSpec
    },
    strings: {
      signInHint: 'Open the thread side panel → Antigravity account and click "Reconnect Antigravity" to sign in.',
      expiredHint: 'Your Antigravity sign-in needs attention. Open the thread side panel → Antigravity account to reconnect.',
      installUrl: 'https://antigravity.google'
    },
    maintenance: { health: true, usage: true, installation: true },
    capabilities: ANTIGRAVITY_CAPABILITIES,
    reasoningLevels: [
      { id: 'low', label: 'Low Effort' },
      { id: 'medium', label: 'Medium Effort' },
      { id: 'high', label: 'High Effort' }
    ],
    // Zana itself prefixes Plan turns with a `/plan` command mention for providers declaring this
    // action; the native ACP server handles `/plan` as its own slash command, so no host mapping is needed.
    composerActions: ['plan'],
    models: {
      scope: 'host' as const
    },
    env: { passthrough: ['GEMINI_API_KEY'] }
  };
}

async function buildDoctorStatus(
  settings: any,
  options?: { probeNative?: boolean; catalog?: boolean; forceRefresh?: boolean },
  pendingAuthUrl: string | null = null
): Promise<DoctorStatusResult> {
  const { authMethod, customExecutable } = readProviderSettings(await settings.get());
  const runtime = resolveRuntime(customExecutable);
  if (!runtime.installed) {
    return doctorStatus(runtime, { authMethod, pendingAuthUrl,
      disabledDeadMcpServers: prepareSanitizedGeminiHome({ authMethod }).disabledDeadMcpServers });
  }

  const target = { command: runtime.executable, args: runtime.args, authMethod };
  const readiness = options?.catalog ? await getNativeCatalog({ ...target, forceRefresh: options.forceRefresh }) : options?.probeNative
    ? await probeNativeAcpReadiness({ ...target, forceRefresh: options?.forceRefresh })
    : getFastNativeReadiness(target);
  return doctorStatus(runtime, { authMethod, pendingAuthUrl, readiness, credentialId: getNativeCredentialId(authMethod) });
}

async function handleAuthLogin(
  settings: any,
  args: unknown,
  state: { getPendingAuthUrl: () => string | null; setPendingAuthUrl: (url: string | null) => void }
): Promise<DoctorStatusResult> {
  const current = await settings.get();
  const reqObj = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
  const authMethod = normalizeAuthMethod(reqObj.authMethod ?? current.authMethod);
  const runtime = resolveRuntime(readProviderSettings(current).customExecutable);
  if (!runtime.installed) {
    throw new Error(
      `Native ACP runtime is not installed. Click "Install Native ACP Runtime (v${PINNED_NATIVE_ACP_VERSION})" first.`
    );
  }

  state.setPendingAuthUrl(null);
  let signInResult;
  try {
    signInResult = await startNativeAcpSignIn({
      command: runtime.executable,
      args: runtime.args,
      authMethod,
      onAuthUrl: (url) => state.setPendingAuthUrl(url)
    });
  } finally {
    state.setPendingAuthUrl(null);
  }

  if (signInResult.state !== 'session_ready') {
    throw new Error(signInResult.error || 'Interactive Google sign-in failed or timed out.');
  }

  return doctorStatus(runtime, { authMethod, pendingAuthUrl: null, readiness: signInResult,
    credentialId: getNativeCredentialId(authMethod) });
}

function registerRpcMethods(
  zcc: ZccPluginApi,
  settings: any,
  state: { getPendingAuthUrl: () => string | null; setPendingAuthUrl: (url: string | null) => void }
) {
  let recovery: Promise<DoctorStatusResult> | null = null;
  zcc.rpc.method('auth:recover', (args: unknown) => {
    if (!recovery) {
      const forceRefresh = !!args && typeof args === 'object' && (args as Record<string, unknown>).forceRefresh === true;
      recovery = buildDoctorStatus(settings, { catalog: true, forceRefresh })
        .finally(() => { recovery = null; });
    }
    return recovery;
  });
  zcc.rpc.method('usage:status', async () => {
    const { authMethod, customExecutable } = readProviderSettings(await settings.get());
    const runtime = resolveRuntime(customExecutable);
    return queryNativeUsage({ command: runtime.executable, args: runtime.args, authMethod });
  });
  zcc.rpc.method('doctor:status', async (args: unknown): Promise<DoctorStatusResult> => {
    const opts = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    return buildDoctorStatus(settings, {
      probeNative: Boolean(opts.probeNative),
      forceRefresh: Boolean(opts.forceRefresh)
    }, state.getPendingAuthUrl());
  });

  zcc.rpc.method('runtime:install', async (): Promise<DoctorStatusResult> => {
    zcc.log.info(`Installing Google Native ACP runtime v${PINNED_NATIVE_ACP_VERSION}...`);
    await installNativeAcpRuntime();
    clearCachedNativeReadiness();
    return buildDoctorStatus(settings, { probeNative: false, forceRefresh: true });
  });

  zcc.rpc.method('runtime:rollback', async (): Promise<DoctorStatusResult> => {
    zcc.log.info('Rolling back Google Native ACP runtime to previous version...');
    rollbackNativeAcpRuntime();
    clearCachedNativeReadiness();
    return buildDoctorStatus(settings, { probeNative: false, forceRefresh: true });
  });

  let login: Promise<DoctorStatusResult> | null = null;
  zcc.rpc.method('auth:login', (args: unknown) => {
    if (!login) login = handleAuthLogin(settings, args, state).finally(() => { login = null; });
    return login;
  });

  zcc.rpc.method('auth:logout', async (): Promise<DoctorStatusResult> => {
    writeNativeAcpAuthType(null);
    return buildDoctorStatus(settings, { probeNative: false, forceRefresh: true });
  });
}

export default function plugin(zcc: ZccPluginApi) {
  let pendingAuthUrl: string | null = null;
  const state = {
    getPendingAuthUrl: () => pendingAuthUrl,
    setPendingAuthUrl: (url: string | null) => { pendingAuthUrl = url; }
  };

  const settings = zcc.settings.define({
    authMethod: {
      type: 'string',
      label: 'Google ACP authentication method',
      options: [...GOOGLE_ACP_AUTH_METHODS],
      default: 'oauth-personal',
      description:
        'Authentication method for Google Native ACP (oauth-personal for Google AI subscriptions, oauth-business for Gemini Enterprise, gemini-api-key, or agent-platform).'
    },
    nativeExecutable: {
      type: 'string',
      label: 'Native ACP server executable override',
      default: '',
      description:
        'Optional absolute path to agy_acp_server. Leave blank to use the managed installation (~/.zcc/runtimes/antigravity-acp).'
    }
  });

  const initialLaunchSpec = buildNativeLaunchSpec();
  const providerConfig = getProviderRegistrationConfig(initialLaunchSpec);

  zcc.agents.experimental_registerProvider({
    ...providerConfig,
    deriveProviderOptions({ settings: currentSettings }) {
      const { authMethod, customExecutable } = readProviderSettings(currentSettings);
      return {
        acpDialect: 'generic',
        antigravityAuthMethod: authMethod,
        parameterizedModelPicker: true,
        acpLaunchSpec: buildNativeLaunchSpec({ customExecutable, authMethod })
      };
    }
  });

  registerRpcMethods(zcc, settings, state);
}
