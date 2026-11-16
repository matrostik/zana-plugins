/**
 * Visibility & surface placement configuration shared between server and app.
 * Keep this file free of Node and browser imports.
 */

export const MIC_VISIBILITY_OPTIONS = ['both', 'main', 'projects', 'off'] as const;
export type MicVisibility = (typeof MIC_VISIBILITY_OPTIONS)[number];

export const DEFAULT_SHOW_HOME_WIDGET = true;
export const DEFAULT_SHOW_IN_PROJECTS = true;
export const DEFAULT_MIC_VISIBILITY: MicVisibility = 'both';

export interface PromptVoiceVisibilitySettings {
  showHomeWidget: boolean;
  showInProjects: boolean;
  micVisibility: MicVisibility;
}

export type VisibilityPresetId = 'all' | 'projects' | 'main' | 'mic-only';

export interface VisibilityPreset {
  id: VisibilityPresetId;
  label: string;
  description: string;
  settings: PromptVoiceVisibilitySettings;
}

export const VISIBILITY_PRESETS: readonly VisibilityPreset[] = [
  {
    id: 'all',
    label: 'Main Screen & Projects',
    description: 'Show on Zana Home, inside Projects, and in all composers.',
    settings: { showHomeWidget: true, showInProjects: true, micVisibility: 'both' }
  },
  {
    id: 'projects',
    label: 'Projects Only',
    description: 'Show the Prompt Studio tab and mic button only inside projects.',
    settings: { showHomeWidget: false, showInProjects: true, micVisibility: 'projects' }
  },
  {
    id: 'main',
    label: 'Main Screen Only',
    description: 'Show on Zana Home and global composers; hide project tabs and project mics.',
    settings: { showHomeWidget: true, showInProjects: false, micVisibility: 'main' }
  },
  {
    id: 'mic-only',
    label: 'Composer Mic Only',
    description: 'Hide the Home widget and project tabs; keep only the composer mic.',
    settings: { showHomeWidget: false, showInProjects: false, micVisibility: 'both' }
  }
];

export const MIC_VISIBILITY_LABELS: Readonly<Record<MicVisibility, string>> = {
  both: 'Everywhere (Main & Projects)',
  main: 'Main screen composers only',
  projects: 'Project composers only',
  off: 'Hidden'
};

export function parseBooleanSetting(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

export function parseMicVisibility(value: unknown): MicVisibility {
  if (typeof value === 'string' && (MIC_VISIBILITY_OPTIONS as readonly string[]).includes(value)) {
    return value as MicVisibility;
  }
  return DEFAULT_MIC_VISIBILITY;
}

export function normalizeVisibilitySettings(
  raw: Record<string, unknown> | undefined
): PromptVoiceVisibilitySettings {
  const source = raw ?? {};
  return {
    showHomeWidget: parseBooleanSetting(source.showHomeWidget, DEFAULT_SHOW_HOME_WIDGET),
    showInProjects: parseBooleanSetting(source.showInProjects, DEFAULT_SHOW_IN_PROJECTS),
    micVisibility: parseMicVisibility(source.micVisibility)
  };
}

export function detectVisibilityPreset(
  settings: PromptVoiceVisibilitySettings
): VisibilityPresetId | 'custom' {
  for (const preset of VISIBILITY_PRESETS) {
    if (
      preset.settings.showHomeWidget === settings.showHomeWidget &&
      preset.settings.showInProjects === settings.showInProjects &&
      preset.settings.micVisibility === settings.micVisibility
    ) {
      return preset.id;
    }
  }
  return 'custom';
}

export type ComposerScopeLike =
  | string
  | {
      kind?: string;
      projectId?: string | null;
    }
  | null
  | undefined;

/**
 * Determines whether the composer MicButton should render for the active composer scope.
 */
export function isMicVisibleInScope(
  micVisibility: MicVisibility,
  scope: ComposerScopeLike,
  contextProjectId: string | null | undefined
): boolean {
  if (micVisibility === 'off') return false;
  if (micVisibility === 'both') return true;

  const scopeProjectId =
    scope && typeof scope === 'object' && 'projectId' in scope ? scope.projectId : undefined;
  const resolvedProjectId = scopeProjectId !== undefined ? scopeProjectId : contextProjectId;
  const isProjectContext = typeof resolvedProjectId === 'string' && resolvedProjectId.length > 0;

  return micVisibility === 'projects' ? isProjectContext : !isProjectContext;
}
