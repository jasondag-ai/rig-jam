// Gags test (Playwright, iPhone 13, Chromium with real touch events). Uses ?idle=0.1 so the magpie
// comes after 1s and the spotter after 2s. Checks each gag fires at the right moment, stays off
// the 6x6 grid (or on a truck roof), never blocks a touch, and shows still under reduced motion.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:gags
import { chromium, devices } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { getMoveRange, newGame, solve } from '../src/engine/index.ts';
import { COMPANY_LINES } from '../src/ui/lines.ts';
import { biffySpot, reverseDirection } from '../src/ui/gags.ts';

const BASE = (process.env.URL ?? 'http://localhost:5173/') + '?idle=0.1';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

async function open(reducedMotion) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('rush-hour-rigs:v2', JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], demo: true, announced: [] }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  const cdp = await context.newCDPSession(page);
  const tp = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  const touch = {
    async drag(id, cellsPath) {
      const el = await page.$(`.truck[data-id="${id}"]:not(.exiting)`);
      const b = await el.boundingBox();
      const h = b.width > b.height;
      const cell = await page.$eval('.board', (e) => parseFloat(e.style.getPropertyValue('--cell')));
      let x = b.x + b.width / 2;
      let y = b.y + b.height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(x, y) });
      for (const cells of cellsPath) {
        for (let k = 0; k < 8; k++) {
          if (h) x += (cells * cell) / 8;
          else y += (cells * cell) / 8;
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(x, y) });
          await wait(16);
        }
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await wait(450);
    },
    async tapAt(x, y) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(x, y) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    },
  };
  return { browser, page, touch };
}

