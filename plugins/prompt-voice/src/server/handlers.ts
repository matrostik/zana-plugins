import { decodeAudioRequest, type AudioInput } from './audio.ts';
import { describeUnexpectedFailure, PromptVoiceError } from './errors.ts';
import {
  LLM_PROVIDER_KEYS,
  normalizeSettings,
  STT_PROVIDER_KEYS,
  type ApiKeyName,
  type PromptVoiceSettings
} from './settings.ts';
import { runDictation, runRephrase, type PipelineDeps, type PipelineLogger } from './pipeline.ts';
import type {
  AvailableModelsResponse,
  DiscoveredModel,
  DiscoveredProvider,
  RephraseRequest,
  RephraseResponse,
  StatusResponse,
  TranscribeFailure,
  TranscribeRequest,
  TranscribeResponse
} from '../shared/protocol.ts';

export interface HandlerDeps extends PipelineDeps {
  readSettings: () => Promise<Record<string, unknown>>;
}

export interface AvailableModelsDeps {
  readSettings?: () => Promise<Record<string, unknown>>;
  providers?: {
    list(args?: unknown): Promise<Array<{ id: string; available?: boolean; displayName?: string }>>;
    models(args: { providerId: string }): Promise<unknown>;
  };
  log?: PipelineLogger;
  providerTimeoutMs?: number;
  onModelsUpdated?: (entries: AvailableModelsResponse) => void;
}

const DEFAULT_PROVIDER_MODELS_TIMEOUT_MS = 12_000;
const DEFAULT_SOFT_WAIT_MS = 1_500;
const DEFAULT_COMPLETE_CACHE_TTL_MS = 5 * 60_000;
const DEFAULT_INCOMPLETE_CACHE_TTL_MS = 5_000;
const DEFAULT_TIMEOUT_COOLDOWN_MS = 60_000;

const INTERNAL_ERROR_MESSAGE = 'Dictation failed unexpectedly. See the Zana log for details.';

function asRequest(value: unknown): Partial<TranscribeRequest> & { audio?: unknown; mimeType?: unknown } {
  return value && typeof value === 'object' ? (value as Partial<TranscribeRequest>) : {};
}

/** Maps a thrown error to the RPC failure envelope. Logs the detail; the UI gets only the user message. */
export function failureResponse(err: unknown, log: PipelineLogger): TranscribeFailure {
  if (err instanceof PromptVoiceError) {
    log.warn(`${err.code}: ${err.detail ?? err.message}`);
    return { ok: false, code: err.code, message: err.userMessage };
  }
  // Raw messages can quote provider bodies (transcript text, credentials), so log only the classification.
  log.error(`Unexpected dictation error: ${describeUnexpectedFailure(err, 'Prompt Voice')}`);
  return { ok: false, code: 'INTERNAL', message: INTERNAL_ERROR_MESSAGE };
}

/** Settings for one request. An explicit language in the request overrides the saved setting. */
function settingsForRequest(raw: Record<string, unknown>, request: { language?: unknown }): PromptVoiceSettings {
  const language = typeof request.language === 'string' ? request.language : raw.inputLanguage;
  return normalizeSettings({ ...raw, inputLanguage: language });
}

/** RPC `promptVoice.transcribe`. Validates audio, runs the pipeline, and maps every outcome to the envelope. */
export async function transcribeHandler(request: unknown, deps: HandlerDeps): Promise<TranscribeResponse> {
  const requestRecord = asRequest(request);
  let audio: AudioInput;
  try {
    audio = decodeAudioRequest(requestRecord);
  } catch (err) {
    return failureResponse(err, deps.log);
  }

  try {
    const settings = settingsForRequest(await deps.readSettings(), requestRecord);
    if (requestRecord.transcriptionOnly === true) settings.llmProvider = 'none';
    return await runDictation(audio, settings, {
      fetch: deps.fetch,
      log: deps.log,
      serverUrl: deps.serverUrl,
      assistant: deps.assistant,
      localWhisper: deps.localWhisper
    });
  } catch (err) {
    return failureResponse(err, deps.log);
  }
}

