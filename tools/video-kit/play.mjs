// Playing the game with a finger, for the video kit's recordings: real touch events through the browser, moving the
// way a thumb does (off slowly, across, settling), on the live site. Levels and their best lines come from this
// checkout's own engine (the live build is this code).
import { wait } from './recorder.mjs';
import { newGame, solve, tryMove } from '../../src/engine/index.ts';

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

/** Where a truck is on the screen, and the size of a cell. */
export const truckAt = (s, id) => s.page.evaluate((id) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`);
  if (!el) return null;
  const q = el.getBoundingClientRect();
  return { x: q.x + q.width / 2, y: q.y + q.height / 2, horiz: el.classList.contains('horiz'), cell: parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')) };
}, id);

/** One drag: the truck `cells` along its lane (and on out through its gate if `out`). `ms`: how long the finger takes. */
export async function drag(s, id, cells, { out = false, ms = null, hold = 90, after = null, extra = 0 } = {}) {
  const t = await truckAt(s, id);
  if (!t) throw new Error(`no truck ${id}`);
  const reach = (cells + Math.sign(cells) * ((out ? 0.55 : 0) + extra)) * t.cell;
  const dur = ms ?? 230 + 85 * Math.abs(cells);
  const steps = Math.max(8, Math.round(dur / 12));
  const path = [[t.x, t.y, 0]];
  for (let k = 1; k <= steps; k++) { const d = reach * ease(k / steps); path.push([t.x + (t.horiz ? d : 0), t.y + (t.horiz ? 0 : d), (dur * k) / steps]); }
  const last = path.at(-1);
  path.push([last[0], last[1], dur + hold]);
  await s.touch(path);
  await wait(after ?? (out ? 620 : 240));
}

/** A flick: a short fast swipe that lifts while still moving (about 20 cells a second). */
export async function flick(s, id, dir, { cells = 1.6, ms = 85, after = 900 } = {}) {
  const t = await truckAt(s, id);
  const path = [[t.x, t.y, 0]];
  const steps = 7;
  for (let k = 1; k <= steps; k++) { const d = dir * cells * t.cell * (k / steps); path.push([t.x + (t.horiz ? d : 0), t.y + (t.horiz ? 0 : d), (ms * k) / steps]); }
  await s.touch(path);
  await wait(after);
}

/** The best line of a level from its start: [{ id, delta, exited }]. */
export function bestLine(level) {
  let state = newGame(level);
  return solve(level).map((m) => { const r = tryMove(state, m.id, m.delta); state = r.state; return { ...m, exited: r.exited }; });
}
/** Plays moves of a line one after the other. `pace`: 1 = unhurried, less = quicker. */
export async function play(s, moves, { pace = 1 } = {}) {
  for (const m of moves) await drag(s, m.id, m.delta, { out: m.exited, ms: Math.round((230 + 85 * Math.abs(m.delta)) * pace), after: Math.round((m.exited ? 620 : 240) * pace) });
}

/** A tap on an element's middle (a real touch). */
export async function tapOn(s, selector, { nth = 0, dx = 0, dy = 0 } = {}) {
  const pt = await s.page.evaluate(([sel, n]) => { const e = document.querySelectorAll(sel)[n]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, [selector, nth]);
  if (!pt) throw new Error(`nothing to tap: ${selector}`);
  await s.tap(pt.x + dx, pt.y + dy);
  return pt;
}
/** The first touch lets sound out (the game makes its AudioContext then): on the HUD's title, which is no button. Then the effects are given time to load. */
export async function unlockSound(s, { selector = '.hud .title', ms = 2600 } = {}) {
  await tapOn(s, selector);
  await wait(ms);
}
