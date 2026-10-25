import type { ZccPluginApi } from '@zana-ai/zcc-plugin-sdk/server';
import {
  clearCachedNativeReadiness,
  getFastNativeReadiness,
  GOOGLE_ACP_AUTH_METHODS,
  isValidGoogleAuthMethod,
  prepareSanitizedGeminiHome,
  probeNativeAcpReadiness,
  startNativeAcpSignIn,
  writeNativeAcpAuthType,
  type DiscoveredNativeModel,
  type GoogleAcpAuthMethod,
  type NativeSetupState
} from './src/native-auth.js';
import {
  installNativeAcpRuntime,
  PINNED_NATIVE_ACP_VERSION,
  resolveNativeAcpRuntime,
  rollbackNativeAcpRuntime
} from './src/native-runtime.js';

const ICON = './icons/antigravity.svg';

export interface DoctorStatusResult {
  installed: boolean;
  authenticated: boolean;
  ready: boolean;
  version: string | null;
  pinnedVersion: string;
  previousVersion: string | null;
  source: 'custom' | 'managed' | 'uninstalled';
  executable: string;
  companionFilesPresent: boolean;
  missingCompanionFiles: string[];
  state: NativeSetupState;
  authMethod: GoogleAcpAuthMethod;
  configuredAuthType: string | null;
  pendingAuthUrl: string | null;
  models: DiscoveredNativeModel[];
  modes: string[];
  tierName: string | null;
  disabledDeadMcpServers: string[];
  error?: string;
}

function normalizeAuthMethod(value: unknown): GoogleAcpAuthMethod {
  return isValidGoogleAuthMethod(value) ? value : 'oauth-personal';
}

function buildNativeLaunchSpec(options?: {
  customExecutable?: string | undefined;
  authMethod?: GoogleAcpAuthMethod;
}) {
  const authMethod = options?.authMethod ?? 'oauth-personal';
  const resolvedRuntime = resolveNativeAcpRuntime({
    customExecutable: options?.customExecutable
  });
  const sanitized = prepareSanitizedGeminiHome({ authMethod });

  const env: Record<string, string> = {
    BROWSER: 'echo',
    GEMINI_HOME: sanitized.geminiHome,
    AGY_ACP_AUTH_METHOD: authMethod
  };
  if (authMethod === 'gemini-api-key' && process.env.GEMINI_API_KEY) {
    env.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  }

  return {
    displayName: 'Antigravity',
    command: resolvedRuntime.executable,
    args: resolvedRuntime.args,
    env,
    nativeReasoning: {
      configId: 'thinking_level',
      supportedLevels: ['low', 'medium', 'high'] as const,
      defaultLevel: 'medium' as const
    }
  };
}

