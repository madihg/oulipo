# Fragmentary

A small, reusable gesture-control layer for hand-driven web pieces. Fragmentary
turns a camera + MediaPipe hand tracking into deliberate, dwell-to-act gestures,
and shows a legible on-screen finger read-out so the viewer can see the machine
seeing their hand. It was built inside `mother-not-metaphor` but is meant to be
copied whole into future oulipo pieces - hence its own folder (`src/fragmentary/`)
and this document.

## Philosophy

- **Deliberate, not twitchy.** A pose does not fire the moment it is recognized.
  It must be held for a dwell time (~1.5s by default) before it acts. Switches
  feel intentional and almost never happen by accident.
- **Legible.** The viewer sees five bars (one per finger) filling with how open
  each finger is, plus a dwell meter filling toward the action about to fire.
  The hand-read is honest and visible, not hidden magic.
- **Data, not code.** What a gesture does is a JSON config (bindings), not
  hard-coded logic. Ship a default, let an admin console override it, and the
  poem/piece code never changes.
- **Pure where it can be.** The reading, the dwell state machine, and the config
  are DOM-free and Node-testable. Only the HUD touches the DOM; only `hands.js`
  touches the network (a pinned MediaPipe CDN).

## Module map

All under `src/fragmentary/` except `hands.js` and `camera.js` (the browser I/O),
which live in `src/`.

### `gestures.js` - hand-shape reading (pure)

Turns MediaPipe's 21 landmarks into what the control and HUD need.

```
FINGER_NAMES = ['thumb','index','middle','ring','pinky']
fingersUp(landmarks, handedness='Right') -> [bool x5]      // extended fingers
fingerExtensions(landmarks) -> [0..1 x5]                   // continuous openness (HUD bars)
orientation(landmarks) -> 'up'|'down'|'left'|'right'|'none'
handSignature(landmarks, handedness) -> '01100:up'         // discrete pose string
handReading(landmarks, handedness) -> {
  present, up:[bool x5], extensions:[0..1 x5], orientation, signature
}
stableSignature(history, n=5) -> signature|null            // last n identical, else null
signatureChanged(prev, next) -> bool
```

### `control.js` - the dwell state machine (pure)

Feed it a 5-bool `up` array every frame (or `null` when no hand); it decides when
a gesture fires.

```
FINGERS = ['thumb','index','middle','ring','pinky']
patternKey(up) -> '01100'
matchBinding(up, binding) -> bool
bindingSpecificity(binding) -> int          // count of non-'any' constraints
pickBinding(up, bindings) -> binding|null   // most specific match wins
createGestureControl({ dwellMs, stableFrames, bindings }) -> {
  update(up, nowMs) -> { progress, firing, action, binding, stable, candidate, armed, ready },
  reset(),
  setConfig(next),   // patch dwellMs / stableFrames / bindings live
  config             // getter
}
```

