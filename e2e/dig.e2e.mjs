// Wildlife Log v2, the deep dig (Playwright; WebKit for the look and the taps, Chromium for frame rate).
//  - behind the card grid there is ONE continuous cross-section, ten formations top to bottom, and
//    below the last card it keeps going down to the reef reservoir; by the pixels of a screenshot
//    the page's side margin shows rock, not grass, at every depth
//  - a wellbore runs from the surface into the reservoir
//  - every formation has its pill; a region's pill is greyed until that region is unlocked
//  - fifteen buried things: each a full tap target nothing covers; a tap wiggles it and shows its
//    one line in a bubble that points at it; the egg cracks, peeks and closes; none is a log entry
//  - reduced motion: nothing moves
//  - 60 fps while scrolling the whole dig with a 4x slower CPU, at 390 and 375 wide
// Run with the dev server up: npm run test:e2e:dig
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { BURIED, FORMATIONS } from '../src/ui/log-dig.ts';
import { BURIED_LINES } from '../src/ui/lines.ts';
import { LOG_ENTRIES } from '../src/ui/wildlife-log.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

async function open(browser, { width = 390, height = 844, progress = null, reducedMotion = 'no-preference', query = '?cover=0' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, reducedMotion });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); if (p) localStorage.setItem('rush-hour-rigs:v2', p); }, progress);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.binoculars').click();
  await page.waitForSelector('.dig-bg svg.strata');
  await page.evaluate(() => document.fonts.ready);
  await wait(300);
  return { context, page };
}
const tap = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s); const r = el.getBoundingClientRect();
  const at = { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
  for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(type, { pointerId: 3, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, buttons: type === 'pointerdown' ? 1 : 0, ...at }));
}, sel);

