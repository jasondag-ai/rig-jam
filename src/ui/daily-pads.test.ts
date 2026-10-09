import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { solve, type Level } from '../engine/index.ts';
import { DAILY_LEVELS, REGIONS, dailyTheme } from '../levels/regions.ts';
import { DAILY_EPOCH, dayNumber, keyFromNumber, padNumber } from './daily.ts';
import { DAILY_BLOCK, DAILY_BUILT_IN, DAILY_FIRST_NEW, DAILY_LAST, blockOf, dailyLevel, dailyLevelNow, forgetBlocks, layoutKey, padLink, padSlot, type BlockReader } from './daily-pads.ts';

/** The blocks as the site serves them, read off the disk. */
const fromDisk: BlockReader = async (file) => JSON.parse(readFileSync(new URL(`../../public/${file}`, import.meta.url), 'utf8'));
const dateOf = (pad: number) => keyFromNumber(dayNumber(DAILY_EPOCH) + pad - 1);
const allNew = async (): Promise<Level[]> => { const out: Level[] = []; for (let pad = DAILY_FIRST_NEW; pad <= DAILY_LAST; pad++) out.push(await dailyLevel(pad, DAILY_LEVELS, fromDisk)); return out; };

describe('Daily Pads forever (job U2)', () => {
  it('pads 1 to 60 are exactly as they were: the file byte for byte, 60 levels', () => {
    const file = readFileSync(new URL('../levels/daily.json', import.meta.url));
    expect(createHash('sha256').update(file).digest('hex')).toBe('0a93f06528b42f91fef3e77d98b7336eb3d533f61b6b723302a738dd294a5041');
    expect(DAILY_LEVELS.length).toBe(DAILY_BUILT_IN);
    expect(DAILY_LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 60 }, (_, i) => `d${String(i + 1).padStart(2, '0')}`));
    for (let pad = 1; pad <= 60; pad++) expect(dailyLevelNow(pad, DAILY_LEVELS)).toBe(DAILY_LEVELS[pad - 1]);
  });

  it('the calendar: pad 1 is Sep 30, 2026; pad 60 Nov 28; pad 61 Nov 29, 2026; pad 790 Nov 27, 2028', () => {
    expect(dateOf(1)).toBe('2026-09-30');
    expect(dateOf(60)).toBe('2026-11-28');
    expect(dateOf(DAILY_FIRST_NEW)).toBe('2026-11-29');
    expect(padNumber('2026-11-29')).toBe(61);
    expect(dateOf(DAILY_LAST)).toBe('2028-11-27');
    expect(padNumber('2028-11-27')).toBe(790);
    expect(DAILY_LAST - DAILY_FIRST_NEW + 1).toBe(730);
  });

  it('pads 61 to 790 are all there, in blocks of 30, named and numbered by their day', async () => {
    const files = readdirSync(new URL('../../public/daily/', import.meta.url)).filter((f) => f.endsWith('.json')).sort();
    expect(files.length).toBe(Math.ceil(730 / DAILY_BLOCK));
    expect(files[0]).toBe('pads-061-090.json');
    expect(files.at(-1)).toBe('pads-781-790.json');
    expect(blockOf(61)).toEqual({ from: 61, to: 90, file: 'daily/pads-061-090.json' });
    expect(blockOf(90).file).toBe('daily/pads-061-090.json');
    expect(blockOf(91).file).toBe('daily/pads-091-120.json');
    expect(blockOf(790)).toEqual({ from: 781, to: 790, file: 'daily/pads-781-790.json' });
    for (let pad = DAILY_FIRST_NEW; pad <= DAILY_LAST; pad += DAILY_BLOCK) expect(existsSync(new URL(`../../public/${blockOf(pad).file}`, import.meta.url)), blockOf(pad).file).toBe(true);
    const levels = await allNew();
    expect(levels.length).toBe(730);
    levels.forEach((l, i) => { expect(l.id).toBe(`d${61 + i}`); expect(l.name).toBe(`Daily Pad #${61 + i}`); });
  });

  it('every new pad solves at its stated par, inside the band of pads 1 to 60 (par, trucks, equipment)', async () => {
    const band = { par: [Math.min(...DAILY_LEVELS.map((l) => l.par)), Math.max(...DAILY_LEVELS.map((l) => l.par))], trucks: new Set(DAILY_LEVELS.map((l) => l.trucks.length)), eq: new Set(DAILY_LEVELS.map((l) => l.obstacles.length)) };
    expect(band.par).toEqual([6, 8]);
    expect([...band.trucks].sort()).toEqual([5, 6]);
    for (const [i, l] of (await allNew()).entries()) {
      const pad = 61 + i;
      expect(solve(l)!.length, `pad ${pad}`).toBe(l.par);
      expect(l.par, `pad ${pad}`).toBeGreaterThanOrEqual(band.par[0]);
      expect(l.par, `pad ${pad}`).toBeLessThanOrEqual(band.par[1]);
      expect(band.trucks.has(l.trucks.length), `pad ${pad}: ${l.trucks.length} trucks`).toBe(true);
      expect(band.eq.has(l.obstacles.length), `pad ${pad}: ${l.obstacles.length} pieces of equipment`).toBe(true);
      // As pads 1 to 60 alternate: odd pads 5 trucks and 1 piece, even pads 6 and 2. A pad of 6 x 6, nothing of regions 4 to 6 on it.
      expect(l.trucks.length, `pad ${pad}`).toBe(pad % 2 ? 5 : 6);
      expect(DAILY_LEVELS[(pad - 1) % 2].trucks.length).toBe(pad % 2 ? 5 : 6);
      expect((l.size ?? 6) === 6 && !l.muskeg?.length && !l.racks?.length && l.gates.every((g) => !g.shift) && l.trucks.every((t) => !t.load && !t.convoy), `pad ${pad}`).toBe(true);
    }
  }, 120_000);

  it('no new pad repeats a region level, a pad of 1 to 60 or another new pad', async () => {
    const seen = new Map<string, string>();
    for (const r of REGIONS) for (const l of r.levels) seen.set(layoutKey(l), `${r.id} ${l.id}`);
    for (const l of DAILY_LEVELS) seen.set(layoutKey(l), `pad ${l.id}`);
    const before = seen.size;
    for (const l of await allNew()) {
      expect(seen.get(layoutKey(l)), `${l.id} repeats`).toBeUndefined();
      seen.set(layoutKey(l), l.id);
    }
    expect(seen.size).toBe(before + 730);
    // (The fingerprint is the layout, whatever the paint and the order.)
    const a = DAILY_LEVELS[0];
    expect(layoutKey({ ...a, trucks: [...a.trucks].reverse().map((t) => ({ ...t, color: 'red' })) })).toBe(layoutKey(a));
  });

  it('after pad 790 they repeat from pad 61, not from pad 1', async () => {
    expect(padSlot(1)).toBe(1);
    expect(padSlot(60)).toBe(60);
    expect(padSlot(790)).toBe(790);
    expect(padSlot(791)).toBe(61);
    expect(padSlot(792)).toBe(62);
    expect(padSlot(790 + 730)).toBe(790);
    expect(padSlot(790 + 731)).toBe(61);
    expect(await dailyLevel(791, DAILY_LEVELS, fromDisk)).toEqual(await dailyLevel(61, DAILY_LEVELS, fromDisk));
    expect(await dailyLevel(1520, DAILY_LEVELS, fromDisk)).toEqual(await dailyLevel(790, DAILY_LEVELS, fromDisk));
    expect(dateOf(791)).toBe('2028-11-28');
  });

  it('the theme rule is the old one: odd pads summer, even pads spring mud', () => {
    expect(dailyTheme(59)).toBe('summer');
    expect(dailyTheme(60)).toBe('spring');
    expect(dailyTheme(61)).toBe('summer');
    expect(dailyTheme(62)).toBe('spring');
    expect(dailyTheme(790)).toBe('spring');
    expect(dailyTheme(791)).toBe('summer');
  });

  it('pads 1 to 60 never fetch; a later pad fetches its one block, once; a failed fetch is tried again', async () => {
    let asked: string[] = [];
    const counting: BlockReader = async (file) => { asked.push(file); return fromDisk(file); };
    await dailyLevel(7, DAILY_LEVELS, counting);
    expect(asked).toEqual([]);
    expect(dailyLevelNow(61, DAILY_LEVELS)).toBeNull();
    forgetBlocks();
    const down: BlockReader = async () => { throw new Error('offline'); };
    await expect(dailyLevel(455, DAILY_LEVELS, down)).rejects.toThrow();
    asked = [];
    const a = await dailyLevel(455, DAILY_LEVELS, counting), b = await dailyLevel(456, DAILY_LEVELS, counting);
    expect(asked).toEqual(['daily/pads-451-480.json']);
    expect(a.id).toBe('d455');
    expect(b.id).toBe('d456');
  });

  it('?pad=N names a pad to try (the dev copy only reads it)', () => {
    expect(padLink('?pad=61')).toBe(61);
    expect(padLink('?cover=0&pad=790')).toBe(790);
    expect(padLink('?pad=0')).toBeNull();
    expect(padLink('?pad=abc')).toBeNull();
    expect(padLink('')).toBeNull();
  });
});
