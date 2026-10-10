// DAILY PADS 61 TO 790 (job U2): two more years of Daily Pads, made once and fixed, the same for everyone.
//   node tools/gen-daily.ts            every pad not yet in tools/.gen-cache, then the files
//   node tools/gen-daily.ts --check 8  makes pads 1..8 again by this same road and compares them with daily.json
// Pads 1 to 60 are src/levels/daily.json and are NEVER touched by this. Each new pad is made exactly as those were:
// the same slot (`dailySlot` in gen-levels.ts: 5 or 6 trucks, 1 or 2 pieces of equipment, par 6 to 8), the same
// search, split into the same shards run by gen-levels.ts's own worker, the best shard kept, the looks dealt from
// the same fixed seeds. Its seed is its place (5000 + pad - 1), so the data is the same whoever runs this.
// NO PAD REPEATS: a pad whose layout is that of a region's level, of a pad of 1 to 60 or of an earlier new pad is
// made again from its next seed (`SEED_STEP` further on), in pad order, so that too comes out the same every time.
// Written to public/daily/pads-<from>-<to>.json in blocks of `DAILY_BLOCK` pads (src/ui/daily-pads.ts fetches the
// one block a day needs; they are not in the game's script).
// REGENERATE BEFORE NOV 2028: after pad 790 (Nov 27, 2028) the pads repeat from pad 61. To add more, raise
// `DAILY_LAST` in src/ui/daily-pads.ts and run this again (earlier pads come from the cache or are made the same).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { isBetter, type Generated } from './generator.ts';
import { SHARD_COUNT, dailySlot, dressDaily, toLevel, type Job, type SlotConfig } from './gen-levels.ts';
import { parseLevel, solve, type Level } from '../src/engine/index.ts';
import { DAILY_BLOCK, DAILY_FIRST_NEW, DAILY_LAST, blockOf, layoutKey } from '../src/ui/daily-pads.ts';

/** A pad's next seed, when its own gave no level in the band or a layout already used. */
export const SEED_STEP = 100_000;
const CACHE = new URL('./.gen-cache/daily/', import.meta.url);
const OUT = new URL('../public/daily/', import.meta.url);
const read = (file: string) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));

/** One slot through gen-levels.ts's own worker, shard by shard; the best shard wins (as `npm run gen-levels` does). */
async function make(slot: SlotConfig, threads: { free: number; wait: (() => void)[] }): Promise<Generated | null> {
  let best: Generated | null = null;
  await Promise.all(Array.from({ length: SHARD_COUNT }, async (_, shard) => {
    while (threads.free <= 0) await new Promise<void>((r) => threads.wait.push(r));
    threads.free--;
    try {
      const g = await new Promise<Generated | null>((resolve, reject) => {
        const w = new Worker(new URL('./gen-levels.ts', import.meta.url), { workerData: { id: slot.name, slot, shard } satisfies Job });
        w.once('message', resolve);
        w.once('error', reject);
      });
      if (g && isBetter(g, best)) best = g;
    } finally {
      threads.free++;
      threads.wait.shift()?.();
    }
  }));
  return best;
}

/** A pad's level for a seed try `k` (0 = its own seed): from the cache, or made and cached. Null: that seed gave none. */
async function padLevel(pad: number, k: number, threads: { free: number; wait: (() => void)[] }): Promise<Level | null> {
  const file = new URL(`pad-${pad}-${k}.json`, CACHE);
  if (existsSync(file)) return (JSON.parse(readFileSync(file, 'utf8')) as { level: Level | null }).level;
  const slot = dailySlot(pad - 1, 5000 + (pad - 1) + k * SEED_STEP);
  const g = await make(slot, threads);
  const level = g ? dressDaily(toLevel(`d${String(pad).padStart(2, '0')}`, slot, g), pad - 1) : null;
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, JSON.stringify({ level }));
  return level;
}

