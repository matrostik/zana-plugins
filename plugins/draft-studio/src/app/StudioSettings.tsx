import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalWhisperSettings } from './LocalWhisperSettings.tsx';
import { VisibilitySettingsSection } from './VisibilitySettingsSection.tsx';
import {
  DEFAULT_MIC_DEVICE_ID,
  DEFAULT_SOUND_CUES_ENABLED,
  DEFAULT_SOUND_CUES_VOLUME,
  parseAudioPreferences,
  type AudioPreferences
} from '../shared/audioPreferences.ts';
import {
  DICTIONARY_MAX_TERMS,
  addDictionaryTerms,
  formatDictionary,
  parseDictionary
} from '../shared/dictionary.ts';
import {
  DEFAULT_HISTORY_ENABLED,
  DEFAULT_HISTORY_MAX_DAYS,
  DEFAULT_HISTORY_MAX_ENTRIES,
  HISTORY_MAX_DAYS_OPTIONS,
  HISTORY_MAX_ENTRIES_OPTIONS,
  parseHistoryPreferences,
  type HistoryPreferences
} from '../shared/historyPreferences.ts';
import { INPUT_LANGUAGE_OPTIONS } from '../shared/languages.ts';
import {
  HISTORY_CLEAR_METHOD,
  MODELS_UPDATED_EVENT,
  SETTINGS_CHANGED_EVENT,
  SETTINGS_GET_METHOD,
  SETTINGS_UPDATE_METHOD,
  STATUS_METHOD,
  TONE_IDS,
  resolveAvailableSttProviders,
  type HistoryClearResponse,
  type StatusResponse
} from '../shared/protocol.ts';
import type { AudioInputDevice } from './audioDevices.ts';
import { writeCachedAudioPreferences } from './audioPreferencesStorage.ts';
import { ensureStylesInjected } from './injectStyles.ts';
import { useSafeRealtime } from './safeSdk.ts';
import { playSoundCue } from './soundCues.ts';
import { useAudioDevices, type AudioDevicesState } from './useAudioDevices.ts';

type Settings = Record<string, string>;
type Rpc = { call(method: string, input?: unknown): Promise<unknown> };
type Field = { key: string; label: string; options?: string[]; multiline?: boolean; secret?: boolean; help?: string };

const sections: Record<string, Field[]> = {
  'Voice & transcription': [
    {
      key: 'sttProvider',
      label: 'Speech-to-text provider',
      options: ['system', 'google-gemini', 'openai', 'local-whisper'],
      help: 'Only configured speech providers are shown. Add API keys in Zana’s Draft Studio plugin settings or set up Local Whisper below.'
    },
    {
      key: 'inputLanguage',
      label: 'Input language',
      options: INPUT_LANGUAGE_OPTIONS.map((lang) => lang.code),
      help: 'Spoken language for transcription, or Detect automatically.'
    },
    {
      key: 'dictionary',
      label: 'Personal dictionary',
      help: 'Add specific names, acronyms, or technical terms to guarantee accurate spelling.'
    }
  ],
  'Draft Studio': [
    {
      key: 'tone',
      label: 'Cleanup tone',
      options: [...TONE_IDS],
      help: 'Fixes grammar and clarity in the original language without extending text length.'
    },
    { key: 'customPrompt', label: 'Custom cleanup instructions', multiline: true }
  ],
  'Connections': []
};

const defaults: Settings = { sttProvider: 'system', inputLanguage: 'auto', tone: 'standard' };
const names: Record<string, string> = {
  ...Object.fromEntries(INPUT_LANGUAGE_OPTIONS.map((lang) => [lang.code, lang.label])),
  standard: 'Standard (Fix & clarify)',
  casual: 'Casual',
  conversational: 'Conversational',
  formal: 'Professional',
  technical: 'Technical',
  custom: 'Custom',
  system: 'Zana voice',
  none: 'Off',
  assistant: 'Zana assistant',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  'google-gemini': 'Google Gemini',
  'local-whisper': 'Local Whisper (on this device)'
};

