// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMPARISON_SETUP_RPC } from '../shared/comparison-setup.ts';
import { RPC_METHODS } from '../shared/types.ts';

const call = vi.hoisted(() => vi.fn());
vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({
  useRpc: () => ({ call }),
  useSettings: () => ({ values: {}, isLoading: false }),
  useZccNavigate: () => ({ toPluginPanel: vi.fn() })
}));
import { ComparisonKeySettings } from '../app/ComparisonKeySettings.tsx';
import { SettingsSection } from '../app/SettingsSection.tsx';

afterEach(() => { cleanup(); call.mockReset(); });
const unconfigured = { configured: false, encryptionAvailable: true, connectedAtMs: null, retryAtMs: null };

describe('comparison credential UI', () => {
  it('submits through RPC, clears the password and shows only configured status', async () => {
    call.mockImplementation(async (method: string) => method === COMPARISON_SETUP_RPC.connect
      ? { ...unconfigured, configured: true, connectedAtMs: 1000 } : unconfigured);
    render(<ComparisonKeySettings />);
    const field = await screen.findByLabelText('Artificial Analysis API key');
    fireEvent.change(field, { target: { value: 'private-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and connect' }));
    await screen.findByText('Key configured');
    expect(call).toHaveBeenCalledWith(COMPARISON_SETUP_RPC.connect, { key: 'private-key' });
    expect((field as HTMLInputElement).value).toBe('');
    expect(screen.queryByText('private-key')).toBeNull();
  });

  it('disables key saving when OS encryption is unavailable', async () => {
    call.mockResolvedValue({ ...unconfigured, encryptionAvailable: false });
    render(<ComparisonKeySettings />);
    await screen.findByText(/Encrypted key storage is currently supported on Windows/);
    expect((screen.getByRole('button', { name: 'Save and connect' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('clears transient key input after a failed attempt and never displays echoed secrets', async () => {
    call.mockImplementation(async (method: string) => {
      if (method === COMPARISON_SETUP_RPC.connect) throw new Error('bad private-key');
      return unconfigured;
    });
    render(<ComparisonKeySettings />);
    const field = await screen.findByLabelText('Artificial Analysis API key');
    fireEvent.change(field, { target: { value: 'private-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and connect' }));
    await screen.findByRole('alert');
    expect((field as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('alert').textContent).not.toContain('private-key');
  });

  it('provides a Remove action and respects the persisted rate-limit cooldown', async () => {
    call.mockResolvedValue({ ...unconfigured, configured: true, retryAtMs: Date.now() + 60_000 });
    render(<ComparisonKeySettings />);
    await screen.findByText('Key configured');
    expect((screen.getByRole('button', { name: 'Replace and connect' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove key' }));
    await waitFor(() => expect(call).toHaveBeenCalledWith(COMPARISON_SETUP_RPC.removeKey));
  });

  it('renders Artificial Analysis key settings inside SettingsSection', async () => {
    call.mockImplementation(async (method: string) => {
      if (method === COMPARISON_SETUP_RPC.status) return unconfigured;
      if (method === RPC_METHODS.dashboard) {
        return {
          kpis: {}, providers: [], models: [], projects: [], dailyTrend: [],
          budgets: [], pricingRules: [], cloudConnectors: [], lastSyncedAtMs: 0
        };
      }
      return null;
    });
    render(<SettingsSection />);
    await screen.findByRole('region', { name: 'Artificial Analysis connection' });
    await screen.findByText('No key configured');
  });
});
