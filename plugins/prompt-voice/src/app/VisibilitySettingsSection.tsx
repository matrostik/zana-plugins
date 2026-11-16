import React, { useState } from 'react';
import {
  MIC_VISIBILITY_LABELS,
  MIC_VISIBILITY_OPTIONS,
  VISIBILITY_PRESETS,
  detectVisibilityPreset,
  type MicVisibility,
  type PromptVoiceVisibilitySettings
} from '../shared/visibility.ts';
import { ensureStylesInjected } from './injectStyles.ts';
import { updatePluginSettings, useVisibilitySettings } from './safeSdk.ts';

export interface VisibilitySettingsSectionProps {
  pluginId: string;
}

/**
 * Renders Prompt Voice surface & placement controls inside Zana's Plugin Settings
 * (and optionally inside Prompt Studio Settings when hosted with a pluginId).
 */
export function VisibilitySettingsSection({ pluginId }: VisibilitySettingsSectionProps): React.ReactElement {
  ensureStylesInjected();
  const visibility = useVisibilitySettings();
  const activePreset = detectVisibilityPreset(visibility);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyPatch = async (patch: Partial<PromptVoiceVisibilitySettings>) => {
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage('Saving…');
    try {
      await updatePluginSettings(pluginId, patch);
      setStatusMessage('Saved');
    } catch (err) {
      setStatusMessage(null);
      setErrorMessage(err instanceof Error ? err.message : 'Could not update visibility settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ps-vis-section" aria-labelledby="ps-visibility-heading">
      <div className="ps-vis-header">
        <div>
          <h3 id="ps-visibility-heading" className="ps-vis-title">
            Where Prompt Voice Appears
          </h3>
          <p className="ps-vis-subtitle">
            Control whether Prompt Voice surfaces on the main Home screen, inside Projects, and in thread composers.
          </p>
        </div>
        <div className="ps-vis-status-slot">
          {statusMessage ? (
            <span role="status" className="ps-vis-status">
              {statusMessage}
            </span>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div role="alert" className="ps-vis-error">
          {errorMessage}
        </div>
      ) : null}

      <div className="ps-vis-presets" role="group" aria-label="Surface visibility presets">
        {VISIBILITY_PRESETS.map((preset) => {
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`ps-vis-preset-card ${isActive ? 'active' : ''}`}
              aria-pressed={isActive}
              disabled={saving}
              onClick={() => void applyPatch(preset.settings)}
            >
              <span className="ps-vis-preset-label">{preset.label}</span>
              <span className="ps-vis-preset-desc">{preset.description}</span>
            </button>
          );
        })}
      </div>

      <div className="ps-vis-controls">
        <div className="ps-toggle-card">
          <div className="ps-toggle-copy">
            <span id="ps-vis-home-label" className="ps-toggle-title">
              Main Home screen widget
            </span>
            <small className="ps-vis-help">
              Show a quick-dictate &amp; Prompt Studio card on Zana’s main Home screen.
            </small>
          </div>
          <button
            type="button"
            className="ps-switch"
            role="switch"
            aria-checked={visibility.showHomeWidget}
            aria-labelledby="ps-vis-home-label"
            disabled={saving}
            onClick={() => void applyPatch({ showHomeWidget: !visibility.showHomeWidget })}
          />
        </div>

        <div className="ps-toggle-card">
          <div className="ps-toggle-copy">
            <span id="ps-vis-projects-label" className="ps-toggle-title">
              Prompt Studio tab in projects
            </span>
            <small className="ps-vis-help">
              Display a dedicated Prompt Studio tab inside each project with project-scoped drafts.
            </small>
          </div>
          <button
            type="button"
            className="ps-switch"
            role="switch"
            aria-checked={visibility.showInProjects}
            aria-labelledby="ps-vis-projects-label"
            disabled={saving}
            onClick={() => void applyPatch({ showInProjects: !visibility.showInProjects })}
          />
        </div>

        <div className="ps-toggle-card ps-vis-select-row">
          <div className="ps-toggle-copy">
            <label htmlFor="ps-vis-mic-select" className="ps-toggle-title">
              Composer mic button placement
            </label>
            <small className="ps-vis-help">
              Choose which chat composers display the voice dictation mic pill.
            </small>
          </div>
          <select
            id="ps-vis-mic-select"
            aria-label="Composer mic button placement"
            className="ps-select ps-vis-select"
            value={visibility.micVisibility}
            disabled={saving}
            onChange={(e) => void applyPatch({ micVisibility: e.target.value as MicVisibility })}
          >
            {MIC_VISIBILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {MIC_VISIBILITY_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="ps-vis-note">
        Tip: You can hide or reorder the global <strong>Prompt Studio</strong> item in Zana’s left sidebar using Zana’s sidebar customize menu.
      </p>
    </section>
  );
}
