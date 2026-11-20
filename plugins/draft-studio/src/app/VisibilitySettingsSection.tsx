import React, { useState } from 'react';
import {
  MIC_VISIBILITY_LABELS,
  MIC_VISIBILITY_OPTIONS,
  VISIBILITY_PRESETS,
  detectVisibilityPreset,
  type MicVisibility,
  type DraftStudioVisibilitySettings,
  type VisibilityPresetId
} from '../shared/visibility.ts';
import { ensureStylesInjected } from './injectStyles.ts';
import { DRAFT_STUDIO_PLUGIN_ID, updatePluginSettings, useVisibilitySettings } from './safeSdk.ts';

export interface VisibilitySettingsSectionProps {
  pluginId?: string;
}

function VisibilityHeader({ statusMessage }: { statusMessage: string | null }): React.ReactElement {
  return (
    <div className="ds-vis-header">
      <div>
        <h3 id="ds-visibility-heading" className="ds-vis-title">
          Where Draft Studio Appears
        </h3>
        <p className="ds-vis-subtitle">
          Control whether Draft Studio surfaces on the main Home screen, inside Projects, and in thread composers.
        </p>
      </div>
      <div className="ds-vis-status-slot">
        {statusMessage ? (
          <span role="status" className="ds-vis-status">
            {statusMessage}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function VisibilityPresetGrid({
  activePreset,
  disabled,
  onSelect
}: {
  activePreset: VisibilityPresetId | 'custom';
  disabled: boolean;
  onSelect: (patch: Partial<DraftStudioVisibilitySettings>) => void;
}): React.ReactElement {
  return (
    <div className="ds-vis-presets" role="group" aria-label="Surface visibility presets">
      {VISIBILITY_PRESETS.map((preset) => {
        const isActive = activePreset === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            className={`ds-vis-preset-card ${isActive ? 'active' : ''}`}
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onSelect(preset.settings)}
          >
            <span className="ds-vis-preset-label">{preset.label}</span>
            <span className="ds-vis-preset-desc">{preset.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function VisibilitySwitchRow({
  labelId,
  title,
  helpText,
  checked,
  disabled,
  onToggle
}: {
  labelId: string;
  title: string;
  helpText: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <div className="ds-toggle-card">
      <div className="ds-toggle-copy">
        <span id={labelId} className="ds-toggle-title">
          {title}
        </span>
        <small className="ds-vis-help">{helpText}</small>
      </div>
      <button
        type="button"
        className="ds-switch"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={onToggle}
      />
    </div>
  );
}

function MicVisibilitySelectRow({
  value,
  disabled,
  onChange
}: {
  value: MicVisibility;
  disabled: boolean;
  onChange: (next: MicVisibility) => void;
}): React.ReactElement {
  return (
    <div className="ds-toggle-card ds-vis-select-row">
      <div className="ds-toggle-copy">
        <label htmlFor="ds-vis-mic-select" className="ds-toggle-title">
          Composer mic button placement
        </label>
        <small className="ds-vis-help">
          Choose which chat composers display the voice dictation mic pill.
        </small>
      </div>
      <select
        id="ds-vis-mic-select"
        aria-label="Composer mic button placement"
        className="ds-select ds-vis-select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as MicVisibility)}
      >
        {MIC_VISIBILITY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {MIC_VISIBILITY_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Renders Draft Studio surface & placement controls inside Zana's Plugin Settings
 * (and optionally inside Draft Studio Settings when hosted with a pluginId).
 */
export function VisibilitySettingsSection(_props: VisibilitySettingsSectionProps): React.ReactElement {
  ensureStylesInjected();
  const visibility = useVisibilitySettings();
  const activePreset = detectVisibilityPreset(visibility);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyPatch = async (patch: Partial<DraftStudioVisibilitySettings>) => {
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage('Saving…');
    try {
      await updatePluginSettings(DRAFT_STUDIO_PLUGIN_ID, patch);
      setStatusMessage('Saved');
    } catch (err) {
      setStatusMessage(null);
      setErrorMessage(err instanceof Error ? err.message : 'Could not update visibility settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ds-vis-section" aria-labelledby="ds-visibility-heading">
      <VisibilityHeader statusMessage={statusMessage} />
      {errorMessage ? <div role="alert" className="ds-vis-error">{errorMessage}</div> : null}
      <VisibilityPresetGrid activePreset={activePreset} disabled={saving} onSelect={(p) => void applyPatch(p)} />
      <div className="ds-vis-controls">
        <VisibilitySwitchRow
          labelId="ds-vis-home-label"
          title="Main Home screen widget"
          helpText="Show a quick-dictate & Draft Studio card on Zana’s main Home screen."
          checked={visibility.showHomeWidget}
          disabled={saving}
          onToggle={() => void applyPatch({ showHomeWidget: !visibility.showHomeWidget })}
        />
        <VisibilitySwitchRow
          labelId="ds-vis-projects-label"
          title="Draft Studio tab in projects"
          helpText="Display a dedicated Draft Studio tab inside each project with project-scoped drafts."
          checked={visibility.showInProjects}
          disabled={saving}
          onToggle={() => void applyPatch({ showInProjects: !visibility.showInProjects })}
        />
        <MicVisibilitySelectRow
          value={visibility.micVisibility}
          disabled={saving}
          onChange={(micVisibility) => void applyPatch({ micVisibility })}
        />
      </div>
      <p className="ds-vis-note">
        Tip: You can hide or reorder the global <strong>Draft Studio</strong> item in Zana’s left sidebar using Zana’s sidebar customize menu.
      </p>
    </section>
  );
}
