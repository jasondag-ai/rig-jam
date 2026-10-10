// WRITES THE LIVE CONTRACT: what the live build reads from a phone's storage (its keys, the fields of each and their
// types, and the sightings, music styles, regions and levels it knows), from THIS checkout's own modules. Run it on the
// commit that ships (or has just shipped) as the live build; the dev lane's later work is then held to the file by
// src/ui/save-compat.test.ts (a dev build may only ADD: see CLAUDE.md, "The dev lane").
//   node tools/live-contract.ts <name> [previous contract]     e.g. node tools/live-contract.ts 1.0.0 e2e/fixtures/live-contract-24c29d5.json
// The keys and field types are carried over from the previous contract (a key or a field is never dropped); `KEYS`
// below names the keys this build added to it.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { REGIONS } from '../src/levels/regions.ts';
import { LOG_ENTRIES } from '../src/ui/wildlife-log.ts';
import { MUSIC_STYLES } from '../src/audio/pack.ts';
import { TURN_KEY } from '../src/ui/turnaround.ts';
import { FINALE_KEY } from '../src/ui/finale-state.ts';

const [name, previous = 'e2e/fixtures/live-contract-24c29d5.json'] = process.argv.slice(2);
if (!name) { console.error('usage: node tools/live-contract.ts <name> [previous contract]'); process.exit(1); }
/** Keys this build writes that the previous live build did not (each under its own name, so nothing older reads it). */
const KEYS = [TURN_KEY, FINALE_KEY];
const old = JSON.parse(readFileSync(previous, 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const contract = {
  about: "What the LIVE build reads from a phone's storage: its keys, the fields of each and their types, and the ids it knows. Made from that build's own modules (tools/live-contract.ts). A dev build may only ADD to this.",
  build: execSync('git rev-parse --short=7 HEAD').toString().trim(),
  version: pkg.version,
  keys: [...new Set([...old.keys, ...KEYS])],
  progress: old.progress,
  log: { v: old.log.v, fields: old.log.fields, sightings: LOG_ENTRIES.map((e) => e.id) },
  audio: { fields: old.audio.fields, styles: MUSIC_STYLES.map((s) => s.id) },
  regions: REGIONS.map((r) => r.id),
  levels: Object.fromEntries(REGIONS.flatMap((r) => r.levels).map((l) => [l.id, l.par])),
  dailyLevels: old.dailyLevels,
};
// Nothing the previous live build knew may have gone.
for (const id of old.log.sightings) if (!contract.log.sightings.includes(id)) throw new Error(`sighting ${id} is gone`);
for (const id of old.audio.styles) if (!contract.audio.styles.includes(id)) throw new Error(`style ${id} is gone`);
for (const [id, par] of Object.entries(old.levels)) if (contract.levels[id] !== par) throw new Error(`level ${id}: par ${contract.levels[id]}, was ${par}`);
const file = `e2e/fixtures/live-contract-${name}.json`;
writeFileSync(file, JSON.stringify(contract, null, 1) + '\n');
console.log(`${file}: build ${contract.build}, ${contract.keys.length} keys, ${contract.log.sightings.length} sightings, ${contract.audio.styles.length} styles, ${contract.regions.length} regions, ${Object.keys(contract.levels).length} levels`);
