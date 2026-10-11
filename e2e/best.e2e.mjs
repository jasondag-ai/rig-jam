// THE BEST SCORE STILL POSSIBLE (job U12; src/ui/best.ts), in WebKit at iPhone DPR 3, at Safari's visible sizes
// 375 x 635 and 390 x 664.
//  NORMAL PLAY: the line shows only while a hint shows, from the hint's own solve: "Best from here: N" at par,
//    "Par out of reach: best N" (the warning colour) after a wasted move; never by a free move or a free Undo.
//  THE HIDDEN ?demo=1 LINK: always on, on every kind of pad (each region, the Big Pad, the Daily Pad, the Sunday
//    Turnaround), by day and by night, right after every move, Undo and Restart; the board never waits for it; nothing
//    is saved. Settings' own demo switch does not turn it on.
//  IT COVERS NOTHING AND MOVES NOTHING: inside the HUD, clear of the title and the near misses, the HUD no taller and
//    the lease where it was.
// Needs the dev server (URL=, default the dev build on 5181). `ONLY=normal|demo`. `VIEW=390x664`.
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import { REGIONS } from '../src/levels/regions.ts';
import daily from '../src/levels/daily.json' with { type: 'json' };
import { getMoveRange, newGame, parseLevel, solve, tryMove } from '../src/engine/index.ts';
import { dayKey, padNumber } from '../src/ui/daily.ts';
import { padSlot } from '../src/ui/daily-pads.ts';

const ROOT = process.env.URL ?? 'http://localhost:5181/';
const ONLY = process.env.ONLY;
const SIZES = process.env.VIEW ? [process.env.VIEW.split('x').map(Number)] : [[375, 635], [390, 664]];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
const QUIET = 'cover=0&magpie=0&worker=0&moose=0&soundnudge=0&tourists=0&surveyor=0&lunch=0&off=nearmiss,landowner,biffya,biffyb,sam,geese,tumbleweed,cattrain,bale,bell,pea,mosquito,overweight';
const browser = await webkit.launch();

