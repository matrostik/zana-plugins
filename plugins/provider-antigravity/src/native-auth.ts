import { spawn, type ChildProcess } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { getZccDataDir, killProcessTree } from './native-runtime.js';

export const GOOGLE_ACP_AUTH_METHODS = [
  'oauth-personal',
  'oauth-business',
  'gemini-api-key',
  'agent-platform'
] as const;

export type GoogleAcpAuthMethod = (typeof GOOGLE_ACP_AUTH_METHODS)[number];

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
}

const SANITIZED_HOME_SUFFIXES = ['antigravity-gemini-home', 'antigravity-zcc-home'];

function isSanitizedGeminiHomePath(dirPath: string): boolean {
  const normalized = dirPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return SANITIZED_HOME_SUFFIXES.some((suffix) => normalized.endsWith(`/${suffix}`));
}

export function isValidGoogleAuthMethod(value: unknown): value is GoogleAcpAuthMethod {
  return (
    typeof value === 'string' &&
    (GOOGLE_ACP_AUTH_METHODS as readonly string[]).includes(value)
  );
}

export function resolveGeminiHome(env: NodeJS.ProcessEnv = process.env): string {
  if (env.GEMINI_HOME && env.GEMINI_HOME.trim()) {
    return resolve(env.GEMINI_HOME.trim());
  }
  const home = env.USERPROFILE || env.HOME || homedir();
  return resolve(home, '.gemini');
}

export function resolveSourceAndManagedGeminiHome(env: NodeJS.ProcessEnv = process.env): {
  sourceGeminiHome: string;
  managedGeminiHome: string;
} {
  const configuredHome =
    env.GEMINI_HOME && env.GEMINI_HOME.trim() ? resolve(env.GEMINI_HOME.trim()) : null;
  const fallbackUserHome = resolve(env.USERPROFILE || env.HOME || homedir(), '.gemini');

  if (configuredHome && isSanitizedGeminiHomePath(configuredHome)) {
    const sourceGeminiHome = configuredHome.replace(/\\/g, '/').endsWith('/antigravity-zcc-home')
      ? dirname(configuredHome)
      : fallbackUserHome;
    return { sourceGeminiHome, managedGeminiHome: configuredHome };
  }

  const sourceGeminiHome = configuredHome ?? fallbackUserHome;
  const managedGeminiHome =
    env.ZCC_DATA_DIR && env.ZCC_DATA_DIR.trim()
      ? join(getZccDataDir(env), 'state', 'antigravity-gemini-home')
      : configuredHome
      ? join(sourceGeminiHome, 'antigravity-zcc-home')
      : join(getZccDataDir(env), 'state', 'antigravity-gemini-home');

  return { sourceGeminiHome, managedGeminiHome };
}

export function getNativeAcpSettingsPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveGeminiHome(env), 'antigravity-acp', 'settings.json');
}

export function getNativeAcpTokenPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveGeminiHome(env), 'antigravity-acp', 'acp_token.json');
}

export function hasNativeAcpToken(env: NodeJS.ProcessEnv = process.env): boolean {
  const tokenPath = getNativeAcpTokenPath(env);
  if (!existsSync(tokenPath)) return false;
  try {
    return statSync(tokenPath).size > 10;
  } catch {
    return false;
  }
}

