// Menus test (Playwright, WebKit + Chromium): the main page, the level list and the win card.
//  - main page: nothing runs off the screen at 375, 390, 393 and 430 px wide; the Days Without
//    Incident sign and the Daily Pad button keep the normal side margins
//  - level list: compact rows about 56px tall (number, name, 3 small hats, padlock if locked), the
//    whole row is the button, and all 10 need at most a short scroll at 390x844
//  - win card: fits 375x553 without scrolling (its layout is checked in card.e2e.mjs); the roughneck and the Company Man are one
//    still image each (no sprite frames cycling), moved smoothly in code, never changing position
// Saves screenshots at 375x667 and 390x844 to OUT (default ~/Desktop/RHR Art Inbox/fit_check).
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:menus
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DAILY_LEVELS, REGIONS } from '../src/levels/regions.ts';
import { dayKey, padLevelIndex, padNumber } from '../src/ui/daily.ts';
import { getMoveRange, newGame, solve } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const PHONES = [[375, 667], [390, 844], [393, 852], [430, 932]];
const SHOTS = new Set(['375x667', '390x844']);
const level = REGIONS[0].levels[2];
const perfect = solve(level);
// Over par: one truck goes a cell and comes back before the real solution.
const state = newGame(level);
const spare = state.trucks.map((t) => ({ t, r: getMoveRange(state, t.id) })).find(({ r }) => r && ((r.max > 0 && r.exitDelta !== 1) || (r.min < 0 && r.exitDelta !== -1)));
const step = spare.r.max > 0 && spare.r.exitDelta !== 1 ? 1 : -1;
const overPar = [{ id: spare.t.id, delta: step }, { id: spare.t.id, delta: -step }, ...perfect];

async function fresh(page, progress) {
  await page.goto(ROOT + '?cover=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => {
    localStorage.clear();
    if (p) localStorage.setItem('rush-hour-rigs:v2', p);
  }, progress);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(300);
}

/** Everything visible on the screen that sticks out past its left or right edge (trees don't count). */
const offScreen = (page, root) =>
  page.evaluate((sel) => {
    const vw = innerWidth;
    return [...document.querySelectorAll(`${sel} *`)]
      .filter((e) => !e.closest('.scenery'))
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.right > vw + 0.5 || r.left < -0.5);
      })
      .map((e) => `${e.className || e.tagName} ${Math.round(e.getBoundingClientRect().left)}..${Math.round(e.getBoundingClientRect().right)}`);
  }, root);

