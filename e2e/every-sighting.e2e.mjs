// EVERY SIGHTING PLAYS IN SAFARI, AND NO PROP IS DEAD (Playwright, WebKit at iPhone DPR 3).
// At Safari's visible size with its toolbars showing (390 x 664 by default; `VIEW=375x635`, `VIEW=390x844`):
//  1. EVERY SIGHTING, ON ITS REAL TRIGGER, in its own region: all 31 gags (and the biffy's two on the Big Pad). Each is
//     set off the way a player sets it off (a tap, a bump, a drive, Undo, Hint, Restart...), its puppets come on the
//     screen, and nothing it draws reaches down over the tip line and the buttons, nor (for what stands in the bottom
//     strip) up over the lease's pad.
//  2. EVERY TAPPABLE PROP IN EVERY REGION ANSWERS A TAP: with its sighting, or (the biffy, the gopher's mound, the round
//     bale, the lease sign in winter) with a small knock of its own.
// Run with the dev server up, or against the live site: URL=https://jasondag-ai.github.io/rush-hour-rigs/ npm run test:e2e:sightings
import { webkit } from 'playwright';
import { REGIONS, DAILY_LEVELS } from '../src/levels/regions.ts';
import { gateFor, getMoveRange, newGame, sizeOf, solve, tryMove } from '../src/engine/index.ts';
import { dayKey, padNumber, padLevelIndex } from '../src/ui/daily.ts';
import { UNLOCKED } from './progress.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const [VW, VH] = (process.env.VIEW ?? '390x664').split('x').map(Number);
const ONLY = process.env.ONLY;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const R = Object.fromEntries(REGIONS.map((r, i) => [r.id, i]));
// (Every roll pinned to "it comes", and nothing else pinned: each case then sets off only what it means to.)
const PINS = 'bird=1&nap=1&surveyor=1&tourists=1&lunch=1&bear=1';
const browser = await webkit.launch();