const wk = await webkit.launch();
for (const [width, height] of [[390, 844], [375, 667]]) {
  console.log(`\nwebkit ${width}x${height}: the cross-section`);
  const { context, page } = await open(wk, { width, height });
  const dig = await page.evaluate(() => {
    const col = document.querySelector('.dig-col'), svg = document.querySelector('.dig-bg svg.strata'), screen = document.querySelector('.screen.log');
    const c = col.getBoundingClientRect(), s = svg.getBoundingClientRect(), sc = screen.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.log-card')];
    const last = cards.at(-1).getBoundingClientRect();
    const bore = svg.querySelector('.wellbore');
    const reef = document.querySelector('.dig-window[data-layer="reef"]').getBoundingClientRect();
    return {
      svgs: document.querySelectorAll('.dig-bg svg').length, layers: [...svg.querySelectorAll('.stratum')].map((g) => g.dataset.layer),
      wide: s.left <= sc.left + 0.5 && s.right >= sc.left + screen.clientWidth - 0.5, top: Math.abs(s.top - c.top), tall: s.height - c.height, below: s.bottom - last.bottom,
      order: [...document.querySelector('.dig-col').children].filter((c) => c.matches('.log-cards, .dig-window')).map((c) => (c.matches('.dig-window') ? c.dataset.layer : 'cards')), cards: cards.length, groups: [...document.querySelectorAll('.dig-col .log-cards')].map((u) => u.children.length),
      boreTop: +bore.dataset.top, td: +bore.dataset.td + s.top, reef: { top: reef.top, bottom: reef.bottom }, wellhead: !!svg.querySelector('.wellhead'),
      scrollX: screen.scrollWidth > screen.clientWidth + 1, end: Math.round(screen.scrollHeight - (s.bottom - sc.top + screen.scrollTop)),
    };
  });
  check(dig.svgs === 1 && dig.layers.join() === FORMATIONS.map((f) => f.id).join(), `ONE drawing behind the grid, ${dig.layers.length} formations top to bottom: ${dig.layers.join(', ')}`);
  check(dig.wide && dig.top < 1 && Math.abs(dig.tall) < 2 && !dig.scrollX, 'it spans the whole screen width and the whole height of the log, with no sideways scroll');
  {
    // Groups of four; a window after each of the first four groups; every later group, then the deep formations.
    const groups = Math.ceil(LOG_ENTRIES.length / 4), wins = FORMATIONS.filter((f) => f.window).map((f) => f.id), want = [];
    for (let g = 1; g <= groups; g++) { want.push('cards'); if (g <= 4 && g < groups) want.push(wins[g - 1]); }
    want.push(...wins.slice(Math.min(4, groups - 1)));
    check(dig.cards === LOG_ENTRIES.length && dig.groups.every((n, i) => n === Math.min(4, dig.cards - i * 4)) && dig.order.join() === want.join() && dig.below > 500, `the ${dig.cards} cards stand over it in groups of four with a window on the rock between them (${dig.order.join(' ')}); below the last card it keeps going down another ${Math.round(dig.below)} px`);
  }
  check(dig.wellhead && dig.boreTop <= 16 && dig.td > dig.reef.top + 40 && dig.td < dig.reef.bottom, 'a wellbore runs from a wellhead at the surface down into the reservoir');
  check(dig.end === 0, `the page ends in the reservoir, with no grass under the oil (${dig.end} px left over)`);

  // By the pixels: down the page's left margin there is rock at every depth, each formation its own colour.
  {
    const marks = await page.evaluate(() => [...document.querySelectorAll('.dig-window')].map((w) => ({ id: w.dataset.layer, y: w.getBoundingClientRect().top + document.querySelector('.screen.log').scrollTop + w.offsetHeight * 0.55 })));
    const tones = [];
    for (const m of marks) {
      await page.evaluate((y) => { document.querySelector('.screen.log').scrollTop = y - 300; }, m.y);
      await wait(120);
      const at = await page.evaluate((id) => { const w = document.querySelector(`.dig-window[data-layer="${id}"]`).getBoundingClientRect(); return w.top + w.height * 0.55; }, m.id);
      const shot = (await page.screenshot({ clip: { x: 1, y: Math.round(at) - 20, width: 10, height: 40 } })).toString('base64');
      const mean = await page.evaluate(async (src) => { const i = new Image(); await new Promise((r) => { i.onload = r; i.src = `data:image/png;base64,${src}`; }); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); const d = g.getImageData(0, 0, i.width, i.height).data; const m = [0, 0, 0]; for (let k = 0; k < d.length; k += 4) for (let j = 0; j < 3; j++) m[j] += d[k + j]; return m.map((v) => Math.round(v / (d.length / 4))); }, shot);
      tones.push({ id: m.id, mean });
    }
    const grassy = tones.filter((t) => t.mean[1] > t.mean[0] + 18 && t.mean[1] > t.mean[2] + 18);
    const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const alike = tones.slice(1).filter((t, i) => far(t.mean, tones[i].mean) < 14);
    check(tones.length === 9 && grassy.length === 0 && alike.length === 0, `in the page's margin, rock at every depth and a different rock in each formation (${tones.map((t) => `${t.id} ${t.mean.join(' ')}`).join('; ')})`);
  }

  // Pills.
  const pills = await page.evaluate(async () => {
    const out = [];
    for (const p of document.querySelectorAll('.dig-pill')) {
      p.scrollIntoView({ block: 'center' });
      await new Promise((r) => requestAnimationFrame(r));
      const r = p.getBoundingClientRect();
      out.push({ id: p.dataset.layer, text: p.textContent, locked: p.classList.contains('locked'), seen: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === p, h: r.height, bg: getComputedStyle(p).backgroundColor });
    }
    return out;
  });
  check(pills.map((p) => p.text).join() === FORMATIONS.map((f) => f.name).join() && pills.every((p) => p.seen && p.h <= 30), `a small pill names every formation, none covered: ${pills.map((p) => p.text).join(', ')}`);
  check(pills.filter((p) => p.locked).map((p) => p.id).join() === 'mannville,montney,bakken,duvernay' && new Set(pills.filter((p) => p.locked).map((p) => p.bg)).size === 1 && pills.find((p) => p.id === 'cardium').bg !== pills.find((p) => p.id === 'montney').bg,
    `a new player: Cardium's pill is live, the locked regions' pills are greyed (${pills.filter((p) => p.locked).map((p) => p.text).join(', ')})`);

  if (width === 390) {
    await page.evaluate(() => { document.querySelector('.screen.log').scrollTop = 0; });
    await wait(150);
    await page.screenshot({ path: join(OUT, 'log_dig_top.png') });
    await page.evaluate(() => { const s = document.querySelector('.screen.log'); s.scrollTop = s.scrollHeight; });
    await wait(150);
    await page.screenshot({ path: join(OUT, 'log_dig_reservoir.png') });
  }

  // Buried things.
  console.log(`webkit ${width}x${height}: buried things`);
  const before = await page.evaluate(() => [document.querySelector('.log-count').textContent, localStorage.getItem('rush-hour-rigs:log')]);
  const things = await page.$$eval('.buried', (bs) => bs.map((b) => b.dataset.id));
  check(things.length === 15 && things.slice().sort().join() === BURIED.map((b) => b.id).sort().join(), `${things.length} buried things: ${things.join(', ')}`);
  let bad = [];
  for (const b of BURIED) {
    const sel = `.buried[data-id="${b.id}"]`;
    const seen = await page.evaluate(async (s) => {
      const el = document.querySelector(s);
      el.scrollIntoView({ block: 'center' });
      await new Promise((r) => requestAnimationFrame(r));
      const r = el.getBoundingClientRect(), win = el.closest('.dig-window').dataset.layer;
      const pts = [[0.5, 0.5], [0.25, 0.3], [0.75, 0.7]].map(([fx, fy]) => document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy));
      return { w: r.width, h: r.height, win, top: pts.every((p) => el.contains(p)), inside: r.left >= 0 && r.right <= innerWidth };
    }, sel);
    await tap(page, sel);
    await wait(90);
    const now = await page.evaluate(([s, id]) => {
      const el = document.querySelector(s), bub = document.querySelector('.dig-bubble');
      if (!bub) return null;
      const r = el.getBoundingClientRect(), q = bub.getBoundingClientRect();
      const tail = q.left + parseFloat(getComputedStyle(bub).getPropertyValue('--tail'));
      const part = (c) => el.querySelector(c) && getComputedStyle(el.querySelector(c)).animationName;
      return { text: bub.textContent, bubbles: document.querySelectorAll('.dig-bubble').length, for: bub.dataset.for, cls: el.className, anim: getComputedStyle(el.firstElementChild).animationName, eye: id === 'egg' ? [part('.egg-crack'), part('.egg-peek'), part('.egg-eye')] : null,
        onIt: tail >= r.left - 1 && tail <= r.right + 1 && q.bottom <= r.top + 1 && r.top - q.bottom < 30, fits: q.left >= 0 && q.right <= innerWidth + 0.5 && q.top >= 0, oneLine: q.height < 50 };
    }, [sel, b.id]);
    const ok = seen.win === b.in && seen.w >= 44 && seen.h >= 44 && seen.top && seen.inside && now && now.text === BURIED_LINES[b.id] && now.bubbles === 1 && now.onIt && now.fits && now.oneLine &&
      (b.id === 'egg' ? /peek/.test(now.cls) && now.anim === 'egg-rock' && now.eye.join() === 'egg-crack,egg-open,egg-blink' : /wiggle/.test(now.cls) && now.anim === 'buried-wiggle');
    if (!ok) bad.push(`${b.id}: ${JSON.stringify({ seen, now })}`);
  }
  check(bad.length === 0, `each is in its own formation, a full tap target with nothing over it; a tap wiggles it and shows its one line in a bubble pointing at it${bad.length ? ` (wrong: ${bad.join(' | ')})` : ''}`);
  check(await page.evaluate(() => document.querySelector('.buried-egg.peek') === null && document.querySelector('.dig-bubble').dataset.for !== 'egg'), 'one bubble at a time: the next tap takes the last one down');
  // The egg: it cracks, an eye peeks, and it closes again.
  await tap(page, '.buried[data-id="egg"]');
  const eggAt = (ms) => wait(ms).then(() => page.evaluate(() => { const e = document.querySelector('.buried-egg'); return { peek: e.classList.contains('peek'), crack: +getComputedStyle(e.querySelector('.egg-crack')).opacity, eye: +getComputedStyle(e.querySelector('.egg-peek')).opacity, bubble: document.querySelector('.dig-bubble')?.textContent ?? null }; }));
  const e1 = await eggAt(1100), e2 = await eggAt(1900);
  check(e1.peek && e1.crack > 0.9 && e1.eye > 0.9 && e1.bubble === BURIED_LINES.egg && !e2.peek && e2.crack === 0 && e2.eye === 0 && e2.bubble === null, `the egg cracks and one eye peeks out ("${e1.bubble}"), then it closes and the bubble goes`);
  // The oil at the very bottom has the last word.
  await page.evaluate(() => { const s = document.querySelector('.screen.log'); s.scrollTop = s.scrollHeight; });
  await wait(150);
  await tap(page, '.dig-oil');
  await wait(90);
  const oil = await page.evaluate(() => { const o = document.querySelector('.dig-oil').getBoundingClientRect(), b = document.querySelector('.dig-bubble'), q = b?.getBoundingClientRect(); return { text: b?.textContent, h: o.height, w: o.width, seen: q && q.top >= 0 && q.bottom <= innerHeight && q.left >= 0 && q.right <= innerWidth + 0.5, top: document.elementFromPoint(o.left + o.width * 0.25, o.top + o.height / 2)?.className }; });
  check(oil.text === BURIED_LINES.reservoir && oil.h >= 44 && oil.seen && oil.top === 'dig-oil wiggle', `tap the oil: "${oil.text}"`);
  const after = await page.evaluate(() => [document.querySelector('.log-count').textContent, localStorage.getItem('rush-hour-rigs:log')]);
  check(after.join() === before.join() && !(await page.$('.toast')), `they are not log entries: the count stays ${after[0]}, nothing is saved, no toast`);
  await context.close();
}

