# votivepatina - Context (living memory)

Net.art / e-lit piece for ORAL.pub around the poem _"my mother sends me a picture of
the Virgin Mary on WhatsApp."_ Faith, memory, decay. Arab Christianity held screen to
screen. The build serves a thesis: prayer both upholds memory and, by its lossy
structure, is lost; one click both inscribes the prayer (console + localStorage +
source) and wears the icon down. **The code is the prayer.**

## Source of truth

- Creative brief: the section-0 spec from Halim (governs all decisions).
- Engineering contract: `DESIGN.md` (interfaces, tokens, selectors, specs).
- Requirements: `tasks/prd-votivepatina.md` (15 user stories = brief's acceptance list).

## Stack / rules

- Plain HTML + CSS + vanilla JS (ES modules). No framework, no bundler, no minifier.
  Deployed source == authored source. Unminified, comments intact (they are the art).
- Fully client-side. No network, analytics, third-party scripts, or tracking. Offline
  after first load. Canvas 2D for decay. Respect reduced-motion. Keyboard a11y. RTL.
- Tests/dev server are DEV-ONLY (`package.json`); `verify:purity` guards the boundary.

## Key decisions

- Build happens in the worktree under `votive-patina/`; merges to main at the same
  path (the empty `votive-patina/` Halim created in the main checkout).
- Tests: Playwright E2E + Node `--test` unit (Halim chose fullest coverage).
- Generative "+" layer: ships OFF and uncalled; scaffolded in
  `lib/generative-expansion.js` + `experimental/generative.html` to test elsewhere
  (Halim: "1 but let an agent scaffold 2 behind the scenes").
- Fonts: bundle Amiri (OFL naskh) for Arabic; system monospace for machine/console;
  EB Garamond/system serif for the "+" poetry. Page chrome may use cargo CDN fonts.
- Palette: oulipo white/black base + clashing YOLO neon overlay + OLED-dark drawer.
- Assets are tasteful placeholders until Halim provides the real photographic Mary,
  litany jpegs, licensed Arabic face, and Substack URL (placeholder `<SUBSTACK_URL>`).

## Build approach

Foundation (this session): DESIGN.md, PRD, data/content.json, data/boxes.json.
Then several agents in parallel for independent pieces (decay engine + unit tests,
placeholder assets + fonts, generative scaffold, Playwright/test infra) while the
core (index.html, styles.css, main.js, lib/console-prayer.js, lib/boxes.js) is
authored against the contract, then integrated, tested, and visually verified.

## Session State

- Status: v3 COMPLETE - built, visually verified, all gates green (29 unit,
  html-validate, purity 4/4, 192 e2e across mobile/desktop/reduced-motion), and
  committed + merged to main via PR #30 (no drift: votive-patina tree hash
  30ef88cd identical across local main, origin/main, and the worktree commit). The
  redesign:
  (1) quiet landing - h1 "Votive Patina" + one poem line; ALL framing/chrome + the
  pasted Substack essay moved into an About modal behind a subtle "?" (lib/about.js;
  .site-head/.site-foot removed). (2) ONE bilingual button `#prayer-button` cycles
  data-phase idle ("Pray for us"/"صلّي لأجلنا") -> instruct ("click the colored
  squares") -> answered ("Prayer is Answered"); the old #counter-pill is gone. A
  yellow `--radiance` glow grows on the icon + button per click. (3) The found
  prayers are a CONSTELLATION (lib/constellation.js): the icon shoots rays of light;
  11 satellites hang at the ray ends, revealed in batches across the 5 box-clicks -
  a ring/sunburst halo on wide screens (>=820px), ~3 downward fans on narrow. Tap a
  satellite -> a LIGHTBOX (lib/lightbox.js) with the enlarged image + pink/green
  boxes + Arabic/translation/"+"note + decay + console. (4) Console is BILINGUAL
  (Arabic then English, drawer styles -ar kinds RTL); Substack INVITE dropped; the
  answered button copies the full bilingual prayer (clipboard, local) + opens the
  console (PC: shows the DevTools shortcut). Dropped found-prayers p12 (watermark) +
  p13 (queen of peace) -> 11 remain.
- console-prayer.js now exports ARABIC_LINES + fullBilingualPrayer(); INVITE removed.
  lib/litany.js DELETED (replaced by constellation + lightbox). data/content.json
  litany array = 11 units; assets/litany/litany-12.jpg + -13.jpg removed.
- Bugs fixed in v3:
  - constellation `wide` used `stage.clientWidth` on a DOMRect (undefined) -> always
    mobile layout on desktop; fixed to `stage.width`. Ring radius capped to the stage
    width; early layout() before the card is sized is guarded + re-run on rAF.
  - LIGHTBOX boxes collapsed to 0x0: renderBoxes.layout() reads overlayEl.clientWidth,
    which is 0 when the flex-centred lightbox first opens, so every box got 0 size and
    never recovered (un-clickable). Fix: re-layout on a ResizeObserver(canvas) + rAF in
    lib/lightbox.js, disconnected on close.
  - MOBILE horizontal overflow -> phone zoom-out -> displaced fixed "?" toggle (ALL 9
    mobile About tests failed). Root cause: the narrow constellation fanned satellites
    at +/-0.62rad over distances up to ry\*2.86, flinging them ~+/-480px sideways past
    the 390px viewport. Fix: narrow geometry now places 3 bounded downward threads
    (colDx capped to halfW-52) that stay inside the stage; html also gets overflow-x:clip.
  - About scrim-dismiss e2e clicked the panel-covered centre of the scrim; now clicks an
    exposed backdrop corner ({position:{x:5,y:5}}).
- Built by several parallel agents (decay engine + unit tests, placeholder assets +
  fonts, generative scaffold, test harness) against DESIGN.md; core (index.html,
  styles.css, main.js, console-prayer.js, boxes.js) authored by hand.
- Bugs found & fixed in verification (reusable lessons):
  1. `img.decode()` HANGS on a display:none image in Chromium -> boot blocked.
     Fix: wait for load if !complete, draw via canvas, never call decode().
  2. Playwright `toBeVisible()` ignores opacity:0 -> idle boxes read as "visible".
     Fix: hide un-revealed boxes with visibility:hidden (also closed a real a11y
     hole - opacity:0 boxes were still focusable/clickable before "Pray").
  3. devices['iPhone 13'] defaults to webkit; only chromium installed -> the whole
     mobile project failed at launch. Pinned the mobile project to chromium.
  4. Bottom prayer-line boxes sat under the counter pill / console handle ->
     un-clickable. Raised the 5 lines (y 0.47-0.73), moved the handle bottom-right,
     made aria-hidden box labels pointer-events:none, and reordered boxes.json so
     arabic-line boxes render LAST (topmost = reliably clickable).
- Preview: `.claude/launch.json` has a "votivepatina" server (npm run serve, :4178).
- v2 + v3 are COMMITTED + MERGED (PR #30, squash commit f8b04566). The earlier
  placeholder build was PR #29. Local main fast-forwarded; tree hashes verified equal.
- Raw source folder `assets/mary-pictures/` (Halim's 15 dropped originals) is LEFT
  UNTRACKED in the MAIN checkout - it is source material, not the shipped artwork
  (the piece ships curated clean-named copies litany-01..11 + mary-interactive). Not
  committed; revisit only if Halim wants the originals preserved in-repo.
- Still pending from Halim: the Substack URL (`<SUBSTACK_URL>` placeholder); optional
  licensed Arabic display face (Amiri bundled, OFL); and his nod on the 13 notes.
