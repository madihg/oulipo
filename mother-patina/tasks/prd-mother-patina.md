# PRD: mother-patina (a WhatsApp conversation that forwards itself across windows)

## Overview

A new standalone net.art piece at `oulipo.xyz/mother-patina/`, a sibling of the
untouched `votive-patina/`. It restages the prayer as a WhatsApp conversation between
two people: `user a` (the reader, messages on the RIGHT, as if sent) and `user b`
(on the LEFT, incoming). Each "screen" is one chat: it opens with the Virgin Mary
image `user b` forwards, then the prayer line (Arabic, the chat-Latin transliteration
with `7` for the throaty h, and the English), then a poetic back-and-forth. The
conversation auto-plays just faster than a quick reader, and the reader can scroll up
to catch up or down to follow.

The defining gesture: as Mary is "forwarded", the piece forwards ITSELF. At the end
of each screen, a new screen opens - on desktop (not fullscreen) as a new floating
browser window, in fullscreen as a new browser tab, on mobile as an in-app
WhatsApp-style notification ("someone sent you an image") that, when tapped, opens the
next screen. Five screens, five prayer lines, the same Mary image worn one more
generation of JPEG loss each time. Reuses votive-patina's Mary image + decay engine;
otherwise its own. Standalone, fully client-side, offline, no realtime.

## Goals

- A faithful WhatsApp chat aesthetic: left/right bubbles, an image header per screen,
  centered "system" notes, timestamps, typing indicators, on the oulipo brand.
- Auto-play the scripted conversation at a brisk, readable pace; freely scrollable.
- Forward the piece across surfaces: real windows (desktop) / tabs (fullscreen) /
  mobile in-app notification, each opening the next screen on a user tap (so popups
  are never blocked).
- The same Mary image decays one JPEG generation per screen (reusing the engine), so
  by screen 5 she is heavily worn - "every forward glitches her likeness".
- Standalone + offline; the same quality bar as votive-patina (lint + purity + e2e).

## Quality Gates

These must pass for every story (run from `mother-patina/`):

- `npm run lint:html` - `html-validate` on the shipped HTML.
- `npm run verify:purity` - no network calls, no analytics, no minification, readable
  source (this piece is fully offline - there is NO Supabase/CDN here, so the strict
  no-remote rule applies as in the original votive-patina).
- `npm run test:e2e` - Playwright (mobile + desktop): the chat auto-plays and is
  scrollable; the decay deepens per screen; the screen-transition spawns the next
  surface (window.open captured via Playwright's popup event; mobile notification ->
  tap -> next screen); reduced-motion is respected.
- `npm run test:unit` where it helps (the conversation-data shape, the decay mapping).
- Visual verification (REQUIRED): screenshots of a screen mid-conversation on mobile +
  desktop, the image header decay across screens, and the transition notification.

## User Stories

### US-001: Scaffold /mother-patina + the conversation data

**Description:** As the builder, I want the piece scaffolded as a self-contained folder
with the full script encoded as data.

**Acceptance Criteria:**

- [ ] `mother-patina/` exists in the oulipo repo (served at `/mother-patina/`), with its
      own dev harness (`package.json` with `serve`/`lint:html`/`verify:purity`/`test:e2e`,
      a copy or import of the purity script, a `playwright.config.mjs`).
- [ ] `data/screens.json` encodes all 5 screens verbatim (see "Conversation script"
      below): each screen is an ordered list of messages
      `{ from: "a"|"b"|"system", kind: "image"|"text", text?, arabic?, translit?, center? }`,
      plus the Mary image + the screen's decay generation (0..4).
- [ ] The Mary image is votive-patina's `mary-interactive.jpg` (reused; copied into
      `mother-patina/assets/` or referenced), and the decay engine is reused
      (`lib/decay.js` copied or imported).
