import { COLORS, OBSTACLE_KINDS, SIZE, SIZES, TRUCK_KINDS, type Cell, type Color, type FloorCell, type Gate, type Level, type ObstacleKind, type PadSize, type Side, type Truck, type TruckKind } from './types.ts';

export class LevelError extends Error {}

const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];

/** Cells covered by a truck, as [row, col] pairs. */
export function truckCells(t: Truck): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < t.length; i++) {
    cells.push(t.orient === 'h' ? [t.row, t.col + i] : [t.row + i, t.col]);
  }
  return cells;
}

/** Gates of the truck's color that sit in line with it. */
function alignedGates(gates: readonly Gate[], t: Truck): Gate[] {
  return gates.filter(
    (g) =>
      g.color === t.color &&
      (t.orient === 'h'
        ? (g.side === 'left' || g.side === 'right') && g.index === t.row
        : (g.side === 'top' || g.side === 'bottom') && g.index === t.col),
  );
}

/** The gate a truck drives out through. Its side is also where the cab faces. */
export function gateFor(level: Level, t: Truck): Gate {
  const gate = alignedGates(level.gates, t)[0];
  if (!gate) throw new LevelError(`truck ${t.id} has no gate`);
  return gate;
}

/** True when the truck is flush against the fence on its gate's side (`size`: the pad's side in cells). */
export function touchesGate(t: Truck, side: Side, size: number = SIZE): boolean {
  switch (side) {
    case 'left':
      return t.col === 0;
    case 'top':
      return t.row === 0;
    case 'right':
      return t.col + t.length - 1 === size - 1;
    case 'bottom':
      return t.row + t.length - 1 === size - 1;
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isIndex(v: unknown, size: number): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) < size;
}

function isColor(v: unknown): v is Color {
  return (COLORS as readonly unknown[]).includes(v);
}

function parseTruck(raw: unknown, where: string, size: number): Truck {
  if (!isObj(raw)) throw new LevelError(`${where}: truck must be an object`);
  const { id, color, row, col, length, orient, kind, convoy, load } = raw;
  if (typeof id !== 'string' || id === '') throw new LevelError(`${where}: truck id must be a string`);
  if (!isColor(color)) throw new LevelError(`${where}: truck ${id} has unknown color ${String(color)}`);
  if (length !== 2 && length !== 3) throw new LevelError(`${where}: truck ${id} length must be 2 or 3`);
  if (orient !== 'h' && orient !== 'v') throw new LevelError(`${where}: truck ${id} orient must be h or v`);
  if (!isIndex(row, size) || !isIndex(col, size)) throw new LevelError(`${where}: truck ${id} row/col out of range`);
  const truck: Truck = { id, color, row, col, length, orient };
  if (kind !== undefined) {
    if (!(TRUCK_KINDS[length] as readonly unknown[]).includes(kind)) {
      throw new LevelError(`${where}: truck ${id} can't be a ${String(kind)} (length ${length})`);
    }
    truck.kind = kind as TruckKind;
  }
  if (convoy !== undefined) {
    if (convoy !== 1 && convoy !== 2) throw new LevelError(`${where}: truck ${id} convoy must be 1 or 2`);
    truck.convoy = convoy;
  }
  if (load !== undefined) {
    if (load !== true) throw new LevelError(`${where}: truck ${id} load must be true`);
    if (length !== 3) throw new LevelError(`${where}: truck ${id} must be 3 cells long to be a tanker that loads`);
    truck.load = true;
  }
  if ('loaded' in raw) throw new LevelError(`${where}: truck ${id}: "loaded" is set during play, not in a level`);
  const end = orient === 'h' ? col + length - 1 : row + length - 1;
  if (end >= size) throw new LevelError(`${where}: truck ${id} runs off the pad`);
  return truck;
}

