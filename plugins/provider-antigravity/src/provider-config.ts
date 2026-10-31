import {
  isValidGoogleAuthMethod,
  prepareSanitizedGeminiHome,
  type GoogleAcpAuthMethod,
  type PreparedGeminiHome
} from './gemini-home.js';
import { PINNED_NATIVE_ACP_VERSION, resolveNativeAcpRuntime, type ResolvedNativeRuntime } from './native-runtime.js';
import type { DiscoveredNativeModel, NativeReadinessResult, NativeSetupState } from './readiness-store.js';

export const SIDE_PANEL_RECONNECT_HINT = 'Open the thread side panel → Antigravity account and click "Reconnect Antigravity".';
export const SIDE_PANEL_CHECK_AGAIN_HINT = 'Open the thread side panel → Antigravity account and click "Check again".';

export const AUTH_SIGN_IN_REQUIRED_ERROR = `Sign in required. ${SIDE_PANEL_RECONNECT_HINT}`;
export const AUTH_UNAUTHENTICATED_ERROR = `Google Antigravity Native ACP is not authenticated. ${SIDE_PANEL_RECONNECT_HINT}`;
export const AUTH_CREDENTIALS_MISSING_ERROR = `Google OAuth credentials are missing or expired. ${SIDE_PANEL_RECONNECT_HINT}`;
export const AUTH_NOT_CONFIGURED_ERROR = `Google OAuth credentials are not configured yet. ${SIDE_PANEL_RECONNECT_HINT}`;
export const AUTH_REQUIRED_ERROR = `Native ACP requires authentication. ${SIDE_PANEL_RECONNECT_HINT}`;

export const SESSION_NOT_VERIFIED_HINT = `Local credentials present, but Native ACP session is not verified. ${SIDE_PANEL_CHECK_AGAIN_HINT}`;
export const RUNTIME_LAUNCHED_NOT_VERIFIED_HINT = `Native ACP runtime launched, but session readiness is not verified. ${SIDE_PANEL_CHECK_AGAIN_HINT}`;
export const NO_MODELS_DISCOVERED_ERROR = `No models discovered from Google Antigravity Native ACP session. ${SIDE_PANEL_CHECK_AGAIN_HINT}`;

/** Native reasoning is the runtime's thinking_level session option. */
export const NATIVE_REASONING = {
  configId: 'thinking_level',
  supportedLevels: ['low', 'medium', 'high'],
  defaultLevel: 'medium' as const
};

export function nativeReasoning(): typeof NATIVE_REASONING & { supportedLevels: string[] } {
  return { ...NATIVE_REASONING, supportedLevels: [...NATIVE_REASONING.supportedLevels] };
}

export function normalizeAuthMethod(value: unknown): GoogleAcpAuthMethod {
  return isValidGoogleAuthMethod(value) ? value : 'oauth-personal';
}

