// Re-proves every Big Pad candidate and prints the table again:
//   node --max-old-space-size=8000 tools/check-bigpad.ts [breadth-first limit, positions; 12000000]
// For each pad in levels/bigpad-candidates.json: the game's parser takes it, A* (rings) gives its
// par, its hint path clears it in the game itself, A* with the plain heuristic (trucks left) gives
// the same par, and so does the BREADTH-FIRST solver wherever it gets through inside its limit
// (17 trucks at most; a pad of 8 can run to tens of millions of positions). What agreed is written
// back into the file (`parAlsoBy`).
import { readFileSync, writeFileSync } from 'node:fs';
import { SolverLimitError, isWon, newGame, parseLevel, searchAStar, solve, tryMove } from '../src/engine/index.ts';
import { BFS_TRUCKS, table, type Candidate } from './gen-bigpad.ts';

const FILE = new URL('../levels/bigpad-candidates.json', import.meta.url);
const limit = Number(process.argv[2] ?? 12_000_000);
const file = JSON.parse(readFileSync(FILE, 'utf8')) as { candidates: Candidate[] };
let bfs = 0;
for (const c of file.candidates) {
  const level = parseLevel(c.level);
  const t0 = performance.now();
  const strong = searchAStar(level, 4_000_000, level.trucks, 0, 'rings');
  const aMs = performance.now() - t0;
  if (strong.moves?.length !== c.par) throw new Error(`${c.id}: A* says ${strong.moves?.length}, the file says ${c.par}`);
  let s = newGame(level);
  for (const m of c.hintPath) s = tryMove(s, m.id, m.delta)!.state;
  if (!isWon(s) || c.hintPath.length !== c.par) throw new Error(`${c.id}: its hint path does not clear the pad in par`);
  c.parAlsoBy = [];
  const again = (name: string, run: () => { length: number } | null) => {
    const t = performance.now();
    try {
      const got = run();
      if (got?.length !== c.par) throw new Error(`${c.id}: ${name} says par ${got?.length}, A* says ${c.par}`);
      c.parAlsoBy.push(name);
      return `${((performance.now() - t) / 1000).toFixed(1)} s`;
    } catch (e) {
      if (!(e instanceof SolverLimitError)) throw e;
      return 'past its limit';
    }
  };
  const left = again('A* (trucks left)', () => searchAStar(level, 6_000_000, level.trucks, 0, 'left').moves);
  const wide = level.trucks.length > BFS_TRUCKS;
  const flat = wide ? 'too many trucks' : again('breadth-first', () => solve(level, limit));
  if (c.parAlsoBy.includes('breadth-first')) bfs++;
  console.log(`${c.id}  par ${c.par}  A* ${aMs.toFixed(0)} ms | trucks left: ${left} | breadth-first: ${flat}`);
}
writeFileSync(FILE, JSON.stringify(file, null, 1) + '\n');
console.log(`\n${table(file.candidates)}\n\nBreadth-first agreed on ${bfs} of ${file.candidates.length}; it never disagreed.`);
