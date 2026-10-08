// Clearwater's standard scene and its five sightings (Playwright, WebKit at iPhone DPR 3; 390 x 844 and 375 x 812).
//  - THE STANDARD SCENE on all 10 levels, the same on every one: the ground (lichen bands, the sandy two-track, the mud
//    puddle), what stands behind the lane (spruce, the gold aspen, fireweed, red blueberry bushes), the rig mat stack at
//    the lane's right end; all on the screen, none taking a touch, no other trees below the lease
//  - A STACKED PAIR ON ONE TRIGGER: three taps on the mat stack play THREE SWINGS (every beat, in order); it goes into
//    the Wildlife Log; three more taps then play OUT COLD (every beat, in order; the aspen shivers at the ping; the
//    bearded worker says "Fore." in the game's own bubble), and that goes into the log too
//  - before Three Swings has been seen, the taps never bring Out Cold
//  - FRESH WASH: one tap on the mud puddle (every beat, in order; the hauler passes in the front lane)
//  - THE OTHER STACKED PAIR: five trucks driven out in a row with no Undo play DINNER BELL ("Supper!", "Save me some!");
//    an Undo in the middle starts the count again; once Dinner Bell is in the log the same five play ONE PEA
//    ("Watching your carbs, Moe?")
//  - both leave the scene exactly as it was (the level's pixels before and after)
//  - on a very short strip (375 x 667) the scene is still there and the pair does not play
// Run with the dev server up: npm run test:e2e:clearwater-gags
import { webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { UNLOCKED } from './progress.mjs';
import { newGame, solve, tryMove } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const CW = REGIONS.findIndex((r) => r.id === 'clearwater');
const browser = await webkit.launch();

async function open([width, height], query = '') {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${ROOT}?cover=0&night=0${query}`, { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  return { context, page, errors };
}
const enter = async (page, li) => {
  await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
  await page.waitForSelector('.region-tab');
  await page.locator('.region-tab').nth(CW).click();
  await page.locator('.level-btn').nth(li).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(500);
};
const scene = (page) => page.evaluate(() => {
  const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const strip = { top: document.querySelector('.board').getBoundingClientRect().bottom, bottom: document.querySelector('.note').getBoundingClientRect().top };
  const layers = ['clear-ground', 'clear-layer', 'clear-mats'].map((c) => document.querySelector(`.${c}`));
  return {
    strip, w: innerWidth,
    layers: layers.map((l) => (l ? { touch: getComputedStyle(l).pointerEvents, ground: l.dataset.ground } : null)),
    // (What stands in the scene. The ground's tufts are left out: level 1's two-line tip makes its strip a little shorter, and they are scattered to the strip's own size.)
    html: layers.slice(1).map((l) => l?.querySelector('svg')?.innerHTML ?? '').join('|'),
    mats: box('.clear-mats .cw-mats'), aspen: box('.clear-layer .cw-aspen'), lane: document.querySelector('.clear-ground svg')?.innerHTML.includes('#d4c28c'),
    trees: document.querySelectorAll('.clear-layer svg svg').length, flowers: document.querySelectorAll('.clear-layer circle[fill="#c8417e"]').length, bushes: document.querySelectorAll('.clear-layer circle[fill="#9b4a3a"], .clear-layer circle[fill="#c0634c"]').length,
    puddle: document.querySelector('.clear-ground svg')?.innerHTML.includes('#6b5a3a'),
    others: [...document.querySelectorAll('.depth-strip > .sc, .depth-strip > svg.depth-tree')].length,
    biffy: !!document.querySelector('.biffy-layer'), sign: !!document.querySelector('.sign-layer'),
  };
});
const tapMats = async (page, times = 3) => {
  const b = await page.evaluate(() => { const r = document.querySelector('.clear-mats .cw-mats').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  for (let k = 0; k < times; k++) { await page.mouse.click(b.x, b.y); await wait(140); }
};
/** Watches a gag play: the beats it passes through (in order), what was said, whether the aspen turned. */
const watch = (page, id, ms) => page.evaluate(([id, ms]) => new Promise((done) => {
  const seen = [], said = new Set(); let aspen = false, layers = 0; const t0 = performance.now();
  const tick = () => {
    const mine = [...document.querySelectorAll(`.strip-layer[data-gag="${id}"]`)];
    layers = Math.max(layers, mine.length);
    const beat = mine.map((l) => l.dataset.beat).find(Boolean);
    if (beat && seen.at(-1) !== beat) seen.push(beat);
    for (const b of document.querySelectorAll('.bubble')) said.add(b.textContent.trim());
    if (document.querySelector('.clear-layer .cw-aspen')?.hasAttribute('transform')) aspen = true;
    if (performance.now() - t0 > ms || (layers && !mine.length)) return done({ seen, said: [...said], aspen, layers, ms: Math.round(performance.now() - t0), aspenBack: !document.querySelector('.clear-layer .cw-aspen')?.hasAttribute('transform') });
    requestAnimationFrame(tick);
  };
  tick();
}), [id, ms]);
const pixels = async (page) => {
  const m = await page.evaluate(() => ({ top: document.querySelector('.board').getBoundingClientRect().bottom, bottom: document.querySelector('.note').getBoundingClientRect().top, w: innerWidth }));
  return (await page.screenshot({ clip: { x: 0, y: Math.round(m.top), width: m.w, height: Math.round(m.bottom - m.top) } })).toString('base64');
};
const beatsOf = async (id) => (await import('../src/ui/wave3.ts')).WAVE3[id].beats.map((b) => b[1]);
/** The beats a watch must have seen: every one but the first (the watch may begin after it) and any shorter than 0.2 s (a slow frame of this headless browser at DPR 3 can step over those; the unit tests hold their times). */
const mustSee = async (id) => { const b = (await import('../src/ui/wave3.ts')).WAVE3[id].beats; return b.filter((x, i) => i > 0 && (i === b.length - 1 || b[i + 1][0] - x[0] >= 0.2)).map((x) => x[1]); };

for (const size of [[390, 844], [375, 812]]) {
  console.log(`\nwebkit ${size[0]} x ${size[1]}: the standard Clearwater scene`);
  const { context, page, errors } = await open(size, '&gagtest=1');
  let first = null, same = true, all = true;
  for (let li = 0; li < 10; li++) {
    await enter(page, li);
    const s = await scene(page);
    if (!first) first = s;
    same &&= s.html === first.html;
    all &&= s.layers.every((l) => l && l.touch === 'none' && l.ground) && s.trees === 5 && s.flowers > 0 && s.bushes > 0 && s.lane && s.puddle && s.others === 0 && s.biffy && s.sign;
  }
  const s = first;
  check(all, `on all 10 levels: ground, lane and puddle; 4 spruce and the gold aspen, fireweed, red blueberry bushes; the mat stack; the biffy and the sign; no other tree below the lease; nothing takes a touch`);
  check(same, 'the scene is the same on every level: the same trees, fireweed, bushes and mat stack in the same places');
  check(s.mats && s.mats.l >= 0 && s.mats.r <= s.w + 0.5 && s.mats.t >= s.strip.top && s.mats.b <= s.strip.bottom && s.mats.l > s.w * 0.6, `the rig mat stack stands at the lane's right end, whole on the screen (${Math.round(s.mats.l)} to ${Math.round(s.mats.r)} of ${s.w})`);
  check(s.aspen && s.aspen.t >= s.strip.top - 1 && s.aspen.b <= s.strip.bottom, 'the gold aspen stands whole inside the strip (its crown is not cut at the berm)');
  check(Number(s.layers[0].ground) < Number(s.layers[1].ground) && Number(s.layers[1].ground) < Number(s.layers[2].ground), `depth: the ground under everything, the trees behind the mat stack (ground lines ${s.layers.map((l) => l.ground).join(' < ')})`);
  check(errors.length === 0, `no script errors (${errors[0] ?? 'none'})`);
  await context.close();
}

for (const size of [[390, 844], [375, 812]]) {
  console.log(`\nwebkit ${size[0]} x ${size[1]}: the pair on one trigger`);
  const { context, page, errors } = await open(size, '&audiolog');
  await enter(page, 0);
  const before = await pixels(page);
  const log = () => page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:log') ?? '{"found":[]}').found);
  // Two taps: nothing yet. The third: Three Swings.
  await tapMats(page, 2);
  check((await page.$$('.strip-layer[data-gag]')).length === 0, 'two taps on the mat stack: nothing yet');
  await tapMats(page, 1);
  let run = await watch(page, 'golf', 16000);
  const golfBeats = await beatsOf('golf');
  check(run.layers > 0 && run.seen.join() === golfBeats.join(), `the third tap plays Three Swings: all ${golfBeats.length} beats in order (${run.seen.length} seen, ${(run.ms / 1000).toFixed(1)} s)`);
  await wait(500);
  check((await log()).includes('swings') && !(await log()).includes('cold'), 'Three Swings is in the Wildlife Log; Out Cold is not');
  check((await pixels(page)) === before, 'SAME START, SAME END: the strip is exactly as it was before Three Swings');
  // The same trigger again: now Out Cold.
  await tapMats(page, 3);
  run = await watch(page, 'cold', 18000);
  const coldBeats = await beatsOf('cold');
  check(run.layers > 0 && run.seen.join() === coldBeats.join(), `three more taps play Out Cold: all ${coldBeats.length} beats in order (${run.seen.length} seen, ${(run.ms / 1000).toFixed(1)} s)`);
  check(run.said.includes('Fore.'), `the bearded worker says "Fore." in the game's own bubble (${run.said.join(' | ') || 'nothing said'})`);
  check(run.aspen && run.aspenBack, 'the gold aspen shivers when the ball pings off it, and stands still again after');
  await wait(500);
  check((await log()).includes('cold'), 'Out Cold is in the Wildlife Log');
  check((await pixels(page)) === before, 'SAME START, SAME END: the strip is exactly as it was before Out Cold');
  // Both done on this level: more taps only knock the stack.
  await tapMats(page, 3);
  await wait(400);
  check((await page.$$('.strip-layer[data-gag]')).length === 0, 'each plays once a level: more taps only knock the stack');
  // A new level, Three Swings already seen: the trigger goes straight to Out Cold.
  await enter(page, 1);
  await tapMats(page, 3);
  await wait(900);
  const now = await page.$$eval('.strip-layer[data-gag]', (ls) => [...new Set(ls.map((l) => l.dataset.gag))]);
  check(now.join() === 'cold', `on the next level the same trigger plays Out Cold (${now.join() || 'nothing'})`);
  check(errors.length === 0, `no script errors (${errors[0] ?? 'none'})`);
  await context.close();
}

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
/** The level's solution with, for each move, whether it drives a truck out. */
const plan = (level) => { let s = newGame(level); return solve(level).map((m) => { const r = tryMove(s, m.id, m.delta); s = r.state; return { ...m, out: r.exited }; }); };
const move = (page, m) => drag(page, m.id, m.delta + (m.out ? Math.sign(m.delta) * 0.4 : 0), m.out ? 950 : 420);
const onNow = (page) => page.$$eval('.strip-layer[data-gag]', (ls) => [...new Set(ls.map((l) => l.dataset.gag))]);

for (const size of [[390, 844], [375, 812]]) {
  console.log(`\nwebkit ${size[0]} x ${size[1]}: Fresh Wash, Dinner Bell and One Pea`);
  const { context, page, errors } = await open(size);
  const log = () => page.evaluate(() => JSON.parse(localStorage.getItem('rush-hour-rigs:log') ?? '{"found":[]}').found);
  await enter(page, 0);
  const before = await pixels(page);
  // FRESH WASH: one tap on the puddle.
  const pud = await page.evaluate(() => { const g = document.querySelector('.clear-ground svg'), p = g.querySelector('path[fill="#6b5a3a"]').getBoundingClientRect(); return { x: p.left + p.width / 2, y: p.top + p.height / 2 }; });
  await page.mouse.click(pud.x, pud.y);
  let run = await watch(page, 'wash', 20000);
  const washBeats = await beatsOf('wash');
  check(run.layers >= 2 && (await mustSee('wash')).every((b) => run.seen.includes(b)) && run.seen.every((b, i) => i === 0 || washBeats.indexOf(b) > washBeats.indexOf(run.seen[i - 1])), `a tap on the mud puddle plays Fresh Wash: all ${washBeats.length} beats in order (${run.seen.length} seen, ${(run.ms / 1000).toFixed(1)} s), the hauler on its own front lane`);
  await wait(500);
  check((await log()).includes('wash'), 'Fresh Wash is in the Wildlife Log');
  check((await pixels(page)) === before, 'SAME START, SAME END: the strip is exactly as it was before Fresh Wash (the pickup and the hauler drove off; no mud left)');

  // DINNER BELL: five trucks out in a row. First, an Undo in the middle starts the count again.
  const level = REGIONS[CW].levels[0];
  const moves = plan(level);
  const start = moves.findIndex((m, k) => moves.slice(k, k + 9).every((x) => x.out));
  check(start >= 0, `level 1's solution ends with a run of trucks driving out (from move ${start + 1} of ${moves.length})`);
  for (const m of moves.slice(0, start)) await move(page, m);
  for (const m of moves.slice(start, start + 4)) await move(page, m);
  check((await onNow(page)).length === 0, 'four trucks out in a row: nothing yet');
  await page.locator('.controls [data-act="undo"]').click();
  await wait(500);
  await move(page, moves[start + 3]);
  check((await onNow(page)).length === 0, 'an Undo, then that truck out again: the count started over, so still nothing');
  for (const m of moves.slice(start + 4, start + 8)) await move(page, m);
  await wait(300);
  check((await onNow(page)).join() === 'bell', `five out in a row with no Undo: Dinner Bell (${(await onNow(page)).join() || 'nothing'})`);
  run = await watch(page, 'bell', 16000);
  const bellBeats = await beatsOf('bell');
  check(run.layers >= 3 && (await mustSee('bell')).every((b) => run.seen.includes(b)), `Dinner Bell plays through on three lanes (behind the rig mats, the walking lane, the front lane): ${run.seen.length} of its ${bellBeats.length} beats seen from where the watch began`);
  check(run.said.includes('Supper!'), `the cook says "Supper!" in the game's own bubble`);
  check(run.said.includes('Save me some!'), `Slow Moe, late, says "Save me some!" in the game's own bubble (${run.said.join(' | ') || 'nothing said'})`);
  await wait(500);
  check((await log()).includes('bell') && !(await log()).includes('pea'), 'Dinner Bell is in the Wildlife Log; One Pea is not');

  // ONE PEA: the same five in a row, now that Dinner Bell has been seen (a fresh start of the level).
  await page.locator('.controls [data-act="restart"]').click();
  await wait(600);
  for (const m of moves.slice(0, start + 5)) await move(page, m);
  await wait(300);
  check((await onNow(page)).join() === 'pea', `five out in a row again: One Pea (${(await onNow(page)).join() || 'nothing'})`);
  run = await watch(page, 'pea', 16000);
  const peaBeats = await beatsOf('pea');
  check((await mustSee('pea')).every((b) => run.seen.includes(b)), `One Pea plays through: ${run.seen.length} of its ${peaBeats.length} beats seen`);
  check(run.said.includes('Watching your carbs, Moe?'), `the bearded worker says "Watching your carbs, Moe?" (${run.said.join(' | ') || 'nothing said'})`);
  await wait(500);
  check((await log()).includes('pea'), 'One Pea is in the Wildlife Log');
  check(errors.length === 0, `no script errors (${errors[0] ?? 'none'})`);
  await context.close();
}

console.log('\nwebkit 375 x 667 (iPhone SE): a very short strip');
{
  const { context, page } = await open([375, 667]);
  await enter(page, 0);
  const s = await scene(page);
  await tapMats(page, 3);
  await wait(900);
  const playing = (await page.$$('.strip-layer[data-gag]')).length;
  check(s.layers.every(Boolean) && s.mats && playing === 0, `the scene is there (strip ${Math.round(s.strip.bottom - s.strip.top)} px tall); the pair does not play where there is no room for it`);
  await context.close();
}

await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
