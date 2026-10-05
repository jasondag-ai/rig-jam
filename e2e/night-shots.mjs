// Night levels by night and by day (WebKit, 390x844), one with the nudge bubble, saved as night_*.png.
// Run with the dev server up: node e2e/night-shots.mjs
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const SHOTS = [['montney', 1, false], ['montney', 7, true], ['duvernay', 3, false]];
const browser = await webkit.launch();
for (const [region, li, nudge] of SHOTS) {
  for (const day of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
    const page = await context.newPage();
    const q = `?cover=0&magpie=0&worker=0${day ? '&night=0' : nudge ? '&idle=0.04' : ''}`;
    await page.goto(ROOT + q, { waitUntil: 'networkidle' });
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(REGIONS.findIndex((r) => r.id === region)).click();
    await page.locator('.level-btn').nth(li).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await page.waitForTimeout(700);
    if (nudge && !day) await page.waitForSelector('.bubble[data-nudge]', { timeout: 8000 });
    await page.waitForTimeout(300);
    const name = `night_${region}${li + 1}_${day ? 'day' : nudge ? 'night_nudge' : 'night'}.png`;
    await page.screenshot({ path: join(OUT, name) });
    console.log('saved', name);
    await context.close();
  }
}
await browser.close();
