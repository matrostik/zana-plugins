import { experimental_acpProviderBridge } from '@zana-ai/zcc-plugin-sdk/provider-bridge/acp';
import { experimental_defineProviderBridge } from '@zana-ai/zcc-plugin-sdk/provider-bridge';
import {
  getFastNativeReadiness,
  getNativeCatalog,
  isNativeCatalogSettled,
  queryNativeUsage,
  isValidGoogleAuthMethod,
  prepareSanitizedGeminiHome,
  type DiscoveredNativeModel,
  type GoogleAcpAuthMethod,
  type NativeReadinessResult
} from './src/native-auth.js';
import {
  PINNED_NATIVE_ACP_VERSION,
  resolveNativeAcpRuntime
} from './src/native-runtime.js';

function buildDefaultNativeLaunchSpec(authMethod: GoogleAcpAuthMethod = 'oauth-personal') {
  const runtime = resolveNativeAcpRuntime();
  const sanitized = prepareSanitizedGeminiHome({ authMethod });
  return {
    displayName: 'Antigravity',
    command: runtime.executable,
    args: runtime.args,
    env: {
      BROWSER: 'echo',
      GEMINI_HOME: sanitized.geminiHome,
      AGY_ACP_AUTH_METHOD: authMethod
    },
    nativeReasoning: {
      configId: 'thinking_level',
      supportedLevels: ['low', 'medium', 'high'],
      defaultLevel: 'medium'
    }
  };
}

function getProviderOptionsFromParams(params: any): Record<string, any> | undefined {
  if (!params || typeof params !== 'object') return undefined;
  if (params.options?.providerOptions && typeof params.options.providerOptions === 'object') {
    return params.options.providerOptions;
  }
  if (params.providerOptions && typeof params.providerOptions === 'object') {
    return params.providerOptions;
  }
  return undefined;
}

function enrichLaunchSpecEnv(spec: Record<string, any>, authMethod: GoogleAcpAuthMethod): void {
  const sanitized = prepareSanitizedGeminiHome({ authMethod });
  spec.env = {
    BROWSER: 'echo',
    GEMINI_HOME: sanitized.geminiHome,
    AGY_ACP_AUTH_METHOD: authMethod,
    ...(spec.env && typeof spec.env === 'object' ? spec.env : {})
  };
  if (!spec.env.GEMINI_HOME) {
    spec.env.GEMINI_HOME = sanitized.geminiHome;
  }
  if (!spec.nativeReasoning) {
    spec.nativeReasoning = {
      configId: 'thinking_level',
      supportedLevels: ['low', 'medium', 'high'],
      defaultLevel: 'medium'
    };
  }
}

function resolveAuthMethod(providerOptions?: Record<string, any>): GoogleAcpAuthMethod {
  return isValidGoogleAuthMethod(providerOptions?.antigravityAuthMethod)
    ? providerOptions.antigravityAuthMethod
    : 'oauth-personal';
}

function normalizeLaunchInOptionsContainer(
  container: Record<string, any>,
  authMethod: GoogleAcpAuthMethod
): boolean {
  if (!container.providerOptions) {
    container.providerOptions = {
      acpDialect: 'generic',
      parameterizedModelPicker: true,
      acpLaunchSpec: buildDefaultNativeLaunchSpec(authMethod)
    };
    return true;
  }
  const po = container.providerOptions;
  if (!po.acpLaunchSpec) {
    po.acpDialect = po.acpDialect || 'generic';
    po.parameterizedModelPicker = true;
    po.acpLaunchSpec = buildDefaultNativeLaunchSpec(authMethod);
    return true;
  }
  enrichLaunchSpecEnv(po.acpLaunchSpec, authMethod);
  return true;
}

