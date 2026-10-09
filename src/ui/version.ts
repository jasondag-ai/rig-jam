// The app's version and this build's id, set at build time (vite.config.ts): shown at the bottom
// of Settings, copied into feedback, and compared with the live `version.json` to tell an open or
// installed copy that a new version is out (update.ts).
declare const __APP_VERSION__: string;
declare const __APP_BUILD__: string;
declare const __APP_CHANNEL__: string;

export const APP = {
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0',
  build: typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : 'dev',
  /** 'dev' on the dev lane's copy (/rig-jam-next/), 'live' everywhere else. */
  channel: (typeof __APP_CHANNEL__ === 'string' && __APP_CHANNEL__ === 'dev' ? 'dev' : 'live') as 'live' | 'dev',
} as const;

/** Is this the dev lane's copy? It wears a small DEV label (Settings' version line, a corner of the home page). */
export const isDev = (app: { channel?: string } = APP): boolean => app.channel === 'dev';

/** "Version 0.9.0 (a1b2c3d)"; on the dev copy, "Version 0.9.0 (a1b2c3d) DEV". */
export const versionText = (app: { version: string; build: string; channel?: string } = APP): string => `Version ${app.version} (${app.build})${isDev(app) ? ' DEV' : ''}`;
