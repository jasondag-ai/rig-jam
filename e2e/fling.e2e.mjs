// FLING (October upgrade, job U4): WebKit touch at 375 and 390 (iPhone DPR 3) and Chromium as a Pixel.
//  - a fast flick ends where the engine says (the far end of the truck's range; out through its gate), in one
//    move that Undo takes back; it is no bump, even with the finger running on past the stop
//  - a slow drag, a brisk drag that eases to a stop, and a drag under the fling speed behave as before
//  - pushing still bumps: slowly past a stop, or fast and then held there
//  - ZERO INCIDENT survives a level whose moves are flung wherever the best line allows
//  - hints in a row keep working when the hinted move is flung
//  - the first how-to card says so
// Flinging is OFF in an automated browser unless asked for (`?fling=1`: fling.ts `flingOn`), so every other
// suite's scripted drags stay ordinary drags. Start the dev server first (URL=, default 5181's dev build).
import { chromium, webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, sizeOf, solve, tryMove } from '../src/engine/index.ts';
import { FLING_SPEED } from '../src/ui/fling.ts';

const ROOT = process.env.URL ?? 'http://localhost:5181/';
const QUIET = 'cover=0&night=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&soundnudge=0&worker=0&magpie=0&moose=0&off=sam,nearmiss,landowner,biffya,biffyb,tumbleweed,bale';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
const DEMO = JSON.stringify({ best: {}, hints: 9, perfect: [], dailyCleared: [], demo: true, announced: REGIONS.map((r) => r.id), standDowns: [] });

/** What stops a truck at the end of its range that way: 'truck' (or equipment), 'berm', or 'gate' (it drives out). */
function endOf(state, id, dir) {
  const t = state.trucks.find((x) => x.id === id), r = getMoveRange(state, id), n = sizeOf(state.level);
  const delta = dir > 0 ? r.max : r.min;
  if (delta === r.exitDelta) return { delta, by: 'gate' };
  const pos = (t.orient === 'h' ? t.col : t.row) + delta;
  return { delta, by: (dir > 0 ? pos + t.length === n : pos === 0) ? 'berm' : 'truck' };
}
/** The first truck of a level's start that fits: its range that way is at least `least` and ends at `by`. */
function pick(level, by, least) {
  const s = newGame(level);
  for (const t of s.trucks) for (const dir of [1, -1]) { const e = endOf(s, t.id, dir); if (e.by === by && Math.abs(e.delta) >= least) return { id: t.id, dir, delta: e.delta }; }
  return null;
}
const find = (by, least, regions = [0]) => { for (const ri of regions) for (const [li, level] of REGIONS[ri].levels.entries()) { const p = pick(level, by, least); if (p) return { ri, li, level, ...p }; } return null; };

/**
 * One gesture on a truck, in real time: `steps` are [cells, ms] stretches of the finger along the lane (each in
 * 8 ms pointer moves), then it rests `hold` ms and lifts. Touch-type pointer events, as an iPhone sends.
 */
const gesture = (page, id, steps, hold = 0) => page.evaluate(async ([id, steps, hold]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`), r = el.getBoundingClientRect(), h = el.classList.contains('horiz');
  const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = r.x + r.width / 2, y = r.y + r.height / 2;
  const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 77, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  const until = (t) => new Promise((q) => { const tick = () => (performance.now() >= t ? q() : setTimeout(tick, 1)); tick(); });
  ev('pointerdown');
  await until(performance.now() + 30);
  for (const [cells, ms] of steps) {
    const n = Math.max(1, Math.round(ms / 8)), t0 = performance.now();
    for (let k = 1; k <= n; k++) { await until(t0 + (ms * k) / n); if (h) x += (cells * cell) / n; else y += (cells * cell) / n; ev('pointermove'); }
  }
  if (hold) await until(performance.now() + hold);
  ev('pointerup');
}, [id, steps, hold]);
const flick = (page, id, dir, cells = 1.3, ms = 48) => gesture(page, id, [[dir * cells, ms]]);
const slow = (page, id, delta) => gesture(page, id, [[delta, Math.max(260, Math.abs(delta) * 300)]], 80);

const hud = (page) => page.evaluate(() => ({ moves: parseInt(document.querySelector('.hud .moves').textContent, 10), misses: Number(document.querySelector('.hud .misses b').textContent), bubble: !!document.querySelector('.board .bubble, .bubble'), trucks: document.querySelectorAll('.board .truck:not(.exiting)').length }));
/** Where a truck stands, in cells along its lane from where the level put it. */
const movedBy = (page, level, id) => page.evaluate(([id, row, col]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`);
  if (!el) return null;
  const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')), m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  const h = el.classList.contains('horiz');
  return Math.round((((h ? m.m41 : m.m42) - 3) / cell - (h ? col : row)) * 10) / 10; // (3 px: a truck's gap from its cell's edge)
}, [id, level.trucks.find((t) => t.id === id).row, level.trucks.find((t) => t.id === id).col]);

