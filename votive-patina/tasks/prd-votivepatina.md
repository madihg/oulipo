[PRD]

# PRD: votivepatina

## 1. Overview

A net.art / e-lit piece for ORAL.pub built around the poem _"my mother sends me a
picture of the Virgin Mary on WhatsApp."_ A devotional photo of the Virgin decays
through generational JPEG loss as the visitor "prays" by clicking machine-vision
detection boxes; the same click inscribes the prayer into the real browser console,
into localStorage, and into the page source. The machine sees "person 0.94" and
misses everything that matters - which is hidden behind the click, the "+", and the
console. Plain HTML/CSS/vanilla JS, no framework, no bundler; fully client-side and
offline-capable. The shipped source must equal the authored source: **the code is
the prayer.**

Full creative brief: see the section-0 spec. Engineering contract: see `DESIGN.md`.

## 2. Goals

- Ship an unminified, readable, framework-free single-page artwork hostable as
  static files on ORAL.pub, working offline after first load.
- Make "attending preserves and erodes in one motion" literal: one click prints a
  prayer line AND decays the icon one generation.
- Make the console a genuine medium: real `console.log` scripture, mirrored into a
  mobile faux-console drawer; the prayer accretes in the page source as comments.
- Honor the machine-vision conceit: YOLO/COCO neon boxes with confidence scores
  clashing against the warm devotional image.
- Be correct and humane: RTL Arabic, keyboard-accessible boxes, reduced-motion
  respected, no network/tracking, a personal localStorage "patina."
- Back the whole thing with a thorough automated feedback loop (Playwright E2E +
  unit tests) so every acceptance criterion is machine-verified.

## 3. Quality Gates

These commands must pass for every user story (DEV-ONLY tooling; it never touches
the shipped artifact):

- `npm run test:unit` - Node `--test` unit suite (pure logic: decay curve, prayer
  text, subscribe) passes.
- `npm run test:e2e` - Playwright suite passes across mobile, desktop, and
  reduced-motion projects.
- `npm run lint:html` - `html-validate` on `index.html` passes (semantic markup,
  ASCII relic comment preserved).
- `npm run verify:purity` - asserts the shipped source has no bundler/minifier
  output, comments intact, no network/analytics calls in `main.js`/`lib/*` (except
  the OFF-by-default `generative-expansion.js`), and the ASCII relic is the first
  comment in `index.html`.
- Manual/visual verification (REQUIRED for UI stories): preview server +
  screenshots of idle / detecting / N-of-5 / 5-of-5 / resting states on a mobile
  viewport, with a 1px black border per oulipo screenshot rule.

## 4. User Stories

### US-001: Project scaffold, data, and design contract

**Description:** As the builder, I want the file tree, design tokens, DOM contract,
and sacred data files in place so all other work integrates cleanly.
**Acceptance Criteria:**

- [ ] `DESIGN.md`, `data/content.json`, `data/boxes.json` exist and match the brief
      (Appendix A text verbatim; boxes per Appendix D schema).
- [ ] `styles.css` declares the `:root` tokens from `DESIGN.md` section 1.
- [ ] `index.html` is semantic and contains the permanent ASCII relic as its first
      comment.

### US-002: Console prayer module (single source of truth)

**Description:** As a visitor, I want the prayer genuinely written to the console so
the inscription is real, not described.
**Acceptance Criteria:**

- [ ] `PRAYER_LINES` equals Appendix B's five lines, in order.
- [ ] `printLine(i)` logs canonical line i to the real console immediately.
- [ ] `printFull()` logs the five lines in order, then the closing couplet, then a
      `%c`-styled invite line containing `<SUBSTACK_URL>`.
- [ ] `subscribe(fn)` receives every emitted line (used by the drawer mirror).

### US-003: Decay engine (generational JPEG loss)

**Description:** As a visitor, I want the photo to rot like a forwarded WhatsApp
jpeg, one generation per prayer, persistent across visits.
**Acceptance Criteria:**

- [ ] `qualityForStep` is monotonic decreasing and bounded ~0.92 -> ~0.15 over 0..5.
- [ ] `renderStep(N)` re-derives from the pristine source by N successive JPEG
      re-encodes (deterministic); step >= 3 forces chroma blockiness.
- [ ] Only `#mary-canvas` changes; text/boxes/panels never degrade.
- [ ] `animate:false` and reduced-motion apply the new frame instantly (still decays).

### US-004: Detection overlay (boxes.js)

**Description:** As a visitor, I want YOLO-style boxes over the image so devotion is
bracketed as detected objects.
**Acceptance Criteria:**

