import React, { useEffect, useRef, useState } from 'react';

type Settings = Record<string, string>;
type Rpc = { call(method: string, input?: unknown): Promise<unknown> };
type Field = { key: string; label: string; options?: string[]; multiline?: boolean; secret?: boolean; help?: string };
const sections: Record<string, Field[]> = {
  'Voice & transcription': [
    { key: 'inputLanguage', label: 'Input language', options: ['auto', 'en', 'he', 'de', 'fr', 'es', 'ja'] },
    { key: 'dictionary', label: 'Personal dictionary', multiline: true, help: 'Names and terms, one per line.' }
  ],
  'Prompt Voice': [
    { key: 'tone', label: 'Cleanup tone', options: ['conversational', 'formal', 'casual', 'technical', 'custom'] },
    { key: 'customPrompt', label: 'Custom cleanup instructions', multiline: true }
  ],
  'Connections': [
    { key: 'openaiApiKey', label: 'OpenAI API key', secret: true, help: 'Required for direct OpenAI Whisper speech-to-text.' },
    { key: 'googleApiKey', label: 'Google AI API key', secret: true, help: 'Required for direct Google Gemini speech-to-text.' },
    { key: 'anthropicApiKey', label: 'Anthropic API key', secret: true, help: 'For Anthropic Claude models.' }
  ]
};
const defaults: Settings = { inputLanguage: 'auto', tone: 'conversational' };
const names: Record<string, string> = { auto: 'Detect automatically', system: 'Zana voice', none: 'Off', assistant: 'Zana assistant', openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google AI', 'google-gemini': 'Google Gemini', en: 'English', he: 'Hebrew', de: 'German', fr: 'French', es: 'Spanish', ja: 'Japanese' };

export function StudioSettings({ rpc, onBack }: { rpc: Rpc; onBack: () => void }) {
  const [values, setValues] = useState<Settings>({});
  const [status, setStatus] = useState('Loading…');
  const [failedPatch, setFailedPatch] = useState<Settings | null>(null);
  const saveVersion = useRef(0);
  const latestValues = useRef<Settings>({});
  useEffect(() => {
    let active = true;
    rpc.call('promptVoice.settings.get').then((v) => { if (active) { latestValues.current = (v || {}) as Settings; setValues(latestValues.current); setStatus('Saved'); } }).catch(() => { if (active) setStatus('Could not load settings'); });
    return () => { active = false; };
  }, []);
  const save = (patch: Settings) => {
    const version = ++saveVersion.current;
    latestValues.current = { ...latestValues.current, ...patch };
    const pending = latestValues.current;
    setValues(pending);
    setStatus('Saving…');
    rpc.call('promptVoice.settings.update', pending).then(() => {
      if (version === saveVersion.current) { setFailedPatch(null); setStatus('Saved'); }
    }).catch(() => {
      if (version === saveVersion.current) { setFailedPatch(pending); setStatus('Could not save settings.'); }
    });
  };
  return <div className="ps-workspace">
    <main className="ps-editor-canvas" style={{ overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div><h1 style={{ fontSize: 18, margin: '4px 0' }}>Settings</h1><span style={{ color: 'var(--ps-text-muted)', fontSize: 12 }}>Configure voice and cleanup defaults</span></div>
        <button className="ps-btn" onClick={onBack}>← Back to Studio</button>
      </div>
      <div style={{ color: 'var(--ps-text-muted)', fontSize: 11 }}><span role="status">{status}</span>{failedPatch && <button className="ps-btn" onClick={() => save(failedPatch)}>Retry</button>}</div>
      {Object.entries(sections).map(([category, fields]) => <section key={category} className="ps-pane" style={{ flex: 'none' }}>
        <div className="ps-pane-header"><h2 className="ps-pane-title" style={{ margin: 0 }}>{category}</h2>{category !== 'Connections' && <button className="ps-btn" onClick={() => save(Object.fromEntries(fields.map((field) => [field.key, defaults[field.key] ?? ''])))}>Reset</button>}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
      {fields.filter((field) => !(field.key === 'customPrompt' && values.tone !== 'custom')).map((field) => <label key={field.key} className="ps-field-group">
        <span className="ps-field-label">{field.label}</span>
        {field.options ? <select className="ps-select" value={values[field.key] ?? defaults[field.key] ?? ''} onChange={(e) => save({ [field.key]: e.target.value })}>{field.options.map((option) => <option key={option} value={option}>{names[option] ?? option}</option>)}</select> : field.multiline ? <textarea className="ps-custom-prompt-input" value={values[field.key] ?? ''} onChange={(e) => save({ [field.key]: e.target.value })} /> : <input type={field.secret ? 'password' : 'text'} className="ps-select" value={values[field.key] ?? ''} onChange={(e) => save({ [field.key]: e.target.value })} placeholder={field.secret ? 'Enter API key…' : undefined} />}
        {field.help && <small style={{ color: 'var(--ps-text-muted)' }}>{field.help}</small>}
      </label>)}
        </div>
      </section>)}
      </div>
    </main>
  </div>;
}
