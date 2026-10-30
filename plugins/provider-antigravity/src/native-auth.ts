import type { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { NativeAcpSession, type InitializeInfo } from './acp-session.js';
import {
  captureAccount,
  currentCredentialId,
  invalidateAccounts,
  type AccountSnapshot,
  type NativeTarget
} from './account-identity.js';
import {
  forgetStatMemo,
  GOOGLE_ACP_AUTH_METHODS,
  hasNativeAcpToken,
  isAuthExplicitlyCleared,
  isHeadlessAuthMethod,
  memoizeByStat,
  readConfiguredNativeAuthType,
  syncTokenToSource,
  writeAuthTypeSettings,
  type GoogleAcpAuthMethod,
  type PreparedGeminiHome
} from './gemini-home.js';
import { getZccDataDir } from './native-runtime.js';
import { parseNativeQuotaWindows, type NativeUsageResult } from './native-usage.js';

export {
  GOOGLE_ACP_AUTH_METHODS,
  isValidGoogleAuthMethod,
  prepareSanitizedGeminiHome,
  type GoogleAcpAuthMethod
} from './gemini-home.js';

export type NativeSetupState =
  | 'runtime_missing'
  | 'runtime_launches'
  | 'sign_in_required'
  | 'authenticated'
  | 'session_ready';

export interface DiscoveredNativeModel {
  id: string;
  name: string;
  description?: string;
  supportedReasoningEfforts?: string[];
  defaultReasoningEffort?: string;
}

export interface NativeReadinessResult {
  state: NativeSetupState;
  agentVersion: string | null;
  protocolVersion: number | null;
  advertisedAuthMethods: string[];
  selectedAuthMethod: GoogleAcpAuthMethod;
  configuredAuthType: string | null;
  models: DiscoveredNativeModel[];
  modes: string[];
  tierName?: string | null;
  disabledDeadMcpServers?: string[];
  error?: string;
  checkedAt: number;
  catalogStale?: boolean;
}

/** Writes the auth type everywhere the runtime reads it, then invalidates every cached account result. */
export function writeNativeAcpAuthType(
  authType: GoogleAcpAuthMethod | null,
  env: NodeJS.ProcessEnv = process.env
): void {
  writeAuthTypeSettings(authType, env);
  clearCachedNativeReadiness(env);
}

function extractSessionReasoningMetadata(sessionResult: any): {
  supportedReasoningEfforts?: string[];
  defaultReasoningEffort?: string;
} {
  const configOptions = sessionResult?.configOptions;
  if (!Array.isArray(configOptions)) return {};
  const reasoningOpt = configOptions.find(
    (opt: any) =>
      opt?.id === 'thinking_level' ||
      opt?.id === 'reasoning_effort' ||
      opt?.category === 'reasoning' ||
      opt?.category === 'thinking_level'
  );
  if (!reasoningOpt || !Array.isArray(reasoningOpt.options)) return {};
  const levels = reasoningOpt.options
    .map((o: any) => (typeof o?.value === 'string' ? o.value : typeof o?.id === 'string' ? o.id : null))
    .filter((v: string | null): v is string => Boolean(v));
  if (levels.length === 0) return {};
  const rawDefault = reasoningOpt.currentValue ?? reasoningOpt.defaultValue;
  const defaultLevel =
    typeof rawDefault === 'string' && levels.includes(rawDefault) ? rawDefault : levels[0];
  return {
    supportedReasoningEfforts: levels,
    ...(defaultLevel ? { defaultReasoningEffort: defaultLevel } : {})
  };
}

function extractModelReasoningMetadata(
  item: any,
  sessionReasoning: { supportedReasoningEfforts?: string[]; defaultReasoningEffort?: string }
): { supportedReasoningEfforts?: string[]; defaultReasoningEffort?: string } {
  const rawEfforts = item?.supportedReasoningEfforts ?? item?.reasoningLevels ?? item?.thinkingLevels;
  if (Array.isArray(rawEfforts)) {
    const levels = rawEfforts
      .map((e: any) =>
        typeof e === 'string'
          ? e
          : typeof e?.reasoningEffort === 'string'
          ? e.reasoningEffort
          : typeof e?.value === 'string'
          ? e.value
          : null
      )
      .filter((v: string | null): v is string => Boolean(v));
    if (levels.length === 0) return {};
    const rawDefault = item?.defaultReasoningEffort ?? item?.defaultThinkingLevel;
    const defaultLevel =
      typeof rawDefault === 'string' && levels.includes(rawDefault) ? rawDefault : levels[0];
    return {
      supportedReasoningEfforts: levels,
      ...(defaultLevel ? { defaultReasoningEffort: defaultLevel } : {})
    };
  }
  return sessionReasoning;
}

export function extractModelsFromSessionResult(sessionResult: any): DiscoveredNativeModel[] {
  const models: DiscoveredNativeModel[] = [];
  const seen = new Set<string>();
  const sessionReasoning = extractSessionReasoningMetadata(sessionResult);

  const configOptions = sessionResult?.configOptions;
  let authoritativeCatalog = false;
  if (Array.isArray(configOptions)) {
    const modelOpt = configOptions.find(
      (opt: any) => opt?.id === 'model' || opt?.category === 'model'
    );
    if (Array.isArray(modelOpt?.options)) {
      authoritativeCatalog = true;
      for (const opt of modelOpt.options.flatMap((option: any) =>
        Array.isArray(option?.options) ? option.options : [option])) {
        const id = opt?.value;
        if (typeof id === 'string' && id && !seen.has(id)) {
          seen.add(id);
          models.push({
            id,
            name: typeof opt?.name === 'string' && opt.name ? opt.name : id,
            ...(typeof opt?.description === 'string' ? { description: opt.description } : {}),
            ...extractModelReasoningMetadata(opt, sessionReasoning)
          });
        }
      }
    }
  }

  if (!authoritativeCatalog) {
    const availableModels = sessionResult?.models?.availableModels;
    if (Array.isArray(availableModels)) {
      for (const item of availableModels) {
        const id = item?.id || item?.modelId;
        if (typeof id === 'string' && id && !seen.has(id)) {
          seen.add(id);
          models.push({
            id,
            name: typeof item?.name === 'string' && item.name ? item.name : id,
            ...(typeof item?.description === 'string' ? { description: item.description } : {}),
            ...extractModelReasoningMetadata(item, sessionReasoning)
          });
        }
      }
    }
  }

  return models;
}

function extractModesFromSessionResult(sessionResult: any): string[] {
  const available = sessionResult?.modes?.availableModes;
  if (!Array.isArray(available)) return [];
  return available
    .map((m: any) => (typeof m?.id === 'string' ? m.id : null))
    .filter((id: string | null): id is string => Boolean(id));
}

function getPersistedReadinessPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(getZccDataDir(env), 'state', 'antigravity-native-readiness.json');
}

