// BALDONNEL, region 7 (October upgrade, job U6): ten levels of 6 x 6 with ROAD BAN PATCHES (`soft` cells: a
// 2-cell truck drives over one, a rig cannot enter one).
//   node tools/gen-baldonnel.ts [minutes a slot, default 6]   climbs every slot not yet in tools/fixed-levels/ (run it again for those still open)
//   node tools/gen-baldonnel.ts write                         only writes src/levels/baldonnel.json from them
// LIKE REGIONS 4 AND 5, THESE ARE NOT SEARCHED FOR AT RANDOM AND NOT SEARCHED FOR TWICE: each slot is hill-climbed
// (as tools/climb.ts does) from a hard level the game already has, stripped of its own region's rules, and the
// accepted level is kept in tools/fixed-levels/b01..b10.json. Delete a file there to have its slot climbed again.
// One piece is changed at a time (a truck slid, moved across, made longer or shorter, turned round or added; a
// patch moved, added or taken away; a piece of equipment likewise where the slot allows one), kept if the level
// is still valid and solvable and its par did not fall. A slot is done when:
//   - its par is the slot's own and it has the slot's number of trucks;
//   - THE PATCHES RAISE PAR: without them the level solves in fewer moves;
//   - every patch lies in some rig's lane; on level 1 a pickup drives over one in the best line (the rule is seen);
//   - any equipment is in the way of the best line, any convoy raises par (the older regions' own rules);
//   - it stands at least 3 trucks apart from its parent and from every other slot (4 was asked first: levels 5, 6 and 9 came to 3 and stuck).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { COLORS, SolverLimitError, newGame, parseLevel, solve, tryMove } from '../src/engine/index.ts';
import type { Level, Move } from '../src/engine/index.ts';
import { assignKinds, assignTruckKinds, convoyRaisesPar, everyPumpjackInTheWay, mulberry32 } from './generator.ts';

export const NAMES = ['Spring Breakup', 'Load Limits', 'Half Loads', 'Soft Spot', 'Frost Heave', 'Critical Sour', 'Gravel Haul', 'Scale House', 'Overweight Permit', 'Ban Lifted'];
/** Each slot: its par, its trucks, how much equipment it may have, whether it may keep a convoy, and the level it is climbed from. */
export const SLOTS = [
  { par: 16, trucks: 8, gear: 0, convoy: false, base: 'mannville:n03' },
  { par: 17, trucks: 8, gear: 0, convoy: false, base: 'bakken:k03' },
  { par: 18, trucks: 9, gear: 0, convoy: false, base: 'mannville:n05' },
  { par: 19, trucks: 9, gear: 0, convoy: false, base: 'bakken:k05' },
  { par: 20, trucks: 9, gear: 1, convoy: false, base: 'mannville:n04' },
  { par: 21, trucks: 9, gear: 1, convoy: false, base: 'bakken:k10' },
  { par: 22, trucks: 9, gear: 1, convoy: false, base: 'bakken:k07' },
  { par: 22, trucks: 9, gear: 2, convoy: true, base: 'mannville:n09' },
  { par: 23, trucks: 9, gear: 2, convoy: true, base: 'bakken:k09' },
  { par: 24, trucks: 9, gear: 2, convoy: true, base: 'mannville:n10' },
] as const;
export const HINTS: Record<number, string> = { 0: "Rigs can't cross soft ground. Pickups can." };
const MAX_STATES = 1_500_000, DIFF = 3, KIND_SEED = 7700, TRUCK_KIND_SEED = 7750;

type Raw = { id: string; name: string; par: number; trucks: any[]; gates: any[]; obstacles: any[]; soft: any[] };
const FIXED = new URL('./fixed-levels/', import.meta.url);
const fileOf = (i: number) => new URL(`b${String(i + 1).padStart(2, '0')}.json`, FIXED);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const key = (t: any) => `${t.orient}${t.row},${t.col},${t.length}`;
const differs = (a: Raw, b: Raw) => { const have = new Set(b.trucks.map(key)); return a.trucks.filter((t) => !have.has(key(t))).length; };

