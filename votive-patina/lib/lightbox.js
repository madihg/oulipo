// ─────────────────────────────────────────────────────────────────────────────
//  lib/lightbox.js  -  votivepatina
//
//  The lightbox opens when a visitor taps a satellite forwarded-prayer image
//  in the constellation. It shows the image enlarged with its pink and green
//  machine-vision detection boxes; clicking the text box reveals the Arabic,
//  the cold literal translation, and the buried "+" note, wears the image one
//  generation further, and prints the prayer to the console.
//
//  Two exports:
//    setupLightbox()          - wire close handlers; idempotent
//    openLightbox(unit, opts) - build and show the enlarged unit
//
//  No network calls, no framework, no em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

import { createDecayEngine } from "./decay.js";
import { renderBoxes } from "./boxes.js";
import { printFound } from "./console-prayer.js";

// ── localStorage key (per-unit decay persistence) ────────────────────────────
// Each litany unit stores its lightbox decay step under this key, separate from
// the main top-card key and from the litany-card inline key. The three keys
// coexist without collision because they carry different prefixes and ids.
//
// Format: "votivepatina.litany.<id>.decayStep"
const lsKey = (id) => `votivepatina.litany.${id}.decayStep`;

// ── maxStep for lightbox decay engines ───────────────────────────────────────
// Matches lib/litany.js MAX_STEP: 6 generations. These images were already
// forwarded before they arrived here, so they start one level deeper than the
// top card (which goes to 5).
const MAX_STEP = 6;

// ── attended tracker (module-level) ──────────────────────────────────────────
// Guards first-attend inscriptions: the decay, print, and comment happen ONCE
// per unit per browser session. On subsequent opens of the same unit the panel
// is rebuilt but no second decay/print/inscribe fires.
const _attended = new Set();

// ── box re-layout observer (module-level) ────────────────────────────────────
// The detection boxes are positioned from overlayEl.clientWidth/Height. When the
// lightbox first opens its flex layout has not resolved, so that width is 0 and a
// single synchronous layout() collapses every box to 0x0 (un-clickable). A
// ResizeObserver re-lays-out the moment the canvas gains (or changes) its rendered
// size - covering both the open transition and responsive window resizes. We keep
// one observer and disconnect it on close / before each new open.
let _boxResizeObserver = null;

function relayoutWhenSized(canvas, boxesHandle) {
  // Belt: re-layout on the next frame (after the browser resolves layout).
  requestAnimationFrame(() => {
    boxesHandle.layout();
    requestAnimationFrame(() => boxesHandle.layout());
  });
  // Suspenders: track every subsequent size change of the canvas.
  if (_boxResizeObserver) {
    _boxResizeObserver.disconnect();
    _boxResizeObserver = null;
  }
  if (typeof ResizeObserver === "function") {
    _boxResizeObserver = new ResizeObserver(() => boxesHandle.layout());
    _boxResizeObserver.observe(canvas);
  }
}

// ── focus-trap helpers ────────────────────────────────────────────────────────
const FOCUSABLE =
  "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])," +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.closest("[hidden]") && !el.closest("[inert]"),
  );
}

// ── defensive localStorage helpers ───────────────────────────────────────────
// Private browsing or storage disabled must not crash the prayer.
function lsGetInt(key, fallback) {
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
    /* storage may be unavailable; the prayer still happens, it just does not persist */
  }
}

// ── minimal HTML escape for innerHTML use ────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────────────────────────────────────
//  setupLightbox()
//
//  Wire the close handlers for the lightbox. Safe to call multiple times:
//  it uses a flag so the listeners are only attached once.
//
//  Close triggers:
//    - click on #lightbox-close
//    - click on any [data-lightbox-dismiss] element (the scrim)
//    - Escape keydown (only when the lightbox is open)
//
//  On close:
//    - #lightbox gets `hidden` restored
//    - `lightbox-open` class is removed from <body>
//    - focus returns to the opener element that was stored at open time
// ─────────────────────────────────────────────────────────────────────────────

let _setupDone = false;
let _openerEl = null; // stored at open time, restored on close

