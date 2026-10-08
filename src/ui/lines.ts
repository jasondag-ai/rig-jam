// Everything anybody says (LINES_v2.md is the source for the v2 lines, used exactly as written).
// Edit freely: one line per string. No em dashes.
//
// BUMP LINES: what drivers say when you bump them into something. Each bump picks from the pool for
// what was hit plus the "any" pool, never the same line twice in a row.
//   any      – any bump
//   truck    – bumped another truck
//   wall     – the berm or a wrong-colour gate
//   pumpjack, tank, wellhead, flare – that piece of equipment
//   convoy   – a convoy truck driving at its gate out of order. Uses only this pool, so the
//              line always explains the rule.
// ESCALATION: the same truck hitting the same kind of thing again in one level says the 2nd, then
// the 3rd line of `ESCALATION` instead of a line from the pool.

export type BumpHit = 'truck' | 'wall' | 'pumpjack' | 'tank' | 'wellhead' | 'flare' | 'convoy' | 'load' | 'shift';

export const BUMP_LINES = {
  any: [
    'Stop work authority!',
    'Spotter! SPOTTER!',
    'Did you fill out a JSA for that?',
    'Easy! I just washed it.',
    'My grandma backs up better than that.',
    'Give me your keys, greenhorn.',
    'You got your H2S ticket or what?',
    "Get out. I'll park it.",
    'Everything here is parked but you.',
    'You made the safety board.',
    'You owe me a coffee, Sonny.',
    "That's going in the incident report.",
    'There goes my safety bonus.',
  ],
  truck: [
    "I'm loaded. You yield.",
    "That's my tailgate, not a gate.",
    'Your circle check missed me.',
    "Back off. Tailgate's down.",
  ],
  wall: [
    "That's a wall, not a gate.",
    "Fence doesn't move, bud.",
    'Wrong gate. Read the sign.',
    "Gate's thataway.",
    'You just bought a fence post.',
    "That berm's been here since '82.",
    "Surveyor's gonna love this.",
    'Wrong colour, wrong day.',
    'Did the gate move? No. You did.',
  ],
  pumpjack: [
    "Pumpjack's undefeated.",
    "Pumpjack doesn't have a license.",
    "She's been nodding since '78. You won't stop her.",
    "Don't touch the horsehead.",
    "That's a producing well, Sonny.",
    'Pumpjack 1. You 0.',
    'You just cost us a barrel.',
    'Watch the counterweights!',
  ],
  convoy: [
    'Wait your turn, Sonny.',
    "Convoy order! I'm number one.",
    'Number one goes first. Basic math.',
    'Back of the line, rookie.',
    'Two waits for one. Always.',
    "It's a convoy, not a race.",
    "I'm first. It says so on my door.",
    "Convoy rules. Don't make me say it again.",
  ],
  // A tanker driven at its gate before it has loaded (Bakken). Its own pool only: the line is the rule.
  load: ["Can't leave empty. Rack first.", 'Load up, then the gate opens.', "I'm empty. Stop me on the rack."],
  // A truck driven at a shift-change gate on an odd move (Bakken). Its own pool only.
  shift: ['Wrong shift. Even moves only.', "Clock says no. It's open next move.", 'Shift change. Try on an even move.'],
  tank: [
    "That tank's full, by the way.",
    "Tank's not a bumper.",
    'You dent it, you strap it.',
    "Easy. That's a day's production.",
    'Smells like a spill report.',
    'Hit the tank, fill out the form.',
  ],
  wellhead: [
    "That's a wellhead, not a hitching post.",
    "Christmas tree's not for parking.",
    "That valve's older than you.",
    "Don't make me call the 24-hour line.",
    "Tell the pumper. Actually, don't.",
    "Lease operator's gonna cry.",
  ],
  flare: [
    'Hot hot hot!',
    "Flare's lit, genius.",
    "That's a flare stack, not a campfire.",
    "Smell that? That's your paint.",
    'Marshmallows later. Move.',
    'Never park by the flare. Ever.',
  ],
};