- [ ] A unit test asserts: 5 screens, each starts with a `kind:"image"` from `b`, each
      contains its prayer line (arabic + translit + english) in order, and the five
      translits are `FI 7OUDNIKI KHOUZINA / WA 3AN KOULLI CHARREN 2EB3IDINA /
YA OUM YASSOU3 / TACHAFA3I FINA / AMIN`.

### US-002: The WhatsApp chat UI

**Description:** As the reader, I want it to look and feel like a WhatsApp thread.

**Acceptance Criteria:**

- [ ] `user a` messages render as RIGHT-aligned sent bubbles; `user b` as LEFT-aligned
      incoming bubbles; `system`/`center` messages render centered (the date /
      "someone joined" treatment).
- [ ] Each screen opens with the forwarded Mary image as an image message from `user b`
      (a chat image bubble), with a timestamp.
- [ ] The Arabic line renders RTL in the naskh face; the transliteration in mono; the
      English in the body face. Long messages wrap as chat bubbles do.
- [ ] The thread is vertically scrollable; new messages stick to the bottom unless the
      reader has scrolled up. Brand: oulipo white/black, no shadows-as-gradients kitsch
      beyond the chat metaphor; readable on a phone (>=375px) and desktop.

### US-003: Auto-play engine

**Description:** As the reader, I want the conversation to play itself at a brisk pace.

**Acceptance Criteria:**

- [ ] On load, messages appear one by one automatically, paced a little faster than a
      quick reader (pacing scales with message length); a typing indicator (the "...")
      shows briefly before each incoming message.
- [ ] The view auto-scrolls to keep the newest message in view UNLESS the reader has
      scrolled up (then it stays put, with a subtle "jump to latest" affordance); the
      reader can scroll up to re-read and down to follow at any time.
- [ ] Under `prefers-reduced-motion`, the whole thread is shown at once (no typing
      animation, no auto-scroll choreography), still scrollable.
- [ ] When the last message of a screen has played, the transition (US-005) is armed.

### US-004: The decaying Mary, one generation per screen

**Description:** As the reader, I want Mary to visibly wear with each forward.

**Acceptance Criteria:**

- [ ] The image header uses the reused generational-JPEG decay engine; screen N renders
      the image at decay generation N-1 (screen 1 ~ pristine, screen 5 heavily worn).
- [ ] The decay generation is read from the `?screen=` route, so a window/tab opened to
      screen 4 shows the right wear even loaded cold.
- [ ] Reduced-motion shows the decayed still (no animated re-encode).

### US-005: Forward the piece - windows / tabs / mobile notification

**Description:** As the reader, when a screen's conversation ends, the next screen
arrives the way a forward would.

**Acceptance Criteria:**

- [ ] The transition is always triggered by a user tap/click (an in-thread
      WhatsApp-style notification "user b sent you an image" appears at the end of a
      screen), so the browser never blocks it as an unsolicited popup.
- [ ] DESKTOP, not fullscreen: tapping opens the next screen as a NEW browser window
      (`window.open` with size/position features) that floats offset from the opener.
- [ ] DESKTOP, fullscreen (`document.fullscreenElement` or the window fills the screen):
      tapping opens the next screen as a NEW TAB.
- [ ] MOBILE / coarse-pointer: an in-app notification banner appears; tapping it opens
      the next screen (same window navigation, since phones do not float windows).
- [ ] Each opened surface loads `/mother-patina/?screen=N` and plays that screen from
      the top. Screen 5 ends the piece (a final "habibi", no further forward).
- [ ] If a real window/tab is blocked despite the gesture, fall back to same-window
      navigation so the piece never dead-ends (logged, not silent).

### US-006: Routing + the five screens wired from data

**Description:** As the builder, I want one page parameterized by screen, driven by data.

**Acceptance Criteria:**

- [ ] `index.html` reads `?screen=N` (default 1, clamp 1..5) and renders that screen's
      messages + image + decay from `data/screens.json`.
- [ ] No per-screen duplicate HTML; the five screens differ only by data + the `?screen`
      param.
- [ ] Deep-linking to `/mother-patina/?screen=3` works standalone (plays screen 3).

