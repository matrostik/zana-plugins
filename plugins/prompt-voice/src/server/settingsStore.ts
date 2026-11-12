const KEY = 'prompt-voice-preferences-v1';
const FIELDS = [
  'sttProvider',
  'sttModel',
  'llmProvider',
  'llmModel',
  'tone',
  'customPrompt',
  'dictionary',
  'inputLanguage'
] as const;
type Values = Record<string, unknown>;
type Store = { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<void> };

function preferences(value: unknown): Values {
  const source = value && typeof value === 'object' ? value as Values : {};
  return Object.fromEntries(FIELDS.filter((field) => typeof source[field] === 'string').map((field) => [field, source[field]]));
}

export function createSettingsStore(kv: Store, readHost: () => Promise<Values>) {
  let chain: Promise<unknown> = Promise.resolve();
  async function load(): Promise<Values> {
    const saved = await kv.get(KEY);
    if (saved && typeof saved === 'object') return preferences(saved);
    const initial = preferences(await readHost());
    await kv.set(KEY, initial);
    return initial;
  }
  return {
    async readPublic() { return load(); },
    async readEffective() { return { ...await readHost(), ...await load() }; },
    async update(patch: unknown) {
      const task = chain.then(async () => {
        const next = { ...await load(), ...preferences(patch) };
        await kv.set(KEY, next);
        return next;
      });
      chain = task.catch(() => undefined);
      return task;
    }
  };
}
