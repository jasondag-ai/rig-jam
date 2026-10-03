// Cover test (Playwright, Chromium with real touch events). The title screen: hero image filling the
// phone, title in the sky at the top, TAP TO START near the bottom, one tap into the level list (no
// ghost click), never shown between levels, a sky fallback if the image is slow, still under reduced
// motion. Automated browsers skip the cover unless the URL says ?cover=1.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:cover
import { UNLOCKED } from './progress.mjs';
import { chromium, devices } from 'playwright';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

const browser = await chromium.launch();
const run = async (viewport, reducedMotion = 'no-preference') => {
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport, reducedMotion });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const tap = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  return { context, page, tap };
};

// The image itself.
{
  const { context, page } = await run({ width: 390, height: 844 });
  await page.goto(ROOT + '?cover=1', { waitUntil: 'networkidle' });
  const img = await page.evaluate(async () => {
    const res = await fetch('./cover.webp');
    const blob = await res.blob();
    const el = document.querySelector('.cover-img');
    return { type: blob.type, bytes: blob.size, w: el.naturalWidth, h: el.naturalHeight };
  });
  check(img.bytes < 300_000 && img.w === 1080 && img.h === 1920 && /webp/.test(img.type), `cover.webp: ${img.w}x${img.h}, ${Math.round(img.bytes / 1024)} KB, ${img.type}`);
  await context.close();
}

for (const viewport of [{ width: 375, height: 667 }, { width: 375, height: 553 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
  console.log(`\n${viewport.width}x${viewport.height}`);
  const { context, page, tap } = await run(viewport);
  await page.goto(ROOT + '?cover=1', { waitUntil: 'networkidle' });
  await page.evaluate((p) => localStorage.setItem('rush-hour-rigs:v2', p), UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(1200);
  const g = await page.evaluate(() => {
    const R = (s) => document.querySelector(s).getBoundingClientRect();
    const img = R('.cover-img');
    return {
      cls: document.querySelector('.screen.cover')?.className,
      fills: img.left <= 0 && img.top <= 0 && img.right >= innerWidth && img.bottom >= innerHeight,
      fit: getComputedStyle(document.querySelector('.cover-img')).objectFit,
      title: R('.cover-title'),
      start: R('.cover-start'),
      font: getComputedStyle(document.querySelector('.cover-title')).fontFamily,
      text: document.querySelector('.cover-title').textContent.replace(/\s+/g, ' ').trim(),
      anims: document.getAnimations().map((a) => a.animationName).filter(Boolean),
      vw: innerWidth,
      vh: innerHeight,
    };
  });
  check(/image/.test(g.cls) && g.fills && g.fit === 'cover', `the image fills the screen, cropped to fit (${g.cls})`);
  check(g.text === 'RUSH HOURRIGS' || g.text === 'RUSH HOUR RIGS', `title "${g.text}" in ${g.font.split(',')[0]}`);
  check(g.title.top >= 0 && g.title.bottom < g.vh * 0.32 && g.title.left >= 0 && g.title.right <= g.vw, `title in the sky at the top (${Math.round(g.title.top)}..${Math.round(g.title.bottom)} of ${g.vh})`);
  check(g.start.top > g.vh * 0.72 && g.start.bottom <= g.vh, `TAP TO START near the bottom (${Math.round(g.start.top)} of ${g.vh})`);
  check(['title-slam', 'cover-push', 'cloud-drift', 'start-pulse'].every((n) => g.anims.includes(n)), `slam, push-in, clouds, pulse (${[...new Set(g.anims)].join(', ')})`);
  // One tap, anywhere, gets you in; the tap doesn't fall through onto a level button.
  await tap(g.vw / 2, g.vh * 0.45);
  await wait(700);
  const after = await page.evaluate(() => ({ list: !!document.querySelector('.screen.levels'), game: !!document.querySelector('.screen.game'), cover: !!document.querySelector('.screen.cover') }));
  check(after.list && !after.game && !after.cover, 'one tap: the level list (no ghost tap into a level)');
  // Never between levels.
  await page.$eval('.level-btn[data-index="0"]', (b) => b.click());
  await wait(300);
  await page.$eval('.hud [data-act="levels"]', (b) => b.click());
  await wait(300);
  check(!(await page.$('.screen.cover')) && !!(await page.$('.screen.levels')), 'into a level and back: no cover');
  // Every new open.
  await page.reload({ waitUntil: 'networkidle' });
  check(!!(await page.$('.screen.cover')), 'opening the app again: the cover');
  await context.close();
}

// A slow image never holds the game up.
{
  console.log('\nslow image');
  const { context, page, tap } = await run({ width: 390, height: 844 });
  await page.route('**/cover.webp', async (route) => {
    await wait(2500);
    await route.continue();
  });
  const t0 = Date.now();
  await page.goto(ROOT + '?cover=1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.screen.cover.no-image', { timeout: 3000 }).catch(() => {});
  const at = Date.now() - t0;
  const fb = await page.evaluate(() => ({ cls: document.querySelector('.screen.cover')?.className, sky: getComputedStyle(document.querySelector('.cover-sky')).backgroundImage, title: getComputedStyle(document.querySelector('.cover-title')).visibility }));
  check(/no-image/.test(fb.cls ?? '') && /gradient/.test(fb.sky) && fb.title === 'visible' && at < 2200, `after a second: the title over a sky gradient (${Math.round(at)}ms after opening)`);
  await tap(195, 420);
  await wait(500);
  check(!!(await page.$('.screen.levels')), 'and one tap still gets you in');
  await context.close();
}

// Reduced motion: no slam, push-in, drift or pulse.
{
  console.log('\nreduced motion');
  const { context, page } = await run({ width: 390, height: 844 }, 'reduce');
  await page.goto(ROOT + '?cover=1', { waitUntil: 'networkidle' });
  await wait(300);
  const anims = await page.evaluate(() => document.getAnimations().map((a) => a.animationName).filter(Boolean));
  check(anims.length === 0, `nothing moves (${anims.join(', ') || 'still'})`);
  check(await page.$eval('.cover-title', (t) => t.getBoundingClientRect().height > 40), 'the title is there');
  await context.close();
}

// Preview links and automated runs go straight in.
{
  console.log('\nskipping the cover');
  const { context, page } = await run({ width: 390, height: 844 });
  await page.goto(ROOT + '?gag=gopher', { waitUntil: 'networkidle' });
  check(!(await page.$('.screen.cover')) && !!(await page.$('.screen.game')), '?gag= links open straight into the scene');
  await context.close();
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
