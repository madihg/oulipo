import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lerpColor,
  normalizeHex,
  hexToRgb,
  rgbToHex,
} from "../../src/color.js";

test("hex round-trips", () => {
  assert.equal(rgbToHex(...hexToRgb("#2138de")), "#2138de");
  assert.equal(normalizeHex("#FFF"), "#ffffff");
  assert.equal(normalizeHex("#000000"), "#000000");
});

test("lerp endpoints are exact", () => {
  assert.equal(lerpColor("#2138de", "#e8381f", 0), "#2138de");
  assert.equal(lerpColor("#2138de", "#e8381f", 1), "#e8381f");
});

test("midpoint is a valid 6-digit hex", () => {
  const mid = lerpColor("#2138de", "#e8381f", 0.5);
  assert.match(mid, /^#[0-9a-f]{6}$/);
});

test("blue->red midpoint stays vivid (not grey mud)", () => {
  // Through OKLab, blue->red passes through a saturated purple/magenta: both the
  // red and blue channels should be substantial, and not all three near-equal.
  const [r, g, b] = hexToRgb(lerpColor("#2138de", "#e8381f", 0.5));
  assert.ok(r > 90, `expected lively red channel, got ${r}`);
  assert.ok(b > 70, `expected lively blue channel, got ${b}`);
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  assert.ok(maxC - minC > 60, "midpoint should be chromatic, not grey");
});

test("black->white midpoint is a mid grey", () => {
  const [r, g, b] = hexToRgb(lerpColor("#000000", "#ffffff", 0.5));
  assert.ok(Math.abs(r - g) < 3 && Math.abs(g - b) < 3, "grey: channels equal");
  // OKLab L is perceptual: the black/white midpoint sits below sRGB 128 (~99).
  assert.ok(r > 80 && r < 170, `mid grey, got ${r}`);
});
