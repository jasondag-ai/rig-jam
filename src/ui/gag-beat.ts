// A gag reaches a beat: its layer is marked (`data-beat`, which the tests read) and the beat's
// sounds play (audio/gag-sounds.ts), once, as the beat starts.
import { sound } from '../audio/engine.ts';
import type { GagId } from './gag-triggers.ts';

export function markBeat(layer: HTMLElement, id: GagId, beat: string): void {
  if (layer.dataset.beat === beat) return;
  layer.dataset.beat = beat;
  sound.gag(id, beat);
}
