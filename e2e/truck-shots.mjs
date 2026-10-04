// Screenshots for judging truck art: in each region, the level with the most 3-cell trucks, at
// 390x844 (full screen and a lease close-up). Saved to OUT (default ~/Desktop/RHR Art Inbox/fit_check)
// as trucks_<region>.png and trucks_<region>_lease.png.
// Run: npm run dev -- --host   (in one terminal), then:  node e2e/truck-shots.mjs
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const browser = await webkit.launch();
for (const [ri, region] of REGIONS.entries()) {
  const long = region.levels.map((l) => l.trucks.filter((t) => t.length === 3).length);
  const index = long.indexOf(Math.max(...long));
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  await page.goto(ROOT + '?cover=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', p);
  }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.region-tab').nth(ri).click();
  await page.locator('.level-btn').nth(index).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: join(OUT, `trucks_${region.id}.png`) });
  await page.locator('.board').screenshot({ path: join(OUT, `trucks_${region.id}_lease.png`) });
  console.log(`${region.name} ${index + 1}: ${long[index]} three-cell trucks`);
  await context.close();
}
await browser.close();
