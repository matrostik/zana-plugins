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
}

export const DEFAULT_NATIVE_MODELS: DiscoveredNativeModel[] = [
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    description: 'Google Gemini 4 Argon flagship model with deep reasoning'
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Google Gemini 3.8 Flash high-efficiency multimodal model'
  },
  {
    id: 'claude-opus-5-5',
    name: 'Claude Opus 5.5',
    description: 'Anthropic Claude Opus 5.5 deep architecture & reasoning'
  },
  {
    id: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5',
    description: 'Anthropic Claude Sonnet 5.5 balanced reasoning & coding'
  },
  {
    id: 'gpt-oss-120b-medium',
    name: 'GPT-OSS 120B (Medium)',
    description: 'Open source 120B weights model'
  }
];

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

export function readConfiguredNativeAuthType(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const settings = readNativeAcpSettings(env);
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
    if (next.auth && typeof next.auth === 'object') {
      const { type: _removed, ...restAuth } = next.auth;
      if (Object.keys(restAuth).length > 0) {
        next.auth = restAuth;
      } else {
        delete next.auth;
      }
    }
  } else {
    next.auth = {
      ...(next.auth && typeof next.auth === 'object' ? next.auth : {}),
      type: authType
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
  const primarySettingsPath = getNativeAcpSettingsPath(env);
  writeSettingsFileAtomically(primarySettingsPath, authType);

  // Also keep the managed ZCC Gemini home settings.json in sync if no custom GEMINI_HOME is set
  if (!env.GEMINI_HOME) {
    try {
      const managedSettingsPath = join(
        getZccDataDir(),
        'state',
        'antigravity-gemini-home',
        'antigravity-acp',
        'settings.json'
      );
      writeSettingsFileAtomically(managedSettingsPath, authType);
    } catch {
      // Ignore sync errors
    }
  }
}

function syncFileNewer(fileA: string, fileB: string): void {
  const hasA = existsSync(fileA);
  const hasB = existsSync(fileB);
  if (!hasA && !hasB) return;

  try {
    if (hasA && !hasB) {
      mkdirSync(dirname(fileB), { recursive: true });
      copyFileSync(fileA, fileB);
      return;
    }
    if (!hasA && hasB) {
      mkdirSync(dirname(fileA), { recursive: true });
      copyFileSync(fileB, fileA);
      return;
    }
    const statA = statSync(fileA);
    const statB = statSync(fileB);
    if (statA.mtimeMs >= statB.mtimeMs) {
      copyFileSync(fileA, fileB);
    } else {
      copyFileSync(fileB, fileA);
    }
  } catch {
    // Best-effort sync
  }
}

function isIdeNamedPipeMcpProxyUnreachable(serverConfig: any): boolean {
  if (!serverConfig || typeof serverConfig !== 'object' || serverConfig.disabled === true) {
    return false;
  }
  const args: unknown[] = Array.isArray(serverConfig.args) ? serverConfig.args : [];
  const usesIdeProxy = args.some(
    (arg) =>
      typeof arg === 'string' &&
      (arg.includes('mcp_proxy_bundle.js') || arg.endsWith('-antigravityide'))
  );
  if (!usesIdeProxy) {
    return false;
  }

  // Extract the pipe suffix (e.g. "dataAgentKit-antigravityide")
  const pipeId = args.find(
    (arg): arg is string => typeof arg === 'string' && arg.endsWith('-antigravityide')
  );
  if (!pipeId) {
    return true;
  }

  if (process.platform === 'win32') {
    const pipePath = `\\\\.\\pipe\\datacloud-mcp-${pipeId}`;
    return !existsSync(pipePath);
  }
  return true;
}

/**
 * Prepares a sanitized GEMINI_HOME directory for `agy_acp_server`.
 *
 * Why this is critical for performance & reliability:
 * Antigravity IDE extensions (such as `googlecloudtools.datacloud`) inject IDE-only
 * MCP proxy entries (`notebooks-antigravityide`, `visualization-antigravityide`,
 * `dataAgentKit-antigravityide`) into `~/.gemini/config/mcp_config.json`.
 * When `agy_acp_server` runs inside Zana, those proxy scripts attempt to connect
 * to non-existent IDE named pipes (`\\?\pipe\datacloud-mcp-*-antigravityide`),
 * causing every prompt to stall for ~38 seconds and crash `localharness_external`.
 */
export function prepareSanitizedGeminiHome(options?: {
  env?: NodeJS.ProcessEnv;
  authMethod?: GoogleAcpAuthMethod;
}): {
  geminiHome: string;
  disabledDeadMcpServers: string[];
} {
  const env = options?.env ?? process.env;
  const userGeminiHome = resolveGeminiHome(env);

  // If caller explicitly passed a custom GEMINI_HOME (e.g. in unit tests), use it directly
  const managedGeminiHome =
    env.GEMINI_HOME && env.GEMINI_HOME.trim()
      ? userGeminiHome
      : join(getZccDataDir(), 'state', 'antigravity-gemini-home');

  const userAcpDir = join(userGeminiHome, 'antigravity-acp');
  const managedAcpDir = join(managedGeminiHome, 'antigravity-acp');
  mkdirSync(managedAcpDir, { recursive: true });

  if (managedGeminiHome !== userGeminiHome) {
    syncFileNewer(join(userAcpDir, 'acp_token.json'), join(managedAcpDir, 'acp_token.json'));
    syncFileNewer(join(userAcpDir, 'settings.json'), join(managedAcpDir, 'settings.json'));
  }

  // If acp_token.json exists or authMethod is provided and settings.json has no auth.type yet,
  // pre-populate auth.type so agy_acp_server selects it automatically on session/new.
  const currentAuthType = readConfiguredNativeAuthType({
    ...env,
    GEMINI_HOME: managedGeminiHome
  });
  if (!currentAuthType && existsSync(join(managedAcpDir, 'acp_token.json'))) {
    const defaultMethod = options?.authMethod ?? 'oauth-personal';
    writeSettingsFileAtomically(join(managedAcpDir, 'settings.json'), defaultMethod);
    if (managedGeminiHome !== userGeminiHome) {
      writeSettingsFileAtomically(join(userAcpDir, 'settings.json'), defaultMethod);
    }
  }

  // Sanitize config/mcp_config.json:
  // Note: agy_acp_server's `parse_mcp_config_file` in `mcp_servers.py` does NOT check
  // `"disabled": true` — it loads every key present in `mcpServers` that has `"command"` or `"url"`.
  // Therefore, both explicitly disabled servers (`disabled: true`) and unreachable IDE
  // named-pipe MCP proxies (`*-antigravityide`) must be omitted from the sanitized config.
  const disabledDeadMcpServers: string[] = [];
  const sourceMcpConfigPath = join(userGeminiHome, 'config', 'mcp_config.json');
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
        if (!serverCfg || typeof serverCfg !== 'object') {
          continue;
        }
        if (serverCfg.disabled === true) {
          continue;
        }
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

  return {
    geminiHome: managedGeminiHome,
    disabledDeadMcpServers
  };
}

export function extractModelsFromSessionResult(sessionResult: any): DiscoveredNativeModel[] {
  const models: DiscoveredNativeModel[] = [];
  const seen = new Set<string>();

  // 1. Prefer parameterized model options from configOptions (e.g. gemini-4-argon, gemini-3.8-flash)
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
            name: typeof opt?.name === 'string' && opt.name ? opt.name : id
          });
        }
      }
    }
  }

  if (models.length > 0) {
    return models;
  }

  // 2. Fall back to models.availableModels if configOptions did not provide parameterized models
  const available = sessionResult?.models?.availableModels;
  if (Array.isArray(available)) {
    for (const item of available) {
      const id = item?.modelId || item?.id;
      if (typeof id === 'string' && id && !seen.has(id)) {
        seen.add(id);
        models.push({
          id,
          name: typeof item?.name === 'string' && item.name ? item.name : id,
          ...(typeof item?.description === 'string' ? { description: item.description } : {})
        });
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

function getPersistedReadinessPath(): string {
  return join(getZccDataDir(), 'state', 'antigravity-native-readiness.json');
}

function readPersistedReadiness(key: string): NativeReadinessResult | null {
  const filePath = getPersistedReadinessPath();
  if (!existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    if (raw && raw.key === key && raw.result && typeof raw.result === 'object') {
      return raw.result as NativeReadinessResult;
    }
  } catch {
    // Ignore corrupted cache
  }
  return null;
}

function writePersistedReadiness(key: string, result: NativeReadinessResult): void {
  try {
    const filePath = getPersistedReadinessPath();
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ key, result }, null, 2) + '\n', 'utf8');
  } catch {
    // Ignore cache write errors
  }
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

  const pending = new Map<
    number,
    {
      resolve: (val: any) => void;
      reject: (err: any) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  const stderrListeners: Array<(line: string) => void> = [];
  let nextId = 1;
  let closed = false;

  const stdoutDecoder = new StringDecoder('utf8');
  let stdoutBuffer = '';

  child.stdout?.on('data', (chunk: Buffer | string) => {
    stdoutBuffer += typeof chunk === 'string' ? chunk : stdoutDecoder.write(chunk);
    let newlineIdx: number;
    while ((newlineIdx = stdoutBuffer.indexOf('\n')) >= 0) {
      const line = stdoutBuffer.slice(0, newlineIdx).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIdx + 1);
      if (!line) continue;
      let parsed: any;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      if (parsed && parsed.id !== undefined && parsed.method === undefined) {
        const entry = pending.get(Number(parsed.id));
        if (entry) {
          clearTimeout(entry.timer);
          pending.delete(Number(parsed.id));
          if (parsed.error) {
            const err: any = new Error(
              parsed.error?.data?.message ||
                parsed.error?.message ||
                `ACP error ${parsed.error?.code}`
            );
            err.code = parsed.error?.code;
            err.data = parsed.error?.data;
            entry.reject(err);
          } else {
            entry.resolve(parsed.result);
          }
        }
      } else if (parsed && parsed.id !== undefined && typeof parsed.method === 'string') {
        try {
          child.stdin?.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: parsed.id,
              error: { code: -32601, message: 'Method not supported during readiness probe' }
            }) + '\n'
          );
        } catch {
          // Ignore write errors
        }
      }
    }
  });

  const stderrDecoder = new StringDecoder('utf8');
  let stderrBuffer = '';

  child.stderr?.on('data', (chunk: Buffer | string) => {
    stderrBuffer += typeof chunk === 'string' ? chunk : stderrDecoder.write(chunk);
    let newlineIdx: number;
    while ((newlineIdx = stderrBuffer.indexOf('\n')) >= 0) {
      const line = stderrBuffer.slice(0, newlineIdx).trim();
      stderrBuffer = stderrBuffer.slice(newlineIdx + 1);
      if (!line) continue;
      for (const listener of stderrListeners) {
        listener(line);
      }
    }
  });

  function rejectAll(err: Error) {
    for (const [, entry] of pending) {
      clearTimeout(entry.timer);
      entry.reject(err);
    }
    pending.clear();
  }

  child.on('error', (err) => {
    rejectAll(err);
  });

  child.on('close', (code) => {
    closed = true;
    rejectAll(new Error(`Native ACP server exited (code ${code ?? 'null'})`));
  });

  return {
    child,
    request(method: string, params: Record<string, unknown>, timeoutMs = 20_000): Promise<any> {
      if (closed) {
        return Promise.reject(new Error('Native ACP server is already closed'));
      }
      const id = nextId++;
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
    },
    onStderrLine(listener: (line: string) => void) {
      stderrListeners.push(listener);
    },
    close() {
      if (closed) return;
      closed = true;
      rejectAll(new Error('Native ACP probe closed'));
      killProcessTree(child);
    }
  };
}

