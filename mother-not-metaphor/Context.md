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
