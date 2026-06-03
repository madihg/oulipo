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

- Status: COMPLETE and verified end to end (idle -> pray -> detection sweep -> 5
  boxes each (panel + console line + decay + counter + source inscription) -> "+"
  serif expansion -> 5/5 (full prayer + couplet + styled invite in console & in the
  mirrored drawer) -> resting; localStorage patina restores on return with "you have
  prayed here N times").
- Tests all green: `npm test` exit 0 = unit 25/25 + html-validate + purity 4/4 +
  Playwright e2e 99/99 (mobile + desktop + reduced-motion). Run from votive-patina/.
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
- NOT committed yet (worktree branch halim-bot/tender-hofstadter-8e67ec).
- Still pending from Halim: real text-free Mary photo, real litany jpegs, licensed
  Arabic face, Substack URL (placeholders + `<SUBSTACK_URL>` in place; decay reads
  far more dramatically on a real photo than on the flat placeholder).
