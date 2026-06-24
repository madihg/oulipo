/**
 * src/illustration.js - the morphing SVG illustration (DOM).
 *
 * Renders a pool of <rect>s inside a 0..100 viewBox and tweens between frames
 * using the pure morph engine. A single rAF drives the active tween; starting a
 * new tween cancels the previous one. Honors prefers-reduced-motion by snapping.
 */

import { interpolateFrame, easeInOutCubic } from "./morph.js";

const SVGNS = "http://www.w3.org/2000/svg";

export function createIllustration(svgEl, palette, { reduced = false } = {}) {
  const rects = [];
  let current = []; // last rendered cells (hex fills)
  let raf = 0;

  const resolve = (key) => palette[key] || key;
  const resolveFrame = (kf) =>
    kf.map((c) => ({
      x: c.x,
      y: c.y,
      w: c.w,
      h: c.h,
      fill: resolve(c.fill),
      o: c.o == null ? 1 : c.o,
    }));

  function ensureRects(n) {
    while (rects.length < n) {
      const r = document.createElementNS(SVGNS, "rect");
      r.setAttribute("shape-rendering", "crispEdges");
      svgEl.appendChild(r);
      rects.push(r);
    }
  }

  function paint(cells) {
    ensureRects(cells.length);
    for (let i = 0; i < rects.length; i++) {
      const c = cells[i];
      if (!c || c.o <= 0 || c.w <= 0 || c.h <= 0) {
        rects[i].setAttribute("opacity", "0");
        continue;
      }
      rects[i].setAttribute("x", c.x.toFixed(2));
      rects[i].setAttribute("y", c.y.toFixed(2));
      rects[i].setAttribute("width", c.w.toFixed(2));
      rects[i].setAttribute("height", c.h.toFixed(2));
      rects[i].setAttribute("fill", c.fill);
      rects[i].setAttribute("opacity", c.o.toFixed(3));
    }
    current = cells;
  }

  function snap(frame) {
    cancelAnimationFrame(raf);
    paint(resolveFrame(frame));
  }

  /** Tween from the currently shown cells to `frame` over `ms`. Resolves on done. */
  function morphTo(frame, ms) {
    const to = resolveFrame(frame);
    const from = current.length ? current : to;
    cancelAnimationFrame(raf);
    if (reduced || ms <= 0) {
      paint(to);
      return Promise.resolve();
    }
    return new Promise((done) => {
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        paint(interpolateFrame(from, to, easeInOutCubic(t)));
        if (t < 1) raf = requestAnimationFrame(tick);
        else done();
      };
      raf = requestAnimationFrame(tick);
    });
  }

  function destroy() {
    cancelAnimationFrame(raf);
  }

  return {
    snap,
    morphTo,
    destroy,
    get current() {
      return current;
    },
  };
}