function describeMicrophoneStatus(
  audio: AudioDevicesState,
  prefs: AudioPreferences,
  matchedDevice: AudioInputDevice | undefined
): { warn: boolean; text: string } {
  if (audio.error) return { warn: true, text: audio.error };
  if (audio.permissionDenied) {
    return { warn: true, text: 'Microphone permission denied. Allow microphone access in system settings to see device names.' };
  }
  if (prefs.micDeviceId !== DEFAULT_MIC_DEVICE_ID && !matchedDevice) {
    return { warn: true, text: 'Selected microphone is currently disconnected. Recording will fall back to System default until reconnected.' };
  }
  if (!audio.labelsAvailable && audio.devices.length > 0) {
    return { warn: false, text: 'Device names are hidden until microphone access is granted. Click Refresh to detect names.' };
  }
  if (prefs.micDeviceId === DEFAULT_MIC_DEVICE_ID) {
    return { warn: false, text: 'Uses your OS default input device. Saved selection applies to Draft Studio and Composer dictation.' };
  }
  return { warn: false, text: `Using ${matchedDevice?.label ?? (prefs.micLabel || prefs.micDeviceId)}. Saved until you choose another mic.` };
}

function MicrophonePicker({
  prefs,
  audio,
  onSelect
}: {
  prefs: AudioPreferences;
  audio: AudioDevicesState;
  onSelect: (deviceId: string, label: string) => void;
}) {
  const matched = audio.devices.find((d) => d.deviceId === prefs.micDeviceId);
  const isDisconnected = prefs.micDeviceId !== DEFAULT_MIC_DEVICE_ID && !matched;
  const status = describeMicrophoneStatus(audio, prefs, matched);
  const systemDefaultText = audio.defaultDeviceLabel ? `System default (${audio.defaultDeviceLabel})` : 'System default';

  const handleChange = (nextId: string) => {
    if (nextId === DEFAULT_MIC_DEVICE_ID) {
      onSelect(DEFAULT_MIC_DEVICE_ID, '');
      return;
    }
    const found = audio.devices.find((d) => d.deviceId === nextId);
    onSelect(nextId, found?.label ?? prefs.micLabel);
  };

  return (
    <div className="ds-field-group">
      <label htmlFor="ds-mic-select" className="ds-field-label">Input microphone</label>
      <div className="ds-mic-row">
        <select id="ds-mic-select" aria-label="Input microphone" className="ds-select" value={prefs.micDeviceId} onChange={(e) => handleChange(e.target.value)}>
          <option value={DEFAULT_MIC_DEVICE_ID}>{systemDefaultText}</option>
          {audio.devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
          ))}
          {isDisconnected && (
            <option value={prefs.micDeviceId}>{`${prefs.micLabel || prefs.micDeviceId} (Disconnected)`}</option>
          )}
        </select>
        <button type="button" className="ds-btn" onClick={() => void audio.refresh(true)} disabled={audio.isRefreshing} aria-label="Refresh microphones" title="Refresh connected audio input devices">
          {audio.isRefreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>
      <div className="ds-audio-status" role={audio.error ? 'alert' : undefined}>
        <span className={`ds-audio-dot ${status.warn ? 'warn' : ''}`} aria-hidden="true" />
        <span>{status.text}</span>
      </div>
    </div>
  );
}

