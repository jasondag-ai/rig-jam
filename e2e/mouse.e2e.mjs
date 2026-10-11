// MOUSE AND TRACKPAD PLAY ON A MAC (job U14), tested LIKE A REAL HAND: a real mouse (the browser's own mouse events,
// never dispatched ones), a 150 ms hold before it moves, slow drags and quick ones, let go still moving or after a
// pause, on the truck, off it, off the board and outside the window, and one drag straight after another. In Chrome's
// engine and Safari's, at 1280 x 720 and 1440 x 900, WITH FLING ON as real people have it (`?fling=1`: an automated
// browser has it off otherwise, which is why the old scripted drags never saw what a mouse does).
//   EVERY TRUCK ENDS WHERE THE DRAG SAYS: the nearest cell to where it was let go, inside its range. A mouse never flings.
//   A DRAG IS NEVER LEFT STUCK: the window losing focus, a release that never arrived, a new press.
//   NOTHING OF THE BROWSER'S OWN starts from the board: no picture drag, no text selection.
//   `?pointerlog=1` shows the last 15 pointer events and the drag's state; without it there is no such box.
// Needs the dev server (URL=, default the dev build on 5181). `ONLY=chromium|webkit`, `VIEW=1280x720`.
import { chromium, webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5181/';
const SIZES = process.env.VIEW ? [process.env.VIEW.split('x').map(Number)] : [[1280, 720], [1440, 900]];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
const QUIET = 'demo=1&cover=0&fling=1&night=0&magpie=0&worker=0&moose=0&soundnudge=0&off=landowner,sam,geese,biffya,biffyb,tongue,bear';

// THE PAD: Duvernay 7 with its first eight moves made: three trucks left, D with four free cells down its lane, F
// with two up, B with one left. (No level starts with four free cells for one truck.)
const RI = 2, LI = 6, PRE = 8;
const level = REGIONS[RI].levels[LI], line = solve(level);
let base = newGame(level);
for (const m of line.slice(0, PRE)) base = tryMove(base, m.id, m.delta).state;
const free = (id) => { const r = getMoveRange(base, id); return { up: r.exitDelta === r.max ? 0 : r.max, down: r.exitDelta === r.min ? 0 : -r.min, r }; };
const LONG = base.trucks.map((t) => ({ t, f: free(t.id) })).find(({ f }) => f.up >= 4 || f.down >= 4);
const OTHERS = base.trucks.filter((t) => t.id !== LONG.t.id).map((t) => ({ t, f: free(t.id) })).filter(({ f }) => f.up >= 1 || f.down >= 1);
const dirOf = (f) => (f.up >= f.down ? 1 : -1);

for (const [name, type] of [['chromium', chromium], ['webkit', webkit]].filter(([n]) => !process.env.ONLY || process.env.ONLY === n)) {
  const browser = await type.launch();
  for (const [W, H] of SIZES) {
    console.log(`\n${name} ${W} x ${H}: a real mouse, fling on as people have it`);
    const context = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${ROOT}?${QUIET}`, { waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(RI).click();
    await page.locator('.level-btn').nth(LI).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(500);
    const at = (id) => page.evaluate((id) => { const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`); if (!el) return null; const q = el.getBoundingClientRect(), b = document.querySelector('.board').getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, h: el.classList.contains('horiz'), cell: parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')), dragging: el.classList.contains('dragging'), board: { l: b.left, t: b.top, r: b.right, b: b.bottom } }; }, id);
    const moves = () => page.evaluate(() => parseInt(document.querySelector('.hud .moves').textContent, 10));
    /**
     * A drag as a hand makes it: to the truck, press, HOLD 150 ms, then along its lane at `speed` px a second (off slowly,
     * across, as a wrist does), `drift` px sideways by the end, and let go after `pause` ms (0 = still moving).
     * `to`: [dx, dy] in px from the press, if it is not straight down the lane.
     */
    async function hand(id, cells, { speed = 320, pause = 140, drift = 0, hold = 150, recoil = 0, to = null, up = true } = {}) {
      const a = await at(id);
      await page.mouse.move(a.x - 30, a.y - 22); await wait(30);
      await page.mouse.move(a.x, a.y, { steps: 6 });
      await page.mouse.down();
      await wait(hold);
      const dx = to ? to[0] : (a.h ? cells * a.cell : drift), dy = to ? to[1] : (a.h ? drift : cells * a.cell);
      const dist = Math.hypot(dx, dy), ms = (dist / speed) * 1000, steps = Math.max(3, Math.round(ms / 11));
      for (let k = 1; k <= steps; k++) { const f = k / steps, e = pause ? (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2) : f; await page.mouse.move(a.x + dx * e, a.y + dy * e); await wait(ms / steps); }
      // (A hand letting a button go often jerks back a few pixels as it does.)
      if (recoil) for (let k = 1; k <= 3; k++) { await page.mouse.move(a.x + dx - Math.sign(dx || 0) * recoil * (k / 3), a.y + dy - Math.sign(dy || 0) * recoil * (k / 3)); await wait(7); }
      if (pause) await wait(pause);
      if (up) await page.mouse.up();
      return a;
    }
    /** Where a truck stands now, in cells from where it stood (`a`: what `hand` gave back). */
    const went = async (id, a) => { await wait(520); const z = await at(id); return z ? Math.round((((a.h ? z.x - a.x : z.y - a.y)) / a.cell) * 100) / 100 : null; };
    const undo = async () => { await page.locator('.controls [data-act="undo"]').click(); await wait(420); };

    // (Out of shot, the first eight moves, quickly, with the mouse too.)
    let st = newGame(level);
    for (const m of line.slice(0, PRE)) { const r = tryMove(st, m.id, m.delta); st = r.state; const a = await at(m.id); await page.mouse.move(a.x, a.y); await page.mouse.down(); await wait(40); const d = (m.delta + (r.exited ? Math.sign(m.delta) * 0.6 : 0)) * a.cell; for (let k = 1; k <= 6; k++) { await page.mouse.move(a.x + (a.h ? d * k / 6 : 0), a.y + (a.h ? 0 : d * k / 6)); await wait(12); } await wait(60); await page.mouse.up(); await wait(r.exited ? 900 : 300); }
    const m0 = await moves();
    check(m0 === PRE && (await page.locator('.board .truck:not(.exiting)').count()) === base.trucks.length, `the pad is set with the mouse itself: ${PRE} moves made, ${base.trucks.length} trucks left (${LONG.t.id} has ${Math.max(LONG.f.up, LONG.f.down)} free cells)`);
    const L = LONG.t.id, dir = dirOf(LONG.f);

    // 1. Slow and quick drags of 1 to 4 cells; let go after a pause, and let go still moving.
    for (const [label, opts] of [['slow, let go after a pause', { speed: 300, pause: 140 }], ['quick, let go still moving', { speed: 1500, pause: 0 }], ['very quick, let go still moving', { speed: 3200, pause: 0 }]]) {
      const got = [];
      for (const n of [1, 2, 3, 4]) { const a = await hand(L, dir * n, opts); got.push(await went(L, a)); const mv = await moves(); if (mv === PRE + 1) await undo(); }
      check(got.join() === [1, 2, 3, 4].map((n) => dir * n).join(), `${label}: drags of 1, 2, 3 and 4 cells land ${got.join(', ')} cells along (no fling, no snap back)`);
    }
    // 2. The nearest cell to where it was let go.
    { const a1 = await hand(L, dir * 1.38); const g1 = await went(L, a1); if (await moves() > PRE) await undo(); const a2 = await hand(L, dir * 1.62, { speed: 900, pause: 0 }); const g2 = await went(L, a2); if (await moves() > PRE) await undo(); const a3 = await hand(L, dir * 0.4); const g3 = await went(L, a3); const mv = await moves();
      check(g1 === dir && g2 === dir * 2 && g3 === 0 && mv === PRE, `it lands on the nearest cell: 1.38 cells > ${g1}, 1.62 cells > ${g2}, 0.4 of a cell > back where it was (no move counted)`); }
    // 3. The little jerk back as the button is let go (what read as a flick and flung the truck back).
    { const a = await hand(L, dir * 2, { speed: 1300, pause: 0, recoil: 14 }); const g = await went(L, a); if (await moves() > PRE) await undo(); const b = await hand(L, dir * 3, { speed: 2000, pause: 0, recoil: 22 }); const g2 = await went(L, b); if (await moves() > PRE) await undo();
      check(g === dir * 2 && g2 === dir * 3, `let go with a jerk back of the hand: 2 cells > ${g}, 3 cells > ${g2} (it stays where it was let go)`); }
    // 4. Let go off the truck (the hand drifted sideways), off the board, and outside the window.
    { const a = await hand(L, dir * 2, { drift: 150 }); const g = await went(L, a); if (await moves() > PRE) await undo();
      const b = await hand(L, dir * 3, { drift: -170, speed: 1100, pause: 0 }); const g2 = await went(L, b); if (await moves() > PRE) await undo();
      check(g === dir * 2 && g2 === dir * 3, `let go off the truck (150 px to one side, 170 px to the other): 2 cells > ${g}, 3 cells > ${g2}`); }
    { const a0 = await at(L); const far = a0.h ? [dir > 0 ? a0.board.r + 60 - a0.x : a0.board.l - 60 - a0.x, 40] : [40, dir > 0 ? a0.board.b + 60 - a0.y : a0.board.t - 60 - a0.y];
      const a = await hand(L, 0, { to: far, speed: 700 }); const g = await went(L, a); if (await moves() > PRE) await undo();
      const end = dir * Math.max(LONG.f.up, LONG.f.down);
      check(g === end, `dragged right off the board and let go there: it stops at the end of its lane (${g} cells) and stays`);
      const out = a0.h ? [dir > 0 ? W + 80 - a0.x : -80 - a0.x, 0] : [0, dir > 0 ? H + 80 - a0.y : -80 - a0.y];
      const b = await hand(L, 0, { to: out, speed: 1200, pause: 60 }); const g2 = await went(L, b); const still = (await at(L)).dragging; if (await moves() > PRE) await undo();
      check(g2 === end && !still, `dragged outside the window and let go there: it lands at the end of its lane (${g2} cells), not left hanging`); }
    // 5. Back to back: one drag straight after another, on three trucks.
    { const seq = [[L, dir * 2], ...OTHERS.slice(0, 2).map(({ t, f }) => [t.id, dirOf(f)])], got = [];
      for (const [id, n] of seq) { const a = await hand(id, n, { speed: 1000, pause: 0, hold: 150 }); await wait(60); got.push([id, a]); }
      const where = []; for (const [id, a] of got) where.push(await went(id, a));
      const mv = await moves();
      check(where.join() === seq.map(([, n]) => n).join() && mv === PRE + seq.length, `back to back, 60 ms apart: ${seq.map(([id, n]) => `${id} ${n}`).join(', ')} all land (${where.join(', ')}; ${mv - PRE} moves)`);
      for (let k = 0; k < seq.length; k++) await undo(); }
    // 6. Out through its gate with the mouse (a move the game then makes itself).
    { const outer = base.trucks.map((t) => ({ t, r: getMoveRange(base, t.id) })).find(({ r }) => r.exitDelta !== null && r.exitDelta !== 0 && r.exitDelta !== undefined);
      if (outer) { const a = await hand(outer.t.id, outer.r.exitDelta + Math.sign(outer.r.exitDelta) * 0.5, { speed: 900, pause: 0 }); await wait(1200); const gone = (await at(outer.t.id)) === null; const mv = await moves(); check(gone && mv === PRE + 1, `${outer.t.id} dragged out through its gate: gone, one move`); void a; await undo(); await wait(300); }
      else check(true, 'no truck can leave from this position (skipped the drive out)'); }
    // 7. NEVER LEFT STUCK. The window loses focus in the middle of a drag: the truck goes back, and the next drag works.
    { const a = await hand(L, dir * 2, { up: false, pause: 80 });
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await wait(450);
      const z = await at(L), back = Math.abs((a.h ? z.x - a.x : z.y - a.y)) < 1 && !z.dragging, mv = await moves();
      await page.mouse.up();
      const b = await hand(L, dir * 1); const g = await went(L, b); if (await moves() > PRE) await undo();
      check(back && mv === PRE && g === dir, `the window loses focus in mid-drag: the truck goes back, nothing is counted, and the next drag lands (${g})`); }
    // A release that never arrives (let go over another app): the next move of the mouse with no button down ends it as a release.
    { const a = await hand(L, dir * 2, { up: false, pause: 80 });
      await page.evaluate(([x, y]) => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0, clientX: x, clientY: y, bubbles: true })), [a.x + (a.h ? dir * 2 * a.cell : 0), a.y + (a.h ? 0 : dir * 2 * a.cell)]);
      const g = await went(L, a), z = await at(L), mv = await moves();
      await page.mouse.up();
      check(g === dir * 2 && !z.dragging && mv === PRE + 1, `a release that never arrived: the mouse seen moving with no button down ends the drag where the truck stands (${g} cells, one move)`);
      if (mv > PRE) await undo(); }
    // A new press while an old drag is still on the books: the old one is put back and the new one begins.
    { const other = OTHERS[0], a = await hand(L, dir * 2, { up: false, pause: 80 });
      const o = await at(other.t.id);
      await page.evaluate(([id, x, y]) => document.querySelector(`.truck[data-id="${id}"]`).dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, clientX: x, clientY: y, bubbles: true, cancelable: true })), [other.t.id, o.x, o.y]);
      await wait(400);
      const z = await at(L), back = Math.abs((a.h ? z.x - a.x : z.y - a.y)) < 1 && !z.dragging, now = (await at(other.t.id)).dragging;
      await page.mouse.up(); await wait(400);
      const idle = !(await at(other.t.id)).dragging, mv = await moves();
      check(back && now && idle && mv === PRE, `a new press while a drag is still on: ${L} goes back, ${other.t.id} is picked up, and letting go ends that one too`); }
    // 8. Nothing of the browser's own: no selection after all that dragging, no native drag of a truck's picture.
    { const n = await page.evaluate(() => { const img = document.querySelector('.board .truck img.sprite'); const e = new DragEvent('dragstart', { bubbles: true, cancelable: true }); const start = img.dispatchEvent(e); const s = new Event('selectstart', { bubbles: true, cancelable: true }); const sel = document.querySelector('.board .truck').dispatchEvent(s); const cs = getComputedStyle(document.querySelector('.board')); return { selected: String(getSelection()), dragAllowed: start, selectAllowed: sel, userSelect: cs.userSelect || cs.webkitUserSelect, scrollY, scrollX }; });
      check(n.selected === '' && !n.dragAllowed && !n.selectAllowed && n.userSelect === 'none' && n.scrollY === 0 && n.scrollX === 0, `nothing of the browser's own from the board: no text selected, a picture's drag and a selection are refused, the page has not scrolled (user-select ${n.userSelect})`); }
    check((await page.locator('.pointer-log').count()) === 0 && errors.length === 0, `no pointer log unless it is asked for; no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();

    // 9. ?pointerlog=1
    { const c2 = await browser.newContext({ viewport: { width: W, height: H } }); const p2 = await c2.newPage();
      await p2.goto(`${ROOT}?${QUIET}&pointerlog=1`, { waitUntil: 'networkidle' });
      await p2.locator('.region-tab').nth(0).click(); await p2.locator('.level-btn').nth(5).click(); await p2.waitForSelector('.board .truck.sprite-on'); await wait(400);
      const t = await p2.evaluate(() => { const el = [...document.querySelectorAll('.board .truck')].find((e) => e.classList.contains('vert')); const q = el.getBoundingClientRect(); return { id: el.dataset.id, x: q.x + q.width / 2, y: q.y + q.height / 2 }; });
      await p2.mouse.move(t.x, t.y, { steps: 4 }); await p2.mouse.down(); await wait(150);
      for (let k = 1; k <= 20; k++) { await p2.mouse.move(t.x + k, t.y + k * 2); await wait(10); }
      const mid = await p2.evaluate(() => document.querySelector('.pointer-log').textContent.split('\n'));
      await p2.mouse.up(); await wait(400);
      for (let k = 0; k < 12; k++) { await p2.mouse.move(300 + k * 40, 200 + (k % 2) * 300); await p2.mouse.down(); await p2.mouse.up(); }
      const end = await p2.evaluate(() => { const b = document.querySelector('.pointer-log'); return { lines: b.textContent.split('\n'), pe: getComputedStyle(b).pointerEvents }; });
      check(mid[0].startsWith(`drag ${t.id}:`) && /mouse #1/.test(mid[0]) && mid.some((l) => /^down mouse#1 b1 .* truck/.test(l)) && mid.some((l) => /^move mouse#1 b1 .* x\d+/.test(l)), `?pointerlog=1, in mid-drag: "${mid[0]}", the press and the moves listed ("${mid.at(-1)}")`);
      check(end.lines[0] === 'no drag' && end.lines.length === 16 && end.pe === 'none', `after it: "no drag", the last 15 events and no more (${end.lines.length - 1}), and the box takes no clicks`);
      await c2.close(); }
  }
  await browser.close();
}
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
