import { randomUUID } from 'node:crypto';
import type { PluginDatabase } from '@zana-ai/zcc-plugin-sdk/server';
import {
  DEFAULT_HISTORY_MAX_DAYS,
  DEFAULT_HISTORY_MAX_ENTRIES
} from '../shared/historyPreferences.ts';
import {
  ACTIVITY_KINDS,
  ACTIVITY_SOURCES,
  type ActivityKind,
  type ActivitySource,
  type HistoryClearRequest,
  type HistoryEntry,
  type HistoryListRequest,
  type PromptVoiceErrorCode,
  type RefineNotice
} from '../shared/protocol.ts';

const MS_PER_DAY = 86_400_000;
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;
const LEGACY_DEDUPE_MIGRATION_ID = 'dedupe_studio_dictation_refinement_v1';
const LEGACY_DEDUPE_WINDOW_MS = 15 * 60_000;

// Append-only: never reorder, edit, or insert before shipped statements (host enforces per-index hashes).
const HISTORY_MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS activity_history (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    project_id TEXT,
    thread_id TEXT,
    raw_text TEXT NOT NULL,
    output_text TEXT NOT NULL,
    stt_provider TEXT,
    stt_model TEXT,
    llm_provider TEXT,
    llm_model TEXT,
    preset_id TEXT,
    tone TEXT,
    target_language TEXT,
    custom_prompt TEXT,
    audio_duration_ms INTEGER,
    processing_duration_ms INTEGER,
    refine_notice_code TEXT,
    refine_notice_message TEXT,
    starred INTEGER NOT NULL DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS idx_activity_history_created ON activity_history (created_at DESC, id DESC)',
  'CREATE INDEX IF NOT EXISTS idx_activity_history_project ON activity_history (project_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_activity_history_kind ON activity_history (kind)',
  'CREATE INDEX IF NOT EXISTS idx_activity_history_source ON activity_history (source)',
  'CREATE INDEX IF NOT EXISTS idx_activity_history_starred ON activity_history (starred)',
  `CREATE TABLE IF NOT EXISTS history_migrations (
    id TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`
];

export interface RecordHistoryInput {
  kind: ActivityKind;
  source: ActivitySource;
  createdAt?: number;
  projectId?: string | null;
  threadId?: string | null;
  rawText: string;
  outputText: string;
  sttProvider?: string | null;
  sttModel?: string | null;
  llmProvider?: string | null;
  llmModel?: string | null;
  presetId?: string | null;
  tone?: string | null;
  targetLanguage?: string | null;
  customPrompt?: string | null;
  audioDurationMs?: number | null;
  processingDurationMs?: number | null;
  refineNotice?: RefineNotice | null;
}

export interface HistoryRetentionPolicy {
  maxEntries: number;
  maxDays: number;
}

export interface HistoryListPage {
  entries: HistoryEntry[];
  total: number;
  hasMore: boolean;
}

export interface HistoryStore {
  record(input: RecordHistoryInput, retention?: Partial<HistoryRetentionPolicy>): HistoryEntry;
  coalesceDictation(id: string, input: RecordHistoryInput, retention?: Partial<HistoryRetentionPolicy>): HistoryEntry;
  coalesceRefinement(id: string, input: RecordHistoryInput, retention?: Partial<HistoryRetentionPolicy>): HistoryEntry;
  list(filter?: HistoryListRequest): HistoryListPage;
  getById(id: string): HistoryEntry | null;
  setStarred(id: string, starred: boolean): HistoryEntry | null;
  delete(id: string): boolean;
  clear(options?: HistoryClearRequest): number;
  prune(retention?: Partial<HistoryRetentionPolicy>): number;
  listProjectIds(): string[];
}

export interface HistoryStoreOptions {
  now?: () => number;
  createId?: () => string;
}

