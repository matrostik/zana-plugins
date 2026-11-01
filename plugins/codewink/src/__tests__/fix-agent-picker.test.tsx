// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FixAgentPicker } from '../app/FixAgentPicker.tsx';
import type { FixProvider } from '../server/types.ts';

const providers: FixProvider[] = [
  { providerId: 'codex', displayName: 'Codex', error: null, permissionModes: ['edit', 'full'], models: [{ id: 'a', label: 'Model A', reasoningLevels: [] }] },
  { providerId: 'claude', displayName: 'Claude', error: null, permissionModes: ['accept-edits'], models: [{ id: 'b', label: 'Model B', reasoningLevels: [] }] },
  { providerId: 'full-only', displayName: 'Full only', error: null, permissionModes: ['full'], models: [{ id: 'c', label: 'Model C', reasoningLevels: [] }] }
];

beforeEach(() => {
  const saved = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mount(catalog: FixProvider[] | Error = providers, onRun = vi.fn(async () => {})) {
  const call = vi.fn(async () => { if (catalog instanceof Error) throw catalog; return catalog; });
  const onClose = vi.fn();
  const view = render(<FixAgentPicker rpc={{ call }} defaults={[{ providerId: 'codex', model: 'a' }]} onRun={onRun} onClose={onClose} />);
  return { ...view, onRun, onClose, call };
}

describe('FixAgentPicker', () => {
  it('labels each permission mode distinctly and launches the selected mode', async () => {
    const view = mount([{ ...providers[0], permissionModes: ['edit', 'accept-edits', 'full'] }]);
    const mode = await screen.findByLabelText('Mode');
    expect(within(mode).getByRole('option', { name: 'Edit' }).getAttribute('value')).toBe('edit');
    expect(within(mode).getByRole('option', { name: 'Accept edits' }).getAttribute('value')).toBe('accept-edits');
    expect(within(mode).getByRole('option', { name: 'Full' }).getAttribute('value')).toBe('full');
    fireEvent.change(mode, { target: { value: 'accept-edits' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start fix' }));
    await waitFor(() => expect(view.onRun).toHaveBeenCalledWith({ providerId: 'codex', model: 'a', permissionMode: 'accept-edits' }));
  });

  it('starts with Edit, offers other providers, and remembers the explicit launch choice', async () => {
    const view = mount();
    const mode = await screen.findByLabelText('Mode') as HTMLSelectElement;
    expect(mode.value).toBe('edit');
    expect(view.call).toHaveBeenCalledWith('availableFixModels');
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'claude' } });
    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('b');
    expect(within(mode).queryByRole('option', { name: 'Full' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start fix' }));
    await waitFor(() => expect(view.onRun).toHaveBeenCalledWith({ providerId: 'claude', model: 'b', permissionMode: 'accept-edits' }));
    view.unmount();
    mount();
    expect((await screen.findByLabelText('Provider') as HTMLSelectElement).value).toBe('claude');
    expect((screen.getByLabelText('Mode') as HTMLSelectElement).value).toBe('accept-edits');
  });

  it('requires an explicit Full choice when Edit is unsupported', async () => {
    mount();
    fireEvent.change(await screen.findByLabelText('Provider'), { target: { value: 'full-only' } });
    expect((screen.getByRole('button', { name: 'Start fix' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'full' } });
    expect((screen.getByRole('button', { name: 'Start fix' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('keeps launch errors visible and retries the selected model without fallback', async () => {
    const run = vi.fn(async () => { throw new Error('Quota exceeded'); });
    mount(providers, run);
    fireEvent.change(await screen.findByLabelText('Mode'), { target: { value: 'full' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start fix' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Quota exceeded');
    expect(run).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('Mode') as HTMLSelectElement).value).toBe('full');
    fireEvent.click(screen.getByRole('button', { name: 'Start fix' }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(2));
  });

  it('prevents launch with a remembered unavailable model', async () => {
    localStorage.setItem('codewink.fixAgent', JSON.stringify({ providerId: 'codex', model: 'removed', permissionMode: 'full' }));
    mount();
    await screen.findByLabelText('Model');
    expect((screen.getByRole('button', { name: 'Start fix' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'a' } });
    expect((screen.getByRole('button', { name: 'Start fix' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each([[], new Error('Model discovery failed')])('handles an empty or failed catalog', async (catalog) => {
    mount(catalog);
    await screen.findByText(catalog instanceof Error ? 'Model discovery failed' : 'No providers available. Configure a provider in Zana settings.');
    expect((screen.getByRole('button', { name: 'Start fix' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('supports cancellation with Escape without starting a thread', async () => {
    const view = mount();
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(view.onClose).toHaveBeenCalledOnce();
    expect(view.onRun).not.toHaveBeenCalled();
  });
});
