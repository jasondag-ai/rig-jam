// Speech bubbles (Playwright, WebKit as the judge): every bubble has a tail whose tip is on its
// speaker from the FIRST frame, stays on it while the speaker moves, and the bubble never covers
// the HUD or the buttons.
//  - a driver's bump line: on that truck's cab, and it rides with the truck when it is driven
//  - the moose: at his muzzle; the magpie's driver: on the cab the bird stands on, never over the bird
//  - the strip's speakers (gopher, landowner, marshmallow worker, lost goose, frozen worker): on the head
//  - witness lines: from the truck nearest the gag, or from nobody when no truck is within reach
// The tail's tip is worked out from the bubble as it is laid out (its box, its side, its --tail),
// not from what the code says it meant. Run with the dev server up: npm run test:e2e:bubbles
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const QUIET = '?cover=0&magpie=0&worker=0&moose=0&cooldown=0&night=0&off=sam,tongue';
/** How close a tail's tip must be to its speaker (px). */
const NEAR = 4;

const browser = await webkit.launch();
async function open({ query = QUIET, level = [0, 5], width = 390, height = 844 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  if (!query.includes('gag=')) {
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(level[0]).click();
    await page.locator('.level-btn').nth(level[1]).click();
  }
  await page.waitForSelector('.board .truck.sprite-on');
  return { context, page };
}

/**
 * Watches for a bubble matching `bubbleSel` and measures it on the first frame it exists, then on
 * every frame for `ms`: how far its tail's tip is from the box of `speakerSel` (a selector, or
 * 'cab-of-speaker': the cab of the truck named in the bubble's data-speaker), and whether the
 * bubble keeps clear of the HUD, the buttons and the screen's edges.
 */
const probe = (page, bubbleSel, speakerSel, ms = 700, timeout = 20000) =>
  page.evaluate(
    ([bSel, sSel, follow, limit]) =>
      new Promise((res) => {
        const t0 = performance.now();
        const frames = [];
        let seen = 0;
        const measure = (b) => {
          const board = document.querySelector('.board').getBoundingClientRect();
          // The bubble as laid out (its pop animation scales it for a moment; the layout is where it is).
          const L = board.left + b.offsetLeft, T = board.top + b.offsetTop, W = b.offsetWidth, H = b.offsetHeight;
          const tail = parseFloat(b.style.getPropertyValue('--tail'));
          const side = b.classList.contains('below') ? 'below' : b.classList.contains('beside-left') ? 'left' : b.classList.contains('beside-right') ? 'right' : 'above';
          const tailLen = parseFloat(getComputedStyle(b, '::before').borderTopWidth);
          const tip = side === 'above' ? { x: L + tail, y: T + H + tailLen } : side === 'below' ? { x: L + tail, y: T - tailLen } : side === 'left' ? { x: L + W + tailLen, y: T + tail } : { x: L - tailLen, y: T + tail };
          const who = sSel === 'cab-of-speaker' ? document.querySelector(`.truck[data-id="${b.dataset.speaker}"] .cab`) : document.querySelector(sSel);
          if (!who) return { missing: true };
          const s = who.getBoundingClientRect();
          const off = Math.hypot(Math.max(0, s.left - tip.x, tip.x - s.right), Math.max(0, s.top - tip.y, tip.y - s.bottom));
          const hud = document.querySelector('.hud').getBoundingClientRect().bottom, controls = document.querySelector('.controls').getBoundingClientRect().top;
          const over = (r) => r && !(L + W <= r.left || L >= r.right || T + H <= r.top || T >= r.bottom);
          const bird = document.querySelector('.magpie-layer svg.magpie .body')?.getBoundingClientRect();
          return { side, off, tailLen, text: b.textContent, speaker: b.dataset.speaker ?? '', box: [L, T, W, H].map(Math.round), clear: T >= hud && T + H <= controls && L >= 0 && L + W <= innerWidth, overBird: !!over(bird), sx: s.left + s.width / 2, sy: s.top + s.height / 2 };
        };
        const tick = () => {
          const now = performance.now();
          const b = document.querySelector(bSel);
          if (b) {
            if (!seen) seen = now;
            frames.push(measure(b));
          }
          if ((seen && (now - seen > follow || !b)) || now - t0 > limit) return res(frames);
          requestAnimationFrame(tick);
        };
        tick();
      }),
    [bubbleSel, speakerSel, ms, timeout],
  );
const worst = (frames) => Math.max(...frames.map((f) => f.off));
const moved = (frames) => Math.hypot(frames.at(-1).sx - frames[0].sx, frames.at(-1).sy - frames[0].sy);
function judge(frames, who) {
  if (!frames.length || frames[0].missing) return check(false, `${who}: no bubble, or its speaker is not on screen`);
  const f = frames[0];
  check(f.tailLen >= 9 && f.off <= NEAR, `${who}: "${f.text}" has a tail and its tip is on the speaker on the first frame (${f.off.toFixed(1)} px off, bubble ${f.side})`);
  check(worst(frames) <= NEAR + 2, `${who}: the tail stays on the speaker (never more than ${worst(frames).toFixed(1)} px off over ${frames.length} frames; the speaker moved ${moved(frames).toFixed(0)} px)`);
  check(frames.every((x) => x.clear), `${who}: the bubble keeps clear of the HUD, the buttons and the screen's edges (box ${f.box})`);
}

/** Pushes a truck against whatever blocks it (a bump), or drives it `cells` along its lane. */
const drag = (page, id, cells, settle = 300) =>
  page.evaluate(async ([truckId, n, ms]) => {
    const el = document.querySelector(`.truck[data-id="${truckId}"]:not(.exiting)`);
    const r = el.getBoundingClientRect();
    const h = el.classList.contains('horiz');
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    let x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 31, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown');
    for (let k = 0; k < 10; k++) { if (h) x += (n * cell) / 10; else y += (n * cell) / 10; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); }
    ev('pointerup');
    await new Promise((q) => setTimeout(q, ms));
  }, [id, cells, settle]);
