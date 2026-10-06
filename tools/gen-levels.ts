// Generates src/levels/<region>.json. Never hand-edit those files: tune the slots below and rerun.
//   npm run gen-levels              all slots (finished slots come from tools/.gen-cache if unchanged)
//   npm run gen-levels -- m07 m08   force these slots to regenerate
// Each slot's search is split into SHARDS independent seeds that run in parallel; the best wins.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { assignKinds, assignTruckKinds, generate, isBetter, type Generated, type SearchOptions, type Slot } from './generator.ts';
import type { Level } from '../src/engine/index.ts';

interface SlotConfig extends Slot {
  name: string;
  hint?: string;
  seed: number;
  search?: Partial<SearchOptions>;
}

interface RegionConfig {
  /** Not shipped yet: its file is not written and none of its slots are generated. */
  held?: boolean;
  id: string;
  prefix: string;
  /** Fixed seed for the cosmetic obstacle looks (pumpjack, tank, wellhead). Layouts don't use it. */
  kindSeed: number;
  /** Fixed seed for the cosmetic vehicle types. Layouts don't use it. */
  truckKindSeed: number;
  slots: SlotConfig[];
}

const SHARDS = 5;
const SEARCH: SearchOptions = { restarts: 40, iters: 500, maxStates: 40_000 };
// Late slots need longer climbs to reach high par.
const LATE: Partial<SearchOptions> = { restarts: 60, iters: 1200, maxStates: 60_000 };

// Regions 4 and 5: par 14 to 24 takes long climbs and a big solver budget (the fast solver makes them affordable).
const HARD: Partial<SearchOptions> = { restarts: 40, iters: 3000, maxStates: 250_000 };

// Difficulty ramps by par and truck count. `minExtra` = forced "make room" moves beyond one per truck.
// Daily Pads: 60 medium levels with mixed obstacles, cheaper search than the hand-tuned ramps.
const DAILY: Partial<SearchOptions> = { restarts: 15, iters: 400, maxStates: 30_000 };
const DAILY_SLOTS: SlotConfig[] = Array.from({ length: 60 }, (_, i) => ({
  name: `Daily Pad #${i + 1}`,
  trucks: i % 2 ? 6 : 5,
  pumpjacks: i % 2 ? 2 : 1,
  minPar: 6,
  maxPar: 8,
  minExtra: 1,
  decoys: 1,
  seed: 5000 + i,
  search: DAILY,
}));

/**
 * The flare stack is an alternate look for some fixed obstacles: in Montney and Duvernay, every
 * second level that has a tank shows its first tank as a flare stack. Cosmetic only: the cell, the
 * layout, par and the solver are untouched (the engine never reads `kind`).
 */
function withFlares<T extends { kind?: string }>(obstacles: T[], regionId: string, index: number): T[] {
  if ((regionId !== 'montney' && regionId !== 'duvernay') || index % 2 === 0) return obstacles;
  const tank = obstacles.findIndex((o) => o.kind === 'tank');
  return tank < 0 ? obstacles : obstacles.map((o, k) => (k === tank ? { ...o, kind: 'flare' } : o));
}

