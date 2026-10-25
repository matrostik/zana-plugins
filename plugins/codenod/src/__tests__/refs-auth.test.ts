import { describe, expect, it } from 'vitest';
import { createTokenResolver, parseTokenSetting, type CommandRunner } from '../server/github/auth.ts';
import { apiBaseUrl, normalizeHost, parseHostList, parsePrRef, parseRepoRef, prId, repoFromRemoteUrl } from '../server/github/refs.ts';

describe('refs', () => {
  it('parses PR URLs, long ids, and shorthand', () => {
    expect(parsePrRef('https://github.com/acme/api/pull/42')).toEqual({ host: 'github.com', owner: 'acme', name: 'api', number: 42 });
    expect(parsePrRef('git.example.com/acme/api#7')).toEqual({ host: 'git.example.com', owner: 'acme', name: 'api', number: 7 });
    expect(parsePrRef('acme/api#9', 'git.example.com').host).toBe('git.example.com');
    expect(prId({ host: 'github.com', owner: 'acme', name: 'api', number: 42 })).toBe('github.com/acme/api#42');
  });

  it('rejects malformed references', () => {
    expect(() => parsePrRef('not a pr')).toThrow(/Cannot parse/);
    expect(() => parsePrRef('https://github.com/acme/a b/pull/1')).toThrow();
    expect(() => normalizeHost('bad host!')).toThrow(/Invalid GitHub host/);
  });

  it('parses repositories and remotes', () => {
    expect(parseRepoRef('acme/api')).toEqual({ host: 'github.com', owner: 'acme', name: 'api' });
    expect(parseRepoRef('https://git.example.com/acme/api.git')).toEqual({ host: 'git.example.com', owner: 'acme', name: 'api' });
    expect(repoFromRemoteUrl('git@git.example.com:acme/api.git')).toEqual({ host: 'git.example.com', owner: 'acme', name: 'api' });
    expect(repoFromRemoteUrl('https://user@github.com/acme/api')).toEqual({ host: 'github.com', owner: 'acme', name: 'api' });
    expect(repoFromRemoteUrl('/local/path')).toBeNull();
  });

  it('builds API base URLs for github.com and enterprise hosts', () => {
    expect(apiBaseUrl('github.com')).toBe('https://api.github.com');
    expect(apiBaseUrl('git.example.com')).toBe('https://git.example.com/api/v3');
    expect(parseHostList('git.example.com, https://ghe.corp/')).toEqual(['github.com', 'git.example.com', 'ghe.corp']);
  });
});

describe('token resolution', () => {
  it('parses the pasted token setting', () => {
    const tokens = parseTokenSetting('ghp_bare\ngit.example.com = tok2\n  \nbad host!=x');
    expect(tokens.get('github.com')).toBe('ghp_bare');
    expect(tokens.get('git.example.com')).toBe('tok2');
    expect(tokens.size).toBe(2);
  });

  it('prefers gh, then git credential, then the setting', async () => {
    const calls: string[] = [];
    const run: CommandRunner = async (command, args, options) => {
      calls.push(`${command} ${args.join(' ')}`);
      if (command === 'gh') return args.includes('github.com') ? 'gho_fromgh' : null;
      if (command === 'git') return options?.input?.includes('host=git.example.com') ? 'protocol=https\nhost=git.example.com\npassword=fromgit\n' : null;
      return null;
    };
    const resolver = createTokenResolver({ run, readTokenSetting: async () => 'other.host=fromsetting' });
    await expect(resolver.resolve('github.com')).resolves.toEqual({ token: 'gho_fromgh', source: 'gh' });
    await expect(resolver.resolve('git.example.com')).resolves.toEqual({ token: 'fromgit', source: 'git-credential' });
    await expect(resolver.resolve('other.host')).resolves.toEqual({ token: 'fromsetting', source: 'setting' });
    await expect(resolver.resolve('missing.host')).resolves.toBeNull();
    const before = calls.length;
    await resolver.resolve('github.com');
    expect(calls.length).toBe(before);
  });

  it('re-resolves after invalidation', async () => {
    let token = 'first';
    const resolver = createTokenResolver({ run: async (command) => (command === 'gh' ? token : null), readTokenSetting: async () => '' });
    expect((await resolver.resolve('github.com'))?.token).toBe('first');
    token = 'second';
    resolver.invalidate('github.com');
    expect((await resolver.resolve('github.com'))?.token).toBe('second');
  });
});
