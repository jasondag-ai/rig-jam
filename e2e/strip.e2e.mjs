// Gags 4 to 7 (Playwright, WebKit as the judge; Chromium for the frame rate): Near Miss, the
// landowner, Biffy A and Biffy B, plus the permanent biffy.
//  - the biffy stands in the bottom strip of every level, clear of the lease, the tip line and the
//    buttons, at 390 and 375 px; it takes no touches
//  - each gag plays its reference beats in order when its trigger fires (gag-triggers.ts), once per
//    level; characters start and end fully off screen; the right line is said, on screen
//  - one gag at a time; reduced motion: simple fades; the Wildlife Log lists all seven
// Saves clips (gag47_*.webm) to OUT. Run with the dev server up: npm run test:e2e:strip
import { DEMO, UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const BEATS = {
  nearMiss: ['sniff', 'stretch', 'look', 'double-take', 'eyes-huge', 'duck', 'hotshot', 'dust-settles', 'dusty', 'near-miss', 'cough', 'gone'],
  landowner: ['ride-in', 'skid', 'head-shake', 'turn', 'fist', 'rev', 'wheelie', 'hat-off', 'hat-catch', 'gone'],
  biffyA: ['sits', 'jolt', 'door-open', 'oblivious', 'look-back', 'eye-pop', 'nod', 'reach', 'pull-shut', 'occupied', 'done'],
  biffyB: ['sits', 'jolt', 'door-open', 'roll-out', 'roll-away', 'grope', 'shuffle', 'off-screen', 'door-shut'],
};
const QUIET = '?cover=0&magpie=0&worker=0&moose=0';
const cardium = REGIONS.findIndex((r) => r.id === 'cardium');

// A Cardium level whose best solution has two exits in a row before its last move.
function backToBack() {
  for (const [li, level] of REGIONS[cardium].levels.entries()) {
    let s = newGame(level);
    const sol = solve(level);
    const exits = sol.map((m) => { const r = tryMove(s, m.id, m.delta); s = r.state; return !!r.exited; });
    const i = exits.findIndex((e, k) => e && exits[k + 1] && k + 2 < sol.length);
    if (i >= 0) return { li, level, sol, upTo: i + 2 };
  }
  return null;
}
// A level and truck that can bump down into the bottom berm from the start, and one that can go back and forth.
const bottomBumper = (level) => newGame(level).trucks.find((t) => t.orient === 'v' && t.row + t.length === 6 && getMoveRange(newGame(level), t.id)?.exitDelta !== 1);
const bumpLevel = REGIONS[cardium].levels.findIndex((l) => bottomBumper(l));
const shuttler = (level) => { const s = newGame(level); return s.trucks.map((t) => ({ t, r: getMoveRange(s, t.id) })).find(({ r }) => r && ((r.max > 0 && r.exitDelta !== r.max) || (r.min < 0 && r.exitDelta !== r.min))); };

async function open(browser, { width = 390, height = 844, query = QUIET, reducedMotion = 'no-preference', video = null, level = [cardium, 5], progress = UNLOCKED, enter = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, reducedMotion, ...(video ? { recordVideo: { dir: video, size: { width, height } } } : {}) });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  if (!query.includes('gag=')) {
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, progress);
    await page.reload({ waitUntil: 'networkidle' });
    if (enter) {
      await page.locator('.region-tab').nth(level[0]).click();
      await page.locator('.level-btn').nth(level[1]).click();
    }
  }
  if (enter || query.includes('gag=')) await page.waitForSelector('.board .truck.sprite-on');
  return { context, page };
}

/** Drags a truck by `cells` along its lane with touch pointer events (more than it can go = a bump). */
const drag = (page, id, cells, settle = 420) =>
  page.evaluate(async ([truckId, n, ms]) => {
    const el = document.querySelector(`.truck[data-id="${truckId}"]:not(.exiting)`);
    const r = el.getBoundingClientRect();
    const h = el.classList.contains('horiz');
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    let x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 21, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown');
    for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); }
    ev('pointerup');
    await new Promise((q) => setTimeout(q, ms));
  }, [id, cells, settle]);

