import { describe, expect, it } from 'vitest';
import {
  VISIBILITY_PRESETS,
  detectVisibilityPreset,
  isMicVisibleInScope,
  normalizeVisibilitySettings,
  parseBooleanSetting,
  parseMicVisibility
} from '../shared/visibility.ts';

describe('visibility helpers', () => {
  it('parses boolean settings with string and fallback handling', () => {
    expect(parseBooleanSetting(true, false)).toBe(true);
    expect(parseBooleanSetting(false, true)).toBe(false);
    expect(parseBooleanSetting('TRUE', false)).toBe(true);
    expect(parseBooleanSetting(' false ', true)).toBe(false);
    expect(parseBooleanSetting('unknown', true)).toBe(true);
    expect(parseBooleanSetting(undefined, false)).toBe(false);
  });

  it('parses mic visibility options with safe fallback', () => {
    expect(parseMicVisibility('both')).toBe('both');
    expect(parseMicVisibility('main')).toBe('main');
    expect(parseMicVisibility('projects')).toBe('projects');
    expect(parseMicVisibility('off')).toBe('off');
    expect(parseMicVisibility('everywhere')).toBe('both');
    expect(parseMicVisibility(123)).toBe('both');
  });

  it('normalizes raw visibility settings with defaults', () => {
    expect(normalizeVisibilitySettings(undefined)).toEqual({
      showHomeWidget: true,
      showInProjects: true,
      micVisibility: 'both'
    });

    expect(
      normalizeVisibilitySettings({
        showHomeWidget: 'false',
        showInProjects: false,
        micVisibility: 'projects'
      })
    ).toEqual({
      showHomeWidget: false,
      showInProjects: false,
      micVisibility: 'projects'
    });
  });

  it('detects matching presets or falls back to custom', () => {
    for (const preset of VISIBILITY_PRESETS) {
      expect(detectVisibilityPreset(preset.settings)).toBe(preset.id);
    }
    expect(
      detectVisibilityPreset({
        showHomeWidget: true,
        showInProjects: true,
        micVisibility: 'off'
      })
    ).toBe('custom');
  });

  it('evaluates composer mic visibility across global and project scopes', () => {
    expect(isMicVisibleInScope('off', { kind: 'new-thread', projectId: 'p1' }, 'p1')).toBe(false);
    expect(isMicVisibleInScope('both', { kind: 'new-thread', projectId: null }, null)).toBe(true);
    expect(isMicVisibleInScope('both', { kind: 'new-thread', projectId: 'p1' }, 'p1')).toBe(true);

    // Explicit scope.projectId takes precedence over outer context
    expect(isMicVisibleInScope('projects', { kind: 'new-thread', projectId: null }, 'p1')).toBe(false);
    expect(isMicVisibleInScope('main', { kind: 'new-thread', projectId: null }, 'p1')).toBe(true);

    expect(isMicVisibleInScope('projects', { kind: 'new-thread', projectId: 'p1' }, null)).toBe(true);
    expect(isMicVisibleInScope('main', { kind: 'new-thread', projectId: 'p1' }, null)).toBe(false);

    // Thread scopes without scope.projectId rely on ZccContext.projectId
    expect(isMicVisibleInScope('projects', { kind: 'thread' }, 'p1')).toBe(true);
    expect(isMicVisibleInScope('projects', { kind: 'thread' }, null)).toBe(false);
    expect(isMicVisibleInScope('main', { kind: 'thread' }, 'p1')).toBe(false);
    expect(isMicVisibleInScope('main', { kind: 'thread' }, null)).toBe(true);
  });
});