const drag = (page, id, cells, out) => page.evaluate(async ([id, n, ms]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`), q = el.getBoundingClientRect(), h = el.classList.contains('horiz'), cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = q.x + q.width / 2, y = q.y + q.height / 2;
  const ev = (t) => el.dispatchEvent(new PointerEvent(t, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown');
  for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((r) => setTimeout(r, 17)); }
  await new Promise((r) => setTimeout(r, 70));
  ev('pointerup');
  await new Promise((r) => setTimeout(r, ms));
}, [id, cells + (out ? Math.sign(cells) * 0.4 : 0), out ? 900 : 350]);
/** What the HUD shows, and where: the line, the boxes beside it, the HUD and the lease. */
const hud = (page) => page.evaluate(() => {
  const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const best = document.querySelector('.hud .best'), text = best.textContent;
  // (The words themselves, not their row: a range over the text.)
  let words = null;
  // (Its ink: the range's box is the font's whole line, a little taller than the letters; 2 px off the top and the bottom of it.)
  if (text) { const g = document.createRange(); g.selectNodeContents(best); const r = g.getBoundingClientRect(); words = { l: r.left, t: r.top + 2, r: r.right, b: r.bottom - 2 }; }
  const cs = getComputedStyle(best);
  return { text, n: best.dataset.n, over: best.classList.contains('over'), colour: cs.color, shown: cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.9, words, hud: box('.hud'), board: box('.board'), title: box('.hud .title'), name: box('.hud .name'), num: box('.hud .num'), row: box('.hud .score-row'), pill: box('.hud .misses'), link: box('.hud [data-act="levels"]'), moves: document.querySelector('.hud .moves').textContent, hints: document.querySelector('.hint-btn')?.textContent.replace(/\s+/g, ' ').trim() };
});
const meets = (a, b) => !!a && !!b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
/** The line is on the screen, inside the HUD, and over none of its neighbours' words or the lease. */
const clear = (h, W) => !!h.words && h.words.l >= 0 && h.words.r <= W && h.words.t >= h.hud.t - 0.5 && h.words.b <= h.hud.b + 0.5 && !meets(h.words, h.board) && !meets(h.words, h.name) && !meets(h.words, h.num) && !meets(h.words, h.pill) && !meets(h.words, h.link);
const same = (a, b) => Math.abs(a.hud.h - b.hud.h) < 0.1 && Math.abs(a.board.t - b.board.t) < 0.1 && Math.abs(a.board.l - b.board.l) < 0.1 && Math.abs(a.board.w - b.board.w) < 0.1;
/** A move that gets nowhere: a truck one cell along and (the second of the pair) back. */
const wasted = (state) => { for (const t of state.trucks) { const r = getMoveRange(state, t.id); if (r.max >= 1 && r.exitDelta !== 1 && !(state.level.muskeg ?? []).length) return { id: t.id, d: 1 }; if (r.min <= -1 && r.exitDelta !== -1 && !(state.level.muskeg ?? []).length) return { id: t.id, d: -1 }; } return null; };
const answer = (page, ms = 20000) => page.waitForFunction(() => document.querySelector('.hud .best').textContent !== '', null, { timeout: ms }).then(() => true, () => false);

for (const [W, H] of SIZES) {
  // ---------- NORMAL PLAY ----------
  if (!ONLY || ONLY === 'normal') {
    console.log(`\nwebkit ${W} x ${H}: normal play, the line comes with a hint`);
    const level = REGIONS[0].levels[4], line = solve(level);
    const best = Object.fromEntries(REGIONS[0].levels.slice(0, 4).map((l) => [l.id, l.par]));
    const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true });
    await context.addInitScript((p) => { if (!localStorage.getItem('rush-hour-rigs:v2')) localStorage.setItem('rush-hour-rigs:v2', p); }, JSON.stringify({ best, hints: 6, perfect: Object.keys(best), dailyCleared: [], demo: false, announced: [], standDowns: [] }));
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${ROOT}?${QUIET}&night=0`, { waitUntil: 'networkidle' });
    await page.locator('.level-btn').nth(4).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(1500);
    const start = await hud(page);
    check(start.text === '' && !start.shown, 'no hint, no line (and it takes no room)');
    await page.locator('.controls [data-act="hint"]').click();
    await page.waitForFunction(() => document.querySelector('.board .truck.hinted'), null, { timeout: 8000 });
    await wait(200);
    let h = await hud(page);
    check(h.text === `Best from here: ${level.par}` && h.shown && !h.over, `a hint: "${h.text}" under the moves and par (par ${level.par}; the button now reads "${h.hints}")`);
    // (The hint's own two-line message takes its room in the tip line once, as it always has: the lease is compared from here on.)
    const hinted = h;
    check(clear(h, W) && Math.abs(h.hud.h - start.hud.h) < 0.1, `it covers nothing: inside the HUD, clear of the title and the near misses; the HUD still ${h.hud.h} px tall`);
    await page.screenshot({ path: `qc-out/best/normal_${W}x${H}_hint.png` }).catch(() => {});
    await page.locator('.controls [data-act="hint"]').click();
    await wait(400);
    h = await hud(page);
    check(h.text === `Best from here: ${level.par}`, 'the second tap (Where?) keeps it');
    // The hinted move itself: the hint is spent, the line goes.
    let state = newGame(level);
    const r0 = tryMove(state, line[0].id, line[0].delta); state = r0.state;
    await drag(page, line[0].id, line[0].delta, r0.exited);
    h = await hud(page);
    check(h.text === '' && !h.shown && same(hinted, h), `the hinted move played (${h.moves}): the line goes with the hint, and nothing moves as it goes`);
    // A wasted move and back, and a free Undo: nothing shows without a hint.
    const w = wasted(state);
    await drag(page, w.id, w.d, false);
    await drag(page, w.id, -w.d, false);
    h = await hud(page);
    const none1 = h.text === '';
    await page.locator('.controls [data-act="undo"]').click(); await wait(350);
    const none2 = (await hud(page)).text === '';
    await drag(page, w.id, -w.d, false);
    h = await hud(page);
    check(none1 && none2 && h.text === '' && h.moves.startsWith('3 '), `a truck moved and moved back, an Undo, the move again (${h.moves}): still no line. Free moves and free Undo show nothing`);
    await page.locator('.controls [data-act="hint"]').click();
    await page.waitForFunction(() => document.querySelector('.board .truck.hinted'), null, { timeout: 8000 });
    await wait(200);
    h = await hud(page);
    check(h.text === `Par out of reach: best ${level.par + 2}` && h.over && h.colour === 'rgb(255, 210, 31)', `a hint after the wasted move: "${h.text}", in the warning colour (${h.colour})`);
    check(clear(h, W) && same(hinted, h) && h.words.l >= h.hud.l, `and it still covers nothing: the longer line keeps inside the HUD (from ${Math.round(h.words.l)} to ${Math.round(h.words.r)} px), the lease where it was`);
    check(/Where\?/.test(h.hints) && JSON.parse(await page.evaluate(() => localStorage.getItem('rush-hour-rigs:v2'))).hints === 4, 'each of the two hints cost a hint, as ever (6 saved, 4 left)');
    await page.screenshot({ path: `qc-out/best/normal_${W}x${H}_out_of_reach.png` }).catch(() => {});
    await page.locator('.controls [data-act="restart"]').click(); await wait(400);
    h = await hud(page);
    check(h.text === '' && same(hinted, h), 'Restart: the line is gone');
    // Settings' own demo switch (saved demo mode) does not turn it on.
    await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('rush-hour-rigs:v2')); p.demo = true; localStorage.setItem('rush-hour-rigs:v2', JSON.stringify(p)); });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(5).click();
    await page.locator('.level-btn').nth(0).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(2500);
    h = await hud(page);
    check(h.text === '' && !h.shown, "Settings' demo mode (everything unlocked): no line without a hint, on a Big Pad either");
    // By night (Montney, the night pinned): a hint's line is as bright as the HUD.
    await page.goto(`${ROOT}?${QUIET}&night=1`, { waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(1).click();
    await page.locator('.level-btn').nth(2).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(1200);
    const before = await hud(page);
    await page.locator('.controls [data-act="hint"]').click();
    await page.waitForFunction(() => document.querySelector('.board .truck.hinted'), null, { timeout: 8000 });
    await wait(300);
    h = await hud(page);
    check(await page.evaluate(() => document.querySelector('.screen.game').classList.contains('night')) && h.text === `Best from here: ${REGIONS[1].levels[2].par}` && h.shown && clear(h, W) && Math.abs(before.hud.h - h.hud.h) < 0.1, `by night (Montney 3): "${h.text}", as clear as the rest of the HUD, covering nothing`);
    check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();
  }

  // ---------- THE ?demo=1 LINK ----------
  if (!ONLY || ONLY === 'demo') {
    console.log(`\nwebkit ${W} x ${H}: the ?demo=1 link, the line always on`);
    const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${ROOT}?demo=1&${QUIET}&night=0`, { waitUntil: 'networkidle' });
    const pad = padNumber(dayKey(new Date()));
    const turn = parseLevel(JSON.parse(readFileSync(new URL('../public/turnaround/weeks-001-008.json', import.meta.url), 'utf8'))[0]);
    const PADS = [
      ...[[0, 6], [1, 5], [2, 4], [3, 2], [4, 6], [5, 9], [6, 3]].map(([ri, li]) => ({ name: `${REGIONS[ri].name} ${li + 1}`, level: REGIONS[ri].levels[li], open: async () => { await page.locator('.region-tab').nth(ri).click(); await page.locator('.level-btn').nth(li).click(); } })),
      { name: `Daily Pad #${pad}`, level: parseLevel(daily[padSlot(pad) - 1]), open: () => page.locator('.daily-btn').click() },
      { name: 'Sunday Turnaround #1', level: turn, open: () => page.locator('.turn-btn').click() },
    ];
    for (const P of PADS) {
      await page.waitForSelector('.screen.levels .region-tab');
      await P.open();
      await page.waitForSelector('.board .truck.sprite-on');
      const level = P.level, line = solve(level);
      // THE BOARD NEVER WAITS: the first move is made at once, before any answer could be asked for twice.
      let state = newGame(level);
      const first = await hud(page);
      const r0 = tryMove(state, line[0].id, line[0].delta); state = r0.state;
      const t0 = Date.now();
      await drag(page, line[0].id, line[0].delta, r0.exited);
      const moved = (await hud(page)).moves.startsWith('1 ');
      const got = await answer(page);
      const ms = Date.now() - t0;
      let h = await hud(page);
      const ok1 = got && h.text === `Best from here: ${level.par}` && clear(h, W) && same(first, h);
      // Two more moves of the best line: still par, each time.
      let ok2 = true;
      for (const m of line.slice(1, 3)) { const r = tryMove(state, m.id, m.delta); state = r.state; await drag(page, m.id, m.delta, r.exited); ok2 &&= await answer(page); h = await hud(page); ok2 &&= h.text === `Best from here: ${level.par}` && h.n === String(level.par); }
      // A wasted move and back: par is out of reach, by two.
      const w = wasted(state);
      let ok3 = true, out = '';
      if (w) {
        await drag(page, w.id, w.d, false); await answer(page);
        const mid = await hud(page);
        await drag(page, w.id, -w.d, false); await answer(page);
        h = await hud(page); out = h.text;
        ok3 = /^Par out of reach: best \d+$/.test(mid.text) && h.text === `Par out of reach: best ${level.par + 2}` && h.over && clear(h, W) && same(first, h);
        // Undo twice: par is in reach again. Restart: from the top.
        await page.locator('.controls [data-act="undo"]').click(); await wait(300);
        await page.locator('.controls [data-act="undo"]').click(); await wait(300);
        await answer(page); h = await hud(page);
        ok3 &&= h.text === `Best from here: ${level.par}` && !h.over;
      }
      await page.locator('.controls [data-act="restart"]').click(); await wait(300);
      await answer(page); h = await hud(page);
      const ok4 = h.text === `Best from here: ${level.par}` && h.moves.startsWith('0 ');
      check(moved && ok1 && ok2 && ok3 && ok4, `${P.name} (par ${level.par}, ${level.trucks.length} trucks): the first drag is not held up; "Best from here: ${level.par}" ${ms} ms after it and after each move; a wasted move and back: "${out}"; Undo twice and Restart bring par back; it covers nothing${moved && ok1 && ok2 && ok3 && ok4 ? '' : ` [moved ${moved} first ${ok1} line ${ok2} wasted ${ok3} restart ${ok4}: "${h.text}"]`}`);
      if (P === PADS[5] || P === PADS[8]) await page.screenshot({ path: `qc-out/best/demo_${W}x${H}_${P.name.replace(/\W+/g, '_')}.png` }).catch(() => {});
      await page.locator('.hud [data-act="levels"]').click();
    }
    await page.waitForSelector('.screen.levels .region-tab');
    // By night (Duvernay, pinned), and won: the line is there by night and gone once the pad is cleared.
    await page.goto(`${ROOT}?demo=1&${QUIET}&night=1`, { waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(2).click();
    await page.locator('.level-btn').nth(0).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await answer(page);
    let h = await hud(page);
    const lv = REGIONS[2].levels[0];
    check(await page.evaluate(() => document.querySelector('.screen.game').classList.contains('night')) && h.text === `Best from here: ${lv.par}` && h.shown && clear(h, W), `by night (Duvernay 1): "${h.text}", clear of everything`);
    let st = newGame(lv);
    for (const m of solve(lv)) { const r = tryMove(st, m.id, m.delta); st = r.state; await drag(page, m.id, m.delta, r.exited); }
    await page.waitForSelector('.win:not([hidden]) .card', { timeout: 8000 }).catch(() => {});
    h = await hud(page);
    check(h.text === '', 'the pad cleared: no line under the win card');
    const keys = await page.evaluate(() => { const real = Object.getPrototypeOf(localStorage); return Object.keys(localStorage).filter((k) => k.startsWith('rush-hour-rigs')); });
    await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
    const saved = await page.evaluate(() => Object.keys(localStorage).filter((k) => k !== 'rush-hour-rigs:region'));
    check(saved.length === 0 && errors.length === 0, `nothing of it was saved (${saved.join(', ') || 'no keys'}); no errors${errors.length ? ': ' + errors[0] : ''}`);
    void keys;
    await context.close();
  }
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
