import { DEFAULT_HOST, normalizeHost } from './github/refs.ts';
import { DEFAULT_REVIEW_INSTRUCTIONS, MAX_CUSTOM_INSTRUCTIONS_CHARS } from './review/prompts.ts';
import type { WorkspaceMode } from './review/service.ts';
import { asOptionalNumber, asRecord } from './util.ts';

export interface CodenodSettings {
  customInstructions: string;
  prompts: ReviewPrompt[];
  defaultPromptId: string | null;
  /** GitHub Enterprise hosts; github.com is always included and never stored. */
  githubHosts: string[];
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  maxConcurrentReviews: number;
  reviewTimeoutMinutes: number;
  workspaceMode: WorkspaceMode;
  fallbackProjectId: string | null;
  archiveReviewThreads: boolean;
  showReviewsOnAgentsBoard: boolean;
}

export interface ReviewPrompt { id: string; name: string; instructions: string }

type HostSettingValues = Record<string, string | number | boolean | undefined>;

interface KvLike {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export const SETTINGS_KEY = 'settings';
export const SETTINGS_MIGRATED_KEY = 'settingsMigrated';
export const WORKSPACE_MODES: WorkspaceMode[] = ['worktree', 'project', 'diff-only'];
export const SETTING_LIMITS = {
  syncIntervalMinutes: { min: 1, max: 120 },
  maxConcurrentReviews: { min: 1, max: 6 },
  reviewTimeoutMinutes: { min: 3, max: 90 }
} as const;
const MAX_HOSTS = 20;
/** IDs that prompt selectors and the CLI use as control values. */
const RESERVED_PROMPT_IDS: string[] = ['builtin', '__default', '__builtin'];

export const DEFAULT_SETTINGS: CodenodSettings = {
  customInstructions: DEFAULT_REVIEW_INSTRUCTIONS,
  prompts: [{ id: 'legacy', name: 'My review instructions', instructions: DEFAULT_REVIEW_INSTRUCTIONS }],
  defaultPromptId: 'legacy',
  githubHosts: [],
  autoSyncEnabled: true,
  syncIntervalMinutes: 5,
  maxConcurrentReviews: 2,
  reviewTimeoutMinutes: 20,
  workspaceMode: 'worktree',
  fallbackProjectId: null,
  archiveReviewThreads: true,
  showReviewsOnAgentsBoard: true
};

function clampInteger(value: number, limits: { min: number; max: number }): number {
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}

/** Throws on the first invalid host so the user sees which entry is wrong. */
export function sanitizeHosts(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\s,]+/) : [];
  const hosts = new Set<string>();
  for (const part of parts) {
    if (typeof part !== 'string' || !part.trim()) continue;
    const host = normalizeHost(part);
    if (host !== DEFAULT_HOST) hosts.add(host);
  }
  if (hosts.size > MAX_HOSTS) throw new Error(`At most ${MAX_HOSTS} GitHub Enterprise hosts are supported`);
  return [...hosts];
}

