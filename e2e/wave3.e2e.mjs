// Gag wave 3 (Playwright): the Mannville gags on the standard Mannville scene (scene-stage.ts,
// wave3.ts). WebKit at an iPhone's DPR 3 for the look, the triggers and the frames; Chromium with a
// 4x slower CPU for the frame rate.
//  - the standard scene is permanent scenery on EVERY Mannville level: the six trees, the three
//    muskeg puddles, and the lane aspen kept IN FRONT of the strip's gag layers
//  - each gag's first and last frames are the empty standard scene, by the pixels of a screenshot,
//    at 390x844 and 375x667; in the middle it is on screen
//  - the real triggers: three taps on the big puddle, three on the lane aspen, a convoy out in
//    order back to back, a tap on the moon at night; beats in order; a new sighting in the log
//  - no gag layer ever takes a touch: a truck can be dragged right through a gag
//  - reduced motion: a still; a strip too short for the scene: no gag, no error
//  - 60 fps at 390 and 375 wide with a 4x slower CPU
// Run with the dev server up: npm run test:e2e:wave3   (ONLY=muskeg runs one gag's part)
import { DEMO, UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';
import { LOG_ENTRIES } from '../src/ui/wildlife-log.ts';
import { WAVE3 } from '../src/ui/wave3.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const ONLY = process.env.ONLY ?? '';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const N = LOG_ENTRIES.length;
const mann = REGIONS.findIndex((r) => r.id === 'mannville');
// Everything else that could walk on is kept away, so each check sees one gag.
const QUIET = 'cover=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&off=sam,landowner,biffya,biffyb,deer,geese';
const GAGS = [
  { id: 'muskeg', log: 'Muskeg Boots', night: false },
  { id: 'catTrain', log: 'Cat Train', night: false },
  { id: 'beaver', log: 'Beaver', night: false },
  { id: 'aurora', log: 'Aurora Howl', night: true },
].filter((g) => !ONLY || g.id.toLowerCase() === ONLY.toLowerCase());

async function open(browser, { width = 390, height = 844, dpr = 3, query = 'night=0', level = 2, progress = UNLOCKED, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true, reducedMotion });
  const page = await context.newPage();
  page.on('pageerror', (e) => { failures++; console.log('ERR', e.message); });
  await page.goto(`${ROOT}?${QUIET}&${query}`, { waitUntil: 'networkidle' });
  if (!query.includes('gag=')) {
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, progress);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(mann).click();
    await page.locator('.level-btn').nth(level).click();
  }
  await page.waitForSelector('.board .truck.sprite-on');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; }))));
  await page.evaluate(() => document.fonts.ready);
  await wait(500);
  return { context, page };
}
const tapAt = (page, x, y) => page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y) ?? document.body;
  for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: type === 'pointerdown' ? 1 : 0 }));
  return el.className?.baseVal ?? el.className ?? el.tagName;
}, [x, y]);
const drag = (page, id, cells, settle = 320) => page.evaluate(async ([id, cells, ms]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`); const r = el.getBoundingClientRect();
  const h = el.classList.contains('horiz'); const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = r.x + r.width / 2, y = r.y + r.height / 2;
  const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown'); for (let k = 0; k < 6; k++) { if (h) x += (cells * cell) / 6; else y += (cells * cell) / 6; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); } ev('pointerup');
  await new Promise((q) => setTimeout(q, ms));
}, [id, cells, settle]);
/** Where the scene's things are on the screen (px): the big puddle's and the lane aspen's middles, the moon. */
const spots = (page) => page.evaluate(() => {
  const mid = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  const puddles = [...document.querySelectorAll('.mann-layer path[fill="#4f4a2c"]')].map(mid).sort((a, b) => b.w - a.w);
  const moon = document.querySelector('.night-sky circle[stroke]');
  return { puddle: puddles[0], aspen: mid(document.querySelector('.mann-front svg svg')), moon: moon ? mid(moon) : null };
});
/** Follows a gag from its first layer to its last: the beats it shows, in order, and what the layers do with touches. */
const follow = (page, id, ms = 22000) => page.evaluate(([id, limit]) => new Promise((res) => {
  const beats = []; let seen = false; const t0 = performance.now(); const touch = new Set(); let order = '';
  const tick = () => {
    const layers = [...document.querySelectorAll(`.strip-layer[data-gag="${id}"]`)];
    if (layers.length) {
      seen = true;
      const b = layers.map((l) => l.dataset.beat).find(Boolean);
      if (b && beats[beats.length - 1] !== b) beats.push(b);
      for (const l of layers) for (const el of [l, ...l.querySelectorAll('svg')]) touch.add(getComputedStyle(el).pointerEvents);
      const kids = [...document.querySelector('.screen.game').children];
      const at = (sel) => kids.findIndex((k) => k.matches(sel));
      order ||= JSON.stringify({ gag: at(`.strip-layer[data-gag="${id}"]:not(.scene-over)`), front: at('.scene-front'), over: at('.scene-over'), shade: at('.night-shade'), back: at('.mann-layer') });
    } else if (seen) return res({ beats, touch: [...touch], order: JSON.parse(order), secs: (performance.now() - t0) / 1000 });
    if (performance.now() - t0 > limit) return res({ beats, touch: [...touch], order: order ? JSON.parse(order) : null, secs: -1 });
    requestAnimationFrame(tick);
  };
  tick();
}), [id, ms]);
const watchToasts = (page) => page.evaluate(() => { window.__toasts = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('toast')) window.__toasts.push(n.textContent); }).observe(document.body, { childList: true }); });
const beatsOf = (id) => WAVE3[id].beats.map((b) => b[1]);

const wk = await webkit.launch();

// ---------- 1. The standard scene, on every Mannville level ----------
if (!ONLY) {
  console.log('\nwebkit 390x844 @3x: the standard Mannville scene');
  const { context, page } = await open(wk, { level: 0 });
  let bad = [];
  for (let li = 0; li < 10; li++) {
    if (li) {
      await page.locator('.hud [data-act="levels"]').click();
      await page.locator('.level-btn').nth(li).click();
      await page.waitForSelector('.board .truck');
      await wait(250);
    }
    const s = await page.evaluate(() => {
      const board = document.querySelector('.board').getBoundingClientRect(), note = document.querySelector('.note').getBoundingClientRect();
      const kids = [...document.querySelector('.screen.game').children];
      const back = document.querySelector('.mann-layer svg'), front = document.querySelector('.mann-front svg');
      const sp = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top - board.bottom), Math.round(r.width), Math.round(r.height)]; };
      const inStrip = (el) => { const r = el.getBoundingClientRect(); return r.top >= board.bottom - 8 && r.bottom <= note.top + 2 && r.left >= -1 && r.right <= innerWidth + 1; };
      const trees = [...back.querySelectorAll(':scope > svg')], puddles = [...back.querySelectorAll('path[fill="#4f4a2c"]')], aspen = front.querySelector('svg');
      const below = [...document.querySelectorAll('.scenery svg, .scenery use, .scenery img')].filter((t) => t.getBoundingClientRect().top > board.bottom).length;
      return {
        layers: [document.querySelectorAll('.mann-layer').length, document.querySelectorAll('.mann-front').length], trees: trees.map(sp), puddles: puddles.map(sp), aspen: sp(aspen),
        inside: [...trees, ...puddles, aspen].every(inStrip), frontOver: kids.findIndex((k) => k.matches('.mann-front')) > kids.findIndex((k) => k.matches('.mann-layer')) && kids.findIndex((k) => k.matches('.mann-front')) < kids.findIndex((k) => k.matches('.night-shade')),
        touch: [back, front, aspen, ...trees].map((e) => getComputedStyle(e).pointerEvents), below, biffy: sp(document.querySelector('.biffy-layer svg')), sign: sp(document.querySelector('.sign-layer svg')),
      };
    });
    // (The same scene on every level: it stands on the strip's floor, so only its height above the buttons is compared, not its distance from the board, which a two-line level name changes.)
    const y0 = s.puddles[0][1];
    const shape = [...s.trees, ...s.puddles, s.aspen].flatMap(([x, y, w, h]) => [x, y - y0, w, h]);
    page.__scene ??= shape;
    const same = shape.length === page.__scene.length && shape.every((v, i) => Math.abs(v - page.__scene[i]) <= 1);
    const clear = (a, b) => a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1];
    const ok = s.layers.join() === '1,1' && s.trees.length === 6 && s.puddles.length === 3 && s.inside && s.frontOver && s.touch.every((t) => t === 'none') && s.below === 0 && same && s.trees.every((t) => clear(t, s.biffy)) && clear(s.aspen, s.sign);
    if (!ok) bad.push(`level ${li + 1}: ${JSON.stringify(s)}`);
    if (li === 0) await page.screenshot({ path: join(OUT, 'mannville_scene.png') });
  }
  check(bad.length === 0, `all 10 levels: one scene, six trees, three muskeg puddles and the lane aspen, the same on every level, inside the strip, the aspen's layer over the scenery's, none taking a touch; no tree stands on the biffy, and the sign is clear of the aspen${bad.length ? ` (${bad.join(' | ').slice(0, 900)})` : ''}`);
  await context.close();
}

// ---------- 2. First and last frames are the empty standard scene (pixels, DPR 3) ----------
for (const [width, height] of [[390, 844], [375, 667]]) {
  console.log(`\nwebkit ${width}x${height} @3x: every gag starts and ends on the empty scene`);
  for (const g of GAGS) {
    const { context, page } = await open(wk, { width, height, query: `gagtest=1&night=${g.night ? 1 : 0}`, reducedMotion: 'reduce' });
    await wait(900);
    const diff = (a, b) => page.evaluate(async ([x, y]) => {
      const load = async (b64) => { const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, c.width, c.height); };
      const [p, q] = [await load(x), await load(y)];
      let n = 0;
      for (let i = 0; i < p.data.length; i += 4) if (Math.abs(p.data[i] - q.data[i]) > 18 || Math.abs(p.data[i + 1] - q.data[i + 1]) > 18 || Math.abs(p.data[i + 2] - q.data[i + 2]) > 18) n++;
      return n;
    }, [a, b]);
    // (Two shots a frame, compared by their best pair: WebKit draws a one pixel sliver at a gate badge's edge in every other screenshot.)
    const shot = async () => [(await page.screenshot()).toString('base64'), (await page.screenshot()).toString('base64')];
    const best = async (a, b) => Math.min(...(await Promise.all(a.flatMap((x) => b.map((y) => diff(x, y))))));
    const before = await shot();
    const end = await page.evaluate((id) => window.__rhrGag.end(id), g.id);
    const held = await page.evaluate((id) => window.__rhrGag.hold(id, 0), g.id);
    if (!held) { check(false, `${g.id}: could not be set`); await context.close(); continue; }
    await wait(80);
    const first = await shot();
    await page.evaluate(([id, t]) => window.__rhrGag.hold(id, t), [g.id, end * 0.42]);
    await wait(80);
    const middle = await shot();
    if (width === 390) await page.screenshot({ path: join(OUT, `wave3_${g.id}.png`) });
    await page.evaluate(([id, t]) => window.__rhrGag.hold(id, t), [g.id, end]);
    await wait(80);
    const last = await shot();
    await page.evaluate((id) => window.__rhrGag.release(id), g.id);
    await wait(80);
    const after = await shot();
    const [a, m, z, same] = [await best(before, first), await best(before, middle), await best(last, after), await best(before, last)];
    check(m > 400 && a <= 9 && same <= 9 && z <= 9, `${g.id} (${end.toFixed(1)} s): its first frame is the empty scene (${a} px differ), its last frame too (${same} px against the start, ${z} against the level it leaves); in the middle it is on screen (${m} px)`);
    await context.close();
  }
}

// ---------- 3. The real triggers, the beats, touches, the log ----------
console.log('\nwebkit 390x844 @3x: triggers');
for (const g of GAGS) {
  const { context, page } = await open(wk, { query: g.night ? 'idle=0.1' : 'night=0', level: g.id === 'catTrain' ? 1 : 2 });
  await watchToasts(page);
  const lv = REGIONS[mann].levels[g.id === 'catTrain' ? 1 : 2];
  let touched = null;
  if (g.id === 'muskeg' || g.id === 'beaver') {
    const at = (await spots(page))[g.id === 'muskeg' ? 'puddle' : 'aspen'];
    const under = await tapAt(page, at.x, at.y);
    await wait(120);
    await tapAt(page, at.x, at.y);
    await wait(120);
    const early = await page.$(`.strip-layer[data-gag="${g.id}"]`);
    const shook = g.id === 'beaver' ? await page.evaluate(() => document.querySelector('.mann-front svg').classList.contains('shake')) : true;
    await tapAt(page, at.x, at.y);
    check(!early && shook && !/scene|mann|strip-layer/.test(String(under)), `${g.id}: two taps on the ${g.id === 'muskeg' ? 'big puddle' : 'lane aspen'} bring nothing${g.id === 'beaver' ? ' (the aspen shakes)' : ''}; the tap lands on the game under it ("${under}"), not on a scene layer`);
  } else if (g.id === 'catTrain') {
    // Play the level's own solution up to its convoy's truck 1, then truck 2 on the very next move.
    let s = newGame(lv);
    for (const m of solve(lv)) {
      const t = s.trucks.find((x) => x.id === m.id);
      const r = tryMove(s, m.id, m.delta);
      await drag(page, m.id, m.delta + Math.sign(m.delta) * (r.exited ? 0.4 : 0));
      s = r.state;
      if (r.exited && t.convoy === 1) {
        const two = s.trucks.find((x) => x.color === t.color && x.convoy === 2);
        const early = await page.$('.strip-layer[data-gag="catTrain"]');
        await drag(page, two.id, getMoveRange(s, two.id).exitDelta + Math.sign(getMoveRange(s, two.id).exitDelta) * 0.4, 60);
        check(!early, 'catTrain: truck 1 of the convoy out: nothing yet');
        break;
      }
    }
  } else {
    // Night falls by itself (idle); then the moon is tapped.
    await page.waitForFunction(() => document.querySelector('.screen.game').classList.contains('night'), null, { timeout: 9000 });
    const { moon } = await spots(page);
    check(!!moon && moon.y > (await page.evaluate(() => document.querySelector('.hud').getBoundingClientRect().bottom)) - 2, 'aurora: night has fallen and the moon is in the sky under the HUD');
    await tapAt(page, moon.x, moon.y);
  }
  const following = follow(page, g.id);
  await page.waitForSelector(`.strip-layer[data-gag="${g.id}"]`, { state: 'attached', timeout: 4000 }).catch(() => {});
  // A truck is dragged while the gag is on: nothing in the way. (Not at night: any move ends the night.)
  if (!g.night && g.id !== 'catTrain') {
    await wait(2500);
    const s0 = newGame(lv);
    const mv = s0.trucks.map((t) => ({ t, r: getMoveRange(s0, t.id) })).find(({ r }) => r && ((r.max > 0 && r.exitDelta !== r.max) || (r.min < 0 && r.exitDelta !== r.min)));
    const by = mv.r.max > 0 && mv.r.exitDelta !== mv.r.max ? 1 : -1;
    const before = await page.evaluate(() => parseInt(document.querySelector('.hud .moves').textContent, 10));
    const mid = await page.evaluate(([id, sel]) => { const el = document.querySelector(sel); const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { on: !!document.querySelector(`.strip-layer[data-gag="${id}"]`), truck: !!top?.closest('.truck') }; }, [g.id, `.truck[data-id="${mv.t.id}"]`]);
    await drag(page, mv.t.id, by);
    const moved = await page.evaluate(() => parseInt(document.querySelector('.hud .moves').textContent, 10));
    touched = mid.on && mid.truck && moved === before + 1;
  }
  const run = await following;
  const want = beatsOf(g.id);
  let at = -1;
  const inOrder = run.beats.every((b) => { const i = want.indexOf(b); const ok = i > at; at = i; return ok; });
  check(run.secs > 0 && inOrder && want.filter((b) => run.beats.includes(b)).length >= want.length - 1, `${g.id}: it plays ${run.secs.toFixed(1)} s, beats in the reference's order: ${run.beats.join(' > ')}`);
  check(run.touch.join() === 'none' && (touched === null || touched), `${g.id}: its layers take no touches${touched === null ? '' : ', and a truck is dragged a cell while it plays'}`);
  if (g.id === 'aurora') check(run.order.gag > run.order.shade, 'aurora: its layer lies over the night, in the sky band');
  else check(run.order.back < run.order.gag && run.order.gag < run.order.front && run.order.front < run.order.shade && (run.order.over < 0 || run.order.over > run.order.front), `${g.id}: the scenery is behind it and the lane aspen in front of it${run.order.over > 0 ? ', its sound words over the aspen' : ''}`);
  await wait(900);
  const toast = await page.evaluate(() => window.__toasts);
  const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('rush-hour-rigs:log'))) ?? '{"found":[]}').found;
  // (Before the aurora, the night itself was a sighting: Night Shift.)
  const nth = g.night ? 2 : 1;
  check(toast.some((t) => t === `New sighting! ${g.log} (${nth}/${N})`) && saved.length === nth, `${g.id}: "${toast[nth - 1]}", saved in the log`);
  check((await page.$$('.strip-layer[data-gag]')).length === 0, `${g.id}: nothing of it is left on the screen`);
  await context.close();
}

