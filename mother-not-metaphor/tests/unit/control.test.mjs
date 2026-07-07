import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchBinding,
  bindingSpecificity,
  pickBinding,
  patternKey,
  createGestureControl,
} from "../../src/fragmentary/control.js";

const OPEN = [true, true, true, true, true];
const PEACE = [false, true, true, false, false];
const FIST = [false, false, false, false, false];
const POINT = [false, true, false, false, false];

// Bound poses used by the state-machine tests (open -> next, peace -> prev).
// FIST / POINT match neither, so they are NEUTRAL (they provide the reset).
const NEXT = {
  id: "next",
  action: { type: "next" },
  fingers: { thumb: "up", index: "up", middle: "up", ring: "up", pinky: "up" },
};
const PREV = {
  id: "back",
  action: { type: "prev" },
  fingers: {
    thumb: "down",
    index: "up",
    middle: "up",
    ring: "down",
    pinky: "down",
  },
};
const BINDINGS = [NEXT, PREV];

// pure-matching fixtures
const ANY = { id: "any", action: { type: "next" }, fingers: {} };
const FISTB = {
  id: "fistb",
  action: { type: "prev" },
  fingers: {
    thumb: "down",
    index: "down",
    middle: "down",
    ring: "down",
    pinky: "down",
  },
};

test("patternKey encodes finger bits", () => {
  assert.equal(patternKey(OPEN), "11111");
  assert.equal(patternKey(POINT), "01000");
});

test("matchBinding / specificity / pickBinding", () => {
  assert.equal(matchBinding(OPEN, ANY), true);
  assert.equal(matchBinding(FIST, FISTB), true);
  assert.equal(matchBinding(OPEN, FISTB), false);
  assert.equal(bindingSpecificity(ANY), 0);
  assert.equal(bindingSpecificity(FISTB), 5);
  assert.equal(pickBinding(FIST, [ANY, FISTB]).id, "fistb"); // most specific wins
  assert.equal(pickBinding(OPEN, [ANY, FISTB]).id, "any");
});

// Feed `up` for enough stable frames, then keep holding until `untilMs`.
// Returns the firing frame if any (firing is a single-frame event), else last.
function hold(ctrl, up, startMs, untilMs, stableFrames = 4, step = 16) {
  let last;
  let fired = null;
  const feed = (t) => {
    last = ctrl.update(up, t);
    if (last.firing) fired = last;
  };
  for (let i = 0; i < stableFrames; i++) feed(startMs);
  for (let t = startMs; t <= untilMs; t += step) feed(t);
  return fired || last;
}

// Feed a neutral (unbound) pose or absence to satisfy the reset requirement.
function resetVia(ctrl, up, atMs, frames = 5) {
  let last;
  for (let i = 0; i < frames; i++) last = ctrl.update(up, atMs);
  return last;
}

test("a hand held in one bound pose from the start never fires (arm-only)", () => {
  const ctrl = createGestureControl({
    dwellMs: 1000,
    stableFrames: 4,
    bindings: BINDINGS,
  });
  const r = hold(ctrl, OPEN, 0, 5000); // open the whole time, never reset
  assert.equal(r.firing, false, "no reset ever occurred, so it must not fire");
  assert.equal(r.armed, true);
});

test("a hand resting in a NEUTRAL pose never fires", () => {
  const ctrl = createGestureControl({
    dwellMs: 800,
    stableFrames: 4,
    bindings: BINDINGS,
  });
  const r = hold(ctrl, FIST, 0, 5000); // fist is unbound here -> neutral
  assert.equal(r.firing, false);
});

