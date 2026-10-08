// AN OLD SAVE KEEPS EVERYTHING. `e2e/fixtures/live-save-de534ad.json` is a real save: the phone's
// storage after playing the LIVE build de534ad (the one before Clearwater shipped). The game of
// today must read every bit of it back: best scores and hard hats, hints, perfect clears, the
// Daily Pad streak, which regions are open, the Wildlife Log, the sound settings. A new region
// and new log entries are added BESIDE what is saved; nothing saved is renamed, dropped or reset.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REGIONS } from '../levels/regions.ts';
import { parseAudioSettings } from '../audio/settings.ts';
import { streak } from './daily.ts';
import { hardHats } from './progress.ts';
import { levelOpen, newlyOpened, regionEarned, regionOpen } from './unlocks.ts';
import { LOG_ENTRIES, camoOn, foundCount, parseLog, shownEntries } from './wildlife-log.ts';

const fixture = JSON.parse(readFileSync(new URL('../../e2e/fixtures/live-save-de534ad.json', import.meta.url), 'utf8')) as { build: string; localStorage: Record<string, string> };
const store = fixture.localStorage;

async function withStorage<T>(run: () => Promise<T>): Promise<T> {
  const map = new Map(Object.entries(store));
  const fake = { get length() { return map.size; }, key: (i: number) => [...map.keys()][i] ?? null, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
  const g = globalThis as { localStorage?: unknown };
  const before = g.localStorage;
  g.localStorage = fake;
  try { return await run(); } finally { g.localStorage = before; }
}

describe('a save from the live build before Clearwater', () => {
  it('is a real one: the five keys the game writes, from build de534ad', () => {
    expect(fixture.build).toBe('de534ad');
    expect(Object.keys(store).sort()).toEqual(['rush-hour-rigs-audio', 'rush-hour-rigs:last-level', 'rush-hour-rigs:log', 'rush-hour-rigs:region', 'rush-hour-rigs:v2']);
  });

  it('progress: every best score, hint, perfect clear and Daily Pad is read back as saved', async () => {
    const saved = JSON.parse(store['rush-hour-rigs:v2']);
    const p = await withStorage(async () => (await import('./progress.ts')).loadProgress());
    expect(p.best).toEqual(saved.best);
    expect(p.hints).toBe(saved.hints);
    expect(p.perfect).toEqual(saved.perfect);
    expect(p.dailyCleared).toEqual(saved.dailyCleared);
    expect(p.announced).toEqual(saved.announced);
    expect(p.standDowns).toEqual(saved.standDowns);
    expect(p.demo).toBe(false);
    // Every level it has a score for is still a level of the game, under the same id, with the same par.
    const levels = new Map(REGIONS.flatMap((r) => r.levels).map((l) => [l.id, l]));
    for (const [id, moves] of Object.entries(p.best).filter(([id]) => !/^d\d/.test(id))) {
      expect(levels.has(id), id).toBe(true);
      expect(hardHats(moves, levels.get(id)!.par), id).toBe(3);
    }
    // Saving it again writes the same progress back.
    const again = await withStorage(async () => { const m = await import('./progress.ts'); m.saveProgress(m.loadProgress()); return JSON.parse(localStorage.getItem('rush-hour-rigs:v2')!); });
    expect(again).toEqual(saved);
  });

  it('the streak counts as it did: one day, on the day it was saved and on the next', async () => {
    const p = await withStorage(async () => (await import('./progress.ts')).loadProgress());
    expect(streak(p.dailyCleared, '2026-10-08').days).toBe(1);
    expect(streak(p.dailyCleared, '2026-10-09').days).toBe(1);
  });

  it('the same regions and levels are open, and the new region is simply locked: no banner, nothing taken away', async () => {
    const p = await withStorage(async () => (await import('./progress.ts')).loadProgress());
    // Cardium and Montney (five of Cardium cleared), as before; Cardium's seventh level open, as before.
    expect(REGIONS.map((_, i) => regionOpen(REGIONS, i, p.best, false))).toEqual([true, true, false, false, false, false]);
    expect(levelOpen(REGIONS, 0, 6, p.best, false)).toBe(true);
    expect(levelOpen(REGIONS, 0, 7, p.best, false)).toBe(false);
    expect(levelOpen(REGIONS, 1, 0, p.best, false)).toBe(true);
    // Clearwater is the sixth, after Bakken, earned like the others. Nothing new is announced to this player.
    expect(REGIONS[5].id).toBe('clearwater');
    expect(regionEarned(REGIONS, 5, p.best)).toBe(false);
    expect(newlyOpened(REGIONS, p.best, p.announced)).toEqual([]);
    // No level id of the new region collides with one already saved.
    expect(REGIONS[5].levels.some((l) => l.id in p.best)).toBe(false);
  });

  it('the Wildlife Log: both sightings still found, the count out of more', () => {
    const saved = JSON.parse(store['rush-hour-rigs:log']);
    const log = parseLog(store['rush-hour-rigs:log']);
    expect(log.found).toEqual(saved.found);
    expect(log.found).toEqual(['nearmiss', 'geese']);
    expect(foundCount(log)).toBe(2);
    expect(LOG_ENTRIES.length).toBe(33);
    expect(camoOn(log)).toBe(false);
    // Every id the old log could hold is still an entry.
    for (const id of ['magpie', 'spotter', 'moose', 'nearmiss', 'landowner', 'biffy', 'biffyB', 'marshmallow', 'geese', 'porcupine', 'lunch', 'sam', 'tongue', 'surveyor', 'deer', 'tourists', 'muskeg', 'cattrain', 'beaver', 'aurora', 'tumbleweed', 'pdogs', 'bale', 'cloud', 'night', 'bull', 'dug', 'bear']) expect(LOG_ENTRIES.some((e) => e.id === id), id).toBe(true);
    expect(shownEntries(log).filter((e) => log.found.includes(e.id)).map((e) => e.name)).toEqual(['Near Miss', 'Lost Goose']);
  });

  it('a player who had found all 28 keeps the camo pickups, though there are five more to find', () => {
    const full = parseLog(JSON.stringify({ v: 3, found: ['magpie', 'spotter', 'moose', 'nearmiss', 'landowner', 'biffy', 'biffyB', 'marshmallow', 'geese', 'porcupine', 'lunch', 'sam', 'tongue', 'surveyor', 'deer', 'tourists', 'muskeg', 'cattrain', 'beaver', 'aurora', 'tumbleweed', 'pdogs', 'bale', 'cloud', 'night', 'bull', 'dug', 'bear'], camo: true, camoEarned: true, dug: 61000, dugSwipes: 40 }));
    expect(foundCount(full)).toBe(28);
    expect(full.camoEarned).toBe(true);
    expect(camoOn(full)).toBe(true);
    expect(full.dug).toBe(61000);
    expect(full.dugSwipes).toBe(40);
  });

  it('sound settings: effects on, music on, 80s Retro, as saved', () => {
    expect(parseAudioSettings(store['rush-hour-rigs-audio'])).toEqual({ sfx: true, music: true, style: 'retro' });
  });
});
