# votivepatina - Design & Build Contract

This is the single source of truth for the build. Every module, test, and asset
conforms to the interfaces, selectors, tokens, and specs below so that
independently-built pieces integrate without conflict. If you change a contract
here, update every consumer.

Concept governs craft: **the code is the prayer.** Ship readable, unminified
source. View Source must reveal a real prayer, not a bundle.

---

## 0. File tree (authored = deployed)

```
votive-patina/
  index.html              semantic markup; ASCII relic as the first comment
  styles.css              all styles; design tokens in :root
  main.js                 orchestration / state machine (ES module)
  lib/
    decay.js              canvas generational-JPEG-loss engine
    console-prayer.js     real console.log scripture + single source of truth for prayer text
    boxes.js              renders the YOLO detection overlay from config
    generative-expansion.js   OPTIONAL machine-dreamt "+" (OFF by default, never loaded in default build)
  data/
    content.json          5 lines: arabic / literal / expansion + virgin aside
    boxes.json            hand-authored bounding-box config
  assets/
    mary-interactive.jpg  text-free devotional Mary (placeholder until Halim provides)
    litany/               WhatsApp-style Mary "meme" jpegs (burned-in Arabic OK)
    fonts/                bundled Amiri (Arabic naskh, OFL); optional EB Garamond
  experimental/
    generative.html       sandbox to test the OFF-by-default generative layer
  tests/
    unit/                 pure-logic unit tests (Node test runner)
    e2e/                  Playwright specs covering acceptance criteria
  tasks/prd-votivepatina.md
  Context.md   DESIGN.md   README.md
  package.json            DEV-ONLY (tests + local server). Never imported by shipped source.
```

The shipped artwork = `index.html`, `styles.css`, `main.js`, `lib/*.js` (minus
generative), `data/*.json`, `assets/*`. It must run from `file://`-ish static
hosting with **no build step, no bundler, no minifier**.

---

## 1. Design tokens (declare in styles.css `:root`)

```css
:root {
  /* base - oulipo brand (white page, black-opacity ink) */
  --bg: #ffffff;
  --ink: rgba(0, 0, 0, 0.85);
  --ink-strong: #000000;
  --ink-muted: rgba(0, 0, 0, 0.6);
  --ink-subtle: rgba(0, 0, 0, 0.4);
  --rule: rgba(0, 0, 0, 0.75);

  /* detection overlay - YOLO/COCO neon, deliberately clashing */
  --yolo-green: #39ff14;
  --yolo-magenta: #ff00ff;
  --yolo-cyan: #00ffff;
  --yolo-yellow: #ffd400;
  --yolo-red: #ff3b30;
  --yolo-label-ink: #000000; /* black text on neon label tab, like YOLO */

  /* faux-console / terminal drawer - OLED dark */
  --term-bg: #0b0e14;
  --term-fg: #e6e6e6;
  --term-dim: #6b7280;
  --term-accent: #22c55e; /* the one styled link-out line */
  --term-prayer: #f8fafc;

  /* type registers (kept distinct) */
  --font-arabic:
    "Amiri", "Noto Naskh Arabic", "Geeza Pro", "Times New Roman", serif;
  --font-mono:
    ui-monospace, "SFMono-Regular", Menlo, "Cascadia Mono", Consolas,
    "Liberation Mono", monospace;
  --font-serif:
    "EB Garamond", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia,
    serif;
  /* page chrome only (cargo CDN, cached after first load): "Terminal Grotesque", "Standard" */

  /* motion */
  --t-micro: 200ms; /* panel reveal, hover */
  --t-decay: 400ms; /* cross-fade between decay frames */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* z-index scale */
  --z-image: 1;
  --z-boxes: 20;
  --z-sweep: 25;
  --z-panel: 30;
  --z-drawer: 50;
}
```

Box-type is **never** signalled by color alone: arabic-line = solid 2px stroke,
virgin = solid 3px stroke, mislabel = dashed 1.5px stroke at 0.65 opacity. Label
text also disambiguates.

---

## 2. DOM contract (IDs / classes / data-attrs) - used by main.js, boxes.js, tests

State machine: `document.body[data-state]` cycles
`idle -> detecting -> praying -> complete -> resting`.

