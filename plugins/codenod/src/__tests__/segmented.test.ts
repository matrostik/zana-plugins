import { describe, expect, it } from 'vitest';
import { nextIndex } from '../app/Segmented.tsx';

describe('nextIndex', () => {
  it('moves forward and wraps from the last option to the first', () => {
    expect(nextIndex('ArrowRight', 0, 3)).toBe(1);
    expect(nextIndex('ArrowDown', 1, 3)).toBe(2);
    expect(nextIndex('ArrowRight', 2, 3)).toBe(0);
  });

  it('moves backward and wraps from the first option to the last', () => {
    expect(nextIndex('ArrowLeft', 2, 3)).toBe(1);
    expect(nextIndex('ArrowUp', 1, 3)).toBe(0);
    expect(nextIndex('ArrowLeft', 0, 3)).toBe(2);
  });

  it('jumps to the ends with Home and End', () => {
    expect(nextIndex('Home', 2, 3)).toBe(0);
    expect(nextIndex('End', 0, 3)).toBe(2);
  });

  it('returns null for keys it does not handle', () => {
    expect(nextIndex('Enter', 1, 3)).toBeNull();
  });
});