function readPersistedReadiness(key: string, env: NodeJS.ProcessEnv = process.env): { result: NativeReadinessResult; fingerprint: string } | null {
  const filePath = getPersistedReadinessPath(env);
  const raw = memoizeByStat(filePath, () => {
    try {
      return existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf8')) : null;
    } catch {
      return null; // Ignore corrupted cache
    }
  });
  if (raw && raw.key === key && raw.result && typeof raw.result === 'object'
    && Number.isFinite(raw.result.checkedAt) && Array.isArray(raw.result.models)
    && raw.result.models.every((model: any) => typeof model?.id === 'string' && typeof model?.name === 'string')
    && Array.isArray(raw.result.modes) && Array.isArray(raw.result.advertisedAuthMethods)) {
    return { result: raw.result as NativeReadinessResult, fingerprint: raw.fingerprint || '' };
  }
  return null;
}

function writePersistedReadiness(
  key: string,
  result: NativeReadinessResult,
  fingerprint: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  try {
    const filePath = getPersistedReadinessPath(env);
    mkdirSync(dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, JSON.stringify({ key, result, fingerprint }, null, 2) + '\n', { mode: 0o600 });
      renameSync(temporary, filePath);
    } finally {
      rmSync(temporary, { force: true });
      forgetStatMemo(filePath);
    }
  } catch {
    // Ignore cache write errors
  }
}

let cachedReadiness: {
  key: string;
  fingerprint: string;
  result: NativeReadinessResult;
} | null = null;
export const READINESS_CACHE_TTL_MS = 10 * 60 * 1000;
const NATIVE_PROBE_TIMEOUT_MS = 20_000;
const USAGE_CACHE_TTL_MS = 60_000;
/** How long to wait for available_commands_update after session/new before giving up on /usage. */
const USAGE_COMMANDS_WAIT_MS = 1000;
const USAGE_MAX_TEXT_CHARS = 32_768;
const CATALOG_RETRY_BACKOFF_MS = 30_000;
const CATALOG_RETRY_MAX_KEYS = 32;

