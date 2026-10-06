// iPhone tap test (Playwright; Chromium + WebKit with touch) at real iPhone sizes, with and without
// Safari's toolbars showing:
//  - the win card (region level and Daily Pad) fits without scrolling
//  - "Play again" and "All levels" sit side by side, each at least 48px tall
//  - one touch tap on "All levels", "‹ Levels", the gear and a region tab does its job, once,
//    without a ghost click landing on the next screen
//  - every button/link is at least 44x44 with touch-action set
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e
// Or against the live site:  URL=https://jasondag-ai.github.io/rush-hour-rigs/ npm run test:e2e
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit, devices } from 'playwright';
import { DAILY_LEVELS, REGIONS } from '../src/levels/regions.ts';
import { solve } from '../src/engine/index.ts';
import { dayKey, padLevelIndex, padNumber } from '../src/ui/daily.ts';

const BASE = process.env.URL ?? 'http://localhost:5173/';
const MIN = 44;
const VIEWPORTS = [
  { name: '375x667 (iPhone SE/8, full screen)', width: 375, height: 667, dpr: 2 },
  { name: '375x553 (iPhone SE/8, Safari toolbars)', width: 375, height: 553, dpr: 2 },
  { name: '390x844 (iPhone 13, full screen)', width: 390, height: 844, dpr: 3 },
  { name: '390x664 (iPhone 13, Safari toolbars)', width: 390, height: 664, dpr: 3 },
];
const plan = (level) => ({ sol: solve(level), trucks: level.trucks });
const cardium1 = plan(REGIONS[0].levels[0]);
const daily = plan(DAILY_LEVELS[padLevelIndex(padNumber(dayKey(new Date())), DAILY_LEVELS.length)]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

/** Plays a solution with touch-type pointer drags (works in both engines). */
async function play(page, { sol, trucks }) {
  const cell = await page.$eval('.board', (el) => parseFloat(el.style.getPropertyValue('--cell')));
  for (const m of sol) {
    const t = trucks.find((x) => x.id === m.id);
    await page.evaluate(
      ({ id, d, h }) =>
        new Promise(async (res) => {
          const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`);
          const r = el.getBoundingClientRect();
          let x = r.x + r.width / 2;
          let y = r.y + r.height / 2;
          const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
          ev('pointerdown');
          for (let k = 1; k <= 8; k++) {
            if (h) x += d / 8;
            else y += d / 8;
            ev('pointermove');
            await new Promise((r) => requestAnimationFrame(r));
          }
          ev('pointerup');
          res();
        }),
      { id: m.id, d: m.delta * cell, h: t.orient === 'h' },
    );
    await wait(350);
  }
  await wait(1300);
}

async function winCard(page) {
  return page.evaluate(() => {
    const o = document.querySelector('.win');
    const row = [...document.querySelectorAll('.win .btn-row .btn')].map((b) => {
      const r = b.getBoundingClientRect();
      return { label: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
    });
    const card = document.querySelector('.win .card').getBoundingClientRect();
    return { scrolls: o.scrollHeight > o.clientHeight + 1, cardH: Math.round(card.height), cardW: Math.round(card.width), vh: innerHeight, row };
  });
}

async function audit(page, screen, small) {
  const found = await page.evaluate(() =>
    [...document.querySelectorAll('button, a, [role="button"], label.switch')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !el.closest('[hidden]');
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { label: (el.getAttribute('aria-label') || el.textContent).trim().replace(/\s+/g, ' ').slice(0, 24), w: Math.round(r.width), h: Math.round(r.height), ta: getComputedStyle(el).touchAction };
      }),
  );
  for (const f of found) if (f.w < MIN || f.h < MIN || !/manipulation|none|pan-x/.test(f.ta)) small.push(`${screen}: "${f.label}" ${f.w}x${f.h} ${f.ta}`);
}

const onList = (page) => page.evaluate(() => !!document.querySelector('.screen.levels') && !document.querySelector('.screen.game'));

for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  for (const vp of VIEWPORTS) {
    const browser = await engine.launch();
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate((p) => {
      localStorage.clear();
      localStorage.setItem('rush-hour-rigs:v2', p);
    }, UNLOCKED);
    await page.reload({ waitUntil: 'networkidle' });
    console.log(`\n${engineName} ${vp.name}`);
    const small = [];
    await audit(page, 'level list', small);

    // Gear and a region tab: one tap each.
    await page.locator('.gear').tap();
    await wait(250);
    check(!!(await page.$('.settings')), 'one tap on the gear opens Settings');
    await audit(page, 'settings', small);
    await page.$eval('[data-act="close"]', (b) => b.click());
    await wait(300);
    // (The region bar is swiped sideways: bring the tab into view and let the bar come to rest, as a finger would, before the tap.)
    await page.locator('.region-tab:nth-child(2)').scrollIntoViewIfNeeded();
    await wait(300);
    await page.locator('.region-tab:nth-child(2)').tap();
    await wait(250);
    check((await page.$eval('.region-tab[aria-selected="true"] .rtext', (e) => e.textContent)) === 'Montney', 'one tap on the Montney tab switches region');
    await page.locator('.region-tab:nth-child(1)').tap();
    await wait(250);

    // "‹ Levels" from a game.
    await page.$eval('.level-btn[data-index="0"]', (b) => b.click());
    await wait(400);
    await audit(page, 'game', small);
    await page.locator('.hud [data-act="levels"]').tap();
    await wait(350);
    check(await onList(page), 'one tap on "‹ Levels" goes back to the list');

    // Region win card.
    await page.$eval('.level-btn[data-index="0"]', (b) => b.click());
    await wait(400);
    await play(page, cardium1);
    let w = await winCard(page);
    await audit(page, 'win card', small);
    check(!w.scrolls, `region win card fits without scrolling (card ${w.cardH}px in ${w.vh}px)`);
    check(w.row.length === 2 && w.row[0].top === w.row[1].top && w.row.every((b) => b.h >= 48 && b.w >= w.cardW * 0.35), `"Play again" and "All levels" side by side: ${w.row.map((b) => `${b.label} ${b.w}x${b.h}`).join(' | ')}`);
    await page.locator('.win [data-act="levels"]').tap();
    await wait(600);
    check(await onList(page), 'one tap on "All levels" opens the list (and no ghost click into a level)');

    // Daily Pad win card (sign + Share).
    await page.$eval('.daily-btn', (b) => b.click());
    await wait(400);
    await play(page, daily);
    w = await winCard(page);
    check(!w.scrolls, `Daily win card fits without scrolling (card ${w.cardH}px in ${w.vh}px)`);
    await page.locator('.win [data-act="levels"]').tap();
    await wait(600);
    check(await onList(page), 'one tap on "All levels" from the Daily Pad opens the list');

    check(small.length === 0, `every control at least ${MIN}px with touch-action set${small.length ? ': ' + small.join('; ') : ''}`);
    await browser.close();
  }
}
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
