// Tire tracks: the path a truck actually drives during a drag is written into the ground. A drag
// is split into sweeps (each time the truck reverses, a new sweep starts), so dragging back and
// forth leaves marks and wears the lane on every pass. Lane cells driven again and again get wider,
// darker marks, up to WEAR_CAP. Pure geometry and wear bookkeeping; track-layer.ts draws it.
import { SIZE } from '../engine/index.ts';
import { mulberry32 } from '../engine/rng.ts';

/** Wheel marks sit this far either side of the truck's center line (in cells). */
export const WHEEL_OFFSET = 0.27;
/** Marks stop this far short of the truck's ends (not where they run to the fence). */
export const END_INSET = 0.15;
/** Newest tracks are fully drawn; each later drag fades older ones by this much (fast, so old
 * lanes sink into the ground before a board fills with them)... */
export const FADE_STEP = 0.24;
/** ...down to this floor: a faint trace, so the history never quite disappears. */
export const FADE_FLOOR = 0.1;
/** Passes after which a lane cell stops getting deeper. */
export const WEAR_CAP = 4;
/** Backing up this far (cells) counts as reversing: small snap-backs on release don't. */
export const REVERSE = 0.6;
/** A sweep must cover at least this much of a cell for that cell to wear. */
export const WEAR_OVERLAP = 0.5;

/** Ground covered by one sweep along a lane, in cells: from `lo` to `hi` (fractional). */
export interface Sweep {
  lo: number;
  hi: number;
}

const clampToPad = (v: number) => Math.max(0, Math.min(SIZE, v));

/** Follows a truck's position during a drag and splits it into sweeps at each reversal. */
export class DragPath {
  readonly closed: Sweep[] = [];
  private dir = 0;
  private from: number;
  private ext: number;
  private readonly length: number;

  constructor(start: number, length: number) {
    this.from = start;
    this.ext = start;
    this.length = length;
  }

  /** Feed the truck's current position (cells). Returns the sweep that just ended, if it reversed. */
  update(pos: number): Sweep | null {
    if (this.dir === 0) {
      if (Math.abs(pos - this.from) > 0.05) {
        this.dir = Math.sign(pos - this.from);
        this.ext = pos;
      }
      return null;
    }
    if ((pos - this.ext) * this.dir > 0) {
      this.ext = pos;
      return null;
    }
    if ((this.ext - pos) * this.dir > REVERSE) {
      const done = this.cover(this.from, this.ext);
      this.closed.push(done);
      this.from = this.ext;
      this.dir = -this.dir;
      this.ext = pos;
      return done;
    }
    return null;
  }

  /** The sweep in progress, or null if the truck hasn't moved yet. */
  get current(): Sweep | null {
    return this.dir === 0 ? null : this.cover(this.from, this.ext);
  }

  /** Ends the drag: the sweep in progress (if any) becomes final. */
  end(): Sweep | null {
    const last = this.current;
    if (last) this.closed.push(last);
    this.dir = 0;
    return last;
  }

  private cover(a: number, b: number): Sweep {
    return { lo: clampToPad(Math.min(a, b)), hi: clampToPad(Math.max(a, b) + this.length) };
  }
}

/** Lane cells a sweep wears: those it covers by at least WEAR_OVERLAP. */
export function sweepCells(s: Sweep): number[] {
  const cells: number[] = [];
  for (let c = Math.floor(s.lo); c < Math.ceil(s.hi); c++) {
    if (Math.min(c + 1, s.hi) - Math.max(c, s.lo) >= WEAR_OVERLAP) cells.push(c);
  }
  return cells;
}

/** Passes over each lane cell so far, keyed by lane and cell. */
export type Wear = Map<string, number>;
const key = (orient: 'h' | 'v', lane: number, cell: number) => `${orient}${lane}:${cell}`;

export function addWear(wear: Wear, orient: 'h' | 'v', lane: number, cells: number[]): void {
  for (const c of cells) wear.set(key(orient, lane, c), (wear.get(key(orient, lane, c)) ?? 0) + 1);
}

