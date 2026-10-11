// THE VIDEO KIT'S CLIPS (job U11): cut from the sessions tools/video-kit/record.mjs keeps.
//   node tools/video-kit/cut.mjs [<clip> ...]      into qc-out/video-kit/kit/02_phone_clips/
// Each clip: which session, from which marked moment to which (with a little before or after), in seconds.
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cut, load } from './recorder.mjs';

const OUT = resolve('qc-out/video-kit');
/** name: [session, from mark, seconds after it, to mark, seconds after it] */
export const CLIPS = {
  cover_first_drag: ['cover', 'tap', -1.8, 'card', 1.2],
  solves_cardium: ['cardium', 'a', 0, 'b', 0],
  solves_montney: ['montney', 'a', 0, 'b', 0],
  solves_duvernay: ['duvernay', 'a', 0, 'b', 0],
  solves_bigpad: ['bigpad', 'a', 0, 'b', 0],
  solves_baldonnel: ['baldonnel', 'a', 0, 'b', 0],
  fling: ['fling', 'a', 0, 'b', 0],
  perfect_solve: ['perfect', 'a', 0, 'end', 0],
  daily_pad_share: ['daily', 'a', 0, 'b', 0],
  sunday_turnaround: ['turnaround', 'a', 0, 'b', 0],
  region_swipe: ['regions', 'a', 0, 'b', 0],
  dig_kerguelen: ['dig', 'a', 0, 'b', 0],
  finale: ['finale', 'a', -0.15, 'b', 0],
  // The sightings: one run of each, from the preview link's own start (mark `a`); the stretch that holds the joke.
  gag_magpie: ['gag_magpie', 'a', 1.2, 'a', 11.0],
  gag_moose: ['gag_moose', 'a', -0.3, 'a', 5.5],
  gag_beaver: ['gag_beaver', 'a', 1.6, 'a', 10.0],
  gag_personal_cloud: ['gag_cloud', 'a', 1.8, 'a', 11.0],
  gag_out_cold: ['gag_cold', 'a', 2.6, 'a', 11.6],
  gag_runaway_roll: ['gag_roll', 'a', 0.2, 'a', 8.0], // (on its real trigger: two bumps down into the bottom berm)
  gag_right_of_way: ['gag_bison', 'a', 3.4, 'a', 11.7],
  gag_last_ice: ['gag_ice', 'a', 2.4, 'a', 10.2],
  // Spares.
  gag_overweight: ['gag_overweight', 'a', 2.2, 'a', 11.4],
  gag_late_croak: ['gag_frogs', 'a', 0.2, 'a', 10.0],
  gag_near_miss: ['gag_nearmiss', 'a', -0.2, 'a', 8.7],
  gag_runaway_bale: ['gag_bale', 'a', -0.2, 'a', 9.6],
};
export const kitDir = join(OUT, 'kit');

if (import.meta.url === `file://${process.argv[1]}`) {
  const want = process.argv.slice(2);
  mkdirSync(join(kitDir, '02_phone_clips'), { recursive: true });
  for (const [name, [session, m0, d0, m1, d1]] of Object.entries(CLIPS)) {
    if (want.length && !want.includes(name)) continue;
    const s = load(join(OUT, 'sessions', session));
    const from = s.marks[m0] + d0 * 1000, to = s.marks[m1] + d1 * 1000;
    const r = cut(s, join(kitDir, '02_phone_clips', `${name}.mp4`), from, to, { crf: 19 });
    console.log(`${name}.mp4  ${r.secs.toFixed(1)} s  (${r.fps.toFixed(0)} frames a second painted)`);
  }
}
