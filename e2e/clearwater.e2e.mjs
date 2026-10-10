// Clearwater, the Big Pad (Playwright, WebKit at iPhone DPR 3; 390 and 375 wide).
//  - the sixth tab, after Bakken: locked on a fresh phone, open once 5 of Bakken are cleared, open in demo mode; its 10 levels by name
//  - the board is 8 x 8 in the toy look: cells about 44 px at 390 (42 at 375), every truck's sprite on, every gate in its gap,
//    and NOTHING CUT OFF: the whole lease, the HUD, the tip line and the three buttons are on the screen with no scrolling
//  - a drag moves a truck, Undo takes it back, Hint lights a truck and then shows where it goes
//  - ALL 10 LEVELS are played through the solver's solution by dragging and cleared at par with three hard hats (at 390)
//  - no gag plays on a Big Pad
// Screenshots go to qc-out/clearwater/ in the repo. Run with the dev server up: npm run test:e2e:clearwater
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { solve } from '../src/engine/index.ts';
import { DEMO, UNLOCKED } from './progress.mjs';
import { outDir } from './out.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = outDir('clearwater');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const CW = REGIONS.findIndex((r) => r.id === 'clearwater');
const levels = REGIONS[CW].levels;
const browser = await webkit.launch();
const SIZES = [[390, 844], [375, 667]];

