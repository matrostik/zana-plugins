import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StudioSettings } from './StudioSettings.tsx';
import { useComposer, useComposerView, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import {
  AVAILABLE_MODELS_METHOD,
  REPHRASE_METHOD,
  STATUS_METHOD,
  TRANSCRIBE_METHOD,
  type AvailableModelsResponse,
  type DiscoveredModel,
  type DiscoveredProvider,
  type LlmProviderId,
  type RephraseResponse,
  type StatusResponse,
  type TranscribeResponse
} from '../shared/protocol.ts';
import { appendTranscript } from './appendText.ts';
import { defaultStartSession, type RecordingSession } from './recorder.ts';
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

const FALLBACK_PROVIDERS: ProviderOption[] = [
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    models: [
      { id: 'claude-haiku-4-5-20251001', key: 'anthropic-haiku', label: 'Claude 4.5 Haiku', providerId: 'anthropic' },
      { id: 'claude-sonnet-5-20260201', key: 'anthropic-sonnet', label: 'Claude 5 Sonnet', providerId: 'anthropic' }
    ]
  },
  {
    id: 'google',
    displayName: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-flash', key: 'google-flash', label: 'Gemini 2.5 Flash', providerId: 'google' }
    ]
  },
  {
    id: 'openai',
    displayName: 'OpenAI',
    models: [
      { id: 'gpt-5.4-nano', key: 'openai-fast', label: 'GPT-5.4 Nano (Fast)', providerId: 'openai' },
      { id: 'gpt-5.6-luna', key: 'openai-smart', label: 'GPT-5.6 Luna (Smart)', providerId: 'openai' }
    ]
  },
  {
    id: 'assistant',
    displayName: 'Zana Assistant',
    models: [
      {
        id: 'assistant',
        key: 'assistant',
        label: 'Local / Active Thread Agent',
        providerId: 'assistant'
      }
    ]
  }
];

function useSafeComposerView() {
  try {
    return useComposerView();
  } catch {
    return null;
  }
}

export interface PromptStudioProps {
  /** Optional custom session starter for tests */
  startSession?: () => Promise<RecordingSession>;
}