function parseGate(raw: unknown, where: string, size: number): Gate {
  if (!isObj(raw)) throw new LevelError(`${where}: gate must be an object`);
  const { color, side, index, shift } = raw;
  if (!isColor(color)) throw new LevelError(`${where}: gate has unknown color ${String(color)}`);
  if (!SIDES.includes(side as Side)) throw new LevelError(`${where}: gate side must be top/right/bottom/left`);
  if (!isIndex(index, size)) throw new LevelError(`${where}: gate index out of range`);
  if (shift !== undefined && shift !== true) throw new LevelError(`${where}: gate shift must be true`);
  return { color, side: side as Side, index, ...(shift ? { shift: true as const } : {}) };
}

function parseCell(raw: unknown, where: string, size: number): Cell {
  if (!isObj(raw) || !isIndex(raw.row, size) || !isIndex(raw.col, size)) throw new LevelError(`${where}: obstacle needs row/col 0-${size - 1}`);
  const { kind } = raw;
  if (kind === undefined) return { row: raw.row, col: raw.col };
  if (!OBSTACLE_KINDS.includes(kind as ObstacleKind)) throw new LevelError(`${where}: unknown obstacle kind ${String(kind)}`);
  return { row: raw.row, col: raw.col, kind: kind as ObstacleKind };
}

function parseFloor(raw: unknown, where: string, what: string, size: number): FloorCell {
  if (!isObj(raw) || !isIndex(raw.row, size) || !isIndex(raw.col, size)) throw new LevelError(`${where}: ${what} needs row/col 0-${size - 1}`);
  return { row: raw.row, col: raw.col };
}

