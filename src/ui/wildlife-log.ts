// The Wildlife Log: each gag is collected the first time it fully plays; its card shows a still of
// its own puppet. Every gag is a sighting to find: a locked card shows a riddle, and its plain hint
// (how to set the gag off) when tapped; demo mode shows the plain hint at once. Finding them all unlocks camo pickups (on by default once earned, with a switch in
// Settings). Saved on this phone under a `rush-hour-rigs:` key, so "Reset progress" clears it too.
// `?log=all` previews a full log.
import { demoLink } from './demo-link.ts';
import { STORAGE_PREFIX } from './progress.ts';
import { dressCamo } from './sprites.ts';

export type Sighting = 'magpie' | 'spotter' | 'moose' | 'nearmiss' | 'landowner' | 'biffy' | 'biffyB' | 'marshmallow' | 'geese' | 'porcupine' | 'lunch' | 'sam' | 'tongue' | 'surveyor' | 'deer' | 'tourists' | 'night' | 'bull' | 'bear' | 'muskeg' | 'cattrain' | 'beaver' | 'aurora' | 'tumbleweed' | 'pdogs' | 'bale' | 'cloud' | 'swings' | 'cold' | 'wash' | 'bell' | 'pea' | 'dug' | 'overweight' | 'cranes' | 'bison' | 'hare' | 'ice' | 'frogs' | 'mosquito';

export interface LogEntry {
  id: Sighting;
  name: string;
  caption: string;
  /** The plain hint: where, and what to do. Short, no em dashes. A locked card shows it when tapped (demo mode shows it at once). */
  hint: string;
  /** What a locked card says first: a riddle-style nudge that points the way without giving it away. */
  riddle: string;
  /** The rare one: gold frame and a LEGENDARY tag on its card, found or not. */
  legendary?: boolean;
  /** A hidden entry has no card at all until it is found (it still counts toward the camo). */
  hidden?: boolean;
}

