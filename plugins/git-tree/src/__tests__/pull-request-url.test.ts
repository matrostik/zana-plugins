import { describe, expect, it } from 'vitest';
import { buildPullRequestUrl } from '../server/git-actions.js';
import type { GitRemoteInfo, PullRequestConfig } from '../server/types.js';

const cfg = (overrides: Partial<PullRequestConfig> = {}): PullRequestConfig =>
  ({ provider: 'github', remoteName: 'origin', targetBranch: 'main', ...overrides }) as PullRequestConfig;

const remote = (name: string, url: string, pushUrl = ''): GitRemoteInfo =>
  ({ name, fetchUrl: url, pushUrl }) as GitRemoteInfo;

describe('buildPullRequestUrl', () => {
  it('returns null when there are no remotes', () => {
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg(), remotes: [] })).toBeNull();
  });

  it('prefers the configured remote, then origin, then the first remote', () => {
    const remotes = [remote('a', 'https://h.com/o/a.git'), remote('origin', 'https://h.com/o/origin.git')];
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg({ remoteName: 'a' }), remotes }))
      .toContain('h.com/o/a/');
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg({ remoteName: 'zzz' }), remotes }))
      .toContain('h.com/o/origin/');
    const onlyOther = [remote('x', 'https://h.com/o/x.git')];
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg({ remoteName: 'zzz' }), remotes: onlyOther }))
      .toContain('h.com/o/x/');
  });

  it('parses SSH, HTTPS, and ssh:// remote URLs, preferring the push URL', () => {
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg(), remotes: [remote('origin', 'x', 'git@github.com:o/r.git')] }))
      .toBe('https://github.com/o/r/compare/main...f?expand=1');
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg(), remotes: [remote('origin', 'https://github.com/o/r')] }))
      .toBe('https://github.com/o/r/compare/main...f?expand=1');
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg(), remotes: [remote('origin', 'ssh://git@github.com:22/o/r.git')] }))
      .toBe('https://github.com/o/r/compare/main...f?expand=1');
  });

  it('returns null for URLs it cannot parse', () => {
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg(), remotes: [remote('origin', 'file:///tmp/repo')] })).toBeNull();
  });

  it('builds GitLab, Bitbucket, and GitHub links, and detects hosts by name', () => {
    const remotes = [remote('origin', 'https://gitlab.acme.io/o/r.git')];
    expect(buildPullRequestUrl({ sourceBranch: 'feat x', config: cfg({ provider: 'gitlab' }), remotes }))
      .toBe('https://gitlab.acme.io/o/r/-/merge_requests/new?merge_request[source_branch]=feat%20x&merge_request[target_branch]=main');
    const bb = [remote('origin', 'https://bitbucket.org/o/r.git')];
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg({ provider: 'bitbucket' }), remotes: bb }))
      .toBe('https://bitbucket.org/o/r/pull-requests/new?source=f&dest=main&t=1');
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg({ provider: 'github' }), remotes: bb }))
      .toBe('https://bitbucket.org/o/r/pull-requests/new?source=f&dest=main&t=1');
  });

  it('uses a custom template with every placeholder, and falls back when the template is empty', () => {
    const remotes = [remote('origin', 'git@code.corp:team/tool.git')];
    const custom = cfg({ provider: 'custom', customUrlTemplate: 'https://$1/$2/$3/new/$4/into/$5' });
    expect(buildPullRequestUrl({ sourceBranch: 'a b', config: custom, remotes }))
      .toBe('https://code.corp/team/tool/new/a%20b/into/main');
    const noTemplate = cfg({ provider: 'custom', customUrlTemplate: '' });
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: noTemplate, remotes })).toBe('https://code.corp/team/tool/compare/main...f?expand=1');
  });

  it('defaults the target branch to main when none is configured', () => {
    const remotes = [remote('origin', 'https://github.com/o/r.git')];
    expect(buildPullRequestUrl({ sourceBranch: 'f', config: cfg({ targetBranch: '' }), remotes }))
      .toContain('compare/main...f');
  });
});
