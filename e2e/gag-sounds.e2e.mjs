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
import { GAG_SOUNDS, gagKeys, finaleKeys, parseCue } from '../src/audio/gag-sounds.ts';
import { CORE_KEYS, LAZY_KEYS, finaleTrack } from '../src/audio/pack.ts';
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
/** Baldonnel's seven, and the nine files made for them and the finale (job U10). */
const BALD = ['overweight', 'cranes', 'bison', 'hare', 'ice', 'frogs', 'mosquito'];
const NINE = ['crane_call', 'frog_chorus', 'frog_late', 'bison_snort', 'chuckle', 'timer_beep', 'scrub', 'creak', 'polaroid'];
const FINALE_KEYS = finaleKeys();
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
const unlock = (page) => page.evaluate(() => { for (const type of ['pointerdown', 'pointerup']) (document.querySelector('.hud') ?? document.body).dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 9, pointerType: 'touch', clientX: 4, clientY: 4 })); });

console.log('webkit 390x844 @3x, Sound effects on: every gag, one whole run');
const names = Object.keys(PREVIEWS).filter((n) => !process.env.ONLY || process.env.ONLY === n || (process.env.ONLY === 'baldonnel' && BALD.includes(n)));
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
  // ---- Baldonnel's seven (job U10): each cue on the moment the page draws its sound word; whatever ran on has stopped ----
  const count = (n) => run.heard.filter((h) => h.n === n).length;
  if (name === 'overweight') check(near(after('the-needle-swings', 'clack'), 0) && near(after('takes-off-his', 'knock'), 0.4) && near(after('kicks-off-one', 'knock'), 0.4) && near(after('kicks-off-one', 'knock', 1), 0.8) && near(after('ding-green-light', 'twinkle'), 0.08) && count('magpie') === 1, `overweight: CLANK on the scale (${after('the-needle-swings', 'clack').toFixed(2)} s), the hat's thud ${after('takes-off-his', 'knock').toFixed(2)} s into its beat, a clonk a boot (${after('kicks-off-one', 'knock').toFixed(2)}, ${after('kicks-off-one', 'knock', 1).toFixed(2)} s), the ding with the green light, the magpie's call once`);
  if (name === 'cranes') check(near(after('a-rattling-call', 'crane_call'), 0.1) && near(after('the-dance-leaps', 'crane_call'), 0) && count('crane_call') === 2 && near(after('a-grey-feather', 'twinkle'), 0), `cranes: the call as they glide in (${after('a-rattling-call', 'crane_call').toFixed(2)} s, "garooo") and as the dance starts (${after('the-dance-leaps', 'crane_call').toFixed(2)} s, "garoo"); the feather's twinkle`);
  if (name === 'bison') check(near(after('beep-beep', 'horn'), 0) && near(after('beep-beep', 'horn', 1), 0.28) && near(after('the-bison-yawns', 'bison_snort'), 0.1) && count('bison_snort') === 2 && near(after('claps-clap-clap', 'slap'), 0.08) && near(after('backs-up-the', 'reverse'), 0) && near(after('and-giggles-heh', 'chuckle'), 0) && count('clack') === 2, `bison: BEEP BEEP (the horn at ${after('beep-beep', 'horn').toFixed(2)} and ${after('beep-beep', 'horn', 1).toFixed(2)} s), the snort for the yawn (${after('the-bison-yawns', 'bison_snort').toFixed(2)} s), two claps, a clunk out and in, the backup beeper on its beat, "heh heh heh" on its beat (${after('and-giggles-heh', 'chuckle').toFixed(2)} s)`);
  if (name === 'hare') check(count('step') >= 2 && near(after('hides-against-the', 'rustle'), 0) && count('rustle') === 4 && heardNames.has('hare:steps') && near(after('the-hare-reappears', 'twinkle'), 0), `hare: two far footsteps, a rustle each time he hides or hops (${count('rustle')}), the steps close by, a twinkle when he reappears`);
  if (name === 'ice') check(near(after('the-pan-bumps', 'knock'), 0) && near(after('the-bobber-dips', 'blup'), 0) && near(after('sits-back-down', 'splash'), 0.05) && near(after('chomp-gone', 'chomp'), 0) && near(after('and-back-down', 'splash'), 0.02) && count('splash') === 2, `ice: bump, plunk, SPLASH as he sits down (${after('sits-back-down', 'splash').toFixed(2)} s into its beat), CHOMP on its beat (${after('chomp-gone', 'chomp').toFixed(2)} s), SPLASH as the pike goes back down`);
  if (name === 'frogs') {
    const sing = run.beats.find((b) => b.beat === 'they-sing-in'), hush = run.beats.find((b) => b.beat === 'silence-three-frogs');
    check(count('blup') === 6 && near(after('they-sing-in', 'frog_chorus'), 0) && sing && hush && sing.t + 2.53 < hush.t && near(after('the-little-one', 'frog_late'), 0) && count('frog_late') === 1, `frogs: three blups up and three down, the chorus on the round (${after('they-sing-in', 'frog_chorus').toFixed(2)} s; it is over ${(hush.t - sing.t - 2.53).toFixed(2)} s before the silence), the one late CREEK on its beat (${after('the-little-one', 'frog_late').toFixed(2)} s)`);
  }
  if (name === 'mosquito') check(near(after('bzzz-a-big', 'mosquito:mosquito'), 0), `mosquito: BZZZ from the moment it flies in (${after('bzzz-a-big', 'mosquito:mosquito').toFixed(2)} s into its beat)`);
  if (BALD.includes(name)) {
    await wait(400);
    const still = await page.evaluate((id) => ['steps', 'mosquito'].filter((n) => window.__rhrAudio.repeatRunning(`${id}:${n}`) || window.__rhrAudio.loopRunning(`${id}:${n}`)), id);
    const lazy = keys.filter((k) => LAZY_KEYS.includes(k)), early = lazy.filter((k) => !fetched.includes(k));
    check(still.length === 0, `${name}: whatever ran on (steps, the buzz) has stopped when it ends${still.length ? ': ' + still.join(', ') : ''}`);
    check(early.length === 0, `${name}: its lazy sounds were fetched by its own level (${lazy.join(', ') || 'none'})`);
  }
  await context.close();
}

