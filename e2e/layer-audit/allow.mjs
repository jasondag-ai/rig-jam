// THE LAYER AUDIT'S ALLOW LIST (job U17): cover-ups and cut-offs that are ON PURPOSE. Each rule says which scenario
// (a pattern on its name), what kind (covered or clipped), by what, and in one line WHY it is meant. A flag no rule
// answers for is a bug, and fails the test: fix it, or, if it is meant, add its rule here with its reason.
export const ALLOW = [
  { scenario: /^sighting: beaver/, kind: 'covered', by: /the lane aspen/, why: 'The joke itself: upright, his pipe and he squeeze past BEHIND the aspen.' },
  { scenario: /^sighting: (muskeg|catTrain|cattrain|tourists|surveyor|deer|landowner|sam|biffy)/, kind: 'covered', by: /the lane aspen/, why: "Mannville's lane aspen stands in front of the walking lane on every level (the depth rule): whoever walks the lane passes behind its trunk." },
  { scenario: /^sighting: bell/, kind: 'covered', by: /the rig mats/, why: 'Dinner Bell: two of the four in the stampede run BEHIND the rig mat stack and two in front, as the reference draws it.' },
  { scenario: /^sighting: moose/, kind: 'covered', by: /the berm|the lease/, why: 'The moose rises from BEHIND the top berm: only his antlers and head show over it.' },
  { scenario: /^sighting: geese/, kind: 'covered', by: /the berm|the lease|the HUD|a truck|a gate|lease equipment/, why: 'The V flies BEHIND the HUD and the lease; on a short sky band it crosses behind the lease itself, and the feather drifts down behind it.' },
  { scenario: /^sighting: aurora/, kind: 'covered', by: /the HUD|the scenery/, why: 'The northern lights run up behind the HUD, and the coyote leaves BEHIND the front tree line.' },
  { scenario: /^sighting: aurora/, kind: 'clipped', by: /picture's frame|aurora/, why: "The lights are drawn wider than the sky band they are shown in: its frame is the band's own edge." },
  { scenario: /^sighting: (bear|porcupine)/, kind: 'covered', by: /the gag bush/, why: 'The hare and the porcupine hide BEHIND the bush: that is where the joke comes from.' },
  { scenario: /^sighting: nearMiss|^sighting: nearmiss|^sighting: gopherLunch|^sighting: lunch/, kind: 'clipped', by: /.*/, why: 'The gopher comes up out of his hole: his layer ends at the hole line.' },
  { scenario: /^sighting: /, kind: 'covered', by: /a front tree/, why: "The scenery's front trees stand on the strip's floor, in front of the walking lane (the depth rule): a walker passes behind one for a moment." },
  { scenario: /^sighting: .*\(its line\)/, kind: 'covered', by: /the .* sighting/, why: "A line's bubble sits over its speaker's head with its tip on him; a tall thing of the same gag (a raised arm, a hat in the air) may cross a corner of it." },
  { scenario: /^a truck drives out/, kind: 'covered', by: /the HUD|the tip line|the buttons/, why: 'A truck that leaves by the top or the bottom passes UNDER the HUD, the tip line and the buttons (Jay, Oct 6), fading as it goes.' },
  { scenario: /^a truck drives out/, kind: 'clipped', by: /\.screen|screen's edge/, why: "A truck that leaves by a side runs off the edge of the screen (on a desktop, of the game's column): the lease is nearly as wide as the screen." },
  { scenario: /^the confetti/, kind: 'covered', by: /the win card/, why: 'The confetti falls UNDER the win card, never over its buttons.' },
  { scenario: /^the confetti/, kind: 'clipped', by: /.*/, why: 'Confetti falls from above the screen and off its foot.' },
  { scenario: /^the finale: photo/, kind: 'covered', by: /a speech bubble/, why: '"Squeeze in!": the bubble\'s tip is on Moe at the camera, and its end lies over a corner of the camera for a second.' },
  { scenario: /^the finale: photo/, kind: 'covered', by: /the berm|the lease/, why: 'The magpie flies off up and away past the top of the strip: on a short strip its last frames are behind the lease.' },
  { scenario: /^the finale: credits/, kind: 'clipped', by: /the credits/, why: 'The credits roll: a line comes in at the foot of their box and leaves at its top.' },
  { scenario: /^the dig: the far side/, kind: 'covered', by: /the confetti/, why: 'The hard-hat confetti falls over the whole page for a second and a half on arrival.' },
  { scenario: /^the log: its cards/, kind: 'covered', by: /the depth gauge/, why: "Beside the cards the gauge is a slim tab in the page's margin; it may touch a card's edge, never its picture or caption." },
];
/** The call on one flag: intended (and why), or a bug. */
export function judge(f) {
  const rule = ALLOW.find((r) => r.scenario.test(f.scenario) && r.kind === f.kind && r.by.test(f.by));
  return rule ? { call: 'intended', why: rule.why } : { call: 'BUG', why: '' };
}