async function main(): Promise<void> {
  const threads = { free: Math.max(1, availableParallelism() - 1), wait: [] as (() => void)[] };
  const check = process.argv.indexOf('--check');
  if (check >= 0) {
    // The proof that this road is the old one: pads 1..n made again come out as the file has them.
    const n = Number(process.argv[check + 1] ?? 4), old = read('../src/levels/daily.json') as Level[];
    let same = 0;
    for (let pad = 1; pad <= n; pad++) {
      const g = await make(dailySlot(pad - 1), threads);
      const level = g && dressDaily(toLevel(`d${String(pad).padStart(2, '0')}`, dailySlot(pad - 1), g), pad - 1);
      const ok = !!level && JSON.stringify({ ...level, muskeg: undefined, racks: undefined }) === JSON.stringify({ ...old[pad - 1], muskeg: undefined, racks: undefined });
      console.log(`pad ${pad}: ${ok ? 'the same as daily.json' : 'DIFFERENT'}`);
      same += ok ? 1 : 0;
    }
    process.exit(same === n ? 0 : 1);
  }

  const used = new Map<string, string>();
  for (const region of ['cardium', 'montney', 'duvernay', 'mannville', 'bakken', 'clearwater']) for (const l of read(`../src/levels/${region}.json`) as Level[]) used.set(layoutKey(l), `${region} ${l.id}`);
  for (const l of read('../src/levels/daily.json') as Level[]) used.set(layoutKey(l), `pad ${l.id}`);

  // Every pad's own seed first, all at once (that is nearly all the work); then, in pad order, the repeats and the misses.
  const started = Date.now();
  const pads = Array.from({ length: DAILY_LAST - DAILY_FIRST_NEW + 1 }, (_, i) => DAILY_FIRST_NEW + i);
  let done = 0;
  const first = await Promise.all(pads.map(async (pad) => { const l = await padLevel(pad, 0, threads); if (++done % 50 === 0) console.log(`${done} of ${pads.length} (${((Date.now() - started) / 1000).toFixed(0)} s)`); return l; }));
  const levels: Level[] = [];
  let again = 0;
  for (const [i, pad] of pads.entries()) {
    let level = first[i], k = 0;
    while (!level || used.has(layoutKey(level))) {
      if (k === 0 || level) console.log(`pad ${pad}: ${level ? `the same layout as ${used.get(layoutKey(level))}` : 'no level in the band'}; its next seed`);
      if (++k > 20) throw new Error(`pad ${pad}: no fresh level in 20 seeds`);
      level = await padLevel(pad, k, threads);
      again++;
    }
    // Proven here as the game will read it: it parses, and the solver's best is its par.
    const parsed = parseLevel(level);
    const best = solve(parsed);
    if (!best || best.length !== level.par) throw new Error(`pad ${pad}: par ${level.par} is not the solver's ${best?.length}`);
    used.set(layoutKey(level), `pad ${pad}`);
    levels.push({ ...level, id: `d${pad}`, name: `Daily Pad #${pad}` });
  }

  mkdirSync(OUT, { recursive: true });
  for (let from = DAILY_FIRST_NEW; from <= DAILY_LAST; from += DAILY_BLOCK) {
    const b = blockOf(from);
    const block = levels.filter((_, i) => pads[i] >= b.from && pads[i] <= b.to).map((l) => ({ id: l.id, name: l.name, par: l.par, trucks: l.trucks, gates: l.gates, obstacles: l.obstacles }));
    writeFileSync(new URL(b.file.replace('daily/', ''), OUT), JSON.stringify(block) + '\n');
  }
  const pars = [6, 7, 8].map((p) => `par ${p}: ${levels.filter((l) => l.par === p).length}`).join(', ');
  console.log(`wrote ${levels.length} pads (${DAILY_FIRST_NEW} to ${DAILY_LAST}) in ${Math.ceil(levels.length / DAILY_BLOCK)} files to public/daily/; ${pars}; ${again} made again from a later seed; ${((Date.now() - started) / 1000).toFixed(0)} s`);
}

await main();