export function normalizeExecutable(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** The provider settings every entry point reads: auth method and optional runtime override. */
export function readProviderSettings(settings: Record<string, unknown> | undefined): {
  authMethod: GoogleAcpAuthMethod;
  customExecutable: string | undefined;
} {
  return { authMethod: normalizeAuthMethod(settings?.authMethod), customExecutable: normalizeExecutable(settings?.nativeExecutable) };
}

export function resolveRuntime(customExecutable?: string): ResolvedNativeRuntime {
  return resolveNativeAcpRuntime({ customExecutable });
}

function launchEnv(authMethod: GoogleAcpAuthMethod, home: PreparedGeminiHome, env: NodeJS.ProcessEnv): Record<string, string> {
  return {
    BROWSER: 'echo',
    GEMINI_HOME: home.geminiHome,
    AGY_ACP_AUTH_METHOD: authMethod,
    ...(authMethod === 'gemini-api-key' && env.GEMINI_API_KEY ? { GEMINI_API_KEY: env.GEMINI_API_KEY } : {})
  };
}

/** How Zana launches the runtime for a thread, against the managed Gemini home. */
export function buildNativeLaunchSpec(options: {
  authMethod?: GoogleAcpAuthMethod;
  customExecutable?: string;
  env?: NodeJS.ProcessEnv;
  home?: PreparedGeminiHome;
} = {}) {
  const authMethod = options.authMethod ?? 'oauth-personal';
  const runtime = resolveRuntime(options.customExecutable);
  const home = options.home ?? prepareSanitizedGeminiHome({ env: options.env, authMethod });
  return {
    displayName: 'Antigravity',
    command: runtime.executable,
    args: runtime.args,
    env: launchEnv(authMethod, home, options.env ?? process.env),
    nativeReasoning: nativeReasoning()
  };
}

/** Fills a caller-provided launch spec's missing defaults in place; true when anything was added. */
export function completeLaunchSpec(spec: Record<string, any>, authMethod: GoogleAcpAuthMethod, home: PreparedGeminiHome,
  env: NodeJS.ProcessEnv = process.env): boolean {
  const existing: Record<string, unknown> = spec.env && typeof spec.env === 'object' ? spec.env : {};
  const defaults = launchEnv(authMethod, home, env);
  let changed = spec.env !== existing;
  const next: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(defaults)) {
    if (next[key] === undefined) { next[key] = value; changed = true; }
  }
  if (!next.GEMINI_HOME) { next.GEMINI_HOME = home.geminiHome; changed = true; }
  spec.env = next;
  if (!spec.nativeReasoning) {
    spec.nativeReasoning = nativeReasoning();
    changed = true;
  }
  return changed;
}

function notInstalledMessage(runtime: ResolvedNativeRuntime): string {
  return !runtime.companionFilesPresent && runtime.missingCompanionFiles.length > 0
    ? `Missing companion file(s): ${runtime.missingCompanionFiles.join(', ')}`
    : `Native ACP runtime (v${PINNED_NATIVE_ACP_VERSION}) is not installed.`;
}

export interface ProviderHealth {
  status: 'not_installed' | 'unauthenticated' | 'ready' | 'unknown';
  statusMessage: string | null;
  planLabel: string | null;
  installedVersion: string | null;
}

/** Thread health for a runtime and its readiness; `readiness` is absent when the runtime is not installed. */
export function healthFromReadiness(runtime: ResolvedNativeRuntime, readiness?: NativeReadinessResult): ProviderHealth {
  if (!runtime.installed || !readiness) {
    return { status: 'not_installed', statusMessage: notInstalledMessage(runtime), planLabel: null, installedVersion: null };
  }
  if (readiness.state === 'runtime_missing') {
    return { status: 'not_installed', statusMessage: readiness.error || notInstalledMessage(runtime), planLabel: null,
      installedVersion: null };
  }
  const installedVersion = readiness.agentVersion ?? runtime.version ?? PINNED_NATIVE_ACP_VERSION;
  const planLabel = readiness.tierName ?? null;
  if (readiness.state === 'session_ready') return { status: 'ready', statusMessage: null, planLabel, installedVersion };
  const statusMessage = readiness.error
    || (readiness.state === 'sign_in_required'
      ? AUTH_SIGN_IN_REQUIRED_ERROR
      : readiness.state === 'authenticated'
      ? SESSION_NOT_VERIFIED_HINT
      : RUNTIME_LAUNCHED_NOT_VERIFIED_HINT);
  return { status: readiness.state === 'sign_in_required' ? 'unauthenticated' : 'unknown', statusMessage, planLabel, installedVersion };
}

function formatEffortDescription(level: string): string {
  return `${level.charAt(0).toUpperCase() + level.slice(1)} reasoning effort`;
}

function mapDiscoveredModels(models: DiscoveredNativeModel[], stale = false) {
  return models.map((m, idx) => {
    const levels = Array.isArray(m.supportedReasoningEfforts)
      ? m.supportedReasoningEfforts.filter((l): l is string => typeof l === 'string' && l.length > 0)
      : [];
    const defaultReasoningEffort = levels.length > 0
      ? m.defaultReasoningEffort && levels.includes(m.defaultReasoningEffort) ? m.defaultReasoningEffort : levels[0]
      : undefined;
    return {
      id: m.id,
      model: m.id,
      displayName: stale ? `${m.name} (cached)` : m.name,
      description: m.description || `Google Antigravity Native ACP model (${m.id})`,
      supportedReasoningEfforts: levels.map(level => ({ reasoningEffort: level, description: formatEffortDescription(level) })),
      ...(defaultReasoningEffort ? { defaultReasoningEffort } : {}),
      isDefault: idx === 0
    };
  });
}

