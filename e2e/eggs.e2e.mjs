// Gags 2 and 3 (Playwright, WebKit as the judge; Chromium for the frame rate): the sleepy worker and
// the moose peekaboo, as code puppets ported from the approved reference.
//  - worker: after 20 s with no moves (2 s here: ?idle=0.1, magpie switched off so he need not wait
//    his turn). In from fully off the left edge, the reference beats in order, the pail left behind,
//    the peek and the yank, everything off screen at the end. A move cancels him: he runs off with
//    the pail. His clearing has no trees; he is clear of the tip line and buttons at 375 px.
//  - moose: Duvernay only, on the second bump into the top berm. Rises from behind the berm (cut off
//    at it), the reference beats, "Mmrrph", ducks. Not in other regions, not on one bump.
//  - neither blocks a touch; one gag at a time; reduced motion: simple fades; the Wildlife Log lists
//    the live gags, with hints in demo mode only.
// Saves clips (gag23_*.webm) to OUT. Run with the dev server up: npm run test:e2e:eggs
import { DEMO, UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const W_BEATS = ['walk-in', 'flip-pail', 'sit', 'yawn', 'doze', 'nod', 'jolt', 'guilty', 'bolt', 'pail-alone', 'peek', 'yank', 'gone'];
const M_BEATS = ['tips', 'rise', 'blink', 'chew', 'stare', 'groan', 'duck', 'gone'];
// A Duvernay level with a vertical truck that can be pushed up into the top berm from the start.
const duvernay = REGIONS.findIndex((r) => r.id === 'duvernay');
const topBumper = (level) => {
  const s = newGame(level);
  return s.trucks.find((t) => t.orient === 'v' && t.row === 0 && getMoveRange(s, t.id)?.exitDelta !== -1) ?? s.trucks.find((t) => t.orient === 'v' && getMoveRange(s, t.id)?.min < 0 && t.row + getMoveRange(s, t.id).min === 0 && getMoveRange(s, t.id).exitDelta !== getMoveRange(s, t.id).min);
};
const mooseLevel = REGIONS[duvernay].levels.findIndex((l) => topBumper(l)?.row === 0);
const bumper = topBumper(REGIONS[duvernay].levels[mooseLevel]);

async function open(browser, { width = 390, height = 844, query = '?cover=0&idle=0.1&magpie=0', reducedMotion = 'no-preference', video = null, level = [0, 5], progress = UNLOCKED, enter = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, reducedMotion, ...(video ? { recordVideo: { dir: video, size: { width, height } } } : {}) });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  if (!query.includes('gag=')) {
    await page.evaluate((p) => {
      localStorage.clear();
      localStorage.setItem('rush-hour-rigs:v2', p);
    }, progress);
    await page.reload({ waitUntil: 'networkidle' });
    if (enter) {
      await page.locator('.region-tab').nth(level[0]).click();
      await page.locator('.level-btn').nth(level[1]).click();
    }
  }
  if (enter || query.includes('gag=')) await page.waitForSelector('.board .truck.sprite-on');
  return { context, page };
}

/** Samples a gag's layer every frame until it has gone (or `ms` passes). `part` is what to box. */
const watch = (page, layer, part, ms = 20000) =>
  page.evaluate(
    ([sel, inner, limit]) =>
      new Promise((res) => {
        const log = [];
        const t0 = performance.now();
        const tick = () => {
          const l = document.querySelector(sel);
          const now = performance.now() - t0;
          if (l) {
            const el = l.querySelector(inner);
            const b = el.getBoundingClientRect();
            const pail = l.querySelector('.pail')?.getBoundingClientRect();
            log.push({ t: now, beat: l.dataset.beat, off: l.dataset.off === 'true', vis: getComputedStyle(el).visibility === 'visible', l: b.left, r: b.right, top: b.top, bot: b.bottom, h: b.height, pailL: pail?.left, pailR: pail?.right });
          }
          if ((!l && log.length) || now > limit) return res(log);
          requestAnimationFrame(tick);
        };
        tick();
      }),
    [layer, part, ms],
  );

