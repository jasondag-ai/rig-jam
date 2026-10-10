// SUNDAY TURNAROUNDS (job U3): one hard pad of 8 x 8 a week, made once and fixed, the same for everyone.
//   node tools/gen-turnaround.ts [first] [last]   weeks not yet in tools/.gen-cache/turnaround, then the files
// Each is grown by the Big Pad generator (tools/gen-bigpad.ts `growPad`: a pinwheel, tails, scrambled backwards,
// one truck re-dealt now and then) from a seed that is its week's number, WITH NO CLOCK IN IT (the spike's runs
// stopped at a time limit; these stop at their target or when nothing has been kept for a while), so the same week
// always comes out the same. A week's pad must have 14 to 16 trucks and 12 to 14 extra moves (par minus trucks);
// a seed that does not give one, or gives the layout of a Clearwater level or of an earlier week, hands over to
// the week's next seed. Each is proved by `candidate` (the game's parser, A* with the rings estimate, its moves
// played out in the game itself). Written to public/turnaround/weeks-<from>-<to>.json.
// REGENERATE BEFORE DEC 2028: raise `TURN_LAST` in src/ui/turnaround.ts and run this again.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { TRUCK_KINDS, type Level } from '../src/engine/index.ts';
import { mulberry32 } from '../src/engine/rng.ts';
import { candidate, growPad, type Target } from './gen-bigpad.ts';
import { layoutKey } from '../src/ui/daily-pads.ts';
import { TURN_BLOCK, TURN_LAST, turnBlock } from '../src/ui/turnaround.ts';

export const TURN_TARGET: Target = { trucks: [14, 16], extra: [12, 14] };
/** A week's seeds: its own, then its next (a prime apart, so weeks never share one). */
export const turnSeed = (week: number, k: number): number => 20261011 + week * 7919 + k * 1_000_003;
const KIND_SEED = 8800;
/**
 * How long a pad is scrambled with nothing kept before its seed is given up, and how many positions a solve may
 * look at while it grows (a pad past that is passed over). Measured: with the spike's own 600,000 a week took
 * about 12 minutes of one core; with these, under one, and the pads are ones a phone's hint solves quickly.
 */
export const GROW_STALE = 800, GROW_CAP = 40_000;
const CACHE = new URL('./.gen-cache/turnaround/', import.meta.url);
const OUT = new URL('../public/turnaround/', import.meta.url);

/** One try of one week: its pad from seed `k`, or null if that seed gives none in the target. */
export function tryWeek(week: number, k: number): Level | null {
  const rng = mulberry32(turnSeed(week, k));
  // (The week's own target inside the range, so the three are evenly spread.)
  const g = growPad(rng, Infinity, TURN_TARGET.extra[0] + ((week + k) % 3), TURN_TARGET, GROW_STALE, GROW_CAP);
  if (!g || g.extra < TURN_TARGET.extra[0] || g.extra > TURN_TARGET.extra[1] || g.ts.length < TURN_TARGET.trucks[0] || g.ts.length > TURN_TARGET.trucks[1]) return null;
  let c;
  try { c = candidate(g, `t${week}`); } catch { return null; }
  if (c.extraMoves < TURN_TARGET.extra[0] || c.extraMoves > TURN_TARGET.extra[1]) return null;
  // What each truck looks like (by its length), dealt from the week's own seed.
  const kinds = mulberry32(KIND_SEED + week);
  const trucks = c.level.trucks.map((t) => ({ ...t, kind: TRUCK_KINDS[t.length][Math.floor(kinds() * TRUCK_KINDS[t.length].length)] }));
  return { ...c.level, id: `t${week}`, name: `Turnaround #${week}`, trucks, obstacles: [], muskeg: [], racks: [] } as Level;
}

async function main(): Promise<void> {
  const first = Number(process.argv[2] ?? 1), last = Number(process.argv[3] ?? TURN_LAST);
  mkdirSync(CACHE, { recursive: true });
  const cached = (week: number, k: number): Level | null | undefined => { const f = new URL(`week-${week}-${k}.json`, CACHE); return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as { level: Level | null }).level : undefined; };
  const used = new Map<string, string>();
  for (const l of JSON.parse(readFileSync(new URL('../src/levels/clearwater.json', import.meta.url), 'utf8')) as Level[]) used.set(layoutKey(l), `Clearwater ${l.id}`);
  const started = Date.now();
  // Every week in parallel, each walking its own seeds until one gives a pad; then, in week order, the repeats.
  const queue = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const got = new Map<number, { level: Level; k: number }>();
  const run = (week: number, from: number) => new Promise<{ level: Level; k: number }>((resolve, reject) => {
    for (let k = from; ; k++) { const c = cached(week, k); if (c === undefined) break; if (c) return resolve({ level: c, k }); from = k + 1; }
    const w = new Worker(new URL(import.meta.url), { workerData: { week, from } });
    w.on('message', (m: { k: number; level: Level | null }) => { writeFileSync(new URL(`week-${week}-${m.k}.json`, CACHE), JSON.stringify({ level: m.level })); if (m.level) resolve({ level: m.level, k: m.k }); });
    w.on('error', reject);
  });
  let done = 0;
  await Promise.all(Array.from({ length: Math.max(1, availableParallelism() - 1) }, async () => {
    for (let week = queue.shift(); week !== undefined; week = queue.shift()) {
      got.set(week, await run(week, 0));
      console.log(`week ${week}: seed ${got.get(week)!.k}, ${got.get(week)!.level.trucks.length} trucks, par ${got.get(week)!.level.par} (${++done} of ${last - first + 1}, ${((Date.now() - started) / 1000).toFixed(0)} s)`);
    }
  }));
  const levels: Level[] = [];
  for (let week = first; week <= last; week++) {
    let { level, k } = got.get(week)!;
    while (used.has(layoutKey(level))) { console.log(`week ${week}: the same layout as ${used.get(layoutKey(level))}; its next seed`); ({ level, k } = await run(week, k + 1)); }
    used.set(layoutKey(level), `week ${week}`);
    levels.push(level);
  }
  if (first === 1 && last === TURN_LAST) {
    mkdirSync(OUT, { recursive: true });
    for (let from = 1; from <= TURN_LAST; from += TURN_BLOCK) {
      const b = turnBlock(from);
      writeFileSync(new URL(b.file.replace('turnaround/', ''), OUT), JSON.stringify(levels.slice(b.from - 1, b.to).map((l) => ({ id: l.id, name: l.name, par: l.par, size: 8, trucks: l.trucks, gates: l.gates, obstacles: [] }))) + '\n');
    }
    console.log(`wrote ${levels.length} Turnarounds to public/turnaround/`);
  }
  const by = (f: (l: Level) => number) => [...new Set(levels.map(f))].sort((a, b) => a - b).map((v) => `${v}: ${levels.filter((l) => f(l) === v).length}`).join(', ');
  console.log(`${levels.length} weeks in ${((Date.now() - started) / 1000).toFixed(0)} s; trucks ${by((l) => l.trucks.length)}; extra moves ${by((l) => l.par - l.trucks.length)}; par ${by((l) => l.par)}`);
}

if (!isMainThread) {
  const { week, from } = workerData as { week: number; from: number };
  for (let k = from; ; k++) { const level = tryWeek(week, k); parentPort!.postMessage({ k, level }); if (level) break; }
} else if (process.argv[1]?.endsWith('gen-turnaround.ts')) await main();
