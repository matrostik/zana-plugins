import { describeUnexpectedFailure } from './errors.ts';
import type { HistoryStore, RecordHistoryInput } from './historyStore.ts';
import type { PipelineLogger } from './pipeline.ts';
import { normalizeSettings, type PromptVoiceSettings } from './settings.ts';
import {
  ACTIVITY_SOURCES,
  type ActivitySource,
  type HistoryClearRequest,
  type HistoryClearResponse,
  type HistoryDeleteRequest,
  type HistoryDeleteResponse,
  type HistoryListRequest,
  type HistoryListResponse,
  type HistoryProjectOption,
  type HistoryProjectsResponse,
  type HistoryStarRequest,
  type HistoryStarResponse,
  type RephraseRequest,
  type RephraseSuccess,
  type TranscribeRequest,
  type TranscribeSuccess
} from '../shared/protocol.ts';

export interface HistoryChangeEvent {
  action: 'recorded' | 'starred' | 'deleted' | 'cleared' | 'pruned' | 'settingsChanged';
  id?: string;
  starred?: boolean;
}

export interface HistoryRpcDeps {
  historyStore: HistoryStore | null;
  readSettings: () => Promise<Record<string, unknown>>;
  listProjects?: () => Promise<Array<{ id: string; name: string }>>;
  onHistoryChanged?: (event: HistoryChangeEvent) => void;
  log: PipelineLogger;
}

