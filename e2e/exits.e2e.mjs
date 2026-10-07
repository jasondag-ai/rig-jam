// Gate exits (Playwright, WebKit: Safari's engine). A truck leaving through its gate, on each of the
// four sides:
//  - is never cut off: the yard's clip is lifted while it leaves, and by the pixels of a screenshot
//    taken mid-fade it is drawn past the pad's edge, in the berm's gap
//  - drives only a little way: its cab ends about one cell past the gate
//  - stays solid for the first part of the drive, then fades to nothing over the last 45%
//  - fades inside a big puff of dust at the gate (no mask-image anywhere)
//  - the gate's arm comes down only once the truck has gone
//  - THE TAIL CLEARS THE GATE, THEN IT FADES: not a frame of fading while any of it is still in the gate
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
    check(on.length > 8 && on.every((f) => f.clip === 'visible visible') && log.filter((f) => f.dust).every((f) => f.clip === 'visible visible') && log[log.length - 1].clip === 'hidden hidden',
      `nothing clips it or its dust while it leaves (the clip is back afterwards: ${log[log.length - 1].clip}${on.concat(log.filter((f) => f.dust)).filter((f) => f.clip !== 'visible visible').slice(0, 3).map((f) => ` [${Math.round(f.t)} ms: ${f.clip}, truck ${f.there}, dust ${f.dust}]`).join('')})`);
    check(on.every((f) => f.masks === 0), 'no mask-image or clip-path on the truck or the dust (iPhone Safari)');
    // 2. THE TAIL CLEARS THE GATE, THEN IT FADES: solid for as long as any of it is still inside the
    //    board's outer edge (the pad or the berm's band); fading only once its tail is through.
    const tailOut = (f) => (side === 'left' ? f.rect.r <= board.l + 1 : side === 'right' ? f.rect.l >= board.r - 1 : side === 'top' ? f.rect.b <= board.t + 1 : f.rect.t >= board.b - 1);
    const inside = on.filter((f) => !tailOut(f)), fading = on.filter((f) => f.opacity < 0.985);
    const tailPast = (f) => (side === 'left' ? board.l - f.rect.r : side === 'right' ? f.rect.l - board.r : side === 'top' ? board.t - f.rect.b : f.rect.t - board.b);
    check(inside.length > 6 && inside.every((f) => f.opacity > 0.985) && fading.length > 2 && fading.every(tailOut),
      `it rolls out solid: not a frame of fading while any of it is in the gate (${inside.length} frames inside, all at full strength; it starts to fade with its tail ${fading.length ? tailPast(fading[0]).toFixed(0) : '?'} px past the gate)`);
    // 3. Then a short fade, over a short coast: gone within a third of a second, its tail under a cell past the gate.
    const falls = fading.every((f, i) => i === 0 || f.opacity <= fading[i - 1].opacity + 0.01);
    const fadeMs = fading.length ? last.t - fading[0].t : 0;
    check(falls && last.opacity < 0.2 && fadeMs > 80 && fadeMs < 360 && tailPast(last) < cell * 0.9 && tailPast(last) > 0,
      `then it fades to ${last.opacity.toFixed(2)} in ${Math.round(fadeMs)} ms, coasting to ${(tailPast(last) / cell).toFixed(2)} cells past the gate (the whole drive: ${Math.round(driveMs)} ms)`);
    // 4. The dust it kicks up at the gate as it goes through.
    const most = Math.max(...log.map((f) => f.dust));
    const dustAt = log.find((f) => f.dust)?.t ?? Infinity;
    check(most >= 5 && log.filter((f) => f.dust).every((f) => f.dustMin >= cell * 0.8) && dustAt > start.t && dustAt < (fading[0]?.t ?? 0),
      `${most} puffs of dust at the gate, each at least ${(Math.min(...log.filter((f) => f.dust).map((f) => f.dustMin)) / cell).toFixed(1)} cells across, kicked up ${Math.round(dustAt - start.t)} ms into the roll (before it fades)`);
    // 5. The gate's arm: up while the truck is there, down only after it has gone.
    const gone = log.find((f) => f.t > last.t);
    const down = log.find((f) => f.t > last.t && f.open === false);
    check(on.filter((f) => f.open !== null).every((f) => f.open) && down && down.t - last.t < 600 && log[log.length - 1].open === false && !!gone,
      `the gate's arm stays up while it leaves and comes down ${Math.round((down?.t ?? 0) - last.t)} ms after it has gone`);
    await wait(300);
  }
}
check(seen.size === 4, `all four sides were checked (${[...seen].join(', ')})`);

