import { experimental_acpProviderBridge } from '@zana-ai/zcc-plugin-sdk/provider-bridge/acp';
import { experimental_defineProviderBridge } from '@zana-ai/zcc-plugin-sdk/provider-bridge';
import {
  DEFAULT_NATIVE_MODELS,
  getFastNativeReadiness,
  isValidGoogleAuthMethod,
  prepareSanitizedGeminiHome,
  type GoogleAcpAuthMethod
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

export function ensureLaunchSpec(params: any): boolean {
  if (!params || typeof params !== 'object') return false;
  let modified = false;

  const resolveAuthMethod = (providerOptions?: Record<string, any>): GoogleAcpAuthMethod =>
    isValidGoogleAuthMethod(providerOptions?.antigravityAuthMethod)
      ? providerOptions.antigravityAuthMethod
      : 'oauth-personal';

  if (params.options && typeof params.options === 'object') {
    const authMethod = resolveAuthMethod(params.options.providerOptions);
    if (!params.options.providerOptions) {
      params.options.providerOptions = {
        acpDialect: 'generic',
        parameterizedModelPicker: true,
        acpLaunchSpec: buildDefaultNativeLaunchSpec(authMethod)
      };
      modified = true;
    } else if (!params.options.providerOptions.acpLaunchSpec) {
      params.options.providerOptions.acpDialect =
        params.options.providerOptions.acpDialect || 'generic';
      params.options.providerOptions.parameterizedModelPicker = true;
      params.options.providerOptions.acpLaunchSpec = buildDefaultNativeLaunchSpec(authMethod);
      modified = true;
    } else {
      enrichLaunchSpecEnv(params.options.providerOptions.acpLaunchSpec, authMethod);
      modified = true;
    }
  }

  const rootAuthMethod = resolveAuthMethod(
    params.providerOptions ?? params.options?.providerOptions
  );
  if (!params.providerOptions) {
    params.providerOptions = {
      acpDialect: 'generic',
      parameterizedModelPicker: true,
      acpLaunchSpec: buildDefaultNativeLaunchSpec(rootAuthMethod)
    };
    modified = true;
  } else if (!params.providerOptions.acpLaunchSpec) {
    params.providerOptions.acpDialect = params.providerOptions.acpDialect || 'generic';
    params.providerOptions.parameterizedModelPicker = true;
    params.providerOptions.acpLaunchSpec = buildDefaultNativeLaunchSpec(rootAuthMethod);
    modified = true;
  } else {
    enrichLaunchSpecEnv(params.providerOptions.acpLaunchSpec, rootAuthMethod);
    modified = true;
  }

  return modified;
}

function writeBridgeJsonRpc(payload: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function handleNativeProviderHealth(id: string | number, params: any): void {
  const providerOptions = getProviderOptionsFromParams(params);
  const customCommand = providerOptions?.acpLaunchSpec?.command;
  const runtime = resolveNativeAcpRuntime({
    customExecutable: typeof customCommand === 'string' ? customCommand : undefined
  });

  if (!runtime.installed) {
    writeBridgeJsonRpc({
      jsonrpc: '2.0',
      id,
      result: {
        supported: true,
        health: {
          status: 'not_installed',
          statusMessage:
            !runtime.companionFilesPresent && runtime.missingCompanionFiles.length > 0
              ? `Missing companion file(s): ${runtime.missingCompanionFiles.join(', ')}`
              : `Native ACP runtime (v${PINNED_NATIVE_ACP_VERSION}) is not installed.`,
          accountEmail: null,
          planLabel: null,
          installedVersion: null,
          minimumSupportedVersion: PINNED_NATIVE_ACP_VERSION,
          canInstall: false,
          canUpdate: false,
          loginCommand: null
        }
      }
    });
    return;
  }

  const authMethod: GoogleAcpAuthMethod = isValidGoogleAuthMethod(
    providerOptions?.antigravityAuthMethod
  )
    ? providerOptions.antigravityAuthMethod
    : 'oauth-personal';

  const readiness = getFastNativeReadiness({
    command: runtime.executable,
    args: runtime.args,
    authMethod
  });

  if (readiness.state === 'sign_in_required') {
    writeBridgeJsonRpc({
      jsonrpc: '2.0',
      id,
      result: {
        supported: true,
        health: {
          status: 'unauthenticated',
          statusMessage:
            'Sign in required. Open Settings → Antigravity Provider to authenticate with Google.',
          accountEmail: null,
          planLabel: null,
          installedVersion: runtime.version ?? PINNED_NATIVE_ACP_VERSION,
          minimumSupportedVersion: PINNED_NATIVE_ACP_VERSION,
          canInstall: false,
          canUpdate: false,
          loginCommand: null
        }
      }
    });
    return;
  }

  writeBridgeJsonRpc({
    jsonrpc: '2.0',
    id,
    result: {
      supported: true,
      health: {
        status: 'ready',
        statusMessage: null,
        accountEmail: null,
        planLabel: readiness.tierName ?? null,
        installedVersion: runtime.version ?? PINNED_NATIVE_ACP_VERSION,
        minimumSupportedVersion: PINNED_NATIVE_ACP_VERSION,
        canInstall: false,
        canUpdate: false,
        loginCommand: null
      }
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

  const authMethod: GoogleAcpAuthMethod = isValidGoogleAuthMethod(
    providerOptions?.antigravityAuthMethod
  )
    ? providerOptions.antigravityAuthMethod
    : 'oauth-personal';

  const readiness = getFastNativeReadiness({
    command: runtime.executable,
    args: runtime.args,
    authMethod
  });

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

  const modelsToUse =
    readiness.models.length > 0 ? readiness.models : DEFAULT_NATIVE_MODELS;

  const mappedModels = modelsToUse.map((m, idx) => {
    const isSingleMedium = m.id.startsWith('gpt-oss-120b');
    return {
      id: m.id,
      model: m.id,
      displayName: m.name,
      description: m.description || `Google Antigravity Native ACP model (${m.id})`,
      supportedReasoningEfforts: isSingleMedium
        ? [{ reasoningEffort: 'medium', description: 'Default reasoning effort' }]
        : [
            { reasoningEffort: 'low', description: 'Low reasoning effort' },
            { reasoningEffort: 'medium', description: 'Medium reasoning effort' },
            { reasoningEffort: 'high', description: 'High reasoning effort' }
          ],
      defaultReasoningEffort: 'medium',
      isDefault: idx === 0
    };
  });

  writeBridgeJsonRpc({
    jsonrpc: '2.0',
    id,
    result: {
      models: mappedModels,
      selectedOnlyModels: []
    }
  });
}

export function transformLegacyResumeForNative(msg: any): {
  rewritten: boolean;
} {
  if (!msg || msg.method !== 'thread/resume' || !msg.params) {
    return { rewritten: false };
  }
  const providerThreadId = msg.params.providerThreadId;
  if (typeof providerThreadId !== 'string' || !providerThreadId.startsWith('agy-')) {
    return { rewritten: false };
  }

  // Convert legacy synthetic CLI session resume into a fresh native session start
  delete msg.params.providerThreadId;
  msg.method = 'thread/start';
  return { rewritten: true };
}

export const experimental_providerBridge = experimental_defineProviderBridge({
  handleLine: (line: string) => {
    try {
      const msg = JSON.parse(line);
      if (msg && msg.params) {
        const modifiedLaunch = ensureLaunchSpec(msg.params);

        if (msg.method === 'provider/health' && msg.id !== undefined) {
          handleNativeProviderHealth(msg.id, msg.params);
          return;
        }

        if (msg.method === 'model/list' && msg.id !== undefined) {
          handleNativeModelList(msg.id, msg.params);
          return;
        }

        if (msg.method === 'thread/resume') {
          const handoff = transformLegacyResumeForNative(msg);
          if (handoff.rewritten) {
            return experimental_acpProviderBridge.handleLine(JSON.stringify(msg));
          }
        }

        if (modifiedLaunch) {
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
