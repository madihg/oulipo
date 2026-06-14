// tests/unit/perf-state.test.mjs
//
// Unit tests for the pure performance-state reducer (lib/perf-state.js).
// Covers US-003: increment, dedupe per device per station, stale-station guard,
// exactly-one-advance at threshold with decay/threads bump, finale, and reset.

import test from "node:test";
import assert from "node:assert/strict";
import {
  createPerfState,
  applyPeace,
  setThreshold,
  reset,
  activeStationIndex,
} from "../../lib/perf-state.js";

// Drive `count` distinct devices through one peace each at the current station.
function passN(state, count, devicePrefix = "d") {
  let s = state;
  for (let i = 0; i < count; i++) {
    s = applyPeace(s, {
      deviceId: `${devicePrefix}${i}`,
      stationIndex: s.stationIndex,
    });
  }
  return s;
}

test("createPerfState: fresh shape, pristine", () => {
  const s = createPerfState({ stationCount: 5, threshold: 3 });
  assert.equal(s.stationCount, 5);
  assert.equal(s.threshold, 3);
  assert.equal(s.peaceCount, 0);
  assert.equal(s.stationIndex, 0);
  assert.equal(s.decayGen, 0);
  assert.equal(s.threadsLit, 0);
  assert.equal(s.passesThisStation, 0);
  assert.equal(s.finale, false);
  assert.deepEqual(s.passedDevices, []);
});

test("createPerfState: defaults to 5 stations, threshold >= 1", () => {
  const s = createPerfState();
  assert.equal(s.stationCount, 5);
  assert.ok(s.threshold >= 1);
});

test("applyPeace: increments peaceCount and passesThisStation", () => {
  const s0 = createPerfState({ threshold: 5 });
  const s1 = applyPeace(s0, { deviceId: "a", stationIndex: 0 });
  assert.equal(s1.peaceCount, 1);
  assert.equal(s1.passesThisStation, 1);
  assert.equal(s1.stationIndex, 0, "below threshold: no advance");
  assert.equal(s1.decayGen, 0);
});

test("applyPeace is pure: does not mutate the input state", () => {
  const s0 = createPerfState({ threshold: 5 });
  const snapshot = JSON.stringify(s0);
  applyPeace(s0, { deviceId: "a", stationIndex: 0 });
  assert.equal(JSON.stringify(s0), snapshot, "input must be unchanged");
});

test("applyPeace: dedupe per device per station (same device twice = one peace)", () => {
  let s = createPerfState({ threshold: 5 });
  s = applyPeace(s, { deviceId: "a", stationIndex: 0 });
  s = applyPeace(s, { deviceId: "a", stationIndex: 0 }); // duplicate
  assert.equal(s.peaceCount, 1);
  assert.equal(s.passesThisStation, 1);
});

test("applyPeace: a different device at the same station counts", () => {
  let s = createPerfState({ threshold: 5 });
  s = applyPeace(s, { deviceId: "a", stationIndex: 0 });
  s = applyPeace(s, { deviceId: "b", stationIndex: 0 });
  assert.equal(s.peaceCount, 2);
  assert.equal(s.passesThisStation, 2);
});

test("applyPeace: a peace tagged for the wrong station is ignored (stale)", () => {
  let s = createPerfState({ threshold: 5 });
  s = applyPeace(s, { deviceId: "a", stationIndex: 3 }); // we are on station 0
  assert.equal(s.peaceCount, 0);
  assert.equal(s.passesThisStation, 0);
});

test("applyPeace: missing deviceId is ignored", () => {
  const s0 = createPerfState({ threshold: 5 });
  const s1 = applyPeace(s0, { stationIndex: 0 });
  assert.equal(s1.peaceCount, 0);
});

test("threshold crossing advances exactly one station and bumps decay + threads", () => {
  const threshold = 3;
  let s = createPerfState({ stationCount: 5, threshold });
  s = passN(s, threshold); // exactly the threshold
  assert.equal(s.stationIndex, 1, "advanced exactly one station");
  assert.equal(s.decayGen, 1, "one generation of decay");
  assert.equal(s.threadsLit, 1, "one thread lit");
  assert.equal(s.passesThisStation, 0, "passes reset for the new station");
  assert.deepEqual(s.passedDevices, [], "device set cleared on advance");
  assert.equal(
    s.peaceCount,
    threshold,
    "peaceCount is cumulative across the show",
  );
});