| Element                | Selector                        | Notes                                                                       |
| ---------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| Page root state        | `body[data-state]`              | drives CSS + tests                                                          |
| Interactive card       | `#prayer-card`                  | phone-proportioned                                                          |
| Source image (hidden)  | `#mary-source`                  | `<img>`, pristine, `alt` from boxes.json                                    |
| Decay canvas           | `#mary-canvas`                  | only this layer degrades                                                    |
| Pray gate button       | `#pray-button`                  | text "Pray for us"; real `<button>`                                         |
| Counter pill           | `#counter-pill`                 | text "N of 5"; `data-count="N"`; at 5 becomes the console handle            |
| Boxes overlay root     | `#boxes-overlay`                | SVG, `aria-hidden="false"`, above canvas                                    |
| A detection box        | `button.det-box`                | `data-box-id`, `data-box-type`, `data-opened`                               |
| Box label tab text     | `.det-box .det-label`           | e.g. `text 0.93`                                                            |
| Translation panel      | `#translation-panel`            | below the image; one open at a time on mobile                               |
| Literal line           | `.tp-literal`                   | machine register (mono)                                                     |
| Expand affordance      | `.tp-expand`                    | the "+" button; `aria-expanded`                                             |
| Poetic expansion       | `.tp-expansion`                 | serif; revealed by "+"                                                      |
| Closing couplet (card) | `#closing-couplet`              | appears at 5/5, softly                                                      |
| Litany column          | `#litany`                       | WhatsApp-thread of decaying jpegs                                           |
| Litany item img        | `#litany img.litany-jpeg`       | lazy-loaded; decays with scroll depth                                       |
| Console drawer         | `#console-drawer`               | faux terminal, slides from bottom; `data-open`                              |
| Console handle         | `#console-handle`               | "look beneath" chevron; persistent on touch                                 |
| Console line           | `#console-drawer .console-line` | mirrors real console output                                                 |
| Hidden inscription     | `#inscription`                  | `hidden` element; prayer accretes here + as HTML comments in `#prayer-card` |

`prefers-reduced-motion` and pointer type also reflected on body:
`body[data-reduced-motion="1"]`, `body[data-coarse-pointer="1"]` (set by main.js).

---

## 3. localStorage (namespaced `votivepatina.*`)

| Key                        | Type   | Meaning                                                                      |
| -------------------------- | ------ | ---------------------------------------------------------------------------- |
| `votivepatina.decayStep`   | int    | personal erosion level; image loads pre-degraded to this; deepens each visit |
| `votivepatina.prayerCount` | int    | votive counter; how many completed prayers; +1 on reaching 5/5               |
| `votivepatina.prayer`      | string | full prayer text written on completion (residue on the device)               |

No PII, no network, no expiry games. Comment in code: Safari evicts
script-writable storage after ~7 days without a return visit - the patina fades
for lapsed visitors; that suits the theme, do not fight it.

---

## 4. Module interfaces (ES modules, named exports)

### lib/console-prayer.js (single source of truth for ALL prayer strings)

```js
export const PRAYER_LINES;     // string[5], canonical English, Appendix B order
export const CLOSING_COUPLET;  // string[] (5 lines of the couplet)
export const INVITE;           // "the rest of this prayer lives here: <SUBSTACK_URL>"
export function printLine(i);  // console.log canonical line i (0-based); notifies subscribers
export function printFull();   // blank, 5 lines in order, blank, couplet, blank, %c-styled INVITE
export function subscribe(fn); // fn({ text, kind }) called on every emit; kind in {line,prayer,couplet,invite,blank}; returns unsubscribe
```

Uses REAL `console.log` on every platform. `%c` styling on INVITE. Keep the copy
as a legible scripture block. `subscribe` is how the faux-console drawer mirrors
output - one source, never a second copy of the strings.

### lib/decay.js (generational JPEG loss; only the photo layer)

```js
export function qualityForStep(step);   // PURE: 0 -> ~0.92 ... 5 -> ~0.15 (monotonic decreasing, clamped [0.12,0.95])
export function passesForStep(step);    // PURE: re-encode passes; 1 + floor(step/2)
export function createDecayEngine({ canvas, sourceImage, maxStep = 5 });
//   engine.renderStep(step, { animate = true }) -> Promise<void>
//   engine.getStep() / engine.step
//   Always re-derives from the PRISTINE sourceImage by applying `step` successive
//   JPEG re-encodes (authentic "forwarded N times"), so loading at a stored step
//   is deterministic. step>=3 adds downscale->upscale to force chroma blockiness.
//   Uses createImageBitmap / OffscreenCanvas when available; requestIdleCallback
//   for the non-animated path. animate:false (and reduced-motion) => instant swap.
```

`qualityForStep` and `passesForStep` are the unit-tested pure core.

### lib/boxes.js (detection overlay)

```js
export function renderBoxes({ overlayEl, config, imageEl, textRectResolver, onOpen });
//   - draws SVG/abs-positioned buttons from config (data/boxes.json)
//   - arabic-line rect: textRectResolver(id) first (live DOM text), else rectNorm
//   - each box is a real <button.det-box> with accessible name
//   - onOpen({ id, type, contentRef }) fired on click/Enter/Space
//   returns { layout(), destroy(), revealAll({ animate }) }  // layout() recomputes on resize
```

### lib/generative-expansion.js (OPTIONAL, OFF by default)

```js
export const GENERATIVE_ENABLED = false;        // hard off in shipped build
export async function dreamExpansion({ line, signal }); // few-shot Claude API call; only callable when enabled
```

Never imported by the default `main.js` path. Lives for `experimental/generative.html`.

### Feature flags (main.js)

