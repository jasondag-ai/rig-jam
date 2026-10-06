// The sound pass, checked by ear's stand-in: EVERY gag (all 26) played through its `?gag=` preview
// with Sound effects ON, in WebKit at iPhone size and DPR 3.
//  - nothing silent: the gag's cues fire, their files are loaded, and sound really goes out (a
//    meter on the output, after the compressor: audio/engine.ts `peak`)
//  - nothing clipped: what goes out never reaches full scale
//  - each new cue on its beat (the BONKs, the squeaks along the wave, the downpour, the howl)
//  - the sounds only wave 3 uses are fetched by the levels that play them, and not before
//  - nothing of the old dingle, win or gate is asked for
// Needs a running dev server (or URL=…). `ONLY=beaver` runs one gag.
import { webkit } from 'playwright';
import { GAG_SOUNDS, gagKeys, parseCue } from '../src/audio/gag-sounds.ts';
import { CORE_KEYS, LAZY_KEYS } from '../src/audio/pack.ts';
import { PREVIEWS } from '../src/ui/gag-triggers.ts';
import { UNLOCKED } from './progress.mjs';

const BASE = process.env.URL ?? 'http://localhost:5173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${text}`);
};
const ON = JSON.stringify({ sfx: true, music: false, style: 'country' });
const OLD = ['rattle', 'win', 'gate', 'exit'];
const browser = await webkit.launch();

async function open(query) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const fetched = [];
  page.on('request', (r) => { const m = r.url().match(/\/audio\/(sfx\/[^?]+)\.mp3/); if (m && !r.url().includes('/src/')) fetched.push(m[1].slice(4)); });
  await page.goto(BASE + query, { waitUntil: 'networkidle' });
  await page.evaluate(([p, a]) => { localStorage.clear(); localStorage.setItem('rush-hour-rigs:v2', p); localStorage.setItem('rush-hour-rigs-audio', a); }, [UNLOCKED, ON]);
  fetched.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  return { context, page, fetched, errors };
}
/** The first tap (sound may only start after one): on the sky, where there is no button and no gag's trigger... except the cloud's, which needs three. */
const unlock = (page) => page.evaluate(() => { for (const type of ['pointerdown', 'pointerup']) document.querySelector('.hud').dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 9, pointerType: 'touch', clientX: 4, clientY: 4 })); });

