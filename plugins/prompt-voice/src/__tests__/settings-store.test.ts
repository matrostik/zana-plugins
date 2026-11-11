import { describe, expect, it } from 'vitest';
import { createSettingsStore } from '../server/settingsStore.ts';

describe('settings store', () => {
  it('migrates preferences without storing or returning API keys', async () => {
    const values = new Map<string, unknown>();
    const store = createSettingsStore({
      get: async (key) => values.get(key),
      set: async (key, value) => { values.set(key, value); }
    }, async () => ({ inputLanguage: 'de', openaiApiKey: 'secret' }));
    expect(await store.readPublic()).toMatchObject({ inputLanguage: 'de' });
    expect(JSON.stringify([...values.values()])).not.toContain('secret');
    expect(JSON.stringify(await store.readPublic())).not.toContain('secret');
    await store.update({ inputLanguage: 'en' });
    expect(await store.readEffective()).toMatchObject({ inputLanguage: 'en', openaiApiKey: 'secret' });
  });
});
