// The lease sign and its three gags, 16 to 18 (Playwright, WebKit as the judge): the sign is
// permanent scenery at ONE fixed spot on every level; the surveyor comes on Restart (1 in 2), the
// deer on a tap of the sign, the tourists on the Daily Pad's first move (1 in 3); no deer or
// tourists on winter levels. Each plays its beats in order, its visitors come from fully off the
// near edge and leave fully off screen, and the sign ends exactly where it began. Saves clips
// (gag16_*.webm ...) to OUT. Run with the dev server up: npm run test:e2e:signs
import { DEMO, UNLOCKED } from './progress.mjs';
import { webkit } from 'playwright';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame } from '../src/engine/index.ts';
import { DEER_BEATS, SURVEY_BEATS, TOUR_BEATS, T_PICKUP, T_PLANT } from '../src/ui/sign-gags.ts';
import { LOG_ENTRIES } from '../src/ui/wildlife-log.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const W = 390;
const QUIET = '?cover=0&magpie=0&worker=0&moose=0&cooldown=0&night=0&off=sam,tongue,lunch';
const region = (id) => REGIONS.findIndex((r) => r.id === id);
const browser = await webkit.launch();

async function open({ query = QUIET, level = [0, 5], daily = false, reducedMotion = 'no-preference', progress = UNLOCKED, video = null } = {}) {
  const context = await browser.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion, ...(video ? { recordVideo: { dir: video, size: { width: W, height: 844 } } } : {}) });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  if (!query.includes('gag=')) {
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, progress);
    await page.reload({ waitUntil: 'networkidle' });
    if (daily) await page.locator('.daily-btn').click();
    else if (level) {
      await page.locator('.region-tab').nth(level[0]).click();
      await page.locator('.level-btn').nth(level[1]).click();
    }
  }
  if (level || daily || query.includes('gag=')) await page.waitForSelector('.board .truck.sprite-on');
  return { context, page };
}
/** Follows a gag every frame until its layers have gone: beats, the visitors' boxes, the sign's place, what is said. */
const watch = (page, gag, who, ms = 26000) =>
  page.evaluate(
    ([name, sel, limit]) =>
      new Promise((res) => {
        const log = [];
        const said = [];
        const t0 = performance.now();
        const tick = () => {
          const layers = [...document.querySelectorAll(`.strip-layer[data-gag="${name}"]`)];
          const now = performance.now() - t0;
          if (layers.length) {
            const sign = document.querySelector('.sign-layer svg.pup .sg').getBoundingClientRect();
            const f = { t: now, beat: layers.at(-1).dataset.beat, sign: { x: sign.left + sign.width / 2, y: sign.top }, others: document.querySelectorAll('.strip-layer, .magpie-layer, .worker-layer, .moose-layer').length - layers.length, who: [] };
            for (const el of layers.at(-1).querySelectorAll(sel)) { const b = el.getBoundingClientRect(); if (getComputedStyle(el).visibility !== 'hidden' && b.width > 2) f.who.push({ l: b.left, r: b.right }); }
            const text = document.querySelector('.bubble[data-gag]')?.textContent;
            if (text && said.at(-1) !== text) said.push(text);
            const bzz = layers.at(-1).querySelector('text.bzz');
            if (bzz) f.bzz = bzz.getScreenCTM().a;
            log.push(f);
          }
          if ((!layers.length && log.length) || now > limit) return res({ log, said });
          requestAnimationFrame(tick);
        };
        tick();
      }),
    [gag, who, ms],
  );