console.log('webkit 390x844 @3x, Sound effects on: every gag, one whole run');
const names = Object.keys(PREVIEWS).filter((n) => !process.env.ONLY || process.env.ONLY === n);
for (const name of names) {
  const id = PREVIEWS[name].gag;
  const { context, page, fetched, errors } = await open(`?audiolog&cover=0&gag=${name}${name === 'aurora' ? '' : '&night=0'}`);
  await page.waitForSelector('.board .truck');
  await unlock(page);
  const keys = gagKeys(id);
  // Its own sounds are in: the game's set, and what this level's gags asked for.
  const ready = await page.waitForFunction((ks) => ks.every((k) => window.__rhrAudio.log.includes(`loaded:sfx/${k}.mp3`)), keys, { timeout: 20000 }).then(() => true, () => false);
  // One whole run, listened to from its first beat: the cues as they fire, and the loudest sample that goes out.
  const run = await page.evaluate(async ([id, maxMs]) => {
    const a = window.__rhrAudio;
    const layerOf = () => document.querySelector(`[data-gag="${id}"], .magpie-layer, .worker-layer, .moose-layer`) ?? [...document.querySelectorAll('.puppet-layer[data-beat], .strip-layer[data-beat]')].at(-1) ?? null;
    const beatNow = () => [...document.querySelectorAll('[data-beat]')].map((e) => e.dataset.beat).filter(Boolean).at(-1) ?? null;
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    // Wait for a run to end, then for the next to begin.
    const t0 = performance.now();
    while (beatNow() && performance.now() - t0 < maxMs) await frame();
    // (Listening from the gap between two runs, so the first beat's own cues are heard.)
    a.log.length = 0;
    while (!beatNow() && performance.now() - t0 < maxMs * 2) await frame();
    const start = performance.now();
    const beats = [], heard = [];
    let peak = 0, last = null, seen = 0, quiet = 0;
    while (performance.now() - start < maxMs) {
      const b = beatNow();
      if (b !== last && b) beats.push({ beat: b, t: (performance.now() - start) / 1000 });
      last = b;
      while (seen < a.log.length) { const n = a.log[seen++]; if (!n.startsWith('loaded:')) heard.push({ n, t: (performance.now() - start) / 1000 }); }
      peak = Math.max(peak, a.peak());
      if (!b && beats.length) { if (++quiet > 20) break; } else quiet = 0;
      await frame();
    }
    void layerOf;
    return { beats, heard, peak, secs: (performance.now() - start) / 1000, ctx: a.ctx?.state };
  }, [id, 26000]);
  const cueNames = [...new Set(Object.values(GAG_SOUNDS[id]).flat().map((c) => { const q = parseCue(c); return q.op === 'play' ? q.name : `${id}:${q.name}`; }))];
  const heardNames = new Set(run.heard.map((h) => h.n));
  const beatsWithSound = Object.keys(GAG_SOUNDS[id]).filter((b) => run.beats.some((x) => x.beat === b));
  const got = cueNames.filter((n) => heardNames.has(n));
  // (The magpie's squawk, splat and radio follow the player, and a few beats belong to a cancel or a startle: most of the table must be heard.)
  const enough = got.length >= Math.max(1, Math.ceil(cueNames.length * 0.6));
  const old = [...heardNames].filter((n) => OLD.includes(n)).concat(fetched.filter((f) => OLD.includes(f)));
  check(ready && errors.length === 0, `${name}: its sounds are loaded (${keys.join(', ')})${errors.length ? ' ERR ' + errors[0] : ''}`);
  check(run.beats.length >= 3 && enough && run.heard.length > 0, `${name}: plays ${run.secs.toFixed(1)} s over ${run.beats.length} beats and ${run.heard.length} cues fire (${got.length} of its ${cueNames.length} sounds: ${got.join(', ')})${enough ? '' : ' MISSING ' + cueNames.filter((n) => !heardNames.has(n)).join(', ')}`);
  check(run.ctx === 'running' && run.peak > 0.02 && run.peak < 0.98, `${name}: sound really goes out and nothing clips (loudest sample ${run.peak.toFixed(2)} of 1)`);
  check(old.length === 0, `${name}: nothing of the old dingle, win or gate`);

  // Each new cue on its beat: how long after its beat began it was heard.
  const after = (beat, cue, nth = 0) => { const b = run.beats.find((x) => x.beat === beat), h = run.heard.filter((x) => x.n === cue && b && x.t >= b.t - 0.02)[nth]; return b && h ? h.t - b.t : NaN; };
  const near = (v, want, tol = 0.14) => Math.abs(v - want) <= tol;
  if (name === 'beaver') {
    const a1 = after('bonk', 'bonk'), a2 = after('bonk-again', 'bonk'), s1 = after('proud', 'tailslap'), s2 = after('proud', 'tailslap', 1);
    check(near(a1, 0) && near(a2, 0.3) && near(s1, 0.12) && near(s2, 0.36), `beaver: BONK on the first hit (${a1.toFixed(2)} s into its beat) and on the second (${a2.toFixed(2)} s, after the charge); the tail slaps at ${s1.toFixed(2)} and ${s2.toFixed(2)} s into "proud"`);
    check(heardNames.has('beaver:pats'), 'beaver: his pats run while he waddles');
  }
  if (name === 'pdogs') {
    const w = run.heard.filter((h) => h.n === 'squeak'), wave = run.beats.find((b) => b.beat === 'wave'), inWave = w.filter((h) => wave && h.t >= wave.t - 0.02 && h.t < wave.t + 1.4);
    const gaps = inWave.slice(1).map((h, i) => h.t - inWave[i].t);
    check(inWave.length === 5 && gaps.every((g) => g > 0.1 && g < 0.45), `prairie dogs: five squeaks along the wave, one a dog (${gaps.map((g) => g.toFixed(2)).join(', ')} s apart)`);
    check(near(after('late', 'aww'), 0.15), `prairie dogs: the sad "aw-ww" comes with the late one (${after('late', 'aww').toFixed(2)} s into his beat)`);
  }
  if (name === 'cloud') {
    const d = after('downpour', 'cloud:downpour'), u = after('umbrella', 'umbrella'), closes = run.beats.find((b) => b.beat === 'closes-it'), pour = run.heard.find((h) => h.n === 'cloud:downpour');
    check(near(d, 0) && pour && closes && pour.t > closes.t, `cloud: the downpour starts on its beat (${d.toFixed(2)} s), after he closes the umbrella; the umbrella pops ${u.toFixed(2)} s into its beat`);
    const still = await page.evaluate(() => ['cloud:rain', 'cloud:downpour', 'cloud:steps'].filter((n) => window.__rhrAudio.repeatRunning(n)));
    check(still.length === 0, 'cloud: the rain, the downpour and his steps have stopped when it ends');
  }
  if (name === 'aurora') check(near(after('howls', 'howl'), 0) && near(after('lights', 'shimmer'), 0, 0.3), `aurora: the shimmer with the lights, the howl on its beat (${after('howls', 'howl').toFixed(2)} s)`);
  if (name === 'muskeg') check(near(after('shluck', 'shluck'), 0) && near(after('blup', 'blup'), 0) && heardNames.has('muskeg:squelch'), `muskeg: squelches in the puddle, SHLUCK on its beat (${after('shluck', 'shluck').toFixed(2)} s), blup on the last bubble`);
  if (name === 'cattrain') check(near(after('yawn', 'yawn'), 0.05) && run.heard.filter((h) => h.n === 'mew').length >= 3, `cat train: mews along the train, the yawn as the kitten's mouth opens (${after('yawn', 'yawn').toFixed(2)} s)`);
  if (name === 'tumbleweed') check(near(after('bounces-in', 'whistle'), 0, 0.3) && heardNames.has('tumbleweed:rustle'), 'tumbleweed: the wind whistles it in and the rustle runs while it rolls');
  if (name === 'bale') check(heardNames.has('bale:rumble') && near(after('sigh', 'sigh'), 0.05), `bale: the rumble while it rolls, his sigh on its beat (${after('sigh', 'sigh').toFixed(2)} s)`);
  if (name === 'deer') check(run.heard.filter((h) => h.n === 'knock').length === 4, `deer: the sign's wooden knock-and-wobble four times (${run.heard.filter((h) => h.n === 'knock').length})`);
  if (name === 'bear') check(near(after('relief', 'splat'), 0), `bear: his business lands with the magpie's dropping sound (${after('relief', 'splat').toFixed(2)} s into "relief")`);
  await context.close();
}

