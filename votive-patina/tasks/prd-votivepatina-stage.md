# PRD: votivepatina-stage (live performance layer)

## Overview

Add a staged, multi-device performance layer on top of the existing votivepatina
piece (`votive-patina/`, oulipo.xyz/votive-patina/). Three surfaces - a performer
display, many audience phones that join by QR, and an admin console - stay in sync
live via Supabase Realtime. The audience (arranged on a Zoom grid) drives the piece
by "passing the peace": a deliberate phone gesture that registers as one peace. Each
crossing of a per-station threshold advances the station, reveals the next
translation as a dismissible on-image overlay, lights the next thread of light, and
steps the generational JPEG decay one generation. There are 5 stations - the five
prayer lines, each with long-form narration and a directional prompt - so the image
is fully decayed by the finale ("Amin"). Reuse the existing image, decay engine,
detection boxes, console prayer, and translation overlay; extend, do not rebuild.

## Goals

- Three surfaces (performer / `/audience` / `/admin`) that stay in sync live over
  Supabase Realtime, with no bundler, deployed on Vercel over HTTPS.
- Audience phone: tap-to-join -> iOS motion permission -> one peace per station, with
  a visible manual fallback when motion is denied or unavailable.
- Crossing the per-station threshold (`PASSES_PER_STATION`, default = audience size N,
  tunable live in admin) advances the station on every surface, shows the dismissible
  on-image translation, lights the next thread, and steps the decay one generation.
- Decay reuses the existing generational-JPEG engine: one generation per station, fully
  decayed at the last station (5 stations -> `decayGen` 0..5, matching `MAX_STEP` 5).
- A live "{peaceCount} people passed the peace" readout on performer and audience.
- The translation appears as a dismissible overlay ON TOP of the image on the main page
  (mobile + desktop) and the same overlay is reused on `/audience`.
- Access controls top-right: a QR button styled per the reference screenshot and the
  existing "?" restyled to match and moved to its right; the "pray for us" button and
  all drifted fonts brought back in line with the design system.
- All quality gates green, including new multi-surface e2e and a 2-client realtime-sync
  test; the piece verified on mobile and desktop.

## Quality Gates

These commands must pass for every user story (run from `votive-patina/`):

- `npm run test:unit` - Node `--test` unit suite (decay curve, prayer strings, plus the
  new stations-data and performance-state reducer tests).
- `npm run lint:html` - `html-validate` on every shipped HTML entry (index.html and the
  new audience/admin pages).
