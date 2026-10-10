# Rig Jam

Renamed from Rush Hour Rigs on Oct 9, 2026 (trademark).

A mobile-first sliding puzzle set on an oilfield lease pad. Drag each truck along its length (or flick it) and
drive it out through the gate of its colour. Clear the pad in as few moves as you can.

Version 1.0.0 (Oct 10, 2026): seven regions and 70 levels (Cardium, Montney, Duvernay, Mannville, Bakken,
Clearwater's 8 x 8 Big Pad, Baldonnel), a Daily Pad every day, a Sunday Turnaround every week, 40 sightings to
find for the Wildlife Log, four music styles, and an ending for a perfect game.

**Play:** https://jasondag-ai.github.io/rig-jam/

## Develop
```
npm install
npm run dev -- --host   # open the Network URL on your phone (same Wi-Fi)
npm test
npm run build
npm run check-levels    # print every level with its optimal solution
npm run gen-levels      # regenerate levels from the slot targets in tools/gen-levels.ts
```

Built with TypeScript, Vite and plain DOM (GSAP for a little character animation). Rules live in `src/engine`
(pure, unit-tested); rendering and input in `src/ui`; sound in `src/audio`; levels are generated into
`src/levels/` by the tools in `tools/`. Everything anybody says is in `src/ui/lines.ts`.

## Two sites
- **Live:** https://jasondag-ai.github.io/rig-jam/ is built from `main` by the GitHub Action on every push.
  After a push, `sh tools/check-live.sh` waits until the site's `version.json` shows the pushed build id.
- **Dev copy:** https://jasondag-ai.github.io/rig-jam-next/ is built from branch `next`
  (`sh tools/push-dev.sh`). New work goes there first; it is merged into `main` when it ships.

Both read the same save on a phone, so nothing saved is ever renamed, dropped or reset: see CLAUDE.md,
"An old save keeps everything" and "The dev lane". `CLAUDE.md` is the full notebook of how the game is built.
