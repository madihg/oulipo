/**
 * src/gestures.js - hand-shape signatures from landmarks (pure, DOM-free).
 *
 * MediaPipe Hand Landmarker gives 21 normalized landmarks { x, y, z } (x,y in
 * 0..1, origin top-left). We reduce a hand to a discrete *signature*: which
 * fingers are extended plus a coarse orientation bucket. When the stable
 * signature CHANGES (a new shape held for a few frames), the player advances to
 * the next moment - this is "when my fingers change shape, the layout changes".
 *
 * Landmark indices (MediaPipe):
 *   0 wrist
 *   thumb  1 2 3 4 (4 tip)
 *   index  5 6 7 8 (8 tip, 6 pip)
 *   middle 9 10 11 12
 *   ring   13 14 15 16
 *   pinky  17 18 19 20
 */

const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIPS = { index: 6, middle: 10, ring: 14, pinky: 18 };

/**
 * Boolean array [thumb, index, middle, ring, pinky] of extended fingers.
 * For index..pinky: tip is above (smaller y) its pip joint. For the thumb we use
 * horizontal distance from the index MCP, flipped by handedness.
 */
export function fingersUp(landmarks, handedness = "Right") {
  if (!landmarks || landmarks.length < 21)
    return [false, false, false, false, false];
  const up = [];
  // thumb: extended when its tip is far (in x) from the hand center, sign depends
  // on which hand. Use index-finger MCP (5) as the reference.
  const ref = landmarks[5];
  const thumbTip = landmarks[TIPS.thumb];
  const dx = thumbTip.x - ref.x;
  up.push(handedness === "Right" ? dx < -0.04 : dx > 0.04);
  for (const f of ["index", "middle", "ring", "pinky"]) {
    up.push(landmarks[TIPS[f]].y < landmarks[PIPS[f]].y - 0.02);
  }
  return up;
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
