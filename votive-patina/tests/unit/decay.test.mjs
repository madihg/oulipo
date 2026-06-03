/**
 * tests/unit/decay.test.mjs - votivepatina
 *
 * Unit tests for the pure functions in lib/decay.js.
 * Runs via Node's built-in test runner:
 *
 *   node --test tests/unit/decay.test.mjs
 *
 * No DOM, no canvas, no browser. Only the math is exercised here.
 * Canvas/render behaviour is covered by the Playwright e2e suite.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  qualityForStep,
  passesForStep,
  createDecayEngine,
} from "../../lib/decay.js";

// ---------------------------------------------------------------------------
// qualityForStep
// ---------------------------------------------------------------------------

test("qualityForStep: every value is within [0.12, 0.95]", () => {
  // Check steps 0 through 10 - well beyond the nominal maxStep of 5
  for (let step = 0; step <= 10; step++) {
    const q = qualityForStep(step);
    assert(
      q >= 0.12 && q <= 0.95,
      `qualityForStep(${step}) = ${q} is outside [0.12, 0.95]`,
    );
  }
});

test("qualityForStep: monotonic decreasing across steps 0..6", () => {
  // Each step must produce a quality strictly less than or equal to the previous.
  // We allow equality only at the floor clamp (0.12), but in practice the curve
  // doesn't hit the floor until well beyond step 6.
  for (let step = 1; step <= 6; step++) {
    const prev = qualityForStep(step - 1);
    const curr = qualityForStep(step);
    assert(
      curr <= prev,
      `qualityForStep is not monotonic at step ${step}: ` +
        `qualityForStep(${step - 1})=${prev.toFixed(4)} < qualityForStep(${step})=${curr.toFixed(4)}`,
    );
  }
});

test("qualityForStep(0) is high (>= 0.85) - nearly pristine icon", () => {
  const q = qualityForStep(0);
  assert(q >= 0.85, `qualityForStep(0) = ${q.toFixed(4)}, expected >= 0.85`);
});

test("qualityForStep(5) is low (<= 0.2) - heavily artefacted relic", () => {
  const q = qualityForStep(5);
  assert(q <= 0.2, `qualityForStep(5) = ${q.toFixed(4)}, expected <= 0.2`);
});

test("qualityForStep: steps beyond 5 continue falling but stay >= 0.12", () => {
  // The curve must keep falling (or at least not rise) past step 5,
  // and never go below the floor.
  const q5 = qualityForStep(5);
  for (let step = 6; step <= 12; step++) {
    const q = qualityForStep(step);
    assert(
      q <= q5 || Math.abs(q - 0.12) < 1e-9,
      `qualityForStep(${step}) = ${q.toFixed(4)} is above qualityForStep(5) = ${q5.toFixed(4)} ` +
        `and not at the floor`,
    );
    assert(
      q >= 0.12,
      `qualityForStep(${step}) = ${q.toFixed(4)} is below the floor 0.12`,
    );
  }
});

// ---------------------------------------------------------------------------
// passesForStep
// ---------------------------------------------------------------------------

test("passesForStep(0) === 1 - one pass at step zero", () => {
  assert.equal(passesForStep(0), 1);
});

test("passesForStep(1) === 1", () => {
  assert.equal(passesForStep(1), 1);
});

test("passesForStep(2) === 2", () => {
  assert.equal(passesForStep(2), 2);
});

test("passesForStep(3) === 2", () => {
  assert.equal(passesForStep(3), 2);
});

test("passesForStep(4) === 3", () => {
  assert.equal(passesForStep(4), 3);
});

test("passesForStep(5) === 3", () => {
  assert.equal(passesForStep(5), 3);
});

test("passesForStep always returns an integer >= 1", () => {
  for (let step = 0; step <= 10; step++) {
    const p = passesForStep(step);
    assert(
      Number.isInteger(p),
      `passesForStep(${step}) is not an integer: ${p}`,
    );
    assert(p >= 1, `passesForStep(${step}) = ${p} is less than 1`);
  }
});

// ---------------------------------------------------------------------------
// createDecayEngine
// ---------------------------------------------------------------------------

test("createDecayEngine is exported and is a function", () => {
  assert.equal(typeof createDecayEngine, "function");
});
