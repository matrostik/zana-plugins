import type { PrRef, RepoRef } from '../types.ts';

export const DEFAULT_HOST = 'github.com';

const HOST_PATTERN = /^[a-z0-9.-]+(?::\d{1,5})?$/;
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

export function normalizeHost(raw: string): string {
  const host = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (host === 'www.github.com' || host === 'api.github.com') return DEFAULT_HOST;
  if (!HOST_PATTERN.test(host)) throw new Error(`Invalid GitHub host: ${raw}`);
  return host;
}

export function parseHostList(raw: string | undefined): string[] {
  const hosts = new Set<string>([DEFAULT_HOST]);
  for (const part of (raw ?? '').split(/[\s,]+/)) {
    if (part.trim()) hosts.add(normalizeHost(part));
  }
  return [...hosts];
}

export function apiBaseUrl(host: string): string {
  return host === DEFAULT_HOST ? 'https://api.github.com' : `https://${host}/api/v3`;
}

export function webBaseUrl(host: string): string {
  return `https://${host}`;
}

export function prId(ref: PrRef): string {
  return `${ref.host}/${ref.owner}/${ref.name}#${ref.number}`;
}

export function repoId(ref: RepoRef): string {
  return `${ref.host}/${ref.owner}/${ref.name}`;
}

function assertName(value: string, label: string): string {
  if (!NAME_PATTERN.test(value)) throw new Error(`Invalid ${label}: ${value}`);
  return value;
}

/**
 * Accepts `https://host/owner/repo/pull/12`, `host/owner/repo#12`, and
 * `owner/repo#12` (which resolves against `defaultHost`).
 */
export function parsePrRef(raw: string, defaultHost = DEFAULT_HOST): PrRef {
  const input = raw.trim();
  const urlMatch = input.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (urlMatch) {
    return {
      host: normalizeHost(urlMatch[1]),
      owner: assertName(urlMatch[2], 'owner'),
      name: assertName(urlMatch[3], 'repository'),
      number: Number(urlMatch[4])
    };
  }
  const shortMatch = input.match(/^(?:([^/\s#]+)\/)?([^/\s#]+)\/([^/\s#]+)#(\d+)$/);
  if (shortMatch) {
    return {
      host: shortMatch[1] ? normalizeHost(shortMatch[1]) : normalizeHost(defaultHost),
      owner: assertName(shortMatch[2], 'owner'),
      name: assertName(shortMatch[3], 'repository'),
      number: Number(shortMatch[4])
    };
  }
  throw new Error(`Cannot parse pull request reference "${raw}". Use a URL or owner/repo#123.`);
}

export function parsePrId(id: string): PrRef {
  return parsePrRef(id);
}

/** Accepts `host/owner/repo`, `owner/repo`, or a repository URL. */
export function parseRepoRef(raw: string, defaultHost = DEFAULT_HOST): RepoRef {
  const input = raw.trim().replace(/\.git$/, '').replace(/\/$/, '');
  const urlMatch = input.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (urlMatch) {
    return {
      host: normalizeHost(urlMatch[1]),
      owner: assertName(urlMatch[2], 'owner'),
      name: assertName(urlMatch[3], 'repository')
    };
  }
  const parts = input.split('/');
  if (parts.length === 3) {
    return { host: normalizeHost(parts[0]), owner: assertName(parts[1], 'owner'), name: assertName(parts[2], 'repository') };
  }
  if (parts.length === 2) {
    return { host: normalizeHost(defaultHost), owner: assertName(parts[0], 'owner'), name: assertName(parts[1], 'repository') };
  }
  throw new Error(`Cannot parse repository "${raw}". Use owner/repo or host/owner/repo.`);
}

const GIT_REMOTE_NAME = /^(?!.*\.\.)(?!\/)(?!.*\/$)[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/;

/** Git remote names that are safe to pass as a single `git fetch` argument. */
export function isGitRemoteName(name: string): boolean {
  return GIT_REMOTE_NAME.test(name);
}

/** Maps a git remote URL (https or ssh) to a repository identity, or null. */
export function repoFromRemoteUrl(remote: string): RepoRef | null {
  const trimmed = remote.trim().replace(/\.git$/, '');
  const https = trimmed.match(/^https?:\/\/(?:[^@/]+@)?([^/]+)\/([^/]+)\/([^/]+)$/);
  const sshUrl = trimmed.match(/^ssh:\/\/(?:[^@/]+@)?([^/]+)\/([^/]+)\/([^/]+)$/);
  const scp = trimmed.match(/^[^@/]+@([^:/]+):([^/]+)\/([^/]+)$/);
  const match = https ?? sshUrl ?? scp;
  if (!match) return null;
  try {
    return { host: normalizeHost(match[1]), owner: match[2], name: match[3] };
  } catch {
    return null;
  }
}