/** RPC `promptVoice.rephrase`. Directly rephrases or transforms text using LLMs. */
export async function rephraseHandler(request: unknown, deps: HandlerDeps): Promise<RephraseResponse> {
  const req = (request && typeof request === 'object' ? request : {}) as RephraseRequest;
  try {
    const settings = normalizeSettings(await deps.readSettings());
    return await runRephrase(req, settings, {
      fetch: deps.fetch,
      log: deps.log,
      serverUrl: deps.serverUrl,
      assistant: deps.assistant
    });
  } catch (err) {
    const failure = failureResponse(err, deps.log);
    return { ok: false, code: failure.code, message: failure.message };
  }
}

function hasRequiredKey(
  providerId: string,
  keyMap: Readonly<Record<string, ApiKeyName>>,
  keys: PromptVoiceSettings['keys']
): boolean {
  const keyName = keyMap[providerId];
  return keyName === undefined || keys[keyName].length > 0;
}

/** RPC `promptVoice.status`. Reports active providers and whether any key they need is configured. */
export function statusFromSettings(raw: Record<string, unknown>, availableProviders?: string[]): StatusResponse {
  const settings = normalizeSettings(raw);
  return {
    sttProvider: settings.sttProvider,
    sttKeyConfigured: hasRequiredKey(settings.sttProvider, STT_PROVIDER_KEYS, settings.keys),
    llmProvider: settings.llmProvider,
    llmKeyConfigured: hasRequiredKey(settings.llmProvider, LLM_PROVIDER_KEYS, settings.keys),
    audioFormat: settings.sttProvider === 'local-whisper' ? 'wav' : 'recorded',
    ...(availableProviders ? { availableProviders } : {})
  };
}

/** Union of catalog models and selected-only entries, keyed by model id and sorted alphabetically. */
export function mergeCatalogModels(catalog: unknown): DiscoveredModel[] {
  if (!catalog || typeof catalog !== 'object') return [];
  const rec = catalog as {
    models?: Array<{ id?: string; model?: string; label?: string; displayName?: string }>;
    selectedOnlyModels?: Array<{ id?: string; model?: string; label?: string; displayName?: string }>;
  };
  const seen = new Map<string, DiscoveredModel>();
  const add = (item?: { id?: string; model?: string; label?: string; displayName?: string }) => {
    if (!item || !item.id || typeof item.id !== 'string') return;
    const label = item.label || item.displayName || item.model || item.id;
    if (!seen.has(item.id)) {
      seen.set(item.id, { id: item.id, label });
    }
  };
  for (const m of rec.models ?? []) add(m);
  for (const m of rec.selectedOnlyModels ?? []) add(m);
  return Array.from(seen.values()).sort((a, b) =>
    (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: 'base', numeric: true })
  );
}

function createAssistantEntry(): DiscoveredProvider {
  return {
    providerId: 'assistant',
    displayName: 'Zana Assistant',
    models: [{ id: 'assistant', label: 'Default Assistant (Host Agent)' }]
  };
}

const DIRECT_MODELS: Array<{ key: ApiKeyName; entry: DiscoveredProvider }> = [
  { key: 'anthropic', entry: { providerId: 'anthropic', displayName: 'Anthropic', models: [
    { id: 'claude-haiku-4-5-20251001', label: 'Claude 4.5 Haiku' },
    { id: 'claude-sonnet-5-20260201', label: 'Claude 5 Sonnet' }
  ] } },
  { key: 'google', entry: { providerId: 'google', displayName: 'Google Gemini', models: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }
  ] } },
  { key: 'openai', entry: { providerId: 'openai', displayName: 'OpenAI', models: [
    { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano (Fast)' },
    { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (Smart)' }
  ] } }
];

function sortAvailableModelsResponse(entries: AvailableModelsResponse): AvailableModelsResponse {
  for (const prov of entries) {
    prov.models.sort((a, b) =>
      (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: 'base', numeric: true })
    );
  }
  entries.sort((a, b) =>
    (a.displayName || a.providerId).localeCompare(b.displayName || b.providerId, undefined, {
      sensitivity: 'base',
      numeric: true
    })
  );
  return entries;
}

