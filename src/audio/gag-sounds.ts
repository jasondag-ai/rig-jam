// What each gag sounds like: for each gag, the sounds that start on each of its beats (the beat
// names are the gags' own, `data-beat`). One table, so a sound can be moved without touching a gag.
//   'poke'        play that sound as the beat starts
//   'poke@0.4'    ... 0.4 s into the beat
//   '+steps'      start a loop; '-steps' stop it. Loops: steps (footsteps), snore, mosquito,
//                 quad_idle, quad_rev. Every loop a gag started stops when the gag ends.
// The magpie's squawk, splat and the driver's radio are played by the gag itself (they follow what
// the player does); the rest of his sounds are here. The bear's business lands with the magpie's
// own dropping sound (`splat`), then his sigh of relief (Jay, Oct 6).
import type { GagId } from '../ui/gag-triggers.ts';

export const GAG_SOUNDS: Record<GagId, Record<string, string[]>> = {
  magpie: { land: ['hop'], 'hop-turn': ['hop'], strain: ['slurp@1.0'], smug: ['magpie'], launch: ['wind'], startle: ['wind'] },
  worker: {
    'walk-in': ['+steps'], 'flip-pail': ['-steps', 'rattle'], sit: ['puff'], doze: ['+snore'], jolt: ['-snore', 'hop'], bolt: ['scurry'], yank: ['thwip'],
    cancel: ['-snore', '-steps', 'hop', 'scurry@0.2'],
  },
  moose: { rise: ['puff'], chew: ['chomp'], groan: ['moose'], duck: ['puff'] },
  nearMiss: { sniff: ['gopher'], 'eyes-huge': ['poke'], hotshot: ['horn', 'wind'], dusty: ['puff'], 'near-miss': ['gopher'], cough: ['puff'] },
  landowner: {
    'ride-in': ['quad_start', '+quad_idle'], skid: ['scurry'], rev: ['-quad_idle', '+quad_rev'], wheelie: ['hop'], 'hat-off': ['wind'], 'hat-catch': ['poke'], gone: ['-quad_rev'],
  },
  biffyA: { jolt: ['rattle'], 'door-open': ['outhouse'], 'eye-pop': ['poke'], 'pull-shut': ['outhouse@0.25'], occupied: ['camera'], unlocked: ['camera'] },
  biffyB: { jolt: ['rattle', 'rattle@0.24'], 'door-open': ['outhouse'], 'roll-out': ['scurry'], shuffle: ['+steps'], 'off-screen': ['-steps'], 'door-shut': ['outhouse@0.6'] },
  marshmallow: {
    'walk-in': ['+steps'], 'eyes-flare': ['-steps'], telescope: ['cord', 'cord@0.36', 'cord@0.72'], fwoomp: ['wind'], 'eyes-pop': ['poke'], yank: ['thwip'], blow: ['puff'],
    crispy: ['chomp'], 'ear-smoke': ['puff', '+steps@0.8'], gone: ['-steps'],
  },
  geese: { 'v-flies': ['geese'], honk: ['geese'], 'snap-turn': ['hop'], chase: ['scurry'], feather: ['twinkle'] },
  bear: {
    'bear-in': ['+steps'], sniff: ['-steps', 'bull'], sit: ['puff'], strain: ['moose'], relief: ['splat', 'puff@0.3'], 'spots-ears': ['poke'], snatch: ['thwip'], wipe: ['scurry', 'scurry@0.7'],
    'set-down': ['hop'], violated: ['gopher'], 'bear-leaves': ['+steps'], gone: ['-steps'],
  },
  bull: {
    'bull-in': ['+steps'], freeze: ['-steps', 'poke'], 'lick-hoof': ['slurp'], slick: ['thwip'], 'chest-puff': ['twinkle'], 'cow-looks': ['cow'], 'eyes-huge': ['poke'], 'hop-turn': ['hop'],
    bolts: ['scurry'], paws: ['bull', 'bull@0.15'], charge: ['scurry'], 'last-heart': ['tap'], 'cow-back': ['+steps'], 'catches-breath': ['-steps', 'puff'], 'grazes-again': ['cow'],
  },
  porcupine: { 'stroll-in': ['+steps'], 'look-around': ['-steps'], squat: ['puff'], poke: ['poke'], 'roll-pops': ['hop'], 'springs-out': ['scurry'], 'porcupine-bolts': ['scurry@0.1'] },
  gopherLunch: {
    'stroll-in': ['+steps'], 'plops-down': ['-steps', 'puff'], 'paw-peeks': ['gopher'], yank: ['thwip'], chomp: ['chomp', 'chomp@0.45', 'chomp@0.9'], 'crust-back': ['tap'], bite: ['chomp@0.4'],
    'eyes-huge': ['poke'], cheeks: ['gopher'], 'boils-over': ['wind'], 'hurls-crust': ['scurry'], 'stomps-off': ['+steps'], burp: ['-steps', 'burp@0.45'],
  },
  sam: { 'march-in': ['+steps'], 'looks-up': ['-steps'], tsk: ['tap', 'tap@0.5'], scribble: ['rattle'], 'see-me': ['poke'], points: ['hop'], 'backs-off': ['+steps'] },
  tongue: {
    'stroll-in': ['+steps'], 'eyes-pipe': ['-steps'], lick: ['slurp'], stuck: ['thwip'], pulls: ['cord', 'cord@0.6'], 'buddy-in': ['+steps'], 'buddy-looks': ['-steps'], flash: ['camera'],
    'buddy-leaves': ['+steps'], snowflake: ['-steps', 'twinkle'], 'buddy-back': ['+steps'], sigh: ['-steps', 'puff'], pours: ['slurp'], thwip: ['thwip'], 'walk-off': ['+steps'], 'riser-again': ['-steps'],
  },
  surveyor: {
    'walks-in': ['+steps'], 'plants-tripod': ['-steps', 'rattle'], 'marches-over': ['+steps'], yanks: ['-steps', 'cord'], 'moves-it': ['puff@0.9'], 'heads-back': ['+steps'], 'sights-again': ['-steps'],
    huh: ['tap@0.3'], 'pulls-it-up': ['+steps', 'cord@0.6'], 'carries-back': [], stamps: ['-steps', 'bump@0.3', 'bump@0.55'], perfect: ['twinkle'], 'folds-tripod': ['+steps@0.2', 'rattle@0.9'], 'walks-off': [],
  },
  deer: { 'wanders-in': ['+steps'], 'eyes-the-post': ['-steps'], rubs: ['rattle', 'rattle@1.3', 'rattle@2.6'], thump: ['step', 'step@0.11', 'step@0.22', 'step@0.33', 'step@0.44'], sigh: ['puff'], shake: ['rattle'], 'ambles-off': ['+steps'] },
  tourists: { 'stroll-in': ['+steps'], points: ['-steps'], flash: ['camera'], admire: ['+mosquito@0.15'], slap: ['slap@0.25'], swarm: ['wind'], run: ['scurry', '+steps'], straggler: ['-steps'] },
  // Wave 3 (Mannville): no sounds picked yet.
  muskeg: {},
  catTrain: {},
  beaver: {},
  aurora: {},
  // Wave 3 (Bakken): none yet either.
  tumbleweed: {},
  pdogs: {},
  bale: {},
  cloud: {},
};

/** The loops a gag may run, and the sound each repeats. `every`: a one-shot repeated that often (s); none: the file itself loops. */
export const GAG_LOOPS = {
  steps: { key: 'step', every: 0.27 },
  snore: { key: 'snore', every: 2.6 },
  mosquito: { key: 'mosquito' },
  quad_idle: { key: 'quad_idle' },
  quad_rev: { key: 'quad_rev' },
} as const;
export type GagLoop = keyof typeof GAG_LOOPS;

/** A table entry, read: what to do, to which sound or loop, and how long into the beat. */
export function parseCue(cue: string): { op: 'play' | 'start' | 'stop'; name: string; delay: number } {
  const [head, at] = cue.split('@');
  const op = head.startsWith('+') ? 'start' : head.startsWith('-') ? 'stop' : 'play';
  return { op, name: op === 'play' ? head : head.slice(1), delay: at ? Number(at) : 0 };
}