`update` returns `progress` 0..1 during the hold and `firing:true` on the single
frame it fires (with `action` = the binding's action). See the state machine
below.

### `config.js` - validate, merge, persist

```
STORAGE_KEY = 'fragmentary:mother-not-metaphor'
FINGERS, ACTIONS = ['next','prev','goto','restart']
normalizeAction(a), normalizeFingers(f), normalizeBinding(b, i)
validateConfig(cfg) -> a complete, clamped config (never throws)
mergeConfig(defaults, override) -> validated config with override layered on top
loadStored(key?) -> cfg|null      // read the localStorage override
saveStored(cfg, key?) -> bool     // write it
clearStored(key?) -> bool         // drop back to the shipped default
```

`validateConfig` clamps `dwellMs` to 300..6000 and `stableFrames` to 1..15, and
drops malformed bindings. The `*Stored` helpers no-op safely when there is no
`localStorage` (e.g. under `node --test`).

### `hud.js` - the on-screen read-out (DOM)

```
createFingerHud(rootEl, { labels=FINGER_NAMES, reduced=false }) -> {
  render({ present, up:[bool x5], extensions:[0..1 x5], progress:0..1, label }),
  flash(),      // brief pulse when a gesture fires (skipped under reduced-motion)
  destroy()
}
```

`render` is called every frame; it fills each finger bar from `extensions`,
highlights bars where `up` is true, drives the dwell meter from `progress`, and
writes the action label. It respects `prefers-reduced-motion`.

### `fragmentary.css` - shared styling

The `fx-*` classes used by the HUD (and by the admin console's preview):
`fx-hud`, `fx-bars`, `fx-bar`, `fx-bar__track`, `fx-bar__fill` (`.is-up`),
`fx-bar__cap`, `fx-meter`, `fx-meter__fill`, `fx-meter__label`, `fx-flash`. It
reads `--ink` / `--paper` from the host page (with neutral fallbacks), so the HUD
inherits the piece's palette. It carries its own reduced-motion rules.

### `src/hands.js`, `src/camera.js` - browser I/O (not pure)

```
loadHandLandmarker() -> Promise<landmarker>                       // pinned MediaPipe CDN
trackHands(landmarker, video, onReading) -> stop()               // onReading(reading, raw)
startCamera(videoEl) -> Promise<stream> ; stopCamera(videoEl)
```

`onReading` is called with `reading = handReading(...)`. `hands.js` is the only
off-origin dependency; the purity check allow-lists exactly the MediaPipe hosts.

## Config schema

```json
{
  "dwellMs": 1500,
  "stableFrames": 4,
  "showHud": true,
  "bindings": [
    {
      "id": "next",
      "label": "open hand → next",
      "action": { "type": "next" },
      "fingers": {
        "thumb": "up",
        "index": "up",
        "middle": "up",
        "ring": "up",
        "pinky": "up"
      }
    },
    {
      "id": "back",
      "label": "peace sign → back",
      "action": { "type": "prev" },
      "fingers": {
        "thumb": "down",
        "index": "up",
        "middle": "up",
        "ring": "down",
        "pinky": "down"
      }
    }
  ]
}
```

- `dwellMs` - how long a pose is held before it fires (300..6000).
- `stableFrames` - frames a pose must be identical before it counts as stable
  (1..15). Higher = steadier but slower to notice.
- `showHud` - whether the finger HUD is shown (the `?hud=off` query param can
  still force it off).
- `bindings[]` - each maps a finger pattern to an action:
  - `id` - stable identifier.
  - `label` - shown in the dwell meter while that gesture arms.
  - `action` - `{ type: 'next'|'prev'|'goto'|'restart', index? }`. `index` is
    only read for `goto`.
  - `fingers` - a constraint per finger: `'any'` (ignore), `'up'` (must be
    extended), `'down'` (must be curled). Fingers you omit default to `'any'`.

Both default bindings are _specific_ poses (`open hand` and `peace sign`), on
purpose: a relaxed or lowered hand reads as neither, so it counts as a **neutral**
that never fires and instead acts as the reset (below). Avoid binding a pose the
hand rests in (e.g. a bare fist ~ a relaxed hand), or a resting hand could match
it. `pickBinding` still resolves overlaps by specificity (most non-`'any'`
constraints win), so you can layer a broad and a narrow binding.

## Dwell state machine

`createGestureControl(...).update(up, nowMs)` makes switching **deliberate** - a
hand that merely appears, settles, or rests never advances on its own:

1. **Stable first.** A pose must be identical for `stableFrames` frames before it
   is considered. Until then `update` reports idle (`progress: 0`).
2. **Arm, do not fire, on the first pose.** The first stable pose only arms the
   machine (`armed:true`), so nothing jumps the instant a hand appears.
3. **Reset before firing.** A matching pose can only start its dwell once the hand
   has passed a **reset** since it armed or last fired - i.e. it was absent
   (`up = null`, key `'none'`) OR held a neutral pose that matches no binding. So
   the motion is "relax, form the shape, hold". `ready:true` marks a matching pose
   that has cleared this gate.
4. **Hold to fire.** Once ready, holding the pose climbs `progress` 0..1 over
   `dwellMs`; at `progress >= 1` the frame returns `firing:true` with the binding's
   `action`. The reset is then consumed, so nothing re-fires until the hand resets
   again.
5. **Most specific binding wins.** If several bindings match, `pickBinding` picks
   the one with the most non-`'any'` constraints.
6. **Relax to repeat.** Because a neutral (unbound) pose is a reset, you do not
   have to drop the hand out of frame between gestures - just relax it, then form
   the next shape. A full drop (`'none'`) resets too.

This kills the accidental-advance case where a hand settles into a bound pose and
just rests there: without a deliberate reset-then-form, it will not fire. Because
the machine is pure and time is passed in (`nowMs`), it is fully deterministic and
unit-tested in `tests/unit/control.test.mjs` (including the "resting hand never
fires" regression).

## The HUD

`createFingerHud(rootEl, ...)` builds five vertical bars plus a horizontal dwell
meter inside `rootEl`:

- Each **finger bar** fills to that finger's `extension` (0..1). When the finger
  reads as `up`, the bar (and its cap letter) go full-ink via the `is-up` class.
- The **dwell meter** (`fx-meter__fill`) fills left-to-right with `progress`, and
  `fx-meter__label` shows the label of the gesture currently arming.
- The whole HUD dims when no hand is present (`is-present` toggles opacity) and
  can `flash()` on a fire.

Every frame you call `hud.render({ present, up, extensions, progress, label })`.
All styling is in `fragmentary.css`; the piece places the HUD in a
`#hud-panel` element and toggles visibility with `data-hud="on"|"off"` on the
stage.

## The admin console (`/admin/`)

A small in-browser tool for tuning gestures without editing code:

- **Edit bindings and dwell.** Add/remove bindings, set each finger to
  `any`/`up`/`down`, pick the action (`next`/`prev`/`goto`/`restart`, with an
  index for `goto`), and set `dwellMs` / `stableFrames` / `showHud`.
- **Capture-pose.** With the camera on, hold a hand shape and capture it - the
  console reads `fingersUp` and fills a binding's finger constraints from your
  actual hand, so you design gestures by making them.
- **Live preview.** The same `fx-*` HUD shows your hand and the dwell meter as you
  tune, so you feel the timing before you ship it.
- **Save.** Writes the config to `localStorage` under `STORAGE_KEY` via
  `saveStored`. The live piece layers this override over the shipped default with
  `mergeConfig`, so your changes take effect on the next load without a rebuild.
- **Export JSON.** Emits the validated config so you can paste it into
  `data/gestures.json` and _bake it as the new shipped default_ (localStorage is
  per-origin and per-browser; the JSON is the durable, committed source of truth).
- **Reset.** `clearStored` drops the override and falls back to `data/gestures.json`.

The precedence, everywhere, is: `data/gestures.json` (shipped default) ->
`mergeConfig` -> localStorage override (admin) -> `?hud=off` (view-time only).

## How to reuse Fragmentary in a new piece

1. **Copy the layer.** Copy `src/fragmentary/` and `admin/` into the new piece,
   plus `src/hands.js` and `src/camera.js` (the camera + MediaPipe I/O).
2. **Wire the HUD element + CSS.** Add a `<div id="hud-panel">` to the page and
   `<link rel="stylesheet" href="src/fragmentary/fragmentary.css">` in the head.
   Give the page `--ink` / `--paper` custom properties so the HUD inherits your
   palette.
3. **Ship a default config.** Create `data/gestures.json` with your `dwellMs`,
   `stableFrames`, `showHud`, and `bindings`. Change `STORAGE_KEY` in `config.js`
   to your piece's name so its localStorage override does not collide.
4. **Load + merge the config** like `src/main.js` does:

   ```js
   import {
     validateConfig,
     mergeConfig,
     loadStored,
   } from "./fragmentary/config.js";
   const defaults = await (await fetch("data/gestures.json")).json();
   const gestureConfig = mergeConfig(validateConfig(defaults), loadStored());
   ```

5. **Create the control + HUD:**

   ```js
   import { createGestureControl } from "./fragmentary/control.js";
   import { createFingerHud } from "./fragmentary/hud.js";
   const control = createGestureControl({
     dwellMs: gestureConfig.dwellMs,
     stableFrames: gestureConfig.stableFrames,
     bindings: gestureConfig.bindings,
   });
   const hud = createFingerHud(document.getElementById("hud-panel"), {
     reduced,
   });
   ```

6. **Feed readings every frame.** Start the camera and hand tracking, and on each
   reading call `control.update(reading.present ? reading.up : null, now)`, render
   the HUD, and dispatch the action when `firing`. In `mother-not-metaphor` this
   lives behind `player.feed(reading, now)`, which calls `control.update`, calls
   `hud.render`, and maps `action.type` to `next` / `prev` / `goto` / `restart`.

   ```js
   const { loadHandLandmarker, trackHands } = await import("./hands.js");
   const landmarker = await loadHandLandmarker();
   trackHands(landmarker, videoEl, (reading) =>
     player.feed(reading, performance.now()),
   );
   ```

7. **Show the HUD when live.** Keep `data-hud="off"` on the stage until hand
   tracking actually starts, then set `data-hud="on"` (respecting `showHud` and
   `?hud=off`) so the read-out only appears when there is a camera to read.

That is the whole contract. New piece = new `data/gestures.json` + a few lines of
wiring; the reading, dwell, HUD, and admin console come along unchanged.

## Tests

The pure modules are unit-tested with `node --test`:
`tests/unit/gestures.test.mjs`, `tests/unit/control.test.mjs`,
`tests/unit/config.test.mjs`. The DOM path (HUD, feed loop) is covered by the
piece's Playwright suite. Run everything with `npm test`.
