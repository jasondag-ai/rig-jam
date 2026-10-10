// The region bar (Playwright, WebKit at an iPhone's DPR 3, 375 and 390 wide): one row of
// full-size tabs that is swiped left and right.
//  - one row, full-size text (18 px names, the padlock beside the name), no scrollbar, a snap at
//    each tab, native scrolling sideways only (a swipe on the bar never moves the page)
//  - the next tab peeks about a third into view at the right edge; an edge fades where there is more
//  - on load the active tab is wholly in view: the furthest unlocked region, or the one last on
//  - locked tabs keep their padlock, can be swiped to, and only shake when tapped
//  - a swipe of the bar is never a tap on a tab; nor is the touch that stops a fling
//  - with the game's 5 tabs and with a made-up 8 (`?tabs=8`)
// Run with the dev server up: npm run test:e2e:tabs
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { outDir } from './out.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = outDir('fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const REGIONS_IN_GAME = REGIONS.length;
const five = (ri) => Object.fromEntries(REGIONS[ri].levels.slice(0, 5).map((l) => [l.id, l.par]));
const progress = (best, demo = false) => JSON.stringify({ best, hints: 3, perfect: [], dailyCleared: [], announced: REGIONS.map((r) => r.id), demo });

const browser = await webkit.launch();
async function open({ width, tabs = 5, saved = null, region = null }) {
  const context = await browser.newContext({ viewport: { width, height: width === 375 ? 667 : 844 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => { failures++; console.log('ERR', e.message); });
  await page.goto(`${ROOT}?cover=0${tabs > REGIONS.length ? `&tabs=${tabs}` : ''}`, { waitUntil: 'networkidle' });
  await page.evaluate(([p, r]) => { localStorage.clear(); if (p) localStorage.setItem('rush-hour-rigs:v2', p); if (r) localStorage.setItem('rush-hour-rigs:region', r); }, [saved, region]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.region-tab');
  await page.evaluate(() => document.fonts.ready);
  await wait(250);
  return { context, page };
}
/** The bar as it lies on the screen. */
const bar = (page) => page.evaluate(() => {
  const frame = document.querySelector('.regions'), track = document.querySelector('.regions-track');
  const f = frame.getBoundingClientRect(), v = track.getBoundingClientRect(), cs = getComputedStyle(track);
  const tabs = [...track.children].map((t) => { const r = t.getBoundingClientRect(), name = t.querySelector('.rtext'), lock = t.querySelector('img.padlock, .padlock'), n = name.getBoundingClientRect(); return {
    name: name.textContent, left: r.left, right: r.right, top: r.top, w: r.width, h: r.height, locked: t.classList.contains('locked'), active: t.getAttribute('aria-selected') === 'true',
    font: parseFloat(getComputedStyle(name).fontSize), sub: parseFloat(getComputedStyle(t.querySelector('.rdone, .rlock')).fontSize), fits: name.scrollWidth <= t.clientWidth && n.left >= r.left - 0.5 && n.right <= r.right + 0.5,
    lock: lock ? [lock.getBoundingClientRect().width, Math.abs(lock.getBoundingClientRect().top + lock.getBoundingClientRect().height / 2 - (n.top + n.height / 2)) < 10] : null,
    snap: getComputedStyle(t).scrollSnapAlign, touch: getComputedStyle(t).touchAction, shown: Math.max(0, Math.min(r.right, v.right) - Math.max(r.left, v.left)) / r.width }; });
  return { tabs, view: { left: v.left, right: v.right, w: v.width }, frame: { left: f.left, right: f.right }, scroll: track.scrollLeft, max: track.scrollWidth - track.clientWidth,
    overflow: [cs.overflowX, cs.overflowY], snapType: cs.scrollSnapType, touch: cs.touchAction, over: cs.overscrollBehaviorX, bars: track.offsetHeight - track.clientHeight, sbw: cs.scrollbarWidth,
    more: [frame.classList.contains('more-left'), frame.classList.contains('more-right')], fade: [getComputedStyle(frame, '::before').opacity, getComputedStyle(frame, '::after').opacity].map(Number),
    pageX: document.querySelector('.screen.levels').scrollWidth > innerWidth + 1, active: document.querySelector('.region-blurb').textContent };
});
const scrollTo = (page, x) => page.evaluate(async (x) => { const t = document.querySelector('.regions-track'); t.scrollLeft = x; await new Promise((r) => setTimeout(r, 260)); return t.scrollLeft; }, x);
const ptr = (page, type, x, y, target = null) => page.evaluate(([type, x, y, target]) => { const el = (target ? document.querySelector(target) : document.elementFromPoint(x, y)); el.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1 })); }, [type, x, y, target]);

