import { join } from 'node:path';

/**
 * Pinned downloads for the managed Local Whisper runtime and models.
 *
 * Every entry is fixed by URL, exact byte size, and SHA-256. Downloads are verified
 * against both before use, so the CDN a URL redirects to doesn't need to be trusted.
 * To update a pin, re-verify the hash and size from the upstream release and rerun the
 * native smoke tests recorded in the Local Whisper plan in the project library.
 */

/** whisper.cpp v1.9.5. Binaries are published on pre-release tag b5454, the same commit. */
export const WHISPER_CPP_VERSION = 'v1.9.5';
export const WHISPER_CPP_COMMIT = 'd1be6fde11ac6e0407606b4e42fe72d34add8037';
const RUNTIME_BASE_URL = 'https://github.com/ggml-org/whisper.cpp/releases/download/b5454';

/** Hugging Face commit of ggerganov/whisper.cpp the model URLs are pinned to. */
export const MODEL_REPO_REVISION = '5359861c739e955e79d9a303bcbc70fb988958b1';
const MODEL_BASE_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/${MODEL_REPO_REVISION}`;

export type RuntimePlatform = 'win32' | 'linux' | 'darwin';
export type RuntimeArch = 'x64' | 'arm64';

export interface PinnedFile {
  url: string;
  /** Exact size in bytes. A download of any other length is rejected. */
  size: number;
  /** Lowercase hex SHA-256. */
  sha256: string;
}

export interface RuntimeArtifact extends PinnedFile {
  platform: RuntimePlatform;
  arch: RuntimeArch;
  archive: 'zip' | 'tar.gz';
  /** Path of the server executable inside the archive, using forward slashes. */
  serverEntry: string;
  /** System requirements shown when the runtime fails to start. */
  requirements: string[];
  /**
   * True only after a native smoke test (start, transcribe, stop) on this target.
   * Unverified targets are not offered to users.
   */
  verified: boolean;
}

const WINDOWS_RUNTIME_REQUIREMENT = 'Microsoft Visual C++ 2015–2022 Redistributable';
const LINUX_RUNTIME_REQUIREMENTS = ['glibc 2.34 or later (for example Ubuntu 22.04+, Debian 12+)', 'OpenMP runtime libgomp1'];

export const RUNTIME_ARTIFACTS: readonly RuntimeArtifact[] = [
  {
    platform: 'win32',
    arch: 'x64',
    url: `${RUNTIME_BASE_URL}/whisper-bin-x64.zip`,
    size: 8_928_640,
    sha256: '6ba69e3482d7826214f90a6a9c84ca07782aec1e1d0c6a7c30c994fd5d816ccb',
    archive: 'zip',
    serverEntry: 'Release/whisper-server.exe',
    requirements: [WINDOWS_RUNTIME_REQUIREMENT],
    verified: true
  },
  {
    platform: 'win32',
    arch: 'arm64',
    url: `${RUNTIME_BASE_URL}/whisper-bin-win-cpu-arm64.zip`,
    size: 4_371_193,
    sha256: '28c37e7b598c3d9bbfef94f3bd67f2ee6f12b7c86f3da5edcf5e4308d615ff6d',
    archive: 'zip',
    serverEntry: 'Release/whisper-server.exe',
    requirements: [WINDOWS_RUNTIME_REQUIREMENT],
    verified: false
  },
  {
    platform: 'linux',
    arch: 'x64',
    url: `${RUNTIME_BASE_URL}/whisper-bin-ubuntu-x64.tar.gz`,
    size: 10_364_195,
    sha256: 'a72becf15d7917f990f6313867a52638b82b7f9ef237fb0c980dac56a135781c',
    archive: 'tar.gz',
    serverEntry: 'whisper-bin-ubuntu-x64/whisper-server',
    requirements: LINUX_RUNTIME_REQUIREMENTS,
    verified: true
  },
  {
    platform: 'linux',
    arch: 'arm64',
    url: `${RUNTIME_BASE_URL}/whisper-bin-ubuntu-arm64.tar.gz`,
    size: 4_608_377,
    sha256: '6b95ebfc60447df48e70ef00a73bdc3f41679ed2d01ef465827206a2ff325149',
    archive: 'tar.gz',
    serverEntry: 'whisper-bin-ubuntu-arm64/whisper-server',
    requirements: LINUX_RUNTIME_REQUIREMENTS,
    verified: false
  }
  // macOS: upstream publishes no server binary. A project-owned, signed build is required.
];

export type RuntimeSelection =
  | { ok: true; artifact: RuntimeArtifact }
  | { ok: false; reason: 'unsupported' | 'unverified'; message: string };

/**
 * Picks the runtime for this machine. Targets without a native smoke test are refused
 * unless `allowUnverified` is set (for development and CI only).
 */
export function selectRuntimeArtifact(
  target: { platform: string; arch: string },
  options: { allowUnverified?: boolean } = {}
): RuntimeSelection {
  const artifact = RUNTIME_ARTIFACTS.find((entry) => entry.platform === target.platform && entry.arch === target.arch);
  const label = `${platformLabel(target.platform)} ${target.arch}`;
  if (!artifact) {
    return { ok: false, reason: 'unsupported', message: `Local Whisper isn't available for ${label} yet.` };
  }
  if (!artifact.verified && !options.allowUnverified) {
    return { ok: false, reason: 'unverified', message: `Local Whisper hasn't been tested on ${label} yet.` };
  }
  return { ok: true, artifact };
}