const beatsOf = (log) => [...new Set(log.map((f) => f.beat).filter(Boolean))];
const same = (log, beats) => JSON.stringify(beatsOf(log)) === JSON.stringify(beats.map((b) => b[1]));
const signAt = (page) => page.evaluate(() => { const s = document.querySelector('.sign-layer svg.pup .sg'); if (!s) return null; const r = s.getBoundingClientRect(); return { n: document.querySelectorAll('.sign-layer svg.pup').length, x: r.left + r.width / 2, top: r.top, under: r.top - document.querySelector('.board').getBoundingClientRect().bottom, bottom: r.bottom, w: r.width, old: document.querySelectorAll('.scenery [href="#art-sign"], .scenery .sc-sign').length, clearBoard: r.top >= document.querySelector('.board').getBoundingClientRect().bottom, clearNote: r.bottom <= document.querySelector('.note').getBoundingClientRect().top + 1, touch: getComputedStyle(document.querySelector('.sign-layer')).pointerEvents }; });
const tapSign = (page) => page.evaluate(() => { const r = document.querySelector('.sign-layer svg.pup .sg').getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height * 0.3; const el = document.querySelector('.screen.game'); for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(type, { pointerId: 51, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true })); });
const firstMove = (page, level) => {
  const s = newGame(level);
  const m = s.trucks.map((t) => ({ t, r: getMoveRange(s, t.id) })).find(({ r }) => r && ((r.max > 0 && r.exitDelta !== r.max) || (r.min < 0 && r.exitDelta !== r.min)));
  const by = m.r.max > 0 && m.r.exitDelta !== m.r.max ? 1 : -1;
  return page.evaluate(async ([id, n]) => {
    const el = document.querySelector(`.truck[data-id="${id}"]`); const r = el.getBoundingClientRect(); const h = el.classList.contains('horiz');
    const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
    let x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 52, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
    ev('pointerdown'); for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((q) => requestAnimationFrame(q)); } ev('pointerup');
    await new Promise((q) => setTimeout(q, 450));
  }, [m.t.id, by]);
};

// ---------- The sign: permanent, at one fixed spot ----------
console.log('\nwebkit: the lease sign is permanent scenery at one fixed spot');
{
  const spots = [];
  for (const [ri, li] of [[0, 0], [0, 5], [0, 9], [1, 2], [1, 8], [2, 1], [2, 7]]) {
    const { context, page } = await open({ level: [ri, li] });
    await wait(300);
    const s = await signAt(page);
    spots.push({ where: `${REGIONS[ri].name} ${li + 1}`, ...s });
    await context.close();
  }
  {
    const { context, page } = await open({ daily: true });
    await wait(300);
    spots.push({ where: 'Daily Pad', ...(await signAt(page)) });
    await context.close();
  }
  check(spots.every((s) => s.n === 1 && s.old === 0), `one sign on each of ${spots.length} levels (three regions and the Daily Pad), and no other in the scenery`);
  // (The same place across the screen, and the same distance under the berm: the lease itself sits a little higher or lower with the length of the level's tip line.)
  check(spots.every((s) => Math.abs(s.x - 0.62 * W) < 1 && Math.abs(s.under - spots[0].under) < 1), `always at the same spot (x ${spots[0].x.toFixed(1)}, ${spots[0].under.toFixed(1)} px under the lease): ${spots.filter((s) => Math.abs(s.x - 0.62 * W) >= 1 || Math.abs(s.under - spots[0].under) >= 1).map((s) => `${s.where} ${s.x.toFixed(1)}/${s.under.toFixed(1)}`).join(', ') || 'all the same'}`);
  check(spots.every((s) => s.clearBoard && s.clearNote && s.touch === 'none'), 'in the bottom strip, clear of the lease and the tip line; its layer takes no touches');
}

