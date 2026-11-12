import { describe, expect, it } from 'vitest';
import {
  defaultInstallRoot,
  findModel,
  MODEL_CATALOG,
  RUNTIME_ARTIFACTS,
  selectRuntimeArtifact
} from '../server/localWhisper/artifacts.ts';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

describe('pinned artifacts', () => {
  it('pins every download to https, an exact size, and a SHA-256', () => {
    for (const entry of [...RUNTIME_ARTIFACTS, ...MODEL_CATALOG]) {
      expect(new URL(entry.url).protocol).toBe('https:');
      expect(entry.url).not.toMatch(/\/(main|latest)\//);
      expect(Number.isInteger(entry.size) && entry.size > 0).toBe(true);
      expect(entry.sha256).toMatch(SHA256_PATTERN);
    }
  });

  it('has one runtime per platform and architecture, with a relative server entry', () => {
    const keys = RUNTIME_ARTIFACTS.map((entry) => `${entry.platform}-${entry.arch}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of RUNTIME_ARTIFACTS) {
      expect(entry.serverEntry).not.toMatch(/^[\/]|\.\./);
      expect(entry.serverEntry).toMatch(/whisper-server(\.exe)?$/);
    }
  });

  it('offers only multilingual models with unique ids and a single recommendation', () => {
    const ids = MODEL_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.endsWith('.en'))).toBe(false);
    expect(MODEL_CATALOG.filter((entry) => entry.recommended).map((entry) => entry.id)).toEqual(['base']);
    expect(findModel('base')?.fileName).toBe('ggml-base.bin');
    expect(findModel('../etc/passwd')).toBeUndefined();
    expect(findModel(undefined)).toBeUndefined();
  });
});

describe('selectRuntimeArtifact', () => {
  it('selects natively verified targets', () => {
    for (const target of [{ platform: 'win32', arch: 'x64' }, { platform: 'linux', arch: 'x64' }]) {
      const selection = selectRuntimeArtifact(target);
      expect(selection.ok && selection.artifact.verified).toBe(true);
    }
  });

  it('refuses unverified targets unless explicitly allowed', () => {
    const refused = selectRuntimeArtifact({ platform: 'linux', arch: 'arm64' });
    expect(refused).toMatchObject({ ok: false, reason: 'unverified', message: expect.stringContaining('Linux arm64') });
    expect(selectRuntimeArtifact({ platform: 'linux', arch: 'arm64' }, { allowUnverified: true }).ok).toBe(true);
  });

  it('reports macOS and unknown targets as unsupported, even when unverified builds are allowed', () => {
    expect(selectRuntimeArtifact({ platform: 'darwin', arch: 'arm64' }, { allowUnverified: true })).toMatchObject({
      ok: false,
      reason: 'unsupported',
      message: expect.stringContaining('macOS arm64')
    });
    expect(selectRuntimeArtifact({ platform: 'freebsd', arch: 'x64' })).toMatchObject({ ok: false, reason: 'unsupported' });
    expect(selectRuntimeArtifact({ platform: 'win32', arch: 'ia32' })).toMatchObject({ ok: false, reason: 'unsupported' });
  });
});

describe('defaultInstallRoot', () => {
  // node:path joins with the host separator; compare with forward slashes on every OS.
  const norm = (path: string) => path.split('\\').join('/');

  it('uses LOCALAPPDATA on Windows, with a fallback under the home folder', () => {
    expect(norm(defaultInstallRoot({ platform: 'win32', env: { LOCALAPPDATA: '/home-r/AppData/Local' }, homeDir: '/home-r' }))).toBe(
      '/home-r/AppData/Local/Zana/prompt-voice/local-whisper'
    );
    expect(norm(defaultInstallRoot({ platform: 'win32', env: {}, homeDir: '/home-r' }))).toBe('/home-r/AppData/Local/Zana/prompt-voice/local-whisper');
  });

  it('uses Application Support on macOS', () => {
    expect(norm(defaultInstallRoot({ platform: 'darwin', env: {}, homeDir: '/Users/r' }))).toBe(
      '/Users/r/Library/Application Support/Zana/prompt-voice/local-whisper'
    );
  });

  it('uses XDG_DATA_HOME on Linux, defaulting to ~/.local/share', () => {
    expect(norm(defaultInstallRoot({ platform: 'linux', env: { XDG_DATA_HOME: '/data' }, homeDir: '/home/r' }))).toBe('/data/zana/prompt-voice/local-whisper');
    expect(norm(defaultInstallRoot({ platform: 'linux', env: {}, homeDir: '/home/r' }))).toBe('/home/r/.local/share/zana/prompt-voice/local-whisper');
  });
});