/** In a level's opening position: a truck that is blocked one way (push it: a bump), and every truck that can move (and how far). */
function moves(level) {
  const s = newGame(level);
  const all = s.trucks.map((t) => ({ t, r: getMoveRange(s, t.id) })).filter(({ r }) => r);
  const blocked = all.find(({ r }) => r.max === 0 && r.exitDelta !== 1) ?? all.find(({ r }) => r.min === 0 && r.exitDelta !== -1);
  return { blocked: blocked && { id: blocked.t.id, dir: blocked.r.max === 0 ? 1 : -1 }, free: all.filter(({ r }) => (r.max > 0 && r.exitDelta !== r.max) || (r.min < 0 && r.exitDelta !== r.min)).map(({ t, r }) => ({ id: t.id, by: r.max > 0 && r.exitDelta !== r.max ? r.max : r.min })) };
}

// ---------- 1. A driver's bump line ----------
for (const [ri, li] of [[0, 5], [1, 3], [2, 6]]) {
  const level = REGIONS[ri].levels[li];
  const m = moves(level);
  console.log(`\nwebkit: a bump line (${REGIONS[ri].name} ${li + 1}, truck ${m.blocked?.id} pushed)`);
  const { context, page } = await open({ level: [ri, li] });
  const watching = probe(page, '.bubble[data-hit]', 'cab-of-speaker', 250);
  await drag(page, m.blocked.id, m.blocked.dir * 2, 100);
  const frames = await watching;
  judge(frames, 'driver');
  // Drive the speaker's own truck while his line is up: the bubble rides with the cab.
  const speaker = frames[0]?.speaker;
  const free = m.free.find((f) => f.id === speaker);
  if (free && (await page.$('.bubble[data-hit]'))) {
    const riding = probe(page, '.bubble[data-hit]', 'cab-of-speaker', 900);
    await drag(page, speaker, free.by, 500);
    const ride = await riding;
    check(ride.length > 10 && moved(ride) > 20 && worst(ride) <= NEAR + 2, `driver: his truck is driven ${moved(ride).toFixed(0)} px and the bubble rides with its cab (never more than ${worst(ride).toFixed(1)} px off, ${ride.length} frames)`);
    check(ride.every((x) => x.clear), 'driver: still clear of the HUD and the buttons while it rides');
  } else console.log(`   (truck ${speaker} cannot move from here: the ride is checked on another level)`);
  await context.close();
}

// ---------- 2. The moose and the magpie ----------
console.log('\nwebkit: the moose (?gag=moose)');
{
  const { context, page } = await open({ query: '?gag=moose' });
  const frames = await probe(page, '.bubble[data-moose]', '.moose-layer svg .muzzle', 900);
  judge(frames, 'moose');
  check(frames[0] && (frames[0].side === 'left' || frames[0].side === 'right'), `moose: the line sits at his mouth, beside his muzzle (${frames[0]?.side})`);
  await context.close();
}
console.log('\nwebkit: the magpie (?gag=magpie)');
{
  const { context, page } = await open({ query: '?gag=magpie' });
  const frames = await probe(page, '.bubble[data-magpie]', 'cab-of-speaker', 900);
  judge(frames, "magpie's driver");
  check(frames.length > 0 && frames.every((f) => !f.overBird), "magpie's driver: the bubble is beside the cab the bird stands on, never over the bird");
  await context.close();
}

// ---------- 3. The strip's speakers ----------
for (const [gag, who, sel] of [
  ['nearmiss', 'gopher', '.gopher-layer svg.pup .head'],
  ['landowner', 'landowner', '.landowner-layer svg.pup .head'],
  ['marshmallow', 'marshmallow worker', '.marshmallow-layer svg.pup .head'],
  ['geese', 'lost goose', '.geese-layer svg.pup:last-of-type .head'],
  ['tongue', 'frozen worker', '.tongue-layer svg.pup .head'],
]) {
  console.log(`\nwebkit: ${who} (?gag=${gag})`);
  const { context, page } = await open({ query: `?gag=${gag}` });
  judge(await probe(page, `.bubble[data-gag]`, sel, 600, 26000), who);
  await context.close();
}

