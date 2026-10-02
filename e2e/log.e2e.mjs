// Wildlife Log test (Playwright, iPhone 13, Chromium). Gags unlock log entries the first time they
// fully play, with a toast at the top that never covers the board; the log page shows found cards
// (art + caption) and silhouettes (hint); all seven unlock camo pickups with a Settings switch;
// ?log=all previews everything without saving; Reset progress clears the log.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:log
import { chromium, devices } from 'playwright';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const ALL = ['magpie', 'spotter', 'biffy', 'landowner', 'bear', 'moose', 'hotshot'];
const PROGRESS = JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], demo: true, announced: [] });

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
const fresh = async (query = '', log = null) => {
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  await page.evaluate(([p, l]) => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', p);
    if (l) localStorage.setItem('rush-hour-rigs:log', l);
  }, [PROGRESS, log]);
  await page.reload({ waitUntil: 'networkidle' });
};
const openLog = async () => {
  await page.$eval('.binoculars', (b) => b.click());
  await wait(250);
  return page.evaluate(() => ({
    count: document.querySelector('.log-count')?.textContent,
    cards: [...document.querySelectorAll('.log-card')].map((c) => ({ id: c.dataset.id, found: c.classList.contains('found'), title: c.querySelector('h2').textContent, text: c.querySelector('p').textContent })),
  }));
};
/** Every toast that appears: its text, where it sits, how long it stays. */
const watchToasts = () =>
  page.evaluate(() => {
    window.__toasts = [];
    new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (!n.classList?.contains('toast')) continue;
          const board = document.querySelector('.board')?.getBoundingClientRect();
          const r = n.getBoundingClientRect();
          window.__toasts.push({ text: n.textContent, bottom: r.bottom, boardTop: board?.top ?? Infinity, at: performance.now(), gone: null, el: n });
        }
        for (const n of m.removedNodes) {
          const t = window.__toasts.find((x) => x.el === n);
          if (t) t.gone = performance.now();
        }
      }
    }).observe(document.body, { childList: true });
  });
const toasts = () => page.evaluate(() => window.__toasts.map(({ el, ...t }) => ({ ...t, ms: t.gone ? t.gone - t.at : null })));

console.log('\nchromium iPhone 13');

// 1. A new player: the binoculars sit by the gear; the log is all silhouettes and hints.
await fresh();
const btn = await page.$eval('.binoculars', (b) => {
  const r = b.getBoundingClientRect();
  const g = document.querySelector('.gear').getBoundingClientRect();
  return { w: r.width, h: r.height, beside: Math.abs(r.top - g.top) < 2 && r.right <= g.left, label: b.getAttribute('aria-label') };
});
check(btn.w >= 44 && btn.h >= 44 && btn.beside, `binoculars button next to the gear (${btn.w}x${btn.h}, "${btn.label}")`);
let log = await openLog();
check(log.count === '0/7' && log.cards.length === 7 && log.cards.every((c) => !c.found && c.title === '???'), `7 cards, none found (${log.count})`);
check(log.cards.find((c) => c.id === 'bear').text === 'Seen in Montney' && log.cards.find((c) => c.id === 'magpie').text === 'Watch the roofs' && log.cards.find((c) => c.id === 'spotter').text === 'Try waiting', 'unfound cards show hints');
const silhouette = await page.$eval('.log-card.unfound .art', (a) => getComputedStyle(a).filter);
check(silhouette.includes('brightness(0)'), `as dark silhouettes (${silhouette})`);
await page.$eval('.log-head .back', (b) => b.click());
await wait(200);
check(!!(await page.$('.level-btn')), '"‹ Levels" goes back');

// 2. Play: the magpie, then the spotter falling asleep, each a new sighting with a toast.
await page.goto(ROOT + '?idle=0.1&wild=0', { waitUntil: 'networkidle' });
await page.$eval('.level-btn[data-index="0"]', (b) => b.click());
await watchToasts();
await page.waitForSelector('.spotter.asleep', { timeout: 12000 }).catch(() => {});
await wait(2600);
let t = await toasts();
check(t[0]?.text === 'New sighting! Magpie (1/7)', `toast: "${t[0]?.text}"`);
check(t[1]?.text === 'New sighting! Sleeping Spotter (2/7)', `toast: "${t[1]?.text}"`);
check(t.length >= 1 && t.every((x) => x.bottom <= x.boardTop), `toasts sit above the board (${t.map((x) => `${Math.round(x.bottom)}<=${Math.round(x.boardTop)}`).join(', ')})`);
check(t.length >= 1 && t.every((x) => x.ms && x.ms >= 1900 && x.ms <= 2300), `each disappears after 2 seconds (${t.map((x) => Math.round(x.ms)).join(', ')}ms)`);
await page.$eval('.hud [data-act="levels"]', (b) => b.click());
await wait(200);
log = await openLog();
const magpie = log.cards.find((c) => c.id === 'magpie');
check(log.count === '2/7' && magpie.found && magpie.title === 'Magpie' && magpie.text === 'Never park under a tree.', `the log fills in: ${log.count}, "${magpie.title}: ${magpie.text}"`);
check(log.cards.find((c) => c.id === 'spotter').text === 'On the clock. Allegedly.', 'Spotter: "On the clock. Allegedly."');

