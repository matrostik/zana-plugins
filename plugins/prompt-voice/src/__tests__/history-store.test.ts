import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { PluginDatabase } from '@zana-ai/zcc-plugin-sdk/server';
import { createHistoryStore } from '../server/historyStore.ts';

function createInMemoryPluginDb(): PluginDatabase {
  const sqlite = new DatabaseSync(':memory:');
  return {
    runScript(sql: string) {
      sqlite.exec(sql);
    },
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      return {
        all(...params: unknown[]) {
          return stmt.all(...(params as never[])) as unknown[];
        },
        get(...params: unknown[]) {
          return stmt.get(...(params as never[])) as unknown;
        },
        run(...params: unknown[]) {
          const res = stmt.run(...(params as never[]));
          return { changes: Number(res.changes ?? 0) };
        }
      };
    },
    migrate(statements: readonly string[]) {
      // Mirror host append-only per-index hash validation so shifted/mutated migrations fail in tests too.
      sqlite.exec('CREATE TABLE IF NOT EXISTS _zcc_migrations (id INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL, statement_hash TEXT)');
      const applied = new Map<number, string | null>();
      for (const row of sqlite.prepare('SELECT id, statement_hash FROM _zcc_migrations ORDER BY id').all() as Array<{ id: number; statement_hash: string | null }>) {
        applied.set(row.id, row.statement_hash);
      }
      statements.forEach((sql, index) => {
        const hash = createHash('sha256').update(sql).digest('hex');
        const recorded = applied.get(index);
        if (recorded !== undefined && recorded !== null && recorded !== hash) {
          throw new Error(`Migration statement at index ${index} changed hash`);
        }
        if (recorded === undefined) {
          sqlite.exec(sql);
          sqlite.prepare('INSERT INTO _zcc_migrations (id, applied_at, statement_hash) VALUES (?, ?, ?)').run(index, Date.now(), hash);
        }
      });
    },
    transaction<T>(fn: () => T): T {
      sqlite.exec('BEGIN');
      try {
        const result = fn();
        sqlite.exec('COMMIT');
        return result;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    }
  };
}