const REGIONS: RegionConfig[] = [
  {
    id: 'cardium',
    prefix: 'c',
    kindSeed: 1000,
    truckKindSeed: 3000,
    slots: [
      { name: 'Spud In', trucks: 2, pumpjacks: 0, minPar: 2, maxPar: 2, minExtra: 0, decoys: 0, seed: 101,
        hint: 'Drag a truck along its length. It drives out through the gate with its color and symbol.' },
      { name: 'Kick Off', trucks: 3, pumpjacks: 0, minPar: 3, maxPar: 3, minExtra: 0, decoys: 1, seed: 102,
        hint: 'A gate of the wrong color stays shut, like the berm.' },
      { name: 'Snub In', trucks: 4, pumpjacks: 0, minPar: 4, maxPar: 4, minExtra: 0, decoys: 1, seed: 103 },
      { name: 'Back Off', trucks: 4, pumpjacks: 0, minPar: 5, maxPar: 5, minExtra: 1, decoys: 1, seed: 104,
        hint: 'Sometimes a truck has to back away from its gate to let another one through.' },
      { name: 'Tight Hole', trucks: 5, pumpjacks: 0, minPar: 6, maxPar: 6, minExtra: 1, decoys: 1, seed: 105 },
      { name: 'Packers', trucks: 5, pumpjacks: 0, minPar: 7, maxPar: 7, minExtra: 2, decoys: 2, seed: 106 },
      { name: 'Pressure Test', trucks: 6, pumpjacks: 0, minPar: 8, maxPar: 8, minExtra: 2, decoys: 2, seed: 107 },
      { name: 'Frac Plug', trucks: 6, pumpjacks: 0, minPar: 9, maxPar: 9, minExtra: 3, decoys: 2, seed: 108 },
      { name: 'Cluster Spacing', trucks: 7, pumpjacks: 0, minPar: 10, maxPar: 10, minExtra: 3, decoys: 2, seed: 109, search: LATE },
      { name: 'Material Transfer', trucks: 8, pumpjacks: 0, minPar: 11, maxPar: 12, minExtra: 3, decoys: 2, seed: 110, search: LATE },
    ],
  },
  {
    id: 'montney',
    prefix: 'm',
    kindSeed: 2000,
    truckKindSeed: 4000,
    slots: [
      { name: 'Nodding Donkey', trucks: 3, pumpjacks: 1, minPar: 3, maxPar: 4, minExtra: 0, decoys: 0, seed: 201,
        hint: 'Pumpjacks, tanks and wellheads never move. Drive around them.' },
      { name: 'Horsehead Hill', trucks: 4, pumpjacks: 1, minPar: 5, maxPar: 5, minExtra: 1, decoys: 1, seed: 202 },
      { name: 'Dog Leg', trucks: 5, pumpjacks: 1, minPar: 6, maxPar: 6, minExtra: 1, decoys: 1, seed: 203 },
      { name: 'Choke Point', trucks: 5, pumpjacks: 2, minPar: 7, maxPar: 7, minExtra: 2, decoys: 1, seed: 204 },
      { name: 'Stuck Pipe', trucks: 6, pumpjacks: 2, minPar: 8, maxPar: 8, minExtra: 2, decoys: 2, seed: 205 },
      { name: 'Line Pack', trucks: 6, pumpjacks: 2, minPar: 9, maxPar: 9, minExtra: 3, decoys: 2, seed: 206 },
      { name: 'Flare Up', trucks: 7, pumpjacks: 2, minPar: 10, maxPar: 10, minExtra: 3, decoys: 2, seed: 207, search: LATE },
      { name: 'Fishing Job', trucks: 7, pumpjacks: 3, minPar: 11, maxPar: 11, minExtra: 4, decoys: 2, seed: 208, search: LATE },
      { name: 'Pinch Point', trucks: 8, pumpjacks: 3, minPar: 12, maxPar: 12, minExtra: 4, decoys: 2, seed: 209, search: LATE },
      { name: 'Bottoms Up', trucks: 8, pumpjacks: 3, minPar: 13, maxPar: 14, minExtra: 5, decoys: 2, seed: 210, search: LATE },
    ],
  },
  {
    id: 'duvernay',
    prefix: 'v',
    kindSeed: 8000,
    truckKindSeed: 9000,
    // Each par window starts where the previous one ends, so par can only ramp up.
    slots: [
      { name: 'Tailgate Meeting', trucks: 4, pumpjacks: 0, convoys: 1, minPar: 5, maxPar: 6, minExtra: 1, decoys: 0, seed: 301,
        hint: 'Convoys leave in order. Number 1 first.' },
      { name: 'Rig Up', trucks: 4, pumpjacks: 1, convoys: 1, minPar: 6, maxPar: 7, minExtra: 1, decoys: 1, seed: 302 },
      { name: 'Zipper Frac', trucks: 5, pumpjacks: 0, convoys: 1, minPar: 7, maxPar: 8, minExtra: 2, decoys: 1, seed: 303 },
      { name: 'Hot Shot', trucks: 5, pumpjacks: 1, convoys: 1, minPar: 8, maxPar: 9, minExtra: 2, decoys: 1, seed: 304 },
      { name: 'Shut In', trucks: 6, pumpjacks: 0, convoys: 1, minPar: 9, maxPar: 10, minExtra: 3, decoys: 2, seed: 305, search: LATE },
      { name: 'Trip Out', trucks: 6, pumpjacks: 1, convoys: 1, minPar: 10, maxPar: 11, minExtra: 3, decoys: 2, seed: 306, search: LATE },
      { name: 'Lost Circulation', trucks: 7, pumpjacks: 1, convoys: 1, minPar: 11, maxPar: 12, minExtra: 3, decoys: 2, seed: 307, search: LATE },
      { name: 'Sweet Spot', trucks: 7, pumpjacks: 2, convoys: 1, minPar: 12, maxPar: 13, minExtra: 4, decoys: 2, seed: 308, search: LATE },
      { name: 'Flowback', trucks: 8, pumpjacks: 1, convoys: 2, minPar: 13, maxPar: 14, minExtra: 4, decoys: 2, seed: 309, search: LATE },
      { name: 'Rig Down', trucks: 8, pumpjacks: 2, convoys: 2, minPar: 14, maxPar: 15, minExtra: 5, decoys: 2, seed: 310, search: LATE },
    ],
  },
  {
    // Region 4: MUSKEG (a truck that drives onto it slides until it hits something), on top of
    // everything before it. EVERY level is par 14 to 20 (Jay, Oct 5: nothing below the floor, the
    // first level included). Level 1 has muskeg and nothing else new: no equipment, no convoy.
    id: 'mannville',
    prefix: 'n',
    kindSeed: 10000,
    truckKindSeed: 11000,
    slots: [
      { name: 'Muskeg', trucks: 8, pumpjacks: 0, muskeg: 4, long: 2, minPar: 14, maxPar: 14, minExtra: 4, decoys: 0, seed: 401, search: HARD,
        hint: 'Muskeg! A truck that drives onto it keeps sliding until it hits something.' },
      { name: 'Soft Ground', trucks: 8, pumpjacks: 0, convoys: 1, muskeg: 3, long: 2, minPar: 14, maxPar: 14, minExtra: 4, decoys: 1, seed: 402, search: HARD },
      { name: 'Corduroy Road', trucks: 8, pumpjacks: 1, convoys: 1, muskeg: 3, long: 2, minPar: 14, maxPar: 15, minExtra: 4, decoys: 2, seed: 403, search: HARD },
      { name: 'Rig Mats', trucks: 8, pumpjacks: 1, convoys: 2, muskeg: 3, long: 2, minPar: 15, maxPar: 16, minExtra: 5, decoys: 2, seed: 404, search: HARD },
      { name: 'Winch Line', trucks: 8, pumpjacks: 1, convoys: 2, muskeg: 4, long: 2, minPar: 16, maxPar: 17, minExtra: 5, decoys: 2, seed: 405, search: HARD },
      { name: 'Sump', trucks: 9, pumpjacks: 1, convoys: 2, muskeg: 4, long: 2, minPar: 17, maxPar: 18, minExtra: 6, decoys: 2, seed: 406, search: HARD },
      { name: 'Bogged Down', trucks: 9, pumpjacks: 1, convoys: 2, muskeg: 4, long: 2, minPar: 18, maxPar: 18, minExtra: 6, decoys: 2, seed: 407, search: HARD },
      { name: 'Cat Train', trucks: 9, pumpjacks: 1, convoys: 2, muskeg: 4, long: 2, minPar: 18, maxPar: 19, minExtra: 6, decoys: 2, seed: 408, search: HARD },
      { name: 'Freeze Up', trucks: 9, pumpjacks: 2, convoys: 2, muskeg: 4, long: 2, minPar: 19, maxPar: 20, minExtra: 7, decoys: 2, seed: 409, search: HARD },
      { name: 'Road Ban', trucks: 9, pumpjacks: 2, convoys: 2, muskeg: 5, long: 2, minPar: 20, maxPar: 20, minExtra: 7, decoys: 2, seed: 410, search: HARD },
    ],
  },
  {
    // Region 5: LOAD RACKS (a tanker must stop on one before its gate takes it) and SHIFT-CHANGE
    // gates (open only on even moves). EVERY level is par 18 to 24 (nothing below the floor).
    // Level 1 has racks and no clock gate; level 2 brings in one clock gate.
    id: 'bakken',
    prefix: 'k',
    // HELD (Jay, Oct 5): Bakken waits for a second pass; Mannville shipped first.
    held: true,
    kindSeed: 12000,
    truckKindSeed: 13000,
    slots: [
      { name: 'Load Rack', trucks: 8, pumpjacks: 0, tankers: 4, convoys: 1, long: 2, minPar: 18, maxPar: 18, minExtra: 6, decoys: 0, seed: 501, search: HARD,
        hint: 'A tanker loads first. Stop it on the load rack, then its gate will open.' },
      { name: 'Shift Change', trucks: 8, pumpjacks: 0, tankers: 3, shifts: 1, convoys: 1, long: 2, minPar: 18, maxPar: 18, minExtra: 6, decoys: 0, seed: 502, search: HARD,
        hint: 'A gate with a clock opens only on even moves: your 2nd, 4th, 6th...' },
      { name: 'Unit Train', trucks: 8, pumpjacks: 0, tankers: 3, shifts: 2, convoys: 1, long: 2, minPar: 18, maxPar: 18, minExtra: 6, decoys: 1, seed: 503, search: HARD },
      { name: 'Custody Transfer', trucks: 8, pumpjacks: 0, tankers: 3, shifts: 2, convoys: 1, long: 2, minPar: 18, maxPar: 19, minExtra: 6, decoys: 1, seed: 504, search: HARD },
      { name: 'Double Shift', trucks: 8, pumpjacks: 1, tankers: 3, shifts: 3, convoys: 1, long: 2, minPar: 19, maxPar: 20, minExtra: 7, decoys: 2, seed: 505, search: HARD },
      { name: 'Tank Battery', trucks: 9, pumpjacks: 1, tankers: 3, shifts: 3, convoys: 1, long: 2, minPar: 20, maxPar: 21, minExtra: 7, decoys: 2, seed: 506, search: HARD },
      { name: 'Hours of Service', trucks: 9, pumpjacks: 1, tankers: 4, shifts: 3, convoys: 1, long: 2, minPar: 21, maxPar: 22, minExtra: 8, decoys: 2, seed: 507, search: HARD },
      { name: 'Pipeline Spec', trucks: 9, pumpjacks: 1, tankers: 4, shifts: 3, convoys: 1, long: 2, minPar: 22, maxPar: 22, minExtra: 8, decoys: 2, seed: 508, search: HARD },
      { name: 'Night Hauler', trucks: 9, pumpjacks: 1, tankers: 4, shifts: 3, convoys: 2, long: 2, minPar: 22, maxPar: 23, minExtra: 8, decoys: 2, seed: 509, search: HARD },
      { name: 'Last Load', trucks: 9, pumpjacks: 1, tankers: 4, shifts: 4, convoys: 2, long: 2, minPar: 23, maxPar: 24, minExtra: 9, decoys: 2, seed: 510, search: HARD },
    ],
  },
  {
    id: 'daily',
    prefix: 'd',
    kindSeed: 6000,
    truckKindSeed: 7000,
    slots: DAILY_SLOTS,
  },
];

