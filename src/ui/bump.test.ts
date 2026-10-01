import { describe, expect, it } from 'vitest';
import { getMoveRange, newGame, parseLevel, tryMove } from '../engine/index.ts';
import { mulberry32 } from '../engine/rng.ts';
import { bumpTarget, pickSpeaker } from './bump.ts';

// . . . . . .
// . . . B . .
// A A . B . .   A: red, gate right row 2. B: blue, gate bottom col 3. C: green, gate left row 5.
// . . . . . .
// . . . P . .   P: pumpjack at 4,3
// . C C . . .
const level = parseLevel({
  id: 't',
  name: 'Test',
  par: 1,
  trucks: [
    { id: 'A', color: 'red', row: 2, col: 0, length: 2, orient: 'h' },
    { id: 'B', color: 'blue', row: 1, col: 3, length: 2, orient: 'v' },
    { id: 'C', color: 'green', row: 5, col: 1, length: 2, orient: 'h' },
  ],
  gates: [
    { color: 'red', side: 'right', index: 2 },
    { color: 'blue', side: 'bottom', index: 3 },
    { color: 'green', side: 'left', index: 5 },
  ],
  obstacles: [{ row: 4, col: 3, kind: 'tank' }],
});

const push = (state: ReturnType<typeof newGame>, id: string, direction: 1 | -1) =>
  bumpTarget(state, id, getMoveRange(state, id)!, direction);

describe('bump target', () => {
  it('names the truck that got hit', () => {
    expect(push(newGame(level), 'A', 1)).toEqual({ hit: 'truck', truckId: 'B' });
  });

  it('reports the fence, and an obstacle by its kind', () => {
    expect(push(newGame(level), 'A', -1)).toEqual({ hit: 'wall', truckId: null });
    expect(push(newGame(level), 'B', 1)).toEqual({ hit: 'tank', truckId: null });
  });
});

describe('who speaks', () => {
  it('1. the truck that got hit', () => {
    const game = newGame(level);
    expect(pickSpeaker(game, 'A', push(game, 'A', 1))).toBe('B');
  });

  it('2. a random other truck for a fence, wrong gate or obstacle, never the dragged one', () => {
    const game = newGame(level);
    const rand = mulberry32(4);
    const speakers = new Set<string>();
    for (let i = 0; i < 100; i++) {
      speakers.add(pickSpeaker(game, 'A', push(game, 'A', -1), rand)); // fence
      speakers.add(pickSpeaker(game, 'A', push(game, 'B', 1), rand)); // obstacle
    }
    expect(speakers).toEqual(new Set(['B', 'C']));
  });

  it('3. the dragged truck when it is the only one left', () => {
    let game = tryMove(newGame(level), 'C', -1)!.state; // C drives out the left gate
    game = tryMove(game, 'B', -1)!.state; // B parks at the top, out of A's row
    game = tryMove(game, 'A', 4)!.state; // A drives out
    expect(game.trucks.map((t) => t.id)).toEqual(['B']);
    expect(pickSpeaker(game, 'B', push(game, 'B', -1))).toBe('B');
  });
});
