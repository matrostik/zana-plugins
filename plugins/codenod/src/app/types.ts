import type { ModelChoice, RepoRow } from '../server/types.ts';
import type { CodenodSettings } from '../server/settings.ts';
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
  activeReviews: number;
  hasModels: boolean;
  hasWatchedRepos: boolean;
}

export interface ConfigSnapshot {
  models: ModelChoice[];
  repos: RepoRow[];
  hosts: HostStatus[];
  profiles: ViewerProfile[];
  settings: CodenodSettings;
  defaultInstructions: string;
  builtInPrompt: string;
  maxInstructionsChars: number;
  limits: Record<NumericSetting, { min: number; max: number }>;
  workspaceModes: Array<CodenodSettings['workspaceMode']>;
  projects: Array<{ id: string; name: string }>;
}

export type NumericSetting = 'syncIntervalMinutes' | 'maxConcurrentReviews' | 'reviewTimeoutMinutes';

export interface AvailableProvider {
  providerId: string;
  displayName: string;
  error: string | null;
  models: Array<{ id: string; label: string; reasoningLevels: string[] }>;
}
