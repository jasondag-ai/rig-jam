// Night (Playwright, WebKit as the judge; Chromium for the frame rate).
//  - NO level starts at night, flare levels included; ?night=1 pins night on, ?night=0 keeps it away
//  - an idle level fades to night (30 s; 3 s here) over about 4 s, and the next move fades it back
//    over about 2 s; the nudge comes 15 s (1.5 s here) after night has fully fallen, once per level
//  - at night the ground, berm and scenery drop to about half brightness; trucks and gates far less;
//    the HUD and the buttons do not change at all (compared by pixels with the same level by day)
//  - the strip's gags lie under the same shade as the scenery (Biffy B's shuffler as dim as the biffy)
//  - a warm glow round each flare, about 2.5 cells across, flickering; headlights on every cab
//  - reduced motion: no fade, no flicker; 60 fps with the CPU slowed 4x, the fade included
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
const QUIET = '?cover=0&magpie=0&worker=0&moose=0&cooldown=0&off=lunch,sam,tongue';
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
    // ---------- No level starts at night ----------
    console.log(`\n${engine}: every level starts by day`);
    const state = (page) => page.evaluate(() => { const o = (q) => [...document.querySelectorAll(q)].map((e) => +getComputedStyle(e).opacity); return { night: document.querySelector('.screen.game').classList.contains('night'), board: document.querySelector('.board').classList.contains('night'), shade: o('.night-shade')[0], sky: o('.night-skyfill')[0], pad: o('.night-pad')[0], berm: o('canvas.berm-night')[0], glows: o('.flare-glow'), lamps: o('.truck .lamps'), flares: document.querySelectorAll('.obstacle.flare').length }; });
    for (const [r, li] of [['montney', 1], ['montney', 7], ['montney', 9], ['duvernay', 3], ['duvernay', 7], ['duvernay', 9], ['montney', 0], ['cardium', 4]]) {
      const { context, page } = await open(browser, { level: [region(r), li] });
      const s = await state(page);
      check(!s.night && !s.board && s.shade === 0 && s.sky === 0 && s.pad === 0 && s.berm === 0 && s.glows.every((g) => g === 0) && s.lamps.every((l) => l === 0), `${r} ${li + 1} (${REGIONS[region(r)].levels[li].name}${s.flares ? ', a flare level' : ''}): daylight, no shade, no glow, no headlights`);
      await context.close();
    }
    {
      const { context, page } = await open(browser, { query: QUIET + '&night=1', level: [region('cardium'), 4], reducedMotion: 'reduce' });
      const s = await state(page);
      check(s.night && s.shade === 1 && s.lamps.every((l) => l === 1), '?night=1 pins night on any level (previews and these tests)');
      await context.close();
    }

    // ---------- An idle level fades to night, and the next move brings the day back ----------
    console.log(`\n${engine}: Duvernay 8 (Hoarfrost): idle, night falls; a move, day returns`);
    {
      const level = REGIONS[region('duvernay')].levels[7];
      const { context, page } = await open(browser, { query: QUIET + '&idle=0.1', level: [region('duvernay'), 7] });
      const first = await state(page);
      check(!first.night && first.shade === 0, 'it starts in daylight');
      await page.waitForFunction(() => document.querySelector('.screen.game').classList.contains('night'), null, { timeout: 6000 });
      const fell = Date.now();
      const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.night-shade')).transitionDuration);
      await wait(1800);
      const mid = await state(page);
      await wait(2700);
      const full = await state(page);
      check(dur === '4s' && mid.shade > 0.1 && mid.shade < 0.9 && mid.pad > 0.1 && mid.pad < 0.9 && mid.berm > 0.1 && mid.berm < 0.9, `after 30 s with no move (3 s here) it fades to night over about 4 s (shade ${mid.shade.toFixed(2)} part way)`);
      check(full.shade === 1 && full.sky === 1 && full.pad === 1 && full.berm === 1 && full.glows.every((g) => g === 1) && full.lamps.every((l) => l === 1), 'then it is fully night: sky, shade, lease, berm, flare glow and headlights');
      const nudge = await page.waitForSelector('.bubble[data-nudge]', { timeout: 4000 }).then(async (el) => ({ at: Date.now() - fell, text: await el.textContent(), box: await el.boundingBox() })).catch(() => null);
      check(nudge?.text === "While we're young, Sonny, we don't have all day." && nudge.at > 5000 && nudge.box.x >= 4 && nudge.box.x + nudge.box.width <= 386, `the nudge comes 15 s after night has fallen (1.5 s here: ${nudge ? ((nudge.at - 4000) / 1000).toFixed(1) : '?'} s), on screen: "${nudge?.text}"`);
      check(!(await page.evaluate(() => !document.querySelector('.overlay').hidden)), 'never a fail state: the level carries on');
      // The next move: day comes back over about 2 s.
      const st = newGame(level);
      const mover = st.trucks.map((t) => ({ t, r: getMoveRange(st, t.id) })).find(({ r }) => r && (r.max > 0 || r.min < 0));
      await drag(page, mover.t.id, mover.r.max > 0 ? 1 : -1, 60);
      const back = await page.evaluate(() => ({ night: document.querySelector('.screen.game').classList.contains('night'), dur: getComputedStyle(document.querySelector('.night-shade')).transitionDuration }));
      await wait(900);
      const dawn = await state(page);
      await wait(1500);
      const day = await state(page);
      check(!back.night && back.dur === '2s' && dawn.shade > 0.05 && dawn.shade < 0.95, `the next move fades it back to day over about 2 s (shade ${dawn.shade.toFixed(2)} part way)`);
      check(day.shade === 0 && day.sky === 0 && day.pad === 0 && day.berm === 0 && day.lamps.every((l) => l === 0) && day.glows.every((g) => g === 0), 'then it is full daylight again');
      // Idle again: night again, but the nudge is once per level.
      await page.evaluate(() => document.querySelector('.bubble')?.remove());
      await page.waitForFunction(() => document.querySelector('.screen.game').classList.contains('night'), null, { timeout: 6000 });
      await wait(4000 + 1500 + 1500);
      check(!(await page.$('.bubble[data-nudge]')), 'night falls again when idle again, but the nudge is once per level');
      await context.close();
    }
    {
      const { context, page } = await open(browser, { query: QUIET + '&idle=0.1&night=0', level: [region('duvernay'), 7] });
      await wait(4500);
      check(!(await state(page)).night, '?night=0 keeps night away');
      await context.close();
    }

    // ---------- The strip's gags lie under the same shade as the scenery ----------
    console.log(`\n${engine}: gag layers dim at night exactly like the scenery`);
    {
      const m = {};
      for (const mode of ['night', 'day']) {
        const { context, page } = await open(browser, { query: `?gag=biffyb&night=${mode === 'night' ? 1 : 0}`, reducedMotion: 'reduce' });
        await page.waitForSelector('.shuffler-layer svg.pup', { state: 'attached', timeout: 8000 });
        await wait(1100);
        const order = await page.evaluate(() => {
          const kids = [...document.querySelector('.screen.game').children], shade = kids.findIndex((k) => k.classList.contains('night-shade'));
          const layers = kids.map((k, i) => ({ k, i })).filter(({ k }) => k.matches('.strip-layer:not(.over-lease), .worker-layer, .prop-layer, .biffy-layer'));
          return layers.length > 1 && layers.every(({ k, i }) => i < shade && getComputedStyle(k).zIndex === '0');
        });
        if (mode === 'night') check(order, 'every strip gag layer and prop is put on the screen under the night\'s shade');
        const box = (sel) => page.evaluate((q) => { const r = [...document.querySelectorAll(q)].at(-1).getBoundingClientRect(); return { x: r.x + r.width * 0.2, y: r.y + r.height * 0.2, width: r.width * 0.6, height: r.height * 0.6 }; }, sel);
        m[mode] = { shuffler: await patch(page, await box('.shuffler-layer svg.pup .head')), biffy: await patch(page, await box('.biffy-layer svg.pup .door')), grass: await patch(page, { x: 4, y: (await box('.biffy-layer svg.pup .door')).y, width: 20, height: 10 }) };
        await context.close();
      }
      const ratio = (k) => m.night[k] / m.day[k];
      check(ratio('shuffler') < 0.65 && ratio('biffy') < 0.65 && Math.abs(ratio('shuffler') - ratio('biffy')) < 0.12 && Math.abs(ratio('shuffler') - ratio('grass')) < 0.15, `Biffy B at night: the shuffler ${ratio('shuffler').toFixed(2)}, the biffy ${ratio('biffy').toFixed(2)} and the grass ${ratio('grass').toFixed(2)} of their daytime brightness: equally dim`);
    }

    // ---------- The look, by pixels against the same level by day ----------
    for (const [r, li] of [['montney', 1], ['duvernay', 3]]) {
      console.log(`\n${engine}: ${r} ${li + 1} by night against by day`);
      const shots = {};
      for (const mode of ['night', 'day']) {
        const { context, page } = await open(browser, { query: QUIET + (mode === 'day' ? '&night=0' : '&night=1'), level: [region(r), li], reducedMotion: 'reduce' });
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
      const { context, page } = await open(browser, { query: QUIET + '&night=1', level: [region('montney'), 1] });
      await wait(4400);
      const s = await page.evaluate(() => {
        const R = (q) => document.querySelector(q).getBoundingClientRect();
        const moon = [...document.querySelectorAll('.night-sky circle')].find((c) => c.getAttribute('fill') === '#f6efc8')?.getBoundingClientRect();
        const glow = R('.flare-glow'), flare = R('.obstacle.flare'), cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
        const lamps = [...document.querySelectorAll('.truck')].map((t) => { const l = t.querySelector('.lamps').getBoundingClientRect(), b = t.getBoundingClientRect(), cab = t.dataset.cab; return cab === 'right' ? l.right > b.right && l.left > b.left + b.width / 2 : cab === 'left' ? l.left < b.left && l.right < b.left + b.width / 2 : cab === 'top' ? l.top < b.top && l.bottom < b.top + b.height / 2 : l.bottom > b.bottom && l.top > b.top + b.height / 2; });
        const tops = [...document.querySelectorAll('.scenery .sc')].map((t) => t.getBoundingClientRect()).filter((t) => moon && t.left < moon.right && t.right > moon.left).map((t) => t.top);
        return { stars: document.querySelectorAll('.night-sky .star').length, moon: !!moon, moonClear: moon && moon.top >= R('.hud').bottom - 2 && moon.bottom <= Math.min(...tops, 9999) + 4, glow: glow.width / cell, on: Math.abs(glow.left + glow.width / 2 - (flare.left + flare.width / 2)) < 2, lamps, pe: getComputedStyle(document.querySelector('.night-shade')).pointerEvents, z: getComputedStyle(document.querySelector('.night-shade')).zIndex };
      });
      check(s.stars >= 10 && s.moon && s.moonClear, `a moon and ${s.stars} stars; the moon sits in open sky under the HUD's row`);
      check(Math.abs(s.glow - 2.5) < 0.05 && s.on, `the flare's glow is ${s.glow.toFixed(2)} cells across, centred on the stack`);
      check(s.lamps.every(Boolean), 'headlights sit at the front of each cab, facing its gate');
      check(s.pe === 'none' && s.z === '0', 'the shade takes no touches and lies under the lease, the HUD and the buttons');
      const flick = await page.evaluate(() => new Promise((res) => { const g = document.querySelector('.flare-glow'), seen = new Set(); const t0 = performance.now(); const tick = () => { seen.add(getComputedStyle(g, '::before').opacity); performance.now() - t0 > 1100 ? res([...seen]) : requestAnimationFrame(tick); }; tick(); }));
      check(flick.length >= 4, `the glow flickers (${flick.length} levels of brightness in a second)`);
      const same = await page.evaluate(() => { const a = getComputedStyle(document.querySelector('.flare-glow'), '::before'), b = getComputedStyle(document.querySelector('.fl-flame')); return a.animationDuration === b.animationDuration && a.animationDelay === b.animationDelay; });
      check(same, 'in step with the flame (same period and offset)');
      await context.close();
    }
    {
      const { context, page } = await open(browser, { query: QUIET + '&night=1', level: [region('montney'), 1], reducedMotion: 'reduce' });
      const instant = await state(page);
      check(instant.shade === 1 && instant.pad === 1, 'reduced motion: night comes without the fade');
      const still = await page.evaluate(() => new Promise((res) => { const g = document.querySelector('.flare-glow'), seen = new Set(); const t0 = performance.now(); const tick = () => { seen.add(getComputedStyle(g, '::before').opacity); performance.now() - t0 > 1000 ? res(seen.size) : requestAnimationFrame(tick); }; tick(); }));
      check(still === 1, 'reduced motion: no flicker');
      await context.close();
    }

    // ---------- Hints keep their daytime look ----------
    {
      const { context, page } = await open(browser, { query: QUIET + '&night=1', level: [region('montney'), 1], reducedMotion: 'reduce' });
      await page.locator('[data-act="hint"]').click();
      await page.waitForSelector('.truck.hinted');
      const h = await page.evaluate(() => { const t = document.querySelector('.truck.hinted'); return { rim: getComputedStyle(t.querySelector('.art')).filter, shadow: getComputedStyle(t.querySelector('.ground-shadow')).opacity, other: getComputedStyle(document.querySelector('.truck:not(.hinted) .art')).filter }; });
      check(h.rim.includes('drop-shadow') && !h.rim.includes('brightness') && h.shadow === '1' && h.other.includes('brightness(0.9)'), 'the hinted truck keeps its bright rim and strong shadow, undimmed');
      await context.close();
    }

    // ---------- Gags still play ----------
    console.log(`\n${engine}: gags at night`);
    {
      const { context, page } = await open(browser, { query: '?gag=marshmallow&night=1' });
      const night = await page.evaluate(() => document.querySelector('.screen.game').classList.contains('night'));
      await page.waitForFunction(() => [...document.querySelectorAll('.strip-layer[data-gag="marshmallow"]')].at(-1)?.dataset.beat === 'roast', null, { timeout: 15000 });
      check(night, 'gags still play at night: the marshmallow is roasted on the flare');
      await context.close();
    }
  }

  // ---------- 60 fps with the CPU slowed 4x (Chromium): standing, and while dragging ----------
  if (engine === 'chromium') {
    console.log(`\n${engine}: frame rate on a night level with a 4x slower CPU`);
    const { context, page } = await open(browser, { query: QUIET + '&idle=0.1', level: [region('montney'), 7] });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const frames = (ms) => page.evaluate((limit) => new Promise((res) => { const g = []; let last = performance.now(); const t0 = last; const tick = (n) => { g.push(n - last); last = n; n - t0 > limit ? res(g.slice(3)) : requestAnimationFrame(tick); }; requestAnimationFrame(tick); }), ms);
    const p95 = (g) => g.sort((a, b) => a - b)[Math.floor(g.length * 0.95)];
    await page.waitForFunction(() => document.querySelector('.screen.game').classList.contains('night'), null, { timeout: 8000 });
    const fade = await frames(4200);
    check(p95(fade) < 20, `while night falls (the 4 s fade): p95 frame ${p95(fade).toFixed(1)} ms`);
    const idle = await frames(2500);
    check(p95(idle) < 20, `standing at night (glow flickering, pumpjack nodding): p95 frame ${p95(idle).toFixed(1)} ms`);
    const level = REGIONS[region('montney')].levels[7];
    const st = newGame(level);
    const mover = st.trucks.map((t) => ({ t, r: getMoveRange(st, t.id) })).find(({ r }) => r && (r.max > 0 || r.min < 0));
    const dir = mover.r.max > 0 ? 1 : -1;
    const measuring = frames(2600);
    for (let i = 0; i < 4; i++) await drag(page, mover.t.id, i % 2 ? -dir : dir, 120);
    const dragging = await measuring;
    check(p95(dragging) < 20, `dragging a truck back and forth while the day comes back: p95 frame ${p95(dragging).toFixed(1)} ms`);
    await context.close();
  }
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