/** One entry per gag in the game, in the order the page lists them. */
export const LOG_ENTRIES: LogEntry[] = [
  { id: 'magpie', name: 'Magpie', caption: 'Never park under a tree.', hint: "Tap a truck without dragging it.", riddle: "A parked truck, a light touch, and trouble from above." },
  { id: 'spotter', name: 'Sleepy Worker', caption: 'On the clock. Allegedly.', hint: "Slide one truck into another.", riddle: "When two trucks meet, somebody finds a quiet seat." },
  { id: 'moose', name: 'Moose', caption: 'Just checking in.', hint: "In Duvernay, bump a truck into the top berm twice.", riddle: "Knock twice on the north wall when the snow is down." },
  { id: 'nearmiss', name: 'Near Miss', caption: 'Owns the lease. Pays no rent.', hint: "In Cardium, drive two trucks out one right after the other.", riddle: "Two leave Cardium in a hurry. Somebody underground notices." },
  { id: 'landowner', name: 'Angry Landowner', caption: 'Wants a word about the ruts.', hint: "Drive one truck back and forth four times, or wiggle it fast.", riddle: "Back and forth, back and forth. Somebody owns that grass." },
  { id: 'biffy', name: 'Occupied', caption: 'Knock first.', hint: "Bump a truck into the bottom berm.", riddle: "Knock on the south wall. Somebody is home." },
  { id: 'biffyB', name: 'The Runaway Roll', caption: 'It got away from him.', hint: "Bump the bottom berm twice, quickly.", riddle: "Knock on the south wall twice, fast. Something gets loose." },
  { id: 'marshmallow', name: 'Marshmallow', caption: 'Mmm. Crispy.', hint: "Tap a flare stack three times.", riddle: "The flame is lit. Third time is a snack." },
  { id: 'geese', name: 'Lost Goose', caption: 'Wrong way, buddy.', hint: "Press Undo three times in a row.", riddle: "Take it back, take it back, take it back. Then look up." },
  { id: 'porcupine', name: 'Porcupine', caption: 'Check behind the bush first.', hint: "In Cardium, tap the bush three times.", riddle: "Three knocks on a Cardium bush. Somebody prickly lives there." },
  { id: 'lunch', name: 'Gopher Lunch', caption: 'He left you the crust.', hint: "In Cardium, press Hint.", riddle: "Ask for help in Cardium. Somebody was about to eat." },
  { id: 'sam', name: 'Safety Sam', caption: 'See me.', hint: "Bump three times in a row, or push a truck at a wrong-colour gate.", riddle: "Three strikes, or the wrong door. Somebody is writing it down." },
  { id: 'tongue', name: 'Frozen Tongue', caption: 'HEWP!', hint: "On a winter level, tap the frosty pipe stand three times.", riddle: "Cold steel in winter. Three taps and somebody will lick it." },
  { id: 'surveyor', name: 'Surveyor', caption: 'Off a metre. Or not.', hint: "Press Restart.", riddle: "Start over, and somebody checks the measurements." },
  { id: 'deer', name: 'Back Scratcher', caption: "That's the spot.", hint: "Tap the lease sign (spring to fall).", riddle: "The blank sign is good for more than reading." },
  { id: 'tourists', name: 'Tourists', caption: 'A real oil sign!', hint: "Play the Daily Pad. They show up on your first move (spring to fall).", riddle: "Today's pad draws a crowd. Sometimes." },
  { id: 'muskeg', name: 'Muskeg Boots', caption: 'The muskeg keeps what it takes.', hint: "In Mannville, tap the big muskeg puddle three times.", riddle: "The big Mannville puddle is deeper than it looks. Ask it three times." },
  { id: 'cattrain', name: 'Cat Train', caption: 'One always falls behind.', hint: "In Mannville, drive a convoy out in order, one right after the other.", riddle: "One, then two, nose to tail out of Mannville." },
  { id: 'beaver', name: 'Beaver', caption: 'Measure twice. Bonk once.', hint: "In Mannville, tap the tall aspen three times.", riddle: "The tall Mannville aspen is in somebody's way. Knock three times." },
  { id: 'aurora', name: 'Aurora Howl', caption: 'Nobody heard that.', hint: "In Mannville, wait for night, then tap the moon.", riddle: "Mannville after dark. The moon is listening." },
  { id: 'tumbleweed', name: 'Tumbleweed', caption: 'Brought the whole family.', hint: "In Bakken, slide a truck from one end of the pad to the other in one move.", riddle: "Go the whole length of the Bakken in one pull." },
  { id: 'pdogs', name: 'Prairie Dog Wave', caption: 'One always misses his cue.', hint: "In Bakken, tap the same spot on the prairie three times.", riddle: "The same patch of prairie, three times. The neighbours stand up." },
  { id: 'bale', name: 'Runaway Bale', caption: 'It rolled one more inch.', hint: "In Bakken, bump a truck into the bottom berm beside the round bale.", riddle: "Rattle the fence beside the big round bale." },
  { id: 'cloud', name: 'Personal Cloud', caption: 'Some days are like that.', hint: "In Bakken, tap the sky three times.", riddle: "Poke the Bakken sky three times. It pokes back." },
  // Clearwater (the Big Pad). Riddles and plain hints are Jay's own (BIG_PAD_BRIEF.md, Oct 7 20:22). A stacked pair. Out Cold shares Three Swings' trigger and plays only once Three Swings is in this log.
  { id: 'swings', name: 'Three Swings', caption: 'The ball never moved.', hint: "Tap the rig mat stack 3 times.", riddle: "Someone wants to tee off the rig mats." },
  { id: 'cold', name: 'Out Cold', caption: 'Fore.', hint: "After Three Swings, tap the rig mats 3 times again.", riddle: "Moe never quits. Give him another shot." },
  { id: 'wash', name: 'Fresh Wash', caption: 'Spotless. For a second.', hint: "Tap the mud puddle.", riddle: "Nothing stays clean near that puddle." },
  // The other stacked pair: One Pea shares Dinner Bell's trigger and plays only once Dinner Bell is in this log.
  { id: 'bell', name: 'Dinner Bell', caption: 'Moe was nearly on time.', hint: "Clear 5 trucks in a row without Undo.", riddle: "Work hard, eat first." },
  { id: 'pea', name: 'One Pea', caption: 'Watching his carbs.', hint: "After Dinner Bell, clear 5 in a row again.", riddle: "Somebody always misses supper." },
  // Baldonnel (job U6b). Log lines, riddles and plain hints are the reference page's own, word for word (Lunch to Go's
  // plain hint is Jay's of Oct 10: its trigger is one drive over a patch, not the page's three).
  { id: 'overweight', name: 'Overweight', caption: 'Overweight. Again.', hint: "In Baldonnel, push a 3-cell rig into a road ban patch 3 times.", riddle: "Spring roads can't take the weight. Neither can the scale." },
  { id: 'cranes', name: 'Two Left Feet', caption: 'Not his best move.', hint: "In Baldonnel, tap the sky 3 times.", riddle: "Something tall is dancing up there. Ask it down." },
  { id: 'bison', name: 'Right of Way', caption: 'Bison always win.', hint: "In Baldonnel, tap the bison sign.", riddle: "That sign is not a suggestion." },
  { id: 'hare', name: 'Half Dressed', caption: 'Half ready for spring.', hint: "In Baldonnel, tap the snowbank 3 times.", riddle: "Someone is changing behind the snowbank." },
  { id: 'ice', name: 'Last Ice', caption: 'Always a bigger fish.', hint: "In Baldonnel, tap the ice on the pond.", riddle: "One more cast before breakup." },
  { id: 'frogs', name: 'Late Croak', caption: 'Missed the cue.', hint: "In Baldonnel, tap the puddle.", riddle: "The puddle has a choir. One member is late." },
  { id: 'mosquito', name: 'Lunch to Go', caption: 'Takeout.', hint: "In Baldonnel, drive a pickup over a road ban patch.", riddle: "Soft ground, wet ground, hungry ground." },
  { id: 'night', name: 'Night Shift', caption: 'Lights out on the lease.', hint: "Leave any lease alone until it goes dark.", riddle: "Do nothing at all, somewhere the sun goes down." },
  { id: 'bull', name: 'Bull and Cow', caption: 'Spring in the Montney.', hint: "In Montney, tap the cow.", riddle: "She is only grazing in the Montney. Say hello." },
  // Not a gag: found by scrolling the log's own dig right through the Earth (log-deep.ts). Its card shows the player's best time.
  { id: 'dug', name: 'Dug Through', caption: 'Alberta to Kerguelen, the short way.', hint: "Scroll this log down. Keep going. All the way down.", riddle: "This page has a bottom. Probably.", hidden: true },
  { id: 'bear', name: 'Bear', caption: 'Does what bears do in the woods.', hint: "In Duvernay, tap the snowy bush three times.", riddle: "A snowy bush in Duvernay. Three knocks, and luck.", legendary: true },
];
/** How many of the log's entries have been found (a saved log may hold ids from gags since retired). */
export const foundCount = (log: WildlifeLog): number => LOG_ENTRIES.filter((e) => log.found.includes(e.id)).length;
/** What an unfound card says: its riddle; once tapped (`plain`), or always in demo mode, the plain hint. */
export const cardHint = (e: LogEntry, plain: boolean): string => (plain ? e.hint : e.riddle);

