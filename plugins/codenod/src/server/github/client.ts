import type { ChangedFile, CiState, PrRef, RepoRef, ReviewEvent } from '../types.ts';
import { apiBaseUrl } from './refs.ts';
import type { TokenResolver } from './auth.ts';

export type FetchLike = (url: string, init: {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}) => Promise<{ ok: boolean; status: number; headers: { get(name: string): string | null }; text(): Promise<string> }>;

export class GitHubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'GitHubError';
  }
}

export interface GhUser {
  login: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface GhPull {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  draft?: boolean;
  merged?: boolean;
  user: GhUser | null;
  head: { sha: string; ref: string; repo: { full_name: string } | null };
  base: { ref: string; repo: { full_name: string } };
  updated_at: string;
}

export interface GhSearchItem {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  updated_at: string;
  draft?: boolean;
  user: GhUser | null;
}

export interface GhComment {
  id: number;
  user: GhUser | null;
  body: string;
  path?: string;
  line?: number | null;
  created_at: string;
  performed_via_github_app?: unknown;
}

export interface GhIssue {
  number: number;
  title: string;
  body: string | null;
  labels: Array<{ name: string } | string>;
  pull_request?: unknown;
}

export interface ReviewCommentInput {
  path: string;
  line: number;
  body: string;
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_FILE_PAGES = 10;
const MAX_COMMENT_PAGES = 3;
const PAGE_SIZE = 100;

export function createGitHubClient(tokens: TokenResolver, fetchImpl: FetchLike = fetch as unknown as FetchLike) {
  async function request<T>(host: string, method: string, path: string, body?: unknown): Promise<T> {
    const resolved = await tokens.resolve(host);
    if (!resolved) {
      throw new GitHubError(
        `No GitHub token for ${host}. Run "gh auth login --hostname ${host}" or paste a token in CodeNod settings.`,
        401
      );
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(`${apiBaseUrl(host)}${path}`, {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${resolved.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'zana-codenod',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
      const text = await response.text();
      if (!response.ok) {
        if (response.status === 401) tokens.invalidate(host);
        let message = text.slice(0, 300);
        try {
          message = String((JSON.parse(text) as { message?: string }).message ?? message);
        } catch {
          // Keep the raw text snippet.
        }
        if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
          message = `GitHub rate limit reached on ${host}. Try again later.`;
        }
        throw new GitHubError(`GitHub ${method} ${path} failed (${response.status}): ${message}`, response.status);
      }
      return (text ? JSON.parse(text) : null) as T;
    } catch (error) {
      if (error instanceof GitHubError) throw error;
      if (controller.signal.aborted) throw new GitHubError(`GitHub request to ${host} timed out`, 408);
      throw new GitHubError(`GitHub request to ${host} failed: ${error instanceof Error ? error.message : String(error)}`, 0);
    } finally {
      clearTimeout(timer);
    }
  }

  async function paginate<T>(host: string, path: string, maxPages: number): Promise<T[]> {
    const items: T[] = [];
    const separator = path.includes('?') ? '&' : '?';
    for (let page = 1; page <= maxPages; page++) {
      const batch = await request<T[]>(host, 'GET', `${path}${separator}per_page=${PAGE_SIZE}&page=${page}`);
      items.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }
    return items;
  }

  const repoPath = (ref: RepoRef) => `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.name)}`;

  async function listCheckRuns(ref: PrRef, sha: string): Promise<{ runs: Array<{ status: string; conclusion: string | null }>; truncated: boolean }> {
    const runs: Array<{ status: string; conclusion: string | null }> = [];
    for (let page = 1; page <= 10; page++) {
      const result = await request<{ total_count?: number; check_runs?: Array<{ status: string; conclusion: string | null }> }>(
        ref.host,
        'GET',
        `${repoPath(ref)}/commits/${encodeURIComponent(sha)}/check-runs?per_page=${PAGE_SIZE}&page=${page}`
      );
      const batch = result.check_runs ?? [];
      runs.push(...batch);
      if (batch.length < PAGE_SIZE) return { runs, truncated: false };
      if (typeof result.total_count === 'number' && runs.length >= result.total_count) return { runs, truncated: false };
    }
    return { runs, truncated: true };
  }

  return {
    async viewer(host: string): Promise<GhUser> {
      return request<GhUser>(host, 'GET', '/user');
    },

    async searchPullRequests(host: string, query: string, maxResults = 1000): Promise<{ items: GhSearchItem[]; complete: boolean }> {
      const items: GhSearchItem[] = [];
      let complete = true;
      const pageSize = Math.min(Math.max(1, maxResults), PAGE_SIZE);
      const maxPages = Math.min(10, Math.ceil(maxResults / pageSize));
      for (let page = 1; page <= maxPages; page++) {
        const perPage = Math.min(pageSize, maxResults - items.length);
        const result = await request<{ items?: GhSearchItem[]; incomplete_results?: boolean; total_count?: number }>(
          host,
          'GET',
          `/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${perPage}&page=${page}`
        );
        const batch = result.items ?? [];
        items.push(...batch);
        if (result.incomplete_results) complete = false;
        const reachedEnd = batch.length < perPage || (typeof result.total_count === 'number' && items.length >= result.total_count);
        if (reachedEnd || items.length >= maxResults) return { items: items.slice(0, maxResults), complete: complete && reachedEnd };
      }
      return { items: items.slice(0, maxResults), complete: false };
    },

    async getPull(ref: PrRef): Promise<GhPull> {
      return request<GhPull>(ref.host, 'GET', `${repoPath(ref)}/pulls/${ref.number}`);
    },

    async listFiles(ref: PrRef): Promise<ChangedFile[]> {
      const files = await paginate<{ filename: string; status: string; additions: number; deletions: number; patch?: string }>(
        ref.host,
        `${repoPath(ref)}/pulls/${ref.number}/files`,
        MAX_FILE_PAGES
      );
      return files.map((file) => ({
        path: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch ?? null
      }));
    },

    async listReviewComments(ref: PrRef): Promise<GhComment[]> {
      return paginate<GhComment>(ref.host, `${repoPath(ref)}/pulls/${ref.number}/comments?sort=created&direction=desc`, MAX_COMMENT_PAGES);
    },

    async listIssueComments(ref: PrRef): Promise<GhComment[]> {
      return paginate<GhComment>(ref.host, `${repoPath(ref)}/issues/${ref.number}/comments?sort=created&direction=desc`, MAX_COMMENT_PAGES);
    },

    async getIssue(repo: RepoRef, issueNumber: number): Promise<GhIssue> {
      return request<GhIssue>(repo.host, 'GET', `${repoPath(repo)}/issues/${issueNumber}`);
    },

    async getFileText(repo: RepoRef, path: string, gitRef: string): Promise<string | null> {
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      try {
        const file = await request<{ content?: string; encoding?: string; size?: number }>(
          repo.host,
          'GET',
          `${repoPath(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(gitRef)}`
        );
        if (!file?.content || file.encoding !== 'base64') return null;
        return Buffer.from(file.content, 'base64').toString('utf8');
      } catch (error) {
        if (error instanceof GitHubError && error.status === 404) return null;
        throw error;
      }
    },

    async ciState(ref: PrRef, sha: string): Promise<CiState> {
      const checks = await listCheckRuns(ref, sha);
      const status = await request<{ state: string; total_count: number }>(ref.host, 'GET', `${repoPath(ref)}/commits/${encodeURIComponent(sha)}/status`);
      if (checks.truncated) {
        const partial = combineCiState(checks.runs, status);
        return partial === 'failure' ? 'failure' : 'pending';
      }
      return combineCiState(checks.runs, status);
    },

    async createReview(
      ref: PrRef,
      input: { commitId: string; event: ReviewEvent; body: string; comments: ReviewCommentInput[] }
    ): Promise<{ id: number; html_url?: string }> {
      return request(ref.host, 'POST', `${repoPath(ref)}/pulls/${ref.number}/reviews`, {
        commit_id: input.commitId,
        event: input.event,
        body: input.body,
        comments: input.comments.map((comment) => ({ path: comment.path, line: comment.line, side: 'RIGHT', body: comment.body }))
      });
    }
  };
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;

const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure']);

export function combineCiState(
  checkRuns: Array<{ status: string; conclusion: string | null }>,
  status: { state: string; total_count: number }
): CiState {
  const hasStatuses = status.total_count > 0;
  if (checkRuns.length === 0 && !hasStatuses) return 'none';
  if (checkRuns.some((run) => run.conclusion && FAILED_CONCLUSIONS.has(run.conclusion))) return 'failure';
  if (hasStatuses && (status.state === 'failure' || status.state === 'error')) return 'failure';
  if (checkRuns.some((run) => run.status !== 'completed')) return 'pending';
  if (hasStatuses && status.state === 'pending') return 'pending';
  return 'success';
}

/** `https://api.github.com/repos/o/r` or `https://ghe/api/v3/repos/o/r` → `{ owner, name }`. */
export function repoFromRepositoryUrl(url: string): { owner: string; name: string } | null {
  const match = url.match(/\/repos\/([^/]+)\/([^/]+)$/);
  return match ? { owner: decodeURIComponent(match[1]), name: decodeURIComponent(match[2]) } : null;
}
