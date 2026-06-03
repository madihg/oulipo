# votivepatina

A net.art / e-lit piece for [ORAL.pub](https://oral.pub), built around the poem
_"my mother sends me a picture of the Virgin Mary on WhatsApp."_ A reflection on
faith, memory, and decay - Arab Christianity held quietly, hand to hand, now screen
to screen.

You click a machine-vision detection box to "pray." The same click that inscribes
the prayer - into the real browser console, into `localStorage`, and into this
page's source - is the click that wears the icon down one generation of JPEG loss.
Attending preserves and erodes in the same motion. The machine sees `person 0.94`
and misses everything that matters, which is hidden behind the click, the `+`, and
the console.

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

Shipped artwork: `index.html`, `styles.css`, `main.js`, `lib/{decay,console-prayer,
boxes}.js`, `data/*.json`, `assets/*`. Fully client-side and offline-capable -
nothing about the visitor leaves the device.

Not shipped: `package.json`, `tests/`, `scripts/`, `playwright.config.mjs`, and the
**optional generative layer** (`lib/generative-expansion.js` + `experimental/`),
which is OFF by default and never imported by the artwork. It lets the machine
"dream" an alternative `+` expansion via the Claude API; enabling it makes a network
call, which breaks the offline/no-surveillance principle, so it lives only in
`experimental/generative.html` for testing. See `experimental/README.md`.

## Placeholders (TODO - replace when assets arrive)

The piece is whole, but these are stand-ins (also tracked atop `main.js`):

- `assets/mary-interactive.jpg` - a generated, text-free placeholder Virgin. Replace
  with the real **text-free** photographic Mary (so live Arabic overlays it and only
  the photo decays). Generational JPEG loss reads far more dramatically on a real
  photograph than on the flat placeholder.
- `assets/litany/*.jpg` - generated WhatsApp-meme placeholders. Replace with the real
  burned-in-Arabic litany set.
- `assets/fonts/` - **Amiri** (Arabic naskh) and **EB Garamond** are bundled (SIL
  OFL). Swap in the licensed display face if desired.
- `<SUBSTACK_URL>` - the final console invite line (in `lib/console-prayer.js`).

## Map

- `DESIGN.md` - the build contract (tokens, DOM selectors, module interfaces, specs).
- `tasks/prd-votivepatina.md` - requirements / acceptance criteria.
- `Context.md` - living project notes.
- `lib/decay.js` - generational JPEG-loss engine (Canvas 2D, deterministic).
- `lib/console-prayer.js` - the scripture and single source of truth for every
  prayer string; mirrored (not duplicated) into the mobile faux-console drawer.
- `lib/boxes.js` - the YOLO/COCO detection overlay (boxes as accessible buttons).
