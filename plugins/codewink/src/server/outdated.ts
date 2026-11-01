import type { Store } from './db.ts';
import type { PullRequestRow } from './types.ts';

/** Serializes delivery so overlapping syncs cannot send the same head twice. */
export function createOutdatedNotifier(deps: {
  store: Store;
  projectForPr(pr: PullRequestRow): Promise<string | null>;
  push(input: { projectId: string; comments: string }): Promise<{ id: string }>;
  warn(message: string): void;
}) {
  let pending = Promise.resolve();
  return function notify(prIds?: string[]): Promise<void> {
    pending = pending.then(async () => {
      try {
        const prs = prIds
          ? prIds.flatMap((id) => { const pr = deps.store.getPullRequest(id); return pr ? [pr] : []; })
          : deps.store.listPullRequests();
        for (const pr of prs) {
          const review = deps.store.latestCompletedReview(pr.id);
          if (pr.state !== 'open' || !review || !pr.headSha || review.headSha === pr.headSha || deps.store.hasOutdatedNotification(pr.id, pr.headSha)) continue;
          const projectId = await deps.projectForPr(pr);
          if (!projectId) continue;
          const result = await deps.push({
            projectId,
            comments: [
              `Review outdated — ${pr.owner}/${pr.repo}#${pr.number}: ${pr.title}`,
              `Reviewed commit ${review.headSha.slice(0, 7)}; current PR commit ${pr.headSha.slice(0, 7)}. Rerun the review in CodeWink to get up-to-date findings.`,
              pr.url
            ].join('\n')
          });
          deps.store.recordOutdatedNotification(pr.id, pr.headSha, result.id);
        }
      } catch (error) {
        deps.warn(`codewink: outdated notification batch failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    return pending;
  };
}
