// SAME START, SAME END (GAME_BIBLE, Oct 5), for every strip puppet gag: its FIRST frame and its LAST
// frame show no character on screen, only the permanent props. Judged by pixels in WebKit: each gag
// is held at t = 0 and at the end of its run (`?gagtest=1`, `window.__rhrGag`), and
//   - the first frame must look exactly like the level just before the gag (nobody appears by magic)
//   - the last frame must look exactly like the level just after it (nobody vanishes by magic)
//   - and, to be sure the test sees the gag at all, the middle of its run must look different.
// (The magpie, the sleepy worker and the moose run on their own clocks; their first and last
// poses are checked in the unit tests.) Run with the dev server up: npm run test:e2e:frames
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { PREVIEWS } from '../src/ui/gag-triggers.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const OWN_CLOCK = ['magpie', 'worker', 'moose'];
const browser = await webkit.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));

/** How many pixels differ between two screenshots (any channel by more than 18), and where. */
const diff = (a, b) =>
  page.evaluate(async ([x, y]) => {
    // The biffy's door indicator is a prop's light, not a character: Biffy B begins with it red (somebody is in there).
    const ind = document.querySelector('.biffy-layer .ind')?.getBoundingClientRect();
    const light = (px, py) => !!ind && px >= ind.left - 3 && px <= ind.right + 3 && py >= ind.top - 3 && py <= ind.bottom + 3;
    const load = async (b64) => { const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, c.width, c.height); };
    const [p, q] = [await load(x), await load(y)];
    let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let i = 0; i < p.data.length; i += 4) {
      if (Math.abs(p.data[i] - q.data[i]) > 18 || Math.abs(p.data[i + 1] - q.data[i + 1]) > 18 || Math.abs(p.data[i + 2] - q.data[i + 2]) > 18) {
        const px = (i / 4) % p.width, py = Math.floor(i / 4 / p.width);
        if (light(px, py)) continue;
        n++;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
    }
    return { n, box: n ? `${x0},${y0} to ${x1},${y1}` : '' };
  }, [a.toString('base64'), b.toString('base64')]);

console.log('\nwebkit 390x844: every strip gag starts and ends on an empty stage');
for (const [name, { gag, region, level }] of Object.entries(PREVIEWS)) {
  if (OWN_CLOCK.includes(gag)) continue;
  await page.goto(ROOT + '?cover=0&gagtest=1&night=0&magpie=0&worker=0&moose=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.region-tab').nth(REGIONS.findIndex((r) => r.id === region)).click();
  await page.locator('.level-btn').nth(level - 1).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(700);
  const before = await page.screenshot();
  const end = await page.evaluate((g) => window.__rhrGag.end(g), gag);
  const held = await page.evaluate((g) => window.__rhrGag.hold(g, 0), gag);
  if (!held) { check(false, `${name}: could not be set on this level`); continue; }
  await wait(60);
  const first = await page.screenshot();
  await page.evaluate(([g, t]) => window.__rhrGag.hold(g, t), [gag, end * 0.5]);
  await wait(60);
  const middle = await page.screenshot();
  await page.evaluate(([g, t]) => window.__rhrGag.hold(g, t), [gag, end]);
  await wait(60);
  const last = await page.screenshot();
  await page.evaluate((g) => window.__rhrGag.release(g), gag);
  await wait(60);
  const after = await page.screenshot();
  const [a, m, z] = [await diff(before, first), await diff(before, middle), await diff(last, after)];
  check(m.n > 150, `${name}: the gag is on screen in the middle of its run (${m.n} px differ)`);
  check(a.n <= 6, `${name}: its first frame is the level as it stood: no character on screen (${a.n} px differ${a.box ? ` at ${a.box}` : ''})`);
  check(z.n <= 6, `${name}: its last frame is the level as it is left: no character on screen (${z.n} px differ${z.box ? ` at ${z.box}` : ''})`);
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
