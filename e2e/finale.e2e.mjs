// THE FINALE (October upgrade, job U9), in WebKit at iPhone DPR 3, at Safari's visible sizes 390 x 664 and 375 x 635:
//  1. `?finale=1` plays all four parts and ends on the game's own cover: the Perfect Game card (the game's own
//     counts, the Company Man's first smile, one button), the crew photo (both of Moe's lines, the flash, the
//     Polaroid on the lease), the credits (the dark, the roll, a tap skips them), Still Here (the close-up, both
//     lines), then cover.ts's own screen, and a tap opens the level list. Nothing is saved.
//     NOTHING COVERS THE HUD OR THE BUTTONS BEFORE THE CLOSE-UP, but for the flash and the dark the credits roll on
//     (the page's own): the card stands between them, the crew stays in the strip, the Polaroid drops UNDER the HUD.
//  2. EARNED FOR REAL: a save one par short (every sighting found) plays it after that level's win card, once; it is
//     remembered under its own key; Settings then offers "Watch the ending". Not in demo mode; not a sighting short.
// Needs the dev server (URL=, default the dev build on 5181). `ONLY=play|earned`. `VIEW=390x664`.
import { webkit } from 'playwright';
import { REGIONS } from '../src/levels/regions.ts';
import { newGame, solve, tryMove } from '../src/engine/index.ts';
import { LOG_ENTRIES } from '../src/ui/wildlife-log.ts';
import { FINALE_LINES, FINALE_CREDITS } from '../src/ui/lines.ts';