export function readNativeAcpSettings(
  env: NodeJS.ProcessEnv = process.env
): Record<string, any> | null {
  const settingsPath = getNativeAcpSettingsPath(env);
  if (!existsSync(settingsPath)) {
    return null;
  }
  try {
    const raw = JSON.parse(readFileSync(settingsPath, 'utf8'));
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function isAuthExplicitlyCleared(env: NodeJS.ProcessEnv = process.env): boolean {
  const settings = readNativeAcpSettings(env);
  return settings?.auth?.cleared === true;
}

export function readConfiguredNativeAuthType(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const settings = readNativeAcpSettings(env);
  if (settings?.auth?.cleared === true) {
    return null;
  }
  const authType = settings?.auth?.type;
  return typeof authType === 'string' && authType.trim() ? authType.trim() : null;
}

function writeSettingsFileAtomically(
  settingsPath: string,
  authType: GoogleAcpAuthMethod | null
): void {
  let existing: Record<string, any> = {};
  if (existsSync(settingsPath)) {
    try {
      const parsed = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        existing = parsed;
      }
    } catch {
      existing = {};
    }
  }

  const next: Record<string, any> = { ...existing };
  if (authType === null) {
    next.auth = { cleared: true };
  } else {
    next.auth = {
      ...(next.auth && typeof next.auth === 'object' ? next.auth : {}),
      type: authType,
      cleared: false
    };
  }

  mkdirSync(dirname(settingsPath), { recursive: true });
  const tmpPath = `${settingsPath}.tmp-${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(next, null, 2) + '\n', 'utf8');
  writeFileSync(settingsPath, readFileSync(tmpPath));
  try {
    rmSync(tmpPath, { force: true });
  } catch {
    // Ignore cleanup failure
  }
}

export function writeNativeAcpAuthType(
  authType: GoogleAcpAuthMethod | null,
  env: NodeJS.ProcessEnv = process.env
): void {
  const primaryPath = getNativeAcpSettingsPath(env);
  writeSettingsFileAtomically(primaryPath, authType);

  const { sourceGeminiHome, managedGeminiHome } = resolveSourceAndManagedGeminiHome(env);
  for (const dir of [sourceGeminiHome, managedGeminiHome]) {
    const candidate = join(dir, 'antigravity-acp', 'settings.json');
    if (candidate !== primaryPath) {
      try {
        writeSettingsFileAtomically(candidate, authType);
      } catch {
        // Best-effort sync
      }
    }
  }

  clearCachedNativeReadiness();
}

function syncFileNewer(src: string, dest: string): void {
  if (!existsSync(src)) return;
  try {
    if (existsSync(dest)) {
      const srcStat = statSync(src);
      const destStat = statSync(dest);
      if (srcStat.mtimeMs <= destStat.mtimeMs && destStat.size > 0) {
        return;
      }
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  } catch {
    // Best-effort sync
  }
}

function isIdeNamedPipeMcpProxyUnreachable(serverConfig: any): boolean {
  if (!serverConfig || typeof serverConfig !== 'object') {
    return false;
  }
  const args: unknown[] = Array.isArray(serverConfig.args) ? serverConfig.args : [];
  const usesIdeProxy = args.some(
    (arg) =>
      typeof arg === 'string' &&
      (arg.includes('mcp_proxy_bundle.js') || arg.endsWith('-antigravityide'))
  );
  if (!usesIdeProxy) return false;

  const pipeId = args.find(
    (arg): arg is string => typeof arg === 'string' && arg.endsWith('-antigravityide')
  );
  if (!pipeId) return true;

  if (process.platform === 'win32') {
    const pipePath = `\\\\.\\pipe\\datacloud-mcp-${pipeId}`;
    return !existsSync(pipePath);
  }
  return true;
}

function sanitizeMcpConfigFile(
  sourceGeminiHome: string,
  managedGeminiHome: string
): string[] {
  const disabledDeadMcpServers: string[] = [];
  const sourceMcpConfigPath = join(sourceGeminiHome, 'config', 'mcp_config.json');
  const targetMcpConfigDir = join(managedGeminiHome, 'config');
  const targetMcpConfigPath = join(targetMcpConfigDir, 'mcp_config.json');

  mkdirSync(targetMcpConfigDir, { recursive: true });
  if (existsSync(sourceMcpConfigPath)) {
    try {
      const raw = JSON.parse(readFileSync(sourceMcpConfigPath, 'utf8'));
      const sourceServers =
        raw && typeof raw.mcpServers === 'object' && raw.mcpServers !== null
          ? (raw.mcpServers as Record<string, any>)
          : {};
      const sanitizedServers: Record<string, any> = {};
      for (const [serverName, serverCfg] of Object.entries(sourceServers)) {
        if (!serverCfg || typeof serverCfg !== 'object') continue;
        if (serverCfg.disabled === true) continue;
        if (isIdeNamedPipeMcpProxyUnreachable(serverCfg)) {
          disabledDeadMcpServers.push(serverName);
          continue;
        }
        sanitizedServers[serverName] = serverCfg;
      }
      writeFileSync(
        targetMcpConfigPath,
        JSON.stringify({ ...raw, mcpServers: sanitizedServers }, null, 2) + '\n',
        'utf8'
      );
    } catch {
      writeFileSync(targetMcpConfigPath, JSON.stringify({ mcpServers: {} }, null, 2) + '\n', 'utf8');
    }
  } else if (!existsSync(targetMcpConfigPath)) {
    writeFileSync(targetMcpConfigPath, JSON.stringify({ mcpServers: {} }, null, 2) + '\n', 'utf8');
  }

  return disabledDeadMcpServers;
}

export function prepareSanitizedGeminiHome(options?: {
  env?: NodeJS.ProcessEnv;
  authMethod?: GoogleAcpAuthMethod;
}): {
  geminiHome: string;
  disabledDeadMcpServers: string[];
} {
  const env = options?.env ?? process.env;
  const { sourceGeminiHome, managedGeminiHome } = resolveSourceAndManagedGeminiHome(env);

  const sourceAcpDir = join(sourceGeminiHome, 'antigravity-acp');
  const managedAcpDir = join(managedGeminiHome, 'antigravity-acp');
  mkdirSync(managedAcpDir, { recursive: true });

  if (managedGeminiHome !== sourceGeminiHome) {
    syncFileNewer(join(sourceAcpDir, 'acp_token.json'), join(managedAcpDir, 'acp_token.json'));
    syncFileNewer(join(sourceAcpDir, 'settings.json'), join(managedAcpDir, 'settings.json'));
  }

  const managedEnv = { ...env, GEMINI_HOME: managedGeminiHome };
  const currentAuthType = readConfiguredNativeAuthType(managedEnv);
  const settingsFile = join(managedAcpDir, 'settings.json');
  const explicitlyCleared = isAuthExplicitlyCleared(managedEnv);

  if (
    !currentAuthType &&
    !explicitlyCleared &&
    !existsSync(settingsFile) &&
    existsSync(join(managedAcpDir, 'acp_token.json'))
  ) {
    const defaultMethod = options?.authMethod ?? 'oauth-personal';
    writeSettingsFileAtomically(settingsFile, defaultMethod);
  }

  const disabledDeadMcpServers = sanitizeMcpConfigFile(sourceGeminiHome, managedGeminiHome);

  return {
    geminiHome: managedGeminiHome,
    disabledDeadMcpServers
  };
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
  if (Array.isArray(configOptions)) {
    const modelOpt = configOptions.find(
      (opt: any) => opt?.id === 'model' || opt?.category === 'model'
    );
    if (Array.isArray(modelOpt?.options)) {
      for (const opt of modelOpt.options) {
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

  if (models.length === 0) {
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
  if (!existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    if (raw && raw.key === key && raw.result && typeof raw.result === 'object') {
      return { result: raw.result as NativeReadinessResult, fingerprint: raw.fingerprint || '' };
    }
  } catch {
    // Ignore corrupted cache
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
    writeFileSync(
      filePath,
      JSON.stringify({ key, result, fingerprint }, null, 2) + '\n',
      'utf8'
    );
  } catch {
    // Ignore cache write errors
  }
}

export function computeCredentialFingerprint(
  env: NodeJS.ProcessEnv,
  authMethod: GoogleAcpAuthMethod
): string {
  const tokenPath = getNativeAcpTokenPath(env);
  let tokenInfo = 'no-token';
  if (existsSync(tokenPath)) {
    try {
      const stat = statSync(tokenPath);
      tokenInfo = `${stat.size}:${stat.mtimeMs}`;
    } catch {
      tokenInfo = 'err';
    }
  }
  const configured = readConfiguredNativeAuthType(env) ?? 'none';
  const apiKey = env.GEMINI_API_KEY ? `key:${env.GEMINI_API_KEY.length}` : 'no-key';
  const appCreds = env.GOOGLE_APPLICATION_CREDENTIALS ? 'gac' : 'no-gac';
  const cleared = isAuthExplicitlyCleared(env) ? 'cleared' : 'uncleared';
  return `${authMethod}:${configured}:${cleared}:${tokenInfo}:${apiKey}:${appCreds}`;
}

export interface NativeAcpSpawnOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  spawnImpl?: typeof spawn;
}

interface RpcHarness {
  child: ChildProcess;
  request(method: string, params: Record<string, unknown>, timeoutMs?: number): Promise<any>;
  onStderrLine(listener: (line: string) => void): void;
  close(): void;
}

function setupStdoutHandler(
  stdout: NodeJS.ReadableStream | null,
  onMessage: (parsed: any) => void
): void {
  if (!stdout) return;
  const stdoutDecoder = new StringDecoder('utf8');
  let stdoutBuffer = '';
  stdout.on('data', (chunk: Buffer | string) => {
    stdoutBuffer += typeof chunk === 'string' ? chunk : stdoutDecoder.write(chunk);
    let newlineIdx: number;
    while ((newlineIdx = stdoutBuffer.indexOf('\n')) >= 0) {
      const line = stdoutBuffer.slice(0, newlineIdx).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIdx + 1);
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed && parsed.id !== undefined && parsed.method === undefined) {
          onMessage(parsed);
        }
      } catch {
        // Skip unparseable lines
      }
    }
  });
}

function setupStderrHandler(
  stderr: NodeJS.ReadableStream | null,
  onLine: (line: string) => void
): void {
  if (!stderr) return;
  const stderrDecoder = new StringDecoder('utf8');
  let stderrBuffer = '';
  stderr.on('data', (chunk: Buffer | string) => {
    stderrBuffer += typeof chunk === 'string' ? chunk : stderrDecoder.write(chunk);
    let newlineIdx: number;
    while ((newlineIdx = stderrBuffer.indexOf('\n')) >= 0) {
      const line = stderrBuffer.slice(0, newlineIdx).trim();
      stderrBuffer = stderrBuffer.slice(newlineIdx + 1);
      if (line) onLine(line);
    }
  });
}

function attachHarnessProcessHandlers(
  child: ChildProcess,
  pending: Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: ReturnType<typeof setTimeout> }>,
  stderrListeners: Array<(line: string) => void>,
  onClose: () => void
) {
  setupStdoutHandler(child.stdout, (parsed) => {
    const entry = pending.get(Number(parsed.id));
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(Number(parsed.id));
    if (parsed.error) {
      const err: any = new Error(parsed.error?.data?.message || parsed.error?.message || `ACP error ${parsed.error?.code}`);
      err.code = parsed.error?.code;
      err.data = parsed.error?.data;
      entry.reject(err);
    } else {
      entry.resolve(parsed.result);
    }
  });

  setupStderrHandler(child.stderr, (line) => {
    for (const listener of stderrListeners) listener(line);
  });

  const rejectAll = (err: Error) => {
    for (const [, entry] of pending) {
      clearTimeout(entry.timer);
      entry.reject(err);
    }
    pending.clear();
  };
  child.on('error', (err) => rejectAll(err));
  child.on('close', (code) => {
    onClose();
    rejectAll(new Error(`Native ACP server exited (code ${code ?? 'null'})`));
  });

  return rejectAll;
}

function createHarnessRequester(
  child: ChildProcess,
  pending: Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: ReturnType<typeof setTimeout> }>,
  isClosed: () => boolean,
  getNextId: () => number
) {
  return function request(method: string, params: Record<string, unknown>, timeoutMs = 20_000): Promise<any> {
    if (isClosed()) return Promise.reject(new Error('Native ACP server is already closed'));
    const id = getNextId();
    return new Promise((resolveReq, rejectReq) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        rejectReq(new Error(`ACP request "${method}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      pending.set(id, { resolve: resolveReq, reject: rejectReq, timer });
      try {
        child.stdin?.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      } catch (err: any) {
        clearTimeout(timer);
        pending.delete(id);
        rejectReq(err);
      }
    });
  };
}

