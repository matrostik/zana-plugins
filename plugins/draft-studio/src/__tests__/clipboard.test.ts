// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from '../app/clipboard.ts';

describe('copyToClipboard', () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true
    });
    document.execCommand = originalExecCommand;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    });

    await expect(copyToClipboard('hello world')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello world');
  });

  it('falls back to document.execCommand and cleans up the temporary textarea on success', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand;

    await expect(copyToClipboard('fallback text')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.body.querySelector('textarea')).toBeNull();
  });

  it('removes the temporary textarea even if document.execCommand throws', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    document.execCommand = vi.fn(() => {
      throw new Error('execCommand blocked');
    });

    await expect(copyToClipboard('secret draft')).resolves.toBe(false);
    expect(document.body.querySelector('textarea')).toBeNull();
  });

  it('returns false for empty text without touching the clipboard or DOM', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await expect(copyToClipboard('')).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(document.body.querySelector('textarea')).toBeNull();
  });
});