export function ensureLaunchSpec(params: any): boolean {
  if (!params || typeof params !== 'object') return false;
  let modified = false;

  if (params.options && typeof params.options === 'object') {
    const authMethod = resolveAuthMethod(params.options.providerOptions);
    modified = normalizeLaunchInOptionsContainer(params.options, authMethod) || modified;
  }

  const rootAuthMethod = resolveAuthMethod(
    params.providerOptions ?? params.options?.providerOptions
  );
  modified = normalizeLaunchInOptionsContainer(params, rootAuthMethod) || modified;
  return modified;
}

function writeBridgeJsonRpc(payload: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function sendHealthResponse(
  id: string | number,
  status: 'not_installed' | 'unauthenticated' | 'ready' | 'unknown',
  statusMessage: string | null,
  planLabel: string | null,
  version: string | null
): void {
  writeBridgeJsonRpc({
    jsonrpc: '2.0',
    id,
    result: {
      supported: true,
      health: {
        status,
        statusMessage,
        accountEmail: null,
        planLabel,
        installedVersion: version,
        minimumSupportedVersion: PINNED_NATIVE_ACP_VERSION,
        canInstall: false,
        canUpdate: false,
        loginCommand: null
      }
    }
  });
}

function formatNonReadyHealthMessage(readiness: NativeReadinessResult): string {
  if (readiness.error) {
    return readiness.error;
  }
  if (readiness.state === 'sign_in_required') {
    return 'Sign in required. Open Settings → Antigravity Provider to authenticate with Google.';
  }
  if (readiness.state === 'authenticated') {
    return 'Local credentials present, but Native ACP session is not verified. Run "Verify Session & Models" in Settings → Antigravity Provider.';
  }
  return 'Native ACP runtime launched, but session readiness is not verified. Run "Verify Session & Models" in Settings → Antigravity Provider.';
}

function handleNativeProviderHealth(id: string | number, params: any): void {
  const providerOptions = getProviderOptionsFromParams(params);
  const customCommand = providerOptions?.acpLaunchSpec?.command;
  const runtime = resolveNativeAcpRuntime({
    customExecutable: typeof customCommand === 'string' ? customCommand : undefined
  });

  if (!runtime.installed) {
    const msg = !runtime.companionFilesPresent && runtime.missingCompanionFiles.length > 0
      ? `Missing companion file(s): ${runtime.missingCompanionFiles.join(', ')}`
      : `Native ACP runtime (v${PINNED_NATIVE_ACP_VERSION}) is not installed.`;
    sendHealthResponse(id, 'not_installed', msg, null, null);
    return;
  }

  const authMethod = resolveAuthMethod(providerOptions);
  const readiness = getFastNativeReadiness({
    command: runtime.executable,
    args: runtime.args,
    authMethod
  });

  if (readiness.state === 'runtime_missing') {
    sendHealthResponse(
      id,
      'not_installed',
      readiness.error || `Native ACP runtime (v${PINNED_NATIVE_ACP_VERSION}) is not installed.`,
      null,
      null
    );
    return;
  }

  const reportedVersion = readiness.agentVersion ?? runtime.version ?? PINNED_NATIVE_ACP_VERSION;
  if (readiness.state !== 'session_ready') {
    sendHealthResponse(
      id,
      readiness.state === 'sign_in_required' ? 'unauthenticated' : 'unknown',
      formatNonReadyHealthMessage(readiness),
      readiness.tierName ?? null,
      reportedVersion
    );
    return;
  }

  sendHealthResponse(id, 'ready', null, readiness.tierName ?? null, reportedVersion);
}

function formatEffortDescription(level: string): string {
  const capitalized = level.charAt(0).toUpperCase() + level.slice(1);
  return `${capitalized} reasoning effort`;
}

function mapDiscoveredModels(models: DiscoveredNativeModel[], stale = false) {
  return models.map((m, idx) => {
    const levels = Array.isArray(m.supportedReasoningEfforts)
      ? m.supportedReasoningEfforts.filter((l): l is string => typeof l === 'string' && l.length > 0)
      : [];
    const supportedReasoningEfforts = levels.map((level) => ({
      reasoningEffort: level,
      description: formatEffortDescription(level)
    }));
    const defaultReasoningEffort =
      levels.length > 0
        ? m.defaultReasoningEffort && levels.includes(m.defaultReasoningEffort)
          ? m.defaultReasoningEffort
          : levels[0]
        : undefined;
    return {
      id: m.id,
      model: m.id,
      displayName: stale ? `${m.name} (cached)` : m.name,
      description: m.description || `Google Antigravity Native ACP model (${m.id})`,
      supportedReasoningEfforts,
      ...(defaultReasoningEffort ? { defaultReasoningEffort } : {}),
      isDefault: idx === 0
    };
  });
}

function sendModelListError(
  id: string | number,
  readiness: NativeReadinessResult
): void {
  if (readiness.state === 'sign_in_required') {
    const authMessage =
      readiness.error ||
      'Google Antigravity Native ACP is not authenticated. Open Settings → Antigravity Provider to sign in.';
    writeBridgeJsonRpc({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: authMessage,
        data: {
          recovery: {
            kind: 'authRequired',
            message: authMessage,
            retryable: false
          }
        }
      }
    });
    return;
  }
  writeBridgeJsonRpc({
    jsonrpc: '2.0',
    id,
    error: {
      code: -32000,
      message:
        readiness.error ||
        'No models discovered from Google Antigravity Native ACP session. Run "Verify Session & Models" in Settings → Antigravity Provider.'
    }
  });
}