### US-007: Tests, gates, visual verification

**Description:** As the builder, I want it machine-verified to the votive-patina bar.

**Acceptance Criteria:**

- [ ] e2e (mobile + desktop + reduced-motion): screen 1 auto-plays to its end; the
      thread is scrollable; the transition notification appears and tapping it spawns the
      next surface (assert the popup `page` event on desktop; assert navigation on
      mobile); screen N shows decay generation N-1.
- [ ] `lint:html`, `verify:purity`, `test:unit` (data shape + decay map) all green.
- [ ] Visual screenshots captured (mobile + desktop) of a mid-conversation screen and
      the decay progression.

## Functional Requirements

- FR-1: `/mother-patina/` is a standalone, offline, no-bundler, vanilla-JS piece in the
  oulipo repo; votive-patina is untouched.
- FR-2: The conversation script lives entirely in `data/screens.json`; the page renders
  it as a WhatsApp thread (a=right, b=left, system=center, image header per screen).
- FR-3: Messages auto-play at a brisk, length-scaled pace with typing indicators; the
  thread is scrollable; reduced-motion shows it all at once.
- FR-4: The Mary image decays one generation per screen via the reused engine; the
  generation derives from `?screen=N`.
- FR-5: A screen ends with a tap-triggered forward: new window (desktop) / new tab
  (fullscreen) / mobile notification -> next screen; popups are gesture-triggered so
  they are not blocked; same-window navigation is the fallback.
- FR-6: All quality gates green; verified on mobile + desktop.

## Non-Goals

