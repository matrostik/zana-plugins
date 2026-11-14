export const COMPARISON_SETUP_RPC = {
  status: 'comparison:status',
  connect: 'comparison:connect',
  removeKey: 'comparison:removeKey'
} as const;

export interface ComparisonConnectionStatus {
  configured: boolean;
  encryptionAvailable: boolean;
  connectedAtMs: number | null;
  retryAtMs: number | null;
}
