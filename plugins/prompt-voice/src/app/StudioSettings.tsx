import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  SETTINGS_GET_METHOD,
  SETTINGS_UPDATE_METHOD,
  TONE_IDS,
  type HistoryClearResponse
} from '../shared/protocol.ts';
import type { AudioInputDevice } from './audioDevices.ts';
import { writeCachedAudioPreferences } from './audioPreferencesStorage.ts';
import { ensureStylesInjected } from './injectStyles.ts';
import { playSoundCue } from './soundCues.ts';
import { useAudioDevices, type AudioDevicesState } from './useAudioDevices.ts';

type Settings = Record<string, string>;
type Rpc = { call(method: string, input?: unknown): Promise<unknown> };
type Field = { key: string; label: string; options?: string[]; multiline?: boolean; secret?: boolean; help?: string };

const sections: Record<string, Field[]> = {
  'Voice & transcription': [
    { key: 'sttProvider', label: 'Speech-to-text provider', options: ['system', 'google-gemini', 'openai', 'local-whisper'] },
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
  'Prompt Voice': [
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
    return { warn: false, text: 'Uses your OS default input device. Saved selection applies to Prompt Studio and Composer dictation.' };
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
    <div className="ps-field-group">
      <label htmlFor="ps-mic-select" className="ps-field-label">Input microphone</label>
      <div className="ps-mic-row">
        <select id="ps-mic-select" aria-label="Input microphone" className="ps-select" value={prefs.micDeviceId} onChange={(e) => handleChange(e.target.value)}>
          <option value={DEFAULT_MIC_DEVICE_ID}>{systemDefaultText}</option>
          {audio.devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
          ))}
          {isDisconnected && (
            <option value={prefs.micDeviceId}>{`${prefs.micLabel || prefs.micDeviceId} (Disconnected)`}</option>
          )}
        </select>
        <button type="button" className="ps-btn" onClick={() => void audio.refresh(true)} disabled={audio.isRefreshing} aria-label="Refresh microphones" title="Refresh connected audio input devices">
          {audio.isRefreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>
      <div className="ps-audio-status" role={audio.error ? 'alert' : undefined}>
        <span className={`ps-audio-dot ${status.warn ? 'warn' : ''}`} aria-hidden="true" />
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
      <div className="ps-toggle-card">
        <div className="ps-toggle-copy">
          <span id="ps-sound-cues-label" className="ps-toggle-title">Sound cues &amp; chimes</span>
          <small style={{ color: 'var(--ps-text-muted)' }}>Play a subtle chime when dictation starts, finishes, or encounters an error.</small>
        </div>
        <button type="button" className="ps-switch" role="switch" aria-checked={prefs.soundCuesEnabled} aria-labelledby="ps-sound-cues-label" onClick={onToggle} />
      </div>
      <div className={`ps-volume-card ${prefs.soundCuesEnabled ? '' : 'disabled'}`}>
        <div className="ps-volume-header">
          <label htmlFor="ps-chime-volume" className="ps-field-label">Chime volume</label>
          <button type="button" className="ps-btn" style={{ padding: '3px 9px', fontSize: 11 }} disabled={!prefs.soundCuesEnabled} onClick={previewChime}>Test chime</button>
        </div>
        <div className="ps-volume-controls">
          <input id="ps-chime-volume" type="range" className="ps-volume-slider" aria-label="Chime volume" min={0} max={100} step={5} value={prefs.soundCuesVolume} disabled={!prefs.soundCuesEnabled} onChange={(e) => onVolumeChange(Number(e.target.value))} onPointerUp={previewChime} onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) previewChime(); }} />
          <span className="ps-volume-pct">{prefs.soundCuesVolume}%</span>
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
    <section className="ps-pane" style={{ flex: 'none' }} aria-labelledby="ps-audio-feedback-title">
      <div className="ps-pane-header">
        <h2 id="ps-audio-feedback-title" className="ps-pane-title" style={{ margin: 0 }}>Audio &amp; Feedback</h2>
        <button type="button" className="ps-btn" onClick={handleReset}>Reset</button>
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
    <div className="ps-toggle-card">
      <div className="ps-toggle-copy">
        <span id="ps-history-enabled-label" className="ps-toggle-title">Save activity history</span>
        <small style={{ color: 'var(--ps-text-muted)' }}>
          Store text and metadata from dictations and Prompt Studio refinements locally. Audio recordings are never saved.
        </small>
      </div>
      <button
        type="button"
        className="ps-switch"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="ps-history-enabled-label"
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
      <label className="ps-field-group">
        <span className="ps-field-label">Maximum entries</span>
        <select
          className="ps-select"
          aria-label="Maximum history entries"
          value={String(prefs.historyMaxEntries)}
          onChange={(e) => onSave({ historyMaxEntries: e.target.value })}
        >
          {entryOptions.map((opt) => (
            <option key={opt} value={String(opt)}>{formatMaxEntriesLabel(opt)}</option>
          ))}
        </select>
        <small style={{ color: 'var(--ps-text-muted)' }}>Starred entries are exempt from automatic pruning.</small>
      </label>

      <label className="ps-field-group">
        <span className="ps-field-label">Retention period</span>
        <select
          className="ps-select"
          aria-label="History retention period"
          value={String(prefs.historyMaxDays)}
          onChange={(e) => onSave({ historyMaxDays: e.target.value })}
        >
          {dayOptions.map((opt) => (
            <option key={opt} value={String(opt)}>{formatMaxDaysLabel(opt)}</option>
          ))}
        </select>
        <small style={{ color: 'var(--ps-text-muted)' }}>Older non-starred entries are pruned automatically.</small>
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
        <button type="button" className="ps-btn" disabled={clearing} onClick={onCancel}>Cancel</button>
        <button type="button" className="ps-btn ps-btn-danger" disabled={clearing} onClick={onConfirm}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid var(--ps-border)' }}>
      {!confirmOpen ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <small style={{ color: 'var(--ps-text-muted)' }}>
            Remove stored dictation and refinement history from this machine.
          </small>
          <button
            type="button"
            className="ps-btn ps-btn-danger"
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
        <div role="status" style={{ fontSize: 11.5, color: 'var(--ps-text-muted)' }}>{clearNotice}</div>
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
    <section className="ps-pane" style={{ flex: 'none' }} aria-labelledby="ps-history-privacy-title">
      <div className="ps-pane-header">
        <h2 id="ps-history-privacy-title" className="ps-pane-title" style={{ margin: 0 }}>History &amp; Privacy</h2>
        <button type="button" className="ps-btn" onClick={handleReset}>Reset</button>
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
      <div className="ps-dict-well">
        {terms.length > 0 ? (
          <ul className="ps-dict-pills" aria-label="Dictionary terms">
            {terms.map((term) => (
              <li key={term} className="ps-dict-pill">
                <span className="ps-dict-pill-text">{term}</span>
                <button type="button" className="ps-dict-pill-remove" onClick={() => onRemove(term)} aria-label={`Remove ${term}`} title={`Remove ${term}`}>×</button>
              </li>
            ))}
          </ul>
        ) : (
          <span className="ps-dict-empty">No terms added yet. Type a term above or paste a comma-separated list.</span>
        )}
      </div>
      <div className="ps-dict-footer">
        <span className="ps-dict-count">
          {terms.length === 1 ? '1 term active' : `${terms.length} terms active`}{atLimit ? ` (max ${DICTIONARY_MAX_TERMS})` : ''}
        </span>
        <button type="button" className="ps-btn ps-dict-clear-btn" onClick={onClearAll} disabled={terms.length === 0}>Clear all</button>
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
    <div className="ps-field-group">
      <label htmlFor="ps-dictionary-input" className="ps-field-label">{label}</label>
      {help && <small style={{ color: 'var(--ps-text-muted)' }}>{help}</small>}
      <div className="ps-dict-container">
        <div className="ps-dict-input-row">
          <input id="ps-dictionary-input" type="text" className="ps-dict-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDraft(); } }} onPaste={handlePaste} placeholder="Type a term and press Enter (or paste comma-separated)..." disabled={atLimit} />
          <button type="button" className="ps-btn ps-btn-primary ps-dict-add-btn" onClick={commitDraft} disabled={!draft.trim() || atLimit}>+ Add</button>
        </div>
        <DictionaryTermList terms={terms} atLimit={atLimit} onRemove={(t) => onChange(formatDictionary(terms.filter((x) => x !== t)))} onClearAll={() => { setDraft(''); onChange(''); }} />
      </div>
    </div>
  );
}

