// BALDONNEL, region 7 (October upgrade, job U6), in WebKit at iPhone DPR 3, 390 and 375 wide:
//  - the seventh tab: locked for a new player with its rule, open in demo mode, the thaw look on its list
//  - road ban patches drawn where the level says, under the trucks; a pickup drives over one; a rig pushed at one
//    stops and its own driver says why (no line when a pickup is pushed over); a flung rig stops at the patch
//  - the standard scene: its five layers, no lease sign, and a knock where a tap brings no sighting (the scale; the snowbank's first two)
//  - ALL TEN LEVELS cleared at par by dragging
//  - U6c: a patch beside the berm looks the same, by pixels, before, while and after a truck drives out (390 x 664 and
//    375 x 635); the mountains on the list and on all ten levels, under the HUD, and a tap on them is a tap on the sky
// Needs the dev server (URL=, default the dev build on 5181). `ONLY=levels|rule|scene|tab|steady|mountains`.
import { webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';
import { BUMP_LINES } from '../src/ui/lines.ts';
import { outDir } from './out.mjs';

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
    await demo.page.screenshot({ path: `${outDir('baldonnel')}/list_${w}.png` }).catch(() => {});
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
    await page.screenshot({ path: `${outDir('baldonnel')}/patch_line_${w}.png` }).catch(() => {});
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
    await page.screenshot({ path: `${outDir('baldonnel')}/scene_${w}.png` }).catch(() => {});
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
      if (li === 0 || li === 9) await page.screenshot({ path: `${outDir('baldonnel')}/level${li + 1}_won_${w}.png` }).catch(() => {});
    }
    check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();
  }
}

