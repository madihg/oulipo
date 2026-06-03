// ─────────────────────────────────────────────────────────────────────────────
//  votivepatina / main.js
//
//  Orchestration. The console and the canvas are wired to a single gesture: the
//  click that inscribes a prayer line (into the console, into localStorage, into
//  the page source) is the same click that wears the icon down one generation.
//  Attending preserves and erodes in the same motion.
//
//  Readable on purpose. No bundler ever touches this. The comments are part of it.
//
//  ── TODO (placeholders until Halim provides) ───────────────────────────────────
//   [ ] assets/mary-interactive.jpg : real text-free photographic Virgin (no baked text)
//   [ ] assets/litany/*.jpg         : the real WhatsApp-meme litany set
//   [ ] assets/fonts/               : the licensed Arabic display face (Amiri bundled as fallback)
//   [ ] <SUBSTACK_URL>              : the real address for the final console line (see lib/console-prayer.js)
// ─────────────────────────────────────────────────────────────────────────────

import { createDecayEngine } from "./lib/decay.js";
import { renderBoxes } from "./lib/boxes.js";
import {
  PRAYER_LINES,
  printLine,
  printFull,
  prayerAsText,
  subscribe,
} from "./lib/console-prayer.js";

// The generative "machine-dreaming" layer ships OFF and is never imported here.
// It lives in lib/generative-expansion.js and is exercised only in experimental/.
const VOTIVE_FLAGS = { generativeExpansion: false };

const LS = {
  decayStep: "votivepatina.decayStep",
  prayerCount: "votivepatina.prayerCount",
  prayer: "votivepatina.prayer",
};

const MAX_LINES = 5;

// ── environment ────────────────────────────────────────────────────────────────
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

// ── tiny localStorage helpers (defensive: private mode / disabled storage) ───────
function lsGetInt(key, fallback = 0) {
  try {
    const v = parseInt(localStorage.getItem(key) ?? "", 10);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* storage may be unavailable; the prayer still happens, it just doesn't persist */
  }
}

// ── module state ─────────────────────────────────────────────────────────────
const state = {
  content: null,
  boxesConfig: null,
  engine: null,
  boxesApi: null,
  opened: new Set(), // arabic-line ids opened this session
  decayStep: 0, // personal erosion (deepens each visit; persisted)
  prayerCount: 0, // votive counter (persisted)
  completed: false,
};

const els = {}; // cached DOM references

// ── boot ─────────────────────────────────────────────────────────────────────
boot().catch((err) => console.error("votivepatina failed to start:", err));

async function boot() {
  cacheEls();
  document.body.dataset.reducedMotion = reducedMotion ? "1" : "0";
  document.body.dataset.coarsePointer = coarsePointer ? "1" : "0";
  document.body.dataset.state = "idle";

  // Load the hand-authored data. These are same-origin static files - the app's
  // own resources. Nothing about the visitor leaves the device.
  const [content, boxesConfig] = await Promise.all([
    loadJSON("./data/content.json"),
    loadJSON("./data/boxes.json"),
  ]);
  state.content = content;
  state.boxesConfig = boxesConfig;

  // Restore the patina.
  state.decayStep = lsGetInt(LS.decayStep, 0);
  state.prayerCount = lsGetInt(LS.prayerCount, 0);

  setupImageAlt();
  buildArabicLayer();
  await setupDecay(); // renders the image, pre-degraded to the stored step
  setupBoxes();
  setupDrawerMirror();
  setupReturningNote();
  wireControls();

  // Recompute box geometry once fonts settle and on resize.
  if (document.fonts?.ready) document.fonts.ready.then(relayout);
  window.addEventListener("resize", relayout, { passive: true });

  setupLitany();
}

function cacheEls() {
  const ids = [
    "prayer-card",
    "mary-source",
    "mary-canvas",
    "arabic-layer",
    "boxes-overlay",
    "sweep",
    "pray-button",
    "counter-pill",
    "closing-couplet",
    "inscription",
    "translation-panel",
    "litany",
    "console-drawer",
    "console-handle",
    "returning-note",
  ];
  for (const id of ids) els[id] = document.getElementById(id);
}