async function open(progress, [width, height] = SIZES[0]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${ROOT}?cover=0`, { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); if (p) localStorage.setItem('rush-hour-rigs:v2', p); }, progress);
  await page.reload({ waitUntil: 'networkidle' });
  return { context, page, errors };
}
const toList = async (page) => {
  await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
  await page.waitForSelector('.region-tab');
  await page.locator('.region-tab').nth(CW).click();
  await wait(300);
};
const enter = async (page, li) => {
  await toList(page);
  await page.locator('.level-btn').nth(li).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(500);
};
/** Drags a truck `cells` along its lane with touch pointer events and lets go. */
const drag = (page, id, cells, settle = 380) =>
  page.evaluate(async ([truckId, n, ms]) => {
    const el = document.querySelector(`.truck[data-id="${truckId}"]:not(.exiting)`);
    const r = el.getBoundingClientRect();
    const h = el.classList.contains('horiz');
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    let x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 71, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown');
    for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((q) => setTimeout(q, 17)); }
    ev('pointerup');
    await new Promise((q) => setTimeout(q, ms));
  }, [id, cells, settle]);
const hud = (page) => page.evaluate(() => ({ moves: parseInt(document.querySelector('.hud .moves').textContent, 10), won: !document.querySelector('.win').hidden, hats: document.querySelectorAll('.win:not([hidden]) .hats .on').length }));
/** A move of the solver's: an exit is dragged a little past its gate, anything else exactly. */
const play = async (page, level, m, k, all) => {
  const last = all.findLastIndex((x) => x.id === m.id) === k;
  await drag(page, m.id, m.delta + (last ? Math.sign(m.delta) * 0.4 : 0), last ? 900 : 380);
};

// ---------- the level list ----------
console.log('\nwebkit: Clearwater on the level list');
{
  const fresh = await open(null);
  const tabs = await fresh.page.$$eval('.region-tab', (ts) => ts.map((t) => ({ name: t.querySelector('.rtext').textContent, locked: t.classList.contains('locked'), text: t.textContent })));
  check(tabs.length === REGIONS.length && tabs[5].name === 'Clearwater' && tabs[4].name === 'Bakken', `${tabs.length} tabs, Clearwater after Bakken (${tabs.map((t) => t.name).join(', ')})`);
  check(tabs[5].locked && /Bakken/.test(tabs[5].text), `locked on a fresh phone: "${tabs[5].text.replace(/\s+/g, ' ').trim()}"`);
  await fresh.context.close();

  const earned = await open(UNLOCKED);
  await toList(earned.page);
  const rows = await earned.page.$$eval('.level-btn', (bs) => bs.map((b) => ({ name: b.querySelector('.lname, .name')?.textContent ?? b.textContent, locked: b.classList.contains('locked') })));
  check(rows.length === 10 && rows.every((r, i) => r.name.includes(levels[i].name) && !r.locked), `open once Bakken is cleared: its 10 levels (${levels.map((l) => l.name).join(', ')})`);
  await earned.context.close();

  for (const size of SIZES) {
    const demo = await open(DEMO, size);
    await toList(demo.page);
    const open6 = await demo.page.$$eval('.region-tab', (ts) => ts.every((t) => !t.classList.contains('locked')));
    const wide = await demo.page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    check(open6 && !wide, `${size[0]} wide, demo mode: Clearwater is open and the list does not scroll sideways`);
    await demo.page.screenshot({ path: join(OUT, `clearwater_1_level_select_${size[0]}.png`) });
    await demo.context.close();
  }
}

// ---------- the board ----------
for (const size of SIZES) {
  console.log(`\nwebkit ${size[0]} x ${size[1]}: the 8 x 8 board`);
  const { context, page, errors } = await open(DEMO, size);
  await enter(page, 0);
  const level = levels[0];
  const geo = await page.evaluate(() => {
    const board = document.querySelector('.board'), b = board.getBoundingClientRect(), pad = board.querySelector('.pad').getBoundingClientRect();
    const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const trucks = [...document.querySelectorAll('.truck')].map((t) => { const r = t.getBoundingClientRect(); return { on: t.classList.contains('sprite-on'), in: r.left >= pad.left - 0.5 && r.right <= pad.right + 0.5 && r.top >= pad.top - 0.5 && r.bottom <= pad.bottom + 0.5, across: Math.min(r.width, r.height), sym: !!t.querySelector('.sym')?.textContent }; });
    const gates = [...document.querySelectorAll('.gate')].map((g) => { const r = g.getBoundingClientRect(); return { in: r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight, art: !!g.querySelector('.gate-art, .g-leaf'), sym: !!g.querySelector('.g-badge, .sym')?.textContent }; });
    const buttons = [...document.querySelectorAll('.controls .btn')].map((x) => { const r = x.getBoundingClientRect(); return { h: r.height, in: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
    return { cell: parseFloat(board.style.getPropertyValue('--cell')), big: board.classList.contains('big-pad'), board: { l: b.left, t: b.top, r: b.right, b: b.bottom }, padCells: pad.width / parseFloat(board.style.getPropertyValue('--cell')), trucks, gates, buttons, hud: box('.hud'), note: box('.note'), controls: box('.controls'), scrollY: document.documentElement.scrollHeight > innerHeight + 1, scrollX: document.documentElement.scrollWidth > innerWidth, w: innerWidth, h: innerHeight };
  });
  check(geo.big && Math.round(geo.padCells) === 8 && geo.cell >= (size[0] === 390 ? 43 : 41) && geo.cell <= 46, `the pad is 8 cells a side, a cell is ${geo.cell} px`);
  check(geo.board.l >= 0 && geo.board.r <= geo.w && geo.board.t >= geo.hud.b - 2 && geo.board.b <= geo.note.t + 2 && !geo.scrollX && !geo.scrollY, `nothing cut off: the whole lease is on the screen (${Math.round(geo.board.l)} to ${Math.round(geo.board.r)} of ${geo.w}), under the HUD and over the tip line, no scrolling`);
  check(geo.trucks.length === level.trucks.length && geo.trucks.every((t) => t.on && t.in && t.sym), `${geo.trucks.length} trucks, each with its sprite and its symbol, each inside the pad`);
  check(geo.gates.length === level.gates.length && geo.gates.every((g) => g.in && g.art && g.sym), `${geo.gates.length} gates, each drawn with its symbol, each on the screen`);
  check(geo.buttons.length === 3 && geo.buttons.every((b) => b.in && b.h >= 44) && geo.controls.b <= geo.h, `Undo, Hint and Restart are on the screen, ${Math.round(Math.min(...geo.buttons.map((b) => b.h)))} px tall or more`);
  await page.screenshot({ path: join(OUT, `clearwater_2_board_start_${size[0]}.png`) });

  // Drag, Undo, Hint.
  const path = solve(level);
  const first = path[0];
  await play(page, level, first, 0, path);
  let h = await hud(page);
  check(h.moves === 1, `a drag is one move (${h.moves})`);
  await page.locator('.controls [data-act="undo"]').click();
  await wait(400);
  h = await hud(page);
  const back = await page.evaluate((n) => document.querySelectorAll('.truck:not(.exiting)').length === n, level.trucks.length);
  check(h.moves === 0 && back, 'Undo takes it back: 0 moves, every truck on the pad');
  await page.locator('.controls [data-act="hint"]').click();
  await wait(600);
  const lit = await page.evaluate(() => document.querySelector('.truck.hinted')?.dataset.id ?? null);
  check(lit === first.id, `Hint lights the truck to move (${lit}; the solver says ${first.id})`);
  await page.locator('.controls [data-act="hint"]').click();
  await wait(600);
  const shown = await page.evaluate(() => !!document.querySelector('.ghost, .gate.hint-out, .out-badge, [data-hint="out"]'));
  check(shown, 'the second tap shows where it goes');
  await page.screenshot({ path: join(OUT, `clearwater_3_hint_${size[0]}.png`) });
  await page.locator('.controls [data-act="restart"]').click();
  await wait(500);

  // Half way through, for the picture; then to the end.
  const half = Math.floor(path.length / 2);
  for (let k = 0; k < half; k++) await play(page, level, path[k], k, path);
  await wait(900);
  await page.screenshot({ path: join(OUT, `clearwater_4_board_mid_level_${size[0]}.png`) });
  for (let k = half; k < path.length; k++) await play(page, level, path[k], k, path);
  await page.waitForFunction(() => !document.querySelector('.win').hidden, null, { timeout: 8000 }).catch(() => {});
  await wait(2600);
  h = await hud(page);
  check(h.won && h.moves === level.par && h.hats === 3, `level 1 cleared in ${h.moves} moves (par ${level.par}), ${h.hats} hard hats`);
  const card = await page.evaluate(() => { const r = document.querySelector('.win .card, .win-card, .win > *').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1; });
  check(card, 'the win card fits the screen');
  await page.screenshot({ path: join(OUT, `clearwater_5_win_card_${size[0]}.png`) });
  check((await page.$$('.strip-layer:not(.over-lease), .magpie-layer, .worker-layer')).length === 0, 'no gag played on the Big Pad');
  check(errors.length === 0, `no script errors (${errors.slice(0, 2).join(' | ') || 'none'})`);
  await context.close();
}

// ---------- all ten, at par ----------
console.log('\nwebkit 390 x 844: all 10 levels by dragging, at par');
{
  const { context, page, errors } = await open(DEMO);
  for (let li = 0; li < levels.length; li++) {
    const level = levels[li];
    await enter(page, li);
    const path = solve(level);
    for (let k = 0; k < path.length; k++) await play(page, level, path[k], k, path);
    await page.waitForFunction(() => !document.querySelector('.win').hidden, null, { timeout: 8000 }).catch(() => {});
    await wait(1800);
    const h = await hud(page);
    check(h.won && h.moves === level.par && h.hats === 3, `${li + 1} ${level.name}: ${level.trucks.length} trucks, cleared in ${h.moves} (par ${level.par}), ${h.hats} hard hats`);
    if (li === levels.length - 1) await page.screenshot({ path: join(OUT, 'clearwater_6_last_level_won_390.png') });
  }
  check(errors.length === 0, `no script errors (${errors.slice(0, 2).join(' | ') || 'none'})`);
  await context.close();
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : `\nPASS\nscreenshots: ${OUT}`);
process.exit(failures ? 1 : 0);
