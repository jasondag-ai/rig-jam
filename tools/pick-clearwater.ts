// Clearwater (region 6, the Big Pad: 8 x 8): the ten levels, picked from levels/bigpad-candidates.json
// so that the field RAMPS SMOOTHLY: par rises by a move or so a level, the truck count never drops
// (16 at most: Jay), and the extra moves (par minus trucks) go 6 to 8 on levels 1 to 3, 9 to 11 on
// 4 to 6, 12 to 15 on 7 to 10.
//   node tools/pick-clearwater.ts        writes src/levels/clearwater.json and prints the ten
// Every pick is proved again here (A*) and its hint path played through the game's own rules.
import { readFileSync, writeFileSync } from 'node:fs';
import { TRUCK_KINDS, isWon, newGame, parseLevel, searchAStar, tryMove } from '../src/engine/index.ts';
import { mulberry32 } from '../src/engine/rng.ts';
import type { Candidate } from './gen-bigpad.ts';

/** The candidates, in level order, and Jay's names. */
export const PICKS: [string, string][] = [
  ['bp30', 'Rig Mats'],
  ['bp28', 'Rig Move'],
  ['bp25', 'Set Surface'],
  ['bp23', 'Walking Rig'],
  ['bp21', 'Batch Drilling'],
  ['bp36', 'Sim Ops'],
  ['bp34', 'Plug and Perf'],
  ['bp33', 'Drill Out'],
  ['bp32', 'Sand Haul'],
  ['bp31', 'Road Ban'],
];
/** Extra moves each level must have (levels 1 to 3, 4 to 6, 7 to 10). */
export const BANDS: [number, number][] = [[6, 8], [6, 8], [6, 8], [9, 11], [9, 11], [9, 11], [12, 15], [12, 15], [12, 15], [12, 15]];
export const MOST_TRUCKS = 16;
const KIND_SEED = 606;

const file = JSON.parse(readFileSync(new URL('../levels/bigpad-candidates.json', import.meta.url), 'utf8')) as { candidates: Candidate[] };
const rng = mulberry32(KIND_SEED);
const levels = PICKS.map(([from, name], i) => {
  const c = file.candidates.find((x) => x.id === from);
  if (!c) throw new Error(`no candidate ${from}`);
  const id = `w${String(i + 1).padStart(2, '0')}`;
  // What each truck looks like (cosmetic; by its length), dealt from a fixed seed.
  const trucks = c.level.trucks.map((t) => ({ ...t, kind: TRUCK_KINDS[t.length][Math.floor(rng() * TRUCK_KINDS[t.length].length)] }));
  const raw = { id, name, par: c.par, size: 8, ...(i === 0 ? { hint: 'A bigger pad: 8 by 8. Same rules. Each truck leaves by the gate of its color in its own lane.' } : {}), trucks, gates: c.level.gates };
  const level = parseLevel(raw);
  const proved = searchAStar(level, 4_000_000).moves;
  if (proved?.length !== c.par) throw new Error(`${id}: A* says ${proved?.length}, the candidate says ${c.par}`);
  let s = newGame(level);
  for (const m of c.hintPath) s = tryMove(s, m.id, m.delta)!.state;
  if (!isWon(s)) throw new Error(`${id}: its hint path does not clear the pad`);
  const extra = c.par - trucks.length, [lo, hi] = BANDS[i];
  if (extra < lo || extra > hi) throw new Error(`${id}: ${extra} extra moves, wanted ${lo} to ${hi}`);
  if (trucks.length > MOST_TRUCKS) throw new Error(`${id}: ${trucks.length} trucks`);
  return raw;
});
for (let i = 1; i < levels.length; i++) if (levels[i].par < levels[i - 1].par || levels[i].trucks.length < levels[i - 1].trucks.length) throw new Error(`${levels[i].id}: the ramp drops`);
// One truck or gate a line, like the game's other level files.
const line = (o: unknown) => JSON.stringify(o).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{/, '{ ').replace(/\}$/, ' }');
const text = levels.map((l) => {
  const { trucks, gates, ...head } = l;
  return `  {\n    ${JSON.stringify(head).slice(1, -1).replace(/":/g, '": ').replace(/,"/g, ', "')},\n    "trucks": [\n${trucks.map((t) => `      ${line(t)}`).join(',\n')}\n    ],\n    "gates": [\n${gates.map((g) => `      ${line(g)}`).join(',\n')}\n    ]\n  }`;
}).join(',\n');
writeFileSync(new URL('../src/levels/clearwater.json', import.meta.url), `[\n${text}\n]\n`);
console.log(' #  id   name            trucks  par  extra  from');
levels.forEach((l, i) => console.log(`${String(i + 1).padStart(2)}  ${l.id}  ${l.name.padEnd(15)} ${String(l.trucks.length).padStart(6)}  ${String(l.par).padStart(3)}  ${String(l.par - l.trucks.length).padStart(5)}  ${PICKS[i][0]}`));
