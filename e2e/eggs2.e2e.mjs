// Gags 8 and up (Playwright, WebKit as the judge; Chromium for the frame rate): the marshmallow on
// the flare stack and the geese with the lost goose. Each plays its reference beats in order when
// its trigger fires (gag-triggers.ts), characters start and end fully off screen, nothing takes a
// touch, reduced motion fades a still, and each has a Wildlife Log card.
// Saves clips to OUT. Run with the dev server up: npm run test:e2e:eggs2   (ONLY=geese to run one)
import { DEMO, UNLOCKED } from './progress.mjs';
import { chromium, webkit } from 'playwright';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../src/engine/index.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(homedir(), 'Desktop', 'RHR Art Inbox', 'fit_check');
const ONLY = process.env.ONLY ?? '';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const QUIET = '?cover=0&magpie=0&worker=0&moose=0&cooldown=0&off=lunch,sam,tongue';
const region = (id) => REGIONS.findIndex((r) => r.id === id);
const W = 390;

/** name: [preview, beats, clip name, selector of the gag's main layer] */
const GAGS = {
  marshmallow: { preview: 'marshmallow', clip: 'gag89_marshmallow', beats: ['walk-in', 'eyes-flare', 'telescope', 'roast', 'fwoomp', 'eyes-pop', 'yank', 'blow', 'sniff-shrug', 'crispy', 'ear-smoke', 'gone'] },
  bear: { preview: 'bear', clip: 'gag10_bear', beats: ['hare-nibbles', 'bear-in', 'sniff', 'sit', 'smug', 'strain', 'relief', 'spots-ears', 'snatch', 'long-look', 'swing', 'wipe', 'inspect', 'set-down', 'violated', 'bear-leaves', 'trudge', 'gone'] },
  bull: { preview: 'bull', clip: 'gag11_bull', beats: ['cow-grazes', 'bull-in', 'freeze', 'lick-hoof', 'slick', 'chest-puff', 'hearts', 'cow-looks', 'eyes-huge', 'hop-turn', 'bolts', 'paws', 'charge', 'last-heart', 'cow-back', 'catches-breath', 'grazes-again'] },
  porcupine: { preview: 'porcupine', clip: 'gag12_porcupine', beats: ['quiet-bush', 'stroll-in', 'look-around', 'squat', 'poke', 'roll-pops', 'springs-out', 'porcupine-bolts', 'scurry'] },
  gopherLunch: { preview: 'lunch', clip: 'gag13_gopher_lunch', beats: ['quiet-mound', 'stroll-in', 'plops-down', 'sets-it-down', 'phone', 'paw-peeks', 'feels-around', 'yank', 'chomp', 'crust-back', 'bite', 'eyes-huge', 'cheeks', 'ducks', 'deadpan', 'boils-over', 'hurls-crust', 'stomps-off', 'burp', 'quiet-again'] },
  sam: { preview: 'sam', clip: 'gag14_safety_sam', beats: ['bad-moves', 'march-in', 'looks-up', 'tsk', 'scribble', 'see-me', 'fingers-to-eyes', 'points', 'backs-off'] },
  tongue: { preview: 'tongue', clip: 'gag15_frozen_tongue', beats: ['frosty-riser', 'stroll-in', 'eyes-pipe', 'checks-around', 'lick', 'stuck', 'pulls', 'hewp', 'buddy-in', 'buddy-looks', 'phone-out', 'flash', 'deadpan', 'cracks-up', 'buddy-leaves', 'snowflake', 'buddy-back', 'sigh', 'pours', 'thwip', 'rubs-tongue', 'walk-off', 'riser-again'] },
  geese: { preview: 'geese', clip: 'gag89_geese', beats: ['v-flies', 'wrong-way', 'pass', 'stall', 'honk', 'snap-turn', 'chase', 'straggler', 'feather'] },
};
const want = (name) => !ONLY || ONLY === name;

async function open(browser, { width = W, height = 844, query = QUIET, reducedMotion = 'no-preference', video = null, level = [0, 5], progress = UNLOCKED, enter = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, reducedMotion, ...(video ? { recordVideo: { dir: video, size: { width, height } } } : {}) });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(ROOT + query, { waitUntil: 'networkidle' });
  if (!query.includes('gag=')) {
    await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, progress);
    await page.reload({ waitUntil: 'networkidle' });
    if (enter) {
      await page.locator('.region-tab').nth(level[0]).click();
      await page.locator('.level-btn').nth(level[1]).click();
    }
  }
  if (enter || query.includes('gag=')) await page.waitForSelector('.board .truck.sprite-on');
  return { context, page };
}

/** Drags a truck by `cells` along its lane with touch pointer events. */
const drag = (page, id, cells, settle = 420) =>
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

/** A finger tap at a point (touch pointer events on whatever is there). */
const tapAt = (page, x, y) =>
  page.evaluate(([px, py]) => {
    const el = document.elementFromPoint(px, py);
    for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(type, { pointerId: 31, pointerType: 'touch', isPrimary: true, clientX: px, clientY: py, bubbles: true, cancelable: true }));
    return el.className?.baseVal ?? el.className;
  }, [x, y]);

/**
 * Follows a gag every frame until its layers have gone: the beat, the screen boxes of every puppet
 * in `pups` (a selector), extra `parts`, and the horizontal flip of `flip`.
 */
