// Who got bumped, and who complains about it. Pure: no DOM, so it can be unit-tested.
import { sizeOf, convoyWaitingFor, gateFor, gateOpen, shiftOpen, type GameState, type MoveRange } from '../engine/index.ts';
import type { BumpHit } from './lines.ts';

export interface BumpTarget {
  hit: BumpHit;
  /** The truck that got hit ('truck'), the convoy truck the gate is waiting for ('convoy'), or the truck itself at its own shut gate ('load', 'shift'). */
  truckId: string | null;
}

/** What is just past where truck `id` stopped when pushed in `direction` (+1 right/down, -1 left/up). */
export function bumpTarget(state: GameState, id: string, range: MoveRange, direction: 1 | -1): BumpTarget {
  const t = state.trucks.find((x) => x.id === id);
  if (!t) return { hit: 'wall', truckId: null };
  const pos = t.orient === 'h' ? t.col : t.row;
  const next = direction > 0 ? pos + t.length - 1 + range.max + 1 : pos + range.min - 1;
  if (next < 0 || next >= sizeOf(state.level)) {
    // Driving at its own convoy gate out of order: the truck it's waiting for has words.
    const side = gateFor(state.level, t).side;
    const towardGate = direction > 0 ? side === 'right' || side === 'bottom' : side === 'left' || side === 'top';
    if (towardGate && !gateOpen(state, t)) {
      // A tanker that has not loaded, or a shift-change gate on an odd move: its own driver says why.
      if (t.load && !t.loaded) return { hit: 'load', truckId: t.id };
      const waiting = t.convoy ? convoyWaitingFor(state, t.color) : null;
      if (!(waiting && waiting !== t.convoy) && gateFor(state.level, t).shift && !shiftOpen(state)) return { hit: 'shift', truckId: t.id };
      const first = state.trucks.find((o) => o.color === t.color && o.convoy === convoyWaitingFor(state, t.color));
      return { hit: 'convoy', truckId: first?.id ?? null };
    }
    return { hit: 'wall', truckId: null };
  }
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
 * 1. the truck that got hit (or, at a closed convoy gate, the convoy truck it's waiting for);
 * 2. otherwise (fence, wrong gate, obstacle) a random other truck still on the pad;
 * 3. the dragged truck itself when it is the only one left.
 */
export function pickSpeaker(state: GameState, draggedId: string, target: BumpTarget, random: () => number = Math.random): string {
  if (target.truckId) return target.truckId;
  const others = state.trucks.filter((t) => t.id !== draggedId);
  if (others.length === 0) return draggedId;
  return others[Math.floor(random() * others.length)].id;
}
