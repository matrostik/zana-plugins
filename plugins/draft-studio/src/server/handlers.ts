import { decodeAudioRequest, type AudioInput } from './audio.ts';
import { describeUnexpectedFailure, DraftStudioError } from './errors.ts';
import {
  recordDictationHistory,
  recordRefinementHistory,
  type HistoryChangeEvent
} from './historyHandlers.ts';
import type { HistoryStore } from './historyStore.ts';
import {
  LLM_PROVIDER_KEYS,
  normalizeSettings,
  STT_PROVIDER_KEYS,
  type ApiKeyName,
  type DraftStudioSettings
} from './settings.ts';
import { runDictation, runRephrase, type PipelineDeps, type PipelineLogger } from './pipeline.ts';
import { parseHistoryPreferences } from '../shared/historyPreferences.ts';
import { compareModelsCheapestFirst, sortModelsCheapestFirst } from '../shared/modelSorting.ts';
import type {
  AvailableModelsResponse,
  DiscoveredModel,
  DiscoveredProvider,
  RephraseRequest,
  RephraseResponse,
  StatusResponse,
  SttProviderId,
  TranscribeFailure,
  TranscribeRequest,
  TranscribeResponse
} from '../shared/protocol.ts';

export interface HandlerDeps extends PipelineDeps {
  readSettings: () => Promise<Record<string, unknown>>;
  historyStore?: HistoryStore | null;
  onHistoryChanged?: (event: HistoryChangeEvent) => void;
}

export interface HostProviderInfo {
  id: string;
  available?: boolean;
  displayName?: string;
}