function SoundCuesControls({
  prefs,
  onToggle,
  onVolumeChange
}: {
  prefs: AudioPreferences;
  onToggle: () => void;
  onVolumeChange: (volume: number) => void;
}) {
  const previewChime = () => {
    if (prefs.soundCuesEnabled) void playSoundCue('start', { enabled: true, volume: prefs.soundCuesVolume });
  };
  return (
    <>
      <div className="ds-toggle-card">
        <div className="ds-toggle-copy">
          <span id="ds-sound-cues-label" className="ds-toggle-title">Sound cues &amp; chimes</span>
          <small style={{ color: 'var(--ds-text-muted)' }}>Play a subtle chime when dictation starts, finishes, or encounters an error.</small>
        </div>
        <button type="button" className="ds-switch" role="switch" aria-checked={prefs.soundCuesEnabled} aria-labelledby="ds-sound-cues-label" onClick={onToggle} />
      </div>
      <div className={`ds-volume-card ${prefs.soundCuesEnabled ? '' : 'disabled'}`}>
        <div className="ds-volume-header">
          <label htmlFor="ds-chime-volume" className="ds-field-label">Chime volume</label>
          <button type="button" className="ds-btn" style={{ padding: '3px 9px', fontSize: 11 }} disabled={!prefs.soundCuesEnabled} onClick={previewChime}>Test chime</button>
        </div>
        <div className="ds-volume-controls">
          <input id="ds-chime-volume" type="range" className="ds-volume-slider" aria-label="Chime volume" min={0} max={100} step={5} value={prefs.soundCuesVolume} disabled={!prefs.soundCuesEnabled} onChange={(e) => onVolumeChange(Number(e.target.value))} onPointerUp={previewChime} onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) previewChime(); }} />
          <span className="ds-volume-pct">{prefs.soundCuesVolume}%</span>
        </div>
      </div>
    </>
  );
}

function AudioFeedbackSection({ values, onSave }: { values: Settings; onSave: (patch: Settings) => void }) {
  const prefs = useMemo(() => parseAudioPreferences(values), [values]);
  const audio = useAudioDevices();

  const handleToggle = () => {
    const nextEnabled = !prefs.soundCuesEnabled;
    onSave({ soundCuesEnabled: String(nextEnabled) });
    if (nextEnabled) void playSoundCue('start', { enabled: true, volume: prefs.soundCuesVolume });
  };

  const handleReset = () => onSave({
    micDeviceId: DEFAULT_MIC_DEVICE_ID,
    micLabel: '',
    soundCuesEnabled: String(DEFAULT_SOUND_CUES_ENABLED),
    soundCuesVolume: String(DEFAULT_SOUND_CUES_VOLUME)
  });

  return (
    <section className="ds-pane" style={{ flex: 'none' }} aria-labelledby="ds-audio-feedback-title">
      <div className="ds-pane-header">
        <h2 id="ds-audio-feedback-title" className="ds-pane-title" style={{ margin: 0 }}>Audio &amp; Feedback</h2>
        <button type="button" className="ds-btn" onClick={handleReset}>Reset</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
        <MicrophonePicker prefs={prefs} audio={audio} onSelect={(micDeviceId, micLabel) => onSave({ micDeviceId, micLabel })} />
        <SoundCuesControls prefs={prefs} onToggle={handleToggle} onVolumeChange={(v) => onSave({ soundCuesVolume: String(v) })} />
      </div>
    </section>
  );
}

function formatMaxEntriesLabel(count: number): string {
  return count === 0 ? 'Unlimited' : `${count.toLocaleString()} entries`;
}

function formatMaxDaysLabel(days: number): string {
  if (days === 0) return 'Forever';
  if (days === 365) return '1 year';
  return `${days} days`;
}

function withCurrentOption(options: readonly number[], current: number): number[] {
  return options.includes(current) ? [...options] : [...options, current];
}

function HistoryRecordingToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="ds-toggle-card">
      <div className="ds-toggle-copy">
        <span id="ds-history-enabled-label" className="ds-toggle-title">Save activity history</span>
        <small style={{ color: 'var(--ds-text-muted)' }}>
          Store text and metadata from dictations and Draft Studio refinements locally. Audio recordings are never saved.
        </small>
      </div>
      <button
        type="button"
        className="ds-switch"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="ds-history-enabled-label"
        onClick={onToggle}
      />
    </div>
  );
}