/** The same truck, the same kind of hit, again in the same level: [the 2nd time, the 3rd and after]. */
export const ESCALATION: Record<BumpHit, [string, string]> = {
  wall: ["It's still a wall.", '...'],
  truck: ['Again? Really?', "I'm calling dispatch."],
  pumpjack: ['Still undefeated.', '...'],
  convoy: ['Still not your turn.', '...'],
  load: ['Still empty. Rack first.', '...'],
  shift: ['Still the wrong shift.', '...'],
  tank: ['Again?!', "I'm just gonna sit here."],
  wellhead: ['Again?!', "I'm just gonna sit here."],
  flare: ['Again?!', "I'm just gonna sit here."],
};


/** Lines that fit a bump: the "any" pool plus the pool for what was hit (convoy, load, shift: their own pool only, so the line explains the rule). */
export function linesFor(hit: BumpHit): string[] {
  if (hit === 'convoy' || hit === 'load' || hit === 'shift') return [...BUMP_LINES[hit]];
  return [...BUMP_LINES.any, ...BUMP_LINES[hit]];
}

/** A random fitting line, never the same as `last` (when there is any other choice). */
export function pickLine(hit: BumpHit, last: string | null, random: () => number = Math.random): string {
  const pool = linesFor(hit);
  const choices = pool.length > 1 ? pool.filter((l) => l !== last) : pool;
  return choices[Math.floor(random() * choices.length)];
}

/**
 * The line for a bump: the `nth` time this truck has hit this kind of thing in this level. The
 * first is a fitting line from the pools; after that the escalation table speaks.
 */
export function bumpLine(hit: BumpHit, nth: number, last: string | null, random: () => number = Math.random): string {
  if (nth <= 1) return pickLine(hit, last, random);
  return ESCALATION[hit][nth === 2 ? 0 : 1];
}

// Company Man on the win screen: one line by result, never the same line twice in a row.
//   par   – cleared at par
//   close – one to three moves over par
//   over  – worse than that
export const COMPANY_LINES = {
  par: [
    "Textbook. I'll tell head office.",
    'Not a scratch on the lease. Beautiful.',
    'Frame that one for the lunch trailer.',
    "That's how we do it in the patch.",
    'Zero incidents. Zero excuses.',
    'Head office wants your number.',
    'Smooth as a new rig floor.',
    'You can come back tomorrow.',
  ],
  close: [
    'Good enough for government work.',
    "She'll do. Write it up.",
    'Not pretty, but the trucks are out.',
    "Close enough. Don't tell anyone.",
    "I've seen worse. Mostly from me.",
    "Trucks are out. I'm not asking how.",
    "Coffee's on you next time.",
    'Fine. Go get lunch.',
  ],
  over: [
    "We'll talk about this at the safety meeting.",
    "I'm putting this in my report.",
    'Tailgate meeting. Tomorrow. Six sharp.',
    'Did you plan that or just wing it?',
    'I need a coffee after that.',
    "I'm getting too old for this lease.",
    'Next time, try reading the map.',
    'That took longer than a turnaround.',
  ],
};
/** Any result, if a gag played this level: about one time in `FOURTH_WALL_ODDS` he says one of these instead. */
export const FOURTH_WALL_LINES = ['I saw it too. Get back to work.', 'Quit watching the wildlife. Watch the trucks.'];
export const FOURTH_WALL_ODDS = 3;

// GAG LINES. A gag with more than one line never says the same one twice in a row.
export const MAGPIE_LINES = ['Seriously?', 'Not the windshield!', 'Every. Single. Day.', 'Somebody get the pressure washer.'];
/** The Runaway Bale: what the landowner shouts as he runs after it (the reference's line). */
export const BALE_LINE = 'Hey!';
/** Out Cold (Clearwater): what the bearded worker says, looking down at Moe. The reference's own line. */
export const FORE_LINE = 'Fore.';
/** Dinner Bell and One Pea (Clearwater): the reference's own lines, by the key the gag says them under. */
export const BELL_LINES: Record<string, string> = { supper: 'Supper!', save: 'Save me some!' };
export const PEA_LINES: Record<string, string> = { carbs: 'Watching your carbs, Moe?' };
export const LANDOWNER_LINES = ["Who's paying for these ruts?", "That's my hay field!", "I'm calling the land man.", 'Fix these ruts by Friday.'];
const lastFrom = new Map<readonly string[], string>();
/** A line from a pool, never the one it gave last time. */
export function fromPool(pool: readonly string[], random: () => number = Math.random): string {
  const choices = pool.length > 1 ? pool.filter((l) => l !== lastFrom.get(pool)) : [...pool];
  const line = choices[Math.floor(random() * choices.length)];
  lastFrom.set(pool, line);
  return line;
}

