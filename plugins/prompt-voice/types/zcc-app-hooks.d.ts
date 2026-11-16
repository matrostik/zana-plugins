/**
 * Frontend runtime hooks and types exported by `@zana-ai/zcc-plugin-sdk/app`
 * that the vendored contract file does not declare yet.
 */
declare module '@zana-ai/zcc-plugin-sdk/app' {
  export interface PluginSettingsState {
    values: Record<string, string | number | boolean> | undefined;
    isLoading: boolean;
  }

  export interface ZccContext {
    resourceId?: string;
    resourceRequestId?: string;
    projectId: string | null;
    threadId: string | null;
    surface?: 'main' | 'project-window' | 'plugin-view';
    sidePanel?: boolean;
    sidePanelOpen?: boolean;
  }

  export interface PluginDetachedTabProps {
    pluginId: string;
    projectId: string;
    focusWindow(): void;
    bringBack(): void;
  }

  export function useRealtime(channel: string, handler: (payload: unknown) => void): void;
  export function useSettings(): PluginSettingsState;
  export function useZccContext(): ZccContext;
}
