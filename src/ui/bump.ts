// Who got bumped, and who complains about it. Pure: no DOM, so it can be unit-tested.
import { SIZE, type GameState, type MoveRange } from '../engine/index.ts';
import type { BumpHit } from './lines.ts';

export interface BumpTarget {
  hit: BumpHit;
  /** The truck that got hit, when `hit` is 'truck'. */
  truckId: string | null;
}

/** What is just past where truck `id` stopped when pushed in `direction` (+1 right/down, -1 left/up). */
export function bumpTarget(state: GameState, id: string, range: MoveRange, direction: 1 | -1): BumpTarget {
  const t = state.trucks.find((x) => x.id === id);
  if (!t) return { hit: 'wall', truckId: null };
  const pos = t.orient === 'h' ? t.col : t.row;
  const next = direction > 0 ? pos + t.length - 1 + range.max + 1 : pos + range.min - 1;
  if (next < 0 || next >= SIZE) return { hit: 'wall', truckId: null };
  const row = t.orient === 'h' ? t.row : next;
  const col = t.orient === 'h' ? next : t.col;
  const ob = state.level.obstacles.find((o) => o.row === row && o.col === col);
  if (ob) return { hit: ob.kind ?? 'pumpjack', truckId: null };
  const other = state.trucks.find(
    (o) =>
      o.id !== id &&
      (o.orient === 'h'
        ? o.row === row && col >= o.col && col < o.col + o.length
        : o.col === col && row >= o.row && row < o.row + o.length),
  );
  return other ? { hit: 'truck', truckId: other.id } : { hit: 'wall', truckId: null };
}

/**
 * The truck whose driver speaks:
 * 1. the truck that got hit;
 * 2. otherwise (fence, wrong gate, obstacle) a random other truck still on the pad;
 * 3. the dragged truck itself when it is the only one left.
 */
export function pickSpeaker(state: GameState, draggedId: string, target: BumpTarget, random: () => number = Math.random): string {
  if (target.truckId) return target.truckId;
  const others = state.trucks.filter((t) => t.id !== draggedId);
  if (others.length === 0) return draggedId;
  return others[Math.floor(random() * others.length)].id;
}
