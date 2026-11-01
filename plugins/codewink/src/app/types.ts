import type { LocalLocationSummary } from '../server/local/service.ts';
import type { LocalScope, ModelChoice, RepoRow } from '../server/types.ts';
import type { CodewinkSettings } from '../server/settings.ts';
import type { HostStatus, ViewerProfile } from '../server/sync.ts';
import type { PrListItem } from '../server/views.ts';

export interface Rpc {
  call(method: string, args?: unknown): Promise<unknown>;
}

export interface Overview {
  prs: PrListItem[];
  hosts: HostStatus[];
  syncing: boolean;
  lastSyncAt: number | null;
  autoSyncEnabled: boolean;
  activeReviews: number;
  hasModels: boolean;
  hasWatchedRepos: boolean;
  /** Present when the overview is scoped to a project: the GitHub repositories its remotes point at. */
  projectRepos?: ProjectRepoStatus[];
}

export interface ProjectRepoStatus {
  id: string;
  host: string;
  owner: string;
  name: string;
  watched: boolean;
}

export interface LocalOverview {
  locations: LocalLocationSummary[];
  scopes: LocalScope[];
  hasModels: boolean;
}

export interface ConfigSnapshot {
  models: ModelChoice[];
  repos: RepoRow[];
  hosts: HostStatus[];
  profiles: ViewerProfile[];
  settings: CodewinkSettings;
  defaultInstructions: string;
  builtInPrompt: string;
  maxInstructionsChars: number;
  limits: Record<NumericSetting, { min: number; max: number }>;
  workspaceModes: Array<CodewinkSettings['workspaceMode']>;
  projects: Array<{ id: string; name: string }>;
}

export type NumericSetting = 'syncIntervalMinutes' | 'maxConcurrentReviews' | 'reviewTimeoutMinutes';

export interface AvailableProvider {
  providerId: string;
  displayName: string;
  error: string | null;
  models: Array<{ id: string; label: string; reasoningLevels: string[] }>;
}
