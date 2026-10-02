// The Wildlife Log: each gag is collected the first time it fully plays. Finding all seven unlocks
// camo pickups (on by default once earned, with a switch in Settings). Saved on this phone under a
// `rush-hour-rigs:` key, so "Reset progress" clears it too. `?log=all` previews a full log.
import { STORAGE_PREFIX } from './progress.ts';

export type Sighting = 'magpie' | 'spotter' | 'biffy' | 'landowner' | 'bear' | 'moose' | 'hotshot';

export interface LogEntry {
  id: Sighting;
  name: string;
  caption: string;
  /** Shown on the card until it's found. */
  hint: string;
}

export const LOG_ENTRIES: LogEntry[] = [
  { id: 'magpie', name: 'Magpie', caption: 'Never park under a tree.', hint: 'Watch the roofs' },
  { id: 'spotter', name: 'Sleeping Spotter', caption: 'On the clock. Allegedly.', hint: 'Try waiting' },
  { id: 'biffy', name: 'Biffy Surprise', caption: 'Occupied.', hint: 'Back a truck up to the biffy' },
  { id: 'landowner', name: 'Angry Landowner', caption: 'Wants a word about the ruts.', hint: 'Seen in Montney. Mind the mud' },
  { id: 'bear', name: 'Bear', caption: 'Does what bears do in the woods.', hint: 'Seen in Montney' },
  { id: 'moose', name: 'Moose', caption: 'Just checking in.', hint: 'Seen in Duvernay' },
  { id: 'hotshot', name: 'Hot Shot', caption: 'Late for something.', hint: "Seen everywhere. Don't blink" },
];

export const LOG_KEY = `${STORAGE_PREFIX}log`;

export interface WildlifeLog {
  /** Sightings in the order they were found. */
  found: Sighting[];
  /** Camo pickups switched on (only matters once all seven are found). */
  camo: boolean;
}

const IDS = new Set<string>(LOG_ENTRIES.map((e) => e.id));

export function parseLog(raw: string | null): WildlifeLog {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<WildlifeLog>) : {};
    const found = Array.isArray(v.found) ? [...new Set(v.found.filter((x): x is Sighting => IDS.has(x)))] : [];
    return { found, camo: typeof v.camo === 'boolean' ? v.camo : true };
  } catch {
    return { found: [], camo: true };
  }
}

/** `?log=all` shows a full log (for previewing the page and the camo skin) without saving it. */
export const previewAll = (search: string) => new URLSearchParams(search).get('log') === 'all';

export function loadLog(): WildlifeLog {
  let log: WildlifeLog;
  try {
    log = parseLog(localStorage.getItem(LOG_KEY));
  } catch {
    log = parseLog(null);
  }
  return typeof location !== 'undefined' && previewAll(location.search) ? { ...log, found: LOG_ENTRIES.map((e) => e.id) } : log;
}

/** Saves the log (in preview mode only the camo switch is kept; the real sightings stay as they were). */
export function saveLog(log: WildlifeLog): void {
  try {
    const stored = previewAll(location.search) ? { ...parseLog(localStorage.getItem(LOG_KEY)), camo: log.camo } : log;
    localStorage.setItem(LOG_KEY, JSON.stringify(stored));
  } catch {
    // Storage blocked: the log lasts for this visit only.
  }
}

export const complete = (log: WildlifeLog) => LOG_ENTRIES.every((e) => log.found.includes(e.id));
/** Camo pickups show once the log is complete, unless switched off in Settings. */
export const camoOn = (log: WildlifeLog) => complete(log) && log.camo;

/** A gag fully played: adds it if it's new. `completed` is true on the sighting that finishes the log. */
export function record(log: WildlifeLog, id: Sighting): { log: WildlifeLog; isNew: boolean; count: number; completed: boolean } {
  if (log.found.includes(id)) return { log, isNew: false, count: log.found.length, completed: false };
  const next = { ...log, found: [...log.found, id] };
  return { log: next, isNew: true, count: next.found.length, completed: complete(next) };
}

export const sightingToast = (id: Sighting, count: number) => `New sighting! ${LOG_ENTRIES.find((e) => e.id === id)!.name} (${count}/${LOG_ENTRIES.length})`;

/** Every pickup in the game wears camo (a class on <body>; style.css draws it). */
export function applyCamo(log: WildlifeLog = loadLog()): void {
  document.body.classList.toggle('camo-pickups', camoOn(log));
}
