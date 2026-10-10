// Screenshots for judging gates and hints: one level per region at 390x844, showing the gates, hint
// step 1 (which truck) and hint step 2 (where it goes), plus one level whose hint is a move out
// through the gate. Saved to OUT (default qc-out/fit_check in the repo; see out.mjs) as gates_<name>.png.
// Also checks what it shows. Run: npm run dev -- --host (in one terminal), then: npm run test:e2e:hints
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, nextMove } from '../src/engine/index.ts';
import { outDir } from './out.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = outDir('fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
/** Whether a level's first hint is a move out through the gate. */
const firstExits = (level) => {
  const s = newGame(level);
  const m = nextMove(s);
  return getMoveRange(s, m.id)?.exitDelta === m.delta;
};
// In each region: the first level whose hint is a slide (not an exit) and has two gates side by side
// if any does; then one exit hint.
const pick = (region, exit) => region.levels.findIndex((l) => firstExits(l) === exit);
const SHOTS = [
  ...REGIONS.map((r, i) => [r.id, i, pick(r, false), false]),
  [`${REGIONS[0].id}_exit`, 0, pick(REGIONS[0], true), true],
];

const browser = await webkit.launch();
for (const reduced of [false, true]) {
  for (const [name, region, index, exits] of reduced ? SHOTS.slice(0, 1) : SHOTS) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('ERR', e.message));
    await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
    await page.evaluate((p) => {
      localStorage.clear();
      localStorage.setItem('rush-hour-rigs:v2', p);
    }, UNLOCKED);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(region).click();
    await page.locator('.level-btn').nth(index).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(900);
    console.log(`\n${name} (level ${index + 1})${reduced ? ', reduced motion' : ''}`);
    if (!reduced) await page.screenshot({ path: join(OUT, `gates_${name}.png`) });

    const gates = await page.evaluate(() => {
      const gs = [...document.querySelectorAll('.gate')];
      const box = (g) => {
        const parts = [...g.querySelectorAll('.g-hinge, .g-latch, .g-leaf')].map((e) => e.getBoundingClientRect());
        return { side: g.dataset.side, i: Number(g.dataset.index), cell: g.getBoundingClientRect(), l: Math.min(...parts.map((r) => r.left)), r: Math.max(...parts.map((r) => r.right)), t: Math.min(...parts.map((r) => r.top)), b: Math.max(...parts.map((r) => r.bottom)), badge: g.querySelector('.g-badge').getBoundingClientRect().width, leaf: g.querySelector('.g-leaf img').src };
      };
      const bs = gs.map(box);
      // Every gate's own posts and leaf stay inside its own cell along the berm (so neighbours never join).
      const own = bs.every((b) => (b.side === 'top' || b.side === 'bottom' ? b.l >= b.cell.left - 0.5 && b.r <= b.cell.right + 0.5 : b.t >= b.cell.top - 0.5 && b.b <= b.cell.bottom + 0.5));
      const pairs = bs.flatMap((a) => bs.filter((b) => b.side === a.side && b.i === a.i + 1).map((b) => (a.side === 'top' || a.side === 'bottom' ? b.l - a.r : b.t - a.b)));
      return { n: gs.length, own, pairs, badge: bs[0].badge, colored: bs.every((b) => /gate-leaf-(red|blue|yellow|green|orange|purple)/.test(b.leaf)) };
    });
    check(gates.n > 0 && gates.colored, `${gates.n} gates, each leaf painted its gate colour`);
    check(gates.own, 'each gate has its own posts, inside its own stretch of berm');
    check(gates.pairs.every((gap) => gap >= 3), `neighbouring gates keep a gap of berm between them (${gates.pairs.map((g) => g.toFixed(0) + 'px').join(', ') || 'none side by side here'})`);
    // (A Big Pad's berm band is thinner, 0.34 of a cell of 44 px, and the badge rides on it: about 15 px there.)
    const big = (REGIONS[region].levels[index].size ?? 6) > 6;
    check(big ? gates.badge >= 14 && gates.badge <= 23 : gates.badge >= 18 && gates.badge <= 23, `badge readable but secondary (${gates.badge.toFixed(0)}px${big ? ', on a Big Pad' : ''})`);

    await page.locator('[data-act="hint"]').click();
    await wait(700);
    const one = await page.evaluate(() => {
      const t = document.querySelector('.truck.hinted');
      if (!t) return null;
      const art = getComputedStyle(t.querySelector('.art'));
      return { rim: art.filter.includes('drop-shadow'), anim: getComputedStyle(t.querySelector('.body')).animationName, lift: getComputedStyle(t.querySelector('.body')).transform !== 'none', shadow: getComputedStyle(t.querySelector('.ground-shadow')).backgroundImage.includes('0.6') };
    });
    check(!!one && one.rim && one.shadow && one.lift, 'hint step 1: a bright rim in the truck colour, lifted, stronger ground shadow');
    check(reduced ? one?.anim === 'none' : one?.anim === 'hint-lift', reduced ? 'no pulse with reduced motion (static rim)' : 'slow pulse');
    if (!reduced) await page.screenshot({ path: join(OUT, `gates_${name}_hint1.png`) });

    await page.locator('[data-act="hint"]').click();
    await wait(700);
    const two = await page.evaluate(() => {
      const g = document.querySelector('.ghost');
      const out = document.querySelector('.gate.hint-out .out-badge');
      const hinted = document.querySelector('.truck.hinted');
      return {
        ghost: g ? { img: g.querySelector('img')?.src ?? '', opacity: Number(getComputedStyle(g.querySelector('.art')).opacity), dashed: getComputedStyle(g).outlineStyle, anim: getComputedStyle(g).animationName, kind: hinted.dataset.kind, color: [...hinted.classList].find((c) => c.startsWith('c-')).slice(2), loaded: g.querySelector('img')?.naturalWidth > 0 } : null,
        out: out ? { text: out.textContent, onGate: !!out.closest('.gate'), anim: getComputedStyle(out).animationName } : null,
      };
    });
    if (exits) check(!!two.out && two.out.text === 'OUT' && two.out.onGate && !two.ghost, 'hint step 2, a move out: the OUT badge is on the gate, no box on the pad');
    else {
      check(!!two.ghost && two.ghost.loaded && two.ghost.img.includes(`/${two.ghost.kind}-${two.ghost.color}`) && Math.abs(two.ghost.opacity - 0.35) < 0.01 && two.ghost.dashed === 'dashed' && !two.out, 'hint step 2: a ghost of the truck itself at 35%, dashed keyline in its colour');
      check(reduced ? two.ghost?.anim === 'none' : two.ghost?.anim === 'ghost-pulse', reduced ? 'no pulse with reduced motion' : 'slow pulse');
    }
    if (!reduced) await page.screenshot({ path: join(OUT, `gates_${name}_hint2.png`) });
    await context.close();
  }
}
// ---------- Hints in a row (Job X): take a hint, play it, again and again, in the game itself ----------
// The kept line used to lose a move after every solve, so the second hint in a row skipped one (on Cardium 9:
// "move B", then "move B back"). Followed to the end, every hint must be a legal move and the level must be
// cleared in exactly par moves. Then: a move that is not the hint, Undo and Restart, and hints still lead home.
{
  const drag = (page, id, cells, settle = 420) => page.evaluate(async ([truckId, n, ms]) => {
    const el = document.querySelector(`.truck[data-id="${truckId}"]:not(.exiting)`), r = el.getBoundingClientRect(), h = el.classList.contains('horiz');
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    let x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 81, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown');
    for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((q) => setTimeout(q, 17)); }
    ev('pointerup');
    await new Promise((q) => setTimeout(q, ms));
  }, [id, cells, settle]);
  const { tryMove, undo, isWon } = await import('../src/engine/index.ts');
  const many = JSON.stringify({ ...JSON.parse(UNLOCKED), hints: 200 });
  /** Presses Hint twice (which truck, then where) and reads the move it shows off the screen. */
  const hintShown = async (page, state) => {
    await page.locator('[data-act="hint"]').click();
    await page.waitForSelector('.truck.hinted', { timeout: 20000 });
    const id = await page.evaluate(() => document.querySelector('.truck.hinted').dataset.id);
    await page.locator('[data-act="hint"]').click();
    await wait(250);
    const range = getMoveRange(state, id);
    const delta = await page.evaluate(([truckId]) => { const g = document.querySelector('.ghost'); if (!g) return null; const t = document.querySelector(`.truck[data-id="${truckId}"]`).getBoundingClientRect(), r = g.getBoundingClientRect(), cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')); const h = document.querySelector(`.truck[data-id="${truckId}"]`).classList.contains('horiz'); return Math.round((h ? r.left - t.left : r.top - t.top) / cell); }, [id]);
    return { id, delta: delta ?? range?.exitDelta ?? 0, exit: delta === null };
  };
  /** Follows hints from where the pad stands to the end. */
  const follow = async (page, state) => {
    const moves = []; let legal = true;
    while (!isWon(state) && moves.length < 60) {
      const h = await hintShown(page, state);
      const r = tryMove(state, h.id, h.delta);
      if (!r) { legal = false; moves.push(h); break; }
      moves.push(h);
      await drag(page, h.id, h.delta + (r.exited ? Math.sign(h.delta) * 0.4 : 0), r.exited ? 900 : 380);
      state = r.state;
    }
    return { state, moves, legal };
  };
  const hud = (page) => page.evaluate(() => parseInt(document.querySelector('.hud').textContent.match(/(\d+)\s*moves?/)?.[1] ?? '-1', 10));
  for (const [id, n] of [['cardium', 9], ['bakken', 7], ['clearwater', 10]]) {
    const ri = REGIONS.findIndex((r) => r.id === id), level = REGIONS[ri].levels[n - 1];
    console.log(`\nwebkit 390x844: hints in a row on ${REGIONS[ri].name} ${n} (par ${level.par})`);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${ROOT}?cover=0&night=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&soundnudge=0&off=sam,nearmiss,landowner,biffya,biffyb,tumbleweed,bale`, { waitUntil: 'networkidle' });
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, many);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(ri).click();
    await page.locator('.level-btn').nth(n - 1).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(500);
    const run = await follow(page, newGame(level));
    await wait(900);
    const back = run.moves.some((m, i) => i > 0 && m.id === run.moves[i - 1].id && m.delta === -run.moves[i - 1].delta);
    check(run.legal && isWon(run.state) && run.moves.length === level.par && !back && (await page.locator('button:has-text("Play again")').count()) === 1, `a hint, play it, again: ${run.moves.length} hints, every one a legal move, none undoing the last, and the level is cleared in ${run.state.moves} moves (par ${level.par})`);
    if (id === 'cardium') {
      // A move that is not the hint, then Undo, then Restart: after each, hints still lead home.
      await page.locator('button:has-text("Play again")').click();
      await page.waitForSelector('.board .truck.sprite-on');
      await wait(500);
      let state = newGame(level);
      const first = await hintShown(page, state);
      const other = state.trucks.map((t) => ({ t, r: getMoveRange(state, t.id) })).find(({ t, r }) => t.id !== first.id && (r.max >= 1 || r.min <= -1));
      const d = other.r.max >= 1 ? 1 : -1;
      await drag(page, other.t.id, d);
      state = tryMove(state, other.t.id, d).state;
      const afterOther = await follow(page, state);
      await wait(900);
      check(afterOther.legal && isWon(afterOther.state), `after a move that was NOT the hint, the hints start afresh from where the pad stands: ${afterOther.moves.length} more, all legal, and it is cleared`);
      await page.locator('button:has-text("Play again")').click();
      await page.waitForSelector('.board .truck.sprite-on');
      await wait(500);
      state = newGame(level);
      const h1 = await hintShown(page, state);
      const r1 = tryMove(state, h1.id, h1.delta);
      await drag(page, h1.id, h1.delta);
      await page.locator('.controls [data-act="undo"]').click();
      await wait(400);
      state = undo(r1.state);
      const afterUndo = await follow(page, state);
      await wait(900);
      check(afterUndo.legal && isWon(afterUndo.state) && afterUndo.state.moves === level.par, `after a hinted move and Undo, the hints start afresh: cleared in ${afterUndo.state.moves} moves (par ${level.par})`);
      await page.locator('button:has-text("Play again")').click();
      await page.waitForSelector('.board .truck.sprite-on');
      await wait(500);
      state = newGame(level);
      const h2 = await hintShown(page, state);
      await drag(page, h2.id, h2.delta);
      await page.locator('.controls [data-act="restart"]').click();
      await wait(500);
      const afterRestart = await follow(page, newGame(level));
      await wait(900);
      check(afterRestart.legal && isWon(afterRestart.state) && afterRestart.moves.length === level.par, `after a hinted move and Restart, the hints start from the top: cleared in ${afterRestart.moves.length} moves (par ${level.par})`);
    }
    check(errors.length === 0, `no script errors (${errors[0] ?? 'none'})`);
    await context.close();
  }
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