if (!process.env.ONLY) {
  console.log('\nwebkit: the wave 3 sounds are fetched by the levels that play them, and not before');
  const { context, page, fetched } = await open('?audiolog&cover=0&night=0');
  await unlock(page);
  await page.waitForFunction((n) => window.__rhrAudio.log.filter((x) => x.startsWith('loaded:sfx/')).length >= n, CORE_KEYS.length, { timeout: 20000 });
  await page.locator('.region-tab').nth(0).click();
  await page.locator('.level-btn').nth(2).click();
  await page.waitForSelector('.board .truck');
  await wait(800);
  const early = fetched.filter((f) => LAZY_KEYS.includes(f));
  check([...new Set(fetched)].length === CORE_KEYS.length && early.length === 0, `on the menus and a Cardium level: the game's ${CORE_KEYS.length} sounds, none of the ${LAZY_KEYS.length} that only wave 3 uses`);
  for (const [tab, region, gags] of [[3, 'Mannville', ['muskeg', 'catTrain', 'beaver', 'aurora']], [4, 'Bakken', ['tumbleweed', 'pdogs', 'bale', 'cloud']]]) {
    await page.locator('.hud [data-act="levels"]').click();
    await page.locator('.region-tab').nth(tab).click();
    fetched.length = 0;
    await page.locator('.level-btn').nth(2).click();
    await page.waitForSelector('.board .truck');
    await wait(1500);
    const want = [...new Set(gags.flatMap(gagKeys).filter((k) => LAZY_KEYS.includes(k)))].sort();
    const got = [...new Set(fetched.filter((f) => LAZY_KEYS.includes(f)))].sort();
    check(got.join() === want.join(), `a ${region} level fetches its own gags' sounds as it opens (${got.length}: ${got.join(', ')})`);
  }
  const { context: c2, page: p2, fetched: f2 } = await (async () => { const o = await open('?audiolog&cover=0&night=0'); await o.page.evaluate(() => localStorage.setItem('rush-hour-rigs-audio', JSON.stringify({ sfx: false, music: false, style: 'country' }))); await o.page.reload({ waitUntil: 'networkidle' }); o.fetched.length = 0; return o; })();
  await unlock(p2);
  await p2.locator('.region-tab').nth(3).click();
  await p2.locator('.level-btn').nth(2).click();
  await p2.waitForSelector('.board .truck');
  await wait(800);
  check(f2.length === 0, 'sound off (the default): nothing at all is fetched, on a wave 3 level either');
  await c2.close();
  await context.close();
}
await browser.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nPASS');
process.exit(failures ? 1 : 0);