export function getCachedNativeReadiness(): NativeReadinessResult | null {
  if (!cachedReadiness) return null;
  if (Date.now() - cachedReadiness.result.checkedAt > READINESS_CACHE_TTL_MS) {
    return null;
  }
  return cachedReadiness.result;
}

/** Sign-in, sign-out, auth-type and runtime changes: drop cached readiness and every captured account. */
export function clearCachedNativeReadiness(env: NodeJS.ProcessEnv = process.env): void {
  cachedReadiness = null;
  invalidateAccounts();
  try {
    const filePath = getPersistedReadinessPath(env);
    forgetStatMemo(filePath);
    rmSync(filePath, { force: true });
  } catch {
    // Ignore
  }
}

/** Opaque account identity so UIs can drop results that belong to a previous sign-in. */
export function getNativeCredentialId(authMethod: GoogleAcpAuthMethod, env: NodeJS.ProcessEnv = process.env): string {
  return currentCredentialId(authMethod, env);
}

function checkLocalCredentialPresence(
  authMethod: GoogleAcpAuthMethod,
  effectiveEnv: NodeJS.ProcessEnv,
  configuredAuthType: string | null
): { authenticated: boolean; note?: string } {
  if (authMethod === 'gemini-api-key') {
    return Boolean(effectiveEnv.GEMINI_API_KEY)
      ? { authenticated: true, note: 'API key detected in environment (unverified session)' }
      : { authenticated: false };
  }
  if (authMethod === 'agent-platform') {
    const hasPlatformCreds = Boolean(
      effectiveEnv.GOOGLE_APPLICATION_CREDENTIALS ||
      effectiveEnv.CLOUD_ML_PROJECT_ID ||
      effectiveEnv.GOOGLE_CLOUD_PROJECT
    );
    return hasPlatformCreds
      ? { authenticated: true, note: 'Platform credentials detected (unverified session)' }
      : { authenticated: false };
  }
  if (!isAuthExplicitlyCleared(effectiveEnv) && hasNativeAcpToken(effectiveEnv) && configuredAuthType) {
    return { authenticated: true, note: 'Local credentials present (unverified session)' };
  }
  return { authenticated: false };
}

function checkCachedReadiness(
  cacheKey: string,
  fingerprint: string,
  effectiveEnv: NodeJS.ProcessEnv,
  allowStaleCatalog = false
): NativeReadinessResult | null {
  const memory = cachedReadiness &&
    cachedReadiness.key === cacheKey &&
    cachedReadiness.fingerprint === fingerprint &&
    Date.now() - cachedReadiness.result.checkedAt < READINESS_CACHE_TTL_MS
    ? cachedReadiness.result
    : null;
  // Consult disk too: the Settings process may have refreshed a different host process's cache.
  // The newer entry wins so a failed persist never shadows a fresher in-memory result.
  const persisted = readPersistedReadiness(cacheKey, effectiveEnv);
  const result = persisted && persisted.fingerprint === fingerprint ? persisted.result : null;
  if (result && Date.now() - result.checkedAt < READINESS_CACHE_TTL_MS
    && (!memory || result.checkedAt > memory.checkedAt)) {
    cachedReadiness = { key: cacheKey, fingerprint, result };
    return result;
  }
  const staleCatalog = allowStaleCatalog && result && result.state === 'session_ready' && result.models.length > 0
    ? { ...result, state: 'authenticated' as const, catalogStale: true }
    : null;
  // A transient probe failure must not hide the last good catalog for the rest of the backoff window.
  if (memory && staleCatalog && memory.state === 'runtime_launches') return { ...staleCatalog, error: memory.error };
  if (memory) return memory;
  return staleCatalog;
}

function buildAuthenticatedFastReadiness(
  options: { authMethod: GoogleAcpAuthMethod },
  configuredAuthType: string | null,
  sanitized: { disabledDeadMcpServers: string[] }
): NativeReadinessResult {
  return {
    state: 'authenticated',
    agentVersion: null,
    protocolVersion: 1,
    advertisedAuthMethods: [...GOOGLE_ACP_AUTH_METHODS],
    selectedAuthMethod: options.authMethod,
    configuredAuthType: configuredAuthType ?? options.authMethod,
    models: [],
    modes: ['default', 'auto_edit', 'yolo'],
    disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
    checkedAt: Date.now()
  };
}