const PHONES = [
  ['webkit 375 x 667 (iPhone, DPR 3)', webkit, { viewport: { width: 375, height: 667 }, deviceScaleFactor: 3, hasTouch: true }],
  ['webkit 390 x 844 (iPhone, DPR 3)', webkit, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true }],
  ['chromium as a Pixel (412 x 915)', chromium, { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' }],
];

for (const [name, engine, opts] of PHONES) {
  console.log(`\n${name}`);
  const browser = await engine.launch();
  const context = await browser.newContext(opts);
  await context.addInitScript(([p]) => { if (!localStorage.getItem('rush-hour-rigs:v2')) localStorage.setItem('rush-hour-rigs:v2', p); }, [DEMO]);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const enter = async (ri, li, extra = 'fling=1') => {
    await page.goto(`${ROOT}?${QUIET}&${extra}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.region-tab');
    await page.locator('.region-tab').nth(ri).click();
    await wait(300);
    await page.locator('.level-btn').nth(li).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(450);
  };

  // 1. A fast flick up against another truck: the far end of its range, one move, no bump; Undo takes it back.
  {
    const c = find('truck', 2, [0, 1, 2]);
    await enter(c.ri, c.li);
    // (The finger runs on well past the truck's stop, as a flick does.)
    await flick(page, c.id, c.dir, Math.abs(c.delta) + 1.2, 60);
    await wait(700);
    const at = await movedBy(page, c.level, c.id), h = await hud(page);
    check(at === c.delta && h.moves === 1, `a flick of truck ${c.id} (${REGIONS[c.ri].name} ${c.li + 1}) sends it ${c.delta} cells, to the end of its range against another truck (it stands at ${at}); ${h.moves} move`);
    check(h.misses === 0 && !h.bubble, `and that is no bump: ${h.misses} near misses, no line from a driver`);
    await page.locator('[data-act="undo"]').click();
    await wait(400);
    const back = await movedBy(page, c.level, c.id), h2 = await hud(page);
    check(back === 0 && h2.moves === 0, `Undo takes the whole fling back (it stands at ${back}, ${h2.moves} moves)`);

    // The same truck, slowly: one cell and no more. Then a brisk drag that eases to a stop: where the finger left it.
    await slow(page, c.id, c.dir);
    await wait(500);
    const one = await movedBy(page, c.level, c.id);
    check(one === c.dir, `a slow drag of one cell moves it one cell (${one}), as before`);
    await page.locator('[data-act="undo"]').click();
    await wait(400);
    // Fast off the mark (about 20 cells a second), easing right down before the finger lifts.
    await gesture(page, c.id, [[c.dir * 0.6, 30], [c.dir * 0.3, 60], [c.dir * 0.1, 90]]);
    await wait(500);
    const eased = await movedBy(page, c.level, c.id);
    check(eased === c.dir, `a brisk drag that eases to a stop is a drag: one cell (${eased}), not the end of the lane`);
    await page.locator('[data-act="undo"]').click();
    await wait(400);
    // A steady drag under the fling speed, lifted while still moving.
    const under = FLING_SPEED * 0.6;
    await gesture(page, c.id, [[c.dir * 1, Math.round(1000 / under)]]);
    await wait(500);
    const steady = await movedBy(page, c.level, c.id);
    check(steady === c.dir, `a steady drag at ${under.toFixed(1)} cells a second, lifted on the move, is a drag: one cell (${steady})`);
    await page.locator('[data-act="undo"]').click();
    await wait(400);
    // Fast, then the finger stops and rests before it lifts: no fling.
    await gesture(page, c.id, [[c.dir * 1, 45]], 140);
    await wait(500);
    const rested = await movedBy(page, c.level, c.id);
    check(rested === c.dir, `a fast drag whose finger rests before lifting is a drag: one cell (${rested})`);
    await page.locator('[data-act="undo"]').click();
    await wait(400);

    // Pushing still bumps: slowly past the stop; and fast, then held there.
    await gesture(page, c.id, [[c.dir * (Math.abs(c.delta) + 0.8), 700]], 100);
    await wait(500);
    const pushed = await hud(page);
    check(pushed.misses === 1, `pushing it slowly into that truck is a bump, as before: ${pushed.misses} near miss`);
    await page.locator('[data-act="restart"]').click();
    await wait(500);
    await gesture(page, c.id, [[c.dir * (Math.abs(c.delta) + 1.2), 60]], 320);
    await wait(500);
    const held = await hud(page);
    check(held.misses === 1, `a fast shove that is then HELD against it is a bump too: ${held.misses} near miss`);
  }

  // 2. A flick toward its open gate: down the lane and out, one move.
  {
    const c = find('gate', 2, [0, 1, 2, 5]);
    await enter(c.ri, c.li);
    const before = (await hud(page)).trucks;
    await flick(page, c.id, c.dir);
    await wait(250);
    const mid = await page.evaluate((id) => { const e = document.querySelector(`.truck[data-id="${id}"]`); return e ? { flung: e.dataset.flung ?? null, exiting: e.classList.contains('exiting') } : null; }, c.id);
    await wait(1700);
    const h = await hud(page);
    check(h.trucks === before - 1 && h.moves === 1 && h.misses === 0 && mid?.flung === String(c.delta), `a flick of truck ${c.id} (${REGIONS[c.ri].name} ${c.li + 1}) toward its gate ${Math.abs(c.delta)} cells away: it slides there and drives out (${before} trucks, then ${h.trucks}); ${h.moves} move`);
    await page.locator('[data-act="undo"]').click();
    await wait(400);
    check((await hud(page)).trucks === before && (await movedBy(page, c.level, c.id)) === 0, 'Undo brings it back to where it stood');
  }

  // 3. Into the berm: a flick stops at the berm, no bump.
  {
    const c = find('berm', 2, [0, 1]);
    await enter(c.ri, c.li);
    await flick(page, c.id, c.dir, Math.abs(c.delta) + 1.2, 60);
    await wait(700);
    const at = await movedBy(page, c.level, c.id), h = await hud(page);
    check(at === c.delta && h.moves === 1 && h.misses === 0 && !h.bubble, `a flick of truck ${c.id} into the berm stops at the berm (${at} cells), with no near miss`);
  }

  // 4. A whole level with every move flung that the best line allows: ZERO INCIDENT at par.
  {
    let best = null;
    for (const [li, level] of REGIONS[0].levels.entries()) {
      let s = newGame(level), flung = 0, onTruck = 0;
      for (const m of solve(level)) { const e = endOf(s, m.id, Math.sign(m.delta)); if (e.delta === m.delta) { flung++; if (e.by === 'truck') onTruck++; } s = tryMove(s, m.id, m.delta).state; }
      if (onTruck && (!best || flung > best.flung)) best = { li, level, flung, onTruck };
    }
    await enter(0, best.li);
    let s = newGame(best.level);
    for (const m of solve(best.level)) {
      const dir = Math.sign(m.delta), e = endOf(s, m.id, dir);
      if (e.delta === m.delta) await flick(page, m.id, dir, Math.abs(m.delta) + 1.1, 60);
      else await slow(page, m.id, m.delta);
      s = tryMove(s, m.id, m.delta).state;
      await wait(e.by === 'gate' && e.delta === m.delta ? 1500 : 520);
    }
    await page.waitForSelector('.win:not([hidden]) .card', { timeout: 8000 }).catch(() => {});
    await wait(500);
    const win = await page.evaluate(() => ({ zero: !!document.querySelector('.win .zero-incident'), text: document.querySelector('.win .card')?.innerText.replace(/\s+/g, ' ') ?? '' }));
    check(win.zero && win.text.includes(`${best.level.par} moves`) && win.text.includes('0 near misses'), `Cardium ${best.li + 1} cleared with ${best.flung} of its ${best.level.par} moves flung (${best.onTruck} of them stopping against a truck): at par, ZERO INCIDENT ("${win.text.slice(0, 60)}")`);
  }

  // 5. Hints in a row: the hinted move, flung, carries the line on.
  {
    let c = null;
    for (const ri of [0, 1, 2]) for (const [li, level] of REGIONS[ri].levels.entries()) {
      if (c) break;
      const path = solve(level), s = newGame(level), e = endOf(s, path[0].id, Math.sign(path[0].delta));
      if (e.delta === path[0].delta && path.length > 2 && path[1].id !== path[0].id) c = { ri, li, level, path };
    }
    await enter(c.ri, c.li);
    const hinted = () => page.evaluate(() => document.querySelector('.board .truck.hinted')?.dataset.id ?? null);
    await page.locator('[data-act="hint"]').click();
    await page.waitForSelector('.board .truck.hinted', { timeout: 8000 }).catch(() => {});
    const first = await hinted();
    await flick(page, c.path[0].id, Math.sign(c.path[0].delta), Math.abs(c.path[0].delta) + 1, 60);
    await wait(c.path[0].delta === getMoveRange(newGame(c.level), c.path[0].id).exitDelta ? 1600 : 700);
    await page.locator('[data-act="hint"]').click();
    await page.waitForSelector('.board .truck.hinted', { timeout: 8000 }).catch(() => {});
    const second = await hinted();
    check(first === c.path[0].id && second === c.path[1].id, `${REGIONS[c.ri].name} ${c.li + 1}: Hint marks truck ${first}; it is flung; the next Hint marks truck ${second} (the best line's next is ${c.path[1].id})`);
  }

  // 6. The how-to's first card says so, inside the card.
  {
    await page.goto(`${ROOT}?${QUIET}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.brand .help');
    await page.locator('.brand .help').click();
    await page.waitForSelector('.tutorial .t-card');
    await wait(400);
    const card = await page.evaluate(() => { const p = document.querySelector('.t-card[data-card="drag"] p'), c = document.querySelector('.tutorial .card').getBoundingClientRect(), r = p.getBoundingClientRect(), b = document.querySelector('.tutorial .btn-row').getBoundingClientRect(); return { text: p.textContent, inside: r.left >= c.left && r.right <= c.right && r.bottom <= b.top + 1, fits: c.top >= 0 && c.bottom <= innerHeight }; });
    check(card.text.endsWith('Flick a truck to send it all the way.') && card.inside && card.fits, `the first how-to card: "${card.text}", inside the card, over its buttons`);
  }

  // 7. Without `?fling=1` an automated browser's scripted drag stays a drag (every other suite counts on it).
  {
    const c = find('truck', 2, [0, 1, 2]);
    await enter(c.ri, c.li, 'x=1');
    await flick(page, c.id, c.dir, 1.1, 48);
    await wait(600);
    const at = await movedBy(page, c.level, c.id);
    check(at === c.dir, `with flinging not asked for, the same flick is a one-cell drag (${at})`);
  }
  check(errors.length === 0, `no errors on the page${errors.length ? ': ' + errors[0] : ''}`);
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