function handleNativeModelList(id: string | number, params: any): void {
  const providerOptions = getProviderOptionsFromParams(params);
  const customCommand = providerOptions?.acpLaunchSpec?.command;
  const runtime = resolveNativeAcpRuntime({
    customExecutable: typeof customCommand === 'string' ? customCommand : undefined
  });

  if (!runtime.installed) {
    writeBridgeJsonRpc({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: `Google Antigravity Native ACP runtime (v${PINNED_NATIVE_ACP_VERSION}) is not installed on this host. Install it in Settings → Antigravity Provider.`
      }
    });
    return;
  }

  const authMethod = resolveAuthMethod(providerOptions);
  const forceRefresh = params?.forceRefresh === true;
  const readiness = getFastNativeReadiness({
    command: runtime.executable,
    args: runtime.args,
    authMethod
  });

  const respond = (result: NativeReadinessResult) => {
    if (result.models.length === 0 || result.state === 'sign_in_required') {
      sendModelListError(id, result);
      return;
    }
    writeBridgeJsonRpc({
      jsonrpc: '2.0',
      id,
      result: {
        models: mapDiscoveredModels(result.models, result.catalogStale),
        selectedOnlyModels: [],
        _meta: { checkedAt: result.checkedAt, stale: result.catalogStale === true,
          ...(result.error ? { warning: result.error } : {}) }
      }
    });
  };
  // Answer cached catalogs synchronously; the settle policy itself lives in native-auth.
  if (isNativeCatalogSettled(readiness, forceRefresh)) {
    respond(readiness);
    return;
  }
  void getNativeCatalog({ command: runtime.executable, args: runtime.args, authMethod,
    forceRefresh }).then(respond).catch(error => {
      sendModelListError(id, { ...readiness, error: error instanceof Error ? error.message : String(error) });
    });
}

export function isLegacyAgyThreadResume(msg: any): string | null {
  if (!msg || msg.method !== 'thread/resume' || !msg.params) return null;
  const providerThreadId = msg.params.providerThreadId;
  if (typeof providerThreadId === 'string' && providerThreadId.startsWith('agy-')) {
    return providerThreadId;
  }
  return null;
}

function extractLegacyHandoffContext(params: any): string | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const raw = params.handoffContext ?? params.contextSummary ?? params.initialContext;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function isExplicitLegacyMigrationAllowed(params: any, handoffContext?: string): boolean {
  if (handoffContext) return true;
  if (!params || typeof params !== 'object') return false;
  return (
    params.allowFreshSession === true ||
    params.migrateLegacySession === true ||
    params.options?.providerOptions?.migrateLegacySession === true
  );
}

