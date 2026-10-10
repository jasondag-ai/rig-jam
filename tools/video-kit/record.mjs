// THE VIDEO KIT'S SESSIONS (job U11): each one plays the LIVE game for a clip or a set of stills and is kept whole in
// qc-out/video-kit/sessions/<name>/ (frames, sound, the moments marked). tools/video-kit/cut.mjs makes the files.
//   node tools/video-kit/record.mjs <session> [<session> ...]     (`all` = every one; `list` names them)
// Nothing here changes the game: it is the live site, opened with its own switches (`?demo=1` opens every region
// and saves nothing, `?gag=` plays a sighting, `?finale=1`), played with a finger, with its own sound switched on.
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { REGIONS } from '../../src/levels/regions.ts';
import daily from '../../src/levels/daily.json' with { type: 'json' };
import { parseLevel } from '../../src/engine/index.ts';
import { dayKey, padNumber } from '../../src/ui/daily.ts';
import { padSlot } from '../../src/ui/daily-pads.ts';
import { open, wait, watchBeats } from './recorder.mjs';
import { bestLine, drag, flick, play, tapOn, unlockSound } from './play.mjs';

export const LIVE = process.env.LIVE ?? 'https://jasondag-ai.github.io/rig-jam/';
export const OUT = resolve('qc-out/video-kit');
const dirOf = (name) => join(OUT, 'sessions', name);
/** Sightings left out of a clip that is about something else (their own clips show them). */
const QUIET = 'magpie=0&worker=0&moose=0&soundnudge=0&night=0&tourists=0&surveyor=0&off=nearmiss,landowner,biffya,biffyb,sam,geese,tumbleweed,cattrain,bale,bell,pea,mosquito,overweight,lunch';
const demo = (more = '') => `${LIVE}?demo=1&cover=0&${QUIET}${more ? '&' + more : ''}`;

/** From the level list (demo link): into level `li` of region `ri`. */
async function enter(s, ri, li) {
  await s.page.waitForSelector('.region-tab');
  await s.page.locator('.region-tab').nth(ri).tap();
  await wait(500);
  await s.page.locator('.level-btn').nth(li).tap();
  await s.page.waitForSelector('.board .truck.sprite-on');
  await wait(700);
}
/** The end of a session: the sound's place against the clock is measured (a beep of the recorder's, after every clip), and it is kept. */
async function done(s) {
  await wait(900);
  await s.calibrate();
  await s.close();
  console.log(`   ${s.frames.length} frames; sound ${s.audio ? `${s.audio.late.toFixed(0)} ms behind the clock (taken out)` : 'none'}; marks ${Object.keys(s.marks).join(', ')}`);
  return s;
}
/** A stretch of a level's best line as a clip: the moves before it are played quickly out of shot. `leave`: moves left unplayed at the end. */
async function solveClip(name, ri, li, { moves = 7, leave = 1, more = '', before = null, pace = 1 } = {}) {
  const s = await open(dirOf(name));
  await s.page.goto(demo(more), { waitUntil: 'networkidle' });
  await s.start();
  await enter(s, ri, li);
  await unlockSound(s);
  const line = bestLine(REGIONS[ri].levels[li]);
  const from = Math.max(0, line.length - leave - moves);
  await play(s, line.slice(0, from), { pace: 0.6 });
  await wait(900);
  s.mark('a');
  await wait(350);
  if (before) await before(s);
  await play(s, line.slice(from, line.length - leave), { pace });
  await wait(leave ? 450 : 0);
  s.mark('b');
  return { s, line };
}

