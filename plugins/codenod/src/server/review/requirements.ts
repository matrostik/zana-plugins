import type { RepoRef } from '../types.ts';

export const MAX_LINKED_ISSUES = 3;
export const MAX_SPEC_FILES = 3;
export const MAX_ISSUE_BODY_CHARS = 2_000;
export const MAX_SPEC_CHARS = 4_000;

export interface IssueLink extends RepoRef {
  number: number;
}

/**
 * Finds issues referenced by a PR description: closing keywords first, then
 * `#123`, `owner/repo#123`, and issue URLs on the same host.
 */
export function extractLinkedIssues(body: string | null, repo: RepoRef, prNumber: number): IssueLink[] {
  if (!body) return [];
  const links: IssueLink[] = [];
  const seen = new Set<string>([`${repo.owner}/${repo.name}#${prNumber}`.toLowerCase()]);
  const add = (owner: string, name: string, number: number) => {
    const key = `${owner}/${name}#${number}`.toLowerCase();
    if (seen.has(key) || links.length >= MAX_LINKED_ISSUES) return;
    seen.add(key);
    links.push({ host: repo.host, owner, name, number });
  };

  const hostPattern = repo.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reference = `(?:https?://${hostPattern}/([\\w.-]+)/([\\w.-]+)/issues/(\\d+)|([\\w.-]+)/([\\w.-]+)#(\\d+)|#(\\d+))`;
  const closing = new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\b:?\\s+${reference}`, 'gi');
  const any = new RegExp(reference, 'gi');

  const collect = (match: RegExpExecArray) => {
    if (match[3]) add(match[1], match[2], Number(match[3]));
    else if (match[6]) add(match[4], match[5], Number(match[6]));
    else if (match[7]) add(repo.owner, repo.name, Number(match[7]));
  };
  for (const match of body.matchAll(closing)) collect(match);
  for (const match of body.matchAll(any)) collect(match);
  return links;
}

/** Converts a small glob (`**`, `*`, `?`, comma-separated alternatives) to a matcher. */
export function globMatcher(pattern: string | null | undefined): (path: string) => boolean {
  const parts = (pattern ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return () => false;
  const regexes = parts.map((part) => {
    let source = '';
    for (let index = 0; index < part.length; index++) {
      const char = part[index];
      if (char === '*' && part[index + 1] === '*') {
        source += part[index + 2] === '/' ? '(?:.*/)?' : '.*';
        index += part[index + 2] === '/' ? 2 : 1;
      } else if (char === '*') {
        source += '[^/]*';
      } else if (char === '?') {
        source += '[^/]';
      } else {
        source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      }
    }
    return new RegExp(`^${source}$`);
  });
  return (path) => regexes.some((regex) => regex.test(path));
}

/** Paths in the PR description that look like files matching the spec glob. */
export function referencedSpecPaths(body: string | null, matches: (path: string) => boolean): string[] {
  if (!body) return [];
  const candidates = body.match(/[\w./-]+\.[A-Za-z0-9]{1,8}/g) ?? [];
  return [...new Set(candidates.map((candidate) => candidate.replace(/^\.\//, '')))].filter(matches);
}
