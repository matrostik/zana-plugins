export function definePluginApp(setup: unknown) {
  return { __zccPluginApp: true, setup };
}

export function useRpc() {
  return { call: async () => null };
}

export function useRealtime() {}

export function useZccNavigate() {
  return {};
}

export async function experimental_requestApproval() {
  return { approved: false, reason: 'unavailable' };
}