function HistoryRetentionControls({ prefs, onSave }: { prefs: HistoryPreferences; onSave: (patch: Settings) => void }) {
  const entryOptions = useMemo(() => withCurrentOption(HISTORY_MAX_ENTRIES_OPTIONS, prefs.historyMaxEntries), [prefs.historyMaxEntries]);
  const dayOptions = useMemo(() => withCurrentOption(HISTORY_MAX_DAYS_OPTIONS, prefs.historyMaxDays), [prefs.historyMaxDays]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      <label className="ds-field-group">
        <span className="ds-field-label">Maximum entries</span>
        <select
          className="ds-select"
          aria-label="Maximum history entries"
          value={String(prefs.historyMaxEntries)}
          onChange={(e) => onSave({ historyMaxEntries: e.target.value })}
        >
          {entryOptions.map((opt) => (
            <option key={opt} value={String(opt)}>{formatMaxEntriesLabel(opt)}</option>
          ))}
        </select>
        <small style={{ color: 'var(--ds-text-muted)' }}>Starred entries are exempt from automatic pruning.</small>
      </label>

      <label className="ds-field-group">
        <span className="ds-field-label">Retention period</span>
        <select
          className="ds-select"
          aria-label="History retention period"
          value={String(prefs.historyMaxDays)}
          onChange={(e) => onSave({ historyMaxDays: e.target.value })}
        >
          {dayOptions.map((opt) => (
            <option key={opt} value={String(opt)}>{formatMaxDaysLabel(opt)}</option>
          ))}
        </select>
        <small style={{ color: 'var(--ds-text-muted)' }}>Older non-starred entries are pruned automatically.</small>
      </label>
    </div>
  );
}

function ClearHistoryConfirmDialog({
  includeStarred,
  clearing,
  onIncludeStarredChange,
  onCancel,
  onConfirm
}: {
  includeStarred: boolean;
  clearing: boolean;
  onIncludeStarredChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label="Confirm clear activity history"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 6,
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.35)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <strong style={{ fontSize: 12 }}>Clear all activity history?</strong>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, cursor: 'pointer' }}>
          <input type="checkbox" checked={includeStarred} onChange={(e) => onIncludeStarredChange(e.target.checked)} />
          <span>Also delete starred entries</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="ds-btn" disabled={clearing} onClick={onCancel}>Cancel</button>
        <button type="button" className="ds-btn ds-btn-danger" disabled={clearing} onClick={onConfirm}>
          {clearing ? 'Clearing…' : 'Confirm clear'}
        </button>
      </div>
    </div>
  );
}

function HistoryClearControl({ rpc }: { rpc: Rpc }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [includeStarred, setIncludeStarred] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearNotice, setClearNotice] = useState<string | null>(null);

  const handleClearHistory = async () => {
    setClearing(true);
    setClearNotice(null);
    try {
      const res = (await rpc.call(HISTORY_CLEAR_METHOD, { includeStarred })) as HistoryClearResponse | undefined;
      setConfirmOpen(false);
      setIncludeStarred(false);
      if (!res?.ok) {
        setClearNotice('History storage is unavailable.');
      } else {
        setClearNotice(
          res.deletedCount === 0
            ? 'No matching history entries to clear.'
            : `Cleared ${res.deletedCount} history ${res.deletedCount === 1 ? 'entry' : 'entries'}.`
        );
      }
    } catch {
      setClearNotice('Could not clear history.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid var(--ds-border)' }}>
      {!confirmOpen ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <small style={{ color: 'var(--ds-text-muted)' }}>
            Remove stored dictation and refinement history from this machine.
          </small>
          <button
            type="button"
            className="ds-btn ds-btn-danger"
            onClick={() => {
              setIncludeStarred(false);
              setConfirmOpen(true);
            }}
          >
            Clear history
          </button>
        </div>
      ) : (
        <ClearHistoryConfirmDialog
          includeStarred={includeStarred}
          clearing={clearing}
          onIncludeStarredChange={setIncludeStarred}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void handleClearHistory()}
        />
      )}
      {clearNotice ? (
        <div role="status" style={{ fontSize: 11.5, color: 'var(--ds-text-muted)' }}>{clearNotice}</div>
      ) : null}
    </div>
  );
}

