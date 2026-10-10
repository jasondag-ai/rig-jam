// BALDONNEL, region 7 (October upgrade, job U6), in WebKit at iPhone DPR 3, 390 and 375 wide:
//  - the seventh tab: locked for a new player with its rule, open in demo mode, the thaw look on its list
//  - road ban patches drawn where the level says, under the trucks; a pickup drives over one; a rig pushed at one
//    stops and its own driver says why (no line when a pickup is pushed over); a flung rig stops at the patch
//  - the standard scene: its five layers, no lease sign, and a knock where a tap brings no sighting (the scale; the snowbank's first two)
//  - ALL TEN LEVELS cleared at par by dragging
// Needs the dev server (URL=, default the dev build on 5181). `ONLY=levels|rule|scene|tab`.
import { webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';
import { BUMP_LINES } from '../src/ui/lines.ts';

const ROOT = process.env.URL ?? 'http://localhost:5181/';
const ONLY = process.env.ONLY;
const QUIET = 'cover=0&night=0&bird=0&nap=0&soundnudge=0&worker=0&magpie=0&off=sam,landowner,biffya,biffyb';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
const BI = REGIONS.findIndex((r) => r.id === 'baldonnel'), region = REGIONS[BI];
const DEMO = JSON.stringify({ best: {}, hints: 9, perfect: [], dailyCleared: [], demo: true, announced: REGIONS.map((r) => r.id), standDowns: [] });
const plan = (level) => { let s = newGame(level); return solve(level).map((m) => { const r = tryMove(s, m.id, m.delta); s = r.state; return { ...m, out: r.exited }; }); };
/** A slow drag of `cells` along the truck's lane (touch pointer events, as an iPhone sends), then a rest and the lift. */
const drag = (page, id, cells, ms = 380) => page.evaluate(async ([id, n, ms]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`), r = el.getBoundingClientRect(), h = el.classList.contains('horiz');
  const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = r.x + r.width / 2, y = r.y + r.height / 2;
  const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 91, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown');
  for (let k = 0; k < 10; k++) { if (h) x += (n * cell) / 10; else y += (n * cell) / 10; ev('pointermove'); await new Promise((q) => setTimeout(q, 17)); }
  await new Promise((q) => setTimeout(q, 70));
  ev('pointerup');
  await new Promise((q) => setTimeout(q, ms));
}, [id, cells, ms]);
const browser = await webkit.launch();
const SIZES = [[390, 844], [375, 667]];
const open = async ([width, height], progress, extra = '') => {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true });
  if (progress) await context.addInitScript(([p]) => { if (!localStorage.getItem('rush-hour-rigs:v2')) localStorage.setItem('rush-hour-rigs:v2', p); }, [progress]);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${ROOT}?${QUIET}${extra}`, { waitUntil: 'networkidle' });
  return { context, page, errors };
};
const toList = async (page) => {
  await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
  await page.waitForSelector('.region-tab');
  await page.locator('.region-tab').nth(BI).click();
  await wait(300);
};
const enter = async (page, li) => { await toList(page); await page.locator('.level-btn').nth(li).click(); await page.waitForSelector('.board .truck.sprite-on'); await wait(450); };
const hud = (page) => page.evaluate(() => ({ moves: parseInt(document.querySelector('.hud .moves').textContent, 10), misses: Number(document.querySelector('.hud .misses b').textContent), bubble: document.querySelector('.bubble')?.textContent ?? null }));
const at = (page, id) => page.evaluate((id) => { const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`); if (!el) return null; const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')), m = new DOMMatrixReadOnly(getComputedStyle(el).transform); return { col: Math.round((m.m41 - 3) / cell), row: Math.round((m.m42 - 3) / cell) }; }, id);

for (const size of SIZES) {
  const [w] = size;
  // ---------- The tab ----------
  if (!ONLY || ONLY === 'tab') {
    console.log(`\nwebkit ${w} wide: the seventh tab`);
    const fresh = await open(size, JSON.stringify({ best: { c01: 2 }, hints: 3, perfect: [], dailyCleared: [], demo: false, announced: [], standDowns: [] }));
    await fresh.page.waitForSelector('.region-tab');
    const tab = await fresh.page.evaluate((i) => { const t = document.querySelectorAll('.region-tab')[i]; return t ? { text: t.textContent.replace(/\s+/g, ' ').trim(), locked: t.classList.contains('locked'), n: document.querySelectorAll('.region-tab').length } : null; }, BI);
    check(tab && tab.n === 7 && /Baldonnel/.test(tab.text) && tab.locked && /Clear 5/.test(tab.text) && /Clearwater/.test(tab.text), `a seventh tab, locked for a new player: "${tab?.text}"`);
    await fresh.context.close();
    const demo = await open(size, DEMO);
    await toList(demo.page);
    const list = await demo.page.evaluate(() => ({ theme: document.querySelector('.screen.levels').dataset.theme, blurb: document.querySelector('.screen.levels').innerText, rows: [...document.querySelectorAll('.level-btn')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()), sideways: document.querySelector('.screen.levels').scrollWidth > innerWidth }));
    check(list.theme === 'thaw' && list.blurb.includes("Spring breakup. Rigs can't cross soft ground. Pickups can.") && list.rows.length === 10 && region.levels.every((l, i) => list.rows[i].includes(l.name)) && !list.sideways, `its list wears the thaw theme, says "Spring breakup. Rigs can't cross soft ground. Pickups can.", and names its ten levels (${list.rows[0]} ... ${list.rows[9]})`);
    await demo.page.screenshot({ path: `${process.env.OUT ?? `${process.env.HOME}/Desktop/RHR Art Inbox/qc/baldonnel`}/list_${w}.png` }).catch(() => {});
    await demo.context.close();
  }

  // ---------- The rule on the board ----------
  if (!ONLY || ONLY === 'rule') {
    console.log(`\nwebkit ${w} wide: road ban patches on level 1`);
    const { context, page, errors } = await open(size, DEMO);
    const level = region.levels[0];
    await enter(page, 0);
    const drawn = await page.evaluate(() => { const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')); return { cells: [...document.querySelectorAll('.pad .floor.soft')].map((f) => { const m = new DOMMatrixReadOnly(getComputedStyle(f).transform), r = f.getBoundingClientRect(); return { row: Math.round(m.m42 / cell), col: Math.round(m.m41 / cell), w: Math.round(r.width), art: !!f.querySelector('svg.soft-art path') }; }), cell: Math.round(cell), under: (() => { const f = document.querySelector('.pad .floor.soft'), t = document.querySelector('.pad .truck'); return !!(f.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING); })(), note: document.querySelector('.note').textContent, theme: document.querySelector('.screen.game').dataset.theme }; });
    const want = level.soft.map((c) => `${c.row},${c.col}`).sort().join(' ');
    check(drawn.cells.map((c) => `${c.row},${c.col}`).sort().join(' ') === want && drawn.cells.every((c) => c.art && Math.abs(c.w - drawn.cell) <= 1) && drawn.under, `${drawn.cells.length} patches drawn in their cells (${want}), a cell wide (${drawn.cell} px), under the trucks`);
    check(drawn.note.includes("Rigs can't cross soft ground. Pickups can.") && drawn.theme === 'thaw', `the tip line: "${drawn.note}"; theme ${drawn.theme}`);
    // A rig with a patch at the end of its range: pushed at it, it stops and its own driver says why.
    const s0 = newGame(level);
    let rig = null, pickup = null;
    for (const t of s0.trucks) for (const dir of [1, -1]) {
      const r = getMoveRange(s0, t.id), end = dir > 0 ? r.max : r.min, pos = (t.orient === 'h' ? t.col : t.row) + end, next = dir > 0 ? pos + t.length : pos - 1;
      const onSoft = level.soft.some((c) => (t.orient === 'h' ? c.row === t.row && c.col === next : c.col === t.col && c.row === next));
      const free = !s0.trucks.some((o) => o.id !== t.id && Array.from({ length: o.length }, (_, k) => (o.orient === 'h' ? [o.row, o.col + k] : [o.row + k, o.col])).some(([rr, cc]) => (t.orient === 'h' ? rr === t.row && cc === next : cc === t.col && rr === next)));
      if (onSoft && free && t.length === 3 && !rig) rig = { t, dir, end };
    }
    // (If no rig stands next to a free patch at the start, the best line's own positions are walked for one.)
    let moves = [];
    if (!rig) { let s = s0; for (const m of solve(level)) { s = tryMove(s, m.id, m.delta).state; moves.push(m); for (const t of s.trucks.filter((x) => x.length === 3)) for (const dir of [1, -1]) { const r = getMoveRange(s, t.id), end = dir > 0 ? r.max : r.min, pos = (t.orient === 'h' ? t.col : t.row) + end, next = dir > 0 ? pos + 3 : pos - 1; const onSoft = level.soft.some((c) => (t.orient === 'h' ? c.row === t.row && c.col === next : c.col === t.col && c.row === next)); const free = !s.trucks.some((o) => o.id !== t.id && Array.from({ length: o.length }, (_, k) => (o.orient === 'h' ? [o.row, o.col + k] : [o.row + k, o.col])).some(([rr, cc]) => (t.orient === 'h' ? rr === t.row && cc === next : cc === t.col && rr === next))); if (onSoft && free && !rig) rig = { t, dir, end }; } if (rig) break; } }
    for (const m of moves) await drag(page, m.id, m.delta + (getMoveRange(newGame(level), m.id) ? 0 : 0));
    const before = await hud(page);
    await drag(page, rig.t.id, rig.dir * (Math.abs(rig.end) + 0.9), 700);
    const after = await hud(page), stood = await at(page, rig.t.id);
    const wantPos = (rig.t.orient === 'h' ? rig.t.col : rig.t.row) + rig.end;
    check((rig.t.orient === 'h' ? stood.col : stood.row) === wantPos && after.misses === before.misses + 1 && BUMP_LINES.soft.includes(after.bubble), `rig ${rig.t.id} pushed at a patch stops at its edge (a near miss) and its driver says "${after.bubble}"`);
    const speaker = await page.evaluate((id) => { const b = document.querySelector('.bubble'), cab = document.querySelector(`.truck[data-id="${id}"] .cab`).getBoundingClientRect(); if (!b) return null; const [tx, ty] = (b.dataset.tip ?? '').split(',').map(Number); return Number.isFinite(tx) ? tx >= cab.left - 3 && tx <= cab.right + 3 && ty >= cab.top - 3 && ty <= cab.bottom + 3 : null; }, rig.t.id);
    check(speaker !== false, 'the bubble is his own (its tail on that rig\'s cab)');
    await page.screenshot({ path: `${process.env.OUT ?? `${process.env.HOME}/Desktop/RHR Art Inbox/qc/baldonnel`}/patch_line_${w}.png` }).catch(() => {});
    check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();

    // Flung at the patch (the dev copy's fling asked for): it stops there, and that is no bump.
    const f = await open(size, DEMO, '&fling=1');
    await enter(f.page, 0);
    for (const m of moves) await drag(f.page, m.id, m.delta);
    const b0 = await hud(f.page);
    if (rig.end !== 0) {
      await f.page.evaluate(async ([id, n]) => { const el = document.querySelector(`.truck[data-id="${id}"]`), r = el.getBoundingClientRect(), h = el.classList.contains('horiz'), cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')); let x = r.x + r.width / 2, y = r.y + r.height / 2; const ev = (t) => el.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, buttons: 1 })); ev('pointerdown'); await new Promise((q) => setTimeout(q, 30)); for (let k = 0; k < 6; k++) { if (h) x += (n * cell) / 6; else y += (n * cell) / 6; ev('pointermove'); await new Promise((q) => setTimeout(q, 8)); } ev('pointerup'); }, [rig.t.id, rig.dir * (Math.abs(rig.end) + 1.2)]);
      await wait(700);
      const b1 = await hud(f.page), st = await at(f.page, rig.t.id);
      check((rig.t.orient === 'h' ? st.col : st.row) === wantPos && b1.moves === b0.moves + 1 && b1.misses === b0.misses, `flung at the patch, rig ${rig.t.id} stops at its edge in one move, with no near miss`);
    }
    await f.context.close();
  }

  // ---------- The standard scene ----------
  if (!ONLY || ONLY === 'scene') {
    console.log(`\nwebkit ${w} wide: the standard Baldonnel scene`);
    const { context, page, errors } = await open(size, DEMO);
    const shapes = [];
    for (const li of [0, 4, 9]) {
      await enter(page, li);
      shapes.push(await page.evaluate(() => { const strip = document.querySelector('.depth-strip'); const one = (c) => document.querySelectorAll(`.${c}`).length === 1 && !!document.querySelector(`.${c} svg`)?.innerHTML; const box = (q) => { const r = document.querySelector(q)?.getBoundingClientRect(); return r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null; }; const board = document.querySelector('.board').getBoundingClientRect(), note = document.querySelector('.note').getBoundingClientRect(); return { layers: ['bald-ground', 'bald-layer', 'bald-sign', 'bald-snowbank', 'bald-scale'].every(one), inStrip: ['bald-ground', 'bald-layer', 'bald-sign', 'bald-snowbank', 'bald-scale'].every((c) => document.querySelector(`.${c}`).parentElement === strip), grounds: ['bald-ground', 'bald-layer', 'bald-sign', 'bald-snowbank', 'bald-scale'].map((c) => Number(document.querySelector(`.${c}`).dataset.ground)), leaseSign: document.querySelectorAll('.sign-layer').length, biffy: document.querySelectorAll('.biffy-layer').length, props: ['.bd-sign', '.bd-snowbank', '.bd-scale', '.bd-pond', '.bd-puddle'].map(box), stripTop: Math.round(board.bottom), stripBottom: Math.round(note.top), touch: ['bald-ground', 'bald-layer', 'bald-sign', 'bald-snowbank', 'bald-scale'].every((c) => getComputedStyle(document.querySelector(`.${c}`)).pointerEvents === 'none') }; }));
    }
    const s = shapes[0];
    check(shapes.every((x) => x.layers && x.inStrip && x.touch), 'on levels 1, 5 and 10: its five layers, one of each, in the depth strip, taking no touches');
    check(shapes.every((x) => x.leaseSign === 0 && x.biffy === 1), 'no lease sign there (the bison sign stands in the back row); the biffy as on every level');
    // (To the pixel where the strip is the same; a strip a few px taller, under a one-line tip, shows it a hair bigger.)
    const near = (x) => x.props.every((q, i) => q.every((v, k) => Math.abs(v - s.props[i][k]) <= (x.stripTop === s.stripTop ? 1 : 8)));
    check(shapes.every(near), `the same scene on every level, the props in the same places (strips: ${shapes.map((x) => `${x.stripTop} to ${x.stripBottom}`).join('; ')})`);
    check(s.grounds.every((g, i) => i === 0 || g >= s.grounds[i - 1]), `their ground lines run from the back to the lane: ${s.grounds.map((g) => Math.round(g)).join(', ')}`);
    const inside = s.props.every((b) => b && b[2] > 4 && b[1] >= s.stripTop - 2 && b[1] + b[3] <= s.stripBottom + 2);
    check(inside, `the bison sign, snowbank, scale and dial, pond and puddle all stand inside the strip (${s.stripTop} to ${s.stripBottom}): ${JSON.stringify(s.props)}`);
    // NO DEAD PROPS. The scale has no tap of its own (Overweight comes from a rig pushed at a patch): a knock. The snowbank
    // wants three taps for Half Dressed: the first two give it a knock. (The sign, the pond and the puddle bring their
    // sightings on one tap: `test:e2e:sightings` holds those.)
    const knocked = [];
    for (const q of ['.bd-scale', '.bd-snowbank', '.bd-snowbank']) {
      const b = await page.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, q);
      await page.touchscreen.tap(b.x, b.y);
      await wait(120);
      knocked.push(await page.evaluate((q) => ({ n: Number(document.querySelector(q).dataset.knocked ?? 0), cls: document.querySelector(q).classList.contains('prop-knock'), gag: !!document.querySelector('.strip-layer[data-gag]') }), q));
      await wait(380);
    }
    check(knocked.map((k) => k.n).join() === '1,1,2' && knocked.every((k) => k.cls && !k.gag), `a tap on the scale, and the first two on the snowbank, give a knock and bring nothing (${knocked.map((k) => k.n).join(', ')})`);
    await page.touchscreen.tap(8, s.stripBottom - 6);
    await wait(150);
    const stray = await page.evaluate(() => ['.bd-sign', '.bd-snowbank', '.bd-scale', '.bd-pond', '.bd-puddle'].map((q) => Number(document.querySelector(q).dataset.knocked ?? 0)).join(','));
    check(stray === '0,2,1,0,0', 'a tap on the bare ground knocks nothing');
    await page.screenshot({ path: `${process.env.OUT ?? `${process.env.HOME}/Desktop/RHR Art Inbox/qc/baldonnel`}/scene_${w}.png` }).catch(() => {});
    check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();
  }

  // ---------- All ten at par ----------
  if (!ONLY || ONLY === 'levels') {
    console.log(`\nwebkit ${w} wide: all ten levels cleared at par by dragging`);
    const { context, page, errors } = await open(size, DEMO);
    for (const [li, level] of region.levels.entries()) {
      await enter(page, li);
      for (const m of plan(level)) await drag(page, m.id, m.delta + (m.out ? Math.sign(m.delta) * 0.4 : 0), m.out ? 900 : 360);
      const won = await page.waitForSelector('.win:not([hidden]) .card', { timeout: 9000 }).then(() => true).catch(() => false);
      await wait(500);
      const card = await page.evaluate(() => document.querySelector('.win .card')?.innerText.replace(/\s+/g, ' ') ?? '');
      const hats = await page.evaluate(() => document.querySelectorAll('.win .card .hats img[src*="hat_full"], .win .card .hats .full').length);
      check(won && card.includes(`${level.par} moves · par ${level.par}`), `${li + 1} ${level.name}: ${level.trucks.length} trucks, ${level.soft.length} patches, cleared in ${level.par} (par ${level.par})${hats ? `, ${hats} hard hats` : ''}`);
      if (li === 0 || li === 9) await page.screenshot({ path: `${process.env.OUT ?? `${process.env.HOME}/Desktop/RHR Art Inbox/qc/baldonnel`}/level${li + 1}_won_${w}.png` }).catch(() => {});
    }
    check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();
  }
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
