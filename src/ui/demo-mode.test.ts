import { afterEach, describe, expect, it } from 'vitest';
import { SWITCH_KEY, demoLink, demoOn, keepInMemory, lift, setDemo, switchSaved } from './demo-mode.ts';
import { freshProgress, loadProgress, recordWin, saveProgress } from './progress.ts';
import { DEMO_LOG_KEY, LOG_ENTRIES, LOG_KEY, loadLog, record, saveLog } from './wildlife-log.ts';
import { FINALE_KEY, finaleCount, finaleDue, loadFinale, saveFinaleSeen } from './finale-state.ts';
import { REGIONS } from '../levels/regions.ts';

/** A stand-in for the browser's store, with the same methods on its prototype. */
class Store {
  data = new Map<string, string>();
  get length(): number { return this.data.size; }
  key(i: number): string | null { return [...this.data.keys()][i] ?? null; }
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  setItem(k: string, v: string): void { this.data.set(k, v); }
  removeItem(k: string): void { this.data.delete(k); }
  clear(): void { this.data.clear(); }
}
const g = globalThis as unknown as { localStorage?: Storage; location?: unknown };
const real = { localStorage: g.localStorage, location: g.location };
/** The game's own loaders read `localStorage`: give them a store of ours for one test. */
function phone(saved: Record<string, string> = {}): Store {
  const store = new Store();
  for (const [k, v] of Object.entries(saved)) store.data.set(k, v);
  g.localStorage = store as unknown as Storage;
  g.location = { search: '' };
  return store;
}
const bytes = (s: Store) => JSON.stringify([...s.data.entries()]);
afterEach(() => {
  setDemo(false, false, g.localStorage);
  lift();
  g.localStorage = real.localStorage;
  g.location = real.location;
});

describe('demo mode: the link', () => {
  it('?demo=1 turns it on, and nothing else does', () => {
    expect(demoLink('?demo=1')).toBe(true);
    expect(demoLink('?cover=0&demo=1')).toBe(true);
    expect(demoLink('?demo=0')).toBe(false);
    expect(demoLink('')).toBe(false);
  });
});

describe('demo mode: the copy in memory', () => {
  it('keeps every write in memory: the page reads its own writes, the real store never changes', () => {
    const store = new Store();
    store.data.set('rush-hour-rigs:v2', 'saved');
    store.data.set('rush-hour-rigs:log', 'log');
    const mem = keepInMemory(store as unknown as Storage);
    // Reads fall through to what is really stored.
    expect(store.getItem('rush-hour-rigs:v2')).toBe('saved');
    // A write is seen by the page and by nothing else.
    store.setItem('rush-hour-rigs:v2', 'played');
    store.setItem('rush-hour-rigs-audio', 'on');
    expect(store.getItem('rush-hour-rigs:v2')).toBe('played');
    expect(store.getItem('rush-hour-rigs-audio')).toBe('on');
    // A removal and a clear too.
    store.removeItem('rush-hour-rigs:log');
    expect(store.getItem('rush-hour-rigs:log')).toBeNull();
    store.clear();
    expect(store.getItem('rush-hour-rigs:v2')).toBeNull();
    expect(store.getItem('rush-hour-rigs-audio')).toBeNull();
    expect([...store.data.entries()]).toEqual([['rush-hour-rigs:v2', 'saved'], ['rush-hour-rigs:log', 'log']]);
    expect(mem.size).toBeGreaterThan(0);
    // Another store of the same kind is left alone.
    const other = new Store();
    other.setItem('a', '1');
    expect(other.data.get('a')).toBe('1');
    other.removeItem('a');
    expect(other.data.size).toBe(0);
  });

  it('lifted, the real store shows again, and writes reach it once more', () => {
    const store = new Store();
    store.data.set('k', 'real');
    keepInMemory(store as unknown as Storage);
    store.setItem('k', 'played');
    store.setItem('new', 'x');
    lift();
    expect(store.getItem('k')).toBe('real');
    expect(store.getItem('new')).toBeNull();
    store.setItem('k', 'saved again');
    expect(store.data.get('k')).toBe('saved again');
  });
});

