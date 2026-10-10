import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sizeOf, solve, type Level } from '../engine/index.ts';
import { REGIONS } from '../levels/regions.ts';
import { dayNumber, keyFromNumber } from './daily.ts';
import { layoutKey, type BlockReader } from './daily-pads.ts';
import {
  TURN_BLOCK, TURN_EPOCH, TURN_KEY, TURN_LAST, TURN_UNLOCK, forgetTurnarounds, levelsCleared, parseTurnResults, recordTurnaround,
  turnBlock, turnShareText, turnSlot, turnaroundLevel, turnaroundNumber, turnaroundOpen, weekLink,
} from './turnaround.ts';

/** The blocks as the site serves them, read off the disk. */
const fromDisk: BlockReader = async (file) => JSON.parse(readFileSync(new URL(`../../public/${file}`, import.meta.url), 'utf8'));
const sundayOf = (week: number) => keyFromNumber(dayNumber(TURN_EPOCH) + (week - 1) * 7);
const all = async (): Promise<Level[]> => { const out: Level[] = []; for (let w = 1; w <= TURN_LAST; w++) out.push(await turnaroundLevel(w, fromDisk)); return out; };

describe('Sunday Turnaround (job U3)', () => {
  it('the calendar: #1 is Sunday Oct 11, 2026, all that week; a new one each Sunday; the last is in Nov 2028', () => {
    expect(TURN_EPOCH).toBe('2026-10-11');
    expect(new Date(2026, 9, 11).getDay()).toBe(0);
    expect(turnaroundNumber('2026-10-11')).toBe(1);
    expect(turnaroundNumber('2026-10-17')).toBe(1);
    expect(turnaroundNumber('2026-10-18')).toBe(2);
    expect(turnaroundNumber('2026-10-24')).toBe(2);
    expect(turnaroundNumber('2026-10-25')).toBe(3);
    // Before the first Sunday there is nothing earlier to show: #1.
    expect(turnaroundNumber('2026-10-09')).toBe(1);
    expect(turnaroundNumber('2026-09-30')).toBe(1);
    expect(sundayOf(TURN_LAST)).toBe('2028-11-26');
    expect(turnaroundNumber('2028-11-26')).toBe(TURN_LAST);
    expect(turnaroundNumber('2028-12-02')).toBe(TURN_LAST);
    for (let w = 1; w <= TURN_LAST; w += 7) expect(turnaroundNumber(sundayOf(w))).toBe(w);
  });

  it('after the last one they come round again from #1', () => {
    expect(turnSlot(1)).toBe(1);
    expect(turnSlot(TURN_LAST)).toBe(TURN_LAST);
    expect(turnSlot(TURN_LAST + 1)).toBe(1);
    expect(turnSlot(TURN_LAST * 2 + 5)).toBe(5);
    expect(turnaroundNumber('2028-12-03')).toBe(TURN_LAST + 1);
  });

  it('they are all there, in blocks, named and numbered', async () => {
    const files = readdirSync(new URL('../../public/turnaround/', import.meta.url)).filter((f) => f.endsWith('.json')).sort();
    expect(files.length).toBe(Math.ceil(TURN_LAST / TURN_BLOCK));
    expect(files[0]).toBe('weeks-001-008.json');
    expect(turnBlock(1)).toEqual({ from: 1, to: 8, file: 'turnaround/weeks-001-008.json' });
    expect(turnBlock(8).file).toBe('turnaround/weeks-001-008.json');
    expect(turnBlock(9).file).toBe('turnaround/weeks-009-016.json');
    expect(existsSync(new URL(`../../public/${turnBlock(TURN_LAST).file}`, import.meta.url))).toBe(true);
    forgetTurnarounds();
    const levels = await all();
    expect(levels.length).toBe(TURN_LAST);
    levels.forEach((l, i) => { expect(l.id).toBe(`t${i + 1}`); expect(l.name).toBe(`Turnaround #${i + 1}`); });
    expect((await turnaroundLevel(TURN_LAST + 1, fromDisk)).id).toBe('t1');
  });

  it('every one is a Big Pad: 8 x 8, 14 to 16 trucks, trucks and gates only', async () => {
    for (const l of await all()) {
      expect(sizeOf(l), l.id).toBe(8);
      expect(l.trucks.length, l.id).toBeGreaterThanOrEqual(14);
      expect(l.trucks.length, l.id).toBeLessThanOrEqual(16);
      expect(l.obstacles ?? [], l.id).toEqual([]);
      for (const t of l.trucks) expect(t.length === 2 ? ['pickup', 'picker'] : ['vac', 'frac', 'water'], `${l.id} ${t.id}`).toContain(t.kind);
    }
  });

  it('every one solves at its stated par, with 12 to 14 extra moves', async () => {
    for (const l of await all()) {
      const best = solve(l);
      expect(best?.length, l.id).toBe(l.par);
      const extra = l.par - l.trucks.length;
      expect(extra, l.id).toBeGreaterThanOrEqual(12);
      expect(extra, l.id).toBeLessThanOrEqual(14);
    }
  }, 600_000);

  it('no repeats: none is the layout of a Clearwater level, of any level of the game, or of another Turnaround', async () => {
    const seen = new Map<string, string>();
    for (const r of REGIONS) for (const l of r.levels) seen.set(layoutKey(l), `${r.id} ${l.id}`);
    for (const l of await all()) {
      expect(seen.get(layoutKey(l)), l.id).toBeUndefined();
      seen.set(layoutKey(l), l.id);
    }
  });

  it('a block that cannot be had is asked for again next time', async () => {
    forgetTurnarounds();
    let tries = 0;
    const flaky: BlockReader = async (file) => { if (++tries === 1) throw new Error('offline'); return fromDisk(file); };
    await expect(turnaroundLevel(1, flaky)).rejects.toThrow('offline');
    expect((await turnaroundLevel(1, flaky)).id).toBe('t1');
    forgetTurnarounds();
  });

  it('it opens once 10 levels are cleared in all (regions\' levels only); demo mode opens it', () => {
    const ids = REGIONS.flatMap((r) => r.levels.map((l) => l.id));
    expect(TURN_UNLOCK).toBe(10);
    expect(levelsCleared({}, ids)).toBe(0);
    expect(levelsCleared({ c01: 3, c02: 4, m01: 9, d07: 8, t3: 30 }, ids)).toBe(3);
    expect(turnaroundOpen(9, false)).toBe(false);
    expect(turnaroundOpen(10, false)).toBe(true);
    expect(turnaroundOpen(0, true)).toBe(true);
  });

  it('results have a key of their own; the best is kept; rubbish reads as nothing', () => {
    expect(TURN_KEY).toBe('rush-hour-rigs:turnaround');
    expect(parseTurnResults(null)).toEqual({ best: {} });
    expect(parseTurnResults('{nope')).toEqual({ best: {} });
    expect(parseTurnResults('{"v":1,"best":{"3":31,"x":2,"4":-1,"5":"7"}}')).toEqual({ best: { '3': 31 } });
    let r = recordTurnaround({ best: {} }, 3, 31);
    expect(r.best).toEqual({ '3': 31 });
    expect(recordTurnaround(r, 3, 33)).toBe(r);
    r = recordTurnaround(r, 3, 29);
    r = recordTurnaround(r, 4, 40);
    expect(r.best).toEqual({ '3': 29, '4': 40 });
  });

  it('the Share line: the name, the number, hard hats and moves against par; no streak, no layout', () => {
    const text = turnShareText({ week: 7, moves: 31, par: 28, hats: 2, url: 'https://example.test/' });
    expect(text.split('\n')).toEqual(['Rig Jam 🚛 Sunday Turnaround #7', '👷👷▫️ 31 moves · par 28', 'https://example.test/']);
    expect(text).not.toMatch(/incident|streak|—/i);
    expect(turnShareText({ week: 1, moves: 26, par: 26, hats: 3, url: 'u' }).split('\n')[1]).toBe('👷👷👷 26 moves · par 26');
  });

  it('?week=N names a Turnaround to try', () => {
    expect(weekLink('?week=60')).toBe(60);
    expect(weekLink('?week=1&x=2')).toBe(1);
    for (const s of ['', '?week=0', '?week=-2', '?week=abc', '?week=1.5', '?pad=3']) expect(weekLink(s), s).toBeNull();
  });
});
