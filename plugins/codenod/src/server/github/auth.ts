import { spawn } from 'node:child_process';
import { normalizeHost } from './refs.ts';

export type TokenSource = 'gh' | 'git-credential' | 'setting';

export interface ResolvedToken {
  token: string;
  source: TokenSource;
}

/** Runs a command and returns trimmed stdout, or null on any failure. */
export type CommandRunner = (
  command: string,
  args: string[],
  options?: { input?: string; timeoutMs?: number }
) => Promise<string | null>;

const COMMAND_TIMEOUT_MS = 8_000;

export const runCommand: CommandRunner = (command, args, options = {}) =>
  new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'ignore'],
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1' }
      });
    } catch {
      resolve(null);
      return;
    }
    let stdout = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(null);
    }, options.timeoutMs ?? COMMAND_TIMEOUT_MS);
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? stdout.trim() : null);
    });
    child.stdin?.end(options.input ?? '');
  });

/**
 * Parses the pasted-token setting. One entry per line or comma:
 * `host=token`, or a bare token which applies to github.com.
 */
export function parseTokenSetting(raw: string | undefined): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const entry of (raw ?? '').split(/[\n,]+/)) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      tokens.set('github.com', trimmed);
      continue;
    }
    const host = trimmed.slice(0, separator).trim();
    const token = trimmed.slice(separator + 1).trim();
    if (!host || !token) continue;
    try {
      tokens.set(normalizeHost(host), token);
    } catch {
      // Ignore malformed host entries; the status view reports missing auth.
    }
  }
  return tokens;
}

export async function tokenFromGh(host: string, run: CommandRunner): Promise<string | null> {
  const output = await run('gh', ['auth', 'token', '--hostname', host]);
  return output && !/\s/.test(output) ? output : null;
}

export async function tokenFromGitCredential(host: string, run: CommandRunner): Promise<string | null> {
  const output = await run('git', ['credential', 'fill'], { input: `protocol=https\nhost=${host}\n\n` });
  if (!output) return null;
  const password = output
    .split('\n')
    .find((line) => line.startsWith('password='))
    ?.slice('password='.length)
    .trim();
  return password ? password : null;
}

export interface TokenResolverOptions {
  run?: CommandRunner;
  readTokenSetting: () => Promise<string | undefined>;
  cacheTtlMs?: number;
  now?: () => number;
}

const DEFAULT_CACHE_TTL_MS = 10 * 60_000;

/** Resolves a token per host: gh CLI, then git credential helper, then the pasted setting. */
export function createTokenResolver(options: TokenResolverOptions) {
  const run = options.run ?? runCommand;
  const now = options.now ?? Date.now;
  const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const cache = new Map<string, { value: ResolvedToken | null; at: number }>();

  async function resolve(host: string): Promise<ResolvedToken | null> {
    const cached = cache.get(host);
    if (cached && now() - cached.at < ttl) return cached.value;
    let value: ResolvedToken | null = null;
    const fromGh = await tokenFromGh(host, run);
    if (fromGh) value = { token: fromGh, source: 'gh' };
    if (!value) {
      const fromGit = await tokenFromGitCredential(host, run);
      if (fromGit) value = { token: fromGit, source: 'git-credential' };
    }
    if (!value) {
      const fromSetting = parseTokenSetting(await options.readTokenSetting()).get(host);
      if (fromSetting) value = { token: fromSetting, source: 'setting' };
    }
    cache.set(host, { value, at: now() });
    return value;
  }

  return {
    resolve,
    invalidate(host?: string) {
      if (host) cache.delete(host);
      else cache.clear();
    }
  };
}

export type TokenResolver = ReturnType<typeof createTokenResolver>;