// ---------- 4. The log's cards; reduced motion; a strip too short ----------
if (!ONLY) {
  console.log('\nwebkit: log cards, reduced motion, a short strip');
  {
    const { context, page } = await open(wk, { progress: DEMO, level: 2 });
    await page.locator('.hud [data-act="levels"]').click();
    await page.locator('.binoculars').click();
    await page.waitForSelector('.log-card');
    const cards = await page.evaluate(() => ['muskeg', 'cattrain', 'beaver', 'aurora'].map((id) => { const c = document.querySelector(`.log-card[data-id="${id}"]`), s = c?.querySelector('.art svg'), r = s?.getBoundingClientRect(), vb = s?.viewBox.baseVal; return { id, text: c?.querySelector('p').textContent, shapes: s?.querySelectorAll('path, circle, rect, ellipse').length, fit: r && Math.abs(r.width / r.height / (vb.width / vb.height) - 1) < 0.03 && r.width <= 105 && r.height <= 85 }; }));
    check(cards.every((c) => c.shapes > 12 && c.fit) && cards.map((c) => c.text).join('|') === 'In Mannville, tap the big muskeg puddle three times.|In Mannville, drive a convoy out in order, one right after the other.|In Mannville, tap the tall aspen three times.|In Mannville, wait for night, then tap the moon.', `the four cards have flat puppet stills at their own shape and plain hints: ${cards.map((c) => `${c.id} (${c.shapes} shapes)`).join(', ')}`);
    await page.screenshot({ path: join(OUT, 'wave3_log_cards.png') });
    await context.close();
  }
  {
    const { context, page } = await open(wk, { reducedMotion: 'reduce' });
    const at = (await spots(page)).puddle;
    for (let i = 0; i < 3; i++) { await tapAt(page, at.x, at.y); await wait(80); }
    await page.waitForSelector('.strip-layer[data-gag="muskeg"]', { state: 'attached', timeout: 3000 }).catch(() => {});
    await wait(600);
    const still = await page.evaluate(() => { const l = [...document.querySelectorAll('.strip-layer[data-gag="muskeg"]')]; return { beat: l.map((x) => x.dataset.beat).find(Boolean), shapes: l[0]?.querySelectorAll('g.pup *').length ?? 0 }; });
    await page.waitForSelector('.strip-layer[data-gag="muskeg"]', { state: 'detached', timeout: 6000 }).catch(() => {});
    check(still.beat === 'still' && still.shapes > 20 && !(await page.$('.strip-layer[data-gag="muskeg"]')), 'reduced motion: Muskeg Boots is a still that fades in and out');
    await context.close();
  }
  {
    // Safari on an iPhone SE with its toolbars: about 21 px of strip. No room: no gag, and nothing breaks.
    const { context, page } = await open(wk, { width: 375, height: 567 });
    const g = await page.evaluate(() => { const b = document.querySelector('.board').getBoundingClientRect(), n = document.querySelector('.note').getBoundingClientRect(); return n.top - b.bottom; });
    const at = (await spots(page)).puddle;
    for (let i = 0; i < 4; i++) { await tapAt(page, at.x, at.y); await wait(80); }
    await wait(500);
    check(g < 40 && !(await page.$('.strip-layer[data-gag]')), `a ${Math.round(g)} px strip: the scene has no room for a gag, and none starts`);
    await context.close();
  }
}
await wk.close();

