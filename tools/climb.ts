// Hill-climbs a level of regions 4 and 5 from one already accepted (Jay, Oct 5: random generation
// took hours). One piece is changed at a time (a truck moved along or across, made longer or
// shorter, turned to face the other way, or added; a pumpjack, muskeg cell or rack moved, added or
// removed; a clock moved to another gate). The change is kept if the level is still valid and
// solvable and its par went up (or stayed, so the layout can drift away from its parent). It stops
// when par is inside the window and the level looks different from its parent and the others.
// The solver is capped at MAX_STATES per candidate; anything over the cap is skipped.
//   node tools/climb.ts <job id> <minutes> <out dir>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { COLORS, SolverLimitError, parseLevel, solve } from '../src/engine/index.ts';
import type { Level } from '../src/engine/index.ts';
import { convoyRaisesPar, everyPumpjackInTheWay, mulberry32, slidesIn, withoutShifts } from './generator.ts';

export const MAX_STATES = 2_000_000;
type Raw = { id: string; name: string; par: number; trucks: any[]; gates: any[]; obstacles: any[]; muskeg: any[]; racks: any[] };
type Job = { base: string; region: 'mannville' | 'bakken'; min: number; max: number; prep?: (l: Raw) => Raw; trucks?: number; shifts?: number; plain?: boolean; seed: number };

const stripConvoys = (l: Raw): Raw => ({ ...l, trucks: l.trucks.map(({ convoy: _c, ...t }) => t) });
const keepShifts = (n: number) => (l: Raw): Raw => { let k = 0; return { ...l, gates: l.gates.map(({ shift, ...g }) => (shift && k++ < n ? { ...g, shift: true } : g)) }; };
/** What each open slot starts from and must reach. */
export const JOBS: Record<string, Job> = {
  // Mannville 1: muskeg and nothing else (no equipment, no convoy), at the region's floor.
  n01: { base: 'n02', region: 'mannville', min: 14, max: 14, prep: (l) => ({ ...stripConvoys(l), obstacles: [] }), plain: true, seed: 11 },
  // Bakken 1: load racks, no clock. Bakken 2: one clock.
  k01: { base: 'k03', region: 'bakken', min: 18, max: 18, prep: keepShifts(0), shifts: 0, seed: 21 },
  k02: { base: 'k04', region: 'bakken', min: 18, max: 18, prep: keepShifts(1), shifts: 1, seed: 22 },
  k07: { base: 'k06', region: 'bakken', min: 21, max: 22, seed: 27 },
  k08: { base: 'k05', region: 'bakken', min: 22, max: 23, trucks: 9, seed: 28 },
  k09: { base: 'k06', region: 'bakken', min: 22, max: 23, seed: 29 },
  k10: { base: 'k05', region: 'bakken', min: 23, max: 24, trucks: 9, seed: 30 },
};

const FIXED = new URL('./fixed-levels/', import.meta.url);
export const readFixed = (id: string): Raw => JSON.parse(readFileSync(new URL(`${id}.json`, FIXED), 'utf8'));
const cells = (t: any) => Array.from({ length: t.length }, (_, i) => (t.orient === 'h' ? [t.row, t.col + i] : [t.row + i, t.col]));
/** How many trucks of `a` stand somewhere no truck of `b` stands (same lane, place and length). */
export function differs(a: Raw, b: Raw): number {
  const key = (t: any) => `${t.orient}${t.row},${t.col},${t.length}`;
  const have = new Set(b.trucks.map(key));
  return a.trucks.filter((t) => !have.has(key(t))).length;
}
const clone = (l: Raw): Raw => JSON.parse(JSON.stringify(l));