const ROOT = process.env.URL ?? 'http://localhost:5181/';
const ONLY = process.env.ONLY;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => { if (!ok) failures++; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`); };
const SIZES = process.env.VIEW ? [process.env.VIEW.split('x').map(Number)] : [[390, 664], [375, 635]];
const levels = REGIONS.flatMap((r) => r.levels);
const browser = await webkit.launch();
const OUT = process.env.OUT ?? `${process.env.HOME}/Desktop/RHR Art Inbox/qc/finale`;
const { mkdirSync } = await import('node:fs');
mkdirSync(OUT, { recursive: true });
const part = (page) => page.evaluate(() => document.querySelector('.screen.finale')?.dataset.part ?? (document.querySelector('#app > .screen.cover') ? 'COVER' : document.querySelector('.screen.levels') ? 'LIST' : null));
const waitPart = (page, p, ms = 20000) => page.waitForFunction((want) => (document.querySelector('.screen.finale')?.dataset.part ?? (document.querySelector('#app > .screen.cover') ? 'COVER' : null)) === want, p, { timeout: ms }).then(() => true, () => false);
/** What of the finale lies over the HUD or the buttons right now: [name, how many px]. The flash and the dark do not count. */
const covering = (page) => page.evaluate(() => {
  const hud = document.querySelector('.hud').getBoundingClientRect(), ctl = document.querySelector('.controls').getBoundingClientRect();
  const over = (r, b) => Math.max(0, Math.min(r.right, b.right) - Math.max(r.left, b.left)) > 1 && Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top)) > 1;
  const z = (e) => Number(getComputedStyle(e).zIndex) || 0;
  const out = [];
  const card = document.querySelector('.finale-card');
  if (card) { const r = card.getBoundingClientRect(); if (r.top < hud.bottom - 1) out.push(`the card over the HUD by ${Math.round(hud.bottom - r.top)}`); if (r.bottom > ctl.top + 1) out.push(`the card over the buttons by ${Math.round(r.bottom - ctl.top)}`); }
  const pol = document.querySelector('.finale-polaroid');
  if (pol && !pol.classList.contains('lifted')) { const r = pol.getBoundingClientRect(); if ((over(r, hud) || over(r, ctl)) && z(pol) >= 2) out.push('the Polaroid over the HUD or the buttons'); }
  for (const el of document.querySelectorAll('.screen.finale .depth-strip [data-gag="photo"] g.pup > *')) { const r = el.getBoundingClientRect(); if (r.width > 2 && r.bottom > ctl.top + 1) out.push(`the crew over the buttons by ${Math.round(r.bottom - ctl.top)}`); }
  const b = document.querySelector('.screen.finale .bubble'); if (b) { const r = b.getBoundingClientRect(); if (over(r, hud) || over(r, ctl)) out.push('a bubble over the HUD or the buttons'); }
  return out;
});

for (const [W, H] of SIZES) {
  // ---------- 1. ?finale=1 ----------
  if (!ONLY || ONLY === 'play') {
    console.log(`\nwebkit ${W} x ${H}: ?finale=1, all four parts`);
    const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${ROOT}?finale=1`, { waitUntil: 'networkidle' });
    check((await part(page)) === 'card', 'it opens straight on the Perfect Game card');
    const stage = await page.evaluate(() => ({ trucks: document.querySelectorAll('.screen.finale .board .truck').length, gates: document.querySelectorAll('.screen.finale .board .gate').length, open: document.querySelectorAll('.screen.finale .board .gate.open').length, theme: document.querySelector('.screen.finale').dataset.theme, hud: document.querySelector('.hud').textContent.replace(/\s+/g, ' ').trim(), props: [...document.querySelectorAll('.screen.finale .depth-strip > .scene-prop')].map((e) => e.className.match(/finale-\w+/)[0]), others: document.querySelectorAll('.sign-layer, .bush-layer, .biffy-layer, [data-anchor]').length, biffy: !!document.querySelector('.finale-biffy .fin-biffy'), buttons: [...document.querySelectorAll('.controls .btn')].map((b) => b.textContent.trim().replace(/\s+/g, ' ')) }));
    check(stage.trucks === 0 && stage.gates === REGIONS[0].levels[0].gates.length && stage.open === 0 && stage.theme === 'summer' && stage.hud.includes('Cardium 1') && stage.hud.includes(REGIONS[0].levels[0].name), `its own stage: Cardium 1's pad, empty, its ${stage.gates} gates shut, summer ("${stage.hud.slice(0, 50)}")`);
    check(stage.biffy && stage.others === 0 && stage.props.join() === 'finale-ground,finale-trees,finale-biffy' && stage.buttons.length === 3, `a strip with only the biffy (${stage.props.join(', ')}); the three buttons standing (${stage.buttons.join(', ')})`);
    await wait(3600);
    const card = await page.evaluate(() => { const c = document.querySelector('.finale-card'), r = c.getBoundingClientRect(), btn = c.querySelector('[data-act="photo"]').getBoundingClientRect(); return { banner: c.querySelector('h2').getAttribute('aria-label'), pads: c.querySelector('.fin-pads').textContent.replace(/\s+/g, ' ').trim(), sightings: c.querySelector('.fin-sightings').textContent.replace(/\s+/g, ' ').trim(), says: c.querySelector('.company-says').textContent, hats: c.querySelectorAll('.hats img').length, medal: !!c.querySelector('.zero-incident'), mascot: !!c.querySelector('.mascot svg'), boss: !!c.querySelector('.company-man svg'), btn: Math.round(btn.height), buttons: c.querySelectorAll('button').length, w: Math.round(r.width) }; });
    check(card.banner === 'Perfect Game!' && card.pads.endsWith(`${levels.length} of ${levels.length}`) && card.sightings.endsWith(`${LOG_ENTRIES.length} of ${LOG_ENTRIES.length}`) && card.hats === 3 && card.medal && card.mascot && card.boss, `the card: "${card.banner}", "${card.pads}", "${card.sightings}" (the game's own counts), three hard hats, the Zero Incident medal`);
    check(card.says === FINALE_LINES.company && card.buttons === 1 && card.btn >= 44, `the Company Man: "${card.says}"; one button, Crew photo (${card.btn} px tall)`);
    const c1 = await covering(page);
    check(c1.length === 0, `the card stands between the HUD and the buttons${c1.length ? ': ' + c1.join('; ') : ''}`);
    await page.screenshot({ path: `${OUT}/1_card_${W}x${H}.png` });
    await page.locator('.finale-card [data-act="photo"]').click();
    check(await waitPart(page, 'photo', 4000), 'a tap on Crew photo: the crew photo');
    // The photo, watched right through: the crew in its rows, the lines, the flash, the Polaroid; and what covers what.
    const seen = await page.evaluate(() => new Promise((done) => {
      const out = { lines: [], flash: 0, crew: 0, polaroid: null, covering: new Set(), beats: [], light: null };
      const hud = document.querySelector('.hud').getBoundingClientRect(), ctl = document.querySelector('.controls').getBoundingClientRect();
      const tick = () => {
        const s = document.querySelector('.screen.finale');
        if (!s || s.dataset.part !== 'photo') return done({ ...out, covering: [...out.covering] });
        if (out.beats.at(-1) !== s.dataset.beat) out.beats.push(s.dataset.beat);
        const b = s.querySelector('.bubble'); if (b && !out.lines.includes(b.textContent)) out.lines.push(b.textContent);
        if (b) { const r = b.getBoundingClientRect(); if (r.top < hud.bottom - 1 || r.bottom > ctl.top + 1) out.covering.add('a bubble'); }
        out.flash = Math.max(out.flash, Number(s.querySelector('.finale-flash')?.style.opacity ?? 0));
        const fz = s.querySelector('.finale-flash'); if (fz && Number(getComputedStyle(fz).zIndex) >= 2) out.covering.add('the flash is over the HUD');
        out.crew = Math.max(out.crew, s.querySelectorAll('.finale-mid g.pup > *').length + s.querySelectorAll('.finale-front g.pup > *').length + s.querySelectorAll('.finale-back g.pup > *').length);
        for (const el of s.querySelectorAll('.depth-strip [data-gag="photo"]:not(.scene-over) g.pup > *')) { const r = el.getBoundingClientRect(); if (r.width > 2 && r.bottom > ctl.top + 1) out.covering.add('the crew over the buttons'); }
        const p = s.querySelector('.finale-polaroid');
        if (p) { const r = p.getBoundingClientRect(), board = s.querySelector('.board').getBoundingClientRect(); out.polaroid = { mid: Math.round(r.top + r.height / 2 - (board.top + board.height / 2)), w: Math.round(r.width), z: Number(getComputedStyle(p).zIndex), inLease: r.left >= board.left - 2 && r.right <= board.right + 2, underHud: r.top >= hud.bottom - 1, photo: p.querySelectorAll('svg g').length > 20 }; if ((r.top < hud.bottom || r.bottom > ctl.top) && out.polaroid.z >= 2) out.covering.add('the Polaroid over the HUD'); }
        out.light = s.querySelector('.fin-biffy')?.dataset.light;
        requestAnimationFrame(tick);
      };
      tick();
    }));
    check(seen.lines.join(' | ') === `${FINALE_LINES.squeeze} | ${FINALE_LINES.seriously}`, `Moe's two lines, in the game's own bubble: ${seen.lines.join(' | ')}`);
    check(seen.crew >= 16 && seen.beats.length >= 12, `the crew in its rows (${seen.crew} drawings) through ${seen.beats.length} beats (${seen.beats.slice(0, 3).join(', ')} ...)`);
    check(seen.flash > 0.9, `SPLAT and FLASH: the flash peaks at ${seen.flash}`);
    check(!!seen.polaroid && Math.abs(seen.polaroid.mid) <= 4 && seen.polaroid.inLease && seen.polaroid.underHud && seen.polaroid.photo, `the Polaroid comes to rest on the lease (${seen.polaroid?.w} px wide, ${seen.polaroid?.mid} px off its middle), a front-view photo`);
    check(seen.covering.length === 0, `nothing covers the HUD or the buttons through the photo${seen.covering.length ? ': ' + seen.covering.join('; ') : ''}`);
    check((await part(page)) === 'credits', 'then the credits');
    await wait(2600);
    const cr = await page.evaluate(() => { const s = document.querySelector('.screen.finale'), box = s.querySelector('.finale-credits'), r = box.getBoundingClientRect(), pol = s.querySelector('.finale-polaroid').getBoundingClientRect(); const rows = [...box.querySelectorAll('p')]; const shown = rows.filter((p) => { const q = p.getBoundingClientRect(); return Number(p.style.opacity) > 0.5 && q.top >= r.top - 2 && q.bottom <= r.bottom + 2; }).map((p) => p.textContent); return { dim: Number(s.querySelector('.finale-dim').style.opacity), rows: rows.length, shown, polTop: Math.round(pol.top), polUnder: pol.bottom <= r.top + 4, crew: s.querySelectorAll('.finale-mid g.pup > *').length, light: s.querySelector('.fin-biffy').dataset.light, wide: rows.every((p) => p.scrollWidth <= innerWidth) }; });
    check(cr.dim > 0.8 && cr.polUnder && cr.polTop >= 10 && cr.shown.length >= 1 && cr.rows === FINALE_CREDITS.filter(([, k]) => k !== 'gap').length && cr.wide, `the screen dark (${cr.dim}), the photo up at the top, the credits rolling under it (${cr.rows} lines; now showing "${cr.shown.slice(0, 2).join('", "')}")`);
    check(cr.crew === 0 && cr.light === 'red', 'under the dark the crew has gone and the biffy\'s light is red');
    await page.screenshot({ path: `${OUT}/3_credits_${W}x${H}.png` });
    // A tap skips them.
    const t0 = Date.now();
    await page.mouse.click(W / 2, H / 2);
    check(await waitPart(page, 'still', 3000), `a tap skips the credits (Still Here ${((Date.now() - t0) / 1000).toFixed(1)} s later)`);
    const still = await page.evaluate(() => new Promise((done) => {
      const out = { lines: [], grow: [], words: new Set(), door: false };
      const tick = () => {
        const s = document.querySelector('.screen.finale');
        if (!s || s.dataset.part !== 'still') return done({ ...out, words: [...out.words] });
        const c = s.querySelector('.finale-close');
        if (c) { const r = c.getBoundingClientRect(); out.grow.push(Math.round(r.height)); const b = c.querySelector('.bubble'); if (b && !out.lines.includes(b.textContent)) { out.lines.push(b.textContent); const q = b.getBoundingClientRect(); if (q.left < 0 || q.right > innerWidth || q.top < 0 || q.bottom > innerHeight) out.lines.push('OFF SCREEN'); } for (const t of c.querySelectorAll('.words text')) out.words.add(t.textContent); }
        requestAnimationFrame(tick);
      };
      tick();
    }));
    check(still.grow.length > 20 && still.grow[0] < H * 0.4 && Math.max(...still.grow) >= H - 1, `the view closes in on the biffy: the close-up grows from the strip (${still.grow[0]} px) to the whole screen (${Math.max(...still.grow)} px)`);
    check(still.lines.join(' | ') === `${FINALE_LINES.still} | ${FINALE_LINES.home}`, `Moe at the door: ${still.lines.join(' | ')}`);
    check(still.words.includes('creeeak') && still.words.includes('scrub scrub'), `the sound words are drawn (${still.words.join(', ')})`);
    check(await waitPart(page, 'COVER', 4000), "then the game's own opening screen");
    await wait(900);
    const cover = await page.evaluate(() => { const c = document.querySelector('#app > .screen.cover'); return c ? { only: document.querySelector('#app').children.length === 1, img: c.querySelector('img.cover-img')?.getAttribute('src'), title: c.querySelector('.cover-title')?.textContent, tap: c.querySelector('.cover-start')?.textContent, finale: !!document.querySelector('.screen.finale') } : null; });
    check(!!cover && cover.only && !cover.finale && cover.img === './cover.webp' && cover.title === 'RIGJAM' && cover.tap === 'TAP TO START', `cover.ts's own screen, alone on the page: the cover image, "${cover?.title}", "${cover?.tap}"`);
    await page.screenshot({ path: `${OUT}/5_cover_${W}x${H}.png` });
    await page.locator('.cover-tap').click();
    await page.waitForSelector('.screen.levels', { timeout: 5000 }).catch(() => {});
    const end = await page.evaluate(() => ({ list: !!document.querySelector('.screen.levels'), keys: Object.keys(localStorage).filter((k) => k.startsWith('rush-hour-rigs')) }));
    check(end.list && end.keys.filter((k) => k !== 'rush-hour-rigs:region').length === 0, `a tap opens the level list as ever; nothing was saved (${end.keys.join(', ') || 'no keys'})`);
    check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();

    // Stills of the photo and the close-up, for Jay's eye (held with the test hook).
    const c2 = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true });
    const p2 = await c2.newPage();
    await p2.goto(`${ROOT}?finale=stage&gagtest=1`, { waitUntil: 'networkidle' });
    await p2.waitForSelector('.screen.finale .board');
    for (const [name, pt, t] of [['2a_squeeze', 'photo', 1.0], ['2b_magpie', 'photo', 5.2], ['2c_polaroid', 'photo', 7.0], ['3_thanks', 'credits', 11.5], ['4a_door', 'still', 3.4], ['4b_still_here', 'still', 5.6], ['4c_go_home', 'still', 7.4]]) {
      await p2.evaluate(([pt, t]) => window.__rhrFinale.hold(pt, t), [pt, t]);
      await wait(250);
      await p2.screenshot({ path: `${OUT}/${name}_${W}x${H}.png` });
      if (name === '3_thanks') { const last = await p2.evaluate(() => { const rows = [...document.querySelectorAll('.finale-credits p')], p = rows.at(-1), r = p.getBoundingClientRect(), box = document.querySelector('.finale-credits').getBoundingClientRect(); return { text: p.textContent, in: r.top > box.top && r.bottom < box.bottom, op: Number(p.style.opacity) }; }); check(last.text === 'Thanks for playing' && last.in && last.op > 0.9, `the roll ends on "${last.text}", which stops in view and holds`); }
      if (pt === 'still') await p2.evaluate(() => window.__rhrFinale.release());
    }
    await c2.close();
  }

  // ---------- 2. Earned for real ----------
  if (!ONLY || ONLY === 'earned') {
    console.log(`\nwebkit ${W} x ${H}: a save one par short`);
    const short = levels[0]; // Cardium 1, a move over par
    const best = Object.fromEntries(levels.map((l) => [l.id, l.par + (l === short ? 1 : 0)]));
    const progress = (extra = {}) => JSON.stringify({ best, hints: 5, perfect: levels.filter((l) => l !== short).map((l) => l.id), dailyCleared: [], demo: false, announced: REGIONS.map((r) => r.id), standDowns: [], ...extra });
    const log = (found) => JSON.stringify({ v: 3, found, camo: true, camoEarned: true });
    const all = LOG_ENTRIES.map((e) => e.id);
    const open = async (p, l) => {
      const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true });
      await context.addInitScript(([p, l]) => { if (!localStorage.getItem('rush-hour-rigs:v2')) { localStorage.setItem('rush-hour-rigs:v2', p); localStorage.setItem('rush-hour-rigs:log', l); } }, [p, l]);
      const page = await context.newPage();
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${ROOT}?cover=0&night=0&bird=0&nap=0&soundnudge=0&magpie=0&worker=0&off=sam,landowner,biffya,biffyb,nearmiss,lunch,porcupine`, { waitUntil: 'networkidle' });
      return { context, page, errors };
    };
    const { context, page, errors } = await open(progress(), log(all));
    await page.waitForSelector('.screen.levels');
    check((await part(page)) === 'LIST' && !(await page.evaluate(() => localStorage.getItem('rush-hour-rigs:finale'))), 'one level a move over par: no ending, the level list as ever');
    await page.locator('.region-tab').nth(0).click();
    await page.locator('.level-btn').nth(0).click();
    await page.waitForSelector('.board .truck.sprite-on');
    await wait(500);
    let s = newGame(short);
    for (const m of solve(short)) {
      const r = tryMove(s, m.id, m.delta); s = r.state;
      await page.evaluate(async ([id, n, ms]) => { const el = document.querySelector(`.truck[data-id="${id}"]:not(.exiting)`), q = el.getBoundingClientRect(), h = el.classList.contains('horiz'), cell = parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')); let x = q.x + q.width / 2, y = q.y + q.height / 2; const ev = (t) => el.dispatchEvent(new PointerEvent(t, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: 1 })); ev('pointerdown'); for (let k = 0; k < 8; k++) { if (h) x += (n * cell) / 8; else y += (n * cell) / 8; ev('pointermove'); await new Promise((r) => setTimeout(r, 17)); } await new Promise((r) => setTimeout(r, 70)); ev('pointerup'); await new Promise((r) => setTimeout(r, ms)); }, [m.id, m.delta + (r.exited ? Math.sign(m.delta) * 0.4 : 0), r.exited ? 950 : 400]);
    }
    await page.waitForSelector('.win:not([hidden]) .card', { timeout: 8000 }).catch(() => {});
    await wait(600);
    const win = await page.evaluate(() => ({ card: document.querySelector('.win .card')?.innerText.replace(/\s+/g, ' ') ?? '', finale: !!document.querySelector('.screen.finale'), key: localStorage.getItem('rush-hour-rigs:finale') }));
    check(win.card.includes(`${short.par} moves · par ${short.par}`) && !win.finale && !win.key, `the last level cleared at par: its own win card first ("${win.card.slice(0, 50)}")`);
    await page.locator('.win .card [data-act="next"]').click();
    check(await waitPart(page, 'card', 4000), 'leaving the win card: the ending plays (the Perfect Game card)');
    await wait(400);
    const earned = await page.evaluate(() => ({ key: localStorage.getItem('rush-hour-rigs:finale'), pads: document.querySelector('.fin-pads')?.textContent.replace(/\s+/g, ' ').trim(), sightings: document.querySelector('.fin-sightings')?.textContent.replace(/\s+/g, ' ').trim(), best: JSON.parse(localStorage.getItem('rush-hour-rigs:v2')).best.c01 }));
    check(earned.key === '{"v":1,"seen":true}' && earned.best === short.par && earned.pads?.endsWith(`${levels.length} of ${levels.length}`) && earned.sightings?.endsWith(`${LOG_ENTRIES.length} of ${LOG_ENTRIES.length}`), `it is remembered under its own key (${earned.key}); the card counts ${earned.pads} and ${earned.sightings}`);
    // It plays once: leave it, and the list is the list.
    await page.locator('.hud [data-act="levels"]').click();
    await page.waitForSelector('.screen.levels', { timeout: 4000 }).catch(() => {});
    await wait(300);
    check((await part(page)) === 'LIST', 'it plays once: back at the level list, and the list stays');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.screen.levels');
    check((await part(page)) === 'LIST', 'and not again on the next visit');
    // Settings: Watch the ending, under Credits.
    await page.locator('.gear').click();
    await page.waitForSelector('.settings');
    await wait(500);
    const row = await page.evaluate(() => { const bs = [...document.querySelectorAll('.settings .ask > *, .settings .step:not([hidden]) > *')], i = bs.findIndex((b) => b.textContent.trim() === 'Credits'), w = bs.find((b) => b.textContent.trim() === 'Watch the ending'); const r = w?.getBoundingClientRect(), panel = document.querySelector('.settings .ask, .settings .step:not([hidden])').getBoundingClientRect(); return { after: !!w && bs[i + 1] === w, h: r ? Math.round(r.height) : 0, in: !!r && r.bottom <= innerHeight && r.top >= 0, version: (() => { const v = document.querySelector('.app-version').getBoundingClientRect(); return v.bottom <= innerHeight + 1; })() }; });
    check(row.after && row.h >= 44 && row.in && (H < 844 || row.version), `Settings offers "Watch the ending", right under Credits (${row.h} px tall)`);
    await page.locator('.settings [data-act="ending"]').click();
    check(await waitPart(page, 'card', 4000), 'and it plays the ending again');
    check(errors.length === 0, `no errors${errors.length ? ': ' + errors[0] : ''}`);
    await context.close();
    // Not earned: a sighting short; demo mode; and a fresh player sees no such button.
    for (const [name, p, l] of [['every level at par, one sighting short', JSON.stringify({ ...JSON.parse(progress()), best: Object.fromEntries(levels.map((x) => [x.id, x.par])) }), log(all.filter((id) => id !== 'bear'))], ['a perfect save with demo mode on', JSON.stringify({ ...JSON.parse(progress({ demo: true })), best: Object.fromEntries(levels.map((x) => [x.id, x.par])) }), log(all)]]) {
      const o = await open(p, l);
      await o.page.waitForSelector('.screen.levels', { timeout: 5000 }).catch(() => {});
      await wait(300);
      const st = await o.page.evaluate(() => ({ list: !!document.querySelector('.screen.levels'), finale: !!document.querySelector('.screen.finale'), key: localStorage.getItem('rush-hour-rigs:finale') }));
      await o.page.locator('.gear').click();
      await o.page.waitForSelector('.settings');
      const btn = await o.page.locator('.settings [data-act="ending"]').count();
      check(st.list && !st.finale && !st.key && btn === 0, `${name}: no ending, and no "Watch the ending" in Settings`);
      await o.context.close();
    }
  }
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
