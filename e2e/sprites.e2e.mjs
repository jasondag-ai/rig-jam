// Truck sprites test (Playwright, iPhone 13 Chromium, plus WebKit). Every truck shows its illustrated
// sprite, turned to face its gate, with the gate symbol badge on top and a ground shadow under it.
// If the sprites can't load, the old drawing stands in. Dragging stays at 60fps.
// Run: npm run dev -- --host   (in one terminal), then:  npm run test:e2e:sprites
import { UNLOCKED } from './progress.mjs';
import { chromium, webkit, devices } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';

const ROOT = process.env.URL ?? 'http://localhost:5173/';
/** How many ground images the lease's background uses (one: a single surface, not tiles). */
const getPadTiles = (bg) => (bg.match(/url\(/g) ?? []).length;
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
        shadow: !!t.querySelector('.ground-shadow') && getComputedStyle(t).filter === 'none',
        badgeW: t.querySelector('.sym').getBoundingClientRect().width,
        inBody: (() => { const b = t.querySelector('.sym').getBoundingClientRect(); const r = t.getBoundingClientRect(); return b.left >= r.left + 2 && b.right <= r.right - 2 && b.top >= r.top + 2 && b.bottom <= r.bottom - 2; })(),
        coat: getComputedStyle(t.querySelector('.coat')).display === 'none' ? '' : getComputedStyle(t.querySelector('.coat')).backgroundImage,
        cssSeason: getComputedStyle(t.querySelector('.body'), '::after').content !== 'none' || getComputedStyle(t.querySelector('.cab'), '::before').content !== 'none',
        tag: t.querySelector('.convoy-no') ? !!t.querySelector('.cab .convoy-no') : true,
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
    check(t.every((x) => x.badge && x.shadow), 'symbol badge on top; one shadow (the ground shadow, no filter shadow)');
    check(t.every((x) => x.inBody && x.badgeW < 24 && x.badgeW > 16), `the badge is small and sits inside the truck body (${t[0].badgeW.toFixed(0)}px)`);
    const season = tab === 2 ? 'mud-' : tab === 3 ? 'snow-' : '';
    check(t.every((x) => (season ? x.coat.includes(`/sprites/trucks/${season}${x.kind}`) : x.coat === '') && !x.cssSeason), season ? `baked ${season.slice(0, -1)} coat on every truck; no CSS-drawn snow or grime` : 'no season coat in summer');
    check(t.every((x) => x.tag), 'convoy numbers are tags on the cab');
    const g = await page.evaluate(() => {
      const scr = document.querySelector('.screen.game');
      return { tex: scr.classList.contains('ground-tex'), theme: scr.dataset.theme, pad: getComputedStyle(document.querySelector('.lease-ground')).backgroundImage, size: getComputedStyle(document.querySelector('.lease-ground')).backgroundSize, repeat: getComputedStyle(document.querySelector('.lease-ground')).backgroundRepeat, outside: getComputedStyle(scr).backgroundImage };
    });
    check(g.tex && g.outside.includes(`grass-${g.theme}.webp`), `${g.theme} ground: the field outside the berm`);
    check(g.pad === 'none' && getPadTiles(g.pad) === 0, 'the pad has no photo and no gradient: a flat colour under the code-drawn fields and marks');
    const f = await page.evaluate(() => {
      const board = document.querySelector('.board');
      // The berm: painted all round the pad's band, with nothing in a gate's gap.
      const canvas = board.querySelector('canvas.berm');
      const ctx = canvas.getContext('2d');
      const cr = canvas.getBoundingClientRect();
      const pad = board.querySelector('.pad').getBoundingClientRect();
      const k = canvas.width / cr.width;
      const alpha = (x, y) => ctx.getImageData(Math.round((x - cr.left) * k), Math.round((y - cr.top) * k), 1, 1).data[3];
      const band = (pad.top - board.getBoundingClientRect().top) / 2;
      const cell = pad.width / 6;
      const at = (side, i) => {
        const along = (side === 'top' || side === 'bottom' ? pad.left : pad.top) + (i + 0.5) * cell;
        if (side === 'top') return [along, pad.top - band];
        if (side === 'bottom') return [along, pad.bottom + band];
        return side === 'left' ? [pad.left - band, along] : [pad.right + band, along];
      };
      const gated = new Set([...board.querySelectorAll('.gate')].map((g) => `${g.dataset.side}${g.dataset.index}`));
      let solid = 0, wall = 0, open = 0, gaps = 0;
      for (const side of ['top', 'bottom', 'left', 'right'])
        for (let i = 0; i < 6; i++) {
          const a = alpha(...at(side, i));
          if (gated.has(side + i)) { gaps++; if (a < 10) open++; }
          else { wall++; if (a > 245) solid++; }
        }
      const off = wall - solid + (gaps - open);
      const gatesOnTop = [...board.querySelectorAll('.gate')].every((g) => {
        const r = g.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit?.closest('.gate');
      });
      const detail = board.querySelector('canvas.lease-detail');
      const dpx = detail.getContext('2d').getImageData(0, 0, detail.width, detail.height).data;
      let painted = 0;
      for (let i = 3; i < dpx.length; i += 4 * 97) if (dpx[i] > 0) painted++;
      const leaf = board.querySelector('.g-leaf').getBoundingClientRect();
      const badge = board.querySelector('.g-badge').getBoundingClientRect();
      // The leaf art is 63px of rails inside a 73px box (its outline margin).
      const thin = ((Math.min(leaf.width, leaf.height) * 63) / 73) / (band * 2);
      const side = [...document.querySelectorAll('.scenery .sc, .depth-strip > .sc')].filter((t) => { const r = t.getBoundingClientRect(); const b = board.getBoundingClientRect(); return r.bottom > b.top + 6 && r.top < b.bottom && r.right > b.left - 6 && r.left < b.right + 6; }).length;
      return { side, bush: document.querySelectorAll('[data-anchor="bush"], .bush-layer svg.pup').length, mound: document.querySelectorAll('[data-anchor="mound"]').length, grid: document.querySelectorAll('.pad-grid').length, painted, thin, badge: Math.min(badge.width, badge.height), trees: document.querySelectorAll('.scenery .sc, .depth-strip > .sc').length, on: board.classList.contains('gate-art'), off, gatesOnTop, rails: board.querySelectorAll('.pf-rail, .pf-corner, .pipe-fence').length, padOver: alpha(pad.left + pad.width / 2, pad.top + pad.height / 2) };
    });
    check(f.off === 0 && f.padOver === 0, `dirt berm all round the pad, a gap at every gate, nothing on the pad (${f.off} wrong)`);
    check(f.rails === 0, 'no pipe-rail fence or corner posts');
    check(f.grid === 0, 'no grid lines on the pad');
    check(f.painted > 200, `the level's own ground variety is painted over the base (${f.painted} samples)`);
    check(f.thin > 0.5 && f.thin < 0.6 && f.badge >= 18, `gates about 30% thinner (${(f.thin * 100).toFixed(0)}% of the band), badge still ${f.badge.toFixed(0)}px`);
    check(f.trees > 20, `groves of trees round the lease (${f.trees})`);
    check(f.side === 0, `no tree touches the berm (${f.side})`);
    check(f.bush === 1 && f.mound === (tab === 1 ? 1 : 0), 'gag anchors: one willow bush (the scenery\'s, or the gag bush standing in for it), and the gopher mound in Cardium only');
    check(f.on && f.gatesOnTop, 'gates sit in the gaps, on top');
    const gates = await page.evaluate(() =>
      [...document.querySelectorAll('.gate')].map((g) => {
        const vis = (sel) => { const e = g.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; };
        return {
          parts: vis('.g-leaf') && vis('.g-hinge') && vis('.g-latch') && vis('.g-badge'),
          tab: getComputedStyle(g.querySelector('.sym')).display !== 'none',
          leafColor: g.querySelector('.g-leaf img').src.includes(`gate-leaf-${[...g.classList].find((c) => c.startsWith('c-')).slice(2)}`),
          wait: g.classList.contains('convoy-gate') ? vis('.wait') : true,
          clear: (() => { if (!g.classList.contains('convoy-gate') || g.classList.contains('convoy-done')) return true; const w = g.querySelector('.wait').getBoundingClientRect(); const b = g.querySelector('.g-badge').getBoundingClientRect(); return w.right <= b.left + 1 || w.left >= b.right - 1 || w.bottom <= b.top + 1 || w.top >= b.bottom - 1; })(),
        };
      }),
    );
    check(gates.length > 0 && gates.every((x) => x.parts && !x.tab && x.leafColor), `pipe gates: hinge post, ${'leaf in its color'}, latch post and badge (${gates.length})`);
    check(gates.every((x) => x.wait && x.clear), 'convoy chips showing, on the latch post, clear of the badge');
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
        warm: getComputedStyle(document.querySelector('.lease-ground')).backgroundImage === 'none' && getComputedStyle(document.querySelector('.vignette')).backgroundImage.includes('radial-gradient') && !/radial-gradient/.test(getComputedStyle(document.querySelector('.screen.game')).backgroundImage),
      };
    });
    check(light.warm && light.vignetteUnder && light.gates && light.trucks, `light: no gradient on the pad, one neutral vignette at the screen edges, behind everything; gates and trucks untinted (${JSON.stringify(light)})`);
  }
  await browser.close();
}

