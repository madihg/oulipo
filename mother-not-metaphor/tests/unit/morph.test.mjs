import { test } from "node:test";
import assert from "node:assert/strict";
import {
  easeInOutCubic,
  ghostOf,
  padPair,
  lerpCell,
  interpolateFrame,
} from "../../src/morph.js";

const A = [{ x: 10, y: 10, w: 20, h: 20, fill: "#2138de", o: 1 }];
const B = [
  { x: 50, y: 50, w: 10, h: 10, fill: "#e8381f", o: 1 },
  { x: 70, y: 70, w: 8, h: 8, fill: "#1e854a", o: 1 },
];

test("easeInOutCubic anchors", () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
  assert.ok(easeInOutCubic(0.25) < 0.25, "ease-in accelerates from rest");
});

test("ghost collapses to a point at the target center, transparent", () => {
  const g = ghostOf(B[1]);
  assert.equal(g.w, 0);
  assert.equal(g.h, 0);
  assert.equal(g.o, 0);
  assert.equal(g.x, 74); // 70 + 8/2
  assert.equal(g.y, 74);
  assert.equal(g.fill, "#1e854a");
});

test("padPair lengthens the shorter frame with ghosts", () => {
  const [a, b] = padPair(A, B);
  assert.equal(a.length, 2);
  assert.equal(b.length, 2);
  assert.equal(a[1].o, 0, "the born cell starts transparent");
});

test("lerpCell interpolates geometry linearly", () => {
  const c = lerpCell(A[0], B[0], 0.5);
  assert.equal(c.x, 30);
  assert.equal(c.y, 30);
  assert.equal(c.w, 15);
  assert.equal(c.h, 15);
});

test("interpolateFrame endpoints reproduce inputs (padded)", () => {
  const at0 = interpolateFrame(A, B, 0);
  assert.equal(at0[0].x, 10);
  assert.equal(at0[0].w, 20);
  // the padded ghost sits at B[1]'s center with zero size
  assert.equal(at0[1].w, 0);
  assert.equal(at0[1].o, 0);

  const at1 = interpolateFrame(A, B, 1);
  assert.equal(at1[0].x, 50);
  assert.equal(at1[1].x, 70);
  assert.equal(at1[1].w, 8);
  assert.equal(at1[1].o, 1);
});

test("interpolateFrame midpoint grows the born cell partway", () => {
  const mid = interpolateFrame(A, B, 0.5);
  assert.ok(mid[1].w > 0 && mid[1].w < 8, "born cell is mid-growth");
  assert.ok(mid[1].o > 0 && mid[1].o < 1, "born cell is fading in");
});
