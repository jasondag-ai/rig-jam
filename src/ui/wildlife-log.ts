// The Wildlife Log: each gag is collected the first time it fully plays; its card shows a still of
// its own puppet. Every gag is an Easter egg: a card's hint (how to set the gag off) shows in demo
// mode only. Finding them all unlocks camo pickups (on by default once earned, with a switch in
// Settings). Saved on this phone under a `rush-hour-rigs:` key, so "Reset progress" clears it too.
// `?log=all` previews a full log.
import { STORAGE_PREFIX } from './progress.ts';
import { dressCamo } from './sprites.ts';

export type Sighting = 'magpie' | 'spotter' | 'moose' | 'nearmiss' | 'landowner' | 'biffy' | 'biffyB' | 'marshmallow' | 'geese' | 'porcupine' | 'lunch' | 'sam' | 'tongue' | 'surveyor' | 'deer' | 'tourists' | 'night' | 'bull' | 'bear';

export interface LogEntry {
  id: Sighting;
  name: string;
  caption: string;
  /** Shown on the card until it's found (demo mode only). Plain words, short: where, and what to do. No em dashes. */
  hint: string;
  /** The rare one: gold frame and a LEGENDARY tag on its card, found or not. */
  legendary?: boolean;
}

/** One entry per gag in the game, in the order the page lists them. */
export const LOG_ENTRIES: LogEntry[] = [
  { id: 'magpie', name: 'Magpie', caption: 'Never park under a tree.', hint: "Tap a truck without dragging it. He may fly in." },
  { id: 'spotter', name: 'Sleepy Worker', caption: 'On the clock. Allegedly.', hint: "Slide one truck into another. He may wander in." },
  { id: 'moose', name: 'Moose', caption: 'Just checking in.', hint: "In Duvernay, bump a truck into the top berm twice." },
  { id: 'nearmiss', name: 'Near Miss', caption: 'Owns the lease. Pays no rent.', hint: "In Cardium, drive two trucks out one right after the other." },
  { id: 'landowner', name: 'Angry Landowner', caption: 'Wants a word about the ruts.', hint: "Drive one truck back and forth four times, or wiggle it fast." },
  { id: 'biffy', name: 'Occupied', caption: 'Knock first.', hint: "Bump a truck into the bottom berm." },
  { id: 'biffyB', name: 'The Runaway Roll', caption: 'It got away from him.', hint: "Bump the bottom berm twice, quickly." },
  { id: 'marshmallow', name: 'Marshmallow', caption: 'Mmm. Crispy.', hint: "Tap a flare stack three times." },
  { id: 'geese', name: 'Lost Goose', caption: 'Wrong way, buddy.', hint: "Press Undo three times in a row." },
  { id: 'porcupine', name: 'Porcupine', caption: 'Check behind the bush first.', hint: "In Cardium, tap the bush three times." },
  { id: 'lunch', name: 'Gopher Lunch', caption: 'He left you the crust.', hint: "In Cardium, press Hint. He may show up for lunch." },
  { id: 'sam', name: 'Safety Sam', caption: 'See me.', hint: "Bump three times in a row, or push a truck at a wrong-colour gate." },
  { id: 'tongue', name: 'Frozen Tongue', caption: 'HEWP!', hint: "On a winter level, tap the frosty pipe stand three times." },
  { id: 'surveyor', name: 'Surveyor', caption: 'Off a metre. Or not.', hint: "Press Restart. He may come to check the sign." },
  { id: 'deer', name: 'Back Scratcher', caption: "That's the spot.", hint: "Tap the lease sign (spring to fall)." },
  { id: 'tourists', name: 'Tourists', caption: 'A real oil sign!', hint: "Play the Daily Pad. They may show up on your first move (spring to fall)." },
  { id: 'night', name: 'Night Shift', caption: 'Lights out on the lease.', hint: "Leave a Montney or Duvernay level alone for a while." },
  { id: 'bull', name: 'Bull and Cow', caption: 'Spring in the Montney.', hint: "In Montney, tap the cow." },
  { id: 'bear', name: 'Bear', caption: 'Does what bears do in the woods.', hint: "In Duvernay, tap the snowy bush three times. He comes one time in three.", legendary: true },
];
/** How many of the log's entries have been found (a saved log may hold ids from gags since retired). */
export const foundCount = (log: WildlifeLog): number => LOG_ENTRIES.filter((e) => log.found.includes(e.id)).length;
/** What an unfound card says: the gag's hint in demo mode; nothing given away in the game. */
export const cardHint = (e: LogEntry, demo: boolean): string => (demo ? e.hint : 'Not seen yet.');