let cachedReadiness: { key: string; result: NativeReadinessResult } | null = null;
const READINESS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes in-memory TTL

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

/**
 * Returns Native ACP readiness and model catalog instantaneously (< 2ms) using
 * in-memory cache, persisted disk cache, or local credential presence without
 * spawning a cold 372MB `agy_acp_server.exe` process.
 */
export function getFastNativeReadiness(options: {
  command: string;
  args: string[];
  authMethod: GoogleAcpAuthMethod;
  env?: NodeJS.ProcessEnv;
}): NativeReadinessResult {
  const sanitized = prepareSanitizedGeminiHome({
    env: options.env,
    authMethod: options.authMethod
  });
  const effectiveEnv: NodeJS.ProcessEnv = {
    ...(options.env ?? process.env),
    GEMINI_HOME: sanitized.geminiHome
  };
  const configuredAuthType = readConfiguredNativeAuthType(effectiveEnv);
  const cacheKey = JSON.stringify({
    command: options.command,
    args: options.args,
    authMethod: options.authMethod,
    configuredAuthType
  });

  if (cachedReadiness && cachedReadiness.key === cacheKey) {
    return {
      ...cachedReadiness.result,
      disabledDeadMcpServers: sanitized.disabledDeadMcpServers
    };
  }

  const persisted = readPersistedReadiness(cacheKey);
  if (persisted && persisted.state === 'session_ready') {
    cachedReadiness = { key: cacheKey, result: persisted };
    return {
      ...persisted,
      disabledDeadMcpServers: sanitized.disabledDeadMcpServers
    };
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

  const hasToken = hasNativeAcpToken(effectiveEnv);
  const hasHeadlessAuth =
    (options.authMethod === 'gemini-api-key' && Boolean(effectiveEnv.GEMINI_API_KEY)) ||
    options.authMethod === 'agent-platform';

  if (hasToken || configuredAuthType || hasHeadlessAuth) {
    return {
      state: hasToken ? 'session_ready' : 'authenticated',
      agentVersion: null,
      protocolVersion: 1,
      advertisedAuthMethods: [...GOOGLE_ACP_AUTH_METHODS],
      selectedAuthMethod: options.authMethod,
      configuredAuthType: configuredAuthType ?? options.authMethod,
      models: DEFAULT_NATIVE_MODELS,
      modes: ['default', 'auto_edit', 'yolo'],
      disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
      checkedAt: Date.now()
    };
  }

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
    error:
      'Google OAuth credentials are not configured yet. Click "Sign In with Google" in Settings.',
    checkedAt: Date.now()
  };
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
  const sanitized = prepareSanitizedGeminiHome({
    env: options.env,
    authMethod: options.authMethod
  });
  const effectiveEnv: NodeJS.ProcessEnv = {
    ...(options.env ?? process.env),
    GEMINI_HOME: sanitized.geminiHome
  };
  const configuredAuthType = readConfiguredNativeAuthType(effectiveEnv);
  const cacheKey = JSON.stringify({
    command: options.command,
    args: options.args,
    authMethod: options.authMethod,
    configuredAuthType
  });

  if (
    !options.forceRefresh &&
    cachedReadiness &&
    cachedReadiness.key === cacheKey &&
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

  const timeoutMs = options.timeoutMs ?? 20_000;
  const harness = createNativeRpcHarness(
    {
      command: options.command,
      args: options.args,
      cwd: options.cwd,
      env: effectiveEnv,
      spawnImpl: options.spawnImpl
    },
    true // Always suppress browser launch during readiness probes
  );

  let interactiveLoginTriggeredOnStderr = false;
  let resolveStderrAuthRequired: (() => void) | null = null;
  const stderrAuthRequiredPromise = new Promise<'stderr_auth_required'>((resolveSignal) => {
    resolveStderrAuthRequired = () => resolveSignal('stderr_auth_required');
  });

  harness.onStderrLine((line) => {
    if (
      line.includes('Credentials missing or invalid') ||
      line.includes('Launching browser login flow') ||
      line.includes('Open the following link to authenticate')
    ) {
      interactiveLoginTriggeredOnStderr = true;
      resolveStderrAuthRequired?.();
    }
  });

  try {
    const initResult = await harness.request(
      'initialize',
      {
        protocolVersion: 1,
        clientInfo: { name: 'zed', title: 'Zana Command Center (zcc)', version: '1.0.0' },
        clientCapabilities: {
          fs: { readTextFile: false, writeTextFile: false },
          terminal: false,
          _meta: { parameterizedModelPicker: true }
        }
      },
      timeoutMs
    );

    const protocolVersion =
      typeof initResult?.protocolVersion === 'number' ? initResult.protocolVersion : null;
    const agentVersion =
      typeof initResult?.agentInfo?.version === 'string' ? initResult.agentInfo.version : null;
    const advertisedAuthMethods: string[] = Array.isArray(initResult?.authMethods)
      ? initResult.authMethods
          .map((m: any) => (typeof m?.id === 'string' ? m.id : null))
          .filter((id: string | null): id is string => Boolean(id))
      : [];

    if (protocolVersion !== 1) {
      return {
        state: 'runtime_launches',
        agentVersion,
        protocolVersion,
        advertisedAuthMethods,
        selectedAuthMethod: options.authMethod,
        configuredAuthType,
        models: [],
        modes: [],
        disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
        error: `Unsupported ACP protocolVersion returned by native runtime: ${String(protocolVersion)}`,
        checkedAt: Date.now()
      };
    }

    if (
      advertisedAuthMethods.length > 0 &&
      !advertisedAuthMethods.includes(options.authMethod)
    ) {
      return {
        state: 'runtime_launches',
        agentVersion,
        protocolVersion,
        advertisedAuthMethods,
        selectedAuthMethod: options.authMethod,
        configuredAuthType,
        models: [],
        modes: [],
        disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
        error: `Selected auth method "${options.authMethod}" is not advertised by native server (${advertisedAuthMethods.join(', ')}).`,
        checkedAt: Date.now()
      };
    }

    if (
      !configuredAuthType &&
      (options.authMethod === 'gemini-api-key' || options.authMethod === 'agent-platform')
    ) {
      await harness.request(
        'authenticate',
        { methodId: options.authMethod, _meta: { headless: true } },
        timeoutMs
      );
      writeNativeAcpAuthType(options.authMethod, options.env);
    }

    const sessionRace = await Promise.race([
      harness.request(
        'session/new',
        { cwd: options.cwd || process.cwd(), mcpServers: [] },
        timeoutMs
      ),
      stderrAuthRequiredPromise
    ]);

    if (sessionRace === 'stderr_auth_required' || interactiveLoginTriggeredOnStderr) {
      const signInResult: NativeReadinessResult = {
        state: 'sign_in_required',
        agentVersion,
        protocolVersion,
        advertisedAuthMethods,
        selectedAuthMethod: options.authMethod,
        configuredAuthType,
        models: [],
        modes: [],
        disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
        error:
          'Google OAuth credentials are missing or expired. Click "Sign In with Google" to authenticate.',
        checkedAt: Date.now()
      };
      cachedReadiness = { key: cacheKey, result: signInResult };
      return signInResult;
    }

    const discoveredModels = extractModelsFromSessionResult(sessionRace);
    const models = discoveredModels.length > 0 ? discoveredModels : DEFAULT_NATIVE_MODELS;
    const modes = extractModesFromSessionResult(sessionRace);
    const tierName =
      typeof sessionRace?._meta?.antigravity?.tier?.name === 'string'
        ? sessionRace._meta.antigravity.tier.name
        : null;

    // Sync any refreshed token back to ~/.gemini/antigravity-acp
    if (!options.env?.GEMINI_HOME) {
      const userGeminiHome = resolveGeminiHome(options.env);
      syncFileNewer(
        join(sanitized.geminiHome, 'antigravity-acp', 'acp_token.json'),
        join(userGeminiHome, 'antigravity-acp', 'acp_token.json')
      );
    }

    const readyResult: NativeReadinessResult = {
      state: 'session_ready',
      agentVersion,
      protocolVersion,
      advertisedAuthMethods,
      selectedAuthMethod: options.authMethod,
      configuredAuthType: readConfiguredNativeAuthType(effectiveEnv) ?? options.authMethod,
      models,
      modes,
      tierName,
      disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
      checkedAt: Date.now()
    };
    cachedReadiness = { key: cacheKey, result: readyResult };
    writePersistedReadiness(cacheKey, readyResult);
    return readyResult;
  } catch (err: any) {
    const message = err?.message || String(err);
    const isAuthRequired =
      interactiveLoginTriggeredOnStderr ||
      err?.code === -32000 ||
      message.includes('Authentication required') ||
      message.includes('No authentication method selected');

    const failedResult: NativeReadinessResult = {
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
    cachedReadiness = { key: cacheKey, result: failedResult };
    return failedResult;
  } finally {
    harness.close();
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
    return {
      state: 'runtime_missing',
      agentVersion: null,
      protocolVersion: null,
      advertisedAuthMethods: [],
      selectedAuthMethod: options.authMethod,
      configuredAuthType: readConfiguredNativeAuthType(options.env),
      models: [],
      modes: [],
      error: `Native ACP binary not found at "${options.command}". Install the runtime first.`,
      checkedAt: Date.now()
    };
  }

  const sanitized = prepareSanitizedGeminiHome({
    env: options.env,
    authMethod: options.authMethod
  });
  const effectiveEnv: NodeJS.ProcessEnv = {
    ...(options.env ?? process.env),
    GEMINI_HOME: sanitized.geminiHome
  };

  const timeoutMs = options.timeoutMs ?? 120_000;
  const harness = createNativeRpcHarness(
    {
      command: options.command,
      args: options.args,
      cwd: options.cwd,
      env: effectiveEnv,
      spawnImpl: options.spawnImpl
    },
    false // Allow browser launch during user-initiated sign-in
  );

  harness.onStderrLine((line) => {
    const match = line.match(/https:\/\/accounts\.google\.com\/o\/oauth2\/\S+/);
    if (match && match[0]) {
      options.onAuthUrl?.(match[0]);
    }
  });

  try {
    const initResult = await harness.request(
      'initialize',
      {
        protocolVersion: 1,
        clientInfo: { name: 'zed', title: 'Zana Command Center (zcc)', version: '1.0.0' },
        clientCapabilities: {
          fs: { readTextFile: false, writeTextFile: false },
          terminal: false,
          _meta: { parameterizedModelPicker: true }
        }
      },
      20_000
    );

    const protocolVersion =
      typeof initResult?.protocolVersion === 'number' ? initResult.protocolVersion : 1;
    const agentVersion =
      typeof initResult?.agentInfo?.version === 'string' ? initResult.agentInfo.version : null;
    const advertisedAuthMethods: string[] = Array.isArray(initResult?.authMethods)
      ? initResult.authMethods
          .map((m: any) => (typeof m?.id === 'string' ? m.id : null))
          .filter((id: string | null): id is string => Boolean(id))
      : [...GOOGLE_ACP_AUTH_METHODS];

    if (
      advertisedAuthMethods.length > 0 &&
      !advertisedAuthMethods.includes(options.authMethod)
    ) {
      throw new Error(
        `Authentication method "${options.authMethod}" is not supported by this native server.`
      );
    }

    await harness.request('authenticate', { methodId: options.authMethod }, timeoutMs);
    writeNativeAcpAuthType(options.authMethod, options.env);

    const sessionResult = await harness.request(
      'session/new',
      { cwd: options.cwd || process.cwd(), mcpServers: [] },
      25_000
    );

    // Sync token back to user ~/.gemini/antigravity-acp
    if (!options.env?.GEMINI_HOME) {
      const userGeminiHome = resolveGeminiHome(options.env);
      syncFileNewer(
        join(sanitized.geminiHome, 'antigravity-acp', 'acp_token.json'),
        join(userGeminiHome, 'antigravity-acp', 'acp_token.json')
      );
    }

    const discoveredModels = extractModelsFromSessionResult(sessionResult);
    const models = discoveredModels.length > 0 ? discoveredModels : DEFAULT_NATIVE_MODELS;
    const modes = extractModesFromSessionResult(sessionResult);
    const tierName =
      typeof sessionResult?._meta?.antigravity?.tier?.name === 'string'
        ? sessionResult._meta.antigravity.tier.name
        : null;

    clearCachedNativeReadiness();

    const readyResult: NativeReadinessResult = {
      state: 'session_ready',
      agentVersion,
      protocolVersion,
      advertisedAuthMethods,
      selectedAuthMethod: options.authMethod,
      configuredAuthType: options.authMethod,
      models,
      modes,
      tierName,
      disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
      checkedAt: Date.now()
    };

    const cacheKey = JSON.stringify({
      command: options.command,
      args: options.args,
      authMethod: options.authMethod,
      configuredAuthType: options.authMethod
    });
    cachedReadiness = { key: cacheKey, result: readyResult };
    writePersistedReadiness(cacheKey, readyResult);
    return readyResult;
  } catch (err: any) {
    return {
      state: 'sign_in_required',
      agentVersion: null,
      protocolVersion: 1,
      advertisedAuthMethods: [...GOOGLE_ACP_AUTH_METHODS],
      selectedAuthMethod: options.authMethod,
      configuredAuthType: readConfiguredNativeAuthType(effectiveEnv),
      models: [],
      modes: [],
      disabledDeadMcpServers: sanitized.disabledDeadMcpServers,
      error: err?.message || 'Interactive Google sign-in failed or timed out.',
      checkedAt: Date.now()
    };
  } finally {
    harness.close();
  }
}
