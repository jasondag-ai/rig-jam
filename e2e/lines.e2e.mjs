// Lines test (Playwright, WebKit, 390x844): what drivers say.
//  - a bump into a tank, a wellhead or a flare stack can say that thing's own line (its pool mixed
//    with "any"); the same truck hitting the same kind of thing again escalates (2nd, then 3rd line)
//  - a repeated wall bump ends on "..."; Restart starts the count again
//  - a witness line: with a gag on screen, the next truck moved remarks on it, once per gag
//  - the Company Man speaks a line for the result
// Run with the dev server up: npm run test:e2e:lines
import { UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame } from '../src/engine/index.ts';
import { bumpTarget } from '../src/ui/bump.ts';
import { BUMP_LINES, COMPANY_LINES, ESCALATION, FOURTH_WALL_LINES, WITNESS_LINES } from '../src/ui/lines.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const QUIET = '?cover=0&magpie=0&worker=0&moose=0&night=0&off=lunch,sam,tongue,porcupine';
const browser = await webkit.launch();

/** `random` pins Math.random (0.999 picks the LAST line of a pool: the hit's own pool comes after "any"). */
async function open(level, { query = QUIET, random = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  if (random !== null) await page.addInitScript((r) => { Math.random = () => r; }, random);
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.region-tab').nth(level[0]).click();
  await page.locator('.level-btn').nth(level[1]).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(300);
  return { context, page };
}
const drag = (page, id, cells, settle = 900) =>
  page.evaluate(async ([truckId, n, ms]) => {
    const el = document.querySelector(`.truck[data-id="${truckId}"]:not(.exiting)`);
    const r = el.getBoundingClientRect();
    const h = el.classList.contains('horiz');
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    let x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 21, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown');
    for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); }
    ev('pointerup');
    await new Promise((q) => setTimeout(q, ms));
  }, [id, cells, settle]);
const bubble = (page) => page.evaluate(() => { const b = document.querySelector('.bubble'); return b ? { text: b.textContent, hit: b.dataset.hit, nth: b.dataset.nth, witness: b.dataset.witness, speaker: b.dataset.speaker } : null; });

/** A truck that, from the start of a level, bumps straight into something of this kind (no move first). */
function bumperInto(kind) {
  for (const [ri, region] of REGIONS.entries())
    for (const [li, level] of region.levels.entries()) {
      const st = newGame(level);
      for (const t of st.trucks) {
        const range = getMoveRange(st, t.id);
        for (const dir of [1, -1]) {
          if ((dir === 1 ? range.max : range.min) !== 0) continue;
          if (bumpTarget(st, t.id, range, dir).hit === kind) return { level: [ri, li], id: t.id, dir, name: `${region.name} ${li + 1}` };
        }
      }
    }
  return null;
}

console.log('\nwebkit 390x844: bump lines');
for (const kind of ['tank', 'wellhead', 'flare']) {
  const at = bumperInto(kind);
  if (!at) { check(false, `${kind}: no truck starts next to one`); continue; }
  const { context, page } = await open(at.level, { random: 0.999 });
  await drag(page, at.id, at.dir * 1.2);
  const first = await bubble(page);
  check(first?.hit === kind && BUMP_LINES[kind].includes(first.text), `${at.name}: a bump into a ${kind} can say the ${kind}'s own line: "${first?.text}"`);
  await drag(page, at.id, at.dir * 1.2);
  const second = await bubble(page);
  await drag(page, at.id, at.dir * 1.2);
  const third = await bubble(page);
  check(second?.text === ESCALATION[kind][0] && third?.text === ESCALATION[kind][1], `the same truck into the ${kind} again: "${second?.text}", then "${third?.text}"`);
  await context.close();
}
{
  // Without the pin: a tank bump draws from "any" and the tank's pool only.
  const at = bumperInto('tank');
  const { context, page } = await open(at.level);
  await drag(page, at.id, at.dir * 1.2);
  const b = await bubble(page);
  check([...BUMP_LINES.any, ...BUMP_LINES.tank].includes(b?.text), `unpinned, the line is from "any" or the tank's pool ("${b?.text}")`);
  await context.close();
}

