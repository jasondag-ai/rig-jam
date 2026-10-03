// Truck sprites test (Playwright, iPhone 13 Chromium, plus WebKit). Every truck shows its illustrated
// sprite, turned to face its gate, with the gate symbol badge on top and a ground shadow under it.
// If the sprites can't load, the old drawing stands in. Dragging stays at 60fps.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:sprites
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit, devices } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};

const open = async (type, block = false) => {
  const browser = await type.launch();
  // No service worker: on the live site it would answer from its cache and the block would never bite.
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 375, height: 667 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  if (block) await page.route('**/sprites/**', (r) => r.abort());
  await page.goto(ROOT + '?wild=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => localStorage.setItem('rush-hour-rigs:v2', p), UNLOCKED);
  return { browser, page };
};
const enter = async (page, tab, index) => {
  await page.goto(ROOT + '?wild=0', { waitUntil: 'networkidle' });
  await page.$eval(`.region-tab:nth-child(${tab})`, (t) => t.click());
  await page.$eval(`.level-btn[data-index="${index}"]`, (b) => b.click());
  await wait(900);
};
const trucks = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.truck')].map((t) => {
      const img = t.querySelector('img.sprite');
      const svg = t.querySelector('.art svg');
      return {
        kind: t.dataset.kind,
        cab: t.dataset.cab,
        on: t.classList.contains('sprite-on'),
        src: img?.currentSrc ?? null,
        imgShown: img ? getComputedStyle(img).display !== 'none' : false,
        svgShown: getComputedStyle(svg).display !== 'none',
        color: [...t.classList].find((c) => c.startsWith('c-'))?.slice(2),
        badge: !!t.querySelector('.sym'),
        shadow: !!t.querySelector('.ground-shadow'),
      };
    }),
  );

for (const [type, name] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
  console.log(`\n${name} 375x667`);
  const { browser, page } = await open(type);
  for (const [tab, index] of [[1, 5], [2, 5], [3, 5]]) {
    await enter(page, tab, index);
    const t = await trucks(page);
    const region = REGIONS[tab - 1].name;
    check(t.length > 0 && t.every((x) => x.on && x.imgShown && !x.svgShown), `${region} 6: every truck shows its sprite (${t.length})`);
    check(t.every((x) => x.src?.includes(`/sprites/trucks/${x.kind}-${x.color}`)), 'each in its own gate color');
    check(t.every((x) => /@2x\.webp$/.test(x.src)), 'the sharp 2x version on a phone screen');
    check(t.every((x) => x.badge && x.shadow), 'symbol badge on top, ground shadow under');
    const g = await page.evaluate(() => {
      const scr = document.querySelector('.screen.game');
      return { tex: scr.classList.contains('ground-tex'), theme: scr.dataset.theme, pad: getComputedStyle(document.querySelector('.pad')).backgroundImage, outside: getComputedStyle(scr).backgroundImage };
    });
    check(g.tex && g.pad.includes(`pad-${g.theme}.webp`) && g.outside.includes(`grass-${g.theme}.webp`), `${g.theme} ground: pad and grass textures`);
    const f = await page.evaluate(() => {
      const board = document.querySelector('.board');
      const R = (s) => board.querySelector(s).getBoundingClientRect();
      const mid = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      const [top, bottom, left, right] = ['.pf-rail.top', '.pf-rail.bottom', '.pf-rail.left', '.pf-rail.right'].map((s) => R(s));
      const c = Object.fromEntries(['tl', 'tr', 'br', 'bl'].map((k) => [k, mid(R(`.pf-corner.${k}`))]));
      // Each rail's pipe line passes through both corner posts it runs between, and starts/ends at them.
      const off = Math.max(
        Math.abs(mid(top).y - c.tl.y), Math.abs(mid(top).y - c.tr.y), Math.abs(mid(bottom).y - c.bl.y), Math.abs(mid(bottom).y - c.br.y),
        Math.abs(mid(left).x - c.tl.x), Math.abs(mid(left).x - c.bl.x), Math.abs(mid(right).x - c.tr.x), Math.abs(mid(right).x - c.br.x),
        Math.abs(top.left - c.tl.x), Math.abs(top.right - c.tr.x), Math.abs(left.top - c.tl.y), Math.abs(left.bottom - c.bl.y),
      );
      const gatesOnTop = [...board.querySelectorAll('.gate')].every((g) => {
        const r = g.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit?.closest('.gate');
      });
      return { on: board.classList.contains('pipe-on'), off, gatesOnTop };
    });
    check(f.on && f.off < 1.5, `pipe-rail fence; rails meet the corner posts (${f.off.toFixed(2)}px off)`);
    check(f.gatesOnTop, 'gates sit on top of the rail');
    const gates = await page.evaluate(() =>
      [...document.querySelectorAll('.gate')].map((g) => {
        const vis = (sel) => { const e = g.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; };
        const rail = document.querySelector(`.pf-rail.${g.dataset.side}`);
        return {
          parts: vis('.g-leaf') && vis('.g-hinge') && vis('.g-latch') && vis('.g-badge'),
          tab: getComputedStyle(g.querySelector('.sym')).display !== 'none',
          leafColor: g.querySelector('.g-leaf img').src.includes(`gate-leaf-${[...g.classList].find((c) => c.startsWith('c-')).slice(2)}`),
          railGap: /transparent|rgba\(0, 0, 0, 0\)/.test(getComputedStyle(rail).maskImage || getComputedStyle(rail).webkitMaskImage),
          wait: g.classList.contains('convoy-gate') ? vis('.wait') : true,
        };
      }),
    );
    check(gates.length > 0 && gates.every((x) => x.parts && !x.tab && x.leafColor), `pipe gates: hinge post, ${'leaf in its color'}, latch post and badge (${gates.length})`);
    check(gates.every((x) => x.railGap && x.wait), 'the rail stops at each gate; convoy chips showing');
    // Lighting pass: only the world behind is graded. Gates and trucks keep their exact colors.
    const light = await page.evaluate(() => {
      const colorFilter = (el) => /sepia|saturate|hue|brightness|contrast|grayscale|invert/.test(getComputedStyle(el).filter);
      const z = (sel) => Number(getComputedStyle(document.querySelector(sel)).zIndex) || 0;
      // Walk up from each gate and truck: nothing above them may change color.
      const clean = (el) => { for (let e = el; e; e = e.parentElement) if (colorFilter(e)) return false; return true; };
      return {
        vignetteUnder: z('.vignette') < z('.stage') && z('.vignette') < z('.controls') && z('.vignette') < z('.hud'),
        gates: [...document.querySelectorAll('.gate')].every(clean),
        trucks: [...document.querySelectorAll('.truck')].every(clean),
        warm: getComputedStyle(document.querySelector('.pad')).backgroundImage.includes('radial-gradient'),
      };
    });
    check(light.warm && light.vignetteUnder && light.gates && light.trucks, `lighting: warm grade and vignette behind; gates and trucks untinted (${JSON.stringify(light)})`);
  }
  await browser.close();
}