// ---------- U6c: a patch beside the berm is steady while a truck drives out; the mountains ----------
/** How many pixels differ between two PNGs (any channel by more than 18). */
const pixelDiff = (page, a, b) => page.evaluate(async ([x, y]) => {
  const load = async (b64) => { const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, c.width, c.height); };
  const [p, q] = [await load(x), await load(y)];
  if (p.width !== q.width || p.height !== q.height) return -1;
  let n = 0;
  for (let i = 0; i < p.data.length; i += 4) if (Math.abs(p.data[i] - q.data[i]) > 18 || Math.abs(p.data[i + 1] - q.data[i + 1]) > 18 || Math.abs(p.data[i + 2] - q.data[i + 2]) > 18) n++;
  return n;
}, [a.toString('base64'), b.toString('base64')]);
const SAFARI = [[390, 664], [375, 635]];
if (!ONLY || ONLY === 'steady') {
  for (const size of SAFARI) {
    console.log(`\nwebkit ${size[0]} x ${size[1]}: a patch beside the berm, before, while and after a truck drives out`);
    // A level, a moment in its best line and a patch in an edge cell such that the truck then driving out, and every
    // truck moved before it, keeps at least a cell away from the patch (so only the patch itself could change).
    let pick = null;
    for (const [li, level] of region.levels.entries()) {
      if (pick) break;
      const steps = plan(level);
      for (const c of level.soft.filter((c) => c.row === 0 || c.row === 5 || c.col === 0 || c.col === 5)) {
        let s = newGame(level), ok = true;
        const near = (t, d) => { const cells = []; const lo = Math.min(0, d), hi = Math.max(0, d); for (let k = lo; k < t.length + hi; k++) cells.push(t.orient === 'h' ? [t.row, t.col + k] : [t.row + k, t.col]); return cells.some(([r, q]) => Math.abs(r - c.row) <= 1 && Math.abs(q - c.col) <= 1); };
        for (const [k, m] of steps.entries()) {
          const t = s.trucks.find((x) => x.id === m.id);
          if (near(t, m.delta + (m.out ? Math.sign(m.delta) * 3 : 0))) { ok = false; break; }
          if (m.out) { pick = { li, level, c, k }; break; }
          s = tryMove(s, m.id, m.delta).state;
        }
        if (pick || !ok) { if (pick) break; }
      }
    }
    if (!pick) { check(false, 'no level offers a patch beside the berm with a truck driving out well away from it'); continue; }
    const { context, page, errors } = await open(size, DEMO);
    await enter(page, pick.li);
    const steps = plan(pick.level);
    for (const m of steps.slice(0, pick.k)) await drag(page, m.id, m.delta);
    await wait(600);
    const clip = await page.evaluate(([row, col]) => { const f = [...document.querySelectorAll('.pad .floor.soft')].find((e) => e.dataset.row === String(row) && e.dataset.col === String(col)).getBoundingClientRect(); return { x: Math.floor(f.left) - 6, y: Math.floor(f.top) - 6, width: Math.ceil(f.width) + 12, height: Math.ceil(f.height) + 12 }; }, [pick.c.row, pick.c.col]);
    const inside = await page.evaluate(([row, col]) => { const f = [...document.querySelectorAll('.pad .floor.soft')].find((e) => e.dataset.row === String(row) && e.dataset.col === String(col)), cell = f.getBoundingClientRect(), art = f.querySelector('svg'); const boxes = [...art.children].map((e) => e.getBoundingClientRect()); return boxes.every((b) => b.left >= cell.left - 0.5 && b.right <= cell.right + 0.5 && b.top >= cell.top - 0.5 && b.bottom <= cell.bottom + 0.5); }, [pick.c.row, pick.c.col]);
    check(inside, `${pick.level.name}: the patch at row ${pick.c.row + 1}, column ${pick.c.col + 1} (beside the berm) is drawn wholly inside its own cell`);
    const before = await page.screenshot({ clip });
    const out = steps[pick.k];
    // The drive out, and three looks at the patch while the yard's clip is lifted for it.
    const going = drag(page, out.id, out.delta + Math.sign(out.delta) * 0.4, 0);
    const during = [];
    await going;
    for (const ms of [120, 330, 330]) { await wait(ms); during.push({ shot: await page.screenshot({ clip }), lifted: await page.evaluate(() => !!document.querySelector('.yard.letting-out')) }); }
    await wait(2600);
    const after = await page.screenshot({ clip });
    const settled = await page.evaluate(() => !document.querySelector('.yard.letting-out'));
    const d = [];
    for (const x of during) d.push(await pixelDiff(page, before, x.shot));
    const dAfter = await pixelDiff(page, before, after);
    check(during.some((x) => x.lifted) && settled, `truck ${out.id} drives out: the yard's clip is lifted for it (${during.map((x) => (x.lifted ? 'lifted' : 'down')).join(', ')}) and comes back down`);
    check(d.every((n) => n >= 0 && n <= 4) && dAfter >= 0 && dAfter <= 4, `the patch and 6 px round it look the same before, during and after, by pixels (${clip.width * 3} x ${clip.height * 3} px: ${d.join(', ')} differ during, ${dAfter} after)`);
    check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();
  }
}
if (!ONLY || ONLY === 'mountains') {
  for (const size of [...SAFARI, [390, 844]]) {
    console.log(`\nwebkit ${size[0]} x ${size[1]}: the mountains`);
    const { context, page, errors } = await open(size, DEMO);
    await toList(page);
    const read = () => page.evaluate(() => {
      const m = document.querySelector('.scenery .mountains'); if (!m) return null;
      const r = m.getBoundingClientRect(), trees = [...document.querySelectorAll('.scenery .trees > svg.sc')];
      const game = document.querySelector('.screen.game'), hud = document.querySelector('.hud')?.getBoundingClientRect();
      const horizon = parseFloat(getComputedStyle(document.querySelector('.screen')).getPropertyValue('--horizon'));
      // What is on top at a point of the HUD's own lettering, and at a point on a peak in the open sky.
      const title = document.querySelector('.hud .name')?.getBoundingClientRect();
      const onTitle = title ? document.elementFromPoint(title.left + title.width / 2, title.top + title.height / 2) : null;
      return { top: r.top, bottom: r.bottom, w: r.width, h: r.height, n: document.querySelectorAll('.mountains').length, sig: [...m.querySelectorAll('path')].map((q) => q.getAttribute('d').match(/^M(-?[\d.]+)/)[1]).join(','), first: m.parentElement.querySelector('svg.sc, svg.mountains') === m || m.compareDocumentPosition(trees[0]) & Node.DOCUMENT_POSITION_FOLLOWING ? true : false, touch: getComputedStyle(m).pointerEvents === 'none' || getComputedStyle(m.closest('.scenery')).pointerEvents === 'none', horizon, hud: hud?.bottom ?? null, hudOnTop: game ? !!onTitle?.closest('.hud') : null, treesOver: trees.some((t) => { const q = t.getBoundingClientRect(); return q.top < r.bottom && q.bottom > r.bottom - 4; }), theme: document.querySelector('.screen').dataset.theme };
    });
    const list = await read();
    check(!!list && list.n === 1 && list.theme === 'thaw' && list.w >= size[0] - 1 && list.h >= 20 && list.top >= 5.5 && Math.abs(list.bottom - list.horizon) <= 2 && list.first && list.touch, `on Baldonnel's level list: one range across the screen, ${Math.round(list?.h ?? 0)} px tall, its foot on the horizon, behind the tree line, taking no touches`);
    await page.screenshot({ path: `${outDir('baldonnel')}/mountains_list_${size[0]}x${size[1]}.png` }).catch(() => {});
    const seen = [];
    for (let li = 0; li < 10; li++) { await enter(page, li); seen.push(await read()); if (li === 0) await page.screenshot({ path: `${outDir('baldonnel')}/mountains_${size[0]}x${size[1]}.png` }).catch(() => {}); }
    const ok = seen.every((m) => m && m.n === 1 && m.w >= size[0] - 1 && m.h >= 20 && m.top >= 5.5 && Math.abs(m.bottom - m.horizon) <= 2 && m.first && m.touch && m.treesOver);
    check(ok, `on all ten levels: one range on the horizon (its foot at the sky's foot), behind the trees, ${[...new Set(seen.map((m) => Math.round(m?.h ?? 0)))].join(' / ')} px tall, never nearer the screen's top than 6 px (${[...new Set(seen.map((m) => Math.round(m?.top ?? -1)))].join(' / ')})`);
    // (Where a level's sky is a pixel or two shorter than the range, the range is that much squatter: its peaks stand where they stand.)
    check(new Set(seen.map((m) => m?.sig)).size === 1 && seen[0]?.sig === list?.sig, 'the same range on every level and on the list: every peak in the same place across the screen');
    check(seen.every((m) => m?.hudOnTop === true), "the HUD's lettering is over it wherever the range stands behind the HUD (it is scenery, under the HUD)");
    // A tap on the mountains is a tap on the sky: three bring Two Left Feet.
    await enter(page, 2);
    const pt = await page.evaluate(() => { const m = document.querySelector('.scenery .mountains').getBoundingClientRect(), h = document.querySelector('.hud').getBoundingClientRect(), b = document.querySelector('.board').getBoundingClientRect(); const y = (h.bottom + b.top) / 2; return { x: innerWidth * 0.5, y, onRange: y >= m.top && y <= m.bottom }; });
    for (let k = 0; k < 3; k++) { await page.mouse.click(pt.x, pt.y); await wait(150); }
    const cranes = await page.waitForSelector('.strip-layer[data-gag="cranes"]', { state: 'attached', timeout: 5000 }).then(() => true, () => false);
    check(cranes, `three taps on the sky${pt.onRange ? ', on the range itself,' : ''} bring Two Left Feet: a tap on the mountains is a tap on the sky`);
    // No other region has them.
    await page.evaluate(() => document.querySelector('.hud [data-act="levels"]')?.click());
    await page.waitForSelector('.region-tab');
    const others = [];
    for (let r = 0; r < REGIONS.length; r++) { if (r === BI) continue; await page.locator('.region-tab').nth(r).click(); await wait(250); others.push(await page.evaluate(() => document.querySelectorAll('.mountains').length)); }
    check(others.every((n) => n === 0), `no other region's list has mountains (${others.join(', ')})`);
    check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();
  }
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