/**
 * On a level with tankers that load, a tank truck IS a tanker: the trucks that must load are the
 * water hauler and the vac truck (alternating), and every other 3-cell truck there is a frac unit,
 * so nothing that looks like a tanker can drive out unloaded. Cosmetic only.
 */
function tankerKinds<T extends { length: number; load?: true; kind?: string }>(trucks: T[]): T[] {
  if (!trucks.some((t) => t.load)) return trucks;
  let n = 0;
  return trucks.map((t) => (t.length !== 3 ? t : { ...t, kind: t.load ? (n++ % 2 ? 'vac' : 'water') : 'frac' }));
}

interface Job {
  id: string;
  slot: SlotConfig;
  shard: number;
}

const CACHE = new URL('./.gen-cache/', import.meta.url);

/** Anything that changes the search changes the key, so tuned slots regenerate. */
function cacheKey(slot: SlotConfig): string {
  const { name: _name, hint: _hint, ...rest } = slot;
  return JSON.stringify({ ...rest, search: { ...SEARCH, ...slot.search }, shards: SHARDS });
}

function readCache(id: string, slot: SlotConfig): Level | null {
  const file = new URL(`${id}.json`, CACHE);
  if (!existsSync(file)) return null;
  const entry = JSON.parse(readFileSync(file, 'utf8')) as { key: string; level: Level };
  return entry.key === cacheKey(slot) ? entry.level : null;
}