// Obstacles: illustrated, standing on their cells, lower rows in front, never over a truck or gate.
{
  console.log('\nobstacles (Montney)');
  const { browser, page } = await open(chromium);
  for (const index of [5, 8, 9]) {
    await enter(page, 2, index);
    const o = await page.evaluate(() => {
      const pad = document.querySelector('.pad').getBoundingClientRect();
      const cell = pad.width / 6;
      const trucks = [...document.querySelectorAll('.truck')].map((t) => t.getBoundingClientRect());
      return [...document.querySelectorAll('.obstacle')].map((ob) => {
        const row = Number(ob.dataset.row);
        const col = Number(ob.dataset.col);
        const base = ob.querySelector('.ob-base').getBoundingClientRect();
        const top = ob.querySelector('.ob-top');
        const cellTop = pad.top + row * cell;
        // Is a truck in the cell above, and is the part sticking up faded over it?
        const above = trucks.some((t) => t.left < pad.left + (col + 0.5) * cell && t.right > pad.left + (col + 0.5) * cell && t.top < cellTop - cell * 0.5 && t.bottom > cellTop - cell * 0.5);
        return {
          kind: ob.className.split(' ')[1],
          row,
          on: ob.classList.contains('sprite-on'),
          z: Number(getComputedStyle(ob).zIndex),
          footOk: base.bottom <= cellTop + cell + 1 && base.bottom >= cellTop + cell * 0.9,
          sticksUp: cellTop - base.top,
          topFade: Number(getComputedStyle(top).opacity),
          above,
          inPadTop: base.top >= pad.top - 1,
          shadow: getComputedStyle(ob.querySelector('.ground-shadow')).display !== 'none',
        };
      });
    });
    const truckZ = await page.$eval('.truck', (t) => Number(getComputedStyle(t).zIndex));
    check(o.length > 0 && o.every((x) => x.on && x.shadow), `Montney ${index + 1}: obstacles illustrated, with ground shadows (${o.map((x) => x.kind).join(', ')})`);
    check(o.every((x) => x.footOk), 'each stands on its own cell');
    check(o.every((x) => x.z === 1 + x.row) && truckZ < Math.min(...o.map((x) => x.z)), 'lower rows in front of rows above');
    check(o.every((x) => x.row !== 0 || (x.inPadTop && x.sticksUp <= 1)), 'top row: nothing over the fence or a gate');
    check(o.every((x) => !x.above || x.sticksUp <= 1 || x.topFade < 0.6), `the part sticking up fades over a truck (${o.filter((x) => x.above && x.sticksUp > 1).map((x) => `${x.kind} ${x.topFade}`).join(', ') || 'none above'})`);
  }
  await browser.close();
}