const watch = (page, gag, { pups = '', parts = {}, flip = '' } = {}, ms = 24000) =>
  page.evaluate(
    ([name, pupSel, sel, flipSel, limit]) =>
      new Promise((res) => {
        const log = [];
        const t0 = performance.now();
        const box = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { l: b.left, r: b.right, t: b.top, b: b.bottom, z: +(el.closest('svg')?.style.zIndex || 0), vis: cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0' }; };
        const tick = () => {
          const layers = [...document.querySelectorAll(`.strip-layer[data-gag="${name}"]`)];
          const now = performance.now() - t0;
          if (layers.length) {
            const f = { t: now, beat: layers.at(-1).dataset.beat, others: document.querySelectorAll('.strip-layer, .magpie-layer, .worker-layer, .moose-layer').length - layers.length };
            if (pupSel) f.pups = [...document.querySelectorAll(pupSel)].map(box);
            for (const [k, q] of Object.entries(sel)) { const el = document.querySelector(q); if (el) f[k] = box(el); }
            if (flipSel) { const m = /scale\(([-\d.]+)/.exec([...document.querySelectorAll(flipSel)].at(-1)?.getAttribute('transform') ?? ''); f.flip = m ? +m[1] : 1; }
            log.push(f);
          }
          if ((!layers.length && log.length) || now > limit) return res(log);
          requestAnimationFrame(tick);
        };
        tick();
      }),
    [gag, pups, parts, flip, ms],
  );
const beatsOf = (log) => [...new Set(log.map((f) => f.beat).filter(Boolean))];
const sameBeats = (log, name) => JSON.stringify(beatsOf(log)) === JSON.stringify(GAGS[name].beats);
const bubbleOf = (page, gag, timeout = 14000) =>
  page.waitForSelector(`.bubble[data-gag="${gag}"]`, { timeout }).then(async (b) => ({ text: await b.textContent(), box: await b.boundingBox() })).catch(() => null);

for (const [engine, type] of [['webkit', webkit], ['chromium', chromium]]) {
  const browser = await type.launch();

  if (engine === 'webkit' && want('marshmallow')) {
    // ---------- Marshmallow: three taps on a flare stack ----------
    const flareLevel = REGIONS[region('montney')].levels.findIndex((l) => l.obstacles?.some((o) => o.kind === 'flare'));
    console.log(`\n${engine}: marshmallow, three taps on a flare stack (Montney ${flareLevel + 1})`);
    const { context, page } = await open(browser, { level: [region('montney'), flareLevel] });
    const flare = await page.evaluate(() => { const r = document.querySelector('.obstacle.flare svg').getBoundingClientRect(); const f = document.querySelector('.obstacle.flare .fl-flame').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.7, fx: f.left + f.width / 2, fy: f.top + f.height / 2 }; });
    const watching = watch(page, 'marshmallow', { parts: { man: '.marshmallow-layer svg.pup .head', mm: '.marshmallow-layer .mm' } });
    await tapAt(page, flare.x, flare.y);
    await tapAt(page, flare.x, flare.y);
    await wait(900);
    check(!(await page.$('.strip-layer')), 'two taps are not enough');
    await tapAt(page, flare.x, flare.y);
    const bubble = bubbleOf(page, 'marshmallow');
    const touch = page.waitForFunction(() => [...document.querySelectorAll('.strip-layer[data-gag="marshmallow"]')].at(-1)?.dataset.beat === 'roast', null, { timeout: 12000 }).then(() =>
      page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return { layer: !!el.closest('.puppet-layer'), pe: getComputedStyle(document.querySelector('.marshmallow-layer .pup-overlay')).pointerEvents }; }, [flare.fx, flare.fy + 60]),
    );
    const log = await watching;
    check(sameBeats(log, 'marshmallow'), `the reference beats, in order (${beatsOf(log).length} of ${GAGS.marshmallow.beats.length})`);
    const first = log.find((f) => f.man), walkOut = log.filter((f) => f.beat === 'ear-smoke' && f.man).at(-1);
    check(first.man.r <= 0 && walkOut.man.l >= W - 4, `he walks in from fully off screen and strolls off until fully off screen (${Math.round(first.man.r)} to ${Math.round(walkOut.man.l)})`);
    const roast = log.filter((f) => f.beat === 'roast' && f.mm).at(-1);
    const mx = (roast.mm.l + roast.mm.r) / 2, my = (roast.mm.t + roast.mm.b) / 2;
    check(Math.hypot(mx - flare.fx, my - flare.fy) < 9, `the stick is aimed at the real flare: the marshmallow sits in its pilot flame (${Math.round(Math.hypot(mx - flare.fx, my - flare.fy))}px off)`);
    const steps = log.filter((f) => f.beat === 'telescope' && f.mm).map((f) => f.mm.t);
    const holds = steps.filter((y, i) => i > 0 && Math.abs(y - steps[i - 1]) < 0.05).length;
    check(holds > steps.length * 0.4 && steps.at(-1) < steps[0] - 60, `it telescopes in clicks, with holds between them (${holds} still frames of ${steps.length})`);
    const t = await touch;
    check(!t.layer && t.pe === 'none', 'the stick never blocks a touch');
    const b = await bubble;
    check(b?.text === 'Mmm. Crispy.' && b.box.x >= 4 && b.box.x + b.box.width <= W - 4, `"${b?.text}", on screen`);
    check(log.every((f) => f.others === 0), 'nothing else was on stage');
    for (let i = 0; i < 3; i++) await tapAt(page, flare.x, flare.y);
    await wait(900);
    check(!(await page.$('.strip-layer')), 'once per level');
    await context.close();
    {
      const { context, page } = await open(browser, { level: [region('cardium'), 5] });
      await page.locator('[data-act="undo"]').waitFor();
      check((await page.$$('.obstacle.flare')).length === 0, 'levels with no flare stack have no marshmallow (nothing to tap)');
      await context.close();
    }
  }

  if (engine === 'webkit' && want('geese')) {
    // ---------- Geese: Undo three times in a row ----------
    console.log(`\n${engine}: geese, Undo three times in a row (Cardium 6)`);
    const level = REGIONS[region('cardium')].levels[5];
    const sol = solve(level).slice(0, 3);
    const { context, page } = await open(browser, { level: [region('cardium'), 5] });
    for (const m of sol) await drag(page, m.id, m.delta, 650);
    const undo = () => page.locator('[data-act="undo"]').click();
    const watching = watch(page, 'geese', { pups: '.geese-layer svg.pup', flip: '.geese-layer svg.pup .flip' });
    await undo();
    await undo();
    await wait(900);
    check(!(await page.$('.strip-layer')), 'two undos are not enough');
    await undo();
    const bubble = bubbleOf(page, 'geese');
    const log = await watching;
    check(sameBeats(log, 'geese'), `the reference beats, in order (${beatsOf(log).length} of ${GAGS.geese.beats.length})`);
    const v = (f) => f.pups.slice(0, 7), lost = (f) => f.pups[7];
    const last = log.at(-1);
    check(log[0].pups.length === 8 && v(log[0]).every((g) => g.r <= 0), 'a V of seven starts fully off screen on the left');
    check(v(last).every((g) => g.l >= W), 'and crosses until all seven are fully off screen on the right');
    check(lost(log[0]).l >= W, 'the lost goose starts fully off screen on the right, going the wrong way');
    const passed = log.find((f) => f.beat === 'pass'), stall = log.find((f) => f.beat === 'stall');
    check(lost(stall).l < Math.min(...v(passed).map((g) => g.l)) || lost(stall).l < W * 0.5, `he keeps going after passing them before he stalls (x ${Math.round(lost(stall).l)})`);
    check(log.every((f) => Math.abs(f.flip) >= 0.79), `he snaps around without ever going paper-thin (thinnest ${Math.min(...log.map((f) => Math.abs(f.flip))).toFixed(2)})`);
    const vGone = log.find((f) => v(f).every((g) => g.l >= W));
    check(lost(vGone).l < W + 40 && lost(last).l >= W && log.filter((f) => f.beat === 'straggler').every((f) => lost(f).l <= Math.min(...v(f).map((g) => g.l)) + 1), `he chases as the straggler and leaves last, fully off screen (x ${Math.round(lost(last).l)})`);
    const b = await bubble;
    check(b?.text === 'Honk?!' && b.box.x >= 4 && b.box.x + b.box.width <= W - 4, `"${b?.text}", on screen`);
    await context.close();
  }
  if (engine === 'webkit' && want('geese')) {
    const { context, page } = await open(browser, { query: '?gag=geese' });
    await page.waitForSelector('.geese-layer', { state: 'attached', timeout: 8000 });
    await page.waitForFunction(() => document.querySelector('.strip-layer[data-gag="geese"]')?.dataset.beat === 'chase', null, { timeout: 12000 });
    const s = await page.evaluate(() => {
      const layer = document.querySelector('.geese-layer');
      const hud = document.querySelector('.hud').getBoundingClientRect();
      const f = layer.querySelector('.pup-feather');
      const tops = [...layer.querySelectorAll('svg.pup')].slice(0, 7).map((g) => g.querySelector('.root').getBoundingClientRect().top);
      return { pe: getComputedStyle(layer).pointerEvents, z: getComputedStyle(layer).zIndex, feather: +getComputedStyle(f).opacity > 0.5, clear: Math.min(...tops) >= hud.bottom - 6, board: Math.max(...[...layer.querySelectorAll('svg.pup')].map((g) => g.getBoundingClientRect().bottom)) <= document.querySelector('.board').getBoundingClientRect().top + 4 };
    });
    check(s.pe === 'none' && s.z === '0' && s.clear && s.board, 'they fly in the sky band: under the HUD\'s row, above the lease, behind both, taking no touches');
    check(s.feather, 'a feather drifts down from the snap-turn');
    await context.close();
  }

  if (engine === 'webkit' && want('bear')) {
    // ---------- The bear's bush: permanent on every Duvernay level ----------
    const duv = region('duvernay');
    for (const [width, height] of [[390, 844], [375, 667]]) {
      console.log(`\n${engine} ${width}x${height}: the bear's bush`);
      for (const li of [0, 3, 7, 9]) {
        const { context, page } = await open(browser, { width, height, level: [duv, li] });
        await wait(300);
        const b = await page.evaluate(() => {
          const s = document.querySelector('.bush-layer svg.pup');
          if (!s) return null;
          const r = s.getBoundingClientRect(), R = (q) => document.querySelector(q).getBoundingClientRect();
          const biffy = R('.biffy-layer svg.pup .root');
          const trees = [...document.querySelectorAll('.scenery .sc')].filter((t) => { const q = t.getBoundingClientRect(); const m = q.width * 0.25; return q.left + m < r.right && q.right - m > r.left && q.top < r.bottom && q.bottom > r.bottom - 4; }).length;
          return { ok: r.top >= R('.board').bottom && r.bottom <= R('.note').top + 1 && r.right <= innerWidth && r.left > biffy.right, trees, old: document.querySelectorAll('.scenery [data-anchor="bush"]').length, touch: getComputedStyle(document.querySelector('.bush-layer')).pointerEvents };
        });
        check(b?.ok && b.old === 0 && b.touch === 'none' && b.trees === 0, `Duvernay ${li + 1}: his snowy bush stands in the strip, clear of the lease, the tip line, the biffy and the trees`);
        await context.close();
      }
    }

    // ---------- The bear: three taps on his bush (with ?bear=0 he never comes, with ?bear=1 always) ----------
    console.log(`\n${engine}: bear, three taps on his snowy bush`);
    {
      const { context, page } = await open(browser, { query: QUIET + '&bear=0', level: [duv, 2] });
      const at = await page.evaluate(() => { const r = document.querySelector('.bush-layer svg.pup').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 }; });
      await tapAt(page, at.x, at.y);
      await tapAt(page, at.x, at.y);
      const before = await page.evaluate(() => ({ shake: document.querySelector('.bush-layer svg.pup').classList.contains('shake'), puffs: document.querySelectorAll('.bush-puff').length }));
      await tapAt(page, at.x, at.y);
      const miss = await page.evaluate(() => ({ shake: document.querySelector('.bush-layer svg.pup').classList.contains('shake'), anim: getComputedStyle(document.querySelector('.bush-layer svg.pup')).animationName, puffs: document.querySelectorAll('.bush-puff').length }));
      await wait(1200);
      check(!before.shake && before.puffs === 0, 'two taps do nothing');
      check(miss.shake && miss.anim === 'bush-shake' && miss.puffs >= 3 && !(await page.$('.strip-layer')), `when he does not come (2 times in 3) the bush shakes and drops a small puff of snow (${miss.puffs} puffs)`);
      check((await page.$$('.bush-puff')).length === 0, 'the puff is gone again');
      await context.close();
    }
    const { context, page } = await open(browser, { query: QUIET + '&bear=1', level: [duv, 2] });
    const bushAt = await page.evaluate(() => { const r = document.querySelector('.bush-layer svg.pup').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 }; });
    const watching = watch(page, 'bear', { parts: { foot: '.bear-layer svg.pup:nth-of-type(1) .root > ellipse:nth-of-type(1)', hare: '.bear-layer svg.pup:nth-of-type(1) .root', bush: '.bear-layer svg.pup:nth-of-type(2)', bear: '.bear-layer svg.pup:nth-of-type(3) .root', scribble: '.bear-layer .pup-overlay g[opacity] path[fill="none"]' } }, 40000);
    for (let i = 0; i < 3; i++) await tapAt(page, bushAt.x, bushAt.y);
    const came = await page.waitForSelector('.strip-layer[data-gag="bear"]', { state: 'attached', timeout: 3000 }).then(() => true).catch(() => false);
    check(came, 'three taps on the bush, on a Duvernay level that is not 8 to 10, and (1 time in 3) he comes at once');
    const log = await watching;
    check(sameBeats(log, 'bear'), `the reference beats, in order (${beatsOf(log).length} of ${GAGS.bear.beats.length})`);
    const leave = log.filter((f) => f.beat === 'bear-leaves' || f.beat === 'trudge').map((f) => f.bear).filter((b) => b.l < 5000).at(-1);
    check(log[0].bear.r <= 0 && leave.l >= W - 2, `the bear comes in on all fours from fully off screen and strolls off until fully off screen (${Math.round(log[0].bear.r)} to ${Math.round(leave.l)})`);
    const start = log[0];
    const leafTop = start.bush.t + ((start.bush.b - start.bush.t) * 9) / 56; // the leaves start 9 units down the bush's 56-unit box
    const peek = log.find((f) => f.t - start.t > 900);
    check(start.hare.z === 2 && start.hare.t >= leafTop - 0.5, 'on the first frame the hare is down out of sight behind the bush (nobody appears by magic)');
    check(peek.hare.z === 2 && peek.hare.vis && peek.hare.t < leafTop && peek.hare.b > leafTop + 6, 'then its ears pop up over the bush and twitch there');
    const down = log.filter((f) => f.beat === 'violated')[3];
    check(down.hare.z === 5 && down.foot.r <= down.bush.l + 1, `he sets it down clear of the bush, not in it (its foot ${(down.bush.l - down.foot.r).toFixed(1)}px from the bush)`);
    const trudge = log.filter((f) => f.beat === 'trudge' && f.hare);
    const behind = trudge.filter((f) => f.hare.z === 2), front = trudge.filter((f) => f.hare.z === 5);
    check(front.length > 3 && behind.length > 5 && front.every((f) => f.foot.r <= f.bush.l + 1.5) && behind[0].foot.r >= behind[0].bush.l - 1.5, `it goes behind the bush only when its front edge reaches the bush (${front.length} frames in front, then ${behind.length} behind)`);
    const end = trudge.at(-1), gone = log.filter((f) => f.beat === 'gone' && f.hare);
    check(end.hare.z === 2 && end.hare.l >= end.bush.l && end.hare.r <= end.bush.r && behind.every((f) => f.hare.vis) && gone.every((f) => f.hare.z === 2), 'it walks in behind the bush and stays hidden there: it never vanishes part way');
    const scribble = log.filter((f) => f.beat === 'violated' && f.scribble).length;
    check(scribble > 3, 'an "ugh" scribble jitters over its head');
    check(log.every((f) => f.others === 0), 'nothing else was on stage');
    await wait(400);
    const after = await page.evaluate(() => ({ bush: getComputedStyle(document.querySelector('.bush-layer')).visibility, log: JSON.parse(localStorage.getItem('rush-hour-rigs:log') ?? '{}').found ?? [], card: !document.querySelector('.overlay').hidden }));
    check(after.bush === 'visible' && after.log.includes('bear') && !after.card, 'afterwards the bush is back and the Bear is in the Wildlife Log; no win card is involved any more');
    for (let i = 0; i < 3; i++) await tapAt(page, bushAt.x, bushAt.y);
    await wait(900);
    check(!(await page.$('.strip-layer')), 'once per level: after that the bush only shakes');
    await context.close();
  }

  if (engine === 'webkit' && want('bull')) {
    // ---------- The cow: permanent scenery in Montney ----------
    const mon = region('montney');
    for (const [width, height] of [[390, 844], [375, 667]]) {
      console.log(`\n${engine} ${width}x${height}: the cow grazes in the Montney strip`);
      for (const li of [0, 5, 9]) {
        const { context, page } = await open(browser, { width, height, level: [mon, li] });
        await wait(300);
        const look = () => page.evaluate(() => {
          const s = document.querySelector('.cow-layer svg.pup .root');
          const r = s.getBoundingClientRect(), R = (q) => document.querySelector(q).getBoundingClientRect();
          const biffy = R('.biffy-layer svg.pup .root');
          const trees = [...document.querySelectorAll('.scenery .sc')].filter((t) => { const q = t.getBoundingClientRect(); const m = q.width * 0.25; return q.left + m < r.right && q.right - m > r.left && q.top < r.bottom && q.bottom > r.bottom - 4; }).length;
          return { ok: r.top >= R('.board').bottom && r.bottom <= R('.note').top + 1 && r.bottom <= R('.controls').top && r.right <= innerWidth && r.left > biffy.right, trees, touch: getComputedStyle(document.querySelector('.cow-layer')).pointerEvents, html: document.querySelector('.cow-layer').innerHTML, w: r.width };
        });
        const a = await look();
        await wait(700);
        const b = await look();
        check(a.ok && a.touch === 'none' && a.trees === 0, `Montney ${li + 1}: clear of the lease, the tip line, the buttons, the biffy and the trees (${Math.round(a.w)}px long)`);
        if (li === 0) check(a.html === b.html, 'she stands quite still until the gag');
        await context.close();
      }
    }
    {
      const { context, page } = await open(browser, { level: [region('cardium'), 5] });
      check(!(await page.$('.cow-layer')), 'no cow outside Montney');
      await context.close();
    }

    // ---------- The bull: tap the cow ----------
    console.log(`\n${engine}: bull and cow, tap the cow (Montney 6)`);
    const { context, page } = await open(browser, { level: [mon, 5] });
    const cow = await page.evaluate(() => { const r = document.querySelector('.cow-layer svg.pup .root').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const watching = watch(page, 'bull', { parts: { bull: '.bull-layer svg.pup .root', cow: '.cow-layer svg.pup .root', breath: '.bull-layer .pup-overlay .breath' } }, 36000);
    const extras = page.evaluate(
      () =>
        new Promise((res) => {
          const out = { bubbles: 0, hearts: 0, trail: 0, eye: 0, curly: false, slick: true, lick: false, leg: 0, sparkle: false, pop: false };
          const tick = () => {
            const l = document.querySelector('.strip-layer[data-gag="bull"]');
            if (!l && out.curly) return res(out);
            const shown = (q) => !!l && l.querySelector(q).style.display !== 'none';
            if (l) {
              const beat = l.dataset.beat, hearts = l.querySelectorAll('.pup-overlay path[fill="#e3364b"]').length;
              out.bubbles = Math.max(out.bubbles, document.querySelectorAll('.bubble').length);
              if (beat === 'hearts') out.hearts = Math.max(out.hearts, hearts);
              if (beat === 'charge') out.trail = Math.max(out.trail, hearts);
              if (beat === 'last-heart') out.pop ||= l.querySelectorAll('.pup-overlay path[stroke="#e3364b"]').length === 6;
              out.eye = Math.max(out.eye, +document.querySelector('.cow-layer .eye').getAttribute('r'));
              // His forelock: curly until he slicks it back, slicked from then on.
              if (beat === 'bull-in' || beat === 'freeze') out.curly ||= shown('.lockCurl') && !shown('.lockSlick');
              if (['hearts', 'cow-looks', 'bolts', 'paws', 'charge'].includes(beat)) out.slick &&= shown('.lockSlick') && !shown('.lockCurl');
              if (beat === 'lick-hoof') out.lick ||= shown('.tongue');
              if (beat === 'slick') out.leg = Math.max(out.leg, +(/scale\(1 ([\d.]+)\)/.exec(l.querySelector('.lFN').getAttribute('transform') ?? '')?.[1] ?? 0));
              if (beat === 'chest-puff') out.sparkle ||= shown('.shine');
            }
            requestAnimationFrame(tick);
          };
          tick();
        }),
    );
    await tapAt(page, cow.x, cow.y);
    const log = await watching;
    const x = await extras;
    check(sameBeats(log, 'bull'), `the beats, in order (${beatsOf(log).length} of ${GAGS.bull.beats.length})`);
    check(log[0].bull.r <= 0, `the bull enters from fully off screen (${Math.round(log[0].bull.r)})`);
    check(x.curly && x.slick && x.lick && x.leg > 1.5 && x.sparkle, `he primps as in the reference: licks a hoof, a stretched leg (${x.leg.toFixed(2)}x) slicks his curly forelock back and it stays slicked, a sparkle on the chest puff`);
    check(x.hearts >= 4 && x.bubbles === 0, `dreamy: ${x.hearts} red hearts float up, and no speech bubble at any point`);
    check(x.eye > 7, `her eyes go huge (${x.eye})`);
    const cowOut = log.filter((f) => f.cow.vis && ['bolts', 'paws', 'charge'].includes(f.beat)).at(-1), bullOut = log.filter((f) => f.beat === 'charge' && f.bull.vis).at(-1);
    check(cowOut.cow.l >= W - 2, `she bolts until she is fully off screen (x ${Math.round(cowOut.cow.l)})`);
    check(bullOut.bull.l >= W - 10 && x.trail >= 2, `he charges after her, hearts trailing, until fully off screen (x ${Math.round(bullOut.bull.l)})`);
    check(x.pop, 'a last heart floats up and pops');
    check(log.every((f) => f.others === 0), 'nothing else was on stage');
    // SAME START, SAME END: she wanders back in from the edge she left by and grazes again in her spot.
    const back = log.filter((f) => f.beat === 'cow-back' && f.cow.vis);
    check(back[0].cow.l >= W - 2 && back.every((f, i) => i === 0 || f.cow.l <= back[i - 1].cow.l + 0.6), `the cow wanders back in from the right edge, the one she left by (from x ${Math.round(back[0].cow.l)})`);
    check(log.some((f) => (f.beat === 'cow-back' || f.beat === 'catches-breath') && f.breath), 'a little out of breath: puffs at her muzzle');
    check(log.filter((f) => ['last-heart', 'cow-back', 'catches-breath', 'grazes-again'].includes(f.beat)).every((f) => !f.bull.vis || f.bull.l >= W - 10), 'the bull stays gone');
    await wait(300);
    const home = await page.evaluate(() => { const r = document.querySelector('.cow-layer svg.pup .root').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: getComputedStyle(document.querySelector('.cow-layer svg.pup')).visibility }; });
    check(home.vis === 'visible' && Math.abs(home.x - cow.x) < 1 && Math.abs(home.y - cow.y) < 1, 'afterwards she is back grazing in her spot, exactly where she began');
    await tapAt(page, cow.x, cow.y);
    await wait(900);
    check(!(await page.$('.strip-layer')), 'once per level: another tap brings nobody');
    await context.close();
  }

  if (engine === 'webkit' && want('porcupine')) {
    // ---------- Every gag bush is the board's bush ----------
    console.log(`\n${engine}: the gag bush is the board's bush`);
    for (const [r, li, snow] of [['cardium', 5, false], ['duvernay', 7, true]]) {
      const { context, page } = await open(browser, { level: [region(r), li] });
      const b = await page.evaluate(() => {
        const fills = (root) => new Set([...root.querySelectorAll('ellipse, circle, path')].map((e) => e.getAttribute('fill')).filter((f) => f && f !== 'none' && !f.startsWith('rgba')));
        const gag = fills(document.querySelector('.bush-layer svg.pup'));
        // The board's own bush: the willow symbol the scenery draws from (summer leaves).
        const defs = document.querySelector('.tree-defs');
        const board = fills(defs.querySelector('symbol[id^="t-willow-summer-2"]') ?? document.createElement('i'));
        return { gag: [...gag], board: [...board], stems: !!document.querySelector('.bush-layer svg.pup path[stroke="#5a3d22"]'), old: document.querySelectorAll('.scenery [data-anchor="bush"]').length };
      });
      const leaves = ['#6f9638', '#95bf4a', '#4f7426'];
      check(leaves.every((c) => b.gag.includes(c)) && b.stems && b.old === 0, `${r} ${li + 1}: olive green, light blobs, darker underside, brown stems (the board willow's own colours); it stands in for the scenery's bush`);
      check(b.gag.includes('#ffffff') === snow, snow ? 'the winter bush has a light snow dusting' : 'no snow on the summer bush');
      await context.close();
    }

    // ---------- Porcupine: three taps on the Cardium bush ----------
    console.log(`\n${engine}: porcupine, three taps on the bush (Cardium 6)`);
    const { context, page } = await open(browser, { level: [region('cardium'), 5] });
    const at = await page.evaluate(() => { const r = document.querySelector('.bush-layer svg.pup').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await tapAt(page, at.x, at.y);
    await tapAt(page, at.x, at.y);
    await wait(900);
    check(!(await page.$('.strip-layer')), 'two taps are not enough');
    const watching = watch(page, 'porcupine', { parts: { porc: '.porcupine-layer svg.pup:nth-of-type(1) .root', worker: '.porcupine-layer svg.pup:nth-of-type(2) .head', bush: '.porcupine-layer svg.pup:nth-of-type(3)', shuf: '.porcupine-layer svg.pup:nth-of-type(4) .root', roll: '.porcupine-layer .pup-roll' } });
    const clipped = page.waitForSelector('.porcupine-layer', { state: 'attached', timeout: 8000 }).then(() => page.evaluate(() => { const l = document.querySelector('.porcupine-layer'); return { clip: l.querySelector('svg.pup').style.clipPath.startsWith('polygon'), pe: getComputedStyle(l).pointerEvents, z: l.querySelector('svg.pup').style.zIndex, bushZ: l.querySelectorAll('svg.pup')[2].style.zIndex }; }));
    await tapAt(page, at.x, at.y);
    const c = await clipped;
    const log = await watching;
    check(sameBeats(log, 'porcupine'), `the third tap, in the game itself (not only demo mode): the reference beats, in order (${beatsOf(log).length} of ${GAGS.porcupine.beats.length})`);
    const quiet = log.filter((f) => f.beat === 'quiet-bush' || f.beat === 'stroll-in' || f.beat === 'look-around');
    check(c.clip && +c.z < +c.bushZ && quiet.every((f) => f.porc.l >= f.bush.l && f.porc.r <= f.bush.r && f.porc.t >= f.bush.t), 'the porcupine is hidden behind the bush from the start: inside its outline, behind it, cut off under the leaves');
    const walkIn = log.find((f) => f.worker?.vis), run = log.filter((f) => f.shuf?.vis && f.shuf.l < 5000);
    check(walkIn.worker.r <= 0 && run.at(-1).shuf.r <= 2, `the worker strolls in from fully off screen and scurries off until fully off screen (${Math.round(walkIn.worker.r)} to ${Math.round(run.at(-1).shuf.r)})`);
    const bolt = log.filter((f) => f.porc.vis && f.porc.l < 5000).at(-1);
    check(bolt.porc.l >= W - 2, `the porcupine bolts out the other way until fully off screen (x ${Math.round(bolt.porc.l)})`);
    const pop = log.filter((f) => f.roll && (f.beat === 'roll-pops' || f.beat === 'springs-out' || f.beat === 'porcupine-bolts'));
    check(Math.min(...pop.map((f) => f.roll.t)) < pop[0].bush.t && pop.length > 4, 'the roll pops straight up over the bush');
    check(c.pe === 'none' && log.every((f) => f.others === 0), 'the layer takes no touches; nothing else was on stage');
    await context.close();
  }

  if (engine === 'webkit' && want('gopherLunch')) {
    // ---------- Gopher lunch: a press of Hint in Cardium, one time in two ----------
    console.log(`\n${engine}: gopher lunch, a press of Hint in Cardium (one time in two; ?lunch=0 and ?lunch=1 fix the roll here)`);
    {
      // The roll that fails: Hint works as ever and nobody comes. Idle no longer brings him either.
      const { context, page } = await open(browser, { query: QUIET.replace('&off=lunch,sam,tongue', '&off=sam,tongue') + '&idle=0.1&lunch=0', level: [region('cardium'), 5] });
      await wait(4500);
      check(!(await page.$('.strip-layer')), 'sitting idle no longer brings him (30 s, 3 s here, and more)');
      await page.locator('[data-act="hint"]').click();
      await wait(900);
      check(!(await page.$('.strip-layer')) && (await page.locator('.truck.hinted').count()) === 1, 'a press of Hint that loses the roll: the hint shows, nobody comes');
      await context.close();
    }
    {
      // Montney has no mound: Hint never brings him there.
      const { context, page } = await open(browser, { query: QUIET.replace('&off=lunch,sam,tongue', '&off=sam,tongue') + '&lunch=1', level: [region('montney'), 5] });
      await page.locator('[data-act="hint"]').click();
      await wait(900);
      check(!(await page.$('.strip-layer')), 'not in Montney');
      await context.close();
    }
    const { context, page } = await open(browser, { query: QUIET.replace('&off=lunch,sam,tongue', '&off=sam,tongue') + '&lunch=1', level: [region('cardium'), 5] });
    const geo = await page.evaluate(() => {
      const m = document.querySelector('.scenery [data-anchor="mound"]').getBoundingClientRect(), note = document.querySelector('.note').getBoundingClientRect(), board = document.querySelector('.board').getBoundingClientRect();
      return { base: m.top + (29.5 / 34) * m.height, heap: (m.width * 59) / 64, ground: note.top - 4, holeY: m.top + (17 / 34) * m.height, left: m.left, right: m.right, top: m.top, clear: m.top > board.bottom };
    });
    check(Math.abs(geo.base - geo.ground) < 1.5 && Math.abs(geo.heap - 0.13 * W * 0.92) < 2.5 && geo.clear, `the board's mound stands on the strip's ground line at the reference's size (heap ${geo.heap.toFixed(1)}px)`);
    await wait(600);
    check(!(await page.$('.strip-layer')), 'not before Hint is pressed');
    const watching = watch(page, 'gopherLunch', { parts: { worker: '.lunch-layer > svg.pup:not(:first-of-type) .torso', head: '.lunch-layer svg.pup .hat', crust: '.lunch-layer .pup-food:last-of-type', steam: '.lunch-layer .pup-overlay .steam', gopher: '.lunch-layer .pup-clip svg.pup .head', clip: '.lunch-layer .pup-clip', lip: '.lunch-layer > svg.pup', sand: '.lunch-layer .pup-food', paw: '.lunch-layer .pup-overlay .paw' } }, 32000);
    await page.locator('[data-act="hint"]').click();
    const log = await watching;
    check(log.length > 100 && (await page.locator('.truck.hinted').count()) === 1, 'a press of Hint that wins the roll brings him, and the hint still shows');
    check(sameBeats(log, 'gopherLunch'), `the reference beats, in order, to the quiet mound again (${beatsOf(log).length} of ${GAGS.gopherLunch.beats.length})`);
    const first = log.find((f) => f.worker?.vis), last = log.filter((f) => f.worker?.vis).at(-1);
    check(first.worker.l >= W && last.worker.l >= W - 2, `the worker strolls in from fully off the NEAR edge (the right) and leaves the same way until fully off screen (${Math.round(first.worker.l)} to ${Math.round(last.worker.l)})`);
    const walkIn = log.filter((f) => f.beat === 'stroll-in' && f.worker?.vis);
    check(walkIn.every((f, i) => i === 0 || f.worker.l <= walkIn[i - 1].worker.l + 0.5) && walkIn.some((f) => f.worker.l > geo.right) , 'he walks in past the mound to his spot');
    const f0 = log[5];
    check(Math.abs(f0.clip.b - geo.holeY) < 1.5 && Math.abs(f0.lip.l - geo.left) < 1.5 && Math.abs(f0.lip.t - geo.top) < 1.5 && Math.abs(f0.lip.r - geo.right) < 1.5, 'it plays at the board\'s own mound: the gopher is cut off at its hole line and the near lip lies exactly over its hole');
    const sits = log.filter((f) => f.beat === 'phone');
    check(sits.every((f) => f.worker.r < geo.left + 6 && f.worker.b <= geo.ground + 12), 'he sits just left of the mound, his back to it');
    const paws = log.filter((f) => f.paw && (f.beat === 'paw-peeks' || f.beat === 'feels-around'));
    check(paws.length > 20 && Math.min(...paws.map((f) => f.paw.l)) < geo.left, `the paw comes out of the hole and reaches past the mound for the sandwich (${paws.length} frames)`);
    const chomp = log.filter((f) => f.beat === 'chomp');
    check(chomp.every((f) => !f.sand.vis), 'the sandwich is gone down the hole');
    check(log.some((f) => f.beat === 'boils-over' && f.steam), 'he boils over: steam off his hard hat');
    const thrown = log.filter((f) => f.beat === 'hurls-crust' && f.crust?.vis);
    check(thrown.length > 3 && thrown.at(-1).crust.l > thrown[0].crust.l && log.filter((f) => f.beat === 'burp' || f.beat === 'quiet-again').every((f) => !f.crust.vis), 'he hurls the crust at the hole, and it is gone');
    const endFrame = log.at(-1);
    check(!endFrame.worker?.vis && endFrame.gopher.t >= geo.holeY - 1 && !endFrame.paw && !endFrame.sand.vis && !endFrame.crust.vis, 'SAME START, SAME END: it ends on the quiet mound, nobody and nothing left behind');
    const up = log.filter((f) => f.beat === 'cheeks' && f.gopher.t < geo.holeY - 6);
    check(up.length > 5, 'the gopher pops up behind him, cut off at the hole');
    check(log.every((f) => f.others === 0), 'nothing else was on stage');
    await context.close();
  }

  if (engine === 'webkit' && want('sam')) {
    // ---------- Safety Sam: three blocked moves in a row, or a push at a wrong-colour gate ----------
    const levels = REGIONS[region('cardium')].levels;
    const SIDE = (t, dir) => (t.orient === 'h' ? (dir === 1 ? 'right' : 'left') : dir === 1 ? 'bottom' : 'top');
    // A truck that can bump (it has no room one way) without pushing at any gate, and one that can push straight at a wrong-colour gate.
    const find = (wantGate) => {
      for (const [li, level] of levels.entries()) {
        const st = newGame(level);
        for (const t of st.trucks) {
          const r = getMoveRange(st, t.id);
          for (const dir of [1, -1]) {
            const limit = dir === 1 ? r.max : r.min;
            const atWall = (t.orient === 'h' ? t.col : t.row) + limit + (dir === 1 ? t.length : 0) === (dir === 1 ? 6 : 0);
            const gate = level.gates.find((g) => g.side === SIDE(t, dir) && g.index === (t.orient === 'h' ? t.row : t.col));
            if (r.exitDelta === limit + dir || r.exitDelta === limit) continue;
            if (wantGate ? atWall && gate && gate.color !== t.color : atWall && !gate && !(t.orient === 'v' && dir === 1)) return { li, id: t.id, cells: limit + dir * 1.2 };
          }
        }
      }
      return null;
    };
    const plain = find(false), wrong = find(true);
    console.log(`\n${engine}: Safety Sam, three blocked moves in a row (Cardium ${plain.li + 1})`);
    {
      const { context, page } = await open(browser, { query: QUIET.replace(',sam', ''), level: [region('cardium'), plain.li] });
      const watching = watch(page, 'sam', { parts: { sam: '.sam-layer svg.pup .torso', see: '.sam-layer .see', vee: '.sam-layer .vee', tsk: '.sam-layer .pup-overlay text' } });
      await drag(page, plain.id, plain.cells, 300);
      const bumps1 = await page.evaluate(() => +document.querySelector('.misses b').textContent);
      await wait(900);
      check(bumps1 >= 1 && !(await page.$('.strip-layer')), 'one blocked move is not enough');
      // Blocked again and again without a move in between: push from where it now stands.
      await drag(page, plain.id, Math.sign(plain.cells) * 1.2, 300);
      await wait(600);
      check(!(await page.$('.strip-layer')), 'nor two');
      await drag(page, plain.id, Math.sign(plain.cells) * 1.2, 300);
      const log = await watching;
      check(sameBeats(log, 'sam'), `on the third he comes: the reference beats, in order (${beatsOf(log).length} of ${GAGS.sam.beats.length})`);
      const first = log.find((f) => f.sam?.vis), last = log.filter((f) => f.sam?.vis).at(-1);
      check(first.sam.r <= 0 && last.sam.r <= 2, `he marches in from fully off screen and backs off until fully off screen (${Math.round(first.sam.r)} to ${Math.round(last.sam.r)})`);
      const backing = log.filter((f) => f.beat === 'backs-off' && f.sam.vis);
      check(backing.every((f, i) => i === 0 || f.sam.l <= backing[i - 1].sam.l + 0.5) && backing.every((f) => f.vee?.vis), 'he backs away to the left, still pointing');
      check(log.filter((f) => f.beat === 'see-me').every((f) => f.see?.vis) && log.filter((f) => f.beat === 'scribble').every((f) => !f.see?.vis), 'SEE ME shows only when he turns the clipboard round');
      check(log.some((f) => f.beat === 'tsk' && f.tsk), '"tsk" over his head as he shakes it');
      check(log.every((f) => f.others === 0), 'nothing else was on stage');
      for (let i = 0; i < 3; i++) await drag(page, plain.id, Math.sign(plain.cells) * 1.2, 250);
      await wait(1000);
      check(!(await page.$('.strip-layer')), 'once per level');
      await context.close();
    }
    console.log(`\n${engine}: Safety Sam, a push at a wrong-colour gate (Cardium ${wrong.li + 1})`);
    {
      const { context, page } = await open(browser, { query: QUIET.replace(',sam', ''), level: [region('cardium'), wrong.li] });
      await drag(page, wrong.id, wrong.cells, 300);
      const came = await page.waitForSelector('.strip-layer[data-gag="sam"]', { state: 'attached', timeout: 4000 }).then(() => true).catch(() => false);
      check(came, 'one push at a wrong-colour gate brings him');
      await context.close();
    }
    {
      const { context, page } = await open(browser, { query: QUIET.replace(',sam', ''), level: [region('cardium'), plain.li] });
      // A move made between bumps starts the count again.
      const st = newGame(levels[plain.li]);
      const mover = st.trucks.map((t) => ({ t, r: getMoveRange(st, t.id) })).find(({ t, r }) => t.id !== plain.id && (r.max > 0 ? r.exitDelta !== 1 : r.min < 0 && r.exitDelta !== -1) && (r.max > 0 || r.min < 0));
      await drag(page, plain.id, plain.cells, 250);
      await drag(page, plain.id, Math.sign(plain.cells) * 1.2, 250);
      if (mover) await drag(page, mover.t.id, mover.r.max > 0 ? 1 : -1, 400);
      await drag(page, plain.id, Math.sign(plain.cells) * 1.2, 250);
      await wait(900);
      check(!mover || !(await page.$('.strip-layer')), 'a move made in between starts the count again');
      await context.close();
    }
  }

  if (engine === 'webkit' && want('tongue')) {
    // ---------- The frosty riser: permanent on winter levels, never on the berm ----------
    const duv = region('duvernay');
    for (const [width, height] of [[390, 844], [375, 667], [393, 852], [430, 932], [390, 744], [375, 567]]) {
      console.log(`\n${engine} ${width}x${height}: the frosty riser on every winter level`);
      let bad = [], seen = 0, hidden = 0, tall = 0;
      for (let li = 0; li < 10; li++) {
        const { context, page } = await open(browser, { width, height, level: [duv, li] });
        const b = await page.evaluate(() => {
          const layer = document.querySelector('.riser-layer');
          if (!layer) return null;
          const r = layer.querySelector('svg.pup').getBoundingClientRect(), R = (q) => document.querySelector(q).getBoundingClientRect();
          const board = R('.board'), berm = R('canvas.berm');
          const vis = getComputedStyle(layer).visibility !== 'hidden';
          const bush = document.querySelector('.bush-layer svg.pup')?.getBoundingClientRect();
          return { vis, h: r.height, ok: r.top >= Math.max(board.bottom, berm.bottom) - 0.5 && r.bottom <= R('.note').top + 1 && r.right <= innerWidth && r.left >= 0, bush: !bush || r.right <= bush.left + 2, pe: getComputedStyle(layer).pointerEvents };
        });
        if (!b) bad.push(`${li + 1}: none`);
        else if (!b.vis) hidden++;
        else { seen++; tall = b.h; if (!b.ok || !b.bush || b.pe !== 'none') bad.push(`${li + 1}: ${JSON.stringify(b)}`); }
        await context.close();
      }
      check(bad.length === 0, `Duvernay 1 to 10: ${seen} risers ${Math.round(tall)}px tall, each wholly below the berm and the lease, above the tip line, on screen, clear of the bear's bush${hidden ? `; left out on ${hidden} where the strip is too short for it` : ''}${bad.length ? ' ' + bad.join(' | ') : ''}`);
    }
    {
      const { context, page } = await open(browser, { level: [region('montney'), 2] });
      check(!(await page.$('.riser-layer')), 'no riser outside winter');
      await context.close();
    }

    // ---------- The frozen tongue: three taps on the frosty riser, on a winter level ----------
    console.log(`\n${engine}: frozen tongue, three taps on the riser on a winter level`);
    const { context, page } = await open(browser, { query: QUIET.replace(',tongue', '') + '&idle=0.1', level: [duv, 1] });
    const riser = await page.evaluate(() => { const r = document.querySelector('.riser-layer svg.pup').getBoundingClientRect(); return { l: r.left, r: r.right, x: r.left + r.width / 2 }; });
    // No gag comes from waiting: long past its old 30 s (3 s here), nobody.
    await wait(4000);
    check(!(await page.$('.strip-layer')), 'it does not come from waiting');
    // The riser's tap target is at least 44 px each way: a tap 20 px to the side of the thin pipe still counts.
    const tapRiser = (dx = 0, dy = 0) => page.evaluate(([ox, oy]) => { const r = (document.querySelector('.riser-layer svg.pup g') ?? document.querySelector('.riser-layer svg.pup')).getBoundingClientRect(); const x = r.left + r.width / 2 + ox, y = r.top + r.height / 2 + oy; const el = document.querySelector('.screen.game'); for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(type, { pointerId: 61, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true })); return { w: r.width, h: r.height }; }, [dx, dy]);
    await tapRiser(0, 0);
    await tapRiser(20, 0);
    await wait(500);
    check(!(await page.$('.strip-layer')), 'two taps are not enough');
    await tapRiser(-60, 0);
    await wait(400);
    check(!(await page.$('.strip-layer')), 'a tap 60 px off the riser does not count');
    const watching = watch(page, 'tongue', { parts: { worker: '.tongue-layer svg.pup:nth-of-type(1) .torso', buddy: '.tongue-layer svg.pup:nth-of-type(2) .torso', tongue: '.tongue-layer .pup-overlay .tongue', flake: '.tongue-layer .pup-overlay .flake', flash: '.tongue-layer .pup-flash', coffee: '.tongue-layer .pup-overlay .coffee', thwip: '.tongue-layer .pup-overlay .thwip', thermos: '.tongue-layer svg.pup:nth-of-type(2) .thermos' } }, 36000);
    const bubble = bubbleOf(page, 'tongue', 20000);
    const size = await tapRiser(-20, 18);
    const log = await watching;
    check(log.length > 100, `the third tap (20 px off the pipe, inside its 44 px tap target; the pipe itself is ${Math.round(size.w)}x${Math.round(size.h)} px) brings the gag`);
    check(sameBeats(log, 'tongue'), `the reference beats, in order, to the empty riser again (${beatsOf(log).length} of ${GAGS.tongue.beats.length})`);
    const vis = (k) => log.filter((f) => f[k]?.vis);
    check(vis('worker')[0].worker.r <= 0 && vis('worker').at(-1).worker.r <= 2, `the worker strolls in from fully off screen and trudges off until fully off screen (${Math.round(vis('worker')[0].worker.r)} to ${Math.round(vis('worker').at(-1).worker.r)})`);
    const firstVisit = log.filter((f) => f.buddy?.vis && ['buddy-in', 'buddy-looks', 'phone-out', 'flash', 'deadpan', 'cracks-up', 'buddy-leaves'].includes(f.beat));
    const secondVisit = log.filter((f) => f.buddy?.vis && ['buddy-back', 'sigh', 'pours', 'thwip', 'rubs-tongue', 'walk-off'].includes(f.beat));
    check(firstVisit[0].buddy.r <= 0 && firstVisit.at(-1).buddy.r <= 2, 'his buddy wanders in from fully off screen on the left and leaves that way');
    check(secondVisit[0].buddy.l >= W - 2 && secondVisit.at(-1).buddy.l >= W - 2 && Math.min(...secondVisit.map((f) => f.buddy.l)) > riser.r - 4, `and comes back from fully off screen on the RIGHT, to the far side of the riser, and leaves that way (${Math.round(secondVisit[0].buddy.l)}, ${Math.round(secondVisit.at(-1).buddy.l)})`);
    check(log.some((f) => f.beat === 'pours' && f.coffee) && log.some((f) => f.beat === 'pours' && f.thermos?.vis) && log.some((f) => f.thwip), 'he pours hot coffee on the pipe from a thermos, and THWIP');
    const stuck = log.filter((f) => f.beat === 'pulls' && f.tongue);
    check(stuck.length > 20 && stuck.every((f) => Math.abs(f.tongue.r - (riser.x - 4)) < 6) && Math.max(...stuck.map((f) => f.tongue.r - f.tongue.l)) > Math.min(...stuck.map((f) => f.tongue.r - f.tongue.l)) + 3, 'his tongue is stuck to the real riser and stretches as he pulls');
    const b = await bubble;
    check(b?.text === 'HEWP!' && b.box.x >= 4 && b.box.x + b.box.width <= W - 4, `"${b?.text}", on screen`);
    const flashes = log.filter((f) => +f.flash?.vis && f.beat === 'flash');
    const strip = await page.evaluate(() => ({ top: document.querySelector('.board').getBoundingClientRect().bottom, bottom: document.querySelector('.note').getBoundingClientRect().top }));
    check(flashes.length > 2 && flashes.every((f) => f.flash.t >= strip.top - 1 && f.flash.b <= strip.bottom + 1), 'the camera flash lights the bottom strip only, never the lease');
    check(log.some((f) => f.beat === 'snowflake' && f.flake), 'a snowflake drifts down onto his nose');
    check(log.filter((f) => f.beat === 'walk-off' || f.beat === 'riser-again').every((f) => !f.tongue), 'the tongue comes free');
    const fin = log.at(-1);
    check(!fin.worker?.vis && !fin.buddy?.vis && !fin.tongue, 'SAME START, SAME END: it ends on the empty riser');
    check(log.every((f) => f.others === 0), 'nothing else was on stage');
    await context.close();
  }

  if (engine === 'webkit' && !ONLY) {
    // ---------- Gags play at the same time; only gags that share a character or prop wait ----------
    console.log(`\n${engine}: two gags at once`);
    const levels = REGIONS[region('cardium')].levels;
    const bumper = (l) => newGame(l).trucks.find((t) => t.orient === 'v' && t.row + t.length === 6 && getMoveRange(newGame(l), t.id)?.exitDelta !== 1);
    const li = levels.findIndex((l) => bumper(l));
    const id = bumper(levels[li]).id;
    const on = (page) => page.evaluate(() => [...new Set([...document.querySelectorAll('.strip-layer')].map((l) => l.dataset.gag))]);
    {
      // The default rules (no test flags for the cooldown): a bump brings Biffy A; three more blocked moves bring Sam while A is still on.
      const { context, page } = await open(browser, { query: '?cover=0&magpie=0&worker=0&moose=0&off=lunch,tongue', level: [region('cardium'), li] });
      await drag(page, id, 2);
      await page.waitForSelector('.strip-layer[data-gag="biffyA"]', { state: 'attached', timeout: 5000 });
      const t0 = Date.now();
      await drag(page, id, 2, 150);
      await drag(page, id, 2, 150);
      const sam = await page.waitForSelector('.strip-layer[data-gag="sam"]', { state: 'attached', timeout: 2500 }).then(() => Date.now() - t0).catch(() => null);
      const both = await on(page);
      check(sam !== null && both.includes('biffyA') && both.includes('sam'), `Safety Sam comes right away while Biffy A is still playing (${sam} ms after the bumps began; on stage: ${both.join(' + ')})`);
      // Biffy B shares the biffy with A, so it waits for A to finish and then follows it on.
      const queued = !both.includes('biffyB');
      await page.waitForSelector('.strip-layer[data-gag="biffyA"]', { state: 'detached', timeout: 9000 });
      const b = await page.waitForSelector('.strip-layer[data-gag="biffyB"]', { state: 'attached', timeout: 3000 }).then(() => true).catch(() => false);
      const then = await on(page);
      check(queued && b && then.includes('sam'), `Biffy B shares the biffy, so it waited for A and then came on, with Sam still there (${then.join(' + ')})`);
      await context.close();
    }

    // ---------- The landowner's fast wiggle: four reversals in one drag ----------
    console.log(`\n${engine}: the landowner's fast wiggle`);
    {
      const st = newGame(levels[li]);
      const any = st.trucks[0];
      const wiggle = (page, truckId, turns, stepMs) =>
        page.evaluate(async ([tid, n, ms]) => {
          const el = document.querySelector(`.truck[data-id="${tid}"]`);
          const r = el.getBoundingClientRect(), h = el.classList.contains('horiz');
          const cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
          let x = r.x + r.width / 2, y = r.y + r.height / 2;
          const ev = (type) => el.dispatchEvent(new PointerEvent(type, { pointerId: 41, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
          ev('pointerdown');
          for (let k = 0; k <= n; k++) {
            const d = (k % 2 ? -1 : 1) * cell * 0.5;
            for (let i = 0; i < 4; i++) { if (h) x += d / 4; else y += d / 4; ev('pointermove'); await new Promise((q) => setTimeout(q, ms / 4)); }
          }
          ev('pointerup');
        }, [truckId, turns, stepMs]);
      const { context, page } = await open(browser, { query: QUIET, level: [region('cardium'), li] });
      await wiggle(page, any.id, 3, 120);
      await wait(700);
      check(!(await page.$('.strip-layer[data-gag="landowner"]')), 'three reversals are not enough');
      await wiggle(page, any.id, 4, 700);
      await wait(700);
      check(!(await page.$('.strip-layer[data-gag="landowner"]')), 'nor four slow ones (more than 2 s)');
      const t0 = Date.now();
      await wiggle(page, any.id, 4, 120);
      const came = await page.waitForSelector('.strip-layer[data-gag="landowner"]', { state: 'attached', timeout: 2500 }).then(() => Date.now() - t0).catch(() => null);
      check(came !== null, `four quick reversals in one drag, finger never lifted, bring him (${came} ms)`);
      await context.close();
    }
  }

  // ---------- Reduced motion: simple fades ----------
  if (engine === 'webkit') {
    console.log(`\n${engine}: reduced motion`);
    for (const name of Object.keys(GAGS).filter(want)) {
      const { context, page } = await open(browser, { query: `?gag=${GAGS[name].preview}`, reducedMotion: 'reduce' });
      await page.waitForSelector('.strip-layer', { state: 'attached', timeout: 8000 });
      await wait(800);
      const snap = () => page.evaluate(() => { const l = [...document.querySelectorAll('.strip-layer')].at(-1); return l ? { beat: l.dataset.beat, o: getComputedStyle(l).opacity, at: [...l.querySelectorAll('svg.pup')].map((s) => s.style.left + s.innerHTML.length).join() } : null; });
      const a = await snap();
      await wait(500);
      const b = await snap();
      check(a?.beat === 'still' && a.o === '1' && a.at === b?.at, `${name}: fades in as a still and holds`);
      await context.close();
    }

    // ---------- Wildlife Log ----------
    console.log(`\n${engine}: Wildlife Log`);
    for (const [mode, progress] of [['game', UNLOCKED], ['demo', DEMO]]) {
      const { context, page } = await open(browser, { query: '?cover=0', progress, enter: false });
      await page.locator('.binoculars').click();
      await page.waitForSelector('.log-card');
      const cards = await page.$$eval('.log-card', (cs) => cs.map((c) => ({ id: c.dataset.id, text: c.querySelector('p').textContent, art: !!c.querySelector('.art svg.egg-still'), legendary: c.classList.contains('legendary') })));
      const by = Object.fromEntries(cards.map((c) => [c.id, c]));
      if (mode === 'game') check(by.bear?.art && by.bear.legendary && !!(await page.$('.log-card[data-id="bear"] .legend-tag')), 'the Bear has a LEGENDARY card with a gold frame and puppet art');
      if (mode === 'game') check(by.bull?.art && by.bull.text === 'Not seen yet.', 'Bull and Cow has a card with puppet art');
      if (mode === 'game') check(by.porcupine?.art && by.lunch?.art && by.porcupine.text === 'Not seen yet.', 'Porcupine and Gopher Lunch have cards with puppet art');
      else check(by.porcupine.text === 'In Cardium, tap the bush three times.' && by.lunch.text === 'In Cardium, press Hint. He may show up for lunch.', 'demo mode shows the porcupine\'s and the lunch\'s hints');
      if (mode === 'game') check(by.sam?.art && by.tongue?.art && by.sam.text === 'Not seen yet.', 'Safety Sam and Frozen Tongue have cards with puppet art');
      else check(by.sam.text === 'Bump three times in a row, or push a truck at a wrong-colour gate.' && by.tongue.text === 'On a winter level, tap the frosty pipe stand three times.', 'demo mode shows Sam\'s and the tongue\'s hints');
      if (mode === 'game') check(by.marshmallow?.art && by.geese?.art && by.marshmallow.text === 'Not seen yet.' && by.geese.text === 'Not seen yet.', `Marshmallow and Lost Goose have cards with puppet art; the game hides the hints (${cards.length} cards)`);
      else check(by.marshmallow.text === 'Tap a flare stack three times.' && by.geese.text === 'Press Undo three times in a row.' && by.bear.text === 'In Duvernay, tap the snowy bush three times. He comes one time in three.' && by.bull.text === 'In Montney, tap the cow.', 'demo mode shows each gag\'s hint');
      await context.close();
    }
  }

  // ---------- 60 fps with the CPU slowed 4x (Chromium) ----------
  if (engine === 'chromium') {
    for (const name of Object.keys(GAGS).filter(want)) {
      console.log(`\n${engine}: ${name} frame rate with a 4x slower CPU (?gag=${GAGS[name].preview})`);
      const { context, page } = await open(browser, { query: `?gag=${GAGS[name].preview}` });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const log = await watch(page, name, {}, 20000);
      const gaps = log.slice(1).map((f, i) => f.t - log[i].t).slice(5).sort((x, y) => x - y);
      const p95 = gaps[Math.floor(gaps.length * 0.95)];
      check(log.length > 100 && p95 < 20, `p95 frame ${p95?.toFixed(1)} ms, median ${gaps[gaps.length >> 1]?.toFixed(1)} ms over the whole gag`);
      await context.close();
    }
  }

  // ---------- Clips (WebKit, 390x844, full screen) ----------
  if (engine === 'webkit' && !process.env.NO_CLIPS) {
    const dir = join(OUT, 'eggs2_clip_tmp');
    for (const name of Object.keys(GAGS).filter(want)) {
      const { context, page } = await open(browser, { query: `?gag=${GAGS[name].preview}`, video: dir });
      await page.waitForSelector('.strip-layer', { state: 'attached', timeout: 8000 });
      await page.waitForSelector('.strip-layer', { state: 'detached', timeout: 26000 });
      await wait(600);
      const video = page.video();
      await context.close();
      renameSync(await video.path(), join(OUT, `${GAGS[name].clip}.webm`));
      console.log(`   saved ${GAGS[name].clip}.webm`);
    }
    rmSync(dir, { recursive: true, force: true });
  }
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
