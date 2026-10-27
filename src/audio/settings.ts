// Sound settings, saved on this phone. Kept under their own key (not the `rush-hour-rigs:` prefix),
// so "Reset progress" wipes levels and streak but leaves sound choices alone.
import { MUSIC_STYLES, type MusicStyle } from './pack.ts';

export { MUSIC_STYLES, type MusicStyle };

export interface AudioSettings {
  sfx: boolean;
  music: boolean;
  style: MusicStyle;
}

/**
 * EFFECTS ARE ON for a new player, MUSIC IS OFF (Jay, Oct 26; job U30). A family tester reported
 * the game "needed more sound effects": it has 74, and they had simply never turned them on. Sound
 * used to be off until the player found the switches, and the only thing that said so was a
 * one-time "Tap for sound" chip on their first win card (sound-nudge.ts). One missed tap cost them
 * the whole sound design, permanently.
 *
 * The effects are 1.0 MB, fetched after the first tap and never blocking play. The music stays off:
 * it is a couple of megabytes more, and a soundtrack starting unprompted is what makes someone
 * close a game in public. Both are still one switch away in Settings.
 *
 * This default applies ONLY when nothing is saved. Anyone who has already chosen keeps their
 * choice, in either direction (parseAudioSettings below, and its tests).
 */
export const DEFAULT_AUDIO: AudioSettings = { sfx: true, music: false, style: 'country' };
export const AUDIO_KEY = 'rush-hour-rigs-audio';
/** The synth styles of the old sound engine, and what each has become. */
const OLD_STYLES: Record<string, MusicStyle> = { synth: 'retro', lofi: 'chill' };

/** Reads saved settings, falling back to the defaults for anything missing or odd. A style saved under the old engine keeps its nearest new one. */
export function parseAudioSettings(raw: string | null): AudioSettings {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<Record<keyof AudioSettings, unknown>>) : {};
    const style = typeof v.style === 'string' ? (OLD_STYLES[v.style] ?? v.style) : null;
    return {
      sfx: typeof v.sfx === 'boolean' ? v.sfx : DEFAULT_AUDIO.sfx,
      music: typeof v.music === 'boolean' ? v.music : DEFAULT_AUDIO.music,
      style: MUSIC_STYLES.some((s) => s.id === style) ? (style as MusicStyle) : DEFAULT_AUDIO.style,
    };
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}

export function loadAudioSettings(): AudioSettings {
  try {
    return parseAudioSettings(localStorage.getItem(AUDIO_KEY));
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}

export function saveAudioSettings(s: AudioSettings): void {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: settings last for this visit only.
  }
}
