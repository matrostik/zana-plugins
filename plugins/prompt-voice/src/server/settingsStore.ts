const KEY = 'prompt-voice-preferences-v1';
const FIELDS = [
  'sttProvider',
  'sttModel',
  'llmProvider',
  'llmModel',
  'tone',
  'customPrompt',
  'dictionary',
  'inputLanguage',
  'micDeviceId',
  'micLabel',
  'soundCuesEnabled',
  'soundCuesVolume',
  'historyEnabled',
  'historyMaxEntries',
  'historyMaxDays'
] as const;
type Values = Record<string, unknown>;
type Store = { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<void> };

function preferences(value: unknown): Values {
  const source = value && typeof value === 'object' ? value as Values : {};
  const entries: Array<[string, string]> = [];
  for (const field of FIELDS) {
    const raw = source[field];
    if (typeof raw === 'string') {
      entries.push([field, raw]);
    } else if (
      ((field === 'soundCuesEnabled' || field === 'historyEnabled') && typeof raw === 'boolean') ||
      ((field === 'soundCuesVolume' || field === 'historyMaxEntries' || field === 'historyMaxDays') &&
        typeof raw === 'number' &&
        Number.isFinite(raw))
    ) {
      entries.push([field, String(raw)]);
    }
  }
  return Object.fromEntries(entries);
}

export function createSettingsStore(kv: Store, readHost: () => Promise<Values>) {
  let chain: Promise<unknown> = Promise.resolve();
  async function load(): Promise<Values> {
    const saved = await kv.get(KEY);
    if (saved && typeof saved === 'object') {
      const clean = preferences(saved);
      // Remove credentials persisted by older versions, not just from the response.
      if (Object.keys(saved).some((field) => !(field in clean))) await kv.set(KEY, clean);
      return clean;
    }
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
