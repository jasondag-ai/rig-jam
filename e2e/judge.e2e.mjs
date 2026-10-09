// JUDGE-PROOFING (Jay, Oct 8): somebody opening the link cold, on a laptop or a phone, gets it in ten seconds.
//  1. DESKTOP, Chrome's and Safari's engines at 1440 x 900 and 1280 x 720, with a MOUSE: a fresh visitor sees the
//     cover (never a blank page), one click and level 1 is up with the ghost finger, inside 10 s; the lease is
//     centred, square, whole on the screen; trucks follow the mouse and the level is cleared by dragging; one click
//     on each button does its job. Screenshots of every step go to ~/Desktop/RHR Art Inbox/qc/judge/.
//  2. SHARE: the Daily Pad's result is copied and pastes cleanly (the exact text, read back and pasted into a box),
//     on a desktop and on a phone.
//  3. SETTINGS carries the credit line, and still fits a phone with no scrolling.
//  4. `?demo=1` (hidden): every region and level open, the Wildlife Log complete, and NOTHING saved.
//  5. A page whose script never arrives says so and offers Reload: no white screen.
// Needs a running dev server (or URL=…).
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DAILY_LEVELS, REGIONS } from '../src/levels/regions.ts';
import { newGame, solve, tryMove } from '../src/engine/index.ts';
import { dayKey, padLevelIndex, padNumber, shareText } from '../src/ui/daily.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'qc', 'judge');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
// (No sighting may walk into a screenshot or a timing: every roll is pinned off.)
const QUIET = 'night=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&soundnudge=0&off=sam,nearmiss,landowner,biffya,biffyb';
const plan = (level) => { let s = newGame(level); return solve(level).map((m) => { const r = tryMove(s, m.id, m.delta); s = r.state; return { ...m, out: r.exited }; }); };
const box = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel);

