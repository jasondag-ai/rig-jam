// MAKES A REAL SAVE FROM THE LIVE BUILD, by playing it (WebKit at iPhone size): the fixture a later build must read
// whole (CLAUDE.md, "An old save keeps everything": BEFORE SHIPPING ANYTHING THAT TOUCHES SAVED DATA, make a new one).
// What it plays, as a player would, by dragging and tapping on the live site:
//   Cardium 1 to 7 (level 5 in one move more than par: two hard hats; the rest at par), a tap on the lease sign for
//   the Back Scratcher, Undo three times in a row for the Lost Goose, one hint spent, today's Daily Pad, and in
//   Settings Sound effects and Music on with the Chill style.
// RUN IT FROM A CHECKOUT OF THE LIVE BUILD'S OWN COMMIT (its levels and solver are imported from ../src):
//   node e2e/make-live-save.mjs <out.json>      (LIVE= another address)
import { webkit } from 'playwright';
import { writeFileSync } from 'node:fs';
import { REGIONS } from '../src/levels/regions.ts';
import daily from '../src/levels/daily.json' with { type: 'json' };
import { newGame, parseLevel, solve, tryMove } from '../src/engine/index.ts';
import { dayKey, padLevelIndex, padNumber } from '../src/ui/daily.ts';

const LIVE = process.env.LIVE ?? 'https://jasondag-ai.github.io/rig-jam/';
const out = process.argv[2];
if (!out) { console.error('usage: node e2e/make-live-save.mjs <out.json>'); process.exit(1); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const version = await (await fetch(`${LIVE}version.json?t=${Date.now()}`)).json();
console.log(`playing the live build ${version.build} (${version.version}) at ${LIVE}`);

const browser = await webkit.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('   page error:', e.message));
await page.goto(`${LIVE}?cover=0`, { waitUntil: 'networkidle' });
const keysAtStart = await page.evaluate(() => Object.keys(localStorage));
// (The game notes which region's list is showing as soon as it opens; nothing else may be there.)
if (keysAtStart.some((k) => k !== 'rush-hour-rigs:region')) { console.error('not a fresh phone:', keysAtStart); process.exit(1); }

