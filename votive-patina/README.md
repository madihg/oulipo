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

## Map

- `DESIGN.md` - the original build contract (tokens, DOM selectors, module specs).
- `Context.md` - living project notes (incl. the v3 redesign + bugs fixed).
- `lib/decay.js` - generational JPEG-loss engine (Canvas 2D, deterministic).
- `lib/console-prayer.js` - the bilingual scripture + single source of truth for
  every prayer string; mirrored (not duplicated) into the faux-console drawer.
- `lib/boxes.js` - the YOLO/COCO detection overlay (boxes as accessible buttons).
- `lib/constellation.js` - the rays + satellites (a sunburst halo on wide screens,
  downward threads on narrow), revealed in batches as you pray.
- `lib/lightbox.js` - a found prayer, enlarged, with its pink/green boxes + panel.
- `lib/about.js` - the focus-trapped About modal (framing + essay).
