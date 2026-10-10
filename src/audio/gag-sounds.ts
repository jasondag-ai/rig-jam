// What each gag sounds like: for each gag, the sounds that start on each of its beats (the beat
// names are the gags' own, `data-beat`). One table, so a sound can be moved without touching a gag.
//   'poke'        play that sound as the beat starts
//   'poke@0.4'    ... 0.4 s into the beat
//   'squeak^3'    ... three semitones higher ('^-2': lower); with a delay: 'squeak@0.2^3'
//   '+steps'      start a loop; '-steps' stop it (both may be delayed: '+rain@0.7'). Loops:
//                 `GAG_LOOPS` below. Every loop a gag started stops when the gag ends.
// The magpie's squawk, splat and the driver's radio are played by the gag itself (they follow what
// the player does); the rest of his sounds are here. The bear's business lands with the magpie's
// own dropping sound (`splat`), then his sigh of relief (Jay, Oct 6).
import type { GagId } from '../ui/gag-triggers.ts';
import type { SfxKey } from './pack.ts';

export const GAG_SOUNDS: Record<GagId, Record<string, string[]>> = {
  magpie: { land: ['hop'], 'hop-turn': ['hop'], strain: ['slurp@1.0'], smug: ['magpie'], launch: ['wind'], startle: ['wind'] },
  worker: {
    'walk-in': ['+steps'], 'flip-pail': ['-steps', 'knock'], sit: ['puff'], doze: ['+snore'], jolt: ['-snore', 'hop'], bolt: ['scurry'], yank: ['thwip'],
    cancel: ['-snore', '-steps', 'hop', 'scurry@0.2'],
  },
  moose: { rise: ['puff'], chew: ['chomp'], groan: ['moose'], duck: ['puff'] },
  nearMiss: { sniff: ['gopher'], 'eyes-huge': ['poke'], hotshot: ['horn', 'wind'], dusty: ['puff'], 'near-miss': ['gopher'], cough: ['puff'] },
  landowner: {
    'ride-in': ['quad_start', '+quad_idle'], skid: ['scurry'], rev: ['-quad_idle', '+quad_rev'], wheelie: ['hop'], 'hat-off': ['wind'], 'hat-catch': ['poke'], gone: ['-quad_rev'],
  },
  biffyA: { jolt: ['knock'], 'door-open': ['outhouse'], 'eye-pop': ['poke'], 'pull-shut': ['outhouse@0.25'], occupied: ['camera'], unlocked: ['camera'] },
  // (His glove pats the floor at 1.80, 2.94 and 3.08 s: a `tap` on each. The steps start as he comes out, the beat that used to be `shuffle`.)
  biffyB: { jolt: ['knock', 'knock@0.24'], 'door-open': ['outhouse'], 'roll-out': ['scurry'], reach: ['tap@0.4'], panic: ['tap@0.09', 'tap@0.23'], out: ['+steps'], 'off-screen': ['-steps'], 'door-shut': ['outhouse@0.6'] },
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
  porcupine: { 'stroll-in': ['+steps'], 'look-around': ['-steps'], squat: ['puff'], poke: ['poke'], 'roll-pops': ['hop'], 'springs-out': ['scurry'], 'porcupine-bolts': ['scurry'] }, // (it bolts at 7.8 s, once Moe has gone)
  gopherLunch: {
    'stroll-in': ['+steps'], 'plops-down': ['-steps', 'puff'], 'paw-peeks': ['gopher'], yank: ['thwip'], chomp: ['chomp', 'chomp@0.45', 'chomp@0.9'], 'crust-back': ['tap'], bite: ['chomp@0.4'],
    'eyes-huge': ['poke'], cheeks: ['gopher'], 'boils-over': ['wind'], 'hurls-crust': ['scurry'], 'stomps-off': ['+steps'], burp: ['-steps', 'burp@0.45'],
  },
  sam: { 'march-in': ['+steps'], 'looks-up': ['-steps'], tsk: ['tap', 'tap@0.5'], scribble: ['knock'], 'see-me': ['poke'], points: ['hop'], 'backs-off': ['+steps'] },
  tongue: {
    'stroll-in': ['+steps'], 'eyes-pipe': ['-steps'], lick: ['slurp'], stuck: ['thwip'], pulls: ['cord', 'cord@0.6'], 'buddy-in': ['+steps'], 'buddy-looks': ['-steps'], flash: ['camera'],
    'buddy-leaves': ['+steps'], snowflake: ['-steps', 'twinkle'], 'buddy-back': ['+steps'], sigh: ['-steps', 'puff'], pours: ['slurp'], thwip: ['thwip'], 'walk-off': ['+steps'], 'riser-again': ['-steps'],
  },
  surveyor: {
    'walks-in': ['+steps'], 'plants-tripod': ['-steps', 'knock'], 'marches-over': ['+steps'], yanks: ['-steps', 'cord'], 'moves-it': ['puff@0.9'], 'heads-back': ['+steps'], 'sights-again': ['-steps'],
    huh: ['tap@0.3'], 'pulls-it-up': ['+steps', 'cord@0.6'], 'carries-back': [], stamps: ['-steps', 'bump@0.3', 'bump@0.55'], perfect: ['twinkle'], 'folds-tripod': ['+steps@0.2', 'knock@0.9'], 'walks-off': [],
  },
  deer: { 'wanders-in': ['+steps'], 'eyes-the-post': ['-steps'], rubs: ['knock', 'knock@1.3', 'knock@2.6'], thump: ['step', 'step@0.11', 'step@0.22', 'step@0.33', 'step@0.44'], sigh: ['puff'], shake: ['knock'], 'ambles-off': ['+steps'] },
  tourists: { 'stroll-in': ['+steps'], points: ['-steps'], flash: ['camera'], admire: ['+mosquito@0.15'], slap: ['slap@0.25'], swarm: ['wind'], run: ['scurry', '+steps'], straggler: ['-steps'] },
  // ---- Wave 3 (the sound pass: Jay's picks, each on its beat; times after '@' are seconds into the beat) ----
  // MUSKEG BOOTS: dry steps in, squelches through the puddle (a step every 0.42 s there), two tugs
  // at the stuck boot, SHLUCK as the foot comes free, and the last bubble's blup.
  muskeg: {
    'walks-in': ['+steps'], squelch: ['-steps', '+squelch'], stuck: ['-squelch', 'squelch@0.05', 'squelch@0.24^2'], shluck: ['shluck'],
    'limps-off': ['+steps'], blup: ['-steps', 'blup'],
  },
  // CAT TRAIN: the kittens mew as they trot, the last one's small mew as it sits, its yawn (the
  // mouth opens 0.05 s into the beat), the mother's long sigh over it.
  catTrain: { train: ['mew@0.9', 'mew@2.0^2', 'mew@3.1^-1'], 'kitten-sits': ['mew@0.1^3'], yawn: ['yawn@0.05'], sigh: ['sigh'], 'hop-turn': ['hop'] },
  // BEAVER: pats while he waddles; BONK on each hit (the second lands 0.3 s into its beat, after the
  // crouch and charge); the two tail slaps where the tail comes down (0.12 and 0.36 s into "proud").
  beaver: {
    'waddles-in': ['+pats'], bonk: ['-pats', 'bonk'], glares: ['+pats@0.05', '-pats@0.5'], 'bonk-again': ['bonk@0.3'], idea: ['poke'],
    'squeezes-past': ['+pats'], lowers: ['-pats'], proud: ['tailslap@0.12', 'tailslap@0.36'], 'waddles-off': ['+pats'],
  },
  // AURORA HOWL: the shimmer as the lights come in and again as they go; the howl starts with the
  // beat and cracks 1.05 s in, right on the "squeak" beat (1.1 s after "howls").
  aurora: { lights: ['shimmer'], howls: ['howl'], 'lights-fade': ['shimmer'] },
  // TUMBLEWEED: the wind brings it; the rustle (with its own light bounces) runs while anything rolls.
  tumbleweed: { 'bounces-in': ['whistle', '+rustle'], stops: ['-rustle'], 'rolls-back': ['+rustle'], empty: ['-rustle'], family: ['whistle', '+rustle'] },
  // PRAIRIE DOG WAVE: one squeak a dog as it pops up, each higher along the wave (0.3 s apart, as
  // they rise); the sad "aw-ww" belongs to the one who pops up late, alone.
  pdogs: {
    'first-dog': ['squeak@0.1'], wave: ['squeak@0.05', 'squeak@0.2^1.6', 'squeak@0.5^3.2', 'squeak@0.8^4.8', 'squeak@1.1^6.4'], late: ['aww@0.15'],
    stare: ['squeak@0.05^-2', 'squeak@0.1^2'], 'tiny-wave': ['squeak@0.15^6'],
  },
  // RUNAWAY BALE: the rumble while the bale rolls (away, pushed back, and its one more inch), his
  // running feet, and the long sigh as his shoulders drop.
  bale: {
    'rolls-away': ['+rumble'], chase: ['+steps'], empty: ['-rumble', '-steps'], 'pushes-back': ['+rumble', '+steps'], 'got-it': ['-rumble', '-steps'],
    'one-more-inch': ['+rumble', '-rumble@0.55'], sigh: ['sigh@0.05'], 'walks-off': ['+steps@0.3'],
  },
  // PERSONAL CLOUD: the patter whenever it rains on him (2.3 to 3.5 s, 4.1 to 4.4, 4.75 on), the
  // umbrella's pop as it snaps open (0.2 s into its beat) and the rain stopping; the DOWNPOUR the
  // moment the closed umbrella lets it (the "downpour" beat), until he opens it again.
  cloud: {
    'strolls-in': ['+steps'], rains: ['-steps', '+rain'], sidestep: ['-rain@0.1', '+rain@0.7'], 'steps-back': ['-rain', '+rain@0.35'], umbrella: ['umbrella@0.2', '-rain@0.4'],
    downpour: ['+downpour'], 'opens-again': ['-downpour@0.1', 'umbrella@0.15', '+rain@0.3'], 'walks-off': ['+steps'],
  },
  // CLEARWATER (the Big Pad's five sightings). Jay's five new sounds (his picks: whoosh, boing and crack the B takes,
  // triangle and splash the A) and the rest from the pack as his brief lists them (knock for TOK and PING), each on the moment the reference draws its sound word.
  // Three Swings: footsteps; a whoosh as each miss comes down (0.45 s into the swing; the second harder, so higher); the
  // BOING as the shovel bites (0.55 s into the third).
  golf: { 'walks-in': ['+steps'], 'tees-up': ['-steps'], 'swing-one': ['whoosh@0.45'], 'swing-two': ['whoosh@0.45^2'], 'swing-three': ['boing@0.55'], 'stomps-off': ['+steps@0.3'] },
  // Out Cold: CRACK as he connects (0.55 s in), TOK off the rig mats (the wooden knock), PING off the aspen (the same
  // knock, higher), BONK on his hard hat, his stars; the bearded worker's steps in, and off with Moe.
  cold: { 'moe-is-back': ['+steps'], 'tees-up': ['-steps'], crack: ['crack@0.55'], tok: ['knock'], ping: ['knock^7'], bonk: ['bonk'], 'seeing-stars': ['twinkle'], 'strolls-in': ['+steps'], fore: ['-steps'], 'drags-off': ['+steps'] },
  // Fresh Wash: the door's clunk (out of sight), his steps round the front, two squeaks of the rag, the ting of a
  // spotless hood, the hauler's rumble, SPLASH at the puddle, the plop off his hat, the trudge back, the clunk.
  wash: {
    'clunk-out': ['clack'], 'round-the-front': ['+steps'], 'hop-turn': ['-steps'], wipes: ['squeak@0.2', 'squeak@0.85'], admires: ['twinkle@0.4'], hauler: ['+rumble'],
    sploosh: ['splash', '-rumble@0.9'], plop: ['blup@0.35'], 'trudges-back': ['+steps'], 'clunk-in': ['-steps', 'clack'],
  },
  // Dinner Bell: the cook's steps, the triangle (its three dings fall on the first three strikes), the rumble of the
  // stampede until the dust settles, his steps off; then Moe's, late.
  bell: { 'cook-walks-in': ['+steps'], ding: ['-steps', 'triangle'], rumble: ['+rumble'], dizzy: ['-rumble'], follows: ['+steps@0.2'], 'empty-lane': ['-steps'], 'moe-late': ['+steps'], puffing: ['-steps'], 'save-me-some': ['+steps@0.3'] },
  // One Pea: the crew's steps, and the pea's plip into the puddle.
  pea: { 'crew-strolls': ['+steps'], carbs: ['-steps'], plip: ['blup'], 'trudges-off': ['+steps'] },
  // Baldonnel (job U6b): NO SOUNDS YET (Jay). The sound words are drawn; the rows are here for when he picks.
  overweight: {}, cranes: {}, bison: {}, hare: {}, ice: {}, frogs: {}, mosquito: {},
};