function createNativeRpcHarness(
  options: NativeAcpSpawnOptions,
  suppressBrowser: boolean
): RpcHarness {
  const spawnFn = options.spawnImpl ?? spawn;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...(options.env ?? {}),
    ...(suppressBrowser ? { BROWSER: 'echo' } : {})
  };

  const child = spawnFn(options.command, options.args, {
    cwd: options.cwd || process.cwd(),
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });

  const pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: ReturnType<typeof setTimeout> }>();
  const stderrListeners: Array<(line: string) => void> = [];
  let nextId = 1;
  let closed = false;

  const rejectAll = attachHarnessProcessHandlers(child, pending, stderrListeners, () => { closed = true; });
  const request = createHarnessRequester(child, pending, () => closed, () => nextId++);

  return {
    child,
    request,
    onStderrLine(listener: (line: string) => void) { stderrListeners.push(listener); },
    close() {
      if (closed) return;
      closed = true;
      rejectAll(new Error('Native ACP probe closed'));
      killProcessTree(child);
    }
  };
}

let cachedReadiness: {
  key: string;
  fingerprint: string;
  result: NativeReadinessResult;
} | null = null;
export const READINESS_CACHE_TTL_MS = 10 * 60 * 1000;

export function getCachedNativeReadiness(): NativeReadinessResult | null {
  if (!cachedReadiness) return null;
  if (Date.now() - cachedReadiness.result.checkedAt > READINESS_CACHE_TTL_MS) {
    return null;
  }
  return cachedReadiness.result;
}

