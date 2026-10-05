// Night levels (Playwright, WebKit as the judge; Chromium for the frame rate).
//  - every flare level plays at night; others do not; ?night=0 / ?night=1 force it
//  - the ground, berm and scenery drop to about half brightness; trucks and gates far less; the
//    HUD and the buttons do not change at all (compared by pixels with the same level by day)
//  - a warm glow round each flare, about 2.5 cells across, flickering; headlights on every cab
//  - the nudge: one bubble from a truck after the idle time, once per level
//  - gags still play; reduced motion: no flicker; 60 fps with the CPU slowed 4x
// Run with the dev server up: npm run test:e2e:night
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const QUIET = '?cover=0&magpie=0&worker=0&moose=0&cooldown=0&off=lunch';
const region = (id) => REGIONS.findIndex((r) => r.id === id);

async function open(browser, { query = QUIET, level = [1, 1], reducedMotion = 'no-preference', width = 390, height = 844 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, reducedMotion });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  if (!query.includes('gag=')) {
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(level[0]).click();
    await page.locator('.level-btn').nth(level[1]).click();
  }
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(500);
  return { context, page };
}
/** Mean brightness (0 to 255) of a patch of the screen. */
async function patch(page, box) {
  const shot = (await page.screenshot({ clip: box })).toString('base64');
  // Decoded in the page itself (a canvas), so the suite needs no image library.
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return sum / (d.length / 4);
  }, shot);
}
const boxOf = (page, sel, inset = 0) => page.evaluate(([s, k]) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width * k, y: r.y + r.height * k, width: r.width * (1 - 2 * k), height: r.height * (1 - 2 * k) }; }, [sel, inset]);
const drag = (page, id, cells, settle = 300) =>
  page.evaluate(async ([truckId, n, ms]) => {
    const el = document.querySelector(`.truck[data-id="${truckId}"]:not(.exiting)`);
    const r = el.getBoundingClientRect();
    const h = el.classList.contains('horiz');
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    let x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 21, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown');
    for (let k = 0; k < 14; k++) { if (h) x += (n * cell) / 14; else y += (n * cell) / 14; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); }
    ev('pointerup');
    await new Promise((q) => setTimeout(q, ms));
  }, [id, cells, settle]);

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();

  if (engine === 'webkit') {
    // ---------- Which levels ----------
    console.log(`\n${engine}: which levels play at night`);
    for (const [r, li, want] of [['montney', 1, true], ['montney', 7, true], ['montney', 9, true], ['duvernay', 3, true], ['duvernay', 7, true], ['duvernay', 9, true], ['montney', 0, false], ['cardium', 4, false]]) {
      const { context, page } = await open(browser, { level: [region(r), li] });
      const s = await page.evaluate(() => ({ night: document.querySelector('.screen.game').classList.contains('night'), board: document.querySelector('.board').classList.contains('night'), shade: !!document.querySelector('.night-shade'), flares: document.querySelectorAll('.obstacle.flare').length, glows: [...document.querySelectorAll('.flare-glow')].filter((g) => getComputedStyle(g).display !== 'none').length, lamps: [...document.querySelectorAll('.truck .lamps')].filter((g) => getComputedStyle(g).display !== 'none').length, trucks: document.querySelectorAll('.truck').length }));
      if (want) check(s.night && s.board && s.shade && s.flares > 0 && s.glows === s.flares && s.lamps === s.trucks, `${r} ${li + 1}: night, a glow on its flare, headlights on all ${s.trucks} trucks`);
      else check(!s.night && !s.board && !s.shade && s.glows === 0 && s.lamps === 0, `${r} ${li + 1}: day`);
      await context.close();
    }
    {
      const { context, page } = await open(browser, { query: QUIET + '&night=1', level: [region('cardium'), 4] });
      check(await page.evaluate(() => document.querySelector('.screen.game').classList.contains('night')), 'any level can be made night (?night=1; in the data it is the level\'s `night` flag)');
      await context.close();
    }

    // ---------- The look, by pixels against the same level by day ----------
    for (const [r, li] of [['montney', 1], ['duvernay', 3]]) {
      console.log(`\n${engine}: ${r} ${li + 1} by night against by day`);
      const shots = {};
      for (const mode of ['night', 'day']) {
        const { context, page } = await open(browser, { query: QUIET + (mode === 'day' ? '&night=0' : ''), level: [region(r), li], reducedMotion: 'reduce' });
        const level = REGIONS[region(r)].levels[li];
        // An empty pad cell far from the flare, a patch of grass or snow below the lease, the berm, a truck, a gate, the Hint button, the HUD.
        const geo = await page.evaluate(([trucks, obstacles]) => {
          const b = document.querySelector('.board').getBoundingClientRect();
          const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')), fence = parseFloat(document.querySelector('.board').style.getPropertyValue('--fence'));
          const taken = new Set();
          for (const t of trucks) for (let k = 0; k < t.length; k++) taken.add(`${t.row + (t.orient === 'v' ? k : 0)},${t.col + (t.orient === 'h' ? k : 0)}`);
          for (const o of obstacles) for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) taken.add(`${o.row + dr},${o.col + dc}`);
          let free = null;
          for (let row = 5; row >= 0 && !free; row--) for (let col = 0; col < 6 && !free; col++) if (!taken.has(`${row},${col}`)) free = { row, col };
          const note = document.querySelector('.note').getBoundingClientRect();
          return {
            pad: { x: b.left + fence + free.col * cell + cell * 0.25, y: b.top + fence + free.row * cell + cell * 0.25, width: cell * 0.5, height: cell * 0.5 },
            ground: { x: 4, y: note.top - 14, width: 30, height: 10 },
            berm: { x: b.left + b.width * 0.14, y: b.bottom - fence * 0.8, width: cell * 0.5, height: fence * 0.6 }, // the bottom berm, away from gates and the flare's light
            sky: { x: 150, y: 2, width: 60, height: 8 },
          };
        }, [level.trucks, level.obstacles]);
        const m = {};
        for (const [k, box] of Object.entries(geo)) m[k] = await patch(page, box);
        m.truck = await patch(page, await boxOf(page, '.truck .art', 0.3));
        m.gate = await patch(page, await boxOf(page, '.gate', 0.3));
        m.hint = await patch(page, await boxOf(page, '.hint-btn', 0.1));
        m.restart = await patch(page, await boxOf(page, '[data-act="restart"]', 0.1));
        m.hud = await patch(page, await boxOf(page, '.hud .score', 0));
        m.sym = await patch(page, await boxOf(page, '.truck .sym', 0.2));
        shots[mode] = m;
        await context.close();
      }
      const ratio = (k) => shots.night[k] / shots.day[k];
      check(ratio('pad') > 0.2 && ratio('pad') < 0.62 && ratio('ground') < 0.62 && ratio('berm') < 0.7, `ground dimmed: pad ${ratio('pad').toFixed(2)}, outside ${ratio('ground').toFixed(2)}, berm ${ratio('berm').toFixed(2)} of its daytime brightness`);
      check(ratio('truck') > 0.8 && ratio('gate') > 0.75, `trucks and gates dimmed much less: truck ${ratio('truck').toFixed(2)}, gate ${ratio('gate').toFixed(2)}`);
      check(ratio('sym') > 0.93, `symbol badges keep their brightness (${ratio('sym').toFixed(2)})`);
      check(Math.abs(ratio('hint') - 1) < 0.01 && Math.abs(ratio('restart') - 1) < 0.01, `the buttons are unchanged (Hint ${ratio('hint').toFixed(3)}, Restart ${ratio('restart').toFixed(3)})`);
      check(shots.night.truck > shots.night.pad * 1.6, `a truck stands well clear of the night pad (${Math.round(shots.night.truck)} against ${Math.round(shots.night.pad)})`);
      check(shots.night.sky < 60 && shots.night.sky < shots.day.sky * 0.4, `a deep night sky (${Math.round(shots.night.sky)}, by day ${Math.round(shots.day.sky)})`);
    }

    // ---------- Sky, glow, headlights ----------
    console.log(`\n${engine}: sky, flare glow, headlights`);
    {
      const { context, page } = await open(browser, { level: [region('montney'), 1] });
      const s = await page.evaluate(() => {
        const R = (q) => document.querySelector(q).getBoundingClientRect();
        const moon = [...document.querySelectorAll('.night-sky circle')].find((c) => c.getAttribute('fill') === '#f6efc8')?.getBoundingClientRect();
        const glow = R('.flare-glow'), flare = R('.obstacle.flare'), cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
        const lamps = [...document.querySelectorAll('.truck')].map((t) => { const l = t.querySelector('.lamps').getBoundingClientRect(), b = t.getBoundingClientRect(), cab = t.dataset.cab; return cab === 'right' ? l.right > b.right && l.left > b.left + b.width / 2 : cab === 'left' ? l.left < b.left && l.right < b.left + b.width / 2 : cab === 'top' ? l.top < b.top && l.bottom < b.top + b.height / 2 : l.bottom > b.bottom && l.top > b.top + b.height / 2; });
        const tops = [...document.querySelectorAll('.scenery .sc')].map((t) => t.getBoundingClientRect()).filter((t) => moon && t.left < moon.right && t.right > moon.left).map((t) => t.top);
        return { stars: document.querySelectorAll('.night-sky .star').length, moon: !!moon, moonClear: moon && moon.top >= R('.hud').bottom - 2 && moon.bottom <= Math.min(...tops, 9999) + 4, glow: glow.width / cell, on: Math.abs(glow.left + glow.width / 2 - (flare.left + flare.width / 2)) < 2, lamps, pe: getComputedStyle(document.querySelector('.night-shade')).pointerEvents, z: getComputedStyle(document.querySelector('.night-shade')).zIndex };
      });
      check(s.stars >= 10 && s.moon && s.moonClear, `a moon and ${s.stars} stars; the moon sits in open sky under the HUD's row`);
      check(Math.abs(s.glow - 2.5) < 0.1 && s.on, `the flare's glow is ${s.glow.toFixed(2)} cells across, centred on the stack`);
      check(s.lamps.every(Boolean), 'headlights sit at the front of each cab, facing its gate');
      check(s.pe === 'none' && s.z === '0', 'the shade takes no touches and lies under the lease, the HUD and the buttons');
      const flick = await page.evaluate(() => new Promise((res) => { const g = document.querySelector('.flare-glow'), seen = new Set(); const t0 = performance.now(); const tick = () => { seen.add(getComputedStyle(g).opacity); performance.now() - t0 > 1100 ? res([...seen]) : requestAnimationFrame(tick); }; tick(); }));
      check(flick.length >= 4, `the glow flickers (${flick.length} levels of brightness in a second)`);
      const same = await page.evaluate(() => { const a = getComputedStyle(document.querySelector('.flare-glow')), b = getComputedStyle(document.querySelector('.fl-flame')); return a.animationDuration === b.animationDuration && a.animationDelay === b.animationDelay; });
      check(same, 'in step with the flame (same period and offset)');
      await context.close();
    }
    {
      const { context, page } = await open(browser, { level: [region('montney'), 1], reducedMotion: 'reduce' });
      const still = await page.evaluate(() => new Promise((res) => { const g = document.querySelector('.flare-glow'), seen = new Set(); const t0 = performance.now(); const tick = () => { seen.add(getComputedStyle(g).opacity); performance.now() - t0 > 1000 ? res(seen.size) : requestAnimationFrame(tick); }; tick(); }));
      check(still === 1, 'reduced motion: no flicker');
      await context.close();
    }

    // ---------- Hints keep their daytime look ----------
    {
      const { context, page } = await open(browser, { level: [region('montney'), 1] });
      await page.locator('[data-act="hint"]').click();
      await page.waitForSelector('.truck.hinted');
      const h = await page.evaluate(() => { const t = document.querySelector('.truck.hinted'); return { rim: getComputedStyle(t.querySelector('.art')).filter, shadow: getComputedStyle(t.querySelector('.ground-shadow')).opacity, other: getComputedStyle(document.querySelector('.truck:not(.hinted) .art')).filter }; });
      check(h.rim.includes('drop-shadow') && !h.rim.includes('brightness') && h.shadow === '1' && h.other.includes('brightness(0.9)'), 'the hinted truck keeps its bright rim and strong shadow, undimmed');
      await context.close();
    }

    // ---------- The nudge ----------
    console.log(`\n${engine}: the nudge`);
    {
      const { context, page } = await open(browser, { query: QUIET + '&idle=0.1', level: [region('montney'), 7] });
      await wait(700);
      check(!(await page.$('.bubble')), 'nothing before the idle time is up (25 s; 2.5 s in this test)');
      const b = await page.waitForSelector('.bubble[data-nudge]', { timeout: 4000 }).then(async (el) => ({ text: await el.textContent(), box: await el.boundingBox() })).catch(() => null);
      check(b?.text === "While we're young, Sonny, we don't have all day." && b.box.x >= 4 && b.box.x + b.box.width <= 386, `a truck says "${b?.text}", on screen`);
      const won = await page.evaluate(() => !document.querySelector('.overlay').hidden);
      check(!won && (await page.$$('.truck')).length > 0, 'never a fail state: the level carries on');
      const level = REGIONS[region('montney')].levels[7];
      const st = newGame(level);
      const mover = st.trucks.map((t) => ({ t, r: getMoveRange(st, t.id) })).find(({ r }) => r && (r.max > 0 || r.min < 0));
      await drag(page, mover.t.id, mover.r.max > 0 ? 1 : -1);
      await page.evaluate(() => document.querySelector('.bubble')?.remove());
      await wait(4200);
      check(!(await page.$('.bubble[data-nudge]')), 'once per level');
      await context.close();
    }
    {
      const { context, page } = await open(browser, { query: QUIET + '&idle=0.06', level: [region('montney'), 0] });
      await wait(3000);
      check(!(await page.$('.bubble')), 'no nudge on a day level');
      await context.close();
    }

    // ---------- Gags still play ----------
    console.log(`\n${engine}: gags at night`);
    {
      const { context, page } = await open(browser, { query: '?gag=marshmallow' });
      const night = await page.evaluate(() => document.querySelector('.screen.game').classList.contains('night'));
      await page.waitForFunction(() => document.querySelector('.strip-layer[data-gag="marshmallow"]')?.dataset.beat === 'roast', null, { timeout: 15000 });
      check(night, 'the marshmallow is roasted on a night level\'s flare');
      await context.close();
    }
  }

  // ---------- 60 fps with the CPU slowed 4x (Chromium): standing, and while dragging ----------
  if (engine === 'chromium') {
    console.log(`\n${engine}: frame rate on a night level with a 4x slower CPU`);
    const { context, page } = await open(browser, { level: [region('montney'), 7] });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const frames = (ms) => page.evaluate((limit) => new Promise((res) => { const g = []; let last = performance.now(); const t0 = last; const tick = (n) => { g.push(n - last); last = n; n - t0 > limit ? res(g.slice(3)) : requestAnimationFrame(tick); }; requestAnimationFrame(tick); }), ms);
    const p95 = (g) => g.sort((a, b) => a - b)[Math.floor(g.length * 0.95)];
    const idle = await frames(2500);
    check(p95(idle) < 20, `standing (glow flickering, pumpjack nodding): p95 frame ${p95(idle).toFixed(1)} ms`);
    const level = REGIONS[region('montney')].levels[7];
    const st = newGame(level);
    const mover = st.trucks.map((t) => ({ t, r: getMoveRange(st, t.id) })).find(({ r }) => r && (r.max > 0 || r.min < 0));
    const dir = mover.r.max > 0 ? 1 : -1;
    const measuring = frames(2600);
    for (let i = 0; i < 4; i++) await drag(page, mover.t.id, i % 2 ? -dir : dir, 120);
    const dragging = await measuring;
    check(p95(dragging) < 20, `dragging a truck back and forth: p95 frame ${p95(dragging).toFixed(1)} ms`);
    await context.close();
  }
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
