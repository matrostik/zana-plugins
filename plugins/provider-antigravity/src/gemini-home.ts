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
import { getZccDataDir } from './native-runtime.js';

export const GOOGLE_ACP_AUTH_METHODS = [
  'oauth-personal',
  'oauth-business',
  'gemini-api-key',
  'agent-platform'
] as const;

export type GoogleAcpAuthMethod = (typeof GOOGLE_ACP_AUTH_METHODS)[number];

export interface PreparedGeminiHome {
  geminiHome: string;
  disabledDeadMcpServers: string[];
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

/** API-key and platform credentials live in the environment; their auth type is written by a headless authenticate. */
export function isHeadlessAuthMethod(authMethod: GoogleAcpAuthMethod): boolean {
  return authMethod === 'gemini-api-key' || authMethod === 'agent-platform';
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

/** The environment the native runtime sees: the caller's environment pointed at the managed home. */
export function withGeminiHome(env: NodeJS.ProcessEnv | undefined, geminiHome: string): NodeJS.ProcessEnv {
  return { ...(env ?? process.env), GEMINI_HOME: geminiHome };
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

/** Health and model-list reads are hot paths; only re-read a file when its stat stamp changes. */
const statMemo = new Map<string, { stamp: string; value: unknown }>();

export function memoizeByStat<T>(filePath: string, compute: () => T): T {
  let stamp: string;
  try {
    const stat = statSync(filePath);
    stamp = `${stat.ino}:${stat.size}:${stat.mtimeMs}`;
  } catch {
    stamp = 'missing';
  }
  const hit = statMemo.get(filePath);
  if (hit && hit.stamp === stamp) return hit.value as T;
  const value = compute();
  statMemo.set(filePath, { stamp, value });
  return value;
}

export function forgetStatMemo(filePath: string): void {
  statMemo.delete(filePath);
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

/** Writes the auth type to the configured, source and managed homes. Cache invalidation is the caller's decision. */
export function writeAuthTypeSettings(
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

/** Shares a token the runtime refreshed in the managed home with the user's own Gemini home. */
export function syncTokenToSource(home: PreparedGeminiHome, env?: NodeJS.ProcessEnv): void {
  if (env?.GEMINI_HOME) return;
  syncFileNewer(
    join(home.geminiHome, 'antigravity-acp', 'acp_token.json'),
    join(resolveGeminiHome(env), 'antigravity-acp', 'acp_token.json')
  );
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
}): PreparedGeminiHome {
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
