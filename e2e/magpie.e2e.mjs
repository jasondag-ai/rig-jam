// Magpie gag test (Playwright, WebKit as the judge, plus Chromium for the frame rate), 390x844 and
// 375x667. After 10 s with no moves (1 s here: ?idle=0.1) the toy magpie plays the approved gag on
// a truck roof: in from fully off screen, the reference beats in order, the splat and drip left on
// the truck (drip toward its front), "Seriously?" beside him and on screen, out until fully off
// screen. Grabbing his truck startles him off early. He never blocks a touch. Every other gag is
// off. Reduced motion: fade in, splat, fade out. Saves clips (magpie_*.webm) to OUT.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:magpie
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const BEATS = ['fly-in', 'land', 'hop-turn', 'look', 'glance', 'crouch', 'strain', 'relief', 'peek', 'smug', 'wind-up', 'launch', 'gone'];

async function open(browser, { width = 390, height = 844, query = '?cover=0&idle=0.1&cooldown=0&off=lunch,sam,tongue', reducedMotion = 'no-preference', video = null, level = [0, 5] } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, reducedMotion, ...(video ? { recordVideo: { dir: video, size: { width, height } } } : {}) });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  if (!query.includes('gag=')) {
    await page.evaluate((p) => {
      localStorage.clear();
      localStorage.setItem('rush-hour-rigs:v2', p);
    }, UNLOCKED);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(level[0]).click();
    await page.locator('.level-btn').nth(level[1]).click();
  }
  await page.waitForSelector('.board .truck.sprite-on');
  return { context, page };
}

/** Samples the gag every frame until the layer has gone (or `ms` passes). */
const watch = (page, ms = 15000) =>
  page.evaluate(
    (limit) =>
      new Promise((res) => {
        const log = [];
        const t0 = performance.now();
        const tick = () => {
          const l = document.querySelector('.magpie-layer');
          const now = performance.now() - t0;
          if (l) {
            const b = l.querySelector('svg.magpie .root').getBoundingClientRect();
            const vis = getComputedStyle(l.querySelector('svg.magpie')).visibility === 'visible';
            log.push({ t: now, beat: l.dataset.beat, off: l.dataset.off === 'true', vis, l: b.left, r: b.right, top: b.top, bot: b.bottom, w: b.width });
          }
          if ((!l && log.length) || now > limit) return res(log);
          requestAnimationFrame(tick);
        };
        tick();
      }),
    ms,
  );

