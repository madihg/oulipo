# Context - mother, not metaphor

Living memory for this piece. Read on startup.

## What it is

A mobile-native generative poem at `oulipo.xyz/mother-not-metaphor`, featured on
the Kitchen Lab landing. Five moments / five tongues for one mother. Each moment =
a layout of three components (camera / words / morphing illustration). Built to be
a **reusable poem engine** (data + modules) for future poems.

## Decisions (2026-06-22)

- **Camera = hybrid.** Live: viewer's hands drive moment changes via MediaPipe
  hand tracking. Fallback: timed auto-play when no camera (Instagram in-app
  browser, denied permission, headless). Default landing shows a "begin" tap so
  the browser will grant the camera; `?mode=auto` skips it.
- **Words = scripted typewriter** (not real speech-to-text). Original text exact;
  English translation fades in beneath non-English lines. Deterministic + offline.
- **Hand-tracking model = CDN** (MediaPipe). This piece is therefore NOT fully
  offline like mother-patina/votive-patina; the purity check was relaxed to allow
  ONLY the MediaPipe CDN + model and still block all analytics/trackers.
- **Morphing = SVG rects + OKLab color lerp**, pure + unit-tested. No animation
  framework (brand: vanilla only). Layout transitions use FLIP via the Web
  Animations API (robust against stuck transforms).
- **Size = phone-native.** Mobile fills the viewport; wider screens show a 4:5
  Instagram-portrait card. `overflow:hidden`, no scroll, never overflows.
- **Fonts = system grotesque + mono** (bulletproof, matches the wireframe). Brand
  fonts can be layered later if wanted.

## Status: COMPLETE + tested (2026-06-22)

- `npm test` green: 29 unit + html lint + purity + 18 e2e (mobile/desktop/reduced).
- All 5 layouts + illustrations verified in-browser (screenshots).
- Featured card added to root `index.html` (first of 3); thumbnail at
  `Assets/images/kitchen-lab/mother-not-metaphor.svg`.
- No `vercel.json` change needed (served statically from the folder).

## Open / next

- Real performance footage is optional; live mode uses the viewer's camera.
- Brand-font layering (Terminal Grotesque / Diatype) not done - system stack ships.
- Auto mode holds on the last moment (pass `?loop=1` to loop).
- Could add more layouts (`L6+`) or a second poem to exercise the engine.

## Session State (2026-06-22)

- Task: build the piece end to end. DONE.
- Files: `mother-not-metaphor/` (index.html, styles.css, src/_, data/poem.json,
  scripts/_, tests/\*), root `index.html` (Featured card), Assets thumbnail SVG,
  `.claude/launch.json` (added `mother-not-metaphor` server on 4180).
- Next steps if resumed: optional brand fonts, optional real footage, optional
  second poem. Everything currently passes.

## Session State (2026-07-07) - Fragmentary gesture layer + admin

- Task: add deliberate dwell-based gesture control + an on-screen finger HUD, and
  factor it into a reusable format ("Fragmentary"). DONE.
- **Dwell + reset gate.** Moment switches are no longer instant on any hand
  change. A deliberately-formed pose must be held ~1.5s (`dwellMs`, configurable)
  before it fires, AND only after the hand passed a neutral/absent "reset" since
  arming/last fire - so a resting or settling hand never advances on its own
  (fixes a review finding). Interaction: relax, form the shape, hold. A meter
  fills 0..1 during the hold. The dwell state machine is pure and lives in
  `src/fragmentary/control.js`.
- **Finger HUD.** The five finger bars + dwell meter are now on-screen
  (`#hud-panel`, `fx-*` classes in `src/fragmentary/fragmentary.css`), shown only
  once live tracking starts (`data-hud="on"` on the stage). `?hud=off` hides it.
- **Config is data.** Finger-pattern -> action bindings live in
  `data/gestures.json` (shipped default: open hand -> next, peace sign -> back;
  bound poses are deliberate shapes so a relaxed/lowered hand stays a neutral).
- **Admin console (`/admin/`).** Edits bindings + dwell + capture-pose, saves an
  override to `localStorage`, which the live piece layers over the shipped default
  via `mergeConfig`. Export JSON to bake as the new `data/gestures.json` default.
- **Fragmentary = the reusable format.** `src/fragmentary/` (gestures, control,
  config, hud, css) + `admin/` are meant to be copied into future oulipo pieces.
  Documented in `FRAGMENTARY.md` (APIs + reuse steps); README updated with the
  gesture-control section, module table, and `?hud=off` / `/admin/` params.
- **Files touched here (docs only):** `FRAGMENTARY.md` (new), `README.md`,
  `Context.md`. The gesture code + `data/gestures.json` + admin were built
  earlier this session.
- **Tests (all green).** New unit suites `tests/unit/control.test.mjs` +
  `tests/unit/config.test.mjs`; `gestures` moved to `src/fragmentary/`
  (`tests/unit/gestures.test.mjs`, + finger-extension coverage). New e2e
  `tests/e2e/fragmentary.spec.mjs` drives the dwell + HUD via `window.MNM.feed`
  with fake clocks. `npm test` = 50 unit + html lint (index + admin) + purity
  (scans src + admin, still allows only the MediaPipe CDN) + 39 Playwright e2e
  (piece + fragmentary, on mobile/desktop/reduced-motion).