function resolveActivitySource(value: unknown, fallback: ActivitySource): ActivitySource {
  return typeof value === 'string' && (ACTIVITY_SOURCES as readonly string[]).includes(value)
    ? (value as ActivitySource)
    : fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableDuration(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

/** Persists a successful dictation into history without ever failing the caller's dictation. */
export function recordDictationHistory(
  request: Partial<TranscribeRequest>,
  result: TranscribeSuccess,
  settings: PromptVoiceSettings,
  processingDurationMs: number,
  deps: { historyStore?: HistoryStore | null; onHistoryChanged?: (event: HistoryChangeEvent) => void; log: PipelineLogger }
): string | null {
  if (!settings.historyEnabled || !deps.historyStore) return null;
  try {
    const isRawOnly = request.transcriptionOnly === true || result.llmProvider === 'none';
    const cleanupApplied = !isRawOnly && !result.refineNotice;
    const fallbackSource: ActivitySource = request.transcriptionOnly === true ? 'studio' : 'composer';
    const input: RecordHistoryInput = {
      kind: cleanupApplied ? 'dictation_cleanup' : 'dictation',
      source: resolveActivitySource(request.source, fallbackSource),
      projectId: nullableString(request.projectId),
      threadId: nullableString(request.threadId),
      rawText: result.rawText,
      outputText: result.text,
      sttProvider: result.sttProvider,
      sttModel: settings.sttModel || null,
      llmProvider: result.llmProvider === 'none' ? null : result.llmProvider,
      llmModel: result.llmModel,
      tone: isRawOnly ? null : settings.tone,
      customPrompt: !isRawOnly && settings.tone === 'custom' ? settings.customPrompt || null : null,
      audioDurationMs: nullableDuration(request.audioDurationMs),
      processingDurationMs,
      refineNotice: result.refineNotice ?? null
    };
    const retention = { maxEntries: settings.historyMaxEntries, maxDays: settings.historyMaxDays };
    const coalesceId = nullableString(request.historyEntryId);
    const saved = coalesceId
      ? deps.historyStore.coalesceDictation(coalesceId, input, retention)
      : deps.historyStore.record(input, retention);

    deps.onHistoryChanged?.({ action: 'recorded', id: saved.id });
    return saved.id;
  } catch (err) {
    deps.log.warn(`Could not save dictation history: ${describeUnexpectedFailure(err, 'Prompt Voice history')}`);
    return null;
  }
}

/** Persists a successful refinement into history without ever failing the caller's refinement. */
export function recordRefinementHistory(
  request: RephraseRequest,
  result: RephraseSuccess,
  settings: PromptVoiceSettings,
  deps: { historyStore?: HistoryStore | null; onHistoryChanged?: (event: HistoryChangeEvent) => void; log: PipelineLogger }
): string | null {
  if (!settings.historyEnabled || !deps.historyStore) return null;
  try {
    const targetLanguage = nullableString(request.targetLanguage);
    const customPrompt = nullableString(request.customPrompt);
    const tone = nullableString(request.tone) ?? settings.tone;
    const presetId =
      nullableString(request.presetId) ??
      (targetLanguage ? 'translate' : tone === 'custom' ? 'custom' : null);

    const input: RecordHistoryInput = {
      kind: 'refinement',
      source: resolveActivitySource(request.source, 'studio'),
      projectId: nullableString(request.projectId),
      threadId: nullableString(request.threadId),
      rawText: result.rawText,
      outputText: result.text,
      llmProvider: result.llmProvider === 'none' ? null : result.llmProvider,
      llmModel: result.llmModel,
      presetId,
      tone,
      targetLanguage,
      customPrompt,
      processingDurationMs: nullableDuration(result.durationMs)
    };
    const retention = { maxEntries: settings.historyMaxEntries, maxDays: settings.historyMaxDays };
    const coalesceId = nullableString(request.historyEntryId);
    const saved = coalesceId
      ? deps.historyStore.coalesceRefinement(coalesceId, input, retention)
      : deps.historyStore.record(input, retention);

    deps.onHistoryChanged?.({ action: 'recorded', id: saved.id });
    return saved.id;
  } catch (err) {
    deps.log.warn(`Could not save refinement history: ${describeUnexpectedFailure(err, 'Prompt Voice history')}`);
    return null;
  }
}

/** Handles `promptVoice.history.list`. */
export async function listHistoryHandler(args: unknown, deps: HistoryRpcDeps): Promise<HistoryListResponse> {
  const rawSettings = await deps.readSettings().catch((err: unknown) => {
    deps.log.warn(`Could not read settings for activity history: ${describeUnexpectedFailure(err, 'Prompt Voice settings')}`);
    return {};
  });
  const settings = normalizeSettings(rawSettings);
  if (!deps.historyStore) {
    return {
      entries: [],
      total: 0,
      hasMore: false,
      historyEnabled: settings.historyEnabled,
      storageAvailable: false
    };
  }
  try {
    const removed = deps.historyStore.prune({ maxEntries: settings.historyMaxEntries, maxDays: settings.historyMaxDays });
    if (removed > 0) deps.onHistoryChanged?.({ action: 'pruned' });
    const req = asObject(args) as HistoryListRequest;
    const page = deps.historyStore.list(req);
    return {
      ...page,
      historyEnabled: settings.historyEnabled,
      storageAvailable: true
    };
  } catch (err) {
    deps.log.warn(`Could not list activity history: ${describeUnexpectedFailure(err, 'Prompt Voice history')}`);
    return {
      entries: [],
      total: 0,
      hasMore: false,
      historyEnabled: settings.historyEnabled,
      storageAvailable: false
    };
  }
}

/** Handles `promptVoice.history.star`. */
export function starHistoryHandler(args: unknown, deps: HistoryRpcDeps): HistoryStarResponse {
  if (!deps.historyStore) return { ok: false };
  const req = asObject(args) as Partial<HistoryStarRequest>;
  const id = nullableString(req.id);
  if (!id || typeof req.starred !== 'boolean') return { ok: false };
  try {
    const entry = deps.historyStore.setStarred(id, req.starred);
    if (!entry) return { ok: false };
    deps.onHistoryChanged?.({ action: 'starred', id: entry.id, starred: entry.starred });
    return { ok: true, entry };
  } catch (err) {
    deps.log.warn(`Could not update starred state in activity history: ${describeUnexpectedFailure(err, 'Prompt Voice history')}`);
    return { ok: false };
  }
}

/** Handles `promptVoice.history.delete`. */
export function deleteHistoryHandler(args: unknown, deps: HistoryRpcDeps): HistoryDeleteResponse {
  if (!deps.historyStore) return { ok: false, deleted: false };
  const req = asObject(args) as Partial<HistoryDeleteRequest>;
  const id = nullableString(req.id);
  if (!id) return { ok: false, deleted: false };
  try {
    const deleted = deps.historyStore.delete(id);
    if (deleted) deps.onHistoryChanged?.({ action: 'deleted', id });
    return { ok: true, deleted };
  } catch (err) {
    deps.log.warn(`Could not delete activity history entry: ${describeUnexpectedFailure(err, 'Prompt Voice history')}`);
    return { ok: false, deleted: false };
  }
}

/** Handles `promptVoice.history.clear`. */
export function clearHistoryHandler(args: unknown, deps: HistoryRpcDeps): HistoryClearResponse {
  if (!deps.historyStore) return { ok: false, deletedCount: 0 };
  const req = asObject(args) as HistoryClearRequest;
  try {
    const deletedCount = deps.historyStore.clear({
      projectId: nullableString(req.projectId),
      includeStarred: req.includeStarred === true
    });
    if (deletedCount > 0) deps.onHistoryChanged?.({ action: 'cleared' });
    return { ok: true, deletedCount };
  } catch (err) {
    deps.log.warn(`Could not clear activity history: ${describeUnexpectedFailure(err, 'Prompt Voice history')}`);
    return { ok: false, deletedCount: 0 };
  }
}

/** Handles `promptVoice.history.projects` by resolving stored project IDs to host project names. */
export async function listHistoryProjectsHandler(deps: HistoryRpcDeps): Promise<HistoryProjectsResponse> {
  const hostProjects = deps.listProjects
    ? await deps.listProjects().catch((err: unknown) => {
        deps.log.warn(`Project list unavailable for history filter: ${describeUnexpectedFailure(err, 'Zana projects')}`);
        return [];
      })
    : [];

  const namesById = new Map<string, string>();
  for (const project of hostProjects) {
    if (project && typeof project.id === 'string' && project.id.trim()) {
      namesById.set(project.id, (project.name || project.id).trim());
    }
  }

  let storedIds: string[] = [];
  if (deps.historyStore) {
    try {
      storedIds = deps.historyStore.listProjectIds();
    } catch (err) {
      deps.log.warn(`Could not list project IDs from activity history: ${describeUnexpectedFailure(err, 'Prompt Voice history')}`);
    }
  }

  const merged = new Map<string, HistoryProjectOption>();
  for (const [id, name] of namesById.entries()) {
    merged.set(id, { id, name });
  }
  for (const id of storedIds) {
    if (!merged.has(id)) {
      merged.set(id, { id, name: id });
    }
  }

  const projects = Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
  );
  return { projects };
}
