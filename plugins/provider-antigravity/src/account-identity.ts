import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { getZccDataDir } from './native-runtime.js';
import {
  getNativeAcpSettingsPath,
  getNativeAcpTokenPath,
  isAuthExplicitlyCleared,
  memoizeByStat,
  prepareSanitizedGeminiHome,
  readConfiguredNativeAuthType,
  readNativeAcpSettings,
  resolveSourceAndManagedGeminiHome,
  withGeminiHome,
  writeAuthTypeSettings,
  type GoogleAcpAuthMethod,
  type PreparedGeminiHome
} from './gemini-home.js';

/** The runtime and account a native diagnostic runs against. */
export interface NativeTarget {
  command: string;
  args: string[];
  authMethod: GoogleAcpAuthMethod;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

/** Bumped on every explicit in-process invalidation (sign-in, sign-out, auth type or runtime change). */
let generation = 0;
/** The latest auth-type write a headless diagnostic in this process made, per managed home. */
const ownWrites = new Map<string, { before: string; after: string }>();

/** Every snapshot captured before this call stops being current. */
export function invalidateAccounts(): void {
  generation++;
  ownWrites.clear();
}

function fingerprintCredentials(env: NodeJS.ProcessEnv, authMethod: GoogleAcpAuthMethod): string {
  const tokenPath = getNativeAcpTokenPath(env);
  const tokenInfo = memoizeByStat(tokenPath, () => {
    if (!existsSync(tokenPath)) return 'no-token';
    try {
      const contents = readFileSync(tokenPath, 'utf8');
      let identity = contents;
      try {
        const token = JSON.parse(contents);
        if (typeof token.refresh_token === 'string') identity = `${token.client_id ?? ''}:${token.refresh_token}`;
      } catch { /* Hash malformed contents too, without exposing them. */ }
      return createHash('sha256').update(identity).digest('hex');
    } catch {
      return 'err';
    }
  });
  const configured = readConfiguredNativeAuthType(env) ?? 'none';
  const apiKey = env.GEMINI_API_KEY ? `key:${createHash('sha256').update(env.GEMINI_API_KEY).digest('hex')}` : 'no-key';
  const gacPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  const appCreds = gacPath ? memoizeByStat(gacPath, () => {
    let cloudIdentity = gacPath;
    try { cloudIdentity += ':' + readFileSync(gacPath, 'utf8'); }
    catch { cloudIdentity += ':unreadable'; }
    return `gac:${createHash('sha256').update(cloudIdentity).digest('hex')}`;
  }) : 'no-gac';
  const settings = memoizeByStat(getNativeAcpSettingsPath(env), () => readNativeAcpSettings(env));
  const cloudProject = createHash('sha256').update(JSON.stringify([
    settings?.gcp ?? null, env.GOOGLE_CLOUD_PROJECT, env.GOOGLE_CLOUD_LOCATION,
    env.CLOUD_ML_PROJECT_ID, env.GOOGLE_API_KEY
  ])).digest('hex');
  const cleared = isAuthExplicitlyCleared(env) ? 'cleared' : 'uncleared';
  return `${authMethod}:${configured}:${cleared}:${tokenInfo}:${apiKey}:${appCreds}:${cloudProject}`;
}

/** Both homes count: the managed one is what the runtime reads, the source one catches sign-out elsewhere. */
function fingerprintAccount(env: NodeJS.ProcessEnv, authMethod: GoogleAcpAuthMethod): { managed: string; source: string } {
  const { managedGeminiHome } = resolveSourceAndManagedGeminiHome(env);
  return {
    managed: fingerprintCredentials(withGeminiHome(env, managedGeminiHome), authMethod),
    source: fingerprintCredentials(env, authMethod)
  };
}

function combine(fingerprints: { managed: string; source: string }): string {
  return `${fingerprints.managed}\n${fingerprints.source}`;
}

function hashCredentialId(managedFingerprint: string): string {
  return createHash('sha256').update(managedFingerprint).digest('hex').slice(0, 16);
}

/**
 * The account a diagnostic started against. Results are attributed to it, and it stays current
 * until credentials change, an explicit invalidation runs, or the account is switched elsewhere.
 */
export class AccountSnapshot {
  readonly home: PreparedGeminiHome;
  /** The caller's environment pointed at the managed home the runtime uses. */
  readonly effectiveEnv: NodeJS.ProcessEnv;
  private readonly generation = generation;
  private fingerprints: { managed: string; source: string };

  constructor(readonly target: NativeTarget, home: PreparedGeminiHome) {
    this.home = home;
    this.effectiveEnv = withGeminiHome(target.env, home.geminiHome);
    this.fingerprints = fingerprintAccount(target.env ?? process.env, target.authMethod);
  }

  get fingerprint(): string {
    return this.fingerprints.managed;
  }

  /** Read live so keys follow this diagnostic's own auth-type write. */
  get configuredAuthType(): string | null {
    return readConfiguredNativeAuthType(this.effectiveEnv);
  }

  /** Identifies cached readiness for this runtime and auth configuration. */
  get readinessKey(): string {
    const { command, args, authMethod } = this.target;
    return JSON.stringify({ command, args, authMethod, configuredAuthType: this.configuredAuthType });
  }

  /** Identifies catalog and usage refreshes for this runtime and account. */
  get refreshKey(): string {
    const { command, args, authMethod, cwd, env } = this.target;
    return JSON.stringify([command, args, authMethod, cwd, getZccDataDir(env),
      resolveSourceAndManagedGeminiHome(env).managedGeminiHome, this.fingerprint]);
  }

  /** Opaque, so UIs can drop results that belong to a previous sign-in. */
  get credentialId(): string {
    return hashCredentialId(this.fingerprint);
  }

  /** A fresh snapshot of the same target, for an account that just changed on purpose (sign-in). */
  recapture(): AccountSnapshot {
    return new AccountSnapshot(this.target, this.home);
  }

  isCurrent(): boolean {
    if (this.generation !== generation) return false;
    const now = fingerprintAccount(this.target.env ?? process.env, this.target.authMethod);
    if (combine(now) === combine(this.fingerprints)) return true;
    // Another diagnostic in this process wrote the same auth type for this account: adopt it.
    const write = ownWrites.get(this.home.geminiHome);
    if (write && write.before === combine(this.fingerprints) && write.after === combine(now)) {
      this.fingerprints = now;
      return true;
    }
    return false;
  }

  /**
   * Records the auth type a headless authenticate just accepted. Only this synchronous write may move
   * the snapshot forward; any other change since capture still fails validation.
   */
  commitHeadlessAuthType(): void {
    if (!this.isCurrent()) {
      throw new Error('Antigravity sign-in changed during authentication. Retry to load the current account.');
    }
    const before = combine(this.fingerprints);
    writeAuthTypeSettings(this.target.authMethod, this.target.env);
    const after = fingerprintAccount(this.target.env ?? process.env, this.target.authMethod);
    if (combine(after) !== before) ownWrites.set(this.home.geminiHome, { before, after: combine(after) });
    this.fingerprints = after;
  }
}

/** Syncs the managed home first, so the snapshot describes the account the runtime will use. */
export function captureAccount(target: NativeTarget): AccountSnapshot {
  return new AccountSnapshot(target, prepareSanitizedGeminiHome({ env: target.env, authMethod: target.authMethod }));
}

/** The credential id for the current managed-home account, without preparing the home. */
export function currentCredentialId(authMethod: GoogleAcpAuthMethod, env: NodeJS.ProcessEnv = process.env): string {
  return hashCredentialId(fingerprintAccount(env, authMethod).managed);
}