async function open(query = '', log = null) {
  const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${ROOT}?cover=0&soundnudge=0${query ? '&' + query : ''}`, { waitUntil: 'networkidle' });
  await page.evaluate(([p, l]) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); if (l) localStorage.setItem('rush-hour-rigs:log', l); }, [UNLOCKED, log && JSON.stringify({ v: 3, found: log, camo: true, camoEarned: false })]);
  await page.reload({ waitUntil: 'networkidle' });
  return { context, page, errors };
}
const enter = async (page, region, li) => {
  await page.locator('.region-tab').nth(region).click();
  await page.locator('.level-btn').nth(li).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(600);
};
const enterDaily = async (page) => {
  await page.locator('.daily-btn').click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(600);
};
/** Drags a truck `cells` along its lane with touch pointer events and lets go. */
const drag = (page, id, cells, settle = 420) =>
  page.evaluate(async ([truckId, n, ms]) => {
    const el = document.querySelector(`.truck[data-id="${truckId}"]:not(.exiting)`);
    const r = el.getBoundingClientRect();
    const h = el.classList.contains('horiz');
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    let x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 71, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown');
    for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((q) => setTimeout(q, 17)); }
    ev('pointerup');
    await new Promise((q) => setTimeout(q, ms));
  }, [id, cells, settle]);
const tapAt = async (page, pt, times = 1, gap = 150) => { for (let k = 0; k < times; k++) { await page.mouse.click(pt.x, pt.y); await wait(gap); } };
const centre = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, sel);
const tapOn = async (page, sel, times = 1) => { const pt = await centre(page, sel); if (!pt) return false; await tapAt(page, pt, times); return true; };

// ---------- what a level offers (worked out with the engine, from its start) ----------
const plan = (level) => { let s = newGame(level); return solve(level).map((m) => { const r = tryMove(s, m.id, m.delta); s = r.state; return { ...m, out: r.exited }; }); };
const play = (page, m, settle) => drag(page, m.id, m.delta + (m.out ? Math.sign(m.delta) * 0.4 : 0), settle ?? (m.out ? 950 : 420));
/** A truck that can be driven into the berm on one side (not through its own gate): its id and the drag that bumps. */
const bumper = (level, side, cols = null) => {
  const s = newGame(level), size = sizeOf(level);
  for (const t of s.trucks) {
    const vertical = side === 'top' || side === 'bottom';
    if ((t.orient === 'v') !== vertical || gateFor(level, t).side === side) continue;
    if (cols && !cols.includes(t.col)) continue;
    const r = getMoveRange(s, t.id), pos = t.orient === 'h' ? t.col : t.row, fwd = side === 'bottom' || side === 'right';
    const reach = fwd ? pos + t.length + r.max === size : pos + r.min === 0;
    if (reach) return { id: t.id, first: (fwd ? r.max : r.min) + (fwd ? 0.6 : -0.6), again: fwd ? 0.6 : -0.6 };
  }
  return null;
};
/** A truck that slides straight into another truck. */
const rammer = (level) => {
  const s = newGame(level), size = sizeOf(level);
  const at = new Map();
  for (const t of s.trucks) for (let k = 0; k < t.length; k++) at.set(t.orient === 'h' ? `${t.row},${t.col + k}` : `${t.row + k},${t.col}`, t.id);
  for (const t of s.trucks) {
    const r = getMoveRange(s, t.id), pos = t.orient === 'h' ? t.col : t.row;
    const next = pos + t.length + r.max, cell = t.orient === 'h' ? `${t.row},${next}` : `${next},${t.col}`;
    if (next < size && at.has(cell)) return { id: t.id, by: r.max + 0.6 };
  }
  return null;
};
const pick = (region, find) => { for (let li = 0; li < REGIONS[region].levels.length; li++) { const got = find(REGIONS[region].levels[li]); if (got) return { li, got }; } return null; };

// ---------- how a sighting is known to be playing ----------
const LAYER = { magpie: '.magpie-layer svg.magpie', worker: '.worker-layer svg.pup', moose: '.moose-layer svg' };
/** Waits for the gag to come on, then watches it for a while: is something of it on the screen, and how far does it reach? */
const playing = async (page, id, { within = 9000, watch = 3200 } = {}) => {
  const sel = LAYER[id] ?? `.strip-layer[data-gag="${id}"]`;
  try { await page.waitForSelector(sel, { state: 'attached', timeout: within }); } catch { return { on: false }; }
  return page.evaluate(([id, sel, ms, strip]) => new Promise((done) => {
    const t0 = performance.now(); let seen = false, top = Infinity, bottom = -Infinity;
    const board = document.querySelector('.board .pad').getBoundingClientRect(), note = document.querySelector('.note').getBoundingClientRect();
    const tick = () => {
      // (What is DRAWN is measured, never a drawing's own empty box: a puppet's svg has spare room under its feet.)
      const parts = strip ? document.querySelectorAll(`.strip-layer[data-gag="${id}"]:not(.over-lease):not(.geese-layer):not(.aurora-layer) svg.pup > *, .strip-layer[data-gag="${id}"]:not(.over-lease):not(.geese-layer):not(.aurora-layer) g.pup > *`) : [];
      const all = strip ? document.querySelectorAll(`.strip-layer[data-gag="${id}"] svg.pup, .strip-layer[data-gag="${id}"] g.pup > *, .strip-layer[data-gag="${id}"] .lights > *`) : document.querySelectorAll(sel);
      // (Occupied is played by the biffy itself: its own layer only marks the beats.)
      if (id === 'biffyA' && document.querySelector('.strip-layer[data-gag="biffyA"]')?.dataset.beat && document.querySelector('.biffy-layer svg')?.getBoundingClientRect().width > 2) seen = true;
      for (const el of all) { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (r.width > 2 && r.height > 2 && r.right > 4 && r.left < innerWidth - 4 && r.bottom > 0 && r.top < innerHeight && cs.visibility !== 'hidden' && cs.display !== 'none') seen = true; }
      for (const el of parts) {
        if (el.tagName === 'clipPath' || el.hasAttribute('data-fx')) continue;
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (r.width < 2 || r.right < 4 || r.left > innerWidth - 4 || cs.visibility === 'hidden') continue;
        let lo = r.bottom; const clip = (el.getAttribute('clip-path') ?? '').match(/#([\w-]+)/); if (clip) { const c = document.getElementById(clip[1])?.firstElementChild?.getBoundingClientRect(); if (c) lo = Math.min(lo, c.bottom); }
        top = Math.min(top, r.top); bottom = Math.max(bottom, lo);
      }
      if (performance.now() - t0 > ms) return done({ on: true, seen, overPad: Number.isFinite(top) ? Math.round(board.bottom - top) : null, overNote: Number.isFinite(bottom) ? Math.round(bottom - note.top) : null });
      requestAnimationFrame(tick);
    };
    tick();
  }), [id, sel, watch, !LAYER[id]]);
};
// (The tip line's letters begin 4 px under the top of its box: a wheel that dips 3 px in a skid is not on them.)
const NOTE_SLACK = 4;
const verdict = (name, where, got, how) => {
  const clear = got.on && got.seen && (got.overPad === null || got.overPad <= 0) && (got.overNote === null || got.overNote <= NOTE_SLACK);
  check(clear, `${name} (${where}): ${how}${!got.on ? ': NOTHING PLAYED' : !got.seen ? ': it started but nothing of it came on the screen' : got.overPad > 0 ? `: it reaches ${got.overPad} px up over the lease's pad` : got.overNote > NOTE_SLACK ? `: it reaches ${got.overNote} px down over the tip line and buttons` : ''}`);
};

// ---------- 1. every sighting, on its real trigger ----------
const cardiumOut2 = pick(R.cardium, (l) => { const p = plan(l); const k = p.findIndex((m, i) => m.out && p[i + 1]?.out && i + 2 < p.length); return k >= 0 ? { p, k } : null; });
const CASES = [
  ['magpie', 'Magpie', 'cardium', 5, 'a truck tapped, not dragged', async (page, lv) => { for (const t of newGame(lv).trucks) { await tapOn(page, `.truck[data-id="${t.id}"]`); await wait(250); if (await page.$(LAYER.magpie)) break; } }],
  ['worker', 'Sleepy Worker', 'cardium', pick(R.cardium, rammer).li, 'a truck slid into another truck', async (page, lv) => { const r = rammer(lv); await drag(page, r.id, r.by); }],
  ['moose', 'Moose', 'duvernay', pick(R.duvernay, (l) => bumper(l, 'top')).li, 'two bumps up into the top berm', async (page, lv) => { const b = bumper(lv, 'top'); await drag(page, b.id, b.first); await drag(page, b.id, b.again); }],
  ['nearMiss', 'Near Miss', 'cardium', cardiumOut2.li, 'two trucks out back to back', async (page) => { const { p, k } = cardiumOut2.got; for (const m of p.slice(0, k)) await play(page, m); await play(page, p[k], 500); await play(page, p[k + 1], 300); }],
  ['landowner', 'Angry Landowner', 'cardium', 2, 'the same truck driven back and forth', async (page, lv) => { const s = newGame(lv); const t = s.trucks.find((x) => { const r = getMoveRange(s, x.id); return r.max >= 1 && r.exitDelta !== 1; }); for (let k = 0; k < 6; k++) await drag(page, t.id, k % 2 ? -1 : 1, 260); }],
  ['biffyA', 'Occupied', 'cardium', pick(R.cardium, (l) => bumper(l, 'bottom')).li, 'one bump down into the bottom berm', async (page, lv) => { const b = bumper(lv, 'bottom'); await drag(page, b.id, b.first); }],
  ['biffyB', 'The Runaway Roll', 'cardium', pick(R.cardium, (l) => bumper(l, 'bottom')).li, 'two bumps down into the bottom berm, one right after the other', async (page, lv) => { const b = bumper(lv, 'bottom'); await drag(page, b.id, b.first, 200); await drag(page, b.id, b.again, 200); }],
  ['marshmallow', 'Marshmallow', 'montney', REGIONS[R.montney].levels.findIndex((l) => l.obstacles.some((o) => o.kind === 'flare')), 'three taps on a flare stack', async (page) => { await tapOn(page, '.obstacle.flare', 3); }],
  ['geese', 'Lost Goose', 'cardium', 3, 'Undo three times in a row', async (page, lv) => { for (const m of plan(lv).slice(0, 3)) await play(page, m); for (let k = 0; k < 3; k++) { await page.locator('.controls [data-act="undo"]').click(); await wait(250); } }],
  ['bear', 'Bear', 'duvernay', 2, 'three taps on the snowy bush', async (page) => { await tapOn(page, '.bush-layer svg', 3); }],
  ['bull', 'Bull and Cow', 'montney', 2, 'a tap on the cow', async (page) => { await tapOn(page, '.cow-layer svg'); }],
  ['porcupine', 'Porcupine', 'cardium', 2, 'three taps on the bush', async (page) => { await tapOn(page, '.bush-layer svg', 3); }],
  ['gopherLunch', 'Gopher Lunch', 'cardium', 2, 'a press of Hint', async (page) => { await page.locator('.controls [data-act="hint"]').click(); }],
  ['sam', 'Safety Sam', 'cardium', pick(R.cardium, (l) => bumper(l, 'right') ?? bumper(l, 'left')).li, 'three bumps in a row', async (page, lv) => { const b = bumper(lv, 'right') ?? bumper(lv, 'left'); await drag(page, b.id, b.first, 260); await drag(page, b.id, b.again, 260); await drag(page, b.id, b.again, 260); }],
  ['tongue', 'Frozen Tongue', 'duvernay', 2, 'three taps on the frosty riser', async (page) => { await tapOn(page, '.riser-layer svg g', 3); }],
  ['surveyor', 'Surveyor', 'cardium', 2, 'a press of Restart', async (page) => { await page.locator('.controls [data-act="restart"]').click(); }],
  ['deer', 'Back Scratcher', 'cardium', 2, 'a tap on the lease sign', async (page) => { await tapOn(page, '.sign-layer svg'); }],
  ['tourists', 'Tourists', 'daily', 0, 'the first move on the Daily Pad', async (page, lv) => { const m = plan(lv)[0]; await play(page, m); }],
  ['muskeg', 'Muskeg Boots', 'mannville', 2, 'three taps on the big muskeg puddle', async (page) => { const pt = await page.evaluate(() => { const ps = [...document.querySelectorAll('.mann-layer path[fill="#4f4a2c"]')].map((p) => p.getBoundingClientRect()).sort((a, b) => b.width - a.width)[0]; return { x: ps.left + ps.width / 2, y: ps.top + ps.height / 2 }; }); await tapAt(page, pt, 3); }],
  ['catTrain', 'Cat Train', 'mannville', 1, 'a convoy driven out in order, one right after the other', async (page, lv) => { let s = newGame(lv); for (const m of solve(lv)) { const t = s.trucks.find((x) => x.id === m.id), r = tryMove(s, m.id, m.delta); await drag(page, m.id, m.delta + Math.sign(m.delta) * (r.exited ? 0.4 : 0)); s = r.state; if (r.exited && t.convoy === 1) { const two = s.trucks.find((x) => x.color === t.color && x.convoy === 2), d = getMoveRange(s, two.id).exitDelta; await drag(page, two.id, d + Math.sign(d) * 0.4, 60); break; } } }],
  ['beaver', 'Beaver', 'mannville', 2, 'three taps on the tall aspen', async (page) => { await tapOn(page, '.mann-front svg svg', 3); }],
  ['aurora', 'Aurora Howl', 'mannville', 2, 'night, and a tap on the moon', async (page) => { await wait(600); await tapOn(page, '.night-sky circle[stroke]'); }, 'night=1'],
  ['tumbleweed', 'Tumbleweed', 'bakken', 2, 'a truck driven the whole length of the pad in one move', async (page, lv) => { let s = newGame(lv); const full = (st) => { for (const t of st.trucks) { const r = getMoveRange(st, t.id), far = 6 - t.length, at = t.orient === 'h' ? t.col : t.row; if (at === 0 && r.max >= far && r.exitDelta !== far) return { id: t.id, delta: far }; if (at === far && r.min <= -far && r.exitDelta !== -far) return { id: t.id, delta: -far }; } return null; }; for (const m of [null, ...solve(lv)]) { if (m) { const r = tryMove(s, m.id, m.delta); await drag(page, m.id, m.delta + Math.sign(m.delta) * (r.exited ? 0.4 : 0)); s = r.state; } const f = full(s); if (f) { await drag(page, f.id, f.delta, 60); break; } } }],
  ['pdogs', 'Prairie Dog Wave', 'bakken', 2, 'three taps on one spot of the prairie', async (page) => { const pt = await page.evaluate(() => { const b = document.querySelector('.board').getBoundingClientRect(), n = document.querySelector('.note').getBoundingClientRect(); return { x: innerWidth * 0.3, y: (b.bottom + n.top) / 2 + 6 }; }); await tapAt(page, pt, 3); }],
  ['bale', 'Runaway Bale', 'bakken', 0, 'a bump down into the bottom berm beside the round bale', async (page, lv) => { let s = newGame(lv); const bump = (st) => st.trucks.map((t) => ({ t, r: getMoveRange(st, t.id) })).find(({ t, r }) => t.orient === 'v' && t.col >= 4 && r.exitDelta !== r.max && t.row + t.length + r.max === 6); for (const m of [null, ...solve(lv)]) { if (m) { const r = tryMove(s, m.id, m.delta); await drag(page, m.id, m.delta + Math.sign(m.delta) * (r.exited ? 0.4 : 0)); s = r.state; } const b = bump(s); if (b) { await drag(page, b.t.id, b.r.max + 0.6, 60); break; } } }],
  ['cloud', 'Personal Cloud', 'bakken', 2, 'three taps on the sky', async (page) => { const pt = await page.evaluate(() => { const b = document.querySelector('.board').getBoundingClientRect(), h = document.querySelector('.hud').getBoundingClientRect(); return { x: innerWidth * 0.5, y: (h.bottom + b.top) / 2 }; }); await tapAt(page, pt, 3); }],
  ['golf', 'Three Swings', 'clearwater', 1, 'three taps on the rig mat stack', async (page) => { await tapOn(page, '.clear-mats .cw-mats', 3); }],
  ['cold', 'Out Cold', 'clearwater', 1, 'three taps on the rig mat stack, Three Swings already in the log', async (page) => { await tapOn(page, '.clear-mats .cw-mats', 3); }, '', ['swings']],
  ['wash', 'Fresh Wash', 'clearwater', 1, 'a tap on the mud puddle', async (page) => { await tapOn(page, '.clear-ground path[fill="#6b5a3a"]'); }],
  ['bell', 'Dinner Bell', 'clearwater', 0, 'five trucks driven out in a row', async (page, lv) => { const p = plan(lv), k = p.findIndex((m, i) => p.slice(i, i + 7).every((x) => x.out) && p.slice(i, i + 7).length === 7); for (const m of p.slice(0, k + 5)) await play(page, m); }],
  ['pea', 'One Pea', 'clearwater', 0, 'five trucks driven out in a row, Dinner Bell already in the log', async (page, lv) => { const p = plan(lv), k = p.findIndex((m, i) => p.slice(i, i + 7).every((x) => x.out) && p.slice(i, i + 7).length === 7); for (const m of p.slice(0, k + 5)) await play(page, m); }, '', ['bell']],
  ['biffyA', 'Occupied, on the Big Pad', 'clearwater', pick(R.clearwater, (l) => bumper(l, 'bottom')).li, 'one bump down into the bottom berm', async (page, lv) => { const b = bumper(lv, 'bottom'); await drag(page, b.id, b.first); }],
  ['biffyB', 'The Runaway Roll, on the Big Pad', 'clearwater', pick(R.clearwater, (l) => bumper(l, 'bottom')).li, 'two bumps down into the bottom berm, one right after the other', async (page, lv) => { const b = bumper(lv, 'bottom'); await drag(page, b.id, b.first, 200); await drag(page, b.id, b.again, 200); }],
];

console.log(`\nwebkit ${VW} x ${VH} at ${ROOT}: every sighting, on its real trigger`);
for (const [id, name, where, li, how, act, query = '', log = null] of CASES) {
  if (ONLY && ONLY !== id) continue;
  const { context, page, errors } = await open([PINS, 'night=0', query].filter(Boolean).join('&').replace(/night=0&(.*night=1)/, '$1'), log);
  let level;
  if (where === 'daily') { level = DAILY_LEVELS[padLevelIndex(padNumber(dayKey(new Date())), DAILY_LEVELS.length)]; await enterDaily(page); } else { level = REGIONS[R[where]].levels[li]; await enter(page, R[where], li); }
  await act(page, level);
  const got = await playing(page, id, id === 'aurora' ? { within: 9000, watch: 4200 } : {});
  verdict(name, where === 'daily' ? 'Daily Pad' : `${REGIONS[R[where]].name} ${li + 1}`, got, how);
  if (errors.length) check(false, `${name}: a script error (${errors[0]})`);
  await context.close();
}

// ---------- 2. every tappable prop in every region answers a tap ----------
/** What answered: a sighting that began, or the prop's own shake or knock. */
const answered = (page, sel) => page.evaluate((s) => {
  const gag = [...document.querySelectorAll('.strip-layer[data-gag]')].map((l) => l.dataset.gag)[0] ?? (document.querySelector('.magpie-layer svg.magpie') ? 'magpie' : null);
  const moved = s && [...document.querySelectorAll(s)].some((e) => e.classList.contains('prop-knock') || e.classList.contains('shake') || e.dataset.knocked);
  return gag ? `the ${gag} sighting` : moved ? 'a knock of its own' : null;
}, sel);
const PROPS = {
  cardium: [['the biffy', '.biffy-layer svg', 1], ['the bush', '.bush-layer svg', 3], ['the lease sign', '.sign-layer svg', 1], ["the gopher's mound", '[data-anchor="mound"]', 1], ['a truck', '.truck', 1]],
  montney: [['the biffy', '.biffy-layer svg', 1], ['the cow', '.cow-layer svg', 1], ['the lease sign', '.sign-layer svg', 1], ['the flare stack', '.obstacle.flare', 3]],
  duvernay: [['the biffy', '.biffy-layer svg', 1], ['the snowy bush', '.bush-layer svg', 3], ['the frosty riser', '.riser-layer svg g', 3], ['the lease sign', '.sign-layer svg', 1]],
  mannville: [['the biffy', '.biffy-layer svg', 1], ['the big muskeg puddle', '.mann-layer path[fill="#4f4a2c"]', 3], ['the tall aspen', '.mann-front svg svg', 3], ['the lease sign', '.sign-layer svg', 1]],
  bakken: [['the biffy', '.biffy-layer svg', 1], ['the round bale', '.bakken-layer svg > *', 1], ['the lease sign', '.sign-layer svg', 1]],
  clearwater: [['the biffy', '.biffy-layer svg', 1], ['the rig mat stack', '.clear-mats .cw-mats', 3], ['the mud puddle', '.clear-ground path[fill="#6b5a3a"]', 1]],
};
if (!ONLY) {
  console.log(`\nwebkit ${VW} x ${VH}: every tappable prop answers a tap`);
  for (const [region, props] of Object.entries(PROPS)) {
    const li = region === 'montney' ? REGIONS[R.montney].levels.findIndex((l) => l.obstacles.some((o) => o.kind === 'flare')) : 2;
    const standing = [];
    for (const [name, sel, taps] of props) {
      const { context, page } = await open(`${PINS}&night=0`);
      await enter(page, R[region], li);
      const there = await tapOn(page, sel, taps);
      await wait(700);
      const what = there ? await answered(page, sel.replace(/ svg g$| svg svg$| svg > \*$| path\[.*$/, ' svg') + ', ' + sel) : null;
      check(!!what, `${REGIONS[R[region]].name}: ${name}, tapped${taps > 1 ? ` ${taps} times` : ''}: ${!there ? 'IT IS NOT THERE' : what ?? 'NOTHING HAPPENED'}`);
      if (name === 'the biffy') standing.push(...(await page.evaluate(() => [...document.querySelectorAll('.depth-strip > .prop-layer, .depth-strip > .scene-prop, .depth-strip > .biffy-layer')].map((e) => e.className.replace(/scene-layer|puppet-layer|prop-layer|scene-prop|scene-front/g, '').trim()))));
      await context.close();
    }
    // (And no prop stands there that the list above does not tap.)
    const known = { 'biffy-layer': 1, 'bush-layer': 1, 'sign-layer': 1, 'cow-layer': 1, 'riser-layer': 1, 'mann-layer': 1, 'mann-front': 1, 'bakken-layer': 1, 'clear-ground': 1, 'clear-layer': 1, 'clear-mats': 1 };
    const odd = standing.filter((c) => !known[c.split(/\s+/)[0]]);
    check(odd.length === 0 && (region !== 'clearwater' || !standing.some((c) => c.startsWith('sign-layer'))), `${REGIONS[R[region]].name}: every prop standing in its strip is one of those (${[...new Set(standing.map((c) => c.split(/\s+/)[0]))].join(', ')})${region === 'clearwater' ? '; no lease sign on the Big Pad' : ''}`);
  }
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