export default function plugin(zcc: ZccPluginApi) {
  let pendingAuthUrl: string | null = null;

  // 1. User-configurable Native ACP authentication and optional binary path override
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

  // 2. Register Google Native ACP thread provider for Zana
  zcc.agents.experimental_registerProvider({
    id: 'antigravity',
    displayName: 'Antigravity',
    icon: ICON,
    family: 'acp',
    experimental_visibility: 'installed',
    experimental_bridgeOptions: {
      acpDialect: 'generic',
      parameterizedModelPicker: true,
      acpLaunchSpec: initialLaunchSpec
    },
    strings: {
      signInHint:
        'Open Settings → Antigravity Provider and click "Sign In with Google" to authenticate.',
      expiredHint:
        'Your Antigravity sign-in expired. Open Settings → Antigravity Provider to re-authenticate.',
      installUrl: 'https://antigravity.google'
    },
    maintenance: {
      health: true,
      usage: false,
      installation: true
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
          id: 'gpt-oss-120b-medium',
          displayName: 'GPT-OSS 120B (Medium)',
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
      const authMethod = normalizeAuthMethod(currentSettings.authMethod);
      const customNativeExe =
        typeof currentSettings.nativeExecutable === 'string' &&
        currentSettings.nativeExecutable.trim()
          ? currentSettings.nativeExecutable.trim()
          : undefined;

      return {
        acpDialect: 'generic',
        antigravityAuthMethod: authMethod,
        parameterizedModelPicker: true,
        acpLaunchSpec: buildNativeLaunchSpec({
          customExecutable: customNativeExe,
          authMethod
        })
      };
    }
  });

  async function buildDoctorStatus(options?: {
    probeNative?: boolean;
    forceRefresh?: boolean;
  }): Promise<DoctorStatusResult> {
    const current = await settings.get();
    const authMethod = normalizeAuthMethod(current.authMethod);
    const customNativeExe =
      typeof current.nativeExecutable === 'string' && current.nativeExecutable.trim()
        ? current.nativeExecutable.trim()
        : undefined;

    const runtime = resolveNativeAcpRuntime({
      customExecutable: customNativeExe
    });

    if (!runtime.installed) {
      const sanitized = prepareSanitizedGeminiHome({ authMethod });
      const missingCompanionError =
        !runtime.companionFilesPresent && runtime.missingCompanionFiles.length > 0
          ? `Native ACP archive is incomplete: missing companion file(s) ${runtime.missingCompanionFiles.join(', ')}.`
          : undefined;
      return {
        installed: false,
        authenticated: false,
        ready: false,
        version: runtime.version,
        pinnedVersion: PINNED_NATIVE_ACP_VERSION,
        previousVersion: runtime.previousVersion,
        source: runtime.source,
        executable: runtime.executable,
        companionFilesPresent: runtime.companionFilesPresent,
        missingCompanionFiles: runtime.missingCompanionFiles,
        state: 'runtime_missing',
        authMethod,
        configuredAuthType: null,
        pendingAuthUrl,
        models: [],
        modes: [],
        tierName: null,
        disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
        error:
          missingCompanionError ||
          `Native ACP runtime (v${PINNED_NATIVE_ACP_VERSION}) is not installed on this host.`
      };
    }

    const readiness = options?.probeNative
      ? await probeNativeAcpReadiness({
          command: runtime.executable,
          args: runtime.args,
          authMethod,
          forceRefresh: options?.forceRefresh
        })
      : getFastNativeReadiness({
          command: runtime.executable,
          args: runtime.args,
          authMethod
        });

    const authenticated =
      readiness.state === 'authenticated' || readiness.state === 'session_ready';
    const ready = readiness.state === 'session_ready';

    return {
      installed: true,
      authenticated,
      ready,
      version: readiness.agentVersion ?? runtime.version ?? PINNED_NATIVE_ACP_VERSION,
      pinnedVersion: PINNED_NATIVE_ACP_VERSION,
      previousVersion: runtime.previousVersion,
      source: runtime.source,
      executable: runtime.executable,
      companionFilesPresent: runtime.companionFilesPresent,
      missingCompanionFiles: runtime.missingCompanionFiles,
      state: readiness.state,
      authMethod,
      configuredAuthType: readiness.configuredAuthType,
      pendingAuthUrl,
      models: readiness.models,
      modes: readiness.modes,
      tierName: readiness.tierName ?? null,
      disabledDeadMcpServers: readiness.disabledDeadMcpServers ?? [],
      ...(readiness.error ? { error: readiness.error } : {})
    };
  }

  // 3. Doctor RPC for Setup UI in Settings
  zcc.rpc.method('doctor:status', async (args: unknown): Promise<DoctorStatusResult> => {
    const opts = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    return buildDoctorStatus({
      probeNative: Boolean(opts.probeNative),
      forceRefresh: Boolean(opts.forceRefresh)
    });
  });

  // 4. Managed Native ACP Runtime Installation & Rollback RPCs
  zcc.rpc.method('runtime:install', async (): Promise<DoctorStatusResult> => {
    zcc.log.info(`Installing Google Native ACP runtime v${PINNED_NATIVE_ACP_VERSION}...`);
    await installNativeAcpRuntime();
    clearCachedNativeReadiness();
    return buildDoctorStatus({ probeNative: false, forceRefresh: true });
  });

  zcc.rpc.method('runtime:rollback', async (): Promise<DoctorStatusResult> => {
    zcc.log.info('Rolling back Google Native ACP runtime to previous version...');
    rollbackNativeAcpRuntime();
    clearCachedNativeReadiness();
    return buildDoctorStatus({ probeNative: false, forceRefresh: true });
  });

  // 5. Interactive Native ACP Authentication RPCs
  zcc.rpc.method('auth:login', async (args: unknown): Promise<DoctorStatusResult> => {
    const current = await settings.get();
    const reqObj = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    const authMethod = normalizeAuthMethod(reqObj.authMethod ?? current.authMethod);
    const customNativeExe =
      typeof current.nativeExecutable === 'string' && current.nativeExecutable.trim()
        ? current.nativeExecutable.trim()
        : undefined;

    const runtime = resolveNativeAcpRuntime({ customExecutable: customNativeExe });
    if (!runtime.installed) {
      throw new Error(
        `Native ACP runtime is not installed. Click "Install Native ACP Runtime (v${PINNED_NATIVE_ACP_VERSION})" first.`
      );
    }

    pendingAuthUrl = null;
    try {
      await startNativeAcpSignIn({
        command: runtime.executable,
        args: runtime.args,
        authMethod,
        onAuthUrl: (url) => {
          pendingAuthUrl = url;
        }
      });
    } finally {
      pendingAuthUrl = null;
    }

    return buildDoctorStatus({ probeNative: false });
  });

  zcc.rpc.method('auth:logout', async (): Promise<DoctorStatusResult> => {
    writeNativeAcpAuthType(null);
    clearCachedNativeReadiness();
    return buildDoctorStatus({ probeNative: false, forceRefresh: true });
  });
}
