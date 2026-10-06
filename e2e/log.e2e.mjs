// Wildlife Log test (Playwright, iPhone 13, Chromium), on the puppet gags. Gags unlock log entries
// the first time they fully play, with a toast at the top that never covers the board; the log
// page shows found cards (puppet still + caption) and silhouettes; every card is a puppet still (no
// sprite); finding them all unlocks camo pickups with a Settings switch; ?log=all previews
// everything without saving; demo mode keeps its own log; Reset progress clears both.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:log
import { DEMO, UNLOCKED } from './progress.mjs';
import { chromium, devices } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const ALL = ['magpie', 'spotter', 'moose', 'nearmiss', 'landowner', 'biffy', 'biffyB', 'marshmallow', 'geese', 'porcupine', 'lunch', 'sam', 'tongue', 'surveyor', 'deer', 'tourists', 'muskeg', 'cattrain', 'beaver', 'aurora', 'tumbleweed', 'pdogs', 'bale', 'cloud', 'night', 'bull', 'bear'];
const N = ALL.length;
// Night, Safety Sam and the other idle gags are kept out of the way; the idle cooldown is off.
const QUIET = 'night=0&cooldown=0&off=lunch,tongue,sam,porcupine';
const PROGRESS = UNLOCKED;

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
const fresh = async (query = '', log = null) => {
  await page.goto(ROOT + (query ? `${query}&${QUIET}` : `?${QUIET}`), { waitUntil: 'networkidle' });
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

const cardium = REGIONS.findIndex((r) => r.id === 'cardium');
// A Cardium level with a truck that can bump down into the bottom berm (the biffy's trigger).
const bumper = (l) => newGame(l).trucks.find((t) => t.orient === 'v' && t.row + t.length === 6 && getMoveRange(newGame(l), t.id)?.exitDelta !== 1);
const bumpLevel = REGIONS[cardium].levels.findIndex((l) => bumper(l));
const bumpId = bumper(REGIONS[cardium].levels[bumpLevel]).id;
const enter = async (ri, li) => {
  await page.$eval(`.region-tab:nth-child(${ri + 1})`, (b) => b.click());
  await page.$eval(`.level-btn[data-index="${li}"]`, (b) => b.click());
  await page.waitForSelector('.board .truck');
  await wait(400);
};
const bump = () =>
  page.evaluate(async (id) => {
    const el = document.querySelector(`.truck[data-id="${id}"]`);
    const r = el.getBoundingClientRect();
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    const x = r.x + r.width / 2;
    let y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 21, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown');
    for (let k = 0; k < 8; k++) { y += (2 * cell) / 8; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); }
    ev('pointerup');
  }, bumpId);

console.log('\nchromium iPhone 13');

// 1. A new player: the binoculars sit by the gear; the log is all silhouettes, and keeps its secrets.
await fresh();
const btn = await page.$eval('.binoculars', (b) => { const r = b.getBoundingClientRect(), g = document.querySelector('.gear').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), beside: Math.abs(r.top - g.top) < 8, label: b.getAttribute('aria-label') }; });
check(btn.w >= 44 && btn.h >= 44 && btn.beside, `binoculars button next to the gear (${btn.w}x${btn.h}, "${btn.label}")`);
let log = await openLog();
check(log.count === `0/${N}` && log.cards.length === N && log.cards.map((c) => c.id).join() === ALL.join() && log.cards.every((c) => !c.found && c.title === '???'), `${N} cards, one per gag in the game, none found (${log.count})`);
check(log.cards.every((c) => c.text === 'Not seen yet.'), 'unfound cards keep their secret in the game (hints show in demo mode only)');
const art = await page.$$eval('.log-card', (cs) => cs.map((c) => ({ id: c.dataset.id, puppet: !!c.querySelector('.art svg'), sprite: !!c.querySelector('.art img, .art .anim-still, .art [style*="background-image"]') })));
check(art.every((a) => a.puppet && !a.sprite), 'every card is a still of its own puppet: no sprite anywhere on the page');
check(!log.cards.some((c) => ['pumper', 'hotshot', 'gopher'].includes(c.id)), 'no cards for gags that are no longer in the game (the pumper, the old hot shot and gopher)');
const legend = await page.evaluate(() => { const cards = [...document.querySelectorAll('.log-card.legendary')]; return { ids: cards.map((c) => c.dataset.id).join(), tag: cards[0]?.querySelector('.legend-tag')?.textContent, border: cards[0] && getComputedStyle(cards[0]).borderTopColor }; });
check(legend.ids === 'bear' && legend.tag === 'LEGENDARY' && legend.border === 'rgb(184, 134, 11)', `the Bear's card: gold frame and "${legend.tag}" tag, even unfound`);
const silhouette = await page.$eval('.log-card.unfound .art', (a) => getComputedStyle(a).filter);
check(silhouette.includes('brightness(0)'), `as dark silhouettes (${silhouette})`);
await page.$eval('.log-head .back', (b) => b.click());
await wait(200);
check(!!(await page.$('.level-btn')), '"‹ Levels" goes back');

