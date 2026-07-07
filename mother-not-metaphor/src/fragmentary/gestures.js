/**
 * fragmentary/gestures.js - hand-shape reading from landmarks (pure, DOM-free).
 *
 * Part of "Fragmentary": a reusable gesture-control layer for hand-driven pieces.
 * MediaPipe Hand Landmarker gives 21 normalized landmarks { x, y, z } (x,y in
 * 0..1, origin top-left). Here we turn one hand into:
 *   - `up`         : which fingers are extended  [thumb,index,middle,ring,pinky]
 *   - `extensions` : a continuous 0..1 openness per finger (drives the HUD bars)
 *   - `signature`  : a discrete comparable string for the pose
 *
 * Landmark indices (MediaPipe):
 *   0 wrist; thumb 1-4 (4 tip); index 5-8 (8 tip, 6 pip); middle 9-12;
 *   ring 13-16; pinky 17-20.
 */

export const FINGER_NAMES = ["thumb", "index", "middle", "ring", "pinky"];

const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIPS = { index: 6, middle: 10, ring: 14, pinky: 18 };
const MCPS = { thumb: 2, index: 5, middle: 9, ring: 13, pinky: 17 };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Boolean array [thumb, index, middle, ring, pinky] of extended fingers.
 * For index..pinky: tip is above (smaller y) its pip joint. For the thumb we use
 * horizontal distance from the index MCP, flipped by handedness.
 */
export function fingersUp(landmarks, handedness = "Right") {
  if (!landmarks || landmarks.length < 21)
    return [false, false, false, false, false];
  const up = [];
  const ref = landmarks[5];
  const thumbTip = landmarks[TIPS.thumb];
  const dx = thumbTip.x - ref.x;
  up.push(handedness === "Right" ? dx < -0.04 : dx > 0.04);
  for (const f of ["index", "middle", "ring", "pinky"]) {
    up.push(landmarks[TIPS[f]].y < landmarks[PIPS[f]].y - 0.02);
  }
  return up;
}

/**
 * Continuous 0..1 openness per finger, for the visual bars. Uses tip-to-knuckle
 * distance normalized by palm size, mapped through empirical curled/extended
 * bounds so a fist reads near 0 and an open hand near 1.
 */
export function fingerExtensions(landmarks) {
  if (!landmarks || landmarks.length < 21) return [0, 0, 0, 0, 0];
  const palm = Math.max(1e-4, dist(landmarks[0], landmarks[9]));
  const map = (raw, lo, hi) => clamp01((raw - lo) / (hi - lo));
  const out = [];
  // thumb: tip(4) spread from the index knuckle(5)
  out.push(map(dist(landmarks[4], landmarks[5]) / palm, 0.28, 0.95));
  for (const f of ["index", "middle", "ring", "pinky"]) {
    out.push(
      map(dist(landmarks[TIPS[f]], landmarks[MCPS[f]]) / palm, 0.35, 1.25),
    );
  }
  return out;
}

/** Coarse pointing direction of the hand (wrist -> middle finger MCP). */
export function orientation(landmarks) {
  if (!landmarks || landmarks.length < 21) return "none";
  const wrist = landmarks[0];
  const mid = landmarks[9];
  const dx = mid.x - wrist.x;
  const dy = mid.y - wrist.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

/** A discrete, comparable signature string for a hand pose. */
export function handSignature(landmarks, handedness = "Right") {
  const up = fingersUp(landmarks, handedness)
    .map((b) => (b ? "1" : "0"))
    .join("");
  return `${up}:${orientation(landmarks)}`;
}

/** One hand reduced to everything the control + HUD need. */
export function handReading(landmarks, handedness = "Right") {
  if (!landmarks || landmarks.length < 21) {
    return {
      present: false,
      up: [false, false, false, false, false],
      extensions: [0, 0, 0, 0, 0],
      orientation: "none",
      signature: "none",
    };
  }
  const up = fingersUp(landmarks, handedness);
  const orient = orientation(landmarks);
  return {
    present: true,
    up,
    extensions: fingerExtensions(landmarks),
    orientation: orient,
    signature: `${up.map((b) => (b ? "1" : "0")).join("")}:${orient}`,
  };
}

/**
 * Given a rolling history of recent signatures (oldest first), return the
 * signature if the last `n` are all identical (a stable pose), else null.
 */
export function stableSignature(history, n = 5) {
  if (!Array.isArray(history) || history.length < n) return null;
  const tail = history.slice(-n);
  const first = tail[0];
  if (first == null) return null;
  return tail.every((s) => s === first) ? first : null;
}

/** True when we have two valid, different stable signatures. */
export function signatureChanged(prev, next) {
  return prev != null && next != null && prev !== next;
}
