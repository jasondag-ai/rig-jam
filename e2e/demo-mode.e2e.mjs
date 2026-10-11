// DEMO MODE: ONE SWITCH (job U19). Chromium and WebKit, at Safari's two visible sizes.
//  - OFF (a real save part way through): locks as earned, the log as found, no "Best from here" line without a hint
//  - ON by the switch in Settings ("Demo mode"): every region and level open, every sighting shown, the line always
//    on and updated every move; a level won, a hint pressed: NOTHING saved but the switch itself; still on after a reload
//  - OFF again: the phone's storage byte for byte what it was before the switch was touched (scores, hard hats,
//    hints, streak, log, the ending); the locks, the log and the line as before
//  - `?demo=1`: lands in the same state as the switch (compared field by field), writes nothing at all, and goes
//    off by the same switch
//  - one name ("Demo mode"; nothing says "judge mode"); the feedback address
// Needs the dev server (URL=, default the dev build on 5181). `ENGINE=chromium|webkit`, `VIEW=390x664`.
import { chromium, webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { LOG_ENTRIES } from '../src/ui/wildlife-log.ts';
import { FEEDBACK_EMAIL } from '../src/ui/feedback.ts';
import { newGame, solve, tryMove } from '../src/engine/index.ts';
import { outDir } from './out.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5181/';
const ENGINES = { chromium, webkit };
const WHICH = process.env.ENGINE ? [process.env.ENGINE] : ['chromium', 'webkit'];
const SIZES = process.env.VIEW ? [process.env.VIEW.split('x').map(Number)] : [[390, 664], [375, 635]];
const OUT = outDir('demo-mode');
const QUIET = 'cover=0&magpie=0&worker=0&moose=0&soundnudge=0&tourists=0&surveyor=0&lunch=0&night=0&off=nearmiss,landowner,biffya,biffyb,sam,geese,tumbleweed,cattrain,bale,bell,pea,mosquito,overweight';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
const N = LOG_ENTRIES.length;

/** A REAL SAVE, part way through: Cardium 1 to 4 (two at par), hints spent and earned, a streak of two, two sightings, the ending seen, sound settings. */
const day = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const C = REGIONS[0].levels;
const SAVE = {
  'rush-hour-rigs:v2': JSON.stringify({ best: { [C[0].id]: C[0].par, [C[1].id]: C[1].par, [C[2].id]: C[2].par + 2, [C[3].id]: C[3].par + 5 }, hints: 4, perfect: [C[0].id, C[1].id], dailyCleared: [day(1), day(0)], demo: false, announced: [], standDowns: [] }),
  'rush-hour-rigs:log': JSON.stringify({ v: 3, found: ['magpie', 'moose'], camo: true, camoEarned: false }),
  'rush-hour-rigs:finale': JSON.stringify({ v: 1, seen: true }),
  'rush-hour-rigs-audio': JSON.stringify({ sfx: false, music: false, style: 'country' }),
  'rush-hour-rigs:region': 'cardium',
};
/** What the phone REALLY holds: read by another page of the same site (the game's own page reads its copy in memory while demo mode is on). */
const stored = async (page) => {
  const other = await page.context().newPage();
  await other.goto(`${ROOT}manifest.webmanifest`);
  const all = await other.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
  await other.close();
  return all;
};
const sameBytes = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const drag = (page, id, cells, out) => page.evaluate(async ([id, n, ms]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`), q = el.getBoundingClientRect(), h = el.classList.contains('horiz'), cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = q.x + q.width / 2, y = q.y + q.height / 2;
  const ev = (t) => el.dispatchEvent(new PointerEvent(t, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown');
  for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((r) => setTimeout(r, 17)); }
  await new Promise((r) => setTimeout(r, 70));
  ev('pointerup');
  await new Promise((r) => setTimeout(r, ms));
}, [id, cells + (out ? Math.sign(cells) * 0.4 : 0), out ? 900 : 350]);
const line = (page) => page.evaluate(() => { const b = document.querySelector('.hud .best'); const cs = getComputedStyle(b); return { text: b.textContent, shown: b.textContent !== '' && cs.display !== 'none' && cs.visibility !== 'hidden', room: b.parentElement.classList.contains('best-room') }; });
const answer = (page, ms = 20000) => page.waitForFunction(() => document.querySelector('.hud .best').textContent !== '', null, { timeout: ms }).then(() => true, () => false);
const toList = async (page) => { await page.locator('.hud [data-act="levels"]').click(); await page.waitForSelector('.screen.levels .region-tab'); };

/** What the home page, Settings and the log show: the state both ways in must agree on. */
async function state(page) {
  await page.waitForSelector('.screen.levels .region-tab');
  const home = await page.evaluate(() => ({
    tabsLocked: [...document.querySelectorAll('.region-tab')].filter((t) => t.classList.contains('locked')).length,
    tabs: document.querySelectorAll('.region-tab').length,
    turnLocked: document.querySelector('.turn-btn')?.classList.contains('locked') ?? null,
  }));
  // Every region's list: how many of its levels are locked.
  const locked = [];
  for (let i = 0; i < home.tabs; i++) {
    const tab = page.locator('.region-tab').nth(i);
    if (await tab.evaluate((t) => t.classList.contains('locked'))) { locked.push('tab'); continue; }
    await tab.evaluate((t) => t.click());
    await wait(250);
    locked.push(await page.evaluate(() => [...document.querySelectorAll('.level-btn')].filter((b) => b.classList.contains('locked')).length));
  }
  await page.locator('.region-tab').nth(0).evaluate((t) => t.click());
  await wait(250);
  const hats = await page.evaluate(() => [...document.querySelectorAll('.level-btn')].slice(0, 5).map((b) => b.querySelectorAll('img[src*="hat_full"], .hat.full, .hat.on').length));
  await page.locator('.gear').click();
  await page.waitForSelector('.settings');
  await wait(450); // (the panel pops in: measure it once it has settled)
  const set = await page.evaluate(() => ({ demo: document.querySelector('.settings [data-act="demo"]').checked, label: document.querySelector('.settings [data-act="demo"]').closest('label').querySelector('.switch-label').firstChild.textContent.trim(), sub: (() => { const sm = document.querySelector('.settings [data-act="demo"]').closest('label').querySelector('.switch-label small'), camo = document.querySelector('.settings [data-act="camo"]').closest('label').querySelector('.switch-label small'), done = document.querySelector('.settings [data-act="close"]'); if (!sm) return null; const r = sm.getBoundingClientRect(), d = done.getBoundingClientRect(), cs = getComputedStyle(sm), cc = camo ? getComputedStyle(camo) : null; done.scrollIntoView({ block: 'nearest' }); const d2 = done.getBoundingClientRect(); return { text: sm.textContent, inside: r.left >= 0 && r.right <= innerWidth && r.width > 20 && r.height > 8, oneLine: r.height < parseFloat(cs.lineHeight || '20') * 1.6 || r.height < 24, likeCamo: !cc || (cs.fontSize === cc.fontSize && cs.color === cc.color), doneInView: d.top >= 0 && d.bottom <= innerHeight, doneReachable: d2.top >= 0 && d2.bottom <= innerHeight && d2.height >= 44 }; })(), ending: !!document.querySelector('.settings [data-act="ending"]'), mail: document.querySelector('.settings .feedback-mail')?.textContent ?? '', words: document.querySelector('.settings').textContent }));
  await page.locator('.settings [data-act="close"]').click();
  await page.locator('.binoculars').click();
  await page.waitForSelector('.screen.log .log-count');
  const log = await page.evaluate(() => ({ count: document.querySelector('.log-count').textContent, found: document.querySelectorAll('.log-card.found').length, tag: !!document.querySelector('.demo-tag') || /DEMO/.test(document.querySelector('.log-head h1').textContent), camo: document.body.classList.contains('camo-pickups') }));
  await page.locator('.log-head .back').click();
  await page.waitForSelector('.screen.levels .region-tab');
  return { ...home, locked, hats, set, log };
}
/** Opens a level of an open region and says whether the line shows with no hint pressed, before and after the best line's first move. */
async function lineOn(page, ri, li, waitMs) {
  await page.locator('.region-tab').nth(ri).evaluate((t) => t.click());
  await wait(250);
  await page.locator('.level-btn').nth(li).click();
  await page.waitForSelector('.board .truck.sprite-on');
  const level = REGIONS[ri].levels[li], best = solve(level);
  if (waitMs) await wait(waitMs); else await answer(page);
  const before = await line(page);
  const r = tryMove(newGame(level), best[0].id, best[0].delta);
  await drag(page, best[0].id, best[0].delta, r.exited);
  if (waitMs) await wait(waitMs); else await answer(page);
  const after = await line(page);
  return { before, after, par: level.par };
}
const setSwitch = async (page, on) => {
  await page.locator('.gear').click();
  await page.waitForSelector('.settings');
  const box = page.locator('.settings [data-act="demo"]');
  if ((await box.isChecked()) !== on) await box.evaluate((i) => i.click());
  await wait(150);
  await page.locator('.settings [data-act="close"]').click();
  await page.waitForSelector('.screen.levels .region-tab');
};

for (const name of WHICH) {
  const browser = await ENGINES[name].launch();
  for (const [W, H] of SIZES) {
    console.log(`\n${name} ${W} x ${H}`);
    const fresh = async (query) => {
      const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: name === 'webkit' ? 3 : 2, hasTouch: true });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${ROOT}?${QUIET}`, { waitUntil: 'networkidle' });
      await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, SAVE);
      await page.goto(`${ROOT}?${query}${QUIET}`, { waitUntil: 'networkidle' });
      return { context, page, errors };
    };

    // ---------- OFF ----------
    const { context, page, errors } = await fresh('');
    const off = await state(page);
    check(!off.set.demo && off.tabsLocked === REGIONS.length - 1 && off.locked[0] === 5 && off.log.count === `2/${N}` && off.log.found === 2 && off.turnLocked === true, `off: the real save (${off.tabsLocked} regions locked, ${off.locked[0]} of Cardium's levels locked, the log ${off.log.count}, the Turnaround locked)`);
    check(off.set.label === 'Demo mode' && !/judge/i.test(off.set.words), `Settings calls it "${off.set.label}", and nothing says "judge mode"`);
    check(off.set.sub?.text === 'Everything open. Nothing is saved.' && off.set.sub.inside && off.set.sub.likeCamo, `under the switch, one quiet line in the Camo sub-line's style: "${off.set.sub?.text}" (off)`);
    check(off.set.sub?.doneReachable, `Settings at ${W} x ${H}: the Done button is ${off.set.sub?.doneInView ? 'on the screen without scrolling' : 'reachable by scrolling the panel'}`);
    check(off.set.mail === FEEDBACK_EMAIL && FEEDBACK_EMAIL === 'info@stragentic.com', `feedback goes to ${off.set.mail}`);
    let l = await lineOn(page, 0, 4, 2500);
    check(!l.before.shown && !l.after.shown && !l.after.room, 'off: no "Best from here" line without a hint, before or after a move');
    await toList(page);
    // (Real play saves as ever: the level and region last opened. THE PHONE AS IT STANDS NOW is what must come back.)
    const seed = await stored(page);
    check(JSON.parse(seed['rush-hour-rigs:v2']).demo === false && seed['rush-hour-rigs:log'] === SAVE['rush-hour-rigs:log'] && seed['rush-hour-rigs:finale'] === SAVE['rush-hour-rigs:finale'], 'the phone before the switch is touched: the real save');

    // ---------- ON, by the switch ----------
    await setSwitch(page, true);
    const onStore = await stored(page);
    const flipped = { ...seed, 'rush-hour-rigs:v2': JSON.stringify({ ...JSON.parse(seed['rush-hour-rigs:v2']), demo: true }) };
    check(sameBytes(onStore, flipped), 'the switch on: the one thing saved is the switch itself (the `demo` field), every other byte as it was');
    const on = await state(page);
    check(on.set.sub?.text === 'Everything open. Nothing is saved.' && on.set.sub.inside && on.set.sub.doneReachable, 'the same line shows with the switch on, and Done is still reachable');
    check(on.set.demo && on.tabsLocked === 0 && on.locked.every((n) => n === 0) && on.turnLocked === false, `on: every region and every level open (${on.locked.join(', ')} locked), the Turnaround too`);
    check(on.log.count === `${N}/${N}` && on.log.found >= N - 1 && !on.log.tag && !on.log.camo, `on: every sighting shown in the Wildlife Log (${on.log.count}), no DEMO label, no camo handed out`);
    l = await lineOn(page, 5, 9, 0);
    check(l.before.shown && l.before.text === `Best from here: ${l.par}` && l.after.text === `Best from here: ${l.par}` && l.after.room, `on: the line is always on, no hint pressed, on the last Big Pad ("${l.before.text}"), and still right after a move`);
    await page.screenshot({ path: `${OUT}/${name}_${W}x${H}_on.png` }).catch(() => {});
    await page.locator('.controls [data-act="hint"]').click(); await wait(1200);
    await toList(page);
    // A level won, at par, in demo mode.
    await page.locator('.region-tab').nth(0).evaluate((t) => t.click()); await wait(250);
    await page.locator('.level-btn').nth(5).click();
    await page.waitForSelector('.board .truck.sprite-on');
    { const level = C[5]; let s = newGame(level); let updated = true;
      for (const m of solve(level)) { const r = tryMove(s, m.id, m.delta); s = r.state; await drag(page, m.id, m.delta, r.exited); if (s.trucks.length) { updated &&= await answer(page, 8000); updated &&= (await line(page)).text === `Best from here: ${level.par}`; } }
      const won = await page.waitForSelector('.win-card, .win', { timeout: 8000 }).then(() => true, () => false);
      check(updated, `on: the line is updated after every move of ${C[5].name} (par ${level.par} all the way)`);
      check(won, 'that level is won in demo mode'); }
    check(sameBytes(await stored(page), onStore), 'ON, NOTHING IS SAVED: a hint pressed and a level won at par, and storage has not changed by a byte');
    await page.reload({ waitUntil: 'networkidle' });
    const again = await state(page);
    check(again.set.demo && again.tabsLocked === 0 && again.log.count === `${N}/${N}` && sameBytes(await stored(page), onStore), 'after a reload it is still on (the switch is remembered), and still nothing else saved');

    // ---------- OFF AGAIN ----------
    await setSwitch(page, false);
    check(sameBytes(await stored(page), seed), 'OFF AGAIN: storage is byte for byte what it was before the switch was touched (scores, hard hats, hints, streak, log, the ending)');
    const back = await state(page);
    check(sameBytes(back, off), `and the game shows it: the same locks, hard hats, log (${back.log.count}) and Settings as before`);
    l = await lineOn(page, 0, 4, 2500);
    check(!l.before.shown && !l.after.shown, 'off again: no line without a hint');
    await toList(page);
    await page.reload({ waitUntil: 'networkidle' });
    check(!(await state(page)).set.demo && sameBytes(await stored(page), seed), 'and it stays off after a reload');
    check(errors.length === 0, `no errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
    await context.close();

    // ---------- ?demo=1 ----------
    const L = await fresh('demo=1&');
    const seedL = await stored(L.page);
    const linked = await state(L.page);
    check(sameBytes(linked, on), `?demo=1 lands in the same state as the switch: the switch shown on, everything open, the log ${linked.log.count}`);
    l = await lineOn(L.page, 5, 9, 0);
    check(l.before.text === `Best from here: ${l.par}` && l.after.text === `Best from here: ${l.par}`, '?demo=1: the same always-on line');
    await toList(L.page);
    check(sameBytes(await stored(L.page), seedL) && sameBytes(seedL, Object.fromEntries(Object.entries(SAVE).sort(([a], [b]) => (a < b ? -1 : 1)))), '?demo=1 writes nothing at all, not even the switch (a level opened, a move made)');
    await setSwitch(L.page, false);
    const out = await state(L.page);
    check(sameBytes(out, off) && sameBytes(await stored(L.page), seedL), 'and the same switch turns it off: real progress again, storage untouched');
    check(L.errors.length === 0, `no errors${L.errors.length ? `: ${L.errors.join('; ')}` : ''}`);
    await L.context.close();
  }
  await browser.close();
}
console.log(failures ? `\nFAILED: ${failures}` : '\nPASS');
process.exit(failures ? 1 : 0);