export type JsonRpcOutcome = { result: unknown } | { error: { code: number; message: string; data?: unknown } };

export function modelListNotInstalled(): JsonRpcOutcome {
  return { error: { code: -32000, message: `Google Antigravity Native ACP runtime (v${PINNED_NATIVE_ACP_VERSION}) is not installed on this host. Install it in Settings → Antigravity Provider.` } };
}

/** The model/list reply for a catalog: models, or an error that says how to recover. */
export function modelListFromReadiness(readiness: NativeReadinessResult): JsonRpcOutcome {
  if (readiness.state === 'sign_in_required') {
    const message = readiness.error || AUTH_UNAUTHENTICATED_ERROR;
    return { error: { code: -32000, message, data: { recovery: { kind: 'authRequired', message, retryable: false } } } };
  }
  if (readiness.models.length === 0) {
    return { error: { code: -32000, message: readiness.error || NO_MODELS_DISCOVERED_ERROR } };
  }
  return { result: {
    models: mapDiscoveredModels(readiness.models, readiness.catalogStale),
    selectedOnlyModels: [],
    _meta: { checkedAt: readiness.checkedAt, stale: readiness.catalogStale === true, ...(readiness.error ? { warning: readiness.error } : {}) }
  } };
}

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
  checkedAt?: number;
  catalogStale?: boolean;
  /** Opaque hash that changes when the signed-in credentials change. */
  credentialId?: string;
}

/** The Settings view of a runtime and its readiness; `readiness` is absent when the runtime is not installed. */
export function doctorStatus(runtime: ResolvedNativeRuntime, context: {
  authMethod: GoogleAcpAuthMethod;
  pendingAuthUrl: string | null;
  readiness?: NativeReadinessResult;
  credentialId?: string;
  disabledDeadMcpServers?: string[];
}): DoctorStatusResult {
  const base = {
    pinnedVersion: PINNED_NATIVE_ACP_VERSION,
    previousVersion: runtime.previousVersion,
    source: runtime.source,
    executable: runtime.executable,
    companionFilesPresent: runtime.companionFilesPresent,
    missingCompanionFiles: runtime.missingCompanionFiles,
    authMethod: context.authMethod,
    pendingAuthUrl: context.pendingAuthUrl
  };
  const { readiness } = context;
  if (!runtime.installed || !readiness) {
    return { ...base, installed: false, authenticated: false, ready: false, version: runtime.version, state: 'runtime_missing',
      configuredAuthType: null, models: [], modes: [], tierName: null,
      disabledDeadMcpServers: context.disabledDeadMcpServers ?? [],
      error: !runtime.companionFilesPresent && runtime.missingCompanionFiles.length > 0
        ? `Native ACP archive is incomplete: missing companion file(s) ${runtime.missingCompanionFiles.join(', ')}.`
        : `Native ACP runtime (v${PINNED_NATIVE_ACP_VERSION}) is not installed on this host.` };
  }
  return {
    ...base,
    installed: true,
    authenticated: readiness.state === 'authenticated' || readiness.state === 'session_ready',
    ready: readiness.state === 'session_ready',
    version: readiness.agentVersion ?? runtime.version ?? PINNED_NATIVE_ACP_VERSION,
    state: readiness.state,
    configuredAuthType: readiness.configuredAuthType,
    models: readiness.models,
    modes: readiness.modes,
    tierName: readiness.tierName ?? null,
    disabledDeadMcpServers: readiness.disabledDeadMcpServers ?? [],
    checkedAt: readiness.checkedAt,
    catalogStale: readiness.catalogStale === true,
    ...(context.credentialId ? { credentialId: context.credentialId } : {}),
    ...(readiness.error ? { error: readiness.error } : {})
  };
}
