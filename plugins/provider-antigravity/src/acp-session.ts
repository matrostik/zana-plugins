import { spawn, type ChildProcess } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { killProcessTree } from './native-runtime.js';
import type { DiscoveredNativeModel } from './readiness-store.js';

export interface NativeSessionOptions {
  command: string;
  args: string[];
  cwd?: string;
  /** The full environment the runtime sees, already pointed at the managed Gemini home. */
  env: NodeJS.ProcessEnv;
  /** Transport seam: real `spawn` in production, a scripted fake server in tests. */
  spawnImpl?: typeof spawn;
  /** Per-request timeout, and the overall deadline of a diagnostic session. */
  timeoutMs: number;
  /** Names the session in its deadline error, e.g. "session verification". */
  operation: string;
  /**
   * Interactive sign-in: the runtime may open a browser, there is no overall deadline, and stderr
   * sign-in prompts are expected output rather than a sign-in failure.
   */
  interactive?: boolean;
}

export interface InitializeInfo {
  protocolVersion: number | null;
  agentVersion: string | null;
  /** Empty when the runtime does not advertise its methods. */
  advertisedAuthMethods: string[];
}

export type NewSessionOutcome =
  | { kind: 'ready'; session: any }
  | { kind: 'sign_in_required' };

/** How long to wait for a late config_option_update when session/new returned no models. */
const CATALOG_UPDATE_WAIT_MS = 1000;
const CATALOG_UPDATE_MAX_SESSIONS = 16;
const SIGN_IN_PROMPTS = [
  'Credentials missing or invalid',
  'Launching browser login flow',
  'Open the following link to authenticate'
];

type Pending = { resolve: (value: any) => void; reject: (error: any) => void; timer: ReturnType<typeof setTimeout> };

function forEachLine(stream: NodeJS.ReadableStream | null, onLine: (line: string) => void): void {
  if (!stream) return;
  const decoder = new StringDecoder('utf8');
  let buffer = '';
  stream.on('data', (chunk: Buffer | string) => {
    buffer += typeof chunk === 'string' ? chunk : decoder.write(chunk);
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onLine(line);
    }
  });
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

export const extractCatalog = extractModelsFromSessionResult;

/**
 * One short-lived Native ACP conversation used for diagnostics and sign-in. It owns the process,
 * JSON-RPC framing, the stderr sign-in signal, notification tracking and cleanup; it never
 * approves tools or serves filesystem requests.
 */
export class NativeAcpSession {
  private readonly child: ChildProcess;
  private readonly pending = new Map<number, Pending>();
  private readonly notificationListeners: Array<(method: string, params: any) => void> = [];
  private readonly stderrListeners: Array<(line: string) => void> = [];
  private readonly catalogUpdates = new Map<string, any[]>();
  private readonly availableCommands = new Set<string>();
  private readonly signInWaiters: Array<() => void> = [];
  /** Deadline and waits; closing runs them early so no wait outlives the session. */
  private readonly timers = new Map<ReturnType<typeof setTimeout>, () => void>();
  private nextId = 1;
  private closed = false;
  private signInPrompts = 0;

  private constructor(private readonly options: NativeSessionOptions) {
    const spawnFn = options.spawnImpl ?? spawn;
    this.child = spawnFn(options.command, options.args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env, ...(options.interactive ? {} : { BROWSER: 'echo' }) },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
    forEachLine(this.child.stdout, line => this.handleStdoutLine(line));
    forEachLine(this.child.stderr, line => this.handleStderrLine(line));
    this.child.on('error', error => this.rejectAll(error));
    this.child.stdin?.on?.('error', (error: Error) => this.rejectAll(error));
    this.child.on('close', code => {
      this.closed = true;
      this.rejectAll(new Error(`Native ACP server exited (code ${code ?? 'null'})`));
    });
    if (!options.interactive) {
      this.later(options.timeoutMs, () =>
        this.close(new Error(`Native ACP ${options.operation} timed out after ${options.timeoutMs}ms`)));
    }
  }