function readFixed(id: string): Level | null {
  const file = new URL(`./fixed-levels/${id}.json`, import.meta.url);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Level) : null;
}

function writeCache(id: string, slot: SlotConfig, level: Level): void {
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(new URL(`${id}.json`, CACHE), JSON.stringify({ key: cacheKey(slot), level }));
}

function runJob({ slot, shard }: Job): Generated | null {
  const search = { ...SEARCH, ...slot.search };
  const restarts = Math.ceil(search.restarts / SHARDS);
  return generate(slot, slot.seed * 100 + shard, { ...search, restarts });
}

function toLevel(id: string, slot: SlotConfig, g: Generated): Level {
  return {
    id,
    name: slot.name,
    par: g.par,
    ...(slot.hint ? { hint: slot.hint } : {}),
    trucks: g.level.trucks,
    gates: g.level.gates,
    obstacles: g.level.obstacles,
    muskeg: g.level.muskeg,
    racks: g.level.racks,
  };
}

/** One truck, gate or pumpjack per line keeps diffs readable. */
function format(levels: Level[]): string {
  const list = (items: object[]) => items.map((x) => `      ${JSON.stringify(x)}`).join(',\n');
  const one = (l: Level) =>
    [
      '  {',
      `    "id": ${JSON.stringify(l.id)}, "name": ${JSON.stringify(l.name)}, "par": ${l.par},`,
      ...(l.hint ? [`    "hint": ${JSON.stringify(l.hint)},`] : []),
      `    "trucks": [\n${list(l.trucks)}\n    ],`,
      `    "gates": [\n${list(l.gates)}\n    ],`,
      (l.obstacles.length ? `    "obstacles": [\n${list(l.obstacles)}\n    ]` : '    "obstacles": []') + (l.muskeg.length || l.racks.length ? ',' : ''),
      ...(l.muskeg.length ? [`    "muskeg": [${l.muskeg.map((c) => JSON.stringify(c)).join(', ')}]${l.racks.length ? ',' : ''}`] : []),
      ...(l.racks.length ? [`    "racks": [${l.racks.map((c) => JSON.stringify(c)).join(', ')}]`] : []),
      '  }',
    ].join('\n');
  return `[\n${levels.map(one).join(',\n')}\n]\n`;
}

