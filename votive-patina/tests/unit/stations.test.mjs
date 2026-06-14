// tests/unit/stations.test.mjs
//
// Unit tests for the performance score (data/stations.json).
// Covers US-002: exactly 5 ordered stations with all required fields, arabic[]
// matching console-prayer.js ARABIC_LINES, valid directions, and a preroll block.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ARABIC_LINES } from "../../lib/console-prayer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stationsPath = path.resolve(__dirname, "../../data/stations.json");
const data = JSON.parse(fs.readFileSync(stationsPath, "utf8"));

const REQUIRED = [
  "index",
  "translit",
  "arabic",
  "english",
  "narration",
  "prompt",
  "direction",
];
const DIRECTIONS = new Set(["right", "left", "up", "down", "heart"]);

test("stations.json: exactly 5 stations", () => {
  assert.ok(Array.isArray(data.stations), "stations is an array");
  assert.equal(data.stations.length, 5);
});

test("stations.json: indices are 1..5 in order", () => {
  data.stations.forEach((s, i) => {
    assert.equal(s.index, i + 1, `station ${i} has index ${i + 1}`);
  });
});

test("stations.json: every station has all required, non-empty fields", () => {
  for (const s of data.stations) {
    for (const key of REQUIRED) {
      assert.ok(key in s, `station ${s.index} missing ${key}`);
      assert.equal(
        typeof s[key === "index" ? "translit" : key],
        "string",
        `station ${s.index} ${key} type`,
      );
    }
    // string fields non-empty
    for (const key of [
      "translit",
      "arabic",
      "english",
      "narration",
      "prompt",
      "direction",
    ]) {
      assert.ok(
        s[key].trim().length > 0,
        `station ${s.index} ${key} is non-empty`,
      );
    }
  }
});

test("stations.json: directions are right/left/up/down/heart, one of each in order", () => {
  const dirs = data.stations.map((s) => s.direction);
  for (const d of dirs) assert.ok(DIRECTIONS.has(d), `valid direction: ${d}`);
  assert.deepEqual(dirs, ["right", "left", "up", "down", "heart"]);
});

test("stations.json: arabic[] equals console-prayer ARABIC_LINES, in order", () => {
  const arabic = data.stations.map((s) => s.arabic);
  assert.deepEqual(arabic, ARABIC_LINES);
});

test("stations.json: first station is FI KHOUDNIKI KHOUZINA", () => {
  assert.equal(data.stations[0].translit, "FI KHOUDNIKI KHOUZINA");
  assert.equal(data.stations[0].arabic, "بحضنك خذينا");
});

test("stations.json: last station is AMIN (the finale)", () => {
  assert.equal(data.stations[4].translit, "AMIN");
  assert.equal(data.stations[4].arabic, "أمين");
  assert.equal(data.stations[4].direction, "heart");
});

test("stations.json: preroll has narration + a scan cue", () => {
  assert.ok(data.preroll, "preroll present");
  assert.ok(
    data.preroll.narration.trim().length > 0,
    "preroll narration non-empty",
  );
  assert.match(data.preroll.cue, /scan/i, "preroll cue mentions scanning");
});
