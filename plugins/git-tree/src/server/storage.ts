import type { PluginKvStorage } from '@zana-ai/zcc-plugin-sdk/server';
import type {
  CodeReviewRecord,
  GitGraphColumnWidths,
  GitGraphGlobalSettings,
  RepoSettings
} from './types.js';

export const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const DEFAULT_COLUMN_WIDTHS: GitGraphColumnWidths = {
  date: 125,
  author: 130,
  commit: 74
};

export const DEFAULT_GRAPH_COLORS = [
  '#0085d9',
  '#d9008f',
  '#00d90a',
  '#d98500',
  '#a300d9',
  '#ff0000',
  '#00d9cc',
  '#e138e8',
  '#85d900',
  '#dc5b23',
  '#6f24d6',
  '#ffcc00'
];

export const DEFAULT_GLOBAL_SETTINGS: GitGraphGlobalSettings = {
  graphStyle: 'rounded',
  initialLoadCommits: 300,
  loadMoreCommits: 100,
  muteNonAncestors: false,
  muteMergeCommits: true,
  commitDetailsLocation: 'docked',
  fileViewType: 'tree',
  compactFolders: true,
  diffViewMode: 'unified',
  maxDepthOfRepoSearch: 2,
  dateType: 'author',
  dateFormat: 'relative',
  fetchAndPrune: false,
  fetchAndPruneTags: false,
  signCommits: false,
  signTags: false,
  useMailmap: true,
  graphColors: DEFAULT_GRAPH_COLORS,
  columnWidths: DEFAULT_COLUMN_WIDTHS
};

export const DEFAULT_REPO_SETTINGS: RepoSettings = {
  selectedBranches: [],
  showRemoteBranches: true,
  showStashes: true,
  showTags: true,
  showUncommittedChanges: true,
  showUntrackedFiles: true,
  onlyFollowFirstParent: false,
  commitOrdering: 'date',
  issueLinkingRules: [],
  pullRequestConfig: {
    provider: 'github',
    remoteName: 'origin',
    targetBranch: 'main'
  }
};

function repoSettingsKey(projectId: string, subRepoRelPath: string): string {
  return `repo-settings:${projectId}:${subRepoRelPath || 'root'}`;
}

function codeReviewKey(projectId: string, subRepoRelPath: string, fromHash: string | null, toHash: string): string {
  return `code-review:${projectId}:${subRepoRelPath || 'root'}:${fromHash || 'single'}:${toHash}`;
}

export class GitGraphStorage {
  constructor(
    private readonly kv: PluginKvStorage,
    private readonly now: () => number = () => Date.now()
  ) {}

  async getRepoSettings(projectId: string, subRepoRelPath = ''): Promise<RepoSettings> {
    const stored = await this.kv.get<Partial<RepoSettings>>(repoSettingsKey(projectId, subRepoRelPath));
    if (!stored || typeof stored !== 'object') {
      return {
        ...DEFAULT_REPO_SETTINGS,
        pullRequestConfig: { ...DEFAULT_REPO_SETTINGS.pullRequestConfig }
      };
    }
    return {
      ...DEFAULT_REPO_SETTINGS,
      ...stored,
      selectedBranches: Array.isArray(stored.selectedBranches) ? stored.selectedBranches : [],
      issueLinkingRules: Array.isArray(stored.issueLinkingRules) ? stored.issueLinkingRules : [],
      pullRequestConfig: {
        ...DEFAULT_REPO_SETTINGS.pullRequestConfig,
        ...(stored.pullRequestConfig ?? {})
      }
    };
  }

  async saveRepoSettings(
    projectId: string,
    subRepoRelPath: string,
    patch: Partial<RepoSettings>
  ): Promise<RepoSettings> {
    const current = await this.getRepoSettings(projectId, subRepoRelPath);
    const updated: RepoSettings = {
      ...current,
      ...patch,
      pullRequestConfig: {
        ...current.pullRequestConfig,
        ...(patch.pullRequestConfig ?? {})
      }
    };
    await this.kv.set(repoSettingsKey(projectId, subRepoRelPath), updated);
    return updated;
  }

  async getCodeReview(args: {
    projectId: string;
    subRepoRelPath: string;
    fromHash: string | null;
    toHash: string;
  }): Promise<CodeReviewRecord | null> {
    const key = codeReviewKey(args.projectId, args.subRepoRelPath, args.fromHash, args.toHash);
    const record = await this.kv.get<CodeReviewRecord>(key);
    if (!record) return null;
    if (this.now() - record.lastActiveAt > NINETY_DAYS_MS) {
      await this.kv.delete(key);
      return null;
    }
    return record;
  }

  async startCodeReview(args: {
    projectId: string;
    subRepoRelPath: string;
    fromHash: string | null;
    toHash: string;
  }): Promise<CodeReviewRecord> {
    const key = codeReviewKey(args.projectId, args.subRepoRelPath, args.fromHash, args.toHash);
    const existing = await this.getCodeReview(args);
    if (existing) return existing;
    const now = this.now();
    const record: CodeReviewRecord = {
      key,
      projectId: args.projectId,
      subRepoRelPath: args.subRepoRelPath,
      fromHash: args.fromHash,
      toHash: args.toHash,
      reviewedFiles: [],
      startedAt: now,
      lastActiveAt: now
    };
    await this.kv.set(key, record);
    return record;
  }

  async setCodeReviewFileReviewed(args: {
    projectId: string;
    subRepoRelPath: string;
    fromHash: string | null;
    toHash: string;
    filePath: string;
    reviewed: boolean;
  }): Promise<CodeReviewRecord> {
    const current = (await this.getCodeReview(args)) ?? (await this.startCodeReview(args));
    const set = new Set(current.reviewedFiles);
    if (args.reviewed) {
      set.add(args.filePath);
    } else {
      set.delete(args.filePath);
    }
    const updated: CodeReviewRecord = {
      ...current,
      reviewedFiles: [...set],
      lastActiveAt: this.now()
    };
    await this.kv.set(current.key, updated);
    return updated;
  }

  async endCodeReview(args: {
    projectId: string;
    subRepoRelPath: string;
    fromHash: string | null;
    toHash: string;
  }): Promise<void> {
    const key = codeReviewKey(args.projectId, args.subRepoRelPath, args.fromHash, args.toHash);
    await this.kv.delete(key);
  }

  async listProjectCodeReviews(projectId: string): Promise<CodeReviewRecord[]> {
    const prefix = `code-review:${projectId}:`;
    const keys = await this.kv.list(prefix);
    const records: CodeReviewRecord[] = [];
    const now = this.now();
    for (const key of keys) {
      const record = await this.kv.get<CodeReviewRecord>(key);
      if (!record) continue;
      if (now - record.lastActiveAt > NINETY_DAYS_MS) {
        await this.kv.delete(key);
        continue;
      }
      records.push(record);
    }
    return records.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }
}
