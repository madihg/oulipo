// ─────────────────────────────────────────────────────────────────────────────
//  constellation.js
//
//  The icon is a spaceship. A sun. As you pray it shoots rays of light, and at the
//  end of each ray a forwarded prayer hangs - a real Virgin Mary jpeg someone sent
//  someone, at 6 a.m., on WhatsApp. Each square you open extends the rays further
//  and lights the next prayers into being.
//
//  On a wide screen the rays radiate around the icon like a star/sunburst. On a
//  phone they shoot out in ~3 lines that thread downward, the images strung along
//  them, the lines extending with every click. Same idea, fit to the room.
//
//  Each satellite has its own ray (a line from the icon's center to it). On the
//  phone, satellites that share a ray-angle are collinear, so their rays overlap
//  into ~3 growing beams. Tapping a satellite opens it big (the lightbox).
// ─────────────────────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @param {object} opts
 * @param {HTMLElement} opts.stageEl        #constellation (the positioning context)
 * @param {SVGElement}  opts.raysEl         #rays (svg)
 * @param {HTMLElement} opts.satellitesEl   #satellites (holds the thumbnails)
 * @param {HTMLElement} opts.cardEl         #prayer-card (we orbit its center)
 * @param {Array}       opts.units          the litany units (id, image, figure...)
 * @param {(unit, el) => void} opts.onOpen  called when a satellite is activated
 * @param {boolean}     opts.reducedMotion
 * @returns {{ revealBatch: () => void, revealAll: () => void, layout: () => void }}
 */