- [ ] Renders 5 `arabic-line`, 1 `virgin` (`person 0.94`), and 2-3 `mislabel` boxes
      from `boxes.json`, above the decay layer and crisp while the photo rots.
- [ ] Each box is a `<button.det-box>` with the accessible name from `DESIGN.md` 6.
- [ ] arabic-line rects prefer the live-text rect, falling back to `rectNorm`;
      `layout()` recomputes on resize.
- [ ] Box-type is distinguishable without color (stroke style + label).

### US-005: Pray gate + detection sweep + state machine

**Description:** As a visitor, I begin by consenting to erosion, then watch the
machine "detect."
**Acceptance Criteria:**

- [ ] Idle shows a whole, crisp image and a single `#pray-button` "Pray for us"; no
      boxes.
- [ ] Clicking it runs a sweep (scan line + boxes popping + confidence ticking) then
      reveals all boxes and a `#counter-pill` "0 of 5"; the pray pill is replaced.
- [ ] `body[data-state]` transitions idle -> detecting -> praying.

### US-006: Prayer interaction (the one gesture)

**Description:** As a visitor, each first box-open inscribes and erodes in one motion.
**Acceptance Criteria:**

- [ ] First open of an `arabic-line` box: shows its translation panel, prints its
      console line, decays one step, increments the counter.
- [ ] Re-opening an opened box re-shows its panel only (no double count/print/decay).
- [ ] `virgin` and `mislabel` boxes are clickable but do not count toward 5; virgin
      shows its aside, mislabels show only the raw detection.

### US-007: Translation panel + "+" buried expansion

**Description:** As a visitor, I get the cold machine literal, then can uncover the
warm poem.
**Acceptance Criteria:**

- [ ] Panel shows the `literal` line in the mono machine register.
- [ ] A "+" (`aria-expanded`) reveals the `expansion` in the serif register, styled
      as a buried layer, respecting reduced-motion.
- [ ] One panel open at a time on mobile; panel is keyboard-reachable and announced.

### US-008: Completion state + closing couplet

**Description:** As a visitor reaching 5/5, the prayer resolves and points onward.
**Acceptance Criteria:**

- [ ] At 5/5 the pill reads "5 of 5 - YOUR PRAYER WAS PRINTED - OPEN CONSOLE (PC)".
- [ ] The console prints the clean full prayer, blank, closing couplet, styled invite.
- [ ] `#closing-couplet` appears softly on the card; `body[data-state]` -> complete
      then resting (worn icon, boxes can fade).

### US-009: Mobile faux-console drawer

**Description:** As a touch visitor with no DevTools, I can still look beneath.
**Acceptance Criteria:**

- [ ] On coarse-pointer devices the 5/5 pill and a persistent `#console-handle`
      ("look beneath" chevron) open `#console-drawer` (dark monospace, slides up).
- [ ] The drawer prints exactly the subscribed console lines, in order, with the same
      timing (instant under reduced-motion); it is a mirror, not a second copy.
- [ ] Desktop shows "(PC)" and relies on real DevTools (drawer offered as fallback).

### US-010: Hidden inscriptions in source

**Description:** As a curious visitor viewing source, I see the prayer accrete.
**Acceptance Criteria:**

- [ ] index.html ships with the permanent ASCII relic as its first comment.
- [ ] Each box-open appends that prayer line as an HTML comment in `#prayer-card`
      and into the hidden `#inscription` element; by 5/5 the full prayer + couplet
      exist in the DOM.

### US-011: localStorage patina

**Description:** As a returning visitor, my erosion and votive count persist.
**Acceptance Criteria:**

- [ ] `votivepatina.decayStep`, `.prayerCount`, `.prayer` are read on load and
      written appropriately; image loads pre-degraded to the stored step.
- [ ] `prayerCount` increments once per completed session; a quiet unlabeled line can
      note "you have prayed here N times."

### US-012: Longitudinal litany

**Description:** As a visitor scrolling, a thread of Mary jpegs decays with depth.
**Acceptance Criteria:**

- [ ] Below the card, `#litany` is a single column of lazy-loaded burned-in Arabic
      Mary jpegs scrolling like a WhatsApp thread.
- [ ] Litany images visibly degrade with scroll depth; desktop centers at a readable
      width (image not full-bleed); mobile is full-bleed single column.

### US-013: Generative "+" scaffold (OFF by default)

**Description:** As Halim, I want a dormant generative path to test elsewhere without
compromising the pure, offline shipped artifact.
**Acceptance Criteria:**

- [ ] `lib/generative-expansion.js` exports `GENERATIVE_ENABLED = false` and a
      few-shot `dreamExpansion()` clearly marked machine-generated.
