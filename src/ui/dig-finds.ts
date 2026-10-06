// THE DIG'S FINDS: what lies in the dirt between the reservoir and the far side of the Earth
// (log-deep.ts draws the dig; log-dig-view.ts puts it on the page). A data file, for Jay to add to.
//
// A find is tapped like a buried thing: it wiggles and says its one line. To add one: give it a
// row in `DIG_FINDS` (take a place from `DIG_SLOTS` and delete that slot), a drawing in
// log-deep.ts (`FIND_ART`, keyed by its id) and a line in lines.ts (`BURIED_LINES`, same id).
import type { DeepId } from './log-deep.ts';

export interface DigFind {
  id: 'diamond' | 'lunchbox' | 'whale';
  /** For screen readers. */
  label: string;
  /** The layer it lies in, and how far down that layer (0 = its top, 1 = its foot). */
  layer: DeepId;
  at: number;
  /** Its centre across the cards' width (0 to 1; keep to 0.82 or less: the depth pill rides the right side). */
  x: number;
  /** Its drawing's size (px). Its tap target is never smaller than 44 px either way. */
  w: number;
  h: number;
}

/** Sparse on purpose: three finds in about sixty screens of dirt. */
export const DIG_FINDS: DigFind[] = [
  { id: 'diamond', label: 'Diamond', layer: 'mantle', at: 0.42, x: 0.3, w: 50, h: 46 },
  // (Dead on the centre of the Earth: the middle of the inner core.)
  { id: 'lunchbox', label: 'Lost lunchbox', layer: 'innerCore', at: 0.5, x: 0.6, w: 60, h: 50 },
  { id: 'whale', label: 'Whale', layer: 'ocean', at: 0.45, x: 0.42, w: 150, h: 70 },
];

/**
 * EMPTY SLOTS, marked for future gag finds: places spread through the dirt where nothing is drawn
 * yet. Each is clear of the three finds above and of each other.
 */
export const DIG_SLOTS: { slot: string; layer: DeepId; at: number; x: number }[] = [
  { slot: 'slot-01', layer: 'granite', at: 0.5, x: 0.3 },
  { slot: 'slot-02', layer: 'mantle', at: 0.12, x: 0.62 },
  { slot: 'slot-03', layer: 'mantle', at: 0.68, x: 0.55 },
  { slot: 'slot-04', layer: 'mantle', at: 0.9, x: 0.25 },
  { slot: 'slot-05', layer: 'outerCore', at: 0.3, x: 0.4 },
  { slot: 'slot-06', layer: 'outerCore', at: 0.75, x: 0.65 },
  { slot: 'slot-07', layer: 'innerCore', at: 0.2, x: 0.3 },
  { slot: 'slot-08', layer: 'innerCore', at: 0.82, x: 0.45 },
  { slot: 'slot-09', layer: 'outerCoreUp', at: 0.5, x: 0.3 },
  { slot: 'slot-10', layer: 'mantleUp', at: 0.25, x: 0.6 },
  { slot: 'slot-11', layer: 'mantleUp', at: 0.7, x: 0.35 },
  { slot: 'slot-12', layer: 'oceanCrust', at: 0.5, x: 0.5 },
  { slot: 'slot-13', layer: 'ocean', at: 0.15, x: 0.7 },
  { slot: 'slot-14', layer: 'ocean', at: 0.8, x: 0.3 },
];