export function removeWear(wear: Wear, orient: 'h' | 'v', lane: number, cells: number[]): void {
  for (const c of cells) {
    const n = (wear.get(key(orient, lane, c)) ?? 0) - 1;
    if (n > 0) wear.set(key(orient, lane, c), n);
    else wear.delete(key(orient, lane, c));
  }
}

/** How worn a lane cell looks: passes so far plus `extra` (1 for a sweep still being driven), capped. */
export function wearLevel(wear: Wear, orient: 'h' | 'v', lane: number, cell: number, extra = 0): number {
  return Math.max(1, Math.min(WEAR_CAP, (wear.get(key(orient, lane, cell)) ?? 0) + extra));
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 1 (fresh) .. WEAR_CAP (deep rut). */
  wear: number;
  /** This sweep's marks are this much wider or narrower than the standard (1 = standard). */
  width: number;
}

/**
 * How one sweep differs from the next, so that lanes worn again and again never line up into a
 * grid: the wheel marks sit a little to one side of the lane's centre line, are a little wider or
 * narrower, and their wear steps fall off the cell edges.
 */
export interface SweepVary {
  /** Sideways shift of both wheel marks, in cells. */
  offset: number;
  width: number;
  /** Where along the lane the wear steps fall, relative to the cell edges, in cells. */
  shift: number;
}
export const NO_VARY: SweepVary = { offset: 0, width: 1, shift: 0 };
/** How far a sweep's marks may sit off the lane's centre line (cells), and how much its width may vary. */
export const VARY_OFFSET = 0.05;
export const VARY_WIDTH = 0.2;
export const VARY_SHIFT = 0.32;

/** A sweep's variation from a seed: the same seed always gives the same marks. */
export function sweepVary(seed: number): SweepVary {
  const rng = mulberry32(seed);
  return { offset: (rng() * 2 - 1) * VARY_OFFSET, width: 1 + (rng() * 2 - 1) * VARY_WIDTH, shift: (rng() * 2 - 1) * VARY_SHIFT };
}

/**
 * Wheel-mark segments for one sweep, in cell units. Neighbouring cells with the same wear merge,
 * so a sweep draws a handful of lines. Ends are inset, except where they run to the fence.
 */
export function sweepSegments(orient: 'h' | 'v', lane: number, s: Sweep, wear: Wear, extra = 0, vary: SweepVary = NO_VARY): Segment[] {
  const start = s.lo + (s.lo <= 0 ? 0 : END_INSET);
  const end = s.hi - (s.hi >= SIZE ? 0 : END_INSET);
  if (end <= start) return [];
  const runs: { from: number; to: number; level: number }[] = [];
  for (let c = Math.floor(start); c < Math.ceil(end); c++) {
    const level = wearLevel(wear, orient, lane, c, extra);
    const last = runs.at(-1);
    if (last && last.level === level) last.to = c;
    else runs.push({ from: c, to: c, level });
  }
  const out: Segment[] = [];
  for (const offset of [-WHEEL_OFFSET, WHEEL_OFFSET]) {
    const across = lane + 0.5 + offset + vary.offset;
    runs.forEach((r, i) => {
      // The sweep's own ends stay put; the steps between wear levels are shifted off the cell edges.
      const a = i === 0 ? start : Math.max(start, Math.min(end, r.from + vary.shift));
      const b = i === runs.length - 1 ? end : Math.max(start, Math.min(end, r.to + 1 + vary.shift));
      if (b <= a) return;
      out.push(
        orient === 'h'
          ? { x1: a, y1: across, x2: b, y2: across, wear: r.level, width: vary.width }
          : { x1: across, y1: a, x2: across, y2: b, wear: r.level, width: vary.width },
      );
    });
  }
  return out;
}

/** Opacity of a drag's tracks laid `age` drags ago (0 = the newest). */
export function trackOpacity(age: number): number {
  return Math.max(FADE_FLOOR, 1 - age * FADE_STEP);
}
