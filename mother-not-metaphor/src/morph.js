/**
 * src/morph.js - geometric frame interpolation (pure, DOM-free).
 *
 * An illustration "frame" is an array of cells (rectangles):
 *   { x, y, w, h, fill, o }   // fill is a #rrggbb hex; o is opacity 0..1
 *
 * To morph frame A -> frame B we:
 *   1. pad the shorter frame so both have the same length (extra cells are born
 *      from / die into a point, so counts can change without popping);
 *   2. interpolate each cell pair: geometry linearly, color through OKLab.
 *
 * The renderer feeds an already-eased t (see easeInOutCubic) for natural motion.
 */

import { lerpColor } from "./color.js";

const lerp = (a, b, t) => a + (b - a) * t;

export function easeInOutCubic(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** A zero-size, transparent cell at the center of `target`, in its eventual color. */
export function ghostOf(target) {
  return {
    x: target.x + target.w / 2,
    y: target.y + target.h / 2,
    w: 0,
    h: 0,
    fill: target.fill,
    o: 0,
  };
}

/** Pad [a, b] to equal length using ghosts derived from the longer frame. */
export function padPair(a, b) {
  const a2 = a.map(normalize);
  const b2 = b.map(normalize);
  while (a2.length < b2.length) a2.push(ghostOf(b2[a2.length]));
  while (b2.length < a2.length) b2.push(ghostOf(a2[b2.length]));
  return [a2, b2];
}

function normalize(c) {
  return {
    x: c.x,
    y: c.y,
    w: c.w,
    h: c.h,
    fill: c.fill,
    o: c.o == null ? 1 : c.o,
  };
}

/** Interpolate a single cell pair at eased t. */
export function lerpCell(ca, cb, t) {
  return {
    x: lerp(ca.x, cb.x, t),
    y: lerp(ca.y, cb.y, t),
    w: lerp(ca.w, cb.w, t),
    h: lerp(ca.h, cb.h, t),
    fill: lerpColor(ca.fill, cb.fill, t),
    o: lerp(ca.o == null ? 1 : ca.o, cb.o == null ? 1 : cb.o, t),
  };
}

/** Interpolate two frames at t in [0,1]. Returns a padded array of cells. */
export function interpolateFrame(frameA, frameB, t) {
  const [a, b] = padPair(frameA, frameB);
  return a.map((ca, i) => lerpCell(ca, b[i], t));
}
