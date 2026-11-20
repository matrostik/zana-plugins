// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StudioSettings } from '../app/StudioSettings.tsx';
import { INPUT_LANGUAGE_OPTIONS } from '../shared/languages.ts';
import { DICTIONARY_MAX_TERMS, addDictionaryTerms } from '../shared/dictionary.ts';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function setup(initialSettings: Record<string, string> = {}) {
  const call = vi.fn(async (method: string) => {
    if (method === 'draftStudio.settings.get') return initialSettings;
    return {};
  });
  const onBack = vi.fn();
  render(<StudioSettings rpc={{ call }} onBack={onBack} />);
  return { call, onBack };
}

describe('INPUT_LANGUAGE_OPTIONS', () => {
  it('contains auto first, unique codes, and valid BCP-47 tags', () => {
    expect(INPUT_LANGUAGE_OPTIONS[0]).toEqual({ code: 'auto', label: 'Detect automatically' });
    expect(INPUT_LANGUAGE_OPTIONS.length).toBeGreaterThanOrEqual(50);

    const codes = new Set<string>();
    for (const option of INPUT_LANGUAGE_OPTIONS) {
      expect(codes.has(option.code)).toBe(false);
      codes.add(option.code);
      if (option.code !== 'auto') {
        expect(() => Intl.getCanonicalLocales(option.code)).not.toThrow();
      }
    }
  });
});

describe('addDictionaryTerms', () => {
  it('merges comma/newline separated terms without duplicates and respects max limit', () => {
    expect(addDictionaryTerms(['Gemini'], 'Ollama, Gemini\nLM Studio')).toEqual([
      'Gemini',
      'Ollama',
      'LM Studio'
    ]);

    const full = Array.from({ length: DICTIONARY_MAX_TERMS }, (_, i) => `term-${i}`);
    expect(addDictionaryTerms(full, 'extra')).toHaveLength(DICTIONARY_MAX_TERMS);
  });
});