describe('demo mode: ONE SWITCH', () => {
  /** A player part way through: three levels, a hint spent, two sightings, the old demo mode's log, the ending seen. */
  function played(): Record<string, string> {
    phone();
    let p = freshProgress();
    for (const [id, moves, par] of [['c01', 2, 2], ['c02', 6, 4], ['c03', 5, 5]] as const) p = recordWin(p, id, moves, par).progress;
    saveProgress({ ...p, dailyCleared: ['2026-10-10', '2026-10-11'] });
    saveLog(record(record(loadLog(), 'magpie').log, 'moose').log);
    const saved = Object.fromEntries((g.localStorage as unknown as Store).data.entries());
    return { ...saved, [DEMO_LOG_KEY]: JSON.stringify({ v: 3, found: ['bear'], camo: true, camoEarned: false }), 'rush-hour-rigs:finale': '{"v":1,"seen":true}', 'rush-hour-rigs-audio': '{"sfx":true,"music":false,"style":"country"}' };
  }

  it('the switch is the saved progress\'s own `demo` field', () => {
    const store = phone();
    saveProgress(freshProgress());
    expect([...store.data.keys()]).toEqual([SWITCH_KEY]);
    expect(switchSaved(store as unknown as Storage)).toBe(false);
    store.data.set(SWITCH_KEY, JSON.stringify({ ...freshProgress(), demo: true }));
    expect(switchSaved(store as unknown as Storage)).toBe(true);
  });

  it('on: every level is open, every sighting shows; off: real progress is back', () => {
    const store = phone(played());
    expect(loadProgress().demo).toBe(false);
    expect(loadLog().found).toEqual(['magpie', 'moose']);
    setDemo(true, true, store as unknown as Storage);
    expect(demoOn()).toBe(true);
    expect(loadProgress().demo).toBe(true);
    expect(loadProgress().best).toEqual({ c01: 2, c02: 6, c03: 5 });
    expect(loadLog().found).toEqual(LOG_ENTRIES.map((e) => e.id));
    expect(loadLog().camoEarned).toBe(false);
    setDemo(false, true, store as unknown as Storage);
    expect(demoOn()).toBe(false);
    expect(loadProgress().demo).toBe(false);
    expect(loadLog().found).toEqual(['magpie', 'moose']);
  });

  it('NOTHING IS SAVED WHILE IT IS ON, and on then off leaves the phone byte for byte as it was', () => {
    const store = phone(played());
    const before = bytes(store);
    setDemo(true, true, store as unknown as Storage);
    // The one thing the switch saves is itself.
    expect(JSON.parse(store.data.get(SWITCH_KEY)!).demo).toBe(true);
    const on = bytes(store);
    // Play: a level won, a hint spent, a sighting, the log's camo, the settings, a reset of everything.
    saveProgress({ ...recordWin(loadProgress(), 'c04', 9, 7).progress, hints: 0, dailyCleared: [] });
    saveLog({ ...loadLog(), camo: false });
    g.localStorage!.setItem('rush-hour-rigs-audio', '{"sfx":false}');
    g.localStorage!.removeItem('rush-hour-rigs:finale');
    g.localStorage!.setItem('rush-hour-rigs:turnaround', '{"v":1,"best":{"1":30}}');
    expect(loadProgress().best.c04).toBe(9);
    expect(bytes(store)).toBe(on);
    setDemo(false, true, store as unknown as Storage);
    expect(bytes(store)).toBe(before);
    expect(loadProgress().best).toEqual({ c01: 2, c02: 6, c03: 5 });
    expect(loadProgress().dailyCleared).toEqual(['2026-10-10', '2026-10-11']);
    expect(g.localStorage!.getItem('rush-hour-rigs:finale')).toBe('{"v":1,"seen":true}');
    expect(g.localStorage!.getItem(DEMO_LOG_KEY)).toContain('bear');
    expect(g.localStorage!.getItem(LOG_KEY)).toContain('moose');
  });

  it('THE ENDING IN DEMO MODE (job U21): earned by the session\'s own pars with every sighting counted, its flag kept in memory only, gone when the switch goes off', () => {
    const levels = REGIONS.flatMap((r) => r.levels);
    const store = phone(played());
    const before = bytes(store);
    const count = () => finaleCount(loadProgress().best, loadLog().found, levels, LOG_ENTRIES);
    // The real save is three levels in, with two sightings: nowhere near.
    expect(finaleDue(count(), loadFinale())).toBe(false);
    setDemo(true, true, store as unknown as Storage);
    const on = bytes(store);
    // (This save had seen the ending for real; say it had not.)
    g.localStorage!.removeItem(FINALE_KEY);
    expect(count().sightings).toBe(LOG_ENTRIES.length);
    expect(finaleDue(count(), loadFinale())).toBe(false);
    // Every level at par, in the demo session: the last one makes it due.
    let p = loadProgress();
    for (const l of levels.slice(0, -1)) p = recordWin(p, l.id, l.par, l.par).progress;
    saveProgress(p);
    expect(finaleDue(count(), loadFinale())).toBe(false);
    saveProgress(recordWin(loadProgress(), levels.at(-1)!.id, levels.at(-1)!.par, levels.at(-1)!.par).progress);
    expect(finaleDue(count(), loadFinale())).toBe(true);
    // It plays: the flag goes to the copy in memory, never to the phone.
    saveFinaleSeen();
    expect(loadFinale().seen).toBe(true);
    expect(finaleDue(count(), loadFinale())).toBe(false);
    expect(bytes(store)).toBe(on);
    // Off: the session's pars and its flag are gone; the phone is byte for byte what it was (its own flag included).
    setDemo(false, true, store as unknown as Storage);
    expect(bytes(store)).toBe(before);
    expect(store.data.get(FINALE_KEY)).toBe('{"v":1,"seen":true}');
    expect(count().pads).toBe(1);
    // On again: a new session, nothing earned, nothing due.
    store.data.delete(FINALE_KEY);
    setDemo(true, true, store as unknown as Storage);
    expect(finaleDue(count(), loadFinale())).toBe(false);
    expect(loadFinale().seen).toBe(false);
  });

  it('the link turns the same switch on and writes nothing at all, not even the switch', () => {
    const store = phone(played());
    const before = bytes(store);
    setDemo(true, false, store as unknown as Storage);
    expect(demoOn()).toBe(true);
    expect(loadProgress().demo).toBe(true);
    expect(loadLog().found.length).toBe(LOG_ENTRIES.length);
    saveProgress(recordWin(loadProgress(), 'c04', 9, 7).progress);
    expect(bytes(store)).toBe(before);
    // Switched off in Settings: the same way out.
    setDemo(false, true, store as unknown as Storage);
    expect(bytes(store)).toBe(before);
    expect(loadProgress().demo).toBe(false);
  });

  it('a brand-new phone: on leaves only the switch, off leaves nothing', () => {
    const store = phone();
    setDemo(true, true, store as unknown as Storage);
    expect(JSON.parse(store.data.get(SWITCH_KEY)!)).toEqual({ demo: true });
    expect(loadProgress().hints).toBe(freshProgress().hints);
    setDemo(false, true, store as unknown as Storage);
    expect(store.data.size).toBe(0);
  });

  it('a phone that had the OLD demo mode on (before 1.0.9) opens in demo mode, its saves and its old demo log untouched', () => {
    const saved = played();
    saved[SWITCH_KEY] = JSON.stringify({ ...JSON.parse(saved[SWITCH_KEY]), demo: true });
    const store = phone(saved);
    const before = bytes(store);
    // What the page does as it opens.
    expect(switchSaved(store as unknown as Storage)).toBe(true);
    setDemo(true, false, store as unknown as Storage);
    expect(loadProgress().demo).toBe(true);
    expect(bytes(store)).toBe(before);
    setDemo(false, true, store as unknown as Storage);
    expect(JSON.parse(store.data.get(SWITCH_KEY)!).demo).toBe(false);
    expect(store.data.get(DEMO_LOG_KEY)).toBe(saved[DEMO_LOG_KEY]);
    expect(store.data.get(LOG_KEY)).toBe(saved[LOG_KEY]);
  });
});
