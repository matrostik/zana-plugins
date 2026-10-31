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
  SIDE_PANEL_RECONNECT_HINT,
  type DoctorStatusResult
} from './src/provider-config.js';
import type { NativeReadinessResult } from './src/readiness-store.js';

export type { DoctorStatusResult } from './src/provider-config.js';

export type ReadinessMode = 'fast' | 'probe' | 'catalog';

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
      signInHint: `${SIDE_PANEL_RECONNECT_HINT.replace(/\.$/, '')} to sign in.`,
      expiredHint: `Your Antigravity sign-in needs attention. ${SIDE_PANEL_RECONNECT_HINT.replace(/\.$/, '')} to reconnect.`,
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
  options?: { mode?: ReadinessMode; forceRefresh?: boolean },
  pendingAuthUrl: string | null = null
): Promise<DoctorStatusResult> {
  const { authMethod, customExecutable } = readProviderSettings(await settings.get());
  const runtime = resolveRuntime(customExecutable);
  if (!runtime.installed) {
    return doctorStatus(runtime, { authMethod, pendingAuthUrl,
      disabledDeadMcpServers: prepareSanitizedGeminiHome({ authMethod }).disabledDeadMcpServers });
  }

  const target = { command: runtime.executable, args: runtime.args, authMethod };
  const mode: ReadinessMode = options?.mode ?? 'fast';

  let readiness: NativeReadinessResult;
  if (mode === 'catalog') {
    readiness = await getNativeCatalog({ ...target, forceRefresh: options?.forceRefresh });
  } else if (mode === 'probe') {
    readiness = await probeNativeAcpReadiness({ ...target, forceRefresh: options?.forceRefresh });
  } else {
    readiness = getFastNativeReadiness(target);
  }

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

function createRecoveryScheduler(settings: any) {
  let inFlightRecovery: { promise: Promise<DoctorStatusResult>; forced: boolean } | null = null;
  let nextForcedRecovery: Promise<DoctorStatusResult> | null = null;

  const startRecovery = (forced: boolean): Promise<DoctorStatusResult> => {
    const promise = buildDoctorStatus(settings, { mode: 'catalog', forceRefresh: forced })
      .finally(() => {
        if (inFlightRecovery?.promise === promise) {
          inFlightRecovery = null;
        }
      });
    inFlightRecovery = { promise, forced };
    return promise;
  };

  return function recover(args: unknown): Promise<DoctorStatusResult> {
    const forceRefresh = !!args && typeof args === 'object' && (args as Record<string, unknown>).forceRefresh === true;

    if (!forceRefresh) {
      if (nextForcedRecovery) return nextForcedRecovery;
      if (inFlightRecovery) return inFlightRecovery.promise;
      return startRecovery(false);
    }

    if (nextForcedRecovery) return nextForcedRecovery;
    if (inFlightRecovery?.forced) return inFlightRecovery.promise;
    if (inFlightRecovery) {
      const chained = inFlightRecovery.promise
        .catch(() => {})
        .then(() => startRecovery(true))
        .finally(() => {
          if (nextForcedRecovery === chained) {
            nextForcedRecovery = null;
          }
        });
      nextForcedRecovery = chained;
      return chained;
    }
    return startRecovery(true);
  };
}

function createLoginManager(
  settings: any,
  state: { getPendingAuthUrl: () => string | null; setPendingAuthUrl: (url: string | null) => void }
) {
  let inFlightLogin: {
    promise: Promise<DoctorStatusResult>;
    authMethodPromise: Promise<string>;
  } | null = null;

  return function login(args: unknown): Promise<DoctorStatusResult> {
    const reqObj = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    const requestedAuthMethodPromise = (async () => {
      if (reqObj.authMethod != null) return normalizeAuthMethod(reqObj.authMethod);
      const current = await settings.get();
      return normalizeAuthMethod(current?.authMethod);
    })();

    if (inFlightLogin) {
      const activeLogin = inFlightLogin;
      return (async () => {
        const [activeMethod, requestedMethod] = await Promise.all([
          activeLogin.authMethodPromise,
          requestedAuthMethodPromise
        ]);
        if (activeMethod !== requestedMethod) {
          throw new Error(
            `Cannot start sign-in for "${requestedMethod}" while sign-in for "${activeMethod}" is in progress.`
          );
        }
        return activeLogin.promise;
      })();
    }

    const currentRecord = {
      authMethodPromise: requestedAuthMethodPromise,
      promise: (async () => {
        const authMethod = await requestedAuthMethodPromise;
        return handleAuthLogin(settings, { ...reqObj, authMethod }, state);
      })().finally(() => {
        if (inFlightLogin === currentRecord) {
          inFlightLogin = null;
        }
      })
    };
    inFlightLogin = currentRecord;
    return currentRecord.promise;
  };
}

function registerRpcMethods(
  zcc: ZccPluginApi,
  settings: any,
  state: { getPendingAuthUrl: () => string | null; setPendingAuthUrl: (url: string | null) => void }
) {
  const recover = createRecoveryScheduler(settings);
  const login = createLoginManager(settings, state);

  zcc.rpc.method('auth:recover', (args: unknown) => recover(args));
  zcc.rpc.method('auth:login', (args: unknown) => login(args));

  zcc.rpc.method('usage:status', async () => {
    const { authMethod, customExecutable } = readProviderSettings(await settings.get());
    const runtime = resolveRuntime(customExecutable);
    return queryNativeUsage({ command: runtime.executable, args: runtime.args, authMethod });
  });

  zcc.rpc.method('doctor:status', async (args: unknown): Promise<DoctorStatusResult> => {
    const opts = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    return buildDoctorStatus(settings, {
      mode: opts.probeNative ? 'probe' : 'fast',
      forceRefresh: Boolean(opts.forceRefresh)
    }, state.getPendingAuthUrl());
  });

  zcc.rpc.method('runtime:install', async (): Promise<DoctorStatusResult> => {
    zcc.log.info(`Installing Google Native ACP runtime v${PINNED_NATIVE_ACP_VERSION}...`);
    await installNativeAcpRuntime();
    clearCachedNativeReadiness();
    return buildDoctorStatus(settings, { mode: 'fast', forceRefresh: true });
  });

  zcc.rpc.method('runtime:rollback', async (): Promise<DoctorStatusResult> => {
    zcc.log.info('Rolling back Google Native ACP runtime to previous version...');
    rollbackNativeAcpRuntime();
    clearCachedNativeReadiness();
    return buildDoctorStatus(settings, { mode: 'fast', forceRefresh: true });
  });

  zcc.rpc.method('auth:logout', async (): Promise<DoctorStatusResult> => {
    writeNativeAcpAuthType(null);
    return buildDoctorStatus(settings, { mode: 'fast', forceRefresh: true });
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
