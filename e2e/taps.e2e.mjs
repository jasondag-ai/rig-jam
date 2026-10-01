// iPhone tap test (Playwright, iPhone 13 and iPhone SE, Chromium + WebKit with touch):
//  - every button/link is at least 44x44 and has touch-action set
//  - a single touch tap on "All levels" on the win screen (region level and Daily Pad) opens the list
//  - win-card buttons stay clear of the bottom edge where Safari's toolbar grabs taps
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e
// Or against the live site:  URL=https://jasondag-ai.github.io/rush-hour-rigs/ npm run test:e2e
import { chromium, webkit, devices } from 'playwright';
import { DAILY_LEVELS, REGIONS } from '../src/levels/regions.ts';
import { solve } from '../src/engine/index.ts';
import { dayKey, padLevelIndex, padNumber } from '../src/ui/daily.ts';
const BASE = process.env.URL ?? 'http://localhost:5173/';
const first = REGIONS[0].levels[0];
const sol = { sol: solve(first), trucks: first.trucks }; // Cardium 1
const todays = DAILY_LEVELS[padLevelIndex(padNumber(dayKey(new Date())), DAILY_LEVELS.length)];
const daily = { sol: solve(todays), trucks: todays.trucks };
/** Win-card buttons must sit at least this far above the bottom edge. */
const BOTTOM_CLEARANCE = 60;
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIN = 44;
let failures = 0;
for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  for (const devName of ['iPhone 13', 'iPhone SE']) {
    const dev = devices[devName];
    const browser = await engine.launch();
    const context = await browser.newContext({ ...dev });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], demo: true, announced: [] })); });
    await page.reload({ waitUntil: 'networkidle' });
    const small = [];
    async function audit(screen) {
      const found = await page.evaluate((MIN) => [...document.querySelectorAll('button, a, [role="button"], label.switch')].filter((el) => {
        const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('[hidden]') && r.bottom > 0 && r.top < innerHeight * 3;
      }).map((el) => { const r = el.getBoundingClientRect(); return { label: (el.getAttribute('aria-label') || el.textContent).trim().replace(/\s+/g, ' ').slice(0, 24), w: Math.round(r.width), h: Math.round(r.height), ta: getComputedStyle(el).touchAction }; }), MIN);
      for (const f of found) if (f.w < MIN || f.h < MIN || !/manipulation|none/.test(f.ta)) small.push(`${screen}: "${f.label}" ${f.w}x${f.h} touch-action:${f.ta}`);
    }
    await audit('level list');
    await page.click('.gear'); await wait(200); await audit('settings');
    await page.$eval('[data-act="close"]', b => b.click()); await wait(300);
    await page.$eval('.level-btn[data-index="0"]', b => b.click()); await wait(400);
    await audit('game');
    // Win Cardium 1 with touch-type pointer drags (works in both engines).
    const cell = await page.$eval('.board', el => parseFloat(el.style.getPropertyValue('--cell')));
    for (const m of sol.sol) {
      const t = sol.trucks.find(x => x.id === m.id);
      await page.evaluate(({ id, d, h }) => new Promise(async res => {
        const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`); const r = el.getBoundingClientRect();
        let x = r.x + r.width / 2, y = r.y + r.height / 2;
        const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
        ev('pointerdown');
        for (let k = 1; k <= 8; k++) { if (h) x += d / 8; else y += d / 8; ev('pointermove'); await new Promise(r => requestAnimationFrame(r)); }
        ev('pointerup'); res();
      }), { id: m.id, d: m.delta * cell, h: t.orient === 'h' });
      await wait(350);
    }
    await wait(1300);
    await audit('win card');
    const win = await page.evaluate(() => {
      const card = document.querySelector('.win .card').getBoundingClientRect();
      const btns = [...document.querySelectorAll('.win .card button')].map(b => { const r = b.getBoundingClientRect(); return { label: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; });
      return { btns, gapToBottom: Math.round(innerHeight - Math.max(...btns.map(b => b.bottom))), cardW: Math.round(card.width), cardH: Math.round(card.height), vh: innerHeight };
    });
    // One real touch tap on "All levels".
    const all = page.locator('.win .card [data-act="levels"]');
    await all.scrollIntoViewIfNeeded();
    await all.tap();
    await wait(400);
    const opened = await page.$('.screen.levels') !== null;
    if (!opened) failures++;
    if (win.gapToBottom < BOTTOM_CLEARANCE) failures++;
    failures += small.length;
    console.log(`${engineName} ${devName}: one tap on "All levels" opened the list: ${opened}`);
    console.log(`   win buttons: ${win.btns.map(b => `${b.label} ${b.w}x${b.h}`).join(' | ')} | lowest button ${win.gapToBottom}px above the bottom edge | card ${win.cardH}px tall in a ${win.vh}px viewport`);
    console.log(`   under ${MIN}px or missing touch-action: ${small.length ? '\n     ' + small.join('\n     ') : 'none'}`);
    // Daily Pad win card (sign + Share): same single tap.
    await page.$eval('.daily-btn', b => b.click()); await wait(400);
    const dcell = await page.$eval('.board', el => parseFloat(el.style.getPropertyValue('--cell')));
    for (const m of daily.sol) {
      const t = daily.trucks.find(x => x.id === m.id);
      await page.evaluate(({ id, d, h }) => new Promise(async res => {
        const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`); const r = el.getBoundingClientRect();
        let x = r.x + r.width / 2, y = r.y + r.height / 2;
        const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
        ev('pointerdown');
        for (let k = 1; k <= 8; k++) { if (h) x += d / 8; else y += d / 8; ev('pointermove'); await new Promise(r => requestAnimationFrame(r)); }
        ev('pointerup'); res();
      }), { id: m.id, d: m.delta * dcell, h: t.orient === 'h' });
      await wait(350);
    }
    await wait(1300);
    const dwin = await page.evaluate(() => {
      const card = document.querySelector('.win .card').getBoundingClientRect();
      const all = document.querySelector('.win .card [data-act="levels"]').getBoundingClientRect();
      return { cardH: Math.round(card.height), vh: innerHeight, allBottomGap: Math.round(innerHeight - all.bottom), allH: Math.round(all.height) };
    });
    await page.locator('.win .card [data-act="levels"]').tap(); await wait(400);
    const dOpened = await page.$('.screen.levels') !== null;
    if (!dOpened || dwin.allBottomGap < BOTTOM_CLEARANCE) failures++;
    console.log(`   Daily win card ${dwin.cardH}px in ${dwin.vh}px: "All levels" ${dwin.allH}px tall, ${dwin.allBottomGap}px above the bottom edge before any scrolling; one tap opened the list: ${dOpened}`);
    await browser.close();
  }
}
console.log(failures ? `FAILED: ${failures} problem(s)` : 'PASS');
process.exit(failures ? 1 : 0);