export function PromptStudio({ startSession = defaultStartSession }: PromptStudioProps): React.ReactElement {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rpc = useRpc();
  const composer = useComposer();
  const composerView = useSafeComposerView();
  const composerProviderId = composerView?.providerId;
  const composerFamilyId = composerView?.familyId;

  // Track if user explicitly selected a model so we don't clobber it
  const userManuallySelectedModel = useRef(false);

  // ─── Workspace State ─────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isCopiedOutput, setIsCopiedOutput] = useState(false);
  const [isCopiedInput, setIsCopiedInput] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [insertNotice, setInsertNotice] = useState<string | null>(null);

  // ─── Model & Status State ───────────────────────────────────────────────────
  const [discoveredProviders, setDiscoveredProviders] = useState<DiscoveredProvider[] | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('assistant');
  const [selectedModelId, setSelectedModelId] = useState<string>('assistant');
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
  const activeSessionRef = useRef<RecordingSession | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const customPromptInputRef = useRef<HTMLTextAreaElement>(null);

  // Load saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inputText) setInputText(parsed.inputText);
        if (parsed.outputText) setOutputText(parsed.outputText);
        if (parsed.selectedProviderId) setSelectedProviderId(parsed.selectedProviderId);
        if (parsed.selectedModelId) {
          userManuallySelectedModel.current = true;
          setSelectedModelId(parsed.selectedModelId);
        }
        if (parsed.sttProvider) setSttProvider(parsed.sttProvider);
        if (parsed.sttModel) setSttModel(parsed.sttModel);
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);


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
    rpc
      .call(STATUS_METHOD)
      .then((res) => applyStatus(res as StatusResponse))
      .catch(() => undefined);
  }, [rpc, applyStatus]);

  useEffect(() => {
    let isCurrent = true;
    rpc
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
  }, [rpc]);

  useEffect(() => {
    let isCurrent = true;
    rpc
      .call('promptVoice.settings.get')
      .then((res) => {
        if (!isCurrent) return;
        const s = (res || {}) as Record<string, string>;
        if (s.sttProvider) setSttProvider(s.sttProvider);
        if (s.sttModel) setSttModel(s.sttModel);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [rpc]);

  // Fetch dynamic models catalog from host providers
  useEffect(() => {
    let isCurrent = true;
    rpc
      .call(AVAILABLE_MODELS_METHOD)
      .then((res) => {
        if (!isCurrent) return;
        const providers = res as AvailableModelsResponse;
        if (Array.isArray(providers) && providers.length > 0) {
          setDiscoveredProviders(providers);
        }
      })
      .catch(() => {
        // Fall back gracefully to FALLBACK_PROVIDERS
      });
    return () => {
      isCurrent = false;
    };
  }, [rpc]);

  // Assemble provider and model list, ordered alphabetically (A-Z)
  const providerOptions: ProviderOption[] = useMemo(() => {
    const sortAlphabetically = <T,>(items: T[], getText: (item: T) => string): T[] => {
      return [...items].sort((a, b) =>
        getText(a).localeCompare(getText(b), undefined, { sensitivity: 'base', numeric: true })
      );
    };

    if (!discoveredProviders || discoveredProviders.length === 0) {
      const providers = FALLBACK_PROVIDERS.map((p) => {
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
      'assistant:assistant': 'assistant',
      'openai:gpt-5.4-nano': 'openai-fast',
      'openai:gpt-5.6-luna': 'openai-smart',
      'anthropic:claude-haiku-4-5-20251001': 'anthropic-haiku',
      'anthropic:claude-sonnet-5-20260201': 'anthropic-sonnet',
      'google:gemini-2.5-flash': 'google-flash'
    };

    const providers = discoveredProviders.map((prov) => {
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

  // Auto-sync with composer if user has not explicitly picked a model
  useEffect(() => {
    if (!userManuallySelectedModel.current && providerOptions.length > 0) {
      const composerMatch = providerOptions.find((p) => p.isComposerMatch);
      if (composerMatch) {
        setSelectedProviderId(composerMatch.id);
        if (composerMatch.models.length > 0) {
          setSelectedModelId(composerMatch.models[0].key || composerMatch.models[0].id);
        }
      }
    }
  }, [providerOptions]);

  // Auto-save draft on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ inputText, outputText, selectedProviderId, selectedModelId, sttProvider, sttModel })
      );
    } catch {
      // Ignore storage write errors
    }
  }, [inputText, outputText, selectedProviderId, selectedModelId, sttProvider, sttModel]);

  // Auto-cleanup toggle handler for composer dictations
  const handleToggleAutoCleanup = (enabled: boolean) => {
    setAutoCleanupEnabled(enabled);
    const targetProvider = enabled ? (activeProvider?.id ?? 'assistant') : 'none';
    const targetModel = enabled ? (activeModel?.id ?? 'assistant') : '';
    setServerLlmProvider(targetProvider);
    rpc
      .call('promptVoice.settings.update', {
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
      .call('promptVoice.settings.update', {
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
      .call('promptVoice.settings.update', {
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
        .call('promptVoice.settings.update', {
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
        .call('promptVoice.settings.update', {
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

  // ─── Voice Dictation Handler ─────────────────────────────────────────────────
  const handleToggleDictation = async () => {
    if (isRecording) {
      // Stop active recording
      setIsRecording(false);
      setAudioLevel(null);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);

      const session = activeSessionRef.current;
      activeSessionRef.current = null;
      if (!session) return;

      setIsTranscribing(true);

      try {
        const audio = await prepareAudioForUpload(rpc, await session.stop());
        const response = (await rpc.call(TRANSCRIBE_METHOD, {
          audio: audio.base64,
          mimeType: audio.mimeType,
          transcriptionOnly: true
        })) as TranscribeResponse;

        if (response.ok && response.status === 'ok') {
          setInputText((prev) => appendTranscript(prev, response.text));
          setDictationError(null);
        } else if (response.ok && response.status === 'no-speech') {
          setStatusNotice('No speech detected. Try speaking closer to the microphone.');
          setTimeout(() => setStatusNotice(null), 4000);
        } else if (!response.ok) {
          setStatusNotice(response.message);
          setDictationError(response.message);
          if (response.code === 'MISSING_KEY') {
            setSttKeyConfigured(false);
          }
        }
      } catch (err) {
        setStatusNotice(err instanceof Error ? err.message : 'Transcription failed.');
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      setDictationError(null);
      setStatusNotice(null);

      if (sttProvider !== 'system' && !sttKeyConfigured) {
        const provName = sttProvider === 'openai' ? 'OpenAI' : 'Google Gemini';
        setDictationError(`API key required for direct ${provName} speech-to-text. Switch to System (Zana Voice) below to dictate using host voice.`);
        setStatusNotice(`API key required for ${provName}. Switch to System (Zana Voice) to dictate thoughts.`);
        return;
      }

      try {
        const session = await startSession();
        activeSessionRef.current = session;
        setIsRecording(true);
        setRecordingSeconds(0);

        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((s) => s + 1);
        }, 1000);

        meterIntervalRef.current = setInterval(() => {
          if (activeSessionRef.current) {
            const level = activeSessionRef.current.getAudioLevel?.() ?? null;
            setAudioLevel(level);
          }
        }, 100);
      } catch (err) {
        setStatusNotice(err instanceof Error ? err.message : 'Microphone access denied.');
      }
    }
  };

  // ─── Refinement Handler ──────────────────────────────────────────────────────
  const handleRefine = async () => {
    const raw = inputText.trim();
    if (!raw || isRefining || (selectedPresetId === 'custom' && !customPrompt.trim())) return;

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

    try {
      composer.updateText((draft) => appendTranscript(draft, textToInsert));
      composer.focus();
      setInsertNotice('Inserted into Composer!');
      setTimeout(() => setInsertNotice(null), 2500);
    } catch {
      setStatusNotice('Composer focus unavailable.');
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

  return (
    <div className="ps-container" onKeyDown={handleKeyDown}>
      <style>{PROMPT_STUDIO_STYLES}</style>

      {/* ─── Studio Header (Simplified, No Name Input) ──────────────────────── */}
      <header className="ps-header">
        <div className="ps-header-left">
          <span style={{ fontSize: 18 }}>🎙️</span>
          <span className="ps-header-title">Prompt Studio</span>
          <span className="ps-badge">Voice & AI Refinement</span>
          {insertNotice && (
            <span className="ps-badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#86efac' }}>
              {insertNotice}
            </span>
          )}
        </div>

        <div className="ps-header-actions">
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
      </header>

      {/* ─── Workspace Layout ───────────────────────────────────────────────── */}
      {settingsOpen ? <StudioSettings rpc={rpc} onBack={() => setSettingsOpen(false)} /> : <div className="ps-workspace">

        {/* ─── Left Sidebar Controls ────────────────────────────────────────── */}
        <aside className="ps-sidebar">

          {/* Model Selection Card (2-Step: Provider, then Model) */}
          <section className="ps-section">
            <div className="ps-section-title">
              <span>Refinement Engine</span>
              <span style={{ fontSize: 10, color: 'var(--ps-text-muted)' }}>
                {activeProvider?.isComposerMatch ? '★ Composer Active' : 'AI Model'}
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
                {availableModelsForProvider.map((m) => (
                  <option key={m.key || m.id} value={m.key || m.id}>
                    {m.label}{m.isComposerMatch ? ' ★ (Composer)' : ''}
                  </option>
                ))}
              </select>
            </div>

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
                  ? `Composer mic cleans up using ${activeProvider?.displayName} (${activeModel?.label || activeModel?.id}).`
                  : 'Composer mic inserts raw transcript without AI cleanup.'}
              </span>
            </div>

            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ps-text-muted)', lineHeight: 1.35 }}>
              {activeProvider?.isComposerMatch ? (
                <span style={{ color: 'var(--accent, #3b82f6)', fontWeight: 600 }}>
                  ★ Synced to Composer: {activeProvider.displayName} ({activeModel?.label})
                </span>
              ) : activeProvider?.id === 'assistant' ? (
                'Uses the active Zana assistant agent with no extra API key required.'
              ) : (
                <>Using <strong>{activeProvider?.displayName}</strong> · <code>{activeModel?.id}</code></>
              )}
              {lastUsedModel ? (
                <div style={{ marginTop: 3, color: 'var(--ps-text-subtle)', fontSize: 10 }}>
                  Last refined: {lastUsedModel}
                </div>
              ) : null}
            </div>
          </section>

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
                disabled={isRefining || !inputText.trim() || (selectedPresetId === 'custom' && !customPrompt.trim())}
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
          <span>Engine: {activeProvider?.displayName} · {activeModel?.label}</span>
          <span className="ps-pill">
            Mic cleanup: {autoCleanupEnabled ? `${activeProvider?.displayName} (${activeModel?.label || activeModel?.id})` : 'Off (Raw)'}
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
