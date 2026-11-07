// Test stub for `@zana-ai/zcc-plugin-sdk/app`. The host provides the real module at runtime.
// Component tests replace these exports with `vi.mock` where they need specific behavior.
export function definePluginApp(setup: unknown) {
  return { __zccPluginApp: true, setup };
}

export function useRpc() {
  return { call: async () => null };
}

export function useComposer() {
  return { text: '', setText() {}, updateText() {}, clear() {}, focus() {} };
}
