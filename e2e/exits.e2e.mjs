// Gate exits (Playwright, WebKit: Safari's engine). A truck leaving through its gate, on each of the
// four sides:
//  - is never cut off: the yard's clip is lifted while it leaves, and by the pixels of a screenshot
//    taken mid-fade it is drawn past the pad's edge, in the berm's gap
//  - drives only a little way: its cab ends about one cell past the gate
//  - stays solid for the first part of the drive, then fades to nothing over the last 45%
//  - fades inside a big puff of dust at the gate (no mask-image anywhere)
//  - the gate's arm comes down only once the truck has gone
//  - reduced motion: the truck is simply removed, as before
// Run with the dev server up: npm run test:e2e:exits
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { cabSide, getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = join(homedir(), 'Desktop', 'RHR Screenshots');
mkdirSync(OUT, { recursive: true });
const QUIET = '?cover=0&night=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&off=sam,nearmiss,landowner';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

const browser = await webkit.launch();
async function open(reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  // A slow-motion switch for the screenshot: timers and animations run 10x slower while it is on.
  await page.addInitScript(() => {
    const K = 10; const st = window.setTimeout.bind(window);
    window.setTimeout = (f, ms, ...a) => st(f, window.__slow ? (ms || 0) * K : ms, ...a);
    const tick = () => { if (window.__slow) for (const a of document.getAnimations()) if (a.playbackRate !== 1 / K) a.playbackRate = 1 / K; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.goto(ROOT + QUIET, { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  return { context, page };
}
const enter = async (page, ri, li) => {
  await page.evaluate(() => document.querySelector('.hud [data-act="levels"]')?.click());
  await wait(250);
  await page.locator('.region-tab').nth(ri).click();
  await page.locator('.level-btn').nth(li).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(600);
};
const drag = (page, id, cells) => page.evaluate(async ([id, cells]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`); const r = el.getBoundingClientRect();
  const h = el.classList.contains('horiz'); const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = r.x + r.width / 2, y = r.y + r.height / 2;
  const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown'); for (let k = 0; k < 6; k++) { if (h) x += (cells * cell) / 6; else y += (cells * cell) / 6; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); } ev('pointerup');
}, [id, cells]);
/** Watches the next exit frame by frame: the truck, the yard's clip, the dust, the gate. */
const watch = (page, ms) => page.evaluate((ms) => {
  window.__exit = new Promise((res) => {
    const log = []; const t0 = performance.now(); let truck = null, gate = null;
    const board = document.querySelector('.board'); const yard = document.querySelector('.yard'); const pad = document.querySelector('.pad');
    const box = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
    const step = () => {
      truck ??= document.querySelector('.truck.exiting');
      if (truck && !gate) gate = [...document.querySelectorAll('.gate')].find((g) => g.classList.contains('open')) ?? null;
      const dust = [...document.querySelectorAll('.dust.gate-dust')];
      const there = !!truck?.isConnected;
      log.push({
        t: performance.now() - t0, there, opacity: there ? +getComputedStyle(truck).opacity : null, rect: there ? box(truck.getBoundingClientRect()) : null,
        clip: [getComputedStyle(yard).overflow, getComputedStyle(pad).overflow].join(' '),
        dust: dust.length, dustMin: dust.length ? Math.min(...dust.map((d) => d.offsetWidth)) : 0,
        dustBox: dust.length ? box(dust.map((d) => d.getBoundingClientRect()).reduce((a, r) => ({ left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) }))) : null,
        open: gate ? gate.classList.contains('open') : null,
        masks: there ? [truck, ...truck.querySelectorAll('*'), ...dust].filter((e) => { const s = getComputedStyle(e); return (s.maskImage && s.maskImage !== 'none') || (s.webkitMaskImage && s.webkitMaskImage !== 'none') || (s.clipPath && s.clipPath !== 'none'); }).length : 0,
      });
      if (performance.now() - t0 < ms) requestAnimationFrame(step);
      else res({ log, cell: parseFloat(board.style.getPropertyValue('--cell')), board: box(board.getBoundingClientRect()), pad: box(pad.getBoundingClientRect()), side: truck?.dataset.cab });
    };
    requestAnimationFrame(step);
  });
}, ms);
/** How much two screenshots differ inside a box (the share of pixels that changed clearly). */
const differ = (page, a, b, box) => page.evaluate(async ([a, b, box]) => {
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${src}`; });
  const px = async (src) => { const i = await load(src); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(box.x * 2, box.y * 2, box.w * 2, box.h * 2).data; };
  const [p, q] = [await px(a), await px(b)];
  let n = 0;
  for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 60) n++;
  return n / (p.length / 4);
}, [a, b, box]);

// Levels in order until a truck has left by each side: one exit watched frame by frame at full
// speed, and (on its own level visit) one photographed mid-fade in slow motion.
const { context, page } = await open();
const seen = new Set();
for (let ri = 0; ri < 2 && seen.size < 4; ri++) for (let li = 0; li < 10 && seen.size < 4; li++) {
  const lv = REGIONS[ri].levels[li];
  if (lv.trucks.every((t) => seen.has(cabSide(lv, t)))) continue;
  await enter(page, ri, li);
  let st = newGame(lv);
  for (const m of solve(lv)) {
    const t = lv.trucks.find((x) => x.id === m.id); const side = cabSide(lv, t);
    const exits = getMoveRange(st, m.id).exitDelta === m.delta;
    st = tryMove(st, m.id, m.delta).state ?? st;
    if (!exits || seen.has(side)) { await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4); await wait(exits ? 1900 : 450); continue; }
    seen.add(side);
    console.log(`\nwebkit: out by the ${side} gate (${REGIONS[ri].name} ${li + 1}, a ${t.length}-cell truck)`);
    await watch(page, 2200);
    await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4);
    const { log, cell, board, pad } = await page.evaluate(() => window.__exit);
    const on = log.filter((f) => f.there);
    const first = on[0], last = on[on.length - 1];
    const moved = (f) => Math.hypot(f.rect.l - first.rect.l, f.rect.t - first.rect.t);
    const start = on.find((f) => moved(f) > 0.5) ?? first;
    const driveMs = last.t - start.t;
    // 1. Never clipped.
    check(on.length > 20 && on.every((f) => f.clip === 'visible visible') && log.filter((f) => f.dust).every((f) => f.clip === 'visible visible') && log[log.length - 1].clip === 'hidden hidden',
      `nothing clips it or its dust while it leaves (the clip is back afterwards: ${log[log.length - 1].clip}${on.concat(log.filter((f) => f.dust)).filter((f) => f.clip !== 'visible visible').slice(0, 3).map((f) => ` [${Math.round(f.t)} ms: ${f.clip}, truck ${f.there}, dust ${f.dust}]`).join('')})`);
    check(on.every((f) => f.masks === 0), 'no mask-image or clip-path on the truck or the dust (iPhone Safari)');
    // 2. A short drive: the cab about one cell past the gate (the berm's outer edge).
    const past = side === 'left' ? board.l - last.rect.l : side === 'right' ? last.rect.r - board.r : side === 'top' ? board.t - last.rect.t : last.rect.b - board.b;
    check(past > cell * 0.7 && past < cell * 1.1, `the drive ends with its cab ${(past / cell).toFixed(2)} cells past the gate (it drove ${Math.round(moved(last))} px, not ${Math.round(cell * 7)})`);
    // 3. Solid at first, then an eased fade over the last 45%.
    const early = on.filter((f) => f.t <= start.t + driveMs * 0.5);
    const fading = on.filter((f) => f.t > start.t);
    const falls = fading.every((f, i) => i === 0 || f.opacity <= fading[i - 1].opacity + 0.01);
    const half = on.find((f) => f.opacity <= 0.5);
    check(early.every((f) => f.opacity > 0.97) && falls && last.opacity < 0.12 && half && (half.t - start.t) / driveMs > 0.68 && (half.t - start.t) / driveMs < 0.88,
      `solid for the first half of the drive, then fades to ${last.opacity.toFixed(2)} (half gone ${Math.round(((half?.t ?? 0) - start.t) / driveMs * 100)}% of the way through)`);
    // 4. The dust at the gate: big, up before the fade, and over the truck while it fades.
    const mid = on.filter((f) => f.opacity < 0.9 && f.opacity > 0.1);
    const most = Math.max(...log.map((f) => f.dust));
    const covers = mid.every((f) => f.dustBox && f.dustBox.l <= f.rect.l + 2 && f.dustBox.r >= f.rect.r - 2 && f.dustBox.t <= f.rect.t + 2 && f.dustBox.b >= f.rect.b - 2);
    const dustAt = log.find((f) => f.dust)?.t ?? Infinity;
    check(most >= 8 && log.filter((f) => f.dust).every((f) => f.dustMin >= cell * 1.2) && covers && dustAt < start.t + driveMs * 0.5 && dustAt >= start.t - 20,
      `${most} puffs at the gate, each at least ${(Math.min(...log.filter((f) => f.dust).map((f) => f.dustMin)) / cell).toFixed(1)} cells across, up ${Math.round(dustAt - start.t)} ms into the drive and right over the truck while it fades`);
    // 5. The gate's arm: up while the truck is there, down only after it has gone.
    const gone = log.find((f) => f.t > last.t);
    const down = log.find((f) => f.t > last.t && f.open === false);
    check(on.filter((f) => f.open !== null).every((f) => f.open) && down && down.t - last.t < 600 && log[log.length - 1].open === false && !!gone,
      `the gate's arm stays up while it leaves and comes down ${Math.round((down?.t ?? 0) - last.t)} ms after it has gone`);
    await wait(300);
  }
}
check(seen.size === 4, `all four sides were checked (${[...seen].join(', ')})`);

// By the pixels: mid-fade, in slow motion, the truck and its dust are drawn past the pad's edge.
console.log('\nwebkit: by the pixels, mid-fade');
{
  const shot = new Set();
  for (let ri = 0; ri < 2 && shot.size < 4; ri++) for (let li = 0; li < 10 && shot.size < 4; li++) {
    const lv = REGIONS[ri].levels[li];
    if (lv.trucks.every((t) => shot.has(cabSide(lv, t)))) continue;
    await enter(page, ri, li);
    let st = newGame(lv);
    for (const m of solve(lv)) {
      const t = lv.trucks.find((x) => x.id === m.id); const side = cabSide(lv, t);
      const exits = getMoveRange(st, m.id).exitDelta === m.delta;
      st = tryMove(st, m.id, m.delta).state ?? st;
      if (!exits || shot.has(side)) { await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4); await wait(exits ? 1900 : 450); continue; }
      shot.add(side);
      await page.evaluate(() => { window.__slow = true; });
      await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4);
      await page.waitForFunction(() => { const e = document.querySelector('.truck.exiting'); return e && +getComputedStyle(e).opacity < 0.75; }, null, { timeout: 15000 });
      const geo = await page.evaluate(() => { const b = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }; const e = document.querySelector('.truck.exiting'); return { truck: b(e), pad: b(document.querySelector('.pad')), board: b(document.querySelector('.board')), opacity: +getComputedStyle(e).opacity }; });
      const during = (await page.screenshot({ path: join(OUT, `exit_${side}_midfade.png`) })).toString('base64');
      await page.waitForFunction(() => !document.querySelector('.truck.exiting') && !document.querySelector('.dust'), null, { timeout: 20000 });
      await page.evaluate(() => { window.__slow = false; });
      await wait(700);
      const after = (await page.screenshot()).toString('base64');
      // The berm's gap in the truck's lane: between the pad's edge and the board's outer edge.
      const { truck: r, pad, board } = geo;
      const inset = 6;
      const gap = side === 'left' ? { x: board.l, y: r.t + inset, w: pad.l - board.l, h: r.b - r.t - inset * 2 }
        : side === 'right' ? { x: pad.r, y: r.t + inset, w: board.r - pad.r, h: r.b - r.t - inset * 2 }
        : side === 'top' ? { x: r.l + inset, y: board.t, w: r.r - r.l - inset * 2, h: pad.t - board.t }
        : { x: r.l + inset, y: pad.b, w: r.r - r.l - inset * 2, h: board.b - pad.b };
      const box = Object.fromEntries(Object.entries(gap).map(([k, v]) => [k, Math.round(v)]));
      const d = await differ(page, during, after, box);
      check(d > 0.5, `${side}: at ${Math.round(geo.opacity * 100)}% it is drawn right across the berm's gap, past the pad's edge (${Math.round(d * 100)}% of the gap's pixels are truck or dust)`);
    }
  }
}
await context.close();

console.log('\nwebkit: reduced motion');
{
  const { context: c2, page: p2 } = await open('reduce');
  const lv = REGIONS[0].levels[0];
  await enter(p2, 0, 0);
  const m = solve(lv)[0];
  await watch(p2, 900);
  await drag(p2, m.id, m.delta + Math.sign(m.delta) * 0.4);
  const { log } = await p2.evaluate(() => window.__exit);
  const left = await p2.evaluate((id) => !document.querySelector(`.truck[data-id="${id}"]`), m.id);
  check(left && log.filter((f) => f.there).length <= 1 && log.every((f) => f.dust === 0 && f.clip === 'hidden hidden'), 'the truck is removed at once: no drive, no fade, no dust');
  await c2.close();
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
