import React, { useEffect, useRef, useState } from 'react';

type Settings = Record<string, string>;
type Rpc = { call(method: string, input?: unknown): Promise<unknown> };
type Field = { key: string; label: string; options?: string[]; multiline?: boolean; help?: string };
const sections: Record<string, Field[]> = {
  'Voice & transcription': [
    { key: 'sttProvider', label: 'Speech provider', options: ['system', 'openai', 'google-gemini'], help: 'System uses Zana voice transcription.' },
    { key: 'sttModel', label: 'Speech model', help: 'Leave empty for the provider default.' },
    { key: 'inputLanguage', label: 'Input language', options: ['auto', 'en', 'he', 'de', 'fr', 'es', 'ja'] },
    { key: 'dictionary', label: 'Personal dictionary', multiline: true, help: 'Names and terms, one per line.' }
  ],
  'Prompt Voice': [
    { key: 'llmProvider', label: 'Automatic cleanup', options: ['none', 'assistant', 'openai', 'anthropic', 'google'] },
    { key: 'llmModel', label: 'Cleanup model', help: 'Leave empty for the provider default.' },
    { key: 'tone', label: 'Cleanup tone', options: ['conversational', 'formal', 'casual', 'technical', 'custom'] },
    { key: 'customPrompt', label: 'Custom cleanup instructions', multiline: true }
  ],
  'Prompt Studio': [
    { key: 'studioProvider', label: 'Default refinement provider', options: ['composer', 'assistant', 'openai', 'anthropic', 'google'] },
    { key: 'studioModel', label: 'Default refinement model', help: 'Leave empty for the provider default.' }
  ],
  'Connections': []
};
const defaults: Settings = { sttProvider: 'system', inputLanguage: 'auto', llmProvider: 'assistant', tone: 'conversational', studioProvider: 'composer' };
const names: Record<string, string> = { auto: 'Detect automatically', system: 'Zana voice', none: 'Off', assistant: 'Zana assistant', composer: 'Follow Composer', openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google AI', 'google-gemini': 'Google Gemini', en: 'English', he: 'Hebrew', de: 'German', fr: 'French', es: 'Spanish', ja: 'Japanese' };

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
        <div><h1 style={{ fontSize: 18, margin: '4px 0' }}>Settings</h1><span style={{ color: 'var(--ps-text-muted)', fontSize: 12 }}>Configure voice and refinement defaults</span></div>
        <button className="ps-btn" onClick={onBack}>← Back to Studio</button>
      </div>
      <div style={{ color: 'var(--ps-text-muted)', fontSize: 11 }}><span role="status">{status}</span>{failedPatch && <button className="ps-btn" onClick={() => save(failedPatch)}>Retry</button>}</div>
      {Object.entries(sections).map(([category, fields]) => <section key={category} className="ps-pane" style={{ flex: 'none' }}>
        <div className="ps-pane-header"><h2 className="ps-pane-title" style={{ margin: 0 }}>{category}</h2>{category !== 'Connections' && <button className="ps-btn" onClick={() => save(Object.fromEntries(fields.map((field) => [field.key, defaults[field.key] ?? ''])))}>Reset</button>}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
      {category === 'Connections' ? <p style={{ margin: 0, color: 'var(--ps-text-muted)', fontSize: 12 }}>Manage OpenAI, Google AI and Anthropic API keys in Zana’s Prompt Voice plugin settings. Keys remain protected by Zana.</p> : fields.filter((field) => !(field.key === 'sttModel' && (values.sttProvider ?? 'system') === 'system') && !(field.key === 'llmModel' && ['none', 'assistant'].includes(values.llmProvider ?? 'assistant')) && !(field.key === 'customPrompt' && values.tone !== 'custom')).map((field) => <label key={field.key} className="ps-field-group">
        <span className="ps-field-label">{field.label}</span>
        {field.options ? <select className="ps-select" value={values[field.key] ?? defaults[field.key] ?? ''} onChange={(e) => save({ [field.key]: e.target.value })}>{field.options.map((option) => <option key={option} value={option}>{names[option] ?? option}</option>)}</select> : field.multiline ? <textarea className="ps-custom-prompt-input" value={values[field.key] ?? ''} onChange={(e) => save({ [field.key]: e.target.value })} /> : <input className="ps-select" value={values[field.key] ?? ''} onChange={(e) => save({ [field.key]: e.target.value })} />}
        {field.help && <small style={{ color: 'var(--ps-text-muted)' }}>{field.help}</small>}
      </label>)}
        </div>
      </section>)}
      </div>
    </main>
  </div>;
}
