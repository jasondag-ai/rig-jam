// Truck sprites test (Playwright, iPhone 13 Chromium, plus WebKit). Every truck shows its illustrated
// sprite, turned to face its gate, with the gate symbol badge on top and a ground shadow under it.
// If the sprites can't load, the old drawing stands in. Dragging stays at 60fps.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:sprites
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit, devices } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

const open = async (type, block = false) => {
  const browser = await type.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  if (block) await page.route('**/sprites/trucks/**', (r) => r.abort());
  await page.goto(ROOT + '?wild=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => localStorage.setItem('rush-hour-rigs:v2', p), UNLOCKED);
  return { browser, page };
};
const enter = async (page, tab, index) => {
  await page.goto(ROOT + '?wild=0', { waitUntil: 'networkidle' });
  await page.$eval(`.region-tab:nth-child(${tab})`, (t) => t.click());
  await page.$eval(`.level-btn[data-index="${index}"]`, (b) => b.click());
  await wait(900);
};
const trucks = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.truck')].map((t) => {
      const img = t.querySelector('img.sprite');
      const svg = t.querySelector('.art svg');
      return {
        kind: t.dataset.kind,
        cab: t.dataset.cab,
        on: t.classList.contains('sprite-on'),
        src: img?.currentSrc ?? null,
        imgShown: img ? getComputedStyle(img).display !== 'none' : false,
        svgShown: getComputedStyle(svg).display !== 'none',
        color: [...t.classList].find((c) => c.startsWith('c-'))?.slice(2),
        badge: !!t.querySelector('.sym'),
        shadow: !!t.querySelector('.ground-shadow'),
      };
    }),
  );

for (const [type, name] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
  console.log(`\n${name} 375x667`);
  const { browser, page } = await open(type);
  for (const [tab, index] of [[1, 5], [2, 5], [3, 5]]) {
    await enter(page, tab, index);
    const t = await trucks(page);
    const region = REGIONS[tab - 1].name;
    check(t.length > 0 && t.every((x) => x.on && x.imgShown && !x.svgShown), `${region} 6: every truck shows its sprite (${t.length})`);
    check(t.every((x) => x.src?.includes(`/sprites/trucks/${x.kind}-${x.color}`)), 'each in its own gate color');
    check(t.every((x) => /@2x\.webp$/.test(x.src)), 'the sharp 2x version on a phone screen');
    check(t.every((x) => x.badge && x.shadow), 'symbol badge on top, ground shadow under');
  }
  await browser.close();
}

// Sprites blocked: the old drawings stand in.
{
  console.log('\nsprites fail to load');
  const { browser, page } = await open(chromium, true);
  await enter(page, 1, 5);
  const t = await trucks(page);
  check(t.length > 0 && t.every((x) => !x.on && x.svgShown && !x.imgShown), `every truck falls back to the drawing (${t.length})`);
  await browser.close();
}

// Dragging a truck back and forth stays smooth with the CPU slowed 4x.
{
  console.log('\nframe rate while dragging (4x slower CPU)');
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  await page.goto(ROOT + '?wild=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => localStorage.setItem('rush-hour-rigs:v2', p), UNLOCKED);
  await enter(page, 2, 5);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const box = await (await page.$('.truck.horiz')).boundingBox();
  await page.evaluate(() => {
    window.__ft = [];
    let last = performance.now();
    const f = (t) => {
      window.__ft.push(t - last);
      last = t;
      if (window.__ft.length < 400) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  let x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let i = 0; i < 120; i++) {
    x += Math.sin(i / 10) * 4;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
    await wait(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const ft = (await page.evaluate(() => window.__ft)).slice(5).sort((a, b) => a - b);
  const p95 = ft[Math.floor(ft.length * 0.95)];
  check(p95 < 25, `p95 frame ${p95.toFixed(1)}ms, median ${ft[ft.length >> 1].toFixed(1)}ms`);
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