/** Drags a truck with the REAL mouse, the way a judge at a laptop does. Returns how far it had followed half way. */
async function mouseDrag(page, m) {
  const t = await page.evaluate((id) => { const e = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`), r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: e.classList.contains('horiz'), cell: parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')) }; }, m.id);
  const by = (m.delta + (m.out ? Math.sign(m.delta) * 0.5 : 0)) * t.cell;
  const to = { x: t.x + (t.h ? by : 0), y: t.y + (t.h ? 0 : by) };
  await page.mouse.move(t.x, t.y);
  await page.mouse.down();
  await page.mouse.move((t.x + to.x) / 2, (t.y + to.y) / 2, { steps: 6 });
  const mid = await page.evaluate((id) => { const r = document.querySelector(`.truck[data-id="${id}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, m.id);
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await wait(m.out ? 950 : 420);
  return Math.hypot(mid.x - t.x, mid.y - t.y) / Math.abs(by / 2);
}

// ---------- 1. Desktop, a fresh visitor with a mouse ----------
for (const [name, engine] of [['chrome', chromium], ['safari', webkit]]) {
  const browser = await engine.launch();
  for (const [W, H] of [[1440, 900], [1280, 720]]) {
    console.log(`\n${name} ${W} x ${H}: a fresh visitor with a mouse`);
    const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: false });
    const page = await context.newPage();
    const noise = [];
    page.on('pageerror', (e) => noise.push(`error: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') noise.push(`console: ${m.text()}`); });
    const shot = (n) => page.screenshot({ path: join(OUT, `${name}_${W}x${H}_${n}.png`) });
    // (An automated browser skips the cover unless asked: `cover=1` is what a real visitor gets.)
    const t0 = Date.now();
    await page.goto(`${ROOT}?cover=1&${QUIET}`, { waitUntil: 'commit' });
    await page.waitForSelector('.screen.cover');
    const coverAt = Date.now() - t0;
    const stored = await page.evaluate(() => localStorage.length);
    await page.waitForFunction(() => { const i = document.querySelector('.screen.cover img'); return !i || (i.complete && i.naturalWidth > 0); }, null, { timeout: 5000 }).catch(() => {});
    await wait(900);
    await shot('1_cover');
    const cover = await page.evaluate(() => ({ boot: !!document.getElementById('boot'), img: (() => { const i = document.querySelector('.screen.cover img'); return !!i && i.naturalWidth > 0; })(), w: document.querySelector('.screen.cover').getBoundingClientRect().width }));
    check(stored === 0 && !cover.boot && cover.img && cover.w >= W - 1, `nothing saved yet; the cover is up ${coverAt} ms after the page starts, its picture loaded, across the whole window (no blank page)`);
    const t1 = Date.now();
    await page.mouse.click(W / 2, H / 2);
    await page.waitForSelector('.board .ghost-finger', { timeout: 8000 }).catch(() => {});
    await page.waitForSelector('.board .truck.sprite-on', { timeout: 8000 }).catch(() => {});
    const playable = Date.now() - t1;
    const hud = await page.evaluate(() => document.querySelector('.hud')?.textContent ?? '');
    check(!!(await page.$('.board .ghost-finger')) && /Cardium 1/i.test(hud.replace(/\s+/g, ' ')) && coverAt + playable < 10000, `ONE click and level 1 is up with the ghost finger (${playable} ms after the click; ${coverAt + playable} ms of waiting in all, under 10 s)`);
    await wait(700);
    await shot('2_level1');
    const b = await box(page, '.board'), ctl = await box(page, '.controls'), hd = await box(page, '.hud'), app = await box(page, '#app');
    check(Math.abs(b.x + b.w / 2 - W / 2) <= 1 && Math.abs(b.w - b.h) <= 1 && b.y >= 0 && b.b <= H && b.w >= 400 && b.w <= 560, `the lease is centred (${(b.x + b.w / 2 - W / 2).toFixed(1)} px off the middle), square (${Math.round(b.w)} x ${Math.round(b.h)}) and whole on the screen: not stretched`);
    check(ctl.b <= H + 0.5 && hd.y >= -0.5 && ctl.x >= app.x - 0.5 && ctl.r <= app.x + app.w + 0.5 && (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)), 'the HUD and the three buttons are on the screen with it; nothing scrolls');
    const cursor = await page.evaluate(() => getComputedStyle(document.querySelector('.truck')).cursor);
    const level = REGIONS[0].levels[0];
    const follows = [];
    for (const m of plan(level)) follows.push(await mouseDrag(page, m));
    await page.waitForSelector('.win-card, .card.win, .win', { timeout: 6000 }).catch(() => {});
    await wait(1400);
    const won = await page.evaluate(() => !!document.querySelector('[data-act="next"]') && !document.querySelector('.board .truck:not(.exiting)'));
    check(cursor === 'grab' && follows.every((f) => f > 0.6) && won, `the mouse drags like a finger: a grab cursor, each truck under the pointer half way through its drag (${follows.map((f) => Math.round(f * 100) + '%').join(', ')}), and the level is cleared`);
    await shot('3_win');
    const fitsCard = await page.evaluate(() => { const r = document.querySelector('[data-act="next"]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    await page.locator('[data-act="next"]').click();
    await page.waitForFunction(() => /Cardium 2/i.test((document.querySelector('.hud')?.textContent ?? '').replace(/\s+/g, ' ')), null, { timeout: 5000 }).catch(() => {});
    check(fitsCard && /Cardium 2/i.test(((await page.evaluate(() => document.querySelector('.hud')?.textContent)) ?? '').replace(/\s+/g, ' ')), 'the win card is whole on the screen and ONE click on Next level opens level 2 (no dead click)');
    await page.locator('.hud [data-act="levels"]').click();
    await page.waitForSelector('.screen.levels');
    await wait(500);
    await shot('4_levels');
    const list = await page.evaluate(() => { const a = document.querySelector('#app').getBoundingClientRect(), s = document.querySelector('.screen.levels').getBoundingClientRect(); return { centred: Math.abs(a.left + a.width / 2 - innerWidth / 2) <= 1, w: s.width, rows: document.querySelectorAll('.level-btn').length, sideways: document.documentElement.scrollWidth > innerWidth }; });
    check(list.centred && list.rows === 10 && !list.sideways, `the level list stands in the middle of the window, ${Math.round(list.w)} px wide, its ten rows there, no sideways scroll`);
    await page.locator('.gear').click();
    await page.waitForSelector('.settings');
    await wait(300);
    await shot('5_settings');
    // (A window 720 px tall is shorter than the panel: the line is there to be scrolled to, as the version always was.)
    const credit = await page.evaluate(() => { const e = document.querySelector('.settings .app-credit'); e?.scrollIntoView({ block: 'end' }); const r = e?.getBoundingClientRect(); return { text: e?.textContent, seen: !!r && r.height > 0 && r.bottom <= innerHeight + 0.5 && r.top >= 0 }; });
    check(credit.text === 'Built by Jay Dagenais, directing AI (Claude)' && credit.seen, `Settings carries the credit line${H < 800 ? ' (a scroll away in a window this short)' : ', on the screen'}: "${credit.text}"`);
    check(noise.length === 0, `a clean console (${noise[0] ?? 'nothing'})`);
    await context.close();
  }
  await browser.close();
}

// ---------- 1b. A short desktop window still has its bottom strip, and the strip's sightings play there ----------
// (At 1280 x 720 the lease used to fill the stage's whole height: no strip, no sightings. It is now just small
// enough to leave one. A taller window is as it was.)
for (const [name, engine] of [['chrome', chromium], ['safari', webkit]]) {
  const browser = await engine.launch();
  console.log(`\n${name} 1280 x 720: the bottom strip and its sightings`);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: false });
  const page = await context.newPage();
  await page.goto(`${ROOT}?cover=0&demo=1&night=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&soundnudge=0`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.screen.levels');
  const enter = async (r) => { if (await page.$('.hud [data-act="levels"]')) { await page.locator('.hud [data-act="levels"]').click(); await page.waitForSelector('.screen.levels'); } await page.locator('.region-tab').nth(r).click(); await page.locator('.level-btn').nth(2).click(); await page.waitForSelector('.board .truck.sprite-on'); await wait(600); };
  const strip = () => page.evaluate(() => { const g = (s) => document.querySelector(s).getBoundingClientRect(); const b = g('.board'), n = g('.note'), h = g('.hud'); return { board: b.width, square: Math.abs(b.width - b.height) <= 1, centred: Math.abs(b.left + b.width / 2 - innerWidth / 2) <= 1, strip: n.top - b.bottom, sky: b.top - h.bottom }; });
  /** Clicks a prop (with the mouse) and watches its sighting: does it come on the screen, and does it keep to the strip? */
  const sighting = async (gag, sel, clicks) => {
    const at = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
    for (let k = 0; k < clicks; k++) { await page.mouse.click(at.x, at.y); await wait(160); }
    await page.waitForSelector(`.strip-layer[data-gag="${gag}"]`, { state: 'attached', timeout: 6000 }).catch(() => {});
    return page.evaluate(([gag]) => new Promise((done) => { const t0 = performance.now(); let seen = false, top = Infinity, bottom = -Infinity; const pad = document.querySelector('.board .pad').getBoundingClientRect(), note = document.querySelector('.note').getBoundingClientRect();
      const tick = () => { for (const el of document.querySelectorAll(`.strip-layer[data-gag="${gag}"] svg.pup > *, .strip-layer[data-gag="${gag}"] g.pup > *`)) { if (el.tagName === 'clipPath' || el.hasAttribute('data-fx')) continue; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (r.width < 2 || r.right < 4 || r.left > innerWidth - 4 || cs.visibility === 'hidden') continue; seen = true; top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); }
        if (performance.now() - t0 > 3500) return done({ on: !!document.querySelector(`.strip-layer[data-gag="${gag}"]`) || seen, seen, overPad: Math.round(pad.bottom - top), overNote: Math.round(bottom - note.top) }); requestAnimationFrame(tick); }; tick(); }), [gag]);
  };
  await enter(0);
  const c = await strip();
  check(c.strip >= 80 && c.sky >= 6 && c.square && c.centred && c.board >= 400, `Cardium: a strip of ${Math.round(c.strip)} px under a lease of ${Math.round(c.board)} px, still square and centred, ${Math.round(c.sky)} px of sky over it; the biffy, the bush, the sign and the mound stand in it (${await page.evaluate(() => ['.biffy-layer svg', '.bush-layer svg', '.sign-layer svg', '[data-anchor="mound"]'].filter((q) => { const r = document.querySelector(q)?.getBoundingClientRect(); return r && r.height > 8 && r.bottom <= document.querySelector('.note').getBoundingClientRect().top + 4; }).length)} of 4)`);
  const deer = await sighting('deer', '.sign-layer svg', 1);
  check(deer.seen && deer.overPad <= 0 && deer.overNote <= 4, `a click on the lease sign: Back Scratcher plays in the strip (${deer.seen ? `${-deer.overPad} px clear of the pad` : 'NOT SEEN'})`);
  await enter(0);
  const porc = await sighting('porcupine', '.bush-layer svg', 3);
  check(porc.seen && porc.overPad <= 0 && porc.overNote <= 4, `three clicks on the bush: Porcupine plays in the strip (${porc.seen ? 'seen' : 'NOT SEEN'})`);
  await enter(3);
  const m = await strip();
  const beaver = await sighting('beaver', '.mann-front svg svg', 3);
  check(m.strip >= 62 && beaver.seen && beaver.overNote <= 4, `Mannville: a strip of ${Math.round(m.strip)} px, and three clicks on the tall aspen bring the Beaver (${beaver.seen ? 'seen' : 'NOT SEEN'})`);
  await enter(5);
  const w = await strip();
  // (Under the demo link the log is complete, so the rig mats give the second of their pair, Out Cold.)
  const golf = await sighting('cold', '.clear-mats .cw-mats', 3);
  check(w.strip >= 62 && golf.seen && golf.overPad <= 0 && golf.overNote <= 4, `Clearwater: a strip of ${Math.round(w.strip)} px, and three clicks on the rig mats bring Out Cold (${golf.seen ? 'seen' : 'NOT SEEN'})`);
  await page.screenshot({ path: join(OUT, `${name}_1280x720_6_strip_sighting.png`) });
  await context.close();
  // And a taller window is exactly as it was: the lease as wide as the column allows.
  const tall = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: false });
  const tp = await tall.newPage();
  await tp.goto(`${ROOT}?cover=0&demo=1&night=0`, { waitUntil: 'networkidle' });
  await tp.locator('.level-btn').nth(2).click();
  await tp.waitForSelector('.board .truck.sprite-on');
  check(Math.round((await box(tp, '.board')).w) === 528, 'at 1440 x 900 the lease is 528 px, as before');
  await browser.close();
}

// ---------- 2. Share: the Daily Pad's result, copied and pasted ----------
const daily = DAILY_LEVELS[padLevelIndex(padNumber(dayKey(new Date())), DAILY_LEVELS.length)];
for (const [name, engine, opts] of [['a desktop (Chrome)', chromium, { viewport: { width: 1280, height: 720 }, hasTouch: false, permissions: ['clipboard-read', 'clipboard-write'] }], ['a phone (Chrome, 390 x 844)', chromium, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] }], ['an iPhone (Safari, 390 x 664)', webkit, { viewport: { width: 390, height: 664 }, hasTouch: true, deviceScaleFactor: 3 }]]) {
  console.log(`\nShare on ${name}`);
  const browser = await engine.launch();
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  await page.goto(`${ROOT}?cover=0&${QUIET}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.screen.levels');
  await page.locator('.daily-btn').click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(500);
  const moves = plan(daily);
  for (const m of moves) await mouseDrag(page, m);
  await page.waitForSelector('[data-act="share"]', { timeout: 8000 });
  await wait(1200);
  const want = shareText({ pad: padNumber(dayKey(new Date())), moves: moves.length, par: daily.par, hats: 3, zeroIncident: true, streak: 1 });
  await page.locator('[data-act="share"]').click();
  await wait(400);
  const label = await page.locator('[data-act="share"]').textContent();
  if (engine === chromium) {
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    // Pasted into a plain text box, as into a chat: the same lines, nothing added, nothing lost.
    await page.evaluate(() => { const a = document.createElement('textarea'); a.id = 'paste-here'; a.style.cssText = 'position:fixed;left:8px;top:8px;width:300px;height:140px;z-index:99999;user-select:text;-webkit-user-select:text'; document.body.append(a); a.focus(); });
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
    await wait(200);
    const pasted = await page.evaluate(() => document.getElementById('paste-here').value);
    check(copied === want && label === 'Copied! Paste it anywhere.', `Share copies the result exactly, and says so ("${label}"): ${JSON.stringify(copied)}`);
    check(pasted === want && want.split('\n').length >= 4 && want.endsWith('https://jasondag-ai.github.io/rush-hour-rigs/'), `and it pastes cleanly into a text box: ${want.split('\n').length} plain lines, the link last`);
  } else {
    check(label === 'Copied! Paste it anywhere.', `Share says it copied ("${label}"; Safari's engine lets no script read the clipboard back)`);
  }
  await browser.close();
}

// ---------- 3. Settings still fits a phone ----------
{
  console.log('\nSettings on a phone (WebKit 390 x 844), with the credit line');
  const browser = await webkit.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await page.goto(`${ROOT}?cover=0&${QUIET}`, { waitUntil: 'networkidle' });
  await page.locator('.gear').click();
  await page.waitForSelector('.settings');
  await wait(300);
  const s = await page.evaluate(() => { const p = document.querySelector('.settings'), c = p.querySelector('.app-credit').getBoundingClientRect(), v = p.querySelector('.app-version').getBoundingClientRect(), first = p.querySelector('.step:not([hidden]) > *').getBoundingClientRect(); return { scrolled: (p.closest('.overlay') ?? p).scrollTop > 0, top: first.top >= 0, credit: c.bottom <= innerHeight && c.height > 0, version: v.bottom <= innerHeight, order: c.bottom <= v.top + 1 }; });
  check(!s.scrolled && s.top && s.credit && s.version && s.order, 'the whole panel, the credit line and the version under it, is on the screen with no scrolling');
  await page.screenshot({ path: join(OUT, 'phone_390x844_settings.png') });
  await browser.close();
}

// ---------- 4. ?demo=1: everything open, nothing saved ----------
{
  console.log('\n?demo=1 (hidden), a fresh browser (WebKit 390 x 844)');
  const browser = await webkit.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`${ROOT}?cover=0&demo=1&${QUIET}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.screen.levels');
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.region-tab:not(.fake)')].map((t) => [t.textContent.trim(), t.classList.contains('locked')]));
  check(tabs.length === REGIONS.length && tabs.every(([, locked]) => !locked), `every region is open: ${tabs.map(([n]) => n).join(', ')}`);
  await page.locator('.region-tab').nth(REGIONS.length - 1).click();
  await wait(300);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.level-btn')].map((b) => b.classList.contains('locked')));
  check(rows.length === 10 && rows.every((l) => !l), `and every level of the last one (${REGIONS.at(-1).name})`);
  await page.locator('.binoculars').click();
  await page.waitForSelector('.log-card');
  const log = await page.evaluate(() => ({ cards: document.querySelectorAll('.log-card').length, found: document.querySelectorAll('.log-card.found').length, tag: !!document.querySelector('.demo-tag'), camo: document.body.classList.contains('camo-pickups') }));
  check(log.cards > 30 && log.found === log.cards && !log.tag && !log.camo, `the Wildlife Log is complete (${log.found} of ${log.cards} cards in colour), with no DEMO label, and the trucks keep their own paint`);
  // Play a level, change a setting, then look at what the browser REALLY holds (a second page, without the link).
  await page.goto(`${ROOT}?cover=0&demo=1&${QUIET}`, { waitUntil: 'networkidle' });
  await page.locator('.level-btn').nth(0).click();
  await page.waitForSelector('.board .truck.sprite-on');
  for (const m of plan(REGIONS[0].levels[0])) await mouseDrag(page, m);
  await page.waitForSelector('[data-act="next"]', { timeout: 6000 });
  const inMemory = await page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:v2') ?? '{}').best ?? {});
  const other = await context.newPage();
  await other.goto(`${ROOT}?cover=0&${QUIET}`, { waitUntil: 'networkidle' });
  // (A plain visit to the level list notes the region it shows, `rush-hour-rigs:region`: that is this second page's own.)
  const real = await other.evaluate(() => ({ keys: Object.keys(localStorage).filter((k) => k.startsWith('rush-hour-rigs') && k !== 'rush-hour-rigs:region'), locked: [...document.querySelectorAll('.region-tab')].filter((t) => t.classList.contains('locked')).length }));
  check(Object.keys(inMemory).length === 1 && real.keys.length === 0 && real.locked === REGIONS.length - 1, `a level cleared under the link counts for that page (${JSON.stringify(inMemory)}), and NOTHING was saved: the same browser without the link holds no score, log or setting (${real.keys.length} keys) and has ${real.locked} regions locked`);
  const mention = await other.evaluate(() => document.body.textContent.includes('demo=1'));
  check(!mention, 'the link is named nowhere in the game');
  await browser.close();
}

// ---------- 5. The game's script never arrives: a message, not a white screen ----------
for (const [name, engine] of [['Chrome', chromium], ['Safari', webkit]]) {
  console.log(`\n${name}: the page when the game fails to load`);
  const browser = await engine.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.route((url) => /\/src\/main\.ts|\/assets\/[^/]+\.js/.test(url.pathname), (route) => route.abort());
  await page.goto(`${ROOT}?cover=1`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForFunction(() => !document.getElementById('boot-reload')?.hidden, null, { timeout: 15000 }).catch(() => {});
  const e = await page.evaluate(() => { const m = document.getElementById('boot-msg'), b = document.getElementById('boot-reload'), r = b?.getBoundingClientRect(); return { msg: m?.textContent, button: !!b && !b.hidden && r.height >= 44, bg: getComputedStyle(document.getElementById('boot')).backgroundColor }; });
  check(/didn't load|went wrong/.test(e.msg ?? '') && e.button && e.bg !== 'rgba(0, 0, 0, 0)' && e.bg !== 'rgb(255, 255, 255)', `it says "${e.msg}" over the game's blue, with a Reload button of 44 px or more: no white screen`);
  await page.screenshot({ path: join(OUT, `${name.toLowerCase()}_load_error.png`) });
  await page.unroute((url) => true).catch(() => {});
  await browser.close();
}
{
  // And the plain case: once the game is up, nothing of that page is left.
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
  check(!(await page.$('#boot')) && !!(await page.$('.screen.levels')), 'a good load leaves nothing of the loading page behind');
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
console.log(`screenshots: ${OUT}`);
process.exit(failures ? 1 : 0);
