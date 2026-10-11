// DEMO MODE: ONE SWITCH (Jay, Oct 11). While it is on, every region and level is open, the Wildlife Log is shown
// complete, the HUD always shows the best score still possible, AND NOTHING IS SAVED: whatever the game writes
// (scores, hints, the log, settings, the region last opened) goes to a copy in memory, laid over what the phone
// really holds, and is gone when the switch goes off or the page goes. Turning it off shows real progress again,
// exactly as it was.
//
// TWO WAYS TO TURN IT ON, ONE CODE PATH (`setDemo`): the "Demo mode" switch in Settings, which is remembered (the
// one thing demo mode does save: the `demo` flag of the saved progress, as the switch always did), and the link
// `?demo=1`, which turns the same switch on for that page load and writes nothing at all.
//
// This file is the FIRST thing main.ts imports, so the copy is in place before anything reads or writes storage.

import { padLink } from './daily-pads.ts';
import { weekLink } from './turnaround.ts';
import { isDev } from './version.ts';

/** Does this page's address turn demo mode on (`?demo=1`)? */
export const demoLink = (search: string = typeof location === 'undefined' ? '' : location.search): boolean => new URLSearchParams(search).get('demo') === '1';

/** Where progress is saved (progress.ts `KEY`: a test holds the two together). Its `demo` field is the switch. */
export const SWITCH_KEY = 'rush-hour-rigs:v2';

/** The copy in memory, while there is one, and the store it lies over. */
let mem: Map<string, string | null> | null = null;
let kept: Storage | null = null;
const patched = new WeakSet<object>();

/**
 * Lays an in-memory copy over `store`: reads see what was written since, else what is really stored; writes and
 * removals never reach the real store. `lift()` takes it away again (and with it everything written meanwhile).
 * Returns the copy (for tests).
 */
export function keepInMemory(store: Storage): Map<string, string | null> {
  if (mem && kept === store) return mem;
  const proto = Object.getPrototypeOf(store) as Storage;
  if (!patched.has(proto)) {
    patched.add(proto);
    const { getItem, setItem, removeItem, clear } = proto;
    proto.getItem = function (key: string): string | null {
      return mem && this === kept && mem.has(key) ? mem.get(key)! : getItem.call(this, key);
    };
    proto.setItem = function (key: string, value: string): void {
      if (mem && this === kept) mem.set(key, String(value));
      else setItem.call(this, key, value);
    };
    proto.removeItem = function (key: string): void {
      if (mem && this === kept) mem.set(key, null);
      else removeItem.call(this, key);
    };
    proto.clear = function (): void {
      if (!mem || this !== kept) return clear.call(this);
      for (let i = 0; i < this.length; i++) mem.set(this.key(i)!, null);
      for (const key of [...mem.keys()]) mem.set(key, null);
    };
  }
  kept = store;
  mem = new Map();
  return mem;
}

/** Takes the copy away: the real store shows again, untouched by anything written since `keepInMemory`. */
export function lift(): void {
  mem = null;
  kept = null;
}

/** The dev copy's `?pad=N` (try any Daily Pad: daily-pads.ts) saves nothing either: no streak, no hard hats, no log. */
const tryingPad = (): boolean => isDev() && (padLink() !== null || weekLink() !== null); // (and `?week=N`, a Sunday Turnaround: turnaround.ts)

/** Is the Settings switch saved as on? (Read from the real store: call it with no copy laid over.) */
export function switchSaved(store: Storage): boolean {
  try {
    return (JSON.parse(store.getItem(SWITCH_KEY) ?? 'null') as { demo?: unknown } | null)?.demo === true;
  } catch {
    return false;
  }
}

/**
 * Writes the switch into the real store and NOTHING ELSE: the saved progress is taken as it stands, text and all,
 * and only its `demo` field is changed, so on and then off leaves it byte for byte what it was. (A phone with no
 * saved progress gets one holding only the switch, and loses it again when the switch goes off.)
 */
function saveSwitch(store: Storage, value: boolean): void {
  try {
    const raw = store.getItem(SWITCH_KEY);
    const p = (raw ? JSON.parse(raw) : null) as Record<string, unknown> | null;
    if ((p?.demo === true) === value) return;
    if (value) return void store.setItem(SWITCH_KEY, JSON.stringify({ ...(p ?? {}), demo: true }));
    if (Object.keys(p!).length === 1) store.removeItem(SWITCH_KEY);
    else store.setItem(SWITCH_KEY, JSON.stringify({ ...p, demo: false }));
  } catch {
    // Storage blocked: the switch lasts for this visit only.
  }
}

let on = false;
/** Is demo mode on? THE ONE QUESTION everything asks (open levels, the full log, the always-on best line). */
export const demoOn = (): boolean => on;

/**
 * Turns demo mode on or off: THE ONE CODE PATH. `remember` (the Settings switch) saves the switch itself, so it is
 * still on after a reload; the `?demo=1` link passes false and writes nothing. Turning it off always clears a saved
 * switch, and drops everything written while it was on.
 */
export function setDemo(value: boolean, remember = true, store: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): void {
  if (!store) return void (on = value);
  try {
    lift();
    if (remember || !value) saveSwitch(store, value);
    on = value;
    if (on || tryingPad()) keepInMemory(store);
  } catch {
    // Storage blocked altogether: nothing can be saved anyway.
    on = value;
  }
}

if (typeof window !== 'undefined') {
  try {
    if (demoLink() || switchSaved(window.localStorage)) setDemo(true, false);
    else if (tryingPad()) keepInMemory(window.localStorage);
  } catch {
    // Storage blocked altogether: nothing can be saved anyway.
    if (demoLink()) on = true;
  }
}
