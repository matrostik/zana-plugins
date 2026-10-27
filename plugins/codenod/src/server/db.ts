import type {
  CiState,
  FindingRow,
  PrBucket,
  PullRequestRow,
  RepoRow,
  ReviewRow,
  ReviewRunRow,
  ReviewScores,
  ReviewStatus
} from './types.ts';
import { newId } from './util.ts';

export interface Database {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number };
  };
  migrate(statements: readonly string[]): void;
  transaction<T>(fn: () => T): T;
}

/** Append-only: never edit or reorder applied statements. */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS repos (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    auto_review INTEGER NOT NULL DEFAULT 0,
    spec_glob TEXT,
    added_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pull_requests (
    id TEXT PRIMARY KEY,
    host TEXT NOT NULL,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    url TEXT NOT NULL,
    state TEXT NOT NULL,
    is_draft INTEGER NOT NULL DEFAULT 0,
    head_sha TEXT NOT NULL DEFAULT '',
    head_ref TEXT NOT NULL DEFAULT '',
    base_ref TEXT NOT NULL DEFAULT '',
    ci_state TEXT NOT NULL DEFAULT 'none',
    buckets TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL,
    synced_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    pr_id TEXT NOT NULL,
    head_sha TEXT NOT NULL,
    status TEXT NOT NULL,
    trigger TEXT NOT NULL DEFAULT 'manual',
    summary TEXT,
    consensus_summary TEXT,
    has_requirements INTEGER NOT NULL DEFAULT 0,
    risk_score REAL,
    coverage_score REAL,
    coverage_note TEXT,
    requirements_score REAL,
    requirements_note TEXT,
    simplicity_score REAL,
    simplicity_note TEXT,
    stability_score REAL,
    stability_note TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    completed_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS reviews_pr ON reviews(pr_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS review_runs (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    model TEXT NOT NULL,
    reasoning_level TEXT,
    thread_id TEXT,
    status TEXT NOT NULL,
    summary TEXT,
    error TEXT,
    issue_count INTEGER NOT NULL DEFAULT 0,
    risk_score REAL,
    coverage_score REAL,
    coverage_note TEXT,
    requirements_score REAL,
    requirements_note TEXT,
    simplicity_score REAL,
    simplicity_note TEXT,
    stability_score REAL,
    stability_note TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS review_runs_review ON review_runs(review_id)`,
  `CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    file TEXT NOT NULL,
    line INTEGER,
    description TEXT NOT NULL,
    suggestion TEXT,
    agreed_by TEXT NOT NULL DEFAULT '[]',
    confidence REAL NOT NULL DEFAULT 1,
    posted_at INTEGER,
    dismissed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS findings_review ON findings(review_id)`,
  `CREATE TABLE IF NOT EXISTS posted_reviews (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    event TEXT NOT NULL,
    github_review_id INTEGER,
    url TEXT,
    comment_count INTEGER NOT NULL DEFAULT 0,
    posted_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS outdated_notifications (
    pr_id TEXT NOT NULL,
    head_sha TEXT NOT NULL,
    inbox_id TEXT NOT NULL,
    notified_at INTEGER NOT NULL,
    PRIMARY KEY (pr_id, head_sha)
  )`
];

type Row = Record<string, unknown>;

const SCORE_COLUMNS = `risk_score, coverage_score, coverage_note, requirements_score, requirements_note,
  simplicity_score, simplicity_note, stability_score, stability_note`;

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function jsonArray(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function scoresFromRow(row: Row): ReviewScores {
  return {
    riskScore: num(row.risk_score),
    coverageScore: num(row.coverage_score),
    coverageNote: str(row.coverage_note),
    requirementsScore: num(row.requirements_score),
    requirementsNote: str(row.requirements_note),
    simplicityScore: num(row.simplicity_score),
    simplicityNote: str(row.simplicity_note),
    stabilityScore: num(row.stability_score),
    stabilityNote: str(row.stability_note)
  };
}

function scoreParams(scores: ReviewScores): unknown[] {
  return [
    scores.riskScore,
    scores.coverageScore,
    scores.coverageNote,
    scores.requirementsScore,
    scores.requirementsNote,
    scores.simplicityScore,
    scores.simplicityNote,
    scores.stabilityScore,
    scores.stabilityNote
  ];
}

function toPr(row: Row): PullRequestRow {
  return {
    id: String(row.id),
    host: String(row.host),
    owner: String(row.owner),
    repo: String(row.repo),
    number: Number(row.number),
    title: String(row.title),
    author: String(row.author),
    url: String(row.url),
    state: String(row.state),
    isDraft: Boolean(row.is_draft),
    headSha: String(row.head_sha),
    headRef: String(row.head_ref),
    baseRef: String(row.base_ref),
    ciState: String(row.ci_state) as CiState,
    buckets: jsonArray(row.buckets) as PrBucket[],
    updatedAt: String(row.updated_at),
    syncedAt: Number(row.synced_at)
  };
}

function toRepo(row: Row): RepoRow {
  return {
    id: String(row.id),
    host: String(row.host),
    owner: String(row.owner),
    name: String(row.name),
    autoReview: Boolean(row.auto_review),
    specGlob: str(row.spec_glob),
    addedAt: Number(row.added_at)
  };
}

function toReview(row: Row): ReviewRow {
  return {
    id: String(row.id),
    prId: String(row.pr_id),
    headSha: String(row.head_sha),
    status: String(row.status) as ReviewStatus,
    trigger: row.trigger === 'auto' ? 'auto' : 'manual',
    summary: str(row.summary),
    consensusSummary: str(row.consensus_summary),
    hasRequirements: Boolean(row.has_requirements),
    error: str(row.error),
    createdAt: Number(row.created_at),
    completedAt: num(row.completed_at),
    ...scoresFromRow(row)
  };
}

function toRun(row: Row): ReviewRunRow {
  return {
    id: String(row.id),
    reviewId: String(row.review_id),
    providerId: String(row.provider_id),
    model: String(row.model),
    reasoningLevel: str(row.reasoning_level),
    threadId: str(row.thread_id),
    status: String(row.status) as ReviewStatus,
    summary: str(row.summary),
    error: str(row.error),
    issueCount: Number(row.issue_count ?? 0),
    startedAt: Number(row.started_at),
    completedAt: num(row.completed_at),
    ...scoresFromRow(row)
  };
}

function toFinding(row: Row): FindingRow {
  return {
    id: String(row.id),
    reviewId: String(row.review_id),
    category: String(row.category) as FindingRow['category'],
    severity: String(row.severity) as FindingRow['severity'],
    file: String(row.file),
    line: num(row.line),
    description: String(row.description),
    suggestion: str(row.suggestion),
    agreedBy: jsonArray(row.agreed_by),
    confidence: Number(row.confidence ?? 1),
    postedAt: num(row.posted_at),
    dismissed: Boolean(row.dismissed)
  };
}

export function createStore(db: Database, now: () => number = Date.now) {
  db.migrate(MIGRATIONS);

  return {
    listRepos(): RepoRow[] {
      return (db.prepare('SELECT * FROM repos ORDER BY host, owner, name').all() as Row[]).map(toRepo);
    },

    getRepo(id: string): RepoRow | null {
      const row = db.prepare('SELECT * FROM repos WHERE id = ?').get(id) as Row | undefined;
      return row ? toRepo(row) : null;
    },

    upsertRepo(repo: { id: string; host: string; owner: string; name: string; autoReview?: boolean; specGlob?: string | null }): RepoRow {
      const existing = this.getRepo(repo.id);
      if (existing) {
        db.prepare('UPDATE repos SET auto_review = ?, spec_glob = ? WHERE id = ?').run(
          (repo.autoReview ?? existing.autoReview) ? 1 : 0,
          repo.specGlob === undefined ? existing.specGlob : repo.specGlob,
          repo.id
        );
      } else {
        db.prepare('INSERT INTO repos (id, host, owner, name, auto_review, spec_glob, added_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          repo.id,
          repo.host,
          repo.owner,
          repo.name,
          repo.autoReview ? 1 : 0,
          repo.specGlob ?? null,
          now()
        );
      }
      return this.getRepo(repo.id)!;
    },

    removeRepo(id: string): boolean {
      return db.prepare('DELETE FROM repos WHERE id = ?').run(id).changes > 0;
    },

    upsertPullRequest(pr: Omit<PullRequestRow, 'syncedAt'>): void {
      db.prepare(
        `INSERT INTO pull_requests (id, host, owner, repo, number, title, author, url, state, is_draft, head_sha, head_ref, base_ref, ci_state, buckets, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET title = excluded.title, author = excluded.author, url = excluded.url, state = excluded.state,
           is_draft = excluded.is_draft, head_sha = excluded.head_sha, head_ref = excluded.head_ref, base_ref = excluded.base_ref,
           ci_state = excluded.ci_state, buckets = excluded.buckets, updated_at = excluded.updated_at, synced_at = excluded.synced_at`
      ).run(
        pr.id,
        pr.host,
        pr.owner,
        pr.repo,
        pr.number,
        pr.title,
        pr.author,
        pr.url,
        pr.state,
        pr.isDraft ? 1 : 0,
        pr.headSha,
        pr.headRef,
        pr.baseRef,
        pr.ciState,
        JSON.stringify(pr.buckets),
        pr.updatedAt,
        now()
      );
    },

    getPullRequest(id: string): PullRequestRow | null {
      const row = db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(id) as Row | undefined;
      return row ? toPr(row) : null;
    },

    listPullRequests(): PullRequestRow[] {
      return (db.prepare("SELECT * FROM pull_requests WHERE state = 'open' ORDER BY updated_at DESC").all() as Row[]).map(toPr);
    },

    /** Marks PRs on `host` that no sync query returned as closed so they leave the inbox. */
    closeMissingPullRequests(host: string, seenIds: ReadonlySet<string>): number {
      const open = db.prepare("SELECT id FROM pull_requests WHERE host = ? AND state = 'open'").all(host) as Row[];
      let closed = 0;
      for (const row of open) {
        const id = String(row.id);
        if (seenIds.has(id)) continue;
        closed += db.prepare("UPDATE pull_requests SET state = 'closed', buckets = '[]', synced_at = ? WHERE id = ?").run(now(), id).changes;
      }
      return closed;
    },

    createReview(input: { prId: string; headSha: string; trigger: 'manual' | 'auto' }): ReviewRow {
      const id = newId();
      db.prepare('INSERT INTO reviews (id, pr_id, head_sha, status, trigger, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        id,
        input.prId,
        input.headSha,
        'queued',
        input.trigger,
        now()
      );
      return this.getReview(id)!;
    },

    getReview(id: string): ReviewRow | null {
      const row = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) as Row | undefined;
      return row ? toReview(row) : null;
    },

    latestCompletedReview(prId: string): ReviewRow | null {
      const row = db.prepare("SELECT * FROM reviews WHERE pr_id = ? AND status = 'completed' ORDER BY created_at DESC, rowid DESC LIMIT 1").get(prId) as Row | undefined;
      return row ? toReview(row) : null;
    },

    hasOutdatedNotification(prId: string, headSha: string): boolean {
      return Boolean(db.prepare('SELECT 1 FROM outdated_notifications WHERE pr_id = ? AND head_sha = ?').get(prId, headSha));
    },

    recordOutdatedNotification(prId: string, headSha: string, inboxId: string): void {
      db.prepare('INSERT OR IGNORE INTO outdated_notifications (pr_id, head_sha, inbox_id, notified_at) VALUES (?, ?, ?, ?)').run(prId, headSha, inboxId, now());
    },

    latestReview(prId: string): ReviewRow | null {
      const row = db.prepare('SELECT * FROM reviews WHERE pr_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(prId) as Row | undefined;
      return row ? toReview(row) : null;
    },

    latestReviewsByPr(): Map<string, ReviewRow> {
      const rows = db
        .prepare(
          `SELECT r.* FROM reviews r
           JOIN (SELECT pr_id, MAX(created_at) AS created_at FROM reviews GROUP BY pr_id) latest
             ON latest.pr_id = r.pr_id AND latest.created_at = r.created_at`
        )
        .all() as Row[];
      return new Map(rows.map((row) => [String(row.pr_id), toReview(row)]));
    },

    hasReviewForHead(prId: string, headSha: string): boolean {
      return Boolean(db.prepare("SELECT 1 FROM reviews WHERE pr_id = ? AND head_sha = ? AND status != 'cancelled' LIMIT 1").get(prId, headSha));
    },

    setReviewStatus(id: string, status: ReviewStatus, error: string | null = null): void {
      const done = status === 'completed' || status === 'failed' || status === 'cancelled';
      db.prepare('UPDATE reviews SET status = ?, error = ?, completed_at = ? WHERE id = ?').run(status, error, done ? now() : null, id);
    },

    completeReview(id: string, input: { summary: string; consensusSummary: string | null; hasRequirements: boolean; scores: ReviewScores }): void {
      db.prepare(
        `UPDATE reviews SET status = 'completed', error = NULL, summary = ?, consensus_summary = ?, has_requirements = ?,
           risk_score = ?, coverage_score = ?, coverage_note = ?, requirements_score = ?, requirements_note = ?,
           simplicity_score = ?, simplicity_note = ?, stability_score = ?, stability_note = ?, completed_at = ?
         WHERE id = ?`
      ).run(input.summary, input.consensusSummary, input.hasRequirements ? 1 : 0, ...scoreParams(input.scores), now(), id);
    },

    /** Reviews left running when the plugin last stopped can never finish. */
    failInterruptedReviews(): number {
      const reason = 'Interrupted: CodeNod restarted while this review was running.';
      db.prepare("UPDATE review_runs SET status = 'failed', error = ?, completed_at = ? WHERE status IN ('queued', 'running')").run(reason, now());
      return db.prepare("UPDATE reviews SET status = 'failed', error = ?, completed_at = ? WHERE status IN ('queued', 'running')").run(reason, now()).changes;
    },

    createRun(input: { reviewId: string; providerId: string; model: string; reasoningLevel?: string }): ReviewRunRow {
      const id = newId();
      db.prepare(
        'INSERT INTO review_runs (id, review_id, provider_id, model, reasoning_level, status, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, input.reviewId, input.providerId, input.model, input.reasoningLevel ?? null, 'queued', now());
      return this.getRun(id)!;
    },

    getRun(id: string): ReviewRunRow | null {
      const row = db.prepare('SELECT * FROM review_runs WHERE id = ?').get(id) as Row | undefined;
      return row ? toRun(row) : null;
    },

    listRuns(reviewId: string): ReviewRunRow[] {
      return (db.prepare('SELECT * FROM review_runs WHERE review_id = ? ORDER BY started_at').all(reviewId) as Row[]).map(toRun);
    },

    updateRun(id: string, patch: { status?: ReviewStatus; threadId?: string; error?: string | null }): void {
      const current = this.getRun(id);
      if (!current) return;
      const status = patch.status ?? current.status;
      const done = status === 'completed' || status === 'failed' || status === 'cancelled';
      db.prepare('UPDATE review_runs SET status = ?, thread_id = ?, error = ?, completed_at = ? WHERE id = ?').run(
        status,
        patch.threadId ?? current.threadId,
        patch.error === undefined ? current.error : patch.error,
        done ? now() : null,
        id
      );
    },

    completeRun(id: string, input: { summary: string; issueCount: number; scores: ReviewScores }): void {
      db.prepare(
        `UPDATE review_runs SET status = 'completed', error = NULL, summary = ?, issue_count = ?, ${SCORE_COLUMNS
          .split(',')
          .map((column) => `${column.trim()} = ?`)
          .join(', ')}, completed_at = ? WHERE id = ?`
      ).run(input.summary, input.issueCount, ...scoreParams(input.scores), now(), id);
    },

    replaceFindings(reviewId: string, findings: Array<Omit<FindingRow, 'id' | 'reviewId' | 'postedAt' | 'dismissed'>>): void {
      db.transaction(() => {
        db.prepare('DELETE FROM findings WHERE review_id = ?').run(reviewId);
        const insert = db.prepare(
          `INSERT INTO findings (id, review_id, category, severity, file, line, description, suggestion, agreed_by, confidence)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const finding of findings) {
          insert.run(
            newId(),
            reviewId,
            finding.category,
            finding.severity,
            finding.file,
            finding.line,
            finding.description,
            finding.suggestion,
            JSON.stringify(finding.agreedBy),
            finding.confidence
          );
        }
      });
    },

    listFindings(reviewId: string): FindingRow[] {
      return (db.prepare('SELECT * FROM findings WHERE review_id = ?').all(reviewId) as Row[]).map(toFinding);
    },

    countUndismissedFindings(reviewIds: readonly string[]): Map<string, number> {
      const counts = new Map<string, number>();
      if (reviewIds.length === 0) return counts;
      const placeholders = reviewIds.map(() => '?').join(', ');
      const rows = db.prepare(`SELECT review_id, COUNT(*) AS n FROM findings WHERE dismissed = 0 AND review_id IN (${placeholders}) GROUP BY review_id`).all(...reviewIds) as Row[];
      for (const row of rows) counts.set(String(row.review_id), Number(row.n));
      return counts;
    },

    setFindingDismissed(id: string, dismissed: boolean): void {
      db.prepare('UPDATE findings SET dismissed = ? WHERE id = ?').run(dismissed ? 1 : 0, id);
    },

    editFinding(reviewId: string, id: string, description: string, suggestion: string | null): void {
      if (!description.trim()) throw new Error('Issue text is required');
      const row = db.prepare('SELECT * FROM findings WHERE id = ? AND review_id = ?').get(id, reviewId) as Row | undefined;
      if (!row) throw new Error('Finding not found in this review');
      if (row.posted_at !== null) throw new Error('Posted findings cannot be edited');
      db.prepare('UPDATE findings SET description = ?, suggestion = ? WHERE id = ? AND review_id = ?')
        .run(description.trim(), suggestion?.trim() ? suggestion : null, id, reviewId);
    },

    setFindingsDismissed(reviewId: string, ids: string[], dismissed: boolean): void {
      db.transaction(() => {
        const lookup = db.prepare('SELECT id FROM findings WHERE id = ? AND review_id = ?');
        for (const id of ids) {
          if (!lookup.get(id, reviewId)) throw new Error('Finding not found in this review');
        }
        const update = db.prepare('UPDATE findings SET dismissed = ? WHERE id = ? AND review_id = ?');
        for (const id of ids) update.run(dismissed ? 1 : 0, id, reviewId);
      });
    },

    markFindingsPosted(ids: readonly string[]): void {
      const stamp = now();
      db.transaction(() => {
        const update = db.prepare('UPDATE findings SET posted_at = ? WHERE id = ?');
        for (const id of ids) update.run(stamp, id);
      });
    },

    recordPostedReview(input: { reviewId: string; event: string; githubReviewId: number | null; url: string | null; commentCount: number }): void {
      db.prepare(
        'INSERT INTO posted_reviews (id, review_id, event, github_review_id, url, comment_count, posted_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(newId(), input.reviewId, input.event, input.githubReviewId, input.url, input.commentCount, now());
    },

    listPostedReviews(reviewId: string): Array<{ event: string; url: string | null; commentCount: number; postedAt: number }> {
      return (db.prepare('SELECT * FROM posted_reviews WHERE review_id = ? ORDER BY posted_at').all(reviewId) as Row[]).map((row) => ({
        event: String(row.event),
        url: str(row.url),
        commentCount: Number(row.comment_count),
        postedAt: Number(row.posted_at)
      }));
    }
  };
}

export type Store = ReturnType<typeof createStore>;
