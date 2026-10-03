// Wildlife Log test (Playwright, iPhone 13, Chromium). Gags unlock log entries the first time they
// fully play, with a toast at the top that never covers the board; the log page shows found cards
// (art + caption) and silhouettes (hint); all seven unlock camo pickups with a Settings switch;
// ?log=all previews everything without saving; Reset progress clears the log.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:log
import { DEMO, UNLOCKED } from './progress.mjs';
import { chromium, devices } from 'playwright';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const ALL = ['magpie', 'spotter', 'biffy', 'landowner', 'bear', 'moose', 'hotshot', 'gopher', 'geese', 'pumper'];
const SEVEN = ALL.slice(0, 7);
const PROGRESS = UNLOCKED;

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
const fresh = async (query = '', log = null) => {
  await page.goto(ROOT + (query ? query + '&gags=1' : '?gags=1'), { waitUntil: 'networkidle' });
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
check(log.count === '0/10' && log.cards.length === 10 && log.cards.every((c) => !c.found && c.title === '???'), `10 cards, none found (${log.count})`);
check(log.cards.find((c) => c.id === 'bear').text === 'Only deep in the Duvernay.' && log.cards.find((c) => c.id === 'gopher').text === 'Seen in Cardium' && log.cards.find((c) => c.id === 'geese').text === 'Look up' && log.cards.find((c) => c.id === 'pumper').text === 'Making his rounds', 'unfound cards show hints');
const silhouette = await page.$eval('.log-card.unfound .art', (a) => getComputedStyle(a).filter);
const legend = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.log-card.legendary')];
  return { ids: cards.map((c) => c.dataset.id).join(), tag: cards[0]?.querySelector('.legend-tag')?.textContent, border: cards[0] ? getComputedStyle(cards[0]).borderTopColor : '' };
});
check(legend.ids === 'bear' && legend.tag === 'LEGENDARY' && legend.border === 'rgb(184, 134, 11)', `the Bear's card: gold frame and "${legend.tag}" tag, even unfound`);
check(silhouette.includes('brightness(0)'), `as dark silhouettes (${silhouette})`);
await page.$eval('.log-head .back', (b) => b.click());
await wait(200);
check(!!(await page.$('.level-btn')), '"‹ Levels" goes back');

// 2. Play: the magpie, then the spotter falling asleep, each a new sighting with a toast.
await page.goto(ROOT + '?gags=1&idle=0.1&wild=0', { waitUntil: 'networkidle' });
await page.$eval('.level-btn[data-index="0"]', (b) => b.click());
await watchToasts();
await page.waitForSelector('.spotter.asleep', { timeout: 12000 }).catch(() => {});
await wait(2600);
let t = await toasts();
check(t[0]?.text === 'New sighting! Magpie (1/10)', `toast: "${t[0]?.text}"`);
check(t[1]?.text === 'New sighting! Sleeping Spotter (2/10)', `toast: "${t[1]?.text}"`);
check(t.length >= 1 && t.every((x) => x.bottom <= x.boardTop), `toasts sit above the board (${t.map((x) => `${Math.round(x.bottom)}<=${Math.round(x.boardTop)}`).join(', ')})`);
check(t.length >= 1 && t.every((x) => x.ms && x.ms >= 1900 && x.ms <= 2300), `each disappears after 2 seconds (${t.map((x) => Math.round(x.ms)).join(', ')}ms)`);
await page.$eval('.hud [data-act="levels"]', (b) => b.click());
await wait(200);
log = await openLog();
const magpie = log.cards.find((c) => c.id === 'magpie');
check(log.count === '2/10' && magpie.found && magpie.title === 'Magpie' && magpie.text === 'Never park under a tree.', `the log fills in: ${log.count}, "${magpie.title}: ${magpie.text}"`);
check(log.cards.find((c) => c.id === 'spotter').text === 'On the clock. Allegedly.', 'Spotter: "On the clock. Allegedly."');