/**
 * BURIED THINGS in the Wildlife Log's dig (log-dig.ts): tap one and it wiggles and says its line.
 * ONE LINE each: 40 characters at most, so the bubble never wraps on a phone. Jay's own (Oct 6).
 * `reservoir` is said by the oil at the foot of the upper dig.
 */
export const BURIED_LINES = {
  keys: 'Who had them last?',
  remote: 'The show ended.',
  sock: 'The dryer sends its regards.',
  golf: 'Play it as it lies.',
  tusk: 'He wants that back.',
  dino: 'Just resting his eyes.',
  ammonite: "Alberta's official gemstone. Seriously.",
  plane: 'Took the scenic route.',
  bit: 'Day four. Still fishing.',
  den: 'Wipe your paws.',
  phone: 'Still on 2 percent.',
  chest: 'Wrong ocean.',
  egg: 'Not yet.',
  plesiosaur: 'Alberta had a beach once.',
  trilobite: 'Here first.',
  reservoir: 'You made it. The pumpjack says hi.',
  // Deeper still (log-deep.ts): on the way through the Earth.
  diamond: 'Pressure makes diamonds.',
  lunchbox: 'Halfway. Snack break.',
  whale: 'Long way from Alberta.',
  nugget: 'Not today, prospector.',
  // The eight fillers (Jay's lines, Oct 6).
  hardhat: "Found it. Tuesday's hard hat.",
  corebox: 'Core box. Nobody logged it.',
  marshmallow: "Now it's done.",
  compass: 'North is... yes.',
  duck: 'It floats in anything.',
  smoker: 'Deep-sea hot tub.',
  bottle: 'Return to sender: Alberta.',
  pickup: 'Wrong gate. Very wrong gate.',
  burrito: 'Still frozen in the middle.',
  spoon: 'Shiny.',
  pail: "He'll want that back.",
  mole: 'Is this Alberta?',
  squid: 'Just passing through.',
} as const;

/**
 * WITNESS LINES: while a gag is on screen, the player's next move makes that truck's driver say
 * the gag's line. Once per gag per level. Keyed by the gag's id (gag-triggers.ts `GagId`).
 */
export const WITNESS_LINES = {
  magpie: 'Not that bird again.',
  worker: 'Is he on the clock?',
  moose: "He's still there, eh.",
  nearMiss: "That's my cousin.",
  landowner: 'Smile and wave, boys.',
  biffyA: 'Occupied. Trust me.',
  biffyB: "I'm not touching that roll.",
  marshmallow: 'Save me one.',
  geese: "They're early this year.",
  bear: 'Do NOT make eye contact.',
  bull: 'Spring fever, eh.',
  porcupine: "That's gonna sting.",
  gopherLunch: 'Gopher eats better than we do.',
  sam: "Act natural. Sam's here.",
  tongue: 'Every winter. Every single winter.',
  surveyor: 'It was fine where it was.',
  deer: "Somebody's itchy.",
  tourists: 'Should have brought the bug spray.',
  // Wave 3 (Jay's own, Oct 6).
  muskeg: 'The muskeg always collects its toll.',
  catTrain: "Now that's a cat train.",
  beaver: "That pipe's not going to spec.",
  aurora: "He'll get that high note someday.",
  tumbleweed: "The whole family's moving out.",
  pdogs: 'Tough crowd.',
  bale: 'That bale had places to be.',
  cloud: 'Forecast says sunny. Not for him.',
  // (Clearwater: Jay's own, Oct 8.)
  golf: 'Keep your head down, Moe.',
  cold: 'Hole in none.',
  wash: 'Missed a spot.',
  bell: 'Did somebody say supper?',
  pea: "Don't eat it all at once, Moe.",
};
