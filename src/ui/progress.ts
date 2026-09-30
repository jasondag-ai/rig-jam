// Best move counts per level, kept in this browser only.
const KEY = 'rush-hour-rigs:best';

export function loadBest(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveBest(levelId: string, moves: number): void {
  const best = loadBest();
  if (best[levelId] !== undefined && best[levelId] <= moves) return;
  best[levelId] = moves;
  try {
    localStorage.setItem(KEY, JSON.stringify(best));
  } catch {
    // Storage blocked (private mode): progress just won't persist.
  }
}

/** 3 stars at or under par, 2 within two moves of par, otherwise 1. */
export function stars(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par + 2) return 2;
  return 1;
}
