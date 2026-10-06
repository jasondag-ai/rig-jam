// Regions 4 and 5 (Playwright, WebKit, iPhone size): Mannville (muskeg) and Bakken (load racks,
// shift-change gates).
//  - both regions are on the level list after Duvernay, locked until earned, 10 levels each
//  - the new rules are TAUGHT BY DOING on their first levels: a truck driven onto muskeg slides on
//    to the end of its lane; a tanker's gate is shut until it has stopped on a load rack (the drop
//    on its tag fills); a clock gate is shut on odd moves and open on even ones; a driver says why
//    when a shut gate is pushed
//  - ALL 20 LEVELS are played through their solver's solution by dragging, and each is cleared at
//    par with three hard hats
// Run with the dev server up: npm run test:e2e:regions
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';
import { UNLOCKED } from './progress.mjs';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const QUIET = '?cover=0&night=0&magpie=0&worker=0&moose=0&bird=0&nap=0&surveyor=0&tourists=0&lunch=0&off=sam,tongue';
const ri = (id) => REGIONS.findIndex((r) => r.id === id);
const browser = await webkit.launch();

async function open(progress = UNLOCKED) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(ROOT + QUIET, { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); if (p) localStorage.setItem('rush-hour-rigs:v2', p); }, progress);
  await page.reload({ waitUntil: 'networkidle' });
  return { context, page };
}
const enter = async (page, region, li) => {
  await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
  await page.waitForSelector('.region-tab');
  await page.locator('.region-tab').nth(ri(region)).click();
  await page.locator('.level-btn').nth(li).click();
  await page.waitForSelector('.board .truck');
  await wait(350);
};
/** Drags a truck `cells` along its lane with touch pointer events and lets go. */
const drag = (page, id, cells, settle = 420) =>
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
/** Where a truck is on the pad, in cells (its top-left). */
const cellOf = (page, id) => page.evaluate((truckId) => { const el = document.querySelector(`.truck[data-id="${truckId}"]:not(.exiting)`); if (!el) return null; const pad = document.querySelector('.board .yard, .board').querySelector('.truck').parentElement.getBoundingClientRect(); const r = el.getBoundingClientRect(); const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')); return { row: Math.round((r.top - pad.top) / cell), col: Math.round((r.left - pad.left) / cell) }; }, id);
const hud = (page) => page.evaluate(() => ({ moves: parseInt(document.querySelector('.hud .moves').textContent, 10), won: !document.querySelector('.win').hidden, hats: document.querySelectorAll('.win:not([hidden]) .hats .on').length, bubble: document.querySelector('.bubble')?.dataset.hit ?? null, text: document.querySelector('.bubble')?.textContent ?? null }));

// Bakken is HELD for now (not in REGIONS): its checks run again when it comes in.
const NEW = ['mannville', 'bakken'].filter((id) => REGIONS.some((r) => r.id === id));
const BAKKEN = NEW.includes('bakken');

// ---------- The level list ----------
console.log('\nwebkit: the new regions on the level list');
{
  const { context, page } = await open(null);
  const tabs = await page.$$eval('.region-tab', (ts) => ts.map((t) => ({ name: t.querySelector('.rtext').textContent, locked: t.classList.contains('locked'), lock: t.querySelector('.rlock')?.textContent ?? '', box: t.getBoundingClientRect().toJSON() })));
  check(tabs.map((t) => t.name).join() === ['Cardium', 'Montney', 'Duvernay', 'Mannville', ...(BAKKEN ? ['Bakken'] : [])].join(), `the regions, in order: ${tabs.map((t) => t.name).join(', ')}`);
  check(tabs[3].locked && /Duvernay/.test(tabs[3].lock) && (!BAKKEN || (tabs[4].locked && /Mannville/.test(tabs[4].lock))), `a new player finds ${BAKKEN ? 'them' : 'Mannville'} locked: "${tabs[3].lock}"${BAKKEN ? ` / "${tabs[4].lock}"` : ''}`);
  check(tabs.every((t) => t.box.left >= 0 && t.box.right <= 390 && t.box.height >= 44) && !(await page.evaluate(() => document.querySelector('.screen.levels').scrollWidth > innerWidth + 1)), 'all the tabs fit the screen as full tap targets, with no sideways scroll');
  await context.close();
}
{
  const { context, page } = await open();
  for (const id of NEW) {
    await page.locator('.region-tab').nth(ri(id)).click();
    await wait(250);
    const list = await page.evaluate(() => ({ rows: document.querySelectorAll('.level-btn').length, theme: document.querySelector('.screen.levels').dataset.theme, blurb: document.querySelector('.region-blurb').textContent }));
    check(list.rows === 10 && list.theme === (id === 'mannville' ? 'fall' : 'prairie'), `${id}: 10 levels, in its own season (${list.theme}): "${list.blurb}"`);
    await page.screenshot({ path: join(OUT, `region_${id}_list.png`) });
  }
  await context.close();
}

// ---------- Mannville 1: muskeg, by doing ----------
console.log('\nwebkit: Mannville 1 teaches muskeg');
{
  const level = REGIONS[ri('mannville')].levels[0];
  const { context, page } = await open();
  await enter(page, 'mannville', 0);
  const seen = await page.evaluate(() => ({ muskeg: document.querySelectorAll('.board .floor.muskeg').length, art: !!document.querySelector('.floor.muskeg svg path'), note: document.querySelector('.note').textContent, touch: getComputedStyle(document.querySelector('.floor.muskeg')).pointerEvents }));
  check(seen.muskeg === level.muskeg.length && seen.art && seen.touch === 'none', `the pad shows its ${seen.muskeg} muskeg patches, drawn on the floor (they take no touches)`);
  check(/[Mm]uskeg/.test(seen.note) && /slid/.test(seen.note), `the tip line says the rule: "${seen.note}"`);
  await page.screenshot({ path: join(OUT, 'region_mannville_1.png') });
  // The first move of the solution that slides: drag it only as far as the muskeg's edge, and it goes all the way.
  let s = newGame(level);
  let slid = null;
  for (const m of solve(level)) {
    const t = s.trucks.find((x) => x.id === m.id);
    const dir = Math.sign(m.delta);
    let short = 0;
    for (let d = dir; Math.abs(d) < Math.abs(m.delta); d += dir) if (tryMove(s, m.id, d).delta === m.delta) { short = d; break; }
    if (short) { slid = { m, short, t }; break; }
    await drag(page, m.id, m.delta + dir * (tryMove(s, m.id, m.delta).exited ? 0.4 : 0));
    s = tryMove(s, m.id, m.delta).state;
  }
  check(!!slid, 'its best solution has a move that slides on muskeg');
  if (slid) {
    const before = await hud(page);
    await drag(page, slid.m.id, slid.short, 700);
    const r = tryMove(s, slid.m.id, slid.short);
    const at = await cellOf(page, slid.m.id);
    const want = r.exited ? null : r.state.trucks.find((x) => x.id === slid.m.id);
    const after = await hud(page);
    check(after.moves === before.moves + 1 && (r.exited ? at === null : at && at.row === want.row && at.col === want.col), `truck ${slid.m.id} is dragged ${Math.abs(slid.short)} cell${Math.abs(slid.short) > 1 ? 's' : ''} onto the muskeg and slides on ${Math.abs(slid.m.delta)} to the end of its lane${r.exited ? ', out through its gate' : ''}: one move`);
    await page.locator('[data-act="undo"]').click();
    await wait(400);
    const back = await cellOf(page, slid.m.id);
    check(back && back.row === slid.t.row && back.col === slid.t.col, 'Undo takes the whole slide back');
  }
  await context.close();
}

if (BAKKEN) {
// ---------- Bakken 1: the load rack, by doing ----------
console.log('\nwebkit: Bakken 1 teaches the load rack');
{
  const level = REGIONS[ri('bakken')].levels[0];
  const tanker = level.trucks.find((t) => t.load);
  const { context, page } = await open();
  await enter(page, 'bakken', 0);
  const seen = await page.evaluate((id) => ({ racks: document.querySelectorAll('.board .floor.rack').length, tag: !!document.querySelector(`.truck[data-id="${id}"] .load-tag svg`), loaded: document.querySelector(`.truck[data-id="${id}"]`).classList.contains('loaded'), kind: document.querySelector(`.truck[data-id="${id}"]`).dataset.kind, others: [...document.querySelectorAll('.truck:not(.tanker)')].map((t) => t.dataset.kind), note: document.querySelector('.note').textContent }), tanker.id);
  check(seen.racks === level.racks.length && seen.tag && !seen.loaded, `a load rack on the pad, and the tanker (truck ${tanker.id}, a ${seen.kind} truck) wears an empty drop`);
  check(['water', 'vac'].includes(seen.kind) && seen.others.every((k) => k !== 'water' && k !== 'vac'), 'only the tanker looks like a tanker: no other truck here is a tank truck');
  check(/rack/.test(seen.note), `the tip line says the rule: "${seen.note}"`);
  await page.screenshot({ path: join(OUT, 'region_bakken_1.png') });
  // Play the solution; at the tanker's loading move, check the drop fills.
  let s = newGame(level);
  let taught = false, refused = null;
  for (const m of solve(level)) {
    const r = tryMove(s, m.id, m.delta);
    if (m.id === tanker.id && !taught) {
      // First, push it at its gate unloaded, if it can reach the gate from here: the driver says why not.
      const range = getMoveRange(s, m.id);
      const gate = level.gates.find((g) => g.color === tanker.color);
      const toward = gate.side === 'right' || gate.side === 'bottom' ? 1 : -1;
      const reach = toward > 0 ? range.max : range.min;
      const atEdge = (tanker.orient === 'h' ? s.trucks.find((x) => x.id === m.id).col : s.trucks.find((x) => x.id === m.id).row) + reach + (toward > 0 ? 2 : 0) === (toward > 0 ? 5 : 0);
      if (reach === 0 && atEdge) {
        await drag(page, m.id, toward * 1.2, 700);
        refused = await hud(page);
      }
    }
    await drag(page, m.id, m.delta + Math.sign(m.delta) * (r.exited ? 0.4 : 0), 450);
    s = r.state;
    if (m.id === tanker.id && !taught && !r.exited) {
      taught = true;
      const now = await page.evaluate((id) => document.querySelector(`.truck[data-id="${id}"]`)?.classList.contains('loaded'), tanker.id);
      check(now === true, 'the tanker is stopped on the rack: the drop on its tag fills');
    }
  }
  if (refused) check(refused.bubble === 'load', `pushed at its gate while empty, its driver says why: "${refused.text}"`);
  await wait(1300);
  const end = await hud(page);
  check(end.won && end.moves === level.par && end.hats === 3, `then its gate takes it: cleared in ${end.moves} moves, par ${level.par}, three hard hats`);
  await context.close();
}

// ---------- Bakken 2: the shift-change gate, by doing ----------
console.log('\nwebkit: Bakken 2 teaches the shift-change gate');
{
  const level = REGIONS[ri('bakken')].levels[1];
  const { context, page } = await open();
  await enter(page, 'bakken', 1);
  const clocks = () => page.evaluate(() => [...document.querySelectorAll('.gate.shift-gate')].map((g) => ({ open: g.classList.contains('shift-open'), clock: !!g.querySelector('.clock svg'), ring: getComputedStyle(g.querySelector('.clock-face')).stroke })));
  const start = await clocks();
  const note = await page.evaluate(() => document.querySelector('.note').textContent);
  check(start.length === level.gates.filter((g) => g.shift).length && start.every((c) => c.clock && !c.open), `its ${start.length} clock gate${start.length > 1 ? 's wear' : ' wears'} a small clock, shut for move 1 (ring ${start[0]?.ring})`);
  check(/even/.test(note), `the tip line says the rule: "${note}"`);
  await page.screenshot({ path: join(OUT, 'region_bakken_2.png') });
  const sol = solve(level);
  let s = newGame(level);
  await drag(page, sol[0].id, sol[0].delta + Math.sign(sol[0].delta) * (tryMove(s, sol[0].id, sol[0].delta).exited ? 0.4 : 0));
  s = tryMove(s, sol[0].id, sol[0].delta).state;
  const one = await clocks();
  check(one.every((c) => c.open) && one[0].ring !== start[0].ring, `after one move the clock turns: open for move 2 (ring ${one[0]?.ring})`);
  await page.locator('[data-act="undo"]').click();
  await wait(350);
  check((await clocks()).every((c) => !c.open), 'Undo turns it back');
  s = newGame(level);
  for (const m of sol) {
    const r = tryMove(s, m.id, m.delta);
    await drag(page, m.id, m.delta + Math.sign(m.delta) * (r.exited ? 0.4 : 0), 450);
    s = r.state;
  }
  await wait(1300);
  const end = await hud(page);
  check(end.won && end.moves === level.par && end.hats === 3, `cleared in ${end.moves} moves, par ${level.par}, three hard hats`);
  await context.close();
}

}

// ---------- Every level of the new regions, at par, by dragging ----------
for (const id of NEW) {
  console.log(`\nwebkit: every ${REGIONS[ri(id)].name} level is cleared at par by its solution`);
  const { context, page } = await open();
  for (const [li, level] of REGIONS[ri(id)].levels.entries()) {
    await enter(page, id, li);
    let s = newGame(level);
    const sol = solve(level);
    let wrong = '';
    for (const [k, m] of sol.entries()) {
      const r = tryMove(s, m.id, m.delta);
      await drag(page, m.id, m.delta + Math.sign(m.delta) * (r.exited ? 0.4 : 0), 330);
      s = r.state;
      if (!wrong && !r.exited) {
        const at = await cellOf(page, m.id);
        const want = s.trucks.find((x) => x.id === m.id);
        if (!at || at.row !== want.row || at.col !== want.col) wrong = `move ${k + 1} (${m.id} by ${m.delta}) left it at ${at?.row},${at?.col}, not ${want.row},${want.col}`;
      }
    }
    await wait(1300);
    const end = await hud(page);
    check(!wrong && end.won && end.moves === level.par && end.hats === 3, `${REGIONS[ri(id)].name} ${li + 1} "${level.name}": ${level.trucks.length} trucks, par ${level.par}${level.muskeg.length ? `, ${level.muskeg.length} muskeg` : ''}${level.racks.length ? `, ${level.racks.length} racks` : ''}${level.gates.some((g) => g.shift) ? `, ${level.gates.filter((g) => g.shift).length} clock gates` : ''}: cleared in ${end.moves}, ${end.hats} hard hats${wrong ? ` (${wrong})` : ''}`);
    if (li === 5) await page.screenshot({ path: join(OUT, `region_${id}_6_won.png`) });
  }
  await context.close();
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