// Gates swing open on their hinge while their truck drives out, then shut (not with reduced motion).
for (const reducedMotion of ['no-preference', 'reduce']) {
  console.log(`\ngate swing (${reducedMotion})`);
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(ROOT + '?wild=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => localStorage.setItem('rush-hour-rigs:v2', p), UNLOCKED);
  await enter(page, 1, 0);
  const lv = REGIONS[0].levels[0];
  const moves = (await import('../src/engine/index.ts')).solve(lv);
  const m = moves[0];
  await page.evaluate(() => {
    window.__swing = [];
    const f = () => {
      for (const g of document.querySelectorAll('.gate.open')) window.__swing.push(new DOMMatrix(getComputedStyle(g.querySelector('.g-leaf')).transform).b);
      if (window.__swing.length < 600) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const el = await page.$(`.truck[data-id="${m.id}"]`);
  const bb = await el.boundingBox();
  const cell = await page.$eval('.board', (e) => parseFloat(e.style.getPropertyValue('--cell')));
  let x = bb.x + bb.width / 2;
  let y = bb.y + bb.height / 2;
  const h = bb.width > bb.height;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let k = 0; k < 8; k++) {
    if (h) x += (m.delta * cell) / 8;
    else y += (m.delta * cell) / 8;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
    await wait(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(1500);
  const swing = await page.evaluate(() => window.__swing);
  const opened = swing.some((b) => Math.abs(b) > 0.95);
  const shut = await page.$$eval('.gate', (gs) => gs.every((g) => !g.classList.contains('open') && new DOMMatrix(getComputedStyle(g.querySelector('.g-leaf')).transform).b === 0));
  if (reducedMotion === 'reduce') check(!opened && shut, 'reduced motion: no swing');
  else {
    check(opened, `the gate swings open about 90 degrees as the truck drives out (${swing.length} frames open)`);
    check(shut, 'and swings shut after');
  }
  await browser.close();
}

// Sprites blocked: the old drawings stand in.
{
  console.log('\nsprites fail to load');
  const { browser, page } = await open(chromium, true);
  await enter(page, 1, 5);
  const t = await trucks(page);
  check(t.length > 0 && t.every((x) => !x.on && x.svgShown && !x.imgShown), `every truck falls back to the drawing (${t.length})`);
  check(!(await page.$eval('.screen.game', (e) => e.classList.contains('ground-tex'))), 'the ground falls back to the flat colors and drawn detail');
  check(!(await page.$eval('.board', (e) => e.classList.contains('pipe-on'))), 'the fence falls back to the drawn boards');
  check(await page.$$eval('.gate', (gs) => gs.every((g) => getComputedStyle(g.querySelector('.sym')).display !== 'none' && getComputedStyle(g.querySelector('.gw')).display === 'none')), 'the gates fall back to the colored tabs');
  await enter(page, 2, 9);
  const obs = await page.$$eval('.obstacle', (os) => os.map((o) => !o.classList.contains('sprite-on') && getComputedStyle(o.querySelector('svg')).display !== 'none' && !o.querySelector('img')));
  check(obs.length > 0 && obs.every(Boolean), `every obstacle falls back to the drawing (${obs.length})`);
  await browser.close();
}

// Dragging a truck back and forth stays smooth with the CPU slowed 4x.
{
  console.log('\nframe rate while dragging (4x slower CPU)');
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  await page.goto(ROOT + '?wild=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => localStorage.setItem('rush-hour-rigs:v2', p), UNLOCKED);
  await enter(page, 2, 5);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const box = await (await page.$('.truck.horiz')).boundingBox();
  await page.evaluate(() => {
    window.__ft = [];
    let last = performance.now();
    const f = (t) => {
      window.__ft.push(t - last);
      last = t;
      if (window.__ft.length < 400) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  let x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let i = 0; i < 120; i++) {
    x += Math.sin(i / 10) * 4;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
    await wait(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const ft = (await page.evaluate(() => window.__ft)).slice(5).sort((a, b) => a - b);
  const p95 = ft[Math.floor(ft.length * 0.95)];
  check(p95 < 25, `p95 frame ${p95.toFixed(1)}ms, median ${ft[ft.length >> 1].toFixed(1)}ms`);
  await browser.close();
}

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
