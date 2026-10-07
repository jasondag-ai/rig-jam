// The Big Pad spike: the seed's interlocks are real, and every candidate in levels/bigpad-candidates.json
// is a level the game takes, with the par, the extra moves and the hint path the file says.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isWon, newGame, parseLevel, searchAStar, sizeOf, touchesGate, tryMove } from '../src/engine/index.ts';
import { gateFor } from '../src/engine/level.ts';
import { mulberry32 } from '../src/engine/rng.ts';
import { MAX_MINUTES, TARGET, chainDepth, inWay, pinwheel, ringCount, seedPad, type Candidate } from './gen-bigpad.ts';

describe('the interlock seed', () => {
  it('a pinwheel is a ring of four: each truck stands in the next one\'s way out, both ways round', () => {
    for (const mirror of [false, true]) for (const w of [2, 3] as const) for (const h of [2, 3] as const) {
      const ts = pinwheel(2, 1, w, h, mirror)!;
      const way = inWay(ts);
      expect(way.every((x) => x.length === 1)).toBe(true);
      // Following who is in whose way goes round all four and back.
      let at = 0;
      const seen = new Set<number>();
      for (let k = 0; k < 4; k++) { seen.add(at); at = way[at][0]; }
      expect(at).toBe(0);
      expect(seen.size).toBe(4);
      expect(ringCount(ts)).toBe(1);
      expect(chainDepth(ts)).toBe(4);
    }
    expect(pinwheel(6, 6, 3, 3, false)).toBeNull(); // off the pad
  });

  it('a seeded pad has its count of trucks, at least one ring, a chain of 5 or more, and no overlap', () => {
    const rng = mulberry32(5);
    let made = 0;
    for (let k = 0; k < 40; k++) {
      const count = 14 + (k % 5);
      const ts = seedPad(rng, count, 3 + (k % 3));
      if (!ts) continue;
      made++;
      expect(ts.length).toBe(count);
      expect(ringCount(ts)).toBeGreaterThanOrEqual(1);
      expect(chainDepth(ts)).toBeGreaterThanOrEqual(5);
      const cells = ts.flatMap((t) => Array.from({ length: t.len }, (_, i) => (t.orient === 'h' ? t.lane * 8 + t.pos + i : (t.pos + i) * 8 + t.lane)));
      expect(new Set(cells).size).toBe(cells.length);
    }
    expect(made).toBeGreaterThan(30);
  });
});

const FILE = new URL('../levels/bigpad-candidates.json', import.meta.url);
describe.runIf(existsSync(FILE))('levels/bigpad-candidates.json', () => {
  const file = JSON.parse(readFileSync(FILE, 'utf8')) as { minutes: number; seconds: number; candidates: Candidate[] };

  it('the run kept inside its 10 minutes', () => {
    expect(file.minutes).toBeLessThanOrEqual(MAX_MINUTES);
    expect(file.seconds).toBeLessThanOrEqual(MAX_MINUTES * 60);
  });

  it('20 candidates, sorted by extra moves, each 14 to 18 trucks and 6 to 15 extra moves on a pad of 8', () => {
    expect(file.candidates.length).toBe(20);
    file.candidates.forEach((c, i) => {
      expect(c.trucks, c.id).toBeGreaterThanOrEqual(TARGET.trucks[0]);
      expect(c.trucks, c.id).toBeLessThanOrEqual(TARGET.trucks[1]);
      expect(c.extraMoves, c.id).toBe(c.par - c.trucks);
      expect(c.extraMoves, c.id).toBeGreaterThanOrEqual(TARGET.extra[0]);
      expect(c.extraMoves, c.id).toBeLessThanOrEqual(TARGET.extra[1]);
      if (i) expect(c.extraMoves, c.id).toBeLessThanOrEqual(file.candidates[i - 1].extraMoves);
      expect(c.solveMs, c.id).toBeGreaterThanOrEqual(0);
    });
    expect(new Set(file.candidates.map((c) => c.id)).size).toBe(20);
  });

  it('at least 5 have 10 or more extra moves', () => {
    expect(file.candidates.filter((c) => c.extraMoves >= 10).length).toBeGreaterThanOrEqual(5);
  });

  it('each is a level the game takes: nobody touches its gate, and its hint path clears the pad in exactly par', () => {
    for (const c of file.candidates) {
      const level = parseLevel(c.level);
      expect(sizeOf(level), c.id).toBe(8);
      expect(level.trucks.length, c.id).toBe(c.trucks);
      for (const t of level.trucks) expect(touchesGate(t, gateFor(level, t).side, 8), `${c.id} ${t.id}`).toBe(false);
      expect(c.hintPath.length, c.id).toBe(c.par);
      let s = newGame(level);
      for (const m of c.hintPath) {
        const r = tryMove(s, m.id, m.delta);
        expect(r, `${c.id} ${m.id}`).not.toBeNull();
        s = r!.state;
      }
      expect(isWon(s), c.id).toBe(true);
    }
  });

  it('A* proves each par again', () => {
    for (const c of file.candidates) {
      const level = parseLevel(c.level);
      expect(searchAStar(level, 4_000_000, level.trucks, 0, 'rings').moves!.length, c.id).toBe(c.par);
    }
  }, 60_000);

  it('no two candidates are the same pad', () => {
    const key = (c: Candidate) => c.level.trucks.map((t) => `${t.orient}${t.row},${t.col},${t.length}`).sort().join(' ');
    expect(new Set(file.candidates.map(key)).size).toBe(20);
  });
});
