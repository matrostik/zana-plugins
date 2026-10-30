import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { forgetStatMemo, GOOGLE_ACP_AUTH_METHODS, memoizeByStat, type GoogleAcpAuthMethod } from './gemini-home.js';
import { getZccDataDir } from './native-runtime.js';

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

/** What a readiness result is attributed to: the runtime/auth configuration and the account fingerprint. */
export interface ReadinessSlot {
  key: string;
  fingerprint: string;
}

/** Who a result describes, for the named constructors. */
export interface ReadinessSubject {
  authMethod: GoogleAcpAuthMethod;
  configuredAuthType: string | null;
  disabledDeadMcpServers?: string[];
}

/** A result with the defaults of an unverified runtime; `fields` override them. */
export function readinessResult(
  state: NativeSetupState,
  subject: ReadinessSubject,
  fields: Partial<NativeReadinessResult> = {}
): NativeReadinessResult {
  return {
    state,
    agentVersion: null,
    protocolVersion: 1,
    advertisedAuthMethods: [...GOOGLE_ACP_AUTH_METHODS],
    selectedAuthMethod: subject.authMethod,
    configuredAuthType: subject.configuredAuthType,
    models: [],
    modes: [],
    ...(subject.disabledDeadMcpServers ? { disabledDeadMcpServers: subject.disabledDeadMcpServers } : {}),
    checkedAt: Date.now(),
    ...fields
  };
}

export function runtimeMissingResult(command: string, subject: ReadinessSubject): NativeReadinessResult {
  return readinessResult('runtime_missing', subject, { protocolVersion: null, advertisedAuthMethods: [],
    error: `Native ACP binary not found at "${command}".` });
}

export const READINESS_CACHE_TTL_MS = 10 * 60 * 1000;

function isPersistedResult(raw: any): boolean {
  return raw?.result && typeof raw.result === 'object'
    && Number.isFinite(raw.result.checkedAt) && Array.isArray(raw.result.models)
    && raw.result.models.every((model: any) => typeof model?.id === 'string' && typeof model?.name === 'string')
    && Array.isArray(raw.result.modes) && Array.isArray(raw.result.advertisedAuthMethods);
}

/**
 * Readiness shared between processes: one in-memory entry plus a file under the ZCC data directory,
 * so a Settings probe also answers health and model-list reads in thread host processes.
 */
export class ReadinessStore {
  private memory: (ReadinessSlot & { result: NativeReadinessResult }) | null = null;

  constructor(private readonly options: { now?: () => number; ttlMs?: number } = {}) {}

  private now(): number {
    return this.options.now ? this.options.now() : Date.now();
  }

  private isFresh(result: NativeReadinessResult): boolean {
    return this.now() - result.checkedAt < (this.options.ttlMs ?? READINESS_CACHE_TTL_MS);
  }

  /**
   * The freshest result for the slot from memory or disk, newer winning. With `allowStale`, an
   * expired catalog for the same account is returned as `authenticated` with `catalogStale`; it
   * also outlives a fresher transient failure, whose error it carries.
   */
  lookup(slot: ReadinessSlot, env: NodeJS.ProcessEnv, options: { allowStale?: boolean } = {}): NativeReadinessResult | null {
    const memory = this.memory && this.memory.key === slot.key && this.memory.fingerprint === slot.fingerprint
      && this.isFresh(this.memory.result) ? this.memory.result : null;
    const persisted = this.readPersisted(slot, env);
    if (persisted && this.isFresh(persisted) && (!memory || persisted.checkedAt > memory.checkedAt)) {
      this.memory = { ...slot, result: persisted };
      return persisted;
    }
    const stale = options.allowStale && persisted && persisted.state === 'session_ready' && persisted.models.length > 0
      ? { ...persisted, state: 'authenticated' as const, catalogStale: true }
      : null;
    if (memory && stale && memory.state === 'runtime_launches') return { ...stale, error: memory.error };
    return memory ?? stale;
  }

  /** Transient runtime failures stay in this process; every other result is shared through disk. */
  put(slot: ReadinessSlot, result: NativeReadinessResult, env: NodeJS.ProcessEnv): void {
    this.memory = { ...slot, result };
    if (result.state !== 'runtime_launches') this.writePersisted(slot, result, env);
  }

  invalidate(env: NodeJS.ProcessEnv): void {
    this.memory = null;
    try {
      const filePath = this.path(env);
      forgetStatMemo(filePath);
      rmSync(filePath, { force: true });
    } catch {
      // Ignore
    }
  }

  private path(env: NodeJS.ProcessEnv): string {
    return join(getZccDataDir(env), 'state', 'antigravity-native-readiness.json');
  }

  private readPersisted(slot: ReadinessSlot, env: NodeJS.ProcessEnv): NativeReadinessResult | null {
    const filePath = this.path(env);
    const raw = memoizeByStat(filePath, () => {
      try {
        return existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf8')) : null;
      } catch {
        return null; // Ignore corrupted cache
      }
    });
    return raw && raw.key === slot.key && (raw.fingerprint || '') === slot.fingerprint && isPersistedResult(raw)
      ? raw.result as NativeReadinessResult
      : null;
  }

  private writePersisted(slot: ReadinessSlot, result: NativeReadinessResult, env: NodeJS.ProcessEnv): void {
    try {
      const filePath = this.path(env);
      mkdirSync(dirname(filePath), { recursive: true });
      const temporary = `${filePath}.${randomUUID()}.tmp`;
      try {
        writeFileSync(temporary, JSON.stringify({ key: slot.key, result, fingerprint: slot.fingerprint }, null, 2) + '\n', { mode: 0o600 });
        renameSync(temporary, filePath);
      } finally {
        rmSync(temporary, { force: true });
        forgetStatMemo(filePath);
      }
    } catch {
      // Ignore cache write errors
    }
  }
}

export const readinessStore = new ReadinessStore();