export function setupLightbox() {
  if (_setupDone) return;
  _setupDone = true;

  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  // Close button inside the stage
  document.getElementById("lightbox-close")?.addEventListener("click", _close);

  // Scrim (and any other data-lightbox-dismiss)
  lightbox.addEventListener("click", (e) => {
    if (e.target.closest("[data-lightbox-dismiss]")) _close();
  });

  // Escape key - only when the lightbox is actually open
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hasAttribute("hidden")) _close();
  });

  // Focus trap: keep Tab/Shift+Tab inside .lightbox-stage
  const stage = document.getElementById("lightbox-stage");
  if (stage) {
    lightbox.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable(stage);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }
}

// Internal close - shared by all close triggers
function _close() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  lightbox.setAttribute("hidden", "");
  document.body.classList.remove("lightbox-open");
  // Stop tracking the (now hidden) canvas size.
  if (_boxResizeObserver) {
    _boxResizeObserver.disconnect();
    _boxResizeObserver = null;
  }
  // Return focus to the element that triggered the open
  if (_openerEl && typeof _openerEl.focus === "function") {
    try {
      _openerEl.focus();
    } catch {
      /* ignore */
    }
  }
  _openerEl = null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  openLightbox(unit, { reducedMotion, openerEl })
//
//  Build and display the enlarged unit inside #lightbox-body.
//
//  unit - a litany content.json object:
//    { id, image, figure, arabic, literal, note, textRect, personRect }
//    arabic: lines joined by " / " in the data
//
//  opts:
//    reducedMotion (bool) - pass animate:false through to decay + revealAll
//    openerEl (Element)   - the satellite button that triggered the open;
//                           receives focus back on close
//
//  Structure built inside #lightbox-body:
//    .lightbox-frame (position:relative)
//      canvas.lightbox-canvas
//      div.lightbox-boxes
//    aside.lightbox-panel
//
//  Decay step is persisted to localStorage under
//    "votivepatina.litany.<id>.decayStep"
//  and restored on every open so the patina accumulates correctly across visits.
// ─────────────────────────────────────────────────────────────────────────────

export function openLightbox(
  unit,
  { reducedMotion = false, openerEl = null } = {},
) {
  const lightbox = document.getElementById("lightbox");
  const body = document.getElementById("lightbox-body");
  const closeBtn = document.getElementById("lightbox-close");
  if (!lightbox || !body) return;

  // Store opener for focus-return on close
  _openerEl = openerEl ?? null;

  // ── 1. Empty the body and inject the frame structure ─────────────────────

  body.innerHTML = "";

  // The frame holds the canvas (decaying image) and the boxes overlay in a
  // position:relative container so the absolutely-positioned box buttons
  // align correctly to the canvas.
  const frame = document.createElement("div");
  frame.className = "lightbox-frame";
  frame.style.position = "relative"; // boxes-overlay will use position:absolute

  const canvas = document.createElement("canvas");
  canvas.className = "lightbox-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", unit.figure || "a forwarded prayer image");

  const boxesEl = document.createElement("div");
  boxesEl.className = "lightbox-boxes";

  frame.appendChild(canvas);
  frame.appendChild(boxesEl);

  // The aside panel sits below the frame (not inside it) so it is outside
  // the position:relative stacking context of the image.
  const panel = document.createElement("aside");
  panel.className = "lightbox-panel";
  panel.setAttribute("aria-live", "polite");

  body.appendChild(frame);
  body.appendChild(panel);

  // ── 2. Load the image (robust no-decode pattern from main.js setupDecay) ──
  //
  // We create a detached <img> as the decay source (never appended to the DOM
  // or set display:none - we let it sit detached so Chromium's decode() hang
  // is avoided). Set src, then await load if not already complete. Explicitly
  // do NOT call img.decode(): a complete image with naturalWidth > 0 draws to
  // canvas synchronously without needing decode().

  const img = new Image();
  img.alt = unit.figure || "";

  // Kick off the async setup. We do not await at the call site; the lightbox
  // opens immediately and the canvas fills as soon as the image loads.
  _initLightboxUnit({
    img,
    canvas,
    boxesEl,
    panel,
    unit,
    reducedMotion,
  });

  // ── 3. Show the lightbox ──────────────────────────────────────────────────

  lightbox.removeAttribute("hidden");
  document.body.classList.add("lightbox-open");
  closeBtn?.focus();
}