// 2. Play: tap a truck (the magpie), then slide a truck into a truck (the sleepy worker, who counts
// once he has dozed off): each a new sighting with a toast. (?bird=1 and ?nap=1 win their rolls.)
await fresh('?bird=1&nap=1&night=0');
await enter(cardium, 5);
await watchToasts();
await page.evaluate(() => {
  const el = document.querySelector('.truck'); const r = el.getBoundingClientRect();
  for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(type, { pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true, buttons: type === 'pointerdown' ? 1 : 0 }));
});
// The magpie's gag runs about 12 s. Then a truck parked against another truck is pushed into it.
await page.waitForFunction(() => window.__toasts.length >= 1, null, { timeout: 30000 }).catch(() => {});
await wait(1500);
{
  const s0 = newGame(REGIONS[cardium].levels[5]);
  const at = (row, col) => s0.trucks.find((t) => (t.orient === 'h' ? t.row === row && col >= t.col && col < t.col + t.length : t.col === col && row >= t.row && row < t.row + t.length));
  let pick = null;
  for (const t of s0.trucks) for (const d of [1, -1]) {
    const far = d === 1 ? t.length : -1;
    const [row, col] = t.orient === 'h' ? [t.row, t.col + far] : [t.row + far, t.col];
    if (!pick && row >= 0 && row < 6 && col >= 0 && col < 6 && at(row, col)) pick = { id: t.id, dx: t.orient === 'h' ? d : 0, dy: t.orient === 'v' ? d : 0 };
  }
  await page.evaluate(async ([id, dx, dy]) => {
    const el = document.querySelector(`.truck[data-id="${id}"]`); const r = el.getBoundingClientRect();
    let x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 12, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown'); for (let k = 0; k < 8; k++) { x += dx * 12; y += dy * 12; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); } ev('pointerup');
  }, [pick.id, pick.dx, pick.dy]);
}
await page.waitForFunction(() => window.__toasts.length >= 2 && window.__toasts.every((t) => t.gone), null, { timeout: 60000 }).catch(() => {});
let t = await toasts();
check(t[0]?.text === `New sighting! Magpie (1/${N})`, `toast: "${t[0]?.text}"`);
check(t[1]?.text === `New sighting! Sleepy Worker (2/${N})`, `toast: "${t[1]?.text}"`);
check(t.length >= 1 && t.every((x) => x.bottom <= x.boardTop), `toasts sit above the board (${t.map((x) => `${Math.round(x.bottom)}<=${Math.round(x.boardTop)}`).join(', ')})`);
check(t.length >= 1 && t.every((x) => x.ms && x.ms >= 1900 && x.ms <= 2300), `each disappears after 2 seconds (${t.map((x) => Math.round(x.ms)).join(', ')}ms)`);
await page.$eval('.hud [data-act="levels"]', (b) => b.click());
await wait(200);
log = await openLog();
const magpie = log.cards.find((c) => c.id === 'magpie');
check(log.count === `2/${N}` && magpie.found && magpie.title === 'Magpie' && magpie.text === 'Never park under a tree.', `the log fills in: ${log.count}, "${magpie.title}: ${magpie.text}"`);
check(log.cards.find((c) => c.id === 'spotter').text === 'On the clock. Allegedly.', 'Sleepy Worker: "On the clock. Allegedly."');

