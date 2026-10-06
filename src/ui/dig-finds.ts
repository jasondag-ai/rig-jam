// THE DIG'S FINDS: what lies in the dirt between the reservoir and the far side of the Earth
// (log-deep.ts draws the dig; log-dig-view.ts puts it on the page). A data file, for Jay to add to.
//
// A find is tapped like a buried thing: it wiggles and says its one line (and it gives a tiny
// wiggle by itself as it slides into view). To add one: give it a row in `DIG_FINDS` (take a place
// from `DIG_SLOTS` and delete that slot), a drawing in log-deep.ts (`FIND_ART`, keyed by its id)
// and a line in lines.ts (`BURIED_LINES`, same id).
//
// THE RHYTHM (Jay, Oct 6): a PLACE (a find or an empty slot) about every 3 to 4 phone screens,
// slightly uneven, never two on one screen, and NOTHING in the last 5 screens before the island,
// to build suspense. `screen` is how many phone screens below the reservoir a place lies (the dig
// is 60 screens: log-deep.ts `DIG`); `layer` must be the layer that screen falls in (a test checks).
import type { DeepId } from './log-deep.ts';

export interface DigFind {
  id: 'nugget' | 'burrito' | 'diamond' | 'spoon' | 'pail' | 'lunchbox' | 'mole' | 'whale' | 'squid';
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
  { id: 'nugget', label: 'Gold nugget in a quartz vein', layer: 'granite', screen: 1.6, x: 0.32, w: 70, h: 52 },
  { id: 'burrito', label: 'Frozen burrito', layer: 'mantle', screen: 5.1, x: 0.58, w: 68, h: 42 },
  { id: 'diamond', label: 'Diamond', layer: 'mantle', screen: 8.4, x: 0.3, w: 50, h: 46 },
  { id: 'spoon', label: "The magpie's stolen spoon", layer: 'mantle', screen: 12.0, x: 0.62, w: 34, h: 64 },
  { id: 'pail', label: "The sleepy worker's pail", layer: 'innerCore', screen: 22.7, x: 0.3, w: 50, h: 52 },
  // (Dead on the centre of the Earth: the middle of the inner core.)
  { id: 'lunchbox', label: 'Lost lunchbox', layer: 'innerCore', screen: 25.0, x: 0.6, w: 60, h: 50 },
  { id: 'mole', label: 'A mole in a headlamp', layer: 'mantleUp', screen: 35.9, x: 0.36, w: 60, h: 58 },
  { id: 'whale', label: 'Whale', layer: 'ocean', screen: 50.6, x: 0.42, w: 150, h: 70 },
  { id: 'squid', label: 'Giant squid', layer: 'ocean', screen: 54.2, x: 0.56, w: 96, h: 150 },
];

/**
 * EMPTY SLOTS, marked for future gag finds: the places in the rhythm where nothing is drawn yet.
 * (With these filled there is something every 3 to 4 screens all the way down; until then the
 * outer core and the way back up are long quiet stretches.)
 */
export const DIG_SLOTS: { slot: string; layer: DeepId; screen: number; x: number }[] = [
  { slot: 'slot-01', layer: 'outerCore', screen: 15.7, x: 0.4 },
  { slot: 'slot-02', layer: 'outerCore', screen: 19.1, x: 0.6 },
  { slot: 'slot-03', layer: 'outerCoreUp', screen: 28.7, x: 0.35 },
  { slot: 'slot-04', layer: 'outerCoreUp', screen: 32.1, x: 0.6 },
  { slot: 'slot-05', layer: 'mantleUp', screen: 39.6, x: 0.62 },
  { slot: 'slot-06', layer: 'mantleUp', screen: 43.2, x: 0.3 },
  { slot: 'slot-07', layer: 'mantleUp', screen: 46.8, x: 0.55 },
];

/** The last screens before the island stay empty. */
export const QUIET_SCREENS = 5;
