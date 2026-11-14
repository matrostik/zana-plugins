import { useEffect, useRef, useState } from 'react';
import type { ModelChoice } from '../server/types.ts';
import { ModelPriorityPicker } from './ModelSearchPicker.tsx';
import { NumberSetting } from './SettingFields.tsx';
import { useSettingsAction } from './settings-action.ts';
import type { AvailableProvider, ConfigSnapshot, Rpc } from './types.ts';

const WORKSPACE_LABELS: Record<string, string> = {
  worktree: 'Fresh worktree of the matching Zana project',
  project: 'The project folder itself',
  'diff-only': 'Diff only, never read local code'
};

interface ModelsSectionProps {
  rpc: Rpc;
  models: ModelChoice[];
  onSaved(): void;
  providers: AvailableProvider[] | null;
  providersError: string | null;
  refreshingProviders: boolean;
  onRefreshProviders: () => void;
}

function ModelsSection({
  rpc,
  models,
  onSaved,
  providers,
  providersError,
  refreshingProviders,
  onRefreshProviders
}: ModelsSectionProps) {
  const [draft, setDraft] = useState<ModelChoice[]>(models);
  const dirtyRef = useRef(false);
  const action = useSettingsAction(onSaved);

  const savedKey = JSON.stringify(models);
  useEffect(() => {
    if (!dirtyRef.current) setDraft(models);
  }, [savedKey]);

  const updateDraft = (next: ModelChoice[]) => {
    dirtyRef.current = true;
    setDraft(next);
  };

  const shownError = action.error ?? providersError;
  return (
    <section className="cn-section" aria-labelledby="cn-models-heading">
      <div className="cn-inline">
        <h3 id="cn-models-heading">Review models</h3>
        <span className="cn-spacer" />
        <button type="button" className="cn-btn cn-small" disabled={refreshingProviders} onClick={onRefreshProviders}>
          {refreshingProviders ? 'Refreshing…' : 'Refresh models'}
        </button>
      </div>
      <p className="cn-muted cn-small">
        Choose a provider and model for each priority. Reviews use every selected model together for consensus (up to 5).
      </p>
      {shownError ? <p className="cn-banner cn-banner-error">{shownError}</p> : null}
      {!providers ? (
        <p className="cn-muted">Loading providers…</p>
      ) : providers.length === 0 ? (
        <p className="cn-muted">No AI provider is available in Zana. Sign in to one under Settings → Providers.</p>
      ) : (
        <ModelPriorityPicker value={draft} providers={providers} onChange={updateDraft} />
      )}
      <SaveModelsBar
        count={draft.length}
        saved={action.saved}
        onSave={() =>
          void action.run(async () => {
            await rpc.call('setModels', { models: draft });
            dirtyRef.current = false;
          })
        }
      />
    </section>
  );
}

function SaveModelsBar({ count, saved, onSave }: { count: number; saved: boolean; onSave(): void }) {
  return (
    <div className="cn-inline" style={{ marginTop: 16 }}>
      <button type="button" className="cn-btn cn-btn-primary" onClick={onSave}>
        Save models ({count})
      </button>
      {saved ? (
        <span className="cn-status-saved" role="status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Saved
        </span>
      ) : null}
    </div>
  );
}

function ExecutionSection({ rpc, config, onChanged }: { rpc: Rpc; config: ConfigSnapshot; onChanged(): void }) {
  const { settings, limits } = config;
  const { error, saved, run } = useSettingsAction(onChanged);
  const save = (patch: Record<string, unknown>) => void run(() => rpc.call('setSettings', patch));
  const hasMissingProject = settings.fallbackProjectId !== null && !config.projects.some((project) => project.id === settings.fallbackProjectId);

  return (
    <section className="cn-section" aria-labelledby="cn-execution-heading">
      <h3 id="cn-execution-heading">Review execution</h3>
      <p className="cn-muted cn-small">
        Fine-tune review timeouts, concurrency limits, workspace isolation, and board visibility.
      </p>
      {error ? <p className="cn-banner cn-banner-error">{error}</p> : null}
      <div className="cn-fields">
        <NumberSetting
          id="maxConcurrentReviews"
          label="Reviews running at once"
          value={settings.maxConcurrentReviews}
          limits={limits.maxConcurrentReviews}
          onSave={(value) => save({ maxConcurrentReviews: value })}
        />
        <NumberSetting
          id="reviewTimeoutMinutes"
          label="Review timeout per model (minutes)"
          value={settings.reviewTimeoutMinutes}
          limits={limits.reviewTimeoutMinutes}
          onSave={(value) => save({ reviewTimeoutMinutes: value })}
        />
        <div className="cn-field">
          <label htmlFor="cn-setting-workspaceMode">Review workspace</label>
          <select id="cn-setting-workspaceMode" className="cn-select" value={settings.workspaceMode} onChange={(event) => save({ workspaceMode: event.target.value })}>
            {config.workspaceModes.map((mode) => (
              <option key={mode} value={mode}>
                {WORKSPACE_LABELS[mode] ?? mode}
              </option>
            ))}
          </select>
        </div>
        <div className="cn-field">
          <label htmlFor="cn-setting-fallbackProject">Fallback project for review threads</label>
          <select
            id="cn-setting-fallbackProject"
            className="cn-select"
            aria-describedby="cn-fallback-help"
            value={settings.fallbackProjectId ?? ''}
            onChange={(event) => save({ fallbackProjectId: event.target.value || null })}
          >
            <option value="">None</option>
            {hasMissingProject ? <option value={settings.fallbackProjectId ?? ''}>Unknown project</option> : null}
            {config.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <span id="cn-fallback-help" className="cn-muted cn-small">
            Used when no Zana project matches the pull request repository.
          </span>
        </div>
        <div className="cn-checkbox-group">
          <label className="cn-check">
            <input type="checkbox" checked={settings.archiveReviewThreads} onChange={(event) => save({ archiveReviewThreads: event.target.checked })} />
            <span>Archive hidden review threads when done</span>
          </label>
          <label className="cn-check">
            <input type="checkbox" checked={settings.showReviewsOnAgentsBoard} onChange={(event) => save({ showReviewsOnAgentsBoard: event.target.checked })} />
            <span>Show review coordinator on Agents board</span>
          </label>
        </div>
      </div>
      {saved ? (
        <span className="cn-status-saved" role="status" style={{ marginTop: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Saved
        </span>
      ) : null}
    </section>
  );
}

export function ModelTab({
  rpc,
  config,
  initialModels,
  onChanged,
  providers,
  providersError,
  refreshingProviders,
  onRefreshProviders
}: {
  rpc: Rpc;
  config: ConfigSnapshot | null;
  initialModels?: ModelChoice[];
  onChanged(): void;
  providers: AvailableProvider[] | null;
  providersError: string | null;
  refreshingProviders: boolean;
  onRefreshProviders: () => void;
}) {
  return (
    <>
      <ModelsSection
        rpc={rpc}
        models={config?.models ?? initialModels ?? []}
        onSaved={onChanged}
        providers={providers}
        providersError={providersError}
        refreshingProviders={refreshingProviders}
        onRefreshProviders={onRefreshProviders}
      />
      {config ? (
        <ExecutionSection rpc={rpc} config={config} onChanged={onChanged} />
      ) : (
        <section className="cn-section" aria-labelledby="cn-execution-heading">
          <h3 id="cn-execution-heading">Review execution</h3>
          <p className="cn-muted">Loading execution settings…</p>
        </section>
      )}
    </>
  );
}