const enter = async (page, tab, index) => {
  // Back to the list from wherever we are (the win card's button sits on top of the HUD's).
  await page.evaluate(() => (document.querySelector('.win:not([hidden]) [data-act="levels"]') ?? document.querySelector('.hud [data-act="levels"]'))?.click());
  await wait(200);
  await page.$eval(`.region-tab:nth-child(${tab})`, (t) => t.click());
  await wait(150);
  await page.$eval(`.level-btn[data-index="${index}"]`, (b) => b.click());
  await wait(500);
};
const rect = (page, sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
const overlaps = (a, b) => a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
const play = async (page, touch, level) => {
  for (const m of solve(level)) await touch.drag(m.id, [m.delta]);
  await wait(1200);
};

// ---------------- Normal motion ----------------
{
  const { browser, page, touch } = await open('no-preference');
  console.log('\nchromium iPhone 13 (real touch events), idle x0.1');

  // 1. Magpie after 10s (1s here): lands on a roof, poops, "Seriously?", flies off.
  await enter(page, 1, 0);
  await wait(1350);
  const birdMid = await rect(page, '.magpie').catch(() => null);
  check(!!birdMid, 'magpie arrives after the idle time');
  await page.waitForSelector('.dropping', { timeout: 4000 }).catch(() => {});
  const drops = await page.$$eval('.dropping', (d) => ({ n: d.length, trucks: [...new Set(d.map((x) => x.closest('.truck')?.dataset.id))] }));
  const bubble = await page.$eval('.bubble', (b) => b.textContent).catch(() => null);
  const splatTruck = drops.trucks[0];
  check(drops.n >= 2 && drops.n <= 3 && drops.trucks.length === 1 && !!splatTruck, `${drops.n} droppings land on one truck roof (truck ${splatTruck})`);
  check(bubble === 'Seriously?', `that driver yells "${bubble}"`);
  const onRoof = await page.evaluate(() => {
    const bird = document.querySelector('.magpie');
    if (!bird) return 'gone';
    const r = bird.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.8);
    return hit?.closest('.truck') ? 'truck under it gets the touch' : hit?.className;
  });
  check(onRoof === 'truck under it gets the touch' || onRoof === 'gone', `the magpie never blocks a touch (${onRoof})`);
  await wait(2500);
  check(!(await page.$('.magpie')), 'magpie flies off');
  check((await page.$$eval('.dropping', (d) => d.length)) === drops.n, 'the droppings stay on the roof');
  const allOn = await page.$$eval('.dropping', (ds) => ds.every((d) => {
    const r = d.getBoundingClientRect();
    const t = d.closest('.truck').getBoundingClientRect();
    return r.left >= t.left && r.right <= t.right && r.top >= t.top && r.bottom <= t.bottom;
  }));
  check(allOn, 'every dropping sits fully on the truck');
  // Splat stays until that truck exits: solve the level and watch it go with the truck.
  // 2. Spotter after 20s (2s here): walks on below the fence, sits on his pail, dozes off.
  await page.waitForSelector('.spotter', { timeout: 3000 }).catch(() => {});
  const pad = await rect(page, '.pad');
  const walking = await page.$eval('.spotter', (s) => s.classList.contains('walking')).catch(() => false);
  check(walking, 'spotter walks on after the longer idle time');
  await page.waitForSelector('.spotter.asleep', { timeout: 3000 }).catch(() => {});
  const spotter = await rect(page, '.spotter').catch(() => null);
  const zzz = await page.$eval('.spotter.asleep .zzz', (z) => getComputedStyle(z).display !== 'none' && z.textContent).catch(() => null);
  check(!!spotter && spotter.t >= pad.b, 'he sits on his pail below the fence, under the board');
  check(zzz === 'Zzz', `and falls asleep: "${zzz}"`);
  // 3. A touch wakes him: he jolts, falls off the pail and scrambles off.
  await touch.tapAt(20, 400);
  await wait(120);
  const startled = await page.$eval('.spotter', (s) => s.className).catch(() => 'gone');
  check(/startled|fallen/.test(startled), `a touch jolts him awake (${startled})`);
  await wait(500);
  check(await page.$eval('.spotter', (s) => s.classList.contains('fallen')).catch(() => false), 'he falls off the pail');
  const touchedAt = Date.now() - 620;
  await page.waitForSelector('.spotter', { state: 'detached', timeout: 3000 }).catch(() => {});
  check(!(await page.$('.spotter')), `and scrambles off (gone ${((Date.now() - touchedAt) / 1000).toFixed(1)}s after the touch)`);
  // The touch restarted the idle clock: the next spotter takes the full idle time again.
  await page.waitForSelector('.spotter.walking', { timeout: 4000 }).catch(() => {});
  const gap = Date.now() - touchedAt;
  check(gap >= 1900, `idle clock restarted: the next spotter came ${(gap / 1000).toFixed(1)}s after the touch`);
  check(!(await page.$('.magpie')), 'magpie only comes once per level');
  // A touch while he is still walking on cancels him outright.
  const wasWalking = !!(await page.$('.spotter.walking'));
  await touch.tapAt(20, 400);
  await wait(60);
  check(wasWalking && !(await page.$('.spotter')), 'a touch before he sits cancels him instantly');

  // Cancel the magpie mid-flight on a fresh level.
  await enter(page, 1, 1);
  await wait(1250);
  const flying = !!(await page.$('.magpie'));
  await touch.tapAt(20, 400);
  await wait(60);
  check(flying && !(await page.$('.magpie')) && !(await page.$('.roof-splat')), 'a touch cancels the magpie before it lands');

  // 4. Company Man by result, no repeats in a row.
  const level1 = REGIONS[0].levels[0];
  const says = async () => page.$eval('.company-says', (e) => e.textContent);
  await enter(page, 1, 0);
  await play(page, touch, level1);
  const parLine = await says();
  check(COMPANY_LINES.par.includes(parLine), `at par: "${parLine}"`);
  await page.$eval('.win [data-act="restart"]', (b) => b.click());
  await wait(300);
  await play(page, touch, level1);
  const parLine2 = await says();
  check(COMPANY_LINES.par.includes(parLine2) && parLine2 !== parLine, `at par again, a different line: "${parLine2}"`);
  await page.$eval('.win [data-act="restart"]', (b) => b.click());
  await wait(300);
  // Two extra moves (a truck there and back), then the real solution: 2 over par.
  const sol = solve(level1);
  const g = newGame(level1);
  const spare = level1.trucks
    .map((t) => ({ t, r: getMoveRange(g, t.id) }))
    .map(({ t, r }) => ({ id: t.id, d: r.max > 0 && r.max !== r.exitDelta ? 1 : r.min < 0 && r.min !== r.exitDelta ? -1 : 0 }))
    .find((x) => x.d !== 0);
  await touch.drag(spare.id, [spare.d]);
  await touch.drag(spare.id, [-spare.d]);
  for (const m of sol) await touch.drag(m.id, [m.delta]);
  await wait(1300);
  const moves = await page.$eval('.moves', (e) => parseInt(e.textContent)).catch(() => 0);
  const closeLine = await says().catch(() => null);
  const tier = moves <= level1.par ? 'par' : moves <= level1.par + 3 ? 'close' : 'over';
  check(!!closeLine && COMPANY_LINES[tier].includes(closeLine), `${moves} moves (par ${level1.par}, ${tier} tier): "${closeLine}"`);
  const cm = await rect(page, '.company-man').catch(() => null);
  check(!!cm && !(await page.evaluate(() => { const o = document.querySelector('.win'); return o.scrollHeight > o.clientHeight + 1; })), 'Company Man fits on the win card without scrolling');

  // 5. Biffy: just outside the fence behind one truck's tailgate; reversing that truck sets it off.
  let biffyDone = false;
  for (const [ri, region] of REGIONS.entries()) {
    for (const [li, level] of region.levels.entries()) {
      const spot = biffySpot(level);
      if (!spot) continue;
      const t = level.trucks.find((x) => x.id === spot.truckId);
      const back = reverseDirection(level, t);
      const r = getMoveRange(newGame(level), t.id);
      const reach = back < 0 ? r.min : r.max;
      if (reach === 0) continue; // needs room to back up
      await enter(page, ri + 1, li);
      const geo = await page.evaluate((id) => {
        const b = document.querySelector('.biffy').getBoundingClientRect();
        const tr = document.querySelector(`.truck[data-id="${id}"]`).getBoundingClientRect();
        const pad = document.querySelector('.pad').getBoundingClientRect();
        return { vw: document.documentElement.clientWidth, b: { l: b.left, t: b.top, r: b.right, bt: b.bottom, cx: b.left + b.width / 2, cy: b.top + b.height / 2 }, tr: { cx: tr.left + tr.width / 2, cy: tr.top + tr.height / 2 }, pad: { l: pad.left, t: pad.top, r: pad.right, b: pad.bottom } };
      }, t.id);
      const behind =
        spot.side === 'bottom' ? geo.b.t >= geo.pad.b - 12 && Math.abs(geo.b.cx - geo.tr.cx) < 8 :
        spot.side === 'top' ? geo.b.bt <= geo.pad.t + 12 && Math.abs(geo.b.cx - geo.tr.cx) < 8 :
        spot.side === 'left' ? geo.b.r <= geo.pad.l + 12 && Math.abs(geo.b.cy - geo.tr.cy) < 8 :
        geo.b.l >= geo.pad.r - 12 && Math.abs(geo.b.cy - geo.tr.cy) < 8;
      check(behind, `${region.name} ${li + 1}: biffy stands outside the ${spot.side} fence, right behind truck ${t.id}'s tailgate`);
      check(geo.b.l >= 0 && geo.b.r <= geo.vw, 'the whole biffy is on screen');
      const gateThere = level.gates.some((g) => g.side === spot.side && g.index === spot.index);
      check(!gateThere, 'that stretch of fence has no gate');
      await touch.drag(t.id, [back * Math.abs(reach)]);
      const worker = await page.$('.worker-bent');
      check(!!worker && (await page.$eval('.biffy', (e) => e.classList.contains('open'))), 'backing that truck up bangs the door open and a worker comes out');
      await wait(1200);
      const w = await rect(page, '.worker-bent').catch(() => null);
      check(!!w && !overlaps(w, await rect(page, '.pad')), 'bent over, hauling his coveralls up, he shuffles off outside the fence');
      await wait(2600);
      check(!(await page.$('.worker-bent')), 'off screen, and he does not go back in');
      await touch.drag(t.id, [-back * Math.abs(reach)]);
      await touch.drag(t.id, [back * Math.abs(reach)]);
      check(!(await page.$('.worker-bent')), 'once per level');
      biffyDone = true;
      break;
    }
    if (biffyDone) break;
  }
  check(biffyDone, 'found a level to test the biffy on');

  // 6. Block heater cords, Duvernay only: plugged in, rip out on the first move.
  await enter(page, 3, 0);
  const duv = REGIONS[2].levels[0];
  const posts = await page.$$eval('.plug-post', (e) => e.length);
  check(posts === duv.trucks.length, `Duvernay 1: every truck plugged in (${posts} posts for ${duv.trucks.length} trucks)`);
  const postsOff = await page.$$eval('.plug-post', (ps) => {
    const pad = document.querySelector('.pad').getBoundingClientRect();
    return ps.every((p) => { const r = p.getBoundingClientRect(); return r.right <= pad.left + 1 || r.left >= pad.right - 1 || r.bottom <= pad.top + 1 || r.top >= pad.bottom - 1; });
  });
  check(postsOff, 'posts stand in the fence, off the grid');
  const first = solve(duv)[0];
  const cordsBefore = await page.$$eval('.cord', (e) => e.length);
  await touch.drag(first.id, [first.delta]);
  const sparks = await page.$$eval('.spark', (e) => e.length);
  await wait(300);
  const ripped = await page.$$eval('.plug-post.ripped', (e) => e.length);
  check(ripped === 1, `first move rips that truck's cord out (${ripped} ripped)`);
  check(sparks > 0 || (await page.$$eval('.cord', (e) => e.length)) < cordsBefore, 'it whips and sparks');
  await enter(page, 1, 0);
  check((await page.$$eval('.plug-post', (e) => e.length)) === 0, 'no cords outside Duvernay');

  // 7. Landowner, Montney only: wear a lane to the deepest rut.
  for (const [tab, name, expect] of [[2, 'Montney', true], [1, 'Cardium', false]]) {
    await enter(page, tab, 2);
    const lv = REGIONS[tab - 1].levels[2];
    const truck = await page.evaluate(() => {
      for (const el of document.querySelectorAll('.truck')) return el.dataset.id;
    });
    // Record every speech bubble (the magpie may chime in too, with idle times this short).
    await page.evaluate(() => {
      window.__said = [];
      new MutationObserver(() => document.querySelectorAll('.bubble').forEach((b) => window.__said.includes(b.textContent) || window.__said.push(b.textContent))).observe(document.querySelector('.board'), { childList: true });
    });
    // Back and forth in one drag: every pass wears the lane.
    await touch.drag(truck, [0.9, -0.9, 0.9, -0.9, 0.9, -0.9, 0.9, -0.9]);
    await wait(700);
    const quad = await page.$('.landowner');
    const saidAll = await page.evaluate(() => window.__said);
    const said = saidAll.find((t) => t.includes('ruts')) ?? saidAll.join(' / ');
    if (expect) {
      check(!!quad && said === "Who's paying for these ruts?", `${name}: deepest rut brings the landowner: "${said}"`);
      if (quad) check((await rect(page, '.landowner')).t >= (await rect(page, '.pad')).b, 'he rides along below the board');
    } else check(!quad, `${name}: no landowner (${lv.name})`);
  }
  await browser.close();
}

// ---------------- Reduced motion ----------------
{
  const { browser, page } = await open('reduce');
  console.log('\nchromium iPhone 13, reduced motion');
  await enter(page, 1, 0);
  await wait(1500);
  const still = await page.evaluate(() => ({
    bird: !!document.querySelector('.magpie'),
    flapping: document.querySelector('.magpie')?.classList.contains('flying') ?? false,
    anims: document.getAnimations().filter((a) => a.effect?.target?.closest?.('.gag')).length,
  }));
  check(still.bird && !still.flapping && still.anims === 0, `magpie shows without animation (${JSON.stringify(still)})`);
  await page.waitForSelector('.dropping', { timeout: 3000 }).catch(() => {});
  check((await page.$$eval('.dropping', (d) => d.length)) >= 2, 'droppings still land');
  await page.waitForSelector('.spotter.asleep', { timeout: 5000 }).catch(() => {});
  check(!!(await page.$('.spotter.asleep')) && (await page.evaluate(() => document.getAnimations().length)) === 0, 'spotter shows asleep on his pail, standing still');
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
