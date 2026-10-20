// THE PAGE'S CANVAS IS THE SKY (job U24). On an iPhone the status bar lies over the page's own canvas (`html`'s
// background); iOS 26 blurs the edge between them, so the canvas must be the colour of the top of the screen below it.
//  - WebKit at iPhone DPR 3, 390 x 844 and 390 x 664: a level of Cardium, Duvernay and Baldonnel, by day and with the
//    night fully down: the canvas colour against the screen's top rows at its two edges and its middle (no step);
//    the top 60 pt of each edge column changes only gradually until something stands there (no band)
//  - body is the same colour (iOS 26 colours the status bar from body); the theme-color meta too; the cover puts
//    them back to the fallback
//  - the desktop letterbox at 1440 x 900: pixel for pixel what `BASE=` (default the live site) shows
// Needs the dev server (URL=, default 5173).
import { webkit } from 'playwright';
import { outDir } from './out.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const BASE = process.env.BASE ?? 'https://jasondag-ai.github.io/rig-jam/';
const OUT = outDir('page-sky');
const QUIET = 'cover=0&magpie=0&worker=0&moose=0&soundnudge=0&tourists=0&surveyor=0&lunch=0&off=nearmiss,landowner,biffya,biffyb,sam,geese,tumbleweed,cattrain,bale,bell,pea,mosquito,overweight';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
const browser = await webkit.launch();

/** The screenshot's pixels, read in the page itself: rows of RGB down a column (CSS px; the DPR is taken out). */
async function columns(page, xs, rows) {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async ([png, xs, rows]) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const k = img.width / innerWidth;
    return xs.map((x) => Array.from({ length: rows }, (_, y) => [...g.getImageData(Math.min(img.width - 1, Math.round(x * k)), Math.round(y * k), 1, 1).data.slice(0, 3)]));
  }, [png, xs, rows]);
}
const rgb = (s) => s.match(/\d+/g).slice(0, 3).map(Number);
const diff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

for (const [W, H] of [[390, 844], [390, 664]]) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  for (const [ri, name] of [[0, 'Cardium'], [2, 'Duvernay'], [6, 'Baldonnel']]) {
    for (const night of [false, true]) {
      console.log(`\nwebkit ${W} x ${H}: ${name} ${night ? 'at night' : 'by day'}`);
      await page.goto(`${ROOT}?demo=1&${QUIET}&night=${night ? 1 : 0}`, { waitUntil: 'networkidle' });
      await page.locator('.region-tab').nth(ri).evaluate((t) => t.click());
      await wait(300);
      await page.locator('.level-btn').nth(2).click();
      await page.waitForSelector('.board .truck.sprite-on');
      await wait(night ? 4600 : 700);
      const canvas = await page.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor, html: getComputedStyle(document.documentElement).backgroundColor, meta: document.querySelector('meta[name="theme-color"]').content, transition: document.documentElement.style.transition }));
      const want = rgb(canvas.html);
      const hex = '#' + want.map((v) => v.toString(16).padStart(2, '0')).join('');
      // (iOS 26 takes the status bar's colour from body: Jay's iPhone, Oct 19. On a phone body is the sky too.)
      check(canvas.body === canvas.html, `body is the same colour as the canvas (${canvas.body}): iOS 26 colours the status bar from it`);
      check(canvas.meta.toLowerCase() === hex, `theme-color ${canvas.meta} is the canvas's own colour (${hex})`);
      const cols = await columns(page, [1, W / 2, W - 2], 60);
      // THE TOP ROW, ACROSS: in the middle it is the canvas's own colour. Towards the sides the game's own soft
      // vignette (style.css `.vignette`, 20% at the very corner) darkens it a little: that is checked to be a smooth
      // fall-off across the width, not a step.
      const mid = diff(cols[1][0], want);
      check(mid <= 3, `no step from the canvas (${hex}) into the top of the screen, in the middle: ${mid} of 255`);
      const across = (await columns(page, Array.from({ length: 40 }, (_, i) => (i * W) / 39 - (i === 39 ? 1 : 0)), 1)).map((c) => c[0]);
      const jump = Math.max(...across.slice(1).map((c, i) => diff(c, across[i])));
      const edge = Math.max(diff(across[0], want), diff(across.at(-1), want));
      check(jump <= 6 && edge <= Math.max(36, Math.round(Math.max(...want) * 0.2) + 3), `across the top row, out to the edges: a smooth fall-off (the biggest step between samples 10 px apart ${jump} of 255; the vignette's ${edge} at the very corner)`);
      // Down each edge column: the sky changes gradually; the first big jump is something standing in it (a tree, a peak, the HUD).
      const runs = cols.filter((_, i) => i !== 1).map((col) => { let y = 1; while (y < col.length && diff(col[y], col[y - 1]) <= 6) y++; return y; });
      check(runs.every((y) => y >= 6), `the sky runs smoothly down from the top at both edges (${runs.join(' and ')} pt before anything stands in it)`);
      await page.screenshot({ path: `${OUT}/${name.toLowerCase()}_${night ? 'night' : 'day'}_${W}x${H}.png`, clip: { x: 0, y: 0, width: W, height: 120 } });
    }
  }
  // The cover has no theme: the canvas and the theme-color go back to their fallbacks.
  await page.goto(`${ROOT}?cover=1&${QUIET}`, { waitUntil: 'networkidle' });
  await wait(500);
  const cover = await page.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor, html: getComputedStyle(document.documentElement).backgroundColor, inline: document.documentElement.style.getPropertyValue('--sky-top'), meta: document.querySelector('meta[name="theme-color"]').content }));
  check(cover.body === cover.html, `the cover: body is the canvas's colour too (${cover.body})`);
  check(cover.inline === '' && cover.meta === '#4fb0ff' && cover.html === 'rgb(79, 176, 255)', `the cover: the fallback sky (${cover.html}, theme-color ${cover.meta})`);
  check(errors.length === 0, `no errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
  await context.close();
}

// THE DESKTOP LETTERBOX: the same pixels as before, beside the 560 px column, on the list and in a level.
console.log('\nwebkit 1440 x 900: the letterbox');
const shots = {};
for (const [who, root] of [['base', BASE], ['this', ROOT]]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${root}?demo=1&${QUIET}&night=0`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.region-tab');
  await wait(500);
  const col = await page.evaluate(() => { const r = document.querySelector('#app').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; });
  shots[who] = { col, list: (await page.screenshot({ clip: { x: 0, y: 0, width: col[0], height: 900 } })).toString('base64'), right: (await page.screenshot({ clip: { x: col[1], y: 0, width: 1440 - col[1], height: 900 } })).toString('base64') };
  await page.locator('.level-btn').nth(0).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(600);
  shots[who].level = (await page.screenshot({ clip: { x: 0, y: 0, width: col[0], height: 900 } })).toString('base64');
  await context.close();
}
check(JSON.stringify(shots.base.col) === JSON.stringify(shots.this.col), `the column stands where it did (${shots.this.col.join(' to ')} px)`);
check(shots.base.list === shots.this.list && shots.base.right === shots.this.right && shots.base.level === shots.this.level, 'the letterbox either side of the column: pixel for pixel the same as before (the list and a level)');
await browser.close();
console.log(failures ? `\nFAILED: ${failures}` : '\nPASS');
process.exit(failures ? 1 : 0);
