# Rush Hour Rigs

A mobile-first sliding puzzle set on a 6x6 oilfield lease pad. Drag each truck along its length and
drive it out through the gate of its color. Clear the pad in as few moves as you can.

**Play:** https://jasondag-ai.github.io/rush-hour-rigs/

## Develop
```
npm install
npm run dev -- --host   # open the Network URL on your phone (same Wi-Fi)
npm test
npm run build
npm run check-levels    # print every level with its optimal solution
```

Built with TypeScript, Vite and plain DOM. Rules live in `src/engine` (pure, unit-tested);
rendering and input in `src/ui`; levels in `src/levels/levels.json`.
