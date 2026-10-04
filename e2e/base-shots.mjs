// Base-game screenshots in WebKit at 390x844, saved to OUT (default ~/Desktop/RHR Art Inbox/fit_check)
// as base_*: one level and the level list per region, the main page (a new player's), a win card, a
// truck parked beside a flare stack, and a flare stack next to the berm in Duvernay.
// Run with the dev server up: node e2e/base-shots.mjs
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { solve } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await webkit.launch();
const fresh = async (progress) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
  await page.evaluate((p) => {
    localStorage.clear();
    if (p) localStorage.setItem('rush-hour-rigs:v2', p);
  }, progress);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(400);
  return page;
};
const enter = async (page, region, index) => {
  await page.locator('.region-tab').nth(region).click();
  await page.locator('.level-btn').nth(index).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(900);
};
const shot = (page, name, clip) => page.screenshot({ path: join(OUT, `base_${name}.png`), ...(clip ? { clip } : {}) });
/** A close-up round an obstacle of a kind: its cell and the cells round it. */
const around = async (page, kind) => {
  const b = await page.locator(`.obstacle.${kind} svg.equip`).first().boundingBox();
  const cell = b.width;
  return { x: Math.max(0, b.x - cell * 1.6), y: Math.max(0, b.y - cell * 1.2), width: Math.min(390, cell * 4.2), height: cell * 3.6 };
};

// The main page as a new player sees it (intro, locked rows and regions).
let page = await fresh(null);
await shot(page, 'main_page');
await page.context().close();

// Level lists and one level per region.
page = await fresh(UNLOCKED);
for (const [i, region] of REGIONS.entries()) {
  await page.locator('.region-tab').nth(i).click();
  await wait(400);
  await shot(page, `list_${region.id}`);
}
await page.context().close();
for (const [i, region, index] of [[0, 'cardium', 5], [1, 'montney', 6], [2, 'duvernay', 7]]) {
  page = await fresh(UNLOCKED);
  await enter(page, i, index);
  await shot(page, `level_${region}`);
  await page.context().close();
}

// A truck parked beside a flare stack (Montney 8), and a flare next to the berm (Duvernay 10).
page = await fresh(UNLOCKED);
await enter(page, 1, 7);
await shot(page, 'flare_beside_truck', await around(page, 'flare'));
await page.context().close();
page = await fresh(UNLOCKED);
await enter(page, 2, 9);
await shot(page, 'flare_by_berm_duvernay', await around(page, 'flare'));
await page.context().close();

// A win card: Cardium 3 solved at par.
page = await fresh(UNLOCKED);
await enter(page, 0, 2);
const level = REGIONS[0].levels[2];
const cell = await page.$eval('.board', (el) => parseFloat(el.style.getPropertyValue('--cell')));
for (const m of solve(level)) {
  const t = level.trucks.find((x) => x.id === m.id);
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
await wait(2600);
await shot(page, 'win_card');
await browser.close();
console.log('saved base_* screenshots');