/**
 * What a slot is climbed from. `from` 0: its `base`, a hard level the game already has with its own region's rules
 * taken off (each slot a different one, so the ten start well apart). 1: the nearest slot BELOW it already accepted
 * (climbed up a step or two of par). 2: the nearest slot ABOVE it already accepted (let down to its par: the late
 * slots came home first). Where there is no such slot, its base.
 */
const ALT_BASES = ['mannville:n08', 'bakken:k06', 'bakken:k08', 'mannville:n06', 'bakken:k04', 'duvernay:v10', 'mannville:n07', 'duvernay:v09'];
function parent(i: number, from = 0, alt = 0): Raw {
  const near = from === 1 ? Array.from({ length: i }, (_, k) => i - 1 - k) : from === 2 ? Array.from({ length: SLOTS.length - 1 - i }, (_, k) => i + 1 + k) : [];
  const j = near.find((k) => existsSync(fileOf(k)));
  if (j !== undefined) {
    const l = JSON.parse(readFileSync(fileOf(j), 'utf8')) as Raw;
    return { ...l, obstacles: l.obstacles.slice(0, SLOTS[i].gear) };
  }
  // (`alt`: another of the game's hard levels in place of the slot's own base: `node tools/gen-baldonnel.ts 8 bases`
  // races nine different ones for a slot that none of the usual three ways brought home. Level 6 came that way.)
  const [region, id] = (alt ? ALT_BASES[(alt - 1) % ALT_BASES.length] : SLOTS[i].base).split(':');
  const l = (JSON.parse(readFileSync(new URL(`../src/levels/${region}.json`, import.meta.url), 'utf8')) as any[]).find((x) => x.id === id);
  const trucks = l.trucks.map(({ load: _l, kind: _k, convoy: _c, ...t }: any) => t);
  const gates = l.gates.map(({ shift: _s, ...g }: any) => g);
  return { id: 'b', name: 'b', par: 1, trucks, gates, obstacles: [], soft: [] };
}

function mutate(l0: Raw, i: number, rng: () => number): Raw | null {
  const l = clone(l0), slot = SLOTS[i];
  const pick = (n: number) => Math.floor(rng() * n);
  const one = <T>(a: T[]) => a[pick(a.length)];
  const gateOf = (t: any) => l.gates.find((g) => g.color === t.color && (t.orient === 'h' ? (g.side === 'left' || g.side === 'right') && g.index === t.row : (g.side === 'top' || g.side === 'bottom') && g.index === t.col));
  const kinds = ['slide', 'slide', 'slide', 'across', 'across', 'length', 'turn', 'soft', 'soft', 'soft', ...(slot.gear ? ['gear'] : []), ...(l.trucks.length < slot.trucks ? ['add', 'add', 'add'] : [])];
  const kind = one(kinds), t = one(l.trucks);
  if (kind === 'slide') {
    const d = one([-2, -1, 1, 2]);
    if (t.orient === 'h') t.col += d; else t.row += d;
  } else if (kind === 'across') {
    if (t.convoy) return null;
    const g = gateOf(t); if (!g) return null;
    const to = pick(6);
    if (t.orient === 'h') t.row = to; else t.col = to;
    g.index = to;
  } else if (kind === 'length') {
    t.length = t.length === 2 ? 3 : 2;
    if (rng() < 0.5) { if (t.orient === 'h') t.col += t.length === 3 ? -1 : 1; else t.row += t.length === 3 ? -1 : 1; }
  } else if (kind === 'turn') {
    const g = gateOf(t); if (!g) return null;
    g.side = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }[g.side as string];
  } else if (kind === 'soft') {
    const r = rng();
    if (l.soft.length && r < 0.55) Object.assign(one(l.soft), { row: pick(6), col: pick(6) });
    else if (l.soft.length < 5 && r < 0.9) l.soft.push({ row: pick(6), col: pick(6) });
    else if (l.soft.length > 2) l.soft.splice(pick(l.soft.length), 1);
    else return null;
  } else if (kind === 'gear') {
    const r = rng();
    if (l.obstacles.length && r < 0.5) Object.assign(one(l.obstacles), { row: pick(6), col: pick(6) });
    else if (l.obstacles.length < slot.gear && r < 0.8) l.obstacles.push({ row: pick(6), col: pick(6) });
    else if (l.obstacles.length) l.obstacles.splice(pick(l.obstacles.length), 1);
    else return null;
  } else if (kind === 'add') {
    const orient = rng() < 0.5 ? 'h' : 'v', length = rng() < 0.5 ? 3 : 2, lane = pick(6), at = pick(7 - length);
    const nt: any = { id: String.fromCharCode(65 + l.trucks.length), color: one([...COLORS]), row: orient === 'h' ? lane : at, col: orient === 'h' ? at : lane, length, orient };
    l.trucks.push(nt);
    l.gates.push({ color: nt.color, side: orient === 'h' ? one(['left', 'right']) : one(['top', 'bottom']), index: lane });
  }
  return l;
}

