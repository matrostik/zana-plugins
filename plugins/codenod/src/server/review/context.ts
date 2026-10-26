import type { GhComment, GhPull, GitHubClient } from '../github/client.ts';
import { repoId } from '../github/refs.ts';
import type { ChangedFile, PrRef } from '../types.ts';
import { prepareDiff } from './diff.ts';
import type { LinkedIssueContext, PriorComment, ReviewPromptContext, SpecFileContext } from './prompts.ts';
import { extractLinkedIssues, globMatcher, MAX_SPEC_FILES, referencedSpecPaths } from './requirements.ts';

export interface GatheredContext {
  pull: GhPull;
  files: ChangedFile[];
  prompt: Omit<ReviewPromptContext, 'customInstructions' | 'hasWorkspace'>;
}

function isBot(comment: GhComment): boolean {
  const login = comment.user?.login ?? '';
  return login.endsWith('[bot]') || login.endsWith('-bot') || Boolean(comment.performed_via_github_app);
}

function toPriorComment(comment: GhComment): PriorComment | null {
  if (!comment.body?.trim()) return null;
  return {
    author: comment.user?.login ?? 'unknown',
    file: comment.path ?? null,
    line: typeof comment.line === 'number' ? comment.line : null,
    body: comment.body,
    isBot: isBot(comment)
  };
}

export async function gatherReviewContext(github: GitHubClient, ref: PrRef, options: { specGlob: string | null }): Promise<GatheredContext> {
  const [pull, files, reviewComments, issueComments] = await Promise.all([
    github.getPull(ref),
    github.listFiles(ref),
    github.listReviewComments(ref).catch(() => [] as GhComment[]),
    github.listIssueComments(ref).catch(() => [] as GhComment[])
  ]);

  const linkedIssues = (
    await Promise.all(
      extractLinkedIssues(pull.body, ref, ref.number).map(async (link): Promise<LinkedIssueContext | null> => {
        try {
          const issue = await github.getIssue(link, link.number);
          if (issue.pull_request) return null;
          return {
            reference: `${link.owner}/${link.name}#${link.number}`,
            title: issue.title,
            body: issue.body,
            labels: issue.labels.map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean)
          };
        } catch {
          // Missing or inaccessible issues are skipped; the review continues without them.
          return null;
        }
      })
    )
  ).filter((issue): issue is LinkedIssueContext => issue !== null);

  let specFiles: SpecFileContext[] = [];
  if (options.specGlob?.trim()) {
    const matches = globMatcher(options.specGlob);
    const changed = files.filter((file) => file.status !== 'removed' && matches(file.path)).map((file) => file.path);
    const referenced = referencedSpecPaths(pull.body, matches);
    const paths = [...new Set([...changed, ...referenced])].slice(0, MAX_SPEC_FILES);
    specFiles = (
      await Promise.all(
        paths.map(async (path) => {
          const content = await github.getFileText(ref, path, pull.head.sha).catch(() => null);
          return content?.trim() ? { path, content } : null;
        })
      )
    ).filter((spec): spec is SpecFileContext => spec !== null);
  }

  const prepared = prepareDiff(files);
  const priorComments = [...issueComments, ...reviewComments]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(toPriorComment)
    .filter((comment): comment is PriorComment => comment !== null);

  return {
    pull,
    files,
    prompt: {
      repository: repoId(ref),
      prNumber: ref.number,
      prTitle: pull.title,
      prDescription: pull.body,
      author: pull.user?.login ?? 'unknown',
      headRef: pull.head.ref,
      baseRef: pull.base.ref,
      files: prepared.files,
      skippedFiles: prepared.skipped,
      linkedIssues,
      specFiles,
      priorComments
    }
  };
}