const SESSIONS = {
  // The cover as the app opens, one tap, and level 1's two trucks driven out (a brand-new player goes straight into it).
  async cover() {
    const s = await open(dirOf('cover'));
    await s.start();
    await s.page.goto(`${LIVE}?cover=1`, { waitUntil: 'commit' });
    await s.page.waitForSelector('.screen.cover .cover-title');
    s.mark('cover');
    await wait(3000);
    s.mark('tap');
    await s.tap(216, 430);
    await s.page.waitForSelector('.board .truck.sprite-on');
    await wait(2000); // (the ghost finger shows the first move; the effects load)
    const line = bestLine(REGIONS[0].levels[0]);
    await play(s, line, { pace: 1.15 });
    await s.page.waitForSelector('.win:not([hidden]) .card');
    s.mark('card');
    await wait(2600);
    s.mark('end');
    return done(s);
  },
  async cardium() { return done((await solveClip('cardium', 0, 7, { moves: 7 })).s); },
  async montney() { return done((await solveClip('montney', 1, 6, { moves: 6 })).s); },
  async duvernay() { return done((await solveClip('duvernay', 2, 5, { moves: 6 })).s); },
  async bigpad() { return done((await solveClip('bigpad', 5, 3, { moves: 6, pace: 0.9 })).s); },
  // Baldonnel 1: the frac unit pushed at the road ban patch beside it (it cannot go; its driver says why), then the
  // pickup drives over the other patch and out, and the pad goes on.
  async baldonnel() {
    const level = REGIONS[6].levels[0], line = bestLine(level);
    const s = await open(dirOf('baldonnel'));
    await s.page.goto(demo(), { waitUntil: 'networkidle' });
    await s.start();
    await enter(s, 6, 0);
    await unlockSound(s);
    await play(s, line.slice(0, 5), { pace: 0.6 });
    await wait(900);
    s.mark('a');
    await wait(400);
    await drag(s, 'D', -1, { ms: 420, hold: 260, after: 1500 }); // the rig at the patch: a bump and its driver's line
    await play(s, line.slice(5, 10));
    await wait(450);
    s.mark('b');
    return done(s);
  },
  // Fling: quick flicks send trucks all the way out through their gates (the last moves of Cardium 6 are all drives out).
  async fling() {
    const level = REGIONS[0].levels[5], line = bestLine(level);
    const s = await open(dirOf('fling'));
    await s.page.goto(demo('fling=1'), { waitUntil: 'networkidle' });
    await s.start();
    await enter(s, 0, 5);
    await unlockSound(s);
    let from = line.length - 1; while (from > 0 && line[from - 1].exited) from--;
    from = Math.max(from, line.length - 5);
    console.log(`   fling: moves ${from}..${line.length - 2} of ${line.length}, all drives out: ${line.slice(from).map((m) => m.exited).join()}`);
    await play(s, line.slice(0, from), { pace: 0.6 });
    await wait(900);
    s.mark('a');
    await wait(450);
    for (const m of line.slice(from, line.length - 1)) await flick(s, m.id, Math.sign(m.delta), { after: 1050 });
    s.mark('b');
    return done(s);
  },
  // The last three moves of a level at par: the last truck out, hard-hat confetti, the win card and its three hard hats.
  async perfect() {
    const { s } = await solveClip('perfect', 0, 6, { moves: 3, leave: 0 });
    await s.page.waitForSelector('.win:not([hidden]) .card');
    s.mark('card');
    await wait(3400);
    s.mark('end');
    return done(s);
  },
  // The Daily Pad: today's pad cleared at par, the win card with the streak, Share.
  async daily() {
    const pad = padNumber(dayKey(new Date())), level = parseLevel(daily[padSlot(pad) - 1]), line = bestLine(level);
    const s = await open(dirOf('daily'), { permissions: ['clipboard-read', 'clipboard-write'] });
    await s.page.goto(demo(), { waitUntil: 'networkidle' });
    await s.start();
    await s.page.waitForSelector('.daily-btn');
    await unlockSound(s, { selector: '.brand h1' });
    // (Out of shot: the pad is opened from its button and its first moves played. In shot: the HUD names today's pad,
    // its last three trucks drive out, the win card comes with the streak sign, and Share is tapped.)
    await tapOn(s, '.daily-btn');
    await s.page.waitForSelector('.board .truck.sprite-on');
    await wait(700);
    await play(s, line.slice(0, -3), { pace: 0.6 });
    await wait(900);
    s.mark('a');
    await wait(500);
    await play(s, line.slice(-3), { pace: 0.9 });
    await s.page.waitForSelector('.win:not([hidden]) .card');
    s.mark('card');
    await wait(1250);
    await tapOn(s, '.win [data-act="share"]');
    await wait(1500);
    s.mark('b');
    console.log(`   Daily Pad #${pad}, par ${level.par}; the Share button reads "${await s.page.evaluate(() => document.querySelector('.win [data-act="share"]').textContent.trim())}"`);
    return done(s);
  },
  // Sunday Turnaround: its button, the 8 x 8 pad of the week, and its first moves.
  async turnaround() {
    const level = parseLevel(JSON.parse(readFileSync('public/turnaround/weeks-001-008.json', 'utf8'))[0]), line = bestLine(level);
    const s = await open(dirOf('turnaround'));
    await s.page.goto(demo(), { waitUntil: 'networkidle' });
    await s.start();
    await s.page.waitForSelector('.turn-btn');
    await unlockSound(s, { selector: '.brand h1' });
    console.log(`   the button reads "${await s.page.evaluate(() => document.querySelector('.turn-btn').innerText.replace(/\s+/g, ' '))}"; par ${level.par}`);
    s.mark('a');
    await wait(800);
    await tapOn(s, '.turn-btn');
    await s.page.waitForSelector('.board .truck.sprite-on');
    await wait(900);
    await play(s, line.slice(0, 5), { pace: 0.9 });
    await wait(500);
    s.mark('b');
    return done(s);
  },
  // All seven regions: the region bar swiped along, each tab tapped, the list wearing each region's season.
  async regions() {
    const s = await open(dirOf('regions'));
    await s.page.goto(demo(), { waitUntil: 'networkidle' });
    await s.start();
    await s.page.waitForSelector('.region-tab');
    await unlockSound(s, { selector: '.brand h1' });
    // (Out of shot: the bar is brought back to its start and Cardium chosen, as a player who swipes back would have it.)
    const track = '.regions-track';
    const swipe = async (dx, ms = 300) => {
      const bar = await s.page.evaluate((t) => { const r = document.querySelector(t).getBoundingClientRect(); return { y: r.top + r.height / 2, left: r.left, right: r.right }; }, track);
      const x0 = dx < 0 ? bar.right - 50 : bar.left + 50, path = [[x0, bar.y, 0]];
      for (let k = 1; k <= 12; k++) path.push([x0 + dx * (1 - (1 - k / 12) ** 2), bar.y, (ms * k) / 12]);
      path.push([x0 + dx, bar.y, ms + 50]);
      await s.touch(path);
      await wait(420);
    };
    for (let k = 0; k < 6; k++) await swipe(250);
    await s.page.locator('.region-tab').nth(0).tap();
    await wait(900);
    const tabW = await s.page.evaluate(() => document.querySelector('.region-tab').getBoundingClientRect().width);
    const inView = (i) => s.page.evaluate(([i, t]) => { const r = document.querySelectorAll('.region-tab')[i].getBoundingClientRect(), b = document.querySelector(t).getBoundingClientRect(); return r.left >= b.left - 2 && r.right <= b.right + 2 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, [i, track]);
    s.mark('a');
    await wait(700);
    for (let i = 1; i < REGIONS.length; i++) {
      let pt = await inView(i);
      for (let k = 0; !pt && k < 3; k++) { await swipe(-tabW * 0.95); pt = await inView(i); }
      if (!pt) throw new Error(`tab ${i} never came into view`);
      await s.tap(pt.x, pt.y);
      await wait(i === REGIONS.length - 1 ? 1200 : 640);
    }
    s.mark('b');
    console.log(`   ends on "${await s.page.evaluate(() => document.querySelector('.region-tab.active .rtext, .region-tab[aria-selected="true"] .rtext')?.textContent)}"`);
    return done(s);
  },
  // The Wildlife Log, dug right through the Earth: one long fast scroll to the far side, where the penguin and the seal are upside down.
  async dig() {
    const s = await open(dirOf('dig'));
    await s.page.goto(demo(), { waitUntil: 'networkidle' });
    await s.start();
    await s.page.waitForSelector('.brand .binoculars');
    await unlockSound(s, { selector: '.brand h1' });
    await wait(300);
    s.mark('a');
    await wait(300);
    await tapOn(s, '.brand .binoculars');
    await s.page.waitForSelector('.log-card');
    await wait(650);
    const far = await s.page.evaluate(() => { const el = [document.scrollingElement, ...document.querySelectorAll('*')].find((e) => e && e.scrollHeight > e.clientHeight * 3 && /auto|scroll/.test(getComputedStyle(e).overflowY)) ?? document.scrollingElement; window.__dig = el; return el.scrollHeight - el.clientHeight; });
    const secs = 5.3;
    s.mark('scroll');
    await s.cdp.send('Input.synthesizeScrollGesture', { x: 216, y: 420, yDistance: -far - 400, speed: Math.round(far / secs), gestureSourceType: 'touch', preventFling: true });
    s.mark('there');
    await wait(2600);
    s.mark('b');
    console.log(`   ${far} px in ${((s.marks.there - s.marks.scroll) / 1000).toFixed(1)} s; the arrival card: "${await s.page.evaluate(() => document.querySelector('.dig-arrival')?.innerText.replace(/\s+/g, ' ') ?? 'none')}"`);
    return done(s);
  },
  // The whole ending, replayed from Settings (so sound is already out when it starts), with Sound effects and Music on.
  async finale() {
    const s = await open(dirOf('finale'), { audio: { sfx: true, music: true, style: 'classic' }, storage: { 'rush-hour-rigs:finale': '{"v":1,"seen":true}' } });
    await s.page.goto(`${LIVE}?demo=1&cover=0&${QUIET}`, { waitUntil: 'networkidle' });
    await s.start();
    await s.page.waitForSelector('.brand .gear');
    await unlockSound(s, { selector: '.brand h1', ms: 5000 });
    await s.page.locator('.brand .gear').tap();
    await s.page.waitForSelector('.settings [data-act="ending"]');
    await wait(900);
    await watchBeats(s.page);
    await tapOn(s, '.settings [data-act="ending"]');
    await s.page.waitForSelector('.screen.finale .finale-card');
    s.mark('a');
    await s.page.waitForSelector('.finale-card [data-act="photo"]');
    await wait(4600);
    await tapOn(s, '.finale-card [data-act="photo"]');
    await s.page.waitForFunction(() => !!document.querySelector('#app > .screen.cover'), null, { timeout: 90000 });
    s.mark('cover');
    await wait(3600);
    s.mark('b');
    return done(s);
  },
};

// The sightings: each played by its own preview link, one whole run recorded from the gap before it to the gap after.
export const GAGS = ['magpie', 'moose', 'beaver', 'cloud', 'cold', 'biffyb', 'bison', 'ice', 'overweight', 'frogs', 'nearmiss', 'bale'];
for (const g of GAGS) {
  SESSIONS[`gag_${g}`] = async () => {
    const s = await open(dirOf(`gag_${g}`));
    await s.page.goto(`${LIVE}?gag=${g}&demo=1&night=0&soundnudge=0`, { waitUntil: 'networkidle' });
    await s.start();
    await s.page.waitForSelector('.board .truck.sprite-on');
    await unlockSound(s, { ms: 3200 });
    await watchBeats(s.page);
    const beat = () => s.page.evaluate(() => [...document.querySelectorAll('[data-beat]')].map((e) => e.dataset.beat).filter(Boolean).at(-1) ?? '');
    const until = async (want, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!!(await beat()) === want) return true; await wait(25); } return false; };
    await until(false);
    s.mark('gap');
    await until(true);
    s.mark('a');
    await until(false, 40000);
    s.mark('b');
    await wait(700);
    await done(s);
    const run = s.beats.filter((b) => b.t >= s.marks.a - 100 && b.t <= s.marks.b + 100);
    console.log(`   ${g}: ${((s.marks.b - s.marks.a) / 1000).toFixed(1)} s: ` + run.map((b) => `${((b.t - s.marks.a) / 1000).toFixed(1)} ${b.beat || '(end)'}`).join(' | '));
    return s;
  };
}