export const LOG_KEY = `${STORAGE_PREFIX}log`;
/** Demo mode keeps its own log: its sightings never count toward the real log or camo. Reset clears both. */
export const DEMO_LOG_KEY = `${STORAGE_PREFIX}demo-log`;
const keyFor = (demo: boolean) => (demo ? DEMO_LOG_KEY : LOG_KEY);

export interface WildlifeLog {
  /** Sightings in the order they were found. */
  found: Sighting[];
  /** Camo pickups switched on (only matters once they're earned). */
  camo: boolean;
  /** Camo pickups earned: every entry found (or earned under an earlier, shorter log: that is kept). */
  camoEarned: boolean;
}

/** Saved-log format: 3 is the puppet gags' log (ids of the retired sprite gags are dropped on load). */
const VERSION = 3;

const IDS = new Set<string>(LOG_ENTRIES.map((e) => e.id));

export function parseLog(raw: string | null): WildlifeLog {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<WildlifeLog>) : {};
    const found = Array.isArray(v.found) ? [...new Set(v.found.filter((x): x is Sighting => IDS.has(x)))] : [];
    const camoEarned = v.camoEarned === true || LOG_ENTRIES.every((e) => found.includes(e.id));
    return { found, camo: typeof v.camo === 'boolean' ? v.camo : true, camoEarned };
  } catch {
    return { found: [], camo: true, camoEarned: false };
  }
}

/** `?log=all` shows a full log (for previewing the page and the camo skin) without saving it. */
export const previewAll = (search: string) => new URLSearchParams(search).get('log') === 'all';

/** The real log, or (with `demo`) the separate demo-mode log. */
export function loadLog(demo = false): WildlifeLog {
  let log: WildlifeLog;
  try {
    log = parseLog(localStorage.getItem(keyFor(demo)));
    // A demo log never earns camo, whatever it holds.
    if (demo) log = { ...log, camoEarned: false };
  } catch {
    log = parseLog(null);
  }
  return typeof location !== 'undefined' && previewAll(location.search) ? { ...log, found: LOG_ENTRIES.map((e) => e.id), camoEarned: true } : log;
}

/** Saves the log (in preview mode only the camo switch is kept; the real sightings stay as they were). */
export function saveLog(log: WildlifeLog, demo = false): void {
  try {
    if (demo && previewAll(location.search)) return;
    const stored = previewAll(location.search) ? { ...parseLog(localStorage.getItem(LOG_KEY)), camo: log.camo } : log;
    localStorage.setItem(keyFor(demo), JSON.stringify({ v: VERSION, ...stored, ...(demo ? { camoEarned: false } : {}) }));
  } catch {
    // Storage blocked: the log lasts for this visit only.
  }
}

export const complete = (log: WildlifeLog) => LOG_ENTRIES.every((e) => log.found.includes(e.id));
/** Camo pickups show once earned, unless switched off in Settings. */
export const camoOn = (log: WildlifeLog) => log.camoEarned && log.camo;

/** A gag fully played: adds it if it's new. `completed` is true on the sighting that finishes the log. */
export function record(log: WildlifeLog, id: Sighting): { log: WildlifeLog; isNew: boolean; count: number; completed: boolean } {
  if (log.found.includes(id)) return { log, isNew: false, count: log.found.length, completed: false };
  const found = [...log.found, id];
  const done = LOG_ENTRIES.every((e) => found.includes(e.id));
  const next = { ...log, found, camoEarned: log.camoEarned || done };
  return { log: next, isNew: true, count: found.length, completed: done };
}

export const sightingToast = (id: Sighting, count: number, demo = false) =>
  `${demo ? 'Demo' : 'New'} sighting! ${LOG_ENTRIES.find((e) => e.id === id)?.name ?? id} (${count}/${LOG_ENTRIES.length})`;

/** Every pickup in the game wears camo in its own gate colour (a class on <body>; sprites.ts picks the camo sprite). */
export function applyCamo(log: WildlifeLog = loadLog()): void {
  document.body.classList.toggle('camo-pickups', camoOn(log));
  dressCamo();
}
