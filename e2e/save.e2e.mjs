// AN OLD SAVE KEEPS EVERYTHING (Playwright: WebKit at iPhone DPR 3, 390 x 844 and 375 x 812; Chromium at Galaxy S23 and Pixel sizes).
// `fixtures/live-save-de534ad.json` is a real save made on the LIVE build before Clearwater shipped. It is put into this
// build's storage, as a returning player's phone would have it, and the game must show all of it:
//  - hard hats on the level rows, the same levels and regions open, the Daily Pad streak, hints
//  - the Wildlife Log: the same sightings found (out of more now), the sound settings as they were
//  - Clearwater is there as a sixth tab, locked like any region not yet earned, with no "NEW LEASE OPEN" banner
//  - and after all that the storage is exactly what was saved: nothing rewritten, dropped or reset
//  - the "New version, tap to update" bar: shown, and a tap reloads with the save still whole
// Run with the dev server up (or URL=…): npm run test:e2e:save
import { chromium, webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import { REGIONS } from '../src/levels/regions.ts';
import { dayKey, streak } from '../src/ui/daily.ts';
import { LOG_ENTRIES } from '../src/ui/wildlife-log.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
// EVERY REAL SAVE WE HAVE, each made on a live build just before something shipped (make-live-save.mjs): the one from
// before Clearwater (de534ad, Oct 8) and the one from before 1.0.0, the October upgrade (ba54c2b, Oct 10). `ONLY=ba54c2b` runs one.
const FIXTURES = ['de534ad', 'ba54c2b'].filter((b) => !process.env.ONLY || process.env.ONLY === b);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const PHONES = [
  [webkit, 'iPhone (WebKit, 390 x 844, DPR 3)', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 }],
  [webkit, 'iPhone (WebKit, 375 x 812, DPR 3)', { viewport: { width: 375, height: 812 }, deviceScaleFactor: 3 }],
  [chromium, 'Galaxy S23 (Chromium, 360 x 780, DPR 3)', { viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true }],
  [chromium, 'Pixel (Chromium, 412 x 915, DPR 2.625)', { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true }],
];
const stored = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
// (All but the note of which level was last opened, kept for the feedback text: this test opens a level, so that one moves on.)

