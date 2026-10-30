import { experimental_acpProviderBridge } from '@zana-ai/zcc-plugin-sdk/provider-bridge/acp';
import { experimental_defineProviderBridge } from '@zana-ai/zcc-plugin-sdk/provider-bridge';
import {
  getFastNativeReadiness,
  prepareSanitizedGeminiHome,
  queryNativeUsage,
  resolveNativeCatalog,
  type GoogleAcpAuthMethod,
  type NativeReadinessResult
} from './src/native-auth.js';
import { PINNED_NATIVE_ACP_VERSION } from './src/native-runtime.js';
import {
  buildNativeLaunchSpec,
  completeLaunchSpec,
  healthFromReadiness,
  modelListFromReadiness,
  modelListNotInstalled,
  normalizeAuthMethod,
  normalizeExecutable,
  resolveRuntime,
  type JsonRpcOutcome
} from './src/provider-config.js';

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

function resolveAuthMethod(providerOptions?: Record<string, any>): GoogleAcpAuthMethod {
  return normalizeAuthMethod(providerOptions?.antigravityAuthMethod);
}

/** The runtime a request targets: its launch spec's command, else the managed installation. */
function resolveRequestRuntime(providerOptions?: Record<string, any>) {
  return resolveRuntime(normalizeExecutable(providerOptions?.acpLaunchSpec?.command));
}

function normalizeLaunchInOptionsContainer(
  container: Record<string, any>,
  authMethod: GoogleAcpAuthMethod,
  prepareHome: () => ReturnType<typeof prepareSanitizedGeminiHome>
): boolean {
  if (!container.providerOptions) {
    container.providerOptions = {
      acpDialect: 'generic',
      parameterizedModelPicker: true,
      acpLaunchSpec: buildNativeLaunchSpec({ authMethod, home: prepareHome() })
    };
    return true;
  }
  const po = container.providerOptions;
  if (!po.acpLaunchSpec) {
    po.acpDialect = po.acpDialect || 'generic';
    po.parameterizedModelPicker = true;
    po.acpLaunchSpec = buildNativeLaunchSpec({ authMethod, home: prepareHome() });
    return true;
  }
  return completeLaunchSpec(po.acpLaunchSpec, authMethod, prepareHome());
}

export function ensureLaunchSpec(params: any): boolean {
  if (!params || typeof params !== 'object') return false;
  let modified = false;
  const homes = new Map<GoogleAcpAuthMethod, ReturnType<typeof prepareSanitizedGeminiHome>>();
  // Prepare the managed home once per message and auth method.
  const homeFor = (authMethod: GoogleAcpAuthMethod) => () => {
    if (!homes.has(authMethod)) homes.set(authMethod, prepareSanitizedGeminiHome({ authMethod }));
    return homes.get(authMethod)!;
  };

  if (params.options && typeof params.options === 'object') {
    const authMethod = resolveAuthMethod(params.options.providerOptions);
    modified = normalizeLaunchInOptionsContainer(params.options, authMethod, homeFor(authMethod)) || modified;
  }

  const rootAuthMethod = resolveAuthMethod(
    params.providerOptions ?? params.options?.providerOptions
  );
  modified = normalizeLaunchInOptionsContainer(params, rootAuthMethod, homeFor(rootAuthMethod)) || modified;
  return modified;
}

function writeBridgeJsonRpc(payload: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function writeOutcome(id: string | number, outcome: JsonRpcOutcome): void {
  writeBridgeJsonRpc({ jsonrpc: '2.0', id, ...outcome });
}

function handleNativeProviderHealth(id: string | number, params: any): void {
  const providerOptions = getProviderOptionsFromParams(params);
  const runtime = resolveRequestRuntime(providerOptions);
  const readiness = runtime.installed
    ? getFastNativeReadiness({ command: runtime.executable, args: runtime.args, authMethod: resolveAuthMethod(providerOptions) })
    : undefined;
  writeBridgeJsonRpc({
    jsonrpc: '2.0',
    id,
    result: {
      supported: true,
      health: {
        ...healthFromReadiness(runtime, readiness),
        accountEmail: null,
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
  const runtime = resolveRequestRuntime(providerOptions);
  if (!runtime.installed) {
    writeOutcome(id, modelListNotInstalled());
    return;
  }
  const catalog = resolveNativeCatalog({ command: runtime.executable, args: runtime.args,
    authMethod: resolveAuthMethod(providerOptions), forceRefresh: params?.forceRefresh === true });
  // Answer settled catalogs synchronously.
  if (!(catalog instanceof Promise)) {
    writeOutcome(id, modelListFromReadiness(catalog));
    return;
  }
  void catalog.then((result: NativeReadinessResult) => writeOutcome(id, modelListFromReadiness(result)))
    .catch(error => writeBridgeError(id, error));
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

function writeBridgeError(id: string | number, error: unknown): void {
  writeBridgeJsonRpc({ jsonrpc: '2.0', id,
    error: { code: -32000, message: error instanceof Error ? error.message : String(error) } });
}

/** Answer a locally handled request with an error instead of letting a setup throw reach the ACP bridge. */
function runLocalHandler(id: string | number, handler: () => void): { handled: true; rewritten: false } {
  try {
    handler();
  } catch (error) {
    writeBridgeError(id, error);
  }
  return { handled: true, rewritten: false };
}

function dispatchBridgeMessage(msg: any): { handled: boolean; rewritten: boolean } {
  if (msg.method === 'provider/usage' && msg.id !== undefined) {
    return runLocalHandler(msg.id, () => {
      const options = getProviderOptionsFromParams(msg.params);
      const runtime = resolveRequestRuntime(options);
      void queryNativeUsage({ command: runtime.executable, args: runtime.args, authMethod: resolveAuthMethod(options) })
        .then(result => writeBridgeJsonRpc({ jsonrpc: '2.0', id: msg.id, result }))
        .catch(error => writeBridgeError(msg.id, error));
    });
  }
  if (msg.method === 'provider/health' && msg.id !== undefined) {
    return runLocalHandler(msg.id, () => handleNativeProviderHealth(msg.id, msg.params));
  }
  if (msg.method === 'model/list' && msg.id !== undefined) {
    return runLocalHandler(msg.id, () => handleNativeModelList(msg.id, msg.params));
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
