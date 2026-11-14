export function definePluginApp(setup: unknown) {
  return { __zccPluginApp: true, setup };
}

export function useRpc() {
  return { call: async () => null };
}

export function useRealtime() {}

export function useSettings() {
  return { values: {}, isLoading: false };
}

export function useZccNavigate() {
  return {};
}
