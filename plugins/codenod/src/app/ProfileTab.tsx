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
              {profile?.avatarUrl ? <img className="cn-avatar" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="cn-avatar" aria-hidden="true" />}
              <div>
                <div className="cn-account-name">{profile?.name ?? (profile ? `@${profile.login}` : 'Not signed in')}</div>
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
                {host.error ? <div className="cn-small cn-badge-danger">{host.error}</div> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function InstructionsSection({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  const saved = config.settings.customInstructions;
  const [draft, setDraft] = useState(saved);
  const action = useSettingsAction(onChanged);

  // Resync the draft only when the saved value actually changes, so a config
  // reload that leaves it unchanged never clobbers an in-flight edit.
  const lastSaved = useRef(saved);
  useEffect(() => {
    if (lastSaved.current === saved) return;
    lastSaved.current = saved;
    setDraft(saved);
  }, [saved]);

  const isDirty = draft.trim() !== saved;
  const maxChars = config.maxInstructionsChars;
  const isTooLong = draft.length > maxChars;

  return (
    <section className="cn-section" aria-labelledby="cn-instructions-heading">
      <h3 id="cn-instructions-heading">Custom review instructions</h3>
      <p className="cn-muted cn-small">Added to every review after CodeNod’s built-in prompt. Leave empty to use the built-in prompt only.</p>
      {action.error ? <p className="cn-banner cn-banner-error">{action.error}</p> : null}
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
          disabled={!isDirty || isTooLong}
          onClick={() => void action.run(() => rpc.call('setSettings', { customInstructions: draft }))}
        >
          Save instructions
        </button>
        <button type="button" className="cn-btn" disabled={draft === config.defaultInstructions} onClick={() => setDraft(config.defaultInstructions)}>
          Reset to default
        </button>
        <span id="cn-instructions-count" className={isTooLong ? 'cn-small cn-badge-danger' : 'cn-muted cn-small'}>
          {draft.length} / {maxChars}
        </span>
        {action.saved ? <span className="cn-muted" role="status">Saved</span> : null}
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