function buildSignInRequiredFastReadiness(
  options: { authMethod: GoogleAcpAuthMethod },
  sanitized: { disabledDeadMcpServers: string[] }
): NativeReadinessResult {
  return {
    state: 'sign_in_required',
    agentVersion: null,
    protocolVersion: 1,
    advertisedAuthMethods: [...GOOGLE_ACP_AUTH_METHODS],
    selectedAuthMethod: options.authMethod,
    configuredAuthType: null,
    models: [],
    modes: [],
    disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
    error: 'Google OAuth credentials are not configured yet. Click "Sign In with Google" in Settings.',
    checkedAt: Date.now()
  };
}

/**
 * Returns Native ACP readiness without spawning, from the in-memory or persisted cache,
 * strictly validating TTL expiration and credential changes. Unverified local credentials
 * are reported as `authenticated` (with unverified note) rather than `session_ready`.
 */
export function getFastNativeReadiness(options: {
  command: string;
  args: string[];
  authMethod: GoogleAcpAuthMethod;
  env?: NodeJS.ProcessEnv;
}): NativeReadinessResult {
  return getPreparedNativeReadiness(captureAccount(options));
}

function getPreparedNativeReadiness(account: AccountSnapshot): NativeReadinessResult {
  const { target, home, effectiveEnv } = account;
  const configuredAuthType = account.configuredAuthType;

  const cached = existsSync(target.command)
    ? checkCachedReadiness(account.readinessKey, account.fingerprint, effectiveEnv, true)
    : null;
  if (cached) {
    return { ...cached, disabledDeadMcpServers: home.disabledDeadMcpServers };
  }

  if (!existsSync(target.command)) {
    return {
      state: 'runtime_missing',
      agentVersion: null,
      protocolVersion: null,
      advertisedAuthMethods: [],
      selectedAuthMethod: target.authMethod,
      configuredAuthType,
      models: [],
      modes: [],
      disabledDeadMcpServers: home.disabledDeadMcpServers,
      error: `Native ACP binary not found at "${target.command}".`,
      checkedAt: Date.now()
    };
  }

  const credCheck = checkLocalCredentialPresence(target.authMethod, effectiveEnv, configuredAuthType);
  if (credCheck.authenticated) {
    return buildAuthenticatedFastReadiness(target, configuredAuthType, home);
  }

  return buildSignInRequiredFastReadiness(target, home);
}

/** Initializes the runtime and, for env-credential methods without a configured auth type, authenticates headlessly. */
async function initializeFor(
  session: NativeAcpSession,
  account: AccountSnapshot,
  configuredAuthType: string | null
): Promise<InitializeInfo> {
  const info = await session.initialize();
  const { authMethod } = account.target;
  if (!configuredAuthType && isHeadlessAuthMethod(authMethod)) {
    await session.authenticate(authMethod, { headless: true });
    account.commitHeadlessAuthType();
  }
  return info;
}

function openDiagnosticSession(options: NativeProbeOptions, account: AccountSnapshot, operation: string): NativeAcpSession {
  return NativeAcpSession.open({ command: options.command, args: options.args, cwd: options.cwd, env: account.effectiveEnv,
    spawnImpl: options.spawnImpl, timeoutMs: options.timeoutMs ?? NATIVE_PROBE_TIMEOUT_MS, operation });
}
function checkProbeCachedOrMissing(
  options: { command: string; args: string[]; authMethod: GoogleAcpAuthMethod; forceRefresh?: boolean },
  cacheKey: string,
  fingerprint: string,
  configuredAuthType: string | null,
  sanitized: { geminiHome: string; disabledDeadMcpServers: string[] }
): NativeReadinessResult | null {
  if (
    !options.forceRefresh &&
    cachedReadiness &&
    cachedReadiness.key === cacheKey &&
    cachedReadiness.fingerprint === fingerprint &&
    Date.now() - cachedReadiness.result.checkedAt < READINESS_CACHE_TTL_MS
  ) {
    return cachedReadiness.result;
  }
  if (!existsSync(options.command)) {
    return {
      state: 'runtime_missing',
      agentVersion: null,
      protocolVersion: null,
      advertisedAuthMethods: [],
      selectedAuthMethod: options.authMethod,
      configuredAuthType,
      models: [],
      modes: [],
      disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
      error: `Native ACP binary not found at "${options.command}".`,
      checkedAt: Date.now()
    };
  }
  return null;
}

