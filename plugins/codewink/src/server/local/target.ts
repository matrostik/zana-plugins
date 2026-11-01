import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import type { LocalScope, LocalTargetRow } from '../types.ts';

export const LOCAL_SCOPES: readonly LocalScope[] = ['uncommitted', 'staged', 'branch'];

export const SCOPE_TITLES: Record<LocalScope, string> = {
  uncommitted: 'Uncommitted changes',
  staged: 'Staged changes',
  branch: 'Branch changes'
};

export function localTargetId(projectId: string, worktreePath: string): string {
  return `local:${createHash('sha256').update(`${projectId}\0${worktreePath}`).digest('hex').slice(0, 20)}`;
}

export function isLocalScope(value: unknown): value is LocalScope {
  return LOCAL_SCOPES.includes(value as LocalScope);
}

export function localLabel(target: Pick<LocalTargetRow, 'worktreePath' | 'branch'>, scope?: LocalScope): string {
  return `${basename(target.worktreePath)} · ${target.branch ?? 'detached HEAD'}${scope ? ` (${scope})` : ''}`;
}