console.log('\nwebkit: every region unlocked');
{
  const { context, page } = await open(wk, { progress: UNLOCKED });
  check((await page.$$eval('.dig-pill.locked', (p) => p.length)) === 0 && (await page.$$eval('.dig-pill', (p) => p.length)) === 10, 'no pill is greyed once every region is open');
  await context.close();
}

console.log('\nwebkit: reduced motion');
{
  const { context, page } = await open(wk, { reducedMotion: 'reduce' });
  await page.evaluate(() => document.querySelector('.buried[data-id="tusk"]').scrollIntoView({ block: 'center' }));
  await tap(page, '.buried[data-id="tusk"]');
  await wait(80);
  const still = await page.evaluate(() => ({ anim: getComputedStyle(document.querySelector('.buried[data-id="tusk"] svg')).animationName, bubble: document.querySelector('.dig-bubble')?.textContent, bubbleAnim: getComputedStyle(document.querySelector('.dig-bubble')).animationName, glints: [...document.querySelectorAll('.oil-glint')].map((g) => getComputedStyle(g).animationName) }));
  await page.evaluate(() => document.querySelector('.buried[data-id="egg"]').scrollIntoView({ block: 'center' }));
  await tap(page, '.buried[data-id="egg"]');
  await wait(80);
  const egg = await page.evaluate(() => { const e = document.querySelector('.buried-egg'); return { anims: ['svg', '.egg-crack', '.egg-peek', '.egg-eye'].map((s) => getComputedStyle(e.querySelector(s)).animationName), eye: +getComputedStyle(e.querySelector('.egg-peek')).opacity }; });
  check(still.anim === 'none' && still.bubbleAnim === 'none' && still.bubble === BURIED_LINES.tusk && still.glints.length >= 6 && still.glints.every((a) => a === 'none'), 'a tap shows the line with no wiggle and no pop; the oil does not shimmer');
  check(egg.anims.every((a) => a === 'none') && egg.eye === 1, 'the egg simply shows its eye while its line is up');
  await context.close();
}
await wk.close();

