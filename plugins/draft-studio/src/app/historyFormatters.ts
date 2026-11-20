import { findTargetLanguage } from '../shared/languages.ts';
import type { ActivitySource, HistoryEntry } from '../shared/protocol.ts';

const PRESET_LABELS: Record<string, string> = {
  improve: 'Improve writing',
  executive: 'Summarize',
  spec: 'Technical spec',
  custom: 'Custom',
  translate: 'Translate'
};

const TONE_LABELS: Record<string, string> = {
  standard: 'Standard',
  casual: 'Casual',
  conversational: 'Conversational',
  formal: 'Professional',
  technical: 'Technical',
  custom: 'Custom'
};

export const SOURCE_LABELS: Record<ActivitySource, string> = {
  composer: 'Composer',
  home: 'Home',
  studio: 'Draft Studio'
};

export const PROVIDER_LABELS: Record<string, string> = {
  system: 'Zana Voice',
  'local-whisper': 'Local Whisper',
  'google-gemini': 'Google Gemini',
  google: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  assistant: 'Zana Assistant'
};

function formatRefinementLabel(entry: HistoryEntry): string {
  if (entry.presetId === 'translate' || entry.targetLanguage) {
    const lang = entry.targetLanguage
      ? findTargetLanguage(entry.targetLanguage)?.label ?? entry.targetLanguage
      : null;
    return lang ? `Translate · ${lang}` : 'Translate';
  }
  const presetLabel = entry.presetId ? PRESET_LABELS[entry.presetId] : null;
  const toneLabel = entry.tone ? TONE_LABELS[entry.tone] ?? entry.tone : null;
  if (presetLabel === 'Improve writing' && toneLabel) return `Improve · ${toneLabel}`;
  if (presetLabel) return presetLabel;
  return toneLabel ? `Refinement · ${toneLabel}` : 'Refinement';
}

export function formatEntryKindLabel(entry: HistoryEntry): string {
  if (entry.kind === 'dictation') return 'Dictation';
  if (entry.kind === 'dictation_cleanup') {
    if (entry.presetId || entry.targetLanguage) {
      return `Dictation + ${formatRefinementLabel(entry)}`;
    }
    return 'Dictation + Cleanup';
  }
  return formatRefinementLabel(entry);
}

export function formatDuration(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function formatRelativeTime(createdAt: number, now = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  try {
    return new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return `${Math.floor(diffHours / 24)}d ago`;
  }
}

export function formatFullTimestamp(createdAt: number): string {
  try {
    return new Date(createdAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return String(createdAt);
  }
}

export function groupEntriesByDate(
  entries: HistoryEntry[],
  now = Date.now()
): Array<{ label: 'Today' | 'Yesterday' | 'Earlier'; entries: HistoryEntry[] }> {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  const buckets: Record<'Today' | 'Yesterday' | 'Earlier', HistoryEntry[]> = {
    Today: [],
    Yesterday: [],
    Earlier: []
  };

  for (const entry of entries) {
    if (entry.createdAt >= todayStart.getTime()) {
      buckets.Today.push(entry);
    } else if (entry.createdAt >= yesterdayStart.getTime()) {
      buckets.Yesterday.push(entry);
    } else {
      buckets.Earlier.push(entry);
    }
  }

  return (['Today', 'Yesterday', 'Earlier'] as const)
    .filter((label) => buckets[label].length > 0)
    .map((label) => ({ label, entries: buckets[label] }));
}

export function wordCharSummary(text: string): string {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  return `${words} words · ${text.length} chars`;
}