function SettingField({
  field,
  values,
  resetSignal,
  onSave
}: {
  field: Field;
  values: Settings;
  resetSignal: number;
  onSave: (patch: Settings) => void;
}) {
  if (field.key === 'dictionary') {
    return <DictionaryField label={field.label} help={field.help} value={values.dictionary ?? ''} resetSignal={resetSignal} onChange={(dictionary) => onSave({ dictionary })} />;
  }
  const currentValue = values[field.key] ?? defaults[field.key] ?? '';
  const optionValues = field.options && field.key === 'inputLanguage' && currentValue && !field.options.includes(currentValue)
    ? [...field.options, currentValue]
    : field.options;
  return (
    <label className="ps-field-group">
      <span className="ps-field-label">{field.label}</span>
      {optionValues
        ? <select className="ps-select" value={currentValue} onChange={(e) => onSave({ [field.key]: e.target.value })}>{optionValues.map((opt) => <option key={opt} value={opt}>{names[opt] ?? opt}</option>)}</select>
        : field.multiline
          ? <textarea className="ps-custom-prompt-input" value={values[field.key] ?? ''} onChange={(e) => onSave({ [field.key]: e.target.value })} />
          : <input type={field.secret ? 'password' : 'text'} className="ps-select" value={values[field.key] ?? ''} onChange={(e) => onSave({ [field.key]: e.target.value })} placeholder={field.secret ? 'Enter API key…' : undefined} />}
      {field.help && <small style={{ color: 'var(--ps-text-muted)' }}>{field.help}</small>}
    </label>
  );
}

