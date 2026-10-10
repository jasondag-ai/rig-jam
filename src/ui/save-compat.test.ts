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

/**
 * THE REAL SAVES, each made by playing a LIVE build (e2e/make-live-save.mjs) just before something shipped. A new one is
 * added BESIDE the others, never in place of one. What each holds, for the checks below:
 *   de534ad (Oct 8, before Clearwater): Cardium 1 to 6 at par, Near Miss and Lost Goose, the Daily Pad of Oct 8, 80s Retro.
 *   ba54c2b (Oct 10, before 1.0.0: the October upgrade): Cardium 1 to 7 (level 5 a move over par: two hard hats), the
 *     Back Scratcher and the Lost Goose, a hint spent, the Daily Pad of Oct 10, Chill.
 */
const FIXTURES = [
  { build: 'de534ad', when: 'before Clearwater', day: '2026-10-08', cleared: 6, hats: [3, 3, 3, 3, 3, 3], found: ['nearmiss', 'geese'], names: ['Near Miss', 'Lost Goose'], audio: { sfx: true, music: true, style: 'retro' } },
  { build: 'ba54c2b', when: 'before 1.0.0 (the October upgrade)', day: '2026-10-10', cleared: 7, hats: [3, 3, 3, 3, 2, 3, 3], found: ['deer', 'geese'], names: ['Lost Goose', 'Back Scratcher'], audio: { sfx: true, music: true, style: 'chill' } },
] as const;
const nextDay = (day: string) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