function buildProbeSessionResult(
  sessionRace: any,
  initInfo: { protocolVersion: number | null; agentVersion: string | null; advertisedAuthMethods: string[] },
  account: AccountSnapshot
): NativeReadinessResult {
  const models = extractModelsFromSessionResult(sessionRace);
  const modes = extractModesFromSessionResult(sessionRace);
  const tierName = typeof sessionRace?._meta?.antigravity?.tier?.name === 'string'
    ? sessionRace._meta.antigravity.tier.name
    : null;

  syncTokenToSource(account.home, account.target.env);

  const readyResult: NativeReadinessResult = {
    state: 'session_ready',
    agentVersion: initInfo.agentVersion,
    protocolVersion: initInfo.protocolVersion,
    advertisedAuthMethods: initInfo.advertisedAuthMethods,
    selectedAuthMethod: account.target.authMethod,
    configuredAuthType: account.configuredAuthType ?? account.target.authMethod,
    models,
    modes,
    tierName,
    disabledDeadMcpServers: account.home.disabledDeadMcpServers,
    checkedAt: Date.now()
  };
  // Keyed after the probe: its own headless auth-type write changes the configured type.
  cachedReadiness = { key: account.readinessKey, fingerprint: account.fingerprint, result: readyResult };
  writePersistedReadiness(account.readinessKey, readyResult, account.fingerprint, account.effectiveEnv);
  return readyResult;
}

function checkInitCompatibility(
  initInfo: { protocolVersion: number | null; agentVersion: string | null; advertisedAuthMethods: string[] },
  options: { authMethod: GoogleAcpAuthMethod },
  configuredAuthType: string | null,
  sanitized: { disabledDeadMcpServers: string[] }
): NativeReadinessResult | null {
  if (initInfo.protocolVersion !== 1) {
    return {
      state: 'runtime_launches',
      agentVersion: initInfo.agentVersion,
      protocolVersion: initInfo.protocolVersion,
      advertisedAuthMethods: initInfo.advertisedAuthMethods,
      selectedAuthMethod: options.authMethod,
      configuredAuthType,
      models: [],
      modes: [],
      disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
      error: `Unsupported ACP protocolVersion returned: ${initInfo.protocolVersion}`,
      checkedAt: Date.now()
    };
  }
  if (initInfo.advertisedAuthMethods.length > 0 && !initInfo.advertisedAuthMethods.includes(options.authMethod)) {
    return {
      state: 'runtime_launches',
      agentVersion: initInfo.agentVersion,
      protocolVersion: initInfo.protocolVersion,
      advertisedAuthMethods: initInfo.advertisedAuthMethods,
      selectedAuthMethod: options.authMethod,
      configuredAuthType,
      models: [],
      modes: [],
      disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
      error: `Selected auth method "${options.authMethod}" is not advertised.`,
      checkedAt: Date.now()
    };
  }
  return null;
}

function formatProbeFailureResult(
  err: any,
  interactiveLoginTriggeredOnStderr: boolean,
  options: { authMethod: GoogleAcpAuthMethod },
  configuredAuthType: string | null,
  sanitized: { disabledDeadMcpServers: string[] }
): NativeReadinessResult {
  const message = err?.message || String(err);
  const isAuthRequired =
    interactiveLoginTriggeredOnStderr ||
    /authentication required|no authentication method selected|credentials (?:missing|invalid|expired)/i.test(message) ||
    err?.data?.recovery?.kind === 'authRequired';
  return {
    state: isAuthRequired ? 'sign_in_required' : 'runtime_launches',
    agentVersion: null,
    protocolVersion: 1,
    advertisedAuthMethods: [...GOOGLE_ACP_AUTH_METHODS],
    selectedAuthMethod: options.authMethod,
    configuredAuthType,
    models: [],
    modes: [],
    disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
    error: isAuthRequired
      ? 'Native ACP requires authentication. Select an auth method and click "Sign In with Google" in Settings.'
      : message,
    checkedAt: Date.now()
  };
}

export interface NativeProbeOptions extends NativeTarget {
  timeoutMs?: number;
  forceRefresh?: boolean;
  spawnImpl?: typeof spawn;
}

/** The vendor advertises /usage as a local ACP command; never send it speculatively to a model. */
const usageRefreshes = new Map<string, Promise<NativeUsageResult>>();
let usageCache: { key: string; result: NativeUsageResult } | null = null;