export function transformLegacyResumeForNative(msg: any): {
  rewritten: boolean;
  migrationRequired: boolean;
  legacyProviderThreadId?: string;
  handoffContext?: string;
} {
  const legacyId = isLegacyAgyThreadResume(msg);
  if (!legacyId) {
    return { rewritten: false, migrationRequired: false };
  }
  const handoffContext = extractLegacyHandoffContext(msg.params);
  if (isExplicitLegacyMigrationAllowed(msg.params, handoffContext)) {
    msg.method = 'thread/start';
    msg.params.migratedFromProviderThreadId = legacyId;
    delete msg.params.providerThreadId;
    if (handoffContext) {
      msg.params.handoffContext = handoffContext;
    }
    return {
      rewritten: true,
      migrationRequired: false,
      legacyProviderThreadId: legacyId,
      ...(handoffContext ? { handoffContext } : {})
    };
  }
  return {
    rewritten: false,
    migrationRequired: true,
    legacyProviderThreadId: legacyId
  };
}

function dispatchBridgeMessage(msg: any): { handled: boolean; rewritten: boolean } {
  if (msg.method === 'provider/usage' && msg.id !== undefined) {
    const options = getProviderOptionsFromParams(msg.params);
    const runtime = resolveNativeAcpRuntime({ customExecutable: options?.acpLaunchSpec?.command });
    void queryNativeUsage({ command: runtime.executable, args: runtime.args, authMethod: resolveAuthMethod(options) })
      .then(result => writeBridgeJsonRpc({ jsonrpc: '2.0', id: msg.id, result }))
      .catch(error => writeBridgeJsonRpc({ jsonrpc: '2.0', id: msg.id,
        error: { code: -32000, message: error instanceof Error ? error.message : String(error) } }));
    return { handled: true, rewritten: false };
  }
  if (msg.method === 'provider/health' && msg.id !== undefined) {
    handleNativeProviderHealth(msg.id, msg.params);
    return { handled: true, rewritten: false };
  }
  if (msg.method === 'model/list' && msg.id !== undefined) {
    handleNativeModelList(msg.id, msg.params);
    return { handled: true, rewritten: false };
  }
  if (msg.method === 'thread/resume') {
    const migration = transformLegacyResumeForNative(msg);
    if (migration.rewritten) {
      return { handled: false, rewritten: true };
    }
    if (migration.migrationRequired && migration.legacyProviderThreadId) {
      const legacyId = migration.legacyProviderThreadId;
      const message = `Resuming legacy Antigravity CLI session "${legacyId}" requires context handoff. Pass handoffContext or migrateLegacySession: true, or start a new thread to continue in Google Antigravity Native ACP.`;
      writeBridgeJsonRpc({
        jsonrpc: '2.0',
        id: msg.id,
        error: {
          code: -32000,
          message,
          data: {
            migrationRequired: true,
            legacyProviderThreadId: legacyId,
            recovery: {
              kind: 'migrationRequired',
              action: 'resumeWithHandoffContext',
              message,
              retryable: true
            }
          }
        }
      });
      return { handled: true, rewritten: false };
    }
  }
  return { handled: false, rewritten: false };
}

export const realAcpBridge = experimental_acpProviderBridge;

export const experimental_providerBridge = experimental_defineProviderBridge({
  handleLine: (line: string) => {
    try {
      const msg = JSON.parse(line);
      if (msg && typeof msg === 'object') {
        const modifiedLaunch = msg.params ? ensureLaunchSpec(msg.params) : false;
        const dispatched = dispatchBridgeMessage(msg);
        if (dispatched.handled) {
          return;
        }
        if (modifiedLaunch || dispatched.rewritten) {
          return experimental_acpProviderBridge.handleLine(JSON.stringify(msg));
        }
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
