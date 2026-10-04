// Screenshots for judging the board's look: two Duvernay levels and one each of Cardium and
// Montney at 390x844 (full screen and a lease close-up), plus Duvernay with the block heater cords
// showing (they belong to the gag layer, which is off, so that one opens with ?gags=1).
// Saved to OUT (default ~/Desktop/RHR Art Inbox/fit_check) as <PREFIX><name>.png (PREFIX default winter_).
// Run: npm run dev -- --host   (in one terminal), then:  node e2e/board-shots.mjs
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
const PREFIX = process.env.PREFIX ?? 'winter_';
mkdirSync(OUT, { recursive: true });
const SHOTS = [
  ['duvernay_3', 2, 2, ''],
  ['duvernay_10', 2, 9, ''],
  ['cardium_6', 0, 5, ''],
  ['montney_6', 1, 5, ''],
  ['duvernay_3_cords', 2, 2, '&gags=1&wild=0'],
];
const browser = await webkit.launch();
for (const [name, region, index, query] of SHOTS) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(`${ROOT}?cover=0${query}`, { waitUntil: 'networkidle' });
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', p);
  }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.region-tab').nth(region).click();
  await page.locator('.level-btn').nth(index).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: join(OUT, `${PREFIX}${name}.png`) });
  await page.locator('.board').screenshot({ path: join(OUT, `${PREFIX}${name}_lease.png`) });
  console.log(name);
  await context.close();
}
await browser.close();