// THE RUNAWAY ROLL ON ITS REAL TRIGGER (its preview link showed Clearwater's scenery behind a Cardium level on the live
// build, so the kit's clip is the real thing): two bumps down into the bottom berm, one right after the other.
SESSIONS.gag_roll = async () => {
  const { newGame, getMoveRange } = await import('../../src/engine/index.ts');
  let li = -1, who = null;
  REGIONS[0].levels.forEach((lv, i) => { if (who) return; const st = newGame(lv); for (const t of st.trucks) { const r = getMoveRange(st, t.id); if (t.orient === 'v' && r.exitDelta !== r.max && t.row + t.length + r.max === 6) { li = i; who = { id: t.id, max: r.max }; return; } } });
  console.log(`   Cardium ${li + 1}: truck ${who.id}, ${who.max} cells down to the berm`);
  const s = await open(dirOf('gag_roll'));
  await s.page.goto(`${LIVE}?demo=1&cover=0&magpie=0&worker=0&night=0&soundnudge=0&off=sam,landowner,geese,nearmiss`, { waitUntil: 'networkidle' });
  await s.start();
  await enter(s, 0, li);
  await unlockSound(s);
  await watchBeats(s.page);
  s.mark('a');
  await wait(500);
  if (who.max > 0) await drag(s, who.id, who.max, { ms: 300, after: 300 });
  const { truckAt } = await import('./play.mjs');
  for (let k = 0; k < 2; k++) { // two pushes down at the berm, half a second apart
    const t = await truckAt(s, who.id);
    await s.touch([[t.x, t.y, 0], [t.x, t.y + t.cell * 0.3, 50], [t.x, t.y + t.cell * 0.7, 110], [t.x, t.y + t.cell * 0.8, 170], [t.x, t.y + t.cell * 0.8, 230]]);
    await wait(260);
  }
  const beat = () => s.page.evaluate(() => [...document.querySelectorAll('[data-beat]')].map((e) => e.dataset.beat).filter(Boolean).at(-1) ?? '');
  await wait(1500);
  for (let q = 0, t0 = Date.now(); Date.now() - t0 < 30000;) { q = (await beat()) ? 0 : q + 1; if (q > 30) break; await wait(50); }
  s.mark('b');
  await done(s);
  console.log('   ' + s.beats.filter((b) => b.t >= s.marks.a).map((b) => `${((b.t - s.marks.a) / 1000).toFixed(1)} ${b.beat || '(none)'}`).join(' | '));
  return s;
};

const names = process.argv.slice(2);
if (!names.length || names[0] === 'list') { console.log(Object.keys(SESSIONS).join(' ')); process.exit(0); }
mkdirSync(join(OUT, 'sessions'), { recursive: true });
for (const name of names[0] === 'all' ? Object.keys(SESSIONS) : names) {
  if (!SESSIONS[name]) { console.error(`no session "${name}"`); process.exit(1); }
  console.log(`${name}:`);
  await SESSIONS[name]();
}
