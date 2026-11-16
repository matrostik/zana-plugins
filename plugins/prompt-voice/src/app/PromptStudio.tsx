import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StudioSettings } from './StudioSettings.tsx';
import type { PluginDetachedTabProps } from '@zana-ai/zcc-plugin-sdk/app';
import {
  AVAILABLE_MODELS_METHOD,
  MODELS_UPDATED_EVENT,
  REPHRASE_METHOD,
  SETTINGS_GET_METHOD,
  SETTINGS_UPDATE_METHOD,
  STATUS_METHOD,
  TRANSCRIBE_METHOD,
  type AvailableModelsResponse,
  type DiscoveredProvider,
  type RephraseResponse,
  type StatusResponse,
  type TranscribeResponse
} from '../shared/protocol.ts';
import { appendTranscript } from './appendText.ts';
import { DEFAULT_MIC_DEVICE_ID, type AudioPreferences } from '../shared/audioPreferences.ts';
import { readCachedAudioPreferences, writeCachedAudioPreferences } from './audioPreferencesStorage.ts';
import { ensureStylesInjected } from './injectStyles.ts';
import { defaultStartSession, type RecordingSession, type StartRecordingOptions } from './recorder.ts';
import {
  updatePluginSettings,
  usePromptVoiceRpc,
  useSafeComposer,
  useSafeComposerView,
  useSafeRealtime,
  useSafeZccNavigate,
  useVisibilitySettings
} from './safeSdk.ts';
import { playSoundCue } from './soundCues.ts';
import { prepareAudioForUpload } from './wav.ts';
import { computeWordDiff, type DiffToken } from './textDiff.ts';

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
  }

  .ps-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
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

async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Modern Async Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Async clipboard failed or permission denied, fallback
    }
  }

  // 2. Synchronous execCommand fallback
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) return true;
    } catch {
      // execCommand failed
    }
  }

  return false;
}

const STORAGE_KEY = 'zcc:prompt-voice:studio-draft:v1';

export function draftStorageKey(projectId?: string): string {
  return projectId ? `${STORAGE_KEY}:project:${projectId}` : STORAGE_KEY;
}

export interface PresetDef {
  id: string;
  title: string;
  icon: string;
  desc: string;
  prompt: string;
  tone: 'formal' | 'casual' | 'technical' | 'conversational';
}

export const STUDIO_PRESETS: PresetDef[] = [
  {
    id: 'polish',
    title: 'Clean up writing',
    icon: '✨',
    desc: 'Fix punctuation, grammar, and stuttering.',
    prompt: 'Clean up disfluencies, typos, and improve sentence flow without altering intent.',
    tone: 'technical'
  },
  {
    id: 'executive',
    title: 'Summarize',
    icon: '⚡',
    desc: 'Condense into punchy bullet points.',
    prompt: 'Summarize the core request into crisp, high-level executive bullet points.',
    tone: 'formal'
  },
  {
    id: 'spec',
    title: 'Create a technical spec',
    icon: '📐',
    desc: 'Format with Goals, Context, Steps.',
    prompt: 'Transform into a structured technical spec with ## Goal, ## Architecture, and ## Implementation Steps.',
    tone: 'technical'
  },
  {
    id: 'chat',
    title: 'Make it conversational',
    icon: '💬',
    desc: 'Natural, conversational tone.',
    prompt: 'Rephrase in a warm, polite, and helpful conversational tone.',
    tone: 'conversational'
  }
];

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

