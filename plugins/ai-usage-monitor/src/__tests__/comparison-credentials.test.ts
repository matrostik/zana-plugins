import { describe, expect, it } from 'vitest';
import { createComparisonCredentials, createDpapiProtector } from '../server/comparison-credentials.ts';

function memoryStorage() {
  const rows = new Map<string, unknown>();
  return {
    rows,
    get: async <T>(key: string) => rows.get(key) as T | undefined,
    set: async (key: string, value: unknown) => { rows.set(key, value); },
    delete: async (key: string) => { rows.delete(key); }
  };
}

const protector = {
  available: true,
  encrypt: async (key: string) => `protected:${Buffer.from(key).toString('base64')}`,
  decrypt: async (blob: string) => Buffer.from(blob.slice('protected:'.length), 'base64').toString()
};

describe('comparison credentials', () => {
  it('persists ciphertext and exposes only configured status', async () => {
    const storage = memoryStorage();
    const credentials = createComparisonCredentials(storage, protector);
    expect(await credentials.status()).toEqual({ configured: false, encryptionAvailable: true });
    await credentials.save('test-api-key');
    expect(JSON.stringify([...storage.rows.values()])).not.toContain('test-api-key');
    expect(await credentials.status()).toEqual({ configured: true, encryptionAvailable: true });
    expect(await credentials.read()).toBe('test-api-key');
    await credentials.remove();
    expect(await credentials.read()).toBeNull();
  });

  it('fails closed when OS encryption is unavailable', async () => {
    const storage = memoryStorage();
    const credentials = createComparisonCredentials(storage, { ...protector, available: false });
    await expect(credentials.save('secret-key')).rejects.toThrow('OS encryption');
    expect(storage.rows.size).toBe(0);
  });

  it('preserves the old key if encryption fails and never exposes the underlying error', async () => {
    const storage = memoryStorage();
    const good = createComparisonCredentials(storage, protector);
    await good.save('old-key');
    const failing = createComparisonCredentials(storage, {
      ...protector, encrypt: async () => { throw new Error('contains-new-key'); }
    });
    await expect(failing.save('new-key')).rejects.toThrow('Could not encrypt');
    expect(await good.read()).toBe('old-key');
  });

  it.each([null, {}, '', ' ', 'key\nother', 'x'.repeat(4097)])('rejects invalid IPC key input %j', async (value) => {
    const storage = memoryStorage();
    const credentials = createComparisonCredentials(storage, protector);
    await expect(credentials.save(value)).rejects.toThrow('API key');
    expect(storage.rows.size).toBe(0);
  });

  it('serializes replacement and removal in invocation order', async () => {
    const storage = memoryStorage();
    const credentials = createComparisonCredentials(storage, protector);
    await Promise.all([credentials.save('first'), credentials.remove(), credentials.save('last')]);
    expect(await credentials.read()).toBe('last');
  });

  it('rejects corrupt encrypted records and unavailable decryption without leaking data', async () => {
    const storage = memoryStorage();
    const credentials = createComparisonCredentials(storage, protector);
    await credentials.save('key');
    const failing = createComparisonCredentials(storage, {
      ...protector, decrypt: async () => { throw new Error('sensitive OS text'); }
    });
    await expect(failing.read()).rejects.toThrow('Could not unlock');
    const unavailable = createComparisonCredentials(storage, { ...protector, available: false });
    await expect(unavailable.read()).rejects.toThrow('OS encryption');
    await unavailable.remove();
    expect(await unavailable.status()).toEqual({ configured: false, encryptionAvailable: false });
  });
});

describe('Windows DPAPI', () => {
  it.skipIf(process.platform !== 'win32')('round-trips with the real current-user OS protector', async () => {
    const dpapi = createDpapiProtector();
    const key = 'synthetic-roundtrip-key';
    const encrypted = await dpapi.encrypt(key);
    expect(encrypted).not.toContain(key);
    expect(await dpapi.decrypt(encrypted)).toBe(key);
  }, 30_000);

  it('rejects unsupported platforms rather than falling back to plaintext', async () => {
    const unavailable = createDpapiProtector('linux');
    expect(unavailable.available).toBe(false);
    await expect(unavailable.encrypt('key')).rejects.toThrow('OS encryption');
  });
});