test("after an advance, the same device may pass again for the NEW station", () => {
  const threshold = 2;
  let s = createPerfState({ stationCount: 5, threshold });
  // device d0 + d1 cross station 0
  s = applyPeace(s, { deviceId: "d0", stationIndex: 0 });
  s = applyPeace(s, { deviceId: "d1", stationIndex: 0 });
  assert.equal(s.stationIndex, 1);
  // d0 passes again, now for station 1 - allowed
  s = applyPeace(s, { deviceId: "d0", stationIndex: 1 });
  assert.equal(s.peaceCount, 3);
  assert.equal(s.passesThisStation, 1);
});

test("walking all 5 stations: decayGen 0..5, finale set at the last", () => {
  const threshold = 4;
  let s = createPerfState({ stationCount: 5, threshold });
  const seenDecay = [s.decayGen];
  for (let station = 0; station < 5; station++) {
    assert.equal(s.finale, false, `not finale before station ${station + 1}`);
    s = passN(s, threshold, `s${station}_`);
    seenDecay.push(s.decayGen);
  }
  assert.deepEqual(
    seenDecay,
    [0, 1, 2, 3, 4, 5],
    "decay steps once per station",
  );
  assert.equal(s.stationIndex, 5);
  assert.equal(s.threadsLit, 5, "all threads lit at finale");
  assert.equal(s.finale, true, "finale set at the last station");
  assert.equal(activeStationIndex(s), null, "no active station at finale");
});

test("peaces past the finale are no-ops", () => {
  const threshold = 1;
  let s = createPerfState({ stationCount: 5, threshold });
  s = passN(s, 5, "f"); // 1 each advances 5 stations -> finale
  assert.equal(s.finale, true);
  const before = JSON.stringify(s);
  s = applyPeace(s, { deviceId: "z", stationIndex: 5 });
  assert.equal(JSON.stringify(s), before, "no change after finale");
});

test("activeStationIndex tracks the station being prayed", () => {
  let s = createPerfState({ stationCount: 5, threshold: 1 });
  assert.equal(activeStationIndex(s), 0);
  s = applyPeace(s, { deviceId: "a", stationIndex: 0 });
  assert.equal(activeStationIndex(s), 1);
});

test("setThreshold updates the threshold and clamps to >= 1", () => {
  let s = createPerfState({ threshold: 3 });
  s = setThreshold(s, 7);
  assert.equal(s.threshold, 7);
  s = setThreshold(s, 0);
  assert.equal(s.threshold, 1, "0 clamps to 1");
  s = setThreshold(s, -5);
  assert.equal(s.threshold, 1, "negatives clamp to 1");
});

test("setThreshold change takes effect for the next evaluation, not retroactively", () => {
  let s = createPerfState({ stationCount: 5, threshold: 5 });
  s = passN(s, 3); // 3 of 5
  assert.equal(s.stationIndex, 0);
  s = setThreshold(s, 3); // lower it; we already have 3 passes this station
  // The next peace re-evaluates against the new threshold (passes 3 -> 4 >= 3)
  // but a no-op peace should not advance. A genuinely new device pushes it over.
  s = applyPeace(s, { deviceId: "extra", stationIndex: 0 });
  assert.equal(
    s.stationIndex,
    1,
    "crosses the lowered threshold on the next peace",
  );
});

test("reset zeroes everything but keeps stationCount and threshold", () => {
  let s = createPerfState({ stationCount: 5, threshold: 4 });
  s = passN(s, 4, "x"); // advance once + accumulate
  s = applyPeace(s, { deviceId: "y", stationIndex: s.stationIndex });
  const r = reset(s);
  assert.equal(r.stationCount, 5);
  assert.equal(r.threshold, 4);
  assert.equal(r.peaceCount, 0);
  assert.equal(r.stationIndex, 0);
  assert.equal(r.decayGen, 0);
  assert.equal(r.threadsLit, 0);
  assert.equal(r.passesThisStation, 0);
  assert.equal(r.finale, false);
  assert.deepEqual(r.passedDevices, []);
});