for (const F of FIXTURES) {
const fixture = JSON.parse(readFileSync(new URL(`../../e2e/fixtures/live-save-${F.build}.json`, import.meta.url), 'utf8')) as { build: string; localStorage: Record<string, string> };
const store = fixture.localStorage;

async function withStorage<T>(run: () => Promise<T>): Promise<T> {
  const map = new Map(Object.entries(store));
  const fake = { get length() { return map.size; }, key: (i: number) => [...map.keys()][i] ?? null, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
  const g = globalThis as { localStorage?: unknown };
  const before = g.localStorage;
  g.localStorage = fake;
  try { return await run(); } finally { g.localStorage = before; }
}

describe(`a save from the live build ${F.build}, ${F.when}`, () => {
  it('is a real one: the five keys the game writes, from that build', () => {
    expect(fixture.build).toBe(F.build);
    expect(Object.keys(store).sort()).toEqual(['rush-hour-rigs-audio', 'rush-hour-rigs:last-level', 'rush-hour-rigs:log', 'rush-hour-rigs:region', 'rush-hour-rigs:v2']);
  });

  it('progress: every best score, hint, perfect clear and Daily Pad is read back as saved; the same hard hats', async () => {
    const saved = JSON.parse(store['rush-hour-rigs:v2']);
    const p = await withStorage(async () => (await import('./progress.ts')).loadProgress());
    expect(p.best).toEqual(saved.best);
    expect(p.hints).toBe(saved.hints);
    expect(p.perfect).toEqual(saved.perfect);
    expect(p.dailyCleared).toEqual(saved.dailyCleared);
    expect(p.announced).toEqual(saved.announced);
    expect(p.standDowns).toEqual(saved.standDowns);
    expect(p.demo).toBe(false);
    // Every level it has a score for is still a level of the game, under the same id, with the same par: the same hard hats.
    const levels = new Map(REGIONS.flatMap((r) => r.levels).map((l) => [l.id, l]));
    for (const id of Object.keys(p.best).filter((id) => !/^d\d/.test(id))) expect(levels.has(id), id).toBe(true);
    expect(REGIONS[0].levels.slice(0, F.cleared).map((l) => hardHats(p.best[l.id], l.par))).toEqual([...F.hats]);
    expect(Object.keys(p.best).filter((id) => !/^d\d/.test(id)).length).toBe(F.cleared);
    // Saving it again writes the same progress back.
    const again = await withStorage(async () => { const m = await import('./progress.ts'); m.saveProgress(m.loadProgress()); return JSON.parse(localStorage.getItem('rush-hour-rigs:v2')!); });
    expect(again).toEqual(saved);
  });

  it('the streak counts as it did: one day, on the day it was saved and on the next', async () => {
    const p = await withStorage(async () => (await import('./progress.ts')).loadProgress());
    expect(p.dailyCleared).toEqual([F.day]);
    expect(streak(p.dailyCleared, F.day).days).toBe(1);
    expect(streak(p.dailyCleared, nextDay(F.day)).days).toBe(1);
  });

  it('the same regions and levels are open, and every newer region is simply locked: no banner, nothing taken away', async () => {
    const p = await withStorage(async () => (await import('./progress.ts')).loadProgress());
    // Cardium and Montney (five of Cardium cleared), as before; the level after the last one cleared open, the one after that not.
    expect(REGIONS.map((_, i) => regionOpen(REGIONS, i, p.best, false))).toEqual([true, true, false, false, false, false, false]);
    expect(levelOpen(REGIONS, 0, F.cleared, p.best, false)).toBe(true);
    expect(levelOpen(REGIONS, 0, F.cleared + 1, p.best, false)).toBe(false);
    expect(levelOpen(REGIONS, 1, 0, p.best, false)).toBe(true);
    // Clearwater is the sixth and Baldonnel the seventh, each earned like the others. Nothing new is announced to this player.
    expect(REGIONS.map((r) => r.id).slice(5)).toEqual(['clearwater', 'baldonnel']);
    expect(regionEarned(REGIONS, 5, p.best)).toBe(false);
    expect(regionEarned(REGIONS, 6, p.best)).toBe(false);
    expect(newlyOpened(REGIONS, p.best, p.announced)).toEqual([]);
    // No level id of a newer region collides with one already saved.
    expect(REGIONS.slice(5).some((r) => r.levels.some((l) => l.id in p.best))).toBe(false);
  });

  it('the Wildlife Log: both sightings still found, the count out of more', () => {
    const saved = JSON.parse(store['rush-hour-rigs:log']);
    const log = parseLog(store['rush-hour-rigs:log']);
    expect(log.found).toEqual(saved.found);
    expect(log.found).toEqual([...F.found]);
    expect(foundCount(log)).toBe(2);
    expect(LOG_ENTRIES.length).toBe(40);
    expect(camoOn(log)).toBe(false);
    expect(shownEntries(log).filter((e) => log.found.includes(e.id)).map((e) => e.name)).toEqual([...F.names]);
  });

  it('sound settings: as saved', () => {
    expect(parseAudioSettings(store['rush-hour-rigs-audio'])).toEqual(F.audio);
  });

  it('none of what 1.0.0 adds is in it, and reading it adds nothing: no Turnaround result, no ending seen', async () => {
    const { parseTurnResults } = await import('./turnaround.ts');
    const { parseFinale } = await import('./finale-state.ts');
    expect(parseTurnResults(store['rush-hour-rigs:turnaround'] ?? null)).toEqual({ best: {} });
    expect(parseFinale(store['rush-hour-rigs:finale'] ?? null).seen).toBe(false);
  });
});
}

describe('an old full log', () => {
  it('every id the old log could hold is still an entry', () => {
    for (const id of ['magpie', 'spotter', 'moose', 'nearmiss', 'landowner', 'biffy', 'biffyB', 'marshmallow', 'geese', 'porcupine', 'lunch', 'sam', 'tongue', 'surveyor', 'deer', 'tourists', 'muskeg', 'cattrain', 'beaver', 'aurora', 'tumbleweed', 'pdogs', 'bale', 'cloud', 'night', 'bull', 'dug', 'bear']) expect(LOG_ENTRIES.some((e) => e.id === id), id).toBe(true);
  });

  it('a player who had found all 28 keeps the camo pickups, though there are five more to find', () => {
    const full = parseLog(JSON.stringify({ v: 3, found: ['magpie', 'spotter', 'moose', 'nearmiss', 'landowner', 'biffy', 'biffyB', 'marshmallow', 'geese', 'porcupine', 'lunch', 'sam', 'tongue', 'surveyor', 'deer', 'tourists', 'muskeg', 'cattrain', 'beaver', 'aurora', 'tumbleweed', 'pdogs', 'bale', 'cloud', 'night', 'bull', 'dug', 'bear'], camo: true, camoEarned: true, dug: 61000, dugSwipes: 40 }));
    expect(foundCount(full)).toBe(28);
    expect(full.camoEarned).toBe(true);
    expect(camoOn(full)).toBe(true);
    expect(full.dug).toBe(61000);
    expect(full.dugSwipes).toBe(40);
  });
});

// ---------- THE DEV LANE: a save written by the dev build loads whole in the live build ----------
// The dev copy (/rig-jam-next/) and the live game (/rig-jam/) are on ONE web origin, so on a phone that has opened
// both THEY SHARE ONE SAVE. The live build is older and cannot be changed to suit: so THE DEV BUILD MAY ONLY ADD.
// `e2e/fixtures/live-contract-<build>.json` is what the live build reads (its keys, fields, types and the ids it
// knows), made from main's own modules. Everything the dev build writes is held to it here.
//   - A key or a field the live build reads may not be renamed, retyped or dropped.
//   - A value the live build does not know (a new sighting, a new music style) is THROWN AWAY by the live build the
//     next time it saves: such a value must be listed in DEV_ADDS below, on purpose, knowing that.
//   - A field ADDED to a key the live build saves is lost the same way: the dev build must read that key without
//     it. (New data that must survive belongs in a NEW KEY: the live build never writes a key it does not know.)
const contract = JSON.parse(readFileSync(new URL('../../e2e/fixtures/live-contract-1.0.0.json', import.meta.url), 'utf8')) as {
  build: string; keys: string[]; progress: Record<string, string>; log: { v: number; fields: Record<string, string>; sightings: string[] };
  audio: { fields: Record<string, string>; styles: string[] }; regions: string[]; levels: Record<string, number>; dailyLevels: string[];
};
/** What the dev build adds that the live build does not know. Each entry is a decision: say why beside it. */
// (EMPTY SINCE 1.0.0, Oct 10: the October upgrade shipped, and the contract was made again from that build
// (`node tools/live-contract.ts 1.0.0`), so the live build now knows the Turnaround's and the finale's keys, Baldonnel
// and its seven sightings, and Classic Rock. The next thing the dev lane adds is listed here, with its reason.)
const DEV_ADDS: { keys: string[]; sightings: string[]; styles: string[]; regions: string[] } = { keys: [], sightings: [], styles: [], regions: [] };
const typeOf = (v: unknown): string => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

/** A full save, written by THIS build's own code into an empty phone. */
async function devSave(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const fake = { get length() { return map.size; }, key: (i: number) => [...map.keys()][i] ?? null, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, String(v)), removeItem: (k: string) => void map.delete(k), clear: () => map.clear() };
  // (The log's writer looks at the page's address, for its preview switch: an ordinary one here.)
  const g = globalThis as { localStorage?: unknown; location?: unknown };
  const before = g.localStorage, where = g.location;
  g.localStorage = fake;
  g.location = { search: '' };
  try {
    const P = await import('./progress.ts'), L = await import('./wildlife-log.ts'), A = await import('../audio/settings.ts'), F = await import('./feedback.ts');
    // Every level of every region cleared (the last at par, the rest over), a Daily Pad, a hint spent, a region announced.
    let p = P.loadProgress();
    for (const r of REGIONS) for (const l of r.levels) p = P.recordWin(p, l.id, l.par + (l === r.levels.at(-1) ? 0 : 2), l.par).progress;
    p = P.recordDailyClear(p, '2026-10-09');
    p = { ...(P.spendHint(p) ?? p), announced: REGIONS.map((r) => r.id), standDowns: ['2026-10-05'] };
    P.saveProgress(p);
    // Every sighting found, the dig dug through, camo switched off; a demo log too.
    let log = L.loadLog();
    for (const e of LOG_ENTRIES) log = L.record(log, e.id).log;
    log = L.recordDig(log, 61000, 40).log;
    L.saveLog({ ...log, camo: false });
    L.saveLog(L.record(L.loadLog(true), LOG_ENTRIES[0].id).log, true);
    A.saveAudioSettings({ sfx: true, music: true, style: A.MUSIC_STYLES.at(-1)!.id });
    F.rememberLevel(`${REGIONS.at(-1)!.name} ${REGIONS.at(-1)!.levels.length}`);
    fake.setItem('rush-hour-rigs:region', REGIONS.at(-1)!.id);
    const T = await import('./turnaround.ts');
    T.saveTurnResults(T.recordTurnaround(T.loadTurnResults(), 3, 31));
    (await import('./finale-state.ts')).saveFinaleSeen();
    return map;
  } finally { g.localStorage = before; g.location = where; }
}

