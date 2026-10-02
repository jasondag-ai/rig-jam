// The Wildlife Log: each gag is collected the first time it fully plays. Finding all ten unlocks
// camo pickups (on by default once earned, with a switch in Settings). Saved on this phone under a
// `rush-hour-rigs:` key, so "Reset progress" clears it too. `?log=all` previews a full log.
import { STORAGE_PREFIX } from './progress.ts';

export type Sighting = 'magpie' | 'spotter' | 'biffy' | 'landowner' | 'bear' | 'moose' | 'hotshot' | 'gopher' | 'geese' | 'pumper';

export interface LogEntry {
  id: Sighting;
  name: string;
  caption: string;
  /** Shown on the card until it's found. */
  hint: string;
  /** The rare one: gold frame and a LEGENDARY tag on its card, found or not. */
  legendary?: boolean;
}

export const LOG_ENTRIES: LogEntry[] = [
  { id: 'magpie', name: 'Magpie', caption: 'Never park under a tree.', hint: 'Watch the roofs' },
  { id: 'spotter', name: 'Sleeping Spotter', caption: 'On the clock. Allegedly.', hint: 'Try waiting' },
  { id: 'biffy', name: 'Biffy Surprise', caption: 'Occupied.', hint: 'Back a truck up to the biffy' },
  { id: 'landowner', name: 'Angry Landowner', caption: 'Wants a word about the ruts.', hint: 'Seen in Montney. Mind the mud' },
  { id: 'bear', name: 'Bear', caption: 'Does what bears do in the woods.', hint: 'Only deep in the Duvernay.', legendary: true },
  { id: 'moose', name: 'Moose', caption: 'Just checking in.', hint: 'Seen in Duvernay' },
  { id: 'hotshot', name: 'Hot Shot', caption: 'Late for something.', hint: "Seen everywhere. Don't blink" },
  { id: 'gopher', name: 'Gopher', caption: 'Owns the lease. Pays no rent.', hint: 'Seen in Cardium' },
  { id: 'geese', name: 'Canada Geese', caption: 'Heading south. One of them late.', hint: 'Look up' },
  { id: 'pumper', name: 'The Pumper', caption: 'Gauge says fine. Clipboard agrees.', hint: 'Making his rounds' },
];

/** The first seven: a log that had all of these before 8 to 10 arrived keeps its camo. */
const ORIGINAL: Sighting[] = ['magpie', 'spotter', 'biffy', 'landowner', 'bear', 'moose', 'hotshot'];

export const LOG_KEY = `${STORAGE_PREFIX}log`;
/** Demo mode keeps its own log: its sightings never count toward the real log or camo. Reset clears both. */
export const DEMO_LOG_KEY = `${STORAGE_PREFIX}demo-log`;
const keyFor = (demo: boolean) => (demo ? DEMO_LOG_KEY : LOG_KEY);

export interface WildlifeLog {
  /** Sightings in the order they were found. */
  found: Sighting[];
  /** Camo pickups switched on (only matters once they're earned). */
  camo: boolean;
  /** Camo pickups earned: every entry found, or all of the original seven before there were ten. */
  camoEarned: boolean;
}

/** Saved-log format: 2 added entries 8 to 10 (and `camoEarned`). */
const VERSION = 2;

const IDS = new Set<string>(LOG_ENTRIES.map((e) => e.id));

export function parseLog(raw: string | null): WildlifeLog {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<WildlifeLog>) : {};
    const found = Array.isArray(v.found) ? [...new Set(v.found.filter((x): x is Sighting => IDS.has(x)))] : [];
    // A log saved before entries 8 to 10 existed, with all seven found, keeps the camo it earned.
    const legacy = raw !== null && (v as { v?: number }).v === undefined && ORIGINAL.every((id) => found.includes(id));
    const camoEarned = v.camoEarned === true || legacy || LOG_ENTRIES.every((e) => found.includes(e.id));
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
  `${demo ? 'Demo' : 'New'} sighting! ${LOG_ENTRIES.find((e) => e.id === id)!.name} (${count}/${LOG_ENTRIES.length})`;

/** Every pickup in the game wears camo (a class on <body>; style.css draws it). */
export function applyCamo(log: WildlifeLog = loadLog()): void {
  document.body.classList.toggle('camo-pickups', camoOn(log));
}