function HistoryPrivacySection({
  rpc,
  values,
  onSave
}: {
  rpc: Rpc;
  values: Settings;
  onSave: (patch: Settings) => void;
}) {
  const prefs = useMemo(() => parseHistoryPreferences(values), [values]);
  const handleReset = () =>
    onSave({
      historyEnabled: String(DEFAULT_HISTORY_ENABLED),
      historyMaxEntries: String(DEFAULT_HISTORY_MAX_ENTRIES),
      historyMaxDays: String(DEFAULT_HISTORY_MAX_DAYS)
    });

  return (
    <section className="ds-pane" style={{ flex: 'none' }} aria-labelledby="ds-history-privacy-title">
      <div className="ds-pane-header">
        <h2 id="ds-history-privacy-title" className="ds-pane-title" style={{ margin: 0 }}>History &amp; Privacy</h2>
        <button type="button" className="ds-btn" onClick={handleReset}>Reset</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
        <HistoryRecordingToggle
          enabled={prefs.historyEnabled}
          onToggle={() => onSave({ historyEnabled: String(!prefs.historyEnabled) })}
        />
        <HistoryRetentionControls prefs={prefs} onSave={onSave} />
        <HistoryClearControl rpc={rpc} />
      </div>
    </section>
  );
}

function DictionaryTermList({
  terms,
  atLimit,
  onRemove,
  onClearAll
}: {
  terms: string[];
  atLimit: boolean;
  onRemove: (term: string) => void;
  onClearAll: () => void;
}) {
  return (
    <>
      <div className="ds-dict-well">
        {terms.length > 0 ? (
          <ul className="ds-dict-pills" aria-label="Dictionary terms">
            {terms.map((term) => (
              <li key={term} className="ds-dict-pill">
                <span className="ds-dict-pill-text">{term}</span>
                <button type="button" className="ds-dict-pill-remove" onClick={() => onRemove(term)} aria-label={`Remove ${term}`} title={`Remove ${term}`}>×</button>
              </li>
            ))}
          </ul>
        ) : (
          <span className="ds-dict-empty">No terms added yet. Type a term above or paste a comma-separated list.</span>
        )}
      </div>
      <div className="ds-dict-footer">
        <span className="ds-dict-count">
          {terms.length === 1 ? '1 term active' : `${terms.length} terms active`}{atLimit ? ` (max ${DICTIONARY_MAX_TERMS})` : ''}
        </span>
        <button type="button" className="ds-btn ds-dict-clear-btn" onClick={onClearAll} disabled={terms.length === 0}>Clear all</button>
      </div>
    </>
  );
}

