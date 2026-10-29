import { useEffect, useRef, useState } from 'react';
import { relativeTime } from './format.ts';
import { useSettingsAction } from './settings-action.ts';
import type { ConfigSnapshot, Rpc } from './types.ts';

const AUTH_LABELS: Record<string, string> = { gh: 'gh CLI', 'git-credential': 'git credential helper', setting: 'pasted token' };

function AccountsSection({ config }: { config: ConfigSnapshot }) {
  const profiles = new Map(config.profiles.map((profile) => [profile.host, profile]));
  return (
    <section className="cn-section" aria-labelledby="cn-accounts-heading">
      <h3 id="cn-accounts-heading">GitHub accounts</h3>
      <p className="cn-muted cn-small">
        CodeNod uses <span className="cn-mono">gh auth token</span>, then <span className="cn-mono">git credential fill</span>, then a pasted token from the plugin settings.
        Name and email come from your GitHub profile.
      </p>
      <ul className="cn-accounts">
        {config.hosts.map((host) => {
          const profile = profiles.get(host.host);
          return (
            <li key={host.host} className="cn-account">
              {profile?.avatarUrl ? (
                <img className="cn-avatar" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="cn-avatar" aria-hidden="true" />
              )}
              <div className="cn-account-body">
                <div className="cn-account-title-row">
                  <div className="cn-account-name">{profile?.name ?? (profile ? `@${profile.login}` : 'Not signed in')}</div>
                  {host.authSource ? (
                    <span className="cn-badge-auth">{AUTH_LABELS[host.authSource] ?? host.authSource}</span>
                  ) : null}
                </div>
                {profile ? (
                  <div className="cn-muted cn-small">
                    @{profile.login} · {profile.email ?? 'email private'}
                  </div>
                ) : null}
                <div className="cn-muted cn-small">
                  <span className="cn-mono">{host.host}</span>
                  {host.authSource ? ` · via ${AUTH_LABELS[host.authSource] ?? host.authSource}` : ''}
                  {` · last sync ${host.syncedAt ? relativeTime(host.syncedAt) : 'never'}`}
                </div>
                {host.error ? <div className="cn-small cn-badge-danger" style={{ marginTop: 4 }}>{host.error}</div> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function InstructionsSection({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  const prompts = config.settings.prompts;
  const [selectedId, setSelectedId] = useState<string | null>(config.settings.defaultPromptId ?? prompts[0]?.id ?? null);
  const selected = prompts.find((prompt) => prompt.id === selectedId);
  const saved = selected?.instructions ?? '';
  const [draft, setDraft] = useState(saved);
  const [name, setName] = useState(selected?.name ?? '');
  const [creating, setCreating] = useState(false);
  const action = useSettingsAction(onChanged);

  // Resync the draft only when the saved value actually changes, so a config
  // reload that leaves it unchanged never clobbers an in-flight edit.
  const lastSaved = useRef(`${selectedId}:${saved}:${selected?.name ?? ''}`);
  useEffect(() => {
    const key = `${selectedId}:${saved}:${selected?.name ?? ''}`;
    if (lastSaved.current === key || creating) return;
    lastSaved.current = key;
    setDraft(saved);
    setName(selected?.name ?? '');
  }, [saved, selectedId, selected?.name, creating]);

  const isDirty = creating || draft.trim() !== saved || name.trim() !== (selected?.name ?? '');
  const maxChars = config.maxInstructionsChars;
  const isTooLong = draft.length > maxChars;
  const defaultId = config.settings.defaultPromptId;

  /** Switches the editor to a prompt and loads its saved name and instructions. */
  function showPrompt(id: string | null) {
    const prompt = prompts.find((item) => item.id === id);
    setSelectedId(id);
    setName(prompt?.name ?? '');
    setDraft(prompt?.instructions ?? '');
  }

  function startCreating() {
    setCreating(true);
    setSelectedId(null);
    setName('');
    setDraft('');
  }

  function cancelCreating() {
    setCreating(false);
    showPrompt(defaultId ?? prompts[0]?.id ?? null);
  }

  function savePrompt() {
    const id = creating ? crypto.randomUUID() : selectedId;
    if (!id) return;
    const entry = { id, name: name.trim(), instructions: draft.trim() };
    const updated = creating ? [...prompts, entry] : prompts.map((prompt) => prompt.id === id ? entry : prompt);
    void action.run(async () => { await rpc.call('setSettings', { prompts: updated }); setCreating(false); setSelectedId(id); });
  }

  function deleteSelected() {
    if (!selected) return;
    const remaining = prompts.filter((prompt) => prompt.id !== selected.id);
    void action.run(async () => { await rpc.call('setSettings', { prompts: remaining }); setSelectedId(defaultId ?? remaining[0]?.id ?? null); });
  }

  return (
    <section className="cn-section" aria-labelledby="cn-instructions-heading">
      <h3 id="cn-instructions-heading">Custom review instructions</h3>
      <p className="cn-muted cn-small">Manage the instructions available for reviews and choose a default.</p>
      {action.error ? <p className="cn-banner cn-banner-error">{action.error}</p> : null}
      <div className="cn-inline">
        <label>Prompt <select aria-label="Prompt" value={creating ? '' : selectedId ?? ''} disabled={isDirty && !creating} onChange={(event) => { setCreating(false); setSelectedId(event.target.value || null); }}>
          <option value="" disabled>Select a prompt</option>
          {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.name}</option>)}
        </select></label>
        <button type="button" className="cn-btn" disabled={isDirty} onClick={startCreating}>New prompt</button>
        {creating ? <button type="button" className="cn-btn" onClick={cancelCreating}>Cancel</button> : null}
        {!creating && isDirty ? <button type="button" className="cn-btn" onClick={() => { setDraft(saved); setName(selected?.name ?? ''); }}>Discard changes</button> : null}
      </div>
      <label>Default prompt <select aria-label="Default prompt" value={defaultId ?? ''} onChange={(event) => void action.run(() => rpc.call('setSettings', { defaultPromptId: event.target.value || null }))}>
        <option value="">Built-in prompt only</option>
        {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.name}</option>)}
      </select></label>
      <label>Prompt name <input aria-label="Prompt name" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <textarea
        className="cn-textarea cn-instructions"
        aria-label="Custom review instructions"
        aria-describedby="cn-instructions-count"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="cn-inline">
        <button
          type="button"
          className="cn-btn cn-btn-primary"
          disabled={!isDirty || isTooLong || !name.trim()}
          onClick={savePrompt}
        >
          Save instructions
        </button>
        {!creating && selected ? <button type="button" className="cn-btn" disabled={selected.id === defaultId} title={selected.id === defaultId ? 'Choose another default before deleting' : undefined} onClick={deleteSelected}>Delete prompt</button> : null}
        <button type="button" className="cn-btn" disabled={draft === config.defaultInstructions} onClick={() => setDraft(config.defaultInstructions)}>
          Reset to default
        </button>
        <span id="cn-instructions-count" className={isTooLong ? 'cn-small cn-badge-danger' : 'cn-muted cn-small'}>
          {draft.length} / {maxChars}
        </span>
        {action.saved ? (
          <span className="cn-status-saved" role="status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved
          </span>
        ) : null}
      </div>
      <details className="cn-prompt">
        <summary>View built-in prompt</summary>
        <pre className="cn-prompt-text">{config.builtInPrompt}</pre>
      </details>
    </section>
  );
}

export function ProfileTab({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  return (
    <>
      <AccountsSection config={config} />
      <InstructionsSection rpc={rpc} config={config} onChanged={onChanged} />
    </>
  );
}
