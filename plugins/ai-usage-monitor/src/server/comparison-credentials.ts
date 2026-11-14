import { spawn } from 'node:child_process';
import { join } from 'node:path';

const STORAGE_KEY = 'comparison.credential.v1';
const SCHEME = 'windows-dpapi-current-user';
const ENCRYPTION_UNAVAILABLE = 'OS encryption is unavailable on this backend. No key was saved.';
const MAX_KEY_LENGTH = 4096;
const PROCESS_TIMEOUT_MS = 10_000;
const MAX_PROCESS_OUTPUT = 32_768;

export interface SecretProtector {
  available: boolean;
  encrypt(value: string): Promise<string>;
  decrypt(value: string): Promise<string>;
}

interface CredentialStorage {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

interface EncryptedCredential {
  scheme: typeof SCHEME;
  ciphertext: string;
}

function validateKey(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_KEY_LENGTH || !/^[\x21-\x7e]+$/.test(value)) {
    throw new Error('Enter a nonempty API key without whitespace (maximum 4096 characters).');
  }
  return value;
}

function requireEncryption(protector: SecretProtector) {
  if (!protector.available) throw new Error(ENCRYPTION_UNAVAILABLE);
}

function serialOperations() {
  let previous: Promise<unknown> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const next = previous.then(operation);
    // The caller receives the rejection; a failed operation must not poison subsequent writes.
    previous = next.catch(() => undefined);
    return next;
  };
}

async function encryptKey(protector: SecretProtector, value: string): Promise<EncryptedCredential> {
  requireEncryption(protector);
  try {
    const ciphertext = await protector.encrypt(value);
    if (!ciphertext || ciphertext === value) throw new Error('Invalid ciphertext');
    return { scheme: SCHEME, ciphertext };
  } catch {
    throw new Error('Could not encrypt the API key. The previous saved key was preserved.');
  }
}

async function unlockKey(protector: SecretProtector, record: EncryptedCredential): Promise<string> {
  requireEncryption(protector);
  try {
    if (record.scheme !== SCHEME || typeof record.ciphertext !== 'string') throw new Error('Invalid record');
    return validateKey(await protector.decrypt(record.ciphertext));
  } catch {
    throw new Error('Could not unlock the saved API key. Replace it on this Windows user account.');
  }
}

/** Backend-only vault. Never register read() as a renderer RPC. */
export function createComparisonCredentials(storage: CredentialStorage, protector: SecretProtector) {
  const serial = serialOperations();
  return {
    status: () => serial(async () => ({
      configured: Boolean(await storage.get<EncryptedCredential>(STORAGE_KEY)),
      encryptionAvailable: protector.available
    })),
    save: (value: unknown) => serial(async () => {
      const key = validateKey(value);
      await storage.set(STORAGE_KEY, await encryptKey(protector, key));
    }),
    read: () => serial(async (): Promise<string | null> => {
      const record = await storage.get<EncryptedCredential>(STORAGE_KEY);
      return record ? unlockKey(protector, record) : null;
    }),
    remove: () => serial(() => storage.delete(STORAGE_KEY))
  };
}

function dpapiScript(operation: 'Protect' | 'Unprotect'): string {
  return `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$inputBytes = [Convert]::FromBase64String([Console]::In.ReadToEnd().Trim())
$entropy = [Text.Encoding]::UTF8.GetBytes('zana:ai-usage-monitor:artificial-analysis:v1')
$result = [Security.Cryptography.ProtectedData]::${operation}($inputBytes, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Out.Write([Convert]::ToBase64String($result))`;
}

/** Fixed program, no shell interpolation; key material travels only over private process pipes. */
function runDpapi(operation: 'Protect' | 'Unprotect', input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const executable = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const encodedScript = Buffer.from(dpapiScript(operation), 'utf16le').toString('base64');
    const child = spawn(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encodedScript], {
      windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe']
    });
    let output = '';
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (success && output && /^[A-Za-z0-9+/=]+$/.test(output)) resolve(output);
      else reject(new Error('Windows credential encryption failed.'));
    };
    const timer = setTimeout(() => { child.kill(); finish(false); }, PROCESS_TIMEOUT_MS);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
      if (output.length > MAX_PROCESS_OUTPUT) { child.kill(); finish(false); }
    });
    // Never propagate OS diagnostics: they may include credential material.
    child.stderr.resume();
    child.on('error', () => finish(false));
    child.stdin.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
    child.stdin.end(input);
  });
}

/** Uses the same Windows DPAPI CurrentUser protection underlying Electron safeStorage. */
export function createDpapiProtector(platform: NodeJS.Platform = process.platform): SecretProtector {
  const available = platform === 'win32';
  return {
    available,
    encrypt: async (value) => {
      if (!available) throw new Error(ENCRYPTION_UNAVAILABLE);
      return runDpapi('Protect', Buffer.from(value, 'utf8').toString('base64'));
    },
    decrypt: async (value) => {
      if (!available) throw new Error(ENCRYPTION_UNAVAILABLE);
      return Buffer.from(await runDpapi('Unprotect', value), 'base64').toString('utf8');
    }
  };
}
