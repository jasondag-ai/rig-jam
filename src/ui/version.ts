// The app's version and this build's id, set at build time (vite.config.ts): shown at the bottom
// of Settings, copied into feedback, and compared with the live `version.json` to tell an open or
// installed copy that a new version is out (update.ts).
declare const __APP_VERSION__: string;
declare const __APP_BUILD__: string;

export const APP = {
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0',
  build: typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : 'dev',
} as const;

/** "Version 0.9.0 (a1b2c3d)". */
export const versionText = (app: { version: string; build: string } = APP): string => `Version ${app.version} (${app.build})`;