export async function queryNativeUsage(options: NativeProbeOptions): Promise<NativeUsageResult> {
  const account = captureAccount(options);
  const key = account.refreshKey;
  if (!options.forceRefresh && usageCache?.key === key && Date.now() - usageCache.result.usage.checkedAt < USAGE_CACHE_TTL_MS) {
    return usageCache.result;
  }
  const running = usageRefreshes.get(key);
  if (running) return running;
  const request = performNativeUsageQuery(options, account).then(result => {
    if (!account.isCurrent()) {
      return { supported: true as const, usage: { status: 'error' as const, planLabel: null, accountEmail: null,
        windows: [], checkedAt: Date.now(), source: 'native-acp-/usage' as const,
        message: 'Antigravity sign-in changed while usage was being checked. Retry to load the current account.' } };
    }
    if (result.usage.status === 'ok') usageCache = { key: account.refreshKey, result };
    return result;
  }).finally(() => usageRefreshes.delete(key));
  usageRefreshes.set(key, request);
  return request;
}

async function performNativeUsageQuery(options: NativeProbeOptions, account: AccountSnapshot): Promise<NativeUsageResult> {
  const usage: NativeUsageResult['usage'] = { status: 'error', planLabel: null, accountEmail: null,
    windows: [], checkedAt: Date.now(), source: 'native-acp-/usage' };
  if (!existsSync(options.command)) return { supported: true, usage: { ...usage, status: 'not_installed' } };
  const session = openDiagnosticSession(options, account, 'usage check');
  try {
    const init = await initializeFor(session, account, account.configuredAuthType);
    if (init.protocolVersion !== 1) throw new Error('Unsupported Native ACP protocol version.');
    const opened = await session.newSession();
    if (opened.kind === 'sign_in_required') return { supported: true, usage: { ...usage, status: 'unauthenticated' } };
    const tierName = opened.session?._meta?.antigravity?.tier?.name;
    usage.planLabel = typeof tierName === 'string' ? tierName : null;
    // Native notifications can arrive after the session/new response in a separate stdout chunk.
    if (!await session.waitForCommand('usage', USAGE_COMMANDS_WAIT_MS)) {
      throw new Error('This Native ACP runtime does not advertise /usage. Check usage in Google Antigravity Settings.');
    }
    const result = await session.runCommand(opened.session.sessionId, 'usage', { maxTextChars: USAGE_MAX_TEXT_CHARS });
    if (result.stopReason !== 'end_turn') throw new Error('Native usage command did not complete successfully.');
    usage.windows = parseNativeQuotaWindows(result.text);
    if (usage.windows.length === 0) throw new Error('Native usage returned no recognized quota windows. Check usage in Google Antigravity Settings.');
    return { supported: true, usage: { ...usage, status: 'ok', checkedAt: Date.now() } };
  } catch (error: any) {
    const failure = formatProbeFailureResult(error, session.signInRequested, options,
      account.configuredAuthType, account.home);
    return { supported: true, usage: { ...usage, status: failure.state === 'sign_in_required' ? 'unauthenticated' : 'error',
      message: failure.error } };
  } finally {
    session.close();
  }
}

const catalogRefreshes = new Map<string, Promise<NativeReadinessResult>>();
const catalogRetryAfter = new Map<string, number>();

/**
 * True when a catalog request can be answered from readiness alone, without probing. An empty
 * session_ready catalog stays unsettled so a missed late config_option_update is retried after backoff.
 */
export function isNativeCatalogSettled(readiness: NativeReadinessResult, forceRefresh?: boolean): boolean {
  return !forceRefresh && (readiness.state === 'runtime_missing' || readiness.state === 'sign_in_required'
    || (readiness.state === 'session_ready' && readiness.models.length > 0));
}

/** Refresh only on explicit catalog requests, never on ordinary health reads. */
export async function getNativeCatalog(options: NativeProbeOptions): Promise<NativeReadinessResult> {
  const account = captureAccount(options);
  const previous = getPreparedNativeReadiness(account);
  if (isNativeCatalogSettled(previous, options.forceRefresh)) return previous;
  const key = account.refreshKey;
  const running = catalogRefreshes.get(key);
  if (running) return running;
  const retry = catalogRetryAfter.get(key);
  if (!options.forceRefresh && retry && retry > Date.now()) return previous;
  const refresh = runNativeReadinessProbe({ ...options, forceRefresh: true }, account).then(result => {
    // Never fall back to, or back off on behalf of, a catalog that belongs to a previous sign-in.
    if (!account.isCurrent()) return result;
    // Re-key after the probe: its own auth-type write changes the fingerprint the next request will use.
    const retryKey = account.refreshKey;
    if (retryKey !== key) catalogRetryAfter.delete(key);
    if (result.state !== 'session_ready' || result.models.length === 0) {
      if (catalogRetryAfter.size >= CATALOG_RETRY_MAX_KEYS) catalogRetryAfter.delete(catalogRetryAfter.keys().next().value!);
      catalogRetryAfter.set(retryKey, Date.now() + CATALOG_RETRY_BACKOFF_MS);
      if (result.state !== 'sign_in_required' && result.state !== 'session_ready' && previous.models.length > 0) {
        return { ...previous, state: 'authenticated' as const, catalogStale: true, error: result.error };
      }
    } else catalogRetryAfter.delete(retryKey);
    return result;
  }).finally(() => catalogRefreshes.delete(key));
  catalogRefreshes.set(key, refresh);
  return refresh;
}

