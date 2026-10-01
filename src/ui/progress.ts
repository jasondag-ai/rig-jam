// Player progress (best scores, hint balance), kept in this browser only.
const KEY = 'rush-hour-rigs:v2';
export const START_HINTS = 3;

export interface Progress {
  /** Best move count per level id. */
  best: Record<string, number>;
  hints: number;
  /** Levels that already paid out their perfect-solve hint. */
  perfect: string[];
  /** Local dates ('YYYY-MM-DD') on which that day's Daily Pad was cleared. */
  dailyCleared: string[];
}

export const freshProgress = (): Progress => ({ best: {}, hints: START_HINTS, perfect: [], dailyCleared: [] });

/** Records today's Daily Pad as cleared (once per day). */
export function recordDailyClear(p: Progress, day: string): Progress {
  return p.dailyCleared.includes(day) ? p : { ...p, dailyCleared: [...p.dailyCleared, day] };
}

/** Hard hats earned: 3 at par, 2 within three moves of par, otherwise 1. */
export function hardHats(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= par) return 3;
  if (moves <= par + 3) return 2;
  return 1;
}

/** Records a finished level. A perfect solve (at par) earns one hint, once per level. */
export function recordWin(p: Progress, levelId: string, moves: number, par: number): { progress: Progress; earnedHint: boolean } {
  const prev = p.best[levelId];
  const best = prev === undefined || moves < prev ? { ...p.best, [levelId]: moves } : p.best;
  const earnedHint = moves <= par && !p.perfect.includes(levelId);
  return {
    progress: {
      ...p,
      best,
      hints: p.hints + (earnedHint ? 1 : 0),
      perfect: earnedHint ? [...p.perfect, levelId] : p.perfect,
    },
    earnedHint,
  };
}

/** Takes one hint, or returns null when there are none left. */
export function spendHint(p: Progress): Progress | null {
  return p.hints > 0 ? { ...p, hints: p.hints - 1 } : null;
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshProgress();
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      best: p.best ?? {},
      hints: Number.isInteger(p.hints) ? (p.hints as number) : START_HINTS,
      perfect: Array.isArray(p.perfect) ? p.perfect : [],
      dailyCleared: Array.isArray(p.dailyCleared) ? p.dailyCleared : [],
    };
  } catch {
    return freshProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage blocked (private mode): progress just won't persist.
  }
}

/** Every key this game stores starts with this. */
export const STORAGE_PREFIX = 'rush-hour-rigs:';

/** Wipes everything the game saved on this phone: levels, hard hats, hints, streak, last region. */
export function resetProgress(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // Storage blocked: there was nothing saved anyway.
  }
}