export function clearCachedNativeReadiness(): void {
  cachedReadiness = null;
  try {
    rmSync(getPersistedReadinessPath(), { force: true });
  } catch {
    // Ignore
  }
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
  effectiveEnv: NodeJS.ProcessEnv
): NativeReadinessResult | null {
  if (
    cachedReadiness &&
    cachedReadiness.key === cacheKey &&
    cachedReadiness.fingerprint === fingerprint &&
    Date.now() - cachedReadiness.result.checkedAt < READINESS_CACHE_TTL_MS
  ) {
    return cachedReadiness.result;
  }
  const persisted = readPersistedReadiness(cacheKey, effectiveEnv);
  if (
    persisted &&
    persisted.fingerprint === fingerprint &&
    Date.now() - persisted.result.checkedAt < READINESS_CACHE_TTL_MS
  ) {
    cachedReadiness = { key: cacheKey, fingerprint, result: persisted.result };
    return persisted.result;
  }
  return null;
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
 * Returns Native ACP readiness instantaneously (< 2ms) using in-memory or persisted cache,
 * strictly validating TTL expiration and credential changes. Unverified local credentials
 * are reported as `authenticated` (with unverified note) rather than `session_ready`.
 */
export function getFastNativeReadiness(options: {
  command: string;
  args: string[];
  authMethod: GoogleAcpAuthMethod;
  env?: NodeJS.ProcessEnv;
}): NativeReadinessResult {
  const sanitized = prepareSanitizedGeminiHome({ env: options.env, authMethod: options.authMethod });
  const effectiveEnv: NodeJS.ProcessEnv = { ...(options.env ?? process.env), GEMINI_HOME: sanitized.geminiHome };
  const configuredAuthType = readConfiguredNativeAuthType(effectiveEnv);
  const fingerprint = computeCredentialFingerprint(effectiveEnv, options.authMethod);
  const cacheKey = JSON.stringify({
    command: options.command,
    args: options.args,
    authMethod: options.authMethod,
    configuredAuthType
  });

  const cached = checkCachedReadiness(cacheKey, fingerprint, effectiveEnv);
  if (cached) {
    return { ...cached, disabledDeadMcpServers: sanitized.disabledDeadMcpServers };
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

  const credCheck = checkLocalCredentialPresence(options.authMethod, effectiveEnv, configuredAuthType);
  if (credCheck.authenticated) {
    return buildAuthenticatedFastReadiness(options, configuredAuthType, sanitized);
  }

  return buildSignInRequiredFastReadiness(options, sanitized);
}

async function performInitializeAndAuth(
  harness: RpcHarness,
  options: { authMethod: GoogleAcpAuthMethod; timeoutMs: number; configuredAuthType: string | null; env?: NodeJS.ProcessEnv }
): Promise<{ protocolVersion: number | null; agentVersion: string | null; advertisedAuthMethods: string[] }> {
  const initResult = await harness.request(
    'initialize',
    {
      protocolVersion: 1,
      clientInfo: { name: 'zcc', title: 'Zana Command Center', version: '1.0.0' },
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
        _meta: { parameterizedModelPicker: true }
      }
    },
    options.timeoutMs
  );

  const protocolVersion = typeof initResult?.protocolVersion === 'number' ? initResult.protocolVersion : null;
  const agentVersion = typeof initResult?.agentInfo?.version === 'string' ? initResult.agentInfo.version : null;
  const advertisedAuthMethods: string[] = Array.isArray(initResult?.authMethods)
    ? initResult.authMethods.map((m: any) => (typeof m?.id === 'string' ? m.id : null)).filter(Boolean)
    : [];

  if (
    !options.configuredAuthType &&
    (options.authMethod === 'gemini-api-key' || options.authMethod === 'agent-platform')
  ) {
    await harness.request('authenticate', { methodId: options.authMethod, _meta: { headless: true } }, options.timeoutMs);
    writeNativeAcpAuthType(options.authMethod, options.env);
  }

  return { protocolVersion, agentVersion, advertisedAuthMethods };
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
  options: { authMethod: GoogleAcpAuthMethod; env?: NodeJS.ProcessEnv },
  effectiveEnv: NodeJS.ProcessEnv,
  sanitized: { geminiHome: string; disabledDeadMcpServers: string[] },
  cacheKey: string,
  fingerprint: string
): NativeReadinessResult {
  const models = extractModelsFromSessionResult(sessionRace);
  const modes = extractModesFromSessionResult(sessionRace);
  const tierName = typeof sessionRace?._meta?.antigravity?.tier?.name === 'string'
    ? sessionRace._meta.antigravity.tier.name
    : null;

  if (!options.env?.GEMINI_HOME) {
    syncFileNewer(
      join(sanitized.geminiHome, 'antigravity-acp', 'acp_token.json'),
      join(resolveGeminiHome(options.env), 'antigravity-acp', 'acp_token.json')
    );
  }

  const readyResult: NativeReadinessResult = {
    state: 'session_ready',
    agentVersion: initInfo.agentVersion,
    protocolVersion: initInfo.protocolVersion,
    advertisedAuthMethods: initInfo.advertisedAuthMethods,
    selectedAuthMethod: options.authMethod,
    configuredAuthType: readConfiguredNativeAuthType(effectiveEnv) ?? options.authMethod,
    models,
    modes,
    tierName,
    disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
    checkedAt: Date.now()
  };
  cachedReadiness = { key: cacheKey, fingerprint, result: readyResult };
  writePersistedReadiness(cacheKey, readyResult, fingerprint, effectiveEnv);
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
    err?.code === -32000 ||
    message.includes('Authentication required') ||
    message.includes('No authentication method selected');
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

function setupStderrAuthDetector(harness: RpcHarness) {
  let triggered = false;
  let resolve: (() => void) | null = null;
  const promise = new Promise<'stderr_auth_required'>((res) => {
    resolve = () => res('stderr_auth_required');
  });
  harness.onStderrLine((line) => {
    if (
      line.includes('Credentials missing or invalid') ||
      line.includes('Launching browser login flow') ||
      line.includes('Open the following link to authenticate')
    ) {
      triggered = true;
      resolve?.();
    }
  });
  return { isTriggered: () => triggered, promise };
}

export async function probeNativeAcpReadiness(options: {
  command: string;
  args: string[];
  authMethod: GoogleAcpAuthMethod;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  forceRefresh?: boolean;
  spawnImpl?: typeof spawn;
}): Promise<NativeReadinessResult> {
  const sanitized = prepareSanitizedGeminiHome({ env: options.env, authMethod: options.authMethod });
  const effectiveEnv: NodeJS.ProcessEnv = { ...(options.env ?? process.env), GEMINI_HOME: sanitized.geminiHome };
  const configuredAuthType = readConfiguredNativeAuthType(effectiveEnv);
  const fingerprint = computeCredentialFingerprint(effectiveEnv, options.authMethod);
  const cacheKey = JSON.stringify({ command: options.command, args: options.args, authMethod: options.authMethod, configuredAuthType });

  const earlyResult = checkProbeCachedOrMissing(options, cacheKey, fingerprint, configuredAuthType, sanitized);
  if (earlyResult) return earlyResult;

  const timeoutMs = options.timeoutMs ?? 20_000;
  const harness = createNativeRpcHarness({ command: options.command, args: options.args, cwd: options.cwd, env: effectiveEnv, spawnImpl: options.spawnImpl }, true);
  const detector = setupStderrAuthDetector(harness);

  try {
    const initInfo = await performInitializeAndAuth(harness, { authMethod: options.authMethod, timeoutMs, configuredAuthType, env: options.env });
    const compatError = checkInitCompatibility(initInfo, options, configuredAuthType, sanitized);
    if (compatError) return compatError;

    const sessionRace = await Promise.race([harness.request('session/new', { cwd: options.cwd || process.cwd(), mcpServers: [] }, timeoutMs), detector.promise]);
    if (sessionRace === 'stderr_auth_required' || detector.isTriggered()) {
      const signInResult: NativeReadinessResult = { state: 'sign_in_required', agentVersion: initInfo.agentVersion, protocolVersion: initInfo.protocolVersion, advertisedAuthMethods: initInfo.advertisedAuthMethods, selectedAuthMethod: options.authMethod, configuredAuthType, models: [], modes: [], disabledDeadMcpServers: sanitized.disabledDeadMcpServers, error: 'Google OAuth credentials are missing or expired. Click "Sign In with Google" to authenticate.', checkedAt: Date.now() };
      cachedReadiness = { key: cacheKey, fingerprint, result: signInResult };
      return signInResult;
    }

    return buildProbeSessionResult(sessionRace, initInfo, options, effectiveEnv, sanitized, cacheKey, fingerprint);
  } catch (err: any) {
    const failedResult = formatProbeFailureResult(err, detector.isTriggered(), options, configuredAuthType, sanitized);
    cachedReadiness = { key: cacheKey, fingerprint, result: failedResult };
    return failedResult;
  } finally {
    harness.close();
  }
}

function buildSignInSuccessResult(
  sessionResult: any,
  initResult: any,
  options: { authMethod: GoogleAcpAuthMethod; env?: NodeJS.ProcessEnv; command: string; args: string[] },
  effectiveEnv: NodeJS.ProcessEnv,
  sanitized: { geminiHome: string; disabledDeadMcpServers: string[] },
  advertisedAuthMethods: string[]
): NativeReadinessResult {
  writeNativeAcpAuthType(options.authMethod, options.env);
  if (!options.env?.GEMINI_HOME) {
    syncFileNewer(
      join(sanitized.geminiHome, 'antigravity-acp', 'acp_token.json'),
      join(resolveGeminiHome(options.env), 'antigravity-acp', 'acp_token.json')
    );
  }

  const models = extractModelsFromSessionResult(sessionResult);
  const modes = extractModesFromSessionResult(sessionResult);
  const tierName = typeof sessionResult?._meta?.antigravity?.tier?.name === 'string'
    ? sessionResult._meta.antigravity.tier.name
    : null;
  clearCachedNativeReadiness();

  const readyResult: NativeReadinessResult = {
    state: 'session_ready',
    agentVersion: typeof initResult?.agentInfo?.version === 'string' ? initResult.agentInfo.version : null,
    protocolVersion: typeof initResult?.protocolVersion === 'number' ? initResult.protocolVersion : 1,
    advertisedAuthMethods,
    selectedAuthMethod: options.authMethod,
    configuredAuthType: options.authMethod,
    models,
    modes,
    tierName,
    disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
    checkedAt: Date.now()
  };
  const fingerprint = computeCredentialFingerprint(effectiveEnv, options.authMethod);
  const cacheKey = JSON.stringify({
    command: options.command,
    args: options.args,
    authMethod: options.authMethod,
    configuredAuthType: options.authMethod
  });
  cachedReadiness = { key: cacheKey, fingerprint, result: readyResult };
  writePersistedReadiness(cacheKey, readyResult, fingerprint, effectiveEnv);
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
  const sanitized = prepareSanitizedGeminiHome({ env: options.env, authMethod: options.authMethod });
  const effectiveEnv: NodeJS.ProcessEnv = { ...(options.env ?? process.env), GEMINI_HOME: sanitized.geminiHome };
  const timeoutMs = options.timeoutMs ?? 120_000;
  const harness = createNativeRpcHarness({ command: options.command, args: options.args, cwd: options.cwd, env: effectiveEnv, spawnImpl: options.spawnImpl }, false);
  harness.onStderrLine((line) => {
    const match = line.match(/https:\/\/accounts\.google\.com\/o\/oauth2\/\S+/);
    if (match && match[0]) options.onAuthUrl?.(match[0]);
  });

  try {
    const initResult = await harness.request('initialize', { protocolVersion: 1, clientInfo: { name: 'zcc', title: 'Zana Command Center', version: '1.0.0' }, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false, _meta: { parameterizedModelPicker: true } } }, 20_000);
    const advertisedAuthMethods: string[] = Array.isArray(initResult?.authMethods) ? initResult.authMethods.map((m: any) => m?.id).filter(Boolean) : [...GOOGLE_ACP_AUTH_METHODS];
    if (advertisedAuthMethods.length > 0 && !advertisedAuthMethods.includes(options.authMethod)) {
      throw new Error(`Authentication method "${options.authMethod}" is not supported by native server.`);
    }

    await harness.request('authenticate', { methodId: options.authMethod }, timeoutMs);
    const sessionResult = await harness.request('session/new', { cwd: options.cwd || process.cwd(), mcpServers: [] }, 25_000);

    return buildSignInSuccessResult(sessionResult, initResult, options, effectiveEnv, sanitized, advertisedAuthMethods);
  } catch (err: any) {
    return { state: 'sign_in_required', agentVersion: null, protocolVersion: 1, advertisedAuthMethods: [...GOOGLE_ACP_AUTH_METHODS], selectedAuthMethod: options.authMethod, configuredAuthType: readConfiguredNativeAuthType(effectiveEnv), models: [], modes: [], disabledDeadMcpServers: sanitized.disabledDeadMcpServers, error: err?.message || 'Interactive Google sign-in failed or timed out.', checkedAt: Date.now() };
  } finally {
    harness.close();
  }
}