function mutate(l0: Raw, job: Job, rng: () => number): Raw | null {
  const l = clone(l0);
  const pick = (n: number) => Math.floor(rng() * n);
  const one = <T>(a: T[]) => a[pick(a.length)];
  const gateOf = (t: any) => l.gates.find((g) => g.color === t.color && (t.orient === 'h' ? (g.side === 'left' || g.side === 'right') && g.index === t.row : (g.side === 'top' || g.side === 'bottom') && g.index === t.col));
  const rackOf = (t: any) => l.racks.find((r) => (t.orient === 'h' ? r.row === t.row : r.col === t.col));
  const kinds = ['slide', 'slide', 'slide', 'across', 'across', 'length', 'turn', ...(job.plain ? [] : ['obstacle']), ...(job.region === 'mannville' ? ['muskeg', 'muskeg'] : ['rack', 'rack', ...(job.shifts === 0 ? [] : ['clock'])]), ...(l.trucks.length < 9 && job.trucks ? ['add', 'add'] : [])];
  const kind = one(kinds);
  const t = one(l.trucks);
  if (kind === 'slide') {
    const d = one([-2, -1, 1, 2]);
    if (t.orient === 'h') t.col += d; else t.row += d;
  } else if (kind === 'across') {
    const g = gateOf(t); if (!g) return null;
    const to = pick(6);
    const rack = t.load ? rackOf(t) : null;
    if (t.orient === 'h') { if (rack) rack.row = to; t.row = to; } else { if (rack) rack.col = to; t.col = to; }
    g.index = to;
  } else if (kind === 'length') {
    if (t.load) return null;
    t.length = t.length === 2 ? 3 : 2;
    if (rng() < 0.5) { if (t.orient === 'h') t.col += t.length === 3 ? -1 : 1; else t.row += t.length === 3 ? -1 : 1; }
  } else if (kind === 'turn') {
    const g = gateOf(t); if (!g) return null;
    g.side = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }[g.side as string];
  } else if (kind === 'obstacle') {
    const r = rng();
    if (l.obstacles.length && r < 0.5) Object.assign(one(l.obstacles), { row: pick(6), col: pick(6) });
    else if (l.obstacles.length < 2 && r < 0.8) l.obstacles.push({ row: pick(6), col: pick(6) });
    else if (l.obstacles.length) l.obstacles.splice(pick(l.obstacles.length), 1);
    else return null;
  } else if (kind === 'muskeg') {
    const r = rng();
    if (l.muskeg.length && r < 0.6) Object.assign(one(l.muskeg), { row: pick(6), col: pick(6) });
    else if (l.muskeg.length < 6 && r < 0.85) l.muskeg.push({ row: pick(6), col: pick(6) });
    else if (l.muskeg.length > 2) l.muskeg.splice(pick(l.muskeg.length), 1);
    else return null;
  } else if (kind === 'rack') {
    const tankers = l.trucks.filter((x) => x.load); if (!tankers.length) return null;
    const tk = one(tankers); const rack = rackOf(tk); if (!rack) return null;
    if (tk.orient === 'h') rack.col = pick(6); else rack.row = pick(6);
  } else if (kind === 'clock') {
    const on = l.gates.filter((g) => g.shift), off = l.gates.filter((g) => !g.shift);
    if (!on.length || !off.length) return null;
    delete one(on).shift; one(off).shift = true;
  } else if (kind === 'add') {
    const orient = rng() < 0.5 ? 'h' : 'v'; const length = rng() < 0.6 ? 3 : 2;
    const lane = pick(6), at = pick(7 - length);
    const nt: any = { id: String.fromCharCode(65 + l.trucks.length), color: one([...COLORS]), row: orient === 'h' ? lane : at, col: orient === 'h' ? at : lane, length, orient };
    l.trucks.push(nt);
    l.gates.push({ color: nt.color, side: orient === 'h' ? one(['left', 'right']) : one(['top', 'bottom']), index: lane });
  }
  return l;
}