describe('createHistoryStore', () => {
  it('runs idempotent migrations and records dictations and refinements in reverse chronological order', () => {
    const db = createInMemoryPluginDb();
    let seq = 0;
    const baseNow = 1_700_000_000_000;
    const store = createHistoryStore(db, {
      createId: () => `id-${++seq}`,
      now: () => baseNow
    });
    // Second initialization on same DB must succeed cleanly.
    createHistoryStore(db);

    const first = store.record({
      kind: 'dictation',
      source: 'studio',
      createdAt: baseNow - 3_000,
      projectId: 'proj-a',
      rawText: 'hello raw',
      outputText: 'hello raw',
      sttProvider: 'system',
      audioDurationMs: 3200,
      processingDurationMs: 410
    });
    const second = store.record({
      kind: 'dictation_cleanup',
      source: 'composer',
      createdAt: baseNow - 2_000,
      projectId: 'proj-a',
      threadId: 'thread-42',
      rawText: 'um fix auth bug',
      outputText: 'Fix the auth bug.',
      sttProvider: 'local-whisper',
      llmProvider: 'assistant',
      llmModel: 'assistant',
      tone: 'standard',
      refineNotice: { code: 'LLM_FAILED', message: 'Fallback notice' }
    });
    const third = store.record({
      kind: 'refinement',
      source: 'studio',
      createdAt: baseNow - 1_000,
      projectId: 'proj-b',
      rawText: 'make this formal',
      outputText: 'Please make this formal.',
      llmProvider: 'openai',
      llmModel: 'gpt-5.4-nano',
      presetId: 'translate',
      tone: 'standard',
      targetLanguage: 'es',
      customPrompt: 'Keep technical terms',
      processingDurationMs: 850
    });

    const page = store.list();
    expect(page.total).toBe(3);
    expect(page.hasMore).toBe(false);
    expect(page.entries.map((e) => e.id)).toEqual([third.id, second.id, first.id]);
    expect(page.entries[1]).toMatchObject({
      threadId: 'thread-42',
      refineNotice: { code: 'LLM_FAILED', message: 'Fallback notice' }
    });
    expect(page.entries[0]).toMatchObject({
      presetId: 'translate',
      targetLanguage: 'es',
      customPrompt: 'Keep technical terms'
    });
    expect(store.listProjectIds()).toEqual(['proj-a', 'proj-b']);
  });

  it('supports search (including LIKE wildcards), type/source/project/starred filters, and pagination', () => {
    const db = createInMemoryPluginDb();
    let seq = 0;
    const store = createHistoryStore(db, {
      createId: () => `e-${++seq}`,
      now: () => 10_000
    });

    const a = store.record({
      kind: 'dictation',
      source: 'composer',
      createdAt: 10,
      projectId: 'p1',
      rawText: '100% done_now',
      outputText: '100% done_now'
    });
    const b = store.record({
      kind: 'dictation_cleanup',
      source: 'home',
      createdAt: 20,
      projectId: 'p2',
      rawText: 'raw alpha',
      outputText: 'Cleaned beta'
    });
    const c = store.record({
      kind: 'refinement',
      source: 'studio',
      createdAt: 30,
      projectId: 'p1',
      rawText: 'draft gamma',
      outputText: 'Polished gamma'
    });
    store.setStarred(b.id, true);

    // Literal LIKE characters must not match everything.
    expect(store.list({ query: '100% done_' }).entries.map((e) => e.id)).toEqual([a.id]);
    // Search matches both raw and refined text.
    expect(store.list({ query: 'alpha' }).entries.map((e) => e.id)).toEqual([b.id]);
    expect(store.list({ query: 'beta' }).entries.map((e) => e.id)).toEqual([b.id]);

    expect(store.list({ type: 'dictation' }).entries.map((e) => e.id)).toEqual([b.id, a.id]);
    expect(store.list({ type: 'refinement' }).entries.map((e) => e.id)).toEqual([c.id]);
    expect(store.list({ source: 'home' }).entries.map((e) => e.id)).toEqual([b.id]);
    expect(store.list({ projectId: 'p1' }).entries.map((e) => e.id)).toEqual([c.id, a.id]);
    expect(store.list({ starredOnly: true }).entries.map((e) => e.id)).toEqual([b.id]);

    // Pagination
    const page1 = store.list({ limit: 2, offset: 0 });
    expect(page1.entries.map((e) => e.id)).toEqual([c.id, b.id]);
    expect(page1.total).toBe(3);
    expect(page1.hasMore).toBe(true);

    const page2 = store.list({ limit: 2, offset: 2 });
    expect(page2.entries.map((e) => e.id)).toEqual([a.id]);
    expect(page2.hasMore).toBe(false);
  });

  it('prunes oldest non-starred entries by maxEntries and maxDays while keeping starred entries', () => {
    const db = createInMemoryPluginDb();
    let seq = 0;
    const dayMs = 86_400_000;
    const nowTs = 200 * dayMs;
    const store = createHistoryStore(db, {
      createId: () => `p-${++seq}`,
      now: () => nowTs
    });

    const oldStarred = store.record(
      { kind: 'dictation', source: 'composer', createdAt: nowTs - 120 * dayMs, rawText: 'keep me', outputText: 'keep me' },
      { maxEntries: 0, maxDays: 0 }
    );
    store.setStarred(oldStarred.id, true);

    store.record(
      { kind: 'dictation', source: 'composer', createdAt: nowTs - 120 * dayMs, rawText: 'too old', outputText: 'too old' },
      { maxEntries: 0, maxDays: 0 }
    );
    const recent1 = store.record(
      { kind: 'dictation', source: 'composer', createdAt: nowTs - 3 * dayMs, rawText: 'recent 1', outputText: 'recent 1' },
      { maxEntries: 0, maxDays: 0 }
    );
    const recent2 = store.record(
      { kind: 'dictation', source: 'composer', createdAt: nowTs - 2 * dayMs, rawText: 'recent 2', outputText: 'recent 2' },
      { maxEntries: 0, maxDays: 0 }
    );
    const recent3 = store.record(
      { kind: 'dictation', source: 'composer', createdAt: nowTs - 1 * dayMs, rawText: 'recent 3', outputText: 'recent 3' },
      { maxEntries: 2, maxDays: 30 }
    );

    const remainingIds = store.list().entries.map((e) => e.id);
    expect(remainingIds).toEqual([recent3.id, recent2.id, oldStarred.id]);
    expect(store.getById(recent1.id)).toBeNull();
  });

  it('supports single delete and scoped/global clear with starred protection', () => {
    const db = createInMemoryPluginDb();
    let seq = 0;
    const store = createHistoryStore(db, {
      createId: () => `c-${++seq}`,
      now: () => 10_000
    });

    const p1Unstarred = store.record({ kind: 'dictation', source: 'studio', createdAt: 1, projectId: 'p1', rawText: 'a', outputText: 'a' });
    const p1Starred = store.record({ kind: 'dictation', source: 'studio', createdAt: 2, projectId: 'p1', rawText: 'b', outputText: 'b' });
    const p2Unstarred = store.record({ kind: 'dictation', source: 'studio', createdAt: 3, projectId: 'p2', rawText: 'c', outputText: 'c' });
    const p2Extra = store.record({ kind: 'dictation', source: 'studio', createdAt: 4, projectId: 'p2', rawText: 'd', outputText: 'd' });
    store.setStarred(p1Starred.id, true);

    expect(store.delete(p2Extra.id)).toBe(true);
    expect(store.delete('missing')).toBe(false);

    // Scoped clear preserves starred in p1 and leaves p2 untouched.
    expect(store.clear({ projectId: 'p1', includeStarred: false })).toBe(1);
    expect(store.getById(p1Unstarred.id)).toBeNull();
    expect(store.getById(p1Starred.id)).not.toBeNull();
    expect(store.getById(p2Unstarred.id)).not.toBeNull();

    // Global clear without includeStarred deletes p2Unstarred but keeps p1Starred.
    expect(store.clear({ includeStarred: false })).toBe(1);
    expect(store.list().entries.map((e) => e.id)).toEqual([p1Starred.id]);

    // Global clear with includeStarred wipes everything.
    expect(store.clear({ includeStarred: true })).toBe(1);
    expect(store.list().total).toBe(0);
  });

  it('coalesces multi-step Studio dictation and refinement steps into a single entry and includes it under both filters', () => {
    const db = createInMemoryPluginDb();
    let seq = 0;
    let clock = 100_000;
    const store = createHistoryStore(db, {
      createId: () => `co-${++seq}`,
      now: () => clock
    });

    // Step 1: initial dictation chunk
    const step1 = store.record({
      kind: 'dictation',
      source: 'studio',
      projectId: 'proj-1',
      rawText: 'first part',
      outputText: 'first part',
      sttProvider: 'system',
      audioDurationMs: 2100,
      processingDurationMs: 300
    });
    store.setStarred(step1.id, true);

    // Step 2: append second dictation chunk into same draft
    clock = 105_000;
    const step2 = store.coalesceDictation(step1.id, {
      kind: 'dictation',
      source: 'studio',
      projectId: 'proj-1',
      rawText: 'second part',
      outputText: 'second part',
      sttProvider: 'system',
      audioDurationMs: 1900,
      processingDurationMs: 250
    });
    expect(step2.id).toBe(step1.id);
    expect(step2.rawText).toBe('first part second part');
    expect(step2.audioDurationMs).toBe(4000);
    expect(step2.starred).toBe(true);

    // Step 3: refine the dictated draft -> upgrades to dictation_cleanup while keeping 1 row
    clock = 110_000;
    const step3 = store.coalesceRefinement(step1.id, {
      kind: 'refinement',
      source: 'studio',
      projectId: 'proj-1',
      rawText: 'first part second part',
      outputText: 'First part and second part.',
      llmProvider: 'openai',
      llmModel: 'gpt-5.4-nano',
      presetId: 'improve',
      tone: 'formal',
      processingDurationMs: 450
    });
    expect(step3.id).toBe(step1.id);
    expect(step3.kind).toBe('dictation_cleanup');
    expect(step3.sttProvider).toBe('system');
    expect(step3.llmProvider).toBe('openai');
    expect(step3.presetId).toBe('improve');
    expect(step3.tone).toBe('formal');
    expect(step3.rawText).toBe('first part second part');
    expect(step3.outputText).toBe('First part and second part.');
    expect(step3.audioDurationMs).toBe(4000);
    expect(step3.processingDurationMs).toBe(1000);
    expect(step3.starred).toBe(true);

    // Step 4: iterative re-refinement ("Use refined as input" -> Translate) preserves original rawText
    clock = 115_000;
    const step4 = store.coalesceRefinement(step1.id, {
      kind: 'refinement',
      source: 'studio',
      projectId: 'proj-1',
      rawText: 'First part and second part.',
      outputText: 'Primera parte y segunda parte.',
      llmProvider: 'openai',
      llmModel: 'gpt-5.4-nano',
      presetId: 'translate',
      tone: 'standard',
      targetLanguage: 'es',
      processingDurationMs: 500
    });
    expect(step4.id).toBe(step1.id);
    expect(step4.rawText).toBe('first part second part');
    expect(step4.outputText).toBe('Primera parte y segunda parte.');
    expect(step4.processingDurationMs).toBe(1500);

    // Only 1 entry total in History, discoverable under All, Dictations, AND Refinements
    expect(store.list().total).toBe(1);
    expect(store.list({ type: 'dictation' }).total).toBe(1);
    expect(store.list({ type: 'refinement' }).total).toBe(1);

    // Fallback when referenced id was deleted: creates a new entry cleanly
    store.delete(step1.id);
    const recreated = store.coalesceRefinement(step1.id, {
      kind: 'refinement',
      source: 'studio',
      rawText: 'fresh draft',
      outputText: 'Fresh draft.',
      presetId: 'improve',
      tone: 'standard'
    });
    expect(recreated.id).not.toBe(step1.id);
    expect(store.list().total).toBe(1);
  });

  it('upgrades an existing v1 database without violating append-only migration hashes and deduplicates legacy pairs once', () => {
    const db = createInMemoryPluginDb();
    // Simulate original shipped migrations [0..5] + pre-existing duplicate rows from before coalescing existed
    db.migrate([
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
      'CREATE INDEX IF NOT EXISTS idx_activity_history_starred ON activity_history (starred)'
    ]);
    db.runScript(`
      INSERT INTO activity_history VALUES (
        'leg-dict', 'dictation', 'studio', 1000000, 'proj-1', NULL,
        'um ship deduplication', 'um ship deduplication',
        'system', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
        3500, 200, NULL, NULL, 1
      );
      INSERT INTO activity_history VALUES (
        'leg-ref1', 'refinement', 'studio', 1015000, 'proj-1', NULL,
        'um ship deduplication', 'Ship deduplication.',
        NULL, NULL, 'openai', 'gpt-5.4-nano', 'improve', 'standard', NULL, NULL,
        NULL, 400, NULL, NULL, 0
      );
      INSERT INTO activity_history VALUES (
        'leg-ref2', 'refinement', 'studio', 1030000, 'proj-1', NULL,
        'Ship deduplication.', 'Resumen de deduplicación.',
        NULL, NULL, 'openai', 'gpt-5.4-nano', 'translate', 'standard', 'es', NULL,
        NULL, 500, NULL, NULL, 0
      );
      INSERT INTO activity_history VALUES (
        'unrelated-dict', 'dictation', 'studio', 3000000, 'proj-1', NULL,
        'separate recording later', 'separate recording later',
        'system', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
        1500, 150, NULL, NULL, 0
      );
    `);

    const store = createHistoryStore(db, { now: () => 5_000_000 });
    const entries = store.list().entries;
    expect(entries).toHaveLength(2);
    expect(entries[0]!.id).toBe('unrelated-dict');
    expect(entries[1]).toMatchObject({
      id: 'leg-ref2',
      kind: 'dictation_cleanup',
      source: 'studio',
      rawText: 'um ship deduplication',
      outputText: 'Resumen de deduplicación.',
      sttProvider: 'system',
      llmProvider: 'openai',
      presetId: 'translate',
      targetLanguage: 'es',
      audioDurationMs: 3500,
      processingDurationMs: 1100,
      starred: true
    });

    // Re-opening store is idempotent and does not alter unrelated future entries
    const store2 = createHistoryStore(db, { now: () => 5_100_000 });
    expect(store2.list().total).toBe(2);
  });
});
