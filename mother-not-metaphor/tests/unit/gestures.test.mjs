import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fingersUp,
  orientation,
  handSignature,
  stableSignature,
  signatureChanged,
} from "../../src/gestures.js";

// Build a 21-point landmark array, then override the indices the engine reads.
function hand(overrides) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  for (const [i, p] of Object.entries(overrides)) lm[i] = { z: 0, ...p };
  return lm;
}

// Open right hand pointing up: tips well above pips, thumb out to the left.
const OPEN = hand({
  0: { x: 0.5, y: 0.9 }, // wrist
  4: { x: 0.3, y: 0.55 }, // thumb tip (left of index mcp)
  5: { x: 0.45, y: 0.6 }, // index mcp (ref)
  6: { x: 0.45, y: 0.45 }, // index pip
  8: { x: 0.45, y: 0.2 }, // index tip
  9: { x: 0.5, y: 0.55 }, // middle mcp
  10: { x: 0.5, y: 0.45 },
  12: { x: 0.5, y: 0.15 },
  14: { x: 0.55, y: 0.45 },
  16: { x: 0.55, y: 0.2 },
  18: { x: 0.6, y: 0.45 },
  20: { x: 0.6, y: 0.25 },
});

// Fist: tips below pips, thumb tucked across.
const FIST = hand({
  0: { x: 0.5, y: 0.9 },
  4: { x: 0.44, y: 0.55 },
  5: { x: 0.45, y: 0.6 },
  6: { x: 0.45, y: 0.45 },
  8: { x: 0.45, y: 0.55 },
  9: { x: 0.5, y: 0.55 },
  10: { x: 0.5, y: 0.45 },
  12: { x: 0.5, y: 0.55 },
  14: { x: 0.55, y: 0.45 },
  16: { x: 0.55, y: 0.55 },
  18: { x: 0.6, y: 0.45 },
  20: { x: 0.6, y: 0.55 },
});

test("fingersUp: open hand is all extended", () => {
  assert.deepEqual(fingersUp(OPEN, "Right"), [true, true, true, true, true]);
});

test("fingersUp: fist is none extended", () => {
  assert.deepEqual(fingersUp(FIST, "Right"), [
    false,
    false,
    false,
    false,
    false,
  ]);
});

test("fingersUp: bad input is safe", () => {
  assert.deepEqual(fingersUp(null), [false, false, false, false, false]);
  assert.deepEqual(fingersUp([{ x: 0, y: 0 }]), [
    false,
    false,
    false,
    false,
    false,
  ]);
});

test("orientation reads pointing direction", () => {
  assert.equal(orientation(OPEN), "up");
});

test("handSignature differs across poses, stable within a pose", () => {
  const sOpen = handSignature(OPEN, "Right");
  const sFist = handSignature(FIST, "Right");
  assert.notEqual(sOpen, sFist);
  assert.equal(handSignature(OPEN, "Right"), sOpen);
  assert.match(sOpen, /^11111:/);
  assert.match(sFist, /^00000:/);
});

test("stableSignature requires n identical recent frames", () => {
  assert.equal(stableSignature(["a", "a", "b"], 3), null);
  assert.equal(stableSignature(["x", "a", "a", "a"], 3), "a");
  assert.equal(stableSignature(["a", "a"], 3), null); // too short
});

test("signatureChanged needs two distinct non-null signatures", () => {
  assert.equal(signatureChanged("a", "b"), true);
  assert.equal(signatureChanged("a", "a"), false);
  assert.equal(signatureChanged(null, "b"), false);
});