function DictionaryField({
  label,
  help,
  value,
  resetSignal,
  onChange
}: {
  label: string;
  help?: string;
  value: string;
  resetSignal: number;
  onChange: (nextValue: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const terms = useMemo(() => parseDictionary(value), [value]);
  const atLimit = terms.length >= DICTIONARY_MAX_TERMS;

  useEffect(() => { if (resetSignal > 0) setDraft(''); }, [resetSignal]);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed || atLimit) return;
    const next = addDictionaryTerms(terms, trimmed);
    setDraft('');
    if (next.length !== terms.length) onChange(formatDictionary(next));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData?.getData('text');
    if (!pasted || !/[\r\n]/.test(pasted)) return;
    e.preventDefault();
    const start = e.currentTarget.selectionStart ?? draft.length;
    const end = e.currentTarget.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + pasted.replace(/[\r\n]+/g, ', ') + draft.slice(end));
  };

  return (
    <div className="ds-field-group">
      <label htmlFor="ds-dictionary-input" className="ds-field-label">{label}</label>
      {help && <small style={{ color: 'var(--ds-text-muted)' }}>{help}</small>}
      <div className="ds-dict-container">
        <div className="ds-dict-input-row">
          <input id="ds-dictionary-input" type="text" className="ds-dict-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDraft(); } }} onPaste={handlePaste} placeholder="Type a term and press Enter (or paste comma-separated)..." disabled={atLimit} />
          <button type="button" className="ds-btn ds-btn-primary ds-dict-add-btn" onClick={commitDraft} disabled={!draft.trim() || atLimit}>+ Add</button>
        </div>
        <DictionaryTermList terms={terms} atLimit={atLimit} onRemove={(t) => onChange(formatDictionary(terms.filter((x) => x !== t)))} onClearAll={() => { setDraft(''); onChange(''); }} />
      </div>
    </div>
  );
}

function SettingField({
  field,
  values,
  availableSttProviders,
  resetSignal,
  onSave
}: {
  field: Field;
  values: Settings;
  availableSttProviders: readonly string[];
  resetSignal: number;
  onSave: (patch: Settings) => void;
}) {
  if (field.key === 'dictionary') {
    return <DictionaryField label={field.label} help={field.help} value={values.dictionary ?? ''} resetSignal={resetSignal} onChange={(dictionary) => onSave({ dictionary })} />;
  }
  const currentValue = values[field.key] ?? defaults[field.key] ?? '';
  let optionValues = field.options;
  if (optionValues && field.key === 'inputLanguage' && currentValue && !optionValues.includes(currentValue)) {
    optionValues = [...optionValues, currentValue];
  } else if (optionValues && field.key === 'sttProvider') {
    const allowed = new Set(availableSttProviders);
    allowed.add('system');
    optionValues = optionValues.filter((opt) => allowed.has(opt));
  }
  const isUnconfiguredSelection =
    field.key === 'sttProvider' &&
    Boolean(currentValue) &&
    Boolean(optionValues) &&
    !optionValues!.includes(currentValue);
  return (
    <label className="ds-field-group">
      <span className="ds-field-label">{field.label}</span>
      {optionValues
        ? (
            <select
              className="ds-select"
              value={isUnconfiguredSelection ? '' : currentValue}
              onChange={(e) => onSave({ [field.key]: e.target.value })}
            >
              {isUnconfiguredSelection && (
                <option value="" disabled hidden>{`${names[currentValue] ?? currentValue} (Not configured)`}</option>
              )}
              {optionValues.map((opt) => <option key={opt} value={opt}>{names[opt] ?? opt}</option>)}
            </select>
          )
        : field.multiline
          ? <textarea className="ds-custom-prompt-input" value={values[field.key] ?? ''} onChange={(e) => onSave({ [field.key]: e.target.value })} />
          : <input type={field.secret ? 'password' : 'text'} className="ds-select" value={values[field.key] ?? ''} onChange={(e) => onSave({ [field.key]: e.target.value })} placeholder={field.secret ? 'Enter API key…' : undefined} />}
      {field.help && <small style={{ color: 'var(--ds-text-muted)' }}>{field.help}</small>}
    </label>
  );
}