// ── async initialisation: image load + decay restore + boxes + interaction ───

async function _initLightboxUnit({
  img,
  canvas,
  boxesEl,
  panel,
  unit,
  reducedMotion,
}) {
  // Set src and wait for the image to be ready (robust: handles already-cached
  // and not-yet-loaded images without decode()).
  img.src = unit.image;
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true }); // continue even on error
    });
  }

  // Size the canvas to the natural image dimensions. CSS scales it responsively.
  canvas.width = img.naturalWidth || 800;
  canvas.height = img.naturalHeight || 1200;

  // Synchronously paint the pristine image first so the canvas is never blank
  // while the re-encode runs in the background.
  try {
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  } catch {
    /* tainted or re-decoding source is fine; the engine will draw shortly */
  }

  // ── Decay engine: restore the stored step ────────────────────────────────
  //
  // We read the persisted step from localStorage. If no step has been stored
  // yet (first visit), we default to 0 (pristine). The engine always re-derives
  // from the original, so the result is deterministic across devices.
  const engine = createDecayEngine({
    canvas,
    sourceImage: img,
    maxStep: MAX_STEP,
  });
  let step = lsGetInt(lsKey(unit.id), 0);

  // Render the stored degradation without animation (restoring, not praying).
  engine.renderStep(step, { animate: false });

  // ── Detection boxes ───────────────────────────────────────────────────────
  //
  // Two boxes per unit:
  //   text box  - green (#39FF14) with label "text"   - type "litany-text"
  //   person box - pink (#FF3DA6) with label "person" - type "virgin"
  //
  // Rects are normalized (0..1) from unit.textRect / unit.personRect.
  // The virgin box uses a fixed confidence of 0.93 (mirroring litany.js).
  // The text box confidence of 0.9 is explicit per the spec.

  const boxConfig = {
    boxes: [
      {
        id: "text",
        type: "litany-text",
        label: "text",
        confidence: 0.9,
        color: "#39FF14", // yolo-green - the detection green from styles.css
        rectNorm: unit.textRect,
        contentRef: unit.id,
      },
      {
        id: "person",
        type: "virgin",
        label: "person",
        confidence: 0.93,
        color: "#FF3DA6", // pink - the person / virgin color
        rectNorm: unit.personRect,
        contentRef: unit.id,
      },
    ],
  };

  // onOpen is called by renderBoxes when a box button is clicked.
  function onOpen(box) {
    if (box.type === "litany-text") {
      _attendUnit({
        panel,
        unit,
        engine,
        reducedMotion,
        getStep: () => step,
        setStep: (s) => {
          step = s;
        },
      });
    } else if (box.type === "virgin") {
      _showVirginAside({ panel });
    }
  }

  const boxesHandle = renderBoxes({
    overlayEl: boxesEl,
    config: boxConfig,
    imageEl: canvas,
    onOpen,
  });

  // Position boxes relative to the canvas dimensions.
  boxesHandle.layout();

  // Reveal all boxes immediately - in the lightbox they appear at open time,
  // not on scroll (unlike the litany cards which use IntersectionObserver).
  boxesHandle.revealAll({ animate: !reducedMotion });

  // Re-layout once the canvas actually has its displayed size (the first
  // layout() above runs while the flex container is still 0-wide).
  relayoutWhenSized(canvas, boxesHandle);
}

// ── attend a unit (first-click inscription) ───────────────────────────────────
//
// On the first time a visitor clicks the text box for a given unit:
//   1. Build the panel (Arabic RTL + literal + "+" expansion)
//   2. Increment and persist the decay step, fire engine.renderStep
//   3. printFound(unit) - to the real console and the subscriber chain
//   4. Inscribe: HTML comment + #inscription textContent
//
// On any subsequent open: rebuild/show the panel only (no second decay/print).

