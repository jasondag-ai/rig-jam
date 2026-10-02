// Sound settings, saved on this phone. Kept under their own key (not the `rush-hour-rigs:` prefix),
// so "Reset progress" wipes levels and streak but leaves sound choices alone.
export type MusicStyle = 'synth' | 'country' | 'lofi';

export const MUSIC_STYLES: { id: MusicStyle; name: string }[] = [
  { id: 'synth', name: '80s Synth' },
  { id: 'country', name: 'Country Twang' },
  { id: 'lofi', name: 'Chill Lo-fi' },
];

export interface AudioSettings {
  sfx: boolean;
  music: boolean;
  style: MusicStyle;
}

export const DEFAULT_AUDIO: AudioSettings = { sfx: true, music: false, style: 'synth' };
export const AUDIO_KEY = 'rush-hour-rigs-audio';

/** Reads saved settings, falling back to the defaults for anything missing or odd. */
export function parseAudioSettings(raw: string | null): AudioSettings {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<AudioSettings>) : {};
    return {
      sfx: typeof v.sfx === 'boolean' ? v.sfx : DEFAULT_AUDIO.sfx,
      music: typeof v.music === 'boolean' ? v.music : DEFAULT_AUDIO.music,
      style: MUSIC_STYLES.some((s) => s.id === v.style) ? (v.style as MusicStyle) : DEFAULT_AUDIO.style,
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