describe('the dev lane: a save written by the dev build loads whole in the live build', () => {
  it('the contract is the live build\'s own, and names what this test pins', () => {
    expect(contract.build).toMatch(/^[0-9a-f]{7}$/);
    expect(contract.keys).toContain('rush-hour-rigs:v2');
    expect(contract.log.v).toBe(3);
    expect(Object.keys(contract.levels).length).toBeGreaterThanOrEqual(60);
  });

  it('it writes the keys the live build reads, under the same names; a new key must be declared', async () => {
    const save = await devSave();
    for (const key of ['rush-hour-rigs:v2', 'rush-hour-rigs:log', 'rush-hour-rigs:demo-log', 'rush-hour-rigs-audio', 'rush-hour-rigs:region', 'rush-hour-rigs:last-level']) expect([...save.keys()], key).toContain(key);
    for (const key of save.keys()) expect([...contract.keys, ...DEV_ADDS.keys], `"${key}" is a key the live build does not know: list it in DEV_ADDS.keys`).toContain(key);
  });

  it('progress: every field the live build reads is there, of the type it expects; scores are for levels it knows, at the same par', async () => {
    const p = JSON.parse((await devSave()).get('rush-hour-rigs:v2')!) as Record<string, unknown>;
    for (const [field, type] of Object.entries(contract.progress)) expect(typeOf(p[field]), `progress.${field}`).toBe(type);
    expect(Number.isInteger(p.hints)).toBe(true);
    // Every level the live build has is still a level here, under the same id and with the same par: a score means the same hard hats in both.
    const here = new Map(REGIONS.flatMap((r) => r.levels).map((l) => [l.id, l.par]));
    for (const [id, par] of Object.entries(contract.levels)) expect(here.get(id), `level ${id}`).toBe(par);
    for (const id of contract.regions) expect(REGIONS.map((r) => r.id), `region ${id}`).toContain(id);
    // The regions are in the live build's order, new ones only after them (a region opens on the one before it).
    expect(REGIONS.map((r) => r.id).slice(0, contract.regions.length)).toEqual(contract.regions);
    for (const id of REGIONS.map((r) => r.id).filter((r) => !contract.regions.includes(r))) expect(DEV_ADDS.regions, `region "${id}" is new: list it in DEV_ADDS.regions`).toContain(id);
  });

  it('the Wildlife Log: the same format number and fields; every sighting it can hold is one the live build knows, or is declared', async () => {
    const save = await devSave();
    for (const key of ['rush-hour-rigs:log', 'rush-hour-rigs:demo-log']) {
      const log = JSON.parse(save.get(key)!) as Record<string, unknown>;
      expect(log.v, `${key}.v`).toBe(contract.log.v);
      for (const [field, type] of Object.entries(contract.log.fields)) {
        if (type.endsWith('?')) { if (field in log) expect(typeOf(log[field]), `${key}.${field}`).toBe(type.slice(0, -1)); }
        else expect(typeOf(log[field]), `${key}.${field}`).toBe(type);
      }
      for (const id of log.found as string[]) expect([...contract.log.sightings, ...DEV_ADDS.sightings], `sighting "${id}" is unknown to the live build, which DROPS it when it next saves the log: list it in DEV_ADDS.sightings`).toContain(id);
    }
    // No sighting the live build knows has gone or changed its id.
    for (const id of contract.log.sightings) expect(LOG_ENTRIES.map((e) => e.id), id).toContain(id);
  });

  it('sound settings: the same fields; every music style on offer is one the live build knows, or is declared', async () => {
    const audio = JSON.parse((await devSave()).get('rush-hour-rigs-audio')!) as Record<string, unknown>;
    for (const [field, type] of Object.entries(contract.audio.fields)) expect(typeOf(audio[field]), `audio.${field}`).toBe(type);
    const { MUSIC_STYLES } = await import('../audio/settings.ts');
    for (const s of MUSIC_STYLES) expect([...contract.audio.styles, ...DEV_ADDS.styles], `music style "${s.id}" is unknown to the live build, which falls back to its default: list it in DEV_ADDS.styles`).toContain(s.id);
    for (const id of contract.audio.styles) expect(MUSIC_STYLES.map((s) => s.id), id).toContain(id);
  });

  it('and back again: after the live build has loaded and saved it (keeping only what it knows), this build reads everything the live build keeps', async () => {
    const save = await devSave();
    // What the live build writes back: its own fields of each key it saves, its own sightings and styles.
    const p = JSON.parse(save.get('rush-hour-rigs:v2')!) as Record<string, unknown>;
    const log = JSON.parse(save.get('rush-hour-rigs:log')!) as Record<string, unknown>;
    const audio = JSON.parse(save.get('rush-hour-rigs-audio')!) as Record<string, unknown>;
    const liveP = Object.fromEntries(Object.keys(contract.progress).map((k) => [k, p[k]]));
    const liveLog = { v: contract.log.v, ...Object.fromEntries(Object.keys(contract.log.fields).filter((k) => k in log).map((k) => [k, log[k]])), found: (log.found as string[]).filter((id) => contract.log.sightings.includes(id)) };
    const liveAudio = Object.fromEntries(Object.keys(contract.audio.fields).map((k) => [k, audio[k]]));
    const back = new Map(save);
    back.set('rush-hour-rigs:v2', JSON.stringify(liveP));
    back.set('rush-hour-rigs:log', JSON.stringify(liveLog));
    back.set('rush-hour-rigs-audio', JSON.stringify(liveAudio));
    const fake = { get length() { return back.size; }, key: (i: number) => [...back.keys()][i] ?? null, getItem: (k: string) => back.get(k) ?? null, setItem: (k: string, v: string) => void back.set(k, v), removeItem: (k: string) => void back.delete(k), clear: () => back.clear() };
    const g = globalThis as { localStorage?: unknown; location?: unknown };
    const before = g.localStorage, where = g.location;
    g.localStorage = fake;
    g.location = { search: '' };
    try {
      const P = await import('./progress.ts'), L = await import('./wildlife-log.ts');
      const got = P.loadProgress();
      expect(got.best).toEqual(p.best);
      expect(got.hints).toBe(p.hints);
      expect(got.perfect).toEqual(p.perfect);
      expect(got.dailyCleared).toEqual(p.dailyCleared);
      expect(got.announced).toEqual(p.announced);
      expect(got.standDowns).toEqual(p.standDowns);
      const gotLog = L.loadLog();
      expect(gotLog.found).toEqual(liveLog.found);
      expect(gotLog.camo).toBe(false);
      expect(gotLog.dug).toBe(61000);
      expect(gotLog.dugSwipes).toBe(40);
      expect(parseAudioSettings(back.get('rush-hour-rigs-audio')!)).toEqual({ sfx: true, music: true, style: audio.style });
    } finally { g.localStorage = before; g.location = where; }
  });
});