// 3. The seventh sighting: celebration, and every pickup goes camo.
await fresh('', JSON.stringify({ found: ALL.filter((x) => x !== 'bear'), camo: true }));
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), 'no camo with 6 of 7');
await page.goto(ROOT + '?gag=bear', { waitUntil: 'networkidle' });
await watchToasts();
await page.waitForSelector('.bear-stage', { timeout: 4000 }).catch(() => {});
await page.waitForSelector('.bear-stage', { state: 'detached', timeout: 25000 }).catch(() => {});
await wait(400);
t = await toasts();
check(t[0]?.text === 'New sighting! Bear (7/7)', `toast: "${t[0]?.text}"`);
await wait(2200);
t = await toasts();
check(/Wildlife Log complete!.*Camo pickups unlocked/.test(t[1]?.text ?? ''), `then the celebration: "${t[1]?.text}"`);
check(t[1] && t[1].bottom <= t[1].boardTop, 'which stays above the board too');
check(await page.evaluate(() => document.body.classList.contains('camo-pickups')), 'camo pickups on');
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:log')));
check(saved.found.length === 7, `saved: ${saved.found.length}/7`);

// 4. Settings switch: on by default once earned; off hides the camo, and it's remembered.
await page.goto(ROOT + '?gag=none', { waitUntil: 'networkidle' });
await page.$eval('.region-tab:nth-child(1)', (b) => b.click());
await page.$eval('.level-btn[data-index="0"]', (b) => b.click());
await wait(500);
const camoShown = () => page.$eval('.truck[data-kind="pickup"] .v-camo', (g) => getComputedStyle(g).display !== 'none').catch(() => null);
check((await camoShown()) === true, 'every pickup wears camo in play');
const kinds = await page.$$eval('.truck', (ts) => ts.filter((x) => x.dataset.kind !== 'pickup').map((x) => getComputedStyle(x.querySelector('.v-camo') ?? x).display));
check(kinds.every((d) => d !== 'inline'), 'other trucks stay as they are');
await page.$eval('.hud [data-act="levels"]', (b) => b.click());
await wait(200);
await page.$eval('.gear', (g) => g.click());
await wait(200);
const sw = await page.$eval('[data-act="camo"]', (i) => ({ checked: i.checked, disabled: i.disabled }));
check(sw.checked && !sw.disabled, 'Settings: "Camo pickups" switch, on');
await page.$eval('[data-act="camo"]', (i) => i.click());
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), 'switched off: no camo');
await page.reload({ waitUntil: 'networkidle' });
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))) && (await page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:log')).camo)) === false, 'and it stays off after a reload');

// 5. Not earned yet: the switch is there but locked.
await fresh();
await page.$eval('.gear', (g) => g.click());
await wait(200);
const locked = await page.$eval('[data-act="camo"]', (i) => ({ disabled: i.disabled, label: i.closest('label').textContent.trim() }));
check(locked.disabled && /Find all 7/.test(locked.label), `locked until the log is complete ("${locked.label.replace(/\s+/g, ' ')}")`);

// 6. ?log=all previews the full log and camo, without touching the saved log.
await fresh('?log=all', JSON.stringify({ found: ['magpie'], camo: true }));
log = await openLog();
check(log.count === '7/7' && log.cards.every((c) => c.found), `?log=all: ${log.count}, every card found`);
check(log.cards.find((c) => c.id === 'moose').text === 'Just checking in.' && log.cards.find((c) => c.id === 'hotshot').text === 'Late for something.', 'with captions');
check(await page.evaluate(() => document.body.classList.contains('camo-pickups')), 'and camo pickups');
check((await page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:log')).found)).join() === 'magpie', 'the real log is untouched');

// 7. Reset progress clears the log.
await fresh('', JSON.stringify({ found: ALL, camo: true }));
await page.$eval('.gear', (g) => g.click());
await wait(150);
await page.$eval('[data-act="reset"]', (b) => b.click());
await page.$eval('[data-act="wipe"]', (b) => b.click());
await wait(250);
check((await page.evaluate(() => localStorage.getItem('rush-hour-rigs:log'))) === null, 'Reset progress clears the log');
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), 'and the camo');

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
