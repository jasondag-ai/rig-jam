// `?demo=1`: a HIDDEN switch for recording video (Jay, Oct 8). For this one page load every region and level is
// open and the Wildlife Log is shown complete, AND NOTHING IS SAVED: whatever the game writes (scores, hints, the
// log, settings, the region last opened) goes to a copy in memory, laid over what the phone really holds, and is
// gone with the page. No button, no label: only the link turns it on.
//
// This file is the FIRST thing main.ts imports, so the copy is in place before anything reads or writes storage.

import { padLink } from './daily-pads.ts';
import { weekLink } from './turnaround.ts';
import { isDev } from './version.ts';

/** Is this page load the hidden demo link? */
export const demoLink = (search: string = typeof location === 'undefined' ? '' : location.search): boolean => new URLSearchParams(search).get('demo') === '1';

/**
 * Lays an in-memory copy over `localStorage`: reads see what was written this visit, else what is really stored;
 * writes and removals never reach the real store. Returns the copy (for tests).
 */
export function keepInMemory(store: Storage): Map<string, string | null> {
  const mem = new Map<string, string | null>();
  const proto = Object.getPrototypeOf(store) as Storage;
  const { getItem, setItem, removeItem, clear } = proto;
  proto.getItem = function (key: string): string | null {
    return this === store && mem.has(key) ? mem.get(key)! : getItem.call(this, key);
  };
  proto.setItem = function (key: string, value: string): void {
    if (this === store) mem.set(key, String(value));
    else setItem.call(this, key, value);
  };
  proto.removeItem = function (key: string): void {
    if (this === store) mem.set(key, null);
    else removeItem.call(this, key);
  };
  proto.clear = function (): void {
    if (this !== store) return clear.call(this);
    for (let i = 0; i < store.length; i++) mem.set(store.key(i)!, null);
    for (const key of [...mem.keys()]) mem.set(key, null);
  };
  return mem;
}

/** The dev copy's `?pad=N` (try any Daily Pad: daily-pads.ts) saves nothing either: no streak, no hard hats, no log. */
const tryingPad = (): boolean => isDev() && (padLink() !== null || weekLink() !== null); // (and `?week=N`, a Sunday Turnaround: turnaround.ts)

if (typeof window !== 'undefined' && (demoLink() || tryingPad())) {
  try {
    keepInMemory(window.localStorage);
  } catch {
    // Storage blocked altogether: nothing can be saved anyway.
  }
}
