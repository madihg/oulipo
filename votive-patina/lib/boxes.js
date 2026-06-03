// ─────────────────────────────────────────────────────────────────────────────
//  boxes.js  -  the machine-vision conceit, made literal.
//
//  A secular object-detection model is pointed at a sacred image. It draws thin
//  neon rectangles with confidence scores - the YOLO/COCO eye - and brackets
//  devotion as detected objects. It frames the Virgin and calls her "person 0.94".
//  It maps the sacred onto its eighty mundane classes and calls a candle a "vase".
//  The boxes are licensed by a line in the poem: "Virgin Mary sacred robot Pokemon
//  Go / your womb an empty ball to catch them all." Detection as devotional capture.
//
//  The boxes are HAND-AUTHORED (data/boxes.json), not detected at runtime. They
//  render as real <button>s ABOVE the decaying photo, so they stay crisp while the
//  image rots. arabic-line boxes wrap the LIVE Arabic text nodes; we compute their
//  rectangles from the rendered text where we can, and fall back to the JSON coords.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render the detection overlay.
 *
 * @param {object}   opts
 * @param {HTMLElement} opts.overlayEl        absolutely-positioned layer covering the image box
 * @param {object}      opts.config           parsed data/boxes.json
 * @param {HTMLElement} [opts.imageEl]        the image/canvas the overlay covers (for size)
 * @param {(contentRef: string) => (DOMRectLike|null)} [opts.textRectResolver]
 *        returns a rect in OVERLAY-LOCAL pixels for an arabic-line's live text, or null
 * @param {(box: {id,type,contentRef,label,confidence}) => void} opts.onOpen
 * @returns {{ layout: () => void, revealAll: (o?:{animate?:boolean}) => void,
 *            setOpened:(id:string)=>void, destroy: () => void, boxes: object[] }}
 */
export function renderBoxes({
  overlayEl,
  config,
  imageEl,
  textRectResolver,
  onOpen,
}) {
  const boxes = Array.isArray(config?.boxes) ? config.boxes : [];
  const els = new Map(); // id -> { button, labelEl, box }

  overlayEl.classList.add("boxes-overlay");
  overlayEl.setAttribute("role", "group");
  overlayEl.setAttribute(
    "aria-label",
    "machine-vision detections over the image",
  );

  // Build a button per detection.
  for (const box of boxes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "det-box";
    button.dataset.boxId = box.id;
    button.dataset.boxType = box.type;
    button.style.setProperty("--box-color", box.color || "#39FF14");
    button.setAttribute("aria-label", accessibleName(box));

    // The label tab: filled corner chip, "label 0.93" - the detection's own words.
    const labelEl = document.createElement("span");
    labelEl.className = "det-label";
    labelEl.setAttribute("aria-hidden", "true");
    labelEl.dataset.conf = String(box.confidence ?? 0);
    labelEl.textContent = formatLabel(box.label, box.confidence);
    button.appendChild(labelEl);

    button.addEventListener("click", () => {
      button.dataset.opened = "true";
      onOpen?.({
        id: box.id,
        type: box.type,
        contentRef: box.contentRef,
        label: box.label,
        confidence: box.confidence,
      });
    });

    overlayEl.appendChild(button);
    els.set(box.id, { button, labelEl, box });
  }

  function rectFor(box) {
    // arabic-line: prefer the live rendered text rect; fall back to JSON coords.
    if (box.type === "arabic-line" && typeof textRectResolver === "function") {
      const r = textRectResolver(box.contentRef);
      if (r && r.width > 0 && r.height > 0) {
        const pad = 8; // breathe a little around the glyphs
        return {
          x: r.x - pad,
          y: r.y - pad,
          w: r.width + pad * 2,
          h: r.height + pad * 2,
        };
      }
    }
    const W = overlayEl.clientWidth;
    const H = overlayEl.clientHeight;
    const n = box.rectNorm || { x: 0, y: 0, w: 0.1, h: 0.1 };
    return { x: n.x * W, y: n.y * H, w: n.w * W, h: n.h * H };
  }

  function layout() {
    for (const { button, box } of els.values()) {
      const r = rectFor(box);
      button.style.left = `${r.x}px`;
      button.style.top = `${r.y}px`;
      button.style.width = `${Math.max(0, r.w)}px`;
      button.style.height = `${Math.max(0, r.h)}px`;
    }
  }

  function setOpened(id) {
    const rec = els.get(id);
    if (rec) rec.button.dataset.opened = "true";
  }

  function revealAll({ animate = true } = {}) {
    overlayEl.dataset.revealed = "true";
    let i = 0;
    for (const { button, labelEl, box } of els.values()) {
      button.style.setProperty("--reveal-index", String(i));
      button.classList.add("is-revealed");
      if (animate) {
        tickConfidence(labelEl, box.label, Number(box.confidence ?? 0), 600);
      } else {
        labelEl.textContent = formatLabel(box.label, box.confidence);
      }
      i += 1;
    }
  }

  function destroy() {
    for (const { button } of els.values()) button.remove();
    els.clear();
  }

  layout();
  return { layout, revealAll, setOpened, destroy, boxes };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatLabel(label, confidence) {
  const c = Number(confidence ?? 0);
  return `${label} ${c.toFixed(2)}`;
}

// Confidence numbers tick up from 0.00 to their target, like a model resolving.
function tickConfidence(labelEl, label, target, durationMs) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / durationMs);
    // ease-out so it decelerates onto the final certainty
    const eased = 1 - Math.pow(1 - t, 3);
    const value = target * eased;
    labelEl.textContent = `${label} ${value.toFixed(2)}`;
    if (t < 1) requestAnimationFrame(frame);
    else labelEl.textContent = `${label} ${target.toFixed(2)}`;
  }
  requestAnimationFrame(frame);
}

// The accessible name carries what the picture cannot: which line, what the model
// thinks it is, and how sure it claims to be. Color is never the only signal.
function accessibleName(box) {
  const pct = Math.round(Number(box.confidence ?? 0) * 100);
  if (box.type === "arabic-line") {
    const n = box.contentRef;
    return `prayer line ${n}, detected as ${box.label}, ${pct} percent confidence`;
  }
  if (box.type === "virgin") {
    return `the Virgin, detected as ${box.label}, ${pct} percent confidence`;
  }
  return `incidental detection: ${box.label}, ${pct} percent confidence`;
}