export function setupConstellation({
  stageEl,
  raysEl,
  satellitesEl,
  cardEl,
  units,
  onOpen,
  reducedMotion = false,
}) {
  const n = units.length;
  const records = []; // { unit, satEl, lineEl, revealed }

  // Distribute n satellites across the five prayer-clicks (front-loaded a little).
  const BATCHES = batchSizes(n, 5);
  let revealedCount = 0;
  let batchIndex = 0;

  // Build a satellite + a ray per unit, both hidden.
  for (let i = 0; i < n; i++) {
    const unit = units[i];

    const satEl = document.createElement("button");
    satEl.type = "button";
    satEl.className = "satellite";
    satEl.dataset.unitId = unit.id;
    satEl.setAttribute(
      "aria-label",
      `a forwarded prayer - ${unit.figure}. open it`,
    );
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = unit.image;
    img.alt = "";
    satEl.appendChild(img);
    // two little colored squares: a hint that it can be read (pink + green)
    const hint = document.createElement("span");
    hint.className = "sat-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.innerHTML = '<i class="pink"></i><i class="green"></i>';
    satEl.appendChild(hint);
    satEl.addEventListener("click", () => onOpen?.(unit, satEl));
    satellitesEl.appendChild(satEl);

    const lineEl = document.createElementNS(SVG_NS, "line");
    raysEl.appendChild(lineEl);

    records.push({ unit, satEl, lineEl, revealed: false });
  }

  // ── geometry ────────────────────────────────────────────────────────────────
  function anchorsFor(geom) {
    const { cx, cy, rx, ry, wide, halfW } = geom;
    const out = [];
    if (wide) {
      // a near-full halo around the icon - a sun. A wedge is left clear at the top
      // (the title + button live there). Sweep 240deg from the upper-right, through
      // the bottom, to the upper-left, at lightly staggered lengths so it bursts.
      const startDeg = 330;
      const sweepDeg = 240;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1); // 0..1
        const ang = ((startDeg + sweepDeg * t) * Math.PI) / 180;
        const stagger = 1 + (i % 3) * 0.06; // a gentle burst, still a tight halo
        out.push({
          x: cx + Math.cos(ang) * rx * stagger,
          y: cy + Math.sin(ang) * ry * stagger,
        });
      }
    } else {
      // phone: three threads of light that shoot DOWNWARD and stay within the stage
      // width. The old version fanned at +/-0.62rad over distances up to ry*2.86, so
      // satellites flew ~+/-480px sideways and overflowed the viewport, which made
      // the mobile browser zoom out and displaced the fixed "?" toggle. Instead we
      // place 3 columns at a bounded horizontal offset and step each thread DOWN with
      // every click. Each satellite (78px, centred on its anchor) stays inside the
      // stage: the offset is capped so anchor.x +/- 39 never leaves [0, stageWidth].
      const colDx = Math.min(120, Math.max(56, halfW - 52));
      const cols = [-colDx, 0, colDx];
      const rowGap = 92;
      for (let i = 0; i < n; i++) {
        const col = cols[i % 3];
        const step = Math.floor(i / 3); // 0,1,2,3 outward (downward) along the thread
        out.push({
          x: cx + col,
          // first row sits just below the card (cy + ry == card bottom + gap); the
          // outer columns drop a touch more so the three threads fan rather than line up
          y: cy + ry + step * rowGap + (col === 0 ? 0 : 26),
        });
      }
    }
    return out;
  }

  function geometry() {
    const stage = stageEl.getBoundingClientRect();
    const card = cardEl.getBoundingClientRect();
    const cx = card.left - stage.left + card.width / 2;
    const cy = card.top - stage.top + card.height / 2;
    const wide = stage.width >= 820; // a DOMRect has .width, not .clientWidth
    // On a wide screen the satellites ring the icon as a halo - a circle whose
    // radius clears the card's CORNERS (half-diagonal) plus a gap, but never wider
    // than the stage. On a narrow screen they thread downward instead.
    const half = Math.hypot(card.width / 2, card.height / 2);
    const ringR = Math.min(half + 46, stage.width / 2 - 50);
    const rx = wide ? ringR : card.width / 2 + 34;
    const ry = wide ? ringR : card.height / 2 + 42;
    return { cx, cy, rx, ry, wide, halfW: stage.width / 2 };
  }

  function layout() {
    // Wait until the card actually has dimensions - an early layout (before the
    // card is sized) would anchor everything on a near-zero center.
    const cardRect = cardEl.getBoundingClientRect();
    if (cardRect.height < 80 || cardRect.width < 80) return;
    const geom = geometry();
    const anchors = anchorsFor(geom);
    let maxBottom = 0;
    let minTop = Infinity;
    for (let i = 0; i < n; i++) {
      const { x, y } = anchors[i];
      const rec = records[i];
      rec.satEl.style.left = `${x}px`;
      rec.satEl.style.top = `${y}px`;

      // the ray: a line from the icon center to the satellite
      const len = Math.hypot(x - geom.cx, y - geom.cy);
      rec.lineEl.setAttribute("x1", geom.cx);
      rec.lineEl.setAttribute("y1", geom.cy);
      rec.lineEl.setAttribute("x2", x);
      rec.lineEl.setAttribute("y2", y);
      rec.lineEl.style.strokeDasharray = `${len}`;
      // unrevealed rays are retracted (offset = full length); revealed are drawn (0)
      rec.lineEl.style.strokeDashoffset = rec.revealed ? "0" : `${len}`;

      maxBottom = Math.max(maxBottom, y + 50);
      minTop = Math.min(minTop, y - 50);
    }
    // grow the stage so the satellites are not clipped and the page scrolls to them
    const cardBottom =
      cardEl.getBoundingClientRect().bottom -
      stageEl.getBoundingClientRect().top;
    stageEl.style.minHeight = `${Math.max(maxBottom, cardBottom) + 16}px`;
    // if any satellite sits above the stage top, pad the top so it is not clipped
    stageEl.style.paddingTop = minTop < 0 ? `${Math.ceil(-minTop)}px` : "";
  }

  function lightRecord(rec) {
    rec.revealed = true;
    rec.satEl.classList.add("is-revealed");
    rec.lineEl.classList.add("is-lit");
    rec.lineEl.style.strokeDashoffset = "0";
  }

  function revealBatch() {
    if (revealedCount >= n) return;
    const size = BATCHES[batchIndex] ?? 1;
    batchIndex += 1;
    const end = Math.min(n, revealedCount + size);
    for (let i = revealedCount; i < end; i++) lightRecord(records[i]);
    revealedCount = end;
  }

  function revealAll() {
    for (const rec of records) lightRecord(rec);
    revealedCount = n;
    batchIndex = BATCHES.length;
  }

  // initial layout, then again after first paint (the card needs a frame to take
  // its aspect-ratio size), then once fonts/images settle, and on resize.
  layout();
  requestAnimationFrame(layout);
  if (document.fonts?.ready) document.fonts.ready.then(layout);
  window.addEventListener("resize", layout, { passive: true });

  return { revealBatch, revealAll, layout };
}

// Spread `n` items across `parts` batches, front-loaded (e.g. 11,5 -> [3,2,2,2,2]).
function batchSizes(n, parts) {
  const base = Math.floor(n / parts);
  let remainder = n - base * parts;
  const sizes = [];
  for (let i = 0; i < parts; i++) {
    sizes.push(base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  }
  return sizes;
}