// 3. The last sighting: celebration, and every pickup goes camo.
await fresh('', JSON.stringify({ v: 3, found: ALL.filter((id) => id !== 'biffy'), camo: true, camoEarned: false }));
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), `no camo with ${N - 1} of ${N}`);
await enter(cardium, bumpLevel);
await watchToasts();
await bump();
await page.waitForFunction(() => window.__toasts.length >= 2, null, { timeout: 15000 }).catch(() => {});
await wait(300);
t = await toasts();
check(t[0]?.text === `New sighting! Occupied (${N}/${N})`, `one bump into the bottom berm, Biffy A plays; toast: "${t[0]?.text}"`);
check(/Wildlife Log complete!.*Camo pickups unlocked/.test(t[1]?.text ?? ''), `then the celebration: "${t[1]?.text}"`);
check(t[1] && t[1].bottom <= t[1].boardTop, 'which stays above the board too');
check(await page.evaluate(() => document.body.classList.contains('camo-pickups')), 'camo pickups on');
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:log')));
check(saved.found.length === N && saved.v === 3, `saved: ${saved.found.length}/${N}`);

// 3b. A log from before the sprite gags were retired: their sightings are dropped; camo already earned is kept.
await fresh('', JSON.stringify({ v: 2, found: ['magpie', 'spotter', 'biffy', 'landowner', 'bear', 'moose', 'hotshot', 'gopher', 'geese', 'pumper'], camo: true, camoEarned: true }));
check(await page.evaluate(() => document.body.classList.contains('camo-pickups')), 'camo earned under the old log is kept');
log = await openLog();
check(log.count === `7/${N}` && log.cards.filter((c) => c.found).map((c) => c.id).join() === 'magpie,spotter,moose,landowner,biffy,geese,bear', `the old log shows ${log.count}: the pumper, hot shot and gopher sightings are gone, the rest carry over`);
// 3c. But those seven found now, with no camo earned, are not enough.
await fresh('', JSON.stringify({ v: 3, found: ['magpie', 'spotter', 'biffy', 'landowner', 'bear', 'moose', 'geese'], camo: true, camoEarned: false }));
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), 'seven of fifteen: no camo yet');

// 4. Settings switch: on by default once earned; off hides the camo, and it's remembered.
await fresh('', JSON.stringify({ v: 3, found: ALL, camo: true, camoEarned: true }));
await enter(cardium, 0);
// (The camo is the pickup's own sprite in camo, in its own gate colour: `pickup-<colour>-camo`.)
const camoShown = () => page.$$eval('.truck[data-kind="pickup"]', (ts) => ts.length > 0 && ts.every((t) => { const i = t.querySelector('img.sprite'); const colour = [...t.classList].find((c) => c.startsWith('c-')).slice(2); return i.complete && i.naturalWidth > 0 && i.currentSrc.includes(`pickup-${colour}-camo`) && t.classList.contains('sprite-on'); })).catch(() => null);
check((await camoShown()) === true, 'every pickup wears camo in play, each in its own gate colour');
const kinds = await page.$$eval('.truck', (ts) => ts.filter((x) => x.dataset.kind !== 'pickup').map((x) => x.querySelector('img.sprite').currentSrc));
check(kinds.every((d) => !d.includes('camo')), 'other trucks stay as they are');
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
const locked = await page.$eval('[data-act="camo"]', (i) => ({ disabled: i.disabled, shown: i.closest('label').offsetParent !== null, label: i.closest('label').textContent.trim() }));
check(locked.disabled && locked.shown && new RegExp(`Find all ${N}`).test(locked.label), `locked until the log is complete ("${locked.label.replace(/\s+/g, ' ')}")`);

