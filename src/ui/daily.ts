// Daily Pad: which pad is today's, the streak ("days without incident") with weekly
// Safety Stand-Downs, and the share text. Pure functions; dates are local 'YYYY-MM-DD' keys.

/** Daily Pad #1 is this local date. */
export const DAILY_EPOCH = '2026-09-30';
export const GAME_URL = 'https://jasondag-ai.github.io/rig-jam/';

/** Local calendar date as 'YYYY-MM-DD'. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days since 1970-01-01 for a 'YYYY-MM-DD' key (timezone-free). */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function keyFromNumber(n: number): string {
  const d = new Date(n * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Monday-to-Sunday week index. (1970-01-01 was a Thursday.) */
export const weekOf = (key: string) => Math.floor((dayNumber(key) + 3) / 7);

/** Today's pad number (1 on the epoch, never below 1). */
export function padNumber(today: string): number {
  return Math.max(1, dayNumber(today) - dayNumber(DAILY_EPOCH) + 1);
}

/** Which of the `count` pre-generated levels a pad uses. After the last one, they repeat. */
export function padLevelIndex(pad: number, count: number): number {
  return (pad - 1) % count;
}

export interface Streak {
  /** Daily Pads cleared in the current unbroken run. */
  days: number;
  clearedToday: boolean;
  /** Missed days that a Safety Stand-Down covered in this run, most recent first. */
  savedDays: string[];
  /** This week's stand-down is still unused. */
  standDownReady: boolean;
}

/**
 * Counts consecutive cleared days back from today (or from yesterday, if today isn't cleared
 * yet: the day isn't over). A missed day is covered by that week's one Safety Stand-Down, if it
 * hasn't been used and there is an earlier cleared day to bridge back to.
 */
export function streak(cleared: Iterable<string>, today: string): Streak {
  const done = new Set(cleared);
  const clearedToday = done.has(today);
  const nums = [...done].map(dayNumber);
  const earliest = nums.length ? Math.min(...nums) : Infinity;
  const usedWeeks = new Set<number>();
  const savedDays: string[] = [];
  let days = 0;
  for (let n = dayNumber(today) - (clearedToday ? 0 : 1); n >= earliest; n--) {
    const key = keyFromNumber(n);
    if (done.has(key)) {
      days++;
      continue;
    }
    const week = weekOf(key);
    if (n <= earliest || usedWeeks.has(week)) break;
    usedWeeks.add(week);
    savedDays.push(key);
  }
  return { days, clearedToday, savedDays, standDownReady: !usedWeeks.has(weekOf(today)) };
}

/** What the game says when a Safety Stand-Down has just saved a streak. */
export const STAND_DOWN_TOAST = 'Safety Stand-Down saved your streak.';
/**
 * The missed days a Safety Stand-Down has covered in the current run that the player has not been
 * told about yet (`told`: the ones already announced). The weekly save itself is automatic (`streak`).
 */
export const newlySaved = (s: Streak, told: readonly string[]): string[] => (s.days > 0 ? s.savedDays.filter((d) => !told.includes(d)) : []);

/** Cleared at par with no bumps. */
export const zeroIncident = (moves: number, par: number, bumps: number) => moves <= par && bumps === 0;

export interface ShareInput {
  pad: number;
  moves: number;
  par: number;
  hats: number;
  zeroIncident: boolean;
  streak: number;
}

/** Spoiler-free result: no layout, just the numbers. */
export function shareText(r: ShareInput): string {
  return [
    `Rig Jam 🚛 Daily Pad #${r.pad}`,
    `${'👷'.repeat(r.hats)}${'▫️'.repeat(3 - r.hats)} ${r.moves} moves · par ${r.par}`,
    ...(r.zeroIncident ? ['🦺 ZERO INCIDENT'] : []),
    `🚧 Days without incident: ${r.streak}`,
    GAME_URL,
  ].join('\n');
}