for (const width of [375, 390]) {
  for (const count of [REGIONS_IN_GAME, 8]) {
    console.log(`\nwebkit ${width} @3x: ${count} tabs`);
    // A player who has opened Montney and Duvernay (five cleared in Cardium and in Montney), with nothing remembered.
    const { context, page } = await open({ width, tabs: count, saved: progress({ ...five(0), ...five(1) }) });
    const b = await bar(page);
    const rows = new Set(b.tabs.map((t) => Math.round(t.top))).size;
    check(b.tabs.length === count && rows === 1 && b.overflow.join() === 'auto,hidden' && b.bars === 0 && !b.pageX && b.view.left >= b.frame.left && b.view.right <= b.frame.right,
      `${b.tabs.length} tabs in ONE row inside the frame, which scrolls sideways (${Math.round(b.max)} px) with no scrollbar; the page itself does not`);
    check(b.tabs.every((t) => t.font === 18 && t.fits && t.h >= 54 && t.w >= 120) && b.tabs.filter((t) => t.locked).every((t) => t.sub === 11 && t.lock && t.lock[0] >= 24 && t.lock[1]) && b.tabs.filter((t) => !t.locked).every((t) => t.sub === 13),
      `full-size text again: names ${b.tabs[0].font} px, tabs ${Math.round(b.tabs[0].w)} x ${Math.round(b.tabs[0].h)} px, a locked tab's padlock ${Math.round(b.tabs.find((t) => t.locked).lock[0])} px beside its name and its line at ${b.tabs.find((t) => t.locked).sub} px`);
    check(/x mandatory/.test(b.snapType) && b.tabs.every((t) => /start/.test(t.snap) && t.touch === 'pan-x') && b.touch === 'pan-x' && b.over === 'contain',
      `a snap at each tab (${b.snapType}); a swipe on the bar moves it sideways only, never the page (touch-action ${b.touch})`);
    // On load: the furthest unlocked region is the active one, wholly in view.
    const far = b.tabs.find((t) => t.name === 'Duvernay');
    check(far.shown > 0.99 && !far.locked && b.tabs[3].locked && b.scroll > 0, `on load, with no region remembered yet, the bar is scrolled so the furthest unlocked region is wholly in view: ${far.name} (bar at ${Math.round(b.scroll)} px)`);
    // The peek, at every tab's snap point that is not the end of the bar.
    let peeks = [];
    for (let i = 0; i < count; i++) {
      const at = await scrollTo(page, b.tabs[i].left - b.tabs[0].left);
      const now = await bar(page);
      if (now.scroll >= now.max - 2) { peeks.push({ i, end: true, last: now.tabs.at(-1).shown, more: now.more, fade: now.fade }); break; }
      const whole = now.tabs.filter((t) => t.shown > 0.99).length, next = now.tabs.find((t) => t.shown > 0.01 && t.shown < 0.99 && t.left > now.view.left);
      peeks.push({ i, whole, peek: next?.shown ?? 0, snapped: Math.abs(now.tabs[i].left - now.view.left - 5) < 2, more: now.more, fade: now.fade, at });
      if (i === 0 && count === REGIONS_IN_GAME) await page.screenshot({ path: join(OUT, `region_bar_${width}.png`), clip: { x: 0, y: Math.max(0, b.tabs[0].top - 16), width, height: b.tabs[0].h + 34 } });
    }
    const mid = peeks.filter((p) => !p.end);
    check(mid.length >= 2 && mid.every((p) => p.whole === 2 && p.peek > 0.25 && p.peek < 0.45 && p.snapped), `at each tab's snap point two tabs show whole and the next peeks ${mid.map((p) => Math.round(p.peek * 100)).join(', ')}% into view at the right edge`);
    await wait(250);
    const end = peeks.at(-1), first = mid[0], second = mid[1];
    check(first.more.join() === 'false,true' && first.fade[0] === 0 && second.more.join() === 'true,true' && end.end && end.last > 0.99 && end.more.join() === 'true,false',
      'an edge fades only where there is more: the right at the start, both in the middle, the left at the end (where the last tab is whole)');
    // Locked tabs: swiped to, padlock and all; a tap only shakes them.
    await scrollTo(page, 99999);
    // (The last tab: a made-up one when the bar is padded to 8, else the game's own last region.)
    const lockedName = count > REGIONS.length ? ['Viking', 'Leduc', 'Nisku'][count - REGIONS.length - 1] : REGIONS[REGIONS.length - 1].name;
    const tapTab = async (name) => { const r = await page.evaluate((n) => { const t = [...document.querySelectorAll('.region-tab')].find((x) => x.querySelector('.rtext').textContent === n).getBoundingClientRect(); return { x: t.left + t.width / 2, y: t.top + t.height / 2 }; }, name); await ptr(page, 'pointerdown', r.x, r.y); await ptr(page, 'pointerup', r.x, r.y); await wait(120); return r; };
    await wait(300);
    await tapTab(lockedName);
    const shaken = await page.evaluate((n) => { const t = [...document.querySelectorAll('.region-tab')].find((x) => x.querySelector('.rtext').textContent === n), r = t.getBoundingClientRect(); return { nope: t.classList.contains('nope'), lock: !!t.querySelector('.padlock'), text: t.querySelector('.rlock').textContent, whole: r.left >= 0 && r.right <= innerWidth, still: document.querySelector('.region-tab[aria-selected="true"] .rtext').textContent }; }, lockedName);
    check(shaken.nope && shaken.lock && shaken.whole && shaken.still === 'Cardium', `the last tab (${lockedName}, locked) can be swiped to, padlock and all ("${shaken.text}"); a tap only shakes it`);
    // A swipe is never a tap: finger down on a tab, the bar moves, finger up.
    await scrollTo(page, 0);
    await wait(300);
    const cardium = await page.evaluate(() => { const t = document.querySelectorAll('.region-tab')[1].getBoundingClientRect(); return { x: t.left + t.width / 2, y: t.top + t.height / 2 }; });
    await ptr(page, 'pointerdown', cardium.x, cardium.y);
    await page.evaluate(() => { document.querySelector('.regions-track').scrollLeft = 90; });
    await ptr(page, 'pointerup', cardium.x - 4, cardium.y, '.region-tab:nth-child(2)');
    await wait(200);
    const afterSwipe = await page.evaluate(() => document.querySelector('.region-tab[aria-selected="true"] .rtext').textContent);
    // Nor is the touch that stops a fling: the bar was still moving when the finger came down.
    await page.evaluate(() => { document.querySelector('.regions-track').scrollLeft = 30; });
    await wait(40);
    const moving = await page.evaluate(() => { const t = document.querySelectorAll('.region-tab')[1].getBoundingClientRect(); return { x: Math.max(8, t.left + t.width / 2), y: t.top + t.height / 2 }; });
    await ptr(page, 'pointerdown', moving.x, moving.y);
    await ptr(page, 'pointerup', moving.x, moving.y);
    await wait(200);
    const afterStop = await page.evaluate(() => document.querySelector('.region-tab[aria-selected="true"] .rtext').textContent);
    check(afterSwipe === 'Cardium' && afterStop === 'Cardium', 'a swipe that began on the Montney tab does not open Montney; nor does the touch that stops the bar while it is still moving');
    // At rest, a tap does open it; the bar stays where it shows the tab.
    await scrollTo(page, 0);
    await wait(350);
    await tapTab('Montney');
    await page.waitForFunction(() => document.querySelector('.region-tab[aria-selected="true"] .rtext')?.textContent === 'Montney', null, { timeout: 3000 }).catch(() => {});
    const opened = await bar(page);
    const m = opened.tabs.find((t) => t.active);
    check(m?.name === 'Montney' && m.shown > 0.99 && Math.abs(opened.scroll) < 2 && opened.active === REGIONS[1].blurb, 'at rest, one tap on Montney opens it, and the bar stays where it was');
    await context.close();
  }
  // The one you were last on.
  {
    const { context, page } = await open({ width, saved: UNLOCKED, region: 'mannville' });
    const b = await bar(page), act = b.tabs.find((t) => t.active);
    check(act.name === 'Mannville' && act.shown > 0.99 && b.scroll > 0, `${width}: with Mannville remembered as the last region, the bar opens scrolled to it (${Math.round(b.scroll)} px), wholly in view`);
    await context.close();
  }
  {
    const { context, page } = await open({ width });
    const b = await bar(page), act = b.tabs.find((t) => t.active);
    check(act.name === 'Cardium' && b.scroll === 0 && b.tabs[2].shown > 0.25 && b.tabs[2].shown < 0.45 && b.tabs.filter((t) => t.locked).length === REGIONS.length - 1, `${width}: a new player sees Cardium, Montney behind its padlock, and a third of Duvernay peeking in`);
    await context.close();
  }
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
