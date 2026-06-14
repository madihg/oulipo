# votivepatina

A net.art / e-lit piece for [ORAL.pub](https://oral.pub), built around the poem
_"my mother sends me a picture of the Virgin Mary on WhatsApp."_ A reflection on
faith, memory, and decay - Arab Christianity held quietly, hand to hand, now screen
to screen.

One bilingual button - "Pray for us" / "صلّي لأجلنا" - asks you to click the colored
squares. Each square you open inscribes a prayer line (into the real console, into
`localStorage`, into this page's source), wears the icon down one generation of JPEG
loss, brightens a yellow radiance, and shoots a ray of light from the icon that hangs
a forwarded prayer at its end - a real Virgin Mary jpeg someone WhatsApped someone.
By 5 of 5 the prayer is answered: the full bilingual prayer is copied to your
clipboard and written in the console. Attending preserves and erodes in the same
motion. The machine sees `person 0.94` and misses everything that matters, which is
hidden behind the click, the "+", the satellites, and the console. ("About", behind
the subtle "?", holds the framing and the essay.)

**The code is the prayer.** View Source is a catacomb: an ASCII relic sits at the
top of `index.html`, and the prayer accretes there as HTML comments while you pray.

## Run it

It uses ES modules and loads its own JSON, so it must be served over HTTP (not
opened as a `file://`). Any static server works:

```bash
cd votive-patina
npm run serve          # -> http://localhost:4178   (zero-dependency static server)
# or: python3 -m http.server 4178
```

Deploys as plain static files - drop the folder on any static host. No build step,
no bundler, no minifier: **the deployed source equals the authored source.**

## Test

```bash
npm install
npx playwright install chromium
npm test               # unit + html-validate + purity + Playwright e2e
```

Individual gates: `npm run test:unit`, `npm run lint:html`, `npm run verify:purity`,
`npm run test:e2e`. Tooling is **dev-only** and never ships; `verify:purity` guards
that boundary (no minification, comments intact, the relic present, and no
remote/analytics calls in the shipped JS).

## What ships vs. what doesn't

Shipped artwork: `index.html`, `styles.css`, `main.js`,
`lib/{decay,console-prayer,boxes,constellation,lightbox,about}.js`, `data/*.json`,
`assets/*`. Fully client-side and offline-capable - nothing about the visitor leaves
the device (the answered-prayer copy uses the local clipboard only).

Shipped live-performance layer (votivepatina-stage): `stage.css`, `admin/`,
`audience/`, `lib/{perf-state,realtime,stage,motion,performer,qr}.js`,
`lib/realtime-config.js`, `data/stations.json`. This layer DOES talk to the network
(Supabase Realtime + the QR encoder from esm.sh) and is reached only via the
`/admin`, `/audience`, and `?stage=performer` routes - the plain art page stays offline.

Not shipped: `package.json`, `tests/`, `scripts/`, `playwright.config.mjs`, and the
**optional generative layer** (`lib/generative-expansion.js` + `experimental/`),
which is OFF by default and never imported by the artwork. It lets the machine
"dream" an alternative `+` expansion via the Claude API; enabling it makes a network
call, which breaks the offline/no-surveillance principle, so it lives only in
`experimental/generative.html` for testing. See `experimental/README.md`.

## Assets + notes

- `assets/mary-interactive.jpg` - the top icon: Halim's real forwarded bowed-Mary
  jpeg (its own baked Arabic scrimmed so the live prayer reads over it).
- `assets/litany/litany-01..11.jpg` - the 11 found prayers (real WhatsApp-forwarded
  Marys with burned-in Arabic), read off the picture, translated, and answered in
  Halim's voice in `data/content.json`'s `litany` array.
- `assets/fonts/` - **Amiri** (Arabic naskh) + **EB Garamond** are bundled (SIL OFL).
  Swap in a licensed Arabic display face if desired.
- The Substack link was removed - the essay now lives in the About modal.

## Live performance (votivepatina-stage)

A staged, multi-device layer sits on top of the piece for live shows. Three
surfaces stay in sync over **Supabase Realtime** (broadcast + presence on a
per-session channel); the audience (on a Zoom grid) drives it by "passing the
peace" - one deliberate phone gesture each. The score is five stations (the five
prayer lines, each with narration + a directional prompt, in `data/stations.json`);
crossing a per-station threshold advances the station, reveals the next on-image
translation, lights the next thread of light, and wears the image one generation of
JPEG decay - so it is fully worn by "Amin".

Surfaces (the session id is the `?s=` param; the audience scans the QR):

- **Performer** - `/?stage=performer&s=<id>` : the main page in stage mode. A pure
  renderer of the channel - the decaying icon, the active station (line + narration),
  five threads of light lit per completed station, the live "{N} passed the peace"
  readout, and the top-right `[ SHOW QR ] [ ? ]` controls.
- **Audience** - `/audience/?s=<id>` : phone-first. Tap to join (grants iOS motion),
  then the synced image with the station line + movement prompt as a dismissible
  on-image overlay, and pass-the-peace by motion (or the always-present button).
- **Admin** - `/admin/?s=<id>` : the operator console and the single **authority**
  (it owns the reducer). Set N and the per-station threshold (default = N) live,
  begin, reset between shows, and watch presence + the live state.

Channel contract (`lib/realtime.js`): the admin broadcasts `state`
`{ peaceCount, stationIndex, decayGen, threadsLit, threshold, started, finale, ... }`;
the audience sends `peace` `{ deviceId, stationIndex }`. Peaces are deduped per device
per station, in the pure reducer `lib/perf-state.js`.

Run a local rehearsal: `npm run serve`, open `/admin/?s=demo`, `/?stage=performer&s=demo`,
and `/audience/?s=demo` (set N + threshold, Begin, pass). For tests, append
`&rt=loopback` to use an offline BroadcastChannel transport (no network).

**Show-day iOS checklist**: the audience link must be HTTPS (Vercel is fine);
"Tap to join" is the gesture that lets iOS grant `DeviceMotionEvent` permission; if a
phone denies it, the on-screen "Pass the peace" button is the fallback.

**Note on purity**: the stage layer uses Supabase Realtime, so `verify:purity` is
relaxed to allow exactly the Supabase client (esm.sh) + `*.supabase.co`, and STILL
blocks every other remote host and analytics. The offline art page makes no network
call unless it is loaded in `?stage=performer`.

## Map

- `DESIGN.md` - the original build contract (tokens, DOM selectors, module specs).
- `Context.md` - living project notes (incl. the v3 redesign + bugs fixed).
- `tasks/prd-votivepatina-stage.md` - the PRD for the live-performance layer.
- `lib/perf-state.js` - the pure performance-state reducer (threshold + dedupe).
- `lib/realtime.js` - the Supabase + offline-loopback transport (one channel/show).
- `lib/stage.js` - the controller (admin authority; performer/audience renderers).
- `lib/motion.js` - "pass the peace": deliberate-motion detection + iOS permission.
- `lib/performer.js` - performer stage mode (renderer of the channel) + QR/about.
- `lib/qr.js` - the QR encoder (loaded on demand for the operator surfaces).
- `lib/decay.js` - generational JPEG-loss engine (Canvas 2D, deterministic).
- `lib/console-prayer.js` - the bilingual scripture + single source of truth for
  every prayer string; mirrored (not duplicated) into the faux-console drawer.
- `lib/boxes.js` - the YOLO/COCO detection overlay (boxes as accessible buttons).
- `lib/constellation.js` - the rays + satellites (a sunburst halo on wide screens,
  downward threads on narrow), revealed in batches as you pray.
- `lib/lightbox.js` - a found prayer, enlarged, with its pink/green boxes + panel.
- `lib/about.js` - the focus-trapped About modal (framing + essay).