/** The level mirrored left to right (`h`) and/or top to bottom (`v`): the same puzzle, another look. */
export function flip(l: Raw, h: boolean, v: boolean): Raw {
  const out = clone(l);
  for (const t of out.trucks) {
    if (h) t.col = t.orient === 'h' ? 6 - t.col - t.length : 5 - t.col;
    if (v) t.row = t.orient === 'v' ? 6 - t.row - t.length : 5 - t.row;
  }
  for (const g of out.gates) {
    const side = g.side as string, across = side === 'left' || side === 'right';
    if (h) { if (across) g.side = side === 'left' ? 'right' : 'left'; else g.index = 5 - g.index; }
    if (v) { if (!across) g.side = side === 'top' ? 'bottom' : 'top'; else g.index = 5 - g.index; }
  }
  for (const c of [...out.obstacles, ...out.soft]) { if (h) c.col = 5 - c.col; if (v) c.row = 5 - c.row; }
  return out;
}

function prove(raw: Raw): { level: Level; moves: Move[] } | null {
  let level: Level;
  try { level = parseLevel({ ...raw, par: 1 }); } catch { return null; }
  // Equipment and patches are never under a truck at the start (a pickup could start on a patch, but a pad that
  // opens with one hidden under a truck reads badly), and a patch is in some rig's lane.
  const taken = new Set(level.trucks.flatMap((t) => Array.from({ length: t.length }, (_, k) => (t.orient === 'h' ? `${t.row},${t.col + k}` : `${t.row + k},${t.col}`))));
  if ([...level.obstacles, ...level.soft].some((c) => taken.has(`${c.row},${c.col}`))) return null;
  if (!level.soft.every((c) => level.trucks.some((t) => t.length === 3 && (t.orient === 'h' ? t.row === c.row : t.col === c.col)))) return null;
  let moves;
  try { moves = solve(level, MAX_STATES); } catch (e) { if (e instanceof SolverLimitError) return null; throw e; }
  return moves ? { level, moves } : null;
}

/** Does a pickup drive over (or stop on) a patch somewhere along the line? */
export function pickupCrossesSoft(level: Level, moves: Move[]): boolean {
  let s = newGame(level);
  for (const m of moves) {
    const t = s.trucks.find((x) => x.id === m.id)!;
    if (t.length === 2) {
      const from = t.orient === 'h' ? t.col : t.row, lo = Math.min(from, from + m.delta), hi = Math.max(from, from + m.delta) + 1;
      if (level.soft.some((c) => (t.orient === 'h' ? c.row === t.row && c.col >= lo && c.col <= hi : c.col === t.col && c.row >= lo && c.row <= hi))) return true;
    }
    s = tryMove(s, m.id, m.delta)!.state;
  }
  return false;
}
/** The level with its patches taken away. */
export const withoutSoft = (level: Level): Level => ({ ...level, soft: [] });

/** How many of the slot's rules a level at par keeps (4 = all of them), and the first it breaks. */
function soundness(level: Level, moves: Move[], i: number): { score: number; why: string } {
  try {
    let score = 0, why = '';
    const miss = (w: string) => { if (!why) why = w; };
    const plain = level.soft.length >= 2 ? solve(withoutSoft(level), MAX_STATES) : null;
    if (plain && plain.length < moves.length) score++; else miss('the patches do not raise par');
    // (Level 1 teaches the rule, so there a pickup must be seen to drive over a patch in the best line. Later levels
    // need not: asked of all of them, no slot after the first came home in its minutes.)
    if (i > 0 || pickupCrossesSoft(level, moves)) score++; else miss('no pickup drives over a patch');
    if (level.obstacles.length <= SLOTS[i].gear && (!level.obstacles.length || everyPumpjackInTheWay(level, moves))) score++; else miss('equipment not in the way');
    if (!level.trucks.some((t) => t.convoy) || convoyRaisesPar(level, moves.length, MAX_STATES)) score++; else miss('the convoy does not raise par');
    return { score, why };
  } catch { return { score: 0, why: 'over the solver cap' }; }
}