async function loadJSON(url) {
  const res = await fetch(url); // relative, same-origin; no remote calls anywhere
  if (!res.ok) throw new Error(`could not load ${url}: ${res.status}`);
  return res.json();
}

// ── the image + decay ──────────────────────────────────────────────────────────
function setupImageAlt() {
  if (state.boxesConfig?.imageAlt && els["mary-source"]) {
    els["mary-source"].alt = state.boxesConfig.imageAlt;
    els["mary-canvas"].setAttribute("role", "img");
    els["mary-canvas"].setAttribute("aria-label", state.boxesConfig.imageAlt);
  }
}

async function setupDecay() {
  const img = els["mary-source"];
  // The <img> may already carry the src from the markup (and may already be
  // complete from the cache). Only (re)assign if it differs, then wait for it to
  // be ready in a way that is robust to it ALREADY being loaded - otherwise an
  // onload that fired before we listened would hang boot forever.
  const wanted = state.boxesConfig?.image || "assets/mary-interactive.jpg";
  if (img.getAttribute("src") !== wanted) img.src = wanted;
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }
  // NOTE: we deliberately do NOT call img.decode() here. decode() can hang
  // indefinitely on a display:none image in Chromium (which #mary-source is), and
  // a `complete` image with naturalWidth>0 draws synchronously without it.
  // Size the canvas to the image's aspect; CSS scales it responsively.
  const canvas = els["mary-canvas"];
  canvas.width = img.naturalWidth || 800;
  canvas.height = img.naturalHeight || 1200;

  // Paint the pristine image synchronously so the card is NEVER blank, then let
  // the engine take over. A returning visitor watches the stored patina settle
  // back in over the fresh frame - the icon re-wearing as it loads, which suits
  // the theme - rather than staring at an empty card while N re-encodes run.
  try {
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  } catch {
    /* a tainted/again-decoding source is fine; the engine will draw shortly */
  }

  state.engine = createDecayEngine({
    canvas,
    sourceImage: img,
    maxStep: MAX_LINES,
  });
  // Apply the stored erosion WITHOUT blocking boot - returning visitors may be
  // several generations deep, and the boxes / returning-note must not wait on it.
  state.engine.renderStep(state.decayStep, { animate: false });
}

// ── live Arabic text (RTL, crisp, never decays) ─────────────────────────────────
function buildArabicLayer() {
  const layer = els["arabic-layer"];
  layer.innerHTML = "";
  const lines = state.content?.lines || [];
  for (const line of lines) {
    const band = boxById(line.id);
    const wrap = document.createElement("div");
    wrap.className = "ar-line";
    wrap.dataset.lineId = line.id;
    if (band?.rectNorm) {
      // Place the band where the detection expects it (RTL, right-aligned).
      const r = band.rectNorm;
      wrap.style.left = `${r.x * 100}%`;
      wrap.style.top = `${r.y * 100}%`;
      wrap.style.width = `${r.w * 100}%`;
    }
    const glyphs = document.createElement("span");
    glyphs.className = "ar-glyphs";
    glyphs.lang = "ar";
    glyphs.dir = "rtl";
    glyphs.textContent = line.arabic;
    wrap.appendChild(glyphs);
    layer.appendChild(wrap);
  }
}

function boxById(id) {
  return (state.boxesConfig?.boxes || []).find(
    (b) => b.id === id || b.contentRef === id,
  );
}

// Snug rect (in overlay-local px) around an arabic-line's actual glyphs.
function textRectResolver(contentRef) {
  const layer = els["arabic-layer"];
  const overlay = els["boxes-overlay"];
  if (!layer || !overlay) return null;
  const wrap = layer.querySelector(
    `.ar-line[data-line-id="${cssEscape(contentRef)}"]`,
  );
  const glyphs = wrap?.querySelector(".ar-glyphs");
  if (!glyphs) return null;
  const g = glyphs.getBoundingClientRect();
  const o = overlay.getBoundingClientRect();
  if (g.width === 0 || g.height === 0) return null;
  return {
    x: g.left - o.left,
    y: g.top - o.top,
    width: g.width,
    height: g.height,
  };
}

