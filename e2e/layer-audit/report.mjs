// Writes qc/layer_audit.md (and its stills, qc/layer_audit/) from the flags of the audit's runs kept in
// qc-out/layer-audit/flags_*.json: every flag, what covers or cuts what, on which screens, and the call.
//   node e2e/layer-audit/report.mjs
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ALLOW, judge } from './allow.mjs';
import { FIXED } from './fixed.mjs';

const IN = resolve('qc-out/layer-audit'), OUT = resolve('qc/layer_audit');
const flags = readdirSync(IN).filter((f) => /^flags_.*\.json$/.test(f)).flatMap((f) => JSON.parse(readFileSync(join(IN, f), 'utf8')));
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
// One entry a distinct flag: the same thing hidden by the same thing in the same scenario, whatever the screen.
const groups = new Map();
for (const f of flags) {
  const key = `${f.scenario.replace(/ \((its preview|its line)\)/, ' ($1)')}|${f.kind}|${f.by}`;
  const g = groups.get(key) ?? { ...f, seen: new Set(), pieces: new Set(), max: 0, stills: [] };
  g.seen.add(`${f.engine} ${f.view}`); g.pieces.add(f.focal.replace(/ #\d+/, '')); g.max = Math.max(g.max, f.share); g.stills.push(f);
  groups.set(key, g);
}
const rows = [...groups.values()].map((g) => ({ ...g, ...judge(g) })).sort((a, b) => (a.call === b.call ? a.scenario.localeCompare(b.scenario) : a.call === 'BUG' ? -1 : 1));
let n = 0;
const entry = (g) => {
  // The still: a phone's in Chrome's engine if there is one, else the first.
  const pick = g.stills.find((s) => s.engine === 'chromium' && s.view === '390x844') ?? g.stills.find((s) => s.view !== '1440x900') ?? g.stills[0];
  let img = '';
  if (pick?.still && existsSync(pick.still)) { const name = `${String(++n).padStart(2, '0')}_${g.scenario.replace(/[^\w]+/g, '_').slice(0, 40)}_${g.kind}.png`; copyFileSync(pick.still, join(OUT, name)); img = `![still](layer_audit/${name})`; }
  const views = [...new Set([...g.seen].map((s) => s.split(' ')[1]))].join(', '), engines = [...new Set([...g.seen].map((s) => s.split(' ')[0]))].join(' and ');
  return `### ${g.scenario}: ${g.kind} by ${g.by}\n\n- **What:** ${[...g.pieces].slice(0, 4).join('; ')}${g.pieces.size > 4 ? '; ...' : ''}, ${g.kind} by ${g.by} (up to ${Math.round(g.max * 100)}% of it${pick ? `, at ${pick.at}` : ''}).\n- **Where:** ${g.where}; seen at ${views} in ${engines}.\n- **Call:** ${g.call === 'BUG' ? '**BUG**' : `intended. ${g.why}`}\n\n${img}\n`;
};
const bugs = rows.filter((r) => r.call === 'BUG'), meant = rows.filter((r) => r.call !== 'BUG');
writeFileSync(resolve('qc/layer_audit.md'), `# Rig Jam layer audit (job U17)

Does anything hide or cut off what the player should be watching? The audit (\`npm run test:e2e:layers\`) plays every
sighting (each strip gag stepped through its run every quarter second; every sighting's preview in real time, for its
speech bubbles), a driver's bump line, trucks driving out by each side, the hint's rim, ghost and OUT badge, the win
card and its confetti, the finale's four parts, and the dig (its cards, every buried thing and find with its bubble,
the far side), at 390 x 844, 375 x 667 and 1440 x 900, in Chrome's engine and Safari's. At each sample it takes the
thing being watched and asks two questions: is something else painted over it (\`elementsFromPoint\` over its box,
counting only what really paints at that pixel), and does a parent cut it off (overflow, a picture's frame, a clip, a
mask, the screen's edge). A thing half off an edge on its way in or out is not a flag unless it stops there.

**${rows.length} distinct flags: ${bugs.length} bug${bugs.length === 1 ? '' : 's'} open, ${meant.length} intended** (each answered for by a rule in \`e2e/layer-audit/allow.mjs\`, ${ALLOW.length} rules, a line of why apiece). A new flag with no rule fails the test.

## Bugs the audit found, and what was done

${FIXED.length ? FIXED.map((f) => `- **${f.what}** ${f.done}`).join('\n') : 'None.'}

## Open bugs

${bugs.length ? bugs.map(entry).join('\n') : 'None.'}

## Intended (on the allow list)

${meant.map(entry).join('\n')}
`);
console.log(`qc/layer_audit.md: ${rows.length} flags (${bugs.length} bugs, ${meant.length} intended), ${n} stills`);
if (bugs.length) for (const b of bugs) console.log(`   BUG  ${b.scenario}: ${b.kind} by ${b.by} (${[...b.seen].join(', ')})`);