export function StudioSettings({ rpc, onBack, pluginId }: { rpc: Rpc; onBack: () => void; pluginId?: string }) {
  ensureStylesInjected();
  const [values, setValues] = useState<Settings>({});
  const [status, setStatus] = useState('Loading…');
  const [failedPatch, setFailedPatch] = useState<Settings | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const saveVersion = useRef(0);
  const latestValues = useRef<Settings>({});
  const rpcRef = useRef(rpc);
  rpcRef.current = rpc;

  useEffect(() => {
    let active = true;
    rpcRef.current.call(SETTINGS_GET_METHOD).then((v) => {
      if (!active) return;
      const loaded = (v || {}) as Settings;
      latestValues.current = loaded;
      setValues(loaded);
      writeCachedAudioPreferences(loaded);
      setStatus('Saved');
    }).catch(() => { if (active) setStatus('Could not load settings'); });
    return () => { active = false; };
  }, []);

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
    <div className="ps-workspace">
      <main className="ps-editor-canvas" style={{ overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div><h1 style={{ fontSize: 18, margin: '4px 0' }}>Settings</h1><span style={{ color: 'var(--ps-text-muted)', fontSize: 12 }}>Configure voice and cleanup defaults</span></div>
            <button className="ps-btn" onClick={onBack}>← Back to Studio</button>
          </div>
          <div style={{ color: 'var(--ps-text-muted)', fontSize: 11 }}><span role="status">{status}</span>{failedPatch && <button className="ps-btn" onClick={() => save(failedPatch)}>Retry</button>}</div>
          <AudioFeedbackSection values={values} onSave={save} />
          <HistoryPrivacySection rpc={rpc} values={values} onSave={save} />
          {Object.entries(sections).map(([category, fields]) => (
            <React.Fragment key={category}>
              <section className="ps-pane" style={{ flex: 'none' }}>
                <div className="ps-pane-header">
                  <h2 className="ps-pane-title" style={{ margin: 0 }}>{category}</h2>
                  {category !== 'Connections' && <button className="ps-btn" onClick={() => { if (category === 'Voice & transcription') setResetSignal((n) => n + 1); save(Object.fromEntries(fields.map((f) => [f.key, defaults[f.key] ?? '']))); }}>Reset</button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
                  {category === 'Connections' && <p>Manage API keys in Zana’s Prompt Voice plugin settings.</p>}
                  {fields.filter((f) => !(f.key === 'customPrompt' && values.tone !== 'custom')).map((field) => (
                    <SettingField key={field.key} field={field} values={values} resetSignal={resetSignal} onSave={save} />
                  ))}
                </div>
              </section>
              {category === 'Voice & transcription' && <LocalWhisperSettings rpc={rpc} sttProvider={values.sttProvider ?? defaults.sttProvider} llmProvider={values.llmProvider} onApplyPreset={save} />}
            </React.Fragment>
          ))}
          {pluginId ? (
            <section className="ps-pane" style={{ flex: 'none', padding: 14 }}>
              <VisibilitySettingsSection pluginId={pluginId} />
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
