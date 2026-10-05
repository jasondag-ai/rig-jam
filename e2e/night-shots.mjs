// Three levels at night (pinned with ?night=1; one left idle until night falls and the nudge comes) and by day
// (WebKit, 390x844), saved as night_*.png.
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
    const q = `?cover=0&magpie=0&worker=0&off=lunch,tongue,sam${day ? '&night=0' : nudge ? '&idle=0.04' : '&night=1'}`;
    await page.goto(ROOT + q, { waitUntil: 'networkidle' });
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(REGIONS.findIndex((r) => r.id === region)).click();
    await page.locator('.level-btn').nth(li).click();
    await page.waitForSelector('.board .truck.sprite-on');
    // Night pinned on (or, for the nudge shot, fallen by itself after an idle spell): wait out the 4 s fade.
    await page.waitForTimeout(day ? 700 : 4600);
    if (nudge && !day) await page.waitForSelector('.bubble[data-nudge]', { timeout: 12000 });
    await page.waitForTimeout(300);
    const name = `night_${region}${li + 1}_${day ? 'day' : nudge ? 'night_nudge' : 'night'}.png`;
    await page.screenshot({ path: join(OUT, name) });
    console.log('saved', name);
    await context.close();
  }
}
await browser.close();