// 6. ?log=all previews the full log and camo, without touching the saved log.
await fresh('?log=all', JSON.stringify({ v: 3, found: ['magpie'], camo: true }));
log = await openLog();
check(log.count === `${N}/${N}` && log.cards.every((c) => c.found), `?log=all: ${log.count}, every card found`);
check(log.cards.find((c) => c.id === 'moose').text === 'Just checking in.' && log.cards.find((c) => c.id === 'tongue').text === 'HEWP!', 'with captions');
check(await page.evaluate(() => document.body.classList.contains('camo-pickups')), 'and camo pickups');
check((await page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:log')).found)).join() === 'magpie', 'the real log is untouched');

// 7. Reset progress clears the log.
await fresh('', JSON.stringify({ v: 3, found: ALL, camo: true, camoEarned: true }));
await page.$eval('.gear', (g) => g.click());
await wait(150);
await page.$eval('[data-act="reset"]', (b) => b.click());
await page.$eval('[data-act="wipe"]', (b) => b.click());
await wait(250);
check((await page.evaluate(() => localStorage.getItem('rush-hour-rigs:log'))) === null, 'Reset progress clears the log');
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), 'and the camo');

// 8. Demo mode: every card shows how to find its gag; sightings go to a separate demo log.
console.log('\ndemo mode');
const REAL = JSON.stringify({ v: 3, found: ['magpie'], camo: true, camoEarned: false });
await page.goto(ROOT + `?magpie=0&worker=0&${QUIET}`, { waitUntil: 'networkidle' });
await page.evaluate(([p, l]) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); localStorage.setItem('rush-hour-rigs:log', l); }, [DEMO, REAL]);
await page.reload({ waitUntil: 'networkidle' });
const demoLog = () => page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:demo-log') ?? '{"found":[]}').found);
log = await openLog();
const hints = Object.fromEntries(log.cards.map((c) => [c.id, c.text]));
check(log.count === `0/${N}` && hints.magpie === 'Tap a truck without dragging it. He may fly in.' && hints.biffy === 'Bump a truck into the bottom berm.' && hints.bear === 'In Duvernay, tap the snowy bush three times. He comes one time in three.' && log.cards.every((c) => c.text.length > 10 && c.text !== 'Not seen yet.'), 'demo mode: the demo log starts empty and every card shows its hint');
await page.$eval('.log-head .back', (b) => b.click());
await wait(200);
await enter(cardium, bumpLevel);
await watchToasts();
await bump();
await page.waitForFunction(() => window.__toasts.length >= 1, null, { timeout: 15000 }).catch(() => {});
t = await toasts();
check(t[0]?.text === `Demo sighting! Occupied (1/${N})` && t.every((x) => !/New sighting/.test(x.text)), `toasts say "Demo sighting!" ("${t[0]?.text}")`);
check((await demoLog()).join() === 'biffy', 'the sighting went to the demo log');
check((await page.evaluate(() => localStorage.getItem('rush-hour-rigs:log'))) === REAL, 'the real log is exactly as it was');
check(!(await page.evaluate(() => document.body.classList.contains('camo-pickups'))), 'demo sightings never unlock camo');
await page.$eval('.hud [data-act="levels"]', (b) => b.click());
await wait(200);
log = await openLog();
const tag = await page.$eval('.log-head h1', (h) => h.textContent);
check(log.count === `1/${N}` && /DEMO/.test(tag) && /don't count/.test(await page.$eval('.log-reward', (p) => p.textContent)), `demo mode on: the log page shows the demo log (${tag}, ${log.count})`);
await page.$eval('.log-head .back', (b) => b.click());
await wait(200);
await page.$eval('.gear', (g) => g.click());
await wait(200);
check(await page.$eval('[data-act="camo"]', (i) => i.disabled), 'Settings: camo still locked');
await page.$eval('[data-act="demo"]', (i) => i.click());
await page.$eval('[data-act="close"]', (b) => b.click());
await wait(250);
log = await openLog();
check(log.count === `1/${N}` && !/DEMO/.test(await page.$eval('.log-head h1', (h) => h.textContent)) && log.cards.find((c) => c.id === 'magpie').found && !log.cards.find((c) => c.id === 'biffy').found, `demo mode off: the real log is back (${log.count}), demo log hidden`);
check((await demoLog()).length === 1, 'the demo log is kept for next time');
await page.$eval('.log-head .back', (b) => b.click());
await wait(200);
await page.$eval('.gear', (g) => g.click());
await wait(150);
await page.$eval('[data-act="reset"]', (b) => b.click());
await page.$eval('[data-act="wipe"]', (b) => b.click());
await wait(250);
check((await page.evaluate(() => [localStorage.getItem('rush-hour-rigs:log'), localStorage.getItem('rush-hour-rigs:demo-log')])).every((x) => x === null), 'Reset progress clears both logs');

// Night Shift: an idle Montney level goes fully dark, and that is a sighting like any gag's.
// (?idle=0.1 makes the 30 s wait 3 s; the fade itself takes its 4 s.)
{
  const montney = REGIONS.findIndex((r) => r.id === 'montney');
  await page.goto(ROOT + '?idle=0.1&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&off=sam', { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, PROGRESS);
  await page.reload({ waitUntil: 'networkidle' });
  await enter(montney, 2);
  await watchToasts();
  await page.waitForFunction(() => document.querySelector('.screen.game.night, .game.night, .night'), null, { timeout: 8000 }).catch(() => {});
  const early = (await toasts()).length;
  await page.waitForFunction(() => window.__toasts.length >= 1, null, { timeout: 9000 }).catch(() => {});
  const t = (await toasts())[0];
  const shade = await page.evaluate(() => +getComputedStyle(document.querySelector('.night-shade')).opacity);
  check(early === 0 && t?.text === `New sighting! Night Shift (1/${N})` && shade > 0.97, `an idle Montney level goes fully dark: "${t?.text}" (no toast while it was still fading; the shade is at ${shade})`);
  check(t && t.bottom <= t.boardTop, 'the toast sits above the board');
  check(JSON.parse(await page.evaluate(() => localStorage.getItem('rush-hour-rigs:log'))).found.includes('night'), 'saved in the log');
  await page.$eval('.hud [data-act="levels"]', (b) => b.click());
  await wait(250);
  const l = await openLog();
  const card = l.cards.find((c) => c.id === 'night');
  check(card.found && card.title === 'Night Shift' && card.text === 'Lights out on the lease.' && l.count === `1/${N}`, `its card: ${card.title}, "${card.text}" (${l.count})`);
  // No card's picture is stretched: each is drawn at its own drawing's shape, inside the art box.
  for (const w of [375, 430]) {
    await page.setViewportSize({ width: w, height: 800 });
    await wait(200);
    const arts = await page.evaluate(() => [...document.querySelectorAll('.log-card')].map((c) => {
      const box = c.querySelector('.art').getBoundingClientRect(); const name = c.querySelector('h2').getBoundingClientRect();
      return [...c.querySelectorAll('.art svg')].filter((s) => !s.parentElement.closest('svg')).map((s) => {
        const r = s.getBoundingClientRect(); const vb = s.viewBox.baseVal;
        return { id: c.dataset.id, off: Math.abs(r.width / r.height / (vb.width / vb.height) - 1), in: r.left >= box.left - 1 && r.right <= box.right + 1, clear: getComputedStyle(s).overflow !== 'visible' ? r.bottom <= name.top + 1 : true, par: s.getAttribute('preserveAspectRatio') };
      });
    }).flat());
    const bad = arts.filter((a) => a.off > 0.02 || !a.in || !a.clear || /none/.test(a.par ?? ''));
    check(arts.length >= N && bad.length === 0, `${w} wide: all ${N} cards' pictures keep their own shape, inside their box${bad.length ? ` (wrong: ${bad.map((a) => `${a.id} ${a.off.toFixed(2)}`).join(', ')})` : ''}`);
  }
  await page.setViewportSize({ width: 390, height: 664 });
  const roll = await page.evaluate(() => ({ biffy: document.querySelector('.log-card[data-id="biffy"] .art svg').getBoundingClientRect().toJSON(), roll: !!document.querySelector('.log-card[data-id="biffyB"] .art svg.roll-still') }));
  check(roll.roll && roll.biffy.width / roll.biffy.height > 0.7, `Occupied is ${Math.round(roll.biffy.width)} x ${Math.round(roll.biffy.height)} (not tall and skinny); The Runaway Roll is one big roll`);
  await page.$eval('.log-head .back', (b) => b.click());
  await wait(200);
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
