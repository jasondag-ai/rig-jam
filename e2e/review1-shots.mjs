// Before/after screenshots for Manus review #1's shell fixes (WebKit, 390x844), saved to OUT
// (default ~/Desktop/RHR Art Inbox/fit_check) as review1_<TAG>_*.png. Run it with TAG=before on the
// old build and TAG=after on the new one. Dev server up: TAG=after node e2e/review1-shots.mjs
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DAILY_LEVELS, REGIONS } from '../src/levels/regions.ts';
import { dayKey, padLevelIndex, padNumber } from '../src/ui/daily.ts';
import { solve } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
const TAG = process.env.TAG ?? 'after';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await webkit.launch();
const fresh = async (width = 390, height = 844) => {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', p);
  }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(400);
  return page;
};
const enter = async (page, region, index) => {
  await page.locator('.region-tab').nth(region).click();
  await page.locator('.level-btn').nth(index).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(800);
};
const shot = (page, name, clip) => page.screenshot({ path: join(OUT, `review1_${TAG}_${name}.png`), ...(clip ? { clip } : {}) });
const pad = (b, m) => ({ x: Math.max(0, b.x - m), y: Math.max(0, b.y - m), width: b.width + m * 2, height: b.height + m * 2 });
async function play(page, level, moves) {
  const cell = await page.$eval('.board', (el) => parseFloat(el.style.getPropertyValue('--cell')));
  for (const m of moves) {
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
    await wait(420);
  }
}

// 1. The Zero Incident ribbon, on the level card and the Daily Pad card.
for (const [name, level, open] of [
  ['level', REGIONS[0].levels[2], (p) => enter(p, 0, 2)],
  ['daily', DAILY_LEVELS[padLevelIndex(padNumber(dayKey(new Date())), DAILY_LEVELS.length)], async (p) => { await p.locator('.daily-btn').click(); await p.waitForSelector('.board .truck.sprite-on'); await wait(800); }],
]) {
  const page = await fresh();
  await open(page);
  await play(page, level, solve(level));
  await page.waitForSelector('.win:not([hidden]) .card');
  await wait(2600);
  await shot(page, `ribbon_${name}`, pad(await page.locator('.win .zero-incident').boundingBox(), 26));
  if (name === 'level') await shot(page, 'win_card');
  await page.context().close();
}

// 2. Worn lanes on a heavily played board: every move of each region's longest level but the last
// (the board is still live), then two undos.
for (const [i, region] of REGIONS.entries()) {
  const level = region.levels[9];
  const page = await fresh();
  await enter(page, i, 9);
  await play(page, level, solve(level).slice(0, -1));
  await page.locator('[data-act="undo"]').click();
  await wait(300);
  await page.locator('[data-act="undo"]').click();
  await wait(600);
  await page.locator('.board').screenshot({ path: join(OUT, `review1_${TAG}_wear_${region.id}.png`) });
  // 6. Undo, enabled, with the other two buttons for comparison.
  if (i === 0) await shot(page, 'undo_button', pad(await page.locator('.controls').boundingBox(), 8));
  await page.context().close();
}

// 3. The near-miss counter in the HUD, at 375 and 390 wide, after one bump.
for (const w of [375, 390]) {
  const page = await fresh(w, w === 375 ? 667 : 844);
  await enter(page, 0, 3);
  await shot(page, `hud_${w}`, { x: 0, y: 0, width: w, height: 84 });
  await page.context().close();
}

// 4. Equipment beside a gate: Montney 5 (a wellhead by a right-hand gate, a pumpjack under a top
// gate) and Montney 8 (a flare by a right-hand gate, a wellhead under a top gate).
for (const index of [4, 7]) {
  const page = await fresh();
  await enter(page, 1, index);
  await page.locator('.board').screenshot({ path: join(OUT, `review1_${TAG}_gates_montney_${index + 1}.png`) });
  await page.context().close();
}

// 5. Settings: Reset progress beside Done.
{
  const page = await fresh();
  await page.locator('.gear').click();
  await wait(500);
  await shot(page, 'settings');
  await page.context().close();
}
await browser.close();
console.log(`saved review1_${TAG}_*`);
