# PRD: mother, not metaphor

## Overview

`mother-not-metaphor` is a mobile-native generative poem piece living at
`oulipo.xyz/mother-not-metaphor`, featured on the Kitchen Lab landing page. It
renders a five-moment poem (EN / FR / AR-romanized / AR-Levantine / PT-BR) as a
live performance instrument made of three reusable components:

1. **Camera** — the performer's (or viewer's) live video.
2. **Words** — the poem line revealed as if live-transcribed, with an English
   translation beneath the non-English lines.
3. **Illustration** — a flat-geometric SVG composition (De Stijl primaries) that
   morphs smoothly between keyframes, paced to speaking speed.

Each of the five moments has its own **layout** (a grid arrangement of the three
components). Layout changes are triggered live by a change in the performer's
hand shape (MediaPipe Hand Landmarker). Illustration morphs are time-paced to the
moment's spoken duration.

The architecture is a generic **poem engine** (pure logic + DOM renderers) driven
by a single `poem.json`, so future poems reuse the framework: new text, new
keyframes, same machine.

## Goals

- A complete, playable five-moment poem sized to sit on an Instagram profile
  (portrait, never overflowing its borders).
- Buttery, alive morphing between geometric illustration states (no jarring cuts).
- Hand-shape-driven layout transitions when a camera is available.
- A deterministic, testable auto-play fallback when no camera (Instagram in-app
  browser, denied permission, headless).
- A reusable, data-driven engine for future poems.

## Quality Gates

These commands must pass for every user story (run from `mother-not-metaphor/`):

- `npm run test:unit` — Node unit tests (pure engine + data shape)
- `npm run lint:html` — html-validate on index.html
- `npm run verify:purity` — no analytics/trackers; only the MediaPipe model is
  allowed off-origin
- `npm run test:e2e` — Playwright (mobile + desktop + reduced-motion)
- `npm test` — runs all of the above in sequence

## User Stories

### US-001: Pure color engine (OKLab interpolation)

**Description:** As the morph system, I want to interpolate two colors through
OKLab so transitions between saturated primaries stay vivid.

**Acceptance Criteria:**

- [ ] `lerpColor(a, b, 0) === a` and `lerpColor(a, b, 1) === b`
- [ ] Midpoint returns a valid `#rrggbb` string
- [ ] blue→red midpoint has meaningful red AND blue channels (not gray)

### US-002: Pure morph engine (rect interpolation + padding)

**Description:** As the illustration, I want to interpolate between two frames of
rectangles, handling differing cell counts.

**Acceptance Criteria:**

- [ ] `interpolateFrame(A, B, 0)` equals A; `(A, B, 1)` equals B geometry
- [ ] Frames of differing length are padded to the max; extra cells are born/die
      at a point (size 0, opacity 0)
- [ ] `easeInOutCubic(0)=0`, `(1)=1`, `(0.5)=0.5`

### US-003: Pure pacing engine

**Description:** As the player, I want moment durations and keyframe schedules
derived from text length and a speaking rate.

**Acceptance Criteria:**

- [ ] `momentDurationMs` clamps to `[min, max]`
- [ ] `scheduleKeyframes(count, duration, morphMs)` returns `count` ascending
      times within `[0, duration]`

### US-004: Pure gesture engine

**Description:** As the player, I want to derive a discrete hand signature from
landmarks and detect stable changes.

**Acceptance Criteria:**

- [ ] `fingersUp` returns all-true for a synthetic open hand, all-false for a fist
- [ ] `handSignature` is stable for the same pose, differs across poses
- [ ] `stableSignature(history, n)` only reports a signature held ≥ n frames

### US-005: Poem data + validation

**Description:** As the author, I want the poem as data with a validated shape.

**Acceptance Criteria:**

- [ ] 5 moments with langs EN/FR/AR/AR-Levantine/PT-BR in order
- [ ] Each moment names a layout in {L1..L5} (all five used, distinct)
- [ ] Original text matches the canonical poem; non-English moments carry English
- [ ] Every keyframe cell has numeric x,y,w,h and a fill in the palette

### US-006: Illustration renderer (SVG)

**Description:** As a viewer, I want the illustration to render and animate.

**Acceptance Criteria:**

- [ ] Renders an `<svg>` of `<rect>`s for the current moment
- [ ] Animates between keyframes on a rAF loop using the morph engine
- [ ] Respects `prefers-reduced-motion` (snaps instead of tweening)

### US-007: Words renderer (typewriter transcription)

**Description:** As a viewer, I want the line to type out like live captions with
translation beneath non-English lines.

**Acceptance Criteria:**

- [ ] Original text reveals progressively over the moment's duration
- [ ] A `[LANG]` tag shows; English translation shows for non-English moments
- [ ] Original text is always rendered verbatim (no mistranscription)

### US-008: Layout system + FLIP transitions

**Description:** As a viewer, I want the three components to rearrange smoothly
when the moment changes.

**Acceptance Criteria:**

- [ ] Five `data-layout` grid arrangements (L1..L5) place ME/WORDS/ILLUS
- [ ] Component boxes animate to new positions via FLIP (snap under
      reduced-motion)
- [ ] Stage fits the viewport in portrait; no horizontal scroll/overflow

### US-009: Camera + hand tracking (with fallback)

**Description:** As a performer, I want my hand-shape changes to advance the poem;
as an Instagram viewer with no camera, I want it to auto-play.

**Acceptance Criteria:**

- [ ] Requests camera; on grant, loads MediaPipe and tracks hands
- [ ] A stable change in hand signature advances to the next moment
- [ ] On denied/unavailable camera or MediaPipe failure, auto-plays on the pacing
      timer
- [ ] Exposes `window.MNM` (state/next/goTo) for tests and debugging

### US-010: Landing integration

**Description:** As a visitor, I want to find the piece in Featured.

**Acceptance Criteria:**

- [ ] A Featured card links to `/mother-not-metaphor/` with a thumbnail
- [ ] Served statically; no vercel.json change required

## Functional Requirements

- FR-1: The piece must load and run with zero build step (vanilla ES modules).
- FR-2: All five moments must be reachable; after the last, the piece holds (or
  loops in auto mode).
- FR-3: Non-English original text must render exactly as authored.
- FR-4: The stage must never overflow the viewport (portrait, contained).
- FR-5: The only permitted off-origin request is the MediaPipe Hand Landmarker
  bundle + model; no analytics, beacons, or trackers.
- FR-6: All animation must honor `prefers-reduced-motion`.

## Non-Goals

- Real speech-to-text (scripted typewriter only).
- Recording or uploading the performer's video anywhere.
- Multiple poems in this iteration (engine is reusable; only this poem ships).
- Actual Arabic script (the poem is romanized; Latin glyphs only).

## Technical Considerations

- Pure modules (`color`, `morph`, `pacing`, `gestures`) are DOM-free for Node unit
  tests; DOM modules are covered by Playwright.
- MediaPipe `tasks-vision` is dynamically imported from a CDN; any failure must
  degrade to auto-play.
- Test acceleration via `?speed=` and forced fallback via `?mode=auto`.

## Success Metrics

- `npm test` green (unit + lint + purity + e2e) on mobile and desktop.
- No console errors on load; no overflow at 390×844 (iPhone) and desktop.
- Illustration morphs read as smooth (verified visually via screenshots).

## Open Questions

- Final thumbnail art and any brand-font layering (system grotesque ships now).
- Whether auto mode should loop or end on a closing frame (currently holds).