export interface AvailableModelsDeps {
  readSettings?: () => Promise<Record<string, unknown>>;
  providers?: {
    list(args?: unknown): Promise<HostProviderInfo[]>;
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
  if (err instanceof DraftStudioError) {
    log.warn(`${err.code}: ${err.detail ?? err.message}`);
    return { ok: false, code: err.code, message: err.userMessage };
  }
  // Raw messages can quote provider bodies (transcript text, credentials), so log only the classification.
  log.error(`Unexpected dictation error: ${describeUnexpectedFailure(err, 'Draft Studio')}`);
  return { ok: false, code: 'INTERNAL', message: INTERNAL_ERROR_MESSAGE };
}

/** Settings for one request. An explicit language in the request overrides the saved setting. */
function settingsForRequest(raw: Record<string, unknown>, request: { language?: unknown }): DraftStudioSettings {
  const language = typeof request.language === 'string' ? request.language : raw.inputLanguage;
  return normalizeSettings({ ...raw, inputLanguage: language });
}

/** Re-reads history privacy/retention settings right before persisting so mid-flight toggles are respected. */
async function resolveLatestHistorySettings(
  executionSettings: DraftStudioSettings,
  deps: HandlerDeps
): Promise<DraftStudioSettings | null> {
  if (!deps.historyStore) return null;
  try {
    const latestHistory = parseHistoryPreferences(await deps.readSettings());
    return { ...executionSettings, ...latestHistory };
  } catch (err) {
    deps.log.warn(
      `Skipping history save because current settings could not be verified: ${describeUnexpectedFailure(err, 'Draft Studio settings')}`
    );
    return null;
  }
}

/** RPC `draftStudio.transcribe`. Validates audio, runs the pipeline, and maps every outcome to the envelope. */
export async function transcribeHandler(request: unknown, deps: HandlerDeps): Promise<TranscribeResponse> {
  const requestRecord = asRequest(request);
  let audio: AudioInput;
  try {
    audio = decodeAudioRequest(requestRecord);
  } catch (err) {
    return failureResponse(err, deps.log);
  }

  try {
    const startedAt = Date.now();
    const settings = settingsForRequest(await deps.readSettings(), requestRecord);
    if (requestRecord.transcriptionOnly === true) settings.llmProvider = 'none';
    const response = await runDictation(audio, settings, {
      fetch: deps.fetch,
      log: deps.log,
      serverUrl: deps.serverUrl,
      assistant: deps.assistant,
      localWhisper: deps.localWhisper
    });
    if (response.ok && response.status === 'ok') {
      const historySettings = await resolveLatestHistorySettings(settings, deps);
      const historyEntryId = historySettings
        ? recordDictationHistory(requestRecord, response, historySettings, Date.now() - startedAt, deps)
        : null;
      if (historyEntryId) {
        return { ...response, historyEntryId };
      }
    }
    return response;
  } catch (err) {
    return failureResponse(err, deps.log);
  }
}

/** RPC `draftStudio.rephrase`. Directly rephrases or transforms text using LLMs. */
export async function rephraseHandler(request: unknown, deps: HandlerDeps): Promise<RephraseResponse> {
  const req = (request && typeof request === 'object' ? request : {}) as RephraseRequest;
  try {
    const settings = normalizeSettings(await deps.readSettings());
    const response = await runRephrase(req, settings, {
      fetch: deps.fetch,
      log: deps.log,
      serverUrl: deps.serverUrl,
      assistant: deps.assistant
    });
    if (response.ok) {
      const historySettings = await resolveLatestHistorySettings(settings, deps);
      const historyEntryId = historySettings
        ? recordRefinementHistory(req, response, historySettings, deps)
        : null;
      if (historyEntryId) {
        return { ...response, historyEntryId };
      }
    }
    return response;
  } catch (err) {
    const failure = failureResponse(err, deps.log);
    return { ok: false, code: failure.code, message: failure.message };
  }
}

function hasRequiredKey(
  providerId: string,
  keyMap: Readonly<Record<string, ApiKeyName>>,
  keys: DraftStudioSettings['keys']
): boolean {
  const keyName = keyMap[providerId];
  return keyName === undefined || keys[keyName].length > 0;
}

export interface StatusOptions {
  /** Whether Local Whisper has an installed runtime and an active model on this device. */
  localWhisperReady?: boolean;
}

/** Returns only speech-to-text providers that are configured and able to run. */
export function configuredSttProviders(
  settings: DraftStudioSettings,
  options: StatusOptions = {}
): SttProviderId[] {
  const providers: SttProviderId[] = ['system'];
  if (settings.keys.google.length > 0) providers.push('google-gemini');
  if (settings.keys.openai.length > 0) providers.push('openai');
  if (options.localWhisperReady === true) providers.push('local-whisper');
  return providers;
}

/** RPC `draftStudio.status`. Reports active providers and whether any key they need is configured. */
export function statusFromSettings(
  raw: Record<string, unknown>,
  availableProviders?: string[],
  options: StatusOptions = {}
): StatusResponse {
  const settings = normalizeSettings(raw);
  return {
    sttProvider: settings.sttProvider,
    sttKeyConfigured: hasRequiredKey(settings.sttProvider, STT_PROVIDER_KEYS, settings.keys),
    llmProvider: settings.llmProvider,
    llmKeyConfigured: hasRequiredKey(settings.llmProvider, LLM_PROVIDER_KEYS, settings.keys),
    audioFormat: settings.sttProvider === 'local-whisper' ? 'wav' : 'recorded',
    ...(availableProviders ? { availableProviders } : {}),
    availableSttProviders: configuredSttProviders(settings, options)
  };
}

/** Union of catalog models and selected-only entries, keyed by model id and sorted cheapest-first. */
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
  return sortModelsCheapestFirst(Array.from(seen.values()));
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
    prov.models.sort(compareModelsCheapestFirst);
  }
  entries.sort((a, b) =>
    (a.displayName || a.providerId).localeCompare(b.displayName || b.providerId, undefined, {
      sensitivity: 'base',
      numeric: true
    })
  );
  return entries;
}

type RaceOutcome<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'error'; error: unknown }
  | { kind: 'timeout' };

