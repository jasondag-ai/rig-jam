// The one-time "Tap for sound" nudge on a player's first win card. Sound is off until the player
// turns it on (settings.ts), and a new player may never find the switches in Settings: so the first
// win card carries one small chip that turns the effects and the music on with a tap. It is offered
// once, ever, on this phone (its own key, kept by "Reset progress" like the sound settings), and
// never to a player who already has sound on.
import type { AudioSettings } from './settings.ts';

export const NUDGE_KEY = 'rush-hour-rigs-sound-nudge';
export const NUDGE_TEXT = 'Tap for sound';

/**
 * Is the nudge due? Not if any sound is on, not if it was offered before. Automated browsers skip
 * it (it would sit on every test's first win card) unless `?soundnudge=1`; `?soundnudge=0` never.
 */
export function nudgeDue(settings: AudioSettings, offered: boolean, search = '', webdriver = false): boolean {
  const pin = new URLSearchParams(search).get('soundnudge');
  if (pin === '0' || settings.sfx || settings.music || offered) return false;
  return pin === '1' || !webdriver;
}

export function nudgeOffered(): boolean {
  try {
    return localStorage.getItem(NUDGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markNudgeOffered(): void {
  try {
    localStorage.setItem(NUDGE_KEY, '1');
  } catch {
    // (Private mode: it may be offered again. No harm.)
  }
}