function platformLabel(platform: string): string {
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  if (platform === 'linux') return 'Linux';
  return platform;
}

export interface ModelArtifact extends PinnedFile {
  id: string;
  label: string;
  fileName: string;
  /** Upstream estimate of memory needed while transcribing; omitted where upstream publishes none. */
  memoryEstimate?: string;
  recommended?: boolean;
}

/**
 * Multilingual models only. English-only `.en` variants are omitted until the UI can
 * offer them conditionally, because they cannot transcribe other languages.
 */
export const MODEL_CATALOG: readonly ModelArtifact[] = [
  model('tiny', 'Tiny', 77_691_713, 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21', '~273 MB'),
  model('base-q5_1', 'Base (compact)', 59_707_625, '422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898'),
  { ...model('base', 'Base', 147_951_465, '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe', '~388 MB'), recommended: true },
  model('small-q5_1', 'Small (compact)', 190_085_487, 'ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb'),
  model('small', 'Small', 487_601_967, '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b', '~852 MB'),
  model('medium', 'Medium', 1_533_763_059, '6c14d5adee5f86394037b4e4e8b59f1673b6cee10e3cf0b11bbdbee79c156208', '~2.1 GB')
];

function model(id: string, label: string, size: number, sha256: string, memoryEstimate?: string): ModelArtifact {
  const fileName = `ggml-${id}.bin`;
  return { id, label, fileName, url: `${MODEL_BASE_URL}/${fileName}`, size, sha256, memoryEstimate };
}

export function findModel(id: unknown): ModelArtifact | undefined {
  return MODEL_CATALOG.find((entry) => entry.id === id);
}

/**
 * Per-user, app-private folder for the runtime and models. The plugin SDK does not expose
 * a data directory, so this follows each OS's convention for application data.
 */
export function defaultInstallRoot(target: {
  platform: string;
  env: Record<string, string | undefined>;
  homeDir: string;
}): string {
  const { platform, env, homeDir } = target;
  if (platform === 'win32') return join(env.LOCALAPPDATA || join(homeDir, 'AppData', 'Local'), 'Zana', 'prompt-voice', 'local-whisper');
  if (platform === 'darwin') return join(homeDir, 'Library', 'Application Support', 'Zana', 'prompt-voice', 'local-whisper');
  return join(env.XDG_DATA_HOME || join(homeDir, '.local', 'share'), 'zana', 'prompt-voice', 'local-whisper');
}
