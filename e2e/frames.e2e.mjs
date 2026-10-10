// SAME START, SAME END (GAME_BIBLE, Oct 5), for every strip puppet gag: its FIRST frame and its LAST
// frame show no character on screen, only the permanent props. Judged by pixels in WebKit: each gag
// is held at t = 0 and at the end of its run (`?gagtest=1`, `window.__rhrGag`), and
//   - the first frame must look exactly like the level just before the gag (nobody appears by magic)
//   - the last frame must look exactly like the level just after it (nobody vanishes by magic)
//   - and the last frame must look exactly like the level BEFORE the gag: every prop is back as it
//     began (the biffy's door indicator its starting colour, the cow grazing in her spot)
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
// (`VIEW=390x664` checks at another size, Safari's visible area for one.)
const [VW, VH] = (process.env.VIEW ?? '390x844').split('x').map(Number);
const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));

/** How many pixels differ between two screenshots (any channel by more than 18), and where. */
let diff = (a, b) =>
  page.evaluate(async ([x, y]) => {
    const load = async (b64) => { const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, c.width, c.height); };
    const [p, q] = [await load(x), await load(y)];
    let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let i = 0; i < p.data.length; i += 4) {
      if (Math.abs(p.data[i] - q.data[i]) > 18 || Math.abs(p.data[i + 1] - q.data[i + 1]) > 18 || Math.abs(p.data[i + 2] - q.data[i + 2]) > 18) {
        const px = (i / 4) % p.width, py = Math.floor(i / 4 / p.width);
        n++;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
    }
    return { n, box: n ? `${x0},${y0} to ${x1},${y1}` : '' };
  }, [a.toString('base64'), b.toString('base64')]);

/** A frame, as two shots in a row: WebKit draws a one pixel sliver at a gate badge's edge in every
 *  other screenshot, so two frames are compared by their best matching pair. */
const shot = async () => [await page.screenshot(), await page.screenshot()];
const pair = diff;
diff = async (a, b) => {
  let best = null;
  for (const x of a) for (const y of b) { const d = await pair(x, y); if (!best || d.n < best.n) best = d; }
  return best;
};

console.log('\nwebkit 390x844: every strip gag starts and ends on an empty stage');
// (Baldonnel, region 7, has no sightings of its own yet: the strip gags every region shares are held on ITS standard scene.)
const CASES = [...Object.entries(PREVIEWS), ...['landowner', 'biffyA', 'biffyB', 'sam', 'geese'].map((gag) => [`${gag} on Baldonnel`, { gag, region: 'baldonnel', level: 1 }])];
for (const [name, { gag, region, level }] of CASES) {
  if (OWN_CLOCK.includes(gag)) continue;
  // (`REGION=baldonnel` holds one region's.)
  if (process.env.REGION && process.env.REGION !== region) continue;
  // (Aurora Howl plays at night only: its level is pinned to night; with reduced motion nothing in the night sky moves.)
  await page.goto(ROOT + `?cover=0&gagtest=1&night=${gag === 'aurora' ? 1 : 0}&magpie=0&worker=0&moose=0`, { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.region-tab').nth(REGIONS.findIndex((r) => r.id === region)).click();
  await page.locator('.level-btn').nth(level - 1).click();
  await page.waitForSelector('.board .truck.sprite-on');
  // Everything on the board settled first (season coats and other images arrive after the sprites).
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; }))));
  await wait(1500);
  const before = await shot();
  const end = await page.evaluate((g) => window.__rhrGag.end(g), gag);
  const held = await page.evaluate((g) => window.__rhrGag.hold(g, 0), gag);
  if (!held) { check(false, `${name}: could not be set on this level`); continue; }
  await wait(60);
  const first = await shot();
  await page.evaluate(([g, t]) => window.__rhrGag.hold(g, t), [gag, end * 0.5]);
  await wait(60);
  let middle = await shot();
  // (Half way through Half Dressed the hare is hiding, all but one eye, and the worker has not come in yet: that is the
  // gag. Where the half-way frame shows next to nothing, a frame a third of the way in is looked at as well.)
  if ((await diff(before, middle)).n <= 150) { await page.evaluate(([g, t]) => window.__rhrGag.hold(g, t), [gag, end * 0.3]); await wait(60); middle = await shot(); }
  await page.evaluate(([g, t]) => window.__rhrGag.hold(g, t), [gag, end]);
  await wait(60);
  const last = await shot();
  await page.evaluate((g) => window.__rhrGag.release(g), gag);
  await wait(60);
  const after = await shot();
  const [a, m, z, same] = [await diff(before, first), await diff(before, middle), await diff(last, after), await diff(before, last)];
  check(m.n > 150, `${name}: the gag is on screen in the middle of its run (${m.n} px differ)`);
  check(a.n <= 6, `${name}: its first frame is the level as it stood: no character on screen (${a.n} px differ${a.box ? ` at ${a.box}` : ''})`);
  check(same.n <= 6, `${name}: SAME START, SAME END: its last frame looks exactly like the level before it began, props and all (${same.n} px differ${same.box ? ` at ${same.box}` : ''})`);
  check(z.n <= 6, `${name}: its last frame is the level as it is left: no character on screen (${z.n} px differ${z.box ? ` at ${z.box}` : ''})`);
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
