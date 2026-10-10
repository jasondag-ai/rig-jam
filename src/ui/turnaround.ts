// SUNDAY TURNAROUND (October upgrade, job U3). Every Sunday a new hard pad of 8 x 8, the same for everyone,
// playable all week. (A turnaround: the planned shutdown when a plant is taken apart, fixed and put back: the big job.)
//   Turnaround #1 is the week of Sunday Oct 11, 2026 (the phone's local date); a new one each Sunday. `TURN_LAST` of
//   them are made (through Nov 2028) by `tools/gen-turnaround.ts` with the Big Pad generator, once, and fixed: 14 to
//   16 trucks, 12 to 14 extra moves, none the layout of a Clearwater level or of another. They lie in
//   `public/turnaround/weeks-<from>-<to>.json`, blocks of `TURN_BLOCK`, NOT in the game's script: the one block a
//   week needs is fetched when needed (`turnaroundLevel`), and the service worker keeps them all (offline).
//   After the last one they repeat from #1. REGENERATE BEFORE DEC 2028.
//   RESULTS ARE SAVED UNDER THEIR OWN KEY (`TURN_KEY`), never in the progress the live build reads.
import { parseLevel, type Level } from '../engine/index.ts';
import { dayNumber } from './daily.ts';
import type { BlockReader } from './daily-pads.ts';

/** The Sunday of Turnaround #1, how many are made, and how many to a file. */
export const TURN_EPOCH = '2026-10-11';
export const TURN_LAST = 112;
export const TURN_BLOCK = 8;
/** The Turnaround opens once the player has cleared this many levels in all (demo mode opens it). */
export const TURN_UNLOCK = 10;

/** This week's Turnaround number for a local date ('YYYY-MM-DD'): 1 in the week of the epoch (and before it), up one each Sunday. */
export function turnaroundNumber(today: string): number {
  return Math.max(1, Math.floor((dayNumber(today) - dayNumber(TURN_EPOCH)) / 7) + 1);
}
/** The one whose level a number plays: itself up to the last one made, then round again from #1. */
export const turnSlot = (week: number): number => ((Math.max(1, Math.floor(week)) - 1) % TURN_LAST) + 1;
/** The file a Turnaround lies in. */
export function turnBlock(slot: number): { from: number; to: number; file: string } {
  const from = 1 + Math.floor((slot - 1) / TURN_BLOCK) * TURN_BLOCK, to = Math.min(TURN_LAST, from + TURN_BLOCK - 1);
  const n = (x: number) => String(x).padStart(3, '0');
  return { from, to, file: `turnaround/weeks-${n(from)}-${n(to)}.json` };
}

const fromSite: BlockReader = async (file) => {
  const res = await fetch(new URL(file, document.baseURI).href);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  return res.json();
};
const blocks = new Map<string, Promise<Level[]>>();
/** Forgets the blocks fetched this visit (tests). */
export const forgetTurnarounds = (): void => blocks.clear();
/** The level of Turnaround `week` (fetched with its block, once a visit; a failed fetch is asked for again). */
export async function turnaroundLevel(week: number, read: BlockReader = fromSite): Promise<Level> {
  const slot = turnSlot(week), b = turnBlock(slot);
  let got = blocks.get(b.file);
  if (!got) {
    got = read(b.file).then((raw) => (raw as unknown[]).map((l) => parseLevel(l)));
    blocks.set(b.file, got);
    got.catch(() => blocks.delete(b.file));
  }
  const level = (await got)[slot - b.from];
  if (!level) throw new Error(`Turnaround ${week}: not in ${b.file}`);
  return level;
}
/** Fetches this week's block ahead, quietly (and next week's, if that is another file). */
export function warmTurnaround(week: number, read: BlockReader = fromSite): void {
  for (const w of [week, week + 1]) void turnaroundLevel(w, read).catch(() => {});
}

/** How many levels the player has cleared in all: the regions' levels (a Daily Pad or a Turnaround is not one). */
export const levelsCleared = (best: Record<string, number>, levelIds: Iterable<string>): number => { const ids = new Set(levelIds); return Object.keys(best).filter((id) => ids.has(id)).length; };
/** Is the Turnaround open to this player? */
export const turnaroundOpen = (cleared: number, demo: boolean): boolean => demo || cleared >= TURN_UNLOCK;

// ---------- Results: their own storage key ----------
export const TURN_KEY = 'rush-hour-rigs:turnaround';
export interface TurnResults { /** The fewest moves, by Turnaround number. */ best: Record<string, number> }
export function parseTurnResults(raw: string | null): TurnResults {
  try {
    const v = raw ? (JSON.parse(raw) as { best?: unknown }) : {};
    const best = v.best && typeof v.best === 'object' ? Object.fromEntries(Object.entries(v.best as Record<string, unknown>).filter(([k, m]) => /^\d+$/.test(k) && Number.isInteger(m) && (m as number) > 0)) as Record<string, number> : {};
    return { best };
  } catch {
    return { best: {} };
  }
}
export function loadTurnResults(): TurnResults {
  try { return parseTurnResults(localStorage.getItem(TURN_KEY)); } catch { return { best: {} }; }
}
/** A Turnaround cleared in `moves`: kept if it is the player's best for that number. */
export function recordTurnaround(r: TurnResults, week: number, moves: number): TurnResults {
  const had = r.best[String(week)];
  return had !== undefined && had <= moves ? r : { best: { ...r.best, [String(week)]: moves } };
}
export function saveTurnResults(r: TurnResults): void {
  try { localStorage.setItem(TURN_KEY, JSON.stringify({ v: 1, ...r })); } catch { /* storage blocked: for this visit only */ }
}

/** The Share line: no layout, just the numbers. No streak. */
export function turnShareText(r: { week: number; moves: number; par: number; hats: number; url: string }): string {
  return [`Rig Jam 🚛 Sunday Turnaround #${r.week}`, `${'👷'.repeat(r.hats)}${'▫️'.repeat(3 - r.hats)} ${r.moves} moves · par ${r.par}`, r.url].join('\n');
}

/** `?week=N` (the dev copy only): try Turnaround N. Null if there is none. Nothing it does is saved. */
export function weekLink(search: string = typeof location === 'undefined' ? '' : location.search): number | null {
  const n = Number(new URLSearchParams(search).get('week'));
  return Number.isInteger(n) && n >= 1 ? n : null;
}