interface HistoryRow {
  id: string;
  kind: string;
  source: string;
  created_at: number;
  project_id: string | null;
  thread_id: string | null;
  raw_text: string;
  output_text: string;
  stt_provider: string | null;
  stt_model: string | null;
  llm_provider: string | null;
  llm_model: string | null;
  preset_id: string | null;
  tone: string | null;
  target_language: string | null;
  custom_prompt: string | null;
  audio_duration_ms: number | null;
  processing_duration_ms: number | null;
  refine_notice_code: string | null;
  refine_notice_message: string | null;
  starred: number;
}

type PreparedStatement = ReturnType<PluginDatabase['prepare']>;

interface HistoryStatements {
  insertStmt: PreparedStatement;
  updateCoalescedStmt: PreparedStatement;
  getByIdStmt: PreparedStatement;
  setStarStmt: PreparedStatement;
  deleteByIdStmt: PreparedStatement;
  pruneAgeStmt: PreparedStatement;
  pruneCountStmt: PreparedStatement;
  projectIdsStmt: PreparedStatement;
}

function nullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function resolveTimestamp(value: number | undefined, now: () => number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : now();
}

function sumNullableDuration(existing: number | null, addition: number | null | undefined): number | null {
  const next = nullableInt(addition);
  const prev = nullableInt(existing);
  if (prev === null && next === null) return null;
  return (prev ?? 0) + (next ?? 0);
}

function appendText(existing: string, addition: string): string {
  const next = addition.trim();
  if (!next) return existing;
  if (!existing) return next;
  if (/\s$/.test(existing)) return `${existing}${next}`;
  return `${existing} ${next}`;
}

function normalizeKind(value: string): ActivityKind {
  return (ACTIVITY_KINDS as readonly string[]).includes(value) ? (value as ActivityKind) : 'dictation';
}

function normalizeSource(value: string): ActivitySource {
  return (ACTIVITY_SOURCES as readonly string[]).includes(value) ? (value as ActivitySource) : 'studio';
}

function escapeLikePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

function rowToEntry(row: HistoryRow): HistoryEntry {
  const refineNotice: RefineNotice | null =
    row.refine_notice_code && row.refine_notice_message
      ? {
          code: row.refine_notice_code as PromptVoiceErrorCode,
          message: row.refine_notice_message
        }
      : null;

  return {
    id: row.id,
    kind: normalizeKind(row.kind),
    source: normalizeSource(row.source),
    createdAt: Number(row.created_at),
    projectId: row.project_id ?? null,
    threadId: row.thread_id ?? null,
    rawText: row.raw_text,
    outputText: row.output_text,
    sttProvider: row.stt_provider ?? null,
    sttModel: row.stt_model ?? null,
    llmProvider: row.llm_provider ?? null,
    llmModel: row.llm_model ?? null,
    presetId: row.preset_id ?? null,
    tone: row.tone ?? null,
    targetLanguage: row.target_language ?? null,
    customPrompt: row.custom_prompt ?? null,
    audioDurationMs: row.audio_duration_ms === null ? null : Number(row.audio_duration_ms),
    processingDurationMs: row.processing_duration_ms === null ? null : Number(row.processing_duration_ms),
    refineNotice,
    starred: Boolean(row.starred)
  };
}

