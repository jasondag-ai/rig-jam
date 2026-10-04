// Equipment screenshots and a clip (WebKit, 390x844): levels showing every equipment kind (tank,
// pumpjack, wellhead, flare stack) in mud and snow, close-ups of each kind, and a 4-second clip of a
// pumpjack pumping and a flare flickering. Saved to OUT (default ~/Desktop/RHR Art Inbox/fit_check)
// as equip_*. Run with the dev server up: node e2e/equip-shots.mjs
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const open = async (context, region, index) => {
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', p);
  }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.region-tab').nth(region).click();
  await page.locator('.level-btn').nth(index).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(800);
  return page;
};
const browser = await webkit.launch();
const done = new Set();
for (const [name, region, index] of [['montney_7', 1, 6], ['montney_8', 1, 7], ['montney_10', 1, 9], ['duvernay_8', 2, 7], ['duvernay_10', 2, 9]]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await open(context, region, index);
  await page.screenshot({ path: join(OUT, `equip_${name}.png`) });
  // A close-up of each kind, the first time it turns up in mud and in snow.
  for (const ob of await page.locator('.obstacle').all()) {
    const kind = (await ob.getAttribute('class')).split(' ')[1];
    const key = `${kind}_${region === 1 ? 'mud' : 'snow'}`;
    if (done.has(key)) continue;
    done.add(key);
    const b = await ob.locator('svg.equip').boundingBox();
    await page.screenshot({ path: join(OUT, `equip_closeup_${key}.png`), clip: { x: Math.max(0, b.x - 14), y: b.y - 14, width: b.width + 28, height: b.height + 28 } });
  }
  console.log(name, [...done].join(' '));
  await context.close();
}
// The clip: Montney 8 (a pumpjack and a flare), recorded for a little over 4 seconds of play.
{
  const dir = join(OUT, 'equip_clip_tmp');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, recordVideo: { dir, size: { width: 390, height: 844 } } });
  const page = await open(context, 1, 7);
  await wait(4300);
  const video = page.video();
  await context.close();
  renameSync(await video.path(), join(OUT, 'equip_clip_pumpjack_flare.webm'));
  rmSync(dir, { recursive: true, force: true });
  console.log('clip saved');
}
await browser.close();
