import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import page from './finale-reference.json' with { type: 'json' };
import { FINALE_KEY, FINALE_PARTS, finaleCount, finaleDue, finaleEarned, finaleLink, parseFinale } from './finale-state.ts';
import { FINALE_CREDITS, FINALE_LINES, FINALE_PHOTO } from './lines.ts';
import { LOG_ENTRIES } from './wildlife-log.ts';

const levels = REGIONS.flatMap((r) => r.levels);
const allAtPar = Object.fromEntries(levels.map((l) => [l.id, l.par]));
const allFound = LOG_ENTRIES.map((e) => e.id);
const PAGE = page as unknown as Record<string, { dur: number; beats: [number, string][]; rows: [string, string][] }> & { lines: Record<string, string> };

describe('the finale: when it is earned (job U9)', () => {
  it("the game's own counts: 70 pads and 40 sightings today, counted from the regions and the log", () => {
    const c = finaleCount(allAtPar, allFound, levels, LOG_ENTRIES);
    expect(c).toEqual({ pads: levels.length, ofPads: levels.length, sightings: LOG_ENTRIES.length, ofSightings: LOG_ENTRIES.length });
    expect([c.ofPads, c.ofSightings]).toEqual([70, 40]);
    expect(finaleEarned(c, false)).toBe(true);
  });

  it('every level at 3 hard hats: one level a move over par, or one never played, and it is not earned', () => {
    const last = levels.at(-1)!;
    expect(finaleEarned(finaleCount({ ...allAtPar, [last.id]: last.par + 1 }, allFound, levels, LOG_ENTRIES), false)).toBe(false);
    const { [levels[3].id]: _gone, ...rest } = allAtPar;
    expect(finaleEarned(finaleCount(rest, allFound, levels, LOG_ENTRIES), false)).toBe(false);
    // (Under par cannot happen, but it would still be three hard hats.)
    expect(finaleCount({ ...allAtPar, [last.id]: last.par - 1 }, allFound, levels, LOG_ENTRIES).pads).toBe(levels.length);
    // A Daily Pad or a Turnaround score is not a level, either way.
    expect(finaleCount({ ...allAtPar, d09: 99, t3: 99 }, allFound, levels, LOG_ENTRIES).pads).toBe(levels.length);
  });

  it('every sighting found: one missing (the hidden one too), and it is not earned; a retired id does not count', () => {
    for (const miss of ['bear', 'dug', 'night', 'mosquito']) expect(finaleEarned(finaleCount(allAtPar, allFound.filter((id) => id !== miss), levels, LOG_ENTRIES), false), miss).toBe(false);
    expect(finaleCount(allAtPar, [...allFound.filter((id) => id !== 'bear'), 'pumper'], levels, LOG_ENTRIES).sightings).toBe(LOG_ENTRIES.length - 1);
  });

  it('never in demo mode; and it plays once', () => {
    const c = finaleCount(allAtPar, allFound, levels, LOG_ENTRIES);
    expect(finaleEarned(c, true)).toBe(false);
    expect(finaleDue(c, false, { seen: false })).toBe(true);
    expect(finaleDue(c, false, { seen: true })).toBe(false);
    expect(finaleDue(c, true, { seen: false })).toBe(false);
    expect(finaleEarned({ pads: 0, ofPads: 0, sightings: 0, ofSightings: 0 }, false)).toBe(false);
  });

  it('it has a key of its own; rubbish reads as not seen', () => {
    expect(FINALE_KEY).toBe('rush-hour-rigs:finale');
    expect(parseFinale(null)).toEqual({ seen: false });
    expect(parseFinale('{nope')).toEqual({ seen: false });
    expect(parseFinale('{"v":1,"seen":"yes"}')).toEqual({ seen: false });
    expect(parseFinale('{"v":1,"seen":true}')).toEqual({ seen: true });
  });

  it('?finale=1 plays it, ?finale=stage shows its stage; nothing else does', () => {
    expect(finaleLink('?finale=1')).toBe('1');
    expect(finaleLink('?cover=0&finale=stage')).toBe('stage');
    for (const s of ['', '?finale=0', '?finale=yes', '?demo=1']) expect(finaleLink(s), s).toBeNull();
  });

  it("the page's four parts, lines and credits, word for word", () => {
    expect([...FINALE_PARTS]).toEqual(['card', 'photo', 'credits', 'still']);
    expect(FINALE_PARTS.map((p) => PAGE[p].dur)).toEqual([6.0, 9.2, 13.0, 12.0]);
    expect({ ...FINALE_LINES }).toEqual(PAGE.lines);
    expect(FINALE_CREDITS.map(([s, k]) => [s, k])).toEqual(PAGE.credits.rows);
    expect(FINALE_PHOTO).toEqual({ caption: 'The crew. Zero incidents.*', small: '*almost' });
    for (const [s] of FINALE_CREDITS) expect(s).not.toMatch(/—/);
    expect(FINALE_CREDITS.at(-1)).toEqual(['Thanks for playing', 'end']);
  });
});
