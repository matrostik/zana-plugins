/**
 * Frontend runtime hooks exported by the host's `@zana-ai/zcc-plugin-sdk/app`
 * facade that the vendored contract file does not declare yet.
 */
declare module '@zana-ai/zcc-plugin-sdk/app' {
  export interface PluginNavPanelProps {
    pluginId: string;
    subPath: string;
  }

  export function useRpc(): { call(method: string, args?: unknown): Promise<unknown> };
  export function useRealtime(event: string, handler: (payload: unknown) => void): void;
  export function useSettings(): {
    values: Record<string, string | number | boolean | undefined> | undefined;
    isLoading: boolean;
  };
  export function useZccNavigate(): {
    toThread?(threadId: string): void;
    toPluginPanel?(path: string, options?: { subPath?: string; replace?: boolean }): void;
  };
}