async function main() {
  const force = new Set(process.argv.slice(2));
  const all = REGIONS.filter((r) => !r.held).flatMap((r) =>
    r.slots.map((slot, i) => ({ id: `${r.prefix}${String(i + 1).padStart(2, '0')}`, slot })),
  );

  const results = new Map<string, Level | null>();
  const todo = all.filter(({ id, slot }) => {
    // Regions 4 and 5 are not searched for at random any more (it took hours): their levels are
    // the accepted ones and the hill-climbed ones in tools/fixed-levels (tools/climb.ts).
    const cached = readFixed(id) ?? (force.has(id) ? null : readCache(id, slot));
    if (cached) results.set(id, { ...cached, muskeg: cached.muskeg ?? [], racks: cached.racks ?? [], name: slot.name, ...(slot.hint ? { hint: slot.hint } : {}) });
    return !cached;
  });
  console.log(`${all.length - todo.length} slots cached, generating ${todo.length}`);

  const best = new Map<string, Generated | null>();
  const pending = new Map(todo.map(({ id }) => [id, SHARDS]));
  const started = Date.now();
  const queue: Job[] = todo.flatMap(({ id, slot }) => Array.from({ length: SHARDS }, (_, shard) => ({ id, slot, shard })));
  const threads = Math.min(availableParallelism(), queue.length);
  await Promise.all(
    Array.from({ length: threads }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const g = await new Promise<Generated | null>((resolve, reject) => {
          const w = new Worker(new URL(import.meta.url), { workerData: job });
          w.once('message', resolve);
          w.once('error', reject);
        });
        const prev = best.get(job.id) ?? null;
        if (g && isBetter(g, prev)) best.set(job.id, g);
        const left = pending.get(job.id)! - 1;
        pending.set(job.id, left);
        if (left > 0) continue;
        const winner = best.get(job.id);
        const secs = ((Date.now() - started) / 1000).toFixed(0);
        if (!winner) {
          results.set(job.id, null);
          console.log(`${job.id} ${job.slot.name}: NO LEVEL FOUND (${secs}s)`);
          continue;
        }
        const level = toLevel(job.id, job.slot, winner);
        writeCache(job.id, job.slot, level);
        results.set(job.id, level);
        console.log(`${job.id} ${job.slot.name}: par ${level.par}, ${level.trucks.length} trucks, ${level.obstacles.length} pumpjacks, ${level.muskeg.length} muskeg, ${level.racks.length} racks, ${level.gates.filter((g) => g.shift).length} shift gates (${secs}s)`);
      }
    }),
  );

  let failed = false;
  for (const region of REGIONS.filter((r) => !r.held)) {
    const levels = region.slots.map((_, i) => {
      const level = results.get(`${region.prefix}${String(i + 1).padStart(2, '0')}`);
      if (!level) return level;
      return { ...level, trucks: tankerKinds(assignTruckKinds(level.trucks, region.truckKindSeed + i)), obstacles: withFlares(assignKinds(level.obstacles, region.kindSeed + i), region.id, i) };
    });
    if (levels.some((l) => !l)) {
      failed = true;
      console.error(`${region.id}: some slots have no level; loosen those slots and rerun. File not written.`);
      continue;
    }
    writeFileSync(new URL(`../src/levels/${region.id}.json`, import.meta.url), format(levels as Level[]));
    console.log(`wrote src/levels/${region.id}.json`);
  }
  process.exit(failed ? 1 : 0);
}

if (isMainThread) await main();
else parentPort!.postMessage(runJob(workerData as Job));