  static open(options: NativeSessionOptions): NativeAcpSession {
    return new NativeAcpSession(options);
  }

  /** True once the runtime printed a sign-in prompt on stderr. */
  get signInRequested(): boolean {
    return this.signInPrompts > 0;
  }

  onStderrLine(listener: (line: string) => void): void {
    this.stderrListeners.push(listener);
  }

  async initialize(): Promise<InitializeInfo> {
    const result = await this.request('initialize', {
      protocolVersion: 1,
      clientInfo: { name: 'zcc', title: 'Zana Command Center', version: '1.0.0' },
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
        _meta: { parameterizedModelPicker: true }
      }
    });
    return {
      protocolVersion: typeof result?.protocolVersion === 'number' ? result.protocolVersion : null,
      agentVersion: typeof result?.agentInfo?.version === 'string' ? result.agentInfo.version : null,
      advertisedAuthMethods: Array.isArray(result?.authMethods)
        ? result.authMethods.map((method: any) => (typeof method?.id === 'string' ? method.id : null)).filter(Boolean)
        : []
    };
  }

  async authenticate(methodId: string, options: { headless?: boolean; timeoutMs?: number } = {}): Promise<void> {
    await this.request('authenticate', { methodId, ...(options.headless ? { _meta: { headless: true } } : {}) },
      options.timeoutMs);
  }

  /**
   * Opens a session, or reports that the runtime asked for sign-in instead. With `awaitCatalog`,
   * the session's configOptions reflect the latest config_option_update, briefly awaiting a late one
   * when session/new itself carried no models.
   */
  async newSession(options: { awaitCatalog?: boolean; timeoutMs?: number } = {}): Promise<NewSessionOutcome> {
    const prompted = () => !this.options.interactive && this.signInRequested;
    const request = this.request('session/new', { cwd: this.options.cwd || process.cwd(), mcpServers: [] }, options.timeoutMs);
    const session = this.options.interactive ? await request : await Promise.race([
      request,
      new Promise<'sign_in_required'>(resolve => {
        if (this.signInRequested) resolve('sign_in_required');
        else this.signInWaiters.push(() => resolve('sign_in_required'));
      })
    ]);
    if (session === 'sign_in_required' || prompted()) return { kind: 'sign_in_required' };
    if (options.awaitCatalog) await this.applyCatalogUpdate(session);
    return prompted() ? { kind: 'sign_in_required' } : { kind: 'ready', session };
  }

  /** Resolves true once the runtime advertises `/name`, or false after `waitMs`. */
  waitForCommand(name: string, waitMs: number): Promise<boolean> {
    if (this.availableCommands.has(name)) return Promise.resolve(true);
    return new Promise(resolve => {
      const timer = this.later(waitMs, () => resolve(this.availableCommands.has(name)));
      this.notificationListeners.push(() => {
        if (!this.availableCommands.has(name)) return;
        this.cancel(timer);
        resolve(true);
      });
    });
  }

  /**
   * Runs a local slash command and collects its text output. The session is stopped, and the
   * command fails, if it requests a tool or its output exceeds `maxTextChars`.
   */
  async runCommand(sessionId: string, name: string, options: { maxTextChars: number }): Promise<{ stopReason: unknown; text: string }> {
    let text = '';
    const toolsRequested = new Error(`Native ${name} unexpectedly requested tools; the diagnostic session was stopped.`);
    let requestedTools = false;
    let outputLimitError: Error | null = null;
    this.notificationListeners.push((method, params) => {
      if (method !== 'session/update') return;
      const update = params?.update;
      if (update?.sessionUpdate === 'tool_call') {
        requestedTools = true;
        this.close(toolsRequested);
      }
      if (update?.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text') {
        text += update.content.text;
        if (text.length > options.maxTextChars) {
          outputLimitError = new Error(`Native ${name} output exceeded ${options.maxTextChars} characters; the diagnostic session was stopped.`);
          this.close(outputLimitError);
        }
      }
    });
    const result = await this.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: `/${name}` }] });
    // A tool call can arrive in the same chunk as the reply; it still fails the command.
    if (requestedTools) throw toolsRequested;
    if (outputLimitError) throw outputLimitError;
    return { stopReason: result?.stopReason, text };
  }

  close(reason?: Error): void {
    if (!this.closed) {
      this.closed = true;
      this.rejectAll(reason ?? new Error('Native ACP probe closed'));
      killProcessTree(this.child);
    }
    for (const [timer, run] of [...this.timers]) {
      clearTimeout(timer);
      this.timers.delete(timer);
      run();
    }
  }

  private request(method: string, params: Record<string, unknown>, timeoutMs = this.options.timeoutMs): Promise<any> {
    if (this.closed) return Promise.reject(new Error('Native ACP server is already closed'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`ACP request "${method}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.child.stdin?.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  private handleStdoutLine(line: string): void {
    let message: any;
    try {
      message = JSON.parse(line);
    } catch {
      return; // Skip unparseable lines
    }
    if (!message || typeof message !== 'object') return;
    if (typeof message.method === 'string') {
      if (message.id !== undefined) this.replyToServerRequest(message);
      else this.handleNotification(message.method, message.params);
      return;
    }
    const entry = this.pending.get(Number(message.id));
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(Number(message.id));
    if (message.error) {
      const error: any = new Error(message.error?.data?.message || message.error?.message || `ACP error ${message.error?.code}`);
      error.code = message.error?.code;
      error.data = message.error?.data;
      entry.reject(error);
    } else {
      entry.resolve(message.result);
    }
  }

  /** Diagnostics never approve tools or service arbitrary filesystem requests. */
  private replyToServerRequest(message: any): void {
    const reply = message.method === 'session/request_permission'
      ? { result: { outcome: { outcome: 'cancelled' } } }
      : { error: { code: -32601, message: 'Not supported by the diagnostic client' } };
    this.child.stdin?.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, ...reply }) + '\n');
  }

  private handleNotification(method: string, params: any): void {
    const update = method === 'session/update' ? params?.update : undefined;
    if (update?.sessionUpdate === 'available_commands_update') {
      // A partial command list may precede the one that includes a command; track the latest list.
      this.availableCommands.clear();
      for (const command of Array.isArray(update.availableCommands) ? update.availableCommands : []) {
        if (typeof command?.name === 'string') this.availableCommands.add(command.name);
      }
    }
    if (update?.sessionUpdate === 'config_option_update' && typeof params?.sessionId === 'string'
      && Array.isArray(update.configOptions)
      && (this.catalogUpdates.size < CATALOG_UPDATE_MAX_SESSIONS || this.catalogUpdates.has(params.sessionId))) {
      this.catalogUpdates.set(params.sessionId, update.configOptions);
    }
    for (const listener of [...this.notificationListeners]) listener(method, params);
  }

  private handleStderrLine(line: string): void {
    if (SIGN_IN_PROMPTS.some(prompt => line.includes(prompt))) {
      this.signInPrompts++;
      for (const wake of this.signInWaiters.splice(0)) wake();
    }
    for (const listener of this.stderrListeners) listener(line);
  }

  private async applyCatalogUpdate(session: any): Promise<void> {
    const sessionId = session?.sessionId;
    if (typeof sessionId !== 'string') return;
    // Native notifications can arrive after the session/new response in a separate stdout chunk.
    if (!this.catalogUpdates.has(sessionId) && extractCatalog(session).length === 0) {
      await new Promise<void>(resolve => {
        const timer = this.later(CATALOG_UPDATE_WAIT_MS, resolve);
        this.notificationListeners.push(() => {
          if (!this.catalogUpdates.has(sessionId)) return;
          this.cancel(timer);
          resolve();
        });
      });
    }
    const update = this.catalogUpdates.get(sessionId);
    if (update) session.configOptions = update;
  }

  private later(ms: number, run: () => void): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      run();
    }, ms);
    this.timers.set(timer, run);
    return timer;
  }

  private cancel(timer: ReturnType<typeof setTimeout>): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  private rejectAll(error: Error): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
  }
}