export async function probeNativeAcpReadiness(options: NativeProbeOptions): Promise<NativeReadinessResult> {
  return runNativeReadinessProbe(options, captureAccount(options));
}

/** Probes readiness and attributes the result to `account`. */
async function runNativeReadinessProbe(
  options: NativeProbeOptions,
  account: AccountSnapshot
): Promise<NativeReadinessResult> {
  const { home, effectiveEnv } = account;
  const configuredAuthType = account.configuredAuthType;
  const fingerprint = account.fingerprint;
  const cacheKey = account.readinessKey;

  const earlyResult = checkProbeCachedOrMissing(options, cacheKey, fingerprint, configuredAuthType, home);
  if (earlyResult) return earlyResult;

  const session = openDiagnosticSession(options, account, 'session verification');
  try {
    const initInfo = await initializeFor(session, account, configuredAuthType);
    const compatError = checkInitCompatibility(initInfo, options, configuredAuthType, home);
    if (compatError) return compatError;

    const opened = await session.newSession({ awaitCatalog: true });
    // Sign-out or an account switch during discovery must not persist the previous account's result.
    if (!account.isCurrent()) {
      return buildAuthChangedResult(initInfo, options, configuredAuthType, home);
    }
    if (opened.kind === 'sign_in_required') {
      const signInResult = buildProbeSignInRequiredResult(initInfo, options, configuredAuthType, home);
      cachedReadiness = { key: cacheKey, fingerprint, result: signInResult };
      writePersistedReadiness(cacheKey, signInResult, fingerprint, effectiveEnv);
      return signInResult;
    }

    return buildProbeSessionResult(opened.session, initInfo, account);
  } catch (err: any) {
    const failedResult = formatProbeFailureResult(err, session.signInRequested, options, configuredAuthType, home);
    // A failure from an obsolete account must not overwrite a newer sign-in's readiness.
    if (!account.isCurrent()) {
      return buildAuthChangedResult(failedResult, options, configuredAuthType, home);
    }
    cachedReadiness = { key: cacheKey, fingerprint, result: failedResult };
    if (failedResult.state === 'sign_in_required') writePersistedReadiness(cacheKey, failedResult, fingerprint, effectiveEnv);
    return failedResult;
  } finally {
    session.close();
  }
}

function buildProbeSignInRequiredResult(
  initInfo: { protocolVersion: number | null; agentVersion: string | null; advertisedAuthMethods: string[] },
  options: { authMethod: GoogleAcpAuthMethod },
  configuredAuthType: string | null,
  sanitized: { disabledDeadMcpServers: string[] }
): NativeReadinessResult {
  return {
    state: 'sign_in_required',
    agentVersion: initInfo.agentVersion,
    protocolVersion: initInfo.protocolVersion,
    advertisedAuthMethods: initInfo.advertisedAuthMethods,
    selectedAuthMethod: options.authMethod,
    configuredAuthType,
    models: [],
    modes: [],
    disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
    error: 'Google OAuth credentials are missing or expired. Click "Sign In with Google" to authenticate.',
    checkedAt: Date.now()
  };
}

/** Uncached result for a discovery whose account was signed out or switched while it ran. */
function buildAuthChangedResult(
  initInfo: { protocolVersion: number | null; agentVersion: string | null; advertisedAuthMethods: string[] },
  options: { authMethod: GoogleAcpAuthMethod },
  configuredAuthType: string | null,
  sanitized: { disabledDeadMcpServers: string[] }
): NativeReadinessResult {
  return {
    state: 'runtime_launches',
    agentVersion: initInfo.agentVersion,
    protocolVersion: initInfo.protocolVersion,
    advertisedAuthMethods: initInfo.advertisedAuthMethods,
    selectedAuthMethod: options.authMethod,
    configuredAuthType,
    models: [],
    modes: [],
    disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
    error: 'Antigravity sign-in changed while models were being discovered. Retry to load the current account.',
    checkedAt: Date.now()
  };
}

