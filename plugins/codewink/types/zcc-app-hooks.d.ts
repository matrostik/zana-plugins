/**
 * Frontend runtime hooks exported by the host's `@zana-ai/zcc-plugin-sdk/app`
 * facade that the vendored contract file does not declare yet.
 */
declare module '@zana-ai/zcc-plugin-sdk/app' {
  export function useRpc(): { call(method: string, args?: unknown): Promise<unknown> };
  export function useRealtime(event: string, handler: (payload: unknown) => void): void;
  export function useZccNavigate(): {
    toThread?(threadId: string): void;
    toPluginPanel?(path: string): void;
  };
  export function experimental_requestApproval(
    pluginId: string,
    request: {
      binding: { action: string; target: string; targetLabel: string; subject: string; revision?: string; confirmText?: string };
      title: string;
      details?: string[];
      confirmLabel?: string;
      tone?: 'default' | 'danger';
    }
  ): Promise<{ approved: boolean; token?: string; reason?: string }>;
}