/** Applies a partial update on top of `base`, ignoring unknown keys and clamping numbers. */
export function applySettingsPatch(base: CodenodSettings, patch: unknown): CodenodSettings {
  const record = asRecord(patch);
  const next = { ...base, githubHosts: [...base.githubHosts], prompts: base.prompts.map((prompt) => ({ ...prompt })) };
  if (typeof record.customInstructions === 'string') {
    if (record.customInstructions.length > MAX_CUSTOM_INSTRUCTIONS_CHARS) {
      throw new Error(`Custom review instructions are limited to ${MAX_CUSTOM_INSTRUCTIONS_CHARS} characters`);
    }
    next.customInstructions = record.customInstructions.trim();
    if (!('prompts' in record)) {
      const selected = next.prompts.find((prompt) => prompt.id === next.defaultPromptId) ?? next.prompts.find((prompt) => prompt.id === 'legacy');
      if (selected) {
        selected.instructions = next.customInstructions;
      }
      else {
        next.prompts.push({ id: 'legacy', name: 'My review instructions', instructions: next.customInstructions });
      }
    }
  }
  if ('prompts' in record) {
    if (!Array.isArray(record.prompts)) throw new Error('Prompts must be an array');
    const ids = new Set<string>();
    next.prompts = record.prompts.map((item: unknown) => {
      const prompt = asRecord(item);
      if (typeof prompt.id !== 'string' || !prompt.id.trim() || ids.has(prompt.id)) throw new Error('Each prompt needs a unique ID');
      if (RESERVED_PROMPT_IDS.includes(prompt.id)) throw new Error(`Prompt ID ${prompt.id} is reserved`);
      if (typeof prompt.name !== 'string' || !prompt.name.trim()) throw new Error('Each prompt needs a name');
      if (typeof prompt.instructions !== 'string' || prompt.instructions.length > MAX_CUSTOM_INSTRUCTIONS_CHARS) throw new Error(`Custom review instructions are limited to ${MAX_CUSTOM_INSTRUCTIONS_CHARS} characters`);
      ids.add(prompt.id);
      return { id: prompt.id, name: prompt.name.trim(), instructions: prompt.instructions.trim() };
    });
  }
  if ('defaultPromptId' in record) {
    if (record.defaultPromptId !== null && typeof record.defaultPromptId !== 'string') throw new Error('Invalid default prompt');
    next.defaultPromptId = record.defaultPromptId as string | null;
  }
  if (next.defaultPromptId !== null && !next.prompts.some((prompt) => prompt.id === next.defaultPromptId)) throw new Error('Default prompt does not exist');
  next.customInstructions = next.prompts.find((prompt) => prompt.id === next.defaultPromptId)?.instructions ?? '';
  if ('githubHosts' in record) next.githubHosts = sanitizeHosts(record.githubHosts);
  if (typeof record.autoSyncEnabled === 'boolean') next.autoSyncEnabled = record.autoSyncEnabled;
  for (const key of Object.keys(SETTING_LIMITS) as Array<keyof typeof SETTING_LIMITS>) {
    const value = asOptionalNumber(record, key);
    if (value !== undefined) next[key] = clampInteger(value, SETTING_LIMITS[key]);
  }
  if (typeof record.workspaceMode === 'string' && WORKSPACE_MODES.includes(record.workspaceMode as WorkspaceMode)) {
    next.workspaceMode = record.workspaceMode as WorkspaceMode;
  }
  if ('fallbackProjectId' in record) {
    next.fallbackProjectId = typeof record.fallbackProjectId === 'string' && record.fallbackProjectId.trim() ? record.fallbackProjectId.trim() : null;
  }
  if (typeof record.archiveReviewThreads === 'boolean') next.archiveReviewThreads = record.archiveReviewThreads;
  if (typeof record.showReviewsOnAgentsBoard === 'boolean') next.showReviewsOnAgentsBoard = record.showReviewsOnAgentsBoard;
  return next;
}

/** Maps the legacy host plugin settings onto CodenodSettings; invalid hosts are dropped. */
export function settingsFromHostValues(values: HostSettingValues): CodenodSettings {
  const hosts: string[] = [];
  for (const part of String(values.githubHosts ?? '').split(/[\s,]+/)) {
    try {
      hosts.push(...sanitizeHosts([part]));
    } catch {
      // Skip malformed legacy entries rather than blocking startup.
    }
  }
  const legacyInstructions = String(values.customInstructions ?? '').trim().slice(0, MAX_CUSTOM_INSTRUCTIONS_CHARS);
  return applySettingsPatch(DEFAULT_SETTINGS, {
    customInstructions: legacyInstructions || DEFAULT_REVIEW_INSTRUCTIONS,
    githubHosts: [...new Set(hosts)],
    autoSyncEnabled: typeof values.autoSyncEnabled === 'boolean' ? values.autoSyncEnabled : true,
    syncIntervalMinutes: values.syncIntervalMinutes,
    maxConcurrentReviews: values.maxConcurrentReviews,
    reviewTimeoutMinutes: values.reviewTimeoutMinutes,
    workspaceMode: values.workspaceMode,
    fallbackProjectId: values.fallbackProject,
    archiveReviewThreads: values.archiveReviewThreads !== false,
    showReviewsOnAgentsBoard: values.showReviewsOnAgentsBoard !== false
  });
}

export function createSettingsStore(deps: { kv: KvLike; readHostValues: () => Promise<HostSettingValues> }) {
  let cached: CodenodSettings | null = null;
  let writeChain: Promise<void> = Promise.resolve();

  async function load(): Promise<CodenodSettings> {
    if (cached) return cached;
    const stored = await deps.kv.get(SETTINGS_KEY);
    if (stored && (await deps.kv.get(SETTINGS_MIGRATED_KEY))) {
      cached = applySettingsPatch(DEFAULT_SETTINGS, stored);
      return cached;
    }
    cached = settingsFromHostValues(await deps.readHostValues());
    await deps.kv.set(SETTINGS_KEY, cached);
    await deps.kv.set(SETTINGS_MIGRATED_KEY, true);
    return cached;
  }

  return {
    load,
    async update(patch: unknown): Promise<CodenodSettings> {
      const run = writeChain.then(async () => {
        const next = applySettingsPatch(await load(), patch);
        await deps.kv.set(SETTINGS_KEY, next);
        cached = next;
        return next;
      });
      writeChain = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    }
  };
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
