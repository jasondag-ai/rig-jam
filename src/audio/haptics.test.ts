import { describe, expect, it } from 'vitest';
import { hapticWay, TICK_MS } from './haptics.ts';

describe('haptics', () => {
  it('Android vibrates, an iPhone goes through the hidden switch, anything else has none', () => {
    expect(hapticWay({ vibrate: true, switchInput: false })).toBe('vibrate');
    expect(hapticWay({ vibrate: false, switchInput: true })).toBe('switch');
    expect(hapticWay({ vibrate: false, switchInput: false })).toBe('none');
  });
  it('the tick is light', () => {
    expect(TICK_MS).toBeLessThanOrEqual(12);
  });
});
