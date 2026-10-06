// Sound settings, saved on this phone. Kept under their own key (not the `rush-hour-rigs:` prefix),
// so "Reset progress" wipes levels and streak but leaves sound choices alone.
import { MUSIC_STYLES, type MusicStyle } from './pack.ts';

export { MUSIC_STYLES, type MusicStyle };

export interface AudioSettings {
  sfx: boolean;
  music: boolean;
  style: MusicStyle;
}

/** SOUND IS OFF until the player turns it on: no effects, no music. Country is the first style. */
export const DEFAULT_AUDIO: AudioSettings = { sfx: false, music: false, style: 'country' };
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
