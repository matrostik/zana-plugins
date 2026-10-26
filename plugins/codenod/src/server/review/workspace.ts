import type { CommandRunner } from '../github/auth.ts';
import { isGitRemoteName } from '../github/refs.ts';

const FETCH_TIMEOUT_MS = 60_000;

/** Fetches `pull/N/head` from `remote` and returns `headSha` only when that ref is exactly the reviewed commit. */
export async function fetchPullRequestHead(run: CommandRunner, projectPath: string, remote: string, prNumber: number, headSha: string): Promise<string> {
  if (!isGitRemoteName(remote)) throw new Error(`Invalid git remote: ${remote}`);
  if (!Number.isInteger(prNumber) || prNumber <= 0) throw new Error(`Invalid pull request number: ${prNumber}`);
  if (!/^[0-9a-f]{7,64}$/i.test(headSha)) throw new Error(`Invalid pull request head: ${headSha}`);
  const ref = `refs/codenod/pr-${prNumber}`;
  const fetched = await run('git', ['-C', projectPath, 'fetch', remote, `pull/${prNumber}/head:${ref}`], { timeoutMs: FETCH_TIMEOUT_MS });
  if (fetched === null) throw new Error(`Could not fetch pull/${prNumber}/head from ${remote} into the project checkout`);
  const resolved = (await run('git', ['-C', projectPath, 'rev-parse', ref]))?.trim();
  if (resolved !== headSha) throw new Error(`Fetched pull/${prNumber}/head (${resolved ?? 'missing'}) does not match ${headSha}`);
  return headSha;
}