export const LOG_KEY = `${STORAGE_PREFIX}log`;
/** Demo mode keeps its own log: its sightings never count toward the real log or camo. Reset clears both. */
export const DEMO_LOG_KEY = `${STORAGE_PREFIX}demo-log`;
const keyFor = (demo: boolean) => (demo ? DEMO_LOG_KEY : LOG_KEY);

export interface WildlifeLog {
  /** Sightings in the order they were found. */
  found: Sighting[];
  /** Camo pickups switched on (only matters once they're earned). */
  camo: boolean;
  /** Camo pickups earned: every entry found (or earned under an earlier, shorter log: that is kept). */
  camoEarned: boolean;
  /** Dug Through: the best time (ms) from the grass to the Kerguelen Islands, and the fewest swipes it has taken. */
  dug?: number;
  dugSwipes?: number;
}

/** Saved-log format: 3 is the puppet gags' log (ids of the retired sprite gags are dropped on load). */
const VERSION = 3;

const IDS = new Set<string>(LOG_ENTRIES.map((e) => e.id));

export function parseLog(raw: string | null): WildlifeLog {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<WildlifeLog>) : {};
    const found = Array.isArray(v.found) ? [...new Set(v.found.filter((x): x is Sighting => IDS.has(x)))] : [];
    const camoEarned = v.camoEarned === true || LOG_ENTRIES.every((e) => found.includes(e.id));
    const swipes = typeof v.dugSwipes === 'number' && Number.isInteger(v.dugSwipes) && v.dugSwipes > 0 ? { dugSwipes: v.dugSwipes } : {};
    const dug = typeof v.dug === 'number' && Number.isFinite(v.dug) && v.dug > 0 ? { dug: v.dug, ...swipes } : {};
    return { found, camo: typeof v.camo === 'boolean' ? v.camo : true, camoEarned, ...dug };
  } catch {
    return { found: [], camo: true, camoEarned: false };
  }
}