// ---------- 16. The surveyor: Restart, one time in two ----------
console.log('\nwebkit: the surveyor (Restart, 1 in 2; ?surveyor=1 and =0 fix the roll here)');
{
  const { context, page } = await open({ query: QUIET + '&surveyor=0' });
  await page.locator('[data-act="restart"]').click();
  await wait(900);
  check(!(await page.$('.strip-layer')), 'a Restart that loses the roll: nobody comes');
  await context.close();
}
{
  const { context, page } = await open({ query: QUIET + '&surveyor=1' });
  const home = await signAt(page);
  const watching = watch(page, 'surveyor', '.sign-stage svg.pup .torso');
  await page.locator('[data-act="restart"]').click();
  const { log, said } = await watching;
  check(same(log, SURVEY_BEATS), `Restart brings him: the reference beats, in order (${beatsOf(log).length} of ${SURVEY_BEATS.length})`);
  const seen = log.filter((f) => f.who.length);
  check(seen[0].who[0].l >= W && seen.at(-1).who[0].l >= W - 2, `he walks in from fully off the near edge (the right) and leaves the same way (${Math.round(seen[0].who[0].l)} to ${Math.round(seen.at(-1).who[0].l)})`);
  check(JSON.stringify(said) === JSON.stringify(['Off a metre.', 'Huh.', 'Perfect.']), `he says ${said.map((s) => `"${s}"`).join(', ')}`);
  const far = Math.max(...log.map((f) => Math.abs(f.sign.x - home.x))), lifted = Math.max(...log.map((f) => home.top - f.sign.y));
  check(far > 6 && far < 14 && lifted > 5, `he yanks the sign up (${lifted.toFixed(1)} px) and moves it a metre (${far.toFixed(1)} px)`);
  const after = await signAt(page);
  check(Math.abs(after.x - home.x) < 0.3 && Math.abs(after.top - home.top) < 0.3, 'SAME START, SAME END: the sign is back exactly where it was');
  check(log.every((f) => f.others === 0), 'nothing else was on stage');
  await page.locator('[data-act="restart"]').click();
  await wait(900);
  check(!(await page.$('.strip-layer')), 'once a visit: another Restart brings nobody');
  await context.close();
}

// ---------- 17. The back scratcher: tap the sign ----------
console.log('\nwebkit: the back scratcher (tap the sign)');
{
  const { context, page } = await open();
  const home = await signAt(page);
  await wait(500);
  check(!(await page.$('.strip-layer')), 'not before the sign is tapped');
  const watching = watch(page, 'deer', '.sign-stage svg.pup .bod');
  await tapSign(page);
  const { log } = await watching;
  check(same(log, DEER_BEATS), `a tap on the sign brings the deer: its beats, in order (${beatsOf(log).length} of ${DEER_BEATS.length})`);
  const seen = log.filter((f) => f.who.length);
  check(seen[0].who[0].l >= W && seen.at(-1).who[0].r <= 2, `it wanders in from fully off the near edge and ambles off PAST the sign, fully off the far edge (${Math.round(seen[0].who[0].l)} to ${Math.round(seen.at(-1).who[0].r)})`);
  const rub = log.filter((f) => f.beat === 'rubs' || f.beat === 'bliss' || f.beat === 'thump');
  check(rub.every((f) => f.who[0].l > home.x), `it rubs from the near side of the sign, its body never past the post (nearest ${Math.round(Math.min(...rub.map((f) => f.who[0].l)) - home.x)} px from the sign's middle)`);
  const after = await signAt(page);
  check(Math.abs(after.x - home.x) < 0.3 && Math.abs(after.top - home.top) < 0.3, 'SAME START, SAME END: the sign stands still again, where it was');
  await tapSign(page);
  await wait(900);
  check(!(await page.$('.strip-layer')), 'once per level: another tap brings nothing');
  await context.close();
}
{
  const { context, page } = await open({ level: [region('duvernay'), 3] });
  await tapSign(page);
  await wait(1000);
  check(!!(await signAt(page)) && !(await page.$('.strip-layer')), 'a winter level has the sign, but no deer comes when it is tapped');
  await context.close();
}