for (const build of FIXTURES) {
const fixture = JSON.parse(readFileSync(new URL(`./fixtures/live-save-${build}.json`, import.meta.url), 'utf8'));
const save = fixture.localStorage, progress = JSON.parse(save['rush-hour-rigs:v2']), log = JSON.parse(save['rush-hour-rigs:log']), audio = JSON.parse(save['rush-hour-rigs-audio']);
// (The phone's date is the day after the save's Daily Pad: on a later day the game rightly spends a Safety Stand-Down on
// the missed day and writes that down, which is not what this suite is about.)
const [Y, M, D] = progress.dailyCleared.at(-1).split('-').map(Number);
const changed = (now) => Object.keys(save).filter((k) => k !== 'rush-hour-rigs:last-level' && now[k] !== save[k]);
for (const [engine, name, opts] of PHONES) {
  console.log(`\n${name}: a save from live build ${fixture.build}`);
  const browser = await engine.launch();
  const context = await browser.newContext({ ...opts, hasTouch: true });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(Y, M - 1, D + 1, 12, 0, 0));
  const errors = [];
  // (Music is on in this save. A music file still being fetched when the page is reloaded is cut off by the reload itself: WebKit reports that as an error of the old page. It is not one of the game's.)
  page.on('pageerror', (e) => { if (!/audio\/music\/.*access control checks/.test(e.message)) errors.push(e.message); });
  await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, save);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.level-btn');
  await wait(500);

  // The level list: hard hats, locks, the streak, the tabs.
  const list = await page.evaluate(() => ({
    hats: [...document.querySelectorAll('.level-btn')].map((b) => b.querySelectorAll('.hats .on').length),
    open: [...document.querySelectorAll('.level-btn')].map((b) => !b.classList.contains('locked')),
    tabs: [...document.querySelectorAll('.region-tab')].map((t) => ({ name: t.querySelector('.rtext').textContent, locked: t.classList.contains('locked'), text: t.textContent.replace(/\s+/g, ' ').trim(), active: t.classList.contains('active') || t.getAttribute('aria-selected') === 'true' })),
    days: document.querySelector('.safety-sign')?.getAttribute('aria-label'),
    banner: !!document.querySelector('.lease-banner'),
    sideways: document.documentElement.scrollWidth > innerWidth,
  }));
  const cardium = REGIONS[0].levels;
  const wantHats = cardium.map((l) => (progress.best[l.id] === undefined ? 0 : progress.best[l.id] <= l.par ? 3 : progress.best[l.id] <= l.par + 3 ? 2 : 1));
  check(list.hats.join() === wantHats.join(), `hard hats on Cardium's rows as earned (${list.hats.join(' ')})`);
  const cleared = cardium.filter((l) => progress.best[l.id] !== undefined).length;
  check(list.open.join() === cardium.map((_, i) => i <= cleared).join(), `the same levels are open: Cardium 1 to ${cleared + 1}`);
  const days = streak(progress.dailyCleared, dayKey(new Date())).days;
  check(list.days === `Days without incident: ${days}`, `the streak sign reads what the saved Daily Pads make it today (${list.days})`);
  check(list.tabs.map((t) => t.name).join() === REGIONS.map((r) => r.name).join() && list.tabs.map((t) => t.locked).join() === ['false', 'false', ...REGIONS.slice(2).map(() => 'true')].join(), `${REGIONS.length} tabs; Cardium and Montney open as before, the rest locked (${list.tabs.map((t) => `${t.name}${t.locked ? ' locked' : ''}`).join(', ')})`);
  check(/Clear 5 more in Bakken/.test(list.tabs[5].text) && !list.banner, `Clearwater is locked like any region not yet earned ("${list.tabs[5].text}"), and no "NEW LEASE OPEN" banner shows`);
  check(!list.sideways, 'the list does not scroll sideways');

  // A level already cleared shows its hints (10 saved) and plays.
  await page.locator('.level-btn').nth(0).click();
  await page.waitForSelector('.board .truck');
  await wait(400);
  const hint = await page.evaluate(() => document.querySelector('.hint-btn')?.textContent.replace(/\s+/g, ' ').trim());
  check(new RegExp(progress.hints > 9 ? '9\\+' : String(progress.hints)).test(hint), `the saved hints are there (${progress.hints}: the button reads "${hint}")`);
  await page.locator('.hud [data-act="levels"]').click();
  await page.waitForSelector('.screen.levels .level-btn');

  // The Wildlife Log.
  await page.locator('.brand .binoculars').click();
  await page.waitForSelector('.log-card');
  await wait(400);
  const book = await page.evaluate(() => ({ count: document.querySelector('.log-count').textContent, found: [...document.querySelectorAll('.log-card.found')].map((c) => c.dataset.id), cards: document.querySelectorAll('.log-card').length }));
  check(book.count === `${log.found.length}/${LOG_ENTRIES.length}` && book.found.slice().sort().join() === log.found.slice().sort().join(), `the Wildlife Log has the same sightings found, out of more now (${book.count}: ${book.found.join(', ')})`);
  check(book.cards === LOG_ENTRIES.filter((e) => !e.hidden).length, `and a card for every entry, the newer ones included (${book.cards})`);
  await page.locator('.log-head .back').click();
  await page.waitForSelector('.screen.levels .level-btn');

  // Settings.
  await page.locator('.brand .gear').click();
  await wait(400);
  const set = await page.evaluate(() => ({ sfx: document.querySelector('.settings [data-act="sfx"]').checked, music: document.querySelector('.settings [data-act="music"]').checked, style: document.querySelector('.settings [role="radio"][aria-checked="true"]')?.dataset.style, demo: document.querySelector('.settings [data-act="demo"]').checked, version: [...document.querySelectorAll('.settings *')].map((e) => e.textContent.trim()).find((t) => /^Version \d/.test(t)) }));
  check(set.sfx === audio.sfx && set.music === audio.music && set.style === audio.style && !set.demo, `Settings as saved: Sound effects ${audio.sfx ? 'on' : 'off'}, Music ${audio.music ? 'on' : 'off'}, the ${audio.style} style, demo off (${JSON.stringify(set).slice(0, 80)})`);
  await page.locator('.settings [data-act="close"]').click();
  await wait(300);

  // Nothing in storage was touched by any of that.
  let now = await stored(page);
  check(changed(now).length === 0, `storage is exactly as saved: best scores, hints, perfect clears, Daily Pads, the log, the settings${changed(now).length ? ' BUT ' + changed(now).map((k) => `${k}: ${now[k]}`).join(' | ') : ''}`);

  // The update bar, for a returning player: shown on the level list; a tap reloads, and the save is still whole.
  await page.goto(`${ROOT}?cover=0&update=test`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.update-bar');
  const bar = await page.evaluate(() => { const e = document.querySelector('.update-bar'), r = e.getBoundingClientRect(); return { text: e.textContent.trim(), shown: getComputedStyle(e).display !== 'none' && r.width > 100, top: r.top }; });
  check(bar.shown && bar.text === 'New version, tap to update', `the update bar shows across the top: "${bar.text}"`);
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.locator('.update-bar').click()]);
  await page.waitForSelector('.screen.levels .level-btn');
  await wait(400);
  now = await stored(page);
  const hats = await page.$$eval('.level-btn', (bs) => bs.map((b) => b.querySelectorAll('.hats .on').length));
  check(changed(now).length === 0 && hats.join() === wantHats.join(), 'a tap on it reloads the page, and the save is still whole: the same storage, the same hard hats');
  check(errors.length === 0, `no script errors (${errors[0] ?? 'none'})`);
  await browser.close();
}
}
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