// ---------- 4. Witness lines ----------
console.log('\nwebkit: witness lines come from the truck nearest the gag, or from nobody');
{
  // What the rule says, from what is on screen: the truck nearest the gag's characters, within 2 cells.
  const expected = (page, gagSel) =>
    page.evaluate((sel) => {
      const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
      const gag = [...document.querySelectorAll(sel)].filter((e) => getComputedStyle(e).visibility !== 'hidden').map((e) => e.getBoundingClientRect()).filter((r) => r.width > 2 && r.right > 0 && r.left < innerWidth);
      const gap = (a, b) => Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom));
      const all = [...document.querySelectorAll('.truck:not(.exiting)')].map((t) => ({ id: t.dataset.id, d: Math.min(...gag.map((g) => gap(t.getBoundingClientRect(), g))) })).sort((a, b) => a.d - b.d);
      return { nearest: all[0]?.id, gap: all[0]?.d ?? Infinity, reach: 2 * cell, order: all.map((t) => `${t.id}:${Math.round(t.d)}`).join(' ') };
    }, gagSel);
  // The biffy (by the bottom berm): a truck bumps down into the berm, then a truck far from the biffy is driven.
  const levels = REGIONS[0].levels;
  const bottomBumper = (level) => newGame(level).trucks.find((t) => t.orient === 'v' && t.row + t.length === 6 && getMoveRange(newGame(level), t.id)?.exitDelta !== 1);
  const li = levels.findIndex((l) => bottomBumper(l) && moves(l).free.length > 0);
  const { context, page } = await open({ level: [0, li] });
  await drag(page, bottomBumper(levels[li]).id, 2, 100);
  await page.waitForSelector('.strip-layer[data-gag="biffyA"]', { state: 'attached', timeout: 6000 });
  await wait(700);
  const want = await expected(page, '.strip-layer[data-gag="biffyA"] svg.pup, .biffy-layer svg.pup');
  // Drive the movable truck that is farthest from the biffy.
  const far = moves(levels[li]).free.map((f) => f.id).sort((a, b) => want.order.split(' ').findIndex((x) => x.startsWith(b + ':')) - want.order.split(' ').findIndex((x) => x.startsWith(a + ':')))[0];
  const watching = probe(page, '.bubble[data-witness]', 'cab-of-speaker', 300, 2500);
  await drag(page, far, moves(levels[li]).free.find((f) => f.id === far).by, 900);
  const frames = await watching;
  const after = await expected(page, '.strip-layer[data-gag="biffyA"] svg.pup, .biffy-layer svg.pup');
  if (after.gap <= after.reach) {
    check(frames[0]?.speaker === after.nearest, `Occupied (Cardium ${li + 1}): truck ${far} was driven, and the line comes from truck ${after.nearest}, the one nearest the biffy (${Math.round(after.gap)} px away; got ${frames[0]?.speaker || 'nobody'}; distances ${after.order})`);
    judge(frames, 'witness');
  } else check(frames.length === 0, `Occupied (Cardium ${li + 1}): no truck is within reach of the biffy (${Math.round(after.gap)} px, reach ${Math.round(after.reach)}), so nobody speaks`);
  await context.close();
}
{
  // The geese fly high over the lease: unless a truck is parked right under them, nobody remarks.
  const { context, page } = await open({ level: [0, 5] });
  const m = moves(REGIONS[0].levels[5]);
  const one = m.free[0];
  // Three moves, then Undo three times in a row: the geese.
  for (const by of [one.by, -one.by, one.by]) await drag(page, one.id, by, 350);
  for (let i = 0; i < 3; i++) { await page.locator('[data-act="undo"]').click(); await wait(150); }
  await page.waitForSelector('.strip-layer[data-gag="geese"]', { state: 'attached', timeout: 6000 });
  await wait(2500);
  const reach = await page.evaluate(() => {
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    const gag = [...document.querySelectorAll('.strip-layer[data-gag="geese"] svg.pup')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 2 && r.right > 0 && r.left < innerWidth);
    const gap = (a, b) => Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom));
    const d = Math.min(...[...document.querySelectorAll('.truck:not(.exiting)')].flatMap((t) => gag.map((g) => gap(t.getBoundingClientRect(), g))));
    return { d, reach: 2 * cell };
  });
  const watching = probe(page, '.bubble[data-witness]', 'cab-of-speaker', 200, 1800);
  await drag(page, one.id, one.by, 900);
  const frames = await watching;
  if (reach.d > reach.reach) check(frames.length === 0, `the geese are ${Math.round(reach.d)} px from the nearest truck (reach ${Math.round(reach.reach)}): a move is made and nobody remarks`);
  else check(frames.length > 0, `a truck is within reach of the geese (${Math.round(reach.d)} px): its driver remarks`);
  await context.close();
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