/** The loops a gag may run, and the sound each repeats. `every`: a one-shot repeated that often (s); none: the file itself loops. */
export const GAG_LOOPS = {
  steps: { key: 'step', every: 0.27 },
  snore: { key: 'snore', every: 2.6 },
  mosquito: { key: 'mosquito' },
  quad_idle: { key: 'quad_idle' },
  quad_rev: { key: 'quad_rev' },
  // Wave 3. A sound that runs on is its file played again before the last one has died away (each
  // file fades in and out, so they blend); stopping it fades whatever is still sounding.
  squelch: { key: 'squelch', every: 0.42 },
  pats: { key: 'pats', every: 0.98 },
  rustle: { key: 'rustle', every: 1.15 },
  rumble: { key: 'rumble', every: 1.65 },
  rain: { key: 'rain', every: 1.7 },
  downpour: { key: 'downpour', every: 2.05 },
} as const;
export type GagLoop = keyof typeof GAG_LOOPS;

/** A table entry, read: what to do, to which sound or loop, how long into the beat, and (for a one-shot) how many semitones higher ('^3') or lower ('^-2') to play it. */
export function parseCue(cue: string): { op: 'play' | 'start' | 'stop'; name: string; delay: number; semis: number } {
  const [rest, up] = cue.split('^');
  const [head, at] = rest.split('@');
  const op = head.startsWith('+') ? 'start' : head.startsWith('-') ? 'stop' : 'play';
  return { op, name: op === 'play' ? head : head.slice(1), delay: at ? Number(at) : 0, semis: up ? Number(up) : 0 };
}

/** The sounds a gag can play: its one-shots and what its loops repeat. */
export function gagKeys(id: GagId): SfxKey[] {
  const out = new Set<SfxKey>();
  for (const cues of Object.values(GAG_SOUNDS[id] ?? {})) {
    for (const cue of cues) {
      const { op, name } = parseCue(cue);
      out.add((op === 'play' ? name : GAG_LOOPS[name as GagLoop].key) as SfxKey);
    }
  }
  return [...out];
}