// 3. The seventh sighting: celebration, and every pickup goes camo.
await fresh('', JSON.stringify({ v: 2, found: ALL.filter((x) => x !== 'bear'), camo: true }));
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), 'no camo with 9 of 10');
await page.goto(ROOT + '?gags=1&gag=bear', { waitUntil: 'networkidle' });
await watchToasts();
await page.waitForSelector('.bear-stage', { timeout: 4000 }).catch(() => {});
await page.waitForSelector('.bear-stage', { state: 'detached', timeout: 25000 }).catch(() => {});
await wait(400);
t = await toasts();
check(t[0]?.text === 'New sighting! Bear (10/10)', `toast: "${t[0]?.text}"`);
await wait(2200);
t = await toasts();
check(/Wildlife Log complete!.*Camo pickups unlocked/.test(t[1]?.text ?? ''), `then the celebration: "${t[1]?.text}"`);
check(t[1] && t[1].bottom <= t[1].boardTop, 'which stays above the board too');
check(await page.evaluate(() => document.body.classList.contains('camo-pickups')), 'camo pickups on');
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:log')));
check(saved.found.length === 10, `saved: ${saved.found.length}/10`);

// 3b. A player who found all 7 before entries 8 to 10 arrived keeps camo; the log shows 7/10.
await fresh('', JSON.stringify({ found: SEVEN, camo: true }));
check(await page.evaluate(() => document.body.classList.contains('camo-pickups')), 'all 7 found before the update: camo kept');
log = await openLog();
check(log.count === '7/10' && log.cards.filter((c) => !c.found).map((c) => c.id).join() === 'gopher,geese,pumper', `log shows ${log.count}, with the three new ones to find`);
// 3c. But finding those seven now isn't enough.
await fresh('', JSON.stringify({ v: 2, found: SEVEN, camo: true, camoEarned: false }));
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), 'the same seven found after the update: no camo yet');

// 4. Settings switch: on by default once earned; off hides the camo, and it's remembered.
await fresh('', JSON.stringify({ v: 2, found: ALL, camo: true, camoEarned: true }));
await page.goto(ROOT + '?gags=1&gag=none', { waitUntil: 'networkidle' });
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
check(locked.disabled && /Find all 10/.test(locked.label), `locked until the log is complete ("${locked.label.replace(/\s+/g, ' ')}")`);

// 6. ?log=all previews the full log and camo, without touching the saved log.
await fresh('?log=all', JSON.stringify({ found: ['magpie'], camo: true }));
log = await openLog();
check(log.count === '10/10' && log.cards.every((c) => c.found), `?log=all: ${log.count}, every card found`);
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