const marks = (page) =>
  page.evaluate(() => {
    const s = document.querySelector('.magpie-splat');
    if (!s) return null;
    const truck = s.closest('.truck');
    const [sr, tr, dr] = [s.getBoundingClientRect(), truck.getBoundingClientRect(), truck.querySelector('.magpie-drip').getBoundingClientRect()];
    const cab = truck.dataset.cab;
    const mid = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const [a, b] = [mid(sr), mid(dr)];
    const toward = { right: b.x > a.x + 1, left: b.x < a.x - 1, top: b.y < a.y - 1, bottom: b.y > a.y + 1 }[cab];
    return { n: document.querySelectorAll('.magpie-splat').length, truck: truck.dataset.id, cab, onTruck: sr.left >= tr.left && sr.right <= tr.right && sr.top >= tr.top && sr.bottom <= tr.bottom, toward, x: sr.left, y: sr.top, dripLen: Math.max(dr.width, dr.height), touches: getComputedStyle(s).pointerEvents };
  });

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();

  // 1. The whole gag, after the idle time, at two phone sizes.
  for (const [width, height] of engine === 'webkit' ? [[390, 844], [375, 667]] : [[390, 844]]) {
    console.log(`\n${engine} ${width}x${height}: the gag after 10 s idle (1 s here)`);
    const { context, page } = await open(browser, { width, height });
    const others = await page.evaluate(() => ({ gags: document.querySelectorAll('.gag').length, log: !!document.querySelector('.binoculars'), early: !!document.querySelector('.magpie-layer') }));
    check(others.gags === 0 && !others.early, 'every other gag is off, and he does not come before the idle time');
    // Watching from before he appears, so the very first frame is seen.
    const watching = watch(page, 20000);
    await page.waitForSelector('.magpie-layer', { state: 'attached', timeout: 5000 });
    const bubbleSeen = page.waitForSelector('.bubble', { timeout: 14000 }).then(async (b) => ({ text: await b.textContent(), box: await b.boundingBox() })).catch(() => null);
    // He never blocks a touch: at the smug beat, the point he stands on still reaches his truck.
    const touchable = page.waitForFunction(() => document.querySelector('.magpie-layer')?.dataset.beat === 'smug', null, { timeout: 14000 }).then(() =>
      page.evaluate(() => {
        const b = document.querySelector('.magpie-layer svg.magpie .body').getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        const bird = document.querySelector('.magpie-layer svg.magpie .root').getBoundingClientRect();
        const bub = document.querySelector('.bubble')?.getBoundingClientRect();
        return { truck: !!hit?.closest('.truck'), layer: getComputedStyle(document.querySelector('.magpie-layer')).pointerEvents, clearOfBird: !bub || bub.right <= bird.left + 4 || bub.left >= bird.right - 4 || bub.bottom <= bird.top + 4 || bub.top >= bird.bottom - 4, birdW: bird.width };
      }),
    );
    const log = await watching;
    const seen = [...new Set(log.map((f) => f.beat))];
    check(JSON.stringify(seen) === JSON.stringify(BEATS), `the reference beats, in order (${seen.length} of ${BEATS.length})`);
    const first = log[0];
    const last = log.filter((f) => f.vis).at(-1);
    check(first.off && (first.l >= width || first.bot <= 0), `he flies in from fully off screen (first seen at x ${Math.round(first.l)}, y ${Math.round(first.bot)} on a ${width}px screen)`);
    check(last.l >= width - 1 || last.bot <= 1, `he flies out until he is fully off screen (last seen at x ${Math.round(last.l)}, y ${Math.round(last.bot)})`);
    const launch = log.filter((f) => f.beat === 'launch');
    check(launch.every((f) => f.vis) && launch.every((f, i) => i === 0 || f.l >= launch[i - 1].l - 0.5), 'never stopping or vanishing mid-screen on the way out');
    const dur = (name) => { const f = log.filter((x) => x.beat === name); return (f.at(-1).t - f[0].t) / 1000; };
    check(Math.abs(dur('strain') - 1.6) < 0.25 && Math.abs(dur('smug') - 1.6) < 0.25 && Math.abs((last.t - first.t) / 1000 - 11.8) < 0.5, `the reference timing (strain ${dur('strain').toFixed(1)} s, smug ${dur('smug').toFixed(1)} s, ${((last.t - first.t) / 1000).toFixed(1)} s in all)`);
    const t = await touchable;
    check(t.truck && t.layer === 'none', 'he never blocks a touch: the truck under him still gets it');
    check(t.birdW > 30 && t.birdW < 62, `about 40 px of bird (${Math.round(t.birdW)}px with tail and beak)`);
    const b = await bubbleSeen;
    check(b?.text === 'Seriously?' && b.box.x >= 6 && b.box.x + b.box.width <= width - 6 && t.clearOfBird, `"${b?.text}" from that truck, beside him and clear of the screen edge (x ${Math.round(b?.box.x)} to ${Math.round(b?.box.x + b?.box.width)})`);
    const m = await marks(page);
    check(!!m && m.n === 1 && m.onTruck && m.touches === 'none', `one splat left on truck ${m?.truck}'s roof`);
    check(m?.toward === true && m.dripLen > 8, `the drip runs toward the truck's front (cab ${m?.cab})`);
    check(!(await page.$('.magpie-layer')), 'the bird and his layer are gone');
    if (width === 390) {
      // The splat rides with its truck; once per level; restart clears it.
      const moved = await page.evaluate(async (id) => {
        const el = document.querySelector(`.truck[data-id="${id}"]`);
        const before = document.querySelector('.magpie-splat').getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const h = el.classList.contains('horiz');
        const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
        for (const dir of [1, -1]) {
          let x = r.x + r.width / 2, y = r.y + r.height / 2;
          const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
          ev('pointerdown');
          for (let k = 1; k <= 8; k++) { if (h) x += (dir * cell) / 8; else y += (dir * cell) / 8; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); }
          ev('pointerup');
          await new Promise((q) => setTimeout(q, 500));
          const now = document.querySelector('.magpie-splat')?.getBoundingClientRect();
          const t2 = el.getBoundingClientRect();
          if (now && (Math.abs(t2.left - r.left) > 5 || Math.abs(t2.top - r.top) > 5)) return { truck: [t2.left - r.left, t2.top - r.top], splat: [now.left - before.left, now.top - before.top] };
        }
        return null;
      }, m.truck);
      // (If the truck he picked is boxed in and cannot move, the splat being part of the truck is the proof.)
      const part = await page.evaluate(() => !!document.querySelector('.truck .magpie-splat') && !!document.querySelector('.truck .magpie-drip'));
      check(part && (!moved || (Math.abs(moved.truck[0] - moved.splat[0]) < 1 && Math.abs(moved.truck[1] - moved.splat[1]) < 1)), `the splat and drip are part of the truck and move with it (${moved ? 'moved ' + moved.splat.map(Math.round) : 'this truck is boxed in'})`);
      await wait(2500);
      check(!(await page.$('.magpie-layer')) && (await page.$$('.magpie-splat')).length === 1, 'he only comes once per level');
      await page.locator('[data-act="restart"]').click();
      await wait(300);
      check((await page.$$('.magpie-splat, .magpie-drip')).length === 0, 'restart clears the splat');
    }
    await context.close();
  }

  // 2. Startled: grab his truck mid-gag.
  if (engine === 'webkit') {
    console.log(`\n${engine}: his truck is grabbed mid-gag`);
    const { context, page } = await open(browser);
    await page.waitForFunction(() => document.querySelector('.magpie-layer')?.dataset.beat === 'look', null, { timeout: 9000 });
    const watching = watch(page, 6000);
    await page.evaluate(() => {
      const spot = JSON.parse(document.querySelector('.magpie-layer').dataset.spot);
      const s = document.querySelector('.screen.game').getBoundingClientRect();
      const el = document.elementFromPoint(s.left + spot.x, s.top + spot.y).closest('.truck');
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true, buttons: 1 }));
      window.__grabbed = el.classList.contains('dragging');
      setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true })), 600);
    });
    const log = await watching;
    const startle = log.filter((f) => f.beat === 'startle');
    const last = startle.filter((f) => f.vis).at(-1);
    check(await page.evaluate(() => window.__grabbed), 'the touch went to the truck, not the bird');
    check(startle.length > 20 && Math.min(...startle.map((f) => f.top)) < startle[0].top - 6, 'he startles and hops (feathers up)');
    check(!!last && (last.l >= 390 - 1 || last.bot <= 1) && (startle.at(-1).t - startle[0].t) / 1000 < 2.6, `and flies off forward early, fully off screen (last seen at x ${Math.round(last?.l)}, y ${Math.round(last?.bot)})`);
    check(!(await page.$('.magpie-splat')) && !(await page.$('.magpie-layer')), 'no splat was left, and he is gone');
    await context.close();
  }

  // 3. Reduced motion: the bird fades in, the splat appears, the bird fades out.
  if (engine === 'webkit') {
    console.log(`\n${engine}: reduced motion`);
    const { context, page } = await open(browser, { reducedMotion: 'reduce' });
    await page.waitForSelector('.magpie-layer', { state: 'attached', timeout: 5000 });
    const a = await page.evaluate(() => ({ beat: document.querySelector('.magpie-layer').dataset.beat, t: document.querySelector('.magpie-layer svg.magpie .root').getAttribute('transform') }));
    await wait(1200);
    const b = await page.evaluate(() => ({ t: document.querySelector('.magpie-layer svg.magpie .root')?.getAttribute('transform'), splat: document.querySelectorAll('.magpie-splat').length, bubble: document.querySelector('.bubble')?.textContent, opacity: getComputedStyle(document.querySelector('.magpie-layer')).opacity }));
    check(a.beat === 'still' && a.t === b.t && b.opacity === '1', 'the bird fades in and holds still');
    check(b.splat === 1 && b.bubble === 'Seriously?', 'the splat appears, with the driver\'s line');
    await wait(2200);
    check(!(await page.$('.magpie-layer')) && (await page.$$('.magpie-splat')).length === 1, 'the bird fades out; the splat stays');
    await context.close();
  }

  // 4. 60 fps with the CPU slowed 4x (Chromium), through the busiest stretch (flight in to landing).
  if (engine === 'chromium') {
    console.log(`\n${engine}: frame rate with a 4x slower CPU`);
    const { context, page } = await open(browser, { query: '?gag=magpie' });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.waitForSelector('.magpie-layer', { state: 'attached', timeout: 8000 });
    const log = await watch(page, 13500);
    const gaps = log.slice(1).map((f, i) => f.t - log[i].t).slice(5).sort((x, y) => x - y);
    const p95 = gaps[Math.floor(gaps.length * 0.95)];
    check(p95 < 20, `p95 frame ${p95.toFixed(1)} ms, median ${gaps[gaps.length >> 1].toFixed(1)} ms over the whole gag`);
    check(await page.evaluate(() => !!document.querySelector('.screen.game')), '?gag=magpie opens a level and plays him straight away');
    await context.close();
  }

  // 5. Clips (WebKit, 390x844, full screen): the full gag, and the startle.
  if (engine === 'webkit' && !process.env.NO_CLIPS) {
    const dir = join(OUT, 'magpie_clip_tmp');
    for (const kind of ['full_gag', 'startle']) {
      const { context, page } = await open(browser, { query: '?gag=magpie', video: dir });
      await page.waitForSelector('.magpie-layer', { state: 'attached', timeout: 8000 });
      if (kind === 'startle') {
        await page.waitForFunction(() => document.querySelector('.magpie-layer')?.dataset.beat === 'strain', null, { timeout: 9000 });
        await page.evaluate(() => {
          const spot = JSON.parse(document.querySelector('.magpie-layer').dataset.spot);
          const s = document.querySelector('.screen.game').getBoundingClientRect();
          const el = document.elementFromPoint(s.left + spot.x, s.top + spot.y).closest('.truck');
          const r = el.getBoundingClientRect();
          const at = { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true };
          el.dispatchEvent(new PointerEvent('pointerdown', { ...at, buttons: 1 }));
          setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', at)), 700);
        });
        await wait(2600);
      } else {
        await page.waitForSelector('.magpie-layer', { state: 'detached', timeout: 16000 });
        await wait(700);
      }
      const video = page.video();
      await context.close();
      renameSync(await video.path(), join(OUT, `magpie_${kind}.webm`));
      console.log(`   saved magpie_${kind}.webm`);
    }
    rmSync(dir, { recursive: true, force: true });
  }
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
