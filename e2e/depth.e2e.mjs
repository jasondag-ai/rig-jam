// THE DEPTH RULE (STANDING_RULES 1), checked on every region's standard scene, in WebKit at iPhone
// DPR 3 (and at Galaxy and Pixel sizes): every strip gag the region can play is held frame by frame
// (every 0.25 s of its run) and each of its characters is compared with every prop and tree it
// overlaps on screen.
//  - ORDER: whatever stands lower on the screen (the lower ground line) is drawn in front
//  - ONE LANE: a gag's layer keeps one ground line (the lowest foot in it) for its whole run
//  - NO TIES: a character never overlaps a prop standing on (nearly) his own ground line, unless
//    the gag is about that prop (the deer and the sign, the bear and his bush...)
//  - NOT LOST: a character never stands still mostly hidden behind a prop
//  - NOT PARKED ON A PROP: a character never stands still in front of a prop, covering most of it
//    (the riser sticking up behind the sitting bear's head)
// Needs a running dev server (or URL=…). `ONLY=surveyor` runs one gag; `REGION=1` one region.
import { webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';

const BASE = process.env.URL ?? 'http://localhost:5173/';
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
/** The prop a gag is about: overlapping it is the gag (it reaches into it, leans on it, hides behind it). */
const OWN = {
  biffyA: ['biffy'], biffyB: ['biffy'], surveyor: ['sign'], deer: ['sign'], tourists: ['sign'], bear: ['bush'], porcupine: ['bush'], bull: ['cow'], tongue: ['riser'],
  nearMiss: ['mound'], gopherLunch: ['mound'], bale: ['bakken'], beaver: ['mann-front'], muskeg: ['mann-layer'],
};
const TIE = 2; // px: ground lines closer than this are the same lane
const SIZES = [['iPhone', 390, 844, 3], ['Galaxy S23', 360, 780, 3], ['Pixel', 412, 915, 2.625]].filter((s) => !process.env.SIZE || s[0].startsWith(process.env.SIZE));

const browser = await webkit.launch();
const found = [];
for (const [device, width, height, dpr] of SIZES) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(`${BASE}?cover=0&gagtest=1&night=0`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('rush-hour-rigs:v2', JSON.stringify({ best: {}, hints: 3, perfect: [], dailyCleared: [], announced: [], demo: true })));
  await page.reload({ waitUntil: 'networkidle' });
  for (let r = 0; r < REGIONS.length; r++) {
    if (process.env.REGION && +process.env.REGION !== r) continue;
    await page.locator('.region-tab').nth(r).click();
    await page.locator('.level-btn').nth(2).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await page.waitForTimeout(500);
    const out = await page.evaluate(async ([only, TIE]) => {
      const g = window.__rhrGag, strip = document.querySelector('.depth-strip'), vw = innerWidth;
      const name = (u) => (u.getAttribute('class') || '').replace(/scene-layer|puppet-layer|prop-layer|depth-tree|strip-layer|scene-prop|scene-gag|\bsc\b/g, ' ').trim().split(/\s+/)[0] || u.tagName;
      const rect = (e) => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom, w: q.width, h: q.height }; };
      const seen = (q) => q.w > 2 && q.h > 2 && q.r > 6 && q.l < vw - 6;
      /** What a unit shows: each tree, each puppet, each top-level drawing of a scene. */
      const parts = (u) => {
        if (u.matches('svg')) return [{ box: rect(u), el: u }];
        const scene = u.querySelector(':scope > svg.scene-svg');
        if (scene) return [...scene.querySelectorAll(u.dataset.gag ? ':scope > g.pup > *' : ':scope > svg')].map((el) => ({ box: rect(el), el })).filter((p) => seen(p.box));
        return [...u.querySelectorAll('svg.pup')].filter((el) => getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0').map((el) => ({ box: rect(el), el })).filter((p) => seen(p.box));
      };
      const order = (a, b) => { const za = +getComputedStyle(a).zIndex || 0, zb = +getComputedStyle(b).zIndex || 0; return za !== zb ? Math.sign(za - zb) : (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1); };
      const res = { gags: [], lanes: [], order: [], ties: [], lost: [], parked: [], unsorted: [] };
      for (const u of strip.children) if (!u.dataset.ground) res.unsorted.push(name(u));
      for (const id of g.names()) {
        if (only && only.toLowerCase() !== id.toLowerCase()) continue;
        if (!g.hold(id, 0)) continue;
        const end = g.end(id);
        const mine = () => [...strip.children].filter((u) => u.dataset.gag === id && !u.classList.contains('scene-over'));
        if (!mine().length) { g.release(id); continue; }
        res.gags.push(id);
        const hidden = new Map(), covers = new Map();
        const lanes = new Set(), reported = new Set(), first = new Map();
        for (let t = 0; t <= end + 1e-6; t += 0.25) {
          g.hold(id, t);
          await new Promise((q) => requestAnimationFrame(q));
          for (const unit of mine()) {
            const ground = +unit.dataset.ground;
            lanes.add(ground);
            // ONE LANE: a layer keeps the ground line it started on, and nothing in it stands lower.
            if (!first.has(unit)) first.set(unit, ground);
            const feet = [...unit.querySelectorAll('svg.pup[data-foot]')].map((e) => +e.dataset.foot);
            if ((first.get(unit) !== ground || feet.some((f) => f > ground + 1)) && !reported.has('lane')) { reported.add('lane'); res.lanes.push(`${id}: its layer's ground line moved from ${first.get(unit)} to ${ground} px, or a puppet stands below it (t ${t.toFixed(2)})`); }
            for (const p of parts(unit)) {
              for (const other of strip.children) {
                if (other === unit || other.dataset.gag === id || other.classList.contains('scene-over') || getComputedStyle(other).display === 'none') continue;
                const og = +other.dataset.ground;
                for (const q of parts(other)) {
                  const ox = Math.min(p.box.r, q.box.r) - Math.max(p.box.l, q.box.l), oy = Math.min(p.box.b, q.box.b) - Math.max(p.box.t, q.box.t);
                  if (ox <= 2 || oy <= 2) continue;
                  const share = (ox * oy) / Math.min(p.box.w * p.box.h, q.box.w * q.box.h);
                  if (share < 0.12) continue;
                  const key = `${id}|${name(other)}@${Math.round(q.box.l)}`;
                  const inFront = order(unit, other) > 0;
                  // ORDER: lower on the screen draws in front.
                  if (Math.abs(ground - og) > TIE && inFront !== ground > og && !reported.has('o' + key)) { reported.add('o' + key); res.order.push(`${id}: drawn ${inFront ? 'in front of' : 'behind'} the ${name(other)} (ground ${og}) from a lane at ${ground} (t ${t.toFixed(2)})`); }
                  // NO TIES.
                  if (Math.abs(ground - og) <= TIE && !reported.has('t' + key)) { reported.add('t' + key); res.ties.push({ id, prop: name(other), text: `${id}: overlaps the ${name(other)} at x ${Math.round(q.box.l)}, which stands on his own ground line (${ground} and ${og} px; ${Math.round(share * 100)}% at t ${t.toFixed(2)})` }); }
                  // NOT PARKED ON A PROP: in front of it, covering most of it, standing still for a second or more.
                  if (inFront && (ox * oy) / (q.box.w * q.box.h) > 0.5) { const h = covers.get(key) ?? { n: 0, x: p.box.l, from: t }; if (Math.abs(h.x - p.box.l) < 1.5) h.n++; else { h.n = 0; h.from = t; } h.x = p.box.l; covers.set(key, h); if (h.n >= 4 && !reported.has('p' + key)) { reported.add('p' + key); res.parked.push({ id, prop: name(other), text: `${id}: stands still in front of the ${name(other)} at x ${Math.round(q.box.l)}, covering most of it (from t ${h.from.toFixed(2)})` }); } }
                  // NOT LOST: mostly hidden behind it, and standing still.
                  if (!inFront && (ox * oy) / (p.box.w * p.box.h) > 0.55) { const h = hidden.get(key) ?? { n: 0, x: p.box.l, max: 0, from: t }; if (Math.abs(h.x - p.box.l) < 1.5) h.n++; else { h.n = 0; h.from = t; } h.x = p.box.l; h.max = Math.max(h.max, h.n); hidden.set(key, h); if (h.n >= 4 && !reported.has('l' + key)) { reported.add('l' + key); res.lost.push({ id, prop: name(other), text: `${id}: stands still more than half hidden behind the ${name(other)} at x ${Math.round(q.box.l)} (from t ${h.from.toFixed(2)})` }); } }
                }
              }
            }
          }
        }
        res.gags[res.gags.length - 1] += ` (lane ${[...lanes].join('/')})`;
        g.release(id);
        await new Promise((q) => requestAnimationFrame(q));
      }
      res.props = [...strip.children].filter((u) => !u.dataset.gag).map((u) => `${name(u)} ${u.dataset.ground}`).join(', ');
      return res;
    }, [process.env.ONLY ?? '', TIE]);
    const own = (x) => (OWN[x.id] ?? []).some((p) => x.prop.startsWith(p));
    const ties = out.ties.filter((x) => !own(x)), lost = out.lost.filter((x) => !own(x)), parked = out.parked.filter((x) => !own(x));
    console.log(`\n${device} ${width}x${height}, ${REGIONS[r].name}: ${out.gags.join(', ')}`);
    console.log(`   (standing there: ${out.props})`);
    check(out.unsorted.length === 0, `everything in the bottom strip has a ground line${out.unsorted.length ? ' EXCEPT ' + out.unsorted.join(', ') : ''}`);
    check(out.order.length === 0, `ORDER: whatever stands lower on the screen is drawn in front${out.order.length ? '\n        ' + out.order.join('\n        ') : ''}`);
    check(out.lanes.length === 0, `ONE LANE: every gag layer keeps one ground line, and nothing in it stands lower${out.lanes.length ? '\n        ' + out.lanes.join('\n        ') : ''}`);
    check(ties.length === 0, `NO TIES: no character overlaps a prop standing on his own ground line${ties.length ? '\n        ' + ties.map((x) => x.text).join('\n        ') : ''}`);
    check(lost.length === 0, `NOT LOST: no character stands still mostly hidden behind a prop${lost.length ? '\n        ' + lost.map((x) => x.text).join('\n        ') : ''}`);
    check(parked.length === 0, `NOT PARKED ON A PROP: no character stands still covering a prop behind him${parked.length ? '\n        ' + parked.map((x) => x.text).join('\n        ') : ''}`);
    found.push(...parked.map((x) => x.text), ...ties.map((x) => x.text), ...lost.map((x) => x.text), ...out.order, ...out.lanes);
    await page.locator('.hud [data-act="levels"]').click();
    await page.waitForSelector('.screen.levels');
  }
  await context.close();
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
