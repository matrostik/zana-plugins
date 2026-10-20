// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { copyText, copyViaTextarea } from '../app/clipboard.js';

describe('clipboard helpers without a DOM', () => {
  it('reports failure when no document exists', () => {
    expect(copyViaTextarea('x')).toBe(false);
  });

  it('falls back when the async clipboard API is missing', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', undefined);
    await expect(copyText('x')).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});
