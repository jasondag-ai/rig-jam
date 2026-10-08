// node tools/bench-astar.ts : A* against breadth-first on every level of the game (positions looked at, time).
import { REGIONS } from '../src/levels/regions.ts';
import { searchAStar, solve } from '../src/engine/index.ts';
for (const region of REGIONS) {
  let tb = 0, tl = 0, tr = 0, el = 0, er = 0;
  for (const level of region.levels) {
    let t = performance.now(); solve(level, 4_000_000); tb += performance.now() - t;
    t = performance.now(); el += searchAStar(level, 4_000_000, level.trucks, 0, 'left').expanded; tl += performance.now() - t;
    t = performance.now(); er += searchAStar(level, 4_000_000, level.trucks, 0, 'rings').expanded; tr += performance.now() - t;
  }
  console.log(`${region.name.padEnd(10)} BFS ${tb.toFixed(0).padStart(5)} ms | A* left ${tl.toFixed(0).padStart(5)} ms ${String(el).padStart(8)} looked at | A* rings ${tr.toFixed(0).padStart(5)} ms ${String(er).padStart(8)} looked at`);
}