async function listActiveHostProviders(
  deps: AvailableModelsDeps
): Promise<Array<{ id: string; displayName?: string }>> {
  if (!deps.providers) return [];
  try {
    const rawList = await deps.providers.list();
    const seenIds = new Set<string>(['assistant']);
    const uniqueProviders: Array<{ id: string; displayName?: string }> = [];
    if (!Array.isArray(rawList)) return uniqueProviders;
    for (const provider of rawList) {
      if (!provider || typeof provider.id !== 'string' || provider.available === false) continue;
      if (seenIds.has(provider.id)) continue;
      seenIds.add(provider.id);
      uniqueProviders.push(provider);
    }
    return uniqueProviders;
  } catch (err) {
    deps.log?.warn?.(`Provider list unavailable: ${describeUnexpectedFailure(err, 'Zana providers')}`);
    return [];
  }
}

async function fetchProviderCatalogEntry(
  provider: { id: string; displayName?: string },
  providersApi: NonNullable<AvailableModelsDeps['providers']>,
  timeoutMs: number
): Promise<{ entry: DiscoveredProvider; timedOut: boolean }> {
  const displayName = provider.displayName ?? provider.id;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      providersApi.models({ providerId: provider.id }).then(
        (catalog) => ({ kind: 'ok' as const, catalog }),
        (error: unknown) => ({ kind: 'error' as const, error })
      ),
      new Promise<{ kind: 'timeout' }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs);
      })
    ]);

    if (outcome.kind === 'timeout') {
      return {
        entry: {
          providerId: provider.id,
          displayName,
          models: [],
          error: `Timed out loading models for ${displayName}.`
        },
        timedOut: true
      };
    }

    if (outcome.kind === 'error') {
      return {
        entry: {
          providerId: provider.id,
          displayName,
          models: [],
          error: describeUnexpectedFailure(outcome.error, provider.id)
        },
        timedOut: false
      };
    }

    const catalog = outcome.catalog;
    const models = mergeCatalogModels(catalog);
    let errorDetail: string | null = null;
    if (catalog && typeof catalog === 'object' && 'modelLoadError' in catalog) {
      const err = (catalog as { modelLoadError?: { detail?: string; code?: string } | null }).modelLoadError;
      if (err) errorDetail = err.detail ?? err.code ?? null;
    }

    return {
      entry: {
        providerId: provider.id,
        displayName,
        models,
        error: errorDetail
      },
      timedOut: false
    };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** RPC `promptVoice.availableModels`. Discovers available Zana host/Composer providers and models, ordered alphabetically. */
export async function availableModelsHandler(deps: AvailableModelsDeps): Promise<AvailableModelsResponse> {
  const result: AvailableModelsResponse = [createAssistantEntry()];
  const timeoutMs = deps.providerTimeoutMs ?? DEFAULT_PROVIDER_MODELS_TIMEOUT_MS;
  const uniqueProviders = await listActiveHostProviders(deps);

  if (deps.providers && uniqueProviders.length > 0) {
    const fetched = await Promise.all(
      uniqueProviders.map((provider) => fetchProviderCatalogEntry(provider, deps.providers!, timeoutMs))
    );
    for (const { entry } of fetched) {
      result.push(entry);
    }
  }

  return sortAvailableModelsResponse(result);
}

export interface AvailableModelsLoaderOptions {
  ttlMs?: number;
  incompleteTtlMs?: number;
  timeoutCooldownMs?: number;
  softWaitMs?: number;
  now?: () => number;
}

interface CachedProviderState {
  entry: DiscoveredProvider;
  fetchedAt: number;
  timedOut: boolean;
}

