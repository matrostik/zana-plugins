import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StudioSettings } from './StudioSettings.tsx';
import { HistoryView } from './HistoryView.tsx';
import type { PluginDetachedTabProps } from '@zana-ai/zcc-plugin-sdk/app';
import {
  AVAILABLE_MODELS_METHOD,
  MODELS_UPDATED_EVENT,
  PROMPT_STUDIO_HISTORY_SUBPATH,
  REPHRASE_METHOD,
  SETTINGS_GET_METHOD,
  SETTINGS_UPDATE_METHOD,
  STATUS_METHOD,
  TRANSCRIBE_METHOD,
  resolveAvailableSttProviders,
  type AvailableModelsResponse,
  type DiscoveredProvider,
  type HistoryEntry,
  type ImproveToneId,
  type RephraseResponse,
  type StatusResponse,
  type ToneId,
  type TranscribeResponse
} from '../shared/protocol.ts';
import { appendTranscript } from './appendText.ts';
import { copyToClipboard } from './clipboard.ts';
import { DEFAULT_MIC_DEVICE_ID, type AudioPreferences } from '../shared/audioPreferences.ts';
import { DEFAULT_TARGET_LANGUAGE, TARGET_LANGUAGE_OPTIONS, findTargetLanguage } from '../shared/languages.ts';
import { sortModelsCheapestFirst } from '../shared/modelSorting.ts';
import { readCachedAudioPreferences, writeCachedAudioPreferences } from './audioPreferencesStorage.ts';
import {
  consumePendingStudioTab,
  subscribeStudioTabRequests,
  type StudioTabId
} from './historyNavigation.ts';
import { ensureStylesInjected } from './injectStyles.ts';
import { defaultStartSession, type RecordingSession, type StartRecordingOptions } from './recorder.ts';
import {
  updatePluginSettings,
  usePromptVoiceRpc,
  useSafeComposer,
  useSafeComposerView,
  useSafeRealtime,
  useSafeZccContext,
  useSafeZccNavigate,
  useVisibilitySettings
} from './safeSdk.ts';
import { playSoundCue } from './soundCues.ts';
import { prepareAudioForUpload } from './wav.ts';
import { computeWordDiff, type DiffToken } from './textDiff.ts';
import { resolveDictationScope } from './useDictation.ts';

// ─── Inline CSS Styles for Native Look & Feel ──────────────────────────────────
export const PROMPT_STUDIO_STYLES = `
  .ps-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--bg-base, #121417);
    color: var(--text-primary, #e2e8f0);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    overflow: hidden;
    box-sizing: border-box;
    --ps-border: var(--border, #2a2e37);
    --ps-panel-bg: var(--bg-panel, #181b20);
    --ps-input-bg: var(--bg-input, #0f1115);
    --ps-accent: var(--accent, #3b82f6);
    --ps-accent-hover: var(--accent-hover, #2563eb);
    --ps-text-muted: var(--text-muted, #94a3b8);
    --ps-text-subtle: var(--text-subtle, #64748b);
  }

  .ps-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--ps-border);
    background-color: var(--ps-panel-bg);
    flex-shrink: 0;
    gap: 12px;
  }

  .ps-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .ps-header-nav {
    display: inline-flex;
    align-items: center;
    background: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .ps-header-tab {
    border: none;
    background: transparent;
    color: var(--ps-text-muted);
    font-size: 12px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .ps-header-tab:hover {
    color: var(--text-primary, #e2e8f0);
  }
  .ps-header-tab.active {
    background: rgba(59, 130, 246, 0.22);
    color: var(--text-primary, #e2e8f0);
    font-weight: 600;
  }

  .ps-header-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #e2e8f0);
    letter-spacing: -0.2px;
  }

  .ps-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(59, 130, 246, 0.15);
    color: var(--ps-accent);
    font-weight: 500;
  }

  .ps-badge-project {
    background: rgba(34, 197, 94, 0.14);
    color: #86efac;
  }

  .ps-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ps-overwrite-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 16px;
    background: rgba(59, 130, 246, 0.12);
    border-bottom: 1px solid rgba(59, 130, 246, 0.35);
    font-size: 12px;
    flex-shrink: 0;
  }

  .ps-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    color: var(--text-primary, #e2e8f0);
    transition: background 0.15s, border-color 0.15s;
    user-select: none;
  }
  .ps-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--text-subtle, #64748b);
  }
  .ps-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ps-btn-primary {
    background: var(--ps-accent);
    color: #ffffff;
    border-color: var(--ps-accent);
  }
  .ps-btn-primary:hover:not(:disabled) {
    background: var(--ps-accent-hover);
    border-color: var(--ps-accent-hover);
  }

  .ps-btn-danger {
    color: #f87171;
  }
  .ps-btn-danger:hover:not(:disabled) {
    background: rgba(248, 113, 113, 0.1);
    border-color: #f87171;
  }

  .ps-workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .ps-sidebar {
    width: 280px;
    border-right: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    display: flex;
    flex-direction: column;
    padding: 14px;
    gap: 16px;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .ps-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ps-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ps-text-subtle);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ps-field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .ps-field-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--ps-text-muted);
  }

  .ps-select {
    width: 100%;
    padding: 7px 10px;
    background-color: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 6px;
    color: var(--text-primary, #e2e8f0);
    font-size: 12px;
    outline: none;
    cursor: pointer;
    color-scheme: dark;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ps-select:hover:not(:disabled) {
    border-color: var(--text-subtle, #64748b);
  }
  .ps-select:focus {
    border-color: var(--ps-accent, #3b82f6);
    box-shadow: 0 0 0 1px var(--ps-accent, #3b82f6);
  }
  .ps-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .ps-select option {
    background-color: #181b20;
    color: #e2e8f0;
    padding: 6px 8px;
  }

  .ps-dictation-card {
    background: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    text-align: center;
  }

  .ps-meter-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .ps-meter-fill {
    height: 100%;
    background: var(--ps-accent);
    transition: width 0.08s ease;
  }

  .ps-presets-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .ps-preset-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid var(--ps-border);
    background: var(--ps-input-bg);
    color: var(--text-primary, #e2e8f0);
    cursor: pointer;
    font-size: 11px;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  .ps-preset-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--text-subtle);
  }
  .ps-preset-btn.active {
    border-color: var(--ps-accent);
    background: rgba(59, 130, 246, 0.12);
  }
  .ps-preset-btn .preset-title {
    font-weight: 600;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
  }
  .ps-preset-btn .preset-desc {
    font-size: 10.5px;
    color: var(--ps-text-muted);
    line-height: 1.3;
  }

  .ps-tone-panel {
    margin-top: 2px;
    padding: 8px 9px;
    border-radius: 6px;
    border: 1px solid rgba(59, 130, 246, 0.35);
    background: rgba(59, 130, 246, 0.06);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ps-tone-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--ps-text-muted);
  }
  .ps-tone-hint {
    font-size: 10px;
    color: var(--ps-text-muted);
    line-height: 1.3;
  }

  .ps-custom-prompt-input {
    width: 100%;
    background: var(--ps-input-bg);
    border: 1px solid var(--ps-border);
    border-radius: 6px;
    padding: 8px;
    color: var(--text-primary, #e2e8f0);
    font-size: 12px;
    resize: vertical;
    min-height: 54px;
    box-sizing: border-box;
    outline: none;
    font-family: inherit;
    color-scheme: dark;
  }
  .ps-custom-prompt-input:focus {
    border-color: var(--ps-accent);
  }

  .ps-editor-canvas {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-base, #121417);
    padding: 12px 16px;
    gap: 12px;
  }

  .ps-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ps-border);
    border-radius: 8px;
    background: var(--ps-panel-bg);
    overflow: hidden;
    min-height: 0;
  }

  .ps-pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--ps-border);
    background: rgba(255, 255, 255, 0.02);
    flex-shrink: 0;
  }

  .ps-pane-title {
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ps-textarea {
    flex: 1;
    width: 100%;
    background: transparent;
    border: none;
    padding: 12px;
    color: var(--text-primary, #e2e8f0);
    font-size: 13px;
    line-height: 1.6;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    resize: none;
    outline: none;
    box-sizing: border-box;
    overflow-y: auto;
    color-scheme: dark;
  }

  .ps-output-view {
    flex: 1;
    width: 100%;
    padding: 12px;
    color: var(--text-primary, #e2e8f0);
    font-size: 13px;
    line-height: 1.6;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    overflow-y: auto;
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .ps-diff-added {
    background-color: rgba(34, 197, 94, 0.25);
    color: #86efac;
    border-radius: 2px;
    padding: 0 2px;
  }

  .ps-diff-removed {
    background-color: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
    text-decoration: line-through;
    border-radius: 2px;
    padding: 0 2px;
  }

  .ps-diff-unchanged {
    color: inherit;
  }

  .ps-action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--ps-panel-bg);
    border: 1px solid var(--ps-border);
    border-radius: 8px;
    flex-shrink: 0;
    gap: 8px;
  }

  .ps-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 16px;
    background: var(--ps-panel-bg);
    border-top: 1px solid var(--ps-border);
    font-size: 11px;
    color: var(--ps-text-subtle);
    flex-shrink: 0;
  }

  .ps-pill {
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    font-size: 10px;
  }

  .ps-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 32px 24px;
    gap: 12px;
  }

  .ps-empty-card {
    max-width: 440px;
    padding: 20px 24px;
    border-radius: 10px;
    border: 1px solid var(--ps-border);
    background: var(--ps-panel-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  @keyframes ps-spin-anim {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .ps-spin {
    display: inline-block;
    animation: ps-spin-anim 1.2s linear infinite;
  }
`;

