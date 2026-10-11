// THE VIDEO KIT'S STILLS AND BUILD 11 (job U11), from the live game at an iPhone's 390 x 844 at 3x (1170 x 2532), as
// builds 01 to 10 in 01_evolution were framed:
//   node tools/video-kit/stills.mjs evolution     11_2026-10-10_..._1_level_select / _2_board / _3_win_card .png and _4_play.mp4
//   node tools/video-kit/stills.mjs shots         06_screenshots/shot1..shot5
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { REGIONS } from '../../src/levels/regions.ts';
import { newGame, getMoveRange } from '../../src/engine/index.ts';
import { cut, open, wait } from './recorder.mjs';
import { bestLine, play, tapOn } from './play.mjs';

const LIVE = process.env.LIVE ?? 'https://jasondag-ai.github.io/rig-jam/';
const OUT = resolve('qc-out/video-kit'), KIT = join(OUT, 'kit');
const PHONE = { width: 390, height: 844, scale: 3 };
const QUIET = 'magpie=0&worker=0&soundnudge=0&night=0&tourists=0&surveyor=0&off=nearmiss,landowner,biffya,biffyb,sam,geese,lunch,porcupine';
const shot = (s, file) => s.page.screenshot({ path: file, type: 'png' });

const JOBS = {
  // BUILD 11, framed like builds 01 to 10: the level list with Cardium 1 to 4 cleared at par; Cardium 5 three moves in
  // with one near miss; its win card (6 moves, par 6, 1 near miss); and five seconds of Cardium 6 (the NEW LEASE OPEN
  // banner, four moves, a bump and its driver's line). Sound off, as in the earlier builds' captures.
  async evolution() {
    const dir = join(KIT, '01_evolution'), pre = join(dir, '11_2026-10-10_rig_jam_1_0_1');
    mkdirSync(dir, { recursive: true });
    const c = REGIONS[0].levels, par = Object.fromEntries(c.slice(0, 4).map((l) => [l.id, l.par]));
    const progress = { best: par, hints: 7, perfect: Object.keys(par), dailyCleared: [], demo: false, announced: [], standDowns: [] };
    const s = await open(join(OUT, 'sessions', 'evolution'), { view: PHONE, audio: { sfx: false, music: false, style: 'country' }, storage: { 'rush-hour-rigs:v2': JSON.stringify(progress) } });
    await s.page.goto(`${LIVE}?cover=0&${QUIET}`, { waitUntil: 'networkidle' });
    await s.start();
    await s.page.waitForSelector('.level-btn');
    await wait(900);
    await shot(s, `${pre}_1_level_select.png`);
    await s.page.locator('.level-btn').nth(4).tap();
    await s.page.waitForSelector('.board .truck.sprite-on');
    await wait(900);
    // One near miss: a truck that cannot move one way is pushed that way (a bump, no move).
    const bumpIn = (level) => { const st = newGame(level); for (const t of st.trucks) { const r = getMoveRange(st, t.id); if (r.min === 0 && r.exitDelta !== r.min) return { id: t.id, dir: -1 }; if (r.max === 0 && r.exitDelta !== r.max) return { id: t.id, dir: 1 }; } return null; };
    const line5 = bestLine(c[4]), b5 = bumpIn(c[4]);
    await bump(s, b5);
    await play(s, line5.slice(0, 3));
    // (The bump's line has gone, and so has the hotshot: two trucks out close together bring the Near Miss, which is
    // let play right through so the board is caught at rest, as in the earlier builds.)
    await wait(2600);
    for (let q = 0, t0 = Date.now(); Date.now() - t0 < 20000;) { q = (await s.page.evaluate(() => [...document.querySelectorAll('[data-beat]')].some((e) => e.dataset.beat))) ? 0 : q + 1; if (q > 20) break; await wait(50); }
    await wait(3200); // (and the new sighting's toast)
    await shot(s, `${pre}_2_board.png`);
    await play(s, line5.slice(3));
    await s.page.waitForSelector('.win:not([hidden]) .card');
    await wait(2600);
    await shot(s, `${pre}_3_win_card.png`);
    console.log('   win card:', await s.page.evaluate(() => document.querySelector('.win .card').innerText.replace(/\s+/g, ' ').slice(0, 90)));
    s.mark('next');
    await tapOn(s, '.win .card [data-act="next"]');
    await s.page.waitForSelector('.board .truck.sprite-on');
    s.mark('a');
    await wait(350);
    const line6 = bestLine(c[5]), b6 = bumpIn(c[5]);
    if (b6) await bump(s, b6);
    await play(s, line6.slice(0, 4), { pace: 0.75 });
    await wait(900);
    s.mark('b');
    await s.close();
    const r = cut(s, `${pre}_4_play.mp4`, s.marks.a - 150, s.marks.a - 150 + 4967, { size: [780, 1688], sound: false, crf: 18 });
    console.log(`   ${pre}_4_play.mp4 ${r.secs.toFixed(2)} s`);
  },
  // The five stills for Jay's post.
  async shots() {
    const dir = join(KIT, '06_screenshots');
    mkdirSync(dir, { recursive: true });
    const fresh = (name, opts = {}) => open(join(OUT, 'sessions', name), { view: PHONE, audio: { sfx: false, music: false, style: 'country' }, ...opts });
    const enter = async (s, ri, li) => { await s.page.waitForSelector('.region-tab'); await s.page.locator('.region-tab').nth(ri).tap(); await wait(500); await s.page.locator('.level-btn').nth(li).tap(); await s.page.waitForSelector('.board .truck.sprite-on'); await wait(900); };
    { // 1: the cover
      const s = await fresh('shot1');
      await s.page.goto(`${LIVE}?cover=1`, { waitUntil: 'networkidle' });
      await s.page.waitForSelector('.screen.cover .cover-title');
      await wait(3200);
      await shot(s, join(dir, 'shot1_cover.png'));
      await s.browser.close();
    }
    { // 2: a busy, colourful board mid-solve (Bakken 6, four moves in)
      const s = await fresh('shot2');
      await s.page.goto(`${LIVE}?demo=1&cover=0&${QUIET}`, { waitUntil: 'networkidle' });
      await enter(s, 4, 5);
      await play(s, bestLine(REGIONS[4].levels[5]).slice(0, 4));
      await wait(900);
      await shot(s, join(dir, 'shot2_board.png'));
      await s.browser.close();
    }
    { // 3: the win card at par, three hard hats, the confetti still falling
      const s = await fresh('shot3');
      await s.page.goto(`${LIVE}?demo=1&cover=0&${QUIET}`, { waitUntil: 'networkidle' });
      await enter(s, 0, 7);
      await play(s, bestLine(REGIONS[0].levels[7]), { pace: 0.6 });
      await s.page.waitForSelector('.win:not([hidden]) .card');
      await wait(620);
      await shot(s, join(dir, 'shot3_perfect.png'));
      await s.browser.close();
    }
    { // 4: a sighting on its punchline (Out Cold: BONK, the ball comes back down on Moe's hard hat)
      const s = await fresh('shot4');
      await s.page.goto(`${LIVE}?gag=cold&demo=1&night=0&soundnudge=0`, { waitUntil: 'networkidle' });
      await s.page.waitForSelector('.board .truck.sprite-on');
      await s.page.waitForFunction(() => [...document.querySelectorAll('[data-beat]')].some((e) => e.dataset.beat === 'bonk'), null, { timeout: 60000 });
      await wait(130);
      await shot(s, join(dir, 'shot4_sighting.png'));
      await s.browser.close();
    }
    { // 5 (spare): the finale's crew photo, the Polaroid on the lease
      const s = await fresh('shot5');
      await s.page.goto(`${LIVE}?finale=stage&gagtest=1`, { waitUntil: 'networkidle' });
      await s.page.waitForSelector('.screen.finale .board');
      await wait(800);
      await s.page.evaluate(() => window.__rhrFinale.hold('photo', 7.3));
      await wait(500);
      await shot(s, join(dir, 'shot5_polaroid.png'));
      await s.browser.close();
    }
  },
};
/** A push at something that will not give: a near miss. */
async function bump(s, { id, dir }) {
  const t = await s.page.evaluate((id) => { const el = document.querySelector(`.truck[data-id="${id}"]`), q = el.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, h: el.classList.contains('horiz'), cell: parseFloat(document.querySelector('.board').style.getPropertyValue('--cell')) }; }, id);
  const at = (k) => [t.x + (t.h ? dir * t.cell * k : 0), t.y + (t.h ? 0 : dir * t.cell * k)];
  await s.touch([[...at(0), 0], [...at(0.3), 80], [...at(0.7), 180], [...at(0.8), 260], [...at(0.8), 420]]);
  await wait(500);
}

// `recut`: build 11's play clip cut again from the session already kept.
JOBS.recut = async () => {
  const { load } = await import('./recorder.mjs');
  const s = load(join(OUT, 'sessions', 'evolution'));
  cut(s, join(KIT, '01_evolution', '11_2026-10-10_rig_jam_1_0_1_4_play.mp4'), s.marks.a - 150, s.marks.a - 150 + 4967, { size: [780, 1688], sound: false, crf: 18 });
};
for (const name of process.argv.slice(2)) { console.log(`${name}:`); await JOBS[name](); }