test("a bound pose fires only after a reset AND a full dwell", () => {
  const ctrl = createGestureControl({
    dwellMs: 1000,
    stableFrames: 4,
    bindings: BINDINGS,
  });
  hold(ctrl, OPEN, 0, 100); // arm on open (no reset yet)
  // holding open with no reset must not fire
  assert.equal(
    hold(ctrl, OPEN, 120, 1400).firing,
    false,
    "no reset -> no fire",
  );
  // relax to a neutral pose -> reset
  resetVia(ctrl, FIST, 1500);
  // now hold open: not before the dwell...
  ctrl.update(OPEN, 1600);
  ctrl.update(OPEN, 1616);
  ctrl.update(OPEN, 1632);
  let r = ctrl.update(OPEN, 1648); // stable, candSince ~1648
  assert.ok(r.progress < 0.2 && !r.firing, `just started ${r.progress}`);
  r = ctrl.update(OPEN, 1648 + 500);
  assert.ok(
    r.progress > 0.3 && r.progress < 0.7 && !r.firing,
    `mid ${r.progress}`,
  );
  r = ctrl.update(OPEN, 1648 + 1000);
  assert.equal(r.firing, true, "fires after the full dwell");
  assert.deepEqual(r.action, { type: "next" });
});

test("a neutral pose (not a full drop) provides the reset between fires", () => {
  const ctrl = createGestureControl({
    dwellMs: 500,
    stableFrames: 4,
    bindings: BINDINGS,
  });
  resetVia(ctrl, FIST, 0); // reset (also arms)
  assert.equal(hold(ctrl, OPEN, 50, 800).firing, true, "first open fires");
  resetVia(ctrl, FIST, 900); // neutral reset, hand stays in frame
  assert.equal(
    hold(ctrl, OPEN, 1000, 1800).firing,
    true,
    "second open fires after a neutral",
  );
});

test("dropping the hand (absence) also resets", () => {
  const ctrl = createGestureControl({
    dwellMs: 500,
    stableFrames: 4,
    bindings: BINDINGS,
  });
  resetVia(ctrl, FIST, 0);
  assert.equal(hold(ctrl, OPEN, 50, 800).firing, true);
  resetVia(ctrl, null, 900); // hand gone
  assert.equal(
    hold(ctrl, OPEN, 1000, 1800).firing,
    true,
    "same pose fires again after a drop",
  );
});

test("peace fires prev, open fires next (per-binding action)", () => {
  const ctrl = createGestureControl({
    dwellMs: 400,
    stableFrames: 4,
    bindings: BINDINGS,
  });
  resetVia(ctrl, FIST, 0);
  assert.deepEqual(hold(ctrl, OPEN, 50, 700).action, { type: "next" });
  resetVia(ctrl, FIST, 800);
  assert.deepEqual(hold(ctrl, PEACE, 900, 1600).action, { type: "prev" });
});

test("holding the just-fired pose does not re-fire until reset", () => {
  const ctrl = createGestureControl({
    dwellMs: 400,
    stableFrames: 4,
    bindings: BINDINGS,
  });
  resetVia(ctrl, FIST, 0);
  assert.equal(hold(ctrl, OPEN, 50, 700).firing, true);
  const held = hold(ctrl, OPEN, 800, 3000); // keep holding open, no reset
  assert.equal(held.firing, false, "no re-fire while held");
});

test("jitter (never stable) never fires", () => {
  const ctrl = createGestureControl({
    dwellMs: 200,
    stableFrames: 4,
    bindings: [ANY],
  });
  let r;
  for (let t = 0; t < 2000; t += 16)
    r = ctrl.update(t % 32 === 0 ? OPEN : POINT, t);
  assert.equal(r.firing, false);
});

test("guards: non-finite now and zero dwell never produce NaN progress", () => {
  const ctrl = createGestureControl({
    dwellMs: 0,
    stableFrames: 2,
    bindings: [ANY],
  });
  assert.ok(ctrl.config.dwellMs > 0, "zero dwell is clamped to positive");
  resetVia(ctrl, null, 0, 3);
  ctrl.update(OPEN, 0);
  const r = ctrl.update(OPEN, Number.NaN);
  assert.equal(Number.isFinite(r.progress), true);
  assert.ok(r.progress >= 0 && r.progress <= 1);
});

test("setConfig swaps dwell live", () => {
  const ctrl = createGestureControl({
    dwellMs: 5000,
    stableFrames: 4,
    bindings: BINDINGS,
  });
  ctrl.setConfig({ dwellMs: 300 });
  resetVia(ctrl, FIST, 0);
  assert.equal(
    hold(ctrl, OPEN, 50, 500).firing,
    true,
    "shorter dwell now fires",
  );
});