async function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<RaceOutcome<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then(
        (value): RaceOutcome<T> => ({ kind: 'ok', value }),
        (error: unknown): RaceOutcome<T> => ({ kind: 'error', error })
      ),
      new Promise<RaceOutcome<T>>((resolve) => {
        timer = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function listActiveHostProviders(
  deps: AvailableModelsDeps,
  timeoutMs: number
): Promise<HostProviderInfo[] | null> {
  if (!deps.providers) return [];
  const outcome = await raceWithTimeout(deps.providers.list(), timeoutMs);
  if (outcome.kind === 'timeout') {
    deps.log?.warn?.(`Provider list timed out after ${timeoutMs}ms.`);
    return null;
  }
  if (outcome.kind === 'error') {
    deps.log?.warn?.(`Provider list unavailable: ${describeUnexpectedFailure(outcome.error, 'Zana providers')}`);
    return null;
  }
  if (!Array.isArray(outcome.value)) return [];
  const seenIds = new Set<string>(['assistant']);
  const uniqueProviders: HostProviderInfo[] = [];
  for (const provider of outcome.value) {
    if (!provider || typeof provider.id !== 'string' || provider.available === false) continue;
    if (seenIds.has(provider.id)) continue;
    seenIds.add(provider.id);
    uniqueProviders.push(provider);
  }
  return uniqueProviders;
}

async function fetchProviderCatalogEntry(
  provider: HostProviderInfo,
  providersApi: NonNullable<AvailableModelsDeps['providers']>,
  timeoutMs: number
): Promise<{ entry: DiscoveredProvider; timedOut: boolean }> {
  const displayName = provider.displayName ?? provider.id;
  const outcome = await raceWithTimeout(providersApi.models({ providerId: provider.id }), timeoutMs);
  if (outcome.kind === 'timeout') {
    return {
      entry: { providerId: provider.id, displayName, models: [], error: `Timed out loading models for ${displayName}.` },
      timedOut: true
    };
  }
  if (outcome.kind === 'error') {
    return {
      entry: { providerId: provider.id, displayName, models: [], error: describeUnexpectedFailure(outcome.error, provider.id) },
      timedOut: false
    };
  }
  const catalog = outcome.value;
  let errorDetail: string | null = null;
  if (catalog && typeof catalog === 'object' && 'modelLoadError' in catalog) {
    const err = (catalog as { modelLoadError?: { detail?: string; code?: string } | null }).modelLoadError;
    if (err) errorDetail = err.detail ?? err.code ?? null;
  }
  return {
    entry: { providerId: provider.id, displayName, models: mergeCatalogModels(catalog), error: errorDetail },
    timedOut: false
  };
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

interface CatalogCacheSummary {
  at: number;
  complete: boolean;
  hasHostProviders: boolean;
}

interface CatalogLoaderState {
  deps: AvailableModelsDeps;
  ttlMs: number;
  incompleteTtlMs: number;
  timeoutCooldownMs: number;
  timeoutMs: number;
  softWaitMs: number;
  now: () => number;
  providerStates: Map<string, CachedProviderState>;
  pendingFetches: Map<string, { generation: number; promise: Promise<void> }>;
  pendingListFetch: { generation: number; promise: Promise<HostProviderInfo[] | null> } | null;
  activeProviderIds: Set<string>;
  directEntries: DiscoveredProvider[];
  cacheSummary: CatalogCacheSummary | null;
  inFlightLoad: Promise<AvailableModelsResponse> | null;
  generation: number;
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

async function readDirectProviderEntries(deps: AvailableModelsDeps): Promise<DiscoveredProvider[]> {
  try {
    const settings = normalizeSettings((await deps.readSettings?.()) ?? {});
    return DIRECT_MODELS.filter(({ key }) => Boolean(settings.keys[key])).map(({ entry }) => entry);
  } catch (error) {
    deps.log?.warn?.(`Could not load direct provider settings: ${describeUnexpectedFailure(error, 'settings')}`);
    return [];
  }
}

function buildVisibleCatalogEntries(state: CatalogLoaderState): AvailableModelsResponse {
  const visible: AvailableModelsResponse = [createAssistantEntry()];
  for (const id of state.activeProviderIds) {
    const cached = state.providerStates.get(id);
    if (cached && cached.entry.models.length > 0) visible.push(cached.entry);
  }
  for (const entry of state.directEntries) {
    if (!visible.some((item) => item.providerId === entry.providerId)) visible.push(entry);
  }
  return sortAvailableModelsResponse(visible);
}

function updateCatalogCacheSummary(state: CatalogLoaderState, at: number): void {
  let hasHostProviders = false;
  let allClean = state.activeProviderIds.size > 0;
  for (const id of state.activeProviderIds) {
    const cached = state.providerStates.get(id);
    if (!cached) {
      allClean = false;
      continue;
    }
    if (cached.entry.models.length > 0) hasHostProviders = true;
    if (cached.entry.error || cached.entry.models.length === 0) allClean = false;
  }
  state.cacheSummary = hasHostProviders ? { at, complete: allClean, hasHostProviders: true } : null;
}

function hasFreshCatalogSnapshot(state: CatalogLoaderState): boolean {
  const summary = state.cacheSummary;
  if (!summary) return false;
  const currentTime = state.now();
  const maxAge = summary.complete ? state.ttlMs : state.incompleteTtlMs;
  if (currentTime - summary.at < maxAge) return true;
  if (!summary.hasHostProviders || state.activeProviderIds.size === 0) return false;

  for (const id of state.activeProviderIds) {
    const cached = state.providerStates.get(id);
    if (!cached) return false;
    const itemAge = currentTime - cached.fetchedAt;
    const inHealthyWindow = cached.entry.models.length > 0 && !cached.entry.error && itemAge < state.ttlMs;
    const inTimeoutCooldown = cached.timedOut && itemAge < state.timeoutCooldownMs;
    if (!inHealthyWindow && !inTimeoutCooldown) return false;
  }
  return true;
}

function getOrLaunchHostProviderList(
  state: CatalogLoaderState,
  fetchGeneration: number
): Promise<HostProviderInfo[] | null> {
  if (state.pendingListFetch && state.pendingListFetch.generation === fetchGeneration) {
    return state.pendingListFetch.promise;
  }
  const promise = listActiveHostProviders(state.deps, state.timeoutMs).finally(() => {
    if (state.pendingListFetch?.promise === promise) state.pendingListFetch = null;
  });
  state.pendingListFetch = { generation: fetchGeneration, promise };
  return promise;
}

function applyActiveHostProviders(state: CatalogLoaderState, uniqueProviders: HostProviderInfo[]): void {
  state.activeProviderIds = new Set(uniqueProviders.map((p) => p.id));
  for (const id of state.providerStates.keys()) {
    if (!state.activeProviderIds.has(id)) state.providerStates.delete(id);
  }
}

function launchProviderFetch(
  state: CatalogLoaderState,
  provider: HostProviderInfo,
  fetchGeneration: number,
  isEarlyReturnRef: { current: boolean }
): Promise<void> {
  const existing = state.pendingFetches.get(provider.id);
  if (existing && existing.generation === fetchGeneration) return existing.promise;

  const promise = fetchProviderCatalogEntry(provider, state.deps.providers!, state.timeoutMs)
    .then(({ entry, timedOut }) => {
      if (fetchGeneration !== state.generation) return;
      const settledAt = state.now();
      state.providerStates.set(provider.id, { entry, fetchedAt: settledAt, timedOut });
      if (entry.models.length === 0 && entry.error) {
        state.deps.log?.warn?.(`Excluding provider ${entry.providerId} (no models): ${entry.error}`);
      }
      updateCatalogCacheSummary(state, settledAt);
      if (isEarlyReturnRef.current && entry.models.length > 0 && state.activeProviderIds.has(provider.id)) {
        state.deps.onModelsUpdated?.(buildVisibleCatalogEntries(state));
      }
    })
    .finally(() => {
      if (state.pendingFetches.get(provider.id)?.promise === promise) state.pendingFetches.delete(provider.id);
    });

  state.pendingFetches.set(provider.id, { generation: fetchGeneration, promise });
  return promise;
}

function scheduleHostProviderFetches(
  state: CatalogLoaderState,
  uniqueProviders: HostProviderInfo[],
  fetchGeneration: number,
  refresh: boolean,
  earlyReturnRef: { current: boolean }
): Promise<void>[] {
  if (!state.deps.providers) return [];
  const currentTime = state.now();
  const hadHostProviders = state.cacheSummary?.hasHostProviders === true;
  const waitPromises: Promise<void>[] = [];

  for (const provider of uniqueProviders) {
    const cached = state.providerStates.get(provider.id);
    if (!refresh && cached) {
      const age = currentTime - cached.fetchedAt;
      if (cached.entry.models.length > 0 && !cached.entry.error && age < state.ttlMs) continue;
      if (cached.timedOut && age < state.timeoutCooldownMs) continue;
    }
    // Once healthy providers are cached, re-probe previously timed-out providers in background only.
    const isBackgroundReprobe = !refresh && hadHostProviders && cached?.timedOut === true;
    const publicationRef = isBackgroundReprobe ? { current: true } : earlyReturnRef;
    const promise = launchProviderFetch(state, provider, fetchGeneration, publicationRef);
    if (!isBackgroundReprobe) waitPromises.push(promise);
  }
  return waitPromises;
}

async function discoverHostCatalog(
  state: CatalogLoaderState,
  fetchGeneration: number,
  refresh: boolean,
  earlyReturnRef: { current: boolean }
): Promise<void> {
  const uniqueProviders = await getOrLaunchHostProviderList(state, fetchGeneration);
  if (fetchGeneration !== state.generation || uniqueProviders === null) return;
  applyActiveHostProviders(state, uniqueProviders);
  const waitPromises = scheduleHostProviderFetches(state, uniqueProviders, fetchGeneration, refresh, earlyReturnRef);
  await Promise.all(waitPromises);
}

async function executeCatalogLoad(
  state: CatalogLoaderState,
  fetchGeneration: number,
  refresh: boolean
): Promise<AvailableModelsResponse> {
  const earlyReturnRef = { current: false };
  const directPromise = readDirectProviderEntries(state.deps).then((direct) => {
    if (fetchGeneration === state.generation) state.directEntries = direct;
  });
  const hostPromise = discoverHostCatalog(state, fetchGeneration, refresh, earlyReturnRef);

  const timedOutWaiting = await waitWithSoftDeadline([directPromise, hostPromise], state.softWaitMs);
  if (timedOutWaiting) earlyReturnRef.current = true;
  if (fetchGeneration === state.generation) updateCatalogCacheSummary(state, state.now());
  return buildVisibleCatalogEntries(state);
}

/**
 * Caches discovered Composer providers/models per provider, avoids stalling on hung
 * provider list/model calls past `softWaitMs`, and publishes late arrivals via `onModelsUpdated`.
 */
export function createAvailableModelsLoader(
  deps: AvailableModelsDeps,
  options: AvailableModelsLoaderOptions = {}
) {
  const timeoutMs = deps.providerTimeoutMs ?? DEFAULT_PROVIDER_MODELS_TIMEOUT_MS;
  const state: CatalogLoaderState = {
    deps,
    ttlMs: options.ttlMs ?? DEFAULT_COMPLETE_CACHE_TTL_MS,
    incompleteTtlMs: options.incompleteTtlMs ?? DEFAULT_INCOMPLETE_CACHE_TTL_MS,
    timeoutCooldownMs: options.timeoutCooldownMs ?? DEFAULT_TIMEOUT_COOLDOWN_MS,
    timeoutMs,
    softWaitMs: Math.min(options.softWaitMs ?? DEFAULT_SOFT_WAIT_MS, timeoutMs),
    now: options.now ?? Date.now,
    providerStates: new Map(),
    pendingFetches: new Map(),
    pendingListFetch: null,
    activeProviderIds: new Set(),
    directEntries: [],
    cacheSummary: null,
    inFlightLoad: null,
    generation: 0
  };

  return {
    async load(opts: { refresh?: boolean } = {}): Promise<AvailableModelsResponse> {
      const refresh = opts.refresh === true;
      if (!refresh && hasFreshCatalogSnapshot(state)) return buildVisibleCatalogEntries(state);
      if (!refresh && state.inFlightLoad) return state.inFlightLoad;

      const fetchGeneration = refresh ? ++state.generation : state.generation;
      const promise = executeCatalogLoad(state, fetchGeneration, refresh).finally(() => {
        if (state.inFlightLoad === promise) state.inFlightLoad = null;
      });
      state.inFlightLoad = promise;
      return promise;
    },
    async refreshDirectEntries(): Promise<void> {
      const fetchGeneration = state.generation;
      const direct = await readDirectProviderEntries(state.deps);
      if (fetchGeneration !== state.generation) return;
      const prevIds = state.directEntries.map((e) => e.providerId).join(',');
      const nextIds = direct.map((e) => e.providerId).join(',');
      state.directEntries = direct;
      if (prevIds !== nextIds) {
        state.deps.onModelsUpdated?.(buildVisibleCatalogEntries(state));
      }
    },
    invalidate() {
      state.generation++;
      state.providerStates.clear();
      state.pendingFetches.clear();
      state.pendingListFetch = null;
      state.activeProviderIds.clear();
      state.directEntries = [];
      state.cacheSummary = null;
      state.inFlightLoad = null;
    }
  };
}
