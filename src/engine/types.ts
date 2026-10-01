export const SIZE = 6;

export const COLORS = ['red', 'blue', 'yellow', 'green', 'orange', 'purple'] as const;
export type Color = (typeof COLORS)[number];

export type Orient = 'h' | 'v';
export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface Truck {
  id: string;
  color: Color;
  /** Row of the truck's top-left cell (0-5). */
  row: number;
  /** Column of the truck's top-left cell (0-5). */
  col: number;
  length: 2 | 3;
  orient: Orient;
}

export interface Gate {
  color: Color;
  side: Side;
  /** Row for left/right gates, column for top/bottom gates. */
  index: number;
}

export const OBSTACLE_KINDS = ['pumpjack', 'tank', 'wellhead'] as const;
/** What an obstacle looks like. Purely cosmetic: the rules treat every kind the same. */
export type ObstacleKind = (typeof OBSTACLE_KINDS)[number];

/** A fixed 1-cell obstacle (pumpjack, tank or wellhead). Nothing can drive through it. */
export interface Cell {
  row: number;
  col: number;
  /** Cosmetic only. Missing means pumpjack. The engine and solver never read it. */
  kind?: ObstacleKind;
}

export interface Level {
  id: string;
  name: string;
  par: number;
  /** Optional one-line tip shown under the board. */
  hint?: string;
  trucks: Truck[];
  gates: Gate[];
  /** Pumpjacks. Empty when the level has none. */
  obstacles: Cell[];
}

export interface GameState {
  level: Level;
  /** Trucks still on the pad. */
  trucks: Truck[];
  moves: number;
  /** Previous truck lists, most recent last. */
  history: Truck[][];
}

export interface Move {
  id: string;
  delta: number;
}