const STORAGE_KEY = 'zcc:prompt-voice:studio-draft:v1';

export function draftStorageKey(projectId?: string): string {
  return projectId ? `${STORAGE_KEY}:project:${projectId}` : STORAGE_KEY;
}

export interface ImproveToneOption {
  id: ImproveToneId;
  label: string;
  desc: string;
}

export const IMPROVE_TONES: ImproveToneOption[] = [
  { id: 'standard', label: 'Standard', desc: 'Fix grammar & clarity while keeping your natural tone and length.' },
  { id: 'casual', label: 'Casual', desc: 'Relaxed, everyday phrasing — natural without sounding stiff.' },
  { id: 'conversational', label: 'Conversational', desc: 'Warm, natural, and easy to read — like speaking clearly.' },
  { id: 'formal', label: 'Professional', desc: 'Polished, respectful phrasing for emails, PRs, or stakeholders.' },
  { id: 'technical', label: 'Technical', desc: 'Precise, unambiguous engineering phrasing without fluff.' }
];

export const PRESET_IDS = {
  improve: 'improve',
  executive: 'executive',
  spec: 'spec',
  custom: 'custom',
  translate: 'translate'
} as const;

export type StudioPresetId = (typeof PRESET_IDS)[keyof typeof PRESET_IDS];
export const VALID_PRESET_IDS: ReadonlySet<string> = new Set(Object.values(PRESET_IDS));

export interface PresetDef {
  id: StudioPresetId;
  title: string;
  icon: string;
  desc: string;
  instruction?: string;
  tone: ImproveToneId;
}

export const STUDIO_PRESETS: PresetDef[] = [
  {
    id: PRESET_IDS.improve,
    title: 'Improve writing',
    icon: '✨',
    desc: 'Fix grammar, phrasing & punctuation without extending length.',
    tone: 'standard'
  },
  {
    id: PRESET_IDS.executive,
    title: 'Summarize',
    icon: '⚡',
    desc: 'Condense into punchy bullet points.',
    instruction: 'Summarize the core request into crisp, high-level executive bullet points.',
    tone: 'formal'
  },
  {
    id: PRESET_IDS.spec,
    title: 'Create a technical spec',
    icon: '📐',
    desc: 'Format with Goals, Context, Steps.',
    instruction: 'Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.',
    tone: 'technical'
  }
];

export function getActionButtonLabel(presetId: string, isRunning: boolean): string {
  switch (presetId) {
    case PRESET_IDS.improve:
      return isRunning ? 'Improving...' : 'Improve text';
    case PRESET_IDS.executive:
      return isRunning ? 'Summarizing...' : 'Summarize';
    case PRESET_IDS.spec:
      return isRunning ? 'Creating spec...' : 'Create spec';
    case PRESET_IDS.custom:
      return isRunning ? 'Running...' : 'Run instructions';
    case PRESET_IDS.translate:
      return isRunning ? 'Translating...' : 'Translate';
    default:
      return isRunning ? 'Transforming...' : 'Transform text';
  }
}

export function getPipelineLabel(presetId: string, activeToneLabel: string, targetLanguage: string): string {
  switch (presetId) {
    case PRESET_IDS.improve:
      return `\u2B07 Improve writing \u00B7 ${activeToneLabel}`;
    case PRESET_IDS.translate:
      return `\u2B07 Translate \u00B7 ${findTargetLanguage(targetLanguage)?.label ?? targetLanguage}`;
    case PRESET_IDS.custom:
      return '\u2B07 Custom instructions';
    default:
      return `\u2B07 ${STUDIO_PRESETS.find((p) => p.id === presetId)?.title ?? 'Refine pipeline'}`;
  }
}

export interface DiscoveredModelOption {
  id: string;
  key: string;
  label: string;
  providerId: string;
  isComposerMatch?: boolean;
}

export interface ProviderOption {
  id: string;
  displayName: string;
  isComposerMatch?: boolean;
  error?: string | null;
  models: DiscoveredModelOption[];
}

export interface SttProviderOption {
  id: string;
  label: string;
}

/** Short provider names for the dictation card header. */
const STT_SHORT_LABELS: Record<string, string> = { system: 'Host STT', openai: 'OpenAI', 'google-gemini': 'Google Gemini', 'local-whisper': 'Local Whisper' };

/** Providers that call a cloud API with the user's own key. */
export function usesSttApiKey(provider: string): boolean {
  return provider === 'openai' || provider === 'google-gemini';
}

export const STT_PROVIDER_OPTIONS: SttProviderOption[] = [
  { id: 'google-gemini', label: 'Google Gemini' },
  { id: 'local-whisper', label: 'Local Whisper (on this device)' },
  { id: 'openai', label: 'OpenAI (Whisper)' },
  { id: 'system', label: 'System (Zana Voice)' }
];

const ZANA_ASSISTANT_FALLBACK: ProviderOption[] = [
  {
    id: 'assistant',
    displayName: 'Zana Assistant',
    models: [
      {
        id: 'assistant',
        key: 'assistant',
        label: 'Default Assistant (Host Agent)',
        providerId: 'assistant'
      }
    ]
  }
];

const MODEL_RETRY_DELAYS_MS = [1500, 3000];