```js
const VOTIVE_FLAGS = { generativeExpansion: false };
```

---

## 5. Motion specs (all gated by prefers-reduced-motion)

- **Hover**: opacity 0.7, `--t-micro` (brand rule).
- **Detection sweep** (on Pray): a neon scan line travels top->bottom ~1100ms;
  boxes pop in staggered 110ms apart; each confidence number ticks 0.00 -> target
  over ~600ms. Then `data-state="praying"`.
- **Panel + "+" reveal**: height+opacity, `--t-micro` ease-out. The "+" expansion
  should feel like uncovering a buried layer (catacomb), not a generic accordion.
- **Decay step**: cross-fade previous frame -> new encoded frame, `--t-decay`.
- **Console drawer lines**: printed sequentially ~170ms/line.
- **Reduced motion**: NO sweep travel, NO confidence tick, NO cross-fade, NO
  line-by-line stagger. Decay still happens (it is content) but the new frame is
  applied instantly. Boxes appear at once. Drawer text appears at once.

---

## 6. Accessibility (CRITICAL)

- Boxes are real `<button>`s with accessible names: arabic-line ->
  `"prayer line N, detected as text, NN percent"`; virgin ->
  `"the Virgin, detected as person, 94 percent"`; mislabel ->
  `"incidental detection: <label>, NN percent"`.
- Visible focus ring on every box (neon outline + offset), never `outline:none`
  without replacement. Tab order follows reading order (lines 1->5).
- Touch targets >= 44x44px: small mislabel boxes get an invisible padded hit area.
- Arabic: `dir="rtl"` + `lang="ar"`, real joining via the naskh face.
- The decay canvas keeps a stable, descriptive `alt`/`aria-label` (from boxes.json).
- Color is never the only signal (stroke style + label, see token note).
- Translation panel: announced (`aria-live="polite"`), keyboard reachable; "+"
  uses `aria-expanded`.
- Faux-console drawer is the accessible witness to the inscription on touch
  devices (no DevTools there).

---

## 7. Hidden inscriptions

- **Permanent relic**: ASCII cross + minimal Marian glyph + one line addressed to
  the machine, as the FIRST HTML comment in index.html. Survives to shipped file.
- **Progressive**: on each box open, append that prayer line as an HTML comment
  node inside `#prayer-card` AND into the `hidden #inscription` element. By 5/5 the
  full prayer + closing couplet exist in the DOM/source.
- Never minify or strip comments.

---

## 8. Test contract

- **Unit (tests/unit, `node --test`)**: import `lib/decay.js` and
  `lib/console-prayer.js` as ESM; assert `qualityForStep` monotonic+bounded,
  `passesForStep` curve, PRAYER_LINES exact (Appendix B), INVITE contains
  `<SUBSTACK_URL>`, `subscribe` receives every emitted line. No DOM/canvas in unit.
- **E2E (tests/e2e, Playwright)**: drive a local static server. Cover every
  acceptance criterion in the PRD via the selectors in section 2. Capture the real
  `console` via `page.on('console')` to prove the prayer is printed. Assert
  localStorage keys persist across `page.reload()`. Run mobile (coarse pointer +
  faux drawer) and desktop projects, plus a reduced-motion project.
- `npm test` runs unit + e2e. `npm run serve` starts the static server. Tests are
  DEV-ONLY; they never alter the shipped source.

---

## 9. Asset placeholders (until Halim provides real assets)

- `assets/mary-interactive.jpg`: a **text-free** devotional Mary, portrait
  (aspect ~0.667, e.g. 800x1200). Composition the boxes.json expects: central
  haloed figure occupying the upper ~70%; lower third clear for 5 live Arabic
  lines; incidental shapes for mislabels - a vase/candle lower-left (~x0.05-0.21,
  y0.40-0.62), a small bright rectangle lower-right for "cell phone"
  (~x0.80-0.94, y0.46-0.66), a vertical drapery fold center for "tie"
  (~x0.44-0.56, y0.34-0.56). Warm reds/creams. Obvious-but-tasteful placeholder.
- `assets/litany/*.jpg`: 6-8 portrait "WhatsApp meme" Marys WITH burned-in Arabic,
  varied, so the column reads like a forwarded thread.
- `assets/fonts/`: bundle Amiri Regular + Bold (woff2, OFL). Graceful system
  fallback if absent.
- TODO list at top of main.js tracks every placeholder + the `<SUBSTACK_URL>`.

---

## 10. Non-negotiables (the thesis, made technical)

1. One gesture does both jobs: the click that inscribes the prayer (console +
   localStorage + source) is the same click that decays the icon. Preserve +
   erode in one motion.
2. The console output IS the prayer - real `console.log`, legible scripture in
   source, mirrored (not duplicated) into the mobile drawer.
3. Everything client-side. No network, no analytics, no third-party scripts, no
   tracking cookies. Buried, not broadcast.
4. The machine sees "person 0.94" and misses everything that matters - which
   lives behind the click, the "+", and the console.