function climb(i: number, minutes: number, others: Raw[], seed: number, from = 0, alt = 0): { raw: Raw | null; best: number; why: string } {
  const slot = SLOTS[i], rng = mulberry32(seed), deadline = Date.now() + minutes * 60_000, start = parent(i, from, alt);
  const fresh = (): { raw: Raw; par: number } | null => { const p = prove(start); return p ? { raw: start, par: p.moves.length } : null; };
  let cur = fresh();
  if (!cur) return { raw: null, best: 0, why: 'the parent does not solve' };
  let stale = 0, best = cur.par, why = 'par never reached', curSound = 0, curApart = 0;
  while (Date.now() < deadline) {
    // (Now and then two changes at once: at a high par one change alone seldom keeps the par, and the level could
    // not walk away from its parent.)
    let next = mutate(cur.raw, i, rng);
    if (next && rng() < 0.35) next = mutate(next, i, rng);
    if (!next) continue;
    const p = prove(next);
    // Toward the slot's par and never away from it: up from below, or (from a parent above it) down.
    const off = !p || (cur.par <= slot.par ? p.moves.length < cur.par || p.moves.length > slot.par : p.moves.length > cur.par || p.moves.length < slot.par);
    if (off) { if (++stale > 8000) { cur = fresh()!; curSound = 0; curApart = 0; stale = 0; } continue; }
    const par = p.moves.length;
    // At the slot's par the level must also keep the slot's rules: a change that keeps fewer of them is not taken.
    const snd = par === slot.par ? soundness(p.level, p.moves, i) : { score: 0, why: '' };
    // ...and once it keeps them all, it must still walk away from its parent and the other slots: a change that
    // brings it nearer to one of them is not taken either.
    const apart = snd.score === 4 ? Math.min(differs(next, start), ...others.map((o) => differs(next, o))) : 0;
    if (par === cur.par && (snd.score < curSound || (snd.score === curSound && apart < curApart))) { stale++; continue; }
    if (par !== cur.par || snd.score > curSound || apart > curApart) stale = 0;
    cur = { raw: next, par };
    curSound = snd.score;
    curApart = apart;
    best = Math.max(best, par);
    if (par !== slot.par) continue;
    if (snd.score < 4) { why = `at par: ${snd.why}`; continue; }
    if (next.trucks.length !== slot.trucks) { why = 'at par and sound, not yet the trucks'; continue; }
    if (apart < DIFF) {
      // A LEVEL TURNED OVER IS THE SAME PUZZLE AND LOOKS LIKE ANOTHER PAD: where a slot will not walk further than 2
      // trucks from its neighbour (level 6 would not, in half an hour of trying), it is kept MIRRORED (left to
      // right, top to bottom, or both), if that stands apart from every other slot as it must.
      const turned = apart >= 2 ? [flip(next, true, false), flip(next, false, true), flip(next, true, true)].find((t) => Math.min(differs(t, start), ...others.map((o) => differs(t, o))) >= DIFF && !!prove(t)) : undefined;
      if (turned) return { raw: turned, best, why: '' };
      why = `at par and sound, ${apart} trucks from another (it wants ${DIFF})`;
      continue;
    }
    return { raw: next, best, why: '' };
  }
  return { raw: null, best, why };
}