// Equipment: toy-look drawings on their cells (no photo sprites, no slab), always fully visible
// (above the trucks and the berm, never faded, shrunk or clipped); pumpjacks pump by their linkage
// and flares flicker; all still under reduced motion.
for (const reduced of ['no-preference', 'reduce']) {
  console.log(`\nequipment (Montney, ${reduced})`);
  const browser = await webkit.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: reduced });
  const page = await context.newPage();
  await page.goto(ROOT + '?wild=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); }, UNLOCKED);
  await page.reload({ waitUntil: 'networkidle' });
  const seen = new Set();
  for (const index of [6, 7, 9]) {
    await enter(page, 2, index);
    const read = () =>
      page.evaluate(() => {
        const pad = document.querySelector('.pad').getBoundingClientRect();
        const cell = pad.width / 6;
        const trucks = [...document.querySelectorAll('.truck')].map((t) => t.getBoundingClientRect());
        return [...document.querySelectorAll('.obstacle')].map((ob) => {
          const row = Number(ob.dataset.row);
          const col = Number(ob.dataset.col);
          const svg = ob.querySelector('svg.equip');
          const r = svg.getBoundingClientRect();
          const cellTop = pad.top + row * cell;
          const above = trucks.some((t) => t.left < pad.left + (col + 0.5) * cell && t.right > pad.left + (col + 0.5) * cell && t.top < cellTop - cell * 0.5 && t.bottom > cellTop - cell * 0.5);
          const cs = getComputedStyle(svg);
          const stroke = getComputedStyle(svg.querySelector('rect:not(.eq-patch)')).stroke;
          return {
            kind: ob.className.split(' ')[1], row, z: Number(getComputedStyle(ob).zIndex),
            drawn: !!svg && !ob.querySelector('img') && !!svg.querySelector('.eq-patch') && !!svg.querySelector('.eq-shadow') && !svg.querySelector('.ob-concrete'),
            outline: stroke.replace(/\s/g, '') === 'rgb(42,26,12)',
            footOk: Math.abs(r.bottom - (cellTop + cell)) <= 1,
            sticksUp: cellTop - r.top,
            faded: (cs.maskImage || cs.webkitMaskImage || 'none') !== 'none' || Number(cs.opacity) < 1,
            clipped: !!ob.closest('.yard') || !!ob.closest('.pad'),
            layerZ: Number(getComputedStyle(ob.closest('.equip-layer')).zIndex),
            half: cell / 2,
            nudged: cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)',
            above,
            crank: svg.querySelector('.pj-crank')?.getAttribute('transform') ?? '',
            rodX: svg.querySelector('.pj-polished') ? [svg.querySelector('.pj-polished').getAttribute('x1'), svg.querySelector('.pj-polished').getAttribute('x2'), svg.querySelector('.pj-bridle').getAttribute('x1'), svg.querySelector('.pj-bridle').getAttribute('x2')] : null,
            carrier: svg.querySelector('.pj-carrier')?.getAttribute('y') ?? '',
            flame: svg.querySelector('.fl-flame') ? getComputedStyle(svg.querySelector('.fl-flame')).animationName : '',
          };
        });
      });
    const o = await read();
    await wait(700);
    const later = await read();
    o.forEach((x) => seen.add(x.kind));
    const truckZ = await page.$eval('.truck', (t) => Number(getComputedStyle(t).zIndex));
    check(o.length > 0 && o.every((x) => x.drawn && x.outline), `Montney ${index + 1}: toy-look drawings with the trucks' outline, a ground patch and contact shadow, no slab (${o.map((x) => x.kind).join(', ')})`);
    check(o.every((x) => x.footOk || x.nudged), 'each stands on its own cell (nudged a little away from a gate beside it)');
    check(o.every((x) => x.z === 1 + x.row), 'lower rows in front of rows above');
    // Jay's rule: equipment is always fully visible. Its layer is above the trucks (a dragged truck
    // is z 10 inside the yard; the layer sits over the whole yard) and outside every clip.
    check(o.every((x) => !x.clipped && x.layerZ >= 3 && truckZ < 20), 'equipment is drawn above the trucks and the berm, on its own layer outside the yard\'s clip');
    check(o.every((x) => !x.faded), `never faded, even with a truck in the cell above (${o.filter((x) => x.above).map((x) => x.kind).join(', ') || 'none above'})`);
    check(o.every((x) => x.sticksUp < x.half), `every overhang is under half a cell (${o.map((x) => `${x.kind} ${x.sticksUp.toFixed(0)}px`).join(', ')})`);
    const jacks = o.map((x, i) => [x, later[i]]).filter(([x]) => x.kind === 'pumpjack');
    const flares = o.filter((x) => x.kind === 'flare');
    if (reduced === 'reduce') {
      check(jacks.every(([a, b]) => a.crank === b.crank && a.carrier === b.carrier), `reduced motion: pumpjacks hold still (${jacks.length})`);
      check(flares.every((x) => x.flame === 'none'), `reduced motion: flames hold still (${flares.length})`);
    } else {
      check(jacks.every(([a, b]) => a.crank !== b.crank && a.carrier !== b.carrier), `pumpjacks pump: crank turning, rod travelling (${jacks.length})`);
      check(jacks.every(([a, b]) => new Set([...a.rodX, ...b.rodX]).size === 1), 'the polished rod and bridle stay on one vertical line');
      check(flares.every((x) => x.flame === 'flare-flicker'), `flares flicker (${flares.length})`);
    }
  }
  check(['pumpjack', 'tank', 'wellhead', 'flare'].every((k) => seen.has(k)), `all four kinds seen (${[...seen].join(', ')})`);
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
  check(!(await page.$eval('.screen.game', (e) => e.classList.contains('ground-tex'))), 'the ground falls back to the flat colors (the code-drawn variety stays)');
  check(!(await page.$eval('.board', (e) => e.classList.contains('gate-art'))), 'the berm is still drawn (it needs no images)');
  check(await page.$$eval('.gate', (gs) => gs.every((g) => getComputedStyle(g.querySelector('.sym')).display !== 'none' && getComputedStyle(g.querySelector('.gw')).display === 'none')), 'the gates fall back to the colored tabs');
  await enter(page, 2, 9);
  const obs = await page.$$eval('.obstacle', (os) => os.map((o) => !!o.querySelector('svg.equip') && !o.querySelector('img')));
  check(obs.length > 0 && obs.every(Boolean), `equipment is drawn in code and needs no images (${obs.length})`);
  await browser.close();
}

// Dragging a truck back and forth stays smooth with the CPU slowed 4x, with the equipment's ambient motion running.
{
  console.log('\nframe rate while dragging (4x slower CPU)');
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  await page.goto(ROOT + '?wild=0', { waitUntil: 'networkidle' });
  await page.evaluate((p) => localStorage.setItem('rush-hour-rigs:v2', p), UNLOCKED);
  // Montney 8: a pumpjack pumping and a flare flickering while the truck is dragged.
  await enter(page, 2, 7);
  const moving = await page.evaluate(() => [!!document.querySelector('.obstacle.pumpjack'), !!document.querySelector('.obstacle.flare')]);
  check(moving.every(Boolean), 'a pumpjack and a flare are both on screen');
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
