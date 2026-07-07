import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateConfig,
  mergeConfig,
  normalizeBinding,
  normalizeAction,
  normalizeFingers,
  loadStored,
  saveStored,
} from "../../src/fragmentary/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("the shipped default config is valid and round-trips through validate", () => {
  const raw = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../../data/gestures.json"),
      "utf8",
    ),
  );
  const cfg = validateConfig(raw);
  assert.ok(cfg.dwellMs >= 1000 && cfg.dwellMs <= 2000, "default dwell ~1-2s");
  assert.ok(cfg.bindings.length >= 1);
  assert.equal(cfg.bindings[0].action.type, "next");
  // idempotent
  assert.deepEqual(validateConfig(cfg), cfg);
});

test("validateConfig clamps and fills defaults, never throws", () => {
  assert.deepEqual(validateConfig(null), {
    dwellMs: 1500,
    stableFrames: 4,
    showHud: true,
    bindings: [],
  });
  assert.equal(validateConfig({ dwellMs: 50 }).dwellMs, 300); // clamp low
  assert.equal(validateConfig({ dwellMs: 99999 }).dwellMs, 6000); // clamp high
  assert.equal(validateConfig({ stableFrames: 2.7 }).stableFrames, 3); // round
  assert.equal(validateConfig({ showHud: false }).showHud, false);
});

test("normalizeAction / normalizeFingers coerce junk", () => {
  assert.deepEqual(normalizeAction({ type: "bogus" }), { type: "next" });
  assert.deepEqual(normalizeAction({ type: "goto", index: "3" }), {
    type: "goto",
    index: 3,
  });
  assert.deepEqual(normalizeFingers({ index: "up", ring: "sideways" }), {
    thumb: "any",
    index: "up",
    middle: "any",
    ring: "any",
    pinky: "any",
  });
});

test("normalizeBinding fills id/label/action/fingers", () => {
  const b = normalizeBinding({ fingers: { index: "up" } }, 2);
  assert.equal(b.id, "b2");
  assert.equal(b.action.type, "next");
  assert.equal(b.fingers.index, "up");
  assert.equal(normalizeBinding(null), null);
});

test("mergeConfig layers an override over defaults", () => {
  const defaults = {
    dwellMs: 1500,
    stableFrames: 4,
    bindings: [{ action: { type: "next" }, fingers: {} }],
  };
  const merged = mergeConfig(defaults, { dwellMs: 900 });
  assert.equal(merged.dwellMs, 900);
  assert.equal(
    merged.bindings.length,
    1,
    "keeps default bindings when override omits them",
  );
  const replaced = mergeConfig(defaults, { bindings: [] });
  assert.equal(
    replaced.bindings.length,
    0,
    "override bindings replace defaults",
  );
});

test("storage helpers no-op safely without localStorage (Node)", () => {
  assert.equal(loadStored("nope"), null);
  assert.equal(saveStored({ dwellMs: 1000 }, "nope"), false);
});
