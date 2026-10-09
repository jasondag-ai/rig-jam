// DAILY PADS FOREVER (October upgrade, job U2). Which level a Daily Pad is, and where it comes from.
//   Pads 1 to 60 (Sep 30 to Nov 28, 2026): `src/levels/daily.json`, in the game's own script, exactly as they were.
//   Pads 61 to 790 (Nov 29, 2026 to Nov 27, 2028): made once by `tools/gen-daily.ts` and fixed, the same for
//     everyone. They are NOT in the game's script: they lie in `public/daily/pads-<from>-<to>.json`, blocks of
//     `DAILY_BLOCK` pads, and the one block a day needs is fetched when it is needed (`dailyLevel`). The service
//     worker keeps every block, so today's pad plays offline once the game has been opened.
//   After pad 790: they repeat from pad 61 (`padSlot`). REGENERATE BEFORE NOV 2028 (tools/gen-daily.ts).
import { parseLevel, type Level } from '../engine/index.ts';

/** The last pad that is in the game's own script, the first and the last of the fetched ones, and how many to a file. */
export const DAILY_BUILT_IN = 60;
export const DAILY_FIRST_NEW = 61;
export const DAILY_LAST = 790;
export const DAILY_BLOCK = 30;

/** The pad whose level a pad number plays: itself up to the last one made; after that, round again from pad 61. */
export function padSlot(pad: number): number {
  const p = Math.max(1, Math.floor(pad));
  return p <= DAILY_LAST ? p : DAILY_FIRST_NEW + ((p - DAILY_FIRST_NEW) % (DAILY_LAST - DAILY_FIRST_NEW + 1));
}

/** The file a fetched pad lies in (its pads `from`..`to`), by the site's own address. */
export function blockOf(slot: number): { from: number; to: number; file: string } {
  const from = DAILY_FIRST_NEW + Math.floor((slot - DAILY_FIRST_NEW) / DAILY_BLOCK) * DAILY_BLOCK;
  const to = Math.min(DAILY_LAST, from + DAILY_BLOCK - 1);
  const n = (x: number) => String(x).padStart(3, '0');
  return { from, to, file: `daily/pads-${n(from)}-${n(to)}.json` };
}

/**
 * A layout's fingerprint: where every truck, gate and piece of equipment is, whatever their colours, looks and
 * order. Two levels with the same one are the same puzzle. (tools/gen-daily.ts and the tests: no pad repeats.)
 */
export function layoutKey(level: { trucks: { row: number; col: number; length: number; orient: string }[]; gates: { side: string; index: number }[]; obstacles?: { row: number; col: number }[] }): string {
  const trucks = level.trucks.map((t) => `${t.orient}${t.length}@${t.row},${t.col}`).sort();
  const gates = level.gates.map((g) => `${g.side}${g.index}`).sort();
  const eq = (level.obstacles ?? []).map((o) => `${o.row},${o.col}`).sort();
  return `${trucks.join(' ')}|${gates.join(' ')}|${eq.join(' ')}`;
}

/** How a block is fetched: the game's own way is `fetch` from beside the page; tests read the file. */
export type BlockReader = (file: string) => Promise<unknown>;
const fromSite: BlockReader = async (file) => {
  const res = await fetch(new URL(file, document.baseURI).href);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  return res.json();
};

const blocks = new Map<string, Promise<Level[]>>();
/** Forgets the blocks fetched this visit (tests). */
export const forgetBlocks = (): void => blocks.clear();
/** A block's levels, fetched once a visit (a failed fetch is forgotten, so the next try asks again). */
function blockLevels(file: string, read: BlockReader): Promise<Level[]> {
  let got = blocks.get(file);
  if (!got) {
    got = read(file).then((raw) => (raw as unknown[]).map((l) => parseLevel(l)));
    blocks.set(file, got);
    got.catch(() => blocks.delete(file));
  }
  return got;
}

/**
 * The level of Daily Pad `pad`. Pads 1 to 60 come from `builtIn` at once; the rest from their block (fetched).
 * Rejects if the block cannot be had (no connection, and never fetched before).
 */
export async function dailyLevel(pad: number, builtIn: Level[], read: BlockReader = fromSite): Promise<Level> {
  const slot = padSlot(pad);
  if (slot <= DAILY_BUILT_IN) return builtIn[slot - 1];
  const b = blockOf(slot);
  const level = (await blockLevels(b.file, read))[slot - b.from];
  if (!level) throw new Error(`pad ${pad}: not in ${b.file}`);
  return level;
}

/** The pad's level if it is to hand without waiting (pads 1 to 60), else null. */
export const dailyLevelNow = (pad: number, builtIn: Level[]): Level | null => (padSlot(pad) <= DAILY_BUILT_IN ? builtIn[padSlot(pad) - 1] : null);

/** Fetches ahead, quietly: a pad's block, and the next day's if that is another file (so midnight needs no network). */
export function warmDaily(pad: number, builtIn: Level[], read: BlockReader = fromSite): void {
  for (const p of [pad, pad + 1]) void dailyLevel(p, builtIn, read).catch(() => {});
}

/** `?pad=N` (the dev copy only: version.ts `isDev`): try Daily Pad N. Null if there is none. Nothing it does is saved. */
export function padLink(search: string = typeof location === 'undefined' ? '' : location.search): number | null {
  const n = Number(new URLSearchParams(search).get('pad'));
  return Number.isInteger(n) && n >= 1 ? n : null;
}