describe('StudioSettings', () => {
  it('renders expanded input languages and persists selection changes', async () => {
    const { call } = setup({ inputLanguage: 'en' });
    const langSelect = (await screen.findByLabelText(/input language/i)) as HTMLSelectElement;

    await waitFor(() => expect(langSelect.value).toBe('en'));

    expect(within(langSelect).getByRole('option', { name: 'Arabic' })).toBeTruthy();
    expect(within(langSelect).getByRole('option', { name: 'Chinese' })).toBeTruthy();
    expect(within(langSelect).getByRole('option', { name: 'Korean' })).toBeTruthy();
    expect(within(langSelect).getByRole('option', { name: 'Portuguese' })).toBeTruthy();
    expect(within(langSelect).getByRole('option', { name: 'Ukrainian' })).toBeTruthy();

    fireEvent.change(langSelect, { target: { value: 'uk' } });
    expect(call).toHaveBeenCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ inputLanguage: 'uk' })
    );
  });

  it('preserves a custom BCP-47 input language saved externally', async () => {
    setup({ inputLanguage: 'de-DE' });
    const langSelect = (await screen.findByLabelText(/input language/i)) as HTMLSelectElement;
    await waitFor(() => expect(langSelect.value).toBe('de-DE'));
    expect(within(langSelect).getByRole('option', { name: 'de-DE' })).toBeTruthy();
  });

  it('renders existing dictionary terms as pills with count and supports adding, removing, and clearing', async () => {
    const { call } = setup({ dictionary: 'Gemini\nRos, PDF' });

    const list = await screen.findByRole('list', { name: /dictionary terms/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('3 terms active')).toBeTruthy();

    const input = screen.getByLabelText(/personal dictionary/i) as HTMLInputElement;
    const addBtn = screen.getByRole('button', { name: /\+ add/i }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);

    // Add via Enter with comma-separated values and a duplicate
    fireEvent.change(input, { target: { value: 'Ollama, LM Studio, Gemini' } });
    expect(addBtn.disabled).toBe(false);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input.value).toBe('');
    expect(within(screen.getByRole('list', { name: /dictionary terms/i })).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('5 terms active')).toBeTruthy();
    expect(call).toHaveBeenCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ dictionary: 'Gemini\nRos\nPDF\nOllama\nLM Studio' })
    );

    // Add single term via + Add button
    fireEvent.change(input, { target: { value: 'Qwen' } });
    fireEvent.click(addBtn);
    expect(screen.getByText('6 terms active')).toBeTruthy();

    // Remove a single pill
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ros' }));
    expect(screen.getByText('5 terms active')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove Ros' })).toBeNull();
    expect(call).toHaveBeenLastCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ dictionary: 'Gemini\nPDF\nOllama\nLM Studio\nQwen' })
    );

    // Clear all pills
    const clearBtn = screen.getByRole('button', { name: /clear all/i }) as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(false);
    fireEvent.click(clearBtn);
    expect(screen.getByText('0 terms active')).toBeTruthy();
    expect(screen.getByText(/no terms added yet/i)).toBeTruthy();
    expect(clearBtn.disabled).toBe(true);
    expect(call).toHaveBeenLastCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ dictionary: '' })
    );
  });

  it('normalizes pasted multiline terms into comma-separated input', async () => {
    setup({});
    const input = (await screen.findByLabelText(/personal dictionary/i)) as HTMLInputElement;
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());

    fireEvent.paste(input, {
      clipboardData: { getData: () => 'Antigravity\nOpenRouter\nChatGPT' }
    });
    expect(input.value).toBe('Antigravity, OpenRouter, ChatGPT');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('3 terms active')).toBeTruthy();
  });

  it('renders Audio & Feedback card above Voice & transcription with System default mic and persists mic selection', async () => {
    const enumerateDevices = vi.fn(async () => [
      { deviceId: 'default', kind: 'audioinput', label: 'Default - Built-in Mic', groupId: '1' },
      { deviceId: 'usb-yeti', kind: 'audioinput', label: 'Blue Yeti USB', groupId: '2' }
    ]);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { enumerateDevices, addEventListener: vi.fn(), removeEventListener: vi.fn() },
      configurable: true
    });

    const { call } = setup({});
    const audioHeading = await screen.findByRole('heading', { name: /audio & feedback/i });
    const voiceHeading = screen.getByRole('heading', { name: /voice & transcription/i });
    expect(audioHeading.compareDocumentPosition(voiceHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const micSelect = (await screen.findByLabelText(/input microphone/i)) as HTMLSelectElement;
    await waitFor(() => expect(within(micSelect).getByRole('option', { name: 'Blue Yeti USB' })).toBeTruthy());
    expect(micSelect.value).toBe('default');
    expect(within(micSelect).getByRole('option', { name: 'System default (Built-in Mic)' })).toBeTruthy();

    fireEvent.change(micSelect, { target: { value: 'usb-yeti' } });
    expect(call).toHaveBeenCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ micDeviceId: 'usb-yeti', micLabel: 'Blue Yeti USB' })
    );
  });

  it('preserves a disconnected saved microphone option and refreshes unlabeled devices on demand', async () => {
    let labelsReady = false;
    const stopTrack = vi.fn();
    const enumerateDevices = vi.fn(async () => [
      { deviceId: 'usb-desk', kind: 'audioinput', label: labelsReady ? 'Desk Condenser' : '', groupId: '1' }
    ]);
    const getUserMedia = vi.fn(async () => {
      labelsReady = true;
      return { getTracks: () => [{ stop: stopTrack }] };
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { enumerateDevices, getUserMedia, addEventListener: vi.fn(), removeEventListener: vi.fn() },
      configurable: true
    });

    setup({ micDeviceId: 'missing-mic', micLabel: 'Shure MV7' });
    const micSelect = (await screen.findByLabelText(/input microphone/i)) as HTMLSelectElement;
    await waitFor(() => expect(micSelect.value).toBe('missing-mic'));
    expect(within(micSelect).getByRole('option', { name: 'Shure MV7 (Disconnected)' })).toBeTruthy();
    expect(screen.getByText(/currently disconnected/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /refresh microphones/i }));
    await waitFor(() => expect(within(micSelect).getByRole('option', { name: 'Desk Condenser' })).toBeTruthy());
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stopTrack).toHaveBeenCalled();
  });

  it('toggles sound cues, adjusts volume, plays test chime, and resets Audio & Feedback', async () => {
    const startOsc = vi.fn();
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => undefined);
      createOscillator = () => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: startOsc,
        stop: vi.fn()
      });
      createGain = () => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      });
    });

    const { call } = setup({ micDeviceId: 'usb-1', micLabel: 'Mic 1', soundCuesEnabled: 'true', soundCuesVolume: '75' });
    const toggle = await screen.findByRole('switch', { name: /sound cues/i });
    const slider = screen.getByLabelText(/chime volume/i) as HTMLInputElement;
    const testBtn = screen.getByRole('button', { name: /test chime/i }) as HTMLButtonElement;

    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
    expect(slider.value).toBe('75');
    expect(slider.disabled).toBe(false);

    fireEvent.click(testBtn);
    expect(startOsc).toHaveBeenCalled();

    fireEvent.change(slider, { target: { value: '40' } });
    expect(screen.getByText('40%')).toBeTruthy();
    expect(call).toHaveBeenCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ soundCuesVolume: '40' })
    );

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(slider.disabled).toBe(true);
    expect(testBtn.disabled).toBe(true);
    expect(call).toHaveBeenCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ soundCuesEnabled: 'false' })
    );

    // Reset Audio & Feedback section
    const audioSection = screen.getByRole('heading', { name: /audio & feedback/i }).closest('section')!;
    fireEvent.click(within(audioSection).getByRole('button', { name: /^reset$/i }));
    expect(call).toHaveBeenLastCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({
        micDeviceId: 'default',
        micLabel: '',
        soundCuesEnabled: 'true',
        soundCuesVolume: '75'
      })
    );
  });

  it('shows an informative error if enumerating microphones fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        enumerateDevices: vi.fn(async () => { throw new Error('Device service offline'); }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      configurable: true
    });

    setup({});
    const msg = await screen.findByText(/could not list microphones/i);
    expect(msg.closest('[role="alert"]')).toBeTruthy();
    const micSelect = screen.getByLabelText(/input microphone/i) as HTMLSelectElement;
    expect(micSelect.value).toBe('default');
  });

  it('defaults Cleanup tone to Standard (Fix & clarify) and offers Casual, Conversational, Professional, and Technical', async () => {
    const { call } = setup({});
    const toneSelect = (await screen.findByLabelText(/cleanup tone/i)) as HTMLSelectElement;
    await waitFor(() => expect(toneSelect.value).toBe('standard'));

    const optionLabels = Array.from(toneSelect.options).map((o) => o.textContent);
    expect(optionLabels).toEqual([
      'Standard (Fix & clarify)',
      'Casual',
      'Conversational',
      'Professional',
      'Technical',
      'Custom'
    ]);

    fireEvent.change(toneSelect, { target: { value: 'formal' } });
    expect(call).toHaveBeenCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ tone: 'formal' })
    );
  });

  it('manages History & Privacy toggle, retention limits, and clear history with starred protection', async () => {
    const call = vi.fn(async (method: string) => {
      if (method === 'draftStudio.settings.get') {
        return { historyEnabled: 'true', historyMaxEntries: '500', historyMaxDays: '90' };
      }
      if (method === 'draftStudio.history.clear') {
        return { ok: true, deletedCount: 4 };
      }
      return {};
    });
    render(<StudioSettings rpc={{ call }} onBack={vi.fn()} />);

    const saveToggle = await screen.findByRole('switch', { name: /save activity history/i });
    await waitFor(() => expect(saveToggle.getAttribute('aria-checked')).toBe('true'));

    fireEvent.click(saveToggle);
    expect(call).toHaveBeenCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ historyEnabled: 'false' })
    );

    const maxEntriesSelect = screen.getByLabelText(/maximum history entries/i) as HTMLSelectElement;
    fireEvent.change(maxEntriesSelect, { target: { value: '2000' } });
    expect(call).toHaveBeenCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ historyMaxEntries: '2000' })
    );

    const maxDaysSelect = screen.getByLabelText(/history retention period/i) as HTMLSelectElement;
    fireEvent.change(maxDaysSelect, { target: { value: '30' } });
    expect(call).toHaveBeenCalledWith(
      'draftStudio.settings.update',
      expect.objectContaining({ historyMaxDays: '30' })
    );

    // Clear history dialog defaults to protecting starred entries
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    const checkbox = screen.getByRole('checkbox', { name: /also delete starred entries/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear' }));

    await waitFor(() =>
      expect(call).toHaveBeenCalledWith('draftStudio.history.clear', {
        includeStarred: false
      })
    );
    expect(await screen.findByText(/cleared 4 history entries/i)).toBeTruthy();

    // Clear again including starred entries
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /also delete starred entries/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm clear' }));
    await waitFor(() =>
      expect(call).toHaveBeenCalledWith('draftStudio.history.clear', {
        includeStarred: true
      })
    );
  });

  it('omits unconfigured speech providers in settings and displays only configured ones', async () => {
    let availableSttProviders: string[] = ['system'];
    const call = vi.fn(async (method: string) => {
      if (method === 'draftStudio.settings.get') return { sttProvider: 'system' };
      if (method === 'draftStudio.status') {
        return { sttProvider: 'system', sttKeyConfigured: true, availableSttProviders };
      }
      return {};
    });
    const view = render(<StudioSettings rpc={{ call }} onBack={vi.fn()} />);

    const sttSelect = (await screen.findByLabelText(/speech-to-text provider/i)) as HTMLSelectElement;
    await waitFor(() => expect(call).toHaveBeenCalledWith('draftStudio.status'));
    expect(Array.from(sttSelect.options).map((o) => o.value)).toEqual(['system']);
    expect(within(sttSelect).queryByRole('option', { name: 'OpenAI' })).toBeNull();
    expect(within(sttSelect).queryByRole('option', { name: 'Google Gemini' })).toBeNull();
    expect(within(sttSelect).queryByRole('option', { name: 'Local Whisper (on this device)' })).toBeNull();

    view.unmount();
    availableSttProviders = ['system', 'openai', 'local-whisper'];
    render(<StudioSettings rpc={{ call }} onBack={vi.fn()} />);
    const updatedSelect = (await screen.findByLabelText(/speech-to-text provider/i)) as HTMLSelectElement;
    await waitFor(() =>
      expect(Array.from(updatedSelect.options).map((o) => o.value)).toEqual(['system', 'openai', 'local-whisper'])
    );
    expect(within(updatedSelect).queryByRole('option', { name: 'Google Gemini' })).toBeNull();
  });

  it('registers plugin stylesheet element on render and keeps settings styles in styles.css', () => {
    setup({});
    expect(document.getElementById('zcc-ext-draft-studio-styles')).toBeTruthy();
    const css = readFileSync(resolve(__dirname, '../../styles.css'), 'utf8');
    expect(css).toContain('.ds-dict-pill');
    expect(css).toContain('.ds-switch');
    expect(css).toContain('.ds-volume-slider');
  });
});