/** Pushes a truck one way with touch pointer events, well past where it can go (a bump). */
const bump = (page, id) =>
  page.evaluate(async (truckId) => {
    const el = document.querySelector(`.truck[data-id="${truckId}"]`);
    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2;
    let y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 11, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown');
    for (let k = 0; k < 8; k++) { y -= 12; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); }
    ev('pointerup');
    await new Promise((q) => setTimeout(q, 420));
  }, id);

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();

  if (engine === 'webkit') {
    // ---------- 1. The sleepy worker ----------
    for (const [width, height] of [[390, 844], [375, 667]]) {
      console.log(`\n${engine} ${width}x${height}: sleepy worker after 20 s idle (2 s here)`);
      const { context, page } = await open(browser, { width, height });
      const watching = watch(page, '.worker-layer', '.flip', 24000);
      await wait(1200);
      check(!(await page.$('.worker-layer')), 'he does not come before the idle time');
      await page.waitForSelector('.worker-layer', { state: 'attached', timeout: 6000 });
      const space = await page.evaluate(() => {
        const s = document.querySelector('.worker-layer svg.pup').getBoundingClientRect();
        const box = { l: s.left, r: s.left + s.width * 0.7, t: s.top + s.height * 0.07, b: s.top + s.height * 0.9 };
        const trees = [...document.querySelectorAll('.scenery .sc, .scenery .mound')].filter((t) => { const r = t.getBoundingClientRect(); const w = r.width * 0.2; return r.left + w < box.r && r.right - w > box.l && r.top < box.b && r.bottom > box.t; }).length;
        const R = (q) => document.querySelector(q).getBoundingClientRect();
        return { trees, clearNote: box.b <= R('.note').top + 1, clearButtons: box.b <= R('.controls').top, belowBoard: box.t >= R('.board').bottom, touch: getComputedStyle(document.querySelector('.worker-layer')).pointerEvents, others: document.querySelectorAll('.magpie-layer, .moose-layer, .gag').length };
      });
      check(space.trees === 0, `his clearing by the edge has no trees in it (${space.trees})`);
      check(space.clearNote && space.clearButtons && space.belowBoard, 'he is below the lease and clear of the tip line and the buttons');
      check(space.touch === 'none' && space.others === 0, 'he never blocks a touch, and nothing else is on stage');
      const log = await watching;
      const seen = [...new Set(log.map((f) => f.beat))];
      check(JSON.stringify(seen) === JSON.stringify(W_BEATS), `the reference beats, in order (${seen.length} of ${W_BEATS.length}: ${seen.filter((b) => !W_BEATS.includes(b)).join() || 'all there'})`);
      check(log[0].off && log[0].r <= 0, `he walks in from fully off screen (first seen ending at x ${Math.round(log[0].r)})`);
      const tall = Math.max(...log.filter((f) => f.beat === 'walk-in' && f.vis).map((f) => f.h));
      check(tall > 44 && tall < 70, `about 62 px tall (${Math.round(tall)}px here)`);
      const alone = log.filter((f) => f.beat === 'pail-alone');
      check(alone.length > 20 && alone.every((f) => !f.vis && f.pailL > 0 && Math.abs(f.pailL - alone[0].pailL) < 0.5), 'he bolts off the edge and the pail stays put by itself');
      const last = log.at(-1);
      check(last.off && last.pailR <= 0.5, `then he and the pail are yanked fully off screen (pail ends at x ${Math.round(last.pailR)})`);
      check(Math.abs((last.t - log[0].t) / 1000 - 13.4) < 0.6, `the reference timing (${((last.t - log[0].t) / 1000).toFixed(1)} s in all)`);
      await wait(2800);
      check(!(await page.$('.worker-layer')), 'he only comes once per level');
      await context.close();
    }

    console.log(`\n${engine}: a move cancels the worker`);
    {
      const { context, page } = await open(browser);
      const watching = watch(page, '.worker-layer', '.flip', 16000);
      await page.waitForFunction(() => document.querySelector('.worker-layer')?.dataset.beat === 'doze', null, { timeout: 12000 });
      await page.evaluate(() => {
        const el = document.querySelector('.truck');
        const r = el.getBoundingClientRect();
        const at = { pointerId: 12, pointerType: 'touch', isPrimary: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true };
        el.dispatchEvent(new PointerEvent('pointerdown', { ...at, buttons: 1 }));
        setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', at)), 300);
      });
      const log = await watching;
      const c = log.filter((f) => f.beat === 'cancel');
      const last = c.at(-1);
      check(c.length > 30 && (last.t - c[0].t) / 1000 < 2.2, `he jolts and runs (${((last.t - c[0].t) / 1000).toFixed(1)} s)`);
      check(last.off && last.pailR <= 0.5 && last.r <= 0.5, 'off the edge WITH the pail, both fully off screen');
      check(!(await page.$('.worker-layer')), 'and is gone');
      await context.close();
    }

    // ---------- 2. The moose ----------
    console.log(`\n${engine}: moose peekaboo (Duvernay ${mooseLevel + 1}, truck ${bumper.id})`);
    {
      const { context, page } = await open(browser, { query: '?cover=0&magpie=0&worker=0', level: [duvernay, mooseLevel] });
      await bump(page, bumper.id);
      await wait(900);
      check(!(await page.$('.moose-layer')), 'one bump into the top berm: no moose');
      const watching = watch(page, '.moose-layer', '.root', 12000);
      await bump(page, bumper.id);
      await page.waitForSelector('.moose-layer', { state: 'attached', timeout: 4000 }).catch(() => {});
      const bubble = page.waitForSelector('.bubble[data-moose]', { timeout: 8000 }).then(async (b) => ({ text: await b.textContent(), box: await b.boundingBox() })).catch(() => null);
      const up = page.waitForFunction(() => document.querySelector('.moose-layer')?.dataset.beat === 'stare', null, { timeout: 8000 }).then(() =>
        page.evaluate(() => {
          const layer = document.querySelector('.moose-layer');
          const clip = layer.getBoundingClientRect();
          const board = document.querySelector('.board').getBoundingClientRect();
          const head = layer.querySelector('.root').getBoundingClientRect();
          const antlers = [layer.querySelector('.antL'), layer.querySelector('.antR')].map((a) => a.getBoundingClientRect());
          const gates = [...document.querySelectorAll('.gate[data-side="top"]')].map((g) => g.getBoundingClientRect());
          const mid = head.left + head.width / 2;
          return { cut: Math.abs(clip.bottom - board.top) <= 2 && getComputedStyle(layer).overflow === 'hidden', under: Number(getComputedStyle(layer).zIndex) < Number(getComputedStyle(document.querySelector('.stage')).zIndex), below: head.bottom > clip.bottom, span: Math.max(...antlers.map((a) => a.right)) - Math.min(...antlers.map((a) => a.left)), onGate: gates.some((g) => mid > g.left && mid < g.right), touch: getComputedStyle(layer).pointerEvents, hudClear: Math.min(...antlers.map((a) => a.top)) >= document.querySelector('.hud').getBoundingClientRect().top };
        }),
      );
      const log = await watching;
      const seen = [...new Set(log.map((f) => f.beat))];
      check(JSON.stringify(seen) === JSON.stringify(M_BEATS), `the second bump brings him up: the reference beats, in order (${seen.length} of ${M_BEATS.length})`);
      const m = await up;
      check(m.cut && m.under && m.below, 'he rises from BEHIND the top berm: his layer is under the board and cut off at its top line');
      check(m.span > 38 && m.span < 52, `about 45 px of antler span (${m.span.toFixed(0)}px)`);
      check(!m.onGate && m.touch === 'none', 'never through a gate, never blocking a touch');
      const b = await bubble;
      check(b?.text === 'Mmrrph' && b.box.x >= 6 && b.box.x + b.box.width <= 384, `"${b?.text}" beside him, on screen`);
      check(log[0].off && log.at(-1).off && Math.abs((log.at(-1).t - log[0].t) / 1000 - 5.7) < 0.5, `hidden behind the berm at the start and the end (${((log.at(-1).t - log[0].t) / 1000).toFixed(1)} s)`);
      await bump(page, bumper.id);
      await bump(page, bumper.id);
      await wait(900);
      check(!(await page.$('.moose-layer')), 'he only comes once per level');
      await context.close();
    }
    {
      // Not in Montney: two bumps into the top berm bring nothing.
      const montney = REGIONS.findIndex((r) => r.id === 'montney');
      const li = REGIONS[montney].levels.findIndex((l) => topBumper(l)?.row === 0);
      const { context, page } = await open(browser, { query: '?cover=0&magpie=0&worker=0', level: [montney, li] });
      const id = topBumper(REGIONS[montney].levels[li]).id;
      await bump(page, id);
      await bump(page, id);
      await wait(900);
      check(!(await page.$('.moose-layer')), 'Duvernay only: nothing in Montney');
      await context.close();
    }

    // ---------- 3. Reduced motion ----------
    console.log(`\n${engine}: reduced motion`);
    {
      const { context, page } = await open(browser, { reducedMotion: 'reduce' });
      await page.waitForSelector('.worker-layer', { state: 'attached', timeout: 6000 });
      await wait(700);
      const a = await page.evaluate(() => ({ beat: document.querySelector('.worker-layer').dataset.beat, o: getComputedStyle(document.querySelector('.worker-layer')).opacity, t: document.querySelector('.worker-layer .torso').getAttribute('transform') }));
      await wait(600);
      const still = await page.evaluate(() => document.querySelector('.worker-layer .torso').getAttribute('transform'));
      check(a.beat === 'still' && a.o === '1' && a.t === still, 'the worker fades in dozing, and holds still');
      await page.waitForSelector('.worker-layer', { state: 'detached', timeout: 5000 }).catch(() => {});
      check(!(await page.$('.worker-layer')), 'then fades out');
      await context.close();
    }
    {
      const { context, page } = await open(browser, { query: '?cover=0&magpie=0&worker=0', level: [duvernay, mooseLevel], reducedMotion: 'reduce' });
      await bump(page, bumper.id);
      await bump(page, bumper.id);
      await page.waitForSelector('.moose-layer', { state: 'attached', timeout: 4000 }).catch(() => {});
      await wait(900);
      const a = await page.evaluate(() => ({ beat: document.querySelector('.moose-layer')?.dataset.beat, bubble: document.querySelector('.bubble')?.textContent }));
      check(a.beat === 'still' && a.bubble === 'Mmrrph', 'the moose fades in staring, with his line');
      await page.waitForSelector('.moose-layer', { state: 'detached', timeout: 5000 }).catch(() => {});
      check(!(await page.$('.moose-layer')), 'then fades out');
      await context.close();
    }

    // ---------- 4. Wildlife Log: the live gags; hints in demo mode only ----------
    console.log(`\n${engine}: Wildlife Log`);
    for (const [mode, progress] of [['game', UNLOCKED], ['demo', DEMO]]) {
      const { context, page } = await open(browser, { query: '?cover=0', progress, enter: false });
      await page.locator('.binoculars').click();
      await page.waitForSelector('.log-card');
      const cards = await page.$$eval('.log-card', (cs) => cs.map((c) => ({ id: c.dataset.id, text: c.querySelector('p').textContent, art: !!c.querySelector('.art svg') })));
      if (mode === 'game') {
        check(cards.map((c) => c.id).slice(0, 3).join() === 'magpie,spotter,moose' && cards.every((c) => c.art), 'lists the live gags, each with card art from its puppet');
        check(cards.every((c) => c.text === 'Not seen yet.'), 'game mode hides the hints');
      } else check(cards[1].text === 'Sit tight for 20 seconds.' && cards[2].text === 'Bump a truck into the top berm twice in Duvernay.', `demo mode shows each gag's hint ("${cards[1].text}" / "${cards[2].text}")`);
      await context.close();
    }
  }

  // ---------- 5. 60 fps with the CPU slowed 4x (Chromium) ----------
  if (engine === 'chromium') {
    for (const [gag, layer, part] of [['worker', '.worker-layer', '.flip'], ['moose', '.moose-layer', '.root']]) {
      console.log(`\n${engine}: ${gag} frame rate with a 4x slower CPU (?gag=${gag})`);
      const { context, page } = await open(browser, { query: `?gag=${gag}` });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const log = await watch(page, layer, part, 18000);
      const gaps = log.slice(1).map((f, i) => f.t - log[i].t).slice(5).sort((x, y) => x - y);
      const p95 = gaps[Math.floor(gaps.length * 0.95)];
      check(log.length > 100 && p95 < 20, `p95 frame ${p95?.toFixed(1)} ms, median ${gaps[gaps.length >> 1]?.toFixed(1)} ms over the whole gag`);
      await context.close();
    }
  }

  // ---------- 6. Clips (WebKit, 390x844, full screen) ----------
  if (engine === 'webkit' && !process.env.NO_CLIPS) {
    const dir = join(OUT, 'gag23_clip_tmp');
    for (const [name, gag, layer] of [['worker', 'worker', '.worker-layer'], ['worker_cancel', 'worker', '.worker-layer'], ['moose', 'moose', '.moose-layer']]) {
      const { context, page } = await open(browser, { query: `?gag=${gag}`, video: dir });
      await page.waitForSelector(layer, { state: 'attached', timeout: 8000 });
      if (name === 'worker_cancel') {
        await page.waitForFunction(() => document.querySelector('.worker-layer')?.dataset.beat === 'doze', null, { timeout: 12000 });
        await wait(500);
        await page.evaluate(() => {
          const el = document.querySelector('.truck');
          const r = el.getBoundingClientRect();
          const at = { pointerId: 12, pointerType: 'touch', isPrimary: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true };
          el.dispatchEvent(new PointerEvent('pointerdown', { ...at, buttons: 1 }));
          setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', at)), 300);
        });
        await wait(2600);
      } else {
        await page.waitForSelector(layer, { state: 'detached', timeout: 18000 });
        await wait(600);
      }
      const video = page.video();
      await context.close();
      renameSync(await video.path(), join(OUT, `gag23_${name}.webm`));
      console.log(`   saved gag23_${name}.webm`);
    }
    rmSync(dir, { recursive: true, force: true });
  }
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