// Frame rate: the whole dig scrolled top to bottom and back with a 4x slower CPU.
const cr = await chromium.launch();
for (const [width, height] of [[390, 844], [375, 667]]) {
  console.log(`\nchromium ${width}x${height}: frame rate with a 4x slower CPU`);
  const { context, page } = await open(cr, { width, height, progress: UNLOCKED });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const p95 = (g) => g.slice().sort((a, b) => a - b)[Math.floor(g.length * 0.95)];
  const median = (g) => g.slice().sort((a, b) => a - b)[g.length >> 1];
  const scroll = await page.evaluate(() => new Promise((res) => {
    const s = document.querySelector('.screen.log'); const max = s.scrollHeight - s.clientHeight; const g = []; let last = performance.now(); const t0 = last; const MS = 6000;
    const tick = (n) => { g.push(n - last); last = n; const k = (n - t0) / MS; s.scrollTop = max * (k < 0.5 ? k * 2 : 2 - k * 2); k >= 1 ? res({ g: g.slice(3), max }) : requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }));
  check(p95(scroll.g) < 20 && median(scroll.g) < 17.5, `scrolling the whole dig down and back (${Math.round(scroll.max)} px each way in 6 s): p95 frame ${p95(scroll.g).toFixed(1)} ms, median ${median(scroll.g).toFixed(1)} ms`);
  // At the reservoir, with the oil shimmering and a thing wiggling.
  await page.evaluate(() => { const s = document.querySelector('.screen.log'); s.scrollTop = s.scrollHeight; });
  await wait(300);
  const measuring = page.evaluate(() => new Promise((res) => { const g = []; let last = performance.now(); const t0 = last; const tick = (n) => { g.push(n - last); last = n; n - t0 > 2500 ? res(g.slice(3)) : requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
  await tap(page, '.buried[data-id="trilobite"]');
  await wait(800);
  await tap(page, '.buried[data-id="bit"]');
  const idle = await measuring;
  check(p95(idle) < 20, `at the reservoir, oil shimmering and things wiggling: p95 frame ${p95(idle).toFixed(1)} ms`);
  await context.close();
}
await cr.close();

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
