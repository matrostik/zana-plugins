import '@zana-ai/zcc-plugin-sdk/app';

// The published SDK type bundle omits this hook, which is exported by its runtime.
declare module '@zana-ai/zcc-plugin-sdk/app' {
  export function useRpc(): {
    call(method: string, args?: unknown): Promise<unknown>;
  };
}