console.log('\nwebkit 390x844: a repeated wall bump escalates');
{
  const at = bumperInto('wall');
  const { context, page } = await open(at.level);
  const said = [];
  for (let i = 0; i < 4; i++) { await drag(page, at.id, at.dir * 1.2); said.push((await bubble(page))?.text); }
  check([...BUMP_LINES.any, ...BUMP_LINES.wall].includes(said[0]), `${at.name}, 1st: a line from the pool ("${said[0]}")`);
  check(said[1] === "It's still a wall." && said[2] === '...' && said[3] === '...', `2nd: "${said[1]}"; 3rd and after: "${said[2]}"`);
  await page.locator('[data-act="restart"]').click();
  await wait(400);
  await drag(page, at.id, at.dir * 1.2);
  const fresh = (await bubble(page))?.text;
  check([...BUMP_LINES.any, ...BUMP_LINES.wall].includes(fresh), `Restart starts the count again ("${fresh}")`);
  await context.close();
}

console.log('\nwebkit 390x844: a driver reacts while a gag is on screen');
{
  // Cardium: a bump down into the bottom berm brings Biffy A; then move another truck.
  const cardium = REGIONS.findIndex((r) => r.id === 'cardium');
  const pick = (() => {
    for (const [li, level] of REGIONS[cardium].levels.entries()) {
      const st = newGame(level);
      const bumper = st.trucks.find((t) => t.orient === 'v' && t.row + t.length === 6 && getMoveRange(st, t.id)?.exitDelta !== 1);
      // Another truck with a plain move to make (not out through its gate) and room to make two.
      const mover = bumper && st.trucks.map((t) => ({ t, r: getMoveRange(st, t.id) })).find(({ t, r }) => t.id !== bumper.id && ((r.max >= 1 && r.exitDelta !== 1) || (r.min <= -1 && r.exitDelta !== -1)));
      if (bumper && mover) return { li, bumper: bumper.id, mover: mover.t.id, step: mover.r.max >= 1 && mover.r.exitDelta !== 1 ? 1 : -1 };
    }
    return null;
  })();
  const { context, page } = await open([cardium, pick.li]);
  await drag(page, pick.mover, pick.step, 600);
  check(!(await bubble(page))?.witness, 'a move with no gag on screen: nobody remarks on anything');
  // (Three moves of this truck in all: a fourth back-and-forth would bring the landowner, and a remark about him.)
  await drag(page, pick.bumper, 2, 200);
  await page.waitForSelector('.strip-layer[data-gag="biffyA"]', { state: 'attached', timeout: 5000 });
  await drag(page, pick.mover, -pick.step, 700);
  const w = await bubble(page);
  check(w?.witness === 'biffyA' && w.text === WITNESS_LINES.biffyA, `with Biffy A on screen, the truck just moved says "${w?.text}"`);
  const from = await page.evaluate((id) => { const b = document.querySelector('.bubble').getBoundingClientRect(), t = document.querySelector(`.truck[data-id="${id}"]`).getBoundingClientRect(); return Math.hypot(b.left + b.width / 2 - (t.left + t.width / 2), b.top + b.height / 2 - (t.top + t.height / 2)); }, pick.mover);
  check(from < 150, `the bubble is at that truck (${Math.round(from)}px from it)`);
  await page.evaluate(() => document.querySelector('.bubble')?.remove());
  await drag(page, pick.mover, pick.step, 700);
  check(!(await bubble(page)) && (await page.$$('.strip-layer[data-gag="biffyA"]')).length > 0, 'once per gag per level: the next move says nothing more about it, though Biffy A is still on');
  await context.close();
}

console.log('\nwebkit 390x844: the Company Man');
{
  const level = REGIONS[0].levels[0];
  const { solve } = await import('../src/engine/index.ts');
  const { context, page } = await open([0, 0]);
  for (const m of solve(level)) await drag(page, m.id, m.delta + Math.sign(m.delta) * 0.4, 700);
  await page.waitForFunction(() => !document.querySelector('.overlay.win').hidden, null, { timeout: 6000 });
  const line = await page.$eval('.company-says', (p) => p.textContent);
  check(COMPANY_LINES.par.includes(line) && !FOURTH_WALL_LINES.includes(line), `at par, with no gag this level: one of his eight par lines ("${line}")`);
  await context.close();
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
