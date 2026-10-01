// Prints every level as a grid with its optimal solution. Run: npm run check-levels
import { readFileSync } from 'node:fs';
import { parseLevels, solve, truckCells, SIZE, type Level } from '../src/engine/index.ts';

function draw(level: Level): string {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill('.'));
  for (const t of level.trucks) for (const [r, c] of truckCells(t)) grid[r][c] = t.id;
  for (const o of level.obstacles) grid[o.row][o.col] = '#';
  const gate = (side: string, i: number) => level.gates.find((g) => g.side === side && g.index === i)?.color[0] ?? '-';
  const top = '  ' + Array.from({ length: SIZE }, (_, c) => gate('top', c)).join(' ');
  const bottom = '  ' + Array.from({ length: SIZE }, (_, c) => gate('bottom', c)).join(' ');
  const rows = grid.map((row, r) => `${gate('left', r)} ${row.join(' ')} ${gate('right', r)}`);
  return [top, ...rows, bottom].join('\n');
}

let ok = true;
for (const region of ['cardium', 'montney']) {
  const levels = parseLevels(JSON.parse(readFileSync(new URL(`../src/levels/${region}.json`, import.meta.url), 'utf8')));
  for (const level of levels) {
    const solution = solve(level);
    const legend = level.trucks.map((t) => `${t.id}=${t.color}${t.length}`).join(' ');
    console.log(`\n${level.id} ${level.name}  (${level.trucks.length} trucks, ${level.obstacles.length} pumpjacks: ${legend})`);
    console.log(draw(level));
    if (!solution) {
      ok = false;
      console.log('  UNSOLVABLE');
      continue;
    }
    if (solution.length !== level.par) ok = false;
    console.log(`  optimal ${solution.length} moves, ${solution.length === level.par ? 'par OK' : `PAR MISMATCH (json says ${level.par})`}`);
    console.log('  ' + solution.map((m) => `${m.id}${m.delta > 0 ? '+' : ''}${m.delta}`).join(' '));
  }
}
process.exit(ok ? 0 : 1);
