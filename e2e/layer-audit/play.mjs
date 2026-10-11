// The layer audit, part 2: everything that is not a held strip sighting, watched while it really plays: the sightings
// that play over or above the lease (their preview links), a driver's speech bubble, trucks driving out by each side,
// the hint's rim and ghost, the win card and its confetti, the finale, and the dig (its cards, its finds and their
// bubbles, the far side). Each is sampled as it goes; a thing the player should be watching is asked for by a selector.
import { REGIONS } from '../../src/levels/regions.ts';
import { getMoveRange, newGame, solve, tryMove } from '../../src/engine/index.ts';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Covers that are never meant to lie over a thing being watched: flagged from an eighth; anything else from a half. */
const HARD = /the berm|the lease|a gate|the HUD|the buttons|the tip line|the toast|the update bar|a truck|lease equipment/;

/** In the page: what each watched thing shows of itself. `specs`: [{ sel, name, kin }] (kin: a selector of its own family). */
const look = (page, specs) => page.evaluate((specs) => {
  const la = window.__la, out = [];
  for (const s of specs) {
    [...document.querySelectorAll(s.sel)].forEach((el, i) => {
      if (la.shown(el) < 0.3) return;
      const b = la.box(el);
      // (On the stage: inside the game's own screen, a column in the middle of a desktop window.)
      const st = la.box(document.querySelector('.screen') ?? document.body);
      if (b.w < 5 || b.h < 5 || b.r < st.l + 3 || b.l > st.r - 3 || b.b < st.t + 3 || b.t > st.b - 3) return;
      const kinSel = s.kin ?? s.sel, cov = la.covered(el, (e) => !!e.closest(kinSel) || el.contains(e), s.grid ?? 5), top = Object.entries(cov.by).sort((a, c) => c[1] - a[1])[0];
      const cl = la.clipped(el);
      out.push({ key: `${s.name}${document.querySelectorAll(s.sel).length > 1 ? ' #' + (i + 1) : ''}`, name: s.name, box: b, points: cov.points, cov: top ? { by: top[0], share: cov.share } : null, clip: cl.share > 0 ? { by: cl.by, share: cl.share } : null, text: s.text ? el.textContent.trim().slice(0, 40) : '' });
    });
  }
  return out;
}, specs);

