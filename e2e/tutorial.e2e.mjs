// The how-to and the ghost finger (Playwright, WebKit and Chromium, iPhone sizes): the "?" in the
// home page's top bar is a full tap target that stays on screen beside the title; one tap opens
// three cards; Next and a swipe turn them; Got it, Close and the X leave. Level 1 shows a ghost
// finger on the board until the first drag; no other level does. The home page has no Safety
// Stand-Down line. Run with the dev server up: npm run test:e2e:tutorial
import { chromium, webkit } from 'playwright';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();
  for (const [width, height] of [[375, 667], [390, 844], [430, 932]]) {
    console.log(`\n${engine} ${width}x${height}`);
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('ERR', e.message));
    await page.goto(ROOT + '?cover=0&magpie=0&worker=0&night=0', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    const bar = await page.evaluate(() => {
      const R = (s) => document.querySelector(s).getBoundingClientRect();
      const [help, bino, gear, h1] = [R('.brand .help'), R('.brand .binoculars'), R('.brand .gear'), document.querySelector('.brand h1')];
      const range = document.createRange(); range.selectNodeContents(h1); const t = range.getBoundingClientRect();
      return { help: [help.left, help.right, help.width, help.height], clearOfTitle: t.right <= help.left + 6, clearOfBino: help.right <= bino.left + 6, onScreen: help.left >= 0 && gear.right <= innerWidth, oneLine: t.height < 46, text: document.querySelector('.screen.levels').textContent };
    });
    check(bar.help[2] >= 44 && bar.help[3] >= 44 && bar.onScreen, `the "?" button is a ${Math.round(bar.help[2])}x${Math.round(bar.help[3])} tap target in the top bar`);
    check(bar.clearOfTitle && bar.clearOfBino && bar.oneLine, 'it sits between the title (still on one line) and the binoculars, touching neither');
    check(!/Stand-Down/i.test(bar.text), 'the home page has no Safety Stand-Down line');
    await page.locator('.brand .help').tap();
    await page.waitForSelector('.overlay.tutorial');
    await wait(350);
    const card = await page.evaluate(() => {
      const c = document.querySelector('.tutorial .card').getBoundingClientRect();
      const on = document.querySelector('.tutorial .t-card.on');
      const finger = on.querySelector('.t-finger')?.getBoundingClientRect();
      return { cards: document.querySelectorAll('.tutorial .t-card').length, at: document.querySelector('.tutorial').dataset.at, title: on.querySelector('h3').textContent, fits: c.top >= 0 && c.bottom <= innerHeight && c.left >= 0 && c.right <= innerWidth, noScroll: document.querySelector('.tutorial').scrollHeight <= innerHeight + 1, finger: !!finger && finger.width > 20, taps: [...document.querySelectorAll('.tutorial [data-t]')].every((b) => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }) };
    });
    check(card.cards === 3 && card.at === '0' && card.title === 'Drag a truck' && card.finger, `one tap opens the how-to on its first card, with the ghost finger ("${card.title}")`);
    check(card.fits && card.noScroll && card.taps, 'the card fits the screen with no scrolling; Next, Close and the X are full tap targets');
    await page.locator('.tutorial [data-t="next"]').tap();
    await wait(400);
    const two = await page.evaluate(() => ({ at: document.querySelector('.tutorial').dataset.at, title: document.querySelector('.tutorial .t-card.on h3').textContent, shown: (() => { const w = document.querySelector('.tutorial .t-window').getBoundingClientRect(), c = document.querySelector('.tutorial .t-card.on').getBoundingClientRect(); return Math.abs(c.left - w.left) < 2; })() }));
    check(two.at === '1' && two.title === 'Match the gate' && two.shown, `Next turns to "${two.title}"`);
    // A swipe to the left: the third card. A swipe back to the right: the second again.
    const swipe = (dx) => page.evaluate(async (d) => {
      const w = document.querySelector('.tutorial .t-window'); const r = w.getBoundingClientRect();
      let x = r.left + r.width / 2 - d / 2; const y = r.top + r.height / 2;
      const ev = (type) => w.dispatchEvent(new PointerEvent(type, { pointerId: 41, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true }));
      ev('pointerdown'); for (let k = 0; k < 6; k++) { x += d / 6; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); } ev('pointerup');
      await new Promise((q) => setTimeout(q, 400));
      return { at: document.querySelector('.tutorial').dataset.at, title: document.querySelector('.tutorial .t-card.on h3').textContent, next: document.querySelector('.tutorial [data-t="next"]').textContent };
    }, dx);
    const three = await swipe(-120);
    check(three.at === '2' && three.title === 'Fewer moves, more hard hats' && three.next === 'Got it', `a swipe turns to "${three.title}", and Next reads "${three.next}"`);
    const back = await swipe(120);
    check(back.at === '1' && back.next === 'Next', 'a swipe the other way turns back');
    await swipe(-120);
    await page.locator('.tutorial [data-t="next"]').tap();
    await wait(300);
    check(!(await page.$('.overlay.tutorial')) && !!(await page.$('.screen.levels')), '"Got it" closes it, back on the home page (no ghost tap on what is underneath)');
    for (const how of ['button.btn[data-t="close"]', '.t-x']) {
      await page.locator('.brand .help').tap();
      await page.waitForSelector('.overlay.tutorial');
      await wait(300);
      await page.locator(`.tutorial ${how}`).tap();
      await wait(300);
      check(!(await page.$('.overlay.tutorial')) && !!(await page.$('.screen.levels')), `${how === '.t-x' ? 'the X' : 'Close'} closes it`);
    }

    // Level 1: the ghost finger on the board, until the first drag.
    await page.locator('.level-btn').first().tap();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(500);
    const f = await page.evaluate(() => {
      const g = document.querySelector('.board .ghost-finger');
      if (!g) return null;
      const r = g.getBoundingClientRect(), b = document.querySelector('.board').getBoundingClientRect();
      const trucks = [...document.querySelectorAll('.truck')].map((t) => t.getBoundingClientRect());
      const cx = parseFloat(g.style.left) + b.left, cy = parseFloat(g.style.top) + b.top;
      return { touch: getComputedStyle(g).pointerEvents, onTruck: trucks.some((t) => cx > t.left && cx < t.right && cy > t.top && cy < t.bottom), travel: Math.hypot(parseFloat(g.style.getPropertyValue('--dx')), parseFloat(g.style.getPropertyValue('--dy'))), w: r.width };
    });
    check(!!f && f.onTruck && f.travel > 30 && f.touch === 'none', `level 1 shows the ghost finger on a truck, dragging it ${Math.round(f?.travel ?? 0)} px along its lane; it takes no touches`);
    await page.evaluate(async () => {
      const el = document.querySelector('.truck'); const r = el.getBoundingClientRect();
      const ev = (type, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: 42, pointerType: 'touch', isPrimary: true, clientX: r.x + r.width / 2, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
      ev('pointerdown', r.y + r.height / 2); ev('pointermove', r.y + r.height / 2 - 6); await new Promise((q) => requestAnimationFrame(q)); ev('pointerup', r.y + r.height / 2 - 6);
      await new Promise((q) => setTimeout(q, 300));
    });
    check(!(await page.$('.board .ghost-finger')), 'the first drag sends it away');
    await context.close();
  }
  // No other level has one.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
    const page = await context.newPage();
    const { UNLOCKED } = await import('./progress.mjs');
    await page.goto(ROOT + '?cover=0&magpie=0&worker=0&night=0', { waitUntil: 'networkidle' });
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.level-btn').nth(1).tap();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(500);
    check(!(await page.$('.board .ghost-finger')), `${engine}: level 2 has no ghost finger`);
    await context.close();
  }
  await browser.close();
}
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