// ---------- 5. Frame rate ----------
const cr = await chromium.launch();
for (const [width, height] of [[390, 844], [375, 667]]) {
  console.log(`\nchromium ${width}x${height} @3x: frame rate with a 4x slower CPU`);
  for (const g of GAGS) {
    const { context, page } = await open(cr, { width, height, query: `gag=${g.id.toLowerCase()}` });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    // One whole run of the preview, from its first layer to its last.
    await page.waitForSelector(`.strip-layer[data-gag="${g.id}"]`, { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForSelector(`.strip-layer[data-gag="${g.id}"]`, { state: 'attached', timeout: 15000 });
    const frames = await page.evaluate((id) => new Promise((res) => { const f = []; let last = performance.now(); const tick = (n) => { f.push(n - last); last = n; document.querySelector(`.strip-layer[data-gag="${id}"]`) && f.length < 2400 ? requestAnimationFrame(tick) : res(f.slice(3)); }; requestAnimationFrame(tick); }), g.id);
    const sorted = frames.slice().sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)], median = sorted[sorted.length >> 1];
    check(frames.length > 300 && p95 < 20 && median < 17.5, `${g.id}: p95 frame ${p95.toFixed(1)} ms, median ${median.toFixed(1)} ms over the whole gag (${frames.length} frames)`);
    await context.close();
  }
}
await cr.close();

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
