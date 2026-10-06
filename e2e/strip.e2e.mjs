// Gags 4 to 7 (Playwright, WebKit as the judge; Chromium for the frame rate): Near Miss, the
// landowner, Biffy A and Biffy B, plus the permanent biffy.
//  - the biffy stands in the bottom strip of every level, clear of the lease, the tip line and the
//    buttons, at 390 and 375 px; it takes no touches
//  - each gag plays its reference beats in order when its trigger fires (gag-triggers.ts), once per
//    level; characters start and end fully off screen; the right line is said, on screen
//  - one gag at a time; reduced motion: simple fades; the Wildlife Log lists all seven
// Saves clips (gag47_*.webm) to OUT. Run with the dev server up: npm run test:e2e:strip
import { LOG_ENTRIES as RIDDLE_ENTRIES } from '../src/ui/wildlife-log.ts';
import { LANDOWNER_LINES } from '../src/ui/lines.ts';
import { DEMO, UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';
const riddleOf = (id) => RIDDLE_ENTRIES.find((e) => e.id === id)?.riddle;

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
  biffyA: ['sits', 'jolt', 'door-open', 'oblivious', 'look-back', 'eye-pop', 'nod', 'reach', 'pull-shut', 'occupied', 'done', 'unlocked'],
  biffyB: ['sits', 'jolt', 'door-open', 'roll-out', 'roll-away', 'grope', 'shuffle', 'off-screen', 'door-shut'],
};
const QUIET = '?cover=0&magpie=0&worker=0&moose=0&cooldown=0&off=lunch,sam,tongue';
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
/** How far the biffy's door travels side to side while it is being shaken (px). */
const sway = (log) => { const xs = log.filter((f) => f.beat === 'jolt' && f.box).map((f) => f.box.l); return xs.length ? Math.max(...xs) - Math.min(...xs) : 0; };
let shakeA = 0;
const beatsOf = (log) => [...new Set(log.map((f) => f.beat).filter(Boolean))];
const sameBeats = (log, name) => JSON.stringify(beatsOf(log)) === JSON.stringify(BEATS[name]);

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();

  if (engine === 'webkit') {
    // ---------- The permanent biffy ----------
    for (const [width, height] of [[390, 844], [375, 667], [430, 932]]) {
      console.log(`\n${engine} ${width}x${height}: the biffy is permanent scenery`);
      for (const [ri, li] of [[0, 0], [1, 4], [2, 8]]) {
        const { context, page } = await open(browser, { width, height, level: [ri, li] });
        await wait(400);
        const b = await page.evaluate(() => {
          const s = document.querySelector('.biffy-layer svg.pup');
          if (!s) return null;
          const r = s.querySelector('.root').getBoundingClientRect();
          const R = (q) => document.querySelector(q).getBoundingClientRect();
          const trees = [...document.querySelectorAll('.scenery .sc, .scenery .mound, .depth-strip > .sc, .depth-strip > .mound')].filter((t) => { const q = t.getBoundingClientRect(); const m = q.width * 0.2; return q.left + m < r.right && q.right - m > r.left && q.top < r.bottom && q.bottom > r.top; }).length;
          return { n: document.querySelectorAll('.biffy-layer').length, h: r.height, gap: r.top - R('.board').bottom, left: r.left, clearGates: [...document.querySelectorAll('.gate')].every((g) => { const q = g.getBoundingClientRect(); return q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom; }), clearHud: r.top > R('.hud').bottom, clearBoard: r.top >= R('.board').bottom, clearNote: r.bottom <= R('.note').top + 1, clearButtons: r.bottom <= R('.controls').top, onScreen: r.left >= 0 && r.right <= innerWidth, trees, touch: getComputedStyle(document.querySelector('.biffy-layer')).pointerEvents, old: document.querySelectorAll('.gag.biffy').length };
        });
        check(!!b && b.n === 1 && b.onScreen && b.old === 0, `${REGIONS[ri].name} ${li + 1}: one biffy, always on screen (no old one that comes and goes)`);
        check(b.clearBoard && b.clearNote && b.clearButtons && b.trees === 0 && b.touch === 'none', `clear of the lease, the tip line, the buttons and the trees; takes no touches (${Math.round(b.h)}px tall)`);
        if (width === 390) check(b.h > 52 && b.h < 68, `about 60 px tall at 390, a fifth smaller than the reference (${Math.round(b.h)}px tall)`);
        check(b.gap >= 0 && b.gap <= 8 && b.left >= 2 && b.left <= width * 0.06, `in the corner of the strip, right up at the berm (${Math.round(b.left)}px from the screen's edge, ${b.gap.toFixed(1)}px under the lease)`);
        check(b.clearGates && b.clearHud, 'it touches no gate post and nothing of the HUD');
        await context.close();
      }
    }

    // ---------- Exactly one biffy on every level ----------
    console.log(`\n${engine}: exactly one biffy on every level`);
    {
      const { context, page } = await open(browser, { enter: false });
      const wrong = [];
      let seen = 0;
      const count = () => page.evaluate(() => ({ layers: document.querySelectorAll('.biffy-layer').length, biffies: document.querySelectorAll('.biffy-layer svg.pup').length, others: document.querySelectorAll('.gag.biffy, .strip-layer .door').length, shown: (() => { const s = document.querySelector('.biffy-layer svg.pup .root'); if (!s) return false; const r = s.getBoundingClientRect(); return r.width > 10 && r.left >= 0 && r.right <= innerWidth && getComputedStyle(s).visibility !== 'hidden'; })() }));
      for (const [ri, region] of REGIONS.entries()) {
        for (let li = 0; li < region.levels.length; li++) {
          await page.locator('.region-tab').nth(ri).click();
          await page.locator('.level-btn').nth(li).click();
          await page.waitForSelector('.board .truck');
          const c = await count();
          seen++;
          if (c.layers !== 1 || c.biffies !== 1 || c.others !== 0 || !c.shown) wrong.push(`${region.name} ${li + 1}: ${JSON.stringify(c)}`);
          await page.locator('.hud [data-act="levels"]').click();
          await page.waitForSelector('.level-btn');
        }
      }
      // The Daily Pad too.
      await page.locator('.daily-btn').click();
      await page.waitForSelector('.board .truck');
      const d = await count();
      seen++;
      if (d.layers !== 1 || d.biffies !== 1 || d.others !== 0 || !d.shown) wrong.push(`Daily Pad: ${JSON.stringify(d)}`);
      check(seen === REGIONS.reduce((n, r) => n + r.levels.length, 0) + 1 && wrong.length === 0, `all ${seen} (every level of every region, and the Daily Pad): one biffy each, on screen, and no other${wrong.length ? ': ' + wrong.join(' | ') : ''}`);
      await context.close();
    }

    // ---------- Biffy B's roll rolls flat (Jay, Oct 5) ----------
    // The roll's drawing must sit dead centre in its turning box (an inline SVG sat about 6 px
    // low, so the roll orbited up and down once a turn), and its middle must stay on one line.
    for (const [width, height] of [[390, 844], [375, 667], [430, 932]]) {
      console.log(`\n${engine} ${width}x${height}: Biffy B's roll rolls flat (?gag=biffyb)`);
      const { context, page } = await open(browser, { width, height, query: '?gag=biffyb' });
      const frames = await page.evaluate(
        () =>
          new Promise((res) => {
            const out = [];
            const tick = () => {
              const layer = [...document.querySelectorAll('.strip-layer[data-gag="biffyB"]')].at(-1);
              const roll = layer?.querySelector('.pup-roll');
              if (roll) {
                const t = Number(layer.dataset.t ?? NaN);
                // The box's own centre: where it is laid out plus where its transform carries it (its turning does not move its centre).
                const m = new DOMMatrix(getComputedStyle(roll).transform);
                const w = roll.offsetWidth, h = roll.offsetHeight;
                const o = roll.offsetParent.getBoundingClientRect();
                // (It turns about its own middle, so its middle only moves by the transform's shift.)
                const origin = getComputedStyle(roll).transformOrigin.split(' ').map(parseFloat);
                const div = { x: o.left + roll.offsetLeft + w / 2 + m.e, y: o.top + roll.offsetTop + h / 2 + m.f, centred: Math.abs(origin[0] - w / 2) < 0.01 && Math.abs(origin[1] - h / 2) < 0.01 };
                const s = roll.querySelector('svg circle').getBoundingClientRect();
                out.push({ beat: layer.dataset.beat, t: performance.now(), div, svg: { x: s.left + s.width / 2, y: s.top + s.height / 2 }, display: getComputedStyle(roll.querySelector('svg')).display, lh: getComputedStyle(roll).lineHeight, o: getComputedStyle(roll).opacity });
              }
              if (out.length && (!layer || out.at(-1).beat === 'grope' || out.length > 400)) return res(out);
              requestAnimationFrame(tick);
            };
            tick();
          }),
      );
      const rolling = frames.filter((f) => f.beat === 'roll-out' || f.beat === 'roll-away');
      const off = Math.max(...frames.map((f) => Math.hypot(f.svg.x - f.div.x, f.svg.y - f.div.y)));
      const ys = rolling.map((f) => f.svg.y);
      check(frames[0].display === 'block' && frames[0].div.centred && frames.length > 40, `the roll's drawing is a block in its box (display ${frames[0].display}; ${frames.length} frames watched)`);
      check(off <= 0.5, `its centre is the centre of the box that turns: never more than ${off.toFixed(2)} px apart (0.5 allowed)`);
      check(rolling.length > 30 && Math.max(...ys) - Math.min(...ys) <= 0.5, `rolling (0.8 to 2.6 s), its centre stays on one line: ${(Math.max(...ys) - Math.min(...ys)).toFixed(2)} px up and down over ${rolling.length} frames (0.5 allowed)`);
      // One constant speed, no easing: equal steps in equal times, from the first frame it moves.
      const xs = rolling.map((f) => f.svg.x), ts = rolling.map((f) => f.t);
      const v = (xs.at(-1) - xs[0]) / (ts.at(-1) - ts[0]);
      const bend = Math.max(...rolling.map((f, i) => Math.abs(f.svg.x - (xs[0] + v * (ts[i] - ts[0])))));
      check(v < 0 && bend < 2.5, `at one constant speed, no easing (${(-v * 1000).toFixed(0)} px a second, never more than ${bend.toFixed(1)} px off a straight line)`);
      check(frames.every((f) => f.o === '1' || f.beat === 'grope'), 'no fade: it waits behind the shut door and is simply there when the door opens');
      await context.close();
    }

    // ---------- Biffy A: one bump into the bottom berm ----------
    console.log(`\n${engine}: Biffy A, one bump into the bottom berm (Cardium ${bumpLevel + 1})`);
    {
      const id = bottomBumper(REGIONS[cardium].levels[bumpLevel]).id;
      const { context, page } = await open(browser, { level: [cardium, bumpLevel] });
      const watching = watch(page, 'biffyA', { box: '.biffy-layer svg.pup .door' });
      await drag(page, id, 2);
      check(!(await page.$('.strip-layer')), 'it waits a moment in case a second bump is coming');
      const flush = page.waitForFunction(() => [...document.querySelectorAll('.strip-layer[data-gag="biffyA"]')].at(-1)?.dataset.beat === 'nod', null, { timeout: 12000 }).then(() => page.evaluate(() => ({ skin: [...document.querySelectorAll('.biffy-layer .headTurn .skin')].map((e) => e.getAttribute('fill')), blush: document.querySelectorAll('.biffy-layer .headTurn [fill="#f08c80"]').length }))).catch(() => null);
      const occupied = page.waitForFunction(() => [...document.querySelectorAll('.strip-layer[data-gag="biffyA"]')].at(-1)?.dataset.beat === 'occupied', null, { timeout: 12000 }).then(() => page.evaluate(() => document.querySelector('.biffy-layer .ind').getAttribute('fill'))).catch(() => null);
      const log = await watching;
      check((await occupied) === '#d9453a', 'the indicator flips to red when he pulls the door shut');
      const fl = await flush;
      check(!!fl && fl.skin.length === 3 && fl.skin.every((c) => c === '#e07a6c') && fl.blush === 0, `embarrassed, his WHOLE face is flushed dark pink, with no cheek blush (${fl?.skin.join(' ')})`);
      shakeA = sway(log);
      check(shakeA > 1.5 && shakeA < 6 && log.filter((f) => f.beat === 'sits').every((f) => Math.abs(f.box.l - log[0].box.l) < 0.3), `the bump gives the biffy a small shake before the door opens (${shakeA.toFixed(1)} px side to side)`);
      check(sameBeats(log, 'biffyA'), `the reference beats, in order (${beatsOf(log).length} of ${BEATS.biffyA.length})`);
      const after = await page.evaluate(() => ({ ind: document.querySelector('.biffy-layer .ind').getAttribute('fill'), door: document.querySelector('.biffy-layer .door').getAttribute('transform') }));
      check(after.ind === '#56b05a' && /scale\(1 1\)/.test(after.door), 'afterwards the door is shut and the indicator is back to the green it began with');
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
      const watching = watch(page, 'biffyB', { man: '.shuffler-layer svg.pup .head', roll: '.shuffler-layer .pup-roll', box: '.biffy-layer svg.pup .door' });
      await drag(page, id, 2, 250);
      await drag(page, id, 2, 250);
      const log = await watching;
      check(sameBeats(log, 'biffyB'), `the reference beats, in order (${beatsOf(log).length} of ${BEATS.biffyB.length})`);
      const rollEnd = log.filter((f) => f.roll?.vis).at(-1);
      const manEnd = log.filter((f) => f.beat === 'shuffle' && f.man).at(-1);
      const shakeB = sway(log);
      check(shakeB > shakeA * 1.4, `two bumps: a bigger shake than Biffy A's (${shakeB.toFixed(1)} px against ${shakeA.toFixed(1)})`);
      // The biffy stands left of the middle, so the near edge is the left one.
      const rolling = log.filter((f) => f.roll?.vis && (f.beat === 'roll-out' || f.beat === 'roll-away'));
      // (Its middle: a turning square's box grows and shrinks as it turns.)
      const mid = (f) => ({ x: (f.roll.l + f.roll.r) / 2, y: (f.roll.t + f.roll.b) / 2 });
      const ys = rolling.map((f) => mid(f).y);
      check(Math.max(...ys) - Math.min(...ys) < 0.6 && rolling.every((f, i) => i === 0 || mid(f).x <= mid(rolling[i - 1]).x + 0.01), `the roll glides along the ground, never up or down, never back (${(Math.max(...ys) - Math.min(...ys)).toFixed(2)} px of bounce over ${rolling.length} frames)`);
      // Once it is rolling (the second half of its run) it keeps one speed: it stays on a straight line against time.
      const cruise = rolling.slice(Math.floor(rolling.length * 0.5));
      const [p0, p1] = [cruise[0], cruise.at(-1)];
      const speed = (mid(p1).x - mid(p0).x) / (p1.t - p0.t);
      const off = Math.max(...cruise.map((f) => Math.abs(mid(f).x - (mid(p0).x + speed * (f.t - p0.t)))));
      check(off < 8 && speed < 0, `at one steady speed once it is rolling: no jumps (${(-speed * 1000).toFixed(0)} px a second, never more than ${off.toFixed(1)} px off the line)`);
      check(rollEnd.roll.r <= 2, `the roll leaves by the near edge, the left one, until it is fully off screen (x ${Math.round(rollEnd.roll.r)})`);
      check(manEnd.man.r <= 2, `he shuffles after it the same way until he is fully off screen (x ${Math.round(manEnd.man.r)})`);
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
      check(LANDOWNER_LINES.includes(b?.text) && b.box.x >= 6 && b.box.x + b.box.width <= 384, `"${b?.text}", on screen`);
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
          const mound = document.querySelector('[data-anchor="mound"]').getBoundingClientRect();
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
      check(pass[0].truck.l >= 390 && pass.at(-1).truck.r <= 8 && pass.every((f, i) => i === 0 || f.truck.l <= pass[i - 1].truck.l + 0.5), `the hotshot crosses right to left, fully off screen to fully off screen (${Math.round(pass[0].truck.l)} to ${Math.round(pass.at(-1).truck.r)})`);
      const b = await bubble;
      check(b?.text === 'Near miss!' && b.box.x >= 6 && b.box.x + b.box.width <= 384, `"${b?.text}", on screen`);
      await context.close();
    }
    {
      const { context, page } = await open(browser, { level: [1, 0] });
      check((await page.$$('[data-anchor="mound"]')).length === 0, 'Cardium only: no mound, no gopher, elsewhere');
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
      if (mode === 'game') check(cards.map((c) => c.id).slice(0, 7).join() === 'magpie,spotter,moose,nearmiss,landowner,biffy,biffyB' && cards.every((c) => c.art && c.text === riddleOf(c.id)), `lists these four after the first three, with puppet card art; the game hides the hints (${cards.length})`);
      else check(cards.slice(3, 7).map((c) => c.text).join('|') === 'In Cardium, drive two trucks out one right after the other.|Drive one truck back and forth four times, or wiggle it fast.|Bump a truck into the bottom berm.|Bump the bottom berm twice, quickly.', 'demo mode shows each gag\'s hint');
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