// ---------- 18. The tourists: the Daily Pad's first move, one time in three ----------
console.log('\nwebkit: the tourists (first move on the Daily Pad, 1 in 3; ?tourists=1 and =0 fix the roll here)');
{
  const daily = (await import('../src/levels/daily.json', { with: { type: 'json' } })).default;
  const today = async (page) => { const n = await page.evaluate(() => Number(document.querySelector('.hud .num, .hud .name').textContent.match(/\d+/)?.[0] ?? document.querySelector('.hud .title').textContent.match(/\d+/)[0])); return daily[(n - 1) % daily.length]; };
  {
    const { context, page } = await open({ query: QUIET + '&tourists=0', daily: true });
    await firstMove(page, await today(page));
    await wait(700);
    check(!(await page.$('.strip-layer')), 'a first move that loses the roll: nobody comes');
    await context.close();
  }
  {
    const { context, page } = await open({ query: QUIET + '&tourists=1', level: [0, 5] });
    await firstMove(page, REGIONS[0].levels[5]);
    await wait(700);
    check(!(await page.$('.strip-layer')), 'not on a region level: only the Daily Pad');
    await context.close();
  }
  const { context, page } = await open({ query: QUIET + '&tourists=1', daily: true });
  const home = await signAt(page);
  const watching = watch(page, 'tourists', '.sign-stage svg.pup .torso');
  await firstMove(page, await today(page));
  const { log, said } = await watching;
  check(same(log, TOUR_BEATS), `the first move brings them: their beats, in order (${beatsOf(log).length} of ${TOUR_BEATS.length})`);
  const seen = log.filter((f) => f.who.length);
  check(seen[0].who.every((w) => w.l >= W) && seen.at(-1).who.every((w) => w.l >= W - 2), 'the couple strolls in from fully off the near edge and runs off the same way, fully off screen');
  check(said.join() === 'A real oil sign!', `he says "${said.join()}"`);
  const pose = log.filter((f) => f.beat === 'poses' || f.beat === 'flash');
  check(pose.length > 5 && pose.every((f) => f.who.length === 2 && Math.abs(f.who[0].l - f.who[1].l) > 25), 'she stands back to photograph him posing by the sign');
  const bzz = log.filter((f) => f.bzz !== undefined);
  check(bzz.length > 10 && bzz.every((f) => f.bzz > 0), 'BZZZZ reads the right way round');
  const after = await signAt(page);
  check(Math.abs(after.x - home.x) < 0.3 && Math.abs(after.top - home.top) < 0.3, 'SAME START, SAME END: just the sign again');
  await context.close();
}