function _attendUnit({ panel, unit, engine, reducedMotion, getStep, setStep }) {
  // Always (re-)build the panel so it is fresh and visible.
  _buildPanel({ panel, unit });

  // Guard: first attend per session only for the irreversible actions.
  if (_attended.has(unit.id)) return;
  _attended.add(unit.id);

  // ── Decay one step ────────────────────────────────────────────────────────
  // The gesture that attends (inscribes) also erodes. One click, two effects.
  const newStep = getStep() + 1;
  setStep(newStep);
  lsSet(lsKey(unit.id), newStep);
  engine.renderStep(newStep, { animate: !reducedMotion });

  // ── Print to the real console (and the mobile drawer via subscribe) ───────
  printFound(unit);

  // ── Inscribe into the page source ─────────────────────────────────────────
  //
  // Two inscriptions:
  //   a) An HTML comment appended to #inscription's parent element (body).
  //      View Source / Inspect shows the prayer accreting as you attend.
  //   b) The flat literal appended to #inscription textContent for
  //      machine-readable accumulation.
  //
  // We append to document.body (the highest sensible container) so the
  // comment appears reliably in View Source regardless of whether a wrapper
  // element exists.
  const inscription = document.getElementById("inscription");
  const commentTarget =
    (inscription && inscription.parentElement) || document.body;
  commentTarget.appendChild(
    document.createComment(` found prayer: ${unit.literal} `),
  );
  if (inscription) {
    inscription.textContent = `${inscription.textContent || ""}${unit.literal}\n`;
  }
}

// ── panel builder (mirrors lib/litany.js buildPanel) ─────────────────────────
//
// Structure:
//   <p class="lp-arabic" lang="ar" dir="rtl"> - Arabic, " / " -> <br>
//   <p class="tp-literal">                    - cold machine literal
//   <button class="tp-expand" aria-expanded="false"> - "+ uncover"
//   <div class="tp-expansion" hidden>
//     <p> - unit.note (the poet's voice)

function _buildPanel({ panel, unit }) {
  panel.innerHTML = "";

  // Arabic (RTL). " / " in content.json is a line-break indicator.
  // We split on it, escape each segment, and rejoin with <br>.
  const arabic = document.createElement("p");
  arabic.className = "lp-arabic";
  arabic.lang = "ar";
  arabic.dir = "rtl";
  arabic.innerHTML = unit.arabic.split(" / ").map(escapeHtml).join("<br>");
  panel.appendChild(arabic);

  // Cold machine literal - flat, mono, the model's output.
  const literal = document.createElement("p");
  literal.className = "tp-literal";
  literal.textContent = unit.literal;
  panel.appendChild(literal);

  // Buried expansion: the poet's answer. Identical pattern to main.js and
  // litany.js so the CSS handles it consistently throughout the piece.
  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "tp-expand";
  expandBtn.setAttribute("aria-expanded", "false");
  expandBtn.innerHTML =
    '<span class="tp-plus" aria-hidden="true">+</span>' +
    '<span class="tp-expand-text">uncover</span>';

  const expansion = document.createElement("div");
  expansion.className = "tp-expansion";
  expansion.hidden = true;
  const noteP = document.createElement("p");
  noteP.textContent = unit.note;
  expansion.appendChild(noteP);

  expandBtn.addEventListener("click", () => {
    const open = expandBtn.getAttribute("aria-expanded") === "true";
    expandBtn.setAttribute("aria-expanded", String(!open));
    expansion.hidden = open;
    panel.dataset.expanded = open ? "false" : "true";
  });

  panel.appendChild(expandBtn);
  panel.appendChild(expansion);

  panel.hidden = false;
  panel.dataset.expanded = "false";
}

// ── virgin aside (clicking the person box) ────────────────────────────────────
//
// The machine sees a person at 0.93 confidence. It does not see the mother, the
// centuries, the forwarded chain. We surface that fact without decaying or
// attending - the virgin box is never the "attend" gesture.

function _showVirginAside({ panel }) {
  panel.innerHTML = "";
  const tag = document.createElement("p");
  tag.className = "tp-literal";
  tag.textContent =
    "person 0.93 - the model sees a person; it reads the prayer as a rectangle of text and moves on.";
  panel.appendChild(tag);
  panel.hidden = false;
  panel.dataset.expanded = "false";
}
