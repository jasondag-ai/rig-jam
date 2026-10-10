// Fit check (Playwright, WebKit + Chromium): on every iPhone size, in Safari with its toolbars showing
// (about 100px less height) and as a home-screen app (full height, notch and home-bar insets), the
// whole game screen is visible with no scrolling: HUD, lease, Undo/Hint/Restart. The lease is square
// and as large as the screen allows. Saves screenshots to OUT (default qc-out/fit_check in the repo; see out.mjs).
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:fit
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { outDir } from './out.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = outDir('fit_check');
const TAG = process.env.TAG ? `${process.env.TAG}_` : '';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

// [width, full height, notch inset, home-bar inset]
const PHONES = [
  [375, 667, 20, 0],
  [390, 844, 47, 34],
  [393, 852, 59, 34],
  [430, 932, 59, 34],
];
const TOOLBARS = 100;
const SEASONS = [
  ['cardium', 'summer', 0, 5],
  ['montney', 'spring', 1, 5],
  ['duvernay', 'winter', 2, 5],
];

async function openLevel(page, region, index) {
  await page.goto(ROOT + '?cover=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', p);
  }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.region-tab').nth(region).click();
  await page.locator('.level-btn').nth(index).click();
  await page.waitForSelector('.board .truck');
  await wait(700);
}

const measure = (page) =>
  page.evaluate(() => {
    const R = (s) => document.querySelector(s).getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const css = getComputedStyle(document.documentElement);
    const top = parseFloat(css.getPropertyValue('--safe-top')) || 0;
    const bottom = parseFloat(css.getPropertyValue('--safe-bottom')) || 0;
    const inside = (r) => r.top >= top - 0.5 && r.bottom <= vh - bottom + 0.5 && r.left >= -0.5 && r.right <= vw + 0.5;
    const board = R('.board');
    const hud = R('.hud');
    const controls = R('.controls');
    return {
      scrolls: document.documentElement.scrollHeight > vh + 1 || document.documentElement.scrollWidth > vw + 1,
      hud: inside(hud),
      board: inside(board),
      controls: inside(controls),
      buttons: [...document.querySelectorAll('.controls .btn')].every((b) => inside(b.getBoundingClientRect()) && b.getBoundingClientRect().height >= 44),
      square: Math.abs(board.width - board.height) < 1,
      boardW: Math.round(board.width),
      // The lease is as large as it can be: it fills the width (less the side gutters) or the height left over.
      large: board.width >= vw - 34 || board.height >= controls.top - hud.bottom - 40,
      order: hud.bottom <= board.top + 1 && board.bottom <= controls.top + 1,
      gates: document.querySelectorAll('.gate').length > 0 && [...document.querySelectorAll('.gate')].every((g) => inside(g.getBoundingClientRect())),
    };
  });

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();
  for (const [w, h, notch, home] of PHONES) {
    for (const mode of ['safari', 'app']) {
      const height = mode === 'safari' ? h - TOOLBARS : h;
      const context = await browser.newContext({ viewport: { width: w, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: engine === 'chromium' });
      const page = await context.newPage();
      await openLevel(page, 1, 5);
      // A home-screen app draws under the notch and the home bar: stand in for iOS's safe-area insets.
      if (mode === 'app') {
        await page.addStyleTag({ content: `:root { --safe-top: ${notch}px !important; --safe-bottom: ${home}px !important; }` });
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await wait(300);
      }
      const m = await measure(page);
      console.log(`${engine} ${w}x${h} ${mode} (viewport ${w}x${height}, lease ${m.boardW}px)`);
      check(!m.scrolls, 'no scrolling');
      check(m.hud && m.board && m.controls && m.buttons && m.gates, 'HUD, lease, gates and Undo/Hint/Restart are fully on screen, clear of the notch and home bar');
      check(m.square, 'the lease is square');
      check(m.large, 'the lease is as large as the screen allows');
      check(m.order, 'HUD above the lease, buttons below, nothing overlapping');
      if (engine === 'webkit') await page.screenshot({ path: join(OUT, `${TAG}${w}x${h}_${mode}.png`) });
      await context.close();
    }
  }
  if (engine === 'webkit') {
    for (const [name, season, region, index] of SEASONS) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
      const page = await context.newPage();
      await openLevel(page, region, index);
      await page.screenshot({ path: join(OUT, `${TAG}season_${season}_${name}.png`) });
      await page.locator('.board').screenshot({ path: join(OUT, `${TAG}season_${season}_${name}_lease.png`) });
      await context.close();
    }
  }
  await browser.close();
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll fit checks passed');
process.exit(failures ? 1 : 0);
