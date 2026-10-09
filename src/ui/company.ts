// The Company Man's verdict on the win card: which result it was, and his line for it.
// Pure logic; the lines are in lines.ts and his picture in win-cast.ts.
import { COMPANY_LINES, DAILY_ONLY_LINES, FOURTH_WALL_LINES, FOURTH_WALL_ODDS, fromPool } from './lines.ts';

export type Tier = keyof typeof COMPANY_LINES;

export function tierFor(moves: number, par: number): Tier {
  if (moves <= par) return 'par';
  if (moves <= par + 3) return 'close';
  return 'over';
}

const lastCompany: Partial<Record<Tier, string>> = {};

/**
 * Company Man's line for a result: never the same line twice in a row for that tier. If a gag
 * played this level, about one time in three he breaks the fourth wall about it instead. A line about
 * tomorrow (`DAILY_ONLY_LINES`) is said only on a Daily Pad's card (`daily`).
 */
export function companyLine(moves: number, par: number, random: () => number = Math.random, gagPlayed = false, daily = false): string {
  if (gagPlayed && random() < 1 / FOURTH_WALL_ODDS) return fromPool(FOURTH_WALL_LINES, random);
  const tier = tierFor(moves, par);
  const pool = COMPANY_LINES[tier].filter((l) => l !== lastCompany[tier] && (daily || !DAILY_ONLY_LINES.includes(l)));
  const line = pool[Math.floor(random() * pool.length)];
  lastCompany[tier] = line;
  return line;
}
