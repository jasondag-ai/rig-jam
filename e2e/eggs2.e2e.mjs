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
const QUIET = '?cover=0&magpie=0&worker=0&moose=0';
const region = (id) => REGIONS.findIndex((r) => r.id === id);
const W = 390;

/** name: [preview, beats, clip name, selector of the gag's main layer] */
const GAGS = {
  marshmallow: { preview: 'marshmallow', clip: 'gag89_marshmallow', beats: ['walk-in', 'eyes-flare', 'telescope', 'roast', 'fwoomp', 'eyes-pop', 'yank', 'blow', 'sniff-shrug', 'crispy', 'ear-smoke', 'gone'] },
  bear: { preview: 'bear', clip: 'gag10_bear', beats: ['hare-nibbles', 'bear-in', 'sniff', 'sit', 'smug', 'strain', 'relief', 'spots-ears', 'snatch', 'long-look', 'swing', 'wipe', 'inspect', 'set-down', 'violated', 'bear-leaves', 'trudge', 'gone'] },
  bull: { preview: 'bull', clip: 'gag11_bull', beats: ['cow-grazes', 'bull-in', 'freeze', 'lick-hoof', 'slick', 'chest-puff', 'hearts', 'cow-looks', 'eyes-huge', 'hop-turn', 'bolts', 'paws', 'charge', 'last-heart'] },
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
    const touch = page.waitForFunction(() => document.querySelector('.strip-layer[data-gag="marshmallow"]')?.dataset.beat === 'roast', null, { timeout: 12000 }).then(() =>
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
    // ---------- The bear's bush: permanent on his levels ----------
    const duv = region('duvernay');
    for (const [width, height] of [[390, 844], [375, 667]]) {
      console.log(`\n${engine} ${width}x${height}: the bear's bush`);
      for (const li of [7, 8, 9, 6]) {
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
        if (li === 6) check(b === null, 'Duvernay 7: no bear bush');
        else check(b?.ok && b.old === 0 && b.touch === 'none' && b.trees === 0, `Duvernay ${li + 1}: his snowy bush stands in the strip, clear of the lease, the tip line, the biffy and the trees`);
        await context.close();
      }
    }

    // ---------- The bear: a perfect solve on Duvernay 8 (with ?bear=1 he comes every time) ----------
    console.log(`\n${engine}: bear, a perfect solve on Duvernay 8`);
    const level = REGIONS[duv].levels[7];
    const { context, page } = await open(browser, { query: QUIET + '&bear=1', level: [duv, 7] });
    let st = newGame(level);
    const watching = watch(page, 'bear', { parts: { foot: '.bear-layer svg.pup:nth-of-type(1) .root > ellipse:nth-of-type(1)', hare: '.bear-layer svg.pup:nth-of-type(1) .root', bush: '.bear-layer svg.pup:nth-of-type(2)', bear: '.bear-layer svg.pup:nth-of-type(3) .root', scribble: '.bear-layer .pup-overlay g[opacity] path[fill="none"]' } }, 40000);
    for (const m of solve(level)) {
      const exit = getMoveRange(st, m.id)?.exitDelta === m.delta;
      await drag(page, m.id, m.delta + (exit ? Math.sign(m.delta) * 0.4 : 0), 520);
      st = tryMove(st, m.id, m.delta).state;
    }
    await page.waitForSelector('.strip-layer[data-gag="bear"]', { state: 'attached', timeout: 6000 });
    await wait(1500);
    const during = await page.evaluate((id) => ({ card: !document.querySelector('.overlay').hidden, saved: !!JSON.parse(localStorage.getItem('rush-hour-rigs:v2')).best?.[id] || JSON.stringify(JSON.parse(localStorage.getItem('rush-hour-rigs:v2'))).includes(id) }), level.id);
    check(!during.card && during.saved, 'he comes before the win card; the win is already saved');
    const log = await watching;
    check(sameBeats(log, 'bear'), `the reference beats, in order (${beatsOf(log).length} of ${GAGS.bear.beats.length})`);
    const leave = log.filter((f) => f.beat === 'bear-leaves' || f.beat === 'trudge').map((f) => f.bear).filter((b) => b.l < 5000).at(-1);
    check(log[0].bear.r <= 0 && leave.l >= W - 2, `the bear comes in on all fours from fully off screen and strolls off until fully off screen (${Math.round(log[0].bear.r)} to ${Math.round(leave.l)})`);
    const start = log[0];
    const leafTop = start.bush.t + ((start.bush.b - start.bush.t) * 9) / 56; // the leaves start 9 units down the bush's 56-unit box
    check(start.hare.z === 2 && start.hare.vis && start.hare.t < leafTop && start.hare.b > leafTop + 6, 'the hare is behind the bush from the start, only its ears showing');
    const down = log.filter((f) => f.beat === 'violated')[3];
    check(down.hare.z === 5 && down.foot.r <= down.bush.l + 1, `he sets it down clear of the bush, not in it (its foot ${(down.bush.l - down.foot.r).toFixed(1)}px from the bush)`);
    const trudge = log.filter((f) => f.beat === 'trudge' && f.hare);
    const behind = trudge.filter((f) => f.hare.z === 2), front = trudge.filter((f) => f.hare.z === 5);
    check(front.length > 3 && behind.length > 10 && front.every((f) => f.foot.r <= f.bush.l + 1.5) && behind[0].foot.r >= behind[0].bush.l - 1.5, `it goes behind the bush only when its front edge reaches the bush (${front.length} frames in front, then ${behind.length} behind)`);
    const end = trudge.at(-1), gone = log.filter((f) => f.beat === 'gone' && f.hare);
    check(end.hare.z === 2 && end.hare.l >= end.bush.l && end.hare.r <= end.bush.r && behind.every((f) => f.hare.vis) && gone.every((f) => f.hare.z === 2), 'it walks in behind the bush and stays hidden there: it never vanishes part way');
    const scribble = log.filter((f) => f.beat === 'violated' && f.scribble).length;
    check(scribble > 10, 'an "ugh" scribble jitters over its head');
    check(log.every((f) => f.others === 0), 'nothing else was on stage');
    await page.waitForFunction(() => !document.querySelector('.overlay').hidden, null, { timeout: 4000 }).catch(() => {});
    const after = await page.evaluate(() => ({ card: !document.querySelector('.overlay').hidden, bush: getComputedStyle(document.querySelector('.bush-layer')).visibility, log: JSON.parse(localStorage.getItem('rush-hour-rigs:log') ?? '{}').found ?? [] }));
    check(after.card && after.bush === 'visible' && after.log.includes('bear'), 'then the win card comes, the bush is back, and the Bear is in the Wildlife Log');
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
    const watching = watch(page, 'bull', { parts: { bull: '.bull-layer svg.pup .root', cow: '.cow-layer svg.pup .root' } }, 30000);
    const extras = page.evaluate(
      () =>
        new Promise((res) => {
          const out = { bubbles: 0, hearts: 0, trail: 0, eye: 0, curly: '', slick: '', leg: 0, sparkle: false, pop: false };
          const tick = () => {
            const l = document.querySelector('.strip-layer[data-gag="bull"]');
            if (!l && out.curly) return res(out);
            if (l) {
              const beat = l.dataset.beat, hearts = l.querySelectorAll('.pup-overlay path[fill="#e3364b"]').length;
              out.bubbles = Math.max(out.bubbles, document.querySelectorAll('.bubble').length);
              if (beat === 'hearts') out.hearts = Math.max(out.hearts, hearts);
              if (beat === 'charge') out.trail = Math.max(out.trail, hearts);
              if (beat === 'last-heart') out.pop ||= l.querySelectorAll('.pup-overlay path[stroke="#e3364b"]').length === 6;
              out.eye = Math.max(out.eye, +document.querySelector('.cow-layer .eye').getAttribute('r'));
              const f = l.querySelector('.forelock').getAttribute('d');
              if (beat === 'bull-in') out.curly = f;
              if (beat === 'hearts' || beat === 'charge') out.slick = f;
              if (beat === 'slick') out.leg = Math.max(out.leg, +(/scale\(1 ([\d.]+)\)/.exec(l.querySelector('.primpLeg').getAttribute('transform') ?? '')?.[1] ?? 0));
              if (beat === 'chest-puff') out.sparkle ||= !!l.querySelector('.pup-overlay path[fill="#fff7c2"]');
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
    check(x.curly !== x.slick && x.leg > 2 && x.sparkle, `he primps: a stretched leg (${x.leg.toFixed(1)}x) slicks his curly forelock back, it stays slicked, and a sparkle on the chest puff`);
    check(x.hearts >= 4 && x.bubbles === 0, `dreamy: ${x.hearts} red hearts float up, and no speech bubble at any point`);
    check(x.eye > 7, `her eyes go huge (${x.eye})`);
    const cowOut = log.filter((f) => f.cow.vis).at(-1), bullOut = log.filter((f) => f.beat === 'charge' && f.bull.vis).at(-1);
    check(cowOut.cow.l >= W - 2, `she bolts until she is fully off screen (x ${Math.round(cowOut.cow.l)})`);
    check(bullOut.bull.l >= W - 2 && x.trail >= 2, `he charges after her, hearts trailing, until fully off screen (x ${Math.round(bullOut.bull.l)})`);
    check(x.pop, 'a last heart floats up and pops');
    check(log.every((f) => f.others === 0), 'nothing else was on stage');
    await wait(300);
    const gone = await page.evaluate(() => getComputedStyle(document.querySelector('.cow-layer svg.pup')).visibility);
    await tapAt(page, cow.x, cow.y);
    await wait(900);
    check(gone === 'hidden' && !(await page.$('.strip-layer')), 'she stays gone for the rest of the level');
    await page.locator('[data-act="levels"]').first().click();
    await page.locator('.level-btn').nth(5).click();
    await page.waitForSelector('.board .truck.sprite-on');
    check((await page.evaluate(() => getComputedStyle(document.querySelector('.cow-layer svg.pup')).visibility)) === 'visible', 'and is back grazing on the next level load');
    await context.close();
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
      if (mode === 'game') check(by.marshmallow?.art && by.geese?.art && by.marshmallow.text === 'Not seen yet.' && by.geese.text === 'Not seen yet.', `Marshmallow and Lost Goose have cards with puppet art; the game hides the hints (${cards.length} cards)`);
      else check(by.marshmallow.text === 'Tap a flare stack three times.' && by.geese.text === 'Undo three times in a row.' && by.bear.text === 'Solve Duvernay 8, 9 or 10 at par. One time in three.' && by.bull.text === 'Tap the cow in Montney.', 'demo mode shows each gag\'s hint');
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