/** The level's best solution if it is valid and within the cap, else null. */
function prove(raw: Raw, job: Job): { level: Level; par: number } | null {
  let level: Level;
  try { level = parseLevel({ ...raw, par: 1 }); } catch { return null; }
  // Floor cells and equipment are never under a truck at the start, and never share a cell.
  const taken = new Set(level.trucks.flatMap((t) => cells(t).map(String)));
  const floor = [...level.obstacles, ...level.muskeg, ...level.racks].map((c) => `${c.row},${c.col}`);
  if (new Set(floor).size !== floor.length || level.obstacles.some((c) => taken.has(`${c.row},${c.col}`))) return null;
  if (job.region === 'mannville' && !level.muskeg.every((c) => level.trucks.some((t) => (t.orient === 'h' ? t.row === c.row : t.col === c.col)))) return null;
  let moves;
  try { moves = solve(level, MAX_STATES); } catch (e) { if (e instanceof SolverLimitError) return null; throw e; }
  if (!moves) return null;
  return { level, par: moves.length };
}
/** The rules a shipped level of its region must keep (the same ones the level tests hold). */
function sound(level: Level, par: number, job: Job): boolean {
  try {
    const moves = solve(level, MAX_STATES)!;
    if (level.obstacles.length && !everyPumpjackInTheWay(level, moves)) return false;
    if (level.trucks.some((t) => t.convoy) && !convoyRaisesPar(level, par, MAX_STATES)) return false;
    if (job.region === 'mannville') return level.muskeg.length > 0 && slidesIn(level, moves) > 0;
    const shifts = level.gates.filter((g) => g.shift).length;
    if (job.shifts !== undefined ? shifts !== job.shifts : shifts < 1) return false;
    if (shifts && !(solve(withoutShifts(level), MAX_STATES)!.length < par)) return false;
    return level.racks.length === level.trucks.filter((t) => t.load).length;
  } catch { return false; }
}

function main() {
  const [id, minutes, out] = process.argv.slice(2);
  const job = JOBS[id];
  const deadline = Date.now() + +minutes * 60_000;
  const rng = mulberry32(job.seed * 7919);
  const parent = readFixed(job.base);
  const others = ['n02', 'n03', 'n04', 'n05', 'n06', 'n07', 'n08', 'n09', 'n10', 'k03', 'k04', 'k05', 'k06'].filter((x) => x[0] === id[0]).map(readFixed);
  const DIFF = 4;
  mkdirSync(out, { recursive: true });
  let cur = (job.prep ?? ((x) => x))(parent);
  let proved = prove(cur, job);
  if (!proved) throw new Error(`${id}: its starting level is not solvable`);
  let par = proved.par;
  let tried = 0, kept = 0, best: { raw: Raw; par: number; gap: number } | null = null;
  const gapOf = (p: number) => (p < job.min ? job.min - p : p > job.max ? p - job.max : 0);
  const save = (raw: Raw, p: number, done: boolean) => writeFileSync(`${out}/${id}.json`, JSON.stringify({ ...raw, id, par: p, done, tried, kept }));
  console.log(`${id}: from ${job.base} at par ${par}, window ${job.min} to ${job.max}`);
  while (Date.now() < deadline) {
    const next = mutate(cur, job, rng);
    if (!next) continue;
    tried++;
    const p = prove(next, job);
    if (!p || p.par > job.max || p.par < par) continue;
    // Sideways steps let the layout drift away from its parent; a step up must also be sound.
    if (p.par === par && rng() < 0.5) continue;
    if (job.trucks && next.trucks.length < cur.trucks.length) continue;
    if (!sound(p.level, p.par, job)) continue;
    cur = next; par = p.par; kept++;
    const apart = Math.min(...others.map((o) => differs(cur, o))) >= DIFF && (!job.trucks || cur.trucks.length >= job.trucks);
    const gap = gapOf(par) + (apart ? 0 : 0.5);
    if (!best || gap <= best.gap) { best = { raw: clone(cur), par, gap }; save(cur, par, gap === 0); }
    if (kept % 10 === 0 || gap === 0) console.log(`${id}: par ${par} after ${tried} tries, ${kept} kept, ${Math.min(...others.map((o) => differs(cur, o)))} trucks apart`);
    if (gap === 0) break;
  }
  console.log(`${id}: ${best && best.gap === 0 ? 'DONE' : 'TIME UP'} at par ${best?.par ?? par} (${tried} tries)`);
}

if (process.argv[1]?.endsWith('climb.ts')) main();