export function StudioSettings({ rpc, onBack, pluginId }: { rpc: Rpc; onBack: () => void; pluginId?: string }) {
  ensureStylesInjected();
  const [values, setValues] = useState<Settings>({});
  const [availableSttProviders, setAvailableSttProviders] = useState<string[]>(['system']);
  const [status, setStatus] = useState('Loading…');
  const [failedPatch, setFailedPatch] = useState<Settings | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const saveVersion = useRef(0);
  const latestValues = useRef<Settings>({});
  const mountedRef = useRef(true);
  const rpcRef = useRef(rpc);
  rpcRef.current = rpc;

  const refreshStatus = useCallback(() => {
    rpcRef.current
      .call(STATUS_METHOD)
      .then((res) => {
        if (!mountedRef.current) return;
        setAvailableSttProviders(resolveAvailableSttProviders(res as StatusResponse | null | undefined));
      })
      .catch(() => undefined);
  }, []);

  useSafeRealtime(SETTINGS_CHANGED_EVENT, () => {
    refreshStatus();
  });

  useSafeRealtime(MODELS_UPDATED_EVENT, () => {
    refreshStatus();
  });

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    rpcRef.current.call(SETTINGS_GET_METHOD).then((v) => {
      if (!active) return;
      const loaded = (v || {}) as Settings;
      latestValues.current = loaded;
      setValues(loaded);
      writeCachedAudioPreferences(loaded);
      setStatus('Saved');
    }).catch(() => { if (active) setStatus('Could not load settings'); });
    refreshStatus();
    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, [refreshStatus]);

  const save = (patch: Settings) => {
    const version = ++saveVersion.current;
    const pending = (latestValues.current = { ...latestValues.current, ...patch });
    setValues(pending);
    writeCachedAudioPreferences(pending);
    setStatus('Saving…');
    rpcRef.current.call(SETTINGS_UPDATE_METHOD, pending).then(() => {
      if (version === saveVersion.current) { setFailedPatch(null); setStatus('Saved'); }
    }).catch(() => { if (version === saveVersion.current) { setFailedPatch(pending); setStatus('Could not save settings.'); } });
  };

  return (
    <div className="ds-workspace">
      <main className="ds-editor-canvas" style={{ overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div><h1 style={{ fontSize: 18, margin: '4px 0' }}>Settings</h1><span style={{ color: 'var(--ds-text-muted)', fontSize: 12 }}>Configure voice and cleanup defaults</span></div>
            <button className="ds-btn" onClick={onBack}>← Back to Studio</button>
          </div>
          <div style={{ color: 'var(--ds-text-muted)', fontSize: 11 }}><span role="status">{status}</span>{failedPatch && <button className="ds-btn" onClick={() => save(failedPatch)}>Retry</button>}</div>
          <AudioFeedbackSection values={values} onSave={save} />
          <HistoryPrivacySection rpc={rpc} values={values} onSave={save} />
          {Object.entries(sections).map(([category, fields]) => (
            <React.Fragment key={category}>
              <section className="ds-pane" style={{ flex: 'none' }}>
                <div className="ds-pane-header">
                  <h2 className="ds-pane-title" style={{ margin: 0 }}>{category}</h2>
                  {category !== 'Connections' && <button className="ds-btn" onClick={() => { if (category === 'Voice & transcription') setResetSignal((n) => n + 1); save(Object.fromEntries(fields.map((f) => [f.key, defaults[f.key] ?? '']))); }}>Reset</button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
                  {category === 'Connections' && <p>Manage API keys in Zana’s Draft Studio plugin settings.</p>}
                  {fields.filter((f) => !(f.key === 'customPrompt' && values.tone !== 'custom')).map((field) => (
                    <SettingField
                      key={field.key}
                      field={field}
                      values={values}
                      availableSttProviders={availableSttProviders}
                      resetSignal={resetSignal}
                      onSave={save}
                    />
                  ))}
                </div>
              </section>
              {category === 'Voice & transcription' && (
                <LocalWhisperSettings
                  rpc={rpc}
                  sttProvider={values.sttProvider ?? defaults.sttProvider}
                  llmProvider={values.llmProvider}
                  onApplyPreset={save}
                  onReadyChange={refreshStatus}
                />
              )}
            </React.Fragment>
          ))}
          {pluginId ? (
            <section className="ds-pane" style={{ flex: 'none', padding: 14 }}>
              <VisibilitySettingsSection pluginId={pluginId} />
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
