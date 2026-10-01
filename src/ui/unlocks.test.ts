import { describe, expect, it } from 'vitest';
import { levelLockText, levelOpen, newlyOpened, regionLockText, regionOpen } from './unlocks.ts';

const region = (id: string, name: string) => ({ id, name, levels: Array.from({ length: 10 }, (_, i) => ({ id: `${id}${i + 1}` })) });
const R = [region('c', 'Cardium'), region('m', 'Montney'), region('v', 'Duvernay')];
const clears = (prefix: string, n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}${i + 1}`, 5]));

describe('level locks', () => {
  it('opens only Cardium 1 for a fresh player', () => {
    expect(levelOpen(R, 0, 0, {}, false)).toBe(true);
    expect(levelOpen(R, 0, 1, {}, false)).toBe(false);
    expect(levelOpen(R, 1, 0, {}, false)).toBe(false);
  });

  it('opens the next level once the one before is cleared', () => {
    const best = clears('c', 3);
    expect(levelOpen(R, 0, 3, best, false)).toBe(true);
    expect(levelOpen(R, 0, 4, best, false)).toBe(false);
    expect(levelLockText(R, 0, 4, best)).toBe('Clear level 4 to unlock');
  });
});

describe('region locks', () => {
  it('keeps Cardium always open', () => {
    expect(regionOpen(R, 0, {}, false)).toBe(true);
  });

  it('opens a region after 5 clears in the one before', () => {
    expect(regionOpen(R, 1, clears('c', 4), false)).toBe(false);
    expect(regionLockText(R, 1, clears('c', 4))).toBe('Clear 1 more in Cardium to unlock');
    expect(regionLockText(R, 1, {})).toBe('Clear 5 more in Cardium to unlock');
    expect(regionOpen(R, 1, clears('c', 5), false)).toBe(true);
    expect(levelOpen(R, 1, 0, clears('c', 5), false)).toBe(true);
    expect(regionOpen(R, 2, clears('c', 10), false)).toBe(false); // needs 5 in Montney
  });

  it('explains a level locked by its region', () => {
    expect(levelLockText(R, 2, 0, {})).toBe('Clear 5 more in Montney to unlock');
  });
});

describe('demo mode', () => {
  it('opens every level and region without needing any clears', () => {
    for (let r = 0; r < 3; r++) {
      expect(regionOpen(R, r, {}, true)).toBe(true);
      for (let l = 0; l < 10; l++) expect(levelOpen(R, r, l, {}, true)).toBe(true);
    }
  });

  it('turning it off restores the normal locks', () => {
    expect(levelOpen(R, 2, 5, clears('c', 5), false)).toBe(false);
  });
});

describe('NEW LEASE OPEN banner', () => {
  it('announces a region once, when it is earned for real', () => {
    expect(newlyOpened(R, clears('c', 4), [])).toEqual([]);
    expect(newlyOpened(R, clears('c', 5), []).map((r) => r.name)).toEqual(['Montney']);
    expect(newlyOpened(R, clears('c', 5), ['m'])).toEqual([]);
  });
});