function buildWhereClause(filter: HistoryListRequest): { whereSql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.type === 'dictation') {
    clauses.push("kind IN ('dictation', 'dictation_cleanup')");
  } else if (filter.type === 'refinement') {
    clauses.push("(kind = 'refinement' OR (kind = 'dictation_cleanup' AND (preset_id IS NOT NULL OR source = 'studio')))");
  }

  if (filter.source && filter.source !== 'all' && (ACTIVITY_SOURCES as readonly string[]).includes(filter.source)) {
    clauses.push('source = ?');
    params.push(filter.source);
  }

  const projectId = nullableText(filter.projectId);
  if (projectId) {
    clauses.push('project_id = ?');
    params.push(projectId);
  }

  if (filter.starredOnly) {
    clauses.push('starred = 1');
  }

  const query = typeof filter.query === 'string' ? filter.query.trim() : '';
  if (query.length > 0) {
    const pattern = escapeLikePattern(query);
    clauses.push("(raw_text LIKE ? ESCAPE '\\' OR output_text LIKE ? ESCAPE '\\')");
    params.push(pattern, pattern);
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

function normalizePagination(filter: HistoryListRequest): { limit: number; offset: number } {
  const rawLimit = typeof filter.limit === 'number' && Number.isFinite(filter.limit) ? Math.floor(filter.limit) : DEFAULT_PAGE_LIMIT;
  const rawOffset = typeof filter.offset === 'number' && Number.isFinite(filter.offset) ? Math.floor(filter.offset) : 0;
  return {
    limit: Math.max(1, Math.min(MAX_PAGE_LIMIT, rawLimit)),
    offset: Math.max(0, rawOffset)
  };
}

function prepareHistoryStatements(db: PluginDatabase): HistoryStatements {
  return {
    insertStmt: db.prepare(
      `INSERT INTO activity_history (
        id, kind, source, created_at, project_id, thread_id,
        raw_text, output_text, stt_provider, stt_model, llm_provider, llm_model,
        preset_id, tone, target_language, custom_prompt,
        audio_duration_ms, processing_duration_ms,
        refine_notice_code, refine_notice_message, starred
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ),
    updateCoalescedStmt: db.prepare(
      `UPDATE activity_history
       SET kind = ?, source = ?, created_at = ?, project_id = ?, thread_id = ?,
           raw_text = ?, output_text = ?, stt_provider = ?, stt_model = ?,
           llm_provider = ?, llm_model = ?, preset_id = ?, tone = ?,
           target_language = ?, custom_prompt = ?, audio_duration_ms = ?,
           processing_duration_ms = ?, refine_notice_code = ?,
           refine_notice_message = ?, starred = ?
       WHERE id = ?`
    ),
    getByIdStmt: db.prepare('SELECT * FROM activity_history WHERE id = ?'),
    setStarStmt: db.prepare('UPDATE activity_history SET starred = ? WHERE id = ?'),
    deleteByIdStmt: db.prepare('DELETE FROM activity_history WHERE id = ?'),
    pruneAgeStmt: db.prepare('DELETE FROM activity_history WHERE starred = 0 AND created_at < ?'),
    pruneCountStmt: db.prepare(
      `DELETE FROM activity_history
       WHERE starred = 0
         AND id NOT IN (
           SELECT id FROM activity_history
           WHERE starred = 0
           ORDER BY created_at DESC, rowid DESC
           LIMIT ?
         )`
    ),
    projectIdsStmt: db.prepare(
      `SELECT DISTINCT project_id
       FROM activity_history
       WHERE project_id IS NOT NULL AND project_id != ''
       ORDER BY project_id ASC`
    )
  };
}

function runUpdateRow(stmt: PreparedStatement, row: HistoryRow): void {
  stmt.run(
    row.kind, row.source, row.created_at, row.project_id, row.thread_id,
    row.raw_text, row.output_text, row.stt_provider, row.stt_model,
    row.llm_provider, row.llm_model, row.preset_id, row.tone,
    row.target_language, row.custom_prompt, row.audio_duration_ms,
    row.processing_duration_ms, row.refine_notice_code, row.refine_notice_message,
    row.starred, row.id
  );
}

function tryMergeLegacyStudioRow(prev: HistoryRow | undefined, curr: HistoryRow): HistoryRow | null {
  if (!prev || curr.kind !== 'refinement' || curr.created_at - prev.created_at > LEGACY_DEDUPE_WINDOW_MS) {
    return null;
  }
  const currRaw = curr.raw_text.trim();
  const prevRaw = prev.raw_text.trim();
  const prevOut = prev.output_text.trim();
  const matchesDictation = prev.kind === 'dictation' && prevOut.length > 0 && prevOut === currRaw;
  const matchesFollowupRefinement =
    (prev.kind === 'refinement' || prev.kind === 'dictation_cleanup') &&
    currRaw.length > 0 &&
    (currRaw === prevRaw || currRaw === prevOut);
  if (!matchesDictation && !matchesFollowupRefinement) return null;

  const sttProvider = prev.stt_provider ?? curr.stt_provider;
  return {
    ...curr,
    kind: sttProvider ? 'dictation_cleanup' : 'refinement',
    raw_text: prev.raw_text,
    stt_provider: sttProvider,
    stt_model: prev.stt_model ?? curr.stt_model,
    audio_duration_ms: prev.audio_duration_ms ?? curr.audio_duration_ms,
    processing_duration_ms: sumNullableDuration(prev.processing_duration_ms, curr.processing_duration_ms),
    thread_id: prev.thread_id ?? curr.thread_id,
    starred: prev.starred || curr.starred ? 1 : 0
  };
}

/** One-time cleanup of legacy un-coalesced Studio Dictation -> Refinement duplicate pairs. */
function runLegacyStudioDedupeMigration(db: PluginDatabase, stmts: HistoryStatements, now: () => number): void {
  const alreadyApplied = db
    .prepare('SELECT 1 AS ok FROM history_migrations WHERE id = ?')
    .get(LEGACY_DEDUPE_MIGRATION_ID) as { ok?: number } | undefined;
  if (alreadyApplied) return;

  db.transaction(() => {
    const studioRows = db
      .prepare("SELECT * FROM activity_history WHERE source = 'studio' ORDER BY created_at ASC, rowid ASC")
      .all() as HistoryRow[];
    const activeByProject = new Map<string, HistoryRow>();

    for (const curr of studioRows) {
      const projectKey = curr.project_id ?? '';
      const prev = activeByProject.get(projectKey);
      const merged = tryMergeLegacyStudioRow(prev, curr);
      if (merged && prev) {
        runUpdateRow(stmts.updateCoalescedStmt, merged);
        stmts.deleteByIdStmt.run(prev.id);
        activeByProject.set(projectKey, merged);
      } else {
        activeByProject.set(projectKey, curr);
      }
    }

    db.prepare('INSERT OR IGNORE INTO history_migrations (id, applied_at) VALUES (?, ?)').run(
      LEGACY_DEDUPE_MIGRATION_ID,
      now()
    );
  });
}

function buildNewEntry(input: RecordHistoryInput, now: () => number, createId: () => string): HistoryEntry {
  return {
    id: createId(),
    kind: normalizeKind(input.kind),
    source: normalizeSource(input.source),
    createdAt: resolveTimestamp(input.createdAt, now),
    projectId: nullableText(input.projectId),
    threadId: nullableText(input.threadId),
    rawText: input.rawText,
    outputText: input.outputText,
    sttProvider: nullableText(input.sttProvider),
    sttModel: nullableText(input.sttModel),
    llmProvider: nullableText(input.llmProvider),
    llmModel: nullableText(input.llmModel),
    presetId: nullableText(input.presetId),
    tone: nullableText(input.tone),
    targetLanguage: nullableText(input.targetLanguage),
    customPrompt: nullableText(input.customPrompt),
    audioDurationMs: nullableInt(input.audioDurationMs),
    processingDurationMs: nullableInt(input.processingDurationMs),
    refineNotice: input.refineNotice ?? null,
    starred: false
  };
}

function buildCoalescedDictationEntry(existing: HistoryEntry, input: RecordHistoryInput, now: () => number): HistoryEntry {
  return {
    ...existing,
    createdAt: resolveTimestamp(input.createdAt, now),
    projectId: nullableText(input.projectId) ?? existing.projectId,
    threadId: nullableText(input.threadId) ?? existing.threadId,
    rawText: appendText(existing.rawText, input.rawText),
    outputText:
      existing.kind === 'dictation'
        ? appendText(existing.outputText, input.outputText)
        : existing.outputText,
    sttProvider: nullableText(input.sttProvider) ?? existing.sttProvider,
    sttModel: nullableText(input.sttModel) ?? existing.sttModel,
    audioDurationMs: sumNullableDuration(existing.audioDurationMs, input.audioDurationMs),
    processingDurationMs: sumNullableDuration(existing.processingDurationMs, input.processingDurationMs),
    refineNotice: existing.kind === 'dictation' ? (input.refineNotice ?? existing.refineNotice) : existing.refineNotice
  };
}

function buildCoalescedRefinementEntry(existing: HistoryEntry, input: RecordHistoryInput, now: () => number): HistoryEntry {
  const sttProvider = existing.sttProvider ?? nullableText(input.sttProvider);
  const sttModel = existing.sttModel ?? nullableText(input.sttModel);
  return {
    ...existing,
    kind: sttProvider ? 'dictation_cleanup' : 'refinement',
    createdAt: resolveTimestamp(input.createdAt, now),
    projectId: nullableText(input.projectId) ?? existing.projectId,
    rawText:
      existing.kind === 'dictation' && nullableText(input.rawText)
        ? input.rawText
        : existing.rawText || input.rawText,
    outputText: input.outputText,
    sttProvider,
    sttModel,
    llmProvider: nullableText(input.llmProvider),
    llmModel: nullableText(input.llmModel),
    presetId: nullableText(input.presetId),
    tone: nullableText(input.tone),
    targetLanguage: nullableText(input.targetLanguage),
    customPrompt: nullableText(input.customPrompt),
    processingDurationMs: sumNullableDuration(existing.processingDurationMs, input.processingDurationMs),
    refineNotice: input.refineNotice ?? null
  };
}

function pruneHistory(stmts: HistoryStatements, now: () => number, retention?: Partial<HistoryRetentionPolicy>): number {
  const maxEntries = retention?.maxEntries ?? DEFAULT_HISTORY_MAX_ENTRIES;
  const maxDays = retention?.maxDays ?? DEFAULT_HISTORY_MAX_DAYS;
  let removed = 0;

  if (maxDays > 0) {
    removed += stmts.pruneAgeStmt.run(now() - maxDays * MS_PER_DAY).changes;
  }
  if (maxEntries > 0) {
    removed += stmts.pruneCountStmt.run(maxEntries).changes;
  }
  return removed;
}

function insertHistoryEntry(
  stmts: HistoryStatements,
  now: () => number,
  entry: HistoryEntry,
  retention?: Partial<HistoryRetentionPolicy>
): void {
  stmts.insertStmt.run(
    entry.id, entry.kind, entry.source, entry.createdAt, entry.projectId, entry.threadId,
    entry.rawText, entry.outputText, entry.sttProvider, entry.sttModel, entry.llmProvider,
    entry.llmModel, entry.presetId, entry.tone, entry.targetLanguage, entry.customPrompt,
    entry.audioDurationMs, entry.processingDurationMs,
    entry.refineNotice?.code ?? null, entry.refineNotice?.message ?? null
  );
  pruneHistory(stmts, now, retention);
}

function saveUpdatedHistoryEntry(
  stmts: HistoryStatements,
  now: () => number,
  entry: HistoryEntry,
  retention?: Partial<HistoryRetentionPolicy>
): void {
  stmts.updateCoalescedStmt.run(
    entry.kind, entry.source, entry.createdAt, entry.projectId, entry.threadId,
    entry.rawText, entry.outputText, entry.sttProvider, entry.sttModel, entry.llmProvider,
    entry.llmModel, entry.presetId, entry.tone, entry.targetLanguage, entry.customPrompt,
    entry.audioDurationMs, entry.processingDurationMs,
    entry.refineNotice?.code ?? null, entry.refineNotice?.message ?? null,
    entry.starred ? 1 : 0, entry.id
  );
  pruneHistory(stmts, now, retention);
}

function coalesceEntry(
  db: PluginDatabase,
  stmts: HistoryStatements,
  now: () => number,
  createId: () => string,
  id: string,
  input: RecordHistoryInput,
  merge: (existing: HistoryEntry, input: RecordHistoryInput, now: () => number) => HistoryEntry,
  retention?: Partial<HistoryRetentionPolicy>
): HistoryEntry {
  const trimmedId = nullableText(id);
  return db.transaction(() => {
    const existingRow = trimmedId ? (stmts.getByIdStmt.get(trimmedId) as HistoryRow | undefined) : undefined;
    if (!existingRow) {
      const entry = buildNewEntry(input, now, createId);
      insertHistoryEntry(stmts, now, entry, retention);
      return entry;
    }
    const updated = merge(rowToEntry(existingRow), input, now);
    saveUpdatedHistoryEntry(stmts, now, updated, retention);
    return updated;
  });
}

function listHistoryEntries(db: PluginDatabase, filter: HistoryListRequest = {}): HistoryListPage {
  const { whereSql, params } = buildWhereClause(filter);
  const { limit, offset } = normalizePagination(filter);
  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM activity_history ${whereSql}`)
    .get(...params) as { total?: number } | undefined;
  const total = Number(countRow?.total ?? 0);

  const rows = db
    .prepare(`SELECT * FROM activity_history ${whereSql} ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as HistoryRow[];
  const entries = rows.map(rowToEntry);
  return { entries, total, hasMore: offset + entries.length < total };
}

function clearHistoryEntries(db: PluginDatabase, options: HistoryClearRequest = {}): number {
  const projectId = nullableText(options.projectId);
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (projectId) {
    clauses.push('project_id = ?');
    params.push(projectId);
  }
  if (options.includeStarred !== true) {
    clauses.push('starred = 0');
  }
  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.prepare(`DELETE FROM activity_history ${whereSql}`).run(...params).changes;
}

/** Creates a SQLite-backed store for Prompt Voice dictation and refinement activity history. */
export function createHistoryStore(db: PluginDatabase, options: HistoryStoreOptions = {}): HistoryStore {
  const now = options.now ?? Date.now;
  const createId = options.createId ?? randomUUID;

  db.migrate(HISTORY_MIGRATIONS);
  const stmts = prepareHistoryStatements(db);
  runLegacyStudioDedupeMigration(db, stmts, now);

  return {
    record(input, retention) {
      const entry = buildNewEntry(input, now, createId);
      db.transaction(() => insertHistoryEntry(stmts, now, entry, retention));
      return entry;
    },
    coalesceDictation: (id, input, retention) =>
      coalesceEntry(db, stmts, now, createId, id, input, buildCoalescedDictationEntry, retention),
    coalesceRefinement: (id, input, retention) =>
      coalesceEntry(db, stmts, now, createId, id, input, buildCoalescedRefinementEntry, retention),
    list: (filter) => listHistoryEntries(db, filter),
    getById(id) {
      const trimmed = nullableText(id);
      if (!trimmed) return null;
      const row = stmts.getByIdStmt.get(trimmed) as HistoryRow | undefined;
      return row ? rowToEntry(row) : null;
    },
    setStarred(id, starred) {
      const trimmed = nullableText(id);
      if (!trimmed) return null;
      if (stmts.setStarStmt.run(starred ? 1 : 0, trimmed).changes === 0) return null;
      const row = stmts.getByIdStmt.get(trimmed) as HistoryRow | undefined;
      return row ? rowToEntry(row) : null;
    },
    delete(id) {
      const trimmed = nullableText(id);
      return trimmed ? stmts.deleteByIdStmt.run(trimmed).changes > 0 : false;
    },
    clear: (opts) => clearHistoryEntries(db, opts),
    prune: (retention) => db.transaction(() => pruneHistory(stmts, now, retention)),
    listProjectIds() {
      const rows = stmts.projectIdsStmt.all() as Array<{ project_id?: string | null }>;
      return rows.map((row) => nullableText(row.project_id)).filter((id): id is string => id !== null);
    }
  };
}