// ---------- THE FINALE (job U10): earned, replayed from Settings (the tap that starts it lets sound out), Sound effects and Music on ----------
if (!process.env.ONLY || process.env.ONLY === 'finale') {
  console.log('\nwebkit: the finale with sound and music on');
  const context = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const fetched = [];
  page.on('request', (r) => { const m = r.url().match(/\/audio\/(sfx\/[^?]+)\.mp3/); if (m && !r.url().includes('/src/')) fetched.push(m[1].slice(4)); });
  await context.addInitScript(([p, a]) => { localStorage.setItem('rush-hour-rigs:v2', p); localStorage.setItem('rush-hour-rigs-audio', a); localStorage.setItem('rush-hour-rigs:finale', '{"v":1,"seen":true}'); }, [UNLOCKED, JSON.stringify({ sfx: true, music: true, style: 'retro' })]);
  await page.goto(BASE + '?audiolog&cover=0', { waitUntil: 'networkidle' });
  await page.locator('.gear').click();
  await page.waitForSelector('.settings');
  await wait(1500);
  const before = fetched.filter((f) => NINE.includes(f));
  await page.evaluate(() => { window.__rhrAudio.log.length = 0; });
  // Everything heard from here on, with the part and the part's own time it was heard at.
  await page.evaluate(() => {
    const a = window.__rhrAudio; let seen = 0, part = null, t0 = 0;
    window.__fin = { heard: [], peak: 0, parts: [], scrub: [], steps: [], music: {}, beats: [], beat: null };
    const tick = () => {
      const s = document.querySelector('.screen.finale'), now = performance.now();
      const p = s?.dataset.part ?? (document.querySelector('#app > .screen.cover') ? 'cover' : null);
      if (p !== part) { part = p; t0 = now; window.__fin.parts.push(p); }
      const b = s?.dataset.beat; if (b && b !== window.__fin.beat) { window.__fin.beat = b; window.__fin.beats.push({ beat: b, part, t: (now - t0) / 1000 }); }
      while (seen < a.log.length) { const n = a.log[seen++]; if (!n.startsWith('loaded:')) window.__fin.heard.push({ n, part, t: (now - t0) / 1000 }); }
      window.__fin.peak = Math.max(window.__fin.peak, a.peak());
      const on = a.loopRunning('finale:scrub'), last = window.__fin.scrub.at(-1);
      if (!last || last.on !== on) window.__fin.scrub.push({ on, part, t: (now - t0) / 1000 });
      const st = a.repeatRunning('finale:steps'), lastS = window.__fin.steps.at(-1);
      if (!lastS || lastS.on !== st) window.__fin.steps.push({ on: st, part, t: (now - t0) / 1000 });
      if (part) { const k = a.musicState()?.key ?? null, seen = (window.__fin.music[part] ??= []); if (seen.at(-1) !== k) seen.push(k); }
      requestAnimationFrame(tick);
    };
    tick();
  });
  await page.locator('.settings [data-act="ending"]').click();
  await page.waitForSelector('.finale-card [data-act="photo"]');
  await wait(3800);
  const cardPeak = await page.evaluate(() => window.__fin.peak);
  await page.locator('.finale-card [data-act="photo"]').click();
  await page.waitForFunction(() => document.querySelector('.screen.finale')?.dataset.part === 'credits', null, { timeout: 20000 });
  await wait(2500);
  const mid = await page.evaluate(() => ({ music: window.__rhrAudio.musicState()?.key ?? null }));
  await page.mouse.click(195, 330); // a tap skips the credits
  await page.waitForFunction(() => !!document.querySelector('#app > .screen.cover'), null, { timeout: 30000 });
  await wait(1200);
  const fin = await page.evaluate(() => ({ ...window.__fin, scrubNow: window.__rhrAudio.loopRunning('finale:scrub'), musicNow: window.__rhrAudio.musicState()?.key ?? null, ctx: window.__rhrAudio.ctx?.state }));
  const at = (part, n) => fin.heard.filter((h) => h.part === part && h.n === n).map((h) => +h.t.toFixed(2));
  const near = (v, want, tol = 0.16) => Math.abs(v - want) <= tol;
  const each = (got, want, tol) => got.length === want.length && got.every((v, i) => near(v, want[i], tol));
  check(before.length === 0, `on the menus and in Settings, none of the finale's own sounds is fetched (${before.join(', ') || 'none'})`);
  check(FINALE_KEYS.filter((k) => LAZY_KEYS.includes(k)).every((k) => fetched.includes(k)) && errors.length === 0, `the finale fetches its own as it starts (${[...new Set(fetched.filter((f) => NINE.includes(f)))].join(', ')})${errors.length ? ' ERR ' + errors[0] : ''}`);
  check(fin.parts.filter(Boolean).join(' > ') === 'card > photo > credits > still > cover', `all its parts play (${fin.parts.filter(Boolean).join(' > ')})`);
  const pops = at('card', 'tap').concat(at('card', 'hat')), tada = at('card', 'tada');
  check(each(pops, [0.9, 1.15, 1.4], 0.2) && tada.length === 1 && near(tada[0], 1.7, 0.2), `the card: the win's own sounds, a pop a hard hat as it pops in (${pops.join(', ')} s) and the ta-da (${tada.join()} s)`);
  const beeps = at('photo', 'timer_beep'), slow = beeps.filter((t) => t < 4.9), fast = beeps.filter((t) => t >= 4.9);
  check(each(slow, [1.65, 2.25, 2.85, 3.45, 4.05, 4.65]) && each(fast, [5.0, 5.18, 5.36, 5.54, 5.72]), `the self-timer: slow (${slow.join(', ')} s), then fast (${fast.join(', ')} s), until the snap`);
  const run1 = fin.heard.filter((h) => h.part === 'photo' && h.n === 'finale:steps').map((h) => +h.t.toFixed(2)), stepsNow = fin.steps.filter((x) => x.part === 'photo');
  check(run1.length >= 4 && run1.length <= 6 && near(run1[0], 1.9) && Math.max(...run1) < 3.2 && stepsNow.some((x) => !x.on && x.t > 2.9 && x.t < 3.5), `Moe's footsteps from the camera to his spot, until his hop-turn (${run1.join(', ')} s; stopped by ${stepsNow.filter((x) => !x.on && x.t > 1).map((x) => x.t.toFixed(2)).join()} s)`);
  const cam = at('photo', 'camera'), splat = at('photo', 'splat'), pol = at('photo', 'polaroid'), heh = at('photo', 'chuckle');
  // (The flash is a heavy frame at DPR 3: the picture itself can run a frame or two late there, and the sound goes with the picture. Held to its own beat.)
  const camBeat = fin.beats.find((x) => x.part === 'photo' && x.beat === 'splat-flash-at');
  check(cam.length === 1 && near(cam[0], 5.86, 0.3) && camBeat && Math.abs(cam[0] - camBeat.t) < 0.06 && splat.length === 1 && Math.abs(splat[0] - cam[0]) < 0.03, `the camera on the flash (${cam.join()} s) and the splat with it (${splat.join()} s)`);
  // (The flash and the photo are heavy frames at DPR 3: the picture itself runs a frame or two late there, and the sound goes with the picture. Held to their own beats.)
  const onBeat = (part, beat, n) => { const b = fin.beats.find((x) => x.part === part && x.beat === beat), h = fin.heard.find((x) => x.part === part && x.n === n && b && x.t >= b.t - 0.02); return b && h ? h.t - b.t : NaN; };
  check(pol.length === 1 && near(pol[0], 6.05, 0.3) && near(onBeat('photo', 'the-photo-drops', 'polaroid'), 0, 0.06) && heh.length === 1 && near(heh[0], 6.15, 0.3) && near(onBeat('photo', 'heh-heh-the', 'chuckle'), 0, 0.06) && near(onBeat('photo', 'splat-flash-at', 'camera'), 0, 0.06), `the Polaroid's whirr as the photo drops (${pol.join()} s); the magpie's chuckle (${heh.join()} s)`);
  // (The graduation music once it is in the pack, `finale_credits`; until then the menu loop of the player's style. It fades out as the credits lift and Still Here is quiet; with no track yet the menu loop plays on.)
  const TRACK = finaleTrack();
  check(mid.music === (TRACK ?? 'retro_menu') && fin.music.credits.includes(TRACK ?? 'retro_menu'), `under the credits: ${TRACK ? 'the graduation music' : "the menu loop of the player's own style (no graduation music in the pack yet)"} (${mid.music})`);
  check(TRACK ? fin.music.still.join() === '' && fin.music.credits.at(-1) === null : fin.music.still.join() === 'retro_menu', `as the credits lift: ${TRACK ? 'it fades out, and Still Here is quiet' : 'the menu loop plays on'} (${fin.music.credits.map(String).join(' > ')}; then ${fin.music.still.map(String).join(' > ')})`);
  check(fin.heard.filter((h) => h.part === 'credits' && !h.n.startsWith('music:')).length === 0, 'the credits have no effects of their own');
  const creak = at('still', 'creak'), scrub = fin.scrub.filter((x) => x.part === 'still');
  const ons = scrub.filter((x) => x.on).map((x) => +x.t.toFixed(2)), offs = scrub.filter((x) => !x.on && x.t > 1).map((x) => +x.t.toFixed(2));
  check(each(creak, [2.2, 9.6]), `Still Here: the creak as the door opens and as it shuts (${creak.join(', ')} s)`);
  check(each(ons, [2.95, 8.9], 0.2) && each(offs, [4.2, 10.2], 0.3), `the scrub loops while he brushes (on at ${ons.join(', ')} s, off at ${offs.join(', ')} s)`);
  check(!fin.scrubNow && fin.musicNow === 'retro_menu', `at the cover nothing of the finale is left running; the menu's music plays on (${fin.musicNow})`);
  check(fin.ctx === 'running' && cardPeak > 0.02 && fin.peak > 0.05 && fin.peak < 0.98, `sound really goes out and nothing clips (loudest sample ${fin.peak.toFixed(2)} of 1)`);
  await context.close();

  // Left in the middle of the brushing: the loop stops with it.
  const c3 = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, hasTouch: true });
  await c3.addInitScript(([p, a]) => { localStorage.setItem('rush-hour-rigs:v2', p); localStorage.setItem('rush-hour-rigs-audio', a); localStorage.setItem('rush-hour-rigs:finale', '{"v":1,"seen":true}'); }, [UNLOCKED, ON]);
  const p3 = await c3.newPage();
  await p3.goto(BASE + '?audiolog&cover=0', { waitUntil: 'networkidle' });
  await p3.locator('.gear').click();
  await p3.waitForSelector('.settings');
  await wait(600);
  await p3.locator('.settings [data-act="ending"]').click();
  await p3.waitForSelector('.finale-card [data-act="photo"]');
  await wait(600);
  await p3.locator('.hud [data-act="levels"]').click();
  await p3.waitForSelector('.screen.levels');
  await p3.evaluate(() => { window.__rhrAudio.log.length = 0; });
  await wait(1800);
  const left = await p3.evaluate(() => window.__rhrAudio.log.filter((n) => !n.startsWith('loaded:')));
  check(left.filter((n) => n === 'tap' || n === 'tada').length === 0, `left by "Levels" before the hard hats popped: none of the card's sounds follows the player out (${left.join(', ') || 'silence'})`);
  await c3.close();

  // Sound off (the default): the whole finale in silence, and not a file fetched.
  const c4 = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, hasTouch: true });
  const p4 = await c4.newPage();
  const f4 = []; p4.on('request', (r) => { if (/\/audio\//.test(r.url()) && !r.url().includes('/src/')) f4.push(r.url().split('/audio/')[1]); });
  await p4.goto(BASE + '?audiolog&finale=1', { waitUntil: 'networkidle' });
  await p4.mouse.click(8, 8);
  await p4.waitForSelector('.finale-card [data-act="photo"]');
  await wait(3600);
  await p4.locator('.finale-card [data-act="photo"]').click();
  await p4.waitForFunction(() => document.querySelector('.screen.finale')?.dataset.part === 'credits', null, { timeout: 20000 });
  await wait(600);
  await p4.mouse.click(195, 330);
  await p4.waitForFunction(() => !!document.querySelector('#app > .screen.cover'), null, { timeout: 30000 });
  const off = await p4.evaluate(() => ({ log: window.__rhrAudio.log.filter((n) => n !== 'unlock'), peak: window.__rhrAudio.peak(), music: window.__rhrAudio.musicState() }));
  check(f4.length === 0 && off.log.length === 0 && !off.music && !(off.peak > 0), `sound off (the default): the whole finale plays in silence, no cue, no music, nothing fetched (${f4.length} files; log ${off.log.slice(0, 6).join(', ') || 'empty'}; peak ${off.peak}; music ${JSON.stringify(off.music)})`);
  await c4.close();
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
  const had = new Set();
  for (const [tab, region, gags] of [[3, 'Mannville', ['muskeg', 'catTrain', 'beaver', 'aurora']], [4, 'Bakken', ['tumbleweed', 'pdogs', 'bale', 'cloud']]]) {
    await page.locator('.hud [data-act="levels"]').click();
    await page.locator('.region-tab').nth(tab).click();
    fetched.length = 0;
    await page.locator('.level-btn').nth(2).click();
    await page.waitForSelector('.board .truck');
    await wait(1500);
    // (A sound an earlier level already fetched is in hand: it is not asked for twice. The mother cat's sigh is the rancher's too.)
    const want = [...new Set(gags.flatMap(gagKeys).filter((k) => LAZY_KEYS.includes(k) && !had.has(k)))].sort();
    const got = [...new Set(fetched.filter((f) => LAZY_KEYS.includes(f)))].sort();
    got.forEach((k) => had.add(k));
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