async function waitWithSoftDeadline(promises: Promise<void>[], softWaitMs: number): Promise<boolean> {
  if (promises.length === 0) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.all(promises).then(() => false),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(true), softWaitMs);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Caches discovered Composer providers/models per provider, avoids stalling on a single
 * hung provider bridge past `softWaitMs`, and publishes late arrivals via `onModelsUpdated`.
 */
export function createAvailableModelsLoader(
  deps: AvailableModelsDeps,
  options: AvailableModelsLoaderOptions = {}
) {
  const ttlMs = options.ttlMs ?? DEFAULT_COMPLETE_CACHE_TTL_MS;
  const incompleteTtlMs = options.incompleteTtlMs ?? DEFAULT_INCOMPLETE_CACHE_TTL_MS;
  const timeoutCooldownMs = options.timeoutCooldownMs ?? DEFAULT_TIMEOUT_COOLDOWN_MS;
  const timeoutMs = deps.providerTimeoutMs ?? DEFAULT_PROVIDER_MODELS_TIMEOUT_MS;
  const softWaitMs = Math.min(options.softWaitMs ?? DEFAULT_SOFT_WAIT_MS, timeoutMs);
  const now = options.now ?? Date.now;

  const providerStates = new Map<string, CachedProviderState>();
  const pendingFetches = new Map<string, { generation: number; promise: Promise<void> }>();
  let activeProviderIds = new Set<string>();
  let directEntries: DiscoveredProvider[] = [];
  let cacheSummary: { at: number; complete: boolean; hasHostProviders: boolean } | null = null;
  let inFlightLoad: Promise<AvailableModelsResponse> | null = null;
  let generation = 0;

  function buildVisibleEntries(): AvailableModelsResponse {
    const visible: AvailableModelsResponse = [createAssistantEntry()];
    for (const id of activeProviderIds) {
      const state = providerStates.get(id);
      if (state && state.entry.models.length > 0) {
        visible.push(state.entry);
      }
    }
    for (const entry of directEntries) {
      if (!visible.some((item) => item.providerId === entry.providerId)) visible.push(entry);
    }
    return sortAvailableModelsResponse(visible);
  }

  function updateCacheSummary(at: number): void {
    let hasHostProviders = false;
    let allClean = activeProviderIds.size > 0;
    for (const id of activeProviderIds) {
      const state = providerStates.get(id);
      if (!state) {
        allClean = false;
        continue;
      }
      if (state.entry.models.length > 0) hasHostProviders = true;
      if (state.entry.error || state.entry.models.length === 0) allClean = false;
    }
    cacheSummary = hasHostProviders ? { at, complete: allClean, hasHostProviders: true } : null;
  }

  function launchProviderFetch(
    provider: { id: string; displayName?: string },
    fetchGeneration: number,
    isEarlyReturnRef: { current: boolean }
  ): Promise<void> {
    const existing = pendingFetches.get(provider.id);
    if (existing && existing.generation === fetchGeneration) {
      return existing.promise;
    }

    const promise = fetchProviderCatalogEntry(provider, deps.providers!, timeoutMs)
      .then(({ entry, timedOut }) => {
        if (fetchGeneration !== generation) return;
        const settledAt = now();
        providerStates.set(provider.id, { entry, fetchedAt: settledAt, timedOut });
        if (entry.models.length === 0 && entry.error) {
          deps.log?.warn?.(`Excluding provider ${entry.providerId} (no models): ${entry.error}`);
        }
        updateCacheSummary(settledAt);
        if (isEarlyReturnRef.current && entry.models.length > 0 && activeProviderIds.has(provider.id)) {
          deps.onModelsUpdated?.(buildVisibleEntries());
        }
      })
      .finally(() => {
        const current = pendingFetches.get(provider.id);
        if (current && current.promise === promise) {
          pendingFetches.delete(provider.id);
        }
      });

    pendingFetches.set(provider.id, { generation: fetchGeneration, promise });
    return promise;
  }

  async function fetchCatalog(fetchGeneration: number, refresh: boolean): Promise<AvailableModelsResponse> {
    const uniqueProviders = await listActiveHostProviders(deps);
    let direct: DiscoveredProvider[] = [];
    try {
      const settings = normalizeSettings(await deps.readSettings?.() ?? {});
      direct = DIRECT_MODELS.filter(({ key }) => Boolean(settings.keys[key])).map(({ entry }) => entry);
    } catch (error) {
      deps.log?.warn?.(`Could not load direct provider settings: ${describeUnexpectedFailure(error, 'settings')}`);
    }
    if (fetchGeneration !== generation) {
      return buildVisibleEntries();
    }

    directEntries = direct;

    activeProviderIds = new Set(uniqueProviders.map((p) => p.id));
    for (const id of providerStates.keys()) {
      if (!activeProviderIds.has(id)) {
        providerStates.delete(id);
      }
    }

    const currentTime = now();
    const waitPromises: Promise<void>[] = [];
    const earlyReturnRef = { current: false };
    const hadHostProviders = cacheSummary?.hasHostProviders === true;

    if (deps.providers) {
      for (const provider of uniqueProviders) {
        const state = providerStates.get(provider.id);
        if (!refresh && state) {
          const age = currentTime - state.fetchedAt;
          const isHealthy = state.entry.models.length > 0 && !state.entry.error;
          if (isHealthy && age < ttlMs) continue;
          if (state.timedOut && age < timeoutCooldownMs) continue;
        }

        // Once healthy providers are cached, re-probe previously timed-out providers in background only.
        const isBackgroundReprobe = !refresh && hadHostProviders && state?.timedOut === true;
        const publicationRef = isBackgroundReprobe ? { current: true } : earlyReturnRef;
        const promise = launchProviderFetch(provider, fetchGeneration, publicationRef);
        if (!isBackgroundReprobe) {
          waitPromises.push(promise);
        }
      }
    }

    const timedOutWaiting = await waitWithSoftDeadline(waitPromises, softWaitMs);
    if (timedOutWaiting) {
      earlyReturnRef.current = true;
    }

    if (fetchGeneration === generation) {
      updateCacheSummary(now());
    }
    return buildVisibleEntries();
  }

  function hasFreshSnapshot(): boolean {
    if (!cacheSummary) return false;
    const currentTime = now();
    const age = currentTime - cacheSummary.at;
    const maxAge = cacheSummary.complete ? ttlMs : incompleteTtlMs;
    if (age < maxAge) return true;

    // Even after incompleteTtlMs, keep serving cached providers immediately if incomplete ones are in timeout cooldown.
    if (cacheSummary.hasHostProviders && activeProviderIds.size > 0) {
      for (const id of activeProviderIds) {
        const state = providerStates.get(id);
        if (!state) return false;
        const itemAge = currentTime - state.fetchedAt;
        const isHealthy = state.entry.models.length > 0 && !state.entry.error;
        const inHealthyWindow = isHealthy && itemAge < ttlMs;
        const inTimeoutCooldown = state.timedOut && itemAge < timeoutCooldownMs;
        if (!inHealthyWindow && !inTimeoutCooldown) return false;
      }
      return true;
    }
    return false;
  }

  return {
    async load(opts: { refresh?: boolean } = {}): Promise<AvailableModelsResponse> {
      const refresh = opts.refresh === true;
      if (!refresh && hasFreshSnapshot()) {
        return buildVisibleEntries();
      }
      if (!refresh && inFlightLoad) {
        return inFlightLoad;
      }
      const fetchGeneration = refresh ? ++generation : generation;
      const promise = fetchCatalog(fetchGeneration, refresh).finally(() => {
        if (inFlightLoad === promise) inFlightLoad = null;
      });
      inFlightLoad = promise;
      return promise;
    },
    invalidate() {
      generation++;
      providerStates.clear();
      pendingFetches.clear();
      activeProviderIds.clear();
      directEntries = [];
      cacheSummary = null;
      inFlightLoad = null;
    }
  };
}