/** `?log=all` shows a full log (for previewing the page and the camo skin) without saving it. */
export const previewAll = (search: string) => new URLSearchParams(search).get('log') === 'all';

/** The log as it is SAVED on this phone (no preview link's make-believe): what the finale is earned by (finale-state.ts). */
export const savedLog = (): WildlifeLog => { try { return parseLog(localStorage.getItem(keyFor(false))); } catch { return parseLog(null); } };

/** The real log, or (with `demo`) the separate demo-mode log. */
export function loadLog(demo = false): WildlifeLog {
  let log: WildlifeLog;
  try {
    log = parseLog(localStorage.getItem(keyFor(demo)));
    // A demo log never earns camo, whatever it holds.
    if (demo) log = { ...log, camoEarned: false };
  } catch {
    log = parseLog(null);
  }
  // (`?demo=1`, the hidden link for recording video: every card is shown found. The trucks keep their own paint:
  // camo is not handed out by it. Nothing is saved: demo-link.ts.)
  if (demoLink()) return { ...log, found: LOG_ENTRIES.map((e) => e.id) };
  return typeof location !== 'undefined' && previewAll(location.search) ? { ...log, found: LOG_ENTRIES.map((e) => e.id), camoEarned: true } : log;
}

/** Saves the log (in preview mode only the camo switch is kept; the real sightings stay as they were). */
export function saveLog(log: WildlifeLog, demo = false): void {
  try {
    if (demo && previewAll(location.search)) return;
    const stored = previewAll(location.search) ? { ...parseLog(localStorage.getItem(LOG_KEY)), camo: log.camo } : log;
    localStorage.setItem(keyFor(demo), JSON.stringify({ v: VERSION, ...stored, ...(demo ? { camoEarned: false } : {}) }));
  } catch {
    // Storage blocked: the log lasts for this visit only.
  }
}

export const complete = (log: WildlifeLog) => LOG_ENTRIES.every((e) => log.found.includes(e.id));
/** Camo pickups show once earned, unless switched off in Settings. */
export const camoOn = (log: WildlifeLog) => log.camoEarned && log.camo;

/** A gag fully played: adds it if it's new. `completed` is true on the sighting that finishes the log. */
export function record(log: WildlifeLog, id: Sighting): { log: WildlifeLog; isNew: boolean; count: number; completed: boolean } {
  if (log.found.includes(id)) return { log, isNew: false, count: log.found.length, completed: false };
  const found = [...log.found, id];
  const done = LOG_ENTRIES.every((e) => found.includes(e.id));
  const next = { ...log, found, camoEarned: log.camoEarned || done };
  return { log: next, isNew: true, count: found.length, completed: done };
}

/**
 * The dig went right through: Dug Through is found (the first time) and the bests kept: the
 * shortest time and the fewest swipes (each on its own). `newBest` is true the first time and
 * whenever the time is beaten; `fewest` likewise for the swipes.
 */
export function recordDig(log: WildlifeLog, ms: number, swipes: number): { log: WildlifeLog; isNew: boolean; count: number; completed: boolean; best: number; bestSwipes: number; newBest: boolean; fewest: boolean } {
  const r = record(log, 'dug');
  const newBest = log.dug === undefined || ms < log.dug;
  const fewest = log.dugSwipes === undefined || swipes < log.dugSwipes;
  const best = newBest ? ms : log.dug!, bestSwipes = fewest ? swipes : log.dugSwipes!;
  return { ...r, log: { ...r.log, dug: best, dugSwipes: bestSwipes }, best, bestSwipes, newBest, fewest };
}

/** The entries that have a card: every one but a hidden entry not found yet. */
export const shownEntries = (log: WildlifeLog): LogEntry[] => LOG_ENTRIES.filter((e) => !e.hidden || log.found.includes(e.id));

export const sightingToast = (id: Sighting, count: number, demo = false) =>
  `${demo ? 'Demo' : 'New'} sighting! ${LOG_ENTRIES.find((e) => e.id === id)?.name ?? id} (${count}/${LOG_ENTRIES.length})`;

/** Every pickup in the game wears camo in its own gate colour (a class on <body>; sprites.ts picks the camo sprite). */
export function applyCamo(log: WildlifeLog = loadLog()): void {
  document.body.classList.toggle('camo-pickups', camoOn(log));
  dressCamo();
}
