// Saved progress for the end-to-end tests: every level already cleared (so everything is open)
// WITHOUT demo mode, which now changes how gags behave. DEMO is the same with demo mode on.
import { REGIONS } from '../src/levels/regions.ts';

const base = {
  best: Object.fromEntries(REGIONS.flatMap((r) => r.levels.map((l) => [l.id, l.par + 5]))),
  hints: 3,
  perfect: [],
  dailyCleared: [],
  announced: REGIONS.map((r) => r.id),
};
export const UNLOCKED = JSON.stringify({ ...base, demo: false });
export const DEMO = JSON.stringify({ ...base, demo: true });
