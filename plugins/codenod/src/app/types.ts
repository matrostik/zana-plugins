import type { ModelChoice, RepoRow } from '../server/types.ts';
import type { HostStatus } from '../server/sync.ts';
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
}

export interface ConfigSnapshot {
  models: ModelChoice[];
  repos: RepoRow[];
  hosts: HostStatus[];
}

export interface AvailableProvider {
  providerId: string;
  displayName: string;
  error: string | null;
  models: Array<{ id: string; label: string; reasoningLevels: string[] }>;
}