// 8. Demo mode: gags come fast, unfound first, the bear anywhere; sightings go to a separate demo log.
console.log('\ndemo mode (times x0.1)');
const REAL = JSON.stringify({ v: 2, found: ['magpie'], camo: true, camoEarned: false });
await page.goto(ROOT + '?gags=1&idle=0.1', { waitUntil: 'networkidle' });
await page.evaluate(([p, l]) => {
  localStorage.clear();
  localStorage.setItem('rush-hour-rigs:v2', p);
  localStorage.setItem('rush-hour-rigs:log', l);
}, [DEMO, REAL]);
await page.reload({ waitUntil: 'networkidle' });
const demoLog = () => page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:demo-log') ?? '{"found":[]}').found);
const SCENES = '.magpie, .spotter, .worker-bent, .landowner, .bear-stage, .moose-peek, .gopher-stage, .geese-stage, .pumper-stage, .hotshot';
/** Opens a level in demo mode and waits until the demo log holds `want` entries. */
const demoVisit = async (tab, index, want, ms) => {
  await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
  await wait(200);
  await page.$eval(`.region-tab:nth-child(${tab})`, (t) => t.click());
  await wait(150);
  await page.$eval(`.level-btn[data-index="${index}"]`, (b) => b.click());
  const t0 = Date.now();
  const first = await page.waitForSelector(SCENES, { state: 'attached', timeout: 5000 }).then(() => Date.now() - t0).catch(() => null);
  while (Date.now() - t0 < ms && (await demoLog()).length < want) await wait(300);
  return { first, secs: (Date.now() - t0) / 1000 };
};
await page.$eval('.region-tab:nth-child(1)', (t) => t.click());
await page.$eval('.level-btn[data-index="0"]', (b) => b.click());
await watchToasts();
await page.$eval('.hud [data-act="levels"]', (b) => b.click());
let v = await demoVisit(1, 0, 8, 90000);
let found = await demoLog();
check(v.first !== null && v.first < 1500, `the first gag comes fast (${v.first}ms at x0.1, so about 5s for real)`);
check(found.slice(0, 4).join() === 'magpie,spotter,biffy,bear', `unfound first, in order: ${found.join(', ')}`);
check(found.length === 8 && found.includes('bear') && found.includes('gopher'), `Cardium 1 fills 8 of 10 in ${Math.round(v.secs)}s, the Bear among them (he can appear in any level)`);
v = await demoVisit(2, 0, 9, 30000);
check((await demoLog()).at(-1) === 'landowner', `Montney: the unfound landowner comes first (${Math.round(v.secs)}s)`);
t = await toasts();
v = await demoVisit(3, 0, 10, 30000);
found = await demoLog();
check(found.at(-1) === 'moose' && found.length === 10, `Duvernay: the moose completes the demo log (${found.length}/10)`);
await wait(2500);
t = await page.evaluate(() => window.__toasts.map((x) => x.text));
check(t.every((x) => !/New sighting/.test(x)) && t.some((x) => /^Demo sighting! Bear \(4\/10\)$/.test(x)), `toasts say "Demo sighting!" (${t.find((x) => /Bear/.test(x))})`);
check(t.some((x) => /Demo log complete!.*real log is unchanged/i.test(x)), `and at the end: "${t.at(-1)}"`);
check((await page.evaluate(() => localStorage.getItem('rush-hour-rigs:log'))) === REAL, 'the real log is exactly as it was (1/10)');
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), 'a full demo log does not unlock camo');
await page.$eval('.hud [data-act="levels"]', (b) => b.click());
await wait(200);
log = await openLog();
const tag = await page.$eval('.log-head h1', (h) => h.textContent);
check(log.count === '10/10' && /DEMO/.test(tag) && /don't count/.test(await page.$eval('.log-reward', (p) => p.textContent)), `demo mode on: the log page shows the demo log (${tag}, ${log.count})`);
await page.$eval('.log-head .back', (b) => b.click());
await wait(200);
await page.$eval('.gear', (g) => g.click());
await wait(200);
check(await page.$eval('[data-act="camo"]', (i) => i.disabled), 'Settings: camo still locked');
await page.$eval('[data-act="demo"]', (i) => i.click());
await page.$eval('[data-act="close"]', (b) => b.click());
await wait(250);
log = await openLog();
check(log.count === '1/10' && !/DEMO/.test(await page.$eval('.log-head h1', (h) => h.textContent)) && log.cards.find((c) => c.id === 'magpie').found, `demo mode off: the real log is back (${log.count}), demo log hidden`);
check((await demoLog()).length === 10, 'the demo log is kept for next time');
await page.$eval('.log-head .back', (b) => b.click());
await wait(200);
await page.$eval('.gear', (g) => g.click());
await wait(150);
await page.$eval('[data-act="reset"]', (b) => b.click());
await page.$eval('[data-act="wipe"]', (b) => b.click());
await wait(250);
check((await page.evaluate(() => [localStorage.getItem('rush-hour-rigs:log'), localStorage.getItem('rush-hour-rigs:demo-log')])).every((x) => x === null), 'Reset progress clears both logs');

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
