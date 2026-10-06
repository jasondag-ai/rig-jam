import { describe, expect, it } from 'vitest';
import { NUDGE_TEXT, nudgeDue } from './sound-nudge.ts';

const off = { sfx: false, music: false, style: 'country' } as const;

describe('the one-time "Tap for sound" nudge', () => {
  it('is offered once, to a player whose sound is all off', () => {
    expect(NUDGE_TEXT).toBe('Tap for sound');
    expect(nudgeDue(off, false)).toBe(true);
    expect(nudgeDue(off, true)).toBe(false);
    expect(nudgeDue({ ...off, sfx: true }, false)).toBe(false);
    expect(nudgeDue({ ...off, music: true }, false)).toBe(false);
  });

  it('stays out of automated browsers unless asked for, and can be switched off', () => {
    expect(nudgeDue(off, false, '', true)).toBe(false);
    expect(nudgeDue(off, false, '?soundnudge=1', true)).toBe(true);
    expect(nudgeDue(off, false, '?soundnudge=0', false)).toBe(false);
    expect(nudgeDue(off, true, '?soundnudge=1', true)).toBe(false);
  });
});