/** Validates raw JSON and returns a Level, or throws LevelError explaining what is wrong. */
export function parseLevel(raw: unknown): Level {
  if (!isObj(raw)) throw new LevelError('level must be an object');
  const { id, name, par, hint, size: rawSize, trucks, gates, obstacles = [], muskeg = [], racks = [], soft = [] } = raw;
  if (typeof id !== 'string' || id === '') throw new LevelError('level id must be a string');
  const where = `level ${id}`;
  if (typeof name !== 'string') throw new LevelError(`${where}: name must be a string`);
  // The pad's side: 6 unless the level says so (a level file of the game never does).
  if (rawSize !== undefined && !(SIZES as readonly unknown[]).includes(rawSize)) throw new LevelError(`${where}: size must be one of ${SIZES.join(', ')}`);
  const size = (rawSize as PadSize | undefined) ?? SIZE;
  if (!Number.isInteger(par) || (par as number) < 1) throw new LevelError(`${where}: par must be a positive integer`);
  if (hint !== undefined && typeof hint !== 'string') throw new LevelError(`${where}: hint must be a string`);
  if (!Array.isArray(trucks) || trucks.length === 0) throw new LevelError(`${where}: needs at least one truck`);
  if (!Array.isArray(gates)) throw new LevelError(`${where}: gates must be an array`);
  if (!Array.isArray(obstacles)) throw new LevelError(`${where}: obstacles must be an array`);
  if (!Array.isArray(muskeg)) throw new LevelError(`${where}: muskeg must be an array`);
  if (!Array.isArray(racks)) throw new LevelError(`${where}: racks must be an array`);
  if (!Array.isArray(soft)) throw new LevelError(`${where}: soft must be an array`);

  const level: Level = {
    id,
    name,
    par: par as number,
    ...(hint === undefined ? {} : { hint }),
    ...(size === SIZE ? {} : { size: size as PadSize }),
    trucks: trucks.map((t) => parseTruck(t, where, size)),
    gates: gates.map((g) => parseGate(g, where, size)),
    obstacles: obstacles.map((o) => parseCell(o, where, size)),
    muskeg: muskeg.map((c) => parseFloor(c, where, 'muskeg', size)),
    racks: racks.map((c) => parseFloor(c, where, 'load rack', size)),
    soft: soft.map((c) => parseFloor(c, where, 'soft ground', size)),
  };

  const ids = new Set<string>();
  const occupied = new Map<string, string>();
  for (const t of level.trucks) {
    if (ids.has(t.id)) throw new LevelError(`${where}: duplicate truck id ${t.id}`);
    ids.add(t.id);
    for (const [r, c] of truckCells(t)) {
      const other = occupied.get(`${r},${c}`);
      if (other) throw new LevelError(`${where}: trucks ${other} and ${t.id} overlap at ${r},${c}`);
      occupied.set(`${r},${c}`, t.id);
    }
  }
  for (const o of level.obstacles) {
    const other = occupied.get(`${o.row},${o.col}`);
    if (other) throw new LevelError(`${where}: pumpjack at ${o.row},${o.col} overlaps ${other}`);
    occupied.set(`${o.row},${o.col}`, 'pumpjack');
  }

  // Muskeg and load racks are floor: trucks may stand on them, equipment may not, and a cell is one thing only.
  const floor = new Map<string, string>();
  for (const [what, cells] of [['muskeg', level.muskeg], ['a load rack', level.racks], ['soft ground', level.soft]] as const) {
    for (const c of cells) {
      const at = `${c.row},${c.col}`;
      if (floor.has(at)) throw new LevelError(`${where}: ${what} at ${at} is on ${floor.get(at) === what ? 'another one' : floor.get(at)}`);
      if (level.obstacles.some((o) => o.row === c.row && o.col === c.col)) throw new LevelError(`${where}: ${what} at ${at} is under equipment`);
      floor.set(at, what);
    }
  }
  // Soft ground (a road ban patch) carries no rig: a 3-cell truck never starts on one.
  for (const t of level.trucks.filter((x) => x.length === 3)) {
    if (truckCells(t).some(([r, c]) => level.soft.some((k) => k.row === r && k.col === c))) throw new LevelError(`${where}: rig ${t.id} starts on soft ground`);
  }
  // A tanker that loads needs a rack it can reach: in its own lane, and not one it starts on (stopping there is the point).
  for (const t of level.trucks.filter((x) => x.load)) {
    const mine = truckCells(t);
    const inLane = level.racks.filter((r) => (t.orient === 'h' ? r.row === t.row : r.col === t.col));
    if (!inLane.length) throw new LevelError(`${where}: tanker ${t.id} has no load rack in its lane`);
    if (mine.some(([r, c]) => level.racks.some((k) => k.row === r && k.col === c))) throw new LevelError(`${where}: tanker ${t.id} starts on a load rack`);
  }

  const gateSpots = new Set<string>();
  for (const g of level.gates) {
    const key = `${g.side}${g.index}`;
    if (gateSpots.has(key)) throw new LevelError(`${where}: two gates at ${g.side} ${g.index}`);
    gateSpots.add(key);
  }

  // A convoy is every truck of one color: exactly one number 1 and one number 2.
  for (const color of new Set(level.trucks.filter((t) => t.convoy).map((t) => t.color))) {
    const members = level.trucks.filter((t) => t.color === color);
    const numbers = members.map((t) => t.convoy).sort();
    if (numbers.length !== 2 || numbers[0] !== 1 || numbers[1] !== 2) {
      throw new LevelError(`${where}: the ${color} convoy needs exactly one truck 1 and one truck 2`);
    }
  }

  for (const t of level.trucks) {
    const aligned = alignedGates(level.gates, t);
    if (aligned.length === 0) throw new LevelError(`${where}: truck ${t.id} has no ${t.color} gate in line with it`);
    if (aligned.length > 1) throw new LevelError(`${where}: truck ${t.id} has two ${t.color} gates in line with it`);
    if (touchesGate(t, aligned[0].side, size)) throw new LevelError(`${where}: truck ${t.id} starts touching its gate`);
  }

  return level;
}

export function parseLevels(raw: unknown): Level[] {
  if (!Array.isArray(raw)) throw new LevelError('levels file must be an array');
  const levels = raw.map(parseLevel);
  const ids = new Set(levels.map((l) => l.id));
  if (ids.size !== levels.length) throw new LevelError('duplicate level ids');
  return levels;
}