async function play(page, moves, lvl = level) {
  const cell = await page.$eval('.board', (el) => parseFloat(el.style.getPropertyValue('--cell')));
  for (const m of moves) {
    const t = lvl.trucks.find((x) => x.id === m.id);
    await page.evaluate(
      ({ id, d, h }) =>
        new Promise(async (res) => {
          const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`);
          const r = el.getBoundingClientRect();
          let x = r.x + r.width / 2;
          let y = r.y + r.height / 2;
          const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
          ev('pointerdown');
          for (let k = 1; k <= 8; k++) {
            if (h) x += d / 8;
            else y += d / 8;
            ev('pointermove');
            await new Promise((r) => requestAnimationFrame(r));
          }
          ev('pointerup');
          res();
        }),
      { id: m.id, d: m.delta * cell, h: t.orient === 'h' },
    );
    await wait(350);
  }
  await page.waitForSelector('.win:not([hidden]) .card');
}

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();
  for (const [w, h] of PHONES) {
    const size = `${w}x${h}`;
    const shoot = engine === 'webkit' && SHOTS.has(size);
    const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, hasTouch: true });
    const page = await context.newPage();
    console.log(`\n${engine} ${size}`);

    // Main page, as a new player sees it (locked rows and regions).
    await fresh(page, null);
    const main = await page.evaluate(() => {
      const R = (s) => document.querySelector(s).getBoundingClientRect();
      const [sign, daily, foot] = [R('.safety-sign'), R('.daily-btn'), R('.sign-foot')];
      return { vw: innerWidth, sideways: document.querySelector('.screen.levels').scrollWidth > innerWidth + 1, sign: [sign.left, sign.right], daily: [daily.left, daily.right], foot: [foot.left, foot.right] };
    });
    const off = await offScreen(page, '.screen.levels');
    check(off.length === 0 && !main.sideways, `main page: nothing runs off the screen (${off[0] ?? 'clear'})`);
    const margins = (r) => r[0] >= 15.5 && r[1] <= main.vw - 15.5;
    check(margins(main.sign) && margins(main.daily) && margins(main.foot), `the sign and the Daily Pad button keep 16px side margins (sign ${main.sign.map(Math.round)}, button ${main.daily.map(Math.round)})`);
    if (shoot) await page.screenshot({ path: join(OUT, `menu_main_${size}.png`) });

    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('.level-btn')].map((b) => {
        const r = b.getBoundingClientRect();
        const li = b.parentElement.getBoundingClientRect();
        const vis = (s) => !!b.querySelector(s) && b.querySelector(s).getBoundingClientRect().width > 0;
        return { h: r.height, full: Math.abs(r.width - li.width) < 1 && Math.abs(r.height - li.height) < 1, n: vis('.n'), name: vis('.lname'), hats: b.querySelectorAll('.hats img').length, hat: b.querySelector('.hats img')?.getBoundingClientRect().width ?? 0, lock: vis('.lock img'), locked: b.classList.contains('locked') };
      }),
    );
    check(rows.length === 10 && rows.every((r) => r.h >= 52 && r.h <= 60), `level list: 10 compact rows about 56px tall (${rows[0]?.h}px)`);
    check(rows.every((r) => r.full && r.n && r.name), 'each row is one button with its number and name');
    check(rows.filter((r) => !r.locked).every((r) => r.hats === 3 && r.hat <= 24) && rows.filter((r) => r.locked).every((r) => r.lock && r.hats === 0), 'open rows show 3 small hard hats; locked rows show a padlock');

    // The level list with progress, each region.
    await fresh(page, UNLOCKED);
    for (const [i, region] of REGIONS.entries()) {
      await page.locator('.region-tab').nth(i).click();
      await wait(250);
      const list = await page.evaluate(() => {
        const s = document.querySelector('.screen.levels');
        return { scroll: s.scrollHeight - s.clientHeight, rows: document.querySelectorAll('.level-btn').length, full: [...document.querySelectorAll('.level-btn .hats .on')].length };
      });
      const offR = await offScreen(page, '.screen.levels');
      check(offR.length === 0 && list.rows === 10 && list.full > 0, `${region.name}: 10 rows, earned hats showing, nothing off screen`);
      if (size === '390x844') check(list.scroll <= 220, `${region.name}: all 10 levels need only a short scroll at 390x844 (${Math.round(list.scroll)}px)`);
      if (shoot) {
        await page.screenshot({ path: join(OUT, `menu_levels_${region.id}_${size}.png`) });
        await page.evaluate(() => document.querySelector('.screen.levels').scrollTo(0, 99999));
        await wait(150);
        await page.screenshot({ path: join(OUT, `menu_levels_${region.id}_${size}_scrolled.png`) });
      }
    }
    await context.close();
  }

  // Win card: perfect and over par, at the two screenshot sizes and at 375x553 (Safari toolbars).
  for (const [w, h] of [[375, 667], [390, 844], [375, 553]]) {
    for (const [kind, moves] of [['perfect', perfect], ['over_par', overPar]]) {
      const size = `${w}x${h}`;
      const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, hasTouch: true });
      const page = await context.newPage();
      await fresh(page, UNLOCKED);
      await page.locator('.level-btn').nth(2).click();
      await page.waitForSelector('.board .truck');
      await wait(400);
      await play(page, moves);
      console.log(`\n${engine} ${size} win card (${kind})`);
      // Watch the characters for 2.5 s: where their boxes are, and whether any sprite frame changes.
      const seen = await page.evaluate(
        () =>
          new Promise((res) => {
            const m = document.querySelector('.win .mascot .win-still');
            const b = document.querySelector('.win .company-man .win-still');
            const frames = [];
            const t0 = performance.now();
            const tick = () => {
              const mm = new DOMMatrixReadOnly(getComputedStyle(m).transform);
              const bm = new DOMMatrixReadOnly(getComputedStyle(b).transform);
              frames.push({ t: performance.now() - t0, pos: m.style.backgroundPosition + b.style.backgroundPosition, mx: mm.m41, my: mm.m42, ms: mm.d, br: Math.atan2(bm.b, bm.a) });
              if (performance.now() - t0 < 2500) requestAnimationFrame(tick);
              else res(frames);
            };
            tick();
          }),
      );
      const card = await page.evaluate(() => {
        const o = document.querySelector('.win');
        const c = document.querySelector('.win .card');
        const r = c.getBoundingClientRect();
        const cs = getComputedStyle(c);
        return { scrolls: o.scrollHeight > o.clientHeight + 1, h: r.height, w: r.width, bottom: r.bottom, vh: innerHeight, side: parseFloat(cs.borderLeftWidth), top: parseFloat(cs.borderTopWidth), sheets: document.querySelectorAll('.win .sprite-anim').length, stills: document.querySelectorAll('.win .win-still').length };
      });
      // The roughneck: boots level with the hard hat row, and clear of the hats, the moves line and
      // the buttons. Measured at rest (transform cleared), on the part of the frame he fills.
      const stand = await page.evaluate(() => {
        const m = document.querySelector('.win .mascot');
        const still = m.querySelector('.win-still');
        const keep = still.style.transform;
        still.style.transform = 'none';
        const r = m.getBoundingClientRect();
        still.style.transform = keep;
        const body = { left: r.left + r.width * 0.17, right: r.left + r.width * 0.83, top: r.top + r.height * 0.06, bottom: r.top + r.height * 0.94 };
        const hits = (sel) => [...document.querySelectorAll(sel)].some((e) => { const b = e.getBoundingClientRect(); return b.left < body.right && b.right > body.left && b.top < body.bottom && b.bottom > body.top; });
        const hats = [...document.querySelectorAll('.win .hats.big img')].map((e) => e.getBoundingClientRect());
        return { feet: body.bottom, row: Math.max(...hats.map((h) => h.bottom)), size: r.height, covers: ['.win .hats.big img', '.win .result', '.win .btn', '.win .company'].filter(hits), onScreen: body.left >= 0 };
      });
      check(Math.abs(stand.feet - stand.row) <= 4, `the roughneck's boots are level with the hard hat row (${(stand.feet - stand.row).toFixed(1)}px off), ${stand.size}px tall`);
      check(stand.covers.length === 0 && stand.onScreen, `he covers nothing: hats, moves line, buttons (${stand.covers.join(', ') || 'clear'})`);
      check(!card.scrolls && card.bottom <= card.vh, `fits without scrolling (card ${Math.round(card.h)}px of ${card.vh}px)`);
      check(card.sheets === 0 && card.stills === 2 && new Set(seen.map((f) => f.pos)).size === 1, 'the mascot and the Company Man are one still each: nothing cycling');
      const cast = await page.evaluate(() => {
        const m = document.querySelector('.win .mascot .win-still'), b = document.querySelector('.win .company-man .win-still');
        const sprite = [...document.querySelectorAll('.win .mascot *, .win .company *')].some((e) => e.tagName === 'IMG' || /url\(/.test(getComputedStyle(e).backgroundImage));
        return { svg: m?.tagName === 'svg' && b?.tagName === 'svg', sprite, mascot: m?.dataset.tier, boss: b?.dataset.tier, hat: !!b?.querySelector('.hat [fill="#f3f5f7"]'), shirt: !!b?.querySelector('.torso [fill="#a9cdea"]'), mug: !!b?.querySelector('.mug'), red: !!m?.querySelector('.torso [fill="#c8352b"]') };
      });
      const tier = kind === 'perfect' ? 'par' : cast.mascot;
      check(cast.svg && !cast.sprite && cast.red && cast.hat && cast.shirt && cast.mug, 'both are flat puppet stills (no sprite): the worker, and the Company Man in a white hard hat and a light blue shirt with his travel mug');
      check(cast.mascot === cast.boss && ['par', 'close', 'over'].includes(cast.mascot) && cast.mascot === tier, `one expression per result: both show "${cast.mascot}"`);
      // Smooth motion: he never moves sideways, and never faster than the bounce itself (a jump
      // between two poses would be many times that).
      const speed = Math.max(...seen.slice(1).map((f, i) => Math.abs(f.my - seen[i].my) / Math.max(1, f.t - seen[i].t)));
      const gaps = seen.slice(1).map((f, i) => f.t - seen[i].t);
      const fps = 1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length);
      check(seen.every((f) => Math.abs(f.mx) < 0.01) && speed < 0.3, `no position jumps (fastest ${(speed * 1000).toFixed(0)}px/s, eased)`);
      // Frame rate is judged in Chromium (headless WebKit's own frame clock is not steady).
      if (engine === 'chromium') check(fps > 55, `smooth: ${fps.toFixed(0)} fps`);
      const lift = Math.min(...seen.map((f) => f.my));
      if (kind === 'perfect') check(lift < -8 && Math.abs(seen.at(-1).my) < 0.5, `perfect solve: one bounce (${(-lift).toFixed(0)}px), then back on his feet, breathing`);
      else check(lift > -0.5, 'over par: no bounce, just breathing');
      check(Math.max(...seen.map((f) => f.br)) > 0.04 && Math.abs(seen.at(-1).br) < 0.005, 'Company Man: one small nod, then still');
      if (engine === 'webkit') await page.screenshot({ path: join(OUT, `menu_win_${kind}_${size}.png`) });
      await context.close();
    }
  }

  // Reduced motion: stills, no movement at all.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await fresh(page, UNLOCKED);
    await page.locator('.level-btn').nth(2).click();
    await page.waitForSelector('.board .truck');
    await wait(400);
    await play(page, perfect);
    await wait(900);
    const still = await page.evaluate(() => [...document.querySelectorAll('.win .win-still')].map((e) => getComputedStyle(e).transform));
    console.log(`\n${engine} reduced motion`);
    check(still.length === 2 && still.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'), 'both characters stand still');
    await context.close();
  }
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