- No realtime / Supabase / multi-device sync (this is one reader's thread).
- No bundler, framework, or build step; no network calls at all (fully offline).
- Not modifying votive-patina or the stage layer.
- Not auto-opening windows without a user gesture (browsers block that, and it is
  hostile); every forward is a tap.
- Not real WhatsApp integration; this is the look and rhythm, not the app.

## Technical Considerations

- Reuse: copy `mary-interactive.jpg` + `lib/decay.js` (+ the Amiri Arabic font) from
  votive-patina into mother-patina so the piece is self-contained, OR reference them by
  relative path. Decide for the least coupling; copying keeps mother-patina shippable on
  its own.
- Transition detection: fullscreen via `document.fullscreenElement` /
  `matchMedia("(display-mode: fullscreen)")` / `innerHeight===screen.height`; mobile via
  `matchMedia("(pointer: coarse)")` + width. `window.open(url, "_blank", "popup,width=H,
height=W,left=X,top=Y")` for floating windows (position offset from the opener);
  `window.open(url, "_blank")` for a tab.
- Playwright can capture `window.open` via `context.waitForEvent("page")`, so US-005 is
  testable; the mobile path asserts same-window navigation.
- Pacing: per-message delay = base + chars \* perChar, with a typing-indicator beat
  before incoming (b) messages; tune against a "faster than a quick reader" target.
- Auto-scroll: track whether the reader is near the bottom (within a threshold) to
  decide stick-to-bottom vs leave-be.
- Purity: this piece has NO allowed remote hosts (unlike the stage layer); the strict
  no-network purity check applies unchanged.

## Conversation script (verbatim, to encode in data/screens.json)

Roles: `b` = left/incoming, `a` = right/sent, `system` = centered. Every screen begins
with `b` sending the Mary image, then the prayer line as three `b` messages (arabic /
translit / english).

- SCREEN 1 (decay gen 0) - line `بحضنك خذينا` / `FI 7OUDNIKI KHOUZINA` / "Into your bosom
  take us": b "Embrace us." | a "Also ingest us. Metabolize us." | a "Your body both
  child-eater and church." | a "I remember the old ladies chanting from the top of their
  lungs in the church my grandfather took me to every single day of summer vacation in
  the country side. The incense smuggling god into my lungs, which is the closest you can
  get to the heart through the nose." | b "Embrace us. Mary, ingest us." | a "Your stomach
  acids dissolve our defenses. Drill this faith into our bones until these masks become
  skin." | b "this is a story of submission" | a "this is a story of translation"
- SCREEN 2 (gen 1) - `وعن كل شر ابعدينا` / `WA 3AN KOULLI CHARREN 2EB3IDINA` / "And keep
  us away from all evil": a "which means move us. Remove our bodies from risky territory."
  | a "Evil imagined as conquest, as outsider - a snake, a criminal, a mosquito, a
  dictator, a dog with rabies. but never a cancer. Never the body assaulting itself. Never
  the teeth biting their inner cheeks, blood filling our mouths as we get drunk on
  ourselves." | b "Mary, keep us away from that too." | a "The skin inside our skins. Move
  us away, deeper this time, into what must be the heart." | b "this is a story of
  translation" | a "translation its own performance of loss, decay and failed
  approximation" | b "i'm trying to call you" | a "i missed you"
- SCREEN 3 (gen 2) - `يا أم يسوع` / `YA OUM YASSOU3` / "mother of Jesus.": a "It must be
  hard to raise a child who straps his body to a rocket bound to kingdom come." | a "Hard
  to birth a boy with a death drive." | b "Love his body and wish your touch could add a
  growth ring to his skin, make it thick, hard enough to bend the iron nails of an
  empire." | b "this is a story of loss" | a "and transmission. every forward of mary
  glitches her likeness" | a "the jpeg lossy, the pixels falling" | b "but she knows" | a
  "she is multiplying, scattering" | b "the network is the prayer" | b "the golden threads
  of bandwidth" | b "fiber optic whispers ocean deep" | a "the ghost relics of
  transmission. this is a story of" | b "submission" | a "invasion"
- SCREEN 4 (gen 3) - `تشفعي فينا` / `TACHAFA3I FINA` / "": a "Intercede for us. Pray for
  us" | b "but really pray to your son." | a "Mary the middle woman. Mary, tell the boy
  we've been talking to him won't you. Won't you Mary, we've been in line for days and it
  doesn't let and you got your ways with him we know." | a "Won't you, won't you Mary." | b
  "this is a song" | a "a maximalist attempt at echoing through invisibility" | b
  "contagion"
- SCREEN 5 (gen 4) - `أمين` / `AMIN` / "": a "which is Hebrew and Arabic for trustworthy.
  Also safe." | b "Also the name of my grandmother's neighbor, my childhood classmate." | a
  "Amin. Amen. A man kneels before a white statue whose eyes begin to water. This is not
  the opening for a joke nor a tale. The water is olive oil, the oil is blood with clots."
  | a "The church where the man is kneeling is for sale and the Virgin knows. Her body is a
  shield, metal banging steel." | a "Virgin Mary, sacred robot, Pokemon Go: Your womb is an
  empty ball to catch them all. Hollow Eve, now with a human inside." | b "epiphany weaved
  into the gene" | a "encoded, decoded" | b "biology humming the womb's song" | b "I tried
  to call you" | a "I missed you" | a "I miss you" | b "habibi"

## Success Metrics

- Loading `/mother-patina/` plays screen 1 as a living WhatsApp thread; finishing it
  forwards the next screen the right way for the surface (window/tab/notification); Mary
  wears down to screen 5's "habibi"; all gates green; verified mobile + desktop.

## Open Questions

- "Things marked explicit appear in the middle": which exact lines are centered
  `system` messages vs normal dialogue? Default assumption: keep every line as its
  attributed a/b bubble, and center only structural notes (the per-screen "user b sent
  an image" / a date header). Tell me which dialogue lines (e.g. the "this is a story
  of ..." refrains, or "submission/invasion/contagion") you want centered and I will
  mark them.
- Reuse by copy vs reference for the Mary image + decay engine (assumed: copy, so
  mother-patina ships independently).
- Timestamps: a single frozen time per screen, or incrementing? (assumed: a quiet,
  frozen "6:03 AM" per the original 6:03 motif.)
- Mobile "next screen": same-window navigation (assumed) vs a new tab.