export function PromptStudioDetachedPlaceholder({
  focusWindow,
  bringBack
}: PluginDetachedTabProps): React.ReactElement {
  ensureStylesInjected();
  return (
    <div className="ps-container" data-testid="ps-detached-placeholder">
      <style>{PROMPT_STUDIO_STYLES}</style>
      <div className="ps-empty-state">
        <div className="ps-empty-card">
          <span style={{ fontSize: 22 }} aria-hidden="true">🎙️</span>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            Prompt Studio is open in its own window
          </div>
          <div style={{ fontSize: 12, color: 'var(--ps-text-muted)' }}>
            Focus the floating window or bring Prompt Studio back to this project tab.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" className="ps-btn ps-btn-primary" onClick={focusWindow}>
              Focus Window
            </button>
            <button type="button" className="ps-btn" onClick={bringBack}>
              Bring Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface PromptStudioProps {
  /** Plugin id supplied by host slots (`projectTab`, `navPanel`) */
  pluginId?: string;
  /** Present when mounted inside a Zana project (`projectTab` slot) */
  projectId?: string;
  /** Optional sub-path supplied by `navPanel` slot */
  subPath?: string;
  /** Host-supplied actions for `header: 'custom'` project tabs */
  headerActions?: React.ReactNode;
  /** Optional custom session starter for tests */
  startSession?: (options?: StartRecordingOptions) => Promise<RecordingSession>;
}

function resolveInitialTab(subPath?: string): StudioTabId {
  const pending = consumePendingStudioTab();
  if (pending) return pending;
  if (subPath && subPath.replace(/^\/+/, '').toLowerCase() === PROMPT_STUDIO_HISTORY_SUBPATH) {
    return 'history';
  }
  return 'studio';
}

export function PromptStudio({
  pluginId,
  projectId,
  subPath,
  headerActions,
  startSession = defaultStartSession
}: PromptStudioProps): React.ReactElement {
  ensureStylesInjected();
  const [activeTab, setActiveTab] = useState<StudioTabId>(() => resolveInitialTab(subPath));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingLoadEntry, setPendingLoadEntry] = useState<HistoryEntry | null>(null);
  const rpc = usePromptVoiceRpc(pluginId);
  const composer = useSafeComposer();
  const composerView = useSafeComposerView();
  const zccContext = useSafeZccContext();
  const navigate = useSafeZccNavigate();
  const activeThreadId = resolveDictationScope(composerView?.scope, zccContext).threadId;
  const visibility = useVisibilitySettings();
  const composerProviderId = composerView?.providerId;
  const composerFamilyId = composerView?.familyId;
  const storageKey = draftStorageKey(projectId);

  // Track if user explicitly selected a model so we don't clobber it
  const userManuallySelectedModel = useRef(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);

  // ─── Workspace State ─────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [studioHistoryId, setStudioHistoryId] = useState<string | null>(null);
  const studioHistoryIdRef = useRef<string | null>(null);
  const updateStudioHistoryId = useCallback((nextId: string | null) => {
    studioHistoryIdRef.current = nextId;
    setStudioHistoryId(nextId);
  }, []);
  const [isCopiedOutput, setIsCopiedOutput] = useState(false);
  const [isCopiedInput, setIsCopiedInput] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [insertNotice, setInsertNotice] = useState<string | null>(null);
  const [reenablingProjectTab, setReenablingProjectTab] = useState(false);
  const [reenableError, setReenableError] = useState<string | null>(null);

  // ─── Model & Status State ───────────────────────────────────────────────────
  const [discoveredProviders, setDiscoveredProviders] = useState<DiscoveredProvider[] | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [modelsLoadError, setModelsLoadError] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('assistant');
  const [selectedModelId, setSelectedModelId] = useState<string>('assistant');
  const [savedLlmSettings, setSavedLlmSettings] = useState<{ providerId: string; modelId?: string } | null>(null);
  const [serverLlmProvider, setServerLlmProvider] = useState<string | null>(null);
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true);
  const [lastUsedModel, setLastUsedModel] = useState<string | null>(null);

  // ─── Diff & View State ───────────────────────────────────────────────────────
  const [showDiff, setShowDiff] = useState(false);

  // ─── Refinement Controls State ───────────────────────────────────────────────
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_IDS.improve);
  const [selectedToneId, setSelectedToneId] = useState<ImproveToneId>('standard');
  const [targetLanguage, setTargetLanguage] = useState<string>(DEFAULT_TARGET_LANGUAGE);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // ─── Voice Dictation State ───────────────────────────────────────────────────
  const [sttProvider, setSttProvider] = useState<string>('system');
  const [sttModel, setSttModel] = useState<string>('');
  const [sttKeyConfigured, setSttKeyConfigured] = useState<boolean>(true);
  const [availableSttProviders, setAvailableSttProviders] = useState<string[]>(['system']);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number | null>(null);
  const [audioPrefs, setAudioPrefs] = useState<AudioPreferences>(() => readCachedAudioPreferences());
  const audioPrefsRef = useRef<AudioPreferences>(audioPrefs);
  audioPrefsRef.current = audioPrefs;
  const activeSessionRef = useRef<RecordingSession | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const customPromptInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (subPath && subPath.replace(/^\/+/, '').toLowerCase() === PROMPT_STUDIO_HISTORY_SUBPATH) {
      setSettingsOpen(false);
      setActiveTab('history');
    }
  }, [subPath]);

  useEffect(() => {
    return subscribeStudioTabRequests((tab) => {
      setSettingsOpen(false);
      setActiveTab(tab);
    });
  }, []);

  // Load saved draft on mount and when switching project scopes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const loadedInput = typeof parsed.inputText === 'string' ? parsed.inputText : '';
        const loadedOutput = typeof parsed.outputText === 'string' ? parsed.outputText : '';
        const savedHistoryId =
          (loadedInput.trim() || loadedOutput.trim()) &&
          typeof parsed.historyEntryId === 'string' &&
          parsed.historyEntryId.trim()
            ? parsed.historyEntryId.trim()
            : null;
        setInputText(loadedInput);
        setOutputText(loadedOutput);
        updateStudioHistoryId(savedHistoryId);
        setSelectedProviderId(parsed.selectedProviderId || 'assistant');
        setSelectedModelId(parsed.selectedModelId || 'assistant');
        userManuallySelectedModel.current = parsed.userManuallySelected === true;
        setSttProvider(parsed.sttProvider || 'system');
        setSttModel(parsed.sttModel || '');
        if (parsed.selectedPresetId === 'polish') {
          setSelectedPresetId(PRESET_IDS.improve);
          setSelectedToneId('standard');
        } else if (parsed.selectedPresetId === 'chat') {
          setSelectedPresetId(PRESET_IDS.improve);
          setSelectedToneId('conversational');
        } else if (typeof parsed.selectedPresetId === 'string' && VALID_PRESET_IDS.has(parsed.selectedPresetId)) {
          setSelectedPresetId(parsed.selectedPresetId);
        } else {
          setSelectedPresetId(PRESET_IDS.improve);
        }
        if (typeof parsed.selectedToneId === 'string' && IMPROVE_TONES.some((t) => t.id === parsed.selectedToneId)) {
          setSelectedToneId(parsed.selectedToneId as ImproveToneId);
        } else if (parsed.selectedPresetId !== 'chat') {
          setSelectedToneId('standard');
        }
        setTargetLanguage(findTargetLanguage(parsed.targetLanguage)?.code ?? DEFAULT_TARGET_LANGUAGE);
      } else {
        setInputText('');
        setOutputText('');
        updateStudioHistoryId(null);
        setSelectedProviderId('assistant');
        setSelectedModelId('assistant');
        setSttProvider('system');
        setSttModel('');
        setSelectedPresetId(PRESET_IDS.improve);
        setSelectedToneId('standard');
        setTargetLanguage(DEFAULT_TARGET_LANGUAGE);
        userManuallySelectedModel.current = false;
      }
    } catch {
      // Ignore storage read errors
    }
    setLoadedStorageKey(storageKey);
  }, [storageKey, updateStudioHistoryId]);

  const rpcRef = useRef(rpc);
  rpcRef.current = rpc;
  const mountedRef = useRef(true);
  const settingsRequestIdRef = useRef(0);
  const dictationRequestIdRef = useRef(0);
  const modelsRequestIdRef = useRef(0);
  const modelsRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply server status to local state; shared by the mount load and post-update refresh.
  const applyStatus = useCallback((status: StatusResponse | null | undefined) => {
    if (!status) return;
    if (status.llmProvider) {
      setServerLlmProvider(status.llmProvider);
      setAutoCleanupEnabled(status.llmProvider !== 'none');
    }
    if (status.sttProvider) setSttProvider(status.sttProvider);
    if (typeof status.sttKeyConfigured === 'boolean') setSttKeyConfigured(status.sttKeyConfigured);
    setAvailableSttProviders(resolveAvailableSttProviders(status));
  }, []);

  const refreshStatus = useCallback(() => {
    rpcRef.current
      .call(STATUS_METHOD)
      .then((res) => {
        if (mountedRef.current) applyStatus(res as StatusResponse);
      })
      .catch(() => undefined);
  }, [applyStatus]);

  useEffect(() => {
    let isCurrent = true;
    rpcRef.current
      .call(STATUS_METHOD)
      .then((res) => {
        if (isCurrent) applyStatus(res as StatusResponse);
      })
      .catch(() => {
        // Fall back gracefully
      });
    return () => {
      isCurrent = false;
    };
  }, [applyStatus]);

  const updateAudioPrefsIfChanged = useCallback((next: AudioPreferences) => {
    setAudioPrefs((prev) =>
      prev.micDeviceId === next.micDeviceId &&
      prev.micLabel === next.micLabel &&
      prev.soundCuesEnabled === next.soundCuesEnabled &&
      prev.soundCuesVolume === next.soundCuesVolume
        ? prev
        : next
    );
  }, []);

  const loadStudioSettings = useCallback(() => {
    const requestId = ++settingsRequestIdRef.current;
    rpcRef.current
      .call(SETTINGS_GET_METHOD)
      .then((res) => {
        if (!mountedRef.current || settingsRequestIdRef.current !== requestId) return;
        const s = (res || {}) as Record<string, unknown>;
        if (typeof s.sttProvider === 'string' && s.sttProvider) setSttProvider(s.sttProvider);
        if (typeof s.sttModel === 'string' && s.sttModel) setSttModel(s.sttModel);
        if (typeof s.llmProvider === 'string' && s.llmProvider && s.llmProvider !== 'none') {
          setSavedLlmSettings({
            providerId: s.llmProvider,
            modelId: typeof s.llmModel === 'string' && s.llmModel ? s.llmModel : undefined
          });
        } else if (s.llmProvider === 'none') {
          setSavedLlmSettings(null);
        }
        if (res && typeof res === 'object') {
          updateAudioPrefsIfChanged(writeCachedAudioPreferences(s));
        }
      })
      .catch(() => undefined);
  }, [updateAudioPrefsIfChanged]);

  const clearModelsRetryTimer = useCallback(() => {
    if (modelsRetryTimerRef.current) {
      clearTimeout(modelsRetryTimerRef.current);
      modelsRetryTimerRef.current = null;
    }
  }, []);

  const loadAvailableModels = useCallback((options: { refresh?: boolean; retryAttempt?: number } = {}) => {
    const refresh = options.refresh === true;
    const retryAttempt = options.retryAttempt ?? 0;
    clearModelsRetryTimer();
    const requestId = ++modelsRequestIdRef.current;
    setIsLoadingModels(true);
    if (refresh || retryAttempt === 0) {
      setModelsLoadError(null);
    }

    const scheduleRetry = () => {
      if (!mountedRef.current || retryAttempt >= MODEL_RETRY_DELAYS_MS.length) return;
      const delayMs = MODEL_RETRY_DELAYS_MS[retryAttempt];
      modelsRetryTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        loadAvailableModels({ retryAttempt: retryAttempt + 1 });
      }, delayMs);
    };

    rpcRef.current
      .call(AVAILABLE_MODELS_METHOD, refresh ? { refresh: true } : undefined)
      .then((res) => {
        if (!mountedRef.current || modelsRequestIdRef.current !== requestId) return;
        const providers = Array.isArray(res) ? (res as AvailableModelsResponse) : [];
        setDiscoveredProviders(providers);
        setIsLoadingModels(false);
        const foundHostProviders = providers.some(
          (p) => p.providerId !== 'assistant' && Array.isArray(p.models) && p.models.length > 0
        );
        if (!foundHostProviders && !refresh) {
          scheduleRetry();
        }
      })
      .catch(() => {
        if (!mountedRef.current || modelsRequestIdRef.current !== requestId) return;
        setIsLoadingModels(false);
        setModelsLoadError('Could not load Composer models. Using Zana Assistant.');
        scheduleRetry();
      });
  }, [clearModelsRetryTimer]);

  useSafeRealtime(MODELS_UPDATED_EVENT, (payload) => {
    if (!mountedRef.current || !Array.isArray(payload)) return;
    setDiscoveredProviders(payload as AvailableModelsResponse);
    setIsLoadingModels(false);
    setModelsLoadError(null);
    clearModelsRetryTimer();
    refreshStatus();
  });

  useEffect(() => {
    mountedRef.current = true;
    loadStudioSettings();
    loadAvailableModels();
    return () => {
      mountedRef.current = false;
      settingsRequestIdRef.current++;
      dictationRequestIdRef.current++;
      modelsRequestIdRef.current++;
      clearModelsRetryTimer();
    };
  }, [clearModelsRetryTimer, loadAvailableModels, loadStudioSettings]);

  const visibleSttOptions = useMemo(() => {
    const allowed = new Set(availableSttProviders);
    allowed.add('system');
    return STT_PROVIDER_OPTIONS.filter((opt) => allowed.has(opt.id));
  }, [availableSttProviders]);

  const isCurrentSttAvailable = visibleSttOptions.some((opt) => opt.id === sttProvider);

  const hasHostProviders = useMemo(
    () =>
      (discoveredProviders ?? []).some(
        (p) => p.providerId !== 'assistant' && Array.isArray(p.models) && p.models.length > 0
      ),
    [discoveredProviders]
  );

  // Assemble provider list (A-Z) and each provider's models (cheapest to most expensive)
  const providerOptions: ProviderOption[] = useMemo(() => {
    const sortAlphabetically = <T,>(items: T[], getText: (item: T) => string): T[] => {
      return [...items].sort((a, b) =>
        getText(a).localeCompare(getText(b), undefined, { sensitivity: 'base', numeric: true })
      );
    };

    const nonEmptyProviders = (discoveredProviders ?? []).filter(
      (prov) => Array.isArray(prov.models) && prov.models.length > 0
    );

    if (nonEmptyProviders.length === 0) {
      const providers = ZANA_ASSISTANT_FALLBACK.map((p) => {
        const isProvComposerMatch = Boolean(
          (composerProviderId && p.id.toLowerCase() === composerProviderId.toLowerCase()) ||
          (composerFamilyId && p.id.toLowerCase().includes(composerFamilyId.toLowerCase()))
        );
        const sortedModels = sortModelsCheapestFirst(p.models).map((m) => ({
          ...m,
          isComposerMatch: isProvComposerMatch
        }));
        return {
          ...p,
          isComposerMatch: isProvComposerMatch,
          models: sortedModels
        };
      });
      return sortAlphabetically(providers, (p) => p.displayName || p.id);
    }

    const legacyAliases: Record<string, string> = {
      'assistant:assistant': 'assistant'
    };

    const providers = nonEmptyProviders.map((prov) => {
      const isProvComposerMatch = Boolean(
        (composerProviderId && prov.providerId.toLowerCase() === composerProviderId.toLowerCase()) ||
        (composerFamilyId && prov.providerId.toLowerCase().includes(composerFamilyId.toLowerCase()))
      );

      const models: DiscoveredModelOption[] = sortModelsCheapestFirst(prov.models).map((m) => {
        const fullKey = `${prov.providerId}:${m.id}`;
        const key = legacyAliases[fullKey] ?? m.id;
        return {
          id: m.id,
          key,
          label: m.label || m.id,
          providerId: prov.providerId,
          isComposerMatch: isProvComposerMatch
        };
      });

      return {
        id: prov.providerId,
        displayName: prov.displayName || prov.providerId,
        isComposerMatch: isProvComposerMatch,
        error: prov.error ?? null,
        models
      };
    });

    return sortAlphabetically(providers, (p) => p.displayName || p.id);
  }, [discoveredProviders, composerProviderId, composerFamilyId]);

  // Find active provider
  const activeProvider = useMemo(() => {
    return providerOptions.find((p) => p.id === selectedProviderId) ?? providerOptions[0];
  }, [providerOptions, selectedProviderId]);

  // Models for active provider
  const availableModelsForProvider = useMemo(() => {
    return activeProvider?.models ?? [];
  }, [activeProvider]);

  // Find active model
  const activeModel = useMemo(() => {
    const match = availableModelsForProvider.find(
      (m) => m.id === selectedModelId || m.key === selectedModelId
    );
    return match ?? availableModelsForProvider[0];
  }, [availableModelsForProvider, selectedModelId]);

  // Auto-sync with active composer (or saved server preference on the main screen)
  // once host providers have loaded if user has not explicitly picked a model.
  useEffect(() => {
    if (discoveredProviders === null || userManuallySelectedModel.current || providerOptions.length === 0) {
      return;
    }
    const composerMatch =
      providerOptions.find((p) => p.isComposerMatch && p.models.length > 0) ??
      providerOptions.find((p) => p.isComposerMatch);
    if (composerMatch) {
      setSelectedProviderId(composerMatch.id);
      if (composerMatch.models.length > 0) {
        setSelectedModelId(composerMatch.models[0].key || composerMatch.models[0].id);
      }
      return;
    }

    if (savedLlmSettings && savedLlmSettings.providerId !== 'assistant') {
      const savedProvider = providerOptions.find(
        (p) => p.id === savedLlmSettings.providerId && p.models.length > 0
      );
      if (savedProvider) {
        setSelectedProviderId(savedProvider.id);
        const matchedModel = savedLlmSettings.modelId
          ? savedProvider.models.find((m) => m.id === savedLlmSettings.modelId || m.key === savedLlmSettings.modelId)
          : undefined;
        const targetModel = matchedModel ?? savedProvider.models[0];
        if (targetModel) {
          setSelectedModelId(targetModel.key || targetModel.id);
        }
      }
    }
  }, [discoveredProviders, providerOptions, savedLlmSettings]);

  // Reset active history linkage once both panes are cleared so the next draft starts a new activity
  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    if (!inputText.trim() && !outputText.trim() && !isRecording && !isTranscribing && !isRefining) {
      if (studioHistoryIdRef.current !== null) {
        updateStudioHistoryId(null);
      }
    }
  }, [loadedStorageKey, storageKey, inputText, outputText, isRecording, isTranscribing, isRefining, updateStudioHistoryId]);

  // Auto-save draft on change after initial load of the active storageKey
  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          inputText,
          outputText,
          historyEntryId: studioHistoryId,
          selectedProviderId,
          selectedModelId,
          userManuallySelected: userManuallySelectedModel.current,
          sttProvider,
          sttModel,
          selectedPresetId,
          selectedToneId,
          targetLanguage
        })
      );
    } catch {
      // Ignore storage write errors
    }
  }, [loadedStorageKey, storageKey, inputText, outputText, studioHistoryId, selectedProviderId, selectedModelId, sttProvider, sttModel, selectedPresetId, selectedToneId, targetLanguage]);

  // Auto-cleanup toggle handler for composer dictations
  const handleToggleAutoCleanup = (enabled: boolean) => {
    setAutoCleanupEnabled(enabled);
    const targetProvider = enabled ? (activeProvider?.id ?? 'assistant') : 'none';
    const targetModel = enabled ? (activeModel?.id ?? 'assistant') : '';
    setServerLlmProvider(targetProvider);
    rpc
      .call(SETTINGS_UPDATE_METHOD, {
        llmProvider: targetProvider,
        llmModel: targetModel
      })
      .catch(() => {
        setStatusNotice('Could not update cleanup setting.');
      });
  };

  // Speech provider change handler
  const handleSttProviderChange = (newProvider: string) => {
    setSttProvider(newProvider);
    setDictationError(null);
    rpc
      .call(SETTINGS_UPDATE_METHOD, {
        sttProvider: newProvider
      })
      .then(() => refreshStatus())
      .catch(() => {
        setStatusNotice('Could not update speech provider setting.');
      });
  };

  // Speech model change handler
  const handleSttModelChange = (newModel: string) => {
    setSttModel(newModel);
    rpc
      .call(SETTINGS_UPDATE_METHOD, {
        sttModel: newModel
      })
      .catch(() => undefined);
  };

  // Provider change handler
  const handleProviderChange = (newProviderId: string) => {
    userManuallySelectedModel.current = true;
    setSelectedProviderId(newProviderId);
    const targetProvider = providerOptions.find((p) => p.id === newProviderId);
    let targetModelId = '';
    if (targetProvider && targetProvider.models.length > 0) {
      const newModel = targetProvider.models[0].key || targetProvider.models[0].id;
      targetModelId = targetProvider.models[0].id;
      setSelectedModelId(newModel);
    }
    if (autoCleanupEnabled) {
      setServerLlmProvider(newProviderId);
      rpc
        .call(SETTINGS_UPDATE_METHOD, {
          llmProvider: newProviderId,
          llmModel: targetModelId
        })
        .catch(() => undefined);
    }
  };

  // Model change handler (supports cross-provider alias switching for tests)
  const handleModelChange = (newModelIdOrKey: string) => {
    userManuallySelectedModel.current = true;
    let targetProvId = selectedProviderId;
    let targetActualModelId = newModelIdOrKey;
    for (const prov of providerOptions) {
      const found = prov.models.find((m) => m.id === newModelIdOrKey || m.key === newModelIdOrKey);
      if (found) {
        if (prov.id !== selectedProviderId) {
          setSelectedProviderId(prov.id);
          targetProvId = prov.id;
        }
        setSelectedModelId(found.key || found.id);
        targetActualModelId = found.id;
        break;
      }
    }
    if (autoCleanupEnabled) {
      setServerLlmProvider(targetProvId);
      rpc
        .call(SETTINGS_UPDATE_METHOD, {
          llmProvider: targetProvId,
          llmModel: targetActualModelId
        })
        .catch(() => undefined);
    }
  };

  // Clean up recording timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
      if (activeSessionRef.current) activeSessionRef.current.cancel();
    };
  }, []);

  // Compute telemetry
  const inputStats = useMemo(() => {
    const trimmed = inputText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return `${words} words · ${inputText.length} chars`;
  }, [inputText]);

  const outputStats = useMemo(() => {
    const trimmed = outputText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return `${words} words · ${outputText.length} chars`;
  }, [outputText]);

  // Compute token-level LCS diff between input and output
  const diffTokens: DiffToken[] = useMemo(() => {
    if (!outputText || !showDiff) return [];
    return computeWordDiff(inputText, outputText);
  }, [inputText, outputText, showDiff]);

  // ─── Voice Dictation Helpers ─────────────────────────────────────────────────
  const clearStudioTimers = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
  };

  const startStudioTimers = () => {
    clearStudioTimers();
    timerIntervalRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    meterIntervalRef.current = setInterval(() => {
      if (activeSessionRef.current) {
        setAudioLevel(activeSessionRef.current.getAudioLevel?.() ?? null);
      }
    }, 100);
  };

  const stopAndTranscribeStudio = async (cueOpts: { enabled: boolean; volume: number }) => {
    setIsRecording(false);
    setAudioLevel(null);
    clearStudioTimers();

    const session = activeSessionRef.current;
    activeSessionRef.current = null;
    const startedAt = recordingStartedAtRef.current;
    recordingStartedAtRef.current = null;
    const audioDurationMs = startedAt !== null ? Math.max(0, Date.now() - startedAt) : undefined;
    if (!session) return;

    setIsTranscribing(true);
    try {
      const recorded = await session.stop();
      if (!mountedRef.current) return;
      // Play stop chime only after capture stops so it never bleeds into the recording.
      playSoundCue('stop', cueOpts);
      const audio = await prepareAudioForUpload(rpc, recorded);
      const response = (await rpc.call(TRANSCRIBE_METHOD, {
        audio: audio.base64,
        mimeType: audio.mimeType,
        transcriptionOnly: true,
        source: 'studio',
        ...(projectId ? { projectId } : {}),
        ...(activeThreadId ? { threadId: activeThreadId } : {}),
        ...(typeof audioDurationMs === 'number' ? { audioDurationMs } : {}),
        ...(studioHistoryIdRef.current ? { historyEntryId: studioHistoryIdRef.current } : {})
      })) as TranscribeResponse;

      if (response.ok && response.status === 'ok') {
        playSoundCue('complete', cueOpts);
        if (typeof response.historyEntryId === 'string' && response.historyEntryId) {
          updateStudioHistoryId(response.historyEntryId);
        }
        setInputText((prev) => appendTranscript(prev, response.text));
        setDictationError(null);
      } else if (response.ok && response.status === 'no-speech') {
        setStatusNotice('No speech detected. Try speaking closer to the microphone.');
        setTimeout(() => setStatusNotice(null), 4000);
      } else if (!response.ok) {
        playSoundCue('error', cueOpts);
        setStatusNotice(response.message);
        setDictationError(response.message);
        if (response.code === 'MISSING_KEY') {
          setSttKeyConfigured(false);
          refreshStatus();
        }
      }
    } catch (err) {
      playSoundCue('error', cueOpts);
      setStatusNotice(err instanceof Error ? err.message : 'Transcription failed.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startStudioRecording = async (prefs: AudioPreferences, cueOpts: { enabled: boolean; volume: number }) => {
    setDictationError(null);
    setStatusNotice(null);
    if (usesSttApiKey(sttProvider) && !sttKeyConfigured) {
      playSoundCue('error', cueOpts);
      const provName = sttProvider === 'openai' ? 'OpenAI' : 'Google Gemini';
      setDictationError(`API key required for direct ${provName} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`);
      setStatusNotice(`API key required for ${provName}. Switch to System (Zana Voice) to dictate thoughts.`);
      return;
    }

    const opId = ++dictationRequestIdRef.current;
    try {
      // Play start chime before opening capture so speaker playback never enters the recording.
      const cuePromise = playSoundCue('start', cueOpts);
      if (cuePromise) {
        await cuePromise;
        if (!mountedRef.current || dictationRequestIdRef.current !== opId) return;
      }
      const session = await (prefs.micDeviceId !== DEFAULT_MIC_DEVICE_ID
        ? startSession({ deviceId: prefs.micDeviceId })
        : startSession());
      if (!mountedRef.current || dictationRequestIdRef.current !== opId) {
        session.cancel();
        return;
      }
      session.onError = (err) => {
        activeSessionRef.current = null;
        recordingStartedAtRef.current = null;
        setIsRecording(false);
        setAudioLevel(null);
        clearStudioTimers();
        playSoundCue('error', cueOpts);
        setDictationError(err.message);
        setStatusNotice(err.message);
      };
      session.onAutoStop = () => {
        setStatusNotice('Recording limit reached. Transcribing captured audio.');
        void stopAndTranscribeStudio(cueOpts);
      };
      activeSessionRef.current = session;
      recordingStartedAtRef.current = Date.now();
      setIsRecording(true);
      setRecordingSeconds(0);
      startStudioTimers();
    } catch (err) {
      playSoundCue('error', cueOpts);
      setStatusNotice(err instanceof Error ? err.message : 'Microphone access denied.');
    }
  };

  const handleSettingsClosed = useCallback(() => {
    setSettingsOpen(false);
    updateAudioPrefsIfChanged(readCachedAudioPreferences());
    loadStudioSettings();
    refreshStatus();
    loadAvailableModels();
  }, [loadAvailableModels, loadStudioSettings, refreshStatus, updateAudioPrefsIfChanged]);

  const handleToggleDictation = async () => {
    const prefs = audioPrefsRef.current;
    const cueOpts = { enabled: prefs.soundCuesEnabled, volume: prefs.soundCuesVolume };
    if (isRecording) {
      await stopAndTranscribeStudio(cueOpts);
    } else {
      await startStudioRecording(prefs, cueOpts);
    }
  };

  // ─── Refinement Handler ──────────────────────────────────────────────────────
  const handleRefine = async () => {
    const raw = inputText.trim();
    if (!raw || isRefining || !activeModel || (selectedPresetId === PRESET_IDS.custom && !customPrompt.trim())) return;

    const activePreset = STUDIO_PRESETS.find((p) => p.id === selectedPresetId);
    const isCustom = selectedPresetId === PRESET_IDS.custom;
    const isImprove = selectedPresetId === PRESET_IDS.improve;
    const isTranslate = selectedPresetId === PRESET_IDS.translate;
    const tone: ToneId = isTranslate
      ? 'standard'
      : isCustom
        ? 'custom'
        : isImprove
          ? selectedToneId
          : activePreset?.tone || 'technical';

    const providerToUse = activeProvider?.id ?? 'assistant';
    const modelToUse = activeModel?.id ?? 'assistant';

    setStatusNotice(null);
    setIsRefining(true);

    try {
      const response = (await rpc.call(REPHRASE_METHOD, {
        text: raw,
        tone,
        ...(isTranslate ? { targetLanguage } : {}),
        ...(isCustom ? { customPrompt: customPrompt.trim() } : {}),
        ...(!isCustom && !isTranslate && activePreset?.instruction ? { instruction: activePreset.instruction } : {}),
        llmProvider: providerToUse,
        llmModel: modelToUse,
        source: 'studio',
        presetId: selectedPresetId,
        ...(projectId ? { projectId } : {}),
        ...(activeThreadId ? { threadId: activeThreadId } : {}),
        ...(studioHistoryIdRef.current ? { historyEntryId: studioHistoryIdRef.current } : {})
      })) as RephraseResponse;

      if (response.ok) {
        if (typeof response.historyEntryId === 'string' && response.historyEntryId) {
          updateStudioHistoryId(response.historyEntryId);
        }
        setOutputText(response.text);
        setLastUsedModel(
          `${activeProvider?.displayName || providerToUse}: ${response.llmModel || modelToUse}`
        );
      } else {
        setStatusNotice(response.message);
      }
    } catch (err) {
      setStatusNotice(err instanceof Error ? err.message : 'Refinement request failed.');
    } finally {
      setIsRefining(false);
    }
  };

  // ─── Canvas Actions ──────────────────────────────────────────────────────────
  const handlePasteInput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setStatusNotice('Clipboard is empty.');
        setTimeout(() => setStatusNotice(null), 2500);
        return;
      }
      setInputText((prev) => appendTranscript(prev, text));
      setStatusNotice('Pasted from clipboard into input draft!');
      setTimeout(() => setStatusNotice(null), 2500);
    } catch {
      setStatusNotice('Clipboard access denied or unavailable.');
      setTimeout(() => setStatusNotice(null), 2500);
    }
  };

  const handleCopyInput = async () => {
    if (!inputText) return;
    const ok = await copyToClipboard(inputText);
    if (ok) {
      setIsCopiedInput(true);
      setTimeout(() => setIsCopiedInput(false), 2000);
      setStatusNotice('Input draft copied to clipboard!');
      setTimeout(() => setStatusNotice(null), 2500);
    } else {
      setStatusNotice('Failed to copy to clipboard.');
      setTimeout(() => setStatusNotice(null), 3000);
    }
  };

  const handleCopyOutput = async () => {
    if (!outputText) return;
    const ok = await copyToClipboard(outputText);
    if (ok) {
      setIsCopiedOutput(true);
      setTimeout(() => setIsCopiedOutput(false), 2000);
      setStatusNotice('Refined output copied to clipboard!');
      setTimeout(() => setStatusNotice(null), 2500);
    } else {
      setStatusNotice('Failed to copy to clipboard.');
      setTimeout(() => setStatusNotice(null), 3000);
    }
  };

  const handleClearAll = () => {
    if (!inputText && !outputText) return;
    updateStudioHistoryId(null);
    setInputText('');
    setOutputText('');
    setSelectedPresetId(PRESET_IDS.improve);
    setSelectedToneId('standard');
    setTargetLanguage(DEFAULT_TARGET_LANGUAGE);
    setCustomPrompt('');
    setShowDiff(false);
    setStatusNotice('Studio canvas cleared.');
    setTimeout(() => setStatusNotice(null), 2500);
  };

  const handleReplaceInput = () => {
    if (!outputText) return;
    setInputText(outputText);
    setOutputText('');
    setShowDiff(false);
    setStatusNotice('Refined output moved to input draft.');
    setTimeout(() => setStatusNotice(null), 2500);
  };

  const insertTextIntoComposer = useCallback((textToInsert: string) => {
    if (!textToInsert) return;

    if (composer && typeof composer.updateText === 'function') {
      try {
        composer.updateText((draft) => appendTranscript(draft, textToInsert));
        composer.focus?.();
        setInsertNotice('Inserted into Composer!');
        setStatusNotice('Inserted into Composer!');
        setTimeout(() => setInsertNotice(null), 2500);
        setTimeout(() => setStatusNotice(null), 2500);
        return;
      } catch {
        // Fall through when no active thread composer is focused.
      }
    }

    if (navigate && typeof navigate.toCompose === 'function') {
      navigate.toCompose({ initialPrompt: textToInsert, focusPrompt: true });
      setInsertNotice('Opened in New Thread Composer!');
      setStatusNotice('Opened in New Thread Composer!');
      setTimeout(() => setInsertNotice(null), 2500);
      setTimeout(() => setStatusNotice(null), 2500);
      return;
    }

    void copyToClipboard(textToInsert).then((copied) => {
      setStatusNotice(
        copied
          ? 'No active composer — copied prompt to clipboard.'
          : 'Composer focus unavailable.'
      );
    });
  }, [composer, navigate]);

  const handleInsertIntoComposer = () => {
    insertTextIntoComposer(outputText || inputText);
  };

  const applyHistoryEntryToStudio = useCallback((entry: HistoryEntry) => {
    updateStudioHistoryId(null);
    setInputText(entry.rawText);
    setOutputText(
      entry.kind === 'refinement' || entry.outputText !== entry.rawText ? entry.outputText : ''
    );
    if (entry.kind === 'refinement' || entry.presetId || entry.targetLanguage || entry.customPrompt) {
      const nextPreset =
        entry.presetId && VALID_PRESET_IDS.has(entry.presetId)
          ? entry.presetId
          : entry.targetLanguage
            ? PRESET_IDS.translate
            : entry.tone === 'custom'
              ? PRESET_IDS.custom
              : PRESET_IDS.improve;
      setSelectedPresetId(nextPreset);
      if (entry.tone && IMPROVE_TONES.some((t) => t.id === entry.tone)) {
        setSelectedToneId(entry.tone as ImproveToneId);
      }
      if (entry.targetLanguage) {
        setTargetLanguage(findTargetLanguage(entry.targetLanguage)?.code ?? DEFAULT_TARGET_LANGUAGE);
      }
      setCustomPrompt(entry.customPrompt ?? '');
    }
    setShowDiff(false);
    setPendingLoadEntry(null);
    setSettingsOpen(false);
    setActiveTab('studio');
    setStatusNotice('Loaded entry into Studio.');
    setTimeout(() => setStatusNotice(null), 2500);
  }, [updateStudioHistoryId]);

  const handleLoadFromHistory = useCallback(
    (entry: HistoryEntry) => {
      if (inputText.trim() || outputText.trim()) {
        setPendingLoadEntry(entry);
        return;
      }
      applyHistoryEntryToStudio(entry);
    },
    [applyHistoryEntryToStudio, inputText, outputText]
  );

  const handleReenableProjectTab = async () => {
    if (!pluginId) return;
    setReenablingProjectTab(true);
    setReenableError(null);
    try {
      await updatePluginSettings(pluginId, { showInProjects: true });
    } catch (err) {
      setReenableError(err instanceof Error ? err.message : 'Could not update plugin settings.');
    } finally {
      setReenablingProjectTab(false);
    }
  };

  // Keyboard shortcut Ctrl+K to jump to custom instructions
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setSettingsOpen(false);
      setActiveTab('studio');
      setSelectedPresetId(PRESET_IDS.custom);
      setTimeout(() => customPromptInputRef.current?.focus(), 0);
    }
  }, []);

  if (projectId && !visibility.showInProjects) {
    return (
      <div className="ps-container">
        <style>{PROMPT_STUDIO_STYLES}</style>
        <header className="ps-header">
          <div className="ps-header-left">
            <span style={{ fontSize: 18 }}>🎙️</span>
            <span className="ps-header-title">Prompt Studio</span>
            <span className="ps-badge ps-badge-project">Project</span>
          </div>
          {headerActions ? <div className="ps-header-actions">{headerActions}</div> : null}
        </header>
        <div className="ps-empty-state" data-testid="ps-project-hidden-notice">
          <div className="ps-empty-card">
            <span style={{ fontSize: 22 }} aria-hidden="true">🔇</span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Prompt Studio is hidden in projects
            </div>
            <div style={{ fontSize: 12, color: 'var(--ps-text-muted)', lineHeight: 1.45 }}>
              You disabled the project tab in Prompt Voice plugin settings. Re-enable it anytime to use project-scoped drafts here.
            </div>
            {reenableError ? (
              <div role="alert" style={{ fontSize: 11, color: '#fca5a5' }}>
                {reenableError}
              </div>
            ) : null}
            {pluginId ? (
              <button
                type="button"
                className="ps-btn ps-btn-primary"
                disabled={reenablingProjectTab}
                onClick={() => void handleReenableProjectTab()}
              >
                {reenablingProjectTab ? 'Enabling…' : 'Enable Prompt Studio in Projects'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const activeToneOption = IMPROVE_TONES.find((t) => t.id === selectedToneId) ?? IMPROVE_TONES[0];

  const handleSelectTab = (tab: StudioTabId) => {
    setPendingLoadEntry(null);
    if (settingsOpen) {
      handleSettingsClosed();
    }
    setActiveTab(tab);
  };

  return (
    <div className="ps-container" onKeyDown={handleKeyDown}>
      <style>{PROMPT_STUDIO_STYLES}</style>

      {/* ─── Studio Header with Studio | History Tabs & Settings ────────────── */}
      <header className="ps-header">
        <div className="ps-header-left">
          <span style={{ fontSize: 18 }}>🎙️</span>
          <span className="ps-header-title">Prompt Studio</span>
          <span className="ps-badge">Voice & AI Refinement</span>
          {projectId ? <span className="ps-badge ps-badge-project">Project</span> : null}
        </div>
        <div className="ps-header-actions">
          <nav className="ps-header-nav" role="tablist" aria-label="Prompt Studio views">
            <button
              type="button"
              role="tab"
              aria-selected={!settingsOpen && activeTab === 'studio'}
              className={`ps-header-tab ${!settingsOpen && activeTab === 'studio' ? 'active' : ''}`}
              onClick={() => handleSelectTab('studio')}
            >
              Studio
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!settingsOpen && activeTab === 'history'}
              className={`ps-header-tab ${!settingsOpen && activeTab === 'history' ? 'active' : ''}`}
              onClick={() => handleSelectTab('history')}
            >
              History
            </button>
          </nav>
          <button
            type="button"
            className={`ps-btn ${settingsOpen ? 'ps-btn-primary' : ''}`}
            aria-pressed={settingsOpen}
            onClick={() => {
              setPendingLoadEntry(null);
              if (settingsOpen) handleSettingsClosed();
              else setSettingsOpen(true);
            }}
          >
            Settings
          </button>
          {headerActions}
        </div>
      </header>

      {pendingLoadEntry ? (
        <div className="ps-overwrite-banner" role="alertdialog" aria-label="Confirm overwrite studio draft">
          <span>Replace your current Studio draft with this history entry?</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="ps-btn" onClick={() => setPendingLoadEntry(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="ps-btn ps-btn-primary"
              onClick={() => applyHistoryEntryToStudio(pendingLoadEntry)}
            >
              Replace Draft
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── Workspace Layout ───────────────────────────────────────────────── */}
      {settingsOpen ? (
        <StudioSettings rpc={rpc} pluginId={pluginId} onBack={handleSettingsClosed} />
      ) : activeTab === 'history' ? (
        <HistoryView
          rpc={rpc}
          projectId={projectId}
          onLoadIntoStudio={handleLoadFromHistory}
          onInsertIntoComposer={insertTextIntoComposer}
          onOpenSettings={() => setSettingsOpen(true)}
          onStatusNotice={(msg) => {
            setStatusNotice(msg);
            setTimeout(() => setStatusNotice((curr) => (curr === msg ? null : curr)), 2500);
          }}
        />
      ) : <div className="ps-workspace">

        {/* ─── Left Sidebar Controls ────────────────────────────────────────── */}
        <aside className="ps-sidebar">

          {/* Voice Dictation Card */}
          <section className="ps-section">
            <div className="ps-section-title">
              <span>Voice Dictation</span>
              <span style={{ fontSize: 10, color: 'var(--ps-text-muted)' }}>
                {STT_SHORT_LABELS[sttProvider] ?? sttProvider}
              </span>
            </div>

            {/* Speech Provider Selector */}
            <div className="ps-field-group">
              <label htmlFor="ps-stt-provider-select" className="ps-field-label">
                Speech Provider
              </label>
              <select
                id="ps-stt-provider-select"
                className="ps-select"
                aria-label="Speech-to-text provider"
                value={isCurrentSttAvailable ? sttProvider : ''}
                onChange={(e) => {
                  setDictationError(null);
                  handleSttProviderChange(e.target.value);
                }}
                disabled={isRecording || isTranscribing}
              >
                {!isCurrentSttAvailable && (
                  <option value="" disabled hidden>
                    {`${STT_SHORT_LABELS[sttProvider] ?? sttProvider} (Not configured)`}
                  </option>
                )}
                {visibleSttOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {usesSttApiKey(sttProvider) && isCurrentSttAvailable && (
              <div className="ps-field-group">
                <label htmlFor="ps-stt-model-input" className="ps-field-label">
                  Speech Model (Optional)
                </label>
                <input
                  id="ps-stt-model-input"
                  className="ps-select"
                  aria-label="Speech-to-text model"
                  placeholder="Provider default"
                  value={sttModel}
                  onChange={(e) => handleSttModelChange(e.target.value)}
                  disabled={isRecording || isTranscribing}
                />
              </div>
            )}

            {dictationError && (
              <div
                role="alert"
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: 11,
                  textAlign: 'left',
                  lineHeight: 1.4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div>⚠️ {dictationError}</div>
                {usesSttApiKey(sttProvider) && (
                  <button
                    type="button"
                    className="ps-btn ps-btn-primary"
                    style={{ alignSelf: 'flex-start', fontSize: 11, padding: '4px 8px' }}
                    onClick={() => handleSttProviderChange('system')}
                  >
                    Switch to System (Zana Voice)
                  </button>
                )}
              </div>
            )}

            {usesSttApiKey(sttProvider) && !sttKeyConfigured && !dictationError && (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  color: '#fde047',
                  fontSize: 11,
                  textAlign: 'left',
                  lineHeight: 1.4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div>
                  ℹ️ <strong>API key required:</strong> Direct {sttProvider === 'openai' ? 'OpenAI Whisper' : 'Google Gemini'} speech-to-text requires an API key in Zana Settings.
                </div>
                <button
                  type="button"
                  className="ps-btn ps-btn-primary"
                  style={{ alignSelf: 'flex-start', fontSize: 11, padding: '4px 8px' }}
                  onClick={() => handleSttProviderChange('system')}
                >
                  Switch to System (Zana Voice)
                </button>
              </div>
            )}

            <div className="ps-dictation-card">
              <button
                type="button"
                className={`ps-btn ${isRecording ? 'ps-btn-danger' : isTranscribing ? '' : 'ps-btn-primary'}`}
                style={{ width: '100%', justifyContent: 'center', padding: '10px 0', opacity: isTranscribing ? 0.8 : 1 }}
                onClick={handleToggleDictation}
                disabled={isTranscribing}
                aria-label={isTranscribing ? 'Transcribing audio' : isRecording ? 'Stop dictation' : 'Start dictation'}
              >
                <span className={isTranscribing ? 'ps-spin' : undefined}>{isTranscribing ? '⏳' : isRecording ? '⏹️' : '🎙️'}</span>
                <span>{isTranscribing ? 'Transcribing...' : isRecording ? `Stop Dictation (${recordingSeconds}s)` : 'Dictate Thoughts'}</span>
              </button>

              {isRecording && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="ps-meter-bar">
                    <div
                      className="ps-meter-fill"
                      style={{ width: `${Math.min(100, (audioLevel ?? 0.1) * 100)}%` }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--ps-text-muted)' }}>Listening live...</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: 10, color: 'var(--ps-text-subtle)', lineHeight: 1.3 }}>
              {sttProvider === 'system'
                ? 'Uses host Zana voice transcription without requiring external API keys.'
                : sttProvider === 'local-whisper'
                ? 'Transcribes on this device. Install the runtime and a model in Settings.'
                : sttKeyConfigured
                ? `Using direct ${sttProvider === 'openai' ? 'OpenAI Whisper' : 'Google Gemini'} speech-to-text.`
                : `⚠️ ${sttProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} requires an API key in Zana Settings. Choose System (Zana Voice) for built-in free dictation.`}
            </div>
          </section>

          {/* Model Selection Card (2-Step: Provider, then Model) */}
          <section className="ps-section">
            <div className="ps-section-title">
              <span>Refinement Engine</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--ps-text-muted)' }}>
                  {isLoadingModels && !hasHostProviders
                    ? 'Loading…'
                    : isLoadingModels
                    ? 'Refreshing…'
                    : activeProvider?.isComposerMatch
                    ? '★ Composer Active'
                    : 'AI Model'}
                </span>
                <button
                  type="button"
                  className="ps-btn"
                  style={{ padding: '2px 6px', fontSize: 10 }}
                  onClick={() => loadAvailableModels({ refresh: true })}
                  disabled={isLoadingModels || isRefining}
                  aria-label="Refresh models"
                  title="Reload models from Composer"
                >
                  {isLoadingModels ? '…' : '↻'}
                </button>
              </span>
            </div>

            {/* Provider Selector */}
            <div className="ps-field-group">
              <label htmlFor="ps-provider-select" className="ps-field-label">
                Provider
              </label>
              <select
                id="ps-provider-select"
                className="ps-select"
                aria-label="Refinement provider"
                value={activeProvider?.id ?? ''}
                onChange={(e) => handleProviderChange(e.target.value)}
                disabled={isRefining}
              >
                {providerOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}{p.isComposerMatch ? ' ★ (Composer)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selector */}
            <div className="ps-field-group">
              <label htmlFor="ps-model-select" className="ps-field-label">
                Model ({availableModelsForProvider.length})
              </label>
              <select
                id="ps-model-select"
                className="ps-select"
                aria-label="Refinement model"
                value={activeModel?.key || activeModel?.id || ''}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={isRefining || availableModelsForProvider.length === 0}
              >
                {availableModelsForProvider.length === 0 ? (
                  <option value="">No models available</option>
                ) : (
                  availableModelsForProvider.map((m) => (
                    <option key={m.key || m.id} value={m.key || m.id}>
                      {m.label}{m.isComposerMatch ? ' ★ (Composer)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {(activeProvider?.error || modelsLoadError) && (
              <div
                role="status"
                style={{
                  fontSize: 10.5,
                  color: '#fde047',
                  lineHeight: 1.35,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.25)'
                }}
              >
                {activeProvider?.error || modelsLoadError}
              </div>
            )}

            {/* Auto-cleanup Toggle for Composer Dictations */}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--ps-border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, fontWeight: 500, userSelect: 'none' }}>
                <input
                  type="checkbox"
                  aria-label="Auto-cleanup mic dictations"
                  checked={autoCleanupEnabled}
                  onChange={(e) => handleToggleAutoCleanup(e.target.checked)}
                />
                <span>Auto-cleanup mic dictations</span>
              </label>
              <span style={{ fontSize: 10, color: 'var(--ps-text-subtle)', lineHeight: 1.3 }}>
                {autoCleanupEnabled
                  ? `Composer mic cleans up using ${activeProvider?.displayName}${activeModel ? ` (${activeModel.label || activeModel.id})` : ''}.`
                  : 'Composer mic inserts raw transcript without AI cleanup.'}
              </span>
            </div>

            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ps-text-muted)', lineHeight: 1.35 }}>
              {activeProvider?.isComposerMatch ? (
                <span style={{ color: 'var(--accent, #3b82f6)', fontWeight: 600 }}>
                  ★ Synced to Composer: {activeProvider.displayName}{activeModel ? ` (${activeModel.label})` : ''}
                </span>
              ) : activeProvider?.id === 'assistant' ? (
                'Uses the active Zana assistant agent with no extra API key required.'
              ) : activeModel ? (
                <>Using <strong>{activeProvider?.displayName}</strong> · <code>{activeModel.id}</code></>
              ) : null}
              {lastUsedModel ? (
                <div style={{ marginTop: 3, color: 'var(--ps-text-subtle)', fontSize: 10 }}>
                  Last refined: {lastUsedModel}
                </div>
              ) : null}
            </div>
          </section>

          <section className="ps-section">
            <div className="ps-section-title">How should we improve it?</div>
            <div className="ps-presets-list" role="radiogroup" aria-label="How should we improve it?">
              {STUDIO_PRESETS.map((p) => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label className={`ps-preset-btn ${selectedPresetId === p.id ? 'active' : ''}`}>
                      <span className="preset-title">
                        <input type="radio" name="refinement-style" value={p.id}
                          checked={selectedPresetId === p.id} onChange={() => setSelectedPresetId(p.id)} />
                        {p.title}
                      </span>
                      <span className="preset-desc">{p.desc}</span>
                    </label>
                    {p.id === PRESET_IDS.improve && selectedPresetId === PRESET_IDS.improve && (
                      <div className="ps-tone-panel">
                        <div className="ps-tone-header">
                          <label htmlFor="ps-improve-tone-select">
                            <strong style={{ color: 'var(--text-primary, #e2e8f0)' }}>Tone</strong>
                          </label>
                          <span style={{ color: 'var(--ps-text-subtle)' }}>Same length</span>
                        </div>
                        <select
                          id="ps-improve-tone-select"
                          className="ps-select"
                          aria-label="Improvement tone"
                          value={selectedToneId}
                          onChange={(e) => setSelectedToneId(e.target.value as ImproveToneId)}
                          disabled={isRefining}
                        >
                          {IMPROVE_TONES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <div className="ps-tone-hint">{activeToneOption.desc}</div>
                      </div>
                    )}
                  </div>
              ))}
              <label className={`ps-preset-btn ${selectedPresetId === PRESET_IDS.custom ? 'active' : ''}`}>
                <span className="preset-title">
                  <input type="radio" name="refinement-style" value={PRESET_IDS.custom}
                    checked={selectedPresetId === PRESET_IDS.custom} onChange={() => setSelectedPresetId(PRESET_IDS.custom)} />
                  Custom instructions
                </span>
                <span className="preset-desc">Describe your own transformation.</span>
              </label>
              {selectedPresetId === PRESET_IDS.custom && (
                <textarea ref={customPromptInputRef} className="ps-custom-prompt-input"
                  aria-label="Custom instructions" placeholder="e.g. Turn into user stories with acceptance criteria..."
                  value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className={`ps-preset-btn ${selectedPresetId === PRESET_IDS.translate ? 'active' : ''}`}>
                  <span className="preset-title">
                    <input type="radio" name="refinement-style" value={PRESET_IDS.translate}
                      checked={selectedPresetId === PRESET_IDS.translate} onChange={() => setSelectedPresetId(PRESET_IDS.translate)} />
                    Translate
                  </span>
                  <span className="preset-desc">Translate into another language while keeping meaning.</span>
                </label>
                {selectedPresetId === PRESET_IDS.translate && (
                  <div className="ps-tone-panel">
                    <div className="ps-tone-header">
                      <label htmlFor="ps-translate-lang-select">
                        <strong style={{ color: 'var(--text-primary, #e2e8f0)' }}>Target language</strong>
                      </label>
                      <span style={{ color: 'var(--ps-text-subtle)' }}>Same meaning</span>
                    </div>
                    <select
                      id="ps-translate-lang-select"
                      className="ps-select"
                      aria-label="Target language"
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      disabled={isRefining}
                    >
                      {TARGET_LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>

        {/* ─── Main Editor Canvas (Dual Pane Vertical Layout) ────────────────── */}
        <main className="ps-editor-canvas">

          {/* Top Pane: Raw / Spoken Input */}
          <section className="ps-pane">
            <div className="ps-pane-header">
              <div className="ps-pane-title">
                <span>📝</span>
                <span>Raw Input Draft</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="ps-btn"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={handlePasteInput}
                  title="Paste from clipboard into input draft"
                  aria-label="Paste into input draft"
                >
                  📋 Paste
                </button>
                <button
                  type="button"
                  className="ps-btn"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={handleCopyInput}
                  disabled={!inputText}
                  title="Copy raw input"
                  aria-label="Copy raw input"
                >
                  {isCopiedInput ? '✅ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>
            <textarea
              className="ps-textarea"
              placeholder="Type your raw thoughts or click Dictate in the left sidebar to speak..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              aria-label="Raw Input Text"
            />
          </section>

          {/* Middle Action Bar: Clear visual separation & quick actions */}
          <div className="ps-action-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span className="ps-pill">
                {getPipelineLabel(selectedPresetId, activeToneOption.label, targetLanguage)}
              </span>
              <span style={{ color: 'var(--ps-text-muted)' }}>
                {inputText.trim() ? `${inputText.trim().split(/\s+/).length} words ready` : 'Add text to get started'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="ps-btn ps-btn-primary"
                onClick={() => handleRefine()}
                disabled={isRefining || !inputText.trim() || !activeModel || (selectedPresetId === PRESET_IDS.custom && !customPrompt.trim())}
                title={selectedPresetId === PRESET_IDS.translate ? 'Translate raw draft into the selected language' : 'Transform raw draft into output'}
              >
                <span>{isRefining ? '⏳' : '⚡'}</span>
                <span>{getActionButtonLabel(selectedPresetId, isRefining)}</span>
              </button>
            </div>
          </div>

          {/* Bottom Pane: Result */}
          <section className="ps-pane">
            <div className="ps-pane-header">
              <div className="ps-pane-title">
                <span>✨</span>
                <span>Result</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {outputText && (
                  <button
                    type="button"
                    className="ps-btn"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => setShowDiff((v) => !v)}
                    title="Toggle inline diff against input draft"
                  >
                    <span>{showDiff ? '👁️' : '🔍'}</span>
                    <span>{showDiff ? 'View Clean' : 'View Diff'}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="ps-btn"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={handleReplaceInput}
                  disabled={!outputText}
                  title="Move output to input draft for iterative re-refinement"
                >
                  ⬆ Replace Input
                </button>
                <button
                  type="button"
                  className="ps-btn"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={handleCopyOutput}
                  disabled={!outputText}
                  title="Copy refined text to clipboard"
                  aria-label="Copy refined output"
                >
                  {isCopiedOutput ? '✅ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>

            {showDiff && outputText ? (
              <div className="ps-output-view">
                {diffTokens.map((token, idx) => {
                  if (token.type === 'added') {
                    return (
                      <span key={idx} className="ps-diff-added">
                        {token.text}
                      </span>
                    );
                  }
                  if (token.type === 'removed') {
                    return (
                      <span key={idx} className="ps-diff-removed">
                        {token.text}
                      </span>
                    );
                  }
                  return (
                    <span key={idx} className="ps-diff-unchanged">
                      {token.text}
                    </span>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="ps-textarea"
                placeholder="Your improved, structured, or translated text will appear here..."
                value={outputText}
                onChange={(e) => setOutputText(e.target.value)}
                aria-label="Refined output"
              />
            )}
          </section>

          {/* Bottom Action Bar: Clear & Insert into Composer */}
          <div className="ps-action-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              {insertNotice ? (
                <span className="ps-badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#86efac' }}>
                  {insertNotice}
                </span>
              ) : (
                <span style={{ color: 'var(--ps-text-muted)' }}>
                  {outputText
                    ? 'Ready to insert refined result into Composer'
                    : inputText
                    ? 'Ready to insert raw draft into Composer'
                    : 'Draft or refine a prompt to insert into Composer'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="ps-btn"
                onClick={handleClearAll}
                title="Clear current input and output"
                disabled={!inputText && !outputText}
              >
                <span>🗑️</span>
                <span>Clear</span>
              </button>
              <button
                type="button"
                className="ps-btn ps-btn-primary"
                onClick={handleInsertIntoComposer}
                disabled={!inputText && !outputText}
                title="Append current text directly into Zana Composer"
              >
                <span>💬</span>
                <span>Insert into Composer</span>
              </button>
            </div>
          </div>

        </main>

      </div>

      }
      {/* ─── Bottom Status Bar ──────────────────────────────────────────────── */}
      <footer className="ps-status-bar">
        <div style={{ display: 'flex', gap: 12 }}>
          <span>Input: {inputStats}</span>
          <span>Output: {outputStats}</span>
          {statusNotice && (
            <span style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500 }}>
              {statusNotice}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>Engine: {activeProvider?.displayName} · {activeModel?.label ?? 'No model'}</span>
          <span className="ps-pill">
            Mic cleanup: {autoCleanupEnabled ? `${activeProvider?.displayName}${activeModel ? ` (${activeModel.label || activeModel.id})` : ''}` : 'Off (Raw)'}
          </span>
          {activeProvider?.isComposerMatch && (
            <span className="ps-pill" style={{ color: 'var(--accent, #3b82f6)' }}>
              ★ Composer Synced
            </span>
          )}
          <span>Zana Prompt Studio</span>
        </div>
      </footer>
    </div>
  );
}