export function PromptStudio({
  pluginId,
  projectId,
  headerActions,
  startSession = defaultStartSession
}: PromptStudioProps): React.ReactElement {
  ensureStylesInjected();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rpc = usePromptVoiceRpc(pluginId);
  const composer = useSafeComposer();
  const composerView = useSafeComposerView();
  const navigate = useSafeZccNavigate();
  const visibility = useVisibilitySettings();
  const composerProviderId = composerView?.providerId;
  const composerFamilyId = composerView?.familyId;
  const storageKey = draftStorageKey(projectId);

  // Track if user explicitly selected a model so we don't clobber it
  const userManuallySelectedModel = useRef(false);
  const loadedStorageKeyRef = useRef<string | null>(null);

  // ─── Workspace State ─────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
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
  const [selectedPresetId, setSelectedPresetId] = useState<string>('polish');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // ─── Voice Dictation State ───────────────────────────────────────────────────
  const [sttProvider, setSttProvider] = useState<string>('system');
  const [sttModel, setSttModel] = useState<string>('');
  const [sttKeyConfigured, setSttKeyConfigured] = useState<boolean>(true);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number | null>(null);
  const [audioPrefs, setAudioPrefs] = useState<AudioPreferences>(() => readCachedAudioPreferences());
  const audioPrefsRef = useRef<AudioPreferences>(audioPrefs);
  audioPrefsRef.current = audioPrefs;
  const activeSessionRef = useRef<RecordingSession | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const customPromptInputRef = useRef<HTMLTextAreaElement>(null);

  // Load saved draft on mount and when switching project scopes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setInputText(typeof parsed.inputText === 'string' ? parsed.inputText : '');
        setOutputText(typeof parsed.outputText === 'string' ? parsed.outputText : '');
        if (parsed.selectedProviderId) setSelectedProviderId(parsed.selectedProviderId);
        if (parsed.selectedModelId) setSelectedModelId(parsed.selectedModelId);
        userManuallySelectedModel.current = parsed.userManuallySelected === true;
        if (parsed.sttProvider) setSttProvider(parsed.sttProvider);
        if (parsed.sttModel) setSttModel(parsed.sttModel);
      } else {
        setInputText('');
        setOutputText('');
        userManuallySelectedModel.current = false;
      }
    } catch {
      // Ignore storage read errors
    }
    loadedStorageKeyRef.current = storageKey;
  }, [storageKey]);

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

  const hasHostProviders = useMemo(
    () =>
      (discoveredProviders ?? []).some(
        (p) => p.providerId !== 'assistant' && Array.isArray(p.models) && p.models.length > 0
      ),
    [discoveredProviders]
  );

  // Assemble provider and model list, ordered alphabetically (A-Z)
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
        const sortedModels = sortAlphabetically(p.models, (m) => m.label || m.id).map((m) => ({
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

      const models: DiscoveredModelOption[] = sortAlphabetically(
        prov.models,
        (m) => m.label || m.id
      ).map((m) => {
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
        setSelectedModelId((prev) => {
          const keepsPrevious = composerMatch.models.some((m) => m.id === prev || m.key === prev);
          if (keepsPrevious) return prev;
          return composerMatch.models[0].key || composerMatch.models[0].id;
        });
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

  // Auto-save draft on change after initial load of the active storageKey
  useEffect(() => {
    if (loadedStorageKeyRef.current !== storageKey) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          inputText,
          outputText,
          selectedProviderId,
          selectedModelId,
          userManuallySelected: userManuallySelectedModel.current,
          sttProvider,
          sttModel
        })
      );
    } catch {
      // Ignore storage write errors
    }
  }, [storageKey, inputText, outputText, selectedProviderId, selectedModelId, sttProvider, sttModel]);

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
        transcriptionOnly: true
      })) as TranscribeResponse;

      if (response.ok && response.status === 'ok') {
        playSoundCue('complete', cueOpts);
        setInputText((prev) => appendTranscript(prev, response.text));
        setDictationError(null);
      } else if (response.ok && response.status === 'no-speech') {
        setStatusNotice('No speech detected. Try speaking closer to the microphone.');
        setTimeout(() => setStatusNotice(null), 4000);
      } else if (!response.ok) {
        playSoundCue('error', cueOpts);
        setStatusNotice(response.message);
        setDictationError(response.message);
        if (response.code === 'MISSING_KEY') setSttKeyConfigured(false);
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
    if (sttProvider !== 'system' && !sttKeyConfigured) {
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
        setIsRecording(false);
        setAudioLevel(null);
        clearStudioTimers();
        playSoundCue('error', cueOpts);
        setDictationError(err.message);
        setStatusNotice(err.message);
      };
      activeSessionRef.current = session;
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
  }, [loadStudioSettings, refreshStatus, updateAudioPrefsIfChanged]);

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
    if (!raw || isRefining || !activeModel || (selectedPresetId === 'custom' && !customPrompt.trim())) return;

    const activePreset = STUDIO_PRESETS.find((p) => p.id === selectedPresetId);
    const instruction = selectedPresetId === 'custom' ? customPrompt.trim() : activePreset?.prompt || 'Polish and format for clarity.';
    const tone = activePreset?.tone || 'technical';

    const providerToUse = activeProvider?.id ?? 'assistant';
    const modelToUse = activeModel?.id ?? 'assistant';

    setStatusNotice(null);
    setIsRefining(true);

    try {
      const response = (await rpc.call(REPHRASE_METHOD, {
        text: raw,
        tone,
        customPrompt: instruction,
        llmProvider: providerToUse,
        llmModel: modelToUse
      })) as RephraseResponse;

      if (response.ok) {
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
    setInputText('');
    setOutputText('');
    setSelectedPresetId('polish');
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

  const handleInsertIntoComposer = () => {
    const textToInsert = outputText || inputText;
    if (!textToInsert) return;

    if (composer && typeof composer.updateText === 'function') {
      try {
        composer.updateText((draft) => appendTranscript(draft, textToInsert));
        composer.focus?.();
        setInsertNotice('Inserted into Composer!');
        setTimeout(() => setInsertNotice(null), 2500);
        return;
      } catch {
        // Fall through when no active thread composer is focused.
      }
    }

    if (navigate && typeof navigate.toCompose === 'function') {
      navigate.toCompose({ initialPrompt: textToInsert, focusPrompt: true });
      setInsertNotice('Opened in New Thread Composer!');
      setTimeout(() => setInsertNotice(null), 2500);
      return;
    }

    void copyToClipboard(textToInsert).then((copied) => {
      setStatusNotice(
        copied
          ? 'No active composer — copied prompt to clipboard.'
          : 'Composer focus unavailable.'
      );
    });
  };

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
      setSelectedPresetId('custom');
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

  return (
    <div className="ps-container" onKeyDown={handleKeyDown}>
      <style>{PROMPT_STUDIO_STYLES}</style>

      {/* ─── Studio Header (Simplified, No Name Input) ──────────────────────── */}
      <header className="ps-header">
        <div className="ps-header-left">
          <span style={{ fontSize: 18 }}>🎙️</span>
          <span className="ps-header-title">Prompt Studio</span>
          <span className="ps-badge">Voice & AI Refinement</span>
          {projectId ? <span className="ps-badge ps-badge-project">Project</span> : null}
        </div>
        {headerActions ? <div className="ps-header-actions">{headerActions}</div> : null}
      </header>

      {/* ─── Workspace Layout ───────────────────────────────────────────────── */}
      {settingsOpen ? <StudioSettings rpc={rpc} pluginId={pluginId} onBack={handleSettingsClosed} /> : <div className="ps-workspace">

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
                value={sttProvider}
                onChange={(e) => {
                  setDictationError(null);
                  handleSttProviderChange(e.target.value);
                }}
                disabled={isRecording || isTranscribing}
              >
                {STT_PROVIDER_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {usesSttApiKey(sttProvider) && (
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

            {sttProvider !== 'system' && !sttKeyConfigured && !dictationError && (
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
                <label key={p.id} className={`ps-preset-btn ${selectedPresetId === p.id ? 'active' : ''}`}>
                  <span className="preset-title">
                    <input type="radio" name="refinement-style" value={p.id}
                      checked={selectedPresetId === p.id} onChange={() => setSelectedPresetId(p.id)} />
                    {p.title}
                  </span>
                  <span className="preset-desc">{p.desc}</span>
                </label>
              ))}
              <label className={`ps-preset-btn ${selectedPresetId === 'custom' ? 'active' : ''}`}>
                <span className="preset-title">
                  <input type="radio" name="refinement-style" value="custom"
                    checked={selectedPresetId === 'custom'} onChange={() => setSelectedPresetId('custom')} />
                  Custom instructions
                </span>
                <span className="preset-desc">Describe your own transformation.</span>
              </label>
            </div>
            {selectedPresetId === 'custom' && (
              <textarea ref={customPromptInputRef} className="ps-custom-prompt-input"
                aria-label="Custom instructions" placeholder="e.g. Turn into user stories with acceptance criteria..."
                value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
            )}
          </section>

          <button type="button" className="ps-btn" style={{ marginTop: 'auto' }} onClick={() => setSettingsOpen(true)}>Settings</button>
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
                <button
                  type="button"
                  className="ps-btn"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => setInputText('')}
                  disabled={!inputText}
                  title="Clear input"
                >
                  Clear
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
              <span className="ps-pill">⬇ Refine pipeline</span>
              <span style={{ color: 'var(--ps-text-muted)' }}>
                {inputText.trim() ? `${inputText.trim().split(/\s+/).length} words ready` : 'Add text to get started'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="ps-btn ps-btn-primary"
                onClick={() => handleRefine()}
                disabled={isRefining || !inputText.trim() || !activeModel || (selectedPresetId === 'custom' && !customPrompt.trim())}
                title="Transform raw draft into polished output"
              >
                <span>{isRefining ? '⏳' : '⚡'}</span>
                <span>{isRefining ? 'Refining...' : 'Refine text'}</span>
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
                placeholder="Polished, structured output will appear here after clicking Refine..."
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