/** One drag of a truck, `cells` along its lane (a little further for a drive out), as a finger does it. */
const drag = (id, cells, out) => page.evaluate(async ([id, n, ms]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`), q = el.getBoundingClientRect(), h = el.classList.contains('horiz'), cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = q.x + q.width / 2, y = q.y + q.height / 2;
  const ev = (t) => el.dispatchEvent(new PointerEvent(t, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown');
  for (let k = 0; k < 10; k++) { if (h) x += (n * cell) / 10; else y += (n * cell) / 10; ev('pointermove'); await new Promise((r) => setTimeout(r, 24)); }
  await new Promise((r) => setTimeout(r, 120));
  ev('pointerup');
  await new Promise((r) => setTimeout(r, ms));
}, [id, cells + (out ? Math.sign(cells) * 0.4 : 0), out ? 1000 : 450]);
/** Plays a list of moves from a state; returns the state after. */
async function play(state, moves) {
  for (const m of moves) { const r = tryMove(state, m.id, m.delta); state = r.state; await drag(m.id, m.delta, r.exited); }
  return state;
}
const found = () => page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:log') ?? '{"found":[]}').found);
const waitFound = async (id, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await found()).includes(id)) return true; await wait(300); } return false; };
const winCard = () => page.waitForSelector('.win:not([hidden]) .card', { timeout: 15000 });

// A brand-new player lands in level 1 (or on the list): from the list, open Cardium 1.
if (!(await page.$('.screen.game .board'))) { await page.waitForSelector('.level-btn'); await page.locator('.level-btn').nth(0).click(); }
const cardium = REGIONS[0].levels;
for (let i = 0; i < 7; i++) {
  const level = cardium[i];
  await page.waitForSelector('.board .truck');
  await wait(900);
  const best = solve(level);
  let state = newGame(level), moves = best;
  if (i === 2) { // Cardium 3: a tap on the lease sign brings the deer
    const pt = await page.evaluate(() => { const r = document.querySelector('.sign-layer svg').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.click(pt.x, pt.y);
    console.log(`   Cardium 3: tapped the lease sign; the Back Scratcher ${await waitFound('deer') ? 'is in the log' : 'DID NOT COME'}`);
  }
  if (i === 4) { // Cardium 5: its first long slide made in two drags, one move over par
    const k = best.findIndex((m) => Math.abs(m.delta) >= 2 && !tryMove(newGame(level), m.id, Math.sign(m.delta)).exited);
    if (k === 0) moves = [{ id: best[0].id, delta: Math.sign(best[0].delta) }, { id: best[0].id, delta: best[0].delta - Math.sign(best[0].delta) }, ...best.slice(1)];
    else console.log('   Cardium 5: its first move is not a long slide; played at par');
  }
  if (i === 5) { // Cardium 6: three moves, Undo three times in a row (the Lost Goose), then the level
    await play(state, best.slice(0, 3));
    for (let u = 0; u < 3; u++) { await page.locator('.controls [data-act="undo"]').click(); await wait(450); }
    console.log(`   Cardium 6: Undo three times in a row; the Lost Goose ${await waitFound('geese') ? 'is in the log' : 'DID NOT COME'}`);
  }
  if (i === 6) { // Cardium 7: one hint spent (two taps), then the level
    await page.locator('.controls [data-act="hint"]').click(); await wait(1200);
    await page.locator('.controls [data-act="hint"]').click(); await wait(900);
  }
  state = await play(state, moves);
  await winCard();
  await wait(900);
  console.log(`   Cardium ${i + 1} cleared in ${moves.length} (par ${level.par})`);
  await page.locator(`.win .card [data-act="${i < 6 ? 'next' : 'levels'}"]`).click();
  await wait(700);
}
await page.waitForSelector('.screen.levels .level-btn');

// Today's Daily Pad.
const today = dayKey(new Date()), pad = padNumber(today), dl = parseLevel(daily[padLevelIndex(pad, daily.length)]);
await page.locator('.daily-btn').click();
await page.waitForSelector('.board .truck');
await wait(900);
await play(newGame(dl), solve(dl));
await winCard();
await wait(900);
console.log(`   Daily Pad #${pad} (${today}) cleared at par ${dl.par}`);
await page.locator('.win .card [data-act="levels"]').click();
await page.waitForSelector('.screen.levels .level-btn');
await wait(500);

// Settings: Sound effects on, Music on, Chill.
await page.locator('.brand .gear').click();
await page.waitForSelector('.settings');
await wait(400);
for (const act of ['sfx', 'music']) { await page.evaluate((a) => document.querySelector(`.settings [data-act="${a}"]`).closest('label').click(), act); await wait(300); }
await page.locator('.settings .style-pick[data-style="chill"]').click();
await wait(400);
await page.locator('.settings [data-act="close"]').click();
await wait(500);

const seen = await page.evaluate(() => ({ hats: [...document.querySelectorAll('.level-btn')].map((b) => b.querySelectorAll('.hats .on').length), days: document.querySelector('.safety-sign')?.getAttribute('aria-label') }));
const store = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
await browser.close();
const log = JSON.parse(store['rush-hour-rigs:log'] ?? '{"found":[]}'), audio = store['rush-hour-rigs-audio'];
writeFileSync(out, JSON.stringify({
  build: version.build, version: version.version, savedAt: new Date().toISOString(), day: today,
  note: `A real save, made by playing the LIVE build ${version.build} in WebKit (e2e/make-live-save.mjs) on ${today}: Cardium 1 to 7 cleared (level 5 a move over par, the rest at par), sightings ${log.found.join(', ') || 'none'}, one hint spent, that day's Daily Pad (#${pad}), sound settings ${audio}.`,
  seen, localStorage: store,
}, null, 1) + '\n');
console.log(`saved ${out}:`, JSON.stringify(store, null, 1));