function cssEscape(s) {
  return String(s).replace(/"/g, '\\"');
}

// ── detection overlay ──────────────────────────────────────────────────────────
function setupBoxes() {
  state.boxesApi = renderBoxes({
    overlayEl: els["boxes-overlay"],
    config: state.boxesConfig,
    imageEl: els["mary-canvas"],
    textRectResolver,
    onOpen: handleBoxOpen,
  });
}

function relayout() {
  state.boxesApi?.layout();
}

// ── the gesture ────────────────────────────────────────────────────────────────
function handleBoxOpen(box) {
  if (box.type === "arabic-line") {
    openPrayerLine(box);
  } else if (box.type === "virgin") {
    showVirginAside();
  } else {
    showMislabel(box);
  }
}

function openPrayerLine(box) {
  const line = lineByRef(box.contentRef);
  if (!line) return;

  // Always (re-)show the panel; only the FIRST open inscribes and erodes.
  showTranslationPanel(line);

  if (state.opened.has(box.id)) return; // re-open: no double count / print / decay
  state.opened.add(box.id);
  state.boxesApi.setOpened(box.id);

  const index = (state.content.lines || []).findIndex((l) => l.id === line.id);

  // One gesture, three inscriptions and one erosion:
  printLine(index); // 1. into the real console (and the drawer mirror)
  inscribe(PRAYER_LINES[index]); // 2. into the page source (comment + hidden node)
  deepenDecay(); // 3. wear the icon down one generation (persists to localStorage)

  updateCounter();

  if (state.opened.size >= MAX_LINES) complete();
}

function deepenDecay() {
  state.decayStep += 1;
  lsSet(LS.decayStep, state.decayStep);
  // Decay is content, not decoration: it still happens under reduced-motion, just
  // without the cross-fade.
  state.engine?.renderStep(state.decayStep, { animate: !reducedMotion });
}

function updateCounter() {
  const pill = els["counter-pill"];
  const n = state.opened.size;
  pill.dataset.count = String(n);
  if (n < MAX_LINES) {
    pill.textContent = `${n} of ${MAX_LINES}`;
  }
}

// ── translation panel + the "+" buried expansion ────────────────────────────────
function showTranslationPanel(line) {
  const panel = els["translation-panel"];
  panel.dataset.kind = "arabic-line";
  panel.innerHTML = "";

  // The flat machine literal - what the machine gives you. Cold, mono.
  const literal = document.createElement("p");
  literal.className = "tp-literal";
  literal.textContent = line.literal;
  panel.appendChild(literal);

  // The "+" - a buried layer, not a generic accordion. The reward for clicking.
  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "tp-expand";
  expandBtn.setAttribute("aria-expanded", "false");
  expandBtn.innerHTML = `<span class="tp-plus" aria-hidden="true">+</span><span class="tp-expand-text">uncover</span>`;

  const expansion = document.createElement("div");
  expansion.className = "tp-expansion";
  expansion.hidden = true;
  const p = document.createElement("p");
  p.textContent = line.expansion;
  expansion.appendChild(p);

  expandBtn.addEventListener("click", () => {
    const open = expandBtn.getAttribute("aria-expanded") === "true";
    expandBtn.setAttribute("aria-expanded", String(!open));
    if (open) {
      expansion.hidden = true;
      panel.dataset.expanded = "false";
    } else {
      expansion.hidden = false;
      panel.dataset.expanded = "true";
    }
  });

  panel.appendChild(expandBtn);
  panel.appendChild(expansion);
  panel.hidden = false;
  panel.dataset.expanded = "false";
}

function showVirginAside() {
  const panel = els["translation-panel"];
  const v = state.content?.virgin;
  panel.dataset.kind = "virgin";
  panel.dataset.expanded = "false";
  panel.innerHTML = "";
  const tag = document.createElement("p");
  tag.className = "tp-literal";
  tag.textContent = `${v?.label ?? "person"} ${(v?.confidence ?? 0.94).toFixed(2)}`;
  const aside = document.createElement("p");
  aside.className = "tp-aside";
  aside.textContent = v?.aside ?? "";
  panel.appendChild(tag);
  panel.appendChild(aside);
  panel.hidden = false;
}

function showMislabel(box) {
  // The secular eye mapping the sacred onto its eighty mundane classes. No poetry.
  const panel = els["translation-panel"];
  panel.dataset.kind = "mislabel";
  panel.dataset.expanded = "false";
  panel.innerHTML = "";
  const raw = document.createElement("p");
  raw.className = "tp-literal";
  raw.textContent = `${box.label} ${Number(box.confidence ?? 0).toFixed(2)}`;
  panel.appendChild(raw);
  panel.hidden = false;
}

function lineByRef(ref) {
  return (state.content?.lines || []).find((l) => l.id === ref);
}

// ── hidden inscription in the source (the prayer accretes as you pray) ───────────
function inscribe(text) {
  if (!text) return;
  // 1. an HTML comment node inside the card - View Source / Inspect shows it accrete
  els["prayer-card"].appendChild(document.createComment(` ${text} `));
  // 2. a hidden, machine-readable copy, line by line
  const insc = els["inscription"];
  if (insc) insc.textContent = `${insc.textContent || ""}${text}\n`;
}

// ── the pray gate + detection sweep ──────────────────────────────────────────────
function wireControls() {
  els["pray-button"].addEventListener("click", beginPraying, { once: true });

  // The counter pill, at 5/5, doubles as the handle that opens the drawer (touch).
  els["counter-pill"].addEventListener("click", () => {
    if (state.completed) toggleDrawer(true);
  });

  els["console-handle"]?.addEventListener("click", () => toggleDrawer());
  document
    .getElementById("console-close")
    ?.addEventListener("click", () => toggleDrawer(false));
}

function beginPraying() {
  document.body.dataset.state = "detecting";
  els["pray-button"].hidden = true;

  const reveal = () => {
    state.boxesApi.layout();
    state.boxesApi.revealAll({ animate: !reducedMotion });
    document.body.dataset.state = "praying";
    const pill = els["counter-pill"];
    pill.hidden = false;
    pill.dataset.count = "0";
    pill.textContent = `0 of ${MAX_LINES}`;
  };

  if (reducedMotion) {
    reveal(); // no sweep travel under reduced motion
  } else {
    // Let the scan line travel (CSS, driven by [data-state=detecting]), then resolve.
    window.setTimeout(reveal, 1100);
  }
}

// ── completion ───────────────────────────────────────────────────────────────────
function complete() {
  state.completed = true;
  document.body.dataset.state = "complete";

  // The clean resolution: full prayer + couplet + the one styled invite.
  printFull();

  // The pill becomes the witness-handle and announces where to look.
  const pill = els["counter-pill"];
  pill.dataset.count = String(MAX_LINES);
  pill.textContent = coarsePointer
    ? `${MAX_LINES} of ${MAX_LINES} — YOUR PRAYER WAS PRINTED — OPEN CONSOLE`
    : `${MAX_LINES} of ${MAX_LINES} — YOUR PRAYER WAS PRINTED — OPEN CONSOLE (PC)`;
  pill.classList.add("is-complete");

  // The closing couplet appears softly on the card, and is inscribed last.
  revealClosingCouplet();

  // The votive counter and the residue on the device.
  state.prayerCount += 1;
  lsSet(LS.prayerCount, state.prayerCount);
  lsSet(LS.prayer, prayerAsText());

  // On touch there is no DevTools; surface the drawer handle and let it be found.
  if (coarsePointer) els["console-handle"]?.removeAttribute("hidden");

  // Settle into the resting state: the icon worn, the boxes fading, the prayer now
  // living in the console, in storage, and in the source.
  const rest = () => {
    document.body.dataset.state = "resting";
  };
  if (reducedMotion) rest();
  else window.setTimeout(rest, 4000);
}

function revealClosingCouplet() {
  const el = els["closing-couplet"];
  if (!el) return;
  const couplet = (state.content && state.content.closingCouplet) || null;
  // The couplet's canonical text lives in lib/console-prayer.js; mirror it here for
  // the soft on-card appearance via the same words the console just printed.
  el.innerHTML = "";
  const lines = COUPLET_FALLBACK;
  for (const l of lines) {
    const span = document.createElement("span");
    span.className = "cc-line";
    span.textContent = l;
    el.appendChild(span);
  }
  el.hidden = false;
  inscribe("— and, softly —");
  for (const l of COUPLET_FALLBACK) inscribe(l);
}

// Kept in sync with CLOSING_COUPLET in lib/console-prayer.js (the scripture file).
const COUPLET_FALLBACK = [
  "Mother I know nothing",
  "of the architecture of your faith",
  "but here are my ribs.",
  "You hold up the scaffolding",
  "while I hang the hammock",
];

// ── the mobile "look beneath" faux-console drawer (a mirror of the console) ──────
function setupDrawerMirror() {
  const drawer = els["console-drawer"];
  if (!drawer) return;
  const body = drawer.querySelector(".console-body") || drawer;

  let printed = 0; // for the line-by-line timing when the drawer is open
  subscribe(({ text, kind, style }) => {
    const line = document.createElement("div");
    line.className = "console-line";
    line.dataset.kind = kind;
    if (kind === "invite" && style) line.classList.add("is-invite");
    line.textContent = text;
    body.appendChild(line);

    // Same timing as the console: lines settle in one after another (unless reduced
    // motion, where they appear at once). Purely a reveal of already-written text.
    if (!reducedMotion) {
      line.style.setProperty("--print-index", String(printed++));
      line.classList.add("will-print");
      requestAnimationFrame(() => line.classList.add("is-printed"));
    }
    // Keep the latest line in view when the drawer is open.
    if (drawer.dataset.open === "true") body.scrollTop = body.scrollHeight;
  });
}

function toggleDrawer(force) {
  const drawer = els["console-drawer"];
  if (!drawer) return;
  const open = force ?? drawer.dataset.open !== "true";
  drawer.dataset.open = open ? "true" : "false";
  // `inert` (not aria-hidden) so the close button inside is not a focusable
  // element trapped in an aria-hidden subtree.
  if (open) drawer.removeAttribute("inert");
  else drawer.setAttribute("inert", "");
  const handle = els["console-handle"];
  if (handle) handle.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    const body = drawer.querySelector(".console-body") || drawer;
    body.scrollTop = body.scrollHeight;
  }
}