/** Keeps count of what stays hidden from sample to sample, and takes a still when it has for long enough. */
/** What each scenario really looked at (a scenario that watched nothing has tested nothing). */
export const WATCHED = new Map();
export function tracker(scenario, where, shot, flags, { minRun = 2, coverMin = 0.5, clipMin = 0.25, edge = false } = {}) {
  const runs = new Map(), prev = new Map();
  let tick = 0;
  return async (seen, at) => {
    tick++;
    { const w = WATCHED.get(scenario) ?? new Set(); for (const s of seen) w.add(s.name); WATCHED.set(scenario, w); }
    for (const s of seen) {
      const was = prev.get(s.key), still = was && Math.abs(was.l - s.box.l) < 1.5 && Math.abs(was.t - s.box.t) < 1.5 ? (was.still ?? 0) + 1 : 0;
      prev.set(s.key, { ...s.box, still });
      const hits = [];
      if (s.cov && s.points >= 3 && s.cov.share >= (HARD.test(s.cov.by) ? Math.min(coverMin, 0.12) : coverMin)) hits.push(['covered', s.cov.by, s.cov.share]);
      // (A thing half off the screen's edge is on its way in or out, unless it has stopped there, or the edge is asked about.)
      if (s.clip && s.clip.share >= clipMin && (!/the screen's edge|^\.screen \(overflow\)|^\.scene-layer \(overflow\)/.test(s.clip.by) || edge || still >= 4)) hits.push(['clipped', s.clip.by, s.clip.share]);
      for (const [kind, by, share] of hits) {
        const k = `${s.key}|${kind}|${by}`, f = runs.get(k) ?? { run: 0, last: -9, done: false, share: 0 };
        f.run = tick - f.last === 1 ? f.run + 1 : 1; f.last = tick; f.share = Math.max(f.share, share);
        runs.set(k, f);
        if (f.run >= minRun && !f.done) { f.done = true; f.flag = { scenario, where, focal: s.key + (s.text ? ` ("${s.text}")` : ''), kind, by, share, secs: 0, at, still: await shot(`${scenario.replace(/[^\w]+/g, '_')}_${s.name.replace(/[^\w]+/g, '_')}_${kind}`, s.box) }; flags.push(f.flag); }
        if (f.flag) { f.flag.share = f.share; f.flag.runs = f.run; }
      }
    }
  };
}

const drag = (page, id, cells, out) => page.evaluate(async ([id, n]) => {
  const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`), q = el.getBoundingClientRect(), h = el.classList.contains('horiz'), cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell'));
  let x = q.x + q.width / 2, y = q.y + q.height / 2;
  const ev = (t) => el.dispatchEvent(new PointerEvent(t, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 }));
  ev('pointerdown');
  for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((r) => setTimeout(r, 16)); }
  await new Promise((r) => setTimeout(r, 60));
  ev('pointerup');
}, [id, cells + (out ? Math.sign(cells) * 0.4 : 0)]);
const BUBBLE = { sel: '.screen .bubble', name: 'speech bubble', kin: '.bubble', text: true, grid: 6 };

/**
 * EVERY SIGHTING BY ITS PREVIEW LINK, one whole run in real time: its speech bubbles (the lines are only said when it
 * really plays), and for the ones that are not held strip gags (the magpie, the sleepy worker, the moose, the geese,
 * the aurora, the Personal Cloud, the marshmallow's stick) the actors themselves.
 */
export async function auditPreviews(page, root, shot, flags, names, only = '') {
  const OWN = { magpie: ['.magpie-layer svg.pup, .truck .magpie-splat', 'the magpie'], worker: ['.worker-layer svg.pup', 'the sleepy worker'], moose: ['.moose-layer svg.pup, .moose-layer svg', 'the moose'], geese: ['.geese-layer svg.pup', 'a goose'], aurora: ['.aurora-layer > svg, .aurora-layer svg.scene-svg > g.pup > *', 'the coyote and the lights'], cloud: ['[data-gag="cloud"] svg.scene-svg > g.pup > *', 'the Personal Cloud'], marshmallow: ['[data-gag="marshmallow"] svg.pup, .pup-overlay', 'the marshmallow worker and his stick'] };
  for (const gag of names) {
    if (only && only !== gag) continue;
    await page.goto(`${root}?gag=${gag}&cover=0&soundnudge=0${gag === 'aurora' ? '' : '&night=0'}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.board .truck.sprite-on');
    const feed = tracker(`sighting: ${gag} (its preview)`, 'its preview level', shot, flags, { coverMin: 0.5 });
    const says = tracker(`sighting: ${gag} (its line)`, 'its preview level', shot, flags, { coverMin: 0.1, clipMin: 0.03, edge: true });
    const beat = () => page.evaluate(() => [...document.querySelectorAll('[data-beat]')].some((e) => e.dataset.beat));
    // One run: from its start (a beat is on) to its end (no beat), 22 s at most.
    const t0 = Date.now();
    while (!(await beat()) && Date.now() - t0 < 6000) await wait(60);
    const t1 = Date.now();
    let quiet = 0;
    while (Date.now() - t1 < 22000 && quiet < 4) {
      const at = `${((Date.now() - t1) / 1000).toFixed(1)} s`;
      if (OWN[gag]) await feed(await look(page, [{ sel: OWN[gag][0], name: OWN[gag][1], kin: `.${gag}-layer, [data-gag="${gag}"], .magpie-splat, .magpie-drip, .pup-overlay` }]), at);
      await says(await look(page, [BUBBLE]), at);
      quiet = (await beat()) ? 0 : quiet + 1;
      await wait(200);
    }
  }
}

/** On a level: a bump's bubble, the hint's rim and ghost, every truck's drive out, the win card and the confetti. */
export async function auditBoard(page, root, shot, flags) {
  for (const [ri, li] of [[0, 8], [5, 2]]) {
    const level = REGIONS[ri].levels[li], where = `${REGIONS[ri].name} ${li + 1}`;
    await page.goto(`${root}?demo=1&cover=0&night=0&magpie=0&worker=0&moose=0&soundnudge=0&off=nearmiss,landowner,sam,geese,biffya,biffyb,lunch,porcupine,bell,pea`, { waitUntil: 'networkidle' });
    await page.locator('.region-tab').nth(ri).click();
    await page.locator('.level-btn').nth(li).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(600);
    let state = newGame(level);
    // A bump: a truck pushed where it cannot go; its driver's bubble.
    const stuck = state.trucks.map((t) => ({ t, r: getMoveRange(state, t.id) })).find(({ r }) => (r.max === 0 && r.exitDelta !== 0) || (r.min === 0 && r.exitDelta !== 0));
    if (stuck) {
      await drag(page, stuck.t.id, stuck.r.max === 0 ? 0.8 : -0.8, false);
      const feed = tracker('a bump and its line', where, shot, flags, { coverMin: 0.1, clipMin: 0.03, edge: true });
      for (let k = 0; k < 6; k++) { await feed(await look(page, [BUBBLE]), `${(k * 0.2).toFixed(1)} s after the bump`); await wait(200); }
      await wait(2600);
    }
    // The hint: the truck to move (its bright rim), then where it goes (its ghost, or OUT on its gate).
    const hintFeed = tracker('the hint', where, shot, flags, { coverMin: 0.2, clipMin: 0.1, edge: true });
    await page.locator('.controls [data-act="hint"]').click();
    await page.waitForSelector('.board .truck.hinted', { timeout: 15000 });
    for (let k = 0; k < 3; k++) { await feed2(hintFeed, page, [{ sel: '.board .truck.hinted', name: 'the hinted truck', kin: '.truck.hinted' }], 'first tap'); await wait(220); }
    await page.locator('.controls [data-act="hint"]').click();
    await wait(500);
    for (let k = 0; k < 3; k++) { await feed2(hintFeed, page, [{ sel: '.board .ghost', name: "the hint's ghost", kin: '.ghost' }, { sel: '.board .out-badge', name: 'the OUT badge', kin: '.out-badge, .gate' }], 'second tap'); await wait(220); }
    // The whole best line: every truck that drives out is watched from its gate until it has gone.
    const line = solve(level);
    for (const m of line) {
      const r = tryMove(state, m.id, m.delta); state = r.state;
      await drag(page, m.id, m.delta, r.exited);
      if (r.exited) {
        const feed = tracker(`a truck drives out (${m.id})`, where, shot, flags, { minRun: 3, coverMin: 0.3, clipMin: 0.3 });
        for (let k = 0; k < 14; k++) { await feed(await look(page, [{ sel: `.truck[data-id="${m.id}"].exiting, .truck[data-id="${m.id}"].leaving`, name: 'the truck driving out', kin: '.truck' }]), `${k * 60} ms into its drive out`); await wait(55); }
      } else await wait(330);
    }
    await page.waitForSelector('.win:not([hidden]) .card', { timeout: 10000 }).catch(() => {});
    const feed = tracker('the win card', where, shot, flags, { coverMin: 0.08, clipMin: 0.02, edge: true });
    const conf = tracker('the confetti', where, shot, flags, { coverMin: 0.5 });
    for (let k = 0; k < 8; k++) {
      await feed(await look(page, [{ sel: '.win:not([hidden]) .card', name: 'the win card', kin: '.win .card', grid: 7 }, { sel: '.win:not([hidden]) .card button', name: 'a win card button', kin: '.win .card' }, { sel: '.win:not([hidden]) .zero-incident', name: 'the Zero Incident medal', kin: '.win .card' }]), `${(k * 0.25).toFixed(2)} s after the card`);
      await conf((await look(page, [{ sel: '.confetti > *', name: 'a piece of confetti', kin: '.confetti' }])).slice(0, 14), `${(k * 0.25).toFixed(2)} s after the card`);
      await wait(240);
    }
  }
}
const feed2 = async (feed, page, specs, at) => feed(await look(page, specs), at);

/** A hint whose move is a drive out: the OUT badge on the gate (Cardium 1's first move). */
export async function auditOut(page, root, shot, flags) {
  await page.goto(`${root}?demo=1&cover=0&night=0&magpie=0&worker=0&soundnudge=0&lunch=0`, { waitUntil: 'networkidle' });
  await page.locator('.region-tab').nth(0).click();
  await page.locator('.level-btn').nth(0).click();
  await page.waitForSelector('.board .truck.sprite-on');
  await wait(500);
  await page.locator('.controls [data-act="hint"]').click();
  await page.waitForSelector('.board .truck.hinted', { timeout: 15000 });
  await page.locator('.controls [data-act="hint"]').click();
  await wait(600);
  const feed = tracker('the hint: OUT', 'Cardium 1', shot, flags, { coverMin: 0.2, clipMin: 0.1, edge: true });
  for (let k = 0; k < 3; k++) { await feed(await look(page, [{ sel: '.board .out-badge', name: 'the OUT badge', kin: '.out-badge' }, { sel: '.board .ghost', name: "the hint's ghost", kin: '.ghost' }]), 'second tap'); await wait(220); }
}

/** The finale: the card (really played), then the photo, the credits and Still Here held through their runs. */
export async function auditFinale(page, root, shot, flags) {
  await page.goto(`${root}?finale=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.finale-card [data-act="photo"]');
  await wait(3600);
  const card = tracker('the finale: the Perfect Game card', "the finale's stage", shot, flags, { coverMin: 0.08, clipMin: 0.02, edge: true });
  for (let k = 0; k < 3; k++) { await card(await look(page, [{ sel: '.finale-card', name: 'the Perfect Game card', kin: '.finale-card', grid: 7 }, { sel: '.finale-card button', name: 'the Crew photo button', kin: '.finale-card' }]), 'once it is all in'); await wait(250); }
  await page.goto(`${root}?finale=stage&gagtest=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.screen.finale .board');
  await wait(600);
  const durs = await page.evaluate(() => window.__rhrFinale.durations);
  const PARTS = [['photo', [{ sel: '[data-gag="photo"] svg.scene-svg > g.pup > *', name: 'the crew', kin: '[data-gag="photo"]' }, { sel: '.finale-polaroid', name: 'the Polaroid', kin: '.finale-polaroid', grid: 6 }, BUBBLE]], ['credits', [{ sel: '.finale-credits p', name: 'a credits line', kin: '.finale-credits', text: true }, { sel: '.finale-polaroid', name: 'the Polaroid', kin: '.finale-polaroid', grid: 6 }]], ['still', [{ sel: '.finale-close', name: 'the close-up on the biffy', kin: '.finale-close', grid: 7 }, { sel: '.finale-close .bubble', name: 'speech bubble', kin: '.bubble', text: true, grid: 6 }]]];
  for (const [part, specs] of PARTS) {
    const feed = tracker(`the finale: ${part}`, "the finale's stage", shot, flags, { coverMin: part === 'credits' ? 0.2 : 0.5, clipMin: part === 'credits' ? 0.9 : 0.25 });
    for (let t = 0.25; t < durs[part] - 0.1; t += 0.25) { await page.evaluate(([p, t]) => window.__rhrFinale.hold(p, t), [part, t]); await wait(40); await feed(await look(page, specs), `${t.toFixed(2)} s into ${part}`); }
    await page.evaluate(() => window.__rhrFinale.release());
  }
}

/** The dig: the log's cards, every buried thing and deep find with its bubble, and the far side's card and bubbles. */
export async function auditDig(page, root, shot, flags) {
  await page.goto(`${root}?demo=1&cover=0`, { waitUntil: 'networkidle' });
  await page.locator('.brand .binoculars').click();
  await page.waitForSelector('.dig-bg svg.strata');
  await wait(500);
  const where = 'the Wildlife Log';
  const into = (sel, i) => page.evaluate(async ([sel, i]) => { const el = document.querySelectorAll(sel)[i]; if (!el) return false; el.scrollIntoView({ block: 'center' }); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await new Promise((r) => setTimeout(r, 120)); return true; }, [sel, i]);
  // The cards, a few at a time as they are scrolled to.
  const cards = tracker('the log: its cards', where, shot, flags, { minRun: 1, coverMin: 0.1, clipMin: 0.5 });
  const n = await page.locator('.log-card').count();
  for (let i = 0; i < n; i += 2) { await into('.log-card', i); await cards((await look(page, [{ sel: '.log-card', name: 'a log card', kin: '.log-card', text: true }])).filter((s) => s.box.t >= 60 && s.box.b <= await0(page)), `card ${i + 1}`); }
  // Every buried thing and deep find: tapped, its bubble watched.
  const things = await page.locator('.buried').count();
  const finds = tracker('the dig: a find', where, shot, flags, { minRun: 1, coverMin: 0.3, clipMin: 0.3 });
  const says = tracker("the dig: a find's bubble", where, shot, flags, { minRun: 1, coverMin: 0.08, clipMin: 0.03, edge: true });
  for (let i = 0; i < things; i++) {
    if (!(await into('.buried', i))) continue;
    const id = await page.evaluate((i) => document.querySelectorAll('.buried')[i].dataset.id, i);
    await finds((await look(page, [{ sel: `.buried[data-id="${id}"]`, name: `the buried ${id}`, kin: '.buried' }])), 'scrolled to');
    await page.evaluate((i) => { const el = document.querySelectorAll('.buried')[i], r = el.getBoundingClientRect(); for (const t of ['pointerdown', 'pointerup', 'click']) el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 5, pointerType: 'touch', clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); }, i);
    await wait(420);
    await says((await look(page, [{ sel: '.dig-bubble', name: `the bubble of the ${id}`, kin: '.dig-bubble', text: true, grid: 6 }])), 'after a tap');
  }
  // The far side: the arrival card, the penguin's and the seal's bubbles.
  await page.evaluate(async () => { const s = document.querySelector('.screen.log'); s.scrollTop = 9; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); s.scrollTop = 900; await new Promise((r) => setTimeout(r, 400)); s.scrollTop = s.scrollHeight; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  await wait(700);
  const far = tracker('the dig: the far side', where, shot, flags, { minRun: 1, coverMin: 0.08, clipMin: 0.03, edge: true });
  await far(await look(page, [{ sel: '.dig-arrival', name: 'the arrival card', kin: '.dig-arrival', grid: 7 }, { sel: '.deep-surface-slot .dig-say, .kerg-say, .deep-layer .dig-bubble', name: 'a bubble at the island', kin: '.dig-say, .kerg-say, .dig-bubble', text: true }]), 'at the island');
}
const await0 = (page) => page.viewportSize().height;
