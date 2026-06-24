# mother, not metaphor

A mobile-native generative poem at `oulipo.xyz/mother-not-metaphor`. Five moments,
five tongues (EN / FR / AR-romanized / AR-Levantine / PT-BR) for one mother. Each
moment is a layout of three components - a **camera** (the performer), the
**words** (revealed like live transcription, with an English translation), and a
flat-geometric **illustration** that morphs, paced to speech.

The piece is also a **reusable poem engine**: the whole thing is data
(`data/poem.json`) driven by a small set of modules. New poems = new JSON + new
keyframes, same machine.

## Run it

```bash
npm install            # @playwright/test + html-validate (dev only)
npm run serve          # static server on http://localhost:4180
npm test               # unit + html lint + purity + e2e
```

Useful URLs while developing:

- `/?mode=auto` - skip the start tap, play the timed (no-camera) version
- `/?mode=live` - force the camera + hand-tracking path
- `/?speed=8` - speed timing up (tests / impatience)
- `/?loop=1` - loop after the last moment

In the console, `window.MNM` exposes `state()`, `next()`, `goTo(i)`, and
`still(i, k)` (freeze on moment `i`, keyframe `k`) for debugging.

## How it works

| concern                                  | where                          | tested by                      |
| ---------------------------------------- | ------------------------------ | ------------------------------ |
| perceptual color blends (OKLab)          | `src/color.js`                 | `tests/unit/color.test.mjs`    |
| rectangle frame morphing + count padding | `src/morph.js`                 | `tests/unit/morph.test.mjs`    |
| speaking-rate timing                     | `src/pacing.js`                | `tests/unit/pacing.test.mjs`   |
| hand-shape signatures                    | `src/gestures.js`              | `tests/unit/gestures.test.mjs` |
| poem data shape                          | `data/poem.json`               | `tests/unit/poem.test.mjs`     |
| SVG illustration renderer                | `src/illustration.js`          | e2e                            |
| typewriter words                         | `src/words.js`                 | e2e                            |
| layouts + FLIP transitions               | `src/layout.js`                | e2e                            |
| camera                                   | `src/camera.js`                | e2e (fallback path)            |
| MediaPipe hand tracking                  | `src/hands.js`                 | live only                      |
| orchestration                            | `src/player.js`, `src/main.js` | e2e                            |

The four pure modules (`color`, `morph`, `pacing`, `gestures`) are DOM-free so
Node can unit-test the logic directly. Everything that touches the DOM is covered
by Playwright (mobile + desktop + reduced-motion).

### Morphing

Every illustration frame is an array of cells (rectangles). To go from one frame
to the next we pad to a common cell count (extra cells are born from / die into a
point), interpolate geometry linearly, and interpolate color through **OKLab** so
blue->red passes through vivid purples instead of grey mud. A single
`requestAnimationFrame` loop runs the active tween with an ease-in-out curve.

### Transitions

- **Between moments** (which layout is shown): a stable change in the performer's
  hand shape (MediaPipe Hand Landmarker) advances one moment. With no camera it
  auto-advances on a timer paced to the line.
- **Within a moment** (illustration keyframes): time-paced across the moment's
  spoken duration (`pacing.js`).

### One external dependency

Hand tracking loads MediaPipe `tasks-vision` + the hand-landmarker model from a
CDN (pinned in `src/hands.js`). `scripts/verify-purity.mjs` allows ONLY those two
hosts and blocks all analytics/trackers. If the CDN is blocked or offline, the
piece silently falls back to auto-play.

## Add a new poem

1. Copy this folder (or point a new `index.html` at the same `src/`).
2. Write a new `data/poem.json`:
   - `palette` - named colors (`#rrggbb`).
   - `pacing` - `msPerChar`, `minMomentMs`, `maxMomentMs`, `morphMs`.
   - `moments[]` - each with `lang`, `layout` (`L1`..`L5`), `original`, `english`
     (for non-English), and `illustration.keyframes`.
3. Each keyframe is an array of cells `{ x, y, w, h, fill, o }` in a `0..100`
   viewBox; `fill` is a palette key. Keep the cell **count and order consistent
   within a moment** so frames morph cleanly; counts can differ across moments
   (cells fade in/out).
4. Add or adjust layouts in `styles.css` (`.stage[data-layout="L_"]`) if you need
   arrangements beyond the five.
5. `npm test`.