/** Follows a strip gag every frame until its layers have gone: beats, and the screen boxes of `parts`. */
const watch = (page, gag, parts = {}, ms = 22000) =>
  page.evaluate(
    ([name, sel, limit]) =>
      new Promise((res) => {
        const log = [];
        const t0 = performance.now();
        const tick = () => {
          const layers = [...document.querySelectorAll(`.strip-layer[data-gag="${name}"]`)];
          const now = performance.now() - t0;
          if (layers.length) {
            const f = { t: now, beat: layers.at(-1).dataset.beat, n: document.querySelectorAll('.strip-layer, .magpie-layer, .worker-layer, .moose-layer').length - layers.length };
            for (const [k, q] of Object.entries(sel)) { const el = document.querySelector(q); if (el) { const b = el.getBoundingClientRect(); f[k] = { l: b.left, r: b.right, t: b.top, b: b.bottom, vis: getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0' }; } }
            log.push(f);
          }
          if ((!layers.length && log.length) || now > limit) return res(log);
          requestAnimationFrame(tick);
        };
        tick();
      }),
    [gag, parts, ms],
  );
const beatsOf = (log) => [...new Set(log.map((f) => f.beat).filter(Boolean))];
const sameBeats = (log, name) => JSON.stringify(beatsOf(log)) === JSON.stringify(BEATS[name]);

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();

  if (engine === 'webkit') {
    // ---------- The permanent biffy ----------
    for (const [width, height] of [[390, 844], [375, 667]]) {
      console.log(`\n${engine} ${width}x${height}: the biffy is permanent scenery`);
      for (const [ri, li] of [[0, 0], [1, 4], [2, 8]]) {
        const { context, page } = await open(browser, { width, height, level: [ri, li] });
        await wait(400);
        const b = await page.evaluate(() => {
          const s = document.querySelector('.biffy-layer svg.pup');
          if (!s) return null;
          const r = s.querySelector('.root').getBoundingClientRect();
          const R = (q) => document.querySelector(q).getBoundingClientRect();
          const trees = [...document.querySelectorAll('.scenery .sc, .scenery .mound')].filter((t) => { const q = t.getBoundingClientRect(); const m = q.width * 0.2; return q.left + m < r.right && q.right - m > r.left && q.top < r.bottom && q.bottom > r.top; }).length;
          return { n: document.querySelectorAll('.biffy-layer').length, h: r.height, clearBoard: r.top >= R('.board').bottom, clearNote: r.bottom <= R('.note').top + 1, clearButtons: r.bottom <= R('.controls').top, onScreen: r.left >= 0 && r.right <= innerWidth, trees, touch: getComputedStyle(document.querySelector('.biffy-layer')).pointerEvents, old: document.querySelectorAll('.gag.biffy').length };
        });
        check(!!b && b.n === 1 && b.onScreen && b.old === 0, `${REGIONS[ri].name} ${li + 1}: one biffy, always on screen (no old one that comes and goes)`);
        check(b.clearBoard && b.clearNote && b.clearButtons && b.trees === 0 && b.touch === 'none', `clear of the lease, the tip line, the buttons and the trees; takes no touches (${Math.round(b.h)}px tall)`);
        if (width === 390) check(b.h > 68 && b.h < 88, `about 80 px tall at 390 (${Math.round(b.h)}px)`);
        await context.close();
      }
    }

    // ---------- Biffy A: one bump into the bottom berm ----------
    console.log(`\n${engine}: Biffy A, one bump into the bottom berm (Cardium ${bumpLevel + 1})`);
    {
      const id = bottomBumper(REGIONS[cardium].levels[bumpLevel]).id;
      const { context, page } = await open(browser, { level: [cardium, bumpLevel] });
      const watching = watch(page, 'biffyA');
      await drag(page, id, 2);
      check(!(await page.$('.strip-layer')), 'it waits a moment in case a second bump is coming');
      const log = await watching;
      check(sameBeats(log, 'biffyA'), `the reference beats, in order (${beatsOf(log).length} of ${BEATS.biffyA.length})`);
      const after = await page.evaluate(() => ({ ind: document.querySelector('.biffy-layer .ind').getAttribute('fill'), door: document.querySelector('.biffy-layer .door').getAttribute('transform') }));
      check(after.ind === '#d9453a' && /scale\(1 1\)/.test(after.door), 'the door is shut again and the indicator has flipped to red');
      check(log.every((f) => f.n === 0), 'nothing else was on stage');
      await drag(page, id, 2);
      await wait(2200);
      // Biffy A is done for this level, so a second single bump plays B.
      const second = await page.evaluate(() => document.querySelector('.strip-layer')?.dataset.gag ?? null);
      check(second === 'biffyB', `once per level: the next single bump brings the other biffy gag (${second})`);
      await context.close();
    }

    // ---------- Biffy B: a double bump ----------
    console.log(`\n${engine}: Biffy B, a double bump`);
    {
      const id = bottomBumper(REGIONS[cardium].levels[bumpLevel]).id;
      const { context, page } = await open(browser, { level: [cardium, bumpLevel] });
      const watching = watch(page, 'biffyB', { man: '.shuffler-layer svg.pup .head', roll: '.shuffler-layer .pup-roll' });
      await drag(page, id, 2, 250);
      await drag(page, id, 2, 250);
      const log = await watching;
      check(sameBeats(log, 'biffyB'), `the reference beats, in order (${beatsOf(log).length} of ${BEATS.biffyB.length})`);
      const rollEnd = log.filter((f) => f.roll?.vis).at(-1);
      const manEnd = log.filter((f) => f.beat === 'shuffle' && f.man).at(-1);
      check(rollEnd.roll.l >= 390 - 2, `the roll rolls away until it is fully off screen (x ${Math.round(rollEnd.roll.l)})`);
      check(manEnd.man.l >= 390 - 2, `he shuffles after it until he is fully off screen (x ${Math.round(manEnd.man.l)})`);
      const after = await page.evaluate(() => document.querySelector('.biffy-layer .ind').getAttribute('fill'));
      check(after === '#56b05a', 'the door creaks shut and the indicator flips to green');
      await context.close();
    }

    // ---------- Landowner: the same truck back and forth 4 times ----------
    console.log(`\n${engine}: landowner, the same truck back and forth four times`);
    {
      const li = REGIONS[1].levels.findIndex((l) => shuttler(l));
      const { t, r } = shuttler(REGIONS[1].levels[li]);
      const step = r.max > 0 && r.exitDelta !== r.max ? 1 : -1;
      const { context, page } = await open(browser, { level: [1, li] });
      const watching = watch(page, 'landowner', { quad: '.landowner-layer svg.pup' });
      for (const d of [step, -step, step]) await drag(page, t.id, d, 380);
      await wait(700);
      check(!(await page.$('.strip-layer')), 'three times is not enough');
      await drag(page, t.id, -step, 380);
      const bubble = page.waitForSelector('.bubble[data-gag="landowner"]', { timeout: 9000 }).then(async (b) => ({ text: await b.textContent(), box: await b.boundingBox() })).catch(() => null);
      const log = await watching;
      check(sameBeats(log, 'landowner'), `the reference beats, in order (${beatsOf(log).length} of ${BEATS.landowner.length})`);
      check(log[0].quad.r <= 0 && log.filter((f) => f.beat === 'hat-catch').at(-1).quad.l >= 390, `he rides in from fully off screen and out until fully off screen (${Math.round(log[0].quad.r)} to ${Math.round(log.filter((f) => f.beat === 'hat-catch').at(-1).quad.l)})`);
      const b = await bubble;
      check(b?.text === "Who's paying for these ruts?" && b.box.x >= 6 && b.box.x + b.box.width <= 384, `"${b?.text}", on screen`);
      await context.close();
    }

    // ---------- Near Miss: two exits back to back in Cardium ----------
    const nm = backToBack();
    console.log(`\n${engine}: Near Miss, two exits back to back (Cardium ${nm.li + 1})`);
    {
      const { context, page } = await open(browser, { level: [cardium, nm.li] });
      const watching = watch(page, 'nearMiss', { truck: '.hotshot-layer svg.pup', gopher: '.gopher-layer svg.pup .root' });
      for (const m of nm.sol.slice(0, nm.upTo)) await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4, 700);
      const clip = page.waitForFunction(() => [...document.querySelectorAll('.strip-layer[data-gag="nearMiss"]')].at(-1)?.dataset.beat === 'stretch', null, { timeout: 12000 }).then(() =>
        page.evaluate(() => {
          const layer = document.querySelector('.gopher-layer');
          const mound = document.querySelector('.scenery [data-anchor="mound"]').getBoundingClientRect();
          const g = layer.querySelector('.root').getBoundingClientRect();
          const hole = mound.top + (17.5 / 34) * mound.height;
          return { cut: Math.abs(layer.getBoundingClientRect().bottom - hole) < 1.5 && getComputedStyle(layer).overflow === 'hidden', inHole: Math.abs(g.left + g.width / 2 - (mound.left + (33 / 64) * mound.width)) < 3, below: g.bottom > hole };
        }),
      );
      const bubble = page.waitForSelector('.bubble[data-gag="nearMiss"]', { timeout: 14000 }).then(async (b) => ({ text: await b.textContent(), box: await b.boundingBox() })).catch(() => null);
      const log = await watching;
      check(sameBeats(log, 'nearMiss'), `the reference beats, in order (${beatsOf(log).length} of ${BEATS.nearMiss.length})`);
      const c = await clip;
      check(c.cut && c.inHole && c.below, 'the gopher comes up out of the mound\'s hole, cut off at the hole line');
      const pass = log.filter((f) => f.beat === 'hotshot');
      check(pass[0].truck.l >= 390 && pass.at(-1).truck.r <= 2 && pass.every((f, i) => i === 0 || f.truck.l <= pass[i - 1].truck.l + 0.5), `the hotshot crosses right to left, fully off screen to fully off screen (${Math.round(pass[0].truck.l)} to ${Math.round(pass.at(-1).truck.r)})`);
      const b = await bubble;
      check(b?.text === 'Near miss!' && b.box.x >= 6 && b.box.x + b.box.width <= 384, `"${b?.text}", on screen`);
      await context.close();
    }
    {
      const { context, page } = await open(browser, { level: [1, 0] });
      check((await page.$$('.scenery [data-anchor="mound"]')).length === 0, 'Cardium only: no mound, no gopher, elsewhere');
      await context.close();
    }

    // ---------- Reduced motion: simple fades ----------
    console.log(`\n${engine}: reduced motion`);
    for (const gag of ['nearmiss', 'landowner', 'biffya', 'biffyb']) {
      const { context, page } = await open(browser, { query: `?gag=${gag}`, reducedMotion: 'reduce' });
      await page.waitForSelector('.strip-layer', { state: 'attached', timeout: 8000 });
      await wait(800);
      const a = await page.evaluate(() => ({ beat: [...document.querySelectorAll('.strip-layer')].at(-1)?.dataset.beat, o: getComputedStyle([...document.querySelectorAll('.strip-layer')].at(-1)).opacity, html: document.querySelector('.strip-layer svg.pup, .biffy-layer svg.pup').innerHTML.length }));
      await wait(500);
      const b = await page.evaluate(() => document.querySelector('.strip-layer svg.pup, .biffy-layer svg.pup')?.innerHTML.length);
      check(a.beat === 'still' && a.o === '1' && a.html === b, `${gag}: fades in as a still and holds`);
      await page.waitForSelector('.strip-layer', { state: 'detached', timeout: 5000 }).catch(() => {});
      await context.close();
    }

    // ---------- Wildlife Log ----------
    console.log(`\n${engine}: Wildlife Log`);
    for (const [mode, progress] of [['game', UNLOCKED], ['demo', DEMO]]) {
      const { context, page } = await open(browser, { query: '?cover=0', progress, enter: false });
      await page.locator('.binoculars').click();
      await page.waitForSelector('.log-card');
      const cards = await page.$$eval('.log-card', (cs) => cs.map((c) => ({ id: c.dataset.id, text: c.querySelector('p').textContent, art: !!c.querySelector('.art svg') })));
      if (mode === 'game') check(cards.map((c) => c.id).slice(0, 7).join() === 'magpie,spotter,moose,nearmiss,landowner,biffy,biffyB' && cards.every((c) => c.art && c.text === 'Not seen yet.'), `lists these four after the first three, with puppet card art; the game hides the hints (${cards.length})`);
      else check(cards.slice(3, 7).map((c) => c.text).join('|') === 'Send two trucks out back to back in Cardium.|Drive the same truck back and forth four times.|Bump a truck into the bottom berm.|Bump the bottom berm twice, quickly.', 'demo mode shows each gag\'s hint');
      await context.close();
    }
  }

  // ---------- 60 fps with the CPU slowed 4x (Chromium) ----------
  if (engine === 'chromium') {
    for (const [gag, name] of [['nearmiss', 'nearMiss'], ['landowner', 'landowner'], ['biffya', 'biffyA'], ['biffyb', 'biffyB']]) {
      console.log(`\n${engine}: ${name} frame rate with a 4x slower CPU (?gag=${gag})`);
      const { context, page } = await open(browser, { query: `?gag=${gag}` });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const log = await watch(page, name, {}, 16000);
      const gaps = log.slice(1).map((f, i) => f.t - log[i].t).slice(5).sort((x, y) => x - y);
      const p95 = gaps[Math.floor(gaps.length * 0.95)];
      check(log.length > 100 && p95 < 20, `p95 frame ${p95?.toFixed(1)} ms, median ${gaps[gaps.length >> 1]?.toFixed(1)} ms over the whole gag`);
      await context.close();
    }
  }

  // ---------- Clips (WebKit, 390x844, full screen) ----------
  if (engine === 'webkit' && !process.env.NO_CLIPS) {
    const dir = join(OUT, 'gag47_clip_tmp');
    for (const [gag, name] of [['nearmiss', 'near_miss'], ['landowner', 'landowner'], ['biffya', 'biffy_a'], ['biffyb', 'biffy_b']]) {
      const { context, page } = await open(browser, { query: `?gag=${gag}`, video: dir });
      await page.waitForSelector('.strip-layer', { state: 'attached', timeout: 8000 });
      await page.waitForSelector('.strip-layer', { state: 'detached', timeout: 18000 });
      await wait(600);
      const video = page.video();
      await context.close();
      renameSync(await video.path(), join(OUT, `gag47_${name}.webm`));
      console.log(`   saved gag47_${name}.webm`);
    }
    rmSync(dir, { recursive: true, force: true });
  }
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