function buildSignInSuccessResult(
  sessionResult: any,
  initInfo: InitializeInfo,
  account: AccountSnapshot,
  advertisedAuthMethods: string[]
): NativeReadinessResult {
  const { target, home } = account;
  writeNativeAcpAuthType(target.authMethod, target.env);
  syncTokenToSource(home, target.env);

  const models = extractModelsFromSessionResult(sessionResult);
  const modes = extractModesFromSessionResult(sessionResult);
  const tierName = typeof sessionResult?._meta?.antigravity?.tier?.name === 'string'
    ? sessionResult._meta.antigravity.tier.name
    : null;
  clearCachedNativeReadiness(target.env);

  const readyResult: NativeReadinessResult = {
    state: 'session_ready',
    agentVersion: initInfo.agentVersion,
    protocolVersion: initInfo.protocolVersion ?? 1,
    advertisedAuthMethods,
    selectedAuthMethod: target.authMethod,
    configuredAuthType: target.authMethod,
    models,
    modes,
    tierName,
    disabledDeadMcpServers: home.disabledDeadMcpServers,
    checkedAt: Date.now()
  };
  // The account signed in just now, so attribute the result to a snapshot taken after the write.
  const signedIn = account.recapture();
  cachedReadiness = { key: signedIn.readinessKey, fingerprint: signedIn.fingerprint, result: readyResult };
  writePersistedReadiness(signedIn.readinessKey, readyResult, signedIn.fingerprint, signedIn.effectiveEnv);
  return readyResult;
}

export async function startNativeAcpSignIn(options: {
  command: string;
  args: string[];
  authMethod: GoogleAcpAuthMethod;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  onAuthUrl?: (url: string) => void;
  spawnImpl?: typeof spawn;
}): Promise<NativeReadinessResult> {
  if (!existsSync(options.command)) {
    return { state: 'runtime_missing', agentVersion: null, protocolVersion: null, advertisedAuthMethods: [], selectedAuthMethod: options.authMethod, configuredAuthType: readConfiguredNativeAuthType(options.env), models: [], modes: [], error: `Native ACP binary not found at "${options.command}".`, checkedAt: Date.now() };
  }
  const account = captureAccount(options);
  const { home, effectiveEnv } = account;
  const session = NativeAcpSession.open({ command: options.command, args: options.args, cwd: options.cwd, env: effectiveEnv,
    spawnImpl: options.spawnImpl, timeoutMs: 20_000, operation: 'sign-in', interactive: true });
  session.onStderrLine((line) => {
    const match = line.match(/https:\/\/accounts\.google\.com\/o\/oauth2\/\S+/);
    if (match && match[0]) options.onAuthUrl?.(match[0]);
  });

  try {
    const initInfo = await session.initialize();
    const advertisedAuthMethods = initInfo.advertisedAuthMethods.length > 0
      ? initInfo.advertisedAuthMethods
      : [...GOOGLE_ACP_AUTH_METHODS];
    if (initInfo.protocolVersion !== null && initInfo.protocolVersion !== 1) {
      throw new Error(`Unsupported ACP protocolVersion returned: ${initInfo.protocolVersion}`);
    }
    if (!advertisedAuthMethods.includes(options.authMethod)) {
      throw new Error(`Authentication method "${options.authMethod}" is not supported by native server.`);
    }

    await session.authenticate(options.authMethod, { timeoutMs: options.timeoutMs ?? 120_000 });
    const opened = await session.newSession({ awaitCatalog: true, timeoutMs: 25_000 });
    if (opened.kind === 'sign_in_required') throw new Error('Google sign-in did not complete. Try signing in again.');

    return buildSignInSuccessResult(opened.session, initInfo, account, advertisedAuthMethods);
  } catch (err: any) {
    return { state: 'sign_in_required', agentVersion: null, protocolVersion: 1, advertisedAuthMethods: [...GOOGLE_ACP_AUTH_METHODS], selectedAuthMethod: options.authMethod, configuredAuthType: readConfiguredNativeAuthType(effectiveEnv), models: [], modes: [], disabledDeadMcpServers: home.disabledDeadMcpServers, error: err?.message || 'Interactive Google sign-in failed or timed out.', checkedAt: Date.now() };
  } finally {
    session.close();
  }
}