function write(): void {
  const levels = SLOTS.map((slot, i) => {
    const raw = JSON.parse(readFileSync(fileOf(i), 'utf8')) as Raw;
    const id = `b${String(i + 1).padStart(2, '0')}`;
    const proved = parseLevel({ ...raw, id, name: NAMES[i], par: 1 });
    const par = solve(proved)!.length;
    if (par !== slot.par) throw new Error(`${id}: par ${par}, not the slot's ${slot.par}`);
    const trucks = assignTruckKinds(proved.trucks, TRUCK_KIND_SEED + i), obstacles = assignKinds(proved.obstacles, KIND_SEED + i);
    return { id, name: NAMES[i], par, ...(HINTS[i] ? { hint: HINTS[i] } : {}), trucks, gates: proved.gates, obstacles, soft: proved.soft };
  });
  const line = (o: unknown) => JSON.stringify(o).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{/, '{ ').replace(/\}$/, ' }');
  const text = levels.map((l) => {
    const { trucks, gates, obstacles, soft, ...head } = l;
    const list = (xs: unknown[]) => (xs.length ? `[\n${xs.map((x) => `      ${line(x)}`).join(',\n')}\n    ]` : '[]');
    return `  {\n    ${JSON.stringify(head).slice(1, -1).replace(/":/g, '": ').replace(/,"/g, ', "')},\n    "trucks": ${list(trucks)},\n    "gates": ${list(gates)},\n    "obstacles": ${list(obstacles)},\n    "soft": [${soft.map((c) => JSON.stringify(c)).join(', ')}]\n  }`;
  }).join(',\n');
  writeFileSync(new URL('../src/levels/baldonnel.json', import.meta.url), `[\n${text}\n]\n`);
  for (const l of levels) {
    const lv = parseLevel(l), plain = solve(withoutSoft(lv))!.length;
    console.log(`${l.id} ${l.name.padEnd(18)} par ${l.par}  ${l.trucks.length} trucks (${l.trucks.filter((t) => t.length === 3).length} rigs)  ${l.soft.length} patches (par ${plain} without)  ${l.obstacles.length} equipment  ${l.trucks.some((t) => t.convoy) ? 'convoy' : ''}`);
  }
  console.log('wrote src/levels/baldonnel.json');
}

async function main(): Promise<void> {
  if (process.argv[2] !== 'write') {
    const minutes = Number(process.argv[2] ?? 6);
    // In order of slot, so each can be held apart from those before it; a few slots at a time.
    // (Each is held apart from every slot already accepted, whichever side of it they lie.)
    const done: Raw[] = SLOTS.map((_, k) => k).filter((k) => existsSync(fileOf(k))).map((k) => JSON.parse(readFileSync(fileOf(k), 'utf8')));
    for (let i = 0; i < SLOTS.length; i++) {
      if (existsSync(fileOf(i))) continue;
      // Several seeds race for the slot; the first to come home wins.
      const RACE = 9;
      const notes: string[] = [];
      const got = await new Promise<Raw | null>((resolve) => {
        let left = RACE; const ws: Worker[] = [];
        for (let k = 0; k < RACE; k++) {
          const w = new Worker(new URL(import.meta.url), { workerData: { i, minutes, others: done, seed: 7000 + i * 131 + k * 17, ...(process.argv.includes('bases') ? { from: 0, alt: k } : { from: k % 3, alt: 0 }) } });
          ws.push(w);
          w.on('message', (m: { raw: Raw | null; best: number; why: string }) => { if (m.raw) { ws.forEach((x) => void x.terminate()); resolve(m.raw); } else { notes.push(`${m.best} ${m.why}`); if (--left === 0) resolve(null); } });
        }
      });
      if (!got) { console.log(`slot ${i + 1} (${NAMES[i]}, par ${SLOTS[i].par}): NOT FOUND in ${minutes} min (best par and why, by seed: ${notes.join('; ')})`); continue; }
      writeFileSync(fileOf(i), JSON.stringify(got) + '\n');
      done.push(got);
      console.log(`slot ${i + 1} (${NAMES[i]}): par ${SLOTS[i].par}, ${got.trucks.length} trucks, ${got.soft.length} patches, ${got.obstacles.length} equipment`);
    }
  }
  if (SLOTS.every((_, i) => existsSync(fileOf(i)))) write();
}

if (!isMainThread && workerData?.minutes !== undefined) parentPort!.postMessage(climb(workerData.i, workerData.minutes, workerData.others, workerData.seed, workerData.from, workerData.alt));
else if (isMainThread && process.argv[1]?.endsWith('gen-baldonnel.ts')) await main();