// ---------- Reduced motion, the Wildlife Log, clips ----------
console.log('\nwebkit: reduced motion');
for (const gag of ['surveyor', 'deer', 'tourists']) {
  const { context, page } = await open({ query: `?gag=${gag}`, reducedMotion: 'reduce' });
  await page.waitForSelector('.strip-layer', { state: 'attached', timeout: 8000 });
  await wait(800);
  const snap = () => page.evaluate(() => { const l = [...document.querySelectorAll('.strip-layer')].at(-1); return l ? { beat: l.dataset.beat, o: getComputedStyle(l).opacity, at: [...l.querySelectorAll('svg.pup')].map((s) => s.style.left).join() } : null; });
  const a = await snap();
  await wait(500);
  const b = await snap();
  check(a?.beat === 'still' && a.o === '1' && a.at === b?.at, `${gag}: fades in as a still and holds`);
  await context.close();
}
// The surveyor's tripod (held frame by frame, ?gagtest=1): carried, it is a CHILD OF HIS FOREARM
// (no element of its own to tween); standing, it is one drawing that never moves; and at the two
// instants it changes hands the two drawings are in the same place, so nothing jumps.
console.log('\nwebkit: the surveyor\'s tripod');
{
  const { context, page } = await open({ query: '?cover=0&gagtest=1&night=0' });
  const run = await page.evaluate(async () => {
    const g = window.__rhrGag;
    g.hold('surveyor', 1.0);
    const held = document.querySelector('.surveyor-layer .armF .fore > .held');
    const stand = [...document.querySelectorAll('.surveyor-layer svg.pup')].find((s) => !s.querySelector('.armF') && s.querySelector('.legs'));
    const legs = stand.querySelector('.legs');
    let redraws = 0;
    new MutationObserver(() => redraws++).observe(legs, { childList: true });
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.bottom, w: r.width }; };
    const out = [];
    for (let t = 0.5; t <= 16.6; t += 1 / 60) {
      g.hold('surveyor', t);
      await Promise.resolve();
      const inHand = held.style.display !== 'none', standing = stand.style.visibility !== 'hidden';
      const glove = box(held.parentElement.querySelector('circle'));
      out.push({ t, inHand, standing, redraws, at: `${stand.style.left} ${stand.style.top} ${stand.style.transform}`, tri: inHand ? box(held.querySelector('.headpiece')) : standing ? box(stand.querySelector('.headpiece')) : null, glove });
    }
    g.release('surveyor');
    return { out, child: !!held && held.closest('.armF') !== null, feet: null };
  });
  const f = run.out;
  check(run.child && f.every((x) => x.inHand !== x.standing), 'carried, the tripod is a child of his front forearm; there is always exactly one tripod on screen');
  check(new Set(f.map((x) => x.at)).size === 1, 'the standing tripod is put on its spot once and never moved or turned');
  const swaps = f.slice(1).map((x, i) => ({ t: x.t, from: f[i], to: x })).filter((s) => s.from.inHand !== s.to.inHand);
  const jump = (s) => Math.hypot(s.to.tri.x - s.from.tri.x, s.to.tri.y - s.from.tri.y);
  check(swaps.length === 2 && Math.abs(swaps[0].t - T_PLANT) < 0.02 && Math.abs(swaps[1].t - T_PICKUP) < 0.02 && swaps.every((s) => jump(s) < 0.6), `set down at ${swaps[0]?.t.toFixed(2)} s and taken up at ${swaps[1]?.t.toFixed(2)} s with the two drawings in the same place (${swaps.map((s) => jump(s).toFixed(2)).join(' and ')} px apart)`);
  const carried = f.filter((x) => x.inHand);
  const grip = carried.map((x) => Math.hypot(x.tri.x - x.glove.x, 0));
  check(Math.max(...grip) < 14, `in his hand it stays at his glove through every step (never more than ${Math.max(...grip).toFixed(1)} px to the side of it)`);
  const hand = f.filter((x) => x.inHand);
  const first = hand[0].redraws, spread = f.filter((x) => x.standing && x.t > T_PLANT + 0.5 && x.t < T_PICKUP - 0.5);
  check(first === 0 && spread[spread.length - 1].redraws === spread[0].redraws && f[f.length - 1].redraws > spread[0].redraws, 'its legs unfold only on the set-down spot and fold there again; carried, it is always folded');
  await context.close();
}
console.log('\nwebkit: Wildlife Log');
for (const [mode, progress] of [['game', UNLOCKED], ['demo', DEMO]]) {
  const { context, page } = await open({ level: null, progress });
  await page.locator('.binoculars').click();
  await page.waitForSelector('.log-card');
  const cards = await page.evaluate(() => [...document.querySelectorAll('.log-card')].map((c) => ({ id: c.dataset.id, art: !!c.querySelector('.art svg'), text: c.querySelector('p').textContent })));
  const by = Object.fromEntries(cards.map((c) => [c.id, c]));
  if (mode === 'game') check(cards.length === LOG_ENTRIES.filter((e) => !e.hidden).length && ['surveyor', 'deer', 'tourists'].every((id) => by[id]?.art && by[id].text === 'Not seen yet.'), `the log has ${cards.length} cards; Surveyor, Back Scratcher and Tourists have puppet art and keep their secrets`);
  else check(by.surveyor.text === 'Press Restart. He may come to check the sign.' && by.deer.text === 'Tap the lease sign (spring to fall).' && by.tourists.text === 'Play the Daily Pad. They may show up on your first move (spring to fall).', 'demo mode shows their hints');
  await context.close();
}
if (!process.env.NO_CLIPS) {
  for (const [gag, name, secs] of [['surveyor', 'gag16_surveyor', 18.5], ['deer', 'gag17_back_scratcher', 11], ['tourists', 'gag18_tourists', 10.5]]) {
    const dir = join(OUT, `tmp_${gag}`);
    const { context, page } = await open({ query: `?gag=${gag}`, video: dir });
    await wait(secs * 1000);
    const video = page.video();
    await context.close();
    renameSync(await video.path(), join(OUT, `${name}.webm`));
    rmSync(dir, { recursive: true, force: true });
    console.log(`   saved ${name}.webm`);
  }
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