// ── a quiet, unlabeled line for those who have prayed here before ────────────────
function setupReturningNote() {
  const note = els["returning-note"];
  if (!note) return;
  if (state.prayerCount > 0) {
    const n = state.prayerCount;
    note.textContent = `you have prayed here ${n} time${n === 1 ? "" : "s"}`;
    note.hidden = false;
  }
}

// ── the longitudinal litany (a WhatsApp thread of Marys, worn by scroll depth) ───
function setupLitany() {
  const litany = els["litany"];
  if (!litany) return;
  const COUNT = 8;
  for (let i = 1; i <= COUNT; i++) {
    const id = String(i).padStart(2, "0");
    const fig = document.createElement("figure");
    fig.className = "litany-item";
    fig.dataset.depth = String(i);
    const img = document.createElement("img");
    img.className = "litany-jpeg";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = `assets/litany/litany-${id}.jpg`;
    img.alt = `A forwarded image of the Virgin, generation ${i} - worn by every hand it passed through.`;
    fig.appendChild(img);
    litany.appendChild(fig);
  }

  // Wear deepens with scroll depth. The wear is content; we don't animate it (so
  // reduced-motion needs no special case here) - we just set a CSS variable.
  const items = Array.from(litany.querySelectorAll(".litany-item"));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const depth = Number(e.target.dataset.depth || "1");
        // 0 (top) -> ~1 (deep): more generations of loss further down the thread.
        const wear = Math.min(1, depth / COUNT);
        e.target.style.setProperty("--wear", wear.toFixed(3));
        e.target.dataset.worn = "true";
      }
    },
    { threshold: 0.15 },
  );
  items.forEach((it) => io.observe(it));
}