- [ ] The default `main.js`/`index.html` never imports it and makes no network call;
      `experimental/generative.html` exercises it in isolation, visually distinct.

### US-014: Placeholder assets

**Description:** As the builder, I need tasteful placeholders so the piece is whole
before real assets arrive.
**Acceptance Criteria:**

- [ ] `assets/mary-interactive.jpg` is a text-free portrait devotional placeholder
      whose composition matches `boxes.json` (figure upper ~70%, clear lower third,
      incidental shapes where mislabels sit).
- [ ] `assets/litany/` holds 6-8 portrait Mary jpegs with burned-in Arabic.
- [ ] Amiri (OFL) is bundled in `assets/fonts/` with a system fallback; a TODO list
      at the top of `main.js` tracks every placeholder + `<SUBSTACK_URL>`.

### US-015: Test harness + purity verification

**Description:** As the builder, I want a thorough feedback loop proving every
criterion and that the ship stays pure.
**Acceptance Criteria:**

- [ ] `package.json` provides `serve`, `test:unit`, `test:e2e`, `lint:html`,
      `verify:purity`, and `test` (all of them) scripts.
- [ ] Unit + Playwright suites cover US-002..US-012 behaviors via the DOM contract,
      capturing the real console and asserting localStorage persists across reload.
- [ ] `verify:purity` fails if the relic is missing, comments are stripped, or a
      network/analytics call appears in the shipped source.

## 5. Functional Requirements

- FR-1: The system must run entirely client-side with no network calls, analytics,
  third-party scripts, or tracking cookies in the shipped build.
- FR-2: On `#pray-button` click, the system must animate a detection sweep, render
  the overlay, and show a "0 of 5" counter.
- FR-3: On the first open of each `arabic-line` box, the system must, in one gesture:
  reveal the translation panel, `console.log` that line, decay the photo one step,
  append the line to the source inscription, and increment the counter.
- FR-4: The system must not double-count, double-print, or double-decay on re-open.
- FR-5: At 5/5 the system must print the full prayer + couplet + styled invite to the
  real console and reflect them in the drawer mirror.
- FR-6: The system must persist and restore `decayStep`, `prayerCount`, and `prayer`
  via namespaced localStorage.
- FR-7: The system must respect `prefers-reduced-motion` (skip transitions; still
  decay) and be fully keyboard operable with visible focus.
- FR-8: Arabic must render RTL with `lang="ar"` and proper joining.
- FR-9: The shipped source must be unminified with comments intact; the ASCII relic
  must be the first comment of `index.html`.

## 6. Non-Goals (Out of Scope)

- No backend, database, user accounts, or server code.
- No build step, bundler, transpiler, or minifier for the shipped artifact.
- No live generative content in the default build (the generative layer ships OFF
  and uncalled; it is exercised only in `experimental/`).
- No real (final) assets - placeholders only until Halim provides the photographic
  Mary, the litany jpeg set, the licensed Arabic face, and the Substack URL.
- No analytics, A/B testing, cookies, or any data leaving the device.
- No desktop "four-up" grid; the storyboard's four panels are one card transitioning
  through states.

## 7. Technical Considerations

- Canvas 2D only for decay; prefer `createImageBitmap`/`OffscreenCanvas` and idle
  time so scrolling stays smooth.
- SVG (or absolutely-positioned) overlay above the canvas keeps boxes crisp while the
  photo rots; recompute layout on resize and after fonts load.
- ES modules with relative paths; must work from static hosting.
- Bundled fonts avoid a render-time CDN dependency for the core experience; page
  chrome may use the cargo CDN fonts (cached after first load).
- Tests and the static server live under dev-only `package.json`; `verify:purity`
  guards the boundary between dev tooling and shipped source.

## 8. Success Metrics

- All Quality Gate commands pass.
- All 15 acceptance criteria from the brief (section 15) are demonstrably met, each
  mapped to a passing Playwright assertion or unit test.
- A first-time mobile visitor can complete idle -> 5/5 -> resting with the icon
  visibly eroded, the prayer in the drawer, and the patina restored on reload.
- View Source reveals the ASCII relic and the accreted prayer; DevTools shows the
  real console scripture.

## 9. Open Questions (confirm with Halim during build; placeholders meanwhile)

- The interactive Mary image (text-free preferred). Using a generated placeholder.
- The litany jpeg set. Using generated burned-in placeholders.
- The Arabic display typeface + license. Bundling Amiri (OFL) as the fallback-better.
- The Substack URL for the final console line. Using the literal `<SUBSTACK_URL>`.

[/PRD]
