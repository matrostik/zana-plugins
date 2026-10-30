import type { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { NativeAcpSession, type InitializeInfo } from './acp-session.js';
import {
  captureAccount,
  currentCredentialId,
  invalidateAccounts,
  type AccountSnapshot,
  type NativeTarget
} from './account-identity.js';
import {
  GOOGLE_ACP_AUTH_METHODS,
  hasNativeAcpToken,
  isAuthExplicitlyCleared,
  isHeadlessAuthMethod,
  readConfiguredNativeAuthType,
  syncTokenToSource,
  writeAuthTypeSettings,
  type GoogleAcpAuthMethod
} from './gemini-home.js';
import { KeyedRefresh } from './keyed-refresh.js';
import { parseNativeQuotaWindows, type NativeUsageResult } from './native-usage.js';
import {
  readinessResult,
  readinessStore,
  runtimeMissingResult,
  type DiscoveredNativeModel,
  type NativeReadinessResult,
  type ReadinessSubject
} from './readiness-store.js';

export {
  GOOGLE_ACP_AUTH_METHODS,
  isValidGoogleAuthMethod,
  prepareSanitizedGeminiHome,
  type GoogleAcpAuthMethod
} from './gemini-home.js';
export type { DiscoveredNativeModel, NativeReadinessResult, NativeSetupState } from './readiness-store.js';

const NATIVE_PROBE_TIMEOUT_MS = 20_000;
const USAGE_CACHE_TTL_MS = 60_000;
/** How long to wait for available_commands_update after session/new before giving up on /usage. */
const USAGE_COMMANDS_WAIT_MS = 1000;
const USAGE_MAX_TEXT_CHARS = 32_768;
const CATALOG_RETRY_BACKOFF_MS = 30_000;

/** Writes the auth type everywhere the runtime reads it, then invalidates every cached account result. */
export function writeNativeAcpAuthType(
  authType: GoogleAcpAuthMethod | null,
  env: NodeJS.ProcessEnv = process.env
): void {
  writeAuthTypeSettings(authType, env);
  clearCachedNativeReadiness(env);
}

/** Sign-in, sign-out, auth-type and runtime changes: drop cached readiness and every captured account. */
export function clearCachedNativeReadiness(env: NodeJS.ProcessEnv = process.env): void {
  readinessStore.invalidate(env);
  invalidateAccounts();
}

/** Opaque account identity so UIs can drop results that belong to a previous sign-in. */
export function getNativeCredentialId(authMethod: GoogleAcpAuthMethod, env: NodeJS.ProcessEnv = process.env): string {
  return currentCredentialId(authMethod, env);
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

/** Catalog, modes and tier of a ready session. */
function describeSession(session: any): Pick<NativeReadinessResult, 'models' | 'modes' | 'tierName'> {
  const tierName = session?._meta?.antigravity?.tier?.name;
  return {
    models: extractModelsFromSessionResult(session),
    modes: extractModesFromSessionResult(session),
    tierName: typeof tierName === 'string' ? tierName : null
  };
}

function fromInitialize(info: InitializeInfo): Pick<NativeReadinessResult, 'agentVersion' | 'protocolVersion' | 'advertisedAuthMethods'> {
  return { agentVersion: info.agentVersion, protocolVersion: info.protocolVersion, advertisedAuthMethods: info.advertisedAuthMethods };
}

function subjectOf(account: AccountSnapshot, configuredAuthType = account.configuredAuthType): ReadinessSubject {
  return { authMethod: account.target.authMethod, configuredAuthType, disabledDeadMcpServers: account.home.disabledDeadMcpServers };
}

/** Whether local files or the environment hold credentials for the method; nothing is verified. */
function hasLocalCredentials(authMethod: GoogleAcpAuthMethod, effectiveEnv: NodeJS.ProcessEnv, configuredAuthType: string | null): boolean {
  if (authMethod === 'gemini-api-key') return Boolean(effectiveEnv.GEMINI_API_KEY);
  if (authMethod === 'agent-platform') {
    return Boolean(effectiveEnv.GOOGLE_APPLICATION_CREDENTIALS || effectiveEnv.CLOUD_ML_PROJECT_ID || effectiveEnv.GOOGLE_CLOUD_PROJECT);
  }
  return !isAuthExplicitlyCleared(effectiveEnv) && hasNativeAcpToken(effectiveEnv) && Boolean(configuredAuthType);
}

/**
 * Returns Native ACP readiness without spawning, from the in-memory or persisted cache,
 * strictly validating TTL expiration and credential changes. Unverified local credentials
 * are reported as `authenticated` rather than `session_ready`.
 */
export function getFastNativeReadiness(options: {
  command: string;
  args: string[];
  authMethod: GoogleAcpAuthMethod;
  env?: NodeJS.ProcessEnv;
}): NativeReadinessResult {
  return readPreparedReadiness(captureAccount(options));
}

function readPreparedReadiness(account: AccountSnapshot): NativeReadinessResult {
  const { target, home, effectiveEnv } = account;
  const configuredAuthType = account.configuredAuthType;
  if (!existsSync(target.command)) return runtimeMissingResult(target.command, subjectOf(account));

  const cached = readinessStore.lookup(account.slot, effectiveEnv, { allowStale: true });
  if (cached) return { ...cached, disabledDeadMcpServers: home.disabledDeadMcpServers };

  if (hasLocalCredentials(target.authMethod, effectiveEnv, configuredAuthType)) {
    return readinessResult('authenticated', subjectOf(account, configuredAuthType ?? target.authMethod),
      { modes: ['default', 'auto_edit', 'yolo'] });
  }
  return readinessResult('sign_in_required', subjectOf(account, null),
    { error: 'Google OAuth credentials are not configured yet. Click "Sign In with Google" in Settings.' });
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

function incompatibility(info: InitializeInfo, authMethod: GoogleAcpAuthMethod): string | null {
  if (info.protocolVersion !== 1) return `Unsupported ACP protocolVersion returned: ${info.protocolVersion}`;
  if (info.advertisedAuthMethods.length > 0 && !info.advertisedAuthMethods.includes(authMethod)) {
    return `Selected auth method "${authMethod}" is not advertised.`;
  }
  return null;
}

/** A failed diagnostic is a sign-in problem when the runtime said so; otherwise its cause is kept. */
function failureResult(error: any, signInRequested: boolean, subject: ReadinessSubject): NativeReadinessResult {
  const message = error?.message || String(error);
  const isAuthRequired =
    signInRequested ||
    /authentication required|no authentication method selected|credentials (?:missing|invalid|expired)/i.test(message) ||
    error?.data?.recovery?.kind === 'authRequired';
  return isAuthRequired
    ? readinessResult('sign_in_required', subject,
      { error: 'Native ACP requires authentication. Select an auth method and click "Sign In with Google" in Settings.' })
    : readinessResult('runtime_launches', subject, { error: message });
}

/** Uncached result for a discovery whose account was signed out or switched while it ran. */
function accountChangedResult(subject: ReadinessSubject, fields: Partial<NativeReadinessResult>): NativeReadinessResult {
  return readinessResult('runtime_launches', subject, { ...fields,
    error: 'Antigravity sign-in changed while models were being discovered. Retry to load the current account.' });
}

export interface NativeProbeOptions extends NativeTarget {
  timeoutMs?: number;
  forceRefresh?: boolean;
  spawnImpl?: typeof spawn;
}

const usageRefresh = new KeyedRefresh<NativeUsageResult>({ successTtlMs: USAGE_CACHE_TTL_MS });

/** The vendor advertises /usage as a local ACP command; never send it speculatively to a model. */
export async function queryNativeUsage(options: NativeProbeOptions): Promise<NativeUsageResult> {
  const account = captureAccount(options);
  const key = account.refreshKey;
  const cached = options.forceRefresh ? undefined : usageRefresh.cached(key);
  if (cached) return cached;
  return usageRefresh.run(key, async () => {
    const result = await performNativeUsageQuery(options, account);
    if (!account.isCurrent()) {
      return { outcome: 'discard', key, result: { supported: true as const, usage: { status: 'error' as const, planLabel: null,
        accountEmail: null, windows: [], checkedAt: Date.now(), source: 'native-acp-/usage' as const,
        message: 'Antigravity sign-in changed while usage was being checked. Retry to load the current account.' } } };
    }
    return { result, outcome: result.usage.status === 'ok' ? 'success' : 'failure', key: account.refreshKey };
  });
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
    usage.planLabel = describeSession(opened.session).tierName ?? null;
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
    const failure = failureResult(error, session.signInRequested, subjectOf(account));
    return { supported: true, usage: { ...usage, status: failure.state === 'sign_in_required' ? 'unauthenticated' : 'error',
      message: failure.error } };
  } finally {
    session.close();
  }
}

const catalogRefresh = new KeyedRefresh<NativeReadinessResult>({ failureBackoffMs: CATALOG_RETRY_BACKOFF_MS });

/**
 * True when a catalog request can be answered from readiness alone, without probing. An empty
 * session_ready catalog stays unsettled so a missed late config_option_update is retried after backoff.
 */
function isCatalogSettled(readiness: NativeReadinessResult, forceRefresh?: boolean): boolean {
  return !forceRefresh && (readiness.state === 'runtime_missing' || readiness.state === 'sign_in_required'
    || (readiness.state === 'session_ready' && readiness.models.length > 0));
}

/**
 * The model catalog, synchronously when cached readiness already settles it, otherwise after one
 * shared, backed-off refresh. Refresh only on explicit catalog requests, never on health reads.
 */
export function resolveNativeCatalog(options: NativeProbeOptions): NativeReadinessResult | Promise<NativeReadinessResult> {
  const account = captureAccount(options);
  const previous = readPreparedReadiness(account);
  return isCatalogSettled(previous, options.forceRefresh) ? previous : refreshCatalog(options, account, previous);
}

export async function getNativeCatalog(options: NativeProbeOptions): Promise<NativeReadinessResult> {
  return resolveNativeCatalog(options);
}

function refreshCatalog(options: NativeProbeOptions, account: AccountSnapshot, previous: NativeReadinessResult): Promise<NativeReadinessResult> {
  const key = account.refreshKey;
  return catalogRefresh.run(key, async () => {
    const result = await runNativeReadinessProbe({ ...options, forceRefresh: true }, account);
    // Never fall back to, or back off on behalf of, a catalog that belongs to a previous sign-in.
    if (!account.isCurrent()) return { result, outcome: 'discard', key };
    // Re-keyed after the probe: its own auth-type write changes the fingerprint the next request will use.
    if (result.state === 'session_ready' && result.models.length > 0) return { result, outcome: 'success', key: account.refreshKey };
    const keepPrevious = result.state !== 'sign_in_required' && result.state !== 'session_ready' && previous.models.length > 0;
    return { outcome: 'failure', key: account.refreshKey,
      result: keepPrevious ? { ...previous, state: 'authenticated' as const, catalogStale: true, error: result.error } : result };
  }, { whileBackingOff: options.forceRefresh ? undefined : () => previous });
}

export async function probeNativeAcpReadiness(options: NativeProbeOptions): Promise<NativeReadinessResult> {
  return runNativeReadinessProbe(options, captureAccount(options));
}

/** Probes readiness and attributes the result to `account`. */
async function runNativeReadinessProbe(
  options: NativeProbeOptions,
  account: AccountSnapshot
): Promise<NativeReadinessResult> {
  const { effectiveEnv } = account;
  // Failures are attributed to the configuration the probe started with.
  const startSlot = account.slot;
  const subject = subjectOf(account);
  if (!existsSync(options.command)) return runtimeMissingResult(options.command, subject);
  const cached = options.forceRefresh ? null : readinessStore.lookup(startSlot, effectiveEnv);
  if (cached) return cached;

  const session = openDiagnosticSession(options, account, 'session verification');
  try {
    const initInfo = await initializeFor(session, account, subject.configuredAuthType);
    const incompatible = incompatibility(initInfo, options.authMethod);
    if (incompatible) return readinessResult('runtime_launches', subject, { ...fromInitialize(initInfo), error: incompatible });

    const opened = await session.newSession({ awaitCatalog: true });
    // Sign-out or an account switch during discovery must not persist the previous account's result.
    if (!account.isCurrent()) return accountChangedResult(subject, fromInitialize(initInfo));
    if (opened.kind === 'sign_in_required') {
      const signInResult = readinessResult('sign_in_required', subject, { ...fromInitialize(initInfo),
        error: 'Google OAuth credentials are missing or expired. Click "Sign In with Google" to authenticate.' });
      readinessStore.put(startSlot, signInResult, effectiveEnv);
      return signInResult;
    }

    syncTokenToSource(account.home, account.target.env);
    const ready = readinessResult('session_ready', subjectOf(account, account.configuredAuthType ?? options.authMethod),
      { ...fromInitialize(initInfo), ...describeSession(opened.session) });
    // Keyed after the probe: its own headless auth-type write changes the configured type.
    readinessStore.put(account.slot, ready, effectiveEnv);
    return ready;
  } catch (error: any) {
    const failed = failureResult(error, session.signInRequested, subject);
    // A failure from an obsolete account must not overwrite a newer sign-in's readiness.
    if (!account.isCurrent()) return accountChangedResult(subject, {});
    readinessStore.put(startSlot, failed, effectiveEnv);
    return failed;
  } finally {
    session.close();
  }
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
    return runtimeMissingResult(options.command, { authMethod: options.authMethod, configuredAuthType: readConfiguredNativeAuthType(options.env) });
  }
  const account = captureAccount(options);
  const session = NativeAcpSession.open({ command: options.command, args: options.args, cwd: options.cwd, env: account.effectiveEnv,
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

    writeNativeAcpAuthType(options.authMethod, options.env);
    syncTokenToSource(account.home, options.env);
    // The account signed in just now, so attribute the result to a snapshot taken after the write.
    const signedIn = account.recapture();
    const ready = readinessResult('session_ready', subjectOf(signedIn, options.authMethod), {
      agentVersion: initInfo.agentVersion, protocolVersion: initInfo.protocolVersion ?? 1, advertisedAuthMethods,
      ...describeSession(opened.session)
    });
    readinessStore.put(signedIn.slot, ready, signedIn.effectiveEnv);
    return ready;
  } catch (error: any) {
    return readinessResult('sign_in_required', subjectOf(account, readConfiguredNativeAuthType(account.effectiveEnv)),
      { error: error?.message || 'Interactive Google sign-in failed or timed out.' });
  } finally {
    session.close();
  }
}
