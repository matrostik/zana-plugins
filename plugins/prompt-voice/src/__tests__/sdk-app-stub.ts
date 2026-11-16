// Test stub for `@zana-ai/zcc-plugin-sdk/app`. The host provides the real module at runtime.
// Component tests replace these exports with `vi.mock` where they need specific behavior.
export function definePluginApp(setup: unknown) {
  return { __zccPluginApp: true, setup };
}

export function useRpc() {
  return { call: async () => null };
}

export async function callPluginRpc(_pluginId: string, _method: string, _args?: unknown) {
  return null;
}

export function useComposer() {
  return { text: '', setText() {}, updateText() {}, clear() {}, focus() {} };
}

export function useComposerView() {
  return { scope: undefined, layout: 'expanded', draft: { text: '', isEmpty: true, attachmentCount: 0 }, run: { isRunning: false, isSubmitting: false } };
}

export function useSettings() {
  return { values: undefined, isLoading: false };
}

export function useZccContext() {
  return { projectId: null, threadId: null };
}

export function useZccNavigate() {
  return {
    toThread() {},
    toProject() {},
    toPluginPanel() {},
    toCompose() {},
    openPanelAgent: () => false
  };
}

export function useRealtime(_channel: string, _handler: (payload: unknown) => void) {}

export async function getPluginSettings(_pluginId: string) {
  return { descriptors: {}, values: {} };
}

export async function setPluginSettings(_pluginId: string, _values: Record<string, string | boolean | undefined>) {}
