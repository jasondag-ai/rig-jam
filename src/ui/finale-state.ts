// THE FINALE (October upgrade, job U9): when it is earned, and that it has been seen. Pure, and its own storage key.
//   EARNED: every level of every region at 3 hard hats (par or better) AND every Wildlife Log entry found, on real
//   progress: never in demo mode (its levels are only opened, and it has a log of its own), never from `?log=all`.
//   IT PLAYS ONCE, straight after whatever completes it; `rush-hour-rigs:finale` remembers that it has. Once seen it
//   can be watched again from Settings ("Watch the ending"). `?finale=1` plays it on any build and saves nothing.
export const FINALE_KEY = 'rush-hour-rigs:finale';

export interface FinaleCount { /** Levels of the regions at par or better, and how many there are. */ pads: number; ofPads: number; /** Sightings found, and how many there are. */ sightings: number; ofSightings: number }

/** The game's own counts: levels at 3 hard hats, sightings found. (A Daily Pad or a Turnaround is not a level.) */
export function finaleCount(best: Record<string, number>, found: readonly string[], levels: readonly { id: string; par: number }[], entries: readonly { id: string }[]): FinaleCount {
  return {
    pads: levels.filter((l) => best[l.id] !== undefined && best[l.id] <= l.par).length,
    ofPads: levels.length,
    sightings: entries.filter((e) => found.includes(e.id)).length,
    ofSightings: entries.length,
  };
}
/** A perfect game: every level at par, every sighting found. Never in demo mode. */
export function finaleEarned(c: FinaleCount, demo: boolean): boolean {
  return !demo && c.ofPads > 0 && c.pads === c.ofPads && c.ofSightings > 0 && c.sightings === c.ofSightings;
}

export interface FinaleSaved { /** Has the ending played? */ seen: boolean }
export function parseFinale(raw: string | null): FinaleSaved {
  try { return { seen: !!raw && (JSON.parse(raw) as { seen?: unknown }).seen === true }; } catch { return { seen: false }; }
}
export function loadFinale(): FinaleSaved {
  try { return parseFinale(localStorage.getItem(FINALE_KEY)); } catch { return { seen: false }; }
}
export function saveFinaleSeen(): void {
  try { localStorage.setItem(FINALE_KEY, JSON.stringify({ v: 1, seen: true })); } catch { /* storage blocked: for this visit only */ }
}
/** Should the ending play now? Earned, and not played before. */
export const finaleDue = (c: FinaleCount, demo: boolean, saved: FinaleSaved): boolean => finaleEarned(c, demo) && !saved.seen;

/** `?finale=1`: play the ending now, on any build, saving nothing. `?finale=stage`: its empty stage only (tests). */
export function finaleLink(search: string = typeof location === 'undefined' ? '' : location.search): '1' | 'stage' | null {
  const v = new URLSearchParams(search).get('finale');
  return v === '1' || v === 'stage' ? v : null;
}

/** The four parts, in order, with the page's lengths (s); then the cover. */
export const FINALE_PARTS = ['card', 'photo', 'credits', 'still'] as const;
export type FinalePart = (typeof FINALE_PARTS)[number];
