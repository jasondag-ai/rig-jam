// THE DIG'S FINDS: what lies in the dirt between the reservoir and the far side of the Earth
// (log-deep.ts draws the dig; log-dig-view.ts puts it on the page). A data file, for Jay to add to.
//
// A find is tapped like a buried thing: it wiggles and says its one line (and it gives a tiny
// wiggle by itself as it slides into view). To add one: give it a row in `DIG_FINDS` (take a place
// from `DIG_SLOTS` and delete that slot), a drawing in log-deep.ts (`FIND_ART`, keyed by its id)
// and a line in lines.ts (`BURIED_LINES`, same id).
//
// THE RHYTHM (Jay, Oct 6): A FIND about every 3 to 4 phone screens (the empty slots do not count),
// slightly uneven, never two on one screen, and NOTHING in the last 5 screens before the island,
// to build suspense. `screen` is how many phone screens below the reservoir a place lies (the dig
// is 60 screens: log-deep.ts `DIG`); `layer` must be the layer that screen falls in (a test checks).
// The layers' heights (log-deep.ts `PLAN`) are cut to fit this rhythm: three finds in the basement
// need nine screens of it, two on the seafloor need five.
import type { DeepId } from './log-deep.ts';

export interface DigFind {
  id: 'nugget' | 'hardhat' | 'corebox' | 'marshmallow' | 'burrito' | 'diamond' | 'spoon' | 'pail' | 'lunchbox' | 'compass' | 'mole' | 'duck' | 'smoker' | 'bottle' | 'whale' | 'squid' | 'pickup';
  /** For screen readers. */
  label: string;
  layer: DeepId;
  /** Phone screens below the reservoir (its centre). */
  screen: number;
  /** Its centre across the cards' width (0 to 1; the depth pill rides the right side: keep clear of it). */
  x: number;
  /** Its drawing's size (px). Its tap target is never smaller than 44 px either way. */
  w: number;
  h: number;
}

export const DIG_FINDS: DigFind[] = [
  // The Precambrian basement
  { id: 'nugget', label: 'Gold nugget in a quartz vein', layer: 'granite', screen: 1.3, x: 0.32, w: 70, h: 52 },
  { id: 'hardhat', label: 'Lost hard hat', layer: 'granite', screen: 4.7, x: 0.6, w: 62, h: 46 },
  { id: 'corebox', label: 'Wooden core box', layer: 'granite', screen: 7.8, x: 0.34, w: 88, h: 50 },
  // The mantle (the marshmallow in its upper part)
  { id: 'marshmallow', label: 'Toasted marshmallow on a stick', layer: 'mantle', screen: 11.0, x: 0.62, w: 44, h: 80 },
  { id: 'burrito', label: 'Frozen burrito', layer: 'mantle', screen: 14.5, x: 0.34, w: 68, h: 42 },
  { id: 'diamond', label: 'Diamond', layer: 'mantle', screen: 17.6, x: 0.6, w: 50, h: 46 },
  { id: 'spoon', label: "The magpie's stolen spoon", layer: 'mantle', screen: 20.6, x: 0.32, w: 34, h: 64 },
  // The inner core
  { id: 'pail', label: "The sleepy worker's pail", layer: 'innerCore', screen: 24.4, x: 0.34, w: 50, h: 52 },
  // (Dead on the centre of the Earth: the middle of the inner core. On the right: the centre's own pill is on the left.)
  { id: 'lunchbox', label: 'Lost lunchbox', layer: 'innerCore', screen: 27.5, x: 0.6, w: 60, h: 50 },
  // The outer core, on the way back up
  { id: 'compass', label: 'Spinning compass', layer: 'outerCoreUp', screen: 31.4, x: 0.36, w: 54, h: 54 },
  // The mantle, on the way back up
  { id: 'mole', label: 'A mole in a headlamp', layer: 'mantleUp', screen: 34.8, x: 0.6, w: 60, h: 58 },
  { id: 'duck', label: 'Rubber duck', layer: 'mantleUp', screen: 38.3, x: 0.36, w: 58, h: 52 },
  // The seafloor (upside down to us, like everything on the far side)
  { id: 'smoker', label: 'Black smoker vent with tube worms', layer: 'seafloor', screen: 42.0, x: 0.58, w: 84, h: 116 },
  { id: 'bottle', label: 'Message in a bottle', layer: 'seafloor', screen: 45.3, x: 0.34, w: 76, h: 44 },
  // The Southern Ocean
  { id: 'whale', label: 'Whale', layer: 'ocean', screen: 48.5, x: 0.42, w: 150, h: 70 },
  { id: 'squid', label: 'Giant squid', layer: 'ocean', screen: 51.7, x: 0.56, w: 96, h: 150 },
  { id: 'pickup', label: 'Sunk pickup truck', layer: 'ocean', screen: 54.7, x: 0.36, w: 124, h: 76 },
];

/**
 * EMPTY SLOTS, marked for future gag finds: places between two finds where nothing is drawn yet
 * (each a screen and a half or more from its neighbours, so a new find never shares a screen).
 * They do not count toward the rhythm. Keep at least three.
 */
export const DIG_SLOTS: { slot: string; layer: DeepId; screen: number; x: number }[] = [
  { slot: 'slot-01', layer: 'outerCore', screen: 22.5, x: 0.4 },
  { slot: 'slot-02', layer: 'outerCoreUp', screen: 33.1, x: 0.36 },
  { slot: 'slot-03', layer: 'mantleUp', screen: 36.55, x: 0.6 },
  { slot: 'slot-04', layer: 'ocean', screen: 50.1, x: 0.3 },
];

/** The last screens before the island stay empty. */
export const QUIET_SCREENS = 5;