// By the pixels: half way through the gate, the truck is drawn SOLID right across the berm's gap, and
// outside the lease it passes under the HUD and the buttons, never over them.
console.log('\nwebkit: by the pixels, half way through the gate');
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
      await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4);
      // The moment it straddles the gate: its cab past the board's outer edge, its tail still on the pad.
      const geo = await page.evaluate((side) => new Promise((res) => {
        const b = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
        const pad = b(document.querySelector('.pad')), board = b(document.querySelector('.board'));
        const z = (sel) => +getComputedStyle(document.querySelector(sel)).zIndex || 0;
        const t0 = performance.now();
        const step = () => {
          const e = document.querySelector('.truck.exiting');
          if (e) {
            const r = b(e);
            const through = side === 'left' ? r.l < board.l - 2 && r.r > pad.l + 2 : side === 'right' ? r.r > board.r + 2 && r.l < pad.r - 2 : side === 'top' ? r.t < board.t - 2 && r.b > pad.t + 2 : r.b > board.b + 2 && r.t < pad.b - 2;
            if (through) return res({ truck: r, pad, board, opacity: +getComputedStyle(e).opacity, over: { hud: z('.screen.game > .hud'), controls: z('.screen.game > .controls'), stage: z('.screen.game > .stage') } });
          }
          if (performance.now() - t0 > 4000) return res(null);
          requestAnimationFrame(step);
        };
        step();
      }), side);
      const during = (await page.screenshot({ path: join(OUT, `exit_${side}_through.png`) })).toString('base64');
      await page.waitForFunction(() => !document.querySelector('.truck.exiting') && !document.querySelector('.dust'), null, { timeout: 20000 });
      await wait(700);
      const after = (await page.screenshot()).toString('base64');
      if (!geo) { check(false, `${side}: it never straddled the gate`); continue; }
      // The berm's gap in the truck's lane: between the pad's edge and the board's outer edge.
      const { truck: r, pad, board } = geo;
      const inset = 6;
      const gap = side === 'left' ? { x: board.l, y: r.t + inset, w: pad.l - board.l, h: r.b - r.t - inset * 2 }
        : side === 'right' ? { x: pad.r, y: r.t + inset, w: board.r - pad.r, h: r.b - r.t - inset * 2 }
        : side === 'top' ? { x: r.l + inset, y: board.t, w: r.r - r.l - inset * 2, h: pad.t - board.t }
        : { x: r.l + inset, y: pad.b, w: r.r - r.l - inset * 2, h: board.b - pad.b };
      const box = Object.fromEntries(Object.entries(gap).map(([k, v]) => [k, Math.round(v)]));
      const d = await differ(page, during, after, box);
      check(geo.opacity > 0.985 && d > 0.5, `${side}: half way through the gate it is drawn solid (${Math.round(geo.opacity * 100)}%) right across the berm's gap (${Math.round(d * 100)}% of the gap's pixels are truck or dust)`);
      check(geo.over.hud > geo.over.stage && geo.over.controls > geo.over.stage, `${side}: outside the lease it passes under the HUD and the buttons (they are drawn over the lease's layer)`);
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

console.log('\nwebkit: the driver\'s arm');
{
  const { context: c3, page: p3 } = await open();
  const sizes = {};
  for (let li = 0; li < 10 && !(sizes.pickup && sizes.rig); li++) {
    await enter(p3, 0, li);
    const got = await p3.evaluate(() => {
      const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
      return [...document.querySelectorAll('.truck')].map((el) => {
        el.classList.add('waving');
        const box = el.getBoundingClientRect(), parts = [...el.querySelectorAll('.driver-arm i')].map((i) => i.getBoundingClientRect());
        const l = Math.min(...parts.map((q) => q.left)), r = Math.max(...parts.map((q) => q.right)), t = Math.min(...parts.map((q) => q.top)), b = Math.max(...parts.map((q) => q.bottom));
        const up = el.querySelector('.driver-arm .upper').getBoundingClientRect(), cs = getComputedStyle(el.querySelector('.driver-arm .hand'));
        const out = { kind: el.dataset.kind, cells: Math.round(Math.max(box.width, box.height) / cell), across: Math.min(box.width, box.height), cell,
          long: Math.max(r - l, b - t), outside: Math.max(box.left - l, r - box.right, box.top - t, b - box.bottom),
          sill: up.left >= box.left && up.right <= box.right && up.top >= box.top && up.bottom <= box.bottom,
          hand: el.querySelector('.driver-arm .hand').getBoundingClientRect().width, skin: cs.backgroundColor, line: cs.borderTopColor,
          waves: getComputedStyle(el.querySelector('.driver-arm .fore')).animationName };
        el.classList.remove('waving');
        return out;
      });
    });
    sizes.pickup ??= got.find((t) => t.kind === 'pickup');
    sizes.rig ??= got.find((t) => t.cells === 3);
  }
  for (const [name, a] of Object.entries(sizes)) {
    if (!a) { check(false, `${name}: no such truck found`); continue; }
    check(a.long <= a.across / 2 && a.outside <= a.cell * 0.12, `${name}: the whole arm is ${a.long.toFixed(1)} px long, under half the cab's width (${a.across.toFixed(0)} px), and shows ${a.outside.toFixed(1)} px past the truck's box`);
    check(a.sill && a.waves === 'wave', `${name}: the upper arm rests on the door sill (inside the truck's own box) and the forearm is what waves`);
    check(a.hand < a.cell * 0.1 && a.skin === 'rgb(240, 192, 154)' && a.line === 'rgb(43, 30, 22)', `${name}: a small hand (${a.hand.toFixed(1)} px) in the worker puppets' skin and outline`);
  }
  check(sizes.pickup && sizes.rig && Math.abs(sizes.pickup.long - sizes.rig.long) < 0.5, 'the same arm on a pickup and on a 3-cell rig');
  await c3.close();
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