- `npm run verify:purity` - UPDATED for this build: the no-network check now allowlists
  the Supabase Realtime client (the `@supabase/supabase-js` ESM module from the CDN and
  the project's `*.supabase.co` realtime endpoint). It still BLOCKS analytics/trackers
  and any other remote host, still forbids minification, and still asserts the ASCII
  relic + intact comments. No bundler is introduced.
- `npm run test:e2e` - Playwright across mobile / desktop / reduced-motion, including the
  new performer/audience/admin specs, synthetic-devicemotion tests, and a 2-client
  realtime-sync test (loopback / mocked transport so it runs offline in CI).
- Visual verification (REQUIRED for UI stories): preview server + screenshots on mobile
  and desktop of the restyled top-right controls, the on-image overlay, and the threads
  lighting across stations.

## User Stories

### US-001: Relax the purity gate + scaffold the realtime layer

**Description:** As the builder, I want the purity check updated and a shared realtime
module in place so the stage layer can use Supabase without a bundler and without
weakening the no-tracker stance.

**Acceptance Criteria:**

- [ ] `scripts/verify-purity.mjs` allowlists the Supabase Realtime client (the
      `@supabase/supabase-js` ESM import URL and the `*.supabase.co` realtime endpoint),
      still flags any OTHER remote host or analytics/tracker call, still forbids
      minification, and still asserts the relic + comments. `npm run verify:purity` passes.
- [ ] `lib/realtime.js` exports a `joinSession({ sessionId, role })` that loads the
      Supabase client from the CDN ESM, opens a channel named for the session id, and
      exposes `broadcast(state)`, `onState(cb)`, `sendPeace(payload)`, `onPeace(cb)`,
      and presence join/leave with a connected-count callback. No bundler is added.
- [ ] Supabase config (oulipo_main URL + publishable anon key) lives in one
      `lib/realtime-config.js`; the key is the publishable anon key only (no service key).
- [ ] A smoke test connects two channel clients over a loopback/mocked transport and
      confirms a broadcast from one reaches the other.

### US-002: Stations data model (the 5-station score)

**Description:** As the builder, I want the performance score encoded as data so every
surface renders the same stations in order.

**Acceptance Criteria:**

- [ ] `data/stations.json` defines exactly 5 stations in order, each with:
      `{ index, translit, arabic, english, narration, prompt, direction }` where
      `direction` is one of `right | left | up | down | heart`.
- [ ] The five `arabic` values equal the existing `ARABIC_LINES`
      (بحضنك خذينا / وعن كل شر ابعدينا / يا أم يسوع / تشفعي فينا / أمين), in order; the
      `narration` and `prompt` fields carry Halim's provided text per station.
- [ ] An optional `preroll` block holds the opening narration + the "scan this QR" cue.
- [ ] A unit test asserts: exactly 5 stations, correct order, all required fields present
      and non-empty, and `direction` within the allowed set.

### US-003: Shared performance-state reducer

**Description:** As the builder, I want a pure state module so threshold logic and
dedupe are deterministic and unit-testable, independent of the transport.

**Acceptance Criteria:**

- [ ] A pure module exposes the state `{ peaceCount, stationIndex, decayGen, threadsLit,
passesThisStation }` and `applyPeace(state, { deviceId, stationIndex })`,
      `setThreshold(n)`, and `reset()`.
- [ ] `applyPeace` increments `peaceCount` and `passesThisStation`, but is a no-op when
      the same `deviceId` already passed at the current `stationIndex` (dedupe per device
      per station) or when `stationIndex` is past the finale.
- [ ] When `passesThisStation` reaches `PASSES_PER_STATION`, the station advances by
      exactly one: `stationIndex += 1`, `decayGen = stationIndex`, `threadsLit = stationIndex`,
      `passesThisStation = 0`. Reaching the last station sets the finale flag.
- [ ] `reset()` returns `peaceCount=0, stationIndex=0, decayGen=0, threadsLit=0`.
- [ ] Unit tests cover: increment, dedupe per device per station, exactly-one-advance at
      threshold, decay/threads bump with the advance, finale at station 5, and reset.

### US-004: Realtime sync (broadcast + presence, single authority)

**Description:** As any surface, I want one authoritative state so peaces from many
phones never double-count and every screen shows the same numbers live.

**Acceptance Criteria:**

- [ ] One host (the performer, or admin if no performer) owns the reducer: audience
      surfaces `sendPeace({ deviceId, stationIndex })`; the host applies it and
      `broadcast`s the new state; all surfaces render from the broadcast.
- [ ] Presence reports the count of connected audience devices to the admin.
- [ ] A 2-client e2e test (two browser contexts, loopback/mocked transport): a peace from
      client A is reflected in client B's `peaceCount` within 2s; presence shows 2; a
      duplicate peace from A at the same station does not change the count.

### US-005: Performer page (existing main page in stage mode)

**Description:** As the performer, I want the existing main page to run in stage mode,
showing the synced decay and the current station, so the room sees one shared image.

**Acceptance Criteria:**

- [ ] A stage-mode entry (e.g. `?stage=performer` or `/performer`) on the existing page
      subscribes to the channel and renders: the Mary image at the synced `decayGen`, the
      current station's line + narration, the live "{peaceCount} people passed the peace"
      readout, and the threads of light with `threadsLit` of 5 lit.
- [ ] The performer surface does NOT request device motion and does not emit peaces.
- [ ] e2e: injecting a channel state (`stationIndex`, `decayGen`, `peaceCount`,
      `threadsLit`) renders the matching station text, the canvas at the right decay
      generation, the right number of lit threads, and the readout value.

### US-006: Audience page `/audience` (join + sync)

**Description:** As an audience member, I want to scan the QR, tap to join, and see the
same image and count as the room.

**Acceptance Criteria:**

- [ ] `/audience` shows a "Tap to join" entry that, on tap, calls
      `DeviceMotionEvent.requestPermission()` where present (iOS 13+) and joins the channel.
- [ ] After joining it shows the synced Mary image at the same `decayGen`, the
      "{peaceCount} people passed the peace" readout, and the current station's line +
      movement prompt as a dismissible on-image overlay.
- [ ] e2e: tap-to-join transitions to a joined state; an injected channel state syncs the
      image decay and the readout; the overlay shows the current line + prompt and is
      dismissible (tap-outside and X).

### US-007: Passing the peace (motion + dedupe + manual fallback)

**Description:** As an audience member, I want a deliberate phone motion to register as
exactly one peace for this station, with a button if motion is blocked.

**Acceptance Criteria:**

- [ ] Detection is magnitude-based: acceleration magnitude over a threshold, debounced so
      one deliberate motion emits one peace; direction is choreographic (not verified).
- [ ] A peace is deduped per device per station: repeated shaking within the same station
      emits at most one peace; after the station advances, one new peace is allowed.
- [ ] When motion permission is denied or `DeviceMotionEvent` is unavailable, a visible
      manual "pass the peace" button is shown and emits exactly one (deduped) peace.
- [ ] e2e with synthetic `devicemotion` events: one strong motion -> one peace; rapid
      repeats -> still one; post-advance -> one more allowed; denied-permission path shows
      and exercises the manual button.

### US-008: Admin page `/admin` (N, threshold, reset)

**Description:** As the operator, I want to set the audience size and threshold and reset
cleanly between performances.

**Acceptance Criteria:**

- [ ] `/admin` lets the operator set audience size N and `PASSES_PER_STATION` (default = N)
      live, and shows the presence-based connected-device count next to N.
- [ ] Changing `PASSES_PER_STATION` takes effect for the next threshold evaluation without
      reload.
- [ ] A Reset control zeroes `peaceCount`, sets `decayGen=0`, `stationIndex=0`, threads off,
      and all surfaces reflect generation 0 / station 0 within 2s.
- [ ] e2e: changing the threshold then driving peaces advances at the new threshold; reset
      returns every surface to the start state.

### US-009: Threshold -> advance, end to end

**Description:** As the room, when enough of us pass the peace, I want the station to
advance everywhere at once - overlay, thread, and decay together.

**Acceptance Criteria:**

- [ ] When `passesThisStation` reaches `PASSES_PER_STATION`, the station advances exactly
      once: the next overlay appears on performer + audience, `threadsLit` increments, and
      `decayGen` increments (one generation).
- [ ] Reaching the last station lights all 5 threads and sets the finale state; further
      peaces do not advance past the finale.
- [ ] e2e (2 clients driving peaces to threshold): exactly one advance per threshold,
      overlay + threads + decay update together on both surfaces, and the finale lights all
      5 threads at station 5.

### US-010: On-image translation overlay on the main page

**Description:** As a visitor (and as audience), I want a text's translation to appear on
top of the image as an easily dismissible overlay, on mobile and desktop.

**Acceptance Criteria:**

- [ ] On the existing main page, opening a detection-box translation shows it as an overlay
      ON TOP of the image (not a separate panel below), dismissible by tap-outside and by an
      X, on both mobile and desktop.
- [ ] The overlay is a single reusable module imported by both the main page and `/audience`
      (no duplication).
- [ ] e2e: main page - clicking a text box opens the on-image overlay; tap-outside and X
      both dismiss; verified at mobile and desktop viewports.

### US-011: Design-system conformance (QR + "?" controls, "pray for us", fonts)

**Description:** As Halim, I want the access controls and type to match my design system
and the reference screenshot.

**Acceptance Criteria:**

- [ ] Top-right: a "SHOW QR" button styled per the reference (bordered box, mono uppercase,
      QR glyph) that opens/zooms a scannable QR encoding the absolute `/audience` URL
      (with session id); the existing "?" is restyled to the same treatment and sits to the
      RIGHT of the QR button.
- [ ] The "pray for us" button is restyled to the design system; fonts that have drifted are
      brought back to the design-system tokens (Standard / Terminal Grotesque / Diatype per
      the oulipo brand).
- [ ] Visual verification: mobile + desktop screenshots show the two controls top-right in
      the reference style; an e2e check asserts the QR target resolves to `/audience` and the
      "pray for us" button + headings use the expected font-family/classes.

### US-012: Full dry-run, test suite, and docs

**Description:** As the builder, I want a scripted end-to-end dry run and updated docs so a
performance can be run and re-run with confidence.

**Acceptance Criteria:**

- [ ] An e2e "dry run": admin sets N + threshold, two audience clients join, peaces are
      driven through all 5 stations to the finale with the performer reflecting each advance,
      then reset returns to the start - all assertions pass.
- [ ] All four gates pass (`test:unit`, `lint:html`, `verify:purity`, `test:e2e`).
- [ ] `README.md` / `Context.md` document the three surfaces, the Supabase channel contract
      (the broadcast fields and the peace payload), the routing, and an on-device iOS motion
      checklist for show day.

## Functional Requirements

- FR-1: The system must run three surfaces - performer (the existing page in stage mode),
  `/audience`, and `/admin` - that share live state over a single Supabase Realtime channel
  keyed to a session id, with no bundler and over HTTPS on Vercel.
- FR-2: Shared state is `{ peaceCount, stationIndex, decayGen, threadsLit }`; a single host
  is authoritative and broadcasts state; audience surfaces emit peace events only.
- FR-3: A peace is one deliberate phone motion (magnitude threshold + debounce), deduped per
  device per station; a manual button is the fallback when motion is unavailable or denied.
- FR-4: When a station's peaces reach `PASSES_PER_STATION` (default = N, set live in admin),
  the station advances by one and `decayGen` and `threadsLit` each increment by one; the last
  station is the finale with all threads lit.
- FR-5: `decayGen` drives the existing generational-JPEG decay engine (`renderStep`), one
  generation per station, 0..5 across the 5 stations.
- FR-6: The performer shows the station line + narration + the live peace readout; the audience
  shows the synced image + the line + the movement prompt as a dismissible on-image overlay +
  the same readout.
- FR-7: The translation overlay on the main page renders on top of the image and is dismissible
  (tap-outside / X) on mobile and desktop; the same module is reused on `/audience`.
- FR-8: Admin can set N and `PASSES_PER_STATION` live and reset all state (peaces 0, decay gen 0,
  station 0, threads off) between performances; presence reports connected device count.
- FR-9: Access controls sit top-right: a QR button (per the reference screenshot) opening a QR to
  `/audience`, and the restyled "?" to its right; the "pray for us" button and fonts conform to
  the oulipo design system.
- FR-10: `verify:purity` is updated to allow the Supabase Realtime client and `*.supabase.co`
  endpoint only, while still blocking analytics/trackers and minification and asserting the relic.

## Non-Goals (Out of Scope)

- No bundler, framework, or build step; vanilla JS + ESM from CDN only.
- No Zoom integration - the Zoom grid is the human layer; this build only drives phones + screens.
- No directional gesture detection - magnitude only; the prompt's direction is choreographic.
- No persistence of ephemeral performance state beyond the channel (only session config N /
  threshold may persist if needed); no database schema work required for the core flow.
- No heavyweight admin auth - an obscured route (and optional shared passcode) is enough; not a
  user-accounts system.
- Not redesigning the decay engine, the detection boxes, or the console-prayer plumbing - reuse them.
- Not translating or rewriting the provided narration; it is used verbatim per station.

## Technical Considerations

- Realtime: `@supabase/supabase-js` loaded as ESM from a CDN (esm.sh / skypack); Realtime
  broadcast + presence on a per-session channel. Project: oulipo_main (ref smytgqkgomsfyurskpcl);
  publishable anon key only. Single-authority reducer avoids double-counting across phones.
- Routing on Vercel (static): `/votive-patina/audience/` and `/votive-patina/admin/` as their own
  `index.html`; performer is the main page in stage mode (`?stage=performer` or a `/performer/`
  rewrite). Confirm the path scheme during US-005/006/008.
- Motion: `DeviceMotionEvent.requestPermission()` must be called from the tap-to-join user
  gesture (iOS 13+); HTTPS required (Vercel is fine). Magnitude from `accelerationIncludingGravity`
  with a gravity-baseline subtraction, threshold + debounce, dedupe via a local set keyed by
  `stationIndex`.
- Decay: reuse `createDecayEngine` + `renderStep(stationIndex)`; the top-card `MAX_STEP` is 5, so
  5 stations map cleanly to generations 0..5 (pristine at preroll, fully worn at "Amin").
- Threads of light: reuse / adapt the existing constellation rays as 5 threads (or a dedicated
  5-thread SVG echoing the reference line drawing); light `threadsLit` of them. Keep the mobile
  bounds fix in mind (no horizontal overflow).
- QR: generate client-side (a small QR lib via ESM, or a prebuilt SVG) encoding the absolute
  `/audience` URL with the session id.
- Testing: drive `devicemotion` and channel state via injected events in Playwright; the 2-client
  sync test uses a loopback/mocked transport so CI runs offline; keep the existing
  mobile/desktop/reduced-motion projects.

## Success Metrics

- All four gates green; the dry-run e2e walks all 5 stations to the finale and resets.
- On show day: phones join by QR, tap-to-join grants motion (or fall back to the button), a peace
  registers once per station, the live count matches the room, each threshold advances the station
  with overlay + thread + decay together, and the image is fully worn by "Amin".
- The main-page translation reads as an on-image overlay on mobile and desktop; the top-right QR +
  "?" and the "pray for us" button match the design system and the reference screenshot.

## Open Questions

- Admin access: open obscured URL, or a shared passcode / `?key=` guard? (Assumed: obscured route,
  optional passcode.)
- Session id: admin-generated and held for the show (QR encodes it) vs a fixed id. (Assumed:
  admin generates/holds it.)
- Threads visual: adapt the 11-satellite constellation rays down to 5 threads, or a dedicated
  5-thread line per the screenshot? (Assumed: 5 threads, design tuned against the reference.)
- Preroll: show the opening narration + "scan this QR" as a station-0 screen on the performer?
  (Assumed: yes, a preroll state before station 1.)
- Does the audience phone show the decaying image, or only the line + prompt + count? (Assumed:
  it shows the synced image too, per the brief.)
